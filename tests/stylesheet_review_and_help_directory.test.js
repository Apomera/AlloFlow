// Stylesheet-wide Equal Access prompts + the neutral expert-help directory (2026-10-16).
//  - IBM Equal Access raises style_highcontrast_visible on ANY <style> and style_color_misuse on
//    any colour rule, once per document, so no remediated document could reach "complete".
//    (A) the pipeline answers the high-contrast prompt with a stylesheet check; (B) a person can
//    confirm either prompt for ONE exact document (SHA-256 of the chrome-stripped html), which
//    then counts toward verification. Answered/confirmed findings are disclosed, never dropped.
//  - The Knowbility "Accessibility Partner" panels (no partnership exists; they also claimed a
//    document-remediation service Knowbility does not list, and carried utm referral tags) are
//    replaced by a neutral directory checked on 2026-10-16.
// Runs the BUILT modules (and the real verification-policy modules for the state check).
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import { React, ReactDOMServer } from './helpers/stem_widgets_smoke_harness.js';

let DP;
const read = (f) => readFileSync(resolve(process.cwd(), f), 'utf8');
beforeAll(() => {
  loadAlloModule('accessibility_evidence_module.js');
  loadAlloModule('verification_policy_module.js');
  loadAlloModule('doc_pipeline_module.js');
  DP = window.AlloModules.createDocPipeline;
});

const ALLOFLOW_CSS = '<style>/* a11y-focus-visible */a:focus-visible{outline:2px solid #fff}</style>'
  + '<style>body{font-family:Georgia;color:#1e293b}.row{display:flex;justify-content:center;align-content:center}</style>';
const doc = (head, body) => '<!DOCTYPE html><html lang="en"><head><title>Letter</title>' + head + '</head><body><main><h1>Letter</h1><p>' + (body || 'School starts Monday.') + '</p></main></body></html>';
const sheetEa = () => ({
  engine: 'IBM Equal Access', failViolations: 0, potentialViolations: 1, manualViolations: 1, reviewFindingCount: 2,
  potentialFindings: [{ id: 'style_color_misuse', nodes: 1, description: 'Verify color is not used as the only visual means of conveying information' }],
  manualFindings: [{ id: 'style_highcontrast_visible', nodes: 1, description: 'Confirm Windows high contrast mode is supported' }],
  fails: [], score: 96, manualReviewRequired: true, verificationStatus: 'complete-with-review',
});

describe('(A) the high-contrast stylesheet check', () => {
  it('passes typical AlloFlow CSS (justify-content/align-content are not "content")', () => {
    expect(DP.highContrastCssCheck(doc(ALLOFLOW_CSS))).toEqual({ ok: true, reasons: [] });
  });
  it('fails, with a reason, on CSS that inserts text, CSS images, a forced-colour opt-out, or an external sheet', () => {
    const cases = [
      ['<style>li::before{content:"★"}</style>', /inserts text/],
      ['<style>.hero{background-image:url(x.png)}</style>', /CSS images/],
      ['<style>.chart{forced-color-adjust:none}</style>', /opts out/],
      ['<link rel="stylesheet" href="site.css">', /external stylesheet/],
    ];
    for (const [head, re] of cases) {
      const r = DP.highContrastCssCheck(doc(head));
      expect(r.ok, head).toBe(false);
      expect(r.reasons.join(' '), head).toMatch(re);
    }
  });
  it('ignores empty generated content and @font-face urls', () => {
    expect(DP.highContrastCssCheck(doc('<style>.x::after{content:""}@font-face{font-family:A;src:url(a.woff2)}</style>')).ok).toBe(true);
  });
});

