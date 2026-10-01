# Dinosaur Lab improvements — 27 September 2026

Implemented the first set of changes from the [deep-dive review](../dinolab-deep-dive-2026-09-27/REVIEW.md). The main lab and desktop public copy are synchronized. These are local workspace changes.

## What learners now experience

The opening screen asks **“Could T. rex have hunted Stegosaurus?”** instead of leading with a large progress dashboard. A compact introduction, recognizable schematic silhouettes, and a clear start button fit on the first phone screen. Navigation occupies one horizontally scrollable row; all 18 sections and their keyboard controls remain available.

The investigation has five stages:

1. **Predict:** choose yes, no, or not sure before seeing the dates. The initial answer remains visible during later reflection.
2. **Inspect:** compare catalog age ranges on one shared, labeled time axis. Incorrect size or diet choices receive specific feedback explaining why they cannot establish contemporaneity.
3. **Explain:** write a conclusion supported by dates. A sentence starter provides optional support; whitespace alone cannot advance the activity. Written responses are recorded, not automatically graded.
4. **Transfer:** consider T. rex and Triceratops. Distinguish overlap in time from evidence that hunting occurred.
5. **Record and revise:** review the learner's explanation, return to revise it, or open the notebook.

Responses persist in activity state across section changes and are included in notebook downloads. Existing specimen notes remain separate and are preserved. Restored investigation state is normalized, response text is bounded, and learner text is rendered as text rather than HTML.

## Scientific and pedagogical corrections

| Area | Change |
|---|---|
| Bird Link | Replaced word matching with six explicit fossil case studies, each showing evidence, uncertainty, and its research source. Feather attachment marks are distinguished from preserved feathers. The selection is explicitly non-exhaustive. |
| Archaeopteryx | Reframed its combination of traits within the dinosaur family tree and linked a [Natural History Museum fossil reference](https://www.nhm.ac.uk/discover/dino-directory/archaeopteryx.html). |
| Ecosystems | Removed placeholder formations such as “Various.” Explained that shared formations and overlapping catalog age ranges do not establish a shared habitat. |
| Energy pyramid | Labeled widths as conceptual. Removed the unsupported inference from catalog species counts to energy flow and the automatic “apex predator” assignment based on body length. Explained omnivory and decomposers. |
| 3D progress | Replaced “Claim strength,” “CER ready,” and “Reasoning backed” with evidence-route and scan-preparation language. The generated explanation is labeled as a worked example. |
| Size claims | Replaced the universal “large animal” claim with an estimated length statement. |
| Fullscreen | Gave the focused stage an explicit theme background and text color so native fullscreen does not place light-theme text on a black surface. |

New interface labels were added to both default string catalogs. Other language translations were not authored in this pass.

## Validation

- **198 distinct unit tests across 14 files passed**, covering the new investigation, existing field guide and notebook, science checks, 3D accessibility, localization contracts, and section render invariants.
- Reviewed and updated the 18 section snapshots for intentional navigation and content changes.
- **Two Chromium browser scenarios passed with retries disabled:** complete investigation/export/responsive/accessibility flow, and live 3D native fullscreen in three themes. The learning scenario was rerun after the final Bird Link wording change.
- Automated accessibility scans found **zero violations** in Explore, Field Notes, Bird Link, and Ecosystems across light, dark, and high-contrast themes, using WCAG A/AA tags through 2.2.
- Checked phone layouts at 390 px and 320 px for horizontal page overflow. The new investigation moves keyboard focus to its heading when changing stages.
- Verified a live WebGL context, opaque fullscreen surfaces, and no browser runtime errors in the tested flows.
- JavaScript syntax, patch whitespace, source mirror parity, and Dinosaur Lab string parity checked.

The first unit run exceeded the default five-second timeout under system load; rerunning with a 60-second allowance passed. Existing React test-harness warnings remain. These checks use the local tool harness and real application theme styles; they do not measure classroom learning gains or verify deployment.

Evidence files: `focused-tests.json`, `science-tests.json`, `final-render-tests.json`, `browser-tests.json`, `learning-browser-final.json`, `accessibility.json`, `fullscreen-surfaces.json`, and `example-notebook.txt`.

## Visual review

![Updated phone opening](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dinolab-improvements-2026-09-27/opening-phone.png)

![Explanation and evidence](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dinolab-improvements-2026-09-27/explanation-desktop.png)

## Next meaningful improvements

The next priorities from the review are a smaller evidence-based candidate set in Dig Site, learner-authored reasoning in the anatomy workflow, and grouped navigation for easier discovery. Classroom testing should examine whether learners independently distinguish “ruled out,” “possible,” and “supported by evidence,” including on a delayed transfer question. The present design supports those distinctions; its learning and engagement effects still need observation with learners.
