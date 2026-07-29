(function (root) {
  'use strict';

  var MAX_RECORDS = 200;
  var MAX_AGENT_ROWS = 40;
  var MAX_COLUMNS = 40;
  var MAX_CHANGES = 100;
  var MAX_CELL_CHARS = 1200;
  var BLOCKED_KEYS = { __proto__: true, constructor: true, prototype: true };

  function clampInt(value, fallback, min, max) {
    var number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min, Math.min(max, Math.floor(number)));
  }

  function safeText(value, max) {
    return String(value == null ? '' : value)
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ')
      .slice(0, max || MAX_CELL_CHARS);
  }

  function isSafeFieldName(value) {
    var text = safeText(value, 160).trim();
    return !!text && !BLOCKED_KEYS[text] && !/[\/\\\u0000-\u001f]/.test(text);
  }

  function isScalar(value) {
    return value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
  }

  function sanitizeScalar(value) {
    if (value === null || typeof value === 'boolean') return value;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    return safeText(value, MAX_CELL_CHARS);
  }

  function normalizeRecords(payload) {
    var source = Array.isArray(payload)
      ? payload
      : (payload && Array.isArray(payload.records) ? payload.records : []);
    return source.slice(0, MAX_RECORDS).map(function (record, index) {
      var candidateId = record && record.id;
      var id = (typeof candidateId === 'number' || typeof candidateId === 'string')
        ? candidateId
        : index + 1;
      var inputFields = record && record.fields && typeof record.fields === 'object'
        ? record.fields
        : {};
      var fields = Object.create(null);
      Object.keys(inputFields).slice(0, MAX_COLUMNS).forEach(function (field) {
        if (!isSafeFieldName(field)) return;
        var value = inputFields[field];
        fields[field] = isScalar(value) ? sanitizeScalar(value) : safeText(JSON.stringify(value), MAX_CELL_CHARS);
      });
      return { id: id, fields: fields };
    });
  }

  function deriveColumns(records) {
    var seen = Object.create(null);
    var columns = [];
    (records || []).forEach(function (record) {
      Object.keys((record && record.fields) || {}).forEach(function (field) {
        if (columns.length >= MAX_COLUMNS || seen[field] || !isSafeFieldName(field)) return;
        seen[field] = true;
        columns.push(field);
      });
    });
    return columns;
  }

  function formatValue(value) {
    if (value === null || value === undefined || value === '') return '';
    if (typeof value === 'boolean') return value ? 'True' : 'False';
    if (typeof value === 'object') {
      try { return safeText(JSON.stringify(value), MAX_CELL_CHARS); } catch (_) { return '[value]'; }
    }
    return safeText(value, MAX_CELL_CHARS);
  }

  function recordMap(records) {
    var map = Object.create(null);
    (records || []).forEach(function (record) { map[String(record.id)] = record; });
    return map;
  }

  function sanitizeSnapshot(options) {
    options = options || {};
    var records = normalizeRecords(options.records || []);
    var columns = Array.isArray(options.columns)
      ? options.columns.filter(isSafeFieldName).slice(0, MAX_COLUMNS)
      : deriveColumns(records);
    var scope = options.scope === 'selected-values' ? 'selected-values' : 'structure-only';
    var snapshot = {
      scope: scope,
      rowCount: clampInt(options.rowCount, records.length, 0, 10000000),
      columns: columns.map(function (field) {
        var examples = records.map(function (record) { return record.fields[field]; })
          .filter(function (value) { return value !== null && value !== undefined && value !== ''; });
        var first = examples[0];
        return {
          id: field,
          type: typeof first === 'number' ? 'number' : typeof first === 'boolean' ? 'boolean' : 'text',
          blankCountInLoadedRows: records.reduce(function (count, record) {
            var value = record.fields[field];
            return count + (value === null || value === undefined || value === '' ? 1 : 0);
          }, 0)
        };
      })
    };
    if (scope === 'structure-only') return snapshot;

    var selected = Object.create(null);
    (options.selectedIds || []).slice(0, MAX_AGENT_ROWS).forEach(function (id) {
      selected[String(id)] = true;
    });
    snapshot.records = records.filter(function (record) { return selected[String(record.id)]; })
      .slice(0, MAX_AGENT_ROWS)
      .map(function (record) {
        var fields = Object.create(null);
        columns.forEach(function (field) {
          fields[field] = sanitizeScalar(record.fields[field]);
        });
        return { id: record.id, fields: fields };
      });
    return snapshot;
  }

  function parseJsonObject(value) {
    if (value && typeof value === 'object') return value;
    var text = safeText(value, 100000)
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();
    try { return JSON.parse(text); } catch (_) {}
    var start = text.indexOf('{');
    var end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try { return JSON.parse(text.slice(start, end + 1)); } catch (_) {}
    }
    throw new Error('The assistant response was not valid JSON.');
  }

  function parseAgentPlan(value, context) {
    context = context || {};
    var parsed = parseJsonObject(value);
    var records = normalizeRecords(context.records || []);
    var byId = recordMap(records);
    var columns = Array.isArray(context.columns)
      ? context.columns.filter(isSafeFieldName).slice(0, MAX_COLUMNS)
      : deriveColumns(records);
    var allowedFields = Object.create(null);
    columns.forEach(function (field) { allowedFields[field] = true; });
    var scope = context.scope === 'selected-values' ? 'selected-values' : 'structure-only';
    var selected = Object.create(null);
    (context.selectedIds || []).forEach(function (id) { selected[String(id)] = true; });
    var changes = [];

    if (scope === 'selected-values' && Array.isArray(parsed.changes)) {
      parsed.changes.slice(0, MAX_CHANGES).forEach(function (change) {
        if (!change || !allowedFields[change.field]) return;
        var key = String(change.recordId);
        var record = byId[key];
        if (!record || !selected[key] || !isScalar(change.newValue)) return;
        var next = sanitizeScalar(change.newValue);
        var previous = record.fields[change.field];
        if (JSON.stringify(previous) === JSON.stringify(next)) return;
        changes.push({
          recordId: record.id,
          field: change.field,
          oldValue: previous === undefined ? null : previous,
          newValue: next,
          reason: safeText(change.reason || '', 300)
        });
      });
    }

    return {
      summary: safeText(parsed.summary || parsed.answer || 'Review the proposed plan.', 1200),
      explanation: safeText(parsed.explanation || parsed.rationale || '', 2400),
      warnings: (Array.isArray(parsed.warnings) ? parsed.warnings : [])
        .slice(0, 12)
        .map(function (warning) { return safeText(warning, 500); })
        .filter(Boolean),
      changes: changes,
      scope: scope
    };
  }

  function buildPatch(changes) {
    var grouped = Object.create(null);
    (changes || []).slice(0, MAX_CHANGES).forEach(function (change) {
      if (!change || !isSafeFieldName(change.field) || !isScalar(change.newValue)) return;
      var key = String(change.recordId);
      if (!grouped[key]) grouped[key] = { id: change.recordId, fields: Object.create(null) };
      grouped[key].fields[change.field] = sanitizeScalar(change.newValue);
    });
    return { records: Object.keys(grouped).map(function (key) { return grouped[key]; }) };
  }

  function buildUndoPatch(changes) {
    return buildPatch((changes || []).map(function (change) {
      return {
        recordId: change.recordId,
        field: change.field,
        newValue: change.oldValue
      };
    }));
  }

  function runLocalAudit(inputRecords, inputColumns) {
    var records = normalizeRecords(inputRecords || []);
    var columns = Array.isArray(inputColumns) ? inputColumns.filter(isSafeFieldName) : deriveColumns(records);
    var blankCounts = Object.create(null);
    var duplicateCounts = Object.create(null);
    var trimChanges = [];

    columns.forEach(function (field) {
      blankCounts[field] = 0;
      var seen = Object.create(null);
      records.forEach(function (record) {
        var value = record.fields[field];
        if (value === null || value === undefined || value === '') {
          blankCounts[field] += 1;
          return;
        }
        var display = formatValue(value);
        var duplicateKey = display.toLocaleLowerCase();
        seen[duplicateKey] = (seen[duplicateKey] || 0) + 1;
        if (typeof value === 'string' && value !== value.trim() && trimChanges.length < MAX_CHANGES) {
          trimChanges.push({
            recordId: record.id,
            field: field,
            oldValue: value,
            newValue: value.trim(),
            reason: 'Remove leading or trailing whitespace.'
          });
        }
      });
      duplicateCounts[field] = Object.keys(seen).reduce(function (count, key) {
        return count + (seen[key] > 1 ? seen[key] : 0);
      }, 0);
    });

    return {
      rowCount: records.length,
      columnCount: columns.length,
      blankCounts: blankCounts,
      duplicateCounts: duplicateCounts,
      changes: trimChanges
    };
  }

  function GristRestAdapter(options) {
    options = options || {};
    this.apiBase = safeText(options.apiBase || '', 500).replace(/\/+$/, '');
    this.fetchImpl = options.fetchImpl || (root && root.fetch ? root.fetch.bind(root) : null);
  }

  GristRestAdapter.prototype._request = async function (path, options) {
    if (!this.fetchImpl) throw new Error('This browser does not support network requests.');
    var response = await this.fetchImpl(this.apiBase + path, options || {});
    var payload = null;
    try { payload = await response.json(); } catch (_) {}
    if (!response.ok) throw new Error(safeText(payload && payload.error || ('Request failed with HTTP ' + response.status), 500));
    return payload || {};
  };

  GristRestAdapter.prototype.getConfig = function () {
    return this._request('/api/allosheet/config', { headers: { Accept: 'application/json' } });
  };

  GristRestAdapter.prototype.operate = function (operation) {
    return this._request('/api/allosheet/grist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(operation || {})
    });
  };

  GristRestAdapter.prototype.status = function () {
    return this.operate({ operation: 'status' });
  };

  GristRestAdapter.prototype.listTables = function (docId) {
    return this.operate({ operation: 'listTables', docId: docId });
  };

  GristRestAdapter.prototype.readRecords = async function (docId, tableId, limit) {
    var payload = await this.operate({
      operation: 'readRecords',
      docId: docId,
      tableId: tableId,
      limit: clampInt(limit, MAX_RECORDS, 1, MAX_RECORDS)
    });
    payload.records = normalizeRecords(payload);
    return payload;
  };

  GristRestAdapter.prototype.applyUpdates = function (docId, tableId, records) {
    return this.operate({
      operation: 'applyUpdates',
      docId: docId,
      tableId: tableId,
      records: records
    });
  };

  var api = {
    MAX_RECORDS: MAX_RECORDS,
    MAX_AGENT_ROWS: MAX_AGENT_ROWS,
    MAX_COLUMNS: MAX_COLUMNS,
    MAX_CHANGES: MAX_CHANGES,
    MAX_CELL_CHARS: MAX_CELL_CHARS,
    safeText: safeText,
    isSafeFieldName: isSafeFieldName,
    normalizeRecords: normalizeRecords,
    deriveColumns: deriveColumns,
    formatValue: formatValue,
    sanitizeSnapshot: sanitizeSnapshot,
    parseAgentPlan: parseAgentPlan,
    buildPatch: buildPatch,
    buildUndoPatch: buildUndoPatch,
    runLocalAudit: runLocalAudit,
    GristRestAdapter: GristRestAdapter
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.AlloSheetAdapter = api;
})(typeof window !== 'undefined' ? window : globalThis);
