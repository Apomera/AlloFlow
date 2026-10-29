// Decision guides for the judgment calls a remediation leaves to a person (2026-10-28, phases 1-2):
// the library's shape, which guides a run gets, and how they reach the connector's report.
import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const requireCjs = createRequire(import.meta.url);
// The guides live in remediation_review_helpers.js, the footer every build path appends to the pipeline module.
const G = requireCjs(resolve(process.cwd(), 'remediation_review_helpers.js')).decisionGuides;
const V = requireCjs(resolve(process.cwd(), 'desktop/mcp/remediation_verification.cjs'));

describe('the guide library', () => {
  it('every guide says what a checker cannot know, the question, at least two answers plus "Not sure", and a lesson', () => {
    expect(G.guides.length).toBeGreaterThanOrEqual(15);
    for (const g of G.guides) {
      expect(g.id, g.id).toMatch(/^[a-z][a-z-]+$/);
      expect(g.title.length, g.id).toBeGreaterThan(5);
      expect(g.checkerCannot.length, g.id).toBeGreaterThan(40);
      expect(g.question.trim().endsWith('?'), g.id).toBe(true);
      expect(g.options.length, g.id).toBeGreaterThanOrEqual(3);
      expect(g.options[g.options.length - 1].id, g.id).toBe('unsure');
      for (const o of g.options) { expect(o.label && o.choose && o.then, g.id + '/' + o.id).toBeTruthy(); }
      expect(g.lesson.steps.length, g.id).toBeGreaterThanOrEqual(2);
      expect(g.lesson.fine && g.lesson.fix, g.id).toBeTruthy();
      for (const w of g.wcag) expect(w, g.id).toMatch(/^\d\.\d{1,2}\.\d{1,2}$/);
    }
  });
  it('ids and match keys are unique, so one finding has exactly one guide', () => {
    const ids = G.guides.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    const keys = G.guides.flatMap((g) => g.match);
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of keys) expect(k).toMatch(/^(equalAccess|axe|ai|fidelity|delivery):[\w-]+$/);
  });
  it('covers the judgment calls the 38-document corpus actually produced', () => {
    for (const id of ['text_sensory_misuse', 'style_color_misuse', 'text_block_heading', 'text_quoted_correctly', 'list_markup_review', 'download_keyboard_controllable', 'media_alt_brief', 'blockquote_cite_exists']) {
      expect(G.guideFor('equalAccess', id), id).toBeTruthy();
    }
    for (const kind of ['numeric', 'sourceReadingOrder', 'sourceReadingOrderRegrouped', 'imagePairing', 'ocrVisionAlignment', 'formFields', 'activeContent']) {
      expect(G.guideFor('fidelity', kind), kind).toBeTruthy();
    }
    expect(G.guideFor('delivery', 'content_coverage_requires_review').id).toBe('missing-words');
    expect(G.guideFor('equalAccess', 'no_such_rule')).toBe(null);
  });
  it('a run gets each guide once, with the findings it covers, as plain data', () => {
    const list = G.guidesForRun({ equalAccess: ['text_sensory_misuse', 'style_color_misuse', 'text_sensory_misuse', 'unknown_rule'], fidelity: ['sourceReadingOrder', 'sourceReadingOrderRegrouped'], ai: ['alt-quality'], withhold: 'content_coverage_requires_review' });
    expect(list.map((g) => g.id)).toEqual(['sensory-words', 'colour-only', 'reading-order', 'image-description', 'missing-words']);
    expect(list[2].findings).toEqual(['fidelity:sourceReadingOrder', 'fidelity:sourceReadingOrderRegrouped']);
    expect(list[0].findings).toEqual(['equalAccess:text_sensory_misuse']); // a repeated rule is listed once
    expect(JSON.parse(JSON.stringify(list))).toEqual(list);
    list[0].title = 'changed';
    expect(G.guideById('sensory-words').title).not.toBe('changed'); // copies, not the library objects
  });
  it('the pipeline module carries the library (window.AlloModules.RemediationDecisionGuides)', () => {
    const helpers = requireCjs(resolve(process.cwd(), 'remediation_review_helpers.js'));
    expect(typeof helpers.evidence).toBe('function'); // the helpers' own exports are kept
    expect(readFileSync(resolve(process.cwd(), 'remediation_review_helpers.js'), 'utf8').includes('root.AlloModules.RemediationDecisionGuides = api;')).toBe(true);
    const w = {};
    new Function('window', readFileSync(resolve(process.cwd(), 'doc_pipeline_module.js'), 'utf8'))(w);
    expect(w.AlloModules.RemediationDecisionGuides.guides.length).toBe(G.guides.length);
  });
});

