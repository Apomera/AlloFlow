import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resetStemLab, loadTool, renderTool } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_brainatlas.js';
const VIEWS = [
  'lateral',
  'medial',
  'superior',
  'inferior',
  'neurotransmitters',
  'neuron',
  'synapses',
  'stimulate',
  'sleepStages',
  'eegWaves',
  'crossLateral',
];

const render = (state, overrides) => renderTool('brainAtlas', { brainAtlas: state || {} }, overrides || {});

describe('brainAtlas refinement contracts', () => {
  beforeEach(() => resetStemLab());

  it('keeps the Brain Atlas shell wired to AlloFlow theme tokens', () => {
    const src = readFileSync(FILE, 'utf8');

    [
      '--allo-stem-canvas',
      '--allo-stem-panel',
      '--allo-stem-deeper',
      '--allo-stem-text',
      '--allo-stem-text-soft',
      '--allo-stem-border',
      '--allo-stem-button-bg',
      '--allo-stem-button-text',
      '--allo-stem-button-border',
    ].forEach((token) => expect(src).toContain(token));

    expect(src).toContain('.theme-dark .brainatlas-tool-shell');
    expect(src).toContain('.theme-contrast .brainatlas-tool-shell');
    expect(src).toContain('.brainatlas-tool-shell .bg-white');
    expect(src).toContain('.brainatlas-detail-panel{border-radius:8px!important;background:var(--ba-surface)!important');
  });

  it('gives every Brain Atlas canvas a visible text equivalent and teacher prompt', () => {
    loadTool(FILE, 'brainAtlas');

    VIEWS.forEach((view) => {
      const html = render({ view });
      expect(html).toContain('role="img"');
      expect(html).toContain('aria-describedby="brainatlas-canvas-summary"');
      expect(html).toContain('id="brainatlas-canvas-summary"');
      expect(html).toContain('data-brainatlas-canvas-summary="true"');
      expect(html).toContain('data-brainatlas-teacher-prompt="true"');
      expect(html).toMatch(/Canvas summary/);
      expect(html).toMatch(/Teacher move/);
    });
  });

  it('keeps simulation views discoverable as one grouped visual-support path', () => {
    loadTool(FILE, 'brainAtlas');
    const html = render({ view: 'stimulate', viewGroup: 'simulations' });

    expect(html).toContain('data-brainatlas-active-group="simulations"');
    expect(html).toContain('data-brainatlas-visible-group="simulations"');
    expect(html).toMatch(/Stimulation Lab/);
    expect(html).toMatch(/Sleep Stages/);
    expect(html).toMatch(/EEG Waves/);
    expect(html).toMatch(/Cross-Lateralization/);
    expect(html).not.toMatch(/Medial Sagittal/);
  });

  it('keeps neurotransmitter details plain by default and advanced on request', () => {
    loadTool(FILE, 'brainAtlas');

    const plain = render({ view: 'neurotransmitters', selectedRegion: 'dopamine' });
    expect(plain).toContain('data-brainatlas-detail-mode="plain"');
    expect(plain).toMatch(/Student takeaway/);
    expect(plain).not.toMatch(/Synthesis Pathway/);
    expect(plain).not.toMatch(/Receptor Subtypes/);
    expect(plain).not.toMatch(/Neural Pathways/);
    expect(plain).not.toMatch(/Pharmacology/);

    const advanced = render({ view: 'neurotransmitters', selectedRegion: 'dopamine', detailMode: 'advanced' });
    expect(advanced).toContain('data-brainatlas-detail-mode="advanced"');
    expect(advanced).toMatch(/Synthesis Pathway/);
    expect(advanced).toMatch(/Receptor Subtypes/);
    expect(advanced).toMatch(/Neural Pathways/);
    expect(advanced).toMatch(/Pharmacology/);
  });

  it('falls back safely when the selected-region label translation is missing', () => {
    loadTool(FILE, 'brainAtlas');

    const html = render({ view: 'lateral' }, { t: () => undefined });

    expect(html).toContain('None selected');
    expect(html).toContain('data-brainatlas-tool="true"');
  });

  it('normalizes older neurotransmitter inquiry state with no log array', () => {
    loadTool(FILE, 'brainAtlas');

    const html = render({
      view: 'neurotransmitters',
      showNtInquiry: true,
      ntInquiry: {
        dopamine: 70,
        log: null,
      },
    });

    expect(html).toContain('data-brainatlas-nt-inquiry="true"');
    expect(html).toMatch(/Dopamine/);
  });
});
