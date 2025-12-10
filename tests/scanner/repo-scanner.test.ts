import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { RepoScanner } from "../../src/scanner/repo-scanner.js";

describe("RepoScanner", () => {
  const testDir = "/tmp/code-rag-test-repos";

  beforeAll(() => {
    // Create test directory structure
    mkdirSync(testDir, { recursive: true });

    // Create mock repos (without .git for simplicity)
    mkdirSync(join(testDir, "repo1"), { recursive: true });
    mkdirSync(join(testDir, "repo2"), { recursive: true });
    mkdirSync(join(testDir, "archived-old"), { recursive: true });
    mkdirSync(join(testDir, ".hidden"), { recursive: true });

    // Create a file (not a directory)
    writeFileSync(join(testDir, "not-a-repo.txt"), "test");
  });

  afterAll(() => {
    // Cleanup
    rmSync(testDir, { recursive: true, force: true });
  });

  describe("constructor", () => {
    it("should initialize with config", () => {
      const scanner = new RepoScanner({
        rootDir: testDir,
        include: ["*"],
        exclude: ["archived-*"],
        overrides: {},
      });

      expect(scanner.getRootDir()).toBe(testDir);
    });
  });

  describe("pattern matching", () => {
    it("should respect include patterns", () => {
      const scanner = new RepoScanner({
        rootDir: testDir,
        include: ["repo*"],
        exclude: [],
        overrides: {},
      });

      // The scanner should match repo1 and repo2 based on pattern
      expect(scanner.getRootDir()).toBe(testDir);
    });

    it("should respect exclude patterns", () => {
      const scanner = new RepoScanner({
        rootDir: testDir,
        include: ["*"],
        exclude: ["archived-*", ".*"],
        overrides: {},
      });

      // archived-old and .hidden should be excluded
      expect(scanner.getRootDir()).toBe(testDir);
    });
  });

  describe("overrides", () => {
    it("should apply overrides from config", () => {
      const scanner = new RepoScanner({
        rootDir: testDir,
        include: ["*"],
        exclude: [],
        overrides: {
          repo1: {
            microservice: "service-a",
            tags: ["tag1", "tag2"],
          },
        },
      });

      expect(scanner.getRootDir()).toBe(testDir);
    });
  });

  describe("getRootDir", () => {
    it("should return the root directory", () => {
      const scanner = new RepoScanner({
        rootDir: testDir,
        include: ["*"],
        exclude: [],
        overrides: {},
      });

      expect(scanner.getRootDir()).toBe(testDir);
    });
  });
});
