# Design Tokens Reference

This document details all the foundational design tokens defined in Phase 1 of the visual language framework.

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

