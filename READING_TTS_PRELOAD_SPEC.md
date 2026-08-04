# Reading Library — TTS Preload, Persistence, and "Read It Yourself First"

Spec date: 2026-08-04
Status: proposed, not implemented
Scope: `reading_library_module.js`, `tts_source.jsx`, `AlloFlowANTI.txt`, `dev-tools/`

---

## 0. Current behavior (verified, not assumed)

**Playback path.** `reading_library_module.js:294 speak()` → `window.AlloSpeechPlayer.speak(text, {language})`
(`AlloFlowANTI.txt:4553`) → `callTTS` → Gemini TTS → Kokoro → browser `speechSynthesis`.

**Cache.** `state.urlCache` — an in-memory `Map` of blob URLs, capped at
`URL_CACHE_MAX_ENTRIES = 150` with insertion-order LRU eviction (`tts_source.jsx:133-151`).
Cache key is `JSON.stringify([text, voiceName, language, 'natural-rate-v1'])`
(`tts_source.jsx:1010`; Canvas branch builds the identical key at `:656`).
There is **no** `indexedDB`, Cache API, or any other persistence in `tts_module.js` —
a page reload discards every synthesized clip and the next play re-bills it.

**Request lanes.** `fetchTTSBytes` (`tts_source.jsx:251`) already serializes into two
lanes: `state.interactiveQueue` when `priority === 'interactive'`, else `state.queue`
(`:261`). The comment at `:256-260` says this exists precisely so bulk warm-ups cannot
make a Play click look frozen. Nothing in the reading library uses it yet.

**In-flight de-dupe.** `callTTSInFlight` (`tts_source.jsx:548`) already coalesces identical
uncancellable requests, with a comment naming "karaoke playback racing a look-ahead warm"
as the motivating case.

**Pre-baked narration is already a first-class reader feature.**
- `book.audio.src` + `book.audio.cues` (`[pageNumber, startSec, endSec]`) — whole-book track
  with page sync (`reading_library_module.js:1438-1439`, cue lookup at `:1659-1671`).
- `book.audio.mode === 'perPage'` + `page.audio = [{src, dur}, …]` — ordered clip queue per
  page, auto-turning at page end (`:1441-1444`, src collection at `:626`).
- `hasAudioTrack` and `hasCues` are independent, so a track without timings still plays.

**Catalog scale** (measured 2026-08-04 from `reading_library/index.json`):

| Metric | Value |
|---|---|
| Text books (core index) | 2,914 |
| Link-only cards | 3,880 |
| Mean pages/book | 14.0 |
| Mean characters/book | 2,657 |
| Books already carrying `audio` | ~18% of sample (StoryWeaver, remote-hosted) |

Whole-catalog synthesis ≈ 7.7M characters ≈ ~145 hours ≈ ~4 GB at 64 kbps mono.
Against a Pages deploy with a known 20,000-file ceiling, a full bake is not viable.
Everything below is designed around that fact.

**Licenses** (core index): 1,940 CC BY 4.0 · 295 CC BY · 248 CC BY-NC-SA 4.0 ·
185 PD/Gutenberg · 40 CC0 · ~90 other NC variants · **7 CC BY-NC-ND** · rest PD/agency.

---

## Phase 1 — Look-ahead prewarm in the reader

No storage, no rights questions, no new files. Biggest perceived-latency win per line of code.

### 1.1 Fix the lane assignment first (prerequisite)

`AlloSpeechPlayer.speak` currently calls `callTTS(text, voice, 1, {maxRetries: 2, language, signal})`
(`AlloFlowANTI.txt:4572`) with **no `priority`**, so interactive playback defaults to `'normal'`
and rides the *same* lane a prewarm would use. Adding prewarms without fixing this would let a
speculative fetch sit in front of a Play click — the exact failure the two-lane design exists
to prevent.

Change (`AlloFlowANTI.txt:4572`, **both copies**):

```js
const url = await callTTS(text, voice, 1, {
  maxRetries: 2, language, signal, priority: 'interactive', reason: 'speech-player',
});
```

