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
- [x] Identify integration pattern for MCP: direct in-memory calls to `ApplicationPane._instance` via Streamable HTTP mounted in `api-server.js` without redundant intermediate proxy endpoints.
- [x] Formulate and approve ADR-0001 (Direct Embedded Streamable HTTP Server in `app/tools/api-server.js`) and living specification `mcp-server-spec.md`.
- [x] Establish MCP knowledge base location in `app/tools/mcp/kb/skills/pencil-designer` (symlinked during dev, to be published with Pencil app) and keep `.agents/` local-only for `pencil-stencil-creator`.
- [x] Specify `pencil_design_ui` (spatial UI concept compiler), `pencil_get_page_content`, and dynamic skill resource loading in `mcp-server-spec.md`.
- [x] Define testing procedures for port 1919 Streamable HTTP integration.

## Implementation Steps
- [x] Step 1: Inspect `app/tools/api-server.js` code and runtime dependencies.
- [x] Step 2: Review `ApplicationPane._instance` methods available for extension.
- [x] Step 3: Establish `.project-info/` governance protocol, master plan, and living specs.
- [x] Step 4: Establish `app/tools/mcp/kb/` structure, symlink `pencil-designer` and supporting specs, and decouple from local-only `.agents/`.
- [x] Step 5: Update ADR-0001, master plan, and task backlog to reflect Direct Embedded Streamable HTTP architecture.

## Session Notes & Progress Ledger
### 2026-09-30 (Session 2)
- **MCP Server & Knowledge Base Location Selected:** Located in `app/tools/mcp/` alongside existing tools. Symlinked `app/tools/mcp/kb/skills/pencil-designer` -> `../../../../../../framework-doc/skills/pencil-designer` and `app/tools/mcp/kb/pencil` -> `../../../../../framework-doc/pencil`.
- **Dynamic Resource Reading Pattern Specified:** Specified self-contained auto-injection mechanism in `mcp-server-spec.md`, where `pencil_design_ui` dynamically reads `SKILL.md` and inlines `<!-- required -->` referenced specifications (`data_types_specification.md`, `shapes_specification.md`, `output_schema.md`, `design_tokens_mini.md`).
- **Architectural Correction (ADR-0001):** Corrected Option B to Direct Embedded Streamable HTTP Server in `app/tools/api-server.js`. Rejected stdio CLI wrapper as redundant and inferior. Streamable HTTP enables direct in-memory calls to `ApplicationPane._instance`, real-time streaming, concurrent multi-agent connections, and eliminates extra processes.
- **Docs Updated:** Updated `ADR-0001`, `local.env`, `master-plan.md`, `mcp-server-spec.md`, and `task-002` backlog.
- **Next:** User review and approval to retire Task 001 and activate Task 002.

