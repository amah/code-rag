import Parser from "web-tree-sitter";
import { resolve, dirname } from "path";
import type { Language, ParsedSymbol } from "../../models/types.js";
import type { Parser as IParser } from "./base-parser.js";

let parserInstance: Parser | null = null;
let pythonLanguage: Parser.Language | null = null;

/**
 * Initializes web-tree-sitter for Python
 */
async function initParser(): Promise<Parser> {
  if (parserInstance && pythonLanguage) return parserInstance;

  await Parser.init();
  parserInstance = new Parser();

  // Load Python grammar
  const wasmPath = resolve(
    dirname(import.meta.path),
    "../../../node_modules/web-tree-sitter-languages/tree-sitter-python.wasm"
  );

  try {
    pythonLanguage = await Parser.Language.load(wasmPath);
  } catch {
    // Fallback: try loading from different location
    const altPath = resolve(process.cwd(), "node_modules/tree-sitter-python/tree-sitter-python.wasm");
    pythonLanguage = await Parser.Language.load(altPath);
  }

  return parserInstance;
}

/**
 * Python parser using tree-sitter
 */
export class PythonParser implements IParser {
  readonly language: Language = "python";

  async parse(content: string, filePath: string): Promise<ParsedSymbol[]> {
    const parser = await initParser();
    parser.setLanguage(pythonLanguage);

    const tree = parser.parse(content);
    const symbols: ParsedSymbol[] = [];

    // Extract imports
    const imports = this.extractImports(tree.rootNode);

    // Walk the AST
    this.walkNode(tree.rootNode, content, symbols, null, imports);

    return symbols;
  }

  private extractImports(rootNode: Parser.SyntaxNode): string[] {
    const imports: string[] = [];

    const walkForImports = (node: Parser.SyntaxNode) => {
      if (node.type === "import_statement") {
        // import foo, bar
        for (const child of node.children) {
          if (child.type === "dotted_name") {
            imports.push(child.text);
          }
        }
      } else if (node.type === "import_from_statement") {
        // from foo import bar
        const moduleNode = this.getChildByType(node, "dotted_name");
        if (moduleNode) {
          imports.push(moduleNode.text);
        }
      }

      for (const child of node.children) {
        walkForImports(child);
      }
    };

    walkForImports(rootNode);
    return imports;
  }

  private walkNode(
    node: Parser.SyntaxNode,
    content: string,
    symbols: ParsedSymbol[],
    parentClass: string | null,
    imports: string[]
  ): void {
    switch (node.type) {
      case "class_definition":
        this.handleClass(node, content, symbols, imports);
        break;

      case "function_definition":
        if (parentClass) {
          this.handleMethod(node, content, symbols, parentClass);
        } else {
          this.handleFunction(node, content, symbols, imports);
        }
        break;
    }

    // Recurse for classes to get methods
    if (node.type === "class_definition") {
      const className = this.getChildByType(node, "identifier")?.text;
      const classBody = this.getChildByType(node, "block");

      if (classBody && className) {
        for (const child of classBody.children) {
          this.walkNode(child, content, symbols, className, imports);
        }
      }
    } else if (node.type !== "function_definition") {
      // Continue walking for other nodes (not function bodies)
      for (const child of node.children) {
        this.walkNode(child, content, symbols, parentClass, imports);
      }
    }
  }

  private handleClass(
    node: Parser.SyntaxNode,
    content: string,
    symbols: ParsedSymbol[],
    imports: string[]
  ): void {
    const nameNode = this.getChildByType(node, "identifier");
    const name = nameNode?.text;

    const docComment = this.getDocstring(node);
    const signature = this.getClassSignature(node);

    symbols.push({
      type: "class",
      name,
      signature,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      text: node.text,
      docComment,
      imports,
    });
  }

