# Aura Design Tokens Reference

This document details all the foundational design tokens defined in Phase 1 of the visual language framework. These tokens serve as the single source of truth for styles, color themes, spacing, typography, and elevation layers.

---

## 🎨 Color System (TOK-COLOR & TOK-GRAY)

### 1. Brand Palette (Cobalt Blue)
Determines primary interactive target states, focal points, and highlighting elements.

| Token Name | Hex Code | CSS Custom Property |
| :--- | :---: | :--- |
| `brand-50` | <span style="display:inline-block; width:16px; height:16px; background-color:#eff6ff; border:1px solid #cbd5e1; border-radius:4px; vertical-align:middle; margin-right:8px;"></span>`#eff6ff` | `--token-color-brand-50` |
| `brand-100` | <span style="display:inline-block; width:16px; height:16px; background-color:#dbeafe; border:1px solid #cbd5e1; border-radius:4px; vertical-align:middle; margin-right:8px;"></span>`#dbeafe` | `--token-color-brand-100` |
| `brand-200` | <span style="display:inline-block; width:16px; height:16px; background-color:#bfdbfe; border:1px solid #cbd5e1; border-radius:4px; vertical-align:middle; margin-right:8px;"></span>`#bfdbfe` | `--token-color-brand-200` |
| `brand-300` | <span style="display:inline-block; width:16px; height:16px; background-color:#93c5fd; border:1px solid #cbd5e1; border-radius:4px; vertical-align:middle; margin-right:8px;"></span>`#93c5fd` | `--token-color-brand-300` |
| `brand-400` | <span style="display:inline-block; width:16px; height:16px; background-color:#60a5fa; border:1px solid #cbd5e1; border-radius:4px; vertical-align:middle; margin-right:8px;"></span>`#60a5fa` | `--token-color-brand-400` |
| `brand-500` | <span style="display:inline-block; width:16px; height:16px; background-color:#3b82f6; border:1px solid #cbd5e1; border-radius:4px; vertical-align:middle; margin-right:8px;"></span>`#3b82f6` | `--token-color-brand-500` |
| `brand-600` | <span style="display:inline-block; width:16px; height:16px; background-color:#2563eb; border:1px solid #cbd5e1; border-radius:4px; vertical-align:middle; margin-right:8px;"></span>`#2563eb` | `--token-color-brand-600` |
| `brand-700` | <span style="display:inline-block; width:16px; height:16px; background-color:#1d4ed8; border:1px solid #cbd5e1; border-radius:4px; vertical-align:middle; margin-right:8px;"></span>`#1d4ed8` | `--token-color-brand-700` |
| `brand-800` | <span style="display:inline-block; width:16px; height:16px; background-color:#1e40af; border:1px solid #cbd5e1; border-radius:4px; vertical-align:middle; margin-right:8px;"></span>`#1e40af` | `--token-color-brand-800` |
| `brand-900` | <span style="display:inline-block; width:16px; height:16px; background-color:#1e3a8a; border:1px solid #cbd5e1; border-radius:4px; vertical-align:middle; margin-right:8px;"></span>`#1e3a8a` | `--token-color-brand-900` |
| `brand-950` | <span style="display:inline-block; width:16px; height:16px; background-color:#172554; border:1px solid #cbd5e1; border-radius:4px; vertical-align:middle; margin-right:8px;"></span>`#172554` | `--token-color-brand-950` |

### 2. Primary Palette (Amethyst Purple)
Used for secondary accents, complex workflows, and visual differentiation.

