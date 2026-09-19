# Allobot privacy follow-up — 2026-09-19

## Ordinary chat
Ordinary coaching replies now send the current question and coaching instructions by default. They no longer automatically attach 20 prior messages, grade-level context, group differentiation/roster details, editor or analysis text, or generated-resource titles.

The Privacy and public research panel offers two explicit, session-only additions for the next ordinary reply: up to four recent conversational messages at 500 characters each, and a reviewed excerpt capped at 1,500 characters. The recent-message preview shows the bounded text. Welcome, local-only, error and operation messages are excluded. The choices reset when consumed, including when a request fails. A retry does not silently restore the excerpt. App commands, blueprint review, lesson generation and other specialized workflows still use their task-specific inputs.

The public-topic picker prepares a visible draft without sending it. Its choices come from the same public query catalog used by both Serper proxies. Arbitrary text does not become allowed merely because it contains a topic word. Existing supported UDL/standard-code queries remain available.

## Managed connections
Deployment owners may inject window.ALLOFLOW_MANAGED_AI_POLICY before app startup. It is deliberately NOT loaded from localStorage or editable by an ordinary settings checkbox. No profile has been activated in this workspace or any live deployment.

Example for a reviewed local text engine (adjust the exact endpoint to the actual installation):

```js
window.ALLOFLOW_MANAGED_AI_POLICY = {
  version: 1,
  allowExternalSearch: false,
  connections: [
    { backend: 'alloflow-local', baseUrl: 'http://127.0.0.1:32173', keyless: true }
  ]
};
```

For a school-approved API gateway, use its actual backend/baseUrl pair. OpenAI-compatible backends append /v1/chat/completions to baseUrl. For a keyed connection, omit keyless and provide apiKeySha256: ['<approved key SHA-256 as 64 hex characters>']. Compute the fingerprint privately during provisioning; do not put the raw credential in this policy. A different personal key is rejected, even for the same provider endpoint. Keyless must be explicitly true for an empty credential to be accepted. HTTPS is required except for loopback HTTP.

A reviewed Canvas deployment may explicitly approve { backend: 'gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', canvasHost: true }. This trusts the deployment's host-credential path; it does NOT verify the signed-in school account, tenant or agreement. Do not enable it based solely on a Google hostname or API key. Administrators must establish coverage of the actual service/account arrangement.

Requests check the current policy before inference and model discovery. Unknown policy versions, unmatched providers/endpoints/credentials and unapproved fallback connections fail closed. Managed text transports reject redirects rather than following them to another destination. External research is disabled unless explicitly enabled; client transports, including direct calls, and the Allobot Google-grounding step respect this setting.

Version 1 permits approved text inference only. AIProvider image generation/editing, vision, audio, speech, safety-analysis routes and the shared Gemini vision/image-edit wrappers are blocked under a managed profile because those flows can use separate provider overrides or fallback services. Other host-owned media integrations outside these shared transports are not covered by this policy. This is not a universal network firewall.

These browser checks prevent accidental configuration/routing changes. A user or injected script can alter browser code; actual institutional enforcement requires school-controlled identity, server/network restrictions and administration. The feature is not a tenant-verification system or a compliance certification.

## Storage and diagnostics review
- Live Allobot messages are React session state. This pass found no live-chat fields in recovery/storage snapshot implementations searched. The new context selections also remain in memory and never call localStorage.
- Clear live conversation empties the live transcript, draft and pending context. It does not erase saved History items or provider-side records.
- Save chat and Save advice explicitly create udl-advice History items. Save advice additionally calls the selected AI to summarize the supplied advice/question. Those items follow the existing History storage/sync configuration and deletion controls. The panel now explains this before users save/clear. No existing saved data was deleted or migrated.
- Personal backend/Serper keys still use the existing browser configuration storage. Removing a personal Serper key clears that entry; this pass did not introduce a credential vault or erase other provider keys.
- Allobot error diagnostics now log fixed error codes, not provider error objects. Shared AI backend diagnostics no longer log prompt/speech excerpts, raw prompt feedback or raw provider error messages in the reviewed logging calls.
- Older Gemini AIProvider text, image-edit, vision, audio, speech and model-discovery requests now carry credentials in x-goog-api-key headers instead of URLs. Shared Gemini wrappers already used headers.
- Historical logs, copied exports, saved History contents and provider retention are unchanged. Other app features and integrations need their own data-flow reviews; this report does not claim app-wide absence of PII.

## Validation
177 distinct tests passed across the final 176-case regression run and the added redirect case. The last transport rerun passed 43 cases; the final UI rerun passed 34 (these overlap the 177 and are not added again). Coverage includes default context isolation, explicit one-reply bounds/reset, no context persistence, public topic construction, endpoint/credential rejection, malformed policy, Canvas opt-in, external-search blocking, media fallback blocking, credential headers, Gemini retries, citations, Worker transport/cache/budgets, settings and accessibility.

Chromium at 1280px and 320px passed keyboard disclosure, context preview, one-reply reset, public-query drafting, no context in localStorage, clearing live chat while preserving saved copies, no horizontal overflow, zero checked axe violations and no page errors. Component harness uses synthetic data and intercepted network; no live provider was called. The mobile screenshot was inspected and scrolling adjusted so the disclosure heading remains visible.

The two previously failing source-analysis citation fixtures now pass unchanged. The content-engine source pair now matches without intervention by this task. Five generated/public module mirrors match; managed/public policy parity, the 20-call search gate, source-pair gate and scoped whitespace checks pass.

Nothing was deployed, and no Desktop installer was rebuilt. User-supplied district approval/configuration remains necessary before activating the managed policy.

## Maintenance
- Edit managed_ai_policy.js, then run node dev-tools/sync_managed_ai_policy.cjs and rebuild gemini_api_module.js; sync the AI backend public mirror.
- Edit the canonical public catalog at desktop/web-app/functions/public_search_policy.js, then run node dev-tools/sync_public_search_policy.cjs. It updates the standalone Cloudflare Worker and AI backend copies.
- Build chat/modal changes with _build_udl_chat_module.js, _build_view_misc_modals_module.js and _build_first_wave_view_modules.js ColdPathSurfaces.
- The existing deployment query gate checks both policy copies. Do not bypass it or add unreviewed free-text acceptance to restore research scope.