  private handleFunction(
    node: Parser.SyntaxNode,
    content: string,
    symbols: ParsedSymbol[],
    imports: string[]
  ): void {
    const nameNode = this.getChildByType(node, "identifier");
    const name = nameNode?.text;

    // Skip private functions (starting with _) unless they're __init__ etc.
    if (name?.startsWith("_") && !name.startsWith("__")) {
      return;
    }

    const docComment = this.getDocstring(node);
    const signature = this.getFunctionSignature(node);
    const calls = this.extractFunctionCalls(node);

    symbols.push({
      type: "function",
      name,
      signature,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      text: node.text,
      docComment,
      imports,
      calls,
    });
  }

  private handleMethod(
    node: Parser.SyntaxNode,
    content: string,
    symbols: ParsedSymbol[],
    parentClass: string
  ): void {
    const nameNode = this.getChildByType(node, "identifier");
    const name = nameNode?.text;

    // Skip private methods (starting with _) unless they're __init__ etc.
    if (name?.startsWith("_") && !name.startsWith("__")) {
      return;
    }

    const docComment = this.getDocstring(node);
    const signature = this.getMethodSignature(node, parentClass);
    const calls = this.extractFunctionCalls(node);

    symbols.push({
      type: "method",
      name,
      signature,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      text: node.text,
      docComment,
      parent: parentClass,
      calls,
    });
  }

  private getChildByType(
    node: Parser.SyntaxNode,
    type: string
  ): Parser.SyntaxNode | null {
    for (const child of node.children) {
      if (child.type === type) return child;
    }
    return null;
  }

  private getDocstring(node: Parser.SyntaxNode): string | undefined {
    const block = this.getChildByType(node, "block");
    if (!block) return undefined;

    // First statement in block might be a docstring
    for (const child of block.children) {
      if (child.type === "expression_statement") {
        const strNode = this.getChildByType(child, "string");
        if (strNode) {
          return strNode.text;
        }
        break;
      }
      // Skip newlines and comments
      if (child.type !== "comment" && !child.type.includes("newline")) {
        break;
      }
    }

    return undefined;
  }

  private getClassSignature(node: Parser.SyntaxNode): string {
    const parts: string[] = ["class"];

    const nameNode = this.getChildByType(node, "identifier");
    if (nameNode) parts.push(nameNode.text);

    const argList = this.getChildByType(node, "argument_list");
    if (argList) parts.push(argList.text);

    return parts.join(" ") + ":";
  }

  private getFunctionSignature(node: Parser.SyntaxNode): string {
    const parts: string[] = [];

    // Check for decorators
    let current = node.previousSibling;
    while (current && current.type === "decorator") {
      parts.unshift(current.text);
      current = current.previousSibling;
    }

    parts.push("def");

    const nameNode = this.getChildByType(node, "identifier");
    if (nameNode) parts.push(nameNode.text);

    const params = this.getChildByType(node, "parameters");
    if (params) parts.push(params.text);

    const returnType = this.getChildByType(node, "type");
    if (returnType) parts.push("->", returnType.text);

    return parts.join(" ") + ":";
  }

  private getMethodSignature(
    node: Parser.SyntaxNode,
    parentClass: string
  ): string {
    const funcSig = this.getFunctionSignature(node);
    return `${parentClass}.${funcSig}`;
  }

  private extractFunctionCalls(node: Parser.SyntaxNode): string[] {
    const calls: string[] = [];

    const walkForCalls = (n: Parser.SyntaxNode) => {
      if (n.type === "call") {
        const funcNode = n.children[0];
        if (funcNode) {
          // Handle attribute access (obj.method)
          if (funcNode.type === "attribute") {
            const attrNode = this.getChildByType(funcNode, "identifier");
            if (attrNode) calls.push(attrNode.text);
          } else if (funcNode.type === "identifier") {
            calls.push(funcNode.text);
          }
        }
      }
      for (const child of n.children) {
        walkForCalls(child);
      }
    };

    walkForCalls(node);
    return [...new Set(calls)]; // Unique calls
  }
}
