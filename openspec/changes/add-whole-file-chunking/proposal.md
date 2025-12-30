# Change: Add Whole File Chunking Mode

## Why
Currently, the system always parses files into semantic chunks (classes, functions, methods). For some use cases—such as small configuration files, documentation, or when semantic boundaries are less important—embedding entire files as single chunks produces better search results and simpler indexing.

## What Changes
- Add a `wholeFile` configuration option under `chunking` config
- When enabled, skip AST parsing and embed each file as a single chunk
- Files exceeding `maxTokens` will still be split with overlap to respect embedding model limits
- Default behavior remains unchanged (semantic chunking)

## Impact
- Affected specs: `indexing` (new capability)
- Affected code:
  - `src/config/schema.ts` - Add `wholeFile` option to ChunkingConfigSchema
  - `src/parser/chunker.ts` - Check config and bypass parsing when enabled
  - `config/default.yaml` - Document new option
