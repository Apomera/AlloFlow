import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const visualQa = require('../dev-tools/allobot_visual_qa.cjs');

describe('AlloBot deterministic visual QA harness', () => {
  it('covers actual 64px and 200% rendering', () => {
    expect(visualQa.SIZES.map((size) => [size.id, size.scale, size.width])).toEqual([
      ['64px', 1, 64],
      ['200pct', 2, 128],
    ]);
  });

  it('covers the requested state matrix at both sizes', () => {
    expect(visualQa.STATES.map((state) => state.id)).toEqual([
      'light-idle', 'light-happy', 'light-thinking', 'light-sad',
      'dark-idle', 'contrast-idle', 'light-listening', 'light-talking',
      'light-sleeping', 'light-prop-gaze-left', 'light-prop-gaze-right',
      'light-scholar-specs', 'light-librarian-kit',
    ]);
    const items = visualQa.matrix();
    expect(items).toHaveLength(26);
    expect(new Set(items.map((state) => state.id)).size).toBe(26);
    for (const state of visualQa.STATES) {
      expect(items.filter((item) => item.stateId === state.id).map((item) => item.size.id)).toEqual(['64px', '200pct']);
    }
  });

  it('makes interactive setup and lens simplification explicit', () => {
    const states = Object.fromEntries(visualQa.STATES.map((state) => [state.id, state]));
    expect(states['light-talking'].setup).toBe('talking');
    expect(states['light-sleeping'].setup).toBe('sleeping');
    expect(states['light-prop-gaze-left'].side).toBe('left');
    expect(states['light-prop-gaze-right'].side).toBe('right');
    expect(states['light-scholar-specs'].eyeDetails).toBe('simplified');
    expect(states['light-librarian-kit'].eyeDetails).toBe('simplified');
    expect(visualQa.OUTPUT.replace(/\\/g, '/')).toContain('/test-results/allobot-visual-qa');
  });

  it('pins every vector state to an explicitly reviewed vector baseline', () => {
    const baseline = JSON.parse(readFileSync(visualQa.BASELINE, 'utf8'));
    const ids = visualQa.matrix().map((state) => state.id).sort();
    expect(baseline.formatVersion).toBe(1);
    expect(baseline.scenarioCount).toBe(26);
    expect(Object.keys(baseline.scenarios).sort()).toEqual(ids);
    for (const entry of Object.values(baseline.scenarios)) {
      expect(entry.domSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(entry.measurements).toEqual(expect.objectContaining({
        width: expect.any(Number),
        height: expect.any(Number),
        theme: expect.any(String),
        face: expect.any(String),
      }));
    }
  });

  it('rejects empty, root, and unreviewed external capture paths', () => {
    expect(() => visualQa.resolveOutput('')).toThrow(/non-empty/);
    expect(() => visualQa.resolveOutput(visualQa.ROOT, true)).toThrow(/root/);
    const outside = resolve(visualQa.ROOT, '..', 'allobot-visual-external');
    expect(() => visualQa.resolveOutput(outside)).toThrow(/test-results/);
    expect(visualQa.resolveOutput(outside, true)).toBe(outside);
    expect(() => visualQa.resolveOutput(join(visualQa.ROOT, 'dev-tools', 'allobot-output'), true)).toThrow(/repository/);
    expect(() => visualQa.resolveOutput(resolve(visualQa.ROOT, '..', 'generic-output'), true)).toThrow(/AlloBot-specific/);
    const inside = join(visualQa.ROOT, 'test-results', 'custom-allobot');
    expect(visualQa.resolveOutput(inside)).toBe(inside);
  });
});
