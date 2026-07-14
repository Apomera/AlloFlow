# OSS Wave-3 Integration Scoping — 2026-07-05

Scoping analysis for the six deferred open-source integrations (whisper.cpp/Vosk ASR,
Cboard embed, StoryWeaver, Smithsonian/OpenSeadragon, H5P player, SRE spoken-math).
These were explicitly deferred from Wave-2 because each is a real project, not a
wire-up. This doc says **how each would be done and where it lands**, grounded in a
five-agent sweep of the current tree (2026-07-05). File:line anchors are as-of-today;
re-grep before editing.

**Status: ANALYSIS + BUILD LOG. Update 2026-07-05: SRE, Zoom Gallery (Smithsonian/OSD),
Cboard v0, and whisper.cpp ASR (runtime + client) are BUILT & committed on main
(local, not deployed). H5P and StoryWeaver remain scoped-only. See the Build Log
at the end of this doc for commit hashes and what was verified.**

---

## Cross-cutting facts (verified today)

- **Two proven integration modes.** (a) Companion shelf: opener `stem_lab/stem_tool_*.js`
  + popup HTML at `alloflow-cdn.pages.dev/<shelf>/`, postMessage bridge, 6 wiring sites
  (registerTool in own file; tile `_allStemTools` @stem_lab_module.js:3924-3948; alias map
  @3951-3965; `_pluginOnlyTools` @5318-5414; `stemToolModules` loader in AlloFlowANTI.txt
  @5428-5440; `PLUGIN_FILES` in build.js @857-861), gated by `dev-tools/check_plugin_files.cjs`.
  (b) School Box vendoring: the desktop runtime's managed-engine pattern (below).
- **Three embed strategies exist**, chosen by whether the upstream permits framing:
  direct iframe (Falstad, PhET, CODAP all permit it); **CDN-script library mount, no
  iframe** (Mol* — `molecule_shelf.html:31,111,276-305`) for anything that refuses
  framing; self-host on our own CDN origin (sidesteps X-Frame-Options entirely). No
  shelf has an open-in-new-tab degradation yet.
- **Managed-native-process pattern** (the llama.cpp engine) is fully self-contained in
  `desktop/runtime/alloflow-desktop-runtime.cjs`: pinned per-arch release zips
  (`ENGINE_BINARY_URLS` @255-258), `binary-source.txt` refresh marker, download w/ disk
  preflight (@1952-1978), state machine `managedEngine` (@259-281), port-squatter
  preflight + health poll (`launchEngineProcess` @2123-2186), arm64→x64 fallback,
  stop/AbortController, `/api/engine/status|start|stop|logs` (@2578-2613), autostart
  (`maybeAutostartEngine` @3118-3124), Electron `before-quit` teardown (main.cjs
  @508-528), 127.0.0.1-only + excluded from LAN share. **This is a clone-recipe.**
- **No generic CORS proxy.** Third-party content today = iframe/script from permissive
  origins (PhET, RCSB, jsDelivr) or a purpose-built serverless route (Serper via
  Firebase rewrite @ai_backend_module.js:253-348; catalog writes via
  `catalog/cloudflare-worker/`). New external APIs need one of these or curation/mirroring.
- **CDN limit:** >25MiB per file froze the CDN once ([[project_cdn_freeze_2026-07-05]]).
  Desktop is unlimited — big models/binaries belong in School Box.
- Popup shelves are **hardcoded English** except a `&lang=` param consumed only by Sim
  Shelf's PhET locale map — any new shelf should at least pass/consume `lang`.

---

## 1. whisper.cpp / Vosk offline ASR — oral reading fluency (School Box)

### What actually exists (changes the framing)
The app **already has a full ORF feature** — this is a *scorer swap*, not a new feature:

- Capture: `useAudioRecorder()` (AlloFlowANTI.txt:2822-2865, getUserMedia+MediaRecorder
  → base64 webm), instantiated as `startFluencyRecording` (@6957). Story Forge has a
  second per-paragraph recorder (`story_forge_module.js:711`).
- Scoring: `fluency_module.js` — `analyzeFluencyWithGemini` POSTs the **audio to Gemini**
  (with an AAE/child-speech/accent bias-mitigation prompt) for word-by-word running
  record; `calculateLocalFluencyMetrics` (WCPM+accuracy) and
  `calculateRunningRecordMetrics` (subs/omissions/insertions/self-corrections,
  independent/instructional/frustrational) already compute the metrics **locally** from
  a word-level analysis.
