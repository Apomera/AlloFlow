// Math hints are requested with callGemini(prompt, true): JSON mode. Replies
// came back JSON-encoded and were shown raw: {"hint": "..."}, text with escape
// sequences, or "{}", which callGemini returns for a refused or keyless request.
// Each still counted as a used hint (-25% max XP).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const HELPERS = process.env.MATH_REVIEW_HELPERS_MODULE || 'math_helpers_module.js';

function loadHelpers() {
  const window = { AlloModules: {} };
  vm.runInNewContext(fs.readFileSync(path.resolve(HELPERS), 'utf8'), {
    window, console: { log() {}, warn() {} }, setTimeout, clearTimeout, AbortController, Promise,
  });
  return window.AlloModules.MathHelpers;
}

let sequence = 0;
async function hintFor(reply) {
  const H = loadHelpers();
  let state = {};
  const deps = {
    mathHintData: {},
    studentResponses: {},
    setMathHintData: update => { state = typeof update === 'function' ? update(state) : update; deps.mathHintData = state; },
    addToast: vi.fn(),
    callGemini: vi.fn(async () => reply),
    warnLog: vi.fn(),
  };
  const resourceId = 'hint-decode-' + (sequence += 1);
  await H.handleGetMathHint(resourceId, 'p', 'Solve for x: 2x + 3 = 7', 'x = 2', [], deps);
  return { entry: state[resourceId].p, deps };
}

describe('math hint replies are decoded before students see them', () => {
  it.each([
    ['{"hint": "Undo the +3 first."}', 'Undo the +3 first.'],
    ['```json\n{"hint": "Undo the +3 first."}\n```', 'Undo the +3 first.'],
    ['"It\\u2019s a balance: what undoes \\"+3\\"?"', 'It’s a balance: what undoes "+3"?'],
    ['Undo the +3 first.', 'Undo the +3 first.'],
  ])('%s is shown as %s', async (reply, shown) => {
    const { entry, deps } = await hintFor(reply);
    expect(entry.hints).toEqual([shown]);
    expect(entry.count).toBe(1);
    expect(deps.addToast).toHaveBeenCalledWith(expect.stringContaining('Hint unlocked'), 'info');
  });

  it.each(['{}', '{"hint": ""}', '[]', '""'])('an empty reply %s shows no hint and charges nothing', async reply => {
    const { entry, deps } = await hintFor(reply);
    expect(entry).toEqual({ hints: [], count: 0, loading: false });
    expect(deps.addToast).toHaveBeenCalledWith('Could not generate hint — try again', 'error');
  });
});
