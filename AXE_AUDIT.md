# AlloFlow axe-core Audit Report

- **Target:** https://prismflow-911fe.web.app
- **When:** 2026-04-26T22:50:57.364Z
- **axe-core:** 4.10.3
- **Scenarios audited:** 7

## Summary by scenario

| Scenario | Rules | Nodes | Critical | Serious | Moderate | Minor | Incomplete |
|---|---:|---:|---:|---:|---:|---:|---:|
| landing | 2 | 2 | 0 | 1 | 1 | 0 | 2 |
| landing_with_text | 3 | 3 | 0 | 2 | 1 | 0 | 2 |
| theme_dark | 3 | 4 | 0 | 2 | 1 | 0 | 2 |
| theme_contrast | 2 | 2 | 0 | 1 | 1 | 0 | 2 |
| reading_theme_sepia | 3 | 3 | 0 | 2 | 1 | 0 | 2 |
| reading_theme_dyslexia | 3 | 3 | 0 | 2 | 1 | 0 | 2 |
| color_overlay_blue | 3 | 3 | 0 | 2 | 1 | 0 | 2 |

## Rules ranked by severity × impact

| Rule | Impact | Nodes (summed) | Scenarios | Help |
|---|---|---:|---|---|
| `nested-interactive` | serious | 7 | landing, landing_with_text, theme_dark, theme_contrast, reading_theme_sepia, reading_theme_dyslexia, color_overlay_blue | [Interactive controls must not be nested](https://dequeuniversity.com/rules/axe/4.10/nested-interactive?application=axeAPI) |
| `color-contrast` | serious | 6 | landing_with_text, theme_dark, reading_theme_sepia, reading_theme_dyslexia, color_overlay_blue | [Elements must meet minimum color contrast ratio thresholds](https://dequeuniversity.com/rules/axe/4.10/color-contrast?application=axeAPI) |
| `region` | moderate | 7 | landing, landing_with_text, theme_dark, theme_contrast, reading_theme_sepia, reading_theme_dyslexia, color_overlay_blue | [All page content should be contained by landmarks](https://dequeuniversity.com/rules/axe/4.10/region?application=axeAPI) |

## Top violations per scenario (first 5 nodes shown)

### landing

#### `nested-interactive` — serious (1 node)
Interactive controls must not be nested — [docs](https://dequeuniversity.com/rules/axe/4.10/nested-interactive?application=axeAPI)

- Target: `div[role="button"]`
  - HTML: `<div role="button" tabindex="0" class="flex items-center gap-2">`
  - Failure: Fix any of the following:   Element has focusable descendants

#### `region` — moderate (1 node)
All page content should be contained by landmarks — [docs](https://dequeuniversity.com/rules/axe/4.10/region?application=axeAPI)

- Target: `#root`
  - HTML: `<div id="root">`
  - Failure: Fix any of the following:   Some page content is not contained by landmarks

### landing_with_text

#### `color-contrast` — serious (1 node)
Elements must meet minimum color contrast ratio thresholds — [docs](https://dequeuniversity.com/rules/axe/4.10/color-contrast?application=axeAPI)

- Target: `button[title="launch_pad.ai_backend_settings"] > span`
  - HTML: `<span>launch_pad.ai_backend_settings</span>`
  - Failure: Fix any of the following:   Element has insufficient color contrast of 1.59 (foreground color: #c0cbfd, background color: #ffffff, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1

#### `nested-interactive` — serious (1 node)
Interactive controls must not be nested — [docs](https://dequeuniversity.com/rules/axe/4.10/nested-interactive?application=axeAPI)

- Target: `.gap-2.items-center[role="button"]`
  - HTML: `<div role="button" tabindex="0" class="flex items-center gap-2">`
  - Failure: Fix any of the following:   Element has focusable descendants

#### `region` — moderate (1 node)
All page content should be contained by landmarks — [docs](https://dequeuniversity.com/rules/axe/4.10/region?application=axeAPI)

- Target: `#root`
  - HTML: `<div id="root">`
  - Failure: Fix any of the following:   Some page content is not contained by landmarks

### theme_dark

#### `color-contrast` — serious (2 nodes)
Elements must meet minimum color contrast ratio thresholds — [docs](https://dequeuniversity.com/rules/axe/4.10/color-contrast?application=axeAPI)

- Target: `h3`
  - HTML: `<h3 class="text-lg font-bold text-slate-700 flex items-center gap-2 truncate ">`
  - Failure: Fix any of the following:   Element has insufficient color contrast of 3.19 (foreground color: #f8fafc, background color: #878d97, font size: 13.5pt (18px), font weight: bold). Expected contrast ratio of 4.5:1
- Target: `button[title="launch_pad.ai_backend_settings"] > span`
  - HTML: `<span>launch_pad.ai_backend_settings</span>`
  - Failure: Fix any of the following:   Element has insufficient color contrast of 4 (foreground color: #808dc4, background color: #293242, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1

#### `nested-interactive` — serious (1 node)
Interactive controls must not be nested — [docs](https://dequeuniversity.com/rules/axe/4.10/nested-interactive?application=axeAPI)

- Target: `.gap-2.items-center[role="button"]`
  - HTML: `<div role="button" tabindex="0" class="flex items-center gap-2">`
  - Failure: Fix any of the following:   Element has focusable descendants

#### `region` — moderate (1 node)
All page content should be contained by landmarks — [docs](https://dequeuniversity.com/rules/axe/4.10/region?application=axeAPI)

- Target: `#root`
  - HTML: `<div id="root">`
  - Failure: Fix any of the following:   Some page content is not contained by landmarks

### theme_contrast

#### `nested-interactive` — serious (1 node)
Interactive controls must not be nested — [docs](https://dequeuniversity.com/rules/axe/4.10/nested-interactive?application=axeAPI)

- Target: `.gap-2.items-center[role="button"]`
  - HTML: `<div role="button" tabindex="0" class="flex items-center gap-2">`
  - Failure: Fix any of the following:   Element has focusable descendants

#### `region` — moderate (1 node)
All page content should be contained by landmarks — [docs](https://dequeuniversity.com/rules/axe/4.10/region?application=axeAPI)

- Target: `#root`
  - HTML: `<div id="root">`
  - Failure: Fix any of the following:   Some page content is not contained by landmarks

### reading_theme_sepia

#### `color-contrast` — serious (1 node)
Elements must meet minimum color contrast ratio thresholds — [docs](https://dequeuniversity.com/rules/axe/4.10/color-contrast?application=axeAPI)

- Target: `button[title="launch_pad.ai_backend_settings"] > span`
  - HTML: `<span>launch_pad.ai_backend_settings</span>`
  - Failure: Fix any of the following:   Element has insufficient color contrast of 1.55 (foreground color: #bec9fc, background color: #f9fafc, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1

#### `nested-interactive` — serious (1 node)
Interactive controls must not be nested — [docs](https://dequeuniversity.com/rules/axe/4.10/nested-interactive?application=axeAPI)

- Target: `.gap-2.items-center[role="button"]`
  - HTML: `<div role="button" tabindex="0" class="flex items-center gap-2">`
  - Failure: Fix any of the following:   Element has focusable descendants

#### `region` — moderate (1 node)
All page content should be contained by landmarks — [docs](https://dequeuniversity.com/rules/axe/4.10/region?application=axeAPI)

- Target: `#root`
  - HTML: `<div id="root">`
  - Failure: Fix any of the following:   Some page content is not contained by landmarks

### reading_theme_dyslexia

#### `color-contrast` — serious (1 node)
Elements must meet minimum color contrast ratio thresholds — [docs](https://dequeuniversity.com/rules/axe/4.10/color-contrast?application=axeAPI)

- Target: `button[title="launch_pad.ai_backend_settings"] > span`
  - HTML: `<span>launch_pad.ai_backend_settings</span>`
  - Failure: Fix any of the following:   Element has insufficient color contrast of 1.55 (foreground color: #bec9fc, background color: #f9fafc, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1

#### `nested-interactive` — serious (1 node)
Interactive controls must not be nested — [docs](https://dequeuniversity.com/rules/axe/4.10/nested-interactive?application=axeAPI)

- Target: `.gap-2.items-center[role="button"]`
  - HTML: `<div role="button" tabindex="0" class="flex items-center gap-2">`
  - Failure: Fix any of the following:   Element has focusable descendants

#### `region` — moderate (1 node)
All page content should be contained by landmarks — [docs](https://dequeuniversity.com/rules/axe/4.10/region?application=axeAPI)

- Target: `#root`
  - HTML: `<div id="root">`
  - Failure: Fix any of the following:   Some page content is not contained by landmarks

### color_overlay_blue

#### `color-contrast` — serious (1 node)
Elements must meet minimum color contrast ratio thresholds — [docs](https://dequeuniversity.com/rules/axe/4.10/color-contrast?application=axeAPI)

- Target: `button[title="launch_pad.ai_backend_settings"] > span`
  - HTML: `<span>launch_pad.ai_backend_settings</span>`
  - Failure: Fix any of the following:   Element has insufficient color contrast of 1.59 (foreground color: #c0cbfd, background color: #ffffff, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1

#### `nested-interactive` — serious (1 node)
Interactive controls must not be nested — [docs](https://dequeuniversity.com/rules/axe/4.10/nested-interactive?application=axeAPI)

- Target: `.gap-2.items-center[role="button"]`
  - HTML: `<div role="button" tabindex="0" class="flex items-center gap-2">`
  - Failure: Fix any of the following:   Element has focusable descendants

#### `region` — moderate (1 node)
All page content should be contained by landmarks — [docs](https://dequeuniversity.com/rules/axe/4.10/region?application=axeAPI)

- Target: `#root`
  - HTML: `<div id="root">`
  - Failure: Fix any of the following:   Some page content is not contained by landmarks