- Benchmarks/passages: `FLUENCY_BENCHMARKS` + `ORF_SCREENING_PASSAGES` in
  `allo_data_module.js`; UI `FluencyModePanel` (view_misc_panels_module.js, rendered
  ANTI:29176); exports `exportFluencyCSV` (@9856) + running-record sheet (@9879).
- Web Speech API is **not** the fluency path — it backs dictation, voice commands, and
  word-level phonics probes only (chokepoint: `voice_module.js` `window.AlloFlowVoice`).
  `fluencyRecognitionRef` (ANTI:7181) is dead code.
- FERPA today: student audio is (a) **sent to Google** for scoring and (b) persisted
  base64 inside `fluency-record` history items (`phase_k_helpers_module.js:2096-2118`).
  ⚠ Confirm the `SESSION_TIER1_LEAVES` guard (ANTI:2789-2806) keeps that audio leaf out
  of Firestore sync before making claims.

### Design
**Where:** desktop runtime + `ai_backend_module.js` + `fluency_module.js`. Desktop-only
feature (models/binaries too big for CDN; mission fit = school-owned data boundary).

1. **Runtime — clone the engine subsystem** (mechanical, the recipe is 1:1):
   `localAsr` config block mirroring `localEngine` (@166-181); `ASR_BINARY_URLS` pinned
   per-arch whisper.cpp release zips (same b-tag scheme as llama.cpp); `managedAsr`
   state machine + `startLocalAsr/stopLocalAsr/launchAsrProcess` reusing
   `downloadEngineFile`/`expandEngineZip`/port-squatter/health-poll/x64-fallback
   verbatim; routes `/api/asr/status|start|stop|logs`; teardown in SIGINT/SIGTERM
   (@3105-3109) + `before-quit`; `maybeAutostartAsr()` beside the engine call sites;
   document in `runtime-contract.json`; command-center strip cloned from the engine
   block (`command-center.js` @840-949). Default model: whisper `base`/`small`
   multilingual GGML (~150-500MB) from HF, downloaded like the LLM GGUF. **127.0.0.1
   only, never on the LAN share listener** (same boundary as the engine).
2. **Client — `ai_backend_module.js`:** `analyzeAudio()` currently *throws* for
   non-Gemini backends: "Use Whisper for transcription, then text grading"
   (@1546-1547). That error string is the call site — add an `alloflow-local-asr`
   branch that POSTs the webm/wav to the managed port (whisper.cpp's server exposes an
   OpenAI-style `/v1/audio/transcriptions`-compatible inference endpoint; request word
   timestamps). Availability gate = same-origin `/api/asr/status` behind
   `window._isDesktopBundledApp`, exactly like the engine strip in AIBackendModal
   (`view_misc_modals_source.jsx:597-696`).
3. **Scorer — the one genuinely new component.** With a local transcript (+ word
   timestamps), the running record becomes deterministic: align transcript vs the
   reference passage (Needleman-Wunsch/edit-distance word alignment, ~100-200 lines in
   `fluency_module.js`) → feed the existing `calculateLocalFluencyMetrics` /
   `calculateRunningRecordMetrics`. Local-first when ASR present; Gemini fallback
   unchanged. Story Forge's `onAnalyzeFluency` (wired ANTI:31142) rides the same swap.
4. **Integrity framing (non-negotiable, per pilot audit):** keep/strengthen the
   existing honesty labels — Story Forge's ORF card already says "AI estimate from one
   read-aloud — practice feedback, not a normed ORF benchmark" and analytics banding is
   "% of benchmark median", NOT percentile ranks. The local path must carry the same
   framing **plus** an ASR-specific caveat: whisper has *no* child-speech/dialect
   mitigation (the Gemini prompt did) — WER on early readers is materially higher, and
   miscue classification from ASR output is noisier than human running records. Output
   = practice signal + word-level *suggestions* a teacher can correct, never an
   auto-scored tier decision. Surface "ASR (on-device) — may mishear young readers;
   review flagged words" in the result card.
5. **FERPA wins to claim (accurately):** voice never leaves the device on the local
   path; pair with the deferred strip-audio-on-export work (same class as the SEL HOWL
   item) rather than overclaiming "nothing stored".