describe('the connector report', () => {
  const run = G.guidesForRun({ equalAccess: ['text_sensory_misuse'], withhold: 'page_range_tagged_pdf_unsupported' });
  it('normalises guides from the page to the known, bounded shape', () => {
    const hostile = [{ ...run[0], extra: '<script>', title: 'x'.repeat(500), options: [{ id: 'fine', label: 'ok', choose: 'c', then: 't', evil: 1 }, { id: 'BAD ID', label: 'x' }], findings: ['equalAccess:text_sensory_misuse', 'javascript:alert(1)<'] }, { id: 'Not An Id' }, 'string'];
    const out = V.normalizeDecisionGuides(hostile);
    expect(out).toHaveLength(1);
    expect(out[0].extra).toBeUndefined();
    expect(out[0].title.length).toBe(120);
    expect(out[0].options).toEqual([{ id: 'fine', settles: false, label: 'ok', choose: 'c', then: 't' }]);
    expect(out[0].findings).toEqual(['equalAccess:text_sensory_misuse']);
    expect(V.normalizeDecisionGuides(null)).toEqual([]);
  });
  it('the delivery explanation carries them as "decisions"', () => {
    const ex = V.explainDelivery({ files: {}, decisionGuides: run, verdictReasons: { review: [], cautions: [] } });
    expect(ex.decisions.map((d) => d.id)).toEqual(['sensory-words']);
    expect(ex.decisions[0].question).toBe('Could someone who cannot see the layout still follow this sentence?');
    expect(V.explainDelivery({ files: {} }).decisions).toEqual([]);
  });
  it('the run attaches them in the page and the server keeps them in the report', () => {
    const drv = readFileSync(resolve(process.cwd(), 'desktop/mcp/remediation_headless_driver.cjs'), 'utf8');
    expect(drv.includes('const G = window.AlloModules && window.AlloModules.RemediationDecisionGuides;')).toBe(true);
    expect(drv.includes('withhold: taggedPdfError,')).toBe(true);
    const srv = readFileSync(resolve(process.cwd(), 'desktop/mcp/alloflow-remediation-mcp-stdio.cjs'), 'utf8');
    expect(srv.includes('decisionGuides: Verification.normalizeDecisionGuides(out.decisionGuides),')).toBe(true);
  });
});

