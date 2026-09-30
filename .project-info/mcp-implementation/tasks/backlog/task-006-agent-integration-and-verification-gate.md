# TASK-006: Agent Integration & Verification Gate

## Metadata
- **Owner:** levantuan.itvn@gmail.com and Antigravity Agent
- **Branch:** `pencil-mcp`
- **Parent Plan:** [.project-info/mcp-implementation/plans/master-plan.md](file:///home/ltuan/storage/pencil/.project-info/mcp-implementation/plans/master-plan.md)
- **Canonical Docs & Specs:** [.project-info/mcp-implementation/specs/mcp-server-spec.md](file:///home/ltuan/storage/pencil/.project-info/mcp-implementation/specs/mcp-server-spec.md)
- **Reference Codebase:** All MCP server modules, `app/tools/api-server.js`

## Objective
Configure the Pencil MCP server inside an external AI agent environment (Claude Desktop / Antigravity / Cursor) and perform full end-to-end verification of tool execution, design generation, and rendering.

## Acceptance Criteria
- [ ] Automated verification script in `.project-info/mcp-implementation/tests/` verifies JSON-RPC tool calls.
- [ ] Agent configuration snippet provided (`mcpServers` config for Claude Desktop / Antigravity).
- [ ] End-to-end test completed: agent queries icons/stencils and renders a design.
- [ ] Verification report documented in `.project-info/mcp-implementation/tests/`.

## Implementation Steps
- [ ] Step 1: Write integration test runner simulating an MCP client.
- [ ] Step 2: Register server in local agent configuration.
- [ ] Step 3: Run interactive verification session.
- [ ] Step 4: Write verification report.

## Session Notes & Progress Ledger
### YYYY-MM-DD (Session 1)
- **Verified:**
- **Docs Consulted:**
- **Changes:**
- **Next:**
