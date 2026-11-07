// @vitest-environment jsdom
// Keyless re-runs (2026-11-05):
//  - rights_es: "Original file: mdoe-ml-parent-rights-es.pdf" in AlloFlow's own footer tripped the "right/left" sensory-words
//    reminder, so a teacher was asked about a file name. Answered by check only when EVERY flagged node is in that footer.
//  - so, activity4h: the first audit saw the image-editing toolbar the delivered file does not have, and its "missing lang"
//    reached the fix pass as a phantom issue. The baseline audit strips it, like every later audit.
// ALLO_PIPELINE_SOURCE lets a mutation run point at a private copy.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

const SRC = fs.readFileSync(process.env.ALLO_PIPELINE_SOURCE || path.resolve('doc_pipeline_source.jsx'), 'utf8');
const F = { file: 'doc_pipeline_source.jsx' };
const varFn = (name, deps = {}) => new Function(...Object.keys(deps),
  sliceBetween(SRC, 'var ' + name + ' = function', '\n};', { ...F, includeEnd: true }) + '\nreturn ' + name + ';')(...Object.values(deps));
const RULES = new Function(sliceBetween(SRC, 'var _ALLO_OWN_FOOTER_REMINDERS', '];', { ...F, includeEnd: true }) + '\nreturn _ALLO_OWN_FOOTER_REMINDERS;')();
const onFooter = varFn('_alloRemindersOnOwnFooter', { _ALLO_OWN_FOOTER_REMINDERS: RULES });
const apply = varFn('_alloApplyStylesheetReview', { _ALLO_STYLESHEET_REVIEW_RULES: ['style_highcontrast_visible', 'style_color_misuse'] });

const OWN = '<footer role="contentinfo" lang="en"><p>Prepared with AlloFlow accessibility tools on November 5, 2026. Original file: parent-rights-es.pdf (1 page).</p></footer>';
const doc = (footer = OWN) => '<!doctype html><html lang="es"><head><title>t</title></head><body><main><h1>Derechos</h1><p>Mire a la derecha del formulario.</p></main>' + footer + '</body></html>';
const FOOT_P = '/html[1]/body[1]/footer[1]/p[1]';
const BODY_P = '/html[1]/body[1]/main[1]/p[1]';
const finding = (doms, id = 'text_sensory_misuse') => ({ id, nodes: doms.length, description: "'right'", details: doms.map((dom) => ({ path: { dom } })) });

describe('_alloRemindersOnOwnFooter', () => {
  it('names a reminder whose every node is in AlloFlow\'s footer', () => {
    expect(onFooter(doc(), [finding([FOOT_P])])).toEqual({ text_sensory_misuse: true });
    expect(onFooter(doc(), [finding([FOOT_P], 'text_quoted_correctly')])).toEqual({ text_quoted_correctly: true });
    expect(onFooter(doc(), [finding([FOOT_P], 'text_block_heading')])).toEqual({ text_block_heading: true });
  });
  it('stays with a person when any node is the document\'s own text', () => {
    expect(onFooter(doc(), [finding([BODY_P])])).toEqual({});
    expect(onFooter(doc(), [finding([FOOT_P, BODY_P])])).toEqual({});
  });
  it('stays with a person for the document\'s OWN footer', () => {
    expect(onFooter(doc('<footer role="contentinfo"><p>Turn right at the office.</p></footer>'), [finding([FOOT_P])])).toEqual({});
    expect(onFooter(doc('<footer><p>Prepared with AlloFlow accessibility tools.</p></footer>'), [finding([FOOT_P])])).toEqual({});
  });
  it('fails safe: more nodes than details, no details, unknown path, a path outside body, a rule not on the list', () => {
    expect(onFooter(doc(), [Object.assign(finding([FOOT_P]), { nodes: 2 })])).toEqual({});
    expect(onFooter(doc(), [{ id: 'text_sensory_misuse', nodes: 1, details: [] }])).toEqual({});
    expect(onFooter(doc(), [finding(['/html[1]/body[1]/footer[1]/p[9]'])])).toEqual({});
    expect(onFooter(doc(), [finding(['/html[1]/head[1]/title[1]'])])).toEqual({});
    expect(onFooter(doc(), [finding([FOOT_P], 'style_focus_visible')])).toEqual({});
    expect(onFooter(doc(), [])).toEqual({});
  });
});

