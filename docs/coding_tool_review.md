# codingPlayground — Deep-Dive Review & Enhancement Roadmap

> **Historical review snapshot, not current open-bug status (2026-07-09):** This June review is preserved for its verified line-number findings and roadmap thinking. Later code and QA work may have changed individual findings; verify against current `stem_lab/stem_tool_coding.js`, mirrors, tests, and a11y/visual reports before treating an item as open.

_Generated 2026-06-14 via a 26-agent review workflow (map → 8-dimension analysis → adversarial verification → synthesis). Findings grounded in real line numbers; the adversarial pass corrected several dimension overclaims. Cross-checked by hand on the two load-bearing claims (no-eval interpreter; ungated AI)._

**File:** `stem_lab/stem_tool_coding.js` (~2858 lines, hand-maintained; `build.js` mirrors root → `desktop/web-app/public/` + `build/` at deploy). Edit the root file only.

---

## 1. What it is

A Logo/turtle-graphics coding playground registered as StemLab tool `codingPlayground` (L19). Two surfaces toggled by `playgroundMode` (L1923):

**Turtle mode (default).** Build a turtle program as drag/click **blocks** (15-item toolbox, L297-313) or as **text** in a JS-like editor with line numbers and Tab→2-spaces (L2536). The surfaces auto-sync via `blocksToText`/`textToBlocks` on a 400ms debounce (L1414-1425). Running animates step-by-step onto a 500×500 canvas drawn by the **host** (`stem_lab_module.js` L2165-2237). The DSL is hand-rolled — **zero `eval`/`new Function` on student code**. Includes 10 auto-checked challenges (+15 XP), 10 badges (+10 XP), 10 templates, 3D mode (pitch/yaw/roll/forward3D), a Variable Inspector, a CS-Concepts panel, and a Big-O "Complexity Inquiry" widget (L1800-1906).

**Robot Commander (`playgroundMode='robot'`).** 8 grid-maze levels (r1..r8, L376-444) from 9 robot blocks (move/turn/repeat/ifWall/ifGem/collectGem/paintCell/whileNotGoal), animated 250ms/step, auto-judged on grid end-state (+20 XP).

**Cross-cutting:** undo/redo (Ctrl+Z/Y, 50-deep), turtle skins, grid/coords toggles, cumulative-vs-fresh drawing, timeline scrubber, coordinate picker, background music, 3 AI-tutor buttons (Explain/Suggest/Debug), PNG/SVG/JSON/share-link export + snapshot.

---

## 2. Real strengths (preserve these)

- **The no-eval interpreter is the headline safety property and it holds.** `textToBlocks` (L767-837) is a recursive-descent regex parser; `executeBlocks`/`step` (L880-1146) is a flatten-then-trampoline executor; `evalCondition` (L849-877) is a single `lhs op rhs` comparison. Student code is *data*, never executed JS. AI output flows only into `aiExplanation` and renders as inert `pre-wrap` text (L2797) — never fed back through the parser, so a hallucinated "program" in a reply cannot run. **Do not regress this.**
- **Loop/recursion caps exist:** `while` caps at `_iterCount<1000` (L994); robot caps at `maxSteps=500` (L451/496) with bounded `whileNotGoal` expansion (L475).
- **The Big-O Complexity Inquiry widget is the integrity exemplar** (L1800-1906): "No score, no reveal," "I'm stuck → open questions, no answer key," and an honest disclaimer that ops counts are "illustrative pedagogical estimates." This is the standard the rest of the tool should match.
- **No measurement overclaim anywhere.** `getXP` read (L46) but never displayed; no level/skill/mastery/proficiency label. Badges = achievements, not competencies.
- **Genuine dual-representation (UDL Action/Expression):** blocks and text are one shared data model in two views.
- **Strong static a11y baseline:** reduced-motion CSS (L1-9), ~70 aria-labels, a text Variable Inspector mirroring turtle state (L2799-2836), icon+text+badge challenge list (not color-only), keyboard run/stop/undo wiring, Tab-inserts-spaces.

---

## 3. Problems that matter

### HIGH

