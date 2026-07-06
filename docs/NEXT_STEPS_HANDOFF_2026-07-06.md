# AlloFlow Handoff — Next Steps for Agents & Humans
**Written 2026-07-06 by Claude (Fable 5), end of session. Companion to `REFLECTIVE_JOURNAL.md` Entry 18 and the memory files under `~/.claude/projects/C--Users-cabba/memory/`.**

---

## Where things stand (one paragraph)

The desktop app (School Box pillar) reached **0.2.7** today: local text generation (llama.cpp engine, Gemma 4 verified), local reading voice (Kokoro q8, seven routing bugs fixed), local speech-to-text (whisper.cpp, proven word-perfect end-to-end), and local image generation (SD-Turbo, WebGPU-enabled with explicit provider choice) all run **keyless on the student's machine**, with a Setup Health card that tells the truth about each capability and routing breadcrumbs (`window.__ttsLastRoute`) for when it doesn't. The web app carries the same fixes as of deploy @b48f5aec1. AlloStudio shipped its agentic batch (teacher-only AI design assistant) and polish rounds — live but Canvas-smoke pending. The error reporter no longer replays stale history across upgrades.

---

## FOR AARON (human tasks, roughly in order)

### Test 0.2.7 (the "golden path" pass)
1. Install `desktop/dist/AlloFlow-Desktop-0.2.7-x64-setup.exe` over 0.2.6.
2. **Voice**: launch → "🎤 Local voice ready" toast → read leveled text → Kokoro voice. Then the specific regression you found: **AI Settings → Text-to-Speech → "Local TTS"** → read again → must STILL be Kokoro (the in-browser engine is now the first leg of that cascade).
3. **Health card**: all five tiles truthful; ASR tile "On — student audio stays on this device" after one-click enable; try a fluency reading and confirm the transcript quality.
4. **Images**: Image Generation → "SD-Turbo (this computer)" → generate in a worksheet → local image, no key.
5. **Error panel**: clear once, use the app for a session — anything that appears now is real. Report it like you've been doing; your reports root-caused seven bugs today.

