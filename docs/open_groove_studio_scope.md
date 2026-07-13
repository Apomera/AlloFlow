# Open Groove Studio - Product Scope (v0.1, 2026-07-03)

**Status:** Milestone 0 scaffold started. This memo proposes a standalone
electronic music, synthesis, sampling, beatmaking, and notation tool. It should
borrow lessons from the current STEM Lab Music Synthesizer, but it should not be
implemented by continuing to grow `stem_lab/stem_tool_music.js`.

**Milestone 0 build note (2026-07-03):** Added a new `music_studio/` prototype
area with a pure project core, scheduler, small Web Audio wrapper, standalone UI
shell, and focused tests in `tests/open_groove_core.test.js`.

**Placement decision (2026-07-03):** Treat Open Groove Studio as a standalone
Learning Hub tool, not a STEM Lab subtool. The STEM Lab music synthesizer remains
the approachable exploratory instrument; Open Groove becomes the deeper music
learning and composition surface.

**Refinement note (2026-07-03):** Added bar-scoped drum editing, synth note-step
editing, notation preview data, a simple MusicXML sketch export, tempo editing,
and JSON project load/download affordances in the prototype shell.

**Second refinement note (2026-07-03):** Added key/scale helpers, chord
progression writing, chord symbols in the notation preview, user-owned recording
asset metadata, pad assignment for recorded samples, attribution text generation,
and a first Samples/Rights UI surface.

**Third refinement note (2026-07-03):** Added embedded audio data support for
user-owned samples, lightweight JSON serialization without embedded audio, audio
file import affordances, and browser restoration hooks for embedded sample
playback.

**Fourth refinement note (2026-07-03):** Added sample-region metadata for pads,
basic trim controls, equal-slice chopping across pads, scheduler support for
sample offsets, and sliced-pad storage reporting.

**Fifth refinement note (2026-07-03):** Added a Standard MIDI File export path
for pitched notes and drum hits, plus a Project-panel MIDI download affordance
for moving Open Groove ideas into DAWs and notation tools.

**Sixth refinement note (2026-07-03):** Added playback-aware swing timing,
deterministic drum humanization, selected-pad accent/clear tools, and visible
groove status in the step sequencer.

**Working name:** Open Groove Studio. If folded into AlloFlow branding later,
"AlloGroove" is a reasonable product name.

---

## 1. Product Thesis

Build a local-first, open-source groovebox and composition studio: an accessible,
browser-based competitor in spirit to MPC-style beat systems, but designed from
the beginning around open formats, user-owned sounds, real notation, and classroom
or independent creator use.

The core idea is that beatmaking and composition should be two views of the same
musical object. A pattern can be played from pads, edited in a step sequencer,
shown in a piano roll, arranged on a timeline, and represented in notation without
losing its identity.

This is feasible if the foundational model treats music as structured events,
not just audio clips.

---

## 2. Why This Should Be Standalone

The existing STEM Lab music tool already proves several useful pieces:

- Web Audio playback works in the app.
- It has oscillator synth engines, including FM, supersaw, sub, pad, and plucked
  style synthesis.
- It has drum synthesis and a Beat Pad direction.
- It includes harmony, scales, chords, theory, waveform visualization, effects,
  and a performance-oriented UI.

But it is currently an educational tool inside a large STEM Lab file. A serious
production tool needs a cleaner architecture:

- A reusable audio engine.
- A project file format.
- A reliable timing scheduler.
- A composition data model.
- Sample and license metadata.
- Dedicated save/load/export behavior.
- Dedicated accessibility contracts.
- Unit tests around the non-DOM music core.

Recommendation: keep the STEM Lab tool as the approachable learning instrument.
Create Open Groove Studio as a new standalone studio surface, likely following the
same broad pattern as Video Studio / AlloStudio rather than the STEM Lab plugin
pattern.

---

## 3. Non-Goals

This should not try to be every DAW on day one.

Out of scope for the first serious version:

- Full multitrack audio editing like Reaper, Logic, or Pro Tools.
- Third-party VST/AU plugin hosting.
- A full sample marketplace.
- Cloud collaboration.
- Advanced mastering.
- Perfect MusicXML round-trip for every possible score engraving edge case.
- Exact emulation of MPC hardware workflows, branding, sounds, or proprietary
  behavior.

The first target is a strong, fun, musically credible groovebox plus composition
workspace.

---

## 4. Foundational Product Model

Use one central project model. Every view reads and writes this model.

### Project

