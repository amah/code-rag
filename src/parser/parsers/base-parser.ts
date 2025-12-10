import type { Language, ParsedSymbol } from "../../models/types.js";

/**
 * Base interface for language-specific parsers
 */
export interface Parser {
  /** The language this parser handles */
  readonly language: Language;

  /**
   * Parse a source file and extract symbols
   * @param content - The source file content
   * @param filePath - The file path (for context)
   * @returns Array of parsed symbols
   */
  parse(content: string, filePath: string): Promise<ParsedSymbol[]>;
}

/**
 * Helper to extract lines from content
 */
export function getLines(content: string): string[] {
  return content.split("\n");
}

/**
 * Helper to get text between line numbers (1-indexed)
 */
export function getTextBetweenLines(
  content: string,
  startLine: number,
  endLine: number
): string {
  const lines = getLines(content);
  return lines.slice(startLine - 1, endLine).join("\n");
}

/**
 * Helper to count lines in text
 */
export function countLines(text: string): number {
  return text.split("\n").length;
}

/**
 * Helper to get line number from byte offset
 */
export function getLineFromOffset(content: string, offset: number): number {
  const beforeOffset = content.slice(0, offset);
  return beforeOffset.split("\n").length;
}