describe('the reminder and the counts', () => {
  const ea = () => ({ failViolations: 0, potentialViolations: 2, manualViolations: 0, reviewFindingCount: 2, manualFindings: [],
    potentialFindings: [finding([FOOT_P]), { id: 'text_block_heading', nodes: 1, description: "'Bold'" }] });
  it('moves to answeredByCheck, disclosed, with counts and score recomputed; others stay', () => {
    const out = apply(ea(), { ownFooter: { text_sensory_misuse: true } });
    expect(out.potentialFindings.map((f) => f.id)).toEqual(['text_block_heading']);
    expect(out.answeredByCheck).toEqual([expect.objectContaining({ id: 'text_sensory_misuse', bucket: 'potential', answeredBy: 'alloflow-own-footer-check', answer: expect.stringMatching(/footer AlloFlow adds/) })]);
    expect(out).toMatchObject({ potentialViolations: 1, reviewFindingCount: 1, score: 98 });
  });
  it('stays without a true from the check', () => {
    for (const v of [{}, { text_sensory_misuse: 1 }, { text_sensory_misuse: 'true' }, undefined]) {
      const out = apply(ea(), { ownFooter: v });
      expect(out.potentialFindings.map((f) => f.id)).toEqual(['text_sensory_misuse', 'text_block_heading']);
    }
  });
  it('the audit runs the check on the same markup the engine audited, and hands it on', () => {
    expect(SRC.includes('_ownFooter = _alloRemindersOnOwnFooter(_neutralizeForAuditFrame(htmlContent), potentials.concat(manuals));')).toBe(true);
    expect(SRC.includes('ownFooter: _ownFooter })')).toBe(true);
  });
  it('the report names the footer check', () => {
    expect(SRC.includes("f.answeredBy === 'alloflow-own-footer-check' ? 'footer' : 'stylesheet'")).toBe(true);
  });
  it('the panel names it too, with registered strings that repeat the pipeline\'s English', () => {
    const VIEW = fs.readFileSync(path.resolve('view_pdf_audit_source.jsx'), 'utf8');
    const STR = fs.readFileSync(path.resolve('ui_strings.js'), 'utf8');
    expect(VIEW.includes("t('pdf_audit.auto_answers.answered_by_footer_check')")).toBe(true);
    expect(VIEW.includes("t('pdf_audit.auto_answers.footer_answer')")).toBe(true);
    expect(STR.includes('"answered_by_footer_check":')).toBe(true);
    const m = STR.match(/"footer_answer": "([^"]+)"/);
    expect(SRC.includes(m[1].replace(/'/g, "\\'"))).toBe(true);
  });
});

describe('_alloSkipLinkLang (keyless udhr_es, pt, 11-05)', () => {
  const fn = new Function(sliceBetween(SRC, 'function _alloSkipLinkLang(html) {', '\n}\n', { ...F, includeEnd: true }) + '\nreturn _alloSkipLinkLang;')();
  const page = (lang, link = '<a href="#main-content" class="sr-only">Skip to main content</a>') => '<!doctype html><html lang="' + lang + '"><head></head><body>' + link + '<main id="main-content"><p>Texto</p></main></body></html>';
  it('marks AlloFlow\'s English link on a page in another language', () => {
    expect(fn(page('es'))).toContain('<a href="#main-content" class="sr-only" lang="en">Skip to main content</a>');
    expect(fn(page('pt-BR'))).toContain(' lang="en">Skip to main content</a>');
    expect(fn(page('ar'))).toContain(' lang="en">Skip to main content</a>');
  });
  it('leaves an English page, an already-marked link and other links alone, and is idempotent', () => {
    expect(fn(page('en'))).toBe(page('en'));
    expect(fn(page('en-US'))).toBe(page('en-US'));
    const marked = page('es', '<a href="#main-content" lang="en">Skip to main content</a>');
    expect(fn(marked)).toBe(marked);
    expect(fn(fn(page('es')))).toBe(fn(page('es')));
    const translated = page('es', '<a href="#main-content">Saltar al contenido</a>');
    expect(fn(translated)).toBe(translated);
    const noLang = '<html><body><a href="#m">Skip to main content</a></body></html>';
    expect(fn(noLang)).toBe(noLang);
  });
  it('runs before the first audit, so the fix round for it is not needed', () => {
    const at = SRC.indexOf('accessibleHtml = _alloSkipLinkLang(accessibleHtml);');
    expect(at).toBeGreaterThan(0);
    expect(at).toBeLessThan(SRC.indexOf('const beforeAxeResult = await runAxeAudit(accessibleHtml);'));
  });
});

describe('the first audit of a run', () => {
  it('sees the static document, not the image-editing toolbar', () => {
    expect(SRC.includes("auditOutputAccessibility(_stripChromeForAudit(batchOverrides && batchOverrides.staticDelivery === true ? _stripExecutableScripts(accessibleHtml, { stripImageReplace: true }) : accessibleHtml), { trigger: 'primary-baseline-verification' })")).toBe(true);
  });
  it('a delivered file has no Replace controls for the audit to see; the editable app keeps them (worksheet, 11-05)', () => {
    // The app's preview path stays as it was, so a person can still replace an image there.
    expect(SRC.includes('_stripExecutableScripts(accessibleHtml, { stripImageReplace: !!(batchOverrides && batchOverrides.staticDelivery === true) })')).toBe(true);
    expect(/batchOverrides\.staticDelivery === true \? _stripExecutableScripts\(accessibleHtml, \{ stripImageReplace: true \}\) : accessibleHtml/.test(SRC)).toBe(true);
  });
});
