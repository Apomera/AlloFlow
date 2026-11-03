// Guided Mode banner — completion-honesty + new affordances (2026-06-30).
//
// THE BUG (reported by the maintainer): the encouraging "✅ Analysis done" success
// note appeared the instant the teacher *clicked* the highlighted analysis tool —
// before Analyze had actually run. Root cause: the monolith flips `guidedEngaged`
// on the first click of the ringed control, and the banner rendered step.success
// directly off that flag. The async tool result lands later (or never, if they only
// clicked to look), so the banner was claiming work that hadn't happened.
//
// THE FIX: the ✅/success note now keys on a real completion signal —
//   - generate steps (analysis, faq, …): a NEW history item appeared since we
//     arrived at this step (the tool genuinely produced output);
//   - the source step: real text was entered;
//   - the few interaction-only steps: still the click (best signal available).
// `guidedEngaged` is retained ONLY for the "Next step" button affordance.
//
// These mount the real component with a real React renderer and drive the exact
// click-vs-completion transition, so a regression to the old behavior fails here.
// Also covers the source-step "Try this example" loader and the About read-aloud.

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');

let React, ReactDOMClient, act, GuidedModeBanner;

// A small, realistic slice of the real GUIDED_STEPS (3 steps so the analysis step at
// index 1 is NOT the last — otherwise the end-of-flow recap renders and muddies text).
const CHECKED_PASSAGE = 'Plants need sunlight and water.';
const STEPS = [
  { id: 'source-input', label: 'Source Material', action: 'Paste or type the text you want to adapt.', success: 'Source captured.' },
  { id: 'analysis', label: 'Analyze Source Material', action: 'Run Analyze to scan the reading level.', success: 'Analysis done. That shows you where to scaffold.' },
  { id: 'faq', label: 'FAQ Generator', action: 'Generate an FAQ.', success: 'FAQ ready.' },
];
const TOUR_MAP = { 'source-input': 'tour-input-panel', 'analysis': 'tour-tool-analysis', 'faq': 'tour-tool-faq' };
const TOUR_STEPS = [{ id: 'tour-tool-analysis', title: 'About Analysis', text: 'Analysis scans your text for **reading level** and key vocabulary.' }];

