import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function state(overrides = {}) {
  return {
    skatelab: {
      mode: 'halfpipe',
      vehicle: 'skate',
      pumps: 3,
      trickId: 'kickflip',
      gravity: 9.81,
      surfaceId: 'standard',
      windId: 'calm',
      speedMph: 18,
      angleDeg: 30,
      gapFt: 15,
      tour: { open: false, step: 0, seen: true },
      ...overrides,
    },
  };
}

beforeAll(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_skatelab.js', 'skatelab');
});

describe('Skate Lab UX refinement', () => {
  it('renders one primary launch action instead of duplicate run buttons', () => {
    const html = renderTool('skatelab', state());

    expect(html.match(/data-skatelab-launch=/g)).toHaveLength(1);
    expect(html.match(/Drop In!/g)).toHaveLength(1);
  });

  it('keeps the Predict-mode recovery action operable so it can focus the input', () => {
    const html = renderTool('skatelab', state({ predictMode: true, predictionInput: '' }));
    const launch = html.match(/<button[^>]*data-skatelab-launch="focus"[^>]*>/)?.[0] || '';

    expect(launch).toContain('aria-disabled="true"');
    expect(launch).toContain('aria-controls="sk-predict-input"');
    expect(launch).not.toContain(' disabled=""');
    expect(html).toContain('id="sk-predict-input"');
  });

  it('uses an arrow-key-ready tab pattern and removes the inert canvas tab stop', () => {
    const html = renderTool('skatelab', state());

    expect(html).toContain('role="tablist"');
    expect(html).toContain('id="sk-mode-tab-halfpipe"');
    expect(html).toContain('role="tab"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('aria-labelledby="sk-mode-tab-halfpipe"');
    expect(html).not.toMatch(/<canvas[^>]*tabindex=/);
  });

  it('surfaces thermal loss in the post-run status without relying on the canvas', () => {
    const html = renderTool('skatelab', state({
      lastResult: {
        mode: 'halfpipe', landed: true, vMph: 12, hFt: 2.1, airTime: 1.2,
        completed: 360, rotation: 360, score: 50,
        energyInputJ: 1200, mechanicalJ: 864, thermalJ: 336,
      },
    }));

    expect(html).toContain('role="status"');
    expect(html).toContain('Heat transferred:');
    expect(html).toContain('336 J');
    expect(html).toContain('28% of launch energy');
  });

  it('includes responsive rails, touch targets, visible focus, and reduced motion CSS', () => {
    const source = readFileSync('stem_lab/stem_tool_skatelab.js', 'utf8');

    expect(source).toContain('.sk-scenario-rail{display:flex');
    expect(source).toContain('overflow-x:auto');
    expect(source).toContain('button[data-sk-focusable=true]{min-height:36px}');
    expect(source).toContain('button:focus-visible');
    expect(source).toContain('@media(prefers-reduced-motion:reduce)');
  });

  it('converts the 1.2 meter landing tolerance before reporting overshoot feet', () => {
    const source = readFileSync('stem_lab/stem_tool_skatelab.js', 'utf8');

    expect(source).toContain("((sim.clearance - 1.2) * M2FT).toFixed(1) + ' ft.'");
    expect(source).not.toContain('(sim.clearance * M2FT - 1.2).toFixed(1)');
  });

  it('locks every run-sensitive configuration choice during an attempt', () => {
    const halfpipe = renderTool('skatelab', state({ running: true }));
    const gap = renderTool('skatelab', state({ mode: 'gap', running: true }));

    expect(halfpipe).toMatch(/id="sk-surface-standard"[^>]*disabled/);
    expect(halfpipe).toMatch(/id="sk-vehicle-skate"[^>]*disabled/);
    expect(halfpipe).toMatch(/id="sk-mode-tab-halfpipe"[^>]*disabled/);
    expect(gap).toMatch(/id="sk-wind-calm"[^>]*disabled/);
  });

  it('uses roving focus for surface, vehicle, and wind radio groups', () => {
    const halfpipe = renderTool('skatelab', state());
    const gap = renderTool('skatelab', state({ mode: 'gap' }));

    expect(halfpipe).toMatch(/id="sk-surface-standard"[^>]*tabindex="0"/);
    expect(halfpipe).toMatch(/id="sk-surface-rough"[^>]*tabindex="-1"/);
    expect(halfpipe).toMatch(/id="sk-vehicle-skate"[^>]*tabindex="0"/);
    expect(gap).toMatch(/id="sk-wind-calm"[^>]*tabindex="0"/);
    expect(gap).toMatch(/id="sk-wind-head_strong"[^>]*tabindex="-1"/);
  });

  it('traps dialog focus and handles Escape consistently', () => {
    const source = readFileSync('stem_lab/stem_tool_skatelab.js', 'utf8');

    expect(source).toContain('function _dialogKeyDown(e, closeDialog)');
    expect(source).toContain("if (e.key !== 'Tab') return;");
    expect(source.match(/_dialogKeyDown\(e,/g)).toHaveLength(7);
  });
});
