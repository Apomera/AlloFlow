// Math review 2 (2026-10-19): "Generate similar" turned a refusal into a problem.
//
// callGemini does not throw when the model declines a prompt: it returns the
// placeholder "Content unavailable due to safety filters." (gemini_api_source.jsx).
// handleGenerateSimilar trimmed that reply, put it in the math input and asked
// handleGenerateMath to build a problem set from it. It also called callGemini
// directly instead of through _callMathAi, so a request that never settled left
// the app busy (spinner on, button disabled) until reload.
//
// MATH_REVIEW2_HELPERS_MODULE lets the mutation check load a copy with the fix reverted.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const HELPERS = process.env.MATH_REVIEW2_HELPERS_MODULE || 'math_helpers_module.js';

function loadHelpers() {
  const window = { AlloModules: {} };
  vm.runInNewContext(fs.readFileSync(path.resolve(HELPERS), 'utf8'), {
    window, console: { log() {}, warn() {} }, setTimeout, clearTimeout, AbortController, Promise,
  });
  return window.AlloModules.MathHelpers;
}

function similar(callGemini, extra = {}) {
  const H = loadHelpers();
  const busy = [];
  const deps = {
    generatedContent: { type: 'math', data: { problems: [{ question: 'What is 3 + 4?' }] } },
    setIsProcessing: value => busy.push(value),
    setMathInput: vi.fn(),
    addToast: vi.fn(),
    t: key => key,
    callGemini,
    warnLog: vi.fn(),
    handleGenerateMath: vi.fn(async () => {}),
    ...extra,
  };
  return { run: H.handleGenerateSimilar(deps), busy, deps };
}

describe('generate similar does not turn a refusal into a problem', () => {
  it.each([
    'Content unavailable due to safety filters.',
    '  Definition unavailable due to content safety filters.  ',
    '{}',
    "I'm sorry, but I can't help with that request.",
    'I cannot create a variation of this problem.',
  ])('%j creates no problem and reports the failure', async reply => {
    const { run, busy, deps } = similar(vi.fn(async () => reply));
    await run;
    expect(deps.setMathInput).not.toHaveBeenCalled();
    expect(deps.handleGenerateMath).not.toHaveBeenCalled();
    expect(deps.addToast).toHaveBeenCalledWith('math.error_variation', 'error');
    expect(busy.at(-1), 'busy flag left on').toBe(false);
  });

  it('a real variation is still generated', async () => {
    const { run, deps } = similar(vi.fn(async () => '  What is 6 + 2?  '));
    await run;
    expect(deps.setMathInput).toHaveBeenCalledWith('What is 6 + 2?');
    expect(deps.handleGenerateMath).toHaveBeenCalledWith('What is 6 + 2?');
    expect(deps.addToast).not.toHaveBeenCalledWith('math.error_variation', 'error');
  });

  it('a word problem that mentions safety or sorrow is not mistaken for a refusal', async () => {
    const problem = 'Maya is sorry she lost 3 of her 12 safety pins. How many does she have left?';
    const { run, deps } = similar(vi.fn(async () => problem));
    await run;
    expect(deps.handleGenerateMath).toHaveBeenCalledWith(problem);
  });
});

describe('generate similar is bounded by the math request timeout', () => {
  it('a request that never settles times out, is aborted, and clears busy', async () => {
    let signal = null;
    const callGemini = vi.fn((prompt, jsonMode, useSearch, temperature, searchQuery, abortSignal) => {
      signal = abortSignal;
      return new Promise(() => {});
    });
    const { run, busy, deps } = similar(callGemini, { mathRequestTimeoutMs: 50 });
    const outcome = await Promise.race([
      run.then(() => 'settled'),
      new Promise(resolve => setTimeout(() => resolve('still pending after 3 s'), 3000)),
    ]);
    expect(outcome).toBe('settled');
    expect(callGemini.mock.calls[0][1], 'plain-text request').toBe(false);
    expect(signal && signal.aborted, 'request aborted on timeout').toBe(true);
    expect(deps.handleGenerateMath).not.toHaveBeenCalled();
    expect(deps.addToast).toHaveBeenCalledWith('math.error_variation', 'error');
    expect(busy.at(-1)).toBe(false);
  });
});
