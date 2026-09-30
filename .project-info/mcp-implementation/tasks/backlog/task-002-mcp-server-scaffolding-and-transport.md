# TASK-002: Scaffold MCP Server Package & Transport Layer

## Metadata
- **Owner:** levantuan.itvn@gmail.com and Antigravity Agent
- **Branch:** `pencil-mcp`
- **Parent Plan:** [.project-info/mcp-implementation/plans/master-plan.md](file:///home/ltuan/storage/pencil/.project-info/mcp-implementation/plans/master-plan.md)
- **Canonical Docs & Specs:** [.project-info/mcp-implementation/specs/mcp-server-spec.md](file:///home/ltuan/storage/pencil/.project-info/mcp-implementation/specs/mcp-server-spec.md), [.project-info/mcp-implementation/adr/0001-mcp-architecture-and-transport-strategy.md](file:///home/ltuan/storage/pencil/.project-info/mcp-implementation/adr/0001-mcp-architecture-and-transport-strategy.md)
- **Reference Codebase:** `app/tools/api-server.js`

## Objective
Scaffold the standalone Node.js MCP server package (e.g. `packages/pencil-mcp` or `app/tools/mcp/`) using `@modelcontextprotocol/sdk`. Set up clean `stdio` JSON-RPC transport and an HTTP client to communicate with Pencil's internal API bridge on port 1919.

## Acceptance Criteria
- [ ] Package initialized with `@modelcontextprotocol/sdk` and necessary dependencies.
- [ ] CLI entrypoint runnable with `node ...` communicating over `stdio`.
- [ ] Health check / ping mechanism detecting whether Pencil's API server is reachable.
- [ ] Returns graceful error messages when Pencil is offline.

## Implementation Steps
- [ ] Step 1: Initialize MCP package and install SDK dependencies.
- [ ] Step 2: Implement server lifecycle and `stdio` server transport.
- [ ] Step 3: Implement HTTP client bridge connecting to `http://127.0.0.1:1919`.
- [ ] Step 4: Verify server starts cleanly and answers standard MCP initialization requests.

## Session Notes & Progress Ledger
### YYYY-MM-DD (Session 1)
- **Verified:**
- **Docs Consulted:**
- **Changes:**
- **Next:**
