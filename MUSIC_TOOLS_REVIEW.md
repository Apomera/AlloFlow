# STEM Lab music tools — review and remediation, 2026-08-10

Covers the three music/audio tools:

| Tool | File | Lines | Tests before | Tests now |
|---|---|---|---|---|
| 🎹 Music Synthesizer (`musicSynth`) | `stem_lab/stem_tool_music.js` | 5,370 | none | 106 |
| 🎤 Singing Lab (`singing`) | `stem_lab/stem_tool_singing.js` | 4,831 | 5 | 59 |
| 🎧 Echo Navigator (`echoTrainer`) | `stem_lab/stem_tool_echotrainer.js` | 2,148 | 6 | 37 |

All edits are mirrored to `desktop/web-app/public/stem_lab/` (the a11y tests assert
byte-identical mirrors). **Nothing is committed or deployed.**

The theory content was already strong — 13 scales and 19 chord types with correct
interval sets and frequency ratios. Everything below is correctness, performance,
accessibility, or localisation.

---

## Fixed

### Singing Lab — pitch pipeline

The detector was the classic full-buffer autocorrelation: every lag correlated
across 4096 samples, ~8.4M multiply-adds, once per animation frame (~503M ops/sec
on the UI thread). It is now a normalised-square-difference (McLeod) detector with
a 4× decimated coarse pass and a full-rate refinement over the vocal lag range.

Measured on synthetic tones (`tests/singing_pitch_detection.test.js`):

| | old | new |
|---|---|---|
| multiply-adds per analysis | 8.39M | 0.14M (**58× less**) |
| per second | 503M @ 60 Hz | 4M @ 25 Hz (**140× less**) |
| worst error, 10 tone shapes | 2.32 cents | 0.02 cents |
| white noise | reports **39.2 Hz** | no pitch |
| breath (lowpassed noise) | reports **62.0 Hz** | no pitch |

The noise rows were the real defect: those bogus low readings fed `rangeLow`, so a
student breathing near the mic could corrupt their stored vocal range. There is now
a clarity gate (`CLARITY_MIN`) plus a median-of-3 filter.

One correction to an earlier claim of mine: I expected the old detector to make
octave errors on harmonic-rich voices. It did **not** on these synthetic cases —
all ten came back accurate. The demonstrated wins are cost and noise rejection.

Also in the mic path:

- **`{ audio: true }` → explicit constraints.** Browser voice processing is on by
  default; auto gain control flattens the loudness Vocal Range measures and noise
  suppression smears the amplitude Vibrato Lab reads. Now
  `echoCancellation/noiseSuppression/autoGainControl: false`.
- **`navigator.mediaDevices` is guarded.** On a non-secure origin (`file://` in the
  desktop shell) it is `undefined`, and the call threw *past* the `.catch`, leaving
  a dead button with no message.
- **Error messages distinguish the failure**: denied / no device / device busy /
  other, instead of one generic string.
- **Analysis throttled to 25 Hz** and re-renders gated on the reading actually
  moving. A held note previously called `setCurrentNote` 60×/sec, re-rendering a
  4,700-line component and three canvas effects for an unchanged value.
- **History trimmed by timestamp**, so the pitch roll spans a fixed number of
  seconds instead of silently varying with frame rate.
- Repaired one mojibake artifact (3× U+FFFD in a section banner).

### Echo Navigator — audio lifetime

- **The AudioContext was never closed.** Browsers cap concurrent contexts at ~6, so
  after a few visits `new AudioContext()` threw, `initAudio()`'s catch returned
  `null`, and every click was silent with nothing shown to the user. Now closed on
  unmount.
- **Up to ~500 nodes per click, none disconnected** — 32 rays × (source, delay,
  filter, gain, **HRTF panner**), plus 3 bounce chains per ray. HRTF panning is a
  convolution per node. Panners are now shared across 8 angular bins (15° apart,
  finer than human echolocation acuity), so a click builds at most 8 instead of up
  to 128, while every echo tap keeps its own delay/filter/gain — the sound is as
  dense as before. All per-click nodes are retired on a timer sized to the longest
  tail.
  - Note on the teardown: `source.onended` is the wrong trigger and I initially
    used it. The click buffer is 8 ms, so `onended` fires long before the echo it
    feeds leaves its DelayNode (up to 0.6 s) — it would cut every echo off before
    it sounded. The timer is deliberate.

### Music Synthesizer — Filter Lab

- **The response curve was a hand-rolled linear approximation** drawn on an axis
  labelled 20 Hz–20 kHz while the cutoff slider only reached 12 kHz. It is now the
  RBJ transfer function `BiquadFilterNode` itself implements, verified against the
  analog prototype and textbook invariants: 0 dB passband, −3.01 dB at cutoff,
  −12 dB/octave two-pole slope, bandpass −3 dB points at 618/1618 Hz for Q=1,
  resonance peak = 20·log₁₀(Q) within 0.6 dB.
