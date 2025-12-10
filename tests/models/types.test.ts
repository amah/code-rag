import { describe, it, expect } from "bun:test";
import type {
  Language,
  SymbolType,
  Repository,
  FileInfo,
  ParsedSymbol,
  SearchRequest,
  SearchResult,
  SearchResponse,
  RepositoryStats,
} from "../../src/models/types.js";

describe("Type Definitions", () => {
  describe("Language type", () => {
    it("should accept valid language values", () => {
      const languages: Language[] = [
        "java",
        "typescript",
        "javascript",
        "python",
        "sql",
        "yaml",
        "json",
        "config",
        "unknown",
      ];

      languages.forEach((lang) => {
        expect(typeof lang).toBe("string");
      });
    });
  });

  describe("SymbolType type", () => {
    it("should accept valid symbol type values", () => {
      const types: SymbolType[] = [
        "file",
        "class",
        "interface",
        "enum",
        "function",
        "method",
        "block",
      ];

      types.forEach((type) => {
        expect(typeof type).toBe("string");
      });
    });
  });

  describe("Repository interface", () => {
    it("should create valid Repository object", () => {
      const repo: Repository = {
        name: "my-repo",
        path: "/path/to/repo",
        branch: "main",
        commit: "abc123",
        microservice: "service-a",
        tags: ["tag1", "tag2"],
      };

      expect(repo.name).toBe("my-repo");
      expect(repo.path).toBe("/path/to/repo");
      expect(repo.branch).toBe("main");
      expect(repo.commit).toBe("abc123");
      expect(repo.microservice).toBe("service-a");
      expect(repo.tags).toEqual(["tag1", "tag2"]);
    });

    it("should allow optional fields to be undefined", () => {
      const repo: Repository = {
        name: "my-repo",
        path: "/path/to/repo",
        branch: "main",
        commit: "abc123",
      };

      expect(repo.microservice).toBeUndefined();
      expect(repo.tags).toBeUndefined();
    });
  });

  describe("FileInfo interface", () => {
    it("should create valid FileInfo object", () => {
      const fileInfo: FileInfo = {
        absolutePath: "/path/to/repo/src/index.ts",
        relativePath: "src/index.ts",
        language: "typescript",
        extension: ".ts",
      };

      expect(fileInfo.absolutePath).toBe("/path/to/repo/src/index.ts");
      expect(fileInfo.relativePath).toBe("src/index.ts");
      expect(fileInfo.language).toBe("typescript");
      expect(fileInfo.extension).toBe(".ts");
    });
  });

  describe("ParsedSymbol interface", () => {
    it("should create valid ParsedSymbol object", () => {
      const symbol: ParsedSymbol = {
        type: "method",
        name: "calculate",
        signature: "calculate(a: number): number",
        startLine: 10,
        endLine: 20,
        text: "function calculate(a) { return a * 2; }",
        docComment: "/** Doubles the input */",
        parent: "Calculator",
        package: "com.example",
        imports: ["lodash"],
        calls: ["multiply"],
      };

      expect(symbol.type).toBe("method");
      expect(symbol.name).toBe("calculate");
      expect(symbol.parent).toBe("Calculator");
    });
  });

  describe("SearchRequest interface", () => {
    it("should create valid SearchRequest object", () => {
      const request: SearchRequest = {
        query: "find payment logic",
        top_k: 10,
        filters: {
          repo: "payment-service",
          language: "java",
          microservice: "payments",
          symbol_type: "method",
        },
      };

      expect(request.query).toBe("find payment logic");
      expect(request.top_k).toBe(10);
      expect(request.filters?.repo).toBe("payment-service");
    });

    it("should allow minimal SearchRequest", () => {
      const request: SearchRequest = {
        query: "search query",
      };

      expect(request.query).toBe("search query");
      expect(request.top_k).toBeUndefined();
      expect(request.filters).toBeUndefined();
    });
  });

  describe("SearchResponse interface", () => {
    it("should create valid SearchResponse object", () => {
      const response: SearchResponse = {
        results: [
          {
            id: "123",
            score: 0.95,
            repo: "my-repo",
            path: "src/index.ts",
            language: "typescript",
            symbol_type: "function",
            symbol_name: "myFunc",
            start_line: 10,
            end_line: 20,
            text: "function code",
          },
        ],
        total: 1,
        took_ms: 50,
      };

      expect(response.results.length).toBe(1);
      expect(response.total).toBe(1);
      expect(response.took_ms).toBe(50);
    });
  });

  describe("RepositoryStats interface", () => {
    it("should create valid RepositoryStats object", () => {
      const stats: RepositoryStats = {
        repo: "my-repo",
        total_chunks: 100,
        by_language: {
          typescript: 50,
          java: 30,
          python: 20,
        },
        by_symbol_type: {
          function: 40,
          method: 35,
          class: 25,
        },
        last_indexed_commit: "abc123",
      };

      expect(stats.repo).toBe("my-repo");
      expect(stats.total_chunks).toBe(100);
      expect(stats.by_language.typescript).toBe(50);
      expect(stats.by_symbol_type.function).toBe(40);
    });
  });
});
