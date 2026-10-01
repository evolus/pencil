# Specification: Pencil Model Context Protocol (MCP) Server

## 1. Overview & Objective

The Pencil MCP Server provides a standardized bridge adhering to the [Model Context Protocol](https://modelcontextprotocol.io/) (JSON-RPC 2.0). It allows external AI assistants and agents (Claude, Cursor, Antigravity, etc.) to programmatically interact with the Evolus Pencil application.

The Pencil MCP server acts as an engine bridge and knowledge provider, **not** an internal AI server. When an agent is asked to design or manipulate wireframes, the agent uses the Pencil MCP server to:
1. **Discover & Load Design Skills:** Discover specialized skills (`list_skills`, `use_skill`) such as `pencil_designer`, and read domain specifications (`read_document`) to learn Pencil's shape catalog, property microformats, and schema rules.
2. **Render & Realize Designs:** Render Agent-constructed Pencil design JSON into pixel-accurate PNG previews (multimodal image content) or SVG vector strings, and open them live in the desktop application window (`pencil_render_design`).
3. **Inspect Document & Page Hierarchy:** Inspect open documents (`pencil_get_active_document`) and extract full scene graphs, objects, and properties for any specific page (`pencil_get_page_content`).
4. **Query Stencils & Icons:** Query installed stencil collections (`pencil_list_collections`), shape schemas and default properties (`pencil_get_shape_definition`), and vector icon libraries (`pencil_list_icons`).
5. **Export Canvas Artifacts:** Export pages and documents to disk in PNG, SVG, or PDF (`pencil_export_page`).

---

## 2. Architecture & Communication Topology

```
┌────────────────────────────────────────────────────────┐
│             External AI Agent / Client                 │
│      (Claude Desktop, Cursor, Antigravity, etc.)       │
└───────────────────────────┬────────────────────────────┘
                            │ Streamable HTTP / SSE (JSON-RPC 2.0)
                            │ http://127.0.0.1:1919/mcp
                            ▼
┌────────────────────────────────────────────────────────┐
│       Evolus Pencil Internal API & MCP Server          │
│               (app/tools/api-server.js)                │
│                                                        │
│  - Streamable HTTP Transport Handler                   │
│  - Direct In-Memory Access to ApplicationPane._instance│
│  - Knowledge Base: app/tools/mcp/kb/                   │
└────────────────────────────────────────────────────────┘
```

---

## 3. The MCP Knowledge Base (KB) & Skill Architecture

The MCP server embeds a self-contained Knowledge Base bundled in `app/tools/mcp/kb/`. It serves as the authoritative source of domain knowledge and instructions for external LLM agents.

### 3.1 Topology & File Organization
```
app/tools/mcp/kb/
├── skills/
│   └── pencil-designer/
│       └── SKILL.md            # The UI/UX Spatial Designer skill definition
└── pencil/                     # Core domain specifications (engine technical invariants)
    ├── data_types_specification.md  # Serialized string microformats for all 18 property types
    ├── shapes_specification.md      # Canonical shape registry, property keys, and defaults
    └── output_schema.md             # Structural JSON specification (canvas + recursive elements)
```

### 3.2 Agent Knowledge Ingestion & Design Workflow

When a user instructs an agent: *"Using pencil mcp, design a login form"*:

```
1. Discovery      -> Agent calls list_skills() and discovers "pencil_designer".
2. Skill Loading  -> Agent calls use_skill("pencil_designer") to load instructions from SKILL.md.
3. Spec Reading   -> Agent calls read_document("/kb/pencil/shapes_specification.md") or
                     read_document("/kb/pencil/data_types_specification.md") for precise syntax.
4. AI Synthesis   -> Agent (LLM) reasons through layout and generates valid Pencil design JSON.
5. Canvas Action  -> Agent calls pencil_render_design(content, openAsDocument: true).
6. Feedback       -> Pencil updates canvas tab in active desktop window and returns preview PNG.
```

---

## 4. Complete Tool Specifications

### 4.1 Knowledge Base Tools

#### Tool 1: `list_skills`
Lists all available skill names and summaries exposed by the Pencil MCP server.

- **Parameters:** `{}` (empty object)
- **Returns:**
  ```json
  {
    "skills": [
      {
        "name": "pencil_designer",
        "description": "Create graphical user interface design in Pencil file format."
      }
    ]
  }
  ```

---

#### Tool 2: `use_skill`
Loads and activates a skill by name. Returns the complete skill workflow instructions from `app/tools/mcp/kb/skills/<skill_name>/SKILL.md`.

- **Parameters:**
  ```json
  {
    "type": "object",
    "properties": {
      "skill_name": {
        "type": "string",
        "description": "The name of the skill to activate (e.g. 'pencil_designer')."
      }
    },
    "required": ["skill_name"]
  }
  ```
- **Returns:**
  ```json
  {
    "skill": "pencil_designer",
    "instructions": "# Skill: Pencil UI Designer\n\n..."
  }
  ```

---

#### Tool 3: `read_document`
Reads a domain specification document or a specific section from the knowledge base.

- **Parameters:**
  ```json
  {
    "type": "object",
    "properties": {
      "doc_path": {
        "type": "string",
        "description": "Path of the document to read (e.g., '/kb/pencil/data_types_specification.md' or '/kb/pencil/shapes_specification.md')."
      },
      "section": {
        "type": "string",
        "description": "Optional specific heading title to extract (returns only that section)."
      },
      "start_line": {
        "type": "integer",
        "description": "Optional starting line number."
      },
      "end_line": {
        "type": "integer",
        "description": "Optional ending line number."
      }
    },
    "required": ["doc_path"]
  }
  ```
- **Returns:**
  ```json
  {
    "doc_path": "/kb/pencil/shapes_specification.md",
    "content": "..."
  }
  ```

---

### 4.2 Pencil Application & Canvas Execution Tools

#### Tool 4: `pencil_render_design` (Primary Design Realization Tool)
Renders a structured Pencil design JSON object (`{ canvas, elements }`) constructed by the agent into an image (PNG) or SVG vector string, and/or opens it directly as an active document tab in the running Pencil application.

- **Parameters:**
  ```json
  {
    "type": "object",
    "properties": {
      "content": {
        "type": "object",
        "description": "Structured JSON representation of the Pencil design ({ canvas, elements }) to render or open."
      },
      "output": {
        "type": "string",
        "enum": ["png", "svg"],
        "default": "png",
        "description": "Output format: 'png' returns an image preview, 'svg' returns inline SVG markup."
      },
      "openAsDocument": {
        "type": "boolean",
        "default": false,
        "description": "If true, also opens the design as a live editable document tab in the running Pencil desktop UI."
      }
    },
    "required": ["content"]
  }
  ```
- **Returns:**
  ```json
  {
    "filePath": "/tmp/pencil-render-12345.png",
    "isImage": true,
    "openedInDocument": true
  }
  ```


---

#### Tool 5: `pencil_get_active_document`
Inspects the currently open document in the Pencil application, listing metadata, pages, dimensions, and object counts.

- **Parameters:** `{}` (empty object)
- **Returns:**
  ```json
  {
    "documentTitle": "Wireframe-Sprint-4.epgz",
    "activePageId": "page-1",
    "pages": [
      {
        "id": "page-1",
        "title": "Home Screen",
        "width": 1440,
        "height": 900,
        "shapeCount": 24
      }
    ]
  }
  ```

---

#### Tool 6: `pencil_get_page_content` (Page Inspection Tool)
Extracts the complete scene graph, shape hierarchy, and property metadata for a specific page from the currently open or active Pencil document.

- **Parameters:**
  ```json
  {
    "type": "object",
    "properties": {
      "pageId": {
        "type": "string",
        "description": "The unique UUID of the page (from pencil_get_active_document). Optional if pageIndex is provided."
      },
      "pageIndex": {
        "type": "number",
        "description": "0-based index of the page in the document page list."
      },
      "format": {
        "type": "string",
        "enum": ["json", "svg", "summary"],
        "default": "json",
        "description": "Format of the returned page content: structured JSON object tree, serialized SVG DOM, or compact summary."
      }
    }
  }
  ```
- **Returns:**
  ```json
  {
    "pageId": "a1b2c3d4-...",
    "pageIndex": 0,
    "title": "Login Flow",
    "dimensions": { "width": 1440, "height": 900 },
    "backgroundColor": "#ffffff",
    "shapeCount": 18,
    "elements": [
      {
        "id": "shape-1",
        "type": "shape",
        "def": "Evolus.Common:rect",
        "box": { "x": 100, "y": 100, "w": 300, "h": 200 },
        "properties": {
          "fillColor": "#2563ebff",
          "strokeColor": "#1e40afff"
        }
      }
    ]
  }
  ```

---

#### Tool 7: `pencil_list_collections`
Lists all stencil collections currently loaded in Pencil with their metadata and available shape identifiers.

- **Parameters:**
  ```json
  {
    "type": "object",
    "properties": {
      "includeShapes": {
        "type": "boolean",
        "default": false,
        "description": "Whether to return the full list of shape IDs for each collection."
      }
    }
  }
  ```
- **Returns:**
  ```json
  {
    "collections": [
      {
        "id": "Evolus.Common",
        "displayName": "Common Shapes",
        "shapeCount": 24,
        "shapes": ["rect", "oval", "triangle", "..."]
      }
    ]
  }
  ```

---

#### Tool 8: `pencil_get_shape_definition`
Returns the complete property schema, default values, and metadata for a specific shape in a collection.

- **Parameters:**
  ```json
  {
    "type": "object",
    "properties": {
      "collectionId": { "type": "string", "description": "The collection ID (e.g. 'Evolus.Common')" },
      "shapeId": { "type": "string", "description": "The shape ID within the collection (e.g. 'rect')" }
    },
    "required": ["collectionId", "shapeId"]
  }
  ```
- **Returns:**
  ```json
  {
    "collectionId": "Evolus.Common",
    "shapeId": "rect",
    "displayName": "Rectangle",
    "properties": {
      "box": { "type": "Dimension", "default": "100,100" },
      "fillColor": { "type": "Color", "default": "#ffffffff" },
      "strokeColor": { "type": "Color", "default": "#000000ff" },
      "strokeStyle": { "type": "StrokeStyle", "default": "1|" }
    }
  }
  ```

---

#### Tool 9: `pencil_list_icons`
Retrieves a list of available icons from built-in or loaded icon collections (e.g. FontAwesome, Material Icons, Tabler).

- **Parameters:**
  ```json
  {
    "type": "object",
    "properties": {
      "iconType": {
        "type": "string",
        "enum": ["cmdi", "bootstrap", "fa", "glow", "herooutline", "herosolid", "lucide", "mingcute", "tablerfilled", "tableroutline"],
        "description": "The icon collection identifier. If omitted, returns all supported icon sets."
      }
    }
  }
  ```
- **Returns:**
  ```json
  {
    "icons": ["home", "account", "settings", "search", "..."]
  }
  ```

---

#### Tool 10: `pencil_export_page`
Exports an active page or entire document to a file on disk.

- **Parameters:**
  ```json
  {
    "type": "object",
    "properties": {
      "pageId": { "type": "string", "description": "Target page ID. If omitted, exports the active page." },
      "format": { "type": "string", "enum": ["png", "svg", "pdf"], "default": "png" },
      "outputPath": { "type": "string", "description": "Destination file path. Optional; defaults to temp." }
    }
  }
  ```

---

## 5. MCP Resources & Prompts

* `pencil://skills/pencil-designer`: Returns the full compiled markdown content of the `pencil-designer` skill with auto-injected specifications.
* `pencil://collections`: Returns summary JSON of all loaded stencil collections.
* `pencil://active-document`: Returns JSON inspection of the currently open document and page list.

---

## 6. Error Handling & Invariants

| Error Code | Error Condition | Recommended Agent Mitigation |
|------------|-----------------|------------------------------|
| `PENCIL_NOT_RUNNING` | Cannot connect to port 1919 | Inform user to launch Pencil or run `yarn start`. |
| `PAGE_NOT_FOUND` | Specified pageId or pageIndex does not exist | Call `pencil_get_active_document` to discover valid page IDs. |
| `INVALID_DESIGN_JSON` | Syntax or schema validation failure | Review `pencil-designer` skill rules and fix structure. |
| `COLLECTION_NOT_FOUND`| Collection ID is invalid | Call `pencil_list_collections` to discover valid IDs. |
| `SHAPE_NOT_FOUND` | Shape ID is invalid | Call `pencil_get_shape_definition` to verify available shapes. |
