import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const md = resolve(process.cwd(), 'desktop/web-app/node_modules');
const poetSource = fs.readFileSync(resolve(process.cwd(), 'poet_tree_module.js'), 'utf8');
const pyodideSource = fs.readFileSync(resolve(process.cwd(), 'pyodide_runtime_module.js'), 'utf8');
const pyodideMirror = fs.readFileSync(resolve(process.cwd(), 'desktop/web-app/public/pyodide_runtime_module.js'), 'utf8');
let React, ReactDOMClient, act, PoetTree, root, host;

beforeAll(() => {
  React = require(resolve(md, 'react'));
  ReactDOMClient = require(resolve(md, 'react-dom/client'));
  ({ act } = require(resolve(md, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('poet_tree_module.js');
  PoetTree = window.AlloModules.PoetTree;
});

afterEach(() => {
  if (root) { act(() => root.unmount()); root = null; }
  if (host) { host.remove(); host = null; }
  localStorage.clear();
});

async function mountPoet(onClose = () => {}, overrides = {}) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  const defaults = {
    isOpen: true,
    onClose,
    onCallGemini: async () => JSON.stringify({}),
    onCallTTS: async () => null,
    onCallImagen: async () => null,
    addToast: () => {},
    gradeLevel: '7th Grade',
    selectedVoice: 'Kore',
    handleScoreUpdate: () => {}
  };
  await act(async () => {
    root.render(React.createElement(PoetTree, Object.assign(defaults, overrides)));
    await new Promise((resolve) => setTimeout(resolve, 5));
  });
}

async function openWriteTab() {
  await act(async () => {
    host.querySelector('#pt-tab-write').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 5));
  });
}

