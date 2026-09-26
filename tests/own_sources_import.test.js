// Importing documents into the teacher's own corpus (2026-09-20).
//
// "Use my own sources" could retrieve from a Lumen project but there was no way
// to PUT anything in one outside STEM Lab, so the toggle stayed hidden for every
// teacher who had never opened that surface.
//
// While adding the import control I found the reason it would have stayed hidden
// even after importing: all three call sites opened the store as
//
//     E.createProjectStore(E.readingScope({}))
//
// createProjectStore takes { storageDB, localStorage, scope }. Passing the scope
// STRING as the whole options bag left it with no storage adapter AND a storage
// key derived from an object, so it loaded nothing, every time, silently. That
// wiring is now in one helper, and the first test below is the one that would
// have caught it.

import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const E = require('../stem_lab/stem_lumen_evidence.js');

// A fake device store, standing in for the host's IndexedDB wrapper.
function makeDevice() {
  const cells = {};
  return {
    cells,
    db: { get: async (k) => cells[k] || null, set: async (k, v) => { cells[k] = v; return true; } },
  };
}

// Load own_sources_module against a controlled global, the way the browser does.
function loadHelper({ documents = null, storageDB = null, pluginLoader = null } = {}) {
  const key = require.resolve('../own_sources_module.js');
  delete require.cache[key];
  const previous = {
    LumenEvidence: global.LumenEvidence,
    LumenDocuments: global.LumenDocuments,
    AlloModules: global.AlloModules,
    ensure: global.__alloEnsureStemPluginLoaded,
  };
  global.window = global;
  global.LumenEvidence = E;
  global.LumenDocuments = documents;
  global.AlloModules = storageDB ? { UtilsPure: { storageDB } } : {};
  global.__alloEnsureStemPluginLoaded = pluginLoader || undefined;
  const api = require(key);
  return { api, restore: () => Object.assign(global, previous) };
}

const docAdapter = (overrides = {}) => ({
  MAX_FILES_PER_IMPORT: 5,
  ACCEPT: '.pdf,.txt',
  extractLocalDocument: async (file) => {
    if (String(file.name).includes('scan')) throw new Error('did not contain enough readable text to add as evidence.');
    return {
      id: 'src_' + file.name,
      title: file.name,
      content: '# Assessment Windows\nBenchmark assessment occurs three times per year.',
      type: 'document',
      importMethod: 'local-file',
    };
  },
  ...overrides,
});

