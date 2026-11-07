// Student AI-off sweep (wave 2): without AI grading, finishing every prompt of an
// interactive anchor chart earns completion XP once; with AI grading the finish
// path is absent, and both paths share prevFeedbackScore so XP never doubles.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
let View, root, host;
beforeAll(() => {
  global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true;
  new Function(readFileSync(resolve('anchor_charts_module.js'), 'utf8'))();
  View = window.AlloModules.AnchorChartView;
});
afterEach(() => { try { if (root) act(() => root.unmount()); } catch (_) {} root = null; host?.remove(); host = null; delete window.__alloStudentAiDisabled; vi.restoreAllMocks(); });
const t = () => '';
const chart = (answers, extra = {}) => ({ id: 'a1', type: 'anchor-chart', data: { title: 'Water cycle', chartType: 'process', interactive: { armed: true, rubric: 'Explain transpiration' },
  sections: [{ id: 's1', label: 'Transpiration', bullets: ['Water leaves leaves', 'Why it matters'] }],
  studentAnswers: { s1: answers }, ...extra } });
const FULL = { 's1-bullet-0': 'Water goes up the plant', 's1-bullet-1': 'It cools the leaf' };
function mount(props) {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  const write = vi.fn(), addXp = vi.fn(), toast = vi.fn();
  act(() => root.render(React.createElement(View, { isTeacherMode: false, allowRuntimeAi: false, callGemini: null, handleNoteUpdate: write, addToast: toast, addXp, t, ...props })));
  return { write, addXp, toast };
}
const finishButton = () => host.querySelector('[data-anchor-finish="true"]');
const submitButton = () => [...host.querySelectorAll('button')].find(b => b.textContent.includes('Submit for AI feedback'));

describe('anchor chart completion XP without AI', () => {
  it('awards 30 XP once and records it in prevFeedbackScore when every prompt is answered', () => {
    const run = mount({ generatedContent: chart(FULL) });
    expect(submitButton()).toBeUndefined();
    expect(finishButton()).not.toBeNull();
    act(() => finishButton().click());
    expect(run.addXp).toHaveBeenCalledTimes(1);
    expect(run.addXp).toHaveBeenCalledWith(30);
    expect(run.write).toHaveBeenCalledWith('prevFeedbackScore', 30);
    act(() => finishButton().click());
    expect(run.addXp).toHaveBeenCalledTimes(1);
  });

  it('awards nothing while any prompt is blank', () => {
    const run = mount({ generatedContent: chart({ 's1-bullet-0': 'Water goes up the plant', 's1-bullet-1': '   ' }) });
    act(() => finishButton().click());
    expect(run.addXp).not.toHaveBeenCalled();
    expect(run.write).not.toHaveBeenCalledWith('prevFeedbackScore', expect.anything());
    expect(run.toast).toHaveBeenCalledWith('Fill in every answer to finish your chart.');
  });

  it('shows the earned status instead of the button once completion XP is recorded', () => {
    mount({ generatedContent: chart(FULL, { prevFeedbackScore: 30 }) });
    expect(finishButton()).toBeNull();
    expect(host.querySelector('[data-anchor-finish-done="true"]').textContent).toContain('+30 XP earned');
  });

  it('tops up only the remainder after a smaller earlier AI award', () => {
    const run = mount({ generatedContent: chart(FULL, { prevFeedbackScore: 10 }) });
    act(() => finishButton().click());
    expect(run.addXp).toHaveBeenCalledWith(20);
    expect(run.write).toHaveBeenCalledWith('prevFeedbackScore', 30);
  });

  it('treats a host-blocked callGemini as no AI', () => {
    const blocked = async () => { throw new Error('blocked'); }; blocked._alloQrBlocked = true;
    const run = mount({ generatedContent: chart(FULL), allowRuntimeAi: true, callGemini: blocked });
    expect(submitButton()).toBeUndefined();
    act(() => finishButton().click());
    expect(run.addXp).toHaveBeenCalledWith(30);
  });

  it('awards nothing in preview (no addXp) and never renders for the teacher', () => {
    const run = mount({ generatedContent: chart(FULL), addXp: undefined, previewMode: true });
    act(() => finishButton().click());
    expect(run.write).not.toHaveBeenCalledWith('prevFeedbackScore', expect.anything());
    act(() => root.unmount()); root = null; host.remove();
    mount({ generatedContent: chart(FULL), isTeacherMode: true });
    expect(finishButton()).toBeNull();
  });
});

describe('anchor chart with AI grading available', () => {
  it('offers only the AI path; a completion award never stacks on an AI award', async () => {
    let settle;
    const run = mount({ generatedContent: chart(FULL, { prevFeedbackScore: 30 }), allowRuntimeAi: true, callGemini: () => new Promise(res => { settle = res; }) });
    expect(finishButton()).toBeNull();
    expect(submitButton()).toBeDefined();
    await act(async () => submitButton().click());
    await act(async () => { settle(JSON.stringify({ strength: 'You named the stem.', growthNudge: 'Add why.', suggestedXP: 80 })); await Promise.resolve(); await Promise.resolve(); });
    // AI only adds the amount above the completion credit already recorded.
    expect(run.addXp).toHaveBeenCalledTimes(1);
    expect(run.addXp).toHaveBeenCalledWith(50);
  });
});
