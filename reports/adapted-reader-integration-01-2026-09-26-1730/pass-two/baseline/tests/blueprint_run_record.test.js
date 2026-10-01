// Stage 3 — the run record. Per-row execution status, keyed by the Stage 2 uiId.
//
// Before this the executor reported failures as `nulls.push(type)` — bare
// tool-name strings — so two 'image' steps were indistinguishable and the
// teacher was told "2 resources did not generate" without being told WHICH.
// Nothing recorded that a row was in flight, and the two host setters that
// exist for exactly this (setIsExecutingBlueprint / setBlueprintExecutionResult)
// were literal no-ops threaded end-to-end through the deps object.

import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

let PhaseO;
beforeAll(() => {
  // Production loads the shared identity/fan-out policy before the executor.
  // Missing-policy behavior has its own explicit zero-call gate tests.
  loadAlloModule('generation_matrix_module.js');
  loadAlloModule('phase_o_misc_handlers_module.js');
  PhaseO = window.AlloModules?.PhaseOHandlers;
  if (!PhaseO?.executeOneBlueprint) throw new Error('PhaseOHandlers.executeOneBlueprint failed to register');
});

// Two 'image' rows on purpose: the whole point is telling them apart.
const PLAN = {
  resourcePlan: [
    { tool: 'analysis', directive: 'a', uiId: 'row-analysis' },
    { tool: 'image', directive: 'first', uiId: 'row-image-1' },
    { tool: 'image', directive: 'second', uiId: 'row-image-2' },
    { tool: 'quiz', directive: 'q', uiId: 'row-quiz' },
  ],
};

// handleGenerate stub: fails whichever directives are named.
const makeGen = (failDirectives = []) =>
  vi.fn(async (type, _lang, _keep, _text, cfg) =>
    failDirectives.includes(cfg?.customInstructions)
      ? null
      : { id: 'res-' + type + '-' + (cfg?.customInstructions || ''), type, data: {} });

describe('executeOneBlueprint emits a per-row run record', () => {
  it('reports running then landed for every row, carrying its uiId', async () => {
    const steps = [];
    const { nulls } = await PhaseO.executeOneBlueprint(PLAN, {
      handleGenerate: makeGen(),
      historyOverride: [],
      onStep: (s) => steps.push(s),
    });
    expect(nulls).toEqual([]);
    // 4 rows x (running, landed)
    expect(steps).toHaveLength(8);
    const byRow = {};
    for (const s of steps) (byRow[s.uiId] = byRow[s.uiId] || []).push(s.status);
    expect(Object.keys(byRow).sort()).toEqual(['row-analysis', 'row-image-1', 'row-image-2', 'row-quiz']);
    for (const uiId of Object.keys(byRow)) {
      expect(byRow[uiId], uiId).toEqual(['running', 'landed']);
    }
  });

  it('carries the generated resource id back on the landed step', async () => {
    const steps = [];
    await PhaseO.executeOneBlueprint(PLAN, {
      handleGenerate: makeGen(), historyOverride: [], onStep: (s) => steps.push(s),
    });
    const landed = steps.filter((s) => s.status === 'landed');
    expect(landed.every((s) => typeof s.resourceId === 'string' && s.resourceId)).toBe(true);
  });

  // The reported defect: "2 resources did not generate" with no way to know which.
  it('names WHICH row failed when two rows share a tool', async () => {
    const steps = [];
    const { nulls, failedRows } = await PhaseO.executeOneBlueprint(PLAN, {
      handleGenerate: makeGen(['second']), // only the 2nd image fails
      historyOverride: [],
      onStep: (s) => steps.push(s),
    });
    // The old signal is preserved for existing callers…
    expect(nulls).toEqual(['image']);
    // …and the new one is row-accurate.
    expect(failedRows).toHaveLength(1);
    expect(failedRows[0].uiId).toBe('row-image-2');
    expect(failedRows[0].tool).toBe('image');
    const failedSteps = steps.filter((s) => s.status === 'failed');
    expect(failedSteps.map((s) => s.uiId)).toEqual(['row-image-2']);
    // The sibling image row still landed.
    expect(steps.some((s) => s.uiId === 'row-image-1' && s.status === 'landed')).toBe(true);
  });

  it('is optional and additive — omitting onStep changes nothing', async () => {
    const res = await PhaseO.executeOneBlueprint(PLAN, {
      handleGenerate: makeGen(), historyOverride: [],
    });
    expect(res.items).toHaveLength(4);
    expect(res.nulls).toEqual([]);
  });

  it('does not disturb onResource (Throughline consumes it)', async () => {
    const seen = [];
    await PhaseO.executeOneBlueprint(PLAN, {
      handleGenerate: makeGen(), historyOverride: [],
      onResource: (type, item) => seen.push([type, item.id]),
      onStep: () => {},
    });
    expect(seen.map((s) => s[0])).toEqual(['analysis', 'image', 'image', 'quiz']);
  });

  it('a throwing onStep cannot break the run', async () => {
    const res = await PhaseO.executeOneBlueprint(PLAN, {
      handleGenerate: makeGen(), historyOverride: [],
      onStep: () => { throw new Error('consumer blew up'); },
    });
    expect(res.items).toHaveLength(4);
  });
});

