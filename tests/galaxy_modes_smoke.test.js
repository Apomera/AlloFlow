// Galaxy Explorer mode/state smoke — the render golden
// (stem_sim_tools_golden.test.js) pins only the DEFAULT galaxy-mode render.
// The 2026-07-01 enhancement added three state-dependent panels that never
// appear in that digest: the rotation-curve/dark-matter panel (galaxy mode),
// the live H-R diagram, and the nucleosynthesis "star stuff" table (both
// star mode, varying with lifecycleMass + activeStage). This pins that each
// mode/mass/stage combination renders without throwing and actually contains
// its panel — a ReferenceError/NaN-in-SVG gate, not a visual lock.

import { describe, it, expect, beforeEach } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_galaxy.js';

describe('galaxy explorer mode/state smoke', () => {
  beforeEach(() => {
    resetStemLab();
    // First-render guard forces simMode back to 'galaxy'; pretend we've loaded once
    // so star/metalHunt states render their real bodies.
    window._galaxyHasLoadedOnce = true;
    loadTool(FILE, 'galaxy');
  });

  it('galaxy mode renders the rotation-curve / dark-matter panel', () => {
    const html = renderTool('galaxy', { galaxy: {} });
    expect(html).toContain('How does a galaxy spin?');
    expect(html).toContain('dark matter');
    // all three model buttons present
    expect(html).toContain('Keplerian');
    expect(html).toContain('Flat (observed)');
    expect(html).toContain('Rigid disk');
  });

  it('each rotation mode renders its own explanation', () => {
    for (const [mode, signal] of [
      ['flat', 'Vera Rubin'],
      ['keplerian', 'outer stars should crawl'],
      ['rigid', 'painted DVD'],
    ]) {
      const html = renderTool('galaxy', { galaxy: { rotMode: mode } });
      expect(html, 'rotMode=' + mode).toContain(signal);
    }
  });

  it('star mode renders H-R diagram + nucleosynthesis table across the mass range', () => {
    for (const mass of [0.3, 0.6, 1, 5, 20, 50]) {
      const html = renderTool('galaxy', { galaxy: { simMode: 'star', lifecycleMass: mass } });
      expect(html, 'mass=' + mass).toContain('H-R Diagram');
      expect(html, 'mass=' + mass).toContain('MAIN SEQUENCE');
      expect(html, 'mass=' + mass).toContain('You Are Star Stuff');
      // NaN in an SVG coordinate would surface literally in the markup
      expect(html, 'mass=' + mass).not.toContain('NaN');
    }
  });

  it('H-R diagram handles every lifecycle stage, on-chart or off', () => {
    // union of stage ids across all mass branches of getStagesForMass
    const stages = ['nebula', 'protostar', 'main_sequence', 'red_giant', 'planetary_nebula',
      'white_dwarf', 'black_dwarf', 'blue_dwarf', 'red_supergiant', 'supernova',
      'neutron_star', 'blue_supergiant', 'black_hole'];
    for (const stage of stages) {
      for (const mass of [0.3, 1, 20, 50]) {
        const html = renderTool('galaxy', { galaxy: { simMode: 'star', lifecycleMass: mass, activeStage: stage } });
        expect(html, 'stage=' + stage + ' mass=' + mass).toContain('H-R Diagram');
        expect(html, 'stage=' + stage + ' mass=' + mass).not.toContain('NaN');
      }
    }
  });

  it('black-hole mode renders its cinematic canvas and accessible controls', () => {
    const html = renderTool('galaxy', { galaxy: { simMode: 'blackHole' } });
    expect(html).toContain('data-black-hole-canvas');
    expect(html).toContain('Relativistic controls');
    expect(html).toContain('Tidal forces experiment');
    expect(html).toContain('Drop object into black hole');
    expect(html).toContain('black-hole-mass');
    expect(html).toContain('black-hole-drop-readout');
    expect(html).toContain('black-hole-signal-bar');
    expect(html).toContain('Two views of time and light');
    expect(html).toContain('black-hole-evidence-title');
    expect(html).toContain('Strongly supported');
    expect(html).toContain('Speculative ideas');
    expect(html).toContain('Black-hole life cycle');
    expect(html).toContain('Hawking evaporation');
    expect(html).toContain('What you are seeing');
    expect(html).toContain('black-hole-instructions');
    expect(html).toContain('aria-describedby');
    expect(html).toContain('aria-valuetext');
    expect(html).not.toContain('NaN');
  });
  it('metallicity inquiry mode still renders', () => {
    const html = renderTool('galaxy', { galaxy: { simMode: 'metalHunt' } });
    expect(html).toContain('Stellar metallicity discovery');
  });
});
