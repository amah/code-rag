import { readFileSync } from "fs";
import type { Language, ParsedSymbol, FileInfo, Repository } from "../models/types.js";
import type { ChunkingConfig } from "../config/schema.js";
import { createCodeChunk, type CodeChunkWithoutEmbedding } from "../models/code-chunk.js";
import {
  type Parser,
  TypeScriptParser,
  JavaParser,
  PythonParser,
  ConfigParser,
  YamlParser,
  JsonParser,
  SqlParser,
} from "./parsers/index.js";
import { supportsAstParsing } from "./language-detector.js";

/**
 * Chunker orchestrates parsing files and creating code chunks
 */
export class Chunker {
  private parsers: Map<Language, Parser>;
  private maxTokens: number;
  private overlap: number;

  constructor(config: ChunkingConfig) {
    this.maxTokens = config.maxTokens;
    this.overlap = config.overlap;

    // Initialize parsers
    this.parsers = new Map([
      ["typescript", new TypeScriptParser()],
      ["javascript", new TypeScriptParser()], // TS parser handles JS too
      ["java", new JavaParser()],
      ["python", new PythonParser()],
      ["yaml", new YamlParser()],
      ["json", new JsonParser()],
      ["config", new ConfigParser()],
      ["sql", new SqlParser()],
    ]);
  }

  /**
   * Chunks a file into code chunks
   */
  async chunkFile(
    fileInfo: FileInfo,
    repo: Repository
  ): Promise<CodeChunkWithoutEmbedding[]> {
    const content = readFileSync(fileInfo.absolutePath, "utf-8");

    // Skip empty files
    if (content.trim().length === 0) {
      return [];
    }

    const parser = this.parsers.get(fileInfo.language);

    let symbols: ParsedSymbol[];

    if (parser && supportsAstParsing(fileInfo.language)) {
      // Use AST-based parsing
      try {
        symbols = await parser.parse(content, fileInfo.relativePath);
      } catch (error) {
        console.warn(
          `Failed to parse ${fileInfo.relativePath} with AST parser, falling back to file chunk:`,
          error
        );
        symbols = this.createFileSymbol(content, fileInfo);
      }
    } else if (parser) {
      // Use non-AST parser (config, SQL)
      symbols = await parser.parse(content, fileInfo.relativePath);
    } else {
      // No parser available - create single file chunk
      symbols = this.createFileSymbol(content, fileInfo);
    }

    // Convert symbols to chunks
    const chunks: CodeChunkWithoutEmbedding[] = [];

    for (const symbol of symbols) {
      const symbolChunks = this.symbolToChunks(symbol, fileInfo, repo, content);
      chunks.push(...symbolChunks);
    }

    return chunks;
  }

  /**
   * Creates a file-level symbol for files without parsing
   */
  private createFileSymbol(content: string, fileInfo: FileInfo): ParsedSymbol[] {
    const lines = content.split("\n");

    return [
      {
        type: "file",
        name: fileInfo.relativePath.split("/").pop(),
        startLine: 1,
        endLine: lines.length,
        text: content,
      },
    ];
  }

  /**
   * Converts a parsed symbol to one or more chunks
   */
  private symbolToChunks(
    symbol: ParsedSymbol,
    fileInfo: FileInfo,
    repo: Repository,
    fileContent: string
  ): CodeChunkWithoutEmbedding[] {
    const chunks: CodeChunkWithoutEmbedding[] = [];

    // Estimate token count (rough: 1 token ≈ 4 chars)
    const estimatedTokens = Math.ceil(symbol.text.length / 4);

    if (estimatedTokens <= this.maxTokens) {
      // Symbol fits in one chunk
      chunks.push(
        this.createChunkFromSymbol(symbol, fileInfo, repo)
      );
    } else {
      // Need to split the symbol
      const splitChunks = this.splitSymbol(symbol, fileInfo, repo, fileContent);
      chunks.push(...splitChunks);
    }

    return chunks;
  }

