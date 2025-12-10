import { describe, it, expect } from "bun:test";
import {
  AppConfigSchema,
  OpenSearchConfigSchema,
  EmbeddingConfigSchema,
  RepositoriesConfigSchema,
  FilesConfigSchema,
  ChunkingConfigSchema,
} from "../../src/config/schema.js";

describe("Config Schema", () => {
  describe("OpenSearchConfigSchema", () => {
    it("should validate a valid OpenSearch config", () => {
      const config = {
        url: "https://localhost:9200",
        index: "code_chunks",
        auth: {
          username: "admin",
          password: "password",
        },
      };

      const result = OpenSearchConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("should reject invalid URL", () => {
      const config = {
        url: "not-a-url",
        index: "code_chunks",
        auth: {
          username: "admin",
          password: "password",
        },
      };

      const result = OpenSearchConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("should use default index name", () => {
      const config = {
        url: "https://localhost:9200",
        auth: {
          username: "admin",
          password: "password",
        },
      };

      const result = OpenSearchConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.index).toBe("code_chunks");
      }
    });
  });

  describe("EmbeddingConfigSchema", () => {
    it("should validate OpenAI provider config", () => {
      const config = {
        provider: "openai",
        openai: {
          apiKey: "sk-test",
          baseUrl: "https://api.openai.com/v1",
          model: "text-embedding-ada-002",
          dimension: 1536,
          batchSize: 100,
        },
      };

      const result = EmbeddingConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("should validate local provider config", () => {
      const config = {
        provider: "local",
        local: {
          model: "Xenova/all-MiniLM-L6-v2",
          dimension: 384,
          batchSize: 32,
          cacheDir: "./.model-cache",
        },
      };

      const result = EmbeddingConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("should reject invalid provider", () => {
      const config = {
        provider: "invalid",
      };

      const result = EmbeddingConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("should default to openai provider", () => {
      const config = {};

      const result = EmbeddingConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.provider).toBe("openai");
      }
    });
  });

  describe("RepositoriesConfigSchema", () => {
    it("should validate a valid repositories config", () => {
      const config = {
        rootDir: "/path/to/repos",
        include: ["*"],
        exclude: ["archived-*"],
        overrides: {
          "my-service": {
            microservice: "payment-service",
            tags: ["payments"],
          },
        },
      };

      const result = RepositoriesConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("should require rootDir", () => {
      const config = {
        include: ["*"],
      };

      const result = RepositoriesConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("should use default include pattern", () => {
      const config = {
        rootDir: "/path/to/repos",
      };

      const result = RepositoriesConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.include).toEqual(["*"]);
      }
    });
  });

  describe("FilesConfigSchema", () => {
    it("should validate a valid files config", () => {
      const config = {
        include: ["src/**/*", "lib/**/*"],
        exclude: ["**/node_modules/**"],
      };

      const result = FilesConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("should use defaults", () => {
      const config = {};

      const result = FilesConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.include).toEqual(["src/**/*"]);
        expect(result.data.exclude).toEqual(["**/node_modules/**"]);
      }
    });
  });

  describe("ChunkingConfigSchema", () => {
    it("should validate a valid chunking config", () => {
      const config = {
        maxTokens: 1000,
        overlap: 100,
      };

      const result = ChunkingConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("should use defaults", () => {
      const config = {};

      const result = ChunkingConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.maxTokens).toBe(1000);
        expect(result.data.overlap).toBe(100);
      }
    });
  });
});
