# Specification: Evolus Pencil Project Architecture & Domain Reference

## Status: Approved (Normative)
- **Document Version:** 1.0.0
- **Authors:** levantuan.itvn@gmail.com and Antigravity Agent
- **Authority Basis:** Extracted strictly and verified against the Evolus Pencil reference codebase (`app/pencil-core/`, `app/views/`, `app/tools/`).
- **Scope:** Repository-wide authoritative domain reference for all engineers and AI agents working on Evolus Pencil.

---

## 1. Executive Summary & System Purpose

**Evolus Pencil** is a cross-platform, open-source GUI prototyping, diagramming, and UI wireframing desktop application built with Electron, Node.js, and web standards (SVG, XHTML, CSS, JavaScript).

### Core Design Philosophy
1. **SVG-Native Canvas:** All visual elements are live SVG nodes. Documents scale infinitely with zero pixelation and map directly to vector web standards.
2. **Dynamic Reactive Stencils:** Stencils are not static vector cutouts; they are mini-applications with typed properties, dynamic geometry handles, procedural SVG generators, and reactive behavior bindings.
3. **Multi-Page Flows:** Documents support multi-page hierarchies, master background pages, inter-page hyperlinks, and page metadata notes.
4. **Open Standard Storage:** Open archive formats (`.epgz`, `.ep`) based on XML manifests, SVG canvas representations, and standard compression (gzip/tar).
5. **Agent & Programmatic Extensibility:** Built-in headless rendering, HTTP API bridge, Model Context Protocol (MCP) server support, and autonomous LLM skills.

---

## 2. Application Topology & Runtime Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                      Electron Main Process (app/index.js)              │
│  - Window Management     - Native Menus          - File Associations   │
│  - Auto-Updater          - CLI Arguments         - Global Shortcuts    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ IPC / BrowserWindow
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Renderer Process (app/app.xhtml & app.js)            │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                     ApplicationPane._instance                    │  │
│  │  - Controller         - Rasterizer           - CanvasPool        │  │
│  │  - DocumentHandler    - CollectionManager    - Shared Editors    │  │
│  └──────────────┬──────────────────────────────────┬────────────────┘  │
│                 │                                  │                   │
│                 ▼                                  ▼                   │
│   ┌───────────────────────────┐      ┌───────────────────────────────┐ │
│   │    SVG Drawing Canvas     │      │   Internal HTTP API Server    │ │
│   │  - <svg id="drawingCanvas">      │   (app/tools/api-server.js)   │ │
│   │  - Target Shapes & Groups │      │   - Port 1919 (Express)       │ │
│   │  - Snapping & Guides      │      │   - /json/render              │ │
│   │  - In-Place Text Editors  │      │   - /json/collections/...     │ │
│   └───────────────────────────┘      └──────────────┬────────────────┘ │
└─────────────────────────────────────────────────────┼──────────────────┘
                                                      │ HTTP / JSON
                                                      ▼
                                       ┌───────────────────────────────┐
                                       │   Pencil MCP Server CLI       │
                                       │   (tools/mcp/index.js)        │
                                       └──────────────┬────────────────┘
                                                      │ stdio (JSON-RPC 2.0)
                                                      ▼
                                       ┌───────────────────────────────┐
                                       │ External AI Agents / Clients  │
                                       │ (Claude, Cursor, Antigravity) │
                                       └───────────────────────────────┘