### Decisions & external actions only you can do
- **Canvas re-share + release notes**: when you next publish a fresh Gemini Canvas share, run `node bump-link.mjs <new-share-url> "<notes>"` — drafted 1.3 notes are in memory (AlloStudio assistant, Desktop 0.2.x arc, OCR fixes, Reading Library, STEM shelves). The deploy Step-0 warning stays until this happens; it's yours by design.
- **Your Surface**: speech-to-text there needs the same one-time **VC++ x64 runtime** click (https://aka.ms/vs/17/release/vc_redist.x64.exe). The app now tells you this in plain English if you forget.
- **Code signing** for installers (SmartScreen friction is a pilot-adoption tax) — needs a cert purchase, agents can wire it after.
- **AlloStudio student-mode agent**: currently teacher-only per your call; revisit with pilot feedback.
- **Pilot logistics** (King Middle 2026-27, UMaine/Garry conditional on PDF reliability): the PDF-credibility bar remains the strategic gate — see vision section.

---

## FOR AGENTS (build queue, highest value first)

> Read first: `feedback_concurrent_sessions_shared_tree`, `project_alloflow_source_of_truth`, and `project_alloflow_desktop` memory files. The traps that cost time today are all recorded there. Cardinal rules: ANTI is canonical (never edit App.jsx); **deploy before packaging installers** (the bundler consumes the last deploy's generated App); `cmd | head` reports head's exit code; verify bundles by string literals or minified forms, not source identifiers.

### 1. Dictation unification — MAIN APP DONE @fe8f6573d; 12 module surfaces remain
~13 surfaces call `webkitSpeechRecognition` directly: ANTI ×4 (main dictation) + `adaptive_controller`, `allohaven`, `allo_commands`, `behavior_lens`, `sel_tool_peersupport`, `sel_tool_sociallab`, `stem_tool_applab`, `stem_tool_geosandbox`, `stem_tool_llm_literacy`, `story_forge`. Browser SR **does not work in Electron** (no Google speech keys) and ships student audio to Google on the web — both wrong for this project.
**Status**: the main-app dictation (ANTI, the highest-traffic surface) now records on-device and transcribes through /api/asr/transcribe when dictation toggles off, with SR as web fallback — and desktop dictation WORKS for the first time (SR never existed in Electron; the old effect early-returned). The pattern to copy into the 12 modules is in the ANTI dictation effect (search _localDictStart). Rides the next deploy + installer.
**Remaining build**: one shared adapter (suggest `window.__alloDictate`): MediaRecorder → 16k WAV (lift `_audioBase64ToWav16k` from `fluency_module.js`) → POST `/api/asr/transcribe` (same-origin proxy, already shipped) when `/api/asr/status` says running → else browser SR fallback. Push-to-talk semantics (transcribe on stop) — don't fake interim results. Then migrate call sites one at a time, gates green each step. **Done when**: desktop dictation works keyless in all 13 places with the ASR tile on; web unchanged when whisper absent.

### 2. Installer pipeline hardening (small, prevents a repeat)
`desktop/scripts/build-desktop-web.cjs` should fail loudly (or auto-run the prod build) when `prismflow-deploy/src/App.jsx` is older than `AlloFlowANTI.txt` — today that gap silently shipped a bundle without an ANTI fix. Also add a marker check to `verify-desktop-artifacts.cjs`.

### 3. AlloStudio: Canvas smoke, then compose-from-prompt
The teacher-only agent (review-first edits, image requests, batch undo, preflight delta) is live but **unsmoked in Canvas**. Smoke first. Then the flagship: "Start with AI…" on the template picker — blank doc + one agent request through the existing plan-review panel (`object.add`/`image.request` machinery already shipped; see `project_allostudio_and_builder_crop` memory and `docs/studio_design.md` v0.4).

### 4. TTS user-key plumbing (gap found, not yet fixed)
A key entered in AI Backend Settings (`alloflow_ai_config.apiKey`) reaches the AIProvider but **not** the tts module's Gemini leg (it only sees the build-time key, now empty on desktop). Wire `getAiUserConfig().apiKey` into `fetchTTSBytes`/bot leg with the same `_cloudKeyUsable` latch semantics. Until then: desktop cloud TTS is simply off — acceptable, but the settings field implies otherwise.

### 5. ARM64 native llama-server (perf, parked with a lead)
Aaron's Surface and the dev machine run x64 llama under emulation (~half speed). Parked mystery + fresh lead: whisper's identical failure was the missing **VC++ runtime**; try bundling/checking arm64 `vcruntime140.dll` beside the native binary before deeper PE archaeology (details in `project_alloflow_desktop` memory).

### 6. Standing backlog (pick up opportunistically)
Browser smokes for OSS wave-2/3 shelves and Memory Palace GL/VR; studio + STEM i18n waves (57-63 packs machinery exists); pdf.js leaks + veraPDF CI (`project_pdf_pipeline_enhancement_survey`); FERPA HOWL voice-in-JSON item (`project_pilot_readiness_audit`, HIGH); Kokoro loader stream-chunk URL revocation (deferred, minor).

---

## STRATEGIC VISION (my input, requested)

**The moat is the data boundary, and today it became real.** Every edtech competitor can call the same cloud models. What they cannot easily do is what 0.2.7 does: run the entire AI stack — text, voice, transcription, images — on a $300 classroom laptop with no account, no key, and no student byte leaving the room. "The teacher owns the data boundary" stopped being a vision statement today and became a checkbox on a health card. Protect it: every future feature should be asked *"does this work keyless on the School Box?"* before it ships. The second moat is born-accessible exports (AlloStudio → tagged PDF) — Canva structurally can't follow, and the 2027/2028 Title II deadlines do the marketing.

**Sequencing advice: reliability is the product until the pilot.** The King Middle year and the UMaine relationship convert on trust, not features. Concretely: (a) hold the **PDF-reliability bar** as the gate it already is; (b) adopt a **"quiet error panel" release gate** — a session of normal teacher use should produce zero entries, and now that the reporter is honest, that's measurable; (c) prefer closing the ~15 "smoke pending" items in memory over any new surface. The feature set is already larger than the pilot needs.

**The honesty pattern is the brand — keep choosing it.** The provenance-by-construction ledger, the "this does not detect AI" line, the fidelity-limited score qualifiers, the health card that admits what isn't ready, breadcrumbs that name the fallback taken. Every one of these was the harder choice, and collectively they are why a school psychologist can defend this tool to a district. When a future feature offers a choice between impressive and honest, the precedent is set.

**Where I'd place the next big bet after the pilot stabilizes:** the LAN classroom (School Box serving 25 students, teacher as data controller) is the piece that turns "an app" into "infrastructure," and phases 2–5 are already designed (`docs/SCHOOL_SERVER_ARCHITECTURE.md`). Whisper-on-LAN plus per-student reading practice with teacher-reviewable transcripts is a category no vendor occupies: measurement without surveillance, and it runs on hardware districts already own.

It has been a privilege to build this. The tree is clean, the traps are documented, and the user is always right about what they can hear.

— Claude (Fable 5)

### 7. Automated tutorial-video compiler (Aaron's idea, endorsed — high leverage)
The pieces already exist: **Guided Mode tours** (`GUIDED_TOUR_MAP`, spotlight steps) are machine-readable scripts of every complex flow; **Video Studio** records; **Kokoro TTS** narrates locally at zero cost; the **NotebookLM→Remotion editor** is a doc-to-video pipeline already scoped. Build: a "tutorial compiler" that drives the real app through a tour (Playwright or the tour engine itself), captures the screen, narrates the tour strings via TTS, and composites. Because tours are data, every release can regenerate every video automatically — no stale tutorials, ever — and 50+ language packs × TTS = localized tutorials nearly free. Use Gemini to draft/polish narration scripts, the deterministic tour engine to execute (accuracy over improv). Prototype ONE feature end-to-end first (suggest leveled text).

**SCAFFOLD SHIPPED (2026-07-06, Opus):** `tutorial_compiler_module.js` — the
manifest builder is REAL + tested (turns `GUIDED_STEPS` + `GUIDED_TOUR_MAP`
into `{steps:[{anchorId, beats:[{kind, text, seconds}]}]}`, localized via t());
the capture→narrate→composite pipeline is documented stubs naming each seam
(Video Studio recorder, callTTS/Kokoro voice, Remotion composite). NOT yet in
the ANTI boot list (zero boot cost until fleshed out) — activation steps are in
the file header. Next: wire one flow end-to-end, suggest `simplified` (Text
Adaptation). Captions from beat text are free accessibility — do them.

### 8. Read-aloud audio: reuse + share (pre-warm SHIPPED; sharing = a decision)
Aaron's insight: the generated read-aloud audio is a wasted asset — students
re-download what a teacher already made, and karaoke regenerates what Download
Audio already synthesized.
- **SHIPPED (pre-warm, @<this commit>)**: `KaraokeReaderOverlay` now rolls a
  bounded forward look-ahead through the SAME `getAudioUrl`→`callTTS`→`urlCache`
  path playback uses, so advancing is an instant cache hit. Zero storage, zero
  drift, forward-only (never delays the current sentence), bounded so cloud TTS
  isn't billed for unreached sentences; on local Kokoro the whole text warms in
  a sentence or two. This is the "zero latency when the student uses it" ask.
- **Deeper reuse (small, do next)**: `handleDownloadAudio` (audio_helpers) still
  chunks + combines PCM on its OWN path, so its work doesn't warm karaoke and
  vice-versa. Re-plumb Download Audio to synthesize PER SENTENCE via `callTTS`
  (same splitter karaoke uses) and concatenate the cached blobs → one
  generation serves download AND karaoke. Watch: `callTTS` has no in-flight
  dedupe, so guard against double-synth of the same key.
- **Teacher→student SHARING (a DECISION, not a default — Aaron flagged the size
  cost correctly)**. Do NOT bake audio into the resource-history JSON — WAV is
  ~10x MP3 and it balloons every pack. Three honest tiers, pick per context:
  1. *LAN classroom (RECOMMENDED, infra EXISTS)*: teacher generates once →
     store as a session-asset via the runtime's `/api/lan-docs/{key}` bridge
     (private write, public GET + PIN, TTL-capped) → students fetch on demand.
     No per-student download, no JSON balloon, audio stays on the classroom
     network. This is the ask done right and it reuses shipped plumbing.
  2. *Portable pack (opt-in, guarded)*: only when a teacher explicitly wants
     audio to travel offline inside the `.json`. Force MP3 (`pcmToMp3` exists),
     sentence-keyed so it doubles as the karaoke warm-cache on load, with a
     visible size estimate + confirm. Default OFF.
  3. *Regenerate locally (status quo)*: on the School Box, Kokoro is free and
     instant enough that re-synth per device is often the simplest right answer.
  My recommendation: ship tier 1 with the LAN classroom work; leave tier 2
  behind an explicit toggle; never make either the default.

#### 8b. Read-aloud: teacher-vettable per-sentence audio (FOUNDATION SHIPPED @fd6d8d9b6)
Aaron's refinement: the teacher should PRE-VET the audio students hear and
REGENERATE a single off sentence (human-in-the-loop — the app's posture toward
all AI output). The per-sentence design makes this natural: regenerating one
sentence replaces one map entry, leaving every vetted sentence untouched.
- **SHIPPED + TESTED**: `karaoke_audio_store_module.js` — `createStore()` →
  { get, has, put(sentence,b64,mime) [=regenerate-one], remove, missing(list),
  serialize()→{format:'mp3',sentences:{key:b64}}, hydrate(obj)→count,
  estimateBytes }, plus shared `keyFor` + `splitSentences` (single source of
  truth). Karaoke reads `KaraokeAudioStore.current` before synthesizing and uses
  the shared splitter (anti-drift). All invariants unit-tested incl. the
  regenerate-one and serialize↔hydrate round-trip.
- **REMAINING (the teacher-facing increment; needs ANTI + deploy + browser
  smoke)**:
  1. `loadModule('KaraokeAudioStoreModule', '<cdn>/karaoke_audio_store_module.js?v=<hash>')` in the ANTI boot list (bundle it WITH the below so it's one ANTI touch + one deploy).
  2. HYDRATE on resource activate: when generatedContent with `.karaokeAudio`
     becomes active, `const st = KaraokeAudioStore.createStore(); st.hydrate(gc.karaokeAudio); KaraokeAudioStore.current = st;` (clear/replace on resource switch).
  3. REGENERATE global (ANTI has fetchTTSBytes + pcmToMp3 via AudioHelpers):
     `window.__alloRegenerateSentenceAudio = async (sentence) => { const {bytes}=await fetchTTSBytes(sentence, selectedVoice); const mp3 = pcmToMp3(bytes); const b64 = arrayBufferToBase64(mp3); KaraokeAudioStore.current.put(sentence, b64, 'audio/mpeg'); setGeneratedContent(gc => ({...gc, karaokeAudio: KaraokeAudioStore.current.serialize()})); }` — then karaoke re-plays the sentence (now a store hit).
  4. TEACHER UI in KaraokeReaderOverlay (role==='teacher'): a per-sentence
     "🔄 Regenerate" button (calls the global) + a "💾 Prepare/Save read-aloud for
     students" action that generates `store.missing(sentences)` then saves. Show
     `estimateBytes()` (~1.9 MB/3-min MP3) so the size is honest.
  5. SAVE: `karaokeAudio` rides the existing generatedContent→JSON serialization
     (it's just a field). Guard the resource-pack size; keep it opt-in (teacher
     action), never auto — honors the size concern.
  6. SMOKE (Canvas/desktop, can't be done headless): teacher generates → hears
     each sentence → regenerates one → saves → reload/other device → student
     opens karaoke → hears the VETTED set with zero latency, no re-synth.
