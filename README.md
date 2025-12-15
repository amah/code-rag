# Code RAG

[![CI](https://github.com/YOUR_USERNAME/code-rag/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/code-rag/actions/workflows/ci.yml)
[![Release](https://github.com/YOUR_USERNAME/code-rag/actions/workflows/release.yml/badge.svg)](https://github.com/YOUR_USERNAME/code-rag/releases)

Semantic code search and RAG (Retrieval-Augmented Generation) system for source code using OpenSearch k-NN vector search.

## Features

- **Semantic Code Search**: Search code by natural language queries using vector embeddings
- **RAG-powered Q&A**: Ask questions about your codebase and get AI-generated answers with source references
- **Multi-language Support**: TypeScript, JavaScript, Python, Java, Go, Rust, and more
- **AST-aware Chunking**: Intelligent code chunking using Tree-sitter for better context
- **MCP Server**: Model Context Protocol server for integration with AI assistants
- **Web UI**: React-based interface for search and chat

## Prerequisites

- [Bun](https://bun.sh) runtime
- [Docker](https://www.docker.com/) (for OpenSearch)
- [Ollama](https://ollama.ai) (optional, for local RAG)

## Installation

### Option 1: Download Release Package

Download the latest release from [Releases](https://github.com/YOUR_USERNAME/code-rag/releases):

```bash
# Download and extract
wget https://github.com/YOUR_USERNAME/code-rag/releases/latest/download/code-rag-vX.X.X.tar.gz
tar -xzf code-rag-vX.X.X.tar.gz
cd code-rag-vX.X.X

# Configure
cp config.example.yaml config.yaml
# Edit config.yaml with your settings

# Run (all scripts support --config option)
./setup-index.sh --config config.yaml    # Create OpenSearch index
./ingest.sh --config config.yaml         # Index your repositories
./start.sh --config config.yaml          # Start the server
```

### Option 2: Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/code-rag.git
cd code-rag
bun install
cd ui && bun install && cd ..
```

## Quick Start

### 1. Start OpenSearch

```bash
docker run -d --name code-rag-opensearch \
  -p 9200:9200 -p 9600:9600 \
  -e "discovery.type=single-node" \
  -e "DISABLE_SECURITY_PLUGIN=true" \
  -e "OPENSEARCH_INITIAL_ADMIN_PASSWORD=admin" \
  opensearchproject/opensearch:2.11.0
```

### 2. Install Dependencies

```bash
bun install
cd ui && bun install && cd ..
```

### 3. Setup Index

```bash
bun run setup-index
```

### 4. Index Your Repositories

```bash
REPOS_ROOT_DIR=/path/to/your/repos bun run ingest
```

### 5. Start the Server

```bash
bun run dev
```

### 6. Start the UI (optional)

```bash
bun run dev:ui
```

## Configuration

Configuration is loaded from `config/default.yaml` by default. All commands support the `--config` (or `-c`) option to specify a custom configuration file.

### Using a Custom Config File

```bash
# REST API server
bun run start --config /path/to/config.yaml

# Setup index
bun run setup-index --config /path/to/config.yaml

# Ingest repositories
bun run ingest --config /path/to/config.yaml

# MCP server
bun run start:mcp --config /path/to/config.yaml
```

### Creating a Config File

Copy the example configuration file and customize it:

```bash
cp config.example.yaml config.yaml
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENSEARCH_URL` | OpenSearch server URL | `http://localhost:9200` |
| `OPENSEARCH_INDEX` | Index name for code chunks | `code_chunks` |
| `OPENSEARCH_USERNAME` | OpenSearch username | `admin` |
| `OPENSEARCH_PASSWORD` | OpenSearch password | `admin` |
| `REST_PORT` | REST API server port | `3000` |
| `REPOS_ROOT_DIR` | Root directory containing repositories | (required for ingestion) |
| `EMBEDDING_PROVIDER` | Embedding provider: `local`, `openai`, `azure` | `local` |
| `RAG_PROVIDER` | RAG provider: `ollama`, `openrouter`, `openai`, `openai-compatible` | `ollama` |
| `RAG_MODEL` | Model name for RAG | `llama3.2` |
| `OPENROUTER_API_KEY` | API key for OpenRouter | |
| `OPENAI_API_KEY` | API key for OpenAI | |
| `OLLAMA_BASE_URL` | Ollama server URL | `http://localhost:11434/v1` |

### RAG Providers

#### Ollama (Local - Default)

No API key required. Install and run Ollama:

```bash
ollama serve
ollama pull llama3.2
```

#### OpenRouter

```bash
RAG_PROVIDER=openrouter OPENROUTER_API_KEY=your-key bun run dev
```

#### OpenAI

```bash
RAG_PROVIDER=openai OPENAI_API_KEY=your-key bun run dev
```

#### OpenAI-Compatible (Self-hosted)

For vLLM, llama.cpp, text-generation-inference, etc:

```bash
RAG_PROVIDER=openai-compatible \
  OPENAI_COMPATIBLE_BASE_URL=http://localhost:8000/v1 \
  bun run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start REST API server in watch mode |
| `bun run dev:ui` | Start web UI in development mode |
| `bun run dev:mcp` | Start MCP server in watch mode |
| `bun run start` | Start REST API server |
| `bun run start:mcp` | Start MCP server |
| `bun run setup-index` | Create OpenSearch index with mappings |
| `bun run ingest` | Run ingestion pipeline |
| `bun run build:ui` | Build web UI for production |

### Command Line Options

All main commands support these options:

```bash
# Specify config file
bun run start --config config.yaml
bun run start -c config.yaml

# Show help
bun run start --help
bun run setup-index --help
bun run ingest --help
```

### Ingestion Options

```bash
bun run ingest --config config.yaml     # Use custom config
bun run ingest --repo <name>            # Index a specific repository
bun run ingest --dry-run                # Preview what would be indexed
```

### Setup Index Options

```bash
bun run setup-index --config config.yaml  # Use custom config
bun run setup-index --force               # Force recreate the index
bun run setup-index -f                    # Short form for --force
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/search-code` | POST | Semantic code search |
| `/repositories` | GET | List indexed repositories |
| `/repositories/:repo/stats` | GET | Get repository statistics |
| `/file-chunks` | GET | Get chunks for a file |
| `/rag/query` | POST | RAG query with streaming response |
| `/rag/status` | GET | RAG service status |
| `/health` | GET | Health check |

## MCP Server

The MCP server can be used with Claude Code or other MCP-compatible tools:

```json
{
  "mcpServers": {
    "code-rag": {
      "command": "bun",
      "args": ["run", "/path/to/code-rag/src/mcp-server.ts", "--config", "/path/to/config.yaml"],
      "env": {
        "OPENSEARCH_URL": "http://localhost:9200",
        "REPOS_ROOT_DIR": "/path/to/repos"
      }
    }
  }
}
```

## Custom Configuration File

Create a custom YAML configuration file for different environments:

```yaml
# config/production.yaml
opensearch:
  url: "${OPENSEARCH_URL}"
  index: "production_code_chunks"
  auth:
    username: "${OPENSEARCH_USERNAME}"
    password: "${OPENSEARCH_PASSWORD}"

embedding:
  provider: "local"
  local:
    model: "Xenova/all-MiniLM-L6-v2"
    dimension: 384

rag:
  provider: "${RAG_PROVIDER:-openrouter}"
  model: "${RAG_MODEL:-anthropic/claude-3-haiku}"
```

Then run with:

```bash
# Setup and ingest with custom config
bun run setup-index --config config/production.yaml
bun run ingest --config config/production.yaml

# Start server with custom config
bun run start --config config/production.yaml
```

## Architecture

```
code-rag/
├── config/              # Configuration files
├── src/
│   ├── api/            # REST API server
│   ├── config/         # Configuration loading and schema
│   ├── embedding/      # Embedding service (local/OpenAI/Azure)
│   ├── indexer/        # OpenSearch client
│   ├── mcp/            # MCP server
│   ├── parser/         # Tree-sitter code parsing
│   ├── pipeline/       # Ingestion pipeline
│   ├── rag/            # RAG service
│   ├── scanner/        # Repository scanner
│   └── scripts/        # CLI scripts
└── ui/                 # React web interface
```

## Creating a Release

To create a new release, push a tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

This will trigger the release workflow which:
1. Builds and tests the code
2. Creates distributable packages (`.zip` and `.tar.gz`)
3. Publishes a GitHub Release with the packages attached

## License

MIT
