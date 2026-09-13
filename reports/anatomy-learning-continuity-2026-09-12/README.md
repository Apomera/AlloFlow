# Anatomy: connected learning and scientific refinements

This enhancement pass connects study evidence across repeated organ entries, extends four existing guided scenarios into prediction and transfer activities, and brings learners’ explanations into the study sheet and portable record. The active web source and desktop mirror contain identical changes.

## What changed

- **Shared organ evidence.** The diaphragm, adrenal glands, ovaries, and testes now share confidence, review dates, and scored recall counts across their collection entries. Existing dated evidence resolves to the newest valid rating; undated ties use the more cautious rating. Notes remain attached to the individual entry, and context buttons open the related entry on the correct diagram. Pancreatic islets remain separate from the whole pancreas; the hypothalamus remains separate from the broader hypothalamic–pituitary axis.
- **Four guided learning sequences.** Exercise, meal absorption, wound repair, and fluid balance now have explicit objectives, a prediction before revealing the disruption, an explanation with a self-review checklist, and a new situation requiring transfer. Choices receive explanatory feedback. Writing is saved for reflection and is not automatically graded or converted into a mastery score.
- **A working quadriceps mechanism link.** The exercise scenario now opens the cellular muscle mechanism. Its caption identifies the diagram as a representative skeletal-muscle fiber schematic. The sarcomere preserves actin filament length as its Z discs move closer, and bounded arrowheads keep the filaments visible.
- **Portable explanations and practice.** The study sheet, copied/downloaded text, and JSON record include scenario explanations, transfer comparisons, and the temperature-feedback explanation. Recall counts appear separately from confidence. The sheet can return to the relevant activity, including imported writing before a new prediction is made.
- **Phone and accessibility refinements.** The native activity chooser includes Guided scenarios. The guided lesson takes precedence over the separate structure summary and introductory tips. Focus moves to the newly opened question and then the result. A measured pathway-label contrast failure was corrected. New fields support dark themes, Arabic right-to-left layout, visible focus, 44-pixel controls, and 16-pixel textarea text.
- **Localization.** All 70 new strings were added to French, Latin American Spanish, and Arabic in both distributions.

## Scientific checks

The revised muscle copy distinguishes tension from shortening. The added transfer question covers an isometric hold, while the illustration shows a shortening phase. These distinctions are supported by [OpenStax on muscle tension](https://openstax.org/books/anatomy-and-physiology-2e/pages/10-4-nervous-system-control-of-muscle-tension) and [sliding-filament contraction](https://openstax.org/books/anatomy-and-physiology-2e/pages/10-3-muscle-fiber-contraction-and-relaxation).

The meal question specifies chylomicrons carrying absorbed long-chain dietary fats into lymph, distinguishing that route from the blood-capillary route used by sugars and amino acids. See [OpenStax on digestion and absorption](https://openstax.org/books/anatomy-and-physiology-2e/pages/23-7-chemical-digestion-and-absorption-a-closer-look).

The wound question distinguishes surface closure from continued collagen remodeling, supported by [OpenStax on wound-healing phases](https://openstax.org/books/medical-surgical-nursing/pages/28-1-cellular-response-and-adaptation-in-wound-healing). The kidney question distinguishes filtration volume from barrier selectivity; see [OpenStax on kidney microanatomy](https://openstax.org/books/anatomy-and-physiology-2e/pages/25-4-microscopic-anatomy-of-the-kidney).

These references support the changed concepts. The diagrams remain teaching schematics; this pass does not establish clinical validity for every existing claim in the tool.

## Import behavior and limits

The existing version-1 format accepts optional recall counts and learning notes, so earlier exports remain readable. Imported data is validated against known IDs, field types, and size/count bounds. Current notes and explanations are retained when incoming writing conflicts. Active quiz answers, scenario choices, clinical display settings, and grade profiles are excluded from exports.

Practice records contain cumulative totals, not individually identifiable attempts. Imports therefore retain the larger complete record, keeping the local record when totals tie. They do not add snapshots together. This makes repeated imports stable but cannot combine independent practice histories from two devices without possible overlap. New scored answers consolidate legacy alias counts once.

## Verification

- Full anatomy run: **634/634 passed** across 38 files.
- After the final visual and focus changes: **227/227 passed** in 4 affected files, including four new filament-geometry checks.
- Combining each file’s latest result: **638 passing checks across 38 files**. An intermediate focused run had two setup-hook failures under concurrent load; the final targeted run uses a longer setup allowance.
- Browser checks completed all four scenarios, keyboard prediction controls, wrong/correct transfer feedback, writing persistence, JSON download/import, stable repeated import, and activity return. Layouts were checked at 1280, 390, and 320 pixels, with no horizontal overflow in the sampled states.
- French, Spanish, Arabic, and Arabic dark-theme reflections were inspected. The final 320-pixel check verified that the revealed result lies within the viewport and receives focus.
- The sampled final axe scan reported **0 violations**. It left 3 aria-prohibited-attr checks and 85 color-contrast checks for manual review; this is not an accessibility-conformance claim. No browser JavaScript errors were recorded.
- Source and desktop mirror match byte for byte; syntax and 6 language catalogs passed validation.

Source SHA-256: `eb3a1c4cdf22e73e2a706e61cb05d49ce579a4fa81eb3c55778f8f3a386fdcb3`.

## Evidence

- [Validation summary](validation-summary.json)
- [Browser flow results](browser-results.json) and [final geometry/focus results](final-browser-results.json)
- [Corrected sarcomere](quadriceps-final-step-3.png)
- [Phone prediction after focus](phone-focused-prediction.png) and [revealed result](phone-focused-result.png)
- [Arabic dark-theme reflection](phone-arabic-dark-reflection.png)
- [Study reflections](desktop-study-reflections.png)
