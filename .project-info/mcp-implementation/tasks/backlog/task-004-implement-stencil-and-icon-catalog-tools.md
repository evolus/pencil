# TASK-004: Implement Stencil & Icon Catalog Tools (`pencil_list_collections`, `pencil_get_shape_definition`, `pencil_list_icons`)

## Metadata
- **Owner:** levantuan.itvn@gmail.com and Antigravity Agent
- **Branch:** `pencil-mcp-integration`
- **Parent Plan:** [.project-info/mcp-implementation/plans/master-plan.md](file:///home/ltuan/storage/pencil/.project-info/mcp-implementation/plans/master-plan.md)
- **Canonical Docs & Specs:** [.project-info/mcp-implementation/specs/mcp-server-spec.md](file:///home/ltuan/storage/pencil/.project-info/mcp-implementation/specs/mcp-server-spec.md)
- **Reference Codebase:** `app/views/ApplicationPane.js`, `app/pencil-core/collectionManager.js`

## Objective
Implement and expose stencil collection and icon catalog inspection tools on the MCP server (`pencil_list_collections`, `pencil_get_shape_definition`, `pencil_list_icons`). These tools allow external agents to inspect available stencils, properties, defaults, and vector icons directly from Pencil's runtime in memory.

## Acceptance Criteria
- [ ] Tool `pencil_list_collections` registered and returns all installed stencil collections and shape identifiers from `CollectionManager`.
- [ ] Tool `pencil_get_shape_definition` registered and returns exact property definitions, data types, and default values for any shape.
- [ ] Tool `pencil_list_icons` registered and returns icon lists from supported icon collections (`ApplicationPane._instance.getIconList`).
- [ ] Direct in-memory invocation via `ApplicationPane._instance` without extra proxy hops.

## Implementation Steps
- [ ] Step 1: Hook into `CollectionManager` and `ApplicationPane._instance` to query stencil collections and shape definitions.
- [ ] Step 2: Implement MCP tool handlers for `pencil_list_collections`, `pencil_get_shape_definition`, and `pencil_list_icons`.
- [ ] Step 3: Verify responses match schemas defined in `mcp-server-spec.md`.

## Session Notes & Progress Ledger
### 2026-10-01 (Session 1)
- **Verified:**
- **Docs Consulted:**
- **Changes:**
- **Next:**

