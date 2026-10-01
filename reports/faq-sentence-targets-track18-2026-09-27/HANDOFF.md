# Track 18 — FAQ sentence targeting and readable audio controls

The isolated candidate now targets each FAQ question/answer sentence explicitly. Repeated spoken text no longer causes a regenerate action to select the first matching sentence. Inspection, regeneration, whole-FAQ preparation and device-save checks use the same descriptors and requested synthesis settings.

This work changed only isolated candidate/report files. Shared source, tests, host, catalogs, generated app files, Git and application saved state were not modified. No other chat was contacted. Nothing was integrated, pushed or deployed.

## Baseline and prerequisite

- Start HEAD: `286e09850680047d44efcc836075916cf488eff6`.
- Packaging HEAD: `c4c8d6f8bffc88e5e1549b2f84448f15184b2fe8`. The host changed while this investigation ran. The shared FAQ source, resource read-aloud module, audio service, audio store and Phase K module retained their start hashes; see [manifest](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/faq-sentence-targets-track18-2026-09-27/manifest.json).
- Shared FAQ source SHA256 remained `5bfc4cf001fb4cce287ac40e5525a9ba940519a3b48212a2494aa7e473f01db5`.
- No applicable AGENTS.md was found in the inspected ancestry or target directories. The local checkout was not equated with the deployed release.
- **Prerequisite:** the [previous FAQ/overlay device-save candidate](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/reader-device-save-track18-2026-09-27/HANDOFF.md). Its FAQ and ResourceReadAloud source changes were applied only to the isolated basis after confirming their raw bases still matched current source. Its overlay module was reused only for composition tests.
- [after-device-save.patch](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/faq-sentence-targets-track18-2026-09-27/after-device-save.patch) is incremental **after that prerequisite**. It changes one application source file, three existing/prerequisite test files, one new test file and one browser fixture. It does not include or replace the prior overlay/reader integration.
- The package contains frozen `raw-basis/`, prerequisite `basis/`, final `candidate/`, source excerpts and validation artifacts. All six patch round trips were checked in memory. Generated FAQ root/desktop modules have matching hashes.

## Ranked evidence and minimal candidate changes

| Priority | Evidence/classification | Change |
| --- | --- | --- |
| P1 | **Source gap, reproduced with the real service/store in an isolated DOM fixture.** Regeneration sends only cleaned text at [raw FAQ:204](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/faq-sentence-targets-track18-2026-09-27/raw-basis/view_faq_source.jsx:204). In a resource with three occurrences of “Echo.”, activating the second FAQ's question regenerates the first matching canonical sentence. | Build canonical `faq/{item}/{question-or-answer}/{sentence}` descriptors and resource-wide normalized occurrence counts. Pass the descriptor, occurrence, current profile and abort signal to the shared bridge. [Candidate:142](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/faq-sentence-targets-track18-2026-09-27/candidate/view_faq_source.jsx:142), [candidate:216](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/faq-sentence-targets-track18-2026-09-27/candidate/view_faq_source.jsx:216). |
| P1 | **Source gap, reproduced in fixtures.** Edit badges use raw text presence and only voice/language compatibility at [raw FAQ:123](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/faq-sentence-targets-track18-2026-09-27/raw-basis/view_faq_source.jsx:123); they do not identify the exact occurrence or request synthesis speed. | Inspect through the shared service. Require a matching resource, canonical sentence location and spoken text. Show ready, changed settings, missing, needs repair or explicitly unverified; do not infer ready from legacy presence. [Candidate:166](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/faq-sentence-targets-track18-2026-09-27/candidate/view_faq_source.jsx:166). |
| P1 | **Source gap, reproduced in fixtures.** Sentence generation has no owned AbortController at [raw FAQ:199](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/faq-sentence-targets-track18-2026-09-27/raw-basis/view_faq_source.jsx:199). The prerequisite already invalidates speed changes for preparation, but leaving edit mode does not cancel sentence generation. | Scope to resource/text/profile/provider revision and editing permission. Abort on context change, leaving edit/teacher mode or unmount; ignore late results. Synchronous ownership guards prevent duplicate activation. [Candidate:80](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/faq-sentence-targets-track18-2026-09-27/candidate/view_faq_source.jsx:80), [candidate:104](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/faq-sentence-targets-track18-2026-09-27/candidate/view_faq_source.jsx:104). |
| P2 | **Source gap; DOM names reproduced; browser keyboard verification performed.** Every field restarts labels at “FAQ sentence 1,” and regeneration buttons become natively disabled while pending at [raw FAQ:228](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/faq-sentence-targets-track18-2026-09-27/raw-basis/view_faq_source.jsx:228). | Name FAQ number, question/answer and sentence number. Keep controls mounted/focusable, with guarded `aria-disabled` and `aria-busy`. Explicitly name replacement of a human recording. Provide visible help if identity-aware generation tools are unavailable. [Candidate:242](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/faq-sentence-targets-track18-2026-09-27/candidate/view_faq_source.jsx:242). |
| P2 verification | **Visual fixture failure, not a claim of a reproduced native-browser zoom failure.** Initial doubled-font captures showed support paragraphs and answer audio summaries inheriting fixed line heights and overlapping. Horizontal-fit checks alone missed this. | Add FAQ-scoped unitless line height for paragraphs, buttons, textareas and audio groups. Extend the browser check to their line-height/font-size relationship and visually inspect the resulting capture. [Candidate:269](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/faq-sentence-targets-track18-2026-09-27/candidate/view_faq_source.jsx:269). |

