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
  - Pencil Core Runtime (`app/pencil-core/`, `app/views/applicationPane.js`, `Canvas.js`)
- **Associated Specs:**
  - [.project-info/mcp-implementation/specs/mcp-server-spec.md](file:///home/ltuan/storage/pencil/.project-info/mcp-implementation/specs/mcp-server-spec.md)
- **Associated ADRs:**
  - [.project-info/mcp-implementation/adr/0001-mcp-architecture-and-transport-strategy.md](file:///home/ltuan/storage/pencil/.project-info/mcp-implementation/adr/0001-mcp-architecture-and-transport-strategy.md)

---

## 2. Dependency Graph & Critical Path

```
MILESTONE 1: ARCHITECTURAL FOUNDATION & BRIDGE AUDIT
====================================================
Phase 1: Audit Internal API Server & Desktop Architecture
   │      (Audit app/tools/api-server.js, ApplicationPane methods, port 1919)
   ▼
Phase 2: Formalize MCP Architecture, Transport & Tool Schemas
   │      (Create ADR-0001 and living specs/mcp-server-spec.md)
   ▼
[GATE 1 EXIT: Architecture Approved, Tool Schemas Finalized]
   │
   ▼
MILESTONE 2: MCP SERVER IMPLEMENTATION & EXPANDED TOOL SUITE
============================================================
Phase 3: Implement MCP Streamable HTTP Transport & Server Module
   │      (Integrate MCP server with @modelcontextprotocol/sdk Streamable HTTP into api-server.js)
   ▼
Phase 4: Implement Knowledge Base Delivery & Catalog Tools
   │      (list_skills, use_skill, read_document, pencil_list_collections, pencil_list_icons)
   ▼
Phase 5: Implement Design Realization & Canvas Manipulation Tools
   │      (pencil_render_design, pencil_get_active_document, pencil_get_page_content, pencil_export_page)
   ▼
[GATE 2 EXIT: All Tools Implemented, Functional over Streamable HTTP on port 1919]
   │
   ▼
MILESTONE 3: TESTING, AGENT INTEGRATION & VERIFICATION GATE
===========================================================
Phase 6: Automated Test Harness & Validation Scripts
   │      (Unit & integration tests verifying JSON-RPC tools against live Pencil)
   ▼
Phase 7: End-to-End Agent Verification Gate
   │      (Register MCP server in agent client; verify end-to-end design generation)
   ▼
Phase 8: Documentation, Setup Guide & Project Closeout
```

---

## 3. Work Breakdown Structure (WBS)

### Milestone 1: Architectural Foundation & API Bridge Audit

#### Phase 1: Audit Internal API Server & Desktop Architecture
- [ ] **Task 001:** Audit `app/tools/api-server.js` and Pencil core hooks:
  - Audit existing endpoints (`/json/render`, `/json/collections/icon-list`) and `ApplicationPane._instance` lifecycle.
  - Determine communication mechanics between external MCP server and running Electron application.
  - Document findings and limitations (e.g. process lifecycle, port collisions, headless capabilities).

#### Phase 2: Formalize Architecture, Transports & Tool Schemas
- [ ] **Task 002:** Create `ADR-0001` and Living Specification `specs/mcp-server-spec.md`:
  - Detail decision on Direct Embedded Streamable HTTP Server in `app/tools/api-server.js` vs Standalone CLI Proxy.
  - Define complete catalog of MCP Tools with special focus on `pencil_design_ui` (Spatial Concept Layout Compiler powered by `pencil-designer` skill) and `pencil_get_page_content` (Page Inspection).
  - Define MCP Resources (`pencil://collections`, `pencil://active-document`, `pencil://designer-skill`).

---

### Milestone 2: MCP Server Implementation & Expanded Tool Suite

#### Phase 3: Scaffold MCP Server Module & Streamable HTTP Transport
- [ ] **Task 003:** Implement MCP Streamable HTTP server module in `app/tools/mcp/`:
  - Install `@modelcontextprotocol/sdk` in application dependencies.
  - Implement Streamable HTTP transport and mount `/mcp` route directly on Express in `app/tools/api-server.js`.
  - Connect tool handlers directly to in-memory `ApplicationPane._instance` with configuration from `.project-info/local.env`.

#### Phase 4: Implement Knowledge Base Delivery & Catalog Tools
- [ ] **Task 004:** Implement KB delivery and catalog inspection tools:
  - Tool `list_skills`: Lists all available skills exposed by the server.
  - Tool `use_skill`: Loads and returns instructions from `app/tools/mcp/kb/skills/<skill_name>/SKILL.md`.
  - Tool `read_document`: Reads specification files from `app/tools/mcp/kb/pencil/` (`shapes_specification.md`, `data_types_specification.md`, `output_schema.md`).
  - Tool `pencil_list_collections`: Lists all installed stencil collections and shape definitions.
  - Tool `pencil_get_shape_definition`: Returns exact schema, properties, and default values for any shape.
  - Tool `pencil_list_icons`: Queries supported icon collections (Tabler, Lucide, FontAwesome, Material).

#### Phase 5: Implement Design Realization & Canvas Manipulation Tools
- [ ] **Task 005:** Implement canvas realization, page inspection, and export tools:
  - Tool `pencil_render_design`: Accepts agent-constructed design JSON, renders PNG/SVG preview, or opens live in running Pencil window tab (`openAsDocument: true`).
  - Tool `pencil_get_active_document`: Returns open document metadata, pages, dimensions, and shape counts.
  - Tool `pencil_get_page_content`: Retrieves complete scene graph, shape hierarchy, and property metadata for a specific page by `pageId` or `pageIndex`.
  - Tool `pencil_export_page`: Exports active page or document to PNG, SVG, or PDF.

---

### Milestone 3: Testing, Agent Integration & Verification Gate

#### Phase 6: Automated Test Harness & Validation Scripts
- [ ] **Task 006:** Build validation suite:
  - Automated test script in `.project-info/mcp-implementation/tests/` to start MCP server, ping tools, send test design JSON, and verify outputs.
  - Verify error handling when Pencil desktop app is closed, busy, or restarts.

#### Phase 7: End-to-End Agent Verification Gate
- [ ] **Task 007:** Live Agent Verification:
  - Configure MCP server in Antigravity / Claude Desktop / Cursor.
  - Execute end-to-end prompt: agent designs a multi-screen UI flow, renders previews, and modifies elements.

#### Phase 8: Documentation, Setup Guide & Project Closeout
- [ ] **Task 008:** Final documentation & client installation instructions:
  - Write installation and configuration guide (`README-MCP.md` or docs).
  - Update root documentation and verify clean git status.

---

## 4. Phase Verification Gates

- **Gate 1 (Milestone 1 Exit - Architecture & Specs Approved):**
  - ADR-0001 committed and approved.
  - Tool schemas defined with complete JSON Schema inputs and outputs.
- **Gate 2 (Milestone 2 Exit - Tool Suite Functioning):**
  - MCP server running cleanly over stdio.
  - All core tools (`pencil_render_design`, `pencil_list_icons`, `pencil_list_collections`, etc.) returning successful responses from running Pencil instance.
- **Gate 3 (Milestone 3 Exit - End-to-End Agent Validation):**
  - Verified working directly inside an external AI agent.
  - Documentation complete and verified by human maintainer.
