# Agentic AlloBot — Design Sketch (2026-07-07)

**Goal:** let AlloBot execute multi-step workflows from one utterance —
"make a 5th-grade lesson on volcanoes, simplify it to grade 3, generate a
quiz, then translate it to Spanish" — by chaining registry commands, with
the teacher confirming the plan before anything runs.

**Non-goal:** literal pixel/DOM clicking ("computer use" style). The
semantic command layer is strictly better here: headless, role-gated,
survives redesigns. The only place literal UI pointing helps is
*teaching* ("show me where X is") — and that already exists via
`ctx.whereIs` (spotlight) and `ctx.flyToElement`.

---

## 1. What already exists (verified 2026-07-07)

| Piece | Where | What it gives us |
|---|---|---|
| Command registry | `allo_commands_source.jsx` (`buildAlloCommands`) | ~40 commands: stable `id`, `aliases`, `roles`, `when:` precondition, `destructive` flag, `run:(ctx, params) => msg` |
| NL router | `routeUtterance()` (~line 468) | 3 tiers: param grammars → fuzzy alias scoring → ONE Gemini call returning `{commandId, params, confidence}` |
| Programmatic exec | `runCommandById(ctx, id, params, {confirmed})` (~line 542) | run any command by id; destructive gate built in |
| Preview/confirm | `opts.preview` + `_pendingBotCmdRef` (ANTI ~22986–23025) | bot chat previews a match as a confirm chip; runs only on user confirm |
| Async actions | `handleGenerate` (ANTI ~24387) is `async` | ctx wrappers (`generateQuiz: () => handleGenerate('quiz')`) **already return promises** — the registry just discards them |
| State mirrors | ctx (`contentLoaded`, `pipelineOpen`, `stemLabOpen`, …) | read-only signals a plan can assert against between steps |
| Teaching pointer | `ctx.whereIs`, `ctx.flyToElement` | spotlight/animate to a live control — "show me" mode |

Conclusion: tools, router, executor, guards, observations, and a consent
gate all exist. What's missing is (A) awaiting async commands, (B) a
planner, (C) a sequential plan runner + plan-level consent UI.

---

## 2. Phase A — awaitable commands (tiny, do first)

`_runCmd` / `runCommandById` currently treat `cmd.run()`'s return as a
string. Change: if it returns a **thenable**, await it (with a timeout)
before reporting done. Because `handleGenerate` is already async, the
five `generate_*` commands become chain-safe with **zero registry edits**
— they'll resolve when generation actually finishes.

```js
// shared by _runCmd and runCommandById
async function _resolveRun(cmd, ctx, params, t, timeoutMs = 120000) {
  const out = cmd.run(ctx, params || {});
  if (!out || typeof out.then !== 'function') return out;          // sync command
  const timeout = new Promise((res) => setTimeout(
    () => res(t('router.still_working', 'Still working on that…')), timeoutMs));
  return Promise.race([out, timeout]);
}
```

Sweep needed: a few `run:` handlers return the *narration string*, not
the promise (e.g. `run: (c) => { c.generateQuiz(); return 'Generating…'; }`).
For chain-critical commands, change to
`run: (c) => c.generateQuiz().then(() => t('…', 'Quiz ready.'))` — or add
an optional `runAsync:` field so the sync palette path is untouched.
Single-utterance behavior stays identical (fire-and-forget still fine);
only `runPlan` requires the awaited form.

## 3. Phase B — the planner (`planUtterance`)

One Gemini call, same command menu string `routeUtterance` already
builds, but asking for an **ordered plan** instead of one command:

```js
async function planUtterance(ctx, text) {
  const commands = buildAlloCommands(ctx);          // role/mode-filtered already
  const menu = commands.map((c) => c.id + ': ' + c.label).join('\n');
  const out = await ctx.callGemini(
    'A teacher asked an education app assistant to do a multi-step task.\n' +
    'Break it into an ORDERED list of app commands from this menu ONLY:\n' + menu +
    '\n\nTask: "' + text.replace(/"/g, "'") + '"\n\n' +
    'Return ONLY JSON: {"steps": [{"commandId": string, "params": object, "why": string}], ' +
    '"confidence": number}. Max 6 steps. Use [] if the task does not map to app commands.');
  const j = JSON.parse((String(out).match(/\{[\s\S]*\}/) || [String(out)])[0]);
  if (!j || !Array.isArray(j.steps) || j.confidence < 0.7) return null;
  // Validate ids + roles NOW; defer `when:` guards to run time —
  // preconditions (e.g. hasSourceOrAnalysis) may only become true
  // after an earlier step runs.
  const known = new Set(commands.map((c) => c.id));
  if (!j.steps.length || j.steps.some((s) => !known.has(s.commandId))) return null;
  return j.steps.slice(0, 6);
}
```

Routing order in the bot chat pre-pass: try `routeUtterance` preview
first (cheap, deterministic); if no match **and** the utterance smells
multi-step (contains " then ", " and then ", ≥2 command-ish verbs, or
length > the single-command 200-char cap), call `planUtterance`.

## 4. Phase C — the runner (`runPlan`) + consent chip

```js
async function runPlan(ctx0, steps, { onStep, confirmed } = {}) {
  const results = [];
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const ctx = ctx0.refresh ? ctx0.refresh() : ctx0;   // fresh state mirrors each step
    const commands = buildAlloCommands(ctx);
    const cmd = commands.find((c) => c.id === s.commandId);
    if (!cmd) return { ok: false, failedStep: i, results,
      reason: 'Step ' + (i + 1) + ' (' + s.commandId + ') is not available right now.' };
    if (cmd.when && !cmd.when(ctx)) return { ok: false, failedStep: i, results,
      reason: 'Step ' + (i + 1) + ' needs something that isn’t ready (' + cmd.label + ').' };
    if (cmd.destructive && !confirmed) return { ok: false, failedStep: i, results,
      reason: cmd.label + ' needs its own confirmation.' };
    if (onStep) onStep(i, 'start', cmd.label);
    const r = await runCommandById(ctx, s.commandId, s.params, { confirmed });  // Phase-A awaited
    results.push(r);
    if (!r || !r.handled) return { ok: false, failedStep: i, results, reason: r && r.narration };
    if (onStep) onStep(i, 'done', r.narration);
  }
  return { ok: true, results };
}
```

**Consent UX** — generalize the existing confirm chip
(`_pendingBotCmdRef` → `_pendingBotPlanRef`): the bot posts a numbered
plan card — each step's icon + label + params ("3. Translate → Spanish"),
destructive steps flagged red — with **[Run all] [Step-by-step] [Cancel]**.
Step-by-step re-uses the current single-command chip per step. During the
run, the card live-updates via `onStep` (⏳ → ✅ per row), narrating each
result string. On failure: stop, mark the step ❌, keep completed results,
offer "resume from step N" (re-plan not required — the remaining steps
array is the resume state).

## 5. Guardrails

- **Teacher-only planning** at launch (`roles` already filters the menu;
  student mode could later get a whitelisted a11y-only plan surface —
  font/ruler/read-aloud chains are genuinely useful for students).
- **Max 6 steps**, no loops, no plan-within-plan.
- **Destructive commands never auto-run** in "Run all" — they pause the
  run for an individual confirm (rail already exists in `runCommandById`).
- **Stop button** on the plan card sets an abort flag `runPlan` checks
  between steps (never mid-command).
- **Provenance**: log `{via: 'plan', planText, steps}` the same way
  single commands log `via`, so behavior is auditable.
- Keyless/offline: planner requires `ctx.callGemini`; without it the bot
  simply falls back to today's single-command behavior — no regression.

## 6. Build order & effort

1. **Phase A** (awaitable run) — ~1 session incl. gates; zero UX change.
2. **Phase C runner + plan card** hard-coded behind a dev utterance
   ("test plan") — proves await/consent/failure UX without AI.
3. **Phase B planner** — one prompt + validation, wire into chat pre-pass.
4. Later: student a11y plans; "show me how" mode that *narrates* each
   step and `flyToElement`s to the control it would press instead of
   pressing it (teaching mode — same plan, different executor).