**Scope note: this is an app-wide change, not a reading-library one.** `AlloSpeechPlayer` is
the shared read-aloud path (SpeakButton, persona chat, DBQ, popups — see the comment at
`AlloFlowANTI.txt:4464-4468`), so every consumer moves to the interactive lane. That is the
correct classification — every `AlloSpeechPlayer.speak` call is a user-triggered play — and the
lane's shorter watchdog (`TTS_FETCH_TIMEOUT_INTERACTIVE_MS`) is designed for exactly this
traffic. But it should land as its own commit with its own smoke pass, not folded silently
into the reader diff.

### 1.2 Prewarm helper

Add next to `speak()` in `reading_library_module.js:294`:

```js
// Speculative synthesis for the page we are about to show. Deliberately does
// NOT play — it only lands the clip in the TTS urlCache so the next real
// speak() is a cache hit. Rides the background lane so it can never delay a
// Play click (interactive playback owns state.interactiveQueue).
function prewarm(text, language) {
  if (!text) return;
  if (typeof window.callTTS !== 'function') return;
  if (window.__alloIsGlobalMuted && window.__alloIsGlobalMuted()) return;
  // MUST match AlloSpeechPlayer's voice resolution or the cache key differs
  // and the warm is wasted (key = [text, voice, language, 'natural-rate-v1']).
  var voice = window.__alloSelectedVoice || 'Kore';
  try {
    window.callTTS(text, voice, 1, {
      language: language,
      priority: 'normal',
      maxRetries: 0,          // speculative work never retries
      reason: 'reading-lookahead',
    }).catch(function () { /* speculative: silence is correct */ });
  } catch (_) {}
}
```

**Voice-resolution invariant.** `AlloSpeechPlayer.speak` resolves
`o.voice || window.__alloSelectedVoice || 'Kore'` (`AlloFlowANTI.txt:4563`) and the reader's
`speak()` passes no voice. `prewarm` must use the identical expression. `callTTS` applies
`_resolveGeminiVoice` *before* building the key, so passing the same input yields the same key.
**If this drifts, the feature silently does nothing while doubling API spend.** Test it (§6).

Mute gate: `window.__alloIsGlobalMuted` already exists (`AlloFlowANTI.txt:5272`) — no new
export needed. It is a top-level assignment evaluated at monolith load, so it is defined well
before any reader interaction. (Redundant with `callTTS`'s own internal mute check, but it
keeps a muted session from even enqueueing speculative work.)

