# TASK-001: Audit Internal API Server & Finalize MCP Architecture

## Metadata
- **Owner:** levantuan.itvn@gmail.com and Antigravity Agent
- **Branch:** `pencil-mcp-integration`
- **Parent Plan:** [.project-info/mcp-implementation/plans/master-plan.md](file:///home/ltuan/storage/pencil/.project-info/mcp-implementation/plans/master-plan.md)
- **Canonical Docs & Specs:** [.project-info/specs/pencil-project-spec.md](file:///home/ltuan/storage/pencil/.project-info/specs/pencil-project-spec.md), [.project-info/mcp-implementation/specs/mcp-server-spec.md](file:///home/ltuan/storage/pencil/.project-info/mcp-implementation/specs/mcp-server-spec.md), [.project-info/mcp-implementation/adr/0001-mcp-architecture-and-transport-strategy.md](file:///home/ltuan/storage/pencil/.project-info/mcp-implementation/adr/0001-mcp-architecture-and-transport-strategy.md)
- **Reference Codebase:** `app/tools/api-server.js`, `app/views/applicationPane.js`, `app/pencil-core/`

## Objective
Audit the existing `app/tools/api-server.js` implementation, evaluate `ApplicationPane._instance` hooks (`convertDesignJSONToImage`, `getIconList`), verify HTTP response formats, and confirm the decoupled MCP architecture.

## Acceptance Criteria
- [x] Audit `app/tools/api-server.js` and map existing endpoints (`/json/render`, `/json/collections/icon-list`).
- [x] Identify needed additional endpoints in `api-server.js` to support full tool catalog (`pencil_list_collections`, `pencil_get_active_document`, `pencil_get_page_content`).
- [x] Verify MCP transport protocol decision (ADR-0001) and specification requirements (`mcp-server-spec.md`).
- [x] Establish MCP knowledge base location in `app/tools/mcp/kb/skills/pencil-designer` (symlinked during dev, to be published with Pencil app) and keep `.agents/` local-only for `pencil-stencil-creator`.
- [x] Specify `pencil_design_ui` (spatial UI concept compiler), `pencil_get_page_content`, and dynamic skill resource loading in `mcp-server-spec.md`.
- [ ] Define testing procedures for port 1919 integration.

## Implementation Steps
- [x] Step 1: Inspect `app/tools/api-server.js` code and runtime dependencies.
- [x] Step 2: Review `ApplicationPane._instance` methods available for extension.
- [x] Step 3: Establish `.project-info/` governance protocol, master plan, and living specs.
- [x] Step 4: Establish `app/tools/mcp/kb/` structure, symlink `pencil-designer` and supporting specs, and decouple from local-only `.agents/`.
- [ ] Step 5: Prepare scaffolding plan for Task 002.

## Session Notes & Progress Ledger
### 2026-09-30 (Session 2)
- **MCP Server & Knowledge Base Location Selected:** Located in `app/tools/mcp/` alongside existing tools. Symlinked `app/tools/mcp/kb/skills/pencil-designer` -> `../../../../../../framework-doc/skills/pencil-designer` and `app/tools/mcp/kb/pencil` -> `../../../../../framework-doc/pencil`.
- **Dynamic Resource Reading Pattern Specified:** Specified self-contained auto-injection mechanism in `mcp-server-spec.md`, where `pencil_design_ui` dynamically reads `SKILL.md` and inlines `<!-- required -->` referenced specifications (`data_types_specification.md`, `shapes_specification.md`, `output_schema.md`, `design_tokens_mini.md`).
- **Docs Updated:** Updated `local.env`, `master-plan.md`, `mcp-server-spec.md`, and backlog tasks.
- **Next:** Proceed with Task 001 closeout and begin Task 002 (Scaffolding MCP Server Package).
