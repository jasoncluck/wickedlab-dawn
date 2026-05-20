# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a customized **Shopify Dawn theme** (v15.4.1) for "The Wicked Lab" — a custom gift/printing business. It is a Liquid-templated Shopify theme, not a Node.js/React/Next.js project. There is no package.json, build step, or local dev server in the traditional sense.

## Shopify CLI Commands

```bash
# Push theme to Shopify (development store)
shopify theme push

# Pull theme from Shopify
shopify theme pull

# Start local development server (hot-reload preview)
shopify theme dev

# Check theme for errors
shopify theme check
```

## Architecture

### Directory layout
- `layout/` — Base page wrappers (`theme.liquid` is the root shell)
- `sections/` — Page sections; custom ones are prefixed `wl-`
- `snippets/` — Reusable Liquid partials, documented with accepted params
- `templates/` — JSON templates that wire sections to page types
- `assets/` — All CSS, JS, and SVG files (no build pipeline; referenced via `asset_url`)
- `config/` — Theme settings schema and saved settings data
- `locales/` — i18n JSON files (50+ languages)

### Custom sections (The Wicked Lab)

All custom sections follow the `wl-` prefix convention:

| Section file | CSS file | Purpose |
|---|---|---|
| `wl-hero.liquid` | `wl-hero.css` | Homepage hero with text, dual CTAs, trust badges, product panel |
| `wl-feat-carousel.liquid` | `wl-feat-carousel.css` | Featured product carousel with auto-play |
| `wl-category-grid.liquid` | `wl-category-grid.css` | Product category grid |
| `wl-featured-products.liquid` | `wl-featured-products.css` | Featured product grid |
| `wl-occasions.liquid` | `wl-occasions.css` | Occasions/use-case section |
| `wl-promo-banner.liquid` | `wl-promo-banner.css` | Promotional banner |
| `wl-reviews.liquid` | `wl-reviews.css` | Reviews section |
| `wl-how-it-works.liquid` | `wl-how-it-works.css` | How it works steps |

### Section anatomy

Each custom section follows this pattern:
1. `{{ 'wl-<name>.css' | asset_url | stylesheet_tag }}` at the top
2. Liquid markup using `section.settings.*` for text/image settings and `section.blocks` for repeatable items
3. `{% schema %}` block at the bottom defining settings, blocks, and presets

### Styling conventions
- Color schemes are defined in `config/settings_data.json` as `scheme-1` through `scheme-6` with CSS custom properties (`--color-background`, `--gradient-background`, etc.)
- Theme fonts: DM Sans for both header and body
- Page width: 1200px (`page-width` class)
- CSS files are per-section/per-component — no global preprocessor or utility framework (no Tailwind)
- CSS custom properties are injected dynamically from `layout/theme.liquid`

### JavaScript
- No bundler — JS files are loaded directly via `asset_url`
- Pub/sub event system in `assets/pubsub.js` for cross-component communication
- Cart state managed via `assets/cart.js` and `assets/cart-drawer.js`
- Inline JS for section-specific interactivity (e.g., carousel state in `wl-feat-carousel.liquid`)

### Adding a new custom section
1. Create `sections/wl-<name>.liquid` with stylesheet import, markup, and `{% schema %}`
2. Create `assets/wl-<name>.css` for styles
3. Add the section to a template JSON (e.g., `templates/index.json`) or via the Shopify theme editor
