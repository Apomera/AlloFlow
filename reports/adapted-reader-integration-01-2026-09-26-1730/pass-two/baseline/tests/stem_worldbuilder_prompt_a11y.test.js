import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const moduleDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React;
let ReactDOMClient;
let act;
let originalAlloModules;
let originalAlloFlowUX;
let originalStemLab;
let originalGlobalStemLab;
let root;
let host;

beforeAll(() => {
  React = require(resolve(moduleDir, 'react'));
  ReactDOMClient = require(resolve(moduleDir, 'react-dom/client'));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
});

beforeEach(() => {
  originalAlloModules = window.AlloModules;
  originalAlloFlowUX = window.AlloFlowUX;
  originalStemLab = window.StemLab;
  originalGlobalStemLab = globalThis.StemLab;
});

afterEach(() => {
  if (root) {
    act(() => root.unmount());
    root = null;
  }
  host?.remove();
  host = null;
  window.AlloModules = originalAlloModules;
  window.AlloFlowUX = originalAlloFlowUX;
  window.StemLab = originalStemLab;
  globalThis.StemLab = originalGlobalStemLab;
  vi.restoreAllMocks();
});

function loadWorldBuilder() {
  const registry = {
    _registry: {},
    _order: [],
    registerTool(id, config) {
      config.id = id;
      this._registry[id] = config;
      this._order.push(id);
    },
    isRegistered(id) {
      return Boolean(this._registry[id]);
    },
  };
  window.StemLab = registry;
  globalThis.StemLab = registry;
  new Function(readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_worldbuilder.js'), 'utf8'))();
  return registry._registry.worldBuilder;
}

function mountWorldBuilder({ prompt, dialogAvailable = true, imageEdit } = {}) {
  const config = loadWorldBuilder();
  const addToast = vi.fn();
  const announceToSR = vi.fn();
  const editApi = imageEdit || vi.fn(async () => 'data:image/png;base64,new');
  const api = {};
  const Icons = new Proxy({}, {
    get: () => () => React.createElement('span', { 'aria-hidden': 'true' }),
  });

  window.AlloModules = dialogAvailable
    ? { PromptDialog: { PromptDialog: function PromptDialog() {} } }
    : {};
  window.AlloFlowUX = { prompt: prompt || vi.fn(async () => null) };

  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);

  function Harness() {
    const [toolData, setToolData] = React.useState({
      worldBuilder: {
        selectedWorld: null,
        characterName: 'Ari',
        characterClass: 'Explorer',
        characterPortrait: 'data:image/png;base64,old',
        characterAppearance: 'short dark hair',
      },
    });
    api.getData = () => toolData;
    const update = (toolId, key, value) => {
      setToolData((previous) => ({
        ...previous,
        [toolId]: { ...(previous[toolId] || {}), [key]: value },
      }));
    };
    const updateMulti = (toolId, values) => {
      setToolData((previous) => ({
        ...previous,
        [toolId]: { ...(previous[toolId] || {}), ...values },
      }));
    };
    return config.render({
      React,
      toolData,
      update,
      updateMulti,
      addToast,
      announceToSR,
      callGemini: null,
      callTTS: null,
      callImagen: null,
      callGeminiVision: null,
      callGeminiImageEdit: editApi,
      gradeLevel: '5th Grade',
      awardXP: () => {},
      celebrate: () => {},
      beep: () => {},
      a11yClick: (handler) => ({ onClick: handler, role: 'button', tabIndex: 0 }),
      icons: Icons,
      t: (_key, fallback) => fallback,
    });
  }

  act(() => root.render(React.createElement(Harness)));
  api.addToast = addToast;
  api.announceToSR = announceToSR;
  api.prompt = window.AlloFlowUX.prompt;
  api.imageEdit = editApi;
  api.button = () => host.querySelector('button[aria-label="Refine character portrait"]');
  return api;
}

