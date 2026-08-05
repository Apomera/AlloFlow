# ⚠️ Handoff: allo_commands source/module drift (2026-08-04)

**To the session that committed `f6ef6f71e` ("Restore 27 module-only commands my rebuild
dropped") — thank you, and there is one more step.** Written by the session that caused
the original drift.

## What happened (my fault, not yours)

`allo_commands_module.js` is **auto-generated** from `allo_commands_source.jsx` by
`_build_allo_commands_module.js`. Throughout 2026-08-04 I edited the **generated module
directly** and committed it. Your rebuild from source was correct procedure; it simply
regenerated a module from a source that never contained my work, which is why 20 tests
went red. Nothing was destroyed and nothing was your error.

## RESOLVED — the port is done (see the commit carrying this doc)

The blocks, the 27 commands, their contracts and the three exports now live in
`allo_commands_source.jsx` and `_build_allo_commands_module.js`. The module is rebuilt
FROM source and 62/62 pass. Nothing below is outstanding; it is kept as the record.

## What was missing (historical)

Your restore also landed in the **generated module**, not the source. As of this writing:

| symbol | `allo_commands_source.jsx` (truth) | `allo_commands_module.js` (generated) |
|---|---|---|
| `modelCache` | **0** | 8 |
| `createVadSegmenter` | **0** | 3 |
| `detectNavigationIntent` | **0** | 2 |
| `startWhisperEngine` / `_voicePure` | **0** | present |
| `toggle_wake_word`, `download_voice_models`, `read_page_aloud`, `open_screen_coach`, `toggle_content_editing` | **0** | present |

So the very next `node _build_allo_commands_module.js` will drop all of it again. The fix
is to port the same content into **`allo_commands_source.jsx`**, then rebuild.

## What to port, and where to get it verbatim

Everything exists, byte-for-byte, in the current generated module (and in commit
`b22072e31` if you prefer the pre-drift copy):

```bash
git show b22072e31:allo_commands_module.js > /tmp/pre_drift_module.js
```

Four contiguous blocks, in this order, immediately **before** `function createVoiceLoop`:

1. `// ── On-device model cache ──` … through the `modelCache` object
   (Whisper weights in the durable storage bridge + `installTransformersCache`).
2. `// ── Voice engine pure helpers ──` … (`downsampleAudio`, `WAKE_RE`,
   `detectWakeCommand`, `createVadSegmenter`, `_getWhisperPipeline`,
   `_voiceStandbyPref`, `_voiceEnginePref`).
3. `// ── P-1 intent router, navigation lane ──` (`NAV_READING_RE`, `NAV_INTENT_RE`,
   `detectNavigationIntent`).
4. **Replace** the source's `createVoiceLoop` with the dual-engine version (Web Speech +
   on-device Whisper, wake-word standby, Kokoro-preferring `speakReply`). Its extent runs
   from `function createVoiceLoop(getCtx) {` to just before `function scoreCommand`.

Plus, if your command restore did not already include them:

- The command entries and their `COMMAND_CONTRACTS` sibling entries.
- Three additions to the `window.AlloModules.AlloCommands = { … }` export literal:
  `modelCache`, `detectNavigationIntent`, and
  `_voicePure: { downsampleAudio, detectWakeCommand, createVadSegmenter }`.

A working port script (blocks extracted by marker, inserted by anchor, aborts on
ambiguity) is at
`C:\Users\cabba\AppData\Local\Temp\claude\C--Users-cabba\c7afc9c4-e7b3-4f33-a24d-76afb2ae5d9a\scratchpad\port_voice.cjs`
— it did steps 1–4 cleanly against the pre-restore source; re-point it at the current
source if useful.

## Verification

```bash
node _build_allo_commands_module.js          # regenerate from source
npx vitest run tests/allo_commands_plan.test.js --pool=threads   # expect 62/62
grep -c "createVadSegmenter" allo_commands_source.jsx            # expect >= 1
cp allo_commands_module.js desktop/web-app/public/allo_commands_module.js  # mirror
```

The suite is the real gate: `tests/allo_commands_plan.test.js` pins the voice loop's
mic-mute handshake (`if (active && !speaking)`), the model-cache chunking, the wake-word
whole-word matching, and the navigation lane — all of which fail loudly if a block is
missing.

## Deploy warning (time-sensitive)

The **live CDN** (`@840ad53ef`) currently serves a module that *does* contain this work.
Until the source carries it, deploying a freshly-built module risks regressing live
features: on-device Whisper voice control, "hey Allo" wake-word standby, Kokoro spoken
replies, ~30 commands, and the Screen Coach entry point. **Verify the greps above before
any deploy that rebuilds this module.**

## The lesson worth keeping

If a file's header says *"Auto-generated. Source: X"*, edit X. I did not check, wrote a
memory note asserting there was no source pair, and burned a day of work into a build
artifact. Sorry for the mess — and thanks for catching it.
