import {beforeAll, beforeEach, afterEach, it, expect, vi} from 'vitest';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {loadAlloModule} from './setup.js';
const require = createRequire(import.meta.url);
let React, createRoot, act, Banner, root, host;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({createRoot} = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  ({act} = require(resolve('desktop/web-app/node_modules/react-dom/test-utils')));
  global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true;
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  loadAlloModule(resolve(process.env.CLASSROOM_PRESERVE_CANDIDATES || '.', 'view_guided_mode_banner_module.js'));
  Banner = window.AlloModules.GuidedModeBanner.GuidedModeBanner;
});
beforeEach(() => localStorage.clear());
function close() { if (root) act(() => root.unmount()); root = null; host?.remove(); }
afterEach(() => { close(); vi.restoreAllMocks(); localStorage.clear(); });
const steps = [{id:'source-input',label:'Source'}, {id:'analysis',label:'Analysis'}, {id:'_final',label:'Finish'}];
function render(text, ids = ['lesson-a'], extra = {}) {
  if (!root) { host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); }
  const props = {GUIDED_STEPS:steps,allGuidedSteps:steps,GUIDED_TOUR_MAP:{},guidedStep:1,t:()=>'',tourSteps:[],history:[],
    guidedCreatedHistoryIds:ids,guidedSourceResourceIds:ids,guidedCompletedIds:[],guidedSkippedIds:[],wordSoundsHistory:[],
    setGuidedStep:vi.fn(),setInputText:vi.fn(),setShowGuidedTip:vi.fn(),handleExitGuidedMode:vi.fn(),handleGuidedSkip:vi.fn(),inputText:text,...extra};
  act(() => root.render(React.createElement(Banner, props)));
}
const warning = () => [...host.querySelectorAll('[role="alert"]')].some(node => /source.*changed/i.test(node.textContent));
it('retains the original reference through close/reopen and still clears after undo', () => {
  render('Plants need water.'); expect(warning()).toBe(false);
  render('Plants need water and sun.'); expect(warning()).toBe(true);
  close(); render('Plants need water and sun.'); expect(warning()).toBe(true);
  render('Plants need water.'); expect(warning()).toBe(false);
  close(); render('Plants need water.'); expect(warning()).toBe(false);
  expect(localStorage.getItem('allo_guided_source_baseline')).not.toContain('Plants');
});
it('keeps the reference when current-source filtering hides older lesson resources', () => {
  render('Original.');
  render('Edited.', [], {guidedSourceResourceIds:['lesson-a'],hasEarlierGuidedResources:true});
  close(); render('Edited.', [], {guidedSourceResourceIds:['lesson-a'],hasEarlierGuidedResources:true});
  expect(warning()).toBe(true);
});
it('isolates different lessons and restores the earlier lesson reference', () => {
  render('First original.'); render('First edited.');
  render('Second original.', ['lesson-b']); expect(warning()).toBe(false);
  close(); render('First edited.'); expect(warning()).toBe(true);
  render('Second original.', ['lesson-b']); expect(warning()).toBe(false);
});
it('tracks a fresh source before its first resource and accepts additional resource IDs', () => {
  render('Draft.', []); render('Final draft.', []); render('Final draft.', ['new-a']);
  render('Changed.', ['new-a','new-b']); expect(warning()).toBe(true);
  close(); render('Changed.', ['new-a','new-b']); expect(warning()).toBe(true);
  render('Final draft.', ['new-a','new-b']); expect(warning()).toBe(false);
});
it('handles malformed storage and reports unavailable persistence without losing the live warning', () => {
  localStorage.setItem('allo_guided_source_baseline', '{bad'); render('Original.');
  vi.spyOn(Storage.prototype,'setItem').mockImplementation(() => { throw Error('quota'); });
  render('Changed.'); expect(warning()).toBe(true);
  expect(host.textContent).toContain('Source-change reminders could not be saved');
});
