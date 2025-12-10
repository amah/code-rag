import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import YAML from "yaml";
import { AppConfigSchema, type AppConfig } from "./schema.js";

/**
 * Expands environment variable placeholders in a string.
 * Supports: ${VAR}, ${VAR:-default}
 */
function expandEnvVars(value: string): string {
  return value.replace(/\$\{([^}]+)\}/g, (_, expr) => {
    const [varName, defaultValue] = expr.split(":-");
    return process.env[varName] ?? defaultValue ?? "";
  });
}

/**
 * Recursively expands environment variables in an object.
 */
function expandEnvVarsInObject(obj: unknown): unknown {
  if (typeof obj === "string") {
    return expandEnvVars(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(expandEnvVarsInObject);
  }
  if (obj !== null && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = expandEnvVarsInObject(value);
    }
    return result;
  }
  return obj;
}

/**
 * Loads configuration from YAML file and environment variables.
 */
export function loadConfig(configPath?: string): AppConfig {
  // Determine config file path
  const defaultConfigPath = resolve(process.cwd(), "config", "default.yaml");
  const finalConfigPath = configPath ?? defaultConfigPath;

  if (!existsSync(finalConfigPath)) {
    throw new Error(`Configuration file not found: ${finalConfigPath}`);
  }

  // Read and parse YAML
  const yamlContent = readFileSync(finalConfigPath, "utf-8");
  const rawConfig = YAML.parse(yamlContent);

  // Expand environment variables
  const expandedConfig = expandEnvVarsInObject(rawConfig);

  // Validate and return
  const result = AppConfigSchema.safeParse(expandedConfig);
  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `  - ${e.path.join(".")}: ${e.message}`)
      .join("\n");
    throw new Error(`Invalid configuration:\n${errors}`);
  }

  return result.data;
}

/**
 * Gets the embedding dimension based on the configured provider.
 */
export function getEmbeddingDimension(config: AppConfig): number {
  const { provider, openai, azure, local } = config.embedding;

  switch (provider) {
    case "openai":
      return openai?.dimension ?? 1536;
    case "azure":
      return azure?.dimension ?? 1536;
    case "local":
      return local?.dimension ?? 384;
    default:
      throw new Error(`Unknown embedding provider: ${provider}`);
  }
}

// Singleton config instance
let configInstance: AppConfig | null = null;

/**
 * Gets or loads the application configuration.
 */
export function getConfig(configPath?: string): AppConfig {
  if (!configInstance) {
    configInstance = loadConfig(configPath);
  }
  return configInstance;
}

/**
 * Resets the configuration instance (useful for testing).
 */
export function resetConfig(): void {
  configInstance = null;
}

export * from "./schema.js";
