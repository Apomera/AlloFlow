# Saved homework mailbox target checks

Validated locally on 2026-09-20. The two focused unit suites passed **40/40 tests** (33 saved-target checks and 7 existing portable-return checks). The two 320px Chromium scenarios passed at 04:29 UTC with zero browser errors and zero external requests.

```powershell
npx.cmd vitest run tests/hosted_share_mailbox_target.test.js tests/mailbox_return_leg.test.js --maxWorkers=1
node reports/homework-mailbox-reliability/target-browser-qa.cjs
```

## Tested boundaries

- The actual canonical entry parser and saved-share resolver read query or fragment links, ignore the current page's unrelated mailbox, normalize allowed Apps Script endpoints, reject malformed capabilities and metadata disagreement, and return only URL/pack ID/pack secret.
- The actual assignment-center refresh callback sends a teacher admin token only to the exact saved deployment matching the current connection. Two deployments on the same Google hostname remain distinct.
- The actual survey-import callback requests reconnection for a different deployment, rejects incomplete saved metadata before any read, and imports results for a matching deployment.
- The actual portable-export selection runs without any `mbConfig` binding. It takes the endpoint from the saved link, ignores newer invalid entries, and excludes expired or revoked capabilities.
- The actual teacher-panel target memo refuses another deployment or missing credentials. The generated QR dialog receives the validated target, or shows reconnect guidance without constructing an activity panel.

The first target run caught acceptance of a malformed pack ID; the coordinator added the existing `PK-` UUID shape check. The final test run includes that case.

## Browser evidence

`target-browser-qa.cjs` executes the current canonical helper and target memo, then renders the actual generated `HomeworkQrDialogView` using local React and built desktop CSS. At 320px it expands the activity section and checks the matching target and a different deployment on the same origin. The matching state constructs the recording panel adapter; the mismatched state shows reconnect guidance and constructs no panel. Both remain inside the viewport without horizontal overflow, and neither renders an admin token in page text.

`target-browser-results.json` records source-region and asset SHA-256 hashes and verifies that they remain unchanged during the run. Screenshots are `matching-mailbox-320.png` and `different-mailbox-320.png`. Browser and loopback server closed after completion.

## Limits

Tests use synthetic capabilities and recording transport/panel adapters. The real mailbox service, the activity panel's own networking, authentication, complete shell routing, uploads, native screen readers and deployment are not exercised. No credentials, live service calls, publication or deployment were involved.
