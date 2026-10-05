# Maine SLD Case Lab — usability refinement

Complete locally October 2, 2026. [Open the updated activity](http://127.0.0.1:65059/app/?tool=maine-sld-practice). This report supersedes the earlier interface candidate; its historical audit and validation remain in `reports/maine-sld-case-lab-2026-10-01`.

## Improvements

- Compact header keeps Leadership Hub and Close visible. Worksheet tools expand in place, wrap on narrow phones and remain scrollable on short screens. Escape cancels confirmation first, then closes tools, then closes the activity.
- Short score guidance keeps the scale/age-comparison/eligibility caution visible. Native expandable details retain the full original scale, composite, grade-comparison, test-date and confidence-information guidance.
- Optional Selected score findings filter and direct evidence-board control make revisiting findings easier. Show all scores resets all filters. Restoring a worksheet also clears temporary filters. Removing a selected row or evidence card retains keyboard focus.
- A neutral Your reasoning so far panel shows the participant's Q8/Q9 responses, written reasoning and evidence requests before the reviewed debrief. Edit controls return directly to the relevant form field. Missing responses remain descriptive; no readiness or eligibility score is produced, and reveal remains available.
- The English activity declares its language for assistive technology. Native summaries participate in the dialog focus loop.

## Verification

The final stable candidate passed **16/16 Chromium scenarios**, one worker and zero automatic retries. **34 scoped axe scans reported zero violations**: 30 step/theme scans plus four constrained-layout checks. Coverage includes 320 px portrait, 390 px phone, laptop and short landscape; all tools remain reachable with a nonzero scrolling content area. Screenshots, local measurements, actual source-host routes, educator-gated return and the native Leadership card roundtrip are retained.

Tests also verify selected-score removal focus, independent case notes, combined filters, worksheet restore resetting all filters to the full52 record, literal markup in participant review, edit-field focus, and participant-only print. Both final print pages were rendered and visually reviewed. Root and an independent reviewer accepted the interface captures. The phone score table continues below the initial viewport through its intended content scroll; no claim of a fully visible52-row record is made.

[TESTING.md](browser-validation/TESTING.md) records exact commands. [Validation summary](browser-validation/validation-summary.json) and raw results retain the stable run separately from preliminary and superseded attempts; earlier attempts are excluded from final coverage. Artifacts were captured outside OneDrive and copied after completion to avoid the previous pass's browser-closing I/O stalls. No timeout or assertion limit was weakened.

## Preservation and integration

The reviewed case JSON and worksheet core are byte-for-byte unchanged. All52 simulated score values, three cases, Q1-Q9 guidance, multilingual considerations, debrief explanations, sources, version and import/export schema remain intact. Original content review remains applicable. [Static verification](final-static-verification.json) records baseline/current hashes.

Final module SHA-256: `2a2e0dd185b387eda6325be662a98a9969155511bbe8c9a3a1bfb44fe5b2b607`; size124410 bytes. Four activity copies match and all three loader pins use `2a2e0dd1`. [Integration report](integration/README.md) records immediate before copies, preservation guards, exact tested App.jsx provenance, post-test parity and HTTP verification. Only the Maine loader pin changed in shared host sources; other shared work was preserved.

The public short path and case-specific deep links remain configured for the next deployment. No staging, commit, push, production deployment, full application build or installer rebuild was performed. Preview65059 remains available; the earlier preview helper/report were preserved.
