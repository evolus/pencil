# Shape Specification & Granular Canvas Insertion Guide

This document defines the normative schema, property conventions, and lifecycle patterns for inserting and mutating shapes on an active Evolus Pencil canvas via the Model Context Protocol (MCP).

---

## 1. Shape Descriptor Structure (`insert_shapes.elements`)

When inserting shapes via `insert_shapes`, provide an array of shape descriptor objects matching this structure:

```json
{
  "id": "optional_client_id",
  "type": "Evolus.Common:Button",
  "x": 100,
  "y": 200,
  "box": {
    "w": 120,
    "h": 36
  },
  "properties": {
    "label": "Save Changes",
    "fillColor": "#2563EBFF",
    "textColor": "#FFFFFFFF"
  }
}
```

### Top-Level Fields

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Optional | Client-defined temporary identifier. Mapped to the assigned engine UUID in the returned `idMap`. |
| `type` | `string` | **Required** | Stencil shape type identifier (e.g. `Evolus.Common:Button`, `Evolus.Common:Rect`, `button2`, or `@group`). |
| `x` | `number` | Optional | X coordinate on canvas or delta offset within parent layout container (default: 0). |
| `y` | `number` | Optional | Y coordinate on canvas or delta offset within parent layout container (default: 0). |
| `box` | `object` | Optional | Bounding box coordinates `{ x, y, w, h }`. Dimensions `w` and `h` override default stencil size. |
| `properties` | `object` | Optional | Key-value dictionary of stencil-specific properties (e.g. `label`, `fillColor`). **All properties are optional**; omitted properties automatically receive stencil defaults. |
| `children` | `array` | Optional | Array of nested shape descriptors when creating composite groups (`type: "@group"`). |
| `layout` | `string` | Optional | Automated layout mode for `@group`: `"vertical"` (column), `"horizontal"` (row), or `"none"`. |
| `gap` | `number` | Optional | Spacing in pixels between consecutive children in layout groups (default: 0). Applicable only when `layout` is `"vertical"` or `"horizontal"`; must not be specified on null/unmanaged groups. |
| `padding` | `number` \| `object` | Optional | Inner padding for layout group in pixels (uniform number, array, or `{ top, right, bottom, left }`). |
| `align` | `string` | Optional | Cross-axis alignment in layout groups (`"start"`, `"center"`, `"end"`, default: `"start"`). Applicable only when `layout` is `"vertical"` or `"horizontal"`; must not be specified on null/unmanaged groups. |

> [!TIP]
> **Minimal Payload Principle & Stencil Defaults:**
> - **All shape properties are optional:** Pencil's engine automatically populates stencil-defined defaults for any omitted property. If a shape does not require customized content or styling, the `properties` dictionary can be completely omitted.
> - **Never echo defaults:** Do NOT copy default property values from `get_shape_definition` into `insert_shapes`. Only specify properties that you need to customize (such as `label`, `text`, or custom accent colors).
> - **Lightweight Payloads:** Specifying only `type`, layout dimensions (`box`), and customized properties minimizes JSON payload size, eliminates token waste, and dramatically accelerates generation speed.

---

## 2. Minimal vs. Verbose Payload Comparison

### Recommended: Minimal Payload
Only specify the shape type, dimensions/coordinates, and customized properties:

```json
{
  "id": "btn_save",
  "type": "Evolus.Common:Button",
  "x": 100,
  "y": 200,
  "box": { "w": 120, "h": 36 },
  "properties": {
    "label": "Save Changes"
  }
}
```

Or for shapes using standard defaults (e.g., placeholder rectangles, default dividers):
```json
{
  "type": "rectangle",
  "box": { "w": 400, "h": 200 }
}
```

### Anti-Pattern: Verbose Payload (Avoid)
Do **not** echo all default properties discovered from `get_shape_definition`:

```json
{
  "id": "btn_save",
  "type": "Evolus.Common:Button",
  "x": 100,
  "y": 200,
  "box": { "w": 120, "h": 36 },
  "properties": {
    "label": "Save Changes",
    "fillColor": "#F3F4F6FF",
    "strokeColor": "#D1D5DBFF",
    "strokeStyle": "1|",
    "textFont": "Liberation Sans|normal|normal|13px|none|1.2",
    "textColor": "#111827FF",
    "disabled": "false"
  }
}
```
*(Redundant properties like `disabled: "false"`, default fonts, or default stroke styles add token overhead without changing visual output.)*

---

## 3. Client ID Mapping (`idMap`) & Engine UUIDs

To preserve document integrity and prevent DOM collisions, the Pencil engine automatically generates unique internal UUIDs (e.g. `3a7f8e12-4c5b-49a0-b8d1-123456789abc`) for all inserted shapes.

When you supply an `id` on an element, the server returns an `idMap` mapping table:

```json
{
  "pageId": "page-1",
  "insertedCount": 2,
  "idMap": {
    "btn_submit": "c7e1081a-821e-4509-847c-50ffc17d740c",
    "lbl_status": "b8a9202f-912b-4610-938d-61aab28e851d"
  }
}
```

### Recommended Workflow:
1. Provide descriptive `id` values in `insert_shapes` (e.g., `"btn_submit"`, `"card_bg"`).
2. Save the returned `idMap` in your agent session context.
3. For subsequent calls to `update_shapes`, `delete_shapes`, or `select_shapes`, use the mapped engine UUIDs:
   ```json
   {
     "shapes": [
       {
         "shapeId": "c7e1081a-821e-4509-847c-50ffc17d740c",
         "properties": { "label": "Submitted!" }
       }
     ]
   }
   ```

---

## 4. Dynamic Shape Discovery

Pencil stencils are modular. Different stencil collections (e.g. Common, Bootstrap, iOS, Flowchart, Material) define distinct properties.

To discover available stencils and their exact property types at runtime:
1. **List installed stencil types:** Call `list_shapes({ query: "button" })` to search by keyword.
2. **Inspect property definitions:** Call `get_shape_definition({ collectionId: "Evolus.Common", shapeId: "Button" })` to view default values, supported property names, and expected microformats.
3. **Remember optionality:** Every property returned by `get_shape_definition` is optional during `insert_shapes`. You only need to supply the properties you want to override from the defaults.

---

## 5. Common Property Formats & Microformats

Pencil properties use typed microformats (see also `data_types_specification.md`):

| Property Type | Format | Example |
| :--- | :--- | :--- |
| **Dimension (`box`)** | `"w,h"` string | `"120,36"` (width 120px, height 36px) |
| **Color** | 8-character hex `#RRGGBBAA` | `"#2563EBFF"` (blue), `"#FFFFFFFF"` (white), `"transparent"` |
| **Font** | Pipe-delimited string `[family]\|[weight]\|[style]\|[size]\|[decor]\|[lh]` | `"FiraSans\|normal\|normal\|14px\|none\|1.5"` |
| **Alignment** | `"[h],[v]"` where 0=start, 1=center, 2=end | `"0,1"` (left, middle), `"1,1"` (center, middle) |
| **Stroke Style** | `"[width]\|[dash_pattern]"` | `"1\|"` (solid 1px), `"2\|4,4"` (dashed 2px) |
| **Radius** | `"[rx],[ry]"` | `"6,0"` (6px corner radius) |
| **Boolean** | `"true"` or `"false"` (or boolean literal) | `false`, `"true"` |

---

## 6. Granular Micro-Adjustments with `update_shapes`

Once shapes are inserted, use `update_shapes` for fast adjustments:

- **By Exact ID:**
  ```json
  { "shapeId": "c7e1081a...", "properties": { "label": "New Label" } }
  ```
- **By Semantic Query (Single-Match):**
  ```json
  { "query": { "text": "Save Changes" }, "box": { "dx": 10 } }
  ```
- **By Active Desktop Selection:**
  ```json
  { "target": "selected", "properties": { "fillColor": "#10B981FF" } }
  ```
