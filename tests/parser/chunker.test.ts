import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { writeFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { Chunker } from "../../src/parser/chunker.js";
import type { FileInfo, Repository } from "../../src/models/types.js";

const TEST_DIR = join(import.meta.dir, ".test-fixtures");

const mockRepo: Repository = {
  name: "test-repo",
  path: TEST_DIR,
  branch: "main",
  commit: "abc123",
};

describe("Chunker", () => {
  beforeAll(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterAll(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe("whole-file mode", () => {
    it("should create a single chunk for a file when wholeFile is true", async () => {
      const content = `function hello() {
  console.log("Hello");
}

function world() {
  console.log("World");
}`;
      const filePath = join(TEST_DIR, "simple.ts");
      writeFileSync(filePath, content);

      const chunker = new Chunker({
        maxTokens: 1000,
        overlap: 100,
        wholeFile: true,
      });

      const fileInfo: FileInfo = {
        absolutePath: filePath,
        relativePath: "simple.ts",
        language: "typescript",
        extension: ".ts",
      };

      const chunks = await chunker.chunkFile(fileInfo, mockRepo);

      expect(chunks.length).toBe(1);
      expect(chunks[0].symbol_type).toBe("file");
      expect(chunks[0].text).toBe(content);
    });

    it("should parse into semantic chunks when wholeFile is false", async () => {
      const content = `function hello() {
  console.log("Hello");
}

function world() {
  console.log("World");
}`;
      const filePath = join(TEST_DIR, "parsed.ts");
      writeFileSync(filePath, content);

      const chunker = new Chunker({
        maxTokens: 1000,
        overlap: 100,
        wholeFile: false,
      });

      const fileInfo: FileInfo = {
        absolutePath: filePath,
        relativePath: "parsed.ts",
        language: "typescript",
        extension: ".ts",
      };

      const chunks = await chunker.chunkFile(fileInfo, mockRepo);

      // Should have multiple chunks (one per function)
      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks.some((c) => c.symbol_type === "function")).toBe(true);
    });

    it("should split large files even in whole-file mode", async () => {
      // Create a file that exceeds maxTokens (100 tokens * 4 chars = 400 chars)
      const lines = Array(50).fill("// This is a line of code that adds to the file size").join("\n");
      const filePath = join(TEST_DIR, "large.ts");
      writeFileSync(filePath, lines);

      const chunker = new Chunker({
        maxTokens: 100, // Small token limit to force splitting
        overlap: 10,
        wholeFile: true,
      });

      const fileInfo: FileInfo = {
        absolutePath: filePath,
        relativePath: "large.ts",
        language: "typescript",
        extension: ".ts",
      };

      const chunks = await chunker.chunkFile(fileInfo, mockRepo);

      // Should be split into multiple chunks
      expect(chunks.length).toBeGreaterThan(1);
      // All chunks should still be file type
      expect(chunks.every((c) => c.symbol_type === "file")).toBe(true);
    });

    it("should default to semantic chunking when wholeFile is not specified", async () => {
      const content = `class Greeter {
  greet() {
    return "Hello";
  }
}`;
      const filePath = join(TEST_DIR, "default.ts");
      writeFileSync(filePath, content);

      const chunker = new Chunker({
        maxTokens: 1000,
        overlap: 100,
        // wholeFile not specified - should default to false
      });

      const fileInfo: FileInfo = {
        absolutePath: filePath,
        relativePath: "default.ts",
        language: "typescript",
        extension: ".ts",
      };

      const chunks = await chunker.chunkFile(fileInfo, mockRepo);

      // Should parse into semantic chunks (class, method)
      expect(chunks.some((c) => c.symbol_type === "class" || c.symbol_type === "method")).toBe(true);
    });
  });
});