| Token Name | Hex Code | CSS Custom Property |
| :--- | :---: | :--- |
| `primary-50` | <span style="display:inline-block; width:16px; height:16px; background-color:#f5f3ff; border:1px solid #cbd5e1; border-radius:4px; vertical-align:middle; margin-right:8px;"></span>`#f5f3ff` | `--token-color-primary-50` |
| `primary-100` | <span style="display:inline-block; width:16px; height:16px; background-color:#ede9fe; border:1px solid #cbd5e1; border-radius:4px; vertical-align:middle; margin-right:8px;"></span>`#ede9fe` | `--token-color-primary-100` |
| `primary-200` | <span style="display:inline-block; width:16px; height:16px; background-color:#ddd6fe; border:1px solid #cbd5e1; border-radius:4px; vertical-align:middle; margin-right:8px;"></span>`#ddd6fe` | `--token-color-primary-200` |
| `primary-300` | <span style="display:inline-block; width:16px; height:16px; background-color:#c4b5fd; border:1px solid #cbd5e1; border-radius:4px; vertical-align:middle; margin-right:8px;"></span>`#c4b5fd` | `--token-color-primary-300` |
| `primary-400` | <span style="display:inline-block; width:16px; height:16px; background-color:#a78bfa; border:1px solid #cbd5e1; border-radius:4px; vertical-align:middle; margin-right:8px;"></span>`#a78bfa` | `--token-color-primary-400` |
| `primary-500` | <span style="display:inline-block; width:16px; height:16px; background-color:#8b5cf6; border:1px solid #cbd5e1; border-radius:4px; vertical-align:middle; margin-right:8px;"></span>`#8b5cf6` | `--token-color-primary-500` |
| `primary-600` | <span style="display:inline-block; width:16px; height:16px; background-color:#7c3aed; border:1px solid #cbd5e1; border-radius:4px; vertical-align:middle; margin-right:8px;"></span>`#7c3aed` | `--token-color-primary-600` |
| `primary-700` | <span style="display:inline-block; width:16px; height:16px; background-color:#6d28d9; border:1px solid #cbd5e1; border-radius:4px; vertical-align:middle; margin-right:8px;"></span>`#6d28d9` | `--token-color-primary-700` |
| `primary-800` | <span style="display:inline-block; width:16px; height:16px; background-color:#5b21b6; border:1px solid #cbd5e1; border-radius:4px; vertical-align:middle; margin-right:8px;"></span>`#5b21b6` | `--token-color-primary-800` |
| `primary-900` | <span style="display:inline-block; width:16px; height:16px; background-color:#4c1d95; border:1px solid #cbd5e1; border-radius:4px; vertical-align:middle; margin-right:8px;"></span>`#4c1d95` | `--token-color-primary-900` |
| `primary-950` | <span style="display:inline-block; width:16px; height:16px; background-color:#2e1065; border:1px solid #cbd5e1; border-radius:4px; vertical-align:middle; margin-right:8px;"></span>`#2e1065` | `--token-color-primary-950` |

### 3. Neutral Grayscale Palette (Slate Gray)
Used for scaffolding, text levels, card backgrounds, and panel borders.

