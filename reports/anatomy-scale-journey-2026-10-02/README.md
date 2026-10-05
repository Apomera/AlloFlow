# Anatomy: Learning tools and scale navigation

October 2, 2026

The section beneath the body diagram now presents a readable route from the body system and selected structure to detail and cell views. Numbered context cards, explicit action labels, and stronger borders make the available actions clear.

## Improvements

- Replaced the cramped four-column route with two columns on desktop and one on narrow phones or with larger text enabled.
- Increased primary text to 16px, or 17px with larger text. The section uses the existing light, dark, and contrast palettes.
- Added visible “Open detail view” and “Open cell view” labels. Button names come from their visible translated content.
- Corrected the quadriceps destination label to match the Anatomy Lens gallery it opens.
- Gallery navigation now brings its heading into view and moves keyboard focus after the accepted update. Focus stays put if the learner changes activity, selection, view, or focus before the callback.
- Kept the disclosure indicator aligned on phones and placed its focus ring inside the panel so it remains visible.
- Added 25 labels with 75 native French, Latin American Spanish, and Arabic translations. Dynamic structure names use bidirectional isolation.
- Made the pin legend and circulatory color key easier to read. Existing scores, notes, learning records, and Spotter answer concealment remain intact.

## Verification

- **28 navigation checks passed**, covering both runtime copies, actual destinations, saved work, gallery focus, and state changes during navigation.
- **2 browser journeys passed** against the final source. They cover gallery navigation, Cell Atlas handoff, saved work, and pending Spotter concealment.
- **5 accessibility scans passed** across desktop light, 320px phone light and dark, Arabic with larger text, and forced colors. No violations, page errors, or horizontal overflow were found in these journeys.
- Reviewed all five final screenshots. Measured text contrast was at least **7.09:1** and section controls were at least **46px tall**. The full summary focus ring is visible.
- Runtime copies and four catalog pairs are byte-identical. New labels and placeholders match the manifest. The 309,592-character block containing system, regional atlas, and Lens data is unchanged from this pass's baseline.

Navigation checks used source `db7345d…`. The final source, `5655d23c…`, adds only the disclosure header and focus CSS. An exact reverse check confirms that relationship; final browser checks include the CSS adjustment.

Changes are uncommitted and unstaged. This pass did not deploy the tool.

## Evidence

- [Delivery verification](delivery-check.json)
- [Navigation results](scale-navigation-tests.json) and [source proof](scale-navigation-tests-proof.json)
- [Browser results](browser-validation.json) and [Playwright result](playwright-result.json)
- [Catalog validation](catalog-validation.json)
- [Final CSS verification](summary-css-proof.json)

## Final screens

### Desktop with keyboard focus on the disclosure

![Desktop Learning tools with a visible rounded focus ring](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-scale-journey-2026-10-02/screenshots/desktop-light-learning-tools.png)

### Phone in dark mode

![Phone Learning tools in dark mode](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-scale-journey-2026-10-02/screenshots/phone-dark-learning-tools.png)

### Arabic with larger text

![Arabic Learning tools in dark mode with larger text](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/anatomy-scale-journey-2026-10-02/screenshots/phone-arabic-dark-larger-learning-tools.png)
