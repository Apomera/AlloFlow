import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

async function settleFocus() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('Learning Lab focus helper binding', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');

  it('every component that moves focus defines its own focus helper (regression: free focusById was a ReferenceError on save)', () => {
    const componentPattern = /^  function (\w+)\(/gm;
    const marks = [];
    let match;
    while ((match = componentPattern.exec(source))) marks.push({ name: match[1], index: match.index });
    const unbound = [];
    for (let i = 0; i < marks.length; i++) {
      const slice = source.slice(marks[i].index, marks[i + 1] ? marks[i + 1].index : source.length);
      const callsFocusById = /(?<!function )focusById\(/.test(slice);
      const callsFocusId = /(?<!function )(?<!By)focusId\(/.test(slice);
      if (callsFocusById && !slice.includes('function focusById')) unbound.push(marks[i].name + ':focusById');
      if (callsFocusId && !slice.includes('function focusId')) unbound.push(marks[i].name + ':focusId');
    }
    expect(unbound).toEqual([]);
  });

  it('allows timer-based focus only at the two accepted exception sites', () => {
    // Accepted exceptions: (1) the shell's post-navigation focusCurrentView,
    // whose target exists across renders; (2) the render-error catch path,
    // where React hooks cannot be used. Every component-level focus helper
    // must use the render-synchronized pendingFocus pattern instead.
    const timerFocus = source.match(/setTimeout\(function\(\) \{\s*if \(typeof document === 'undefined'\) return;/g) || [];
    expect(timerFocus).toHaveLength(2);
    expect(source).toContain('function focusCurrentView(nextView) { setTimeout(');
    expect(source).toContain("console.error('[LearningLab] render error', e);");
    expect(source.match(/setTimeout\(function\(\) \{ var target = document\.getElementById/g)).toBeNull();
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('prismflow-deploy/public/stem_lab/stem_tool_learning_lab.js'));
  });
});

describe('Worry Time save flow after focus binding fix (rendered smoke)', () => {
  let host;
  let root2;

  afterEach(() => {
    if (root2) act(() => root2.unmount());
    if (host) host.remove();
  });

  it('rejects a blank worry with an announcement and focuses the input instead of throwing', async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initial = { learningLab: { view: 'mytkWorry', viewLabel: 'Worry Time', mytkWorry: { worries: [] } } };
    const Component = () => {
      const [toolData, setToolData] = React.useState(initial);
      const ctx = makeCtx({ toolData, update: (toolId, key, value) => setToolData((previous) => ({ ...previous, [toolId]: { ...(previous[toolId] || {}), [key]: value } })) });
      return config.render(ctx);
    };
    host = document.createElement('div');
    document.body.appendChild(host);
    root2 = ReactDOMClient.createRoot(host);
    await act(async () => { root2.render(React.createElement(Component)); await Promise.resolve(); });
    const input = host.querySelector('#learning-lab-worry-input');
    expect(input).not.toBeNull();
    const form = input.closest('form');
    expect(form).not.toBeNull();
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settleFocus(); });
    expect(document.activeElement).toBe(host.querySelector('#learning-lab-worry-input'));
  });
});
