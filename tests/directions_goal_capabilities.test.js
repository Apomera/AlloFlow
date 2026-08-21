// Directions goal capabilities (2026-07-27): the composer stopped offering a FIXED chip row and
// now derives the offer from the resource being attached. The point of that redesign is that a
// goal which can never tick becomes unrepresentable — 'wordScramble' shipped as a chip for weeks
// pointing at a game that had no onGameComplete prop at all, so the ledger key stayed empty
// forever and the goal was silently undone-able.
//
// The load-bearing test here is "every offered gameType is really emitted by the codebase". It
// scans the game sources rather than restating a list, so the pin cannot drift out of agreement
// with reality the way a hand-maintained chip row did.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p) => readFileSync(resolve(process.cwd(), p), 'utf8');
const anti = read('AlloFlowANTI.txt');
const games = read('games_source.jsx');
const renderers = read('view_renderers_source.jsx');
const glossaryView = read('view_glossary_source.jsx');
const quizView = read('view_quiz_source.jsx');

// ── eval-slice the REAL pure helpers (same anchors the Phase-1 suite uses) ──────
const start = anti.indexOf('function _alloNormalizeDirectionsData(');
const end = anti.indexOf('let globalAudioCtx');
if (start < 0 || end < 0 || end <= start) throw new Error('helper slice anchors missed');
const { normalize, evaluate, optionsFor, responseProgress, OUTLINE_GAMES, CAPABILITIES } = new Function(
  anti.slice(start, end) + `
  return {
    normalize: _alloNormalizeDirectionsData,
    evaluate: _alloEvaluateObjectives,
    optionsFor: _alloGoalOptionsForResource,
    responseProgress: _alloResponseProgress,
    OUTLINE_GAMES: _ALLO_OUTLINE_GAMES,
    CAPABILITIES: _ALLO_GOAL_CAPABILITIES
  };`
)();

