import { beforeAll, beforeEach, afterEach, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act, Simulate } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
let Banner, root, host;
const plansKey = 'allo_guided_saved_plans', draftKey = 'allo_guided_planner_draft';
const plan = n => ({ id: 'plan-' + n, name: 'Saved lesson ' + n, title: 'Saved lesson ' + n, goal: 'Study plants', stepIds: ['faq'], estimatedMinutes: 15 });
beforeAll(() => {
  global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule(resolve(process.env.GUIDED_SYNC_CANDIDATES || '.', 'view_guided_mode_banner_module.js'));
  Banner = window.AlloModules.GuidedModeBanner.GuidedModeBanner;
});
beforeEach(() => { localStorage.clear(); });
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); root = null; });
const button = text => [...host.querySelectorAll('button')].find(b => b.textContent.trim() === text) || [...host.querySelectorAll('button')].find(b => b.textContent.includes(text));
const click = text => { const b = button(text); expect(b).toBeTruthy(); act(() => b.click()); };
const flush = async () => act(async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); });
function mount(count, activeSavedId = null) {
  localStorage.setItem(plansKey, JSON.stringify(Array.from({ length: count }, (_, i) => plan(i))));
  localStorage.setItem(draftKey, JSON.stringify({ version: 1, goal: 'Create a new cloud science lesson.', plan: { ...plan('draft'), title: 'Cloud lesson' }, activeSavedId, messages: [], answers: {}, updatedAt: new Date().toISOString() }));
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  const steps = [{ id: 'source-input', label: 'Source', action: 'Add text' }, { id: 'analysis', label: 'Analyze', action: 'Check source' }, { id: 'faq', label: 'FAQ', action: 'Create FAQ' }];
  act(() => root.render(React.createElement(Banner, {
    GUIDED_STEPS: steps, allGuidedSteps: steps, GUIDED_TOUR_MAP: {}, guidedStep: 0, guidedRect: null,
    guidedEngaged: false, wizardOpen: false, guidedPresets: [], guidedSelectedIds: null,
    handleExitGuidedMode() {}, handleGuidedSkip() {}, setGuidedStep() {}, setShowGuidedTip() {},
    applyGuidedPreset() {}, t: () => '', history: [], tourSteps: [], inputText: '', setInputText() {},
    guidedCompletedIds: [], guidedSkippedIds: [], guidedCreatedHistoryIds: [], wordSoundsHistory: [],
    markGuidedStepDone() {}, getDefaultTitle: type => type, generateGuidedPlanFromGoal() { throw Error('Unexpected AI request'); }
  })));
  if (!button('Plan with AI')) click('Change path'); click('Plan with AI'); click('Resume draft');
}
async function importPlans(numbers) {
  act(() => host.querySelector('.allo-guided-stage-nav button').click());
  const file = { name: 'test-plans.json', size: 2000, text: async () => JSON.stringify({ format: 'alloflow-guided-plans', version: 1, plans: numbers.map(plan) }) };
  act(() => Simulate.change(host.querySelector('input[type=file]'), { target: { files: [file], value: 'test-plans.json' } }));
  await flush();
}

const stored = () => JSON.parse(localStorage.getItem(plansKey));
const external = plans => { const value = JSON.stringify(plans); localStorage.setItem(plansKey, value); return value; };
const describeStage = () => act(() => host.querySelector('.allo-guided-stage-nav button').click());
const changeWarning = () => expect(host.textContent).toContain('Saved plans changed in another window');

