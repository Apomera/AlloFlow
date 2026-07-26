/*
 * AlloFlow Research Evidence Graph v1.0.0
 * Framework-neutral derivation and interoperability exports for Inquiry Portfolio data.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AlloFlowResearchEvidenceGraph = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var VERSION = '1.1.0';
  var SCHEMA_VERSION = 2;
  var RELATION_TYPES = ['supports', 'complicates', 'contradicts', 'contextualizes', 'derivedFrom', 'requiresWarrant', 'frames'];
  var ARGUMENT_RELATIONS = ['supports', 'complicates', 'contradicts', 'contextualizes'];
  var EVIDENCE_TYPES = ['source', 'evidence', 'tool_artifact', 'annotation', 'test_result', 'model'];
  var CLAIM_TYPES = ['claim', 'humanities_position', 'design_claim'];

  function list(value) { return Array.isArray(value) ? value : []; }
  function clip(value, limit) { return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, limit || 1200); }
  function redact(value, limit) {
    return clip(value, limit || 1600)
      .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email omitted]')
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[identifier omitted]')
      .replace(/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/g, '[phone omitted]')
      .replace(/\b[ACGTUN]{40,}\b/gi, '[nucleic-acid sequence omitted]')
      .replace(/\b[ACDEFGHIKLMNPQRSTVWY]{40,}\b/gi, '[protein sequence omitted]');
  }
  function hash(value) {
    var input = String(value == null ? '' : value);
    var out = 2166136261;
    for (var i = 0; i < input.length; i++) { out ^= input.charCodeAt(i); out = Math.imul(out, 16777619); }
    return (out >>> 0).toString(16).padStart(8, '0');
  }
  function identifier(prefix, raw, fallback) {
    var existing = clip(raw && raw.id, 160);
    return prefix + ':' + (existing || hash(fallback || JSON.stringify(raw || {})));
  }
  function exportTimestamp(journal) {
    return timestamp(journal && (journal.updatedAt || journal.createdAt)) || '1970-01-01T00:00:00.000Z';
  }
  function recordRef(collection, raw, fallbackId) {
    return { collection: collection, id: clip(raw && raw.id, 160) || clip(fallbackId, 160) };
  }
  function timestamp(value) {
    if (!value) return '';
    var date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString();
  }
  function relation(value, fallback) {
    var normalized = clip(value, 40).replace(/[\s_-]+/g, '').toLowerCase();
    var map = {
      supports: 'supports', support: 'supports', corroborates: 'supports',
      complicates: 'complicates', complicate: 'complicates', challenges: 'complicates', challenge: 'complicates',
      contradicts: 'contradicts', contradict: 'contradicts', refutes: 'contradicts',
      contextualizes: 'contextualizes', context: 'contextualizes', providescontext: 'contextualizes',
      derivedfrom: 'derivedFrom', requireswarrant: 'requiresWarrant', frames: 'frames'
    };
    return map[normalized] || fallback || 'supports';
  }
  function nodeLabel(raw, fallback) {
    return redact(raw && (raw.title || raw.label || raw.name || raw.text || raw.citation || raw.summary || raw.observationText), 180) || fallback;
  }

  function buildEvidenceGraph(journal) {
    var j = journal || {};
    var nodes = [];
    var edges = [];
    var byId = {};
    var aliases = {};
    var integrityIssues = [];

    function addNode(node, rawAliases) {
      if (!node || !node.id) return null;
      if (byId[node.id]) {
        integrityIssues.push({ severity: 'action', code: 'duplicate_graph_id', nodeId: node.id, message: 'More than one portfolio record resolves to ' + node.id + '. Assign unique record IDs before relying on this graph.' });
        integrityIssues.push({ severity: 'action', code: 'ambiguous_graph_reference', reference: node.id, message: 'The duplicated record ID ' + node.id + ' is ambiguous and cannot safely identify one record.' });
        return byId[node.id];
      }
      node.label = redact(node.label, 180) || 'Untitled ' + node.type;
      node.description = redact(node.description, 1600);
      nodes.push(node);
      byId[node.id] = node;
      [node.id].concat(rawAliases || []).filter(Boolean).forEach(function (alias) {
        var key = String(alias);
        if (aliases[key] && aliases[key] !== node.id) {
          integrityIssues.push({ severity: 'action', code: 'ambiguous_graph_reference', reference: key, message: 'The reference "' + redact(key, 120) + '" matches more than one graph node.' });
          aliases[key] = null;
        } else if (aliases[key] !== null) aliases[key] = node.id;
      });
      return node;
    }
    function resolve(value) {
      if (value && typeof value === 'object') value = value.id || value.claimId || value.text;
      var key = String(value == null ? '' : value);
      if (aliases[key]) return aliases[key];
      if (Object.prototype.hasOwnProperty.call(aliases, key) && aliases[key] === null) return null;
      var normalized = clip(key, 500).toLowerCase();
      var matches = nodes.filter(function (node) {
        return clip(node.label, 500).toLowerCase() === normalized || clip(node.description, 500).toLowerCase() === normalized;
      });
      if (matches.length > 1) {
        integrityIssues.push({ severity: 'action', code: 'ambiguous_graph_reference', reference: key, message: 'The text reference "' + redact(key, 120) + '" is ambiguous. Link records by ID instead.' });
        return null;
      }
      return matches[0] && matches[0].id;
    }
    function addEdge(from, type, to, details) {
      var fromId = resolve(from) || from;
      var toId = resolve(to) || to;
      var info = details || {};
      if (!byId[fromId] || !byId[toId]) {
        integrityIssues.push({
          severity: 'action', code: 'dangling_graph_reference',
          reference: !byId[fromId] ? clip(from, 180) : clip(to, 180),
          declaredBy: clip(info.declaredBy, 160),
          message: 'A relationship from ' + (info.declaredBy || 'the portfolio') + ' points to a missing or ambiguous record.'
        });
        return null;
      }
      if (fromId === toId) {
        integrityIssues.push({ severity: 'action', code: 'self_graph_reference', nodeId: fromId, declaredBy: clip(info.declaredBy, 160), message: 'A graph relationship cannot point a record to itself.' });
        return null;
      }
      var edgeType = relation(type, type);
      if (RELATION_TYPES.indexOf(edgeType) === -1) return null;
      var edge = {
        id: 'edge:' + hash([fromId, edgeType, toId, clip(info.warrant, 800), clip(info.declaredBy, 120)].join('|')),
        from: fromId,
        type: edgeType,
        to: toId,
        warrant: redact(info.warrant, 900),
        qualifier: redact(info.qualifier, 500),
        rebuttal: redact(info.rebuttal, 700),
        declaredBy: clip(info.declaredBy, 160)
      };
      if (!edges.some(function (existing) { return existing.id === edge.id; })) edges.push(edge);
      return edge;
    }

    var question = null;
    if (clip(j.questionTitle, 240)) {
      question = addNode({
        id: 'question:' + hash(j.questionTitle), type: 'question', discipline: 'cross-disciplinary',
        label: redact(j.questionTitle, 240), description: '', provenance: { methodPackId: j.activeMethodPack || null, inquiryEpisodeId: j.activeInquiryEpisodeId || null }
      });
    }

    var claimNodes = [];
    list(j.claims).forEach(function (claim) {
      var id = identifier('claim', claim, claim && claim.text);
      claimNodes.push(addNode({
        id: id, type: 'claim', discipline: 'scientific', record: recordRef('claims', claim, claim && claim.text), label: nodeLabel(claim, 'Scientific claim'),
        description: redact(claim && (claim.warrantText || claim.calibrationResponse), 1200),
        createdAt: timestamp(claim && (claim.ts || claim.createdAt)),
        provenance: { methodPackId: claim && claim.methodPackId || null, inquiryEpisodeId: claim && claim.inquiryEpisodeId || null }
      }, [claim && claim.id, claim && claim.text]));
    });
    if (j.humanitiesPosition && clip(j.humanitiesPosition.text, 1200)) {
      claimNodes.push(addNode({
        id: identifier('position', j.humanitiesPosition, j.humanitiesPosition.text), type: 'humanities_position', discipline: 'humanities', record: recordRef('humanitiesPosition', j.humanitiesPosition, 'humanitiesPosition'),
        label: nodeLabel(j.humanitiesPosition, 'Humanities position'),
        description: redact(j.humanitiesPosition.whatThisClaimDoesNotSpeakTo || j.humanitiesPosition.positionalityLinkText, 1200),
        createdAt: timestamp(j.humanitiesPosition.ts),
        provenance: { methodPackId: j.humanitiesPosition.methodPackId || j.activeMethodPack || null, inquiryEpisodeId: j.humanitiesPosition.inquiryEpisodeId || j.activeInquiryEpisodeId || null }
      }, [j.humanitiesPosition.id, j.humanitiesPosition.text, 'humanitiesPosition']));
    }
    list(j.designClaims).forEach(function (claim) {
      claimNodes.push(addNode({
        id: identifier('design-claim', claim, claim && claim.text), type: 'design_claim', discipline: 'engineering', record: recordRef('designClaims', claim, claim && claim.text),
        label: nodeLabel(claim, 'Design claim'), description: redact(claim && (claim.limitations || claim.calibrationResponse), 1200),
        createdAt: timestamp(claim && claim.ts),
        provenance: { methodPackId: claim && claim.methodPackId || null, inquiryEpisodeId: claim && claim.inquiryEpisodeId || null }
      }, [claim && claim.id, claim && claim.text]));
    });
    if (question) claimNodes.forEach(function (claim) { addEdge(question.id, 'frames', claim.id, { declaredBy: 'journal.questionTitle' }); });

    list(j.sources).forEach(function (source) {
      addNode({
        id: identifier('source', source, source && source.citation), type: 'source', record: recordRef('sources', source, source && source.citation), discipline: source && source.domain || 'cross-disciplinary',
        label: nodeLabel(source, 'Recorded source'),
        description: redact(source && (source.notes || source.context || source.historicalContext || source.humanitiesContext && source.humanitiesContext.historicalContext), 1500),
        url: clip(source && (source.url || source.stableUrl), 500), createdAt: timestamp(source && source.ts),
        provenance: { citation: redact(source && source.citation, 900), kind: clip(source && source.kind, 80), sift: source && source.sift || null }
      }, [source && source.id, source && source.citation]);
    });
    list(j.evidenceCards).forEach(function (card) {
      addNode({
        id: identifier('evidence', card, card && card.text), type: 'evidence', record: recordRef('evidenceCards', card, card && card.text), discipline: 'cross-disciplinary',
        label: nodeLabel(card, 'Evidence card'), description: redact(card && card.text, 1400), createdAt: timestamp(card && card.ts),
        provenance: { tag: clip(card && card.tag, 120), methodPackId: card && card.methodPackId || null, inquiryEpisodeId: card && card.inquiryEpisodeId || null, toolArtifactId: card && card.toolArtifactId || null }
      }, [card && card.id]);
    });
    list(j.modelSnapshots).forEach(function (model) {
      addNode({
        id: identifier('model', model, model && model.text), type: 'model', record: recordRef('modelSnapshots', model, 'model-v' + (model && model.v)), discipline: 'scientific',
        label: nodeLabel(model, 'Model snapshot'), description: redact(model && (model.knownUnknowns || model.deltaFromPrior), 1200), createdAt: timestamp(model && model.ts),
        provenance: { confidence: model && model.confidence, methodPackId: model && model.methodPackId || null, inquiryEpisodeId: model && model.inquiryEpisodeId || null }
      }, [model && model.id, 'model-v' + (model && model.v)]);
    });
    list(j.testRun).forEach(function (run) {
      addNode({
        id: identifier('test-result', run, [run && run.criterionId, run && run.measured, run && run.unit].join('|')),
        type: 'test_result', discipline: 'engineering', record: recordRef('testRun', run, [run && run.criterionId, run && run.measured, run && run.unit].join('|')), label: nodeLabel(run, 'Test result'),
        description: redact(run && run.observationText, 1200), createdAt: timestamp(run && run.ts),
        provenance: { criterionId: run && run.criterionId, measured: run && run.measured, unit: clip(run && run.unit, 80), passed: run && run.passed }
      }, [run && run.id]);
    });

    list(j.capturedArtifacts).forEach(function (artifact) {
      var artifactNode = addNode({
        id: identifier('artifact', artifact, artifact && artifact.captureFingerprint), type: 'tool_artifact', record: recordRef('capturedArtifacts', artifact, artifact && artifact.captureFingerprint),
        discipline: artifact && artifact.integrationContract && artifact.integrationContract.supportedMethodPacks || [],
        label: nodeLabel(artifact, 'Tool artifact'), description: redact(artifact && (artifact.learnerNote || artifact.summary), 1500),
        url: clip(artifact && artifact.sourceUrl, 500), createdAt: timestamp(artifact && (artifact.acceptedAt || artifact.generatedAt || artifact.queuedAt)),
        provenance: {
          sourceToolId: clip(artifact && artifact.sourceToolId, 120), sourceToolName: clip(artifact && artifact.sourceToolName, 180),
          sourceToolVersion: clip(artifact && artifact.sourceToolVersion, 80), sourceRecordId: clip(artifact && artifact.sourceRecordId, 180),
          reproducibilityReceipt: artifact && artifact.reproducibilityReceipt || null, uncertaintyNote: redact(artifact && artifact.uncertaintyNote, 1000)
        }
      }, [artifact && artifact.id, artifact && artifact.captureFingerprint]);

      var annotationBundle = artifact && artifact.data && artifact.data.annotations;
      var annotations = list(annotationBundle && annotationBundle.annotations);
      annotations.forEach(function (annotation) {
        var target = annotation && (annotation.target || annotation.inquiryTarget) || {};
        var annotationNode = addNode({
          id: identifier('annotation', annotation, [artifactNode.id, annotation && annotation.note, target.excerpt].join('|')),
          type: 'annotation', discipline: 'humanities', record: recordRef('annotations', annotation, annotation && annotation.note), label: redact(annotation && (annotation.note || annotation.content), 180) || 'Close-reading annotation',
          description: redact(annotation && (annotation.note || annotation.content), 900), createdAt: timestamp(annotation && annotation.createdAt),
          provenance: {
            stance: relation(annotation && (annotation.stance || annotation.inquiryStance), annotation && (annotation.stance || annotation.inquiryStance)),
            rawStance: clip(annotation && (annotation.stance || annotation.inquiryStance), 60),
            sourceRecordId: clip(target.sourceRecordId || annotationBundle.sourceRecordId, 180),
            queryTerm: clip(target.queryTerm || annotationBundle.queryTerm, 80),
            excerpt: redact(target.excerpt, 500), sentenceIndex: target.sentenceIndex || null,
            stableUrl: clip(target.stableUrl || annotationBundle.stableUrl, 500)
          }
        }, [annotation && annotation.id]);
        addEdge(annotationNode.id, 'derivedFrom', artifactNode.id, { declaredBy: 'tool annotation bundle' });
        var targetClaim = annotation && (annotation.targetClaimId || annotation.claimId);
        if (targetClaim) addEdge(annotationNode.id, relation(annotation.stance || annotation.inquiryStance, 'contextualizes'), targetClaim, { warrant: annotation.note || annotation.content, declaredBy: 'annotation stance' });
      });
    });

    list(j.evidenceCards).forEach(function (card) {
      if (card && card.toolArtifactId) addEdge(card.id, 'derivedFrom', card.toolArtifactId, { declaredBy: 'evidenceCard.toolArtifactId' });
    });
    list(j.claimEvidenceLinks).forEach(function (link) {
      var claimId = link && (link.claimId || link.claim);
      list(link && link.evidenceIds).forEach(function (evidenceId) {
        addEdge(evidenceId, relation(link.relationship || link.relation, 'supports'), claimId, {
          warrant: link.warrant, qualifier: link.qualifier, rebuttal: link.rebuttal, declaredBy: 'claimEvidenceLinks'
        });
      });
      list(link && (link.counterEvidenceIds || link.counterevidenceIds)).forEach(function (evidenceId) {
        addEdge(evidenceId, 'complicates', claimId, { warrant: link.rebuttal || link.warrant, declaredBy: 'claimEvidenceLinks.counterEvidenceIds' });
      });
    });

    var humanitiesTarget = claimNodes.find(function (node) { return node.type === 'humanities_position'; });
    list(j.sources).forEach(function (source) {
      var relationship = source && source.humanitiesContext && source.humanitiesContext.inquiryRelationship;
      if (!relationship || !humanitiesTarget) return;
      addEdge(source.id, relation(relationship, 'contextualizes'), humanitiesTarget.id, {
        warrant: source.notes || source.humanitiesContext.historicalContext, declaredBy: 'source.humanitiesContext.inquiryRelationship'
      });
    });
    list(j.designClaims).forEach(function (claim) {
      var claimId = claim && claim.id;
      list(claim && claim.claimEvidenceRunIds).forEach(function (runId) {
        addEdge(runId, 'supports', claimId, { warrant: claim.text, declaredBy: 'designClaim.claimEvidenceRunIds' });
      });
    });

    var citationKeys = {};
    list(j.sources).forEach(function (source) {
      var bibliographic = source && (source.citationData || source.bibliography) || {};
      var key = clip(bibliographic.DOI || bibliographic.doi || source && source.doi, 300).toLowerCase() ||
        clip(source && (source.url || source.stableUrl), 500).toLowerCase().replace(/[?#].*$/, '') ||
        [clip(source && (source.title || source.citation), 300).toLowerCase(), clip(bibliographic.issued || source && source.publicationDate, 40)].join('|');
      if (!key || key === '|') return;
      if (citationKeys[key]) integrityIssues.push({ severity: 'review', code: 'duplicate_citation_record', nodeId: identifier('source', source, source && source.citation), message: 'Two source records appear to describe the same work. Review them before citation export.' });
      else citationKeys[key] = true;
    });

    var derivedAdjacency = {};
    edges.filter(function (edge) { return edge.type === 'derivedFrom'; }).forEach(function (edge) {
      if (!derivedAdjacency[edge.from]) derivedAdjacency[edge.from] = [];
      derivedAdjacency[edge.from].push(edge.to);
    });
    var visitState = {};
    var cycleNodes = {};
    function visitDerived(nodeId, trail) {
      if (visitState[nodeId] === 1) {
        trail.slice(Math.max(0, trail.indexOf(nodeId))).forEach(function (id) { cycleNodes[id] = true; });
        return;
      }
      if (visitState[nodeId] === 2) return;
      visitState[nodeId] = 1;
      (derivedAdjacency[nodeId] || []).forEach(function (nextId) { visitDerived(nextId, trail.concat(nodeId)); });
      visitState[nodeId] = 2;
    }
    Object.keys(derivedAdjacency).forEach(function (nodeId) { visitDerived(nodeId, []); });
    if (Object.keys(cycleNodes).length) integrityIssues.push({ severity: 'action', code: 'cyclic_graph_provenance', nodeIds: Object.keys(cycleNodes), message: 'Derived-from relationships contain a cycle, so provenance order is not trustworthy.' });

    var incomingByClaim = {};
    claimNodes.filter(Boolean).forEach(function (claim) { incomingByClaim[claim.id] = []; });
    edges.forEach(function (edge) {
      if (incomingByClaim[edge.to] && ARGUMENT_RELATIONS.indexOf(edge.type) !== -1) incomingByClaim[edge.to].push(edge);
    });
    var diagnostics = integrityIssues.slice();
    claimNodes.filter(Boolean).forEach(function (claim) {
      var incoming = incomingByClaim[claim.id] || [];
      if (!incoming.some(function (edge) { return edge.type === 'supports'; })) diagnostics.push({ severity: 'action', code: 'unsupported_graph_claim', nodeId: claim.id, message: claim.label + ' has no explicit supporting evidence relationship.' });
    });
    edges.filter(function (edge) { return edge.type === 'supports' && !edge.warrant; }).forEach(function (edge) {
      diagnostics.push({ severity: 'action', code: 'missing_graph_warrant', edgeId: edge.id, message: 'A supporting evidence link is missing its explanatory warrant.' });
    });
    if (claimNodes.length && !edges.some(function (edge) { return edge.type === 'complicates' || edge.type === 'contradicts'; })) {
      diagnostics.push({ severity: 'review', code: 'graph_without_counterevidence', message: 'No evidence relationship complicates or contradicts a current claim or position.' });
    }
    var argumentNodeIds = {};
    edges.filter(function (edge) { return ARGUMENT_RELATIONS.indexOf(edge.type) !== -1; }).forEach(function (edge) { argumentNodeIds[edge.from] = true; argumentNodeIds[edge.to] = true; });
    nodes.filter(function (node) { return ['source', 'evidence', 'annotation', 'test_result'].indexOf(node.type) !== -1 && !argumentNodeIds[node.id]; }).forEach(function (node) {
      diagnostics.push({ severity: 'review', code: 'unlinked_graph_evidence', nodeId: node.id, message: node.label + ' is recorded but not linked to a claim or position.' });
    });

    var claimViews = claimNodes.filter(Boolean).map(function (claim) {
      return {
        claim: claim,
        relationships: (incomingByClaim[claim.id] || []).map(function (edge) {
          return { edge: edge, evidence: byId[edge.from] };
        }).filter(function (row) { return !!row.evidence; })
      };
    });
    var counts = {};
    nodes.forEach(function (node) { counts[node.type] = (counts[node.type] || 0) + 1; });
    var snapshotId = 'snapshot:' + hash(JSON.stringify({ nodes: nodes.map(function (node) { return [node.id, node.type, node.label, node.description, node.createdAt, node.provenance, node.record]; }), edges: edges }));
    return {
      schemaVersion: SCHEMA_VERSION, generatorVersion: VERSION, snapshotId: snapshotId, generatedAt: exportTimestamp(j),
      questionNodeId: question && question.id, nodes: nodes, edges: edges, counts: counts, claimViews: claimViews,
      diagnostics: diagnostics,
      status: diagnostics.some(function (item) { return item.severity === 'action'; }) ? 'action_needed' : diagnostics.length ? 'review_recommended' : 'ready'
    };
  }

  function toW3CWebAnnotations(journal, graph) {
    var evidenceGraph = graph || buildEvidenceGraph(journal);
    var annotations = evidenceGraph.nodes.filter(function (node) { return node.type === 'annotation'; });
    return {
      '@context': 'http://www.w3.org/ns/anno.jsonld',
      id: 'urn:alloflow:annotation-page:' + hash((evidenceGraph.snapshotId || '') + '|' + annotations.map(function (node) { return node.id; }).join('|')),
      type: 'AnnotationPage',
      generated: evidenceGraph.generatedAt,
      items: annotations.map(function (node) {
        var p = node.provenance || {};
        var source = p.stableUrl || (p.sourceRecordId ? 'urn:alloflow:source:' + encodeURIComponent(p.sourceRecordId) : 'urn:alloflow:source:unrecorded');
        var bodies = [{ type: 'TextualBody', value: node.description, purpose: 'commenting', format: 'text/plain' }];
        if (p.rawStance) bodies.push({ type: 'TextualBody', value: 'stance:' + p.rawStance, purpose: 'tagging' });
        var target = { source: source };
        if (p.excerpt) target.selector = { type: 'TextQuoteSelector', exact: p.excerpt };
        return {
          id: 'urn:alloflow:' + node.id, type: 'Annotation', motivation: p.rawStance === 'question' ? 'questioning' : 'commenting',
          body: bodies, target: target, created: node.createdAt || undefined,
          creator: { id: 'urn:alloflow:learner', type: 'Person', name: 'AlloFlow learner' }
        };
      })
    };
  }

  function normalizeCslDate(value) {
    if (!value) return undefined;
    if (value['date-parts']) return value;
    if (/^\d{4}$/.test(String(value).trim())) return { 'date-parts': [[Number(value)]] };
    var date = new Date(value);
    if (!Number.isNaN(date.getTime())) return { 'date-parts': [[date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()]] };
    var year = String(value).match(/\b(1[5-9]\d{2}|20\d{2}|21\d{2})\b/);
    return year ? { 'date-parts': [[Number(year[1])]] } : undefined;
  }
  function normalizeCslNames(value) {
    var names = Array.isArray(value) ? value : value ? [value] : [];
    return names.map(function (name) {
      if (typeof name === 'string') return { literal: redact(name, 300) };
      if (!name || typeof name !== 'object') return null;
      var normalized = {};
      if (clip(name.family, 160)) normalized.family = redact(name.family, 160);
      if (clip(name.given, 160)) normalized.given = redact(name.given, 160);
      if (clip(name.literal, 300)) normalized.literal = redact(name.literal, 300);
      if (clip(name['non-dropping-particle'], 80)) normalized['non-dropping-particle'] = redact(name['non-dropping-particle'], 80);
      return Object.keys(normalized).length ? normalized : null;
    }).filter(Boolean);
  }
  function cleanUndefined(record) {
    Object.keys(record).forEach(function (key) { if (record[key] === undefined || record[key] === null || record[key] === '') delete record[key]; });
    return record;
  }
  function toCslJson(journal) {
    var rows = [];
    var seen = {};
    list(journal && journal.sources).forEach(function (source, index) {
      var meta = source && (source.citationData || source.bibliography) || {};
      var creator = meta.author || source && (source.creator || source.author);
      var item = cleanUndefined({
        id: clip(source && source.id, 160) || 'alloflow-source-' + (index + 1),
        type: clip(meta.type, 80) || (/book/i.test(source && source.kind || '') ? 'book' : /journal|article/i.test(source && source.kind || '') ? 'article-journal' : /web|site/i.test(source && source.kind || '') ? 'webpage' : 'document'),
        title: redact(meta.title || source && (source.title || source.citation), 500) || 'Untitled source',
        'container-title': redact(meta['container-title'] || meta.containerTitle, 300) || undefined,
        publisher: redact(meta.publisher, 240) || undefined,
        'publisher-place': redact(meta['publisher-place'] || meta.publisherPlace, 180) || undefined,
        URL: clip(meta.URL || meta.url || source && (source.url || source.stableUrl), 500) || undefined,
        DOI: clip(meta.DOI || meta.doi || source && source.doi, 200) || undefined,
        ISBN: clip(meta.ISBN || meta.isbn || source && source.isbn, 80) || undefined,
        ISSN: clip(meta.ISSN || meta.issn, 80) || undefined,
        author: normalizeCslNames(creator).length ? normalizeCslNames(creator) : undefined,
        editor: normalizeCslNames(meta.editor).length ? normalizeCslNames(meta.editor) : undefined,
        issued: normalizeCslDate(meta.issued || meta.publicationDate || source && source.publicationDate),
        accessed: normalizeCslDate(meta.accessed || source && source.accessedAt),
        volume: clip(meta.volume, 40) || undefined,
        issue: clip(meta.issue, 40) || undefined,
        page: clip(meta.page || meta.pages || source && source.locator, 80) || undefined,
        language: clip(meta.language || source && source.language, 40) || undefined,
        note: redact(meta.note || source && (source.notes || source.humanitiesContext && source.humanitiesContext.historicalContext), 1200) || undefined
      });
      var key = (item.DOI ? 'doi:' + item.DOI.toLowerCase() : item.URL ? 'url:' + item.URL.toLowerCase().replace(/[?#].*$/, '') : 'title:' + item.title.toLowerCase() + '|' + JSON.stringify(item.issued || ''));
      if (!seen[key]) { seen[key] = true; rows.push(item); }
    });
    list(journal && journal.capturedArtifacts).forEach(function (artifact, index) {
      var citation = artifact && artifact.integrationContract && artifact.integrationContract.citation || {};
      if (!clip(citation.text, 500) && !clip(citation.url, 500)) return;
      rows.push(cleanUndefined({
        id: 'alloflow-tool-artifact-' + (clip(artifact.id, 120) || index + 1), type: 'dataset',
        title: redact(artifact.title, 500) || 'AlloFlow tool artifact',
        URL: clip(citation.url || artifact.sourceUrl, 500) || undefined,
        author: artifact.sourceToolName ? [{ literal: redact(artifact.sourceToolName, 180) }] : undefined,
        version: clip(artifact.sourceToolVersion, 80) || undefined,
        issued: normalizeCslDate(artifact.acceptedAt || artifact.generatedAt),
        note: redact(citation.text || artifact.summary, 1200) || undefined
      }));
    });
    return rows;
  }
  function toRoCrate(journal, graph) {
    var evidenceGraph = graph || buildEvidenceGraph(journal);
    var exportedAt = evidenceGraph.generatedAt;
    var metadataId = 'ro-crate-metadata.json';
    var rootId = './';
    var graphId = '#alloflow-evidence-graph';
    var entities = [
      { '@id': metadataId, '@type': 'CreativeWork', about: { '@id': rootId }, conformsTo: { '@id': 'https://w3id.org/ro/crate/1.3' } },
      {
        '@id': rootId, '@type': 'Dataset', name: redact(journal && journal.questionTitle, 240) || 'AlloFlow Inquiry Portfolio',
        description: 'A bounded AlloFlow inquiry package containing claims, evidence relationships, source records, annotations, and reproducibility metadata.',
        datePublished: exportedAt, hasPart: [{ '@id': graphId }].concat(evidenceGraph.nodes.map(function (node) { return { '@id': 'urn:alloflow:' + node.id }; }))
      },
      {
        '@id': graphId, '@type': 'Dataset', name: 'AlloFlow Evidence Graph', version: String(SCHEMA_VERSION),
        description: 'Explicit supports, complicates, contradicts, contextualizes, derivedFrom, requiresWarrant, and frames relationships.',
        hasPart: evidenceGraph.edges.map(function (edge) { return { '@id': 'urn:alloflow:' + edge.id }; })
      }
    ];
    evidenceGraph.nodes.forEach(function (node) {
      var type = node.type === 'tool_artifact' || node.type === 'test_result' ? 'Dataset' : node.type === 'annotation' ? 'Comment' : 'CreativeWork';
      var entity = {
        '@id': 'urn:alloflow:' + node.id, '@type': type, name: node.label,
        description: node.description || undefined, dateCreated: node.createdAt || undefined,
        additionalType: 'https://alloflow.org/evidence-node/' + node.type,
        isPartOf: { '@id': rootId }, url: node.url || undefined,
        identifier: node.id, additionalProperty: [{ '@type': 'PropertyValue', name: 'discipline', value: Array.isArray(node.discipline) ? node.discipline.join(', ') : node.discipline }]
      };
      Object.keys(entity).forEach(function (key) { if (entity[key] === undefined) delete entity[key]; });
      entities.push(entity);
    });
    evidenceGraph.edges.forEach(function (edge) {
      entities.push({
        '@id': 'urn:alloflow:' + edge.id, '@type': 'PropertyValue', name: edge.type,
        value: edge.from + ' -> ' + edge.to, description: edge.warrant || undefined,
        subjectOf: { '@id': 'urn:alloflow:' + edge.from }, isPartOf: { '@id': graphId },
        additionalProperty: [
          { '@type': 'PropertyValue', name: 'from', value: edge.from },
          { '@type': 'PropertyValue', name: 'to', value: edge.to },
          { '@type': 'PropertyValue', name: 'relationship', value: edge.type }
        ]
      });
    });
    return { '@context': 'https://w3id.org/ro/crate/1.3/context', '@graph': entities };
  }

  function sanitizePortableJournal(journal) {
    function walk(value, key, depth) {
      if (depth > 18) return '[depth limit reached]';
      if (value == null || typeof value === 'number' || typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        if (/Ref$/.test(key || '') && value.indexOf('media:') === 0) return undefined;
        if (/^(audioBase64|sketchDataUrl|rawFile|fileBytes)$/i.test(key || '') || /^data:(audio|image|video)\//i.test(value)) return undefined;
        return redact(value, 12000);
      }
      if (Array.isArray(value)) return value.slice(0, 3000).map(function (item) { return walk(item, '', depth + 1); }).filter(function (item) { return item !== undefined; });
      if (typeof value !== 'object') return undefined;
      var out = {};
      Object.keys(value).slice(0, 500).forEach(function (childKey) {
        if (childKey === 'loadWarning' || childKey === 'originalSchemaVersion') return;
        var child = walk(value[childKey], childKey, depth + 1);
        if (child !== undefined) out[childKey] = child;
      });
      return out;
    }
    return walk(journal || {}, '', 0) || {};
  }

  function validateEvidenceGraph(graph) {
    var errors = [];
    if (!graph || typeof graph !== 'object') return { ok: false, errors: ['graph must be an object'] };
    if (graph.schemaVersion !== SCHEMA_VERSION) errors.push('unsupported evidence graph schemaVersion');
    if (!Array.isArray(graph.nodes)) errors.push('nodes must be an array');
    if (!Array.isArray(graph.edges)) errors.push('edges must be an array');
    var ids = {};
    list(graph.nodes).forEach(function (node, index) {
      if (!node || !clip(node.id, 200) || !clip(node.type, 80)) errors.push('node ' + index + ' requires id and type');
      else if (ids[node.id]) errors.push('duplicate node id: ' + node.id);
      else ids[node.id] = true;
    });
    var edgeIds = {};
    list(graph.edges).forEach(function (edge, index) {
      if (!edge || !clip(edge.id, 200) || RELATION_TYPES.indexOf(edge.type) === -1) errors.push('edge ' + index + ' has an invalid id or relationship type');
      else if (edgeIds[edge.id]) errors.push('duplicate edge id: ' + edge.id);
      else edgeIds[edge.id] = true;
      if (edge && (!ids[edge.from] || !ids[edge.to])) errors.push('edge ' + (edge.id || index) + ' references a missing node');
    });
    return { ok: errors.length === 0, errors: errors };
  }

  function validateInteroperabilityBundle(bundle) {
    var errors = [];
    if (!bundle || typeof bundle !== 'object') return { ok: false, errors: ['bundle must be an object'] };
    if (bundle.format !== 'alloflow-inquiry-interoperability-bundle') errors.push('unsupported bundle format');
    if (bundle.schemaVersion !== SCHEMA_VERSION) errors.push('unsupported bundle schemaVersion');
    var graphResult = validateEvidenceGraph(bundle.evidenceGraph);
    if (!graphResult.ok) errors = errors.concat(graphResult.errors.map(function (error) { return 'evidenceGraph: ' + error; }));
    if (!bundle.portfolio || typeof bundle.portfolio !== 'object') errors.push('portable portfolio is required');
    if (!bundle.webAnnotations || bundle.webAnnotations.type !== 'AnnotationPage' || !Array.isArray(bundle.webAnnotations.items)) errors.push('W3C AnnotationPage is invalid');
    if (!Array.isArray(bundle.cslJson)) errors.push('cslJson must be an array');
    if (!bundle.roCrateMetadata || !Array.isArray(bundle.roCrateMetadata['@graph'])) errors.push('RO-Crate @graph is required');
    return { ok: errors.length === 0, errors: errors };
  }

  function importPortableBundle(bundle) {
    var validation = validateInteroperabilityBundle(bundle);
    if (!validation.ok) return { ok: false, errors: validation.errors, portfolio: null };
    return { ok: true, errors: [], portfolio: JSON.parse(JSON.stringify(bundle.portfolio)) };
  }

  function buildInteroperabilityBundle(journal, options) {
    var graph = buildEvidenceGraph(journal);
    var opts = options || {};
    var bundle = {
      format: 'alloflow-inquiry-interoperability-bundle',
      schemaVersion: SCHEMA_VERSION,
      snapshotId: graph.snapshotId,
      exportedAt: timestamp(opts.exportedAt) || new Date().toISOString(),
      portfolio: sanitizePortableJournal(journal),
      evidenceGraph: graph,
      webAnnotations: toW3CWebAnnotations(journal, graph),
      cslJson: toCslJson(journal),
      roCrateMetadata: toRoCrate(journal, graph)
    };
    bundle.validation = validateInteroperabilityBundle(bundle);
    return bundle;
  }

  return {
    version: VERSION,
    schemaVersion: SCHEMA_VERSION,
    relationTypes: RELATION_TYPES.slice(),
    buildEvidenceGraph: buildEvidenceGraph,
    toW3CWebAnnotations: toW3CWebAnnotations,
    toCslJson: toCslJson,
    toRoCrate: toRoCrate,
    sanitizePortableJournal: sanitizePortableJournal,
    validateEvidenceGraph: validateEvidenceGraph,
    validateInteroperabilityBundle: validateInteroperabilityBundle,
    importPortableBundle: importPortableBundle,
    buildInteroperabilityBundle: buildInteroperabilityBundle
  };});
