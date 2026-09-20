# Allobot public evidence and optional Serper key

Implemented locally on September 19, 2026. No deployment, live provider request, or real credential test. The scoped commit could not be saved because another Git operation holds .git/index.lock; that lock was left untouched and the changes remain in the workspace.

## Behavior

- Allobot selectively retrieves public evidence for UDL, recognized Common Core/NGSS standard codes, and explicit research/fact-check requests. Ordinary coaching and source summarization remain ungrounded.
- UDL lookups use fixed CAST queries (3.0 by default, 2.2 when requested). Standards queries contain recognized codes, not surrounding classroom details. Unsupported/ambiguous standards requests ask for a code; this does not replace the app's broader standards finder.
- Gemini API lookup receives a separate public lookup prompt. The contextual response is a subsequent ungrounded call through the user's existing AI backend. Canvas and explicitly enabled non-Gemini backends use the existing WebSearchProvider; a personal Serper key opts Allobot into that provider.
- The new search step never intentionally includes source/lesson text, roster, conversation history, or group context. Explicit free-text research questions pass a conservative local check for obvious identifiers/personal records; vague document references ask for a standalone public claim. These checks are not anonymization or a guarantee that all PII is detected. They can also reject legitimate public queries, including some person-name searches.
- Web lookup defaults off for non-Gemini backends unless explicitly enabled. It can be turned off for any backend in AI backend settings. This setting controls Allobot's new lookup, not all existing app search features.
- Replies contain provider-supplied clickable source links, source hostnames, lookup date/query/provider, and expandable snippets when available. Google search suggestions are shown in a sandboxed iframe. Google redirect links remain usable; their destination publisher is not inferred from the redirect hostname.
- Search snippets are explicitly labeled as excerpts, not full-page evidence. Google's research summary is labeled as AI-generated, not an original passage. No full-page source reader was added. Citation presence is not a guarantee of factual support.
- Prompt instructions separate source findings from lesson interpretation, and standard wording from alignment judgments. A UDL review is not a compliance certification. No-source, failure, disabled, and potentially personal query states are visible.
- Personal Serper keys are optional in Canvas settings and standalone AI backend Advanced settings. A saved key takes precedence over the shared proxy for Serper searches and Allobot lookups. Removing it restores the existing configured route; a failed personal key does not silently use the shared proxy. Personal keys are stored in origin-local browser storage and remain readable by app code. Shared/district secrets belong server-side.

## FERPA considerations

The account/key owner is not the deciding FERPA question. A shared developer key does not automatically create a violation, and a personal key does not establish compliance. Relevant questions include whether PII from education records is disclosed, the school's authority for that disclosure, institutional approval, provider control, authorized use/redisclosure, and retention.

Under the school-official exception, the US Department of Education describes conditions including direct school control over education records and limits on use and redisclosure. Schools should approve the application/provider arrangement; a bring-your-own-key field does not substitute for that review.

Serper's published privacy policy says its service normally should not process personal data and describes processor responsibilities when it does. The policy alone does not establish a school-specific FERPA arrangement or a precise API-query deletion commitment. Confirm terms, subprocessors, retention/deletion, and any needed agreements before allowing education records into that service.

Google's Gemini Developer API documentation says Google Search grounding stores prompts, context, and output for 30 days. That is an additional reason to keep the public lookup prompt separate. These API terms should not be generalized to every consumer Gemini/Canvas product.

The existing contextual AI call STILL receives the question, conversation excerpt, and lesson/group context. This work reduces the new search disclosure; it is not a global PII filter or a FERPA certification of AlloFlow. Other existing search/analysis paths were not comprehensively privacy-audited or changed here.

Sources reviewed September 19, 2026:
- https://studentprivacy.ed.gov/faq/who-school-official-under-ferpa
- https://studentprivacy.ed.gov/faq/i-want-use-online-tool-or-application-part-my-course-however-i-am-worried-it-violation-ferpa
- https://serper.dev/privacy
- https://ai.google.dev/gemini-api/docs/zdr
- https://ai.google.dev/gemini-api/docs/google-search

## Validation

- 84 targeted tests passed across evidence behavior, existing chat helpers/routing, blueprint review, search/citation contracts, settings rendering, and UDL dialog accessibility.
- Browser checks at 1280px and 320px: actual citation destination, keyboard excerpt disclosure, personal-key save/remove, lookup setting persistence, standalone Canvas settings, no horizontal overflow/page errors, and zero checked axe violations. Browser fixtures use the actual built components, synthetic evidence, and focused utility CSS, not the full deployed application. Phone source-card screenshot inspected.
- Search-query gate checks all 20 grounded call sites, including the new helper. Root/public module mirrors checked byte-for-byte; source builders run successfully.
- A broader run initially had 5 failures: one stale public mirror (corrected) and four pre-existing host-source assertions. Three expect preview-render wiring inline in AlloFlowANTI.txt / its two generated copies; one expects recognition-launch code inline in AlloFlowANTI.txt. Current host code delegates these handlers. This task did not edit those files or change those tests.
- No production provider availability, account billing, retention configuration, or end-to-end deployed host was tested.

Rebuild:
```
node _build_udl_chat_module.js
node _build_view_misc_modals_module.js
node _build_first_wave_view_modules.js ColdPathSurfaces
```

The two view builders bundle allobot_search_settings.jsx so each host can mount settings without depending on another lazy view. The UDL builder bundles allobot_evidence.js.
