# Track 13 — retry feedback lifecycle

2026-09-27. Baseline HEAD: c4c8d6f8bffc88e5e1549b2f84448f15184b2fe8. Final observed HEAD: a63e347b7d193cbc95b5fc3a9fec844322f1f455. Local source is the authority; no deployed-release claim is made. No applicable AGENTS.md was found. The shared handoff and track ownership ledger were inspected, and concurrent work was preserved.

## Result and reproduced failures

Image retry feedback now belongs to the current session, student, resource, assignment, image revision and mailbox capability. A retired retry cannot leave the new target disabled, display its old error, or change the new retry's feedback. A matching receipt that no longer calls for retry retires obsolete feedback. Rapid activation sends at most one pending retry for that target.

| Priority | Evidence classification | Before and after | Exact evidence |
| --- | --- | --- | --- |
| P2 | Reproduced failure, fixed locally | Pending state survived resource/revision/assignment/student/session/capability changes, including returning to an earlier target. A keyed feedback instance now retires that state and its callbacks. | live_aac_source.jsx:1039; tests/mailbox_image_retry.test.js:22 |
| P2 | Reproduced failure, fixed locally | A retry error could remain beside a matching loaded receipt, or appear when an older retry rejected after that receipt. Retry eligibility now participates in the feedback lifetime. | live_aac_source.jsx:1042; tests/mailbox_image_retry.test.js:45 |
| P2 | Reproduced failure, fixed locally | Two activation events before React's next render called the resend twice. An immediate pending-attempt guard now prevents the duplicate. | live_aac_source.jsx:1051; tests/mailbox_image_retry.test.js:59 |
| P2 | Reproduced failure, fixed locally | The actual teacher dock retained retry state across session-code or school/app changes. It now supplies explicit session and recipient identity. | view_live_session_dock_source.jsx:788; tests/mailbox_image_dock.test.js:54 |

Baseline fixtures reproduced 13 failures with six passing controls across the retry component and full dock. The final suite adds controls for successful resends remaining unconfirmed and older successes preserving newer failures. Baseline evidence is in retry-baseline.json and retry-dock-baseline.json; retry-baseline-source.txt preserves the pre-change module source.

## Minimal change and safeguards

The change is confined to the retry status component and the existing dock call site. Feedback remounts only when delivery identity or retry eligibility changes. Ordinary roster/name updates, new callback objects and clock ticks preserve an active retry. A local attempt token prevents duplicate activation and ignores results after the feedback instance is retired. Completed current failures remain actionable, and a subsequent retry clears them.

No new payload fields, media exports, teacher-cache evidence, server fields or persistence writes were added. Existing privacy exclusions, image budgets, omission counts, assignment matching and prepared-image revision checks remain in place. Successful resend completion does not claim that images reached the student: the teacher still needs a matching recipient receipt. Image decoding is not evidence that a learner viewed an image. The route-by-capability matrix and serialized received-preview contract in README.md are unchanged.

## Validation and limits

- 56 tests passed in four files: retry lifecycle (16), full image dock (5), image delivery/receipt contracts (31), and dock end-session behavior (4).
- 26 distinct isolated Chromium cases passed: eight new generated-module retry cases and 18 existing recipient cases. Keyboard activation, 44px retry target height, session/resource/revision changes, matching receipts, failed sends and dock reopen were checked. Existing cases cover refresh/offline reopen, saved-link hydration, scene decoding and audio omission/received-audio behavior. Both runs reported no page errors.
- Both LiveAac and LiveSessionDockView were rebuilt. Their root/public files exactly match their source build functions. Hashes are recorded in retry-validation.json; expected release pin prefixes are 1ef3de4c and 6d8b3d86 respectively.
- All 21 non-host recorded inputs stayed unchanged during validation. The shared host changed concurrently, so the 31 host-dependent receipt tests and 18 recipient browser cases were rerun successfully. Four recorded codec/assignment/receive/receipt host regions stayed stable through that recheck. This is scoped evidence, not validation of the entire changing checkout.
- Scoped whitespace checks passed, with a CRLF normalization notice for the existing source file.

Commands:

    node node_modules/vitest/vitest.mjs run tests/mailbox_image_retry.test.js tests/mailbox_image_dock.test.js tests/mailbox_image_delivery.test.js tests/live_dock_end_session.test.js --maxWorkers=1 --testTimeout=30000
    node reports/connected-delivery-track13/browser-retries.cjs
    node reports/connected-delivery-track13/browser-recipients.cjs
    node _build_live_aac_module.js
    node _build_first_wave_view_modules.js LiveSessionDockView

Browser fixtures use intercepted delivery.test URLs and disposable profiles. They do not operate the saved app, contact a live backend, establish physical audio audibility, or prove offline boot of the deployed shell. Transport callbacks in retry fixtures are controlled promises; the existing receipt suite checks the real extracted handlers and server allowlist. Network cancellation is not claimed.

## Remaining source gaps and integration handoff

- A never-settling receipt write can hold later writes in the serialized queue at live_aac_source.jsx:995. This is a source-inspected risk, not a reproduced network failure. A timeout alone could let an older write finish after newer progress; retain ordering until cancellation or server ordering rules can guarantee that a superseded receipt cannot replace current evidence. A future fixture should delay the first write, publish newer progress, then release the first write in the opposite order.
- Retiring retry feedback does not cancel an already-started resend. The shared host awaits resource transmission before assignment at AlloFlowANTI.txt:25357; transport cancellation/target revalidation belongs with integrator 01. Future acceptance should switch session or assignment while transmission is deferred and prove that the resumed retry cannot overwrite the replacement assignment. This behavior was not reproduced against a live backend or changed here.
- Image status/retry strings remain English at live_aac_source.jsx:1018 and :1024. Localization remains a separate follow-up.
- The earlier autosave reading-envelope host patch remains pending, confirmed by current source. HYDRATION.md records its previous reproduction and candidate validation; its nine candidate cases were not rerun in this pass.

Owned files: live_aac_source.jsx, view_live_session_dock_source.jsx, their generated root/public pairs, tests/mailbox_image_retry.test.js, tests/mailbox_image_dock.test.js, this report directory and the scoped Work Log entry. Integrator 01 should include both module pairs together and refresh normal release pins/mirrors. This increment needs no new host props or server schema. Shared host/reader/catalogs and loader pins were not edited. Dependencies 01/02/08 and portable-contract coordination with 14 remain unchanged. No Git mutation, commit, push, deployment, install, app-state operation or other-session contact occurred.
