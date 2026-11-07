// @vitest-environment jsdom
// Aaron, 2026-11-05: IBM's download_keyboard_controllable reminder fires on every link whose address ends in .pdf/.doc/
// .docx/.odt (21 of 92 corpus runs held by it). A deterministic check answers it only when the document has nothing that
// could take the keyboard and every link is a plain web link; anything else stays with a person.
// ALLO_PIPELINE_SOURCE lets a mutation run point at a private copy.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

const SRC = fs.readFileSync(process.env.ALLO_PIPELINE_SOURCE || path.resolve('doc_pipeline_source.jsx'), 'utf8');
const F = { file: 'doc_pipeline_source.jsx' };
const varFn = (name, deps = {}) => new Function(...Object.keys(deps),
  sliceBetween(SRC, 'var ' + name + ' = function', '\n};', { ...F, includeEnd: true }) + '\nreturn ' + name + ';')(...Object.values(deps));
const plain = varFn('_alloDownloadLinksArePlain');
const apply = varFn('_alloApplyStylesheetReview', { _ALLO_STYLESHEET_REVIEW_RULES: ['style_highcontrast_visible', 'style_color_misuse'] });

const finding = (nodes = 1) => ({ id: 'download_keyboard_controllable', nodes, description: 'Verify that the file download mechanism does not cause a keyboard trap' });
const doc = (body, head = '') => '<!doctype html><html lang="en"><head><meta charset="UTF-8">' + head + '</head><body><main>' + body + '</main></body></html>';
const LINK = '<a href="https://example.org/form.pdf">Form</a>';

describe('_alloDownloadLinksArePlain: yes only for plain links in a document with nothing active', () => {
  it('answers the corpus shape: plain links, with target, rel, title, class, id and an ordinary web link beside them', () => {
    expect(plain(doc(LINK), [finding()])).toBe(true);
    expect(plain(doc('<a href="/docs/a.docx?v=2#p1" target="_blank" rel="noopener" title="A" class="x" id="y">A</a> <a href="https://example.org/">site</a> <a href="#top">top</a> <a href="mailto:a@example.org">mail</a>'), [finding()])).toBe(true);
    expect(plain(doc(LINK + LINK + LINK), [finding(3)])).toBe(true);
  });
  it.each([
    ['a script', LINK + '<script>document.onkeydown=function(e){e.preventDefault()}</script>'],
    ['a handler on the link', '<a href="a.pdf" onkeydown="return false">A</a>'],
    ['a handler anywhere else', LINK + '<p onclick="x()">p</p>'],
    ['tabindex on the link', '<a href="a.pdf" tabindex="-1">A</a>'],
    ['tabindex 0 on the link', '<a href="a.pdf" tabindex="0">A</a>'],
    ['a positive tabindex elsewhere', LINK + '<button tabindex="3">b</button>'],
    ['accesskey on the link', '<a href="a.pdf" accesskey="d">A</a>'],
    ['an iframe', LINK + '<iframe title="f" src="x.html"></iframe>'],
    ['an embed', LINK + '<embed src="x.pdf">'],
    ['an object', LINK + '<object data="x.pdf"></object>'],
    ['an image-map area', LINK + '<map name="m"><area href="a.pdf" alt="a"></map>'],
    ['inert content', '<div inert>' + LINK + '</div>'],
    ['editable content', '<div contenteditable="true">' + LINK + '</div>'],
    ['a javascript: address beside it', LINK + '<a href="javascript:void(0)">x</a>'],
    ['a javascript: address split by whitespace', LINK + '<a href="java&#10;script:x()">x</a>'],
    ['a data: address', LINK + '<a href="data:text/html,x">x</a>'],
    ['a blob: address', LINK + '<a href="blob:x">x</a>'],
  ])('stays with a person with %s', (_, body) => {
    expect(plain(doc(body), [finding()])).toBe(false);
  });
  it('stays with a person with a page refresh in the head', () => {
    expect(plain(doc(LINK, '<meta http-equiv="refresh" content="5;url=x">'), [finding()])).toBe(false);
  });
  it('a harmless other meta does not stand it down', () => {
    expect(plain(doc(LINK, '<meta http-equiv="X-UA-Compatible" content="IE=edge">'), [finding()])).toBe(true);
  });
  it('fails safe when what the engine flagged is not what this check counts', () => {
    expect(plain(doc(LINK), [finding(2)])).toBe(false); // engine saw more than the document holds
    expect(plain(doc('<a href="https://example.org/">site</a>'), [finding()])).toBe(false); // no download link at all
    expect(plain(doc('<a href="FORM.PDF">A</a>'), [finding()])).toBe(false); // engine's list is lower-case
    expect(plain(doc(LINK), [finding(0)])).toBe(false);
    expect(plain(doc(LINK), [])).toBe(false);
    expect(plain(doc(LINK), [{ id: 'other', nodes: 1 }])).toBe(false);
  });
  it('matches the engine on which addresses are downloads', () => {
    for (const h of ['a.pdf', 'a.doc', 'a.docx', 'a.odt', 'a.pdf?x=1', 'a.pdf#p2', 'a.pdf;v=1']) expect(plain(doc('<a href="' + h + '">A</a>'), [finding()]), h).toBe(true);
    for (const h of ['a.pptx', 'a.html', 'pdf', 'a.pdf/page']) expect(plain(doc('<a href="' + h + '">A</a>'), [finding()]), h).toBe(false);
  });
});

