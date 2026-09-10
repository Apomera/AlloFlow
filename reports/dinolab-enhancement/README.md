# Dino Lab enhancement

Dino Lab now connects its 362-species field guide, saved specimen collection, 3D station, and a student evidence notebook.

## What changed

- **Field guide:** richer specimen cards, cached multiword search across names, traits, formations, groups, and places; every represented diet and geological period is available. Pages contain at most 24 cards. Search and filter changes reset paging, empty results offer recovery, and Surprise me respects the current filters.
- **Collection:** save specimens, revisit saved animals, or browse unexplored species. Removing a bookmark preserves written notes.
- **Species files:** keyboard focus moves to the opened file, a return control leads back to results, and the file appears above results on narrow screens. Direct actions connect to 3D inspection and writing.
- **Field notebook:** separate question, evidence, explanation, and uncertainty prompts for each species. Notes stay in the existing activity state, survive tab and specimen changes, and export together in a readable text file with catalog evidence and uncertainty clearly separated from student writing. Each field is limited to 2,000 characters; malformed restored records are normalized.
- **Compare:** exact positive small masses, missing-speed labels, linear or logarithmic mass scales, example pairs, swap controls, and a shared geological timeline. Overlapping date ranges and modern fossil regions are explicitly distinguished from evidence that two animals met.
- **Entry screen:** a shorter introduction and expandable investigation routes. The quiz statistic now uses the actual number of answers.
- **3D integration:** changing species from a specimen file clears incompatible scan/assembly evidence. The field tools include a direct notebook action. Existing reconstruction, scan, assembly, and claim activities remain available.

The reversed deep-time sentence was corrected: T. rex lived closer in time to people than to Stegosaurus. This relationship is described by the [American Museum of Natural History](https://www.amnh.org/explore/ology/paleontology/apex).

## Verification

- Focused regression suite: 108 tests across four files, including all 18 existing section renderers and the established 3D interaction/accessibility checks.
- Browser checks cover the guide → notes → comparison → notes workflow, actual text downloads, state preservation, focus, mobile overflow at 320px and 390px, and automated WCAG A/AA checks in three views under the production light, dark, and high-contrast theme tokens.
- A separate browser workflow exercises live WebGL, resets evidence when changing species, and opens the correct species notebook from the field-tools drawer.
- Golden snapshots were deliberately updated for the new views and shared styles; the species dataset was not changed.
- Canonical, desktop public, and existing app-build Dino Lab copies are synchronized. Syntax and scoped whitespace checks pass.

Automated checks do not replace manual assistive-technology testing. New interface strings use the existing translation fallback mechanism; additional translated copy has not been authored in this pass. No deployment or installer build was performed.

## Visual review

- [Field guide](desktop-guide.png)
- [Comparison](desktop-compare.png)
- [Notebook](desktop-notebook.png)
- [3D station](field-station.png)
- [Mobile species file](mobile-explore.png)
- [Mobile notebook](mobile-notes.png)
- [Mobile comparison](mobile-compare.png)
- [Example notebook download](example-notebook.txt)
- [Accessibility results](accessibility.json)

## Reproduce

~~~powershell
node node_modules/vitest/vitest.mjs run tests/dino_lab_golden.test.js tests/dinolab_field_guide.test.js tests/dinolab_3d_accessibility.test.js tests/stem_dinolab_evolab_quiz.test.js --maxWorkers=1
node node_modules/@playwright/test/cli.js test tests/e2e/dinolab-field-guide.spec.ts --workers=1 --retries=0
~~~
