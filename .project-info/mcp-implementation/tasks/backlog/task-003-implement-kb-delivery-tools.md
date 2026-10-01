# TASK-003: Implement Knowledge Base Delivery Tools (`list_skills`, `use_skill`, `read_document`)

## Metadata
- **Owner:** levantuan.itvn@gmail.com and Antigravity Agent
- **Branch:** `pencil-mcp-integration`
- **Parent Plan:** [.project-info/mcp-implementation/plans/master-plan.md](file:///home/ltuan/storage/pencil/.project-info/mcp-implementation/plans/master-plan.md)
- **Canonical Docs & Specs:** [.project-info/mcp-implementation/specs/mcp-server-spec.md](file:///home/ltuan/storage/pencil/.project-info/mcp-implementation/specs/mcp-server-spec.md)
- **Reference Codebase:** `app/tools/mcp/kb/`

## Objective
Implement Knowledge Base delivery tools on the MCP server (`list_skills`, `use_skill`, `read_document`). These tools allow external agents (LLMs) to discover `pencil_designer`, load its workflow instructions, and read domain specifications (`data_types_specification.md`, `shapes_specification.md`, `output_schema.md`) on demand.

## Acceptance Criteria
- [ ] Tool `list_skills` registered and returns available skills (`pencil_designer`).
- [ ] Tool `use_skill` loads and returns the content of `app/tools/mcp/kb/skills/<skill_name>/SKILL.md`.
- [ ] Tool `read_document` reads files from `app/tools/mcp/kb/` (with optional `section`, `start_line`, and `end_line` slicing).
- [ ] Registered MCP resources (`pencil://skills/pencil-designer`, `pencil://collections`, `pencil://active-document`).

## Implementation Steps
- [ ] Step 1: Implement KB filesystem resolver in `app/tools/mcp/kb/`.
- [ ] Step 2: Implement `list_skills` and `use_skill` tool handlers in the MCP registry.
- [ ] Step 3: Implement `read_document` with section heading parser and line slicer.
- [ ] Step 4: Verify agent discovery and document reading over Streamable HTTP.

## Session Notes & Progress Ledger
### 2026-10-01 (Session 1)
- **Verified:**
- **Docs Consulted:**
- **Changes:**
- **Next:**

