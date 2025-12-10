import type { Language, ParsedSymbol } from "../../models/types.js";
import type { Parser } from "./base-parser.js";
import { getLines } from "./base-parser.js";

/**
 * SQL parser - splits SQL files by statements
 */
export class SqlParser implements Parser {
  readonly language: Language = "sql";

  // Keywords that typically start important SQL statements
  private readonly STATEMENT_KEYWORDS = [
    "CREATE",
    "ALTER",
    "DROP",
    "INSERT",
    "UPDATE",
    "DELETE",
    "SELECT",
    "WITH",
    "GRANT",
    "REVOKE",
  ];

  async parse(content: string, filePath: string): Promise<ParsedSymbol[]> {
    const symbols: ParsedSymbol[] = [];
    const statements = this.splitStatements(content);

    for (const stmt of statements) {
      if (stmt.text.trim().length === 0) continue;

      const name = this.extractStatementName(stmt.text);
      const type = this.getStatementType(stmt.text);

      symbols.push({
        type: "block",
        name: name || `SQL ${type}`,
        startLine: stmt.startLine,
        endLine: stmt.endLine,
        text: stmt.text,
      });
    }

    return symbols;
  }

  private splitStatements(
    content: string
  ): Array<{ text: string; startLine: number; endLine: number }> {
    const statements: Array<{
      text: string;
      startLine: number;
      endLine: number;
    }> = [];

    const lines = getLines(content);
    let currentStatement: string[] = [];
    let startLine = 1;
    let inBlockComment = false;
    let inString = false;
    let stringChar = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Track if we're starting a new statement
      const trimmedLine = line.trim();
      const isNewStatement =
        currentStatement.length === 0 ||
        this.STATEMENT_KEYWORDS.some((kw) =>
          trimmedLine.toUpperCase().startsWith(kw)
        );

      if (
        isNewStatement &&
        currentStatement.length > 0 &&
        !inBlockComment &&
        !inString
      ) {
        // Save previous statement
        const text = currentStatement.join("\n").trim();
        if (text.length > 0) {
          statements.push({
            text,
            startLine,
            endLine: lineNum - 1,
          });
        }
        currentStatement = [];
        startLine = lineNum;
      }

      currentStatement.push(line);

      // Track comments and strings (simplified)
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        const nextChar = line[j + 1];

        if (inString) {
          if (char === stringChar && line[j - 1] !== "\\") {
            inString = false;
          }
        } else if (inBlockComment) {
          if (char === "*" && nextChar === "/") {
            inBlockComment = false;
            j++;
          }
        } else {
          if (char === "/" && nextChar === "*") {
            inBlockComment = true;
            j++;
          } else if (char === "'" || char === '"') {
            inString = true;
            stringChar = char;
          }
        }
      }

      // Check for statement terminator
      if (trimmedLine.endsWith(";") && !inBlockComment && !inString) {
        const text = currentStatement.join("\n").trim();
        if (text.length > 0) {
          statements.push({
            text,
            startLine,
            endLine: lineNum,
          });
        }
        currentStatement = [];
        startLine = lineNum + 1;
      }
    }

    // Don't forget the last statement
    if (currentStatement.length > 0) {
      const text = currentStatement.join("\n").trim();
      if (text.length > 0) {
        statements.push({
          text,
          startLine,
          endLine: lines.length,
        });
      }
    }

    return statements;
  }

  private extractStatementName(sql: string): string | undefined {
    const upper = sql.toUpperCase().trim();

    // CREATE TABLE name
    const createTableMatch = upper.match(
      /CREATE\s+(?:OR\s+REPLACE\s+)?(?:TEMP(?:ORARY)?\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([^\s(]+)/i
    );
    if (createTableMatch) {
      return `CREATE TABLE ${this.extractName(sql, createTableMatch.index!, createTableMatch[0].length)}`;
    }

    // CREATE INDEX name
    const createIndexMatch = upper.match(
      /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:CONCURRENTLY\s+)?(?:IF\s+NOT\s+EXISTS\s+)?([^\s(]+)/i
    );
    if (createIndexMatch) {
      return `CREATE INDEX ${this.extractName(sql, createIndexMatch.index!, createIndexMatch[0].length)}`;
    }

    // CREATE VIEW name
    const createViewMatch = upper.match(
      /CREATE\s+(?:OR\s+REPLACE\s+)?(?:MATERIALIZED\s+)?VIEW\s+(?:IF\s+NOT\s+EXISTS\s+)?([^\s(]+)/i
    );
    if (createViewMatch) {
      return `CREATE VIEW ${this.extractName(sql, createViewMatch.index!, createViewMatch[0].length)}`;
    }

    // CREATE FUNCTION/PROCEDURE name
    const createFuncMatch = upper.match(
      /CREATE\s+(?:OR\s+REPLACE\s+)?(?:FUNCTION|PROCEDURE)\s+([^\s(]+)/i
    );
    if (createFuncMatch) {
      return `CREATE FUNCTION ${this.extractName(sql, createFuncMatch.index!, createFuncMatch[0].length)}`;
    }

    // ALTER TABLE name
    const alterTableMatch = upper.match(/ALTER\s+TABLE\s+(?:ONLY\s+)?([^\s]+)/i);
    if (alterTableMatch) {
      return `ALTER TABLE ${this.extractName(sql, alterTableMatch.index!, alterTableMatch[0].length)}`;
    }

    // INSERT INTO name
    const insertMatch = upper.match(/INSERT\s+INTO\s+([^\s(]+)/i);
    if (insertMatch) {
      return `INSERT INTO ${this.extractName(sql, insertMatch.index!, insertMatch[0].length)}`;
    }

    return undefined;
  }

  private extractName(sql: string, matchIndex: number, matchLength: number): string {
    // Extract the actual name from the original SQL (preserving case)
    const afterKeyword = sql.slice(matchIndex + matchLength - 20, matchIndex + matchLength + 50);
    const nameMatch = afterKeyword.match(/(\S+)/);
    return nameMatch ? nameMatch[1].replace(/[;(].*/, "") : "unknown";
  }

  private getStatementType(sql: string): string {
    const upper = sql.toUpperCase().trim();

    for (const keyword of this.STATEMENT_KEYWORDS) {
      if (upper.startsWith(keyword)) {
        return keyword;
      }
    }

    return "STATEMENT";
  }
}
