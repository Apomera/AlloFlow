import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function renderAnatomy(state = {}) {
  return renderTool('anatomy', { anatomy: state });
}

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_anatomy.js', 'anatomy');
});

describe('Anatomy Lab progression and quiz logic', () => {
  it('requires all 10 systems for the all-systems quest', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain("length >= 10; }, progress: function(d) { return Object.keys(d._systemsExplored || {}).length + '/10 systems'");
    expect(source).not.toContain("length >= 8; }, progress: function(d) { return Object.keys(d._systemsExplored || {}).length + '/8 systems'");
  });

  it('excludes every valid system from System ID distractors', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain("var validSys = sysKeys.filter(function(k)");
    expect(source).toContain("validSys.indexOf(k) === -1");
    expect(source).toContain("+ quizAnswerLabel");
  });
});

describe('Anatomy Lab homeostasis teaching model', () => {
  it('uses named reference ranges and clearly disclaims clinical interpretation', () => {
    const html = renderAnatomy({ _activeTab: 'homeoHunt' });
    expect(html).toContain('All within teaching references');
    expect(html).toContain('Fasting glucose (mg/dL)');
    expect(html).toContain('Teaching model only, not a clinical score or diagnosis');
    expect(html).toContain('role="status"');
  });

  it('reports how many variables are outside range without diagnosing severity', () => {
    const html = renderAnatomy({
      _activeTab: 'homeoHunt',
      homeoHunt: { tempC: 39, pH: 7.4, glucose: 130, log: [] }
    });
    expect(html).toContain('2 variables outside reference');
    expect(html).not.toContain('life-threatening');
  });
});

describe('Anatomy Lab clinical-case integrity', () => {
  it('filters cases to the selected system and tracks reveal state by case id', () => {
    const html = renderAnatomy({ system: 'circulatory', complexity: 3, _showClinical: true });
    expect(html).toContain('Racing Heart After Exercise');
    expect(html).not.toContain('The Runner\'s Knee');

    const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
    expect(source).toContain("var activeCaseId = d._activeCaseId || null;");
    expect(source).toContain("activeCaseId === cs.id");
    expect(source).toContain('Review explanation');
  });
});

describe('Anatomy Lab accessibility', () => {
  it('supports the tab keyboard pattern and exposes its active panel', () => {
    const html = renderAnatomy({ _activeTab: 'explore' });
    expect(html).toContain('aria-label="Anatomy learning modes"');
    expect(html).toContain('aria-orientation="horizontal"');
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('tabindex="0"');
  });
});