```

### 2.1 Electron Main Process (`app/index.js`)
* Manages the primary `BrowserWindow` loading `app/app.xhtml`.
* Handles desktop life-cycle events, global shortcuts (`app/tools/global-shortcut-main.js`), file association launches (`.ep`, `.epz`, `.epgz`), and protocol registrations.

### 2.2 Electron Renderer Process (`app/app.xhtml`, `app/app.js`)
* Initialized via `Pencil.boot()` and instantiates the singleton `ApplicationPane._instance`.
* Runs with Node.js integration enabled (`@electron/remote`), allowing direct access to local filesystem, compression streams (`zlib`, `tar-fs`), and child processes.

### 2.3 Core Global Singletons
* `ApplicationPane._instance`: Top-level UI widget coordinating canvas views, toolbars, menus, and document state.
* `Pencil.controller`: Manages undo/redo history, selection, clipboard transfer, and shape mutations.
* `Pencil.rasterizer`: Handles SVG-to-PNG/JPEG off-screen rasterization via canvas rendering.
* `Pencil.documentHandler`: Manages file loading, saving, compression, and temporary staging directories.
* `CollectionManager`: Discovers, installs, parses, and indexes all stencil collections.
* `Config`: Persistent key-value settings store backed by local disk storage.

### 2.4 Internal API Bridge (`app/tools/api-server.js`)
* Embedded Express HTTP server running on `http://127.0.0.1:1919` within the renderer window.
* Directly bridges HTTP calls into `ApplicationPane._instance`:
  * `POST /json/render`: Renders arbitrary design JSON into PNG files or inline SVG vectors, or mounts them directly into active tabs (`openAsDocument`).
  * `POST /json/collections/icon-list`: Queries vector icon catalogues.

---

## 3. Document Formats & Storage Model

Pencil supports three document serialization formats managed by `DocumentHandler.js`:

| Extension | Format Type | Handler | Description |
|-----------|-------------|---------|-------------|
| `.epgz` | Gzipped Tarball (`tar.gz`) | `EpgzHandler.js` | **Default modern format**. Efficient, bundled assets, split pages. |
| `.ep` | Plain XML | `EpHandler.js` | Legacy single uncompressed XML document. |
| `.epz` | Zip Archive | `EpzHandler.js` | Legacy zipped archive bundle. |

### 3.1 Modern `.epgz` Bundle Architecture
An `.epgz` file is a compressed tarball containing:
```
<document-archive.epgz>/
├── content.xml                  # Document manifest, metadata, and page index
├── page_<UUID1>.xml             # Complete SVG/XML content for Page 1
├── page_<UUID2>.xml             # Complete SVG/XML content for Page 2
└── sub_<UUID>/                  # Embedded raster attachments (PNG, JPEG)
```

#### `content.xml` Manifest Schema
```xml
<Document xmlns="http://www.evolus.vn/Namespace/Pencil"
          xmlns:p="http://www.evolus.vn/Namespace/Pencil">
  <Properties>
    <Property name="title">Project Dashboard Wireframe</Property>
    <Property name="description">High-fidelity multi-screen prototype</Property>
    <Property name="author">Product Design Team</Property>
  </Properties>
  <Pages>
    <Page id="a1b2c3d4-..." name="Login Screen" width="1440" height="900">
      <Properties>
        <Property name="background">#ffffff</Property>
      </Properties>
    </Page>
    <Page id="e5f6g7h8-..." name="Dashboard Home" width="1440" height="900"/>
  </Pages>
</Document>
```

#### `page_<UUID>.xml` Schema
Contains the full SVG scene graph for that page wrapped in an `<svg>` root element:
```xml
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:p="http://www.evolus.vn/Namespace/Pencil"
     width="1440" height="900">
  <defs/>
  <!-- Canvas Objects (Shapes & Groups) -->
  <g p:type="Shape" id="shape-1" ...>...</g>
</svg>
```

---

## 4. Canvas, Shapes & Object Model

The drawing canvas is an interactive SVG container (`<svg id="drawingCanvas">`). Every interactive entity on the canvas is an instance of `Target` (`app/pencil-core/target/`):

### 4.1 Target Hierarchy
* `Target` (Abstract base)
  * `Shape` (`<g p:type="Shape">`): An instantiated stencil component.
  * `Group` (`<g p:type="Group">`): A container grouping multiple child Shapes and Groups with collective transforms.
  * `TargetSet`: Represents a multi-selection of distinct shapes/groups being moved or styled together.