| Token Name | Hex Code | CSS Custom Property |
| :--- | :---: | :--- |
| `gray-50` | <span style="display:inline-block; width:16px; height:16px; background-color:#f8fafc; border:1px solid #cbd5e1; border-radius:4px; vertical-align:middle; margin-right:8px;"></span>`#f8fafc` | `--token-color-gray-50` |
| `gray-100` | <span style="display:inline-block; width:16px; height:16px; background-color:#f1f5f9; border:1px solid #cbd5e1; border-radius:4px; vertical-align:middle; margin-right:8px;"></span>`#f1f5f9` | `--token-color-gray-100` |
| `gray-200` | <span style="display:inline-block; width:16px; height:16px; background-color:#e2e8f0; border:1px solid #cbd5e1; border-radius:4px; vertical-align:middle; margin-right:8px;"></span>`#e2e8f0` | `--token-color-gray-200` |
| `gray-300` | <span style="display:inline-block; width:16px; height:16px; background-color:#cbd5e1; border:1px solid #cbd5e1; border-radius:4px; vertical-align:middle; margin-right:8px;"></span>`#cbd5e1` | `--token-color-gray-300` |
| `gray-400` | <span style="display:inline-block; width:16px; height:16px; background-color:#94a3b8; border:1px solid #cbd5e1; border-radius:4px; vertical-align:middle; margin-right:8px;"></span>`#94a3b8` | `--token-color-gray-400` |
| `gray-500` | <span style="display:inline-block; width:16px; height:16px; background-color:#64748b; border:1px solid #cbd5e1; border-radius:4px; vertical-align:middle; margin-right:8px;"></span>`#64748b` | `--token-color-gray-500` |
| `gray-600` | <span style="display:inline-block; width:16px; height:16px; background-color:#475569; border:1px solid #cbd5e1; border-radius:4px; vertical-align:middle; margin-right:8px;"></span>`#475569` | `--token-color-gray-600` |
| `gray-700` | <span style="display:inline-block; width:16px; height:16px; background-color:#334155; border:1px solid #cbd5e1; border-radius:4px; vertical-align:middle; margin-right:8px;"></span>`#334155` | `--token-color-gray-700` |
| `gray-800` | <span style="display:inline-block; width:16px; height:16px; background-color:#1e293b; border:1px solid #cbd5e1; border-radius:4px; vertical-align:middle; margin-right:8px;"></span>`#1e293b` | `--token-color-gray-800` |
| `gray-900` | <span style="display:inline-block; width:16px; height:16px; background-color:#0f172a; border:1px solid #cbd5e1; border-radius:4px; vertical-align:middle; margin-right:8px;"></span>`#0f172a` | `--token-color-gray-900` |
| `gray-950` | <span style="display:inline-block; width:16px; height:16px; background-color:#020617; border:1px solid #cbd5e1; border-radius:4px; vertical-align:middle; margin-right:8px;"></span>`#020617` | `--token-color-gray-950` |

---

## 🚦 Semantic Tokens (TOK-SEM)

State mappings for alerts, status indicators, validation messages, and feedback flags.

| State | Role | Hex Code / Value | CSS Custom Property |
| :--- | :--- | :--- | :--- |
| **Success** | Light BG | <span style="display:inline-block; width:16px; height:16px; background-color:#f0fdf4; border:1px solid #cbd5e1; border-radius:4px; vertical-align:middle; margin-right:8px;"></span>`#f0fdf4` | `--token-semantic-success-bg` |
| | Border | <span style="display:inline-block; width:16px; height:16px; background-color:#bbf7d0; border:1px solid #cbd5e1; border-radius:4px; vertical-align:middle; margin-right:8px;"></span>`#bbf7d0` | `--token-semantic-success-border` |
| | Text | <span style="display:inline-block; width:16px; height:16px; background-color:#166534; border:1px solid #cbd5e1; border-radius:4px; vertical-align:middle; margin-right:8px;"></span>`#166534` | `--token-semantic-success-text` |
| | Main Icon | <span style="display:inline-block; width:16px; height:16px; background-color:#10b981; border:1px solid #cbd5e1; border-radius:4px; vertical-align:middle; margin-right:8px;"></span>`#10b981` | `--token-semantic-success-icon` |
| **Information**| Light BG | <span style="display:inline-block; width:16px; height:16px; background-color:#f0f9ff; border:1px solid #cbd5e1; border-radius:4px; vertical-align:middle; margin-right:8px;"></span>`#f0f9ff` | `--token-semantic-info-bg` |
| | Border | <span style="display:inline-block; width:16px; height:16px; background-color:#bae6fd; border:1px solid #cbd5e1; border-radius:4px; vertical-align:middle; margin-right:8px;"></span>`#bae6fd` | `--token-semantic-info-border` |
| | Text | <span style="display:inline-block; width:16px; height:16px; background-color:#075985; border:1px solid #cbd5e1; border-radius:4px; vertical-align:middle; margin-right:8px;"></span>`#075985` | `--token-semantic-info-text` |
| | Main Icon | <span style="display:inline-block; width:16px; height:16px; background-color:#0ea5e9; border:1px solid #cbd5e1; border-radius:4px; vertical-align:middle; margin-right:8px;"></span>`#0ea5e9` | `--token-semantic-info-icon` |
| **Warning** | Light BG | <span style="display:inline-block; width:16px; height:16px; background-color:#fffbeb; border:1px solid #cbd5e1; border-radius:4px; vertical-align:middle; margin-right:8px;"></span>`#fffbeb` | `--token-semantic-warning-bg` |
| | Border | <span style="display:inline-block; width:16px; height:16px; background-color:#fef08a; border:1px solid #cbd5e1; border-radius:4px; vertical-align:middle; margin-right:8px;"></span>`#fef08a` | `--token-semantic-warning-border` |
| | Text | <span style="display:inline-block; width:16px; height:16px; background-color:#854d0e; border:1px solid #cbd5e1; border-radius:4px; vertical-align:middle; margin-right:8px;"></span>`#854d0e` | `--token-semantic-warning-text` |
| | Main Icon | <span style="display:inline-block; width:16px; height:16px; background-color:#f59e0b; border:1px solid #cbd5e1; border-radius:4px; vertical-align:middle; margin-right:8px;"></span>`#f59e0b` | `--token-semantic-warning-icon` |
| **Error** | Light BG | <span style="display:inline-block; width:16px; height:16px; background-color:#fef2f2; border:1px solid #cbd5e1; border-radius:4px; vertical-align:middle; margin-right:8px;"></span>`#fef2f2` | `--token-semantic-error-bg` |
| | Border | <span style="display:inline-block; width:16px; height:16px; background-color:#fecaca; border:1px solid #cbd5e1; border-radius:4px; vertical-align:middle; margin-right:8px;"></span>`#fecaca` | `--token-semantic-error-border` |
| | Text | <span style="display:inline-block; width:16px; height:16px; background-color:#991b1b; border:1px solid #cbd5e1; border-radius:4px; vertical-align:middle; margin-right:8px;"></span>`#991b1b` | `--token-semantic-error-text` |
| | Main Icon | <span style="display:inline-block; width:16px; height:16px; background-color:#ef4444; border:1px solid #cbd5e1; border-radius:4px; vertical-align:middle; margin-right:8px;"></span>`#ef4444` | `--token-semantic-error-icon` |

