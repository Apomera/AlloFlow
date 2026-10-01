import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Round 22 (2026-09-03): the 8 clinical cases cover 7 of the 10 systems. On Organ Systems,
// Integumentary and Reproductive the "Show Cases" button opened an empty box.

const ANATOMY_PATHS = [
  'stem_lab/stem_tool_anatomy.js',
  'desktop/web-app/public/stem_lab/stem_tool_anatomy.js',
];

const OLDER = { gradeLevel: '9' };
const WITHOUT_CASES = ['organs', 'integumentary', 'reproductive'];
const WITH_CASES = ['skeletal', 'muscular', 'circulatory', 'nervous', 'respiratory', 'endocrine', 'lymphatic'];

function parse(html) {
  const root = document.createElement('div');
  root.innerHTML = html;
  return root;
}

function render(filePath, systemId) {
  loadTool(filePath, 'anatomy');
  return parse(renderTool('anatomy', {
    anatomy: { system: systemId, view: 'anterior', complexity: 3, _activeTab: 'explore', _showClinical: true },
  }, OLDER));
}

beforeEach(() => { resetStemLab(); });

describe('Anatomy clinical cases', () => {
  it.each(ANATOMY_PATHS)('filters cases to the active system in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    // The old filter was `!sysKey || c.system === sysKey`, whose first clause is dead.
    expect(source).not.toContain('CLINICAL_CASES.filter(function(c) { return !sysKey || c.system === sysKey; })');
    expect(source).toContain('var systemClinicalCases = CLINICAL_CASES.filter(');
  });

  it.each(ANATOMY_PATHS)('explains the gap and offers a system that has cases in %s', (filePath) => {
    for (const systemId of WITHOUT_CASES) {
      const root = render(filePath, systemId);
      const box = root.querySelector('#anatomy-clinical-cases');
      expect(box, systemId).not.toBeNull();
      expect(box.getAttribute('data-anatomy-clinical-cases'), systemId).toBe('0');

      const empty = box.querySelector('[data-anatomy-clinical-cases-empty]');
      expect(empty, systemId).not.toBeNull();
      expect(empty.textContent).toMatch(/No clinical cases for the .+ atlas yet\./);

      const jumps = [...box.querySelectorAll('[data-anatomy-clinical-cases-jump]')]
        .map((b) => b.getAttribute('data-anatomy-clinical-cases-jump'));
      expect(jumps.length, systemId).toBeGreaterThan(0);
      // Never offer a system that has no cases, and never offer the one already open.
      for (const target of jumps) {
        expect(WITH_CASES, systemId).toContain(target);
        expect(target).not.toBe(systemId);
      }
    }
  }, 60_000);

  it.each(ANATOMY_PATHS)('shows the cards and no empty state where cases exist in %s', (filePath) => {
    for (const systemId of WITH_CASES) {
      const root = render(filePath, systemId);
      const box = root.querySelector('#anatomy-clinical-cases');
      expect(Number(box.getAttribute('data-anatomy-clinical-cases')), systemId).toBeGreaterThan(0);
      expect(box.querySelector('[data-anatomy-clinical-cases-empty]'), systemId).toBeNull();
    }
  }, 60_000);
});
