import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function renderEcosystem(state = {}) {
  return renderTool('ecosystem', { ecosystem: { tutorialDismissed: true, ...state } });
}

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_ecosystem.js', 'ecosystem');
});

describe('Ecosystem telemetry and keyboard sandbox access', () => {
  it('renders live telemetry with trends for the Explore view', () => {
    const html = renderEcosystem({
      tab: 'explore',
      livePopHistory: [
        { prey: 40, pred: 10, vegHealth: 0.8 },
        { prey: 32, pred: 12, vegHealth: 0.7 },
        { prey: 24, pred: 14, vegHealth: 0.6 }
      ]
    });
    expect(html).toContain('Live population telemetry');
    expect(html).toContain('Prey:predator');
    expect(html).toContain('Predators are rising while prey fall');
    expect(html).toContain('eco-live-telemetry');
  });

  it('renders keyboard-friendly sandbox actions and reset language', () => {
    const html = renderEcosystem({
      tab: 'sandbox',
      livePopHistory: [{ prey: 40, pred: 10, vegHealth: 0.8 }]
    });
    expect(html).toContain('Keyboard-friendly sandbox actions');
    expect(html).toContain('Add rabbit left');
    expect(html).toContain('Add fox right');
    expect(html).toContain('Reset sandbox');
    expect(html).toContain('What the counts suggest');
    expect(html).toContain('eco-sandbox-telemetry');
  });

  it('connects the accessible canvas description to telemetry and reset behavior', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_ecosystem.js', 'utf8');
    expect(source).toContain('var liveTelemetryFor = function(history)');
    expect(source).toContain('var sandboxKeyboardAction = function(action)');
    expect(source).toContain('canvasEl.dataset.sandboxQuickAction = \'reset\'');
    expect(source).toContain('Sandbox reset complete.');
    expect((source.match(/aria-describedby.*eco-live-telemetry/g) || []).length).toBe(1);
    expect((source.match(/aria-describedby.*eco-sandbox-telemetry/g) || []).length).toBe(1);
    expect(source).toContain('Prey relative to K');
  });

  it('keeps the deployed mirror byte-identical', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_ecosystem.js', 'utf8');
    const deployed = fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_ecosystem.js', 'utf8');
    expect(deployed).toBe(source);
  });
});