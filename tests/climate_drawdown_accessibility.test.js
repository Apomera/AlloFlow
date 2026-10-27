import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const paths = ['stem_lab/stem_tool_climateExplorer.js', 'desktop/web-app/public/stem_lab/stem_tool_climateExplorer.js'];
const correctIds = ['refrigerants', 'wind_onshore', 'tropical_forest', 'wind_onshore', 'silvopasture', 'reduced_waste', 'wind_onshore', 'refrigerants'];
const disposers = [];
let frames;

function mountTool(path, seed = {}) {
  resetStemLab();
  const config = loadTool(path, 'climateExplorer');
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), announce = vi.fn();
  let current, patch;
  function Host() {
    const [data, setData] = React.useState({ climateExplorer: { tab:'solutions',heroMotionPaused:true,dsOpen:true,...seed } });
    current = data.climateExplorer;
    patch = value => setData(previous => ({ ...previous,climateExplorer:{ ...previous.climateExplorer,...value } }));
    return config.render(makeCtx({ toolData:data,setToolData:setData,announceToSR:announce }));
  }
  act(() => root.render(React.createElement(Host)));
  disposers.push(() => { act(() => root.unmount()); host.remove(); });
  return { host,announce,state:() => current,patch:value => act(() => patch(value)),
    one:selector => host.querySelector(selector),all:selector => [...host.querySelectorAll(selector)],
    answer:id => host.querySelector('#ce-ds-answer-' + id) };
}
async function settle() {
  await act(async () => {
    await Promise.resolve(); vi.runOnlyPendingTimers();
    frames.splice(0).forEach(callback => callback(16)); await Promise.resolve();
  });
}
async function activate(button) {
  expect(button).toBeTruthy(); expect(button.disabled).toBe(false);
  button.focus(); act(() => button.click()); await settle();
}
function expectRegion(view, id, titleId, descriptions) {
  const region = view.one('#' + id);
  expect(region).toBeTruthy(); expect(region.tagName).not.toBe('BUTTON');
  expect(region.getAttribute('role')).toBe('region'); expect(region.tabIndex).toBe(-1);
  expect(region.hasAttribute('data-ce-focus')).toBe(true);
  expect(region.getAttribute('aria-labelledby')).toBe(titleId);
  const title = view.one('#' + titleId);
  expect(title?.textContent.trim()).toBeTruthy(); expect(title.tagName).toMatch(/^H[2-6]$/);
  const refs = (region.getAttribute('aria-describedby') || '').split(/\s+/);
  for (const id of descriptions) { expect(refs).toContain(id); expect(view.one('#' + id)?.textContent.trim()).toBeTruthy(); }
  return region;
}
function question(view) { return expectRegion(view,'ce-ds-question','ce-ds-question-title',['ce-ds-question-help']); }
function feedback(view) { return expectRegion(view,'ce-ds-feedback','ce-ds-feedback-title',['ce-ds-feedback-detail','ce-ds-feedback-score']); }
async function start(view) { await activate(view.one('#ce-ds-start')); expect(document.activeElement).toBe(question(view)); }