**Load-order note.** `window.callTTS` is assigned only inside `_upgradeTTS()`
(`AlloFlowANTI.txt:3607`) — i.e., only after the TTS CDN module loads. Before that, it is
`undefined` (the monolith's pre-upgrade stub is closure-scoped, not on `window`). The
`typeof window.callTTS !== 'function'` guard is therefore load-bearing, not defensive
boilerplate: a prewarm attempted before module upgrade silently no-ops, which is the correct
behavior. Do not "simplify" it away.

Provider gate: when `ttsProvider` is `off` or `browser`, `callTTS` itself returns `null`
before any network work (`tts_source.jsx` provider policy check), so prewarm needs no
separate check — but the §6 tests must assert no fetch occurs in those modes.

### 1.3 Wire it

In `ReaderModal`, after the existing `pageIdx` effect (`reading_library_module.js:1535`):

```js
// Warm the next page's audio one page ahead. Skipped entirely for books with
// real narration (human audio already exists — synthesizing over it wastes
// quota and is the worse experience).
var prewarmedRef = useRef('');
useEffect(function () {
  if (hasAudioTrack || hasPageAudio) return;
  var next = pageIdx + 1;
  var max = sourcePages.length - 1;
  while (next <= max) {
    var src = sourcePages[next];
    var text = txReady ? cleanReadingText((src && src.text) || '') : pageTextForPipeline(src);
    if (text) {
      var tag = book.slug + '|' + next + '|' + displayLanguage;
      if (prewarmedRef.current !== tag) { prewarmedRef.current = tag; prewarm(text, displayLanguage); }
      return;
    }
    next++;
  }
}, [pageIdx, sourcePages, txReady, displayLanguage, hasAudioTrack, hasPageAudio, book.slug]);
```

Also warm page N+1 at the moment auto-read *starts* (`toggleAutoRead`, `:1637`), so the very
first page turn is already covered.

Note on the dependency array: when a translation is active, `sourcePages` is rebuilt by `.map`
every render (`reading_library_module.js:1457-1459`), so this effect re-runs more often than
`pageIdx` changes. That is fine — the `prewarmedRef` tag makes re-runs free — and it is why the
dedupe is a ref-tag rather than relying on effect timing. Don't "optimize" the deps instead.

### 1.4 Deliberate non-goals for Phase 1

- **No AbortController.** Passing a signal bypasses the in-flight de-dupe
  (`tts_source.jsx:1016` short-circuits before the join logic). A prewarm that outlives the
  closed book is harmless — its result lands in cache and costs nothing further.
- **One outstanding prewarm at a time**, enforced by `prewarmedRef`. No queue, no depth knob.
- **No prewarm during auto-read's own chain.** The chain already speaks page N+1 immediately
  on finish; the §1.3 effect fires on `setPageIdx` and covers N+2 naturally.

---

## Phase 2 — Persistent audio cache (IndexedDB)

Turns the memory cache into a device-local one that survives reload. This is what makes a
6,800-entry catalog survivable: you keep what a child actually read, not what exists.

**Canvas caveat — verify before building.** The primary surface is the Gemini Canvas iframe.
`localStorage` demonstrably works there (reader prefs already persist), but IndexedDB in a
sandboxed third-party iframe is at best origin-partitioned and may be cleared between Canvas
sessions — in which case Phase 2 still helps within a session (the 150-entry memory cap stops
mattering) but delivers its real value only on the desktop app and direct-web surfaces. First
implementation step: a 5-minute probe in Canvas (write a blob, reload, read it back). If
Canvas storage proves ephemeral, that changes Phase 3's pitch on Canvas ("saved for this
session", or hidden there) — not the architecture.

### 2.1 Store

Implemented inside `tts_source.jsx` so all three cache-check sites share it.

- DB `allo-tts-cache`, version 1, object store `clips`, `keyPath: 'key'`, index `byLastUsed`
  on `lastUsedAt`.
- Record: `{ key, blob, mime, voice, language, chars, engine, createdAt, lastUsedAt }`.
- `key` is the existing `cacheKey` string verbatim — no second key format, no hashing.
  (The key embeds the source text. It never leaves the device; document this in the settings
  copy alongside the Clear button.)

### 2.2 Read path

At each of the three sync `state.urlCache.has(cacheKey)` checks
(`tts_source.jsx:656` Canvas, `:1011` non-Canvas, `:1239` `callTTSDirect`), on miss:

```js
const persisted = await _persistentGet(cacheKey);
if (persisted) {
  const url = URL.createObjectURL(persisted.blob);
  _cacheSet(cacheKey, url);           // cache OWNS the URL — see :124-132 contract
  _ttsTrace('calltts:idb-hit', { chars: String(text || '').length });
  return url;
}
```

`_cacheSet` is the only legal cache write and eviction is the only legal revoke
(`tts_source.jsx:124-132`). Honor that: never revoke a URL handed back from IDB outside
`_cacheSet`.

### 2.3 Write path

After a successful synth, immediately before `return url` at `tts_source.jsx:1046` (and the
Canvas/Direct equivalents), fire-and-forget:

```js
_persistentPut(cacheKey, blob, { voice: voiceName, language: _language, chars: text.length, engine });
```

Never awaited — a storage failure must not fail playback.

### 2.4 Quota and eviction

- Soft cap `TTS_IDB_MAX_BYTES = 150 * 1024 * 1024`, plus a `navigator.storage.estimate()`
  check that backs off when free space is under 200 MB.
- Evict oldest-`lastUsedAt` first via the `byLastUsed` index until under cap. Run eviction on
  a `requestIdleCallback` after writes, not inline.
- Books explicitly saved in Phase 3 are pinned (`pinned: true`) and skipped by LRU eviction
  until the user unsaves them.

### 2.5 Controls

- Respect `ttsProvider === 'off' | 'browser'` — no persistence when cloud TTS is disabled.
- New setting **Save read-aloud audio on this device** (default on) + **Clear saved audio**
  showing current usage. Lives with the existing TTS/voice settings, not in the reader.
- `window.__clearAlloTtsCacheForWord` (`AlloFlowANTI.txt:4376`) must also purge matching IDB
  rows, or "regenerate this word" in Word Sounds resurrects the old clip on next reload.
  **This is a real regression risk — cover it in tests.**

---

## Phase 3 — "Save audio for this book" (user-facing)

### 3.1 Entry point

New item in the reader's tools menu (`toolsOpen`, `reading_library_module.js:1400`):
**Save audio for offline**. Hidden when `hasAudioTrack || hasPageAudio` (real narration already
plays offline once fetched) or when cloud TTS is off.

### 3.2 Pre-flight estimate

Before any synthesis, show a confirm with real numbers computed from the book's own text:

> This book is about 2,700 words. Saving audio takes about 3 minutes of synthesis and
> uses about 1.4 MB on this device.

Estimate at ~14 chars/sec of speech and 8 KB/sec at 64 kbps. Do not start without confirmation
— on a metered connection or a school Chromebook this is a decision, not a default.

### 3.3 Run

- Sequential, one page at a time, `priority: 'normal'`, `maxRetries: 1`.
- Progress bar in the toolbar with a **Cancel** that aborts cleanly mid-book (partial saves are
  fine — they are just cache entries).
- Each clip written with `pinned: true`.
- On completion, record `{slug, pages, bytes, voice, language, savedAt}` in a
  `allo_reading_lib_audio` localStorage map, following the existing `readMap`/`writeMap`
  helpers at `reading_library_module.js:335-337`.

### 3.4 Saved audio is per-voice — the badge must not lie

The cache key embeds the voice, so switching voices turns every saved clip into a miss
automatically. That part is correct and free. The *bookkeeping* is not: a
`allo_reading_lib_audio` entry records one `voice`, so after a voice switch the browse grid
would still show "saved offline" for a book whose audio no longer resolves.

Key the map by `slug + '|' + voice + '|' + language` and treat the badge as true only when an
entry matches the *current* voice and language. On voice switch, offer to re-save rather than
silently dropping the badge — a child who deliberately saved a book for a bus ride should find
out at save time, not at playback time.

Old-voice clips stay `pinned` until the user unsaves that book, then become LRU-eligible.

Beyond that, books present in `allo_reading_lib_audio` get an offline badge in the browse grid
and a "Saved audio" filter, alongside the existing `hasAudio` handling at `:190` and `:391`.

---

## Phase 4 — Developer-side bake for a curated shelf

The playback machinery needs **zero** changes — `book.audio.mode === 'perPage'` already does
exactly what a per-page bake produces. The one reader change this phase does require is the
§4.1a voice-match gate, which decides *whether* the baked track is used at all.

### 4.1 Engine: Gemini, gated on one rights check

**Gemini is the right engine if its terms permit redistribution.** It is materially better than
Piper on prosody and expressiveness, and for read-aloud aimed at developing readers that is a
pedagogical property, not a cosmetic one — modeling expressive reading is part of the point.

An earlier draft of this spec chose Piper on cost grounds. That reasoning was wrong: it sized
synthesis against the whole 7.7M-character catalog and then applied the conclusion to a
150-book shelf, which is roughly 400k characters — one overnight run, not a budget event.

**Precondition before any bake (must be resolved, not assumed):** confirm that the Gemini API
terms applicable to the key used permit generating audio, storing it as files, and
redistributing it to end users as hosted application content. This is a genuinely different
question from Phases 1–3, which synthesize on the user's own quota and keep output on the
user's own device. Two things to establish specifically:

- Paid-tier terms, using an AlloFlow-owned key — **not** the Canvas-injected key, whose
  intended use is interactive user-triggered synthesis, not bulk asset production.
- Whether attribution or provenance labeling of synthetic audio is required.

**If that check fails, fall back to Piper** as the original draft described:
`tts-server/piper_server.py` already runs it locally with on-demand voice download. In that
case a per-voice license check is mandatory — Piper voice models do not share one license, they
inherit from their training corpora (some CC0, some CC BY-SA, some more restrictive). The
script must read each `*.onnx.json` model card, record the license in provenance, and refuse to
bake with a voice whose license is unrecorded.

Piper also remains the better choice for any language where Gemini's voice quality is weak;
`--engine` should be per-shelf-entry, not global.

Do **not** bake with `edge_tts_server.py` under any circumstances. Edge TTS is a Microsoft
consumer service endpoint; redistributing its output as hosted files is not a defensible
reading of its terms.

### 4.1a Voice lock-in, and the fallthrough that fixes it

A baked track pins every user to whatever voice the bake ran with. AlloFlow otherwise honors
`window.__alloSelectedVoice` everywhere, so this silently overrides a real accessibility
preference — a UDL regression, and the strongest argument against baking at all.

Resolve it by treating the baked track as a **fast path for the default voice only**, not as
the book's audio:

- Bake in one designated default voice. Record it as `audio.generated.voice`.
- At read time, the reader uses the baked track only when the user's selected voice matches
  `audio.generated.voice` (or the user has never chosen one).
- Any user on a different voice falls through to the normal Phase 1–3 path: live synthesis in
  *their* voice, cached on device. They lose the first-play speed advantage and lose nothing else.

This requires a small reader change (baked tracks are the one `book.audio` variety that is
conditional), so `audio.generated` must be checked before `hasAudioTrack`/`hasPageAudio` are
computed at `reading_library_module.js:1438-1444`. Human narration is never conditional and
keeps today's unconditional behavior.

With this in place, the dev bake's remaining value is narrow and honest: first-play latency on
a fresh device, offline/no-key environments, and avoiding thousands of users paying to
synthesize the same book. That third one is the real argument for Phase 4 at scale.

### 4.2 Shelf selection

`dev-tools/select_reading_audio_shelf.cjs` → emits `reading_library/audio_shelf.json`.

Inclusion rules, in order:
1. `usagePolicy.access === 'mirrored'` and `hasReadableText(book)` — link-only cards excluded.
2. License permits adaptation. **Exclude all 7 CC BY-NC-ND records unconditionally**; a
   recording is a derivative and ND forbids distributing one.
3. NC-licensed records (~332) included only behind an explicit `--include-nc` flag, so the
   non-commercial commitment is a recorded decision rather than an accident.
4. The chosen engine has a usable voice for the book's `langCode` (Gemini: language supported
   by the TTS model; Piper fallback: a licensed model exists); otherwise skip and report.
