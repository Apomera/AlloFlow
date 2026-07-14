# NotebookLM Cinematic Video — Edit/Adapt System (design + feasibility)

_2026-06-17. Aaron asked for a system to edit NotebookLM "Cinematic Video Overview" outputs, integrated into AlloFlow. Goals: fix/correct content, make classroom-accessible, repurpose for lessons, AND generate-better (prompt-side). This note is the verdict + architecture after a 21-agent feasibility workflow (run wf_94087b60-3b5). Deploy HELD; design only._

## 0. Headline (read this first)
**The companion-window architecture is already proven in production — by your own PDF "Compare" feature.** The single hardest question ("can a window outside the Canvas iframe run a CDN library + a Web Worker and still reach the Canvas-keyed AI?") is answered YES by running code:

- The Compare window is `window.open('', '_blank')` (`view_pdf_audit_source.jsx:6719`) — a top-level browsing context, NOT the Canvas iframe.
- Its written-in `<script>` injects **pdf.js from a CDN** into the popup's own `<head>` and runs it (`6801-6812`), and registers a **Web Worker** via `GlobalWorkerOptions.workerSrc = <CDN>/pdf.worker.min.js` (`6812`).
- It bridges back to the app's AI via `window.opener.__alloflowCropDescribe` → `callGeminiVision` (runs in the Canvas-keyed realm; `6676-6688`, `6949`), and pulls bytes via `window.opener.__alloflowCompareGetTagged` (`6691-6717`).

So "a companion window that runs CDN scripts + a worker + bridges back to Canvas-keyed AI" is **not a new capability we must invent — it's shipping and user-tested** (Compare-tag fix `@34dc536c`). This corrects the earlier pessimistic assumption that no popup had ever loaded a worker/CDN script.

**The one true unknown:** `ffmpeg.wasm` specifically (its ~25-31MB core + memory) has never run in this codebase. The Compare popup proves a *pdf.js* worker runs in a popup; it does not prove *ffmpeg* does. That is the only keystone smoke — and it's ~30 lines. If it fails, we lose video re-encode/export but keep the prompt helper and the multilingual-captions accessibility core. **Worst case is graceful degrade, not collapse.**

## 1. What we're editing (the hard constraint)
NotebookLM **Cinematic Video Overviews** (launched 2026-03-04, Google AI Ultra only, 20/day, 30+ min generation) turn sources into a 2-5 min animated narrated MP4. Critically:
- **No native editing.** Set a *steering prompt*, regenerate from scratch. No project file, no timeline, no scenes.
- **Output = a flat MP4** you download. **No public API** — generation is manual + Ultra-gated.
- Known failure modes: hallucinated visuals, English-only, no editable captions, often too long.

**Implication:** the system = **(a) post-production on the downloaded MP4** + **(b) a pre-production prompt helper**. We do not drive NotebookLM; the teacher uploads the MP4. Be honest in copy: we post-process its export, we do not "edit NotebookLM."

## 2. Hard constraints that shape every decision
| Constraint | Consequence |
|---|---|
| **Canvas is the only production surface; prismflow is a dead demo.** | The "host the heavy editor on prismflow with COOP/COEP" idea from the first draft is **DEAD**. Removed below. |
| **No COOP/COEP / cross-origin isolation anywhere** (0 hits for SharedArrayBuffer/crossOriginIsolated). A `window.open('','_blank')` popup inherits the opener origin and gets **no** isolation headers either. | **Single-threaded ffmpeg.wasm only, on every surface, forever.** Multithreaded is dead. Remux/stream-copy is fast; re-encode is slow. **Design around remux.** |
| **NotebookLM has no edit/API.** | Adapt the downloaded artifact + improve the next prompt. |

## 3. Recommended architecture — two surfaces, one bridge, AI on one side only

### A. Canvas CONTROLLER (a normal React tool in the Canvas iframe)
Owns everything that is **not** raw video-pixel/container work:
- Upload (drag-drop + `<input type=file>`), `URL.createObjectURL(file)` for `<video>` playback.
- The **prompt helper** (steering-prompt builder, lesson-type library, diagnose-and-re-prompt).
- **All AI calls** — `callGemini`, `callGeminiVision`, `callImagen`/`callGeminiImageEdit`, `callTTS`/Kokoro.
- The **segment list + caption text editor** (pure UI).
- Export of **sidecar artifacts** needing no re-encode (.vtt/.srt, transcript, translated audio, lesson packet).
- On-device **transcription** worker (Whisper via transformers.js) — proven Canvas pattern (Kokoro).