---

## 📝 Typography System (TOK-TYP)

### Font Families
*   **Sans-Serif (Body & Headers)**: `"FiraSans", system-ui, -apple-system, sans-serif` (`--token-font-sans`)
*   **Monospace (Code & Metrics)**: `Consolas, "Liberation Mono", Menlo, monospace` (`--token-font-mono`)

### 1. Font Sizes
| Token Name | Rem Value | Equivalent Px | CSS Custom Property |
| :--- | :---: | :---: | :--- |
| `xs` | `0.75rem` | `12px` | `--token-font-size-xs` |
| `sm` | `0.875rem` | `14px` | `--token-font-size-sm` |
| `base` | `1.0rem` | `16px` | `--token-font-size-base` |
| `lg` | `1.125rem` | `18px` | `--token-font-size-lg` |
| `xl` | `1.25rem` | `20px` | `--token-font-size-xl` |
| `2xl` | `1.5rem` | `24px` | `--token-font-size-2xl` |
| `3xl` | `1.875rem` | `30px` | `--token-font-size-3xl` |
| `4xl` | `2.25rem` | `36px` | `--token-font-size-4xl` |
| `5xl` | `3.0rem` | `48px` | `--token-font-size-5xl` |

### 2. Font Weights
*   `light` (300): `--token-font-weight-light`
*   `regular` (400): `--token-font-weight-regular`
*   `medium` (500): `--token-font-weight-medium`
*   `semibold` (600): `--token-font-weight-semibold`
*   `bold` (700): `--token-font-weight-bold`

### 3. Line Heights & Letter Spacing
*   `none` (1.0): `--token-line-height-none`
*   `tight` (1.25): `--token-line-height-tight`
*   `snug` (1.375): `--token-line-height-snug`
*   `normal` (1.5): `--token-line-height-normal`
*   `relaxed` (1.625): `--token-line-height-relaxed`
*   `loose` (2.0): `--token-line-height-loose`
*   Letter Spacing: `tighter` (-0.05em), `tight` (-0.025em), `normal` (0em), `wide` (0.025em), `wider` (0.05em)

