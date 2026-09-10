(function (root, factory) {
  'use strict';
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) { root.AlloModules = root.AlloModules || {}; root.AlloModules.RemediationReview = api; }
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';
  var MAX_RECORDS = 100, MAX_REFERENCES = 700;
  var reasons = {
    "source-visibility-changed": "The suggestion hid source content from view or assistive technology; the original was retained.",
    "table-semantics-changed": "Existing table headers or associations lost their meaning; the original table was retained.",
    "form-state-changed": "A form value, state, label association, or destination changed; the original form was retained.",
    "math-content-changed": "Mathematical notation or structure changed; the original expression was retained.",
    'no-original': 'The suggestion had no usable source for comparison and was rejected.',
    'empty-output': 'The suggestion was empty; the original content was retained.',
    'no-doc-markers': 'The suggestion did not contain a complete document; the original was retained.',
    'size-shrink': 'The suggestion removed too much document structure; the original was retained.',
    'text-shrink': 'The suggestion omitted too much text; the original was retained.',
    'size-growth-unexpected': 'The suggestion added too much document structure; the original was retained.',
    'text-growth-unexpected': 'The suggestion added too much text; the original was retained.',
    'table-cell-transposition': 'Table values changed position; the original table content was retained.',
    'image-reference-uncheckable': 'The image references could not be verified; the original images were retained.',
    'image-reference-changed': 'Image identity or order changed; the original images were retained.',
    'invalid-json-wrapper': 'The suggestion could not be read as HTML; the original was retained.',
    "table-content-changed": "Table values, cells, or spans changed; the original table was retained.",
    "source-value-changed": "A source number, sign, or unit changed or was added; the original content was retained.",
    "link-destination-changed": "A link destination or link order changed; the original links were retained.",
    "image-association-changed": "An image moved relative to its source content or caption; the original placement was retained.",
    "source-reading-order-changed": "Source wording or reading order changed; the original content was retained.",
    "source-content-added": "The suggestion added unsupported source content; the original was retained.",
    "source-contract-uncheckable": "Source preservation could not be checked; the original content was retained.",
    'content-not-preserved': 'The suggestion did not preserve the document; the original was retained.'
  };
  function count(value) { return Number.isSafeInteger(value) && value >= 0 ? Math.min(value, 1000000) : 0; }
  function records(value) {
    if (!Array.isArray(value)) return [];
    return value.slice(0, MAX_RECORDS).filter(function (r) {
      return r && typeof r === 'object' && !Array.isArray(r) && typeof r.chunkId === 'string'
        && /^(?:all|[0-9]{1,8}(?:\.[0-9]{1,8})?)$/.test(r.chunkId)
        && ['single', 'chunk', 'image-retry', 'half', 'half-assembly', 'assembly'].includes(r.phase)
        && Object.prototype.hasOwnProperty.call(reasons, r.reason);
    }).map(function (r) {
      var item = { chunkId: r.chunkId, phase: r.phase, reason: r.reason };
      if (Number.isSafeInteger(r.pass) && r.pass >= 1 && r.pass <= 1000000) item.pass = r.pass;
      if (typeof r.sourceLocation === 'string' && /^(?:document|(?:table|row|cell|link|figure|control|math):[1-9][0-9]{0,7}(?:\/(?:row|cell):[1-9][0-9]{0,7}){0,2})$/.test(r.sourceLocation)) item.sourceLocation = r.sourceLocation;
      return item;
    });
  }
  function evidence(value) {
    var list = records(value && value.candidateRejections);
    return { candidateRejectionCount: Math.max(count(value && value.candidateRejectionCount), list.length), candidateRejections: list };
  }
  // Each pass callback carries a delta once. Metadata never changes readiness or HTML.
  function mergeEvidence(previous, delta) {
    var a = evidence(previous), b = evidence(delta);
    return { candidateRejectionCount: Math.min(1000000, a.candidateRejectionCount + b.candidateRejectionCount), candidateRejections: a.candidateRejections.concat(b.candidateRejections).slice(0, MAX_RECORDS) };
  }
  function acknowledgments(value) {
    var result = {};
    if (!value || typeof value !== 'object' || Array.isArray(value)) return result;
    Object.keys(value).slice(0, MAX_RECORDS).forEach(function (key) {
      if (/^preservation\|/.test(key) && key.length <= 180 && Number.isSafeInteger(value[key]) && value[key] > 0) result[key] = value[key];
    });
    return result;
  }
  function reviewItems(value, reviewed) {
    return records(value && value.candidateRejections).map(function (r, index) {
      var key = ['preservation', index, r.pass, r.chunkId, r.phase, r.reason].join('|');
      return Object.assign({}, r, { key: key, reviewed: !!(reviewed && reviewed[key]), description: reasons[r.reason] || reasons['content-not-preserved'],
        locationLabel: r.sourceLocation ? 'Location in the input for this attempt: ' + r.sourceLocation.replace(/:/g, ' ').replace(/\//g, ', ') + '.' : '',
        referenceKind: /table/i.test(r.reason) ? 'table' : /image|asset|placeholder/i.test(r.reason) ? 'figure' : null });
    });
  }
  function text(value) { return String(value || '').normalize('NFKC').replace(/\s+/g, ' ').trim(); }
  function documentFor(html, options) {
    var Parser = (options && options.DOMParser) || (root && root.DOMParser);
    if (!Parser) throw new Error('Document references need an HTML parser.');
    return new Parser().parseFromString(String(html || ''), 'text/html');
  }
  async function hash(value, options) {
    if (options && typeof options.digest === 'function') return options.digest(String(value));
    var subtle = root && root.crypto && root.crypto.subtle;
    if (!subtle) throw new Error('Document references need SHA-256 support.');
    var Encoder = root.TextEncoder || globalThis.TextEncoder;
    var bytes = await subtle.digest('SHA-256', new Encoder().encode(String(value)));
    return Array.from(new Uint8Array(bytes)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }
  function ownedRows(table) { return Array.from(table.querySelectorAll('tr')).filter(function (row) { return row.closest('table') === table; }); }
  // This sidecar identifies source elements. It is not accessibility or fidelity proof.
  // No IDs/attributes are injected into the document being verified.
  async function inventory(doc, options) {
    var refs = [], tables = Array.from(doc.querySelectorAll('table')).slice(0, 100), images = Array.from(doc.querySelectorAll('img')).slice(0, 200);
    for (var ti = 0; ti < tables.length && refs.length < MAX_REFERENCES; ti++) {
      var table = tables[ti], rows = ownedRows(table), cellData = [];
      rows.forEach(function (row, ri) {
        Array.from(row.children).filter(function (cell) { return /^(TD|TH)$/.test(cell.tagName); }).forEach(function (cell, ci) {
          cellData.push({ node: cell, row: ri, column: ci, value: text(cell.textContent), rowSpan: cell.rowSpan || 1, colSpan: cell.colSpan || 1 });
        });
      });
      var fingerprint = await hash(JSON.stringify(cellData.map(function (cell) { return [cell.row, cell.column, cell.value, cell.rowSpan, cell.colSpan]; })), options);
      var caption = Array.from(table.children).find(function (child) { return child.tagName === 'CAPTION'; });
      refs.push({ kind: 'table', table: ti, fingerprint: fingerprint, label: 'Table ' + (ti + 1) + (caption ? ': ' + text(caption.textContent).slice(0, 120) : ''), node: table });
      for (var ci = 0; ci < cellData.length && refs.length < MAX_REFERENCES; ci++) {
        var cell = cellData[ci];
        refs.push({ kind: 'cell', table: ti, row: cell.row, column: cell.column, tableFingerprint: fingerprint,
          fingerprint: await hash(JSON.stringify([cell.value, cell.rowSpan, cell.colSpan]), options),
          label: 'Table ' + (ti + 1) + ', row ' + (cell.row + 1) + ', cell ' + (cell.column + 1), node: cell.node });
      }
    }
    for (var ii = 0; ii < images.length && refs.length < MAX_REFERENCES; ii++) {
      var img = images[ii];
      refs.push({ kind: 'figure', index: ii, fingerprint: await hash(JSON.stringify([img.getAttribute('src') || '', img.getAttribute('srcset') || '']), options),
        label: 'Image ' + (ii + 1) + (img.getAttribute('alt') ? ': ' + text(img.getAttribute('alt')).slice(0, 120) : ''), node: img });
    }
    var signature = await hash(JSON.stringify([text(doc.body && doc.body.textContent), refs.map(function (ref) { return [ref.kind, ref.fingerprint]; })]), options);
    return { refs: refs, signature: signature, truncated: refs.length >= MAX_REFERENCES || doc.querySelectorAll('table').length > tables.length || doc.querySelectorAll('img').length > images.length };
  }
  async function createSourceModel(html, options) {
    try {
      var doc = documentFor(html, options), inv = await inventory(doc, options), sourceDigest = await hash(String(html || ''), options);
      return { version: 1, sourceDigest: sourceDigest, signature: inv.signature, truncated: inv.truncated,
        references: inv.refs.map(function (ref, index) {
          var result = Object.assign({}, ref, { id: 'src-' + sourceDigest.slice(0, 16) + '-' + (index + 1) });
          delete result.node;
          return result;
        }) };
    } catch (_) { return null; }
  }
  function normalizeSourceModel(value) {
    if (!value || value.version !== 1 || !/^[a-f0-9]{64}$/.test(value.sourceDigest || '') || !/^[a-f0-9]{64}$/.test(value.signature || '') || !Array.isArray(value.references)) return null;
    var ids = new Set(), refs = [];
    for (var raw of value.references.slice(0, MAX_REFERENCES)) {
      if (!raw || !['table', 'cell', 'figure'].includes(raw.kind) || !new RegExp('^src-' + value.sourceDigest.slice(0, 16) + '-[1-9][0-9]{0,3}$').test(raw.id || '') || ids.has(raw.id) || !/^[a-f0-9]{64}$/.test(raw.fingerprint || '')) return null;
      var ref = { id: raw.id, kind: raw.kind, fingerprint: raw.fingerprint, label: String(raw.label || '').slice(0, 160) };
      var keys = raw.kind === 'figure' ? ['index'] : raw.kind === 'cell' ? ['table', 'row', 'column'] : ['table'];
      for (var key of keys) { if (!Number.isSafeInteger(raw[key]) || raw[key] < 0 || raw[key] > 100000) return null; ref[key] = raw[key]; }
      if (raw.kind === 'cell') { if (!/^[a-f0-9]{64}$/.test(raw.tableFingerprint || '')) return null; ref.tableFingerprint = raw.tableFingerprint; }
      ids.add(ref.id); refs.push(ref);
    }
    return { version: 1, sourceDigest: value.sourceDigest, signature: value.signature, truncated: value.truncated === true || value.references.length >= MAX_REFERENCES, references: refs };
  }
  async function resolveSourceReference(doc, model, id, options) {
    model = normalizeSourceModel(model);
    var ref = model && model.references.find(function (item) { return item.id === id; });
    if (!ref || !doc) return { status: 'unavailable', node: null };
    // An incomplete sidecar or current inventory cannot establish uniqueness: an
    // unseen duplicate may be the surviving element. Never infer identity from a cap.
    if (model.truncated) return { status: 'unavailable', node: null, reason: 'reference-inventory-truncated' };
    var inv;
    try { inv = await inventory(doc, options); } catch (_) { return { status: 'unavailable', node: null }; }
    if (inv.truncated) return { status: 'unavailable', node: null, reason: 'reference-inventory-truncated' };
    var sameIdentity = function (item) {
      return item.kind === ref.kind && item.fingerprint === ref.fingerprint
        && (ref.kind !== 'cell' || (item.tableFingerprint === ref.tableFingerprint && item.row === ref.row && item.column === ref.column));
    };
    var sourceCandidates = model.references.filter(sameIdentity);
    var candidates = inv.refs.filter(sameIdentity);
    if (!candidates.length) return { status: 'changed', node: null };
    // Both sides must identify a unique element. Matching the remaining target
    // alone maps two old IDs onto one survivor after a duplicate is removed.
    // Document signatures and positions do not prove which identical duplicate
    // survived or moved, even if unchanged text makes the signatures equal.
    if (sourceCandidates.length !== 1 || candidates.length !== 1) return { status: 'ambiguous', node: null };
    return { status: 'matched', node: candidates[0].node, reference: ref };
  }
  return { reasons: reasons, acknowledgments: acknowledgments, evidence: evidence, mergeEvidence: mergeEvidence, reviewItems: reviewItems,
    createSourceModel: createSourceModel, normalizeSourceModel: normalizeSourceModel, resolveSourceReference: resolveSourceReference };
});
