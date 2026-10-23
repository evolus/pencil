# MCP Tool Payload & Layout Blueprint Specification

This document defines the normative schema invariants and layout blueprints for Evolus Pencil tool payloads.

### Tool Communication & Interaction Principles
- **Tool Payloads, Not User Responses:** The schemas defined in this document specify the structured arguments passed to MCP tools (e.g., page configuration for `create_page` / `update_page`, and shape hierarchies passed to `insert_shapes`). The model is **never required to output raw JSON to the user**; it should execute designs directly via MCP tools and communicate with the user using natural conversational markdown, design rationale, and visual previews. (The model may display JSON only if the user explicitly requests to inspect the raw data.)
- **No File Concepts in the Toolchain:** The Pencil MCP server operates live against the active in-memory document canvas. There are no file-system documents or files manipulated in the toolchain; all operations occur directly on the active document session.
- **Two Distinct Tool Targets:**
  1. **Page Canvas Configuration** (passed to `create_page` or `update_page`): Defines viewport boundaries (`width`, `height`) and background color (`background`).
  2. **Shape Elements Hierarchy** (passed as the `shapes` array to `insert_shapes`): Defines the structured tree of shapes and `@group` layout containers to insert.

---

## 1. Tool Payload Overview & Example

When designing a UI screen or component, the model configures the canvas via page tools and inserts shapes via `insert_shapes(shapes: [...])`.

### 1.1 Canvas Setup (`create_page` / `update_page`)
```json
{
  "width": 800,
  "height": 600,
  "background": "#F8FAFCFF"
}
```

### 1.2 Shape Tree Hierarchy (`insert_shapes`)
Below is an example of a composable shape hierarchy passed as the `shapes` parameter to `insert_shapes`:

```json
[
  {
    "id": "card_profile",
    "type": "@group",
    "x": 32,
    "y": 32,
    "children": [
      {
        "id": "card_bg",
        "type": "rectangle",
        "box": { "w": 380, "h": 220 },
        "properties": {
          "fillColor": "#FFFFFFFF",
          "strokeColor": "#E2E8F0FF",
          "strokeStyle": "1|",
          "radius": "12,0"
        }
      },
      {
        "id": "card_content",
        "type": "@group",
        "layout": "vertical",
        "gap": 16,
        "padding": 24,
        "align": "start",
        "children": [
          {
            "id": "header_row",
            "type": "@group",
            "layout": "horizontal",
            "gap": 12,
            "align": "center",
            "children": [
              {
                "id": "user_avatar",
                "type": "rectangle",
                "box": { "w": 40, "h": 40 },
                "properties": {
                  "fillColor": "#EEF2FFFF",
                  "strokeColor": "#C7D2FEFF",
                  "strokeStyle": "1|",
                  "radius": "20,0"
                }
              },
              {
                "id": "user_name",
                "type": "textview",
                "box": { "w": 200, "h": 24 },
                "properties": {
                  "text": "Jane Cooper",
                  "textColor": "#0F172AFF",
                  "textFont": "FiraSans|bold|normal|16px|none|1.2"
                }
              }
            ]
          },
          {
            "id": "user_bio",
            "type": "textview",
            "box": { "w": 332, "h": 48 },
            "properties": {
              "text": "Staff Product Designer working on modern design systems and spatial layouts.",
              "textColor": "#64748BFF",
              "textFont": "FiraSans|regular|normal|13px|none|1.4"
            }
          },
          {
            "id": "action_row",
            "type": "@group",
            "layout": "horizontal",
            "gap": 12,
            "align": "center",
            "children": [
              {
                "id": "btn_cancel",
                "type": "button2",
                "box": { "w": 88, "h": 36 },
                "properties": {
                  "text0": "Dismiss"
                }
              },
              {
                "id": "btn_follow",
                "type": "button2",
                "box": { "w": 96, "h": 36 },
                "properties": {
                  "text0": "Follow",
                  "fillColor": "#2563EBFF",
                  "textColor": "#FFFFFFFF"
                }
              }
            ]
          }
        ]
      }
    ]
  }
]
```

