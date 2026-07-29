(function () {
  'use strict';

  var Sheet = window.AlloSheetAdapter;
  if (!Sheet) throw new Error('AlloSheet adapter did not load.');

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

  function readBridgeBootstrap() {
    var result = { bridgeToken: '', hostOrigin: '' };
    try {
      var params = new URLSearchParams(String(window.location.hash || '').replace(/^#/, ''));
      var token = String(params.get('bridgeToken') || '');
      var rawOrigin = String(params.get('hostOrigin') || '');
      var parsedOrigin = rawOrigin ? new URL(rawOrigin).origin : '';
      if (/^[a-f0-9]{32}$/i.test(token) && /^https?:\/\//i.test(parsedOrigin)) {
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
    connectedHost: '',
    records: [],
    columns: [],
    selectedIds: new Set(),
    plan: null,
    lastUndo: null,
    serviceConfig: null,
    canvasCandidate: isCanvasOpenerOrigin(bridgeBootstrap.hostOrigin),
    canvasValidated: false,
    canvasMode: false,
    canvasFileName: '',
    managedEngine: {},
    activeEditorUrl: '',
    activeDocId: '',
    serviceReady: false,
    enginePollTimer: null,
    enginePollCount: 0,
    pendingAgent: null,
    allRowsSelected: false
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

  function updateServiceControls() {
    var hasEditor = false;
    try { hasEditor = !!configuredEditorUrl(); } catch (_) {}
    byId('showEditorButton').disabled = !hasEditor;
    byId('openEditorButton').disabled = !hasEditor;
    byId('loadTablesButton').disabled = !(state.serviceReady && currentDocId());
  }

  function renderManagedStatus() {
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

  function applyInitialTheme() {
    var params = new URLSearchParams(window.location.search);
    var requested = params.get('theme');
    var theme = requested === 'light' || requested === 'contrast' ? requested : 'dark';
    try {
      var stored = sessionStorage.getItem('allosheet_theme');
      if (stored === 'light' || stored === 'dark' || stored === 'contrast') theme = stored;
    } catch (_) {}
    document.documentElement.dataset.theme = theme;
    byId('themeButton').setAttribute('aria-pressed', theme === 'contrast' ? 'true' : 'false');
  }

  function toggleContrast() {
    var current = document.documentElement.dataset.theme || 'dark';
    var fallback = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    var next = current === 'contrast' ? fallback : 'contrast';
    document.documentElement.dataset.theme = next;
    byId('themeButton').setAttribute('aria-pressed', next === 'contrast' ? 'true' : 'false');
    try { sessionStorage.setItem('allosheet_theme', next); } catch (_) {}
    announce(next === 'contrast' ? 'High contrast enabled.' : 'High contrast disabled.');
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

  function updateAgentAvailability() {
    var hint = byId('agentConnectionHint');
    var ask = byId('askAgentButton');
    var hostDisclosure = state.canvasMode && state.connectedHost
      ? ' Connected host: ' + state.connectedHost + '.'
      : '';
    ask.disabled = !(state.bridgeReady && state.aiAvailable);
    if (!state.bridgeReady) {
      text(hint, 'Reconnect this window to AlloFlow to use the assistant.');
      setBadge(byId('bridgeBadge'), 'AlloFlow disconnected', 'warn');
    } else if (!state.aiAvailable) {
      text(hint, 'AlloFlow is connected, but no AI provider is configured. Local audit remains available.');
      setBadge(byId('bridgeBadge'), 'Connected · AI off', 'neutral');
    } else {
      text(hint, 'AI requests use the provider configured in AlloFlow. All changes require review.' + hostDisclosure);
      setBadge(byId('bridgeBadge'), 'Connected · AI ready', 'good');
    }
  }

  function onHostMessage(event) {
    if (!window.opener || event.source !== window.opener) return;
    var data = event && event.data;
    if (!data || typeof data !== 'object') return;
    if (!state.hostOrigin || event.origin !== state.hostOrigin) return;
    if (data.version !== 1 || !state.bridgeToken || data.bridgeToken !== state.bridgeToken) return;
    if (data.type === 'allosheet-ready') {
      state.bridgeReady = true;
      state.aiAvailable = data.ai === true;
      if (state.canvasCandidate && isCanvasOpenerOrigin(event.origin)) {
        try { state.connectedHost = new URL(event.origin).hostname; } catch (_) {}
        enableCanvasMode(event.origin);
      }
      updateAgentAvailability();
      announce('AlloSheet connected to AlloFlow.');
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
    text(byId('connectionDescription'), 'This popup uses a bounded, in-browser CSV workspace because Gemini Canvas cannot start desktop software.');
    setBadge(byId('serviceBadge'), 'Canvas browser mode', 'good');
    text(byId('serviceDetail'), 'Connected to ' + state.connectedHost + '. Import a CSV to begin. Nothing is sent to a spreadsheet server.');
    text(
      byId('valuesConsentText'),
      'I reviewed the selected rows and approve sending those values through the AlloFlow AI provider connected at ' + state.connectedHost + ' for this request.'
    );
    text(byId('editorEmptyTitle'), 'Import a CSV to begin');
    text(byId('editorEmptyDetail'), 'Direct editing, local audit, reviewed AI plans, undo, and a safe CSV download are available here. Use Desktop or a district-hosted service for .xlsx and full Grist.');
    updateServiceControls();
    announce('Canvas browser mode ready. Import a CSV to begin.');
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

  async function importCanvasCsv(event) {
    if (!state.canvasMode) return;
    var file = event && event.target && event.target.files && event.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      text(byId('canvasFileStatus'), 'That CSV is larger than 2 MB. Choose a smaller file or use AlloFlow Desktop.');
      announce('CSV not imported because it is larger than 2 MB.');
      return;
    }
    byId('canvasFallback').setAttribute('aria-busy', 'true');
    text(byId('canvasFileStatus'), 'Reading the CSV locally.');
    try {
      var parsedCsv = parseCsvRows(await file.text());
      var rows = parsedCsv.rows;
      if (!rows.length) throw new Error('The CSV is empty.');
      var columns = canvasColumns(rows[0]);
      if (!columns.length) throw new Error('The CSV does not have a header row.');
      var inputRows = rows.slice(1);
      state.columns = columns;
      state.records = canvasRecords(inputRows, columns);
      state.canvasFileName = Sheet.safeText(file.name || 'allosheet.csv', 180);
      state.selectedIds.clear();
      state.plan = null;
      state.lastUndo = null;
      state.serviceReady = true;
      byId('planSection').hidden = true;
      byId('undoButton').disabled = true;
      text(byId('undoSummary'), 'No AlloSheet changes have been applied to this imported CSV.');
      var tableSelect = byId('tableSelect');
      clear(tableSelect);
      tableSelect.appendChild(new Option('Imported CSV', 'canvas_csv'));
      tableSelect.value = 'canvas_csv';
      tableSelect.disabled = false;
      byId('downloadCanvasCsvButton').disabled = false;
      renderDataTable();
      setView('table');
      setBadge(byId('serviceBadge'), 'CSV ready', 'good');
      text(byId('serviceDetail'), 'The imported CSV is open in this browser workspace.');
      var message = state.records.length + ' row' + (state.records.length === 1 ? '' : 's') + ' and ' + state.columns.length + ' column' + (state.columns.length === 1 ? '' : 's') + ' loaded locally.';
      text(byId('canvasFileStatus'), message + ' Edit cells directly or use the audit and assistant, then download a reviewed CSV.');
      announce(message);
    } catch (error) {
      text(byId('canvasFileStatus'), 'Could not import this CSV: ' + String(error && error.message || error));
      announce('CSV import failed.');
    } finally {
      byId('canvasFallback').removeAttribute('aria-busy');
      if (event && event.target) event.target.value = '';
    }
  }

  function applyCanvasChanges(changes, useOldValue) {
    var records = Object.create(null);
    state.records.forEach(function (record) { records[String(record.id)] = record; });
    (changes || []).forEach(function (change) {
      var record = records[String(change.recordId)];
      if (!record || state.columns.indexOf(change.field) < 0) return;
      record.fields[change.field] = useOldValue ? change.oldValue : change.newValue;
    });
  }

  function recordCanvasEdit(record, field, input) {
    var previous = record.fields[field];
    var next = Sheet.safeText(input.value, Sheet.MAX_CELL_CHARS);
    input.value = next;
    if (String(previous == null ? '' : previous) === next) return;
    record.fields[field] = next;
    state.lastUndo = [{
      recordId: record.id,
      field: field,
      oldValue: previous,
      newValue: next,
      reason: 'Direct browser edit.'
    }];
    byId('undoButton').disabled = false;
    text(byId('undoSummary'), 'Direct edit applied to record ' + record.id + ', ' + field + '. One-step undo is available.');
    text(byId('canvasFileStatus'), 'Local changes are not saved automatically. Download the reviewed CSV when you are finished.');
    announce('Cell updated locally. One-step undo is available.');
  }

  function formulaHardenedCsvCell(value) {
    var raw = Sheet.formatValue(value);
    var trimmed = raw.replace(/^\s+/, '');
    var numeric = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(trimmed);
    if (!numeric && /^[=+@-]/.test(trimmed)) raw = "'" + raw;
    return '"' + raw.replace(/"/g, '""') + '"';
  }

  function canvasCsvText() {
    var lines = [state.columns.map(formulaHardenedCsvCell).join(',')];
    state.records.forEach(function (record) {
      lines.push(state.columns.map(function (column) {
        return formulaHardenedCsvCell(record.fields[column]);
      }).join(','));
    });
    return '\uFEFF' + lines.join('\r\n');
  }

  function downloadCanvasCsv() {
    if (!state.canvasMode || !state.columns.length) return;
    var original = String(state.canvasFileName || 'allosheet.csv').replace(/\.csv$/i, '');
    var base = original.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^\.+|\.+$/g, '').slice(0, 100) || 'allosheet';
    var blob = new Blob([canvasCsvText()], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = base + '_reviewed.csv';
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    text(byId('canvasFileStatus'), 'Reviewed CSV downloaded. Formula-like text was prefixed to reduce spreadsheet formula-injection risk.');
    announce('Reviewed CSV downloaded.');
  }

  async function refreshManagedConfig() {
    var config = await state.adapter.getConfig();
    state.serviceConfig = config;
    mergeManagedEngine(config);
    return config;
  }

  async function finishManagedEngine() {
    if (state.enginePollTimer) {
      window.clearTimeout(state.enginePollTimer);
      state.enginePollTimer = null;
    }
    try { await refreshManagedConfig(); } catch (_) {}
    state.serviceReady = true;
    renderManagedStatus();
    if (state.activeEditorUrl) showEditor({ silent: true });
    announce('Your local spreadsheet is ready.');
    return true;
  }

  function scheduleEnginePoll() {
    if (state.enginePollTimer) window.clearTimeout(state.enginePollTimer);
    state.enginePollTimer = window.setTimeout(async function poll() {
      state.enginePollTimer = null;
      try {
        var snapshot = await runtimeRequest('/api/allosheet/engine/status', {
          headers: { Accept: 'application/json' }
        });
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
    state.serviceReady = false;
    setBadge(byId('serviceBadge'), 'Starting', 'neutral');
    text(byId('serviceDetail'), 'Starting your local spreadsheet. The first launch may include a one-time setup.');
    state.enginePollCount = 0;
    scheduleEnginePoll();
    var snapshot = await runtimeRequest('/api/allosheet/engine/start', {
      method: 'POST',
      headers: { Accept: 'application/json' }
    });
    mergeManagedEngine(snapshot);
    renderManagedStatus();
    if (engineIsReady()) return finishManagedEngine();
    if (!state.enginePollTimer) scheduleEnginePoll();
    return false;
  }

  async function useConfiguredServer(config) {
    if (!config || !config.configured) return false;
    var status = await state.adapter.status();
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
      var snapshot;
      try {
        snapshot = await runtimeRequest('/api/allosheet/engine/status', {
          headers: { Accept: 'application/json' }
        });
      } catch (statusError) {
        if (statusError.status === 404 && await useConfiguredServer(config)) return true;
        throw statusError;
      }
      mergeManagedEngine(snapshot);
      renderManagedStatus();
      if (engineIsReady()) return finishManagedEngine();
      return await startManagedEngine();
    } catch (error) {
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

  async function loadTables() {
    var docId = currentDocId();
    var button = byId('loadTablesButton');
    if (isBusy(button)) return;
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
    } catch (error) {
      announce('Could not load Grist tables. ' + error.message);
      setBadge(byId('serviceBadge'), 'Table read failed', 'danger');
      text(byId('serviceDetail'), error.message);
    } finally {
      setBusy(button, false, 'Loading…');
    }
  }

  function updateSelectedRows() {
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
    state.allRowsSelected = false;

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
          input.addEventListener('change', function () { recordCanvasEdit(record, column, input); });
          td.appendChild(input);
        } else {
          text(td, Sheet.formatValue(record.fields[column]));
        }
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });

    var summary = state.records.length + ' loaded rows and ' + state.columns.length + ' columns.';
    text(byId('dataCaption'), (state.canvasMode ? 'Accessible local CSV table. ' : 'Accessible mirror of Grist table ' + currentTableId() + '. ') + summary);
    text(byId('tableSummary'), summary + ' Check only rows you intentionally want to include in a selected-value AI request.');
    byId('selectAllRowsButton').disabled = !state.records.length;
    byId('runAuditButton').disabled = !state.records.length;
    updateConsentVisibility();
  }

  async function loadRecords() {
    var docId = currentDocId();
    var tableId = currentTableId();
    var button = byId('loadRecordsButton');
    if (isBusy(button)) return;
    if (!docId || !tableId) {
      announce('Choose a Grist table first.');
      return;
    }
    setBusy(button, true, 'Loading…');
    try {
      var payload = await state.adapter.readRecords(docId, tableId, Sheet.MAX_RECORDS);
      state.records = Sheet.normalizeRecords(payload);
      state.columns = Sheet.deriveColumns(state.records);
      renderDataTable();
      setView('table');
      announce('Loaded an accessible mirror with ' + state.records.length + ' rows.');
    } catch (error) {
      announce('Could not load the table. ' + error.message);
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
      audit: { button: byId('auditTab'), panel: byId('auditView') }
    };
    Object.keys(views).forEach(function (key) {
      var active = key === view;
      views[key].button.setAttribute('aria-selected', active ? 'true' : 'false');
      views[key].button.tabIndex = active ? 0 : -1;
      views[key].panel.hidden = !active;
    });
  }

  function updateConsentVisibility() {
    var valuesMode = selectedScope() === 'selected-values';
    byId('valuesConsentLabel').hidden = !valuesMode;
    if (!valuesMode) {
      byId('valuesConsent').checked = false;
      clearAgentError();
    }
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
      if (!byId('valuesConsent').checked) {
        byId('valuesConsent').focus();
        setAgentError('Review and confirm the selected-value sharing statement first.', 'consent', byId('valuesConsent'));
        return;
      }
    }
    clearAgentError();
    var snapshot = Sheet.sanitizeSnapshot({
      scope: scope,
      records: state.records,
      columns: state.columns,
      selectedIds: selectedIds,
      rowCount: state.records.length
    });
    setBusy(button, true, 'Planning…');
    announce('AlloSheet is preparing a bounded plan.');
    try {
      var response = await requestAgent(instruction, snapshot, scope === 'selected-values');
      var plan = Sheet.parseAgentPlan(response, {
        scope: scope,
        records: state.records,
        columns: state.columns,
        selectedIds: selectedIds
      });
      showPlan(plan);
      announce('AlloSheet plan ready for review. ' + plan.changes.length + ' proposed changes.');
    } catch (error) {
      setAgentError('AlloSheet could not create a plan. ' + error.message, 'request');
    } finally {
      setBusy(button, false, 'Planning…');
      updateAgentAvailability();
    }
  }

  function showPlan(plan) {
    clearAgentError();
    state.plan = plan;
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
    byId('applyPlanButton').disabled = !(state.plan && checked && (state.canvasMode || currentDocId()) && currentTableId());
  }

  function discardPlan(options) {
    options = options || {};
    state.plan = null;
    byId('planSection').hidden = true;
    clear(byId('planBody'));
    if (options.moveFocus !== false) byId('agentInstruction').focus();
    if (!options.silent) announce('Proposed plan discarded. No workbook changes were made.');
  }

  async function applyPlan() {
    var button = byId('applyPlanButton');
    if (!state.plan || isBusy(button)) return;
    var indexes = Array.from(document.querySelectorAll('.plan-change-checkbox:checked')).map(function (input) {
      return Number(input.dataset.index);
    });
    var changes = indexes.map(function (index) { return state.plan.changes[index]; }).filter(Boolean);
    if (!changes.length) {
      announce('Choose at least one proposed change.');
      return;
    }
    var patch = Sheet.buildPatch(changes);
    setBusy(button, true, 'Applying…');
    try {
      if (state.canvasMode) {
        applyCanvasChanges(changes, false);
        state.lastUndo = changes;
        text(byId('undoSummary'), changes.length + ' local cell change' + (changes.length === 1 ? '' : 's') + ' applied. One-step undo is available.');
        byId('undoButton').disabled = false;
        discardPlan({ moveFocus: false, silent: true });
        renderDataTable();
        setView('table');
        byId('dataTableScroll').focus();
        text(byId('canvasFileStatus'), 'Local changes are not saved automatically. Download the reviewed CSV when you are finished.');
        announce(changes.length + ' reviewed local change' + (changes.length === 1 ? '' : 's') + ' applied.');
      } else {
        await state.adapter.applyUpdates(currentDocId(), currentTableId(), patch.records);
        state.lastUndo = changes;
        text(byId('undoSummary'), changes.length + ' cell change' + (changes.length === 1 ? '' : 's') + ' applied. One-step undo is available.');
        byId('undoButton').disabled = false;
        discardPlan({ moveFocus: false, silent: true });
        await loadRecords();
        byId('dataTableScroll').focus();
        announce(changes.length + ' reviewed AlloSheet change' + (changes.length === 1 ? '' : 's') + ' applied.');
      }
    } catch (error) {
      announce('No changes were applied. ' + error.message);
    } finally {
      setBusy(button, false, 'Applying…');
    }
  }

  async function undoLast() {
    var button = byId('undoButton');
    if (!state.lastUndo || isBusy(button)) return;
    setBusy(button, true, 'Undoing…');
    try {
      if (state.canvasMode) {
        applyCanvasChanges(state.lastUndo, true);
        state.lastUndo = null;
        button.disabled = true;
        text(byId('undoSummary'), 'The last local AlloSheet change was undone.');
        renderDataTable();
        setView('table');
        byId('dataTableScroll').focus();
        text(byId('canvasFileStatus'), 'The last local change was undone. Download the reviewed CSV when you are finished.');
        announce('The last local AlloSheet change was undone.');
      } else {
        var patch = Sheet.buildUndoPatch(state.lastUndo);
        await state.adapter.applyUpdates(currentDocId(), currentTableId(), patch.records);
        state.lastUndo = null;
        button.disabled = true;
        text(byId('undoSummary'), 'The last AlloSheet change was undone.');
        await loadRecords();
        byId('dataTableScroll').focus();
        announce('The last AlloSheet change was undone.');
      }
    } catch (error) {
      announce('Undo failed. The workbook may have changed since the plan was applied. ' + error.message);
    } finally {
      setBusy(button, false, 'Undoing…');
      button.disabled = !state.lastUndo;
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
    byId('themeButton').addEventListener('click', toggleContrast);
    byId('checkServiceButton').addEventListener('click', checkService);
    byId('loadTablesButton').addEventListener('click', loadTables);
    byId('loadRecordsButton').addEventListener('click', loadRecords);
    byId('showEditorButton').addEventListener('click', showEditor);
    byId('openEditorButton').addEventListener('click', openEditor);
    byId('editorTab').addEventListener('click', function () { setView('editor'); });
    byId('tableTab').addEventListener('click', function () { setView('table'); });
    byId('auditTab').addEventListener('click', function () { setView('audit'); });
    var workbookTabs = [
      { name: 'editor', button: byId('editorTab') },
      { name: 'table', button: byId('tableTab') },
      { name: 'audit', button: byId('auditTab') }
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
    byId('valuesConsent').addEventListener('change', function () { clearAgentError('consent'); });
    byId('askAgentButton').addEventListener('click', askAgent);
    byId('discardPlanButton').addEventListener('click', discardPlan);
    byId('applyPlanButton').addEventListener('click', applyPlan);
    byId('undoButton').addEventListener('click', undoLast);
    byId('runAuditButton').addEventListener('click', runAudit);
    byId('canvasCsvInput').addEventListener('change', importCanvasCsv);
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
    window.addEventListener('beforeunload', function () {
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
