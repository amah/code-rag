import { glob } from "glob";
import { join, extname } from "path";
import { readFileSync, existsSync } from "fs";
import type { FilesConfig } from "../config/schema.js";
import type { FileInfo } from "../models/types.js";
import { detectLanguage } from "../parser/language-detector.js";

/**
 * Parses a .gitignore file and returns an array of ignore patterns
 */
function parseGitignore(gitignorePath: string): string[] {
  if (!existsSync(gitignorePath)) {
    return [];
  }

  try {
    const content = readFileSync(gitignorePath, "utf-8");
    const patterns: string[] = [];

    for (const line of content.split("\n")) {
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      // Convert gitignore pattern to glob pattern
      let pattern = trimmed;

      // Handle negation (we'll skip negated patterns for simplicity)
      if (pattern.startsWith("!")) {
        continue;
      }

      // Handle directory-only patterns (ending with /)
      if (pattern.endsWith("/")) {
        pattern = pattern.slice(0, -1);
        patterns.push(`**/${pattern}/**`);
        patterns.push(`${pattern}/**`);
      } else {
        // Handle patterns that should match anywhere
        if (!pattern.startsWith("/") && !pattern.includes("/")) {
          // Pattern like "*.log" or "node_modules" should match anywhere
          patterns.push(`**/${pattern}`);
          patterns.push(`**/${pattern}/**`);
        } else if (pattern.startsWith("/")) {
          // Pattern starting with / is relative to repo root
          pattern = pattern.slice(1);
          patterns.push(pattern);
          patterns.push(`${pattern}/**`);
        } else {
          // Pattern with / in it (like "build/output")
          patterns.push(pattern);
          patterns.push(`**/${pattern}`);
          patterns.push(`${pattern}/**`);
          patterns.push(`**/${pattern}/**`);
        }
      }
    }

    return patterns;
  } catch (error) {
    console.warn(`Warning: Could not parse .gitignore at ${gitignorePath}:`, error);
    return [];
  }
}

/**
 * Enumerates files in a repository based on include/exclude patterns
 * Respects .gitignore files
 */
export class FileEnumerator {
  private includePatterns: string[];
  private excludePatterns: string[];
  private respectGitignore: boolean;

  constructor(config: FilesConfig, respectGitignore = true) {
    this.includePatterns = config.include;
    this.excludePatterns = config.exclude;
    this.respectGitignore = respectGitignore;
  }

  /**
   * Enumerates all matching files in a repository
   * Automatically excludes files matching .gitignore patterns
   */
  async enumerateFiles(repoPath: string): Promise<FileInfo[]> {
    const files: FileInfo[] = [];

    // Build ignore patterns
    let ignorePatterns = [...this.excludePatterns];

    // Add .gitignore patterns if enabled
    if (this.respectGitignore) {
      const gitignorePath = join(repoPath, ".gitignore");
      const gitignorePatterns = parseGitignore(gitignorePath);
      ignorePatterns = [...ignorePatterns, ...gitignorePatterns];
    }

    // Always ignore .git directory
    if (!ignorePatterns.includes("**/.git/**")) {
      ignorePatterns.push("**/.git/**");
    }

    for (const pattern of this.includePatterns) {
      const matches = await glob(pattern, {
        cwd: repoPath,
        nodir: true,
        ignore: ignorePatterns,
        absolute: false,
        dot: false, // Don't match dotfiles by default
      });

      for (const relativePath of matches) {
        const absolutePath = join(repoPath, relativePath);
        const extension = extname(relativePath).toLowerCase();
        const language = detectLanguage(extension);

        // Skip unknown languages
        if (language === "unknown") continue;

        // Avoid duplicates
        if (files.some((f) => f.absolutePath === absolutePath)) continue;

        files.push({
          absolutePath,
          relativePath,
          language,
          extension,
        });
      }
    }

    return files;
  }

  /**
   * Gets file info for a specific file
   */
  getFileInfo(repoPath: string, relativePath: string): FileInfo {
    const absolutePath = join(repoPath, relativePath);
    const extension = extname(relativePath).toLowerCase();
    const language = detectLanguage(extension);

    return {
      absolutePath,
      relativePath,
      language,
      extension,
    };
  }

  /**
   * Checks if a file should be ignored based on .gitignore
   */
  isIgnored(repoPath: string, relativePath: string): boolean {
    if (!this.respectGitignore) {
      return false;
    }

    const gitignorePath = join(repoPath, ".gitignore");
    const patterns = parseGitignore(gitignorePath);

    for (const pattern of patterns) {
      // Simple pattern matching
      if (this.matchesPattern(relativePath, pattern)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Simple glob pattern matching
   */
  private matchesPattern(path: string, pattern: string): boolean {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*\*/g, "{{GLOBSTAR}}")
      .replace(/\*/g, "[^/]*")
      .replace(/\{\{GLOBSTAR\}\}/g, ".*")
      .replace(/\?/g, ".");

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }
}
