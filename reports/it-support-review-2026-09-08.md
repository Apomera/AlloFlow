# IT support / AlloBot Screen Coach review

Reviewed the current local implementation on September 7–8, 2026. This is an assessment, not an implementation change.

The tool has a useful foundation: advisory screen guidance, learner/educator postures, text and voice chat, a floating mirror, desktop overlays, explicit screenshot consent, local walkthrough export, and cancellation of outdated requests after a share or goal changes. The biggest opportunity is making its guidance depend on the actual current situation and making its capabilities clearer to a first-time user.

## Evidence and limits

- Reviewed `it_coach/it_coach.html`, the shared sanitizer and bridge handlers in `video_studio_module.js`, relevant backend code in `ai_backend_module.js`, entry-point tests, and existing smoke-review notes.
- Ran `node node_modules/vitest/vitest.mjs run tests/it_coach.test.js tests/it_coach_runtime.test.js --maxWorkers=1`: **83 tests passed in 2 files**.
- SHA-256 hashes match for the main coach HTML and `desktop/web-app/public/it_coach/it_coach.html`.
- Loaded the actual local page in Chromium, inspected its accessibility tree, and reproduced the first-use checkbox error below. Initial file navigation timed out, but the page subsequently loaded and supported inspection and interaction.
- No real screenshots were sent to an AI provider. Model accuracy, real speech recognition, native desktop overlays, and a complete screen-sharing session were not evaluated live. Passing mocked runtime tests does not establish advice or highlight accuracy.
- Older August scope notes describe several gaps that the current implementation has already addressed. Findings below are based on current code.

## Highest-priority fixes

### 1. Tie highlights and saved images to the screenshot actually analyzed

**Source-confirmed weakness.** `requestStillCurrent()` checks request identity, context epoch, stream identity, and cancellation, but does not detect changes within the same shared screen (`it_coach.html:680`). The reply is drawn over the live preview. `makeAnnotatedSnapshot()` captures the live video again after inference rather than annotating the frame sent to the model (`:887`, `:1450`).

**Consequence:** a user can open another menu while the model is thinking; an otherwise correct response then highlights the wrong location. The exported image can show a screen the model never analyzed.

**Enhancement:** attach an immutable frame and timestamp to each request. Annotate that frame for saved steps. Check for meaningful screen changes before applying a live highlight; suppress stale boxes and offer refresh. Show when the analyzed image was captured. Keep current screenshot retention temporary unless the user explicitly opts in to export.

**Acceptance:** change the screen during a delayed response; no outdated target should be presented as current, and an exported step must use the analyzed frame.

### 2. Fix the first-use sequence and validate readiness

**Browser-reproduced defect.** On a fresh page, pressing “Suggest next step” produces “Tick the check first…” while the consent checkbox is disabled and cannot be focused. The code checks consent before active capture (`:1307`), while consent remains disabled until sharing starts (`:113`, `:735`). The backend panel is also collapsed with default Ollama settings, without establishing that a model is available.

**Enhancement:** guide users through “Connect AI → Share a screen → Review privacy → Ask for help,” with a separate, clearly available text-only path. Check active sharing before consent and focus Start watching when that is the missing step. Add Test connection, model discovery/vision capability checks, and specific remedies for unavailable models, permissions, or connection failures. Show unsupported microphone/PiP features as unavailable before users attempt them.

**Acceptance:** every unavailable action identifies a prerequisite the user can actually complete; a fresh user reaches a successful first request without understanding backend terminology.

### 3. Make chat aware of the task and apply consistent learner handling

**Source-confirmed gaps.** Chat sends the typed question and prior chat, but neither the active goal nor the last screen-coaching advice (`:598`, `:1252`). “I cannot find that button” consequently lacks the referent. Chat output is displayed as raw cleaned text (`:1287`); the screenshot path additionally applies a structured learner/content sanitizer (`:1410`, `video_studio_module.js:2905`). The bridge chat handler also returns raw text (`video_studio_module.js:4076`). This is a guardrail inconsistency, not proof that a particular model will violate the learner rule.

**Enhancement:** include the active goal and last step as explicitly labeled text context, distinguish historical observation from current screen knowledge, and offer an explicit “Check my screen now” action when visual context is needed. Apply a shared learner policy and evaluated refusal logic to both chat and visual guidance. Reset or explicitly separate chat context when the task, backend, or role changes, including pending responses.

**Acceptance:** follow-up questions reference the last step correctly without silently sending a new screenshot; learner-mode checks cover both channels and role changes during requests.

### 4. Report actual search capability and evidence

**Source-confirmed gap.** The web-search checkbox is checked by default (`:163`), and selecting it produces “Searching and asking the coach…” (`:1268`). Despite an outdated Gemini-only API comment, non-Gemini backends do implement search through `_webSearchAugment()` (`ai_backend_module.js:1707`, `:2032`). The shared search service intentionally absorbs transport failures. The coach does not distinguish a search failure followed by model-only output from successful search with no displayed sources: it simply reports “Answered.” The bridge's `searched` field reflects the requested setting rather than verified tool execution (`video_studio_module.js:4123`).

