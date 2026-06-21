// opticsLab: (1) regression guard that the tool renders its REAL body, not the
// "Initializing…" placeholder — it had a throwlab-class Rules-of-Hooks bug
// (Loading-gate early-return before useRef/useEffect) that crashed on the
// Loading→ready transition (bucket not persisted → empty every reload); the gate
// now seeds defaults without early-returning. (2) physics correctness for the
// thin-lens/mirror engine, exercised through the lens + mirror sims. (3) the new
// slider aria-valuetext that speaks the image result. Values verified by hand in
// docs/optics_lab_review.md.

import { describe, it, expect, beforeEach } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function render(state) {
  return renderTool('opticsLab', { opticsLab: state });
}

beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_optics.js', 'opticsLab'); });

describe('opticsLab — renders real body (Rules-of-Hooks fix)', () => {
  it('default state renders the lab, not the Initializing placeholder', () => {
    const html = render({});  // empty bucket → seeds defaults, must NOT early-return Loading
    expect(html).not.toContain('Initializing Optics');
    expect(html.length).toBeGreaterThan(2000);
  });
});

describe('opticsLab — thin-lens engine (rendered)', () => {
  it('converging lens, object beyond 2f → real, inverted, reduced (d_i 15, m -0.50)', () => {
    const html = render({ mode: 'lenses', lensType: 'converging', lensFocal: 10, lensDo: 30, lensObjH: 5 });
    expect(html).toContain('Image distance 15.0 cm');
    expect(html).toContain('magnification -0.50');
    expect(html).toContain('real');
  });
  it('converging lens, object inside f → virtual, upright, magnified (d_i -10, m 2.00)', () => {
    const html = render({ mode: 'lenses', lensType: 'converging', lensFocal: 10, lensDo: 5, lensObjH: 5 });
    expect(html).toContain('Image distance -10.0 cm');
    expect(html).toContain('magnification 2.00');
    expect(html).toContain('virtual');
  });
  it('diverging lens → always virtual, upright, reduced (d_i -6.7, m 0.33)', () => {
    const html = render({ mode: 'lenses', lensType: 'diverging', lensFocal: 10, lensDo: 20, lensObjH: 5 });
    expect(html).toContain('Image distance -6.7 cm');
    expect(html).toContain('magnification 0.33');
  });
});

describe('opticsLab — mirror engine (rendered)', () => {
  it('concave mirror, object beyond C → real, inverted (d_i 15, m -0.50)', () => {
    const html = render({ mode: 'reflection', reflMirrorType: 'concave', reflFocal: 10, reflDo: 30, reflObjH: 5 });
    expect(html).toContain('magnification -0.50');
    expect(html).toContain('real');
  });
  it('convex mirror → always virtual, upright, reduced (m 0.33)', () => {
    const html = render({ mode: 'reflection', reflMirrorType: 'convex', reflFocal: 10, reflDo: 20, reflObjH: 5 });
    expect(html).toContain('magnification 0.33');
    expect(html).toContain('virtual');
  });
});

describe('opticsLab — slider a11y (aria-valuetext speaks the image result)', () => {
  it('lens sliders expose the computed image via aria-valuetext', () => {
    const html = render({ mode: 'lenses', lensType: 'converging', lensFocal: 10, lensDo: 30 });
    expect(/aria-valuetext="[^"]*magnification -0\.50/.test(html)).toBe(true);
  });
  it('mirror sliders expose the computed image via aria-valuetext', () => {
    const html = render({ mode: 'reflection', reflMirrorType: 'concave', reflFocal: 10, reflDo: 30 });
    expect(/aria-valuetext="[^"]*magnification -0\.50/.test(html)).toBe(true);
  });
});