describe('the store is opened the way createProjectStore expects', () => {
  it('a scope passed as the whole options bag cannot load anything', async () => {
    // This is the shipped bug, pinned so it cannot come back: the wrong call is
    // not merely untidy, it silently loses the teacher's corpus.
    const device = makeDevice();
    const scope = E.readingScope({});
    const right = E.createProjectStore({ storageDB: device.db, localStorage: null, scope });
    const wrong = E.createProjectStore(scope);

    let project = E.makeProject({ title: 'unit 3' });
    project = E.upsertSource(project, {
      id: 's1', title: 'Policy', content: '# A\nSomething worth retrieving.', type: 'document', importMethod: 'local-file',
    });
    await right.save(project);

    expect(wrong.key).not.toBe(right.key);
    expect((await right.load()).sources).toHaveLength(1);
    expect(await wrong.load()).toBeNull();
  });

  it('no caller opens the store by hand any more', () => {
    for (const file of ['view_misc_panels_source.jsx', 'quickstart_source.jsx', 'content_engine_source.jsx']) {
      expect(read(file), file).not.toMatch(/createProjectStore\(/);
    }
    expect(read('own_sources_module.js')).toMatch(/storageDB: storageDb\(ctx\)/);
    expect(read('own_sources_module.js')).toMatch(/scope: E\.readingScope\(ctx \|\| \{\}\)/);
  });
});

describe('importing documents', () => {
  let helper;
  beforeEach(() => { if (helper) helper.restore(); helper = null; });

  it('stores an imported document so retrieval can find it', async () => {
    const device = makeDevice();
    helper = loadHelper({ documents: docAdapter(), storageDB: device.db });

    expect(await helper.api.countSources({})).toBe(0);
    const outcome = await helper.api.importFiles([{ name: 'policy.pdf' }], {});

    expect(outcome.ok).toBe(true);
    expect(outcome.imported).toBe(1);
    expect(outcome.count).toBe(1);
    expect(await helper.api.countSources({})).toBe(1);

    // The point of importing: the generator can now retrieve from it.
    const project = await helper.api.loadProject({});
    expect(E.retrieve(project, 'how often is benchmark assessment given')).not.toHaveLength(0);
  });

  it('reports each file separately instead of failing the whole import', async () => {
    // One unreadable scan among several documents is not "import failed", and
    // the teacher needs to know WHICH file to fix.
    const device = makeDevice();
    helper = loadHelper({ documents: docAdapter(), storageDB: device.db });

    const outcome = await helper.api.importFiles([{ name: 'good.pdf' }, { name: 'scan.pdf' }], {});
    expect(outcome.imported).toBe(1);
    expect(outcome.failed).toBe(1);

    const failure = outcome.results.find((row) => !row.ok);
    expect(failure.name).toBe('scan.pdf');
    expect(failure.message).toMatch(/readable text/);
    // Lumen's own wording reaches the teacher rather than a generic message.
    expect(failure.message).not.toBe('This document could not be read.');
  });

  it('does not claim success when the device refuses to store', async () => {
    // A save that failed silently would leave the teacher believing their
    // documents are safe on this device.
    //
    // Both stores must refuse. Lumen falls back from IndexedDB to localStorage
    // by design, and this suite runs in jsdom where localStorage really works —
    // so refusing only the db still SAVES, and an earlier version of this test
    // failed for that reason rather than finding a bug.
    const refusing = { get: async () => null, set: async () => false };
    helper = loadHelper({ documents: docAdapter(), storageDB: refusing });
    const localStore = global.localStorage;
    const throwing = {
      getItem: () => null,
      setItem: () => { throw new Error('SYNTHETIC_QUOTA_EXCEEDED'); },
      removeItem: () => {},
    };
    Object.defineProperty(global, 'localStorage', { value: throwing, configurable: true, writable: true });
    try {
      const outcome = await helper.api.importFiles([{ name: 'policy.pdf' }], {});
      expect(outcome.ok).toBe(false);
      expect(outcome.reason).toBe('storage');
      expect(outcome.imported).toBe(0);
      expect(outcome.count).toBe(0);
      expect(outcome.results.every((row) => row.ok === false)).toBe(true);
    } finally {
      Object.defineProperty(global, 'localStorage', { value: localStore, configurable: true, writable: true });
    }
  });

  it('caps a bulk selection and says so rather than dropping files quietly', async () => {
    const device = makeDevice();
    helper = loadHelper({ documents: docAdapter({ MAX_FILES_PER_IMPORT: 2 }), storageDB: device.db });

    const outcome = await helper.api.importFiles(
      [{ name: 'a.pdf' }, { name: 'b.pdf' }, { name: 'c.pdf' }],
      {},
    );
    expect(outcome.imported).toBe(2);
    const skipped = outcome.results.find((row) => row.name === 'c.pdf');
    expect(skipped.ok).toBe(false);
    expect(skipped.message).toMatch(/2 files at a time/);
  });

  // The helper waits up to 8s for Lumen's STEM plugins before giving up, so this
  // case genuinely takes that long — the timeout is raised rather than the budget
  // lowered, because a teacher on a slow connection needs the full wait.
  it('reports unavailable instead of throwing when the reader never arrives', async () => {
    helper = loadHelper({ documents: null, storageDB: makeDevice().db });
    const started = Date.now();
    const outcome = await helper.api.importFiles([{ name: 'policy.pdf' }], {});
    expect(outcome.ok).toBe(false);
    expect(outcome.reason).toBe('unavailable');
    // It must give up, not hang forever.
    expect(Date.now() - started).toBeLessThan(12000);
  }, 20000);
});

describe('research documents are isolated from the reading workspace', () => {
  it('keeps generated readings out of research without deleting them or inheriting the study label filter', async () => {
    const device = makeDevice();
    const store = E.createProjectStore({ storageDB: device.db, scope: E.readingScope({}) });
    let project = E.connectReadingSource(E.makeProject({}), {
      title: 'Adapted reading', text: 'Clouds in an earlier generated reading.', anchor: { kind: 'adapted' },
    });
    project = E.upsertSource(project, {
      id: 'source-current', title: 'Current AI draft', content: 'Clouds in the current generated draft.', importMethod: 'alloflow-current-source',
    });
    project = E.upsertSource(project, {
      id: 'notes', title: 'Cloud notes', content: 'Clouds form when water vapor condenses.', importMethod: 'local-file', labels: ['science'],
    });
    project = E.upsertSource(project, {
      id: 'history', title: 'History notes', content: 'Historical observations of clouds.', importMethod: 'paste', labels: ['history'],
    });
    project = E.setRetrievalLabel(project, 'history');
    await store.save(project);
    const helper = loadHelper({ documents: docAdapter(), storageDB: device.db });
    try {
      expect((await helper.api.listSources({})).map((row) => row.id)).toEqual(['notes', 'history']);
      expect(await helper.api.countSources({})).toBe(2);
      const research = await helper.api.loadProject({});
      expect(research.retrievalLabel).toBe('');
      expect(E.retrieve(research, 'water vapor condenses', { forAI: true }).map((hit) => hit.node.sourceId)).toContain('notes');
      expect(research.evidenceNodes.every((node) => ['notes', 'history'].includes(node.sourceId))).toBe(true);
      await helper.api.setSourceActive('notes', false, {});
      await helper.api.importFiles([{ name: 'new.pdf' }], {});
      const saved = await store.load();
      expect(saved.sources.find((row) => row.title === 'Adapted reading')).toBeTruthy();
      expect(saved.sources.find((row) => row.id === 'source-current')).toBeTruthy();
      expect(saved.sources.find((row) => row.id === 'notes').active).toBe(false);
      expect(saved.retrievalLabel).toBe('history');
    } finally { helper.restore(); }
  });

  it('does not resurrect a removed document when an import is still extracting', async () => {
    const device = makeDevice();
    let release;
    let extractionStarted;
    const started = new Promise((resolve) => { extractionStarted = resolve; });
    const helper = loadHelper({ storageDB: device.db, documents: docAdapter({
      extractLocalDocument: async (file) => {
        if (file.name === 'slow.pdf') {
          extractionStarted();
          await new Promise((resolve) => { release = resolve; });
        }
        return docAdapter().extractLocalDocument(file);
      },
    }) });
    try {
      await helper.api.importFiles([{ name: 'old.pdf' }], {});
      const importing = helper.api.importFiles([{ name: 'slow.pdf' }], {});
      await started;
      const removing = helper.api.removeSource('src_old.pdf', {});
      release();
      expect((await importing).ok).toBe(true);
      expect((await removing).ok).toBe(true);
      expect((await helper.api.listSources({})).map((row) => row.id)).toEqual(['src_slow.pdf']);
    } finally { helper.restore(); }
  });
});

describe('the import control in the source panel', () => {
  const panel = read('view_misc_panels_source.jsx');

  it('is reachable when nothing has been imported yet', () => {
    // The toggle hides at zero sources, so if the import control hid too there
    // would be no way in at all.
    expect(panel).toMatch(/ownSourceCount !== null && \(/);
    expect(panel).toContain('id="ownSourcesImport"');
  });

  it('announces the outcome to a screen reader', () => {
    expect(panel).toMatch(/role="status" aria-live="polite"[^>]*>\s*\{ownSourceImportMsg/);
  });

  it('keeps the file input operable by keyboard and labelled', () => {
    expect(panel).toContain('htmlFor="ownSourcesImport"');
    expect(panel).toMatch(/focus-within:ring-2/);
    // A visually hidden input must still be in the tab order — `hidden` or
    // display:none would take it out.
    expect(panel).toMatch(/id="ownSourcesImport"[\s\S]{0,220}className="sr-only"/);
  });

  it('clears the input so the same file can be chosen twice', () => {
    expect(panel).toMatch(/if \(input\) input\.value = '';/);
  });

  it('ships the Upload icon the control renders', () => {
    // view_misc_panels declares its icons in the BUILD script; an icon used in
    // the source but missing there renders nothing at runtime.
    expect(read('_build_view_misc_panels_module.js')).toContain("var Upload = _lazyIcon('Upload');");
    expect(read('view_misc_panels_module.js')).toContain("var Upload = _lazyIcon('Upload');");
  });
});

describe('managing what was imported', () => {
  let helper;
  beforeEach(() => { if (helper) helper.restore(); helper = null; });

  const seed = async () => {
    const device = makeDevice();
    helper = loadHelper({ documents: docAdapter(), storageDB: device.db });
    await helper.api.importFiles([{ name: 'policy.pdf' }, { name: 'handbook.pdf' }], {});
    return helper.api;
  };

  it('lists what is stored so importing is not a one-way door', async () => {
    const api = await seed();
    const rows = await api.listSources({});
    expect(rows.map((row) => row.title).sort()).toEqual(['handbook.pdf', 'policy.pdf']);
    expect(rows.every((row) => row.active)).toBe(true);
  });

  it('excluding a source keeps the document but drops it from retrieval', async () => {
    const api = await seed();
    const outcome = await api.setSourceActive('src_handbook.pdf', false, {});

    expect(outcome.ok).toBe(true);
    // Still listed, so the teacher can put it back...
    expect(outcome.sources.map((row) => row.title).sort()).toEqual(['handbook.pdf', 'policy.pdf']);
    expect(outcome.sources.find((row) => row.title === 'handbook.pdf').active).toBe(false);
    // ...but the count follows retrieval, which is what the toggle promises.
    expect(outcome.count).toBe(1);

    const project = await api.loadProject({});
    const searched = new Set(E.retrieve(project, 'benchmark assessment').map((hit) => (hit.node || hit).sourceId));
    expect(searched.has('src_handbook.pdf')).toBe(false);
  });

  it('re-including a source brings it back into retrieval', async () => {
    const api = await seed();
    await api.setSourceActive('src_handbook.pdf', false, {});
    const back = await api.setSourceActive('src_handbook.pdf', true, {});
    expect(back.count).toBe(2);
    expect(back.sources.every((row) => row.active)).toBe(true);
  });

  it('removing a source deletes it', async () => {
    const api = await seed();
    const outcome = await api.removeSource('src_policy.pdf', {});
    expect(outcome.ok).toBe(true);
    expect(outcome.sources.map((row) => row.title)).toEqual(['handbook.pdf']);
    expect(await api.countSources({})).toBe(1);
  });

  it('does not claim a removal happened when the device refuses to store', async () => {
    // Otherwise a teacher believes a document naming a student is gone when it
    // is still on the device. Both stores must refuse — Lumen falls back from
    // IndexedDB to localStorage, which really works under jsdom.
    // The device must still LOAD the corpus (otherwise the helper bails with
    // 'empty' and never reaches the storage check — an earlier version of this
    // test passed for exactly that wrong reason) but REFUSE to write it back.
    const device = makeDevice();
    helper = loadHelper({ documents: docAdapter(), storageDB: device.db });
    await helper.api.importFiles([{ name: 'policy.pdf' }, { name: 'handbook.pdf' }], {});

    const readOnly = { get: device.db.get, set: async () => false };
    helper.restore();
    helper = loadHelper({ documents: docAdapter(), storageDB: readOnly });

    const localStore = global.localStorage;
    const throwing = { getItem: () => null, setItem: () => { throw new Error('SYNTHETIC_QUOTA'); }, removeItem: () => {} };
    Object.defineProperty(global, 'localStorage', { value: throwing, configurable: true, writable: true });
    try {
      // It must have loaded the corpus, or this proves nothing.
      expect(await helper.api.countSources({})).toBe(2);
      const outcome = await helper.api.removeSource('src_policy.pdf', {});
      expect(outcome.ok).toBe(false);
      expect(outcome.reason).toBe('storage');
    } finally {
      Object.defineProperty(global, 'localStorage', { value: localStore, configurable: true, writable: true });
    }
  });
});

describe('Quick Start can import too', () => {
  const wizard = read('quickstart_source.jsx');

  it('offers the import control even when nothing is stored', () => {
    // Quick Start had the TOGGLE but no import, and the toggle hides at zero
    // sources — so a teacher starting here saw neither control and had no way
    // in at all. The import markup must therefore sit OUTSIDE that count gate.
    const gateAt = wizard.indexOf('{wizOwnSourceCount > 0 && (');
    const importAt = wizard.indexOf('id="wiz-own-sources-import"');
    expect(gateAt).toBeGreaterThan(-1);
    expect(importAt).toBeGreaterThan(-1);
    // The gate closes before the import block begins.
    const gateCloses = wizard.indexOf(')}', wizard.indexOf('wizOwnSourceCount})', gateAt));
    expect(gateCloses).toBeGreaterThan(gateAt);
    expect(importAt).toBeGreaterThan(gateCloses);
  });

  it('announces the outcome and names the files that failed', () => {
    expect(wizard).toContain('role="status" aria-live="polite"');
    expect(wizard).toContain('wizImportMsg');
    expect(wizard).toContain('wizImportFailures.map');
  });

  it('clears the input so the same file can be chosen twice', () => {
    expect(wizard).toContain("if (input) input.value = '';");
  });

  it('goes through the shared helper, not its own store', () => {
    expect(wizard).toContain('wizOwnSourcesApi.importFiles');
    expect(wizard).not.toContain('createProjectStore(');
  });
});

describe('the manage list in the source panel', () => {
  const panel = read('view_misc_panels_source.jsx');

  it('lists stored documents with exclude and remove', () => {
    expect(panel).toContain("t('input.my_sources_manage'");
    expect(panel).toContain('handleToggleOwnSource(source)');
    expect(panel).toContain('handleRemoveOwnSource(source, false)');
    expect(panel).toContain('handleRemoveOwnSource(source, true)');
  });

  it('asks before deleting, because removal is not undoable here', () => {
    const handler = panel.slice(
      panel.indexOf('handleRemoveOwnSource = React.useCallback'),
      panel.indexOf('const handleImportOwnSources'),
    );
    // The first click only asks; the delete sits behind the confirmed branch.
    const askAt = handler.indexOf('if (!confirmed) { setPendingRemoveId(source.id); return; }');
    const removeAt = handler.indexOf('ownSourcesApi.removeSource(');
    expect(askAt).toBeGreaterThan(-1);
    // The confirm must GATE the call, not follow it.
    expect(removeAt).toBeGreaterThan(askAt);
    // Asked in the panel: window.confirm returns false in Gemini Canvas, which
    // made Remove do nothing there (behaviour: own_source_controls_load_timing).
    expect(handler).not.toContain('window.confirm');
    expect(panel).toContain("t('input.my_sources_remove_confirm'");
  });

  it('names the document in the remove button for a screen reader', () => {
    // "Remove" repeated down a list tells a screen-reader user nothing.
    expect(panel).toContain("t('input.my_sources_remove_aria', { title: source.title })");
  });

  it('keeps the count and the list from disagreeing', () => {
    // Both come from the same load, and both follow what retrieval will search.
    expect(panel).toContain('setOwnSourceCount(outcome.count)');
    expect(panel).toContain('setOwnSourceList(outcome.sources)');
  });

  it('has copy for every management state', () => {
    const strings = JSON.parse(read('ui_strings.js'));
    for (const key of ['my_sources_manage', 'my_sources_exclude', 'my_sources_include',
      'my_sources_remove', 'my_sources_remove_aria', 'my_sources_remove_confirm', 'my_sources_removed']) {
      expect(strings.input[key], key).toBeTruthy();
    }
    expect(strings.input.my_sources_remove_confirm).toMatch(/cannot be undone/i);
  });
});

describe('the helper is wired into the app', () => {
  it('loads as a module and is registered for the build', () => {
    expect(read('AlloFlowANTI.txt')).toContain("loadModule('OwnSources', 'https://alloflow-cdn.pages.dev/own_sources_module.js");
    expect(read('build.js')).toContain("filename: 'own_sources_module.js'");
  });

  it('has real copy for every state it can report', () => {
    const strings = JSON.parse(read('ui_strings.js'));
    for (const key of [
      'my_sources_add', 'my_sources_importing', 'my_sources_empty', 'my_sources_stored',
      'my_sources_imported', 'my_sources_none_added', 'my_sources_storage_failed', 'my_sources_unavailable',
    ]) {
      expect(strings.input[key], key).toBeTruthy();
    }
    // The privacy claim is the reason a teacher will trust this control.
    expect(strings.input.my_sources_empty).toMatch(/stored on this device/i);
    expect(strings.input.my_sources_empty).toMatch(/excerpts are shared with your selected AI provider/i);
  });
});
