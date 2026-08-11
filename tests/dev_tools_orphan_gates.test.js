// Runs the dev-tools gates that had NO caller anywhere.
//
// A 2026-08-11 audit of all 102 `dev-tools/check_*|scan_*` scripts found 18
// with zero references in deploy.sh, .github/workflows, package.json, tests, or
// any other dev-tools script. This repo has already shipped bugs exactly that
// way, twice by its own record:
//   * check_deploy_mirror existed with zero callers in deploy.sh, and on
//     2026-08-10 nuclearlab (+6,919 bytes) and titration (+307) were caught
//     drifted by hand, minutes before a deploy; manipulatives had already
//     shipped drifted.
//   * _check_tool_catalog shipped in 2026-07 telling you to "run before
//     deploys" and then had zero callers until 2026-07-27.
// A gate nobody runs is not a gate. Every script below passed when wired, so
// this file starts green and only ever goes red on a real regression.
//
// Excluded on purpose:
//   * network / browser / visual QA (check_cdn_live, check_search_live,
//     check_sel_browser_qa, check_da_e2e_qa) — they need a live endpoint or a
//     browser and are manual tools by design.
//   * check_collision_risk — takes required <path> args, so it is a manual
//     query tool, not a repo-wide invariant.
//   * check_staged_file_sizes — inspects the git index, which is a
//     pre-commit concern and would be meaningless (or flaky) here.
//   * check_sel_tool_interactions — passes (96 checks) but takes ~25s, enough
//     to be worth a deliberate decision rather than a silent add.

import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

// [script, budget ms, why it matters]
const GATES = [
  ['scan_canvas_var_colors.cjs', 60_000,
    "canvas ctx.fillStyle='var(--x)' is SILENTLY IGNORED (so is SVG stroke=/fill=), which paints nothing and throws nothing"],
  ['check_shadowed_idents.cjs', 60_000,
    'a local shadow of the injected t / d / h breaks i18n, tool state or createElement inside that scope only'],
  ['check_stem_ctx.cjs', 90_000,
    "a field missing from the loader's _ctx literal is undefined for every tool that reads it"],
  ['check_conflict_replay_floor.cjs', 30_000,
    'pins the 10 Conflict Replay invariants against a wording or logic refactor'],
  ['check_sel_hub_wcag.cjs', 60_000, 'SEL Hub WCAG errors and warnings'],
  ['check_ai_backend_image_routing.cjs', 30_000, 'image generation must route to the intended backend'],
  ['check_sd_turbo_math.cjs', 30_000, 'SD Turbo step/CFG math'],
  ['check_sre_math_speech.cjs', 60_000, 'math is spoken correctly by screen readers'],
  ['scan_silent_announcer.cjs', 60_000,
    'a tool that defines its own announceToSR which only parks a string in toolData discards EVERY screen-reader announcement (lifeskills lost 67, epidemic before it) — the live region exists so axe passes and nothing else can see it'],
  ['scan_fn_in_tool_state.cjs', 60_000,
    'tool state round-trips through JSON, so a function stored on it is silently dropped: Number Line then graded correct answers WRONG via its fallback (f31baa5c9) and Fractions threw on reload (68015ac8c)'],
  ['scan_window_key_listeners.cjs', 60_000,
    "a window key listener outlives the tool that added it — multtable's Q/S/? kept starting quizzes and AI calls from inside OTHER tools (e1950eb7c). Baselined: fails only on a NEW unguarded listener"],
  ['scan_mouse_only_controls.cjs', 60_000,
    'a non-native element with role="button"/"switch" + onClick and no key handler is announced as a control that Enter/Space cannot operate (Assessment Literacy 006c25805, Probability marble-bag switch). Baselined: canvases use described alternatives instead'],
  ['scan_inline_canvas_refs.cjs', 60_000,
    'an INLINE ref re-runs its setup on every re-render, and these tools push state while animating — molecule re-ran a 120k-attempt Monte Carlo and stacked a new rAF loop each time. Baselined at 1 (beehive); a NEW one fails'],
];

// Timeouts are deliberately generous. These scripts each re-read and re-parse
// all ~141 tool files, and this is a SHARED tree: a concurrent session running
// its own build or suite stretches a 50s pass to 260s. One such run tripped the
// old 120s cap and reported a failure that every gate passed individually
// moments later. A gate that goes red under load is a gate people learn to
// ignore, which is exactly the failure mode this file exists to prevent.
function run(script) {
  try {
    return { code: 0, out: execFileSync('node', [resolve(process.cwd(), 'dev-tools', script)], {
      cwd: process.cwd(), encoding: 'utf8', timeout: 280_000,
    }) };
  } catch (e) {
    return { code: e.status == null ? -1 : e.status, out: String(e.stdout || '') + String(e.stderr || '') };
  }
}

describe('dev-tools gates that nothing else runs', () => {
  it.each(GATES)('%s stays green', (script, budget, why) => {
    const r = run(script);
    // Tail only: these print full reports, and the failing detail is at the end.
    const tail = r.out.split('\n').filter(Boolean).slice(-25).join('\n');
    expect(r.code, why + '\n\n' + tail).toBe(0);
  }, 300_000);
});
