# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a customized **Shopify Dawn theme** (v15.4.1) for "The Wicked Lab" — a custom gift/printing business. It is a Liquid-templated Shopify theme, not a Node.js/React/Next.js project. There is no package.json, build step, or local dev server in the traditional sense.

## Shopify CLI Commands

```bash
# Push specific files to Shopify (preferred — avoids theme selection prompt)
shopify theme push --only sections/wl-product.liquid assets/wl-product.css

# Push theme to Shopify (will prompt to select theme interactively)
shopify theme push

# Pull theme from Shopify
shopify theme pull

# Start local development server (hot-reload preview)
shopify theme dev

# Check theme for errors
shopify theme check
```

> **Note:** `shopify theme push` cannot be run non-interactively (requires theme selection). Always use `--only` with specific file paths for targeted pushes.

## Git Workflow

- Active development happens on the `dev` branch
- `main` is the stable branch; merge dev → main when ready to publish
- Shopify's theme editor auto-commits to whichever branch is linked to the live/dev theme — these will diverge; always prefer dev's versions when merging
- Never `git push` automatically — the user pushes manually (or explicitly requests it)

## Local Reference Files

These files live outside the repo on the developer's machine and are not committed to git.

| File | Purpose |
|---|---|
| `/Users/jasoncluck/Desktop/WickedLab/products/shopify_wicked_lab_products_export.csv` | Full Shopify product export — use for real product names, handles, prices, and variants when building sections or mock data |
| `/Users/jasoncluck/Desktop/WickedLab/wicked_light_theme_complete/homepage_v2_light.html` | Design mock for the homepage |
| `/Users/jasoncluck/Desktop/WickedLab/wicked_light_theme_complete/collection_page_light.html` | Design mock for the collection page |
| `/Users/jasoncluck/Desktop/WickedLab/wicked_light_theme_complete/product_page_light.html` | Design mock for the product page |

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
| `wl-product.liquid` | `wl-product.css` | Product detail page (all templates) |
| `wl-product-recs.liquid` | `wl-product-recs.css` | Product recommendations (below product detail) |

### Product templates

| Template | Section settings | Purpose |
|---|---|---|
| `templates/product.json` | `show_personalization: false` | Standard product page |
| `templates/product.personalizable.json` | `show_personalization: true`, `show_upload_field: true` | Products with custom text + photo upload |

Both templates include `wl-product-recs` for Shopify-powered recommendations below the fold.

### Personalizable product feature

Products using `product.personalizable.json` have a custom S3-backed photo upload and custom text field. Key details:

- **Upload UI:** FilePond v4 (`assets/filepond.min.js` + plugins) — all files committed to `assets/`, served from Shopify CDN
- **Upload backend:** AWS Lambda + S3 via API Gateway at `https://d8pv2vjuv7.execute-api.us-east-1.amazonaws.com` — configured via `upload_endpoint` section setting
- **Presign flow:** JS fetches `<endpoint>/presign?fileType=...` → receives `{ uploadUrl, viewUrl }` → PUT to S3 → stores `viewUrl` in hidden `properties[Photo URL]` input
- **Line item properties submitted:** `properties[Custom text]` and `properties[Photo URL]`
- **S3 key format:** `uploads/YYYY/MM/DD/<timestamp>-<random>.<ext>`
- **CTA button gating:** Add to Cart and Buy Now are disabled on page load; re-enabled only when `Custom text` is non-empty **or** a photo uploads successfully. Also re-disabled during active upload regardless of text state.
- **Variant change safety:** `applyVariant()` routes through `window['WlPersSetVariant_<sectionId>']` on personalizable products so variant changes can't bypass the personalization gate

### FilePond asset files (committed to `assets/`)
- `filepond.min.js` / `filepond.min.css`
- `filepond-plugin-image-preview.min.js` / `filepond-plugin-image-preview.min.css`
- `filepond-plugin-file-validate-type.min.js`
- `filepond-plugin-file-validate-size.min.js`

### CSS design tokens (`assets/wl-tokens.css`)

All custom sections use these CSS custom properties — do not use hardcoded colors:

| Token | Usage |
|---|---|
| `--wl-blue`, `--wl-blue-dark` | Primary brand blue |
| `--wl-blue-bg`, `--wl-blue-bg-md`, `--wl-blue-border` | Blue tinted backgrounds/borders |
| `--wl-gray-50` … `--wl-gray-900` | Neutral grays |
| `--wl-radius-sm`, `--wl-radius-md`, `--wl-radius-pill` | Border radii |
| `--wl-shadow-card` | Card hover shadow |
| `--wl-t-fast`, `--wl-t-img` | Transition durations |
| `--wl-img-zoom` | Image hover zoom transform |

### Shared assets
- `assets/wl-tokens.css` — CSS custom properties (imported by every custom section)
- `assets/wl-buttons.css` — `.wl-btn`, `.wl-btn--sm`, `.wl-btn--secondary`, etc.
- `assets/wl-section-header.css` + `snippets/wl-section-header.liquid` — standard eyebrow/title/link header used by homepage sections
- `assets/wl-product-card.css` — `.wl-pc` card component used in recommendations and grids

### Section anatomy

Each custom section follows this pattern:
1. `{{ 'wl-tokens.css' | asset_url | stylesheet_tag }}` (plus any other shared CSS)
2. `{{ 'wl-<name>.css' | asset_url | stylesheet_tag }}`
3. Liquid markup using `section.settings.*` for text/image settings and `section.blocks` for repeatable items
4. `{% schema %}` block at the bottom defining settings, blocks, and presets

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
- Inline JS for section-specific interactivity (e.g., variant picker and upload logic in `wl-product.liquid`)

### Adding a new custom section
1. Create `sections/wl-<name>.liquid` with `wl-tokens.css` + any shared CSS imports, markup, and `{% schema %}`
2. Create `assets/wl-<name>.css` for styles using token variables
3. Add the section to a template JSON (e.g., `templates/index.json`) or via the Shopify theme editor

### Product recommendations
`wl-product-recs.liquid` uses Shopify's built-in recommendations API. The section renders empty on initial page load; inline JS fetches `/recommendations/products?section_id=...&product_id=...&limit=N` and replaces the section HTML with the response. Recommendations are powered by Shopify's algorithm (same-collection products, shared tags, purchase history) and improve automatically over time.

### Order notification email
The Shopify order confirmation email template (managed in Shopify Admin → Settings → Notifications) has been customized to display `Custom text` and `Photo URL` line item properties with a thumbnail image when present. The snippet checks `line.properties['Custom text']` and `line.properties['Photo URL']` and only renders when non-blank, so non-personalizable orders are unaffected.
