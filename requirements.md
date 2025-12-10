Here is a requirements/specification document you can paste into a coding assistant and iterate from.

---

# RAG System for Source Code Using OpenSearch – Requirements & Specifications

## 1. Objective

Implement a Retrieval-Augmented Generation (RAG) backend to index and search source code using OpenSearch as the vector store.

The system must:

* Ingest source code from one or more Git repositories.
* Chunk code into semantically meaningful units (functions, methods, classes, etc.).
* Generate vector embeddings for each code chunk.
* Store embeddings and rich metadata in OpenSearch.
* Expose a query interface that:

  * Accepts a natural language or code-like query.
  * Uses OpenSearch k-NN vector search (and optional text search) to retrieve the most relevant code chunks.
  * Returns enough metadata so a caller (RAG orchestrator / LLM) can build an answer and show references (file path, symbol, line numbers).

The implementation language is not fixed; the spec should be implementable in TypeScript/Node.js or Python.

---

## 2. High-Level Architecture

### 2.1 Components

1. **Repository Scanner**

   * Input: list of repositories (local paths or Git URLs).
   * Responsibility: clone/update repos (if needed) and enumerate files.

2. **Code Parser & Chunker**

   * Input: individual source files.
   * Responsibility:

     * Detect language.
     * Parse/inspect AST where possible.
     * Produce a list of “code chunks”:

       * One chunk per meaningful symbol (function, method, class, etc.).
       * Additional chunks for configuration/SQL/docs as needed.

3. **Embedding Service**

   * Input: chunk text (code + minimal context).
   * Responsibility: call an embedding model (e.g. an external API) and return a dense vector.

4. **OpenSearch Indexer**

   * Input: code chunks + embeddings + metadata.
   * Responsibility: bulk index or upsert documents into OpenSearch.

5. **Search API**

   * Input: query string + optional filters (repo, language, microservice, etc.).
   * Responsibility:

     * Get query embedding.
     * Execute k-NN search (and optionally text search) against OpenSearch.
     * Return ranked results.

---

## 3. Data Model – “CodeChunk” Entity

Each code chunk is a document in OpenSearch representing a semantically coherent piece of code.

### 3.1 Fields

Required fields:

* `id`: unique identifier (string/UUID).
* `repo`: repository name or identifier (string).
* `branch`: branch name (string). Initial version can default to `main` or `master`.
* `commit`: commit hash (string).
* `path`: file path relative to repo root (string).
* `language`: language identifier (e.g. `"java"`, `"typescript"`, `"python"`) (string).
* `microservice`: logical microservice / module name, if applicable (string; can be nullable).
* `symbol_type`: one of:

  * `"file"`
  * `"class"`
  * `"interface"`
  * `"enum"`
  * `"function"`
  * `"method"`
  * `"block"` (for script/config chunks)
* `symbol_name`: symbol name if available (e.g. class name, method name) (string; nullable).
* `signature`: textual signature, if applicable (e.g. `public List<Payment> computeSchedule(LoanTerms terms)`) (string; nullable).
* `start_line`: starting line number in the file (integer).
* `end_line`: ending line number in the file (integer).
* `text`: the code chunk content to embed and show (string).

  * Contains code + relevant comments + minimal context (e.g. class header for a method).
* `embedding`: vector (array of floats).

Optional but recommended metadata:

* `package`: package/module name (string; nullable).
* `imports`: list of imported modules/symbols (array of strings).
* `calls`: list of called functions/methods (array of strings).
* `aggregate`: DDD aggregate or domain concept, if known (string; nullable).
* `tags`: free-form labels such as `"amortization"`, `"loan"`, `"fee"` (array of strings).

---

## 4. OpenSearch Index Specification

### 4.1 Index Name

* Use an index name such as: `code_chunks`.

### 4.2 Settings

* Enable k-NN.
* Configure HNSW parameters.

Example:

