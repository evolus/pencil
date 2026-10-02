# TASK-004: Implement Stencil & Icon Catalog Tools (`list_collections`, `get_shape_definition`, `list_icons`)

## Metadata
- **Owner:** levantuan.itvn@gmail.com and Antigravity Agent
- **Branch:** `pencil-mcp-integration`
- **Parent Plan:** [.project-info/mcp-implementation/plans/master-plan.md](file:///home/ltuan/storage/pencil/.project-info/mcp-implementation/plans/master-plan.md)
- **Canonical Docs & Specs:** [.project-info/mcp-implementation/specs/mcp-server-spec.md](file:///home/ltuan/storage/pencil/.project-info/mcp-implementation/specs/mcp-server-spec.md)
- **Reference Codebase:** `app/views/ApplicationPane.js`, `app/pencil-core/collectionManager.js`

## Objective
Implement and expose stencil collection and icon catalog inspection tools on the MCP server (`list_collections`, `get_shape_definition`, `list_icons`). These tools allow external agents to inspect available stencils, properties, defaults, and vector icons directly from Pencil's runtime in memory.

## Acceptance Criteria
- [ ] Tool `list_collections` registered and returns all installed stencil collections and shape identifiers from `CollectionManager`.
- [ ] Tool `get_shape_definition` registered and returns exact property definitions, data types, and default values for a shape (or all shapes in a collection when `shapeId` is omitted, requiring only `collectionId`).
- [ ] Tool `list_icons` registered and returns icon lists from supported icon collections (`ApplicationPane._instance.getIconList`).
- [ ] Direct in-memory invocation via `ApplicationPane._instance` without extra proxy hops.

## Implementation Steps
- [ ] Step 1: Hook into `CollectionManager` and `ApplicationPane._instance` to query stencil collections and shape definitions.
- [ ] Step 2: Implement MCP tool handlers for `list_collections`, `get_shape_definition` (with optional `shapeId`), and `list_icons`.
- [ ] Step 3: Verify responses match schemas defined in `mcp-server-spec.md`.

## Session Notes & Progress Ledger
### 2026-10-01 (Session 1)
- **Verified:**
- **Docs Consulted:**
- **Changes:**
- **Next:**

