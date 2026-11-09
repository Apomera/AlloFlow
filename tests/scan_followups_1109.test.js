// Follow-ups from the garden newsletter scan replays (2026-11-09). Each runs the real code, sliced from the source:
//  - a "no caption" AI finding the heading step already settled is not sent to the fixer again;
//  - a scan whose two readings disagreed says so in the report (it was only in the log);
//  - a finding a person reads is cut at a word, not mid-word ("...truncated pa").
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

const requireCjs = createRequire(import.meta.url);
const SRC = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const FILE = { file: 'doc_pipeline_source.jsx' };
const settled = new Function(sliceBetween(SRC, 'function _alloCaptionIssueSettled(issue, html) {', '\n}', FILE) + '\n}\nreturn _alloCaptionIssueSettled;')();
const NOTE_BODY = sliceBetween(SRC, '        const _od = (_ocrDisclosuresOn', "      } catch (_) {}\n      // H4 (2026-07-09)", FILE);
const disagreementNotes = (records, on = true) => {
  const notes = [];
  new Function('window', '_ocrDisclosuresOn', '_structuralFidelityNotes', NOTE_BODY)({ __lastOcrDisagreements: records }, on, notes);
  return notes;
};

describe('a "no caption" finding the HTML has since settled', () => {
  const missing = { ruleId: 'table-caption', claimKind: 'absence', issue: 'The harvest table has no <caption> element.' };
  it('is settled once every table has a caption of its own, as the heading step writes it', () => {
    expect(settled(missing, '<h2>Harvest schedule</h2><table><caption class="sr-only">Harvest schedule</caption><tr><td>x</td></tr></table>')).toBe(true);
  });
  it('is not settled while a table still has none, or its caption is empty', () => {
    expect(settled(missing, '<table><tr><td>x</td></tr></table>')).toBe(false);
    expect(settled(missing, '<table><caption> </caption><tr><td>x</td></tr></table>')).toBe(false);
    expect(settled(missing, '<table><caption>A</caption></table><table><tr><td>x</td></tr></table>')).toBe(false);
  });
  it('never settles a complaint about a caption\'s wording, or another rule', () => {
    expect(settled({ ruleId: 'table-caption', claimKind: 'quality', issue: 'The caption repeats a paragraph.' }, '<table><caption>A</caption></table>')).toBe(false);
    expect(settled({ ruleId: 'image-alt', claimKind: 'absence' }, '<table><caption>A</caption></table>')).toBe(false);
  });
  it('is wired into the fix-pass entries next to the title filter', () => {
    expect(SRC).toContain('.filter((i) => !_alloTitleIssueSettled(i, accessibleHtml) && !_alloCaptionIssueSettled(i, accessibleHtml))');
  });
});

describe('the two readings of a scan disagreed', () => {
  it('a text disagreement is a caution naming the page and the reading used (the garden scan)', () => {
    const [n] = disagreementNotes([{ pageNum: 1, reason: 'text-conflict', selectedSource: 'vision', tesseractChars: 529, visionChars: 690 }]);
    expect(n).toMatchObject({ kind: 'ocrDisagreement', caution: true, pages: [{ page: 1, reason: 'text-conflict', used: 'vision', ocrEngineChars: 529, aiReadingChars: 690 }] });
    expect(n.msg).toBe("The two readings of this scan (the OCR engine and the AI model) did not agree on page 1. The text uses the AI model's reading. Compare that page with the page images.");
  });
  it('a differing number is a review item, numbers first', () => {
    const [n] = disagreementNotes([{ pageNum: 2, reason: 'value-conflict', selectedSource: 'tesseract' }, { pageNum: 5, reason: 'text-conflict', selectedSource: 'vision' }]);
    expect(n.caution).toBe(false);
    expect(n.msg).toMatch(/did not agree on pages 2 and 5, and on 1 of those pages a number differs\. The text uses the more complete reading of each page\. Compare those pages with the page images, numbers first\.$/);
  });
  it('lists at most eight pages and counts the rest; nothing when there is no disagreement or no scan', () => {
    const many = Array.from({ length: 11 }, (_, i) => ({ pageNum: i + 1, reason: 'coverage-conflict', selectedSource: 'vision' }));
    expect(disagreementNotes(many)[0].msg).toMatch(/pages 1, 2, 3, 4, 5, 6, 7 and 8 \(and 3 more\)/);
    expect(disagreementNotes([])).toEqual([]);
    expect(disagreementNotes([{ pageNum: 1, reason: 'text-conflict' }], false)).toEqual([]);
  });
});

describe('a finding a person reads is cut at a word', () => {
  const Verification = requireCjs('../desktop/mcp/remediation_verification.cjs');
  it('ends at a whole word with an ellipsis when longer than 300 characters', () => {
    const long = 'The table caption is a truncated paragraph '.repeat(10);
    const out = Verification.compactVerificationEvidence({ verificationAudit: { issues: [{ issue: long, location: 'table' }] } });
    const issue = out.ai.issues[0].issue;
    expect(issue.length).toBeLessThanOrEqual(300);
    expect(issue.endsWith('…')).toBe(true);
    expect(long.startsWith(issue.slice(0, -1))).toBe(true);
    expect(/\S…$/.test(issue) && long[issue.length - 1] === ' ').toBe(true); // the cut fell at a space
  });
  it('leaves a short finding alone', () => {
    const out = Verification.compactVerificationEvidence({ verificationAudit: { issues: [{ issue: 'Short.', location: 'p' }] } });
    expect(out.ai.issues[0].issue).toBe('Short.');
  });
});