5. Cap at `--limit` (start at 150), ranked by level breadth then page count ascending.

### 4.3 Bake

`dev-tools/bake_reading_audio.cjs`:

- For each shelf book, per page: synthesize the page text with the entry's engine (Gemini TTS
  API with the AlloFlow-owned key, or the local Piper server as fallback), receive PCM/WAV,
  encode to 64 kbps mono MP3, write `reading_library/audio/<slug>/p<NN>.mp3`, capture duration.
- Rate-limit the Gemini path (serial requests, generous backoff, resumable by slug) — a 150-book
  run is ~2,100 requests, and the 429 → 60s-cooldown behavior in the app (`tts_source.jsx:1053-1057`)
  shows how the API responds to bursts.
- Emit into the book JSON:

```json
"audio": {
  "mode": "perPage",
  "generated": {
    "engine": "gemini",
    "model": "<gemini tts model id>",
    "voice": "Kore",
    "modelLicense": null,
    "bakedAt": "2026-08-04T00:00:00.000Z",
    "toolVersion": "bake_reading_audio@1"
  }
}
```

and `page.audio = [{ src, dur }]` per page.

- `generated` is the load-bearing field: six months out, nothing else distinguishes synthetic
  narration from the human StoryWeaver recordings, and they should never be presented alike.
  **A Gemini bake makes this more important, not less** — it is good enough to be mistaken for
  a human recording, which is exactly why the record must say what it is.