  /**
   * Creates a chunk from a symbol
   */
  private createChunkFromSymbol(
    symbol: ParsedSymbol,
    fileInfo: FileInfo,
    repo: Repository
  ): CodeChunkWithoutEmbedding {
    // Build the text content
    let text = "";

    // Add doc comment if present
    if (symbol.docComment) {
      text += symbol.docComment + "\n";
    }

    // Add the symbol text
    text += symbol.text;

    return createCodeChunk({
      repo: repo.name,
      branch: repo.branch,
      commit: repo.commit,
      path: fileInfo.relativePath,
      language: fileInfo.language,
      microservice: repo.microservice,
      symbol_type: symbol.type,
      symbol_name: symbol.name,
      signature: symbol.signature,
      start_line: symbol.startLine,
      end_line: symbol.endLine,
      text,
      package: symbol.package,
      imports: symbol.imports,
      calls: symbol.calls,
      tags: repo.tags,
    });
  }

  /**
   * Splits a large symbol into multiple chunks
   */
  private splitSymbol(
    symbol: ParsedSymbol,
    fileInfo: FileInfo,
    repo: Repository,
    fileContent: string
  ): CodeChunkWithoutEmbedding[] {
    const chunks: CodeChunkWithoutEmbedding[] = [];
    const lines = symbol.text.split("\n");
    const maxCharsPerChunk = this.maxTokens * 4; // Rough token to char conversion
    const overlapChars = this.overlap * 4;

    let currentChunk: string[] = [];
    let currentChunkStartLine = symbol.startLine;
    let currentChunkChars = 0;
    let partNumber = 1;

    // Add context header for methods (class signature)
    let contextHeader = "";
    if (symbol.parent && (symbol.type === "method")) {
      contextHeader = `// In class: ${symbol.parent}\n`;
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineChars = line.length + 1; // +1 for newline

      if (currentChunkChars + lineChars > maxCharsPerChunk && currentChunk.length > 0) {
        // Save current chunk
        const chunkText = contextHeader + currentChunk.join("\n");
        const chunkEndLine = currentChunkStartLine + currentChunk.length - 1;

        chunks.push(
          createCodeChunk({
            repo: repo.name,
            branch: repo.branch,
            commit: repo.commit,
            path: fileInfo.relativePath,
            language: fileInfo.language,
            microservice: repo.microservice,
            symbol_type: symbol.type,
            symbol_name: symbol.name ? `${symbol.name} (part ${partNumber})` : undefined,
            signature: symbol.signature,
            start_line: currentChunkStartLine,
            end_line: chunkEndLine,
            text: chunkText,
            package: symbol.package,
            imports: symbol.imports,
            calls: symbol.calls,
            tags: repo.tags,
          })
        );

        partNumber++;

        // Start new chunk with overlap
        const overlapLines = Math.ceil(overlapChars / 80); // Assume ~80 chars per line
        const startIndex = Math.max(0, currentChunk.length - overlapLines);
        currentChunk = currentChunk.slice(startIndex);
        currentChunkStartLine = currentChunkStartLine + startIndex;
        currentChunkChars = currentChunk.join("\n").length;
      }

      currentChunk.push(line);
      currentChunkChars += lineChars;
    }

    // Don't forget the last chunk
    if (currentChunk.length > 0) {
      const chunkText = contextHeader + currentChunk.join("\n");

      chunks.push(
        createCodeChunk({
          repo: repo.name,
          branch: repo.branch,
          commit: repo.commit,
          path: fileInfo.relativePath,
          language: fileInfo.language,
          microservice: repo.microservice,
          symbol_type: symbol.type,
          symbol_name: symbol.name
            ? partNumber > 1
              ? `${symbol.name} (part ${partNumber})`
              : symbol.name
            : undefined,
          signature: symbol.signature,
          start_line: currentChunkStartLine,
          end_line: symbol.endLine,
          text: chunkText,
          package: symbol.package,
          imports: symbol.imports,
          calls: symbol.calls,
          tags: repo.tags,
        })
      );
    }

    return chunks;
  }
}