- **STOP is dead — running programs are uninterruptible. (VERIFIED)** Esc → `__codingKB.stop` (L1605/L1613) only flips `running:false`. The trampoline `step()` re-schedules `setTimeout(step, spd)` unconditionally (L1143), never reads `running`, stores no timer id, and each tick re-writes `running:true` (L1140), clobbering the flag. Robot `step()` (L494/539) has no stop path at all. The advertised stop control is functionally nonexistent — a correctness bug *and* a UDL/agency problem. (Loop caps mean nothing currently hangs, so real-but-not-catastrophic.)
- **`blocksToText` dead 3D branches → ReferenceError. (VERIFIED L690-744)** Six branches inside the *pure serializer* run executor math, call `upd()`, push to `lines3D`/`allLines`, and reference `vars`/`allLines` that don't exist in scope — shadowing the correct emitters at L749-760. Reaching any throws `ReferenceError: vars is not defined`. **Reachability is narrow** (adversarial correction): 3D commands aren't in the toolbox or reference, so the only trigger is hand-typing `forward3D(50)`/`pitch(30)` in text mode then toggling/exporting/undoing. Latent total-function defect + a trap for future edits.
- **AI is DEFAULT-ON with no teacher gate — house-norm violation.** All 3 sites (L1235/1253/1271) call `callGemini` directly; the cluster renders on `callGemini && ...` (L1982). Grep for `aiHintsEnabled`/consent = 0, while ctx **already** exposes `ctx.aiHintsEnabled` (default-OFF, `stem_lab_module.js` L4904) and siblings gate correctly (geometryworld L6272, roadready L3349, spacecolony L90). OFF ≠ zero traffic. Prompts are kid-safe and Debug is answer-grounded ("Do NOT give the full solution," L1280) — so this is governance/cost, not a safety breach.
- **Golden master pins ONLY the default closed state.** `stem_longtail_tools_golden.test.js` L32 + `stem_widgets_smoke.test.js` L60 render `renderTool(id, {})` — default turtle/blocks, empty program, `callGemini:null`. The interpreter, robot mode, text mode, 3D, all `check()` predicates, badge logic, and import/export are **unpinned**. Any interpreter/robot/3D change ships green. Central decomposition-safety gap.

### MEDIUM

- **Variable Inspector "User Variables" panel is permanently empty. (VERIFIED dead)** Reads `d._vars` (L2826-2831), but `executeBlocks`'s `vars` is function-local (L883) and never persisted (zero writes to `_vars`). `setVar`/`changeVar`/`random` values are invisible — silently misleading.
- **Challenge auto-checks are gameable proxies.** Mostly bare line counts: star `lines.length>=5` (L322), spiral `>=10`, freestyle `>=20`. The "square base" sub-check (L326) is a **no-op** (`getEndpoints().segments` ≡ `lines.length`, so `slice(0,4).segments` is always 4). Rainbow is tagged "Variables" but needs zero variables. A green ✅ + XP asserts a concept the output may not contain.
- **`cumulativeMode` lets length-checks and accumulation badges be farmed** — completion judged on accumulated `finalLines`, not the current program (L1153-1156).
- **Robot conditional levels (r5, r7) are structurally unbuildable.** Hints need `ifWall` nested inside `whileNotGoal`, but child toolboxes (L2282/L2304) only offer non-control blocks and the child renderer (L1708) is non-recursive. The executor supports nesting; the UI can't produce it → Robot Commander plateaus at r4.
- **Text-mode help advertises syntax the parser rejects.** Reference (L2565) shows `if(condition, ifFn, elseFn)` / `repeat(n, fn)`, but the parser only accepts brace form (L790/L801). Copying the docs → line silently dropped (L832). Misconception at the exact blocks→text moment.
- **Silent-drop parser + scoping footgun.** Unparseable lines fall to `i++` (L832) with no feedback; `goto` rejects negatives. `setVar` stores `vars['size']` unprefixed (L921) while `evalCondition` resolves only `$size` → `while (size < 100)` silently means `0 < 100` (always true).
- **`highContrastMode` is a non-functional toggle** — persists state, restyles only its own button (L2778); host canvas draw never reads it. A broken a11y control is worse than none.
- **Canvas a11y gap.** Both canvases lack role/aria-label/text alternative; `canvasNarrate` fires once at init; the `allo-live-coding` live region (L550-561) is created but **never written to**. `announceToSR`/`srOnly`/`a11yClick` aliased, zero call sites.
- **11 strings use `text-slate-600` (~2:1 on dark) — fails WCAG AA** (L2137, 2251, 2292, 2518, 2525, 2748, 2827), mostly empty-state guidance a beginner needs most.

### LOW

- **Unbounded turtle recursion + O(n²) frame recording.** `callFunction` splices a deep-cloned body with no depth cap; `recordFrame` (L1372) pushes a full `lines.slice()` every step — quadratic memory/React churn, janky on a Chromebook. (Robot mode is safe.)
- **Block↔text round-trip is lossy** for negative `goto`, comments (unsupported — destroyed each cycle), typo'd calls (`forward()` matches greedy `^(\w+)\(\)$` and no-ops).
- **Dead ctx surface:** `callTTS`/`callImagen`/`callGeminiVision` aliased (L50-52), never called.
- **Global window leaks:** `__bgMusicInterval`/`__codingAudioCtx` never torn down on tool-switch — music can keep playing after navigating away.

