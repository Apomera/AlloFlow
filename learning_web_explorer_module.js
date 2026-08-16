/**
 * AlloFlow Learning Web Explorer — accessible, read-only 2D acg/v1 renderer.
 *
 * Accepts either one bounded acg/v1 graph, a Learning Web registry entry, or a
 * learning-web-registry/v1 snapshot. The SVG is a visual overview; the
 * canonical node outline and relationship table remain visible and operable so
 * every selection and every provenance record is available without spatial or
 * pointer interaction.
 *
 * Runtime: plain browser JavaScript with window.React. No bundler or external
 * rendering dependency is required.
 */
(function () {
  'use strict';

  if (window.AlloModules && window.AlloModules.LearningWebExplorer) {
    console.log('[LearningWebExplorer] Already loaded, skipping');
    return;
  }

  var VERSION = 'learning-web-explorer/v1';
  var GRAPH_VERSION = 'acg/v1';
  var REGISTRY_VERSION = 'learning-web-registry/v1';
  var LIMITS = {
    graphs: 24,
    nodes: 160,
    edges: 480,
    resourcesPerItem: 20,
    sourcesPerItem: 12,
    openableResources: 160,
    text: 1200,
    url: 2048,
    visualEdges: 180
  };
  var viewCounter = 0;
  var modalStack = [];

  function safeNotify(callback) {
    try { if (typeof callback === 'function') callback(); } catch (_) {}
  }

  function invokeOptionalCallback(callback, payload, onFailure) {
    if (typeof callback !== 'function') return false;
    try {
      var result = callback(payload);
      if (result && typeof result.then === 'function') {
        Promise.resolve(result).then(function () {}, function () { safeNotify(onFailure); }).catch(function () {});
      }
    } catch (_) {
      safeNotify(onFailure);
    }
    return true;
  }

  function isObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function cleanText(value, limit) {
    if (value === undefined || value === null) return '';
    return String(value).replace(/\s+/g, ' ').trim().slice(0, limit || LIMITS.text);
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

  function safeHttpsUrl(value) {
    var url = cleanText(value, LIMITS.url);
    return /^https:\/\/[a-z0-9.-]+(?::[0-9]+)?(?:[/?#]|$)/i.test(url) ? url : '';
  }

  function normalizeStringList(value, limit, itemLimit) {
    var list = Array.isArray(value) ? value : (value ? [value] : []);
    var seen = {};
    var out = [];
    for (var i = 0; i < list.length && out.length < (limit || LIMITS.sourcesPerItem); i++) {
      var item = cleanText(list[i], itemLimit || 320);
      if (item && !seen[item]) { seen[item] = true; out.push(item); }
    }
    return out;
  }

  function normalizeUrlList(value) {
    var list = Array.isArray(value) ? value : (value ? [value] : []);
    var seen = {};
    var out = [];
    for (var i = 0; i < list.length && out.length < LIMITS.sourcesPerItem; i++) {
      var url = safeHttpsUrl(list[i]);
      if (url && !seen[url]) { seen[url] = true; out.push(url); }
    }
    return out;
  }

  function normalizeProvenance(raw, fallback) {
    var source = isObject(raw) ? raw : {};
    var base = isObject(fallback) ? fallback : {};
    var provider = cleanText(source.provider || base.provider, 240);
    var datasetVersion = cleanText(source.datasetVersion || source.version || base.datasetVersion || base.version, 160);
    var snapshotId = cleanText(source.snapshotId || base.snapshotId, 240);
    var license = cleanText(source.license || base.license, 240);
    var attribution = cleanText(source.attribution || base.attribution, 500);
    var sourceIds = normalizeStringList(source.sourceIds || source.sourceId || base.sourceIds || base.sourceId);
    var sourceUrls = normalizeUrlList(source.sourceUrls || source.sourceUrl || base.sourceUrls || base.sourceUrl);
    if (!provider && !datasetVersion && !snapshotId && !license && !attribution && !sourceIds.length && !sourceUrls.length) return null;
    return {
      provider: provider,
      datasetVersion: datasetVersion,
      snapshotId: snapshotId,
      license: license,
      attribution: attribution,
      sourceIds: sourceIds,
      sourceUrls: sourceUrls
    };
  }

  function normalizeSourceDetails(raw, fallback) {
    var values = Array.isArray(raw) ? raw : [];
    var out = [];
    for (var i = 0; i < values.length && out.length < LIMITS.sourcesPerItem; i++) {
      var value = isObject(values[i]) ? values[i] : {};
      var provenance = normalizeProvenance(value.provenance, {
        provider: value.provider,
        datasetVersion: value.datasetVersion,
        snapshotId: value.snapshotId,
        license: value.license,
        attribution: value.attribution,
        sourceId: value.sourceId,
        sourceIds: value.sourceIds,
        sourceUrl: value.sourceUrl || value.url,
        sourceUrls: value.sourceUrls
      });
      var graphKind = cleanText(value.graphKind || value.kind, 100);
      var title = cleanText(value.title || value.label || value.sourceTitle, 320);
      var provider = cleanText(value.provider || (provenance && provenance.provider), 240);
      var evidence = cleanText(value.evidence || value.explanation || value.summary || value.notes, LIMITS.text);
      var sourceEntryId = cleanText(value.sourceEntryId || value.entryId || value.id, 240);
      if (!graphKind && !title && !provider && !evidence && !sourceEntryId && !provenance) continue;
      out.push({ sourceEntryId: sourceEntryId, graphKind: graphKind, title: title, provider: provider, evidence: evidence, provenance: provenance });
    }
    if (!out.length && isObject(fallback)) {
      var fallbackProvenance = normalizeProvenance(fallback.provenance);
      if (fallbackProvenance) out.push({
        sourceEntryId: cleanText(fallback.graphId, 240), graphKind: cleanText(fallback.graphKind, 100),
        title: cleanText(fallback.graphTitle, 320), provider: fallbackProvenance.provider,
        evidence: '', provenance: fallbackProvenance
      });
    }
    return out;
  }

  function graphKindsFor(raw, fallbackKind) {
    var value = isObject(raw) ? raw : {};
    var learningWeb = isObject(value.learningWeb) ? value.learningWeb : {};
    var kinds = normalizeStringList(learningWeb.sourceGraphKinds || value.graphKinds || [], LIMITS.sourcesPerItem, 100);
    var fallback = cleanText(value.graphKind || fallbackKind, 100);
    if (!kinds.length && fallback) kinds.push(fallback);
    return uniqueSorted(kinds);
  }

  function normalizeResourceRefs(raw) {
    var values = Array.isArray(raw) ? raw : [];
    var seen = {};
    var out = [];
    for (var i = 0; i < values.length && out.length < LIMITS.resourcesPerItem; i++) {
      var value = typeof values[i] === 'string' ? { id: values[i] } : values[i];
      if (!isObject(value)) continue;
      var id = cleanText(value.id || value.resourceId || value.artifactId, 240);
      var type = cleanText(value.type || value.resourceType || value.artifactType, 100) || 'resource';
      if (!id || seen[type + ':' + id]) continue;
      seen[type + ':' + id] = true;
      out.push({
        id: id,
        type: type,
        title: cleanText(value.title || value.label || value.name, 320) || id
      });
    }
    return out;
  }

  function compareText(a, b) {
    return String(a || '').localeCompare(String(b || ''), undefined, { sensitivity: 'base', numeric: true });
  }

  function nodeSort(a, b) {
    return compareText(a.id, b.id) || compareText(a.label, b.label);
  }

  function edgeSort(a, b) {
    return compareText(a.id, b.id) || compareText(a.fromId, b.fromId) || compareText(a.toId, b.toId) || compareText(a.type, b.type);
  }

  function graphKindFor(graph, entry) {
    var explicit = cleanText((entry && (entry.graphKind || entry.kind)) || (graph && graph.graphKind), 100);
    if (explicit) return explicit;
    var meta = graph && graph.meta;
    if (meta && meta.learningWeb && cleanText(meta.learningWeb.graphKind, 100)) return cleanText(meta.learningWeb.graphKind, 100);
    if (meta && (meta.alignmentMap || meta.alignmentAudit)) return 'alignment-map';
    if (meta && (meta.lexicalGraph || meta.domain === 'lexical')) return 'lexical-graph';
    if (meta && (meta.throughline || meta.unitId)) return 'unit-path';
    if (meta && meta.conceptMap) return 'concept-map';
    return 'learning-web';
  }

  function entryListFor(input) {
    if (!isObject(input)) return { kind: 'empty', entries: [], invalid: !!input };
    if (input.version === GRAPH_VERSION && Array.isArray(input.nodes) && Array.isArray(input.edges)) {
      return { kind: 'graph', entries: [{ id: 'graph', title: input.title, graph: input }], totalEntries: 1, invalid: false };
    }
    if (input.graph && input.graph.version === GRAPH_VERSION) {
      return { kind: 'entry', entries: [input], totalEntries: 1, invalid: false };
    }
    if (input.version === REGISTRY_VERSION && Array.isArray(input.graphs)) {
      return { kind: 'registry', entries: input.graphs.slice(0, LIMITS.graphs), totalEntries: input.graphs.length, invalid: false };
    }
    return { kind: 'invalid', entries: [], totalEntries: 0, invalid: true };
  }

  function normalizeNode(raw, context, id) {
    var node = isObject(raw) ? raw : {};
    var label = cleanText(node.label || node.text || node.name || node.title, 420) || id;
    var resourceId = cleanText(node.resourceId, 240);
    var artifactId = cleanText(node.artifactId, 240);
    var ownResourceRefs = normalizeResourceRefs(node.resourceRefs || node.resources);
    if (resourceId) ownResourceRefs = normalizeResourceRefs(ownResourceRefs.concat([{ id: resourceId, type: node.resourceType || 'resource', title: node.resourceTitle || resourceId }]));
    if (artifactId) ownResourceRefs = normalizeResourceRefs(ownResourceRefs.concat([{ id: artifactId, type: node.artifactType || 'artifact', title: node.artifactTitle || artifactId }]));
    return {
      id: id,
      sourceNodeId: cleanText(node.id, 240),
      label: label,
      type: cleanText(node.type || node.nodeType, 100) || 'node',
      category: cleanText(node.category || node.strand || node.group, 180),
      status: cleanText(node.status || node.verification, 120),
      summary: cleanText(node.summary || node.description || node.definition || node.notes, LIMITS.text),
      evidence: cleanText(node.evidence || node.finding || node.recommendation, LIMITS.text),
      graphId: context.graphId,
      graphTitle: context.graphTitle,
      graphKind: cleanText(node.graphKind, 100) || context.graphKind,
      graphKinds: graphKindsFor(node, context.graphKind),
      sourceDetails: normalizeSourceDetails((isObject(node.learningWeb) && node.learningWeb.sourceDetails) || node.sourceDetails, context),
      resourceId: resourceId,
      artifactId: artifactId,
      resourceIds: normalizeStringList(ownResourceRefs.map(function (ref) { return ref.id; }), LIMITS.resourcesPerItem, 240),
      resourceRefs: normalizeResourceRefs(ownResourceRefs.concat(context.resourceRefs || [])),
      provenance: normalizeProvenance(node.provenance, context.provenance),
      attributionSource: cleanText(node.attributionSource, 160)
    };
  }

  function normalizeEdge(raw, context, id, fromId, toId) {
    var edge = isObject(raw) ? raw : {};
    var type = cleanText(edge.relationType || edge.type || edge.relationship, 120) || 'relatedTo';
    return {
      id: id,
      sourceEdgeId: cleanText(edge.id, 240),
      fromId: fromId,
      toId: toId,
      type: type,
      relationType: type,
      label: cleanText(edge.label, 240),
      direction: cleanText(edge.direction, 80) || 'directed',
      status: cleanText(edge.status || edge.verification, 120),
      explanation: cleanText(edge.explanation || edge.reason || edge.notes, LIMITS.text),
      evidence: cleanText(edge.evidence, LIMITS.text),
      graphId: context.graphId,
      graphTitle: context.graphTitle,
      graphKind: cleanText(edge.graphKind, 100) || context.graphKind,
      graphKinds: graphKindsFor(edge, context.graphKind),
      sourceDetails: normalizeSourceDetails((isObject(edge.learningWeb) && edge.learningWeb.sourceDetails) || edge.sourceDetails, context),
      resourceRefs: normalizeResourceRefs(edge.resourceRefs || edge.resources || context.resourceRefs),
      provenance: normalizeProvenance(edge.provenance, context.provenance),
      attributionSource: cleanText(edge.attributionSource, 160)
    };
  }

  function entryCompositeIdentity(entry) {
    var scopeId = cleanText(entry && entry.scopeId, 240);
    var graphId = cleanText(entry && entry.id, 240);
    return scopeId.length + ':' + scopeId + graphId.length + ':' + graphId;
  }

  function stateIdentityFor(input, normalized) {
    var source = isObject(input) ? input : {};
    var header = [cleanText(source.version, 120), cleanText(source.id, 240), cleanText(source.scopeId, 240), cleanText(source.updatedAt, 120)];
    if (source.version === REGISTRY_VERSION && Array.isArray(source.graphs)) {
      header.push(source.graphs.slice(0, LIMITS.graphs).map(function (entry) {
        return [entryCompositeIdentity(entry), cleanText(entry && entry.updatedAt, 120), cleanText(entry && entry.graphKind, 100)];
      }).sort(function (a, b) { return compareText(JSON.stringify(a), JSON.stringify(b)); }));
    }
    return JSON.stringify([header, normalized]);
  }

  function normalizeInput(input, options) {
    options = options || {};
    var maxGraphs = Math.max(1, Math.min(LIMITS.graphs, Number(options.maxGraphs) || LIMITS.graphs));
    var maxNodes = Math.max(1, Math.min(LIMITS.nodes, Number(options.maxNodes) || LIMITS.nodes));
    var maxEdges = Math.max(1, Math.min(LIMITS.edges, Number(options.maxEdges) || LIMITS.edges));
    var parsed = entryListFor(input);
    var originalGraphs = parsed.totalEntries == null ? parsed.entries.length : parsed.totalEntries;
    var entries = parsed.entries.filter(function (entry) {
      return isObject(entry) && isObject(entry.graph) && entry.graph.version === GRAPH_VERSION
        && Array.isArray(entry.graph.nodes) && Array.isArray(entry.graph.edges);
    });
    entries.sort(function (a, b) {
      return compareText(entryCompositeIdentity(a), entryCompositeIdentity(b));
    });
    entries = entries.slice(0, maxGraphs);

    var nodes = [];
    var edgesPending = [];
    var nodeIds = {};
    var originalNodes = 0;
    var originalEdges = 0;
    var namespaceOwners = {};
    function allocateNamespace(identity, hashInput) {
      var base = 'g' + stableHash(hashInput);
      var token = base;
      var suffix = 1;
      while (Object.prototype.hasOwnProperty.call(namespaceOwners, token)) {
        suffix += 1;
        token = base + '-' + suffix;
      }
      namespaceOwners[token] = identity;
      return token + '::';
    }

    entries.forEach(function (entry, entryIndex) {
      var graph = entry.graph;
      originalNodes += graph.nodes.length;
      originalEdges += graph.edges.length;
      var graphId = cleanText(entry.id || ('graph-' + entryIndex), 240) || ('graph-' + entryIndex);
      var scopeId = cleanText(entry.scopeId, 240);
      var graphToken = parsed.kind === 'graph'
        ? ''
        : allocateNamespace(entryCompositeIdentity(entry), scopeId + '|' + graphId);
      var context = {
        graphId: graphId,
        graphTitle: cleanText(entry.title || graph.title, 320) || 'Learning Web graph',
        graphKind: graphKindFor(graph, entry),
        resourceRefs: normalizeResourceRefs(entry.resourceRefs || entry.resources),
        provenance: normalizeProvenance(entry.provenance, graph.meta && graph.meta.provenance)
      };
      var localIds = {};
      graph.nodes.slice(0, Math.max(0, maxNodes - nodes.length)).sort(function (a, b) {
        return compareText(cleanText(a && a.id, 240), cleanText(b && b.id, 240));
      }).forEach(function (rawNode) {
        if (nodes.length >= maxNodes || !isObject(rawNode)) return;
        var sourceId = cleanText(rawNode.id, 240);
        if (!sourceId || localIds[sourceId]) return;
        var id = graphToken + sourceId;
        if (nodeIds[id]) return;
        localIds[sourceId] = id;
        nodeIds[id] = true;
        nodes.push(normalizeNode(rawNode, context, id));
      });
      graph.edges.slice(0, Math.max(0, maxEdges - edgesPending.length)).forEach(function (rawEdge, edgeIndex) {
        if (!isObject(rawEdge)) return;
        var rawFrom = cleanText(rawEdge.fromId || rawEdge.from || rawEdge.source, 240);
        var rawTo = cleanText(rawEdge.toId || rawEdge.to || rawEdge.target, 240);
        var fromId = localIds[rawFrom];
        var toId = localIds[rawTo];
        if (!fromId || !toId) return;
        var sourceEdgeId = cleanText(rawEdge.id, 240);
        var edgeId = graphToken + (sourceEdgeId || ('edge-' + stableHash(rawFrom + '|' + rawTo + '|' + cleanText(rawEdge.relationType || rawEdge.type, 120) + '|' + edgeIndex)));
        edgesPending.push(normalizeEdge(rawEdge, context, edgeId, fromId, toId));
      });
    });

    nodes.sort(nodeSort);
    var retainedIds = {};
    nodes.forEach(function (node) { retainedIds[node.id] = true; });
    var edgeSeen = {};
    var edges = edgesPending.filter(function (edge) {
      if (!retainedIds[edge.fromId] || !retainedIds[edge.toId] || edgeSeen[edge.id]) return false;
      edgeSeen[edge.id] = true;
      return true;
    }).sort(edgeSort).slice(0, maxEdges);

    var truncated = {
      graphs: originalGraphs > entries.length,
      nodes: originalNodes > nodes.length,
      edges: originalEdges > edges.length
    };
    var warnings = [];
    if (parsed.invalid) warnings.push('The supplied value is not an acg/v1 graph or Learning Web registry snapshot.');
    if (truncated.graphs || truncated.nodes || truncated.edges) warnings.push('The explorer applied its safety limits; the accessible counts describe the displayed subset.');

    return {
      version: GRAPH_VERSION,
      title: cleanText(input && input.title, 320) || (entries.length === 1 ? cleanText(entries[0].title || entries[0].graph.title, 320) : 'Learning Web'),
      nodes: nodes,
      edges: edges,
      layers: [],
      meta: {
        learningWebExplorer: {
          version: VERSION,
          inputKind: parsed.kind,
          invalid: parsed.invalid,
          counts: {
            inputGraphs: originalGraphs,
            displayedGraphs: entries.length,
            inputNodes: originalNodes,
            displayedNodes: nodes.length,
            inputEdges: originalEdges,
            displayedEdges: edges.length
          },
          truncated: truncated,
          warnings: warnings
        }
      }
    };
  }

  function searchableNode(node) {
    return [node.id, node.sourceNodeId, node.label, node.type, node.category, node.status, node.summary,
      node.evidence, node.graphTitle, node.graphKind, (node.graphKinds || []).join(' '), node.attributionSource,
      (node.sourceDetails || []).map(function (detail) { return [detail.graphKind, detail.title, detail.provider, detail.evidence].join(' '); }).join(' '),
      node.provenance && node.provenance.provider, node.provenance && node.provenance.attribution]
      .join(' ').toLowerCase();
  }

  function searchableEdge(edge, nodeById) {
    var from = nodeById[edge.fromId];
    var to = nodeById[edge.toId];
    return [edge.id, edge.type, edge.label, edge.status, edge.explanation, edge.evidence,
      edge.graphTitle, edge.graphKind, (edge.graphKinds || []).join(' '), edge.attributionSource,
      (edge.sourceDetails || []).map(function (detail) { return [detail.graphKind, detail.title, detail.provider, detail.evidence].join(' '); }).join(' '),
      edge.provenance && edge.provenance.provider, edge.provenance && edge.provenance.attribution,
      from && from.label, to && to.label].join(' ').toLowerCase();
  }

  function uniqueSorted(values) {
    var seen = {};
    return values.filter(function (value) {
      var key = cleanText(value, 180);
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    }).sort(compareText);
  }

  function hasGraphKind(item, requested) {
    var kind = cleanText(requested, 100).toLowerCase();
    if (!kind || kind === 'all') return true;
    var kinds = Array.isArray(item && item.graphKinds) ? item.graphKinds : [item && item.graphKind];
    return kinds.some(function (value) { return cleanText(value, 100).toLowerCase() === kind; });
  }

  function filterGraph(graph, filters) {
    graph = graph && graph.version === GRAPH_VERSION && graph.meta && graph.meta.learningWebExplorer ? graph : normalizeInput(graph);
    filters = filters || {};
    var query = cleanText(filters.query, 240).toLowerCase();
    var nodeType = cleanText(filters.nodeType, 100).toLowerCase();
    var relationType = cleanText(filters.relationType, 120).toLowerCase();
    var graphKind = cleanText(filters.graphKind, 100).toLowerCase();
    var byId = {};
    graph.nodes.forEach(function (node) { byId[node.id] = node; });

    function nodeAllowed(node) {
      if (nodeType && nodeType !== 'all' && node.type.toLowerCase() !== nodeType) return false;
      if (!hasGraphKind(node, graphKind)) return false;
      return true;
    }

    var allowed = {};
    var queryMatched = {};
    graph.nodes.forEach(function (node) {
      if (!nodeAllowed(node)) return;
      allowed[node.id] = true;
      if (!query || searchableNode(node).indexOf(query) >= 0) queryMatched[node.id] = true;
    });

    var matched = {};
    var candidateEdges = graph.edges.filter(function (edge) {
      if (!allowed[edge.fromId] || !allowed[edge.toId]) return false;
      if (relationType && relationType !== 'all' && edge.type.toLowerCase() !== relationType) return false;
      if (!hasGraphKind(edge, graphKind)) return false;
      if (!query) return true;
      if (searchableEdge(edge, byId).indexOf(query) < 0 && !queryMatched[edge.fromId] && !queryMatched[edge.toId]) return false;
      matched[edge.fromId] = true;
      matched[edge.toId] = true;
      return true;
    });

    if (query) Object.keys(queryMatched).forEach(function (id) { matched[id] = true; });
    if (!query && relationType && relationType !== 'all') {
      matched = {};
      candidateEdges.forEach(function (edge) { matched[edge.fromId] = true; matched[edge.toId] = true; });
    }
    var useMatched = !!query || (!!relationType && relationType !== 'all');
    var nodes = graph.nodes.filter(function (node) { return allowed[node.id] && (!useMatched || matched[node.id]); });
    var visible = {};
    nodes.forEach(function (node) { visible[node.id] = true; });
    var edges = candidateEdges.filter(function (edge) { return visible[edge.fromId] && visible[edge.toId]; });

    return Object.assign({}, graph, {
      nodes: nodes,
      edges: edges,
      meta: Object.assign({}, graph.meta, {
        learningWebExplorerFilter: {
          query: query,
          nodeType: nodeType || 'all',
          relationType: relationType || 'all',
          graphKind: graphKind || 'all'
        }
      })
    });
  }

  function focusNeighborhood(input, nodeId) {
    var graph = input && input.version === GRAPH_VERSION && input.meta && input.meta.learningWebExplorer
      ? input
      : normalizeInput(input);
    var exactId = cleanText(nodeId, 512);
    var found = false;
    var keep = {};
    graph.nodes.forEach(function (node) {
      if (node.id === exactId) { found = true; keep[node.id] = true; }
    });
    if (found) {
      graph.edges.forEach(function (edge) {
        if (edge.fromId === exactId) keep[edge.toId] = true;
        if (edge.toId === exactId) keep[edge.fromId] = true;
      });
    }
    var nodes = found ? graph.nodes.filter(function (node) { return !!keep[node.id]; }).slice().sort(nodeSort) : [];
    var visible = {};
    nodes.forEach(function (node) { visible[node.id] = true; });
    var edges = found ? graph.edges.filter(function (edge) { return !!visible[edge.fromId] && !!visible[edge.toId]; }).slice().sort(edgeSort) : [];
    return Object.assign({}, graph, {
      nodes: nodes,
      edges: edges,
      meta: Object.assign({}, graph.meta, {
        learningWebExplorerFocus: { nodeId: exactId, found: found, hops: 1, nodes: nodes.length, edges: edges.length }
      })
    });
  }

  function normalizeOpenableResourceIds(values) {
    var list = Array.isArray(values) ? values : [];
    var seen = {};
    var out = [];
    for (var i = 0; i < list.length && out.length < LIMITS.openableResources; i++) {
      if (typeof list[i] !== 'string') continue;
      var id = cleanText(list[i], 240);
      if (id && !seen[id]) { seen[id] = true; out.push(id); }
    }
    return out;
  }

  function explicitResourceId(node) {
    if (!isObject(node)) return '';
    var values = [];
    function add(value) {
      var id = cleanText(value, 240);
      if (id && values.indexOf(id) < 0) values.push(id);
    }
    add(node.resourceId);
    add(node.artifactId);
    return values.length === 1 ? values[0] : '';
  }

  function semanticStage(node) {
    var value = (node.type + ' ' + node.category).toLowerCase();
    if (/audit|framework|standard|resource|artifact/.test(value)) return 0;
    if (/concept|topic|lexeme|sense|morpheme|etymon|root/.test(value)) return 1;
    if (/unit|lesson|activity|task|strategy/.test(value)) return 2;
    if (/assessment|measure|check/.test(value)) return 3;
    if (/evidence|example|work sample/.test(value)) return 4;
    if (/finding|gap|recommendation|action/.test(value)) return 5;
    return null;
  }

  function shapeForNode(node) {
    var stage = semanticStage(node);
    if (stage === 0) return 'hexagon';
    if (stage === 1) return 'circle';
    if (stage === 3 || stage === 4) return 'diamond';
    if (stage === 5) return 'flag';
    return 'rectangle';
  }

  function layoutGraph(graph, options) {
    options = options || {};
    graph = graph && graph.version === GRAPH_VERSION && graph.meta && graph.meta.learningWebExplorer ? graph : normalizeInput(graph, options);
    var width = Math.max(520, Number(options.width) || 1000);
    var paddingX = 74;
    var paddingY = 64;
    var rowGap = 104;
    var byId = {};
    var indegree = {};
    var adjacent = {};
    graph.nodes.forEach(function (node) {
      byId[node.id] = node;
      indegree[node.id] = 0;
      adjacent[node.id] = [];
    });
    graph.edges.forEach(function (edge) {
      if (!byId[edge.fromId] || !byId[edge.toId]) return;
      indegree[edge.toId] += 1;
      adjacent[edge.fromId].push(edge.toId);
    });
    Object.keys(adjacent).forEach(function (id) { adjacent[id].sort(compareText); });
    var ready = graph.nodes.filter(function (node) { return indegree[node.id] === 0; }).map(function (node) { return node.id; }).sort(compareText);
    var depth = {};
    graph.nodes.forEach(function (node) { depth[node.id] = 0; });
    while (ready.length) {
      var id = ready.shift();
      adjacent[id].forEach(function (toId) {
        depth[toId] = Math.max(depth[toId], depth[id] + 1);
        indegree[toId] -= 1;
        if (indegree[toId] === 0) { ready.push(toId); ready.sort(compareText); }
      });
    }

    var columns = {};
    graph.nodes.forEach(function (node) {
      var stage = semanticStage(node);
      var column = stage === null ? Math.min(5, depth[node.id] || 0) : stage;
      if (!columns[column]) columns[column] = [];
      columns[column].push(node);
    });
    var columnKeys = Object.keys(columns).map(Number).sort(function (a, b) { return a - b; });
    if (!columnKeys.length) { columnKeys = [0]; columns[0] = []; }
    columnKeys.forEach(function (key) {
      columns[key].sort(function (a, b) {
        return compareText(a.category, b.category) || compareText(a.label, b.label) || compareText(a.id, b.id);
      });
    });
    var largestColumn = columnKeys.reduce(function (max, key) { return Math.max(max, columns[key].length); }, 0);
    var height = Math.max(300, paddingY * 2 + Math.max(1, largestColumn - 1) * rowGap);
    var positions = {};
    columnKeys.forEach(function (key, columnIndex) {
      var list = columns[key];
      var x = columnKeys.length === 1 ? width / 2 : paddingX + columnIndex * ((width - paddingX * 2) / (columnKeys.length - 1));
      list.forEach(function (node, rowIndex) {
        var y = list.length === 1 ? height / 2 : paddingY + rowIndex * ((height - paddingY * 2) / (list.length - 1));
        positions[node.id] = {
          id: node.id,
          x: Math.round(x * 100) / 100,
          y: Math.round(y * 100) / 100,
          column: columnIndex,
          row: rowIndex,
          shape: shapeForNode(node)
        };
      });
    });
    return { width: width, height: height, positions: positions, columns: columnKeys.slice() };
  }

  function availableFilters(graph) {
    graph = graph && graph.version === GRAPH_VERSION && graph.meta && graph.meta.learningWebExplorer ? graph : normalizeInput(graph);
    return {
      nodeTypes: uniqueSorted(graph.nodes.map(function (node) { return node.type; })),
      relationTypes: uniqueSorted(graph.edges.map(function (edge) { return edge.type; })),
      graphKinds: uniqueSorted(graph.nodes.reduce(function (out, node) { return out.concat(node.graphKinds || [node.graphKind]); }, [])
        .concat(graph.edges.reduce(function (out, edge) { return out.concat(edge.graphKinds || [edge.graphKind]); }, [])))
    };
  }

  function buildViewGraph(input, filters, options) {
    var normalized = input && input.version === GRAPH_VERSION && input.meta && input.meta.learningWebExplorer
      ? input
      : normalizeInput(input, options);
    var filtered = filterGraph(normalized, filters || {});
    return {
      graph: filtered,
      normalizedGraph: normalized,
      layout: layoutGraph(filtered, options),
      available: availableFilters(normalized),
      counts: {
        nodes: filtered.nodes.length,
        edges: filtered.edges.length,
        totalNodes: normalized.nodes.length,
        totalEdges: normalized.edges.length
      }
    };
  }

  function humanize(value) {
    var text = cleanText(value, 180).replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Related to';
  }

  function shortLabel(value) {
    var text = cleanText(value, 420);
    return text.length > 28 ? text.slice(0, 27) + '…' : text;
  }

  function nodeShapeElement(h, node, position, selected) {
    var common = {
      fill: selected ? '#dbeafe' : '#ffffff',
      stroke: selected ? '#2563eb' : '#64748b',
      strokeWidth: selected ? 4 : 2,
      vectorEffect: 'non-scaling-stroke'
    };
    if (position.shape === 'circle') return h('circle', Object.assign({ cx: position.x, cy: position.y, r: 35 }, common));
    if (position.shape === 'diamond') return h('polygon', Object.assign({ points: [position.x + ',' + (position.y - 34), (position.x + 48) + ',' + position.y, position.x + ',' + (position.y + 34), (position.x - 48) + ',' + position.y].join(' ') }, common));
    if (position.shape === 'hexagon') return h('polygon', Object.assign({ points: [(position.x - 44) + ',' + (position.y - 28), (position.x + 44) + ',' + (position.y - 28), (position.x + 58) + ',' + position.y, (position.x + 44) + ',' + (position.y + 28), (position.x - 44) + ',' + (position.y + 28), (position.x - 58) + ',' + position.y].join(' ') }, common));
    if (position.shape === 'flag') return h('path', Object.assign({ d: 'M ' + (position.x - 52) + ' ' + (position.y - 30) + ' H ' + (position.x + 52) + ' L ' + (position.x + 38) + ' ' + position.y + ' L ' + (position.x + 52) + ' ' + (position.y + 30) + ' H ' + (position.x - 52) + ' Z' }, common));
    return h('rect', Object.assign({ x: position.x - 58, y: position.y - 31, width: 116, height: 62, rx: 8 }, common));
  }

  function provenanceRows(h, provenance, attributionSource) {
    var rows = [];
    function row(label, value) {
      if (!value) return;
      rows.push(h('div', { key: label, style: { display: 'grid', gridTemplateColumns: 'minmax(7rem, auto) 1fr', gap: 8 } },
        h('dt', { style: { fontWeight: 500 } }, label),
        h('dd', { style: { margin: 0 } }, value)
      ));
    }
    row('Attribution source', attributionSource);
    if (provenance) {
      row('Provider', provenance.provider);
      row('Dataset version', provenance.datasetVersion);
      row('Snapshot', provenance.snapshotId);
      row('License', provenance.license);
      row('Attribution', provenance.attribution);
      row('Source IDs', provenance.sourceIds.join(', '));
      if (provenance.sourceUrls.length) {
        rows.push(h('div', { key: 'Source links', style: { display: 'grid', gridTemplateColumns: 'minmax(7rem, auto) 1fr', gap: 8 } },
          h('dt', { style: { fontWeight: 500 } }, 'Source links'),
          h('dd', { style: { margin: 0 } }, provenance.sourceUrls.map(function (url, index) {
            return h(window.React.Fragment, { key: url }, index ? ', ' : null,
              h('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, 'Source ' + (index + 1))
            );
          }))
        ));
      }
    }
    return rows.length ? h('dl', { style: { display: 'grid', gap: 6, margin: '8px 0 0' } }, rows) : h('p', null, 'No provenance was supplied for this item.');
  }

  function sourceDetailsView(h, details, tr) {
    if (!Array.isArray(details) || !details.length) return null;
    return h('section', { 'aria-label': tr('learning_web_explorer.source_details', 'Source-specific evidence') },
      h('h5', null, tr('learning_web_explorer.source_details', 'Source-specific evidence')),
      h('ul', null, details.map(function (detail, index) {
        var heading = detail.title || humanize(detail.graphKind) || tr('learning_web_explorer.source', 'Source');
        return h('li', { key: detail.sourceEntryId || detail.graphKind || index },
          h('strong', null, heading),
          detail.provider && detail.provider !== heading ? h('p', null, detail.provider) : null,
          detail.evidence ? h('p', null, detail.evidence) : null,
          detail.provenance ? provenanceRows(h, detail.provenance, '', tr) : null
        );
      }))
    );
  }

  function View(props) {
    props = props || {};
    var React = window.React;
    if (!React) return null;
    var h = React.createElement;
    var idRef = React.useRef(null);
    var rootRef = React.useRef(null);
    var closeRef = React.useRef(null);
    var openerRef = React.useRef(null);
    var modalTokenRef = React.useRef(null);
    var returnFocusTimerRef = React.useRef(null);
    var onCloseRef = React.useRef(props.onClose);
    onCloseRef.current = props.onClose;
    if (!idRef.current) idRef.current = 'learning-web-explorer-' + (++viewCounter);
    var ids = {
      title: idRef.current + '-title',
      description: idRef.current + '-description',
      search: idRef.current + '-search',
      nodeType: idRef.current + '-node-type',
      relationType: idRef.current + '-relation-type',
      graphKind: idRef.current + '-graph-kind',
      outline: idRef.current + '-outline',
      relationships: idRef.current + '-relationships',
      detail: idRef.current + '-detail',
      svgTitle: idRef.current + '-svg-title',
      svgDescription: idRef.current + '-svg-description'
    };

    function tr(key, fallback, params) {
      var translated = '';
      if (typeof props.t === 'function') {
        try { translated = props.t(key, params || {}); } catch (_) { translated = ''; }
      }
      var out = cleanText(translated, LIMITS.text);
      if (!out || out === key) out = fallback;
      Object.keys(params || {}).forEach(function (name) {
        out = out.split('{' + name + '}').join(String(params[name]));
      });
      return out;
    }

    var isModal = typeof props.onClose === 'function';
    var _callbackStatus = React.useState(''), callbackStatus = _callbackStatus[0], setCallbackStatus = _callbackStatus[1];
    function callbackFailure(message) { setCallbackStatus(message); }
    function requestClose() {
      setCallbackStatus('');
      invokeOptionalCallback(onCloseRef.current, undefined, function () {
        callbackFailure(tr('learning_web_explorer.callback.close_failed', 'Learning Web Explorer could not close.'));
      });
    }
    React.useEffect(function () {
      var root = rootRef.current;
      if (!isModal || !root) return function () {};
      var token = modalTokenRef.current || { id: idRef.current };
      modalTokenRef.current = token;
      modalStack.push(token);
      var active = document.activeElement;
      if (active && active !== document.body && !root.contains(active)) openerRef.current = active;
      var isolated = [];
      var seen = [];
      function isolateSiblings(container, keep) {
        if (!container || !container.children) return;
        Array.prototype.forEach.call(container.children, function (node) {
          if (node === keep || seen.indexOf(node) >= 0 || !node.setAttribute) return;
          seen.push(node);
          isolated.push({ node: node, inert: node.hasAttribute('inert'), ariaHidden: node.getAttribute('aria-hidden') });
          node.setAttribute('inert', '');
          node.setAttribute('aria-hidden', 'true');
        });
      }
      var keep = root;
      var container = root.parentElement;
      while (container) {
        isolateSiblings(container, keep);
        if (container === document.body) break;
        keep = container;
        container = container.parentElement;
      }
      var priorBodyOverflow = document.body && document.body.style ? document.body.style.overflow : '';
      if (document.body && document.body.style) document.body.style.overflow = 'hidden';
      var focusTimer = setTimeout(function () {
        if (modalStack[modalStack.length - 1] === token && closeRef.current && closeRef.current.focus) closeRef.current.focus();
      }, 0);
      function focusable() {
        return Array.prototype.slice.call(root.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'));
      }
      function onKeyDown(event) {
        if (modalStack[modalStack.length - 1] !== token) return;
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          if (event.stopImmediatePropagation) event.stopImmediatePropagation();
          requestClose();
          return;
        }
        if (event.key !== 'Tab') return;
        var controls = focusable();
        if (!controls.length) { event.preventDefault(); root.focus(); return; }
        var first = controls[0], last = controls[controls.length - 1];
        if (!root.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first).focus(); return; }
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
      document.addEventListener('keydown', onKeyDown);
      return function () {
        clearTimeout(focusTimer);
        document.removeEventListener('keydown', onKeyDown);
        var stackIndex = modalStack.indexOf(token);
        if (stackIndex >= 0) modalStack.splice(stackIndex, 1);
        if (document.body && document.body.style) document.body.style.overflow = priorBodyOverflow;
        isolated.forEach(function (state) {
          if (!state.inert) state.node.removeAttribute('inert');
          if (state.ariaHidden === null) state.node.removeAttribute('aria-hidden');
          else state.node.setAttribute('aria-hidden', state.ariaHidden);
        });
        var opener = openerRef.current;
        openerRef.current = null;
        if (opener && opener.isConnected && opener.focus) opener.focus();
      };
    }, [isModal]);

    var inputValue = props.graph || props.registrySnapshot || props.snapshot || props.input;
    var normalized = React.useMemo(function () { return normalizeInput(inputValue, props.limits); }, [inputValue, props.limits]);
    var _query = React.useState(''), query = _query[0], setQuery = _query[1];
    var _nodeType = React.useState('all'), nodeType = _nodeType[0], setNodeType = _nodeType[1];
    var _relationType = React.useState('all'), relationType = _relationType[0], setRelationType = _relationType[1];
    var _graphKind = React.useState('all'), graphKind = _graphKind[0], setGraphKind = _graphKind[1];
    var _selected = React.useState(null), selected = _selected[0], setSelected = _selected[1];
    var _focusNodeId = React.useState(''), focusNodeId = _focusNodeId[0], setFocusNodeId = _focusNodeId[1];
    var stateIdentity = React.useMemo(function () { return stateIdentityFor(inputValue, normalized); }, [inputValue, normalized]);
    var priorStateIdentityRef = React.useRef(stateIdentity);
    var allowlistSupplied = props.openableResourceIds !== undefined;
    var openableResourceIds = React.useMemo(function () { return normalizeOpenableResourceIds(props.openableResourceIds); }, [props.openableResourceIds]);
    var view = React.useMemo(function () {
      return buildViewGraph(normalized, { query: query, nodeType: nodeType, relationType: relationType, graphKind: graphKind }, props.layout);
    }, [normalized, query, nodeType, relationType, graphKind, props.layout]);
    var graph = view.graph;
    var byId = {};
    var edgeById = {};
    graph.nodes.forEach(function (node) { byId[node.id] = node; });
    graph.edges.forEach(function (edge) { edgeById[edge.id] = edge; });
    React.useEffect(function () {
      if (priorStateIdentityRef.current === stateIdentity) return;
      priorStateIdentityRef.current = stateIdentity;
      setSelected(null);
      setFocusNodeId('');
      setCallbackStatus('');
    }, [stateIdentity]);
    React.useEffect(function () {
      if (selected && ((selected.kind === 'node' && !byId[selected.id]) || (selected.kind === 'edge' && !edgeById[selected.id]))) setSelected(null);
      if (focusNodeId && !byId[focusNodeId]) setFocusNodeId('');
    }, [graph, selected, focusNodeId]);
    React.useEffect(function () { return function () { clearTimeout(returnFocusTimerRef.current); }; }, []);
    var activeFocusId = focusNodeId && byId[focusNodeId] ? focusNodeId : '';
    var visualGraph = React.useMemo(function () {
      return activeFocusId ? focusNeighborhood(graph, activeFocusId) : graph;
    }, [graph, activeFocusId]);
    var layout = React.useMemo(function () { return layoutGraph(visualGraph, props.layout); }, [visualGraph, props.layout]);
    var currentResourceId = cleanText(props.currentResourceId, 240);
    function isCurrentResourceNode(node) {
      if (!currentResourceId || !node) return false;
      return node.resourceId === currentResourceId || node.artifactId === currentResourceId
        || node.sourceNodeId === currentResourceId
        || (Array.isArray(node.resourceIds) && node.resourceIds.indexOf(currentResourceId) >= 0);
    }
    var selectedItem = null;
    if (selected && selected.kind === 'node') selectedItem = byId[selected.id] || null;
    if (selected && selected.kind === 'edge') {
      for (var edgeIndex = 0; edgeIndex < graph.edges.length; edgeIndex++) if (graph.edges[edgeIndex].id === selected.id) selectedItem = graph.edges[edgeIndex];
    }

    function choose(kind, item) {
      setSelected({ kind: kind, id: item.id });
      setCallbackStatus('');
      invokeOptionalCallback(props.onSelectionChange, { kind: kind, item: item, graph: graph }, function () {
        callbackFailure(tr('learning_web_explorer.callback.selection_failed', 'The selection could not be shared.'));
      });
    }

    function showWholeGraph() {
      var returnNodeId = activeFocusId;
      setFocusNodeId('');
      clearTimeout(returnFocusTimerRef.current);
      returnFocusTimerRef.current = setTimeout(function () {
        var root = rootRef.current;
        if (!root) return;
        var controls = root.querySelectorAll('[data-learning-web-node-select]');
        var target = null;
        for (var i = 0; i < controls.length; i++) if (controls[i].getAttribute('data-learning-web-node-select') === returnNodeId) { target = controls[i]; break; }
        if (target && target.focus) target.focus(); else if (root.focus) root.focus();
      }, 0);
    }

    function resetFilters() {
      setQuery(''); setNodeType('all'); setRelationType('all'); setGraphKind('all'); setSelected(null); setFocusNodeId('');
    }

    var explorerMeta = normalized.meta.learningWebExplorer;
    var filterActive = !!query || nodeType !== 'all' || relationType !== 'all' || graphKind !== 'all';
    var grouped = {};
    graph.nodes.forEach(function (node) {
      var group = node.graphKind || 'learning-web';
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push(node);
    });
    var markerId = idRef.current + '-arrow';

    var svg = h('svg', {
      viewBox: '0 0 ' + layout.width + ' ' + layout.height,
      width: '100%',
      role: 'img',
      'aria-labelledby': ids.svgTitle + ' ' + ids.svgDescription,
      style: { display: 'block', width: '100%', minWidth: layout.width, height: 'auto', minHeight: 260, maxHeight: 720, background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8 }
    },
    h('defs', null,
      h('marker', { id: markerId, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' },
        h('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: '#475569' })
      )
    ),
    h('title', { id: ids.svgTitle }, tr('learning_web_explorer.diagram.title', 'Learning Web relationship diagram')),
    h('desc', { id: ids.svgDescription }, tr('learning_web_explorer.diagram.description', '{nodes} nodes and {edges} typed relationships. Use the outline and relationship table after the diagram to select items and inspect their evidence.', { nodes: visualGraph.nodes.length, edges: visualGraph.edges.length })),
    visualGraph.edges.slice(0, LIMITS.visualEdges).map(function (edge) {
      var from = layout.positions[edge.fromId], to = layout.positions[edge.toId];
      if (!from || !to) return null;
      var active = selected && selected.kind === 'edge' && selected.id === edge.id;
      var mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2;
      return h('g', { key: edge.id, 'data-edge-id': edge.id, 'data-selected': active ? 'true' : 'false' },
        h('line', {
          x1: from.x, y1: from.y, x2: to.x, y2: to.y,
          stroke: active ? '#2563eb' : '#64748b',
          strokeWidth: active ? 4 : 1.5,
          strokeDasharray: /evidence|align|assess/i.test(edge.type) ? '7 4' : undefined,
          markerEnd: edge.direction === 'symmetric' ? undefined : 'url(#' + markerId + ')',
          vectorEffect: 'non-scaling-stroke'
        }),
        h('rect', { x: mx - 38, y: my - 10, width: 76, height: 18, rx: 3, fill: '#f8fafc', opacity: 0.9 }),
        h('text', { x: mx, y: my + 3, textAnchor: 'middle', fill: '#0f172a', fontSize: 11 }, shortLabel(humanize(edge.type)))
      );
    }),
    visualGraph.nodes.map(function (node) {
      var position = layout.positions[node.id];
      if (!position) return null;
      var active = selected && selected.kind === 'node' && selected.id === node.id;
      var current = isCurrentResourceNode(node);
      return h('g', { key: node.id, 'data-node-id': node.id, 'data-node-type': node.type, 'data-node-shape': position.shape, 'data-selected': active ? 'true' : 'false', 'data-current-resource': current ? 'true' : 'false' },
        nodeShapeElement(h, node, position, active),
        h('text', { x: position.x, y: position.y - 2, textAnchor: 'middle', fill: '#0f172a', fontSize: 12, fontWeight: 500 }, shortLabel(node.label)),
        h('text', { x: position.x, y: position.y + 15, textAnchor: 'middle', fill: '#475569', fontSize: 11 }, shortLabel(humanize(node.type))),
        current ? h('text', { x: position.x, y: position.y + 47, textAnchor: 'middle', fill: '#0f172a', fontSize: 11, fontWeight: 500 }, tr('learning_web_explorer.current_resource', 'Current resource')) : null
      );
    }));

    var selectedResourceId = selected && selected.kind === 'node' ? explicitResourceId(selectedItem) : '';
    if (allowlistSupplied) {
      var allowlistedNodeResourceId = selectedItem && selected.kind === 'node' ? cleanText(selectedItem.resourceId, 240) : '';
      selectedResourceId = allowlistedNodeResourceId && openableResourceIds.indexOf(allowlistedNodeResourceId) >= 0 ? allowlistedNodeResourceId : '';
    }
    var selectedDetail = h('section', { id: ids.detail, 'aria-live': 'polite', style: { marginTop: 16 } },
      h('h3', null, tr('learning_web_explorer.selected_detail', 'Selected detail')),
      !selectedItem ? h('p', null, tr('learning_web_explorer.select_prompt', 'Select a node or relationship from the accessible views below to inspect its details.'))
        : selected.kind === 'node'
          ? h(React.Fragment, null,
            h('h4', null, selectedItem.label),
            h('p', null, humanize(selectedItem.type) + (selectedItem.category ? ' · ' + selectedItem.category : '') + ' · ' + humanize(selectedItem.graphKind)),
            selectedItem.summary ? h('p', null, selectedItem.summary) : null,
            selectedItem.evidence ? h('p', null, h('strong', null, tr('learning_web_explorer.evidence', 'Evidence: ')), selectedItem.evidence) : null,
            provenanceRows(h, selectedItem.provenance, selectedItem.attributionSource, tr),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 } },
              h('button', {
                type: 'button', onClick: function () { setFocusNodeId(selectedItem.id); },
                'aria-pressed': activeFocusId === selectedItem.id ? 'true' : 'false',
                style: { minHeight: 44 }, 'data-learning-web-focus-node': selectedItem.id
              }, tr('learning_web_explorer.focus_connections', 'Focus connections')),
              selectedResourceId && typeof props.onOpenResource === 'function' ? h('button', {
                type: 'button', onClick: function () {
                  setCallbackStatus('');
                  invokeOptionalCallback(props.onOpenResource, { resourceId: selectedResourceId, nodeId: selectedItem.id }, function () {
                    callbackFailure(tr('learning_web_explorer.callback.open_failed', 'The resource could not be opened.'));
                  });
                },
                style: { minHeight: 44 }, 'data-learning-web-open-resource': selectedResourceId
              }, tr('learning_web_explorer.open_resource', 'Open resource')) : null
            )
          )
          : h(React.Fragment, null,
            h('h4', null, (byId[selectedItem.fromId] ? byId[selectedItem.fromId].label : selectedItem.fromId) + ' → ' + (byId[selectedItem.toId] ? byId[selectedItem.toId].label : selectedItem.toId)),
            h('p', null, h('strong', null, tr('learning_web_explorer.relationship_label', 'Relationship: ')), humanize(selectedItem.type)),
            selectedItem.status ? h('p', null, h('strong', null, tr('learning_web_explorer.status', 'Status: ')), selectedItem.status) : null,
            selectedItem.explanation ? h('p', null, h('strong', null, tr('learning_web_explorer.explanation', 'Explanation: ')), selectedItem.explanation) : null,
            selectedItem.evidence ? h('p', null, h('strong', null, tr('learning_web_explorer.evidence', 'Evidence: ')), selectedItem.evidence) : null,
            provenanceRows(h, selectedItem.provenance, selectedItem.attributionSource, tr),
            sourceDetailsView(h, selectedItem.sourceDetails, tr)
          )
    );

    var warnings = explorerMeta.warnings.map(function (warning) {
      if (warning.indexOf('not an acg/v1') >= 0) return tr('learning_web_explorer.warning.invalid', warning);
      return tr('learning_web_explorer.warning.bounded', warning);
    });
    var focusControls = activeFocusId ? h('div', { 'data-learning-web-focus-controls': 'true', 'aria-live': 'polite', style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, margin: '12px 0' } },
      h('p', { style: { margin: 0 } }, tr('learning_web_explorer.focus_status', 'Diagram focused on {label}: {nodes} nodes and {edges} relationships. The complete outline and table remain below.', { label: byId[activeFocusId].label, nodes: visualGraph.nodes.length, edges: visualGraph.edges.length })),
      h('button', { type: 'button', onClick: showWholeGraph, style: { minHeight: 44 }, 'data-learning-web-show-whole': 'true' }, tr('learning_web_explorer.show_whole_graph', 'Show whole graph'))
    ) : null;
    var visual = graph.nodes.length
      ? h(React.Fragment, null,
        h('div', { 'data-learning-web-diagram-scroll': 'true', style: { overflowX: 'auto', maxWidth: '100%' } }, svg),
        visualGraph.edges.length > LIMITS.visualEdges
          ? h('p', { role: 'note' }, tr('learning_web_explorer.diagram.sampled', 'The diagram shows {shown} of {total} relationships for readability. The relationship table below contains the complete displayed set.', { shown: LIMITS.visualEdges, total: visualGraph.edges.length }))
          : null
      )
      : h('div', { role: 'status', style: { padding: '24px 0' } }, filterActive
        ? tr('learning_web_explorer.empty.filtered', 'No Learning Web items match these filters.')
        : tr('learning_web_explorer.empty.default', 'No Learning Web connections are available yet.'));

    // Colours here are literal on purpose. Do not reintroduce CSS custom properties.
    //
    // This module was the only one in AlloFlow styled against shadcn design tokens
    // (background / card / foreground / primary / border / accent / muted-foreground).
    // AlloFlow defines none of those names; its own custom properties are the
    // allo-stem family. Standalone that was harmless, since every reference carried an
    // inline fallback. Embedded in Gemini Canvas it was not: the shell page defines
    // those same names, so the modal inherited the SHELL's palette instead of its own.
    // The background resolved transparent, the overlay painted no surface, and the
    // explorer's contents appeared on top of the still-visible page with no modal
    // behind them.
    //
    // The geometry was never the problem. position, inset and z-index were correct all
    // along and are pinned in tests/learning_web_explorer.test.js. Only the surface
    // failed to paint. A component that can be embedded must not inherit its own
    // surface colours from whatever page it happens to land in.
    // Regression gate: tests/learning_web_explorer_tokens.test.js
    return h('section', {
      ref: rootRef,
      className: 'learning-web-explorer',
      role: isModal ? 'dialog' : undefined,
      'aria-modal': isModal ? 'true' : undefined,
      'aria-labelledby': ids.title,
      'aria-describedby': ids.description,
      tabIndex: isModal ? -1 : undefined,
      'data-learning-web-modal-overlay': isModal ? 'true' : undefined,
      style: isModal ? {
        position: 'fixed', inset: 0, width: '100%', height: '100%', maxWidth: '100vw', maxHeight: '100vh', overflowY: 'auto',
        zIndex: 2147483000, boxSizing: 'border-box', padding: '24px',
        background: '#f8fafc', color: '#0f172a'
      } : { color: '#0f172a' }
    },
      h('header', { style: { display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 12 } },
        h('div', null,
          h('h2', { id: ids.title }, props.title || normalized.title || tr('learning_web_explorer.title', 'Learning Web Explorer')),
          h('p', { id: ids.description }, props.description || tr('learning_web_explorer.description', 'Explore how standards, concepts, learning experiences, evidence, and findings connect. The diagram and accessible views describe the same read-only graph.'))
        ),
        isModal ? h('button', { ref: closeRef, type: 'button', onClick: requestClose, 'aria-label': tr('learning_web_explorer.close', 'Close Learning Web Explorer'), style: { minWidth: 44, minHeight: 44 } }, tr('common.close', 'Close')) : null
      ),
      warnings.map(function (warning, index) { return h('p', { key: index, role: 'status' }, warning); }),
      h('form', { onSubmit: function (event) { event.preventDefault(); }, 'aria-label': tr('learning_web_explorer.filters', 'Learning Web filters'), style: { display: 'flex', flexWrap: 'wrap', alignItems: 'end', gap: 12, margin: '16px 0' } },
        h('label', { htmlFor: ids.search, style: { display: 'grid', gap: 4, flex: '2 1 14rem' } }, tr('learning_web_explorer.search', 'Search'),
          h('input', { id: ids.search, type: 'search', value: query, onChange: function (event) { setQuery(event.target.value); }, placeholder: tr('learning_web_explorer.search_placeholder', 'Search labels, evidence, or sources'), style: { minHeight: 44, width: '100%' } })
        ),
        h('label', { htmlFor: ids.nodeType, style: { display: 'grid', gap: 4, flex: '1 1 10rem' } }, tr('learning_web_explorer.node_type', 'Node type'),
          h('select', { id: ids.nodeType, value: nodeType, onChange: function (event) { setNodeType(event.target.value); }, style: { minHeight: 44, width: '100%' } },
            h('option', { value: 'all' }, tr('learning_web_explorer.all_node_types', 'All node types')),
            view.available.nodeTypes.map(function (value) { return h('option', { key: value, value: value.toLowerCase() }, humanize(value)); })
          )
        ),
        h('label', { htmlFor: ids.relationType, style: { display: 'grid', gap: 4, flex: '1 1 11rem' } }, tr('learning_web_explorer.relationship', 'Relationship'),
          h('select', { id: ids.relationType, value: relationType, onChange: function (event) { setRelationType(event.target.value); }, style: { minHeight: 44, width: '100%' } },
            h('option', { value: 'all' }, tr('learning_web_explorer.all_relationships', 'All relationships')),
            view.available.relationTypes.map(function (value) { return h('option', { key: value, value: value.toLowerCase() }, humanize(value)); })
          )
        ),
        view.available.graphKinds.length > 1 ? h('label', { htmlFor: ids.graphKind, style: { display: 'grid', gap: 4, flex: '1 1 10rem' } }, tr('learning_web_explorer.graph_source', 'Graph source'),
          h('select', { id: ids.graphKind, value: graphKind, onChange: function (event) { setGraphKind(event.target.value); }, style: { minHeight: 44, width: '100%' } },
            h('option', { value: 'all' }, tr('learning_web_explorer.all_graph_sources', 'All graph sources')),
            view.available.graphKinds.map(function (value) { return h('option', { key: value, value: value.toLowerCase() }, humanize(value)); })
          )
        ) : null,
        h('button', { type: 'button', onClick: resetFilters, disabled: !filterActive, style: { minHeight: 44 } }, tr('learning_web_explorer.reset_filters', 'Reset filters'))
      ),
      callbackStatus ? h('p', { role: 'status', 'aria-live': 'polite', 'data-learning-web-callback-status': 'true' }, callbackStatus) : null,
      h('p', { role: 'status', 'aria-live': 'polite' }, tr('learning_web_explorer.counts', '{nodes} of {totalNodes} nodes; {edges} of {totalEdges} relationships.', { nodes: graph.nodes.length, totalNodes: normalized.nodes.length, edges: graph.edges.length, totalEdges: normalized.edges.length })),
      focusControls,
      visual,
      selectedDetail,
      h('section', { 'aria-labelledby': ids.outline, style: { marginTop: 20 } },
        h('h3', { id: ids.outline }, tr('learning_web_explorer.outline', 'Accessible graph outline')),
        Object.keys(grouped).sort(compareText).length
          ? h('ul', null, Object.keys(grouped).sort(compareText).map(function (kind) {
            return h('li', { key: kind },
              h('strong', null, humanize(kind)),
              h('ul', null, grouped[kind].map(function (node) {
                var current = isCurrentResourceNode(node);
                return h('li', { key: node.id },
                  h('button', {
                    type: 'button',
                    onClick: function () { choose('node', node); },
                    'aria-pressed': selected && selected.kind === 'node' && selected.id === node.id ? 'true' : 'false',
                    'aria-current': current ? 'true' : undefined,
                    style: { minHeight: 44 },
                    'data-learning-web-node-select': node.id
                  }, node.label),
                  ' — ', humanize(node.type), node.category ? ' · ' + node.category : '',
                  current ? h('span', { 'data-current-resource-label': 'true' }, ' — ' + tr('learning_web_explorer.current_resource', 'Current resource')) : null
                );
              }))
            );
          }))
          : h('p', null, tr('learning_web_explorer.outline.empty', 'No nodes to list.'))
      ),
      h('section', { 'aria-labelledby': ids.relationships, style: { marginTop: 20 } },
        h('h3', { id: ids.relationships }, tr('learning_web_explorer.relationships', 'Relationships')),
        h('div', { style: { overflowX: 'auto' } },
          h('table', { style: { width: '100%', borderCollapse: 'collapse' } },
            h('thead', null, h('tr', null,
              h('th', { scope: 'col', style: { textAlign: 'left' } }, tr('learning_web_explorer.table.from', 'From')),
              h('th', { scope: 'col', style: { textAlign: 'left' } }, tr('learning_web_explorer.table.relationship', 'Relationship')),
              h('th', { scope: 'col', style: { textAlign: 'left' } }, tr('learning_web_explorer.table.to', 'To')),
              h('th', { scope: 'col', style: { textAlign: 'left' } }, tr('learning_web_explorer.table.source', 'Evidence source')),
              h('th', { scope: 'col' }, h('span', { style: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' } }, tr('learning_web_explorer.table.action', 'Action')))
            )),
            h('tbody', null, graph.edges.length ? graph.edges.map(function (edge) {
              var from = byId[edge.fromId], to = byId[edge.toId];
              var detailSources = uniqueSorted((edge.sourceDetails || []).map(function (detail) { return detail.provider || detail.title || detail.graphKind; }));
              var source = detailSources.length ? detailSources.join(', ') : (edge.provenance && (edge.provenance.provider || edge.provenance.attribution) || edge.attributionSource || tr('learning_web_explorer.source.none', 'Not supplied'));
              return h('tr', { key: edge.id, 'data-learning-web-edge-row': edge.id },
                h('td', null, from ? from.label : edge.fromId),
                h('td', null, humanize(edge.type)),
                h('td', null, to ? to.label : edge.toId),
                h('td', null, source),
                h('td', null, h('button', {
                  type: 'button',
                  onClick: function () { choose('edge', edge); },
                  'aria-pressed': selected && selected.kind === 'edge' && selected.id === edge.id ? 'true' : 'false',
                  'aria-label': tr('learning_web_explorer.inspect_aria', 'Inspect {relationship} from {from} to {to}', { relationship: humanize(edge.type), from: from ? from.label : edge.fromId, to: to ? to.label : edge.toId }),
                  style: { minHeight: 44 },
                  'data-learning-web-edge-select': edge.id
                }, tr('learning_web_explorer.inspect', 'Inspect')))
              );
            }) : h('tr', null, h('td', { colSpan: 5 }, tr('learning_web_explorer.relationships.empty', 'No relationships to list.'))))
          )
        )
      )
    );
  }

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.LearningWebExplorer = {
    version: VERSION,
    GRAPH_VERSION: GRAPH_VERSION,
    REGISTRY_VERSION: REGISTRY_VERSION,
    LIMITS: Object.assign({}, LIMITS),
    normalizeInput: normalizeInput,
    stateIdentityFor: stateIdentityFor,
    invokeOptionalCallback: invokeOptionalCallback,
    filterGraph: filterGraph,
    filter: filterGraph,
    focusNeighborhood: focusNeighborhood,
    explicitResourceId: explicitResourceId,
    normalizeOpenableResourceIds: normalizeOpenableResourceIds,
    layoutGraph: layoutGraph,
    layout: layoutGraph,
    buildViewGraph: buildViewGraph,
    availableFilters: availableFilters,
    humanize: humanize,
    safeHttpsUrl: safeHttpsUrl,
    View: View
  };
  console.log('[LearningWebExplorer] Registered (accessible read-only 2D explorer for acg/v1)');
})();
