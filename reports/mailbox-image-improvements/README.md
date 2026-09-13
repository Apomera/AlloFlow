# Mailbox image delivery improvements — 2026-09-12

Image delivery now uses its own participant-scoped imageDelivery receipt. Completing
an activity cannot overwrite image status, and image checks cannot overwrite activity
progress. Each receipt matches the resource id and exact teacher assignment nonce;
a previous assignment stays distinct even when teacher and student clocks differ.
The fixed eight-field schema contains only version, resource id, status, loaded/total/
omitted counts, assignment timestamp, and receipt timestamp. Client validation,
mailbox authorization, and Firestore rules enforce the same bounds.

Students see different instructions for failed downloads and omitted images. A failed
load offers Retry images. An omission asks the teacher to replace or resize the image
and does not offer an ineffective retry. Mixed failures explain both actions. The
teacher dashboard makes the same distinction and retains targeted resend for failures.

Earlier improvements remain: large embedded still images are resized with originals
preserved; decoding succeeds before acknowledgment; bounded replay and expiring
buffers recover interrupted transfers; image loading has limited concurrency and
session/resource changes cancel stale work.

## Verification

- 266/267 tests passed across 13 focused suites, including all 25 image-delivery tests.
  The remaining failure is the existing Word Cloud dependency pin in class_mailbox.test.js.
  The stale activity-progress script-version assertion now checks its supported minimum;
  the mailbox installer upgrade prompt now matches the shipped v23 script.
- Separate local teacher and three student browser contexts exercised the real sender,
  student chunk applier, image receipt writer, teacher resend callback, and Apps Script
  protocol with mocked Google cache/Drive services. No Google account or real students
  were used. Activity progress survived image receipts and image receipts survived
  activity completion. Late joining, disconnect/reconnect during a partial transfer,
  duplicate chunks, out-of-order chunks, and simultaneous learners passed.
- A synthetic PNG was reduced from 12,386,814 to 237,207 encoded characters and delivered
  in four chunks without changing its original. An injected decode failure recovered.
- Omission-only notices have no retry button; mixed failures retain it. Mobile notices
  were checked at 320px and 390px with no horizontal overflow or browser page errors.
  See browser-results.json and the student/teacher screenshots.
- The local Firestore emulator accepted valid own-participant writes, preserved both
  receipt types, and rejected peer/anonymous writes and malformed receipts. It exited
  successfully and was shut down. See firestore-image-rules.log.
- Generated LiveAac, LiveSessionDock, ShareSessionSurfaces and mailbox-script modules,
  public mirrors, content cache versions, all three shell syntax checks, rule mirrors,
  and source whitespace checks passed.

## Release

All changes are local and have not been published. The independent teacher image
status requires the updated app and mailbox script v23. Update the existing Apps
Script deployment and run Connect & self-test when releasing; its URL can stay the
same. Older mailbox deployments still transfer images and offer local student retry,
but the teacher dashboard explains that independent image status needs an update.
Matching Firestore rule changes are prepared locally; no rules were deployed.

Run the browser check with node dev-tools/mailbox_image_delivery_qa.cjs.
Run the image unit suite with node node_modules/vitest/vitest.mjs run tests/mailbox_image_delivery.test.js.
Run tests/firebase_mailbox_image_rules.test.cjs through a local Firestore emulator;
reports/mailbox-image-improvements/firebase-images.json configures isolated test ports.