```json
PUT code_chunks
{
  "settings": {
    "index": {
      "knn": true,
      "knn.algo_param.ef_search": 256,
      "knn.algo_param.ef_construction": 512,
      "knn.algo_param.m": 16
    }
  },
  "mappings": {
    "properties": {
      "text":        { "type": "text" },
      "repo":        { "type": "keyword" },
      "branch":      { "type": "keyword" },
      "commit":      { "type": "keyword" },
      "path":        { "type": "keyword" },
      "language":    { "type": "keyword" },
      "microservice":{ "type": "keyword" },

      "symbol_type": { "type": "keyword" },
      "symbol_name": {
        "type": "text",
        "fields": {
          "keyword": { "type": "keyword" }
        }
      },
      "signature":   { "type": "text" },
      "start_line":  { "type": "integer" },
      "end_line":    { "type": "integer" },

      "package":     { "type": "keyword" },
      "imports":     { "type": "keyword" },
      "calls":       { "type": "keyword" },
      "aggregate":   { "type": "keyword" },
      "tags":        { "type": "keyword" },

      "embedding": {
        "type": "knn_vector",
        "dimension": 1536,           // Must match the embedding model dimension
        "method": {
          "name": "hnsw",
          "space_type": "cosinesimil",
          "engine": "nmslib"         // or "faiss" depending on OpenSearch build
        }
      }
    }
  }
}
```

The `dimension` value must match the chosen embedding model.

---

## 5. Chunking Strategy Specification

### 5.1 Goals

* Do not chunk arbitrarily by fixed token count only.
* Prefer chunks aligned with language structure:

  * Functions, methods, classes, interfaces, enums, etc.
* Keep chunks within a maximum token size suitable for embedding (e.g. ~500–1,000 tokens).

### 5.2 Algorithm (per file)

1. **Language Detection**

   * Based on file extension or a configurable map:

     * `.java` → `java`
     * `.ts`, `.tsx` → `typescript`
     * `.js`, `.jsx` → `javascript`
     * `.py` → `python`
     * `.yml`, `.yaml`, `.json` → `config`
     * `.sql` → `sql`
   * If unsupported, skip file or treat as plain text.

2. **Structured Languages (Java, TypeScript, etc.)**

   * Use a parser (e.g. tree-sitter or language-specific tools).
   * Identify:

     * Top-level classes/interfaces/enums.
     * Methods/functions within those classes or top level.
   * For each symbol:

     * Extract:

       * Its full body.
       * Preceding doc comments.
       * Class/interface header (for methods).
     * Compute `start_line` and `end_line`.
     * Build chunk text as:

       * For methods:

         * Class signature (short) + method signature + method body + relevant doc comments.
       * For classes:

         * Class signature + class fields + doc comments (optional truncation if huge).
   * Enforce a maximum size:

     * If one symbol is too large (e.g. > N characters/tokens), split into sub-chunks with some overlap.
     * Mark parts with metadata (e.g. `symbol_part: 1/3` if needed).

3. **Config/Script/SQL Files**

   * For YAML/JSON:

     * Chunk per top-level key or logical section.
   * For SQL:

     * Chunk per statement or per table (e.g. each `CREATE TABLE` is one chunk).
   * For .properties or similar:

     * Chunk by groups of related keys (e.g. same prefix) or by size.

4. **File-Level Summary Chunks (Optional)**

   * For each file, optionally create an additional “file summary” chunk that:

     * Contains a brief textual summary of what the file contains.
     * Lists top-level symbols.
   * This can be generated by a model or a simple heuristic in a later iteration.

---

## 6. Ingestion Pipeline Specification

### 6.1 Inputs

* Configuration:

  * List of repositories (local paths or Git URLs).
  * Branch(es) to index.
  * Inclusion/exclusion patterns for paths (e.g. include `src/**`, exclude `node_modules/**`, `target/**`).
  * Embedding model configuration (API base URL, model name, API key).

### 6.2 Steps

For each repository:

1. **Sync Repository**

   * If Git URL:

     * Clone if not present.
     * Pull latest changes for target branch.
   * If local path:

     * Assume external tooling manages updates.

2. **Enumerate Files**

   * Walk directory tree with include/exclude rules.
   * For each file:

     * Determine language; skip unsupported ones.

3. **Chunk File**

   * Apply the chunking algorithm described above.
   * Produce a list of `CodeChunk` structures without embeddings.

