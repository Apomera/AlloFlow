import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
const strings = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
const translate = key => key.split('.').reduce((value, part) => value?.[part], strings) || key;
let Outline, root, host;

beforeAll(() => {
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  if (process.env.ALLO_OUTLINE_CLARITY_SOURCE) {
    const { transformSync } = require('@babel/core');
    const code = transformSync(readFileSync(process.env.ALLO_OUTLINE_CLARITY_SOURCE, 'utf8'), {
      plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false,
    }).code;
    const names = ['CheckCircle', 'CheckCircle2', 'Layout', 'Pencil', 'Plus', 'RefreshCw', 'Share2', 'Sparkles', 'X'];
    Outline = new Function('React', 'window', ...names, code + '\nreturn OutlineView;')(React, window, ...names.map(() => () => null));
  } else {
    window.AlloModules = { ...window.AlloModules };
    delete window.AlloModules.OutlineView;
    const code = readFileSync(process.env.ALLO_OUTLINE_CLARITY_MODULE || process.env.ALLO_OUTLINE_CANDIDATE || 'view_outline_module.js', 'utf8');
    new Function('window', code)(window);
    Outline = window.AlloModules.OutlineView;
  }
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); root = host = null;
  vi.restoreAllMocks();
});

async function mount(extra = {}) {
  const actions = Object.fromEntries([
    'handleAddToMapList', 'handleRemoveFromMapList', 'handleInitializeMap', 'handleGenerate',
    'handleToggleIsEditingOutline', 'setIsInteractiveMap', 'setIsInteractiveVenn',
    'setIsVennPlaying', 'broadcastInteractiveOrganizer',
  ].map(name => [name, vi.fn()]));
  let props = {
    t: translate, isTeacherMode: true, isInteractiveMap: false, isConceptMapReady: false,
    isChallengeActive: false, isEditingOutline: false, isInteractiveVenn: false,
    isVennPlaying: false, isProcessing: false, leveledTextLanguage: 'English', gradeLevel: '5',
    generatedContent: { id: 'organizer-one', type: 'outline', data: {
      structureType: 'Key Concept Map', main: 'Plants', branches: [{ title: 'Roots', items: [] }],
    } },
    renderOutlineContent: () => React.createElement('p', { 'data-static-organizer': true }, 'Organizer'),
    renderInteractiveMap: () => React.createElement('p', { 'data-interactive-organizer': true }, 'Layout'),
    ...actions, ...extra,
  };
  function Harness({ current }) {
    const [value, setValue] = React.useState(current.mapAddInput || '');
    return React.createElement(Outline, {
      ...current, mapAddInput: value, setMapAddInput: setValue,
      handleAddToMapList: text => {
        current.handleAddToMapList(text);
        // The actual host clears its controlled input after adding a concept.
        setValue('');
      },
    });
  }
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  const render = () => root.render(React.createElement(Harness, { current: props }));
  await act(async () => render());
  return { actions, props, update: async changes => { props = { ...props, ...changes }; await act(async () => render()); } };
}
const input = () => host.querySelector('input[type="text"]');
const byData = name => host.querySelector('[data-outline-' + name + ']');
async function click(node) { expect(node).toBeTruthy(); await act(async () => node.click()); }
async function key(node, options = {}) {
  const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, ...options });
  await act(async () => node.dispatchEvent(event));
  return event;
}
async function compose(node, type) {
  await act(async () => node.dispatchEvent(new CompositionEvent(type, { bubbles: true, data: '文字' })));
}