- `voice` is consumed at read time by the §4.1a fallthrough, so it is functional metadata, not
  just provenance. `modelLicense` is `null` for Gemini and required non-null for Piper.

### 4.4 Hosting: R2, not the Pages deploy

150 books × 14 pages ≈ 2,100 new files against a 20,000-file ceiling that is already a known
constraint — and it grows every time the shelf does. Host baked audio in R2 and write absolute
`src` URLs, exactly as the existing StoryWeaver records already do (they point at
`storage.googleapis.com`, not at the deploy). The reader treats both identically.

### 4.5 UI disclosure

Where a baked book plays, label it **Computer voice** — distinct from human narration, which
keeps its current presentation. The existing no-cue title string at
`reading_library_module.js:2096` is the model for this: state the limitation in the control.

### 4.6 Audit gate

Extend `dev-tools/audit_reading_catalog.cjs`:

| Code | Severity | Condition |
|---|---|---|
| `generated-audio-provenance-missing` | error | `audio.generated` absent but `src` under `reading_library/audio/` |
| `generated-audio-nd-license` | error | `audio.generated` present on an ND-licensed record |
| `generated-audio-file-missing` | error | a `page.audio[].src` local path does not resolve |
| `generated-audio-voice-license-missing` | error | `engine === 'piper'` and `generated.modelLicense` empty |
| `generated-audio-voice-missing` | error | `generated.voice` empty — the §4.1a fallthrough cannot resolve, so every user would be locked to the baked track |
| `generated-audio-nc-unflagged` | warning | NC record baked without `--include-nc` recorded in `curation.json` |