### Key Architectural Patterns Illustrated:
1. **Layered Card Pattern (Unmanaged Outer Group):** The outer `card_profile` is an unmanaged group (`layout: "none"` or omitted). It anchors the background `card_bg` rectangle at `(0, 0)` and places the `card_content` container directly on top of it.
2. **Automated Vertical Sequencing:** The `card_content` group uses `layout: "vertical"` with `padding: 24` and `gap: 16`. Its children (header row, bio text, action row) are automatically stacked sequentially without manual `x`/`y` coordinates.
3. **Automated Horizontal Sequencing:** The `header_row` and `action_row` use `layout: "horizontal"` with `align: "center"` and `gap: 12`. Their children are automatically placed side-by-side.
4. **Dimensions Only:** All children in layout groups only define dimensions (`box: { w, h }`); coordinate placement is entirely handled by the layout engine.
5. **Optional Stencil Properties:** Elements like `btn_cancel` only specify properties they need to customize (`text0`), letting Pencil provide sensible defaults for everything else.

---

## 2. Schema Object Specifications

### 2.1 Page Canvas Specification (used with `create_page` / `update_page`)
| Key | Type | Requirement | Description |
| :--- | :--- | :--- | :--- |
| `width` | `integer` | **Required** | Total width of the canvas page in px (must tightly fit design + padding). |
| `height` | `integer` | **Required** | Total height of the canvas page in px (must tightly fit design + padding). |
| `background` | `string` | Optional | Canvas background color (strict 8-character hex `#RRGGBBAA` e.g. `"#FFFFFFFF"`, or color keyword). |

> [!IMPORTANT]
> **Tight Canvas Boundary Calculation:**
> The canvas `width` and `height` must tightly enclose the complete UI mockup plus consistent outer padding (typically 32px or 48px). **Never** allocate an arbitrary oversized desktop canvas (e.g. `1920x1080`) for a compact card, modal dialog, or mobile screen.

---

### 2.2 Leaf Component Node (`ElementNode`)
An `ElementNode` represents a concrete, renderable shape component instance on the canvas passed within the `shapes` array of `insert_shapes`.

| Key | Type | Format / Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Optional alphanumeric string (e.g., `"btn_submit_01"`, `"input_email"`). | Client identifier mapped to internal engine UUID in `idMap`. |
| `type` | `string` | Exact shape type identifier (e.g., `"Evolus.Common:Button"`, `"button2"`, `"rectangle"`). | Specifies the component stencil type. |
| `x` | `number` | Optional number (px, default: 0). | X coordinate on canvas or delta offset within parent layout container. |
| `y` | `number` | Optional number (px, default: 0). | Y coordinate on canvas or delta offset within parent layout container. |
| `box` | `object` | Optional `{ w, h }` or `{ x, y, w, h }`. | Dimensions and coordinates. Within layout groups, only `w` and `h` are needed. |
| `properties` | `object` | Optional key-value dictionary. **All values MUST be string literals.** | Map of customized stencil properties. |

> [!TIP]
> **Optional Properties & Stencil Defaults:**
> When declaring an `ElementNode`, all stencil properties are completely optional during shape creation. The Pencil engine automatically populates default values defined by the shape's stencil specification. Only specify properties that you intend to customize (e.g. `label`, `text`, custom `fillColor`). This keeps tool payloads lightweight and token-efficient.

---

### 2.3 Spatial Group Container Node (`GroupNode`)
A `GroupNode` organizes multiple layout elements into a cohesive logical unit with automated layout sequencing or local coordinate framing.

