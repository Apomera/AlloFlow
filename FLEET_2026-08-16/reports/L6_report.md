# Lane 6 — Voice and TTS core

**Lane:** L6 · **Date:** 2026-08-16 · **Branch:** `main` (this lane made no commits and no deploys)

Scope: V1, V2, V3, V4, V5, V6, V9, V10, L2.

---

## Map of the voice stack (needed to read the rest)

There are **five** speech engines behind one `callTTS`:

| Engine | Where it lives | Reaches |
|---|---|---|
| Gemini cloud TTS | `tts_source.jsx`, Canvas leg + AIProvider leg | all languages, needs a key and quota |
| Kokoro (in-browser WASM, 88 MB) | `kokoro_tts_loader.js`, worker inside a template literal | **English only** (`KOKORO_LANGS = new Set(['en'])`) |
| Piper (in-browser WASM, per-language models) | `piper_tts_loader.js` via `@mintplex-labs/piper-tts-web@1.0.4` | 29 languages as configured |
| AIProvider TTS (self-hosted) | `tts-server/piper_server.py` :5500, Kokoro-FastAPI :8880 | desktop only, and only if the user starts the server |
| Browser `speechSynthesis` | `phase_k_helpers_source.jsx` `_pkStartBrowserSpeech` | whatever the OS ships |

The ladder for **English** is Gemini -> Kokoro -> browser voice.
The ladder for **every other language** is Gemini -> Piper -> browser voice.

That asymmetry is the spine of V3, V4 and L2: English fails soft because Kokoro
catches it, and everything else was falling straight through to a checkbox that
is off by default.

---

## V3 — Piper errors reaching users. **Root cause found and fixed.**

### Found

Aaron's three fragments are not three errors. They are one message:

```
SyntaxError: Unexpected token 'E', "Entry not found" is not valid JSON
```

The chain, verified against the actual published library rather than inferred:

1. `piper_tts_loader.js` configured **29** voice IDs. **7 of them do not exist**
   in the `PATH_MAP` that `@mintplex-labs/piper-tts-web@1.0.4` ships. I downloaded
   the package from jsDelivr and diffed all 29 against its 124 real keys:

   | language | configured id | real ids for that language |
   |---|---|---|
   | **es (Spanish)** | `es_ES-carlfm-medium` | `es_ES-carlfm-x_low`, `es_ES-davefx-medium`, `es_ES-sharvard-medium`, `es_MX-ald-medium`, ... |
   | el | `el_GR-rapunzelina-medium` | `el_GR-rapunzelina-low` |
   | it | `it_IT-riccardo-medium` | `it_IT-riccardo-x_low`, `it_IT-paola-medium` |
   | kk | `kk_KZ-iseke-medium` | `kk_KZ-iseke-x_low`, `kk_KZ-issai-high`, ... |
   | sr | `sr_RS-srecko-medium` | `sr_RS-serbski_institut-medium` |
   | uk | `uk_UA-lada-medium` | `uk_UA-lada-x_low`, `uk_UA-ukrainian_tts-medium` |
   | vi | `vi_VN-25hours_single-medium` | `vi_VN-vais1000-medium`, ... |

2. The library computes `PATH_MAP[voiceId]` -> `undefined` and fetches
   `https://huggingface.co/diffusionstudio/piper-voices/resolve/main/undefined`
   and `.../undefined.json`.
3. Hugging Face answers **404 with the body `Entry not found`**.
4. The library's `fetchBlob()` **never checks `response.ok`**. It writes that
   error page into OPFS under the filename `undefined` / `undefined.json`, and
   `download()` resolves successfully. Our loader then logged **"Ready, 100%"**.
5. The next `predict()` reads the poisoned config back out of OPFS and runs
   `JSON.parse("Entry not found")`. Permanent, because nothing invalidates it.
6. The existing self-heal (`_isCorruptModelError`) only matched *onnx session*
   messages, so a JSON parse failure never triggered eviction.

