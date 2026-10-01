// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMClient, loadTool, makeCtx, newStore, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// The results screen, the AI coach, XP and the screen-reader path, as a
// student meets them: one clear thing to fix, no mockery, AI only when asked
// and allowed, XP for evidence rather than clicks, and headings + focus that
// follow the screen.
const source = readFileSync('stem_lab/stem_tool_kitchenlab.js', 'utf8');
const act = React.act;
vi.setConfig({ testTimeout: 30000 });   // full-tool renders; slow on a loaded machine
let E, cfg;
beforeAll(() => {
  resetStemLab();
  cfg = loadTool('stem_lab/stem_tool_kitchenlab.js', 'kitchenLab');
  E = cfg.engine;
});
afterEach(() => vi.useRealTimers());
const strip = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&');
// A failing toContain on the whole tool source or page makes vitest diff the
// entire string and hang; name what was missing instead.
const mustContain = (s, x) => expect(s.includes(x), 'missing: ' + x).toBe(true);
const mustNotContain = (s, x) => expect(s.includes(x), 'unexpected: ' + x).toBe(false);
const done = (judgement, over) => Object.assign(E.defaultState(), { activeSection: 'recipe', recipeActiveId: 'scrambledEggs', recipePhase: 'done', recipeStartedAt: 4242, recipeJudgement: judgement }, over);
const judged = { score: 49, grade: 'F', verdict: 'x', notes: [
  { neg: false, label: '✓ Pan temp', detail: 'fine' },
  { neg: true, label: '⏱️ A bit fast', detail: 'Give them longer.' },
  { neg: true, label: '☣️ FOOD SAFETY: regular eggs under 160°F', detail: 'Stir a little longer on low heat.' }] };

describe('Kitchen Lab results lead with one thing to fix', () => {
  it('puts a food-safety flag first, otherwise the judge’s first flagged note', () => {
    expect(E.oneFix(judged).label).toMatch(/FOOD SAFETY/);
    expect(E.oneFix({ notes: [{ neg: false, label: 'ok' }, { neg: true, label: 'first' }, { neg: true, label: 'second' }] }).label).toBe('first');
    expect(E.oneFix({ notes: [{ neg: false, label: 'ok' }] })).toBeNull();
    const folded = E.foldRecipeHistory({}, 'scrambledEggs', judged, false);
    expect(folded.scrambledEggs.lastIssue).toMatch(/FOOD SAFETY/);   // the picker's "Next time" line agrees
  });

  it('shows the fix card above the charts, with its lesson link', () => {
    const html = renderTool('kitchenLab', { kitchenLab: done(judged) });
    mustContain(html, 'data-kl-one-fix="☣️ FOOD SAFETY: regular eggs under 160°F"');
    expect(html.indexOf('data-kl-one-fix')).toBeLessThan(html.indexOf('Judge'));
    mustContain(html, 'data-kl-fix-lesson="safety"');
    const clean = renderTool('kitchenLab', { kitchenLab: done({ score: 100, grade: 'A', verdict: 'great', notes: [{ neg: false, label: '✓ All good', detail: '' }] }) });
    mustContain(clean, 'data-kl-one-fix="none"');
    expect(strip(clean)).toContain('Nothing to fix');
  });

  it('replaces every joke verdict with plain words that point at the fix', () => {
    for (const joke of ['Technically scrambled', 'Kitchen fire risk', 'Order pizza', 'dog would eat', 'Steak-adjacent', 'Julia Child would have notes', 'rice-adjacent', 'Italian place', 'takeout']) mustNotContain(source, joke);
    expect(source.match(/score >= 60 \? VERDICT_D :\s*VERDICT_F;/g)).toHaveLength(12);
    const low = E.runBench(E.RECIPES.sheetPan, 'dial', '-2').result.judgement;   // never preheats: a D
    expect(low.score).toBeLessThan(70);
    expect(low.verdict).toMatch(/one fix below/);
  });
});

describe('Kitchen Lab AI coach: asked for, and only where the teacher allows AI', () => {
  it('does not call the AI by itself; the student asks', async () => {
    const callGemini = vi.fn(() => Promise.resolve('Try lower heat.'));
    const html = renderTool('kitchenLab', { kitchenLab: done(judged) }, { callGemini });
    await new Promise((r) => setTimeout(r, 200));
    expect(callGemini).not.toHaveBeenCalled();
    mustContain(html, 'data-kl-ai-ask="1"');
  });

  it('hides the coach and the suggester when the teacher turned AI off, and for the sandbox', () => {
    const callGemini = vi.fn();
    const off = renderTool('kitchenLab', { kitchenLab: done(judged) }, { callGemini, aiHintsEnabled: false });
    mustNotContain(off, 'data-kl-ai-ask');
    const picker = strip(renderTool('kitchenLab', { kitchenLab: { activeSection: 'recipe' } }, { callGemini, aiHintsEnabled: false }));
    mustNotContain(picker, 'What should I cook tonight?');
    const onPicker = strip(renderTool('kitchenLab', { kitchenLab: { activeSection: 'recipe' } }, { callGemini }));
    mustContain(onPicker, 'What should I cook tonight?');
    const sandbox = renderTool('kitchenLab', { kitchenLab: done({ score: null, grade: null, verdict: 'ref', notes: [], sandbox: true }, { recipeActiveId: 'freeCook', sandboxFood: 'eggs' }) }, { callGemini });
    mustNotContain(sandbox, 'data-kl-ai-ask');
  });

  it('tells the suggester how many recipes there really are', () => {
    mustNotContain(source, 'Here are the 7 recipes available');
    mustContain(source, "'You are a friendly cooking coach helping a student pick a recipe to cook in the simulator. Here are the ' + unlocked.length + ' recipes available:',");
  });
});

