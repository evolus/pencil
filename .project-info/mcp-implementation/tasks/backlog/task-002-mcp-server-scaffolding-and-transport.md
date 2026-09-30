# TASK-002: Implement MCP Server Module & Streamable HTTP Transport

## Metadata
- **Owner:** levantuan.itvn@gmail.com and Antigravity Agent
- **Branch:** `pencil-mcp-integration`
- **Parent Plan:** [.project-info/mcp-implementation/plans/master-plan.md](file:///home/ltuan/storage/pencil/.project-info/mcp-implementation/plans/master-plan.md)
- **Canonical Docs & Specs:** [.project-info/mcp-implementation/specs/mcp-server-spec.md](file:///home/ltuan/storage/pencil/.project-info/mcp-implementation/specs/mcp-server-spec.md), [.project-info/mcp-implementation/adr/0001-mcp-architecture-and-transport-strategy.md](file:///home/ltuan/storage/pencil/.project-info/mcp-implementation/adr/0001-mcp-architecture-and-transport-strategy.md)
- **Reference Codebase:** `app/tools/api-server.js`, `app/tools/mcp/`

## Objective
Implement the Model Context Protocol (MCP) server module in `app/tools/mcp/` using the modern Streamable HTTP transport and mount it directly into `app/tools/api-server.js` on port 1919. External agents can connect directly via `http://127.0.0.1:1919/mcp` without any intermediate CLI proxy processes.

## Acceptance Criteria
- [ ] Add `@modelcontextprotocol/sdk` to application dependencies.
- [ ] Implement MCP server instance and Streamable HTTP transport handler in `app/tools/mcp/server.js`.
- [ ] Mount MCP Streamable HTTP endpoint (`/mcp` or SSE `/sse` + `/message`) on the Express application in `app/tools/api-server.js`.
- [ ] Direct in-memory invocation wiring to `ApplicationPane._instance` without intermediate network hops.
- [ ] Verify server starts with Pencil and responds to MCP initialization and capability handshakes over Streamable HTTP.

## Implementation Steps
- [ ] Step 1: Install `@modelcontextprotocol/sdk` in `app/package.json`.
- [ ] Step 2: Implement MCP server module in `app/tools/mcp/server.js` configuring Streamable HTTP transport.
- [ ] Step 3: Mount the MCP router/handler onto `app/tools/api-server.js`.
- [ ] Step 4: Verify MCP initialization handshake using curl or test script against `http://127.0.0.1:1919/mcp`.

## Session Notes & Progress Ledger
### 2026-09-30 (Session 1)
- **Verified:**
- **Docs Consulted:**
- **Changes:**
- **Next:**