### B. COMPANION WINDOW (the heavy editor, `window.open('','_blank')`)
Owns **only** pixel/container work:
- `ffmpeg.wasm` single-threaded in a Web Worker (clone the Kokoro loader shape).
- The heavy `<video>` preview/scrub surface.
- Trim / concat / remux / mux-audio / split / **export MP4**.

**Rule of thumb:** *if it touches video pixels or the MP4 container → companion. Everything else (text, audio-only, AI, prompts) → Canvas controller.*

### The AI bridge: assets-only handoff + opener-RPC (REJECT "companion reloads providers")
- **REJECT "companion re-loads providers."** In Canvas the API key is the **empty string** (`AlloFlowANTI.txt:520-522`); auth is injected by the Canvas runtime into fetches *from the Canvas-blessed context*. A popup is an `about:blank` top-level context — not that context — so a Gemini fetch from the popup itself has no key and 401s. There is no secret to hand over. (Kokoro TTS is the lone exception: pure client WASM, no key.)
- **USE assets-only handoff by default; opener-RPC for any AI the popup needs.** The Canvas controller is the sole AI authority — it produces finished assets (caption JSON, translated audio blob, corrected still PNG) and hands them to the popup. If the popup needs a fresh AI call, it goes back through `window.opener.callGeminiVision(...)` so the fetch runs in the Canvas-keyed realm — **exactly the Compare popup's pattern**.
- **Gap to schedule:** `callImagen` is component-scope, not on `window` (`AlloFlowANTI.txt:13745`). Either expose `window.callImagen`, or (preferred) have the controller produce the corrected PNG and hand the popup the finished image — keeps AI in Canvas.

### Data flow
```
NotebookLM MP4 (teacher downloads, then uploads)
  -> CANVAS CONTROLLER (React, in iframe)
       video preview + segment marking
       extract audio (WebAudio.decodeAudioData FIRST, no ffmpeg)
       transcribe -> Whisper worker -> timestamped draft .srt
       AI (Canvas-keyed): Vision spots bad visuals; Gemini writes captions/AD/translation;
                          Imagen makes corrected still; TTS/Kokoro makes re-voiced/translated audio
       edit captions (human-in-the-loop)
       export sidecars (.srt/.vtt, transcript, audio, lesson packet)   <- no re-encode
  -- HANDOFF (same-origin): popup.__alloHandoff = { mp4Blob, decisions, assets } -->
  -> COMPANION WINDOW (window.open '','_blank', top-level, proven)
       ffmpeg.wasm single-thread Worker
       FAST: trim/concat/split/mux-audio/remux (-c copy, seconds)
       SLOW: burn-in captions / overlay still / re-encode (segment-only)
       export final MP4
       needs AI? -> window.opener.callGeminiVision(...) (runs in Canvas realm)
```

## 4. The four goals -> capabilities
Effort S/M/L. Feasibility: **CP** code-provable, **SL** must-smoke-live.

| Goal | Feature | Tech | Surface | Fast/Slow | Effort | Feas. |
|---|---|---|---|---|---|---|
| **4 Generate-better** | Steering-prompt builder (grade, length, "no on-screen text in lang X", visual-accuracy guardrails) | React + optional `callGemini`; precedent `prompts_library_source.jsx` | Canvas | — | S | **CP** |
| **4** | Lesson-type prompt library (explainer/vocab/lab-safety/SEL/phonics presets) | Static registry + picker | Canvas | — | S | **CP** |
| **4** | Diagnose-and-re-prompt (symptoms/transcript -> corrected prompt) | `callGemini` | Canvas | — | M | **CP** |
| **1 Fix/correct** | Hallucinated-visual detector ("said-not-shown / shown-not-said / contradictory") | `callGeminiVision` over sampled frames (replicate the doc_pipeline 'dual' prompt; do NOT edit doc_pipeline) | Canvas | — | M | **CP** |
| **1** | Corrected replacement still | `callImagen`/`callGeminiImageEdit` (in Canvas) | Canvas | — | M | **CP** |
| **1** | Splice corrected still over a time range | ffmpeg overlay, segment-only re-encode | Companion | Slow | L | **SL** |
| **2 Accessible** | Editable transcript + reading-level simplify | Whisper worker + `callGemini` | Canvas | — | M | **CP** |
| **2** | **Segment-timestamped sidecar .srt/.vtt** (the flagship) | Whisper `return_timestamps:true` -> cue serializer -> blob | Canvas | Fast | M | **CP** (timing precision SL) |
| **2** | Multilingual captions (NotebookLM is English-only) | transcribe EN -> `callGemini` translate -> reuse EN timecodes; 49-language plumbing exists | Canvas | Fast | S | **CP** |
| **2** | Re-voiced / translated audio track | `callGemini` + `callTTS`/Kokoro -> mux `-c:v copy` | either | Fast (mux) | L | **SL** |
| **2** | Burned-in open captions | ffmpeg `subtitles` filter, full re-encode | Companion | Slow | L | **SL** |
| **3 Repurpose** | Trim/clip to lesson-sized pieces | ffmpeg `-ss/-to -c copy` | Companion | Fast | M | **SL** |
| **3** | Split into chapters / reorder | ffmpeg segment + concat (same-codec copy) | Companion | Fast | M/L | **SL** |
| **3** | Concat + title cards / corrected stills | ffmpeg concat (re-encode if codecs differ) | Companion | Slow | L | **SL** |
| **3** | Export final MP4 + lesson packet | ffmpeg export + `callGemini`/prompts_library docs | either | mixed | M | **SL** |