4. **Generate Embeddings**

   * For each chunk:

     * Call an embedding API with `text`.
     * Receive vector of dimension `D`.
   * Recommended:

     * Use batch embedding calls for efficiency where possible.

5. **Index into OpenSearch**

   * Create or update `code_chunks` index if not exists.
   * For each chunk:

     * Assign a deterministic `id`, e.g. hash of (`repo`, `path`, `symbol_name`, `start_line`, `commit`), or a UUID.
     * Store all fields including `embedding`.
   * Use bulk indexing for performance.

6. **Incremental Update Strategy**

   * Track last indexed commit per repo.
   * For new commits:

     * Identify changed files.
     * Re-chunk and re-index only affected files.
     * Optionally delete old chunks for those files or mark them with a `commit` / `is_latest` flag.

---

## 7. Search / Retrieval API Specification

Implement a service (e.g. REST or gRPC) that exposes at least one endpoint:

### 7.1 Request

`POST /search-code`

Body (example):

```json
{
  "query": "Where is the late interest fee applied for corporate loans?",
  "top_k": 20,
  "filters": {
    "repo": "corp-loan-engine",
    "language": "java",
    "microservice": "loan-service"
  }
}
```

* `query`: natural language or code-like query string.
* `top_k`: number of results to return (default, e.g., 20).
* `filters`:

  * Optional object with keys that map to metadata fields (`repo`, `language`, `microservice`, `symbol_type`, etc.).

### 7.2 Processing

1. **Embedding**

   * Call the same embedding model to embed the `query` string.

2. **OpenSearch k-NN Query**

   * Use a `knn` query against the `embedding` field.
   * Apply metadata filters if specified.

Example OpenSearch query:

```json
POST code_chunks/_search
{
  "size": 20,
  "query": {
    "knn": {
      "field": "embedding",
      "query_vector": [ /* query vector */ ],
      "k": 20,
      "num_candidates": 100,
      "filter": {
        "bool": {
          "filter": [
            { "term": { "repo": "corp-loan-engine" } },
            { "term": { "language": "java" } }
          ]
        }
      }
    }
  }
}
```

3. **(Optional) Hybrid Re-ranking**

   * Additionally, consider keyword matching on:

     * `symbol_name`
     * `text`
   * You can:

     * Either run a second lexical query and re-rank based on combined score.
     * Or implement simple boosting in application logic (e.g. boost hits where `symbol_name` contains key terms).

4. **Response**

Return a sorted list of results with fields needed for RAG:

```json
{
  "results": [
    {
      "id": "…",
      "score": 0.87,
      "repo": "corp-loan-engine",
      "path": "src/loan/domain/LoanCalculator.java",
      "language": "java",
      "microservice": "loan-service",
      "symbol_type": "method",
      "symbol_name": "applyLateInterestFee",
      "start_line": 210,
      "end_line": 260,
      "text": "public Money applyLateInterestFee(Loan loan, Payment payment) { ... }"
    }
    // ...
  ]
}
```

The caller (RAG orchestrator) will then inject `text` and associated metadata into the LLM prompt and/or display them to the user.

---

## 8. Non-Functional Requirements

* **Security**

  * Access to OpenSearch must respect existing authentication/authorization.
  * If embeddings are generated via external API, ensure secrets are not logged and traffic is encrypted (HTTPS).

* **Performance**

  * Target latency (embedding + OpenSearch query) for search: ideally < 1–2 seconds for normal loads.
  * Ingestion can be batch and asynchronous; no strict real-time requirements initially.

* **Configurable**

  * Embedding model configuration should be externalized (env variables or config file).
  * OpenSearch connection (URL, index name, auth) should be configurable.

* **Observability**

  * Log:

    * Number of chunks created.
    * Indexing errors.
    * Search errors.
  * Expose minimal metrics (e.g. searches per minute, average search latency) if possible.

---

This specification is intended to be directly usable by a coding assistant to generate:

* The OpenSearch index creation script.
* The ingestion pipeline (repo scan → chunk → embed → index).
* The search API service that performs k-NN vector search with filters.