### 4.2 Anatomy of a Canvas Shape (`<g p:type="Shape">`)
When a stencil is dragged onto the canvas or inserted via script:
1. The stencil's `<p:Content>` template is cloned into the SVG DOM.
2. All static element `id` attributes are automatically rewritten to `p:name` attributes to avoid DOM ID collisions on canvas.
3. A `<p:metadata>` block is attached containing property values and handle positions:
```xml
<g p:type="Shape" id="shape-4a9f..." p:def="Evolus.Common:rect">
  <p:metadata>
    <p:property name="box">320,180</p:property>
    <p:property name="fillColor">#2563ebff</p:property>
    <p:property name="strokeColor">#1e40afff</p:property>
    <p:property name="strokeStyle">2|</p:property>
    <p:property name="label"><![CDATA[Submit Button]]></p:property>
  </p:metadata>
  <!-- Rendered SVG elements with reactive behavior bindings -->
  <rect p:name="bg" width="320" height="180" fill="#2563eb"/>
  <text p:name="txt" x="160" y="90">Submit Button</text>
</g>
```

### 4.3 Standard Property Names Contract
Pencil's Quick Edit Toolbar and property inspectors bind automatically to **6 canonical property names**:

| Property Name | Property Type | Quick Toolbar Widget | Description |
|---------------|---------------|----------------------|-------------|
| `box` | `Dimension` | Dimensions (W, H) | Overall bounding box size of the shape. |
| `textFont` | `Font` | Font Family, Size, Style | Primary typography definition. |
| `textColor` | `Color` | Color Picker | Primary text foreground color. |
| `fillColor` | `Color` | Color Picker | Primary surface / background fill. |
| `strokeColor` | `Color` | Color Picker | Primary outline / border stroke color. |
| `strokeStyle` | `StrokeStyle` | Stroke Width & Dash Picker | Border width and dash styling. |

### 4.4 In-Place Text Editing Contract (`p:editInfo`)
To allow users to double-click on a shape and edit text directly on canvas, target text elements must declare `p:editInfo`:
```xml
<text p:name="label"
      p:editInfo="label,PlainText">
  Click to Edit
</text>
```
* Attribute format: `p:editInfo="<propertyName>,<propertyType>"` (e.g., `label,PlainText` or `htmlContent,RichText`).

---

## 5. The 18 Engine Property Types

Every shape property in Pencil belongs to one of exactly **18 built-in property types** implemented in `app/pencil-core/propertyType/`:

| # | Type Identifier | JS Class | String Micro-format / Syntax | Key Runtime Methods |
|---|-----------------|----------|------------------------------|---------------------|
| 1 | `Dimension` | `dimension.js` | `"width,height"` (e.g. `"120,40"`) | `w`, `h` numbers |
| 2 | `Color` | `color.js` | `"#RRGGBBAA"`, `"#RGB"`, `"rgb(...)"` | `.toRGBString()`, `.toRGBAString()`, `.getBrightness()` |
| 3 | `Font` | `font.js` | `"family\|style\|weight\|size\|decor"` | `.toCSS()`, `.resized(delta)`, `.bold()`, `.getPixelHeight()` |
| 4 | `PlainText` | `plainText.js` | Raw string (e.g. `"Cancel"`) | `.value`, `.toString()` |
| 5 | `RichText` | `richText.js` | Inline HTML (e.g. `"<b>Save</b> changes"`) | `.value`, `.toHTML()`, `.getPlainText()` |
| 6 | `Bool` | `bool.js` | `"true"` or `"false"` | `.value` (boolean) |
| 7 | `Enum` | `enum.js` | `"selected_value"` | `.value`, `.values` |
| 8 | `Alignment` | `alignment.js` | `"horizontal\|vertical"` | `h` (`left`/`center`/`right`), `v` (`top`/`center`/`bottom`) |
| 9 | `Handle` | `handle.js` | `"x,y"` | Draggable on-canvas control point with constraint callback |
| 10 | `ImageData` | `imageData.js` | `"data:image/..."`, `"collection://..."` | `.w`, `.h`, `.data`, `.url` |
| 11 | `StrokeStyle` | `strokeStyle.js`| `"<width>\|<dasharray>"` (e.g. `"2\|5,2"`) | `.width`, `.array`, `.toCSS()` |
| 12 | `Point` | `point.js` | `"x,y"` | `.x`, `.y` numbers |
| 13 | `Bound` | `bound.js` | `"x,y,w,h"` | `.x`, `.y`, `.w`, `.h` |
| 14 | `Num` | `num.js` | Number string (e.g. `"16"`) | `.value` (float/int) |
| 15 | `CSS` | `css.js` | Raw CSS string | `.value` |
| 16 | `ShadowStyle` | `shadowStyle.js`| `"<dx>\|<dy>\|<blur>\|<color>"` | `.dx`, `.dy`, `.blur`, `.color` |
| 17 | `SnappingData` | `snappingData.js`| Alignment snap line coordinates | `.guides`, `.points` |
| 18 | `RichTextArray` | `richTextArray.js`| Tabular grid cell structure | Multi-column grid rows, cells |

