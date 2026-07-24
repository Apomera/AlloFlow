# FABLE SQUAD HANDOFF — 2026-07-16 (5 simultaneous agents, one shared tree)

Aaron's quota is restored; Codex desktop is down (ARM native-addon crash — do not wait for it).
This doc partitions the work Codex left in flight into **5 non-colliding lanes**. It was written
after mining Codex's session logs (`~/.codex/sessions/2026/07/15/*.jsonl`), so the "what was
happening" sections are from the actual transcripts, not guesses.

**World state:** HEAD `ed3d7abe4` @ origin/main, deployed + CDN-verified. Fatal TDZ crashes fixed
(gate: `check_tdz_render`). Lumen re-landed @`045978230`. Full suite ~8,960 green with 4 known
stale-test failures (lane 4). Junk `_tmp_*.cjs`/`*.log` at root = ignorable. 9 dirty files = lane 4.

---
## ⚠️ SHARED-TREE PROTOCOL (all 5 agents, non-negotiable)
One physical worktree, five agents. The history here is littered with agents clobbering each other
(see MEMORY: concurrent-sessions, sweep epidemic — Lumen was reverted FIVE times by `git add -A`
style commits).

1. **Commit ONLY by pathspec** (`git add <your files>` / `git commit -- <paths>`). NEVER `git add -A`,
   `git add -u`, bare `git commit -a`, bare `git stash`, `--amend`, or `reset --hard`.
2. **Stay in your lane's file set.** If you must touch a file outside it, grep this doc for the owner.
3. **`AlloFlowANTI.txt` is shared-hot.** Before editing: `git diff AlloFlowANTI.txt` — if another
   agent's uncommitted hunk is present, stage ONLY your hunk (`git apply --cached` of your own diff,
   or the hash-object/update-index technique in memory `project_sd_offer_modal_debounce`).
   `desktop/web-app/src/App.jsx` + `src/AlloFlowANTI.txt` are GENERATED from it (build.js) — never
   hand-edit those; the pre-commit hook enforces pair parity.
4. **Generated pairs:** `*_source.jsx` → run its `_build_*_module.js` → commit source+module together.
5. **Before building on HEAD, verify no sweep hit Lumen:**
   `git show HEAD:stem_lab/stem_tool_lumen.js | grep -c focusIds` must be **7**. If 0, restore from
   `045978230` (recipe in memory `project_lumen_design`).
6. **Nobody deploys except Agent 5.** `deploy.sh` pushes to production (King Middle pilot).
7. Gates that must stay green for your commits: pre-commit hook (pipeline-integrity, source-pair-drift,
   staged-size) + `node dev-tools/check_tdz_render.cjs` + `node dev-tools/check_free_vars.cjs`.

---
## AGENT 1 — Adventure UX (PRIORITY 1a — the two things Aaron explicitly asked for)
**Owns:** `adventure_source.jsx`, `adventure_handlers_source.jsx`, `adventure_session_handlers_source.jsx`,
`view_adventure_source.jsx`, their `_build_*` modules, `adventure_module.js`, `tests/adventure*`,
plus their AlloFlowANTI.txt hunks (rule 3).

Codex died mid-fix on Aaron's last message (2026-07-15 ~11:45, session `019f65f8`):
1. **Remove the inline per-sentence audio/speaker buttons — from ADVENTURE-MODE narrative text
   ONLY.** ⚠️ SCOPE (Aaron, 2026-07-16): "I just want these buttons taken out of the text of
   adventure mode — it seems redundant. I don't necessarily want them removed from anywhere else."
   So: if the buttons come from a shared sentence/text renderer used by other views (leveled text,
   reader, etc.), gate/flag them OFF for adventure — do NOT delete the shared component or touch
   other surfaces' buttons. Keep the global auto-read/mute controls and click-on-text karaoke
   playback. Context: Aaron: "the user just clicks on the text itself to start karaoke TTS … looks
   clunky"; Codex agreed they're redundant. They were likely ADDED by Codex's own 07-15 morning
   "fix all issues" wave — find them via `git log -S` on the adventure files around 07-15
   09:30–11:00 commits (grep for lucide `Volume`/speaker icon or a per-sentence button in the
   adventure scene-text renderer; NOT the 🔊 emoji).
