// Behavior Lens record review.
//
// WHY: until 2026-09-23 the AI summary of a pasted IEP or evaluation read only the
// first 4,000 characters, with no notice: a 20,000-character evaluation was summarized
// from its opening pages, and "Current Goals", which usually come later, were empty or
// invented. The summary was also lost when the panel closed.
import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import { componentHarness } from './helpers/behavior_lens_component_harness.js';

const require = createRequire(import.meta.url);
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  try { loadAlloModule('behavior_lens_module.js'); } catch (e) { /* UI half may need a host */ }
});

const REPLY = JSON.stringify({ documentType: 'Evaluation Report', keyFindings: ['k'], currentGoals: ['Reads grade-level text fluently'], areasOfConcern: [], strengths: [], behavioralNotes: '', recommendations: [], summary: 'Summary.' });
const doc = (len, marks) => { const a = 'x'.repeat(len).split(''); Object.entries(marks).forEach(([at, word]) => a.splice(Number(at), word.length, ...word)); return a.join(''); };

describe('record review', () => {
  it('reads well past 4,000 characters, and says when a document is cut', async () => {
    let sent = '';
    const q = componentHarness('RecordReview', { studentName: 'Kestrel', callGemini: async p => { sent = p; return REPLY; }, t: () => undefined, addToast: () => {} });
    q.all(n => n.type === 'textarea')[0].props.onChange({ target: { value: doc(35000, { 20000: 'CURRENTGOALS', 32000: 'LATEAPPENDIX' }) } }); q.render();
    await q.all(n => n.type === 'button' && /Summar|Review|Analy/.test(q.text(n)) && typeof n.props.onClick === 'function')[0].props.onClick(); q.render();
    expect(sent).toContain('CURRENTGOALS');                          // old: cut at 4,000
    expect(sent).not.toContain('LATEAPPENDIX');
    expect(sent).toContain('only the first 30,000 of 35,000 characters');
    expect(q.text(q.byAttr('data-review-partial', 'true')[0])).toBe('Only the first 30,000 of 35,000 characters were reviewed. Anything after that, such as later goals or recommendations, is not in this summary.');
  });
  it('a document within the limit carries no notice, and the summary is kept', () => {
    const kept = componentHarness('RecordReview', { studentName: 'Kestrel', callGemini: null, t: () => undefined, addToast: () => {} },
      { __durable: { recordReviewSummary: { ...JSON.parse(REPLY), reviewedChars: 9000, totalChars: 9000 } } });
    expect(kept.text()).toContain('Reads grade-level text fluently');
    expect(kept.byAttr('data-review-partial', 'true')).toHaveLength(0);
  });
});
