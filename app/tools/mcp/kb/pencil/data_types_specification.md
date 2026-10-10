# Data Types Specification & Serialization Reference

This document defines the normative serialization schemas, constraints, regular expressions, and micro-format requirements for property values in Pencil design payloads.

> [!IMPORTANT]
> **Strict Value Stringification Invariant:**
> In Pencil design payloads, **every property value** within an element's `properties` map **MUST be a JSON string literal**. Even if the underlying data type represents a boolean, number, coordinate, or complex compound struct, it must be serialized as a string according to the specifications below.

> [!TIP]
> **Schema Hardening & Normalization in `insert_shapes`:**
> While strict string serialization is normative, the MCP server automatically normalizes common LLM variances (such as object `box: { w, h }` into `"w,h"` and top-level `box: { x, y, w, h }` into coordinates). If an invalid property format or coordinate is supplied, pre-flight validation rejects the payload with actionable diagnostics rather than failing silently.

---

## 1. Complete Property Data Types Matrix (All 18 Engine Types)

The Evolus Pencil engine implements exactly 18 property data types (`app/pencil-core/propertyType/`). In UI design blueprints, shapes declare and serialize these types as string attributes:

| # | Type | Serialization Micro-Format | Validation Regex / Pattern | Engine Source File | Usage Context |
| :- | :--- | :--- | :--- | :--- | :--- |
| 1 | **`Alignment`** | `"[h],[v]"` (0=start, 1=center, 2=end) | `/^[0-2],[0-2]$/` | `alignment.js` | Text / content alignment |
| 2 | **`Bool`** | `"true"` or `"false"` | `/^(true\|false)$/` | `bool.js` | Toggles, states, flags |
| 3 | **`Bound`** | `"[x],[y],[w],[h]"` | `/^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?,\d+(?:\.\d+)?,\d+(?:\.\d+)?$/` | `bound.js` | Rectangular boundaries |
| 4 | **`Color`** | `"#RRGGBBAA"` (8 hex digits) | `/^#[0-9a-fA-F]{8}$/` | `color.js` | Fills, text, borders |
| 5 | **`CSS`** | `"[prop]: [val]; ..."` | Semicolon-delimited key:value pairs | `css.js` | Inline CSS styling |
| 6 | **`Dimension`** | `"[w],[h]"` | `/^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/` | `dimension.js` | Sizing geometry (`$box`) |
| 7 | **`Enum`** | Key from shape specification | `/^[a-zA-Z0-9_-]+$/` | `enum.js` | Categorical selections |
| 8 | **`Font`** | `"[fam]\|[weight]\|[style]\|[size]\|[decor]\|[lh]"` | Exactly 6 pipe segments | `font.js` | Typography styling |
| 9 | **`Handle`** | `"[x],[y]"` | `/^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/` | `handle.js` | Draggable control / corner radius |
| 10 | **`ImageData`** | `"[w],[h],[payload]"` or `"collection://..."` | `w,h` + payload or `collection://@col/res` | `imageData.js` | Icons, bitmaps, SVG assets |
| 11 | **`Num`** | `"[number]"` | `/^[-+]?\d+(?:\.\d+)?$/` | `num.js` | Numeric scalars / counts |
| 12 | **`PlainText`** | Raw text string | Any string | `plainText.js` | Unformatted labels / inputs |
| 13 | **`Point`** | `"[x],[y]"` | `/^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/` | `point.js` | Coordinates / offsets |
| 14 | **`RichText`** | Well-formed XHTML string | Inline XML/XHTML | `richText.js` | Formatted labels / descriptions |
| 15 | **`RichTextArray`** | XML grid `<root><r><c><![CDATA[...]]>...</root>` | XML 2D table grid | `richTextArray.js` | Table / grid cell data |
| 16 | **`ShadowStyle`** | `"[dx]\|[dy]\|[size]\|[opacity]\|[color]"` | Exactly 5 pipe segments | `shadowStyle.js` | Elevation / drop shadow |
| 17 | **`SnappingData`** | `"[type]\|[pos]\|[applyTo]\|[vert]\|[lim1]\|[lim2]"` | Piped guide definition | `snappingData.js` | *Runtime-only guide (not declared in JSON)* |
| 18 | **`StrokeStyle`** | `"[width]\|[dash_pattern]"` | `/^\d+(?:\.\d+)?\|[0-9,.]*$/` | `strokeStyle.js` | Border width and dash pattern |