Add `withGeneratedAudio` to `counts` so the health line separates human from synthetic.

---

## Phase 5 — "Read it yourself first"

### 5.1 Why it is scoped to auto-read only

TTS in the reader **does not auto-play**. `readPageTts` (`reading_library_module.js:1747`) is
click-driven. The only self-starting audio is the continuous chain at `:1608-1627`, which
advances on the `allo-speech-state` finish event. A global "delay before TTS" setting would
therefore do nothing in the overwhelmingly common case and then act mysteriously in one mode.
The pause belongs at the page-turn boundary inside auto-read, and nowhere else.

The pedagogy is preview/echo reading: immediate narration short-circuits decoding, so the
child listens instead of reading. The pause restores the attempt.

### 5.2 Setting

Extend `READER_PREFS_DEFAULTS` (`reading_library_module.js:314`) with `selfReadPause: 0`.
Values: `0` (off) · `5` · `15` · `-1` (until tapped). Four segmented buttons in the **Aa**
panel, matching the existing pattern at `:2167-2178`. Default `0`.

**Named options, not a numeric field.** A free-entry duration is worse in every direction: it
implies a precision that does not exist, and it is wrong for every child but the one it was
tuned for. "Until I tap" is the option most likely to be right, and it should be present.

### 5.3 Behavior

In the auto-read finish handler (`:1608-1627`), between `setPageIdx(next)` and
`speakPageText(next)`:

- `selfReadPause === 0` → unchanged.
- `> 0` → show the "your turn" affordance, start a timer, then speak.
- `-1` → show the affordance and wait for the tap. No timer.

The affordance is a **visible** countdown ring plus a **Read it to me** button over the page
footer, and it announces via the existing live-region path. Silent dead air reads as broken
software — to the child, and to the teacher standing behind them. This is the failure mode
that decides whether the feature lands.

Cancellation must be total: `stopAll` (`:1556`) clears the pending timer, and any manual
navigation, `goTo`, book close, or global mute cancels it. Hold the timer in a ref and clear
it in `stopAll` and in the effect cleanup — a fired timer after unmount would speak a page the
reader has left.

### 5.4 Why this pairs with Phase 1

The pause is precisely the window during which the next page's audio synthesizes. The feature
that makes the delay pedagogically useful is the same feature that hides the latency. If
Phase 1 ships first, Phase 5 costs nothing in responsiveness; if Phase 5 shipped alone, the
tap would still be followed by a synthesis wait.

---

## 6. Tests

New file `tests/reading_library_tts_preload.test.js`:

1. **Cache-key parity (the load-bearing test).** Stub `window.callTTS`, invoke `prewarm` and
   the reader's `speak` path with the same text/language, assert both produce byte-identical
   `[text, voice, language, 'natural-rate-v1']` tuples. Include a case with
   `window.__alloSelectedVoice` set to a non-default voice and one with it unset.
2. Prewarm targets N+1 and skips empty pages.
3. Prewarm is suppressed when `hasAudioTrack` or `hasPageAudio`, when muted, and when
   `ttsProvider` is `off`/`browser`.
4. Prewarm fires at most once per `(slug, page, language)`.
5. Playback requests carry `priority: 'interactive'`; prewarms do not.

New file `tests/tts_persistent_cache.test.js` (fake-indexeddb):

6. Miss → synth → IDB write; second call after clearing `state.urlCache` is an IDB hit with
   no second `fetchTTSBytes`.
7. LRU eviction respects the byte cap and never evicts `pinned` rows.
8. `__clearAlloTtsCacheForWord` purges IDB rows, not just memory.
9. IDB failure (throwing open) degrades to the current memory-only behavior with playback intact.

New file `tests/reading_library_self_read_pause.test.js`:

10. `selfReadPause: 0` preserves today's timing exactly.
11. `5` delays the next page's speech and shows the affordance.
12. `-1` waits indefinitely and speaks on tap.
13. `stopAll`, manual navigation, and unmount all cancel a pending timer — assert no speech
    after cancellation.