The host already supplies the required sentence locators and identity-aware APIs; no host or service changes were necessary. Frozen contract evidence is in [host excerpts](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/faq-sentence-targets-track18-2026-09-27/evidence/AlloFlowANTI.txt.txt), including `AlloFlowANTI.txt:32537`, `:32638`, `:32797`, and [service excerpts](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/faq-sentence-targets-track18-2026-09-27/evidence/read_aloud_audio_service_source.jsx.txt), including `read_aloud_audio_service_source.jsx:1063`, `:1269`, `:1286`.

## Safeguards and nonfindings

- The candidate uses the host's preferred splitter and the canonical spoken-text sanitizer. Formatting-equivalent text shares the occurrence counter while each question/answer location stays distinct. Non-spoken pieces retain their raw split positions; table fields excluded by the host do not acquire mismatched sentence controls.
- The real bridge already supports descriptor-first inspection/regeneration and profile overrides. It can distinguish edited text, changed synthesis settings, corrupt clips and human recordings. That behavior remains centralized.
- Voice, language, speed, synthesis rate and resolver version are passed consistently. Provider/model revision changes invalidate pending UI requests; the host still supplies the provider-specific profile fields.
- Human recordings remain ready through synthesis-setting changes when the service considers them compatible. Automatic preparation protections remain in the shared service. Explicit regeneration is labeled as replacement when the inspected source is human.
- Preparation/URL success remains distinct from verified device persistence. The prior device-save status and retry behavior are preserved and covered by composition tests.
- Existing FAQ disclosure and sentence playback controls remain. Read-only rendering and `handleSpeak` indices were not rewritten. This change covers primary question/answer audio, not a new translation-audio lane.
- New sentence controls retain their existing 44px minimum targets. This is not a finding that every smaller inline target is a WCAG violation.

## Validation performed

**91 tests passed across six suites**, including 33 new FAQ targeting/ownership cases. The final additional CSS selector for nested audio groups was then checked by the five source accessibility/build-parity cases and the complete browser fixture. No previous task's test totals are added to these counts.

The real-service tests use the actual compiled FAQ, actual audio store, actual read-aloud service and sanitizer. They extract the FAQ enumerator from the frozen host source instead of inventing a separate canonical mapping. Synthesis returns fixture WAV bytes and persistence is mocked; no provider or saved app data is used.

Meaningful checks include byte-for-byte preservation of untargeted duplicate clips, correct replacement of the chosen occurrence, serialization/rehydration without duplicate collapse, whole-resource descriptor/profile agreement, stale text/profile detection, human-recording behavior, real-store quarantine/removal notifications, rejected or foreign inspector results, late completion after nine context/permission changes, and stable focus through success/failure.

On the prerequisite-only basis, **31 of the first 32 new acceptance cases failed**. These are acceptance-case counts, not 31 distinct defects. Some assertions verify newly required metadata or UI states. The direct duplicate-regeneration test demonstrates the wrong canonical target before the change. The final “generation API unavailable” case was added afterward and is not included in that baseline count. An initial test incorrectly assumed how the canonical splitter divided marked-up text; its fixture was corrected to use actual split boundaries.

**Seven Chromium scenarios passed with zero page errors:** 1280px editor layout; 320px normal layout; 320px with line-height 1.5, paragraph spacing 2em, letter spacing .12em and word spacing .16em; 320px with doubled computed fonts; touch-emulated regeneration after a speed change; failed generation/retry; and leaving edit mode during generation. Checks cover horizontal fit, proportional line boxes, uniquely named controls, exact stored sentence identity, native keyboard activation, duplicate-action prevention, visible focus, next-field access and Done editing. Final narrow/doubled-font screenshots were visually inspected.