**Downgraded/dropped by the adversarial pass:** "any 3D program crashes" → narrowed to hand-typed 3D only. "No real eval" → confirmed TRUE. "STOP fix is high impact" → med (nothing currently hangs). Several "must re-baseline golden" claims → corrected to no re-baseline (the affected DOM is text/robot-mode-only, absent from the default digest).

---

## 4. Prioritized enhancement roadmap

Only proposals marked **advance** or **revise** by the verify phase.

### (A) Quick wins — S effort, high leverage

**A1. Add a real STOP (cancellation token + stored timer). [advance, S]** Make Esc/Stop actually halt turtle *and* robot runs. Module-scope `_runToken`/`_stepTimer` (near `_codeAC` L12, NOT inside the per-render IIFE); `var myToken = ++_runToken` in `handleRun`; `if (myToken !== _runToken) return` at the top of `step()`; replace L1143 with `_stepTimer = setTimeout(step, spd)`; `stop()` does `_runToken++; clearTimeout(_stepTimer); updMulti({running:false}); announceToSR('Program stopped')`. Mirror in robot `step()` (L494/539) + add a robot stop trigger; add a visible Stop button for touch. **Golden: digest unchanged (no re-baseline).**

**A2. Wire the Variable Inspector to live state. [advance, S]** Publish a filtered numeric copy of `vars` into `_vars` each step (in `step()`'s `updMulti` L1140, gated by a closure-local shallow-compare; filter `__func_` keys; seed `_vars:{}` on run). `t()`-wrap the newly-visible "User Variables" label. **Golden: `_vars` undefined at SSR → guard short-circuits → unchanged.**

**A3. Fix the dead 3D serializer branches. [advance, S]** Delete L690-744 (the executor-bodied 3D set referencing `vars`/`allLines`), making the correct emitters at L749-760 reachable; append a trailing `else { lines.push('// (unsupported: '+b.type+')'); }` so `blocksToText` is total. Anchor the delete on the `b.type` pattern, not line numbers. Add a unit assertion (`blocksToText([{type:'forward3D',distance:50}]) === 'forward3D(50)'`). **Golden: unchanged (adversarial pass ran the patched file and confirmed byte-identical).**

**A4. Gate the 3 AI buttons behind `ctx.aiHintsEnabled` + harden prompts. [revise, S]** `var aiHintsEnabled = !!(ctx && ctx.aiHintsEnabled)`; change L1982 to `callGemini && aiHintsEnabled && ...`; `if (!aiHintsEnabled) return;` as line 1 of all 3 handlers; append a "may be imperfect, check it yourself" honesty suffix; kid-safe preamble. **Corrections:** `studentProjectSettings.allowAIHints`/`d.aiTutorEnabled` are hallucinated — use `ctx.aiHintsEnabled`; do NOT route through `ctx.getHint` (quiz signature mis-fits open tutoring). Harness injects `callGemini:null` → buttons already absent from digest → **no re-baseline**.

**A5. Correct + expand the command reference into a grouped panel. [advance, S]** Fix the wrong `if(...)`/`repeat(...)` docs to the brace forms the parser accepts; surface all ~29 commands grouped from a single `COMMAND_DOCS` array near `BLOCK_TYPES` (L297), as a default-collapsed disclosure inside the existing `codeMode==='text'` branch. **Golden: text-mode-only → no re-baseline.**

### (B) Bigger bets — M/L

**B1. Surface parse + runtime errors to the student (and SR). [advance, M]** Honest, line-numbered, non-answer-revealing banner for unparseable lines (L832), unknown calls (L1010), out-of-range goto, the `while` 1000-cap — plus a coalesced `announceToSR` summary (its first real use). Collect `_unparsed` *outside* the `parsed.length>0` guard at L1420; render only on explicit Run (silent during debounced sync); keep messages geometry-agnostic in Robot challenge mode. **Golden: conditional text-mode banner → run vitest WITHOUT `-u` to prove unchanged.**

**B2. Make saved creations real + name-your-creation. [revise, M]** Add a `codingPlayground` branch to the host snapshot Load handler (`stem_lab_module.js` L3022-3038 has none today → snapshots save but never reload) + a `d.projectName` threaded through filenames + JSON. **Revisions:** drop the share-link thread (`?codingShare=` L1320 is never decoded — dead encode); gate the name input behind `blocks.length>0` (keep default digest identical); guard `window.prompt` for SSR; add aria-label + announce on rename.

**B3. Worked-example / faded-scaffold challenge types. [revise, L]** A 3-step ladder per concept (worked → one-block-blanked → from-scratch) that *seeds a starting program*, modeled on the real `loadTemplate()` (L1454, deep-clone + text sync + confirm), not a nonexistent Parsons mechanism. Extend CHALLENGES with `kind` + `seedBlocks`; branch the challenge onClick (L2632). **Golden: appended challenges shift button count → intentional re-baseline (`-u`), eyeball added rows only.**

**B4. Conditionals strand for Robot Commander. [revise, L]** Make r5/r7 solvable by letting `ifWall`/`ifGem` be added as children of a loop. The AST + executor already support nesting, but the child renderer (L1708) is leaf-only — needs a genuine recursive renderer + nested-add path (parent address). **Cap nesting at depth 2 in BOTH the UI filter AND a `flattenRobot` guard** (`whileNotGoal` pre-expands 500 iters × `repeatR`, so one extra level can build an O(200k) array before `maxSteps`). Effort is L. Frame any "reactive rule" level as exactly that, not event programming (applab's lane).

### (C) Strategic

**C1. Extract the interpreter to a pure, testable namespace + unit-test it. [advance, L]** Lift `textToBlocks`/`blocksToText`/`evalCondition`/`resolveVal`/`getEndpoints` + a side-effect-free `simulate(blocks, startTurtle)` into a module-scope `CodingInterp`; keep `executeBlocks` as a thin frame-replay driver. **The keystone** — makes the brain testable, kills the copy-paste bug class (A3), fixes the O(n²) frame cliff for free (simulate once, replay), and is the prerequisite for any safe interpreter refactor. Add `tests/coding_interp.test.js` (square geometry, repeat/while/function expansion, `evalCondition` truth table, round-trip incl. `forward3D`, the 1000-cap).

**C2. Canvas text-alternative + per-step/robot SR narration. [revise, M]** Static accessible name via `canvasA11yDesc`/aria-label; do NOT drive per-step narration through `canvasNarrate` (debounce drops/floods) — build a visually-hidden DOM grid summary from `robotGrid`/`robotPos`, route robot phrases through the existing `announceToSR`/`allo-live-coding` region (add the missing wall `else` at L507), and ship an on-demand `srOnly` `<ol>` turtle trace from `drawnLines`. **Golden: robot half confirmed no re-baseline; turtle static markup additive → intentional re-baseline.**

**C3. Make High Contrast re-color the canvas (or remove the toggle). [advance, M]** Feed `highContrastMode` into the host turtle + robot draw (`stem_lab_module.js` L2167-2300) to swap to a verified-AA palette + non-color cues ('W' on walls). If too large this session, the honest fallback is to hide the toggle until wired.

---

## 5. Recommended first slice

**Build A3 (fix the dead 3D serializer) + A1 (real STOP), together, behind the held deploy.**

Both are **verified correctness bugs on existing features**, both **S effort on the canonical root file**, both leave the golden digest **byte-identical (no re-baseline)**, and together they remove the two ways a student can currently break or fail to control the tool. A3 is the cheapest down-payment on C1; A1 is the prerequisite for ever raising loop ceilings safely. Neither touches AI, assessment, or measurement framing.

**Definition of done:**
1. **A3:** delete the executor-bodied 3D branches (L690-744, anchored on the `vars`-referencing copy), confirm L749-760 emitters reachable, append the trailing `else` placeholder. **A1:** module-scope `_runToken`/`_stepTimer`; token guard atop both turtle `step()` (L912) and robot `step()` (L494); `clearTimeout` + token bump in `stop()` (L1605) + a robot stop trigger; `announceToSR('Program stopped')`; a visible Stop button.
2. `node --check stem_lab/stem_tool_coding.js` clean.
3. Unit harness asserting `blocksToText([{type:'forward3D',distance:50}]) === 'forward3D(50)'` + a repeat-nested case; then `npx vitest tests/stem_longtail_tools_golden.test.js tests/stem_widgets_smoke.test.js` **green with no `-u`**.
4. Manual: type `forward3D(50)` → toggle blocks↔text (previously a ReferenceError) renders the line; start a long `while`/robot run → Esc and Stop both halt it; no XP/badge fires on a stopped run.
5. Root file only; `build.js` regenerates the mirrors at the held deploy.

**Notable drops:** real expression engine (L-effort, high regression risk — do after C1's net); Parsons problems (child blocks aren't draggable; gameable checks give no real signal); share-link threading (dead encode); AI level generator / Python export / autocomplete / sonification (lower-leverage than the correctness + a11y + integrity core; wait for A4's gate and C1's test net).