---

## 2. Detailed Specifications

### 2.1 Alignment
Defines horizontal and vertical alignment within a container or text block.
* **Engine Source:** `pencil-core/propertyType/alignment.js`
* **Format:** `"[h],[v]"`
* **Regex:** `/^[0-2],[0-2]$/` (`Alignment.REG_EX = /^([0-9]+)\,([0-9]+)$/`)
* **Values:**
  * `0`: Start / Left / Top
  * `1`: Center / Middle
  * `2`: End / Right / Bottom
* **Constraints:** No whitespace around the comma.
* **Valid Examples:**
  * `"0,1"`: Left-aligned horizontally, centered vertically (standard for text inputs).
  * `"1,1"`: Centered horizontally and vertically (standard for buttons).
  * `"2,1"`: Right-aligned horizontally, centered vertically (numeric tabular data).
* **Invalid Examples:**
  * `"center,middle"` *(must use 0, 1, 2 numeric codes)*
  * `"1, 1"` *(whitespace forbidden)*

---

### 2.2 Bool
Represents a boolean toggle or state flag.
* **Engine Source:** `pencil-core/propertyType/bool.js`
* **Format:** `"true"` or `"false"`
* **Regex:** `/^(true|false)$/`
* **Constraints:** Must be an explicit lowercase string literal. Never output a raw JSON boolean.
* **Valid Examples:**
  * `"disabled": "false"`
  * `"withCaret": "true"`
* **Invalid Examples:**
  * `"disabled": false` *(raw JSON boolean—causes parser failure)*
  * `"True"` *(capitalized)*

---

### 2.3 Bound
Defines a 2D bounding rectangle with position coordinates and dimensions.
* **Engine Source:** `pencil-core/propertyType/bound.js`
* **Format:** `"[x],[y],[width],[height]"`
* **Regex:** `/^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?,\d+(?:\.\d+)?,\d+(?:\.\d+)?$/` (`Bound.REG_EX = /^([0-9]+)\,([0-9]+)\,([0-9]+)\,([0-9]+)$/`)
* **Constraints:** Four comma-separated numbers without whitespace. Width and height must be non-negative.
* **Valid Examples:**
  * `"0,0,320,48"`
  * `"10,20,150,45"`
* **Invalid Examples:**
  * `"[0, 0, 320, 48]"` *(array syntax forbidden)*
  * `"0,0,-100,50"` *(negative width)*

---

### 2.4 Color
Defines an RGBA color serialized as an 8-character hexadecimal string prefixed with `#`.
* **Engine Source:** `pencil-core/propertyType/color.js`
* **Format:** `"#RRGGBBAA"`
* **Regex:** `/^#[0-9a-fA-F]{8}$/` (`Color.REG_EX = /^#([0-9A-F]{2,2})([0-9A-F]{2,2})([0-9A-F]{2,2})([0-9A-F]{2,2})$/i`)
* **Constraints:**
  * Exactly 9 characters long (leading `#` + 8 hex characters).
  * `RR`, `GG`, `BB` define red, green, blue channels (`00` to `FF`).
  * `AA` defines the alpha opacity channel (`FF` = 100% opaque, `80` = ~50% opacity, `00` = 0% fully transparent).
  * The engine's `Color.prototype.toRGBAString()` outputs this exact 8-character hex format.
  * 6-digit hex (`#RRGGBB`), 3-digit hex (`#RGB`), or CSS color names (`"red"`) are strictly **invalid** in Pencil design payloads.
* **Valid Examples:**
  * `"#2563EBFF"` (opaque Cobalt blue)
  * `"#FFFFFFFF"` (opaque white)
  * `"#0F172AFF"` (opaque Slate 900)
  * `"#00000000"` (fully transparent)
  * `"#00000033"` (20% transparent black backdrop)
* **Invalid Examples:**
  * `"#2563EB"` *(missing 2 alpha characters)*
  * `"rgba(37, 99, 235, 1)"` *(CSS rgba syntax forbidden)*
  * `"transparent"` *(must use `"#00000000"`)*