2. **Free-response mode doesn't drive the story.** Aaron: "it just reacts to what the user did
   without driving the story to a new challenge." Codex's framing: "the free-response scene needs to
   end with a concrete unresolved challenge rather than only narrating the consequence of the last
   action." Fix = the free-response turn prompt in `adventure_handlers_source.jsx` (the option-mode
   prompt already has "2. Present a macro-level challenge…" at ~:172 — free-response needs the
   equivalent 'end with a problem/next step' requirement + ideally a regression test asserting the
   prompt text).
3. Codex's earlier adventure fix-wave (persistence/sync: saves exclude embedded image payloads,
   resume restores scene image from the image store, live-session sync) IS committed — `npm test --
   adventure` was 74/74 green at 10:42. Re-run it after your changes; also
   `tests/adventure_runtime_regressions.test.js` (note: it's one of the dirty files — coordinate
   with Agent 4 before touching).

## AGENT 2 — CI is RED on origin (PRIORITY 1b — small, urgent, do first)
**Owns:** `.github/workflows/*`, `tests/e2e/*`.

Codex committed AND pushed a blocking workflow job that references a file it never created:
`.github/workflows/verify.yml:47` — job `adventure-journey` runs
`npx playwright test tests/e2e/adventure-journey.spec.ts` → **the file does not exist**, so GitHub
Actions fails on every push to Apomera/AlloFlow, and it will mask real failures.
- Option A (best): write the Playwright spec (check whether playwright + a config even exist in the
  repo/CI image — Codex also left "behavior-test conversion incomplete"). Keep it a cheap smoke:
  launch, start an adventure, one option turn, one free-response turn.
- Option B (fast stopgap): mark the job `continue-on-error: true` or remove it, with a TODO;
  unblock the pipeline TODAY, then do A.
- Check the Actions tab for other red jobs the deploys may have accumulated.

## AGENT 3 — Karaoke TTS leveled-text caching (PRIORITY 1c — Aaron: "stuck on for a while")
**Owns:** `immersive_reader_source.jsx`+module, `karaoke_audio_store_module.js`, `tts_source.jsx`+module,
`audio_helpers_source.jsx`+module, `kokoro_tts_loader.js`, `piper_tts_loader.js`,
`tests/karaoke*`, `tests/edit_audio_ui.test.js`, plus their ANTI hunks (rule 3).

Aaron's symptoms (session `019f6613`, 09:59): (a) leveled-text karaoke has a **startup delay and
skips the first lines** (latency regressed vs before, suspected MP3-conversion change); (b) karaoke
does **NOT auto-populate the recorded MP3s in edit mode** (capture-as-you-play persistence).
Codex's diagnosis + claimed fixes (commit `e5027632e "fix karaoke TTS latency and MP3 capture"`,
plus earlier `e5142233c` persistence hardening, `9dadb72f1` sentence-key unification):
- Kokoro returned only the FIRST streaming chunk to karaoke callers → skipped/truncated lines.
- Sentence splitting: preserve source line breaks; cap local-TTS units at 120 chars
  (`karaoke_audio_store_module.js`); honorific regex bug ("Dr./Mr." over-splitting) previously fixed.
- Look-ahead + current playback now share in-flight synthesis (`callTTSInFlight` map — landed in
  `tts_source.jsx`, verified present).
- Playback starts BEFORE background MP3 capture/conversion; MP3 encoding yields cooperatively.

