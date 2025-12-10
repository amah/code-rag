import type { SearchService } from "../../search/search-service.js";

export const getRepositoryStatsTool = {
  name: "get_repository_stats",
  description:
    "Get statistics about indexed code chunks for a specific repository. Shows total chunks, breakdown by language and symbol type.",
  inputSchema: {
    type: "object" as const,
    properties: {
      repo: {
        type: "string",
        description: "Repository name to get statistics for",
      },
    },
    required: ["repo"],
  },
};

export async function handleGetRepositoryStats(
  searchService: SearchService,
  args: { repo: string }
): Promise<string> {
  const stats = await searchService.getRepositoryStats(args.repo);

  if (stats.total_chunks === 0) {
    return `Repository '${args.repo}' has no indexed chunks. It may not exist or hasn't been indexed yet.`;
  }

  let output = `Repository: ${stats.repo}\n`;
  output += `Total chunks: ${stats.total_chunks}\n\n`;

  output += `By language:\n`;
  for (const [lang, count] of Object.entries(stats.by_language)) {
    output += `  - ${lang}: ${count}\n`;
  }

  output += `\nBy symbol type:\n`;
  for (const [type, count] of Object.entries(stats.by_symbol_type)) {
    output += `  - ${type}: ${count}\n`;
  }

  return output;
}