// ── Wiring guardrails ──
const read = (f) => readFileSync(resolve(process.cwd(), f), 'utf8');
const HOSTS = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
const PHASE_O = ['phase_o_misc_handlers_source.jsx', 'phase_o_misc_handlers_module.js',
                 'desktop/web-app/public/phase_o_misc_handlers_module.js'];

describe('run-record wiring guardrails', () => {
  it.each(HOSTS)('%s holds the run record in real state, not a no-op stub', (file) => {
    const src = read(file);
    expect(src).toContain('const [blueprintExecutionResult, setBlueprintExecutionResult] = useState(null)');
    expect(src).toContain('const [isExecutingBlueprint, setIsExecutingBlueprint] = useState(false)');
    // The stubs must be gone, or the executor writes into the void.
    expect(src).not.toContain('const setBlueprintExecutionResult = () => {}');
    expect(src).not.toContain('const setIsExecutingBlueprint = () => {}');
  });

  it.each(PHASE_O)('%s keeps the plan alive and guards re-entrancy', (file) => {
    const src = read(file);
    // The plan must survive execution — otherwise there are no rows to show.
    expect(src).not.toContain('setActiveBlueprint(null)');
    // Nulling the plan USED to be the only re-entrancy guard.
    expect(src).toContain('_blueprintRunInFlight');
    // An interrupted run must not strand rows on 'running' forever.
    expect(src).toContain("status: 'interrupted'");
  });

  it('reads uiId without touching the pinned executor destructure', () => {
    const src = read('phase_o_misc_handlers_source.jsx');
    expect(src).toContain('const { type, directive: aiDirective = "" } = finalResources[i];');
    expect(src).toContain('const stepUiId = finalResources[i] && finalResources[i].uiId;');
  });
});

