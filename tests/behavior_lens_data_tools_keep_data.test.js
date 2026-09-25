// Behavior Lens data tools that forgot what was entered.
//
// WHY: until 2026-09-23 the ABA graph's manual, multiple-baseline and alternating-
// treatment data and its titles, the scatterplot grid, a completed risk screening, the
// BIP draft, social-validity results "for pre/post comparison", latency trials, the
// cumulative record, effect-size data, the token board, environment and feasibility
// ratings and a DTT session in progress were plain component state: gone on close.
// The session tracker listed only this visit's sessions ("Session History (0)" after
// reopening, though every session was saved). Single-case design opened blank and
// choosing the design again replaced the saved phase starts with defaults. Latency's
// Save did not clear the trials, so a second Save recorded them twice. The ABA graph's
// alternating-treatment hooks ran only for some designs (after an early return).
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import { componentHarness, componentSource, behaviorLensRuntime } from './helpers/behavior_lens_component_harness.js';

const require = createRequire(import.meta.url);
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  try { loadAlloModule('behavior_lens_module.js'); } catch (e) { /* UI half may need a host */ }
  behaviorLensRuntime();
});
const src = readFileSync('behavior_lens_module.js', 'utf8');
const flush = () => new Promise(r => setTimeout(r, 0));
const byLabel = (q, label) => q.all(n => n.props['aria-label'] === label)[0];
const hostIcons = name => Object.fromEntries([...componentSource(name).matchAll(/h\(([A-Z][A-Za-z0-9]*)\s*,/g)].map(m => m[1])
  .filter(id => !src.includes('const ' + id + ' =') && !src.includes('function ' + id + '(')).map(id => [id, 'span']));
function confirmEnv(answer) {
  const asked = [];
  return { asked, env: { askBehaviorLensConfirmation: async (m, o) => { asked.push(o.title); return answer; }, DualLabel: text => text } };
}

describe('what each tool keeps', () => {
  const kept = {
    ABAGraphEngine: ['abaGraphManualData', 'abaGraphDataMode', 'abaGraphMbTiers', 'abaGraphAtConditions', 'abaGraphTitle', 'abaGraphYLabel', 'abaGraphXLabel', 'abaGraphAimTarget', 'abaGraphMbTitle', 'abaGraphAtTitle'],
    ScatterplotAnalysis: ['scatterplotGrid', 'scatterplotBehavior'],
    RiskScreening: ['riskScreeningResponses'],
    BIPGenerator: ['bipDraft', 'bipEditedDraft'],
    SocialValidityMeasures: ['socialValidityResponses', 'socialValidityResults', 'socialValidityCustomItems'],
    LatencyRecorder: ['latencyTrials', 'latencyBehavior', 'latencyGoalSec'],
    CumulativeRecord: ['cumulativeManualData', 'cumulativePhases', 'cumulativeBehavior'],
    EffectSizeCalculator: ['effectSizeBaseline', 'effectSizeIntervention'],
    TokenBoard: ['tokenBoardTokens', 'tokenBoardTarget', 'tokenBoardReward'],
    EnvironmentAudit: ['environmentAuditRatings'],
    FeasibilityCheck: ['feasibilityRatings'],
    DTTDataSheet: ['dttSessionTrials'],
  };
  for (const [name, keys] of Object.entries(kept)) {
    it(name, () => {
      const body = componentSource(name);
      for (const key of keys) expect(body, key).toContain("useDurableToolState('" + key + "'");
    });
  }
  it('none of these keys is used by another tool', () => {
    // (homeLog, selfCheck and a few others are shared on purpose: snapshots read them.)
    const all = [...src.matchAll(/useDurableToolState\('([A-Za-z0-9_]+)'/g)].map(m => m[1]);
    for (const key of Object.values(kept).flat()) expect(all.filter(k => k === key), key).toHaveLength(1);
  });
});

describe('ABA graph', () => {
  const props = { sessionHistory: [], phases: [], designType: null, onExportData: () => {}, setActivePanel: () => {}, t: () => undefined, addToast: () => {} };
  it('manual data comes back, and Clear asks first', async () => {
    const { asked, env } = confirmEnv(false);
    const q = componentHarness('ABAGraphEngine', props, { ...env, ...hostIcons('ABAGraphEngine'), __durable: { abaGraphDataMode: 'manual', abaGraphManualData: [{ session: 1, value: 4 }, { session: 2, value: 6 }] } });
    expect(q.text()).toContain('Manual Entry (2)');
    await byLabel(q, 'Clear manual data').props.onClick(); q.render();
    expect(asked).toEqual(['Clear manual graph data']);
    expect(q.text()).toContain('Manual Entry (2)');
  });
  it('every hook runs before the multiple-baseline early return', () => {
    const body = componentSource('ABAGraphEngine');
    const early = body.indexOf('        if (isMB) {');
    expect(early).toBeGreaterThan(0);
    const lastHook = Math.max(...[...body.matchAll(/\n        const \[[^\]]+\] = use(?:State|DurableToolState|Memo|Ref)\(/g)].map(m => m.index));
    expect(lastHook).toBeLessThan(early);
  });
});

describe('session tracker', () => {
  it('lists the sessions saved with the student, only its own kind', () => {
    const saved = [
      { id: 'a', date: '2026-09-22T14:00:00Z', durationSec: 600, targets: [{ name: 'Call-outs', count: 4, total: 4 }] },
      { id: 'b', date: '2026-09-21T14:00:00Z', behavior: 'Latency Recording', measurementType: 'latency', count: 5 },
    ];
    const q = componentHarness('SessionDataTracker', { abcEntries: [], t: () => undefined, addToast: () => {}, onSaveSession: () => {}, savedSessions: saved }, { DualLabel: text => text });
    byLabel(q, 'Session history (1)').props.onClick(); q.render();
    expect(q.text()).toContain('Session History (1)');
    expect(q.text()).toContain('Call-outs');
  });
  it('the app hands it the saved sessions', () => {
    expect(src).toMatch(/h\(SessionDataTracker, \{\s*abcEntries,\s*savedSessions: sessionHistory,/);
  });
});

describe('latency recorder', () => {
  it('Save records the trials once and clears them; Clear asks', async () => {
    const saved = [];
    const trials = [{ latency: 2.5 }, { latency: null }, { latency: 3.5 }];
    const { asked, env } = confirmEnv(false);
    const q = componentHarness('LatencyRecorder', { t: () => undefined, addToast: () => {}, onSaveSession: s => saved.push(s) }, { ...env, __durable: { latencyTrials: trials } });
    await byLabel(q, 'Clear unsaved trials').props.onClick(); q.render();
    expect(asked).toEqual(['Clear latency trials']);
    const save = () => q.all(n => n.type === 'button' && /Save to Session History/.test(q.text(n)))[0];
    save().props.onClick(); q.render();
    expect(saved).toHaveLength(1);
    expect(saved[0].trials).toBe(3);
    save()?.props.onClick(); q.render();
    expect(saved).toHaveLength(1);                        // was recorded twice
  });
});

describe('single-case design', () => {
  const savedPhases = [{ label: 'A1', condition: 'baseline', startSession: 1 }, { label: 'B1', condition: 'intervention', startSession: 7 }, { label: 'A2', condition: 'baseline', startSession: 12 }, { label: 'B2', condition: 'intervention', startSession: null }];
  function mount(answer) {
    const changes = []; const designs = [];
    const { asked, env } = confirmEnv(answer);
    const q = componentHarness('SingleCaseDesignManager', { sessionHistory: Array.from({ length: 13 }, (_, i) => ({ id: i })), callGemini: null, t: () => undefined, addToast: () => {}, onPhasesChange: p => changes.push(p), onDesignChange: d => designs.push(d), savedDesign: { id: 'ABAB' }, savedPhases }, env);
    return { q, changes, designs, asked };
  }
  it('opens on the saved design with its phase starts', () => {
    const { q } = mount(true);
    expect(byLabel(q, 'Phase 2 start session').props.value).toBe(7);
    expect(byLabel(q, 'Phase 3 start session').props.value).toBe(12);
  });
  it('changing the design asks, and a yes clears it for the other tools too', async () => {
    const no = mount(false);
    await byLabel(no.q, 'Change Design').props.onClick(); no.q.render();
    expect(no.asked).toEqual(['Change design']);
    expect(no.changes).toEqual([]);
    const yes = mount(true);
    await byLabel(yes.q, 'Change Design').props.onClick(); yes.q.render();
    expect(yes.changes).toEqual([[]]);
    expect(yes.designs).toEqual([null]);
  });
  it('the app passes the saved design in', () => {
    expect(src).toContain('savedDesign: activeDesign,\n                    savedPhases: designPhases');
  });
});

describe('competing pathways Clear', () => {
  it('asks before emptying the model', async () => {
    const { asked, env } = confirmEnv(false);
    const q = componentHarness('CompetingPathways', { abcEntries: [], aiAnalysis: null, callGemini: null, t: () => undefined, addToast: () => {} }, { ...env, __durable: { competingPathwaysModel: { targetBehavior: 'Elopement' } } });
    await byLabel(q, 'Clear model').props.onClick(); q.render();
    expect(asked).toEqual(['Clear competing pathways']);
    expect(q.all(n => n.props.value === 'Elopement')).toHaveLength(1);
  });
});
