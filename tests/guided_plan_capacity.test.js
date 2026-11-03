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
  loadAlloModule(resolve(process.env.GUIDED_CAPACITY_CANDIDATES || '.', 'view_guided_mode_banner_module.js'));
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

it('keeps all twelve saved plans and the unfinished draft when a new save would exceed the limit', () => {
  mount(12); const before = localStorage.getItem(plansKey), draft = localStorage.getItem(draftKey);
  click('Review plan'); click('Save plan');
  expect(localStorage.getItem(plansKey)).toBe(before);
  expect(localStorage.getItem(draftKey)).toBe(draft);
  expect(host.textContent).toContain('Your saved-plan library is full');
  expect(host.textContent).not.toContain('Plan saved on this device.');
});
it('allows updating an existing plan in a full library without changing the other eleven plans', () => {
  mount(12, 'plan-0'); const before = JSON.parse(localStorage.getItem(plansKey));
  click('Review plan'); click('Save changes');
  const after = JSON.parse(localStorage.getItem(plansKey));
  expect(after).toHaveLength(12); expect(after.map(p => p.id)).toEqual(before.map(p => p.id));
  expect(after[0].title).toBe('Cloud lesson');
  expect(after.slice(1).map(p => p.title)).toEqual(before.slice(1).map(p => p.title));
  expect(localStorage.getItem(draftKey)).toBeNull();
});
it('keeps an oversized import review open and lets the teacher reduce the selection to the available space', async () => {
  mount(11); const before = localStorage.getItem(plansKey);
  await importPlans([20, 21, 22]); click('Import selected plans');
  expect(localStorage.getItem(plansKey)).toBe(before);
  expect(host.textContent).toContain('Choose fewer plans');
  const preview = host.querySelector('[aria-labelledby=guided-import-preview-title]'); expect(preview).toBeTruthy();
  const checks = preview.querySelectorAll('input[type=checkbox]');
  act(() => { checks[0].click(); checks[1].click(); }); click('Import selected plans');
  const after = JSON.parse(localStorage.getItem(plansKey));
  expect(after).toHaveLength(12); expect(after.slice(0, 11).map(p => p.id)).toEqual(Array.from({ length: 11 }, (_, i) => 'plan-' + i));
  expect(after[11].id).toBe('plan-22'); expect(host.querySelector('[aria-labelledby=guided-import-preview-title]')).toBeNull();
  expect(host.textContent).toContain('Imported 1 new Guided plan(s).');
});
it('imports exactly the available number without removing any existing plans', async () => {
  mount(10); await importPlans([20, 21]); click('Import selected plans');
  const after = JSON.parse(localStorage.getItem(plansKey));
  expect(after.map(p => p.id)).toEqual([...Array.from({ length: 10 }, (_, i) => 'plan-' + i), 'plan-20', 'plan-21']);
  expect(host.textContent).toContain('Imported 2 new Guided plan(s).');
});