- **The frequency axis and cutoff slider are now logarithmic** over 20 Hz–20 kHz.
  The old linear 100–12000 Hz travel spent **5.9%** of its length on 100–800 Hz,
  where most musically useful movement lives; it now gets **30.1%** (5.1× more).
- Added a cutoff marker line and honest dB gridline labels (+12 / 0 / −48).

### Music Synthesizer — Barry Harris panel

- **Every printed Roman numeral named the wrong root.** The table pairs label
  `♯Ⅰdim7` with `degree: 2`, `♯Ⅱdim7` with `degree: 4`, and so on, while the button
  plays `NOTE_NAMES[(rootIdx + chord.degree) % 12]`. Captions and accessible names
  are now derived from the degree that actually sounds, so the button always tells
  the truth about what it plays. **See the open question below** — the degrees
  themselves still want a music teacher's eye.
- **All eight major-scale buttons announced "Minor 6th Diminished Scale"** and all
  eight minor-scale buttons announced "Play Chord" — copy-pasted `aria-label`s, so
  a screen-reader user could not tell any chord in the panel apart. Each now
  announces its own chord.

### Music Synthesizer — quest hooks were unreachable

`notesPlayed` was read by the tool's **first** quest hook ("Play 5 musical notes")
and written nowhere, so that quest could never complete. Four new hooks were added
(ear training, build a beat, try 3 scales, try a preset) and every field a hook
reads now has a writer. `tests/music_synth_core.test.js` asserts the pairing so the
next hook cannot be added dead.

### Music Synthesizer — dark theme

It was the only one of the three with **zero** theme awareness: 0 `isDark`
references against 619 uses of light-only Tailwind classes, so it rendered as a
white sheet inside the dark shell while Singing Lab (171 `isDark` refs) and Echo
Navigator (107) adapt.

Implemented as a generated stylesheet scoped to
`.allo-music-tool[data-allo-theme="dark"]` — the same pattern echotrainer already
uses for its own `.text-slate-600` override — rather than 619 hand-edited class
expressions. Verified without a browser:

- 153 rules, braces balanced, **0 unscoped** (light mode cannot be affected)
- **626/626** light-only class uses covered (100%)
- **70 background+text pairings, 0 below WCAG AA 4.5:1**, worst 4.93:1

Saturated button shades (`bg-purple-600`, `bg-amber-500`, …) are deliberately
untouched — they already read fine on a dark panel. Pastel gradient stops become
solid dark surfaces rather than approximated gradients, because a surviving pastel
gradient under light-turned text is the one failure mode that must not ship.

**Alpha surfaces caught on a second pass.** The first version skipped
`bg-white/80`-style classes, which produced exactly that failure mode: the
sheet-music panel at `bg-white/80` stayed near-white while its `text-amber-600/800`
children were lightened to amber-200/300 — pale text on a pale panel. Six such
surfaces (`bg-white/60`, `bg-white/80`, `bg-purple-50/80`, `bg-purple-200/50`,
`bg-amber-100/50`, `bg-indigo-100/50`) are now remapped with `--tw-bg-opacity: 1`.
The `bg-white/10`–`/30` and `bg-red-900/40` overlays are deliberately excluded —
those sit on explicitly dark gradient panels and are correct as they are. The
coverage test's predicate includes alpha surfaces so this class stays guarded.

One arbitrary value is intentionally left light: `bg-[#fefcf3]`, the sheet-music
staff's cream paper. Its ink is a hardcoded `#8b7355` brown, so it stays legible;
darkening the paper would require inverting the notation too.

### All three — localisation

Toasts and screen-reader announcements were **100% English-only** across all three
tools even though the visible chrome was 50–90% localised. That is backwards: the
feedback text is the part carrying the instruction, and for Echo Navigator the
announcements *are* the interface.

| | before | after |
|---|---|---|
| `addToast` localised | 0 / 42 | **42 / 42** |
| `announceToSR` localised | 0 / 24 | **24 / 24** |
| raw `aria-label` / `title` | 26 | **0** |

(One extra announcement — `'Difficulty: ' + dLvl.label + …` — was hiding inside a
long line and only surfaced when the new echotrainer test asserted zero raw
literals. Hence 24, not the 23 I first counted.)

