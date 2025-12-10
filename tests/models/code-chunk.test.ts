import { describe, it, expect } from "bun:test";
import {
  createChunkId,
  createCodeChunk,
  type CodeChunk,
  type CodeChunkWithoutEmbedding,
} from "../../src/models/code-chunk.js";

describe("Code Chunk Model", () => {
  describe("createChunkId", () => {
    it("should create a deterministic ID", () => {
      const id1 = createChunkId("repo", "path/file.ts", "MyClass", 10, "abc123");
      const id2 = createChunkId("repo", "path/file.ts", "MyClass", 10, "abc123");

      expect(id1).toBe(id2);
    });

    it("should create different IDs for different inputs", () => {
      const id1 = createChunkId("repo1", "path/file.ts", "MyClass", 10, "abc123");
      const id2 = createChunkId("repo2", "path/file.ts", "MyClass", 10, "abc123");

      expect(id1).not.toBe(id2);
    });

    it("should handle undefined symbol name", () => {
      const id = createChunkId("repo", "path/file.ts", undefined, 10, "abc123");

      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
    });

    it("should differentiate by line number", () => {
      const id1 = createChunkId("repo", "path/file.ts", "func", 10, "abc123");
      const id2 = createChunkId("repo", "path/file.ts", "func", 20, "abc123");

      expect(id1).not.toBe(id2);
    });

    it("should differentiate by commit", () => {
      const id1 = createChunkId("repo", "path/file.ts", "func", 10, "abc123");
      const id2 = createChunkId("repo", "path/file.ts", "func", 10, "def456");

      expect(id1).not.toBe(id2);
    });
  });

  describe("createCodeChunk", () => {
    it("should create a code chunk with all required fields", () => {
      const chunk = createCodeChunk({
        repo: "my-repo",
        branch: "main",
        commit: "abc123",
        path: "src/index.ts",
        language: "typescript",
        symbol_type: "function",
        symbol_name: "myFunction",
        start_line: 10,
        end_line: 20,
        text: "function myFunction() {}",
      });

      expect(chunk.id).toBeDefined();
      expect(chunk.repo).toBe("my-repo");
      expect(chunk.branch).toBe("main");
      expect(chunk.commit).toBe("abc123");
      expect(chunk.path).toBe("src/index.ts");
      expect(chunk.language).toBe("typescript");
      expect(chunk.symbol_type).toBe("function");
      expect(chunk.symbol_name).toBe("myFunction");
      expect(chunk.start_line).toBe(10);
      expect(chunk.end_line).toBe(20);
      expect(chunk.text).toBe("function myFunction() {}");
    });

    it("should create a code chunk with optional fields", () => {
      const chunk = createCodeChunk({
        repo: "my-repo",
        branch: "main",
        commit: "abc123",
        path: "src/index.ts",
        language: "typescript",
        symbol_type: "method",
        symbol_name: "calculate",
        signature: "calculate(a: number, b: number): number",
        start_line: 10,
        end_line: 20,
        text: "calculate(a, b) { return a + b; }",
        microservice: "calc-service",
        package: "com.example",
        imports: ["lodash", "moment"],
        calls: ["add", "multiply"],
        aggregate: "Calculator",
        tags: ["math", "utility"],
      });

      expect(chunk.microservice).toBe("calc-service");
      expect(chunk.signature).toBe("calculate(a: number, b: number): number");
      expect(chunk.package).toBe("com.example");
      expect(chunk.imports).toEqual(["lodash", "moment"]);
      expect(chunk.calls).toEqual(["add", "multiply"]);
      expect(chunk.aggregate).toBe("Calculator");
      expect(chunk.tags).toEqual(["math", "utility"]);
    });

    it("should not include embedding in CodeChunkWithoutEmbedding", () => {
      const chunk: CodeChunkWithoutEmbedding = createCodeChunk({
        repo: "my-repo",
        branch: "main",
        commit: "abc123",
        path: "src/index.ts",
        language: "typescript",
        symbol_type: "function",
        start_line: 1,
        end_line: 5,
        text: "code",
      });

      expect(chunk.embedding).toBeUndefined();
    });

    it("should generate unique IDs for different chunks", () => {
      const chunk1 = createCodeChunk({
        repo: "repo",
        branch: "main",
        commit: "abc",
        path: "file1.ts",
        language: "typescript",
        symbol_type: "function",
        symbol_name: "func1",
        start_line: 1,
        end_line: 10,
        text: "code1",
      });

      const chunk2 = createCodeChunk({
        repo: "repo",
        branch: "main",
        commit: "abc",
        path: "file2.ts",
        language: "typescript",
        symbol_type: "function",
        symbol_name: "func2",
        start_line: 1,
        end_line: 10,
        text: "code2",
      });

      expect(chunk1.id).not.toBe(chunk2.id);
    });
  });
});
