import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function renderEvo(state = {}) {
  return renderTool('evoLab', { evoLab: state });
}

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_evolab.js', 'evoLab');
});

describe('EvoLab Hardy-Weinberg model', () => {
  it('describes expected genotype proportions without claiming the equation breaks', () => {
    const html = renderEvo({ view: 'hardyWeinberg' });
    expect(html).toContain('expected genotype proportions');
    expect(html).toContain('not sampled observed counts');
    expect(html).toContain('One-way A');
    expect(html).not.toContain('equation BREAK');
  });

  it('tracks allele-frequency change separately from configured forces', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_evolab.js', 'utf8');
    expect(source).toContain('var alleleChanged = !!(priorSnapshot');
    expect(source).toContain("value: gen === 0 ? 'Ready' : alleleChanged ? 'p changed' : 'p unchanged'");
    expect(source).toContain('p(1-p)/(2N)');
  });
});

describe('EvoLab model boundaries', () => {
  it('labels the speciation threshold as an arbitrary trait-divergence milestone', () => {
    const html = renderEvo({ view: 'speciation' });
    expect(html).toContain('Trait Divergence Model');
    expect(html).toContain('teaching milestone (30%)');
    expect(html).toContain('does not test mating');
    expect(html).not.toContain('SPECIATION!');
  });

  it('uses current antibiotic-use guidance and discloses omitted mechanisms', () => {
    const html = renderEvo({ view: 'antibioticLab' });
    expect(html).toContain('take them exactly as directed');
    expect(html).toContain('horizontal gene transfer');
    expect(html).toContain('Do not generalize this slider directly to clinical dosing');
    expect(html).not.toContain('finish all the pills');
  });
});

describe('EvoLab runtime and accessibility', () => {
  it('renders the saved pressure-discovery view without undefined state APIs', () => {
    const html = renderEvo({ view: 'pressureHunt' });
    expect(html).toContain('Selection pressure discovery');
    expect(html).toContain('role="status"');
    expect((html.match(/scope="col"/g) || []).length).toBe(0);

    const withLog = renderEvo({
      view: 'pressureHunt',
      pressureHunt: { camouflage: 50, vision: 50, harshness: 30, log: [{ c: 50, v: 50, h: 30, st: 'balanced' }] }
    });
    expect((withLog.match(/scope="col"/g) || []).length).toBe(4);
  });

  it('provides a keyboard-equivalent Predator Vision selection action', () => {
    const html = renderEvo({ view: 'predatorVision' });
    expect(html).toContain('Hunt most-visible prey');
    expect(html).toContain('press Enter or Space');
    expect(html).toContain('without visual-search timing');
    expect(html).toContain('tabindex="0"');
  });

  it('contains no undefined pressure-view state references', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_evolab.js', 'utf8');
    expect(source).toContain('var iq = d.pressureHunt ||');
    expect(source).not.toContain('toolData.evoLab');
    expect(source).not.toContain('setToolData(function(prev)');
  });
});