Because `ctx.t` takes no interpolation arguments, messages carrying a value use a
new `__alloFmt(key, 'English {name}', vars)` helper (`tFmt` in echotrainer). It uses
the **same `{name}` placeholder syntax the host translator uses**, and passes a
*string* fallback so a missing key still renders English — the host's own param
path returns the raw key in that case. Module-scope prose tables (vocal-health
tips, tutorial steps) are localised at their render sites with index-derived keys.

New keys carry English fallbacks and render English until a lang pack supplies
translations. **No translations were invented** — per house rule, `lang/<slug>.js`
entries are hand-authored separately.

### All three — cross-tool key borrowing

Three keys reached into other subject tools, and two were worse than a stale
reference because they were **computed object keys**:

- `PRESETS[t('stem.periodic.lead')]` — the Periodic Table's word for the **metal**.
  A Spanish pack renders that "Plomo", so the synth lead preset would read as the
  chemical element.
- `CHORDS[t('stem.circuit.power')]` — Circuit Lab's *electrical* power.
- `t('stem.dissection.it_was')` in the ear-training toast.

Because the first two were map keys, both tables changed shape with the UI
language: `d.activePreset` / `d.selectedChord` persisted a translated string that
stopped matching any key after a language switch. Every sibling entry in both
tables is a plain English literal rendered raw, and `CHORDS` keys are never
displayed at all (buttons show `chordRoot + chord.symbol`), so both are now plain
literals. A test guards against reintroducing a translated computed key.

---

## Round 2 — further bugs found and fixed

### Music Synthesizer — a shadowed sequencer, and a metronome nobody could reach

`startSequencer` and `stopSequencer` were each **declared twice in the same scope**:
once around line 1163, and again in the Beat Pad engine ~600 lines below. Function
declarations hoist, so the later pair won and the earlier bodies were unreachable —
a fossil of the pre-Beat-Pad sequencer. Nothing was bound to it either (`d.seqStep`
had no readers, `toggleSeqStep`/`toggleDrumStep` no callers). Removed, because the
shadowing is silent and reversible: move the Beat Pad block above that point and the
*working* sequencer would break with no error.

That fossil hid two live bugs:

- **The metronome had no control anywhere.** `startMetronome` appeared exactly once
  in the file — its own definition. A complete engine, including `playClick` with an
  accented downbeat and `TIME_SIGS` with five metres (4/4, 3/4, 6/8, 5/4, 7/8), could
  not be reached, and `d.timeSig` had no writer for the same reason. It now has a
  panel: start/stop with `aria-pressed`, a 40–208 tempo slider, a metre selector, and
  beat lamps so the downbeat is visible and not only audible. This also starts on the
  rhythm gap noted below.
- **`d.bpm` was read in two places and written in none**, so the metronome and
  arpeggiator were pinned to 120 BPM while the Beat Pad's slider wrote `d.seqBPM`.
  There is now one `tempoBPM`, and a running metronome restarts when tempo or metre
  changes (both are captured in its interval closure).

### Music Synthesizer — held notes were never released

`window._alloSynthActiveNotes` outlives the component. Nothing released held notes on
unmount, so a note still held when the tool closed sustained forever with no UI left
to stop it — and because `playNote()` early-returns when a noteId is already in the
registry, **that key was then permanently unplayable on every later visit.** Added
`stopAllNotes()` to the unmount path and the back button.

### Music Synthesizer — five controls announced the wrong control

Found by listing every `aria-label` beside its button's visible content and reading
the pairs. A copy-pasted label is invisible in testing but tells a screen-reader user
they are somewhere else entirely:

| Control | Announced | Now |
|---|---|---|
| Beat Pad Play/Stop | "Beats per minute" | Play / Stop the beat, `aria-pressed` |
| Karplus-Strong pluck | "Music Theory Quiz" | "Pluck C4" |
| Arpeggiator start/stop | "Pattern" | Start / Stop arpeggiator, `aria-pressed` |
| 3 visualiser modes | all "Toggle frequency spectrum" | Waveform / Lissajous / Helix |

The visualiser buttons matter most: their visible content is a bare glyph (∿ ∞ 🌀),
so the label was the only name they had, and all three shared one wrong one.

### Singing Lab — four gates counted frames, not time

`pitchMatchLockedRef`, `rangeStableCountRef`, `srLockedRef` and `intervalLockedRef`
each counted how many times the pitch reading updated, with thresholds written as
"~30 frames (about 1 second)". That was wrong in both directions:

- `requestAnimationFrame` runs at 60 Hz on most displays, so 30 updates arrived in
  roughly **half** a second — these gates had always fired about twice too early;
- and after round 1 the analysis loop publishes a reading only when the value moves,
  so a singer holding a **dead-steady** note could stop advancing the counter and
  never complete the exercise. That regression was mine.

