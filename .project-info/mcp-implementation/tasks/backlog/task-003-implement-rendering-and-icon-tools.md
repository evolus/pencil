# TASK-003: Implement Rendering & Icon Query Tools

## Metadata
- **Owner:** levantuan.itvn@gmail.com and Antigravity Agent
- **Branch:** `pencil-mcp`
- **Parent Plan:** [.project-info/mcp-implementation/plans/master-plan.md](file:///home/ltuan/storage/pencil/.project-info/mcp-implementation/plans/master-plan.md)
- **Canonical Docs & Specs:** [.project-info/mcp-implementation/specs/mcp-server-spec.md](file:///home/ltuan/storage/pencil/.project-info/mcp-implementation/specs/mcp-server-spec.md)
- **Reference Codebase:** `app/tools/api-server.js`

## Objective
Implement and expose the `pencil_render_design` and `pencil_list_icons` tools on the MCP server, forwarding requests to the existing Pencil endpoints on port 1919 (`/json/render` and `/json/collections/icon-list`).

## Acceptance Criteria
- [ ] Tool `pencil_render_design` registered with schema matching `mcp-server-spec.md`.
- [ ] Rendering to PNG file path verified with sample design JSON.
- [ ] Rendering to SVG vector string verified.
- [ ] Tool `pencil_list_icons` registered and returns valid icon catalogs.

## Implementation Steps
- [ ] Step 1: Define MCP tool schemas with strict parameter typing.
- [ ] Step 2: Implement handlers calling `/json/render` and `/json/collections/icon-list`.
- [ ] Step 3: Test execution against running Pencil application instance.

## Session Notes & Progress Ledger
### YYYY-MM-DD (Session 1)
- **Verified:**
- **Docs Consulted:**
- **Changes:**
- **Next:**
