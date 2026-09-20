# Local Macbeth classroom journey

This is a reproducible integration check across teacher curation, saving, selected assignment delivery, the student reader, and the common document exporter. It uses the public-domain Macbeth opening-scene fixture in `../novak-gloss-enhancements/macbeth-act1-scene1.fixture.json`.

Run from the repository root:

```powershell
node reports/novak-classroom-journey/run.cjs
```

The runner reads current production code, regenerates its extracted seams and browser bundle, opens local Microsoft Edge Chromium contexts, and writes `results.json`, `production-evidence.json`, a student packet, student HTML, and screenshots. It binds only to loopback and aborts external browser requests. The report records whether any external request was attempted.

Latest validation: **passed**, 2026-09-20 03:07 UTC, against the merged assignment-selection and restore-rejection changes. All 10 checks passed, with zero browser runtime errors and zero external requests. Production hashes remained unchanged during the run. See `results.json` and `production-evidence.json` for the recorded evidence.

## What runs as production code

- The shell's original-reading and adapted-companion dispatch callbacks.
- The shell's word-support generation and editing callbacks, with the host handler's real `onUpdateResource` guard.
- The compiled annotation generator and reader, the source/preservation/curation contract, and source-family isolation.
- The shell's exact offline `serializeItems` function and the production history hydrator, with a real browser save and reload.
- The shell's selected-resource resolver, `SharedActivity.buildAssignmentPackEncoded`, the LiveAac student serializer and its privacy sanitizers, and the shell's compression/decompression helpers.
- The actual lazy-readiness helper, pending homework restore effect, restore wrapper, and compiled MiscHandlers resource opener. The harness delays opener registration until after the packet is decoded.
- The common document pipeline acting on the resources received by the student.

Extraction boundaries fail explicitly if the source moves. `production-evidence.json` records the source regions and module SHA-256 values used in the run. Generated extracts are recreated each time and must not be maintained independently.

## Journey

1. Open the exact original scene without an AI call.
2. Generate canned gloss suggestions through the production generator; edit and pin the explanation for *heath* in the real teacher UI, remove a suggested support, and refresh suggestions.
3. Save and reload, checking that original text, teacher wording, pins, and removals survive.
4. Add a clearly labeled pre-authored adaptation through the production companion dispatch callback. Add an unrelated lesson with identical source text and a teacher-only analysis to challenge selection isolation.
5. Package only the adaptation. Verify that its matching curated original travels with it, while unrelated material and removed explanations do not.
6. Open the encoded packet in a separate student browser context, hold the resource opener unavailable, then register it and verify a single successful restore.
7. Check Original / Both, the teacher gloss, hidden teacher controls, lighter density, and a 320px layout.
8. Render the received collection through the actual common HTML document pipeline. Compare every original source character and check separately escaped teacher notes.

## Evidence limits

This is a local React integration host, not a launch of the entire AlloFlow shell. Storage uses localStorage as the harness backend; the production offline serializer/hydrator are real, but IndexedDB, autosave scheduling, retention and recovery are not exercised. The shell codec and restore gate are real; the complete QR import, expiry, authentication, hosting and live-session paths are not exercised. Delayed module registration is controlled by the harness rather than a throttled remote deployment.

The gloss provider returns fixed example definitions. The adaptation is a pre-authored test sample supplied by a fixture adapter, not output from the production adaptation-generation pipeline. Read-aloud callbacks are mocked. Passing results establish cross-boundary preservation and usability of these exercised controls; they do not establish literary quality, reading-level fit, speech quality, native screen-reader usability, deployment parity, or classroom effectiveness. No credentials, external model calls, learner data, publication or deployment are involved.