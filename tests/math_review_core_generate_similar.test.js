// "Generate similar" set the app busy, then handed the AI's reply to
// handleGenerateMath. An empty or non-text reply reached handleGenerateMath as
// "", which returns early without clearing the busy flag: the spinner stayed
// on and the button stayed disabled until reload.
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

async function similar(reply) {
  const H = loadHelpers();
  const busy = [];
  const deps = {
    generatedContent: { type: 'math', data: { problems: [{ question: 'What is 3 + 4?' }] } },
    setIsProcessing: value => busy.push(value),
    setMathInput: vi.fn(),
    addToast: vi.fn(),
    t: key => key,
    callGemini: vi.fn(async () => reply),
    warnLog: vi.fn(),
    handleGenerateMath: vi.fn(async () => {}),
  };
  await H.handleGenerateSimilar(deps);
  return { busy, deps };
}

describe('generate similar never leaves the app busy', () => {
  it.each([['   '], [''], [undefined], [{ text: 'What is 5 + 2?' }]])('a %j reply clears the busy flag and reports the failure', async reply => {
    const { busy, deps } = await similar(reply);
    expect(busy.at(-1), 'busy flag left on').toBe(false);
    expect(deps.handleGenerateMath).not.toHaveBeenCalled();
    expect(deps.addToast).toHaveBeenCalledWith('math.error_variation', 'error');
  });

  it('a real variation is generated as before', async () => {
    const { deps } = await similar('  What is 5 + 2?  ');
    expect(deps.setMathInput).toHaveBeenCalledWith('What is 5 + 2?');
    expect(deps.handleGenerateMath).toHaveBeenCalledWith('What is 5 + 2?');
  });
});
