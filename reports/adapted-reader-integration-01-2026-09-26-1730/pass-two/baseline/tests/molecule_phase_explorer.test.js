// Molecule — what phase, and why there.
//
// WHY THIS FILE EXISTS
// MELT_BOIL lists melting and boiling points as strings ('−259°C'). Two questions hide in
// that table and neither can be asked of a string: what phase is this at a given
// temperature, and WHY is helium's boiling point 369 degrees below water's. The second is
// the one that matters, and the answer is intermolecular forces - which the tool already
// documents separately in IMF_TYPES. The explorer puts the force next to the number.
//
// The section is tab-gated (molecule opens with expSection = null), so
// dev-tools/check_stem_render.cjs never builds it and the render goldens never see it.
//
// Every mp/bp below is a published CRC value, cross-checked against the figures the
// reference table already prints.

import { beforeAll, describe, expect, it } from 'vitest';
import {
  loadTool,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const MOLECULE = 'stem_lab/stem_tool_molecule.js';

function frag(html) {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el;
}

function meltboil(state = {}) {
  return frag(renderTool('molecule', {
    molecule: { expSection: 'meltboil', referenceLibraryOpen: true, ...state },
  }));
}

const testid = (el, id) => {
  const node = el.querySelector(`[data-testid="${id}"]`);
  return node ? node.textContent.replace(/\s+/g, ' ') : null;
};

describe('Phase model (pure)', () => {
  let pure;

  beforeAll(() => {
    resetStemLab();
    loadTool(MOLECULE, 'molecule');
    renderTool('molecule', { molecule: { expSection: null } });
    pure = window.__alloMoleculePure;
  });

  it('carries published melting and boiling points', () => {
    const subs = pure.PHASE_SUBSTANCES;
    expect(subs.water.mp).toBe(0);
    expect(subs.water.bp).toBe(100);
    expect(subs.helium.bp).toBe(-269);
    expect(subs.mercury.mp).toBe(-39);
    expect(subs.tungsten.mp).toBe(3422);
    expect(subs.tungsten.bp).toBe(5555);
    // Nothing can boil below its melting point.
    for (const [key, sub] of Object.entries(subs)) {
      expect(sub.bp, `${key} bp must exceed mp`).toBeGreaterThan(sub.mp);
    }
  });

  it('reads the number line in both directions', () => {
    expect(pure.phaseAt('water', -10).phase).toBe('solid');
    expect(pure.phaseAt('water', 50).phase).toBe('liquid');
    expect(pure.phaseAt('water', 150).phase).toBe('gas');
    // Helium is liquid in a 3-degree window and gas above it.
    expect(pure.phaseAt('helium', -270).phase).toBe('liquid');
    expect(pure.phaseAt('helium', -200).phase).toBe('gas');
    // Tungsten is still solid at a temperature that vaporises most things.
    expect(pure.phaseAt('tungsten', 3000).phase).toBe('solid');
  });

  it('refuses to pick a side exactly ON a transition', () => {
    // At the melting point the substance is melting; claiming "solid" or
    // "liquid" would be a coin toss dressed up as an answer.
    expect(pure.phaseAt('water', 0).phase).toBe('melting');
    expect(pure.phaseAt('water', 100).phase).toBe('boiling');
    expect(pure.phaseAt('water', 0).label).toContain('melting point');
  });

  it('computes the liquid range', () => {
    // Mercury's 396-degree window is why it filled thermometers.
    expect(pure.liquidRange('mercury')).toBe(396);
    expect(pure.liquidRange('water')).toBe(100);
    // Helium's is 3 degrees wide.
    expect(pure.liquidRange('helium')).toBe(3);
  });

  it('boiling point rises with electron count among London-only substances', () => {
    // Controlling for the FORCE isolates the size effect: more electrons means
    // a more distortable cloud and stronger dispersion.
    const london = ['helium', 'hydrogen', 'nitrogen', 'methane']
      .map((k) => pure.PHASE_SUBSTANCES[k]);
    for (const sub of london) {
      expect(sub.imf, `${sub.label} should be london`).toBe('london');
    }
    expect(pure.PHASE_SUBSTANCES.helium.bp).toBeLessThan(pure.PHASE_SUBSTANCES.hydrogen.bp);
    expect(pure.PHASE_SUBSTANCES.hydrogen.bp).toBeLessThan(pure.PHASE_SUBSTANCES.nitrogen.bp);
    expect(pure.PHASE_SUBSTANCES.nitrogen.bp).toBeLessThan(pure.PHASE_SUBSTANCES.methane.bp);
  });

  it('proves "heavier always boils higher" WRONG on water vs ethanol', () => {
    // The whole reason the panel exists. Water is lighter and boils higher.
    const cmp = pure.compareBoiling('water', 'ethanol');
    expect(cmp.higher.label).toBe('Water');
    expect(cmp.gap).toBe(22);
    expect(cmp.sameImf).toBe(true);          // both hydrogen bond
    expect(cmp.massExplains).toBe(false);    // ...but mass does NOT explain it
    expect(pure.PHASE_SUBSTANCES.water.mass)
      .toBeLessThan(pure.PHASE_SUBSTANCES.ethanol.mass);
  });

  it('separates the force from the substance', () => {
    // Same force, wildly different numbers - so the force alone is not the
    // whole story either.
    expect(pure.PHASE_SUBSTANCES.mercury.imf).toBe('metallic');
    expect(pure.PHASE_SUBSTANCES.tungsten.imf).toBe('metallic');
    const gap = pure.PHASE_SUBSTANCES.tungsten.bp - pure.PHASE_SUBSTANCES.mercury.bp;
    expect(gap).toBeGreaterThan(5000);
  });

  it('labels every force it uses', () => {
    for (const [key, sub] of Object.entries(pure.PHASE_SUBSTANCES)) {
      expect(pure.IMF_LABELS[sub.imf], `${key} has an unlabelled force`).toBeTruthy();
      expect(pure.IMF_STRENGTH_ORDER, `${key} force not in the order`).toContain(sub.imf);
      expect(sub.why, `${key} has no explanation`).toBeTruthy();
    }
  });

  it('refuses unknown substances and non-numeric temperatures', () => {
    expect(pure.phaseAt('unobtainium', 20)).toBeNull();
    expect(pure.phaseAt('water', NaN)).toBeNull();
    expect(Number.isNaN(pure.liquidRange('unobtainium'))).toBe(true);
    expect(pure.compareBoiling('water', 'water')).toBeNull();
  });
});

describe('Melt/boil section — the phase explorer renders', () => {
  beforeAll(() => {
    resetStemLab();
    loadTool(MOLECULE, 'molecule');
  });

  it('offers a named substance picker and a temperature field', () => {
    const el = meltboil();
    const picker = el.querySelector('#phase-sub');
    const temp = el.querySelector('#phase-temp');
    expect(picker).toBeTruthy();
    expect(picker.getAttribute('aria-label')).toBeTruthy();
    expect(temp.getAttribute('type')).toBe('number');
    expect(temp.getAttribute('aria-label')).toBeTruthy();
    expect(picker.querySelectorAll('option').length).toBeGreaterThanOrEqual(10);
  });

  it('names the phase and shows both transition points', () => {
    const el = meltboil({ phaseSub: 'water', phaseTemp: 50 });
    const verdict = testid(el, 'mol-phase-verdict');
    expect(verdict).toContain('Water is liquid');
    expect(verdict).toContain('mp 0');
    expect(verdict).toContain('bp 100');
  });

  it('follows the temperature across both boundaries', () => {
    expect(testid(meltboil({ phaseSub: 'water', phaseTemp: -10 }), 'mol-phase-verdict'))
      .toContain('is solid');
    expect(testid(meltboil({ phaseSub: 'water', phaseTemp: 150 }), 'mol-phase-verdict'))
      .toContain('is gas');
    expect(testid(meltboil({ phaseSub: 'water', phaseTemp: 0 }), 'mol-phase-verdict'))
      .toContain('melting point');
  });

  it('shows the FORCE alongside the number, not just the number', () => {
    const el = meltboil({ phaseSub: 'helium' });
    const imf = testid(el, 'mol-phase-imf');
    expect(imf).toContain('London dispersion');
    expect(imf).toContain('electron cloud');
    // And the liquid window, which is 3 degrees for helium.
    expect(imf).toContain('3');
  });

  it('changes the force when the substance changes', () => {
    expect(testid(meltboil({ phaseSub: 'water' }), 'mol-phase-imf')).toContain('Hydrogen bonding');
    expect(testid(meltboil({ phaseSub: 'iron' }), 'mol-phase-imf')).toContain('Metallic');
    expect(testid(meltboil({ phaseSub: 'diamond' }), 'mol-phase-imf')).toContain('Covalent network');
  });

  it('makes the water/ethanol point where it belongs', () => {
    for (const phaseSub of ['water', 'ethanol']) {
      const note = testid(meltboil({ phaseSub }), 'mol-phase-compare');
      expect(note, phaseSub).toContain('Heavier does NOT always boil higher');
      expect(note).toContain('46 g/mol');
      expect(note).toContain('18 g/mol');
    }
    // And nowhere else - the comparison is about that specific pair.
    expect(meltboil({ phaseSub: 'iron' }).querySelector('[data-testid="mol-phase-compare"]')).toBeNull();
  });

  it('explains mercury only on mercury', () => {
    expect(testid(meltboil({ phaseSub: 'mercury' }), 'mol-phase-mercury')).toContain('thermometers');
    expect(meltboil({ phaseSub: 'water' }).querySelector('[data-testid="mol-phase-mercury"]')).toBeNull();
  });

  it('moves the marker along the number line with temperature', () => {
    const markerX = (phaseTemp) => {
      const line = meltboil({ phaseSub: 'water', phaseTemp })
        .querySelector('[data-testid="mol-phase-line"] line');
      return Number(line.getAttribute('x1'));
    };
    expect(markerX(200)).toBeGreaterThan(markerX(50));
    expect(markerX(50)).toBeGreaterThan(markerX(-200));
  });

  it('keeps the mp and bp labels apart on a narrow liquid window', () => {
    // Water's 0-100 window is 9.6px wide on a -273..6000 scale and helium's is
    // 7.9px, so the two labels landed on top of each other. The TICKS must stay
    // truthful; only the label text is nudged.
    const labelXs = (phaseSub) => {
      const texts = [...meltboil({ phaseSub })
        .querySelectorAll('[data-testid="mol-phase-line"] text')]
        .filter((t) => t.textContent === 'mp' || t.textContent === 'bp')
        .map((t) => Number(t.getAttribute('x')));
      return texts.sort((x, y) => x - y);
    };
    for (const phaseSub of ['water', 'helium', 'mercury', 'tungsten']) {
      const [mp, bp] = labelXs(phaseSub);
      expect(bp - mp, `${phaseSub} labels overlap`).toBeGreaterThanOrEqual(13);
    }

    // The coloured bands still mark the REAL transition points, so widening the
    // labels cannot have moved the data.
    const bands = [...meltboil({ phaseSub: 'water' })
      .querySelectorAll('[data-testid="mol-phase-line"] rect')];
    expect(bands.length).toBe(3);
    const liquidBand = Number(bands[1].getAttribute('width'));
    expect(liquidBand).toBeGreaterThan(0);
    expect(liquidBand).toBeLessThan(13); // narrower than the label gap
  });

  it('describes the number line for screen readers', () => {
    const svg = meltboil({ phaseSub: 'mercury', phaseTemp: 20 })
      .querySelector('[data-testid="mol-phase-line"]');
    expect(svg.getAttribute('role')).toBe('img');
    const label = svg.getAttribute('aria-label');
    expect(label).toContain('Mercury');
    expect(label).toContain('liquid');
    expect(label).toContain('Metallic');
  });

  it('keeps the reference table that was already there', () => {
    const el = meltboil();
    expect(el.textContent).toContain('Tungsten');
    expect(el.textContent).toContain('Liquid N₂');
  });

  it('clamps absurd temperatures instead of breaking', () => {
    for (const phaseTemp of [-99999, 99999, 'banana', null]) {
      const verdict = testid(meltboil({ phaseSub: 'water', phaseTemp }), 'mol-phase-verdict');
      expect(verdict, String(phaseTemp)).toBeTruthy();
      expect(verdict).toContain('Water is');
    }
  });

  it('never leaks NaN for any substance at any extreme', () => {
    const keys = Object.keys(window.__alloMoleculePure.PHASE_SUBSTANCES);
    for (const phaseSub of keys) {
      for (const phaseTemp of [-273, 25, 6000]) {
        const text = meltboil({ phaseSub, phaseTemp }).textContent;
        expect(text, `${phaseSub}@${phaseTemp}`).not.toMatch(/(^|[\s>(:,=])NaN([\s<),;%]|$)/);
      }
    }
  });
});
