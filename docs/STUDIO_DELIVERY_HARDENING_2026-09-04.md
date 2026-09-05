# Studio recovery and delivery hardening — 2026-09-04

This follow-up strengthens the Memory Aid and Applied Challenge work described in [Studio workflow enhancements](STUDIO_WORKFLOW_ENHANCEMENTS_2026-09-04.md).

## Changes

- Text backup restore validates response schema, card identity and uniqueness, field types, workspace structure, and response-row containers before applying anything. Invalid self-check rows cannot enter the response lane. Rejected files leave existing writing in place.
- Backup downloads use the same validation as restore and enforce its 2 MiB UTF-8 limit. This prevents exporting a file that the restore control would refuse solely because of its size. Backups remain text-only.
- Multipart resource delivery accepts only positive integer part numbers within the declared range. Completion requires every numbered part. Identical replay is harmless; conflicting counts or replacement chunks are ignored. Resource IDs that overlap object prototype names are handled as ordinary own keys.
- Serializer regression coverage checks the default live channel and explicit QR channel. The audio fixture now verifies the actual persistence callback payload instead of assigning a serialized store after preparation.

## Repeatable local browser check

Run from the project root:

```sh
node dev-tools/studio_delivery_e2e.cjs
```

The harness uses two isolated Chromium contexts, a loopback HTTP mailbox, and synthetic resources. It loads the real studio views, response boundary, audio store/service, assignment serializer, and session transport. Codec, multipart collection, autosave, and submission helpers are extracted from the current host source. A small IndexedDB adapter supplies the storage interface; this does not boot the entire application or exercise its hosted backend.

The successful run verifies:

- Two resources delivered in 21 chunks, in reverse order with each chunk replayed; one reconstructed copy per resource.
- A second publish cycle sends zero unchanged resources.
- Assignment and mailbox resources match, with learner AI disabled and private source/practice data excluded.
- Both typed responses survive a browser reload in learner IndexedDB; teacher storage remains empty.
- A saved reference clip plays in each studio without synthesis. The fixtures use valid synthetic silent WAV clips; this checks browser decoding/playback, not voice quality.
- Both responses reach the local teacher mailbox and map back through the teacher review helpers. The canonical teacher resources remain unchanged.
- Response submissions exclude reference audio, source excerpts, and private practice attempts.
- No browser page errors.

The machine-readable report is written to `.tmp/studio-delivery-e2e/report.json`.


## Final verification

- Seven selected regression suites contain 131 tests. The initial run passed 130; the remaining ownership harness referenced the older host callback signature. After updating it to exercise both current resource-update helpers, its full suite passed 13/13. All 131 selected checks have passing results.
- The local two-browser delivery regression passed, including teacher response-review mapping.
- Both generated host files parse and contain the hardened multipart collector. Six affected runtime mirrors match their root modules. Memory Aid and Applied Challenge source freshness checks pass.
- The full development build stopped with Windows EPERM while replacing the unrelated desktop/web-app/public/sre-assets directory. Host generation and affected runtime copying completed before that error. Full companion-asset refresh is therefore incomplete; this report does not claim a successful full build.

## Scope

Hosted mailbox/Firebase delivery and manual screen-reader testing remain external checks. These enhancements and their verification are local; nothing was published or deployed.
