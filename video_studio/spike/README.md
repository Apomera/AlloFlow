# Storyboard render spike (2026-11-07)

Question: can a small, owned compositor + Mediabunny turn a **storyboard JSON** (screen clip, document
page with zoom/highlight, captions, narration) into a finished MP4 **inside a plain browser page**, with
no server, no ffmpeg, and no cross-origin isolation? Spike only: nothing here is wired into AlloFlow.

| File | Role |
|---|---|
| `storyboard.js` | The data contract + validator + WebVTT builder + camera maths + `cameraFromEvents` (auto-zoom from a click log). Pure, no DOM. |
| `compositor.js` | `drawFrame(ctx, storyboard, t, env)`: one frame, pure. Title, screen/document with camera zoom, click ripple, highlight, captions. |
| `render.js` | Assets -> frames -> Mediabunny (WebCodecs) -> MP4 (H.264 + AAC, soft WebVTT track). |
| `index.html` | Test page: capability probe, render button, preview, stats. |
| `make_fixtures.cjs` | Builds fictional test inputs: speaks narration, records a demo page with Playwright (logging clicks), writes `sample_storyboard.json`. |
| `run_spike.cjs` | Opens the page in real browsers via Playwright and saves each MP4 to `out/`. |
| `analyze.cjs` | Checks MP4s with ffprobe/ffmpeg: codecs, clean decode, A/V sync (beeps at the cuts), frame sheet. |
| `storyboard.test.mjs` | `node --test storyboard.test.mjs` (12 tests; Node's runner, not vitest). |
| `vendor/` | Mediabunny 1.65.2 (MPL-2.0), unmodified. |

```
node --test storyboard.test.mjs                     # contract tests
node make_fixtures.cjs                              # needs Playwright (repo root), ffmpeg, Windows SAPI
node run_spike.cjs --browsers=msedge,chrome         # render in real browsers; add --bitrate=1500000
node analyze.cjs out/msedge_no-preference.mp4 --frames
node serve.cjs                                      # then open http://127.0.0.1:8099/ in your own browser
```
Do not run `run_spike.cjs` beside vitest or another Playwright run: the timings are the point.

---

# Tutorial compile tool (2026-11-08): workflow JSON -> narrated, captioned video

Runs the REAL `tutorial_compiler_module.js` (`buildTutorialManifest` + `compileTutorial`) with real adapters, so the
compiler stops being an orphan (nothing else calls `compileTutorial`). No compositor: this is the "mux-only" version.

| File | Role |
|---|---|
| `workflows/*.workflow.json` | The script as DATA: steps, anchors, actions (a list is fine: click/type/press/goto/wait/waitFor), narration, `expect` text, a silent `start.setup`. A step with `fromGuided` takes its wording and anchor from AlloFlow's own guided-mode data. Validated before anything runs. |
| `compile_lib.cjs` | Pure helpers: workflow validation, mapping onto the compiler's `GUIDED_STEPS` shape, loading the real module in a vm, audio mix, WAV, SRT/VTT, transcript. |
| `tts_engines.cjs` | `kokoro` (local, offline after first download, **English only**) or `sapi` (Windows dev fallback). |
| `compile_tutorial.cjs` | The CLI and the adapters (Playwright capture / spotlight / actions, pre-synthesized narration, ffmpeg composite). |
| `verify_compiled.cjs` | Checks the final MP4s with ffprobe/ffmpeg: codecs, clean decode, captions, narration placement, click-to-reaction sync. |
| `login_capture.cjs` | One-time, by hand: save a signed-in browser session for `--auth` (see **Logins and secrets**). |
| `compile_tutorial.test.mjs` | 26 unit tests (`node --test`). Some use the REAL guided-mode data and the REAL compiler module. `storyboard.test.mjs` adds 12. |
| `login_capture.test.mjs` | 4 browser tests of the login capture against a local site (needs Edge/Chrome; `SPIKE_BROWSER=chromium` to change). |

```
npm install                                          # once; kokoro-js (Apache-2.0) lands in spike/node_modules
node compile_tutorial.cjs workflows/demo_tracker.workflow.json
node verify_compiled.cjs compiled/recording-a-progress-monitoring-score/recording-a-progress-monitoring-score.steps.json
```
Outputs in `compiled/<slug>/`: `<slug>.mp4` (soft, switchable mov_text captions), `<slug>.open-captions.mp4` (burned in),
`.vtt`, `.srt`, `.transcript.md` (the written how-to), `.steps.json` (script, timeline, click events, clock calibration).

How the pieces stay honest:
- **Narration first.** Every beat is synthesized BEFORE recording; during the take each beat is held for its real length, so the
  timeline, captions and audio come from the same numbers.
- **One clock.** Playwright's video clock and the compile clock differ by an unpredictable amount per run, so every recording starts
  with a black flash; the flash is found in the video and the video is trimmed to it.
- **Real actions.** Clicks and typing really happen on the page (visible cursor + click ripple drawn in-page). The existing in-app
  "official tutorial" does not: it sets React state directly, so it shows where things are, not how to operate them.

**Demo or sandbox accounts only.** The recording captures everything on screen.

## Logins and secrets (read this before pointing it at a real site)

Workflow files are committed to git, so **no password, token or session may ever be written into one.** The tool enforces it:

```
node compile_tutorial.cjs --login=easycbm --url=https://the-site/     # once: a browser opens, YOU sign in (SSO, MFA, CAPTCHA all work), press Enter
node compile_tutorial.cjs workflows/x.workflow.json --auth=easycbm     # or  "start": { "auth": "easycbm" }  in the workflow
```

- The saved session (cookies + local storage) goes to `auth/<name>.json`, which `.gitignore` excludes. **That file IS the login**: anyone with
  it is signed in as that account until the session expires. Use a demo/sandbox account, never share the file, delete it when the tutorial is done.
  `--login` refuses to write it anywhere git would not ignore it. A session that has expired shows up as a setup step that cannot find its page: run `--login` again.
- If a secret really has to be typed, it comes from the environment, never the file:
  `{ "kind": "type", "selector": "input[type=password]", "textFromEnv": "SITE_PASSWORD" }`. Validation rejects an inline `text` aimed at a
  password-like selector, a missing variable stops the run before anything is synthesized or recorded, and the value is logged as `[redacted]`
  (add `"secret": true` to redact any other typed text). The browser shows typed passwords as dots, but Edge adds a "reveal" eye to password fields: never click it in a workflow.
- URLs are printed without their query or fragment (magic links carry one-time tokens).
- What the tool cannot protect you from: the recording and the failure screenshot show whatever is on screen, so a real teacher's name,
  a real student's name or a real score will be in the video. `compiled/` is git-ignored, but treat `_work/` (kept with `--keep`) as sensitive too.
- Terms: a site's terms may restrict automated access or recording even when they do not mention it. For anything beyond internal staff PD, ask the vendor first.

Two workflows ship: `demo_tracker` (a fictional page, fast, no network) and `alloflow_text_adaptation` (the REAL deployed app,
https://alloflow-cdn.pages.dev/app/, the `source-input` + `simplified` steps of AlloFlow's own guided tour, real clicks and typing, no AI needed).
`node verify_compiled.cjs` passes 17/17 on both, run after run (see the table below for what it can and cannot prove).

## What the first real runs showed (2026-11-08)

- **Narration placement is exact** (0 ms error on 52 of 54 beats, 1-3 ms on the rest). Each clip's silence is trimmed to a 60 ms pre-roll, so captions start on the voice.
- **Playwright's `recordVideo` shows a click late, by an amount that depends on how much of the screen changes** (about 1-90 ms for small changes, 200-510 ms for a
  card expanding or a view loading, and it varies with machine load). Measured: the page's own paint delay is only 6-76 ms, so it is not the app. The start-of-video
  flash calibrates the clocks but is a simple frame, so it does not fully apply to heavy frames. `verify_compiled.cjs` therefore tests what a viewer experiences
  (the click is SEEN to land before its result is described) plus "never early", not a fixed lag ceiling. A different capture method would be needed to remove this.
- **The app must finish loading first.** AlloFlow lazy-loads ~130 modules after boot ("Loading tools... N left"); a click before that finishes silently does nothing.
  `start.setup` waits it out (about 25 s) before recording starts.
- **`expect` caught my own wrong assumption**: I had picked "Word help" from a heading that is in the DOM but not visible. The tool refused it and saved a screenshot.
- **Kokoro is English only** (28 voices: 20 en-US, 8 en-GB; AlloFlow's own loader says `KOKORO_LANGS = new Set(['en'])`). `tutorial_compiler_module.js` claims "50+ languages": wrong.
  Localized tutorials need another engine.
- **Captions**: one caption per beat made 5-line blocks over a quarter of the screen. Beats are now split at sentence boundaries into two balanced lines, timed in proportion to
  their length (no word timings from the engine), and cues touch (a gap would flash a caption-less frame).
- **The existing in-app "official tutorial" does not click anything** (it sets React state directly); this tool performs the real interactions.

Not done: the second half of `simplified` (generating the adapted companion needs AI), zoom/highlight/document pages (the compositor), languages other than English,
Chromebook/Safari, and pacing the clicks DURING the narration (today the instruction is spoken, then the click happens, then the result is spoken).
