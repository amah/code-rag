import type { SearchService } from "../../search/search-service.js";

export const listRepositoriesTool = {
  name: "list_repositories",
  description:
    "List all repositories that have been indexed in the code search system. Use this to discover what codebases are available for searching.",
  inputSchema: {
    type: "object" as const,
    properties: {},
    required: [],
  },
};

export async function handleListRepositories(
  searchService: SearchService
): Promise<string> {
  const repos = await searchService.listRepositories();

  if (repos.length === 0) {
    return "No repositories have been indexed yet. Run the ingestion pipeline to index code.";
  }

  return `Indexed repositories (${repos.length}):\n${repos.map((r) => `  - ${r}`).join("\n")}`;
}