```js
{
  schemaVersion: 1,
  title: "Untitled Groove",
  bpm: 92,
  swing: 0.08,
  timeSignature: [4, 4],
  key: { tonic: "C", mode: "minor" },
  ppq: 960,
  tracks: [],
  patterns: [],
  scenes: [],
  arrangement: [],
  assets: [],
  mixer: {},
  license: {}
}
```

### Track Types

- `drumRack`: pad-triggered samples and drum synths.
- `synth`: pitched instrument track.
- `sampler`: pitched or sliced user sample track.
- `audio`: recorded or imported audio regions.
- `notation`: score-first track, still backed by notes/events.
- `automation`: parameter curves.

### Event Types

- `note`: pitch, start tick, duration tick, velocity, articulation.
- `drumHit`: pad id, start tick, velocity, probability, flam, microtiming.
- `audioRegion`: asset id, start tick, source start, length, gain, fades.
- `automationPoint`: target parameter, tick, value, curve.
- `chord`: root, quality, bass, start tick, duration tick.
- `marker`: section label, rehearsal mark, cue, lyric, or annotation.

### Why PPQ Matters

Use ticks, not floating second values, for composition data. Audio playback can
resolve ticks to seconds at render time. This lets the same pattern survive tempo
changes, quantization, notation rendering, MIDI export, and MusicXML export.

Recommended base: `ppq = 960`, enough for common notation values, swing,
microtiming, and MIDI-style editing.

---

## 5. Audio Engine Scope

### V1 Engine

- Web Audio engine wrapper.
- Transport with play, stop, pause, loop, count-in, metronome.
- Lookahead scheduler for stable pattern playback.
- Master clock based on `AudioContext.currentTime`.
- Track-level gain, pan, mute, solo.
- Master limiter or soft clip safety.
- Offline WAV render for export.

### Instruments

- Drum synth: kick, snare, hat, clap, tom, rim, shaker, cymbal.
- Sample pad playback with pitch, gain, start, end, choke group, reverse.
- Basic subtractive synth: oscillator, filter, envelope, LFO.
- FM synth voice for basses, bells, and metallic tones.
- Supersaw/pad voice for electronic leads and chords.
- Pluck voice for guitar, kalimba, harp-like sounds.

### Effects

Minimum useful set:

- Filter.
- Delay.
- Reverb.
- Distortion/saturation.
- Compressor.
- EQ or tone tilt.

Later:

- Chorus/flanger/phaser.
- Bitcrush/sample-rate reduction.
- Sidechain-style pump effect.
- Tape/lo-fi module.

---

## 6. Sequencing and Beatmaking

### MVP Groovebox

- 16 pads with velocity layers where available.
- Keyboard trigger mapping.
- Optional MIDI input.
- 16-step and 32-step grid.
- Pattern lengths independent per track.
- Per-step velocity.
- Per-step probability.
- Per-step nudge/microtiming.
- Per-step repeat/ratchet.
- Mute and solo per track.
- Pattern duplicate, clear, randomize, humanize.
- Scene launcher: trigger groups of patterns together.

### MPC-Inspired, Not MPC-Copy

The workflow should feel immediate:

- Tap pads.
- Record a pattern.
- Quantize lightly or leave human timing.
- Chain patterns into a song.
- Resample the result.

But we should avoid proprietary names, exact kit copies, exact UI copying, or
anything that creates brand/license risk.

---

## 7. Samples and Licensing

### Built-In Sound Policy

Default built-in sounds should be license-clean and export-safe:

- Prefer original generated samples made for this project.
- Prefer CC0/public-domain sounds when external samples are used.
- Allow CC BY packs only if attribution metadata can travel with the project and
  export notes.
- Avoid non-commercial licenses for built-in production content.
- Avoid sample packs that restrict redistribution, commercial use, or standalone
  extraction.

### Sample Manifest

Every shipped or imported asset should carry metadata:

```js
{
  id: "kick_deep_01",
  type: "sample",
  name: "Deep Kick 01",
  file: "kits/core/kick_deep_01.wav",
  source: "Open Groove Studio Core Kit",
  creator: "AlloFlow contributors",
  license: "CC0-1.0",
  attributionRequired: false,
  originalUrl: null,
  checksum: "sha256:...",
  tags: ["kick", "drum", "electronic"]
}
```

### User Imports

Users should be able to import samples, but the app should separate user-owned
assets from built-in assets:

- Imported audio is stored in the local project file or companion asset folder.
- The user can mark license: own recording, CC0, CC BY, unknown, or restricted.
- Unknown/restricted assets can still be used locally, but exports should warn
  the user that license clearance is their responsibility.

### User Recording

Recording should be a first-class feature:

- Record from microphone or line input where browser/device permissions allow it.
- Record directly into a pad.
- Record into the timeline.
- Resample internal playback into a new pad or audio region.
- Trim, fade, normalize, reverse, crop silence.
- Auto-chop into slices by transient or equal divisions.
- Map slices across pads.

Privacy rule: user recordings stay local unless the user explicitly exports or
shares them.

---

## 8. Real Composition Abilities

Open Groove Studio should be more than a loop toy.

### Composition Features

- Piano roll.
- Drum grid.
- Chord track.
- Key and scale awareness.
- Harmonic suggestions that can be ignored.
- Bassline generator based on current chords.
- Melodic motif tools: invert, retrograde, transpose, vary rhythm.
- Arrangement timeline with sections: intro, verse, chorus, bridge, outro.
- Pattern-to-song workflow.
- Song markers and rehearsal marks.
- Tempo and time-signature changes after MVP.

### Musical Intelligence

The tool should understand:

- Notes, rests, durations, ties.
- Chords and inversions.
- Scales and modes.
- Measures and beats.
- Swing and straight timing.
- Drum notation mapping.
- Quantized notation versus performed timing.

This allows one performance to have both:

- Human playback timing.
- Clean readable notation.

---

## 9. Notation From the Foundation

Notation should not be bolted on as an image export. It should be another view of
the same event model.

### V1 Notation Goals

- Render simple treble/bass staff notation for pitched tracks.
- Render percussion staff or grid notation for drum tracks.
- Show key signature, time signature, measure bars, notes, rests, ties, dots.
- Chord symbols above measures.
- Quantize-to-notation view that does not destroy the original performance.
- Export MusicXML for score editors.
- Export MIDI for DAWs and notation programs.

### Data Model Addition

Store notation interpretation separately from performance timing:

```js
{
  eventId: "note_123",
  performedStartTick: 1927,
  performedDurationTicks: 478,
  notationStartTick: 1920,
  notationDurationTicks: 480,
  spelling: "Eb4",
  tie: null,
  articulation: "staccato"
}
```

This prevents a common failure mode: quantizing notes for the score should not
ruin the groove.

### Candidate Notation Stack

Evaluate at implementation time:

- VexFlow for browser notation rendering.
- OpenSheetMusicDisplay if MusicXML display becomes the primary need.
- MusicXML as the score interchange format.
- MIDI as the performance interchange format.

The internal model should not be identical to any one library's model. Libraries
should adapt to the project model, not own it.

---

## 10. UI Surfaces

This should open directly into the instrument, not a marketing landing page.

### Main Views

- **Pads:** 16-pad performance surface, kit browser, pad editor.
- **Steps:** step sequencer for drums and synth lanes.
- **Keys:** playable keyboard, scale lock, chord mode.
- **Piano Roll:** note editing for pitched tracks.
- **Score:** notation view and score cleanup tools.
- **Song:** scenes, arrangement, sections, timeline.
- **Mixer:** track levels, effects, sends, master.
- **Sampler:** record, trim, chop, map, resample.

### Accessibility Requirements

- Full keyboard operation.
- Screen reader labels for every pad, step, track, and transport control.
- Non-color-only step states.
- Visible focus rings.
- High contrast mode.
- Reduced motion support.
- Auditory feedback that is useful but not required to operate the app.
- Numeric editing paths for users who cannot drag precisely.
- Pad grid can be operated as buttons, not canvas-only hit targets.

---

## 11. File Formats and Export

### Native Project

Use a JSON project file with optional embedded assets:

- `.ogroove.json`: lightweight project without embedded media.
- `.ogroove.zip`: project plus samples, recordings, stems, metadata.

### Export Targets

V1:

- WAV master export.
- Project save/load.
- MIDI export.
- License report for exported project.

V2:

- MusicXML export.
- Stem export per track.
- Individual pattern export.
- PNG/PDF score export if notation view is mature.

V3:

- MIDI import.
- MusicXML import.
- Ableton/DAW interchange only if it becomes worth the complexity.

---

## 12. Architecture Proposal

New standalone files, names tentative:

```text
music_studio/
  open_groove_module.js          Runtime UI module, lazy-loaded.
  open_groove_core.js            Pure project model, reducers, timing math.
  open_groove_audio.js           Web Audio engine wrapper.
  open_groove_scheduler.js       Transport and lookahead scheduling.
  open_groove_synths.js          Synth and drum voices.
  open_groove_sampler.js         Import, recording, slicing, asset handling.
  open_groove_notation.js        Score interpretation and MusicXML adapter.
  open_groove_export.js          WAV/MIDI/MusicXML/native project export.
  kits/
    core-kit.manifest.json
tests/
  open_groove_core.test.js
  open_groove_scheduler.test.js
  open_groove_notation.test.js
```