All four now accumulate real elapsed milliseconds through a shared `accrueHold`,
which keeps the original forgiveness behaviour (a wobble gives progress back rather
than resetting), floors at zero, and ignores gaps over 250 ms so a backgrounded tab
cannot hand out a pass. Sight-reading accuracy also divided its cents accumulator by
a hardcoded 30 regardless of how many samples arrived; it now divides by the samples
actually taken. `tests/singing_hold_gates.test.js` proves 1 second reads as 1 second
at 12, 25, 60 and 144 updates/sec.

### Echo Navigator — divide-by-zero in the distance challenge

`pct = Math.round((error / actual) * 100)` where `actual` is
`Math.round(minDist * 0.1 * 10) / 10`. The challenge only requires `minDist < 500`
with no lower bound, so a player pressed against a surface produced `actual === 0`
and the result read **"Infinity% off"**. Guarded.

### All three — English that survived the first localisation pass

Round 1 measured *call sites*, and by that measure announcements were 100% done. But
several of those calls pass a **variable** built from English fragments, so the words
a student actually hears were still English. Correcting my own earlier claim: the
structure was translatable, the wording was not. Now fixed:

- Echo Navigator: the four run-feedback sentences (in both the 3D and 2D loops), the
  three view-mode names, the distance-challenge prompt, its four grades and its
  result line, and the material-quiz explanation.
- The remaining variable-held English in all three tools is only AI prompt text,
  which is instruction to the model and correctly stays English. A test now asserts
  no English prose is assigned to a user-facing variable in echotrainer.

### All three — AI explanations ignored the UI language

`callGemini` has no language plumbing; the host's `window.__alloTextLanguage`
passthrough is wired into the **TTS** path only. So "Explain this music concept",
"Give 6 short vocal health tips" and the sight-reading generator all answered in
English for a student reading Spanish. An `aiLanguageSuffix()` helper now appends the
directive when the UI language is not English, and adds nothing when it is.

### Checked and found correct (no change made)

- The Beat Pad sequencer's timing chain is sound: `_seqTickRef.current` is
  repointed every render, so grid, melody, BPM and swing edits are live.
- The computer-keyboard handler plays only one-shots (harmony chords, spacebar
  strum, beat pads), so it cannot leave a sustained note stuck.
- The material quiz shuffles with Fisher-Yates and keys correctness on the material
  *name*, not a position — no answer-position bias. It also always yields four
  distinct options for every reachable `hitMat`, including ones outside `allMats`.
- Interval ear training shows all twelve intervals every round, so the answer's
  position varies with the answer.

---

## Round 3 — further bugs found and fixed

### Music Synthesizer — a malformed shared beat could freeze the tab

The Beat Pad sequencer computed its own next delay from stored state:

```js
var swingPct  = parseFloat(d.seqSwing || '0') / 100;
var nextDelay = baseMs * (1 +/- swingPct);
if (nextDelay < 10) nextDelay = 10;      // safety floor
```

A non-numeric swing makes `swingPct` NaN, and **`NaN < 10` is false**, so the floor
never caught it. `setTimeout(fn, NaN)` coerces the delay to 0, and the tick re-arms
itself as fast as the event loop allows — a frozen tab and a wall of audio. A `bpm`
of `0` produced an infinite delay instead, silently stopping the sequencer dead.

Neither needed a hostile user. The shared-beat URL loader (`#beat=…`) applied both
values with **no validation at all**, and saved compositions in `localStorage` were
trusted the same way. Measured before and after, on the real delay arithmetic:

| stored value | old delay | new delay |
|---|---|---|
| `swing: 'abc'` | **NaN** → `setTimeout` 0 → tight loop | 125 ms |
| `bpm: 'fast'` | **NaN** → tight loop | 125 ms |
| `bpm: -60` | 10 ms (100 Hz spam) | 125 ms |
| `bpm: 1e9` | 10 ms | 72 ms |
| `bpm: 0` | 125 ms | 125 ms |

Fixed by sanitising at the **point of use** — `safeBPM` and `safeSwingFraction` in
the tick — so every source is covered regardless of how the value got there, plus
shape- and range-checking the URL payload so a bad link cannot persist nonsense, plus
an `isFinite` test on the computed delay so a NaN can never slip past the floor again.

This also fixed a range inconsistency I introduced in round 2: the Beat Pad slider
allowed 60–200, my new metronome slider 40–208, and tap tempo clamped to 60–200, so a
tempo set in one place could sit outside another's range. All three now share
`BPM_MIN`/`BPM_MAX` (40–208, Largo to Prestissimo).

### Echo Navigator — the unlock gate failed open

`isEnvUnlocked` compared its requirement against five exact strings and ended in
`return true`:

