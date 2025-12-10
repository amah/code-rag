import Parser from "web-tree-sitter";
import { resolve } from "path";
import type { Language, ParsedSymbol, SymbolType } from "../../models/types.js";
import type { Parser as IParser } from "./base-parser.js";

let parserInstance: Parser | null = null;
let typescriptLanguage: Parser.Language | null = null;
let tsxLanguage: Parser.Language | null = null;

/**
 * Initializes web-tree-sitter for TypeScript
 */
async function initParser(): Promise<Parser> {
  if (parserInstance) return parserInstance;

  await Parser.init();
  parserInstance = new Parser();

  // Load TypeScript grammar from tree-sitter-wasms package
  const wasmPath = resolve(
    process.cwd(),
    "node_modules/tree-sitter-wasms/out/tree-sitter-typescript.wasm"
  );

  typescriptLanguage = await Parser.Language.load(wasmPath);

  // Also load TSX grammar for React files
  const tsxWasmPath = resolve(
    process.cwd(),
    "node_modules/tree-sitter-wasms/out/tree-sitter-tsx.wasm"
  );
  tsxLanguage = await Parser.Language.load(tsxWasmPath);

  return parserInstance;
}

/**
 * TypeScript/JavaScript parser using tree-sitter
 */
export class TypeScriptParser implements IParser {
  readonly language: Language = "typescript";

  async parse(content: string, filePath: string): Promise<ParsedSymbol[]> {
    const parser = await initParser();
    parser.setLanguage(typescriptLanguage);

    const tree = parser.parse(content);
    const symbols: ParsedSymbol[] = [];

    // Walk the AST
    this.walkNode(tree.rootNode, content, symbols, null);

    return symbols;
  }

  private walkNode(
    node: Parser.SyntaxNode,
    content: string,
    symbols: ParsedSymbol[],
    parentClass: string | null
  ): void {
    switch (node.type) {
      case "class_declaration":
        this.handleClass(node, content, symbols);
        break;

      case "interface_declaration":
        this.handleInterface(node, content, symbols);
        break;

      case "enum_declaration":
        this.handleEnum(node, content, symbols);
        break;

      case "function_declaration":
        this.handleFunction(node, content, symbols);
        break;

      case "method_definition":
        this.handleMethod(node, content, symbols, parentClass);
        break;

      case "lexical_declaration":
      case "variable_declaration":
        this.handleVariableDeclaration(node, content, symbols);
        break;

      case "export_statement":
        // Process the exported declaration
        for (const child of node.children) {
          this.walkNode(child, content, symbols, parentClass);
        }
        return;
    }

    // Recurse for classes to get methods
    if (node.type === "class_declaration" || node.type === "class") {
      const className = this.getChildByType(node, "type_identifier")?.text ||
                       this.getChildByType(node, "identifier")?.text;
      const classBody = this.getChildByType(node, "class_body");
      if (classBody && className) {
        for (const child of classBody.children) {
          this.walkNode(child, content, symbols, className);
        }
      }
    } else {
      // Continue walking for other nodes
      for (const child of node.children) {
        this.walkNode(child, content, symbols, parentClass);
      }
    }
  }

  private handleClass(
    node: Parser.SyntaxNode,
    content: string,
    symbols: ParsedSymbol[]
  ): void {
    const nameNode = this.getChildByType(node, "type_identifier") ||
                     this.getChildByType(node, "identifier");
    const name = nameNode?.text;

    const docComment = this.getPrecedingComment(node, content);
    const signature = this.getSignature(node, content);

    symbols.push({
      type: "class",
      name,
      signature,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      text: node.text,
      docComment,
    });
  }

  private handleInterface(
    node: Parser.SyntaxNode,
    content: string,
    symbols: ParsedSymbol[]
  ): void {
    const nameNode = this.getChildByType(node, "type_identifier") ||
                     this.getChildByType(node, "identifier");
    const name = nameNode?.text;

    const docComment = this.getPrecedingComment(node, content);

    symbols.push({
      type: "interface",
      name,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      text: node.text,
      docComment,
    });
  }

  private handleEnum(
    node: Parser.SyntaxNode,
    content: string,
    symbols: ParsedSymbol[]
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
    });
  }

  private handleFunction(
    node: Parser.SyntaxNode,
    content: string,
    symbols: ParsedSymbol[]
  ): void {
    const nameNode = this.getChildByType(node, "identifier");
    const name = nameNode?.text;

    const docComment = this.getPrecedingComment(node, content);
    const signature = this.getFunctionSignature(node);

    symbols.push({
      type: "function",
      name,
      signature,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      text: node.text,
      docComment,
    });
  }

  private handleMethod(
    node: Parser.SyntaxNode,
    content: string,
    symbols: ParsedSymbol[],
    parentClass: string | null
  ): void {
    const nameNode = this.getChildByType(node, "property_identifier");
    const name = nameNode?.text;

    const docComment = this.getPrecedingComment(node, content);
    const signature = this.getMethodSignature(node, parentClass);

    symbols.push({
      type: "method",
      name,
      signature,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      text: node.text,
      docComment,
      parent: parentClass ?? undefined,
    });
  }

  private handleVariableDeclaration(
    node: Parser.SyntaxNode,
    content: string,
    symbols: ParsedSymbol[]
  ): void {
    // Look for arrow functions assigned to variables
    for (const child of node.children) {
      if (child.type === "variable_declarator") {
        const nameNode = this.getChildByType(child, "identifier");
        const valueNode = this.getChildByType(child, "arrow_function");

        if (nameNode && valueNode) {
          const docComment = this.getPrecedingComment(node, content);

          symbols.push({
            type: "function",
            name: nameNode.text,
            startLine: node.startPosition.row + 1,
            endLine: node.endPosition.row + 1,
            text: node.text,
            docComment,
          });
        }
      }
    }
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
    if (prev && prev.type === "comment") {
      return prev.text;
    }
    return undefined;
  }

  private getSignature(node: Parser.SyntaxNode, content: string): string {
    // Get the first line up to the opening brace
    const text = node.text;
    const braceIndex = text.indexOf("{");
    if (braceIndex > 0) {
      return text.slice(0, braceIndex).trim();
    }
    return text.split("\n")[0];
  }

  private getFunctionSignature(node: Parser.SyntaxNode): string {
    const parts: string[] = [];

    for (const child of node.children) {
      if (child.type === "statement_block") break;
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
      if (child.type === "statement_block") break;
      parts.push(child.text);
    }

    const methodSig = parts.join(" ").trim();
    return parentClass ? `${parentClass}.${methodSig}` : methodSig;
  }
}
