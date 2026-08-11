import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_machinelab.js';

let hooks;
const byId = (id) => hooks.find((h) => h.id === id);

beforeEach(() => {
  resetStemLab();
  hooks = loadTool(FILE, 'machineLab').questHooks;
});

// The host reads quest state with _getToolQuestState(), which resolves
// toolData[toolId] (stem_lab_module.js). This tool stores at
// toolData.machineLab and declares no questDataKey, so the hooks are handed the
// machineLab slice directly. Nothing had ever called these functions.
describe('Machine Lab quest hooks: shape', () => {
  it('registers five hooks, each with the fields the host reads', () => {
    expect(hooks).toHaveLength(5);
    for (const h of hooks) {
      expect(typeof h.id).toBe('string');
      expect(h.id.length).toBeGreaterThan(0);
      expect(typeof h.label).toBe('string');
      expect(h.label.length).toBeGreaterThan(0);
      expect(typeof h.icon).toBe('string');
      expect(typeof h.check).toBe('function');
      expect(typeof h.progress).toBe('function');
    }
  });

  it('gives every hook a unique id', () => {
    expect(new Set(hooks.map((h) => h.id)).size).toBe(hooks.length);
  });

  it('survives being called with nothing at all', () => {
    // The host can call these before the tool has ever been opened, so `{}`,
    // undefined and null all reach check() in practice.
    for (const h of hooks) {
      for (const state of [{}, undefined, null]) {
        expect(() => h.check(state)).not.toThrow();
        expect(() => h.progress(state)).not.toThrow();
        expect(h.check(state)).toBe(false);
        const p = h.progress(state);
        expect(typeof p).toBe('string');
        expect(p).not.toContain('undefined');
        expect(p).not.toContain('NaN');
      }
    }
  });
});

describe('Machine Lab quest hooks: benches proven', () => {
  const three = { provenBenches: { lever: true, pulley: true, ramp: true } };
  const all = { provenBenches: { lever: true, pulley: true, windlass: true, ramp: true, wedge: true, screw: true } };

  it('counts three proven benches', () => {
    const h = byId('prove_3_machines');
    expect(h.check({ provenBenches: { lever: true, pulley: true } })).toBe(false);
    expect(h.check(three)).toBe(true);
    expect(h.progress(three)).toBe('3/6 benches');
  });

  it('counts all six', () => {
    const h = byId('prove_all_6');
    expect(h.check(three)).toBe(false);
    expect(h.check(all)).toBe(true);
    expect(h.progress(all)).toBe('6/6 benches');
  });

  it('reports zero progress on a fresh tool rather than blank', () => {
    expect(byId('prove_3_machines').progress({ provenBenches: {} })).toBe('0/6 benches');
  });
});

describe('Machine Lab quest hooks: prediction streak', () => {
  const h = () => byId('predict_streak_3');

  it('needs three in a row', () => {
    expect(h().check({ benchStreak: 2 })).toBe(false);
    expect(h().check({ benchStreak: 3 })).toBe(true);
    expect(h().check({ benchStreak: 9 })).toBe(true);
  });

  it('reports the streak so far', () => {
    expect(h().progress({ benchStreak: 2 })).toBe('2/3 in a row');
    expect(h().progress({ benchStreak: 0 })).toBe('0/3 in a row');
  });
});

describe('Machine Lab quest hooks: efficient breach', () => {
  const h = () => byId('breach_efficiently');

  it('requires an actual breach, not just a low shot count', () => {
    // A fresh tool has shotsFired 0, which must NOT read as "breached in 0".
    expect(h().check({ shotsFired: 0 })).toBe(false);
    expect(h().check({ shotsFired: 2, breached: false })).toBe(false);
  });

  it('requires five shots or fewer', () => {
    expect(h().check({ breached: true, shotsFired: 5 })).toBe(true);
    expect(h().check({ breached: true, shotsFired: 6 })).toBe(false);
  });

  it('does not credit a breach with an unknown shot count', () => {
    // Defensive: `breached` without `shotsFired` must not pass on a default.
    expect(h().check({ breached: true })).toBe(false);
  });

  it('describes progress either way', () => {
    expect(h().progress({ breached: false })).toBe('Not breached yet');
    expect(h().progress({ breached: true, shotsFired: 4 })).toBe('4 shots');
  });
});

describe('Machine Lab quest hooks: compare the machines', () => {
  const h = () => byId('compare_machines');

  it('needs all three machines fired', () => {
    expect(h().check({ machinesFired: ['trebuchet'] })).toBe(false);
    expect(h().check({ machinesFired: ['trebuchet', 'ballista'] })).toBe(false);
    expect(h().check({ machinesFired: ['trebuchet', 'ballista', 'onager'] })).toBe(true);
  });

  it('reports how many so far', () => {
    expect(h().progress({ machinesFired: ['trebuchet', 'onager'] })).toBe('2/3 machines');
    expect(h().progress({ machinesFired: [] })).toBe('0/3 machines');
  });
});

describe('Machine Lab quest hooks: every hook is reachable through real play', () => {
  it('matches the state keys the tool actually writes', () => {
    // A hook reading a key the tool never sets can never fire, and nothing else
    // would ever notice. Pin the four keys the hooks depend on against the
    // tool's own default state.
    const src = loadTool(FILE, 'machineLab');
    expect(typeof src._math).toBe('object');
    const source = String(src.render);
    for (const key of ['provenBenches', 'benchStreak', 'shotsFired', 'machinesFired']) {
      expect(source.includes(key), key + ' is never written by render()').toBe(true);
    }
  });
});
