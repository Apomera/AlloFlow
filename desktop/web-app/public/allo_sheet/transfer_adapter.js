(function () {
  'use strict';

  if (window.AlloSheetTransferAdapter) {
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.AlloSheetTransferAdapter = window.AlloSheetTransferAdapter;
    return;
  }

  var KIND = 'alloflow.tabular.v1';
  var LIMITS = Object.freeze({
    maxEnvelopeBytes: 2 * 1024 * 1024,
    maxTables: 5,
    maxColumns: 40,
    maxRows: 200,
    maxCellChars: 1200
  });
  var BLOCKED_KEYS = { __proto__: true, constructor: true, prototype: true };
  var COLUMN_TYPES = {
    text: true,
    number: true,
    boolean: true,
    date: true,
    datetime: true,
    duration: true,
    category: true
  };

  function fail(message) {
    var error = new Error(message);
    error.code = 'allosheet-transfer-adapter-invalid';
    throw error;
  }

  function isPlainObject(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    var prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  function safeText(value, max) {
    return String(value == null ? '' : value)
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ')
      .slice(0, max || LIMITS.maxCellChars);
  }

  function safeKey(value, label, max) {
    var original = String(value == null ? '' : value);
    var cleaned = safeText(original, max || 160).trim();
    if (
      !cleaned
      || cleaned !== original.trim()
      || BLOCKED_KEYS[cleaned]
      || /[\/\\\u0000-\u001f\u007f]/.test(cleaned)
    ) {
      fail((label || 'Identifier') + ' is empty or unsafe.');
    }
    return cleaned;
  }

  function safeNumber(value) {
    if (value === '' || value === null || value === undefined) return null;
    var parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function safeScalar(value) {
    if (value === null || typeof value === 'boolean') return value;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (value === undefined) return '';
    if (typeof value === 'string') {
      if (
        value.length > LIMITS.maxCellChars
        || safeText(value, LIMITS.maxCellChars) !== value
      ) {
        fail('A transferred cell contains unsupported control text or exceeds 1,200 characters.');
      }
      return value;
    }
    fail('Transferred cells may contain only text, numbers, booleans, or empty values.');
  }

  function safeMetadata(input, depth) {
    var result = {};
    if (!isPlainObject(input)) return result;
    Object.keys(input).slice(0, 24).forEach(function (rawKey) {
      if (BLOCKED_KEYS[rawKey]) return;
      var key = safeText(rawKey, 80).trim();
      if (!key || key !== rawKey.trim() || BLOCKED_KEYS[key]) return;
      var value = input[rawKey];
      if (value === null || typeof value === 'boolean') {
        result[key] = value;
      } else if (typeof value === 'number' && Number.isFinite(value)) {
        result[key] = value;
      } else if (typeof value === 'string') {
        result[key] = safeText(value, 500);
      } else if (Array.isArray(value)) {
        result[key] = value.slice(0, 24).reduce(function (items, item) {
          if (item === null || typeof item === 'boolean') items.push(item);
          else if (typeof item === 'number' && Number.isFinite(item)) items.push(item);
          else if (typeof item === 'string') items.push(safeText(item, 160));
          return items;
        }, []);
      } else if ((depth || 0) < 1 && isPlainObject(value)) {
        result[key] = safeMetadata(value, (depth || 0) + 1);
      }
    });
    return result;
  }

  function byteLength(value) {
    var text = typeof value === 'string' ? value : JSON.stringify(value);
    try {
      if (typeof TextEncoder === 'function') return new TextEncoder().encode(text).length;
    } catch (_) {}
    try {
      return unescape(encodeURIComponent(text)).length;
    } catch (_) {
      return text.length;
    }
  }

  function column(key, label, type) {
    var normalizedType = safeText(type || 'text', 20).toLowerCase();
    if (!COLUMN_TYPES[normalizedType]) normalizedType = 'text';
    return {
      key: safeKey(key, 'Column identifier', 160),
      label: safeKey(label || key, 'Column label', 160),
      type: normalizedType
    };
  }

  function table(config) {
    config = config || {};
    var tableId = safeKey(config.id, 'Table identifier', 80);
    var sourceColumns = Array.isArray(config.columns) ? config.columns : [];
    if (!sourceColumns.length || sourceColumns.length > LIMITS.maxColumns) {
      fail('Table ' + tableId + ' must contain between 1 and ' + LIMITS.maxColumns + ' columns.');
    }
    var seenKeys = Object.create(null);
    var seenLabels = Object.create(null);
    var columns = sourceColumns.map(function (candidate) {
      var normalized = column(candidate && candidate.key, candidate && candidate.label, candidate && candidate.type);
      if (seenKeys[normalized.key] || seenLabels[normalized.label]) {
        fail('Table ' + tableId + ' contains a duplicate column identifier or label.');
      }
      seenKeys[normalized.key] = true;
      seenLabels[normalized.label] = true;
      return normalized;
    });

    var sourceRows = Array.isArray(config.rows) ? config.rows : [];
    var limitedRows = sourceRows.slice(0, LIMITS.maxRows);
    var seenRows = Object.create(null);
    var rows = limitedRows.map(function (candidate, index) {
      var originalId = candidate && candidate.id != null ? String(candidate.id) : tableId + '-' + (index + 1);
      var rowId = safeText(originalId, 120);
      if (!rowId || rowId !== originalId || rowId.trim() !== rowId || seenRows[rowId]) {
        fail('Table ' + tableId + ' contains an empty, unsafe, oversized, or duplicate row identifier.');
      }
      seenRows[rowId] = true;
      var sourceValues = candidate && isPlainObject(candidate.values) ? candidate.values : {};
      var values = {};
      columns.forEach(function (field) {
        values[field.key] = Object.prototype.hasOwnProperty.call(sourceValues, field.key)
          ? safeScalar(sourceValues[field.key])
          : '';
      });
      return { id: rowId, values: values };
    });
    var declaredSourceCount = Math.max(
      sourceRows.length,
      Math.floor(safeNumber(config.sourceRowCount) || sourceRows.length)
    );
    declaredSourceCount = Math.min(1000000, declaredSourceCount);
    return {
      id: tableId,
      title: safeText(config.title || tableId, 160).trim() || tableId,
      columns: columns,
      rows: rows,
      rowCount: rows.length,
      sourceRowCount: declaredSourceCount,
      truncated: config.truncated === true || declaredSourceCount > rows.length
    };
  }

  function envelope(config) {
    config = config || {};
    var sourceConfig = isPlainObject(config.source) ? config.source : {};
    var sourceTool = safeText(sourceConfig.tool, 64).trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(sourceTool)) {
      fail('The source tool identifier is invalid.');
    }
    var sourceTables = Array.isArray(config.tables) ? config.tables : [];
    if (!sourceTables.length) fail('Select at least one table to open in AlloSheet.');
    if (sourceTables.length > LIMITS.maxTables) {
      fail('An AlloSheet transfer may contain at most ' + LIMITS.maxTables + ' tables.');
    }
    var seenTables = Object.create(null);
    var tables = sourceTables.map(function (candidate) {
      var normalized = table(candidate);
      if (seenTables[normalized.id]) fail('The transfer contains duplicate table identifiers.');
      seenTables[normalized.id] = true;
      return normalized;
    });
    var classification = isPlainObject(config.classification) ? config.classification : {};
    var privacy = isPlainObject(config.privacy) ? config.privacy : {};
    var identifierIncluded = classification.studentIdentifierIncluded === true
      || classification.identifierIncluded === true
      || privacy.identifierIncluded === true;
    var notesIncluded = classification.freeTextNotesIncluded === true
      || privacy.notesIncluded === true;
    var result = {
      kind: KIND,
      version: 1,
      source: {
        tool: sourceTool,
        label: safeText(sourceConfig.label || sourceTool, 100).trim() || sourceTool,
        version: safeText(sourceConfig.version || '1', 40)
      },
      title: safeText(config.title || (sourceConfig.label || sourceTool) + ' tables', 180),
      createdAt: safeText(config.createdAt || new Date().toISOString(), 60),
      classification: {
        level: safeText(classification.level || 'education-data', 80),
        studentIdentifierIncluded: identifierIncluded,
        freeTextNotesIncluded: notesIncluded
      },
      privacy: {
        scope: safeText(privacy.scope || 'educator-selected', 80),
        identifierIncluded: identifierIncluded,
        reducedData: privacy.reducedData === true,
        notesIncluded: notesIncluded,
        transferEnablesAI: false
      },
      tables: tables,
      provenance: safeMetadata(config.provenance, 0),
      capabilities: { writeBack: false, aiEnabled: false }
    };
    if (byteLength(result) >= LIMITS.maxEnvelopeBytes) {
      fail('The reviewed tables exceed the 2 MB AlloSheet transfer limit.');
    }
    return result;
  }

  function timestamp(value) {
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    var parsed = Date.parse(String(value == null ? '' : value));
    return Number.isFinite(parsed) ? parsed : null;
  }

  function toIsoDate(value) {
    var time = timestamp(value);
    if (time == null) return '';
    try { return new Date(time).toISOString().slice(0, 10); } catch (_) { return ''; }
  }

  function dateRangeStart(range, nowMs) {
    if (range === 'all') return null;
    var days = range === '30d' ? 30 : range === '90d' ? 90 : range === '365d' ? 365 : 90;
    return nowMs - days * 24 * 60 * 60 * 1000;
  }

  function withinDateRange(value, range, nowMs) {
    var time = timestamp(value);
    if (!Number.isFinite(time)) return false;
    var end = typeof nowMs === 'undefined' ? Date.now() : nowMs;
    if (typeof end !== 'number' || !Number.isFinite(end)) return false;
    var start = dateRangeStart(range, end);
    return time <= end && (start == null || time >= start);
  }

  function createPseudonymMap(names, prefix) {
    var unique = [];
    var seen = Object.create(null);
    (Array.isArray(names) ? names : []).forEach(function (value) {
      var name = safeText(value, 160).trim();
      if (!name || seen[name]) return;
      seen[name] = true;
      unique.push(name);
    });
    unique.sort(function (a, b) { return a.localeCompare(b); });
    var codePrefix = safeText(prefix || 'L', 12).replace(/[^A-Za-z0-9_-]/g, '') || 'L';
    var map = Object.create(null);
    unique.forEach(function (name, index) {
      map[name] = codePrefix + String(index + 1).padStart(3, '0');
    });
    return map;
  }

  var adapter = {
    version: 1,
    kind: KIND,
    limits: LIMITS,
    byteLength: byteLength,
    safeText: safeText,
    safeNumber: safeNumber,
    toIsoDate: toIsoDate,
    withinDateRange: withinDateRange,
    createPseudonymMap: createPseudonymMap,
    column: column,
    table: table,
    envelope: envelope
  };
  window.AlloSheetTransferAdapter = adapter;
  window.AlloModules = window.AlloModules || {};
  window.AlloModules.AlloSheetTransferAdapter = adapter;
})();
