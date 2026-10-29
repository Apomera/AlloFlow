// Reading order: REGROUPED passages vs SCRAMBLED text (2026-10-28, child-find). The whole-document
// order ratio cannot tell a two-column form regrouped by section (every passage intact, only their
// arrangement differs) from text whose words were shuffled. Regrouped is a caution (skim the order);
// anything else under the threshold stays a review item. Runs the real source code, sliced out.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

// The env overrides point the test at a private copy for mutation checks; the shared files are never written.
const PIPE = readFileSync(process.env.ALLO_PIPELINE_SOURCE || resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const VIEW = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');
const F = { file: 'doc_pipeline_source.jsx' };
const code = sliceBetween(PIPE, 'function readingOrderSequenceRatio(textA, textB) {', '// ── Background-tab guard', F);
const { ratio, shape, regrouped } = new Function(code + '\nreturn { ratio: readingOrderSequenceRatio, shape: _alloReadingOrderShape, regrouped: _alloReadingOrderRegrouped };')();

// A two-column intake form: the source text reads row by row across both columns.
const INTRO = 'Please complete every part of this intake form before your first meeting with our screening team';
const LEFT = ['Child information section', 'Full legal name of the child', 'Date of birth and current age', 'Primary language spoken at home', 'Current school or childcare program'];
const RIGHT = ['Parent guardian section', 'Full legal name of the parent', 'Best telephone number to reach you', 'Mailing address including the town', 'Preferred way to receive our letters'];
const CLOSE = 'Return the signed form to the regional office by mail or bring it with you to the appointment';
const SRC = [INTRO, ...LEFT.flatMap((l, i) => [l, RIGHT[i]]), CLOSE].join('\n');
const html = (blocks) => '<main>' + blocks.map((b) => '<p>' + b + '</p>').join('') + '</main>';
const plain = (h) => h.replace(/<[^>]+>/g, ' ');
const BY_SECTION = html([INTRO, ...LEFT, ...RIGHT, CLOSE]);

describe('regrouped passages are told apart from scrambled text', () => {
  it('a two-column form regrouped by section: low whole-document ratio, every passage in order inside', () => {
    const r = ratio(SRC, plain(BY_SECTION));
    expect(r).toBeGreaterThanOrEqual(0.5);
    expect(r).toBeLessThan(0.8);
    const s = shape(SRC, BY_SECTION);
    expect(s.intra).toBe(1);
    expect(s.blocks).toBe(10); // the two 3-word section titles carry no order evidence
    expect(s.evidence).toBeGreaterThan(0.85);
    expect(regrouped(r, s)).toBe(true);
  });
  it('the same passages with their words out of order are not "regrouped"', () => {
    const scrambled = html([INTRO, ...LEFT, ...RIGHT, CLOSE].map((b) => b.split(' ').reverse().join(' ')));
    const r = ratio(SRC, plain(scrambled));
    const s = shape(SRC, scrambled);
    expect(r).toBeLessThan(0.8);
    expect(s.intra).toBeLessThan(0.5);
    expect(regrouped(r, s)).toBe(false);
  });
  it('one passage scrambled among intact ones is enough to keep it a review item', () => {
    const blocks = [INTRO, ...LEFT, ...RIGHT, CLOSE];
    blocks[0] = INTRO.split(' ').reverse().join(' ');
    const h = html(blocks);
    expect(shape(SRC, h).intra).toBeLessThan(0.95);
    expect(regrouped(ratio(SRC, plain(h)), shape(SRC, h))).toBe(false);
  });
  it('more than half the wording out of sequence is not regrouping, however intact the passages are', () => {
    const passages = Array.from({ length: 10 }, (_, k) => Array.from({ length: 6 }, (__, j) => 'p' + k + 'w' + j).join(' '));
    const h = html(passages.slice().reverse());
    const r = ratio(passages.join('\n'), plain(h));
    const s = shape(passages.join('\n'), h);
    expect(s.intra).toBe(1);
    expect(r).toBeLessThan(0.5);
    expect(regrouped(r, s)).toBe(false);
  });
  it('no order evidence (only short labels) is not "regrouped"', () => {
    const src = 'Name Phone Town Grade\nAge School Email Notes';
    const h = html(['Name', 'Age', 'Phone', 'School', 'Town', 'Email', 'Grade', 'Notes']);
    const s = shape(src, h);
    expect(s.blocks).toBe(0);
    expect(regrouped(0.6, s)).toBe(false);
  });
  it('the image description repeated in a caption (aria-hidden copy of the alt) is not source text and is not measured', () => {
    // An AI-written description that happens to use the form's words in its own order.
    const cap = 'Logo of the screening team above the regional office address and the intake telephone number';
    const h = BY_SECTION.replace('</main>', '<figure><figcaption><span aria-hidden="true">' + cap + '</span></figcaption></figure></main>');
    expect(shape(SRC, h).intra).toBe(1);
    expect(shape(SRC, h.replace(' aria-hidden="true"', '')).intra).toBeLessThan(1);
  });
  it('a ratio at or above the threshold is not this note (nothing to explain)', () => {
    expect(regrouped(0.8, { intra: 1, blocks: 12, evidence: 1 })).toBe(false);
    expect(regrouped(0.79, { intra: 1, blocks: 3, evidence: 0.25 })).toBe(true);
    expect(regrouped(0.79, { intra: 1, blocks: 2, evidence: 1 })).toBe(false);
    expect(regrouped(0.79, { intra: 1, blocks: 12, evidence: 0.2 })).toBe(false);
    expect(regrouped(0.79, { intra: 0.94, blocks: 12, evidence: 1 })).toBe(false);
  });
});

// Real verdict function + real policy modules (same extraction as remediation_open_items_1026.test.js).
const policyWindow = { AlloModules: {} };
for (const name of ['accessibility_evidence_module.js', 'verification_policy_module.js']) {
  new Function('window', readFileSync(resolve(process.cwd(), name), 'utf8'))(policyWindow);
}
const verdictStart = PIPE.indexOf('function _alloDistributionVerdict(r, opts) {');
const verdictFn = new Function('window', 'var PIPELINE_DEFAULTS = { targetScore: 95 };\n'
  + sliceBetween(PIPE, 'function _alloDeriveVerificationState(input) {', '\n}', { ...F, includeEnd: true }) + '\n'
  + PIPE.slice(verdictStart, PIPE.indexOf('\n}', PIPE.indexOf('headline: level ===', verdictStart)) + 2)
  + '\nreturn _alloDistributionVerdict;')(policyWindow);

describe('the verdict', () => {
  const clean = (notes) => ({
    afterScore: 98, axeAudit: { score: 100, totalViolations: 0, totalIncomplete: 0 }, integrityCoverage: 100, fidelityNotes: notes,
    secondEngineAudit: { score: 100, failViolations: 0, potentialViolations: 0, manualViolations: 0, potentialFindings: [], manualFindings: [] },
  });
  it('a regrouped document is ready to hand out with a caution that says what to skim', () => {
    const v = verdictFn(clean([{ kind: 'sourceReadingOrderRegrouped', caution: true, msg: 'm' }]), { targetScore: 95 });
    expect(v.level).toBe('caution');
    expect(v.review).toEqual([]);
    expect(v.cautions.join(' | ')).toContain('the passages are arranged in a different order from the source, but each one reads in its original order');
  });
  it('a scrambled document still needs a person', () => {
    const v = verdictFn(clean([{ kind: 'sourceReadingOrder', msg: 'm' }]), { targetScore: 95 });
    expect(v.level).toBe('review');
    expect(v.review.join(' | ')).toContain('noticeably different order');
  });
});

describe('wiring', () => {
  it('the reading-order check raises the caution only for regrouped passages, the review note otherwise', () => {
    const site = sliceBetween(PIPE, 'const _orderRatio = readingOrderSequenceRatio(_srcRaw, _outPlainOrder);', "warnLog('[Integrity] READING-ORDER — ratio", F);
    expect(site).toContain('_alloReadingOrderShape(_srcRaw, _finalForIntegrity)');
    expect(site).toContain('if (_alloReadingOrderRegrouped(_orderRatio, _orderShape)) {');
    expect(site).toContain('} else if (Number.isFinite(_orderRatio) && _orderRatio < 0.80) {');
    // includes(), not toContain(): a failing toContain diffs the whole 2.5 MB source and hangs vitest.
    expect(PIPE.includes("if (_readingOrderRegrouped) _structuralFidelityNotes.push({ kind: 'sourceReadingOrderRegrouped', caution: true, msg: _readingOrderRegrouped });"), 'pinned line missing').toBe(true);
  });
  it('a caution note does not limit fidelity in the primary pass, an accepted round, or the app re-fix', () => {
    expect(PIPE.includes('fidelityLimited: (integrityCoverage != null && integrityCoverage < 90) || _structuralFidelityNotes.some((n) => !(n && n.caution === true)),'), 'pinned line missing').toBe(true);
    expect(PIPE.includes('? ((_roundFid.integrityCoverage != null && _roundFid.integrityCoverage < 90) || _roundNotes.some((n) => !(n && n.caution === true)))'), 'pinned line missing').toBe(true);
    expect(VIEW.includes("const fidelityLimited = _refixNotes.some((n) => !(n && n.caution === true)) || (typeof"), 'pinned line missing').toBe(true);
  });
});