**whisper.cpp vs Vosk:** whisper.cpp (MIT) fits the existing pattern exactly (pinned
release zips, single server binary, no runtime deps) and is better on accuracy;
multilingual for the 63-lang mission. Vosk (Apache-2.0) wins only if we want live
streaming partials (real-time word highlighting while reading) — current UX is
record-then-score, so batch whisper matches. Recommendation: **whisper.cpp first**;
revisit Vosk only if live karaoke-style ORF becomes a requirement.

**Effort:** runtime clone ~1-2 sessions (mechanical); alignment scorer + UI framing
~1-2 sessions; smoke on Aaron's Surface (arm64 caveats already mapped by the engine
work). New installer required to reach the installed app.

---

## 2. Cboard companion shelf (AAC)

The OBF **export** bridge shipped (@ecb7f1d70). Embedding Cboard is separate because
Cboard is a full GPL-3 React SPA, not a library.

### Recommended shape: three tiers
- **v0 — close the OBF round-trip inside Symbol Studio (small, high value, no embed):**
  (a) `importBoardOBF` beside `exportBoardOBF` (symbol_studio_module.js:1837) — the
  import input is `.json`-only today (`importBoardRef` @6835-6836); extend to
  `.obf`/`.obz` and map open-board-0.1 → native board shape. (b) `.obz` multipage
  export — zip assembly already exists in the tree (EPUB export builds a real
  `application/epub+zip`, view_export_preview_module.js:1078-1091), so the "future add"
  noted at symbol_studio_module.js:1835 is unblocked.
- **v1 — companion shelf with a self-hosted Cboard build.** Cboard is a CRA SPA;
  self-hosting a pinned build under `alloflow-cdn.pages.dev/cboard/` sidesteps
  X-Frame-Options entirely (and GPL-3 is fine served unmodified — add OssCredits entry
  + source link; AGPL AlloFlow is license-compatible). Shelf = `stem_tool_aacShelf.js`
  opener + thin wrapper popup (`aac_shelf/aac_shelf.html`) whose sidebar is a
  **hand-off panel**, not a POE coach: recent Symbol Studio boards → "Download .obf →
  import in Cboard" guidance (Cboard has native OBF/OBZ import UI). Bridge prefix
  `alloaac-*`, quest slice `_aacShelf`, the standard 6 wiring sites.
  ⚠ License check before committing: Cboard's bundled symbol sets include ARASAAC
  (CC BY-NC-SA). Serving Cboard's own build with its own symbol arrangement is Cboard's
  licensing posture, but verify we're comfortable re-hosting it; Mulberry-only
  configuration is the fallback.
- **v2 (defer) — deep embed:** programmatic board injection (postMessage → Cboard fork
  that accepts an OBF payload). That's an upstream-fork project; only worth it if the
  manual import friction proves real in classrooms. School Box vendoring of the same
  self-hosted build gives offline AAC for free once v1 exists.

**Effort:** v0 ~1 session; v1 ~1-2 sessions (mostly build/self-host plumbing + wrapper).

---

## 3. StoryWeaver — leveled reading library (own project)

### What exists / what's missing
The "Leveled Reader" is an **AI-text renderer** (`view_simplified_module.js` — immersive
mode, karaoke, define/phonics, bilingual side-by-side) fed by `content_engine_module.js`
generation. There is **no book library, no inbound EPUB/book parser, no browse-by-language
surface** (Community Catalog filters subject/grade only, `catalog_module.js:223-233`).
EPUB plumbing exists **outbound only**.

### Design
**Where:** a new in-app module (`reading_library_module.js`) modeled on
`catalog_module.js`, NOT a popup shelf — this is content ingestion, not an external app.

1. **Content pipeline (offline, build-time):** curate an initial set (~200-500 books
   across our 63 UI languages) from StoryWeaver (CC-BY 4.0 — mirroring/translating is
   legal). Normalize to our own JSON (`{title, level(1-4), lang, pages:[{imageUrl,
   text}], authors, illustrators, attributionUrl}`) hosted like the Community Catalog
   (GitHub raw + jsDelivr) with images mirrored to the CDN. This avoids the missing
   CORS proxy entirely; a Cloudflare Worker search route against StoryWeaver's API is a
   later enhancement, not v1.
2. **Browse surface:** catalog-style cards + the **new language facet** + level facet.
3. **Reader:** StoryWeaver books are picture books (image + short text per page) —
   either a lightweight page-spread reader that reuses the leveled-reader interaction
   layer (define/phonics/TTS via `AlloSpeechPlayer`), or an adapter mapping book text
   into the `simplified` item shape. First option is more honest to the format.