---

### 2.5 CSS
Contains inline CSS key-value declarations applied to shape styling.
* **Engine Source:** `pencil-core/propertyType/css.js`
* **Format:** `"[property]: [value]; ..."`
* **Constraints:**
  * Standard inline CSS syntax.
  * Every declaration must terminate with a semicolon `;`.
  * **Prohibited:** Block layout styles (`display: flex`, `margin`, `position: absolute`) that interfere with Pencil's coordinate engine.
* **Valid Examples:**
  * `"border-radius: 6px;"`
  * `"opacity: 0.85; stroke-dasharray: 4,4;"`
* **Invalid Examples:**
  * `"display: flex; justify-content: center"` *(missing trailing semicolon, layout styling forbidden)*

---

### 2.6 Dimension
Defines a 2D size pair (width and height). Extensively used for primary shape geometry via the canonical property **`box`**.
* **Engine Source:** `pencil-core/propertyType/dimension.js`
* **Format:** `"[width],[height]"`
* **Regex:** `/^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/` (`Dimension.REG_EX = /^([0-9\.\-]+)\,([0-9\.\-]+)$/`)
* **Constraints:** Two comma-separated numbers without spaces.
* **Valid Examples:**
  * `"200,44"`
  * `"320,64"`
  * `"16,16"`
* **Invalid Examples:**
  * `"200px,44px"` *(units forbidden)*
  * `[200, 44]` *(must be serialized string)*

---

### 2.7 Enum
Defines a selection from a predefined set of categorical string values declared in the shape specification.
* **Engine Source:** `pencil-core/propertyType/enum.js`
* **Format:** `"[value]"`
* **Regex:** `/^[a-zA-Z0-9_-]+$/`
* **Constraints:** Must match one of the exact string value identifiers declared in the shape's property definition (`p:enumValues`).
* **Valid Examples:**
  * `"checked"`
  * `"unchecked"`
  * `"disabled"`
  * `"pill"`
  * `"rounded"`
* **Invalid Examples:**
  * `"1"` *(unless "1" is the explicit declared enum key)*
  * `true` *(enum must be string)*

---

### 2.8 Font
A 6-segment pipe-delimited compound string defining typography styles.
* **Engine Source:** `pencil-core/propertyType/font.js`
* **Format:** `"[family]|[weight]|[style]|[size]|[decoration]|[lineHeight]"`
* **Regex:** `^([^|]+)\|([^|]+)\|([^|]+)\|(\d+(?:\.\d+)?px)\|([^|]+)\|(\d+(?:\.\d+)?)$`
* **Canonical Output:** `Font.prototype.toString()` joins all 6 segments:
  ```javascript
  return [this.family, this.weight, this.style, this.size, this.decor, this.lineHeight].join('|');
  ```
* **Segments (Must provide all 6):**
  1. `family`: Font family string (e.g. `FiraSans`, `Consolas`, `Arial, sans-serif`).
  2. `weight`: `normal`, `bold`, `300`, `400`, `500`, `600`, `700`, `medium`, `semibold`.
  3. `style`: `normal` or `italic`.
  4. `size`: Font size **including the `px` unit** (e.g., `12px`, `14px`, `16px`, `18px`, `24px`).
  5. `decoration`: `none`, `underline`, or `line-through`.
  6. `lineHeight`: Unitless numeric line height multiplier (e.g., `1.0`, `1.2`, `1.5`).
* **Valid Examples:**
  * `"FiraSans|medium|normal|14px|none|1.5"` (Standard body/button font)
  * `"FiraSans|bold|normal|18px|none|1.2"` (Section heading)
  * `"Consolas|normal|normal|13px|none|1.4"` (Code snippet)
* **Invalid Examples:**
  * `"FiraSans|bold|14px"` *(missing segments; must have exactly 6 segments)*
  * `"FiraSans|bold|normal|14|none|1.5"` *(size missing `px` unit)*

---

