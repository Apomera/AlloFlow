# AlloFlow axe-core Audit Report

- **Target:** https://prismflow-911fe.web.app
- **When:** 2026-04-27T02:30:32.120Z
- **axe-core:** 4.10.3
- **Scenarios audited:** 7

## Summary by scenario

| Scenario | Rules | Nodes | Critical | Serious | Moderate | Minor | Incomplete |
|---|---:|---:|---:|---:|---:|---:|---:|
| landing | 1 | 1 | 0 | 0 | 1 | 0 | 2 |
| landing_with_text | 2 | 2 | 0 | 1 | 1 | 0 | 2 |
| theme_dark | 2 | 3 | 0 | 1 | 1 | 0 | 2 |
| theme_contrast | 1 | 1 | 0 | 0 | 1 | 0 | 2 |
| reading_theme_sepia | 2 | 2 | 0 | 1 | 1 | 0 | 2 |
| reading_theme_dyslexia | 2 | 2 | 0 | 1 | 1 | 0 | 2 |
| color_overlay_blue | 2 | 2 | 0 | 1 | 1 | 0 | 2 |

## Rules ranked by severity × impact

| Rule | Impact | Nodes (summed) | Scenarios | Help |
|---|---|---:|---|---|
| `color-contrast` | serious | 6 | landing_with_text, theme_dark, reading_theme_sepia, reading_theme_dyslexia, color_overlay_blue | [Elements must meet minimum color contrast ratio thresholds](https://dequeuniversity.com/rules/axe/4.10/color-contrast?application=axeAPI) |
| `region` | moderate | 7 | landing, landing_with_text, theme_dark, theme_contrast, reading_theme_sepia, reading_theme_dyslexia, color_overlay_blue | [All page content should be contained by landmarks](https://dequeuniversity.com/rules/axe/4.10/region?application=axeAPI) |

## Top violations per scenario (first 5 nodes shown)

### landing

#### `region` — moderate (1 node)
All page content should be contained by landmarks — [docs](https://dequeuniversity.com/rules/axe/4.10/region?application=axeAPI)

- Target: `#root`
  - HTML: `<div id="root">`
  - Failure: Fix any of the following:   Some page content is not contained by landmarks

### landing_with_text

#### `color-contrast` — serious (1 node)
Elements must meet minimum color contrast ratio thresholds — [docs](https://dequeuniversity.com/rules/axe/4.10/color-contrast?application=axeAPI)

- Target: `button[aria-label="AI Backend Settings"] > span`
  - HTML: `<span>AI Backend Settings</span>`
  - Failure: Fix any of the following:   Element has insufficient color contrast of 1.18 (foreground color: #e0e7ff, background color: #f9fbfc, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1

#### `region` — moderate (1 node)
All page content should be contained by landmarks — [docs](https://dequeuniversity.com/rules/axe/4.10/region?application=axeAPI)

- Target: `#root`
  - HTML: `<div id="root">`
  - Failure: Fix any of the following:   Some page content is not contained by landmarks

### theme_dark

#### `color-contrast` — serious (2 nodes)
Elements must meet minimum color contrast ratio thresholds — [docs](https://dequeuniversity.com/rules/axe/4.10/color-contrast?application=axeAPI)

- Target: `.text-rose-800 > .group-hover\:tracking-wide`
  - HTML: `<span class="group-hover:tracking-wide transition-all">StoryForge</span>`
  - Failure: Fix any of the following:   Element has insufficient color contrast of 1.12 (foreground color: #fda4af, background color: #cfc5ca, font size: 8.3pt (11px), font weight: bold). Expected contrast ratio of 4.5:1
- Target: `h3`
  - HTML: `<h3 class="text-lg font-bold text-slate-700 flex items-center gap-2 truncate ">`
  - Failure: Fix any of the following:   Element has insufficient color contrast of 3.19 (foreground color: #f8fafc, background color: #878d97, font size: 13.5pt (18px), font weight: bold). Expected contrast ratio of 4.5:1

#### `region` — moderate (1 node)
All page content should be contained by landmarks — [docs](https://dequeuniversity.com/rules/axe/4.10/region?application=axeAPI)

- Target: `#root`
  - HTML: `<div id="root">`
  - Failure: Fix any of the following:   Some page content is not contained by landmarks

### theme_contrast

#### `region` — moderate (1 node)
All page content should be contained by landmarks — [docs](https://dequeuniversity.com/rules/axe/4.10/region?application=axeAPI)

- Target: `#root`
  - HTML: `<div id="root">`
  - Failure: Fix any of the following:   Some page content is not contained by landmarks

### reading_theme_sepia

#### `color-contrast` — serious (1 node)
Elements must meet minimum color contrast ratio thresholds — [docs](https://dequeuniversity.com/rules/axe/4.10/color-contrast?application=axeAPI)

- Target: `button[aria-label="AI Backend Settings"] > span`
  - HTML: `<span>AI Backend Settings</span>`
  - Failure: Fix any of the following:   Element has insufficient color contrast of 1.18 (foreground color: #e0e7ff, background color: #f9fbfc, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1

#### `region` — moderate (1 node)
All page content should be contained by landmarks — [docs](https://dequeuniversity.com/rules/axe/4.10/region?application=axeAPI)

- Target: `#root`
  - HTML: `<div id="root">`
  - Failure: Fix any of the following:   Some page content is not contained by landmarks

### reading_theme_dyslexia

#### `color-contrast` — serious (1 node)
Elements must meet minimum color contrast ratio thresholds — [docs](https://dequeuniversity.com/rules/axe/4.10/color-contrast?application=axeAPI)

- Target: `button[aria-label="AI Backend Settings"] > span`
  - HTML: `<span>AI Backend Settings</span>`
  - Failure: Fix any of the following:   Element has insufficient color contrast of 1.18 (foreground color: #e0e7ff, background color: #f9fbfc, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1

#### `region` — moderate (1 node)
All page content should be contained by landmarks — [docs](https://dequeuniversity.com/rules/axe/4.10/region?application=axeAPI)

- Target: `#root`
  - HTML: `<div id="root">`
  - Failure: Fix any of the following:   Some page content is not contained by landmarks

### color_overlay_blue

#### `color-contrast` — serious (1 node)
Elements must meet minimum color contrast ratio thresholds — [docs](https://dequeuniversity.com/rules/axe/4.10/color-contrast?application=axeAPI)

- Target: `button[aria-label="AI Backend Settings"] > span`
  - HTML: `<span>AI Backend Settings</span>`
  - Failure: Fix any of the following:   Element has insufficient color contrast of 1.18 (foreground color: #e0e7ff, background color: #f9fbfc, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1

#### `region` — moderate (1 node)
All page content should be contained by landmarks — [docs](https://dequeuniversity.com/rules/axe/4.10/region?application=axeAPI)

- Target: `#root`
  - HTML: `<div id="root">`
  - Failure: Fix any of the following:   Some page content is not contained by landmarks
