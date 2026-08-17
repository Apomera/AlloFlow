(function () {
  'use strict';

  var Sheet = window.AlloSheetAdapter;
  var Analysis = window.AlloSheetAnalysis;
  var Workspace = window.AlloSheetWorkspace;
  if (!Sheet) throw new Error('AlloSheet adapter did not load.');
  if (!Analysis) throw new Error('AlloSheet analysis module did not load.');
  if (!Workspace) throw new Error('AlloSheet workspace module did not load.');

  function byId(id) { return document.getElementById(id); }
  function clear(node) { while (node && node.firstChild) node.removeChild(node.firstChild); }
  function text(node, value) {
    var next = String(value == null ? '' : value);
    if (node && node.textContent !== next) node.textContent = next;
  }
  function make(tag, value, className) {
    var node = document.createElement(tag);
    if (value !== undefined && value !== null) node.textContent = String(value);
    if (className) node.className = className;
    return node;
  }
  function selectedScope() {
    var input = document.querySelector('input[name="agentScope"]:checked');
    return input ? input.value : 'structure-only';
  }
  function advancedModeActive() {
    var details = byId('advancedConnection');
    return !!(details && details.open);
  }
  function currentDocId() {
    var manual = byId('documentIdInput').value.trim();
    if (advancedModeActive() && manual) return manual;
    return String(state.activeDocId || '').trim();
  }
  function currentTableId() { return byId('tableSelect').value.trim(); }
  function announce(message) {
    text(byId('liveStatus'), '');
    window.setTimeout(function () { text(byId('liveStatus'), message); }, 20);
  }
  function setBadge(node, label, tone) {
    if (!node) return;
    node.className = 'badge ' + (tone || 'neutral');
    text(node, label);
  }
  function setBusy(button, busy, busyLabel) {
    if (!button) return;
    if (!button.dataset.idleLabel) button.dataset.idleLabel = button.textContent;
    if (busy) {
      button.dataset.busy = 'true';
      button.setAttribute('aria-busy', 'true');
      button.setAttribute('aria-disabled', 'true');
    } else {
      delete button.dataset.busy;
      button.removeAttribute('aria-busy');
      button.removeAttribute('aria-disabled');
    }
    button.textContent = busy ? busyLabel : button.dataset.idleLabel;
  }
  function isBusy(button) {
    return !!(button && button.dataset.busy === 'true');
  }
  function clearAgentError(kind) {
    var error = byId('agentError');
    if (!error || (kind && error.dataset.kind !== kind)) return;
    error.hidden = true;
    text(error, '');
    delete error.dataset.kind;
    ['agentInstruction', 'valuesConsent'].forEach(function (id) {
      byId(id).removeAttribute('aria-invalid');
    });
    document.querySelectorAll('input[name="agentScope"]').forEach(function (input) {
      input.removeAttribute('aria-invalid');
    });
  }
  function setAgentError(message, kind, control) {
    clearAgentError();
    var error = byId('agentError');
    error.hidden = false;
    error.dataset.kind = kind || 'general';
    text(error, message);
    if (control) control.setAttribute('aria-invalid', 'true');
  }
  function clearAdvancedError() {
    var error = byId('advancedConnectionError');
    if (!error) return;
    error.hidden = true;
    text(error, '');
    byId('documentUrlInput').removeAttribute('aria-invalid');
    byId('documentIdInput').removeAttribute('aria-invalid');
  }
  function setAdvancedError(message, control) {
    clearAdvancedError();
    var error = byId('advancedConnectionError');
    error.hidden = false;
    text(error, message);
    if (control) control.setAttribute('aria-invalid', 'true');
  }

  function isCanvasOpenerOrigin(origin) {
    try {
      var parsed = new URL(String(origin || ''));
      var host = String(parsed.hostname || '').toLowerCase();
      if (parsed.protocol !== 'https:') return false;
      return host === 'googleusercontent.com'
        || host.endsWith('.googleusercontent.com')
        || host === 'usercontent.goog'
        || host.endsWith('.usercontent.goog')
        || host === 'idx.google'
        || host.endsWith('.idx.google')
        || host === 'run.app'
        || host.endsWith('.run.app');
    } catch (_) {
      return false;
    }
  }

  function isLoopbackHostname(hostname) {
    var host = String(hostname || '').toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1';
  }

  function isTrustedAlloFlowHostOrigin(origin) {
    try {
      var parsed = new URL(String(origin || ''));
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
      var pageUrl = new URL(window.location.href);
      if (parsed.protocol === 'https:' && parsed.origin === pageUrl.origin) return true;
      if (
        parsed.protocol === 'http:'
        && pageUrl.protocol === 'http:'
        && isLoopbackHostname(parsed.hostname)
        && isLoopbackHostname(pageUrl.hostname)
        && /^\d+$/.test(parsed.port)
        && parsed.port === pageUrl.port
        && /^\/app\/allo_sheet(?:\/|$)/.test(pageUrl.pathname)
      ) {
        return true;
      }
      // The Prismflow Firebase HOSTING origins were removed 2026-08-16: that
      // host is no longer deployed to (the 2026-07-09 production-path cleanup
      // moved serving to the CDN) and still answers with a frozen pre-migration
      // bundle, so trusting it meant a months-old app copy could drive this
      // bridge. The prismflow-911fe Firebase PROJECT remains the active backend
      // (auth/Firestore); that is unrelated to which web origins we trust.
      return parsed.origin === 'https://alloflow-cdn.pages.dev';
    } catch (_) {
      return false;
    }
  }

  function isAllowedAlloSheetHostOrigin(origin) {
    return isTrustedAlloFlowHostOrigin(origin) || isCanvasOpenerOrigin(origin);
  }

  function readBridgeBootstrap() {
    var result = { bridgeToken: '', hostOrigin: '' };
    try {
      var params = new URLSearchParams(String(window.location.hash || '').replace(/^#/, ''));
      var token = String(params.get('bridgeToken') || '');
      var rawOrigin = String(params.get('hostOrigin') || '');
      var parsedOrigin = rawOrigin ? new URL(rawOrigin).origin : '';
      if (
        /^[a-f0-9]{32}$/i.test(token)
        && /^https?:\/\//i.test(parsedOrigin)
        && isAllowedAlloSheetHostOrigin(parsedOrigin)
      ) {
        result.bridgeToken = token;
        result.hostOrigin = parsedOrigin;
      }
      if (window.history && typeof window.history.replaceState === 'function') {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    } catch (_) {}
    return result;
  }

  var bridgeBootstrap = readBridgeBootstrap();

  var state = {
    adapter: new Sheet.GristRestAdapter(),
    bridgeReady: false,
    aiAvailable: false,
    hostOrigin: bridgeBootstrap.hostOrigin,
    bridgeToken: bridgeBootstrap.bridgeToken,
    pairingExpiresAt: 0,
    connectedHost: '',
    connectedOrigin: '',
    hostAiTrusted: isTrustedAlloFlowHostOrigin(bridgeBootstrap.hostOrigin),
    hostReportsAi: false,
    records: [],
    columns: [],
    selectedIds: new Set(),
    valuesConsentBinding: null,
    plan: null,
    planBinding: null,
    lastUndo: null,
    lastUndoBinding: null,
    dataRevision: 0,
    serviceConfig: null,
    canvasCandidate: isCanvasOpenerOrigin(bridgeBootstrap.hostOrigin),
    canvasValidated: false,
    canvasMode: false,
    canvasFileName: '',
    canvasDirty: false,
    localWorkspaceKind: '',
    localWorkspaceTitle: '',
    localWorkspaceCreatedAt: '',
    localWorkspaceOrigin: null,
    localTables: [],
    pendingArtifact: null,
    pendingArtifactMode: 'transfer',
    pendingWorkspace: null,
    artifactReturnFocus: null,
    pendingTransferId: '',
    artifactReviewSelection: new Set(),
    artifactIsolationSnapshot: [],
    artifactReceivedAt: 0,
    managedEngine: {},
    activeEditorUrl: '',
    activeDocId: '',
    loadedDocId: '',
    loadedTableId: '',
    serviceReady: false,
    enginePollTimer: null,
    enginePollCount: 0,
    pendingAgent: null,
    managedMutationInFlight: '',
    allRowsSelected: false,
    analysisBinding: null,
    analysisModel: null,
    analysisProfileBinding: null,
    analysisProfile: null,
    analysisControlTableBinding: '',
    analysisColumnTypes: Object.create(null)
  };

  async function runtimeRequest(path, options) {
    if (state.canvasMode || state.canvasCandidate && !state.canvasValidated) {
      throw new Error('Desktop runtime requests are unavailable in the Canvas browser workspace.');
    }
    var response = await window.fetch(path, options || {});
    var payload = null;
    try { payload = await response.json(); } catch (_) {}
    if (!response.ok) {
      var error = new Error(String(payload && payload.error || ('Request failed with HTTP ' + response.status)));
      error.status = response.status;
      throw error;
    }
    return payload || {};
  }

  function enginePayload(payload) {
    if (!payload || typeof payload !== 'object') return {};
    if (payload.managedEngine && typeof payload.managedEngine === 'object') return payload.managedEngine;
    if (payload.engine && typeof payload.engine === 'object') return payload.engine;
    return payload;
  }

  function documentIdFromEditorUrl(value) {
    try {
      var parsed = new URL(String(value || ''));
      var match = parsed.pathname.match(/\/doc\/([^/?#]+)/i);
      return match ? decodeURIComponent(match[1]) : '';
    } catch (_) {
      return '';
    }
  }

  function mergeManagedEngine(payload) {
    var engine = enginePayload(payload);
    state.managedEngine = Object.assign({}, state.managedEngine, engine);
    var editorUrl = String(
      engine.editorUrl || payload && payload.editorUrl ||
      state.managedEngine.editorUrl || ''
    ).trim();
    var docId = String(
      engine.docId || engine.documentId || payload && (payload.docId || payload.documentId) ||
      state.managedEngine.docId || state.managedEngine.documentId || ''
    ).trim();
    if (editorUrl) state.activeEditorUrl = editorUrl;
    if (docId) state.activeDocId = docId;
    if (!state.activeDocId && state.activeEditorUrl) {
      state.activeDocId = documentIdFromEditorUrl(state.activeEditorUrl);
    }
    return state.managedEngine;
  }

  function enginePhase() {
    return String(state.managedEngine.phase || state.managedEngine.status || '').toLowerCase();
  }

  function engineIsReady() {
    var phase = enginePhase();
    return state.managedEngine.running === true || phase === 'running' || phase === 'ready' || phase === 'online';
  }

  function downloadProgressLabel(download) {
    if (!download || typeof download !== 'object') return '';
    var percent = Number(download.percent);
    if (!Number.isFinite(percent) && Number(download.total) > 0) {
      percent = Number(download.received || download.downloaded || 0) / Number(download.total) * 100;
    }
    return Number.isFinite(percent) ? ' ' + Math.max(0, Math.min(100, Math.round(percent))) + '% complete.' : '';
  }

  function safeManagedMessage() {
    var value = String(state.managedEngine.message || '').trim();
    if (!value || /docker|api[ _-]?key|\bport\b|https?:\/\/[^\s]+:\d{2,5}/i.test(value)) return '';
    return value.slice(0, 500);
  }

  function managedStatusMessage() {
    var phase = enginePhase();
    var provided = safeManagedMessage();
    if (engineIsReady() && state.serviceReady) return provided || 'Your local spreadsheet is ready.';
    if (phase === 'installing' || phase === 'downloading') {
      return 'Preparing the local spreadsheet engine. This one-time setup may take a few minutes.' +
        downloadProgressLabel(state.managedEngine.download);
    }
    if (phase === 'starting') return 'Starting your local spreadsheet.';
    if (phase === 'stopping') return 'Finishing a previous spreadsheet session.';
    if (phase === 'error') return 'AlloFlow could not start the local spreadsheet. Choose Start or retry, or ask your administrator for help.';
    return 'Preparing your local spreadsheet. No separate setup is normally required.';
  }

  function loadedManagedIdentityMatchesCurrent() {
    return !state.canvasMode
      && !!state.loadedDocId
      && !!state.loadedTableId
      && state.loadedDocId === currentDocId()
      && state.loadedTableId === currentTableId();
  }

  function invalidateLoadedManagedRecords(message) {
    if (state.canvasMode) return false;
    var hadLoadedIdentity = !!(state.loadedDocId || state.loadedTableId);
    var hadLoadedData = state.records.length > 0 || state.columns.length > 0;
    if (!hadLoadedIdentity && !hadLoadedData) return false;
    state.loadedDocId = '';
    state.loadedTableId = '';
    state.records = [];
    state.columns = [];
    var select = byId('tableSelect');
    clear(select);
    select.appendChild(new Option('Load tables for this workbook', ''));
    select.disabled = true;
    byId('loadRecordsButton').disabled = true;
    bumpDataRevision();
    resetLocalReviewState(message || 'The workbook connection changed. Load a table before requesting or applying a plan.');
    renderDataTable();
    updateApplyAvailability();
    return true;
  }

  function invalidateLoadedManagedRecordsIfConnectionChanged() {
    if (state.canvasMode || !state.loadedDocId && !state.loadedTableId) return false;
    if (loadedManagedIdentityMatchesCurrent()) return false;
    return invalidateLoadedManagedRecords(
      'The workbook connection changed. Load its table list and then load a table before requesting or applying a plan.'
    );
  }

  function updateServiceControls() {
    invalidateLoadedManagedRecordsIfConnectionChanged();
    var hasEditor = false;
    try { hasEditor = !!configuredEditorUrl(); } catch (_) {}
    byId('showEditorButton').disabled = !hasEditor;
    byId('openEditorButton').disabled = !hasEditor;
    byId('loadTablesButton').disabled = !(state.serviceReady && currentDocId());
  }

  function renderManagedStatus() {
    if (state.canvasMode) return;
    var phase = enginePhase();
    var editorReady = engineIsReady() && state.serviceReady;
    if (editorReady) setBadge(byId('serviceBadge'), 'Ready', 'good');
    else if (phase === 'error') setBadge(byId('serviceBadge'), 'Needs attention', 'danger');
    else if (phase === 'installing' || phase === 'downloading') setBadge(byId('serviceBadge'), 'One-time setup', 'neutral');
    else setBadge(byId('serviceBadge'), 'Starting', 'neutral');
    text(byId('serviceDetail'), managedStatusMessage());
    var technical = state.managedEngine.lastError
      ? 'Engine detail: ' + String(state.managedEngine.lastError)
      : 'Changing these fields overrides the managed local workbook for this window.';
    text(byId('advancedConnectionDetail'), technical);
    updateServiceControls();
  }

  var THEME_LABELS = { dark: 'Dark', light: 'Light', contrast: 'High contrast' };

  function isKnownTheme(value) {
    return Object.prototype.hasOwnProperty.call(THEME_LABELS, value);
  }

  function applyInitialTheme() {
    var params = new URLSearchParams(window.location.search);
    var requested = params.get('theme');
    var theme = isKnownTheme(requested) ? requested : 'dark';
    try {
      var stored = sessionStorage.getItem('allosheet_theme');
      if (isKnownTheme(stored)) theme = stored;
    } catch (_) {}
    document.documentElement.dataset.theme = theme;
    byId('themeSelect').value = theme;
  }

  function setTheme(next) {
    if (!isKnownTheme(next)) return;
    document.documentElement.dataset.theme = next;
    byId('themeSelect').value = next;
    try { sessionStorage.setItem('allosheet_theme', next); } catch (_) {}
    announce(THEME_LABELS[next] + ' theme enabled.');
  }

  function postToHost(message) {
    if (!window.opener || window.opener.closed || !state.hostOrigin || !state.bridgeToken) return false;
    try {
      window.opener.postMessage(Object.assign({}, message, {
        version: 1,
        bridgeToken: state.bridgeToken
      }), state.hostOrigin);
      return true;
    } catch (_) {
      return false;
    }
  }

  function updateHostAiDisclosure() {
    var origin = state.connectedOrigin || state.hostOrigin || 'the connected AlloFlow origin';
    text(
      byId('valuesConsentText'),
      state.hostAiTrusted
        ? 'I reviewed the selected rows and approve sending those values through the AlloFlow AI provider connected at '
          + origin + ' for this request.'
        : 'Selected values cannot be sent until you authorize the exact connected origin shown above.'
    );
    if (state.canvasMode) {
      text(
        byId('editorEmptyDetail'),
        state.hostAiTrusted
          ? 'Direct editing, local audit, reviewed AI plans, undo, and safe CSV downloads are available here. Use Desktop or a district-hosted service for .xlsx and full Grist.'
          : 'Direct editing, local audit, undo, and safe CSV downloads are available now. To use reviewed AI plans, first authorize the exact Canvas origin in the assistant panel. Use Desktop or a district-hosted service for .xlsx and full Grist.'
      );
    }
  }

  function updateAgentAvailability() {
    var hint = byId('agentConnectionHint');
    var ask = byId('askAgentButton');
    var authorization = byId('hostAuthorization');
    var authorizationText = byId('hostAuthorizationText');
    var hostDisclosure = state.connectedOrigin
      ? ' Connected origin: ' + state.connectedOrigin + '.'
      : '';
    var needsCanvasAuthorization = state.bridgeReady
      && state.canvasCandidate
      && state.hostReportsAi
      && !state.hostAiTrusted;
    authorization.hidden = !needsCanvasAuthorization;
    if (needsCanvasAuthorization) {
      text(
        authorizationText,
        'Allow ' + state.connectedOrigin + ' to receive bounded AlloSheet AI requests from this popup? Authorization is temporary and does not send any data.'
      );
    }
    ask.disabled = !(state.bridgeReady && state.aiAvailable);
    if (!state.bridgeReady) {
      text(hint, 'Reconnect this window to AlloFlow to use the assistant.');
      setBadge(byId('bridgeBadge'), 'AlloFlow disconnected', 'warn');
    } else if (!state.hostReportsAi) {
      text(hint, 'AlloFlow is connected, but no AI provider is configured. Local audit remains available.');
      setBadge(byId('bridgeBadge'), 'Connected · AI off', 'neutral');
    } else if (!state.hostAiTrusted) {
      text(hint, 'AI is off until you authorize this exact Canvas origin. Local editing and audit remain available.' + hostDisclosure);
      setBadge(byId('bridgeBadge'), 'Connected · authorization needed', 'warn');
    } else {
      text(hint, 'AI requests use the provider configured in AlloFlow. All changes require review.' + hostDisclosure);
      setBadge(byId('bridgeBadge'), 'Connected · AI ready', 'good');
    }
  }

  function authorizeCanvasHostForAi() {
    if (
      !state.bridgeReady
      || !state.canvasCandidate
      || !state.hostReportsAi
      || state.connectedOrigin !== state.hostOrigin
      || !isCanvasOpenerOrigin(state.connectedOrigin)
    ) {
      announce('This origin cannot be authorized for AlloSheet AI requests.');
      return;
    }
    state.hostAiTrusted = true;
    state.aiAvailable = true;
    updateHostAiDisclosure();
    updateAgentAvailability();
    byId('agentInstruction').focus();
    announce('AI requests authorized for ' + state.connectedOrigin + ' in this popup only. No workbook data was sent.');
  }

  function onHostMessage(event) {
    if (!window.opener || event.source !== window.opener) return;
    var data = event && event.data;
    if (!data || typeof data !== 'object') return;
    if (!state.hostOrigin || event.origin !== state.hostOrigin) return;
    if (data.version !== 1 || !state.bridgeToken || data.bridgeToken !== state.bridgeToken) return;
    if (data.type === 'allosheet-pairing-expired') {
      state.bridgeReady = false;
      state.aiAvailable = false;
      state.hostReportsAi = false;
      state.pairingExpiresAt = 0;
      state.canvasValidated = false;
      state.canvasMode = false;
      updateHostAiDisclosure();
      updateAgentAvailability();
      announce('AlloSheet pairing expired. Reopen this window from AlloFlow.');
      return;
    }
    if (data.type === 'allosheet-ready') {
      state.bridgeReady = true;
      state.connectedOrigin = event.origin;
      state.pairingExpiresAt = Number.isFinite(Number(data.pairingExpiresAt)) ? Number(data.pairingExpiresAt) : 0;
      state.hostReportsAi = data.ai === true;
      state.aiAvailable = state.hostReportsAi && state.hostAiTrusted;
      try { state.connectedHost = new URL(event.origin).hostname; } catch (_) {}
      if (state.canvasCandidate && isCanvasOpenerOrigin(event.origin)) {
        enableCanvasMode(event.origin);
      }
      updateHostAiDisclosure();
      updateAgentAvailability();
      announce('AlloSheet connected to AlloFlow.');
      return;
    }
    if (data.type === 'allosheet-import-artifact') {
      var transferId = String(data.transferId || '');
      if (!/^[a-f0-9]{32}$/i.test(transferId)) return;
      if (state.pendingArtifact || state.pendingTransferId) {
        postToHost({
          type: 'allosheet-transfer-receipt',
          transferId: transferId,
          status: 'rejected',
          reason: 'Finish or cancel the current AlloSheet transfer review before sending another.'
        });
        return;
      }
      showArtifactReview(data.artifact, transferId);
      return;
    }
    if (data.type === 'allosheet-ai-response' && state.pendingAgent && data.requestId === state.pendingAgent.id) {
      var pending = state.pendingAgent;
      state.pendingAgent = null;
      window.clearTimeout(pending.timer);
      if (data.error) pending.reject(new Error(String(data.error)));
      else pending.resolve(String(data.text || ''));
    }
  }

  function beginHandshake() {
    var tries = 0;
    function hello() {
      if (state.bridgeReady) return;
      if (tries >= 10) {
        if (state.canvasCandidate && !state.canvasValidated) showCanvasHandshakeUnavailable();
        return;
      }
      tries += 1;
      postToHost({ type: 'allosheet-hello', version: 1 });
      window.setTimeout(hello, 650);
    }
    hello();
  }

  function prepareCanvasHandshake() {
    byId('checkServiceButton').hidden = true;
    byId('tablePicker').hidden = true;
    byId('workbookConnectionActions').hidden = true;
    byId('advancedConnection').hidden = true;
    setBadge(byId('serviceBadge'), 'Connecting', 'neutral');
    text(byId('serviceDetail'), 'Connecting securely to AlloFlow before opening the Canvas browser workspace.');
    text(byId('editorEmptyTitle'), 'Connecting to AlloFlow');
    text(byId('editorEmptyDetail'), 'Keep this popup open while AlloFlow verifies the companion connection.');
  }

  function showCanvasHandshakeUnavailable() {
    byId('checkServiceButton').hidden = true;
    setBadge(byId('serviceBadge'), 'Reconnect', 'warn');
    text(byId('serviceDetail'), 'This popup could not verify its AlloFlow opener. Close it and open AlloSheet from AlloFlow again.');
    text(byId('editorEmptyTitle'), 'Reconnect from AlloFlow');
    text(byId('editorEmptyDetail'), 'For your data safety, browser mode stays locked until the secure opener handshake succeeds.');
  }

  function enableCanvasMode(validatedOrigin) {
    if (!state.bridgeReady || validatedOrigin !== state.hostOrigin || !isCanvasOpenerOrigin(validatedOrigin)) return false;
    state.canvasValidated = true;
    state.canvasMode = true;
    state.loadedDocId = '';
    state.loadedTableId = '';
    state.localWorkspaceKind = 'canvas-empty';
    state.serviceReady = false;
    if (state.enginePollTimer) {
      window.clearTimeout(state.enginePollTimer);
      state.enginePollTimer = null;
    }
    byId('checkServiceButton').hidden = true;
    byId('canvasFallback').hidden = false;
    byId('tablePicker').hidden = true;
    byId('workbookConnectionActions').hidden = true;
    byId('advancedConnection').hidden = true;
    text(byId('connectionTitle'), 'Canvas spreadsheet workspace');
    text(byId('connectionDescription'), 'This popup uses a bounded, in-browser table workspace because Gemini Canvas cannot start desktop software.');
    setBadge(byId('serviceBadge'), 'Canvas browser mode', 'good');
    text(byId('serviceDetail'), 'Connected to ' + state.connectedOrigin + '. Start a new sheet or import a CSV. Nothing is sent to a spreadsheet server.');
    text(byId('editorEmptyTitle'), 'Start a new sheet or import a CSV');
    updateHostAiDisclosure();
    updateServiceControls();
    announce('Canvas browser mode ready. Start a new sheet or import a CSV.');
    return true;
  }

  function parseCsvRows(input) {
    var source = String(input || '').replace(/^\uFEFF/, '');
    var rows = [];
    var row = [];
    var cell = '';
    var quoted = false;
    var maxStoredRows = Sheet.MAX_RECORDS + 1;

    function storeCell() {
      if (row.length >= Sheet.MAX_COLUMNS) {
        throw new Error('This CSV has more than 40 columns. Use AlloFlow Desktop for the complete workbook.');
      }
      row.push(cell);
      cell = '';
    }

    function storeRow() {
      storeCell();
      if (rows.length >= maxStoredRows) {
        throw new Error('This CSV has more than 200 data rows. Use AlloFlow Desktop for the complete workbook.');
      }
      rows.push(row);
      row = [];
    }

    for (var index = 0; index < source.length; index += 1) {
      var char = source[index];
      if (quoted) {
        if (char === '"' && source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else if (char === '"') {
          quoted = false;
        } else {
          cell += char;
        }
      } else if (char === '"' && cell === '') {
        quoted = true;
      } else if (char === ',') {
        storeCell();
      } else if (char === '\n' || char === '\r') {
        if (char === '\r' && source[index + 1] === '\n') index += 1;
        storeRow();
      } else {
        cell += char;
      }
    }
    if (quoted) throw new Error('The CSV contains an unfinished quoted cell.');
    if (cell !== '' || row.length) storeRow();
    while (rows.length && rows[rows.length - 1].every(function (value) { return value === ''; })) rows.pop();
    return { rows: rows };
  }

  function canvasColumns(header) {
    var used = Object.create(null);
    return (header || []).slice(0, Sheet.MAX_COLUMNS).map(function (value, index) {
      var original = String(value == null ? '' : value);
      if (
        original.length > 160
        || Sheet.safeText(original, 160) !== original
        || !Sheet.isSafeFieldName(original)
      ) {
        throw new Error('Header ' + (index + 1) + ' is empty, unsafe, or longer than 160 characters. No data was imported.');
      }
      if (used[original]) {
        throw new Error('The CSV contains a duplicate header named "' + original + '". No data was imported.');
      }
      used[original] = true;
      return original;
    });
  }

  function canvasRecords(rows, columns) {
    return (rows || []).slice(0, Sheet.MAX_RECORDS).map(function (values, index) {
      var fields = Object.create(null);
      columns.forEach(function (column, columnIndex) {
        var original = String(values[columnIndex] == null ? '' : values[columnIndex]);
        if (
          original.length > Sheet.MAX_CELL_CHARS
          || Sheet.safeText(original, Sheet.MAX_CELL_CHARS) !== original
        ) {
          throw new Error(
            'Row ' + (index + 2) + ', column ' + (columnIndex + 1)
            + ' contains unsupported control text or exceeds 1,200 characters. No data was imported.'
          );
        }
        fields[column] = original;
      });
      return { id: index + 1, fields: fields };
    });
  }

  function inboundArtifactError(message) {
    var error = new Error(message);
    error.code = 'allosheet-invalid-inbound-artifact';
    return error;
  }

  function inboundPlainObject(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    var prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  function inboundByteLength(value) {
    var source = typeof value === 'string' ? value : JSON.stringify(value);
    try {
      if (typeof TextEncoder === 'function') return new TextEncoder().encode(source).length;
    } catch (_) {}
    try {
      return unescape(encodeURIComponent(source)).length;
    } catch (_) {
      return source.length;
    }
  }

  function normalizeInboundMetadata(input, depth) {
    var result = {};
    if (!inboundPlainObject(input)) return result;
    Object.keys(input).slice(0, 24).forEach(function (rawKey) {
      if (rawKey === '__proto__' || rawKey === 'constructor' || rawKey === 'prototype') return;
      var key = Sheet.safeText(rawKey, 80).trim();
      if (
        !key
        || key !== rawKey.trim()
        || key === '__proto__'
        || key === 'constructor'
        || key === 'prototype'
      ) return;
      var value = input[rawKey];
      if (value === null || typeof value === 'boolean') {
        result[key] = value;
      } else if (typeof value === 'number' && Number.isFinite(value)) {
        result[key] = value;
      } else if (typeof value === 'string') {
        result[key] = Sheet.safeText(value, 500);
      } else if (Array.isArray(value)) {
        result[key] = value.slice(0, 24).reduce(function (items, item) {
          if (item === null || typeof item === 'boolean') items.push(item);
          else if (typeof item === 'number' && Number.isFinite(item)) items.push(item);
          else if (typeof item === 'string') items.push(Sheet.safeText(item, 160));
          return items;
        }, []);
      } else if ((depth || 0) < 1 && inboundPlainObject(value)) {
        result[key] = normalizeInboundMetadata(value, (depth || 0) + 1);
      }
    });
    return result;
  }

  function inboundSingleLine(value, fallback, max, label) {
    var raw = String(value == null || value === '' ? fallback : value);
    var safe = Sheet.safeText(raw, max);
    if (
      !safe
      || safe !== raw
      || safe !== safe.trim()
      || /[\u0000-\u001f\u007f]/.test(safe)
    ) {
      throw inboundArtifactError(label + ' must be non-empty, single-line text without surrounding whitespace.');
    }
    return safe;
  }

  function normalizeInboundArtifact(input) {
    var serialized;
    try {
      serialized = JSON.stringify(input);
    } catch (_) {
      throw inboundArtifactError('The source tool sent a table transfer that could not be inspected safely.');
    }
    if (!serialized || inboundByteLength(serialized) >= 2 * 1024 * 1024) {
      throw inboundArtifactError('The transferred tables are larger than 2 MB. Refine the source filters and try again.');
    }
    if (!inboundPlainObject(input) || input.kind !== 'alloflow.tabular.v1' || input.version !== 1) {
      throw inboundArtifactError('The source tool sent an unsupported table format.');
    }
    if (!inboundPlainObject(input.source) || !Array.isArray(input.tables) || !input.tables.length || input.tables.length > 5) {
      throw inboundArtifactError('The source tool did not send a valid bounded table set.');
    }
    var sourceTool = Sheet.safeText(input.source.tool, 64).trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(sourceTool)) {
      throw inboundArtifactError('The source tool identifier is invalid.');
    }
    var sourceLabel = inboundSingleLine(input.source.label, sourceTool, 100, 'The source label');
    var seenTables = Object.create(null);
    var tables = input.tables.map(function (table, tableIndex) {
      if (!inboundPlainObject(table)) throw inboundArtifactError('Transferred table ' + (tableIndex + 1) + ' is invalid.');
      var tableId = Sheet.safeText(table.id, 80).trim();
      if (!Sheet.isSafeFieldName(tableId) || seenTables[tableId]) {
        throw inboundArtifactError('A transferred table identifier is empty, unsafe, or duplicated.');
      }
      seenTables[tableId] = true;
      if (!Array.isArray(table.columns) || !table.columns.length || table.columns.length > Sheet.MAX_COLUMNS) {
        throw inboundArtifactError('Each transferred table must have between 1 and 40 columns.');
      }
      var keyToField = Object.create(null);
      var columnDetails = [];
      var allowedColumnTypes = {
        text: true, number: true, boolean: true, date: true,
        datetime: true, duration: true, category: true
      };
      var rawFields = table.columns.map(function (column, columnIndex) {
        if (!inboundPlainObject(column)) {
          throw inboundArtifactError('Column ' + (columnIndex + 1) + ' in ' + tableId + ' is invalid.');
        }
        var key = Sheet.safeText(column.key, 160).trim();
        var label = Sheet.safeText(column.label || key, 160).trim();
        if (!Sheet.isSafeFieldName(key) || !Sheet.isSafeFieldName(label) || keyToField[key]) {
          throw inboundArtifactError('A transferred column identifier or label is empty, unsafe, or duplicated.');
        }
        var type = Sheet.safeText(column.type || 'text', 20).toLowerCase();
        if (!allowedColumnTypes[type]) type = 'text';
        keyToField[key] = label;
        columnDetails.push({ key: key, label: label, type: type });
        return label;
      });
      var fields;
      try {
        fields = canvasColumns(rawFields);
      } catch (_) {
        throw inboundArtifactError('Transferred table ' + tableId + ' contains duplicate or unsafe column labels.');
      }
      if (!Array.isArray(table.rows) || table.rows.length > Sheet.MAX_RECORDS) {
        throw inboundArtifactError('Transferred tables may contain at most 200 rows each.');
      }
      var seenRows = Object.create(null);
      var records = table.rows.map(function (row, rowIndex) {
        if (!inboundPlainObject(row) || !inboundPlainObject(row.values)) {
          throw inboundArtifactError('Row ' + (rowIndex + 1) + ' in ' + tableId + ' is invalid.');
        }
        Object.keys(row.values).forEach(function (key) {
          if (!keyToField[key]) {
            throw inboundArtifactError('A transferred row contains an unexpected field.');
          }
        });
        var recordFields = Object.create(null);
        table.columns.forEach(function (column) {
          var value = Object.prototype.hasOwnProperty.call(row.values, column.key) ? row.values[column.key] : '';
          if (value !== null && typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
            throw inboundArtifactError('Transferred cells may contain only text, numbers, booleans, or empty values.');
          }
          if (typeof value === 'string' && (
            value.length > Sheet.MAX_CELL_CHARS
            || Sheet.safeText(value, Sheet.MAX_CELL_CHARS) !== value
          )) {
            throw inboundArtifactError('A transferred cell contains unsupported control text or exceeds 1,200 characters.');
          }
          recordFields[keyToField[column.key]] = Sheet.sanitizeScalar(value);
        });
        var recordId = row.id == null ? rowIndex + 1 : row.id;
        if (typeof recordId !== 'string' && typeof recordId !== 'number') {
          throw inboundArtifactError('A transferred row identifier is invalid.');
        }
        var rawRecordId = String(recordId);
        var safeRecordId = Sheet.safeText(rawRecordId, 120);
        if (
          !safeRecordId
          || safeRecordId !== rawRecordId
          || safeRecordId.trim() !== safeRecordId
          || /[\u0000-\u001f\u007f]/.test(safeRecordId)
          || seenRows[safeRecordId]
        ) {
          throw inboundArtifactError('A transferred row identifier is empty, unsafe, too long, or duplicated.');
        }
        seenRows[safeRecordId] = true;
        return { id: safeRecordId, fields: recordFields };
      });
      var title = inboundSingleLine(table.title, tableId, 160, 'Transferred table title');
      var sourceRowCount = Math.max(
        records.length,
        Math.min(1000000, Math.floor(Number(table.sourceRowCount) || records.length))
      );
      return {
        id: tableId,
        title: title,
        columns: fields,
        columnDetails: columnDetails,
        records: records,
        fileName: safeLocalFileName(title),
        savePoint: localTableSnapshot(fields, records),
        dirty: false,
        sourceRowCount: sourceRowCount,
        truncated: table.truncated === true || sourceRowCount > records.length
      };
    });
    var classification = inboundPlainObject(input.classification) ? input.classification : {};
    var privacy = inboundPlainObject(input.privacy) ? input.privacy : {};
    return {
      kind: 'alloflow.tabular.v1',
      version: 1,
      source: {
        tool: sourceTool,
        label: sourceLabel,
        version: inboundSingleLine(input.source.version, '1', 40, 'The source version')
      },
      title: inboundSingleLine(input.title, sourceLabel + ' tables', 180, 'The transfer title'),
      createdAt: Sheet.safeText(input.createdAt || '', 60),
      classification: {
        level: inboundSingleLine(classification.level, 'education-data', 80, 'The classification level'),
        identifierIncluded: privacy.identifierIncluded === true
          || classification.identifierIncluded === true
          || classification.studentIdentifierIncluded === true,
        notesIncluded: privacy.notesIncluded === true || classification.freeTextNotesIncluded === true,
        declarationKnown: inboundPlainObject(input.classification) || inboundPlainObject(input.privacy)
      },
      privacy: {
        reducedData: privacy.reducedData === true,
        transferEnablesAI: false
      },
      tables: tables,
      provenance: normalizeInboundMetadata(input.provenance, 0),
      capabilities: { writeBack: false, aiEnabled: false }
    };
  }

  function sendTransferReceipt(transferId, status, reason) {
    if (!/^[a-f0-9]{32}$/i.test(String(transferId || ''))) return false;
    var message = {
      type: 'allosheet-transfer-receipt',
      transferId: transferId,
      status: status
    };
    if (reason) message.reason = Sheet.safeText(reason, 300);
    return postToHost(message);
  }

  function setArtifactReviewIsolation(enabled) {
    var backdrop = byId('artifactReviewBackdrop');
    if (enabled) {
      if (!backdrop.hidden && state.artifactIsolationSnapshot.length) {
        byId('artifactReview').hidden = false;
        return;
      }
      state.artifactIsolationSnapshot = [];
      Array.prototype.forEach.call(document.body.children, function (element) {
        if (element === backdrop) return;
        state.artifactIsolationSnapshot.push({
          element: element,
          inert: element.inert === true,
          ariaHidden: element.getAttribute('aria-hidden')
        });
        element.inert = true;
        element.setAttribute('aria-hidden', 'true');
      });
      document.body.classList.add('artifact-review-open');
      backdrop.hidden = false;
      byId('artifactReview').hidden = false;
      return;
    }
    byId('artifactReview').hidden = true;
    backdrop.hidden = true;
    document.body.classList.remove('artifact-review-open');
    state.artifactIsolationSnapshot.forEach(function (snapshot) {
      snapshot.element.inert = snapshot.inert;
      if (snapshot.ariaHidden === null) snapshot.element.removeAttribute('aria-hidden');
      else snapshot.element.setAttribute('aria-hidden', snapshot.ariaHidden);
    });
    state.artifactIsolationSnapshot = [];
  }

  function artifactMetadataParts(metadata, prefix, depth) {
    var result = [];
    Object.keys(metadata || {}).slice(0, 24).forEach(function (key) {
      var value = metadata[key];
      var label = (prefix ? prefix + ' ' : '') + key.replace(/[_-]+/g, ' ');
      if (Array.isArray(value)) {
        if (value.length) result.push(label + ': ' + value.join(', '));
      } else if (inboundPlainObject(value) && (depth || 0) < 1) {
        result = result.concat(artifactMetadataParts(value, label, (depth || 0) + 1));
      } else if (value !== null && value !== '') {
        result.push(label + ': ' + String(value));
      }
    });
    return result.slice(0, 24);
  }

  function updateArtifactSelection() {
    var artifact = state.pendingArtifact;
    var selected = state.artifactReviewSelection.size;
    var total = artifact ? artifact.tables.length : 0;
    text(
      byId('artifactSelectionSummary'),
      artifact ? selected + ' of ' + total + ' table' + (total === 1 ? '' : 's') + ' selected.' : ''
    );
    byId('acceptArtifactButton').disabled = !artifact || selected < 1;
  }

  function hideArtifactReview(message) {
    state.pendingArtifact = null;
    state.pendingArtifactMode = 'transfer';
    state.pendingWorkspace = null;
    state.artifactReturnFocus = null;
    state.pendingTransferId = '';
    state.artifactReviewSelection = new Set();
    setArtifactReviewIsolation(false);
    byId('acceptArtifactButton').disabled = false;
    byId('artifactReviewStatus').hidden = true;
    text(byId('artifactReviewStatus'), '');
    text(byId('artifactSelectionSummary'), '');
    clear(byId('artifactTableList'));
    if (message) announce(message);
  }

  function showArtifactReview(input, transferId, options) {
    options = options || {};
    var review = byId('artifactReview');
    var status = byId('artifactReviewStatus');
    var mode = options.mode === 'workspace' ? 'workspace' : 'transfer';
    try {
      var artifact = options.normalizedArtifact === true ? input : normalizeInboundArtifact(input);
      state.pendingArtifact = artifact;
      state.pendingArtifactMode = mode;
      state.pendingWorkspace = mode === 'workspace' ? options.workspaceData : null;
      state.artifactReturnFocus = options.returnFocus || null;
      state.pendingTransferId = mode === 'transfer' ? transferId : '';
      state.artifactReviewSelection = new Set(artifact.tables.map(function (table) { return table.id; }));
      state.artifactReceivedAt = Date.now();

      if (mode === 'workspace') {
        text(byId('artifactReviewTitle'), 'Review saved AlloSheet workspace');
        text(
          byId('artifactSourceSummary'),
          '"' + artifact.title + '" contains ' + artifact.tables.length + ' table'
            + (artifact.tables.length === 1 ? '' : 's') + '. It was saved at '
            + artifact.workspace.savedAt + ' and records its original source as '
            + artifact.source.label + ' (' + artifact.source.tool + '). Opening it creates a local copy in this popup.'
        );
        text(byId('artifactReviewHelp'), 'Opening selected tables does not enable AI, contact the recorded source, or write back. It replaces the current local-table view only after you approve.');
        byId('artifactReview').querySelector('legend').textContent = 'Select the tables to reopen';
        text(byId('acceptArtifactButton'), 'Open selected tables');
        text(byId('cancelArtifactButton'), 'Cancel workspace open');
      } else {
        text(byId('artifactReviewTitle'), 'Review tables sent to AlloSheet');
        text(
          byId('artifactSourceSummary'),
          artifact.source.label + ' sent ' + artifact.tables.length + ' table'
            + (artifact.tables.length === 1 ? '' : 's') + ' as a one-way local copy. Stable source ID: '
            + artifact.source.tool + '; source version: ' + artifact.source.version + '. Connected opener: '
            + (state.connectedOrigin || state.hostOrigin || 'unavailable') + '.'
        );
        text(byId('artifactReviewHelp'), 'Opening these tables does not enable AI. Values remain in this popup unless you separately select rows and approve an AI request.');
        byId('artifactReview').querySelector('legend').textContent = 'Select the tables to open';
        text(byId('acceptArtifactButton'), 'Open selected tables');
        text(byId('cancelArtifactButton'), 'Cancel transfer');
      }

      var privacyParts = [];
      if (artifact.classification.declarationKnown === false) {
        privacyParts.push('The saved metadata does not contain a verified declaration about identifiers or free-text notes.');
      } else {
        privacyParts.push(
          artifact.classification.level === 'sensitive-education-record'
            ? 'Classified as sensitive education data.'
            : 'Classified as ' + artifact.classification.level + '.'
        );
        privacyParts.push(
          artifact.classification.identifierIncluded
            ? 'An explicit or pseudonymous student identifier is included.'
            : 'No explicit student identifier column is declared; dates, small groups, or free text may still identify a learner.'
        );
        privacyParts.push(
          artifact.classification.notesIncluded
            ? 'The source says free-text notes are included.'
            : 'The source says free-text notes are not included.'
        );
      }
      if (artifact.privacy.reducedData) privacyParts.push('The source marked this as a reduced-data copy.');
      if (mode === 'workspace') {
        privacyParts.push('This unencrypted workspace file may contain education records.');
      }
      text(byId('artifactPrivacySummary'), privacyParts.join(' '));
      var provenanceParts = artifactMetadataParts(artifact.provenance, '', 0);
      text(
        byId('artifactProvenanceSummary'),
        mode === 'workspace'
          ? 'Provenance in this file is descriptive metadata and has not been authenticated. '
            + (provenanceParts.length ? provenanceParts.join('; ') + '.' : 'No additional provenance was stored.')
          : provenanceParts.length
            ? 'Source provenance: ' + provenanceParts.join('; ') + '.'
            : 'No additional source provenance was supplied.'
      );
      var list = byId('artifactTableList');
      clear(list);
      artifact.tables.forEach(function (table, index) {
        var item = make('li', null, 'artifact-table-option');
        var label = make('label', null, '');
        var checkbox = document.createElement('input');
        var detailId = 'artifactTableDetail' + index;
        var fieldsId = 'artifactTableFields' + index;
        checkbox.type = 'checkbox';
        checkbox.checked = true;
        checkbox.setAttribute('aria-describedby', detailId + ' ' + fieldsId);
        checkbox.addEventListener('change', function () {
          if (checkbox.checked) state.artifactReviewSelection.add(table.id);
          else state.artifactReviewSelection.delete(table.id);
          updateArtifactSelection();
        });
        label.appendChild(checkbox);
        label.appendChild(make('strong', table.title, ''));
        item.appendChild(label);
        var detail = table.records.length + ' row'
          + (table.records.length === 1 ? '' : 's') + ' and ' + table.columns.length + ' column'
          + (table.columns.length === 1 ? '' : 's') + '.';
        if (table.truncated) {
          detail += ' The recorded source contains ' + table.sourceRowCount + ' rows; this bounded copy contains '
            + table.records.length + '.';
        }
        if (mode === 'workspace' && table.sourceModified === true) {
          detail += ' This table is marked modified since the recorded source snapshot.';
        }
        item.appendChild(make('span', detail, 'artifact-table-detail')).id = detailId;
        var fields = make(
          'span',
          'Fields: ' + table.columnDetails.map(function (column) {
            return column.label + ' (' + column.type + ')';
          }).join(', ') + '.',
          'artifact-field-list'
        );
        fields.id = fieldsId;
        item.appendChild(fields);
        list.appendChild(item);
      });
      status.hidden = true;
      text(status, '');
      updateArtifactSelection();
      setArtifactReviewIsolation(true);
      review.focus();
      if (mode === 'transfer') sendTransferReceipt(transferId, 'received');
      announce(
        mode === 'workspace'
          ? 'Review ' + artifact.tables.length + ' tables from the saved AlloSheet workspace.'
          : 'Review ' + artifact.tables.length + ' table' + (artifact.tables.length === 1 ? '' : 's')
            + ' sent by ' + artifact.source.label + '.'
      );
      return true;
    } catch (error) {
      state.pendingArtifact = null;
      state.pendingArtifactMode = 'transfer';
      state.pendingWorkspace = null;
      state.artifactReturnFocus = null;
      state.pendingTransferId = '';
      state.artifactReviewSelection = new Set();
      if (mode === 'workspace') {
        setArtifactReviewIsolation(false);
        setWorkspaceFileError('Could not open this workspace: ' + String(error && error.message || error));
        return false;
      }
      text(byId('artifactSourceSummary'), 'AlloSheet could not safely open the transferred tables.');
      text(byId('artifactPrivacySummary'), '');
      text(byId('artifactProvenanceSummary'), '');
      text(byId('artifactSelectionSummary'), '');
      clear(byId('artifactTableList'));
      text(status, String(error && error.message || error));
      status.hidden = false;
      byId('acceptArtifactButton').disabled = true;
      setArtifactReviewIsolation(true);
      review.focus();
      sendTransferReceipt(transferId, 'rejected', String(error && error.message || error));
      announce('Transferred tables rejected. ' + String(error && error.message || error));
      return false;
    }
  }

  function acceptArtifact() {
    var artifact = state.pendingArtifact;
    if (!artifact) return;
    var mode = state.pendingArtifactMode;
    var workspaceData = state.pendingWorkspace;
    var tables = artifact.tables.filter(function (table) {
      return state.artifactReviewSelection.has(table.id);
    });
    if (!tables.length) {
      text(byId('artifactReviewStatus'), 'Select at least one table to open.');
      byId('artifactReviewStatus').hidden = false;
      return;
    }
    if (!confirmLocalReplacement()) return;
    var sourceLabel = artifact.source.label;
    var transferId = state.pendingTransferId;
    try {
      hideArtifactReview();
      if (mode === 'workspace') {
        var activeTableId = tables.some(function (table) { return table.id === workspaceData.activeTableId; })
          ? workspaceData.activeTableId
          : tables[0].id;
        tables.forEach(function (table) {
          table.fileName = safeLocalFileName(table.title);
          table.savePoint = localTableSnapshot(table.columns, table.records);
          table.dirty = false;
        });
        installLocalTables(tables, {
          kind: 'workspace',
          workspaceTitle: workspaceData.workspace.title,
          workspaceCreatedAt: workspaceData.workspace.createdAt,
          origin: workspaceData.origin,
          activeTableId: activeTableId,
          outerTitle: workspaceData.workspace.title,
          outerDescription: 'These tables were reopened from a validated local workspace file. The recorded source remains unchanged.',
          desktopHint: 'Download an updated all-table workspace to keep edits. The workspace file is unencrypted and should be stored securely.',
          heading: 'Reopened local workspace',
          description: 'Review, edit, audit, and analyze this validated local copy. Reopening did not enable AI, contact the source, or allow write-back.',
          badge: 'Workspace ready',
          serviceDetail: tables.length + ' reviewed table' + (tables.length === 1 ? '' : 's') + ' reopened locally.',
          focusCell: true
        });
        text(byId('workspaceFileStatus'), 'Workspace opened after review. Local analysis results are recalculated and were not loaded from the file.');
        announce('Saved AlloSheet workspace opened locally.');
        return;
      }
      installLocalTables(tables, {
        kind: 'handoff',
        workspaceTitle: artifact.title || sourceLabel + ' table workspace',
        workspaceCreatedAt: new Date().toISOString(),
        origin: workspaceOriginFromArtifact(artifact),
        outerTitle: sourceLabel + ' table workspace',
        outerDescription: 'These tables are a one-way browser-local copy. The source tool remains unchanged.',
        desktopHint: 'Download a reviewed CSV or all-table workspace you need to keep. Closing this popup does not change '
          + sourceLabel + ' or the managed Grist workbook.',
        heading: 'Transferred local tables',
        description: 'Review, edit, audit, analyze, and download this one-way copy. Opening it did not enable AI or allow write-back.',
        badge: 'Transfer ready',
        serviceDetail: tables.length + ' reviewed table' + (tables.length === 1 ? '' : 's') + ' from ' + sourceLabel + ' opened locally.',
        focusCell: true
      });
      sendTransferReceipt(transferId, 'accepted');
    } catch (error) {
      if (mode === 'transfer') {
        sendTransferReceipt(transferId, 'rejected', String(error && error.message || error));
      }
      announce('AlloSheet could not install the reviewed tables. No write-back occurred.');
    }
  }

  function cancelArtifact() {
    var transferId = state.pendingTransferId;
    var mode = state.pendingArtifactMode;
    var returnFocus = state.artifactReturnFocus;
    if (mode === 'transfer' && transferId) sendTransferReceipt(transferId, 'cancelled');
    hideArtifactReview(
      mode === 'workspace'
        ? 'Workspace open canceled. Current AlloSheet data was not changed.'
        : 'Table transfer canceled. No AlloSheet data changed.'
    );
    if (returnFocus && returnFocus.isConnected && typeof returnFocus.focus === 'function') {
      returnFocus.focus();
    } else {
      byId('mainContent').focus();
    }
  }

  function handleArtifactReviewKeydown(event) {
    var review = byId('artifactReview');
    if (review.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelArtifact();
      return;
    }
    if (event.key !== 'Tab') return;
    var focusable = Array.prototype.filter.call(
      review.querySelectorAll('button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'),
      function (control) { return !control.hidden; }
    );
    if (!focusable.length) {
      event.preventDefault();
      review.focus();
      return;
    }
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || !review.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !review.contains(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  }

  function formulaHardenedCsvCell(value) {
    var raw = Sheet.formatValue(value);
    var trimmed = raw.replace(/^\s+/, '');
    var numeric = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(trimmed);
    if (!numeric && /^[=+@-]/.test(trimmed)) raw = "'" + raw;
    return '"' + raw.replace(/"/g, '""') + '"';
  }

  function localCsvText(columns, records) {
    var lines = [columns.map(formulaHardenedCsvCell).join(',')];
    records.forEach(function (record) {
      lines.push(columns.map(function (column) {
        return formulaHardenedCsvCell(record.fields[column]);
      }).join(','));
    });
    return '\uFEFF' + lines.join('\r\n');
  }

  function snapshotScalar(value) {
    if (value === null) return ['null', null];
    if (typeof value === 'number') {
      return ['number', Object.is(value, -0) ? '-0' : String(value)];
    }
    if (typeof value === 'boolean') return ['boolean', value];
    if (typeof value === 'undefined') return ['undefined', null];
    return ['string', String(value)];
  }

  function localTableSnapshot(columns, records) {
    return JSON.stringify([
      (columns || []).map(String),
      (records || []).map(function (record) {
        return [
          snapshotScalar(record && record.id),
          (columns || []).map(function (column) {
            return snapshotScalar(record && record.fields ? record.fields[column] : undefined);
          })
        ];
      })
    ]);
  }

  function canvasCsvText() {
    return localCsvText(state.columns, state.records);
  }

  function currentLocalTable() {
    var tableId = currentTableId();
    return state.localTables.find(function (table) { return table.id === tableId; }) || null;
  }

  function refreshLocalDirtyState() {
    var table = currentLocalTable();
    if (table) {
      table.dirty = table.savePoint === null
        ? true
        : localTableSnapshot(table.columns, table.records) !== table.savePoint;
    }
    state.canvasDirty = state.localTables.some(function (item) { return item.dirty === true; });
    return state.canvasDirty;
  }

  function confirmLocalReplacement() {
    refreshLocalDirtyState();
    if (!state.canvasDirty) return true;
    return window.confirm('This will replace local AlloSheet work that has not been downloaded as CSV or an AlloSheet workspace. Continue?');
  }

  function clearUndoState(message) {
    state.lastUndo = null;
    state.lastUndoBinding = null;
    byId('undoButton').disabled = true;
    if (message) text(byId('undoSummary'), message);
  }

  function updateUndoAvailability() {
    byId('undoButton').disabled = !(state.lastUndo && dataBindingMatches(state.lastUndoBinding));
  }

  function resetAuditResults(message) {
    var results = byId('auditResults');
    if (!results) return;
    clear(results);
    results.className = 'empty-state';
    text(results, message || 'Run the local audit for the current loaded table.');
  }

  function resetLocalReviewState(message, options) {
    options = options || {};
    state.selectedIds.clear();
    clearValuesConsent();
    state.plan = null;
    state.planBinding = null;
    state.allRowsSelected = false;
    byId('selectAllRowsButton').textContent = 'Select all loaded rows';
    byId('planSection').hidden = true;
    clear(byId('planBody'));
    resetAuditResults();
    if (!options.preserveUndo) {
      clearUndoState(message || 'No AlloSheet changes have been applied to this local table.');
    } else {
      updateUndoAvailability();
    }
    document.querySelectorAll('.row-share-checkbox').forEach(function (input) { input.checked = false; });
  }

  function activateLocalTable(tableId, options) {
    options = options || {};
    var table = state.localTables.find(function (item) { return item.id === tableId; });
    if (!table) return false;
    state.columns = table.columns;
    state.records = table.records;
    state.canvasFileName = table.fileName;
    byId('tableSelect').value = table.id;
    bumpDataRevision();
    resetLocalReviewState('No AlloSheet changes have been applied to ' + table.title + '.');
    renderDataTable();
    setView('table');
    byId('downloadCanvasCsvButton').disabled = !state.columns.length;
    var limits = table.truncated
      ? ' Showing ' + table.records.length + ' of ' + table.sourceRowCount + ' source rows.'
      : '';
    text(
      byId('canvasFileStatus'),
      table.records.length + ' row' + (table.records.length === 1 ? '' : 's')
        + ' and ' + table.columns.length + ' column' + (table.columns.length === 1 ? '' : 's')
        + ' open locally.' + limits
    );
    if (options.focusCell) {
      window.setTimeout(function () {
        var firstCell = document.querySelector('.canvas-cell-input');
        if (firstCell) firstCell.focus();
        else byId('dataTableScroll').focus();
      }, 0);
    }
    announce(table.title + ' opened with ' + table.records.length + ' rows and ' + table.columns.length + ' columns.');
    return true;
  }

  function installLocalTables(tables, options) {
    options = options || {};
    var workspaceKind = options.kind || 'local';
    state.canvasMode = true;
    state.serviceReady = true;
    state.loadedDocId = '';
    state.loadedTableId = '';
    state.localWorkspaceKind = workspaceKind;
    state.localWorkspaceTitle = Sheet.safeText(
      options.workspaceTitle || options.outerTitle || (tables[0] && tables[0].title) || 'AlloSheet workspace',
      Workspace.limits.maxWorkspaceTitleChars
    ).trim() || 'AlloSheet workspace';
    state.localWorkspaceCreatedAt = safeUtcTimestamp(options.workspaceCreatedAt, new Date().toISOString());
    state.localWorkspaceOrigin = options.origin || createLocalOrigin(
      workspaceKind === 'handoff' ? 'transfer' : workspaceKind,
      'allosheet',
      'AlloSheet',
      { workspaceKind: workspaceKind },
      state.localWorkspaceCreatedAt
    );
    state.localTables = tables;
    state.localTables.forEach(function (table) {
      table.fileName = table.fileName || safeLocalFileName(table.title);
      table.sourceModified = table.sourceModified === true;
    });
    bumpDataRevision();
    state.canvasDirty = tables.some(function (table) { return table.dirty === true; });
    var defaultOuterTitle = workspaceKind === 'blank'
      ? 'New local sheet workspace'
      : workspaceKind === 'csv'
        ? 'Imported CSV workspace'
        : 'Local table workspace';
    text(byId('connectionTitle'), options.outerTitle || defaultOuterTitle);
    text(
      byId('connectionDescription'),
      options.outerDescription || 'This is a browser-local table workspace. The source file or tool remains unchanged.'
    );
    text(
      byId('desktopFeatureHint'),
      options.desktopHint || 'Download the current table as CSV to keep it. Use the managed spreadsheet for .xlsx and full Grist features.'
    );
    if (state.enginePollTimer) {
      window.clearTimeout(state.enginePollTimer);
      state.enginePollTimer = null;
    }
    byId('checkServiceButton').hidden = true;
    byId('canvasFallback').hidden = false;
    byId('tablePicker').hidden = false;
    byId('workbookConnectionActions').hidden = true;
    byId('advancedConnection').hidden = true;
    byId('downloadWorkspaceButton').disabled = !tables.length;
    clearWorkspaceFileError();
    text(byId('canvasFallbackTitle'), options.heading || 'Local table workspace');
    text(
      byId('canvasModeDescription'),
      options.description || 'Edit, audit, and review these tables locally. Data remains in this popup until you download it.'
    );
    var select = byId('tableSelect');
    clear(select);
    tables.forEach(function (table) {
      select.appendChild(new Option(
        table.title + ' (' + table.records.length + ' row' + (table.records.length === 1 ? '' : 's') + ')',
        table.id
      ));
    });
    select.disabled = !tables.length;
    setBadge(byId('serviceBadge'), options.badge || 'Local tables ready', 'good');
    text(byId('serviceDetail'), options.serviceDetail || 'The local table workspace is ready.');
    setNewSheetFormOpen(false);
    if (tables.length) {
      var requestedActive = tables.some(function (table) { return table.id === options.activeTableId; })
        ? options.activeTableId
        : tables[0].id;
      activateLocalTable(requestedActive, { focusCell: options.focusCell === true });
    }
  }

  function clearNewSheetError() {
    var error = byId('newSheetError');
    error.hidden = true;
    text(error, '');
    ['newSheetName', 'newSheetRows', 'newSheetColumns'].forEach(function (id) {
      byId(id).removeAttribute('aria-invalid');
    });
  }

  function setNewSheetError(message, control) {
    clearNewSheetError();
    var error = byId('newSheetError');
    text(error, message);
    error.hidden = false;
    if (control) control.setAttribute('aria-invalid', 'true');
    error.focus();
    announce(message);
  }

  function setNewSheetFormOpen(open) {
    var form = byId('newSheetForm');
    var button = byId('showNewSheetButton');
    form.hidden = !open;
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
    clearNewSheetError();
    if (open) {
      byId('newSheetName').focus();
      byId('newSheetName').select();
    }
  }

  function safeLocalFileName(value) {
    var base = Sheet.safeText(value || 'allosheet', 100)
      .replace(/\.csv$/i, '')
      .replace(/[^A-Za-z0-9._-]+/g, '_')
      .replace(/^\.+|\.+$/g, '')
      .slice(0, 100) || 'allosheet';
    return base + '.csv';
  }


  function safeUtcTimestamp(value, fallback) {
    var candidate = String(value || '');
    if (Workspace.isValidTimestamp(candidate)) {
      return candidate;
    }
    return fallback || new Date().toISOString();
  }

  function createLocalOrigin(kind, sourceTool, sourceLabel, provenance, createdAt) {
    var allowedKind = Workspace.originKinds.indexOf(kind) >= 0 ? kind : 'workspace';
    return {
      kind: allowedKind,
      source: {
        tool: sourceTool,
        label: sourceLabel,
        version: '1'
      },
      createdAt: safeUtcTimestamp(createdAt, new Date().toISOString()),
      classification: {
        level: 'education-data',
        identifierIncluded: false,
        notesIncluded: false,
        declarationKnown: false
      },
      privacy: {
        scope: allowedKind === 'blank' ? 'local-authoring' : 'local-copy',
        reducedData: false,
        transferEnablesAI: false
      },
      provenance: provenance || {}
    };
  }

  function workspaceOriginFromArtifact(artifact) {
    return {
      kind: 'transfer',
      source: {
        tool: artifact.source.tool,
        label: artifact.source.label,
        version: artifact.source.version
      },
      createdAt: safeUtcTimestamp(artifact.createdAt, new Date().toISOString()),
      classification: {
        level: artifact.classification.level,
        identifierIncluded: artifact.classification.identifierIncluded === true,
        notesIncluded: artifact.classification.notesIncluded === true,
        declarationKnown: artifact.classification.declarationKnown !== false
      },
      privacy: {
        scope: 'reviewed-one-way-transfer',
        reducedData: artifact.privacy.reducedData === true,
        transferEnablesAI: false
      },
      provenance: artifact.provenance || {}
    };
  }

  function safeWorkspaceFileName(value) {
    var base = Sheet.safeText(value || 'allosheet_workspace', 100)
      .replace(/\.allosheet\.json$/i, '')
      .replace(/\.json$/i, '')
      .replace(/[^A-Za-z0-9._-]+/g, '_')
      .replace(/^\.+|\.+$/g, '')
      .slice(0, 100) || 'allosheet_workspace';
    return base + Workspace.fileExtension;
  }

  function clearWorkspaceFileError() {
    var error = byId('workspaceFileError');
    if (!error) return;
    error.hidden = true;
    text(error, '');
  }

  function setWorkspaceFileError(message) {
    clearWorkspaceFileError();
    text(byId('workspaceFileError'), message);
    byId('workspaceFileError').hidden = false;
    text(byId('workspaceFileStatus'), 'The workspace was not opened. Current tables and unsaved changes are unchanged.');
    announce(message);
  }

  function workspaceReviewArtifact(restored) {
    return {
      kind: 'alloflow.allosheet.workspace-review.v1',
      version: 1,
      source: restored.origin.source,
      title: restored.workspace.title,
      createdAt: restored.origin.createdAt,
      classification: restored.origin.classification,
      privacy: restored.origin.privacy,
      tables: restored.localTables,
      provenance: restored.origin.provenance,
      capabilities: restored.capabilities,
      workspace: restored.workspace
    };
  }

  async function importAlloSheetWorkspace(event) {
    var input = event && event.target;
    var file = input && input.files && input.files[0];
    if (!file) return;
    clearWorkspaceFileError();
    if (file.size > Workspace.limits.maxWorkspaceBytes) {
      setWorkspaceFileError('That file is larger than the 8 MiB AlloSheet workspace limit.');
      input.value = '';
      return;
    }
    byId('workspaceFilePanel').setAttribute('aria-busy', 'true');
    text(byId('workspaceFileStatus'), 'Reading and validating the workspace locally.');
    try {
      var restored = Workspace.toLocalTables(await file.text());
      restored.localTables.forEach(function (table) {
        table.fileName = safeLocalFileName(table.title);
        table.savePoint = localTableSnapshot(table.columns, table.records);
        table.dirty = false;
      });
      var shown = showArtifactReview(
        workspaceReviewArtifact(restored),
        '',
        {
          mode: 'workspace',
          normalizedArtifact: true,
          workspaceData: restored,
          returnFocus: input
        }
      );
      if (shown) {
        text(byId('workspaceFileStatus'), 'Workspace validated. Review its tables before opening them.');
      }
    } catch (error) {
      setWorkspaceFileError('Could not open this workspace: ' + String(error && error.message || error));
    } finally {
      byId('workspaceFilePanel').removeAttribute('aria-busy');
      input.value = '';
    }
  }

  function downloadAllTableWorkspace() {
    if (!state.canvasMode || !state.localTables.length) return;
    clearWorkspaceFileError();
    refreshLocalDirtyState();
    var modifiedTableIds = state.localTables.filter(function (table) {
      return table.sourceModified === true || table.dirty === true;
    }).map(function (table) { return table.id; });
    var savedAt = new Date().toISOString();
    try {
      var workspaceText = Workspace.encodeLocalTables({
        workspace: {
          title: state.localWorkspaceTitle || 'AlloSheet workspace',
          createdAt: safeUtcTimestamp(state.localWorkspaceCreatedAt, savedAt),
          savedAt: savedAt,
          activeTableId: currentTableId() || state.localTables[0].id,
          modifiedTableIds: modifiedTableIds
        },
        origin: state.localWorkspaceOrigin || createLocalOrigin(
          'workspace',
          'allosheet',
          'AlloSheet',
          {},
          state.localWorkspaceCreatedAt
        ),
        tables: state.localTables
      });
      var blob = new Blob([workspaceText], { type: Workspace.mimeType + ';charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var link = document.createElement('a');
      link.href = url;
      link.download = safeWorkspaceFileName(state.localWorkspaceTitle);
      link.hidden = true;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      state.localTables.forEach(function (table) {
        table.sourceModified = modifiedTableIds.indexOf(table.id) >= 0;
        table.savePoint = localTableSnapshot(table.columns, table.records);
        table.dirty = false;
      });
      state.canvasDirty = false;
      text(byId('workspaceFileStatus'), 'All-table workspace downloaded. It is unencrypted; store it in an approved secure location.');
      text(byId('canvasFileStatus'), 'All local tables were saved to an AlloSheet workspace. Current-table CSV remains available separately.');
      announce('All-table AlloSheet workspace downloaded.');
    } catch (error) {
      setWorkspaceFileError('Could not create the workspace file: ' + String(error && error.message || error));
    }
  }

  function createBlankSheet(event) {
    if (event) event.preventDefault();
    clearNewSheetError();
    var nameControl = byId('newSheetName');
    var rowsControl = byId('newSheetRows');
    var columnsControl = byId('newSheetColumns');
    var rawName = String(nameControl.value || '');
    var name = rawName.trim();
    if (!name || name.length > 100 || Sheet.safeText(name, 100) !== name) {
      setNewSheetError('Enter a sheet name using no more than 100 supported characters.', nameControl);
      return;
    }
    var rowCount = Number(rowsControl.value);
    if (!Number.isInteger(rowCount) || rowCount < 1 || rowCount > Sheet.MAX_RECORDS) {
      setNewSheetError('Choose an initial row count from 1 through 200.', rowsControl);
      return;
    }
    var rawColumns = String(columnsControl.value || '').replace(/\r\n?/g, '\n').split('\n');
    while (rawColumns.length && !rawColumns[rawColumns.length - 1].trim()) rawColumns.pop();
    if (!rawColumns.length || rawColumns.some(function (value) { return !value.trim(); })) {
      setNewSheetError('Enter each column name on its own non-empty line.', columnsControl);
      return;
    }
    if (rawColumns.length > Sheet.MAX_COLUMNS) {
      setNewSheetError('A local sheet may contain at most 40 columns.', columnsControl);
      return;
    }
    var columns;
    try {
      columns = canvasColumns(rawColumns.map(function (value) { return value.trim(); }));
    } catch (error) {
      setNewSheetError(String(error && error.message || error).replace(/Header/g, 'Column').replace(/CSV/g, 'sheet'), columnsControl);
      return;
    }
    if (!confirmLocalReplacement()) return;
    var blankRows = Array.from({ length: rowCount }, function () {
      return columns.map(function () { return ''; });
    });
    var records = canvasRecords(blankRows, columns);
    installLocalTables([{
      id: 'blank_sheet',
      title: name,
      columns: columns,
      records: records,
      fileName: safeLocalFileName(name),
      savePoint: null,
      dirty: true,
      sourceRowCount: records.length,
      truncated: false
    }], {
      kind: 'blank',
      workspaceTitle: name,
      workspaceCreatedAt: new Date().toISOString(),
      origin: createLocalOrigin('blank', 'allosheet', 'AlloSheet', { creation: 'blank-local-sheet' }),
      heading: 'New local sheet',
      badge: 'New sheet ready',
      serviceDetail: 'The new sheet is open locally and has not been downloaded yet.',
      focusCell: true
    });
  }

  async function importCanvasCsv(event) {
    if (!state.canvasMode) return;
    var file = event && event.target && event.target.files && event.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      text(byId('canvasFileStatus'), 'That CSV is larger than 2 MB. Choose a smaller file or use AlloFlow Desktop.');
      announce('CSV not imported because it is larger than 2 MB.');
      if (event && event.target) event.target.value = '';
      return;
    }
    byId('canvasFallback').setAttribute('aria-busy', 'true');
    text(byId('canvasFileStatus'), 'Reading and validating the CSV locally.');
    try {
      var parsedCsv = parseCsvRows(await file.text());
      var rows = parsedCsv.rows;
      if (!rows.length) throw new Error('The CSV is empty.');
      var columns = canvasColumns(rows[0]);
      if (!columns.length) throw new Error('The CSV does not have a header row.');
      var records = canvasRecords(rows.slice(1), columns);
      if (!confirmLocalReplacement()) {
        text(byId('canvasFileStatus'), 'CSV import canceled. The current local tables were not changed.');
        announce('CSV import canceled. The current local tables were not changed.');
        return;
      }
      var fileName = safeLocalFileName(file.name || 'allosheet.csv');
      var savePoint = localTableSnapshot(columns, records);
      installLocalTables([{
        id: 'imported_csv',
        title: String(file.name || 'Imported CSV').replace(/\.csv$/i, '') || 'Imported CSV',
        columns: columns,
        records: records,
        fileName: fileName,
        savePoint: savePoint,
        dirty: false,
        sourceRowCount: records.length,
        truncated: false
      }], {
        kind: 'csv',
        workspaceTitle: String(file.name || 'Imported CSV').replace(/\.csv$/i, '') || 'Imported CSV',
        workspaceCreatedAt: new Date().toISOString(),
        origin: createLocalOrigin(
          'csv',
          'csv_file',
          'Imported CSV',
          { fileName: Sheet.safeText(file.name || 'Imported CSV', 160) }
        ),
        heading: 'Imported local table',
        badge: 'CSV ready',
        serviceDetail: 'The imported CSV is open in this browser-local workspace.',
        focusCell: true
      });
    } catch (error) {
      text(byId('canvasFileStatus'), 'Could not import this CSV: ' + String(error && error.message || error));
      announce('CSV import failed.');
    } finally {
      byId('canvasFallback').removeAttribute('aria-busy');
      if (event && event.target) event.target.value = '';
    }
  }

  function applyCanvasChanges(changes, useOldValue) {
    var changed = false;
    var records = Object.create(null);
    state.records.forEach(function (record) { records[String(record.id)] = record; });
    (changes || []).forEach(function (change) {
      var record = records[String(change.recordId)];
      if (!record || state.columns.indexOf(change.field) < 0) return;
      var nextValue = useOldValue ? change.oldValue : change.newValue;
      if (record.fields[change.field] === nextValue) return;
      record.fields[change.field] = nextValue;
      changed = true;
    });
    if (changed) {
      var changedTable = currentLocalTable();
      if (changedTable) changedTable.sourceModified = true;
      bumpDataRevision();
    }
    refreshLocalDirtyState();
  }

  function recordCanvasEdit(record, field, input, finalize) {
    var previous = record.fields[field];
    var next = Sheet.safeText(input.value, Sheet.MAX_CELL_CHARS);
    input.value = next;
    if (!Object.prototype.hasOwnProperty.call(input, '_alloEditStartValue')) {
      input._alloEditStartValue = previous;
    }
    var changed = String(previous == null ? '' : previous) !== next;
    if (changed) {
      record.fields[field] = next;
      var changedTable = currentLocalTable();
      if (changedTable) changedTable.sourceModified = true;
      bumpDataRevision();
      refreshLocalDirtyState();
      text(byId('canvasFileStatus'), 'Local changes are not saved automatically. Download the current table CSV or the all-table workspace when you are finished.');
    }
    if (!finalize) return;
    configureAnalysisControls();
    var original = input._alloEditStartValue;
    input._alloEditStartValue = next;
    if (String(original == null ? '' : original) === next) return;
    state.lastUndo = [{
      recordId: record.id,
      field: field,
      oldValue: original,
      newValue: next,
      reason: 'Direct browser edit.'
    }];
    state.lastUndoBinding = currentDataBinding();
    byId('undoButton').disabled = false;
    text(byId('undoSummary'), 'Direct edit applied to record ' + record.id + ', ' + field + '. One-step undo is available.');
    announce('Cell updated locally. One-step undo is available.');
  }

  function downloadCanvasCsv() {
    if (!state.canvasMode || !state.columns.length) return;
    var original = String(state.canvasFileName || 'allosheet.csv').replace(/\.csv$/i, '');
    var base = original.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^\.+|\.+$/g, '').slice(0, 100) || 'allosheet';
    var csvText = canvasCsvText();
    var blob = new Blob([csvText], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = base + '_reviewed.csv';
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    var table = currentLocalTable();
    if (table) {
      table.savePoint = localTableSnapshot(table.columns, table.records);
      table.dirty = false;
    }
    refreshLocalDirtyState();
    text(byId('canvasFileStatus'), 'Reviewed CSV downloaded. Formula-like text was prefixed to reduce spreadsheet formula-injection risk.');
    announce('Reviewed CSV downloaded.');
  }


  function analysisColumnDetails() {
    var table = currentLocalTable();
    return table && Array.isArray(table.columnDetails) ? table.columnDetails : [];
  }

  function clearAnalysisError() {
    var error = byId('analysisError');
    if (!error) return;
    error.hidden = true;
    text(error, '');
    ['analysisFilterColumn', 'analysisFilterOperator', 'analysisFilterValue',
      'analysisGroupColumn', 'analysisMeasureColumn', 'analysisCalculation',
      'analysisRepresentation'].forEach(function (id) {
      var control = byId(id);
      if (control) control.removeAttribute('aria-invalid');
    });
  }

  function setAnalysisError(message, control) {
    clearAnalysisError();
    var error = byId('analysisError');
    text(error, message);
    error.hidden = false;
    if (control) control.setAttribute('aria-invalid', 'true');
    error.focus();
  }

  function resetAnalysisResults(message) {
    state.analysisBinding = null;
    state.analysisModel = null;
    byId('downloadAnalysisButton').disabled = true;
    text(byId('analysisExportStatus'), 'Run an analysis before downloading its grouped result.');
    clear(byId('analysisVisual'));
    byId('analysisVisual').hidden = true;
    clear(byId('analysisHead'));
    clear(byId('analysisBody'));
    text(byId('analysisCaption'), 'No local analysis has been run.');
    text(byId('analysisNarrative'), message || 'Choose the analysis controls, then run the local analysis.');
    clearAnalysisError();
  }

  function appendSelectOption(select, value, label) {
    var option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
    return option;
  }

  function populateAnalysisColumnSelect(select, placeholder, columns, priorValue) {
    clear(select);
    if (placeholder !== null) appendSelectOption(select, '', placeholder);
    columns.forEach(function (column) { appendSelectOption(select, column, column); });
    if (columns.indexOf(priorValue) >= 0) select.value = priorValue;
  }

  function currentAnalysisTableBinding() {
    return state.canvasMode
      ? 'local|' + String(state.localWorkspaceKind || '') + '|' + String(currentTableId() || '')
      : 'managed|' + String(state.loadedDocId || '') + '|' + String(currentTableId() || '');
  }

  function formatAnalysisProfileValue(value) {
    if (value === null || value === undefined) return 'Not available';
    if (typeof value === 'number' && Number.isFinite(value)) {
      if (Math.abs(value - Math.round(value)) < 0.0000001) return String(Math.round(value));
      return String(Math.round(value * 1000000) / 1000000);
    }
    return String(value);
  }

  function renderAnalysisProfile(profile) {
    var head = byId('analysisProfileHead');
    var body = byId('analysisProfileBody');
    if (!head || !body) return;
    clear(head);
    clear(body);
    text(byId('analysisProfileNarrative'), profile.narrative);
    text(byId('analysisProfileCaption'), profile.columns.length + ' column'
      + (profile.columns.length === 1 ? '' : 's') + ' profiled across '
      + profile.sourceRowCount + ' loaded row' + (profile.sourceRowCount === 1 ? '' : 's') + '.');
    var headerRow = document.createElement('tr');
    ['Column', 'Inferred type', 'Filled', 'Blank', 'Distinct nonblank', 'Range'].forEach(function (label) {
      var cell = make('th', label, '');
      cell.scope = 'col';
      headerRow.appendChild(cell);
    });
    head.appendChild(headerRow);
    profile.columns.forEach(function (item) {
      var row = document.createElement('tr');
      var column = make('th', item.column, '');
      column.scope = 'row';
      row.appendChild(column);
      var typeLabel = item.type + (item.identifierLike ? ' (identifier-like)' : '');
      row.appendChild(make('td', typeLabel, ''));
      row.appendChild(make('td', item.filledCount + ' / ' + profile.sourceRowCount, ''));
      row.appendChild(make('td', item.blankCount, ''));
      row.appendChild(make('td', item.distinctCount, ''));
      var range = item.range
        ? formatAnalysisProfileValue(item.range.minimum) + ' to ' + formatAnalysisProfileValue(item.range.maximum)
        : 'Not applicable';
      row.appendChild(make('td', range, ''));
      body.appendChild(row);
    });
  }

  function configureAnalysisControls() {
    var columns = state.columns.slice();
    var tableBinding = currentAnalysisTableBinding();
    var sameTable = state.analysisControlTableBinding === tableBinding;
    state.analysisColumnTypes = Analysis.inferColumnTypes(
      state.records,
      columns,
      analysisColumnDetails()
    );
    state.analysisProfile = Analysis.buildColumnProfile(
      state.records,
      columns,
      analysisColumnDetails()
    );
    state.analysisProfileBinding = currentDataBinding();
    renderAnalysisProfile(state.analysisProfile);
    var filter = byId('analysisFilterColumn');
    var group = byId('analysisGroupColumn');
    var measure = byId('analysisMeasureColumn');
    var priorFilter = sameTable ? filter.value : '';
    var priorGroup = sameTable ? group.value : '';
    var priorMeasure = sameTable ? measure.value : '__count__';
    if (!sameTable) {
      byId('analysisFilterOperator').value = 'contains';
      byId('analysisFilterValue').value = '';
      byId('analysisCalculation').value = 'count';
      byId('analysisRepresentation').value = 'bar';
    }
    populateAnalysisColumnSelect(filter, 'No filter', columns, priorFilter);
    if (!filter.value) byId('analysisFilterValue').value = '';
    populateAnalysisColumnSelect(
      group,
      columns.length ? 'Choose a group column' : 'Load a table first',
      columns,
      priorGroup
    );
    if (!group.value && columns.length) {
      var preferredGroup = columns.find(function (column) {
        var type = state.analysisColumnTypes[column];
        return type === 'date' || type === 'datetime' || type === 'category' || type === 'text';
      });
      group.value = preferredGroup || columns[0];
    }
    clear(measure);
    appendSelectOption(measure, '__count__', 'Row count');
    columns.forEach(function (column) {
      var type = state.analysisColumnTypes[column];
      if (type === 'number' || type === 'duration') appendSelectOption(measure, column, column);
    });
    measure.value = Array.prototype.some.call(measure.options, function (option) {
      return option.value === priorMeasure;
    }) ? priorMeasure : '__count__';
    state.analysisControlTableBinding = tableBinding;
    byId('runAnalysisButton').disabled = !columns.length;
    if (!state.analysisModel) {
      text(
        byId('analysisNarrative'),
        columns.length
          ? 'Choose the analysis controls, then run the local analysis.'
          : 'Load a table to configure a local analysis.'
      );
    }
    updateAnalysisControlState();
  }

  function updateAnalysisControlState() {
    var filterColumn = byId('analysisFilterColumn').value;
    var filterOperator = byId('analysisFilterOperator');
    var filterValue = byId('analysisFilterValue');
    var filterType = state.analysisColumnTypes[filterColumn];
    var numericFilter = filterType === 'number' || filterType === 'duration';
    Array.prototype.forEach.call(filterOperator.options, function (option) {
      if (option.value === 'gte' || option.value === 'lte') option.disabled = !numericFilter;
    });
    if (!numericFilter && (filterOperator.value === 'gte' || filterOperator.value === 'lte')) {
      filterOperator.value = 'contains';
    }
    filterOperator.disabled = !filterColumn;
    filterValue.disabled = !filterColumn
      || filterOperator.value === 'is-blank'
      || filterOperator.value === 'not-blank';
    var measure = byId('analysisMeasureColumn').value;
    var calculation = byId('analysisCalculation');
    calculation.disabled = measure === '__count__';
    if (measure === '__count__') calculation.value = 'count';
    else if (calculation.value === 'count') calculation.value = 'average';
    var groupType = state.analysisColumnTypes[byId('analysisGroupColumn').value];
    var trendOption = byId('analysisTrendOption');
    trendOption.disabled = groupType !== 'date' && groupType !== 'datetime';
    if (trendOption.disabled && byId('analysisRepresentation').value === 'trend') {
      byId('analysisRepresentation').value = 'bar';
    }
  }

  function markAnalysisStale() {
    updateAnalysisControlState();
    if (state.analysisModel) {
      resetAnalysisResults('Analysis choices changed. Run the local analysis again for updated results.');
    }
  }

  function formatAnalysisMetric(value) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return 'Not available';
    var numeric = Number(value);
    if (Math.abs(numeric - Math.round(numeric)) < 0.0000001) return String(Math.round(numeric));
    return String(Math.round(numeric * 100) / 100);
  }

  function renderAnalysisTable(model) {
    var head = byId('analysisHead');
    var body = byId('analysisBody');
    clear(head);
    clear(body);
    var headerRow = document.createElement('tr');
    [
      model.spec.groupColumn,
      'Rows in group',
      model.spec.calculation === 'count' ? 'Numeric values used' : model.spec.measureColumn + ' values used',
      model.metricLabel
    ].forEach(function (label) {
      var cell = make('th', label, '');
      cell.scope = 'col';
      headerRow.appendChild(cell);
    });
    head.appendChild(headerRow);
    model.groups.forEach(function (group) {
      var row = document.createElement('tr');
      var label = make('th', group.label, '');
      label.scope = 'row';
      row.appendChild(label);
      row.appendChild(make('td', group.rowCount, ''));
      row.appendChild(make(
        'td',
        model.spec.calculation === 'count' ? 'Not applicable' : group.numericCount,
        ''
      ));
      row.appendChild(make('td', formatAnalysisMetric(group.metric), ''));
      body.appendChild(row);
    });
    text(
      byId('analysisCaption'),
      model.metricLabel + ' grouped by ' + model.spec.groupColumn + '. '
        + model.groups.length + ' result group' + (model.groups.length === 1 ? '' : 's') + '.'
    );
  }

  function renderBarAnalysis(model, container) {
    var available = model.groups.filter(function (group) { return group.metric !== null; });
    if (!available.length) {
      container.appendChild(make('p', 'No numeric result is available for the selected calculation.', 'field-hint'));
      return;
    }
    var maximum = Math.max.apply(Math, available.map(function (group) {
      return Math.abs(Number(group.metric));
    }));
    if (maximum === 0) maximum = 1;
    available.forEach(function (group) {
      var row = make('div', null, 'analysis-bar-row');
      row.appendChild(make('span', group.label, 'analysis-bar-label'));
      var track = make('span', null, 'analysis-bar-track');
      var fill = make('span', null, 'analysis-bar-fill' + (group.metric < 0 ? ' negative' : ''));
      fill.style.display = 'block';
      fill.style.width = (Math.abs(group.metric) / maximum * 100).toFixed(2) + '%';
      track.appendChild(fill);
      row.appendChild(track);
      row.appendChild(make('span', formatAnalysisMetric(group.metric), 'analysis-bar-value'));
      container.appendChild(row);
    });
  }

  function svgNode(name, attributes, content) {
    var node = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.keys(attributes || {}).forEach(function (key) { node.setAttribute(key, attributes[key]); });
    if (content !== undefined) node.textContent = content;
    return node;
  }

  function renderTrendAnalysis(model, container) {
    var available = (model.trendGroups || []).filter(function (group) { return group.metric !== null; });
    if (!available.length) {
      container.appendChild(make('p', 'No numeric dated result is available for a trend.', 'field-hint'));
      return;
    }
    var values = available.map(function (group) { return Number(group.metric); });
    var minimum = Math.min.apply(Math, values);
    var maximum = Math.max.apply(Math, values);
    if (minimum === maximum) {
      minimum -= 1;
      maximum += 1;
    }
    var width = 800;
    var left = 60;
    var right = 740;
    var top = 28;
    var bottom = 215;
    var positionFractions = Analysis.trendPositionFractions(available);
    var points = available.map(function (group, index) {
      var x = left + positionFractions[index] * (right - left);
      var y = top + (maximum - Number(group.metric)) / (maximum - minimum) * (bottom - top);
      return { x: x, y: y, group: group };
    });
    var svg = svgNode('svg', {
      viewBox: '0 0 ' + width + ' 270',
      class: 'analysis-trend-svg',
      focusable: 'false',
      'aria-hidden': 'true',
      preserveAspectRatio: 'xMidYMid meet'
    });
    svg.appendChild(svgNode('line', {
      x1: left, y1: bottom, x2: right, y2: bottom,
      stroke: 'currentColor', 'stroke-width': '2'
    }));
    svg.appendChild(svgNode('polyline', {
      points: points.map(function (point) { return point.x + ',' + point.y; }).join(' '),
      class: 'analysis-trend-line'
    }));
    points.forEach(function (point) {
      svg.appendChild(svgNode('circle', {
        cx: point.x, cy: point.y, r: 7, class: 'analysis-trend-point'
      }));
    });
    var first = points[0];
    var last = points[points.length - 1];
    svg.appendChild(svgNode('text', {
      x: left, y: 248, class: 'analysis-trend-label', 'text-anchor': 'start'
    }, first.group.label + ': ' + formatAnalysisMetric(first.group.metric)));
    if (last !== first) {
      svg.appendChild(svgNode('text', {
        x: right, y: 248, class: 'analysis-trend-label', 'text-anchor': 'end'
      }, last.group.label + ': ' + formatAnalysisMetric(last.group.metric)));
    }
    container.appendChild(svg);
  }

  function renderAnalysis(model) {
    state.analysisModel = model;
    state.analysisBinding = currentDataBinding();
    byId('downloadAnalysisButton').disabled = false;
    text(byId('analysisExportStatus'), 'Download this grouped result as a local CSV if you need a portable summary.');
    text(byId('analysisNarrative'), model.narrative);
    renderAnalysisTable(model);
    var visual = byId('analysisVisual');
    clear(visual);
    visual.hidden = false;
    if (!model.visualAllowed) {
      visual.appendChild(make(
        'p',
        'Visual omitted because there are more than ' + Analysis.MAX_VISUAL_GROUPS
          + ' groups. Every result remains available in the table below.',
        'field-hint'
      ));
    } else if (model.spec.representation === 'trend') {
      renderTrendAnalysis(model, visual);
    } else {
      renderBarAnalysis(model, visual);
    }
  }

  function downloadAnalysisCsv() {
    var model = state.analysisModel;
    var status = byId('analysisExportStatus');
    if (!model || !dataBindingMatches(state.analysisBinding)) {
      text(status, 'The analysis result is stale. Run the local analysis again before downloading.');
      announce('The analysis result is stale. Run it again before downloading.');
      return;
    }
    var usedHeading = model.spec.calculation === 'count'
      ? 'Numeric values used'
      : model.spec.measureColumn + ' values used';
    var headers = [model.spec.groupColumn, 'Rows in group', usedHeading, model.metricLabel];
    var lines = [headers.map(formulaHardenedCsvCell).join(',')];
    model.groups.forEach(function (group) {
      lines.push([
        group.label,
        group.rowCount,
        model.spec.calculation === 'count' ? 'Not applicable' : group.numericCount,
        group.metric === null ? 'Not available' : formatAnalysisMetric(group.metric)
      ].map(formulaHardenedCsvCell).join(','));
    });
    var rawName = state.canvasMode
      ? (state.canvasFileName || state.localWorkspaceTitle)
      : currentTableId();
    var base = Sheet.safeText(rawName || 'allosheet', 100)
      .replace(/\.csv$/i, '')
      .replace(/[^A-Za-z0-9._-]+/g, '_')
      .replace(/^\.+|\.+$/g, '')
      .slice(0, 100) || 'allosheet';
    var blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = base + '_analysis.csv';
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    text(status, 'Analysis result downloaded. It contains grouped labels and calculated metrics only; store it securely.');
    announce('Analysis result CSV downloaded.');
  }

  function runLocalAnalysis(event) {
    if (event) event.preventDefault();
    clearAnalysisError();
    try {
      var model = Analysis.buildAnalysis(
        state.records,
        state.columns,
        analysisColumnDetails(),
        {
          filterColumn: byId('analysisFilterColumn').value,
          filterOperator: byId('analysisFilterOperator').value,
          filterValue: byId('analysisFilterValue').value,
          groupColumn: byId('analysisGroupColumn').value,
          measureColumn: byId('analysisMeasureColumn').value,
          calculation: byId('analysisCalculation').value,
          representation: byId('analysisRepresentation').value
        }
      );
      renderAnalysis(model);
    } catch (error) {
      setAnalysisError(String(error && error.message || error), byId('analysisGroupColumn'));
    }
  }

  async function refreshManagedConfig() {
    var config = await state.adapter.getConfig();
    if (state.canvasMode) return config;
    state.serviceConfig = config;
    mergeManagedEngine(config);
    return config;
  }

  async function finishManagedEngine() {
    if (state.canvasMode) return false;
    if (state.enginePollTimer) {
      window.clearTimeout(state.enginePollTimer);
      state.enginePollTimer = null;
    }
    try { await refreshManagedConfig(); } catch (_) {}
    if (state.canvasMode) return false;
    state.serviceReady = true;
    renderManagedStatus();
    if (state.activeEditorUrl) showEditor({ silent: true });
    announce('Your local spreadsheet is ready.');
    return true;
  }

  function scheduleEnginePoll() {
    if (state.canvasMode) return;
    if (state.enginePollTimer) window.clearTimeout(state.enginePollTimer);
    state.enginePollTimer = window.setTimeout(async function poll() {
      state.enginePollTimer = null;
      if (state.canvasMode) return;
      try {
        var snapshot = await runtimeRequest('/api/allosheet/engine/status', {
          headers: { Accept: 'application/json' }
        });
        if (state.canvasMode) return;
        mergeManagedEngine(snapshot);
        renderManagedStatus();
        if (engineIsReady()) {
          await finishManagedEngine();
          return;
        }
        state.enginePollCount += 1;
        if (state.enginePollCount < 180) scheduleEnginePoll();
        else {
          setBadge(byId('serviceBadge'), 'Still preparing', 'warn');
          text(byId('serviceDetail'), 'The local spreadsheet is taking longer than expected. Choose Start or retry to check again.');
        }
      } catch (_) {
        if (state.canvasMode) return;
        state.enginePollCount += 1;
        if (state.enginePollCount < 20) scheduleEnginePoll();
        else {
          setBadge(byId('serviceBadge'), 'Needs attention', 'danger');
          text(byId('serviceDetail'), 'AlloFlow could not check the local spreadsheet. Choose Start or retry.');
        }
      }
    }, 1000);
  }

  async function startManagedEngine() {
    if (state.canvasMode) return false;
    state.serviceReady = false;
    setBadge(byId('serviceBadge'), 'Starting', 'neutral');
    text(byId('serviceDetail'), 'Starting your local spreadsheet. The first launch may include a one-time setup.');
    state.enginePollCount = 0;
    scheduleEnginePoll();
    var snapshot = await runtimeRequest('/api/allosheet/engine/start', {
      method: 'POST',
      headers: { Accept: 'application/json' }
    });
    if (state.canvasMode) return false;
    mergeManagedEngine(snapshot);
    renderManagedStatus();
    if (engineIsReady()) return finishManagedEngine();
    if (!state.enginePollTimer) scheduleEnginePoll();
    return false;
  }

  async function useConfiguredServer(config) {
    if (state.canvasMode) return false;
    if (!config || !config.configured) return false;
    var status = await state.adapter.status();
    if (state.canvasMode) return false;
    state.activeEditorUrl = String(
      config.editorUrl || config.documentUrl ||
      (currentDocId() && (status.baseUrl || config.baseUrl)
        ? String(status.baseUrl || config.baseUrl).replace(/\/+$/, '') + '/' + encodeURIComponent(currentDocId())
        : '')
    ).trim();
    state.activeDocId = String(config.docId || config.documentId || state.activeDocId || '').trim();
    state.serviceReady = true;
    setBadge(byId('serviceBadge'), 'Server ready', 'good');
    text(byId('serviceDetail'), 'Your administrator-managed spreadsheet is ready.');
    updateServiceControls();
    if (state.activeEditorUrl) showEditor({ silent: true });
    announce('The administrator-managed spreadsheet is ready.');
    return true;
  }

  async function checkService() {
    if (state.canvasMode || state.canvasCandidate && !state.canvasValidated) return false;
    var button = byId('checkServiceButton');
    if (isBusy(button)) return false;
    if (state.enginePollTimer) {
      window.clearTimeout(state.enginePollTimer);
      state.enginePollTimer = null;
    }
    setBusy(button, true, 'Starting…');
    byId('engineCard').setAttribute('aria-busy', 'true');
    setBadge(byId('serviceBadge'), 'Checking', 'neutral');
    text(byId('serviceDetail'), 'Checking the local spreadsheet engine.');
    try {
      var config = await refreshManagedConfig();
      if (state.canvasMode) return false;
      var snapshot;
      try {
        snapshot = await runtimeRequest('/api/allosheet/engine/status', {
          headers: { Accept: 'application/json' }
        });
      } catch (statusError) {
        if (state.canvasMode) return false;
        if (statusError.status === 404 && await useConfiguredServer(config)) return true;
        throw statusError;
      }
      if (state.canvasMode) return false;
      mergeManagedEngine(snapshot);
      renderManagedStatus();
      if (engineIsReady()) return finishManagedEngine();
      return await startManagedEngine();
    } catch (error) {
      if (state.canvasMode) return false;
      state.serviceReady = false;
      state.managedEngine.phase = 'error';
      setBadge(byId('serviceBadge'), 'Needs attention', 'danger');
      text(byId('serviceDetail'), 'AlloFlow could not start the local spreadsheet. Choose Start or retry, or ask your administrator for help.');
      text(byId('advancedConnectionDetail'), 'Technical detail: ' + String(error && error.message || error));
      updateServiceControls();
      announce('The local spreadsheet needs attention.');
      return false;
    } finally {
      setBusy(button, false, 'Starting…');
      byId('engineCard').removeAttribute('aria-busy');
    }
  }

  function tableIdFromItem(item) {
    if (typeof item === 'string') return item;
    return String(item && (item.id || item.tableId || item.name) || '');
  }

  function beginManagedMutation(kind) {
    if (state.managedMutationInFlight) return false;
    state.managedMutationInFlight = kind;
    var other = byId(kind === 'apply' ? 'undoButton' : 'applyPlanButton');
    other.dataset.managedWriteBlocked = 'true';
    other.setAttribute('aria-disabled', 'true');
    return true;
  }

  function endManagedMutation() {
    state.managedMutationInFlight = '';
    document.querySelectorAll('[data-managed-write-blocked="true"]').forEach(function (control) {
      delete control.dataset.managedWriteBlocked;
      control.removeAttribute('aria-disabled');
    });
    updateApplyAvailability();
    updateUndoAvailability();
  }

  function announceManagedMutationBusy() {
    announce('Wait for the current workbook write and refresh to finish before starting another action.');
  }

  async function loadTables() {
    if (state.managedMutationInFlight) {
      announceManagedMutationBusy();
      return false;
    }
    var docId = currentDocId();
    var requestRevision = state.dataRevision;
    var button = byId('loadTablesButton');
    if (isBusy(button)) return false;
    if (!docId) {
      if (advancedModeActive()) {
        setAdvancedError('Enter the administrator-provided document ID before loading tables.', byId('documentIdInput'));
        byId('documentIdInput').focus();
      } else {
        byId('checkServiceButton').focus();
        announce('The workbook is still preparing. Try Start or retry, or use the advanced server connection.');
      }
      return;
    }
    clearAdvancedError();
    setBusy(button, true, 'Loading…');
    try {
      var payload = await state.adapter.listTables(docId);
      if (state.canvasMode || currentDocId() !== docId || state.dataRevision !== requestRevision) {
        announce('The workbook changed before its table list finished loading. The stale result was discarded.');
        return false;
      }
      invalidateLoadedManagedRecords(
        'The workbook table list was refreshed. Choose and load a table before requesting or applying a plan.'
      );
      var tables = Array.isArray(payload.tables) ? payload.tables : (Array.isArray(payload) ? payload : []);
      var select = byId('tableSelect');
      clear(select);
      select.appendChild(new Option(tables.length ? 'Choose a table' : 'No tables found', ''));
      tables.forEach(function (item) {
        var id = tableIdFromItem(item);
        if (id) select.appendChild(new Option(id, id));
      });
      select.disabled = !tables.length;
      byId('loadRecordsButton').disabled = true;
      announce(tables.length + ' Grist table' + (tables.length === 1 ? '' : 's') + ' available.');
      return true;
    } catch (error) {
      if (state.canvasMode || currentDocId() !== docId) return false;
      announce('Could not load Grist tables. ' + error.message);
      setBadge(byId('serviceBadge'), 'Table read failed', 'danger');
      text(byId('serviceDetail'), error.message);
    } finally {
      setBusy(button, false, 'Loading…');
    }
  }

  function updateSelectedRows() {
    clearValuesConsent();
    state.selectedIds = new Set(Array.from(document.querySelectorAll('.row-share-checkbox:checked')).map(function (input) {
      return input.dataset.recordId;
    }));
    if (state.selectedIds.size) clearAgentError('rows');
    state.allRowsSelected = state.records.length > 0 && state.selectedIds.size === state.records.length;
    byId('selectAllRowsButton').textContent = state.allRowsSelected ? 'Clear row selection' : 'Select all loaded rows';
    updateConsentVisibility();
  }

  function renderDataTable() {
    var head = byId('dataHead');
    var body = byId('dataBody');
    clear(head);
    clear(body);
    state.selectedIds.clear();
    clearValuesConsent();
    state.allRowsSelected = false;
    byId('selectAllRowsButton').textContent = 'Select all loaded rows';

    var row = document.createElement('tr');
    var shareHead = make('th', 'Share', '');
    shareHead.scope = 'col';
    row.appendChild(shareHead);
    var idHead = make('th', 'Record', '');
    idHead.scope = 'col';
    row.appendChild(idHead);
    state.columns.forEach(function (column) {
      var th = make('th', column, '');
      th.scope = 'col';
      row.appendChild(th);
    });
    head.appendChild(row);

    state.records.forEach(function (record) {
      var tr = document.createElement('tr');
      var selectCell = document.createElement('td');
      var checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'row-share-checkbox';
      checkbox.dataset.recordId = String(record.id);
      checkbox.setAttribute('aria-label', 'Select record ' + record.id + ' for the next AI request');
      checkbox.addEventListener('change', updateSelectedRows);
      selectCell.appendChild(checkbox);
      tr.appendChild(selectCell);
      var idCell = make('th', record.id, '');
      idCell.scope = 'row';
      tr.appendChild(idCell);
      state.columns.forEach(function (column) {
        var td = document.createElement('td');
        if (state.canvasMode) {
          var input = document.createElement('textarea');
          input.rows = 1;
          input.className = 'canvas-cell-input';
          input.value = String(record.fields[column] == null ? '' : record.fields[column]);
          input.maxLength = Sheet.MAX_CELL_CHARS;
          input.setAttribute('aria-label', column + ', record ' + record.id);
          input.addEventListener('focus', function () {
            input._alloEditStartValue = record.fields[column];
          });
          input.addEventListener('input', function () {
            recordCanvasEdit(record, column, input, false);
          });
          input.addEventListener('change', function () {
            recordCanvasEdit(record, column, input, true);
          });
          td.appendChild(input);
        } else {
          text(td, Sheet.formatValue(record.fields[column]));
        }
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });

    var summary = state.records.length + ' loaded rows and ' + state.columns.length + ' columns.';
    text(byId('dataCaption'), (state.canvasMode ? 'Accessible local table. ' : 'Accessible mirror of Grist table ' + currentTableId() + '. ') + summary);
    text(byId('tableSummary'), summary + ' Check only rows you intentionally want to include in a selected-value AI request.');
    byId('selectAllRowsButton').disabled = !state.records.length;
    byId('runAuditButton').disabled = !state.records.length;
    configureAnalysisControls();
    updateConsentVisibility();
  }

  async function loadRecords(options) {
    options = options || {};
    if (state.managedMutationInFlight && options.afterManagedWrite !== true) {
      announceManagedMutationBusy();
      return false;
    }
    var docId = currentDocId();
    var tableId = currentTableId();
    var button = byId('loadRecordsButton');
    if (isBusy(button)) return false;
    if (!docId || !tableId) {
      announce('Choose a Grist table first.');
      return false;
    }
    setBusy(button, true, 'Loading…');
    try {
      var payload = await state.adapter.readRecords(docId, tableId, Sheet.MAX_RECORDS);
      if (state.canvasMode || currentDocId() !== docId || currentTableId() !== tableId) {
        announce('The requested table changed before loading finished. The stale result was discarded.');
        return false;
      }
      state.records = Sheet.normalizeRecords(payload);
      state.columns = Sheet.deriveColumns(state.records);
      state.loadedDocId = docId;
      state.loadedTableId = tableId;
      bumpDataRevision();
      resetLocalReviewState('No AlloSheet changes have been applied to ' + tableId + '.', {
        preserveUndo: options.preserveUndo === true
      });
      renderDataTable();
      setView('table');
      announce('Loaded an accessible mirror with ' + state.records.length + ' rows.');
      return true;
    } catch (error) {
      if (state.canvasMode || currentDocId() !== docId || currentTableId() !== tableId) return false;
      announce('Could not load the table. ' + error.message);
      return false;
    } finally {
      setBusy(button, false, 'Loading…');
    }
  }

  function configuredEditorUrl() {
    var manual = byId('documentUrlInput').value.trim();
    var raw = advancedModeActive() && manual ? manual : String(state.activeEditorUrl || '').trim();
    if (!raw && state.serviceConfig && state.serviceConfig.editorUrl) raw = state.serviceConfig.editorUrl;
    if (!raw && state.serviceConfig && state.serviceConfig.baseUrl && currentDocId()) {
      raw = state.serviceConfig.baseUrl.replace(/\/+$/, '') + '/' + encodeURIComponent(currentDocId());
    }
    if (!raw) throw new Error('The spreadsheet is still preparing.');
    var url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('The workbook address must use HTTP or HTTPS.');
    if (!url.searchParams.has('style') && !url.searchParams.has('embed')) url.searchParams.set('style', 'singlePage');
    url.searchParams.set('themeSyncWithOs', 'false');
    url.searchParams.set('themeAppearance', document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
    return url.toString();
  }

  function focusEditorRecovery() {
    if (advancedModeActive()) byId('documentUrlInput').focus();
    else byId('checkServiceButton').focus();
  }

  function showEditor(options) {
    options = options || {};
    clearAdvancedError();
    try {
      var frame = byId('gristFrame');
      var editorUrl = configuredEditorUrl();
      if (frame.src !== editorUrl) frame.src = editorUrl;
      frame.hidden = false;
      byId('editorEmpty').hidden = true;
      setView('editor');
      if (!options.silent) announce('Spreadsheet editor shown.');
    } catch (error) {
      if (!options.silent) {
        if (advancedModeActive()) setAdvancedError(error.message, byId('documentUrlInput'));
        else announce(error.message);
      }
      focusEditorRecovery();
    }
  }

  function openEditor() {
    clearAdvancedError();
    try {
      var editorUrl = configuredEditorUrl();
      var popup = null;
      try { popup = window.open('', '_blank'); } catch (_) {}
      if (!popup) {
        if (advancedModeActive()) {
          setAdvancedError('The browser blocked the spreadsheet window. Allow pop-ups, then try again.', byId('documentUrlInput'));
        } else {
          announce('The browser blocked the spreadsheet window. Allow pop-ups, then try again.');
        }
        return;
      }
      try {
        popup.opener = null;
        popup.location.replace(editorUrl);
      } catch (navigationError) {
        try { popup.close(); } catch (_) {}
        throw navigationError;
      }
      announce('Opened the spreadsheet in a separate window.');
    } catch (error) {
      if (advancedModeActive()) setAdvancedError(error.message, byId('documentUrlInput'));
      else announce(error.message);
      focusEditorRecovery();
    }
  }

  function setView(view) {
    var views = {
      editor: { button: byId('editorTab'), panel: byId('editorView') },
      table: { button: byId('tableTab'), panel: byId('tableView') },
      audit: { button: byId('auditTab'), panel: byId('auditView') },
      analysis: { button: byId('analysisTab'), panel: byId('analysisView') }
    };
    Object.keys(views).forEach(function (key) {
      var active = key === view;
      views[key].button.setAttribute('aria-selected', active ? 'true' : 'false');
      views[key].button.tabIndex = active ? 0 : -1;
      views[key].panel.hidden = !active;
    });
  }

  function clearValuesConsent() {
    state.valuesConsentBinding = null;
    var consent = byId('valuesConsent');
    if (consent) consent.checked = false;
  }

  function currentValuesConsentBinding() {
    var binding = currentDataBinding();
    binding.selectedIds = Array.from(state.selectedIds).map(String).sort();
    return binding;
  }

  function valuesConsentBindingMatches(binding) {
    if (!dataBindingMatches(binding)) return false;
    var currentIds = Array.from(state.selectedIds).map(String).sort();
    var boundIds = Array.isArray(binding.selectedIds) ? binding.selectedIds : [];
    return currentIds.length === boundIds.length && currentIds.every(function (id, index) {
      return id === boundIds[index];
    });
  }

  function updateConsentVisibility() {
    var valuesMode = selectedScope() === 'selected-values';
    byId('valuesConsentLabel').hidden = !valuesMode;
    if (!valuesMode) {
      clearValuesConsent();
      clearAgentError();
    } else if (byId('valuesConsent').checked && !valuesConsentBindingMatches(state.valuesConsentBinding)) {
      clearValuesConsent();
    }
  }

  function bumpDataRevision() {
    state.dataRevision += 1;
    clearValuesConsent();
    resetAuditResults();
    if (state.analysisModel) {
      resetAnalysisResults('Loaded data changed. Run the local analysis again when ready.');
    }
    if (byId('applyPlanButton')) updateApplyAvailability();
    if (byId('undoButton')) updateUndoAvailability();
  }

  function currentDataBinding() {
    return {
      revision: state.dataRevision,
      canvasMode: state.canvasMode === true,
      workspaceKind: String(state.localWorkspaceKind || ''),
      docId: state.canvasMode ? '' : state.loadedDocId,
      tableId: state.canvasMode ? currentTableId() : state.loadedTableId
    };
  }

  function dataBindingMatches(binding) {
    if (!binding || binding.revision !== state.dataRevision) return false;
    if (!binding.canvasMode && !loadedManagedIdentityMatchesCurrent()) return false;
    var current = currentDataBinding();
    return binding.canvasMode === current.canvasMode
      && binding.workspaceKind === current.workspaceKind
      && binding.docId === current.docId
      && binding.tableId === current.tableId;
  }

  function copyAgentRecords(records, columns) {
    return (records || []).map(function (record) {
      var fields = Object.create(null);
      (columns || []).forEach(function (column) {
        fields[column] = record && record.fields ? record.fields[column] : '';
      });
      return {
        id: record && record.id,
        fields: fields
      };
    });
  }

  function requestAgent(instruction, snapshot, valuesConfirmed) {
    return new Promise(function (resolve, reject) {
      if (!state.bridgeReady || !state.aiAvailable) {
        reject(new Error('AlloFlow AI is not connected.'));
        return;
      }
      var id = 'as-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
      var timer = window.setTimeout(function () {
        if (state.pendingAgent && state.pendingAgent.id === id) state.pendingAgent = null;
        reject(new Error('The assistant timed out. Try a smaller request.'));
      }, 90000);
      state.pendingAgent = { id: id, resolve: resolve, reject: reject, timer: timer };
      if (!postToHost({
        type: 'allosheet-ai-request',
        requestId: id,
        instruction: instruction,
        snapshot: snapshot,
        valuesConfirmed: valuesConfirmed === true
      })) {
        window.clearTimeout(timer);
        state.pendingAgent = null;
        reject(new Error('Could not reach the AlloFlow window.'));
      }
    });
  }

  async function askAgent() {
    var button = byId('askAgentButton');
    if (isBusy(button)) return;
    if (!state.canvasMode && !loadedManagedIdentityMatchesCurrent()) {
      setView('table');
      setAgentError('Load the current workbook table before requesting an AlloSheet plan.', 'request', byId('loadRecordsButton'));
      byId('loadRecordsButton').focus();
      return;
    }
    var instruction = byId('agentInstruction').value.trim();
    if (!instruction) {
      byId('agentInstruction').focus();
      setAgentError('Write an instruction for AlloSheet first.', 'instruction', byId('agentInstruction'));
      return;
    }
    var scope = selectedScope();
    var selectedIds = Array.from(state.selectedIds);
    if (scope === 'selected-values') {
      if (!selectedIds.length) {
        setView('table');
        var firstRow = document.querySelector('.row-share-checkbox');
        (firstRow || byId('dataTableScroll')).focus();
        setAgentError(
          'Select at least one row in the accessible table first.',
          'rows',
          document.querySelector('input[name="agentScope"][value="selected-values"]')
        );
        return;
      }
      if (!byId('valuesConsent').checked || !valuesConsentBindingMatches(state.valuesConsentBinding)) {
        clearValuesConsent();
        byId('valuesConsent').focus();
        setAgentError('Review the currently selected rows and confirm sharing for this request.', 'consent', byId('valuesConsent'));
        return;
      }
    }
    clearAgentError();
    var requestBinding = currentDataBinding();
    var requestColumns = state.columns.slice();
    var requestRecords = copyAgentRecords(state.records, requestColumns);
    var snapshot = Sheet.sanitizeSnapshot({
      scope: scope,
      records: requestRecords,
      columns: requestColumns,
      selectedIds: selectedIds,
      rowCount: requestRecords.length
    });
    var valuesConfirmed = scope === 'selected-values';
    if (valuesConfirmed) clearValuesConsent();
    setBusy(button, true, 'Planning…');
    announce('AlloSheet is preparing a bounded plan.');
    try {
      var response = await requestAgent(instruction, snapshot, valuesConfirmed);
      if (!dataBindingMatches(requestBinding)) {
        throw new Error('The table or its data changed while the assistant was responding. Request a new plan for the current table.');
      }
      var plan = Sheet.parseAgentPlan(response, {
        scope: scope,
        records: requestRecords,
        columns: requestColumns,
        selectedIds: selectedIds
      });
      showPlan(plan, requestBinding);
      announce('AlloSheet plan ready for review. ' + plan.changes.length + ' proposed changes.');
    } catch (error) {
      setAgentError('AlloSheet could not create a plan. ' + error.message, 'request');
    } finally {
      setBusy(button, false, 'Planning…');
      updateAgentAvailability();
    }
  }

  function showPlan(plan, binding) {
    clearAgentError();
    state.plan = plan;
    state.planBinding = binding || currentDataBinding();
    byId('planSection').hidden = false;
    text(byId('planSummary'), plan.summary);
    text(byId('planExplanation'), plan.explanation);
    var warnings = byId('planWarnings');
    clear(warnings);
    plan.warnings.forEach(function (warning) { warnings.appendChild(make('li', warning, '')); });

    var body = byId('planBody');
    clear(body);
    plan.changes.forEach(function (change, index) {
      var tr = document.createElement('tr');
      var useCell = document.createElement('td');
      var checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = true;
      checkbox.className = 'plan-change-checkbox';
      checkbox.dataset.index = String(index);
      checkbox.setAttribute('aria-label', 'Include change ' + (index + 1) + ' for record ' + change.recordId + ', field ' + change.field);
      checkbox.addEventListener('change', updateApplyAvailability);
      useCell.appendChild(checkbox);
      tr.appendChild(useCell);
      tr.appendChild(make('th', change.recordId, ''));
      tr.lastChild.scope = 'row';
      tr.appendChild(make('td', change.field, ''));
      tr.appendChild(make('td', Sheet.formatValue(change.oldValue), ''));
      tr.appendChild(make('td', Sheet.formatValue(change.newValue), ''));
      body.appendChild(tr);
    });
    updateApplyAvailability();
    byId('planTitle').focus();
  }

  function updateApplyAvailability() {
    var checked = document.querySelectorAll('.plan-change-checkbox:checked').length;
    byId('applyPlanButton').disabled = !(state.plan && dataBindingMatches(state.planBinding) && checked && (state.canvasMode || currentDocId()) && currentTableId());
  }

  function discardPlan(options) {
    options = options || {};
    state.plan = null;
    state.planBinding = null;
    byId('planSection').hidden = true;
    clear(byId('planBody'));
    if (options.moveFocus !== false) byId('agentInstruction').focus();
    if (!options.silent) announce('Proposed plan discarded. No workbook changes were made.');
  }

  async function applyPlan() {
    var button = byId('applyPlanButton');
    if (!state.plan || isBusy(button)) return;
    if (!state.canvasMode && state.managedMutationInFlight) {
      announceManagedMutationBusy();
      return;
    }
    if (!dataBindingMatches(state.planBinding)) {
      discardPlan({ moveFocus: false, silent: true });
      setAgentError('The table or its data changed after this plan was created. Request a new plan before applying changes.', 'request');
      announce('The stale plan was discarded. No changes were applied.');
      return;
    }
    var applyBinding = state.planBinding;
    var indexes = Array.from(document.querySelectorAll('.plan-change-checkbox:checked')).map(function (input) {
      return Number(input.dataset.index);
    });
    var changes = indexes.map(function (index) { return state.plan.changes[index]; }).filter(Boolean);
    if (!changes.length) {
      announce('Choose at least one proposed change.');
      return;
    }
    var patch = Sheet.buildPatch(changes);
    var ownsManagedMutation = !applyBinding.canvasMode;
    if (ownsManagedMutation && !beginManagedMutation('apply')) {
      announceManagedMutationBusy();
      return;
    }
    setBusy(button, true, 'Applying…');
    try {
      if (applyBinding.canvasMode) {
        applyCanvasChanges(changes, false);
        state.lastUndo = changes;
        state.lastUndoBinding = currentDataBinding();
        text(byId('undoSummary'), changes.length + ' local cell change' + (changes.length === 1 ? '' : 's') + ' applied. One-step undo is available.');
        byId('undoButton').disabled = false;
        discardPlan({ moveFocus: false, silent: true });
        renderDataTable();
        setView('table');
        byId('dataTableScroll').focus();
        text(byId('canvasFileStatus'), 'Local changes are not saved automatically. Download the current table CSV when you are finished.');
        announce(changes.length + ' reviewed local change' + (changes.length === 1 ? '' : 's') + ' applied.');
      } else {
        await state.adapter.applyUpdates(applyBinding.docId, applyBinding.tableId, patch.records);
        if (!dataBindingMatches(applyBinding)) {
          discardPlan({ moveFocus: false, silent: true });
          var changedWorkspaceMessage = 'The reviewed changes were applied to ' + applyBinding.tableId
            + ', but loaded data changed before refresh. Reload the workbook table list before continuing.';
          invalidateLoadedManagedRecords(changedWorkspaceMessage);
          clearUndoState(changedWorkspaceMessage);
          announce(changedWorkspaceMessage);
          return;
        }
        discardPlan({ moveFocus: false, silent: true });
        var loaded = await loadRecords({ preserveUndo: true, afterManagedWrite: true });
        if (!loaded || currentDocId() !== applyBinding.docId || currentTableId() !== applyBinding.tableId) {
          var refreshFailureMessage = 'The reviewed changes were applied to ' + applyBinding.tableId
            + ', but its refreshed data is unavailable. Reload the workbook table list before continuing.';
          invalidateLoadedManagedRecords(refreshFailureMessage);
          clearUndoState(refreshFailureMessage);
          announce('The reviewed changes were applied to ' + applyBinding.tableId + ', but the current view could not be refreshed. Reload the workbook table list before continuing.');
          return;
        }
        state.lastUndo = changes;
        state.lastUndoBinding = currentDataBinding();
        text(byId('undoSummary'), changes.length + ' cell change' + (changes.length === 1 ? '' : 's') + ' applied. One-step undo is available.');
        byId('undoButton').disabled = false;
        byId('dataTableScroll').focus();
        announce(changes.length + ' reviewed AlloSheet change' + (changes.length === 1 ? '' : 's') + ' applied.');
      }
    } catch (error) {
      announce('No changes were applied. ' + error.message);
    } finally {
      setBusy(button, false, 'Applying…');
      if (ownsManagedMutation) endManagedMutation();
    }
  }

  async function undoLast() {
    var button = byId('undoButton');
    if (!state.lastUndo || isBusy(button)) return;
    if (!state.canvasMode && state.managedMutationInFlight) {
      announceManagedMutationBusy();
      return;
    }
    if (!dataBindingMatches(state.lastUndoBinding)) {
      clearUndoState('Undo is unavailable because the table or its loaded data changed.');
      announce('Undo is unavailable because the table or its loaded data changed.');
      return;
    }
    var undoBinding = state.lastUndoBinding;
    var undoChanges = state.lastUndo.slice();
    var ownsManagedMutation = !undoBinding.canvasMode;
    if (ownsManagedMutation && !beginManagedMutation('undo')) {
      announceManagedMutationBusy();
      return;
    }
    setBusy(button, true, 'Undoing…');
    try {
      if (undoBinding.canvasMode) {
        applyCanvasChanges(undoChanges, true);
        clearUndoState('The last local AlloSheet change was undone.');
        renderDataTable();
        setView('table');
        byId('dataTableScroll').focus();
        text(byId('canvasFileStatus'), 'The last local change was undone. Download the current table CSV when you are finished.');
        announce('The last local AlloSheet change was undone.');
      } else {
        var patch = Sheet.buildUndoPatch(undoChanges);
        await state.adapter.applyUpdates(undoBinding.docId, undoBinding.tableId, patch.records);
        if (!dataBindingMatches(undoBinding)) {
          var changedUndoWorkspaceMessage = 'Undo was applied to ' + undoBinding.tableId
            + ', but loaded data changed before refresh. Reload the workbook table list before continuing.';
          invalidateLoadedManagedRecords(changedUndoWorkspaceMessage);
          clearUndoState(changedUndoWorkspaceMessage);
          announce(changedUndoWorkspaceMessage);
          return;
        }
        clearUndoState('The last AlloSheet change was undone.');
        var loaded = await loadRecords({ preserveUndo: true, afterManagedWrite: true });
        if (loaded) {
          byId('dataTableScroll').focus();
          announce('The last AlloSheet change was undone.');
        } else {
          var undoRefreshFailure = 'The last AlloSheet change was undone, but refreshed data is unavailable. Reload the workbook table list before continuing.';
          invalidateLoadedManagedRecords(undoRefreshFailure);
          clearUndoState(undoRefreshFailure);
          announce(undoRefreshFailure);
        }
      }
    } catch (error) {
      announce('Undo failed. The workbook may have changed since the plan was applied. ' + error.message);
    } finally {
      setBusy(button, false, 'Undoing…');
      if (ownsManagedMutation) endManagedMutation();
      else updateUndoAvailability();
    }
  }

  function runAudit() {
    var audit = Sheet.runLocalAudit(state.records, state.columns);
    var blankTotal = Object.keys(audit.blankCounts).reduce(function (sum, key) { return sum + audit.blankCounts[key]; }, 0);
    var duplicateTotal = Object.keys(audit.duplicateCounts).reduce(function (sum, key) { return sum + audit.duplicateCounts[key]; }, 0);
    var results = byId('auditResults');
    clear(results);
    results.className = 'metric-grid';
    [
      [audit.rowCount, 'Loaded rows'],
      [blankTotal, 'Blank cells'],
      [duplicateTotal, 'Values occurring more than once'],
      [audit.changes.length, 'Whitespace cleanups available']
    ].forEach(function (metric) {
      var card = make('div', null, 'metric-card');
      card.appendChild(make('strong', metric[0], ''));
      card.appendChild(make('span', metric[1], ''));
      results.appendChild(card);
    });
    if (audit.changes.length) {
      var review = make('button', 'Review whitespace cleanup', 'quiet-button');
      review.type = 'button';
      review.addEventListener('click', function () {
        showPlan({
          summary: 'Trim surrounding whitespace from ' + audit.changes.length + ' loaded cell' + (audit.changes.length === 1 ? '' : 's') + '.',
          explanation: 'This deterministic cleanup was produced locally. No workbook values were sent to an AI provider.',
          warnings: ['Review identifiers and intentionally padded text before applying.'],
          changes: audit.changes,
          scope: 'local-audit'
        });
      });
      results.appendChild(review);
    }
    announce('Local audit complete. ' + blankTotal + ' blanks, ' + duplicateTotal + ' repeated values, and ' + audit.changes.length + ' whitespace cleanups found.');
  }

  function restoreSessionFields() {
    try {
      byId('documentUrlInput').value = sessionStorage.getItem('allosheet_document_url') || '';
      byId('documentIdInput').value = sessionStorage.getItem('allosheet_document_id') || '';
    } catch (_) {}
  }

  function saveSessionFields() {
    try {
      sessionStorage.setItem('allosheet_document_url', byId('documentUrlInput').value.trim());
      sessionStorage.setItem('allosheet_document_id', byId('documentIdInput').value.trim());
    } catch (_) {}
  }

  function bindEvents() {
    byId('themeSelect').addEventListener('change', function (event) { setTheme(event.target.value); });
    byId('checkServiceButton').addEventListener('click', checkService);
    byId('loadTablesButton').addEventListener('click', loadTables);
    byId('loadRecordsButton').addEventListener('click', loadRecords);
    byId('showEditorButton').addEventListener('click', showEditor);
    byId('openEditorButton').addEventListener('click', openEditor);
    byId('editorTab').addEventListener('click', function () { setView('editor'); });
    byId('tableTab').addEventListener('click', function () { setView('table'); });
    byId('auditTab').addEventListener('click', function () { setView('audit'); });
    byId('analysisTab').addEventListener('click', function () { setView('analysis'); });
    var workbookTabs = [
      { name: 'editor', button: byId('editorTab') },
      { name: 'table', button: byId('tableTab') },
      { name: 'audit', button: byId('auditTab') },
      { name: 'analysis', button: byId('analysisTab') }
    ];
    workbookTabs.forEach(function (tab, index) {
      tab.button.addEventListener('keydown', function (event) {
        var nextIndex = null;
        if (event.key === 'ArrowRight') nextIndex = (index + 1) % workbookTabs.length;
        if (event.key === 'ArrowLeft') nextIndex = (index - 1 + workbookTabs.length) % workbookTabs.length;
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = workbookTabs.length - 1;
        if (nextIndex === null) return;
        event.preventDefault();
        setView(workbookTabs[nextIndex].name);
        workbookTabs[nextIndex].button.focus();
      });
    });
    document.querySelectorAll('.table-scroll[tabindex]').forEach(function (scroller) {
      scroller.addEventListener('keydown', function (event) {
        if (event.target !== scroller || event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        if (scroller.scrollWidth <= scroller.clientWidth) return;
        event.preventDefault();
        var direction = event.key === 'ArrowRight' ? 1 : -1;
        var step = Math.max(48, Math.round(scroller.clientWidth * 0.25));
        scroller.scrollLeft += direction * step;
      });
    });
    byId('tableSelect').addEventListener('change', function () {
      if (state.canvasMode && state.localTables.length) {
        activateLocalTable(currentTableId(), { focusCell: false });
        updateApplyAvailability();
        return;
      }
      state.loadedDocId = '';
      state.loadedTableId = '';
      bumpDataRevision();
      state.records = [];
      state.columns = [];
      resetLocalReviewState(
        currentTableId()
          ? 'Load ' + currentTableId() + ' before requesting or applying a plan.'
          : 'Choose and load a table before requesting or applying a plan.'
      );
      renderDataTable();
      byId('loadRecordsButton').disabled = !currentTableId();
      updateApplyAvailability();
    });
    byId('selectAllRowsButton').addEventListener('click', function () {
      var shouldSelect = !state.allRowsSelected;
      document.querySelectorAll('.row-share-checkbox').forEach(function (input) { input.checked = shouldSelect; });
      updateSelectedRows();
      announce(shouldSelect ? 'All loaded rows selected.' : 'Row selection cleared.');
    });
    document.querySelectorAll('input[name="agentScope"]').forEach(function (input) {
      input.addEventListener('change', function () {
        clearAgentError();
        updateConsentVisibility();
      });
    });
    byId('agentInstruction').addEventListener('input', function () { clearAgentError('instruction'); });
    byId('valuesConsent').addEventListener('change', function () {
      state.valuesConsentBinding = this.checked ? currentValuesConsentBinding() : null;
      clearAgentError('consent');
    });
    byId('authorizeHostButton').addEventListener('click', authorizeCanvasHostForAi);
    byId('askAgentButton').addEventListener('click', askAgent);
    byId('discardPlanButton').addEventListener('click', discardPlan);
    byId('applyPlanButton').addEventListener('click', applyPlan);
    byId('undoButton').addEventListener('click', undoLast);
    byId('runAuditButton').addEventListener('click', runAudit);
    byId('analysisForm').addEventListener('submit', runLocalAnalysis);
    byId('clearAnalysisButton').addEventListener('click', function () {
      resetAnalysisResults('Analysis results cleared. Workbook data was not changed.');
      byId('analysisGroupColumn').focus();
    });
    byId('downloadAnalysisButton').addEventListener('click', downloadAnalysisCsv);
    ['analysisFilterColumn', 'analysisFilterOperator', 'analysisGroupColumn',
      'analysisMeasureColumn', 'analysisCalculation', 'analysisRepresentation']
      .forEach(function (id) { byId(id).addEventListener('change', markAnalysisStale); });
    byId('analysisFilterValue').addEventListener('input', markAnalysisStale);
    byId('canvasCsvInput').addEventListener('change', importCanvasCsv);
    byId('workspaceFileInput').addEventListener('change', importAlloSheetWorkspace);
    byId('downloadWorkspaceButton').addEventListener('click', downloadAllTableWorkspace);
    byId('showNewSheetButton').addEventListener('click', function () {
      setNewSheetFormOpen(byId('newSheetForm').hidden);
    });
    byId('newSheetForm').addEventListener('submit', createBlankSheet);
    byId('cancelNewSheetButton').addEventListener('click', function () {
      setNewSheetFormOpen(false);
      byId('showNewSheetButton').focus();
    });
    byId('acceptArtifactButton').addEventListener('click', acceptArtifact);
    byId('cancelArtifactButton').addEventListener('click', cancelArtifact);
    byId('artifactReview').addEventListener('keydown', handleArtifactReviewKeydown);
    byId('downloadCanvasCsvButton').addEventListener('click', downloadCanvasCsv);
    byId('advancedConnection').addEventListener('toggle', updateServiceControls);
    byId('documentUrlInput').addEventListener('change', function () {
      clearAdvancedError();
      saveSessionFields();
      updateServiceControls();
    });
    byId('documentIdInput').addEventListener('change', function () {
      clearAdvancedError();
      saveSessionFields();
      updateServiceControls();
      updateApplyAvailability();
    });
    window.addEventListener('message', onHostMessage);
    window.addEventListener('beforeunload', function (event) {
      if (state.canvasMode && refreshLocalDirtyState()) {
        event.preventDefault();
        event.returnValue = '';
        return '';
      }
    });
    window.addEventListener('pagehide', function () {
      if (state.enginePollTimer) window.clearTimeout(state.enginePollTimer);
      postToHost({ type: 'allosheet-closed' });
    });
  }

  applyInitialTheme();
  restoreSessionFields();
  bindEvents();
  updateAgentAvailability();
  updateConsentVisibility();
  beginHandshake();
  if (state.canvasCandidate) prepareCanvasHandshake();
  else checkService();
})();
