// Placeholder names and Vision alts (2026-10-16). Two defects from the pipeline review:
//  1. Vision's image description was thrown away whenever the pipeline's own placeholder
//     ("Image (needs description)") was already there: _applyImageIntel only replaced a bare
//     word such as "image".
//  2. Placeholder names the automated checkers pass ("Button", "Field 3", "Data table 2",
//     <title>Document</title>, placeholder alts) cost almost nothing, so a document full of
//     them scored near target. The name check now turns them into audit issues under the
//     shared rubric weights, and the distribution verdict names them.
// Everything here runs the BUILT module (loadAlloModule), not a copy of the code.
import { describe, it, expect, beforeAll } from 'vitest';
import { loadAlloModule } from './setup.js';

let DP, pipeline;
const PASSES = ['Headings are nested in order', 'Lists use list markup', 'Document language is set', 'Title is present', 'Main landmark is present'];
const cleanReply = JSON.stringify({ score: 100, summary: 'The document is well structured.', issues: [], passes: PASSES });
const make = (callGemini) => DP({
  callGemini, callGeminiVision: async () => '{}', callImagen: async () => null,
  addToast: () => {}, t: (k) => k, isRtlLang: () => false,
  updateExportPreview: () => {}, getDefaultTitle: () => 'Document', state: {},
});
const PNG = 'data:image/png;base64,iVBORw0KGgo=';

beforeAll(() => {
  loadAlloModule('doc_pipeline_module.js');
  DP = window.AlloModules.createDocPipeline;
  expect(typeof DP.scanNameQuality).toBe('function');
  expect(typeof DP.mergeNameQualityIssues).toBe('function');
  pipeline = make(async () => cleanReply);
});

const count = (report, rule) => {
  const c = report && report.categories.find((x) => x.ruleId === rule);
  return c ? c.count : 0;
};

describe('scanNameQuality — what counts as a placeholder name', () => {
  const BAD = '<html><head><title>Document</title></head><body><main>'
    + '<button aria-label="Button"><svg></svg></button>'
    + '<button>Button (unlabeled — needs review)</button>'
    + '<a href="/x" aria-label="Link"><svg></svg></a>'
    + '<label for="f1" class="sr-only">Field 1</label><input id="f1" type="text">'
    + '<label for="f2">Text field</label><input id="f2">'
    + '<table><caption class="sr-only">Data table 1</caption><tr><th scope="col">A</th></tr><tr><td>1</td></tr></table>'
    + '<img src="' + PNG + '" alt="Image (needs description)">'
    + '<img src="' + PNG + '" alt="IMG_0417.jpg">'
    + '</main></body></html>';

  it('flags each placeholder under its audit rule', () => {
    const r = DP.scanNameQuality(BAD);
    expect(count(r, 'image-alt')).toBe(2);
    expect(count(r, 'button-label')).toBe(2);
    expect(count(r, 'link-text')).toBe(1);
    expect(count(r, 'form-label')).toBe(2);
    expect(count(r, 'table-caption')).toBe(1);
    expect(count(r, 'document-title')).toBe(1);
    expect(r.total).toBe(9);
  });

  it('does NOT flag real names, decorative images, hidden controls or authored captions', () => {
    const GOOD = '<html><head><title>Field Trip Permission Form</title></head><body><main>'
      + '<button aria-label="Close dialog">x</button><button>Submit</button>'
      + '<button title="Print"><svg></svg></button>'
      + '<a href="/r">Download the report</a>'
      + '<label for="n">Student name</label><input id="n">'
      + '<label>Parent email <input type="email"></label>'
      + '<input type="hidden" name="x"><input type="submit" value="Send">'
      + '<table><caption>Table 1: Reading scores by grade</caption><tr><th scope="col">A</th></tr><tr><td>1</td></tr></table>'
      + '<img src="' + PNG + '" alt="">'
      + '<img src="' + PNG + '" alt="pH scale">'
      + '<div aria-hidden="true"><button aria-label="Button"></button></div>'
      + '</main></body></html>';
    expect(DP.scanNameQuality(GOOD).total).toBe(0);
  });

  it('skips images still waiting for Vision unless asked, including through a wrapping link', () => {
    const html = '<main><img src="__ALLOFLOW_DATAURL_FINAL_0__" alt="Image (needs description)">'
      + '<a href="/a"><img src="__ALLOFLOW_DATAURL_FINAL_1__" alt="Image (needs description)"></a></main>';
    expect(DP.scanNameQuality(html).total).toBe(0);
    expect(count(DP.scanNameQuality(html, { includeDeferredImages: true }), 'image-alt')).toBe(2);
  });
});

describe('mergeNameQualityIssues — rubric issues the score and state can see', () => {
  const fortyImages = '<main>' + Array.from({ length: 40 }, () => '<img src="' + PNG + '" alt="Image (needs description)">').join('') + '</main>';

  it('forty placeholder alts now cost the critical image-alt weight, not ~6 points', () => {
    const m = DP.mergeNameQualityIssues([], fortyImages);
    expect(m.added).toHaveLength(1);
    const issue = m.added[0];
    expect(issue).toMatchObject({ ruleId: 'image-alt', severity: 'critical', claimKind: 'quality', count: 40, source: 'name-scan', wcag: '1.1.1' });
    expect(issue.issue).toContain("Found by AlloFlow's name check");
    expect(m.deduction).toBe(DP.weightedDeductions(m.added));
    expect(m.deduction).toBe(45); // 15 x the 3x repeat cap
  });

  it('never double-counts a rule the audit already carries, and re-merging adds nothing', () => {
    const html = '<main><button aria-label="Button"></button><label for="f">Field 2</label><input id="f"></main>';
    const ai = [{ ruleId: 'button-label', severity: 'minor', claimKind: 'quality', count: 1, issue: 'icon button unnamed' }];
    const m = DP.mergeNameQualityIssues(ai, html);
    expect(m.added.map((i) => i.ruleId)).toEqual(['form-label']);
    expect(DP.mergeNameQualityIssues(m.issues, html).added).toHaveLength(0);
  });

  it('opts.rules limits what is merged', () => {
    const html = '<main><button aria-label="Button"></button><img src="' + PNG + '" alt="Image (needs description)"></main>';
    expect(DP.mergeNameQualityIssues([], html, { rules: ['image-alt'] }).added.map((i) => i.ruleId)).toEqual(['image-alt']);
  });
});

