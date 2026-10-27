# Protected clinical access while locking

October 26, 2026. Continued local cybersecurity work for Gemini Canvas / Portland Public Schools, Maine K–12. This pass covers the protected clinical workspace's final-save and lock transition. Read-only coordination confirmed that the other security chats retain CI/release and private-runtime loader work. No real student records or production providers were accessed.

## Reproduced finding

A cached clinical storage handle remained usable while the service was locking. This exception originally let the mounted editor save its final draft. It also let an ordinary holder of that handle read, enumerate, change or clear records during a slow registered save, even after learner context or Canvas record permission had changed. The editor remained visible during that interval; making it inert prevented interaction but did not conceal its contents.

Synthetic tests reproduced the service-level gap for both context changes. A native Edge fixture with actual IndexedDB, WebCrypto and React also reproduced the usable handles and visible editor. This is an application access-control transition issue, not evidence that the encryption was broken or a district account was compromised. The host already waits for locking before completing its normal teacher-to-student switch; the service must also protect cached handles when context or policy changes independently.

## Changes

During locking, only a registered final-save callback for the matching feature and current session generation can use its storage handle synchronously. Ordinary callers, callbacks for another feature, and continuations after an asynchronous wait cannot use that exception. Registration metadata is private to the service. Both session and storage flush entry points enforce the same access check.

Notifications caused by final-save writes are deferred until that temporary permission has ended, so a reentrant subscriber cannot inherit it. Permission is removed in a `finally` block before awaiting the callback, including when the callback throws. BehaviorLens, Dynamic Assessment and Report Writer currently stage their final writes before their first asynchronous wait; those production save paths were reviewed and remain supported.

The editor stays mounted long enough to save its latest draft but is hidden, removed from assistive navigation and made inert during locking. Focus moves to the saving status when needed. A completed lock clears the service's decrypted maps; a failed save preserves staged work for an authorized retry. Hidden content still exists in DOM/memory while saving. This is not isolation from arbitrary script running on the same origin, server-side staff authentication or an immediate memory-erasure guarantee.

## Validation and delivery

The combined run passed **144 tests**, including **129 clinical tests across 12 fully passing files** and 15 host integration checks. **Six host delivery checks failed** at the pre-existing canonical embedded-policy mismatch in the three host copies. These failures remain with the release workstream; they were not skipped, weakened or represented as a passing suite. Separate scoped validation confirms that the actual embedded policy accepts the updated clinical module.

The new seven-test lock suite passed; its baseline had six failures and one passing case. Coverage includes ordinary and cross-feature handle denial, asynchronous continuation, reentrant subscribers, thrown callbacks, successful final save and authorized recovery from save failure. **14 native Edge checks passed**, including record preservation after unlock and actual React concealment, accessibility-tree exclusion and focus behavior. Independent source review found no blocking defect in this bounded correction.

The [validation record](clinical-lock-validation.json) includes source hashes, baseline failures, browser checks and scoped delivery receipts. Native checks use synthetic values, locally fulfilled pages and blocked external page requests. Only fixtures use the minimum supported PBKDF2 work factor; production cryptographic defaults are unchanged. The screenshot confirms that the final-save status is visible without the synthetic editor contents.

Only the protected-workspace module and its public mirror changed in production code. Its approved size/hash and loader cache string were updated in three host copies, with full-host parsing and checks that every other asset approval and the embedded policy source were preserved. The pre-existing canonical-policy discrepancy remains owned by the release workstream. There was no broad regeneration, build, commit, push or deployment in this pass.

## Remaining work

At this lock-fix checkpoint, the separate [clinical AI dispatch finding](clinical-ai-dispatch-finding.md) remained open. The subsequent [request-boundary follow-up](clinical-ai-dispatch-followup.md) corrects it in local source and records separate validation. Clinical external AI remains disabled by default; enabling it still requires district approval, release verification and deployment checks.

The changed source requires a verified release and actual district-managed Canvas testing before classroom reliance. PPS authorization, provider terms, staff identity, incident handling, retention decisions and independently retained copies remain separate requirements. This pass does not certify school-district compliance.
