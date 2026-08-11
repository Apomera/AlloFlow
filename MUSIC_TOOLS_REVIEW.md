# STEM Lab music tools — review and remediation, 2026-08-10

Covers the three music/audio tools:

| Tool | File | Lines | Tests before | Tests now |
|---|---|---|---|---|
| 🎹 Music Synthesizer (`musicSynth`) | `stem_lab/stem_tool_music.js` | 4,955 | none | 39 |
| 🎤 Singing Lab (`singing`) | `stem_lab/stem_tool_singing.js` | 4,779 | 5 | 38 |
| 🎧 Echo Navigator (`echoTrainer`) | `stem_lab/stem_tool_echotrainer.js` | 2,131 | 6 | 25 |

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

## Open — needs your call

1. **Barry Harris degrees (music theory).** I fixed the labels to match what
   sounds, but did not touch the `degree` values, because verifying them is a music
   theory question I should not guess at. Two specifics:
   - The dim7 passing chords use degrees 2, 4, 7, 9. Because dim7 is symmetric,
     degree 2 in C = Ddim7 ≡ Bdim7, which *is* the passing chord of the C major
     6th-diminished scale — so the pitches look right even though the old labels
     did not.
   - `{ degree: 2, type: '6' }` in the major table plays **D6 = D–F♯–A–B**, and F♯
     is outside C major. This is the one I would want checked before changing.
   File: `stem_lab/stem_tool_music.js`, `BARRY_HARRIS` table.

2. **Dark theme needs one visual pass in the app.** The numbers above are
   computed, not seen — I could not screenshot in this session. The contrast maths
   covers text-on-surface pairings; it cannot catch a saturated button that ends up
   next to a newly darkened panel and looks odd. The alpha-surface bug above is
   evidence the arithmetic alone misses things: it only surfaced because I went
   looking for hardcoded values my own scan had not modelled. Worth five minutes in
   the running app with the theme toggled, particularly the Beat Pad and the
   sheet-music staff.

3. **Preset and instrument names are still English** (`'Piano'`, `'Organ'`,
   `'Bass'`, `'Lead'`, …) — all ten equally, displayed raw. Localising them means
   separating a stable id from a display name in `PRESETS`. I left it rather than
   half-fix it, since fixing one name is what created the "Plomo" bug.

4. **Rhythm is still only half-addressed.** The metronome is now reachable with five
   metres and a visible downbeat, which gives the tool a rhythm *reference*. What is
   still missing is rhythm **assessment**: a clap-back or rhythm-dictation activity
   that scores a student's timing. The pieces are all present now (metronome, the
   Beat Pad's tap-tempo, the sequencer grid). Second gap unchanged: the synth
   keyboard never connects to notation, while Singing Lab already has a staff
   renderer (`drawSightReadStaff`) that could be reused.

5. **The Beat Pad's own transport is separate from the new metronome.** They share
   `d.seqBPM`, so their tempos agree, but they are two independent timers and will
   drift apart over a long take. Unifying them means moving both onto Web Audio
   look-ahead scheduling (`ctx.currentTime` offsets rather than `setTimeout`), which
   is the right fix for sequencer jitter generally but is a real refactor of
   `playDrum`/`playNoteFor` to accept a `when` argument. Worth doing if anyone
   reports the beat feeling loose; not worth doing blind.

---

## Verification

```
node --check                       3/3 clean
dev-tools/check_free_vars.cjs      3/3 no new free variables
dev-tools/check_i18n_fallback.cjs  clean
vitest (11 files)                  102 passed, 0 failed
mirrors                            3/3 byte-identical
CRLF preserved                     4955/4955, 4779/4779, 2131/2131 lines
U+FFFD                             0 (one pre-existing artifact repaired)
dark theme                         158 rules, 637/637 covered, 0 contrast failures
```

New test files: `tests/music_synth_core.test.js`,
`tests/music_metronome_and_labels.test.js`,
`tests/singing_pitch_detection.test.js`,
`tests/singing_hold_gates.test.js`,
`tests/echotrainer_audio_lifetime.test.js`,
`tests/echotrainer_challenge_feedback.test.js`.

`tests/echotrainer_inline_regions_a11y.test.js` was updated: it pinned the exact
spelling of the tutorial card's concatenated English `aria-label`, which
localisation changed. It now asserts the invariants that matter per card
(`role="region"`, a non-empty accessible name, `tabIndex: 0`, and not
`role="dialog"`) rather than the spelling.
