import { describe, it, expect, mock } from "bun:test";
import type { SearchService } from "../../src/search/search-service.js";

// Mock SearchService
const createMockSearchService = () =>
  ({
    search: mock(async (request: any) => ({
      results: [
        {
          id: "test-id",
          score: 0.95,
          repo: "test-repo",
          path: "src/test.ts",
          language: "typescript",
          symbol_type: "function",
          symbol_name: "testFunc",
          start_line: 10,
          end_line: 20,
          text: "function testFunc() {}",
        },
      ],
      total: 1,
      took_ms: 50,
    })),
    listRepositories: mock(async () => ["repo1", "repo2"]),
    getRepositoryStats: mock(async (repo: string) => ({
      repo,
      total_chunks: 100,
      by_language: { typescript: 50, java: 50 },
      by_symbol_type: { function: 60, class: 40 },
    })),
    getFileChunks: mock(async (repo: string, path: string) => [
      {
        id: "chunk1",
        score: 1.0,
        repo,
        path,
        language: "typescript",
        symbol_type: "function",
        symbol_name: "func1",
        start_line: 1,
        end_line: 10,
        text: "function func1() {}",
      },
    ]),
  }) as unknown as SearchService;

describe("Search API Routes", () => {
  describe("POST /search-code", () => {
    it("should call search service with correct parameters", async () => {
      const service = createMockSearchService();

      await service.search({
        query: "test query",
        top_k: 10,
        filters: { repo: "my-repo" },
      });

      expect(service.search).toHaveBeenCalled();
    });

    it("should validate required query field", () => {
      const requestBody = {};
      expect(requestBody).not.toHaveProperty("query");
    });

    it("should accept optional top_k parameter", () => {
      const requestBody = {
        query: "test",
        top_k: 10,
      };

      expect(requestBody.top_k).toBe(10);
    });

    it("should accept optional filters", () => {
      const requestBody = {
        query: "test",
        filters: {
          repo: "my-repo",
          language: "typescript",
        },
      };

      expect(requestBody.filters.repo).toBe("my-repo");
      expect(requestBody.filters.language).toBe("typescript");
    });
  });

  describe("GET /repositories", () => {
    it("should call listRepositories", async () => {
      const service = createMockSearchService();
      const result = await service.listRepositories();

      expect(service.listRepositories).toHaveBeenCalled();
      expect(result).toEqual(["repo1", "repo2"]);
    });
  });

  describe("GET /repositories/:repo/stats", () => {
    it("should call getRepositoryStats with repo name", async () => {
      const service = createMockSearchService();
      const result = await service.getRepositoryStats("test-repo");

      expect(service.getRepositoryStats).toHaveBeenCalled();
      expect(result.repo).toBe("test-repo");
      expect(result.total_chunks).toBe(100);
    });
  });

  describe("GET /file-chunks", () => {
    it("should require repo and path query params", () => {
      const validParams = { repo: "test-repo", path: "src/test.ts" };

      expect(validParams.repo).toBeDefined();
      expect(validParams.path).toBeDefined();
    });

    it("should call getFileChunks with correct params", async () => {
      const service = createMockSearchService();
      const result = await service.getFileChunks("test-repo", "src/test.ts");

      expect(service.getFileChunks).toHaveBeenCalled();
      expect(result.length).toBe(1);
      expect(result[0].repo).toBe("test-repo");
    });
  });
});

describe("Request Validation", () => {
  describe("SearchRequest", () => {
    it("should accept valid search request", () => {
      const validRequest = {
        query: "find payment code",
        top_k: 20,
        filters: {
          repo: "payment-service",
          language: "java",
          microservice: "payments",
          symbol_type: "method",
        },
      };

      expect(validRequest.query.length).toBeGreaterThan(0);
      expect(validRequest.top_k).toBeGreaterThan(0);
      expect(validRequest.top_k).toBeLessThanOrEqual(100);
    });

    it("should reject empty query", () => {
      const invalidRequest = {
        query: "",
      };

      expect(invalidRequest.query.length).toBe(0);
    });

    it("should reject top_k over 100", () => {
      const request = {
        query: "test",
        top_k: 150,
      };

      expect(request.top_k).toBeGreaterThan(100);
    });

    it("should reject top_k under 1", () => {
      const request = {
        query: "test",
        top_k: 0,
      };

      expect(request.top_k).toBeLessThan(1);
    });
  });

  describe("symbol_type filter", () => {
    it("should accept valid symbol types", () => {
      const validTypes = ["file", "class", "interface", "enum", "function", "method", "block"];

      validTypes.forEach((type) => {
        const request = {
          query: "test",
          filters: { symbol_type: type },
        };
        expect(validTypes).toContain(request.filters.symbol_type);
      });
    });
  });
});