async function clickAsync(element) {
  await act(async () => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('World Builder portrait prompt accessibility', () => {
  it('keeps both deploy mirrors identical and removes the native portrait prompt', () => {
    const source = readFileSync('stem_lab/stem_tool_worldbuilder.js', 'utf8');
    const mirror = readFileSync('desktop/web-app/public/stem_lab/stem_tool_worldbuilder.js', 'utf8');
    expect(mirror).toBe(source);
    expect(source).not.toContain("prompt('Describe how to change your portrait:')");
    expect(source).toContain('window.AlloModules.PromptDialog.PromptDialog');
    expect(source).toContain('window.AlloFlowUX && window.AlloFlowUX.prompt');
    expect(source).toContain('never invokes it');
    expect(source).toContain('maxLength: 500');
  });

  it('refines only after the accessible prompt submits meaningful text', async () => {
    const prompt = vi.fn(async () => '  add round glasses  ');
    const nativePrompt = vi.spyOn(window, 'prompt').mockImplementation(() => {
      throw new Error('Native prompt must not be called');
    });
    const app = mountWorldBuilder({ prompt });
    expect(app.button().getAttribute('type')).toBe('button');
    await clickAsync(app.button());

    expect(prompt).toHaveBeenCalledWith(
      'Describe how to change your portrait.',
      '',
      {
        title: 'Refine character portrait',
        placeholder: 'For example: add round glasses and a blue scarf',
        confirmText: 'Refine portrait',
        cancelText: 'Cancel',
        multiline: true,
        maxLength: 500,
      },
    );
    expect(app.imageEdit).toHaveBeenCalledWith(
      'Modify this character portrait: add round glasses. Keep the character recognizable. No text.',
      'old',
      400,
      0.85,
    );
    expect(app.getData().worldBuilder.characterPortrait).toBe('data:image/png;base64,new');
    expect(app.getData().worldBuilder.characterAppearance).toContain('add round glasses');
    expect(nativePrompt).not.toHaveBeenCalled();
  });

  it('leaves the portrait unchanged on cancel', async () => {
    const app = mountWorldBuilder({ prompt: vi.fn(async () => null) });
    await clickAsync(app.button());
    expect(app.imageEdit).not.toHaveBeenCalled();
    expect(app.getData().worldBuilder.characterPortrait).toBe('data:image/png;base64,old');
    expect(app.announceToSR).toHaveBeenCalledWith('Portrait unchanged.');
  });

  it('fails closed when the real PromptDialog module is unavailable', async () => {
    const prompt = vi.fn(async () => 'change it');
    const nativePrompt = vi.spyOn(window, 'prompt').mockImplementation(() => 'native change');
    const app = mountWorldBuilder({ prompt, dialogAvailable: false });
    await clickAsync(app.button());

    expect(prompt).not.toHaveBeenCalled();
    expect(nativePrompt).not.toHaveBeenCalled();
    expect(app.imageEdit).not.toHaveBeenCalled();
    expect(app.addToast).toHaveBeenCalledWith(
      'Portrait editing is unavailable, so your portrait was not changed.',
      'warning',
    );
    expect(app.announceToSR).toHaveBeenCalledWith(
      'Portrait editing is unavailable, so your portrait was not changed.',
    );
  });

  it('preserves the portrait when the accessible prompt rejects', async () => {
    const prompt = vi.fn(async () => { throw new Error('dialog failed'); });
    const nativePrompt = vi.spyOn(window, 'prompt').mockImplementation(() => 'native change');
    const app = mountWorldBuilder({ prompt });
    await clickAsync(app.button());

    expect(app.imageEdit).not.toHaveBeenCalled();
    expect(app.getData().worldBuilder.characterPortrait).toBe('data:image/png;base64,old');
    expect(nativePrompt).not.toHaveBeenCalled();
    expect(app.addToast).toHaveBeenCalledWith(
      'The portrait editor could not open, so your portrait was not changed.',
      'warning',
    );
  });
});
