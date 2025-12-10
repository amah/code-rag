import { describe, it, expect } from "bun:test";
import { SqlParser } from "../../src/parser/parsers/sql-parser.js";
import { sampleCode } from "../setup.js";

describe("SqlParser", () => {
  const parser = new SqlParser();

  it("should have correct language", () => {
    expect(parser.language).toBe("sql");
  });

  it("should parse CREATE TABLE statements", async () => {
    const sql = `
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL
);
`.trim();

    const symbols = await parser.parse(sql, "schema.sql");

    expect(symbols.length).toBeGreaterThan(0);
    expect(symbols[0].type).toBe("block");
    expect(symbols[0].name).toContain("CREATE TABLE");
  });

  it("should parse multiple SQL statements", async () => {
    const symbols = await parser.parse(sampleCode.sql, "schema.sql");

    // Should have multiple statements
    expect(symbols.length).toBeGreaterThanOrEqual(3);

    // Check that statements are identified
    const names = symbols.map((s) => s.name);
    expect(names.some((n) => n?.includes("CREATE TABLE"))).toBe(true);
    expect(names.some((n) => n?.includes("INSERT"))).toBe(true);
  });

  it("should track line numbers", async () => {
    const sql = `
CREATE TABLE test (id INT);

INSERT INTO test VALUES (1);
`.trim();

    const symbols = await parser.parse(sql, "test.sql");

    expect(symbols.length).toBe(2);
    expect(symbols[0].startLine).toBe(1);
    expect(symbols[1].startLine).toBeGreaterThan(symbols[0].endLine);
  });

  it("should handle comments", async () => {
    const sql = `
-- This is a comment
CREATE TABLE test (
    id INT -- inline comment
);

/* Block comment */
INSERT INTO test VALUES (1);
`.trim();

    const symbols = await parser.parse(sql, "test.sql");

    expect(symbols.length).toBeGreaterThanOrEqual(2);
  });

  it("should handle empty input", async () => {
    const symbols = await parser.parse("", "empty.sql");
    expect(symbols.length).toBe(0);
  });

  it("should handle whitespace-only input", async () => {
    const symbols = await parser.parse("   \n\n   ", "whitespace.sql");
    expect(symbols.length).toBe(0);
  });
});