**Accessibility/UDL value (the mission core):** sidecar `.srt`/`.vtt` in any of 49 languages fixes NotebookLM's two worst failure modes for special-ed + EL students (no captions, English-only) — and it's the **cheapest, most code-provable capability in the study** (no ffmpeg, runs in Canvas today). Honesty requirement: captions are ~5-15% WER and can hallucinate on silence, so they ship as an **editable draft labeled "AI draft — review before use,"** never as compliant/finished captions. Non-negotiable framing for a school-psych audience.

## 5. Live-smoke checklist (only Aaron can run these in real Gemini Canvas)
Everything above is code-proven or waiting on this short list. Run in real Gemini Canvas (not prismflow/localhost), from the running AlloFlow tool, **in order**. First two are make-or-break.

- **SMOKE 0b (run FIRST if only one) — ffmpeg.wasm in the Canvas MAIN frame.** Load `@ffmpeg/ffmpeg` single-thread core via the Kokoro blob-worker shape; run a `-c copy` trim on a real 2-5 min MP4; download a playable output. Kokoro/Whisper make this likely, but ffmpeg's ~31MB core has never run here.
- **SMOKE 0 — ffmpeg.wasm in a popup** (gates the heavy-editor-in-popup home). `w=window.open('','_blank')`; inline script logs `self.origin` (expect real https origin, NOT `'null'`) + `self.crossOriginIsolated` (expect `false`); spawn a blob Worker + round-trip postMessage; `await import('https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12/+esm')` with no CSP violation; `ffmpeg.load()` + `-c copy` trim -> download. PASS = all four. If `origin` is `'null'`, popup is sandboxed-opaque -> fall back to Smoke 0b's main-frame home.
- **SMOKE 1 — memory on a real low-end Chromebook** (King Middle fleet, not your laptop). Worst-case ~5-min ~150-200MB MP4: a `-c copy` remux (should survive) and one full re-encode (the OOM risk). Watch for `memory access out of bounds` / tab crash.
- **SMOKE 2 — pop-up blocker under Canvas.** Confirm `window.open('','_blank')` returns non-null from a user click in the Gemini App Canvas (Compare already does this in prod).
- **SMOKE 3 — opener-AI reach-back.** From the popup, `window.opener.callGemini('hi')` returns 200 text (proves Canvas keyless auth fires via the opener). Compare's `window.opener.__alloflowCropDescribe` strongly implies green.
- **SMOKE 4 — MP4 handoff.** `popup.__alloHandoff={mp4Blob}` survives, and/or popup can `fetch()` an opener `createObjectURL(blob:)` URL.
- **SMOKE 5 — audio without ffmpeg.** `WebAudio.decodeAudioData` decodes the NotebookLM MP4 audio in Canvas. If yes, the **captions pillar is ffmpeg-independent** and survives even if Smoke 0/0b fail.
- **SMOKE 6 — Gemini model id resolves.** One `window.callGemini('hi')` returns non-empty (callGemini swallows errors and returns `''`, so a dead model would make even the "zero-risk" prompt helper silently produce nothing — un-asterisks Wave 1).

## 6. Phased plan + recommended first slice
**Do not block Waves 1-2 on the ffmpeg unknown.**

