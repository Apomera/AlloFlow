/*
 * own_sources_module.js — the teacher's own imported documents, as one seam.
 *
 * "Use my own sources" needs the same three things in four places (the source
 * generator's research stage, its toggle, the Quick Start toggle, and the
 * import control): open the right Lumen project, count what is in it, and add a
 * document to it. Each of those used to open the store itself, and each did it
 * WRONG in the same way:
 *
 *     E.createProjectStore(E.readingScope({}))
 *
 * createProjectStore takes { storageDB, localStorage, scope }, so passing the
 * scope STRING as the whole options bag left it with no storage adapter and a
 * storage key derived from an object instead of the scope. It therefore loaded
 * nothing, every time — the toggle stayed hidden and retrieval found no
 * sources, silently, on a machine where the teacher had imported documents.
 *
 * One helper, one correct call. Everything here is local: IndexedDB through the
 * host's storage wrapper, with localStorage as the fallback Lumen already uses.
 * A document's bytes never leave the device.
 */
(function (root) {
  'use strict';

  function evidenceApi() {
    try { return (root.LumenEvidence && typeof root.LumenEvidence.createProjectStore === 'function') ? root.LumenEvidence : null; }
    catch (_) { return null; }
  }

  function documentsApi() {
    try { return (root.LumenDocuments && typeof root.LumenDocuments.extractLocalDocument === 'function') ? root.LumenDocuments : null; }
    catch (_) { return null; }
  }

  /*
   * Lumen's evidence and document modules ship as STEM Lab plugins, so on the
   * source-generator screen they are usually NOT loaded yet. Ask the host's
   * plugin loader for them and wait briefly for them to register.
   *
   * Everything here degrades to "unavailable" rather than throwing: a teacher
   * who never opens STEM Lab should see the control report that the reader is
   * still loading, not a broken page.
   */
  var LUMEN_MODULES = ['stem_lab/stem_lumen_evidence.js', 'stem_lab/stem_lumen_documents.js'];

  async function ensureLumen(timeoutMs) {
    if (evidenceApi() && documentsApi()) return true;
    try {
      if (typeof root.__alloEnsureStemPluginLoaded === 'function') {
        LUMEN_MODULES.forEach(function (name) {
          try { root.__alloEnsureStemPluginLoaded(name); } catch (_) { /* keep asking for the rest */ }
        });
      }
    } catch (_) { /* fall through to the wait below */ }

    var deadline = Date.now() + (Number(timeoutMs) > 0 ? Number(timeoutMs) : 8000);
    while (Date.now() < deadline) {
      if (evidenceApi() && documentsApi()) return true;
      await new Promise(function (resolve) { setTimeout(resolve, 120); });
    }
    return !!(evidenceApi() && documentsApi());
  }

  // Same resolution order as Lumen Study: an explicit ctx wins, then the host's
  // shared wrapper. Returning null is fine — the store falls back to
  // localStorage, and Lumen reports a storage-unavailable state from there.
  function storageDb(ctx) {
    try {
      if (ctx && ctx.storageDB) return ctx.storageDB;
      return (root.AlloModules && root.AlloModules.UtilsPure && root.AlloModules.UtilsPure.storageDB) || null;
    } catch (_) { return null; }
  }

  function localStorageApi() {
    try { return root.localStorage || null; } catch (_) { return null; }
  }

  // ctx carries isTeacherMode / activeProfileId / studentNickname, so a learner
  // and a teacher on the same device keep separate corpora — the scoping Lumen
  // already applies. Passing nothing yields the teacher's default scope.
  function openStore(ctx) {
    var E = evidenceApi();
    if (!E) return null;
    return E.createProjectStore({
      storageDB: storageDb(ctx),
      localStorage: localStorageApi(),
      scope: E.readingScope(ctx || {}),
    });
  }

  async function loadProject(ctx) {
    var store = openStore(ctx);
    if (!store || typeof store.load !== 'function') return null;
    try { return await store.load(); } catch (_) { return null; }
  }

  // Only ACTIVE sources, because that is exactly the set retrieval will search:
  // a count that includes excluded sources promises more than the AI will see.
  function activeSourceCount(project) {
    if (!project || !Array.isArray(project.sources)) return 0;
    return project.sources.filter(function (source) { return source && source.active !== false; }).length;
  }

  /*
   * List what the teacher has stored, so importing is not a one-way door.
   *
   * A corpus you can add to but never inspect or correct is a liability: the
   * teacher who imports the wrong PDF — or one naming a student — needs to see
   * it and take it back out.
   */
  async function listSources(ctx) {
    var project = await loadProject(ctx);
    if (!project || !Array.isArray(project.sources)) return [];
    return project.sources.map(function (source) {
      return {
        id: source.id,
        title: source.title || 'Untitled source',
        // `active !== false` matches how retrieval decides eligibility, so the
        // list cannot promise a different set than the AI will actually read.
        active: source.active !== false,
        locator: source.locator || '',
        chars: typeof source.content === 'string' ? source.content.length : 0,
      };
    });
  }

  // Shared tail for the two mutating operations: apply, persist, report. A save
  // that failed must not be reported as done — the teacher would believe a
  // document was removed when it is still there.
  async function commit(ctx, mutate) {
    var E = evidenceApi();
    if (!E) return { ok: false, reason: 'unavailable', count: 0, sources: [] };
    var store = openStore(ctx);
    var project = store && typeof store.load === 'function' ? await store.load() : null;
    if (!project) return { ok: false, reason: 'empty', count: 0, sources: [] };

    var next;
    try { next = mutate(E, project); } catch (_) { return { ok: false, reason: 'failed', count: activeSourceCount(project), sources: [] }; }
    if (!next) return { ok: false, reason: 'failed', count: activeSourceCount(project), sources: [] };

    var saved = { ok: false };
    if (store && typeof store.save === 'function') {
      try { saved = await store.save(next); } catch (_) { saved = { ok: false }; }
      if (!saved || saved.ok !== true) {
        return { ok: false, reason: 'storage', count: activeSourceCount(project), sources: [] };
      }
    }
    return { ok: true, reason: '', count: activeSourceCount(next), sources: await listSources(ctx) };
  }

  async function removeSource(sourceId, ctx) {
    if (!sourceId) return { ok: false, reason: 'failed', count: 0, sources: [] };
    return commit(ctx, function (E, project) { return E.removeSource(project, sourceId, Date.now()); });
  }

  // Excluding a source keeps the document but takes it out of retrieval — the
  // gentler option when a teacher wants this unit's sources only.
  async function setSourceActive(sourceId, active, ctx) {
    if (!sourceId) return { ok: false, reason: 'failed', count: 0, sources: [] };
    return commit(ctx, function (E, project) { return E.setSourceActive(project, sourceId, active !== false, Date.now()); });
  }

  async function countSources(ctx) {
    // A short wait only: this runs on panel open, and a teacher who has never
    // imported anything should not pay a long pause for a corpus that is empty.
    if (!evidenceApi()) await ensureLumen(2500);
    return activeSourceCount(await loadProject(ctx));
  }

  /*
   * Import files into the teacher's corpus.
   *
   * Extraction runs in the browser through Lumen's own adapter, so a PDF's
   * bytes stay on the device and only its text is stored. Each file is reported
   * separately: one unreadable scan among five documents should not read as
   * "import failed".
   */
  async function importFiles(fileList, ctx) {
    // The teacher just picked files, so it is worth waiting for the reader.
    await ensureLumen(8000);
    var E = evidenceApi();
    var D = documentsApi();
    if (!E || !D) return { ok: false, reason: 'unavailable', imported: 0, failed: 0, results: [], count: 0 };

    var files = Array.prototype.slice.call(fileList || []);
    var limit = Number(D.MAX_FILES_PER_IMPORT) > 0 ? Number(D.MAX_FILES_PER_IMPORT) : 5;
    var skipped = files.slice(limit);
    files = files.slice(0, limit);
    if (!files.length) return { ok: false, reason: 'empty', imported: 0, failed: 0, results: [], count: await countSources(ctx) };

    var store = openStore(ctx);
    var project = (store && typeof store.load === 'function' ? await store.load() : null) || E.makeProject({ title: 'My sources' });

    var results = [];
    var imported = 0;
    var failed = 0;
    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      try {
        var spec = await D.extractLocalDocument(file, { root: root, evidence: E });
        project = E.upsertSource(project, spec);
        imported++;
        results.push({ name: file && file.name, ok: true, title: spec.title });
      } catch (error) {
        failed++;
        results.push({
          name: file && file.name,
          ok: false,
          // Lumen's adapter writes these for a person ("did not contain enough
          // readable text"), so pass it through rather than replacing it.
          message: (error && error.message) ? error.message : 'This document could not be read.',
        });
      }
    }
    skipped.forEach(function (file) {
      results.push({ name: file && file.name, ok: false, message: 'Not imported — ' + limit + ' files at a time.' });
    });

    var saved = { ok: false };
    if (imported && store && typeof store.save === 'function') {
      try { saved = await store.save(project); } catch (_) { saved = { ok: false }; }
      // A save that silently failed would leave the teacher believing their
      // documents are stored. Report it instead.
      if (!saved || saved.ok !== true) {
        return { ok: false, reason: 'storage', imported: 0, failed: failed + imported, results: results, count: activeSourceCount(project) };
      }
    }

    return {
      ok: imported > 0,
      reason: imported ? '' : 'failed',
      imported: imported,
      failed: failed + skipped.length,
      results: results,
      count: activeSourceCount(project),
      medium: saved && saved.medium ? saved.medium : '',
    };
  }

  // A function, not a constant: this module can load before LumenDocuments
  // does, and a constant captured at that moment would freeze the fallback list
  // even after the real adapter arrived with its own (possibly wider) set.
  function acceptAttribute() {
    var D = documentsApi();
    return (D && D.ACCEPT) || '.pdf,.docx,.pptx,.xlsx,.xls,.xlsb,.ods,.txt,.md,.markdown,.csv,.epub';
  }

  var api = {
    acceptAttribute: acceptAttribute,
    available: function () { return !!(evidenceApi() && documentsApi()); },
    ensureLumen: ensureLumen,
    openStore: openStore,
    loadProject: loadProject,
    activeSourceCount: activeSourceCount,
    countSources: countSources,
    listSources: listSources,
    removeSource: removeSource,
    setSourceActive: setSourceActive,
    importFiles: importFiles,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) {
    root.AlloOwnSources = api;
    root.AlloModules = root.AlloModules || {};
    root.AlloModules.OwnSources = api;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));
