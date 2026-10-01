// a11yAuditor now runs a DETERMINISTIC in-browser linter (window.__alloA11yPure) on the
// pasted HTML BEFORE/alongside the 3 LLM audit passes, so measurable WCAG failures are
// counted by code (DOMParser + the WCAG contrast formula) and shown distinctly from the
// model's qualitative judgement. These tests lock that engine.

import { describe, it, expect, beforeEach } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_a11yauditor.js', 'a11yAuditor'); });
const a11y = () => window.__alloA11yPure;
const audit = (html) => window.__alloA11yPure.deterministicAudit(html);
const crits = (html) => audit(html).findings.map((f) => f.wcag);

describe('a11yAuditor — WCAG contrast math', () => {
  it('black on white = 21:1', () => { expect(a11y().contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 1); });
  it('white on white = 1:1', () => { expect(a11y().contrastRatio([255, 255, 255], [255, 255, 255])).toBeCloseTo(1, 5); });
  it('mid-gray (#999) on white fails AA (< 4.5)', () => {
    expect(a11y().contrastRatio(a11y().parseColor('#999999'), [255, 255, 255])).toBeLessThan(4.5);
  });
});

describe('a11yAuditor — deterministic linter findings', () => {
  it('flags an image with no alt (1.1.1)', () => { expect(crits('<img src="x.png">')).toContain('1.1.1'); });
  it('passes an image with alt', () => { expect(crits('<img src="x.png" alt="a cat">')).not.toContain('1.1.1'); });
  it('flags a heading-level skip h1 -> h3 (1.3.1)', () => { expect(crits('<h1>A</h1><h3>B</h3>')).toContain('1.3.1'); });
  it('flags an unlabeled input (3.3.2)', () => { expect(crits('<form><input type="text"></form>')).toContain('3.3.2'); });
  it('accepts an input wrapped in a label', () => { expect(crits('<label>Name <input type="text"></label>')).not.toContain('3.3.2'); });
  it('accepts an input with aria-label', () => { expect(crits('<input type="text" aria-label="Name">')).not.toContain('3.3.2'); });
  it('flags low inline contrast (1.4.3)', () => { expect(crits('<p style="color:#aaaaaa;background:#ffffff">hi</p>')).toContain('1.4.3'); });
  it('passes good inline contrast', () => { expect(crits('<p style="color:#000000;background:#ffffff">hi</p>')).not.toContain('1.4.3'); });
  it('flags missing lang on a full document (3.1.1)', () => { expect(crits('<html><body><p>hi</p></body></html>')).toContain('3.1.1'); });
  it('flags an empty link (2.4.4)', () => { expect(crits('<a href="/x"></a>')).toContain('2.4.4'); });
  it('clean markup yields zero findings and some passes', () => {
    const r = audit('<main><h1>Title</h1><h2>Sub</h2><img src="a.png" alt="art"><p style="color:#000;background:#fff">ok</p></main>');
    expect(r.ok).toBe(true);
    expect(r.findings.length).toBe(0);
    expect(r.passed.length).toBeGreaterThan(0);
  });
});

describe('a11yAuditor — measured panel renders distinctly from the AI passes', () => {
  it('shows the "Measured checks · Deterministic · not AI" panel with the finding', () => {
    const det = audit('<img src="x.png">');
    const html = renderTool('a11yAuditor', {
      a11yAuditor: {
        auditResult: { score: 70, grade: 'C', summary: 'ok', issues: [], strengths: [] },
        deterministicAudit: det
      }
    });
    expect(html).toContain('Measured checks');
    expect(html).toContain('not AI');
    expect(html).toContain('1.1.1');
  });
});