- **WAVE 1 — Prompt helper (Canvas-only, ships now, zero feasibility risk).** Pure React + `window.callGemini`, precedent `prompts_library_source.jsx`. No ffmpeg/popup/worker. Attacks the biggest lever (you can't edit the render, so the steering prompt *is* the product on the source side). Gate only on Smoke 6.
- **WAVE 0 (parallel) — keystone smoke.** Smoke 0b then Smoke 0. Throwaway ~30-line slice; settles the architecture before anything heavy.
- **WAVE 2 — Accessibility core (Canvas-only, no ffmpeg).** Whisper transcription -> editable draft captions -> **sidecar .srt/.vtt** (49 languages via translate-then-reuse-timecodes) -> transcript/audio export. Use **Whisper, not Moonshine** (Moonshine has no documented timestamp support in transformers.js; timestamps are non-negotiable). Default `whisper-base.en` (or `tiny.en`) with `return_timestamps:true`. Try `WebAudio.decodeAudioData` for audio first; ffmpeg only if the codec won't decode natively.
- **WAVE 3 — Companion ffmpeg editor (GATED on Wave 0).** Trim -> concat/split -> mux translated audio -> (last) burn-in captions & overlay corrected stills, re-encoding **only the affected segment** then concat-copy. Default every path to remux/`-c copy`; treat re-encode as second-class, RAM-gated, progress-barred; warn/disable full-clip 1080p re-encode on low-RAM devices. Schedule the `window.callImagen` exposure (or hand the popup finished PNGs).

### Recommended first slice — the prompt helper (Wave 1)
**Why first:** the only fully code-provable, fully-in-Canvas piece; real classroom value day one; exercises the AI-call path every later phase reuses.

**Definition of done:**
- A React panel with 5-6 UDL-tuned lesson-type prompt presets (explainer, vocab preview, lab safety, SEL scenario, phonics, math worked-example).
- A guided steering-prompt builder (subject, grade band, target length "keep under 3 min", reading level, must-include / must-avoid, "no on-screen text in language X", visual-accuracy guardrail).
- One `callGemini` "improve my prompt" round-trip returning a refined steering prompt.
- A diagnose-and-re-prompt textarea (paste symptoms -> corrected prompt).
- Smoke 6 passed (model returns non-empty text live).
- No ffmpeg, no popup, no worker touched. Verified vs real bytes; deploy held.

## 7. Risks + bottom line
**What could still kill the heavy track (only the heavy track):**
1. **ffmpeg.wasm runs in neither a popup nor the Canvas main frame.** Low probability (Kokoro/Whisper prove the capability set in Canvas; Compare proves CDN-script+worker in a popup). If it fails -> sidecar-only post-production (still most of the accessibility mission).
2. **Chromebook OOM on re-encode.** Real for a 4GB device on single-threaded WASM. Mitigation is architectural: remux-first, segment-only re-encode, device/size gating. Fast remux lane survives; heavy re-encode lane is the casualty.
3. **Sandbox opaque-origin on the popup.** The shipped Compare popup (uses `window.opener` + a CDN worker in prod) is strong evidence against — but host-controlled and invisible in code, so Smoke 0 must confirm.

**Solid regardless:** Wave 1 (prompt helper) + Wave 2 (sidecar captions) have **no ffmpeg dependency** and ship even if every heavy-track smoke fails. The companion-window-with-AI-reach-back mechanism is **already in production** in Compare.

**Go/no-go: GO.** Build Wave 1 now, run Wave 0 smoke in parallel. ~90% of the primitives are code-provable; most already ship here. One cheap ~30-line live test settles the only real unknown, and the failure mode is graceful degrade, not collapse.

**Key files (READ-ONLY for design; `doc_pipeline_source.jsx` is owned by a concurrent agent — do not edit):**
- `view_pdf_audit_source.jsx` — the strongest precedent: companion popup runs a CDN script + worker and bridges to `callGeminiVision` via `window.opener` (`6719`, `6676-6717`, `6801-6812`, `6877-6979`).
- `kokoro_tts_loader.js` — the WASM-in-worker loader to clone for ffmpeg + Whisper (`190`, `328-331`).
- `AlloFlowANTI.txt` — AI plumbing on `window.*` (`317-319`), keyless-Canvas auth (`520-522`, `927-937`), Kokoro lazy-load (`5000-5007`), window.open sites (`8908`, `14091`).
- `doc_pipeline_source.jsx` — companion-window + blob-download + `transcribeMediaToPayload` 'dual' detector (`~4152`, `~4180`, `18837`) — read-only; replicate prompts, do not patch.
