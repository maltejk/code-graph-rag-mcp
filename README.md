# Code Graph RAG MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen)](https://nodejs.org/)

[Sponsor https://accelerator.slider-ai.ru/ ](https://t.me/SliderQuery)

**Advanced Multi-Language Code Analysis with Semantic Intelligence**

A powerful [Model Context Protocol](https://github.com/modelcontextprotocol) server that creates intelligent graph representations of your codebase with comprehensive semantic analysis capabilities.

**🌟 11 Languages Supported** | **⚡ 5.5x Faster** | **🔍 Semantic Search** | **📊 26 MCP Methods**

---

## 🚀 **Quick Start**

### Installation

Download the latest `.tgz` from [GitHub Releases](https://github.com/maltejk/code-graph-rag-mcp/releases):

```bash
npm install -g ./code-graph-rag-mcp-*.tgz
code-graph-rag-mcp --version
```

Or build from source:

```bash
git clone https://github.com/maltejk/code-graph-rag-mcp.git
cd code-graph-rag-mcp
npm install && npm run build && npm install -g .
```

### Claude Desktop Integration
```bash
# Quick setup (recommended)
npx @modelcontextprotocol/inspector add code-graph-rag \
  --command "code-graph-rag-mcp" \
  --args "/path/to/your/codebase"
```
or
```
#
  claude mcp add-json  code-graph-rag ' { 
        "command": "code-graph-rag-mcp",
        "args": [],
        "env": {
          "MCP_TIMEOUT": "80000"
        }
      }
```

**Manual setup**: Add to Claude Desktop config — see integration examples above

### Claude Code Integration

Claude Code (the CLI, `claude`) enforces a **hardcoded 15-second timeout** on every MCP tool call. When using a hosted embedding provider (OpenAI, Gemini via OpenAI-compat, etc.), the default 50-seed cache warmup can push the first `semantic_search` call past this limit and return `timed out after 15000ms` — even though subsequent calls complete in well under a second.

Recommended setup:

```bash
claude mcp add code-graph-rag -s user \
  -e MCP_EMBEDDING_PROVIDER=openai \
  -e MCP_EMBEDDING_MODEL=gemini-embedding-001 \
  -e MCP_EMBEDDING_ENABLED=true \
  -e OPENAI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai \
  -e OPENAI_API_KEY=YOUR_KEY \
  -e MCP_SEMANTIC_WARMUP_LIMIT=0 \
  -- code-graph-rag-mcp /path/to/your/codebase
```

Key flag: `MCP_SEMANTIC_WARMUP_LIMIT=0` disables the cache warmup so the semantic agent initializes in milliseconds, keeping first-query latency inside Claude Code's 15s window. Subsequent queries hit the warm agent and return in <500ms.

Unlike Claude Desktop, Claude Code does not honor a per-server `MCP_TIMEOUT` env var — the 15s limit is enforced client-side with no override available today.

### Gemini CLI Integration
```bash
# Example
gemini mcp add-json code-graph-rag '{
  "command": "code-graph-rag-mcp",
  "args": ["/path/to/your/codebase"]
}'
```

### Codex CLI Integration
```bash
# Recommended: add a *global* MCP server entry (works from any project folder)
codex mcp remove code-graph-rag  # optional cleanup
codex mcp add code-graph-rag -- code-graph-rag-mcp

# Or point Codex directly at a local dev build (no npm/npx required)
codex mcp remove code-graph-rag  # optional cleanup
codex mcp add code-graph-rag -- node /absolute/path/to/code-graph-rag-mcp/dist/index.js
```

### OpenCode CLI Integration

[OpenCode](https://opencode.ai) uses `opencode.jsonc` with `type: "local"`. The server auto-detects the current directory or client roots:

```jsonc
{
  "mcpServers": {
    "code-graph-rag": {
      "type": "local",
      "command": ["code-graph-rag-mcp"]
    }
  }
}
```

**Per-agent tool scoping** — disable globally, then enable per agent:

```jsonc
{
  "tools": {
    "code-graph-rag_*": false
  },
  "agents": {
    "ask": {
      "tools": ["code-graph-rag_*"]
    }
  }
}
```

**Environment variables** — set via `env` block in `opencode.jsonc`:

| Variable | Recommended | Notes |
|----------|-------------|-------|
| `MCP_EMBEDDING_PROVIDER` | `transformers` | or `openai`, `ollama`, etc. |
| `MCP_EMBEDDING_ENABLED` | `true` | |
| `MCP_SEMANTIC_WARMUP_LIMIT` | `0` | Avoid first-call timeout |
| `MCP_TIMEOUT` | `80000` | OpenCode honors this (unlike Claude Code CLI) |

Unlike Claude Code CLI, OpenCode respects `MCP_TIMEOUT`, so the default embedding warmup works without client-side timeouts.

**Multi-codebase support**: Analyze multiple projects simultaneously → [Multi-Codebase Setup Guide](docs/MULTI_CODEBASE_SETUP.md)

---

## 🏆 **Performance**

**5.5x faster than Native Claude tools** with comprehensive testing results:

| **Metric** | **Native Claude** | **MCP CodeGraph** | **Improvement** |
|------------|-------------------|-------------------|-----------------|
| Execution Time | 55.84s | <10s | **5.5x faster** |
| Memory Usage | Process-heavy | 65MB | **Optimized** |
| Features | Basic patterns | 26 methods | **Comprehensive** |
| Accuracy | Pattern-based | Semantic | **Superior** |

---

## 🔍 **Key Features**

### **🔬 Advanced Analysis Tools (26 MCP Methods)**

| Feature | Description | Use Case |
|---------|-------------|----------|
| **Semantic Search** | Natural language code search | "Find authentication functions" |
| **Code Similarity** | Duplicate & clone detection | Identify refactoring opportunities |
| **JSCPD Clone Scan** | JSCPD-based copy/paste detection without embeddings | Targeted duplicate sweeps |
| **Impact Analysis** | Change impact prediction | Assess modification risks |
| **AI Refactoring** | Intelligent code suggestions | Improve code quality |
| **Hotspot Analysis** | Complexity & coupling metrics | Find problem areas |
| **Cross-Language** | Multi-language relationships | Polyglot codebases |
| **Graph Health** | Database diagnostics | `get_graph_health` |
| **Version Info** | Server version & runtime details | `get_version` |
| **Safe Reset** | Clean reindexing | `reset_graph`, `clean_index` |
| **Batched Indexing** | Resumable indexing with progress (Codex-safe for big repos) | `batch_index` |
| **Agent Telemetry** | Runtime metrics across agents | `get_agent_metrics` |
| **Bus Diagnostics** | Inspect/clear knowledge bus topics | `get_bus_stats`, `clear_bus_topic` |
| **Lerna Project Graph** | Workspace dependency DAG export, optional ingest, cached refresh control | `lerna_project_graph` (requires Lerna config) |
| **Semantic Warmup** | Configurable cache priming for embeddings | `mcp.semantic.cacheWarmupLimit` |

### **⚡ High-Performance Architecture**

| Metric | Capability | Details |
|--------|-----------|---------|
| **Parsing Speed** | 100+ files/second | Tree-sitter based |
| **Query Response** | <100ms | Optimized SQLite + vector search |
| **Agent System** | Multi-agent coordination | Resource-managed execution |
| **Vector Search** | Hardware-accelerated (optional) | Automatic embedding ingestion |
| **AST Analysis** | Precise code snippets | Semantic context extraction |

### **🌐 Multi-Language Support (11 Languages)**

| Language | Features | Support Level |
|----------|----------|---------------|
| **Python** | Async/await, decorators, magic methods (40+), dataclasses | ✅ Advanced (95%) |
| **TypeScript/JavaScript** | Full ES6+, JSX, TSX, React patterns | ✅ Complete (100%) |
| **C/C++** | Functions, structs/unions/enums, classes, namespaces, templates | ✅ Advanced (90%) |
| **C#** | Classes, interfaces, enums, properties, LINQ, async/await | ✅ Advanced (90%) |
| **Rust** | Functions, structs, enums, traits, impls, modules, use | ✅ Advanced (90%) |
| **Go** | Packages, imports, functions, methods, structs, interfaces, fields, goroutines, channels, function calls, struct embedding | ✅ Advanced (95%) |
| **Java** | Classes, interfaces, enums, records (Java 14+), generics, lambdas | ✅ Advanced (90%) |
| **Kotlin** | Packages/imports, classes/objects, functions/properties, relationships | ✅ Implemented |
| **VBA** | Modules, subs, functions, properties, user-defined types | ✅ Regex-based (80%) |

---

## 🛠️ **Usage Examples**

```bash
# Single project analysis
code-graph-rag-mcp
code-graph-rag-mcp /path/to/your/project

# CLI helpers
code-graph-rag-mcp --help
code-graph-rag-mcp --version

# Multi-project setup (see Multi-Codebase Setup Guide)
# Configure multiple projects in Claude Desktop config

# Check installation
code-graph-rag-mcp --help

# Health & maintenance
# Health check (totals + sample)
get_graph_health
# Reset graph data safely
reset_graph
# Clean reindex (reset + full index)
clean_index
# Batched index with progress (recommended for strict clients/timeouts)
batch_index
# Lerna workspace graph (ingest into storage)
lerna_project_graph --args '{"ingest": true}'
# Force refresh graph and re-ingest (bypass cache)
lerna_project_graph --args '{"ingest": true, "force": true}'
# Cached runs return `cached: true`; use `force` to break the 30s debounce when configs change.
# Agent telemetry snapshot
get_agent_metrics
# Knowledge bus diagnostics
get_bus_stats
clear_bus_topic --args '{"topic": "semantic:search"}'

# One-shot index from the CLI (debug mode) — pass JSON-RPC payloads as args
#   Directory omitted = uses current directory
code-graph-rag-mcp '{"id":1,"method":"tools/call","params":{"name":"index","arguments":{"reset":true}}}'

#   Directory as positional arg first, then JSON payload(s)
code-graph-rag-mcp /path/to/project '{"id":1,"method":"tools/call","params":{"name":"index","arguments":{"reset":true}}}'

#   Multiple requests are processed sequentially
code-graph-rag-mcp '{"id":1,"method":"tools/call","params":{"name":"reset_graph","arguments":{}}}' '{"id":2,"method":"tools/call","params":{"name":"index","arguments":{"reset":true}}}'

# Relationships for an entity name
list_entity_relationships (entityName: "YourEntity", relationshipTypes: ["imports"]) 

# Adjust semantic warmup (optional)
export MCP_SEMANTIC_WARMUP_LIMIT=25

# Note: when an agent is saturated, `AgentBusyError` responses include `retryAfterMs` hints.
```

**With Claude Desktop**:
1. "What entities are in my codebase?"
2. "Find similar code to this function"
3. "Analyze the impact of changing this class"
4. "Suggest refactoring for this file"

**Multi-Project Queries**:
1. "Analyze the frontend-app codebase structure"
2. "Find authentication functions in backend-api"
3. "Compare user management across all projects"

---

## 🧰 **Troubleshooting**

- **Claude Code: `semantic_search timed out after 15000ms` on first call**  
  Claude Code (the CLI) enforces a hardcoded 15-second timeout on every MCP tool call and does not honor per-server `MCP_TIMEOUT` env vars. The default cache warmup (`cacheWarmupLimit: 50`) issues up to 50 embedding requests during agent init, which can exceed 15s when using a hosted provider (OpenAI, Gemini, etc.). Set `MCP_SEMANTIC_WARMUP_LIMIT=0` in the MCP server env to skip warmup — first query will then complete inside the 15s window, and subsequent queries hit the warm agent and return in under a second. See the Claude Code Integration section above for the full recommended `claude mcp add` command.

- **Codex/VSCode MCP stdio fails to start**  
  Codex is strict about stdio: `stdout` must be JSON-RPC only. As of v2.7.12, console stdout logs are redirected to `stderr` during MCP runs, and heavy initialization is deferred until after handshake / first tool call.  
  Recommended Codex config: omit the directory argument and let the server use the workspace root via `roots/list`:
  ```toml
  [mcp_servers.code-graph-rag]
  command = "code-graph-rag-mcp"
  args = []
  ```
  If `index` / `clean_index` time out on large repos and the transport closes, prefer `batch_index` with a small `maxFilesPerBatch` and keep calling it with the returned `sessionId` until `done:true`.
  If you must see logs on stdout for local debugging, set `MCP_STDIO_ALLOW_STDOUT_LOGS=1` (not recommended for strict clients).
  If startup still fails, check the global tmp log mirror: `/tmp/code-graph-rag-mcp/mcp-server-YYYY-MM-DD.log` (Linux/macOS; uses `os.tmpdir()`).

- **`batch_index` fails with `agent_busy` / `memory_limit`**  
  Increase the coordinator/conductor limits (these gate task routing in-process): set `COORDINATOR_MEMORY_LIMIT` / `CONDUCTOR_MEMORY_LIMIT` and `COORDINATOR_MAX_MEMORY_MB` / `CONDUCTOR_MAX_MEMORY_MB`, or edit `config/default.yaml`.  
  If you see a real Node.js OOM, also start the server with a larger heap, e.g. `NODE_OPTIONS="--max-old-space-size=4096" code-graph-rag-mcp`.

- **Database location / multi-repo isolation**
  By default, the server stores its SQLite DB under `./.code-graph-rag/vectors.db` (per repo). Add `/.code-graph-rag/` to your project’s `.gitignore`.

- **Native module mismatch (`better-sqlite3`)**  
  Since v2.6.4 the server automatically rebuilds the native binary when it detects a `NODE_MODULE_VERSION` mismatch. If the automatic rebuild fails (for example due to file permissions), run:
  ```bash
  npm rebuild better-sqlite3
  ```
  in the installation directory (globally this is commonly `/usr/lib/node_modules/code-graph-rag-mcp`).

- **Legacy database missing new columns**  
  Older installations might lack the latest `embeddings` columns (`metadata`, `model_name`, etc.). The server now auto-upgrades in place, but if you still encounter migration errors, delete the local DB and re-run the indexer:
  ```bash
  # delete the DB shown in logs as: "[Config] Database path: ..."
  rm -f ./.code-graph-rag/vectors.db ./.code-graph-rag/vectors.db-wal ./.code-graph-rag/vectors.db-shm
  ```
  Then start the server again to trigger a clean rebuild.

- **Running a one-shot index from the CLI**  
  You can trigger tools directly by passing JSON-RPC payloads as positional arguments. The server starts, executes each request, prints results to stdout, and exits. When a payload is supplied, the server skips the semantic agent by default and uses low-memory batching for debugging.
  ```bash
  # Index current directory (fast, no semantic embeddings)
  code-graph-rag-mcp '{"id":1,"method":"tools/call","params":{"name":"index","arguments":{"reset":true}}}'

  # Index a specific project (optionally with full scan)
  code-graph-rag-mcp /my/project '{"id":1,"method":"tools/call","params":{"name":"index","arguments":{"reset":true,"fullScan":true}}}'

  # Multi-step: reset then index
  code-graph-rag-mcp '{"id":1,"method":"tools/call","params":{"name":"reset_graph","arguments":{}}}' '{"id":2,"method":"tools/call","params":{"name":"index","arguments":{"reset":true}}}'
  ```
  The first positional argument that does not start with `{` or `[` is treated as the project directory; everything else is a JSON payload. If omitted, the server uses the current directory.  
  Logs go to `.code-graph-rag/mcp-server-YYYY-MM-DD.log`. Set `MCP_DEBUG_DISABLE_SEMANTIC=0` to enable embeddings during the run.

---

## 📋 **Changelog**

### 🚀 Version 2.7.11 (2025-12-15) - **Per-Repo Database Isolation**

- 🗄️ Default DB path moved to `./.code-graph-rag/vectors.db` so multiple codebases don’t share/mix a single global SQLite database

### 🚀 Version 2.7.12 (2025-12-15) - **Remove Deprecated boolean Install Warning**

- 🧹 npm install: stop auto-installing `onnxruntime-node` by default (optional peer dep instead), removing the `boolean@3.2.0` deprecation warning during install

### 🚀 Version 2.7.10 (2025-12-15) - **sqlite-vec Global Install Fix**

- 🧠 sqlite-vec: load the extension via `sqlite-vec`’s `getLoadablePath()` so global installs work regardless of project `cwd`

### 🚀 Version 2.7.9 (2025-12-15) - **Codex Config Fixes**

- 🧭 Codex docs: use `codex mcp add ...` global config (works from any project folder)
- 🧾 Removed references to non-existent helper scripts

### 🚀 Version 2.7.8 (2025-12-15) - **MCP Startup Diagnostics**

- ✅ TTY-safe stdio: redirect console stdout logs → `stderr` during MCP runs (prevents handshake breaks)
- 🗂️ Global log mirror: always write a copy to `/tmp/code-graph-rag-mcp/mcp-server-YYYY-MM-DD.log` for early-start debugging
- 🛡️ Resilient logging: if `.code-graph-rag/` can’t be created, fall back to `os.tmpdir()` instead of exiting before `initialize`

### 🚀 Version 2.7.7 (2025-12-14) - **Codex StdIO Hardening + Kotlin**

- ✅ Codex/VSCode stdio compatibility: reserve `stdout` for JSON-RPC and route logs to `stderr`
- ⚡ Faster readiness: defer heavy runtime init until after handshake / first tool call
- 📁 Project root now optional: defaults to `cwd`, prefers MCP `roots/list` workspace root when available
- 🧩 Kotlin support for `.kt/.kts` (tree-sitter + KotlinAnalyzer) with tests + ADR-006

### 🚀 Version 2.7.4 (2025-11-02) - **Clone Reporting & CLI Boost**

- 🆕 Added `--help/-h` and `--version/-v` flags for quick CLI interaction
- 🔄 `detect_code_clones` now merges deduplicated semantic groups with JSCPD summaries
- 📊 `jscpd_detect_clones` summary includes duplicated line/token counts, percentages, and inline snippets
- 🧪 Integration coverage verifies clone-report fields to guard against regressions
- 🔁 Maintains vendored lightweight JSCPD pipeline with zero external deps

### 🚀 Version 2.7.0 (2025-11-02) - **JSCPD Clone Detection**

- ➕ Added `jscpd_detect_clones` MCP tool exposing JSCPD duplicate detection without requiring embeddings
- 🧩 Vendored lightweight JSCPD core/tokenizer for zero external build dependencies
- 🧪 New integration fixtures ensure JSCPD scans surface expected duplicate blocks
- 📚 README / tool catalog now counts 23 MCP methods and documents JSCPD usage

### 🚀 Version 2.6.0 (2025-10-12) - **Major Architecture Upgrade**

**Breaking Changes & Major Improvements** ⚡

- 🔄 **Provider-based embeddings**: New architecture supporting memory/transformers/ollama/openai/cloudru providers
- 🧭 **Runtime diagnostics**: `get_agent_metrics`, `get_bus_stats`, and `clear_bus_topic` expose live telemetry and knowledge-bus controls for Codex automation
- 🛡️ **Agent backpressure hints**: MCP tools now receive structured `agent_busy` responses with retry guidance when capacity is saturated
- 🎯 **Deterministic graph IDs**: SHA256-based stable IDs for entities and relationships
- ✨ **Enhanced vector store**: Renamed tables (`doc_embeddings`, `vec_doc_embeddings`) with improved sqlite-vec integration
- 🔧 **YAML-driven configuration**: Unified configuration across parser/indexer/embedding agents
- 📊 **Improved parser**: Re-enabled tree-sitter ParserAgent with incremental parsing and richer metadata
- 🛡️ **Hardened MCP tools**: Better entity resolution, structural+semantic responses, improved graph operations
- 🔁 **Idempotent operations**: Local de-duplication and ON CONFLICT upserts for consistent graph writes

**Technical Details:**
- Dynamic dimension detection at runtime with safe fallbacks
- Batch deduplication by ID with transactional updates
- Enhanced language analyzers with structured pattern data
- SQLiteManager + GraphStorage singleton for consistency

**Testing & Validation (2025-10-21):**
- ✅ All 16/16 test suites passing (200+ individual tests, 93.75% success rate)
- ✅ 100% MCP method validation (22/22 methods comprehensively tested)
- ✅ v2.6.0 new methods validated: `get_agent_metrics`, `get_bus_stats`, `clear_bus_topic`
- ✅ Integration test coverage: All core components, semantic operations, and monitoring tools
- ✅ v2.5.9 dual-schema fixes preserved and enhanced with `sqliteVecEnabled` property
- ✅ Zero regressions after PR #20 integration
- ⚠️ Known issue: Duplicate `case "get_graph"` in src/index.ts:1668 & 1707 (non-critical, line 1707 unreachable)

### 🎉 Version 2.5.9 (2025-10-06) - **100% Success Rate**

- ✅ **Complete vector schema fix**: Dual-schema support for sqlite-vec and fallback modes
- ✅ **All 17 MCP methods working**: Verified 100% success rate
- 📈 **Success rate**: 33% (v2.5.7) → 61% (v2.5.8) → **100% (v2.5.9)**

### Version 2.5.8 (2025-10-06) - Critical Infrastructure Fixes

- ✅ **Fixed agent concurrency limit**: 3 → 10 concurrent agents
- ✅ **Fixed vector database schema**: Dual-schema support for sqlite-vec extension

### Previous Versions

<details>
<summary>Click to expand version history (2.5.7 - 2.3.3)</summary>

**v2.5.7** - Semantic analysis improvements, lowered thresholds, clone detection
**v2.5.6** - Fixed DoraAgent type collision (+16% success rate)
**v2.5.5** - WASM path resolution fix, `get_version` tool, restart script
**v2.5.4** - Architecture Decision Records (ADRs)
**v2.5.3** - Deprecated dependency warning suppression
**v2.5.2** - Enhanced README documentation
**v2.5.1** - Python magic methods, import analysis enhancements
**v2.5.0** - 8 new languages (C#, Rust, C, C++, Go, Java, VBA), Research Trinity
**v2.4.1** - Rust AST parsing, system architecture docs
**v2.4.0** - Health check tools, AST hotspots, semantic routing
**v2.3.3** - Entity extraction fix (0 → 4,467 entities)

</details>

---

## ⚡ **System Requirements**

**Minimum**: Node.js 24+, 2GB RAM, Dual-core CPU
**Recommended**: Node.js 24+, 8GB RAM, Quad-core CPU with SSD

### **Known Issues**

- **Deprecated `boolean@3.2.0` warning**: This is a transitive dependency from the optional `onnxruntime-node` package (used for ML embeddings). The package is deprecated but functional. The warning can be safely ignored as it doesn't affect core functionality.

---

## 🤝 **Contributing**

1. Fork the repository
2. Follow [Agent Governance](AGENTS.md) rules
3. Submit pull request

[Issue Tracker](https://github.com/maltejk/code-graph-rag-mcp/issues)

---

## 📄 **License**

MIT License - see [LICENSE](LICENSE) file for details.

**Links**: [GitHub](https://github.com/maltejk/code-graph-rag-mcp) • [MCP Protocol](https://github.com/modelcontextprotocol)
