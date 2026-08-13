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
  var MAX_METADATA_DEPTH = 6;
  var MAX_METADATA_KEYS = 80;
  var MAX_METADATA_ARRAY = 600;
  var MAX_METADATA_ITEMS = 16000;
  var MAX_GRAPH_TEXT = 400000;
  var MAX_EDGE_SOURCE_DETAILS = 16;
  var MAX_EDGE_SOURCE_DETAIL_TEXT = 12000;
  var DEFAULT_SCOPE = 'workspace:default';
  var GRAPH_KINDS = {
    ALIGNMENT: 'alignment-map',
    UNIT: 'unit-path',
    CONCEPT: 'concept-map',
    LEXICAL: 'lexical-graph',
    RESOURCES: 'project-resources',
    UNIFIED: 'learning-web'
  };
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

  var BLOCKED_KEYS = { '__proto__': 1, constructor: 1, prototype: 1 };

  // Registry imports and history reconciliation are schema boundaries. Keep
  // metadata useful, but never let one small graph smuggle unbounded strings,
  // deep structures, executable values, or prototype-mutating keys into the
  // durable index.
  function sanitizeValue(value, options, depth, budget) {
    var opts = options || {};
    var level = depth || 0;
    var state = budget || { items: 0, chars: 0 };
    var maxDepth = Number(opts.maxDepth) || MAX_METADATA_DEPTH;
    var maxItems = Number(opts.maxItems) || MAX_METADATA_ITEMS;
    var maxChars = Number(opts.maxChars) || MAX_GRAPH_TEXT;
    var stringLimit = Number(opts.stringLimit) || MAX_TEXT;
    var arrayLimit = Number(opts.arrayLimit) || MAX_METADATA_ARRAY;
    var keyLimit = Number(opts.keyLimit) || MAX_METADATA_KEYS;
    if (state.items >= maxItems || level > maxDepth) return undefined;
    state.items++;
    if (value === null || typeof value === 'boolean') return value;
    if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
    if (typeof value === 'string') {
      var remaining = Math.max(0, maxChars - state.chars);
      if (!remaining) return '';
      var result = text(value, Math.min(stringLimit, remaining));
      state.chars += result.length;
      return result;
    }
    if (Array.isArray(value)) {
      var list = [];
      for (var ai = 0; ai < value.length && ai < arrayLimit && state.items < maxItems; ai++) {
        var item = sanitizeValue(value[ai], opts, level + 1, state);
        if (item !== undefined) list.push(item);
      }
      return list;
    }
    if (!isObject(value)) return undefined;
    var out = {};
    var keys = Object.keys(value).filter(function (key) { return !BLOCKED_KEYS[key]; }).sort().slice(0, keyLimit);
    for (var oi = 0; oi < keys.length && state.items < maxItems; oi++) {
      var key = keys[oi];
      var next = sanitizeValue(value[key], opts, level + 1, state);
      if (next !== undefined) out[key] = next;
    }
    return out;
  }

  function sanitizeMetadata(value) {
    var result = sanitizeValue(value, {
      maxDepth: MAX_METADATA_DEPTH,
      maxItems: 2000,
      maxChars: 40000,
      stringLimit: MAX_TEXT,
      arrayLimit: 160,
      keyLimit: MAX_METADATA_KEYS
    }, 0, { items: 0, chars: 0 });
    return isObject(result) ? result : {};
  }

  function safeHttpsUrl(value) {
    var candidate = text(value, 800);
    if (!candidate || !/^https:\/\//i.test(candidate)) return '';
    try {
      var parsed = new URL(candidate);
      return parsed.protocol === 'https:' ? candidate : '';
    } catch (_) {
      return '';
    }
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
    var ref = {
      id: id,
      type: text(raw.type || raw.resourceType || raw.artifactType, 100) || 'resource',
      title: text(raw.title || raw.label || raw.name, 320) || ('Resource ' + (index + 1))
    };
    var role = text(raw.role, 100);
    var relationType = text(raw.relationType || raw.relationship, 100);
    var unitId = text(raw.unitId, 240);
    var sourceUrl = safeHttpsUrl(raw.sourceUrl || raw.url);
    if (role) ref.role = role;
    if (relationType) ref.relationType = relationType;
    if (unitId) ref.unitId = unitId;
    if (sourceUrl) ref.sourceUrl = sourceUrl;
    if (isObject(raw.provenance)) ref.provenance = sanitizeMetadata(raw.provenance);
    return ref;
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
    var budget = { items: 0, chars: 0 };
    var graph = {};
    Object.keys(raw).filter(function (key) {
      return key !== 'nodes' && key !== 'edges' && !BLOCKED_KEYS[key];
    }).sort().slice(0, MAX_METADATA_KEYS).forEach(function (key) {
      var next = sanitizeValue(raw[key], {
        maxDepth: MAX_METADATA_DEPTH,
        maxItems: MAX_METADATA_ITEMS,
        maxChars: MAX_GRAPH_TEXT,
        stringLimit: MAX_TEXT,
        arrayLimit: MAX_METADATA_ARRAY,
        keyLimit: MAX_METADATA_KEYS
      }, 1, budget);
      if (next !== undefined) graph[key] = next;
    });
    var nodeIds = {};
    graph.nodes = raw.nodes.map(function (rawNode) {
      if (!isObject(rawNode)) return null;
      var id = text(rawNode.id, 240);
      if (!id || nodeIds[id]) return null;
      var node = sanitizeValue(rawNode, {
        maxDepth: MAX_METADATA_DEPTH,
        maxItems: MAX_METADATA_ITEMS,
        maxChars: MAX_GRAPH_TEXT,
        stringLimit: MAX_TEXT,
        arrayLimit: MAX_METADATA_ARRAY,
        keyLimit: MAX_METADATA_KEYS
      }, 1, budget);
      if (!isObject(node)) return null;
      node.id = id;
      nodeIds[id] = true;
      return node;
    }).filter(Boolean);
    graph.edges = raw.edges.map(function (rawEdge) {
      if (!isObject(rawEdge)) return null;
      var source = text(rawEdge.source || rawEdge.from || rawEdge.fromId, 240);
      var target = text(rawEdge.target || rawEdge.to || rawEdge.toId, 240);
      if (!source || !target || !nodeIds[source] || !nodeIds[target]) return null;
      var edge = sanitizeValue(rawEdge, {
        maxDepth: MAX_METADATA_DEPTH,
        maxItems: MAX_METADATA_ITEMS,
        maxChars: MAX_GRAPH_TEXT,
        stringLimit: MAX_TEXT,
        arrayLimit: MAX_METADATA_ARRAY,
        keyLimit: MAX_METADATA_KEYS
      }, 1, budget);
      if (!isObject(edge)) return null;
      if (rawEdge.fromId !== undefined || (rawEdge.source === undefined && rawEdge.from === undefined)) {
        delete edge.source; delete edge.target; delete edge.from; delete edge.to;
        edge.fromId = source; edge.toId = target;
      } else if (rawEdge.from !== undefined) {
        delete edge.source; delete edge.target; delete edge.fromId; delete edge.toId;
        edge.from = source; edge.to = target;
      } else {
        delete edge.from; delete edge.to; delete edge.fromId; delete edge.toId;
        edge.source = source; edge.target = target;
      }
      return edge;
    }).filter(Boolean);
    graph.version = 'acg/v1';
    return graph;
  }

  function normalizeGraphKind(value) {
    var kind = text(value, 100).toLowerCase();
    var aliases = {
      alignment: GRAPH_KINDS.ALIGNMENT,
      'alignment-map': GRAPH_KINDS.ALIGNMENT,
      'alignment-graph': GRAPH_KINDS.ALIGNMENT,
      throughline: GRAPH_KINDS.UNIT,
      unit: GRAPH_KINDS.UNIT,
      'unit-path': GRAPH_KINDS.UNIT,
      organizer: GRAPH_KINDS.CONCEPT,
      'visual-organizer': GRAPH_KINDS.CONCEPT,
      concept: GRAPH_KINDS.CONCEPT,
      'concept-map': GRAPH_KINDS.CONCEPT,
      lexical: GRAPH_KINDS.LEXICAL,
      etymology: GRAPH_KINDS.LEXICAL,
      'lexical-graph': GRAPH_KINDS.LEXICAL,
      resources: GRAPH_KINDS.RESOURCES,
      catalog: GRAPH_KINDS.RESOURCES,
      'project-resources': GRAPH_KINDS.RESOURCES,
      unified: GRAPH_KINDS.UNIFIED,
      'learning-web': GRAPH_KINDS.UNIFIED
    };
    return aliases[kind] || kind;
  }

  function inferGraphKind(graph, metadata) {
    var explicit = normalizeGraphKind(metadata && (metadata.kind || metadata.graphKind));
    if (explicit) return explicit;
    var meta = graph && graph.meta;
    if (meta && (meta.alignmentMap || meta.alignmentAudit)) return GRAPH_KINDS.ALIGNMENT;
    if (meta && (meta.lexicalGraph || meta.lexicalGraphVersion || meta.domain === 'lexical')) return GRAPH_KINDS.LEXICAL;
    if (meta && (meta.throughline || meta.unitId)) return GRAPH_KINDS.UNIT;
    if (meta && (meta.conceptMap || meta.generated || meta.layout)) return GRAPH_KINDS.CONCEPT;
    if (meta && meta.learningWeb && meta.learningWeb.graphKind === GRAPH_KINDS.RESOURCES) return GRAPH_KINDS.RESOURCES;
    return GRAPH_KINDS.UNIFIED;
  }

  function stableSemanticString(value, maxChars) {
    var limit = Math.max(100, Math.min(Number(maxChars) || 12000, 40000));
    var chars = 0;
    function visit(item, depth) {
      if (chars >= limit || depth > MAX_METADATA_DEPTH) return '';
      if (item === null) { chars += 4; return 'null'; }
      if (typeof item === 'boolean' || typeof item === 'number') {
        var scalar = String(item); chars += scalar.length; return scalar;
      }
      if (typeof item === 'string') {
        var encoded = JSON.stringify(text(item, Math.min(MAX_TEXT, limit - chars)));
        chars += encoded.length; return encoded;
      }
      if (Array.isArray(item)) {
        var parts = [];
        for (var ai = 0; ai < item.length && ai < MAX_METADATA_ARRAY && chars < limit; ai++) parts.push(visit(item[ai], depth + 1));
        return '[' + parts.join(',') + ']';
      }
      if (!isObject(item)) return '';
      var pairs = [];
      Object.keys(item).filter(function (key) { return !BLOCKED_KEYS[key]; }).sort().slice(0, MAX_METADATA_KEYS).forEach(function (key) {
        if (chars >= limit) return;
        var encodedKey = JSON.stringify(key); chars += encodedKey.length;
        pairs.push(encodedKey + ':' + visit(item[key], depth + 1));
      });
      return '{' + pairs.join(',') + '}';
    }
    return visit(value, 0).slice(0, limit);
  }

  function graphFingerprint(graph) {
    // Identity includes sanitized semantic content, not topology alone. Hashing
    // each bounded canonical record keeps this deterministic without building
    // an unbounded intermediate string.
    var nodes = graph.nodes.map(function (node) {
      return text(node.id, 240) + ':' + stableHash(stableSemanticString(node, 12000));
    }).sort();
    var edges = graph.edges.map(function (edge) {
      return [
        text(edge.source || edge.from || edge.fromId, 240),
        text(edge.target || edge.to || edge.toId, 240),
        text(edge.type, 100),
        text(edge.relationType || edge.type, 100),
        stableHash(stableSemanticString(edge, 12000))
      ].join('>');
    }).sort();
    var identity = [
      graph.version,
      stableHash(stableSemanticString({ title: graph.title || '', meta: graph.meta || {} }, 40000)),
      nodes,
      edges
    ];
    return stableHash(JSON.stringify(identity));
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
    var createdAt = isoDate(source.createdAt || metadata.createdAt, now);
    var updatedAt = isoDate(metadata.updatedAt || source.updatedAt, now);
    var generationId = text(metadata.generationId || source.generationId, 160);
    if (!generationId) {
      generationId = 'legacy:' + stableHash(JSON.stringify([
        id, scopeId, kind, createdAt, updatedAt, graphFingerprint(graph)
      ]));
    }
    return {
      id: id,
      version: 'learning-web-entry/v1',
      generationId: generationId,
      graphKind: kind,
      scopeId: scopeId,
      title: text(metadata.title || source.title, 320) || (kind === 'alignment-map' ? 'Alignment Map' : 'Learning Web graph'),
      graph: graph,
      resourceRefs: inferResourceRefs(graph, Object.assign({}, source, metadata)),
      createdAt: createdAt,
      updatedAt: updatedAt,
      provenance: sanitizeMetadata(isObject(metadata.provenance) ? metadata.provenance : (isObject(source.provenance) ? source.provenance : {}))
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


  function identityId(prefix, value) {
    var raw = text(value, 1000);
    var full = String(prefix || '') + raw;
    if (full.length <= 240) return full;
    return full.slice(0, 224) + ':' + stableHash(full);
  }

  function resourceNodeId(resourceId) {
    return identityId('resource:', resourceId);
  }

  function unitNodeId(unitId) {
    return identityId('unit:', unitId);
  }

  function standardNodeId(record) {
    var contextId = text(record && (record.contextId || record.id), 240);
    if (contextId) return identityId('standard:', contextId);
    var framework = text(record && record.framework, 160);
    var code = text(record && record.code, 240);
    return framework && code ? identityId('standard:', framework + ':' + code) : '';
  }

  function entryCompositeKey(entry) {
    return JSON.stringify([
      text(entry && entry.scopeId, 240) || DEFAULT_SCOPE,
      text(entry && entry.id, 240)
    ]);
  }

  function entryNamespaceToken(entry) {
    // Preserve the compact v1 namespace token for non-colliding entries.
    // The allocator below treats this hash only as a display prefix and binds
    // identity to the exact JSON composite instead.
    return stableHash(text(entry && entry.scopeId, 240) + '|' + text(entry && entry.id, 240));
  }

  function entryNamespace(entry) {
    return 'graph:' + entryNamespaceToken(entry) + ':';
  }

  function collisionResolvedId(base, ordinal) {
    var suffix = '~' + String(ordinal);
    return base.slice(0, Math.max(1, 240 - suffix.length)) + suffix;
  }

  // Hashes are compact labels, never identity proofs. Allocate namespaces from
  // the full scope+entry composite, detect exact token collisions, and resolve
  // each collision group in lexical composite order. Reversing input therefore
  // produces byte-identical graph IDs.
  function createEntryNamespaceAllocator(entries) {
    var tokenByComposite = {};
    (Array.isArray(entries) ? entries : []).forEach(function (entry) {
      tokenByComposite[entryCompositeKey(entry)] = entryNamespaceToken(entry);
    });
    var groups = {};
    Object.keys(tokenByComposite).sort().forEach(function (composite) {
      var token = tokenByComposite[composite];
      if (!groups[token]) groups[token] = [];
      groups[token].push(composite);
    });
    var namespaces = {};
    Object.keys(groups).sort().forEach(function (token) {
      var group = groups[token].sort();
      group.forEach(function (composite, index) {
        namespaces[composite] = 'graph:' + token + (group.length > 1 ? '~' + String(index + 1) : '') + ':';
      });
    });
    return function (entry) {
      var composite = entryCompositeKey(entry);
      return namespaces[composite] || entryNamespace(entry);
    };
  }

  function canonicalNodeBaseId(node, entry) {
    var rawId = text(node && node.id, 240);
    var nodeType = text(node && node.type, 100).toLowerCase();
    var resourceId = text(node && (node.artifactId || ((nodeType === 'resource' || nodeType === 'auditartifact') ? node.resourceId : '')), 240);
    if (resourceId) return resourceNodeId(resourceId);
    var unitId = text(node && (node.unitId || (node.meta && node.meta.unitId)), 240);
    if (unitId && nodeType === 'unit') return unitNodeId(unitId);
    var standardsRecord = node && isObject(node.standardsContext) ? node.standardsContext : node;
    if (nodeType === 'standard' || nodeType === 'standardscontext') {
      var standardId = standardNodeId(standardsRecord);
      if (standardId) return standardId;
    }
    var kind = normalizeGraphKind(entry && entry.graphKind);
    if (kind === GRAPH_KINDS.LEXICAL && /^(?:lex|lexeme|sense|form|morph|morpheme|etymon):/i.test(rawId)) return identityId('', rawId);
    if (kind === GRAPH_KINDS.RESOURCES && /^(?:resource|unit|standard):/i.test(rawId)) return identityId('', rawId);
    return '';
  }

  function genericNodeCompositeKey(node, entry) {
    return JSON.stringify([entryCompositeKey(entry), text(node && node.id, 240)]);
  }

  // Namespace collision resolution handles the known compact-token risk. This
  // second allocation pass also detects any collision introduced by the 240
  // character output bound itself. Canonical IDs are reserved and still merge
  // intentionally; generic full composites never do.
  function createNodeIdentityAllocator(entries, namespaceForEntry) {
    var canonicalIds = {}, recordsByComposite = {};
    (Array.isArray(entries) ? entries : []).forEach(function (entry) {
      (entry.graph && Array.isArray(entry.graph.nodes) ? entry.graph.nodes : []).forEach(function (node) {
        var canonical = canonicalNodeBaseId(node, entry);
        if (canonical) { canonicalIds[canonical] = true; return; }
        var composite = genericNodeCompositeKey(node, entry);
        if (!recordsByComposite[composite]) {
          recordsByComposite[composite] = {
            composite: composite,
            base: identityId(namespaceForEntry(entry), text(node && node.id, 240) || stableHash(stableSemanticString(node, 12000)))
          };
        }
      });
    });
    var groups = {};
    Object.keys(recordsByComposite).sort().forEach(function (composite) {
      var record = recordsByComposite[composite];
      if (!groups[record.base]) groups[record.base] = [];
      groups[record.base].push(record);
    });
    var allocated = {}, used = {};
    Object.keys(canonicalIds).forEach(function (id) { used[id] = 'canonical'; });
    Object.keys(groups).sort().forEach(function (base) {
      var group = groups[base].sort(function (a, b) { return a.composite.localeCompare(b.composite); });
      group.forEach(function (record, index) {
        var ordinal = group.length > 1 || used[base] ? index + 1 : 0;
        var candidate = ordinal ? collisionResolvedId(base, ordinal) : base;
        while (used[candidate] && used[candidate] !== record.composite) {
          ordinal++;
          candidate = collisionResolvedId(base, ordinal);
        }
        used[candidate] = record.composite;
        allocated[record.composite] = candidate;
      });
    });
    return function (node, entry) {
      var canonical = canonicalNodeBaseId(node, entry);
      if (canonical) return canonical;
      var composite = genericNodeCompositeKey(node, entry);
      return allocated[composite] || identityId(namespaceForEntry(entry), text(node && node.id, 240));
    };
  }

  function canonicalNodeId(node, entry, nodeIdentityFor) {
    if (typeof nodeIdentityFor === 'function') return nodeIdentityFor(node, entry);
    var canonical = canonicalNodeBaseId(node, entry);
    if (canonical) return canonical;
    var rawId = text(node && node.id, 240);
    return identityId(entryNamespace(entry), rawId || stableHash(stableSemanticString(node, 12000)));
  }

  function createGraphBuilder(options) {
    var opts = isObject(options) ? options : {};
    return {
      maxNodes: Math.max(1, Math.min(MAX_NODES, Number(opts.maxNodes) || MAX_NODES)),
      maxEdges: Math.max(0, Math.min(MAX_EDGES, Number(opts.maxEdges) || MAX_EDGES)),
      nodes: [], edges: [], nodeById: {}, edgeByKey: {}, truncatedNodes: 0, truncatedEdges: 0
    };
  }

  function builderAddNode(builder, raw) {
    if (!isObject(raw)) return null;
    var node = sanitizeValue(raw, { maxDepth: MAX_METADATA_DEPTH, maxItems: 1200, maxChars: 30000, stringLimit: MAX_TEXT, arrayLimit: 160, keyLimit: MAX_METADATA_KEYS }, 0, { items: 0, chars: 0 });
    var id = text(node && node.id, 240);
    if (!id) return null;
    if (builder.nodeById[id]) return builder.nodeById[id];
    if (builder.nodes.length >= builder.maxNodes) { builder.truncatedNodes++; return null; }
    node.id = id;
    builder.nodeById[id] = node;
    builder.nodes.push(node);
    return node;
  }

  function edgeEndpoints(edge) {
    return {
      fromId: text(edge && (edge.fromId || edge.from || edge.source), 240),
      toId: text(edge && (edge.toId || edge.to || edge.target), 240)
    };
  }

  function builderAddEdge(builder, raw) {
    if (!isObject(raw)) return null;
    var endpoints = edgeEndpoints(raw);
    if (!endpoints.fromId || !endpoints.toId || endpoints.fromId === endpoints.toId) return null;
    if (!builder.nodeById[endpoints.fromId] || !builder.nodeById[endpoints.toId]) return null;
    var type = text(raw.type, 100) || 'relatedTo';
    var relationType = text(raw.relationType, 100) || type;
    var key = endpoints.fromId + '|' + endpoints.toId + '|' + type + '|' + relationType;
    if (builder.edgeByKey[key]) return builder.edgeByKey[key];
    if (builder.edges.length >= builder.maxEdges) { builder.truncatedEdges++; return null; }
    var edge = sanitizeValue(raw, { maxDepth: MAX_METADATA_DEPTH, maxItems: 800, maxChars: 20000, stringLimit: MAX_TEXT, arrayLimit: 160, keyLimit: MAX_METADATA_KEYS }, 0, { items: 0, chars: 0 });
    edge.fromId = endpoints.fromId;
    edge.toId = endpoints.toId;
    delete edge.from; delete edge.to; delete edge.source; delete edge.target;
    edge.type = type;
    edge.relationType = relationType;
    edge.id = text(edge.id, 240) || identityId('edge:', stableHash(key));
    builder.edgeByKey[key] = edge;
    builder.edges.push(edge);
    return edge;
  }

  function resourceRefFromResource(resource, index) {
    if (!isObject(resource)) return null;
    var id = text(resource.id || resource.resourceId || resource.artifactId, 240);
    if (!id) id = 'history-' + index + '-' + stableHash(text(resource.type, 100) + '|' + text(resource.title, 320));
    return normalizeResourceRef({
      id: id,
      type: resource.type || resource.resourceType || 'resource',
      title: resource.title || resource.name || ('Resource ' + (index + 1)),
      role: resource.role,
      unitId: resource.unitId,
      provenance: resource.provenance
    }, index);
  }

  function nativeUnitToGraph(unit, title) {
    if (!isObject(unit) || !Array.isArray(unit.nodes)) return null;
    var nodes = unit.nodes.map(function (node, index) {
      if (!isObject(node)) return null;
      var id = text(node.nodeId || node.id, 240) || ('lesson-' + index);
      return Object.assign({}, node, {
        id: id,
        label: text(node.label || node.title || node.description, 320) || ('Lesson ' + (index + 1)),
        type: text(node.type, 100) || 'lesson'
      });
    }).filter(Boolean);
    var edges = (Array.isArray(unit.edges) ? unit.edges : []).map(function (edge) {
      return {
        id: text(edge && edge.id, 240),
        fromId: text(edge && (edge.fromId || edge.from), 240),
        toId: text(edge && (edge.toId || edge.to), 240),
        type: text(edge && edge.type, 100) || 'sequence',
        relationType: text(edge && edge.relationType, 100) || text(edge && edge.type, 100) || 'sequence'
      };
    });
    return normalizeGraph({
      version: 'acg/v1', title: text(unit.title || title, 320), nodes: nodes, edges: edges,
      meta: { throughline: sanitizeMetadata(Object.assign({}, unit, { nodes: undefined, edges: undefined })) }
    });
  }

  function generatedOrganizerToGraph(data, title) {
    if (!isObject(data) || (data.main === undefined && !Array.isArray(data.branches))) return null;
    var nodes = [{ id: 'root', label: text(data.main || title, 320) || 'Main topic', type: 'main', category: null }];
    var edges = [];
    (Array.isArray(data.branches) ? data.branches : []).slice(0, 80).forEach(function (branch, branchIndex) {
      branch = isObject(branch) ? branch : {};
      var branchId = 'branch-' + branchIndex;
      var branchTitle = text(branch.title, 320) || ('Branch ' + (branchIndex + 1));
      nodes.push({ id: branchId, label: branchTitle, type: 'branch', category: branchTitle, sectionRole: text(branch.sectionRole || branch.role, 100) });
      edges.push({ fromId: 'root', toId: branchId, type: 'elaborates', relationType: 'elaborates' });
      (Array.isArray(branch.items) ? branch.items : []).slice(0, 80).forEach(function (item, itemIndex) {
        var itemId = branchId + '-item-' + itemIndex;
        var label = isObject(item) ? text(item.text || item.label, 320) : text(item, 320);
        if (!label) return;
        nodes.push({ id: itemId, label: label, type: 'item', category: branchTitle });
        edges.push({ fromId: branchId, toId: itemId, type: 'elaborates', relationType: 'elaborates' });
      });
    });
    return normalizeGraph({
      version: 'acg/v1', title: text(title || data.main, 320), nodes: nodes, edges: edges,
      meta: { generated: { structureType: text(data.structureType, 160) || null } }
    });
  }

  function explicitConceptGraph(data, title) {
    if (!isObject(data) || !Array.isArray(data.nodes) || data.nodes.some(function (node) { return node && node.nodeId !== undefined; })) return null;
    return normalizeGraph({
      version: 'acg/v1', title: text(title, 320),
      nodes: data.nodes.map(function (node) {
        return isObject(node) ? Object.assign({}, node, { id: text(node.id, 240), label: text(node.label || node.text, 320) }) : node;
      }),
      edges: Array.isArray(data.edges) ? data.edges : [],
      meta: { conceptMap: { structureType: text(data.structureType, 160) || null } }
    });
  }

  function appendGraph(builder, graph, sourceEntry, resourceId) {
    var normalized = normalizeGraph(graph);
    if (!normalized) return;
    var aliases = {};
    normalized.nodes.slice().sort(function (a, b) { return String(a.id).localeCompare(String(b.id)); }).forEach(function (node) {
      var id = canonicalNodeId(node, sourceEntry);
      aliases[node.id] = id;
      var copy = Object.assign({}, node, { id: id });
      copy.learningWeb = { sourceEntryIds: [sourceEntry.id], sourceGraphKinds: [sourceEntry.graphKind] };
      builderAddNode(builder, copy);
    });
    normalized.edges.slice().sort(function (a, b) {
      var ae = edgeEndpoints(a), be = edgeEndpoints(b);
      return (ae.fromId + '|' + ae.toId + '|' + text(a.type, 100)).localeCompare(be.fromId + '|' + be.toId + '|' + text(b.type, 100));
    }).forEach(function (edge) {
      var endpoints = edgeEndpoints(edge);
      if (!aliases[endpoints.fromId] || !aliases[endpoints.toId]) return;
      var added = builderAddEdge(builder, Object.assign({}, edge, {
        id: identityId('edge:', stableHash(sourceEntry.id + '|' + text(edge.id, 240) + '|' + endpoints.fromId + '|' + endpoints.toId)),
        fromId: aliases[endpoints.fromId], toId: aliases[endpoints.toId]
      }));
      if (added) mergeEdgeSourceDetails(added, sourceEntry, edge);
    });
    if (!resourceId || !builder.nodeById[resourceNodeId(resourceId)]) return;
    var focus = text(normalized.meta && (normalized.meta.focusId || (normalized.meta.lexicalGraph && normalized.meta.lexicalGraph.focusId)), 240);
    var rootRaw = focus && aliases[focus] ? focus : '';
    if (!rootRaw) {
      var candidates = normalized.nodes.slice().sort(function (a, b) {
        var rank = { audit: 0, main: 1, unit: 2, root: 3, standard: 4 };
        var ar = rank[text(a.type, 100).toLowerCase()]; if (ar === undefined) ar = 9;
        var br = rank[text(b.type, 100).toLowerCase()]; if (br === undefined) br = 9;
        return ar - br || String(a.id).localeCompare(String(b.id));
      });
      rootRaw = candidates[0] && candidates[0].id;
    }
    var rootId = rootRaw && aliases[rootRaw];
    var targetId = resourceNodeId(resourceId);
    if (rootId && rootId !== targetId) {
      var connector = {
        id: identityId('edge:', stableHash(sourceEntry.id + '|generatedFor|' + resourceId)),
        fromId: rootId, toId: targetId, type: 'generatedFor', relationType: 'resourceRef',
        provenance: sanitizeMetadata(sourceEntry.provenance || {})
      };
      var addedConnector = builderAddEdge(builder, connector);
      if (addedConnector) mergeEdgeSourceDetails(addedConnector, sourceEntry, connector);
    }
  }

  function findStandardsContexts(resource) {
    var data = isObject(resource && resource.data) ? resource.data : {};
    var comprehensive = isObject(data.comprehensive) ? data.comprehensive : {};
    var standards = isObject(comprehensive.standards) ? comprehensive.standards : {};
    var candidates = [resource && resource.standardsContext, data.standardsContext, comprehensive.standardsContext, standards.standardsContext];
    if (isObject(data.blueprint)) candidates.push(data.blueprint.standardsContext);
    var seen = {};
    return candidates.filter(function (candidate) {
      if (!isObject(candidate) || text(candidate.resolutionStatus, 40).toLowerCase() !== 'resolved' || !Array.isArray(candidate.standards)) return false;
      var key = text(candidate.provider, 160) + '|' + text(candidate.datasetVersion, 160) + '|' + candidate.standards.map(function (record) { return text(record && (record.id || record.code), 240); }).join(',');
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function addStandardsContext(builder, resource, resourceRef) {
    findStandardsContexts(resource).forEach(function (context) {
      context.standards.slice(0, 100).forEach(function (record) {
        if (!isObject(record)) return;
        var id = standardNodeId(record);
        if (!id) return;
        builderAddNode(builder, {
          id: id,
          label: text(record.label || record.code, 320) || 'Standard',
          description: text(record.text || record.description, MAX_TEXT),
          type: 'standard', category: 'Standards', contextId: text(record.id, 240),
          code: text(record.code, 240), framework: text(record.framework, 160),
          sourceUrl: safeHttpsUrl(record.sourceUrl),
          provenance: sanitizeMetadata(context.provenance || { provider: context.provider, datasetVersion: context.datasetVersion, snapshotId: context.snapshotId })
        });
        builderAddEdge(builder, {
          id: identityId('edge:', stableHash(resourceRef.id + '|alignedTo|' + id)),
          fromId: resourceNodeId(resourceRef.id), toId: id, type: 'alignedTo', relationType: 'resolvedStandardsContext',
          provenance: sanitizeMetadata(context.provenance || { provider: context.provider, datasetVersion: context.datasetVersion, snapshotId: context.snapshotId })
        });
      });
    });
  }

  function hasReviewedProvenance(root) {
    if (!isObject(root) || !isObject(root.provenance)) return false;
    var verification = text(root.verification, 60).toLowerCase();
    if (verification !== 'reviewed' && verification !== 'verified' && verification !== 'teacher-confirmed') return false;
    var provenance = root.provenance;
    return !!text(provenance.provider || provenance.attribution || provenance.reviewedAt, 240);
  }

  function addGlossaryConnections(builder, resource, resourceRef) {
    var rows = Array.isArray(resource && resource.data) ? resource.data : [];
    rows.slice(0, 160).forEach(function (row, rowIndex) {
      if (!isObject(row)) return;
      var term = text(row.term || row.word, 320);
      if (!term) return;
      var termId = identityId('graph:' + stableHash(resourceRef.id) + ':term:', row.id || term.toLowerCase() + ':' + rowIndex);
      builderAddNode(builder, { id: termId, label: term, description: text(row.def || row.definition, MAX_TEXT), type: 'glossaryTerm', category: 'Vocabulary', resourceId: resourceRef.id });
      builderAddEdge(builder, { fromId: resourceNodeId(resourceRef.id), toId: termId, type: 'contains', relationType: 'glossaryTerm' });
      (Array.isArray(row.roots) ? row.roots : []).slice(0, 24).forEach(function (root, rootIndex) {
        if (!isObject(root)) return;
        var form = text(root.root || root.form || root.label, 240);
        if (!form) return;
        var reviewed = hasReviewedProvenance(root);
        var rootId = identityId('graph:' + stableHash(resourceRef.id) + ':root:', (reviewed && root.id) || form.toLowerCase() + ':' + rootIndex);
        var verification = reviewed ? text(root.verification, 60).toLowerCase() : 'ai-suggested';
        builderAddNode(builder, {
          id: rootId, label: form, description: text(root.meaning, MAX_TEXT), type: 'morpheme', category: 'Word parts',
          language: text(root.lang || root.language, 100), verification: verification,
          provenance: reviewed ? sanitizeMetadata(root.provenance) : { verification: 'ai-suggested', source: 'glossary-generation' }
        });
        builderAddEdge(builder, {
          fromId: termId, toId: rootId, type: 'relatedTo', relationType: 'containsMorpheme', verification: verification,
          provenance: reviewed ? sanitizeMetadata(root.provenance) : { verification: 'ai-suggested', source: 'glossary-generation' }
        });
      });
    });
  }

  // Pure history/resource adapter. It creates exactly one catalog graph so a
  // large project does not consume one registry entry per ordinary artifact.
  // Only explicit structure is indexed; prose is never mined for relationships.
  function graphFromResources(values, options) {
    var opts = isObject(options) ? options : {};
    var resources = Array.isArray(values) ? values.slice(0, MAX_RESOURCES) : [];
    var scopeId = text(opts.scopeId, 240) || DEFAULT_SCOPE;
    var builder = createGraphBuilder(opts);
    var refs = [];
    resources.map(function (resource, index) { return { resource: resource, index: index, ref: resourceRefFromResource(resource, index) }; })
      .filter(function (item) { return item.ref; })
      .sort(function (a, b) { return (a.ref.id + '|' + a.index).localeCompare(b.ref.id + '|' + b.index); })
      .forEach(function (item) {
        var resource = item.resource;
        var ref = item.ref;
        refs.push(ref);
        builderAddNode(builder, {
          id: resourceNodeId(ref.id), label: ref.title, type: 'resource', category: 'Resources',
          resourceId: ref.id, resourceType: ref.type, unitId: text(resource.unitId, 240),
          timestamp: isoDate(resource.updatedAt || resource.timestamp || resource.createdAt, null),
          provenance: sanitizeMetadata(resource.provenance || {})
        });
        var unitId = text(resource.unitId, 240);
        if (unitId) {
          var uid = unitNodeId(unitId);
          builderAddNode(builder, { id: uid, label: text(resource.unitTitle || resource.unitName, 320) || ('Unit ' + unitId), type: 'unit', category: 'Units', unitId: unitId });
          builderAddEdge(builder, { fromId: uid, toId: resourceNodeId(ref.id), type: 'contains', relationType: 'unitContainsResource' });
        }
        addStandardsContext(builder, resource, ref);
        (Array.isArray(resource.resourcePlan) ? resource.resourcePlan : []).slice(0, 80).forEach(function (row, planIndex) {
          if (!isObject(row)) return;
          var planKey = text(row.resourceId || row.uiId || row.stepId || row.id, 240) || ('step-' + planIndex);
          var planId = identityId('planned-resource:' + ref.id + ':', planKey);
          builderAddNode(builder, {
            id: planId,
            label: text(row.title || row.name || row.label || row.resourceType || row.type, 320) || ('Planned resource ' + (planIndex + 1)),
            type: 'plannedResource', category: 'Planned resources',
            resourceType: text(row.resourceType || row.type, 100),
            planStepId: planKey, status: text(row.status, 80),
            provenance: sanitizeMetadata(row.provenance || {})
          });
          builderAddEdge(builder, {
            id: identityId('edge:', stableHash(ref.id + '|plans|' + planKey)),
            fromId: resourceNodeId(ref.id), toId: planId,
            type: 'contains', relationType: 'plans',
            provenance: sanitizeMetadata(resource.provenance || {})
          });
        });
        var data = isObject(resource.data) ? resource.data : {};
        var comprehensive = isObject(data.comprehensive) ? data.comprehensive : {};
        var candidates = [];
        if (opts.includeEmbeddedAlignment !== false) {
          candidates.push(
            { graph: comprehensive.alignmentMapGraph, kind: GRAPH_KINDS.ALIGNMENT, key: 'alignment' },
            { graph: data.alignmentMapGraph, kind: GRAPH_KINDS.ALIGNMENT, key: 'alignment-data' }
          );
        }
        candidates.push(
          { graph: data.lexicalGraph, kind: GRAPH_KINDS.LEXICAL, key: 'lexical' },
          { graph: data.conceptGraph, kind: GRAPH_KINDS.CONCEPT, key: 'concept' }
        );
        var seenGraphs = {};
        candidates.forEach(function (candidate) {
          var graph = normalizeGraph(candidate.graph);
          if (!graph) return;
          var fingerprint = graphFingerprint(graph);
          if (seenGraphs[fingerprint]) return;
          seenGraphs[fingerprint] = true;
          appendGraph(builder, graph, { id: 'resource-shape:' + ref.id + ':' + candidate.key, scopeId: scopeId, graphKind: candidate.kind, provenance: resource.provenance || {} }, ref.id);
        });
        var unitLayout = resource.unitLayout || data.unitLayout;
        var unitGraph = nativeUnitToGraph(unitLayout, ref.title);
        if (unitGraph) appendGraph(builder, unitGraph, { id: 'resource-shape:' + ref.id + ':unit', scopeId: scopeId, graphKind: GRAPH_KINDS.UNIT, provenance: resource.provenance || {} }, ref.id);
        var conceptGraph = explicitConceptGraph(data, ref.title);
        if (conceptGraph) appendGraph(builder, conceptGraph, { id: 'resource-shape:' + ref.id + ':concept-native', scopeId: scopeId, graphKind: GRAPH_KINDS.CONCEPT, provenance: resource.provenance || {} }, ref.id);
        var generatedGraph = generatedOrganizerToGraph(data, ref.title);
        if (generatedGraph) appendGraph(builder, generatedGraph, { id: 'resource-shape:' + ref.id + ':organizer', scopeId: scopeId, graphKind: GRAPH_KINDS.CONCEPT, provenance: resource.provenance || {} }, ref.id);
        if (ref.type === 'glossary' || Array.isArray(resource.data)) addGlossaryConnections(builder, resource, ref);
      });
    builder.nodes.sort(function (a, b) { return String(a.id).localeCompare(String(b.id)); });
    builder.edges.sort(function (a, b) { return String(a.id).localeCompare(String(b.id)); });
    return {
      version: 'acg/v1', title: text(opts.title, 320) || 'Project resources', axes: null,
      nodes: builder.nodes, edges: builder.edges, layers: [],
      meta: { learningWeb: {
        version: VERSION, graphKind: GRAPH_KINDS.RESOURCES, scopeId: scopeId,
        resourceRefs: normalizeResourceRefs(refs),
        counts: { resources: refs.length, nodes: builder.nodes.length, edges: builder.edges.length },
        truncated: { resources: Array.isArray(values) && values.length > resources.length, nodes: builder.truncatedNodes > 0, edges: builder.truncatedEdges > 0 }
      } }
    };
  }

  function graphFromResource(value, options) {
    return graphFromResources([value], options);
  }

  function mergeSourceTag(target, entry) {
    var prior = isObject(target.learningWeb) ? target.learningWeb : {};
    var ids = Array.isArray(prior.sourceEntryIds) ? prior.sourceEntryIds.slice() : [];
    var kinds = Array.isArray(prior.sourceGraphKinds) ? prior.sourceGraphKinds.slice() : [];
    var entryId = text(entry && entry.id, 240);
    var graphKind = normalizeGraphKind(entry && entry.graphKind);
    if (entryId && ids.indexOf(entryId) < 0) ids.push(entryId);
    if (graphKind && kinds.indexOf(graphKind) < 0) kinds.push(graphKind);
    ids.sort(); kinds.sort();
    target.learningWeb = Object.assign({}, prior, { sourceEntryIds: ids, sourceGraphKinds: kinds });
  }

  function sanitizeEdgeDetailValue(value) {
    return sanitizeValue(value, {
      maxDepth: 4,
      maxItems: 240,
      maxChars: 2400,
      stringLimit: MAX_TEXT,
      arrayLimit: 80,
      keyLimit: 48
    }, 0, { items: 0, chars: 0 });
  }

  function normalizeEdgeSourceDetail(raw, fallbackEntry) {
    var value = isObject(raw) ? raw : {};
    var entryId = text(value.entryId || (fallbackEntry && fallbackEntry.id), 240);
    if (!entryId) return null;
    var detail = {
      entryId: entryId,
      graphKind: normalizeGraphKind(value.graphKind || (fallbackEntry && fallbackEntry.graphKind)) || 'unknown'
    };
    ['provenance', 'evidence', 'explanation', 'status', 'attributionSource'].forEach(function (field) {
      if (value[field] === undefined) return;
      var cleaned = sanitizeEdgeDetailValue(value[field]);
      if (cleaned !== undefined) detail[field] = cleaned;
    });
    return detail;
  }

  function edgeSourceDetail(entry, edge) {
    var raw = { entryId: entry && entry.id, graphKind: entry && entry.graphKind };
    ['provenance', 'evidence', 'explanation', 'status', 'attributionSource'].forEach(function (field) {
      if (edge && edge[field] !== undefined) raw[field] = edge[field];
    });
    return normalizeEdgeSourceDetail(raw, entry);
  }

  function sourceDetailSortKey(detail) {
    return detail.entryId + '|' + detail.graphKind + '|' + stableHash(JSON.stringify(detail));
  }

  function mergeEdgeSourceDetails(target, entry, sourceEdge) {
    if (!isObject(target)) return;
    var prior = isObject(target.learningWeb) ? target.learningWeb : {};
    var candidates = [];
    (Array.isArray(prior.sourceDetails) ? prior.sourceDetails : []).forEach(function (detail) {
      var normalized = normalizeEdgeSourceDetail(detail);
      if (normalized) candidates.push(normalized);
    });
    var incomingWeb = sourceEdge && isObject(sourceEdge.learningWeb) ? sourceEdge.learningWeb : {};
    (Array.isArray(incomingWeb.sourceDetails) ? incomingWeb.sourceDetails : []).forEach(function (detail) {
      var normalized = normalizeEdgeSourceDetail(detail);
      if (normalized) candidates.push(normalized);
    });
    // Add honest compatibility placeholders for older additive v1 graphs that
    // already claimed source ids but predate per-source detail records.
    var priorIds = (Array.isArray(prior.sourceEntryIds) ? prior.sourceEntryIds : [])
      .concat(Array.isArray(incomingWeb.sourceEntryIds) ? incomingWeb.sourceEntryIds : []);
    var priorKinds = (Array.isArray(prior.sourceGraphKinds) ? prior.sourceGraphKinds : [])
      .concat(Array.isArray(incomingWeb.sourceGraphKinds) ? incomingWeb.sourceGraphKinds : []);
    var legacyKind = priorKinds.length === 1 ? normalizeGraphKind(priorKinds[0]) : 'unknown';
    priorIds.forEach(function (entryId) {
      var normalizedId = text(entryId, 240);
      if (!normalizedId) return;
      var alreadyDetailed = candidates.some(function (detail) { return detail.entryId === normalizedId; });
      if (!alreadyDetailed) candidates.push({ entryId: normalizedId, graphKind: legacyKind || 'unknown' });
    });
    var direct = edgeSourceDetail(entry, sourceEdge);
    if (direct) candidates.push(direct);

    var byExactDetail = {};
    candidates.sort(function (a, b) { return sourceDetailSortKey(a).localeCompare(sourceDetailSortKey(b)); });
    var unique = candidates.filter(function (detail) {
      var key = JSON.stringify(detail);
      if (byExactDetail[key]) return false;
      byExactDetail[key] = true;
      return true;
    });
    // Keep at least one record per contributing entry before secondary evidence
    // variants, so truncation never makes a retained source id unverifiable.
    var primaryBySource = {}, primary = [], secondary = [];
    unique.forEach(function (detail) {
      var key = detail.entryId + '|' + detail.graphKind;
      if (!primaryBySource[key]) { primaryBySource[key] = true; primary.push(detail); }
      else secondary.push(detail);
    });
    var ordered = primary.concat(secondary);
    var selected = ordered.slice(0, MAX_EDGE_SOURCE_DETAILS);
    var budget = { items: 0, chars: 0 };
    selected = selected.map(function (detail) {
      return sanitizeValue(detail, {
        maxDepth: 4, maxItems: 1200, maxChars: MAX_EDGE_SOURCE_DETAIL_TEXT,
        stringLimit: MAX_TEXT, arrayLimit: 80, keyLimit: 48
      }, 0, budget);
    }).filter(isObject);
    var ids = {}, kinds = {};
    selected.forEach(function (detail) { ids[detail.entryId] = true; kinds[detail.graphKind] = true; });
    target.learningWeb = Object.assign({}, prior, {
      sourceEntryIds: Object.keys(ids).sort(),
      sourceGraphKinds: Object.keys(kinds).sort(),
      sourceDetails: selected
    });
    if (ordered.length > selected.length || prior.sourceDetailsTruncated) target.learningWeb.sourceDetailsTruncated = true;
    else delete target.learningWeb.sourceDetailsTruncated;
  }


  function rankedEntryNodes(entry) {
    var nodes = entry && entry.graph && Array.isArray(entry.graph.nodes) ? entry.graph.nodes.slice() : [];
    var focus = text(entry && entry.graph && entry.graph.meta && (entry.graph.meta.focusId || (entry.graph.meta.lexicalGraph && entry.graph.meta.lexicalGraph.focusId)), 240);
    var rank = { audit: 0, main: 1, unit: 2, root: 3, standard: 4, resource: 5 };
    nodes.sort(function (a, b) {
      if (focus && a.id === focus && b.id !== focus) return -1;
      if (focus && b.id === focus && a.id !== focus) return 1;
      var ar = rank[text(a && a.type, 100).toLowerCase()]; if (ar === undefined) ar = 9;
      var br = rank[text(b && b.type, 100).toLowerCase()]; if (br === undefined) br = 9;
      return ar - br || String(a.id).localeCompare(String(b.id));
    });
    if (!nodes.length) return [];
    var result = [nodes[0]];
    var rootId = text(nodes[0].id, 240);
    var neighborId = '';
    (entry.graph.edges || []).some(function (edge) {
      var endpoints = edgeEndpoints(edge);
      if (endpoints.fromId === rootId) { neighborId = endpoints.toId; return true; }
      if (endpoints.toId === rootId) { neighborId = endpoints.fromId; return true; }
      return false;
    });
    var neighbor = nodes.filter(function (node) { return text(node.id, 240) === neighborId; })[0];
    if (!neighbor && nodes.length > 1) neighbor = nodes[1];
    if (neighbor && neighbor !== nodes[0]) result.push(neighbor);
    return result;
  }

  function seedFairKindNodes(builder, entries, nodeIdentityFor) {
    var byKind = {}, kindOrder = [];
    entries.forEach(function (entry) {
      if (!entry.graph.nodes.length) return;
      if (!byKind[entry.graphKind]) { byKind[entry.graphKind] = []; kindOrder.push(entry.graphKind); }
      byKind[entry.graphKind].push(entry);
    });
    if (builder.maxNodes < kindOrder.length) return;
    [0, 1].forEach(function (round) {
      kindOrder.forEach(function (kind) {
        if (builder.nodes.length >= builder.maxNodes) return;
        var chosen = null, ranked = null;
        byKind[kind].some(function (entry) {
          var candidates = rankedEntryNodes(entry);
          if (candidates[round]) { chosen = entry; ranked = candidates; return true; }
          return false;
        });
        var node = ranked && ranked[round];
        if (!chosen || !node) return;
        var id = canonicalNodeId(node, chosen, nodeIdentityFor);
        var existing = builder.nodeById[id];
        if (existing) { mergeSourceTag(existing, chosen); return; }
        var copy = Object.assign({}, node, { id: id });
        mergeSourceTag(copy, chosen);
        builderAddNode(builder, copy);
      });
    });
  }

  function mergeEntriesToGraph(values, options) {
    var opts = isObject(options) ? options : {};
    var scopeId = text(opts.scopeId, 240) || DEFAULT_SCOPE;
    var kinds = normalizeGraphKinds(opts.kinds || opts.graphKinds || (opts.kind ? [opts.kind] : []));
    var entries = (Array.isArray(values) ? values : []).map(function (entry) { return normalizeEntry(entry); }).filter(function (entry) {
      if (!entry || entry.scopeId !== scopeId || entry.graphKind === GRAPH_KINDS.UNIFIED) return false;
      return !kinds.length || kinds.indexOf(entry.graphKind) >= 0;
    });
    var priority = {};
    priority[GRAPH_KINDS.RESOURCES] = 0; priority[GRAPH_KINDS.ALIGNMENT] = 1;
    priority[GRAPH_KINDS.UNIT] = 2; priority[GRAPH_KINDS.CONCEPT] = 3; priority[GRAPH_KINDS.LEXICAL] = 4;
    entries.sort(function (a, b) {
      var ap = priority[a.graphKind] === undefined ? 9 : priority[a.graphKind];
      var bp = priority[b.graphKind] === undefined ? 9 : priority[b.graphKind];
      return ap - bp || (a.graphKind + '|' + a.id).localeCompare(b.graphKind + '|' + b.id);
    });
    var builder = createGraphBuilder(opts);
    var namespaceForEntry = createEntryNamespaceAllocator(entries);
    var nodeIdentityFor = createNodeIdentityAllocator(entries, namespaceForEntry);
    var allRefs = normalizeResourceRefs(entries.reduce(function (out, entry) { return out.concat(entry.resourceRefs || []); }, []));
    // Reserve representative roots, then adjacent endpoints, across graph kinds
    // before a large resource catalog can consume the shared node budget.
    seedFairKindNodes(builder, entries, nodeIdentityFor);
    allRefs.slice().sort(function (a, b) { return (a.id + '|' + a.type).localeCompare(b.id + '|' + b.type); }).forEach(function (ref) {
      var linkedEntries = entries.filter(function (entry) { return entry.resourceRefs.some(function (candidate) { return candidate.id === ref.id; }); });
      var id = resourceNodeId(ref.id);
      var node = builder.nodeById[id];
      if (!node) node = builderAddNode(builder, { id: id, label: ref.title, type: 'resource', category: 'Resources', resourceId: ref.id, resourceType: ref.type, provenance: sanitizeMetadata(ref.provenance || {}) });
      if (node) linkedEntries.forEach(function (entry) { mergeSourceTag(node, entry); });
    });
    entries.forEach(function (entry) {
      var aliases = {};
      var sortedNodes = entry.graph.nodes.slice().sort(function (a, b) { return String(a.id).localeCompare(String(b.id)); });
      sortedNodes.forEach(function (node) {
        var id = canonicalNodeId(node, entry, nodeIdentityFor);
        aliases[node.id] = id;
        var existing = builder.nodeById[id];
        if (existing) { mergeSourceTag(existing, entry); return; }
        var copy = Object.assign({}, node, { id: id });
        mergeSourceTag(copy, entry);
        builderAddNode(builder, copy);
      });
      entry.graph.edges.slice().sort(function (a, b) {
        var ae = edgeEndpoints(a), be = edgeEndpoints(b);
        return (ae.fromId + '|' + ae.toId + '|' + text(a.type, 100) + '|' + text(a.relationType, 100)).localeCompare(be.fromId + '|' + be.toId + '|' + text(b.type, 100) + '|' + text(b.relationType, 100));
      }).forEach(function (edge) {
        var endpoints = edgeEndpoints(edge);
        if (!aliases[endpoints.fromId] || !aliases[endpoints.toId]) return;
        var copy = Object.assign({}, edge, {
          id: identityId('edge:', stableHash(entry.id + '|' + endpoints.fromId + '|' + endpoints.toId + '|' + text(edge.type, 100) + '|' + text(edge.relationType, 100))),
          fromId: aliases[endpoints.fromId], toId: aliases[endpoints.toId]
        });
        var added = builderAddEdge(builder, copy);
        if (added) mergeEdgeSourceDetails(added, entry, edge);
      });
      if (entry.graphKind === GRAPH_KINDS.RESOURCES) return;
      var focus = text(entry.graph.meta && (entry.graph.meta.focusId || (entry.graph.meta.lexicalGraph && entry.graph.meta.lexicalGraph.focusId)), 240);
      var candidates = sortedNodes.slice().sort(function (a, b) {
        var rank = { audit: 0, main: 1, unit: 2, root: 3, standard: 4 };
        var ar = rank[text(a.type, 100).toLowerCase()]; if (ar === undefined) ar = 9;
        var br = rank[text(b.type, 100).toLowerCase()]; if (br === undefined) br = 9;
        return ar - br || String(a.id).localeCompare(String(b.id));
      });
      var rootId = aliases[focus] || (candidates[0] && aliases[candidates[0].id]);
      (entry.resourceRefs || []).slice().sort(function (a, b) { return a.id.localeCompare(b.id); }).forEach(function (ref) {
        var targetId = resourceNodeId(ref.id);
        if (!rootId || rootId === targetId || !builder.nodeById[targetId]) return;
        var connector = {
          id: identityId('edge:', stableHash(entry.id + '|generatedFor|' + ref.id)),
          fromId: rootId, toId: targetId, type: 'generatedFor', relationType: ref.relationType || 'resourceRef',
          provenance: sanitizeMetadata(entry.provenance || {})
        };
        var addedConnector = builderAddEdge(builder, connector);
        if (addedConnector) mergeEdgeSourceDetails(addedConnector, entry, connector);
      });
    });
    builder.nodes.forEach(function (node) { if (node.learningWeb) { node.learningWeb.sourceEntryIds.sort(); node.learningWeb.sourceGraphKinds.sort(); } });
    builder.edges.forEach(function (edge) { if (edge.learningWeb) { edge.learningWeb.sourceEntryIds.sort(); edge.learningWeb.sourceGraphKinds.sort(); } });
    builder.nodes.sort(function (a, b) { return String(a.id).localeCompare(String(b.id)); });
    builder.edges.sort(function (a, b) { return (String(a.fromId) + '|' + String(a.toId) + '|' + String(a.type) + '|' + String(a.relationType)).localeCompare(String(b.fromId) + '|' + String(b.toId) + '|' + String(b.type) + '|' + String(b.relationType)); });
    var categories = {};
    builder.nodes.forEach(function (node) { var category = text(node.category, 160); if (category) categories[category] = true; });
    var contributedIds = {};
    builder.nodes.concat(builder.edges).forEach(function (item) {
      var learningWeb = isObject(item.learningWeb) ? item.learningWeb : {};
      (Array.isArray(learningWeb.sourceEntryIds) ? learningWeb.sourceEntryIds : []).forEach(function (id) { contributedIds[id] = true; });
      (Array.isArray(learningWeb.sourceDetails) ? learningWeb.sourceDetails : []).forEach(function (detail) { if (detail && detail.entryId) contributedIds[detail.entryId] = true; });
    });
    var contributingEntries = entries.filter(function (entry) { return !!contributedIds[entry.id]; });
    var contributingRefs = normalizeResourceRefs(contributingEntries.reduce(function (out, entry) { return out.concat(entry.resourceRefs || []); }, []));
    var sourceSummaries = contributingEntries.map(function (entry) {
      return { id: entry.id, graphKind: entry.graphKind, title: entry.title, resourceRefs: entry.resourceRefs, provenance: sanitizeMetadata(entry.provenance || {}) };
    });
    return {
      version: 'acg/v1', title: text(opts.title, 320) || 'Learning Web', axes: null,
      nodes: builder.nodes, edges: builder.edges,
      layers: Object.keys(categories).sort().map(function (category, index) { return { key: category, label: category, index: index }; }),
      meta: { learningWeb: {
        version: VERSION, graphKind: GRAPH_KINDS.UNIFIED, scopeId: scopeId,
        sourceEntryIds: contributingEntries.map(function (entry) { return entry.id; }),
        graphKinds: Object.keys(contributingEntries.reduce(function (out, entry) { out[entry.graphKind] = true; return out; }, {})).sort(),
        resourceRefs: contributingRefs, sources: sourceSummaries,
        counts: { entries: contributingEntries.length, selectedEntries: entries.length, nodes: builder.nodes.length, edges: builder.edges.length },
        truncated: { nodes: builder.truncatedNodes > 0, edges: builder.truncatedEdges > 0 }
      } }
    };
  }

  function normalizeGraphKinds(values) {
    var seen = {};
    return (Array.isArray(values) ? values : []).map(normalizeGraphKind).filter(function (kind) {
      if (!kind || seen[kind]) return false;
      seen[kind] = true;
      return true;
    });
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
    // `memoryDirty` means at least one explicit entry mutation has not reached
    // durable storage. A per-entry journal prevents a retry from replaying an
    // entire stale snapshot over another tab's additions or deletions.
    var memoryDirty = false;
    var pendingRegistryMutations = {};
    var guardedDeletionConflicts = {};
    var generationSequence = 0;
    var generationSeed = stableHash([
      String(clock()), String(Date.now()), String(Math.random())
    ].join(':'));

    function registryEntryKey(id, scopeId) {
      return JSON.stringify([text(scopeId, 240), text(id, 240)]);
    }

    function nextEntryGeneration() {
      generationSequence += 1;
      return 'entry:' + generationSeed + ':' + generationSequence.toString(36);
    }

    function entryMap(snapshot) {
      var map = {};
      (snapshot && Array.isArray(snapshot.graphs) ? snapshot.graphs : []).forEach(function (entry) {
        map[registryEntryKey(entry.id, entry.scopeId)] = entry;
      });
      return map;
    }

    function addExpectedGeneration(list, value) {
      var normalized = typeof value === 'string' ? value : '';
      if (list.indexOf(normalized) < 0) list.push(normalized);
    }

    function queueUpsert(entry, previous) {
      var key = registryEntryKey(entry.id, entry.scopeId);
      var prior = pendingRegistryMutations[key];
      var expected = prior && Array.isArray(prior.expectedGenerations)
        ? prior.expectedGenerations.slice() : [];
      if (!prior) addExpectedGeneration(expected, previous && previous.generationId);
      else {
        if (prior.entry) addExpectedGeneration(expected, prior.entry.generationId);
        if (previous) addExpectedGeneration(expected, previous.generationId);
      }
      pendingRegistryMutations[key] = {
        op: 'upsert', key: key, entry: clone(entry), expectedGenerations: expected
      };
      delete guardedDeletionConflicts[key];
    }

    function queueDelete(entry) {
      if (!entry) return;
      var key = registryEntryKey(entry.id, entry.scopeId);
      var prior = pendingRegistryMutations[key];
      var expected = prior && Array.isArray(prior.expectedGenerations)
        ? prior.expectedGenerations.slice() : [];
      if (prior && prior.entry) addExpectedGeneration(expected, prior.entry.generationId);
      addExpectedGeneration(expected, entry.generationId);
      pendingRegistryMutations[key] = {
        op: 'delete', key: key, id: entry.id, scopeId: entry.scopeId,
        expectedKind: entry.graphKind, expectedGenerations: expected
      };
    }

    function sameEntryGeneration(left, right) {
      return !!left && !!right && left.generationId === right.generationId
        && stableHash(stableSemanticString(left, 40000)) === stableHash(stableSemanticString(right, 40000));
    }

    function queueSnapshotMutations(previous, next) {
      var before = entryMap(previous);
      var after = entryMap(next);
      var keys = {};
      Object.keys(before).forEach(function (key) { keys[key] = true; });
      Object.keys(after).forEach(function (key) { keys[key] = true; });
      Object.keys(keys).sort().forEach(function (key) {
        var oldEntry = before[key] || null;
        var newEntry = after[key] || null;
        if (!oldEntry && newEntry) queueUpsert(newEntry, null);
        else if (oldEntry && !newEntry) queueDelete(oldEntry);
        else if (oldEntry && newEntry && !sameEntryGeneration(oldEntry, newEntry)) queueUpsert(newEntry, oldEntry);
      });
    }

    function readDurableSnapshot() {
      if (!storage || typeof storage.getItem !== 'function') return { available: false, snapshot: null };
      try {
        var raw = storage.getItem(storageKey);
        var normalized = raw ? normalizeSnapshot(JSON.parse(raw)) : emptySnapshot();
        return { available: !!normalized, snapshot: normalized || null };
      } catch (_) {
        return { available: false, snapshot: null };
      }
    }

    function applyPendingMutations(baseSnapshot) {
      var base = normalizeSnapshot(baseSnapshot) || emptySnapshot();
      var byKey = entryMap(base);
      var results = {};
      Object.keys(pendingRegistryMutations).sort().forEach(function (key) {
        var mutation = pendingRegistryMutations[key];
        var current = byKey[key] || null;
        var currentGeneration = current && current.generationId || '';
        var expected = Array.isArray(mutation.expectedGenerations) ? mutation.expectedGenerations : [];
        if (mutation.op === 'upsert') {
          if (current && currentGeneration === mutation.entry.generationId) {
            results[key] = { op: 'upsert', status: 'already', actualEntry: current };
          } else if ((!current && expected.indexOf('') >= 0) || (current && expected.indexOf(currentGeneration) >= 0)) {
            byKey[key] = mutation.entry;
            results[key] = { op: 'upsert', status: 'applied', actualEntry: mutation.entry };
          } else {
            results[key] = { op: 'upsert', status: 'conflict', actualEntry: current };
          }
          return;
        }
        if (!current) {
          results[key] = { op: 'delete', status: 'absent', actualEntry: null };
        } else if (current.graphKind === mutation.expectedKind && expected.indexOf(currentGeneration) >= 0) {
          delete byKey[key];
          results[key] = { op: 'delete', status: 'applied', actualEntry: current };
        } else {
          results[key] = { op: 'delete', status: 'conflict', actualEntry: current };
        }
      });
      return {
        snapshot: normalizeSnapshot({ version: VERSION, updatedAt: base.updatedAt, graphs: Object.keys(byKey).sort().map(function (key) { return byKey[key]; }) }) || emptySnapshot(),
        mutationResults: results
      };
    }

    function read() {
      if (memoryDirty || !storage || typeof storage.getItem !== 'function') return clone(memory);
      var durable = readDurableSnapshot();
      if (!durable.available) return clone(memory);
      memory = durable.snapshot;
      return clone(memory);
    }

    function write(snapshot) {
      var next = normalizeSnapshot(snapshot) || emptySnapshot();
      queueSnapshotMutations(memory, next);
      var durable = readDurableSnapshot();
      var applied = applyPendingMutations(durable.available ? durable.snapshot : next);
      var committed = applied.snapshot;
      committed.updatedAt = isoDate(clock(), new Date().toISOString());
      memory = committed;
      var storagePersisted = false;
      if (storage && typeof storage.setItem === 'function' && (durable.available || !memoryDirty)) {
        try {
          storage.setItem(storageKey, JSON.stringify(committed));
          storagePersisted = true;
        } catch (_) {}
      }
      Object.keys(applied.mutationResults).forEach(function (key) {
        var status = applied.mutationResults[key].status;
        if (storagePersisted || status === 'conflict') delete pendingRegistryMutations[key];
      });
      memoryDirty = Object.keys(pendingRegistryMutations).length > 0;
      emit(committed);
      return {
        snapshot: clone(committed),
        storagePersisted: storagePersisted,
        mutationResults: applied.mutationResults
      };
    }

    function saveGraph(graph, metadata) {
      var snapshot = read();
      var entry = normalizeEntry({ graph: graph }, Object.assign({}, metadata || {}, {
        now: clock(), generationId: nextEntryGeneration()
      }));
      if (!entry) return null;
      var existing = snapshot.graphs.filter(function (candidate) { return candidate.id === entry.id && candidate.scopeId === entry.scopeId; })[0];
      if (existing) entry.createdAt = existing.createdAt;
      var key = registryEntryKey(entry.id, entry.scopeId);
      delete guardedDeletionConflicts[key];
      snapshot.graphs = [entry].concat(snapshot.graphs.filter(function (candidate) {
        return candidate.id !== entry.id || candidate.scopeId !== entry.scopeId;
      }));
      var result = write(snapshot);
      var mutationResult = result.mutationResults[key];
      var accepted = !mutationResult || mutationResult.status !== 'conflict';
      var saved = clone(entry);
      // Runtime delivery status is intentionally not serialized as graph data.
      Object.defineProperty(saved, 'storagePersisted', { value: !!(result.storagePersisted && accepted), enumerable: false });
      Object.defineProperty(saved, 'conflict', { value: !accepted, enumerable: false });
      return saved;
    }

    function listGraphs(filter) {
      var query = isObject(filter) ? filter : {};
      var resourceId = text(query.resourceId, 240);
      var kind = normalizeGraphKind(query.kind || query.graphKind);
      var kinds = normalizeGraphKinds(query.kinds || query.graphKinds);
      if (kind && kinds.indexOf(kind) < 0) kinds.push(kind);
      var scopeId = text(query.scopeId, 240);
      return read().graphs.filter(function (entry) {
        if (kinds.length && kinds.indexOf(entry.graphKind) < 0) return false;
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
      var kind = normalizeGraphKind(reconcile.kind || reconcile.graphKind);
      var now = clock();
      var current = read();
      var existingByKey = {};
      current.graphs.forEach(function (entry) { existingByKey[entry.scopeId + '|' + entry.id] = entry; });
      var incoming = [];
      var incomingIds = {};
      (Array.isArray(values) ? values : []).forEach(function (value) {
        if (!isObject(value)) return;
        var entry = normalizeEntry(value, { scopeId: scopeId, now: now, generationId: nextEntryGeneration() });
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

    function reconcileResources(values, reconcileOptions) {
      var reconcile = isObject(reconcileOptions) ? reconcileOptions : {};
      var scopeId = text(reconcile.scopeId, 240) || DEFAULT_SCOPE;
      var graph = graphFromResources(values, Object.assign({}, reconcile, { scopeId: scopeId }));
      var refs = graph.meta && graph.meta.learningWeb ? graph.meta.learningWeb.resourceRefs : [];
      var entry = saveGraph(graph, {
        id: text(reconcile.id, 240) || identityId('project-resources:', scopeId),
        scopeId: scopeId,
        kind: GRAPH_KINDS.RESOURCES,
        title: text(reconcile.title, 320) || 'Project resources',
        resourceRefs: refs,
        provenance: Object.assign({
          source: 'project-history', adapter: 'LearningWebRegistry.graphFromResources',
          registryVersion: VERSION, resourceCount: refs.length
        }, isObject(reconcile.provenance) ? reconcile.provenance : {})
      });
      return entry;
    }

    function buildUnifiedGraph(scopeOrFilter, maybeFilter) {
      var filter = isObject(scopeOrFilter) ? Object.assign({}, scopeOrFilter) : Object.assign({}, isObject(maybeFilter) ? maybeFilter : {}, { scopeId: scopeOrFilter });
      filter.scopeId = text(filter.scopeId, 240) || DEFAULT_SCOPE;
      var entries = listGraphs({ scopeId: filter.scopeId, kinds: filter.kinds || filter.graphKinds || (filter.kind ? [filter.kind] : []) });
      if (Array.isArray(filter.entryIds) && filter.entryIds.length) {
        var wanted = {};
        filter.entryIds.forEach(function (id) { var value = text(id, 240); if (value) wanted[value] = true; });
        entries = entries.filter(function (entry) { return !!wanted[entry.id]; });
      }
      return mergeEntriesToGraph(entries, filter);
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

    function guardedRemovalResult(id, scopeId, expectedKind, status, removed, storagePersisted, writeAttempted, actualKind, actualGenerationId) {
      var result = {
        id: id,
        scopeId: scopeId,
        expectedKind: expectedKind,
        status: status,
        removed: !!removed,
        absent: status === 'absent',
        kindMismatch: status === 'kind-mismatch',
        storagePersisted: !!storagePersisted,
        writeAttempted: !!writeAttempted
      };
      if (actualKind) result.actualKind = actualKind;
      if (status === 'conflict') result.conflict = true;
      if (status === 'conflict' && actualGenerationId) result.actualGenerationId = actualGenerationId;
      result.ok = (status === 'removed' || status === 'absent') && result.storagePersisted;
      return result;
    }

    // Exact, optimistic-concurrency guarded unregister. The pending delete is
    // bound to the persisted entry generation observed when removal began; a
    // same-ID revival in another tab is therefore a conflict, never a target.
    function removeGraphOfKind(id, scopeId, expectedKind) {
      var wanted = text(id, 240);
      var wantedScope = text(scopeId, 240);
      var wantedKind = normalizeGraphKind(expectedKind);
      if (!wanted || !wantedScope || !wantedKind) {
        return guardedRemovalResult(wanted, wantedScope, wantedKind, 'invalid', false, !memoryDirty, false);
      }
      var key = registryEntryKey(wanted, wantedScope);
      var priorConflict = guardedDeletionConflicts[key];
      if (priorConflict) {
        var priorStatus = priorConflict.actualKind && priorConflict.actualKind !== wantedKind ? 'kind-mismatch' : 'conflict';
        return guardedRemovalResult(wanted, wantedScope, wantedKind, priorStatus, false, true, false,
          priorConflict.actualKind, priorConflict.actualGenerationId);
      }
      var snapshot = read();
      var exact = snapshot.graphs.filter(function (entry) {
        return entry.id === wanted && entry.scopeId === wantedScope;
      })[0] || null;
      if (exact && exact.graphKind !== wantedKind) {
        return guardedRemovalResult(wanted, wantedScope, wantedKind, 'kind-mismatch', false, !memoryDirty, false, exact.graphKind, exact.generationId);
      }
      var pending = pendingRegistryMutations[key];
      if (!exact && (!pending || pending.op !== 'delete')) {
        return guardedRemovalResult(wanted, wantedScope, wantedKind, 'absent', false, true, false);
      }
      if (!exact && pending && pending.op === 'delete') {
        if (pending.expectedKind !== wantedKind) {
          return guardedRemovalResult(wanted, wantedScope, wantedKind, 'kind-mismatch', false, false, false, pending.expectedKind);
        }
        // Detect a concurrent replacement before writing. This both preserves
        // the historical no-write mismatch contract and prevents a retry from
        // treating a new same-kind generation as the old deletion target.
        var durable = readDurableSnapshot();
        var durableExact = durable.available ? (durable.snapshot.graphs.filter(function (entry) {
          return entry.id === wanted && entry.scopeId === wantedScope;
        })[0] || null) : null;
        var expectedGenerations = Array.isArray(pending.expectedGenerations) ? pending.expectedGenerations : [];
        if (durableExact && (durableExact.graphKind !== wantedKind || expectedGenerations.indexOf(durableExact.generationId) < 0)) {
          guardedDeletionConflicts[key] = {
            actualKind: durableExact.graphKind,
            actualGenerationId: durableExact.generationId
          };
          delete pendingRegistryMutations[key];
          memoryDirty = Object.keys(pendingRegistryMutations).length > 0;
          var durableConflictStatus = durableExact.graphKind !== wantedKind ? 'kind-mismatch' : 'conflict';
          return guardedRemovalResult(wanted, wantedScope, wantedKind, durableConflictStatus, false, false, false,
            durableExact.graphKind, durableExact.generationId);
        }
      }
      if (exact) {
        snapshot.graphs = snapshot.graphs.filter(function (entry) {
          return !(entry.id === wanted && entry.scopeId === wantedScope && entry.graphKind === wantedKind);
        });
      }
      var result = write(snapshot);
      var mutationResult = result.mutationResults[key] || null;
      if (mutationResult && mutationResult.status === 'conflict') {
        var actual = mutationResult.actualEntry || null;
        guardedDeletionConflicts[key] = {
          actualKind: actual && actual.graphKind || '',
          actualGenerationId: actual && actual.generationId || ''
        };
        delete pendingRegistryMutations[key];
        var conflictStatus = actual && actual.graphKind !== wantedKind ? 'kind-mismatch' : 'conflict';
        return guardedRemovalResult(wanted, wantedScope, wantedKind, conflictStatus, false,
          result.storagePersisted, true, actual && actual.graphKind, actual && actual.generationId);
      }
      return guardedRemovalResult(wanted, wantedScope, wantedKind, exact ? 'removed' : 'absent', !!exact,
        result.storagePersisted, true);
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
      reconcileResources: reconcileResources,
      buildUnifiedGraph: buildUnifiedGraph,
      removeGraph: removeGraph,
      removeGraphOfKind: removeGraphOfKind,
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
    LIMITS: {
      graphs: MAX_GRAPHS, nodes: MAX_NODES, edges: MAX_EDGES, resources: MAX_RESOURCES,
      text: MAX_TEXT, metadataDepth: MAX_METADATA_DEPTH, metadataKeys: MAX_METADATA_KEYS,
      metadataArray: MAX_METADATA_ARRAY, metadataItems: MAX_METADATA_ITEMS, graphText: MAX_GRAPH_TEXT,
      edgeSourceDetails: MAX_EDGE_SOURCE_DETAILS, edgeSourceDetailText: MAX_EDGE_SOURCE_DETAIL_TEXT
    },
    GRAPH_KINDS: GRAPH_KINDS,
    DEFAULT_SCOPE: DEFAULT_SCOPE,
    normalizeGraphKind: normalizeGraphKind,
    normalizeResourceRef: normalizeResourceRef,
    normalizeResourceRefs: normalizeResourceRefs,
    normalizeGraph: normalizeGraph,
    normalizeEntry: normalizeEntry,
    normalizeSnapshot: normalizeSnapshot,
    graphFromResource: graphFromResource,
    graphFromResources: graphFromResources,
    mergeEntriesToGraph: mergeEntriesToGraph,
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
