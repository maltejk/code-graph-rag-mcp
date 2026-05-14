# Code Graph RAG MCP — Agent Guide

## Quick start

```bash
CXXFLAGS="-std=c++20" npm install   # Node 24 requires C++20 for tree-sitter native addon
npm ci                               # if lockfile is already up to date
npm run build                        # tsup → dist/index.js
npm run typecheck                    # tsc --noEmit (blocking pre-commit gate)
npm run lint                         # biome check .
npm test                             # custom per-file Jest runner, NOT raw jest
```

## Test commands

```bash
npm test                                    # all tests (sequential, per-file)
npm run test:quiet                          # silent output
npm run test:coverage                       # with coverage
npm test -- tests/tools/hybrid-ranking.test.ts  # single file
npm test -- --testPathPattern hybrid        # pattern filter
npm run test:verbose                        # verbose output
npm run test:watch                          # watch mode
```

Tests live in `tests/`, named `*.test.ts`. The custom runner (`scripts/run-tests.js`) spawns each file in a separate Jest process with `--runInBand`. Default concurrency=1; set `JEST_PER_FILE_CONCURRENCY` for parallel file execution.

`jest.setup.js` forces `DATABASE_PATH` to `tmp/test-*.db` and mocks `console.log/debug/info` (only `console.error` passes through). `tsconfig.test.json` disables strict mode for test files.

## Build & lint

- `npm run build` — tsup, output `dist/index.js` (ESM, Node.js target)
- `npm run build:watch` — watch mode
- `npm run format` — `biome format --write .`
- Pre-commit hook (simple-git-hooks): `lint-staged && npm run typecheck`
- Lint-staged runs `biome check --write` on staged files

Source format: 2-space indent, line width 120, spaces not tabs (Biome config).

## Architecture

- **Entry point**: `src/index.ts` — MCP Server + all tool registrations (3210 lines)
- **Bin**: `code-graph-rag-mcp` → `dist/index.js`
- **Single package** (not a monorepo). Node >= 24, ESM only.

### Source layout

| Directory | Purpose |
|-----------|---------|
| `src/agents/` | Multi-agent system: ConductorOrchestrator, Coordinator, Parser, Indexer, Query, Semantic, Dev, Dora |
| `src/core/` | KnowledgeBus (topic-based in-process messaging), ResourceManager |
| `src/parsers/` | Tree-sitter language analyzers (11 languages: TS/JS, Python, C, C++, C#, Java, Rust, Go, Kotlin, VBA, Markdown) |
| `src/semantic/` | Embedding generator (provider-based), vector store (sqlite-vec), hybrid search, cache |
| `src/storage/` | SQLiteManager (connection pool, WAL mode), GraphStorage, schema migrations |
| `src/tools/` | MCP tool implementations (agent-metrics, analyze-code-impact, jscpd, lerna, etc.) |
| `src/query/` | Graph query processor, cache, optimizer, stream handler |
| `src/vendor/jscpd/` | Vendored JSCPD clone detection (zero external deps) |
| `src/config/` | YAML config loader (`config/default.yaml` + env-specific overrides) |

### Important initialization order

`src/index.ts` runs these steps at module level **before any other imports**:
1. `createSafeEnvironment()` — sets defaults for `MCP_EMBEDDING_*`, `NODE_ENV`, etc.
2. `import "./utils/stdio-console.js"` — redirects `console.log` → stderr (stdout reserved for MCP JSON-RPC; required by Codex/VSCode)

## Key environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `MCP_EMBEDDING_ENABLED` | `true` | Enable/disable embeddings |
| `MCP_EMBEDDING_PROVIDER` | `transformers` | `memory`, `transformers`, `openai`, `ollama`, `cloudru` |
| `MCP_SEMANTIC_WARMUP_LIMIT` | `50` | Embedding cache priming count; set `0` for Claude Code CLI compat |
| `DATABASE_PATH` | `./.code-graph-rag/vectors.db` | SQLite DB location (per-repo isolation) |
| `COORDINATOR_MEMORY_LIMIT` | YAML | Agent memory caps for backpressure |
| `MCP_TIMEOUT` | `80000` | Per-server timeout (Claude Desktop only; Claude Code ignores this) |
| `MCP_STDIO_ALLOW_STDOUT_LOGS` | unset | Debug only — allows logs on stdout |

## Database

- SQLite with `better-sqlite3` + `sqlite-vec` vector extension
- Default: `./.code-graph-rag/vectors.db` (per-repo; add `/.code-graph-rag/` to `.gitignore`)
- WAL mode. Schema auto-migrates on startup.
- Native module mismatch auto-rebuild: `npm rebuild better-sqlite3` if needed
- Clean reset: delete `./.code-graph-rag/` and restart

## Testing quirks

- Custom runner `scripts/run-tests.js` wraps Jest — pass args after `--`
- Jest config uses `ts-jest/presets/default-esm` with `moduleNameMapper` for `.js`→`.ts` resolution
- Mocks for `nanoid`, `p-limit`, and `connection-pool` in `src/__mocks__/`
- `maxWorkers: 1` in jest config; set `JEST_DETECT_OPEN_HANDLES=1` or `JEST_FORCE_EXIT=1` for debugging
- DB artifacts go to `tmp/test-*.db` (ignored)

## Notable constraints

- **Claude Code CLI** has a hardcoded 15s MCP tool timeout. Set `MCP_SEMANTIC_WARMUP_LIMIT=0` to avoid first-call timeout.
- **Codex/VSCode** requires stdout to be JSON-RPC only. Startup logging goes to stderr. Global log mirror at `/tmp/code-graph-rag-mcp/mcp-server-YYYY-MM-DD.log`.
- Yaml configs in `config/` layer via `config/default.yaml` + env-specific overrides.
- `AGENTS-OBSOLETE.md` (at repo root) contains legacy agent governance; do not revive.
