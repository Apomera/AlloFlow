# Typed recognition in AlloFlow and School Store

Follow-up on September 9: [voice awards](school_store_voice_awards.md) now add optional, dedicated on-device dictation into the existing typed draft. The workflow below still controls review and confirmation. The original typed-only scope and verification are retained as milestone history; no general Allobot microphone privacy guarantee is implied.

Implemented in the actual AlloFlow sources and distribution assets on September 9, 2026. This is not a separate demonstration product. Local demos and fictional services are verification fixtures only. No live district deployment, Google authorization change or real-student test was performed.

## Teacher workflow

Prerequisite: the district has reviewed and enabled the default-off [class links](school_store_class_links.md), an administrator has manually linked stable lesson identities to existing Store students, and the signed-in staff member has access to that class. The configured Store launcher must point to the approved Apps Script deployment.

1. In teacher Allobot, an award-oriented typed request is intercepted locally and offers **Open School Store**. Opening is explicit. The request is not transferred: re-enter it inside the signed-in Store. The only URL hint is `?view=recognition`, with no recipient, class, amount or reason.
2. In the Store, load your linked classes, explicitly select a class and an active recognition category, and type a supported request using the exact codename.
3. Select **Review typed recognition**. Review the canonical school student, linked class, codename, points, category and explanation.
4. Select **Use this student in the award form**. The Store resolves the identity again before filling the existing award form.
5. Review and confirm the existing award action. Only that final confirmation records points. Lookup, review, form filling and cancellation do not award points.

Examples:

```text
give Calm Otter 5 points for helping revise a design
award 5 points to Calm Otter for helping
da Calm Otter 5 puntos por ayudar
otorga 5 puntos a Calm Otter por ayudar
```

The local parser supports bounded English/Spanish command forms, not arbitrary conversation. One recipient and one request at a time; whole-number awards from 1 to 1000; required explanation of 1 to 180 characters; total request at most 512 characters. Invalid or oversized input is rejected rather than truncated. Matching tolerates case, whitespace and Unicode compatibility variants, but does not strip punctuation, guess by real name, search other classes or use fuzzy matching. The reason never chooses the recognition category.

## Privacy and authority

- Recognized award-oriented input is blocked before Allobot's chat, command/planning and lesson-handoff AI paths, including supported structured inputs and retry paths. Local notices omit the original request and are excluded from subsequent model history. Unavailable command modules do not intentionally fall back to AI for this flow.
- This is a command boundary, not a universal personal-data detector. Do not enter real student information into ordinary Allobot chat. This increment covers typed recognition; it makes no privacy promise about existing microphone or cloud transcription paths.
- Typed Store drafts and canonical lookup results are transient. They are not placed in launch URLs, browser storage or AI prompts. Final confirmation writes the necessary recognition details, including the explanation, to the existing official ledger. Follow the school's records policy and avoid unnecessary sensitive details in explanations.
- Class grants restrict this lookup; they do not reduce the existing school-wide award permissions available to Store staff elsewhere. Classroom access is not Store authority and is never educator-evaluation authority.

## Safe failure and recovery

Unknown or ambiguous codenames, inactive students/categories, revoked or suspended links, changed class versions and mismatched server replies block preparation. Changing the request, class, category or authenticated actor invalidates the prior review. A fresh server resolution is required before prefill. A pending or uncertain existing award cannot be overwritten with a new typed request: keep its exact recovery request and key. Account changes clear typed input and typed prefills. The generic navigation hint neither loads identities nor bypasses role checks.

If a launcher is unconfigured, Allobot opens its existing setup path instead of inventing a destination. If the parser is unavailable, use the reviewed learner selector. No cross-origin award endpoint, automatic points award, silent Classroom sync, student Google sign-in, Clever integration or voice-award implementation is included.

## Verification

- Broad regression: 1,135 passed and two known baseline failures across 46 files. Both failures are unchanged avatar-source expectations in `tests/allobot_targets_smil_a11y.test.js` (old random-animation array and antenna signal-waves layer), not recognition code. The avatar source and test match HEAD `7f1fdcd39`; the overall suite is not fully green.
- Large existing Portal suite: 139/139 passed. Its legacy fake DOM needed a standard `body.getAttribute` implementation; production code and assertions were not weakened. Combined regression result: 1,274 passing tests, two known baseline failures. After the final narration wording change, 178 command/privacy tests passed again (overlap, not additional unique tests).
- Six new browser checks passed: actual Store typed review in English and Spanish, and compiled Allobot guard runtime, each at 1280px and 390px. The latter is a runtime boundary test, not a full Allobot UI end-to-end test. Ten existing browser checks also passed for reviewed links, Classroom import, existing awards and practice.
- English desktop/phone and Spanish phone screenshots were inspected. Checks cover no horizontal overflow, unknown-recipient rejection, edit invalidation, final cancellation without a write and exactly one confirmed award. Spanish catalogue coverage is 1,096/1,096 entries; user-entered names and school category labels are not automatically translated.
- Build smoke passes for the actual source and desktop JSX output. All services and people in these checks are fictional or simulated. Live identity behavior, district approval, school-scale capacity and operational readiness remain unproven.
- Seventeen relevant source/distribution asset pairs matched byte-for-byte, including both Allobot modules, the teacher module, Classroom helper, Store source/entry/locale packs, practice page and integration guides. Scoped `git diff --check` passed.

Evidence is under `reports/school-store-typed-recognition-2026-09-09/`: `regression-tests.json`, `portal-regression-tests.json`, `final-command-tests.json`, `browser-checks.json` and `typed-review*.png`. Earlier surface reruns use `reports/school-store-class-links-2026-09-09/` and `reports/classroom-store-product-2026-09-08/`.

## Packaging and reproduction

`school_store_recognition.js` is a pure shared factory embedded by the canonical Allobot and Store builders. `build.js` registers both Allobot builders so a later full build does not silently omit this dependency. The Apps Script entry accepts only the generic view hint after actor resolution. Source changes must be rebuilt before distribution:

```text
node _build_udl_chat_module.js
node _build_allo_commands_module.js
node _build_school_rewards_i18n.js
node dev-tools/rebuild_school_rewards_practice.cjs
node _build_classroom_import.js
node build.js --mode=dev --shell-only
node dev-tools/check_build_smoke.cjs
node dev-tools/check_school_store_typed_recognition.mjs
node dev-tools/check_school_store_class_links.mjs
node dev-tools/check_classroom_store_integration.mjs
```

Run the School Rewards, recognition helper, Classroom import/safe-update, Allobot/command/chat, Store design and teacher export test files with Vitest using `--maxWorkers=1 --testTimeout=60000`. The large `school_rewards_print_portal.test.js` may be run separately. Browser checks use actual application assets with simulated services, not a live school tenant.

Next gate: a school-approved deployment/test-account walkthrough with Christian and the technical owner, measuring correct recipient selection and teacher effort before any student use. A smoother private handoff or voice input needs a separate design and privacy review; neither should be simulated by putting student information into links or AI requests. See [Google authorization boundaries](google_workspace_connections.md).
