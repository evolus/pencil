# Specification: Pencil Model Context Protocol (MCP) Server

## 1. Overview & Objective

The Pencil MCP Server provides a standardized bridge adhering to the [Model Context Protocol](https://modelcontextprotocol.io/) (JSON-RPC 2.0). It allows AI assistants and agents (Claude, Cursor, Antigravity, etc.) to programmatically interact with the Evolus Pencil application.

Through this server, agents can:
1. **Design UI Concepts:** Ingest natural language UI descriptions, reason through spatial hierarchy on an 8px baseline grid, and generate syntactically compliant Pencil design JSON using the `pencil-designer` Knowledge Base skill.
2. **Inspect Specific Pages:** Extract full scene graphs, objects, and properties for any specific page in a document (`pencil_get_page_content`).
3. **Render & Preview:** Render design JSON into pixel-accurate PNG previews (multimodal image content) or SVG vector strings, or open them live in the desktop application window.
4. **Query Stencils & Icons:** Query installed stencil collections, shape schemas, and vector icon libraries (Tabler, Lucide, FontAwesome, Material Icons).
5. **Inspect & Manipulate Documents:** Read document structures, active pages, and canvas objects.
6. **Export Artifacts:** Export pages and documents to PNG, SVG, or PDF.

---

## 2. Architecture & Communication Topology

```
┌────────────────────────────────────────────────────────┐
│             External AI Agent / Client                 │
│      (Claude Desktop, Cursor, Antigravity, etc.)       │
└───────────────────────────┬────────────────────────────┘
                            │ stdio / streamableHttp (JSON-RPC 2.0)
                            ▼
┌────────────────────────────────────────────────────────┐
│                Pencil MCP Server CLI                   │
│              (app/tools/mcp/index.js)                  │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Knowledge Base: app/tools/mcp/kb/                │  │
│  │  - skills/pencil-designer/SKILL.md               │  │
│  │  - pencil/ (data types, shapes, output schema)   │  │
│  └──────────────────────────────────────────────────┘  │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP REST / JSON (localhost:1919)
                            ▼
┌────────────────────────────────────────────────────────┐
│                  Evolus Pencil App                     │
│               (app/tools/api-server.js)                │
│             └─ ApplicationPane._instance               │
└────────────────────────────────────────────────────────┘
```

---

## 3. The MCP Knowledge Base (KB) Architecture

The MCP Knowledge Base is a self-contained repository of domain specifications, design constraints, component registries, and agent skills bundled within `app/tools/mcp/kb/`. It provides the normative grounding required for language models to generate valid spatial layouts and correct property serializations.

### 3.1 Topology & File Organization
```
app/tools/mcp/kb/
├── skills/
│   └── pencil-designer/
│       └── SKILL.md            # The UI/UX Spatial Designer skill definition
└── pencil/                     # Core domain specifications
    ├── data_types_specification.md  # Serialized string microformats for all 18 property types
    ├── shapes_specification.md      # Canonical shape registry, property keys, and defaults
    ├── output_schema.md             # Structural JSON specification (canvas + recursive elements)
    └── design_tokens_mini.md        # 8px baseline grid metrics, typography scales, palettes
```

### 3.2 Dynamic Skill Resolution & Auto-Injection Mechanism

To ensure autonomous agents receive complete, self-contained instructions without needing recursive file lookups, the server implements an automated injection pipeline:

1. **On-Demand Skill Loading:**
   When an agent activates a skill via `use_skill(skill_name: "pencil-designer")` or requests the prompt/resource, the server reads `SKILL.md` from `app/tools/mcp/kb/skills/pencil-designer/SKILL.md`.

2. **`<!-- required -->` Specification Inlining:**
   The loader scans the markdown content for reference links marked with `<!-- required -->`:
   ```markdown
   [Data Types Specification](../../pencil/data_types_specification.md) <!-- required -->
   [Shapes Specification](../../pencil/shapes_specification.md) <!-- required -->
   [Output Schema](../../pencil/output_schema.md) <!-- required -->
   [Design Tokens](../../pencil/design_tokens_mini.md) <!-- required -->
   ```
   For every matching link, the loader resolves the relative path to `app/tools/mcp/kb/pencil/`, reads the referenced document, and wraps it in explicit content boundary delimiters:
   ```
   === CONTENT START: ../../pencil/data_types_specification.md
   <full content of data_types_specification.md>
   === CONTENT END
   ```
   This compiles the high-level role instructions and the low-level attribute microformats into a single, unified prompt payload.

3. **Multi-Channel MCP Exposure:**
   The Knowledge Base is accessible through three standard MCP primitives:
   * **Prompts:** Registered with `ListPromptsRequestSchema` and `GetPromptRequestSchema` under prompt ID `pencil-designer`.
   * **Resources:** Accessible via the URI `pencil://skills/pencil-designer`, returning the compiled markdown document.
   * **Tools:** Callable through `use_skill(skill_name)` and `list_skills()`.

### 3.3 Spatial Reasoning Principles Enforced by the Skill
1. **8px Baseline Grid Metric:** All margins, padding, and alignments adhere strictly to multiples of 8 (`8px`, `16px`, `24px`, `32px`, `48px`).
2. **Logical Group Nesting & Relative Local Offsets:**
   * Container nodes declare `type: "group"` and establish a local coordinate anchor.
   * All nested children declare `x` and `y` relative to their parent group anchor (`0,0` is top-left of the group), **never** absolute canvas coordinates.
   * Dimensionless enclosure: Groups have no `box`, `width`, `height`, or `properties`.
3. **Strict Text Serialization:** Property values must match their target microformat exactly (e.g. `Font` as `family|style|weight|size|decor`, `Color` as 8-character hex `#RRGGBBAA`, `StrokeStyle` as `width|dash`).

---

## 4. Complete Tool Specifications

### Tool 1: `pencil_design_ui` (Primary Design Tool)
Receives a natural language user description of a UI concept (e.g., *"A login modal with email input, password input, remember me checkbox, and a primary login button"*), reasons through its visual hierarchy using the `pencil-designer` Knowledge Base, structures elements into logical grouping containers, calculates 8px grid spatial positioning, and compiles the final raw JSON payload.

- **Parameters:**
  ```json
  {
    "type": "object",
    "properties": {
      "prompt": {
        "type": "string",
        "description": "Natural language description of the UI concept, screen, or wireframe."
      },
      "targetWidth": {
        "type": "number",
        "description": "Optional desired canvas width. If omitted, calculated to tightly fit the design."
      },
      "targetHeight": {
        "type": "number",
        "description": "Optional desired canvas height. If omitted, calculated to tightly fit the design."
      },
      "theme": {
        "type": "string",
        "enum": ["light", "dark", "clean-wireframe"],
        "default": "light",
        "description": "Visual theme and styling palette."
      },
      "renderImmediately": {
        "type": "boolean",
        "default": false,
        "description": "If true, immediately sends the compiled JSON to Pencil to render preview images."
      },
      "openAsDocument": {
        "type": "boolean",
        "default": false,
        "description": "If true, also opens the design as a live editable document tab in Pencil."
      }
    },
    "required": ["prompt"]
  }
  ```
- **Returns:**
  ```json
  {
    "design": {
      "canvas": { "width": 480, "height": 360, "backgroundColor": "#f8fafcff" },
      "elements": [
        {
          "type": "group",
          "x": 40,
          "y": 40,
          "elements": [
            {
              "type": "shape",
              "collection": "Evolus.Common",
              "shape": "rect",
              "x": 0,
              "y": 0,
              "properties": {
                "box": "400,280",
                "fillColor": "#ffffffff",
                "strokeColor": "#e2e8f0ff",
                "strokeStyle": "1|"
              }
            }
          ]
        }
      ]
    },
    "summary": "Generated login modal with 8px spatial grid alignment and 3 logical group containers.",
    "preview": {
      "filePath": "/tmp/pencil-render-xyz.png",
      "isImage": true
    }
  }
  ```

---

### Tool 2: `pencil_get_page_content` (Page Inspection Tool)
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

### Tool 3: `pencil_render_design`
Renders a structured Pencil design JSON object into an image (PNG file) or SVG vector string, or opens it directly as an active document in Pencil.

- **Parameters:**
  ```json
  {
    "type": "object",
    "properties": {
      "content": {
        "type": "object",
        "description": "Structured JSON representation of the Pencil design / elements to render."
      },
      "output": {
        "type": "string",
        "enum": ["png", "svg"],
        "default": "png",
        "description": "Output format: 'png' returns a file path on disk, 'svg' returns inline SVG markup."
      },
      "openAsDocument": {
        "type": "boolean",
        "default": false,
        "description": "If true, also opens the rendered design as a new tab/document in the running Pencil UI."
      }
    },
    "required": ["content"]
  }
  ```
- **Returns:**
  * If `output: "png"`: Multimodal MCP Image Content block (`{ type: "image", data: base64, mimeType: "image/png" }`) or file path.
  * If `output: "svg"`: `{ "svg": "<svg ...>...</svg>" }`.

---

### Tool 4: `pencil_list_icons`
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

### Tool 5: `pencil_list_collections`
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

### Tool 6: `pencil_get_shape_definition`
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

---

### Tool 7: `pencil_get_active_document`
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

### Tool 8: `pencil_export_page`
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