### 2.9 Handle
Represents an interactive on-canvas drag control point or corner rounding control.
* **Engine Source:** `pencil-core/propertyType/handle.js`
* **Format:** `"[x],[y]"`
* **Regex:** `/^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/` (`Handle.REG_EX = /^([\-0-9\.]+)\,([\-0-9\.]+)$/`)
* **Constraints:** Two comma-separated numbers without whitespace. The engine rounds offsets via `Math.round`.
* **Usage in UI Blueprints:**
  * Used for property `radius` on buttons, inputs, and rectangles to set corner rounding: `"6,0"` gives a 6px corner radius.
  * Used for tip/pointer offsets on callouts, tooltips, or dividers.
* **Valid Examples:**
  * `"6,0"` (6px corner radius)
  * `"8,0"` (8px corner radius)
  * `"0,0"` (Sharp square corners)
* **Invalid Examples:**
  * `"6px,0px"` *(units forbidden)*
  * `{"x": 6, "y": 0}` *(must be string)*

---

### 2.10 ImageData
Represents an image asset (bitmap raster or vector SVG) coupled with its intrinsic dimensions. In Pencil's architecture, there is no distinct "icon" data type; all icons, graphics, and photos are unified under `ImageData`.

* **Engine Source:** `pencil-core/propertyType/imageData.js`
* **Format:** `"[width],[height],[payload]"` or `"collection://[@collectionId/]path/to/resource"`
* **Regex:** `ImageData.REG_EX = /^([0-9]+)\,([0-9]+)\,([^\0]*)$/;` or `/^collection:\/\/(@([^\s\/]+)\/)?(.+)$/`
* **Components & URI Formats:**
  1. **Collection URI (`collection://[@collectionId/]path/to/resource`):**
     The **canonical inline mechanism** for binding stencil collection icons and bitmap assets directly in `insert_shapes` and `update_shapes` property maps:
     - **With explicit collection (`collection://@collectionId/path/to/resource`):** Targets the specified installed stencil collection (e.g. `collection://@lucideIcons/search.svg` or `collection://@tabler-icons/icons/outline/brand-github.svg`).
     - **With implicit collection (`collection://path/to/resource`):** When `@collectionId/` is omitted, the engine automatically resolves the resource from the **collection containing the shape in effect** (i.e. `def.collection`).
     - Assets are copied synchronously into the document's local reference store (`ref://<id>`).
  2. **Dimensioned Reference / Payload (`"[width],[height],[payload]"`):**
     - `width,height`: Intrinsic pixel dimensions of the image asset. Set to `0,0,` to represent an empty image.
     - `payload`:
       - **Document Reference (`ref://<id>`):** High-efficiency reference to an asset copied into the document's `.ref/` storage (e.g. `"ref://f3a1-asset.svg"`).
       - **Data URI (`data:...`):** Inline base64 bitmap (`data:image/png;base64,...`) or SVG string (`data:image/svg+xml,...`).

