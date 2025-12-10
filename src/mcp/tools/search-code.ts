import type { SearchService } from "../../search/search-service.js";

export const searchCodeTool = {
  name: "search_code",
  description:
    "Search indexed source code using semantic search. Returns relevant code chunks with file paths, line numbers, and context. Use this to find code implementations, functions, classes, or any code related to a query.",
  inputSchema: {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description:
          "Natural language or code-like search query. Examples: 'payment validation logic', 'function that calculates interest', 'class that handles user authentication'",
      },
      top_k: {
        type: "number",
        description: "Number of results to return (default: 10, max: 50)",
      },
      filters: {
        type: "object",
        description: "Optional filters to narrow down search results",
        properties: {
          repo: {
            type: "string",
            description: "Filter by repository name",
          },
          language: {
            type: "string",
            description:
              "Filter by programming language (e.g., java, typescript, python)",
          },
          microservice: {
            type: "string",
            description: "Filter by microservice name",
          },
          symbol_type: {
            type: "string",
            enum: ["class", "interface", "enum", "function", "method", "block"],
            description: "Filter by symbol type",
          },
        },
      },
    },
    required: ["query"],
  },
};

export async function handleSearchCode(
  searchService: SearchService,
  args: {
    query: string;
    top_k?: number;
    filters?: {
      repo?: string;
      language?: string;
      microservice?: string;
      symbol_type?: string;
    };
  }
): Promise<string> {
  const result = await searchService.search({
    query: args.query,
    top_k: Math.min(args.top_k ?? 10, 50),
    filters: args.filters as any,
  });

  if (result.results.length === 0) {
    return "No matching code found for the query.";
  }

  // Format results for LLM consumption
  const formattedResults = result.results.map((r, i) => {
    let output = `\n--- Result ${i + 1} (score: ${r.score.toFixed(3)}) ---\n`;
    output += `Repository: ${r.repo}\n`;
    output += `File: ${r.path}:${r.start_line}-${r.end_line}\n`;
    output += `Language: ${r.language}\n`;
    output += `Type: ${r.symbol_type}`;
    if (r.symbol_name) output += ` (${r.symbol_name})`;
    output += "\n";
    if (r.signature) output += `Signature: ${r.signature}\n`;
    output += `\nCode:\n\`\`\`${r.language}\n${r.text}\n\`\`\``;
    return output;
  });

  return `Found ${result.results.length} results (search took ${result.took_ms}ms):${formattedResults.join("\n")}`;
}
