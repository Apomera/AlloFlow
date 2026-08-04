// EvoLab "Selection pressure discovery" — the panel must survive its own
// state writes.
//
// This module keeps everything (slider values, the hypothesis text, the
// observation log) in ctx.toolData rather than local component state, so every
// slider step and every keystroke re-renders the STEM Lab host. The host calls
// tool.render(ctx) inline, which means anything the tool builds inside render()
// gets a fresh identity on each host render. Dispatching this view through an
// anonymous component therefore handed React a different element type at the
// same position every single time — React's rule is that a changed type
// unmounts the old subtree and mounts a new one, so the whole panel was torn
// down and rebuilt mid-interaction. Aaron reported it as the contents
// blanking/resetting and jumping.
//
// SSR cannot see this: renderToStaticMarkup produces one render and never
// reconciles. So this mounts the tool against a real client root that models
// the host's toolData ownership, writes state the way the UI does, and asserts
// the underlying DOM nodes are the SAME objects afterwards. Node identity is
// the invariant — it is what preserves caret position, focus, and an in-flight
// slider drag.
import { beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;

function mountEvoLab(initialToolData) {
  const cfg = window.StemLab._registry.evoLab;
  const container = document.createElement('div');
  document.body.appendChild(container);

  // Mirrors the host: toolData lives above the tool, and ctx.update merges into
  // it functionally (stem_lab_module.js ctx.update).
  function Host() {
    const [toolData, setToolData] = React.useState(initialToolData);
    const ctx = makeCtx({
      toolData: toolData,
      update: function (toolId, key, val) {
        setToolData(function (prev) {
          const toolState = Object.assign({}, (prev && prev[toolId]) || {});
          toolState[key] = val;
          const patch = {};
          patch[toolId] = toolState;
          return Object.assign({}, prev, patch);
        });
      }
    });
    return cfg.render(ctx);
  }

  const root = ReactDOMClient.createRoot(container);
  act(function () { root.render(React.createElement(Host)); });
  return { container, root };
}

// React installs its own value setter on the input prototype; assigning
// node.value directly is invisible to it. Go through the native descriptor,
// then dispatch the event React actually listens for.
function setNativeValue(node, value) {
  const prototype = node instanceof window.HTMLTextAreaElement
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, value);
  node.dispatchEvent(new window.Event('input', { bubbles: true }));
}

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_evolab.js', 'evoLab');
  document.body.innerHTML = '';
});

describe('EvoLab selection-pressure panel survives its own state writes', () => {
  it('keeps the same slider and textarea DOM nodes across a slider change', () => {
    const { container } = mountEvoLab({ evoLab: { view: 'pressureHunt' } });

    const slider = container.querySelector('#ph-camouflage');
    const textarea = container.querySelector('textarea');
    expect(slider).toBeTruthy();
    expect(textarea).toBeTruthy();
    expect(slider.value).toBe('50');

    act(function () { setNativeValue(slider, '73'); });

    // Same nodes, not replacements: a remount would have swapped both.
    expect(container.querySelector('#ph-camouflage')).toBe(slider);
    expect(container.querySelector('textarea')).toBe(textarea);
    // ...and the write actually landed.
    expect(container.querySelector('#ph-camouflage').value).toBe('73');
  });

  it('keeps focus and the caret in the hypothesis box while typing', () => {
    const { container } = mountEvoLab({ evoLab: { view: 'pressureHunt' } });

    const textarea = container.querySelector('textarea');
    textarea.focus();
    expect(document.activeElement).toBe(textarea);

    act(function () { setNativeValue(textarea, 'Harshness'); });
    act(function () { setNativeValue(container.querySelector('textarea'), 'Harshness tips it'); });

    expect(container.querySelector('textarea')).toBe(textarea);
    expect(document.activeElement).toBe(textarea);
    expect(textarea.value).toBe('Harshness tips it');
  });

  it('appends to the observation log without rebuilding the panel', () => {
    const { container } = mountEvoLab({ evoLab: { view: 'pressureHunt' } });

    const panelBefore = container.firstElementChild;
    const logButton = Array.from(container.querySelectorAll('button'))
      .find(function (b) { return (b.textContent || '').includes('Log'); });
    expect(logButton).toBeTruthy();

    act(function () { logButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); });

    expect(container.firstElementChild).toBe(panelBefore);
    expect(container.querySelectorAll('tbody tr').length).toBe(1);
  });
});
