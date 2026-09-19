# Allobot destination and network privacy checks — 2026-09-19

## Changes

- A visible indicator above the privacy disclosure shows the active AI and endpoint origin, plus whether the next ordinary reply includes selected context. Saved settings are labelled Configured AI when runtime routing metadata is unavailable.
- Endpoint display excludes URL credentials, paths, query parameters and fragments. It does not claim tenant identity, district approval or FERPA certification.
- Research now reads the actual backend from the runtime object instead of coercing that object to a string. Gemini functions carry a routing tag through the existing provenance wrapper, so stale local-backend metadata does not misroute research after switching back to Gemini.
- Existing question-only defaults, one-reply context choices, public-query allowlist and deployment-managed request restrictions are preserved.

## Browser network coverage

Run from the repository root: node reports/allobot-network-privacy-2026-09-19/browser-check.cjs

The self-contained Chromium harness loads the real built AI backend, Gemini API, Allobot chat, Phase K verification and privacy controls modules. Every HTTP request is intercepted; all input, response data and credentials are synthetic. At both 1280px and 320px, assertions cover:

1. Ordinary chat excludes editor, history and roster markers by default.
2. Explicit recent messages/excerpts appear only in the AI request; Serper receives the exact approved public topic.
3. Native Google grounding receives a separate public lookup; the contextual answer request has no grounding tool attached.
4. Active custom-backend research uses Serper for the public topic and the approved custom endpoint for the contextual answer.
5. Source citations point to URLs returned by the provider fixture.
6. A failed reply clears the one-reply excerpt; user retry keeps the question without restoring that excerpt.
7. Actual Phase K source verification through the Canvas Gemini wrapper sends its approved topic to Serper and its full source only to Gemini.
8. A private/unsupported Canvas query produces no network request or verification evidence.
9. Managed policy rejects an unapproved Gemini connection before fetch and permits the configured custom endpoint.
10. The destination indicator refreshes on configuration changes and correctly handles switching back from a custom backend to Gemini. URL credentials and parameters do not appear.
11. Clearing live chat preserves a separate saved-history fixture; selected context is absent from localStorage.
12. No unexpected network destinations, page errors, horizontal overflow or checked axe violations.

Each viewport intercepted 12 expected requests. See browser-results.json and reviewed destination screenshots.

## Scope and limits

This is a composed module/workflow harness with focused CSS, not a deployed full-host or packaged-desktop test. Its small UI adapter calls the real ordinary-chat handler; it does not exercise every command/lesson workflow. Gemini receives a fetch adapter, so the failure case covers application/user retry rather than exhaustive backoff scheduling. The Canvas test uses the real verification handler and request wrappers. Remote proxies are intercepted here; their existing policy unit tests provide separate coverage. Clearing the saved-history fixture is not a cloud-deletion audit. No live provider requests, real student data, policy activation, deployment or push occurred.

The indicator describes routing, not district authorization. Managed policy remains opt-in and requires deployment configuration; endpoint identity and server-side enforcement still matter. Media routing and saved-data deletion across cloud/local stores remain separate follow-up work.

## Final validation

108 distinct focused/regression tests passed across the two JSON reports. Both Chromium viewport scenarios passed. Public-query and managed-policy sync gates, source-pair drift checks, three generated public mirrors and scoped whitespace checks passed.
