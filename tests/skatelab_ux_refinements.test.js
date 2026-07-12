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
    expect(source.match(/_dialogKeyDown\(e,/g)).toHaveLength(8);
  });

  it('exposes required prediction errors programmatically', () => {
    const invalid = renderTool('skatelab', state({ predictMode: true, predictionInput: '-1' }));
    const valid = renderTool('skatelab', state({ predictMode: true, predictionInput: '2.5' }));

    expect(invalid).toContain('required=""');
    expect(invalid).toContain('aria-required="true"');
    expect(invalid).toContain('aria-invalid="true"');
    expect(invalid).toContain('id="sk-predict-error"');
    expect(invalid).toContain('role="alert"');
    expect(valid).not.toContain('id="sk-predict-error"');
  });

  it('provides a programmatic title and description for the inquiry trajectory', () => {
    const html = renderTool('skatelab', state());

    expect(html).toContain('aria-labelledby="sk-inquiry-trajectory-title sk-inquiry-trajectory-desc"');
    expect(html).toContain('<title id="sk-inquiry-trajectory-title">Projectile trajectory</title>');
    expect(html).toContain('<desc id="sk-inquiry-trajectory-desc">');
  });

  it('applies roving tab stops to every rendered custom radio', () => {
    const html = renderTool('skatelab', state());
    const radios = html.match(/role="radio"/g) || [];
    const radioTabStops = html.match(/role="radio"[^>]*tabindex="(?:0|-1)"/g) || [];

    expect(radios.length).toBeGreaterThan(0);
    expect(radioTabStops).toHaveLength(radios.length);
  });

  it('manages initial dialog focus and restores focus to the opener', () => {
    const source = readFileSync('stem_lab/stem_tool_skatelab.js', 'utf8');

    expect(source).toContain('dialogReturnFocusRef.current = document.activeElement');
    expect(source).toContain(`document.querySelector('.skatelab-shell [role="dialog"]')`);
    expect(source).toContain("if (opener && opener.isConnected && typeof opener.focus === 'function') opener.focus()");
    expect(source).not.toContain("outline: 'none'");
  });

  it('uses an accessible custom confirmation dialog instead of native confirm', () => {
    const html = renderTool('skatelab', state({
      confirmAction: {
        type: 'deleteScenario',
        id: 'custom-1',
        title: 'Delete custom scenario?',
        message: 'This cannot be undone.',
        confirmLabel: 'Delete scenario',
      },
    }));
    const source = readFileSync('stem_lab/stem_tool_skatelab.js', 'utf8');

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-labelledby="sk-confirm-title"');
    expect(html).toContain('aria-describedby="sk-confirm-description"');
    expect(html).toContain('autofocus=""');
    expect(source).not.toMatch(/\b(?:window\.)?confirm\s*\(/);
  });

  it('associates explicit labels with the remaining text fields', () => {
    const saveDialog = renderTool('skatelab', state({ saveModalDraft: { label: '' } }));
    const inquiry = renderTool('skatelab', state({
      spinIQ: { understood: true, explanation: '', speed: 6, angle: 45, mass: 70, rotSpeed: 360, log: [] },
    }));

    expect(saveDialog).toContain('for="sk-save-scenario-name"');
    expect(saveDialog).toContain('id="sk-save-scenario-name"');
    expect(inquiry).toContain('for="sk-inquiry-explanation"');
    expect(inquiry).toContain('id="sk-inquiry-explanation"');
  });

  it('uses a modifier shortcut instead of a conflicting single-character shortcut', () => {
    const html = renderTool('skatelab', state());
    const source = readFileSync('stem_lab/stem_tool_skatelab.js', 'utf8');

    expect(html).toContain('aria-keyshortcuts="Alt+M"');
    expect(html).toContain('Mute / unmute (Alt+M)');
    expect(source).toContain('if (!e.altKey || e.ctrlKey || e.metaKey');
    expect(source).not.toContain("if (e.key !== 'm' && e.key !== 'M') return;");
  });

  it('provides static, text-equivalent outcomes when reduced motion is requested', () => {
    const source = readFileSync('stem_lab/stem_tool_skatelab.js', 'utf8');

    expect(source).toContain("window.matchMedia('(prefers-reduced-motion: reduce)').matches");
    expect(source.match(/if \(skPrefersReducedMotion\(\)\)/g)).toHaveLength(2);
    expect(source).toContain('Reduced motion result.');
    expect(source).toContain('cancelReducedHalfpipe');
    expect(source).toContain('cancelReducedGap');
  });
});