| Key | Type | Format / Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Optional alphanumeric string (e.g., `"grp_modal_content"`, `"grp_nav_menu"`). | Unique container identifier mapped in `idMap`. |
| `type` | `string` | Must be the exact literal string `"@group"`. | Identifies this node as a group container. |
| `layout` | `string` | Optional: `"vertical"` (aliases: `"column"`, `"col"`), `"horizontal"` (alias: `"row"`), or `"none"` / omitted. | Automated layout mode. Stacks children sequentially along the axis. |
| `gap` | `number` | Optional positive number (px, default: 0). | Spacing between children. **Only valid on `vertical` and `horizontal` groups; must NOT be specified on null/unmanaged groups.** |
| `padding` | `number` \| `array` \| `object` | Optional scalar `16`, 2-item `[v, h]`, 4-item `[top, right, bottom, left]`, or `{ top, right, bottom, left }` (px, default: 0). | Inner container padding around children. |
| `align` | `string` | Optional: `"start"`, `"center"`, `"end"` (default: `"start"`). | Cross-axis alignment. **Only valid on `vertical` and `horizontal` groups; must NOT be specified on null/unmanaged groups.** |
| `x` | `number` | Optional number (px). | Group anchor X coordinate or delta offset within parent layout container. Top-level groups default to insertion origin `(args.x, args.y)` or `(0, 0)`. |
| `y` | `number` | Optional number (px). | Group anchor Y coordinate or delta offset within parent layout container. Top-level groups default to insertion origin `(args.x, args.y)` or `(0, 0)`. |
| `box` | `object` | Optional `{ w, h }` dimensions. | Explicit bounding box override (if omitted, calculated automatically from children). |
| `children` | `array` | Array of child nodes (`ElementNode` or nested `GroupNode`). | Child elements rendered within this group's coordinate frame. |

> [!NOTE]
> **Group Styling vs. Layout Invariant:**
> A `@group` node has **no visual styling properties** (do NOT add a `properties` dictionary with `fillColor`, `strokeColor`, etc.). However, `@group` acts as an **automated layout container** when `layout` is specified, automatically measuring child dimensions and calculating spatial coordinates.

---

## 3. Spatial Geometry & Coordinate Rules

### 3.1 Automated Layout Sequencing vs. Unmanaged Relative Mode
1. **Automated Layout Mode (`layout: "vertical"` | `"horizontal"`):**
   - Children do **NOT** require manual `x` or `y` coordinates.
   - Children only need dimensions: `box: { w, h }` or `properties: { box: "w,h" }`.
   - The layout engine automatically sequences children along the main axis, adding `gap` spacing between items and enclosing them in `padding`.
   - Cross-axis alignment (`align: "start" | "center" | "end"`) positions children across the secondary axis (horizontal cross-axis for vertical stacks, vertical cross-axis for horizontal rows).
   - If a child *does* define `x` or `y`, it acts as a local fine-tuning delta offset relative to its calculated position.
2. **Unmanaged Relative Mode (`layout: "none"` or omitted):**
   - Places children starting from the container's padded top-left origin `(originX, originY) = (parentBaseX + group.x + pad.left, parentBaseY + group.y + pad.top)`.
   - `child.x` and `child.y` serve as local relative coordinate offsets from that padded container origin.
   - If `child.x` and `child.y` are omitted, children default to the container top-left anchor.
3. **Layering vs. Stacking:**
   - In automated layout groups (`vertical` or `horizontal`), all children are sequenced in order along the axis.
   - To create layered designs (such as a background card rectangle behind content), wrap the background `rectangle` and the layout `@group` inside an unmanaged `@group` (`layout: "none"` or omitted).
4. **Composable Nested Layout Hierarchies:**
   - Both automated and unmanaged `@group` nodes automatically measure their children bottom-up and aggregate their bounding box dimensions (`w`, `h`).
   - Nested groups report their calculated dimensions up to their parent layout containers without requiring manual boundary declarations.

```
Canvas Origin (0, 0)
  │
  └── Outer Card (layout: "vertical", gap: 16, padding: 20)
        │
        ├── Header Label (box: { w: 240, h: 24 })        ──> Sequenced at (20, 20)
        ├── Body Label (box: { w: 240, h: 60 })          ──> Sequenced at (20, 60)
        └── Button Bar (layout: "horizontal", gap: 12)   ──> Sequenced at (20, 136)
              ├── Cancel Button (box: { w: 80, h: 36 })  ──> Placed at (20, 136)
              └── Save Button (box: { w: 100, h: 36 })   ──> Placed at (112, 136)
```

