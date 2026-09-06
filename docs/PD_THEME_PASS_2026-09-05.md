# PD catalog modal: dark and high-contrast theme pass (2026-09-05)

## Method

The catalog modal (`catalog_module.js`, `CommunityCatalog`) was rendered in Chromium under the real
host cascade: the app's precompiled Tailwind (`dev-tools/.cache/sweep-tailwind.css`), the
`AppStyles` component from `app_styles_module.js` (which carries the `.theme-dark` and
`.theme-contrast` rules), React 18 UMD, the local PD manifest and modules routed in place of GitHub.
Each theme (`theme-light`, `theme-dark`, `theme-contrast` on `<html>` and `<body>`) was measured with
axe-core `color-contrast` and screenshotted. Surfaces reached: PD home (paths, filters, 9 cards),
the runner for read, quiz, persona, branching and completion screens, the My modules shelf, the
editor (New module), Create with AI, and Submit a module. The facilitator guide opens a separate
printable document and was not measured.

## Finding

The host cascade already darkens almost everything: `.theme-dark .bg-white`, `.bg-*-50/100` and
`.text-*-500..900` rules recolour the modal's Tailwind classes, so dark theme measured 0 violations
on every surface before any change. Two defects survived the cascade:

1. **Learning-path cards used a gradient background** (`bg-gradient-to-br from-sky-50 to-indigo-50`).
   Gradients are `background-image`, which the cascade does not touch, so in dark theme the
   recoloured light title sat on a pale card (invisible) and in high contrast the forced yellow text
   sat on white. axe reported these as "unmeasured", never as failures: the gradient blind spot
   from memory, confirmed again. Fix: solid `bg-sky-50`, which the cascade recolours.
2. **Links and `<summary>` in high contrast** stayed `text-indigo-700` on black (2.65:1) because the
   `.theme-contrast` cascade forces p/span/div/li/label/headings and buttons but not `a` or
   `summary`. Fix: the dialog root carries `data-allo-catalog` and emits one scoped rule that sets
   those to `#ffff00` with a green focus ring, high-contrast only. Dark needs nothing because
   `.theme-dark .text-indigo-700` is already recoloured.

## After

| Surface | dark | contrast | unmeasured (was) |
| --- | --- | --- | --- |
| PD home, full height | 0 | 0 | 0 (12 dark / 9 contrast) |
| Read activity with links | 0 | 0 | 0 |
| Quiz, branching, persona, completion | 0 | 0 | 0 |
| My modules, editor, Create with AI, Submit | 0 | 0 | 0 |

Mirror `desktop/web-app/public/catalog_module.js` byte-identical. PD suites: 190 tests, all green
after one 5-second timeout rerun in isolation.

## Caveats

- This is the modal rendered on its own with the host stylesheet, not the full app: no host
  state, no live AI, no service worker. A change that depends on host wiring would not show here.
- The `.theme-contrast` gap for `a`/`summary` is app-wide; this pass fixes it only inside the
  catalog dialog. A global rule in `app_styles_source.jsx` would close it everywhere and should be
  measured against the Sourcebook and STEM cards before it is added.
- Harness kept out of the repo (session scratchpad, `pd_theme_harness.mjs`); the recipe is the one in
  `.claude/skills/render-view-module`, plus routing the raw GitHub catalog URLs to local files.
