# AlloFlow Learning Web / Knowledge Graph Handoff

**Date:** 2026-07-31  
**Status:** Audit-to-ACG, visible Alignment Map, and shared standards-context layer implemented; local standards provider remains  
**Purpose:** Preserve the discussion about Learning Commons, the Knowledge Graph, Throughline, the curriculum audit, and a graph-guided “Surprise Me” lesson workflow.
**Implementation follow-up:** See [STANDARDS_CONTEXT_IMPLEMENTATION_HANDOFF.md](STANDARDS_CONTEXT_IMPLEMENTATION_HANDOFF.md) for the cross-path standards-context implementation and verification checklist.

## Executive summary

AlloFlow should not treat Learning Commons as another lesson generator. It should use the public Knowledge Graph as a structured educational grounding layer and build an AlloFlow-specific “Learning Web” on top of it.

The Learning Web would connect:

```text
standards → learning components → prerequisites → related concepts
          → curriculum resources → AlloFlow lessons → generated artifacts
          → assessment evidence → audit findings
```

The recommended product distinction is:

- **Full Lesson Pack:** source-first production. The teacher already has text, a topic, or a lesson and wants many resources generated from it.
- **Standards Finder:** alignment-first selection. The teacher searches for a standard and explores its context.
- **Surprise Me:** possibility-first discovery. The teacher has broad constraints but wants AlloFlow to propose worthwhile lesson directions before generating the pack.
- **Audit:** verification-first. The system checks whether the generated lesson actually addresses the selected standard, progression, curriculum source, UDL requirements, and assessment goal.
- **Throughline:** one visualization lens for sequence and unit structure, not the entire knowledge engine.

The existing Full Pack generation engine should be reused. “Surprise Me” should first create a graph-grounded Blueprint, then hand that Blueprint to the existing pack generator.

### Current implementation status

The shared ConceptGraphEngine now exposes fromAlignmentAudit(...), which projects existing AlloFlow standards audit reports into acg/v1 without changing saved lesson data. It preserves standard status, text/activity/assessment evidence, gaps, recommendations, dataset metadata, and provenance. The adapter deliberately does not infer authoritative artifact links from free-text evidence.

Throughline now uses the shared graph engine for its normal 2D semantic derivation while retaining its compatibility fallback. The next product-facing layer is a readable Alignment Map/evidence panel; the local Learning Commons snapshot/provider should follow that contract rather than introduce a separate graph shape.

## Key decisions and recommendations

### 1. Build a larger Learning Web engine

Current Throughline is a useful unit/storyline view, but it is too narrow to be the main abstraction. The better foundation is the existing generic graph engine in:

- `concept_graph_engine_module.js`
- `concept_graph_3d_module.js`

Throughline can become a view over the same graph, showing lesson sequence and prerequisite gates. Other views can show:

- standard context;
- prerequisite and progression neighborhoods;
- lesson-to-standard evidence;
- curriculum fidelity;
- generated resource relationships;
- gaps found by the audit.

### 2. Use Learning Commons locally first

Learning Commons provides public downloadable Knowledge Graph exports containing:

- `nodes.jsonl`;
- `relationships.jsonl`.

The public repository describes the data as graph-native and suitable for local querying, graph databases, or ordinary data pipelines. The Knowledge Graph code is MIT-licensed; the data includes CC BY 4.0 and CC0 components. Attribution and dataset-version metadata must be preserved.

Recommended initial strategy:

1. Download a specific public release.
2. Inventory its subjects, jurisdictions, node types, and relationship types.
3. Filter the data to the frameworks and relationships AlloFlow needs.
4. Convert it into compact JSON shards or a local SQLite/IndexedDB representation.
5. Host the versioned snapshot in the repository, a release asset, GitHub Pages, Cloudflare R2, or another CDN.
6. Record the dataset version and attribution inside each Blueprint and audit.

This avoids making every teacher request depend on a live API call.

### 3. Treat the Learning Commons API as optional

The current Learning Commons FAQ says developers can create a free Platform account, explore Knowledge Graph datasets, generate API keys, and use Evaluators. The API documentation requires an API key in the request header.

There is not yet a clear public rate card, quota schedule, production SLA, or guarantee of unlimited free usage. The repository README and current Platform documentation are also in transition regarding private-beta language. Therefore:

- basic account/API-key access appears to be free;
- production limits should be confirmed before depending on the API;
- API keys must remain server-side;
- local CDN data should remain the default fallback;
- an API or MCP refresh path can be added later.

The public local export and the live API should be treated as two interchangeable data providers behind one AlloFlow adapter.

