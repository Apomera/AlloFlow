# Pending mailbox share controls

A waiting homework share previously survived dismissal of Class Mailbox setup. A later mailbox connection could therefore upload an assignment that the teacher had already dismissed. The regression fixture reproduced one unexpected upload after close before this change.

## Changed behavior

- Setup shows the prepared assignment title, resource count, student AI setting, and any shared activity. A named Cancel pending share action remains available while connecting.
- Connect and share explicitly resumes that prepared assignment after the connection handler returns verified credentials. Ordinary configuration changes no longer trigger uploads.
- Cancel, X, Escape, backdrop, lazy-view dismissal, Project navigation, Forget mailbox, and host unmount invalidate the waiting request. A late connection cannot publish the canceled request or a newer replacement.
- The encoded assignment and sharing settings are retained through setup, failed verification, and retry. Duplicate connection clicks are coalesced. Expired packets are rejected before setup/upload.
- Cancellation also invalidates delayed hosted and self-contained packet builds, including oversized-link fallback. A new share supersedes older preparation before it can reopen setup or display a stale link. Once an upload has started, this change does not abort or roll back the external request; failure still clears busy state and reports the error.
- Keyboard cancellation restores focus to the available Connect control or Close. The pending card was checked at 1280px and 320px.

## Implementation and source synchronization

The canonical shell owns pending state, request generations, explicit connection coordination, and dismissal wiring. HostHandlers now returns the verified connection config after its existing optional session recovery settles. ShareSessionSurfaces renders the waiting summary and controls.

The two changed shell regions and focus callback were synchronized into both desktop source shells with guards against unrelated edits. The two generated modules match their public mirrors byte for byte; hosted loader versions match those files. All three JSX shells parse. See source-integrity.json and sync-and-verify.cjs.

## Validation

**122/122 tests passed across 11 files** in the final combined run. See validation-summary.json for suite counts, regression-results.json for the initial run, and final-focused-results.json for the final results including corrected durable-config checks and added preparation/dismissal cases. BROWSER-QA.md and browser-results.json document six passing isolated browser scenarios. Root also visually inspected pending-320.png and confirmed the waiting card and cancellation control are readable and contained.

The initial combined run found two stale durable-config tests that searched for previously extracted handler code in the canonical shell. Those checks were updated to exercise the generated handlers and retain shell dependency-wiring coverage; details are recorded with the final test evidence.

Tests use actual extracted/generated code with controlled local collaborators. Browser checks render the generated component with callback adapters, local React, and local CSS. They do not mount the complete app or contact a real mailbox. Full-app, live-service, native screen-reader, and installed-desktop validation remain separate work.

No publication, installer build, push, or deployment was performed. Changes remain uncommitted in the shared working tree because the same files contain extensive concurrent work.
