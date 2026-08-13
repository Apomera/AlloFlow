/**
 * AlloFlow Learning Web registry.
 *
 * Persists bounded, versioned acg/v1 snapshots and indexes them by the
 * resources they describe. Domain modules keep ownership of their richer
 * records; this registry owns the durable cross-view hand-off only.
 */
(function () {
  'use strict';

  var VERSION = 'learning-web-registry/v1';
  var STORAGE_KEY = 'alloflow_learning_web_registry_v1';
  var MAX_GRAPHS = 60;
  var MAX_NODES = 600;
  var MAX_EDGES = 1800;
  var MAX_RESOURCES = 160;
  var MAX_TEXT = 1200;
  var DEFAULT_SCOPE = 'workspace:default';
  var listeners = [];
  var defaultRegistry = null;

  function isObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function text(value, limit) {
    if (value === undefined || value === null) return '';
    return String(value).replace(/\s+/g, ' ').trim().slice(0, limit || MAX_TEXT);
  }

  function clone(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (_) { return null; }
  }

  function isoDate(value, fallback) {
    var parsed = value ? new Date(value) : null;
    return parsed && Number.isFinite(parsed.getTime()) ? parsed.toISOString() : fallback;
  }

  function stableHash(value) {
    var input = String(value || '');
    var hash = 2166136261;
    for (var i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function normalizeResourceRef(raw, index) {
    if (typeof raw === 'string') raw = { id: raw };
    if (!isObject(raw)) return null;
    var id = text(raw.id || raw.resourceId || raw.artifactId, 240);
    if (!id) return null;
    return {
      id: id,
      type: text(raw.type || raw.resourceType || raw.artifactType, 100) || 'resource',
      title: text(raw.title || raw.label || raw.name, 320) || ('Resource ' + (index + 1))
    };
  }

  function normalizeResourceRefs(values) {
    var list = Array.isArray(values) ? values : [];
    var seen = {};
    var out = [];
    for (var i = 0; i < list.length && out.length < MAX_RESOURCES; i++) {
      var ref = normalizeResourceRef(list[i], i);
      var key = ref && (ref.type + ':' + ref.id);
      if (ref && !seen[key]) {
        seen[key] = true;
        out.push(ref);
      }
    }
    return out;
  }

  function normalizeGraph(raw) {
    if (!isObject(raw) || raw.version !== 'acg/v1') return null;
    if (!Array.isArray(raw.nodes) || !Array.isArray(raw.edges)) return null;
    if (raw.nodes.length > MAX_NODES || raw.edges.length > MAX_EDGES) return null;
    var graph = clone(raw);
    if (!graph) return null;
    var nodeIds = {};
    graph.nodes = graph.nodes.filter(function (node) {
      if (!isObject(node)) return false;
      var id = text(node.id, 240);
      if (!id || nodeIds[id]) return false;
      node.id = id;
      nodeIds[id] = true;
      return true;
    });
    graph.edges = graph.edges.filter(function (edge) {
      if (!isObject(edge)) return false;
      var source = text(edge.source || edge.from || edge.fromId, 240);
      var target = text(edge.target || edge.to || edge.toId, 240);
      if (!source || !target || !nodeIds[source] || !nodeIds[target]) return false;
      if (edge.fromId !== undefined || (edge.source === undefined && edge.from === undefined)) {
        edge.fromId = source;
        edge.toId = target;
      } else if (edge.from !== undefined) {
        edge.from = source;
        edge.to = target;
      } else {
        edge.source = source;
        edge.target = target;
      }
      return true;
    });
    graph.version = 'acg/v1';
    return graph;
  }

  function inferGraphKind(graph, metadata) {
    var explicit = text(metadata && (metadata.kind || metadata.graphKind), 100);
    if (explicit) return explicit;
    var meta = graph && graph.meta;
    if (meta && (meta.alignmentMap || meta.alignmentAudit)) return 'alignment-map';
    if (meta && (meta.lexicalGraph || meta.domain === 'lexical')) return 'lexical-graph';
    if (meta && (meta.throughline || meta.unitId)) return 'unit-path';
    return 'learning-web';
  }

  function graphFingerprint(graph) {
    var nodes = graph.nodes.map(function (node) { return text(node.id, 240); }).sort();
    var edges = graph.edges.map(function (edge) {
      return [text(edge.source || edge.from || edge.fromId, 240), text(edge.target || edge.to || edge.toId, 240), text(edge.relationType || edge.type, 100)].join('>');
    }).sort();
    return stableHash(JSON.stringify([graph.version, nodes, edges]));
  }

  function inferResourceRefs(graph, metadata) {
    var supplied = metadata && (metadata.resourceRefs || metadata.resources);
    var refs = normalizeResourceRefs(supplied);
    var sourceId = text(metadata && (metadata.resourceId || metadata.sourceResourceId), 240);
    if (sourceId) refs = normalizeResourceRefs(refs.concat([{
      id: sourceId,
      type: metadata.resourceType || 'resource',
      title: metadata.resourceTitle || metadata.title || sourceId
    }]));
    var auditScope = graph && graph.meta && graph.meta.alignmentAudit && graph.meta.alignmentAudit.auditScope;
    var artifacts = auditScope && (auditScope.includedArtifacts || auditScope.artifacts);
    return normalizeResourceRefs(refs.concat(Array.isArray(artifacts) ? artifacts : []));
  }

  function normalizeEntry(raw, options) {
    var source = isObject(raw) ? raw : {};
    var metadata = isObject(options) ? options : {};
    var graph = normalizeGraph(source.graph || source);
    if (!graph) return null;
    var now = isoDate(metadata.now, new Date().toISOString());
    var kind = inferGraphKind(graph, Object.assign({}, source, metadata));
    var id = text(metadata.id || source.id, 240) || ('graph:' + kind + ':' + graphFingerprint(graph));
    var scopeId = text(metadata.scopeId || source.scopeId, 240) || DEFAULT_SCOPE;
    return {
      id: id,
      version: 'learning-web-entry/v1',
      graphKind: kind,
      scopeId: scopeId,
      title: text(metadata.title || source.title, 320) || (kind === 'alignment-map' ? 'Alignment Map' : 'Learning Web graph'),
      graph: graph,
      resourceRefs: inferResourceRefs(graph, Object.assign({}, source, metadata)),
      createdAt: isoDate(source.createdAt || metadata.createdAt, now),
      updatedAt: isoDate(metadata.updatedAt || source.updatedAt, now),
      provenance: isObject(metadata.provenance) ? clone(metadata.provenance) : (isObject(source.provenance) ? clone(source.provenance) : {})
    };
  }

  function emptySnapshot() {
    return { version: VERSION, updatedAt: null, graphs: [] };
  }

  function normalizeSnapshot(raw) {
    var source = isObject(raw) ? raw : {};
    if (source.version !== undefined && source.version !== VERSION) return null;
    var values = Array.isArray(source.graphs) ? source.graphs : [];
    var byId = {};
    var graphs = [];
    for (var i = 0; i < values.length; i++) {
      var entry = normalizeEntry(values[i]);
      var entryKey = entry && (entry.scopeId + '|' + entry.id);
      if (!entry || byId[entryKey]) continue;
      byId[entryKey] = true;
      graphs.push(entry);
    }
    graphs.sort(function (a, b) { return String(b.updatedAt).localeCompare(String(a.updatedAt)); });
    return {
      version: VERSION,
      updatedAt: isoDate(source.updatedAt, null),
      graphs: graphs.slice(0, MAX_GRAPHS)
    };
  }

  function browserStorage() {
    try { return typeof window !== 'undefined' ? window.localStorage : null; } catch (_) { return null; }
  }

  function emit(snapshot) {
    listeners.slice().forEach(function (listener) {
      try { listener(clone(snapshot)); } catch (_) {}
    });
    try {
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof window.CustomEvent === 'function') {
        window.dispatchEvent(new window.CustomEvent('alloflow:learning-web-changed', { detail: { version: VERSION } }));
      }
    } catch (_) {}
  }

  function createRegistry(options) {
    var opts = isObject(options) ? options : {};
    var storage = opts.storage === undefined ? browserStorage() : opts.storage;
    var storageKey = text(opts.storageKey, 240) || STORAGE_KEY;
    var clock = typeof opts.now === 'function' ? opts.now : function () { return new Date().toISOString(); };
    var memory = emptySnapshot();
    // When durable storage rejects a write (quota/privacy mode), memory remains
    // authoritative for this session instead of immediately re-reading stale disk.
    var memoryDirty = false;

    function read() {
      if (memoryDirty || !storage || typeof storage.getItem !== 'function') return clone(memory);
      try {
        var raw = storage.getItem(storageKey);
        var normalized = raw ? normalizeSnapshot(JSON.parse(raw)) : emptySnapshot();
        return normalized || emptySnapshot();
      } catch (_) {
        return clone(memory);
      }
    }

    function write(snapshot) {
      var next = normalizeSnapshot(snapshot) || emptySnapshot();
      next.updatedAt = isoDate(clock(), new Date().toISOString());
      memory = next;
      var storagePersisted = false;
      if (storage && typeof storage.setItem === 'function') {
        try {
          storage.setItem(storageKey, JSON.stringify(next));
          storagePersisted = true;
          memoryDirty = false;
        } catch (_) {
          memoryDirty = true;
        }
      } else {
        memoryDirty = true;
      }
      emit(next);
      return { snapshot: clone(next), storagePersisted: storagePersisted };
    }

    function saveGraph(graph, metadata) {
      var entry = normalizeEntry({ graph: graph }, Object.assign({}, metadata || {}, { now: clock() }));
      if (!entry) return null;
      var snapshot = read();
      var existing = snapshot.graphs.filter(function (candidate) { return candidate.id === entry.id && candidate.scopeId === entry.scopeId; })[0];
      if (existing) entry.createdAt = existing.createdAt;
      snapshot.graphs = [entry].concat(snapshot.graphs.filter(function (candidate) {
        return candidate.id !== entry.id || candidate.scopeId !== entry.scopeId;
      }));
      var result = write(snapshot);
      var saved = clone(entry);
      // Runtime delivery status is intentionally not serialized as graph data.
      Object.defineProperty(saved, 'storagePersisted', { value: result.storagePersisted, enumerable: false });
      return saved;
    }

    function listGraphs(filter) {
      var query = isObject(filter) ? filter : {};
      var resourceId = text(query.resourceId, 240);
      var kind = text(query.kind || query.graphKind, 100);
      var scopeId = text(query.scopeId, 240);
      return read().graphs.filter(function (entry) {
        if (kind && entry.graphKind !== kind) return false;
        if (scopeId && entry.scopeId !== scopeId) return false;
        if (resourceId && !entry.resourceRefs.some(function (ref) { return ref.id === resourceId; })) return false;
        return true;
      });
    }

    function getGraph(id, scopeId) {
      var wanted = text(id, 240);
      var wantedScope = text(scopeId, 240);
      return listGraphs(wantedScope ? { scopeId: wantedScope } : {}).filter(function (entry) { return entry.id === wanted; })[0] || null;
    }

    function getLatestForResource(resourceId, kind, scopeId) {
      return listGraphs({ resourceId: resourceId, kind: kind, scopeId: scopeId })[0] || null;
    }

    function getLatestForResources(resourceIds, kind, scopeId) {
      var wanted = {};
      (Array.isArray(resourceIds) ? resourceIds : []).forEach(function (id) {
        var normalized = text(id, 240);
        if (normalized) wanted[normalized] = true;
      });
      if (!Object.keys(wanted).length) return null;
      return listGraphs({ kind: kind, scopeId: scopeId }).filter(function (entry) {
        return entry.resourceRefs.some(function (ref) { return !!wanted[ref.id]; });
      })[0] || null;
    }

    function reconcileGraphs(values, reconcileOptions) {
      var reconcile = isObject(reconcileOptions) ? reconcileOptions : {};
      var scopeId = text(reconcile.scopeId, 240) || DEFAULT_SCOPE;
      var kind = text(reconcile.kind || reconcile.graphKind, 100);
      var now = clock();
      var current = read();
      var existingByKey = {};
      current.graphs.forEach(function (entry) { existingByKey[entry.scopeId + '|' + entry.id] = entry; });
      var incoming = [];
      var incomingIds = {};
      (Array.isArray(values) ? values : []).forEach(function (value) {
        if (!isObject(value)) return;
        var entry = normalizeEntry(value, { scopeId: scopeId, now: now });
        if (!entry || (kind && entry.graphKind !== kind) || incomingIds[entry.id]) return;
        var existing = existingByKey[scopeId + '|' + entry.id];
        if (existing) entry.createdAt = existing.createdAt;
        incomingIds[entry.id] = true;
        incoming.push(entry);
      });
      var removedIds = [];
      var retained = current.graphs.filter(function (entry) {
        // Unscoped v1 entries predate project isolation. Once an explicit
        // project is reconciled, discard only legacy entries of the same kind
        // so they cannot be selected from a different project later.
        var managedScope = entry.scopeId === scopeId
          || (scopeId !== DEFAULT_SCOPE && entry.scopeId === DEFAULT_SCOPE);
        var managed = managedScope && (!kind || entry.graphKind === kind);
        if (managed && !incomingIds[entry.id]) removedIds.push(entry.id);
        return !managed;
      });
      var result = write({ version: VERSION, graphs: incoming.concat(retained) });
      return {
        entries: incoming.map(clone),
        removedIds: removedIds,
        snapshot: result.snapshot,
        storagePersisted: result.storagePersisted
      };
    }

    function removeGraph(id, scopeId) {
      var wanted = text(id, 240);
      var wantedScope = text(scopeId, 240);
      var snapshot = read();
      var nextGraphs = snapshot.graphs.filter(function (entry) {
        return entry.id !== wanted || (wantedScope && entry.scopeId !== wantedScope);
      });
      if (nextGraphs.length === snapshot.graphs.length) return false;
      snapshot.graphs = nextGraphs;
      write(snapshot);
      return true;
    }

    function removeScope(scopeId) {
      var wantedScope = text(scopeId, 240);
      if (!wantedScope) return { removedIds: [], storagePersisted: false };
      var snapshot = read();
      var removedIds = snapshot.graphs.filter(function (entry) {
        return entry.scopeId === wantedScope;
      }).map(function (entry) { return entry.id; });
      if (!removedIds.length) return { removedIds: [], storagePersisted: true };
      snapshot.graphs = snapshot.graphs.filter(function (entry) { return entry.scopeId !== wantedScope; });
      var result = write(snapshot);
      return { removedIds: removedIds, storagePersisted: result.storagePersisted };
    }

    function importSnapshot(raw, importOptions) {
      // Import is a schema boundary: unlike a corrupt local cache, an unknown
      // future version must be rejected rather than silently rewritten as v1.
      if (!isObject(raw) || raw.version !== VERSION) return null;
      var incoming = normalizeSnapshot(raw);
      if (!incoming) return null;
      var merge = !importOptions || importOptions.merge !== false;
      if (!merge) return write(incoming).snapshot;
      var current = read();
      var combined = incoming.graphs.concat(current.graphs);
      return write({ version: VERSION, graphs: combined }).snapshot;
    }

    return {
      version: VERSION,
      storageKey: storageKey,
      read: read,
      saveGraph: saveGraph,
      listGraphs: listGraphs,
      getGraph: getGraph,
      getLatestForResource: getLatestForResource,
      getLatestForResources: getLatestForResources,
      reconcileGraphs: reconcileGraphs,
      removeGraph: removeGraph,
      removeScope: removeScope,
      exportSnapshot: read,
      importSnapshot: importSnapshot
    };
  }

  function getDefaultRegistry() {
    if (!defaultRegistry) defaultRegistry = createRegistry();
    return defaultRegistry;
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') return function () {};
    listeners.push(listener);
    return function () {
      listeners = listeners.filter(function (candidate) { return candidate !== listener; });
    };
  }

  var API = {
    VERSION: VERSION,
    STORAGE_KEY: STORAGE_KEY,
    LIMITS: { graphs: MAX_GRAPHS, nodes: MAX_NODES, edges: MAX_EDGES, resources: MAX_RESOURCES },
    DEFAULT_SCOPE: DEFAULT_SCOPE,
    normalizeGraph: normalizeGraph,
    normalizeEntry: normalizeEntry,
    normalizeSnapshot: normalizeSnapshot,
    createRegistry: createRegistry,
    getDefaultRegistry: getDefaultRegistry,
    subscribe: subscribe
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') {
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.LearningWebRegistry = API;
  }
})();
