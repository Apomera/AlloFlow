// Molecule — reading an IR spectrum.
//
// WHY THIS FILE EXISTS
// SPECTRO_METHODS describes nine techniques in prose. One of them is genuinely
// practisable: IR identifies functional groups by WHERE a molecule absorbs, and its own
// entry already carries three real bands (~3300 O-H, ~1700 C=O, ~2250 C≡N). The skill is
// peaks -> groups, and prose cannot rehearse it.
//
// The section is tab-gated (molecule opens with expSection = null), so
// dev-tools/check_stem_render.cjs never builds it and the render goldens never see it.
//
// Every band range below is from standard organic-chemistry correlation tables, and the
// carbonyl ORDERING (ester > aldehyde > ketone > acid > amide) is the published result
// that makes a C=O position diagnostic rather than merely present.

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

function spectro(state = {}) {
  return frag(renderTool('molecule', {
    molecule: { expSection: 'spectro', referenceLibraryOpen: true, ...state },
  }));
}

const testid = (el, id) => {
  const node = el.querySelector(`[data-testid="${id}"]`);
  return node ? node.textContent.replace(/\s+/g, ' ') : null;
};

describe('IR band model (pure)', () => {
  let pure;

  beforeAll(() => {
    resetStemLab();
    loadTool(MOLECULE, 'molecule');
    renderTool('molecule', { molecule: { expSection: null } });
    pure = window.__alloMoleculePure;
  });

  it('carries published band ranges', () => {
    const byGroup = Object.fromEntries(pure.IR_BANDS.map((b) => [b.group, b]));
    // O-H alcohol 3200-3600, nitrile 2220-2260, alkane C-H 2850-3000.
    expect(byGroup['O–H (alcohol)'].lo).toBe(3200);
    expect(byGroup['O–H (alcohol)'].hi).toBe(3600);
    expect(byGroup['C≡N (nitrile)'].lo).toBe(2220);
    expect(byGroup['C–H (alkane)'].hi).toBe(3000);
    // Every band must be a real interval.
    for (const band of pure.IR_BANDS) {
      expect(band.hi, `${band.group} inverted range`).toBeGreaterThan(band.lo);
      expect(band.tell, `${band.group} has no explanation`).toBeTruthy();
    }
  });

  it('matches the three bands the reference entry already prints', () => {
    // SPECTRO_METHODS says "-OH (~3300, broad), C=O (~1700), C≡N (~2250)".
    // If the model disagreed with the prose beside it, one would be wrong.
    expect(pure.irCandidates(3300).some((b) => b.group.startsWith('O–H'))).toBe(true);
    expect(pure.irCandidates(1700).some((b) => b.group.startsWith('C=O'))).toBe(true);
    expect(pure.irCandidates(2250).some((b) => b.group.startsWith('C≡N'))).toBe(true);
  });

  it('returns EVERY candidate, because one peak rarely names one group', () => {
    // 1710 sits in both the ketone and the carboxylic-acid window. Returning
    // only one would teach that a single peak settles it.
    const at1710 = pure.irCandidates(1710).map((b) => b.group);
    expect(at1710.length).toBeGreaterThan(1);
    expect(at1710).toContain('C=O (ketone)');
    expect(at1710).toContain('C=O (carboxylic acid)');
  });

  it('uses SHAPE to separate the classic 3300 confusion', () => {
    // Broad at 3300 is an O-H; sharp at 3300 is a terminal alkyne C-H. This is
    // the single most useful discrimination in the region and the error students
    // make most often.
    const broad = pure.readIrSpectrum([{ wavenumber: 3300, shape: 'broad' }]).peaks[0];
    expect(broad.candidates.every((c) => c.group.startsWith('O–H'))).toBe(true);
    expect(broad.narrowedByShape).toBe(true);

    const sharp = pure.readIrSpectrum([{ wavenumber: 3300, shape: 'sharp' }]).peaks[0];
    expect(sharp.candidates.map((c) => c.group)).toContain('C–H (alkyne, terminal)');
    expect(sharp.candidates.some((c) => c.group.startsWith('O–H'))).toBe(false);
  });

  it('orders the carbonyls the way the chemistry does', () => {
    // Where a C=O absorbs says WHICH carbonyl it is:
    // ester > aldehyde > ketone > acid > amide.
    const order = pure.carbonylOrder().map((b) => b.group);
    expect(order[0]).toBe('C=O (ester)');
    expect(order[order.length - 1]).toBe('C=O (amide)');
    // And the amide really is lowest, because the N lone pair weakens the C=O.
    const amide = pure.IR_BANDS.find((b) => b.group === 'C=O (amide)');
    const ester = pure.IR_BANDS.find((b) => b.group === 'C=O (ester)');
    expect(amide.hi).toBeLessThan(ester.lo);
  });

  it('reports a peak that matches nothing rather than dropping it', () => {
    // A real spectrum has regions the correlation table does not cover. Silently
    // discarding them would teach that every peak is diagnostic.
    const reading = pure.readIrSpectrum([{ wavenumber: 900, shape: 'sharp' }]);
    expect(reading.anyUnmatched).toBe(true);
    expect(reading.peaks[0].unmatched).toBe(true);
  });

  it('reads a whole spectrum, one row per peak', () => {
    const reading = pure.readIrSpectrum([
      { wavenumber: 3000, shape: 'very broad' },
      { wavenumber: 1710, shape: 'sharp' },
    ]);
    expect(reading.peaks.length).toBe(2);
    // The acid pair: very broad O-H plus a carbonyl.
    expect(reading.peaks[0].candidates.map((c) => c.group))
      .toContain('O–H (carboxylic acid)');
    expect(reading.peaks[1].candidates.some((c) => c.group.startsWith('C=O'))).toBe(true);
  });

  it('refuses malformed input', () => {
    expect(pure.irCandidates(NaN)).toEqual([]);
    expect(pure.irCandidates('banana')).toEqual([]);
    expect(pure.readIrSpectrum('not an array')).toBeNull();
  });
});

