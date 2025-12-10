import YAML from "yaml";
import type { Language, ParsedSymbol } from "../../models/types.js";
import type { Parser } from "./base-parser.js";
import { getLines } from "./base-parser.js";

/**
 * Parser for configuration files (YAML, JSON)
 */
export class ConfigParser implements Parser {
  readonly language: Language = "config";

  async parse(content: string, filePath: string): Promise<ParsedSymbol[]> {
    const extension = filePath.split(".").pop()?.toLowerCase();

    if (extension === "json") {
      return this.parseJson(content, filePath);
    } else if (extension === "yaml" || extension === "yml") {
      return this.parseYaml(content, filePath);
    }

    // For other config files, treat as single block
    return this.parseAsBlock(content, filePath);
  }

  private parseJson(content: string, filePath: string): ParsedSymbol[] {
    const symbols: ParsedSymbol[] = [];

    try {
      const parsed = JSON.parse(content);
      const lines = getLines(content);

      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        // For objects, create a chunk for each top-level key
        const keys = Object.keys(parsed);

        if (keys.length <= 5) {
          // Small config - treat as single block
          symbols.push({
            type: "block",
            name: filePath.split("/").pop(),
            startLine: 1,
            endLine: lines.length,
            text: content,
          });
        } else {
          // Larger config - try to chunk by top-level keys
          // This is a simplified approach since JSON doesn't preserve line info
          symbols.push({
            type: "block",
            name: filePath.split("/").pop(),
            startLine: 1,
            endLine: lines.length,
            text: content,
          });
        }
      } else {
        // Arrays or primitives - single block
        symbols.push({
          type: "block",
          name: filePath.split("/").pop(),
          startLine: 1,
          endLine: lines.length,
          text: content,
        });
      }
    } catch {
      // Invalid JSON - still index as block
      symbols.push({
        type: "block",
        name: filePath.split("/").pop(),
        startLine: 1,
        endLine: getLines(content).length,
        text: content,
      });
    }

    return symbols;
  }

  private parseYaml(content: string, filePath: string): ParsedSymbol[] {
    const symbols: ParsedSymbol[] = [];

    try {
      const doc = YAML.parseDocument(content);
      const lines = getLines(content);

      if (doc.contents && YAML.isMap(doc.contents)) {
        const items = doc.contents.items;

        if (items.length <= 3) {
          // Small config - treat as single block
          symbols.push({
            type: "block",
            name: filePath.split("/").pop(),
            startLine: 1,
            endLine: lines.length,
            text: content,
          });
        } else {
          // Chunk by top-level keys
          for (const item of items) {
            if (YAML.isPair(item) && item.key) {
              const keyName = String(item.key);
              const range = item.value?.range;

              if (range) {
                // Calculate line numbers from range
                const startLine = this.getLineFromOffset(content, range[0]);
                const endLine = this.getLineFromOffset(content, range[1]);

                // Get the YAML text for this section
                const keyRange = (item.key as any).range;
                const sectionStart = keyRange ? keyRange[0] : range[0];
                const sectionText = content.slice(sectionStart, range[1]);

                symbols.push({
                  type: "block",
                  name: keyName,
                  startLine: this.getLineFromOffset(content, sectionStart),
                  endLine,
                  text: sectionText.trim(),
                });
              }
            }
          }
        }
      } else {
        // Not a map - single block
        symbols.push({
          type: "block",
          name: filePath.split("/").pop(),
          startLine: 1,
          endLine: lines.length,
          text: content,
        });
      }
    } catch {
      // Invalid YAML - still index as block
      symbols.push({
        type: "block",
        name: filePath.split("/").pop(),
        startLine: 1,
        endLine: getLines(content).length,
        text: content,
      });
    }

    return symbols;
  }

  private parseAsBlock(content: string, filePath: string): ParsedSymbol[] {
    const lines = getLines(content);

    return [
      {
        type: "block",
        name: filePath.split("/").pop(),
        startLine: 1,
        endLine: lines.length,
        text: content,
      },
    ];
  }

  private getLineFromOffset(content: string, offset: number): number {
    const beforeOffset = content.slice(0, offset);
    return beforeOffset.split("\n").length;
  }
}

/**
 * YAML-specific parser
 */
export class YamlParser extends ConfigParser {
  readonly language: Language = "yaml";
}

/**
 * JSON-specific parser
 */
export class JsonParser extends ConfigParser {
  readonly language: Language = "json";
}