```js
if (u.requires === 'goalsFound >= 1') return g >= 1;
… five branches …
return true;                 // anything else: unlocked
```

So a new tier, or a typo in an existing one, silently unlocked the environment for
everyone. It now parses the threshold out of the string and **fails closed** on
anything it cannot read.

### All three — the last localisation hole

Five more messages were English-only, and they were invisible to my earlier scanner
for a specific reason: their argument **starts with a ternary rather than a literal**,
and the scanner only inspected the first token. Correcting the "42/42 toasts" figure I
reported — it was 42/47.

- Music: the theory-quiz result, the chord-detection result, and the aural-dictation
  score (`'Perfect! All 4 notes!'` / `'{n} of 4 correct'` / `'Try again!'`). Dictation
  results are also announced to screen readers now, not only shown as a toast.
- Echo Navigator: the multi-bounce toggle and the waypoint-challenge toggle.

A scanner that understands the whole message expression now reports zero remaining
sites in all three tools, and tests pin each key.

### Echo Navigator — the environment picker was English

`ENVIRONMENTS` and `ENV_UNLOCK` are module-scope tables, so their names, descriptions
and unlock hints ("Find 3 goals") reached the button label, the `title`, the
`aria-label` and the selection announcement untranslated. All four now resolve
through per-id keys at render time.

### Checked and found correct (no change made)

- Warm-up timers: the interval is cleared on complete, on cancel and on unmount, and
  restarting while one is active clears the previous one first.
- Echo Navigator progress persistence: `JSON.parse` is inside `try/catch` with a
  type check, and `localStorage` writes swallow quota/security errors.
- Tap tempo: already discarded taps more than 2 s apart and averaged only the last
  four intervals.
- The remaining English assigned to variables in all three tools is AI prompt text,
  which is instruction to the model and correctly stays English.

---

## Round 4 — Vibrato Lab measurement

Two problems, neither visible without measuring. Both are in a panel that tells a
student something about their voice, so a wrong number is worse than no number.

### The displayed width was 29% below the width it claimed to be

The tile showed `depth` as "N¢" next to "Ideal: 30-80¢", and `depth` was
`2 × RMS(deviation in cents)`. For a sine that equals `√2 × amplitude`, i.e. **0.707
of the peak-to-peak excursion** — so:

| true peak-to-peak | old reading | band it landed in |
|---|---|---|
| 30 cents | 21 | Developing |
| 100 cents | 71 | Healthy |
| 140 cents | 99 | Healthy (just) |
| 200 cents | 141 | Too Wide |

"Vibrato width exceeds 100 cents" therefore fired at an actual width of 141 cents.

Fixed by scaling RMS to the peak-to-peak of the equivalent sine
(`pp = 2√2 × RMS`) and converting all five band thresholds by **the same factor**, so
precisely the same singing passes each band — only the unit is now the one the UI
claims. Verified: `extentCents` matches the true peak-to-peak to within 0.1% across
±10 to ±90 cents, and each boundary lands exactly on `old × √2`.

