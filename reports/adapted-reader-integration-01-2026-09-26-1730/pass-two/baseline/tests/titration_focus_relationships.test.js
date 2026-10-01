import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = 'stem_lab/stem_tool_titration.js';
const source = fs.readFileSync(sourcePath, 'utf8');

function renderState(state = {}) {
  const host = document.createElement('div');
  host.innerHTML = renderTool('titrationLab', {
    titrationLab: Object.assign({ safetyChecked: true, labTab: 'titrate' }, state),
  });
  return host;
}

beforeEach(() => {
  resetStemLab();
  loadTool(sourcePath, 'titrationLab');
});

describe('Titration Lab dynamic-focus relationships', () => {
  it('scopes focus handoffs to the active rendered lab instance', () => {
    expect(source).toContain("active.closest('[data-titration-instance]')");
    expect(source).toMatch(/ownerRoot\s*&&\s*ownerRoot\.isConnected\s*\?\s*ownerRoot\s*:\s*ownerBoundary/);
    expect(source).toMatch(/"data-titration-instance":\s*"safety"/);
    expect(source).toMatch(/"data-titration-instance":\s*"lab"/);

    for (const id of [
      'titration-drill-scenario',
      'titration-drill-feedback',
      'titration-quiz-question',
      'titration-quiz-feedback',
      'titration-incident-scenario',
      'titration-incident-feedback',
    ]) {
      expect(source, id).toContain(`id: "${id}", tabIndex: -1`);
      expect(source, id + ' focus handoff').toContain(`focusTitrationRegion('${id}')`);
    }
  });

  it('exposes only mounted equipment detail panels through aria-controls', () => {
    const root = renderState({ labTab: 'equipment', selectedEquip: 'burette' });
    const disclosures = [...root.querySelectorAll('button[id^="titration-equipment-button-"]')];
    expect(disclosures.length).toBeGreaterThan(3);
    expect(disclosures.filter((button) => button.getAttribute('aria-expanded') === 'true')).toHaveLength(1);

    for (const button of disclosures) {
      const expanded = button.getAttribute('aria-expanded') === 'true';
      const controls = button.getAttribute('aria-controls');
      expect(controls).toBeTruthy();
      const panel = root.querySelector('#' + controls);
      expect(panel).not.toBeNull();
      if (expanded) {
        expect(panel.getAttribute('role')).toBe('region');
        expect(panel.getAttribute('aria-labelledby')).toBe(button.getAttribute('aria-labelledby'));
        expect(panel.getAttribute('tabindex')).toBe('-1');
      } else {
        expect(panel.hasAttribute('hidden')).toBe(true);
      }
    }
  });
});
