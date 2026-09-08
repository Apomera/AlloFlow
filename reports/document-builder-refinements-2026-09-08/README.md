# Document Builder refinements — September 8, 2026

Implemented locally following the [Builder audit](../document-builder-analysis-2026-09-08/README.md). The changed browser modules have been rebuilt and synchronized with the desktop public copies. Nothing was deployed or committed.

## Changes users will see

- **Usable phone layout.** A Document settings / Back to document switch exposes the settings on narrow screens while keeping the edited document mounted. At the tested 390 × 844 viewport, the visible document area increased from approximately 2 px to 320 px. Settings scroll independently, and Escape restores focus to the switch.
- **Clear document context.** The editor shows the actual current title, source, selected resource count, and truthful save status. Resource selection appears first in settings, with the selected names available to inspect. Select-all includes Memory Aid and Applied Challenge. Remediation documents show relevant settings and export guidance.
- **Less initial clutter.** AI block suggestions, Word Art, and appearance settings are grouped or collapsed. The ribbon defaults to a compact state on narrow screens.
- **Reliable keyboard access.** Tab reaches eligible iframe controls and inspector badges, skips unavailable controls, and traverses native controls inside tables without creating rows. Escape dismisses Quick Access customization before closing the Builder.
- **Protected draft recovery.** New local draft identities bind to source, content, resource selection, and mode. Remediation drafts bind to the original document digest. Capture checks the active document owner, flushes or cancels pending work on close, preserves project metadata, and reports failed saves accurately. Restoring a saved block rejects stale or ambiguous targets.
- **Exports use the edited document.** PowerPoint receives an immutable snapshot of the current Builder HTML and title through the shared Office exporter. A failed export keeps the Builder open. Markdown and NotebookLM preserve image destinations and equation structure; BRF applies accepted-change cleanup consistently; ePub image downloads have bounded body-read time and size.

## Runtime fixes

The targeted Office build exposed a packaging defect: compiling the UMD remediation helper with the JSX entry could put an ESM export inside the browser IIFE. The build now includes the raw UMD helper separately and validates the finished output as a classic browser script before writing it. The Builder build also uses atomic output replacement for reliable writes in the synchronized workspace.

Canonical and desktop copies match for all four changed runtime modules. The three host source copies also match. The MCP runner staging script does not include these changed Builder/Office modules, so its generated context was not changed.

## Validation

| Check | Result | Evidence |
| --- | --- | --- |
| Combined regression tests | 291 passed across 24 files | [Integration results](integration-tests.json) |
| Built Office bundle validation | 2 passed in 1 file | [Bundle results](office-bundle-tests.json) |
| Browser tests against the rebuilt Builder | 11 passed; none skipped or flaky | [Browser results](browser-tests.json) |
| Real PowerPoint download and OOXML inspection | All 11 artifact assertions passed | [Artifact report](artifact-check/README.md), [results](artifact-check/run-01/results.json) |
| Current source in built modules, mirror parity, lexical scope | Passed; no unexpected globals | [Runtime verification](runtime-verification.json) |
| Targeted whitespace validation | Passed | `git diff --check` on changed sources and tests |

The browser checks cover four viewport sizes, settings visibility and edit preservation, focus mode, keyboard traversal, Escape behavior, live title/save context, and remediation settings. The [screenshots and geometry evidence](browser-artifacts/) record the rebuilt UI.

The [downloaded education PowerPoint](artifact-check/run-01/live-edited-education.pptx) contains three slides with the edited heading/value, a native table, and the exact original diagram bytes with its description. Old preview/History content and editor controls are absent. The controlled artifact probe used the actual built coordinator, export handler, Office module, and locally bundled PptxGenJS without network requests.

## Compatibility and remaining limitations

- Legacy unbound local drafts remain stored, but are no longer automatically offered for recovery. Existing project draft formats remain supported.
- If the original remediation digest or SHA-256 capability is unavailable, bound local recovery is disabled; session and project capture remain available. The UI distinguishes local persistence from session capture.
- The saved comparison is explicitly a text comparison and discloses its 400-block coverage limit.
- PowerPoint equations currently become editable slide text, not native mathematical objects. The artifact probe verifies downloaded content and structure; destination-application layout and human assistive-technology acceptance still need manual validation.
- The work used targeted regression tests, an isolated browser fixture, and a controlled education export. A full application build, production-provider run, and broad mixed-education corpus evaluation were not performed in this pass.

## Detailed evidence

- [Draft protection implementation](../document-builder-analysis-2026-09-08/core/implementation.md)
- [Export fidelity validation](../document-builder-improvements-2026-09-08/export/validation.md)
- [Responsive layout and keyboard implementation](../document-builder-improvements-2026-09-08/layout-keyboard/implementation.md)
- Reproduction scripts: [integration runner](run-integration.cjs), [runtime verifier](verify-runtime.cjs), and the scripts in [artifact-check](artifact-check/).

The earlier audit remains a historical record of the pre-implementation findings. In particular, its simple Guided-selection collision example was too broad: the real host already supplied filtered History. The stronger content/selection binding is still implemented, and the remediation identity weakness was confirmed.
