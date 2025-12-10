import { describe, it, expect } from "bun:test";
import {
  getLines,
  getTextBetweenLines,
  countLines,
  getLineFromOffset,
} from "../../src/parser/parsers/base-parser.js";

describe("Base Parser Utilities", () => {
  describe("getLines", () => {
    it("should split content into lines", () => {
      const content = "line1\nline2\nline3";
      const lines = getLines(content);

      expect(lines).toEqual(["line1", "line2", "line3"]);
    });

    it("should handle empty content", () => {
      const lines = getLines("");
      expect(lines).toEqual([""]);
    });

    it("should handle single line", () => {
      const lines = getLines("single line");
      expect(lines).toEqual(["single line"]);
    });

    it("should handle trailing newline", () => {
      const lines = getLines("line1\nline2\n");
      expect(lines).toEqual(["line1", "line2", ""]);
    });
  });

  describe("getTextBetweenLines", () => {
    const content = "line1\nline2\nline3\nline4\nline5";

    it("should extract text between line numbers (1-indexed)", () => {
      const text = getTextBetweenLines(content, 2, 4);
      expect(text).toBe("line2\nline3\nline4");
    });

    it("should handle single line extraction", () => {
      const text = getTextBetweenLines(content, 3, 3);
      expect(text).toBe("line3");
    });

    it("should handle first line", () => {
      const text = getTextBetweenLines(content, 1, 1);
      expect(text).toBe("line1");
    });

    it("should handle last line", () => {
      const text = getTextBetweenLines(content, 5, 5);
      expect(text).toBe("line5");
    });

    it("should handle full content", () => {
      const text = getTextBetweenLines(content, 1, 5);
      expect(text).toBe(content);
    });
  });

  describe("countLines", () => {
    it("should count lines in text", () => {
      expect(countLines("line1\nline2\nline3")).toBe(3);
    });

    it("should return 1 for single line", () => {
      expect(countLines("single line")).toBe(1);
    });

    it("should return 1 for empty string", () => {
      expect(countLines("")).toBe(1);
    });

    it("should count trailing newline as extra line", () => {
      expect(countLines("line1\nline2\n")).toBe(3);
    });
  });

  describe("getLineFromOffset", () => {
    const content = "abc\ndef\nghi";
    // Offsets: a=0, b=1, c=2, \n=3, d=4, e=5, f=6, \n=7, g=8, h=9, i=10

    it("should return correct line number for offset", () => {
      expect(getLineFromOffset(content, 0)).toBe(1); // 'a'
      expect(getLineFromOffset(content, 2)).toBe(1); // 'c'
      expect(getLineFromOffset(content, 4)).toBe(2); // 'd'
      expect(getLineFromOffset(content, 8)).toBe(3); // 'g'
    });

    it("should handle offset at newline", () => {
      expect(getLineFromOffset(content, 3)).toBe(1); // first \n
      expect(getLineFromOffset(content, 7)).toBe(2); // second \n
    });

    it("should handle offset 0", () => {
      expect(getLineFromOffset(content, 0)).toBe(1);
    });
  });
});
