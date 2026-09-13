# Focus view discoverability — September 12, 2026

## Changes

Adapted Text now includes a visible Focus view toggle next to Immersive Reader and Reading theme, for students and teachers. A short description explains that it hides the header and sidebar. The same button exits focus view and exposes its active state to assistive technology.

The global exit button occupies its own space above the content rather than covering the reading tools. Its accessible name now matches the visible Exit focus view (Esc) label. When that button disappears, keyboard focus returns to the reader toggle without moving focus away from another active reading control.

English command-palette and Adventure labels now use Focus view. The command palette accepts both focus view and existing zen searches, and its confirmation explains how to exit. Adapted Text help copy uses the same terminology.

## Verification

- 225 tests passed across nine reader, command, keyboard, accessibility, and theme suites (tests.json).
- 90 Chromium app-theme/reading-palette/viewport combinations passed at 320, 390, and 1280 pixels, plus forced colors and print checks (theme-matrix.json).
- Browser tests use the real reader and styles modules, plus the actual global exit JSX extracted from the host. Enter and Space toggle focus view; global exit returns focus to the reader toggle. Theme and reading width are retained.
- Exit control has at least 44 pixels of height and does not overlap the reader. Enlarged text fits each viewport, and the reader has no serious or critical axe violations in the checked focused configuration. The 320-pixel screenshot was visually inspected.
- Three host sources parse successfully and pass integration checks. Root/public modules, catalog mirrors, and canonical module cache hashes match (build-verification.json).

## Access

Open Adapted Text and choose Focus view beside the reading controls. Choose Exit focus view or press Esc to return. The command palette also accepts focus view or zen.

## Scope

Changes are local, not deployed. Browser verification uses an isolated harness; it does not exercise authenticated production services. Existing translated catalogs may retain their previously translated labels until refreshed.