describe('the output audit carries the name check into its score', () => {
  const page = (body) => '<html lang="en"><head><title>Quarterly report</title></head><body><main><h1>Quarterly report</h1><p>Body text for the report.</p>' + body + '</main></body></html>';

  it('a clean AI reply still loses the rubric weight for placeholder names', async () => {
    const a = await pipeline.auditOutputAccessibility(page('<button aria-label="Button"></button><label for="f">Field 1</label><input id="f">'));
    const added = a.issues.filter((i) => i.source === 'name-scan').map((i) => i.ruleId).sort();
    expect(added).toEqual(['button-label', 'form-label']);
    expect(a.score).toBe(100 - 2 - 10); // minor + serious, from the shared weights
  }, 60000);

  it('the chunked path (long documents) merges once over the whole document', async () => {
    const para = '<p>' + 'Reading scores rose in every grade this quarter. '.repeat(8) + '</p>';
    const longPage = page(para.repeat(120) + '<button aria-label="Button"></button>');
    expect(longPage.length).toBeGreaterThan(16000 * 2); // several audit chunks
    const a = await make(async () => cleanReply).auditOutputAccessibility(longPage);
    expect(a.issues.filter((i) => i.source === 'name-scan').map((i) => i.ruleId)).toEqual(['button-label']);
    expect(a.score).toBe(98);
  }, 60000);

  it('does not count an image still waiting for Vision, but does count a real one', async () => {
    const deferred = await pipeline.auditOutputAccessibility(page('<img src="__ALLOFLOW_DATAURL_FINAL_0__" alt="Image (needs description)">'));
    expect(deferred.issues.some((i) => i.source === 'name-scan')).toBe(false);
    const real = await pipeline.auditOutputAccessibility(page('<img src="' + PNG + '" alt="Image (needs description)">'));
    expect(real.issues.filter((i) => i.source === 'name-scan').map((i) => i.ruleId)).toEqual(['image-alt']);
    expect(real.score).toBe(85);
  }, 60000);
});

describe('_applyImageIntel — Vision replaces the pipeline\'s own placeholders', () => {
  const apply = (alt, parsed) => {
    const doc = new DOMParser().parseFromString('<p><img src="' + PNG + '" alt="' + alt + '"></p>', 'text/html');
    const im = doc.querySelector('img');
    pipeline._applyImageIntel(doc, im, parsed);
    return im;
  };
  const photo = { kind: 'photo', alt: 'A red barn in a snowy field' };

  it('replaces "Image (needs description)" and the auto-named variant', () => {
    expect(apply('Image (needs description)', photo).getAttribute('alt')).toBe(photo.alt);
    expect(apply('Image: worksheet (auto-named — needs description)', photo).getAttribute('alt')).toBe(photo.alt);
  });
  it('replaces boilerplate and filename alts too', () => {
    expect(apply('Picture', photo).getAttribute('alt')).toBe(photo.alt);
    expect(apply('IMG_0417.jpg', photo).getAttribute('alt')).toBe(photo.alt);
  });
  it('never overwrites a short-but-real or authored description', () => {
    expect(apply('pH scale', photo).getAttribute('alt')).toBe('pH scale');
    expect(apply('Figure 3: Photosynthesis process', photo).getAttribute('alt')).toBe('Figure 3: Photosynthesis process');
  });
  it('marks a decorative image that only had a placeholder as decorative', () => {
    const im = apply('Image (needs description)', { kind: 'decorative', alt: '' });
    expect(im.getAttribute('alt')).toBe('');
    expect(im.getAttribute('role')).toBe('presentation');
  });
});

describe('distribution verdict names the placeholders', () => {
  it('adds a review bullet listing what to replace', () => {
    const issues = DP.mergeNameQualityIssues([], '<main><button aria-label="Button"></button><button aria-label="Btn"></button><table><caption>Data table 1</caption><tr><td>1</td></tr></table></main>').issues;
    const v = pipeline.distributionVerdict({
      verificationState: 'review-required', verificationAudit: { issues }, afterScore: 90,
      axeAudit: { totalViolations: 0 }, secondEngineAudit: { failViolations: 0 },
    });
    expect(v.level).toBe('review');
    expect(v.review.join(' | ')).toContain('placeholder text stands in for 2 button names, 1 table caption');
  });
  it('says nothing about placeholders when there are none', () => {
    const v = pipeline.distributionVerdict({
      verificationState: 'complete', verificationAudit: { issues: [] }, afterScore: 98,
      axeAudit: { totalViolations: 0 }, secondEngineAudit: { failViolations: 0 },
    });
    expect(v.review.join(' ')).not.toContain('placeholder text');
  });
});
