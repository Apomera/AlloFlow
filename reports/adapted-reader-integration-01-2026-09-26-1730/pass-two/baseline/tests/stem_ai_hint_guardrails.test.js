// Guardrail unit tests for the STEM Lab AI-hint feature (stem_lab_module.js).
//
// Pins the two PURE, safety-critical helpers — the Socratic prompt builder and
// the answer-leak reveal-check — by splice-capturing them out of the live module
// (they sit at module scope, before the component, so no rendering is needed).
// The reveal-check is the STRUCTURAL backstop that suppresses a hint leaking the
// answer; a future edit must not silently weaken it without this test failing.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let G;
beforeAll(() => {
  let src = readFileSync(resolve(process.cwd(), 'stem_lab/stem_lab_module.js'), 'utf8');
  const anchor = 'window.AlloModules = window.AlloModules || {};';
  if (src.indexOf(anchor) === -1) throw new Error('anchor not found — module structure changed');
  src = src.replace(
    anchor,
    'globalThis.__stemHintGuards = { buildPrompt: stemHintBuildPrompt, revealsAnswer: stemHintRevealsAnswer };\n    ' + anchor,
  );
  const doc = {
    getElementById: () => null,
    createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }),
    head: { appendChild() {} },
    body: { classList: { contains: () => false } },
    querySelector: () => null,
  };
  const win = { AlloModules: {} };
  try {
    // eslint-disable-next-line no-new-func
    new Function('window', 'document', src)(win, doc);
  } catch (e) {
    // The component body is never called at load; if anything past the splice
    // throws, the capture is already set. Re-throw only if it isn't.
    if (!globalThis.__stemHintGuards) throw e;
  }
  G = globalThis.__stemHintGuards;
});

describe('STEM AI-hint guardrails', () => {
  it('exposes the two pure helpers', () => {
    expect(typeof G.buildPrompt).toBe('function');
    expect(typeof G.revealsAnswer).toBe('function');
  });

  describe('reveal-check — the answer-leak backstop', () => {
    it('flags a hint that states the literal text answer', () => {
      expect(G.revealsAnswer('The answer is photosynthesis — remember that.', 'photosynthesis')).toBe(true);
    });
    it('flags a hint that states the numeric answer (with or without a unit)', () => {
      expect(G.revealsAnswer('Multiply them and you should get 56.', 56)).toBe(true);
      expect(G.revealsAnswer('It comes out to 56 degrees here.', '56°')).toBe(true);
      expect(G.revealsAnswer('Remember the ratio 3.14 for this.', '3.14')).toBe(true);
    });
    it('does NOT flag a clean conceptual / question-form hint', () => {
      expect(G.revealsAnswer('What operation combines equal groups?', 56)).toBe(false);
      expect(G.revealsAnswer('Think about the process plants use to make food.', 'photosynthesis')).toBe(false);
    });
    it('does not false-positive on a different number', () => {
      expect(G.revealsAnswer('There are about 5 steps to check here.', 56)).toBe(false);
    });
    it('is safe on empty / nullish inputs', () => {
      expect(G.revealsAnswer('', 'x')).toBe(false);
      expect(G.revealsAnswer('a hint', null)).toBe(false);
      expect(G.revealsAnswer('a hint', undefined)).toBe(false);
    });
  });

  describe('Socratic prompt', () => {
    it('includes the question, grounds with the answer (reference only), and forbids revealing it', () => {
      const p = G.buildPrompt('8th Grade', 'angles', 'What is the supplement of 50°?', '40°', '130°');
      expect(p).toMatch(/What is the supplement of 50/);
      expect(p).toMatch(/Do NOT state or restate the answer/);
      expect(p).toMatch(/guiding question|relevant principle|next thing to check/);
      expect(p).toMatch(/130/); // answer present for grounding only
      expect(p).toMatch(/8th Grade/);
    });
  });
});