describe('Poet Tree enhancement wave', () => {
  it('autosaves a draft and offers it for recovery on the next open', async () => {
    await mountPoet();
    await openWriteTab();
    const editor = host.querySelector('#pt-editor');
    const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    setValue.call(editor, 'A small moon\nabove the trees');
    await act(async () => {
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 800));
    });
    const draft = JSON.parse(localStorage.getItem('alloPoetTreeDraftV2'));
    expect(draft.text).toBe('A small moon\nabove the trees');

    await act(async () => root.unmount());
    root = null;
    host.remove();
    host = null;
    await mountPoet();
    await openWriteTab();
    expect(host.textContent).toContain('A local draft is available');
    const restore = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Restore draft'));
    expect(restore).toBeTruthy();
    await act(async () => { restore.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(host.querySelector('#pt-editor').value).toContain('A small moon');
  });

  it('surfaces local storage failures while keeping the draft open', async () => {
    await mountPoet();
    await openWriteTab();
    const editor = host.querySelector('#pt-editor');
    const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    const storagePrototype = Object.getPrototypeOf(localStorage);
    const originalSetItem = storagePrototype.setItem;
    Object.defineProperty(storagePrototype, 'setItem', { configurable: true, value: () => { throw new Error('quota exceeded'); } });
    try {
      setValue.call(editor, 'Storage failure stays editable');
      await act(async () => { editor.dispatchEvent(new Event('input', { bubbles: true })); await new Promise((resolve) => setTimeout(resolve, 800)); });
      expect(host.textContent).toContain('Could not save drafts on this device');
      expect(editor.value).toBe('Storage failure stays editable');
    } finally {
      Object.defineProperty(storagePrototype, 'setItem', { configurable: true, writable: true, value: originalSetItem });
    }
  });
  it('updates live draft statistics as the poem changes', async () => {
    await mountPoet();
    await openWriteTab();
    const editor = host.querySelector('#pt-editor');
    const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    setValue.call(editor, 'First line\n\nSecond line here');
    await act(async () => { editor.dispatchEvent(new Event('input', { bubbles: true })); });
    const stats = host.querySelector('[aria-label="Draft statistics"]');
    expect(stats).toBeTruthy();
    expect(stats.querySelector('[data-pt-draft-stat="words"]').textContent).toBe('5 words');
    expect(stats.querySelector('[data-pt-draft-stat="lines"]').textContent).toBe('2 lines');
    expect(stats.querySelector('[data-pt-draft-stat="stanzas"]').textContent).toBe('2 stanzas');
    expect(stats.querySelector('[data-pt-draft-stat="reading-time"]').textContent).toContain('1 min read');
  });
  it('contains focus in the main dialog and closes on Escape', async () => {
    const opener = document.createElement('button');
    opener.textContent = 'Open PoetTree';
    document.body.appendChild(opener);
    opener.focus();
    let closed = 0;
    const onClose = () => { closed += 1; };
    await mountPoet(onClose);
    const dialog = host.querySelector('[role="dialog"]');
    expect(dialog.getAttribute('aria-labelledby')).toBe('pt-poettree-title');
    expect(dialog.contains(document.activeElement)).toBe(true);

    const controls = dialog.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])');
    controls[controls.length - 1].focus();
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    });
    expect(document.activeElement).toBe(controls[0]);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(closed).toBe(1);

    opener.remove();
  });

  it('keeps named workspaces isolated when switching drafts', async () => {
    await mountPoet()
    await openWriteTab()
    const editor = host.querySelector('#pt-editor')
    const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set
    setValue.call(editor, 'First workspace')
    await act(async () => { editor.dispatchEvent(new Event('input', { bubbles: true })) })
    let saveWorkspace = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Save as workspace')
    expect(saveWorkspace).toBeTruthy()
    await act(async () => { saveWorkspace.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
    let workspaces = JSON.parse(localStorage.getItem('alloPoetTreeWorkspacesV1'))
    expect(workspaces).toHaveLength(1)
    const firstId = workspaces[0].id

    const previousConfirm = window.confirm
    window.confirm = () => true
    try {
      await act(async () => { host.querySelector('button[aria-label="Start a new draft workspace"]').dispatchEvent(new MouseEvent('click', { bubbles: true })) })
      expect(host.querySelector('#pt-editor').value).toBe('')
      const secondEditor = host.querySelector('#pt-editor')
      setValue.call(secondEditor, 'Second workspace')
      await act(async () => { secondEditor.dispatchEvent(new Event('input', { bubbles: true })) })
      saveWorkspace = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Save as workspace')
      await act(async () => { saveWorkspace.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
      workspaces = JSON.parse(localStorage.getItem('alloPoetTreeWorkspacesV1'))
      expect(workspaces).toHaveLength(2)
      const select = host.querySelector('#pt-workspace-select')
      select.value = firstId
      await act(async () => { select.dispatchEvent(new Event('change', { bubbles: true })) })
      expect(host.querySelector('#pt-editor').value).toBe('First workspace')
    } finally {
      window.confirm = previousConfirm
    }
  })
  it('does not create duplicate Library entries for the same revision', async () => {
    await mountPoet();
    await openWriteTab();
    const editor = host.querySelector('#pt-editor');
    const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    setValue.call(editor, 'A saved version');
    await act(async () => { editor.dispatchEvent(new Event('input', { bubbles: true })); });
    const save = host.querySelector('button[aria-label="Save this poem to Library"]');
    await act(async () => { save.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    await act(async () => { save.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(JSON.parse(localStorage.getItem('alloPoetTreePoems'))).toHaveLength(1);
    expect(poetSource).toContain('This version is already in your Library.');
  });

  it('persists revision history and exposes a restore action', async () => {
    await mountPoet();
    await openWriteTab();
    const editor = host.querySelector('#pt-editor');
    const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    setValue.call(editor, 'Version one');
    await act(async () => { editor.dispatchEvent(new Event('input', { bubbles: true })); });
    const save = host.querySelector('button[aria-label="Save this poem to Library"]');
    await act(async () => { save.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    const versions = JSON.parse(localStorage.getItem('alloPoetTreeVersionsV1'));
    expect(versions).toHaveLength(1);
    expect(versions[0].label).toBe('Saved version');
    await act(async () => { host.querySelector('#pt-tab-share').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(host.textContent).toContain('Revision history');
    const restore = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Restore');
    expect(restore).toBeTruthy();
    expect(host.textContent).toContain('Export JSON');
    expect(host.textContent).toContain('Clear history');
    const previousConfirm = window.confirm;
    window.confirm = () => true;
    const clear = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Clear history');
    await act(async () => { clear.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    window.confirm = previousConfirm;
    expect(JSON.parse(localStorage.getItem('alloPoetTreeVersionsV1'))).toHaveLength(0);
  });

  it('saves a deduplicated local checkpoint without creating a Library poem', async () => {
    const messages = []
    await mountPoet(() => {}, { addToast: (message) => messages.push(message) })
    await openWriteTab()
    const editor = host.querySelector('#pt-editor')
    const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set
    setValue.call(editor, 'Checkpoint poem')
    await act(async () => { editor.dispatchEvent(new Event('input', { bubbles: true })) })
    await act(async () => { host.querySelector('#pt-tab-share').dispatchEvent(new MouseEvent('click', { bubbles: true })) })
    const checkpoint = host.querySelector('button[aria-label="Save a local revision checkpoint"]')
    expect(checkpoint).toBeTruthy()
    await act(async () => { checkpoint.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
    const versions = JSON.parse(localStorage.getItem('alloPoetTreeVersionsV1'))
    expect(versions).toHaveLength(1)
    expect(versions[0].label).toBe('Checkpoint')
    expect(JSON.parse(localStorage.getItem('alloPoetTreePoems')) || []).toHaveLength(0)
    await act(async () => { host.querySelector('button[aria-label="Save a local revision checkpoint"]').dispatchEvent(new MouseEvent('click', { bubbles: true })) })
    expect(JSON.parse(localStorage.getItem('alloPoetTreeVersionsV1'))).toHaveLength(1)
    expect(messages.some((message) => message.includes('already in revision history'))).toBe(true)
  })
  it('compares two local revisions side by side with a changed-line summary', async () => {
    localStorage.setItem('alloPoetTreeVersionsV1', JSON.stringify([
      { id: 'rev-a', label: 'Before rewrite', title: 'Night walk', text: 'Bright moon\nquiet street', formId: 'free', targetWord: '', revisionId: 'rev-a', savedAt: '2024-01-01T00:00:00.000Z' },
      { id: 'rev-b', label: 'Saved version', title: 'Night walk', text: 'Bright moon\nempty street', formId: 'free', targetWord: '', revisionId: 'rev-b', savedAt: '2024-01-02T00:00:00.000Z' }
    ]))
    await mountPoet()
    await act(async () => { host.querySelector('#pt-tab-share').dispatchEvent(new MouseEvent('click', { bubbles: true })); })
    const compareButtons = Array.from(host.querySelectorAll('button')).filter((button) => button.textContent === 'Compare')
    expect(compareButtons).toHaveLength(2)
    await act(async () => { compareButtons[0].dispatchEvent(new MouseEvent('click', { bubbles: true })); })
    expect(host.textContent).toContain('Select one more version to compare side by side.')
    const secondCompare = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Compare')
    await act(async () => { secondCompare.dispatchEvent(new MouseEvent('click', { bubbles: true })); })
    const panel = host.querySelector('[aria-label="Revision comparison"]')
    expect(panel).toBeTruthy()
    expect(panel.textContent).toContain('Changed lines: 1 of 2')
    expect(host.querySelectorAll('button[aria-pressed="true"]')).toHaveLength(2)
  })
  it('compares the live current draft against a stored revision with word deltas', async () => {
    localStorage.setItem('alloPoetTreeVersionsV1', JSON.stringify([
      { id: 'old-revision', label: 'Saved version', title: 'Night walk', text: 'Bright moon\nquiet street', formId: 'free', targetWord: '', revisionId: 'old-revision', savedAt: '2024-01-01T00:00:00.000Z' }
    ]))
    await mountPoet()
    await openWriteTab()
    const editor = host.querySelector('#pt-editor')
    const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set
    setValue.call(editor, 'Bright moon\nnew line\nquiet street')
    await act(async () => { editor.dispatchEvent(new Event('input', { bubbles: true })) })
    await act(async () => { host.querySelector('#pt-tab-share').dispatchEvent(new MouseEvent('click', { bubbles: true })) })
    const historyButton = host.querySelector('button[aria-label^="Compare Saved version"]')
    const currentButton = host.querySelector('button[aria-label="Compare current draft"]')
    expect(historyButton).toBeTruthy()
    expect(currentButton).toBeTruthy()
    await act(async () => { historyButton.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
    await act(async () => { host.querySelector('button[aria-label="Compare current draft"]').dispatchEvent(new MouseEvent('click', { bubbles: true })) })
    const panel = host.querySelector('[aria-label="Revision comparison"]')
    expect(panel).toBeTruthy()
    expect(panel.textContent).toContain('Current draft')
    expect(panel.textContent).toContain('Changed lines: 1 of 3')
    expect(panel.querySelectorAll('[data-pt-diff-type="same"]')).toHaveLength(2)
    expect(panel.textContent).toContain('Words: 4 → 6 (+2)')
  })
  it('imports valid revisions, deduplicates them, and preserves history on malformed files', async () => {
    localStorage.setItem('alloPoetTreeVersionsV1', JSON.stringify([{
      id: 'existing', label: 'Existing', title: 'Existing', text: 'Existing poem', formId: 'free', targetWord: '', revisionId: 'existing', savedAt: new Date().toISOString()
    }]));
    await mountPoet();
    await act(async () => { host.querySelector('#pt-tab-share').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    const input = host.querySelector('input[type="file"]');
    expect(input).toBeTruthy();
    const valid = new File([JSON.stringify({ version: 1, revisions: [
      { title: 'Imported', text: 'Imported poem', formId: 'free' },
      { title: 'Imported duplicate', text: 'Imported poem', formId: 'free' },
      { title: 'Invalid', text: '' }
    ]})], 'history.json', { type: 'application/json' });
    Object.defineProperty(input, 'files', { configurable: true, value: [valid] });
    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 15));
    });
    const imported = JSON.parse(localStorage.getItem('alloPoetTreeVersionsV1'));
    expect(imported).toHaveLength(2);
    expect(imported.some((revision) => revision.text === 'Imported poem')).toBe(true);
    const beforeMalformed = JSON.stringify(imported);
    const malformed = new File([JSON.stringify({ nope: true })], 'bad.json', { type: 'application/json' });
    Object.defineProperty(input, 'files', { configurable: true, value: [malformed] });
    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 15));
    });
    expect(localStorage.getItem('alloPoetTreeVersionsV1')).toBe(beforeMalformed);
    expect(poetSource).toContain('Existing versions were kept.');
  });
  it('searches and sorts saved poems locally', async () => {
    localStorage.setItem('alloPoetTreePoems', JSON.stringify([
      { id: 'river', title: 'River Song', text: 'water over stone', formId: 'free', savedAt: '2024-01-01T00:00:00.000Z' },
      { id: 'moon', title: 'Moon Watch', text: 'silver above trees', formId: 'free', savedAt: '2025-01-01T00:00:00.000Z' }
    ]));
    await mountPoet();
    await act(async () => { host.querySelector('#pt-tab-share').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(host.querySelectorAll('[data-pt-library-card]').length).toBe(2);
    const search = host.querySelector('#pt-library-search');
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setValue.call(search, 'river');
    await act(async () => { search.dispatchEvent(new Event('input', { bubbles: true })); });
    expect(host.querySelectorAll('[data-pt-library-card]').length).toBe(1);
    expect(host.querySelector('[data-pt-library-card]').textContent).toContain('River Song');
    setValue.call(search, '');
    await act(async () => { search.dispatchEvent(new Event('input', { bubbles: true })); });
    const sort = host.querySelector('#pt-library-sort');
    sort.value = 'oldest';
    await act(async () => { sort.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(host.querySelector('[data-pt-library-card]').textContent).toContain('River Song');
  });
  it('curates a custom chapbook selection with accessible counts', async () => {
    localStorage.setItem('alloPoetTreePoems', JSON.stringify([
      { id: 'one', title: 'First poem', text: 'river light', formId: 'free', savedAt: '2024-01-01T00:00:00.000Z' },
      { id: 'two', title: 'Second poem', text: 'night rain', formId: 'free', savedAt: '2024-01-02T00:00:00.000Z' }
    ]))
    await mountPoet()
    await act(async () => { host.querySelector('#pt-tab-share').dispatchEvent(new MouseEvent('click', { bubbles: true })); })
    const curate = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === '✚ Curate selection')
    await act(async () => { curate.dispatchEvent(new MouseEvent('click', { bubbles: true })); })
    const checkboxes = Array.from(host.querySelectorAll('input[aria-label*="in chapbook"]'))
    expect(checkboxes).toHaveLength(2)
    expect(checkboxes.every((checkbox) => checkbox.checked)).toBe(true)
    await act(async () => { checkboxes[0].click(); })
    expect(host.textContent).toContain('Print 1 poem')
    const clear = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Clear selection')
    await act(async () => { clear.dispatchEvent(new MouseEvent('click', { bubbles: true })); })
    expect(host.textContent).toContain('0 of 2 selected')
    expect(Array.from(host.querySelectorAll('button')).find((button) => button.textContent === '🖨️ Print 0 poems').disabled).toBe(true)
    const selectAll = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Select all')
    await act(async () => { selectAll.dispatchEvent(new MouseEvent('click', { bubbles: true })); })
    expect(host.textContent).toContain('Print 2 poems')
    const done = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === '✓ Done curating')
    await act(async () => { done.dispatchEvent(new MouseEvent('click', { bubbles: true })); })
    expect(host.querySelectorAll('input[aria-label*="in chapbook"]')).toHaveLength(0)
  })
  it('backs up and restores the saved Library with safe deduplication', async () => {
    localStorage.setItem('alloPoetTreePoems', JSON.stringify([
      { id: 'existing', title: 'Existing', text: 'Existing poem', formId: 'free', targetWord: '', revisionId: 'existing', savedAt: '2024-01-01T00:00:00.000Z' }
    ]));
    await mountPoet();
    await act(async () => { host.querySelector('#pt-tab-share').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(host.textContent).toContain('Export library');
    const input = host.querySelector('input[aria-label="Choose a PoetTree Library JSON file"]');
    const valid = new File([JSON.stringify({ version: 1, poems: [
      { title: 'Duplicate title', text: 'Existing poem', formId: 'free' },
      { title: 'Imported poem', text: 'A new poem', formId: 'free' }
    ]})], 'library.json', { type: 'application/json' });
    Object.defineProperty(input, 'files', { configurable: true, value: [valid] });
    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    const imported = JSON.parse(localStorage.getItem('alloPoetTreePoems'));
    expect(imported).toHaveLength(2);
    expect(imported.some((poem) => poem.text === 'A new poem')).toBe(true);
    const beforeMalformed = JSON.stringify(imported);
    const malformed = new File([JSON.stringify({ nope: true })], 'bad-library.json', { type: 'application/json' });
    Object.defineProperty(input, 'files', { configurable: true, value: [malformed] });
    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(localStorage.getItem('alloPoetTreePoems')).toBe(beforeMalformed);
    expect(poetSource).toContain('Existing poems were kept.');
  });
  it('persists the privacy switch and blocks cloud helpers when disabled', async () => {
    let cloudCalls = 0;
    await mountPoet(() => {}, { onCallGemini: async () => { cloudCalls += 1; return JSON.stringify({}); } });
    const privacy = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Privacy');
    await act(async () => { privacy.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    const panel = host.querySelector('#pt-privacy-panel');
    expect(panel).toBeTruthy();
    const checkbox = panel.querySelector('input[type="checkbox"]');
    expect(checkbox.checked).toBe(false);
    await act(async () => { checkbox.click(); });
    expect(JSON.parse(localStorage.getItem('alloPoetTreePrefs')).cloudFeaturesEnabled).toBe(false);
    expect(checkbox.checked).toBe(true);
    await openWriteTab();
    const editor = host.querySelector('#pt-editor');
    const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    setValue.call(editor, 'Privacy test poem');
    await act(async () => { editor.dispatchEvent(new Event('input', { bubbles: true })); });
    const feedback = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Get feedback'));
    await act(async () => { feedback.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(cloudCalls).toBe(0);
  });

  it('exports a complete local backup without exporting privacy preferences', async () => {
    localStorage.setItem('alloPoetTreePoems', JSON.stringify([{ id: 'poem-1', title: 'Saved', text: 'saved text' }]));
    localStorage.setItem('alloPoetTreeDraftV2', JSON.stringify({ title: 'Draft', text: 'draft text', formId: 'free' }));
    localStorage.setItem('alloPoetTreeVersionsV1', JSON.stringify([{ id: 'revision-1', title: 'Saved', text: 'revision text', formId: 'free' }]));
    localStorage.setItem('alloPoetTreeWorkspacesV1', JSON.stringify([{ id: 'workspace-1', name: 'Workspace', title: 'Workspace', text: 'workspace text', formId: 'free' }]));
    localStorage.setItem('alloPoetTreeActiveWorkspaceV1', 'workspace-1');
    localStorage.setItem('alloPoetTreePrefs', JSON.stringify({ cloudFeaturesEnabled: false, largeText: true }));
    await mountPoet();
    const privacy = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Privacy');
    await act(async () => { privacy.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    const backup = Array.from(host.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Download all local Poet Tree data as JSON');
    expect(backup).toBeTruthy();
    const urlApi = window.URL || window.webkitURL;
    const originalCreateObjectURL = urlApi.createObjectURL;
    const originalRevokeObjectURL = urlApi.revokeObjectURL;
    const originalAnchorClick = HTMLAnchorElement.prototype.click;
    let exportedBlob = null;
    urlApi.createObjectURL = (blob) => { exportedBlob = blob; return 'blob:poettree-backup'; };
    urlApi.revokeObjectURL = () => {};
    HTMLAnchorElement.prototype.click = () => {};
    try {
      await act(async () => { backup.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      expect(exportedBlob).toBeTruthy();
      const payload = JSON.parse(await exportedBlob.text());
      expect(payload.version).toBe(1);
      expect(payload.poems).toHaveLength(1);
      expect(payload.draft.text).toBe('workspace text');
      expect(payload.recoveredDraft.text).toBe('draft text');
      expect(payload.revisions).toHaveLength(1);
      expect(payload.workspaces).toHaveLength(1);
      expect(payload.activeWorkspaceId).toBe('workspace-1');
      expect(payload).not.toHaveProperty('prefs');
    } finally {
      if (originalCreateObjectURL) urlApi.createObjectURL = originalCreateObjectURL; else delete urlApi.createObjectURL;
      if (originalRevokeObjectURL) urlApi.revokeObjectURL = originalRevokeObjectURL; else delete urlApi.revokeObjectURL;
      HTMLAnchorElement.prototype.click = originalAnchorClick;
    }
  });
  it('restores a validated full backup and keeps malformed backups safe', async () => {
    localStorage.setItem('alloPoetTreePoems', JSON.stringify([{ id: 'old-poem', title: 'Old', text: 'old text' }]));
    localStorage.setItem('alloPoetTreePrefs', JSON.stringify({ cloudFeaturesEnabled: false, largeText: true }));
    await mountPoet();
    const privacy = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Privacy');
    await act(async () => { privacy.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    const input = Array.from(host.querySelectorAll('input')).find((element) => element.getAttribute('aria-label') === 'Choose a PoetTree local backup JSON file');
    expect(input).toBeTruthy();
    const backup = {
      version: 1,
      exportedAt: '2026-08-01T00:00:00.000Z',
      poems: [{ id: 'restored-poem', title: 'Restored', text: 'restored poem', formId: 'free' }],
      draft: { title: 'Restored draft', text: 'restored draft', formId: 'free' },
      recoveredDraft: null,
      revisions: [{ id: 'restored-revision', label: 'Restored version', title: 'Restored', text: 'restored poem', formId: 'free' }],
      workspaces: [{ id: 'restored-workspace', name: 'Restored workspace', title: 'Workspace title', text: 'workspace poem', formId: 'free', updatedAt: '2026-08-01T00:00:00.000Z' }],
      activeWorkspaceId: 'restored-workspace'
    };
    const previousConfirm = window.confirm;
    window.confirm = () => true;
    try {
      const valid = new File([JSON.stringify(backup)], 'poettree-local-backup.json', { type: 'application/json' });
      Object.defineProperty(input, 'files', { configurable: true, value: [valid] });
      await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })); await new Promise((resolve) => setTimeout(resolve, 30)); });
      const preview = Array.from(host.querySelectorAll('[role=region]')).find((element) => element.getAttribute('aria-label') === 'Backup restore preview');
      expect(preview).toBeTruthy();
      expect(preview.textContent).toContain('1 poems');
      const urlApi = window.URL || window.webkitURL;
      const originalCreateObjectURL = urlApi.createObjectURL;
      const originalRevokeObjectURL = urlApi.revokeObjectURL;
      const originalAnchorClick = HTMLAnchorElement.prototype.click;
      const safetyBlobs = [];
      urlApi.createObjectURL = (blob) => { safetyBlobs.push(blob); return 'blob:pre-restore-safety'; };
      urlApi.revokeObjectURL = () => {};
      HTMLAnchorElement.prototype.click = () => {};
      try {
        const replace = Array.from(host.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Replace current local writing data with this backup');
        expect(replace).toBeTruthy();
        await act(async () => { replace.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
        expect(safetyBlobs).toHaveLength(1);
      } finally {
        if (originalCreateObjectURL) urlApi.createObjectURL = originalCreateObjectURL; else delete urlApi.createObjectURL;
        if (originalRevokeObjectURL) urlApi.revokeObjectURL = originalRevokeObjectURL; else delete urlApi.revokeObjectURL;
        HTMLAnchorElement.prototype.click = originalAnchorClick;
      }
      expect(JSON.parse(localStorage.getItem('alloPoetTreePoems'))[0].text).toBe('restored poem');
      expect(JSON.parse(localStorage.getItem('alloPoetTreeWorkspacesV1'))[0].text).toBe('workspace poem');
      expect(localStorage.getItem('alloPoetTreeActiveWorkspaceV1')).toBe('restored-workspace');
      expect(JSON.parse(localStorage.getItem('alloPoetTreePrefs'))).toEqual({ cloudFeaturesEnabled: false, largeText: true });
      expect(host.querySelector('#pt-editor').value).toBe('workspace poem');
      const beforeMalformed = localStorage.getItem('alloPoetTreePoems');
      const malformed = new File([JSON.stringify({ version: 1, poems: 'not-an-array' })], 'bad-backup.json', { type: 'application/json' });
      Object.defineProperty(input, 'files', { configurable: true, value: [malformed] });
      await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })); await new Promise((resolve) => setTimeout(resolve, 20)); });
      expect(localStorage.getItem('alloPoetTreePoems')).toBe(beforeMalformed);
      await act(async () => root.unmount());
      root = null;
      host.remove();
      host = null;
      await mountPoet();
      await openWriteTab();
      expect(host.querySelector('#pt-editor').value).toBe('workspace poem');
    } finally {
      window.confirm = previousConfirm;
    }
  });
  it('merges backup collections without replacing the current draft', async () => {
    localStorage.setItem('alloPoetTreePoems', JSON.stringify([{ id: 'current-poem', title: 'Current', text: 'current poem' }]));
    localStorage.setItem('alloPoetTreeVersionsV1', JSON.stringify([{ id: 'current-revision', title: 'Current', text: 'current revision', formId: 'free' }]));
    localStorage.setItem('alloPoetTreeWorkspacesV1', JSON.stringify([{ id: 'current-workspace', name: 'Current workspace', title: 'Current', text: 'current workspace poem', formId: 'free' }]));
    localStorage.setItem('alloPoetTreeActiveWorkspaceV1', 'current-workspace');
    localStorage.setItem('alloPoetTreePrefs', JSON.stringify({ cloudFeaturesEnabled: false }));
    await mountPoet();
    const privacy = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Privacy');
    await act(async () => { privacy.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    const input = Array.from(host.querySelectorAll('input')).find((element) => element.getAttribute('aria-label') === 'Choose a PoetTree local backup JSON file');
    const backup = {
      version: 1,
      poems: [{ id: 'incoming-poem', title: 'Incoming', text: 'incoming poem', formId: 'free' }],
      draft: { title: 'Incoming draft', text: 'incoming draft', formId: 'free' },
      recoveredDraft: null,
      revisions: [{ id: 'incoming-revision', title: 'Incoming', text: 'incoming revision', formId: 'free' }],
      workspaces: [{ id: 'incoming-workspace', name: 'Incoming workspace', title: 'Incoming', text: 'incoming workspace', formId: 'free' }],
      activeWorkspaceId: 'incoming-workspace'
    };
    const previousConfirm = window.confirm;
    const urlApi = window.URL || window.webkitURL;
    const originalCreateObjectURL = urlApi.createObjectURL;
    const originalRevokeObjectURL = urlApi.revokeObjectURL;
    const originalAnchorClick = HTMLAnchorElement.prototype.click;
    window.confirm = () => true;
    urlApi.createObjectURL = () => 'blob:merge-safety';
    urlApi.revokeObjectURL = () => {};
    HTMLAnchorElement.prototype.click = () => {};
    try {
      const valid = new File([JSON.stringify(backup)], 'merge-backup.json', { type: 'application/json' });
      Object.defineProperty(input, 'files', { configurable: true, value: [valid] });
      await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })); await new Promise((resolve) => setTimeout(resolve, 30)); });
      const merge = Array.from(host.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Merge this backup with current local writing data');
      expect(merge).toBeTruthy();
      await act(async () => { merge.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      expect(JSON.parse(localStorage.getItem('alloPoetTreePoems'))).toHaveLength(2);
      expect(JSON.parse(localStorage.getItem('alloPoetTreeVersionsV1'))).toHaveLength(2);
      expect(JSON.parse(localStorage.getItem('alloPoetTreeWorkspacesV1'))).toHaveLength(2);
      expect(localStorage.getItem('alloPoetTreeActiveWorkspaceV1')).toBe('current-workspace');
      expect(host.querySelector('#pt-editor').value).toBe('current workspace poem');
      expect(JSON.parse(localStorage.getItem('alloPoetTreePrefs'))).toEqual({ cloudFeaturesEnabled: false });
    } finally {
      window.confirm = previousConfirm;
      if (originalCreateObjectURL) urlApi.createObjectURL = originalCreateObjectURL; else delete urlApi.createObjectURL;
      if (originalRevokeObjectURL) urlApi.revokeObjectURL = originalRevokeObjectURL; else delete urlApi.revokeObjectURL;
      HTMLAnchorElement.prototype.click = originalAnchorClick;
    }
  });
  it('undoes a replace restore back to the previous local state', async () => {
    localStorage.setItem('alloPoetTreePoems', JSON.stringify([{ id: 'before-poem', title: 'Before', text: 'before poem' }]));
    localStorage.setItem('alloPoetTreeWorkspacesV1', JSON.stringify([{ id: 'before-workspace', name: 'Before workspace', title: 'Before', text: 'before workspace poem', formId: 'free' }]));
    localStorage.setItem('alloPoetTreeActiveWorkspaceV1', 'before-workspace');
    localStorage.setItem('alloPoetTreePrefs', JSON.stringify({ cloudFeaturesEnabled: false, largeText: true }));
    await mountPoet();
    const privacy = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Privacy');
    await act(async () => { privacy.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    const input = Array.from(host.querySelectorAll('input')).find((element) => element.getAttribute('aria-label') === 'Choose a PoetTree local backup JSON file');
    const incoming = {
      version: 1,
      poems: [{ id: 'after-poem', title: 'After', text: 'after poem', formId: 'free' }],
      draft: { title: 'After draft', text: 'after draft', formId: 'free' },
      recoveredDraft: null,
      revisions: [],
      workspaces: [{ id: 'after-workspace', name: 'After workspace', title: 'After', text: 'after workspace poem', formId: 'free' }],
      activeWorkspaceId: 'after-workspace'
    };
    const previousConfirm = window.confirm;
    const urlApi = window.URL || window.webkitURL;
    const originalCreateObjectURL = urlApi.createObjectURL;
    const originalRevokeObjectURL = urlApi.revokeObjectURL;
    const originalAnchorClick = HTMLAnchorElement.prototype.click;
    const safetyBlobs = [];
    window.confirm = () => true;
    urlApi.createObjectURL = (blob) => { safetyBlobs.push(blob); return 'blob:undo-safety'; };
    urlApi.revokeObjectURL = () => {};
    HTMLAnchorElement.prototype.click = () => {};
    try {
      const valid = new File([JSON.stringify(incoming)], 'undo-backup.json', { type: 'application/json' });
      Object.defineProperty(input, 'files', { configurable: true, value: [valid] });
      await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })); await new Promise((resolve) => setTimeout(resolve, 30)); });
      const replace = Array.from(host.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Replace current local writing data with this backup');
      await act(async () => { replace.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      const undo = Array.from(host.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Undo last local data restore');
      expect(undo).toBeTruthy();
      await act(async () => { undo.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      expect(safetyBlobs).toHaveLength(2);
      expect(JSON.parse(localStorage.getItem('alloPoetTreePoems'))[0].text).toBe('before poem');
      expect(JSON.parse(localStorage.getItem('alloPoetTreeWorkspacesV1'))[0].text).toBe('before workspace poem');
      expect(localStorage.getItem('alloPoetTreeActiveWorkspaceV1')).toBe('before-workspace');
      expect(host.querySelector('#pt-editor').value).toBe('before workspace poem');
      expect(Array.from(host.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Undo last local data restore')).toBeFalsy();
      expect(JSON.parse(localStorage.getItem('alloPoetTreePrefs'))).toEqual({ cloudFeaturesEnabled: false, largeText: true });
    } finally {
      window.confirm = previousConfirm;
      if (originalCreateObjectURL) urlApi.createObjectURL = originalCreateObjectURL; else delete urlApi.createObjectURL;
      if (originalRevokeObjectURL) urlApi.revokeObjectURL = originalRevokeObjectURL; else delete urlApi.revokeObjectURL;
      HTMLAnchorElement.prototype.click = originalAnchorClick;
    }
  });
  it('erases local writing data while preserving the cloud privacy preference', async () => {
    localStorage.setItem('alloPoetTreePoems', JSON.stringify([{ id: 'poem-1', title: 'Saved', text: 'saved text' }]));
    localStorage.setItem('alloPoetTreeDraftV2', JSON.stringify({ title: 'Draft', text: 'draft text', formId: 'free' }));
    localStorage.setItem('alloPoetTreeVersionsV1', JSON.stringify([{ id: 'revision-1', title: 'Saved', text: 'revision text', formId: 'free' }]));
    localStorage.setItem('alloPoetTreeWorkspacesV1', JSON.stringify([{ id: 'workspace-1', name: 'Workspace', title: 'Workspace', text: 'workspace text', formId: 'free' }]));
    localStorage.setItem('alloPoetTreeActiveWorkspaceV1', 'workspace-1');
    localStorage.setItem('alloPoetTreePrefs', JSON.stringify({ cloudFeaturesEnabled: false, largeText: true }));
    await mountPoet();
    const privacy = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Privacy');
    await act(async () => { privacy.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    const erase = host.querySelector('button[aria-label="Erase all local Poet Tree data"]');
    expect(erase).toBeTruthy();
    const previousConfirm = window.confirm;
    window.confirm = () => true;
    try {
      await act(async () => { erase.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    } finally {
      window.confirm = previousConfirm;
    }
    ['alloPoetTreePoems', 'alloPoetTreeDraftV2', 'alloPoetTreeVersionsV1', 'alloPoetTreeWorkspacesV1', 'alloPoetTreeActiveWorkspaceV1'].forEach((key) => {
      expect(localStorage.getItem(key)).toBeNull();
    });
    expect(JSON.parse(localStorage.getItem('alloPoetTreePrefs'))).toEqual({ cloudFeaturesEnabled: false, largeText: true });
    await openWriteTab();
    expect(host.querySelector('#pt-editor').value).toBe('');
  });
  it('does not request automatic localization while cloud features are disabled', async () => {
    const previousLanguage = window.__alloTextLanguage
    window.__alloTextLanguage = 'Spanish'
    let cloudCalls = 0
    try {
      await mountPoet(() => {}, { onCallGemini: async () => { cloudCalls += 1; return JSON.stringify({}); } })
      const privacy = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Privacy')
      await act(async () => { privacy.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
      const checkbox = host.querySelector('#pt-privacy-panel input[type="checkbox"]')
      await act(async () => { checkbox.click() })
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 700)) })
      expect(cloudCalls).toBe(0)
    } finally {
      window.__alloTextLanguage = previousLanguage
    }
  })
  it('aborts superseded requests and rejects stale results from changing the poem', async () => {
    let resolveAI;
    await mountPoet(() => {}, { onCallGemini: () => new Promise((resolve) => { resolveAI = resolve; }) });
    await openWriteTab();
    const editor = host.querySelector('#pt-editor');
    const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    setValue.call(editor, 'Old poem');
    await act(async () => { editor.dispatchEvent(new Event('input', { bubbles: true })); });
    const feedback = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Get feedback'));
    await act(async () => { feedback.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    await openWriteTab();
    const currentEditor = host.querySelector('#pt-editor');
    setValue.call(currentEditor, 'New poem');
    await act(async () => { currentEditor.dispatchEvent(new Event('input', { bubbles: true })); });
    await act(async () => { resolveAI(JSON.stringify({ strongestLine: 'stale result' })); await new Promise((resolve) => setTimeout(resolve, 5)); });
    expect(host.textContent).not.toContain('stale result');
    expect(poetSource).toContain('new AbortController()');
    expect(poetSource).toContain('aiRequestSignal(request)');
    expect(poetSource).toContain("var requestKey = 'metaphorImage:' + m.id;");
    expect(poetSource).toContain("var requestKey = 'moodBoard';");
    expect(poetSource).toContain('{ signal: aiRequestSignal(request) }');
  });
  it('keeps the authoritative verifier mirrored and covers the added structures', () => {
    expect(pyodideMirror).toBe(pyodideSource);
    expect(pyodideSource).toContain('def diamante_findings(lines):');
    expect(pyodideSource).toContain('def couplet_findings(lines):');
    expect(pyodideSource).toContain('def ballad_findings(lines):');
    expect(pyodideSource).toContain('Pantoum: lines should be grouped into four-line stanzas.');
  });

  it('exposes the explicit acrostic target and form check', async () => {
    await mountPoet();
    const acrostic = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Acrostic'));
    expect(acrostic).toBeTruthy();
    await act(async () => { acrostic.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    await openWriteTab();
    expect(host.querySelector('#pt-acrostic-target')).toBeTruthy();
    expect(host.textContent).toContain('add a target word');
  });
});
