import { z } from "zod";

export const OpenSearchConfigSchema = z.object({
  url: z.string().url(),
  index: z.string().default("code_chunks"),
  auth: z.object({
    username: z.string(),
    password: z.string(),
  }).optional(),
});

export const OpenAIEmbeddingConfigSchema = z.object({
  apiKey: z.string(),
  baseUrl: z.string().url().default("https://api.openai.com/v1"),
  model: z.string().default("text-embedding-ada-002"),
  dimension: z.number().default(1536),
  batchSize: z.number().default(100),
});

export const AzureEmbeddingConfigSchema = z.object({
  apiKey: z.string(),
  endpoint: z.string().url(),
  deployment: z.string(),
  apiVersion: z.string().default("2024-02-15-preview"),
  dimension: z.number().default(1536),
  batchSize: z.number().default(100),
});

export const LocalEmbeddingConfigSchema = z.object({
  model: z.string().default("Xenova/all-MiniLM-L6-v2"),
  localModelPath: z.string().optional(),
  dimension: z.number().default(384),
  batchSize: z.number().default(32),
  cacheDir: z.string().default("./.model-cache"),
});

export const EmbeddingConfigSchema = z.object({
  provider: z.enum(["openai", "azure", "local"]).default("openai"),
  openai: OpenAIEmbeddingConfigSchema.optional(),
  azure: AzureEmbeddingConfigSchema.optional(),
  local: LocalEmbeddingConfigSchema.optional(),
});

export const RepoOverrideSchema = z.object({
  microservice: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const RepositoriesConfigSchema = z.object({
  rootDir: z.string(),
  include: z.array(z.string()).default(["*"]),
  exclude: z.array(z.string()).default([]),
  overrides: z.record(z.string(), RepoOverrideSchema).default({}),
});

export const FilesConfigSchema = z.object({
  include: z.array(z.string()).default(["src/**/*"]),
  exclude: z.array(z.string()).default(["**/node_modules/**"]),
});

export const ChunkingConfigSchema = z.object({
  maxTokens: z.number().default(1000),
  overlap: z.number().default(100),
});

export const ServerConfigSchema = z.object({
  rest: z.object({
    port: z.coerce.number().default(3000),
    enabled: z.boolean().default(true),
  }),
  mcp: z.object({
    enabled: z.boolean().default(true),
  }),
});

export const RagProviderConfigSchema = z.object({
  apiKey: z.string().default(""),
  baseUrl: z.string().optional(),
});

export const RagConfigSchema = z.object({
  provider: z.enum(["ollama", "openai-compatible", "openrouter", "openai"]).default("ollama"),
  model: z.string().default("llama3.2"),
  maxTokens: z.number().default(4096),
  topK: z.number().default(10),
  minScore: z.number().default(0.5),
  ollama: RagProviderConfigSchema.optional(),
  "openai-compatible": RagProviderConfigSchema.optional(),
  openrouter: RagProviderConfigSchema.optional(),
  openai: RagProviderConfigSchema.optional(),
});

export const AppConfigSchema = z.object({
  opensearch: OpenSearchConfigSchema,
  embedding: EmbeddingConfigSchema,
  repositories: RepositoriesConfigSchema,
  files: FilesConfigSchema,
  chunking: ChunkingConfigSchema,
  server: ServerConfigSchema,
  rag: RagConfigSchema.optional(),
});

export type OpenSearchConfig = z.infer<typeof OpenSearchConfigSchema>;
export type OpenAIEmbeddingConfig = z.infer<typeof OpenAIEmbeddingConfigSchema>;
export type AzureEmbeddingConfig = z.infer<typeof AzureEmbeddingConfigSchema>;
export type LocalEmbeddingConfig = z.infer<typeof LocalEmbeddingConfigSchema>;
export type EmbeddingConfig = z.infer<typeof EmbeddingConfigSchema>;
export type RepoOverride = z.infer<typeof RepoOverrideSchema>;
export type RepositoriesConfig = z.infer<typeof RepositoriesConfigSchema>;
export type FilesConfig = z.infer<typeof FilesConfigSchema>;
export type ChunkingConfig = z.infer<typeof ChunkingConfigSchema>;
export type ServerConfig = z.infer<typeof ServerConfigSchema>;
export type RagProviderConfig = z.infer<typeof RagProviderConfigSchema>;
export type RagConfig = z.infer<typeof RagConfigSchema>;
export type AppConfig = z.infer<typeof AppConfigSchema>;