### 4. Integrate the Knowledge Graph both upstream and downstream

The Knowledge Graph should not be used only at the end of generation.

**Upstream:**

- canonicalize the selected standard;
- retrieve official wording and identifiers;
- retrieve available learning components;
- retrieve prerequisites, related standards, and progression edges;
- put this evidence into the Blueprint before generation.

**Downstream:**

- compare the generated objective, activity, and assessment to the selected components;
- detect missing prerequisites;
- show which lesson artifacts provide evidence for each component;
- identify partial, unsupported, or unverified alignment;
- preserve the exact grounding snapshot used for the audit.

The first implementation should likely land in the audit because it is lower risk and uses an existing report surface. Once the evidence model is proven, use the same provider upstream during Blueprint creation.

## Current AlloFlow infrastructure to reuse

### Existing Full Pack generator

`generation_helpers_module.js` contains `handleGenerateFullPack`. It currently:

- starts from the latest analysis or input text;
- creates lesson DNA;
- optionally auto-configures the resource plan;
- generates resources sequentially;
- can produce analysis, glossary, simplified text, images, outline, sentence frames, FAQ, timeline, persona, concept sort, brainstorm, quiz, lesson plan, and adventure resources;
- places the lesson plan after the supporting resources so it can use their context.

This is the production engine that Surprise Me should call after discovery.

### Existing Blueprint layer

`agent_core_blueprint_service_module.js` and `agent_core_contracts_module.js` already support:

- standards;
- provenance;
- source policy;
- lesson DNA;
- resource plans;
- review and approval state.

The likely addition is a structured grounding field rather than replacing the existing free-text standards field.

Suggested shape:

```js
provenance: {
  standardsGrounding: {
    provider: "Learning Commons",
    datasetVersion: "v1.11.0",
    standards: [],
    learningComponents: [],
    relationships: [],
    sourceUrls: [],
    attribution: ""
  }
}
```

### Existing graph and Throughline surfaces

`concept_graph_engine_module.js` already provides the reusable `acg/v1` graph format, graph normalization, typed edges, lanes, projections, and an accessible linear outline.

`mind_map_module.js` is the current Throughline/unit builder. It already understands lesson nodes, sequence edges, prerequisite edges, lesson history, and unit sidecar persistence.

`concept_graph_3d_module.js` renders the shared graph format as an orbitable WebGL view and includes a non-3D accessible outline fallback.

The recommended change is not to replace these modules. It is to make them views over a larger graph model and add adapters for Knowledge Graph nodes and AlloFlow evidence nodes.

### Existing audit and verification

`view_alignment_report_module.js` already displays standards-alignment audit cards with:

- text alignment;
- activity alignment;
- assessment alignment;
- evidence quotes;
- gaps;
- recommendations.

`phase_k_helpers_module.js` contains deep factual verification using web search. That should remain useful for factual claims. Knowledge Graph data would add a separate standards/progression verification layer rather than replacing factual web search.

## Proposed data model

The Learning Web should distinguish external grounding data from AlloFlow-created content.

### External grounding nodes

- `standard`
- `standardsFramework`
- `learningComponent`
- `curriculumResource`
- `learningProgression`
- `sourceDocument`

### AlloFlow nodes

- `blueprint`
- `lesson`
- `artifact`
- `objective`
- `activity`
- `assessment`
- `auditFinding`

### Relationship types

- `contains`
- `prerequisiteOf`
- `relatedTo`
- `crosswalksTo`
- `alignedTo`
- `adaptedFrom`
- `evidencedBy`
- `assessedBy`
- `comesBefore`
- `generatedFor`

The system should not invent authoritative Knowledge Graph relationships. If AlloFlow infers a relationship from generated content, it should be labeled as an AlloFlow inference and remain distinguishable from a source-provided edge.

## “Surprise Me” product flow

Surprise Me should be a bounded discovery workflow, not a second Full Pack button.

### Teacher input

The teacher can provide any combination of:

- grade or grade band;
- subject;
- state or jurisdiction;
- selected standard, topic, or broad interest;
- time available;
- desired lesson type;
- phenomenon, text type, or real-world context;
- learner needs or UDL priorities;
- curriculum preference;
- novelty level.

### Graph-guided exploration

AlloFlow creates a filtered neighborhood around the input:

```text
selected standard
  → related learning components
  → prerequisites
  → adjacent/next standards
  → possible topics or phenomena
  → available curriculum/source links
```

AlloFlow then proposes two or three lesson directions. Each direction should show:

- title and central phenomenon;
- essential question;
- target standard;
- relevant prerequisite concepts;
- suggested activity;
- proposed evidence of learning;
- possible UDL supports;
- source links and confidence/coverage notes.

The teacher can accept, edit, combine, or reject directions. Only after that choice does AlloFlow create the Blueprint and run the Full Pack generation sequence.

### Product distinction

Full Pack asks:

> “What resources can I make from this source?”

Surprise Me asks:

> “What worthwhile lesson could I make inside this learning space?”

The final artifacts may overlap, but the user experience, input model, and value proposition are different.

## Standards Finder redesign

The standards finder should become a Knowledge Graph-backed entry point rather than an AI-generated standards suggestion box.

### Search behavior

Support searches by:

- standard code;
- topic or concept;
- grade;
- subject;
- state/jurisdiction;
- curriculum/resource name.

Search order:

1. local Knowledge Graph snapshot;
2. cached AlloFlow standards records;
3. official web search fallback;
4. user confirmation before treating a web result as canonical.

### Standard detail panel

When a standard is selected, show:

- official statement;
- framework and jurisdiction;
- grade and subject;
- source and license;
- available learning components;
- prerequisites;
- related or next standards;
- curriculum/resource connections;
- “Use in Blueprint” action;
- “Explore graph neighborhood” action.

The AI should receive the structured evidence pack, not only the standard’s text. The teacher should be able to inspect the same context through the graph view.

## Audit integration design

The audit should store and reuse a grounding snapshot rather than re-searching blindly after generation.

Example audit evidence:

```text
Target standard: [identifier]
Dataset version: [version]

Learning component 1: Pass
  Objective evidence: ...
  Activity evidence: ...
  Assessment evidence: ...

Learning component 2: Partial
  Objective evidence: ...
  Activity evidence: missing
  Assessment evidence: weak

Prerequisite warning:
  The lesson assumes [concept] but does not provide access or review.
```

The audit should distinguish:

- `Aligned`
- `Partially aligned`
- `Not aligned`
- `Not evaluated`
- `Source unavailable`
- `Inference only`

The report should link each finding to the relevant standard, graph edge, generated artifact, or source document.

## Hosting and update strategy

### Recommended local-first model

```text
Learning Commons public export
        ↓ controlled ingestion/update
AlloFlow normalized graph snapshot
        ↓
GitHub release / Cloudflare R2 / CDN
        ↓
Standards Finder, Learning Web, Blueprint, Audit
```

Required metadata:

- upstream dataset version;
- download date;
- source URLs;
- licenses;
- attribution statements;
- ingestion transform version;
- coverage inventory;
- known gaps.

Do not put Learning Commons API keys in browser code or public CDN assets.

### Optional hybrid model

Use the local snapshot for normal operation and call the API only when:

- a newer dataset is available;
- the selected framework is not in the snapshot;
- the teacher explicitly requests a live lookup;
- the product needs private-beta curriculum data.

## OpenSciEd and curriculum resources

OpenSciEd should be treated as a separate curriculum-resource layer, not assumed to be fully contained in the public Knowledge Graph.

AlloFlow should initially store:

- curriculum/provider name;
- unit and lesson identifiers;
- source URL;
- license and attribution;
- teacher-provided files or links;
- adaptation/fidelity status.

AlloFlow should generate original companion materials and adaptations while preserving attribution and source links. OpenSciEd’s current guidance includes attribution requirements, online-link requirements, human review of AI-generated materials, and restrictions on using curriculum materials to train AI models.

## Implementation plan

### Phase 0 — Inventory and data contract

- Download the current public Knowledge Graph JSONL export.
- Inventory subjects, states, grade levels, node labels, and edge types.
- Confirm how much science and progression data is actually present.
- Record licenses and attribution requirements.
- Define the normalized AlloFlow graph adapter.
- Define `standardsGrounding` in Blueprint provenance.

**Exit criterion:** We can answer exactly which Learning Commons datasets AlloFlow can support locally.

### Phase 1 — Local Knowledge Graph provider

- Add a build-time or update-time ingestion script.
- Filter and normalize the public data.
- Add a local provider interface such as:

```text
resolveStandard(query)
getStandardContext(id)
getLearningComponents(id)
getPrerequisites(id)
getRelatedStandards(id)
getDatasetManifest()
```

- Store dataset version and source metadata.
- Add tests for identifiers, relationships, filtering, and attribution.

**Exit criterion:** AlloFlow can resolve selected standards without an external API call.

### Phase 2 — Standards Finder context