**BUT Aaron still reports being stuck** — so either a piece didn't land, regressed again, or the fix
is incomplete. Your job: (1) re-verify each bullet against current bytes (some may exist only in the
module, not the source, or vice versa — the pair-drift gate only covers enrolled pairs);
(2) write/extend a regression test that mounts the real leveled-text karaoke path and asserts
first-line playback + edit-mode MP3 population (`tests/karaoke_tts_regressions.test.js`,
`tests/edit_audio_ui.test.js`, `tests/karaoke_audio_store_resilience.test.js` were 17/17 green on
07-15 — they clearly don't capture Aaron's repro); (3) the likeliest uncovered seams: Kokoro/local
vs **Gemini TTS** path divergence, the leveled-text (simplified view) sentence list vs
`KaraokeAudioStore` key mismatch across levels/languages, and hydration when the active leveled
resource changes (ANTI ~L22385-22445 per Codex's trace).

## AGENT 4 — In-flight triage + stale-test debt (PRIORITY 2)
**Owns:** the 9 dirty files below, `tests/audit_coherence_fixes.test.js`,
`tests/watchdog_breaker_reset.test.js`, `tests/student_accessibility_contracts.test.js`,
`view_pdf_audit_source.jsx` (D5 area), `doc_pipeline_source.jsx`.

1. **Triage the uncommitted edits sitting in the tree** (probably Codex's final pre-crash GUI work;
   nobody has reviewed them): `doc_pipeline_source.jsx`, `stem_lab/stem_tool_roadready.js`,
   `tests/{adventure_runtime_regressions, gemini_pacing_stagger, ocr_page_skip_fix,
   pdf_extraction_timeout, throttle_defer_revisit, throttle_resilience, watchdog_breaker_reset}.test.js`.
   For each: `git diff <file>` → decide finish/commit (pathspec!) or discard (`git checkout -- <file>`
   ONLY after confirming with the diff that it's abandoned; when unsure, keep + commit to a
   `wip:` commit so nothing is lost).
2. **Fix the 4 known stale tests** (all verified code-correct, tests assert superseded internals —
   details in `HANDOFF_2026-07-15.md`): audit_coherence D5 (sanitized-export onClick evolved),
   watchdog_breaker (reset call moved past the 1400-char window — the dirty file may already BE
   Codex's fix attempt), student_accessibility_contracts (build.js stamps hashed loader form —
   either accept-hash in the test or make build.js keep `./local` form in the deploy App.jsx; small
   design call, document whichever), + re-run sel_clear_data (fixed 07-15, should be green).

## AGENT 5 — Integration captain + gates + the ONLY deployer (PRIORITY 2, then final)
**Owns:** `deploy.sh`, `dev-tools/check_*.cjs`, `.git/hooks` additions, final deploy.

1. **Add the Lumen sweep guard** (promised, not yet built): a check that FAILS if
   `stem_lab/stem_tool_lumen.js` loses its wave markers (`grep -c focusIds` != 7) — wire into
   pre-commit hook AND deploy.sh Step 0.6 (pattern: `check_tdz_render.cjs`). Generalize if cheap:
   protect `dataHash` (5) too.
2. **Monitor the tree** while agents 1–4 work: `git log --oneline -15` + status sweeps; if two agents
   collide on ANTI, arbitrate (rule 3).
3. **Endgame:** when lanes 1–4 report done — full `npx vitest run`, all deploy gates, then ONE
   `./deploy.sh "<summary>"`, verify CDN freshness (md5 loop — pattern in HANDOFF_2026-07-15.md),
   and remind Aaron: **re-paste AlloFlowANTI.txt into Gemini Canvas** (Canvas doesn't auto-update)
   and smoke-test: adventure free-response turn, leveled-text karaoke first-line + edit-mode MP3s,
   Lumen loads with focus-subset chip.

---
## Quick reference
- Repo: `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated` (main; origin=GitHub Apomera/AlloFlow,
  backup=Codeberg). Canonical app = `AlloFlowANTI.txt` (Gemini Canvas is the primary surface).
- Tests: `npx vitest run [pattern]`. Deploy gates: deploy.sh Step 0.6/0.7 (`dev-tools/check_*.cjs`).
- Yesterday's full context: `HANDOFF_2026-07-15.md` (same folder).
- Codex transcripts (the source of the lane briefs): `~/.codex/sessions/2026/07/15/` — key sessions:
  `09-30-17…019f65f8` (adventure), `09-59…019f6613` (karaoke; visible inside the 10-38 reviewer log).
