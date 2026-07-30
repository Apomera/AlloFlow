(function (root, factory) {
  'use strict';

  var workspace = factory();
  if (typeof module === 'object' && module && module.exports) module.exports = workspace;
  if (root) {
    root.AlloSheetWorkspace = workspace;
    root.AlloModules = root.AlloModules || {};
    root.AlloModules.AlloSheetWorkspace = workspace;
  }
})(
  typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this),
  function () {
    'use strict';

    var KIND = 'alloflow.allosheet.workspace.v1';
    var VERSION = 1;
    var MIME_TYPE = 'application/vnd.alloflow.allosheet+json';
    var FILE_EXTENSION = '.allosheet.json';
    var LIMITS = Object.freeze({
      maxWorkspaceBytes: 8 * 1024 * 1024,
      maxTables: 5,
      maxColumns: 40,
      maxRows: 200,
      maxCellChars: 1200,
      maxTableIdChars: 80,
      maxRowIdChars: 120,
      maxFieldChars: 160,
      maxTableTitleChars: 160,
      maxWorkspaceTitleChars: 180,
      maxMetadataKeys: 24,
      maxMetadataArrayItems: 24,
      maxMetadataStringChars: 500,
      maxMetadataArrayStringChars: 160,
      maxSourceRows: 1000000
    });
    var COLUMN_TYPES = Object.freeze([
      'text', 'number', 'boolean', 'date', 'datetime', 'duration', 'category'
    ]);
    var ORIGIN_KINDS = Object.freeze(['blank', 'csv', 'transfer', 'workspace']);
    var BLOCKED_KEYS = Object.freeze(['__proto__', 'constructor', 'prototype']);
    var UNSUPPORTED_TEXT = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
    var ANY_CONTROL_TEXT = /[\u0000-\u001f\u007f]/;
    var ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

    function fail(message) {
      var error = new Error(message);
      error.code = 'allosheet-workspace-invalid';
      throw error;
    }

    function hasOwn(object, key) {
      return Object.prototype.hasOwnProperty.call(object, key);
    }

    function isBlockedKey(value) {
      return BLOCKED_KEYS.indexOf(String(value)) >= 0;
    }

    function isPlainObject(value) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
      var prototype = Object.getPrototypeOf(value);
      return prototype === Object.prototype || prototype === null;
    }

    function requirePlainObject(value, label) {
      if (!isPlainObject(value)) fail(label + ' must be a plain object.');
      return value;
    }

    function assertExactKeys(value, allowed, required, label) {
      requirePlainObject(value, label);
      var allowedMap = Object.create(null);
      allowed.forEach(function (key) { allowedMap[key] = true; });
      Object.keys(value).forEach(function (key) {
        if (isBlockedKey(key)) fail(label + ' contains a blocked property name.');
        if (!allowedMap[key]) fail(label + ' contains an unsupported property named "' + key + '".');
      });
      required.forEach(function (key) {
        if (!hasOwn(value, key)) fail(label + ' is missing the required "' + key + '" property.');
      });
    }

    function byteLength(value) {
      var text;
      if (typeof value === 'string') {
        text = value;
      } else {
        try {
          text = JSON.stringify(value);
        } catch (_) {
          fail('The workspace could not be serialized safely.');
        }
      }
      if (typeof text !== 'string') fail('The workspace could not be serialized safely.');
      try {
        if (typeof TextEncoder === 'function') return new TextEncoder().encode(text).length;
      } catch (_) {}
      try {
        return unescape(encodeURIComponent(text)).length;
      } catch (_) {
        return text.length;
      }
    }

    function assertByteLimit(value) {
      if (byteLength(value) > LIMITS.maxWorkspaceBytes) {
        fail('The AlloSheet workspace exceeds the 8 MiB UTF-8 size limit.');
      }
    }

    function validateText(value, label, max, options) {
      options = options || {};
      if (typeof value !== 'string') fail(label + ' must be text.');
      if (value.length > max) fail(label + ' exceeds ' + max + ' characters.');
      if (options.required && !value) fail(label + ' must not be empty.');
      if (UNSUPPORTED_TEXT.test(value)) fail(label + ' contains unsupported control text.');
      if (options.singleLine && ANY_CONTROL_TEXT.test(value)) {
        fail(label + ' must be a single line of supported text.');
      }
      if (options.trimmed && value !== value.trim()) {
        fail(label + ' must not begin or end with whitespace.');
      }
      return value;
    }

    function validateIdentifier(value, label, max, options) {
      options = options || {};
      var result = validateText(value, label, max, {
        required: true,
        singleLine: true,
        trimmed: true
      });
      if (isBlockedKey(result) || isBlockedKey(result.trim())) {
        fail(label + ' uses a blocked identifier.');
      }
      if (options.blockPath !== false && /[\/\\]/.test(result)) {
        fail(label + ' contains a path separator.');
      }
      return result;
    }

    function isValidTimestamp(value) {
      if (typeof value !== 'string' || !ISO_UTC.test(value)) return false;
      var match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?Z$/.exec(value);
      if (!match) return false;
      var year = Number(match[1]);
      var month = Number(match[2]);
      var day = Number(match[3]);
      var hour = Number(match[4]);
      var minute = Number(match[5]);
      var second = Number(match[6]);
      var leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
      var daysInMonth = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      return month >= 1 && month <= 12
        && day >= 1 && day <= daysInMonth[month - 1]
        && hour >= 0 && hour <= 23
        && minute >= 0 && minute <= 59
        && second >= 0 && second <= 59
        && Number.isFinite(Date.parse(value));
    }

    function validateTimestamp(value, label) {
      var result = validateText(value, label, 60, {
        required: true,
        singleLine: true,
        trimmed: true
      });
      if (!isValidTimestamp(result)) {
        fail(label + ' must be a valid UTC ISO 8601 timestamp.');
      }
      return result;
    }

    function validateBoolean(value, label) {
      if (typeof value !== 'boolean') fail(label + ' must be true or false.');
      return value;
    }

    function validateCell(value, label) {
      if (value === null || typeof value === 'boolean') return value;
      if (typeof value === 'number') {
        if (!Number.isFinite(value)) fail(label + ' must be a finite number.');
        return value;
      }
      if (typeof value === 'string') {
        return validateText(value, label, LIMITS.maxCellChars);
      }
      fail(label + ' must be text, a finite number, a boolean, or null.');
    }

    function validateMetadataKey(value, label) {
      var key = validateText(value, label, 80, {
        required: true,
        singleLine: true,
        trimmed: true
      });
      if (isBlockedKey(key) || isBlockedKey(key.trim())) {
        fail(label + ' uses a blocked property name.');
      }
      return key;
    }

    function validateMetadataScalar(value, label, stringLimit) {
      if (value === null || typeof value === 'boolean') return value;
      if (typeof value === 'number') {
        if (!Number.isFinite(value)) fail(label + ' must be a finite number.');
        return value;
      }
      if (typeof value === 'string') return validateText(value, label, stringLimit);
      fail(label + ' contains an unsupported metadata value.');
    }

    function validateMetadata(input, label, depth) {
      requirePlainObject(input, label);
      var keys = Object.keys(input);
      if (keys.length > LIMITS.maxMetadataKeys) {
        fail(label + ' contains more than ' + LIMITS.maxMetadataKeys + ' properties.');
      }
      var result = Object.create(null);
      keys.forEach(function (rawKey) {
        var key = validateMetadataKey(rawKey, label + ' property name');
        var value = input[rawKey];
        if (Array.isArray(value)) {
          if (value.length > LIMITS.maxMetadataArrayItems) {
            fail(label + '.' + key + ' contains too many array items.');
          }
          result[key] = value.map(function (item, index) {
            return validateMetadataScalar(
              item,
              label + '.' + key + '[' + index + ']',
              LIMITS.maxMetadataArrayStringChars
            );
          });
          return;
        }
        if (isPlainObject(value)) {
          if (depth >= 1) fail(label + '.' + key + ' exceeds the supported metadata depth.');
          result[key] = validateMetadata(value, label + '.' + key, depth + 1);
          return;
        }
        result[key] = validateMetadataScalar(
          value,
          label + '.' + key,
          LIMITS.maxMetadataStringChars
        );
      });
      return result;
    }

    function validateColumn(input, tableLabel, index) {
      var label = tableLabel + ' column ' + (index + 1);
      assertExactKeys(input, ['key', 'label', 'type'], ['key', 'label', 'type'], label);
      var type = validateText(input.type, label + ' type', 20, {
        required: true,
        singleLine: true,
        trimmed: true
      });
      if (COLUMN_TYPES.indexOf(type) < 0) fail(label + ' has an unsupported type.');
      return {
        key: validateIdentifier(input.key, label + ' key', LIMITS.maxFieldChars),
        label: validateIdentifier(input.label, label + ' label', LIMITS.maxFieldChars),
        type: type
      };
    }

    function validateRowId(value, label) {
      if (typeof value === 'number') {
        if (!Number.isSafeInteger(value)) fail(label + ' must be a safe integer or supported text.');
        return value;
      }
      return validateIdentifier(value, label, LIMITS.maxRowIdChars, { blockPath: false });
    }

    function validateTable(input, index) {
      var label = 'Table ' + (index + 1);
      assertExactKeys(
        input,
        ['id', 'title', 'columns', 'rows', 'sourceRowCount', 'truncated'],
        ['id', 'title', 'columns', 'rows', 'sourceRowCount', 'truncated'],
        label
      );
      var id = validateIdentifier(input.id, label + ' identifier', LIMITS.maxTableIdChars);
      var title = validateText(input.title, label + ' title', LIMITS.maxTableTitleChars, {
        required: true,
        singleLine: true,
        trimmed: true
      });
      if (!Array.isArray(input.columns) || !input.columns.length) {
        fail(label + ' must contain at least one column.');
      }
      if (input.columns.length > LIMITS.maxColumns) {
        fail(label + ' contains more than ' + LIMITS.maxColumns + ' columns.');
      }
      var seenColumnKeys = Object.create(null);
      var seenColumnLabels = Object.create(null);
      var columns = input.columns.map(function (column, columnIndex) {
        var normalized = validateColumn(column, label, columnIndex);
        if (seenColumnKeys[normalized.key]) fail(label + ' contains a duplicate column key.');
        if (seenColumnLabels[normalized.label]) fail(label + ' contains a duplicate column label.');
        seenColumnKeys[normalized.key] = true;
        seenColumnLabels[normalized.label] = true;
        return normalized;
      });

      if (!Array.isArray(input.rows)) fail(label + ' rows must be an array.');
      if (input.rows.length > LIMITS.maxRows) {
        fail(label + ' contains more than ' + LIMITS.maxRows + ' rows.');
      }
      var allowedValueKeys = columns.map(function (column) { return column.key; });
      var seenRows = Object.create(null);
      var rows = input.rows.map(function (row, rowIndex) {
        var rowLabel = label + ' row ' + (rowIndex + 1);
        assertExactKeys(row, ['id', 'values'], ['id', 'values'], rowLabel);
        var rowId = validateRowId(row.id, rowLabel + ' identifier');
        var rowKey = String(rowId);
        if (seenRows[rowKey]) fail(label + ' contains a duplicate row identifier.');
        seenRows[rowKey] = true;
        assertExactKeys(row.values, allowedValueKeys, allowedValueKeys, rowLabel + ' values');
        var values = Object.create(null);
        columns.forEach(function (column) {
          values[column.key] = validateCell(
            row.values[column.key],
            rowLabel + ' field "' + column.key + '"'
          );
        });
        return { id: rowId, values: values };
      });

      if (!Number.isInteger(input.sourceRowCount)) {
        fail(label + ' sourceRowCount must be an integer.');
      }
      if (
        input.sourceRowCount < rows.length
        || input.sourceRowCount > LIMITS.maxSourceRows
      ) {
        fail(
          label + ' sourceRowCount must be between the loaded row count and '
          + LIMITS.maxSourceRows + '.'
        );
      }
      var truncated = validateBoolean(input.truncated, label + ' truncated');
      if (input.sourceRowCount > rows.length && !truncated) {
        fail(label + ' must declare truncation when sourceRowCount exceeds its loaded rows.');
      }
      return {
        id: id,
        title: title,
        columns: columns,
        rows: rows,
        sourceRowCount: input.sourceRowCount,
        truncated: truncated
      };
    }

    function validateSource(input) {
      assertExactKeys(input, ['tool', 'label', 'version'], ['tool', 'label', 'version'], 'Origin source');
      var tool = validateText(input.tool, 'Origin source tool', 64, {
        required: true,
        singleLine: true,
        trimmed: true
      });
      if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(tool)) {
        fail('Origin source tool must be a stable lowercase identifier.');
      }
      return {
        tool: tool,
        label: validateText(input.label, 'Origin source label', 100, {
          required: true,
          singleLine: true,
          trimmed: true
        }),
        version: validateText(input.version, 'Origin source version', 40, {
          required: true,
          singleLine: true,
          trimmed: true
        })
      };
    }

    function validateClassification(input) {
      assertExactKeys(
        input,
        ['level', 'identifierIncluded', 'notesIncluded', 'declarationKnown'],
        ['level', 'identifierIncluded', 'notesIncluded', 'declarationKnown'],
        'Origin classification'
      );
      return {
        level: validateText(input.level, 'Origin classification level', 80, {
          required: true,
          singleLine: true,
          trimmed: true
        }),
        identifierIncluded: validateBoolean(
          input.identifierIncluded,
          'Origin classification identifierIncluded'
        ),
        notesIncluded: validateBoolean(
          input.notesIncluded,
          'Origin classification notesIncluded'
        ),
        declarationKnown: validateBoolean(
          input.declarationKnown,
          'Origin classification declarationKnown'
        )
      };
    }

    function validatePrivacy(input) {
      assertExactKeys(
        input,
        ['scope', 'reducedData', 'transferEnablesAI'],
        ['scope', 'reducedData', 'transferEnablesAI'],
        'Origin privacy'
      );
      var transferEnablesAI = validateBoolean(
        input.transferEnablesAI,
        'Origin privacy transferEnablesAI'
      );
      if (transferEnablesAI !== false) {
        fail('A saved AlloSheet workspace must not enable AI during transfer or reopening.');
      }
      return {
        scope: validateText(input.scope, 'Origin privacy scope', 80, {
          required: true,
          singleLine: true,
          trimmed: true
        }),
        reducedData: validateBoolean(input.reducedData, 'Origin privacy reducedData'),
        transferEnablesAI: false
      };
    }

    function validateOrigin(input) {
      assertExactKeys(
        input,
        ['kind', 'source', 'createdAt', 'classification', 'privacy', 'provenance'],
        ['kind', 'source', 'createdAt', 'classification', 'privacy', 'provenance'],
        'Workspace origin'
      );
      var kind = validateText(input.kind, 'Workspace origin kind', 24, {
        required: true,
        singleLine: true,
        trimmed: true
      });
      if (ORIGIN_KINDS.indexOf(kind) < 0) fail('Workspace origin kind is unsupported.');
      return {
        kind: kind,
        source: validateSource(input.source),
        createdAt: validateTimestamp(input.createdAt, 'Workspace origin createdAt'),
        classification: validateClassification(input.classification),
        privacy: validatePrivacy(input.privacy),
        provenance: validateMetadata(input.provenance, 'Workspace origin provenance', 0)
      };
    }

    function validateCapabilities(input) {
      assertExactKeys(
        input,
        ['writeBack', 'aiEnabled'],
        ['writeBack', 'aiEnabled'],
        'Workspace capabilities'
      );
      if (input.writeBack !== false || input.aiEnabled !== false) {
        fail('Workspace capabilities must set writeBack and aiEnabled to false.');
      }
      return { writeBack: false, aiEnabled: false };
    }

    function validateWorkspaceMetadata(input, tableIds) {
      assertExactKeys(
        input,
        ['title', 'createdAt', 'savedAt', 'activeTableId', 'modifiedTableIds'],
        ['title', 'createdAt', 'savedAt', 'activeTableId', 'modifiedTableIds'],
        'Workspace metadata'
      );
      var activeTableId = validateIdentifier(
        input.activeTableId,
        'Workspace activeTableId',
        LIMITS.maxTableIdChars
      );
      if (!tableIds[activeTableId]) fail('Workspace activeTableId does not identify an included table.');
      if (!Array.isArray(input.modifiedTableIds)) {
        fail('Workspace modifiedTableIds must be an array.');
      }
      if (input.modifiedTableIds.length > LIMITS.maxTables) {
        fail('Workspace modifiedTableIds contains too many table identifiers.');
      }
      var seen = Object.create(null);
      var modifiedTableIds = input.modifiedTableIds.map(function (value, index) {
        var id = validateIdentifier(
          value,
          'Workspace modifiedTableIds item ' + (index + 1),
          LIMITS.maxTableIdChars
        );
        if (!tableIds[id]) fail('Workspace modifiedTableIds refers to a table that is not included.');
        if (seen[id]) fail('Workspace modifiedTableIds contains a duplicate table identifier.');
        seen[id] = true;
        return id;
      });
      return {
        title: validateText(input.title, 'Workspace title', LIMITS.maxWorkspaceTitleChars, {
          required: true,
          singleLine: true,
          trimmed: true
        }),
        createdAt: validateTimestamp(input.createdAt, 'Workspace createdAt'),
        savedAt: validateTimestamp(input.savedAt, 'Workspace savedAt'),
        activeTableId: activeTableId,
        modifiedTableIds: modifiedTableIds
      };
    }

    function normalize(input) {
      assertExactKeys(
        input,
        ['kind', 'version', 'workspace', 'origin', 'capabilities', 'tables'],
        ['kind', 'version', 'workspace', 'origin', 'capabilities', 'tables'],
        'AlloSheet workspace'
      );
      if (input.kind !== KIND || input.version !== VERSION) {
        fail('The file is not a supported AlloSheet workspace version.');
      }
      if (!Array.isArray(input.tables) || !input.tables.length) {
        fail('An AlloSheet workspace must contain at least one table.');
      }
      if (input.tables.length > LIMITS.maxTables) {
        fail('An AlloSheet workspace may contain at most ' + LIMITS.maxTables + ' tables.');
      }
      var tableIds = Object.create(null);
      var tables = input.tables.map(function (table, index) {
        var normalized = validateTable(table, index);
        if (tableIds[normalized.id]) fail('The workspace contains duplicate table identifiers.');
        tableIds[normalized.id] = true;
        return normalized;
      });
      var result = {
        kind: KIND,
        version: VERSION,
        workspace: validateWorkspaceMetadata(input.workspace, tableIds),
        origin: validateOrigin(input.origin),
        capabilities: validateCapabilities(input.capabilities),
        tables: tables
      };
      try {
        assertByteLimit(JSON.stringify(result));
      } catch (error) {
        if (error && error.code === 'allosheet-workspace-invalid') throw error;
        fail('The workspace could not be serialized safely.');
      }
      return result;
    }

    function decode(text) {
      if (typeof text !== 'string') fail('The AlloSheet workspace file must contain JSON text.');
      assertByteLimit(text);
      var parsed;
      try {
        parsed = JSON.parse(text);
      } catch (_) {
        fail('The AlloSheet workspace file is not valid JSON.');
      }
      return normalize(parsed);
    }

    function encode(input, options) {
      var normalized = normalize(input);
      var pretty = !options || options.pretty !== false;
      var text;
      try {
        text = JSON.stringify(normalized, null, pretty ? 2 : 0);
      } catch (_) {
        fail('The workspace could not be serialized safely.');
      }
      assertByteLimit(text);
      return text;
    }

    function inferLocalColumnType(records, label) {
      for (var index = 0; index < records.length; index += 1) {
        var value = records[index].fields[label];
        if (value === null || value === '') continue;
        if (typeof value === 'number') return 'number';
        if (typeof value === 'boolean') return 'boolean';
        return 'text';
      }
      return 'text';
    }

    function localTableToWorkspaceTable(input, index) {
      var label = 'Local table ' + (index + 1);
      requirePlainObject(input, label);
      var id = validateIdentifier(input.id, label + ' identifier', LIMITS.maxTableIdChars);
      var title = validateText(input.title, label + ' title', LIMITS.maxTableTitleChars, {
        required: true,
        singleLine: true,
        trimmed: true
      });
      if (!Array.isArray(input.columns) || !input.columns.length) {
        fail(label + ' must contain at least one column.');
      }
      if (input.columns.length > LIMITS.maxColumns) {
        fail(label + ' contains more than ' + LIMITS.maxColumns + ' columns.');
      }
      if (!Array.isArray(input.records)) fail(label + ' records must be an array.');
      if (input.records.length > LIMITS.maxRows) {
        fail(label + ' contains more than ' + LIMITS.maxRows + ' records.');
      }
      input.records.forEach(function (record, rowIndex) {
        var rowLabel = label + ' record ' + (rowIndex + 1);
        requirePlainObject(record, rowLabel);
        if (!hasOwn(record, 'id') || !hasOwn(record, 'fields')) {
          fail(rowLabel + ' must contain id and fields.');
        }
        requirePlainObject(record.fields, rowLabel + ' fields');
      });
      var localColumns = input.columns.map(function (column, columnIndex) {
        return validateIdentifier(
          column,
          label + ' column label ' + (columnIndex + 1),
          LIMITS.maxFieldChars
        );
      });
      var seenLabels = Object.create(null);
      localColumns.forEach(function (column) {
        if (seenLabels[column]) fail(label + ' contains a duplicate column label.');
        seenLabels[column] = true;
      });

      var details;
      if (input.columnDetails !== undefined) {
        if (!Array.isArray(input.columnDetails) || input.columnDetails.length !== localColumns.length) {
          fail(label + ' columnDetails must describe every local column in order.');
        }
        details = input.columnDetails.map(function (detail, columnIndex) {
          var normalized = validateColumn(detail, label, columnIndex);
          if (normalized.label !== localColumns[columnIndex]) {
            fail(label + ' columnDetails labels must match local columns in order.');
          }
          return normalized;
        });
      } else {
        details = localColumns.map(function (column) {
          return {
            key: column,
            label: column,
            type: inferLocalColumnType(input.records, column)
          };
        });
      }
      var seenKeys = Object.create(null);
      details.forEach(function (detail) {
        if (seenKeys[detail.key]) fail(label + ' contains a duplicate column key.');
        seenKeys[detail.key] = true;
      });

      var rows = input.records.map(function (record, rowIndex) {
        var rowLabel = label + ' record ' + (rowIndex + 1);
        var fieldKeys = Object.keys(record.fields);
        fieldKeys.forEach(function (field) {
          if (isBlockedKey(field)) fail(rowLabel + ' fields contains a blocked property name.');
          if (!seenLabels[field]) fail(rowLabel + ' contains an unexpected local field.');
        });
        localColumns.forEach(function (column) {
          if (!hasOwn(record.fields, column)) {
            fail(rowLabel + ' is missing local field "' + column + '".');
          }
        });
        var values = Object.create(null);
        details.forEach(function (detail) {
          values[detail.key] = validateCell(
            record.fields[detail.label],
            rowLabel + ' field "' + detail.label + '"'
          );
        });
        return {
          id: validateRowId(record.id, rowLabel + ' identifier'),
          values: values
        };
      });

      var sourceRowCount = input.sourceRowCount === undefined
        ? rows.length
        : input.sourceRowCount;
      var truncated = input.truncated === undefined
        ? sourceRowCount > rows.length
        : input.truncated;
      return validateTable({
        id: id,
        title: title,
        columns: details,
        rows: rows,
        sourceRowCount: sourceRowCount,
        truncated: truncated
      }, index);
    }

    function fromLocalTables(config) {
      assertExactKeys(
        config,
        ['workspace', 'origin', 'capabilities', 'tables'],
        ['workspace', 'origin', 'tables'],
        'Local workspace input'
      );
      if (!Array.isArray(config.tables)) fail('Local workspace tables must be an array.');
      var document = {
        kind: KIND,
        version: VERSION,
        workspace: config.workspace,
        origin: config.origin,
        capabilities: config.capabilities === undefined
          ? { writeBack: false, aiEnabled: false }
          : config.capabilities,
        tables: config.tables.map(localTableToWorkspaceTable)
      };
      return normalize(document);
    }

    function encodeLocalTables(config, options) {
      return encode(fromLocalTables(config), options);
    }

    function toLocalTables(input) {
      var document = typeof input === 'string' ? decode(input) : normalize(input);
      var modified = Object.create(null);
      document.workspace.modifiedTableIds.forEach(function (id) { modified[id] = true; });
      var localTables = document.tables.map(function (table) {
        var records = table.rows.map(function (row) {
          var fields = Object.create(null);
          table.columns.forEach(function (column) {
            fields[column.label] = row.values[column.key];
          });
          return { id: row.id, fields: fields };
        });
        return {
          id: table.id,
          title: table.title,
          columns: table.columns.map(function (column) { return column.label; }),
          columnDetails: table.columns.map(function (column) {
            return { key: column.key, label: column.label, type: column.type };
          }),
          records: records,
          sourceRowCount: table.sourceRowCount,
          truncated: table.truncated,
          dirty: false,
          sourceModified: modified[table.id] === true
        };
      });
      return {
        document: document,
        workspace: document.workspace,
        origin: document.origin,
        capabilities: document.capabilities,
        activeTableId: document.workspace.activeTableId,
        modifiedTableIds: document.workspace.modifiedTableIds.slice(),
        localTables: localTables
      };
    }

    return Object.freeze({
      kind: KIND,
      version: VERSION,
      mimeType: MIME_TYPE,
      fileExtension: FILE_EXTENSION,
      limits: LIMITS,
      columnTypes: COLUMN_TYPES,
      originKinds: ORIGIN_KINDS,
      byteLength: byteLength,
      isValidTimestamp: isValidTimestamp,
      normalize: normalize,
      decode: decode,
      encode: encode,
      fromLocalTables: fromLocalTables,
      encodeLocalTables: encodeLocalTables,
      toLocalTables: toLocalTables
    });
  }
);