// ── The silent whole-plan failure (found from a live run, 2026-07-29) ──
//
// Aaron ran a topic-only blueprint and ALL NINE resources failed with a
// completely clean console. Cause chain, verified end to end:
//   phase_o  : `initialSourceText || ""` coerced "no source" to an empty STRING
//   dispatcher:1582 branches on `textToProcess === null` to run its fallback
//              chain (latest analysis originalText, else inputText)
//   "" !== null, so the fallback was skipped, and :1593
//              `if (!textToProcess || !textToProcess.trim()) return;` — a BARE
//              return — handed back undefined for every single resource.
// The executor scores undefined as 'failed', so the plan reported nine failures
// and named no cause anywhere. "" was a default where null was a SENTINEL.
describe('no-source-text runs do not fail silently', () => {
  it('passes null (never "") as textOverride so the dispatcher fallback runs', async () => {
    const gen = vi.fn(async () => ({ id: 'x', type: 't', data: {} }));
    await PhaseO.executeOneBlueprint(PLAN, { handleGenerate: gen, historyOverride: [] });
    // 4th arg is textOverride. null keeps the dispatcher's fallback reachable;
    // "" silently disables it and fails the whole plan.
    const firstCallTextOverride = gen.mock.calls[0][3];
    expect(firstCallTextOverride).toBeNull();
    expect(firstCallTextOverride).not.toBe('');
  });

  it('records a reason on every failed row', async () => {
    const { failedRows } = await PhaseO.executeOneBlueprint(PLAN, {
      handleGenerate: makeGen(['second']), historyOverride: [],
    });
    expect(failedRows).toHaveLength(1);
    expect(typeof failedRows[0].reason).toBe('string');
    expect(failedRows[0].reason).toMatch(/returned no resource/);
  });

  it('carries failReason onto the failed step so the card can show it', async () => {
    const steps = [];
    await PhaseO.executeOneBlueprint(PLAN, {
      handleGenerate: makeGen(['second']), historyOverride: [], onStep: (s) => steps.push(s),
    });
    const failed = steps.filter((s) => s.status === 'failed');
    expect(failed).toHaveLength(1);
    expect(failed[0].failReason).toMatch(/returned no resource/);
    // Landed rows must NOT carry one.
    expect(steps.filter((s) => s.status === 'landed').every((s) => s.failReason === undefined)).toBe(true);
  });

  it('distinguishes a THROWN failure from a null return, and still aborts', async () => {
    const boom = vi.fn(async (type) => { if (type === 'image') throw new Error('quota exhausted'); return { id: 'r', type, data: {} }; });
    const steps = [];
    await expect(PhaseO.executeOneBlueprint(PLAN, {
      handleGenerate: boom, historyOverride: [], onStep: (s) => steps.push(s),
    })).rejects.toThrow('quota exhausted');
    // The reason is recorded BEFORE the rethrow, so it survives the abort.
    const failed = steps.filter((s) => s.status === 'failed');
    expect(failed).toHaveLength(1);
    expect(failed[0].failReason).toMatch(/threw: quota exhausted/);
  });

  it('continues after a recoverable resource exception', async () => {
    const calls = [];
    const gen = vi.fn(async (type) => {
      calls.push(type);
      if (type === 'image') throw new Error('malformed JSON from resource parser');
      return { id: 'r-' + type, type, data: {} };
    });
    const out = await PhaseO.executeOneBlueprint(PLAN, { handleGenerate: gen, historyOverride: [] });
    expect(calls).toEqual(['analysis', 'image', 'image', 'quiz']);
    expect(out.items).toHaveLength(2);
    expect(out.failedRows).toHaveLength(2);
    expect(out.failedRows.every(row => row.reason.includes('malformed JSON'))).toBe(true);
  });

  it('passes one immutable settings snapshot to every dispatcher call', async () => {
    const snapshot = Object.freeze({ gradeLevel: '8th Grade', leveledTextLanguage: 'Spanish', useEmojis: true });
    const gen = vi.fn(async (type) => ({ id: 'r-' + type, type, data: {} }));
    await PhaseO.executeOneBlueprint(PLAN, { handleGenerate: gen, historyOverride: [], settingsSnapshot: snapshot });
    expect(gen.mock.calls.every(call => call[6] === snapshot)).toBe(true);
  });
  it('logs a diagnostic naming the row, reason and dispatcher state', async () => {
    const lines = [];
    await PhaseO.executeOneBlueprint(PLAN, {
      handleGenerate: makeGen(['second']), historyOverride: [], warnLog: (m) => lines.push(m),
    });
    const line = lines.find((l) => l.indexOf('[Blueprint]') === 0);
    expect(line, 'a failed step must emit a diagnostic').toBeTruthy();
    expect(line).toContain('row-image-2');
    expect(line).toContain('tool=image');
    expect(line).toContain('dispatcherLoaded=');
  });
  it('records the failed resource in the visible Error Reporter', async () => {
    const prior = window.AlloModules.ErrorReporter;
    const record = vi.fn();
    window.AlloModules.ErrorReporter = { record };
    try {
      await PhaseO.executeOneBlueprint(PLAN, {
        handleGenerate: makeGen(['second']), historyOverride: [], warnLog: () => {},
      });
    } finally {
      window.AlloModules.ErrorReporter = prior;
    }
    expect(record).toHaveBeenCalled();
    const [level, message] = record.mock.calls[0];
    expect(level).toBe('error');
    expect(message).toContain('tool=image');
    expect(message).toContain('uiId=row-image-2');
    expect(message).toContain('returned no resource');
  });

  it('redacts credentials in Error Reporter text and stack while retaining row context', async () => {
    const prior = window.AlloModules.ErrorReporter;
    const record = vi.fn();
    window.AlloModules.ErrorReporter = { record };
    const secret = 'SENTINEL_BLUEPRINT_TOKEN';
    try {
      await PhaseO.executeOneBlueprint(PLAN, {
        handleGenerate: vi.fn(async () => {
          const error = new Error('Bearer ' + secret + ' was rejected');
          error.stack = 'Error: apiKey=' + secret + '\n at blueprint';
          throw error;
        }),
        historyOverride: [], warnLog: () => {},
      }).catch(() => {});
    } finally {
      window.AlloModules.ErrorReporter = prior;
    }
    const [, message, stack] = record.mock.calls[0];
    expect(message).toContain('tool=analysis');
    expect(message).toContain('[REDACTED]');
    expect(stack).toContain('[REDACTED]');
    expect(message + stack).not.toContain(secret);
  });
});