#### Collection Resources & Inline Mutation:
Stencil collections expose available vector and bitmap assets via `collection.RESOURCE_LIST`.
- To discover available resources, use the `search_resources`, `list_resource_collections`, or `list_resource_dir` MCP tools.
- To assign a collection resource to a shape property, supply the `collection://` URI directly in the element's `properties` map when calling `insert_shapes` or `update_shapes`:
  ```json
  "properties": {
    "url": "collection://@lucideIcons/search.svg"
  }
  ```
  Or referencing a resource from the shape's own stencil collection:
  ```json
  "properties": {
    "url": "collection://icons/search.svg"
  }
  ```
  The engine parses the URI, derives the asset from the target collection (or the shape's owning collection), and attaches it synchronously without requiring separate setter tool invocations or base64 payload transfers.

* **Valid Examples:**
  * `"collection://@lucideIcons/search.svg"` (Explicit cross-collection resource URI)
  * `"@lucideIcons/search.svg"` (Bare collection URI syntax—automatically normalized to canonical `collection://` format)
  * `"collection://icons/search.svg"` (Implicit resource URI within the shape's own collection)
  * `"collection://@tabler-icons/icons/outline/brand-github.svg"` (Explicit Tabler vector icon)
  * `"24,24,ref://a4e21b-search.svg"` (Document reference to collection vector asset)
  * `"48,48,ref://b512c0-avatar.png"` (Document reference to bitmap image asset)
  * `"0,0,"` (Empty image—no asset displayed)
  * `"48,48,data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0..."` (Inline SVG data URI)

#### Pre-Flight Validation & Fuzzy Correction Diagnostics:
Canvas mutation tools (`insert_shapes` and `update_shapes`) perform pre-flight validation on all collection URIs before modifying the canvas DOM:
- **Collection Existence:** Validates that the referenced `@<collectionId>` is loaded in `CollectionManager`. If missing, returns available collection IDs.
- **File Existence on Disk:** Validates that the requested asset exists within the collection directory.
- **Fuzzy Suggestions:** If a resource file is not found, the validator computes Levenshtein distance across existing files in the directory and returns actionable suggestions in the error message (e.g. `"Resource 'radior.svg' not found in collection '@lucideIcons/vectors'. Similar candidates: radio.svg, radar.svg"`).
- **Atomic Safety:** The canvas state remains untouched on validation failure (no partial shape insertions or corrupt undo mementos).
* **Invalid Examples:**
  * `"search.svg"` *(missing `collection://` protocol prefix)*
  * `"ref://asset.svg"` *(missing intrinsic width and height prefix when using raw ref syntax)*

---

### 2.11 Num
A standard numeric scalar serialized as a string.
* **Engine Source:** `pencil-core/propertyType/num.js`
* **Format:** `"[number]"`
* **Regex:** `/^[-+]?\d+(?:\.\d+)?$/`
* **Constraints:** Valid stringified integer or float. Parsed by engine via `parseFloat(literal)`.
* **Valid Examples:**
  * `"42"`
  * `"0"`
  * `"-5.5"`
* **Invalid Examples:**
  * `42` *(raw number without quotes)*
  * `"42px"` *(units forbidden)*

---

### 2.12 PlainText
An unformatted text string.
* **Engine Source:** `pencil-core/propertyType/plainText.js`
* **Format:** Any string content.
* **Constraints:** Escaped as standard JSON string.
* **Valid Examples:**
  * `"Save Changes"`
  * `"Enter your email address..."`

---

### 2.13 Point
Represents a 2D coordinate point anchor.
* **Engine Source:** `pencil-core/propertyType/point.js`
* **Format:** `"[x],[y]"`
* **Regex:** `/^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/` (`Point.REG_EX = /^([\-0-9\.]+)\,([\-0-9\.]+)$/`)
* **Constraints:** Two comma-separated numbers without whitespace.
* **Valid Examples:**
  * `"10,20"`
  * `"-150.5,450.0"`
  * `"0,0"`
* **Invalid Examples:**
  * `"10 20"` *(must use comma separator)*
  * `[10, 20]` *(must be serialized string)*

---

### 2.14 RichText
Contains well-formed XHTML markup rendered inside rich text container shapes.
* **Engine Source:** `pencil-core/propertyType/richText.js`
* **Format:** `"[well-formed XHTML string]"`
* **Constraints:**
  * Must be syntactically valid XML/XHTML.
  * All tags must be properly closed (e.g., `<br/>`, `<b>...</b>`).
  * Double quotes in attributes must be escaped: `\"`.
  * **Only inline tags are permitted:** `<span>`, `<b>`, `<strong>`, `<i>`, `<em>`, `<u>`, `<br/>`, `<a>`.
  * Do NOT inject block layout styles (`display: flex`, `margin`, `position`).
  * Style inheritance: Text inherits the shape's `textColor` and `textFont` properties. Use inline styles inside `<span style=\"...\">` only when specific portions require distinct styling.
* **Valid Examples:**
  * `"<span>Confirm Payment</span>"`
  * `"<span>Don't have an account? <a href=\"#\">Sign up</a></span>"`
  * `"<strong>Warning:</strong> <span style=\"color: #EF4444FF;\">Changes cannot be undone.</span>"`
* **Invalid Examples:**
  * `"<div><p>Hello</p></div>"` *(block tags should be avoided)*
  * `"<span color='#FF0000'>Unclosed"` *(malformed XML)*

---

### 2.15 RichTextArray
Defines a 2D tabular grid of rich text cells, serialized as an XML structure.
* **Engine Source:** `pencil-core/propertyType/richTextArray.js`
* **Format:** XML string containing `<root><r><c><![CDATA[...]]></c></r></root>`
* **Constraints:**
  * `<root>` wraps `<r>` (row) elements.
  * Each `<r>` wraps `<c>` (cell) elements.
  * Cell contents are wrapped in CDATA sections.
* **Usage in UI Blueprints:** Used primarily for table and grid stencil shapes (`datatable`, `grid`).
* **Valid Example:**
  ```xml
  <root><r><c><![CDATA[ID]]></c><c><![CDATA[User]]></c><c><![CDATA[Role]]></c></r><r><c><![CDATA[1]]></c><c><![CDATA[Alice]]></c><c><![CDATA[Admin]]></c></r></root>
  ```
  Serialized in JSON:
  ```json
  "gridData": "<root><r><c><![CDATA[ID]]></c><c><![CDATA[User]]></c></r><r><c><![CDATA[1]]></c><c><![CDATA[Alice]]></c></r></root>"
  ```

---

### 2.16 ShadowStyle
Defines a drop shadow or inner shadow.
* **Engine Source:** `pencil-core/propertyType/shadowStyle.js`
* **Format:** `"[dx]|[dy]|[size]|[opacity]|[color]"`
* **Regex:** Exactly 5 pipe-delimited segments (`ShadowStyle.REG_EX = /^([^\|]+)\|([^\|]+)\|([^\|]+)(\|([^\|]+))?(\|([^\|]+))?$/i`)
* **Segments (Must provide all 5):**
  1. `dx`: Horizontal shadow offset in pixels.
  2. `dy`: Vertical shadow offset in pixels.
  3. `size`: Blur radius / spread. (Negative value indicates an inset shadow).
  4. `opacity`: Float between `0.0` (invisible) and `1.0` (fully opaque).
  5. `color`: 8-digit hex `#RRGGBBAA`.
* **Valid Examples:**
  * `"0|4|12|0.15|#000000FF"` (Subtle floating card elevation)
  * `"0|1|3|0.10|#000000FF"` (Subtle button shadow)
  * `"0|0|0|0|#00000000"` (No shadow)
* **Invalid Examples:**
  * `"0|4|12|0.15"` *(missing color segment; requires all 5)*
  * `"0|4|12|15%|#000000"` *(opacity must be decimal float, color must be 8-digit hex)*

---

### 2.17 SnappingData
Represents magnetic snapping guides on the canvas.
* **Engine Source:** `pencil-core/propertyType/snappingData.js`
* **Format:** `"[type]|[pos]|[applyTo]|[vertical]|[limit1]|[limit2]"`
* **Characteristics & Special Handling:**
  * `SnappingData` is an **internal runtime-only** construct.
  * In `snappingData.js`, static `fromString` deserialization is deliberately commented out because snapping guides are created dynamically by reactive `<Actions>` handlers (e.g., `getSnappingGuide`) inside the canvas engine.
  * **Rule:** SnappingData is never authored as a static design property inside `properties` dictionaries.

---

### 2.18 StrokeStyle
Defines line thickness and stroke dash patterns.
* **Engine Source:** `pencil-core/propertyType/strokeStyle.js`
* **Format:** `"[width]|[dash_pattern]"`
* **Regex:** `/^\d+(?:\.\d+)?\|[0-9,.]*$/` (`StrokeStyle.REG_EX = /^([0-9]+)\|([0-9 \,]*)$/`)
* **Constraints:**
  * `width`: Stroke width in pixels (integer or float).
  * Pipe separator `|`.
  * `dash_pattern`: Comma-separated dash array (e.g. `"4,4"`), or **kept empty after the pipe for solid lines**.
* **Valid Examples:**
  * `"1|"` (1px solid line)
  * `"2|"` (2px solid line)
  * `"1|4,4"` (1px dashed line: 4px dash, 4px gap)
  * `"2|8,4,1,4"` (2px dash-dot pattern)
* **Invalid Examples:**
  * `"1"` *(missing pipe separator)*
  * `"1|solid"` *(solid line must be empty after pipe: `"1|"`, not `"solid"`)*
