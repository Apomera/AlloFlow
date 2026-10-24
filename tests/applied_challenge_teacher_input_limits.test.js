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

async function mount(api) {
  const initial = api.normalize({
    title: 'Compare two school gardens', family: 'decide', scope: 'standard', agencyMode: 'progressive',
    instructions: 'Compare the supplied garden plans.',
    plan: { learningTarget: 'Apply infiltration.', availableTime: '20 minutes', materials: 'Paper and diagrams.' },
    brief: {
      context: 'Compare two watering options.', drivingQuestion: 'Which option fits our garden?',
      seedDirection: 'Consider how water soaks into soil.', lockedLessonFacts: ['Water can soak into soil.'],
      factSources: [{ id: 'fact-water', text: 'Water can soak into soil.', sourceQuote: 'Water can soak into soil.', sourceLocation: 'Paragraph 1' }],
    },
    sourceExcerpt: 'Water can soak into soil.',
    visual: { image: 'https://example.test/garden.png', alt: 'Two empty garden beds.', purpose: 'Show the bounded garden setting.' },
  });
  function App() {
    const [value, setValue] = React.useState(initial);
    latest = value;
    return React.createElement(api.View, {
      generatedContent: { id: 'teacher-input-limits', type: 'applied-challenge', data: value },
      isTeacherMode: true, learnerReadOnly: false, activeProfileId: 'teacher-input-limits', allowRuntimeAi: false,
      handleNoteUpdate: (key, change) => setValue(old => ({ ...old, [key]: typeof change === 'function' ? change(old[key]) : change })),
    });
  }
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  await act(async () => root.render(React.createElement(App)));
  const edit = [...host.querySelectorAll('button')].find(node => node.textContent.trim() === 'Edit challenge brief');
  expect(edit).toBeTruthy();
  await act(async () => edit.click());
  for (const details of host.querySelectorAll('details')) details.open = true;
}

function findEditor(field) {
  if (field.aria) {
    const matches = [...host.querySelectorAll('input, textarea')].filter(node => node.getAttribute('aria-label') === field.aria);
    expect(matches, field.name).toHaveLength(1);
    return matches[0];
  }
  // Only direct label text belongs to the name. AcTextarea also renders a
  // print-only copy of its current value inside the label.
  const labels = [...host.querySelectorAll('label')].filter(label => [...label.childNodes]
    .filter(node => node.nodeType === 3).map(node => node.textContent).join('').trim() === field.label);
  expect(labels, field.name).toHaveLength(1);
  return labels[0].querySelector('input, textarea');
}

async function enter(editor, text) {
  await act(async () => {
    const prototype = editor.tagName === 'INPUT' ? window.HTMLInputElement.prototype : window.HTMLTextAreaElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(editor, text);
    editor.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

const fields = [
  { name: 'title', aria: 'Challenge title', max: 300, read: data => data.title },
  { name: 'context', aria: 'Challenge context', max: 4000, read: data => data.brief.context },
  { name: 'role', aria: 'Student role', max: 500, read: data => data.brief.role },
  { name: 'audience', aria: 'Challenge audience', max: 500, read: data => data.brief.audience },
  { name: 'driving question', aria: 'Driving question', max: 2000, read: data => data.brief.drivingQuestion },
  { name: 'lesson direction', aria: 'Lesson-grounded challenge direction', max: 2000, read: data => data.brief.seedDirection },
  { name: 'deliverable', aria: 'Challenge deliverable', max: 1200, read: data => data.brief.deliverable },
  { name: 'evidence boundary', aria: 'Evidence boundary', max: 2000, read: data => data.brief.evidenceBoundary },
  { name: 'student instructions', label: 'Applied challenge student instructions', max: 3000, read: data => data.instructions },
  { name: 'learning target', label: 'Lesson idea to apply', max: 1200, read: data => data.plan.learningTarget },
  { name: 'available time', label: 'Available time', max: 100, read: data => data.plan.availableTime },
  { name: 'materials', label: 'Available materials and limits', max: 1200, read: data => data.plan.materials },
  { name: 'fact source excerpt', label: 'Supporting source excerpt', max: 1600, read: data => data.brief.factSources.find(fact => fact.id === 'fact-water').sourceQuote },
  { name: 'fact source location', label: 'Source location', max: 300, read: data => data.brief.factSources.find(fact => fact.id === 'fact-water').sourceLocation },
  { name: 'question starter', label: 'Optional question starter', max: 2200, read: data => data.supports.frameStarter },
  { name: 'example context', label: 'Parallel example context', max: 1800, read: data => data.supports.parallelExample.context },
  { name: 'example reasoning', label: 'Reasoning move', max: 2500, read: data => data.supports.parallelExample.move },
  { name: 'example explanation', label: 'What to notice', max: 1800, read: data => data.supports.parallelExample.whyItHelps },
  ...[
    ['workingQuestion', '1. Frame the challenge'],
    ['stakeholders', '2. Map people, systems, and constraints'],
    ['possibilities', '3. Options worth considering'],
    ['evidence', '4. Connect evidence and lesson ideas'],
    ['assumptions', '5. Name assumptions and uncertainties'],
    ['tradeoffs', '6. Weigh tradeoffs and alternatives'],
    ['response', '7. Recommendation and rationale'],
    ['testReflection', '8. Challenge the recommendation with the strongest alternative'],
    ['revision', '9. Keep or revise after checking'],
    ['transferReflection', '10. Explain the transfer'],
  ].map(([key, label]) => ({ name: 'phase prompt ' + key, label, max: 1200, read: data => data.supports.phasePrompts[key] })),
  { name: 'illustration purpose', label: 'What should the illustration help learners understand?', max: 1200, read: data => data.visual.purpose },
  { name: 'image description', label: 'Image description', max: 1200, read: data => data.visual.alt },
];

describe.each(['edited source', 'generated runtime'])('Applied teacher prose capacity: %s', implementation => {
  it.each(fields)('keeps supported edits and existing suffix text for $name', async field => {
    const api = implementation === 'edited source' ? source : runtime;
    await mount(api);
    const editor = findEditor(field);
    expect(editor).toBeTruthy();
    // Native limits prevent inserting into a full field from silently
    // displacing the saved ending when the controlled normalizer runs.
    expect(editor.maxLength).toBe(field.max);
    const full = 'Beginning ' + 'x'.repeat(field.max - 'Beginning '.length - ' retained ending'.length) + ' retained ending';
    await enter(editor, full);
    expect(field.read(latest)).toBe(full);
    expect(editor.value).toBe(full);
    const revised = full.slice(0, 20) + 'my edit' + full.slice(40);
    await enter(editor, revised);
    expect(field.read(latest)).toBe(revised);
    expect(editor.value).toBe(revised);
    expect(editor.value.endsWith(' retained ending')).toBe(true);
    expect(field.read(api.normalize(latest))).toBe(revised);
  });
});