describe('Organizer Add concept keyboard behavior', () => {
  it.each([{ isComposing: true }, { keyCode: 229 }, { key: 'ArrowLeft' }])('leaves native composition and ordinary editing keys alone: %j', async options => {
    const { actions } = await mount({ isInteractiveMap: true, mapAddInput: '文字' });
    expect((await key(input(), options)).defaultPrevented).toBe(false);
    expect(actions.handleAddToMapList).not.toHaveBeenCalled();
    expect(input().value).toBe('文字');
  });
  it('waits for compositionend when the browser omits native composing flags', async () => {
    const { actions } = await mount({ isInteractiveMap: true, mapAddInput: '文字' });
    await compose(input(), 'compositionstart');
    expect((await key(input())).defaultPrevented).toBe(false);
    expect(actions.handleAddToMapList).not.toHaveBeenCalled();
    await compose(input(), 'compositionend');
    expect((await key(input())).defaultPrevented).toBe(true);
    expect(actions.handleAddToMapList).toHaveBeenCalledExactlyOnceWith('文字');
    expect(input().value).toBe('');
  });
  it('clears interrupted composition on blur so the next Enter can add', async () => {
    const { actions } = await mount({ isInteractiveMap: true, mapAddInput: '文字' });
    input().focus(); await compose(input(), 'compositionstart');
    await act(async () => input().blur()); input().focus();
    expect((await key(input())).defaultPrevented).toBe(true);
    expect(actions.handleAddToMapList).toHaveBeenCalledExactlyOnceWith('文字');
  });
  it('does not carry composition from an input removed by the layout view', async () => {
    const view = await mount({ isInteractiveMap: true, mapAddInput: '文字' });
    const oldInput = input(); await compose(oldInput, 'compositionstart');
    await view.update({ isConceptMapReady: true }); expect(input()).toBeNull();
    await view.update({ isConceptMapReady: false }); expect(input()).not.toBe(oldInput);
    await key(input()); expect(view.actions.handleAddToMapList).toHaveBeenCalledExactlyOnceWith('文字');
  });
  it('adds once on ordinary Enter and does not add again from the cleared input', async () => {
    const { actions } = await mount({ isInteractiveMap: true, mapAddInput: 'Leaf' });
    expect((await key(input())).defaultPrevented).toBe(true);
    expect(actions.handleAddToMapList).toHaveBeenCalledExactlyOnceWith('Leaf');
    await key(input()); expect(actions.handleAddToMapList).toHaveBeenCalledOnce();
  });
  it.each(['', '  \t '])('does not send blank text through Enter or the Add button: %j', async value => {
    const { actions } = await mount({ isInteractiveMap: true, mapAddInput: value });
    expect((await key(input())).defaultPrevented).toBe(true);
    expect(byData('add-concept').disabled).toBe(true);
    await click(byData('add-concept')); expect(actions.handleAddToMapList).not.toHaveBeenCalled();
  });
  it('keeps the explicit Add button and existing host payload', async () => {
    const { actions } = await mount({ isInteractiveMap: true, mapAddInput: '  Leaf  ' });
    expect(input().getAttribute('aria-label')).toBe('Add Concept');
    expect(byData('add-concept').type).toBe('button');
    await click(byData('add-concept'));
    expect(actions.handleAddToMapList).toHaveBeenCalledExactlyOnceWith('  Leaf  ');
  });
});