- Replace or augment free-text standard entry with structured selection.
- Add standard detail/context drawer.
- Add “Use in Blueprint.”
- Preserve web search as fallback for unsupported or newer standards.

**Exit criterion:** A selected standard produces a reviewable structured grounding object.

### Phase 3 — Audit integration

- Feed the grounding snapshot into the existing alignment audit.
- Map lesson objectives, activities, and assessments to standard components.
- Add provenance, dataset version, graph-edge evidence, and coverage statuses.
- Keep factual web verification separate from standards verification.

**Exit criterion:** The audit can identify component-level alignment and missing prerequisites.

### Phase 4 — Learning Web views

- Adapt the normalized graph into `acg/v1`.
- Add a focused 2D neighborhood view first.
- Reuse Throughline for lesson/unit sequence view.
- Add the existing 3D renderer as an optional view.
- Ensure the accessible linear outline remains the source of truth.

**Exit criterion:** A teacher can move from a standard to related concepts, lessons, and evidence without opening separate tools.

### Phase 5 — Surprise Me

- Add graph-neighborhood filtering.
- Generate two or three lesson directions.
- Let the teacher pin/edit a direction.
- Create a Blueprint from the selected direction.
- Invoke the existing Full Pack generator.
- Attach the audit and grounding snapshot automatically.

**Exit criterion:** Surprise Me creates a meaningfully different discovery experience while reusing the existing resource-generation engine.

### Phase 6 — Optional live services and curriculum adapters

- Add server-side Learning Commons API refresh.
- Add optional MCP access.
- Add OpenSciEd resource catalog/import flow.
- Add curriculum-specific fidelity checks.
- Apply for private-beta curriculum datasets if valuable.

## Acceptance criteria for the first usable version

- A teacher can find a standard by code or topic.
- The selected standard has an official source and attribution.
- AlloFlow shows available related/prerequisite context.
- The selected context is stored in the Blueprint.
- Full Pack can generate from the Blueprint.
- The audit can show evidence for objective, activity, and assessment alignment.
- The app works from a local data snapshot without an API key.
- The graph view has a readable non-visual outline.
- The user can distinguish source-provided relationships from AlloFlow inferences.
- Dataset version and license information survive export.

## Open questions

1. Which public Knowledge Graph release should be the initial pinned snapshot?
2. How much science-specific progression/component data is present in that snapshot?
3. Should local data ship in the main repository, a release asset, or Cloudflare R2?
4. Should the graph engine store all nodes or only a filtered neighborhood around active Blueprints?
5. Which standard frameworks should be prioritized first: NGSS, CCSS, TEKS, or a specific pilot state?
6. Should “Surprise Me” generate one direction at a time or show a comparison card for three directions?
7. Which OpenSciEd units can be linked or imported under the intended AlloFlow distribution model?
8. What API rate limits and production terms apply to Learning Commons Platform accounts?
9. Should AlloFlow submit a private-beta request for curriculum-aligned datasets after the local standards proof of concept?

## Risks and guardrails

- Do not treat Knowledge Graph coverage as universal; display “not available” when a relationship is missing.
- Do not let a model invent authoritative prerequisite edges.
- Do not treat arbitrary web search results as canonical until the teacher confirms the source.
- Do not expose API keys in public browser/CDN code.
- Preserve dataset versions for audit reproducibility.
- Preserve Learning Commons and curriculum-provider attribution.
- Do not copy or train on restricted curriculum materials without permission.
- Keep teacher approval before generating or distributing a full resource pack.
- Keep the accessible linear outline available whenever a graph visualization is shown.

## Reference links

- [Learning Commons Knowledge Graph repository](https://github.com/learning-commons-org/knowledge-graph)
- [Knowledge Graph license](https://github.com/learning-commons-org/knowledge-graph/blob/main/LICENSE.md)
- [Learning Commons local-file quickstart](https://docs.learningcommons.org/knowledge-graph/using-knowledge-graph/local-files)
- [Learning Commons Knowledge Graph quickstart](https://docs.learningcommons.org/knowledge-graph/getting-started/quickstart)
- [Learning Commons API overview](https://docs.learningcommons.org/api-reference/platform-api/overview)
- [Learning Commons MCP documentation](https://docs.learningcommons.org/knowledge-graph/using-knowledge-graph/mcp-server)
- [Learning Commons FAQ](https://learningcommons.org/faq/)
- [Learning Commons Knowledge Graph roadmap](https://docs.learningcommons.org/knowledge-graph/understanding-knowledge-graph/roadmap)
- [OpenSciEd commercial and AI-use guidance](https://openscied.org/commercial-license/)