4. **Synergies (why this is worth its size):** each book is an ORF passage (feeds the
   fluency feature in §1 — real connected text at known levels instead of only
   AI-generated passages); 296 source languages align with the lang-pack mission;
   School Box can carry the whole mirrored set offline; CC-BY attribution rendered
   per-book + OssCredits.

**Effort:** the largest of the six — content pipeline + new browse surface + new reader
≈ a multi-session project. Recommend scoping v1 to ~50 hand-curated books in the top
6-8 classroom languages to prove the reader before scaling the mirror.

---

## 4. Smithsonian Open Access / NASA + OpenSeadragon — deep-zoom shelf

**Nothing exists today** (zero OpenSeadragon/IIIF/deep-zoom references). But this is the
**closest thing to a Molecule Shelf clone** on the list — smallest new ground.

**Where:** companion shelf `stem_tool_artifactShelf.js` (name TBD — "Museum Shelf" /
"Artifact Explorer") + `artifact_shelf/artifact_shelf.html`.

1. **Viewer:** OpenSeadragon (BSD-3) mounted Mol*-style — `<script>` from jsDelivr into
   a div; no iframe, no framing issues. It consumes **IIIF tile sources natively**, and
   Smithsonian serves CC0 open-access images through IIIF endpoints — so **v1 needs no
   backend and no API key**: a curated catalog (20-50 artifacts across topics — fossils,
   space hardware, art, specimens) with direct IIIF/tile URLs, exactly like the 16
   PhET sims / 7 PDB ids pattern. NASA CC0 images (large JPEGs) work via OSD's
   single-image mode or pre-generated DZI for a curated few.
