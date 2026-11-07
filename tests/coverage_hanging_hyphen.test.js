// @vitest-environment jsdom
// fda keyless run (2026-11-05): 2,306 of 2,307 tokens matched, and the tagged PDF was held over one "-": the source's
// "(Birth-11 years)" against the HTML's "(Birth- 11 years)". The hyphen counter only saw a hyphen touching a digit.
// ALLO_NARRATION_MODULE lets a mutation run point at a private copy.
import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const NP = require(process.env.ALLO_NARRATION_MODULE ? resolve(process.env.ALLO_NARRATION_MODULE) : '../desktop/mcp/remediation_narration_plan.cjs');
const page = (b) => '<!doctype html><html lang="en"><head><title>t</title></head><body><main>' + b + '</main></body></html>';
const cov = (src, out) => NP.assessSourceCoverage({ sourceText: src, outputHtml: page('<p>' + out + '</p>'), pages: [{ pageNum: 1, text: src }], method: 'pdfjs', pageErrors: [], lowConfidencePages: [] });
const BASE = 'We are deferring pediatric studies for this application today and later ';

describe('a hyphen left hanging before a number', () => {
  it('is the same hyphen on either side', () => {
    expect(cov(BASE + '(Birth-11 years).', BASE + '(Birth- 11 years).').status).toBe('matched');
    expect(cov(BASE + '(Birth- 11 years).', BASE + '(Birth-11 years).').status).toBe('matched');
    expect(cov(BASE + 'ages 12- 17 only.', BASE + 'ages 12-17 only.').status).toBe('matched');
  });
  it('a wrapped range matches, on two lines in the source', () => {
    expect(cov(BASE + 'ages 1-\n11 years.', BASE + 'ages 1-11 years.').status).toBe('matched');
  });
  it('a hyphen really lost from a number is still flagged', () => {
    const r = cov(BASE + 'call 398-0648 now.', BASE + 'call 398 0648 now.');
    expect(r.status).toBe('review_required');
    expect(r.missingWords).toEqual([expect.objectContaining({ word: '-' })]);
  });
  it('a lost word or a changed number is still flagged', () => {
    expect(cov(BASE + '(Birth-11 years).', BASE + '(Birth- 12 years).').status).toBe('review_required');
    expect(cov(BASE + 'ages 12-17 only.', BASE + 'ages 12- only.').status).toBe('review_required');
  });
  it('a dash standing apart, in prose, is not joined to anything', () => {
    expect(cov(BASE + 'Section - 11 applies.', BASE + 'Section - 11 applies.').status).toBe('matched');
  });
});

// (2026-11-05, MSAD 35 agenda) "Vote: Yea- Nay- 2. Election" is not a hanging hyphen: "2." is the next item's number. Joining
// them added "-" tokens and shifted the positions the list-marker credit uses, so 61 printed numbers and dashes read as
// missing and a clean agenda was held.
describe('a hyphen before a list marker', () => {
  const ITEMS = ['Election of Secretary and Clerk of the Board. Vote: Yea- Nay-', 'Election of Chair for the coming year. Vote: Yea- Nay-', 'Report of the Superintendent to the Board. Vote: Yea- Nay-', 'Approve the minutes of the June meeting. Vote: Yea- Nay-'];
  const SRC = ITEMS.map((t, i) => (i + 1) + '. ' + t).join(' ') + ' Adjournment';
  const run = (src, html) => NP.assessSourceCoverage({ sourceText: src, outputHtml: page(html), pages: [{ pageNum: 1, text: src }], method: 'pdfjs', pageErrors: [], lowConfidencePages: [] });
  const OL = '<ol>' + ITEMS.map((t) => '<li>' + t + '</li>').join('') + '</ol><p>Adjournment</p>';
  it('leaves the marker to the list, and nothing is missing', () => {
    const r = run(SRC, OL);
    expect(r.missingWords).toEqual([]);
    expect(r.status).toBe('matched');
  });
  it('the same on separate lines, and past ten items', () => {
    const many = Array.from({ length: 14 }, (_, i) => 'Agenda item number word' + i + ' for the board. Vote: Yea- Nay-');
    const r = run(many.map((t, i) => (i + 1) + '. ' + t).join('\n'), '<ol>' + many.map((t) => '<li>' + t + '</li>').join('') + '</ol>');
    expect(r.missingWords).toEqual([]);
  });
  it('a closing bracket marker counts as a marker too', () => {
    const r = run('1) First point of order here. Yea- 2) Second point of order here.', '<ol><li>First point of order here. Yea-</li><li>Second point of order here.</li></ol>');
    expect(r.missingWords).toEqual([]);
  });
  it('a number that ends a sentence after a hanging hyphen stays as printed', () => {
    expect(cov(BASE + 'ages 12- 17. Then more words.', BASE + 'ages 12- 17. Then more words.').status).toBe('matched');
  });
  it('a real lost number in a list is still flagged', () => {
    const r = run(SRC.replace('Adjournment', 'Adjournment at 9:45'), OL);
    expect(r.status).toBe('review_required');
  });
});