it('preserves an external addition before saving, refreshes the library and keeps the unfinished plan for retry', () => {
  mount(1); const draft = localStorage.getItem(draftKey), latest = external([plan(0), plan(1)]);
  click('Review plan'); click('Save plan');
  expect(localStorage.getItem(plansKey)).toBe(latest); expect(localStorage.getItem(draftKey)).toBe(draft);
  changeWarning(); expect(host.textContent).not.toContain('Plan saved on this device.');
  click('Save plan');
  expect(stored().slice(0, 2).map(p => p.id)).toEqual(['plan-0', 'plan-1']);
  expect(stored()).toHaveLength(3); expect(stored()[2].title).toBe('Cloud lesson');
  expect(localStorage.getItem(draftKey)).toBeNull();
});
it('requires review before overwriting an externally edited version of the active saved plan', () => {
  mount(1, 'plan-0'); const latest = external([{ ...plan(0), title: 'Fresh river lesson', name: 'Fresh river lesson', summary: 'Added in another window.' }]);
  click('Review plan'); click('Save changes');
  expect(localStorage.getItem(plansKey)).toBe(latest); changeWarning();
  describeStage(); expect(host.textContent).toContain('Fresh river lesson');
  expect(JSON.parse(localStorage.getItem(draftKey)).plan.title).toBe('Cloud lesson');
});
it('keeps external changes and dismisses an outdated delete confirmation before a new deliberate delete', () => {
  mount(1); describeStage(); click('Saved plans (1)'); click('Delete');
  expect(button('Delete plan')).toBeTruthy(); const latest = external([plan(0), plan(1)]);
  click('Delete plan'); expect(localStorage.getItem(plansKey)).toBe(latest); changeWarning();
  expect(button('Delete plan')).toBeFalsy(); expect(host.textContent).toContain('Saved lesson 1');
  click('Delete'); click('Delete plan'); expect(stored().map(p => p.id)).toEqual(['plan-1']);
});
it('refreshes duplicate classifications without losing the remaining import selection', async () => {
  mount(1); await importPlans([20, 21]); const latest = external([plan(0), plan(20)]);
  click('Import selected plans'); expect(localStorage.getItem(plansKey)).toBe(latest); changeWarning();
  const checks = host.querySelectorAll('[aria-labelledby=guided-import-preview-title] input[type=checkbox]');
  expect(checks[0].disabled).toBe(true); expect(checks[0].checked).toBe(false);
  expect(checks[1].disabled).toBe(false); expect(checks[1].checked).toBe(true);
  click('Import selected plans'); expect(stored().map(p => p.id)).toEqual(['plan-0', 'plan-20', 'plan-21']);
  expect(host.textContent).toContain('Imported 1 new Guided plan(s).');
});
it('refreshes an externally freed library space before applying the capacity limit', () => {
  mount(12); const latest = external(Array.from({ length: 11 }, (_, i) => plan(i + 1)));
  click('Review plan'); click('Save plan'); expect(localStorage.getItem(plansKey)).toBe(latest); changeWarning();
  click('Save plan'); expect(stored()).toHaveLength(12);
  expect(stored().slice(0, 11).map(p => p.id)).toEqual(Array.from({ length: 11 }, (_, i) => 'plan-' + (i + 1)));
  expect(stored()[11].title).toBe('Cloud lesson');
});
it('does not overwrite unreadable saved data or lose the unfinished plan', () => {
  mount(1); const draft = localStorage.getItem(draftKey); localStorage.setItem(plansKey, '{incomplete');
  click('Review plan'); click('Save plan');
  expect(localStorage.getItem(plansKey)).toBe('{incomplete'); expect(localStorage.getItem(draftKey)).toBe(draft);
  expect(host.textContent).toContain('Saved plans could not be checked');
  expect(host.textContent).not.toContain('Plan saved on this device.');
});

it('refreshes a pending load to the externally edited saved plan while keeping the unfinished plan until retry', () => {
  mount(1); describeStage(); click('Saved plans (1)'); click('Load');
  expect(button('Save plan and load')).toBeTruthy();
  const latest = external([{ ...plan(0), name: 'Fresh river lesson', title: 'Fresh river lesson' }]);
  click('Save plan and load'); expect(localStorage.getItem(plansKey)).toBe(latest); changeWarning();
  expect(button('Save plan and load')).toBeTruthy();
  click('Save plan and load'); click('Review plan');
  expect(host.textContent).toContain('Fresh river lesson');
  expect(stored().map(p => p.title)).toEqual(['Fresh river lesson', 'Cloud lesson']);
});

it('dismisses a pending load when the requested saved plan was removed externally', () => {
  mount(1); describeStage(); click('Saved plans (1)'); click('Load');
  const latest = external([]); click('Save plan and load');
  expect(localStorage.getItem(plansKey)).toBe(latest); changeWarning();
  expect(button('Save plan and load')).toBeFalsy();
  expect(JSON.parse(localStorage.getItem(draftKey)).plan.title).toBe('Cloud lesson');
  act(() => host.querySelectorAll('.allo-guided-stage-nav button')[2].click());
  expect(host.textContent).toContain('Cloud lesson');
});

