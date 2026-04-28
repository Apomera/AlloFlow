# AlloFlow axe-core Audit Report

- **Target:** https://prismflow-911fe.web.app
- **When:** 2026-04-28T00:39:39.490Z
- **axe-core:** 4.10.3
- **Scenarios audited:** 7

## Summary by scenario

| Scenario | Rules | Nodes | Critical | Serious | Moderate | Minor | Incomplete |
|---|---:|---:|---:|---:|---:|---:|---:|
| landing | 3 | 3 | 0 | 0 | 3 | 0 | 2 |
| landing_with_text | 3 | 3 | 0 | 0 | 3 | 0 | 2 |
| theme_dark | 3 | 3 | 0 | 0 | 3 | 0 | 2 |
| theme_contrast | 3 | 3 | 0 | 0 | 3 | 0 | 2 |
| reading_theme_sepia | 3 | 3 | 0 | 0 | 3 | 0 | 2 |
| reading_theme_dyslexia | 3 | 3 | 0 | 0 | 3 | 0 | 2 |
| color_overlay_blue | 3 | 3 | 0 | 0 | 3 | 0 | 2 |

## Rules ranked by severity × impact

| Rule | Impact | Nodes (summed) | Scenarios | Help |
|---|---|---:|---|---|
| `landmark-banner-is-top-level` | moderate | 7 | landing, landing_with_text, theme_dark, theme_contrast, reading_theme_sepia, reading_theme_dyslexia, color_overlay_blue | [Banner landmark should not be contained in another landmark](https://dequeuniversity.com/rules/axe/4.10/landmark-banner-is-top-level?application=axeAPI) |
| `landmark-complementary-is-top-level` | moderate | 7 | landing, landing_with_text, theme_dark, theme_contrast, reading_theme_sepia, reading_theme_dyslexia, color_overlay_blue | [Aside should not be contained in another landmark](https://dequeuniversity.com/rules/axe/4.10/landmark-complementary-is-top-level?application=axeAPI) |
| `landmark-main-is-top-level` | moderate | 7 | landing, landing_with_text, theme_dark, theme_contrast, reading_theme_sepia, reading_theme_dyslexia, color_overlay_blue | [Main landmark should not be contained in another landmark](https://dequeuniversity.com/rules/axe/4.10/landmark-main-is-top-level?application=axeAPI) |

## Top violations per scenario (first 5 nodes shown)

### landing

#### `landmark-banner-is-top-level` — moderate (1 node)
Banner landmark should not be contained in another landmark — [docs](https://dequeuniversity.com/rules/axe/4.10/landmark-banner-is-top-level?application=axeAPI)

- Target: `header`
  - HTML: `<header aria-label="Main application header" class="p-6 md:py-8 md:px-10 shadow-2xl no-print relative z-50 transition-all duration-500 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops`
  - Failure: Fix any of the following:   The null landmark is contained in another landmark.

#### `landmark-complementary-is-top-level` — moderate (1 node)
Aside should not be contained in another landmark — [docs](https://dequeuniversity.com/rules/axe/4.10/landmark-complementary-is-top-level?application=axeAPI)

- Target: `aside`
  - HTML: `<aside aria-label="Gemini Powered Scaffolds" class="flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar transition-all duration-200 block " style="width: 35%; height: 100%;">`
  - Failure: Fix any of the following:   The complementary landmark is contained in another landmark.

#### `landmark-main-is-top-level` — moderate (1 node)
Main landmark should not be contained in another landmark — [docs](https://dequeuniversity.com/rules/axe/4.10/landmark-main-is-top-level?application=axeAPI)

- Target: `#main-content`
  - HTML: `<main aria-label="Main content" id="main-content" class="flex-grow w-full flex flex-col md:flex-row gap-0 relative no-print overflow-hidden transition-all duration-300 theme-light  h-[calc(100vh-80px)`
  - Failure: Fix any of the following:   The main landmark is contained in another landmark.

### landing_with_text

#### `landmark-banner-is-top-level` — moderate (1 node)
Banner landmark should not be contained in another landmark — [docs](https://dequeuniversity.com/rules/axe/4.10/landmark-banner-is-top-level?application=axeAPI)

- Target: `header`
  - HTML: `<header aria-label="Main application header" class="p-6 md:py-8 md:px-10 shadow-2xl no-print relative z-50 transition-all duration-500 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops`
  - Failure: Fix any of the following:   The null landmark is contained in another landmark.

#### `landmark-complementary-is-top-level` — moderate (1 node)
Aside should not be contained in another landmark — [docs](https://dequeuniversity.com/rules/axe/4.10/landmark-complementary-is-top-level?application=axeAPI)

- Target: `aside`
  - HTML: `<aside aria-label="Gemini Powered Scaffolds" class="flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar transition-all duration-200 block " style="width: 35%; height: 100%;">`
  - Failure: Fix any of the following:   The complementary landmark is contained in another landmark.

#### `landmark-main-is-top-level` — moderate (1 node)
Main landmark should not be contained in another landmark — [docs](https://dequeuniversity.com/rules/axe/4.10/landmark-main-is-top-level?application=axeAPI)

- Target: `#main-content`
  - HTML: `<main aria-label="Main content" id="main-content" class="flex-grow w-full flex flex-col md:flex-row gap-0 relative no-print overflow-hidden transition-all duration-300 theme-light  h-[calc(100vh-80px)`
  - Failure: Fix any of the following:   The main landmark is contained in another landmark.

### theme_dark

#### `landmark-banner-is-top-level` — moderate (1 node)
Banner landmark should not be contained in another landmark — [docs](https://dequeuniversity.com/rules/axe/4.10/landmark-banner-is-top-level?application=axeAPI)

- Target: `header`
  - HTML: `<header aria-label="Main application header" class="p-6 md:py-8 md:px-10 shadow-2xl no-print relative z-50 transition-all duration-500 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops`
  - Failure: Fix any of the following:   The null landmark is contained in another landmark.

#### `landmark-complementary-is-top-level` — moderate (1 node)
Aside should not be contained in another landmark — [docs](https://dequeuniversity.com/rules/axe/4.10/landmark-complementary-is-top-level?application=axeAPI)

- Target: `aside`
  - HTML: `<aside aria-label="Gemini Powered Scaffolds" class="flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar transition-all duration-200 block " style="width: 35%; height: 100%;">`
  - Failure: Fix any of the following:   The complementary landmark is contained in another landmark.

#### `landmark-main-is-top-level` — moderate (1 node)
Main landmark should not be contained in another landmark — [docs](https://dequeuniversity.com/rules/axe/4.10/landmark-main-is-top-level?application=axeAPI)

- Target: `#main-content`
  - HTML: `<main aria-label="Main content" id="main-content" class="flex-grow w-full flex flex-col md:flex-row gap-0 relative no-print overflow-hidden transition-all duration-300 theme-light  h-[calc(100vh-80px)`
  - Failure: Fix any of the following:   The main landmark is contained in another landmark.

### theme_contrast

#### `landmark-banner-is-top-level` — moderate (1 node)
Banner landmark should not be contained in another landmark — [docs](https://dequeuniversity.com/rules/axe/4.10/landmark-banner-is-top-level?application=axeAPI)

- Target: `header`
  - HTML: `<header aria-label="Main application header" class="p-6 md:py-8 md:px-10 shadow-2xl no-print relative z-50 transition-all duration-500 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops`
  - Failure: Fix any of the following:   The null landmark is contained in another landmark.

#### `landmark-complementary-is-top-level` — moderate (1 node)
Aside should not be contained in another landmark — [docs](https://dequeuniversity.com/rules/axe/4.10/landmark-complementary-is-top-level?application=axeAPI)

- Target: `aside`
  - HTML: `<aside aria-label="Gemini Powered Scaffolds" class="flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar transition-all duration-200 block " style="width: 35%; height: 100%;">`
  - Failure: Fix any of the following:   The complementary landmark is contained in another landmark.

#### `landmark-main-is-top-level` — moderate (1 node)
Main landmark should not be contained in another landmark — [docs](https://dequeuniversity.com/rules/axe/4.10/landmark-main-is-top-level?application=axeAPI)

- Target: `#main-content`
  - HTML: `<main aria-label="Main content" id="main-content" class="flex-grow w-full flex flex-col md:flex-row gap-0 relative no-print overflow-hidden transition-all duration-300 theme-light  h-[calc(100vh-80px)`
  - Failure: Fix any of the following:   The main landmark is contained in another landmark.

### reading_theme_sepia

#### `landmark-banner-is-top-level` — moderate (1 node)
Banner landmark should not be contained in another landmark — [docs](https://dequeuniversity.com/rules/axe/4.10/landmark-banner-is-top-level?application=axeAPI)

- Target: `header`
  - HTML: `<header aria-label="Main application header" class="p-6 md:py-8 md:px-10 shadow-2xl no-print relative z-50 transition-all duration-500 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops`
  - Failure: Fix any of the following:   The null landmark is contained in another landmark.

#### `landmark-complementary-is-top-level` — moderate (1 node)
Aside should not be contained in another landmark — [docs](https://dequeuniversity.com/rules/axe/4.10/landmark-complementary-is-top-level?application=axeAPI)

- Target: `aside`
  - HTML: `<aside aria-label="Gemini Powered Scaffolds" class="flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar transition-all duration-200 block " style="width: 35%; height: 100%;">`
  - Failure: Fix any of the following:   The complementary landmark is contained in another landmark.

#### `landmark-main-is-top-level` — moderate (1 node)
Main landmark should not be contained in another landmark — [docs](https://dequeuniversity.com/rules/axe/4.10/landmark-main-is-top-level?application=axeAPI)

- Target: `#main-content`
  - HTML: `<main aria-label="Main content" id="main-content" class="flex-grow w-full flex flex-col md:flex-row gap-0 relative no-print overflow-hidden transition-all duration-300 theme-light  h-[calc(100vh-80px)`
  - Failure: Fix any of the following:   The main landmark is contained in another landmark.

### reading_theme_dyslexia

#### `landmark-banner-is-top-level` — moderate (1 node)
Banner landmark should not be contained in another landmark — [docs](https://dequeuniversity.com/rules/axe/4.10/landmark-banner-is-top-level?application=axeAPI)

- Target: `header`
  - HTML: `<header aria-label="Main application header" class="p-6 md:py-8 md:px-10 shadow-2xl no-print relative z-50 transition-all duration-500 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops`
  - Failure: Fix any of the following:   The null landmark is contained in another landmark.

#### `landmark-complementary-is-top-level` — moderate (1 node)
Aside should not be contained in another landmark — [docs](https://dequeuniversity.com/rules/axe/4.10/landmark-complementary-is-top-level?application=axeAPI)

- Target: `aside`
  - HTML: `<aside aria-label="Gemini Powered Scaffolds" class="flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar transition-all duration-200 block " style="width: 35%; height: 100%;">`
  - Failure: Fix any of the following:   The complementary landmark is contained in another landmark.

#### `landmark-main-is-top-level` — moderate (1 node)
Main landmark should not be contained in another landmark — [docs](https://dequeuniversity.com/rules/axe/4.10/landmark-main-is-top-level?application=axeAPI)

- Target: `#main-content`
  - HTML: `<main aria-label="Main content" id="main-content" class="flex-grow w-full flex flex-col md:flex-row gap-0 relative no-print overflow-hidden transition-all duration-300 theme-light  h-[calc(100vh-80px)`
  - Failure: Fix any of the following:   The main landmark is contained in another landmark.

### color_overlay_blue

#### `landmark-banner-is-top-level` — moderate (1 node)
Banner landmark should not be contained in another landmark — [docs](https://dequeuniversity.com/rules/axe/4.10/landmark-banner-is-top-level?application=axeAPI)

- Target: `header`
  - HTML: `<header aria-label="Main application header" class="p-6 md:py-8 md:px-10 shadow-2xl no-print relative z-50 transition-all duration-500 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops`
  - Failure: Fix any of the following:   The null landmark is contained in another landmark.

#### `landmark-complementary-is-top-level` — moderate (1 node)
Aside should not be contained in another landmark — [docs](https://dequeuniversity.com/rules/axe/4.10/landmark-complementary-is-top-level?application=axeAPI)

- Target: `aside`
  - HTML: `<aside aria-label="Gemini Powered Scaffolds" class="flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar transition-all duration-200 block " style="width: 35%; height: 100%;">`
  - Failure: Fix any of the following:   The complementary landmark is contained in another landmark.

#### `landmark-main-is-top-level` — moderate (1 node)
Main landmark should not be contained in another landmark — [docs](https://dequeuniversity.com/rules/axe/4.10/landmark-main-is-top-level?application=axeAPI)

- Target: `#main-content`
  - HTML: `<main aria-label="Main content" id="main-content" class="flex-grow w-full flex flex-col md:flex-row gap-0 relative no-print overflow-hidden transition-all duration-300 theme-light  h-[calc(100vh-80px)`
  - Failure: Fix any of the following:   The main landmark is contained in another landmark.