Estimating from RMS rather than observed max-minus-min is deliberate: a single bad
pitch frame still pulls the RMS estimate up (squaring guarantees that) but roughly
half as far as taking the extremes would, and on clean input the two agree. The prose
that quoted the old numbers ("aim for 30-80 cents depth", "keep depth around 50
cents") was updated to the same unit.

### Vibrato rate aliased on slow devices, and said "wobble"

Rate came from zero-crossing counting with no check that the pitch history was
sampled fast enough. Measured against synthetic vibrato of known rate:

| samples/sec | reported rate for a real 6 Hz vibrato |
|---|---|
| 10 | 4.0 Hz |
| 12 | **1.0 Hz** |
| 15 | 6.0 Hz |
| 18 and above | 5.9–6.1 Hz |

At 12 readings/sec a healthy 6 Hz vibrato reads as 1 Hz, which the UI diagnoses as
"Too Slow (Wobble)" and coaches the student to *speed up*. The analysis rate is
nominally 25 Hz, so this needs a device where `requestAnimationFrame` drops below
~18 fps — plausible on classroom hardware, which is where this tool is used.

`analyzeVibrato` now reports its own `sampleHz` and a `reliable` flag, the rate tile
shows "—" rather than a number it cannot stand behind, the quality box explains that
the device is producing too few readings, and the healthy-vibrato achievement will not
fire on an untrustworthy window. A test asserts the flag never claims reliable while
the rate is actually wrong, across ten sampling rates.

### Also

`analyzeVibrato` now returns finite fields for every degenerate input (null, empty,
too short, dead-steady, zero-duration), which is tested.

---

## Round 5 — canvas text, and two content checks that passed

### Text drawn on canvas was never localised

`fillText` output lives entirely outside JSX, so nothing that inspects props, toast
calls or announcements can see it. Every one of these labels was still English after
four rounds of localisation work for exactly that reason:

- **Music Synthesizer**: the visualiser strip ("WAVEFORM" / "SPECTRUM"), the harmonic
  overlay ("HARMONICS", "Active harmonics: …"), the interaction hint, and the timbre
  caption. These sit inside the render closure, so they wrap directly.
- **Singing Lab**: "Flat" / "Sharp" on the cents meter, "Reference" / "Target" / "You"
  on the interval staff, the vibrato empty-state caption, and the vocal-tract figure
  title. These helpers are declared *above* the render closure and have no translator
  in scope, so each now takes its wording through an options bag — the pattern
  `drawPitchRoll` already used for its own empty-state caption — with the English kept
  as an in-helper fallback so a missing label can never blank the canvas.
- **Echo Navigator**: the compass initials and the on-canvas HUD.

The compass is the sharpest of these. **Cardinal initials are not universal**: Spanish
uses O for Oeste, German O for Ost, so a hardcoded `W` is wrong in both — inside a tool
whose whole purpose is navigating by sound. The HUD also printed the raw environment id
(`simple_room`); it now resolves the same key the environment picker uses.

A test asserts that no `fillText` call in any of the three tools passes a bare literal
of three or more letters. Single glyphs (treble clef, sharp sign) are exempt — those
are notation, not language.

### Content spot-checks that found nothing wrong

Verified rather than assumed, and worth recording so nobody re-checks them:

- **Circle of fifths** — all twelve entries correct: key order by ascending fifth,
  relative minors (Am … Dm), accidental counts, and the F♯/G♭ enharmonic pair carrying
  both 6 sharps and 6 flats with D♯m/E♭m as its relative minor.
- **Vowel articulation table** — the five vowels' tongue position, jaw opening and lip
  rounding are phonetically consistent (AH low back unrounded, EE high front
  unrounded, OO high back rounded, EH mid front, OH mid back rounded), with a
  consistent axis convention throughout.
- **Waveform harmonic descriptions** — square as odd harmonics at 1/n, triangle as odd
  at 1/n², sawtooth as all harmonics at 1/n: all correct.
- Divide-by-zero sweep over both canvas drawing paths: every `history.length - 1`
  divisor sits behind an early return (`< 2` for the pitch roll, `< 10` for the vibrato
  trace), and `analyzeVibrato`'s duration divisor is now guarded.

---

## Round 6 — Rhythm Clap-Back (new activity)

The rhythm gap flagged in round 1 is now closed on both halves. The metronome added in
round 2 gave the tool a rhythm *reference*; this adds the *assessment*: hear a one-bar
pattern, tap it back, get scored on timing.

**Ten patterns across four levels**, from steady quarters through running eighths,
dotted and gallop figures, syncopation, son clave (3-2), and two waltz patterns in 3/4.
Every pattern is expressed as onset positions in beats, so the same scheduler plays all
of them and each reads as standard notation.

**Flow**: count-in bar → pattern (on a rim shot, so it is distinct from the count) →
second count-in → the student's bar. Scoring runs a little after the bar ends so a late
final tap still counts.

**The scoring core is module scope and free of DOM and audio**, so it is tested
directly — 21 tests, and the design decisions worth knowing:

- **Matching is greedy over the closest pairs, not left-to-right.** This is the crux.
  With left-to-right matching, a single tap 200 ms early claims the first onset and
  pushes every later tap onto the wrong one, turning one small error into a whole
  failed bar. Sorting candidate pairs by absolute error and assigning the best first
  keeps an isolated mistake isolated — verified: that case now grades one onset loose
  and the other three tight, with nothing missed and nothing extra.
- **Tolerance scales with tempo.** Bands are fractions of a beat (6% tight, 14% close),
  because 40 ms is 4% of a beat at 60 BPM but 13% at 200 BPM — the same absolute error
  is a different musical size. Tested at both ends: 40 ms grades tight at 60 BPM and
  only close at 200.
- **The match window is half a beat**, beyond which a tap would be attributed to a
  different onset entirely.
- **Extra taps cost as much as a miss**, so tapping continuously cannot score well —
  a tap every 60 ms hits every onset but scores 15%.
- **Taps are collected in a ref, not state**, so no tap can be lost to React batching;
  only the visible counter goes through state.
- **The tap target is a real `<button>`**, which gets Space and Enter for free. A
  document-level space handler would have fought the piano keys in the same tab.
- Signed bias is reported separately from absolute error, so the feedback can say
  *behind* or *ahead* of the beat rather than just "inaccurate".

Every phase is announced for screen-reader users, the result is announced as well as
toasted, the notation strip carries a live `aria-label`, and the per-onset grades colour
that strip after a round. All strings are translatable, the panel is covered by the dark
theme (656 tokens, 0 contrast failures), and the schedule is cleared on unmount and on
leaving the tool. A `clap_back` quest hook reads `rhythmPassed`, which the scorer writes.

### A note on the grading numbers

The 6% / 14% bands and the 75%-accuracy pass mark are mine, chosen to be musically
sensible and kept in one place at the top of the scorer rather than scattered through
it. They are not sourced from a pedagogy reference, so treat them as a starting point —
same status as the vibrato bands in open item 1.

---

## Round 7 — put timing on the audio clock

Reviewing the round-6 feature turned up a real flaw in it, plus the same flaw in the
metronome I added in round 2.

### Clap-Back scored students against a reference it did not play accurately

The pattern was played with `setTimeout` while the student was scored against **ideal**
onset times. `setTimeout` drifts a few milliseconds at best and tens under load, and the
tight grading band is only **30 ms at 120 BPM** — so a student tapping perfectly in time
with what they *heard* could be marked down for the scheduler. Worse, the record window
opened on the `setTimeout` fire, so a late timer shifted **every** tap earlier by that
amount.

Fixed by putting the reference and the measurement on one sample-accurate clock:

- `playClick` and `playDrum` take an optional `when`, so a whole bar can be scheduled at
  explicit `ctx.currentTime` offsets. Existing single-argument callers are untouched.
- The onset list is computed **once** and used both to schedule the audio and to score
  the taps — deriving it twice is how a reference and its measurement drift apart.
- The student's bar begins at a known audio time (`run.recordStartSec`), not wherever
  the phase timer fires, and taps are measured as `ctx.currentTime - recordStartSec`.
- A 120 ms lead-in keeps the first click from being clipped while nodes are built, and
  the UI phase timers carry the same offset so they stay aligned. Phase flips stay on
  `setTimeout`, where a few milliseconds is invisible.

### The metronome drifted, which makes it not a metronome

It ran on `setInterval` at the beat period. That error accumulates in one direction.
Rewritten with the standard look-ahead pattern: a coarse 25 ms poll schedules any click
due within 150 ms onto the audio clock, while `nextBeatSec` advances by **exactly** one
beat and is never re-derived from the current time.

Simulating both strategies against a modelled erratic timer — five minutes at 120 BPM,
with the look-ahead poll additionally stalling 250 ms on 2% of iterations:

| | interval-driven | look-ahead |
|---|---|---|
| beats in 300 s (600 expected) | **595** | 600 |
| mean gap (500 ms ideal) | 505.04 ms | 500.00 ms |
| worst single-gap error | 8.0 ms | 0.0 ms |
| drift after 5 minutes | **2,995 ms (6 beats)** | 0 ms |

The old strategy loses five beats outright and ends six beats adrift. Note this
demonstrates a property of the *algorithms* under a modelled timer — it is not a
measurement of a real browser, which I cannot take here.

That 8 ms worst-case gap error is also the answer to "is a 30 ms tight band defensible?"
— it was not, while the reference itself was jittery. It is now.

The lamp timers the scheduler creates are cleared on stop and capped during long
sessions, and a suspended context is resumed before anything is scheduled into it.

### A pattern in my own tests, worth naming

Four times now a test I wrote has failed on a *correct* later change, because it pinned
an implementation detail instead of the behaviour underneath:

| test | pinned | broke on |
|---|---|---|
| `echotrainer_inline_regions_a11y` | the exact concatenated tutorial label | localising it |
| `music_metronome_and_labels` | `var tempoBPM = d.seqBPM \|\| 120;` | adding `safeBPM` |
| `music_metronome_and_labels` | the exact teardown call sequence | adding `stopRhythm()` |
| `music_rhythm_clapback` | `run.taps.push(Date.now() - run.startAt)` | moving to the audio clock |

Each is now written against the invariant — a focusable named region, tempo derived from
`d.seqBPM`, every transport stopped in both teardown paths, taps accumulating on a ref.
The failures were cheap to fix, but they are noise that hides real regressions, and the
habit is worth avoiding rather than repeatedly correcting.

---

## Open — needs your call

1. **Vibrato band boundaries (vocal pedagogy).** I converted the units without moving
   the decision boundary, so nobody's result changed — but the boundary itself was
   never sourced, and now that it reads in honest peak-to-peak cents it is easy to
   check: healthy = 5–7 Hz and **42–113 cents** peak-to-peak. Published figures for
   trained singers commonly sit around 5–7 Hz with an extent of roughly 0.5–1
   semitone (50–100 cents), which puts the current band in the right neighbourhood but
   slightly wide at the top. One decision from you (or a voice teacher) and it is a
   five-line change: the five `VIB_*` constants in `stem_tool_singing.js`. I did not
   move them myself because that is a pedagogical claim, not a bug.

2. **Barry Harris degrees (music theory).** I fixed the labels to match what
   sounds, but did not touch the `degree` values, because verifying them is a music
   theory question I should not guess at. Two specifics:
   - The dim7 passing chords use degrees 2, 4, 7, 9. Because dim7 is symmetric,
     degree 2 in C = Ddim7 ≡ Bdim7, which *is* the passing chord of the C major
     6th-diminished scale — so the pitches look right even though the old labels
     did not.
   - `{ degree: 2, type: '6' }` in the major table plays **D6 = D–F♯–A–B**, and F♯
     is outside C major. This is the one I would want checked before changing.
   File: `stem_lab/stem_tool_music.js`, `BARRY_HARRIS` table.

3. **Dark theme needs one visual pass in the app.** The numbers above are
   computed, not seen — I could not screenshot in this session. The contrast maths
   covers text-on-surface pairings; it cannot catch a saturated button that ends up
   next to a newly darkened panel and looks odd. The alpha-surface bug above is
   evidence the arithmetic alone misses things: it only surfaced because I went
   looking for hardcoded values my own scan had not modelled. Worth five minutes in
   the running app with the theme toggled, particularly the Beat Pad and the
   sheet-music staff.

4. **Preset and instrument names are still English** (`'Piano'`, `'Organ'`,
   `'Bass'`, `'Lead'`, …) — all ten equally, displayed raw. Localising them means
   separating a stable id from a display name in `PRESETS`. I left it rather than
   half-fix it, since fixing one name is what created the "Plomo" bug.

5. **Rhythm assessment is now built** (round 6) — what remains is whether the grading
   bands and the 75% pass mark match how you would grade a class. Both live in one
   place: `RHYTHM_TIGHT_FRACTION` / `RHYTHM_CLOSE_FRACTION` at the top of the scorer,
   and the pass condition in `finishRhythmRound`. The other half of the original gap is
   still open: the synth keyboard never connects to notation, while Singing Lab already
   has a staff renderer (`drawSightReadStaff`) that could be reused.

6. **The Beat Pad sequencer is the last transport still on a timer.** The metronome and
   Clap-Back now schedule on the audio clock (round 7); the Beat Pad's `_seqTick` chain
   still uses `setTimeout`, so a long take will drift the same way the metronome did.
   Converting it needs `playSample` to accept a `when` the way `playClick` and
   `playDrum` now do — mechanically the same change, but it touches the sample-playback
   path that the drum kits use, so it deserves a listen before and after rather than
   being done blind. Everything it needs is in place.

---

## Verification

```
node --check                       3/3 clean
dev-tools/check_free_vars.cjs      3/3 no new free variables
dev-tools/check_i18n_fallback.cjs  clean
vitest (17 files)                  202 passed, 0 failed
mirrors                            3/3 byte-identical
CRLF preserved                     5370/5370, 4831/4831, 2148/2148 lines
U+FFFD                             0 (one pre-existing artifact repaired)
dark theme                         158 rules, 656/656 covered, 0 contrast failures
unlocalised toast/SR sites         0 in all three tools
hardcoded canvas text              0 in all three tools
```

New test files: `tests/music_synth_core.test.js`,
`tests/music_metronome_and_labels.test.js`,
`tests/music_tempo_validation.test.js`,
`tests/singing_pitch_detection.test.js`,
`tests/singing_hold_gates.test.js`,
`tests/echotrainer_audio_lifetime.test.js`,
`tests/echotrainer_challenge_feedback.test.js`,
`tests/singing_vibrato.test.js`,
`tests/music_tools_canvas_text.test.js`,
`tests/music_rhythm_clapback.test.js`,
`tests/music_audio_clock.test.js`,
`tests/echotrainer_unlock_gate.test.js`.

Two of my own earlier tests needed updating along the way, both because they pinned a
spelling that a later fix improved rather than the invariant underneath:
`echotrainer_inline_regions_a11y` (tutorial label) and `music_metronome_and_labels`
(`tempoBPM` assignment). Both now assert the behaviour instead.

`tests/echotrainer_inline_regions_a11y.test.js` was updated: it pinned the exact
spelling of the tutorial card's concatenated English `aria-label`, which
localisation changed. It now asserts the invariants that matter per card
(`role="region"`, a non-empty accessible name, `tabIndex: 0`, and not
`role="dialog"`) rather than the spelling.
