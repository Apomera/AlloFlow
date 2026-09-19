# External search privacy boundary — 2026-09-19

District-approved Gemini access and external search are different data destinations. AlloFlow must not assume that a Gemini Developer API key inherits a district Workspace agreement. The standalone Gemini client uses generativelanguage.googleapis.com; district coverage is a deployment/contract decision, not something this patch verifies automatically.

## Changes
- The active WebSearchProvider no longer extracts a query from a contextual prompt. It accepts only canonical UDL templates, constrained CCSS/NGSS code queries, and exact public topics from a small reviewed list.
- Validation runs before search routing and at direct Serper, proxy Serper, SearXNG, and DuckDuckGo transport entry points. Rejected requests return without trying fallbacks.
- Both repository-owned proxies (Canvas Cloudflare Worker and authenticated Firebase Functions) validate independently before Serper. The Worker rejects before cache and budget access.
- Personal and shared keys have the same restrictions. Serper client requests omit credentials and referrers. Query contents are no longer added to search diagnostics; upstream error bodies are not logged.
- Allobot explains blocked external research. Settings distinguish external Serper from district-approved AI. Existing contextual Gemini behavior is unchanged.
- Canonical policy: desktop/web-app/functions/public_search_policy.js. Run node dev-tools/sync_public_search_policy.cjs after changing it. The existing search deployment gate now checks policy parity and the backend mirror.

## Deliberate limitations
This is a strict allowlist, not automatic deidentification. General free-form external searches, arbitrary person names, state-standard searches without supported codes, timeline/scene research queries and unsupported subjects may be blocked. Extend the reviewed public query catalog or add structured public topic selectors to regain scope; do not reintroduce prompt scraping or bypass flags. Code syntax validation does not prove a standard exists: source results remain necessary.

Native Google grounding, other cloud AI features, saved chats, historical logs/caches, and all other app data flows have not received an app-wide privacy audit in this change. Third-party proxies outside this repository cannot be updated here. Client validation protects updated app requests, but each operator must deploy its server changes. This work neither certifies FERPA compliance nor verifies any district agreement. No live API calls or real student data were used. No deployment or installed Desktop rebuild was performed.

## Validation
- 99 tests passed across privacy boundaries, Allobot evidence/settings, Canvas client-to-Worker transport, Worker budgets/cache/errors, diagnostics, query gate and UI accessibility suites.
- The additional citation suite passed its two transport tests and research reference test. Its two Analyze Source Text fixtures still return undefined from the separately modified generation dispatcher. Those failures are unresolved and not part of the passing 99-test result.
- Chromium component harness at 1280px and 320px passed clickable citations, keyboard excerpts, key/settings persistence, independent Canvas settings load, no horizontal overflow, no page errors, and zero checked axe violations. Results copied to browser-results.json; harness/screenshots remain in reports/allobot-evidence-2026-09-19.
- Four source/public module mirrors match. Shared policy parity, search callsite gate (20 calls), JavaScript syntax and scoped diff whitespace checks passed.
- OneDrive rejected truncate-on-open for some generated files; their builders completed using an r+ write fallback. No unrelated edits were discarded.

## Reference
Google distinguishes school-account Gemini Apps access from other configurations: https://support.google.com/gemini/answer/14620100?co=DASHER._Family%3DEducation&hl=en

## Commit status
The scoped commit was blocked by the repository pre-commit source-pair gate: content_engine_source.jsx differs from desktop/web-app/src/content_engine_source.jsx (18 lines). Neither file belongs to this change. The gate was not bypassed and those concurrent edits were left untouched. Search/evidence files are staged locally; no commit or deployment occurred.
