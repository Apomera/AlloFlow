// Beehive (beehive) views + modes smoke suite. SSR-renders the tool under
// every simulation mode, every educational canvas view, and every Field Guide
// section, asserting the render does NOT throw and emits the expected shell.
// This is a ReferenceError / bad-shape gate — the canvas diagrams draw in a RAF
// loop that SSR never runs, so we assert on the DOM shell + Field Guide markup.
//
// The Field Guide iteration is the high-value part: it drives the ONE recursive
// renderer over all 31 heterogeneous curriculum tables (string / string[] /
// object[] / nested object), so a shape the renderer can't handle surfaces here.

import { describe, it, expect, beforeEach } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_beehive.js', 'beehive'); });
const render = (state) => renderTool('beehive', { beehive: state });

const MODES = ['beekeeper', 'queen', 'drone'];

// Canonical educational canvas views (BEE_VIEWS registry).
const BEE_VIEWS = ['scene', 'anatomy', 'physics', 'lifecycle', 'honey', 'waggle',
  'thermo', 'castes', 'pheromones', 'threats', 'pollination', 'equipment',
  'native', 'cognition', 'vision', 'propolis', 'stingers', 'buzz'];

// Field Guide section ids (GUIDE_SECTIONS registry).
const GUIDE_SECTIONS = ['species', 'anatomy', 'parts', 'roles', 'superpowers',
  'waggle', 'pollination', 'plants', 'honey', 'threats', 'failure',
  'misconceptions', 'seasonal', 'starting', 'tools', 'costs', 'maine',
  'ecosystem', 'culture', 'history', 'policy', 'careers', 'crossdisc',
  'trivia', 'glossary', 'vocab', 'faq', 'math', 'labs', 'inquiry', 'standards'];

describe('beehive — simulation modes render without throwing', () => {
  MODES.forEach((mode) => {
    it('mode "' + mode + '" renders a non-empty tree', () => {
      let html;
      expect(() => { html = render({ viewMode: mode }); }).not.toThrow();
      expect(html.length).toBeGreaterThan(500);
    });
  });

  it('beekeeper mode shows the perspective tabs and the live canvas', () => {
    const html = render({ viewMode: 'beekeeper' });
    expect(html).toContain('Simulation perspective');
    expect(html).toContain('<canvas');
  });
});

describe('beehive — every educational canvas view renders (beekeeper mode)', () => {
  BEE_VIEWS.forEach((view) => {
    it('beeView "' + view + '" renders without throwing', () => {
      let html;
      expect(() => { html = render({ viewMode: 'beekeeper', beeView: view }); }).not.toThrow();
      expect(html).toContain('<canvas');
    });
  });
});

describe('beehive — Field Guide renders every curriculum section (recursive renderer gate)', () => {
  it('the Field Guide panel opens when showGuide is set', () => {
    const html = render({ showGuide: true });
    expect(html).toContain('Field Guide');
  });

  GUIDE_SECTIONS.forEach((sec) => {
    it('section "' + sec + '" renders without throwing on its data shape', () => {
      let html;
      expect(() => { html = render({ showGuide: true, guideSection: sec }); }).not.toThrow();
      expect(html).toContain('Field Guide');
      // at least one entry card must have rendered (the recursive walker ran)
      expect(html.length).toBeGreaterThan(2000);
    });
  });

  it('the species section surfaces real content (Apis mellifera)', () => {
    const html = render({ showGuide: true, guideSection: 'species' });
    expect(html).toContain('Apis mellifera');
  });

  it('the waggle section surfaces the corrected 1 km/sec figure', () => {
    const html = render({ showGuide: true, guideSection: 'waggle' });
    expect(html).toContain('1 km');
    expect(html).not.toContain('75ms');
  });
});
