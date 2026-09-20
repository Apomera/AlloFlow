# Queued mailbox share: local browser evidence

Run from the repository root:

```powershell
node reports/pending-mailbox-share/browser-qa.cjs
```

Latest run: **6/6 scenarios passed** on Chromium 148.0.7778.96 at 2026-09-20 03:40 UTC. Zero browser runtime errors and zero external requests. The browser and loopback server closed after completion.

The harness renders the current generated `ClassMailboxSetupView` from `view_share_session_surfaces_module.js` using local production React/ReactDOM and built desktop CSS. `browser-results.json` records SHA-256 hashes for every loaded asset and verifies those assets did not change during the run.

| Scenario | Verified behavior |
| --- | --- |
| Pending, 1280px | Assignment title/count/AI summary, explicit Connect and share, keyboard cancel, return to ordinary setup, focus restored to Connect |
| Pending, 320px | Same controls and behavior with wrapping title, no horizontal overflow, panel inside viewport |
| Keyboard Close, 320px | Close invokes the cancellation-aware close callback; pending state and setup are cleared without connecting |
| Connecting, 320px | Connecting action is disabled, Cancel pending share remains enabled, keyboard cancel preserves setup and returns focus to Close |
| Configured mailbox with pending version update, 320px | Shared activity and optional AI summary, explicit Connect and share action, required version and saved summary passed to callback |
| No pending share, 320px | No pending summary/cancel control; ordinary Connect & self-test remains available |

Screenshots: `pending-1280.png`, `pending-1280-connect.png`, `pending-320.png`, `pending-320-connect.png`, and `configured-pending-320.png`. Layout assertions measure viewport and internal panel bounds; screenshots retain the rendered result for review.

## Limits

This is an isolated generated-component check with stateful callback adapters. Connections, uploads, authentication, mailbox services and cancellation races are not performed; those require the separate production-host regression tests. Keyboard activation and focus return are exercised, but the full application's Escape/backdrop/focus-trap integration and native screen readers are not. No live service, publication, installation or deployment occurs.