// Every gameType string the app actually reports a completion for.
const emittedGameTypes = new Set(
  [...games.matchAll(/onGameComplete\(\s*['"`]([a-zA-Z0-9]+)/g)].map(m => m[1])
    .concat([...games.matchAll(/gameKey=["']([a-zA-Z0-9]+)["']/g)].map(m => m[1]))
    .concat([...renderers.matchAll(/onGameComplete\(\s*['"`]([a-zA-Z0-9]+)/g)].map(m => m[1]))
);

describe('anti-rot: the composer can only offer goals the app can actually prove', () => {
  it('every gameType in the capability registry is really emitted somewhere', () => {
    const offered = new Set();
    Object.values(CAPABILITIES).forEach(cap => (cap.games || []).forEach(g => offered.add(g)));
    Object.values(OUTLINE_GAMES).forEach(g => offered.add(g));
    const dead = [...offered].filter(g => !emittedGameTypes.has(g));
    // This is the exact failure 'wordScramble' represented: an offered goal whose
    // game never reports, so the student can never tick it no matter what they do.
    expect(dead).toEqual([]);
  });
  it('wordScramble specifically now reports (it silently never did)', () => {
    expect(emittedGameTypes.has('wordScramble')).toBe(true);
    expect(games).toContain("onGameComplete('wordScramble'");
    // ...and the mount site actually passes the callback, which is where it broke.
    expect(glossaryView).toMatch(/WordScrambleGame[^>]*onGameComplete=\{handleGameCompletion\}/);
  });
  it('outline structureType keys match the strings the renderer branches on', () => {
    Object.keys(OUTLINE_GAMES).forEach(structureType => {
      expect(renderers, `structureType "${structureType}" is never branched on`)
        .toContain(`type === '${structureType}'`);
    });
  });
});

describe('capability registry: the offer is derived from the resource', () => {
  it('a reading resource offers open + time + self-check (no fake game goal)', () => {
    const kinds = optionsFor({ id: 'r1', type: 'simplified', title: 'The Water Cycle' }).map(o => o.kind);
    expect(kinds).toEqual(['visited', 'time', 'manual']);
  });
  it('a glossary offers its word games', () => {
    const opts = optionsFor({ id: 'g1', type: 'glossary', title: 'Terms' });
    const gameTypes = opts.filter(o => o.kind === 'game').map(o => o.gameType);
    expect(gameTypes).toEqual(['crossword', 'memory', 'matching', 'bingo', 'wordScramble']);
  });
  it('an outline offers the ONE game its structureType actually renders', () => {
    const venn = optionsFor({ id: 'o1', type: 'outline', title: 'Compare', data: { structureType: 'Venn Diagram' } });
    expect(venn.filter(o => o.kind === 'game').map(o => o.gameType)).toEqual(['vennDiagram']);
    const fish = optionsFor({ id: 'o2', type: 'outline', title: 'Causes', data: { structureType: 'Fishbone' } });
    expect(fish.filter(o => o.kind === 'game').map(o => o.gameType)).toEqual(['fishboneSort']);
    // No structureType → the renderer's own default, not "no game".
    const bare = optionsFor({ id: 'o3', type: 'outline', title: 'Notes', data: {} });
    expect(bare.filter(o => o.kind === 'game').map(o => o.gameType)).toEqual(['outlineSort']);
  });
  it('a quiz offers finish-it; sentence-frames offers answer-every-part', () => {
    expect(optionsFor({ id: 'q1', type: 'quiz', title: 'Check' }).map(o => o.kind)).toContain('completed');
    expect(optionsFor({ id: 's1', type: 'sentence-frames', title: 'Frames' }).map(o => o.kind)).toContain('responded');
  });
  it('junk in, empty out — never a crash', () => {
    expect(optionsFor(null)).toEqual([]);
    expect(optionsFor({ type: 'quiz' })).toEqual([]);       // no id
    expect(optionsFor({ id: 'x' })).toEqual([]);            // no type
    expect(optionsFor({ id: 'x', type: 'no-such-type' }).map(o => o.kind)).toEqual(['visited', 'time', 'manual']);
  });
});

describe('time goals are an OBSERVATION, not a floor', () => {
  it('the offered wording describes what happened, never what is required', () => {
    const [, time] = optionsFor({ id: 'r1', type: 'simplified', title: 'The Water Cycle' });
    expect(time.kind).toBe('time');
    expect(time.minutes).toBe(10);
    // "Spent 10 minutes on X" — a fluent reader who finishes early is not told
    // they failed. Guard the requirement phrasing explicitly.
    expect(time.label).toMatch(/^Spent /);
    expect(time.label).not.toMatch(/at least|must|required/i);
  });
  it('accrues cumulatively across sittings and reports progress', () => {
    const obj = [{ id: 't', label: 'Spent 10 minutes', kind: 'time', resourceRef: 'r1', minutes: 10 }];
    expect(evaluate(obj, { resourceMinutes: { r1: 4 } }, {})).toEqual([
      { id: 't', label: 'Spent 10 minutes', kind: 'time', done: false, progressText: '4/10 min', confirmed: true }
    ]);
    expect(evaluate(obj, { resourceMinutes: { r1: 10 } }, {})[0].done).toBe(true);
    // display caps at the target; 14/10 would read as a bug to a kid
    expect(evaluate(obj, { resourceMinutes: { r1: 14 } }, {})[0].progressText).toBe('10/10 min');
  });
  it('time on a DIFFERENT resource never counts, and no data reads as zero', () => {
    const obj = [{ id: 't', label: 'x', kind: 'time', resourceRef: 'r1', minutes: 5 }];
    expect(evaluate(obj, { resourceMinutes: { r2: 99 } }, {})[0].progressText).toBe('0/5 min');
    expect(evaluate(obj, {}, {})[0].done).toBe(false);
  });
  it('a time goal with no resourceRef is dropped (it could never resolve)', () => {
    expect(normalize({ body: 'b', objectives: [{ id: 't', label: 'x', kind: 'time', minutes: 10 }] }).objectives).toEqual([]);
    const bound = { id: 't', label: 'x', kind: 'time', minutes: 10, resourceRef: 'r1' };
    expect(normalize({ body: 'b', objectives: [bound] }).objectives).toEqual([bound]);
  });
});

describe('time-on-task accrual: the ledger that was declared and never written', () => {
  it('credits only ENGAGED minutes on a visible tab — not an abandoned open tab', () => {
    // The heartbeat already gates on !document.hidden; the accrual additionally
    // requires isEngaged, so idle minutes are counted as idle and never as time
    // spent on the resource.
    expect(anti).toContain('if (isEngaged && _openResourceRef.current) {');
    expect(anti).toContain('const isEngaged = (Date.now() - lastInteractionTimeRef.current) < ENGAGEMENT_TIMEOUT_MS;');
  });
  it('the open resource rides a REF, so navigating never restarts the 60s clock', () => {
    expect(anti).toContain('const _openResourceRef = useRef(null);');
    // the heartbeat effect must still mount once
    const beat = anti.slice(anti.indexOf('focusStreakTimerRef.current = setInterval'));
    expect(beat.slice(0, beat.indexOf('}, []);'))).not.toContain('useEffect(');
  });
  it('byResource is id-keyed and initialized, and totalSessionMinutes now accrues', () => {
    expect(anti).toContain('return { totalSessionMinutes: 0, byResourceType: {}, byResource: {} };');
    expect(anti).toContain("totalSessionMinutes: (Number(base.totalSessionMinutes) || 0) + 1");
    expect(anti).toContain('byResource[_open.id] = (Number(byResource[_open.id]) || 0) + 1;');
  });
  it('the progress export field is no longer always zero', () => {
    // phase_k reads totalSessionMinutes; nothing wrote it before, so the report
    // published a fabricated 0 alongside real engagedMinutes/idleMinutes.
    expect(read('phase_k_helpers_source.jsx')).toContain('timeOnTaskMinutes: toNumber(timeOnTask.totalSessionMinutes');
    const writes = [...anti.matchAll(/totalSessionMinutes:/g)];
    expect(writes.length).toBeGreaterThanOrEqual(2); // initializer + at least one real write
  });
  it('resourceMinutes reaches the evaluator through the ONE shared signals object', () => {
    expect(anti).toContain('resourceMinutes: (timeOnTask && typeof timeOnTask.byResource');
  });
});

describe('response contracts are derived from the resource, never from key-counting', () => {
  it('DBQ tab clicks are UI state and must NOT read as answered work', () => {
    const dbq = { id: 'd1', type: 'dbq', data: {} };
    // Browsing writes _dbqTab/_dbqActiveDoc into the same response bag as real work.
    expect(responseProgress(dbq, { _dbqTab: 'documents', _dbqActiveDoc: 'A' })).toEqual({ answered: 0, total: 1 });
    expect(responseProgress(dbq, { _essayText: 'The evidence shows…' })).toEqual({ answered: 1, total: 1 });
  });
  it('sentence-frames list mode counts filled items', () => {
    const sf = { id: 's1', type: 'sentence-frames', data: { mode: 'list', items: [{}, {}, {}] } };
    expect(responseProgress(sf, { 0: 'one', 1: '   ', 2: 'three' })).toEqual({ answered: 2, total: 3 });
  });
  it('sentence-frames paragraph mode counts bracketed blanks', () => {
    const sf = { id: 's2', type: 'sentence-frames', data: { text: 'A [one] and a [two].' } };
    expect(responseProgress(sf, { 'paragraph-0': 'x' })).toEqual({ answered: 1, total: 2 });
  });
  it('math counts filled problems; unknown types have no contract at all', () => {
    expect(responseProgress({ id: 'm1', type: 'math', data: { problems: [{}, {}] } }, { 0: '42' })).toEqual({ answered: 1, total: 2 });
    expect(responseProgress({ id: 'z1', type: 'simplified', data: {} }, {})).toBe(null);
    expect(responseProgress(null, null)).toBe(null);
  });
});

describe('normalizer: resource-backed goals are dropped when they cannot resolve', () => {
  it('accepts the new kinds when bound to a resource', () => {
    const objs = [
      { id: 'v', label: 'Read it', kind: 'visited', resourceRef: 'r1' },
      { id: 'a', label: 'Answer all', kind: 'responded', resourceRef: 'r2' },
      { id: 'c', label: 'Finish quiz', kind: 'completed', resourceRef: 'r3' },
    ];
    expect(normalize({ body: 'b', objectives: objs }).objectives).toEqual(objs);
  });
  it('drops resource-backed goals with NO resourceRef (they could never resolve)', () => {
    const out = normalize({ body: 'b', objectives: [
      { id: 'v', label: 'Read it', kind: 'visited' },
      { id: 'a', label: 'Answer all', kind: 'responded' },
      { id: 'c', label: 'Finish', kind: 'completed' },
    ] });
    expect(out.objectives).toEqual([]);
  });
  it('drops a game goal with no gameType — the wordScramble failure shape', () => {
    expect(normalize({ body: 'b', objectives: [{ id: 'g', label: 'Play', kind: 'game' }] }).objectives).toEqual([]);
  });
  it('legacy unbound game goals still normalize (v1/v2 back-compat)', () => {
    const legacy = { id: 'g', label: 'Complete the Crossword', kind: 'game', gameType: 'crossword' };
    expect(normalize({ body: 'b', objectives: [legacy] }).objectives).toEqual([legacy]);
  });
});

describe('evaluator: the new kinds', () => {
  it('visited reads the shared _visited map from SIGNALS, not per-directions progress', () => {
    const obj = [{ id: 'v', label: 'Read it', kind: 'visited', resourceRef: 'r1' }];
    expect(evaluate(obj, { visited: { r1: true } }, {})[0].done).toBe(true);
    expect(evaluate(obj, { visited: { r2: true } }, {})[0].done).toBe(false);
    expect(evaluate(obj, {}, { _visited: { r1: true } })[0].done).toBe(false); // wrong home on purpose
  });
  it('responded resolves through the resource shape and shows progress', () => {
    const obj = [{ id: 'a', label: 'Answer all', kind: 'responded', resourceRef: 's1' }];
    const resources = [{ id: 's1', type: 'sentence-frames', data: { mode: 'list', items: [{}, {}] } }];
    const half = evaluate(obj, { resources, studentResponses: { s1: { 0: 'x' } } }, {})[0];
    expect(half).toMatchObject({ done: false, progressText: '1/2' });
    expect(evaluate(obj, { resources, studentResponses: { s1: { 0: 'x', 1: 'y' } } }, {})[0].done).toBe(true);
  });
  it('a responded goal against a type with no contract never auto-completes', () => {
    const obj = [{ id: 'a', label: 'Answer', kind: 'responded', resourceRef: 'z1' }];
    const resources = [{ id: 'z1', type: 'simplified', data: {} }];
    expect(evaluate(obj, { resources, studentResponses: { z1: { anything: 'x' } } }, {})[0].done).toBe(false);
  });
  it('completed honours the same freshness rule as games', () => {
    const obj = [{ id: 'c', label: 'Finish quiz', kind: 'completed', resourceRef: 'q1' }];
    const prog = { startedAt: '2026-07-27T18:00:00.000Z' };
    const rec = (completedAt) => ({ resourceCompletions: { q1: { completedAt, answered: 4, total: 5 } } });
    expect(evaluate(obj, rec('2026-07-26T10:00:00.000Z'), prog)[0].done).toBe(false); // last week's work
    const fresh = evaluate(obj, rec('2026-07-27T19:00:00.000Z'), prog)[0];
    expect(fresh).toMatchObject({ done: true, progressText: '4/5' });
  });
  it('confirmed separates device-observed goals from the student\'s own checkbox', () => {
    const out = evaluate([
      { id: 'm', label: 'I finished', kind: 'manual' },
      { id: 'v', label: 'Read it', kind: 'visited', resourceRef: 'r1' },
      { id: 'g', label: 'Play', kind: 'game', gameType: 'crossword' },
    ], { visited: { r1: true } }, {});
    expect(out.map(o => o.confirmed)).toEqual([false, true, true]);
  });
  it('NO GATING: nothing here returns a lock, disable, or block signal', () => {
    const out = evaluate([{ id: 'v', label: 'x', kind: 'visited', resourceRef: 'r1' }], {}, {});
    expect(Object.keys(out[0]).sort()).toEqual(['confirmed', 'done', 'id', 'kind', 'label', 'progressText']);
  });
});

describe('wiring pins', () => {
  it('ONE signals object feeds every evaluator call site (drift = view and report disagree)', () => {
    expect(anti).toContain('const _alloObjectiveSignals = React.useMemo');
    const calls = [...anti.matchAll(/_alloEvaluateObjectives\(([^,]+),\s*([^,]+),/g)].slice(0);
    // The adapter receives the one shared signal object from its render seam;
    // all other calls consume it directly.
    calls.filter(m => !m[0].includes('objectives, signals')).forEach(m => {
      expect(['_alloObjectiveSignals', 'input.signals || {}']).toContain(m[2].trim());
    });
    expect(anti).toContain('signals: _alloObjectiveSignals,');
    expect(calls.length).toBeGreaterThanOrEqual(6);
  });
  it('goal resources are student-safe and never the directions item itself', () => {
    expect(anti).toContain("_alloStudentSafeResources(history).filter(it => it.type !== 'directions')");
  });
  it('the free-text goal is the FIRST path in the composer, before any auto-check', () => {
    const composer = anti.slice(anti.indexOf('{showDirectionsComposer && ('));
    const freeText = composer.indexOf('directions.goal_write_placeholder');
    const attach = composer.indexOf('directions.goal_attach');
    expect(freeText).toBeGreaterThan(-1);
    expect(attach).toBeGreaterThan(freeText);
  });
  it('the fixed game chip row is gone (it is what rotted)', () => {
    expect(anti).not.toContain("[['crossword', 'Crossword'], ['wordScramble', 'Word Scramble']");
  });
  it('the quiz reports completion by resourceId, since its receipt is content-hashed', () => {
    expect(quizView).toContain('props.onResourceComplete(props.generatedContent.id');
    expect(anti).toContain('onResourceComplete: recordResourceCompletion');
    expect(anti).toContain("safeGetItem('allo_resource_completions_v1')");
  });
  it('evidence carries confirmed, and the panel splits recorded from self-checked', () => {
    expect(anti).toContain('confirmed: !!o.confirmed');
    expect(anti).toContain('ev.objectives.filter(o => o.done && o.confirmed).length');
    expect(anti).toContain('ev.objectives.filter(o => o.done && !o.confirmed).length');
  });
});

describe('mirror parity', () => {
  it('desktop/web-app/src mirror carries the identical feature', () => {
    const desktop = read('desktop/web-app/src/AlloFlowANTI.txt');
    for (const shell of [anti, desktop]) {
      expect(shell).toContain('_alloBuildDirectionsResultAdapter');
      expect(shell).toContain('signals: _alloObjectiveSignals,');
      expect(shell).toContain("storageDB.get('allo_directions_progress_v1')");
    }
  });
});
