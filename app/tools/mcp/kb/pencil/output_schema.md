# Output Schema & JSON Blueprint Specification

This document defines the normative structural blueprint and schema invariants for Evolus Pencil design payloads. An LLM or automated tool generating UI designs must output **only** valid JSON matching this exact hierarchical structure.

The standard file extension for this format is **`.ep.json`**.

---

## 1. Root Document Structure

A valid `.ep.json` document consists of a root JSON object with exactly two top-level keys:
1. **`canvas`**: Defines viewport boundaries, sizing, and background fill.
2. **`elements`**: An ordered array of layout nodes (`ElementNode` or `GroupNode`).

```json
{
  "canvas": {
    "width": 1024,
    "height": 768,
    "backgroundColor": "#FFFFFFFF"
  },
  "elements": [
    {
      "id": "header_container",
      "type": "@group",
      "x": 32,
      "y": 32,
      "children": [
        {
          "id": "header_bg",
          "type": "rectangle",
          "x": 0,
          "y": 0,
          "properties": {
            "box": "960,64",
            "fillColor": "#F8FAFCFF",
            "strokeColor": "#E2E8F0FF",
            "strokeStyle": "1|",
            "radius": "8,0"
          }
        },
        {
          "id": "header_title",
          "type": "textview",
          "x": 24,
          "y": 20,
          "properties": {
            "box": "200,24",
            "text": "Dashboard",
            "textColor": "#0F172AFF",
            "textFont": "FiraSans|bold|normal|18px|none|1.2",
            "align": "0,1"
          }
        }
      ]
    },
    {
      "id": "btn_new_project",
      "type": "button2",
      "x": 840,
      "y": 48,
      "properties": {
        "box": "136,36",
        "text0": "New Project",
        "fillColor": "#2563EBFF",
        "textColor": "#FFFFFFFF",
        "textFont": "FiraSans|medium|normal|14px|none|1.5",
        "icon": "16,16,ref://tablerOutlineIcons/outline/plus.svg",
        "radius": "6,0",
        "disabled": "false"
      }
    }
  ]
}
```

---

## 2. Schema Object Specifications

### 2.1 Root Object
| Key | Type | Requirement | Description |
| :--- | :--- | :--- | :--- |
| `canvas` | `object` | **Required** | Defines canvas boundaries and canvas background styling. |
| `elements` | `array` | **Required** | Tree array of top-level layout nodes (`ElementNode` or `GroupNode`). |

---

### 2.2 Canvas Object (`canvas`)
| Key | Type | Format / Constraints | Description |
| :--- | :--- | :--- | :--- |
| `width` | `integer` | Positive integer (px). Must tightly fit design + padding. | Total width of the design canvas. |
| `height` | `integer` | Positive integer (px). Must tightly fit design + padding. | Total height of the design canvas. |
| `backgroundColor` | `string` | Strict 8-character hex `#RRGGBBAA` (e.g. `"#FFFFFFFF"`). | Canvas viewport background color. |

> [!IMPORTANT]
> **Tight Canvas Boundary Calculation:**
> The canvas `width` and `height` must tightly enclose the complete UI mockup plus consistent outer padding (typically 32px or 48px). **Never** allocate an arbitrary oversized desktop canvas (e.g. `1920x1080`) for a compact card, modal dialog, or mobile screen.

---

### 2.3 Leaf Component Node (`ElementNode`)
An `ElementNode` represents a concrete, renderable shape component instance on the canvas.

| Key | Type | Format / Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Unique alphanumeric string (e.g., `"btn_submit_01"`, `"input_email"`). | Unique identifier across the entire document. |
| `type` | `string` | Exact shape type identifier from the active collection's shape specification (e.g., `"button2"`, `"inputtext"`, `"rectangle"`). | Specifies the component type. |
| `x` | `number` | Integer or float (px). | X coordinate (absolute if root; local offset if inside a group). |
| `y` | `number` | Integer or float (px). | Y coordinate (absolute if root; local offset if inside a group). |
| `properties` | `object` | Key-value dictionary. **All values MUST be string literals.** | Explicit map of all properties defined by the shape spec. |

