import { beforeAll, describe, it, expect } from 'vitest';
import { writeFileSync } from 'fs';
import { loadTool, resetStemLab, renderTool } from './helpers/stem_widgets_smoke_harness.js';

// Writes docs/i18n/tree-life-lab-grove-keys.json, the key list the pack tooling works from,
// by rendering Grove Journey through a recording translator across a broad matrix of states
// - many grove codes in both event modes so every event and every discovery appears, every
// priority and route, both wordings, predictions that matched and missed, the run ledger,
// the share panel, the 3D close-up empty state, and the ending. Runtime is the only honest
// source: three sentences were assembled at render time and no reading of the source finds
// the strings a lookup table or a conditional actually hands to the translator.
//
// Run with GROVE_KEYS_WRITE=1 to regenerate; otherwise the file is left alone and this test
// only checks that the generator still covers more than the gate asks for.
let E;
beforeAll(() => { resetStemLab(); loadTool('stem_lab/stem_tool_treelab.js', 'treeLab'); E = window.__alloTreeLabEngine; });

const run = (choices, mode = 'deck', seed = 'GROVE-01') => ({ version: 1, mode, seed, choices });
const choice = (priority, route) => ({ priority, route });
const PRIORITIES = ['offspring', 'roots', 'reserve'];
const ROUTES = ['mixed', 'seed'];

function states() {
  const out = [{}, { bandOverride: 'k2' }, { groveView: 'closeup' }, { groveView: 'closeup', bandOverride: 'k2' }];
  for (const mode of ['deck', 'generated']) for (let s = 0; s < 14; s += 1) {
    const seed = (mode === 'deck' ? 'D' : 'G') + s;
    const choices = Array.from({ length: 8 }, (_, i) => choice(PRIORITIES[(i + s) % 3], ROUTES[(i + s) % 2]));
    for (const len of [1, 3, 8]) {
      const partial = run(choices.slice(0, len), mode, seed);
      const preds = [{ year: 1, arrivals: 'some', food: 'surplus' }, { year: 2, arrivals: 'none', food: 'shortfall' }, { year: 3, arrivals: 'many', food: 'surplus' }];
      const ledger = [{ key: seed + '|' + mode, priorities: ['offspring', 'roots'], living: 4, established: 2, year: 8, success: true },
        { key: seed + '|' + mode, priorities: ['reserve'], living: 0, established: 0, year: 5, success: false }];
      for (const band of ['g68', 'k2']) {
        out.push({ groveRun: partial, bandOverride: band, grovePredictions: preds, groveLedger: ledger, grovePatch: s % 9 });
        out.push({ groveRun: partial, bandOverride: band, groveView: 'closeup', grovePatch: (s + 4) % 9 });
      }
      out.push({ groveRun: partial, groveShare: { kind: 'summary', status: 'copied', text: 'x' } });
      out.push({ groveRun: partial, groveShare: { kind: 'code', status: 'failed', text: 'x' } });
      out.push({ groveRun: partial, groveSpeaking: true, grovePending: { priority: 'roots', route: 'seed', arrivals: 'some', food: 'shortfall' } });
    }
  }
  return out;
}

describe('Grove Journey key list generator', () => {
  it('renders a broad matrix of states through a recording translator', () => {
    const asked = new Map();
    const record = (k, fb) => { if (k.startsWith('stem.treelab.grove.')) asked.set(k, fb); return fb; };
    for (const data of states()) renderTool('treeLab', { treeLab: Object.assign({ view: 'grove' }, data) }, { t: record });
    expect(asked.size).toBeGreaterThan(250);
    // Keys are derived from the English, so the same English must always produce the same key.
    for (const [k, fb] of asked) expect(k).toBe('stem.treelab.grove.' + E.groveKey(fb));
    if (process.env.GROVE_KEYS_WRITE === '1') {
      const sorted = Object.fromEntries([...asked].sort((a, b) => a[1].localeCompare(b[1])));
      writeFileSync('docs/i18n/tree-life-lab-grove-keys.json', JSON.stringify(sorted, null, 2) + '\n');
    }
  }, 120000);
});
