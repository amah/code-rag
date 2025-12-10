import type { SearchService } from "../../search/search-service.js";

export const getFileChunksTool = {
  name: "get_file_chunks",
  description:
    "Retrieve all indexed code chunks from a specific file. Use this to see all the functions, classes, and methods that were extracted from a particular file.",
  inputSchema: {
    type: "object" as const,
    properties: {
      repo: {
        type: "string",
        description: "Repository name",
      },
      path: {
        type: "string",
        description: "File path relative to repository root (e.g., 'src/services/payment.ts')",
      },
    },
    required: ["repo", "path"],
  },
};

export async function handleGetFileChunks(
  searchService: SearchService,
  args: { repo: string; path: string }
): Promise<string> {
  const chunks = await searchService.getFileChunks(args.repo, args.path);

  if (chunks.length === 0) {
    return `No chunks found for file '${args.path}' in repository '${args.repo}'. The file may not exist or wasn't indexed.`;
  }

  let output = `File: ${args.repo}/${args.path}\n`;
  output += `Total chunks: ${chunks.length}\n\n`;

  for (const chunk of chunks) {
    output += `--- ${chunk.symbol_type}`;
    if (chunk.symbol_name) output += `: ${chunk.symbol_name}`;
    output += ` (lines ${chunk.start_line}-${chunk.end_line}) ---\n`;
    if (chunk.signature) output += `Signature: ${chunk.signature}\n`;
    output += `\`\`\`${chunk.language}\n${chunk.text}\n\`\`\`\n\n`;
  }

  return output;
}
