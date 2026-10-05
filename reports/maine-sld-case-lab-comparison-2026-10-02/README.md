# Maine SLD Case Lab: comparison and revision

October 2, 2026. This pass helps participants compare their own reasoning across the five fictional cases and return to the form when the reviewed guide prompts reconsideration. Work remains uncommitted as requested.

## What changed

The optional comparison now works for all five cases. The current case remains the anchor; a labeled native select offers the other four cases. Each side shows that case's own Question 8 and Question 9 choices, reasoning and evidence requests. Empty entries remain explicitly unrecorded. The two Alex cases retain the existing explanation of their shared simulated scores and changed general education sufficiency premise. Other pairings use each case's own context and assessment limits.

Participants can edit either case's Q8, Q9 or evidence requests, then use **Return to case comparison** to restore the original pair, open the comparison and focus its summary. Ordinary case/step navigation, reset and restore clear this temporary return path. Comparison selection and disclosure state are view preferences and add no worksheet fields.

Each question card in the deliberately revealed guide now has **Revise your Qn reasoning**. It opens and focuses the existing form response field, preserving the participant's writing and the case's guide-reveal state. Narrative Questions 5 and 6 focus their textareas. No guide answer is copied into participant work.

The comparison remains collapsed by default. Edit buttons include the question and full case title in their accessible names, distinguishing the two cards in a screen reader's button list. Existing responsive columns stack on phones.

## Preservation and content review

All five case objects, all 52 Alex score rows, form/legal directions, multilingual considerations and source entries are preserved as byte-identical case data. Core, builder, worksheet schema/version and compatibility rules are also byte-identical to the accepted preceding snapshot. The existing print function and print pagination rules are retained.

This is a participant-workflow change; it introduces no new eligibility interpretation, assessment rule, case score, cutoff or automatic evidence grade. The comparison reads participant responses and requests; reviewed recommendations remain in the explicitly revealed guide. The preceding [extended-practice content/source review](../maine-sld-case-lab-extended-practice-2026-10-02/content-review/README.md) remains applicable to the unchanged data.

Independent source review accepted content neutrality, case isolation, return/focus behavior and the revealed-only revision controls. A case-specific accessible-label improvement identified in that review was applied before testing; the initial candidate is retained in `review-adjustment/`.

## Verification

**Seven targeted Chromium scenarios passed** in one stable run with one worker, zero automatic retries and the unchanged 120-second limit. Three new scenarios cover all 20 distinct ordered case pairings, separate participant answers/notes/requests, blank states, literal and long text, exact edit/return focus, reset/restore/reload and all nine guide revision controls. Four regressions cover the original Alex premise comparison, selected-evidence return, five-case worksheet export/reset/restore/print and actual source-app deep entry/access/Hub navigation.

**Five scoped axe scans found zero violations:** three new expanded comparison views at phone/desktop sizes and two retained evidence/Alex checks. Fourteen screenshots are retained. Independent review accepted five representative comparison/revision captures; root also accepted representative phone/desktop views. Every page of the final nine-page participant PDF was rendered at 90 dpi and visually accepted, with no clipping, overlap or orphan headings.

The full earlier 22 scenario assertions were preserved except for two deliberate contract updates: comparison now exists, closed by default, for the non-Alex cases. This targeted pass ran seven of the current 25 available scenarios. Exact commands, raw results, tested/baseline specs, hashes, screenshots and PDF evidence are retained in [browser validation](browser-validation/README.md).

Final module copies, current three host sources, exact preview snapshot and served HTTP bytes match their records after the test run. Source/module syntax and focused whitespace checks passed. [Final verification](final-verification.json) also confirms the unchanged print function and print CSS.

The focused run does not claim a repeat of the entire earlier test matrix. The preceding [22-browser/15-core/46-axe results](../maine-sld-case-lab-extended-practice-2026-10-02/browser-validation/TESTING.md) and [print follow-up](../maine-sld-case-lab-extended-practice-2026-10-02/browser-validation/print-followup/README.md) remain preserved with their own hashes and scope. The new source has unchanged core/data; no redundant core or full accessibility matrix run was required.

Automated accessibility results describe scoped checks, not a complete assistive-technology audit. Printed captures contain fictional test responses.

## Preview and release state

- [Activity](http://127.0.0.1:65062/app/?tool=maine-sld-practice)
- [Marisol](http://127.0.0.1:65062/app/?tool=maine-sld-practice&case=marisol)
- [Taylor](http://127.0.0.1:65062/app/?tool=maine-sld-practice&case=taylor)

Module SHA256: `ace588aeb71167631b24a7a2c07c0ad3dc02bbcc839322f995a2e8782b0f7aeb` (169,229 bytes); loader pin `ace588ae`. All four copies match. Exact current host/source snapshot SHA256: `999519429f7cc27477b3e811fb2dee3f4275053cb227a1d079a3d824ab101318`.

The isolated preview compiles an exact current App source snapshot without transformations. Only the three existing Maine loader pins change; unrelated host bytes are preserved. Prior reports and helpers remain available. Public release was not performed.

No staging, commit, push, deployment, full application build or installer build was performed. Shared uncommitted work is preserved.

## Evidence

- [Baseline](baseline.json) and original source files in `before/`
- [Frozen activity](frozen-activity.json)
- [Focused browser validation](browser-validation/README.md)
- [Validation summary](browser-validation/validation-summary.json)
- [Integration](integration/README.md)
- [Final verification](final-verification.json)
