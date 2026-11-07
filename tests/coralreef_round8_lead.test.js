import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadTool, resetStemLab, renderTool } from './helpers/stem_widgets_smoke_harness.js';

// Round 8 lead fixes: the budget sentence reads correctly past 60% cover, falling behind the
// sea is not shown in the "good" colour, and the acidification scene has a key.
vi.setConfig({ testTimeout: 60000 });
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
let S;
beforeEach(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(TOOL, 'coralReef'); S = window.__RR_TEST_EXPORTS__.coralReefSci; });
const page = (extra) => renderTool('coralReef', { coralReef: Object.assign({ section: 'science' }, extra) });
const text = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d.textContent; };

describe('limestone budget sentence', () => {
  it('never says "about more than"', () => {
    let over = 0;
    for (const grazers of ['low', 'medium', 'high']) for (const urchins of ['few', 'many']) {
      const t = text(page({ sciTopic: 'build', sciBudget: { revealed: true, pred: 'grow', urchins, grazers } }));
      if (t.includes('would need more than 60% live coral')) over++;
      expect(t).not.toContain('about more than');
      expect(t).toMatch(/the reef would need (about \d+%|more than 60%) live coral/);
    }
    expect(over).toBeGreaterThan(0); // the case that used to read wrongly really is exercised
  });
  it('takes the sea-level rise from the budget constant', () => {
    const t = text(page({ sciTopic: 'build', sciBudget: { revealed: true, pred: 'grow' } }));
    expect(t).toContain('sea-level rise of about ' + S.BUDGET.seaMm + ' mm a year');
  });
  it('does not state the balance before the student predicts', () => {
    const t = text(page({ sciTopic: 'build' }));
    expect(t).not.toMatch(/would need (about \d+%|more than 60%) live coral/);
    expect(t).not.toContain('gets 17 cm deeper');
  });
});

describe('acidification scene key', () => {
  it('keeps the scene whole, and drops the key wherever the scene is hidden', () => {
    const d = document.createElement('div');
    d.innerHTML = page({ sciTopic: 'build' });
    const css = [...d.querySelectorAll('style')].map((n) => n.textContent).join('');
    expect(css).toContain('[data-pg-art=card-acid]{flex:0 0 auto;min-height:0;max-height:none;aspect-ratio:340/120}');
    expect(css).toContain('@media(max-width:820px){[data-coralreef-root] .gr8-acid-key{display:none}}');
  });
  it('explains the symbols only on the card that draws them', () => {
    const d = document.createElement('div');
    d.innerHTML = page({ sciTopic: 'build' });
    expect([...d.querySelectorAll('.gr8-acid-key')].filter((n) => !n.closest('[hidden]')).length).toBe(1);
    expect(d.querySelector('.gr8-acid-key').textContent).toContain('carbonate');
    d.innerHTML = page({ sciTopic: 'seaweed' });
    // Every topic stays in the page in a hidden panel, so check the student cannot see it here.
    expect([...d.querySelectorAll('.gr8-acid-key')].filter((n) => !n.closest('[hidden]')).length).toBe(0);
  });
});