// ── Phase 2 in the app: the "Needs your judgment" list, the lessons, the recorded decision, save/restore, report ──
const VIEW = readFileSync(process.env.ALLO_VIEW_SOURCE || resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8'); // env: private copy for mutation checks
const PIPE = readFileSync(process.env.ALLO_PIPELINE_SOURCE || resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8'); // env: private copy for mutation checks
describe('the review list shows how to decide', () => {
  it('each finding with a guide gets a card: why a person decides, the question, one button per answer (not "Not sure")', () => {
    for (const pin of [
      'data-decision-guide={g.id}',
      "{t('pdf_audit.decision_guide.why_person') || 'Why a person decides:'}</span> {g.checkerCannot}",
      '<p className="mt-1 font-semibold">{g.question}</p>',
      "{o.id === 'unsure'",
      'onClick={(event) => _setReviewAttestation(event, _rfKey(f), !!o.settles, { guide: g.id, option: o.id })}',
    ]) expect(VIEW.includes(pin), pin).toBe(true);
  });
  it('the lesson link jumps to a lesson inside the page and opens it', () => {
    expect(VIEW.includes("<a href={'#allo-guide-' + g.id} onClick={(event) => _openLesson(event, g.id)}")).toBe(true);
    expect(VIEW.includes("<details key={g.id} id={'allo-guide-' + g.id}")).toBe(true);
    expect(VIEW.includes('el.open = true;')).toBe(true);
  });
  it('a settling answer marks the finding reviewed; an answer that needs an edit is recorded and leaves it open', () => {
    expect(VIEW.includes('const decisionOnly = !!decision && !reviewed;')).toBe(true);
    expect(VIEW.includes('if (decisionOnly) return Object.keys(updated).length ? updated : null;')).toBe(true);
    expect(VIEW.includes('if (decision) updated[key] = { guide: decision.guide, option: decision.option, at };')).toBe(true);
    expect(VIEW.includes('_viewWithReviewAttestations(prev, change(prev.reviewedFindings), _docPipeline, changeDecision(prev.reviewDecisions))')).toBe(true);
    expect(VIEW.includes('setReviewDecisions({});')).toBe(true); // a new document starts with none
  });
  it('the decision rides the result and survives save and restore', () => {
    const helper = VIEW.slice(VIEW.indexOf('function _viewWithReviewAttestations('), VIEW.indexOf('async function _viewCreateVerificationHtmlBinding'));
    const fn = new Function('_viewIsLiveVerificationHtmlBound', '_viewAttachRuntimeBindingProof', helper + '\nreturn _viewWithReviewAttestations;')(() => false, () => {});
    const r = fn({ accessibleHtml: '<p>x</p>' }, { 'equalAccess|potential|text_sensory_misuse': 1 }, null, { 'equalAccess|potential|text_sensory_misuse': { guide: 'sensory-words', option: 'fine', at: 1 } });
    expect(r.reviewDecisions['equalAccess|potential|text_sensory_misuse'].option).toBe('fine');
    expect('reviewDecisions' in fn({ reviewDecisions: { a: 1 } }, null, null)).toBe(true); // undefined keeps the stored map
    const line = "reviewDecisions: (project.reviewDecisions && typeof project.reviewDecisions === 'object') ? project.reviewDecisions : null,";
    expect(VIEW.split(line).length - 1).toBe(2);
    expect(readFileSync(resolve(process.cwd(), 'view_sidebar_panels_source.jsx'), 'utf8').includes(line)).toBe(true);
    expect(readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8').includes("reviewDecisions: (cur.reviewDecisions && typeof cur.reviewDecisions === 'object') ? cur.reviewDecisions : null,")).toBe(true);
  });
  it('every label the card uses is registered in ui_strings', () => {
    const ui = JSON.parse(readFileSync(resolve(process.cwd(), 'ui_strings.js'), 'utf8'));
    const used = [...new Set((VIEW.match(/t\('pdf_audit\.decision_guide\.([a-z_]+)'\)/g) || []).map((m) => m.slice(28, -2)))];
    expect(used.length).toBeGreaterThanOrEqual(7);
    expect(used.filter((k) => typeof ui.pdf_audit.decision_guide[k] !== 'string')).toEqual([]);
  });
});
describe('the report records the decision with the attestation', () => {
  const code = PIPE.slice(PIPE.indexOf('    const _decisionsRpt = '), PIPE.indexOf('    if (_rptFindingKeys.length > 0) {'));
  const txt = (d) => new Function('d', 'window', code + '\nreturn _decisionTxt;')(d, { AlloModules: { RemediationDecisionGuides: G } });
  it('names the chosen answer, and says a change is pending when the answer needs an edit', () => {
    const t1 = txt({ reviewDecisions: { k1: { guide: 'sensory-words', option: 'fine' }, k2: { guide: 'sensory-words', option: 'reword' } } });
    expect(t1('k1')).toBe(' — decided: Fine as written');
    expect(t1('k2')).toBe(' — decided: Reword it (change pending)');
    expect(t1('k3')).toBe('');
    expect(txt({})('k1')).toBe('');
  });
  it('reviewed rows and open rows both show it', () => {
    expect(PIPE.includes("return '✓ ' + esc(r.label) + esc(_decisionTxt(r.key));")).toBe(true);
    expect(PIPE.includes("(_decisionTxt(r.key) ? esc(_decisionTxt(r.key)) : ' — not yet reviewed')")).toBe(true);
  });
});

// ── Phase 3: evidence (where each flagged value, word or phrase sits in the original) ──
describe('source context', () => {
  const pages = [{ pageNum: 16, text: 'Preparations are underway. In 2016 the team built 16 test articles and 16.5 tonnes. The steps below explain how to apply for the grant program this year and next.' }, { pageNum: 17, text: '17 Below the fold' }];
  it('finds whole numbers only, never inside a year or a decimal', () => {
    const hits = G.sourceContext(pages, '16', 5);
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ page: 16, match: '16' });
    expect(hits[0].after.startsWith(' test articles')).toBe(true);
    expect(G.sourceContext(pages, '16.5', 5)[0].match).toBe('16.5');
  });
  it('finds words case-insensitively on every page, up to the limit, with an ellipsis where text was cut', () => {
    const hits = G.sourceContext(pages, 'below', 5);
    expect(hits.map((h) => [h.page, h.match])).toEqual([[16, 'below'], [17, 'Below']]);
    expect(hits[0].before.startsWith('\u2026')).toBe(true);
    expect(G.sourceContext(pages, 'below', 1)).toHaveLength(1);
  });
  it('returns nothing for no pages, an empty or overlong needle, or no match', () => {
    expect(G.sourceContext(null, 'x')).toEqual([]);
    expect(G.sourceContext(pages, '  ')).toEqual([]);
    expect(G.sourceContext(pages, 'x'.repeat(201))).toEqual([]);
    expect(G.sourceContext(pages, 'nowhere')).toEqual([]);
  });
});
describe('evidence reaches the numbers note, the connector report and the app', () => {
  it('the pipeline attaches where each lost value sits to the numbers note (both checks)', () => {
    const code = PIPE.slice(PIPE.indexOf('var _alloValueEvidence = function (vals) {'), PIPE.indexOf('// (2026-10-28) A page\'s own printed number'));
    const pages = [{ pageNum: 4, text: 'Specific learning disability 32 percent.' }];
    const ev = new Function('window', code + '\nreturn _alloValueEvidence;')({ AlloModules: { RemediationDecisionGuides: G }, __lastGroundTruthPageMap: pages })(['32', '99']);
    expect(ev.map((e) => [e.value, e.where.length])).toEqual([['32', 1], ['99', 0]]);
    expect(PIPE.includes("_structuralFidelityNotes.push({ kind: 'numeric', msg: _numericLossWarn, evidence: _numericLossEvidence });")).toBe(true);
    expect(PIPE.includes("out.fidelityNotes.push({ kind: 'numeric', msg: out.numericWarn, evidence: out.numericEvidence || [] });")).toBe(true);
  });
  it('the connector keeps evidence bounded', () => {
    const g = { ...G.guidesForRun({ fidelity: ['numeric'] })[0], evidence: [{ label: '16', where: [{ page: 16, before: 'a'.repeat(500), match: '16', after: 'b', extra: 1 }, { page: 0, before: '', match: 'x', after: '' }] }, { label: '' }] };
    const out = V.normalizeDecisionGuides([g])[0].evidence;
    expect(out).toEqual([{ label: '16', where: [{ page: 16, before: 'a'.repeat(200), match: '16', after: 'b' }] }]);
  });
  it('the run builds evidence per guide in the page', () => {
    const drv = readFileSync(resolve(process.cwd(), 'desktop/mcp/remediation_headless_driver.cjs'), 'utf8');
    for (const pin of ["if (g.id === 'changed-numbers') {", "} else if (g.id === 'missing-words') {", 'g.evidence = ev;']) expect(drv.includes(pin), pin).toBe(true);
  });
  it('the review list shows the original around the quoted words; content checks get a card with evidence and a recorded decision', () => {
    for (const pin of [
      "const quoted = (String(f.description || '').match(/['\"\\u201c]([^'\"\\u201d]{2,80})['\"\\u201d]/) || [])[1];",
      'data-review-source={_rfKey(f)}',
      "const g = G && n && n.kind ? G.guideFor('fidelity', n.kind) : null;",
      'data-fidelity-evidence',
      'onClick={() => _recordFidelityDecision(n.kind, g.id, o.id)}',
      "const key = 'fidelity|' + kind;",
    ]) expect(VIEW.includes(pin), pin).toBe(true);
  });
  it('the report lists content-check decisions as human attestations', () => {
    const a = PIPE.indexOf('    const _decisionsRpt = ');
    const code = PIPE.slice(a, PIPE.indexOf('    if (_rptFindingKeys.length > 0) {', a)) + PIPE.slice(PIPE.indexOf('    const _fidDecisionRows = '), PIPE.indexOf('    if (_fidDecisionRows.length) {'));
    const rows = new Function('d', 'window', 'esc', code + '\nreturn _fidDecisionRows;')({ reviewDecisions: { 'fidelity|numeric': { guide: 'changed-numbers', option: 'fine' }, 'fidelity|sourceReadingOrder': { guide: 'reading-order', option: 'fix' }, 'equalAccess|potential|x': { guide: 'sensory-words', option: 'fine' } } }, { AlloModules: { RemediationDecisionGuides: G } }, (s) => s);
    expect(rows).toEqual(['Numbers that may have changed: All accounted for', 'Reading order differs from the original (WCAG 1.3.2): Something is out of place (change pending)']);
  });
});
describe('the quoted words a checker names are found in either quote style', () => {
  it('single, double and curly quotes', () => {
    const line = VIEW.slice(VIEW.indexOf('const quoted = (String(f.description'), VIEW.indexOf('\n', VIEW.indexOf('const quoted = (String(f.description')));
    const q = (description) => new Function('f', line + '\nreturn quoted;')({ description });
    expect(q("Confirm the word(s) 'below' of the user instruction")).toBe('below');
    expect(q('If the following text is a quotation, mark it as a <q> or <blockquote> element: "cds", "child development services"')).toBe('cds');
    expect(q('Confirm this text \u201cCourse Syllabus\u201d is used as a heading')).toBe('Course Syllabus');
    expect(q('Verify color is not used as the only visual means')).toBe(undefined);
  });
});

// (2026-10-28) WCAG links on every guide, practice items, and the PD module built from the same library.
describe('each guide links its WCAG criteria to the W3C pages the review list already uses', () => {
  const helperSrc = VIEW.slice(VIEW.indexOf('const _wcagUnderstandingUrl = (wcag) => {'), VIEW.indexOf('  // (2026-10-28) A decision guide\'s WCAG criteria'));
  const learnMoreUrl = new Function(helperSrc + '\nreturn _wcagUnderstandingUrl;')();
  it('every cited criterion has a name, a level and the same Understanding URL as "Learn more"', () => {
    for (const g of G.guides) {
      expect(g.wcagRefs.map((r) => r.sc), g.id).toEqual(g.wcag);
      for (const r of g.wcagRefs) {
        expect(r.name.length, g.id + ' ' + r.sc).toBeGreaterThan(3);
        expect(['A', 'AA'], g.id + ' ' + r.sc).toContain(r.level);
        expect(r.url, g.id + ' ' + r.sc).toBe(learnMoreUrl(r.sc));
      }
    }
    expect(G.wcagRefs(['1.3.3'])).toEqual([{ sc: '1.3.3', name: 'Sensory Characteristics', level: 'A', url: 'https://www.w3.org/WAI/WCAG21/Understanding/sensory-characteristics.html' }]);
    expect(G.wcagRefs(['2.4.6'])[0].level).toBe('AA');
    expect(G.wcagRefs(['9.9.9', null])).toEqual([]);
  });
  it('a check that is not a WCAG rule says so instead of showing nothing', () => {
    for (const g of G.guides) {
      if (g.wcag.length) expect(g.wcagNote, g.id).toBe(undefined);
      else expect(g.wcagNote, g.id).toMatch(/^Not (a|a single) WCAG rule\./);
    }
    expect(G.guideById('changed-numbers').wcagNote).toMatch(/accuracy/);
  });
  it('a run carries the links and the note, not the practice items', () => {
    const [sensory, numbers] = G.guidesForRun({ equalAccess: ['text_sensory_misuse'], fidelity: ['numeric'] });
    expect(sensory.wcagRefs[0].url).toBe('https://www.w3.org/WAI/WCAG21/Understanding/sensory-characteristics.html');
    expect(numbers.wcagNote).toMatch(/^Not a WCAG rule/);
    expect('practice' in sensory).toBe(false);
    expect(G.guideById('sensory-words').practice.length).toBeGreaterThan(0); // the library keeps them
  });
  it('the connector report keeps W3C links only, with known levels, and bounds the note', () => {
    const g = { id: 'colour-only', wcagNote: 'n'.repeat(500), wcagRefs: [
      { sc: '1.4.1', name: 'Use of Color', level: 'A', url: 'https://www.w3.org/WAI/WCAG21/Understanding/use-of-color.html' },
      { sc: '1.4.1', name: 'x', level: 'A', url: 'https://evil.example/WAI/WCAG21/Understanding/use-of-color.html' },
      { sc: '1.4.1', name: 'x', level: 'A', url: 'javascript:alert(1)' },
      { sc: '1.4.1', name: 'x', level: 'Z', url: 'https://www.w3.org/WAI/WCAG21/Understanding/use-of-color.html' },
    ] };
    const out = V.normalizeDecisionGuides([g])[0];
    expect(out.wcagRefs).toEqual([{ sc: '1.4.1', name: 'Use of Color', level: 'A', url: 'https://www.w3.org/WAI/WCAG21/Understanding/use-of-color.html' }]);
    expect(out.wcagNote.length).toBe(300);
  });
  it('the review card, the content-check card and the lesson each show the line; links open in a new tab and say so', () => {
    expect(VIEW.split('{_guideWcagLine(g)}').length - 1).toBe(3);
    const lineSrc = VIEW.slice(VIEW.indexOf('  const _guideWcagLine = (g) => {'), VIEW.indexOf('  const _agreementTooltip'));
    const h = (type, props, ...children) => ({ type, props: props || {}, children: children.flat() });
    const React = { createElement: h, Fragment: 'frag' };
    // JSX is compiled for the real module; here, evaluate the compiled helper from the built view module.
    const built = readFileSync(process.env.ALLO_VIEW_MODULE || resolve(process.cwd(), 'view_pdf_audit_module.js'), 'utf8');
    const bs = built.indexOf('const _wcagUnderstandingUrl = (wcag) => {');
    const code = built.slice(bs, built.indexOf('const _agreementTooltip', bs));
    const line = new Function('React', 't', code + '\nreturn _guideWcagLine;')(React, () => null);
    const text = (n) => (n == null || typeof n !== 'object' ? (n == null ? '' : String(n)) : n.children.map(text).join(''));
    const links = (n) => (n && typeof n === 'object' ? (n.type === 'a' ? [n] : []).concat(...n.children.map(links)) : []);
    const p = line(G.guideById('heading-or-emphasis'));
    expect(p.props['data-guide-wcag']).toBe('1.3.1 2.4.6');
    expect(links(p).map((a) => [a.props.href, a.props.target, a.props.rel])).toEqual([
      ['https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html', '_blank', 'noopener noreferrer'],
      ['https://www.w3.org/WAI/WCAG21/Understanding/headings-and-labels.html', '_blank', 'noopener noreferrer'],
    ]);
    expect(text(p)).toContain('2.4.6 Headings and Labels (Level AA) (opens in a new tab)');
    expect(text(line(G.guideById('missing-words')))).toMatch(/^Not a WCAG rule/);
    expect(line(null)).toBe(null);
    expect(lineSrc.includes('className="sr-only"')).toBe(true);
  });
  it('the report names the criteria next to each content-check decision', () => {
    expect(PIPE.includes("(g.wcag && g.wcag.length ? ' (WCAG ' + esc(g.wcag.join(', ')) + ')' : '')")).toBe(true);
  });
});

describe('practice items', () => {
  it('every guide has at least two, each answer is a real option (never "Not sure"), and answers are mixed', () => {
    for (const g of G.guides) {
      expect(g.practice.length, g.id).toBeGreaterThanOrEqual(2);
      for (const p of g.practice) {
        const o = g.options.find((x) => x.id === p.answer);
        expect(o && o.id !== 'unsure', g.id + ' ' + p.answer).toBe(true);
        expect(p.scenario.length > 20 && p.why.length > 20, g.id).toBe(true);
      }
      expect(new Set(g.practice.map((p) => p.answer)).size, g.id).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('the PD module is built from the guides', () => {
  const Builder = requireCjs(resolve(process.cwd(), 'dev-tools/build_remediation_judgment_pd.cjs'));
  const PdCore = requireCjs(resolve(process.cwd(), 'pd_core_module.js'));
  const file = readFileSync(Builder.OUT, 'utf8');
  const mod = JSON.parse(file);
  it('the checked-in module is current, valid and passes the accessibility preflight', () => {
    expect(file === Builder.render(), 'run node dev-tools/build_remediation_judgment_pd.cjs').toBe(true);
    const v = PdCore.validatePdModule(mod);
    expect(v.ok, v.error).toBe(true);
    expect(PdCore.auditAccessibilityReadiness(v.module).status).toBe('ready-for-render-audit');
  });
  it('every guide has a lesson with its WCAG links (or note) and practice questions keyed to its answers', () => {
    const acts = mod.sections.flatMap((s) => s.activities);
    for (const g of G.guides) {
      const lesson = acts.find((a) => a.id === 'learn-' + g.id);
      expect(lesson, g.id).toBeTruthy();
      expect(lesson.content.body.includes(g.checkerCannot) && lesson.content.body.includes(g.question), g.id).toBe(true);
      if (g.wcagRefs.length) expect(lesson.content.links.map((l) => l.url), g.id).toEqual(g.wcagRefs.map((r) => r.url));
      else expect(lesson.content.body.endsWith(g.wcagNote), g.id).toBe(true);
      const qs = acts.filter((a) => a.type === 'quiz').flatMap((a) => a.content.questions);
      for (const p of g.practice) {
        const q = qs.find((x) => x.prompt === p.scenario + ' ' + g.question);
        expect(q, g.id + ': ' + p.scenario).toBeTruthy();
        expect(q.options[q.correctIndex]).toBe(g.options.find((o) => o.id === p.answer).label);
        expect(q.options).not.toContain('Not sure');
        expect(q.explanation).toBe(p.why);
      }
    }
  });
  it('every theme is gated by its practice quiz, and the manifest binds this exact content', () => {
    const themed = mod.sections.slice(1, -1);
    expect(themed.length).toBe(Builder.THEMES.length);
    for (const s of themed) {
      const last = s.activities[s.activities.length - 1];
      expect(last.type).toBe('quiz');
      expect(last.gate).toEqual({ kind: 'score', threshold: 0.75 });
    }
    const index = JSON.parse(readFileSync(resolve(process.cwd(), 'catalog/pd/index.json'), 'utf8'));
    const entry = index.entries.find((e) => e.moduleId === Builder.ID);
    expect(entry.contentDigest).toBe(PdCore.moduleContentDigest(PdCore.validatePdModule(mod).module));
  });
  it('the builder refuses when a guide is left out of the themes', () => {
    const saved = Builder.THEMES[0].guides.slice();
    Builder.THEMES[0].guides.pop();
    try { expect(() => Builder.build()).toThrow(/missing link-wording/); } finally { Builder.THEMES[0].guides.splice(0, Infinity, ...saved); }
  });
});
