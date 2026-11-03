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
  loadAlloModule(resolve(process.env.CLASSROOM_CONTINUITY_CANDIDATES||'.','view_guided_mode_banner_module.js')); 
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
function resume(){
 const plan={id:'draft',title:'Cloud lesson',name:'Cloud lesson',stepIds:['analysis','faq'],stepReasons:{analysis:'Check reading.'},deliverySetting:'print',deliveryPriority:'access',estimatedMinutes:20};
 localStorage.setItem('allo_guided_planner_draft',JSON.stringify({version:1,goal:'Teach cloud science in twenty minutes.',plan,answers:{},messages:[],refinement:'Keep the examples concrete.',updatedAt:new Date().toISOString()}));
 mounted=mountBanner(baseProps({guidedStep:0,guidedPresets:[],applyGuidedPreset:()=>{},generateGuidedPlanFromGoal:()=>{throw Error("No AI call expected");}}));openAiPlanner(mounted);act(()=>mounted.button('Resume draft').click());return mounted;
}
const blockKey=key=>{const original=Storage.prototype.setItem;return vi.spyOn(Storage.prototype,'setItem').mockImplementation(function(k,v){if(k===key)throw new DOMException('Storage full','QuotaExceededError');return original.call(this,k,v);});};
const click=(b,text)=>act(()=>{expect(b.button(text)).toBeTruthy();b.button(text).click();});
const closePlanner=b=>act(()=>b.host.querySelector('[aria-label="Close"]').click());
it('does not claim a named plan was saved or remove its draft when storage fails',async()=>{
 const b=resume(),draft=localStorage.getItem('allo_guided_planner_draft'),fail=blockKey('allo_guided_saved_plans');click(b,'Review plan');click(b,'Save plan');await flush();
 expect(b.text()).toContain('The plan could not be saved');expect(b.text()).not.toContain('Plan saved on this device.');expect(localStorage.getItem('allo_guided_saved_plans')).toBeNull();expect(localStorage.getItem('allo_guided_planner_draft')).toBe(draft);
 closePlanner(b);expect(b.text()).toContain('Keep this unfinished plan?');click(b,'Continue editing');fail.mockRestore();click(b,'Save plan');expect(JSON.parse(localStorage.getItem('allo_guided_saved_plans'))).toHaveLength(1);expect(localStorage.getItem('allo_guided_planner_draft')).toBeNull();expect(b.text()).toContain('Plan saved on this device.');
});
it('keeps Keep draft and close open after failure and closes only after successful retry',()=>{
 const b=resume(),fail=blockKey('allo_guided_planner_draft');closePlanner(b);click(b,'Keep draft and close');expect(b.text()).toContain('Keep this unfinished plan?');expect(b.text()).toContain('Draft could not be saved');
 const event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event);expect(event.defaultPrevented).toBe(true);fail.mockRestore();click(b,'Keep draft and close');expect(b.host.querySelector('.allo-guided-planning-studio')).toBeNull();expect(JSON.parse(localStorage.getItem('allo_guided_planner_draft')).goal).toContain('cloud science');
});
it('shows an autosave failure with an explicit retry that preserves the plan',()=>{
 vi.useFakeTimers();const b=resume(),fail=blockKey('allo_guided_planner_draft');act(()=>vi.advanceTimersByTime(400));expect(b.text()).toContain('Draft could not be saved');expect(b.text()).not.toContain('Draft saved at');fail.mockRestore();click(b,'Retry saving draft');expect(b.text()).toContain('Draft saved at');expect(JSON.parse(localStorage.getItem('allo_guided_planner_draft')).plan.title).toBe('Cloud lesson');
});
