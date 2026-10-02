# Plan: Pencil Model Context Protocol (MCP) Server Implementation

## 1. Scope & References
- **Owner:** levantuan.itvn@gmail.com and Antigravity Agent
- **Branch:** `pencil-mcp-integration`
- **Objective:** Build and integrate a production-ready Model Context Protocol (MCP) server for Evolus Pencil, exposing a rich suite of tools and resources that empower any AI agent (Claude Desktop, Cursor, Antigravity, etc.) to inspect, manipulate, generate, and visually render designs and diagrams in Pencil.
- **Boundaries:**
  - Do not destabilize Pencil's desktop GUI or core Electron rendering engine.
  - Do not introduce breaking changes to existing `.ep` / `.epgz` document formats or stencil definitions.
  - Standardize tool inputs and outputs adhering to official Model Context Protocol (JSON-RPC 2.0).
- **Architecture References:**
  - Model Context Protocol Specification (Anthropic / ModelContextProtocol SDK)
  - Pencil Internal API Bridge (`app/tools/api-server.js`)
  - Pencil Core Runtime (`app/pencil-core/`, `app/views/ApplicationPane.js`, `Canvas.js`)
- **Associated Specs:**
  - [.project-info/mcp-implementation/specs/mcp-server-spec.md](file:///home/ltuan/storage/pencil/.project-info/mcp-implementation/specs/mcp-server-spec.md)
  - [.project-info/specs/pencil-project-spec.md](file:///home/ltuan/storage/pencil/.project-info/specs/pencil-project-spec.md)
- **Associated ADRs:**
  - [.project-info/mcp-implementation/adr/0001-mcp-architecture-and-transport-strategy.md](file:///home/ltuan/storage/pencil/.project-info/mcp-implementation/adr/0001-mcp-architecture-and-transport-strategy.md)

---

## 2. Dependency Graph & Critical Path

```
MILESTONE 1: ARCHITECTURAL FOUNDATION & BRIDGE AUDIT
====================================================
Phase 1: Audit Internal API Server & Desktop Architecture
   │      (Audit app/tools/api-server.js, ApplicationPane methods, port 1919, approve ADR-0001 & living spec)
   ▼
[GATE 1 EXIT: Architecture Approved, Tool Schemas Finalized]
   │
   ▼
MILESTONE 2: MCP SERVER IMPLEMENTATION & EXPANDED TOOL SUITE
============================================================
Phase 2: Implement MCP Server Module & Streamable HTTP Transport
   │      (Mount Streamable HTTP / SSE transport into api-server.js on port 1919)
   ▼
Phase 3: Implement Knowledge Base Delivery Tools
   │      (list_skills, use_skill, read_document from app/tools/mcp/kb/)
   ▼
Phase 4: Implement Stencil & Icon Catalog Tools
   │      (list_collections, get_shape_definition, list_icons)
   ▼
Phase 5: Implement Design Realization & Canvas Manipulation Tools
   │      (render_design, get_active_document, get_page_content, export_page)
   ▼
[GATE 2 EXIT: All Tools Implemented, Functional over Streamable HTTP on port 1919]
   │
   ▼
MILESTONE 3: TESTING, AGENT INTEGRATION & VERIFICATION GATE
===========================================================
Phase 6: Automated Test Harness, Agent Verification & Documentation Gate
   │      (Unit & integration test scripts, client registration, e2e design generation, and setup guide)
   ▼
[GATE 3 EXIT: End-to-End Agent Verification Passed, Documentation Complete]
```

---

## 3. Work Breakdown Structure (WBS)

### Milestone 1: Architectural Foundation & API Bridge Audit

#### Phase 1: Audit Internal API Server & Desktop Architecture
- [x] **Task 001:** Audit `app/tools/api-server.js` and Pencil core hooks (`.project-info/mcp-implementation/tasks/active/task-001-audit-api-server-and-mcp-architecture.md`):
  - Audit existing endpoints (`/json/render`, `/json/collections/icon-list`) and `ApplicationPane._instance` lifecycle.
  - Determine communication mechanics between external MCP server and running Electron application.
  - Formulate and approve ADR-0001 (Direct Embedded Streamable HTTP Server in `app/tools/api-server.js`).
  - Draft living domain specification `specs/mcp-server-spec.md` with full tool schemas.

---

### Milestone 2: MCP Server Implementation & Core Tool Suite

#### Phase 2: Scaffold MCP Server Module & Streamable HTTP Transport
- [ ] **Task 002:** Implement MCP Streamable HTTP / SSE server module (`.project-info/mcp-implementation/tasks/backlog/task-002-mcp-server-scaffolding-and-transport.md`):
  - Setup MCP server router and transport handlers in `app/tools/mcp/server.js`.
  - Mount Streamable HTTP / SSE endpoint (`/mcp` and/or `/sse` + `/message`) directly on Express in `app/tools/api-server.js`.
  - Connect tool handlers directly to in-memory `ApplicationPane._instance` with configuration from `.project-info/local.env`.
  - Validate MCP initialization handshake and capability exchange.

#### Phase 3: Implement Knowledge Base Delivery Tools
- [ ] **Task 003:** Implement KB delivery tools (`.project-info/mcp-implementation/tasks/backlog/task-003-implement-kb-delivery-tools.md`):
  - Tool `list_skills`: Lists all available skills exposed by the server (`pencil-designer`).
  - Tool `use_skill`: Loads and returns instructions from `app/tools/mcp/kb/skills/<skill_name>/SKILL.md`.
  - Tool `read_document`: Reads specification files from `app/tools/mcp/kb/pencil/` (`shapes_specification.md`, `data_types_specification.md`, `output_schema.md`) with section and line slicing.
  - Expose resources (`pencil://skills/pencil-designer`, `pencil://collections`, `pencil://active-document`).

#### Phase 4: Implement Stencil & Icon Catalog Tools
- [ ] **Task 004:** Implement stencil collection and icon catalog tools (`.project-info/mcp-implementation/tasks/backlog/task-004-implement-stencil-and-icon-catalog-tools.md`):
  - Tool `list_collections`: Lists all installed stencil collections and shape definitions from `CollectionManager`.
  - Tool `get_shape_definition`: Returns exact schema, properties, and default values for a shape (or all shapes in a collection when `shapeId` is omitted).
  - Tool `list_icons`: Queries supported icon collections (Tabler, Lucide, FontAwesome, Material) via `ApplicationPane._instance.getIconList`.

#### Phase 5: Implement Design Realization & Canvas Manipulation Tools
- [ ] **Task 005:** Implement canvas realization, page inspection, and export tools (`.project-info/mcp-implementation/tasks/backlog/task-005-implement-canvas-realization-and-document-tools.md`):
  - Tool `render_design`: Accepts agent-constructed design JSON, renders PNG/SVG preview, or opens live in running Pencil window tab (`openAsDocument: true`).
  - Tool `get_active_document`: Returns open document metadata, pages, dimensions, and shape counts.
  - Tool `get_page_content`: Retrieves complete scene graph, shape hierarchy, and property metadata for a specific page by `pageId` or `pageIndex`.
  - Tool `export_page`: Exports active page or document to PNG, SVG, or PDF.

---

### Milestone 3: Testing, Agent Integration & Verification Gate

#### Phase 6: Automated Test Harness, Agent Verification & Documentation Gate
- [ ] **Task 006:** Automated verification suite, agent integration & project closeout (`.project-info/mcp-implementation/tasks/backlog/task-006-agent-integration-and-verification-gate.md`):
  - Build automated test harness in `.project-info/mcp-implementation/tests/` to verify JSON-RPC tool calls against live Pencil instance.
  - Provide client configuration instructions for Claude Desktop, Antigravity, and Cursor (`mcpServers` config).
  - Execute end-to-end prompt: agent discovers skills, reads specs, compiles design JSON, and renders live on Pencil canvas.
  - Document verification report and complete project closeout documentation.

---

## 4. Phase Verification Gates

- **Gate 1 (Milestone 1 Exit - Architecture & Specs Approved):**
  - [x] ADR-0001 committed and approved (Direct Embedded Streamable HTTP Server).
  - [x] Living specification `specs/mcp-server-spec.md` finalized with JSON Schema definitions.
- **Gate 2 (Milestone 2 Exit - Tool Suite Functioning):**
  - [ ] MCP server running cleanly over Streamable HTTP / SSE on port 1919.
  - [ ] All 10 core tools (KB delivery, catalog inspection, canvas realization) returning successful responses from running Pencil instance.
- **Gate 3 (Milestone 3 Exit - End-to-End Agent Validation):**
  - [ ] Verified working directly inside external AI agents (Antigravity / Claude Desktop / Cursor).
  - [ ] Automated test suite in `tests/` passes.
  - [ ] Documentation and setup guide complete and verified by maintainer.