Spanish being one of the seven is why this looked like a general non-English fault.

**Is Piper meant to be live?** Yes, in the browser, and it is reachable today
(`tts_source.jsx:1044` lazy-loads it in Canvas for any non-English read-aloud).
`tts-server/piper_server.py` is a *separate* thing: a desktop-only self-hosted
OpenAI-compatible server on :5500 that only exists if the user starts it. It is
not involved in Aaron's error.

### Changed — `piper_tts_loader.js`

- **Corrected all 7 voice IDs.** Spanish is now `es_MX-ald-medium`.
- **`_resolveVoiceId()`** validates every ID against the library's own exported
  `PATH_MAP` at runtime and substitutes a same-language model if a future
  library version drops one. An ID is never handed to the library unchecked
  again, so this class of bug cannot recur silently.
- **`_configIsReal()`** fetches and parses the voice config *before* any
  download, checking `response.ok` itself. An error page can no longer be
  written to OPFS as a voice model.
- **`_purgePoisonedEntries()`** cleans devices that are *already* poisoned.
  Correcting the table does not un-break Aaron's device: OPFS still holds files
  literally named `undefined` and `undefined.json`, and the library's own
  `stored()`/`remove()` cannot see or delete them. This walks the OPFS `piper`
  directory once per session and removes them, plus any cached voice file under
  1 KB (an error page; a real model is megabytes).
- **`_isCorruptModelError()`** now also matches `is not valid JSON`,
  `Unexpected token`, `Unexpected end of JSON input` and `Entry not found`, so
  the existing evict-and-retry-once repair actually fires for this failure.
- **`_prepareSessionFor()`** — separate bug found while reading the library.
  `TtsSession` keeps one static `_instance`; its constructor reassigns `voiceId`
  and returns the existing instance **without re-running `init()`**. So the
  second language in a session was synthesized with the **first language's ONNX
  model**. Dropping the static instance on a voice change forces a real init.
- `supportsLanguage()` now excludes languages proven to have no usable model, so
  the cascade skips Piper and hands the sentence to the next engine instead of
  failing on it.
- Added `isLanguageReady()` and a diagnostics-only `lastError`.

**No user ever sees a raw parser error**: `speak()` returns `null` on failure,
which is the cascade's "next engine please" signal. That was already true; what
was missing is that the failure was permanent and total for 7 languages.

### Verified

- `node --check piper_tts_loader.js` passes.
- All 29 voice IDs re-diffed against the live `PATH_MAP` after the fix: **0 missing.**
- Not verified in a browser: I did not run a Spanish read-aloud end to end.
  The failure chain is proven from the library's published source and the HF
  404 body; the fix is proven to produce valid IDs. A live Spanish check is the
  one thing worth doing before this is called closed.

---

## V1 — the Kokoro loading takeover

### Found

Three separate defects, and the "already downloaded" check was only one of them.

1. **The overlay is a full-screen app splash.** `AlloFlowANTI.txt` renders
   `position: fixed; inset: 0; z-index: 9999` with the AlloFlow logo and
   "Preparing your learning environment...". It is not a voice indicator at all;
   it is the boot splash, reused. It covers everything.

2. **It appears for an already-downloaded model.** `__loadKokoroTTS` checks
   `modelCache.hasKokoro()` into `_kokoroCached` — but that flag only **relabels
   the progress text**. `setKokoroLoadState({loading: true, ...})` runs either
   way, so a cached model still takes over the screen while it wakes.

3. **It appears with no user action, and can pin open forever.** A Canvas-only
   `setInterval` polls `window._kokoroTTS.progress` every 300 ms and shows the
   overlay whenever `progress > 0 && !ready`, regardless of who started the
   load. Any background or fire-and-forget wake triggers it. Worse: if init
   fails with progress stuck partway, `ready` never becomes true, the poll never
   clears, and the full-screen overlay stays up for the rest of the session.