describe('(A+B) applyStylesheetReview moves settled prompts out of review', () => {
  it('the check answers high contrast; colour stays for a person', () => {
    const ea = DP.applyStylesheetReview(sheetEa(), { check: { ok: true, reasons: [] } });
    expect(ea.manualFindings).toHaveLength(0);
    expect(ea.answeredByCheck.map((f) => f.id)).toEqual(['style_highcontrast_visible']);
    expect(ea.potentialFindings.map((f) => f.id)).toEqual(['style_color_misuse']);
    expect(ea.reviewFindingCount).toBe(1);
    expect(ea.score).toBe(98);
  });
  it('a sign-off moves colour to confirmedByPerson and completes the Equal Access evidence', () => {
    const ea = DP.applyStylesheetReview(sheetEa(), { check: { ok: true, reasons: [] }, signoffs: { style_color_misuse: 1760000000000 }, digest: 'a'.repeat(64) });
    expect(ea.confirmedByPerson).toEqual([expect.objectContaining({ id: 'style_color_misuse', bucket: 'potential', confirmedAt: 1760000000000 })]);
    expect(ea.reviewFindingCount).toBe(0);
    expect(ea.verificationStatus).toBe('complete');
    expect(ea.score).toBe(100);
  });
  it('withdrawing the sign-off puts the finding back where it came from', () => {
    const confirmed = DP.applyStylesheetReview(sheetEa(), { check: { ok: true, reasons: [] }, signoffs: { style_color_misuse: 1 } });
    const back = DP.applyStylesheetReview(confirmed, { signoffs: {} });
    expect(back.confirmedByPerson).toHaveLength(0);
    expect(back.potentialFindings.map((f) => f.id)).toEqual(['style_color_misuse']);
    expect(back.reviewFindingCount).toBe(1);
  });
  it('when the check cannot answer, the finding stays and says why', () => {
    const ea = DP.applyStylesheetReview(sheetEa(), { check: { ok: false, reasons: ['CSS images (url())'] } });
    expect(ea.manualFindings[0].checkReasons).toEqual(['CSS images (url())']);
    expect(ea.reviewFindingCount).toBe(2);
  });
});

describe('the canonical verification policy now reaches "complete"', () => {
  const state = (ea) => DP.deriveVerificationState({
    // Same evidence shape as tests/doc_pipeline_verification_state.test.js completeEvidence().
    ai: { score: 98, issues: [] },
    axe: { score: 100, totalViolations: 0, totalIncomplete: 0 },
    equalAccess: ea,
  }).verificationState;
  it('stylesheet prompts alone hold a document at review-required; settled, it is complete', () => {
    expect(state(sheetEa())).toBe('review-required');
    expect(state(DP.applyStylesheetReview(sheetEa(), { check: { ok: true, reasons: [] }, signoffs: { style_color_misuse: 1 } }))).toBe('complete');
  });
});

describe('(B) the sign-off is bound to ONE exact document', () => {
  it('raw html and its chrome-stripped form share a fingerprint; any text change does not', async () => {
    const html = doc(ALLOFLOW_CSS);
    const a = await DP.confirmStylesheetReview(html, ['style_color_misuse']);
    expect(a && /^[0-9a-f]{64}$/.test(a.digest)).toBe(true);
    const again = await DP.confirmStylesheetReview(html, ['style_color_misuse']);
    expect(again.digest).toBe(a.digest);
    const edited = await DP.confirmStylesheetReview(doc(ALLOFLOW_CSS, 'School starts Tuesday.'), ['style_color_misuse'], false);
    expect(edited.digest).not.toBe(a.digest);
    expect(a.list).toEqual([expect.objectContaining({ digest: a.digest, ruleId: 'style_color_misuse' })]);
  });
  it('only the two stylesheet rules can be signed off', async () => {
    const r = await DP.confirmStylesheetReview(doc(''), ['image_alt_exists', 'style_highcontrast_visible']);
    expect(Object.keys(r.signoffs)).toEqual(['style_highcontrast_visible']);
  });
});