// ── Stop: the abort capability is finally WIRED (2026-07-29) ──
// executeOneBlueprint accepted `signal` since Stage 3 and checked it between
// steps, but no caller ever created a controller — the teacher's only exit from
// a nine-step run was closing the tab. These pin the cooperative-abort contract:
// the in-flight step finishes, nothing after it starts, and landed work counts
// stay honest (unreached rows are in NEITHER items nor nulls, so a
// total-minus-failed count would claim them as finished).
describe('cooperative abort between steps', () => {
  it('stops before the next step when aborted mid-run, keeping finished work', async () => {
    const ctl = new AbortController();
    const calls = [];
    const gen = vi.fn(async (type) => {
      calls.push(type);
      if (calls.length === 2) ctl.abort();          // abort DURING step 2
      return { id: 'res-' + calls.length, type, data: {} };
    });
    const out = await PhaseO.executeOneBlueprint(PLAN, {
      handleGenerate: gen, historyOverride: [], signal: ctl.signal,
    });
    // Step 2 completes (cooperative), steps 3 and 4 never start.
    expect(calls).toEqual(['analysis', 'image']);
    expect(out.items).toHaveLength(2);
    // Unreached rows are NOT failures — they were never attempted.
    expect(out.nulls).toEqual([]);
    expect(out.failedRows).toEqual([]);
  });

  it('a pre-aborted signal runs nothing at all', async () => {
    const ctl = new AbortController();
    ctl.abort();
    const gen = vi.fn(async () => ({ id: 'x', type: 't', data: {} }));
    const out = await PhaseO.executeOneBlueprint(PLAN, {
      handleGenerate: gen, historyOverride: [], signal: ctl.signal,
    });
    expect(gen).not.toHaveBeenCalled();
    expect(out.items).toHaveLength(0);
  });

  it('handleStopBlueprintRun is registered and a no-op between runs', () => {
    expect(typeof PhaseO.handleStopBlueprintRun).toBe('function');
    // No run in flight -> no controller -> returns false, throws nothing.
    expect(PhaseO.handleStopBlueprintRun()).toBe(false);
  });
});

describe('stopped-run accounting guardrails', () => {
  const rd = (f) => readFileSync(resolve(process.cwd(), f), 'utf8');
  it('the host handler counts LANDED items, never total-minus-failed', () => {
    const src = rd('phase_o_misc_handlers_source.jsx');
    expect(src).toContain('const _doneCount = Array.isArray(_landedItems) ? _landedItems.length : 0;');
    // The wrong formula must not creep back in.
    expect(src).not.toMatch(/finalResources\.length\s*-\s*nulls\.length/);
  });
  it('a stopped run is marked done+stopped and demotes unreached rows', () => {
    const src = rd('phase_o_misc_handlers_source.jsx');
    // Pin the INVARIANT, not the spelling. This asserted the exact literal
    // "{ rows: rows, done: true, stopped: true }" and so failed the moment the
    // record grew `status` and `finishedAt` — a strict improvement the test had
    // no business blocking.
    expect(src).toMatch(/rows:\s*rows,\s*done:\s*true,\s*stopped:\s*true/);
    expect(src).toContain('const _wasStopped');
  });
  it('the controller slot is cleared in the same finally as the run mutex', () => {
    const src = rd('phase_o_misc_handlers_source.jsx');
    // NOT sliced from the file's first `} finally {` — that belongs to an
    // earlier handler entirely. Pin the two resets as adjacent lines instead:
    // if the mutex is released but the controller survives, a Stop pressed
    // between runs would abort the NEXT run at birth.
    expect(src).toMatch(/_blueprintRunInFlight = false;\s*\n\s*_blueprintAbortCtl = null;/);
  });
});