Follow the app's existing lazy module pattern, but keep the musical core DOM-free
and testable.

---

## 13. Milestones

### Milestone 0: Technical Spike

Goal: prove the foundation.

- New standalone module shell.
- Pure project model.
- Transport/scheduler.
- 16 pads triggering generated drum sounds.
- One synth track.
- Save/load JSON.
- Basic tests for ticks, patterns, and event scheduling.

Exit bar:

- A 4-bar loop plays in time.
- User can save and reload the loop.
- No STEM Lab file changes required.

### Milestone 1: Groovebox MVP

Goal: make it fun and musically useful.

- 16 pads.
- Drum rack.
- Step sequencer.
- Pattern duplicate/clear.
- Swing, velocity, probability.
- Mixer basics.
- Built-in license-clean core kit.
- WAV export.
- Keyboard controls.
- Accessibility pass.

Exit bar:

- Make a complete 8-bar beat and export it as WAV.
- Project opens later with the same sounds and patterns.
- License report says all built-in sounds are export-safe.

### Milestone 2: Sampling and Recording

Goal: make it feel like an instrument.

- Microphone/line-in recording.
- Record into pad.
- Trim, normalize, reverse, fade.
- Auto-chop to pads.
- Resampling internal playback.
- User asset manifest.

Exit bar:

- Record a sound, chop it, sequence it, resample the loop, and save the project.

### Milestone 3: Composition Layer

Goal: make it a real writing tool.

- Piano roll.
- Chord track.
- Key/scale tools.
- Arrangement timeline.
- MIDI export.
- Quantize-to-notation data.
- Early score view.

Exit bar:

- Write drums, bass, chords, and melody, then export MIDI and WAV.

### Milestone 4: Notation and Score Export

Goal: connect beatmaking to readable composition.

- Staff notation view.
- Percussion notation.
- Chord symbols.
- MusicXML export.
- Score cleanup tools.
- Printable/exportable score once rendering is reliable.

Exit bar:

- A short composition exports as MusicXML and opens coherently in a notation
  editor.

### Milestone 5: Open-Source Hardening

Goal: make it community-ready.

- Contributor docs for sample packs.
- License validation scripts.
- Project schema docs.
- Public demo songs using only clean assets.
- Regression tests for export round trips.
- Accessibility QA checklist.

---

## 14. Risks and Mitigations

| Risk | Why it matters | Mitigation |
|---|---|---|
| Browser timing drift | Bad timing kills a music tool. | AudioContext clock, lookahead scheduler, tests around event timing. |
| Scope creep into full DAW | Could stall the project. | Groovebox first, arrangement second, deep audio editing later. |
| Sample licensing mistakes | Users need safe exports. | CC0/original built-ins, asset manifest, license report, no NC content by default. |
| Notation complexity | Full engraving is a large domain. | Store notation intent early, ship simple score view first, export MusicXML before perfect in-app engraving. |
| User recording permissions | Browser/device differences. | Graceful permission prompts, feature detection, import fallback. |
| CPU load | Synths/effects can get heavy. | Voice limits, track freeze/resample, efficient nodes, master safety. |
| Accessibility on grid UIs | Pad/step tools are often mouse-first. | Treat pads/steps as real controls, not canvas-only visuals. |

---

## 15. Initial Backlog

1. Create `music_studio/open_groove_core.js` with project schema, reducer, tick
   helpers, pattern helpers, and validation.
2. Create `tests/open_groove_core.test.js` for project creation, note events,
   drum events, pattern duplication, and tick/measure conversion.
3. Create `music_studio/open_groove_audio.js` with a minimal Web Audio wrapper.
4. Create `music_studio/open_groove_scheduler.js` with transport and lookahead.
5. Create a standalone UI module shell with transport, 16 pads, and step grid.
6. Add generated CC0-style drum voices first, before any external samples.
7. Add project save/load.
8. Add WAV export.
9. Add sample manifest support.
10. Add notation interpretation tests before building the score UI.

---

## 16. Key Decision

The ideas do not clash:

- Beatmaking wants immediacy.
- Sampling wants audio assets.
- Composition wants structured musical events.
- Notation wants quantized symbolic interpretation.

They only clash if the app is built as loose audio blobs. If the foundation is a
structured music model with separate performance and notation layers, this can be
both a strong groovebox and a true compositional tool.

Recommended next step: build Milestone 0 as a thin, testable prototype in a new
`music_studio/` folder.
