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
(function (rawRoot) {
  'use strict';
  var root = (rawRoot && (typeof rawRoot === 'object' || typeof rawRoot === 'function')) ? rawRoot : null;

  function _osStr(v, fb) {
    if (v == null || typeof v === 'symbol') return fb || '';
    if (typeof v === 'string') return v;
    if (typeof v === 'number') return Number.isFinite(v) ? String(v) : (fb || '');
    if (typeof v === 'boolean') return String(v);
    try { return String(v); } catch (_) { return fb || ''; }
  }

  function _osNum(v) {
    if (typeof v === 'number') return v;
    if (typeof v === 'string' && v.trim() !== '') return Number(v);
    return NaN;
  }

  function evidenceApi() {
    try { return (root && root.LumenEvidence && typeof root.LumenEvidence.createProjectStore === 'function') ? root.LumenEvidence : null; }
    catch (_) { return null; }
  }

  function documentsApi() {
    try { return (root && root.LumenDocuments && typeof root.LumenDocuments.extractLocalDocument === 'function') ? root.LumenDocuments : null; }
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
  var _ensureLumenPromise = null;

  function ensureLumen(timeoutMs) {
    if (evidenceApi() && documentsApi()) return Promise.resolve(true);
    if (_ensureLumenPromise) return _ensureLumenPromise;
    var parsedWait = _osNum(timeoutMs);
    var waitMs = (Number.isFinite(parsedWait) && parsedWait > 0) ? Math.min(parsedWait, 30000) : 8000;
    var run = (async function () {
      try {
        if (root && typeof root.__alloEnsureStemPluginLoaded === 'function') {
          LUMEN_MODULES.forEach(function (name) {
            try { root.__alloEnsureStemPluginLoaded(name); } catch (_) { /* keep asking for the rest */ }
          });
        }
      } catch (_) { /* fall through to the wait below */ }

      var deadline = Date.now() + waitMs;
      while (Date.now() < deadline) {
        if (evidenceApi() && documentsApi()) return true;
        await new Promise(function (resolve) { setTimeout(resolve, 120); });
      }
      return !!(evidenceApi() && documentsApi());
    })();
    _ensureLumenPromise = run;
    var clear = function () { if (_ensureLumenPromise === run) _ensureLumenPromise = null; };
    run.then(clear, clear);
    return run;
  }

  // Same resolution order as Lumen Study: an explicit ctx wins, then the host's
  // shared wrapper. Returning null is fine — the store falls back to
  // localStorage, and Lumen reports a storage-unavailable state from there.
  function storageDb(ctx) {
    try {
      if (ctx && ctx.storageDB) return ctx.storageDB;
      return (root && root.AlloModules && root.AlloModules.UtilsPure && root.AlloModules.UtilsPure.storageDB) || null;
    } catch (_) { return null; }
  }

  function localStorageApi() {
    if (!root) return null;
    try { return root.localStorage || null; }
    catch (error) {
      // A denied fallback may contain newer data; it is not an absent adapter.
      return { getItem: function () { throw error; } };
    }
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

  async function readStoredProject(store, forMutation) {
    if (!store) return { ok: false, project: null, reason: 'unavailable' };
    try {
      if (typeof store.loadState === 'function') {
        var state = await store.loadState();
        return state && state.ok === true
          ? { ok: true, project: state.project || null, reason: '' }
          : { ok: false, project: null, reason: state && state.reason === 'corrupt' ? 'corrupt' : 'storage-read' };
      }
      // Older adapters collapse failed reads into null. They remain readable,
      // but cannot safely authorize a write over a supposedly empty library.
      if (!forMutation && typeof store.load === 'function') return { ok: true, project: await store.load(), reason: '' };
    } catch (_) { return { ok: false, project: null, reason: 'storage-read' }; }
    return { ok: false, project: null, reason: 'unavailable' };
  }

  async function loadProject(ctx) {
    // Capture this run's selection before awaiting storage. Selection belongs
    // to the caller, never to the shared Lumen library.
    var selectedIds = ctx && Array.isArray(ctx.selectedSourceIds) ? ctx.selectedSourceIds.slice() : undefined;
    var store = openStore(ctx);
    var state = await readStoredProject(store);
    return state.ok ? researchProject(state.project, selectedIds) : null;
  }

  function getResearchProject(ctx, selectedSourceIds) {
    var baseCtx = (ctx && typeof ctx === 'object' && !Array.isArray(ctx)) ? ctx : {};
    return loadProject(Object.assign({}, baseCtx, { selectedSourceIds: selectedSourceIds }));
  }

  // Lumen also saves the current/adapted reading here. Those app-created
  // readings are not imported research documents. Filter a copy for research;
  // never delete the reading or its notes from the shared study project.
  function isResearchSource(source) {
    return !!source && typeof source === 'object' && !Array.isArray(source) && source.type !== 'reading'
      && source.importMethod !== 'reading-workspace'
      && source.importMethod !== 'alloflow-current-source'
      && source.id !== 'source-current'
      && !/^src_reading_/.test(_osStr(source.id));
  }

  function researchProject(project, selectedSourceIds) {
    if (!project || !Array.isArray(project.sources)) return null;
    var selected = Array.isArray(selectedSourceIds) ? new Set(selectedSourceIds.filter(function (id) { return typeof id === 'string'; })) : null;
    var sources = project.sources.filter(isResearchSource).map(function (source) {
      return Object.assign({}, source, {
        active: source.allowAI !== false && (selected ? selected.has(source.id) : source.active !== false),
      });
    });
    var ids = new Set(sources.map(function (source) { return source.id; }));
    return Object.assign({}, project, {
      sources: sources,
      evidenceNodes: (Array.isArray(project.evidenceNodes) ? project.evidenceNodes : []).filter(function (node) { return node && ids.has(node.sourceId); }),
      // The generator's Include/Exclude controls select its sources. A label
      // selected in Lumen must not silently narrow this separate workflow.
      retrievalLabel: '',
    });
  }

  // Only ACTIVE sources, because that is exactly the set retrieval will search:
  // a count that includes excluded sources promises more than the AI will see.
  function activeSourceCount(project) {
    if (!project || !Array.isArray(project.sources)) return 0;
    return project.sources.filter(function (source) { return isResearchSource(source) && source.active !== false && source.allowAI !== false; }).length;
  }

  /*
   * List what the teacher has stored, so importing is not a one-way door.
   *
   * A corpus you can add to but never inspect or correct is a liability: the
   * teacher who imports the wrong PDF — or one naming a student — needs to see
   * it and take it back out.
   */
  function sourceSummaries(project) {
    if (!project || !Array.isArray(project.sources)) return [];
    return project.sources.filter(function (source) { return !!(source && typeof source === 'object'); }).map(function (source) {
      return {
        id: source.id,
        title: source.title || 'Untitled source',
        // `active !== false` matches how retrieval decides eligibility, so the
        // list cannot promise a different set than the AI will actually read.
        active: source.active !== false,
        allowAI: source.allowAI !== false,
        locator: source.locator || '',
        chars: typeof source.content === 'string' ? source.content.length : 0,
        version: (function () { var v = _osNum(source.version); return (Number.isFinite(v) && v > 0) ? v : 1; })(),
        fileName: source.fileName || '',
        fileSize: source.fileSize,
        importedAt: source.importedAt || '',
        documentPartCount: (function () { var c = _osNum(source.documentPartCount); return (Number.isFinite(c) && c > 0) ? c : 1; })(),
      };
    });
  }

  async function readLibrary(ctx) {
    var selectedIds = ctx && Array.isArray(ctx.selectedSourceIds) ? ctx.selectedSourceIds.slice() : undefined;
    var state = await readStoredProject(openStore(ctx));
    return {
      ok: state.ok,
      reason: state.reason,
      sources: state.ok ? sourceSummaries(researchProject(state.project, selectedIds)) : [],
    };
  }

  async function listSources(ctx) {
    return (await readLibrary(ctx)).sources;
  }

  // Shared tail for the two mutating operations: apply, persist, report. A save
  // that failed must not be reported as done — the teacher would believe a
  // document was removed when it is still there.
  var mutationQueues = Object.create(null);
  function _safeScopeStr(v, fb) {
    if (v == null || v === '') return fb;
    try { return String(v).slice(0, 128); } catch (_) { return fb; }
  }
  function withMutation(ctx, operation) {
    var safeCtx = (ctx && typeof ctx === 'object' && !Array.isArray(ctx)) ? ctx : null;
    var key = JSON.stringify([safeCtx && safeCtx.isTeacherMode === false ? 'learner' : 'teacher',
      _safeScopeStr(safeCtx && safeCtx.activeProfileId, ''), _safeScopeStr(safeCtx && safeCtx.studentNickname, 'default')]);
    var pending = (mutationQueues[key] || Promise.resolve()).catch(function () {}).then(operation);
    mutationQueues[key] = pending;
    var cleanup = function () { if (mutationQueues[key] === pending) delete mutationQueues[key]; };
    pending.then(cleanup, cleanup);
    return pending;
  }

  async function commit(ctx, mutate) {
    // Exclude/Remove used to report "unavailable" at once when Lumen had not
    // loaded yet, so the buttons silently did nothing. Wait as import does.
    if (!evidenceApi()) await ensureLumen(8000);
    var E = evidenceApi();
    if (!E) return { ok: false, reason: 'unavailable', count: 0, sources: [] };
    var store = openStore(ctx);
    var state = await readStoredProject(store, true);
    if (!state.ok) return { ok: false, reason: state.reason, count: 0, sources: [] };
    var project = state.project;
    if (!project) return { ok: false, reason: 'empty', count: 0, sources: [] };

    var next;
    try { next = mutate(E, project); } catch (_) { return { ok: false, reason: 'failed', count: activeSourceCount(researchProject(project, ctx && ctx.selectedSourceIds)), sources: [] }; }
    if (!next) return { ok: false, reason: 'failed', count: activeSourceCount(researchProject(project, ctx && ctx.selectedSourceIds)), sources: [] };

    var saved = { ok: false };
    if (store && typeof store.save === 'function') {
      try { saved = await store.save(next); } catch (_) { saved = { ok: false }; }
    }
    if (!saved || saved.ok !== true) {
      return { ok: false, reason: 'storage', count: activeSourceCount(researchProject(project, ctx && ctx.selectedSourceIds)), sources: [] };
    }
    var savedProject = researchProject(next, ctx && ctx.selectedSourceIds);
    return { ok: true, reason: '', count: activeSourceCount(savedProject), sources: sourceSummaries(savedProject) };
  }

  async function removeSource(sourceId, ctx) {
    if (!sourceId) return { ok: false, reason: 'failed', count: 0, sources: [] };
    var result = await withMutation(ctx, function () {
      return commit(ctx, function (E, project) { return E.removeSource(project, sourceId, Date.now()); });
    });
    if (result && result.ok) {
      try {
        if (root && root.AlloResearchEvidence && typeof root.AlloResearchEvidence.purgeBySourceId === 'function') {
          root.AlloResearchEvidence.purgeBySourceId(sourceId);
        }
      } catch (_) {}
    }
    return result;
  }

  // Excluding a source keeps the document but takes it out of retrieval — the
  // gentler option when a teacher wants this unit's sources only.
  async function setSourceActive(sourceId, active, ctx) {
    if (!sourceId) return { ok: false, reason: 'failed', count: 0, sources: [] };
    return withMutation(ctx, function () {
      return commit(ctx, function (E, project) { return E.setSourceActive(project, sourceId, active !== false, Date.now()); });
    });
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
  function _toFileArray(fileList) {
    if (!fileList || typeof fileList !== 'object' || typeof fileList.length !== 'number' || !Number.isFinite(fileList.length) || fileList.length <= 0) return [];
    return Array.prototype.slice.call(fileList, 0, Math.min(Math.floor(fileList.length), 500));
  }

  function importFiles(fileList, ctx) {
    var files = _toFileArray(fileList);
    return withMutation(ctx, function () { return importFilesNow(files, ctx); });
  }

  function documentName(source) {
    return _osStr(source && (source.fileName || source.title)).trim().toLowerCase();
  }

  function identicalDocument(existing, incoming) {
    if (!existing || !incoming || typeof existing.content !== 'string' || typeof incoming.content !== 'string') return false;
    if (existing.fileContentHash && incoming.fileContentHash) return existing.fileContentHash === incoming.fileContentHash && existing.content === incoming.content;
    return !!existing.contentHash && existing.contentHash === incoming.contentHash && existing.content === incoming.content;
  }

  function findDuplicate(project, incoming) {
    var inName = documentName(incoming);
    var matches = (project.sources || []).filter(function (source) {
      return source && (source.id === incoming.id || (inName && isResearchSource(source) && documentName(source) === inName));
    });
    // A previous Keep both may already contain this exact file. Match that
    // copy first, rather than treating the original filename as a replacement.
    return matches.find(function (source) { return identicalDocument(source, incoming); })
      || matches.find(function (source) { return source.id === incoming.id; }) || matches[0] || null;
  }

  function duplicateSummary(source) {
    var ver = _osNum(source.version);
    return {
      id: source.id, title: source.title, fileName: source.fileName || source.title,
      fileSize: source.fileSize, chars: typeof source.content === 'string' ? source.content.length : 0, version: (Number.isFinite(ver) && ver > 0) ? ver : 1,
      importedAt: source.importedAt || '', active: source.active !== false, allowAI: source.allowAI !== false,
    };
  }

  function duplicateRevision(source) {
    return source ? JSON.stringify([source.id, source.contentHash, source.fileContentHash || '', source.version, source.title]) : '';
  }

  function separateCopy(project, spec, incoming) {
    var existingSources = (project && Array.isArray(project.sources)) ? project.sources.filter(function (s) { return !!(s && typeof s === 'object'); }) : [];
    var ids = new Set(existingSources.map(function (source) { return source.id; }));
    var baseId = _osStr(spec.id) + '_' + _osStr(incoming.contentHash);
    var id = baseId;
    var suffix = 2;
    while (ids.has(id)) { id = baseId + '_' + suffix; suffix++; }
    var titles = new Set(existingSources.map(function (source) { return _osStr(source.title).toLowerCase(); }));
    var name = _osStr(spec.title || spec.fileName, 'Untitled source') || 'Untitled source';
    var extension = name.match(/(\.[^./\\]+)$/);
    var stem = extension ? name.slice(0, -extension[1].length) : name;
    var title = name;
    suffix = 2;
    while (titles.has(title.toLowerCase())) {
      title = stem + ' (' + suffix + ')' + (extension ? extension[1] : '');
      suffix++;
    }
    return Object.assign({}, spec, { id: id, title: title });
  }

  async function importFilesNow(fileList, ctx) {
    // The teacher just picked files, so it is worth waiting for the reader.
    await ensureLumen(8000);
    var E = evidenceApi();
    var D = documentsApi();
    if (!E || !D) return { ok: false, reason: 'unavailable', imported: 0, skipped: 0, failed: 0, results: [], count: 0 };

    var files = _toFileArray(fileList);
    var rawLimit = _osNum(D.MAX_FILES_PER_IMPORT);
    var limit = (Number.isFinite(rawLimit) && rawLimit > 0) ? Math.min(Math.floor(rawLimit), 50) : 5;
    var overLimit = files.slice(limit, limit + 500);
    files = files.slice(0, limit);
    if (!files.length) return { ok: false, reason: 'empty', imported: 0, skipped: 0, failed: 0, results: [], count: await countSources(ctx) };

    var store = openStore(ctx);
    var loadLatest = async function () {
      var state = await readStoredProject(store, true);
      if (!state.ok) {
        var error = new Error(state.reason === 'unavailable'
          ? 'The document library needs to reload before files can be changed. Refresh this page and try again. This file was not added or replaced.'
          : 'Saved documents could not be read. This file was not added or replaced. Retry loading your documents.');
        error.ownSourceReason = state.reason;
        throw error;
      }
      return state.project || E.makeProject({ title: 'My sources' });
    };

    var results = [];
    var imported = 0;
    var skipped = 0;
    var failed = 0;
    var storageFailed = false;
    var storageReadFailed = '';
    var medium = '';
    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      try {
        var spec = await D.extractLocalDocument(file, { root: root, evidence: E });
        if (!spec || typeof spec !== 'object' || Array.isArray(spec)) {
          throw new Error('This document could not be read.');
        }
        spec = Object.assign({}, spec, { fileName: spec.fileName || (file && file.name) || spec.title });
        var incoming = E.normalizeSource(spec);
        spec.id = incoming.id;
        var project = await loadLatest();
        var duplicate = findDuplicate(project, incoming);
        var decision = '';
        var identical = false;
        var dupAttempts = 0;
        while (duplicate && dupAttempts < 5) {
          dupAttempts++;
          identical = identicalDocument(duplicate, incoming);
          if (!ctx || typeof ctx.resolveDuplicate !== 'function') {
            decision = identical ? 'skip' : '';
            break;
          }
          var revision = duplicateRevision(duplicate);
          decision = await ctx.resolveDuplicate({
            existing: duplicateSummary(duplicate), incoming: duplicateSummary(incoming), identical: identical,
          });
          if (decision !== 'replace' && decision !== 'keep-both') break;
          // A dialog can stay open while another Lumen surface saves. Apply
          // the decision to a fresh project, and ask again if its target changed.
          project = await loadLatest();
          duplicate = findDuplicate(project, incoming);
          if (!duplicate || duplicateRevision(duplicate) === revision) break;
        }
        if (decision === 'skip' || (duplicate && decision !== 'replace' && decision !== 'keep-both')) {
          var explicitSkip = decision === 'skip';
          skipped++;
          results.push({
            name: file && file.name, title: incoming.title, sourceId: duplicate ? duplicate.id : '',
            action: 'skipped', ok: explicitSkip,
            reason: explicitSkip ? (identical ? 'duplicate' : 'skipped') : 'duplicate-name',
            message: explicitSkip
              ? (identical && (!ctx || typeof ctx.resolveDuplicate !== 'function') ? 'Skipped — this document is already saved.' : 'Skipped — this file was not imported.')
              : 'Not imported — a document with this filename already exists. Choose Keep both, Replace, or Skip duplicate.',
          });
          continue;
        }
        var action = 'added';
        if (duplicate && decision === 'replace') {
          // Replacement retains the stored document's identity, inclusion and
          // privacy restriction; upsertSource increments its evidence version.
          spec = Object.assign({}, spec, {
            id: duplicate.id, active: duplicate.active !== false,
            allowAI: duplicate.allowAI !== false && spec.allowAI !== false,
          });
          action = 'replaced';
        } else if (duplicate && decision === 'keep-both') {
          spec = separateCopy(project, spec, incoming);
        }
        // Persist each accepted file before showing the next dialog. A later
        // failed save cannot turn earlier successful imports into false failures.
        var next = E.upsertSource(project, spec);
        var saved = { ok: false };
        if (store && typeof store.save === 'function') {
          try { saved = await store.save(next); } catch (_) { saved = { ok: false }; }
        }
        if (!saved || saved.ok !== true) {
          storageFailed = true;
          failed++;
          results.push({ name: file && file.name, title: spec.title, sourceId: spec.id, action: 'skipped', ok: false, reason: 'storage', message: 'This document could not be saved on this device.' });
          continue;
        }
        medium = saved.medium || medium;
        imported++;
        results.push({ name: file && file.name, ok: true, title: spec.title, sourceId: spec.id, action: action });
      } catch (error) {
        if (error && error.ownSourceReason) storageReadFailed = error.ownSourceReason;
        failed++;
        results.push({
          name: file && file.name,
          ok: false,
          action: 'skipped', reason: error && error.ownSourceReason || 'failed', sourceId: '',
          // Lumen's adapter writes these for a person ("did not contain enough
          // readable text"), so pass it through rather than replacing it.
          message: (error && typeof error.message === 'string' && error.message) ? error.message : 'This document could not be read.',
        });
      }
    }
    overLimit.forEach(function (file) {
      skipped++;
      results.push({ name: file && file.name, sourceId: '', action: 'skipped', reason: 'limit', ok: false, message: 'Not imported — ' + limit + ' files at a time.' });
    });

    var skippedOnly = imported === 0 && failed === 0 && results.every(function (row) { return row.ok; });
    return {
      ok: !storageFailed && !storageReadFailed && (imported > 0 || skippedOnly),
      reason: storageReadFailed || (storageFailed ? 'storage' : (imported ? '' : (skippedOnly ? 'skipped' : ((results.find(function (row) { return !row.ok; }) || {}).reason || 'failed')))),
      imported: imported,
      skipped: skipped,
      failed: failed,
      results: results,
      count: await countSources(ctx),
      medium: medium,
    };
  }

  // A function, not a constant: this module can load before LumenDocuments
  // does, and a constant captured at that moment would freeze the fallback list
  // even after the real adapter arrived with its own (possibly wider) set.
  function acceptAttribute() {
    var D = documentsApi();
    return (D && D.ACCEPT) || '.pdf,.docx,.pptx,.xlsx,.xls,.xlsb,.ods,.txt,.md,.markdown,.csv,.epub';
  }

  var api = Object.freeze({
    acceptAttribute: acceptAttribute,
    available: function () { return !!(evidenceApi() && documentsApi()); },
    ensureLumen: ensureLumen,
    openStore: openStore,
    loadProject: loadProject,
    getResearchProject: getResearchProject,
    activeSourceCount: activeSourceCount,
    countSources: countSources,
    readLibrary: readLibrary,
    listSources: listSources,
    removeSource: removeSource,
    setSourceActive: setSourceActive,
    importFiles: importFiles,
  });

  if (typeof module === 'object' && module !== null && module.exports) module.exports = api;
  if (root) {
    try {
      root.AlloOwnSources = api;
      if (!root.AlloModules || typeof root.AlloModules !== 'object') root.AlloModules = {};
      root.AlloModules.OwnSources = api;
    } catch (_) {}
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));

// Bundled with own_sources_module.js so citation inspection is available wherever
// the document library is loaded. Snapshots describe the passage supplied at generation.
(function(rawRoot) {
  'use strict';
  var root = (rawRoot && (typeof rawRoot === 'object' || typeof rawRoot === 'function')) ? rawRoot : null;
  if (!root || root.AlloResearchEvidence) return;
  var prefix = '#allo-doc-';
  var storagePrefix = 'alloflow.research-evidence.v1.';
  var closeViewer = null;
  var sequence = 0;
  function safeStr(v, fb) {
    if (v == null || typeof v === 'symbol') return fb || '';
    if (typeof v === 'string') return v;
    if (typeof v === 'number') return Number.isFinite(v) ? String(v) : (fb || '');
    if (typeof v === 'boolean') return String(v);
    try { return String(v); } catch (_) { return fb || ''; }
  }
  function safeJsonParse(raw) {
    return JSON.parse(raw, function (k, v) {
      return (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v;
    });
  }
  function isEphemeralStudentMode() {
    try {
      var k = root && typeof root.__alloActiveLearnerKey === 'string' ? root.__alloActiveLearnerKey.trim() : '';
      if (k) return false;
      return Boolean(root && (root.__alloQrStudentMode || root.__alloStudentView === true));
    } catch (_) { return false; }
  }
  function activePrefix() {
    try {
      var k = root && typeof root.__alloActiveLearnerKey === 'string' ? root.__alloActiveLearnerKey.trim() : '';
      if (k) return storagePrefix + 'u_' + encodeURIComponent(k.slice(0, 64)) + '.';
      if (isEphemeralStudentMode()) return storagePrefix + 'ephemeral.';
    } catch (_) {}
    return storagePrefix;
  }
  function escapeMarkdown(value) {
    return safeStr(value).replace(/[\\`*_{}\[\]()<>#!|~&]/g, '\\$&');
  }
  function passage(row) { return safeStr(row && row.snippet).slice(0, 1200); }
  function snapshot(evidence) {
    var run = Date.now().toString(36) + '-' + (++sequence).toString(36) + '-' + Math.random().toString(36).slice(2, 10);
    return (Array.isArray(evidence) ? evidence : []).filter(function (row) { return !!(row && typeof row === 'object'); }).slice(0, 500).map(function(row, index) {
      var v = row && row.version;
      var safeVersion = (Number.isSafeInteger(v) && v > 0) ? v : null;
      var item = {
        id: run + '-' + (index + 1), sourceId: safeStr(row.sourceId).slice(0, 200),
        evidenceId: safeStr(row.evidenceId).slice(0, 200), title: (safeStr(row.title) || 'Imported document').slice(0, 500),
        locatorLabel: safeStr(row.locatorLabel).slice(0, 200), version: safeVersion,
        passage: passage(row), suppliedAt: new Date().toISOString()
      };
      return item;
    });
  }
  // Insert in the evidence IIFE, replacing remember/lookup. Dependencies: root,
  // storagePrefix. The original document library uses a different namespace.
  var cacheLimits = Object.freeze({ persistentItems: 200, persistentBytes: 512 * 1024,
    memoryItems: 64, memoryBytes: 256 * 1024, itemBytes: 16 * 1024 });
  var citationMemory = new Map();
  var citationMemoryBytes = 0;
  var citationClock = 0;
  var citationTouchInterval = 60000;
  function citationId(id) { return typeof id === 'string' && /^[a-z0-9-]{1,128}$/.test(id); }
  function citationBytes(key, raw) { return (key.length + raw.length) * 2; }
  function normaliseSnapshot(value) {
    try {
      if (!value || typeof value !== 'object' || Array.isArray(value) || !citationId(value.id)) return null;
      var fields = { sourceId: 200, evidenceId: 200, title: 500, locatorLabel: 200, passage: 1200, suppliedAt: 64 };
      for (var name in fields) {
        if (!Object.prototype.hasOwnProperty.call(fields, name)) continue;
        if (!Object.prototype.hasOwnProperty.call(value, name) || typeof value[name] !== 'string' || value[name].length > fields[name]) return null;
      }
      if (!value.passage.length || (value.version !== null && (!Number.isSafeInteger(value.version) || value.version <= 0))) return null;
      var item = { id: value.id, sourceId: value.sourceId, evidenceId: value.evidenceId,
        title: value.title, locatorLabel: value.locatorLabel, version: value.version,
        passage: value.passage, suppliedAt: value.suppliedAt };
      // Reserve room for the persistent recency field without shortening quotes.
      if (citationBytes(activePrefix() + item.id, JSON.stringify(item)) + 64 > cacheLimits.itemBytes) return null;
      return item;
    } catch (_) { return null; }
  }
  function citationSame(left, right) { return JSON.stringify(left) === JSON.stringify(right); }
  function citationRecord(key, raw) {
    var value = null, item = null;
    try {
      if (citationBytes(key, raw) <= cacheLimits.itemBytes) {
        value = safeJsonParse(raw);
        item = normaliseSnapshot(value);
        if (item && key !== activePrefix() + item.id) item = null;
      }
    } catch (_) {}
    var stamp = item && value && typeof value.__cacheLastUsed === 'number' && Number.isFinite(value.__cacheLastUsed)
      ? value.__cacheLastUsed : (item ? Date.parse(item.suppliedAt) : 0);
    return { key: key, raw: raw, item: item, bytes: citationBytes(key, raw), used: Number.isFinite(stamp) ? stamp : 0 };
  }
  function citationNow() { citationClock = Math.max(Date.now(), citationClock + 1); return citationClock; }
  function citationKeep(item, raw, protectedMemKeys, pfx) {
    var scopePrefix = pfx || activePrefix();
    var memKey = scopePrefix + item.id;
    var old = citationMemory.get(memKey);
    if (old) citationMemoryBytes -= old.bytes;
    citationMemory.delete(memKey);
    var bytes = citationBytes(memKey, JSON.stringify(item)) + (raw ? raw.length * 2 : 0);
    citationMemory.set(memKey, { item: item, raw: raw, bytes: bytes, touched: Date.now() });
    citationMemoryBytes += bytes;
    var entries = Array.from(citationMemory.keys());
    for (var i = 0; (citationMemory.size > cacheLimits.memoryItems || citationMemoryBytes > cacheLimits.memoryBytes) && i < entries.length; i++) {
      var id = entries[i];
      if (protectedMemKeys && protectedMemKeys.has(id)) continue;
      citationMemoryBytes -= citationMemory.get(id).bytes;
      citationMemory.delete(id);
    }
  }
  function citationStorage() {
    var storage = isEphemeralStudentMode() ? root.sessionStorage : root.localStorage;
    if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function'
      || typeof storage.key !== 'function' || typeof storage.removeItem !== 'function') throw new Error('Citation storage unavailable');
    return storage;
  }
  function citationScan(storage) {
    var records = new Map();
    var pfx = activePrefix();
    for (var i = 0; i < storage.length; i++) {
      var key = storage.key(i);
      if (typeof key !== 'string' || key.indexOf(pfx) !== 0 || !citationId(key.slice(pfx.length))) continue;
      var raw = storage.getItem(key);
      if (raw !== null) records.set(key, citationRecord(key, raw));
    }
    return records;
  }
  function citationQuota(error) {
    return !!error && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED');
  }
  function citationCandidates(records, protectedIds) {
    var pfx = activePrefix();
    return Array.from(records.values()).filter(function(record) { return !protectedIds.has(record.key.slice(pfx.length)); })
      .sort(function(a, b) { return a.used - b.used || a.key.localeCompare(b.key); });
  }
  function citationEvict(storage, records, candidates) {
    while (candidates.length) {
      var record = candidates.shift();
      // Another tab may have refreshed this citation since the scan.
      var currentRaw = storage.getItem(record.key);
      if (currentRaw === null) { records.delete(record.key); return true; }
      if (currentRaw !== record.raw) { records.set(record.key, citationRecord(record.key, currentRaw)); continue; }
      storage.removeItem(record.key);
      records.delete(record.key);
      return true;
    }
    return false;
  }
  function citationOverBudget(records) {
    var bytes = 0;
    records.forEach(function(record) { bytes += record.bytes; });
    return records.size > cacheLimits.persistentItems || bytes > cacheLimits.persistentBytes;
  }
  function remember(items) {
    if (!Array.isArray(items) || items.length > 2000) return false;
    var pfx = activePrefix();
    var batch = new Map(), batchBytes = 0;
    for (var i = 0; i < items.length; i++) {
      var item = normaliseSnapshot(items[i]);
      if (!item) return false;
      var prior = batch.get(item.id), cached = citationMemory.get(pfx + item.id);
      if ((prior && !citationSame(prior, item)) || (cached && !citationSame(cached.item, item))) return false;
      if (!prior) {
        batch.set(item.id, item);
        batchBytes += 2 * citationBytes(pfx + item.id, JSON.stringify(item)) + 64;
        if (batch.size > cacheLimits.memoryItems || batchBytes > cacheLimits.memoryBytes) return false;
      }
    }
    if (!batch.size) return true;
    // A single operation cannot promise both bounded retention and protection of
    // an oversized batch. Normal generation supplies at most six passages.
    if (batch.size > cacheLimits.memoryItems || batchBytes > cacheLimits.memoryBytes) return false;
    var protectedIds = new Set(batch.keys()), protectedMemKeys = new Set(Array.from(protectedIds, function (id) { return pfx + id; })), storage = null, records = null;
    try {
      storage = citationStorage();
      records = citationScan(storage);
      var conflict = false;
      batch.forEach(function(item) {
        var existing = records.get(pfx + item.id);
        if (existing && existing.item && !citationSame(existing.item, item)) conflict = true;
      });
      if (conflict) return false;
    } catch (_) { storage = null; }
    var retainedBytes = 0;
    batch.forEach(function(item) {
      var existing = records && records.get(pfx + item.id);
      var itemBytes = citationBytes(pfx + item.id, JSON.stringify(item));
      retainedBytes += itemBytes + Math.max(itemBytes + 64, existing && existing.item ? existing.raw.length * 2 : 0);
    });
    if (retainedBytes > cacheLimits.memoryBytes) return false;
    batch.forEach(function(item) {
      var record = records && records.get(pfx + item.id);
      citationKeep(item, record && record.item ? record.raw : null, protectedMemKeys, pfx);
    });
    if (!storage) return false;
    var candidates = citationCandidates(records, protectedIds), cleanupAllowed = true;
    try {
      var pending = Array.from(batch.values());
      for (var j = 0; j < pending.length; j++) {
        var current = pending[j], key = pfx + current.id;
        var existing = records.get(key), latest = storage.getItem(key);
        if (latest !== (existing ? existing.raw : null)) {
          var changed = latest === null ? null : citationRecord(key, latest);
          if (changed && changed.item && !citationSame(changed.item, current)) return false;
          // Fail closed when the scan became stale; retry is safe and bounded.
          return false;
        }
        var stamp = citationNow(), value = Object.assign({}, current, { __cacheLastUsed: stamp });
        var raw = JSON.stringify(value);
        // An identical durable record is already saved; touching recency is
        // optional and must never evict another snapshot just to refresh it.
        if (existing && existing.item) {
          if (stamp - existing.used >= citationTouchInterval) {
            try { storage.setItem(key, raw); existing = citationRecord(key, raw); records.set(key, existing); }
            catch (_) { cleanupAllowed = false; }
          }
          citationKeep(current, existing.raw, protectedMemKeys, pfx);
          continue;
        }
        while (true) {
          try { storage.setItem(key, raw); break; }
          catch (error) {
            if (!citationQuota(error) || !citationEvict(storage, records, candidates)) return false;
          }
        }
        records.set(key, citationRecord(key, raw));
        citationKeep(current, raw, protectedMemKeys, pfx);
      }
      // Normal retention pruning only follows successful saves. Security/read
      // failures never initiate quota cleanup.
      while (citationOverBudget(records)) {
        if (!cleanupAllowed || !citationEvict(storage, records, candidates)) return false;
      }
      // Another context can remove a preceding batch member during later writes.
      // Confirm every member before reporting a durable save.
      for (var n = 0; n < pending.length; n++) {
        var savedKey = pfx + pending[n].id, savedRaw = storage.getItem(savedKey);
        var saved = savedRaw === null ? null : citationRecord(savedKey, savedRaw);
        if (!saved || !saved.item || !citationSame(saved.item, pending[n])) return false;
      }
      return true;
    } catch (_) { return false; }
  }
  function lookup(id) {
    if (!citationId(id)) return null;
    var pfx = activePrefix();
    var memKey = pfx + id;
    var cached = citationMemory.get(memKey), storage = null, record = null;
    if (!cached) {
      try {
        storage = citationStorage();
        var raw = storage.getItem(memKey);
        if (raw === null) return null;
        record = citationRecord(memKey, raw);
        if (!record.item) return null;
        citationKeep(record.item, raw, null, pfx);
        cached = citationMemory.get(memKey);
        if (!cached) return Object.assign({}, record.item);
        // Permit a first cold read to refresh old persisted recency.
        cached.touched = record.used;
      } catch (_) { return null; }
    }
    citationMemory.delete(memKey);
    citationMemory.set(memKey, cached);
    if (cached.raw && Date.now() - cached.touched >= citationTouchInterval) {
      cached.touched = Date.now();
      try {
        storage = storage || citationStorage();
        if (storage.getItem(memKey) === cached.raw) {
          var updated = JSON.stringify(Object.assign({}, cached.item, { __cacheLastUsed: citationNow() }));
          storage.setItem(memKey, updated);
          citationKeep(cached.item, updated, null, pfx);
        }
      } catch (_) {} // Reading a passage never requires a successful metadata write.
    }
    return Object.assign({}, cached.item);
  }
  function purgeBySourceId(sourceId) {
    var sid = safeStr(sourceId);
    if (!sid) return 0;
    var pfx = activePrefix();
    var removed = 0;
    Array.from(citationMemory.keys()).forEach(function(memKey) {
      if (memKey.indexOf(pfx) !== 0 || !citationId(memKey.slice(pfx.length))) return;
      var entry = citationMemory.get(memKey);
      if (entry && entry.item && entry.item.sourceId === sid) {
        citationMemoryBytes -= entry.bytes;
        citationMemory.delete(memKey);
        removed++;
      }
    });
    try {
      var storage = citationStorage();
      var toRemove = [];
      for (var i = 0; i < storage.length; i++) {
        var key = storage.key(i);
        if (typeof key !== 'string' || key.indexOf(pfx) !== 0 || !citationId(key.slice(pfx.length))) continue;
        try {
          var raw = storage.getItem(key);
          if (raw === null || citationBytes(key, raw) > cacheLimits.itemBytes) continue;
          var parsed = safeJsonParse(raw);
          if (parsed && typeof parsed === 'object' && Object.prototype.hasOwnProperty.call(parsed, 'sourceId') && parsed.sourceId === sid) toRemove.push(key);
        } catch (_) {}
      }
      toRemove.forEach(function(key) {
        try { storage.removeItem(key); removed++; } catch (_) {}
      });
    } catch (_) {}
    return removed;
  }
  function cite(text, items) {
    return safeStr(text).replace(/\s*\[Your document (\d+)\]/gi, function(_, n) {
      var idx = Number(n) - 1;
      var item = Array.isArray(items) && idx >= 0 && idx < items.length ? items[idx] : null;
      return (item && citationId(item.id)) ? ' [Document ' + n + '](' + prefix + item.id + ')' : '';
    });
  }
  function used(text, items) {
    var str = safeStr(text);
    return (Array.isArray(items) ? items : []).filter(function(item) { return !!(item && typeof item === 'object' && typeof item.id === 'string' && item.id) && str.indexOf('](' + prefix + item.id + ')') !== -1; });
  }
  function finish(text, items) {
    if (!Array.isArray(items) || !items.length) return { text: text, evidence: null };
    var safeItems = items.filter(function(item) { return !!(item && typeof item === 'object'); });
    if (!safeItems.length) return { text: text, evidence: null };
    var body = cite(text, safeItems);
    var cited = used(body, safeItems);
    var persisted = remember(cited);
    var documents = function(rows) { return new Set(rows.map(function(row) { return row && row.sourceId; }).filter(Boolean)).size; };
    var summary = documents(safeItems) + ' document(s) supplied (' + safeItems.length + ' passages); ' + documents(cited) + ' document(s) cited (' + cited.length + ' passages).';
    body += '\n\n### Your Document References\n\n' + summary;
    if (cited.length) {
      body += '\n\nOpen a Document link to inspect the passage supplied to the model. A citation does not by itself verify the generated claim. The exact supplied passages are also saved below for export and review.';
      cited.forEach(function(item) {
        var index = safeItems.indexOf(item) + 1;
        var titleStr = safeStr(item.title);
        var locStr = safeStr(item.locatorLabel);
        var safeHeading = (titleStr + (locStr ? ', ' + locStr : '')).replace(/[\r\n]+/g, ' ');
        var safePassage = typeof item.passage === 'string' ? item.passage : '';
        body += '\n\n**Document ' + index + ': ' + escapeMarkdown(safeHeading) + '**\n\n'
          + safePassage.split(/\r?\n/).map(function(line) { return '> ' + escapeMarkdown(line); }).join('\n');
      });
    } else body += '\n\nNo document citation was present in the generated text.';
    if (!persisted) body += '\n\nThe citation viewer could not save its local copy. The passages below remain part of this text.';
    return { text: body, evidence: { version: 1, supplied: safeItems, citedIds: cited.map(function(item) { return item.id; }), persisted: persisted } };
  }
  // The model chooses excerpts; it does not write the output. Reject the entire
  // selection if ANY quote is altered, invented, empty, or attributed incorrectly.
  function exactExcerpts(response, items, topic) {
    if (!Array.isArray(items) || !items.length) return null;
    var data = response;
    if (data && typeof data === 'object' && typeof data.text === 'string') data = data.text;
    if (typeof data === 'string') {
      if (data.length > 200000) return null;
      data = data.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
      try { data = safeJsonParse(data); } catch (_) { return null; }
    }
    if (!data || typeof data !== 'object' || Array.isArray(data) || !Object.prototype.hasOwnProperty.call(data, 'excerpts') || !Array.isArray(data.excerpts) || !data.excerpts.length || data.excerpts.length > 6) return null;
    var seen = new Set();
    var rendered = [];
    for (var i = 0; i < data.excerpts.length; i++) {
      var excerpt = data.excerpts[i];
      var number = excerpt && typeof excerpt === 'object' && Object.prototype.hasOwnProperty.call(excerpt, 'document') ? excerpt.document : null;
      var item = (Number.isInteger(number) && number >= 1 && number <= items.length) ? items[number - 1] : null;
      var quote = excerpt && typeof excerpt === 'object' && Object.prototype.hasOwnProperty.call(excerpt, 'quote') ? excerpt.quote : null;
      if (!item || typeof item.passage !== 'string' || typeof quote !== 'string' || quote.trim().length < 20 || item.passage.indexOf(quote) < 0) return null;
      var key = number + '|' + quote;
      if (seen.has(key)) continue;
      seen.add(key);
      rendered.push(quote.split(/\r?\n/).map(function(line) { return '> ' + escapeMarkdown(line); }).join('\n') + '\n\n[Your document ' + number + ']');
    }
    if (!rendered.length) return null;
    return '# ' + escapeMarkdown((safeStr(topic) || 'Selected document excerpts').replace(/[\r\n]+/g, ' '))
      + '\n\n*Documents only: exact excerpts selected from your documents. Reading level, tone, and length do not rewrite these passages. No web search or additional factual prose was used.*\n\n'
      + rendered.join('\n\n');
  }
  function show(id, trigger) {
    if (!root.document || !root.document.body) return;
    if (closeViewer) closeViewer();
    var doc = root.document;
    var previous = trigger || doc.activeElement;
    var item = lookup(id);
    if (!doc.getElementById('allo-ev-a11y-style')) {
      var st = doc.createElement('style');
      st.id = 'allo-ev-a11y-style';
      st.textContent = '[data-allo-research-evidence] :is(button,blockquote):focus-visible{outline:2px solid #7c3aed;outline-offset:2px;}';
      (doc.head || doc.body || doc.documentElement).appendChild(st);
    }
    var overlay = doc.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:rgba(15,23,42,.65);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box';
    var panel = doc.createElement('section');
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'allo-document-evidence-title');
    panel.style.cssText = 'background:#fff;color:#172033;border-radius:12px;padding:20px;box-sizing:border-box;min-width:0;max-width:720px;width:100%;max-height:85vh;overflow:auto;overflow-wrap:anywhere;box-shadow:0 20px 70px #0006;font:16px/1.6 system-ui';
    var title = doc.createElement('h2'); title.id = 'allo-document-evidence-title'; title.textContent = item ? item.title : 'Document passage unavailable';
    title.style.cssText = 'margin:0;min-width:0;font-size:1.25em;overflow-wrap:anywhere';
    var location = doc.createElement('p');
    location.textContent = item ? (item.locatorLabel || 'Location not recorded') + (item.version ? ' · Saved document version ' + item.version : '') : 'This device does not have the saved citation snapshot. Check Your Document References in the source text for the exact passage.';
    var note = doc.createElement('p'); note.textContent = 'This is the passage supplied at generation time. Check whether it supports the claim; the link itself is not verification.';
    var quote = doc.createElement('blockquote');
    quote.tabIndex = 0;
    quote.setAttribute('role', 'region'); quote.setAttribute('aria-label', 'Saved document passage');
    quote.style.cssText = 'white-space:pre-wrap;overflow-wrap:anywhere;box-sizing:border-box;max-height:45vh;overflow:auto;border-left:4px solid #7c3aed;padding:8px 12px;margin:16px 0;outline-offset:2px';
    quote.textContent = item ? item.passage : '';
    var button = doc.createElement('button'); button.type = 'button'; button.textContent = 'Close passage'; button.style.cssText = 'padding:10px 18px;min-height:44px;background:#5b21b6;color:white;border:0;border-radius:6px;cursor:pointer;font:inherit;outline-offset:2px';
    button.style.flexShrink = '0';
    var header = doc.createElement('div'); header.style.cssText = 'display:flex;align-items:flex-start;gap:16px;justify-content:space-between';
    if (title.textContent.length > 80) {
      header.style.flexDirection = 'column'; header.style.alignItems = 'stretch';
      button.style.alignSelf = 'flex-end';
      header.appendChild(button); header.appendChild(title);
    } else { header.appendChild(title); header.appendChild(button); }
    overlay.setAttribute('data-allo-research-evidence', 'true');
    var trapStack = (root.__alloFocusTrapStack = Array.isArray(root.__alloFocusTrapStack) ? root.__alloFocusTrapStack : []);
    var trapEntry = { id: 'allo-research-evidence', root: panel, container: panel };
    function isTopTrap() {
      var s = root && root.__alloFocusTrapStack;
      return !Array.isArray(s) || !s.length || s[s.length - 1] === trapEntry;
    }
    var closed = false;
    function close() {
      if (closed) return;
      closed = true;
      doc.removeEventListener('keydown', keydown, true); doc.removeEventListener('focusin', containFocus, true);
      if (typeof overlay.remove === 'function') overlay.remove(); else if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      closeViewer = null;
      var s = root && root.__alloFocusTrapStack;
      var wasTop = true;
      if (Array.isArray(s)) {
        wasTop = !s.length || s[s.length - 1] === trapEntry;
        var idx = s.lastIndexOf(trapEntry);
        if (idx >= 0) s.splice(idx, 1);
      }
      var validOpener = previous && previous !== doc.body && previous !== doc.documentElement
        && (previous.isConnected === true || (previous.isConnected === undefined && typeof doc.contains === 'function' && doc.contains(previous)))
        && typeof previous.focus === 'function';
      if (wasTop && validOpener) { try { previous.focus(); } catch (_) {} }
    }
    function containFocus(event) {
      if (overlay.isConnected === false) { close(); return; }
      if (!isTopTrap()) return;
      var inside = false;
      try { inside = panel.contains(event.target); } catch (_) {}
      if (!inside) { try { button.focus(); } catch (_) {} }
    }
    function keydown(event) {
      if (overlay.isConnected === false) { close(); return; }
      if (event.isComposing || event.keyCode === 229) return;
      if (!isTopTrap()) return;
      if (event.key === 'Escape' && !event.ctrlKey && !event.metaKey && !event.altKey) { event.preventDefault(); event.stopPropagation(); close(); }
      if (event.key === 'Tab' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault(); event.stopPropagation();
        var controls = item ? [button, quote] : [button];
        var index = controls.indexOf(doc.activeElement);
        try { controls[(index + (event.shiftKey ? controls.length - 1 : 1)) % controls.length].focus(); } catch (_) {}
      }
    }
    closeViewer = close;
    button.addEventListener('click', close);
    var backdropDown = false;
    overlay.addEventListener('mousedown', function(event) { backdropDown = event.target === overlay; });
    overlay.addEventListener('click', function(event) {
      var fromBackdrop = backdropDown || event.detail === 0;
      backdropDown = false;
      if (event.target === overlay && fromBackdrop) close();
    });
    panel.appendChild(header); panel.appendChild(location);
    if (item) { panel.appendChild(note); panel.appendChild(quote); }
    overlay.appendChild(panel); doc.body.appendChild(overlay);
    trapStack.push(trapEntry);
    doc.addEventListener('keydown', keydown, true); doc.addEventListener('focusin', containFocus, true); try { button.focus(); } catch (_) {}
  }
  if (root.document && typeof root.document.addEventListener === 'function') root.document.addEventListener('click', function(event) {
    var tgt = event.target && event.target.nodeType === 3 ? event.target.parentElement : event.target;
    var anchor = tgt && typeof tgt.closest === 'function' && tgt.closest('a');
    var href = anchor && typeof anchor.getAttribute === 'function' && anchor.getAttribute('href');
    if (!href || !/^#allo-doc-[a-z0-9-]{1,128}$/.test(href)) return;
    event.preventDefault(); event.stopPropagation(); show(href.slice(prefix.length), anchor);
  }, true);
  try {
    root.AlloResearchEvidence = Object.freeze({ snapshot: snapshot, remember: remember, lookup: lookup, cite: cite, finish: finish, exactExcerpts: exactExcerpts, show: show, passage: passage, purgeBySourceId: purgeBySourceId });
  } catch (_) {}
})(typeof window !== 'undefined' ? window : null);
