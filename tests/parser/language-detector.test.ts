import { describe, it, expect } from "bun:test";
import {
  detectLanguage,
  supportsAstParsing,
  getTreeSitterGrammar,
  getSupportedExtensions,
  getSupportedLanguages,
} from "../../src/parser/language-detector.js";

describe("Language Detector", () => {
  describe("detectLanguage", () => {
    it("should detect TypeScript files", () => {
      expect(detectLanguage(".ts")).toBe("typescript");
      expect(detectLanguage(".tsx")).toBe("typescript");
      expect(detectLanguage(".mts")).toBe("typescript");
      expect(detectLanguage(".cts")).toBe("typescript");
    });

    it("should detect JavaScript files", () => {
      expect(detectLanguage(".js")).toBe("javascript");
      expect(detectLanguage(".jsx")).toBe("javascript");
      expect(detectLanguage(".mjs")).toBe("javascript");
      expect(detectLanguage(".cjs")).toBe("javascript");
    });

    it("should detect Java files", () => {
      expect(detectLanguage(".java")).toBe("java");
    });

    it("should detect Python files", () => {
      expect(detectLanguage(".py")).toBe("python");
      expect(detectLanguage(".pyw")).toBe("python");
      expect(detectLanguage(".pyi")).toBe("python");
    });

    it("should detect SQL files", () => {
      expect(detectLanguage(".sql")).toBe("sql");
      expect(detectLanguage(".psql")).toBe("sql");
      expect(detectLanguage(".pgsql")).toBe("sql");
    });

    it("should detect YAML files", () => {
      expect(detectLanguage(".yaml")).toBe("yaml");
      expect(detectLanguage(".yml")).toBe("yaml");
    });

    it("should detect JSON files", () => {
      expect(detectLanguage(".json")).toBe("json");
    });

    it("should detect config files", () => {
      expect(detectLanguage(".properties")).toBe("config");
      expect(detectLanguage(".toml")).toBe("config");
      expect(detectLanguage(".ini")).toBe("config");
      expect(detectLanguage(".env")).toBe("config");
    });

    it("should return unknown for unsupported extensions", () => {
      expect(detectLanguage(".md")).toBe("unknown");
      expect(detectLanguage(".txt")).toBe("unknown");
      expect(detectLanguage(".css")).toBe("unknown");
      expect(detectLanguage(".html")).toBe("unknown");
    });

    it("should be case insensitive", () => {
      expect(detectLanguage(".TS")).toBe("typescript");
      expect(detectLanguage(".Ts")).toBe("typescript");
      expect(detectLanguage(".JAVA")).toBe("java");
    });
  });

  describe("supportsAstParsing", () => {
    it("should return true for AST-supported languages", () => {
      expect(supportsAstParsing("java")).toBe(true);
      expect(supportsAstParsing("typescript")).toBe(true);
      expect(supportsAstParsing("javascript")).toBe(true);
      expect(supportsAstParsing("python")).toBe(true);
    });

    it("should return false for non-AST languages", () => {
      expect(supportsAstParsing("sql")).toBe(false);
      expect(supportsAstParsing("yaml")).toBe(false);
      expect(supportsAstParsing("json")).toBe(false);
      expect(supportsAstParsing("config")).toBe(false);
      expect(supportsAstParsing("unknown")).toBe(false);
    });
  });

  describe("getTreeSitterGrammar", () => {
    it("should return grammar name for supported languages", () => {
      expect(getTreeSitterGrammar("java")).toBe("java");
      expect(getTreeSitterGrammar("typescript")).toBe("typescript");
      expect(getTreeSitterGrammar("javascript")).toBe("javascript");
      expect(getTreeSitterGrammar("python")).toBe("python");
    });

    it("should return null for unsupported languages", () => {
      expect(getTreeSitterGrammar("sql")).toBe(null);
      expect(getTreeSitterGrammar("yaml")).toBe(null);
      expect(getTreeSitterGrammar("unknown")).toBe(null);
    });
  });

  describe("getSupportedExtensions", () => {
    it("should return all supported extensions", () => {
      const extensions = getSupportedExtensions();

      expect(extensions).toContain(".ts");
      expect(extensions).toContain(".js");
      expect(extensions).toContain(".java");
      expect(extensions).toContain(".py");
      expect(extensions).toContain(".sql");
      expect(extensions).toContain(".yaml");
      expect(extensions).toContain(".json");
    });
  });

  describe("getSupportedLanguages", () => {
    it("should return all unique supported languages", () => {
      const languages = getSupportedLanguages();

      expect(languages).toContain("typescript");
      expect(languages).toContain("javascript");
      expect(languages).toContain("java");
      expect(languages).toContain("python");
      expect(languages).toContain("sql");
      expect(languages).toContain("yaml");
      expect(languages).toContain("json");
      expect(languages).toContain("config");
    });

    it("should not contain duplicates", () => {
      const languages = getSupportedLanguages();
      const unique = [...new Set(languages)];

      expect(languages.length).toBe(unique.length);
    });
  });
});
