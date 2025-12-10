import { describe, it, expect } from "bun:test";
import { truncateToTokenLimit } from "../../src/embeddings/providers/base-provider.js";

describe("Embedding Provider Utilities", () => {
  describe("truncateToTokenLimit", () => {
    it("should not truncate text under the limit", () => {
      const text = "Short text";
      const result = truncateToTokenLimit(text, 100);

      expect(result).toBe(text);
    });

    it("should truncate text over the limit", () => {
      const text = "A".repeat(1000);
      const maxTokens = 100;
      const expectedMaxChars = maxTokens * 4;

      const result = truncateToTokenLimit(text, maxTokens);

      expect(result.length).toBe(expectedMaxChars);
    });

    it("should handle empty text", () => {
      const result = truncateToTokenLimit("", 100);
      expect(result).toBe("");
    });

    it("should handle exact limit", () => {
      const maxTokens = 10;
      const text = "A".repeat(maxTokens * 4);

      const result = truncateToTokenLimit(text, maxTokens);

      expect(result).toBe(text);
    });

    it("should handle text just over limit", () => {
      const maxTokens = 10;
      const maxChars = maxTokens * 4;
      const text = "A".repeat(maxChars + 1);

      const result = truncateToTokenLimit(text, maxTokens);

      expect(result.length).toBe(maxChars);
    });

    it("should preserve text content when truncating", () => {
      const text = "ABCDEFGHIJ" + "X".repeat(100);
      const result = truncateToTokenLimit(text, 5); // 20 chars max

      expect(result).toBe("ABCDEFGHIJXXXXXXXXXX");
    });
  });
});
