# Aquaculture saved-investigation enhancement · 2026-10-02

User request: continue enhancement and do not commit. Local work remains unstaged and uncommitted. No push, deployment or full host build. Prior aquaculture changes and unrelated shared work are preserved.

## Changes

- Name saved investigations with an 80-character limit. Names persist through reload and compatible version-1 backups, and appear in the ecosystem log and Home notebook.
- Review frozen annual A/B results and the union of original species outcomes. Distinguish a species absent from a complete saved design, an unrecorded historical result, a recorded zero, and fixed support without crop outcomes.
- Preserve snapshot measurement presence and original status. Missing readings, readiness and status are explicitly unrecorded rather than invented zero or Watch values.
- Track whether complete original scenario settings exist. Partial historical settings do not become default water or inferred stock absence; incomplete B designs cannot replay or become a new A. A complete B can replay without inventing an incomplete A.
- Download an individual self-contained, escaped HTML report with original date/model, settings, results, species, prediction and explanation. Snapshots remain distinct from annual comparisons. Home portfolio uses the same archive results and responsive print layout.
- Use saved B/design as A for a fresh current-model comparison. Park the complete active design, baseline, guided question, prediction, observation and CER; Return to my draft restores them. Further replay/branch actions are guarded while a draft is parked.
- Unsaved CER, a changed prediction or a changed guided question cannot inherit the Evidence saved stage.
- Valid definition-list markup, contextual input labels, heading hierarchy, wrapping, keyboard controls and explicit system colors support accessible archive review.

## Model context

The classroom physiology model and version remain 2026.10-stock-feedback. This pass improves evidence handling and investigation continuity. Archive summaries come from saved results, without replaying the model to reconstruct missing history. Differences use available recorded A/B values with their units; stock/environment changes carry a composition caution.

## Verification

115 distinct focused tests passed across completed runs: 93 existing cases in the ten aquaculture suites plus 22 new archive cases. Final archive/investigation coverage combines 25 passed cases from the 27-case run with two unchanged name-input cases passed in isolation. archive-verification.json records all 27 as passed and retains raw run/recovery reports.

Earlier interruptions included one setup timeout, two memory failures, and a naming timeout whose unfinished update affected its successor. Fresh isolated checks passed without changing time limits. A transient full disk interrupted a write; canonical/public files were recovered with temporary-file replacement, syntax checked, and verified byte-exact. No unrelated processes or files were removed.

Final Chromium workflows passed at1280,390 and320px, plus independent320px partial-settings/Home and new-CER scenarios: five workflows total. They cover keyboard renaming/spaces, name-only persistence, frozen A/B outcomes, missing/zero/support distinctions, report downloads, inert HTML, heading hierarchy, long-title reflow, draft branching/restoration, disabled repeated replay/branch, original-model disclosure, dirty-CER stage and reload. Standalone/portfolio reports, print media and forced colors were checked. All recorded scoped WCAG2 A/AA and2.1 AA axe audits have zero violations, with no runtime errors or horizontal overflow. Both root and a separate reviewer inspected actual desktop/phone captures.

Browser review exposed and fixed an existing definition-list difference paragraph and made system-color styling explicit. The harness opens native explanation disclosures before typing into them; it does not force hidden form input.

Syntax, LF preservation, exact canonical/public parity and scoped Git whitespace checks pass. Runtime SHA256: e11c6fe623db9164302da3a2bccc6a36668382852d586cf2c4c3c418ee039bf7.

## Reproduce

With the checkout's existing dependencies and cached sweep CSS:

    node reports/aquaculture-saved-investigations-2026-10-02/saved-browser-qa.cjs
    node --max-old-space-size=512 --max-semi-space-size=4 node_modules/vitest/vitest.mjs run tests/aquaculture_saved_investigations.test.js tests/aquaculture_investigation_runtime.test.js --maxWorkers=1 --testTimeout=30000

The browser harness serves localhost only, renders the actual registered tool through the repository fixture, and writes browser-run artifacts. It uses installed Playwright, axe and React. Run test/browser jobs serially on this shared machine. This verification is scoped to AquacultureLab rather than a full application build.

## Artifacts

- sample-investigation.html: clean actual current-model oxygen comparison.
- sample saved-record and report captures at desktop/phone widths.
- archive-verification.json, raw archive-run/recovery JSON and browser-results.json.
- QA captures for partial history, support-only comparisons, escaped hostile text, long titles, portfolio, print and forced colors.
- Portable saved-browser-qa.cjs.
