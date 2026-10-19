// Petri dish microscope illumination (brightfield / darkfield / phase contrast).
//
// Each mode repaints the field the organisms swim on, so each needs its own proof that
// an organism's outline (its identity mark, also used to tell species apart when colour
// vision cannot) still clears 3:1 against every band of that field. The brightfield
// guarantee lives in cell_petri_plantcell_visibility.test.js; this file adds the two new
// grounds, the saved-state guard, and the switch itself.
//
// The contrast is COMPUTED from the colours the renderer actually uses (the exported
// colour mapping applied to the ORGANISMS table), so retuning a palette is fine and
// leaving an outline invisible is not.
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const SRC = resolve(process.cwd(), 'stem_lab/stem_tool_cell.js');
let PETRI;
let harness;

function luminance([r, g, b]) {
  const c = [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrast(a, b) {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
function over(rgba, bg) {
  const a = rgba[3] === undefined ? 1 : rgba[3];
  return [0, 1, 2].map((i) => rgba[i] * a + bg[i] * (1 - a));
}
function organismColours(src) {
  const out = [];
  const re = /id: '([a-z_]+)', label: '([^']*)', icon: '[^']*', color: '(#[0-9a-fA-F]{6})', bodyColor: '([^']*)'/g;
  let m;
  while ((m = re.exec(src))) out.push({ id: m[1], label: m[2], color: m[3], bodyColor: m[4] });
  return out;
}

