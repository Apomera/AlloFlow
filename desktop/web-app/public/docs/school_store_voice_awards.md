# Voice awards and AlloFlow pathways

September 9, 2026: dedicated on-device dictation is implemented in the actual School Store, not a separate demo. It is an optional input method for the existing reviewed recognition workflow, not a new ledger, authentication mechanism or automatic award system. Live microphone behavior and Google-hosted compatibility are not yet verified.

## Where it belongs

| Pathway | Role in voice awards | Authority and storage |
| --- | --- | --- |
| AlloFlow in Gemini Canvas, hosted app or desktop | Open the approved Store from the School Rewards panel or Allobot's local recognition notice. No transcript is passed in the link. | The launcher is not the official points ledger. Do not use ordinary Allobot dictation for student awards: its engine preferences can allow remote transcription. |
| Google Classroom helper | Import a new codename-only lesson roster; export established AlloFlow identities for separately reviewed Store linking. | Classroom OAuth grants roster reading, not Store staff authority. Fresh imports are not repeat synchronization. |
| Managed School Store | Authorized staff select a reviewed class and recognition category, dictate a draft, review the canonical student and explicitly confirm the award. | Existing managed Google identity, server roles, protected school repository and ledger. Voice adds no OAuth scope or new write endpoint. |
| School Store practice | Fictional browser ledger and simulated roles, never real points. | Shared UI alone does not enable voice: the shipped practice bootstrap does not advertise reviewed-class-link capability. Automated voice checks use separate fictional fixtures with that capability. |
| Educator Growth & Evaluation | Separate personnel product; no award transcript or Store role is shared with it. | Its real local workspace, fictional rehearsal and district personnel portal have different storage/identity rules. These are not extra School Store pathways. |

A school-approved managed educator may own a Store deployment, but that is still the managed repository pathway, not a private/local trial ledger. A common Google account or Apps Script deployment pattern does not combine Classroom, Store and personnel permissions.

## Staff interaction

1. Open recognition in the signed-in Store. Load reviewed class links; choose one class and an active category.
2. Leave the request empty and choose the speech language: English (United States) or Spanish (Spain). Existing typed text is never overwritten by starting dictation.
3. Press **Start on-device dictation**. Availability is checked only then; no microphone is started on page load. Capture is one attempt, limited to 15 seconds including the readiness check, with no background/wake-word loop or automatic restart.
4. Say a request such as `give Calm Otter 5 points for helping`. The single final transcript fills the editable request only. Check the text and correct misheard codenames or number words before proceeding. Supported command grammar still requires a whole-number amount and one recognition.
5. Select **Review typed recognition**, inspect the canonical student and details, use the student in the award form, and confirm the existing award action separately. Voice input itself performs no parsing, learner lookup, form prefill or award RPC.

Cancel discards unfinished capture. Changing class, category, language, text or account; leaving the award tab; closing the lookup panel; hiding/blurring the page; or navigation stops and invalidates it. A stale callback cannot replace current text or a pending award's exact retry request.

## Browser and privacy gate

The new controller requires a secure page, native unprefixed `SpeechRecognition`, a pre-existing `processLocally` property that is set and verified true, and `available({ langs: [language], processLocally: true })` reporting an installed local language pack. Missing support, denied policy, unavailable language or microphone failure leaves typing available. No cloud/Web Speech fallback, model download, audio upload, credential collection, analytics or transcript storage is added. Pack installation is not automatic.

Browser microphone permission is separate from Google OAuth and Store authorization. On-device speech remains experimental and permission-policy controlled. Google's Apps Script HTML service uses an iframe; its documentation does not guarantee delegation of the newer speech policy. Therefore this feature may be unavailable in a particular browser or district deployment even when ordinary microphone input works. Opening the approved Store separately can avoid an extra Canvas frame, but does not remove Google's own HTML-service frame or guarantee support.

Primary references: [on-device requirement](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/processLocally), [local availability and installed language packs](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/available_static), [speech API specification](https://webaudio.github.io/web-speech-api/), and [Google HTML-service restrictions](https://developers.google.com/apps-script/guides/html/restrictions).

The transcript is temporary input. The separately confirmed recognition, including its explanation, becomes an official ledger record under existing rules. Use the class codename and avoid unnecessary sensitive detail. This does not establish a general privacy guarantee for the ordinary Allobot microphone, other dictation tools, browser extensions or operating-system services.

## Verification and rollout

Final scoped regression: 1,004 tests passed in 28 files, plus 139/139 in the separate large Portal suite (1,143 total). This includes 96 capture-controller and 36 voice-Portal cases. Independent review found no new security issues and reran those 132 dedicated cases successfully. Twelve browser checks passed: English/Spanish voice-fixture review and compiled Allobot guard at desktop/phone sizes, plus existing Classroom helper, Store and practice surfaces at both sizes. All voice results were injected, not recorded. Spanish catalogue coverage is 1,124/1,124 entries; school-entered labels are not translated automatically. Application source/desktop JSX smoke checks passed.

Evidence: `regression-tests.json`, `portal-regression-tests.json`, `browser-checks.json` and screenshots under `reports/school-store-voice-recognition-2026-09-09/`; existing-surface checks are under `reports/classroom-store-product-2026-09-08/`. The previous milestone's two known avatar-test failures were outside this scoped run and are not claimed fixed.

Tests use injected speech results and fictional services, not a real microphone, school account or student. Production browser support, recognition accuracy, installed packs, microphone access, Apps Script permissions, concurrent school use and district approval require a separate approved walkthrough. No deployment or live connection was made.

Rebuild the capture embedding and product assets with `node _build_school_rewards_i18n.js`, `node dev-tools/rebuild_school_rewards_practice.cjs`, `node _build_school_rewards_module.js`, `node _build_udl_chat_module.js` and `node _build_allo_commands_module.js`. The shared capture file is embedded into the Store package; it is not fetched from a voice service at runtime.

Reproduce simulated browser checks with `node dev-tools/check_school_store_typed_recognition.mjs --voice`. Run `tests/school_store_voice_capture.test.js`, `tests/school_rewards_voice_capture_portal.test.js` and the existing Store/Allobot boundary suites with Vitest. Evidence is saved under `reports/school-store-voice-recognition-2026-09-09/`.

Next gate: verify microphone and installed local-language support in the exact school-approved browser/Store deployment with fictional names. If that environment blocks local speech, keep typed recognition and separately review an alternative architecture; do not relax privacy checks or invent a cross-origin award proxy to make the demo appear functional.