### 3.2 8px Spatial Grid Alignment
To ensure clean visual hierarchy and professional aesthetics:
* Sizing (`box`), margins, paddings, and coordinate offsets should adhere to an **8px grid baseline** (4px permitted for micro-elements: 4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px).
* Align related components consistently along common X or Y axes.

---

## 4. Strict Value Stringification Invariant

Inside an `ElementNode`'s `properties` map, **every single value must be a JSON string literal**. Raw booleans, numbers, arrays, or nested objects are strictly prohibited in the `properties` dictionary.

| Type | Valid Serialized Example | Invalid (Rejected) Example |
| :--- | :--- | :--- |
| `Bool` | `"disabled": "false"` | `"disabled": false` *(raw boolean)* |
| `Num` | `"count": "5"` | `"count": 5` *(raw number)* |
| `Dimension` | `"box": "200,40"` | `"box": [200, 40]` *(raw array)* |
| `Point` | `"radius": "6,0"` | `"radius": {"x": 6, "y": 0}` *(raw object)* |
| `Color` | `"fillColor": "#2563EBFF"` | `"fillColor": "#2563eb"` *(must be 8-digit hex)* |
| `Font` | `"textFont": "FiraSans\|bold\|normal\|14px\|none\|1.2"` | `"textFont": "14px bold"` *(missing segments)* |

---

## 5. Anti-Patterns & Guardrails Reference

When auditing, validating, or generating design payloads, strictly enforce the following rules:

* **Anti-Pattern D1: Unstringified Property Values**
  Passing native JSON types (`true`, `123`, `[1,2]`) inside `properties`. All values must be JSON strings.
* **Anti-Pattern D2: Adding Visual Properties to `@group`**
  Declaring a `properties` dictionary (e.g. `fillColor`, `strokeColor`) on a `@group` node. Groups configure layout (`layout`, `gap`, `padding`, `align`), not visual styling.
* **Anti-Pattern D3: Specifying `gap` or `align` on Null-Layout Groups**
  Supplying `gap` or `align` on an unmanaged group (`layout: "none"` or omitted). These properties are valid only when `layout` is `"vertical"` or `"horizontal"`.
* **Anti-Pattern D4: Misinterpreting Layout Groups as Layered Overlays**
  Placing full-size background shapes inside sequential layout groups (`vertical` or `horizontal`). Background shapes should be layered behind content using an unmanaged `@group` wrapper.
* **Anti-Pattern D5: Corrupted Compound Micro-Formats**
  Omitting required segments in pipe-delimited types:
  - `Font` requires 6 piped segments (`Fam|weight|style|size|decor|lineHeight`).
  - `ShadowStyle` requires 5 piped segments (`dx|dy|size|opacity|color`).
  - `StrokeStyle` requires width and dash array (`width|dash_array`), e.g., `"1|"` for solid.
* **Anti-Pattern D6: Block Layout CSS in RichText**
  Injecting `display: flex`, `margin`, or block styles into `RichText` XHTML. Use semantic inline tags (`<span>`, `<b>`, `<i>`, `<br/>`) only.
* **Anti-Pattern D7: Canvas Boundary Bloat**
  Allocating large default canvas dimensions (e.g., `1920x1080`) when the design content occupies a fraction of that area. Canvas size must tightly wrap elements plus padding.
* **Anti-Pattern D8: Outputting Raw JSON to End-Users Instead of Invoking Tools**
  Dumping raw JSON payloads in conversational responses to the user. The model must invoke MCP tools directly (`insert_shapes`, `render_preview`, etc.) and present conversational explanations with visual previews. Output raw JSON only if the user explicitly asks to inspect it.
