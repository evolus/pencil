# Pencil Model Context Protocol (MCP) Server

Evolus Pencil includes a built-in [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server running on `http://127.0.0.1:1919/mcp`. It lets MCP-compatible clients (like Claude Desktop, Cursor, or Antigravity) generate wireframes, inspect the canvas, browse installed stencils, and export designs.

---

## Features

- **Wireframe generation**: Turn prompts into native, editable Pencil shapes on the canvas.
- **Multi-collection support**: Works across all installed and visible stencil collections (Material Desktop, iOS, Bootstrap, Android, etc.), resolving both short names and namespaced IDs automatically.
- **Dynamic page titles**: Names newly created pages using design context or explicit `pageTitle` arguments instead of generic defaults.
- **Canvas inspection**: Clients can read the active document structure, inspect shapes on open pages, and modify existing layouts.
- **Exports**: Export pages directly to PNG, SVG, or PDF on disk.
- **Local only**: Runs entirely on your local machine with no external network calls or cloud dependencies.

---

## Setup

### 1. Start Pencil

Run Pencil as usual:

```bash
yarn start
```

If you need the diagnostic `pencil_status` tool enabled for development:

```bash
yarn start:dev
```

The server listens at `http://127.0.0.1:1919/mcp` using the Streamable HTTP transport.

---

### 2. Configure Your Client

#### Claude Desktop

Add Pencil to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "pencil": {
      "url": "http://127.0.0.1:1919/mcp"
    }
  }
}
```

If your client setup requires a stdio process, use the MCP proxy:

```json
{
  "mcpServers": {
    "pencil": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-proxy", "http://127.0.0.1:1919/mcp"]
    }
  }
}
```

Restart your client after saving the config.

---

## Example Prompts

Once connected, you can ask your AI client things like:

- *"Build an iOS login screen with email and password fields, a remember-me checkbox, and a primary button."*
- *"Generate a desktop dashboard with three stat cards on top and a data table below."*
- *"Inspect the active page and list the elements currently on the canvas."*
- *"Change the label of button 'shape-1' to 'Submit Application' and change its background to green."*
- *"Append a secondary cancel button next to the login button at x=220, y=300."*
- *"Select the login card and submit button on the canvas."*
- *"Delete the outdated placeholder shape 'shape-5'."*
- *"Export the current page to PNG."*

---

## Available Tools

| Tool | Parameters | Description |
|:---|:---|:---|
| `list_skills` | `{}` | List available workflow skills in the knowledge base. |
| `use_skill` | `{ skill_name }` | Load workflow instructions for a skill (e.g., `pencil-designer`). |
| `read_document` | `{ doc_path, section?, start_line?, end_line? }` | Read technical docs and specs with section or line filtering. |
| `list_collections` | `{ includeShapes? }` | List installed and visible stencil collections and shape IDs. |
| `get_shape_definition` | `{ collectionId, shapeId? }` | Get property schemas, types, and default values for a stencil. |
| `list_icons` | `{ iconType? }` | Search and list vector icons (`lucide`, `fa`, `bootstrap`, etc.). |
| `render_design` | `{ content, pageTitle?, output?, openAsDocument? }` | Render design JSON to an image preview or open it in a canvas tab. |
| `get_active_document` | `{}` | Get the active document title, page list, dimensions, and shape counts. |
| `get_page_content` | `{ pageId?, pageIndex?, format? }` | Get page elements, layout coordinates, and shape properties (`json`, `svg`, `summary`). |
| `update_shapes` | `{ pageId?, shapes: [{ shapeId, properties?, box?, zOrder? }] }` | Selectively update properties, dimensions, position, and stacking order of shapes on canvas. |
| `delete_shapes` | `{ pageId?, shapeIds: string[] }` | Remove shapes from canvas by shapeId, clearing selection and capturing undo memento. |
| `insert_shapes` | `{ pageId?, x?, y?, elements: [...] }` | Append new shapes onto an existing canvas without clearing existing shapes. |
| `select_shapes` | `{ pageId?, shapeIds: string[] }` | Highlight and focus shapes on the active desktop canvas window. |
| `export_page` | `{ pageId?, format?, outputPath? }` | Export a page to PNG, SVG, or PDF. |
| `pencil_status` | `{}` | Get server runtime diagnostics (only available when started with `--enable-dev`). |

---

## Good to Know

- **Editable shapes**: All elements added to the canvas are native Pencil shapes, so you can manually select, move, edit, or restyle them anytime.
- **Incremental editing**: With `update_shapes`, `insert_shapes`, and `delete_shapes`, you can iteratively refine existing wireframes while preserving full undo/redo (`Ctrl+Z`) history.
- **Visible collections**: `list_collections` only returns collections currently toggled visible in Pencil to keep context clean.
- **Testing**: Run the automated test suites with:
  ```bash
  NODE_PATH=./app/node_modules node .project-info/mcp-implementation/tests/test-mcp-server.js
  NODE_PATH=./app/node_modules node .project-info/mcp-implementation/tests/test-enhancements.js
  NODE_PATH=./app/node_modules node .project-info/mcp-implementation/tests/test-granular-editing.js
  NODE_PATH=./app/node_modules node .project-info/mcp-implementation/tests/simulate-client-workflow.js
  ```