describe('the reminder and the review counts', () => {
  const ea = () => ({ failViolations: 0, potentialViolations: 0, manualViolations: 2, reviewFindingCount: 2, potentialFindings: [],
    manualFindings: [finding(), { id: 'text_sensory_misuse', nodes: 1, description: "'above'" }] });
  it('moves to answeredByCheck when plain, disclosed, with counts and score recomputed', () => {
    const out = apply(ea(), { check: null, downloadLinksPlain: true });
    expect(out.manualFindings.map((f) => f.id)).toEqual(['text_sensory_misuse']);
    expect(out.answeredByCheck).toEqual([expect.objectContaining({ id: 'download_keyboard_controllable', bucket: 'manual', answeredBy: 'alloflow-link-check', answer: expect.stringMatching(/plain web link/) })]);
    expect(out).toMatchObject({ manualViolations: 1, reviewFindingCount: 1, score: 98, manualReviewRequired: true });
  });
  it('stays in review without the check saying yes (only true counts)', () => {
    for (const v of [false, undefined, 'true', 1]) {
      const out = apply(ea(), { check: null, downloadLinksPlain: v });
      expect(out.manualFindings.map((f) => f.id)).toEqual(['download_keyboard_controllable', 'text_sensory_misuse']);
      expect(out.answeredByCheck).toEqual([]);
    }
  });
  it('a person cannot be told it was checked when the check did not run: the audit passes the check result in', () => {
    expect(SRC.includes('_linksPlain = _alloDownloadLinksArePlain(htmlContent, potentials.concat(manuals));')).toBe(true);
    expect(SRC.includes('downloadLinksPlain: _linksPlain,')).toBe(true);
    expect(SRC.includes('catch (_) { _linksPlain = false; }')).toBe(true);
  });
  it('the check reads the raw HTML, not the neutralized copy the audit frame gets (which has scripts removed)', () => {
    const fnStart = SRC.indexOf('const runEqualAccessAudit = async (htmlContent)');
    const body = SRC.slice(fnStart, SRC.indexOf('downloadLinksPlain: _linksPlain', fnStart));
    expect(body.includes('_alloDownloadLinksArePlain(htmlContent,')).toBe(true);
  });
  it('the report says "link check" for it, and still "stylesheet check" for the others', () => {
    expect(SRC.includes("(f.answeredBy === 'alloflow-link-check' ? 'link' : f.answeredBy")).toBe(true);
  });
  it('the AI cannot settle it: only this check can', () => {
    const allow = new Function(sliceBetween(SRC, 'var _ALLO_AI_SETTLED_REMINDERS', '];', { ...F, includeEnd: true }) + '\nreturn _ALLO_AI_SETTLED_REMINDERS;')();
    expect(allow).not.toContain('download_keyboard_controllable');
  });
});

describe('the review panel explains each answer with its own words', () => {
  const VIEW = fs.readFileSync(path.resolve('view_pdf_audit_source.jsx'), 'utf8');
  const STR = fs.readFileSync(path.resolve('ui_strings.js'), 'utf8');
  it('the colour and link answers no longer show the high-contrast explanation', () => {
    expect(VIEW.includes("f.answeredBy === 'alloflow-own-style-check' ? (t('pdf_audit.auto_answers.own_style_answer') || f.answer)")).toBe(true);
    expect(VIEW.includes("f.answeredBy === 'alloflow-link-check' ? (t('pdf_audit.auto_answers.link_answer') || f.answer)")).toBe(true);
  });
  it.each(['answered_by_link_check', 'link_answer', 'own_style_answer'])('%s is registered', (k) => {
    expect(STR.includes('"' + k + '":')).toBe(true);
  });
  it('the registered answers repeat the pipeline\'s English word for word', () => {
    for (const [k] of [['link_answer'], ['own_style_answer']]) {
      const m = STR.match(new RegExp('"' + k + '": "([^"]+)"'));
      expect(SRC.includes(m[1].replace(/'/g, "\\'")), k).toBe(true);
    }
  });
});
