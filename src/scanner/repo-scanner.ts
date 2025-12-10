import { readdirSync, statSync } from "fs";
import { join, resolve } from "path";
import simpleGit, { type SimpleGit } from "simple-git";
import type { RepositoriesConfig } from "../config/schema.js";
import type { Repository } from "../models/types.js";

/**
 * Simple minimatch-like pattern matching
 */
function matchPattern(str: string, pattern: string): boolean {
  // Convert glob pattern to regex
  const regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&") // Escape special regex chars
    .replace(/\*/g, ".*") // * matches anything
    .replace(/\?/g, "."); // ? matches single char

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(str);
}

/**
 * Scans a root directory for Git repositories
 */
export class RepoScanner {
  private rootDir: string;
  private includePatterns: string[];
  private excludePatterns: string[];
  private overrides: Record<string, { microservice?: string; tags?: string[] }>;

  constructor(config: RepositoriesConfig) {
    this.rootDir = resolve(config.rootDir);
    this.includePatterns = config.include;
    this.excludePatterns = config.exclude;
    this.overrides = config.overrides;
  }

  /**
   * Discovers all repositories in the root directory
   */
  async discoverRepositories(): Promise<Repository[]> {
    const repos: Repository[] = [];

    // List all directories in root
    const entries = readdirSync(this.rootDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const dirName = entry.name;

      // Check include/exclude patterns
      if (!this.matchesPatterns(dirName)) continue;

      const repoPath = join(this.rootDir, dirName);

      // Check if it's a git repo
      if (!this.isGitRepo(repoPath)) {
        console.log(`Skipping ${dirName}: not a git repository`);
        continue;
      }

      try {
        const repoInfo = await this.getRepoInfo(repoPath, dirName);
        repos.push(repoInfo);
      } catch (error) {
        console.error(`Error scanning ${dirName}:`, error);
      }
    }

    return repos;
  }

  /**
   * Gets information for a single repository
   */
  async getRepository(repoName: string): Promise<Repository | null> {
    const repoPath = join(this.rootDir, repoName);

    if (!this.isGitRepo(repoPath)) {
      return null;
    }

    try {
      return await this.getRepoInfo(repoPath, repoName);
    } catch {
      return null;
    }
  }

  /**
   * Checks if a directory name matches include/exclude patterns
   */
  private matchesPatterns(dirName: string): boolean {
    // Check exclude patterns first
    for (const pattern of this.excludePatterns) {
      if (matchPattern(dirName, pattern)) {
        return false;
      }
    }

    // Check include patterns
    for (const pattern of this.includePatterns) {
      if (matchPattern(dirName, pattern)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Checks if a directory is a git repository
   */
  private isGitRepo(dirPath: string): boolean {
    try {
      const gitPath = join(dirPath, ".git");
      return statSync(gitPath).isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Gets repository information using git
   */
  private async getRepoInfo(
    repoPath: string,
    repoName: string
  ): Promise<Repository> {
    const git: SimpleGit = simpleGit(repoPath);

    // Get current branch
    const branchResult = await git.branch();
    const branch = branchResult.current || "main";

    // Get current commit
    const commitResult = await git.revparse(["HEAD"]);
    const commit = commitResult.trim();

    // Get overrides for this repo
    const override = this.overrides[repoName] || {};

    return {
      name: repoName,
      path: repoPath,
      branch,
      commit,
      microservice: override.microservice,
      tags: override.tags,
    };
  }

  /**
   * Gets the root directory path
   */
  getRootDir(): string {
    return this.rootDir;
  }
}