describe('Spectroscopy section — the IR reader renders', () => {
  beforeAll(() => {
    resetStemLab();
    loadTool(MOLECULE, 'molecule');
  });

  it('opens on an unknown with its peaks, and no answer yet', () => {
    const el = spectro();
    expect(testid(el, 'mol-ir-unknown')).toContain('Unknown A');
    expect(el.querySelector('[data-testid="mol-ir-answer"]')).toBeNull();
    expect(el.querySelector('[data-testid="mol-ir-reveal"]')).toBeTruthy();
  });

  it('lists the candidates for every peak before revealing anything', () => {
    const el = spectro();
    const peaks = [...el.querySelectorAll('[data-ir-peak]')]
      .map((n) => n.getAttribute('data-ir-peak'));
    expect(peaks).toEqual(['3350', '2950']);
    expect(testid(el, 'mol-ir-candidates')).toContain('could be:');
  });

  it('says when the SHAPE did the narrowing', () => {
    const el = spectro();
    expect(testid(el, 'mol-ir-candidates')).toContain('The SHAPE ruled the others out');
  });

  it('reveals the answer with its reasoning, not just a name', () => {
    const el = spectro({ irIdx: 2, irRevealed: true });
    const answer = testid(el, 'mol-ir-answer');
    expect(answer).toContain('Acetic acid');
    // The reasoning is the part worth having.
    expect(answer).toContain('PAIR is the giveaway');
    expect(el.querySelector('[data-testid="mol-ir-reveal"]')).toBeNull();
  });

  it('distinguishes the alkyne from the alcohol on shape alone', () => {
    // Unknown D is 3300 SHARP - a terminal alkyne, not an alcohol.
    const el = spectro({ irIdx: 3, irRevealed: true });
    expect(testid(el, 'mol-ir-candidates')).toContain('alkyne');
    expect(testid(el, 'mol-ir-answer')).toContain('alkyne');
    // And the alcohol must NOT be offered for a sharp peak.
    expect(testid(el, 'mol-ir-candidates')).not.toContain('O–H (alcohol)');
  });

  it('draws broad bands differently from sharp ones', () => {
    // The picture has to carry the same information the word "broad" does,
    // or the chart is decorative.
    const broadChart = spectro({ irIdx: 0 }).querySelector('[data-testid="mol-ir-chart"]');
    expect(broadChart.querySelectorAll('ellipse').length).toBeGreaterThan(0);

    const sharpChart = spectro({ irIdx: 4 }).querySelector('[data-testid="mol-ir-chart"]');
    expect(sharpChart.querySelectorAll('ellipse').length).toBe(0);
    expect(sharpChart.querySelectorAll('line').length).toBeGreaterThan(0);
  });

  it('plots wavenumber high-to-low, and says so', () => {
    // IR spectra run 4000 -> 400 left to right. Students read it backwards
    // unless told, so the convention is stated rather than assumed.
    const el = spectro({ irIdx: 0 });
    expect(el.textContent).toContain('HIGH to LOW');
    // A higher wavenumber must sit further LEFT.
    const chart = el.querySelector('[data-testid="mol-ir-chart"]');
    const labels = [...chart.querySelectorAll('text')]
      .filter((t) => ['4000', '3000', '2000', '1000'].includes(t.textContent))
      .map((t) => ({ wn: Number(t.textContent), x: Number(t.getAttribute('x')) }));
    expect(labels.length).toBe(4);
    for (let i = 1; i < labels.length; i += 1) {
      expect(labels[i].x, `${labels[i].wn} should be right of ${labels[i - 1].wn}`)
        .toBeGreaterThan(labels[i - 1].x);
    }
  });

  it('walks the set and stops offering Next at the end', () => {
    expect(spectro({ irIdx: 0 }).querySelector('[data-testid="mol-ir-next"]')).toBeTruthy();
    expect(spectro({ irIdx: 4 }).querySelector('[data-testid="mol-ir-next"]')).toBeNull();
  });

  it('every unknown renders with candidates and a consistent answer', () => {
    for (let irIdx = 0; irIdx < 5; irIdx += 1) {
      const el = spectro({ irIdx, irRevealed: true });
      expect(testid(el, 'mol-ir-unknown'), `unknown ${irIdx}`).toBeTruthy();
      expect(el.querySelectorAll('[data-ir-peak]').length, `unknown ${irIdx}`)
        .toBeGreaterThan(0);
      expect(testid(el, 'mol-ir-answer'), `unknown ${irIdx}`).toBeTruthy();
    }
  });

  it('describes the chart for screen readers', () => {
    const svg = spectro({ irIdx: 0 }).querySelector('[data-testid="mol-ir-chart"]');
    expect(svg.getAttribute('role')).toBe('img');
    const label = svg.getAttribute('aria-label');
    expect(label).toContain('3350 broad');
    expect(label).toContain('reciprocal centimetres');
  });

  it('keeps the nine-technique reference list that was already there', () => {
    const el = spectro();
    expect(el.textContent).toContain('UV-Vis');
    expect(el.textContent).toContain('Mass spectrometry');
    expect(el.textContent).toContain('X-ray crystallography');
  });

  it('falls back to a real unknown when the stored index is junk', () => {
    for (const irIdx of [-1, 99, 'banana', null]) {
      expect(testid(spectro({ irIdx }), 'mol-ir-unknown'), String(irIdx)).toBeTruthy();
    }
  });

  it('never leaks NaN or an empty candidate list', () => {
    for (let irIdx = 0; irIdx < 5; irIdx += 1) {
      const el = spectro({ irIdx, irRevealed: true });
      const text = el.textContent;
      expect(text, `unknown ${irIdx}`).not.toMatch(/(^|[\s>(:,=])NaN([\s<),;%]|$)/);
      // Every peak row must name at least one candidate group.
      for (const row of el.querySelectorAll('[data-ir-peak]')) {
        expect(row.textContent, `peak ${row.getAttribute('data-ir-peak')}`)
          .toMatch(/could be: \S/);
      }
    }
  });
});