Phase 3/4 additions (written with their phases, listed here so they aren't lost):

14. Offline badge shows only when a `allo_reading_lib_audio` entry matches the *current* voice
    and language (§3.4) — switch the voice, assert the badge drops and the re-save offer shows.
15. §4.1a fallthrough: a book with `audio.generated.voice: 'Kore'` plays the baked track when
    the selected voice is Kore/unset, and routes to live TTS when it is anything else. Human
    narration (no `generated`) plays regardless of voice.

Per prior test-suite guidance: scope any snapshot update with `-t`, path first, and never run
a blanket `-u`. The suite has pre-existing unrelated failures; compare against baseline rather
than expecting green.

---

## 7. Build, mirror, and deploy notes

| File | Source of truth | Action |
|---|---|---|
| `tts_source.jsx` | source | edit, then `node build.js --compile` — a source commit without a module rebuild aborts deploy |
| `tts_module.js` | generated | never hand-edit |
| `desktop/web-app/public/tts_module.js` | mirror | mirror |
| `reading_library_module.js` | **no source pair** | hand-edit directly |
| `desktop/web-app/public/reading_library_module.js` | mirror | mirror by editing, not file-copy |
| `AlloFlowANTI.txt` | source of truth | edit **both** root and `desktop/web-app/src/` copies |
| `App.jsx` | generated from ANTI | never hand-edit |

Both modules are already registered in `build.js` (`ReadingLibrary` at `:584`, `TTS` at `:1000`),
so no `PLUGIN_FILES` addition is needed. `?v=` pins in ANTI must be restamped after any module
rebuild. Run `node --check` on every edited JS file. Nothing here should be deployed or pushed
without an explicit request.

**i18n.** Every phase adds user-facing strings — the §5 pause options and affordance, the §3
save/confirm/progress/badge copy, the §2.5 settings entries, the §4.5 "Computer voice" label.
All go through `tr(key, fallback)` with English fallbacks, so nothing blocks on translation,
but the keys must be added to the hand-translated language packs as a follow-up lane (per
project policy: pack translation is hand-done, never delegated to runtime AI). Name the keys
`readinglib_selfread_*`, `readinglib_saveaudio_*`, `readinglib_voice_generated` now so the
pack additions are one grep later. Strings for §2.5 live in the app-level settings surface,
not the reader, so those go in the main `ui_strings` path instead (note: nested JSON — a
dotted-key grep proves nothing there).

---

## 8. Sequencing and risk

| Phase | Effort | Risk | Value |
|---|---|---|---|
| 1 — look-ahead prewarm | ~40 lines | low | high — removes most perceived latency |
| 5 — self-read pause | ~80 lines | low | high — the actual pedagogical ask |
| 2 — IDB persistence | ~200 lines | medium — touches the urlCache ownership contract | high — ends re-billing across reloads |
| 3 — save-for-offline | ~150 lines | low | medium — matters most on weak connectivity |
| 4 — dev bake | new tooling + hosting | medium — blocked on the §4.1 rights check; needs the §4.1a reader change | medium — saves every user re-synthesizing the same book |

Ship 1 and 5 together: 1 makes 5 feel instant, 5 gives 1 a window to work in. 2 is the highest
value-per-risk of the rest but is the only item that can break existing playback, so it wants
its own change and its own verification pass. 4 is worth doing only after 2 and 3 show which
books actually get read.

### Open questions for Aaron

1. **NC books** (~332 records): bake and cache them, or restrict Phase 4 to BY/CC0/PD only?
   AlloFlow is free, which makes NC defensible, but it is a commitment worth making on purpose.
2. **Default for persistence** (§2.5): on, or opt-in? On is the better experience; opt-in is the
   more conservative story for a district review.
3. **Shelf size** for the first bake — 150 is a guess chosen to stay well inside file and
   storage limits, not a measured answer.
4. **Gemini redistribution terms** (§4.1) — the one item that decides Phase 4's engine. Needs a
   read of the current terms for the key AlloFlow would actually use, not an assumption.
5. **Default bake voice** (§4.1a) — whichever voice the fast path is built around should be the
   one most users are already on, or the fallthrough fires constantly and the bake buys little.
   Worth checking what `__alloSelectedVoice` actually is for most sessions before choosing.