- [Combined test result](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/faq-sentence-targets-track18-2026-09-27/validation/faq-targets-assembled.json)
- [Final style/build parity result](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/faq-sentence-targets-track18-2026-09-27/validation/faq-final-style.json)
- [Browser results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/faq-sentence-targets-track18-2026-09-27/validation/faq-targets-browser.json)
- [Doubled-font editor capture](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/faq-sentence-targets-track18-2026-09-27/validation/faq-editor-200-text.png)

The existing Babel FAQ builder ran only inside the isolated directory, using installed dependencies. No install, app server, microphone, provider request, real device-storage write or deployment was used.

These results do **not** prove NVDA/VoiceOver behavior, real touch hardware, native 200% text resizing or 400% browser zoom, forced colors, all themes, sticky playback-toolbar behavior, the assembled nested-overlay shell, actual offline persistence or every karaoke resource type.

## Focused acceptance and remaining manual cases

| Task | Expected targeting, focus, announcement and visibility |
| --- | --- |
| Enter FAQ editing and find repeated text in different questions/answers | Each control identifies FAQ number, field and sentence. Every original editable field and Save/Done action remains reachable. |
| Regenerate the third occurrence of identical spoken text | Only its canonical clip changes. Same-text peers keep their exact bytes. Focus stays on the activated button; busy state is exposed; completion gives the preparation notice without claiming durable storage. |
| Activate again while pending | No duplicate synthesis. Other sentence actions expose temporary unavailability and cannot bypass the request guard. |
| Change voice, language or speed | Badges refresh against the requested profile. Regeneration carries those exact settings. Compatible human recordings remain protected by service rules unless the explicitly named replacement action is activated. |
| Edit text, change resource/provider, leave editing/teacher mode or unmount while pending | Owned requests are aborted. Late completion cannot write the pending fixture bytes, replace a new request's state or announce stale success. Done editing keeps focus on its existing control. |
| Temporarily remove shared inspector or generation API | Readiness is unverified or the action is unavailable with visible help. No text-only generation fallback is invoked. Matching module/store updates restore accurate controls without moving focus. |
| Quarantine, remove or rehydrate a stored clip | Its row reflects corrupt, missing or restored readiness. A raw text match cannot certify the wrong occurrence. |
| 320px, spacing overrides, larger text | No horizontal overflow, overlapped helper text or unreachable actions. Long pages may scroll vertically. Actual browser zoom/text-resize and active sticky playback controls still require the assembled manual check. |
| Screen reader and hardware mobile | Verify names and group context, busy/disabled announcements, completion/error feedback, touch exploration and editing navigation using actual AT/devices. DOM assertions are not proof of spoken output. |
| Real storage restart and offline replay | After integration, use disposable resources to save, fully close/reopen and play offline; verify selected replacement bytes and accurate device counts through failures/eviction. Serialization tests here do not establish IndexedDB durability. |

## Ownership and integration handoff

1. **Reader/FAQ owner:** assemble the previous device-save candidate on the current checkout, preserving concurrent reader changes. Apply this incremental FAQ/test patch to that basis; do not copy a stale full reader or host snapshot.
2. **02/15 service/persistence owners:** retain the descriptor-first APIs and canonical FAQ locators shown in the evidence. No changes to their source or audio schema are proposed by this step.
3. **Build/release owner:** regenerate `view_faq_module.js` and its desktop mirror from the integrated source, then update normal loader/integrity metadata as required by the assembled release. The prior package owns its separate ResourceReadAloud and overlay build changes.
4. **Catalog owner:** add localized values for the new `faq.audio_*` labels. Safe English fallbacks are supplied; existing translated false-success labels are not reused. No shared catalog was edited.
5. **Track 18 and reader owner:** rerun the delivered six suites and browser fixture after integration; complete actual AT/mobile/zoom/storage checks with assembled 04/09/10 before final accessibility signoff.

The raw FAQ source and core audio dependencies still matched their captured hashes at packaging despite HEAD advancing. Recheck the current baseline at integration; this report does not certify later host edits.

After this candidate, the next priorities remain real restart/offline verification and consistent save eligibility/status across glossary, studio/script/story routes. Those resources and the deployed release have not been declared universally reliable by this work.