> [!IMPORTANT]
> **Mandatory Properties Completeness:**
> When declaring an `ElementNode`, all properties specified in the shape's definition schema must be explicitly declared in the `properties` dictionary. Missing properties can cause undefined behavior in the Pencil rendering engine.

---

### 2.4 Spatial Group Container Node (`GroupNode`)
A `GroupNode` organizes multiple layout elements into a cohesive logical unit with its own local coordinate system.

| Key | Type | Format / Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Unique alphanumeric string (e.g., `"grp_modal_content"`, `"grp_nav_menu"`). | Unique container identifier. |
| `type` | `string` | Must be the exact literal string `"@group"`. | Identifies this node as a group container. |
| `x` | `number` | Integer or float (px). | Group anchor X coordinate offset. |
| `y` | `number` | Integer or float (px). | Group anchor Y coordinate offset. |
| `children` | `array` | Array of child nodes (`ElementNode` or nested `GroupNode`). | Child elements rendered within this group's coordinate frame. |

> [!CAUTION]
> **Dimensionless Group Invariant:**
> A `@group` node **MUST NOT** define `width`, `height`, or a `properties` dictionary. Groups in Pencil have no bounding box or visual styling—they exist purely as spatial translation anchors.

---

## 3. Spatial Geometry & Coordinate Rules

### 3.1 Absolute Canvas vs. Relative Group Coordinates
1. **Top-Level Root Elements:**
   Elements residing directly in the root `elements` array use **absolute canvas coordinates** relative to the canvas origin `(0, 0)` at the top-left corner.
2. **Children Inside `@group`:**
   Children inside a group's `children` array use **relative local coordinates**. Their `x` and `y` represent pixel offsets from the parent group's origin `(0, 0)`.
3. **Nested Groups Coordinate Accumulation:**
   If groups are nested, each layer offsets relative to its immediate parent. For example:
   - Root `@group` at `x: 100, y: 100`
   - Child `@group` at `x: 20, y: 30` (canvas absolute: `120, 130`)
   - Leaf `ElementNode` inside child group at `x: 10, y: 10` (canvas absolute: `130, 140`)

```
Canvas Origin (0, 0)
  │
  └── Root Group (x: 100, y: 100)
        │
        └── Child Group (x: 20, y: 30)  ──> Local Origin (0, 0)
              │
              └── Button (x: 10, y: 10) ──> Renders at Canvas (130, 140)
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
| `Font` | `"textFont": "FiraSans\|bold\|normal\|14px\|none\|1.5"` | `"textFont": "14px bold"` *(missing segments)* |

---

## 5. Anti-Patterns & Guardrails Reference

When auditing, validating, or generating `.ep.json` layouts, strictly enforce the following rules:

* **Anti-Pattern D1: Unstringified Property Values**
  Passing native JSON types (`true`, `123`, `[1,2]`) inside `properties`. All values must be JSON strings.
* **Anti-Pattern D2: Adding Bounds or Properties to `@group`**
  Declaring `width`, `height`, or a `properties` block on a `@group` node.
* **Anti-Pattern D3: Canvas-Absolute Coordinates Inside Groups**
  Using global canvas coordinates for elements placed inside a `@group`. Child coordinates must always be relative local offsets from the group anchor.
* **Anti-Pattern D4: Corrupted Compound Micro-Formats**
  Omitting required segments in pipe-delimited types:
  - `Font` requires 6 piped segments (`Fam|weight|style|size|decor|lineHeight`).
  - `ShadowStyle` requires 5 piped segments (`dx|dy|size|opacity|color`).
  - `StrokeStyle` requires width and dash array (`width|dash_array`), e.g., `"1|"` for solid.
* **Anti-Pattern D5: Block Layout CSS in RichText**
  Injecting `display: flex`, `margin`, or block styles into `RichText` XHTML. Use semantic inline tags (`<span>`, `<b>`, `<i>`, `<br/>`) only.
* **Anti-Pattern D6: Canvas Boundary Bloat**
  Allocating large default canvas dimensions (e.g., `1920x1080`) when the design content occupies a fraction of that area. Canvas size must tightly wrap elements plus padding.
