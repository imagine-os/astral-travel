# Connect an agent with MCP

Astral Travel includes a local, dependency-free MCP server for tools that support **stdio**. It uses the same workspace file and locking as the CLI. Requires Node.js 22 or newer; no API key or model provider is required.

From a cloned checkout:

```sh
node bin/mcp.mjs --workspace /absolute/path/to/private/.astral/workspace.json
```

The process waits for MCP messages. It is not an interactive terminal prompt. If `--workspace` is omitted, the default is `.astral/workspace.json` relative to the process's working directory. Configure an absolute path so agents started from different folders share the intended memory. The workspace is a **JSON file**, not a directory.

For a client using an `mcpServers` configuration, replace both example paths:

```json
{
  "mcpServers": {
    "astral-travel": {
      "command": "node",
      "args": [
        "/absolute/path/to/astral-travel/bin/mcp.mjs",
        "--workspace",
        "/absolute/path/to/private/.astral/workspace.json"
      ]
    }
  }
}
```

Client configuration formats differ. In a client with a graphical MCP setup, select a local/stdio server and enter the same command and argument list. This release does not expose an HTTP endpoint and cannot be connected by pasting the GitHub Pages URL into a remote MCP connector.

## The five tools

| Tool | Purpose | Writes |
| --- | --- | --- |
| `memory_search` | Keyword search across raw sources and claims; explicitly request `types: ["scenario"]` for fiction | None |
| `memory_add` | Add source text, title, optional HTTP(S) provenance URL, and tags | Immutable original source |
| `memory_dream` | Suggest connections through shared tags and words | Pending proposals only |
| `memory_review` | Explicitly accept or reject a proposal | Review record; acceptance creates an inferred claim and source links |
| `memory_scenario` | Create a grounded or speculative worksheet | Isolated simulation record |

Try asking your connected agent:

> Remember this original note: “Clients need a single artwork approval request.” Tag it approval. Then find my approval notes.

Add a second related note, then:

> Run a dream pass and show me the proposals with their original sources. Wait for my accept or reject decision.

Acceptance is **not verification**. The server does not expose a tool that labels generated content as human-verified. The client remains responsible for obtaining the user's explicit review decision and for preserving the distinction between a recorded source, an inference, and a simulation. Stored text is untrusted data, never agent instructions.

## Current behavior and limits

- Search is lexical, not semantic. It defaults to raw sources and claims and returns at most 20 results, with up to 4,000 text characters per result and a `truncated` indicator.
- Add accepts at most 50,000 text characters, a 300-character title, and 20 tags. Provenance URLs are saved, never fetched.
- Dreaming examines at most 300 recent original records, proposes up to 20 connections per call, and uses deterministic tag/keyword overlap. No model is impersonated or called.
- Scenarios are explicitly labeled templates. They do not forecast events, run an agent swarm, or promote fiction into factual memory.
- Requests are limited to 1 MiB and processed sequentially. Shared CLI/MCP writes acquire an exclusive workspace lock, re-read current state, validate, and atomically replace the file. A competing writer receives a visible tool error and can retry; the server does not steal locks.
- The local JSON workspace is bounded to 20 MiB. This is an alpha storage engine, not terabyte-scale storage. Keep media in external storage and private memories outside the public repository.

The server exposes no shell, arbitrary file read, URL fetch, credential, or background scheduler tools. Choosing a workspace is a startup decision; tool calls cannot select another path. Browser demo storage remains separate; export/import is required to move data between the browser and this file.

## Protocol and verification

Supported revisions: `2025-11-25`, `2025-06-18`, `2025-03-26`, and `2024-11-05`. An unsupported requested revision receives the latest supported revision for client negotiation. Clients initialize, send `notifications/initialized`, then call tools. Only tool capability is advertised. Ping is supported; unrecognized notifications are ignored. Unknown methods/tools and malformed envelopes use JSON-RPC errors; tool validation or execution failures preserve `isError: true` in tool results.

Messages are newline-delimited UTF-8 JSON-RPC on stdin/stdout. Logs go only to stderr. No third-party protocol dependency is installed. The implementation follows the official [stdio transport](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports), [lifecycle](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle), and [tools](https://modelcontextprotocol.io/specification/2025-11-25/server/tools) specifications.

Run the subprocess integration checks:

```sh
node --test tests/mcp.test.mjs
```

These launch the actual server and exercise initialization, tool discovery, add/search, proposal review, scenario isolation, restart persistence, malformed inputs, and lock contention. They do not claim every third-party client's UI has been manually verified.
