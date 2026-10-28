// @vitest-environment jsdom
// Review triage shows every flagged element (2026-10-26, syllabus_sie: a 3-element finding showed the
// model one element and recorded its verdict for all three). Runs resolveReviewFindings sliced from the
// source (ALLO_PIPELINE_SOURCE points it at a private copy for mutation checks) with the model stubbed;
// tests/review_triage_resolve.test.js covers the same through the built module.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

const SRC = readFileSync(process.env.ALLO_PIPELINE_SOURCE || resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const F = { file: 'doc_pipeline_source.jsx' };
const helpers = sliceBetween(SRC, 'var _ALLO_REVIEW_TRIAGE_CAP = 10;', '\nfunction _alloTriageVisibleText', { ...F, includeEnd: false })
  + sliceBetween(SRC, 'function _alloTriageVisibleText(markup) {', '\nfunction _alloParseTriageReply', F)
  + sliceBetween(SRC, 'function _alloParseTriageReply(text) {', '\n}', { ...F, includeEnd: true });
const body = sliceBetween(SRC, '  var resolveReviewFindings = async function (html, findings, opts) {', '\n  };', { ...F, includeEnd: true });
const make = (callGemini) => new Function('callGemini', '_neutralizePromptFence', '_restoreNeutralizedPromptFences', 'acceptFixedHtmlDetailed',
  helpers + '\nvar _rawCallGemini = callGemini;\n' + body + '\nreturn resolveReviewFindings;')(callGemini, (s) => s, (s) => s, () => ({ accepted: true }));

const HTML = '<!DOCTYPE html><html lang="en"><body><main><h1>Doc</h1><p>Course Syllabus</p><p>Total 95</p><p>Just a paragraph.</p></main></body></html>';
const items = (prompt) => JSON.parse(prompt.split('UNTRUSTED ITEMS DATA:\n"""\n')[1].split('\n"""')[0]);

describe('triage shows every flagged element', () => {
  it('lists the other elements, uses the shown element\'s note, and records how many were shown', async () => {
    const prompts = [];
    const resolveReviewFindings = make(async (p) => { prompts.push(p); return '{"items":[{"key":"equalAccess|potential|text_block_heading","action":"not-an-issue","reason":"Body text."}]}'; });
    const finding = { engine: 'equalAccess', bucket: 'potential', id: 'text_block_heading', description: 'd', nodes: 3, wcagCriteria: [], details: [
      { snippet: '<p>gone</p>', message: 'first: unlocatable', path: { dom: '/html[1]/body[1]/main[1]/p[42]', aria: '' } },
      { snippet: '<p>Course Syllabus</p>', message: 'second: located', path: { dom: '/html[1]/body[1]/main[1]/p[1]', aria: '' } },
      // An engine snippet that is only the opening tag (osep2): the located element's markup is sent instead.
      { snippet: '<p>', message: 'third', path: { dom: '/html[1]/body[1]/main[1]/p[2]', aria: '' } }] };
    const out = await resolveReviewFindings(HTML, [finding], {});
    const sent = items(prompts[0])[0];
    expect(sent.element).toBe('<p>Course Syllabus</p>');
    expect(sent.note).toBe('second: located');
    expect(sent.alsoFlagged).toEqual([{ note: 'first: unlocatable', element: '<p>gone</p>' }, { note: 'third', element: '<p>Total 95</p>' }]);
    expect(prompts[0].includes('"not-an-issue" must hold for every one of them')).toBe(true);
    expect(out.dispositions[0].nodesShown).toBe(3);
  });
  it('a one-element finding has no alsoFlagged and nodesShown 1; at most 11 others are listed (12 shown)', async () => {
    const prompts = [];
    const resolveReviewFindings = make(async (p) => { prompts.push(p); return '{"items":[]}'; });
    const one = { engine: 'equalAccess', bucket: 'potential', id: 'r1', description: 'd', nodes: 1, details: [{ snippet: '', message: 'm', path: { dom: '/html[1]/body[1]/main[1]/p[3]', aria: '' } }] };
    const more = (n) => Array.from({ length: n }, (_, k) => ({ snippet: '<p>' + k + '</p>', message: 'o' + k, path: { dom: '/x', aria: '' } }));
    const eleven = { engine: 'equalAccess', bucket: 'potential', id: 'r2', description: 'd', nodes: 11, details: [{ snippet: '', message: 'm', path: { dom: '/html[1]/body[1]/main[1]/p[2]', aria: '' } }].concat(more(10)) };
    const many = { engine: 'equalAccess', bucket: 'potential', id: 'r3', description: 'd', nodes: 20, details: [{ snippet: '', message: 'm', path: { dom: '/html[1]/body[1]/main[1]/p[1]', aria: '' } }].concat(more(14)) };
    const out = await resolveReviewFindings(HTML, [one, eleven, many], {});
    const sent = items(prompts[0]);
    expect(sent[0].alsoFlagged).toBeUndefined();
    expect(sent[1].alsoFlagged).toHaveLength(10);
    expect(sent[1].alsoFlagged[0]).toEqual({ note: 'o0', element: '<p>0</p>' }); // unlocatable: the engine snippet
    expect(sent[2].alsoFlagged).toHaveLength(11);
    expect(out.dispositions.map((d) => d.nodesShown)).toEqual([1, 11, 12]);
  });
});
