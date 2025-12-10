import { describe, it, expect } from "bun:test";
import { ConfigParser, YamlParser, JsonParser } from "../../src/parser/parsers/config-parser.js";
import { sampleCode } from "../setup.js";

describe("ConfigParser", () => {
  const parser = new ConfigParser();

  describe("YAML parsing", () => {
    it("should parse YAML files", async () => {
      const symbols = await parser.parse(sampleCode.yaml, "config.yaml");

      expect(symbols.length).toBeGreaterThan(0);
      symbols.forEach((s) => {
        expect(s.type).toBe("block");
        expect(s.startLine).toBeGreaterThanOrEqual(1);
        expect(s.endLine).toBeGreaterThanOrEqual(s.startLine);
      });
    });

    it("should handle large YAML with multiple top-level keys", async () => {
      const yaml = `
database:
  host: localhost
  port: 5432

server:
  port: 3000

cache:
  enabled: true

logging:
  level: info
`.trim();

      const symbols = await parser.parse(yaml, "config.yaml");

      // Should chunk by top-level keys for larger configs
      expect(symbols.length).toBeGreaterThanOrEqual(1);
    });

    it("should handle invalid YAML gracefully", async () => {
      const invalidYaml = `
key: value
  invalid indentation
another: key
`.trim();

      const symbols = await parser.parse(invalidYaml, "invalid.yaml");

      // Should still return something (fallback to block)
      expect(symbols.length).toBeGreaterThanOrEqual(1);
      expect(symbols[0].type).toBe("block");
    });
  });

  describe("JSON parsing", () => {
    it("should parse JSON files", async () => {
      const symbols = await parser.parse(sampleCode.json, "package.json");

      expect(symbols.length).toBeGreaterThan(0);
      expect(symbols[0].type).toBe("block");
    });

    it("should handle invalid JSON gracefully", async () => {
      const invalidJson = `{ "key": "value", }`;

      const symbols = await parser.parse(invalidJson, "invalid.json");

      // Should still return something (fallback to block)
      expect(symbols.length).toBeGreaterThanOrEqual(1);
    });

    it("should handle JSON arrays", async () => {
      const jsonArray = `[1, 2, 3, "test"]`;

      const symbols = await parser.parse(jsonArray, "array.json");

      expect(symbols.length).toBe(1);
      expect(symbols[0].type).toBe("block");
    });
  });
});

describe("YamlParser", () => {
  const parser = new YamlParser();

  it("should have correct language", () => {
    expect(parser.language).toBe("yaml");
  });
});

describe("JsonParser", () => {
  const parser = new JsonParser();

  it("should have correct language", () => {
    expect(parser.language).toBe("json");
  });
});