describe('Organizer action clarity and existing permissions', () => {
  it('distinguishes editing text, arranging the current organizer, and making a Free Forms copy', async () => {
    const view = await mount();
    expect(byData('edit-text').textContent).toBe('Edit Text');
    expect(byData('edit-text').title).toBe('Change the wording in this organizer.');
    expect(byData('layout-toggle').textContent).toBe('Edit diagram layout');
    expect(byData('layout-toggle').title).toBe('Arrange the concepts and connections in this organizer.');
    const copy = byData('freeforms-copy');
    expect(copy.textContent).toContain('Make a Free Forms copy');
    expect(copy.title).toBe('Open a separate Free Forms copy to change the words and arrangement.');
    expect(copy.getAttribute('aria-label')).toBeNull();
    await click(byData('edit-text')); await click(byData('layout-toggle'));
    expect(view.actions.handleToggleIsEditingOutline).toHaveBeenCalledOnce();
    expect(view.actions.setIsInteractiveMap).toHaveBeenCalledExactlyOnceWith(true);
    await view.update({ isEditingOutline: true });
    expect(byData('edit-text').textContent).toBe('Done editing text');
  });
  it.each([true, false])('preserves the Free Forms event and payload for teacher=%s', async isTeacherMode => {
    const view = await mount({ isTeacherMode });
    const received = vi.fn(); window.addEventListener('allo-open-freeforms', received);
    try {
      await click(byData('freeforms-copy'));
      expect(received).toHaveBeenCalledOnce();
      expect(received.mock.calls[0][0].detail).toEqual({ generated: view.props.generatedContent.data });
      expect(received.mock.calls[0][0].detail.generated).toBe(view.props.generatedContent.data);
      expect(view.actions.handleGenerate).not.toHaveBeenCalled();
    } finally { window.removeEventListener('allo-open-freeforms', received); }
  });
  it('does not expose teacher text, layout, or regenerate controls to students', async () => {
    await mount({ isTeacherMode: false });
    for (const name of ['edit-text', 'layout-toggle', 'regenerate']) expect(byData(name)).toBeNull();
    expect(byData('freeforms-copy')).toBeTruthy();
    expect(host.querySelector('[data-organizer-udl-goal]')).toBeNull();
  });
  it('keeps the existing interactive Venn stop and broadcast behavior', async () => {
    const view = await mount({ isInteractiveVenn: true, isVennPlaying: true,
      generatedContent: { id: 'venn', data: { structureType: 'Venn Diagram', branches: [] } },
    });
    expect(byData('layout-toggle').textContent).toBe('View diagram');
    await click(byData('layout-toggle'));
    expect(view.actions.setIsInteractiveVenn).toHaveBeenCalledExactlyOnceWith(false);
    expect(view.actions.setIsVennPlaying).toHaveBeenCalledExactlyOnceWith(false);
    expect(view.actions.broadcastInteractiveOrganizer).toHaveBeenCalledExactlyOnceWith(null);
    expect(view.actions.setIsInteractiveMap).not.toHaveBeenCalled();
  });
  it('uses translations for existing and new labels', async () => {
    const labels = { 'outline.edit_text': 'Editar texto', 'outline.edit_diagram_layout': 'Editar diseño',
      'concept_map.toolbar.remix_copy': 'Crear copia en Free Forms', 'outline.done_editing_text': 'Terminar edición',
    };
    const view = await mount({ t: key => labels[key] || key });
    expect(byData('edit-text').textContent).toBe(labels['outline.edit_text']);
    expect(byData('layout-toggle').textContent).toBe(labels['outline.edit_diagram_layout']);
    expect(byData('freeforms-copy').textContent).toContain(labels['concept_map.toolbar.remix_copy']);
    await view.update({ isEditingOutline: true });
    expect(byData('edit-text').textContent).toBe(labels['outline.done_editing_text']);
  });
  it.each([key => key, () => ''])('falls back to readable action names when translations are missing', async t => {
    await mount({ t });
    expect(byData('edit-text').textContent).toBe('Edit Text');
    expect(byData('layout-toggle').textContent).toBe('Edit diagram layout');
    expect(byData('freeforms-copy').textContent).toContain('Make a Free Forms copy');
  });
  it('makes toolbar and concept controls at least 44px and keeps Remove visible', async () => {
    const view = await mount();
    const checkSizes = () => {
      for (const control of host.querySelectorAll('button,input')) {
        expect(control.style.minHeight).toBe('44px'); expect(control.style.minWidth).toBe('44px');
      }
    };
    checkSizes(); await view.update({ isInteractiveMap: true }); checkSizes();
    const remove = byData('remove-concept');
    expect(remove.getAttribute('aria-label')).toBe('Remove concept Roots');
    expect(remove.className).not.toContain('opacity-0');
    await click(remove); expect(view.actions.handleRemoveFromMapList).toHaveBeenCalledExactlyOnceWith(0);
  });
});
