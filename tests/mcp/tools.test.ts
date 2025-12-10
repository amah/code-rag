import { describe, it, expect, mock } from "bun:test";
import {
  searchCodeTool,
  handleSearchCode,
  listRepositoriesTool,
  handleListRepositories,
  getRepositoryStatsTool,
  handleGetRepositoryStats,
  getFileChunksTool,
  handleGetFileChunks,
} from "../../src/mcp/tools/index.js";
import type { SearchService } from "../../src/search/search-service.js";

// Mock SearchService
const createMockSearchService = () =>
  ({
    search: mock(async () => ({
      results: [
        {
          id: "test-id",
          score: 0.95,
          repo: "test-repo",
          path: "src/test.ts",
          language: "typescript",
          symbol_type: "function",
          symbol_name: "testFunc",
          signature: "testFunc(): void",
          start_line: 10,
          end_line: 20,
          text: "function testFunc() { return 42; }",
        },
      ],
      total: 1,
      took_ms: 50,
    })),
    listRepositories: mock(async () => ["repo1", "repo2", "repo3"]),
    getRepositoryStats: mock(async () => ({
      repo: "test-repo",
      total_chunks: 150,
      by_language: { typescript: 100, java: 50 },
      by_symbol_type: { function: 80, class: 40, method: 30 },
    })),
    getFileChunks: mock(async () => [
      {
        id: "chunk1",
        score: 1.0,
        repo: "test-repo",
        path: "src/test.ts",
        language: "typescript",
        symbol_type: "function",
        symbol_name: "func1",
        start_line: 1,
        end_line: 10,
        text: "function func1() {}",
      },
      {
        id: "chunk2",
        score: 1.0,
        repo: "test-repo",
        path: "src/test.ts",
        language: "typescript",
        symbol_type: "function",
        symbol_name: "func2",
        start_line: 12,
        end_line: 20,
        text: "function func2() {}",
      },
    ]),
  }) as unknown as SearchService;

describe("MCP Tools", () => {
  describe("searchCodeTool", () => {
    it("should have correct tool definition", () => {
      expect(searchCodeTool.name).toBe("search_code");
      expect(searchCodeTool.description).toContain("Search");
      expect(searchCodeTool.inputSchema.type).toBe("object");
      expect(searchCodeTool.inputSchema.required).toContain("query");
    });

    it("should have query property in schema", () => {
      const props = searchCodeTool.inputSchema.properties;
      expect(props.query).toBeDefined();
      expect(props.query.type).toBe("string");
    });

    it("should have optional top_k property", () => {
      const props = searchCodeTool.inputSchema.properties;
      expect(props.top_k).toBeDefined();
      expect(props.top_k.type).toBe("number");
    });

    it("should have optional filters property", () => {
      const props = searchCodeTool.inputSchema.properties;
      expect(props.filters).toBeDefined();
      expect(props.filters.type).toBe("object");
    });
  });

  describe("handleSearchCode", () => {
    it("should return formatted search results", async () => {
      const service = createMockSearchService();
      const result = await handleSearchCode(service, { query: "test query" });

      expect(result).toContain("Found 1 results");
      expect(result).toContain("test-repo");
      expect(result).toContain("src/test.ts");
      expect(result).toContain("testFunc");
    });

    it("should return message when no results found", async () => {
      const service = {
        search: mock(async () => ({ results: [], total: 0, took_ms: 10 })),
      } as unknown as SearchService;

      const result = await handleSearchCode(service, { query: "nonexistent" });

      expect(result).toContain("No matching code found");
    });

    it("should include score in results", async () => {
      const service = createMockSearchService();
      const result = await handleSearchCode(service, { query: "test" });

      expect(result).toContain("score:");
    });

    it("should include code block in results", async () => {
      const service = createMockSearchService();
      const result = await handleSearchCode(service, { query: "test" });

      expect(result).toContain("```typescript");
      expect(result).toContain("```");
    });
  });

  describe("listRepositoriesTool", () => {
    it("should have correct tool definition", () => {
      expect(listRepositoriesTool.name).toBe("list_repositories");
      expect(listRepositoriesTool.description).toContain("List");
      expect(listRepositoriesTool.inputSchema.required).toEqual([]);
    });
  });

  describe("handleListRepositories", () => {
    it("should return list of repositories", async () => {
      const service = createMockSearchService();
      const result = await handleListRepositories(service);

      expect(result).toContain("Indexed repositories (3)");
      expect(result).toContain("repo1");
      expect(result).toContain("repo2");
      expect(result).toContain("repo3");
    });

    it("should return message when no repos indexed", async () => {
      const service = {
        listRepositories: mock(async () => []),
      } as unknown as SearchService;

      const result = await handleListRepositories(service);

      expect(result).toContain("No repositories have been indexed");
    });
  });

  describe("getRepositoryStatsTool", () => {
    it("should have correct tool definition", () => {
      expect(getRepositoryStatsTool.name).toBe("get_repository_stats");
      expect(getRepositoryStatsTool.inputSchema.required).toContain("repo");
    });
  });

  describe("handleGetRepositoryStats", () => {
    it("should return repository statistics", async () => {
      const service = createMockSearchService();
      const result = await handleGetRepositoryStats(service, { repo: "test-repo" });

      expect(result).toContain("Repository: test-repo");
      expect(result).toContain("Total chunks: 150");
      expect(result).toContain("By language:");
      expect(result).toContain("typescript: 100");
      expect(result).toContain("By symbol type:");
    });

    it("should return message for empty repo", async () => {
      const service = {
        getRepositoryStats: mock(async () => ({
          repo: "empty",
          total_chunks: 0,
          by_language: {},
          by_symbol_type: {},
        })),
      } as unknown as SearchService;

      const result = await handleGetRepositoryStats(service, { repo: "empty" });

      expect(result).toContain("no indexed chunks");
    });
  });

  describe("getFileChunksTool", () => {
    it("should have correct tool definition", () => {
      expect(getFileChunksTool.name).toBe("get_file_chunks");
      expect(getFileChunksTool.inputSchema.required).toContain("repo");
      expect(getFileChunksTool.inputSchema.required).toContain("path");
    });
  });

  describe("handleGetFileChunks", () => {
    it("should return file chunks", async () => {
      const service = createMockSearchService();
      const result = await handleGetFileChunks(service, {
        repo: "test-repo",
        path: "src/test.ts",
      });

      expect(result).toContain("File: test-repo/src/test.ts");
      expect(result).toContain("Total chunks: 2");
      expect(result).toContain("func1");
      expect(result).toContain("func2");
    });

    it("should return message when no chunks found", async () => {
      const service = {
        getFileChunks: mock(async () => []),
      } as unknown as SearchService;

      const result = await handleGetFileChunks(service, {
        repo: "test-repo",
        path: "nonexistent.ts",
      });

      expect(result).toContain("No chunks found");
    });

    it("should include code blocks for each chunk", async () => {
      const service = createMockSearchService();
      const result = await handleGetFileChunks(service, {
        repo: "test-repo",
        path: "src/test.ts",
      });

      // Should have code blocks for both chunks
      const codeBlockMatches = result.match(/```typescript/g);
      expect(codeBlockMatches?.length).toBe(2);
    });
  });
});
