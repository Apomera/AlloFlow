// @vitest-environment jsdom
// "Word data for glossaries" in the Storage and recovery dialog: the dictionary loader's
// allo_dict_<word> localStorage cache is counted on its own (outside the 250-key managed
// inventory budget, never inside the Reclaimable row) and can be deleted from the dialog.
// STORAGE_LANE_BASE=<dir> points the file at saved base copies to show the tests fail there.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const BASE = process.env.STORAGE_LANE_BASE || '';
const anti = readFileSync(BASE ? resolve(BASE, 'AlloFlowANTI.txt') : resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');

function loadInventory() {
  const start = anti.indexOf('const ALLO_STORAGE_INVENTORY = (() => {');
  const end = anti.indexOf('\nconst _alloCreateDefaultStudentProjectSettings', start);
  if (start < 0 || end < 0) throw new Error('Storage inventory helper block not found');
  return new Function(anti.slice(start, end) + '\nreturn ALLO_STORAGE_INVENTORY;')();
}

// A Storage-like object with real key(i) ordering, so removals shift indices as in a browser.
function makeStorage(entries) {
  const map = new Map(entries);
  const reads = [];
  return {
    reads,
    map,
    get length() { return map.size; },
    key: (i) => Array.from(map.keys())[i] ?? null,
    getItem: (k) => { reads.push(k); return map.has(k) ? map.get(k) : null; },
    removeItem: (k) => { map.delete(k); },
  };
}

const inventory = loadInventory();
const total = (rows) => rows.reduce((sum, row) => sum + row.count, 0);

describe('dictionary cache inventory (ALLO_STORAGE_INVENTORY)', () => {
  it('counts allo_dict_ entries and their size separately, reading only that prefix', () => {
    const storage = makeStorage([
      ['allo_dict_habitat', '{"word":"habitat","meanings":[]}'],
      ['allo_dict_classify', '{"word":"classify"}'],
      ['allo_student_work', 'private'],
      ['other_app_cache', 'other'],
    ]);
    const summary = inventory.collectDictionaryCache(storage);
    expect(summary).toEqual({ count: 2, approximateBytes: '{"word":"habitat","meanings":[]}'.length + '{"word":"classify"}'.length });
    expect(storage.reads.sort()).toEqual(['allo_dict_classify', 'allo_dict_habitat']);
    expect(inventory.collectDictionaryCache(makeStorage([['allo_student_work', 'x']]))).toEqual({ count: 0, approximateBytes: 0 });
    expect(inventory.collectDictionaryCache(null)).toEqual({ count: 0, approximateBytes: 0 });
  });

  it('bounds dictionary value reads with its own cap but still counts every word', () => {
    const n = inventory.MAX_DICTIONARY_ENTRIES + 5;
    const storage = makeStorage(Array.from({ length: n }, (_, i) => ['allo_dict_w' + i, 'x']));
    const summary = inventory.collectDictionaryCache(storage);
    expect(inventory.MAX_DICTIONARY_ENTRIES).toBeGreaterThanOrEqual(1200);
    expect(summary.count).toBe(n);
    expect(storage.reads).toHaveLength(inventory.MAX_DICTIONARY_ENTRIES);
  });

  it('keeps allo_dict_ entries out of the 250-key managed budget', () => {
    const dict = Array.from({ length: 300 }, (_, i) => ['allo_dict_w' + i, '{"word":"w"}']);
    const managed = Array.from({ length: 260 }, (_, i) => ['allo_cache_' + i, 'x']);
    const storage = makeStorage([...dict, ...managed]);
    const rows = inventory.collectLocalStorage(storage);
    expect(total(rows)).toBe(inventory.MAX_MANAGED_ENTRIES);
    expect(storage.reads.some((k) => k.startsWith('allo_dict_'))).toBe(false);
    expect(storage.reads).toHaveLength(inventory.MAX_MANAGED_ENTRIES);
  });

  it('does not count dictionary words in the Reclaimable row (no double count)', () => {
    const storage = makeStorage([
      ['allo_dict_habitat', '{"word":"habitat"}'],
      ['allo_dict_classify', '{"word":"classify"}'],
      ['allo_image_cache_1', 'img'],
    ]);
    const rows = inventory.collectLocalStorage(storage);
    expect(rows.map((r) => [r.id, r.count])).toEqual([['reclaimable', 1]]);
    expect(inventory.collectDictionaryCache(storage).count).toBe(2);
  });

  it('clearDictionaryCache removes every allo_dict_ key and nothing else', () => {
    const storage = makeStorage([
      ['allo_dict_a', '1'],
      ['allo_student_work', 'keep'],
      ['allo_dict_b', '2'],
      ['allo_dict_c', '3'],
      ['ALLO_DICT_upper', 'keep: other case is not the loader prefix'],
      ['allo_dictionary_settings', 'keep'],
      ['other_app', 'keep'],
    ]);
    expect(inventory.clearDictionaryCache(storage)).toBe(3);
    expect(Array.from(storage.map.keys())).toEqual(['allo_student_work', 'ALLO_DICT_upper', 'allo_dictionary_settings', 'other_app']);
    expect(inventory.collectDictionaryCache(storage).count).toBe(0);
  });

  it('the host passes a delete action and the summary to the dialog, refreshes, and announces', () => {
    expect(anti).toMatch(/deleteCachedPdfRemediationEntry, deleteDictionaryCache, dictionaryCacheSummary, downloadKokoroModel/);
    const start = anti.indexOf('const deleteDictionaryCache = () => {');
    expect(start).toBeGreaterThan(0);
    const body = anti.slice(start, anti.indexOf('\n  };', start));
    expect(body).toContain('ALLO_STORAGE_INVENTORY.clearDictionaryCache(localStorage)');
    expect(body).toContain('refreshStorageManagerInventory()');
    expect(body).toContain("t('toasts.dictionary_cache_deleted') || 'Word data for glossaries deleted from this device.'");
    expect(anti).toContain('ALLO_STORAGE_INVENTORY.collectDictionaryCache(localStorage)');
  });
});

describe('Storage and recovery dialog: Word data for glossaries row', () => {
  let React;
  let ReactDOMClient;
  let act;
  let View;
  const mounted = [];

  beforeAll(() => {
    React = require(resolve(modulesDir, 'react'));
    ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
    ({ act } = React);
    global.React = window.React = React;
    global.IS_REACT_ACT_ENVIRONMENT = true;
    loadAlloModule(BASE ? resolve(BASE, 'view_canvas_recovery_dialog_module.js') : 'view_canvas_recovery_dialog_module.js');
    View = window.AlloModules.CanvasRecoveryDialogView;
  });

  afterEach(async () => {
    while (mounted.length) {
      const { root, host } = mounted.pop();
      await act(async () => { root.unmount(); });
      host.remove();
    }
    delete window.__alloFocusTrapStack;
    delete window.__alloScrollLockState;
    document.body.style.overflow = '';
  });

  function props(overrides = {}) {
    return {
      ALLO_WORKSPACE_RECOVERY: {
        retentionStatus: () => ({ count: 0, maxSnapshots: 20, bytes: 0, maxTotalBytes: 150 * 1024 * 1024, pinnedCount: 0, policyId: 'standard', effectivePolicyId: 'standard', overTarget: false }),
        totalBytes: () => 0,
      },
      RefreshCw: () => null,
      _alloFormatWorkspaceBytes: (n) => `${Math.round(n / 1024)} KB`,
      alloModelStatus: { whisper: false, kokoro: false, busy: '', loading: false, bytes: 0 },
      canvasRecoveryBusyId: '',
      canvasRecoveryDecisionMade: true,
      canvasRecoveryDialogMode: 'manage',
      canvasRecoveryEraseId: null,
      canvasRecoveryError: '',
      canvasRecoveryErrorCode: '',
      canvasRecoveryImportInputRef: { current: null },
      canvasRecoveryRemoveMediaId: null,
      canvasRecoveryStore: { snapshots: [] },
      canvasRecoveryStoreAuthoritative: true,
      canvasRecoveryVaultForm: { mode: '' },
      canvasRecoveryVaultState: { enabled: false },
      closeCanvasRecoveryDialog: vi.fn(),
      deleteDictionaryCache: vi.fn(() => 12),
      dictionaryCacheSummary: { count: 12, approximateBytes: 7 * 1024 },
      isCanvas: false,
      lastPdfAuditResultRef: { current: null },
      pdfAuditResult: null,
      pdfFixResult: null,
      pdfRemediationCacheEntries: [],
      pdfRemediationDeleteConfirm: null,
      refreshStorageManagerInventory: vi.fn(),
      setPdfRemediationDeleteConfirm: vi.fn(),
      setStorageRetentionPolicy: vi.fn(),
      storageManagerInventory: { loading: false, origin: { usage: 1024, quota: 1024000, persisted: true }, managed: [], deviceNamespaces: [] },
      t: () => '',
      ...overrides,
    };
  }

  function mount(p) {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    act(() => { root.render(React.createElement(View, p)); });
    mounted.push({ root, host });
    return host;
  }

  const button = (el, text) => Array.from(el.querySelectorAll('button')).find((b) => b.textContent.trim() === text);
  const escape = () => act(() => {
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  });

  it('shows the row inside the managed-data block with count, size, hint and Delete', () => {
    const host = mount(props());
    const row = host.querySelector('[data-storage-dictionary-row]');
    expect(row).toBeTruthy();
    expect(host.textContent).toContain('AlloFlow-managed browser data');
    expect(row.textContent).toContain('Word data for glossaries');
    expect(row.textContent).toContain('(12)');
    expect(row.textContent).toContain('~7 KB');
    expect(row.textContent).toContain('kept so they work offline');
    expect(row.querySelector('[data-storage-dictionary-delete]').textContent.trim()).toBe('Delete');
  });

  it('asks to confirm, Escape cancels the confirm without closing, Confirm delete calls the host once', () => {
    const p = props();
    const host = mount(p);
    const row = host.querySelector('[data-storage-dictionary-row]');
    act(() => { row.querySelector('[data-storage-dictionary-delete]').click(); });
    expect(row.querySelector('[role="alert"]').textContent).toContain('Your glossaries are not changed');
    expect(p.deleteDictionaryCache).not.toHaveBeenCalled();
    escape();
    expect(row.querySelector('[role="alert"]')).toBeNull();
    expect(row.querySelector('[data-storage-dictionary-delete]')).toBeTruthy();
    expect(p.closeCanvasRecoveryDialog).not.toHaveBeenCalled();

    act(() => { row.querySelector('[data-storage-dictionary-delete]').click(); });
    act(() => { button(row, 'Cancel').click(); });
    expect(row.querySelector('[data-storage-dictionary-confirm]')).toBeNull();

    act(() => { row.querySelector('[data-storage-dictionary-delete]').click(); });
    act(() => { row.querySelector('[data-storage-dictionary-confirm]').click(); });
    expect(p.deleteDictionaryCache).toHaveBeenCalledTimes(1);
    expect(row.querySelector('[data-storage-dictionary-confirm]')).toBeNull();
    expect(host.querySelector('[role="dialog"]').contains(document.activeElement)
      || document.activeElement === host.querySelector('[role="dialog"]')).toBe(true);
  });

  it('hides the row when there are no words (as the category rows do) and keeps the block for other rows', () => {
    const managed = [{ id: 'settings', label: 'Settings and connections', count: 3, approximateBytes: 2048 }];
    const empty = mount(props({ dictionaryCacheSummary: { count: 0, approximateBytes: 0 }, storageManagerInventory: { loading: false, origin: {}, managed, deviceNamespaces: [] } }));
    expect(empty.querySelector('[data-storage-dictionary-row]')).toBeNull();
    expect(empty.textContent).toContain('Settings and connections');

    const none = mount(props({ dictionaryCacheSummary: { count: 0, approximateBytes: 0 } }));
    expect(none.textContent).not.toContain('AlloFlow-managed browser data');
  });

  it('shows the block for word data alone, and no Delete when an older host gives no action', () => {
    const host = mount(props({ deleteDictionaryCache: undefined }));
    expect(host.textContent).toContain('AlloFlow-managed browser data');
    const row = host.querySelector('[data-storage-dictionary-row]');
    expect(row.textContent).toContain('(12)');
    expect(row.querySelector('button')).toBeNull();
  });
});