---

## 📐 Spacing Grid (TOK-SPC)

Based on a strict 4px/8px layout grid to eliminate manual offsets.

| Token Name | Pixel Value | CSS Custom Property | Usage Guidelines |
| :--- | :---: | :--- | :--- |
| `xxs` | `2px` | `--token-space-xxs` | Micro divider offsets, nested tag paddings. |
| `xs` | `4px` | `--token-space-xs` | Padding inside small buttons, checkbox labels. |
| `sm` | `8px` | `--token-space-sm` | Default spacing between icon and text. |
| `md` | `12px` | `--token-space-md` | Inset padding inside table columns. |
| `lg` | `16px` | `--token-space-lg` | Standard padding for lists and input forms. |
| `xl` | `20px` | `--token-space-xl` | Default padding inside action cards. |
| `2xl` | `24px` | `--token-space-2xl` | Standard padding for dashboard container sections. |
| `3xl` | `32px` | `--token-space-3xl` | Large gaps between major page modules. |
| `4xl` | `40px` | `--token-space-4xl` | Top margin offsets for landing headers. |
| `5xl` | `48px` | `--token-space-5xl` | Vertical padding within splash panels. |
| `6xl` | `64px` | `--token-space-6xl` | Section margins. |
| `7xl` | `80px` | `--token-space-7xl` | Layout wrappers. |
| `8xl` | `96px` | `--token-space-8xl` | Hero section gaps. |
| `9xl` | `128px` | `--token-space-9xl` | Maximum page wrapper boundary padding. |

---

## 🔲 Corner Radii (TOK-RAD)

Rules defining boundary shapes for interactive items and containers.

| Token Name | Radius Value | CSS Custom Property | Matching Component |
| :--- | :---: | :--- | :--- |
| `none` | `0px` | `--token-radius-none` | Sharp enterprise data grids. |
| `xs` | `2px` | `--token-radius-xs` | Checkbox borders, micro sub-tooltips. |
| `sm` | `4px` | `--token-radius-sm` | Default small buttons, text inputs. |
| `md` | `6px` | `--token-radius-md` | Dropdowns, standard buttons, badges. |
| `lg` | `8px` | `--token-radius-lg` | Cards, popover bubbles, control sheets. |
| `xl` | `12px` | `--token-radius-xl` | Floating action modals, multi-step panels. |
| `2xl` | `16px` | `--token-radius-2xl` | Dashboard container panels. |
| `3xl` | `24px` | `--token-radius-3xl` | Large promotional blocks. |
| `full` | `9999px` | `--token-radius-full` | Status badges, circular profile avatars. |

---

## 🔺 Elevation & Shadows (TOK-SHD)

Delineates depth levels across layered components.

### Drop Shadows
*   `sm`: `0 1px 2px 0 rgba(0, 0, 0, 0.05)` (`--token-shadow-sm`) - Flat action cards.
*   `md`: `0 4px 6px -1px rgba(0,0,0,.1), 0 2px 4px -2px rgba(0,0,0,.1)` (`--token-shadow-md`) - Dropdown overlay menus.
*   `lg`: `0 10px 15px -3px rgba(0,0,0,.1), 0 4px 6px -4px rgba(0,0,0,.1)` (`--token-shadow-lg`) - Floating sheets, drawers.
*   `xl`: `0 20px 25px -5px rgba(0,0,0,.1), 0 8px 10px -6px rgba(0,0,0,.1)` (`--token-shadow-xl`) - Standard overlay modals.
*   `2xl`: `0 25px 50px -12px rgba(0, 0, 0, 0.25)` (`--token-shadow-2xl`) - Interactive modals.
*   `inner`: `inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)` (`--token-shadow-inner`) - Textarea inputs.
*   `focus`: `0 0 0 3px rgba(37, 99, 235, 0.4)` (`--token-shadow-focus`) - Highlight active indicator focus ring.
