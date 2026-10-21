<div align="center">
  <img src="logo.png" alt="Pencil Logo" width="96" height="96" />
  <h1>Pencil</h1>
  <p>An open-source GUI prototyping and wireframing application for macOS, Windows, and Linux.</p>

  <p>
    <a href="https://pencil.evolus.vn/">Website</a> &bull;
    <a href="https://pencil.evolus.vn/Downloads.html">Downloads</a> &bull;
    <a href="https://pencil.evolus.vn/Stencils-Templates.html">Stencils &amp; Templates</a>
  </p>

  <p>
    <a href="https://github.com/evolus/pencil/stargazers"><img src="https://img.shields.io/github/stars/evolus/pencil?style=flat&logo=github" alt="GitHub Stars" /></a>
    <a href="version.json"><img src="https://img.shields.io/badge/version-4.0.0-blue.svg" alt="Version" /></a>
    <a href="LICENSE.md"><img src="https://img.shields.io/badge/License-GPL--2.0-green.svg" alt="License" /></a>
    <a href="#supported-platforms"><img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg" alt="Platforms" /></a>
    <a href="https://modelcontextprotocol.io"><img src="https://img.shields.io/badge/MCP-Streamable%20HTTP-orange.svg" alt="MCP Protocol" /></a>
  </p>
</div>

![Pencil V4 Interface and Canvas](screenshot.png)

---

## Overview

