import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const mounted = [];

function installBrowserStubs() {
  window.matchMedia = window.matchMedia || (() => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  }));
  window.HTMLCanvasElement.prototype.getContext = function() {
    const noop = () => {};
    return {
      clearRect: noop, fillRect: noop, strokeRect: noop,
      beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop,
      arc: noop, fill: noop, stroke: noop, save: noop, restore: noop,
      translate: noop, rotate: noop, scale: noop, setTransform: noop,
      fillText: noop, measureText: () => ({ width: 0 }),
      createLinearGradient: () => ({ addColorStop: noop }),
      createRadialGradient: () => ({ addColorStop: noop }),
    };
  };
}

async function mountProbability(initialProbability, overrides = {}) {
  const config = window.StemLab._registry.probability;
  const container = document.createElement('div');
  document.body.appendChild(container);
  let latest = { probability: initialProbability };

  function Host() {
    const [toolData, setToolData] = React.useState({ probability: initialProbability });
    latest = toolData;
    return config.render(makeCtx({ toolData, setToolData, ...overrides }));
  }

  const root = ReactDOMClient.createRoot(container);
  await React.act(async () => root.render(React.createElement(Host)));
  mounted.push({ root, container });
  return { container, getState: () => latest };
}

beforeEach(() => {
  resetStemLab();
  document.body.innerHTML = '';
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  installBrowserStubs();
  loadTool('stem_lab/stem_tool_probability.js', 'probability');
});

afterEach(async () => {
  while (mounted.length) {
    const { root, container } = mounted.pop();
    await React.act(async () => root.unmount());
    container.remove();
  }
});


describe('Probability experiment navigation', () => {
 it('expands all experiments without resetting the current run', async () => {
  const runtime=await mountProbability({mode:'coin',trials:3,results:['H','T','H'],convergenceHistory:[]});
  const list=()=>runtime.container.querySelector('#probability-experiment-list');
  const more=()=>runtime.container.querySelector('[data-probability-more]');
  expect(list().querySelectorAll('button')).toHaveLength(5);
  const before=JSON.parse(JSON.stringify(runtime.getState().probability));
  await React.act(async()=>more().click());
  expect(list().querySelectorAll('button')).toHaveLength(13);
  expect(more().getAttribute('aria-expanded')).toBe('true');
  await React.act(async()=>more().click());
  expect(list().querySelectorAll('button')).toHaveLength(5);
  expect(runtime.getState().probability).toMatchObject(before);
 });
 it('keeps a saved advanced experiment visible when collapsed', async () => {
  const runtime=await mountProbability({mode:'tree',trials:0,results:[],convergenceHistory:[]});
  const list=runtime.container.querySelector('#probability-experiment-list');
  expect(list.querySelectorAll('button')).toHaveLength(6);
  expect(list.querySelector('[data-probability-mode="tree"]').getAttribute('aria-pressed')).toBe('true');
  await React.act(async()=>list.querySelector('[data-probability-mode="coin"]').click());
  expect(list.querySelectorAll('button')).toHaveLength(5);
  expect(runtime.getState().probability.mode).toBe('coin');
 });
});
