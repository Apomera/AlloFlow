# Dissection discovery and navigation follow-up

Date: 2026-09-08

## Improvements

- Added All structures, To inspect, Needs notes, and Recorded filters with query-aware counts. Recorded explicitly means an inspected structure has a note and confidence rating; it does not imply verified mastery.
- Search now accepts multiple words in any order, ignores punctuation and case, and tolerates diacritics.
- Added reference matches from other layers of the current specimen. Locked results name the preceding layer that must be completed. Available results open the layer and focus search without selecting the structure, revealing anatomy, or awarding observation credit.
- Kept reference discovery separate from assessment mode.
- Added clear-search/filter controls and Escape recovery. Filter changes retain keyboard focus; clearing returns focus to search.
- Resetting or switching specimens clears transient filters; changing layers resets the progress filter.
- Added visible shortcuts to the specimen, structure directory, and current activity. Assessment mode substitutes a link to its question or summary.
- Improved muted structure-label contrast and clinical-reference text contrast.
- Preserved local notes, confidence, specimen-owned progress, procedure gates, and source/desktop parity.

## Verification

Across the focused runs, **309 unit tests passed**. One existing assertion remains failing because the separate shared module at desktop/web-app/public/stem_lab_module.js differs from its canonical and nested public copies. This pass did not edit those shared files.

- Reference/discovery suite: 40 passed, including nine additional discovery tests.
- Broader four-suite run: 267 passed and three failed.
- Isolated canvas rerun: all three passed, resolving the two canvas failures from the overloaded run.
- The remaining failure is the shared-module byte-parity assertion.
- Four browser scenarios completed: three passed directly, while the existing comparison workflow passed on retry after its browser-context teardown timed out.
- The phone-directory scenario was then rerun without retries after the contrast improvement: passed.
- The full mobile directory and workspace shortcuts passed scoped axe checks for WCAG 2 A/AA and 2.1 AA, including color contrast.
- JavaScript syntax and scoped diff whitespace checks passed; the dissection source and desktop copy are byte-identical.
- Mobile directory screenshot visually reviewed; overflow, keyboard focus, note preservation, and locked-layer behavior were checked in Chromium.

The environment initially failed to start Vitest fork workers. Running one thread allowed verification to complete. The first broad run also encountered a canvas timeout; the isolated rerun resolved it.

## Artifacts

- [Mobile directory](discovery-mobile.png)
- [Locked-layer search](discovery-locked.png)
- [Mobile workspace shortcuts](workspace-shortcuts-mobile.png)
- [Reference/discovery tests](discovery-unit.log)
- [Broader regression results](discovery-regression.log)
- [Canvas rerun](discovery-canvas.log)
- [Browser scenarios](discovery-browser.log)
- [Final mobile accessibility check](discovery-accessibility.log)

