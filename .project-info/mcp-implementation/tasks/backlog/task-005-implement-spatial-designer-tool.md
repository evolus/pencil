# TASK-005: Implement AI Spatial UI Designer Tool (`pencil_design_ui`)

## Metadata
- **Owner:** levantuan.itvn@gmail.com and Antigravity Agent
- **Branch:** `pencil-mcp-integration`
- **Parent Plan:** [.project-info/mcp-implementation/plans/master-plan.md](file:///home/ltuan/storage/pencil/.project-info/mcp-implementation/plans/master-plan.md)
- **Canonical Docs & Specs:** [.project-info/mcp-implementation/specs/mcp-server-spec.md](file:///home/ltuan/storage/pencil/.project-info/mcp-implementation/specs/mcp-server-spec.md), [app/tools/mcp/kb/skills/pencil-designer/SKILL.md](file:///home/ltuan/storage/pencil/app/tools/mcp/kb/skills/pencil-designer/SKILL.md)
- **Reference Codebase:** `app/tools/mcp/kb/pencil/`, `app/views/ApplicationPane.js`, `app/tools/api-server.js`

## Objective
Implement the `pencil_design_ui` tool on the MCP server. This tool receives a natural language user description of a UI concept (e.g., "A login modal with an email input, password input, and a primary login button"), loads and executes the spatial design reasoning rules from the `pencil-designer` skill (`app/tools/mcp/kb/skills/pencil-designer/SKILL.md`), auto-injects referenced specifications (`app/tools/mcp/kb/pencil/`), calculates correct 8px grid alignments, structures elements with logical grouping containers using relative local coordinates, and outputs a valid Pencil design JSON payload matching the target specification format exactly.

## Acceptance Criteria
- [ ] Tool `pencil_design_ui` exposed and registered in MCP server with schema matching `mcp-server-spec.md`.
- [ ] Tool dynamically reads the `pencil-designer` skill resource from `app/tools/mcp/kb/skills/pencil-designer/SKILL.md` upon invocation.
- [ ] Auto-injects referenced `<!-- required -->` domain specifications from `app/tools/mcp/kb/pencil/` (`data_types_specification.md`, `shapes_specification.md`, `output_schema.md`, `design_tokens_mini.md`) using the specification injection parser.
- [ ] Exposes the skill via `use_skill`, `list_skills`, and MCP Prompts/Resources (`pencil://skills/pencil-designer`).
- [ ] Enforces 4-phase reasoning: Component Inventory -> Grouping Map -> 8px Coordinate Offset Calculation -> Serialization Typing Guard.
- [ ] Generates raw design JSON matching `ApplicationPane.prototype.loadDesignFromObject` (`canvas` + recursive `elements`).
- [ ] Supports optional immediate rendering (`renderImmediately: true`) or direct tab opening (`openAsDocument: true`).

## Implementation Steps
- [ ] Step 1: Implement skill resource loader with `processDocumentAutoInjections` resolving `app/tools/mcp/kb/skills/pencil-designer/SKILL.md` and `app/tools/mcp/kb/pencil/`.
- [ ] Step 2: Implement prompt structuring and spatial layout compiler logic enforcing 8px grids and group nesting.
- [ ] Step 3: Implement `pencil_design_ui` tool handler in the MCP tool registry.
- [ ] Step 4: Validate generated JSON against Pencil canvas rendering with test UI concepts.

## Session Notes & Progress Ledger
### YYYY-MM-DD (Session 1)
- **Verified:**
- **Docs Consulted:**
- **Changes:**
- **Next:**
