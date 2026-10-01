// The Patient Simulator in the Stimulation Lab built its four region options
// with the correct one last and then rotated the list by the case number
// modulo four, so the answer's slot ran last, third, second, first, and
// repeated. Same key the Find It challenge had, one panel over. The options
// are persisted per case in patientOpts, so a real shuffle at build time is
// enough; nothing reorders under the learner afterwards.
//
// Unlike the challenge, the answer is in state here (patientCorrect), so the
// pinned property is stated directly: for a given case number the answer does
// not have a fixed slot.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_brainatlas.js';
const src = readFileSync(FILE, 'utf8');

function flatten(node) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(flatten);
  return [node, ...flatten(node.props?.children)];
}

// the AI gate must be on for the simulator to render its start button; the
// model call itself never resolves, which is fine because the options are
// written synchronously before it is made
function startCase(patientIdx) {
  resetStemLab();
  const tool = loadTool(FILE, 'brainAtlas');
  const store = newStore({ brainAtlas: { view: 'stimulate', patientIdx } });
  const ctx = makeCtx({ aiHintsEnabled: true, callGemini: vi.fn(() => new Promise(() => {})), announceToSR: vi.fn() }, store);
  const nodes = flatten(tool.render(ctx));
  const start = nodes.find((el) => el.type === 'button' && /bg-sky-700/.test(String(el.props?.className || '')) && typeof el.props?.onClick === 'function');
  expect(start, 'start-patient button not found').toBeTruthy();
  start.props.onClick();
  const state = store.toolData.brainAtlas;
  return { opts: state.patientOpts || [], answer: state.patientCorrect, store, tool, ctx };
}

describe('brainAtlas Patient Simulator does not telegraph its answer', () => {
  beforeEach(() => { resetStemLab(); vi.useFakeTimers(); });

  it('no longer rotates the options by the case number', () => {
    expect(src).not.toContain('var rot = idx % 4;');
    expect(src).toContain('opts = brainAtlasShuffle(opts);');
  });

  it('offers four distinct regions including the answer', () => {
    const { opts, answer } = startCase(0);
    expect(opts).toHaveLength(4);
    expect(new Set(opts).size).toBe(4);
    expect(answer).toBeTruthy();
    expect(opts).toContain(answer);
  });

  it('gives the answer no fixed slot for a given case', () => {
    // under the old code the answer sat in slot 3 - (idx % 4), every time
    for (const idx of [0, 1, 2, 3]) {
      const slots = new Set();
      for (let n = 0; n < 60; n += 1) {
        const { opts, answer } = startCase(idx);
        slots.add(opts.indexOf(answer));
      }
      expect(slots.size, 'case ' + idx + ': answer only ever in slot(s) ' + [...slots].join(',')).toBeGreaterThan(2);
    }
  }, 60000);

  it('keeps the same four regions per case, only reordered', () => {
    const a = startCase(2).opts.slice().sort();
    const b = startCase(2).opts.slice().sort();
    expect(a).toEqual(b);
  });

  it('does not reorder the options on a later render', () => {
    const { opts, store, tool, ctx } = startCase(1);
    const first = opts.slice();
    for (let n = 0; n < 5; n += 1) tool.render(ctx);
    expect(store.toolData.brainAtlas.patientOpts).toEqual(first);
  });

  it('the desktop mirror is byte-identical', () => {
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_brainatlas.js', 'utf8')).toBe(src);
  });
});
