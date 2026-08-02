/*
 * AlloFlow local analytical data kernel.
 *
 * DuckDB-Wasm is deliberately loaded only when a tool asks for a query. The
 * loader exposes a small, privacy-preserving API immediately so Data Studio,
 * Data Plotter, and future tools can share one table contract without making
 * DuckDB a critical-path dependency. The runtime and its WASM/worker assets
 * are shipped locally under duckdb-assets/; a same-origin/CDN URL is used only
 * when the local bundle is not available.
 */
(function () {
  'use strict';
  if (typeof window === 'undefined' || window.AlloDataKernel) return;

  var VERSION = '1.2.0';
  var TABLE_NAME = 'data';
  var MAX_ROWS = 100000;
  var runtimePromise = null;
  var runtimeInfo = { state: 'idle', backend: 'pending', version: VERSION, error: null };

  function own(obj, key) { return Object.prototype.hasOwnProperty.call(obj, key); }

  function resolveAssetBase() {
    try {
      var current = document.currentScript;
      if (current && current.src) return new URL('duckdb-assets/', current.src).toString();
    } catch (_) {}
    try { return new URL('/duckdb-assets/', window.location.href).toString(); } catch (_) { return 'duckdb-assets/'; }
  }

  function normalizeName(value, fallback, used) {
    var name = String(value == null ? '' : value).trim().replace(/[^A-Za-z0-9_]+/g, '_');
    if (!name) name = fallback;
    if (/^[0-9]/.test(name)) name = '_' + name;
    var base = name, suffix = 2;
    while (used[name]) name = base + '_' + suffix++;
    used[name] = true;
    return name;
  }

  function normalizeRows(input, options) {
    options = options || {};
    var source = Array.isArray(input) ? input : [];
    var rows = source.slice(0, MAX_ROWS).filter(function (row) { return row && typeof row === 'object' && !Array.isArray(row); });
    var keys = [];
    rows.forEach(function (row) {
      Object.keys(row).forEach(function (key) { if (keys.indexOf(key) < 0) keys.push(key); });
    });
    if (!keys.length && options.columns && Array.isArray(options.columns)) keys = options.columns.slice();
    var used = {}, columns = keys.map(function (key, index) { return normalizeName(key, 'column_' + (index + 1), used); });
    var keyMap = {};
    keys.forEach(function (key, index) { keyMap[key] = columns[index]; });
    var normalized = rows.map(function (row) {
      var out = {};
      keys.forEach(function (key, index) {
        var value = row[key];
        if (value instanceof Date) value = value.toISOString();
        if (typeof value === 'bigint') value = Number(value);
        out[columns[index]] = value == null ? null : value;
      });
      return out;
    });
    return {
      table: TABLE_NAME,
      rows: normalized,
      columns: columns,
      sourceColumns: keys,
      rowCount: normalized.length,
      truncated: source.length > MAX_ROWS,
      keyMap: keyMap
    };
  }

  function csvCell(value) {
    if (value == null) return '';
    var text = String(value);
    return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  }

  function rowsToCSV(normalized) {
    var columns = normalized.columns || [];
    var lines = [columns.map(csvCell).join(',')];
    (normalized.rows || []).forEach(function (row) {
      lines.push(columns.map(function (column) { return csvCell(row[column]); }).join(','));
    });
    return lines.join('\r\n') + '\r\n';
  }

  function valueToNumber(value) {
    if (typeof value === 'number' && isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '' && isFinite(Number(value))) return Number(value);
    return null;
  }

  function summarize(normalized) {
    var rows = normalized.rows || [];
    var numeric = {};
    (normalized.columns || []).forEach(function (column) {
      var values = rows.map(function (row) { return valueToNumber(row[column]); }).filter(function (value) { return value !== null; });
      if (!values.length) return;
      var sum = values.reduce(function (total, value) { return total + value; }, 0);
      var sorted = values.slice().sort(function (a, b) { return a - b; });
      numeric[column] = {
        count: values.length,
        missing: rows.length - values.length,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        mean: sum / values.length,
        median: sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      };
    });
    return {
      table: normalized.table,
      rowCount: normalized.rowCount,
      columns: (normalized.columns || []).slice(),
      numeric: numeric,
      truncated: !!normalized.truncated
    };
  }

  function quoteIdentifier(value) {
    return '"' + String(value == null ? '' : value).replace(/"/g, '""') + '"';
  }

  // Returns safe, read-only starter queries derived from the dataset shape.
  // It intentionally inspects column names/types only; values stay in the
  // caller's local workspace until a recipe is executed with queryRows().
  function suggestRecipes(input, options) {
    var normalized = normalizeRows(input, options);
    var summary = summarize(normalized);
    var numeric = Object.keys(summary.numeric || {});
    var columns = normalized.columns || [];
    var categorical = columns.filter(function (column) { return numeric.indexOf(column) < 0; });
    var recipes = [{
      id: 'row-count',
      label: 'Count rows',
      description: 'Check how many observations are in the local table.',
      sql: 'SELECT COUNT(*) AS row_count FROM data'
    }];
    numeric.slice(0, 4).forEach(function (column) {
      var quoted = quoteIdentifier(column);
      recipes.push({
        id: 'profile-' + column,
        label: 'Profile ' + column,
        description: 'Mean, median, range, and missing values for ' + column + '.',
        sql: 'SELECT COUNT(*) AS rows, COUNT(' + quoted + ') AS non_missing, AVG(TRY_CAST(' + quoted + ' AS DOUBLE)) AS mean, MEDIAN(TRY_CAST(' + quoted + ' AS DOUBLE)) AS median, MIN(TRY_CAST(' + quoted + ' AS DOUBLE)) AS min, MAX(TRY_CAST(' + quoted + ' AS DOUBLE)) AS max FROM data'
      });
    });
    if (numeric.length >= 2) {
      var first = quoteIdentifier(numeric[0]);
      var second = quoteIdentifier(numeric[1]);
      recipes.push({
        id: 'correlation-' + numeric[0] + '-' + numeric[1],
        label: 'Correlation: ' + numeric[0] + ' × ' + numeric[1],
        description: 'Estimate Pearson correlation for the first two numeric columns.',
        sql: 'SELECT COUNT(*) AS rows, CORR(TRY_CAST(' + first + ' AS DOUBLE), TRY_CAST(' + second + ' AS DOUBLE)) AS pearson_r FROM data WHERE TRY_CAST(' + first + ' AS DOUBLE) IS NOT NULL AND TRY_CAST(' + second + ' AS DOUBLE) IS NOT NULL'
      });
    }
    if (categorical.length && numeric.length) {
      var category = quoteIdentifier(categorical[0]);
      var measure = quoteIdentifier(numeric[0]);
      recipes.push({
        id: 'group-summary-' + categorical[0] + '-' + numeric[0],
        label: 'Group by ' + categorical[0],
        description: 'Compare counts and means across the first categorical column.',
        sql: 'SELECT ' + category + ' AS group_name, COUNT(*) AS rows, AVG(TRY_CAST(' + measure + ' AS DOUBLE)) AS mean_value FROM data WHERE ' + category + ' IS NOT NULL GROUP BY ' + category + ' ORDER BY ' + category
      });
    }
    if (numeric.length) {
      var sortColumn = quoteIdentifier(numeric[0]);
      recipes.push({
        id: 'top-values-' + numeric[0],
        label: 'Top values: ' + numeric[0],
        description: 'Inspect the largest local observations without exporting the data.',
        sql: 'SELECT * FROM data ORDER BY TRY_CAST(' + sortColumn + ' AS DOUBLE) DESC NULLS LAST LIMIT 100'
      });
    }
    return recipes;
  }
  function importFunction() {
    try { return new Function('url', 'return import(url);'); } catch (_) { return null; }
  }

  function loadWasmAsset(base) {
    var direct = { url: base + 'duckdb-mvp.wasm', revoke: function () {} };
    if (typeof fetch !== 'function' || typeof Blob === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
      return Promise.resolve(direct);
    }
    return fetch(base + 'duckdb-mvp.wasm.manifest.json').then(function (response) {
      if (!response.ok) throw new Error('DuckDB WASM manifest returned HTTP ' + response.status + '.');
      return response.json();
    }).then(function (manifest) {
      if (!manifest || manifest.format !== 'alloflow-chunked-wasm-v1' || !Array.isArray(manifest.parts) || !manifest.parts.length) {
        throw new Error('DuckDB WASM manifest is invalid.');
      }
      return Promise.all(manifest.parts.map(function (part) {
        var file = String(part && part.file || '');
        if (!/^duckdb-mvp\.wasm\.part\d+$/.test(file)) throw new Error('DuckDB WASM manifest contains an unsafe part name.');
        return fetch(base + file).then(function (response) {
          if (!response.ok) throw new Error(file + ' returned HTTP ' + response.status + '.');
          return response.arrayBuffer();
        }).then(function (bytes) {
          if (part.bytes && bytes.byteLength !== Number(part.bytes)) throw new Error(file + ' failed its size check.');
          return bytes;
        });
      })).then(function (parts) {
        var total = parts.reduce(function (sum, bytes) { return sum + bytes.byteLength; }, 0);
        if (manifest.bytes && total !== Number(manifest.bytes)) throw new Error('DuckDB WASM chunks failed their total-size check.');
        var objectUrl = URL.createObjectURL(new Blob(parts, { type: 'application/wasm' }));
        return {
          url: objectUrl,
          revoke: function () { try { URL.revokeObjectURL(objectUrl); } catch (_) {} }
        };
      });
    }).catch(function () {
      // Self-hosters that still provide the legacy monolithic file remain
      // compatible. Public AlloFlow deployments use the chunk manifest.
      return direct;
    });
  }

  function loadRuntime() {
    if (runtimePromise) return runtimePromise;
    runtimeInfo.state = 'loading';
    var base = resolveAssetBase();
    var importer = importFunction();
    if (!importer) {
      runtimeInfo.state = 'fallback';
      runtimeInfo.backend = 'fallback';
      runtimePromise = Promise.resolve(null);
      return runtimePromise;
    }
    runtimePromise = importer(base + 'duckdb-browser.mjs').then(function (duckdb) {
      if (!duckdb || !duckdb.AsyncDuckDB || !duckdb.ConsoleLogger) throw new Error('DuckDB-Wasm browser exports are incomplete.');
      var worker = new Worker(base + 'duckdb-browser-mvp.worker.js');
      var db = new duckdb.AsyncDuckDB(new duckdb.ConsoleLogger(), worker);
      return loadWasmAsset(base).then(function (wasmAsset) {
        return db.instantiate(wasmAsset.url).then(function () {
          runtimeInfo.state = 'ready';
          runtimeInfo.backend = 'duckdb-wasm';
          runtimeInfo.error = null;
          return { duckdb: duckdb, db: db, worker: worker, base: base };
        }).finally(wasmAsset.revoke);
      });
    }).catch(function (error) {
      runtimeInfo.state = 'fallback';
      runtimeInfo.backend = 'fallback';
      runtimeInfo.error = String(error && error.message || error || 'DuckDB-Wasm unavailable');
      return null;
    });
    return runtimePromise;
  }

  function safeQuery(sql) {
    var text = String(sql == null ? '' : sql).trim().replace(/;+\s*$/, '');
    if (!text) throw new Error('Enter a query first.');
    if (text.length > 5000) throw new Error('Query is limited to 5,000 characters.');
    if (!/^(select|with|describe|summarize|show)\b/i.test(text)) throw new Error('Only read-only SELECT/WITH/DESCRIBE/SUMMARIZE/SHOW queries are allowed.');
    if (/(\b(attach|call|copy|create|delete|detach|drop|export|import|install|insert|load|pragma|set|update|http[s]?:|read_csv|read_json|read_parquet|glob)\b)/i.test(text)) {
      throw new Error('This workspace only permits queries against the local data table.');
    }
    return text;
  }

  function safeResultValue(value) {
    if (typeof value === 'bigint') return value <= BigInt(Number.MAX_SAFE_INTEGER) && value >= BigInt(Number.MIN_SAFE_INTEGER) ? Number(value) : String(value);
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.map(safeResultValue);
    if (value && typeof value === 'object') {
      if (typeof value.toJSON === 'function') {
        try { return safeResultValue(value.toJSON()); } catch (_) {}
      }
      var out = {};
      Object.keys(value).forEach(function (key) { out[key] = safeResultValue(value[key]); });
      return out;
    }
    return value;
  }

  function tableRows(table) {
    if (!table || typeof table.toArray !== 'function') return [];
    return table.toArray().map(function (row) { return safeResultValue(row); });
  }

  function createWorkspace(input, options) {
    options = options || {};
    var normalized = normalizeRows(input, options);
    var summary = summarize(normalized);
    return loadRuntime().then(function (runtime) {
      if (!runtime) {
        return {
          backend: 'fallback',
          normalized: normalized,
          summary: summary,
          query: function () { return Promise.reject(new Error('The local analytical runtime is unavailable. The dataset summary is still available.')); },
          close: function () { return Promise.resolve(); }
        };
      }
      var fileName = 'alloflow_data_' + Date.now() + '.csv';
      var connection = null;
      return runtime.db.registerFileText(fileName, rowsToCSV(normalized)).then(function () {
        return runtime.db.connect();
      }).then(function (conn) {
        connection = conn;
        var escaped = fileName.replace(/'/g, "''");
        var sql = 'CREATE OR REPLACE TABLE "' + TABLE_NAME + '" AS SELECT * FROM read_csv_auto(\'' + escaped + '\', HEADER=TRUE, SAMPLE_SIZE=-1)';
        return conn.query(sql);
      }).then(function () {
        return {
          backend: 'duckdb-wasm',
          normalized: normalized,
          summary: summary,
          query: function (sql) {
            var statement = safeQuery(sql).replace(/\bdata\b/gi, '"data"');
            return connection.query(statement).then(function (result) {
              return { rows: tableRows(result), query: statement, backend: 'duckdb-wasm' };
            });
          },
          close: function () {
            return Promise.resolve(connection && connection.close()).then(function () { return runtime.db.dropFile(fileName); });
          }
        };
      }).catch(function (error) {
        if (connection) { try { connection.close(); } catch (_) {} }
        throw error;
      });
    });
  }

  function queryRows(rows, sql, options) {
    return createWorkspace(rows, options).then(function (workspace) {
      return workspace.query(sql).then(function (result) {
        return Object.assign({}, result, { summary: workspace.summary, provenance: {
          backend: workspace.backend,
          table: TABLE_NAME,
          rowCount: workspace.normalized.rowCount,
          columns: workspace.normalized.columns.slice(),
          query: result.query || String(sql || '')
        }});
      }).finally(function () { return workspace.close(); });
    });
  }

  var QUERY_HISTORY_KEY = 'alloflow_data_kernel_query_history_v1';
  var QUERY_HISTORY_LIMIT = 50;
  function cleanHistoryEntry(entry) {
    entry = entry && typeof entry === 'object' ? entry : {};
    var timestamp = Number(entry.timestamp);
    if (!isFinite(timestamp) || timestamp <= 0) timestamp = Date.now();
    var sourceRowCount = Number(entry.sourceRowCount);
    var rowCount = Number(entry.rowCount);
    return {
      id: String(entry.id || ('query_' + timestamp + '_' + Math.random().toString(36).slice(2, 8))).slice(0, 120),
      timestamp: timestamp,
      tool: String(entry.tool || 'unknown').slice(0, 40),
      recipe: entry.recipe ? String(entry.recipe).slice(0, 160) : null,
      sql: String(entry.sql || '').trim().slice(0, 5000),
      backend: String(entry.backend || 'local').slice(0, 40),
      rowCount: isFinite(rowCount) ? rowCount : null,
      sourceRowCount: isFinite(sourceRowCount) ? sourceRowCount : null,
      columns: Array.isArray(entry.columns) ? entry.columns.slice(0, 50).map(function (column) { return String(column).slice(0, 120); }) : []
    };
  }
  function readQueryHistory() {
    try {
      var parsed = JSON.parse(window.localStorage.getItem(QUERY_HISTORY_KEY) || '[]');
      if (!Array.isArray(parsed)) return [];
      return parsed.map(cleanHistoryEntry).filter(function (entry) { return entry.sql; }).slice(-QUERY_HISTORY_LIMIT);
    } catch (_) { return []; }
  }
  function writeQueryHistory(entries) {
    try { window.localStorage.setItem(QUERY_HISTORY_KEY, JSON.stringify(entries.slice(-QUERY_HISTORY_LIMIT))); } catch (_) {}
    return entries.slice(-QUERY_HISTORY_LIMIT);
  }
  function recordQuery(entry) {
    var next = readQueryHistory();
    next.push(cleanHistoryEntry(entry));
    return writeQueryHistory(next);
  }
  function clearQueryHistory() {
    try { window.localStorage.removeItem(QUERY_HISTORY_KEY); } catch (_) {}
    return [];
  }
  window.AlloDataKernel = {
    version: VERSION,
    tableName: TABLE_NAME,
    maxRows: MAX_ROWS,
    diagnostics: function () { return Object.assign({}, runtimeInfo); },
    ready: loadRuntime,
    normalizeRows: normalizeRows,
    summarize: function (rows, options) { return summarize(normalizeRows(rows, options)); },
    createWorkspace: createWorkspace,
    queryRows: queryRows,
    suggestRecipes: suggestRecipes,
    queryHistory: {
      list: readQueryHistory,
      record: recordQuery,
      clear: clearQueryHistory
    },
    rowsToCSV: function (rows, options) { return rowsToCSV(normalizeRows(rows, options)); }
  };
  try { window.dispatchEvent(new CustomEvent('allo-data-kernel-ready', { detail: window.AlloDataKernel })); } catch (_) {}
}());
