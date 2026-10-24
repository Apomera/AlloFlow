import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
let source, runtime, host, root, latest;

beforeAll(() => {
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const compiled = require('@babel/core').transformSync(readFileSync(resolve('applied_challenge_source.jsx'), 'utf8'), {
    plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false,
  }).code;
  source = new Function('React', compiled + '\nreturn { View: AppliedChallengeView, normalize: normalizeAppliedChallengeData };')(React);
  loadAlloModule('applied_challenge_module.js');
  runtime = { View: window.AlloModules.AppliedChallengeView, normalize: window.AlloModules.AppliedChallenge.normalize };
}, 60000);

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null; host?.remove(); host = null; sessionStorage.clear();
});

const fields = [
  { key: 'lockedLessonFacts', group: 'brief', name: 'Teacher-checked lesson facts', max: 12, length: 800 },
  { key: 'openQuestions', group: 'brief', name: 'Open questions or unknowns', max: 10, length: 800 },
  { key: 'stakeholders', group: 'brief', name: 'Challenge stakeholders', max: 12, length: 500 },
  { key: 'criteria', group: 'brief', name: 'Challenge success criteria', max: 12, length: 700 },
  { key: 'constraints', group: 'brief', name: 'Challenge constraints', max: 12, length: 700 },
  { key: 'frameChoices', group: 'supports', name: 'Possible directions (one per line)', max: 8, length: 700 },
  { key: 'coachPrompts', group: 'supports', name: 'Thinking prompts (one per line)', max: 10, length: 700 },
];

async function mount(api, field, items, locked = false) {
  const initial = api.normalize({
    title: 'Compare a school garden plan', family: 'decide', scope: 'standard',
    brief: { context: 'Compare two watering options.', drivingQuestion: 'Which plan should we choose?',
      lockedLessonFacts: ['Water soaks into soil.'], criteria: ['Use the supplied lesson.'],
      constraints: ['Use supplied diagrams.'], factLocked: locked, factVerified: true,
      ...(field.group === 'brief' ? { [field.key]: items } : {}) },
    supports: field.group === 'supports' ? { [field.key]: items } : {},
  });
  function App() {
    const [value, setValue] = React.useState(initial);
    latest = value;
    return React.createElement(api.View, {
      generatedContent: { id: 'teacher-list-limits', type: 'applied-challenge', data: value },
      isTeacherMode: true, activeProfileId: 'teacher-list-limits', allowRuntimeAi: false,
      handleNoteUpdate: (key, change) => setValue(old => api.normalize({ ...old, [key]: typeof change === 'function' ? change(old[key]) : change })),
    });
  }
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  await act(async () => root.render(React.createElement(App)));
  const edit = [...host.querySelectorAll('button')].find(item => item.textContent.trim() === 'Edit challenge brief');
  if (edit) await act(async () => edit.click());
  for (const details of host.querySelectorAll('details')) details.open = true;
  return textarea(field);
}

function textarea(field) {
  const el = [...host.querySelectorAll('textarea')].find(node => node.getAttribute('aria-label') === field.name || node.closest('label')?.textContent.trim().startsWith(field.name));
  expect(el, field.name).toBeTruthy();
  return el;
}

async function enter(el, text) {
  await act(async () => {
    el.focus();
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(el, text);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function capacityStatus(el, field) {
  const status = [...host.querySelectorAll('[role="status"]')].find(node => node.textContent.includes('Your last change was not added'));
  expect(status).toBeTruthy();
  expect(status.textContent).toContain(`up to ${field.max} items`);
  expect(status.textContent).toContain(`${field.length} characters`);
  expect(el.getAttribute('aria-describedby').split(' ')).toContain(status.id);
  return status;
}

describe.each(['edited source', 'generated runtime'])('Applied teacher list editing capacity: %s', implementation => {
  const api = () => implementation === 'edited source' ? source : runtime;

  it.each(fields)('rejects additional items in $name while preserving every saved item', async field => {
    const items = Array.from({ length: field.max }, (_, index) => `Existing item ${index + 1}`);
    const original = items.join('\n'), el = await mount(api(), field, items);
    await enter(el, original + '\nAn extra item');
    expect(el.value).toBe(original);
    expect(latest[field.group][field.key]).toEqual(items);
    capacityStatus(el, field);

    // Blank lines and whitespace remain editable; they do not consume an item
    // slot or cause a later meaningful line to disappear during normalization.
    const spaced = '  ' + items.slice(0, -1).join('\n\n') + '\n\nReplacement item  ';
    await enter(el, spaced);
    expect(el.value).toBe(spaced);
    expect(latest[field.group][field.key]).toEqual([...items.slice(0, -1), 'Replacement item']);
    expect([...host.querySelectorAll('[role="status"]')].some(node => node.textContent.includes('Your last change was not added'))).toBe(false);
    await act(async () => el.blur());
    expect(el.value).toBe([...items.slice(0, -1), 'Replacement item'].join('\n'));
  });

  it.each(fields)('protects suffix text when a full $name line receives an insertion or paste', async field => {
    const full = 'Beginning ' + 'x'.repeat(field.length - 'Beginning '.length - ' retained ending'.length) + ' retained ending';
    const el = await mount(api(), field, [full]);
    // A total textarea length bound cannot protect a per-item storage bound.
    // Reject the whole change instead of normalizing away the retained ending.
    await enter(el, 'inserted ' + full);
    expect(el.value).toBe(full);
    expect(latest[field.group][field.key]).toEqual([full]);
    capacityStatus(el, field);
    await enter(el, full + '\n' + 'p'.repeat(field.length + 1));
    expect(el.value).toBe(full);
    expect(latest[field.group][field.key]).toEqual([full]);
    capacityStatus(el, field);

    const replacement = full.slice(0, 20) + 'my edit' + full.slice(40);
    await enter(el, replacement);
    expect(el.value).toBe(replacement);
    expect(latest[field.group][field.key]).toEqual([replacement]);
    expect(el.value.endsWith(' retained ending')).toBe(true);
    expect([...host.querySelectorAll('[role="status"]')].some(node => node.textContent.includes('Your last change was not added'))).toBe(false);
  });

  it('keeps fact lock help associated when capacity status appears and preserves verification for rejected changes', async () => {
    const field = fields[0], items = Array.from({ length: field.max }, (_, index) => `Lesson fact ${index + 1}`);
    const el = await mount(api(), field, items, true);
    expect(el.readOnly).toBe(true);
    expect(el.getAttribute('aria-describedby')).toBe('applied-facts-lock-help');
    expect(host.querySelector('#applied-facts-lock-help').textContent).toContain('teacher verified');
    const unlock = [...host.querySelectorAll('button')].find(item => item.textContent.trim() === 'Unlock facts to edit');
    expect(unlock).toBeTruthy();
    await act(async () => unlock.click());
    expect(el.readOnly).toBe(false);
    await enter(el, items.join('\n') + '\nExtra fact');
    capacityStatus(el, field);
    expect(el.getAttribute('aria-describedby').split(' ')).toContain('applied-facts-lock-help');
    expect(latest.brief.factVerified).toBe(true);
    expect(latest.brief.lockedLessonFacts).toEqual(items);
    await enter(el, 'Revised fact\n' + items.slice(1).join('\n'));
    expect(latest.brief.factVerified).toBe(false);
    expect(el.getAttribute('aria-describedby')).toBe('applied-facts-lock-help');
    expect(latest.brief.lockedLessonFacts[0]).toBe('Revised fact');
  });
});
