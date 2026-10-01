# CircuitTool: consistent experiment navigation

The experiment map and **Keep investigating** actions now distinguish the student's saved stage:

| Saved stage | Action |
| --- | --- |
| Ready to start | Open experiment |
| Choosing a prediction | Resume prediction |
| Prediction saved | Continue to test |
| Test readings saved | Review result and explain |
| Explanation saved | Review saved experiment |

The existing map status text explains the saved stage. The action follows it directly, so students can see when to test and when to review their writing. The actions for testing and review now match the entry card.

Each button's accessible name includes its visible action and experiment title. Map selection keeps its existing question or saved-result focus target. **Continue to test** opens the experiment; the student then activates its Test button. **Keep investigating** still offers the first untested experiment. Once all three have been tested, its existing map-review action opens and focuses the map.

The label lookup reads the already-derived journey phase. It uses the existing translation keys for the entry's matching actions. The earlier entry and writing-space improvements remain in this uncommitted work.

## Verification

**146 tests passed across eight files.** The regression scope covers map navigation, continuation, entry actions, journey stages, writing space, explanation guidance, localization, and form labels. Each file runs in a fresh process with one worker and the existing test time limits. Raw results, assertions, commands, and unchanged-file hashes are retained.

The browser audit covers 12 views at desktop and phone widths, including 320px with 200% text and forced colors. All 12 screenshots were inspected. Labels wrap at word boundaries, controls stay within their cards, and all 48 numeric readings keep their magnitudes on one line.

- 24 visible keyboard-focus checks and 12 native Enter/Space navigation checks passed.
- Navigation preserved the live circuit, saved work, and existing 12-row writing view.
- Live editing with changed locale and actual JSON import/restore preserved the expected actions without replaying navigation.
- All 87 measured font sizes doubled exactly at a 320px viewport.
- Ten ordinary axe scans passed with every rule enabled. Two forced-color scans excluded only the documented axe 4.12.1 contrast issue. The 49 visible text nodes in those views were checked using their actual forced colors; the lowest contrast was 13.99:1. The diagnostic's original provenance and hashes are retained.
- Reduced-motion checks, duplicate-ID checks, source syntax, and scoped whitespace checks passed.

These are scoped checks of the changed controls, rather than a full application accessibility assessment.

## Previews

### Saved experiments on a phone

![Saved-stage actions in the experiment map](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-navigation-stages-2026-10-01/map-saved-stages-390.png)

### Enlarged text

![Keep investigating with text at 200%](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-navigation-stages-2026-10-01/continuation-test-200pct-text-320.png)

Source and desktop mirror match: `bf831e5d4ac6cb0021d82f28b94d9c664f2d1a794b3a66de7aad616c801607a6`.

## Reproduce

From the repository root:

```powershell
node reports/circuit-navigation-stages-2026-10-01/run-regression.cjs
node reports/circuit-navigation-stages-2026-10-01/browser-check.cjs
node reports/circuit-navigation-stages-2026-10-01/validate.cjs
```

The regression runner preserves raw results. Use a fresh report destination for a new run. Installed Vitest, Playwright, Chromium, React, Tailwind cache, and axe-core dependencies are required.

All three improvement rounds are left uncommitted at the user's request.
