/* Lumen Study Sources UI. Depends on window.LumenEvidence at render time. */
(function (root, factory) {
  var api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.LumenStudy = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function (root) {
  'use strict';

  function evidenceApi() {
    return root && root.LumenEvidence;
  }

  function documentsApi() {
    return root && root.LumenDocuments;
  }

  function storageApi(ctx) {
    if (ctx && ctx.storageDB) return ctx.storageDB;
    try { return root.AlloModules && root.AlloModules.UtilsPure && root.AlloModules.UtilsPure.storageDB; } catch (_) { return null; }
  }

  function localStorageApi() {
    try { return root.localStorage || null; } catch (_) { return null; }
  }

  function sourceTextFrom(ctx) {
    return String((ctx && (ctx.sourceText || ctx.inputText)) || '').trim();
  }

  function sourceProvenanceFor(ctx, content) {
    var E = evidenceApi();
    var provenance = ctx && ctx.sourceProvenance;
    if (!E || !provenance || provenance.signature !== E.sourceContentSignature(content)) return null;
    return provenance;
  }

  function sourceDescriptor(ctx, content) {
    var provenance = sourceProvenanceFor(ctx, content) || {};
    return {
      title: provenance.title || (ctx && ctx.sourceTopic) || 'Current AlloFlow source',
      locator: provenance.locator || (ctx && ctx.sourceLocator) || '',
      type: provenance.type || (ctx && ctx.sourceType) || 'alloflow-source',
      importMethod: provenance.importMethod || 'alloflow-current-source'
    };
  }

  function initialProjectFromContext(ctx) {
    var E = evidenceApi();
    if (!E) return null;
    var content = sourceTextFrom(ctx);
    var descriptor = sourceDescriptor(ctx, content);
    var title = descriptor.title === 'Current AlloFlow source' ? 'Lumen study project' : descriptor.title;
    var project = E.makeProject({ title: title, activeMode: 'study' });
    if (!content) return project;
    try {
      return E.upsertSource(project, {
        id: 'source-current',
        stableKey: 'alloflow-current-source',
        title: descriptor.title,
        locator: descriptor.locator,
        type: descriptor.type,
        content: content,
        importMethod: descriptor.importMethod
      });
    } catch (_) {
      return project;
    }
  }

  function normalizeProviderResult(value) {
    var E = evidenceApi();
    return E ? E.unwrapAIText(value) : String(value || '');
  }

  var SESSION_CALL_LIMIT = 8;
  var SESSION_COOLDOWN_MS = 1500;
  var SESSION_SEARCH_LIMIT = 12;
  var SESSION_SEARCH_COOLDOWN_MS = 1000;

  function hasProvider(ctx) {
    return !!(ctx && (typeof ctx.generateText === 'function'
      || (ctx.ai && typeof ctx.ai.generateText === 'function')
      || typeof ctx.callGemini === 'function'));
  }

  function checkSessionAllowance(state, now) {
    state = state || {};
    var count = Math.max(0, Number(state.count) || 0);
    var current = Number(now == null ? Date.now() : now);
    var lastAt = Number(state.lastAt) || 0;
    if (count >= SESSION_CALL_LIMIT) return { ok: false, reason: 'session-limit', retryAfterMs: null };
    var remaining = Math.max(0, SESSION_COOLDOWN_MS - (current - lastAt));
    if (lastAt && remaining > 0) return { ok: false, reason: 'cooldown', retryAfterMs: remaining };
    return { ok: true, reason: '', retryAfterMs: 0 };
  }

  async function callProvider(ctx, prompt) {
    if (ctx && typeof ctx.generateText === 'function') return normalizeProviderResult(await ctx.generateText(prompt, { jsonMode: true, task: 'lumen-grounded-study' }));
    if (ctx && ctx.ai && typeof ctx.ai.generateText === 'function') return normalizeProviderResult(await ctx.ai.generateText(prompt, { jsonMode: true }));
    if (ctx && typeof ctx.callGemini === 'function') return normalizeProviderResult(await ctx.callGemini(prompt, true));
    throw new Error('No text AI is configured. You can still inspect the retrieved evidence passages.');
  }

  function hasWebSearch(ctx) {
    return !!((ctx && typeof ctx.searchWeb === 'function')
      || (root && root.WebSearchProvider && typeof root.WebSearchProvider.search === 'function')
      || (ctx && typeof ctx.callGemini === 'function'));
  }

  function checkSearchAllowance(state, now) {
    state = state || {};
    var count = Math.max(0, Number(state.count) || 0);
    var current = Number(now == null ? Date.now() : now);
    var lastAt = Number(state.lastAt) || 0;
    if (count >= SESSION_SEARCH_LIMIT) return { ok: false, reason: 'session-limit', retryAfterMs: null };
    var remaining = Math.max(0, SESSION_SEARCH_COOLDOWN_MS - (current - lastAt));
    if (lastAt && remaining > 0) return { ok: false, reason: 'cooldown', retryAfterMs: remaining };
    return { ok: true, reason: '', retryAfterMs: 0 };
  }

  async function searchWeb(ctx, query) {
    var E = evidenceApi();
    if (!E) throw new Error('The evidence engine is not ready.');
    var q = E.cleanText(query).replace(/\s+/g, ' ').slice(0, E.MAX_DISCOVERY_QUERY_CHARS);
    if (q.length < 3) throw new Error('Describe what you want to find using at least three characters.');
    var raw = null;
    if (ctx && typeof ctx.searchWeb === 'function') raw = await ctx.searchWeb(q, { limit: E.MAX_DISCOVERY_RESULTS, task: 'lumen-source-discovery' });
    else if (root && root.WebSearchProvider && typeof root.WebSearchProvider.search === 'function') raw = await root.WebSearchProvider.search(q, E.MAX_DISCOVERY_RESULTS, q);
    var candidates = E.normalizeDiscoveryResults(raw, q);
    if (!candidates.length && ctx && typeof ctx.callGemini === 'function') {
      var prompt = 'Find high-quality, text-based sources about this research topic. Return grounded web results only. Topic: "' + q + '"';
      raw = await ctx.callGemini(prompt, false, true, 0.2);
      candidates = E.normalizeDiscoveryResults(raw, q);
    }
    return { query: q, candidates: candidates };
  }

  function isDesktopAppLocation() {
    try {
      var hostname = String(root && root.location && root.location.hostname || '').toLowerCase();
      var pathname = String(root && root.location && root.location.pathname || '');
      var loopback = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]';
      return loopback && (pathname === '/app' || pathname.indexOf('/app/') === 0);
    } catch (_) { return false; }
  }

  function resolveSourceFetchProxyUrl(ctx) {
    var direct = String(ctx && ctx.sourceFetchProxyUrl || '').trim();
    if (direct) return direct;
    try {
      direct = String(root && root.ALLOFLOW_SOURCE_FETCH_PROXY_URL || '').trim();
      if (direct) return direct;
      var hostname = String(root && root.location && root.location.hostname || '').toLowerCase();
      var ownedFirebase = /\.web\.app$/.test(hostname) || /\.firebaseapp\.com$/.test(hostname);
      if (ownedFirebase || isDesktopAppLocation()) return '/api/sourceFetchProxy';
      var host = String(root && (root.ALLOFLOW_FUNCTIONS_HOST || root.ALLOFLOW_HOST) || '').replace(/\/$/, '');
      if (host) return host + '/api/sourceFetchProxy';
    } catch (_) {}
    return '';
  }

  function sourceFetchError(message, code) {
    var error = new Error(message);
    error.code = code || 'source-fetch-failed';
    return error;
  }

  function sourceFetchMessage(code, status) {
    if (code === 'blocked-target') return 'That address resolves to a private, local or reserved network and cannot be imported.';
    if (code === 'source-too-large') return 'That page is too large to import safely. Open it and paste the relevant text instead.';
    if (code === 'unsupported-content-type' || code === 'unsupported-content-encoding') return 'This release imports readable HTML and plain-text pages. Open this source and paste its text instead.';
    if (code === 'not-enough-readable-text') return 'The page did not expose enough readable text. It may require sign-in or JavaScript; open it and paste the source text instead.';
    if (code === 'rate-limited' || status === 429) return 'Too many page imports were requested. Wait a minute and try again.';
    if (code === 'unauthorized' || status === 401 || status === 403) return 'Authenticated source import is unavailable. Sign in again or paste the source text.';
    if (code === 'source-timeout' || status === 504) return 'The page took too long to respond. Try again or paste the source text.';
    return 'The full page could not be imported safely. Open it and paste the source text instead.';
  }

  async function firstPartyFetchWebSource(ctx, url) {
    var E = evidenceApi();
    var safeUrl = E && E.canonicalWebUrl(url);
    if (!safeUrl) throw sourceFetchError('This result does not have a safe public web address.', 'invalid-url');
    var endpoint = resolveSourceFetchProxyUrl(ctx);
    if (!endpoint) throw sourceFetchError('The first-party source importer is not configured.', 'source-fetch-unavailable');
    var fetcher = ctx && ctx.fetch;
    if (typeof fetcher !== 'function') {
      try { fetcher = root && root.fetch; } catch (_) {}
    }
    if (typeof fetcher !== 'function' && typeof fetch === 'function') fetcher = fetch;
    if (typeof fetcher !== 'function') throw sourceFetchError('The first-party source importer is unavailable.', 'source-fetch-unavailable');

    var securityHeaders = {};
    var getSecurityHeaders = ctx && ctx.getFunctionSecurityHeaders;
    if (typeof getSecurityHeaders !== 'function') {
      try { getSecurityHeaders = root && root.__alloFirebase && root.__alloFirebase.getFunctionSecurityHeaders; } catch (_) {}
    }
    if (!isDesktopAppLocation() && typeof getSecurityHeaders === 'function') securityHeaders = await getSecurityHeaders();

    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, 15000) : null;
    var response;
    try {
      response = await fetcher(endpoint, {
        method: 'POST',
        mode: 'cors',
        headers: Object.assign({ 'Content-Type': 'application/json' }, securityHeaders || {}),
        body: JSON.stringify({ url: safeUrl }),
        signal: controller ? controller.signal : undefined
      });
    } catch (_) {
      throw sourceFetchError('The first-party source importer could not be reached.', 'source-fetch-unavailable');
    } finally {
      if (timer) clearTimeout(timer);
    }
    var data = null;
    try { data = await response.json(); } catch (_) {}
    if (!response.ok) {
      var code = String(data && data.error || 'source-fetch-failed');
      if (response.status === 404 || response.status === 405 || response.status === 501) {
        throw sourceFetchError('The first-party source importer is not deployed.', 'source-fetch-unavailable');
      }
      throw sourceFetchError(sourceFetchMessage(code, response.status), code);
    }
    if (!data || typeof data.text !== 'string') throw sourceFetchError('The source importer returned no readable page text.', 'source-fetch-failed');
    return data;
  }

  function webFetchApis(ctx) {
    var adapters = [];
    if (ctx && typeof ctx.fetchWebSource === 'function') adapters.push({ fn: ctx.fetchWebSource, direct: true, firstParty: false });
    if (resolveSourceFetchProxyUrl(ctx)) adapters.push({ fn: function (url) { return firstPartyFetchWebSource(ctx, url); }, direct: true, firstParty: true });
    if (ctx && typeof ctx.fetchAndCleanUrl === 'function') adapters.push({ fn: ctx.fetchAndCleanUrl, direct: false, firstParty: false });
    try {
      var fn = root && root.__alloUtils && root.__alloUtils.fetchAndCleanUrl;
      if (typeof fn === 'function' && !(ctx && fn === ctx.fetchAndCleanUrl)) adapters.push({ fn: fn, direct: false, firstParty: false });
    } catch (_) {}
    return adapters;
  }

  async function fetchDiscoveredSource(ctx, candidate, options) {
    var E = evidenceApi();
    var candidateUrl = E && candidate && E.canonicalWebUrl(candidate.url);
    if (!candidateUrl) throw new Error('This result does not have a safe public web address.');
    var adapters = webFetchApis(ctx);
    if (!adapters.length) throw new Error('Web page import is unavailable in this environment. Open the source and paste its text instead.');
    var lastUnavailable = null;
    for (var i = 0; i < adapters.length; i += 1) {
      var adapter = adapters[i];
      try {
        var raw = adapter.direct ? await adapter.fn(candidate.url) : await adapter.fn(candidate.url, null, null);
        var record = raw && typeof raw === 'object' ? raw : {};
        var text = E.cleanFetchedWebText(record.text || record.content || record.body || raw || '');
        if (!(options && options.withMetadata)) return text;
        var fetchedAt = '';
        try { if (record.fetchedAt && Number.isFinite(Date.parse(record.fetchedAt))) fetchedAt = new Date(record.fetchedAt).toISOString(); } catch (_) {}
        return {
          text: text,
          url: E.canonicalWebUrl(record.url) || candidateUrl,
          title: E.cleanText(candidate.title || record.title || 'Untitled web source').slice(0, 300),
          fetchedAt: fetchedAt
        };
      } catch (error) {
        if (adapter.firstParty && error && error.code === 'source-fetch-unavailable') {
          lastUnavailable = error;
          continue;
        }
        throw error;
      }
    }
    throw lastUnavailable || new Error('The full page could not be imported. Open it and paste its text instead.');
  }

  function StudyComponent(props) {
    var ctx = props && props.ctx;
    var React = ctx && ctx.React;
    var h = React && React.createElement;
    var E = evidenceApi();
    var D = documentsApi();
    if (!h) return null;
    if (!E) {
      return h('div', { role: 'status', className: 'p-5 rounded-xl border border-amber-300 bg-amber-50 text-slate-800' },
        h('p', { className: 'font-bold m-0' }, 'Study Sources is still loading.'),
        h('p', { className: 'text-sm mt-1 mb-0' }, 'The evidence engine loads separately so the data-analysis workspace stays small and reliable.'));
    }

    var initialRef = React.useRef(null);
    if (!initialRef.current) initialRef.current = initialProjectFromContext(ctx);
    var _project = React.useState(initialRef.current), project = _project[0], setProject = _project[1];
    var _hydrated = React.useState(false), hydrated = _hydrated[0], setHydrated = _hydrated[1];
    var _storageStatus = React.useState('loading'), storageStatus = _storageStatus[0], setStorageStatus = _storageStatus[1];
    var _question = React.useState(''), question = _question[0], setQuestion = _question[1];
    var _retrieved = React.useState([]), retrieved = _retrieved[0], setRetrieved = _retrieved[1];
    var _answer = React.useState(null), answer = _answer[0], setAnswer = _answer[1];
    var _busy = React.useState(false), busy = _busy[0], setBusy = _busy[1];
    var _error = React.useState(''), error = _error[0], setError = _error[1];
    var _activeEvidence = React.useState(''), activeEvidence = _activeEvidence[0], setActiveEvidence = _activeEvidence[1];
    var _viewerEvidenceId = React.useState(''), viewerEvidenceId = _viewerEvidenceId[0], setViewerEvidenceId = _viewerEvidenceId[1];
    var _sourceLabelDrafts = React.useState({}), sourceLabelDrafts = _sourceLabelDrafts[0], setSourceLabelDrafts = _sourceLabelDrafts[1];
    var _draftTitle = React.useState('Additional source'), draftTitle = _draftTitle[0], setDraftTitle = _draftTitle[1];
    var _draftLocator = React.useState(''), draftLocator = _draftLocator[0], setDraftLocator = _draftLocator[1];
    var _draftText = React.useState(''), draftText = _draftText[0], setDraftText = _draftText[1];
    var _showAdd = React.useState(false), showAdd = _showAdd[0], setShowAdd = _showAdd[1];
    var _showFiles = React.useState(false), showFiles = _showFiles[0], setShowFiles = _showFiles[1];
    var _selectedFiles = React.useState([]), selectedFiles = _selectedFiles[0], setSelectedFiles = _selectedFiles[1];
    var _fileBusy = React.useState(false), fileBusy = _fileBusy[0], setFileBusy = _fileBusy[1];
    var _fileStatus = React.useState({}), fileStatus = _fileStatus[0], setFileStatus = _fileStatus[1];
    var _fileMessage = React.useState(''), fileMessage = _fileMessage[0], setFileMessage = _fileMessage[1];
    var _showDiscover = React.useState(false), showDiscover = _showDiscover[0], setShowDiscover = _showDiscover[1];
    var _discoverQuery = React.useState(''), discoverQuery = _discoverQuery[0], setDiscoverQuery = _discoverQuery[1];
    var _discoverResults = React.useState([]), discoverResults = _discoverResults[0], setDiscoverResults = _discoverResults[1];
    var _selectedDiscovery = React.useState({}), selectedDiscovery = _selectedDiscovery[0], setSelectedDiscovery = _selectedDiscovery[1];
    var _discoveryBusy = React.useState(false), discoveryBusy = _discoveryBusy[0], setDiscoveryBusy = _discoveryBusy[1];
    var _importBusy = React.useState(false), importBusy = _importBusy[0], setImportBusy = _importBusy[1];
    var _importStatus = React.useState({}), importStatus = _importStatus[0], setImportStatus = _importStatus[1];
    var _discoverMessage = React.useState(''), discoverMessage = _discoverMessage[0], setDiscoverMessage = _discoverMessage[1];
    var _searchCount = React.useState(0), searchCount = _searchCount[0], setSearchCount = _searchCount[1];
    var _callCount = React.useState(0), callCount = _callCount[0], setCallCount = _callCount[1];
    var sessionRef = React.useRef({ count: 0, lastAt: 0 });
    var searchSessionRef = React.useRef({ count: 0, lastAt: 0 });

    var role = ctx && ctx.isTeacherMode === false ? 'learner' : 'teacher';
    var scope = role + '|' + String((ctx && ctx.studentNickname) || 'default');
    var storeRef = React.useRef(null);
    if (!storeRef.current) storeRef.current = E.createProjectStore({ storageDB: storageApi(ctx), localStorage: localStorageApi(), scope: scope });

    React.useEffect(function () {
      var cancelled = false;
      storeRef.current.load().then(function (saved) {
        if (cancelled) return;
        if (saved && saved.sources && saved.sources.length) setProject(saved);
        setHydrated(true);
        setStorageStatus(saved ? 'restored' : 'ready');
      }).catch(function () {
        if (!cancelled) { setHydrated(true); setStorageStatus('unavailable'); }
      });
      return function () { cancelled = true; };
    }, []);

    React.useEffect(function () {
      if (!viewerEvidenceId) return;
      try { var panel = document.getElementById('lumen-source-viewer'); if (panel) panel.focus(); } catch (_) {}
    }, [viewerEvidenceId]);

    React.useEffect(function () {
      if (!hydrated || !project) return undefined;
      var cancelled = false;
      var timer = setTimeout(function () {
        storeRef.current.save(project).then(function (result) {
          if (!cancelled) setStorageStatus(result.ok ? 'saved' : 'unavailable');
        });
      }, 450);
      return function () { cancelled = true; clearTimeout(timer); };
    }, [hydrated, project]);

    var currentText = sourceTextFrom(ctx);
    var currentHash = currentText ? E.hashString(E.cleanText(currentText)) : '';
    var currentSource = project.sources.find(function (source) { return source.id === 'source-current'; });
    var currentChanged = !!(currentText && currentSource && currentSource.contentHash !== currentHash);
    var currentAvailable = !!currentText;
    var nodeById = {};
    project.evidenceNodes.forEach(function (node) { nodeById[node.id] = node; });
    var sourceById = {};
    project.sources.forEach(function (source) { sourceById[source.id] = source; });

    function announce(message) {
      try { if (ctx.announceToSR) ctx.announceToSR(message); } catch (_) {}
    }

    function importCurrent() {
      setError('');
      try {
        var descriptor = sourceDescriptor(ctx, currentText);
        var next = E.upsertSource(project, {
          id: 'source-current',
          stableKey: 'alloflow-current-source',
          title: descriptor.title,
          locator: descriptor.locator,
          type: descriptor.type,
          content: currentText,
          importMethod: descriptor.importMethod
        });
        setProject(next);
        setAnswer(null);
        setRetrieved([]);
        announce(currentSource ? 'Current source updated. Dependent notes were marked stale.' : 'Current AlloFlow source added to Lumen.');
      } catch (err) { setError(err.message || 'Could not import the current source.'); }
    }

    function addDraftSource(event) {
      if (event && event.preventDefault) event.preventDefault();
      setError('');
      try {
        var next = E.upsertSource(project, {
          title: draftTitle,
          stableKey: draftLocator || ('manual|' + draftTitle),
          locator: draftLocator,
          content: draftText,
          type: draftLocator ? 'url' : 'text',
          importMethod: 'paste'
        });
        setProject(next);
        setDraftText('');
        setDraftLocator('');
        setShowAdd(false);
        announce('Source added to the evidence project.');
      } catch (err) { setError(err.message || 'Could not add this source.'); }
    }

    function fileKey(file) {
      return String(file && file.name || '') + '|' + String(file && file.size || 0) + '|' + String(file && file.lastModified || 0);
    }

    async function importSelectedFiles(event) {
      if (event && event.preventDefault) event.preventDefault();
      setError(''); setFileMessage('');
      if (!D || typeof D.extractLocalDocument !== 'function') {
        setError('The local document adapter is still loading. Reload the workspace and try again.');
        return;
      }
      var files = selectedFiles.slice(0, D.MAX_FILES_PER_IMPORT || 5);
      if (!files.length) { setError('Choose at least one document to import.'); return; }
      setFileBusy(true);
      var next = project, imported = 0, failed = 0;
      for (var i = 0; i < files.length; i++) {
        var file = files[i], key = fileKey(file);
        setFileStatus(function (previous) { var copy = Object.assign({}, previous); copy[key] = { state: 'extracting', message: 'Extracting locally…' }; return copy; });
        try {
          var spec = await D.extractLocalDocument(file, { root: root, evidence: E });
          next = E.upsertSource(next, spec);
          imported++;
          setFileStatus(function (previous) { var copy = Object.assign({}, previous); copy[key] = { state: 'imported', message: 'Imported as evidence' }; return copy; });
        } catch (err) {
          failed++;
          var message = err && err.message ? err.message : 'This document could not be extracted.';
          setFileStatus(function (previous) { var copy = Object.assign({}, previous); copy[key] = { state: 'failed', message: message }; return copy; });
        }
      }
      if (imported) {
        setProject(next); clearStudyOutput();
        announce(imported + ' local document' + (imported === 1 ? '' : 's') + ' imported as evidence.');
      }
      setFileMessage(imported + ' imported' + (failed ? ' · ' + failed + ' not added' : '') + '. File contents stayed on this device.');
      setFileBusy(false);
    }

    async function discoverSources(event) {
      if (event && event.preventDefault) event.preventDefault();
      var q = String(discoverQuery || '').trim();
      setError(''); setDiscoverMessage('');
      var gate = checkSearchAllowance(searchSessionRef.current, Date.now());
      if (!gate.ok) {
        setError(gate.reason === 'session-limit' ? 'This session has reached its 12-search discovery limit.' : 'Please wait a moment before searching again.');
        return;
      }
      searchSessionRef.current = { count: searchSessionRef.current.count + 1, lastAt: Date.now() };
      setSearchCount(searchSessionRef.current.count);
      setDiscoveryBusy(true); setDiscoverResults([]); setSelectedDiscovery({}); setImportStatus({});
      try {
        var result = await searchWeb(ctx, q);
        setDiscoverResults(result.candidates);
        setProject(function (previous) { return E.recordStudyEvent(previous, {
          action: 'web-discovery', outcome: result.candidates.length ? 'results' : 'refused',
          reasonCode: result.candidates.length ? '' : 'no-results', questionHash: E.hashString(result.query)
        }); });
        if (!result.candidates.length) setError('No suitable public web sources were found. Try a more specific topic or paste a source manually.');
        else {
          setDiscoverMessage(result.candidates.length + ' candidate source' + (result.candidates.length === 1 ? '' : 's') + ' found. Review and select what to import.');
          announce(result.candidates.length + ' web source candidates found. None are evidence until you select and import them.');
        }
      } catch (err) {
        setProject(function (previous) { return E.recordStudyEvent(previous, { action: 'web-discovery', outcome: 'rejected', reasonCode: 'search-error', questionHash: E.hashString(q) }); });
        setError(err.message || 'Web source discovery failed.');
      } finally { setDiscoveryBusy(false); }
    }

    function toggleDiscoverySelection(id) {
      var next = Object.assign({}, selectedDiscovery);
      next[id] = !next[id];
      setSelectedDiscovery(next);
    }

    async function importSelectedSources() {
      var chosen = discoverResults.filter(function (candidate) { return selectedDiscovery[candidate.id] && importStatus[candidate.id] !== 'imported'; });
      if (!chosen.length) { setError('Select at least one discovery result to import.'); return; }
      setError(''); setImportBusy(true); setDiscoverMessage('Importing selected pages as full evidence sources…');
      var nextProject = project;
      var nextStatus = Object.assign({}, importStatus);
      var importedIds = [];
      var failures = [];
      for (var i = 0; i < chosen.length; i++) {
        var candidate = chosen[i];
        nextStatus[candidate.id] = 'fetching'; setImportStatus(Object.assign({}, nextStatus));
        try {
          var snapshot = await fetchDiscoveredSource(ctx, candidate, { withMetadata: true });
          var stamp = snapshot.fetchedAt || new Date().toISOString();
          var importedCandidate = Object.assign({}, candidate, { url: snapshot.url, title: snapshot.title || candidate.title });
          var spec = E.discoveryCandidateToSourceSpec(importedCandidate, snapshot.text, stamp);
          nextProject = E.upsertSource(nextProject, spec);
          importedIds.push(spec.id);
          nextStatus[candidate.id] = 'imported';
        } catch (err) {
          nextStatus[candidate.id] = 'failed';
          failures.push(candidate.title + ': ' + (err.message || 'import failed'));
        }
        setImportStatus(Object.assign({}, nextStatus));
      }
      nextProject = E.recordStudyEvent(nextProject, {
        action: 'web-source-import', outcome: importedIds.length ? (failures.length ? 'partial' : 'imported') : 'rejected',
        reasonCode: failures.length ? 'some-fetches-failed' : '', sourceIds: importedIds
      });
      setProject(nextProject);
      var remainingSelection = Object.assign({}, selectedDiscovery);
      importedIds.forEach(function (sourceId) {
        var candidateId = sourceId.replace(/^src_/, '');
        Object.keys(remainingSelection).forEach(function (id) { if (id.slice(4) === candidateId.replace(/^web_/, '')) remainingSelection[id] = false; });
      });
      setSelectedDiscovery(remainingSelection);
      setDiscoverMessage(importedIds.length + ' source' + (importedIds.length === 1 ? '' : 's') + ' imported with full text.' + (failures.length ? ' ' + failures.length + ' could not be imported; open those results and paste their text instead.' : ''));
      if (failures.length && !importedIds.length) setError(failures.join(' '));
      announce(importedIds.length + ' web sources imported into the evidence project.');
      setImportBusy(false);
    }

    function clearStudyOutput() {
      setRetrieved([]);
      setAnswer(null);
      setActiveEvidence('');
    }

    function removeSource(sourceId) {
      setProject(E.removeSource(project, sourceId));
      clearStudyOutput();
      var viewed = nodeById[viewerEvidenceId];
      if (viewed && viewed.sourceId === sourceId) setViewerEvidenceId('');
      announce('Source removed. Dependent notes were marked stale.');
    }

    function toggleSourceActive(source) {
      var nextActive = source.active === false;
      setProject(E.setSourceActive(project, source.id, nextActive));
      clearStudyOutput();
      announce(source.title + (nextActive ? ' added to the current study scope.' : ' excluded from the current study scope.'));
    }

    function updateLabelDraft(sourceId, value) {
      var next = Object.assign({}, sourceLabelDrafts);
      next[sourceId] = value;
      setSourceLabelDrafts(next);
    }

    function saveSourceLabels(source) {
      var value = Object.prototype.hasOwnProperty.call(sourceLabelDrafts, source.id) ? sourceLabelDrafts[source.id] : (source.labels || []).join(', ');
      setProject(E.setSourceLabels(project, source.id, value));
      clearStudyOutput();
      var next = Object.assign({}, sourceLabelDrafts);
      delete next[source.id];
      setSourceLabelDrafts(next);
      announce('Labels saved for ' + source.title + '.');
    }

    function changeRetrievalLabel(value) {
      setProject(E.setRetrievalLabel(project, value));
      clearStudyOutput();
      announce(value ? 'Study scope filtered to ' + value + '.' : 'Study scope includes every active source.');
    }

    function openEvidenceViewer(id) {
      if (!nodeById[id]) return;
      setActiveEvidence(id);
      setViewerEvidenceId(id);

    }

    async function ask(event) {
      if (event && event.preventDefault) event.preventDefault();
      var q = String(question || '').trim();
      if (!q) { setError('Ask a question about your sources first.'); return; }
      if (!E.eligibleSourceIds(project).length) {
        setError('No sources are in the current study scope. Turn on a source or choose a different label.');
        return;
      }
      var hits = E.retrieve(project, q, { limit: 6 });
      setRetrieved(hits);
      setAnswer(null);
      setError('');
      if (!hits.length) {
        setProject(function (previous) { return E.recordStudyEvent(previous, { action: 'study-retrieval', outcome: 'refused', reasonCode: 'no-relevant-evidence', questionHash: E.hashString(q), evidenceIds: [] }); });
        setError('Lumen could not find relevant support in the imported sources. Try a more specific question or add another source.');
        announce('No relevant evidence found.');
        return;
      }
      setActiveEvidence(hits[0].node.id);
      if (!hasProvider(ctx)) {
        setError('No text AI is configured. You can still inspect the retrieved evidence passages.');
        return;
      }
      var gate = checkSessionAllowance(sessionRef.current, Date.now());
      if (!gate.ok) {
        setError(gate.reason === 'session-limit'
          ? 'This Study Sources session has reached its 8-call AI limit. Retrieved evidence remains available.'
          : 'Please wait a moment before asking again. Retrieved evidence remains available.');
        return;
      }
      sessionRef.current = { count: sessionRef.current.count + 1, lastAt: Date.now() };
      setCallCount(sessionRef.current.count);
      setBusy(true);
      try {
        var prompt = E.buildGroundedPrompt(project, q, hits, { gradeLevel: ctx && ctx.gradeLevel });
        var raw = await callProvider(ctx, prompt);
        var checked = E.validateGroundedResponse(raw, hits);
        if (!checked.ok) {
          var invalid = new Error('Lumen rejected the answer because its citations or supporting excerpts could not be verified: ' + checked.errors.join(' '));
          invalid.code = 'grounding-validation';
          throw invalid;
        }
        setAnswer(checked);
        setProject(function (previous) { return E.recordStudyEvent(previous, { action: 'study-answer', outcome: checked.insufficientEvidence ? 'refused' : 'validated', reasonCode: checked.insufficientEvidence ? 'insufficient-evidence' : '', questionHash: E.hashString(q), evidenceIds: hits.map(function (row) { return row.node.id; }) }); });
        announce(checked.insufficientEvidence ? 'The selected passages do not contain enough evidence to answer.' : 'Grounded answer ready with ' + checked.claims.length + ' cited claims.');
      } catch (err) {
        setProject(function (previous) { return E.recordStudyEvent(previous, { action: 'study-answer', outcome: 'rejected', reasonCode: err && err.code === 'grounding-validation' ? 'grounding-validation' : 'provider-error', questionHash: E.hashString(q), evidenceIds: hits.map(function (row) { return row.node.id; }) }); });
        setError(err.message || 'The grounded answer could not be generated. The retrieved passages remain available.');
      } finally {
        setBusy(false);
      }
    }

    function saveNote() {
      if (!answer || !answer.ok || answer.insufficientEvidence) return;
      setProject(E.saveNote(project, answer, question));
      setStorageStatus('saving');
      announce('Grounded answer saved as a study note.');
    }

    function newProject() {
      var fresh = initialProjectFromContext(ctx) || E.makeProject({ title: 'Lumen study project' });
      setProject(fresh);
      setQuestion(''); setRetrieved([]); setAnswer(null); setError(''); setViewerEvidenceId(''); setSourceLabelDrafts({});
      setShowDiscover(false); setDiscoverQuery(''); setDiscoverResults([]); setSelectedDiscovery({}); setImportStatus({}); setDiscoverMessage('');
      setShowFiles(false); setSelectedFiles([]); setFileStatus({}); setFileMessage('');
      storeRef.current.clear();
      announce('New evidence project started.');
    }

    var storageLabel = storageStatus === 'saved' ? 'Saved on this device'
      : storageStatus === 'restored' ? 'Restored from this device'
      : storageStatus === 'unavailable' ? 'Storage unavailable — keep this window open'
      : storageStatus === 'saving' ? 'Saving…' : 'Preparing storage…';

    var allSourceLabels = [];
    var labelSeen = {};
    project.sources.forEach(function (source) {
      (source.labels || []).forEach(function (label) {
        var key = label.toLowerCase();
        if (!labelSeen[key]) { labelSeen[key] = true; allSourceLabels.push(label); }
      });
    });
    allSourceLabels.sort(function (a, b) { return a.localeCompare(b); });
    var eligibleIds = E.eligibleSourceIds(project);
    var eligibleLookup = {};
    eligibleIds.forEach(function (id) { eligibleLookup[id] = true; });
    var eligibleEvidenceCount = project.evidenceNodes.filter(function (node) { return eligibleLookup[node.sourceId] && !node.stale; }).length;
    var visibleSources = project.retrievalLabel ? project.sources.filter(function (source) {
      return (source.labels || []).some(function (label) { return label.toLowerCase() === project.retrievalLabel.toLowerCase(); });
    }) : project.sources;

    var sourceCards = visibleSources.map(function (source) {
      var count = project.evidenceNodes.filter(function (node) { return node.sourceId === source.id; }).length;
      var firstNode = project.evidenceNodes.find(function (node) { return node.sourceId === source.id && !node.stale; });
      var labelValue = Object.prototype.hasOwnProperty.call(sourceLabelDrafts, source.id) ? sourceLabelDrafts[source.id] : (source.labels || []).join(', ');
      var sourceDomId = E.hashString(source.id);
      return h('li', { key: source.id, className: 'p-3 rounded-xl border ' + (eligibleLookup[source.id] ? 'border-cyan-300 bg-white' : 'border-slate-200 bg-slate-50') },
        h('div', { className: 'flex items-start gap-2' },
          h('input', {
            id: 'lumen-source-active-' + sourceDomId, type: 'checkbox', checked: source.active !== false,
            onChange: function () { toggleSourceActive(source); },
            'aria-label': 'Use ' + source.title + ' for study', className: 'mt-1'
          }),
          h('div', { className: 'min-w-0 flex-1' },
            h('label', { htmlFor: 'lumen-source-active-' + sourceDomId, className: 'font-bold text-sm text-slate-800 m-0 break-words cursor-pointer' }, source.title),
            h('p', { className: 'text-[11px] text-slate-500 mt-1 mb-0' }, count + ' evidence passage' + (count === 1 ? '' : 's') + ' · version ' + source.version + (eligibleLookup[source.id] ? ' · in study scope' : ' · excluded')),
            source.fileName ? h('p', { className: 'text-[10px] text-slate-500 mt-1 mb-0' }, (source.fileFormat || source.type || 'file').toUpperCase() + ' · ' + Math.max(1, Number(source.documentPartCount) || 1) + ' document part' + (Number(source.documentPartCount) === 1 ? '' : 's') + ' · extracted locally') : null,
            (source.labels || []).length ? h('div', { className: 'mt-2 flex gap-1 flex-wrap', 'aria-label': 'Source labels' }, source.labels.map(function (label) {
              return h('span', { key: label, className: 'px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 text-[10px] font-bold' }, label);
            })) : null,
            h('div', { className: 'mt-2 flex gap-3 flex-wrap' },
              firstNode ? h('button', { type: 'button', onClick: function () { openEvidenceViewer(firstNode.id); }, className: 'text-[11px] text-cyan-800 underline font-bold' }, 'View source snapshot') : null,
              source.locator ? (E.canonicalWebUrl(source.locator)
                ? h('a', { href: E.canonicalWebUrl(source.locator), target: '_blank', rel: 'noopener noreferrer', className: 'text-[11px] text-blue-700 underline break-all' }, 'Open original source')
                : h('span', { className: 'text-[11px] text-slate-500 break-all' }, source.locator)) : null),
            h('details', { className: 'mt-2' },
              h('summary', { className: 'text-[11px] text-violet-800 underline font-bold cursor-pointer' }, 'Edit labels'),
              h('label', { htmlFor: 'lumen-source-labels-' + sourceDomId, className: 'block mt-2 text-[11px] font-bold text-slate-700' }, 'Labels, separated by commas'),
              h('div', { className: 'mt-1 flex gap-2' },
                h('input', {
                  id: 'lumen-source-labels-' + sourceDomId, value: labelValue, maxLength: 400,
                  onChange: function (event) { updateLabelDraft(source.id, event.target.value); },
                  className: 'min-w-0 flex-1 rounded-lg border border-slate-300 p-2 text-xs', placeholder: 'For example: primary source, vocabulary'
                }),
                h('button', { type: 'button', onClick: function () { saveSourceLabels(source); }, className: 'px-2 py-1 rounded-lg bg-violet-700 text-white text-[11px] font-bold' }, 'Save labels')))),
          h('button', { type: 'button', className: 'text-xs text-rose-700 underline p-1', onClick: function () { removeSource(source.id); }, 'aria-label': 'Remove source ' + source.title }, 'Remove')));
    });

    var evidenceCards = retrieved.map(function (row, index) {
      var node = row.node;
      var source = sourceById[node.sourceId] || {};
      var active = activeEvidence === node.id;
      return h('article', {
        key: node.id,
        id: 'lumen-evidence-' + node.id,
        tabIndex: -1,
        className: 'p-3 rounded-xl border ' + (active ? 'border-amber-600 bg-amber-50' : 'border-slate-200 bg-white')
      },
        h('div', { className: 'flex items-center gap-2 text-[11px] font-bold text-slate-600' },
          h('span', { className: 'inline-flex items-center justify-center w-5 h-5 rounded-full bg-cyan-100 text-cyan-800' }, String(index + 1)),
          h('span', null, source.title || 'Source'),
          h('span', { className: 'font-normal text-slate-400' }, node.locatorLabel)),
        h('p', { className: 'text-sm leading-6 text-slate-800 mt-2 mb-0 whitespace-pre-wrap' }, node.content),
        h('button', { type: 'button', onClick: function () { openEvidenceViewer(node.id); }, className: 'mt-2 text-[11px] text-cyan-800 underline font-bold' }, 'Inspect stored passage'));
    });

    var viewerPanel = null;
    var viewerNode = nodeById[viewerEvidenceId];
    var viewerSource = viewerNode && sourceById[viewerNode.sourceId];
    if (viewerNode && viewerSource) {
      var locator = viewerNode.locator || {};
      var start = Math.max(0, Number(locator.charStart) || 0);
      var end = Math.max(start, Number(locator.charEnd) || (start + viewerNode.content.length));
      var beforeContext = viewerSource.content.slice(Math.max(0, start - 240), start);
      var exactContext = viewerSource.content.slice(start, end) || viewerNode.content;
      var afterContext = viewerSource.content.slice(end, Math.min(viewerSource.content.length, end + 240));
      var sourceDate = viewerSource.fetchedAt || viewerSource.importedAt || '';
      viewerPanel = h('section', {
        id: 'lumen-source-viewer', role: 'region', tabIndex: -1, 'aria-labelledby': 'lumen-source-viewer-title',
        className: 'mt-4 p-4 rounded-2xl border-2 border-cyan-400 bg-cyan-50 outline-none focus:ring-2 focus:ring-cyan-600'
      },
        h('div', { className: 'flex items-start gap-3' },
          h('div', { className: 'flex-1 min-w-0' },
            h('h3', { id: 'lumen-source-viewer-title', className: 'font-extrabold text-cyan-950 m-0 break-words' }, viewerSource.title),
            h('p', { className: 'mt-1 mb-0 text-[11px] text-cyan-900' }, 'Stored snapshot · source version ' + viewerNode.sourceVersion + ' · ' + viewerNode.locatorLabel),
            h('p', { className: 'mt-1 mb-0 text-[10px] text-slate-600' }, 'Characters ' + start + '–' + end + (sourceDate ? ' · imported ' + sourceDate : '') + ' · passage hash ' + viewerNode.contentHash)),
          h('button', { type: 'button', onClick: function () { setViewerEvidenceId(''); }, className: 'text-xs text-slate-700 underline', 'aria-label': 'Close source viewer' }, 'Close')),
        h('div', { className: 'mt-3 p-3 rounded-xl border border-cyan-200 bg-white text-sm leading-6 whitespace-pre-wrap text-slate-700' },
          beforeContext ? h('span', { className: 'text-slate-500' }, (start > 240 ? '…' : '') + beforeContext) : null,
          h('mark', { className: 'bg-yellow-200 text-slate-950 px-0.5' }, exactContext),
          afterContext ? h('span', { className: 'text-slate-500' }, afterContext + (end + 240 < viewerSource.content.length ? '…' : '')) : null),
        viewerSource.locator && E.canonicalWebUrl(viewerSource.locator) ? h('a', { href: E.canonicalWebUrl(viewerSource.locator), target: '_blank', rel: 'noopener noreferrer', className: 'inline-block mt-3 text-xs text-blue-800 underline font-bold' }, 'Open original source') : null);
    }

    var answerView = null;
    if (answer && answer.insufficientEvidence) {
      answerView = h('div', { role: 'status', className: 'p-4 rounded-xl border border-slate-300 bg-slate-50 text-sm text-slate-700' }, 'The retrieved passages do not contain enough evidence for a defensible answer.');
    } else if (answer && answer.ok) {
      answerView = h('section', { 'aria-labelledby': 'lumen-grounded-answer-title', className: 'p-4 rounded-2xl border border-emerald-300 bg-emerald-50/50' },
        h('div', { className: 'flex items-start gap-3 flex-wrap' },
          h('div', { className: 'flex-1 min-w-[220px]' },
            h('h3', { id: 'lumen-grounded-answer-title', className: 'font-extrabold text-emerald-900 m-0' }, 'Grounded answer'),
            h('p', { className: 'text-xs text-emerald-800 mt-1 mb-0' }, 'Every displayed statement below passed Lumen’s evidence-ID validation.')),
          h('button', { type: 'button', onClick: saveNote, className: 'px-3 py-2 rounded-lg bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800' }, 'Save as study note')),
        h('ol', { className: 'mt-3 mb-0 space-y-3 pl-5' }, answer.claims.map(function (claim) {
          return h('li', { key: claim.id, className: 'text-sm text-slate-800' },
            h('p', { className: 'm-0 leading-6' }, claim.text),
            h('blockquote', { className: 'mt-2 mb-0 pl-3 border-l-2 border-emerald-500 text-xs italic text-slate-700' }, '“' + claim.quote + '”'),
            h('div', { className: 'mt-2 flex gap-1 flex-wrap', 'aria-label': 'Supporting citations' }, claim.evidenceIds.map(function (id) {
              var node = nodeById[id];
              return h('button', {
                key: id, type: 'button',
                className: 'px-2 py-1 rounded-full bg-cyan-100 text-cyan-900 text-[11px] font-bold hover:bg-cyan-200',
                onClick: function () {
                  openEvidenceViewer(id);
                  try { var el = document.getElementById('lumen-evidence-' + id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_) {}
                }
              }, (sourceById[node && node.sourceId] || {}).title || 'Evidence', ' · ', (node && node.locatorLabel) || id);
            })));
        })));
    }

    return h('div', { className: 'p-4 rounded-xl bg-amber-50 border border-amber-200 text-slate-800' },
      h('div', { className: 'flex items-center gap-2 flex-wrap pb-3 border-b border-amber-200' },
        h('button', { type: 'button', onClick: function () { ctx.update('lumen', 'mode', 'home'); }, className: 'px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50' }, '← Lumen home'),
        h('div', { className: 'min-w-0' },
          h('h2', { className: 'font-extrabold text-lg text-slate-900 m-0' }, 'Study Sources'),
          h('p', { className: 'text-xs text-slate-600 m-0' }, 'Ask, inspect and save only what your evidence supports.')),
        h('span', { role: 'status', 'aria-live': 'polite', className: 'ml-auto text-[11px] text-slate-500' }, storageLabel),
        h('button', { type: 'button', onClick: newProject, className: 'text-xs underline text-slate-600' }, 'New project')),

      currentAvailable ? h('div', { className: 'mt-3 p-3 rounded-xl border ' + (currentChanged ? 'border-orange-400 bg-orange-50' : 'border-blue-200 bg-blue-50') },
        h('div', { className: 'flex items-center gap-3 flex-wrap' },
          h('div', { className: 'flex-1 min-w-[220px]' },
            h('p', { className: 'font-bold text-sm m-0' }, currentSource ? (currentChanged ? 'AlloFlow’s current source has changed' : 'Current AlloFlow source is connected') : 'Use the source already loaded in AlloFlow'),
            h('p', { className: 'text-xs mt-1 mb-0 text-slate-600' }, currentChanged ? 'Updating it will mark dependent notes stale instead of silently reusing old evidence.' : 'Lumen keeps its passages and citations inside this evidence project.')),
          (!currentSource || currentChanged) ? h('button', { type: 'button', onClick: importCurrent, className: 'px-3 py-2 rounded-lg bg-blue-700 text-white text-xs font-bold hover:bg-blue-800' }, currentSource ? 'Update source' : 'Use current source') : null)) : null,

      error ? h('div', { role: 'alert', className: 'mt-3 p-3 rounded-lg border border-rose-300 bg-rose-50 text-sm text-rose-900' }, error) : null,

      h('div', { className: 'mt-4 grid gap-4', style: { gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))' } },
        h('aside', { 'aria-labelledby': 'lumen-sources-title' },
          h('div', { className: 'flex items-center gap-2 flex-wrap' },
            h('h3', { id: 'lumen-sources-title', className: 'font-extrabold text-sm text-slate-800 m-0' }, 'Project sources (' + project.sources.length + ')'),
            h('span', { className: 'text-[11px] text-slate-500' }, eligibleIds.length + ' in current study scope'),
            h('div', { className: 'ml-auto flex gap-2' },
              h('button', { type: 'button', onClick: function () { setShowDiscover(!showDiscover); setShowAdd(false); setShowFiles(false); }, className: 'text-xs font-bold text-blue-800 underline', 'aria-expanded': showDiscover, 'aria-controls': 'lumen-discover-panel' }, showDiscover ? 'Close discovery' : 'Discover web sources'),
              h('button', { type: 'button', onClick: function () { setShowFiles(!showFiles); setShowDiscover(false); setShowAdd(false); }, className: 'text-xs font-bold text-emerald-800 underline', 'aria-expanded': showFiles, 'aria-controls': 'lumen-file-panel' }, showFiles ? 'Close files' : 'Import files'),
              h('button', { type: 'button', onClick: function () { setShowAdd(!showAdd); setShowDiscover(false); setShowFiles(false); }, className: 'text-xs font-bold text-amber-800 underline', 'aria-expanded': showAdd }, showAdd ? 'Close' : 'Paste source'))),

          allSourceLabels.length ? h('div', { className: 'mt-3 p-2 rounded-lg border border-violet-200 bg-violet-50' },
            h('label', { htmlFor: 'lumen-study-label-filter', className: 'block text-[11px] font-bold text-violet-950' }, 'Study source label'),
            h('select', {
              id: 'lumen-study-label-filter', value: project.retrievalLabel || '',
              onChange: function (event) { changeRetrievalLabel(event.target.value); },
              className: 'mt-1 w-full rounded-lg border border-violet-300 bg-white p-2 text-xs'
            }, h('option', { value: '' }, 'All active sources'), allSourceLabels.map(function (label) { return h('option', { key: label, value: label }, label); })),
            h('p', { className: 'mt-1 mb-0 text-[10px] text-violet-800' }, 'This filter affects both the source list and retrieval. Individual source switches still apply.')) : null,

          showFiles ? h('section', { id: 'lumen-file-panel', 'aria-labelledby': 'lumen-file-title', className: 'mt-3 p-3 rounded-xl border border-emerald-300 bg-emerald-50/70' },
            h('h4', { id: 'lumen-file-title', className: 'font-extrabold text-sm text-emerald-950 m-0' }, 'Import local documents'),
            h('p', { className: 'mt-1 mb-0 text-xs text-slate-700' }, 'PDF, Word, PowerPoint, spreadsheets, text, Markdown, CSV, and EPUB are extracted into a stored text snapshot with page, slide, sheet, or section context when available.'),
            h('p', { className: 'mt-2 mb-0 p-2 rounded-lg border border-emerald-300 bg-white text-[11px] text-emerald-950' }, 'Privacy: document contents stay on this device and are not sent to AI during import. Parser code may be downloaded from AlloFlow’s configured library CDN when it is not already cached.'),
            h('form', { onSubmit: importSelectedFiles, className: 'mt-3' },
              h('label', { htmlFor: 'lumen-local-files', className: 'block text-xs font-bold text-slate-800' }, 'Choose up to ' + (D ? D.MAX_FILES_PER_IMPORT : 5) + ' documents'),
              h('input', { id: 'lumen-local-files', type: 'file', multiple: true, accept: D ? D.ACCEPT : '', disabled: fileBusy || !D,
                onChange: function (event) { var rows = Array.prototype.slice.call(event.target.files || [], 0, D ? D.MAX_FILES_PER_IMPORT : 5); setSelectedFiles(rows); setFileStatus({}); setFileMessage(''); },
                className: 'mt-1 block w-full text-xs text-slate-700' }),
              !D ? h('p', { role: 'status', className: 'mt-2 mb-0 text-xs text-rose-800' }, 'The document adapter is still loading.') : null,
              selectedFiles.length ? h('ul', { className: 'mt-3 space-y-2 list-none p-0 m-0' }, selectedFiles.map(function (file) {
                var status = fileStatus[fileKey(file)];
                return h('li', { key: fileKey(file), className: 'p-2 rounded-lg border border-emerald-200 bg-white text-xs' },
                  h('p', { className: 'm-0 font-bold break-words' }, file.name),
                  h('p', { className: 'mt-1 mb-0 text-[10px] text-slate-500' }, Math.max(1, Math.ceil((Number(file.size) || 0) / 1024)) + ' KB'),
                  status ? h('p', { role: 'status', className: 'mt-1 mb-0 text-[11px] ' + (status.state === 'failed' ? 'text-rose-800' : status.state === 'imported' ? 'text-emerald-800 font-bold' : 'text-blue-800') }, status.message) : null);
              })) : null,
              h('button', { type: 'submit', disabled: fileBusy || !D || !selectedFiles.length, className: 'mt-3 w-full px-3 py-2 rounded-lg bg-emerald-700 text-white text-xs font-bold disabled:opacity-50' }, fileBusy ? 'Extracting documents locally…' : 'Import selected documents')),
            fileMessage ? h('p', { role: 'status', 'aria-live': 'polite', className: 'mt-2 mb-0 text-xs font-semibold text-emerald-900' }, fileMessage) : null) : null,

          showDiscover ? h('section', { id: 'lumen-discover-panel', 'aria-labelledby': 'lumen-discover-title', className: 'mt-3 p-3 rounded-xl border border-blue-300 bg-blue-50/70' },
            h('h4', { id: 'lumen-discover-title', className: 'font-extrabold text-sm text-blue-950 m-0' }, 'Discover sources on the web'),
            h('p', { className: 'mt-1 mb-0 text-xs text-slate-700' }, 'Search results are candidates, not evidence. Lumen imports and hashes the full readable page before it can support an answer.'),
            h('p', { className: 'mt-2 mb-0 p-2 rounded-lg border border-amber-300 bg-amber-50 text-[11px] text-amber-950' }, 'Privacy: your search terms are sent to the configured web-search service. Importing first uses AlloFlow’s authenticated, size-limited page importer when available; a configured legacy web-text service may be used only when that endpoint is unavailable. Do not include learner names, private information or signed/tokenized links.'),
            h('form', { onSubmit: discoverSources, className: 'mt-3' },
              h('label', { htmlFor: 'lumen-discover-query', className: 'block text-xs font-bold text-slate-800' }, 'What sources do you want to find?'),
              h('div', { className: 'mt-1 flex flex-col sm:flex-row gap-2' },
                h('input', { id: 'lumen-discover-query', type: 'search', value: discoverQuery, onChange: function (e) { setDiscoverQuery(e.target.value); }, disabled: discoveryBusy || importBusy, maxLength: E.MAX_DISCOVERY_QUERY_CHARS, className: 'flex-1 rounded-lg border border-slate-300 p-2 text-sm', placeholder: 'For example: evidence-based vocabulary instruction middle school' }),
                h('button', { type: 'submit', disabled: discoveryBusy || importBusy || !hasWebSearch(ctx), className: 'px-3 py-2 rounded-lg bg-blue-700 text-white text-xs font-bold disabled:opacity-50' }, discoveryBusy ? 'Searching…' : 'Search web'))),
            !hasWebSearch(ctx) ? h('p', { role: 'status', className: 'mt-2 text-xs text-rose-800' }, 'Web search is not configured in this environment. You can still paste source text.') : null,
            h('p', { className: 'mt-2 mb-0 text-[11px] text-slate-500' }, searchCount + '/' + SESSION_SEARCH_LIMIT + ' discovery searches used this session.'),
            discoverMessage ? h('p', { role: 'status', 'aria-live': 'polite', className: 'mt-2 mb-0 text-xs font-semibold text-blue-900' }, discoverMessage) : null,
            discoverResults.length ? h('div', { className: 'mt-3' },
              h('div', { className: 'flex gap-3 items-center mb-2' },
                h('button', { type: 'button', className: 'text-[11px] underline text-slate-700', onClick: function () { var all = {}; discoverResults.forEach(function (c) { if (importStatus[c.id] !== 'imported') all[c.id] = true; }); setSelectedDiscovery(all); } }, 'Select all'),
                h('button', { type: 'button', className: 'text-[11px] underline text-slate-700', onClick: function () { setSelectedDiscovery({}); } }, 'Clear selection')),
              h('ul', { className: 'space-y-2 list-none p-0 m-0' }, discoverResults.map(function (candidate) {
                var state = importStatus[candidate.id] || 'candidate';
                return h('li', { key: candidate.id, className: 'p-3 rounded-lg border border-blue-200 bg-white' },
                  h('div', { className: 'flex items-start gap-2' },
                    h('input', { type: 'checkbox', checked: !!selectedDiscovery[candidate.id], disabled: importBusy || state === 'imported', onChange: function () { toggleDiscoverySelection(candidate.id); }, 'aria-label': 'Select ' + candidate.title + ' for import', className: 'mt-1' }),
                    h('div', { className: 'min-w-0 flex-1' },
                      h('a', { href: candidate.url, target: '_blank', rel: 'noopener noreferrer', className: 'font-bold text-sm text-blue-800 underline break-words' }, candidate.title),
                      h('p', { className: 'mt-1 mb-0 text-[10px] text-slate-500 break-all' }, candidate.url),
                      candidate.snippet ? h('p', { className: 'mt-2 mb-0 text-xs leading-5 text-slate-700' }, candidate.snippet) : null,
                      h('p', { className: 'mt-1 mb-0 text-[10px] text-slate-500' }, 'Search preview only — not used as evidence · ' + candidate.searchProvider),
                      state !== 'candidate' ? h('p', { role: 'status', className: 'mt-1 mb-0 text-[11px] font-bold ' + (state === 'failed' ? 'text-rose-700' : state === 'imported' ? 'text-emerald-700' : 'text-blue-700') }, state === 'fetching' ? 'Retrieving full page…' : state === 'imported' ? 'Imported as evidence source' : 'Could not import — open and paste the source text') : null)));
              })),
              h('button', { type: 'button', disabled: importBusy || !discoverResults.some(function (c) { return selectedDiscovery[c.id] && importStatus[c.id] !== 'imported'; }), onClick: importSelectedSources, className: 'mt-3 w-full px-3 py-2 rounded-lg bg-emerald-700 text-white text-xs font-bold disabled:opacity-50' }, importBusy ? 'Importing full pages…' : 'Import selected sources')) : null) : null,

          sourceCards.length ? h('ul', { className: 'mt-3 space-y-2 list-none p-0 m-0' }, sourceCards) : h('p', { className: 'mt-3 text-sm text-slate-500' }, 'Add or discover a source to begin.'),
          showAdd ? h('form', { onSubmit: addDraftSource, className: 'mt-3 p-3 rounded-xl border border-amber-300 bg-white' },
            h('label', { className: 'block text-xs font-bold text-slate-700' }, 'Source title', h('input', { value: draftTitle, onChange: function (e) { setDraftTitle(e.target.value); }, className: 'mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm', maxLength: 240 })),
            h('label', { className: 'block mt-2 text-xs font-bold text-slate-700' }, 'Reference link or locator (optional — does not fetch)', h('input', { value: draftLocator, onChange: function (e) { setDraftLocator(e.target.value); }, className: 'mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm', maxLength: 1000, placeholder: 'https://… or chapter/page label' })),
            h('label', { className: 'block mt-2 text-xs font-bold text-slate-700' }, 'Source text', h('textarea', { value: draftText, onChange: function (e) { setDraftText(e.target.value); }, className: 'mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm min-h-[150px]', placeholder: 'Paste an article, transcript, notes or document text…' })),
            h('button', { type: 'submit', className: 'mt-2 w-full px-3 py-2 rounded-lg bg-amber-700 text-white text-xs font-bold hover:bg-amber-800' }, 'Add to evidence project')) : null,
          project.artifacts.length ? h('div', { className: 'mt-4' },
            h('h3', { className: 'font-extrabold text-sm text-slate-800 m-0' }, 'Saved notes (' + project.artifacts.length + ')'),
            h('ul', { className: 'mt-2 space-y-2 pl-5 text-xs text-slate-700' }, project.artifacts.slice().reverse().map(function (artifact) {
              return h('li', { key: artifact.id, className: artifact.stale ? 'text-orange-800' : '' }, artifact.title, artifact.stale ? ' — source changed' : '');
            }))) : null),

        h('main', null,
          h('form', { onSubmit: ask, className: 'p-4 rounded-2xl border border-amber-300 bg-white shadow-sm' },
            h('label', { htmlFor: 'lumen-study-question', className: 'block font-extrabold text-sm text-slate-800' }, 'What do you want to understand?'),
            h('div', { className: 'mt-2 flex flex-col sm:flex-row gap-2 items-stretch' },
              h('textarea', { id: 'lumen-study-question', value: question, onChange: function (e) { setQuestion(e.target.value); }, disabled: busy, rows: 2, maxLength: 2000, className: 'flex-1 rounded-xl border border-slate-300 p-3 text-sm', placeholder: 'For example: What evidence explains why the policy changed?' }),
              h('button', { type: 'submit', disabled: busy || !eligibleEvidenceCount, className: 'px-4 rounded-xl bg-gradient-to-br from-amber-600 to-orange-600 text-white text-sm font-extrabold disabled:opacity-50' }, busy ? 'Checking…' : 'Find grounded answer')),
            h('p', { className: 'text-[11px] text-slate-500 mt-2 mb-0' }, eligibleIds.length + ' of ' + project.sources.length + (project.sources.length === 1 ? ' source is' : ' sources are') + ' in the current study scope. Lumen retrieves passages locally, sends only those selected passages to your configured AI, and requires an exact verified support excerpt for every claim.'),
            h('p', { className: 'text-[11px] text-slate-500 mt-1 mb-0' }, callCount + '/' + SESSION_CALL_LIMIT + ' AI study calls used this session. A short cooldown prevents accidental repeat requests.')),
          answerView ? h('div', { className: 'mt-4' }, answerView) : null,
          viewerPanel,
          retrieved.length ? h('section', { 'aria-labelledby': 'lumen-retrieved-title', className: 'mt-4' },
            h('div', { className: 'flex items-end gap-2' },
              h('h3', { id: 'lumen-retrieved-title', className: 'font-extrabold text-sm text-slate-800 m-0' }, 'Retrieved evidence'),
              h('p', { className: 'text-[11px] text-slate-500 m-0' }, retrieved.length + ' locally ranked passage' + (retrieved.length === 1 ? '' : 's'))),
            h('div', { className: 'mt-2 space-y-2' }, evidenceCards)) : null)));
  }

  function render(ctx) {
    var React = ctx && ctx.React;
    return React && React.createElement ? React.createElement(StudyComponent, { ctx: ctx }) : null;
  }

  return Object.freeze({
    render: render,
    Component: StudyComponent,
    initialProjectFromContext: initialProjectFromContext,
    sourceProvenanceFor: sourceProvenanceFor,
    sourceDescriptor: sourceDescriptor,
    normalizeProviderResult: normalizeProviderResult,
    hasProvider: hasProvider,
    documentsApi: documentsApi,
    checkSessionAllowance: checkSessionAllowance,
    checkSearchAllowance: checkSearchAllowance,
    hasWebSearch: hasWebSearch,
    searchWeb: searchWeb,
    fetchDiscoveredSource: fetchDiscoveredSource,
    firstPartyFetchWebSource: firstPartyFetchWebSource,
    resolveSourceFetchProxyUrl: resolveSourceFetchProxyUrl,
    SESSION_CALL_LIMIT: SESSION_CALL_LIMIT,
    SESSION_COOLDOWN_MS: SESSION_COOLDOWN_MS,
    SESSION_SEARCH_LIMIT: SESSION_SEARCH_LIMIT,
    SESSION_SEARCH_COOLDOWN_MS: SESSION_SEARCH_COOLDOWN_MS,
    callProvider: callProvider
  });
});