describe('Kitchen Lab XP is for evidence, with a reason', () => {
  it('credits a finished cook once, by grade, with a bonus for an independent cook', async () => {
    expect(E.xpForCook({ score: 100, grade: 'A' })).toBe(10);
    expect(E.xpForCook({ score: 100, grade: 'A', evidenceStatus: 'independent' })).toBe(15);
    expect(E.xpForCook({ score: 55, grade: 'F' })).toBe(3);
    expect(E.xpForCook({ score: null })).toBe(0);
    const awardXP = vi.fn();
    const state = done({ score: 92, grade: 'A', verdict: 'v', notes: [], evidenceStatus: 'independent' }, { recipeStartedAt: 777001, klNewAchievements: ['firstCook'] });
    renderTool('kitchenLab', { kitchenLab: state }, { awardXP });
    renderTool('kitchenLab', { kitchenLab: state }, { awardXP });          // a re-render must not pay twice
    await new Promise((r) => setTimeout(r, 50));
    const cook = awardXP.mock.calls.filter((c) => /Cooked Scrambled Eggs: grade A, independently/.test(c[2] || ''));
    expect(cook).toHaveLength(1);
    expect(cook[0].slice(0, 2)).toEqual(['kitchenLab', 15]);
    if (E.ACHIEVEMENTS.some((a) => a.id === 'firstCook')) expect(awardXP.mock.calls.some((c) => /Kitchen Lab badge:/.test(c[2] || ''))).toBe(true);
  });

  it('gives no XP for plain clicks, and names the reason for every award', () => {
    expect(source).not.toMatch(/awardXP\(\d+\)/);                      // every award carries a reason
    mustNotContain(source, "setKL({ knifeSelectedCut: c.id }); awardXP");
    mustNotContain(source, "heatPanTempF: t.panTempF }); awardXP");
    mustNotContain(source, "setKL({ resourcesSub: s.id }); awardXP");
    mustContain(source, "awardXP(4, 'Solved a Kitchen Detective case')");
  });
});

// Mount for real; the store plays the host and draw() re-renders after each action.
function mount(kitchenLab) {
  const store = newStore({ kitchenLab: kitchenLab });
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const draw = () => act(() => { root.render(cfg.render(makeCtx({ toolData: store.toolData }, store))); });
  draw();
  return { store, host, root, draw, button: (re) => [...host.querySelectorAll('button')].find((b) => re.test(b.getAttribute('aria-label') || b.textContent || '')) };
}

describe('Kitchen Lab headings, names and focus follow the screen', () => {
  it('gives every panel an h2 and its cards h3s', () => {
    for (const section of ['safety', 'knife', 'heat', 'maillard', 'recipe', 'resources', 'maillardHunt']) {
      const html = renderTool('kitchenLab', { kitchenLab: { activeSection: section } });
      expect(html, section).toMatch(/<h2[\s>]/);
      const firstH2 = html.search(/<h2[\s>]/), firstH3 = html.search(/<h3[\s>]/);
      if (firstH3 !== -1) expect(firstH3, section + ': no h3 before the first h2').toBeGreaterThan(firstH2);
    }
    mustNotContain(source, "h('div', { style: subheaderStyle() }");
  }, 30000);   // seven full renders

  it('names each Start cooking button after its recipe', () => {
    const html = renderTool('kitchenLab', { kitchenLab: { activeSection: 'recipe' } });
    mustContain(html, 'aria-label="Start cooking: Scrambled Eggs"');
    mustContain(html, 'aria-label="Start cooking: Steak (Pan-Seared)"'.replace('Steak (Pan-Seared)', E.RECIPES.steak.name));
  });

  it('moves focus to the cockpit heading when a cook starts, and announces each next step', async () => {
    const m = mount(Object.assign(E.defaultState(), { activeSection: 'recipe' }));
    act(() => { m.button(/Start cooking: Scrambled Eggs/).click(); });
    m.draw();
    await act(async () => { await new Promise((r) => setTimeout(r, 120)); });
    expect(document.activeElement && document.activeElement.id).toBe('kl-cockpit-title');
    mustContain(source, "klAnnounce((doneMsg ? doneMsg + ' ' : '') + 'Step ' + (cur + 2) + ' of ' + recNow.steps.length + ': ' + upcoming.title + '.');");
    mustContain(source, "else { if (doneMsg) klAnnounce(doneMsg); klFocus('kl-results-title'); }");
    const pickerStore = m.store.toolData.kitchenLab;
    act(() => m.root.unmount());
    // leave the tick stopped for the next test
    expect(pickerStore.recipePhase).toBe('cooking');
  });
});
