# TASK-004: Implement Document Inspection & Stencil Tools

## Metadata
- **Owner:** levantuan.itvn@gmail.com and Antigravity Agent
- **Branch:** `pencil-mcp`
- **Parent Plan:** [.project-info/mcp-implementation/plans/master-plan.md](file:///home/ltuan/storage/pencil/.project-info/mcp-implementation/plans/master-plan.md)
- **Canonical Docs & Specs:** [.project-info/mcp-implementation/specs/mcp-server-spec.md](file:///home/ltuan/storage/pencil/.project-info/mcp-implementation/specs/mcp-server-spec.md)
- **Reference Codebase:** `app/tools/api-server.js`, `app/views/applicationPane.js`, `app/pencil-core/`

## Objective
Extend `app/tools/api-server.js` with endpoints to inspect loaded collections, active documents, and individual page scene graphs, and expose `pencil_list_collections`, `pencil_get_shape_definition`, `pencil_get_active_document`, and `pencil_get_page_content` on the MCP server.

## Acceptance Criteria
- [ ] New endpoint in `api-server.js` to return all loaded stencil collections and shape lists.
- [ ] New endpoint to inspect active document, pages, and objects.
- [ ] New endpoint and MCP tool `pencil_get_page_content` extracting scene graph, objects, and properties for a specific page by ID or index.
- [ ] MCP tools registered and mapped to internal endpoints.
- [ ] MCP resources `pencil://collections` and `pencil://active-document` implemented.

## Implementation Steps
- [ ] Step 1: Hook into Pencil Collection Manager in `ApplicationPane` to list collections and shapes.
- [ ] Step 2: Add `/json/collections/list` and `/json/document/active` endpoints to `api-server.js`.
- [ ] Step 3: Implement `/json/page/get` endpoint extracting full page elements and SVG scene graphs.
- [ ] Step 4: Implement MCP tools (`pencil_get_page_content`, `pencil_get_active_document`, `pencil_list_collections`) and resource providers.
- [ ] Step 5: Validate responses.

## Session Notes & Progress Ledger
### YYYY-MM-DD (Session 1)
- **Verified:**
- **Docs Consulted:**
- **Changes:**
- **Next:**
