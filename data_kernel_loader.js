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
  if (typeof window !== 'object' || !window || window.AlloDataKernel) return;

  var VERSION = '1.2.0';
  var TABLE_NAME = 'data';
  var MAX_ROWS = 100000;
  var MAX_COLUMNS = 200;
  var MAX_RESULT_DEPTH = 16;
  var runtimePromise = null;
  var runtimeInfo = { state: 'idle', backend: 'pending', version: VERSION, error: null };

  function safeStr(value) {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'symbol') return '';
    try { return String(value); } catch (_) { return ''; }
  }
  function isDateObject(value) {
    return Object.prototype.toString.call(value) === '[object Date]';
  }
  function stripCtl(value) {
    return safeStr(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  }

  function resolveAssetBase() {
    try {
      var current = document.currentScript;
      if (current && current.src) return new URL('duckdb-assets/', current.src).toString();
    } catch (_) {}
    try { return new URL('/duckdb-assets/', window.location.href).toString(); } catch (_) { return 'duckdb-assets/'; }
  }

  function normalizeName(value, fallback, used) {
    var name = stripCtl(value == null ? '' : value).trim().replace(/[^A-Za-z0-9_]+/g, '_').slice(0, 120);
    if (!name || name === '__proto__' || name === 'constructor' || name === 'prototype') name = fallback;
    if (/^[0-9]/.test(name)) name = '_' + name;
    var base = name, suffix = 2;
    while (Object.prototype.hasOwnProperty.call(used, name)) name = base + '_' + suffix++;
    used[name] = true;
    return name;
  }

  function normalizeRows(input, options) {
    options = (options && typeof options === 'object') ? options : {};
    var source = Array.isArray(input) ? input : [];
    var rows = source.slice(0, MAX_ROWS).filter(function (row) { return row && typeof row === 'object' && !Array.isArray(row); });
    var keys = [];
    rows.forEach(function (row) {
      if (keys.length >= MAX_COLUMNS) return;
      Object.keys(row).forEach(function (key) {
        if (keys.length < MAX_COLUMNS && keys.indexOf(key) < 0) keys.push(key);
      });
    });
    if (!keys.length && options.columns && Array.isArray(options.columns)) keys = options.columns.slice(0, MAX_COLUMNS);
    var used = Object.create(null), columns = keys.map(function (key, index) { return normalizeName(key, 'column_' + (index + 1), used); });
    var keyMap = Object.create(null);
    keys.forEach(function (key, index) { keyMap[key] = columns[index]; });
    var normalized = rows.map(function (row) {
      var out = {};
      keys.forEach(function (key, index) {
        var value = Object.prototype.hasOwnProperty.call(row, key) ? row[key] : null;
        if (isDateObject(value)) value = isFinite(value.getTime()) ? value.toISOString() : null;
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
    var text = safeStr(value);
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
  function loadRuntime() {
    if (runtimePromise) return runtimePromise;
    runtimeInfo.state = 'loading';
    var base = resolveAssetBase();
    var worker = null, workerAsset = null, wasmAsset = null;
    var pending = Promise.resolve().then(function () {
      if (typeof window.__alloLoadVerifiedRuntime !== 'function' || typeof window.__alloGetVerifiedRuntimeAsset !== 'function') {
        throw new Error('Verified analytical runtime delivery is unavailable.');
      }
      return window.__alloLoadVerifiedRuntime('duckdb');
    }).then(async function (duckdb) {
      if (!duckdb || !duckdb.AsyncDuckDB || !duckdb.ConsoleLogger) throw new Error('DuckDB-Wasm browser exports are incomplete.');
      workerAsset = await window.__alloGetVerifiedRuntimeAsset('duckdb', 'worker');
      wasmAsset = await window.__alloGetVerifiedRuntimeAsset('duckdb', 'wasm');
      worker = new Worker(workerAsset.url);
      var terminate = worker.terminate.bind(worker);
      worker.terminate = function () { try { return terminate(); } finally { workerAsset.revoke(); } };
      var db = new duckdb.AsyncDuckDB(new duckdb.ConsoleLogger(), worker);
      try {
        return await db.instantiate(wasmAsset.url).then(function () {
          runtimeInfo.state = 'ready';
          runtimeInfo.backend = 'duckdb-wasm';
          runtimeInfo.error = null;
          return { duckdb: duckdb, db: db, worker: worker, base: base };
        });
      } finally { wasmAsset.revoke(); }
    }).catch(function (error) {
      if (worker) { try { worker.terminate(); } catch (_) {} }
      if (workerAsset) { try { workerAsset.revoke(); } catch (_) {} }
      if (wasmAsset) { try { wasmAsset.revoke(); } catch (_) {} }
      if (typeof window.__alloDisposeVerifiedRuntime === 'function') {
        try { window.__alloDisposeVerifiedRuntime('duckdb'); } catch (_) {}
      }
      runtimeInfo.state = 'fallback';
      runtimeInfo.backend = 'fallback';
      runtimeInfo.error = safeStr(error && error.message || error || 'DuckDB-Wasm unavailable');
      if (runtimePromise === pending) runtimePromise = null;
      return null;
    });
    runtimePromise = pending;
    return runtimePromise;
  }

  var workspaceSeq = 0;

  function safeQuery(sql) {
    var text = String(sql == null ? '' : sql).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().replace(/;+\s*$/, '');
    if (!text) throw new Error('Enter a query first.');
    if (text.length > 5000) throw new Error('Query is limited to 5,000 characters.');
    // Reject DuckDB escape-string syntax (e'...') which creates a quote-parsing differential
    if (/(?:^|[^A-Za-z0-9_])e'/i.test(text)) {
      throw new Error('This workspace only permits queries against the local data table.');
    }
    var stripped = text.replace(/'(?:''|[^'])*'/g, "''");
    if (/[;]/.test(stripped) || /--/.test(stripped) || /\/\*/.test(stripped) || /\$[A-Za-z0-9_]*\$/.test(stripped)) {
      throw new Error('Multiple SQL statements or SQL comments are not allowed.');
    }
    if (!/^(select|with|describe|summarize|show)\b/i.test(stripped)) throw new Error('Only read-only SELECT/WITH/DESCRIBE/SUMMARIZE/SHOW queries are allowed.');
    // Block direct file-path table-function shorthand (e.g. FROM 'file.csv', FROM (('file.csv')), FROM ['file.csv'], FROM data, LATERAL ('file.csv'))
    if (/(?:\b(?:from|join|lateral)\s*(?:[\[(]+\s*)*|,\s*(?:lateral\s*)?(?:[\[(]+\s*)*)''/i.test(stripped)) {
      throw new Error('This workspace only permits queries against the local data table.');
    }
    if (/(\b(alter|attach|[a-z0-9_]*_attach|call|checkpoint|copy|create|deallocate|delete|detach|drop|execute|export|generate_series|glob|import|information_schema|install|insert|load|load_aws_credentials|merge|parquet_[a-z0-9_]*|pg_catalog|pg_tables|pivot|pragma|pragma_[a-z0-9_]*|prepare|query|query_table|range|read_[a-z0-9_]*|repeat_row|replace|reset|set|sniff_csv|sqlite_attach|sqlite_master|sqlite_temp_master|st_read|truncate|unpivot|update|use|vacuum|from_substrait|from_substrait_json|duckdb_[a-z0-9_]*|which_secret|current_setting|getenv|[a-z0-9_]*_scan)\b)/i.test(stripped)) {
      throw new Error('This workspace only permits queries against the local data table.');
    }
    if (/\b(http[s]?|s3|gs|hf|file|ftp):\/\//i.test(text)) {
      throw new Error('This workspace only permits queries against the local data table.');
    }
    return text;
  }

  function safeResultValue(value, depth, seen) {
    var d = depth || 0;
    if (typeof value === 'bigint') return value <= BigInt(Number.MAX_SAFE_INTEGER) && value >= BigInt(Number.MIN_SAFE_INTEGER) ? Number(value) : String(value);
    if (isDateObject(value)) return isFinite(value.getTime()) ? value.toISOString() : null;
    if (d > MAX_RESULT_DEPTH) return null;
    if (value && typeof value === 'object') {
      var visited = seen || new Set();
      if (visited.has(value)) return null;
      visited.add(value);
      try {
        if (Array.isArray(value)) return value.map(function (item) { return safeResultValue(item, d + 1, visited); });
        if (typeof value.toJSON === 'function') {
          try {
            var jsonVal = value.toJSON();
            if (jsonVal !== value) return safeResultValue(jsonVal, d + 1, visited);
          } catch (_) {}
        }
        var out = {};
        Object.keys(value).forEach(function (key) {
          if (key === '__proto__' || key === 'constructor' || key === 'prototype') return;
          out[key] = safeResultValue(value[key], d + 1, visited);
        });
        return out;
      } finally {
        visited.delete(value);
      }
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
      var fileName = 'alloflow_data_' + Date.now() + '_' + (++workspaceSeq) + '.csv';
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
            var statement = safeQuery(sql).replace(/'(?:''|[^'])*'|"(?:""|[^"])*"|\bdata\b/gi, function (match) {
              return /^data$/i.test(match) ? '"data"' : match;
            });
            return connection.query(statement).then(function (result) {
              return { rows: tableRows(result), query: statement, backend: 'duckdb-wasm' };
            });
          },
          close: function () {
            var dropTable = connection && typeof connection.query === 'function'
              ? Promise.resolve(connection.query('DROP TABLE IF EXISTS "' + TABLE_NAME + '"')).catch(function () {})
              : Promise.resolve();
            return dropTable.then(function () {
              return connection && connection.close();
            }).finally(function () {
              return runtime.db.dropFile(fileName);
            });
          }
        };
      }).catch(function (error) {
        if (connection) { try { Promise.resolve(connection.close()).catch(function () {}); } catch (_) {} }
        Promise.resolve(runtime.db.dropFile(fileName)).catch(function () {});
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
  function cleanCount(val) {
    if (typeof val === 'number') return isFinite(val) && val >= 0 ? Math.floor(val) : null;
    if (typeof val === 'string' && val.trim() !== '') {
      var parsed = Number(val);
      return isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : null;
    }
    return null;
  }
  function cleanHistoryEntry(entry) {
    entry = entry && typeof entry === 'object' ? entry : {};
    var timestamp = typeof entry.timestamp === 'number' ? entry.timestamp : Number(entry.timestamp);
    if (!isFinite(timestamp) || timestamp <= 0) timestamp = Date.now();
    return {
      id: stripCtl(entry.id || ('query_' + timestamp + '_' + Math.random().toString(36).slice(2, 8))).slice(0, 120),
      timestamp: timestamp,
      tool: stripCtl(entry.tool || 'unknown').slice(0, 40),
      recipe: entry.recipe ? stripCtl(entry.recipe).slice(0, 160) : null,
      sql: stripCtl(entry.sql || '').trim().slice(0, 5000),
      backend: stripCtl(entry.backend || 'local').slice(0, 40),
      rowCount: cleanCount(entry.rowCount),
      sourceRowCount: cleanCount(entry.sourceRowCount),
      columns: Array.isArray(entry.columns) ? entry.columns.slice(0, 50).map(function (column) { return stripCtl(column).slice(0, 120); }) : []
    };
  }
  function readQueryHistory() {
    try {
      var parsed = JSON.parse(window.localStorage.getItem(QUERY_HISTORY_KEY) || '[]', function (k, v) {
        return (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v;
      });
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
  window.AlloDataKernel = Object.freeze({
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
    queryHistory: Object.freeze({
      list: readQueryHistory,
      record: recordQuery,
      clear: clearQueryHistory
    }),
    rowsToCSV: function (rows, options) { return rowsToCSV(normalizeRows(rows, options)); }
  });
  try { window.dispatchEvent(new CustomEvent('allo-data-kernel-ready', { detail: window.AlloDataKernel })); } catch (_) {}
}());