beforeAll(async () => {
  harness = await import(pathToFileURL(resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js')).href);
  harness.resetStemLab();
  harness.loadTool('stem_lab/stem_tool_cell.js', 'cell');
  PETRI = window.__alloCellPetri;
  if (!PETRI) throw new Error('petri helpers not exposed (window.__alloCellPetri)');
});

describe('petri illumination: saved state is normalised', () => {
  it('accepts only the three known modes and falls back to brightfield', () => {
    expect(PETRI.cellPetriIlluminationMode('darkfield')).toBe('darkfield');
    expect(PETRI.cellPetriIlluminationMode('phase')).toBe('phase');
    expect(PETRI.cellPetriIlluminationMode('brightfield')).toBe('brightfield');
    [undefined, null, '', 'DARKFIELD', 'dark', 42, true, {}, [], 'phase contrast', NaN].forEach((bad) => {
      expect(PETRI.cellPetriIlluminationMode(bad), String(bad)).toBe('brightfield');
    });
    expect(PETRI.cellPetriIlluminationInfo({ toString: () => 'phase' }).id).toBe('brightfield');
  });

  it('describes every mode with a short caption and an explanation of how it works', () => {
    const ids = PETRI.CELL_PETRI_ILLUMINATIONS.map((m) => m.id);
    expect(ids).toEqual(['brightfield', 'darkfield', 'phase']);
    PETRI.CELL_PETRI_ILLUMINATIONS.forEach((m) => {
      ['label', 'short', 'caption', 'detail'].forEach((k) => {
        expect(typeof m[k], m.id + '.' + k).toBe('string');
        expect(m[k].trim().length, m.id + '.' + k).toBeGreaterThan(2);
        expect(m[k], m.id + '.' + k).not.toMatch(/undefined|NaN/);
      });
      // The caption sits inside the in-dish control: keep it to two short lines.
      expect(m.caption.length, m.id + ' caption is too long for the control').toBeLessThanOrEqual(72);
    });
    expect(PETRI.cellPetriIlluminationInfo('darkfield').detail).toMatch(/scattered/i);
    expect(PETRI.cellPetriIlluminationInfo('phase').detail).toMatch(/halo/i);
    expect(PETRI.cellPetriIlluminationInfo('brightfield').detail).toMatch(/teaching labels/i);
  });
});

describe('petri illumination: every organism outline reads on every ground', () => {
  const src = readFileSync(SRC, 'utf8');
  const orgs = organismColours(src);

  it('finds the organism table and the three grounds', () => {
    expect(orgs.length, 'no organisms parsed - this test would measure nothing').toBeGreaterThanOrEqual(10);
    ['brightfield', 'darkfield', 'phase'].forEach((mode) => {
      expect(PETRI.CELL_PETRI_GROUNDS[mode], mode).toHaveLength(3);
    });
  });

  it('keeps brightfield outlines in the authored, contrast-tested colours (now fully opaque)', () => {
    orgs.forEach((o) => {
      const rgb = [1, 3, 5].map((i) => parseInt(o.color.slice(i, i + 2), 16));
      expect(PETRI.cellPetriOutlineColour('brightfield', o.color)).toBe('rgba(' + rgb.join(',') + ',1)');
      expect(PETRI.cellPetriMapColour('brightfield', 'body', o.bodyColor)).toBe(o.bodyColor);
    });
  });

  for (const mode of ['brightfield', 'darkfield', 'phase']) {
    it(`gives every outline 3:1 or better on every ${mode} band`, () => {
      const weak = [];
      orgs.forEach((o) => {
        const line = PETRI.cellPetriParseColour(PETRI.cellPetriOutlineColour(mode, o.color));
        expect(line, o.id).not.toBeNull();
        PETRI.CELL_PETRI_GROUNDS[mode].forEach((bg, band) => {
          const r = contrast(over(line, bg), bg);
          if (r < 3) weak.push(`${o.label} ${mode} band ${band}: ${r.toFixed(2)}:1`);
        });
      });
      expect(weak, 'outlines that vanish into the field:\n  ' + weak.join('\n  ')).toEqual([]);
    });
  }

  it('makes the three modes genuinely different fields', () => {
    const centre = (mode) => luminance(PETRI.CELL_PETRI_GROUNDS[mode][0]);
    expect(centre('brightfield')).toBeGreaterThan(0.75);
    expect(centre('darkfield')).toBeLessThan(0.02);
    expect(centre('phase')).toBeGreaterThan(0.2);
    expect(centre('phase')).toBeLessThan(0.5);
  });

  it('lets edges glow in darkfield and sit dark on the grey phase field', () => {
    orgs.forEach((o) => {
      const dark = PETRI.cellPetriParseColour(PETRI.cellPetriOutlineColour('darkfield', o.color));
      const phase = PETRI.cellPetriParseColour(PETRI.cellPetriOutlineColour('phase', o.color));
      expect(luminance(dark), o.id).toBeGreaterThan(luminance(PETRI.CELL_PETRI_GROUNDS.darkfield[0]) * 10);
      expect(luminance(phase), o.id).toBeLessThan(luminance(PETRI.CELL_PETRI_GROUNDS.phase[2]));
    });
  });

  it('keeps real pigments coloured while teaching colours fade', () => {
    const chloro = PETRI.cellPetriParseColour(PETRI.cellPetriMapColour('phase', 'pig', 'rgba(21,128,61,0.92)'));
    expect(chloro[1]).toBeGreaterThan(chloro[0] + 20);
    expect(chloro[1]).toBeGreaterThan(chloro[2] + 20);
    const eyespot = PETRI.cellPetriParseColour(PETRI.cellPetriMapColour('darkfield', 'pig', '#dc2626'));
    expect(eyespot[0]).toBeGreaterThan(eyespot[1] + 60);
    const body = PETRI.cellPetriParseColour(PETRI.cellPetriMapColour('phase', 'body', 'rgba(6,182,212,0.35)'));
    expect(Math.max(...body.slice(0, 3)) - Math.min(...body.slice(0, 3))).toBeLessThanOrEqual(6);
    // Darkfield bodies stay dim so that edges, not interiors, carry the image.
    orgs.forEach((o) => {
      expect(PETRI.cellPetriParseColour(PETRI.cellPetriMapColour('darkfield', 'body', o.bodyColor))[3], o.id).toBeLessThanOrEqual(0.22);
    });
  });
});

describe('petri illumination: the control in the dish', () => {
  const render = (cell) => harness.renderTool('cell', { cell: Object.assign({ _cellPicked: true, paused: true }, cell) });
  const pressed = (html, id) => {
    const m = new RegExp('<button[^>]*data-cell-illumination-option="' + id + '"[^>]*>').exec(html);
    expect(m, 'no ' + id + ' button').not.toBeNull();
    return /aria-pressed="true"/.test(m[0]);
  };

  it('offers three toggle buttons in observation, with the saved mode pressed', () => {
    const html = render({ mode: 'observe', petriIllumination: 'darkfield' });
    expect(html).toContain('data-cell-illumination-control="darkfield"');
    expect(html).toMatch(/role="group" aria-label="Microscope illumination"/);
    expect(pressed(html, 'darkfield')).toBe(true);
    expect(pressed(html, 'brightfield')).toBe(false);
    expect(pressed(html, 'phase')).toBe(false);
    expect(html).toMatch(/<canvas[^>]*data-cell-illumination="darkfield"/);
    expect(html).toContain('id="cell-illumination-caption"');
    expect(html).toMatch(/data-cell-illumination-note="darkfield"[\s\S]*Microscope light: Darkfield/);
  });

  it('falls back to brightfield for malformed saved values', () => {
    [42, 'DARK', { mode: 'phase' }, ['phase']].forEach((bad) => {
      const html = render({ mode: 'observe', petriIllumination: bad });
      expect(pressed(html, 'brightfield'), JSON.stringify(bad)).toBe(true);
      expect(html).toMatch(/<canvas[^>]*data-cell-illumination="brightfield"/);
      expect(html).not.toContain('Microscope light: undefined');
    });
  });

  it('keeps missions and the quiz in brightfield, whose cues name brightfield colours', () => {
    const play = render({ mode: 'play', petriIllumination: 'phase', showPlayInstructions: false });
    expect(play).not.toContain('data-cell-illumination-control');
    expect(play).toMatch(/<canvas[^>]*data-cell-illumination="brightfield"/);
    const quiz = render({ mode: 'observe', quizMode: true, petriIllumination: 'darkfield' });
    expect(quiz).not.toContain('data-cell-illumination-control');
    expect(quiz).toMatch(/<canvas[^>]*data-cell-illumination="brightfield"/);
  });
});
