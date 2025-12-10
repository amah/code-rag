import Parser from "web-tree-sitter";
import { resolve, dirname } from "path";
import type { Language, ParsedSymbol } from "../../models/types.js";
import type { Parser as IParser } from "./base-parser.js";

let parserInstance: Parser | null = null;
let javaLanguage: Parser.Language | null = null;

/**
 * Initializes web-tree-sitter for Java
 */
async function initParser(): Promise<Parser> {
  if (parserInstance && javaLanguage) return parserInstance;

  await Parser.init();
  parserInstance = new Parser();

  // Load Java grammar
  const wasmPath = resolve(
    dirname(import.meta.path),
    "../../../node_modules/web-tree-sitter-languages/tree-sitter-java.wasm"
  );

  try {
    javaLanguage = await Parser.Language.load(wasmPath);
  } catch {
    // Fallback: try loading from different location
    const altPath = resolve(process.cwd(), "node_modules/tree-sitter-java/tree-sitter-java.wasm");
    javaLanguage = await Parser.Language.load(altPath);
  }

  return parserInstance;
}

/**
 * Java parser using tree-sitter
 */
export class JavaParser implements IParser {
  readonly language: Language = "java";

  async parse(content: string, filePath: string): Promise<ParsedSymbol[]> {
    const parser = await initParser();
    parser.setLanguage(javaLanguage);

    const tree = parser.parse(content);
    const symbols: ParsedSymbol[] = [];

    // Extract package name
    const packageName = this.extractPackage(tree.rootNode);

    // Extract imports
    const imports = this.extractImports(tree.rootNode);

    // Walk the AST
    this.walkNode(tree.rootNode, content, symbols, null, packageName, imports);

    return symbols;
  }

  private extractPackage(rootNode: Parser.SyntaxNode): string | undefined {
    for (const child of rootNode.children) {
      if (child.type === "package_declaration") {
        const scopedId = this.getChildByType(child, "scoped_identifier");
        if (scopedId) return scopedId.text;
        const id = this.getChildByType(child, "identifier");
        if (id) return id.text;
      }
    }
    return undefined;
  }

  private extractImports(rootNode: Parser.SyntaxNode): string[] {
    const imports: string[] = [];
    for (const child of rootNode.children) {
      if (child.type === "import_declaration") {
        const scopedId = this.getChildByType(child, "scoped_identifier");
        if (scopedId) imports.push(scopedId.text);
      }
    }
    return imports;
  }

  private walkNode(
    node: Parser.SyntaxNode,
    content: string,
    symbols: ParsedSymbol[],
    parentClass: string | null,
    packageName: string | undefined,
    imports: string[]
  ): void {
    switch (node.type) {
      case "class_declaration":
        this.handleClass(node, content, symbols, packageName, imports);
        break;

      case "interface_declaration":
        this.handleInterface(node, content, symbols, packageName);
        break;

      case "enum_declaration":
        this.handleEnum(node, content, symbols, packageName);
        break;

      case "method_declaration":
        this.handleMethod(node, content, symbols, parentClass, packageName);
        break;

      case "constructor_declaration":
        this.handleConstructor(node, content, symbols, parentClass, packageName);
        break;
    }

    // Recurse for classes to get methods
    if (
      node.type === "class_declaration" ||
      node.type === "interface_declaration" ||
      node.type === "enum_declaration"
    ) {
      const className = this.getChildByType(node, "identifier")?.text;
      const classBody =
        this.getChildByType(node, "class_body") ||
        this.getChildByType(node, "interface_body") ||
        this.getChildByType(node, "enum_body");

      if (classBody && className) {
        for (const child of classBody.children) {
          this.walkNode(child, content, symbols, className, packageName, imports);
        }
      }
    } else {
      // Continue walking for other nodes
      for (const child of node.children) {
        this.walkNode(child, content, symbols, parentClass, packageName, imports);
      }
    }
  }

