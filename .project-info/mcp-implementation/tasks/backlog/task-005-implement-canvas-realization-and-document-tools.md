# TASK-005: Implement Canvas Realization & Document Tools (`render_design`, `get_active_document`, `get_page_content`, `export_page`)

## Metadata
- **Owner:** levantuan.itvn@gmail.com and Antigravity Agent
- **Branch:** `pencil-mcp-integration`
- **Parent Plan:** [.project-info/mcp-implementation/plans/master-plan.md](file:///home/ltuan/storage/pencil/.project-info/mcp-implementation/plans/master-plan.md)
- **Canonical Docs & Specs:** [.project-info/mcp-implementation/specs/mcp-server-spec.md](file:///home/ltuan/storage/pencil/.project-info/mcp-implementation/specs/mcp-server-spec.md)
- **Reference Codebase:** `app/views/ApplicationPane.js`, `app/tools/api-server.js`

## Objective
Implement canvas realization and document manipulation tools on the MCP server: `render_design` (accepts agent-constructed design JSON, renders PNG/SVG preview, or opens live in running Pencil window tab via `openAsDocument: true`), `get_active_document`, `get_page_content`, and `export_page`.

## Acceptance Criteria
- [ ] Tool `render_design` exposed and calls `ApplicationPane._instance.convertDesignJSONToImage`.
- [ ] Support `openAsDocument: true` to open the design directly into a new editable document tab in Pencil.
- [ ] Tool `get_active_document` returns active document metadata, pages, dimensions, and shape counts.
- [ ] Tool `get_page_content` returns scene graph, shape hierarchy, and properties for a specified page by ID or index.
- [ ] Tool `export_page` exports active page/document to file (PNG, SVG, PDF).

## Implementation Steps
- [ ] Step 1: Implement `render_design` tool handler wiring directly to `ApplicationPane._instance`.
- [ ] Step 2: Implement `get_active_document` querying the active editor, document title, and page list.
- [ ] Step 3: Implement `get_page_content` extracting shapes and properties from the target page DOM.
- [ ] Step 4: Implement `export_page` calling Pencil's exporter pipeline.
- [ ] Step 5: Validate execution of all canvas tools against live Pencil application.

## Session Notes & Progress Ledger
### 2026-10-01 (Session 1)
- **Verified:**
- **Docs Consulted:**
- **Changes:**
- **Next:**

