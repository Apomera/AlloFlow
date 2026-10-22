import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
let source, runtime, root, host, latest;

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

async function mount(api, ai, supportLevel = 'prompt') {
  const initial = api.normalize({
    title: 'Compare two garden plans', family: 'decide', scope: 'standard',
    plan: { supportLevel },
    brief: { context: 'A school garden comparison.', drivingQuestion: 'Which watering plan?', lockedLessonFacts: ['Water enters the soil.'] },
    workspace: { workingQuestion: 'Which watering plan?', response: 'Compare two watering methods.', evidence: 'My lesson evidence note.' },
    supports: { phasePrompts: { workingQuestion: 'Question-stage thinking prompt.', evidence: 'Evidence-stage thinking prompt.', response: 'Response-stage thinking prompt.' },
      parallelExample: { context: 'A separate tree shade decision.', move: 'Compare how the options use a lesson idea.', whyItHelps: 'Keep the tradeoff visible.' } },
    coachHint: 'A saved coaching hint.',
  });
  function App() {
    const [value, setValue] = React.useState(initial);
    latest = value;
    return React.createElement(api.View, {
      generatedContent: { id: 'support-visibility', type: 'applied-challenge', data: value },
      isTeacherMode: false, activeProfileId: 'support-visibility', callGemini: ai, searchWeb: null,
      handleNoteUpdate: (key, change) => setValue(old => ({ ...old, [key]: typeof change === 'function' ? change(old[key]) : change })),
    });
  }
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  await act(async () => root.render(React.createElement(App)));
}

function buttons(label) { return [...host.querySelectorAll('button')].filter(button => button.textContent.trim() === label); }
async function click(label) {
  const matches = buttons(label);
  expect(matches, label).toHaveLength(1);
  await act(async () => matches[0].click());
}
async function focusField(id) {
  const textarea = host.querySelector('#applied-workspace-' + id);
  expect(textarea).toBeTruthy();
  for (let parent = textarea.parentElement; parent; parent = parent.parentElement) if (parent.tagName === 'DETAILS') parent.open = true;
  await act(async () => textarea.focus());
}

describe.each(['edited source', 'generated runtime'])('Applied support across workspace layouts: %s', implementation => {
  const api = () => implementation === 'edited source' ? source : runtime;

  it('retains saved guidance and one set of support controls while toggling all steps', async () => {
    await mount(api(), vi.fn().mockResolvedValue('One new hint.'));
    const before = structuredClone(latest);
    await click('Show all steps');
    expect(host.querySelectorAll('.aps-stage')).toHaveLength(5);
    expect(host.textContent).toContain('A saved coaching hint.');
    for (const label of ['Show a thinking prompt', 'See a parallel example', 'Ask for one hint']) {
      expect(buttons(label)).toHaveLength(1);
      expect(buttons(label)[0].closest('[hidden]')).toBeNull();
    }
    await click('Show a thinking prompt'); await click('See a parallel example');
    expect(host.querySelector('#aps-thinking-prompt').hidden).toBe(false);
    expect(host.querySelector('#aps-parallel-example').hidden).toBe(false);
    expect(host.querySelector('#aps-parallel-example').textContent).toContain('A separate tree shade decision.');
    await click('Focus on one step'); await click('Show all steps');
    expect(host.querySelectorAll('#aps-thinking-prompt')).toHaveLength(1);
    expect(host.querySelectorAll('#aps-parallel-example')).toHaveLength(1);
    expect(buttons('Ask for one hint')).toHaveLength(1);
    expect(latest).toEqual(before);
  });

  it('uses the focused writing section for prompts and AI hints with every step visible', async () => {
    const ai = vi.fn().mockResolvedValue('Explain what that lesson evidence shows.');
    await mount(api(), ai); const writing = structuredClone(latest.workspace);
    await click('Show all steps'); await focusField('evidence');
    await click('Show a thinking prompt');
    expect(host.querySelector('#aps-thinking-prompt').textContent).toContain('Evidence-stage thinking prompt.');
    await click('Ask for one hint');
    expect(ai).toHaveBeenCalledTimes(1);
    expect(ai.mock.calls[0][0]).toContain('Current phase: 4. Connect evidence and lesson ideas.');
    expect(host.textContent).toContain('Explain what that lesson evidence shows.');
    await focusField('response'); await click('Ask for one hint');
    expect(ai).toHaveBeenCalledTimes(2);
    expect(ai.mock.calls[1][0]).toContain('Current phase: 7. Build the deliverable.');
    expect(host.querySelector('#aps-thinking-prompt').textContent).toContain('Response-stage thinking prompt.');
    expect(latest.workspace).toEqual(writing);
  });

  it('keeps optional help reachable for an independent start in the all-steps layout', async () => {
    await mount(api(), vi.fn().mockResolvedValue('One new hint.'), 'independent');
    await click('Show all steps');
    expect(buttons('Show support for this step')).toHaveLength(1);
    expect(buttons('Ask for one hint')[0].closest('[hidden]')).not.toBeNull();
    await click('Show support for this step');
    expect(buttons('Ask for one hint')[0].closest('[hidden]')).toBeNull();
    expect(host.textContent).toContain('A saved coaching hint.');
  });
});