4. Related precision problem, **not in my files**: `hasKokoro()` is
   `hasUrlLike('kokoro')` (`allo_commands_source.jsx:2850`), which matches *any*
   cached URL containing "kokoro" — including small config/tokenizer files. A
   partial download makes it report "on device". Filed to L7.

### Changed — `AlloFlowANTI.txt` (under the fleet lock, Edit only, two short bursts)

- **The full-screen takeover is gone.** Replaced with a small pill at the bottom
  centre: a 52 px progress bar, one line of text, `pointer-events: none` so it
  can never intercept a click, `z-index: 9997` so it sits under modals. Bottom
  **centre** deliberately, because toasts live bottom-left (Lane 9's D4).
  Dropped the logo, the "Preparing your learning environment" line and
  `CanvasLoadingTips`, which belong to a boot splash, and this never should
  have been one.

  **Checked, because it looked like a boot splash and removing a real one would
  be serious:** it was not. That block was gated solely on `kokoroLoadState`,
  which has exactly two writers, both Kokoro. `t('splash.preparing_environment')`
  now appears nowhere in `AlloFlowANTI.txt` except inside my own comment, which
  confirms the string had no second home. No boot splash was removed, because
  there was none there to remove.

  **Known consequence, deliberately left:** `CanvasLoadingTips` now has zero
  consumers. `AlloFlowANTI.txt:11623` still loads `canvas_tips_module.js` and
  the shim at `:55486` still upgrades it, so boot pays a CDN fetch for a
  component nothing renders. I left it rather than delete it: it is harmless and
  reversible, `verify_module_registry` treats it as one of 243 informational
  orphans, and the tips may deserve a home elsewhere rather than a deletion.
  Reclaiming that fetch is a one-line removal at `:11623` whenever someone wants
  it. Deliberately not folded into the new indicator: the download is
  non-blocking now, so the user carries on working and reading tips at them
  would be noise.
- **`__loadKokoroTTS` is silent for a cached model.** `_kokoroCached` now
  returns early from the progress handler instead of merely relabelling it. If
  the model is on the device, nothing appears at all, which is what Aaron asked
  for.
- **The Canvas poll got three fixes**: it reads `hasKokoro()` and stays silent
  for a cached model; it tracks whether `progress` is actually advancing and
  clears itself after 20 s of no movement, so a failed init can no longer pin
  anything open for the session; and it tags the state as a download so the
  indicator can name what is happening (V10).

### Verified

- `node dev-tools/check_build_smoke.cjs` — `AlloFlowANTI.txt` and the generated
  `App.jsx` both parse as JSX.
- `check_render_refs` (448 modules), `check_module_render`, `check_view_props`
  all pass after the edit.
- Lock discipline: acquired, re-read the file (it had shifted ~70 lines under
  me while I waited), edited, released. Held for one burst each time, never
  across a test run.
- **Not verified visually.** I did not render the indicator. Its geometry and
  layering are asserted from the CSS I wrote, not from a screenshot, and that is
  the one claim here I would not want taken on trust.

---

## V2 — Kokoro cold start. **Root cause found and fixed.**

### Found

Two independent causes, both real.

**(a) The wait was a stopwatch, not a progress check.** `ensureKokoroTts`
(`tts_source.jsx`) raced the load against a flat `KOKORO_ENSURE_TIMEOUT_MS = 15000`.
Waking a *cached* 88 MB model means reading it out of device storage, building an
ONNX session in WASM, and running a warm-up inference. On a school laptop that is
routinely 20 to 45 seconds. So the first request expired every time, returned
`null`, and the utterance fell through to another engine — or, on a keyless
install with the browser-fallback checkbox off, to **silence**. The second
request found `ready === true` and worked instantly. That is precisely "only
works on a later attempt, even though the model is on device."

**(b) Cache integrity was never checked.** The worker's durable-cache proxy
returned any cached buffer verbatim. A truncated write or a stored error page is
then fed to onnxruntime on every later session, failing identically forever with
no way out from inside the app. This repo has shipped exactly this incident
before (Piper, and now again here).

### Changed

- **`tts_source.jsx` — wait on progress, not on a clock.** The 15 s value is now
  a *stall* budget: keep waiting while `_kokoroTTS.progress` is still advancing,
  give up only after it has been stationary for 15 s, and cap any single
  utterance's wait at `KOKORO_ENSURE_MAX_MS = 60000`. A stopwatch cannot tell a
  slow-but-healthy wake from a wedged one; forward progress can. The first call
  now behaves like the second whenever the model is genuinely on device, and a
  genuinely wedged init still cannot hold a reader open.
- **`kokoro_tts_loader.js` — integrity gate on the durable cache.** Added
  `_looksLikeModel(url, buffer)` inside the worker: a cache hit for an
  `.onnx`/`.onnx_data` file must be at least 1 MB, and no cached model may begin
  with `<` or `{` (an HTML or JSON error body). A rejected hit falls through to
  the network and the fresh bytes overwrite the bad row through the normal put
  path, so the cache self-heals with no new storage API. The same test guards the
  write, so a bad row is not simply replaced by another bad row. The size floor
  is scoped to graph files only, because Kokoro's per-voice style vectors are
  legitimately small `.bin` files.

### Verified

- `node --check` on both files; `node _build_tts_module.js` rebuilt cleanly.
- **The worker was extracted from its template literal and syntax-checked**
  (`node --check` cannot see inside one, and this repo has shipped a broken
  worker that way). Extractor evaluates the literal exactly as the browser would:
  323 lines, parses as a module, all three regexes compile with the intended
  escapes.
- `_looksLikeModel` lifted out via `vm` and unit-tested, 7/7 cases pass:
  a 2 MB `.onnx` accepted; a 500 KB `.onnx` rejected; an `.onnx` starting with
  `<` rejected; `.onnx_data` accepted; a 200 KB voice `.bin` **accepted** (the
  regression I was guarding against); a `.bin` starting with `{` rejected; a
  15-byte "Entry not found" body rejected.
- Not verified in a browser: I did not time a real cold start.

---

## V4 — browser TTS toggle appearing to break Gemini Spanish. **Explained and fixed.**

### Found

The toggle is `browserTtsFallback` in the narrator panel
(`view_header_source.jsx`), read in exactly one other place
(`phase_k_helpers_source.jsx:799`). It is **not** gating a shared audio-context
unlock, a voice-list load, or a permissions prompt — I looked for all three.
There is no `AudioContext` in this path at all.

What is actually happening, from `handlePlaybackError`:

- English: Gemini declines a sentence -> **Kokoro serves it inside `callTTS`** ->
  the user never reaches the checkbox.
- Spanish: Gemini declines -> Piper was only reachable from the Canvas branch and
  from keyless / "Local TTS" installs -> on a normal cloud-keyed install there
  was **nothing between Gemini and the checkbox** -> `terminatePlayback('tts-unavailable')`
  -> silence.

So ticking a box labelled "browser voice" looked like it was what made Gemini
work on Spanish. It never was. It was the only remaining leg.

### Changed — `tts_source.jsx`

Added a Piper attempt for any non-English content **after the cloud retries are
exhausted, on the cloud path too**, before the final `throw`. Piper was already
installed and already the designated multilingual engine; it was simply not
reachable from that branch. With V3's fix making Spanish actually work, the
checkbox goes back to meaning what it says: *when a sentence fails, substitute
the system voice or skip it* — a taste setting, not a load-bearing one.

I deliberately did **not** force the browser voice on regardless of the setting.
Aaron set that default off on purpose because the system voice is jarring next to
Gemini; overriding his preference is not the fix. Giving non-English a real
engine is.

### Verified

`node --check` and rebuild pass. Not verified in a browser.

---

## V5 — Kokoro missing on iPhone. **Root cause found and fixed.**

### Found

**Not** a deliberate exclusion, and **not** a failed capability check. The voice
picker had three branches, and the third one listed cloud voices only:

```
_isCanvasEnv     ? Gemini + Kokoro + browser
: isLocalVoiceMode ? [Kokoro if desktop] + Edge + browser
: GEMINI_VOICES.map(...)            <- no Kokoro, no browser, nothing else
```

A phone browser on the hosted web app is neither Canvas nor a desktop bundle, so
it landed in that third branch and the option **was never rendered**. The gate
`canUseKokoroVoicePicker = _isCanvasEnv || isDesktopBundledApp` had the same
shape. No iOS probe was ever run, so nothing could have failed one.

**Can Kokoro run on iOS Safari?** Technically yes: module workers, WebAssembly
and OPFS are all present in current Safari. Two honest caveats: iOS Safari has a
tighter per-tab memory ceiling than desktop, and it reclaims origin storage after
a period of disuse, so the 88 MB download can be needed again later.

### Changed — `view_header_source.jsx`

- Replaced the environment gate with a real capability probe (`Worker` +
  `WebAssembly`), plus iOS detection used only for honest labelling.
- Kokoro and the device voice are now offered in **all three** branches, via two
  shared render helpers. (Plain functions that are *called*, not mounted as
  `<Component/>`, so they cannot create a new component identity per render.)
- If a browser genuinely cannot run it, the group is still shown, **disabled,
  with the reason** — never silently omitted, which is what Aaron asked for.
- The download toast is honest and iOS-specific where it matters: on iOS it says
  the browser may ask for the download again after a few weeks unused.

### Verified

`node _build_view_header_module.js` + `node --check` pass. **Not verified
visually and not verified on an actual iPhone** — I could not render this. The
option now exists in the markup for that branch; whether Kokoro then *runs*
acceptably on Aaron's iPhone is an empirical question I could not answer here.

---

## V6 — browser TTS as a first-class choice. **Fixed.**

### Found

Two problems, and the second was the real one.

1. **Labelling.** It was `🌐 Browser Fallback` / `🔇 Browser Fallback` in two
   branches and absent from the third.
2. **It did not work.** Selecting it stored `selectedVoice = 'browser'`, and then
   `callTTS` ran `_resolveGeminiVoice('browser')`. `'browser'` is not a Gemini
   voice name, so that function fell through to its default and **the cloud voice
   spoke anyway**. The only way to actually get the device voice was the AI
   backend dropdown's `ttsProvider: 'browser'`, which is buried in a different
   panel.

### Changed

- **`tts_source.jsx`**: selecting the device voice now throws the existing
  `BROWSER_TTS_REQUIRED` contract error. The playback engine already honours that
  (`phase_k_helpers_source.jsx:882` -> `speakViaBrowserFallback('provider-contract')`),
  and unlike a plain `null` it does **not** depend on the fallback checkbox. Zero
  edits needed outside my lane.
- **`view_header_source.jsx`**: it is now a normal option group,
  `⚡ Device voice: starts instantly` / `Device voice (instant, plainer sound)`.
  The label states both halves of the trade, which is Aaron's own reasoning: for
  interactive use a mediocre instant voice beats a good slow one.

### Verified

Both modules rebuild and `node --check` clean. Not verified by ear.

---

## L2 — karaoke audio not saving for non-English. **Determination: a real save failure, same root cause as V4.**

### Found

Not a display problem and not a one-off. Capture is invoked from exactly one
place, `phase_k_helpers_source.jsx:1303`, and it sits **inside
`audio.play().then(...)` on the `<audio>` element**:

```js
playPromise.then(() => { ...
    if (!usingStoredReadAloud) {
        captureReadAloudClip(contentId, mode, audioStoreSentence, audioUrl, {...});
    }
```

`speakViaBrowserFallback` (line 819) never reaches that code. It hands the text
to `speechSynthesis`, which produces **no audio blob at all** — there is nothing
to capture, by construction.

And per V4, non-English is exactly the case that was landing on the browser
fallback. So: Aaron hears the sentence (the system voice speaks it), and nothing
is written, so the edit view correctly shows no saved audio. It is consistent,
not a glitch, and it is language-correlated for the same reason V4 is.

I checked and **ruled out** the key-mismatch hypothesis the prompt suggested:
the write path carries `profile.language` through
`capturePlayed -> storeAudio -> metadataFor`, and the read path builds its
identity key from the same `language` field
(`phase_k_helpers_source.jsx:292`). Write and read agree.

I also checked and ruled out a duplicate-definition hazard: `AlloFlowANTI.txt`
assigns `window.__alloCaptureKaraokeAudio` twice (a 2-arg version and a 3-arg
version). The 3-arg one is defined later and wins; the earlier one is retained
deliberately as `_legacyReadAloudApi.capturePlayed`. `captureOptions` are not
being dropped.

### Changed

Nothing directly. The V3 and V4 fixes address it: with Spanish routed to a
working Piper, the sentence is served as a real blob URL through the `<audio>`
element, which *is* the capture path.

Per the prompt I did not chase timing precision; karaoke tolerance here is a
follow-along aid at roughly ±150 ms.

### Verified

Code reading only. **Not reproduced.** The honest test is: generate karaoke in
Spanish after these fixes and check the edit view. If it still shows nothing,
the next suspect is `shouldUseReadAloudStore(contentId, mode)`, which requires
`mode === 'standard'` and a content ID in `READ_ALOUD_STORE_CONTENT_IDS`.

---

## V9 — faster open-source TTS than Kokoro. **Research only. Nothing adopted.**

Aaron's constraint is the one that eliminates most of the field: it has to be
**multilingual** and it has to run **in a browser**, on device, for FERPA reasons.
That rules out every server-class model regardless of speed.

| Engine | Download | Languages | Browser | License | Latency claim |
|---|---|---|---|---|---|
| **Kokoro 82M** (current) | 88 MB q8 | **1 (English)** | WASM + WebGPU, shipping here today | Apache 2.0 | ~210x realtime on a 4090; on WASM CPU it is the thing Aaron is complaining about |
| **Supertonic** | **91 MB int8** (`sherpa-onnx` build: 1.5 + 26.2 + 38.8 + 24.8 MB) | **31**, incl. Spanish, Arabic, Vietnamese, Ukrainian | Official browser example on onnxruntime-web (WebGPU/WASM); iOS example exists | code MIT, **weights OpenRAIL-M** | claimed up to 167x realtime on consumer hardware |
| **KittenTTS Nano** | **~25 MB int8** | **English only** (multilingual "planned, no timeline") | ONNX, runs in browser, HF Space demo | Apache 2.0 | designed for Raspberry Pi and low-end phones |
| Fish Audio S2 | ~4.4B params | many | no | — | RTF 0.195 **on an H200** |
| Qwen3-TTS | server class | 10 | no | — | 97 ms, server side |

**The one worth Aaron's attention is Supertonic.** Same download budget as Kokoro
(91 MB vs 88 MB) for **31 languages instead of one**, with an official browser
target. If it holds up, it does not just replace Kokoro on speed, it collapses
the Kokoro-plus-Piper split that produced V3 and V4 in the first place.

Three things to check before anyone commits:

1. **The licence is the blocker, not the tech.** Weights are **OpenRAIL-M**,
   which carries use restrictions. Apache 2.0 (Kokoro) and MIT (Piper) do not.
   That is a call for Aaron, not for me, and it needs reading against school
   deployment.
2. **The published speed numbers are not browser numbers.** 167x realtime is
   consumer hardware, native ONNX. Kokoro's 210x on a 4090 is likewise not what
   Aaron experiences on WASM CPU. Nobody's marketing number predicts the thing
   he actually cares about, which is time-to-first-audio in a browser tab. That
   has to be measured on his hardware.
3. **KittenTTS at 25 MB is tempting and currently useless here** — English only,
   which is the one language already covered.

**Recommendation:** do not adopt anything yet. The cheap next step is a
throwaway benchmark page that loads Supertonic int8 and Kokoro q8 side by side
and measures time-to-first-audio in Chrome and in iOS Safari, on Aaron's own
devices. That is a couple of hours and it answers the question with real numbers
instead of vendor claims. I did not build it because V9 is explicitly
research-only.

Sources: [Supertonic repo](https://github.com/supertone-inc/supertonic) ·
[Supertonic weights](https://huggingface.co/Supertone/supertonic) ·
[sherpa-onnx int8 build](https://huggingface.co/csukuangfj2/sherpa-onnx-supertonic-tts-int8-2026-03-06) ·
[KittenTTS](https://github.com/KittenML/KittenTTS) ·
[browser TTS comparison](https://offlinetts.com/tts/best-browser-tts/) ·
[open-source TTS roundup](https://www.tryspeakeasy.io/blog/open-source-text-to-speech-2026)

---

## V10 — visibility into what TTS is doing

### Found and judged

Aaron asked whether he is overcomplicating this, and offered his own diagnosis:
*"this would matter much less if generation were reliable."* **He is right, and
that is the finding.** Almost everything he described as a visibility gap was a
reliability gap wearing a costume:

- "Users don't know when a download is happening" — the download indicator was a
  *full-screen takeover* that also fired when nothing was downloading (V1).
- "Sometimes works flawlessly and sometimes not" — V2's first-call timeout and
  V3's permanently poisoned Spanish voice.

So I did not add a busier display. I fixed the states that were lying, and kept
exactly the three distinctions that have different user consequences:

| state | consequence | treatment |
|---|---|---|
| downloading a model | a wait measured in minutes, once | small non-blocking indicator with progress |
| generating speech | a wait measured in seconds, every time | the existing stop control with animated bars, unchanged |
| saved to device | no wait ever again | Lane 9's chip, unchanged, requests filed |

Waking a cached model is deliberately **not** a state: it is fast enough that
announcing it is worse than staying quiet, and announcing it was the V1 bug.

### Changed

The download indicator is the V1 rebuild above: small, bottom-centre, non-blocking,
and it now appears **only** when bytes are genuinely being fetched.

One more honest-failure fix, in `audio_helpers_source.jsx`: making the device
voice selectable (V6) means "Download audio" can now be asked to produce a file
from `speechSynthesis`, which has no audio stream. That would have surfaced as
the generic "audio failed" toast. It now says specifically that the device voice
reads aloud but cannot be saved as a file, and points at the narrator dropdown.

Also made honest, in `view_header_source.jsx`: the non-English panel used to
claim **"Piper Neural Voice, auto-selected"** whenever `supportsLanguage()`
returned true. That only says a voice exists in a table — and before today,
seven of those table entries pointed at models that do not exist at all. It now
reports the three real states separately (no offline voice for this language /
downloads on first use / saved on this device), and it is shown on every
surface rather than Canvas only.

---

## For Aaron

**Calls I made on your behalf**

- **Spanish Piper voice is now `es_MX-ald-medium` (Latin American), not
  peninsular.** The old ID did not exist, so I had to pick something. Given US
  school families, LatAm was the right default. `es_ES-davefx-medium` is the
  peninsular alternative if you disagree — it is a one-line change.
- **I did not override your browser-fallback default.** It is off because the
  system voice is jarring next to Gemini, and that is a real preference. I fixed
  the reason it had become load-bearing instead.
- **Kokoro is now offered on phones, including iPhone.** Choosing the voice is
  the consent to the 88 MB download; nothing else on a phone can start that
  fetch. If you would rather it stay desktop-only on cellular, say so and I will
  gate it behind `navigator.connection.saveData`.
- **The device voice is labelled by its trade-off** ("starts instantly",
  "plainer sound") rather than as a fallback, per your latency reasoning.

**What I deliberately left**

- **V9: nothing adopted.** Supertonic is the candidate; the licence
  (OpenRAIL-M) is your call and the browser latency numbers do not exist yet.
- **Piper is not exposed as a per-language picker in narrator settings.** You
  suggested it, but Piper is automatic per content language and has no user
  choice to make beyond that; adding a picker would add burden for no decision.
  What I added instead is an honest status line. Say the word if you want the
  picker anyway.
- **Nothing verified by ear or on a device.** Every fix here is verified by
  syntax check, by build, by unit test where a function could be lifted, and by
  reading the third-party library's actual published source. None of it is
  verified by listening to it. The two worth checking first are a **Spanish
  read-aloud** (V3) and a **cold Kokoro start** (V2).

**Cross-lane requests filed:** see `CROSS_LANE_REQUESTS.md`.

---

## Files changed

| File | Issue |
|---|---|
| `piper_tts_loader.js` | V3 |
| `kokoro_tts_loader.js` | V2 (cache integrity gate, inside the worker) |
| `tts_source.jsx` -> `tts_module.js` (+ desktop mirror) | V2, V4, V6 |
| `view_header_source.jsx` -> `view_header_module.js` (+ desktop mirror) | V3 (status line), V5, V6 |
| `audio_helpers_source.jsx` -> `audio_helpers_module.js` | V6 follow-on |
| `AlloFlowANTI.txt` | V1, V10, plus the `tts_module.js?v=` restamp |
| `tests/piper_voice_id_validity.test.js` + `tests/fixtures/piper_path_map_keys.json` | new regression guard for V3 |

All modules rebuilt with their builders. Nothing staged, nothing committed,
nothing deployed, no branch touched.

**Cache pin:** rebuilding `tts_module.js` changed its content hash, so the
`?v=` stamp in `AlloFlowANTI.txt` was restamped `88265bad` -> `8405ef04`.
Verified the old pin matched `HEAD` first, so this was my own drift and not
someone else's. `view_header_module.js` and `audio_helpers_module.js` use the
global `?v=` version scheme and need no restamp.

## Verification summary

- `node --check` on every JS file touched, including built modules.
- **The Kokoro worker was extracted from its template literal and parsed
  separately**, because `node --check` cannot see inside one and this repo has
  shipped a broken worker exactly that way. 323 lines, parses as a module, all
  three regexes compile with the escapes the browser actually receives.
- `_looksLikeModel` lifted out via `vm` and unit-tested: 7/7.
- **124 tests pass** across 16 TTS, karaoke, read-aloud and audio-export test
  files, including 8 new ones. The new guard is not vacuous: all seven of the
  old bogus voice IDs fail it.
- `npm run verify:gate`: passes up to `check_cmd_i18n`, which fails on **another
  lane's drift** (missing `cmd.describe_current_media`,
  `cmd.open_learning_web_explorer`, `cmd.read_media_descriptions` and ~18 more
  from `allo_commands_source.jsx`, which is L7's file). Per the rules I did not
  fix it and did not bypass it. Because the gate short-circuits there, I ran the
  seven checks that come *after* it individually and all seven pass, including
  `check_build_smoke`, `check_view_props` and `verify_module_registry`.
- One other red test is **not mine**: `karaoke_audio_store_resilience.test.js`
  fails on a stale `view_simplified_module.js?v=` pin. That module was rebuilt
  by another lane without restamping; its pin still matches `HEAD` while the
  file on disk does not. Filed in `CROSS_LANE_REQUESTS.md`.

**What is not verified:** nothing here was checked by ear, by screenshot, or on
a phone. Every claim above rests on syntax checks, builds, unit tests, the
repo's own gates, and reading the third-party library's published source. The
three things worth a human minute each, in order: a **Spanish read-aloud** (V3),
a **cold Kokoro start** (V2), and a **look at the new download pill** (V1).