  private handleClass(
    node: Parser.SyntaxNode,
    content: string,
    symbols: ParsedSymbol[],
    packageName: string | undefined,
    imports: string[]
  ): void {
    const nameNode = this.getChildByType(node, "identifier");
    const name = nameNode?.text;

    const docComment = this.getPrecedingComment(node, content);
    const signature = this.getClassSignature(node);

    symbols.push({
      type: "class",
      name,
      signature,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      text: node.text,
      docComment,
      package: packageName,
      imports,
    });
  }

  private handleInterface(
    node: Parser.SyntaxNode,
    content: string,
    symbols: ParsedSymbol[],
    packageName: string | undefined
  ): void {
    const nameNode = this.getChildByType(node, "identifier");
    const name = nameNode?.text;

    const docComment = this.getPrecedingComment(node, content);
    const signature = this.getInterfaceSignature(node);

    symbols.push({
      type: "interface",
      name,
      signature,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      text: node.text,
      docComment,
      package: packageName,
    });
  }

  private handleEnum(
    node: Parser.SyntaxNode,
    content: string,
    symbols: ParsedSymbol[],
    packageName: string | undefined
  ): void {
    const nameNode = this.getChildByType(node, "identifier");
    const name = nameNode?.text;

    const docComment = this.getPrecedingComment(node, content);

    symbols.push({
      type: "enum",
      name,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      text: node.text,
      docComment,
      package: packageName,
    });
  }

  private handleMethod(
    node: Parser.SyntaxNode,
    content: string,
    symbols: ParsedSymbol[],
    parentClass: string | null,
    packageName: string | undefined
  ): void {
    const nameNode = this.getChildByType(node, "identifier");
    const name = nameNode?.text;

    const docComment = this.getPrecedingComment(node, content);
    const signature = this.getMethodSignature(node, parentClass);
    const calls = this.extractMethodCalls(node);

    symbols.push({
      type: "method",
      name,
      signature,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      text: node.text,
      docComment,
      parent: parentClass ?? undefined,
      package: packageName,
      calls,
    });
  }

  private handleConstructor(
    node: Parser.SyntaxNode,
    content: string,
    symbols: ParsedSymbol[],
    parentClass: string | null,
    packageName: string | undefined
  ): void {
    const nameNode = this.getChildByType(node, "identifier");
    const name = nameNode?.text;

    const docComment = this.getPrecedingComment(node, content);
    const signature = this.getConstructorSignature(node);

    symbols.push({
      type: "method",
      name: `${name} (constructor)`,
      signature,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      text: node.text,
      docComment,
      parent: parentClass ?? undefined,
      package: packageName,
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

  private getPrecedingComment(
    node: Parser.SyntaxNode,
    content: string
  ): string | undefined {
    const prev = node.previousSibling;
    if (prev && (prev.type === "block_comment" || prev.type === "line_comment")) {
      return prev.text;
    }
    return undefined;
  }

  private getClassSignature(node: Parser.SyntaxNode): string {
    const parts: string[] = [];

    for (const child of node.children) {
      if (child.type === "class_body") break;
      parts.push(child.text);
    }

    return parts.join(" ").trim();
  }

  private getInterfaceSignature(node: Parser.SyntaxNode): string {
    const parts: string[] = [];

    for (const child of node.children) {
      if (child.type === "interface_body") break;
      parts.push(child.text);
    }

    return parts.join(" ").trim();
  }

  private getMethodSignature(
    node: Parser.SyntaxNode,
    parentClass: string | null
  ): string {
    const parts: string[] = [];

    for (const child of node.children) {
      if (child.type === "block") break;
      parts.push(child.text);
    }

    const methodSig = parts.join(" ").trim();
    return parentClass ? `${parentClass}.${methodSig}` : methodSig;
  }

  private getConstructorSignature(node: Parser.SyntaxNode): string {
    const parts: string[] = [];

    for (const child of node.children) {
      if (child.type === "constructor_body") break;
      parts.push(child.text);
    }

    return parts.join(" ").trim();
  }

  private extractMethodCalls(node: Parser.SyntaxNode): string[] {
    const calls: string[] = [];

    const walkForCalls = (n: Parser.SyntaxNode) => {
      if (n.type === "method_invocation") {
        const nameNode = this.getChildByType(n, "identifier");
        if (nameNode) {
          calls.push(nameNode.text);
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
