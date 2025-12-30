# Project Context

## Purpose
Code RAG is a Retrieval-Augmented Generation system for source code. It indexes code repositories into OpenSearch, generates vector embeddings for semantic search, and provides AI-powered code understanding through a REST API, MCP server, and web UI.

Key goals:
- Parse and chunk source code by semantic units (classes, functions, methods)
- Enable semantic code search across multiple repositories
- Provide AI-assisted code Q&A using retrieved context
- Support multiple embedding providers (OpenAI, Azure, local)
- Integrate with Claude via Model Context Protocol (MCP)

## Tech Stack

### Backend
- **Runtime**: Bun
- **Language**: TypeScript (ESM modules)
- **API Framework**: Express
- **Validation**: Zod (schema validation with type inference)
- **Configuration**: YAML files with Zod validation

### Code Parsing
- **Parser**: tree-sitter (via web-tree-sitter, tree-sitter-wasms)
- **Languages**: TypeScript, JavaScript, Python, Java, SQL, YAML, JSON

### Search & Storage
- **Vector Database**: OpenSearch with k-NN (Lucene engine)
- **Embeddings**: @huggingface/transformers (local), OpenAI, Azure

### AI/RAG
- **AI SDK**: Vercel AI SDK (@ai-sdk/openai, ai)
- **Providers**: Ollama (default), OpenAI, OpenRouter, OpenAI-compatible

### MCP Integration
- **SDK**: @modelcontextprotocol/sdk

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript

## Project Conventions

### Code Style
- TypeScript with strict mode and ESM modules
- Use `.js` extensions in imports (for ESM compatibility)
- Zod schemas for all configuration and validation
- Infer types from Zod schemas using `z.infer<typeof Schema>`
- JSDoc comments for public APIs and complex logic
- `snake_case` for API/database fields, `camelCase` for internal code

### Architecture Patterns
- **Layered architecture**: config → models → services → api/mcp
- **Provider pattern**: Abstract base classes for embeddings (OpenAI, Azure, local)
- **Pipeline pattern**: Ingestion pipeline orchestrates scanning → parsing → embedding → indexing
- **Barrel exports**: Each module has an `index.ts` that re-exports public APIs

### Directory Structure
```
src/
├── config/       # Configuration loading and Zod schemas
├── models/       # Data types and domain models
├── scanner/      # Repository and file discovery
├── parser/       # Code parsing with tree-sitter
├── embeddings/   # Embedding providers
├── indexer/      # OpenSearch client and bulk indexing
├── search/       # Search service
├── api/          # REST API (Express routes)
├── mcp/          # MCP server and tools
├── rag/          # RAG service for AI chat
├── pipeline/     # Ingestion orchestration
└── scripts/      # CLI scripts (ingest, setup-index)
ui/               # React frontend
tests/            # Unit tests (mirrors src/ structure)
```

### Testing Strategy
- **Test runner**: Bun test (`bun test`)
- **Pattern**: Unit tests using `describe`/`it`/`expect`
- **Location**: `tests/` directory mirrors `src/` structure
- **Coverage**: Focus on models, parsers, and core services

### Git Workflow
- **Main branch**: `main`
- **Commit style**: Present tense, imperative mood
  - Examples: "Add feature", "Fix bug", "Update dependencies"
- **Commit scope**: One logical change per commit

## Domain Context

### Code Chunks
The system parses source code into "chunks" representing semantic units:
- **File**: Entire file content (for small files or unknown languages)
- **Class/Interface/Enum**: Type definitions
- **Function/Method**: Callable units with optional signatures
- **Block**: Arbitrary code sections

Each chunk stores:
- Repository and file metadata (repo, branch, commit, path)
- Symbol information (type, name, signature, parent)
- Code context (imports, calls, package)
- Vector embedding for semantic search

### Search Modes
- **Semantic search**: k-NN vector similarity on embeddings
- **Hybrid search**: Combines vector search with BM25 text matching
- **Filtered search**: By repository, language, microservice, symbol type

## Important Constraints
- OpenSearch must be running and accessible for indexing/search
- Embedding dimension must match the OpenSearch index mapping
- Local embeddings require model download on first use
- RAG features require an LLM provider (Ollama, OpenAI, etc.)

## External Dependencies

### Required
- **OpenSearch**: Vector database (default: http://localhost:9200)

### Optional (for RAG)
- **Ollama**: Local LLM inference (default RAG provider)
- **OpenAI API**: Cloud embeddings and RAG
- **OpenRouter**: Multi-model API gateway
- **Azure OpenAI**: Enterprise embeddings