beforeEach(() => {
  vi.useFakeTimers(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true); frames = [];
  vi.stubGlobal('requestAnimationFrame',callback => { frames.push(callback); return frames.length; });
  vi.stubGlobal('cancelAnimationFrame',vi.fn());
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);
});
afterEach(async () => {
  disposers.splice(0).forEach(dispose => dispose()); await settle();
  vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe.each(paths)('Drawdown Sleuth accessibility: %s',path => {
  it('keeps a persistent disclosure target and does not take focus when restored or toggled',async () => {
    const outside = document.createElement('button'); document.body.appendChild(outside); outside.focus();
    disposers.push(() => outside.remove());
    const view = mountTool(path,{ dsOpen:false }); await settle();
    expect(document.activeElement).toBe(outside);
    const toggle = view.one('#ce-ds-toggle'), panel = view.one('#ce-ds-panel');
    expect(toggle.getAttribute('aria-controls')).toBe(panel.id);
    expect(toggle.getAttribute('aria-expanded')).toBe('false'); expect(panel.hidden).toBe(true);
    await activate(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true'); expect(panel.hidden).toBe(false);
    expect(document.activeElement).toBe(toggle); expect(view.one('#ce-ds-start')).toBeTruthy();
    await activate(toggle);
    expect(view.one('#ce-ds-panel')).toBe(panel); expect(panel.hidden).toBe(true);
    expect(document.activeElement).toBe(toggle);
  });

  it('starts at a named question with four native answer buttons in a named group',async () => {
    const view = mountTool(path); await start(view);
    expect(view.state().dsIdx).toBe(2);
    const group = view.one('#ce-ds-panel [role="group"]');
    expect(group.getAttribute('aria-labelledby')).toBe('ce-ds-question-title');
    const answers = [...group.querySelectorAll('button')]; expect(answers).toHaveLength(4);
    expect(view.one('#ce-ds-panel [role="radio"],#ce-ds-panel [role="radiogroup"]')).toBeNull();
    expect(answers.every(button => button.type === 'button' && !button.disabled && button.textContent.trim())).toBe(true);
    expect(view.one('#ce-ds-feedback')).toBeNull();
  });

  it('shows correct feedback and score, then moves focus to the next unanswered question',async () => {
    const view = mountTool(path); await start(view);
    const answer = view.answer('tropical_forest');
    const labelId = answer.getAttribute('aria-labelledby');
    expect(view.one('#'+labelId).textContent).toBe('Tropical Forest Restoration');
    await activate(view.answer('tropical_forest'));
    expect(answer.getAttribute('aria-labelledby')).toBe(labelId);
    expect(view.one('#'+labelId).textContent).toBe('Tropical Forest Restoration');
    expect(view.one('#'+answer.getAttribute('aria-describedby')).textContent).toMatch(/85.*Correct answer.*Your answer/);
    expect(document.activeElement).toBe(feedback(view));
    expect(view.one('#ce-ds-feedback-title').textContent).toMatch(/correct/i);
    expect(view.one('#ce-ds-feedback-detail').textContent).toContain('Tropical Forest Restoration');
    expect(view.one('#ce-ds-feedback-score').textContent).toContain('1');
    expect(view.state()).toMatchObject({ dsAnswered:true,dsPick:'tropical_forest',dsScore:1,dsRounds:1,dsStreak:1,dsBest:1 });
    expect(view.answer('tropical_forest').getAttribute('aria-pressed')).toBe('true');
    expect(view.answer('tropical_forest').textContent).toMatch(/your answer/i);
    expect(view.answer('tropical_forest').textContent).toMatch(/correct answer/i);
    const previous = view.state().dsIdx, next = view.one('#ce-ds-next'); await activate(next);
    expect(document.activeElement).toBe(question(view)); expect(next.isConnected).toBe(false);
    expect(view.one('#ce-ds-feedback')).toBeNull(); expect(view.state().dsIdx).not.toBe(previous);
    expect(view.state()).toMatchObject({ dsAnswered:false,dsPick:null,dsScore:1,dsRounds:1 });
  });

  it('identifies a wrong choice and the correct answer in text while resetting only the current streak',async () => {
    const view = mountTool(path,{ dsIdx:2,dsShown:[0,2],dsAnswered:false,dsScore:1,dsRounds:1,dsStreak:1,dsBest:1 });
    await activate(view.answer('plant_rich'));
    expect(document.activeElement).toBe(feedback(view));
    const detail = view.one('#ce-ds-feedback-detail').textContent;
    expect(detail).toContain('Plant-Rich Diets'); expect(detail).toContain('Tropical Forest Restoration');
    expect(view.answer('plant_rich').textContent).toMatch(/your answer/i);
    expect(view.answer('tropical_forest').textContent).toMatch(/correct answer/i);
    expect(view.answer('plant_rich').getAttribute('aria-pressed')).toBe('true');
    expect(view.answer('tropical_forest').getAttribute('aria-pressed')).toBe('false');
    expect(view.state()).toMatchObject({ dsScore:1,dsRounds:2,dsStreak:0,dsBest:1 });
  });

  it('keeps answered choices inspectable and rejects repeated or same-batch answer submissions',async () => {
    const view = mountTool(path); await start(view);
    const correct = view.answer('tropical_forest'), wrong = view.answer('plant_rich');
    correct.focus(); act(() => { correct.click(); wrong.click(); }); await settle();
    expect(document.activeElement).toBe(feedback(view));
    expect(view.state()).toMatchObject({ dsPick:'tropical_forest',dsScore:1,dsRounds:1 });
    const answered = { ...view.state() };
    for (const button of view.all('#ce-ds-panel [role="group"] button')) {
      expect(button.disabled).toBe(false); expect(button.getAttribute('aria-disabled')).toBe('true');
    }
    await activate(wrong); await activate(correct);
    expect(view.state()).toEqual(answered);
  });

  it('preserves answered progress while hiding and reopening the game and leaves focus on the toggle',async () => {
    const view = mountTool(path); await start(view); await activate(view.answer('tropical_forest'));
    const saved = { ...view.state() }, toggle = view.one('#ce-ds-toggle');
    await activate(toggle);
    expect(view.one('#ce-ds-panel').hidden).toBe(true); expect(document.activeElement).toBe(toggle);
    await activate(toggle);
    expect(view.state()).toMatchObject(saved); expect(view.one('#ce-ds-panel').hidden).toBe(false);
    expect(document.activeElement).toBe(toggle); expect(feedback(view).textContent).toContain('Tropical Forest Restoration');
  });

  it('plays eight unique rounds and restarts with the best streak retained and focus on Start',async () => {
    const view = mountTool(path); await start(view); const seen = [];
    for (let round = 0; round < 8; round++) {
      const index = view.state().dsIdx; expect(seen).not.toContain(index); seen.push(index);
      await activate(view.answer(correctIds[index]));
      expect(view.state().dsScore).toBe(round + 1); expect(view.state().dsRounds).toBe(round + 1);
      expect(document.activeElement).toBe(feedback(view));
      if (round < 7) { await activate(view.one('#ce-ds-next')); expect(document.activeElement).toBe(question(view)); }
    }
    expect(new Set(seen).size).toBe(8); expect(view.one('#ce-ds-next')).toBeNull();
    expect(view.one('#ce-ds-panel').textContent).toMatch(/all 8 rounds complete/i);
    await activate(view.one('#ce-ds-restart'));
    expect(document.activeElement).toBe(view.one('#ce-ds-start'));
    expect(view.state()).toMatchObject({ dsIdx:-1,dsShown:[],dsAnswered:false,dsPick:null,dsScore:0,dsRounds:0,dsStreak:0,dsBest:8 });
    await start(view);
    expect(view.state().dsShown).toHaveLength(1); expect(view.state().dsBest).toBe(8);
  });

  it('restores an answered game and unrelated saved-state updates without stealing focus',async () => {
    const outside = document.createElement('button'); document.body.appendChild(outside); outside.focus();
    disposers.push(() => outside.remove());
    const view = mountTool(path,{ dsIdx:2,dsShown:[2],dsAnswered:true,dsPick:'tropical_forest',dsScore:1,dsRounds:1,dsStreak:1,dsBest:1 }); await settle();
    expect(feedback(view).textContent).toContain('Tropical Forest Restoration'); expect(document.activeElement).toBe(outside);
    view.patch({ exportedReport:'Keep this separate work.' }); await settle();
    expect(document.activeElement).toBe(outside); expect(view.state().exportedReport).toBe('Keep this separate work.');
  });

  it.each([99,1.5,'2',Infinity])('recovers an invalid saved round index %j to a usable introduction',async dsIdx => {
    const view = mountTool(path,{ dsIdx,dsShown:{ invalid:true },dsAnswered:true,dsPick:{ invalid:true },dsScore:Infinity,dsRounds:-99 });
    expect(view.one('#ce-ds-start')).toBeTruthy(); expect(view.one('#ce-ds-question')).toBeNull();
    await start(view); expect(view.state().dsShown).toHaveLength(1);
    await activate(view.answer(correctIds[view.state().dsIdx]));
    expect(view.state()).toMatchObject({ dsScore:1,dsRounds:1 });
    expect(feedback(view).textContent).not.toMatch(/NaN|Infinity/);
  });

  it.each([{ stale:true },[2,2,99,-1,'1',null]])('repairs malformed or duplicate history %j without skipping the current question',async dsShown => {
    const view = mountTool(path,{ dsIdx:2,dsShown,dsAnswered:false });
    expect(question(view)).toBeTruthy(); await activate(view.answer('tropical_forest'));
    expect(view.state()).toMatchObject({ dsShown:[2],dsScore:1,dsRounds:1 });
    await activate(view.one('#ce-ds-next'));
    expect(view.state().dsShown).toHaveLength(2); expect(view.state().dsIdx).not.toBe(2);
  });

  it('derives progress from unique valid history and keeps malformed counts finite and bounded',async () => {
    const view = mountTool(path,{ dsIdx:2,dsShown:[0,1,2,2,9,'4'],dsAnswered:false,dsScore:Infinity,dsRounds:99,dsStreak:'bad',dsBest:NaN });
    expect(view.one('#ce-ds-panel').textContent).not.toMatch(/NaN|Infinity/);
    await activate(view.answer('tropical_forest'));
    const state = view.state(); expect(state.dsShown).toEqual([0,1,2]); expect(state.dsRounds).toBe(3);
    for (const key of ['dsScore','dsStreak','dsBest']) { expect(Number.isSafeInteger(state[key])).toBe(true); expect(state[key]).toBeGreaterThanOrEqual(0); expect(state[key]).toBeLessThanOrEqual(8); }
    expect(state.dsScore).toBeLessThanOrEqual(state.dsRounds); expect(state.dsStreak).toBeLessThanOrEqual(state.dsScore);
  });

  it.each([{ stale:true },'wind_onshore'])('recovers a saved answer outside the current options %j as unanswered',async dsPick => {
    const view = mountTool(path,{ dsIdx:2,dsShown:[2],dsAnswered:true,dsPick,dsScore:8,dsRounds:99,dsStreak:8 });
    expect(question(view)).toBeTruthy(); expect(view.one('#ce-ds-feedback')).toBeNull();
    await activate(view.answer('tropical_forest'));
    expect(view.state()).toMatchObject({ dsPick:'tropical_forest',dsAnswered:true,dsRounds:1,dsScore:1 });
    expect(document.activeElement).toBe(feedback(view));
  });
});
