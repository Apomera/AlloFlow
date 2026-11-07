// Report wording from the 2026-11-05 evening keyless runs.
//  - ballot: "only quick checks are left" while an axe "could not decide" item alone kept the verdict at review, named nowhere.
//  - trust: "findings a person must check" with none listed, and "possible loss" when nothing was missing: 22 OCR words corrected.
import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
const req = createRequire(import.meta.url);
const V = req(join(process.env.ALLO_MCP_DIR || resolve(process.cwd(), 'desktop/mcp'), 'remediation_verification.cjs'));

const GENERIC = 'WCAG verification is review-required; review the engine coverage and unresolved evidence before distribution';
const ballot = (over = {}) => ({
  files: { taggedPdf: 'x.pdf' }, deliveryStatus: 'review-required',
  verdictReasons: { review: [GENERIC], cautions: [] },
  verification: { axe: { totalIncomplete: 1 }, equalAccess: { reviewFindings: [], acknowledgedByAiReview: [{ id: 'text_block_heading', description: "Verify 'Nov 7' is a heading", nodes: 1, reason: 'A date.' }] } },
  reviewTriage: { dispositions: [{ key: 'axe|incomplete|color-contrast', action: 'needs-person', stillFlagged: true, skipReason: 'no-anchor' }] },
  ...over,
});

describe('an open "could not decide" item', () => {
  it('is named, and the headline does not call the rest of the report quick checks', () => {
    const out = V.explainDelivery(ballot());
    expect(out.needsAPerson.join(' ')).toMatch(/contrast check could not decide/);
    expect(out.headline).toBe('Automated checks finished, but some findings need a person to look before sharing.');
    expect(out.quickChecks.length).toBe(1);
  });
  it('another rule is named by its id', () => {
    const out = V.explainDelivery(ballot({ reviewTriage: { dispositions: [{ key: 'axe|incomplete|aria-valid-attr', stillFlagged: true }] } }));
    expect(out.needsAPerson.join(' ')).toMatch(/\(aria-valid-attr\) could not decide/);
  });
  it('one a person or the model settled is not asked again', () => {
    const out = V.explainDelivery(ballot({ reviewTriage: { dispositions: [{ key: 'axe|incomplete|color-contrast', stillFlagged: false }] } }));
    expect(out.needsAPerson.join(' ')).not.toMatch(/could not decide/);
    expect(out.headline).toMatch(/Only quick checks are left/);
  });
});

describe('an answer that covered only part of a finding (civics, scan1913)', () => {
  const civics = (disposition) => ({
    files: { taggedPdf: 'x.pdf' }, deliveryStatus: 'review-required',
    verdictReasons: { review: [GENERIC], cautions: [] },
    verification: { axe: { totalIncomplete: 0 }, equalAccess: { reviewFindings: [{ id: 'list_markup_review', nodes: 101, description: 'Verify this is a list' }] } },
    reviewTriage: { dispositions: [{ key: 'equalAccess|potential|list_markup_review', action: 'not-an-issue', reason: 'These are typed question numbers on paragraphs.', ...disposition }] },
  });
  it('is named as still open, with how much the AI saw, and is not called a quick check', () => {
    const out = V.explainDelivery(civics({ stillFlagged: true, nodesShown: 12 }));
    expect(out.quickChecks).toEqual([]);
    expect(out.needsAPerson.join(' ')).toMatch(/AI review saw 12 of these 101 and found no problem in those, so the rest still need a person/);
    expect(out.headline).toBe('Automated checks finished, but some findings need a person to look before sharing.');
  });
  it('without a count it still says only some were seen', () => {
    const out = V.explainDelivery(civics({ stillFlagged: true }));
    expect(out.needsAPerson.join(' ')).toMatch(/AI review saw only some of these/);
  });
  it('an answer that covered everything stays a quick check', () => {
    const out = V.explainDelivery(civics({ stillFlagged: false, nodesShown: 101 }));
    expect(out.quickChecks.join(' ')).toMatch(/AI review found no problem/);
    expect(out.needsAPerson.join(' ')).not.toMatch(/AI review saw/);
  });
  it('an older report with no stillFlagged field reads as it did', () => {
    const out = V.explainDelivery(civics({}));
    expect(out.quickChecks.join(' ')).toMatch(/AI review found no problem/);
  });
});

describe('a quoted colour cue', () => {
  it('starts and ends on whole words, so a person can search for it', () => {
    const before = 'x'.repeat(40) + ' for teachers and Ed Techs. When you review the calendar, ';
    const after = ' are staff days and the following words run on past the cut for a good long while afterwards.';
    const [cue] = V.colourMeaningCues('<p>' + before + 'dates shaded in green' + after + '</p>', 5);
    expect(cue.quote).toContain('shaded in green');
    const words = (before + 'dates shaded in green' + after).replace(/\s+/g, ' ').split(' ');
    for (const w of cue.quote.split(' ')) expect(words, w).toContain(w);
  });
  it('keeps the match itself even when it sits at the very start or end', () => {
    const [cue] = V.colourMeaningCues('<p>shaded in green</p>', 5);
    expect(cue.quote).toBe('shaded in green');
  });
});

describe('corrected scan words', () => {
  const NOTE = { kind: 'ocrVisionAlignment', msg: 'The scan\'s text recognition misread some words, and 22 of them were corrected from a second reading of pages 1 and 2 (for example "Atticle" to "Article"). Spot-check those words against the original.' };
  const CAUTION = "some words the scan's text recognition misread were corrected from a second reading — spot-check them against the original";
  const trust = (over = {}) => ({
    files: {}, deliveryStatus: 'review-required', taggedPdfError: 'distribution_review_required',
    verdictReasons: { review: ['content fidelity needs a human check (possible loss or changed values)'], cautions: [CAUTION] },
    fidelityNotes: [NOTE], verification: { equalAccess: { reviewFindings: [] } }, ...over,
  });
  it('says what was found, once, and why a number matters', () => {
    const out = V.explainDelivery(trust());
    expect(out.needsAPerson.join(' ')).toContain('22 of them were corrected');
    expect(out.needsAPerson.join(' ')).toMatch(/involves a number/);
    expect(out.needsAPerson.join(' ')).not.toMatch(/possible loss/);
    expect(out.worthAGlance).toEqual([]);
    expect(out.items[0].meaning).toMatch(/words the scan misread were corrected/);
    expect(out.items[0].meaning).not.toMatch(/findings/);
  });
  it('keeps the stronger wording when anything else is involved', () => {
    for (const over of [{ integrityWarning: 'x' }, { fidelityNotes: [NOTE, { kind: 'numeric', msg: 'A number changed.' }] }, { fidelityNotes: [{ ...NOTE, caution: true }] }, { fidelityNotes: [] }]) {
      const out = V.explainDelivery(trust(over));
      expect(out.needsAPerson.join(' '), JSON.stringify(over)).toMatch(/possible loss/);
      expect(out.items[0].meaning, JSON.stringify(over)).toMatch(/findings a person must check/);
    }
  });
});