**Enhancement:** expose effective search readiness and return factual search states such as unavailable, attempted, succeeded, or failed. Prefer official software documentation and show product/version relevance plus source links. If search was unavailable, say that the response used model knowledge. Disclose that enabling web search can contact remote search services even with a local inference backend.

**Acceptance:** simulate search transport failure and verify a visible model-knowledge fallback notice; source labels and completion metadata must reflect evidence actually returned.

### 5. Make privacy disclosures describe the full route

**Source-confirmed overstatement.** Any loopback URL receives “screenshots stay on this device” (`:469`, `:497`). That establishes only the first destination. A localhost service may forward requests. Ollama explicitly supports cloud models through its local API: [Ollama cloud documentation](https://docs.ollama.com/cloud). In bridged mode the displayed destination is the opener's origin, rather than the downstream inference provider (`:509`).

**Enhancement:** say “Sent to a service on this device; processing location depends on its configuration” unless local-only processing is verified. Have the bridge disclose its effective provider/model and routing changes. Explain microphone routing separately: browser speech recognition can use a remote service even when the AI endpoint is local, as documented by [MDN SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition).

Add optional crop/redaction before screenshot submission. This would make the tool more usable on real support screens containing account names or unrelated private information.

**Acceptance:** localhost, remote, and app-bridged configurations disclose what is known and unknown about processing; changing destination invalidates prior consent where appropriate.

## Further improvements

### 6. Separate stopping capture from losing the useful result

`stopWatch()` invokes `resetCoachContext()`, clearing all walkthrough steps and disabling export (`:691`, `:747`). Goal edits also clear the record (`:1526`). The retained-image checkbox mentions session-end clearing, but the loss also affects text steps.

Offer an end-of-session summary with text-only steps still available in memory, explicit discard, and export. Clear images by default when sharing ends unless the user has explicitly chosen temporary retention. Keep completed-session material separate from any new request context. Export should include the original goal, attempted steps, outcomes, and optional reviewed images.

### 7. Verify progress instead of equating screen movement with success

Guided mode compares a sparse grayscale screen signature and triggers after three changed samples (`:988`). Small important changes may not cross its threshold; a sustained animation or unrelated panel can cross it. The existing test uses an extreme whole-signature change, not a realistic small menu (`tests/it_coach_runtime.test.js:737`).

Add “Done,” “Still stuck,” “That control is missing,” and “Wrong highlight.” Give each suggested step an expected observable result and recovery alternative. Require a goal or ask a clarifying question instead of defaulting to whatever seems useful. Add target-region change detection and a manual fallback, and evaluate realistic menus, spinners, notifications, zoom levels, and scrolling.

### 8. Prevent hands-free chat from hearing its own reply

The reply path schedules microphone resumption after eight seconds, independently of speech completion (`:1290`). Text replies may be up to 5,000 characters, while `speak()` truncates them to 500 characters (`:970`), still enough to exceed eight seconds. This can resume listening while the coach is still speaking; actual echo behavior depends on browser/audio conditions and was not live-tested. The silent truncation also means spoken and visible answers can differ.

Resume on speech completion or error, with a watchdog that checks speaking state rather than unconditionally restarting. Add a visible Stop speaking control and push-to-talk. Consolidate the two microphone-control surfaces. Test long answers, permission failures, interruptions, and recognition restarts.

### 9. Add support-specific intake and escalation

The current prompt requests a next software action, but has no structured diagnosis workflow. Add a short optional intake for application/version, device/browser, exact error, expected versus actual behavior, and what has already been tried. Ask only questions relevant to the issue.

Offer curated paths for common support needs such as login trouble, audio/camera setup, uploading files, printing, and access permissions. Explain when administrator help is required. Provide a copyable support-ticket summary with attempted steps and user-confirmed results; sending it should remain a separate user action. Prioritize reversible checks and explain the consequence before suggesting data deletion or permission changes.

### 10. Measure quality and simplify the interface

The current tests establish many useful lifecycle contracts, but do not establish real model quality. Build a consented/synthetic benchmark covering common applications, confusing interfaces, small controls, different display scales, learner-content boundaries, and ambiguous goals. Score advice correctness, target accuracy, appropriate uncertainty, task completion, latency, and repeated unhelpful steps separately. Record model/version with results; do not display a numerical confidence score unless it is calibrated against evidence.

Use the live review to decide whether boxes deserve prominence. For usability, emphasize a single current-step card, collapse previous steps and advanced controls, expose persistent visible labels, localize the currently English page and voice interactions, and test narrow screens, zoom, keyboard use, and screen-reader announcements. The existing native controls and live-region work are useful foundations, not a substitute for that broader evaluation.

## Suggested implementation order

1. Fix screenshot/annotation consistency, the first-use error, search disclosure, and privacy wording.
2. Unify task context and learner handling across chat and screen advice; fix speech resumption and finish/export behavior.
3. Add outcome feedback, setup diagnostics, and support-ticket summaries.
4. Run real task benchmarks and usability sessions before making stronger accuracy claims or expanding automatic guidance.

