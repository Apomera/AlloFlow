# Quick Start loading follow-up

Date: 2026-09-20

The original Quick Start host adapter could remain on its loading card after its module had registered. It read the global export only during a React render, did not subscribe to registry changes, did not request the module when opened, and did not expose failed-load retry. The header's setup entry only opens the adapter, so it depended on another loading path.

The adapter now uses the existing CDNModuleGate. Opening requests Quick Start directly; registration updates its view; a failed request offers Retry; and loader discovery handles the child mounting before the host installs its loader. The loading overlay retains z-index 300. Closing disposes discovery/polling, and later module registration does not reopen the wizard.

The background module pump and its launch/hidden-tab protection were not changed. This addresses an observed adapter lifecycle defect, not the complete startup-performance workstream in section 7 of NOVAK_FEEDBACK_IMPLEMENTATION_PLAN.md.

## Reproduce

From the repository root:

```text
node reports/novak-startup-followup/browser-qa.cjs --before
node reports/novak-startup-followup/browser-qa.cjs
```

The before run uses the captured, exact shell adapter and shared gate in `before-source.json`. The after run extracts the current shell adapter and shared gate. Both run in local Chromium with installed React, a controlled local wizard export, and a controlled request failure/delay. External requests are blocked and recorded. No API credentials are used.

## Evidence

| Scenario | Before | After |
| --- | --- | --- |
| Open without role prewarm | Loading indefinitely; no module request | One request; wizard appears |
| Module completes after role prewarm | Registry says loaded but loading card persists | Wizard appears without unrelated parent updates |
| First request fails | Loading card persists without Retry | Retry recovers; exactly two total script requests |
| Close while loading, then reopen | Closed remains closed; reopen reveals loaded wizard | Same behavior retained; no second script request |
| Loader installed after adapter mounts | No request | Discovery requests once; wizard appears |
| Mount closed, then open | Closed makes no request; opening still makes no request | Closed makes no request; opening loads wizard |
| Close before loader installation | No request after close | No request after close; discovery cancelled |

The after run asserts all seven lifecycle scenarios, including keyboard Enter activation for Close and Retry, request deduplication, and z-index 300 on the failure surface. Both results record zero external requests and zero browser page errors.

- `before-browser-results.json`: baseline behavior.
- `after-browser-results.json`: current behavior and source hash.
- `browser-qa.cjs`: reproducible browser assertions.
- `before-source.json`: captured baseline source and shell hash.

The fixture's 200 ms response delay is a controlled asynchronous condition, not a measured product delay or a tuning recommendation. These checks do not establish whole-app cold-load speed, real CDN behavior, full keyboard focus management, assistive-technology usability, Quick Start completion, or live deployment parity. Full-app throttled measurements and any background-prefetch tuning remain separate.
