# Moon Mission pass 34 — re-entry recorder

Completed October 9, 2026. Changes remain uncommitted.

## What changed

The aerodynamic-load and convective-heat-flux charts now show readable value scales, current measurements and circular sample markers. HTML labels remain at least 12px, each plot is 148px high, and selected markers stay 10px across on phones and desktop screens. A dashed 10 g line is explicitly labeled as the model's teaching threshold.

Clicking or tapping a plot seeks to that physical time through the existing playback action. Each chart also has an **Inspect peak** button. Markers and readings follow the same physical sample as the capsule and instruments during playback, pause and scrubbing. The existing keyboard slider remains available.

Chart simplification now retains each bucket's minimum and maximum in timestamp order, plus the first and last samples, with at most 322 plotted points. This preserves brief recorded heating and parachute-load peaks that the previous fixed-stride display could omit. It changes the displayed series only; integration, sampling, entry plans and receipts retain their existing implementation.

## Verification

Three final Chromium workflows passed through the direct Playwright API with real assertions and complete cleanup. These are recorded workflow results, not Playwright CLI worker results.

| Workflow | Evidence | Coverage |
| --- | --- | --- |
| Entry recorder | [Result](direct-recorder-2/direct-recorder-result.json) | New chart geometry, physical values, peak inspection, direct seeking and playback |
| Existing phone entry | [Result](direct-phone-1/direct-phone-result.json) | 320px bank flight, keyboard controls, layout and accessibility |
| Existing receipt review | [Result](direct-review-1/direct-review-result.json) | Completed entry, scrub, reload, flown-plan report, archive and once-only rewards |

All 30 focused physics and saved-state unit tests passed across three files: [unit log](unit.log). Both scoped axe scans reported zero violations: [accessibility results](direct-phone-1/guidance-phone-axe.json). 9 PNGs are retained across the accepted browser runs. Detailed attachments and hashes are in [results.json](results.json).

The new workflow checks real touch and mouse events against their delivered screen coordinates, exact peak times, native keyboard navigation and live playback. It also checks steep, skip-out and earlier v1 profiles. A synthetic click at the right boundary tests terminal clamping and confirms that repeated endpoint inspection creates only one result and reward. All plotted points are checked against the original profile samples, including peak preservation and units.

### Visual examples

- [Phone peak-load inspection](direct-recorder-2/phone-peak-load.png)
- [Desktop peak-heating inspection](direct-recorder-2/desktop-peak-heat.png)
- [Desktop after live playback](direct-recorder-2/desktop-paused-after-playback.png)

The first recorder run also passed. The final run adds terminal-boundary coverage and finer progress diagnostics; it uses the same production source. Only the final run contributes to the totals above.

## Preservation

The canonical and public runtime copies are identical: SHA-256 `ffe2ac5862f814ccc4d3e5add421630ae1da9bb445b007346ce3aa3517690152`, 1,431,505 bytes. Four guarded changes reverse byte-for-byte to accepted pass 33. All 127 protected prior test files and the scoped Git index are unchanged. Both runtime syntax checks and scoped whitespace checks passed. See [verification](verification.json) and [runtime diff](runtime.diff).

New regression: `tests/e2e/moon-mission-entry-recorder.spec.ts`. Production changes are confined to the entry recorder display and its existing instrument updater. The numerical atmosphere, entry integration, lift guidance, thermal model, completion rules and reward logic are unchanged. These checks do not establish new physical fidelity or physical-device performance. No full build, broad-suite run, staging, commit, push or deployment was performed.
