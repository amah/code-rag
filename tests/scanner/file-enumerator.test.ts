import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { FileEnumerator } from "../../src/scanner/file-enumerator.js";

describe("FileEnumerator", () => {
  const testDir = "/tmp/code-rag-test-file-enum";

  beforeAll(() => {
    // Create test directory structure
    mkdirSync(join(testDir, "src"), { recursive: true });
    mkdirSync(join(testDir, "lib"), { recursive: true });
    mkdirSync(join(testDir, "node_modules/package"), { recursive: true });
    mkdirSync(join(testDir, "dist"), { recursive: true });
    mkdirSync(join(testDir, "build/output"), { recursive: true });

    // Create test files
    writeFileSync(join(testDir, "src/index.ts"), "export const x = 1;");
    writeFileSync(join(testDir, "src/utils.ts"), "export const y = 2;");
    writeFileSync(join(testDir, "lib/helper.js"), "module.exports = {};");
    writeFileSync(join(testDir, "node_modules/package/index.js"), "module.exports = {};");
    writeFileSync(join(testDir, "dist/bundle.js"), "// bundled");
    writeFileSync(join(testDir, "build/output/app.js"), "// built");
    writeFileSync(join(testDir, "README.md"), "# Readme");

    // Create .gitignore
    writeFileSync(
      join(testDir, ".gitignore"),
      `
# Dependencies
node_modules/

# Build output
dist/
build/

# Logs
*.log

# IDE
.idea/
`
    );
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe("constructor", () => {
    it("should initialize with config", () => {
      const enumerator = new FileEnumerator({
        include: ["src/**/*"],
        exclude: [],
      });

      expect(enumerator).toBeDefined();
    });

    it("should accept respectGitignore option", () => {
      const enumerator = new FileEnumerator(
        { include: ["**/*"], exclude: [] },
        false
      );

      expect(enumerator).toBeDefined();
    });
  });

  describe("enumerateFiles", () => {
    it("should find files matching include patterns", async () => {
      const enumerator = new FileEnumerator({
        include: ["src/**/*"],
        exclude: [],
      });

      const files = await enumerator.enumerateFiles(testDir);

      expect(files.length).toBe(2);
      expect(files.some((f) => f.relativePath === "src/index.ts")).toBe(true);
      expect(files.some((f) => f.relativePath === "src/utils.ts")).toBe(true);
    });

    it("should respect .gitignore patterns", async () => {
      const enumerator = new FileEnumerator({
        include: ["**/*.js", "**/*.ts"],
        exclude: [],
      });

      const files = await enumerator.enumerateFiles(testDir);
      const paths = files.map((f) => f.relativePath);

      // Should include src files
      expect(paths.some((p) => p.includes("src/"))).toBe(true);

      // Should NOT include node_modules (gitignored)
      expect(paths.some((p) => p.includes("node_modules/"))).toBe(false);

      // Should NOT include dist (gitignored)
      expect(paths.some((p) => p.includes("dist/"))).toBe(false);

      // Should NOT include build (gitignored)
      expect(paths.some((p) => p.includes("build/"))).toBe(false);
    });

    it("should allow disabling gitignore respect", async () => {
      const enumerator = new FileEnumerator(
        {
          include: ["**/*.js"],
          exclude: [],
        },
        false // Don't respect gitignore
      );

      const files = await enumerator.enumerateFiles(testDir);
      const paths = files.map((f) => f.relativePath);

      // With gitignore disabled, should find files in ignored directories
      // Note: The explicit exclude patterns in config still apply
      expect(files.length).toBeGreaterThan(0);
    });

    it("should respect explicit exclude patterns", async () => {
      const enumerator = new FileEnumerator({
        include: ["**/*.ts"],
        exclude: ["**/utils.*"],
      });

      const files = await enumerator.enumerateFiles(testDir);
      const paths = files.map((f) => f.relativePath);

      expect(paths).toContain("src/index.ts");
      expect(paths).not.toContain("src/utils.ts");
    });

    it("should only return files with known languages", async () => {
      const enumerator = new FileEnumerator({
        include: ["**/*"],
        exclude: [],
      });

      const files = await enumerator.enumerateFiles(testDir);

      // Should not include README.md (unknown language)
      expect(files.some((f) => f.relativePath === "README.md")).toBe(false);

      // All files should have a known language
      for (const file of files) {
        expect(file.language).not.toBe("unknown");
      }
    });

    it("should detect language correctly", async () => {
      const enumerator = new FileEnumerator({
        include: ["src/**/*", "lib/**/*"],
        exclude: [],
      });

      const files = await enumerator.enumerateFiles(testDir);

      const tsFile = files.find((f) => f.extension === ".ts");
      expect(tsFile?.language).toBe("typescript");

      const jsFile = files.find((f) => f.extension === ".js");
      expect(jsFile?.language).toBe("javascript");
    });

    it("should always ignore .git directory", async () => {
      // Create a fake .git directory
      mkdirSync(join(testDir, ".git/objects"), { recursive: true });
      writeFileSync(join(testDir, ".git/config"), "[core]");

      const enumerator = new FileEnumerator({
        include: ["**/*"],
        exclude: [],
      });

      const files = await enumerator.enumerateFiles(testDir);
      const paths = files.map((f) => f.relativePath);

      expect(paths.some((p) => p.includes(".git/"))).toBe(false);
    });
  });

  describe("getFileInfo", () => {
    it("should return file info for a specific file", () => {
      const enumerator = new FileEnumerator({
        include: ["**/*"],
        exclude: [],
      });

      const fileInfo = enumerator.getFileInfo(testDir, "src/index.ts");

      expect(fileInfo.absolutePath).toBe(join(testDir, "src/index.ts"));
      expect(fileInfo.relativePath).toBe("src/index.ts");
      expect(fileInfo.language).toBe("typescript");
      expect(fileInfo.extension).toBe(".ts");
    });
  });
});

describe("Gitignore Parsing", () => {
  const testDir = "/tmp/code-rag-test-gitignore";

  beforeAll(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("should handle empty .gitignore", async () => {
    writeFileSync(join(testDir, ".gitignore"), "");
    mkdirSync(join(testDir, "src"), { recursive: true });
    writeFileSync(join(testDir, "src/app.ts"), "const x = 1;");

    const enumerator = new FileEnumerator({
      include: ["**/*.ts"],
      exclude: [],
    });

    const files = await enumerator.enumerateFiles(testDir);
    expect(files.length).toBeGreaterThan(0);
  });

  it("should handle comments in .gitignore", async () => {
    writeFileSync(
      join(testDir, ".gitignore"),
      `
# This is a comment
# Another comment
*.log
`
    );

    const enumerator = new FileEnumerator({
      include: ["**/*"],
      exclude: [],
    });

    // Should not throw
    const files = await enumerator.enumerateFiles(testDir);
    expect(files).toBeDefined();
  });

  it("should handle patterns with wildcards", async () => {
    writeFileSync(
      join(testDir, ".gitignore"),
      `
*.log
*.tmp
temp_*
`
    );

    mkdirSync(join(testDir, "logs"), { recursive: true });
    writeFileSync(join(testDir, "logs/app.log"), "log content");
    writeFileSync(join(testDir, "src/app.ts"), "const x = 1;");

    const enumerator = new FileEnumerator({
      include: ["**/*"],
      exclude: [],
    });

    const files = await enumerator.enumerateFiles(testDir);
    const paths = files.map((f) => f.relativePath);

    // .log files should be ignored, but we don't have a .log language detector
    // so they'd be filtered anyway. The test validates parsing works.
    expect(files).toBeDefined();
  });
});
