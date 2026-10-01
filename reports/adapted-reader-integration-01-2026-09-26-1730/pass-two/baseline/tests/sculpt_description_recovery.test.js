import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const originalThree = window.THREE, originalModules = window.AlloModules;
let root, host, config, latest, changeData, provider, toast;
const recipe = name => ({ name, parts: [{ shape: 'box', size: [1, 1, 1], position: [0, 0.5, 0], rotation: [0, 0, 0], color: '#22c55e' }] });

beforeEach(() => {
  resetStemLab();
  class Scene { add() {} remove() {} traverse() {} }
  class Camera { position = { set() {} }; lookAt() {} }
  class Renderer { setSize() {} render() {} dispose() {} forceContextLoss() {} }
  class Light { position = { set() {} }; }
  window.THREE = { Scene, Color: class {}, PerspectiveCamera: Camera, WebGLRenderer: Renderer, DirectionalLight: Light, AmbientLight: Light, GridHelper: class {} };
  window.AlloModules = {};
  new Function(readFileSync('prim3d_module.js', 'utf8'))();
  window.AlloModules.Prim3D.buildObject = () => ({ traverse() {} });
  vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
  config = loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
  provider = vi.fn(); toast = vi.fn();
  host = document.createElement('div'); document.body.append(host);
  root = ReactDOMClient.createRoot(host);
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host.remove(); vi.restoreAllMocks();
  window.THREE = originalThree; window.AlloModules = originalModules;
  delete window.__alloPrintLabPendingHandoff;
});

async function mount() {
  function Harness() {
    const [data, setData] = React.useState({ artStudio: { tab: 'sculpt3d', studioStarted: true, sculptRecipe: recipe('Original'), sculptText: 'Make the base wider' } });
    latest = data;
    changeData = patch => setData(previous => ({ ...previous, artStudio: { ...previous.artStudio, ...patch } }));
    return config.render(makeCtx({ toolData: data, setToolData: setData, callGemini: provider, addToast: toast }));
  }
  await act(async () => root.render(React.createElement(Harness)));
}

async function generate() {
  await act(async () => { host.querySelector('[aria-label="Refine sculpture with AI"]').click(); await Promise.resolve(); });
}

it('keeps a manual edit when an older description response arrives', async () => {
  let finish;
  provider.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await mount(); await generate();
  await act(async () => changeData({ sculptRecipe: recipe('Manual change') }));
  await act(async () => { finish(JSON.stringify(recipe('Stale AI result'))); });
  expect(latest.artStudio.sculptRecipe.name).toBe('Manual change');
  expect(toast).toHaveBeenCalledWith(expect.stringContaining('Your edits were kept'), 'info');
  expect(host.querySelector('[aria-label="Refine sculpture with AI"]').disabled).toBe(false);
});

it('recovers from a synchronous provider error and keeps the original model', async () => {
  provider.mockImplementation(() => { throw Error('Provider unavailable'); });
  await mount(); await generate();
  expect(latest.artStudio.sculptRecipe.name).toBe('Original');
  expect(toast).toHaveBeenCalledWith(expect.stringContaining('Your model is unchanged'), 'error');
  expect(host.querySelector('[aria-label="Refine sculpture with AI"]').disabled).toBe(false);
});

it('creates editable parts, preserves undo, and carries AI disclosure and scale to Print Lab', async () => {
  provider.mockResolvedValue(JSON.stringify(recipe('Wider base')));
  await mount();
  await act(async () => changeData({ sculptPrintContext: { unitMm: 8, aiUse: 'NONE' } }));
  await generate();
  expect(latest.artStudio.sculptRecipe.name).toBe('Wider base');
  expect(latest.artStudio.sculptUndo.at(-1).name).toBe('Original');
  expect(latest.artStudio.sculptPrintContext).toMatchObject({ unitMm: 8, aiUse: 'ASSISTED' });
  expect(latest.artStudio.sculptPrintContext.aiDisclosure).toContain('AI proposed');
  await act(async () => host.querySelector('[aria-label="Continue this sculpture in Print Lab"]').click());
  expect(window.__alloPrintLabPendingHandoff).toMatchObject({ unitMm: 8, aiUse: 'ASSISTED', recipe: { name: 'Wider base' } });
});

it('discards a response after the editor is unmounted', async () => {
  let finish;
  provider.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await mount(); await generate();
  await act(async () => root.unmount()); root = null;
  await act(async () => finish(JSON.stringify(recipe('Late'))));
  expect(latest.artStudio.sculptRecipe.name).toBe('Original');
});
