import type { Language } from "../models/types.js";

/**
 * Extension to language mapping
 */
const EXTENSION_MAP: Record<string, Language> = {
  // Java
  ".java": "java",

  // TypeScript
  ".ts": "typescript",
  ".tsx": "typescript",
  ".mts": "typescript",
  ".cts": "typescript",

  // JavaScript
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",

  // Python
  ".py": "python",
  ".pyw": "python",
  ".pyi": "python",

  // SQL
  ".sql": "sql",
  ".psql": "sql",
  ".pgsql": "sql",
  ".mysql": "sql",

  // Config - YAML
  ".yaml": "yaml",
  ".yml": "yaml",

  // Config - JSON
  ".json": "json",

  // Config - Other
  ".properties": "config",
  ".toml": "config",
  ".ini": "config",
  ".env": "config",
};

/**
 * Languages that support AST parsing with tree-sitter
 */
const AST_SUPPORTED_LANGUAGES: Language[] = [
  "java",
  "typescript",
  "javascript",
  "python",
];

/**
 * Detects language from file extension
 */
export function detectLanguage(extension: string): Language {
  const normalizedExt = extension.toLowerCase();
  return EXTENSION_MAP[normalizedExt] ?? "unknown";
}

/**
 * Checks if a language supports AST parsing
 */
export function supportsAstParsing(language: Language): boolean {
  return AST_SUPPORTED_LANGUAGES.includes(language);
}

/**
 * Gets the tree-sitter grammar name for a language
 */
export function getTreeSitterGrammar(language: Language): string | null {
  switch (language) {
    case "java":
      return "java";
    case "typescript":
      return "typescript";
    case "javascript":
      return "javascript";
    case "python":
      return "python";
    default:
      return null;
  }
}

/**
 * Gets all supported extensions
 */
export function getSupportedExtensions(): string[] {
  return Object.keys(EXTENSION_MAP);
}

/**
 * Gets all supported languages
 */
export function getSupportedLanguages(): Language[] {
  return [...new Set(Object.values(EXTENSION_MAP))];
}
