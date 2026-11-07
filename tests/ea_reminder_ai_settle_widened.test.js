// An Equal Access reminder the AI review answered "not an issue" WITH A REASON stops holding the verdict
// (Aaron, 2026-11-04). RSU 57 budget keyless run (budget_v3): coverage clean, yet the tagged PDF was held
// because 3 reminders (media_alt_brief x6, text_quoted_correctly, text_sensory_misuse "above" = "greater
// than") each judged not-an-issue with a reason still counted as review. The allowlist now holds the
// reminders whose answer is in the document's words and markup; keyboard/focus/form reminders stay a
// person's, a bare verdict settles nothing, a failure is never touched, and every settled reminder stays
// disclosed (acknowledgedByAiReview -> quick check with the AI's reason).
// ALLO_PIPELINE_SOURCE points at a private copy for mutation checks.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { sliceBetween } from './helpers/anchored_slice.js';

const require = createRequire(import.meta.url);
const SRC = fs.readFileSync(process.env.ALLO_PIPELINE_SOURCE || path.resolve('doc_pipeline_source.jsx'), 'utf8');
const apply = new Function(sliceBetween(SRC, 'var _ALLO_AI_SETTLED_REMINDERS = ', '\n};', { file: 'doc_pipeline_source.jsx', includeEnd: true })
  + '\nreturn _alloApplyReminderTriage;')();

const ALT = { id: 'media_alt_brief', nodes: 6, description: 'Text alternative is more than 150 characters' };
const QUOTE = { id: 'text_quoted_correctly', nodes: 1, description: "If the following text is a quotation, mark it as a <q> or <blockquote> element: 'ACHIEVING & ENGAGED STUDENTS, '" };
const ABOVE = { id: 'text_sensory_misuse', nodes: 1, description: "Confirm the word(s) 'above' of the user instruction is used to indicate a logical rather than visual position" };
const budgetEa = () => ({ failViolations: 0, potentialViolations: 3, manualViolations: 0, reviewFindingCount: 3, potentialFindings: [ALT, QUOTE, ABOVE], manualFindings: [], score: 94, manualReviewRequired: true, verificationStatus: 'complete-with-review' });
const REASONS = {
  media_alt_brief: 'Each flagged alt is a single sentence giving the trend with key values; the axis readings are in the visible captions.',
  text_quoted_correctly: 'The quoted words are the labels and motto printed in the strategic plan graphic, not a quotation from another source.',
  text_sensory_misuse: "Here 'above' means 'greater than' ('well above the amount currently being funded'), not a visual position on the page.",
};
const budgetTriage = (over = {}) => ({ dispositions: Object.entries(REASONS).map(([id, reason]) => Object.assign(
  { key: 'equalAccess|potential|' + id, action: 'not-an-issue', reason, nodesShown: id === 'media_alt_brief' ? 6 : 1 }, over[id] || {})) });

describe('AI-settled Equal Access reminders (widened allowlist)', () => {
  it('budget_v3: all three reasoned not-an-issue reminders settle, the review state clears, score 100', () => {
    const out = apply(budgetEa(), budgetTriage());
    expect(out).toMatchObject({ potentialViolations: 0, reviewFindingCount: 0, score: 100, manualReviewRequired: false, verificationStatus: 'complete' });
    expect(out.potentialFindings).toEqual([]);
    // still disclosed, with the AI's reason, for a person's quick check
    expect(out.acknowledgedByAiReview.map((f) => [f.id, f.reason])).toEqual(Object.entries(REASONS).map(([id, r]) => [id, r]));
  });
  it('a bare verdict settles nothing: an empty, one-word or too-short reason keeps the reminder', () => {
    for (const reason of ['', '   ', 'Fine.', 'Not an issue', 'ok ok']) {
      const out = apply(budgetEa(), budgetTriage({ text_sensory_misuse: { reason } }));
      expect(out.potentialFindings.map((f) => f.id), JSON.stringify(reason)).toEqual(['text_sensory_misuse']);
      expect(out.manualReviewRequired).toBe(true);
    }
  });
  it('the model must have seen every flagged element (6 alts, 5 shown: the alt reminder stays)', () => {
    const out = apply(budgetEa(), budgetTriage({ media_alt_brief: { nodesShown: 5 } }));
    expect(out.potentialFindings.map((f) => f.id)).toEqual(['media_alt_brief']);
    expect(out.reviewFindingCount).toBe(1);
  });
  it('keyboard, focus and form reminders are not on the allowlist, even with a reason', () => {
    const ids = ['download_keyboard_controllable', 'style_focus_visible', 'element_tabbable_visible', 'input_fields_grouped'];
    const ea = { failViolations: 0, potentialViolations: 3, manualViolations: 1, potentialFindings: ids.slice(1).map((id) => ({ id, nodes: 1, description: id })),
      manualFindings: [{ id: ids[0], nodes: 1, description: ids[0] }] };
    const t = { dispositions: ids.map((id, i) => ({ key: 'equalAccess|' + (i ? 'potential' : 'manual') + '|' + id, action: 'not-an-issue', reason: 'The flagged element is a plain link that works with the keyboard.', nodesShown: 1 })) };
    expect(apply(ea, t)).toBe(ea);
  });
  it('a failure is never settled, and stays in the score', () => {
    const ea = Object.assign(budgetEa(), { failViolations: 1, fails: [{ id: 'img_alt_valid' }] });
    const out = apply(ea, Object.assign(budgetTriage(), { dispositions: budgetTriage().dispositions.concat([{ key: 'equalAccess|fail|img_alt_valid', action: 'not-an-issue', reason: 'The picture is decorative and needs no description here.', nodesShown: 1 }]) }));
    expect(out.failViolations).toBe(1);
    expect(out.score).toBe(90);
    expect(out.acknowledgedByAiReview.map((f) => f.id)).not.toContain('img_alt_valid');
  });
  it('needs-person and fix answers settle nothing', () => {
    for (const action of ['needs-person', 'fix']) {
      const ea = budgetEa();
      expect(apply(ea, budgetTriage({ media_alt_brief: { action }, text_quoted_correctly: { action }, text_sensory_misuse: { action } }))).toBe(ea);
    }
  });
  it('the connector report lists settled reminders as quick checks, not as things a person must decide', () => {
    const V = require('../desktop/mcp/remediation_verification.cjs');
    const settled = apply(budgetEa(), budgetTriage());
    const ex = V.explainDelivery({ deliveryStatus: 'complete-for-tested-scope', verdictReasons: { review: [], cautions: [] },
      verification: { equalAccess: { reviewFindings: [], acknowledgedByAiReview: settled.acknowledgedByAiReview } }, reviewTriage: budgetTriage() });
    expect(ex.needsAPerson).toEqual([]);
    expect(ex.quickChecks).toHaveLength(3);
    expect(ex.quickChecks.join('\n')).toContain("AI review found no problem: Here 'above' means 'greater than'");
  });
});