beforeEach(() => {
  localStorage.clear();
});
beforeAll(() => {
  React = require(resolve(MODULES_DIR, 'react'));
  ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
  ({ act } = require(resolve(MODULES_DIR, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  if (!global.requestAnimationFrame) global.requestAnimationFrame = () => 0;
  if (!global.cancelAnimationFrame) global.cancelAnimationFrame = () => {};
  // jsdom has no real audio; stub Audio so playAbout's play() resolves cleanly.
  const AudioStub = function () { return { play: () => Promise.resolve(), pause() {}, set src(_v) {}, set onended(_v) {}, set onerror(_v) {} }; };
  global.Audio = window.Audio = AudioStub;
  loadAlloModule(resolve(process.env.CLASSROOM_DRAFT_CANDIDATES||'.','view_guided_mode_banner_module.js')); 
  GuidedModeBanner = window.AlloModules && window.AlloModules.GuidedModeBanner && window.AlloModules.GuidedModeBanner.GuidedModeBanner;
  if (!GuidedModeBanner) throw new Error('GuidedModeBanner not registered on window.AlloModules');
});

// t() returns '' so every `t('guided.x') || 'English fallback'` shows its fallback
// (and the few bare t() calls render empty). step.success/action are literal, not t()'d.
function baseProps(overrides) {
  return {
    GUIDED_STEPS: STEPS, allGuidedSteps: STEPS, guidedSelectedIds: null, toggleGuidedStepId: null,
    GUIDED_TOUR_MAP: TOUR_MAP, guidedStep: 1, guidedRect: null, guidedEngaged: false, wizardOpen: false,
    handleExitGuidedMode: () => {}, handleGuidedSkip: () => {}, setGuidedStep: () => {}, setShowGuidedTip: () => {},
    showGuidedTip: false, t: () => '', tourSteps: TOUR_STEPS, history: [], getDefaultTitle: (type) => type,
    inputText: '', setInputText: () => {}, guidedCompletedIds: [], guidedSkippedIds: [],
    guidedCreatedHistoryIds: [], wordSoundsHistory: [], markGuidedStepDone: () => {},
    ...overrides,
  };
}

function mountBanner(props) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const api = {
    host, root,
    render(p) { act(() => { root.render(React.createElement(GuidedModeBanner, p)); }); },
    async renderAsync(p) { await act(async () => { root.render(React.createElement(GuidedModeBanner, p)); }); },
    text() { return host.textContent || ''; },
    button(substr) { return Array.from(host.querySelectorAll('button')).find(b => (b.textContent || '').includes(substr)); },
    cleanup() { try { act(() => root.unmount()); } catch (_) {} host.remove(); },
  };
  api.render(props);
  return api;
}

function openAiPlanner(banner) {
  if (!banner.button('Plan with AI')) act(() => { banner.button('Change path').click(); });
  act(() => { banner.button('Plan with AI').click(); });
}


let mounted;
afterEach(()=>{mounted?.cleanup();mounted=null;vi.restoreAllMocks();vi.useRealTimers();});
const flush=async()=>act(async()=>{for(let i=0;i<10;i++)await Promise.resolve();});
function resume(){localStorage.setItem('allo_guided_saved_plans',JSON.stringify([{id:'river',name:'River lesson',title:'River lesson',stepIds:['faq'],goal:'Study rivers',estimatedMinutes:15,deliverySetting:'print',deliveryPriority:'access'}]));
 const plan={id:'draft',title:'Cloud lesson',name:'Cloud lesson',stepIds:['analysis','faq'],stepReasons:{analysis:'Check reading.'},deliverySetting:'print',deliveryPriority:'access',estimatedMinutes:20};
 localStorage.setItem('allo_guided_planner_draft',JSON.stringify({version:1,goal:'Teach cloud science in twenty minutes.',plan,answers:{},messages:[],refinement:'Keep the examples concrete.',updatedAt:new Date().toISOString()}));
 mounted=mountBanner(baseProps({guidedStep:0,guidedPresets:[],applyGuidedPreset:()=>{},generateGuidedPlanFromGoal:()=>{throw Error("No AI call expected");}}));openAiPlanner(mounted);act(()=>mounted.button('Resume draft').click());return mounted;
}
const blockKey=key=>{const original=Storage.prototype.setItem;return vi.spyOn(Storage.prototype,'setItem').mockImplementation(function(k,v){if(k===key)throw new DOMException('Storage full','QuotaExceededError');return original.call(this,k,v);});};
const click=(b,text)=>act(()=>{expect(b.button(text),[...b.host.querySelectorAll('button')].map(b=>b.textContent).join('|')).toBeTruthy();b.button(text).click();});
const closePlanner=b=>act(()=>b.host.querySelector('[aria-label="Close"]').click());

const load=b=>{act(()=>b.host.querySelector('.allo-guided-stage-nav button').click());if(!b.host.querySelector('#guided-saved-plans-list'))click(b,'Saved plans (');const btn=[...b.host.querySelectorAll('#guided-saved-plans-list button')].find(b=>b.textContent==='Load');act(()=>btn.click());};
it('keeps the unfinished plan until explicit discard and traps focus in the decision',async()=>{const b=resume();load(b);await act(async()=>{await new Promise(r=>setTimeout(r,0));});expect(b.text()).toContain('Replace your unfinished plan?');const dialog=b.host.querySelector('[role=alertdialog]');expect(dialog.contains(document.activeElement)).toBe(true);click(b,'Continue editing');act(()=>b.host.querySelectorAll('.allo-guided-stage-nav button')[2].click());expect(b.text()).toContain('Cloud lesson');load(b);click(b,'Discard draft and load');act(()=>b.host.querySelectorAll('.allo-guided-stage-nav button')[2].click());expect(b.text()).toContain('River lesson');expect(b.host.querySelector('[role=alertdialog]')).toBeNull();expect(localStorage.getItem('allo_guided_planner_draft')).toBeNull();});
it('retains the replacement decision and current draft when save fails, then saves before loading on retry',()=>{const b=resume(),before=localStorage.getItem('allo_guided_planner_draft'),fail=blockKey('allo_guided_saved_plans');load(b);click(b,'Save plan and load');expect(b.host.querySelector('[role=alertdialog]').textContent).toContain('could not be saved');expect(localStorage.getItem('allo_guided_planner_draft')).toBe(before);fail.mockRestore();click(b,'Save plan and load');const saved=JSON.parse(localStorage.getItem('allo_guided_saved_plans'));expect(saved.map(p=>p.title)).toEqual(['River lesson','Cloud lesson']);act(()=>b.host.querySelectorAll('.allo-guided-stage-nav button')[2].click());expect(b.text()).toContain('River lesson');});
it('Escape dismisses the replacement decision and keeps the unfinished plan',()=>{const b=resume();load(b);act(()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true})));expect(b.host.querySelector('[role=alertdialog]')).toBeNull();act(()=>b.host.querySelectorAll('.allo-guided-stage-nav button')[2].click());expect(b.text()).toContain('Cloud lesson');expect(localStorage.getItem('allo_guided_planner_draft')).not.toBeNull();});
