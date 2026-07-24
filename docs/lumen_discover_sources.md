# Lumen Discover Sources

Status: implemented first release plus first-party safe page import, July 2026.

## Purpose

Discover Sources adds a NotebookLM-style search → review → select → import loop to Lumen Study Sources while preserving Lumen's stricter evidence boundary.

```text
search query
  → discovery candidates (untrusted metadata)
  → human selection
  → authenticated first-party page retrieval when available
  → DNS resolution + public-address pinning
  → redirect revalidation + content/time/byte limits
  → readable-text extraction
  → source hash + local passage chunking
  → eligible for grounded retrieval and citation
```

A title, URL, search snippet, or grounded-search result is never evidence by itself. Only a successfully retrieved page snapshot stored in `project.sources[]` can produce `evidenceNodes[]`.

## Implementation

### Evidence core

`stem_lab/stem_lumen_evidence.js` adds:

- `canonicalWebUrl(value)` — admits public HTTP(S) URLs only; rejects credentials, localhost, common private/link-local ranges, and unsafe schemes; removes fragments and common tracking parameters.
- `normalizeDiscoveryResults(raw, query, now?)` — accepts the shared search provider's `{results}` shape or Gemini-compatible `groundingMetadata.groundingChunks`, de-duplicates canonical URLs, and returns at most ten candidate records.
- `cleanFetchedWebText(value)` — removes AlloFlow's transport-level `Source: URL` preamble before hashing.
- `discoveryCandidateToSourceSpec(candidate, content, now?)` — requires at least 120 characters of readable full text and creates a stable `web-discovery` source specification.

Discovered sources retain `canonicalUrl`, `fetchedAt`, `discoveredBy`, `discoveryQueryHash`, `searchProvider`, and `searchRank`. Re-importing the same canonical URL uses the ordinary `upsertSource` version/staleness path.

### Study UI and client adapter

`stem_lab/stem_lumen_study.js` provides an accessible **Discover web sources** panel:

1. Enter a topic without learner names or private information.
2. Search through an injected `ctx.searchWeb` adapter, the shared `window.WebSearchProvider`, or grounded `callGemini` metadata as a fallback.
3. Review titles, canonical links, and snippets. Every snippet is labeled as a search preview that is not evidence.
4. Select one or more results.
5. Import through an explicitly injected `ctx.fetchWebSource`, then the first-party `/api/sourceFetchProxy` route when configured.
6. Use a configured legacy web-text helper only when the first-party route is absent or unreachable. A safety rejection from the first-party route is never bypassed through the legacy helper.
7. Add successful page snapshots to the normal source list and existing local retrieval/citation pipeline.

The UI permits twelve web searches per open session with a one-second repeat cooldown. Search audit events retain only a query hash; import events retain source IDs, never the raw query.

### First-party page importer

The same byte-identical safety core is used by:

- `desktop/web-app/functions/web_source_fetch.js`, exported through the authenticated Firebase `sourceFetchProxy` Function.
- `desktop/runtime/web-source-fetch.cjs`, exposed only to the bundled desktop app through the private loopback runtime.

For every initial URL and redirect hop, the importer:

- accepts HTTP/HTTPS on standard web ports only and rejects embedded credentials;
- blocks localhost, internal hostnames, and private, loopback, carrier-grade NAT, link-local, multicast, documentation, reserved, IPv4-mapped, NAT64, and unique-local ranges;
- resolves all DNS answers, rejects the destination if any answer is non-public, and pins the outgoing request to the approved answer set to close the DNS-rebinding window;
- follows at most four redirects and repeats URL and DNS validation before each request;
- sends no browser cookies or authorization state;
- stops after 12 seconds or 2 MiB of response data;
- accepts readable HTML/XHTML and plain-text-family content only;
- removes scripts, styles, forms, navigation, footers, asides, and tags before returning normalized text;
- caps extracted text at 250,000 characters and requires at least 120 readable characters.

The Firebase route requires an exact allowed origin, a valid Firebase ID token, App Check, POST JSON, a per-user Firestore quota, capped instances, and no-store responses. The desktop route stays on the private loopback server, accepts only the embedded app's same-origin POST, and is not exposed by the LAN-share listener.

## Privacy and network boundary

The panel discloses that search terms leave the device. Page import first uses AlloFlow's authenticated, size-limited importer when available; a configured legacy web-text service may be used only when that route is unavailable. Users are warned not to include learner names, private information, or signed/tokenized URLs.

Retrieved page text is not model-summarized during import. Lumen stores the readable snapshot, hashes it, chunks it locally, and sends only later locally retrieved passages to the configured AI when the user asks a study question.

The first-party importer intentionally does not send browser credentials, execute page JavaScript, bypass bot protection, or sign into paywalled/private sources. Such pages must be opened by the user and added through the paste-source flow.

## Accessibility

- The discovery toggle exposes `aria-expanded` and `aria-controls`.
- The query has a persistent label.
- Every result checkbox has a title-specific accessible name.
- Search and import progress use status/live-region messages.
- Original sources open through scheme-checked links with `noopener noreferrer`.
- The open discovery panel passes the automated WCAG 2.1 A/AA axe audit in `tests/lumen_discovery_ui.test.js`.

## Acceptance tests

- `tests/lumen_discovery.test.js` covers candidate normalization, provider orchestration, authenticated first-party POSTs, legacy fallback only on route unavailability, safety-rejection non-bypass, full-text requirements, retrieval binding, quotas, and privacy-safe audit events.
- `tests/lumen_source_fetch_proxy.test.js` covers public/reserved address classification, URL validation, mixed DNS refusal, redirect revalidation, approved-address pinning, extraction, content and byte limits, cloud/desktop parity, and the real desktop HTTP denial boundary.
- `tests/lumen_discovery_ui.test.js` clicks through the disclosure panel and complete search → select → import flow using real React state, then audits the open panel with axe-core.
- `tests/lumen_source_controls.test.js` and `tests/lumen_source_controls_ui.test.js` verify migration, persistence, retrieval/prompt exclusion, label scope, refresh preservation, exact stored-passage inspection, focus, and axe coverage.
- `dev-tools/check_firebase_security.cjs` makes authentication, POST-only routing, quotas, DNS pinning, blocked ranges, redirect/size/content limits, and cloud/desktop parity release invariants.

## Deliberately deferred

- Agentic multi-hop Deep Research
- Search-result quality scoring or publisher endorsements
- Automatic source selection
- Authenticated/paywalled page retrieval
- PDF/EPUB page import through the web fetcher
- Google Drive/Classroom search
- Hosted semantic/vector retrieval
- Automatic refresh polling
- Cross-source contradiction and coverage analytics
