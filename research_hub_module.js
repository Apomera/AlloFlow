var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var require_tmp_research_hub_entry = __commonJS({
  "_tmp_research_hub_entry.jsx"(exports, module) {
    (function(root, factory) {
      var api = factory();
      if (typeof module === "object" && module.exports) module.exports = api;
      if (root) root.AlloFlowResearchEvidenceGraph = api;
    })(typeof globalThis !== "undefined" ? globalThis : exports, function() {
      "use strict";
      var VERSION = "1.0.0";
      var SCHEMA_VERSION = 1;
      var RELATION_TYPES = ["supports", "complicates", "contradicts", "contextualizes", "derivedFrom", "requiresWarrant", "frames"];
      var ARGUMENT_RELATIONS = ["supports", "complicates", "contradicts", "contextualizes"];
      var EVIDENCE_TYPES = ["source", "evidence", "tool_artifact", "annotation", "test_result", "model"];
      var CLAIM_TYPES = ["claim", "humanities_position", "design_claim"];
      function list(value) {
        return Array.isArray(value) ? value : [];
      }
      function clip(value, limit) {
        return String(value == null ? "" : value).replace(/\s+/g, " ").trim().slice(0, limit || 1200);
      }
      function redact(value, limit) {
        return clip(value, limit || 1600).replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email omitted]").replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[identifier omitted]").replace(/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/g, "[phone omitted]").replace(/\b[ACGTUN]{40,}\b/gi, "[nucleic-acid sequence omitted]").replace(/\b[ACDEFGHIKLMNPQRSTVWY]{40,}\b/gi, "[protein sequence omitted]");
      }
      function hash(value) {
        var input = String(value == null ? "" : value);
        var out = 2166136261;
        for (var i = 0; i < input.length; i++) {
          out ^= input.charCodeAt(i);
          out = Math.imul(out, 16777619);
        }
        return (out >>> 0).toString(16).padStart(8, "0");
      }
      function identifier(prefix, raw, fallback) {
        var existing = clip(raw && raw.id, 160);
        return prefix + ":" + (existing || hash(fallback || JSON.stringify(raw || {})));
      }
      function timestamp(value) {
        if (!value) return "";
        var date = new Date(value);
        return Number.isNaN(date.getTime()) ? "" : date.toISOString();
      }
      function relation(value, fallback) {
        var normalized = clip(value, 40).replace(/[\s_-]+/g, "").toLowerCase();
        var map = {
          supports: "supports",
          support: "supports",
          corroborates: "supports",
          complicates: "complicates",
          complicate: "complicates",
          challenges: "complicates",
          challenge: "complicates",
          contradicts: "contradicts",
          contradict: "contradicts",
          refutes: "contradicts",
          contextualizes: "contextualizes",
          context: "contextualizes",
          providescontext: "contextualizes",
          derivedfrom: "derivedFrom",
          requireswarrant: "requiresWarrant",
          frames: "frames"
        };
        return map[normalized] || fallback || "supports";
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
        function addNode(node, rawAliases) {
          if (!node || !node.id || byId[node.id]) return byId[node && node.id];
          node.label = redact(node.label, 180) || "Untitled " + node.type;
          node.description = redact(node.description, 1600);
          nodes.push(node);
          byId[node.id] = node;
          [node.id].concat(rawAliases || []).filter(Boolean).forEach(function(alias) {
            aliases[String(alias)] = node.id;
          });
          return node;
        }
        function resolve(value) {
          if (value && typeof value === "object") value = value.id || value.claimId || value.text;
          var key = String(value == null ? "" : value);
          if (aliases[key]) return aliases[key];
          var normalized = clip(key, 500).toLowerCase();
          var match = nodes.find(function(node) {
            return clip(node.label, 500).toLowerCase() === normalized || clip(node.description, 500).toLowerCase() === normalized;
          });
          return match && match.id;
        }
        function addEdge(from, type, to, details) {
          var fromId = resolve(from) || from;
          var toId = resolve(to) || to;
          if (!byId[fromId] || !byId[toId] || fromId === toId) return null;
          var edgeType = relation(type, type);
          if (RELATION_TYPES.indexOf(edgeType) === -1) return null;
          var info = details || {};
          var edge = {
            id: "edge:" + hash([fromId, edgeType, toId, clip(info.warrant, 800), clip(info.declaredBy, 120)].join("|")),
            from: fromId,
            type: edgeType,
            to: toId,
            warrant: redact(info.warrant, 900),
            qualifier: redact(info.qualifier, 500),
            rebuttal: redact(info.rebuttal, 700),
            declaredBy: clip(info.declaredBy, 160)
          };
          if (!edges.some(function(existing) {
            return existing.id === edge.id;
          })) edges.push(edge);
          return edge;
        }
        var question = null;
        if (clip(j.questionTitle, 240)) {
          question = addNode({
            id: "question:" + hash(j.questionTitle),
            type: "question",
            discipline: "cross-disciplinary",
            label: redact(j.questionTitle, 240),
            description: "",
            provenance: { methodPackId: j.activeMethodPack || null, inquiryEpisodeId: j.activeInquiryEpisodeId || null }
          });
        }
        var claimNodes = [];
        list(j.claims).forEach(function(claim) {
          var id = identifier("claim", claim, claim && claim.text);
          claimNodes.push(addNode({
            id,
            type: "claim",
            discipline: "scientific",
            label: nodeLabel(claim, "Scientific claim"),
            description: redact(claim && (claim.warrantText || claim.calibrationResponse), 1200),
            createdAt: timestamp(claim && (claim.ts || claim.createdAt)),
            provenance: { methodPackId: claim && claim.methodPackId || null, inquiryEpisodeId: claim && claim.inquiryEpisodeId || null }
          }, [claim && claim.id, claim && claim.text]));
        });
        if (j.humanitiesPosition && clip(j.humanitiesPosition.text, 1200)) {
          claimNodes.push(addNode({
            id: identifier("position", j.humanitiesPosition, j.humanitiesPosition.text),
            type: "humanities_position",
            discipline: "humanities",
            label: nodeLabel(j.humanitiesPosition, "Humanities position"),
            description: redact(j.humanitiesPosition.whatThisClaimDoesNotSpeakTo || j.humanitiesPosition.positionalityLinkText, 1200),
            createdAt: timestamp(j.humanitiesPosition.ts),
            provenance: { methodPackId: j.humanitiesPosition.methodPackId || j.activeMethodPack || null, inquiryEpisodeId: j.humanitiesPosition.inquiryEpisodeId || j.activeInquiryEpisodeId || null }
          }, [j.humanitiesPosition.id, j.humanitiesPosition.text, "humanitiesPosition"]));
        }
        list(j.designClaims).forEach(function(claim) {
          claimNodes.push(addNode({
            id: identifier("design-claim", claim, claim && claim.text),
            type: "design_claim",
            discipline: "engineering",
            label: nodeLabel(claim, "Design claim"),
            description: redact(claim && (claim.limitations || claim.calibrationResponse), 1200),
            createdAt: timestamp(claim && claim.ts),
            provenance: { methodPackId: claim && claim.methodPackId || null, inquiryEpisodeId: claim && claim.inquiryEpisodeId || null }
          }, [claim && claim.id, claim && claim.text]));
        });
        if (question) claimNodes.forEach(function(claim) {
          addEdge(question.id, "frames", claim.id, { declaredBy: "journal.questionTitle" });
        });
        list(j.sources).forEach(function(source) {
          addNode({
            id: identifier("source", source, source && source.citation),
            type: "source",
            discipline: source && source.domain || "cross-disciplinary",
            label: nodeLabel(source, "Recorded source"),
            description: redact(source && (source.notes || source.context || source.historicalContext || source.humanitiesContext && source.humanitiesContext.historicalContext), 1500),
            url: clip(source && (source.url || source.stableUrl), 500),
            createdAt: timestamp(source && source.ts),
            provenance: { citation: redact(source && source.citation, 900), kind: clip(source && source.kind, 80), sift: source && source.sift || null }
          }, [source && source.id, source && source.citation]);
        });
        list(j.evidenceCards).forEach(function(card) {
          addNode({
            id: identifier("evidence", card, card && card.text),
            type: "evidence",
            discipline: "cross-disciplinary",
            label: nodeLabel(card, "Evidence card"),
            description: redact(card && card.text, 1400),
            createdAt: timestamp(card && card.ts),
            provenance: { tag: clip(card && card.tag, 120), methodPackId: card && card.methodPackId || null, inquiryEpisodeId: card && card.inquiryEpisodeId || null, toolArtifactId: card && card.toolArtifactId || null }
          }, [card && card.id]);
        });
        list(j.modelSnapshots).forEach(function(model) {
          addNode({
            id: identifier("model", model, model && model.text),
            type: "model",
            discipline: "scientific",
            label: nodeLabel(model, "Model snapshot"),
            description: redact(model && (model.knownUnknowns || model.deltaFromPrior), 1200),
            createdAt: timestamp(model && model.ts),
            provenance: { confidence: model && model.confidence, methodPackId: model && model.methodPackId || null, inquiryEpisodeId: model && model.inquiryEpisodeId || null }
          }, [model && model.id, "model-v" + (model && model.v)]);
        });
        list(j.testRun).forEach(function(run) {
          addNode({
            id: identifier("test-result", run, [run && run.criterionId, run && run.measured, run && run.unit].join("|")),
            type: "test_result",
            discipline: "engineering",
            label: nodeLabel(run, "Test result"),
            description: redact(run && run.observationText, 1200),
            createdAt: timestamp(run && run.ts),
            provenance: { criterionId: run && run.criterionId, measured: run && run.measured, unit: clip(run && run.unit, 80), passed: run && run.passed }
          }, [run && run.id]);
        });
        list(j.capturedArtifacts).forEach(function(artifact) {
          var artifactNode = addNode({
            id: identifier("artifact", artifact, artifact && artifact.captureFingerprint),
            type: "tool_artifact",
            discipline: artifact && artifact.integrationContract && artifact.integrationContract.supportedMethodPacks || [],
            label: nodeLabel(artifact, "Tool artifact"),
            description: redact(artifact && (artifact.learnerNote || artifact.summary), 1500),
            url: clip(artifact && artifact.sourceUrl, 500),
            createdAt: timestamp(artifact && (artifact.acceptedAt || artifact.generatedAt || artifact.queuedAt)),
            provenance: {
              sourceToolId: clip(artifact && artifact.sourceToolId, 120),
              sourceToolName: clip(artifact && artifact.sourceToolName, 180),
              sourceToolVersion: clip(artifact && artifact.sourceToolVersion, 80),
              sourceRecordId: clip(artifact && artifact.sourceRecordId, 180),
              reproducibilityReceipt: artifact && artifact.reproducibilityReceipt || null,
              uncertaintyNote: redact(artifact && artifact.uncertaintyNote, 1e3)
            }
          }, [artifact && artifact.id, artifact && artifact.captureFingerprint]);
          var annotationBundle = artifact && artifact.data && artifact.data.annotations;
          var annotations = list(annotationBundle && annotationBundle.annotations);
          annotations.forEach(function(annotation) {
            var target = annotation && (annotation.target || annotation.inquiryTarget) || {};
            var annotationNode = addNode({
              id: identifier("annotation", annotation, [artifactNode.id, annotation && annotation.note, target.excerpt].join("|")),
              type: "annotation",
              discipline: "humanities",
              label: redact(annotation && (annotation.note || annotation.content), 180) || "Close-reading annotation",
              description: redact(annotation && (annotation.note || annotation.content), 900),
              createdAt: timestamp(annotation && annotation.createdAt),
              provenance: {
                stance: relation(annotation && (annotation.stance || annotation.inquiryStance), annotation && (annotation.stance || annotation.inquiryStance)),
                rawStance: clip(annotation && (annotation.stance || annotation.inquiryStance), 60),
                sourceRecordId: clip(target.sourceRecordId || annotationBundle.sourceRecordId, 180),
                queryTerm: clip(target.queryTerm || annotationBundle.queryTerm, 80),
                excerpt: redact(target.excerpt, 500),
                sentenceIndex: target.sentenceIndex || null,
                stableUrl: clip(target.stableUrl || annotationBundle.stableUrl, 500)
              }
            }, [annotation && annotation.id]);
            addEdge(annotationNode.id, "derivedFrom", artifactNode.id, { declaredBy: "tool annotation bundle" });
            var targetClaim = resolve(annotation && (annotation.targetClaimId || annotation.claimId));
            if (targetClaim) addEdge(annotationNode.id, relation(annotation.stance || annotation.inquiryStance, "contextualizes"), targetClaim, { warrant: annotation.note || annotation.content, declaredBy: "annotation stance" });
          });
        });
        list(j.evidenceCards).forEach(function(card) {
          if (card && card.toolArtifactId) addEdge(resolve(card.id), "derivedFrom", resolve(card.toolArtifactId), { declaredBy: "evidenceCard.toolArtifactId" });
        });
        list(j.claimEvidenceLinks).forEach(function(link) {
          var claimId = resolve(link && (link.claimId || link.claim));
          list(link && link.evidenceIds).forEach(function(evidenceId) {
            addEdge(resolve(evidenceId), relation(link.relationship || link.relation, "supports"), claimId, {
              warrant: link.warrant,
              qualifier: link.qualifier,
              rebuttal: link.rebuttal,
              declaredBy: "claimEvidenceLinks"
            });
          });
          list(link && (link.counterEvidenceIds || link.counterevidenceIds)).forEach(function(evidenceId) {
            addEdge(resolve(evidenceId), "complicates", claimId, { warrant: link.rebuttal || link.warrant, declaredBy: "claimEvidenceLinks.counterEvidenceIds" });
          });
        });
        var humanitiesTarget = claimNodes.find(function(node) {
          return node.type === "humanities_position";
        });
        list(j.sources).forEach(function(source) {
          var relationship = source && source.humanitiesContext && source.humanitiesContext.inquiryRelationship;
          if (!relationship || !humanitiesTarget) return;
          addEdge(resolve(source.id), relation(relationship, "contextualizes"), humanitiesTarget.id, {
            warrant: source.notes || source.humanitiesContext.historicalContext,
            declaredBy: "source.humanitiesContext.inquiryRelationship"
          });
        });
        list(j.designClaims).forEach(function(claim) {
          var claimId = resolve(claim && claim.id);
          list(claim && claim.claimEvidenceRunIds).forEach(function(runId) {
            addEdge(resolve(runId), "supports", claimId, { warrant: claim.text, declaredBy: "designClaim.claimEvidenceRunIds" });
          });
        });
        var incomingByClaim = {};
        claimNodes.filter(Boolean).forEach(function(claim) {
          incomingByClaim[claim.id] = [];
        });
        edges.forEach(function(edge) {
          if (incomingByClaim[edge.to] && ARGUMENT_RELATIONS.indexOf(edge.type) !== -1) incomingByClaim[edge.to].push(edge);
        });
        var diagnostics = [];
        claimNodes.filter(Boolean).forEach(function(claim) {
          var incoming = incomingByClaim[claim.id] || [];
          if (!incoming.some(function(edge) {
            return edge.type === "supports";
          })) diagnostics.push({ severity: "action", code: "unsupported_graph_claim", nodeId: claim.id, message: claim.label + " has no explicit supporting evidence relationship." });
        });
        edges.filter(function(edge) {
          return edge.type === "supports" && !edge.warrant;
        }).forEach(function(edge) {
          diagnostics.push({ severity: "action", code: "missing_graph_warrant", edgeId: edge.id, message: "A supporting evidence link is missing its explanatory warrant." });
        });
        if (claimNodes.length && !edges.some(function(edge) {
          return edge.type === "complicates" || edge.type === "contradicts";
        })) {
          diagnostics.push({ severity: "review", code: "graph_without_counterevidence", message: "No evidence relationship complicates or contradicts a current claim or position." });
        }
        var argumentNodeIds = {};
        edges.filter(function(edge) {
          return ARGUMENT_RELATIONS.indexOf(edge.type) !== -1;
        }).forEach(function(edge) {
          argumentNodeIds[edge.from] = true;
          argumentNodeIds[edge.to] = true;
        });
        nodes.filter(function(node) {
          return ["source", "evidence", "annotation", "test_result"].indexOf(node.type) !== -1 && !argumentNodeIds[node.id];
        }).forEach(function(node) {
          diagnostics.push({ severity: "review", code: "unlinked_graph_evidence", nodeId: node.id, message: node.label + " is recorded but not linked to a claim or position." });
        });
        var claimViews = claimNodes.filter(Boolean).map(function(claim) {
          return {
            claim,
            relationships: (incomingByClaim[claim.id] || []).map(function(edge) {
              return { edge, evidence: byId[edge.from] };
            }).filter(function(row) {
              return !!row.evidence;
            })
          };
        });
        var counts = {};
        nodes.forEach(function(node) {
          counts[node.type] = (counts[node.type] || 0) + 1;
        });
        return {
          schemaVersion: SCHEMA_VERSION,
          generatorVersion: VERSION,
          generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          questionNodeId: question && question.id,
          nodes,
          edges,
          counts,
          claimViews,
          diagnostics,
          status: diagnostics.some(function(item) {
            return item.severity === "action";
          }) ? "action_needed" : diagnostics.length ? "review_recommended" : "ready"
        };
      }
      function toW3CWebAnnotations(journal, graph) {
        var evidenceGraph = graph || buildEvidenceGraph(journal);
        var annotations = evidenceGraph.nodes.filter(function(node) {
          return node.type === "annotation";
        });
        return {
          "@context": "http://www.w3.org/ns/anno.jsonld",
          id: "urn:alloflow:annotation-page:" + hash(evidenceGraph.generatedAt + "|" + annotations.map(function(node) {
            return node.id;
          }).join("|")),
          type: "AnnotationPage",
          generated: evidenceGraph.generatedAt,
          items: annotations.map(function(node) {
            var p = node.provenance || {};
            var source = p.stableUrl || (p.sourceRecordId ? "urn:alloflow:source:" + encodeURIComponent(p.sourceRecordId) : "urn:alloflow:source:unrecorded");
            var bodies = [{ type: "TextualBody", value: node.description, purpose: "commenting", format: "text/plain" }];
            if (p.rawStance) bodies.push({ type: "TextualBody", value: "stance:" + p.rawStance, purpose: "tagging" });
            var target = { source };
            if (p.excerpt) target.selector = { type: "TextQuoteSelector", exact: p.excerpt };
            return {
              id: "urn:alloflow:" + node.id,
              type: "Annotation",
              motivation: p.rawStance === "question" ? "questioning" : "commenting",
              body: bodies,
              target,
              created: node.createdAt || void 0,
              creator: { id: "urn:alloflow:learner", type: "Person", name: "AlloFlow learner" }
            };
          })
        };
      }
      function toCslJson(journal) {
        var rows = [];
        list(journal && journal.sources).forEach(function(source, index) {
          var creator = clip(source && (source.creator || source.author), 300);
          var item = {
            id: clip(source && source.id, 160) || "alloflow-source-" + (index + 1),
            type: /book/i.test(source && source.kind || "") ? "book" : /journal|article/i.test(source && source.kind || "") ? "article-journal" : /web|site/i.test(source && source.kind || "") ? "webpage" : "document",
            title: redact(source && (source.title || source.citation), 500) || "Untitled source",
            URL: clip(source && (source.url || source.stableUrl), 500) || void 0,
            author: creator ? [{ literal: redact(creator, 300) }] : void 0,
            note: redact(source && (source.notes || source.humanitiesContext && source.humanitiesContext.historicalContext), 1200) || void 0
          };
          Object.keys(item).forEach(function(key) {
            if (item[key] === void 0) delete item[key];
          });
          rows.push(item);
        });
        list(journal && journal.capturedArtifacts).forEach(function(artifact, index) {
          var citation = artifact && artifact.integrationContract && artifact.integrationContract.citation || {};
          if (!clip(citation.text, 500) && !clip(citation.url, 500)) return;
          rows.push({
            id: "alloflow-tool-artifact-" + (clip(artifact.id, 120) || index + 1),
            type: "dataset",
            title: redact(artifact.title, 500) || "AlloFlow tool artifact",
            URL: clip(citation.url || artifact.sourceUrl, 500) || void 0,
            author: artifact.sourceToolName ? [{ literal: redact(artifact.sourceToolName, 180) }] : void 0,
            version: clip(artifact.sourceToolVersion, 80) || void 0,
            note: redact(citation.text || artifact.summary, 1200) || void 0
          });
        });
        return rows;
      }
      function toRoCrate(journal, graph) {
        var evidenceGraph = graph || buildEvidenceGraph(journal);
        var exportedAt = evidenceGraph.generatedAt;
        var metadataId = "ro-crate-metadata.json";
        var rootId = "./";
        var graphId = "#alloflow-evidence-graph";
        var entities = [
          { "@id": metadataId, "@type": "CreativeWork", about: { "@id": rootId }, conformsTo: { "@id": "https://w3id.org/ro/crate/1.3" } },
          {
            "@id": rootId,
            "@type": "Dataset",
            name: redact(journal && journal.questionTitle, 240) || "AlloFlow Inquiry Portfolio",
            description: "A bounded AlloFlow inquiry package containing claims, evidence relationships, source records, annotations, and reproducibility metadata.",
            datePublished: exportedAt,
            hasPart: [{ "@id": graphId }].concat(evidenceGraph.nodes.map(function(node) {
              return { "@id": "urn:alloflow:" + node.id };
            }))
          },
          {
            "@id": graphId,
            "@type": "Dataset",
            name: "AlloFlow Evidence Graph",
            version: String(SCHEMA_VERSION),
            description: "Explicit supports, complicates, contradicts, contextualizes, derivedFrom, requiresWarrant, and frames relationships.",
            hasPart: evidenceGraph.edges.map(function(edge) {
              return { "@id": "urn:alloflow:" + edge.id };
            })
          }
        ];
        evidenceGraph.nodes.forEach(function(node) {
          var type = node.type === "tool_artifact" || node.type === "test_result" ? "Dataset" : node.type === "annotation" ? "Comment" : "CreativeWork";
          var entity = {
            "@id": "urn:alloflow:" + node.id,
            "@type": type,
            name: node.label,
            description: node.description || void 0,
            dateCreated: node.createdAt || void 0,
            additionalType: "https://alloflow.org/evidence-node/" + node.type,
            isPartOf: { "@id": rootId },
            url: node.url || void 0,
            identifier: node.id,
            additionalProperty: [{ "@type": "PropertyValue", name: "discipline", value: Array.isArray(node.discipline) ? node.discipline.join(", ") : node.discipline }]
          };
          Object.keys(entity).forEach(function(key) {
            if (entity[key] === void 0) delete entity[key];
          });
          entities.push(entity);
        });
        evidenceGraph.edges.forEach(function(edge) {
          entities.push({
            "@id": "urn:alloflow:" + edge.id,
            "@type": "PropertyValue",
            name: edge.type,
            value: edge.from + " -> " + edge.to,
            description: edge.warrant || void 0,
            subjectOf: { "@id": "urn:alloflow:" + edge.from },
            isPartOf: { "@id": graphId },
            additionalProperty: [
              { "@type": "PropertyValue", name: "from", value: edge.from },
              { "@type": "PropertyValue", name: "to", value: edge.to },
              { "@type": "PropertyValue", name: "relationship", value: edge.type }
            ]
          });
        });
        return { "@context": "https://w3id.org/ro/crate/1.3/context", "@graph": entities };
      }
      function buildInteroperabilityBundle(journal) {
        var graph = buildEvidenceGraph(journal);
        return {
          format: "alloflow-inquiry-interoperability-bundle",
          schemaVersion: 1,
          exportedAt: graph.generatedAt,
          evidenceGraph: graph,
          webAnnotations: toW3CWebAnnotations(journal, graph),
          cslJson: toCslJson(journal),
          roCrateMetadata: toRoCrate(journal, graph)
        };
      }
      return {
        version: VERSION,
        schemaVersion: SCHEMA_VERSION,
        relationTypes: RELATION_TYPES.slice(),
        buildEvidenceGraph,
        toW3CWebAnnotations,
        toCslJson,
        toRoCrate,
        buildInteroperabilityBundle
      };
    });
    (function() {
      "use strict";
      if (window.AlloModules && window.AlloModules.ResearchHub && window.AlloModules.ResearchHub.__tier >= 4) {
        console.log("[CDN] ResearchHub already loaded, skipping");
        return;
      }
      var React = window.React;
      if (!React) {
        console.error("[ResearchHub] React not found on window");
        return;
      }
      var useState = React.useState;
      var useEffect = React.useEffect;
      var useRef = React.useRef;
      var useCallback = React.useCallback;
      var useMemo = React.useMemo;
      var evidenceGraphApi = window.AlloFlowResearchEvidenceGraph;
      function buildEvidenceGraph(journal) {
        if (evidenceGraphApi && typeof evidenceGraphApi.buildEvidenceGraph === "function") return evidenceGraphApi.buildEvidenceGraph(journal);
        return { schemaVersion: 1, generatorVersion: "unavailable", generatedAt: (/* @__PURE__ */ new Date()).toISOString(), nodes: [], edges: [], counts: {}, claimViews: [], diagnostics: [{ severity: "action", code: "evidence_graph_unavailable", message: "The evidence graph module did not load." }], status: "action_needed" };
      }
      function buildW3CWebAnnotations(journal, graph) {
        return evidenceGraphApi.toW3CWebAnnotations(journal, graph);
      }
      function buildCslJson(journal) {
        return evidenceGraphApi.toCslJson(journal);
      }
      function buildRoCrate(journal, graph) {
        return evidenceGraphApi.toRoCrate(journal, graph);
      }
      function buildInteroperabilityBundle(journal) {
        return evidenceGraphApi.buildInteroperabilityBundle(journal);
      }
      var STORAGE_KEY = "alloflow_research_hub_v1";
      var RECOVERY_STORAGE_KEY = "alloflow_research_hub_recovery_v1";
      var CAPTURE_INBOX_KEY = "alloflow_research_capture_inbox_v1";
      var MAX_CAPTURE_BYTES = 6e4;
      var MAX_CAPTURE_INBOX_ITEMS = 20;
      var MAX_CAPTURES_PER_TOOL_PER_MINUTE = 5;
      var CAPTURE_RATE_WINDOW_MS = 6e4;
      var RESEARCH_STORAGE_SOFT_LIMIT_BYTES = 4 * 1024 * 1024;
      var RESEARCH_STORAGE_WARNING_RATIO = 0.7;
      var TOOL_INTEGRATION_CONTRACT_VERSION = 1;
      var TOOL_INTEGRATION_METHOD_PACKS = [
        "scientific_investigation",
        "engineering_design",
        "humanistic_interpretation",
        "community_qualitative",
        "civic_policy",
        "creative_cultural"
      ];
      var registeredToolIntegrations = {};
      var registeredCaptureSanitizers = {};
      function isPlainRecord(value) {
        return !!value && typeof value === "object" && !Array.isArray(value);
      }
      function safeJsonClone(value) {
        try {
          return JSON.parse(JSON.stringify(value));
        } catch (_) {
          return null;
        }
      }
      function utf8ByteLength(value) {
        var text = String(value || "");
        try {
          return new TextEncoder().encode(text).length;
        } catch (_) {
          try {
            return unescape(encodeURIComponent(text)).length;
          } catch (_2) {
            return text.length * 2;
          }
        }
      }
      function researchStorageHealth(journal) {
        var journalRaw = "";
        try {
          journalRaw = JSON.stringify(journal || {});
        } catch (_) {
          journalRaw = "";
        }
        var inboxRaw = safeLocal(CAPTURE_INBOX_KEY) || "";
        var recoveryRaw = safeLocal(RECOVERY_STORAGE_KEY) || "";
        var bytes = utf8ByteLength(journalRaw) + utf8ByteLength(inboxRaw) + utf8ByteLength(recoveryRaw);
        var ratio = bytes / RESEARCH_STORAGE_SOFT_LIMIT_BYTES;
        return {
          bytes,
          limitBytes: RESEARCH_STORAGE_SOFT_LIMIT_BYTES,
          ratio,
          percent: Math.min(999, Math.round(ratio * 100)),
          status: ratio >= 1 ? "over_limit" : ratio >= 0.9 ? "critical" : ratio >= RESEARCH_STORAGE_WARNING_RATIO ? "warning" : "healthy"
        };
      }
      function validateToolIntegrationContract(input) {
        var issues = [];
        if (!isPlainRecord(input)) return { ok: false, issues: ["contract must be an object"], contract: null };
        if (input.schemaVersion !== TOOL_INTEGRATION_CONTRACT_VERSION) issues.push("schemaVersion must be " + TOOL_INTEGRATION_CONTRACT_VERSION);
        var id = String(input.id || "").trim();
        if (!/^[a-z0-9][a-z0-9_-]{1,79}$/.test(id)) issues.push("id must be a stable lowercase tool identifier");
        if (!String(input.name || "").trim()) issues.push("name is required");
        if (!String(input.version || "").trim()) issues.push("version is required");
        if (!isPlainRecord(input.license) || !String(input.license.name || input.license.spdx || "").trim()) issues.push("license name or SPDX identifier is required");
        if (!isPlainRecord(input.citation) || !String(input.citation.text || "").trim()) issues.push("citation text is required");
        if (!Array.isArray(input.supportedMethodPacks) || !input.supportedMethodPacks.length) issues.push("supportedMethodPacks must name at least one inquiry approach");
        else input.supportedMethodPacks.forEach(function(packId) {
          if (TOOL_INTEGRATION_METHOD_PACKS.indexOf(packId) === -1) issues.push("unsupported method pack: " + String(packId));
        });
        if (!isPlainRecord(input.capabilities) || input.capabilities.captureArtifact !== true) issues.push("capabilities.captureArtifact must be true");
        if (!isPlainRecord(input.privacy) || input.privacy.learnerApprovalRequired !== true) issues.push("privacy.learnerApprovalRequired must be true");
        if (input.privacy && input.privacy.sanitizerRequired === true && !String(input.privacy.sanitizerId || "").trim()) issues.push("privacy.sanitizerId is required when sanitizerRequired is true");
        var reviewedAtMs = Date.parse(String(input.reviewedAt || ""));
        var reviewAfterMs = Date.parse(String(input.reviewAfter || ""));
        if (!isFinite(reviewedAtMs)) issues.push("reviewedAt must be an ISO date");
        if (!isFinite(reviewAfterMs)) issues.push("reviewAfter must be an ISO date");
        if (isFinite(reviewedAtMs) && isFinite(reviewAfterMs) && reviewAfterMs <= reviewedAtMs) issues.push("reviewAfter must be later than reviewedAt");
        if (!isPlainRecord(input.reproducibility) || !Array.isArray(input.reproducibility.requiredFields) || !input.reproducibility.requiredFields.length) issues.push("reproducibility.requiredFields is required");
        else {
          var allowedReceiptFields = ["softwareVersion", "sourceRecordId", "parameters", "randomSeed", "limitations", "datasetVersion", "transformations"];
          input.reproducibility.requiredFields.forEach(function(field) {
            if (allowedReceiptFields.indexOf(field) === -1) issues.push("unknown reproducibility field: " + String(field));
          });
          ["softwareVersion", "limitations"].forEach(function(minimumField) {
            if (input.reproducibility.requiredFields.indexOf(minimumField) === -1) issues.push("reproducibility.requiredFields must include " + minimumField);
          });
        }
        var clone = safeJsonClone(input);
        if (!clone) issues.push("contract must be JSON-serializable");
        else if (JSON.stringify(clone).length > 2e4) issues.push("contract exceeds the 20,000-character metadata limit");
        return { ok: issues.length === 0, issues, contract: clone };
      }
      function registerToolIntegration(input) {
        var checked = validateToolIntegrationContract(input);
        if (!checked.ok) return checked;
        registeredToolIntegrations[checked.contract.id] = checked.contract;
        return { ok: true, issues: [], contract: checked.contract };
      }
      function registerCaptureSanitizer(toolId, sanitizerId, sanitizer) {
        var id = String(toolId || "").trim();
        var sid = String(sanitizerId || "").trim();
        if (!id || !sid || typeof sanitizer !== "function") return { ok: false, reason: "toolId, sanitizerId, and a sanitizer function are required." };
        registeredCaptureSanitizers[id] = { id: sid, sanitize: sanitizer };
        return { ok: true, toolId: id, sanitizerId: sid };
      }
      function transformCaptureStrings(value, transform, depth) {
        if (depth > 10) return value;
        if (typeof value === "string") return transform(value);
        if (Array.isArray(value)) return value.map(function(item) {
          return transformCaptureStrings(item, transform, depth + 1);
        });
        if (isPlainRecord(value)) {
          var out = {};
          Object.keys(value).forEach(function(key) {
            out[key] = transformCaptureStrings(value[key], transform, depth + 1);
          });
          return out;
        }
        return value;
      }
      function enforceCapturePrivacy(input, contract) {
        var clone = safeJsonClone(input);
        if (!clone) return { ok: false, reason: "Capture must be JSON-serializable before privacy review.", findings: [] };
        var findings = [];
        var sourceToolId = String(clone.sourceToolId || "").trim();
        var privacy = contract && contract.privacy || {};
        var registered = registeredCaptureSanitizers[sourceToolId];
        if (privacy.sanitizerRequired === true && (!registered || registered.id !== privacy.sanitizerId)) return { ok: false, reason: "Required sanitizer " + String(privacy.sanitizerId || "") + " is not registered for " + sourceToolId + ".", findings: [] };
        if (registered && (!privacy.sanitizerId || registered.id === privacy.sanitizerId)) {
          try {
            clone = safeJsonClone(registered.sanitize(clone));
            if (!clone) throw new Error("sanitizer returned a non-serializable value");
            findings.push({ code: "tool_sanitizer_applied", count: 1, sanitizerId: registered.id });
          } catch (_) {
            return { ok: false, reason: "The registered capture sanitizer failed.", findings: [] };
          }
        }
        var scanClone = safeJsonClone(clone) || {};
        delete scanClone.integrationContract;
        var serialized = JSON.stringify(scanClone);
        var secretPattern = /(?:\bsk-[A-Za-z0-9_-]{20,}\b|\bAIza[A-Za-z0-9_-]{20,}\b|\bgh[pousr]_[A-Za-z0-9]{20,}\b|-----BEGIN [A-Z ]*PRIVATE KEY-----|authorization\s*:\s*bearer\s+[A-Za-z0-9._~-]{12,})/i;
        if (secretPattern.test(serialized)) return { ok: false, reason: "Capture blocked because it appears to contain a credential or private key.", findings: [{ code: "secret_detected", count: 1 }] };
        if (privacy.directIdentifiersAllowed !== true) {
          var directIdentifierPattern = /(?:\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\b\d{3}-\d{2}-\d{4}\b|\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b)/i;
          if (directIdentifierPattern.test(serialized)) return { ok: false, reason: "Capture blocked because direct contact or identity information was detected.", findings: [{ code: "direct_identifier_detected", count: 1 }] };
        }
        if (privacy.sequenceLikeTextAllowed !== true) {
          var sequenceCount = 0;
          clone = transformCaptureStrings(clone, function(text) {
            return String(text).replace(/\b[ACGTUN]{40,}\b/gi, function() {
              sequenceCount++;
              return "[nucleic-acid sequence omitted]";
            }).replace(/\b[ACDEFGHIKLMNPQRSTVWY]{40,}\b/gi, function() {
              sequenceCount++;
              return "[protein sequence omitted]";
            });
          }, 0);
          if (sequenceCount) findings.push({ code: "sequence_like_text_redacted", count: sequenceCount });
        }
        return { ok: true, value: clone, findings };
      }
      function simpleCaptureHash(text) {
        var hash = 2166136261;
        for (var i = 0; i < text.length; i++) {
          hash ^= text.charCodeAt(i);
          hash = Math.imul(hash, 16777619);
        }
        return ("00000000" + (hash >>> 0).toString(16)).slice(-8);
      }
      function captureFingerprint(artifact) {
        var basis = [artifact.sourceToolId, artifact.title, artifact.summary, artifact.provenance && artifact.provenance.sourceRecordId, JSON.stringify(artifact.data || {})].join("|");
        return simpleCaptureHash(basis);
      }
      function normalizeReproducibilityReceipt(input, capture, contract) {
        var src = isPlainRecord(input) ? input : {};
        var required = contract && contract.reproducibility && Array.isArray(contract.reproducibility.requiredFields) ? contract.reproducibility.requiredFields.slice() : ["softwareVersion", "sourceRecordId", "parameters", "randomSeed", "limitations"];
        var receipt = {
          schemaVersion: 1,
          software: {
            name: String(src.softwareName || capture.sourceToolName || capture.sourceToolId || "").slice(0, 120),
            version: String(src.softwareVersion || capture.sourceToolVersion || "").slice(0, 80)
          },
          sourceRecordId: String(src.sourceRecordId || capture.sourceRecordId || "").slice(0, 180),
          sourceDatabase: String(src.sourceDatabase || "").slice(0, 160),
          datasetVersion: String(src.datasetVersion || "").slice(0, 120),
          parameters: isPlainRecord(src.parameters) ? safeJsonClone(src.parameters) : {},
          randomSeed: src.randomSeed === void 0 || src.randomSeed === null ? "" : String(src.randomSeed).slice(0, 120),
          transformations: Array.isArray(src.transformations) ? src.transformations.map(function(x) {
            return String(x).slice(0, 300);
          }).slice(0, 30) : [],
          limitations: Array.isArray(src.limitations) ? src.limitations.map(function(x) {
            return String(x).slice(0, 500);
          }).slice(0, 20) : [],
          recordedAt: String(src.recordedAt || capture.generatedAt || (/* @__PURE__ */ new Date()).toISOString()).slice(0, 80),
          requiredFields: required
        };
        var missing = [];
        required.forEach(function(field) {
          if (field === "softwareVersion" && !receipt.software.version) missing.push(field);
          else if (field === "sourceRecordId" && !receipt.sourceRecordId) missing.push(field);
          else if (field === "parameters" && !Object.prototype.hasOwnProperty.call(src, "parameters")) missing.push(field);
          else if (field === "randomSeed" && !Object.prototype.hasOwnProperty.call(src, "randomSeed")) missing.push(field);
          else if (field === "limitations" && !receipt.limitations.length) missing.push(field);
          else if (field === "datasetVersion" && !receipt.datasetVersion) missing.push(field);
          else if (field === "transformations" && !receipt.transformations.length) missing.push(field);
        });
        receipt.missingFields = missing;
        receipt.status = missing.length ? "partial" : "complete";
        return receipt;
      }
      function assessResearchArtifactIntegration(artifact) {
        var issues = [];
        var contract = artifact && artifact.integrationContract;
        if (!contract) issues.push({ severity: "review", code: artifact && artifact.integrationContractStatus === "legacy" ? "legacy_integration" : "unregistered_tool", message: artifact && artifact.integrationContractStatus === "legacy" ? "Legacy capture: original contract metadata was not recorded." : "No versioned AlloFlow integration contract is attached." });
        else {
          var checked = validateToolIntegrationContract(contract);
          if (!checked.ok) issues.push({ severity: artifact && artifact.integrationContractStatus === "legacy_contract" ? "review" : "action", code: artifact && artifact.integrationContractStatus === "legacy_contract" ? "legacy_contract_metadata" : "invalid_contract", message: checked.issues.join("; ") });
          if (!contract.license || !String(contract.license.name || contract.license.spdx || "").trim()) issues.push({ severity: "action", code: "missing_license", message: "Tool license metadata is missing." });
          if (!contract.citation || !String(contract.citation.text || "").trim()) issues.push({ severity: "action", code: "missing_citation", message: "Tool citation guidance is missing." });
          var reviewAfterMs = Date.parse(String(contract.reviewAfter || ""));
          if (!isFinite(reviewAfterMs)) issues.push({ severity: "review", code: "missing_freshness_review", message: "No valid integration review date is declared." });
          else if (reviewAfterMs < Date.now()) issues.push({ severity: "review", code: "integration_review_overdue", message: "The integration metadata review is overdue." });
        }
        var receipt = artifact && artifact.reproducibilityReceipt;
        if (!receipt) issues.push({ severity: "review", code: "missing_reproducibility_receipt", message: "No reproducibility receipt is attached." });
        else if (receipt.status !== "complete") issues.push({ severity: "review", code: "partial_reproducibility_receipt", message: "Missing reproducibility fields: " + (receipt.missingFields || []).join(", ") });
        if (artifact && artifact.acceptedAt && !String(artifact.learnerNote || artifact.legacyContextNote || "").trim()) issues.push({ severity: "action", code: "missing_learner_interpretation", message: "The learner has not explained what this output means." });
        if (artifact && artifact.acceptedAt && !String(artifact.uncertaintyNote || "").trim()) issues.push({ severity: "review", code: "missing_uncertainty_note", message: "No uncertainty or limitation note was recorded." });
        return { status: issues.some(function(x) {
          return x.severity === "action";
        }) ? "action_needed" : issues.length ? "needs_review" : "healthy", issues };
      }
      function summarizeIntegrationHealth(artifacts) {
        var rows = (Array.isArray(artifacts) ? artifacts : []).map(function(artifact) {
          return { artifact, health: assessResearchArtifactIntegration(artifact) };
        });
        return {
          total: rows.length,
          healthy: rows.filter(function(row) {
            return row.health.status === "healthy";
          }).length,
          needsReview: rows.filter(function(row) {
            return row.health.status === "needs_review";
          }).length,
          actionNeeded: rows.filter(function(row) {
            return row.health.status === "action_needed";
          }).length,
          rows
        };
      }
      function buildInquiryAudit(journal) {
        var j = journal || {};
        var issues = [];
        var add = function(severity, code, message, count) {
          issues.push({ severity, code, message, count: count || 1 });
        };
        var claims = j.claims || [];
        var links = j.claimEvidenceLinks || [];
        var unsupported = claims.filter(function(claim) {
          return !links.some(function(link) {
            return link.claimId === claim.id || link.claim === claim.id || link.claim && link.claim.id === claim.id || claim.text && link.claim === claim.text;
          });
        });
        if (unsupported.length) add("action", "unsupported_claims", unsupported.length + " claim(s) do not have an explicit evidence-and-warrant link.", unsupported.length);
        if (j.humanitiesPosition && !links.length) add("action", "position_without_warrant", "The humanities position has no explicit evidence-and-warrant link.");
        var unsupportedDesignClaims = (j.designClaims || []).filter(function(claim) {
          return !(claim.claimEvidenceRunIds || []).length && !(claim.constraintRefs || []).length;
        });
        if (unsupportedDesignClaims.length) add("action", "unsupported_design_claims", unsupportedDesignClaims.length + " design claim(s) lack test-run evidence or constraint references.", unsupportedDesignClaims.length);
        var sources = j.sources || [];
        var referencedIds = [];
        links.forEach(function(link) {
          (link.evidenceIds || []).forEach(function(id) {
            if (referencedIds.indexOf(id) === -1) referencedIds.push(id);
          });
        });
        var failedReferenced = sources.filter(function(source) {
          return referencedIds.indexOf(source.id) !== -1 && source.sift && (source.sift.tier === "failed_SIFT" || source.sift.tier === "unvetted");
        });
        if (failedReferenced.length) add("action", "unvetted_linked_sources", failedReferenced.length + " linked source(s) are unvetted or failed SIFT.", failedReferenced.length);
        var humanitiesMethod = ["humanistic_interpretation", "community_qualitative", "civic_policy", "creative_cultural"].indexOf(j.activeMethodPack) !== -1;
        var humanitiesWork = j.activeLane === "humanities" || humanitiesMethod || j.humanitiesPosition || (j.compositions || []).length || (j.framings || []).length;
        if (humanitiesWork && sources.length) {
          var contextMissing = sources.filter(function(source) {
            var context = source.humanitiesContext || {};
            return !context.relationshipType || !String(context.historicalContext || "").trim();
          });
          if (contextMissing.length) add("review", "source_context_gaps", contextMissing.length + " source(s) lack a relationship type or historical/context note.", contextMissing.length);
          var counterSources = sources.filter(function(source) {
            var relationship = (source.humanitiesContext || {}).inquiryRelationship;
            return relationship === "challenges" || relationship === "complicates";
          });
          if ((claims.length || j.humanitiesPosition) && sources.length > 1 && !counterSources.length) add("review", "no_counterevidence_relationship", "No source is marked as challenging or complicating the current position.");
          if ((j.framings || []).length < 2 && (claims.length || j.humanitiesPosition)) add("review", "missing_counterinterpretation", "The position has not yet been tested against at least two framings.");
        }
        var artifacts = j.capturedArtifacts || [];
        var uninterpreted = artifacts.filter(function(artifact) {
          return !String(artifact.learnerNote || artifact.legacyContextNote || "").trim();
        });
        if (uninterpreted.length) add("action", "uninterpreted_tool_outputs", uninterpreted.length + " tool artifact(s) lack learner interpretation.", uninterpreted.length);
        var partialReceipts = artifacts.filter(function(artifact) {
          return !artifact.reproducibilityReceipt || artifact.reproducibilityReceipt.status !== "complete";
        });
        if (partialReceipts.length) add("review", "partial_reproducibility", partialReceipts.length + " tool artifact(s) have incomplete reproducibility receipts.", partialReceipts.length);
        var evidenceGraphAudit = buildEvidenceGraph(j);
        var missingGraphWarrants = (evidenceGraphAudit.diagnostics || []).filter(function(item) {
          return item.code === "missing_graph_warrant";
        });
        if (missingGraphWarrants.length) add("action", "missing_evidence_warrants", missingGraphWarrants.length + " supporting evidence relationship(s) need an explanatory warrant.", missingGraphWarrants.length);
        var unlinkedGraphEvidence = (evidenceGraphAudit.diagnostics || []).filter(function(item) {
          return item.code === "unlinked_graph_evidence";
        });
        if (unlinkedGraphEvidence.length) add("review", "unlinked_evidence", unlinkedGraphEvidence.length + " evidence item(s) are recorded but not connected to a claim or position.", unlinkedGraphEvidence.length);
        var counts = {
          action: issues.filter(function(x) {
            return x.severity === "action";
          }).length,
          review: issues.filter(function(x) {
            return x.severity === "review";
          }).length,
          note: issues.filter(function(x) {
            return x.severity === "note";
          }).length
        };
        return { status: counts.action ? "action_needed" : counts.review ? "review_recommended" : "ready", counts, issues, generatedAt: Date.now() };
      }
      function EvidenceGraphView(props) {
        var graph = props.graph || { nodes: [], edges: [], counts: {}, claimViews: [], diagnostics: [], status: "ready" };
        var relationshipColors = { supports: "#166534", complicates: "#9a3412", contradicts: "#b91c1c", contextualizes: "#1d4ed8" };
        var unlinkedCount = (graph.diagnostics || []).filter(function(item) {
          return item.code === "unlinked_graph_evidence";
        }).length;
        var actionCount = (graph.diagnostics || []).filter(function(item) {
          return item.severity === "action";
        }).length;
        var reviewCount = (graph.diagnostics || []).filter(function(item) {
          return item.severity !== "action";
        }).length;
        return /* @__PURE__ */ React.createElement("details", { "data-research-evidence-graph": "true", style: { marginTop: "12px", borderRadius: "12px", border: "1px solid " + (graph.status === "ready" ? "#86efac" : graph.status === "action_needed" ? "#fca5a5" : "#fcd34d"), background: "#fff" } }, /* @__PURE__ */ React.createElement("summary", { style: { cursor: "pointer", padding: "10px 12px", fontSize: "11px", fontWeight: 900, color: "#1e293b", background: "linear-gradient(90deg,#f8fafc,#f0fdfa)" } }, "Evidence map: ", (graph.claimViews || []).length, " claim", (graph.claimViews || []).length === 1 ? "" : "s", " \xB7 ", (graph.edges || []).filter(function(edge) {
          return ["supports", "complicates", "contradicts", "contextualizes"].indexOf(edge.type) !== -1;
        }).length, " reasoning link(s)"), /* @__PURE__ */ React.createElement("div", { style: { padding: "0 12px 12px" } }, /* @__PURE__ */ React.createElement("p", { style: { margin: "9px 0", fontSize: "10px", color: "#475569" } }, "This map keeps scientific results, humanistic passages, design tests, sources, and tool outputs distinct while showing the relationships you explicitly authored. It does not infer agreement or grade the argument."), (graph.claimViews || []).length ? /* @__PURE__ */ React.createElement("div", { role: "list", "aria-label": "Claims and their evidence relationships", style: { display: "grid", gap: "9px" } }, graph.claimViews.map(function(view) {
          return /* @__PURE__ */ React.createElement("article", { key: view.claim.id, role: "listitem", "data-evidence-claim-node": view.claim.type, style: { borderRadius: "10px", border: "1px solid #cbd5e1", padding: "10px", background: "#f8fafc" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start" } }, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: "11px", color: "#0f172a" } }, view.claim.label), /* @__PURE__ */ React.createElement("span", { style: { flex: "0 0 auto", borderRadius: "999px", padding: "2px 6px", background: "#e0e7ff", color: "#4338ca", fontSize: "8px", fontWeight: 900 } }, view.claim.discipline)), view.relationships.length ? /* @__PURE__ */ React.createElement("ul", { style: { margin: "8px 0 0", padding: 0, listStyle: "none", display: "grid", gap: "6px" } }, view.relationships.map(function(row) {
            return /* @__PURE__ */ React.createElement("li", { key: row.edge.id, "data-evidence-relationship": row.edge.type, style: { borderLeft: "3px solid " + (relationshipColors[row.edge.type] || "#64748b"), padding: "6px 8px", background: "#fff", fontSize: "10px", color: "#334155" } }, /* @__PURE__ */ React.createElement("strong", { style: { color: relationshipColors[row.edge.type] || "#475569" } }, row.edge.type), " \u2190 " + row.evidence.label, row.edge.warrant ? /* @__PURE__ */ React.createElement("div", { style: { marginTop: "3px", color: "#64748b" } }, /* @__PURE__ */ React.createElement("strong", null, "Warrant:"), " ", row.edge.warrant) : /* @__PURE__ */ React.createElement("div", { style: { marginTop: "3px", color: "#b91c1c", fontWeight: 800 } }, "Warrant needed: explain why this evidence bears on the claim."));
          })) : /* @__PURE__ */ React.createElement("div", { style: { marginTop: "7px", padding: "7px", borderRadius: "7px", background: "#fef2f2", color: "#991b1b", fontSize: "10px", fontWeight: 800 } }, "No explicit supporting evidence is connected yet."));
        })) : /* @__PURE__ */ React.createElement("div", { style: { padding: "8px", borderRadius: "8px", background: "#f8fafc", color: "#64748b", fontSize: "10px" } }, "Create a claim, design claim, or humanities position to begin the evidence map."), actionCount || reviewCount ? /* @__PURE__ */ React.createElement("div", { role: "status", style: { marginTop: "9px", padding: "8px", borderRadius: "8px", background: actionCount ? "#fef2f2" : "#fffbeb", color: actionCount ? "#991b1b" : "#92400e", fontSize: "10px" } }, /* @__PURE__ */ React.createElement("strong", null, actionCount, " action \xB7 ", reviewCount, " review"), unlinkedCount ? " \xB7 " + unlinkedCount + " recorded evidence item(s) are not connected to an argument." : "") : /* @__PURE__ */ React.createElement("div", { role: "status", style: { marginTop: "9px", color: "#166534", fontSize: "10px", fontWeight: 800 } }, "Every current claim has explicit support, warrants are present, and counterevidence is represented."), /* @__PURE__ */ React.createElement("div", { "aria-label": "Portable inquiry exports", style: { marginTop: "10px", display: "flex", flexWrap: "wrap", gap: "7px" } }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: props.onDownloadGraph, style: { minHeight: "40px", padding: "6px 9px", borderRadius: "8px", border: "1px solid #475569", background: "#fff", color: "#334155", fontSize: "9px", fontWeight: 900 } }, "Evidence graph JSON"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: props.onDownloadAnnotations, disabled: !graph.counts.annotation, style: { minHeight: "40px", padding: "6px 9px", borderRadius: "8px", border: "1px solid #7c3aed", background: "#fff", color: "#6d28d9", fontSize: "9px", fontWeight: 900, opacity: graph.counts.annotation ? 1 : 0.5 } }, "W3C annotations"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: props.onDownloadCitations, style: { minHeight: "40px", padding: "6px 9px", borderRadius: "8px", border: "1px solid #0369a1", background: "#fff", color: "#0369a1", fontSize: "9px", fontWeight: 900 } }, "CSL citations"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: props.onDownloadRoCrate, style: { minHeight: "40px", padding: "6px 9px", borderRadius: "8px", border: "1px solid #0f766e", background: "#fff", color: "#0f766e", fontSize: "9px", fontWeight: 900 } }, "RO-Crate 1.3 metadata"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: props.onDownloadBundle, style: { minHeight: "40px", padding: "6px 9px", borderRadius: "8px", border: 0, background: "#312e81", color: "#fff", fontSize: "9px", fontWeight: 900 } }, "Complete interoperability bundle"))));
      }
      function researchId(prefix) {
        return String(prefix || "rh") + Date.now() + "_" + Math.floor(Math.random() * 1e6);
      }
      function readCaptureInbox() {
        try {
          var parsed = JSON.parse(safeLocal(CAPTURE_INBOX_KEY) || "[]");
          return Array.isArray(parsed) ? parsed : [];
        } catch (_) {
          return [];
        }
      }
      function writeCaptureInbox(items) {
        return safeLocal(CAPTURE_INBOX_KEY, JSON.stringify(items || [])) === true;
      }
      function removeCaptureInboxItem(id) {
        return writeCaptureInbox(readCaptureInbox().filter(function(item) {
          return item && item.id !== id;
        }));
      }
      function normalizeResearchCapture(input) {
        if (!input || typeof input !== "object") return { ok: false, reason: "Capture must be an object." };
        var preliminaryToolId = String(input.sourceToolId || "").trim().slice(0, 80);
        var preliminaryContract = input.integrationContract || registeredToolIntegrations[preliminaryToolId] || null;
        var privacyResult = enforceCapturePrivacy(input, preliminaryContract);
        if (!privacyResult.ok) return privacyResult;
        input = privacyResult.value;
        var sourceToolId = String(input.sourceToolId || "").trim().slice(0, 80);
        var title = String(input.title || "").trim().slice(0, 180);
        var summary = String(input.summary || "").trim().slice(0, 4e3);
        if (!sourceToolId || !title || !summary) return { ok: false, reason: "sourceToolId, title, and summary are required." };
        var safeData = input.data && typeof input.data === "object" ? input.data : {};
        var serialized = "";
        try {
          serialized = JSON.stringify(safeData);
        } catch (_) {
          return { ok: false, reason: "Artifact data must be serializable." };
        }
        if (serialized.length > MAX_CAPTURE_BYTES) return { ok: false, reason: "Artifact is too large. Capture a summary instead of raw files or sequences." };
        safeData = JSON.parse(serialized);
        var contract = input.integrationContract || registeredToolIntegrations[sourceToolId] || null;
        var checkedContract = contract ? validateToolIntegrationContract(contract) : { ok: true, issues: [], contract: null };
        if (!checkedContract.ok) return { ok: false, reason: "Integration contract is invalid: " + checkedContract.issues.join("; ") };
        if (checkedContract.contract && checkedContract.contract.id !== sourceToolId) return { ok: false, reason: "Integration contract id must match sourceToolId." };
        if (checkedContract.contract) registeredToolIntegrations[sourceToolId] = checkedContract.contract;
        var captureMeta = {
          sourceToolId,
          sourceToolName: String(input.sourceToolName || sourceToolId).trim().slice(0, 120),
          sourceToolVersion: String(input.sourceToolVersion || "unknown").trim().slice(0, 40),
          sourceRecordId: String(input.sourceRecordId || "").trim().slice(0, 180),
          generatedAt: String(input.generatedAt || (/* @__PURE__ */ new Date()).toISOString()).slice(0, 80)
        };
        var artifact = {
          id: researchId("capture_"),
          sourceToolId: captureMeta.sourceToolId,
          sourceToolName: captureMeta.sourceToolName,
          sourceToolVersion: captureMeta.sourceToolVersion,
          artifactKind: String(input.artifactKind || "tool_observation").trim().slice(0, 80),
          title,
          summary,
          data: safeData,
          provenance: {
            sourceRecordId: captureMeta.sourceRecordId,
            sourceUrl: String(input.sourceUrl || "").trim().slice(0, 500),
            generatedAt: captureMeta.generatedAt,
            privacy: String(input.privacy || "No raw files or direct identifiers included.").slice(0, 500)
          },
          integrationContract: checkedContract.contract,
          integrationContractStatus: checkedContract.contract ? "validated" : "unregistered",
          reproducibilityReceipt: normalizeReproducibilityReceipt(input.reproducibilityReceipt || input.reproducibility, captureMeta, checkedContract.contract),
          privacyFindings: privacyResult.findings || [],
          queuedAt: Date.now()
        };
        artifact.captureFingerprint = captureFingerprint(artifact);
        artifact.integrationHealth = assessResearchArtifactIntegration(artifact);
        return { ok: true, artifact };
      }
      function queueResearchCapture(input) {
        var normalized = normalizeResearchCapture(input);
        if (!normalized.ok) return normalized;
        var inbox = readCaptureInbox();
        if (inbox.length >= MAX_CAPTURE_INBOX_ITEMS) return { ok: false, reason: "The Research Hub capture inbox is full. Review or dismiss queued artifacts before sending more." };
        var fingerprint = normalized.artifact.captureFingerprint;
        if (inbox.some(function(item) {
          return item && item.captureFingerprint === fingerprint;
        })) return { ok: false, duplicate: true, reason: "This artifact is already waiting for review." };
        var cutoff = Date.now() - CAPTURE_RATE_WINDOW_MS;
        var recentFromTool = inbox.filter(function(item) {
          return item && item.sourceToolId === normalized.artifact.sourceToolId && item.queuedAt >= cutoff;
        }).length;
        if (recentFromTool >= MAX_CAPTURES_PER_TOOL_PER_MINUTE) return { ok: false, rateLimited: true, reason: "This tool sent too many captures in one minute. Review the queue before trying again." };
        inbox.push(normalized.artifact);
        if (!writeCaptureInbox(inbox)) return { ok: false, reason: "Local storage is unavailable or full. Download existing portfolio work before retrying." };
        try {
          window.dispatchEvent(new CustomEvent("alloflow:research-capture", { detail: normalized.artifact }));
        } catch (_) {
        }
        return { ok: true, queued: true, captureId: normalized.artifact.id, privacyFindings: normalized.artifact.privacyFindings };
      }
      var MAX_AI_CALLS_PER_SESSION = 8;
      var VOICE_NOTE_MAX_SECONDS = 60;
      var INPUT_HARD_CAP = 1500;
      var PROVENANCE_ARRAY_FIELDS = [
        "wonderings",
        "modelSnapshots",
        "sources",
        "evidenceCards",
        "claims",
        "claimEvidenceLinks",
        "tradeOffLedger",
        "constraintMatrix",
        "criteria",
        "candidateConcepts",
        "decisionMatrix",
        "testProtocol",
        "buildLog",
        "testRun",
        "stakeholderFeedback",
        "failureLog",
        "designClaims",
        "framings",
        "framingProbes",
        "positionalitySnapshots",
        "absentVoices",
        "questionStakeholders",
        "humanitiesPlausibleAnswers",
        "compositions",
        "capturedArtifacts"
      ];
      function stampNewInquiryArtifacts(prev, next) {
        if (!next || typeof next !== "object") return prev;
        var methodPackId = next.activeMethodPack || prev.activeMethodPack || null;
        var episodeId = next.activeInquiryEpisodeId || prev.activeInquiryEpisodeId || null;
        if (!methodPackId && !episodeId) return next;
        PROVENANCE_ARRAY_FIELDS.forEach(function(field) {
          var before = Array.isArray(prev[field]) ? prev[field] : [];
          var after = Array.isArray(next[field]) ? next[field] : [];
          if (!after.length || after === before) return;
          var oldIds = new Set(before.map(function(item) {
            return item && item.id;
          }).filter(Boolean));
          next[field] = after.map(function(item, index) {
            if (!item || typeof item !== "object") return item;
            var isNew = item.id ? !oldIds.has(item.id) : index >= before.length;
            if (!isNew || item.methodPackId && item.inquiryEpisodeId) return item;
            return Object.assign({}, item, {
              methodPackId: item.methodPackId || methodPackId,
              inquiryEpisodeId: item.inquiryEpisodeId || episodeId
            });
          });
        });
        return next;
      }
      var ANSWER_HARD_CAP = 800;
      var COOLDOWN_MS = 1500;
      var DEV_LEVELS = [
        { key: "k2", label: "K\u20132", long: "Early elementary (K\u20132)" },
        { key: "3_5", label: "3\u20135", long: "Upper elementary (3\u20135)" },
        { key: "6_8", label: "6\u20138", long: "Middle school (6\u20138)" },
        { key: "9_12", label: "9\u201312", long: "High school (9\u201312)" },
        { key: "ap", label: "AP / honors", long: "AP / honors / dual-enrollment" }
      ];
      function gradeLevelToDevLevel(gl) {
        if (!gl || typeof gl !== "string") return null;
        var s = gl.toLowerCase();
        if (s.indexOf("kindergarten") !== -1 || s.indexOf("pre-k") !== -1 || s.indexOf("pre-kindergarten") !== -1) return "k2";
        if (s.indexOf("college") !== -1 || s.indexOf("graduate") !== -1) return "ap";
        var m = s.match(/(\d+)\s*(?:st|nd|rd|th)?\s*grade/);
        if (m) {
          var n = parseInt(m[1], 10);
          if (n <= 2) return "k2";
          if (n <= 5) return "3_5";
          if (n <= 8) return "6_8";
          return "9_12";
        }
        return null;
      }
      function safeLocal(key, value) {
        try {
          if (value === void 0) return window.localStorage.getItem(key);
          if (value === null) {
            window.localStorage.removeItem(key);
            return true;
          }
          window.localStorage.setItem(key, value);
          return true;
        } catch (_) {
          return value === void 0 ? null : false;
        }
      }
      function downloadJsonFile(filename, value) {
        try {
          var blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
          var url = URL.createObjectURL(blob);
          var a = document.createElement("a");
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.setTimeout(function() {
            URL.revokeObjectURL(url);
          }, 1e3);
          return true;
        } catch (_) {
          return false;
        }
      }
      function emptyJournal() {
        return {
          v: 6,
          // Inquiry-episode + cross-tool provenance revision
          createdAt: Date.now(),
          updatedAt: Date.now(),
          devLevel: "6_8",
          activeLane: null,
          // 'scientific' | 'engineering' | 'humanities' | null
          activeMethodPack: null,
          // specific inquiry approach; several packs can share a lane
          methodPackHistory: [],
          // append-only: [{ id, laneId, episodeId, selectedAt }]
          inquiryEpisodes: [],
          // append-only method episodes
          activeInquiryEpisodeId: null,
          capturedArtifacts: [],
          // approved cross-tool artifacts with provenance
          activeStage: null,
          // lane-specific stage key
          // Cross-lane substrate fields:
          questionTitle: "",
          // the inquiry framing in the student's words
          // Tier-2: dedicated wonderings substrate (Scientific lane Stage 1). Kept
          // separate from evidenceCards so the Wonder-sorter gate count is
          // structural, not parsed — per the gate-enforcement reviewer.
          wonderings: [],
          // [{ id, ts, text, durationS?, kindFromSorter? }]
          modelSnapshots: [],
          // [{ v, ts, text, confidence, knownUnknowns, loopBackOrigin?, deltaFromPrior? }]
          sources: [],
          // [{ id, ts, kind, citation, notes, sift }]
          evidenceCards: [],
          // [{ id, ts, kind: 'text'|'voice', text, audioBase64, durationS, tag, surprise? }]
          // Tier-2: first-class claims substrate (Scientific lane Stage 6) — the
          // export artifact's headline data lives at the top level, not nested.
          claims: [],
          // [{ id, ts, text, label, staleLabel?, aiLabelQuestion?, warrantText?, calibrationResponse? }]
          claimEvidenceLinks: [],
          // [{ id, claim, evidenceIds, warrant, qualifier, rebuttal }]
          positionality: { text: "", audioBase64: null, durationS: 0 },
          // Tier-3: tradeOffLedger and constraintMatrix slots reserved at Tier 1
          // are EXTENDED to carry units + sacrificed-criterion + whose-interest.
          // Shapes lazy-migrated by loadJournal so older sessions don't crash.
          tradeOffLedger: [],
          // [{ v, ts, criterion: gainedConstraintId, sacrificedCriterion: sacrificedConstraintId, accepted: declarationText, justification, whoseInterestThisServes, acceptedPriorityRank, justificationAudioBase64?, loopBackOrigin? }]
          constraintMatrix: [],
          // [{ id, ts, criterion, target, unit, measured, weight, source, tier, staleLabel? }]
          // Tier-3 Engineering Design lane top-level fields. Each is justified as
          // top-level because cross-stage rendering, structural distinctness
          // gates, AI validators, and export-time substring-link checks all need
          // direct access. Nesting any of these in stageNotes would break those
          // gates or render-paths. See docs/research_lane_engineering_design.md.
          stakeholderProfile: null,
          // { name, group?, accessNote: 'direct'|'proxy'|'imagined_with_research', epistemicStatus: 'invented'|'observed'|'interviewed'|'curriculum_prompt', whyThisStakeholderJustification, voiceNote?, ts, staleLabel? }
          criteria: [],
          // [{ id, name, unit, target, direction: 'maximize'|'minimize'|'meet', weight: 1-5, kind: 'stakeholder-derived'|'physical-safety'|'measurable-other', ts, staleLabel? }]
          candidateConcepts: [],
          // [{ id, ts, name, sketchText, sketchDataUrl?, audioBase64?, durationS?, materialsList, constraintsSatisfied, constraintsPunted, riskiestAssumption, killReason?, chosen?, supersededBy? }]
          decisionMatrix: [],
          // [{ candidateId, criterionId, score: 1-5, reasonText, ts }]
          criteriaWeightLog: [],
          // append-only: [{ ts, criterionId, fromWeight, toWeight, afterMatrixFilled }]
          testProtocol: [],
          // [{ id, criterionId, procedureText, instrument, unit, pass_threshold, conditions?, ts }]
          buildLog: [],
          // append-only: [{ v, ts, candidateId, buildText, materialsActually, photoDescription, durationS_voice?, audioBase64?, loopBackOrigin?, deltaFromPrior? }]
          testRun: [],
          // [{ id, v, ts, buildLogV, criterionId, measured, unit, passed, observationText, audioBase64?, durationS? }]
          stakeholderFeedback: [],
          // [{ id, ts, prototypeVersionRef, verbatimResponse?, proxyJustification?, audioBase64?, durationS?, observerNotes, surprises, criteriaJudgments: [{ criterionId, stakeholderJudgment }] }]
          failureLog: [],
          // [{ id, ts, fromTestRunId, modeText, causeHypothesisText, changedVariable: { name, fromValue, toValue }, predictedEffectText, retestRunId, predictionVsRealityRadio? }]
          designClaims: [],
          // [{ id, ts, text, kind: 'serves_stakeholder'|'satisfies_criterion'|'acknowledges_limit', label, staleLabel?, claimEvidenceRunIds, constraintRefs, tradeoffRefs, aiLabelQuestion?, calibrationResponse? }]
          // Tier-4 Humanities & Social Research lane top-level fields. Each is
          // justified as top-level because cross-stage gates, AI validators, the
          // ForeclosureCoda substring-link composition, and the WarrantTrajectoryRibbon
          // assessment artifact all need direct array access. See
          // docs/research_lane_humanities_design.md.
          framings: [],
          // [{ id, ts, label, framingPrompt, frameKindChip, whatItForegrounds, whatItOccludes, whichVettedSourcesFitIt, domain, staleLabel?, supersededBy? }]
          humanitiesPosition: null,
          // { text, ts, staleLabel, label, whatThisClaimDoesNotSpeakTo, positionalityLinkText } — SINGLETON (Humanities artifacts organize around one defensible stance)
          framingProbes: [],
          // append-only: [{ id, ts, framingId, linkId, verdict: 'warrant_survives'|'warrant_contracts'|'warrant_fails', studentRationale, quotedSnippetRef, loopBackOrigin?, allSurvivesJustification? }]
          positionalitySnapshots: [],
          // append-only versioned: [{ v, ts, materialRelationshipText, visibilityField, obscuringField, whoseStandpointIsStructurallyAbsentText, partialIncorporationCommitmentsText, epistemicStatus, audioBase64?, durationS?, deltaFromPriorText?, loopBackOrigin?, devLevelMode }]
          absentVoices: [],
          // [{ id, ts, whoseVoiceText, whyAbsentChip, whatTheyMightSeeText, partialIncorporationAttemptText?, sourceIdContext?, staleLabel? }]
          questionStakeholders: [],
          // [{ id, ts, whoseQuestionIsThis, whyTheyCareText, whatThisFramingForegrounds, whatThisFramingObscures, staleLabel? }] — distinct from singleton Engineering stakeholderProfile (humanities needs plural)
          humanitiesPlausibleAnswers: [],
          // [{ id, ts, text, isWorkingPosition, staleLabel? }]
          stakesAudience: null,
          // { chip: 'school_community'|'city'|'named_public'|'historical_record'|'policymakers', label, ts, staleLabel? } — closed enum (no free-text escape)
          genreChoice: null,
          // { genre: 'op_ed'|'policy_memo'|'civic_action_statement'|'exhibit_text', ts, lockUntilSubstrateLinkPass, staleLabel? }
          compositions: [],
          // append-only versioned: [{ id, v, ts, genreChoice, bodyText, bodyClaimTags, loadBearingClaimId, publicAccountabilityTarget, publicAccountabilityNote, foreclosureCodaText, foreclosureCodaHash, audioBase64?, durationS?, loopBackOrigin?, deltaFromPriorText?, no_ai_notes }]
          authorshipLog: [],
          // [{ ts, field, eventKind: 'paste'|'large_insert', acknowledged, whereFromNote? }] — anti-laundering structural friction
          stageNotes: {},
          // { stageKey: { text, audioBase64, durationS, ts, exemplarViewed?, exemplarDismissed?, supersededBy?, acknowledgedSuperseded?, ...stageSpecific } }
          // Tier-2: loopBacks now carry a whyChipId (1-tap canned reason) so
          // the field is reliably populated — per the loop-back-architecture
          // reviewer who flagged the empty-why failure mode.
          loopBacks: [],
          // [{ ts, fromStage, toStage, whyChipId, why?, returnedToOrigin? }]
          // Tier-2: aiHistory records BOTH successful calls AND blocked/rejected
          // ones with bypass_signals + rejectReason for teacher dashboards.
          aiHistory: [],
          // [{ ts, touchpoint, in?, summary?, blocked, gate_reason?, bypass_signals?, rejectReason?, attemptedShapeKeys?, traceId? }]
          aiCallCount: 0,
          // resets on session reload only
          // Tier-2: pendingLoopReturn lets the lane offer "return to where I was"
          // after the student edits an upstream stage during a loop-back.
          pendingLoopReturn: null,
          // null | { fromStage, ts }
          sessionStartedAt: Date.now()
        };
      }
      function loadJournal() {
        var raw = safeLocal(STORAGE_KEY);
        if (!raw) return emptyJournal();
        try {
          var parsed = JSON.parse(raw);
          if (!parsed || typeof parsed !== "object") return emptyJournal();
          var v = parsed.v;
          if (v !== 1 && v !== 2 && v !== 3 && v !== 4 && v !== 5 && v !== 6) {
            var future = emptyJournal();
            Object.keys(future).forEach(function(k) {
              if (k !== "v" && parsed[k] !== void 0) future[k] = parsed[k];
            });
            future.loadWarning = "This portfolio was created by a newer AlloFlow version (v" + String(v) + "). It is open read-only so the original is not overwritten.";
            future.originalSchemaVersion = v;
            return future;
          }
          if (v < 6 && !safeLocal(RECOVERY_STORAGE_KEY)) {
            safeLocal(RECOVERY_STORAGE_KEY, JSON.stringify({
              sourceVersion: v,
              backedUpAt: Date.now(),
              raw
            }));
          }
          var fresh = emptyJournal();
          Object.keys(fresh).forEach(function(k) {
            if (parsed[k] === void 0) parsed[k] = fresh[k];
          });
          if (v === 1 || v === 2) {
            if (Array.isArray(parsed.constraintMatrix)) {
              parsed.constraintMatrix = parsed.constraintMatrix.map(function(row) {
                if (!row || typeof row !== "object") return row;
                if (row.unit === void 0) row.unit = "";
                return row;
              });
            }
            if (Array.isArray(parsed.tradeOffLedger)) {
              parsed.tradeOffLedger = parsed.tradeOffLedger.map(function(row) {
                if (!row || typeof row !== "object") return row;
                if (row.sacrificedCriterion === void 0) row.sacrificedCriterion = null;
                if (row.whoseInterestThisServes === void 0) row.whoseInterestThisServes = "";
                if (row.acceptedPriorityRank === void 0) row.acceptedPriorityRank = null;
                return row;
              });
            }
          }
          if (v === 1 || v === 2 || v === 3) {
            if (parsed.positionality && parsed.positionality.text && Array.isArray(parsed.positionalitySnapshots) && parsed.positionalitySnapshots.length === 0) {
              parsed.positionalitySnapshots = [{
                v: 1,
                ts: parsed.positionality.ts || Date.now(),
                materialRelationshipText: parsed.positionality.text || "",
                visibilityField: "",
                obscuringField: "",
                whoseStandpointIsStructurallyAbsentText: "",
                partialIncorporationCommitmentsText: "",
                epistemicStatus: "",
                audioBase64: parsed.positionality.audioBase64 || null,
                durationS: parsed.positionality.durationS || 0,
                devLevelMode: "structured"
              }];
            }
          }
          if (v <= 5 && parsed.activeMethodPack && Array.isArray(parsed.inquiryEpisodes) && parsed.inquiryEpisodes.length === 0) {
            var migratedPack = methodPackById(parsed.activeMethodPack);
            if (migratedPack) {
              var migratedEpisodeId = researchId("episode_migrated_");
              var migratedAt = parsed.updatedAt || parsed.createdAt || Date.now();
              parsed.inquiryEpisodes = [{
                id: migratedEpisodeId,
                methodPackId: migratedPack.id,
                laneId: migratedPack.laneId,
                startedAt: migratedAt,
                questionAtStart: String(parsed.questionTitle || "").slice(0, 240),
                migratedFromSchema: v
              }];
              parsed.activeInquiryEpisodeId = migratedEpisodeId;
              var linkedHistory = false;
              parsed.methodPackHistory = (parsed.methodPackHistory || []).map(function(entry) {
                if (!linkedHistory && entry && entry.id === migratedPack.id && !entry.episodeId) {
                  linkedHistory = true;
                  return Object.assign({}, entry, { episodeId: migratedEpisodeId });
                }
                return entry;
              });
              if (!linkedHistory) parsed.methodPackHistory.push({ id: migratedPack.id, laneId: migratedPack.laneId, episodeId: migratedEpisodeId, selectedAt: migratedAt });
            }
          }
          if (Array.isArray(parsed.capturedArtifacts)) {
            parsed.capturedArtifacts = parsed.capturedArtifacts.map(function(artifact) {
              if (!artifact) return artifact;
              if (artifact.integrationContract && (!artifact.integrationContract.reviewedAt || !artifact.integrationContract.reviewAfter)) {
                return Object.assign({}, artifact, {
                  integrationContractStatus: "legacy_contract",
                  legacyProvenance: artifact.legacyProvenance || { status: "legacy_contract", reason: "Contract snapshot predates freshness metadata; recorded fields are preserved but review dates remain unknown." }
                });
              }
              if (artifact.integrationContract || artifact.integrationContractStatus === "legacy") return artifact;
              return Object.assign({}, artifact, {
                integrationContractStatus: "legacy",
                legacyProvenance: artifact.legacyProvenance || { status: "legacy", reason: "Captured before AlloFlow Tool Integration Contract v1; original tool metadata remains unknown." }
              });
            });
          }
          parsed.v = 6;
          parsed.aiCallCount = 0;
          parsed.sessionStartedAt = Date.now();
          return parsed;
        } catch (_) {
          return emptyJournal();
        }
      }
      function saveJournal(journal) {
        if (!journal || journal.loadWarning) return false;
        try {
          var snapshot = Object.assign({}, journal);
          delete snapshot.originalSchemaVersion;
          snapshot.updatedAt = Date.now();
          return safeLocal(STORAGE_KEY, JSON.stringify(snapshot)) === true;
        } catch (_) {
          return false;
        }
      }
      var SHARED_STOP_WORDS = /* @__PURE__ */ new Set([
        "the",
        "a",
        "an",
        "is",
        "of",
        "to",
        "in",
        "it",
        "that",
        "this",
        "and",
        "or",
        "but",
        "i",
        "my",
        "we",
        "our",
        "because",
        "so",
        "for",
        "on",
        "with",
        "at",
        "as",
        "then",
        "than",
        "my",
        "your",
        "its"
      ]);
      var PLACEHOLDER_BLACKLIST = ["test", "asdf", "idk", "untitled", "lorem ipsum", "placeholder", "science thing", "dunno", "whatever", "idc"];
      var KEYBOARD_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm", "1234567890"];
      function isPlausibleProse(text, minChars, opts) {
        opts = opts || {};
        var t = (text || "").trim();
        if (t.length < minChars) return { ok: false, reason: "too_short" };
        var distinctLetters = new Set(t.toLowerCase().match(/[a-z]/g) || []).size;
        if (distinctLetters < 4) return { ok: false, reason: "low_letter_diversity" };
        if (/(.)\1{5,}/.test(t)) return { ok: false, reason: "char_run_repeat" };
        var tokens = t.split(/\s+/).filter(function(w) {
          return /[a-z]/i.test(w);
        });
        if (tokens.length < (opts.minTokens || 2)) return { ok: false, reason: "too_few_words" };
        for (var r = 0; r < KEYBOARD_ROWS.length; r++) {
          var row = KEYBOARD_ROWS[r];
          for (var i = 0; i < row.length - 4; i++) {
            if (t.toLowerCase().indexOf(row.slice(i, i + 5)) !== -1) return { ok: false, reason: "keyboard_mash" };
          }
        }
        var lower = t.toLowerCase();
        for (var b = 0; b < PLACEHOLDER_BLACKLIST.length; b++) {
          var bl = PLACEHOLDER_BLACKLIST[b];
          if (lower === bl || lower.indexOf(bl + " ") === 0) return { ok: false, reason: "placeholder_phrase" };
        }
        return { ok: true };
      }
      function normalizeForCompare(s) {
        if (!s || typeof s !== "string") return "";
        var out = s;
        try {
          out = out.normalize("NFKC");
        } catch (_) {
        }
        out = out.toLowerCase();
        out = out.replace(/[‘’]/g, "'");
        out = out.replace(/[“”]/g, '"');
        out = out.replace(/[–—]/g, "-");
        out = out.replace(/\s+/g, " ");
        return out.trim();
      }
      function tokenJaccard(a, b) {
        function toks(s) {
          var set = /* @__PURE__ */ new Set();
          normalizeForCompare(s).split(/\W+/).forEach(function(w) {
            if (w.length > 2 && !SHARED_STOP_WORDS.has(w)) set.add(w);
          });
          return set;
        }
        var A = toks(a), B = toks(b);
        if (A.size === 0 || B.size === 0) return 0;
        var inter = 0;
        A.forEach(function(x) {
          if (B.has(x)) inter++;
        });
        return inter / (A.size + B.size - inter);
      }
      var MECHANISM_VERBS = [
        "cause",
        "causes",
        "make",
        "makes",
        "carry",
        "carries",
        "transfer",
        "transfers",
        "block",
        "blocks",
        "depend",
        "depends",
        "vary",
        "varies",
        "increase",
        "increases",
        "decrease",
        "decreases",
        "conduct",
        "conducts",
        "radiate",
        "radiates",
        "absorb",
        "absorbs",
        "reflect",
        "reflects",
        "affect",
        "affects",
        "influence",
        "influences",
        "trigger",
        "triggers",
        "prevent",
        "prevents",
        "enable",
        "enables",
        "flow",
        "flows",
        "move",
        "moves",
        "push",
        "pushes",
        "pull",
        "pulls",
        "heat",
        "heats",
        "cool",
        "cools",
        "grow",
        "grows",
        "shrink",
        "shrinks",
        "stop",
        "stops",
        "slow",
        "slows",
        "speed",
        "speeds"
      ];
      var PERSPECTIVE_MARKERS_RE = /\b(could|might|someone|alternatively|on the other hand|instead|rather|another way|disagree|opposing|critic|maybe|perhaps|some would say)\b/i;
      if (!window.ResearchHub) {
        window.ResearchHub = {
          _lanes: {},
          _order: [],
          _educatorView: null,
          registerLane: function(id, config) {
            if (!id || !config) return;
            config.id = id;
            if (!config.label) config.label = id;
            if (!config.stages) config.stages = [];
            if (!config.touchpoints) config.touchpoints = [];
            this._lanes[id] = config;
            if (this._order.indexOf(id) === -1) this._order.push(id);
            console.log("[ResearchHub] Registered lane: " + id);
          },
          getLane: function(id) {
            return this._lanes[id] || null;
          },
          getLanes: function() {
            var self = this;
            return this._order.map(function(id) {
              return self._lanes[id];
            }).filter(Boolean);
          },
          // V2: educator-view registry — a plugin (research_hub_educator_module.js)
          // registers a dashboard renderer here; the Hub renders it when the
          // header toggle is on. Single registration; last-write-wins so the
          // plugin can hot-reload during dev. The Hub falls back to a tiny
          // placeholder when no educator view is registered.
          registerEducatorView: function(config) {
            if (!config || typeof config.render !== "function") return;
            this._educatorView = config;
            console.log("[ResearchHub] Registered educator view");
          },
          getEducatorView: function() {
            return this._educatorView;
          },
          __tier: 1
        };
      }
      window.ResearchHub.captureArtifact = queueResearchCapture;
      window.ResearchHub.getCaptureInboxCount = function() {
        return readCaptureInbox().length;
      };
      window.ResearchHub.registerToolIntegration = registerToolIntegration;
      window.ResearchHub.registerCaptureSanitizer = registerCaptureSanitizer;
      window.ResearchHub.getToolIntegrations = function() {
        return safeJsonClone(registeredToolIntegrations) || {};
      };
      window.ResearchHub.getIntegrationHealth = function(artifacts) {
        return summarizeIntegrationHealth(artifacts);
      };
      window.ResearchHub.getStorageHealth = function(journal) {
        return researchStorageHealth(journal);
      };
      var PLACEHOLDER_LANES = [
        {
          id: "scientific",
          label: "Scientific Inquiry",
          tagline: "Phenomenon Workbench",
          icon: "\u{1F52C}",
          gradFrom: "from-cyan-50",
          gradTo: "to-blue-50",
          border: "border-cyan-600",
          titleColor: "text-cyan-800",
          descColor: "text-cyan-700",
          blurb: "Notice a phenomenon, draft a model, pick from observational, experimental, modeling, or comparative methods, then loop back as evidence accumulates.",
          stages: [],
          touchpoints: [],
          _placeholder: true
        },
        {
          id: "engineering",
          label: "Engineering Design",
          tagline: "Design Studio",
          icon: "\u{1F6E0}\uFE0F",
          gradFrom: "from-amber-50",
          gradTo: "to-orange-50",
          border: "border-amber-600",
          titleColor: "text-amber-800",
          descColor: "text-amber-700",
          blurb: "Define a problem with criteria and constraints, model and prototype, log trade-offs in a designer\u2019s notebook, and communicate to real stakeholders.",
          stages: [],
          touchpoints: [],
          _placeholder: true
        },
        {
          id: "humanities",
          label: "Humanities & Social Research",
          tagline: "Inquiry Studio",
          icon: "\u{1F4DA}",
          gradFrom: "from-rose-50",
          gradTo: "to-pink-50",
          border: "border-rose-600",
          titleColor: "text-rose-800",
          descColor: "text-rose-700",
          blurb: "Author a contestable question, name your standpoint, evaluate sources laterally (SIFT), and build a claim-evidence-warrant chain ending in a public argument or informed action.",
          stages: [],
          touchpoints: [],
          _placeholder: true
        }
      ];
      var METHOD_PACKS = [
        {
          id: "scientific_investigation",
          laneId: "scientific",
          label: "Scientific Investigation",
          family: "Empirical inquiry",
          icon: "\u{1F52C}",
          color: "#0e7490",
          border: "#67e8f9",
          background: "linear-gradient(145deg,#ecfeff,#ffffff)",
          blurb: "Observe a phenomenon, compare explanations, choose a method, and revise a model as measurable evidence accumulates.",
          rigor: "Rigor means traceable observations, explicit variables and uncertainty, alternative explanations, and reproducible reasoning.",
          bestFor: "Explaining patterns and phenomena"
        },
        {
          id: "engineering_design",
          laneId: "engineering",
          label: "Engineering Design",
          family: "Design inquiry",
          icon: "\u{1F6E0}\uFE0F",
          color: "#b45309",
          border: "#fcd34d",
          background: "linear-gradient(145deg,#fffbeb,#ffffff)",
          blurb: "Define a need with stakeholders, criteria, and constraints; prototype; test; and document trade-offs and iteration.",
          rigor: "Rigor means measurable criteria, testable prototypes, transparent trade-offs, failure analysis, and stakeholder accountability.",
          bestFor: "Solving constrained problems"
        },
        {
          id: "humanistic_interpretation",
          laneId: "humanities",
          label: "Humanistic Interpretation",
          family: "Interpretive inquiry",
          icon: "\u{1F4DA}",
          color: "#be123c",
          border: "#fda4af",
          background: "linear-gradient(145deg,#fff1f2,#ffffff)",
          blurb: "Interpret texts, images, events, or cultural artifacts through competing framings while attending to context and positionality.",
          rigor: "Rigor means close reading, contextualized sources, competing interpretations, warranted claims, and limits stated plainly.",
          bestFor: "Interpreting meaning, culture, and history"
        },
        {
          id: "community_qualitative",
          laneId: "humanities",
          label: "Community & Qualitative Inquiry",
          family: "Situated inquiry",
          icon: "\u{1F5E3}\uFE0F",
          color: "#9d174d",
          border: "#f9a8d4",
          background: "linear-gradient(145deg,#fdf2f8,#ffffff)",
          blurb: "Study lived experience and community perspectives through ethical, contextualized accounts without treating one voice as universal.",
          rigor: "Rigor means ethical sourcing, transparent selection, discrepant cases, reflexivity, and clear limits on what accounts can establish.",
          bestFor: "Understanding experiences and perspectives"
        },
        {
          id: "civic_policy",
          laneId: "humanities",
          label: "Civic & Policy Inquiry",
          family: "Public inquiry",
          icon: "\u{1F3DB}\uFE0F",
          color: "#6d28d9",
          border: "#c4b5fd",
          background: "linear-gradient(145deg,#f5f3ff,#ffffff)",
          blurb: "Examine a public problem, competing interests, institutional choices, evidence, consequences, and feasible alternatives.",
          rigor: "Rigor means stakeholder and power analysis, credible evidence, counterarguments, trade-offs, and accountable recommendations.",
          bestFor: "Reasoning about public choices and consequences"
        },
        {
          id: "creative_cultural",
          laneId: "humanities",
          label: "Creative & Cultural Inquiry",
          family: "Artifact inquiry",
          icon: "\u{1F3A8}",
          color: "#c2410c",
          border: "#fdba74",
          background: "linear-gradient(145deg,#fff7ed,#ffffff)",
          blurb: "Investigate how form, medium, audience, context, and cultural position shape what an artifact makes visible or possible.",
          rigor: "Rigor means attention to form and context, evidence from the artifact, multiple plausible readings, and no mind-reading of creators.",
          bestFor: "Analyzing art, media, and cultural artifacts"
        }
      ];
      function methodPackById(id) {
        return METHOD_PACKS.filter(function(pack) {
          return pack.id === id;
        })[0] || null;
      }
      function defaultMethodPackForLane(laneId) {
        return METHOD_PACKS.filter(function(pack) {
          return pack.laneId === laneId;
        })[0] || null;
      }
      var METHOD_MATCH_RULES = [
        { id: "civic_policy", reason: "Your question centers public choices, institutions, power, stakeholders, or policy consequences.", terms: [[/\b(policy|policies|law|regulation|government|council|policymaker|public decision)\b/i, 4], [/\b(who benefits|who bears|power|justice|rights|public|institution)\b/i, 3]] },
        { id: "community_qualitative", reason: "Your question centers lived experience, community accounts, voices, or differently situated perspectives.", terms: [[/\b(interview|lived experience|community account|testimony|participant|voices?)\b/i, 4], [/\b(community|experience|perspective|people describe|accounts?)\b/i, 2]] },
        { id: "creative_cultural", reason: "Your question centers form, medium, audience, art, media, or a cultural artifact.", terms: [[/\b(art|artwork|film|music|poem|image|media|artifact|medium|creative work)\b/i, 4], [/\b(form|audience|aesthetic|visual|performance)\b/i, 2]] },
        { id: "humanistic_interpretation", reason: "Your question centers meaning, history, culture, memory, texts, or competing interpretations.", terms: [[/\b(interpret|meaning|history|historical|archive|memory|narrative|text)\b/i, 3], [/\b(culture|cultural|whose perspective|foreground|obscure)\b/i, 2]] },
        { id: "engineering_design", reason: "Your question centers designing, building, testing, or improving a solution under constraints.", terms: [[/\b(design|build|prototype|constraint|criteria|solution)\b/i, 4], [/\b(improve|solve|how might)\b/i, 1]] },
        { id: "scientific_investigation", reason: "Your question centers measurable patterns, variables, experiments, causes, or explanations of a phenomenon.", terms: [[/\b(experiment|variable|measure|data|phenomenon|observation)\b/i, 4], [/\b(pattern|cause|effect|predict|compare|why)\b/i, 2]] }
      ];
      function matchMethodPackForQuestion(question) {
        var text = String(question || "").trim();
        if (!text) return null;
        var ranked = METHOD_MATCH_RULES.map(function(rule, order) {
          var score = rule.terms.reduce(function(sum, pair) {
            return sum + (pair[0].test(text) ? pair[1] : 0);
          }, 0);
          return { rule, score, order };
        }).filter(function(row) {
          return row.score > 0;
        });
        ranked.sort(function(a, b) {
          return b.score - a.score || a.order - b.order;
        });
        if (!ranked.length || ranked[0].score < 2) return null;
        var pack = methodPackById(ranked[0].rule.id);
        if (!pack) return null;
        return {
          packId: pack.id,
          laneId: pack.laneId,
          icon: pack.icon,
          label: pack.label,
          reason: ranked[0].rule.reason,
          score: ranked[0].score
        };
      }
      function applyMethodPackSelection(prev, packId, nowValue, makeId) {
        var pack = methodPackById(packId);
        if (!pack) return prev;
        var now = nowValue || Date.now();
        var idFactory = makeId || function() {
          return researchId("episode_");
        };
        var next = Object.assign({}, prev);
        var history = Array.isArray(prev.methodPackHistory) ? prev.methodPackHistory.slice() : [];
        var episodes = Array.isArray(prev.inquiryEpisodes) ? prev.inquiryEpisodes.slice() : [];
        var sameEpisode = prev.activeMethodPack === pack.id && prev.activeInquiryEpisodeId;
        var episodeId = sameEpisode ? prev.activeInquiryEpisodeId : idFactory();
        if (!sameEpisode) {
          episodes.push({ id: episodeId, methodPackId: pack.id, laneId: pack.laneId, startedAt: now, questionAtStart: String(prev.questionTitle || "").slice(0, 240) });
          history.push({ id: pack.id, laneId: pack.laneId, episodeId, selectedAt: now });
        }
        next.activeMethodPack = pack.id;
        next.activeInquiryEpisodeId = episodeId;
        next.inquiryEpisodes = episodes;
        next.methodPackHistory = history;
        next.activeLane = pack.laneId;
        next.activeStage = null;
        next.updatedAt = now;
        return next;
      }
      function resolveLanes() {
        var registered = window.ResearchHub && window.ResearchHub.getLanes ? window.ResearchHub.getLanes() : [];
        var byId = {};
        registered.forEach(function(L) {
          byId[L.id] = L;
        });
        return PLACEHOLDER_LANES.map(function(P) {
          return byId[P.id] || P;
        }).concat(registered.filter(function(L) {
          return PLACEHOLDER_LANES.every(function(P) {
            return P.id !== L.id;
          });
        }));
      }
      function safeJsonParse(s) {
        if (!s || typeof s !== "string") return null;
        var trimmed = s.trim();
        var fenced = /^```(?:json)?\s*([\s\S]*?)\s*```\s*$/.exec(trimmed);
        if (fenced) trimmed = fenced[1].trim();
        try {
          return JSON.parse(trimmed);
        } catch (_) {
        }
        var braceStart = trimmed.indexOf("{");
        var braceEnd = trimmed.lastIndexOf("}");
        if (braceStart >= 0 && braceEnd > braceStart) {
          try {
            return JSON.parse(trimmed.slice(braceStart, braceEnd + 1));
          } catch (_) {
          }
        }
        return null;
      }
      var FOOTGUN_KEY_PATTERNS = [
        /^suggested[_-]/i,
        /^one[_-]revision/i,
        /^rewrite(_|$)/i,
        /^improved[_-]/i,
        /^better[_-]/i,
        /^proposed[_-]/i,
        /^corrected[_-]/i,
        /^relabel/i,
        /^the[_-]alternative$/i,
        /^the[_-]correct/i,
        /^should[_-](be|instead|use)/i,
        /^revised[_-]claim/i,
        /^assumption$/i,
        // free-text completion smell — use *_questions
        /^warrant$/i,
        /^calibration$/i,
        /^observation$/i,
        /^rationale$/i,
        /^summary$/i,
        // completion-shaped (replaced by quoted_snippet + questions)
        /^interpretation$/i,
        /^reading$/i,
        /^why[_-]relevant$/i,
        /^what[_-]changed[_-]well$/i,
        /^confidence[_-]calibration[_-]note$/i,
        /^coverage[_-]note$/i,
        /^label[_-]question$/i,
        // singular variant — must be plural questions[]
        // Tier-3 Engineering Design lane FOOTGUN extensions — at SUBSTRATE level
        // so future lanes (Humanities, Math) inherit. These are noun-phrase
        // completions specific to engineering output (the AI proposing or
        // approving a design / candidate / fix) that the lane prompts explicitly
        // forbid; the substrate strip is the last line of defense if a model
        // ignores the prompt.
        /^proposed[_-]/i,
        // proposed_design / proposed_fix
        /^recommended[_-]/i,
        // recommended_constraint / recommended_candidate
        /^try[_-]this/i,
        // imperative-verb output
        /^better[_-]candidate/i,
        /^optimal[_-]/i,
        /^pick[_-]/i,
        // pick_winner / pick_a_candidate
        /^well[_-]fitted/i,
        // approval verdict
        /^design[_-]is[_-]sound/i,
        // approval verdict
        /^ready[_-]to[_-]ship/i,
        // approval verdict
        /^meets[_-]all[_-]criteria[_-]judgment$/i,
        // approval verdict
        /^correct[_-]priority/i,
        // tradeoff_inverter (V2) guard
        /^better[_-]tradeoff/i,
        /^should[_-]sacrifice/i,
        /^suggested[_-]fix/i,
        /^corrected[_-]cause/i,
        /^improvement$/i,
        // completion noun
        /^dominated[_-]judgment$/i,
        // Tier-4 Humanities & Social Research lane FOOTGUN extensions at SUBSTRATE
        // level so this is the LAST line of defense against AI outputs that would
        // name scholars, summarize sources, judge tiers, polish prose, or assert
        // false balance. Honor the Tier-1 prohibition: "Counter-Evidence Hunters
        // that name specific scholars or sources" must never be permitted.
        /^suggested[_-]framing/i,
        /^better[_-]framing/i,
        /^scholar[_-]/i,
        // any scholar-shaped key
        /^according[_-]to/i,
        // attribution-shaped key
        /^as[_-](argued|noted|claimed)[_-]by/i,
        /^school[_-]of[_-]thought/i,
        /^theorist/i,
        /^attributed[_-]to/i,
        /^source[_-]summary$/i,
        // refusing source-summary keeps SIFT load-bearing
        /^source[_-]credibility[_-]judgment/i,
        /^suggested[_-]warrant/i,
        /^proposed[_-]warrant/i,
        /^better[_-]thesis/i,
        /^suggested[_-]thesis/i,
        /^thesis$/i,
        // completion noun
        /^suggested[_-]positionality/i,
        /^inferred[_-]identity/i,
        /^balanced[_-]view$/i,
        // false-balance verdict
        /^both[_-]sides/i,
        // false-balance verdict
        /^the[_-]other[_-]side$/i,
        /^accurate[_-]reading$/i,
        // approval verdict
        /^correct[_-]interpretation/i,
        /^correct[_-]positionality/i,
        /^suggested[_-]tier/i,
        // refuse AI assigning SIFT tiers
        /^source[_-]should[_-]be[_-]tier/i,
        /^drafted[_-]/i,
        // composition drafting
        /^polished[_-]/i,
        /^the[_-]stronger[_-]reading/i,
        /^objective[_-]view/i,
        /^balanced[_-]take/i,
        /^well[_-]warranted/i,
        // approval verdict
        /^standing[_-]earned[_-]judgment$/i,
        /^expert[_-]opinion/i,
        /^quote$/i,
        // completion noun (AI quoting from invented scholars)
        /^citation[_-]suggestion/i,
        /^proposed[_-]qualifier/i,
        /^proposed[_-]rebuttal/i
      ];
      function stripPedagogicalFootguns(obj, depth) {
        if (depth === void 0) depth = 0;
        if (depth > 6 || obj === null || typeof obj !== "object") return obj;
        if (Array.isArray(obj)) return obj.map(function(x) {
          return stripPedagogicalFootguns(x, depth + 1);
        });
        var out = {};
        Object.keys(obj).forEach(function(k) {
          for (var i = 0; i < FOOTGUN_KEY_PATTERNS.length; i++) {
            if (FOOTGUN_KEY_PATTERNS[i].test(k)) return;
          }
          out[k] = stripPedagogicalFootguns(obj[k], depth + 1);
        });
        return out;
      }
      var CAUSAL_CONCLUSION_RE = /\b(because|therefore|since|thus|hence)\b/i;
      function wordCount(s) {
        if (!s || typeof s !== "string") return 0;
        return s.trim().split(/\s+/).filter(Boolean).length;
      }
      function enforceQuestionFormat(obj, depth, telemetry) {
        if (!telemetry) telemetry = { rejected: 0, fixedKeys: [] };
        if (depth === void 0) depth = 0;
        if (depth > 6 || obj === null || typeof obj !== "object") return obj;
        if (Array.isArray(obj)) {
          return obj.map(function(x) {
            return enforceQuestionFormat(x, depth + 1, telemetry);
          });
        }
        var out = {};
        Object.keys(obj).forEach(function(k) {
          var v = obj[k];
          if (/question/i.test(k) && Array.isArray(v)) {
            var cleaned = v.filter(function(item) {
              if (typeof item !== "string") return true;
              var trimmed = item.trim();
              if (!trimmed.endsWith("?")) {
                telemetry.rejected += 1;
                telemetry.fixedKeys.push(k);
                return false;
              }
              if (wordCount(trimmed) > 25) {
                telemetry.rejected += 1;
                telemetry.fixedKeys.push(k);
                return false;
              }
              if (CAUSAL_CONCLUSION_RE.test(trimmed)) {
                telemetry.rejected += 1;
                telemetry.fixedKeys.push(k);
                return false;
              }
              return true;
            });
            out[k] = cleaned;
          } else {
            out[k] = enforceQuestionFormat(v, depth + 1, telemetry);
          }
        });
        return out;
      }
      function newTraceId() {
        try {
          if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
        } catch (_) {
        }
        return "rh-" + Math.floor((window.performance && performance.now ? performance.now() : Date.now()) * 1e3).toString(36);
      }
      function SuggestionBadge(props) {
        var label = props.label || "AI suggestion \u2014 not a verdict";
        return /* @__PURE__ */ React.createElement(
          "div",
          {
            role: "note",
            "aria-label": label,
            style: {
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              borderRadius: "999px",
              fontSize: "10px",
              fontWeight: 800,
              background: "#fef3c7",
              color: "#92400e",
              border: "1px solid #fbbf24",
              textTransform: "uppercase",
              letterSpacing: "0.4px"
            }
          },
          /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F4A1}"),
          /* @__PURE__ */ React.createElement("span", null, label)
        );
      }
      function ExemplarPair(props) {
        var t = props.t || function(k) {
          return k;
        };
        var criterion = props.criterion || "";
        var strongExample = props.strongExample || "";
        var weakExample = props.weakExample || "";
        var onJudgment = props.onJudgment;
        var initialChoice = props.initialChoice || null;
        var initialReasoning = props.initialReasoning || "";
        var _c = useState(initialChoice);
        var choice = _c[0];
        var setChoice = _c[1];
        var _r = useState(initialReasoning);
        var reasoning = _r[0];
        var setReasoning = _r[1];
        var canSubmit = !!choice && reasoning.trim().length >= 8;
        var pickStyle = function(which) {
          var selected = choice === which;
          return {
            flex: 1,
            padding: "12px 14px",
            borderRadius: "12px",
            border: selected ? "2px solid #7c3aed" : "1px solid #e2e8f0",
            background: selected ? "#f5f3ff" : "#ffffff",
            cursor: "pointer",
            textAlign: "left",
            fontFamily: "inherit",
            fontSize: "12px",
            color: "#1e293b",
            lineHeight: 1.55
          };
        };
        return /* @__PURE__ */ React.createElement("div", { style: {
          padding: "14px",
          borderRadius: "14px",
          border: "1px solid #cbd5e1",
          background: "#f8fafc",
          display: "flex",
          flexDirection: "column",
          gap: "10px"
        } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("h3", { style: { margin: 0, fontSize: "13px", fontWeight: 800, color: "#1e293b" } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u2696\uFE0F "), t("research_hub.exemplar_pair_prompt") || "Which of these is stronger work, and why?"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: "11px", color: "#64748b", fontStyle: "italic" } }, criterion)), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "10px", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: function() {
          setChoice("A");
        }, "aria-pressed": choice === "A", style: pickStyle("A") }, /* @__PURE__ */ React.createElement("strong", { style: { display: "block", marginBottom: "4px", fontSize: "11px", color: "#7c3aed" } }, "Example A"), strongExample), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: function() {
          setChoice("B");
        }, "aria-pressed": choice === "B", style: pickStyle("B") }, /* @__PURE__ */ React.createElement("strong", { style: { display: "block", marginBottom: "4px", fontSize: "11px", color: "#7c3aed" } }, "Example B"), weakExample)), /* @__PURE__ */ React.createElement(
          "textarea",
          {
            value: reasoning,
            onChange: function(e) {
              setReasoning(e.target.value);
            },
            rows: 2,
            maxLength: 400,
            placeholder: t("research_hub.exemplar_pair_reasoning_placeholder") || "In 1\u20132 sentences: which is stronger, and what makes it stronger?",
            style: {
              width: "100%",
              boxSizing: "border-box",
              padding: "8px 10px",
              borderRadius: "10px",
              border: "1px solid #cbd5e1",
              fontFamily: "inherit",
              fontSize: "12px",
              resize: "vertical",
              minHeight: "50px"
            }
          }
        ), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "flex-end" } }, /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            disabled: !canSubmit,
            onClick: function() {
              if (!canSubmit) return;
              if (typeof onJudgment === "function") {
                try {
                  onJudgment({ choice, reasoning: reasoning.trim() });
                } catch (_) {
                }
              }
            },
            style: {
              padding: "8px 14px",
              borderRadius: "999px",
              background: canSubmit ? "#7c3aed" : "#cbd5e1",
              color: "#fff",
              border: "none",
              fontWeight: 800,
              fontSize: "12px",
              cursor: canSubmit ? "pointer" : "not-allowed"
            }
          },
          t("research_hub.exemplar_pair_record") || "Record my judgment"
        )));
      }
      function VoiceNoteBlock(props) {
        var t = props.t || function(k) {
          return k;
        };
        var initialBase64 = props.initialBase64 || null;
        var initialDuration = props.initialDuration || 0;
        var onChange = props.onChange;
        var label = props.label || (t("research_hub.voice_note") || "Voice note");
        var _rec = useState(false);
        var isRecording = _rec[0];
        var setIsRecording = _rec[1];
        var _b64 = useState(initialBase64);
        var audioBase64 = _b64[0];
        var setAudioBase64 = _b64[1];
        var _dur = useState(initialDuration);
        var durationS = _dur[0];
        var setDurationS = _dur[1];
        var _elapsed = useState(0);
        var elapsed = _elapsed[0];
        var setElapsed = _elapsed[1];
        var _paused = useState(false);
        var isPaused = _paused[0];
        var setIsPaused = _paused[1];
        var _err = useState(null);
        var err = _err[0];
        var setErr = _err[1];
        var recorderRef = useRef(null);
        var chunksRef = useRef([]);
        var streamRef = useRef(null);
        var startRef = useRef(0);
        var pauseStartedRef = useRef(0);
        var pausedTotalRef = useRef(0);
        var tickRef = useRef(null);
        var stoppedRef = useRef(false);
        var hardStop = function() {
          if (tickRef.current) {
            clearInterval(tickRef.current);
            tickRef.current = null;
          }
          if (recorderRef.current && (recorderRef.current.state === "recording" || recorderRef.current.state === "paused")) {
            try {
              recorderRef.current.stop();
            } catch (_) {
            }
          }
          if (streamRef.current) {
            try {
              streamRef.current.getTracks().forEach(function(tr) {
                try {
                  tr.stop();
                } catch (_) {
                }
              });
            } catch (_) {
            }
            streamRef.current = null;
          }
        };
        useEffect(function() {
          return function() {
            hardStop();
          };
        }, []);
        var getActiveElapsedSeconds = function(now) {
          var currentPause = pauseStartedRef.current ? now - pauseStartedRef.current : 0;
          return Math.max(0, Math.round((now - startRef.current - pausedTotalRef.current - currentPause) / 1e3));
        };
        var startRec = async function() {
          setErr(null);
          try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === "undefined") {
              setErr(t("research_hub.voice_note_unsupported") || "Voice notes are not supported in this browser.");
              return;
            }
            var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            var mr = new MediaRecorder(stream);
            recorderRef.current = mr;
            chunksRef.current = [];
            stoppedRef.current = false;
            mr.ondataavailable = function(e) {
              if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
            };
            mr.onstop = function() {
              if (stoppedRef.current) return;
              stoppedRef.current = true;
              try {
                var blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
                var reader = new FileReader();
                reader.onloadend = function() {
                  var b64 = String(reader.result || "");
                  setAudioBase64(b64);
                  var finalDur = Math.min(VOICE_NOTE_MAX_SECONDS, getActiveElapsedSeconds(Date.now()));
                  setDurationS(finalDur);
                  if (typeof onChange === "function") {
                    try {
                      onChange({ audioBase64: b64, durationS: finalDur });
                    } catch (_) {
                    }
                  }
                };
                reader.readAsDataURL(blob);
              } catch (_) {
              }
              if (streamRef.current) {
                try {
                  streamRef.current.getTracks().forEach(function(tr) {
                    try {
                      tr.stop();
                    } catch (_) {
                    }
                  });
                } catch (_) {
                }
                streamRef.current = null;
              }
              if (tickRef.current) {
                clearInterval(tickRef.current);
                tickRef.current = null;
              }
            };
            startRef.current = Date.now();
            pauseStartedRef.current = 0;
            pausedTotalRef.current = 0;
            setElapsed(0);
            setIsPaused(false);
            mr.start();
            setIsRecording(true);
            tickRef.current = setInterval(function() {
              var sec = getActiveElapsedSeconds(Date.now());
              setElapsed(sec);
              if (sec >= VOICE_NOTE_MAX_SECONDS) {
                if (mr.state === "recording" || mr.state === "paused") {
                  try {
                    mr.stop();
                  } catch (_) {
                  }
                }
                setIsRecording(false);
                setIsPaused(false);
              }
            }, 250);
          } catch (e) {
            setErr(t("research_hub.voice_note_mic_denied") || "Microphone permission was denied.");
            setIsRecording(false);
          }
        };
        var stopRec = function() {
          setIsRecording(false);
          setIsPaused(false);
          if (recorderRef.current && (recorderRef.current.state === "recording" || recorderRef.current.state === "paused")) {
            try {
              recorderRef.current.stop();
            } catch (_) {
            }
          }
        };
        var togglePause = function() {
          var mr = recorderRef.current;
          if (!mr || !isRecording) return;
          try {
            if (mr.state === "recording") {
              mr.pause();
              pauseStartedRef.current = Date.now();
              setIsPaused(true);
            } else if (mr.state === "paused") {
              pausedTotalRef.current += Math.max(0, Date.now() - pauseStartedRef.current);
              pauseStartedRef.current = 0;
              mr.resume();
              setIsPaused(false);
            }
          } catch (_) {
            setErr(t("research_hub.voice_note_pause_unsupported") || "Pause is not supported in this browser. Stop and start a new note instead.");
          }
        };
        var clearRec = function() {
          setAudioBase64(null);
          setDurationS(0);
          setElapsed(0);
          if (typeof onChange === "function") {
            try {
              onChange({ audioBase64: null, durationS: 0 });
            } catch (_) {
            }
          }
        };
        return /* @__PURE__ */ React.createElement(
          "div",
          {
            role: "group",
            "aria-label": label,
            style: {
              padding: "10px 12px",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              background: "#fafafa",
              display: "flex",
              flexDirection: "column",
              gap: "8px"
            }
          },
          /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: "12px", fontWeight: 700, color: "#1e293b" } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F3A4} "), label), /* @__PURE__ */ React.createElement("span", { role: "timer", style: { fontSize: "10px", color: "#64748b" } }, isRecording ? (isPaused ? t("research_hub.voice_note_paused") || "Paused" : t("research_hub.voice_note_recording") || "Recording") + " " + elapsed + "s / " + VOICE_NOTE_MAX_SECONDS + "s" : durationS > 0 ? durationS + "s saved" : t("research_hub.voice_note_idle") || "Up to 60s \u2014 local only")),
          /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "8px", flexWrap: "wrap" } }, !isRecording && /* @__PURE__ */ React.createElement(
            "button",
            {
              type: "button",
              onClick: startRec,
              "aria-label": t("research_hub.voice_note_start_aria") || "Start recording a voice note",
              style: {
                padding: "6px 12px",
                borderRadius: "999px",
                background: "#dc2626",
                color: "#fff",
                border: "none",
                fontWeight: 800,
                fontSize: "11px",
                cursor: "pointer"
              }
            },
            audioBase64 ? t("research_hub.voice_note_rerecord") || "Re-record" : t("research_hub.voice_note_start") || "Record"
          ), isRecording && /* @__PURE__ */ React.createElement(
            "button",
            {
              type: "button",
              onClick: togglePause,
              "aria-pressed": isPaused,
              "aria-label": isPaused ? t("research_hub.voice_note_resume_aria") || "Resume voice note recording" : t("research_hub.voice_note_pause_aria") || "Pause voice note recording",
              style: {
                padding: "6px 12px",
                borderRadius: "999px",
                background: isPaused ? "#047857" : "#fff",
                color: isPaused ? "#fff" : "#334155",
                border: "1px solid " + (isPaused ? "#047857" : "#94a3b8"),
                fontWeight: 800,
                fontSize: "11px",
                cursor: "pointer"
              }
            },
            isPaused ? t("research_hub.voice_note_resume") || "Resume" : t("research_hub.voice_note_pause") || "Pause"
          ), isRecording && /* @__PURE__ */ React.createElement(
            "button",
            {
              type: "button",
              onClick: stopRec,
              "aria-label": t("research_hub.voice_note_stop_aria") || "Stop recording",
              style: {
                padding: "6px 12px",
                borderRadius: "999px",
                background: "#1f2937",
                color: "#fff",
                border: "none",
                fontWeight: 800,
                fontSize: "11px",
                cursor: "pointer"
              }
            },
            t("research_hub.voice_note_stop") || "Stop"
          ), audioBase64 && !isRecording && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("audio", { controls: true, src: audioBase64, "aria-label": label + " playback", style: { height: "32px" } }), /* @__PURE__ */ React.createElement(
            "button",
            {
              type: "button",
              onClick: clearRec,
              style: {
                padding: "6px 12px",
                borderRadius: "999px",
                background: "#fff",
                color: "#64748b",
                border: "1px solid #cbd5e1",
                fontWeight: 700,
                fontSize: "11px",
                cursor: "pointer"
              }
            },
            t("research_hub.voice_note_clear") || "Clear"
          ))),
          err && /* @__PURE__ */ React.createElement("p", { role: "alert", style: { margin: 0, fontSize: "11px", color: "#b91c1c" } }, err)
        );
      }
      function CostMeter(props) {
        var t = props.t || function(k) {
          return k;
        };
        var used = props.used || 0;
        var cap = props.cap || MAX_AI_CALLS_PER_SESSION;
        if (used === 0) return null;
        var remaining = Math.max(0, cap - used);
        var color = remaining === 0 ? "#b91c1c" : remaining <= 2 ? "#d97706" : "#475569";
        return /* @__PURE__ */ React.createElement(
          "span",
          {
            role: "status",
            "aria-live": "polite",
            style: {
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              borderRadius: "999px",
              fontSize: "11px",
              fontWeight: 700,
              background: "#f8fafc",
              color,
              border: "1px solid #e2e8f0"
            }
          },
          /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F4DD}"),
          remaining > 0 ? (t("research_hub.ai_calls_remaining_prefix") || "") + remaining + " / " + cap + " " + (t("research_hub.ai_calls_remaining_suffix") || "AI questions left this session") : t("research_hub.ai_calls_exhausted") || "AI question quota used. Static help still available."
        );
      }
      function DevLevelSelector(props) {
        var t = props.t || function(k) {
          return k;
        };
        var value = props.value || "6_8";
        var onChange = props.onChange;
        return /* @__PURE__ */ React.createElement(
          "label",
          {
            style: {
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 12px",
              borderRadius: "999px",
              background: "#f8fafc",
              border: "1px solid #cbd5e1",
              fontSize: "11px",
              fontWeight: 700,
              color: "#1e293b",
              cursor: "pointer"
            }
          },
          /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F393}"),
          /* @__PURE__ */ React.createElement("span", null, t("research_hub.dev_level_label") || "Reading level"),
          /* @__PURE__ */ React.createElement(
            "select",
            {
              value,
              onChange: function(e) {
                if (typeof onChange === "function") onChange(e.target.value);
              },
              "aria-label": t("research_hub.dev_level_aria") || "Select developmental level for prompts and rubrics",
              style: {
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                padding: "3px 6px",
                fontSize: "11px",
                fontFamily: "inherit",
                color: "#1e293b",
                cursor: "pointer"
              }
            },
            DEV_LEVELS.map(function(lvl) {
              return /* @__PURE__ */ React.createElement("option", { key: lvl.key, value: lvl.key }, lvl.label);
            })
          )
        );
      }
      function makeAskResearchCoach(deps, journal, setJournal) {
        var ai = deps.ai;
        var onCallGemini = deps.onCallGemini;
        var addToast = deps.addToast;
        var nowMs = function() {
          return Date.now();
        };
        var PER_TOUCHPOINT_CAP = {
          wonder_sorter: 2,
          model_surfacer: 3,
          steelman_second_pass: 2,
          honest_uncertainty: 2,
          // Tier-3 Engineering Design lane (Constraint Forge). Sum = 9 with the
          // global 8/session cap binding, forcing students to choose where to spend
          // AI critique. tradeoff_inverter SHIPPED (cap 1, plan_test antagonist mirror).
          constraint_excavator: 2,
          dominated_solution_finder: 2,
          failure_mode_critic: 2,
          stakeholder_translator: 2,
          tradeoff_inverter: 1,
          // V2 ship — antagonist mirror at plan_test; lowest cap because highest harvest-risk
          // Tier-4 Humanities & Social Research lane (Inquiry Studio). Sum = 8
          // (1+2+1+3+0+1). Flat-map design honors the lane-rotation intent under
          // the global 8/session cap: each lane only renders its own touchpoint
          // buttons, and the global cap binds across lanes naturally. The
          // no_ai_stage_sentinel is the structural Stage-5 NO-AI guard — cap 0
          // means any call attempt blocks as rate_limit_touchpoint, logged in
          // aiHistory for educator-dashboard transparency.
          contestability_probe: 1,
          source_lateral_probe: 2,
          counter_framing_voicer: 1,
          warrant_questioner: 3,
          // folds 3 former touchpoints via sub-trigger branching
          no_ai_stage_sentinel: 0,
          // intentional zero — Stage 5 NO-AI structural guard
          standpoint_mirror: 1
        };
        var BURST_WINDOW_MS = 5 * 60 * 1e3;
        var BURST_THRESHOLD = 6;
        var BURST_LOCKOUT_MS = 2 * 60 * 1e3;
        function appendAiHistory(prevJournal, entry) {
          var capped = (prevJournal.aiHistory || []).concat([entry]);
          if (capped.length > 60) capped = capped.slice(-60);
          return capped;
        }
        return async function askResearchCoach(touchpoint, ctx, signal) {
          var traceId = newTraceId();
          var t0 = nowMs();
          var aiText = ai && typeof ai.generateText === "function" ? ai.generateText.bind(ai) : null;
          if (!aiText && typeof onCallGemini !== "function") {
            return { ok: false, blocked: true, blockedReason: "no_compatible_backend", traceId, latencyMs: 0 };
          }
          if ((journal.aiCallCount || 0) >= MAX_AI_CALLS_PER_SESSION) {
            return { ok: false, blocked: true, blockedReason: "rate_limit_session", detail: "You've used all your AI questions for this session. Reload to reset, or keep working on your own.", traceId, latencyMs: 0 };
          }
          var tpId = touchpoint && touchpoint.id;
          if (tpId && PER_TOUCHPOINT_CAP[tpId]) {
            var usedForTp = (journal.aiHistory || []).filter(function(h) {
              return h.touchpoint === tpId && !h.blocked;
            }).length;
            if (usedForTp >= PER_TOUCHPOINT_CAP[tpId]) {
              return {
                ok: false,
                blocked: true,
                blockedReason: "rate_limit_touchpoint",
                detail: "You've used your AI helps for this step. Loop back to gather more, or move forward on your own.",
                traceId,
                latencyMs: 0
              };
            }
          }
          var recentBlocks = (journal.aiHistory || []).filter(function(h) {
            return h.blocked && nowMs() - (h.ts || 0) < BURST_WINDOW_MS;
          });
          if (recentBlocks.length >= BURST_THRESHOLD) {
            var newestBlockTs = recentBlocks[recentBlocks.length - 1].ts || 0;
            if (nowMs() - newestBlockTs < BURST_LOCKOUT_MS) {
              return {
                ok: false,
                blocked: true,
                blockedReason: "rate_limit_burst",
                detail: "Take a breath. The AI isn't going anywhere. Try looping back to an earlier stage.",
                traceId,
                latencyMs: 0
              };
            }
          }
          if (touchpoint && typeof touchpoint.gateCheck === "function") {
            var gate = { ok: true };
            try {
              gate = touchpoint.gateCheck(journal, ctx) || { ok: true };
            } catch (_) {
              gate = { ok: true };
            }
            if (gate && gate.ok === false) {
              setJournal(function(prev) {
                return Object.assign({}, prev, {
                  aiHistory: appendAiHistory(prev, {
                    ts: Date.now(),
                    touchpoint: tpId,
                    blocked: true,
                    gate_reason: gate.reason || "student_authored_required",
                    bypass_signals: gate.bypass_signals || [],
                    traceId
                  })
                });
              });
              return {
                ok: false,
                blocked: true,
                blockedReason: "student_authored_required",
                detail: gate.reason || "Write your own attempt first before asking AI.",
                bypass_signals: gate.bypass_signals || [],
                retryAfterMs: gate.retryAfterMs || 0,
                traceId,
                latencyMs: 0
              };
            }
          }
          var prompt = null;
          try {
            prompt = touchpoint && typeof touchpoint.buildPrompt === "function" ? touchpoint.buildPrompt(journal, ctx) : null;
          } catch (_) {
          }
          if (!prompt || typeof prompt !== "string") {
            return { ok: false, blocked: true, blockedReason: "no_prompt", traceId, latencyMs: 0 };
          }
          if (prompt.length > INPUT_HARD_CAP * 6) prompt = prompt.slice(0, INPUT_HARD_CAP * 6);
          if (typeof navigator !== "undefined" && navigator.onLine === false) {
            return { ok: false, blocked: true, blockedReason: "network", traceId, latencyMs: 0 };
          }
          var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
          var timeoutId = controller ? setTimeout(function() {
            try {
              controller.abort();
            } catch (_) {
            }
          }, 12e3) : null;
          var combined = controller ? controller.signal : signal;
          if (signal && controller && typeof signal.addEventListener === "function") {
            try {
              signal.addEventListener("abort", function() {
                try {
                  controller.abort();
                } catch (_) {
                }
              });
            } catch (_) {
            }
          }
          setJournal(function(prev) {
            var next = Object.assign({}, prev);
            next.aiCallCount = (prev.aiCallCount || 0) + 1;
            return next;
          });
          var rawText = "";
          var errorKind = null;
          try {
            if (aiText) {
              var res = await aiText(prompt, { json: true, temperature: 0.7, signal: combined });
              rawText = typeof res === "string" ? res : res && (res.text || res.output_text) || "";
            } else {
              var legacy = await onCallGemini(prompt, true, false, null, null, combined, false);
              rawText = typeof legacy === "string" ? legacy : legacy && legacy.text || "";
            }
          } catch (err) {
            var msg = err && err.message || String(err || "");
            if (/abort/i.test(msg) || signal && signal.aborted) errorKind = "aborted";
            else if (/quota|RESOURCE_EXHAUSTED|429/i.test(msg)) errorKind = "rate_limit_upstream";
            else if (/safety|SAFETY|blockReason/i.test(msg)) errorKind = "safety_blocked";
            else if (/Failed to fetch|NetworkError|ECONN/i.test(msg)) errorKind = "network";
            else errorKind = "network";
            if (errorKind === "network" || errorKind === "aborted" || errorKind === "rate_limit_upstream") {
              setJournal(function(prev) {
                var next = Object.assign({}, prev);
                next.aiCallCount = Math.max(0, (prev.aiCallCount || 1) - 1);
                return next;
              });
            }
          } finally {
            if (timeoutId) clearTimeout(timeoutId);
          }
          var latencyMs = nowMs() - t0;
          if (errorKind) {
            var copy = errorKind === "aborted" ? "" : errorKind === "rate_limit_upstream" ? "AlloBot is taking a quick breather. Try again in a minute." : errorKind === "safety_blocked" ? "I can't respond to that. Want to try rephrasing?" : "Couldn't reach the AI service. Check your connection and try again.";
            return { ok: false, blocked: true, blockedReason: errorKind, detail: copy, traceId, latencyMs };
          }
          var parsed = safeJsonParse(rawText);
          if (!parsed) {
            return {
              ok: true,
              blocked: false,
              data: { __aiSuggestion: true, traceId, parseFailed: true, answer: String(rawText || "").slice(0, ANSWER_HARD_CAP) },
              raw: rawText,
              latencyMs,
              traceId
            };
          }
          var stripped = stripPedagogicalFootguns(parsed);
          var qTelemetry = { rejected: 0, fixedKeys: [] };
          stripped = enforceQuestionFormat(stripped, 0, qTelemetry);
          function truncStrings(o, depth) {
            if (o === null || typeof o !== "object" || depth > 6) return o;
            if (Array.isArray(o)) return o.map(function(x) {
              return truncStrings(x, depth + 1);
            });
            var out = {};
            Object.keys(o).forEach(function(k) {
              var v = o[k];
              if (typeof v === "string" && v.length > ANSWER_HARD_CAP) v = v.slice(0, ANSWER_HARD_CAP) + "\u2026";
              else if (typeof v === "object") v = truncStrings(v, depth + 1);
              out[k] = v;
            });
            return out;
          }
          stripped = truncStrings(stripped, 0);
          var validatorReject = null;
          if (touchpoint && typeof touchpoint.validate === "function") {
            try {
              var validated = touchpoint.validate(stripped, journal, ctx);
              if (validated && validated.__rejected) {
                validatorReject = validated;
              } else if (validated) {
                stripped = validated;
              }
            } catch (_) {
            }
          }
          if (validatorReject) {
            setJournal(function(prev) {
              var next = Object.assign({}, prev);
              next.aiCallCount = Math.max(0, (prev.aiCallCount || 1) - 1);
              next.aiHistory = appendAiHistory(prev, {
                ts: Date.now(),
                touchpoint: tpId,
                blocked: true,
                rejectReason: validatorReject.rejectReason || "validator_rejected",
                attemptedShapeKeys: validatorReject.attemptedShapeKeys || [],
                traceId
              });
              return next;
            });
            return {
              ok: false,
              blocked: true,
              blockedReason: "validator_rejected",
              detail: validatorReject.rejectReason || "AI response did not meet the lane rules. Try again.",
              traceId,
              latencyMs
            };
          }
          stripped.__aiSuggestion = true;
          stripped.__traceId = traceId;
          setJournal(function(prev) {
            return Object.assign({}, prev, {
              aiHistory: appendAiHistory(prev, {
                ts: Date.now(),
                touchpoint: tpId,
                in: prompt.slice(0, 400),
                summary: typeof stripped.answer === "string" ? stripped.answer.slice(0, 200) : "",
                qFormatRejected: qTelemetry.rejected,
                blocked: false,
                traceId
              })
            });
          });
          return { ok: true, blocked: false, data: stripped, raw: rawText, latencyMs, traceId, qFormatRejected: qTelemetry.rejected };
        };
      }
      function PlaceholderLaneView(props) {
        var t = props.t || function(k) {
          return k;
        };
        var lane = props.lane;
        var onBack = props.onBack;
        return /* @__PURE__ */ React.createElement("div", { style: {
          padding: "20px",
          borderRadius: "16px",
          background: "#ffffff",
          border: "1px dashed #cbd5e1",
          display: "flex",
          flexDirection: "column",
          gap: "14px"
        } }, /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            onClick: onBack,
            style: {
              alignSelf: "flex-start",
              padding: "6px 12px",
              borderRadius: "999px",
              background: "#f1f5f9",
              color: "#475569",
              border: "none",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer"
            }
          },
          "\u2190 ",
          t("research_hub.back_to_lanes") || "Choose a different lane"
        ), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "12px" } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true", style: { fontSize: "40px" } }, lane.icon), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { style: { margin: 0, fontSize: "17px", fontWeight: 800, color: "#1e293b" } }, lane.label), /* @__PURE__ */ React.createElement("p", { style: { margin: "2px 0 0", fontSize: "12px", color: "#64748b" } }, lane.tagline))), /* @__PURE__ */ React.createElement("p", { style: { margin: 0, fontSize: "13px", color: "#334155", lineHeight: 1.55 } }, lane.blurb), /* @__PURE__ */ React.createElement("div", { style: {
          padding: "12px 14px",
          borderRadius: "12px",
          background: "#fef3c7",
          border: "1px solid #fbbf24",
          fontSize: "12px",
          color: "#92400e",
          lineHeight: 1.5
        } }, /* @__PURE__ */ React.createElement("strong", null, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F527} "), t("research_hub.lane_under_construction_title") || "This lane didn\u2019t load."), /* @__PURE__ */ React.createElement("p", { style: { margin: "4px 0 0" } }, t("research_hub.lane_under_construction_body") || "The Hub and your inquiry journal are working. This lane\u2019s workspace failed to load \u2014 try closing and reopening the Research Hub, or reload the page.")), /* @__PURE__ */ React.createElement("details", { style: { fontSize: "11px", color: "#475569" } }, /* @__PURE__ */ React.createElement("summary", { style: { cursor: "pointer", fontWeight: 700 } }, t("research_hub.lane_preview_summary") || "Preview the loop"), /* @__PURE__ */ React.createElement("p", { style: { marginTop: "6px", lineHeight: 1.55 } }, t("research_hub.lane_preview_body_" + lane.id) || 'In this lane you move through its stages in any order, with explicit "loop back" affordances so revising is the point \u2014 not a setback.')));
      }
      function ResearchHub(props) {
        var t = typeof props.t === "function" ? props.t : function(k) {
          return k;
        };
        var isOpen = props.isOpen !== false;
        var onClose = props.onClose;
        var studentCodename = props.studentCodename || "";
        var addToast = props.addToast || function() {
        };
        var isTeacherMode = props.isTeacherMode === true;
        var gradeLevel = props.gradeLevel;
        var dialogRef = useRef(null);
        var closeButtonRef = useRef(null);
        var resetDialogRef = useRef(null);
        var resetTriggerRef = useRef(null);
        var _resetConfirm = useState(false);
        var showResetConfirm = _resetConfirm[0];
        var setShowResetConfirm = _resetConfirm[1];
        var _exitHint = useState(false);
        var showExitHint = _exitHint[0];
        var setShowExitHint = _exitHint[1];
        var _pendingCapture = useState(null);
        var pendingCapture = _pendingCapture[0];
        var setPendingCapture = _pendingCapture[1];
        var _captureNote = useState("");
        var captureNote = _captureNote[0];
        var setCaptureNote = _captureNote[1];
        var _captureUncertainty = useState("");
        var captureUncertainty = _captureUncertainty[0];
        var setCaptureUncertainty = _captureUncertainty[1];
        var _captureEvidence = useState(true);
        var captureAsEvidence = _captureEvidence[0];
        var setCaptureAsEvidence = _captureEvidence[1];
        var _archiveReady = useState(false);
        var artifactArchiveReady = _archiveReady[0];
        var setArtifactArchiveReady = _archiveReady[1];
        var _legacyDrafts = useState({});
        var legacyDrafts = _legacyDrafts[0];
        var setLegacyDrafts = _legacyDrafts[1];
        var closeHandlerRef = useRef(onClose);
        closeHandlerRef.current = onClose;
        useEffect(function() {
          if (!showResetConfirm) return;
          var cancel = resetDialogRef.current && resetDialogRef.current.querySelector('[data-safe-default="true"]');
          if (cancel) cancel.focus();
        }, [showResetConfirm]);
        useEffect(function() {
          if (!isOpen) return void 0;
          var dialog = dialogRef.current;
          if (!dialog) return void 0;
          var previousFocus = document.activeElement;
          var getFocusable = function() {
            return Array.from(dialog.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
          };
          (closeButtonRef.current || getFocusable()[0] || dialog).focus();
          var onKeyDown = function(event) {
            if (event.key === "Escape") {
              if (typeof closeHandlerRef.current === "function") {
                event.preventDefault();
                closeHandlerRef.current();
              }
              return;
            }
            if (event.key !== "Tab") return;
            var focusable = getFocusable();
            if (!focusable.length) {
              event.preventDefault();
              dialog.focus();
              return;
            }
            var first = focusable[0], last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first.focus();
            }
          };
          dialog.addEventListener("keydown", onKeyDown);
          return function() {
            dialog.removeEventListener("keydown", onKeyDown);
            if (previousFocus && previousFocus.isConnected && typeof previousFocus.focus === "function") previousFocus.focus();
          };
        }, [isOpen]);
        var _journal = useState(loadJournal);
        var journal = _journal[0];
        var setJournalState = _journal[1];
        var setJournal = useCallback(function(updater) {
          setJournalState(function(prev) {
            var next = typeof updater === "function" ? updater(prev) : updater;
            return stampNewInquiryArtifacts(prev, next);
          });
        }, []);
        useEffect(function() {
          var offerCapture = function(event) {
            var item = event && event.detail;
            if (item) setPendingCapture(function(current) {
              return current || item;
            });
          };
          if (isOpen) {
            var queued = readCaptureInbox();
            if (queued.length) setPendingCapture(function(current) {
              return current || queued[0];
            });
          }
          window.addEventListener("alloflow:research-capture", offerCapture);
          return function() {
            window.removeEventListener("alloflow:research-capture", offerCapture);
          };
        }, [isOpen]);
        var _saveStatus = useState("saved");
        var saveStatus = _saveStatus[0];
        var setSaveStatus = _saveStatus[1];
        var latestJournalRef = useRef(journal);
        latestJournalRef.current = journal;
        useEffect(function() {
          setSaveStatus("saving");
          var id = setTimeout(function() {
            var saved = saveJournal(journal);
            setSaveStatus(saved ? "saved" : journal.loadWarning ? "read-only" : "save unavailable");
          }, 120);
          return function() {
            clearTimeout(id);
            saveJournal(journal);
          };
        }, [journal]);
        useEffect(function() {
          var flushLatestJournal = function() {
            saveJournal(latestJournalRef.current);
          };
          window.addEventListener("pagehide", flushLatestJournal);
          window.addEventListener("beforeunload", flushLatestJournal);
          return function() {
            window.removeEventListener("pagehide", flushLatestJournal);
            window.removeEventListener("beforeunload", flushLatestJournal);
            flushLatestJournal();
          };
        }, []);
        var hadSavedJournalRef = useRef(safeLocal(STORAGE_KEY) != null);
        useEffect(function() {
          if (hadSavedJournalRef.current) return;
          var seeded = gradeLevelToDevLevel(gradeLevel);
          if (seeded && seeded !== journal.devLevel) {
            setJournal(function(prev) {
              return Object.assign({}, prev, { devLevel: seeded });
            });
          }
        }, []);
        var ask = useMemo(function() {
          return makeAskResearchCoach({
            ai: props.ai,
            onCallGemini: props.onCallGemini,
            addToast
          }, journal, setJournal);
        }, [journal, props.ai, props.onCallGemini]);
        var lanes = resolveLanes();
        var activeLane = journal.activeLane ? lanes.filter(function(L) {
          return L.id === journal.activeLane;
        })[0] : null;
        var activeMethodPack = methodPackById(journal.activeMethodPack);
        var _eduView = useState(false);
        var educatorViewOn = _eduView[0];
        var setEducatorViewOn = _eduView[1];
        var educatorView = window.ResearchHub && window.ResearchHub.getEducatorView ? window.ResearchHub.getEducatorView() : null;
        var researchMilestones = [
          { label: "Frame a question", complete: !!(journal.questionTitle || "").trim() },
          { label: "Gather evidence", complete: (journal.evidenceCards || []).length > 0 || (journal.sources || []).length > 0 || (journal.capturedArtifacts || []).length > 0 },
          { label: "Develop ideas", complete: (journal.modelSnapshots || []).length > 0 || (journal.candidateConcepts || []).length > 0 || (journal.framings || []).length > 0 },
          { label: "Build a position", complete: (journal.claims || []).length > 0 || (journal.designClaims || []).length > 0 || (journal.compositions || []).length > 0 },
          { label: "Revise and loop", complete: (journal.loopBacks || []).length > 0 }
        ];
        var researchProgress = Math.round(researchMilestones.filter(function(step) {
          return step.complete;
        }).length / researchMilestones.length * 100);
        var evidenceGraph = useMemo(function() {
          return buildEvidenceGraph(journal);
        }, [journal]);
        var inquiryAudit = useMemo(function() {
          return buildInquiryAudit(journal);
        }, [journal]);
        var integrationHealth = useMemo(function() {
          return summarizeIntegrationHealth(journal.capturedArtifacts || []);
        }, [journal.capturedArtifacts]);
        var storageHealth = useMemo(function() {
          return researchStorageHealth(journal);
        }, [journal]);
        var legacyArtifacts = (journal.capturedArtifacts || []).filter(function(artifact) {
          return artifact && (!artifact.integrationContract || artifact.integrationContractStatus === "legacy_contract");
        });
        var researchNextMove = !researchMilestones[0].complete ? "Write a question worth investigating" : !activeLane ? "Choose an inquiry approach that fits what you want to do" : !researchMilestones[1].complete ? "Collect or log your first piece of evidence" : !researchMilestones[2].complete ? "Develop a model, framing, or candidate idea" : !researchMilestones[3].complete ? "Connect evidence to a claim or design decision" : "Revisit an earlier stage and strengthen your reasoning";
        var researchQuestionText = (journal.questionTitle || "").trim();
        var researchQuestionWords = researchQuestionText ? researchQuestionText.split(/\s+/).filter(Boolean).length : 0;
        var researchQuestionSignals = [
          { label: "In your own words", met: researchQuestionWords >= 4 },
          { label: "Open to investigation", met: /^(how|why|what|which|when|where|to what extent|in what ways|whose)\b/i.test(researchQuestionText) },
          { label: "Focused enough to explore", met: researchQuestionWords >= 7 && researchQuestionWords <= 28 },
          { label: "Written as a question", met: /\?$/.test(researchQuestionText) }
        ];
        var researchQuestionReady = researchQuestionSignals.filter(function(signal) {
          return signal.met;
        }).length;
        var researchMethodMatch = matchMethodPackForQuestion(researchQuestionText);
        var setActiveLane = useCallback(function(laneId) {
          setJournal(function(prev) {
            var next = Object.assign({}, prev);
            next.activeLane = laneId;
            next.activeStage = null;
            next.updatedAt = Date.now();
            return next;
          });
        }, []);
        var selectMethodPack = useCallback(function(packId) {
          setJournal(function(prev) {
            return applyMethodPackSelection(prev, packId);
          });
        }, []);
        var setDevLevel = useCallback(function(lvl) {
          setJournal(function(prev) {
            var next = Object.assign({}, prev);
            next.devLevel = lvl;
            return next;
          });
        }, []);
        var setQuestionTitle = useCallback(function(txt) {
          setJournal(function(prev) {
            var next = Object.assign({}, prev);
            next.questionTitle = String(txt || "").slice(0, 240);
            return next;
          });
        }, []);
        var advanceCaptureQueue = function(handledId) {
          removeCaptureInboxItem(handledId);
          var remaining = readCaptureInbox();
          setPendingCapture(remaining.length ? remaining[0] : null);
          setCaptureNote("");
          setCaptureUncertainty("");
          setCaptureAsEvidence(true);
        };
        var dismissPendingCapture = function() {
          if (pendingCapture) advanceCaptureQueue(pendingCapture.id);
        };
        var acceptPendingCapture = function() {
          if (!pendingCapture) return;
          var accepted = pendingCapture;
          setJournal(function(prev) {
            var now = Date.now();
            var next = Object.assign({}, prev);
            var pack = methodPackById(prev.activeMethodPack) || methodPackById("scientific_investigation");
            var episodeId = prev.activeInquiryEpisodeId;
            var episodes = Array.isArray(prev.inquiryEpisodes) ? prev.inquiryEpisodes.slice() : [];
            var history = Array.isArray(prev.methodPackHistory) ? prev.methodPackHistory.slice() : [];
            if (!episodeId) {
              episodeId = researchId("episode_");
              episodes.push({ id: episodeId, methodPackId: pack.id, laneId: pack.laneId, startedAt: now, questionAtStart: String(prev.questionTitle || "").slice(0, 240) });
              history.push({ id: pack.id, laneId: pack.laneId, episodeId, selectedAt: now });
            }
            var artifact = Object.assign({}, accepted, {
              acceptedAt: now,
              learnerNote: String(captureNote || "").trim().slice(0, 2e3),
              uncertaintyNote: String(captureUncertainty || "").trim().slice(0, 2e3),
              methodPackId: pack.id,
              inquiryEpisodeId: episodeId
            });
            artifact.integrationHealth = assessResearchArtifactIntegration(artifact);
            next.activeMethodPack = prev.activeMethodPack || pack.id;
            next.activeLane = prev.activeLane || pack.laneId;
            next.activeInquiryEpisodeId = episodeId;
            next.inquiryEpisodes = episodes;
            next.methodPackHistory = history;
            next.capturedArtifacts = (prev.capturedArtifacts || []).concat([artifact]);
            if (captureAsEvidence) {
              next.evidenceCards = (prev.evidenceCards || []).concat([{
                id: researchId("ev_tool_"),
                ts: now,
                kind: "text",
                tag: "tool evidence",
                text: artifact.summary + (artifact.learnerNote ? " Learner note: " + artifact.learnerNote : ""),
                toolArtifactId: artifact.id,
                sourceToolId: artifact.sourceToolId,
                methodPackId: pack.id,
                inquiryEpisodeId: episodeId
              }]);
            }
            next.updatedAt = now;
            return next;
          });
          addToast("Saved " + accepted.title + " to the Inquiry Portfolio for learner review.", "success");
          advanceCaptureQueue(accepted.id);
        };
        var downloadInquiryPortfolio = function() {
          var payload = {
            format: "alloflow-inquiry-portfolio",
            schemaVersion: journal.v,
            exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
            activeMethodPack: journal.activeMethodPack,
            activeInquiryEpisodeId: journal.activeInquiryEpisodeId,
            inquiryEpisodes: journal.inquiryEpisodes || [],
            integrationHealth: summarizeIntegrationHealth(journal.capturedArtifacts || []),
            inquiryAudit: buildInquiryAudit(journal),
            evidenceGraph,
            interoperability: { webAnnotation: "W3C Web Annotation Data Model", citations: "CSL-JSON", researchPackage: "RO-Crate 1.3" },
            journal
          };
          if (!downloadJsonFile("alloflow-inquiry-portfolio.json", payload)) addToast("Portfolio download is unavailable in this browser.", "error");
        };
        var downloadEvidenceGraph = function() {
          if (!downloadJsonFile("alloflow-evidence-graph.json", evidenceGraph)) addToast("Evidence graph download is unavailable in this browser.", "error");
          else addToast("Evidence graph downloaded with explicit claims, evidence, warrants, and counterevidence relationships.", "success");
        };
        var downloadWebAnnotations = function() {
          var annotations = buildW3CWebAnnotations(journal, evidenceGraph);
          if (!downloadJsonFile("alloflow-web-annotations.jsonld", annotations)) addToast("Web Annotation download is unavailable in this browser.", "error");
          else addToast("W3C Web Annotation JSON-LD downloaded.", "success");
        };
        var downloadCslCitations = function() {
          var citations = buildCslJson(journal);
          if (!downloadJsonFile("alloflow-citations.json", citations)) addToast("Citation download is unavailable in this browser.", "error");
          else addToast("CSL-compatible citation records downloaded.", "success");
        };
        var downloadRoCrate = function() {
          var crate = buildRoCrate(journal, evidenceGraph);
          if (!downloadJsonFile("ro-crate-metadata.json", crate)) addToast("RO-Crate metadata download is unavailable in this browser.", "error");
          else addToast("RO-Crate 1.3 metadata downloaded. Keep it with the portfolio files it describes.", "success");
        };
        var downloadInteroperabilityBundle = function() {
          var bundle = buildInteroperabilityBundle(journal);
          if (!downloadJsonFile("alloflow-inquiry-interoperability-bundle.json", bundle)) addToast("Interoperability bundle download is unavailable in this browser.", "error");
          else addToast("Portable evidence graph, annotations, citations, and RO-Crate metadata downloaded as one bounded bundle.", "success");
        };
        var downloadToolArtifactArchive = function() {
          var artifacts = journal.capturedArtifacts || [];
          if (!artifacts.length) {
            addToast("There are no approved tool artifacts to archive.", "info");
            return;
          }
          var linkedEvidence = (journal.evidenceCards || []).filter(function(card) {
            return card && card.toolArtifactId;
          });
          var payload = { format: "alloflow-tool-artifact-archive", schemaVersion: 1, exportedAt: (/* @__PURE__ */ new Date()).toISOString(), artifacts, linkedEvidenceCards: linkedEvidence };
          if (downloadJsonFile("alloflow-tool-artifact-archive.json", payload)) {
            setArtifactArchiveReady(true);
            addToast("Artifact archive downloaded. Review the file before choosing the removal step.", "success");
          } else addToast("Artifact archive download is unavailable in this browser.", "error");
        };
        var removeDownloadedToolArtifacts = function() {
          if (!artifactArchiveReady) return;
          setJournal(function(prev) {
            var archivedIds = (prev.capturedArtifacts || []).map(function(artifact) {
              return artifact.id;
            });
            var next = Object.assign({}, prev);
            next.capturedArtifacts = [];
            next.evidenceCards = (prev.evidenceCards || []).filter(function(card) {
              return !card.toolArtifactId || archivedIds.indexOf(card.toolArtifactId) === -1;
            });
            next.updatedAt = Date.now();
            return next;
          });
          setArtifactArchiveReady(false);
          addToast("Downloaded tool artifacts and their linked evidence cards were removed from this device.", "success");
        };
        var saveLegacyArtifactContext = function(artifactId) {
          var note = String(legacyDrafts[artifactId] || "").trim().slice(0, 2e3);
          if (note.length < 12) return;
          setJournal(function(prev) {
            var next = Object.assign({}, prev);
            next.capturedArtifacts = (prev.capturedArtifacts || []).map(function(artifact) {
              if (!artifact || artifact.id !== artifactId) return artifact;
              var updated = Object.assign({}, artifact, { legacyContextNote: note, legacyReviewedAt: Date.now() });
              updated.integrationHealth = assessResearchArtifactIntegration(updated);
              return updated;
            });
            return next;
          });
          setLegacyDrafts(function(prev) {
            var next = Object.assign({}, prev);
            delete next[artifactId];
            return next;
          });
          addToast("Legacy context saved without claiming missing original provenance.", "success");
        };
        var downloadRecoveryCopy = function() {
          var raw = safeLocal(STORAGE_KEY);
          var parsed = null;
          try {
            parsed = JSON.parse(raw || "null");
          } catch (_) {
            parsed = { raw };
          }
          downloadJsonFile("alloflow-inquiry-portfolio-recovery.json", { exportedAt: (/* @__PURE__ */ new Date()).toISOString(), original: parsed });
        };
        var requestClearJournal = useCallback(function(event) {
          resetTriggerRef.current = event.currentTarget;
          setShowResetConfirm(true);
        }, []);
        var closeResetDialog = useCallback(function() {
          setShowResetConfirm(false);
          window.setTimeout(function() {
            var trigger = resetTriggerRef.current;
            if (trigger && trigger.isConnected && typeof trigger.focus === "function") trigger.focus();
            else if (closeButtonRef.current) closeButtonRef.current.focus();
          }, 0);
        }, []);
        var confirmClearJournal = useCallback(function() {
          var fresh = emptyJournal();
          fresh.devLevel = journal.devLevel;
          setJournal(fresh);
          closeResetDialog();
        }, [journal, closeResetDialog]);
        if (!isOpen) return null;
        return /* @__PURE__ */ React.createElement(
          "div",
          {
            role: "presentation",
            "data-help-key": "research_hub",
            "data-backdrop-dismiss-disabled": "true",
            style: {
              position: "fixed",
              inset: 0,
              zIndex: 60,
              background: "rgba(15,23,42,0.55)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "stretch",
              justifyContent: "center",
              padding: "4vh 16px",
              overflowY: "auto"
            },
            onClick: function(e) {
              if (e.target === e.currentTarget) setShowExitHint(true);
            }
          },
          /* @__PURE__ */ React.createElement(
            "div",
            {
              ref: dialogRef,
              tabIndex: -1,
              role: "dialog",
              "aria-modal": "true",
              "aria-labelledby": "research-hub-dialog-title",
              "aria-describedby": "research-hub-dialog-description",
              onClick: function(e) {
                e.stopPropagation();
              },
              style: {
                background: "#ffffff",
                borderRadius: "20px",
                width: "100%",
                maxWidth: "900px",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
                maxHeight: "92vh"
              }
            },
            /* @__PURE__ */ React.createElement("div", { style: {
              padding: "16px 22px",
              background: "linear-gradient(135deg, #4338ca 0%, #7c3aed 100%)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              flexWrap: "wrap",
              borderRadius: "20px 20px 0 0"
            } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "12px" } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true", style: { fontSize: "28px" } }, "\u{1F50D}"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { id: "research-hub-dialog-title", style: { margin: 0, fontSize: "18px", fontWeight: 800 } }, t("research_hub.modal_title") || "Research & Inquiry Hub"), /* @__PURE__ */ React.createElement("p", { id: "research-hub-dialog-description", style: { margin: "2px 0 0", fontSize: "11px", opacity: 0.85 } }, studentCodename ? (t("research_hub.modal_subtitle_with_codename") || "Inquiry Portfolio for ") + studentCodename : t("research_hub.modal_subtitle") || "Investigate, interpret, design, source, and revise in one connected Inquiry Portfolio."))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement(CostMeter, { t, used: journal.aiCallCount || 0, cap: MAX_AI_CALLS_PER_SESSION }), /* @__PURE__ */ React.createElement(DevLevelSelector, { t, value: journal.devLevel, onChange: setDevLevel }), educatorView && isTeacherMode && /* @__PURE__ */ React.createElement(
              "button",
              {
                type: "button",
                onClick: function() {
                  setEducatorViewOn(!educatorViewOn);
                },
                "aria-pressed": educatorViewOn,
                "aria-label": t("research_hub.educator_view_toggle_aria") || "Toggle educator view",
                title: t("research_hub.educator_view_toggle_title") || "Educator view \u2014 read-only inquiry trajectory",
                style: {
                  background: educatorViewOn ? "#fbbf24" : "rgba(255,255,255,0.18)",
                  color: educatorViewOn ? "#7c2d12" : "#fff",
                  border: "1px solid " + (educatorViewOn ? "#fbbf24" : "rgba(255,255,255,0.3)"),
                  borderRadius: "999px",
                  padding: "6px 12px",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: 800
                }
              },
              /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F393} "),
              educatorViewOn ? t("research_hub.educator_view_on") || "Educator view" : t("research_hub.educator_view_off") || "Educator view"
            ), /* @__PURE__ */ React.createElement(
              "button",
              {
                ref: closeButtonRef,
                type: "button",
                onClick: function() {
                  setShowExitHint(false);
                  if (typeof onClose === "function") onClose();
                },
                "aria-label": t("common.close") || "Close",
                style: {
                  background: "rgba(255,255,255,0.18)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.3)",
                  borderRadius: "8px",
                  padding: "6px 12px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: 700
                }
              },
              "\u2715"
            ))),
            /* @__PURE__ */ React.createElement("div", { style: {
              padding: "20px 22px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              overflowY: "auto",
              flex: 1
            } }, /* @__PURE__ */ React.createElement("div", { role: "status", "aria-live": "polite", "aria-atomic": "true", style: { position: "absolute", width: "1px", height: "1px", padding: 0, margin: "-1px", overflow: "hidden", clip: "rect(0,0,0,0)", border: 0 } }, educatorViewOn ? t("research_hub.educator_view_on") || "Educator view" : activeLane ? activeLane.label : t("research_hub.method_selector_title") || "Choose an inquiry approach"), showExitHint && /* @__PURE__ */ React.createElement("div", { "data-research-exit-hint": "true", role: "status", "aria-live": "polite", style: { display: "flex", alignItems: "center", gap: "10px", padding: "9px 12px", borderRadius: "12px", border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1e3a8a" } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true", style: { fontSize: "16px" } }, "\u{1F4BE}"), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, fontSize: "11px", lineHeight: 1.5 } }, /* @__PURE__ */ React.createElement("strong", null, "Your Research Hub stayed open."), " Clicking outside no longer closes it, so downloads, resource packs, and saved files are less likely to interrupt your work. Use Close or press Escape when you are finished."), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: function() {
              setShowExitHint(false);
            }, "aria-label": "Dismiss saved-work reminder", style: { border: "1px solid #bfdbfe", borderRadius: "8px", background: "#fff", color: "#1e40af", padding: "5px 8px", fontSize: "10px", fontWeight: 800, cursor: "pointer" } }, "Got it")), journal.loadWarning && /* @__PURE__ */ React.createElement("div", { role: "alert", "data-research-recovery-warning": "true", style: { padding: "12px 14px", borderRadius: "12px", border: "1px solid #f59e0b", background: "#fffbeb", color: "#78350f" } }, /* @__PURE__ */ React.createElement("strong", null, "Read-only recovery mode"), /* @__PURE__ */ React.createElement("p", { style: { margin: "4px 0 8px", fontSize: "11px", lineHeight: 1.5 } }, journal.loadWarning), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: downloadRecoveryCopy, style: { minHeight: "44px", padding: "7px 11px", borderRadius: "9px", border: "1px solid #d97706", background: "#fff", color: "#92400e", fontWeight: 800, cursor: "pointer" } }, "Download untouched recovery copy")), pendingCapture && /* @__PURE__ */ React.createElement("section", { "data-research-capture-review": "true", "aria-labelledby": "research-capture-review-title", style: { padding: "14px", borderRadius: "15px", border: "2px solid #0d9488", background: "linear-gradient(135deg,#f0fdfa,#ffffff)" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "9px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.6px", color: "#0f766e" } }, "Tool artifact awaiting your approval"), /* @__PURE__ */ React.createElement("h3", { id: "research-capture-review-title", style: { margin: "3px 0 0", fontSize: "15px", color: "#134e4a" } }, pendingCapture.title), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "3px", fontSize: "10px", color: "#475569" } }, pendingCapture.sourceToolName + " \xB7 " + pendingCapture.artifactKind)), /* @__PURE__ */ React.createElement("span", { style: { fontSize: "9px", fontWeight: 900, color: "#0f766e" } }, readCaptureInbox().length + " queued")), /* @__PURE__ */ React.createElement("p", { style: { margin: "9px 0 0", fontSize: "11px", lineHeight: 1.55, color: "#334155" } }, pendingCapture.summary), pendingCapture.privacyFindings && pendingCapture.privacyFindings.length > 0 && /* @__PURE__ */ React.createElement("div", { "data-capture-privacy-findings": "true", style: { marginTop: "8px", padding: "7px 9px", borderRadius: "9px", background: "#f5f3ff", border: "1px solid #c4b5fd", fontSize: "10px", color: "#5b21b6" } }, /* @__PURE__ */ React.createElement("strong", null, "Automated privacy checks:"), " ", pendingCapture.privacyFindings.map(function(finding) {
              return finding.code + (finding.count ? " \xD7" + finding.count : "");
            }).join(" \xB7 ")), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "8px", padding: "8px 10px", borderRadius: "9px", background: "#ecfeff", fontSize: "10px", color: "#155e75" } }, /* @__PURE__ */ React.createElement("strong", null, "Privacy/provenance:"), " ", pendingCapture.provenance && pendingCapture.provenance.privacy || "No raw files or direct identifiers included."), pendingCapture.integrationContract ? /* @__PURE__ */ React.createElement("details", { "data-capture-integration-contract": "true", style: { marginTop: "8px", padding: "7px 9px", borderRadius: "9px", border: "1px solid #99f6e4", background: "#f0fdfa", fontSize: "10px", color: "#134e4a" } }, /* @__PURE__ */ React.createElement("summary", { style: { cursor: "pointer", fontWeight: 900 } }, "Tool contract & reproducibility receipt \xB7 ", pendingCapture.reproducibilityReceipt && pendingCapture.reproducibilityReceipt.status || "missing"), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "6px", display: "grid", gap: "3px" } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("strong", null, "Declared version:"), " ", pendingCapture.integrationContract.version || pendingCapture.sourceToolVersion || "unknown"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("strong", null, "License:"), " ", pendingCapture.integrationContract.license && (pendingCapture.integrationContract.license.spdx || pendingCapture.integrationContract.license.name) || "not declared"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("strong", null, "Citation guidance:"), " ", pendingCapture.integrationContract.citation && pendingCapture.integrationContract.citation.text || "not declared"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("strong", null, "Supported approaches:"), " ", (pendingCapture.integrationContract.supportedMethodPacks || []).join(", ") || "not declared"), pendingCapture.reproducibilityReceipt && pendingCapture.reproducibilityReceipt.missingFields && pendingCapture.reproducibilityReceipt.missingFields.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { color: "#92400e" } }, /* @__PURE__ */ React.createElement("strong", null, "Receipt gaps:"), " ", pendingCapture.reproducibilityReceipt.missingFields.join(", ")), pendingCapture.reproducibilityReceipt && pendingCapture.reproducibilityReceipt.limitations && pendingCapture.reproducibilityReceipt.limitations.length > 0 && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("strong", null, "Declared limitations:"), " ", pendingCapture.reproducibilityReceipt.limitations.join(" \xB7 ")))) : /* @__PURE__ */ React.createElement("div", { "data-capture-unregistered-warning": "true", style: { marginTop: "8px", padding: "7px 9px", borderRadius: "9px", border: "1px solid #fcd34d", background: "#fffbeb", fontSize: "10px", color: "#92400e" } }, /* @__PURE__ */ React.createElement("strong", null, "Unregistered integration:"), " no versioned contract, license, citation, or tool-specific receipt requirements were provided. Review carefully before approval."), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "10px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: "10px" } }, /* @__PURE__ */ React.createElement("label", { style: { fontSize: "10px", fontWeight: 800, color: "#334155" } }, "What do you notice or infer? ", /* @__PURE__ */ React.createElement("span", { style: { color: "#b91c1c" } }, "(required)"), /* @__PURE__ */ React.createElement("textarea", { value: captureNote, onChange: function(e) {
              setCaptureNote(e.target.value.slice(0, 2e3));
            }, rows: 3, maxLength: 2e3, style: { display: "block", width: "100%", marginTop: "4px", border: "1px solid #94a3b8", borderRadius: "8px", padding: "8px", font: "inherit", fontSize: "11px" } })), /* @__PURE__ */ React.createElement("label", { style: { fontSize: "10px", fontWeight: 800, color: "#334155" } }, "What remains uncertain or needs another source?", /* @__PURE__ */ React.createElement("textarea", { value: captureUncertainty, onChange: function(e) {
              setCaptureUncertainty(e.target.value.slice(0, 2e3));
            }, rows: 3, maxLength: 2e3, style: { display: "block", width: "100%", marginTop: "4px", border: "1px solid #94a3b8", borderRadius: "8px", padding: "8px", font: "inherit", fontSize: "11px" } }))), /* @__PURE__ */ React.createElement("label", { style: { marginTop: "9px", display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "10px", color: "#334155" } }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: captureAsEvidence, onChange: function(e) {
              setCaptureAsEvidence(e.target.checked);
            } }), "Also create an evidence card linked to this tool artifact."), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "11px", display: "flex", justifyContent: "flex-end", gap: "8px", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: dismissPendingCapture, style: { minHeight: "44px", padding: "7px 12px", borderRadius: "9px", border: "1px solid #94a3b8", background: "#fff", color: "#334155", fontWeight: 800, cursor: "pointer" } }, "Dismiss artifact"), /* @__PURE__ */ React.createElement("button", { type: "button", "data-capture-consent": "true", disabled: captureNote.trim().length < 12, onClick: acceptPendingCapture, style: { minHeight: "44px", padding: "7px 12px", borderRadius: "9px", border: 0, background: captureNote.trim().length >= 12 ? "#0f766e" : "#cbd5e1", color: "#fff", fontWeight: 900, cursor: captureNote.trim().length >= 12 ? "pointer" : "not-allowed" } }, "Approve and save to portfolio"))), "            ", /* @__PURE__ */ React.createElement(
              "section",
              {
                "data-research-command": "true",
                "aria-labelledby": "research-command-title",
                style: {
                  overflow: "hidden",
                  borderRadius: "16px",
                  border: "1px solid #c7d2fe",
                  background: "linear-gradient(135deg, #eef2ff 0%, #ffffff 52%, #f0fdfa 100%)",
                  boxShadow: "0 8px 24px rgba(67,56,202,0.08)"
                }
              },
              /* @__PURE__ */ React.createElement("div", { style: { padding: "16px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: "16px" } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "10px", fontWeight: 900, letterSpacing: "1.4px", textTransform: "uppercase", color: "#4f46e5" } }, "Inquiry command center"), /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true", style: { fontSize: "9px", fontWeight: 800, color: saveStatus === "saved" ? "#047857" : "#1d4ed8" } }, saveStatus === "saved" ? "\u2713 Saved" : "\u2022 Saving...")), /* @__PURE__ */ React.createElement("h3", { id: "research-command-title", style: { margin: "4px 0 0", fontSize: "18px", fontWeight: 900, color: "#0f172a" } }, researchNextMove), /* @__PURE__ */ React.createElement("p", { style: { margin: "5px 0 0", fontSize: "11px", lineHeight: 1.55, color: "#475569" } }, "Your journal travels across every lane. Change lenses without losing evidence, models, sources, or revisions."), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "12px", height: "8px", borderRadius: "999px", overflow: "hidden", background: "#e0e7ff" }, role: "progressbar", "aria-label": "Inquiry progress", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": researchProgress }, /* @__PURE__ */ React.createElement("div", { style: { width: researchProgress + "%", height: "100%", borderRadius: "999px", background: "linear-gradient(90deg,#4f46e5,#14b8a6)", transition: "width 180ms ease" } })), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "8px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(100px,1fr))", gap: "6px" } }, researchMilestones.map(function(step, index) {
                return /* @__PURE__ */ React.createElement("div", { key: step.label, style: { fontSize: "9px", fontWeight: 800, color: step.complete ? "#047857" : "#64748b" } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, step.complete ? "\u2713" : index + 1, " "), step.label);
              }))), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: "8px" } }, [
                { label: "Evidence", value: (journal.evidenceCards || []).length },
                { label: "Sources", value: (journal.sources || []).length },
                { label: "Idea versions", value: (journal.modelSnapshots || []).length + (journal.framings || []).length + (journal.candidateConcepts || []).length },
                { label: "Revisions", value: (journal.loopBacks || []).length }
              ].map(function(metric) {
                return /* @__PURE__ */ React.createElement("div", { key: metric.label, style: { borderRadius: "12px", border: "1px solid #ffffff", background: "rgba(255,255,255,0.88)", padding: "10px", boxShadow: "0 2px 8px rgba(15,23,42,0.05)" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "18px", fontWeight: 900, color: "#1e293b" } }, metric.value), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "9px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b" } }, metric.label));
              })))
            ), /* @__PURE__ */ React.createElement("div", { style: {
              padding: "12px 14px",
              borderRadius: "12px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              display: "flex",
              flexDirection: "column",
              gap: "8px"
            } }, /* @__PURE__ */ React.createElement(
              "label",
              {
                htmlFor: "research-hub-question-title",
                style: { fontSize: "12px", fontWeight: 800, color: "#1e293b" }
              },
              /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u2728 "),
              t("research_hub.question_label") || "What are you investigating?"
            ), /* @__PURE__ */ React.createElement("p", { id: "research-hub-question-help", style: { margin: 0, fontSize: "11px", color: "#64748b", lineHeight: 1.5 } }, t("research_hub.question_help") || "A few words in your own voice. You can change this any time as your question evolves \u2014 loops are first-class here."), /* @__PURE__ */ React.createElement(
              "textarea",
              {
                id: "research-hub-question-title",
                "aria-describedby": "research-hub-question-help",
                "data-help-key": "research_hub_question",
                value: journal.questionTitle,
                onChange: function(e) {
                  setQuestionTitle(e.target.value);
                },
                placeholder: t("research_hub.question_placeholder") || 'e.g., "Why do the fish in fisherlab cluster at dawn?" or "How should our town respond to noise complaints?"',
                rows: 2,
                maxLength: 240,
                style: {
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "8px 10px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  fontFamily: "inherit",
                  fontSize: "13px",
                  resize: "vertical",
                  minHeight: "50px"
                }
              }
            ), /* @__PURE__ */ React.createElement("div", { "data-research-question-coach": "true", style: { display: "flex", flexDirection: "column", gap: "8px" } }, !researchQuestionText && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { marginBottom: "6px", fontSize: "10px", fontWeight: 800, color: "#475569" } }, "Need a starting shape? Choose a stem, then make it yours."), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: "6px" }, role: "group", "aria-label": "Inquiry question starters" }, [
              "What patterns do you notice in ",
              "How might we improve ",
              "Why does this change when ",
              "Whose perspectives are missing from "
            ].map(function(stem) {
              return /* @__PURE__ */ React.createElement("button", { key: stem, type: "button", onClick: function() {
                setQuestionTitle(stem);
              }, style: { border: "1px solid #c7d2fe", borderRadius: "999px", background: "#eef2ff", color: "#3730a3", padding: "5px 9px", fontSize: "10px", fontWeight: 800, cursor: "pointer" } }, stem.trim() + "...");
            }))), researchQuestionText && /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: "10px", alignItems: "center", borderRadius: "10px", background: researchQuestionReady === researchQuestionSignals.length ? "#ecfdf5" : "#ffffff", border: "1px solid " + (researchQuestionReady === researchQuestionSignals.length ? "#a7f3d0" : "#e2e8f0"), padding: "8px 10px" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: "5px" } }, researchQuestionSignals.map(function(signal) {
              return /* @__PURE__ */ React.createElement("span", { key: signal.label, style: { borderRadius: "999px", padding: "3px 7px", fontSize: "9px", fontWeight: 800, background: signal.met ? "#d1fae5" : "#f1f5f9", color: signal.met ? "#047857" : "#64748b" } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, signal.met ? "\u2713 " : "\u25CB "), signal.label);
            })), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "right", whiteSpace: "nowrap" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "11px", fontWeight: 900, color: researchQuestionReady === 4 ? "#047857" : "#4338ca" } }, researchQuestionReady === 4 ? "Ready to investigate" : researchQuestionReady + "/4 signals"), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "1px", fontSize: "9px", color: "#64748b" } }, researchQuestionWords + " words - " + researchQuestionText.length + "/240 characters"))))), /* @__PURE__ */ React.createElement("div", { style: {
              padding: "10px 12px",
              borderRadius: "12px",
              background: "#fffbeb",
              border: "1px solid #fcd34d",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap"
            } }, /* @__PURE__ */ React.createElement(SuggestionBadge, { t }), /* @__PURE__ */ React.createElement("p", { style: { margin: 0, fontSize: "11px", color: "#78350f", lineHeight: 1.5, flex: 1, minWidth: "200px" } }, t("research_hub.ai_convention_banner") || "AlloBot helps by asking questions and surfacing alternatives. It will not write your model, your hypothesis, your argument, or your trade-off decisions for you. You author your work; AlloBot critiques.")), educatorViewOn && educatorView && isTeacherMode ? /* @__PURE__ */ React.createElement(
              EducatorViewShell,
              {
                t,
                journal,
                onExit: function() {
                  setEducatorViewOn(false);
                },
                educatorView,
                primitives: {
                  SuggestionBadge,
                  ExemplarPair,
                  VoiceNoteBlock,
                  CostMeter,
                  DevLevelSelector
                },
                constants: {
                  MAX_AI_CALLS_PER_SESSION,
                  ANSWER_HARD_CAP,
                  VOICE_NOTE_MAX_SECONDS
                }
              }
            ) : (
              /* Lane selector OR active-lane workspace */
              !activeLane ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("h3", { style: { margin: "4px 0 0", fontSize: "14px", fontWeight: 800, color: "#1e293b" } }, t("research_hub.method_selector_title") || "Choose an inquiry approach (switch any time)"), /* @__PURE__ */ React.createElement("p", { style: { margin: 0, fontSize: "12px", color: "#475569", lineHeight: 1.55 } }, t("research_hub.lane_selector_help") || "Six approaches open three connected workspaces. Your question, sources, evidence, voice notes, models, framings, and revision history stay together in one Inquiry Portfolio."), researchMethodMatch ? /* @__PURE__ */ React.createElement("div", { "data-research-lane-match": "true", style: { display: "flex", alignItems: "flex-start", gap: "10px", padding: "12px 14px", borderRadius: "14px", border: "1px solid #c7d2fe", background: "linear-gradient(90deg,#eef2ff,#f8fafc)", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true", style: { fontSize: "24px" } }, researchMethodMatch.icon), /* @__PURE__ */ React.createElement("div", { style: { flex: "1 1 260px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "10px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.8px", color: "#4f46e5" } }, "Possible approach match - based only on words in your question"), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "2px", fontSize: "13px", fontWeight: 900, color: "#1e293b" } }, researchMethodMatch.label), /* @__PURE__ */ React.createElement("p", { style: { margin: "3px 0 0", fontSize: "11px", lineHeight: 1.5, color: "#475569" } }, researchMethodMatch.reason), /* @__PURE__ */ React.createElement("p", { style: { margin: "3px 0 0", fontSize: "10px", color: "#64748b" } }, "This is not a verdict. Try another approach whenever a different method reveals something useful.")), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: function() {
                var pack = methodPackById(researchMethodMatch.packId);
                if (pack) selectMethodPack(pack.id);
              }, style: { flexShrink: 0, border: 0, borderRadius: "9px", background: "#4f46e5", color: "#fff", padding: "7px 10px", fontSize: "10px", fontWeight: 900, cursor: "pointer" } }, "Try this approach")) : researchQuestionText ? /* @__PURE__ */ React.createElement("div", { "data-research-lane-match": "true", style: { padding: "10px 12px", borderRadius: "12px", border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: "11px", color: "#475569" } }, /* @__PURE__ */ React.createElement("strong", null, "No single lens dominates."), " Choose the approach that matches what you want to do first; your Inquiry Portfolio will travel with you.") : null, /* @__PURE__ */ React.createElement("div", { style: {
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "12px"
              } }, METHOD_PACKS.map(function(pack) {
                var lane = lanes.filter(function(L) {
                  return L.id === pack.laneId;
                })[0];
                var selectedBefore = journal.activeMethodPack === pack.id;
                return /* @__PURE__ */ React.createElement(
                  "button",
                  {
                    key: pack.id,
                    type: "button",
                    "data-research-method-pack": pack.id,
                    "data-research-lane": pack.laneId,
                    "data-help-key": "research_hub_method_" + pack.id,
                    onClick: function() {
                      selectMethodPack(pack.id);
                    },
                    "aria-label": "Open " + pack.label + " inquiry approach",
                    style: {
                      padding: "16px",
                      borderRadius: "14px",
                      border: "1px solid " + pack.border,
                      background: pack.background,
                      textAlign: "left",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      transition: "transform 0.15s, box-shadow 0.15s"
                    },
                    onMouseEnter: function(e) {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
                    },
                    onMouseLeave: function(e) {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }
                  },
                  /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "10px" } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true", style: { fontSize: "30px" } }, pack.icon), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("h4", { style: { margin: 0, fontSize: "14px", fontWeight: 800, color: "#1e293b" } }, pack.label), researchMethodMatch && researchMethodMatch.packId === pack.id && /* @__PURE__ */ React.createElement("span", { style: { borderRadius: "999px", padding: "2px 6px", background: "#4f46e5", color: "#fff", fontSize: "8px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.4px" } }, "Approach match"), selectedBefore && /* @__PURE__ */ React.createElement("span", { style: { borderRadius: "999px", padding: "2px 6px", background: "#dcfce7", color: "#166534", fontSize: "8px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.4px" } }, "Current approach")), /* @__PURE__ */ React.createElement("p", { style: { margin: "2px 0 0", fontSize: "10px", fontWeight: 800, color: pack.color } }, pack.family))),
                  /* @__PURE__ */ React.createElement("p", { style: { margin: 0, fontSize: "12px", color: "#475569", lineHeight: 1.5 } }, pack.blurb),
                  /* @__PURE__ */ React.createElement("div", { style: { padding: "8px 9px", borderRadius: "9px", background: "rgba(255,255,255,0.78)", border: "1px solid " + pack.border } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "9px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.45px", color: pack.color } }, "What rigor looks like"), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "2px", fontSize: "10px", lineHeight: 1.45, color: "#475569" } }, pack.rigor)),
                  /* @__PURE__ */ React.createElement("div", { style: { marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: "10px", fontWeight: 800, color: "#64748b" } }, pack.bestFor), /* @__PURE__ */ React.createElement("span", { style: { fontSize: "10px", fontWeight: 900, color: pack.color } }, "Open approach ", "\u2192")),
                  lane && lane._placeholder && /* @__PURE__ */ React.createElement("span", { style: {
                    alignSelf: "flex-start",
                    padding: "3px 8px",
                    borderRadius: "999px",
                    fontSize: "10px",
                    fontWeight: 800,
                    background: "#fef3c7",
                    color: "#92400e",
                    border: "1px solid #fbbf24",
                    textTransform: "uppercase",
                    letterSpacing: "0.4px"
                  } }, t("research_hub.lane_coming_soon") || "Failed to load")
                );
              }))) : activeLane._placeholder ? /* @__PURE__ */ React.createElement(PlaceholderLaneView, { t, lane: activeLane, onBack: function() {
                setActiveLane(null);
              } }) : /* @__PURE__ */ React.createElement(
                ActiveLaneView,
                {
                  t,
                  lane: activeLane,
                  journal,
                  setJournal,
                  ask,
                  onBack: function() {
                    setActiveLane(null);
                  },
                  deps: props
                }
              )
            ), /* @__PURE__ */ React.createElement("details", { style: {
              padding: "12px 14px",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              background: "#f8fafc"
            } }, /* @__PURE__ */ React.createElement("summary", { style: { cursor: "pointer", fontSize: "12px", fontWeight: 800, color: "#1e293b" } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F3A4} "), t("research_hub.scratch_voice_summary") || "Open a voice scratchpad"), /* @__PURE__ */ React.createElement("p", { style: { margin: "8px 0", fontSize: "11px", color: "#64748b", lineHeight: 1.55 } }, t("research_hub.scratch_voice_help") || "Talk through your thinking. Voice notes live in your inquiry journal and survive across stages and lanes."), /* @__PURE__ */ React.createElement(
              VoiceNoteBlock,
              {
                t,
                initialBase64: journal.stageNotes && journal.stageNotes.scratch && journal.stageNotes.scratch.audioBase64,
                initialDuration: journal.stageNotes && journal.stageNotes.scratch && journal.stageNotes.scratch.durationS || 0,
                onChange: function(v) {
                  setJournal(function(prev) {
                    var next = Object.assign({}, prev);
                    next.stageNotes = Object.assign({}, prev.stageNotes || {});
                    next.stageNotes.scratch = { text: "", audioBase64: v.audioBase64, durationS: v.durationS, ts: Date.now() };
                    return next;
                  });
                },
                label: t("research_hub.scratch_voice_label") || "Scratchpad voice note"
              }
            )), /* @__PURE__ */ React.createElement("details", { "data-research-backpack": "true", "data-inquiry-portfolio": "true", style: {
              borderRadius: "16px",
              overflow: "hidden",
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              boxShadow: "0 4px 14px rgba(15,23,42,0.05)"
            } }, /* @__PURE__ */ React.createElement("summary", { style: { cursor: "pointer", padding: "12px 14px", listStylePosition: "inside", background: "linear-gradient(90deg,#f8fafc,#eef2ff)" } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true", style: { fontSize: "16px" } }, "\u{1F392} "), /* @__PURE__ */ React.createElement("span", { style: { fontSize: "12px", fontWeight: 900, color: "#1e293b" } }, t("research_hub.journal_state_summary") || "Inquiry Portfolio"), /* @__PURE__ */ React.createElement("span", { "data-research-save-status": "true", role: "status", "aria-live": "polite", style: { marginLeft: "8px", borderRadius: "999px", padding: "3px 7px", background: saveStatus === "saved" ? "#d1fae5" : saveStatus === "read-only" ? "#fef3c7" : "#dbeafe", color: saveStatus === "saved" ? "#047857" : saveStatus === "read-only" ? "#92400e" : "#1d4ed8", fontSize: "9px", fontWeight: 900 } }, saveStatus === "saved" ? "Saved on this device" : saveStatus === "read-only" ? "Read-only recovery" : saveStatus === "save unavailable" ? "Save unavailable" : "Saving latest changes..."), /* @__PURE__ */ React.createElement("span", { style: { marginLeft: "8px", fontSize: "10px", color: "#64748b" } }, researchProgress + "% inquiry progress")), /* @__PURE__ */ React.createElement("div", { style: { padding: "14px", borderTop: "1px solid #e2e8f0" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: "8px" } }, [
              { icon: "\u{1F4CC}", label: "Evidence", value: (journal.evidenceCards || []).length, detail: "observations and records" },
              { icon: "\u{1F9F0}", label: "Tool artifacts", value: (journal.capturedArtifacts || []).length, detail: "approved provenance captures" },
              { icon: "\u{1F9ED}", label: "Episodes", value: (journal.inquiryEpisodes || []).length, detail: "documented method shifts" },
              { icon: "\u{1F517}", label: "Sources", value: (journal.sources || []).length, detail: "sources logged" },
              { icon: "\u{1F4A1}", label: "Ideas", value: (journal.modelSnapshots || []).length + (journal.candidateConcepts || []).length + (journal.framings || []).length, detail: "models, concepts, framings" },
              { icon: "\u{1F4AC}", label: "Positions", value: (journal.claims || []).length + (journal.designClaims || []).length + (journal.compositions || []).length, detail: "claims and compositions" },
              { icon: "\u{1F504}", label: "Revisions", value: (journal.loopBacks || []).length, detail: "documented loop-backs" }
            ].map(function(item) {
              return /* @__PURE__ */ React.createElement("div", { key: item.label, style: { borderRadius: "12px", border: "1px solid #e2e8f0", background: "#f8fafc", padding: "10px" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true", style: { fontSize: "17px" } }, item.icon), /* @__PURE__ */ React.createElement("strong", { style: { fontSize: "18px", color: "#1e293b" } }, item.value)), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "3px", fontSize: "10px", fontWeight: 900, color: "#334155" } }, item.label), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "1px", fontSize: "9px", color: "#64748b" } }, item.detail));
            })), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "10px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "8px" } }, /* @__PURE__ */ React.createElement("div", { style: { borderRadius: "12px", border: "1px solid #e0e7ff", background: "#eef2ff", padding: "10px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "9px", fontWeight: 900, textTransform: "uppercase", color: "#4f46e5" } }, "Current context"), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "4px", fontSize: "11px", color: "#334155" } }, (DEV_LEVELS.filter(function(l) {
              return l.key === journal.devLevel;
            })[0] || { long: journal.devLevel }).long + " reading level - " + (activeMethodPack ? activeMethodPack.label + " / " : "") + (activeLane ? activeLane.label : "No workspace selected"))), /* @__PURE__ */ React.createElement("div", { style: { borderRadius: "12px", border: "1px solid #ccfbf1", background: "#f0fdfa", padding: "10px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "9px", fontWeight: 900, textTransform: "uppercase", color: "#0f766e" } }, "Portfolio continuity"), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "4px", fontSize: "11px", color: "#334155" } }, "Everything here travels with you when you switch inquiry approaches or workspaces.")), /* @__PURE__ */ React.createElement("div", { style: { borderRadius: "12px", border: "1px solid #fde68a", background: "#fffbeb", padding: "10px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "9px", fontWeight: 900, textTransform: "uppercase", color: "#b45309" } }, "AI questions"), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "4px", fontSize: "11px", color: "#334155" } }, (journal.aiCallCount || 0) + " of " + MAX_AI_CALLS_PER_SESSION + " used this session - your authored work is not counted."))), /* @__PURE__ */ React.createElement("div", { "data-research-storage-health": "true", style: { marginTop: "12px", padding: "9px 10px", borderRadius: "10px", border: "1px solid " + (storageHealth.status === "healthy" ? "#bfdbfe" : storageHealth.status === "warning" ? "#fcd34d" : "#fca5a5"), background: storageHealth.status === "healthy" ? "#eff6ff" : storageHealth.status === "warning" ? "#fffbeb" : "#fef2f2", fontSize: "10px", color: "#334155" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", gap: "8px" } }, /* @__PURE__ */ React.createElement("strong", null, "Local portfolio storage"), /* @__PURE__ */ React.createElement("span", null, storageHealth.percent, "% of the 4 MB AlloFlow safety budget")), /* @__PURE__ */ React.createElement("div", { role: "progressbar", "aria-label": "Research portfolio local storage", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": Math.min(100, storageHealth.percent), style: { marginTop: "5px", height: "6px", borderRadius: "999px", overflow: "hidden", background: "#e2e8f0" } }, /* @__PURE__ */ React.createElement("div", { style: { width: Math.min(100, storageHealth.percent) + "%", height: "100%", background: storageHealth.status === "healthy" ? "#2563eb" : storageHealth.status === "warning" ? "#d97706" : "#dc2626" } })), storageHealth.status !== "healthy" && /* @__PURE__ */ React.createElement("div", { style: { marginTop: "6px", color: storageHealth.status === "warning" ? "#92400e" : "#991b1b" } }, "Download the portfolio or artifact archive now. Large audio and tool artifacts can exceed browser storage even when the interface remains open."), saveStatus === "save unavailable" && /* @__PURE__ */ React.createElement("div", { role: "alert", style: { marginTop: "6px", color: "#991b1b", fontWeight: 900 } }, "The latest write failed. \u201CSaved\u201D is not being shown; download your portfolio before closing this page.")), legacyArtifacts.length > 0 && /* @__PURE__ */ React.createElement("details", { "data-legacy-artifact-repair": "true", style: { marginTop: "9px", borderRadius: "10px", border: "1px solid #fcd34d", background: "#fffbeb" } }, /* @__PURE__ */ React.createElement("summary", { style: { cursor: "pointer", padding: "9px 10px", fontSize: "10px", fontWeight: 900, color: "#92400e" } }, legacyArtifacts.length, " legacy tool artifact(s) need context"), /* @__PURE__ */ React.createElement("div", { style: { padding: "0 10px 10px", display: "grid", gap: "8px" } }, legacyArtifacts.map(function(artifact) {
              var draft = legacyDrafts[artifact.id] || "";
              return /* @__PURE__ */ React.createElement("div", { key: artifact.id, style: { padding: "8px", borderRadius: "8px", background: "#fff", border: "1px solid #fde68a" } }, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: "10px", color: "#78350f" } }, artifact.title || artifact.sourceToolName || "Legacy artifact"), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "3px", fontSize: "9px", color: "#92400e" } }, "Original contract, version, license, or receipt data was not recorded. Do not reconstruct it from memory."), artifact.legacyContextNote ? /* @__PURE__ */ React.createElement("div", { style: { marginTop: "5px", fontSize: "10px", color: "#475569" } }, /* @__PURE__ */ React.createElement("strong", null, "Learner-added context:"), " ", artifact.legacyContextNote) : /* @__PURE__ */ React.createElement("div", { style: { marginTop: "6px" } }, /* @__PURE__ */ React.createElement("textarea", { "aria-label": "Context for " + (artifact.title || "legacy artifact"), value: draft, onChange: function(e) {
                var value = e.target.value.slice(0, 2e3);
                setLegacyDrafts(function(prev) {
                  return Object.assign({}, prev, { [artifact.id]: value });
                });
              }, rows: 2, maxLength: 2e3, placeholder: "What do you know about how you used this output? Leave unknown original metadata unknown.", style: { width: "100%", boxSizing: "border-box", padding: "6px", borderRadius: "6px", border: "1px solid #d6d3d1", fontSize: "10px", fontFamily: "inherit" } }), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: draft.trim().length < 12, onClick: function() {
                saveLegacyArtifactContext(artifact.id);
              }, style: { marginTop: "5px", minHeight: "36px", padding: "5px 9px", borderRadius: "7px", border: 0, background: draft.trim().length >= 12 ? "#b45309" : "#cbd5e1", color: "#fff", fontWeight: 800, fontSize: "10px" } }, "Save learner context")));
            }))), "                ", /* @__PURE__ */ React.createElement("details", { "data-inquiry-evidence-audit": "true", open: inquiryAudit.status === "action_needed", style: { marginTop: "12px", borderRadius: "12px", border: "1px solid " + (inquiryAudit.status === "ready" ? "#86efac" : inquiryAudit.status === "action_needed" ? "#fca5a5" : "#fcd34d"), background: inquiryAudit.status === "ready" ? "#f0fdf4" : inquiryAudit.status === "action_needed" ? "#fef2f2" : "#fffbeb" } }, /* @__PURE__ */ React.createElement("summary", { style: { cursor: "pointer", padding: "10px 12px", fontSize: "11px", fontWeight: 900, color: "#334155" } }, "Argument & evidence audit: ", inquiryAudit.status === "ready" ? "ready" : inquiryAudit.counts.action + " action / " + inquiryAudit.counts.review + " review"), /* @__PURE__ */ React.createElement("div", { style: { padding: "0 12px 12px", fontSize: "10px", color: "#475569" } }, inquiryAudit.issues.length ? /* @__PURE__ */ React.createElement("ul", { style: { margin: 0, paddingLeft: "18px", display: "grid", gap: "4px" } }, inquiryAudit.issues.map(function(issue) {
              return /* @__PURE__ */ React.createElement("li", { key: issue.code }, /* @__PURE__ */ React.createElement("strong", null, issue.severity === "action" ? "Address:" : "Review:"), " ", issue.message);
            })) : /* @__PURE__ */ React.createElement("span", null, "No unsupported claims, unvetted linked sources, missing counterinterpretations, uninterpreted tool outputs, or incomplete reproducibility receipts were detected."), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "7px", fontStyle: "italic" } }, "This is a reasoning check, not an automatic grade. The portfolio export includes the audit and integration-health receipt."))), /* @__PURE__ */ React.createElement(EvidenceGraphView, { graph: evidenceGraph, onDownloadGraph: downloadEvidenceGraph, onDownloadAnnotations: downloadWebAnnotations, onDownloadCitations: downloadCslCitations, onDownloadRoCrate: downloadRoCrate, onDownloadBundle: downloadInteroperabilityBundle }), "                ", integrationHealth.total > 0 && /* @__PURE__ */ React.createElement("div", { "data-integration-health-summary": "true", style: { marginTop: "8px", padding: "8px 10px", borderRadius: "10px", background: "#f8fafc", border: "1px solid #cbd5e1", fontSize: "10px", color: "#475569" } }, /* @__PURE__ */ React.createElement("strong", null, "Tool integration health:"), " ", integrationHealth.healthy, " healthy \xB7 ", integrationHealth.needsReview, " review \xB7 ", integrationHealth.actionNeeded, " action needed."), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "12px", display: "flex", justifyContent: "flex-end", gap: "8px", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: downloadToolArtifactArchive, disabled: !(journal.capturedArtifacts || []).length, style: { minHeight: "44px", padding: "7px 12px", borderRadius: "10px", background: "#fff", border: "1px solid #0d9488", color: "#0f766e", fontWeight: 800, fontSize: "10px", cursor: (journal.capturedArtifacts || []).length ? "pointer" : "not-allowed" } }, "Download artifact archive"), artifactArchiveReady && /* @__PURE__ */ React.createElement("button", { type: "button", "data-remove-downloaded-artifacts": "true", onClick: removeDownloadedToolArtifacts, style: { minHeight: "44px", padding: "7px 12px", borderRadius: "10px", background: "#fff7ed", border: "1px solid #ea580c", color: "#9a3412", fontWeight: 900, fontSize: "10px", cursor: "pointer" } }, "Remove downloaded artifacts from this device"), "                  ", /* @__PURE__ */ React.createElement("button", { type: "button", onClick: downloadInquiryPortfolio, style: { minHeight: "44px", padding: "7px 12px", borderRadius: "10px", background: "#fff", border: "1px solid #818cf8", color: "#4338ca", fontWeight: 800, fontSize: "10px", cursor: "pointer" } }, "Download portfolio + provenance"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: requestClearJournal, style: { minHeight: "44px", padding: "7px 12px", borderRadius: "10px", background: "#fff", border: "1px solid #fca5a5", color: "#b91c1c", fontWeight: 800, fontSize: "10px", cursor: "pointer" } }, t("research_hub.journal_reset") || "Reset this inquiry"))))),
            /* @__PURE__ */ React.createElement("div", { style: {
              padding: "12px 22px",
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
              flexWrap: "wrap",
              fontSize: "11px",
              color: "#64748b"
            } }, /* @__PURE__ */ React.createElement("span", null, t("research_hub.footer_persistence_note") || "Your Inquiry Portfolio is saved on this device. Switching codenames mid-investigation will show prior work \u2014 clear the inquiry above to start fresh."), /* @__PURE__ */ React.createElement("span", { style: { fontStyle: "italic" } }, t("research_hub.footer_tier_note") || "Empirical \xB7 design \xB7 interpretive \xB7 qualitative \xB7 civic \xB7 creative inquiry.")),
            showResetConfirm && /* @__PURE__ */ React.createElement("div", { role: "presentation", style: { position: "fixed", inset: 0, zIndex: 70, background: "rgba(15,23,42,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" } }, /* @__PURE__ */ React.createElement(
              "div",
              {
                ref: resetDialogRef,
                role: "alertdialog",
                "aria-modal": "true",
                "aria-labelledby": "research-hub-reset-title",
                "aria-describedby": "research-hub-reset-description",
                onClick: function(event) {
                  event.stopPropagation();
                },
                onKeyDown: function(event) {
                  event.stopPropagation();
                  if (event.key === "Escape") {
                    event.preventDefault();
                    closeResetDialog();
                    return;
                  }
                  if (event.key !== "Tab") return;
                  var focusable = Array.from(event.currentTarget.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
                  if (!focusable.length) {
                    event.preventDefault();
                    return;
                  }
                  var first = focusable[0], last = focusable[focusable.length - 1];
                  if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                  } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                  }
                },
                style: { width: "100%", maxWidth: "440px", background: "#fff", borderRadius: "16px", padding: "24px", boxShadow: "0 25px 60px rgba(0,0,0,0.35)" }
              },
              /* @__PURE__ */ React.createElement("h3", { id: "research-hub-reset-title", style: { margin: 0, color: "#7f1d1d", fontSize: "18px" } }, t("research_hub.reset_title") || "Reset this inquiry?"),
              /* @__PURE__ */ React.createElement("p", { id: "research-hub-reset-description", style: { margin: "12px 0 0", color: "#334155", lineHeight: 1.55 } }, t("research_hub.confirm_reset") || "All portfolio artifacts, sources, voice notes, method episodes, models, and AI history will be cleared. This cannot be undone."),
              /* @__PURE__ */ React.createElement("div", { style: { marginTop: "24px", display: "flex", justifyContent: "flex-end", gap: "12px", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("button", { type: "button", "data-safe-default": "true", onClick: closeResetDialog, style: { minHeight: "44px", padding: "8px 16px", borderRadius: "8px", border: "1px solid #94a3b8", background: "#fff", color: "#334155", fontWeight: 700 } }, t("common.cancel") || "Cancel"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: confirmClearJournal, style: { minHeight: "44px", padding: "8px 16px", borderRadius: "8px", border: 0, background: "#b91c1c", color: "#fff", fontWeight: 700 } }, t("research_hub.journal_reset") || "Reset this inquiry"))
            ))
          )
        );
      }
      function EducatorViewShell(props) {
        var t = props.t;
        var journal = props.journal;
        var onExit = props.onExit;
        var educatorView = props.educatorView;
        var ctx = {
          t,
          journal,
          primitives: props.primitives || {},
          constants: props.constants || {},
          onExit
        };
        if (educatorView && typeof educatorView.render === "function") {
          try {
            return educatorView.render(ctx);
          } catch (e) {
            console.error("[ResearchHub] Educator view render error", e);
            return /* @__PURE__ */ React.createElement("div", { style: {
              padding: "14px",
              borderRadius: "12px",
              background: "#fef2f2",
              border: "1px solid #fca5a5",
              color: "#7f1d1d",
              fontSize: "12px"
            } }, t("research_hub.educator_view_error") || "The educator dashboard failed to render. Toggling back to student view.", /* @__PURE__ */ React.createElement("button", { type: "button", onClick: onExit, style: {
              marginLeft: "8px",
              textDecoration: "underline",
              background: "transparent",
              border: "none",
              color: "#7f1d1d",
              cursor: "pointer"
            } }, t("research_hub.educator_view_back") || "Exit educator view"));
          }
        }
        return /* @__PURE__ */ React.createElement("div", { style: {
          padding: "14px",
          borderRadius: "12px",
          background: "#fffbeb",
          border: "1px solid #fcd34d",
          color: "#92400e",
          fontSize: "12px"
        } }, t("research_hub.educator_view_missing") || "No educator view registered yet. Load research_hub_educator_module.js to enable.");
      }
      function ActiveLaneView(props) {
        var t = props.t;
        var lane = props.lane;
        var journal = props.journal;
        var setJournal = props.setJournal;
        var ask = props.ask;
        var onBack = props.onBack;
        var deps = props.deps || {};
        var ctx = {
          t,
          lane,
          journal,
          setJournal,
          ask,
          addToast: deps.addToast,
          primitives: {
            SuggestionBadge,
            ExemplarPair,
            VoiceNoteBlock,
            CostMeter
          },
          constants: {
            MAX_AI_CALLS_PER_SESSION,
            ANSWER_HARD_CAP,
            VOICE_NOTE_MAX_SECONDS
          },
          onExitLane: onBack
        };
        if (lane && typeof lane.render === "function") {
          try {
            return lane.render(ctx);
          } catch (e) {
            console.error("[ResearchHub] Lane render error in", lane.id, e);
            return /* @__PURE__ */ React.createElement("div", { style: {
              padding: "14px",
              borderRadius: "12px",
              background: "#fef2f2",
              border: "1px solid #fca5a5",
              color: "#7f1d1d",
              fontSize: "12px"
            } }, t("research_hub.lane_render_error") || "The selected lane failed to render. Going back to the lane selector.", /* @__PURE__ */ React.createElement("button", { type: "button", onClick: onBack, style: { marginLeft: "8px", textDecoration: "underline", background: "transparent", border: "none", color: "#7f1d1d", cursor: "pointer" } }, t("research_hub.back_to_lanes") || "Choose a different lane"));
          }
        }
        return /* @__PURE__ */ React.createElement(PlaceholderLaneView, { t, lane, onBack });
      }
      window.AlloModules = window.AlloModules || {};
      window.AlloModules.ResearchHub = ResearchHub;
      window.AlloModules.ResearchHub.__tier = 4;
      if (window.ResearchHub) {
        window.ResearchHub.primitives = {
          SuggestionBadge,
          ExemplarPair,
          VoiceNoteBlock,
          CostMeter,
          DevLevelSelector
        };
        window.ResearchHub.constants = {
          STORAGE_KEY,
          RECOVERY_STORAGE_KEY,
          CAPTURE_INBOX_KEY,
          TOOL_INTEGRATION_CONTRACT_VERSION,
          MAX_CAPTURE_INBOX_ITEMS,
          MAX_CAPTURES_PER_TOOL_PER_MINUTE,
          RESEARCH_STORAGE_SOFT_LIMIT_BYTES,
          MAX_AI_CALLS_PER_SESSION,
          VOICE_NOTE_MAX_SECONDS,
          DEV_LEVELS
        };
        window.ResearchHub.helpers = {
          isPlausibleProse,
          normalizeForCompare,
          tokenJaccard,
          MECHANISM_VERBS,
          PERSPECTIVE_MARKERS_RE,
          SHARED_STOP_WORDS,
          matchMethodPackForQuestion,
          normalizeResearchCapture,
          queueResearchCapture,
          registerCaptureSanitizer,
          enforceCapturePrivacy,
          captureFingerprint,
          researchStorageHealth,
          validateToolIntegrationContract,
          normalizeReproducibilityReceipt,
          assessResearchArtifactIntegration,
          summarizeIntegrationHealth,
          buildInquiryAudit,
          buildEvidenceGraph,
          buildW3CWebAnnotations,
          buildCslJson,
          buildRoCrate,
          buildInteroperabilityBundle,
          stampNewInquiryArtifacts,
          applyMethodPackSelection
        };
      }
      console.log("[CDN] ResearchHub loaded (Tier 4)");
    })();
  }
});
require_tmp_research_hub_entry();
