// @vitest-environment jsdom
// Review-finding triage (2026-09-13). The engines' review tier (axe incomplete, Equal Access
// potential/manual) is what they could not decide. The pipeline now offers those findings to the
// model once, applies a returned fix only under a structure-only gate (same visible words, same
// images and links, nothing executable), and leaves it to the engines that re-run afterwards to
// say what cleared. Nothing is marked reviewed by the machine; the queue shows the model's reason
// for whatever remains.
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadAlloModule } from './setup.js';

const ROOT = path.resolve(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'doc_pipeline_source.jsx'), 'utf8');
const VIEW = fs.readFileSync(path.join(ROOT, 'view_pdf_audit_source.jsx'), 'utf8');
function topLevelFunction(name) {
  const at = SRC.indexOf('function ' + name + '(');
  if (at < 0) throw new Error('missing ' + name);
  let depth = 0, open = SRC.indexOf('{', at);
  for (let i = open; i < SRC.length; i++) {
    if (SRC[i] === '{') depth++;
    else if (SRC[i] === '}' && --depth === 0) return SRC.slice(at, i + 1);
  }
  throw new Error('unbalanced ' + name);
}
const pure = new Function(
  [topLevelFunction('_alloReviewFindingKey'), topLevelFunction('_alloCollectReviewFindings'), topLevelFunction('_alloTriageVisibleText'), topLevelFunction('_alloStructureOnlyEdit'), topLevelFunction('_alloParseTriageReply')].join('\n')
  + '; return { key: _alloReviewFindingKey, collect: _alloCollectReviewFindings, gate: _alloStructureOnlyEdit, parse: _alloParseTriageReply };',
)();

describe('structure-only edit gate', () => {
  it('accepts a tag change that keeps the words, images and links', () => {
    expect(pure.gate('<p>“To be or not to be.” <a href="/x">source</a></p>', '<blockquote>“To be or not to be.” <a href="/x">source</a></blockquote>')).toEqual({ ok: true, reason: null });
    expect(pure.gate('<p><b>Screening</b></p>', '<h3>Screening</h3>').ok).toBe(true);
    expect(pure.gate('<img src="a.png" alt="A very long description of the picture that goes on and on">', '<img src="a.png" alt="Short alt">').ok).toBe(true);
  });
  it('rejects anything that changes visible text, drops a link or image, or adds executable markup', () => {
    expect(pure.gate('<p>Total 95</p>', '<p>Total 96</p>').reason).toBe('visible-text-changed');
    expect(pure.gate('<p>See <a href="/a">here</a></p>', '<p>See <a href="/b">here</a></p>').reason).toBe('links-changed');
    expect(pure.gate('<p><img src="__ALLOFLOW_DATAURL_FINAL_1__" alt="x"> t</p>', '<p>x t</p>').reason).toBe('visible-text-changed');
    expect(pure.gate('<p>t</p>', '<p onclick="x()">t</p>').reason).toBe('executable-markup');
    expect(pure.gate('<p>t</p>', '<p>t</p>').reason).toBe('unchanged');
    expect(pure.gate('<p>t</p>', '<p>t</p>' + 'x'.repeat(2000)).reason).toBe('grew-too-much');
  });
});

describe('triage reply parsing', () => {
  it('reads fenced JSON and drops unknown actions', () => {
    const parsed = pure.parse('```json\n{"items":[{"key":"equalAccess|potential|text_quoted_correctly","action":"fix","reason":"It is a quotation.","replacement":"<blockquote>x</blockquote>"},{"key":"k2","action":"maybe","reason":"?"},{"key":"k3","action":"Needs-Person","reason":"Check the meaning."}]}\n```');
    expect(parsed.map((p) => p.key + ':' + p.action)).toEqual(['equalAccess|potential|text_quoted_correctly:fix', 'k3:needs-person']);
    expect(parsed[1].replacement).toBeNull();
  });
  it('returns null for prose', () => {
    expect(pure.parse('I could not decide.')).toBeNull();
  });
});

describe('collecting review findings', () => {
  it('maps axe incomplete and Equal Access potential/manual with their details', () => {
    const list = pure.collect({ incomplete: [{ id: 'color-contrast', description: 'c', nodes: 2 }] }, { potentialFindings: [{ id: 'text_quoted_correctly', description: 'q', nodes: 1, details: [{ snippet: '<p>x</p>', message: 'm', path: { dom: '/html[1]/body[1]/p[1]', aria: '' } }] }], manualFindings: [{ id: 'style_highcontrast_visible', description: 'h', nodes: 1 }] });
    expect(list.map(pure.key)).toEqual(['axe|incomplete|color-contrast', 'equalAccess|potential|text_quoted_correctly', 'equalAccess|manual|style_highcontrast_visible']);
    expect(list[1].details[0].path.dom).toBe('/html[1]/body[1]/p[1]');
  });
});

