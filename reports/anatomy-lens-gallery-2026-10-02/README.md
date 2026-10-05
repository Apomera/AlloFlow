# Anatomy Lens: Gallery and navigation

October 3, 2026

Anatomy Lens now presents eight guided diagrams in readable cards, with clear opening actions, an explicit Close gallery button, and progress that counts diagrams opened. The Brain Atlas has its own section explaining that it opens another STEM tool.

## Improvements

- Increased card titles to 18px, or 20px with larger text. Descriptions and actions use 16px text, with stronger borders and the existing light, dark, and contrast palettes.
- Added a responsive grid, clear keyboard focus rings, opened badges, and a native progress meter that remains visible in forced colors.
- Opening a card selects its correct body system, view, and minimum learning level, then brings the guided diagram into view and focuses it. All eight regional diagrams accept this focus.
- Closing returns focus to the Scale action or toolbar entry. If More controls has been collapsed, focus returns to its visible disclosure.
- Navigation merges the latest opened flags and preserves saved notes, Quiz results, Cards, Spotter, and other learning records. Stale actions and delayed focus callbacks respect newer activity and deliberate focus changes.
- Added 39 English labels with 117 native French, Latin American Spanish, and Arabic translations. Card names follow their visible translated content; direction and arrows adapt to Arabic.

## Verification

- **97 focused checks passed:** 64 gallery navigation cases, 28 Scale regressions, and five existing Lens checks. Both runtime copies were tested.
- **2 browser journeys passed:** Scale and toolbar entry, close and focus return, hidden-toolbar fallback, cross-system navigation, required level promotion, saved work, and Brain Atlas handoff.
- **5 scoped accessibility scans passed:** desktop light, 320px phone light and dark, Arabic with larger text, and forced colors. These journeys produced no accessibility violations, page errors, or horizontal overflow.
- Reviewed all **6 final captures**. Gallery text contrast measured at least **7.23:1**, and controls were at least **46px tall**. The kidney destination had a visible 3px focus ring and appeared 16px below the viewport edge.
- Syntax checks passed. Both runtime copies and four catalog pairs are byte-identical. All new labels and placeholders match the manifest. The 309,592-character block containing authored system, regional atlas, and Lens data is unchanged from the pass baseline.

Final checks used source `508c53c171544738474cc2924191067f9f24966bc07867b7ae7e897e8fd70cb2`, unchanged before and after testing. Earlier diagnostic results are retained separately and are excluded from the final counts.

Verification covers the gallery and its navigation. Dense labels within existing regional SVG diagrams remain a follow-up item.

Changes are **uncommitted and unstaged**.

## Evidence

- [Delivery verification](delivery-check.json)
- [Navigation results](gallery-navigation-tests.json) and [source proof](gallery-navigation-tests-proof.json)
- [Existing Lens results](existing-lens-tests.json) and [source proof](existing-lens-tests-proof.json)
- [Browser evidence](browser-validation.json) and [Playwright results](playwright-result.json)
- [Catalog validation](catalog-validation.json)

## Final screens

### Desktop gallery

![Anatomy Lens with eight readable cards, progress, and a separate Brain Atlas section](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-lens-gallery-2026-10-02/screenshots/desktop-light-lens-gallery.png)

### Arabic with larger text

![Arabic Anatomy Lens in dark mode with larger text and mirrored actions](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-lens-gallery-2026-10-02/screenshots/phone-arabic-dark-larger-lens-gallery.png)

### Forced colors

![Phone gallery with visible progress and keyboard focus in forced colors](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-lens-gallery-2026-10-02/screenshots/phone-forced-colors-lens-gallery.png)

### Guided diagram destination

![Kidney guided diagram with a visible focus outline after opening from the gallery](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-lens-gallery-2026-10-02/screenshots/desktop-kidney-destination.png)
