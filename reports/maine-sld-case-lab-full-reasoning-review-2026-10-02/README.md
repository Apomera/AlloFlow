# Maine SLD Case Lab: participant reasoning review

This local refinement lets participants revisit their own earlier form reasoning from Debrief and return to the same review after editing. The preview remains at [the existing activity URL](http://127.0.0.1:65063/app/?tool=maine-sld-practice); refresh the open tab to load the final module. Changes are uncommitted by explicit user request.

## What changed

- An optional, initially collapsed **Review your earlier form reasoning (Q1–Q7)** section shows each question, the participant's recorded response and their original notes. Q8/Q9 and evidence requests remain prominent in **Your reasoning so far**.
- All ten review destinations (Q1–Q9 and evidence requests) support direct editing and **Return to your review**. Returning restores the original case, disclosure state and focus to the originating edit button. Nearby return buttons are available beside the relevant question or evidence-request field.
- An explicit selected-evidence consultation preserves the review return destination. Ordinary step/case navigation and confirmed reset/restore clear it; canceled confirmations retain it. These view preferences remain transient and are excluded from worksheet exports.
- Whitespace-only notes receive an honest empty-state message. Meaningful notes remain verbatim, including line breaks. Narrative-only Q5/Q6 use the same display treatment without changing the shared print helper.
- Direct question navigation centers the actual input before focusing it, keeping longer question cards usable on narrow screens. The review caption uses singular/plural wording for the participant's entry count.
- The small-screen form grid now bounds its column to the available width. This fixes the measured 398px form overflow within a 320px viewport and the sideways scroll triggered by Q5 focus. A direct check of the form panel's width and scroll position covers all edit/return destinations; earlier document-only overflow checks missed this crop.

## Preserved scope

Case data, eligibility logic, module builder, worksheet schema, synthetic scores, legal/multilingual guidance, print function, print CSS and the shared response-label helper are preserved. This pass adds no substantive case or legal guidance and makes no new independent legal-accuracy claim. The earlier accepted print PDF and all-page visual review remain the print evidence for the unchanged print code.

The three existing host loader pins reference the final module. Other host bytes are preserved, including shared app changes made after the initial preview. The isolated preview was built from the exact app source snapshot tested, without preview-only source transforms or a production/installer build. Subsequent shared app edits advanced beyond that passed snapshot; the final verification records their observed hashes and retained module pin without claiming those newer host bytes were tested. Previous reports, candidates, helpers and unrelated shared work remain preserved. The report path retains the October 2 start date; the final refinement was completed on October 3.

## Validation

Six distinct targeted scenarios passed for the final activity: five module scenarios in one final invocation, plus one app-entry scenario against the refreshed exact host snapshot in a separate invocation. The latest host scenario passed in 45.0 seconds with normal tracing. All runs retained one worker, zero automatic retries and the existing 120-second limit. The two new scenarios cover earlier-question review and keyboard navigation; the original 27 scenario definitions remain preserved, for 29 available. This pass did not re-run the full matrix.

The final checks cover participant-only review, literal and multiline notes, honest whitespace-only empty states, all ten edit/return destinations, case/disclosure/focus restoration, explicit evidence detours, ordinary navigation and reset/restore clearing, comparison/guide routes, worksheet schema, reload/restore and isolation. The keyboard scenario directly measures the form panel's internal width and horizontal scroll position after every edit/return and the selected-evidence detour. Four scoped axe scans reported zero violations. These scans support the checked states; they are not a claim of complete accessibility certification.

Root accepted seven final representative captures; the independent source/layout review accepted six. The corrected Q5 keyboard images visibly show focus outlines and unclipped controls at 320px. Exact-byte capture identity preserves previously inspected layouts. The earlier cropped image, measured 398px scroll width, temporary geometry proof and final 320px/zero-scroll evidence remain archived.

The accepted earlier nine-page participant print PDF remains identical by SHA256, with all nine page layouts previously accepted. The print function, print CSS and shared response-label helper are unchanged; no new print run was needed. Module syntax and scoped whitespace checks passed. Four module copies match the frozen source build; case data, core, builder and export schema are preserved.

Earlier attempts are retained separately: the first invocation timed out in harness stylesheet preparation before activity assertions; a second completed five older-candidate module scenarios but timed out while closing the host page after its recorded assertions; a third timed out waiting for the second Marisol panel and then during context teardown, leaving later assertions incomplete. The previously accepted navigation baseline is identified by its successful host-after-preview-restart result, not its earlier unsuccessful top-level result. These earlier failures are not represented as a clean original run.

The corrected final module passed five scenarios. A first normal-tracing host pass on source `12059b5a…` is retained separately from the final successful host pass on exact source `b5fb9c91…` and bundle `5b1af446…`. Later shared app edits advanced the host to observed `69b228c6…` while retaining the final Maine module pin. Those newer host bytes were preserved and were not re-tested in this bounded pass. The exact passed preview remains served at the existing URL; final verification records tested hashes and observed shared-host hashes separately. No staging, commit, push, deployment or full app/installer build was performed.


Module SHA256: `d69ff0908089f9d47dc0a572d676eadbbd846a8cfd5ea170637bd651720eb0f7` (177,749 bytes); loader pin `d69ff090`. All four copies match. Exact tested host/source snapshot SHA256: `b5fb9c913c1fa3884d2fe0190a10401179cb5e362a48856d01a47db7a53f7fe7`. Subsequent shared host edits are recorded separately in final verification.

See [final verification](final-verification.json), [browser evidence](browser-validation/README.md), [independent source and layout review](source-and-layout-review.md), and [integration evidence](integration/README.md).
