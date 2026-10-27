# Clinical AI permission at each transmission

October 26, 2026. Continued local cybersecurity improvements for Gemini Canvas / Portland Public Schools, Maine K–12. This pass corrects the [previously reproduced clinical AI dispatch finding](clinical-ai-dispatch-finding.md). Read-only coordination kept the other security chats' CI fixtures, release reconciliation and private-runtime loaders separate. No real records or production provider requests were used.

## Corrected boundary

Previously, Report Writer could approve a reviewed prompt, yield during provider credential checks, and send it after clinical external-AI permission was revoked. Checking permission before calling the provider did not cover the provider's later asynchronous work. The preserved baseline has one passing review-time control and one failing dispatch-time expectation.

Each protected session now creates a frozen request control bound to its private feature, generation and captured workspace epoch. The control rechecks current clinical AI permission and the feature's current operation. Report Writer, BehaviorLens and Dynamic Assessment preserve their existing editable prompt review and attach these controls to the provider request. Applicable case, provider, review-gate, consent-context and abort checks remain bound to that operation. Controls cannot authorize a different feature or revive a locked session. Existing controls are composed rather than overwritten; malformed controls, asynchronous callbacks and explicit denial fail closed.

Gemini and AIProvider capture the control function before asynchronous preparation. They compose it with the existing managed endpoint/key guard before every native transmission, including transport retries, model fallback, JSON repair and the cloud-to-local fallback. The three local host bridges forward it explicitly. Canvas and AIProvider web search carry the same request checks to their search transports and fallback paths. Permission denial is terminal and cannot select a different provider or turn into an unguarded retry. Each concurrent request owns its own control; there is no mutable global permission callback.

Results are also checked before acceptance, including direct image editing and partial vision responses. This can stop stale UI updates, but cannot retract information already sent before permission changed. Dynamic Assessment's blocked parent directive/image callbacks remain blocked; adding guarded option support does not enable those routes. Default clinical external AI and Canvas real-record access remain disabled pending district configuration and approval.

## Validation

**249 unique tests passed across 17 files**, with no failed or skipped assertions in the selected final results. **9 native Edge checks passed**, and all **18 scoped module/host integrity checks** passed. The exact source/public mirrors and the canonical Gemini single-module build were checked.

Two final fork-pool invocations encountered worker-startup timeouts rather than assertion failures. The affected files were rerun with one thread worker and passed. The evidence retains the unsuccessful runner reports and counts each test file only once, using its final successful result. This targeted validation does not claim that the separate repository-wide release checks pass.

The native Edge harness uses the actual Report Writer review, protected workspace, Gemini provider, UtilsPure retry transport and native WebCrypto. Browser fetches are intercepted and fulfilled locally with synthetic responses; other external requests are blocked. It verifies zero native attempts for revocation during review or credential hashing, an allowed request/response, and rejection of a response after permission changes while the already-sent request is in flight. It does not exercise a district account or send a prompt to a provider.

Regression coverage includes request isolation, mutable option replacement, lock/epoch/case/provider changes, malformed and asynchronous controls, nested provider methods, Canvas search, retries, repair, media, local fallback and response-time revocation. The original reproduction is now a regular regression test. Independent review also caught and corrected a candidate search-state regression: temporary request scopes must retain the shared search cooldown and availability cache while keeping permission checks separate.

The [validation record](clinical-ai-dispatch-validation.json) identifies exact source hashes, results, browser evidence, mirrored bytes and scoped host updates. Existing baseline receipts are retained. Only synthetic encryption fixtures use the minimum supported PBKDF2 work factor; production encryption defaults are unchanged.

## Delivery and remaining requirements

The six changed runtime modules have matching public copies. Gemini was rebuilt only through its canonical single-module wrapper. The three host copies forward the request controls and receive only the changed modules' size/integrity approvals and content cache identities. Complete host parsing and actual embedded-policy checks validate those bounded changes. Broad manifest regeneration, canonical-policy reconciliation, packaging and release remain with the existing release workstream; its known host-policy discrepancy is not represented as resolved here.

This is a local application correction, not a deployment, district authentication mechanism or protection from arbitrary same-origin script execution. Older application copies and custom providers that ignore request controls are outside this verified release scope. A new verified release, actual managed Canvas workflow checks, approved provider terms and PPS authorization are still required before sensitive student-record use. Retention, independently retained provider copies and already transmitted content remain separate responsibilities.