2. **Coach:** Notice→Wonder sidebar (direct clone of Molecule Shelf's), `alloartifact-*`
   bridge, AI debrief relay via `ctx.callGemini`, reflection-bank fallback, quest slice
   `_artifactShelf`.
3. **Later:** live search of the Smithsonian API needs a key → Cloudflare Worker route
   (catalog worker is the template). Not v1.
4. School Box: mirror the curated tile pyramids locally (CC0, no license friction).

**Effort:** ~1-2 sessions to parity with Molecule Shelf. Highest value-per-effort on
the list after SRE.

---

## 5. H5P player shelf

**What exists:** quiz types are mcq / fill-blank / short-answer / self-explanation /
sequence-sense / relation-mismatch (`view_quiz_source.jsx:1172,1991`) — no drag-drop,
hotspot, branching, or interactive video. Export registry
`ALLO_INTERACTIVE_OBJECT_PROFILES` (doc_pipeline_module.js:34-61) ships QTI + IMS CC and
explicitly defers xAPI. H5P **complements**; it does not overlap.

**Where:** companion shelf `stem_tool_h5pShelf.js` + `h5p_shelf/h5p_shelf.html`.

1. **Player:** `h5p-standalone` (MIT wrapper; H5P core mostly MIT) self-hosted on the
   CDN (it requires an HTTP origin — fine). Mol*-style script mount, no iframe needed.
2. **Content:** pre-extract curated `.h5p` packages into CDN folders at build time (a
   small script; keeps every file under the 25MiB limit and avoids client-side zip
   handling). Curated catalog JSON like the sims list.
3. **Bridge:** listen to `H5P.externalDispatcher` xAPI events in the popup → forward
   completion/score over `alloh5p-*` to the opener → quest slice `_h5pShelf` + a
   practice-signal result card (local only — this partially fills the noted xAPI gap
   without any server).
4. **The real cost is curation, not code:** every package needs a license check
   (H5P.org examples vary; prefer OER Commons items with explicit CC licenses) and an
   accessibility check (H5P content types vary widely in a11y quality — screen-reader
   testing per type before it enters the catalog; that's our value-add claim).
5. **Explicitly out of scope:** H5P *authoring* (needs the editor stack/server — a
   different project). AlloFlow's own authoring remains the AI quiz path.

**Effort:** player + shelf ~1-2 sessions; curation is ongoing editorial work.

---

## 6. Speech Rule Engine (SRE) — spoken math

### What exists (this changes the scope — it's an upgrade, not a greenfield)
- A **hand-rolled LaTeX→spoken-English engine already ships**:
  `_alloLatexToSpeakable` (doc_pipeline_source.jsx:663-739 — fractions, roots, powers,
  ~90-entry phrase map), used for equation-image alt text (@11875-11884), with raw-LaTeX
  alts flagged as a11y defects (@586-591).
- **MathML is already produced** via lazy-loaded temml (`_ensureTemml` @11820-11837,
  render @12000-12017) — and SRE consumes MathML natively.
- **TTS has zero math handling** (verified: both text cleaners at tts_source.jsx:78-101
  and :213-227 are markdown/prose only) — inline math is spoken as "dollar x caret two
  dollar". Central hook: `AlloSpeechPlayer.speak` (AlloFlowANTI.txt:1065) feeds ALL
  legs (Gemini/Kokoro/Piper/browser).
- Loader precedents to mirror exactly: `liblouis_braille_loader.js` (lazy, memoized
  ready-promise, `window.AlloBraille.toUEB → Promise<string|null>`, null-on-failure so
  callers keep the fallback) and `_ensureTemml`.

### Design
**Where:** new `sre_loader.js` (PLUGIN_FILES) + three seam edits.

1. **Loader:** `window.AlloMathSpeech.toSpeech(latexOrMathML, {locale, style}) →
   Promise<string|null>` — lazy jsDelivr load of `speech-rule-engine` on first call,
   ClearSpeak default, null on any failure. LaTeX input goes through temml→MathML first
   (already precedented).
2. **Seam A — pipeline alt text:** route `_alloLatexToSpeakable` callers through SRE
   when available; keep the 75-line regex engine as the sync/offline fallback. Directly
   upgrades the open "spoken-math alt quality" item from the STEM remediation
   assessment.
3. **Seam B — live read-aloud:** async pre-normalizer at the TTS entry
   (`AlloSpeechPlayer.speak` and/or callTTS @tts_source.jsx:228 + callTTSDirect @446;
   edit SOURCE, rebuild via `_build_tts_module.js` ×2 copies): detect math
   (`$…$`, `\frac`, `data-allo-latex` spans, `<math>`) → substitute spoken form.
   Fallback = today's verbatim text.
4. **Seam C — exports:** the markdown export currently dumps MathML as an opaque
   ```` ```mathml ```` fence (view_export_preview_source.jsx:1081) — add a spoken-form
   caption. **Bonus:** SRE also emits **Nemeth braille math** — pairs with the liblouis
   UEB path to fix math-in-BRF (currently symbol soup), touching two open items from
   the export-format review (md math, BRF).
5. STEM Lab tools render math as plain text/SVG with hand aria-labels — out of scope
   for the first pass (they'd need per-tool LaTeX/MathML emission before SRE can help).

**Effort:** loader + seams A/C ~1 session; seam B (TTS, needs careful chunk/lang
interaction) ~1 session. Locale note: SRE ships en/es/fr/de/it + more — matches the
i18n program; non-covered locales fall back to English rules or verbatim.

---

## Recommended sequencing (leverage ÷ effort)

| # | Integration | Why this order |
|---|---|---|
| 1 | **SRE spoken-math** | Smallest new surface; upgrades three existing seams; closes standing open items (spoken-math alt, md math, BRF math) |
| 2 | **Smithsonian/OSD shelf** | Molecule-Shelf clone; CC0; zero backend v1 |
| 3 | **Cboard v0** (OBF import + .obz) | 1 session; completes the round-trip the export started |
| 4 | **whisper.cpp ASR** | Highest mission value (voice never leaves device; offline ORF); runtime clone is mechanical; needs installer cycle + integrity framing care |
| 5 | **H5P shelf** | Code is easy; curation/licensing is the real ongoing cost |
| 6 | **StoryWeaver library** | Biggest build (pipeline + browse + reader); plan as own project; unlocks ORF passages + 296-lang content |

Cboard v1 (self-hosted shelf) slots after v0 whenever the licensing check clears.

## Standing cautions
- Every new shelf: 6 wiring sites + `check_plugin_files` gate; popup i18n is an unsolved
  gap (pass `&lang=`, consume where the embedded tool supports it).
- ASR: verify `SESSION_TIER1_LEAVES` audio-sync behavior before making FERPA claims;
  keep "% of benchmark median" framing; never percentile ranks (pilot-audit lesson).
- ANTI edits (TTS player hook, ASR wiring): root ANTI only, validate via
  `build.js --mode=dev` + esbuild parse, revert side-effects, pathspec commits
  (concurrent sessions live in this tree).
- OssCredits (view_info_modal) needs entries for every new upstream (SRE Apache-2.0,
  OpenSeadragon BSD-3, h5p-standalone MIT, Cboard GPL-3, StoryWeaver CC-BY content,
  Smithsonian CC0, whisper.cpp MIT).

---

## Build Log — 2026-07-05 (local commits on main, NOT deployed)

Built in the recommended order. Every phase: gates green (check_plugin_files,
check_free_vars, check_render_refs, node --check), pathspec commits around the
concurrent brain-atlas session, deploy/dev artifacts reverted. Behavioral
browser/on-device smoke pending on all (marked per phase).

1. **SRE spoken math @dafe9d8ca.** `sre_loader.js` (lazy `window.AlloMathSpeech.toSpeech`,
   speech-rule-engine@4.1.4 CDN-verified). New generic `window.__alloLoadPlugin`
   injector (CDN modules couldn't see `pluginCdnBase` — why the braille UEB path
   shipped dead; that's now fixed too, BRF lazy-loads liblouis). Seams: TTS
   pre-pass at callTTS/callTTSDirect (delimited math → spoken instead of "dollar x
   caret two dollar"); doc_pipeline equation-alt **triangulation** (Vision's
   spoken alt vs deterministic SRE of the same LaTeX — divergence prefers SRE +
   `data-allo-spoken-triangulation` marker); markdown export "Spoken:" caption.
   About: SRE credit.
2. **Zoom Gallery @477f619dd.** New shelf `zoomGallery` (OpenSeadragon@5.0.1,
   Molecule-Shelf pattern, no iframe). 10 curated CC0/PD images (8 NASA public-
   domain simple-image, 2 Smithsonian CC0 IIIF deep-zoom) — all asset URLs
   HEAD-verified 200. Notice→Wonder coach, `alloczoom-*` bridge. 6-site wiring +
   check_plugin_files 189/189. About: OpenSeadragon, Smithsonian Open Access,
   NASA. (Accessibility angle: deep zoom is a low-vision affordance too.)
3. **Cboard v0 @a6492b8c1.** Symbol Studio import now accepts `.json/.obf/.obz`
   (`_obfToPage` maps the OBF grid back, resolves in-zip images to data URLs);
   new `.obz` multipage export (JSZip, one .obf/page + manifest). Round-trip
   harness on the REAL functions passes (labels, data/URL images, sparse grid,
   no-grid Cboard fallback). About: Open Board Format credit.
4. **whisper.cpp ASR runtime @d762dd5e7.** `localAsr` subsystem cloned from the
   llama.cpp engine (config, `managedAsr` state machine, start/stop/status/
   launch, `/api/asr/*`, autostart + SIGINT/before-quit teardown, runtime-contract
   port 32176). Pinned whisper.cpp v1.9.1 `whisper-bin-x64.zip` (server.exe
   verified present) + `ggml-base.bin`. **Real constraint encoded:** whisper.cpp
   ships NO Windows arm64 → x64-under-emulation on arm64; whisper-server has no
   /health → probe `GET /`. Runtime `--check`/`--smoke` pass; a harness on the
   real exported status fn + live routes passes 17/17 (engine routes untouched).
5. **whisper.cpp ASR client @86e571127 (+ credit @c15af59ed).** `fluency_module.js`:
   `alignTranscriptToReference` (Needleman-Wunsch → the exact wordData shape the
   existing metric fns consume), `_audioBase64ToWav16k` (Web Audio, no ffmpeg),
   `transcribeAudioLocal` (same-origin /api/asr/status → whisper /inference,
   CORS "*" verified), `analyzeFluencyLocal`, and **`triangulateFluency`** (local
   whisper vs cloud Gemini — agreement=high confidence, divergence keeps the
   MORE LENIENT status + flags needsReview; never over-penalize on a machine
   disagreement). Integrity: every mismatch lowConfidence, confidence capped 6/10,
   prosody null (not invented), explicit "no child/dialect tuning" caveat.
   Harness on the real functions passes 18/18 (incl. running record via the real
   metric fn). About: whisper.cpp credit.

**Pending smoke (honest):** SRE (browser math read-aloud + export), Zoom Gallery
(IIIF tiles + NASA simple-image + OSD sprites), Cboard (real .obf/.obz into
Cboard), whisper ASR (binary/model download + mic→transcript on Aaron's Surface
— needs a fresh installer, like the engine did). None deployed — Aaron deploys.

**Still scoped-only (own projects):** H5P player shelf; StoryWeaver reading
library. See sections 5 and 3 above.