---

## 6. The Reactive Stencil & Behavior Engine

### 6.1 Stencil Collection Package Topology
```
<CollectionName>/
├── Definition.xml          # Normative schema defining Shapes, Shortcuts, Behaviors
├── icons/                  # 32x32 palette thumbnail images
├── vectors/                # Raw SVG vector assets for icons or artwork
└── Layout.xhtml            # (Optional) Custom visual preview layout for sidebar
```

### 6.2 Definition.xml Root Schema
```xml
<Shapes xmlns="http://www.evolus.vn/Namespace/Pencil"
        xmlns:p="http://www.evolus.vn/Namespace/Pencil"
        xmlns:svg="http://www.w3.org/2000/svg"
        id="Evolus.Common"
        displayName="Common Shapes"
        description="Core basic shapes">
  <Properties>
    <!-- Collection-wide shared tokens -->
    <Property name="defaultFont" type="Font">sans-serif|normal|normal|13px|none</Property>
  </Properties>
  <p:Script>
    // Embedded helper functions accessible via collection.*
  </p:Script>
  <Shape id="rect" displayName="Rectangle" icon="icons/rect.png">
    <Properties>...</Properties>
    <Behaviors>...</Behaviors>
    <p:Content>...</p:Content>
  </Shape>
</Shapes>
```

### 6.3 Reactive Execution Sandbox
Inside behavior expressions (`<p:For ref="...">`), Pencil provides a sandboxed execution context:
* `$`: Access to own shape properties (e.g., `$.box.w`, `$.fillColor.toRGBAString()`).
* `$$`: Access to collection-wide shared token properties.
* `Dom`: DOM construction helpers (`Dom.newDOMFragment(specs, doc)`).
* `F`: Geometric and text measurement utilities (`F.measureText(text, font)`, `F.createPath()`).

### 6.4 Key Reactive Behaviors (`app/pencil-core/behavior/commonBehaviors.js`)
* `<Box>`: Binds bounding box position and dimensions to an SVG element.
* `<Fill>`: Binds fill color with transparency support.
* `<StrokeStyle>`: Binds border width, stroke color, and dash array.
* `<Font>` / `<Color>`: Binds typography and text color.
* `<Transform>`: Binds rotation, scaling, or matrix transformations.
* `<DomContent>`: Procedurally constructs SVG elements at runtime (e.g. dynamic tables, repeating list items).
* `<RichTextContent>`: Parses and renders HTML-formatted rich text into formatted SVG `<tspan>` blocks.

---

## 7. Programmatic Design JSON Format

Pencil natively supports ingesting structured design JSON to generate full diagrams, wireframes, and UI flows (`ApplicationPane.prototype.loadDesignFromObject`).