describe('neutral expert-help directory', () => {
  const ui = JSON.parse(read('ui_strings.js'));
  it('lists checked organizations with plain https links and no tracking', () => {
    const entries = DP.helpDirectory.groups.flatMap((g) => g.entries);
    expect(entries.length).toBe(20);
    for (const e of entries) {
      expect(e.url, e.id).toMatch(/^https:\/\//);
      expect(e.url, e.id).not.toMatch(/utm_|[?&]ref=|referral/i);
    }
    expect(entries.map((e) => e.id)).not.toContain('diagram');
  });
  it('sorts by name within a group so order implies no ranking', () => {
    const names = DP.helpDirectorySorted([{ name: 'Level Access' }, { name: 'Allyant (CommonLook)' }, { name: 'Equidox' }]).map((e) => e.name);
    expect(names).toEqual(['Allyant (CommonLook)', 'Equidox', 'Level Access']);
  });
  it('every entry has a ui_strings description that matches the report text', () => {
    for (const g of DP.helpDirectory.groups) {
      expect(ui.pdf_audit.help_directory['group_' + g.id]).toBe(g.title);
      for (const e of g.entries) expect(ui.pdf_audit.help_directory[e.id + '_desc'], e.id).toBe(e.desc);
    }
  });
  it('the report block carries the directory and the no-partnership disclaimer', () => {
    const html = DP.helpDirectoryHtml();
    expect(html).toContain('Where to get expert help');
    expect(html).toContain('no partnership with, payment from, or endorsement of any of them');
  });
  it('no "Accessibility Partner" claim or referral tag remains in the app or the reports', () => {
    for (const f of ['view_pdf_audit_source.jsx', 'view_pdf_audit_module.js', 'doc_pipeline_source.jsx', 'doc_pipeline_module.js']) {
      const s = read(f);
      expect(s.includes("t('pdf_audit.knowbility.partner_badge')"), f).toBe(false);
      expect(/utm_source=alloflow/.test(s), f).toBe(false);
      expect(/such as <a href="https:\/\/knowbility/.test(s), f).toBe(false);
    }
  });
  it('the view component renders the grouped, name-sorted list with accessible new-tab links', () => {
    // Slice the COMPILED component from the built view module (esbuild cannot run under jsdom,
    // and this is the code that ships).
    const built = read('view_pdf_audit_module.js');
    const s = built.indexOf('function _helpDirectoryDescs(t) {');
    const e = built.indexOf('function buildPdfPipelineTourSteps(', s);
    expect(s > 0 && e > s).toBe(true);
    const AlloHelpDirectory = new Function('React', built.slice(s, e) + '\nreturn AlloHelpDirectory;')(React);
    const t = (key) => key.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), ui) || '';
    const html = ReactDOMServer.renderToStaticMarkup(React.createElement(AlloHelpDirectory, { t, idBase: 'probe' }));
    const doc = new DOMParser().parseFromString(html, 'text/html');
    expect(doc.querySelector('section').getAttribute('aria-labelledby')).toBe('probe-h');
    expect(doc.getElementById('probe-h').textContent).toBe('Where to get expert help');
    expect(Array.from(doc.querySelectorAll('h5')).map((h) => h.textContent)).toEqual(DP.helpDirectory.groups.map((g) => g.title));
    const links = Array.from(doc.querySelectorAll('a'));
    expect(links).toHaveLength(20);
    for (const a of links) {
      expect(a.getAttribute('target')).toBe('_blank');
      expect(a.getAttribute('rel')).toBe('noopener noreferrer');
      expect(a.querySelector('.sr-only').textContent).toContain('(opens in a new tab)');
    }
    doc.querySelectorAll('ul').forEach((ul) => {
      const names = Array.from(ul.querySelectorAll('a')).map((a) => a.firstChild.textContent);
      expect(names).toEqual(names.slice().sort((x, y) => x.localeCompare(y, 'en', { sensitivity: 'base' })));
    });
    expect(doc.body.textContent).toContain('no partnership with, payment from, or endorsement');
    expect(doc.body.textContent).not.toMatch(/Accessibility Partner/);
  });
  it('all 63 language packs (and their public mirror) carry real translations, not English filler', () => {
    const packs = readdirSync(resolve(process.cwd(), 'lang')).filter((f) => f.endsWith('.js'));
    expect(packs.length).toBe(63);
    for (const f of packs) {
      for (const dir of ['lang', 'desktop/web-app/public/lang']) {
        const pack = JSON.parse(read(dir + '/' + f));
        for (const ns of ['help_directory', 'sheet_review']) {
          const en = ui.pdf_audit[ns], tr = pack.pdf_audit && pack.pdf_audit[ns];
          expect(tr && typeof tr, dir + '/' + f + ' ' + ns).toBe('object');
          const keys = Object.keys(en);
          expect(keys.filter((k) => !tr[k]), dir + '/' + f + ' missing').toEqual([]);
          expect(keys.filter((k) => tr[k] === en[k]), dir + '/' + f + ' English filler').toEqual([]);
          for (const k of keys) for (const ph of en[k].match(/\{[a-z]+\}/g) || []) expect(tr[k], f + ' ' + k).toContain(ph);
        }
      }
    }
  }, 120000); // parses 126 multi-megabyte pack files
  it('every help_directory / sheet_review key the view uses exists, with the same English text', () => {
    const view = read('view_pdf_audit_source.jsx');
    const used = [...view.matchAll(/t\('pdf_audit\.(help_directory|sheet_review)\.([a-z0-9_]+)'\)(?:\s*\|\|\s*'((?:[^'\\]|\\.)*)')?/g)];
    expect(used.length).toBeGreaterThan(30);
    for (const [, ns, key, fallback] of used) {
      expect(ui.pdf_audit[ns][key], ns + '.' + key).toBeTruthy();
      if (fallback) expect(ui.pdf_audit[ns][key], ns + '.' + key).toBe(fallback.replace(/\\'/g, "'"));
    }
  });
});