**Pencil** is a free, open-source, desktop-native wireframing and prototyping tool for macOS, Windows, and Linux ([pencil.evolus.vn](https://pencil.evolus.vn/)). Built for developers, UX designers, and product teams, it provides an intuitive vector canvas environment for constructing mockups, system diagrams, and user flows using standard vector stencil libraries.

### Key Capabilities & Architecture in V4.0

**Pencil V4.0** introduces native support for the **Model Context Protocol (MCP)**. By embedding a local-first Streamable HTTP server directly inside the Electron runtime on `http://127.0.0.1:1919/mcp`, Pencil connects visual wireframing directly to modern AI programming environments and assistants, including **Claude Desktop**, **Cursor**, **Antigravity**, and **VS Code** without external daemons or CLI proxies.

- **Editable Vector Primitives**: Unlike generative tools that output flat raster images or non-standard code snippets, Pencil generates native, fully editable vector stencils and shapes. Any AI-generated element can be modified, resized, recolored, or reorganized manually on the canvas at any time.
- **100% Local-First & Private**: All document data (`.ep`, `.epz`) and canvas operations remain strictly on the local machine. MCP requests execute directly in the local application process without external telemetry or cloud dependencies.
- **Visual Feedback & QA Loop**: The embedded server exposes a high-fidelity snapshot mechanism (`render_preview`), allowing connected assistants to visually inspect rendering, evaluate spacing, contrast, and alignment, and perform iterative corrections autonomously.
- **Dynamic Layout & Container Management**: Built-in container structures automatically handle padding, element distribution, and layout offsets, eliminating manual coordinate calculations when inserting or reordering components.
- **Design System & Stencil Introspection**: Connected assistants can introspect installed stencil collections (including **shadcn/ui**, **Bootstrap**, **Material Design**, **iOS**, and **Flowcharts**) and search thousands of vector icons (**Tabler**, **Lucide**, **FontAwesome**) on demand.

---

## Quick Start (Prebuilt Binaries)

For end users who do not require building from source:

1. **Download**: Obtain the latest installer or package for your operating system from the [Pencil Downloads Page](https://pencil.evolus.vn/Downloads.html) or [GitHub Releases](https://github.com/evolus/pencil/releases).
2. **Launch**: Open Pencil. You can immediately begin creating wireframes and diagrams using the built-in stencil collections.
3. **Connect AI (Optional)**: To enable AI-assisted prototyping, follow the setup in [Connecting AI Clients](#connecting-ai-clients) below.

---

## Connecting AI Clients

Pencil provides automated configuration generation directly within the application interface. Open **Settings > MCP**, select your target assistant (**Claude Desktop**, **Cursor**, **Antigravity**, or **VS Code**), and click **Copy Configuration** to paste directly into your client.

The internal server operates on `http://127.0.0.1:1919/mcp` (Streamable HTTP / JSON-RPC 2.0). Server status, port assignment, and restarts can be managed directly in the MCP settings pane. To verify endpoint responsiveness externally:

```bash
curl -I http://127.0.0.1:1919/mcp
```

<details>
<summary><strong>Manual Client Configuration Reference</strong></summary>

<br />

### Claude Desktop
Add to `claude_desktop_config.json` (`~/Library/Application Support/Claude/` on macOS, `%APPDATA%\Claude\` on Windows, `~/.config/Claude/` on Linux):

```json
{
  "mcpServers": {
    "pencil": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "http://127.0.0.1:1919/mcp"
      ]
    }
  }
}
```

### Cursor
Add to `.cursor/mcp.json` or configure under **Settings > Features > MCP**:

```json
{
  "mcpServers": {
    "pencil": {
      "url": "http://127.0.0.1:1919/mcp"
    }
  }
}
```

### Antigravity
Add to `mcp_config.json`:

```json
{
  "mcpServers": {
    "pencil": {
      "serverUrl": "http://127.0.0.1:1919/mcp"
    }
  }
}
```

### VS Code
Add to `.vscode/mcp.json` (or user settings under `mcp.servers`):

```json
{
  "servers": {
    "pencil": {
      "type": "http",
      "url": "http://127.0.0.1:1919/mcp"
    }
  }
}
```

</details>

---

## Example Interaction Prompts

AI assistants connected to Pencil can execute complex multi-step canvas workflows. Below are representative prompts:

> [!TIP]
> **Prompting Best Practice**: For the cleanest layouts, explicitly reference your desired stencil library (e.g., *"Use shadcn/ui stencils..."* or *"Pick an icon from the Lucide collection..."*). This instructs the assistant to reuse standardized design system components instead of generic raw rectangles.

### Scaffolding New Screens
- *"Use the shadcn/ui stencil collection to build a standard SaaS authentication screen with an email input, password field, 'Remember me' checkbox, and primary submit button."*
- *"Create a three-tier pricing comparison table (Free, Pro, Enterprise) on the active page, highlighting the Pro tier with a primary accent border."*
- *"Generate a mobile analytics dashboard page containing a top metrics card grid and a recent activity list below it."*

### Component Refinement & Styling
- *"Select all primary call-to-action buttons on this page, update their background fill to #2563EB, and apply an 8px corner radius."*
- *"Adjust the horizontal spacing between the navigation header items to 24px and align them vertically to the center."*
- *"Convert the current card grid layout from 3 columns into a single-column list with 16px row gaps."*

### Icon & Asset Placement
- *"Search the Tabler icon library for a 'settings' outline icon and place it in the top-right corner of the application bar."*
- *"Replace the placeholder circles next to the username labels with user avatar icons from the Lucide collection."*

### Structural Layout Shifts & Visual QA
- *"Shift the page footer down by 120px to make room for an email newsletter subscription block above it."*
- *"Add a new page named 'Account Settings' with sub-tabs for 'General', 'Security', and 'Billing'."*
- *"Inspect the current canvas preview for contrast issues or overlapping elements and adjust misaligned bounds."*

---

## MCP Tools Reference

Pencil exposes its internal API through 5 catalog modules:

| Category | Tools | Description |
| :--- | :--- | :--- |
| **Canvas Mutation** | `insert_shapes`, `update_shapes`, `delete_shapes`, `move_shapes`, `align_shapes`, `distribute_shapes`, `shift_layout`, `select_shapes` | Create, modify, position, and reorder vector shapes, containers, and properties. |
| **Document Management** | `get_active_document`, `get_page_content`, `list_pages`, `create_page`, `update_page`, `rename_page`, `delete_page`, `switch_page`, `export_page` | Manage document structure, multi-page hierarchies, navigation, and exports. |
| **Inspection & Vision** | `render_preview`, `find_shapes`, `find_shapes_in_canvas`, `list_shapes` | Generate visual snapshots for LLM vision inspection and query shape hierarchies. |
| **Stencils & Resources** | `list_collections`, `list_shape_definitions`, `get_shape_definition`, `list_resource_collections`, `list_resource_dir`, `search_resources` | Discover installed stencil libraries, component templates, and vector icon collections. |
| **Guidance & Skills** | `list_skills`, `use_skill`, `read_knowledge_base_document` | Access embedded design rules, stencil construction guidelines, and best practices. |

---

## Stencil & Icon Ecosystem

Pencil includes built-in collections and supports custom stencil installation:

- **UI Framework Stencils**: shadcn/ui, Bootstrap, Material Design, iOS UI, Android UI, Web Elements.
- **Diagramming & Flowcharts**: Flowchart shapes, UML diagrams, entity relationship symbols, mind mapping nodes.
- **Vector Icon Catalogs**: Tabler Icons, Lucide Icons, FontAwesome.

### Stencil Repositories & Resources

Additional collections and export templates can be installed through multiple sources:

- **Official Stencils & Templates Directory**: Browse downloadable collections at [pencil.evolus.vn/Stencils-Templates.html](https://pencil.evolus.vn/Stencils-Templates.html).
- **Community Stencils Repository**: Community-contributed collections are hosted on GitHub at [evolus/stencils-repository](https://github.com/evolus/stencils-repository).
- **In-App Repository Browser**: In Pencil, open **Tools > Manage Collections** to browse the online repository, install stencils directly from archive URLs, or load local `.zip` packages created with the Stencil Generator.

---

## Development & Building from Source

### Prerequisites

- **Node.js**: Version 14 or higher (LTS recommended)
- **Package Manager**: npm or yarn
- **Git**

### Installation

1. Clone the repository and check out the target branch:

   ```bash
   git clone https://github.com/evolus/pencil.git
   cd pencil
   git checkout development
   ```

2. Install project dependencies:

   ```bash
   yarn install
   # or
   npm install
   ```

3. Launch the development build:

   ```bash
   yarn start
   # or
   npm start
   ```

   For dev tools and inspection windows enabled:

   ```bash
   npm run start:dev
   ```

### Packaging & Distribution

To compile production bundles for your host platform:

```bash
# macOS (DMG, universal / arm64 / x64)
npm run dist:osx

# Windows (NSIS Installer)
npm run dist:win32

# Linux (deb, rpm, tar.gz)
npm run dist:linux
```

Output binaries are written to the `dist/` directory.

---

## Supported Platforms

### macOS
- macOS 10.9 and later.
- Native builds available for Apple Silicon (arm64) and Intel (x64).

### Windows
- Windows 7, Windows 10, and Windows 11 (64-bit).

### Linux
- Tested distributions: Ubuntu 18.04+, Debian 10+, Fedora 30+, Arch Linux.
- Community packages:
  - **Arch Linux**: [AUR Package](https://aur.archlinux.org/packages/pencil/)
  - **Gentoo Linux**: [media-gfx/evoluspencil](https://packages.gentoo.org/packages/media-gfx/evoluspencil)

---

## Contributing

Contributions are welcome. Please refer to the following workflow:

1. Fork the repository and create a descriptive feature branch (`feature/your-feature-name`).
2. Adhere to existing code conventions and formatting guidelines defined in `.editorconfig`.
3. Test your changes locally across standard canvas operations and MCP endpoints.
4. Submit a pull request against the integration branch with a concise summary of changes.

For security concerns or defect reports, please open an issue using the provided issue templates.

---

## Star History

<div align="center">
  <a href="https://star-history.com/#evolus/pencil&Date">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=evolus/pencil&type=Date&theme=dark" />
      <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=evolus/pencil&type=Date" />
      <img src="https://api.star-history.com/svg?repos=evolus/pencil&type=Date" alt="Pencil Star History Chart" width="100%" />
    </picture>
  </a>
</div>

---

## License

Pencil is open-source software licensed under the [GNU General Public License v2.0 (GPL-2.0)](LICENSE.md).

Copyright &copy; 2008–2026 Evolus and individual contributors.