describe('resolveReviewFindings through the real pipeline', () => {
  const HTML = '<!DOCTYPE html><html lang="en"><body><main><h1>Doc</h1><p>“Correspondence between the two columns.”</p><p>Total 95 <a href="/r">report</a></p><p>Just a paragraph.</p></main></body></html>';
  const findingFor = (id, dom, bucket) => ({ engine: 'equalAccess', bucket: bucket || 'potential', id, description: 'desc ' + id, nodes: 1, wcagCriteria: ['1.3.1'], details: [{ snippet: '', message: 'm', path: { dom, aria: '' } }] });
  function makePipeline(callGemini) {
    const noop = () => {};
    return window.AlloModules.createDocPipeline({
      callGemini, callGeminiVision: callGemini, callImagen: async () => null,
      addToast: noop, t: (k) => k, isRtlLang: () => false,
      updateExportPreview: noop, getDefaultTitle: () => 'D', state: {},
    });
  }
  beforeEach(() => { loadAlloModule('doc_pipeline_module.js'); });

  it('applies a gated fix, records judgments, and refuses a text-changing fix', async () => {
    const prompts = [];
    const p = makePipeline(async (prompt) => {
      prompts.push(String(prompt));
      return JSON.stringify({ items: [
        { key: 'equalAccess|potential|text_quoted_correctly', action: 'fix', reason: 'It is a quotation.', replacement: '<blockquote>“Correspondence between the two columns.”</blockquote>' },
        { key: 'equalAccess|potential|text_sensory_misuse', action: 'fix', reason: 'Reworded.', replacement: '<p>Total 96 <a href="/r">report</a></p>' },
        { key: 'equalAccess|manual|style_highcontrast_visible', action: 'not-an-issue', reason: 'Plain text, no CSS positioning.' },
      ] });
    });
    const findings = [
      findingFor('text_quoted_correctly', '/html[1]/body[1]/main[1]/p[1]'),
      findingFor('text_sensory_misuse', '/html[1]/body[1]/main[1]/p[2]'),
      findingFor('style_highcontrast_visible', '/html[1]/body[1]/main[1]/p[3]', 'manual'),
      findingFor('img_alt_background', '/html[1]/body[1]/main[1]/figure[9]', 'manual'),
    ];
    const out = await p.resolveReviewFindings(HTML, findings, {});
    expect(prompts.length).toBe(1);
    expect(prompts[0]).toContain('UNTRUSTED ITEMS DATA');
    expect(prompts[0]).not.toContain('figure[9]'); // the unlocatable one was never offered
    expect(out.changed).toBe(true);
    expect(out.applied).toBe(1);
    expect(out.attempted).toBe(3);
    expect(out.html).toContain('<blockquote>“Correspondence between the two columns.”</blockquote>');
    expect(out.html).toContain('<p>Total 95 <a href="/r">report</a></p>');
    const byKey = Object.fromEntries(out.dispositions.map((d) => [d.key, d]));
    expect(byKey['equalAccess|potential|text_quoted_correctly']).toMatchObject({ action: 'fix', applied: true });
    expect(byKey['equalAccess|potential|text_sensory_misuse']).toMatchObject({ action: 'fix', applied: false, skipReason: 'visible-text-changed' });
    expect(byKey['equalAccess|manual|style_highcontrast_visible']).toMatchObject({ action: 'not-an-issue', applied: false, reason: 'Plain text, no CSS positioning.' });
    expect(byKey['equalAccess|manual|img_alt_background']).toMatchObject({ action: 'needs-person', applied: false, skipReason: 'no-anchor' });
  });

  it('spends no model call when nothing can be located, and none over the cap', async () => {
    let calls = 0;
    const p = makePipeline(async () => { calls++; return '{"items":[]}'; });
    const none = await p.resolveReviewFindings(HTML, [findingFor('x', '/html[1]/body[1]/main[1]/p[42]')], {});
    expect(calls).toBe(0);
    expect(none.changed).toBe(false);
    expect(none.dispositions[0].skipReason).toBe('no-anchor');
    const many = Array.from({ length: 11 }, (_, i) => findingFor('rule' + i, '/html[1]/body[1]/main[1]/p[1]'));
    const over = await p.resolveReviewFindings(HTML, many, {});
    expect(calls).toBe(0);
    expect(over.skipped).toBe('over-cap');
  });

  it('a prose reply leaves the document untouched', async () => {
    const p = makePipeline(async () => 'Sorry, I cannot help with that.');
    const out = await p.resolveReviewFindings(HTML, [findingFor('text_quoted_correctly', '/html[1]/body[1]/main[1]/p[1]')], {});
    expect(out.changed).toBe(false);
    expect(out.skipped).toBe('unparseable-reply');
    expect(out.html).toBe(HTML);
  });
});

describe('automatic triage and the queue', () => {
  it('runs before the final audit only on a healthy lane, within the cap, and lets the engines settle what cleared', () => {
    expect(SRC).toContain("const _triageHealthy = !_remediationThrottlePaused && !(_triageInfo && (_triageInfo.recentlyThrottled || _triageInfo.storming));");
    expect(SRC).toContain('if (_triageFindings.length > 0 && _triageFindings.length <= _ALLO_REVIEW_TRIAGE_CAP) {');
    expect(SRC).toContain('const _tri = await resolveReviewFindings(accessibleHtml, _triageFindings, { signal: _runAbortSignal });');
    expect(SRC.indexOf('let _reviewTriage = null;')).toBeLessThan(SRC.indexOf('// ── Final authoritative audit: re-run ONE clean audit on the finished HTML ──'));
    expect(SRC).toContain("_reviewTriage.resolved = _reviewTriage.keys.filter((k) => !_afterKeys.has(k)).length;");
    expect(SRC).toContain('reviewTriage: _reviewTriage,');
    expect(SRC).toContain('var _ALLO_REVIEW_TRIAGE_CAP = 10;');
  });
  it('the view shows the model\'s reasons and offers the on-demand run, and never marks anything reviewed itself', () => {
    expect(VIEW).toContain('_runReviewTriage');
    expect(VIEW).toContain("'🤖 Ask AI to resolve'");
    expect(VIEW).toContain('_triageLabel');
    expect(VIEW).toContain('_docPipeline.resolveReviewFindings');
    expect(VIEW).toContain('{ reviewTriage: summary }');
    expect(VIEW).toContain("setPdfFixResult((prev) => prev ? { ...prev, reviewTriage: summary } : prev);");
    expect(VIEW).not.toContain('reviewedFindings: summary');
  });
});