### JSON Schema
```json
{
  "canvas": {
    "width": 1280,
    "height": 800,
    "backgroundColor": "#f8fafc"
  },
  "elements": [
    {
      "type": "shape",
      "collection": "Evolus.Common",
      "shape": "rect",
      "x": 40,
      "y": 40,
      "properties": {
        "box": "360,240",
        "fillColor": "#ffffff",
        "strokeColor": "#e2e8f0",
        "strokeStyle": "1|"
      }
    },
    {
      "type": "group",
      "x": 60,
      "y": 60,
      "elements": [
        {
          "type": "shape",
          "collection": "Evolus.Common",
          "shape": "plainText",
          "x": 0,
          "y": 0,
          "properties": {
            "text": "Card Header Title",
            "textFont": "Inter|normal|600|18px|none",
            "textColor": "#0f172a"
          }
        }
      ]
    }
  ]
}
```

---

## 8. Built-in Icon Collections & Resource System

Pencil bundles major vector icon collections, accessible programmatically via `ApplicationPane.SUPPORTED_ICON_TYPES`:

| Type Key | Collection Identifier | Description |
|----------|-----------------------|-------------|
| `tablerfilled` | `tablerFilledIcons` | Tabler Filled Icon Set |
| `tableroutline` | `tablerOutlineIcons` | Tabler Outline Icon Set |
| `fa` | `fontawesomeIcons` | FontAwesome 5/6 Icons |
| `lucide` | `lucideIcons` | Lucide Vector Icon Suite |
| `cmdi` | `icons.CommunityMaterialIcons`| Material Design Icons |
| `bootstrap` | `bootstrapOfficalIcons` | Bootstrap Official Icons |
| `herosolid` | `heroiconsSolidIcons` | Heroicons Solid Set |
| `herooutline` | `heroiconsOutlineIcons` | Heroicons Outline Set |
| `mingcute` | `mingCuteIcons` | MingCute Icon Suite |
| `glow` | `glowIcons` | Glow Vector Icons |

### Resource URI Resolution
Vector icons and collection assets are referenced via the canonical URI format:
```
collection://vectors/<icon-name>.svg
```
When resolved by `ImageData` (`propertyType/imageData.js`), Pencil extracts and colorizes the SVG vector on canvas.

---

## 9. Export & Rendering Capabilities

Pencil provides automated export pipelines in `app/pencil-core/exporter/`:
1. **Raster Export (PNG / JPEG):** Off-screen rasterization via `Rasterizer.js` with configurable background transparency and resolution scale.
2. **Vector SVG Export:** Produces standalone W3C-compliant SVG files with embedded CSS and fonts.
3. **Multi-Page Web Prototype:** Exports all pages as an interactive HTML5 website with responsive page navigation and click-through link transitions.
4. **PDF Document:** Vector PDF export preserving selectable text and multi-page layouts.

---

## 10. Development, Build & Packaging

### Key CLI Commands
```bash
# Start desktop development instance
yarn start

# Start with dev tools and transparent visuals enabled
yarn start:dev

# Clean build artifacts
yarn clean

# Build platform distributions
yarn dist:linux   # AppImage, deb, rpm, tar.gz
yarn dist:win32   # NSIS Windows installer
yarn dist:osx     # macOS DMG (arm64 & x64)
```

### Critical Engine Invariants for Contributors & Agents
1. **XML Namespace Hygiene:** Always maintain `xmlns:p="http://www.evolus.vn/Namespace/Pencil"` and `xmlns:svg="http://www.w3.org/2000/svg"`. Missing namespaces cause silent XML parsing degradation.
2. **Port 1919 Availability:** The internal Express API server reserves port 1919. Do not bind external conflicting services to this port during testing.
3. **ID vs p:name:** Canvas elements must NOT use static `id="..."` attributes; static IDs cause canvas UUID collisions. Use `p:name="..."` for internal element references.
4. **Color Method Names:** Color objects use `.toRGBString()` and `.toRGBAString()`. The legacy typo `.toRgba()` is strictly invalid.
