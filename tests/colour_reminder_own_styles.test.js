// @vitest-environment jsdom
// Plan A (Aaron, 2026-11-02): IBM's style_color_misuse reminder lands on the first <style> that sets a colour, which is
// AlloFlow's own /* a11y-focus-visible */ block (engine-measured, 19 of 19 corpus runs). When every flagged node is one of
// AlloFlow's marked blocks, the reminder is answered by check (disclosed, never asked); anything else stays with a person.
// ALLO_PIPELINE_SOURCE lets a mutation run point at a private copy.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

const SRC = fs.readFileSync(process.env.ALLO_PIPELINE_SOURCE || path.resolve('doc_pipeline_source.jsx'), 'utf8');
const F = { file: 'doc_pipeline_source.jsx' };
const varFn = (name, deps = {}) => new Function(...Object.keys(deps),
  sliceBetween(SRC, 'var ' + name + ' = function', '\n};', { ...F, includeEnd: true }) + '\nreturn ' + name + ';')(...Object.values(deps));
const onOwn = varFn('_alloColourReminderOnOwnStyles');
const apply = varFn('_alloApplyStylesheetReview', { _ALLO_STYLESHEET_REVIEW_RULES: ['style_highcontrast_visible', 'style_color_misuse'] });

const doc = (headStyles) => '<!doctype html><html lang="en"><head><meta charset="UTF-8">' + headStyles + '</head><body><main><p>x</p></main></body></html>';
const OWN = '<style>/* a11y-reduced-motion */ @media (prefers-reduced-motion: reduce){*{animation:none}}</style><style>/* a11y-focus-visible */ a:focus-visible{outline:2px solid #ffffff;box-shadow:0 0 0 4px #000000}</style>';
const finding = (doms) => ({ id: 'style_color_misuse', nodes: doms.length, description: 'Verify color is not used as the only visual means of conveying information',
  details: doms.map((dom) => ({ path: { dom }, snippet: '<style>' })) });

describe('the colour reminder on AlloFlow\'s own styling', () => {
  it('is recognised when the flagged node is AlloFlow\'s marked focus block (the engine-measured case)', () => {
    expect(onOwn(doc(OWN + '<style>body{color:#111}</style>'), [finding(['/html[1]/head[1]/style[2]'])])).toBe(true);
  });
  it('stays with a person when the flagged node is the document\'s own stylesheet', () => {
    expect(onOwn(doc(OWN + '<style>.due{color:red}</style>'), [finding(['/html[1]/head[1]/style[3]'])])).toBe(false);
  });
  it('fails safe: unknown paths, missing details, more nodes than details, body styles', () => {
    expect(onOwn(doc(OWN), [finding(['/html[1]/head[1]/style[9]'])])).toBe(false);
    expect(onOwn(doc(OWN), [{ id: 'style_color_misuse', nodes: 1, details: [] }])).toBe(false);
    expect(onOwn(doc(OWN), [Object.assign(finding(['/html[1]/head[1]/style[2]']), { nodes: 2 })])).toBe(false);
    expect(onOwn(doc(OWN), [finding(['/html[1]/body[1]/main[1]/p[1]'])])).toBe(false);
    expect(onOwn(doc(OWN), [])).toBe(false);
  });
  it('moves the reminder to answeredByCheck, recomputes counts and score, and leaves other reminders alone', () => {
    const ea = { failViolations: 0, potentialViolations: 2, manualViolations: 0, reviewFindingCount: 2,
      potentialFindings: [finding(['/html[1]/head[1]/style[2]']), { id: 'text_sensory_misuse', nodes: 1, description: "'above'" }], manualFindings: [] };
    const out = apply(ea, { check: null, colourOnOwnStyles: true });
    expect(out.potentialFindings.map((f) => f.id)).toEqual(['text_sensory_misuse']);
    expect(out.answeredByCheck).toEqual([expect.objectContaining({ id: 'style_color_misuse', answeredBy: 'alloflow-own-style-check', answer: expect.stringMatching(/outline and a shadow, not colour alone/) })]);
    expect(out).toMatchObject({ potentialViolations: 1, reviewFindingCount: 1, score: 98 });
    const kept = apply(ea, { check: null, colourOnOwnStyles: false });
    expect(kept.potentialFindings.map((f) => f.id)).toEqual(['style_color_misuse', 'text_sensory_misuse']);
    expect(kept.answeredByCheck).toEqual([]);
  });
});
