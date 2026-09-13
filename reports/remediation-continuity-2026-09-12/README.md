# Remediation continuity review — 12 September 2026

UI follow-up: the first workspace revamp is now implemented. See [implementation and visual verification](../remediation-workspace-2026-09-12/README.md).

The confirmed premature-stop paths are fixed in source and regenerated browser/desktop modules. The review covered the single-file audit and remediation handoff, one-click continuation, direct Resume/Fix Remaining, Auto/Review/Expert presentation modes, batch ownership/checkpoint handling, focused remediation mode, and modal dismissal/navigation. Synthetic tests exercise failures and state transitions; this is not a claim that every live provider or real document has been tested.

## Fixed findings

| Gap | Consequence | Change |
| --- | --- | --- |
| The pipeline read the last-rendered host's page-global state bag. | Another mounted host could supply the wrong document, setters, or epoch; a run could publish elsewhere or be rejected as stale. | Each host now provides a live state reader and authoritative epoch reader to its own pipeline. Rate-limit waiting budgets and OCR language also read that host. Existing injected-state and legacy callers remain supported. |
| One-click continuation considered the target score, axe findings, and incomplete AI flag, but omitted other outstanding evidence. | A high score could bypass remaining Equal Access/AI issues or incomplete verification. | The continuation gate includes these findings and canonical completion. Retry and plateau bounds remain. |
| The wrapper inferred whether continuation ran from its retry counter, incremented only after early-exit checks. | A first cycle reaching target or plateau skipped the final full-document audit. | Track whether a cycle actually ran independently of retries; rejected duplicate starts do not count. |
| Direct continuation always stopped after an audit-only refresh. | Recovering a previously unavailable audit could reveal issues but leave the user to restart manually. | Continue fixing newly revealed issues within the existing round budget. Clean or unavailable-only refreshes remain single-shot. |
| Modal dismissal omitted auxiliary jobs and some navigation controls used narrower busy checks. | Escape, Cancel, Text Extract, project loading, or Start New Audit could interrupt current work, including final verification. | Share the active-work guard, include auxiliary jobs, consult synchronous operation owners, and prevent Escape from bubbling into host navigation. |
| Results appeared idle between one-click phases; independent validation could start after Stop. | A transient “ready” message contradicted ongoing work, or Stop still launched a later phase. | Include the entire one-click operation in the results busy state and honor Stop before automatic PDF validation. Completed work still saves. |

The host changes were applied narrowly to all three checked-in host sources. Generated pipeline, handler, and view modules were rebuilt and mirrored to desktop public assets. Unrelated concurrent edits were preserved.

## UI revamp feasibility

A revamp is feasible without replacing the remediation engine. The existing progress events, verification policy, review helpers, project checkpoints, and export handlers provide most of the underlying data and actions. The largest constraint is lifecycle coupling: the large audit view owns some long-running operations and cancels them when it unmounts. Moving the UI must preserve ownership before moving its layout.

Recommended order:

1. **Clarify the current screen.** Give each state one primary action. Rename the post-fix mode selector to “After remediation” with “Show results”, “Review changes”, and “Open editor”. Distinguish this choice from source type and batch processing. Put technical configuration and diagnostics under Advanced.
2. **Create a persistent document workspace.** Keep the filename and current stage visible: Select → Audit → Remediate → Verify → Review & Download. Represent “Waiting for AI”, “Paused”, and “Needs review” explicitly. A phase reaching 100% must not imply the entire job or verification is complete.
3. **Make results actionable.** Lead with what is ready, what needs attention, and the next action. Use a single issue list with affected content, checker evidence, fix/review controls, and a link to the preview. Show scores as supporting evidence, alongside verification coverage and preservation concerns. Reuse the existing policy; do not invent another success calculation in the UI.
4. **Simplify batch work.** Use one row per file with distinct queued, running, paused, failed, and processed states plus a separate verification status. Put retry/resume actions at the affected row and clearly identify which downloads include completed files.
5. **Reduce nested dialogs.** Use a side panel or split preview for tools and review, reserving modal dialogs for brief decisions. Keep action buttons reachable on narrow screens and at zoom. Preserve focus and keyboard behavior using the [WAI dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/); announce progress without moving focus using [WAI status-message guidance](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html).

| Work package | Relative scope | Dependency |
| --- | --- | --- |
| Labels, grouping, consistent stage/status summary | Small | Existing view state and translation keys |
| Workspace shell, issue list, batch rows, consolidated downloads | Medium | Extract components from the large view; retain canonical evidence and handlers |
| Close/minimize while work continues, remount recovery | Larger | Move view-owned jobs into a persistent controller and replace remaining page-global run/abort slots with explicit ownership |

The code now keeps the running/finalizing state consistent; a wholesale visual redesign was not applied in this repair. A staged component extraction is easier to verify than replacing the full screen at once.

## Validation

- Targeted regression run: 406 tests passed, including audit stalls, ownership/re-entry, continuation, upload lifecycle, batch checkpoint boundaries, and build parity.
- Added behavioral regression coverage for high-score residual findings, first-cycle final auditing, plateau/duplicate/Stop behavior, recovered audits, and host state isolation.
- Added a Chromium test that renders the generated modal through Auto, Review, Expert, batch, and focused busy states and checks that Escape does not close the modal or escape to host navigation.
- Added the new suites to the maintained remediation validation manifest.
- Pipeline reference-integrity and host JSX build-smoke checks passed.
- Maintained validation: 409 unit tests and 207 Chromium tests passed (616 total), with no skips or retries. Evidence: `validation/summary.json`, `validation/unit.json`, and `validation/browser.json`.
- Supplemental final host-settings/continuity/OCR/build checks: 30 tests passed in `host-settings-tests.json`.
- Generated pipeline, handler, and view modules match their desktop public mirrors byte for byte.

Remaining validation boundary: real-model output quality, real documents under provider throttling, and manual screen-reader acceptance still require live acceptance testing. Separate simultaneous remediation jobs in multiple host instances still share legacy generation/abort globals; the new host readers prevent a foreign render from replacing state, not a full multi-job scheduler.
