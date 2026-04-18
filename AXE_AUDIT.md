# AlloFlow axe-core Audit Report

- **Target:** https://prismflow-911fe.web.app
- **When:** 2026-04-18T03:48:02.218Z
- **axe-core:** 4.10.3
- **Scenarios audited:** 7

## Summary by scenario

| Scenario | Rules | Nodes | Critical | Serious | Moderate | Minor | Incomplete |
|---|---:|---:|---:|---:|---:|---:|---:|
| landing | 6 | 8 | 1 | 2 | 3 | 0 | 2 |
| landing_with_text | 6 | 8 | 1 | 2 | 3 | 0 | 2 |
| theme_dark | 6 | 11 | 1 | 2 | 3 | 0 | 2 |
| theme_contrast | 5 | 7 | 1 | 1 | 3 | 0 | 2 |
| reading_theme_sepia | 6 | 8 | 1 | 2 | 3 | 0 | 2 |
| reading_theme_dyslexia | 6 | 8 | 1 | 2 | 3 | 0 | 2 |
| color_overlay_blue | 6 | 9 | 1 | 2 | 3 | 0 | 2 |

## Rules ranked by severity × impact

| Rule | Impact | Nodes (summed) | Scenarios | Help |
|---|---|---:|---|---|
| `aria-valid-attr-value` | critical | 7 | landing, landing_with_text, theme_dark, theme_contrast, reading_theme_sepia, reading_theme_dyslexia, color_overlay_blue | [ARIA attributes must conform to valid values](https://dequeuniversity.com/rules/axe/4.10/aria-valid-attr-value?application=axeAPI) |
| `nested-interactive` | serious | 21 | landing, landing_with_text, theme_dark, theme_contrast, reading_theme_sepia, reading_theme_dyslexia, color_overlay_blue | [Interactive controls must not be nested](https://dequeuniversity.com/rules/axe/4.10/nested-interactive?application=axeAPI) |
| `color-contrast` | serious | 10 | landing, landing_with_text, theme_dark, reading_theme_sepia, reading_theme_dyslexia, color_overlay_blue | [Elements must meet minimum color contrast ratio thresholds](https://dequeuniversity.com/rules/axe/4.10/color-contrast?application=axeAPI) |
| `landmark-main-is-top-level` | moderate | 7 | landing, landing_with_text, theme_dark, theme_contrast, reading_theme_sepia, reading_theme_dyslexia, color_overlay_blue | [Main landmark should not be contained in another landmark](https://dequeuniversity.com/rules/axe/4.10/landmark-main-is-top-level?application=axeAPI) |
| `landmark-no-duplicate-main` | moderate | 7 | landing, landing_with_text, theme_dark, theme_contrast, reading_theme_sepia, reading_theme_dyslexia, color_overlay_blue | [Document should not have more than one main landmark](https://dequeuniversity.com/rules/axe/4.10/landmark-no-duplicate-main?application=axeAPI) |
| `landmark-unique` | moderate | 7 | landing, landing_with_text, theme_dark, theme_contrast, reading_theme_sepia, reading_theme_dyslexia, color_overlay_blue | [Landmarks should have a unique role or role/label/title (i.e. accessible name) combination](https://dequeuniversity.com/rules/axe/4.10/landmark-unique?application=axeAPI) |

## Top violations per scenario (first 5 nodes shown)

### landing

#### `aria-valid-attr-value` — critical (1 node)
ARIA attributes must conform to valid values — [docs](https://dequeuniversity.com/rules/axe/4.10/aria-valid-attr-value?application=axeAPI)

- Target: `#tab-create`
  - HTML: `<button role="tab" aria-selected="true" aria-controls="panel-create" id="tab-create" aria-label="Create new content" class="flex-1 py-2 text-sm font-bold rounded-md transition-all flex items-center ju`
  - Failure: Fix all of the following:   Invalid ARIA attribute value: aria-controls="panel-create"

#### `nested-interactive` — serious (3 nodes)
Interactive controls must not be nested — [docs](https://dequeuniversity.com/rules/axe/4.10/nested-interactive?application=axeAPI)

- Target: `.gap-2.items-center[role="button"]`
  - HTML: `<div role="button" tabindex="0" class="flex items-center gap-2">`
  - Failure: Fix any of the following:   Element has focusable descendants
- Target: `.hover\:bg-rose-50.border-b[data-help-key="tool_scaffolds"]`
  - HTML: `<button data-help-key="tool_scaffolds" class="w-full p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center hover:bg-rose-50 transition-colors">`
  - Failure: Fix any of the following:   Element has focusable descendants
- Target: `.hover\:bg-blue-50`
  - HTML: `<button data-help-key="tool_math" aria-expanded="false" class="w-full p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center hover:bg-blue-50 transition-colors">`
  - Failure: Fix any of the following:   Element has focusable descendants

#### `color-contrast` — serious (1 node)
Elements must meet minimum color contrast ratio thresholds — [docs](https://dequeuniversity.com/rules/axe/4.10/color-contrast?application=axeAPI)

- Target: `#tab-history`
  - HTML: `<button role="tab" aria-selected="false" aria-controls="panel-history" id="tab-history" aria-label="History" class="flex-1 py-2 text-sm font-bold rounded-md transition-all flex items-center justify-ce`
  - Failure: Fix any of the following:   Element has insufficient color contrast of 3.86 (foreground color: #64748b, background color: #e2e8f0, font size: 10.5pt (14px), font weight: bold). Expected contrast ratio of 4.5:1

#### `landmark-main-is-top-level` — moderate (1 node)
Main landmark should not be contained in another landmark — [docs](https://dequeuniversity.com/rules/axe/4.10/landmark-main-is-top-level?application=axeAPI)

- Target: `.md\:flex-row`
  - HTML: `<main aria-label="Main content" id="main-content" class="flex-grow w-full flex flex-col md:flex-row gap-0 relative no-print overflow-hidden transition-all duration-300 theme-light  h-[calc(100vh-80px)`
  - Failure: Fix any of the following:   The main landmark is contained in another landmark.

#### `landmark-no-duplicate-main` — moderate (1 node)
Document should not have more than one main landmark — [docs](https://dequeuniversity.com/rules/axe/4.10/landmark-no-duplicate-main?application=axeAPI)

- Target: `.min-h-screen`
  - HTML: `<main aria-label="Main content" class="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col ">`
  - Failure: Fix any of the following:   Document has more than one main landmark

#### `landmark-unique` — moderate (1 node)
Landmarks should have a unique role or role/label/title (i.e. accessible name) combination — [docs](https://dequeuniversity.com/rules/axe/4.10/landmark-unique?application=axeAPI)

- Target: `.min-h-screen`
  - HTML: `<main aria-label="Main content" class="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col ">`
  - Failure: Fix any of the following:   The landmark must have a unique aria-label, aria-labelledby, or title to make landmarks distinguishable

### landing_with_text

#### `aria-valid-attr-value` — critical (1 node)
ARIA attributes must conform to valid values — [docs](https://dequeuniversity.com/rules/axe/4.10/aria-valid-attr-value?application=axeAPI)

- Target: `#tab-create`
  - HTML: `<button role="tab" aria-selected="true" aria-controls="panel-create" id="tab-create" aria-label="Create new content" class="flex-1 py-2 text-sm font-bold rounded-md transition-all flex items-center ju`
  - Failure: Fix all of the following:   Invalid ARIA attribute value: aria-controls="panel-create"

#### `nested-interactive` — serious (3 nodes)
Interactive controls must not be nested — [docs](https://dequeuniversity.com/rules/axe/4.10/nested-interactive?application=axeAPI)

- Target: `.gap-2.items-center[role="button"]`
  - HTML: `<div role="button" tabindex="0" class="flex items-center gap-2">`
  - Failure: Fix any of the following:   Element has focusable descendants
- Target: `.hover\:bg-rose-50.border-b[data-help-key="tool_scaffolds"]`
  - HTML: `<button data-help-key="tool_scaffolds" class="w-full p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center hover:bg-rose-50 transition-colors">`
  - Failure: Fix any of the following:   Element has focusable descendants
- Target: `.hover\:bg-blue-50`
  - HTML: `<button data-help-key="tool_math" aria-expanded="false" class="w-full p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center hover:bg-blue-50 transition-colors">`
  - Failure: Fix any of the following:   Element has focusable descendants

#### `color-contrast` — serious (1 node)
Elements must meet minimum color contrast ratio thresholds — [docs](https://dequeuniversity.com/rules/axe/4.10/color-contrast?application=axeAPI)

- Target: `button[title="launch_pad.ai_backend_settings"] > span`
  - HTML: `<span>launch_pad.ai_backend_settings</span>`
  - Failure: Fix any of the following:   Element has insufficient color contrast of 1.53 (foreground color: #c0cafd, background color: #f9fafc, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1

#### `landmark-main-is-top-level` — moderate (1 node)
Main landmark should not be contained in another landmark — [docs](https://dequeuniversity.com/rules/axe/4.10/landmark-main-is-top-level?application=axeAPI)

- Target: `.md\:flex-row`
  - HTML: `<main aria-label="Main content" id="main-content" class="flex-grow w-full flex flex-col md:flex-row gap-0 relative no-print overflow-hidden transition-all duration-300 theme-light  h-[calc(100vh-80px)`
  - Failure: Fix any of the following:   The main landmark is contained in another landmark.

#### `landmark-no-duplicate-main` — moderate (1 node)
Document should not have more than one main landmark — [docs](https://dequeuniversity.com/rules/axe/4.10/landmark-no-duplicate-main?application=axeAPI)

- Target: `.min-h-screen`
  - HTML: `<main aria-label="Main content" class="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col ">`
  - Failure: Fix any of the following:   Document has more than one main landmark

#### `landmark-unique` — moderate (1 node)
Landmarks should have a unique role or role/label/title (i.e. accessible name) combination — [docs](https://dequeuniversity.com/rules/axe/4.10/landmark-unique?application=axeAPI)

- Target: `.min-h-screen`
  - HTML: `<main aria-label="Main content" class="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col ">`
  - Failure: Fix any of the following:   The landmark must have a unique aria-label, aria-labelledby, or title to make landmarks distinguishable

### theme_dark

#### `aria-valid-attr-value` — critical (1 node)
ARIA attributes must conform to valid values — [docs](https://dequeuniversity.com/rules/axe/4.10/aria-valid-attr-value?application=axeAPI)

- Target: `#tab-create`
  - HTML: `<button role="tab" aria-selected="true" aria-controls="panel-create" id="tab-create" aria-label="Create new content" class="flex-1 py-2 text-sm font-bold rounded-md transition-all flex items-center ju`
  - Failure: Fix all of the following:   Invalid ARIA attribute value: aria-controls="panel-create"

#### `color-contrast` — serious (4 nodes)
Elements must meet minimum color contrast ratio thresholds — [docs](https://dequeuniversity.com/rules/axe/4.10/color-contrast?application=axeAPI)

- Target: `.text-green-600\/70`
  - HTML: `<span class="flex items-center gap-1 text-green-600/70">`
  - Failure: Fix any of the following:   Element has insufficient color contrast of 3.1 (foreground color: #167c43, background color: #162032, font size: 8.3pt (11px), font weight: normal). Expected contrast ratio of 4.5:1
- Target: `.hover\:text-indigo-800`
  - HTML: `<button class="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-full transition-colors flex items-center gap-1" title="Expand all cards" a`
  - Failure: Fix any of the following:   Element has insufficient color contrast of 3.44 (foreground color: #6366f1, background color: #1d204d, font size: 8.3pt (11px), font weight: bold). Expected contrast ratio of 4.5:1
- Target: `.text-rose-700 > .group-hover\:tracking-wide`
  - HTML: `<span class="group-hover:tracking-wide transition-all">StoryForge</span>`
  - Failure: Fix any of the following:   Element has insufficient color contrast of 1.38 (foreground color: #f38c9c, background color: #cfc5ca, font size: 8.3pt (11px), font weight: bold). Expected contrast ratio of 4.5:1
- Target: `h3`
  - HTML: `<h3 class="text-lg font-bold text-slate-700 flex items-center gap-2 truncate ">`
  - Failure: Fix any of the following:   Element has insufficient color contrast of 3.19 (foreground color: #f8fafc, background color: #878d97, font size: 13.5pt (18px), font weight: bold). Expected contrast ratio of 4.5:1

#### `nested-interactive` — serious (3 nodes)
Interactive controls must not be nested — [docs](https://dequeuniversity.com/rules/axe/4.10/nested-interactive?application=axeAPI)

- Target: `.gap-2.items-center[role="button"]`
  - HTML: `<div role="button" tabindex="0" class="flex items-center gap-2">`
  - Failure: Fix any of the following:   Element has focusable descendants
- Target: `.hover\:bg-rose-50.border-b[data-help-key="tool_scaffolds"]`
  - HTML: `<button data-help-key="tool_scaffolds" class="w-full p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center hover:bg-rose-50 transition-colors">`
  - Failure: Fix any of the following:   Element has focusable descendants
- Target: `.hover\:bg-blue-50`
  - HTML: `<button data-help-key="tool_math" aria-expanded="false" class="w-full p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center hover:bg-blue-50 transition-colors">`
  - Failure: Fix any of the following:   Element has focusable descendants

#### `landmark-main-is-top-level` — moderate (1 node)
Main landmark should not be contained in another landmark — [docs](https://dequeuniversity.com/rules/axe/4.10/landmark-main-is-top-level?application=axeAPI)

- Target: `.md\:flex-row`
  - HTML: `<main aria-label="Main content" id="main-content" class="flex-grow w-full flex flex-col md:flex-row gap-0 relative no-print overflow-hidden transition-all duration-300 theme-light  h-[calc(100vh-80px)`
  - Failure: Fix any of the following:   The main landmark is contained in another landmark.

#### `landmark-no-duplicate-main` — moderate (1 node)
Document should not have more than one main landmark — [docs](https://dequeuniversity.com/rules/axe/4.10/landmark-no-duplicate-main?application=axeAPI)

- Target: `.min-h-screen`
  - HTML: `<main aria-label="Main content" class="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col ">`
  - Failure: Fix any of the following:   Document has more than one main landmark

#### `landmark-unique` — moderate (1 node)
Landmarks should have a unique role or role/label/title (i.e. accessible name) combination — [docs](https://dequeuniversity.com/rules/axe/4.10/landmark-unique?application=axeAPI)

- Target: `.min-h-screen`
  - HTML: `<main aria-label="Main content" class="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col ">`
  - Failure: Fix any of the following:   The landmark must have a unique aria-label, aria-labelledby, or title to make landmarks distinguishable

### theme_contrast

#### `aria-valid-attr-value` — critical (1 node)
ARIA attributes must conform to valid values — [docs](https://dequeuniversity.com/rules/axe/4.10/aria-valid-attr-value?application=axeAPI)

- Target: `#tab-create`
  - HTML: `<button role="tab" aria-selected="true" aria-controls="panel-create" id="tab-create" aria-label="Create new content" class="flex-1 py-2 text-sm font-bold rounded-md transition-all flex items-center ju`
  - Failure: Fix all of the following:   Invalid ARIA attribute value: aria-controls="panel-create"

#### `nested-interactive` — serious (3 nodes)
Interactive controls must not be nested — [docs](https://dequeuniversity.com/rules/axe/4.10/nested-interactive?application=axeAPI)

- Target: `.gap-2.items-center[role="button"]`
  - HTML: `<div role="button" tabindex="0" class="flex items-center gap-2">`
  - Failure: Fix any of the following:   Element has focusable descendants
- Target: `.hover\:bg-rose-50.border-b[data-help-key="tool_scaffolds"]`
  - HTML: `<button data-help-key="tool_scaffolds" class="w-full p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center hover:bg-rose-50 transition-colors">`
  - Failure: Fix any of the following:   Element has focusable descendants
- Target: `.hover\:bg-blue-50`
  - HTML: `<button data-help-key="tool_math" aria-expanded="false" class="w-full p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center hover:bg-blue-50 transition-colors">`
  - Failure: Fix any of the following:   Element has focusable descendants

#### `landmark-main-is-top-level` — moderate (1 node)
Main landmark should not be contained in another landmark — [docs](https://dequeuniversity.com/rules/axe/4.10/landmark-main-is-top-level?application=axeAPI)

- Target: `.md\:flex-row`
  - HTML: `<main aria-label="Main content" id="main-content" class="flex-grow w-full flex flex-col md:flex-row gap-0 relative no-print overflow-hidden transition-all duration-300 theme-light  h-[calc(100vh-80px)`
  - Failure: Fix any of the following:   The main landmark is contained in another landmark.

#### `landmark-no-duplicate-main` — moderate (1 node)
Document should not have more than one main landmark — [docs](https://dequeuniversity.com/rules/axe/4.10/landmark-no-duplicate-main?application=axeAPI)

- Target: `.min-h-screen`
  - HTML: `<main aria-label="Main content" class="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col ">`
  - Failure: Fix any of the following:   Document has more than one main landmark

#### `landmark-unique` — moderate (1 node)
Landmarks should have a unique role or role/label/title (i.e. accessible name) combination — [docs](https://dequeuniversity.com/rules/axe/4.10/landmark-unique?application=axeAPI)

- Target: `.min-h-screen`
  - HTML: `<main aria-label="Main content" class="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col ">`
  - Failure: Fix any of the following:   The landmark must have a unique aria-label, aria-labelledby, or title to make landmarks distinguishable

### reading_theme_sepia

#### `aria-valid-attr-value` — critical (1 node)
ARIA attributes must conform to valid values — [docs](https://dequeuniversity.com/rules/axe/4.10/aria-valid-attr-value?application=axeAPI)

- Target: `#tab-create`
  - HTML: `<button role="tab" aria-selected="true" aria-controls="panel-create" id="tab-create" aria-label="Create new content" class="flex-1 py-2 text-sm font-bold rounded-md transition-all flex items-center ju`
  - Failure: Fix all of the following:   Invalid ARIA attribute value: aria-controls="panel-create"

#### `nested-interactive` — serious (3 nodes)
Interactive controls must not be nested — [docs](https://dequeuniversity.com/rules/axe/4.10/nested-interactive?application=axeAPI)

- Target: `.gap-2.items-center[role="button"]`
  - HTML: `<div role="button" tabindex="0" class="flex items-center gap-2">`
  - Failure: Fix any of the following:   Element has focusable descendants
- Target: `.hover\:bg-rose-50.border-b[data-help-key="tool_scaffolds"]`
  - HTML: `<button data-help-key="tool_scaffolds" class="w-full p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center hover:bg-rose-50 transition-colors">`
  - Failure: Fix any of the following:   Element has focusable descendants
- Target: `.hover\:bg-blue-50`
  - HTML: `<button data-help-key="tool_math" aria-expanded="false" class="w-full p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center hover:bg-blue-50 transition-colors">`
  - Failure: Fix any of the following:   Element has focusable descendants

#### `color-contrast` — serious (1 node)
Elements must meet minimum color contrast ratio thresholds — [docs](https://dequeuniversity.com/rules/axe/4.10/color-contrast?application=axeAPI)

- Target: `button[title="launch_pad.ai_backend_settings"] > span`
  - HTML: `<span>launch_pad.ai_backend_settings</span>`
  - Failure: Fix any of the following:   Element has insufficient color contrast of 1.53 (foreground color: #c0cafd, background color: #f9fafc, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1

#### `landmark-main-is-top-level` — moderate (1 node)
Main landmark should not be contained in another landmark — [docs](https://dequeuniversity.com/rules/axe/4.10/landmark-main-is-top-level?application=axeAPI)

- Target: `.md\:flex-row`
  - HTML: `<main aria-label="Main content" id="main-content" class="flex-grow w-full flex flex-col md:flex-row gap-0 relative no-print overflow-hidden transition-all duration-300 theme-light  h-[calc(100vh-80px)`
  - Failure: Fix any of the following:   The main landmark is contained in another landmark.

#### `landmark-no-duplicate-main` — moderate (1 node)
Document should not have more than one main landmark — [docs](https://dequeuniversity.com/rules/axe/4.10/landmark-no-duplicate-main?application=axeAPI)

- Target: `.min-h-screen`
  - HTML: `<main aria-label="Main content" class="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col ">`
  - Failure: Fix any of the following:   Document has more than one main landmark

#### `landmark-unique` — moderate (1 node)
Landmarks should have a unique role or role/label/title (i.e. accessible name) combination — [docs](https://dequeuniversity.com/rules/axe/4.10/landmark-unique?application=axeAPI)

- Target: `.min-h-screen`
  - HTML: `<main aria-label="Main content" class="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col ">`
  - Failure: Fix any of the following:   The landmark must have a unique aria-label, aria-labelledby, or title to make landmarks distinguishable

### reading_theme_dyslexia

#### `aria-valid-attr-value` — critical (1 node)
ARIA attributes must conform to valid values — [docs](https://dequeuniversity.com/rules/axe/4.10/aria-valid-attr-value?application=axeAPI)

- Target: `#tab-create`
  - HTML: `<button role="tab" aria-selected="true" aria-controls="panel-create" id="tab-create" aria-label="Create new content" class="flex-1 py-2 text-sm font-bold rounded-md transition-all flex items-center ju`
  - Failure: Fix all of the following:   Invalid ARIA attribute value: aria-controls="panel-create"

#### `nested-interactive` — serious (3 nodes)
Interactive controls must not be nested — [docs](https://dequeuniversity.com/rules/axe/4.10/nested-interactive?application=axeAPI)

- Target: `.gap-2.items-center[role="button"]`
  - HTML: `<div role="button" tabindex="0" class="flex items-center gap-2">`
  - Failure: Fix any of the following:   Element has focusable descendants
- Target: `.hover\:bg-rose-50.border-b[data-help-key="tool_scaffolds"]`
  - HTML: `<button data-help-key="tool_scaffolds" class="w-full p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center hover:bg-rose-50 transition-colors">`
  - Failure: Fix any of the following:   Element has focusable descendants
- Target: `.hover\:bg-blue-50`
  - HTML: `<button data-help-key="tool_math" aria-expanded="false" class="w-full p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center hover:bg-blue-50 transition-colors">`
  - Failure: Fix any of the following:   Element has focusable descendants

#### `color-contrast` — serious (1 node)
Elements must meet minimum color contrast ratio thresholds — [docs](https://dequeuniversity.com/rules/axe/4.10/color-contrast?application=axeAPI)

- Target: `button[title="launch_pad.ai_backend_settings"] > span`
  - HTML: `<span>launch_pad.ai_backend_settings</span>`
  - Failure: Fix any of the following:   Element has insufficient color contrast of 1.53 (foreground color: #c0cafd, background color: #f9fafc, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1

#### `landmark-main-is-top-level` — moderate (1 node)
Main landmark should not be contained in another landmark — [docs](https://dequeuniversity.com/rules/axe/4.10/landmark-main-is-top-level?application=axeAPI)

- Target: `.md\:flex-row`
  - HTML: `<main aria-label="Main content" id="main-content" class="flex-grow w-full flex flex-col md:flex-row gap-0 relative no-print overflow-hidden transition-all duration-300 theme-light  h-[calc(100vh-80px)`
  - Failure: Fix any of the following:   The main landmark is contained in another landmark.

#### `landmark-no-duplicate-main` — moderate (1 node)
Document should not have more than one main landmark — [docs](https://dequeuniversity.com/rules/axe/4.10/landmark-no-duplicate-main?application=axeAPI)

- Target: `.min-h-screen`
  - HTML: `<main aria-label="Main content" class="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col ">`
  - Failure: Fix any of the following:   Document has more than one main landmark

#### `landmark-unique` — moderate (1 node)
Landmarks should have a unique role or role/label/title (i.e. accessible name) combination — [docs](https://dequeuniversity.com/rules/axe/4.10/landmark-unique?application=axeAPI)

- Target: `.min-h-screen`
  - HTML: `<main aria-label="Main content" class="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col ">`
  - Failure: Fix any of the following:   The landmark must have a unique aria-label, aria-labelledby, or title to make landmarks distinguishable

### color_overlay_blue

#### `aria-valid-attr-value` — critical (1 node)
ARIA attributes must conform to valid values — [docs](https://dequeuniversity.com/rules/axe/4.10/aria-valid-attr-value?application=axeAPI)

- Target: `#tab-create`
  - HTML: `<button role="tab" aria-selected="true" aria-controls="panel-create" id="tab-create" aria-label="Create new content" class="flex-1 py-2 text-sm font-bold rounded-md transition-all flex items-center ju`
  - Failure: Fix all of the following:   Invalid ARIA attribute value: aria-controls="panel-create"

#### `nested-interactive` — serious (3 nodes)
Interactive controls must not be nested — [docs](https://dequeuniversity.com/rules/axe/4.10/nested-interactive?application=axeAPI)

- Target: `.gap-2.items-center[role="button"]`
  - HTML: `<div role="button" tabindex="0" class="flex items-center gap-2">`
  - Failure: Fix any of the following:   Element has focusable descendants
- Target: `.hover\:bg-rose-50.border-b[data-help-key="tool_scaffolds"]`
  - HTML: `<button data-help-key="tool_scaffolds" class="w-full p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center hover:bg-rose-50 transition-colors">`
  - Failure: Fix any of the following:   Element has focusable descendants
- Target: `.hover\:bg-blue-50`
  - HTML: `<button data-help-key="tool_math" aria-expanded="false" class="w-full p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center hover:bg-blue-50 transition-colors">`
  - Failure: Fix any of the following:   Element has focusable descendants

#### `color-contrast` — serious (2 nodes)
Elements must meet minimum color contrast ratio thresholds — [docs](https://dequeuniversity.com/rules/axe/4.10/color-contrast?application=axeAPI)

- Target: `.text-green-600\/70`
  - HTML: `<span class="flex items-center gap-1 text-green-600/70">`
  - Failure: Fix any of the following:   Element has insufficient color contrast of 2.27 (foreground color: #5cbf80, background color: #ffffff, font size: 8.3pt (11px), font weight: normal). Expected contrast ratio of 4.5:1
- Target: `button[title="launch_pad.ai_backend_settings"] > span`
  - HTML: `<span>launch_pad.ai_backend_settings</span>`
  - Failure: Fix any of the following:   Element has insufficient color contrast of 1.53 (foreground color: #c0cafd, background color: #f9fafc, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1

#### `landmark-main-is-top-level` — moderate (1 node)
Main landmark should not be contained in another landmark — [docs](https://dequeuniversity.com/rules/axe/4.10/landmark-main-is-top-level?application=axeAPI)

- Target: `.md\:flex-row`
  - HTML: `<main aria-label="Main content" id="main-content" class="flex-grow w-full flex flex-col md:flex-row gap-0 relative no-print overflow-hidden transition-all duration-300 theme-light  h-[calc(100vh-80px)`
  - Failure: Fix any of the following:   The main landmark is contained in another landmark.

#### `landmark-no-duplicate-main` — moderate (1 node)
Document should not have more than one main landmark — [docs](https://dequeuniversity.com/rules/axe/4.10/landmark-no-duplicate-main?application=axeAPI)

- Target: `.min-h-screen`
  - HTML: `<main aria-label="Main content" class="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col ">`
  - Failure: Fix any of the following:   Document has more than one main landmark

#### `landmark-unique` — moderate (1 node)
Landmarks should have a unique role or role/label/title (i.e. accessible name) combination — [docs](https://dequeuniversity.com/rules/axe/4.10/landmark-unique?application=axeAPI)

- Target: `.min-h-screen`
  - HTML: `<main aria-label="Main content" class="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col ">`
  - Failure: Fix any of the following:   The landmark must have a unique aria-label, aria-labelledby, or title to make landmarks distinguishable
