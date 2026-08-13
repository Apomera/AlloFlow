/*
 * AlloFlow Lexical Graph -- sense-aware lexical relationships (LexicalGraph/v1).
 *
 * This module is deliberately renderer- and network-independent. It provides:
 *   - a strict, versioned local lexical snapshot contract;
 *   - exact lexeme resolution and bounded neighborhood traversal;
 *   - a deterministic, readable accessibility outline; and
 *   - an adapter into the shared acg/v1 graph without erasing lexical semantics.
 *
 * Lexical relationships are not interchangeable. In particular, translation
 * equivalence does not imply shared ancestry, and visual similarity does not
 * imply either. Consumers should display `relationType`, `label`, verification,
 * and provenance together rather than reducing every edge to "related".
 */
(function registerLexicalGraph(root, factory) {
    const api = factory(root || (typeof globalThis !== 'undefined' ? globalThis : {}));
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (root) {
        root.AlloModules = root.AlloModules || {};
        root.AlloModules.LexicalGraph = api;
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function createLexicalGraphModule() {
    'use strict';

    const VERSION = 'lexical-graph/v1';
    const SNAPSHOT_VERSION = 'alloflow-lexical-snapshot/v1';
    const OUTLINE_VERSION = 'lexical-outline/v1';
    const ACG_VERSION = 'acg/v1';
    const MAX_TEXT = 600;
    const MAX_ID = 240;
    const MAX_GRAPH_NODES = 60;
    const MAX_GRAPH_EDGES = 120;
    const MAX_DEPTH = 3;
    const MAX_SNAPSHOT_NODES = 500;
    const MAX_SNAPSHOT_EDGES = 1500;

    const NODE_TYPES = ['lexeme', 'sense', 'form', 'morpheme', 'etymon'];
    const RELATION_TYPES = [
        // Structural relation: connects an entry to a particular sense. It is
        // not a pedagogical claim such as cognacy or translation equivalence.
        'hasSense',
        'containsMorpheme',
        'inflectedFormOf',
        'derivedFrom',
        'borrowedFrom',
        'inheritedFrom',
        'cognateWith',
        'translationEquivalent',
        'semanticShiftFrom',
        'sharesRoot',
        'falseFriendOf',
        'sharesRime',
        'pronunciationSimilar'
    ];
    const VERIFICATION_TYPES = ['reviewed', 'source-backed', 'teacher-confirmed', 'ai-suggested', 'unverified'];
    const SYMMETRIC_RELATIONS = {
        cognateWith: true,
        translationEquivalent: true,
        sharesRoot: true,
        falseFriendOf: true,
        sharesRime: true,
        pronunciationSimilar: true
    };
    const RELATION_LABELS = {
        hasSense: 'has the sense',
        containsMorpheme: 'contains the morpheme',
        inflectedFormOf: 'is an inflected form of',
        derivedFrom: 'is derived from',
        borrowedFrom: 'was borrowed from',
        inheritedFrom: 'was inherited from',
        cognateWith: 'is cognate with',
        translationEquivalent: 'expresses the same sense as',
        semanticShiftFrom: 'developed by semantic shift from',
        sharesRoot: 'shares a root with',
        falseFriendOf: 'is a false friend of',
        sharesRime: 'shares a rime with',
        pronunciationSimilar: 'has a similar pronunciation to'
    };
    const RELATION_PRIORITY = {
        hasSense: 0,
        translationEquivalent: 1,
        containsMorpheme: 2,
        inflectedFormOf: 3,
        derivedFrom: 4,
        borrowedFrom: 5,
        inheritedFrom: 6,
        cognateWith: 7,
        sharesRoot: 8,
        falseFriendOf: 9,
        semanticShiftFrom: 10,
        sharesRime: 11,
        pronunciationSimilar: 12
    };
    const TYPE_PRIORITY = { lexeme: 0, sense: 1, morpheme: 2, etymon: 3, form: 4 };
    const LANGUAGE_NAMES = {
        en: 'English', fr: 'French', es: 'Spanish', la: 'Latin', frm: 'Middle French', fro: 'Old French'
    };
    const LANGUAGE_ALIASES = {
        en: 'en', eng: 'en', english: 'en', anglais: 'en', ingles: 'en', 'inglés': 'en',
        fr: 'fr', fra: 'fr', fre: 'fr', french: 'fr', francais: 'fr', 'français': 'fr', frances: 'fr', 'francés': 'fr',
        es: 'es', spa: 'es', spanish: 'es', espanol: 'es', 'español': 'es', espagnol: 'es',
        la: 'la', lat: 'la', latin: 'la', latino: 'la',
        frm: 'frm', 'middle french': 'frm', fro: 'fro', 'old french': 'fro'
    };
    const ACG_EDGE_TYPE = {
        hasSense: 'contains',
        containsMorpheme: 'contains',
        inflectedFormOf: 'elaborates',
        derivedFrom: 'relatedTo',
        borrowedFrom: 'relatedTo',
        inheritedFrom: 'relatedTo',
        cognateWith: 'associates',
        translationEquivalent: 'associates',
        semanticShiftFrom: 'relatedTo',
        sharesRoot: 'associates',
        falseFriendOf: 'contrast',
        sharesRime: 'associates',
        pronunciationSimilar: 'associates'
    };

    function isObject(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    function clone(value) {
        return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
    }

    function cleanText(value, limit) {
        if (value === null || value === undefined) return '';
        return String(value).replace(/\s+/g, ' ').trim().slice(0, limit || MAX_TEXT);
    }

    function rawTextWithinLimit(value, limit) {
        return value === null || value === undefined || String(value).length <= limit;
    }

    function normalizeToken(value) {
        const text = cleanText(value, MAX_TEXT).toLocaleLowerCase();
        return typeof text.normalize === 'function' ? text.normalize('NFKC') : text;
    }

    function foldToken(value) {
        const text = normalizeToken(value);
        return typeof text.normalize === 'function'
            ? text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
            : text;
    }

    function slug(value) {
        return foldToken(value).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
    }

    function normalizeLanguage(value) {
        const raw = normalizeToken(value).replace(/_/g, '-');
        if (!raw) return '';
        if (LANGUAGE_ALIASES[raw]) return LANGUAGE_ALIASES[raw];
        const base = raw.split('-')[0];
        return LANGUAGE_ALIASES[base] || (/^[a-z]{2,3}$/.test(base) ? base : '');
    }

    function languageName(value) {
        const code = normalizeLanguage(value) || cleanText(value, 40);
        return LANGUAGE_NAMES[code] || code.toUpperCase();
    }

    function makeLexemeId(language, lemma, entryKey) {
        const lang = normalizeLanguage(language);
        const word = slug(lemma);
        const entry = slug(entryKey || 'default');
        if (!lang || !word || !entry) throw new Error('Lexeme ids require a valid language, lemma, and entry key.');
        return `lex:${lang}:${word}:${entry}`;
    }

    function makeSenseId(lexemeId, senseKey) {
        const lexeme = cleanText(lexemeId, MAX_ID);
        const sense = slug(senseKey);
        if (!lexeme || !sense) throw new Error('Sense ids require a lexeme id and a stable sense key.');
        return `sense:${lexeme}:${sense}`;
    }

    function issue(code, path, message) {
        return { code, path, message };
    }

    function validId(value) {
        return typeof value === 'string'
            && value.length > 0
            && value.length <= MAX_ID
            && /^[A-Za-z0-9][A-Za-z0-9:._~-]*$/.test(value);
    }

    function validSourceUrl(value) {
        return typeof value === 'string' && /^https:\/\/[A-Za-z0-9.-]+(?:[\/:?#].*)?$/.test(value) && value.length <= 1000;
    }

    function expectedDirection(relationType) {
        return SYMMETRIC_RELATIONS[relationType] ? 'symmetric' : 'directed';
    }

    function validateManifest(manifest, path, errors) {
        if (!isObject(manifest)) {
            errors.push(issue('manifest-required', path, 'A dataset manifest is required.'));
            return;
        }
        ['provider', 'datasetVersion', 'snapshotId', 'license', 'attribution'].forEach((field) => {
            if (!cleanText(manifest[field], field === 'attribution' ? MAX_TEXT : 240)) {
                errors.push(issue(`manifest-${field}-required`, `${path}.${field}`, `${field} is required.`));
            }
        });
        if (manifest.reviewStatus !== 'reviewed') {
            errors.push(issue('manifest-review-required', `${path}.reviewStatus`, 'Local lexical snapshots must explicitly be reviewed.'));
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanText(manifest.reviewedAt, 20))) {
            errors.push(issue('manifest-reviewed-at-required', `${path}.reviewedAt`, 'reviewedAt must be an ISO calendar date.'));
        }
        if (!Array.isArray(manifest.sources) || manifest.sources.length === 0) {
            errors.push(issue('manifest-sources-required', `${path}.sources`, 'At least one source record is required.'));
        } else {
            const seen = new Set();
            manifest.sources.forEach((source, index) => {
                const sourcePath = `${path}.sources[${index}]`;
                if (!isObject(source) || !validId(source.id)) errors.push(issue('source-id-invalid', `${sourcePath}.id`, 'Source id is invalid.'));
                else if (seen.has(source.id)) errors.push(issue('source-id-duplicate', `${sourcePath}.id`, 'Source ids must be unique.'));
                else seen.add(source.id);
                if (!isObject(source) || !validSourceUrl(source.url)) errors.push(issue('source-url-invalid', `${sourcePath}.url`, 'Source URL must be an https URL.'));
                if (!isObject(source) || !cleanText(source.attribution, MAX_TEXT)) errors.push(issue('source-attribution-required', `${sourcePath}.attribution`, 'Source attribution is required.'));
                if (!isObject(source) || !cleanText(source.license, 240)) errors.push(issue('source-license-required', `${sourcePath}.license`, 'Source license is required.'));
            });
        }
    }

    function validateNode(node, path, errors) {
        if (!isObject(node)) {
            errors.push(issue('node-invalid', path, 'Node must be an object.'));
            return;
        }
        if (!validId(node.id)) errors.push(issue('node-id-invalid', `${path}.id`, 'Node id is missing or invalid.'));
        if (!NODE_TYPES.includes(node.type)) errors.push(issue('node-type-invalid', `${path}.type`, 'Unknown lexical node type.'));
        if (!cleanText(node.label, MAX_TEXT)) errors.push(issue('node-label-required', `${path}.label`, 'Node label is required.'));
        if (!rawTextWithinLimit(node.label, MAX_TEXT)) errors.push(issue('node-label-too-long', `${path}.label`, `Node label exceeds ${MAX_TEXT} characters.`));
        if (['lexeme', 'sense', 'form'].includes(node.type) && !normalizeLanguage(node.language)) {
            errors.push(issue('node-language-required', `${path}.language`, `${node.type} nodes require a language.`));
        }
        if (node.type === 'lexeme') {
            if (!cleanText(node.lemma, 240)) errors.push(issue('lexeme-lemma-required', `${path}.lemma`, 'Lexeme lemma is required.'));
            if (!cleanText(node.entryKey, 120)) errors.push(issue('lexeme-entry-key-required', `${path}.entryKey`, 'Lexeme entryKey is required to distinguish entries.'));
            if (!cleanText(node.partOfSpeech, 80)) errors.push(issue('lexeme-pos-required', `${path}.partOfSpeech`, 'Lexeme part of speech is required.'));
        }
        if (node.type === 'sense') {
            if (!validId(node.lexemeId)) errors.push(issue('sense-lexeme-required', `${path}.lexemeId`, 'Sense lexemeId is required.'));
            if (!cleanText(node.senseKey, 120)) errors.push(issue('sense-key-required', `${path}.senseKey`, 'Sense key is required.'));
            if (!cleanText(node.definition, MAX_TEXT)) errors.push(issue('sense-definition-required', `${path}.definition`, 'Sense definition is required.'));
        }
        if (node.type === 'form') {
            if (!validId(node.lexemeId)) errors.push(issue('form-lexeme-required', `${path}.lexemeId`, 'Form lexemeId is required.'));
            if (!cleanText(node.form, 240)) errors.push(issue('form-value-required', `${path}.form`, 'Inflected form is required.'));
            if (!cleanText(node.formType, 160)) errors.push(issue('form-type-required', `${path}.formType`, 'Form type is required.'));
        }
        if (node.type === 'morpheme') {
            if (!cleanText(node.notation, 160)) errors.push(issue('morpheme-notation-required', `${path}.notation`, 'Morpheme notation is required.'));
            if (!cleanText(node.meaning, MAX_TEXT)) errors.push(issue('morpheme-meaning-required', `${path}.meaning`, 'Morpheme meaning is required.'));
        }
        if (node.type === 'etymon') {
            if (!cleanText(node.historicalLanguage, 120)) errors.push(issue('etymon-language-required', `${path}.historicalLanguage`, 'Historical language is required.'));
            if (!cleanText(node.attestedForm, 240)) errors.push(issue('etymon-form-required', `${path}.attestedForm`, 'Historical or reconstructed form is required.'));
            if (!cleanText(node.gloss, MAX_TEXT)) errors.push(issue('etymon-gloss-required', `${path}.gloss`, 'Etymon gloss is required.'));
        }
    }

    function validateEdge(edge, path, nodeById, sourceById, manifest, errors, warnings) {
        if (!isObject(edge)) {
            errors.push(issue('edge-invalid', path, 'Edge must be an object.'));
            return;
        }
        if (!validId(edge.id)) errors.push(issue('edge-id-invalid', `${path}.id`, 'Edge id is missing or invalid.'));
        if (!validId(edge.fromId) || !nodeById[edge.fromId]) errors.push(issue('edge-from-missing', `${path}.fromId`, 'Edge source node does not exist.'));
        if (!validId(edge.toId) || !nodeById[edge.toId]) errors.push(issue('edge-to-missing', `${path}.toId`, 'Edge target node does not exist.'));
        if (!RELATION_TYPES.includes(edge.relationType)) errors.push(issue('edge-relation-invalid', `${path}.relationType`, 'Unknown lexical relation type.'));
        if (edge.direction !== expectedDirection(edge.relationType)) {
            errors.push(issue('edge-direction-invalid', `${path}.direction`, `Direction must be ${expectedDirection(edge.relationType)} for ${edge.relationType}.`));
        }
        if (!cleanText(edge.label, 240)) errors.push(issue('edge-label-required', `${path}.label`, 'A learner-readable relationship label is required.'));
        if (!VERIFICATION_TYPES.includes(edge.verification)) errors.push(issue('edge-verification-invalid', `${path}.verification`, 'Unknown verification status.'));
        const provenance = edge.provenance;
        if (!isObject(provenance)) {
            errors.push(issue('edge-provenance-required', `${path}.provenance`, 'Edge provenance is required.'));
        } else {
            ['provider', 'datasetVersion', 'snapshotId', 'license', 'attribution'].forEach((field) => {
                if (!cleanText(provenance[field], field === 'attribution' ? MAX_TEXT : 240)) {
                    errors.push(issue(`edge-provenance-${field}-required`, `${path}.provenance.${field}`, `Provenance ${field} is required.`));
                }
            });
            if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanText(provenance.reviewedAt, 20))) {
                errors.push(issue('edge-provenance-reviewed-at-required', `${path}.provenance.reviewedAt`, 'Provenance reviewedAt must be an ISO calendar date.'));
            }

            const sourceIds = Array.isArray(provenance.sourceIds) ? provenance.sourceIds : [];
            if (!sourceIds.length) {
                errors.push(issue('edge-source-required', `${path}.provenance.sourceIds`, 'Every edge must identify at least one source.'));
            } else {
                if (new Set(sourceIds).size !== sourceIds.length) {
                    errors.push(issue('edge-source-duplicate', `${path}.provenance.sourceIds`, 'Edge source ids must not contain duplicates.'));
                }
                sourceIds.forEach((sourceId, index) => {
                    if (!validId(sourceId) || (sourceById && !sourceById[sourceId])) {
                        errors.push(issue('edge-source-unknown', `${path}.provenance.sourceIds[${index}]`, 'Edge references an unknown source.'));
                    }
                });
            }
            const sourceUrls = Array.isArray(provenance.sourceUrls) ? provenance.sourceUrls : [];
            if (!sourceUrls.length || sourceUrls.some((url) => !validSourceUrl(url))) {
                errors.push(issue('edge-source-url-required', `${path}.provenance.sourceUrls`, 'Every edge must carry valid HTTPS source URLs.'));
            }

            // Provenance is a signed-looking claim only when it is derived from
            // the graph manifest. Do not accept a syntactically valid but
            // unrelated URL, attribution, license, provider, or review date.
            if (isObject(manifest)) {
                ['provider', 'datasetVersion', 'snapshotId', 'license'].forEach((field) => {
                    if (provenance[field] !== manifest[field]) {
                        errors.push(issue(`edge-provenance-${field}-mismatch`, `${path}.provenance.${field}`, `Edge provenance ${field} must match the manifest.`));
                    }
                });
                if (provenance.reviewedAt !== manifest.reviewedAt) {
                    errors.push(issue('edge-provenance-reviewed-at-mismatch', `${path}.provenance.reviewedAt`, 'Edge provenance reviewedAt must match the manifest review date.'));
                }
                const listedSources = sourceIds.map((sourceId) => sourceById && sourceById[sourceId]).filter(Boolean);
                if (sourceIds.length && listedSources.length === sourceIds.length) {
                    const expectedUrls = listedSources.map((source) => source.url);
                    if (sourceUrls.length !== expectedUrls.length || sourceUrls.some((url, index) => url !== expectedUrls[index])) {
                        errors.push(issue('edge-source-url-mismatch', `${path}.provenance.sourceUrls`, 'Edge source URLs must exactly match its manifest source ids.'));
                    }
                    const expectedAttribution = listedSources.map((source) => source.attribution).join(' ');
                    if (provenance.attribution !== expectedAttribution) {
                        errors.push(issue('edge-source-attribution-mismatch', `${path}.provenance.attribution`, 'Edge attribution must be derived from its manifest sources.'));
                    }
                    const sourceLicenses = Array.from(new Set(listedSources.map((source) => source.license)));
                    if (sourceLicenses.length !== 1 || provenance.license !== sourceLicenses[0]) {
                        errors.push(issue('edge-source-license-mismatch', `${path}.provenance.license`, 'Edge license must match all of its manifest sources.'));
                    }
                }
            }
        }
        const from = nodeById[edge.fromId];
        const to = nodeById[edge.toId];
        if (from && to && edge.relationType === 'containsMorpheme' && !(from.type === 'lexeme' && to.type === 'morpheme')) {
            errors.push(issue('edge-shape-invalid', path, 'containsMorpheme must connect a lexeme to a morpheme.'));
        }
        if (from && to && edge.relationType === 'hasSense' && !(from.type === 'lexeme' && to.type === 'sense' && to.lexemeId === from.id)) {
            errors.push(issue('edge-shape-invalid', path, 'hasSense must connect a lexeme to one of its sense nodes.'));
        }
        if (from && to && edge.relationType === 'inflectedFormOf' && !(from.type === 'form' && to.type === 'lexeme')) {
            errors.push(issue('edge-shape-invalid', path, 'inflectedFormOf must connect a form to its lexeme.'));
        }
        if (from && to && edge.relationType === 'translationEquivalent' && !(from.type === 'sense' && to.type === 'sense')) {
            errors.push(issue('translation-not-sense-specific', path, 'Translation equivalence must connect senses, not whole words.'));
        }
    }

    function validateCollections(nodes, edges, sourceById, limits, manifest) {
        const errors = [];
        const warnings = [];
        if (!Array.isArray(nodes)) errors.push(issue('nodes-required', 'nodes', 'nodes must be an array.'));
        if (!Array.isArray(edges)) errors.push(issue('edges-required', 'edges', 'edges must be an array.'));
        const nodeList = Array.isArray(nodes) ? nodes : [];
        const edgeList = Array.isArray(edges) ? edges : [];
        if (nodeList.length > limits.nodes) errors.push(issue('node-bound-exceeded', 'nodes', `At most ${limits.nodes} nodes are allowed.`));
        if (edgeList.length > limits.edges) errors.push(issue('edge-bound-exceeded', 'edges', `At most ${limits.edges} edges are allowed.`));
        const nodeById = {};
        nodeList.forEach((node, index) => {
            validateNode(node, `nodes[${index}]`, errors);
            if (node && validId(node.id)) {
                if (nodeById[node.id]) errors.push(issue('node-id-duplicate', `nodes[${index}].id`, 'Node ids must be unique.'));
                else nodeById[node.id] = node;
            }
        });
        nodeList.forEach((node, index) => {
            if (!node || !['sense', 'form'].includes(node.type) || !validId(node.lexemeId)) return;
            if (!nodeById[node.lexemeId] || nodeById[node.lexemeId].type !== 'lexeme') {
                errors.push(issue('lexeme-reference-invalid', `nodes[${index}].lexemeId`, 'Sense and form nodes must reference a lexeme node.'));
            }
        });
        const edgeIds = new Set();
        const edgeKeys = new Set();
        edgeList.forEach((edge, index) => {
            validateEdge(edge, `edges[${index}]`, nodeById, sourceById, manifest, errors, warnings);
            if (!edge || !validId(edge.id)) return;
            if (edgeIds.has(edge.id)) errors.push(issue('edge-id-duplicate', `edges[${index}].id`, 'Edge ids must be unique.'));
            edgeIds.add(edge.id);
            if (validId(edge.fromId) && validId(edge.toId) && RELATION_TYPES.includes(edge.relationType)) {
                const endpoints = SYMMETRIC_RELATIONS[edge.relationType]
                    ? [edge.fromId, edge.toId].sort()
                    : [edge.fromId, edge.toId];
                const key = `${endpoints[0]}|${endpoints[1]}|${edge.relationType}`;
                if (edgeKeys.has(key)) errors.push(issue('edge-duplicate', `edges[${index}]`, 'Duplicate lexical relationship.'));
                edgeKeys.add(key);
            }
        });
        return { errors, warnings };
    }

    function validateSnapshot(snapshot) {
        const errors = [];
        const warnings = [];
        if (!isObject(snapshot)) return { ok: false, errors: [issue('snapshot-invalid', '', 'Snapshot must be an object.')], warnings, value: null };
        if (snapshot.schemaVersion !== SNAPSHOT_VERSION) errors.push(issue('snapshot-version-invalid', 'schemaVersion', `Expected ${SNAPSHOT_VERSION}.`));
        validateManifest(snapshot.dataset, 'dataset', errors);
        const sourceById = {};
        if (isObject(snapshot.dataset) && Array.isArray(snapshot.dataset.sources)) {
            snapshot.dataset.sources.forEach((source) => { if (source && validId(source.id)) sourceById[source.id] = source; });
        }
        const collectionReport = validateCollections(snapshot.nodes, snapshot.relationships, sourceById, {
            nodes: MAX_SNAPSHOT_NODES,
            edges: MAX_SNAPSHOT_EDGES
        }, snapshot.dataset);
        errors.push(...collectionReport.errors);
        warnings.push(...collectionReport.warnings);
        return { ok: errors.length === 0, errors, warnings, value: errors.length ? null : clone(snapshot) };
    }

    function validateGraph(graph) {
        const errors = [];
        const warnings = [];
        if (!isObject(graph)) return { ok: false, errors: [issue('graph-invalid', '', 'Graph must be an object.')], warnings, value: null };
        if (graph.version !== VERSION) errors.push(issue('graph-version-invalid', 'version', `Expected ${VERSION}.`));
        if (!validId(graph.focusId)) errors.push(issue('graph-focus-required', 'focusId', 'A valid focusId is required.'));
        validateManifest(graph.manifest, 'manifest', errors);
        const sourceById = {};
        if (isObject(graph.manifest) && Array.isArray(graph.manifest.sources)) {
            graph.manifest.sources.forEach((source) => { if (source && validId(source.id)) sourceById[source.id] = source; });
        }
        const collectionReport = validateCollections(graph.nodes, graph.edges, sourceById, {
            nodes: MAX_GRAPH_NODES,
            edges: MAX_GRAPH_EDGES
        }, graph.manifest);
        errors.push(...collectionReport.errors);
        warnings.push(...collectionReport.warnings);
        if (validId(graph.focusId) && Array.isArray(graph.nodes) && !graph.nodes.some((node) => node && node.id === graph.focusId)) {
            errors.push(issue('graph-focus-missing', 'focusId', 'focusId must identify a node in the graph.'));
        }
        return { ok: errors.length === 0, errors, warnings, value: errors.length ? null : clone(graph) };
    }

    function boundedInteger(value, fallback, minimum, maximum, name) {
        if (value === undefined || value === null || value === '') return fallback;
        const numeric = Number(value);
        if (!Number.isInteger(numeric) || numeric < minimum || numeric > maximum) {
            throw new RangeError(`${name} must be an integer from ${minimum} through ${maximum}.`);
        }
        return numeric;
    }

    function edgeSort(a, b) {
        const priority = (RELATION_PRIORITY[a.relationType] ?? 99) - (RELATION_PRIORITY[b.relationType] ?? 99);
        return priority || a.fromId.localeCompare(b.fromId) || a.toId.localeCompare(b.toId) || a.id.localeCompare(b.id);
    }

    function nodeSort(a, b) {
        return (TYPE_PRIORITY[a.type] ?? 99) - (TYPE_PRIORITY[b.type] ?? 99)
            || normalizeLanguage(a.language).localeCompare(normalizeLanguage(b.language))
            || cleanText(a.label, MAX_TEXT).localeCompare(cleanText(b.label, MAX_TEXT))
            || a.id.localeCompare(b.id);
    }

    function edgeOtherId(edge, nodeId) {
        if (edge.fromId === nodeId) return edge.toId;
        if (edge.toId === nodeId) return edge.fromId;
        return '';
    }

    function describeNode(node) {
        const language = node.language ? `${languageName(node.language)} ` : '';
        if (node.type === 'sense') return `${language}sense "${node.label}": ${node.definition}`;
        if (node.type === 'form') return `${language}form "${node.label}" (${node.formType})`;
        if (node.type === 'morpheme') return `morpheme "${node.label}": ${node.meaning}`;
        if (node.type === 'etymon') return `${node.historicalLanguage} etymon "${node.label}": ${node.gloss}`;
        return `${language}${node.partOfSpeech || 'word'} "${node.label}"`;
    }

    function edgeSentence(edge, nodeById) {
        const from = nodeById[edge.fromId];
        const to = nodeById[edge.toId];
        if (!from || !to) return '';
        const sourceLabel = describeNode(from);
        const targetLabel = describeNode(to);
        return `${sourceLabel} ${edge.label || RELATION_LABELS[edge.relationType]} ${targetLabel}. Verification: ${edge.verification}.`;
    }

    function deriveAccessibleOutline(graph) {
        const report = validateGraph(graph);
        if (!report.ok) {
            const error = new Error('Invalid lexical graph.');
            error.report = report;
            throw error;
        }
        const value = report.value;
        const nodeById = {};
        value.nodes.forEach((node) => { nodeById[node.id] = node; });
        const adjacency = {};
        value.nodes.forEach((node) => { adjacency[node.id] = []; });
        value.edges.slice().sort(edgeSort).forEach((edge) => {
            if (adjacency[edge.fromId]) adjacency[edge.fromId].push(edge);
            if (adjacency[edge.toId]) adjacency[edge.toId].push(edge);
        });
        Object.keys(adjacency).forEach((id) => adjacency[id].sort((a, b) => {
            const byEdge = edgeSort(a, b);
            if (byEdge) return byEdge;
            return nodeSort(nodeById[edgeOtherId(a, id)], nodeById[edgeOtherId(b, id)]);
        }));
        const order = [];
        const depthById = {};
        const parentEdgeById = {};
        const seen = new Set([value.focusId]);
        const queue = [value.focusId];
        depthById[value.focusId] = 0;
        while (queue.length) {
            const id = queue.shift();
            order.push(id);
            const next = adjacency[id].map((edge) => ({ edge, node: nodeById[edgeOtherId(edge, id)] }))
                .filter((entry) => entry.node && !seen.has(entry.node.id))
                .sort((a, b) => edgeSort(a.edge, b.edge) || nodeSort(a.node, b.node));
            next.forEach((entry) => {
                // Multiple valid relation types may connect the same pair. The
                // candidate list was formed before this loop mutates the seen set.
                if (seen.has(entry.node.id)) return;
                seen.add(entry.node.id);
                depthById[entry.node.id] = depthById[id] + 1;
                parentEdgeById[entry.node.id] = entry.edge.id;
                queue.push(entry.node.id);
            });
        }
        value.nodes.filter((node) => !seen.has(node.id)).sort(nodeSort).forEach((node) => {
            order.push(node.id);
            depthById[node.id] = null;
        });
        const items = order.map((id) => {
            const node = nodeById[id];
            return {
                id,
                label: node.label,
                nodeType: node.type,
                language: node.language || '',
                depth: depthById[id],
                parentEdgeId: parentEdgeById[id] || null,
                text: describeNode(node)
            };
        });
        const relationships = value.edges.slice().sort(edgeSort).map((edge) => ({
            edgeId: edge.id,
            fromId: edge.fromId,
            toId: edge.toId,
            relationType: edge.relationType,
            text: edgeSentence(edge, nodeById),
            verification: edge.verification,
            sourceUrls: edge.provenance.sourceUrls.slice()
        }));
        const title = cleanText(value.title, MAX_TEXT) || `Word connections for ${nodeById[value.focusId].label}`;
        const lines = [title, `Focus: ${describeNode(nodeById[value.focusId])}.`, 'Connected words and parts:'];
        items.slice(1).forEach((item) => lines.push(`${item.depth === null ? '-' : `${item.depth}.`} ${item.text}.`));
        lines.push('Relationships:');
        relationships.forEach((relationship) => lines.push(`- ${relationship.text}`));
        return {
            version: OUTLINE_VERSION,
            title,
            focusId: value.focusId,
            order,
            items,
            relationships,
            text: lines.join('\n')
        };
    }

    function toACG(graph) {
        const report = validateGraph(graph);
        if (!report.ok) {
            const error = new Error('Invalid lexical graph.');
            error.report = report;
            throw error;
        }
        const value = report.value;
        const outline = deriveAccessibleOutline(value);
        const orderIndex = {};
        outline.order.forEach((id, index) => { orderIndex[id] = index; });
        const depthById = {};
        outline.items.forEach((item) => { depthById[item.id] = item.depth === null ? MAX_DEPTH + 1 : item.depth; });
        const languageCategories = [];
        value.nodes.forEach((node) => {
            const category = node.language ? languageName(node.language) : (node.type === 'morpheme' ? 'Word parts' : 'Word history');
            if (!languageCategories.includes(category)) languageCategories.push(category);
        });
        const acgNodes = value.nodes.map((node) => {
            const isFocus = node.id === value.focusId;
            const compatibleType = isFocus ? 'main' : (node.type === 'sense' || node.type === 'form' ? 'item' : 'branch');
            const category = node.language ? languageName(node.language) : (node.type === 'morpheme' ? 'Word parts' : 'Word history');
            return {
                id: node.id,
                label: node.label,
                type: compatibleType,
                category,
                x: depthById[node.id] * 320,
                y: orderIndex[node.id] * 105,
                z: languageCategories.indexOf(category) * 260,
                lexicalType: node.type,
                language: node.language || '',
                description: node.definition || node.meaning || node.gloss || node.formType || '',
                lexical: clone(node),
                axisValues: {
                    x: Math.min(1, depthById[node.id] / (MAX_DEPTH + 1)),
                    y: value.nodes.length > 1 ? orderIndex[node.id] / (value.nodes.length - 1) : 0,
                    z: category
                }
            };
        });
        const acgEdges = value.edges.map((edge) => ({
            id: edge.id,
            fromId: edge.fromId,
            toId: edge.toId,
            type: ACG_EDGE_TYPE[edge.relationType] || 'relatedTo',
            relationType: edge.relationType,
            label: edge.label,
            direction: edge.direction,
            verification: edge.verification,
            provenance: clone(edge.provenance),
            lexicalMeta: clone(edge.meta || {})
        }));
        return {
            version: ACG_VERSION,
            title: value.title,
            axes: {
                x: { label: 'Lexical distance from the selected word', kind: 'ordinal' },
                y: { label: 'Accessible reading order', kind: 'ordinal' },
                z: { label: 'Language or lexical layer', kind: 'categorical', categories: languageCategories }
            },
            nodes: acgNodes,
            edges: acgEdges,
            layers: languageCategories.map((category, index) => ({ key: category, label: category, index })),
            meta: {
                lexicalGraphVersion: VERSION,
                focusId: value.focusId,
                manifest: clone(value.manifest),
                accessibleOutline: outline
            }
        };
    }

    function createLocalProvider(snapshot) {
        const report = validateSnapshot(snapshot);
        if (!report.ok) {
            const error = new Error('Invalid local lexical snapshot.');
            error.report = report;
            throw error;
        }
        const value = report.value;
        const manifest = clone(value.dataset);
        const nodeById = {};
        const lexemes = [];
        const sensesByLexeme = {};
        value.nodes.forEach((node) => {
            nodeById[node.id] = node;
            if (node.type === 'lexeme') lexemes.push(node);
            if (node.type === 'sense') {
                sensesByLexeme[node.lexemeId] = sensesByLexeme[node.lexemeId] || [];
                sensesByLexeme[node.lexemeId].push(node);
            }
        });
        lexemes.sort(nodeSort);
        Object.keys(sensesByLexeme).forEach((id) => sensesByLexeme[id].sort(nodeSort));
        const sortedEdges = value.relationships.slice().sort(edgeSort);
        const adjacency = {};
        value.nodes.forEach((node) => { adjacency[node.id] = []; });
        sortedEdges.forEach((edge) => {
            adjacency[edge.fromId].push(edge);
            adjacency[edge.toId].push(edge);
        });

        function getManifest() {
            return clone(manifest);
        }

        function resolveLexeme(query, options) {
            const opts = isObject(options) ? options : {};
            const requestedLanguage = normalizeLanguage(opts.language) || normalizeLanguage(opts.languageTag);
            const requestedSense = slug(opts.senseKey || '');
            const rawQuery = cleanText(isObject(query) ? (query.id || query.lemma || query.term) : query, MAX_ID);
            if (!rawQuery) return { status: 'not-found', id: null, match: null, sense: null, candidates: [], manifest: getManifest() };
            let candidates = [];
            if (nodeById[rawQuery]) {
                const direct = nodeById[rawQuery];
                const lexeme = direct.type === 'lexeme' ? direct : nodeById[direct.lexemeId];
                if (lexeme && lexeme.type === 'lexeme') candidates = [lexeme];
            } else {
                const exact = normalizeToken(rawQuery);
                const folded = foldToken(rawQuery);
                candidates = lexemes.filter((node) => {
                    if (requestedLanguage && normalizeLanguage(node.language) !== requestedLanguage) return false;
                    const aliases = [node.lemma, node.label].concat(Array.isArray(node.aliases) ? node.aliases : []);
                    return aliases.some((alias) => normalizeToken(alias) === exact || foldToken(alias) === folded);
                });
            }
            if (requestedLanguage) candidates = candidates.filter((node) => normalizeLanguage(node.language) === requestedLanguage);
            if (requestedSense) candidates = candidates.filter((node) => {
                if (slug(node.entryKey) === requestedSense) return true;
                return (sensesByLexeme[node.id] || []).some((sense) => slug(sense.senseKey) === requestedSense);
            });
            candidates.sort(nodeSort);
            const enriched = candidates.map((node) => Object.assign(clone(node), {
                senses: clone(sensesByLexeme[node.id] || [])
            }));
            if (enriched.length !== 1) {
                return {
                    status: enriched.length ? 'ambiguous' : 'not-found',
                    id: null,
                    match: null,
                    sense: null,
                    candidates: enriched,
                    manifest: getManifest()
                };
            }
            const matchingSenses = enriched[0].senses.filter((sense) => !requestedSense || slug(sense.senseKey) === requestedSense);
            return {
                status: 'resolved',
                id: enriched[0].id,
                match: enriched[0],
                sense: matchingSenses.length === 1 ? matchingSenses[0] : null,
                candidates: enriched,
                manifest: getManifest()
            };
        }

        function getNeighborhood(seed, options) {
            const opts = isObject(options) ? options : {};
            const maxNodes = boundedInteger(opts.maxNodes, 24, 1, MAX_GRAPH_NODES, 'maxNodes');
            const maxEdges = boundedInteger(opts.maxEdges, 48, 0, MAX_GRAPH_EDGES, 'maxEdges');
            const depth = boundedInteger(opts.depth, 2, 0, MAX_DEPTH, 'depth');
            let focusId = cleanText(isObject(seed) ? (seed.id || (seed.match && seed.match.id)) : seed, MAX_ID);
            if (!nodeById[focusId]) {
                const resolved = resolveLexeme(seed, opts);
                focusId = resolved.status === 'resolved' ? resolved.id : '';
            }
            if (!focusId || !nodeById[focusId]) {
                return {
                    version: VERSION,
                    title: '',
                    focusId: '',
                    manifest: getManifest(),
                    nodes: [],
                    edges: [],
                    meta: { status: 'not-found', depth, maxNodes, maxEdges, truncated: false }
                };
            }
            let relationFilter = null;
            if (Array.isArray(opts.relations) && opts.relations.length) {
                const unknown = opts.relations.filter((relation) => !RELATION_TYPES.includes(relation));
                if (unknown.length) throw new RangeError(`Unknown lexical relation: ${unknown[0]}.`);
                relationFilter = new Set(opts.relations);
            }
            let languageFilter = null;
            if (Array.isArray(opts.languages) && opts.languages.length) {
                const normalized = opts.languages.map(normalizeLanguage);
                if (normalized.some((language) => !language)) throw new RangeError('languages contains an unknown language.');
                languageFilter = new Set(normalized);
            }
            const edgeAllowed = (edge) => !relationFilter || relationFilter.has(edge.relationType);
            const nodeAllowed = (node) => !languageFilter
                || !node.language
                || node.type === 'morpheme'
                || node.type === 'etymon'
                || languageFilter.has(normalizeLanguage(node.language));
            const included = new Set([focusId]);
            const distance = { [focusId]: 0 };
            const queue = [focusId];
            let candidateOverflow = false;
            while (queue.length) {
                const id = queue.shift();
                if (distance[id] >= depth) continue;
                const candidates = adjacency[id].filter(edgeAllowed).map((edge) => ({
                    edge,
                    node: nodeById[edgeOtherId(edge, id)]
                })).filter((entry) => entry.node && nodeAllowed(entry.node) && !included.has(entry.node.id))
                    .sort((a, b) => edgeSort(a.edge, b.edge) || nodeSort(a.node, b.node));
                for (const entry of candidates) {
                    // Recheck after earlier candidates: parallel typed edges
                    // must not enqueue or count the same node twice.
                    if (included.has(entry.node.id)) continue;
                    if (included.size >= maxNodes) { candidateOverflow = true; break; }
                    included.add(entry.node.id);
                    distance[entry.node.id] = distance[id] + 1;
                    queue.push(entry.node.id);
                }
            }
            const nodes = [nodeById[focusId]].concat(value.nodes.filter((node) => node.id !== focusId && included.has(node.id))
                .sort((a, b) => (distance[a.id] - distance[b.id]) || nodeSort(a, b))).map(clone);
            const eligibleEdges = sortedEdges.filter((edge) => edgeAllowed(edge) && included.has(edge.fromId) && included.has(edge.toId));
            const edges = eligibleEdges.slice(0, maxEdges).map(clone);
            const title = `Word connections: ${nodeById[focusId].label}`;
            return {
                version: VERSION,
                title,
                focusId,
                manifest: getManifest(),
                nodes,
                edges,
                meta: {
                    status: 'resolved',
                    depth,
                    maxNodes,
                    maxEdges,
                    datasetNodeCount: value.nodes.length,
                    datasetEdgeCount: value.relationships.length,
                    truncated: candidateOverflow || eligibleEdges.length > maxEdges,
                    distances: clone(distance)
                }
            };
        }

        return {
            version: VERSION,
            getManifest,
            resolveLexeme,
            getNeighborhood,
            deriveAccessibleOutline(graph) { return deriveAccessibleOutline(graph); },
            toACG(graph) { return toACG(graph); }
        };
    }

    function createPilotSnapshot() {
        const wiktionarySource = (id, title, url) => ({
            id,
            title,
            url,
            license: 'CC BY-SA 4.0',
            attribution: `Wiktionary contributors; ${title}, summarized for this reviewed educational pilot.`
        });
        // Keep entry-specific records. An English entry cannot establish the
        // history or current sense of its French or Spanish lookalike.
        const sources = [
            wiktionarySource('wiktionary-en-transport', 'English transport entry', 'https://en.wiktionary.org/wiki/transport#English'),
            wiktionarySource('wiktionary-fr-transporter', 'French transporter entry', 'https://en.wiktionary.org/wiki/transporter#French'),
            wiktionarySource('wiktionary-es-transportar', 'Spanish transportar entry', 'https://en.wiktionary.org/wiki/transportar#Spanish'),
            wiktionarySource('wiktionary-en-portable', 'English portable entry', 'https://en.wiktionary.org/wiki/portable#English'),
            wiktionarySource('wiktionary-fr-portable', 'French portable entry', 'https://en.wiktionary.org/wiki/portable#French'),
            wiktionarySource('wiktionary-es-portatil', 'Spanish portátil entry', 'https://en.wiktionary.org/wiki/port%C3%A1til#Spanish'),
            wiktionarySource('wiktionary-en-actual', 'English actual entry', 'https://en.wiktionary.org/wiki/actual#English'),
            wiktionarySource('wiktionary-fr-actuel', 'French actuel entry', 'https://en.wiktionary.org/wiki/actuel#French'),
            wiktionarySource('wiktionary-es-actual', 'Spanish actual entry', 'https://en.wiktionary.org/wiki/actual#Spanish'),
            wiktionarySource('wiktionary-en-night', 'English night entry', 'https://en.wiktionary.org/wiki/night#English'),
            wiktionarySource('wiktionary-fr-nuit', 'French nuit entry', 'https://en.wiktionary.org/wiki/nuit#French'),
            wiktionarySource('wiktionary-es-noche', 'Spanish noche entry', 'https://en.wiktionary.org/wiki/noche#Spanish')
        ];
        const dataset = {
            provider: 'alloflow-reviewed-lexical-pilot',
            datasetVersion: '2026-08-12.2',
            snapshotId: 'alloflow-lexical-en-fr-es-pilot-2026-08-12-r2',
            title: 'AlloFlow reviewed English-French-Spanish lexical pilot',
            languages: ['en', 'fr', 'es', 'la'],
            license: 'CC BY-SA 4.0',
            attribution: 'Lexical summaries adapted from Wiktionary contributors under CC BY-SA 4.0; reviewed and bounded by AlloFlow for an educational pilot.',
            reviewStatus: 'reviewed',
            reviewedAt: '2026-08-12',
            reviewedBy: 'AlloFlow lexical pilot curation pass',
            scopeNote: 'Small pedagogical pilot; not an exhaustive dictionary or a claim that translation, cognacy, borrowing, and spelling similarity are equivalent.',
            sources
        };
        const sourceById = {};
        sources.forEach((source) => { sourceById[source.id] = source; });
        const provenance = (sourceIds) => ({
            provider: dataset.provider,
            datasetVersion: dataset.datasetVersion,
            snapshotId: dataset.snapshotId,
            sourceIds: sourceIds.slice(),
            sourceUrls: sourceIds.map((id) => sourceById[id].url),
            license: dataset.license,
            attribution: sourceIds.map((id) => sourceById[id].attribution).join(' '),
            reviewedAt: dataset.reviewedAt
        });
        const lexeme = (language, lemma, partOfSpeech, entryKey, pronunciation) => ({
            id: makeLexemeId(language, lemma, entryKey || partOfSpeech),
            type: 'lexeme', label: lemma, lemma, language, partOfSpeech, entryKey: entryKey || partOfSpeech,
            pronunciation: pronunciation || ''
        });
        const sense = (lexemeNode, senseKey, definition, label) => ({
            id: makeSenseId(lexemeNode.id, senseKey), type: 'sense', label: label || definition,
            language: lexemeNode.language, lexemeId: lexemeNode.id, senseKey, definition
        });
        const form = (lexemeNode, surface, formType) => ({
            id: `form:${lexemeNode.id}:${slug(surface)}:${slug(formType)}`, type: 'form', label: surface,
            language: lexemeNode.language, lexemeId: lexemeNode.id, form: surface, formType
        });
        const relation = (id, from, to, relationType, sourceIds, label, meta) => ({
            id: `edge:${id}`, fromId: typeof from === 'string' ? from : from.id, toId: typeof to === 'string' ? to : to.id,
            relationType, label: label || RELATION_LABELS[relationType], direction: expectedDirection(relationType),
            verification: 'reviewed', provenance: provenance(sourceIds), meta: meta || {}
        });

        const enTransport = lexeme('en', 'transport', 'verb', 'verb', '/trænˈspɔːrt/');
        const frTransporter = lexeme('fr', 'transporter', 'verb', 'verb', '/tʁɑ̃s.pɔʁ.te/');
        const esTransportar = lexeme('es', 'transportar', 'verb', 'verb', '/tɾans.poɾˈtaɾ/');
        const enTransportSense = sense(enTransport, 'move-from-place-to-place', 'to carry or move something from one place to another', 'move from place to place');
        const frTransportSense = sense(frTransporter, 'move-from-place-to-place', 'déplacer quelque chose ou quelqu’un d’un lieu à un autre', 'déplacer d’un lieu à un autre');
        const esTransportSense = sense(esTransportar, 'move-from-place-to-place', 'llevar algo o a alguien de un lugar a otro', 'llevar de un lugar a otro');
        const enTransported = form(enTransport, 'transported', 'simple past and past participle');
        const frTransportons = form(frTransporter, 'transportons', 'first-person plural present indicative');
        const esTransportamos = form(esTransportar, 'transportamos', 'first-person plural present indicative');
        const transMorpheme = { id: 'morph:la:trans', type: 'morpheme', label: 'trans-', notation: 'trans-', language: 'la', meaning: 'across or beyond' };
        const portMorpheme = { id: 'morph:la:port', type: 'morpheme', label: 'port-', notation: 'port-', language: 'la', meaning: 'carry' };
        const transportare = { id: 'ety:la:transportare', type: 'etymon', label: 'trānsportāre', historicalLanguage: 'Latin', attestedForm: 'trānsportāre', gloss: 'to carry across; to transport' };
        const middleEnglishTransport = { id: 'ety:enm:transport', type: 'etymon', label: 'transport', historicalLanguage: 'Middle English', attestedForm: 'transport', gloss: 'transport; conveyance' };
        const oldFrenchTransporter = { id: 'ety:fro:transporter', type: 'etymon', label: 'transporter', historicalLanguage: 'Old French', attestedForm: 'transporter', gloss: 'to carry across; transport' };
        const middleFrenchTransporter = { id: 'ety:frm:transporter', type: 'etymon', label: 'transporter', historicalLanguage: 'Middle French', attestedForm: 'transporter', gloss: 'to transport' };

        const enPortable = lexeme('en', 'portable', 'adjective', 'adjective', '/ˈpɔːrtəbəl/');
        const frPortable = lexeme('fr', 'portable', 'adjective', 'adjective', '/pɔʁ.tabl/');
        const esPortatil = lexeme('es', 'portátil', 'adjective', 'adjective', '/poɾˈtatil/');
        const enPortableSense = sense(enPortable, 'easy-to-carry', 'able to be carried or moved easily', 'easy to carry');
        const frPortableSense = sense(frPortable, 'easy-to-carry', 'qui peut être transporté facilement', 'facile à transporter');
        const esPortatilSense = sense(esPortatil, 'easy-to-carry', 'que se puede transportar fácilmente', 'fácil de transportar');
        const middleEnglishPortable = { id: 'ety:enm:portable', type: 'etymon', label: 'portable', historicalLanguage: 'Middle English', attestedForm: 'portable', gloss: 'able to be carried' };
        const middleFrenchPortable = { id: 'ety:frm:portable', type: 'etymon', label: 'portable', historicalLanguage: 'Middle French', attestedForm: 'portable', gloss: 'able to be carried' };
        const portabilis = { id: 'ety:la:portabilis', type: 'etymon', label: 'portābilis', historicalLanguage: 'Latin', attestedForm: 'portābilis', gloss: 'that can be carried' };
        const medievalLatinPortatilis = { id: 'ety:la-medieval:portatilis', type: 'etymon', label: 'portātilis', historicalLanguage: 'Medieval Latin', attestedForm: 'portātilis', gloss: 'able to be carried' };
        const latinPortatus = { id: 'ety:la:portatus', type: 'etymon', label: 'portātus', historicalLanguage: 'Latin', attestedForm: 'portātus', gloss: 'carried' };

        const enActual = lexeme('en', 'actual', 'adjective', 'adjective', '/ˈæktʃuəl/');
        const frActuel = lexeme('fr', 'actuel', 'adjective', 'adjective', '/ak.tɥɛl/');
        const esActual = lexeme('es', 'actual', 'adjective', 'adjective', '/akˈtwal/');
        const enActualSense = sense(enActual, 'real-not-imagined', 'real or existing in fact', 'real; existing in fact');
        const frActuelSense = sense(frActuel, 'current-present-time', 'qui appartient au moment présent', 'current; of the present time');
        const esActualSense = sense(esActual, 'current-present-time', 'del tiempo presente', 'current; of the present time');
        const actualis = { id: 'ety:la:actualis', type: 'etymon', label: 'actuālis', historicalLanguage: 'Late Latin', attestedForm: 'actuālis', gloss: 'active or relating to acts; later, real or existing' };

        const enNight = lexeme('en', 'night', 'noun', 'noun', '/naɪt/');
        const frNuit = lexeme('fr', 'nuit', 'noun', 'noun', '/nɥi/');
        const esNoche = lexeme('es', 'noche', 'noun', 'noun', '/ˈnotʃe/');
        const enNightSense = sense(enNight, 'dark-period', 'the period of darkness between sunset and sunrise', 'period of darkness');
        const frNuitSense = sense(frNuit, 'dark-period', 'période d’obscurité entre le coucher et le lever du soleil', 'période d’obscurité');
        const esNocheSense = sense(esNoche, 'dark-period', 'período de oscuridad entre la puesta y la salida del sol', 'período de oscuridad');
        const oldEnglishNiht = { id: 'ety:ang:niht', type: 'etymon', label: 'niht', historicalLanguage: 'Old English', attestedForm: 'niht', gloss: 'night' };
        const protoGermanicNahts = { id: 'ety:gem-proto:nahts', type: 'etymon', label: '*nahts', historicalLanguage: 'Proto-Germanic', attestedForm: '*nahts', gloss: 'night (reconstructed)' };
        const oldFrenchNuit = { id: 'ety:fro:nuit', type: 'etymon', label: 'nuit', historicalLanguage: 'Old French', attestedForm: 'nuit', gloss: 'night' };
        const oldSpanishNoche = { id: 'ety:osp:noche', type: 'etymon', label: 'noche', historicalLanguage: 'Old Spanish', attestedForm: 'noche', gloss: 'night' };
        const latinNoctem = { id: 'ety:la:noctem', type: 'etymon', label: 'noctem', historicalLanguage: 'Latin', attestedForm: 'noctem', gloss: 'night (accusative singular)' };
        const protoIndoEuropeanNokts = { id: 'ety:ine-proto:nokts', type: 'etymon', label: '*nókʷts', historicalLanguage: 'Proto-Indo-European', attestedForm: '*nókʷts', gloss: 'night (reconstructed)' };

        const nodes = [
            enTransport, frTransporter, esTransportar,
            enTransportSense, frTransportSense, esTransportSense,
            enTransported, frTransportons, esTransportamos,
            transMorpheme, portMorpheme, transportare,
            middleEnglishTransport, oldFrenchTransporter, middleFrenchTransporter,
            enPortable, frPortable, esPortatil,
            enPortableSense, frPortableSense, esPortatilSense,
            middleEnglishPortable, middleFrenchPortable, portabilis, medievalLatinPortatilis, latinPortatus,
            enActual, frActuel, esActual,
            enActualSense, frActuelSense, esActualSense, actualis,
            enNight, frNuit, esNoche,
            enNightSense, frNuitSense, esNocheSense,
            oldEnglishNiht, protoGermanicNahts, oldFrenchNuit, oldSpanishNoche, latinNoctem, protoIndoEuropeanNokts
        ];
        const tEn = ['wiktionary-en-transport'];
        const tFr = ['wiktionary-fr-transporter'];
        const tEs = ['wiktionary-es-transportar'];
        const pEn = ['wiktionary-en-portable'];
        const pFr = ['wiktionary-fr-portable'];
        const pEs = ['wiktionary-es-portatil'];
        const aEn = ['wiktionary-en-actual'];
        const aFr = ['wiktionary-fr-actuel'];
        const aEs = ['wiktionary-es-actual'];
        const nEn = ['wiktionary-en-night'];
        const nFr = ['wiktionary-fr-nuit'];
        const nEs = ['wiktionary-es-noche'];
        const together = (...groups) => groups.reduce((out, group) => out.concat(group), []);
        const relationships = [
            // Structural entry-to-sense links keep traversal explicitly sense-aware.
            relation('en-transport-sense', enTransport, enTransportSense, 'hasSense', tEn),
            relation('fr-transporter-sense', frTransporter, frTransportSense, 'hasSense', tFr),
            relation('es-transportar-sense', esTransportar, esTransportSense, 'hasSense', tEs),
            relation('en-portable-sense', enPortable, enPortableSense, 'hasSense', pEn),
            relation('fr-portable-sense', frPortable, frPortableSense, 'hasSense', pFr),
            relation('es-portatil-sense', esPortatil, esPortatilSense, 'hasSense', pEs),
            relation('en-actual-sense', enActual, enActualSense, 'hasSense', aEn),
            relation('fr-actuel-sense', frActuel, frActuelSense, 'hasSense', aFr),
            relation('es-actual-sense', esActual, esActualSense, 'hasSense', aEs),
            relation('en-night-sense', enNight, enNightSense, 'hasSense', nEn),
            relation('fr-nuit-sense', frNuit, frNuitSense, 'hasSense', nFr),
            relation('es-noche-sense', esNoche, esNocheSense, 'hasSense', nEs),

            relation('en-transport-trans', enTransport, transMorpheme, 'containsMorpheme', tEn),
            relation('en-transport-port', enTransport, portMorpheme, 'containsMorpheme', tEn),
            relation('fr-transporter-trans', frTransporter, transMorpheme, 'containsMorpheme', tFr),
            relation('fr-transporter-port', frTransporter, portMorpheme, 'containsMorpheme', tFr),
            relation('es-transportar-trans', esTransportar, transMorpheme, 'containsMorpheme', tEs),
            relation('es-transportar-port', esTransportar, portMorpheme, 'containsMorpheme', tEs),
            relation('transported-en-transport', enTransported, enTransport, 'inflectedFormOf', tEn),
            relation('transportons-fr-transporter', frTransportons, frTransporter, 'inflectedFormOf', tFr),
            relation('transportamos-es-transportar', esTransportamos, esTransportar, 'inflectedFormOf', tEs),
            relation('en-transport-middle-english', enTransport, middleEnglishTransport, 'inheritedFrom', tEn),
            relation('middle-english-transport-old-french', middleEnglishTransport, oldFrenchTransporter, 'borrowedFrom', tEn),
            relation('old-french-transporter-latin', oldFrenchTransporter, transportare, 'derivedFrom', tEn),
            relation('fr-transporter-middle-french', frTransporter, middleFrenchTransporter, 'inheritedFrom', tFr),
            relation('middle-french-transporter-latin', middleFrenchTransporter, transportare, 'derivedFrom', tFr),
            relation('es-transportar-latin', esTransportar, transportare, 'derivedFrom', tEs),
            relation('en-fr-transport-root', enTransport, frTransporter, 'sharesRoot', together(tEn, tFr)),
            relation('en-es-transport-root', enTransport, esTransportar, 'sharesRoot', together(tEn, tEs)),
            relation('fr-es-transport-root', frTransporter, esTransportar, 'sharesRoot', together(tFr, tEs)),
            relation('en-fr-transport-translation', enTransportSense, frTransportSense, 'translationEquivalent', together(tEn, tFr)),
            relation('en-es-transport-translation', enTransportSense, esTransportSense, 'translationEquivalent', together(tEn, tEs)),

            relation('en-portable-port', enPortable, portMorpheme, 'containsMorpheme', pEn),
            relation('fr-portable-port', frPortable, portMorpheme, 'containsMorpheme', pFr),
            relation('es-portatil-port', esPortatil, portMorpheme, 'containsMorpheme', pEs),
            // The cited English entry gives Middle English portable, from
            // Middle French portable and Latin portabilis. Keep precisely
            // those supported intermediates; do not invent another path.
            relation('en-portable-middle-english', enPortable, middleEnglishPortable, 'inheritedFrom', pEn),
            relation('middle-english-portable-middle-french', middleEnglishPortable, middleFrenchPortable, 'derivedFrom', pEn),
            relation('middle-english-portable-latin', middleEnglishPortable, portabilis, 'derivedFrom', pEn),
            relation('fr-portable-latin', frPortable, portabilis, 'borrowedFrom', pFr),
            relation('es-portatil-medieval-latin', esPortatil, medievalLatinPortatilis, 'borrowedFrom', pEs),
            relation('medieval-latin-portatilis-latin-portatus', medievalLatinPortatilis, latinPortatus, 'derivedFrom', pEs),
            relation('en-fr-portable-root', enPortable, frPortable, 'sharesRoot', together(pEn, pFr)),
            relation('en-es-portable-root', enPortable, esPortatil, 'sharesRoot', together(pEn, pEs)),
            relation('fr-es-portable-root', frPortable, esPortatil, 'sharesRoot', together(pFr, pEs)),
            relation('en-fr-portable-translation', enPortableSense, frPortableSense, 'translationEquivalent', together(pEn, pFr)),
            relation('en-es-portable-translation', enPortableSense, esPortatilSense, 'translationEquivalent', together(pEn, pEs)),
            relation('en-transport-portable-root', enTransport, enPortable, 'sharesRoot', together(tEn, pEn)),
            relation('fr-transporter-portable-root', frTransporter, frPortable, 'sharesRoot', together(tFr, pFr)),
            relation('es-transportar-portatil-root', esTransportar, esPortatil, 'sharesRoot', together(tEs, pEs)),

            relation('en-actual-latin', enActual, actualis, 'borrowedFrom', aEn, 'ultimately borrowed from, through Middle English and Anglo-Norman', { pathSummary: 'Middle English and Anglo-Norman from Late Latin' }),
            relation('fr-actuel-latin', frActuel, actualis, 'borrowedFrom', aFr),
            relation('es-actual-latin', esActual, actualis, 'borrowedFrom', aEs),
            relation('en-fr-actual-root', enActual, frActuel, 'sharesRoot', together(aEn, aFr)),
            relation('en-es-actual-root', enActual, esActual, 'sharesRoot', together(aEn, aEs)),
            relation('fr-es-actual-root', frActuel, esActual, 'sharesRoot', together(aFr, aEs)),
            relation('en-fr-actual-false-friend', enActualSense, frActuelSense, 'falseFriendOf', together(aEn, aFr), 'differs in current meaning from'),
            relation('en-es-actual-false-friend', enActualSense, esActualSense, 'falseFriendOf', together(aEn, aEs), 'differs in current meaning from'),
            relation('fr-es-actual-translation', frActuelSense, esActualSense, 'translationEquivalent', together(aFr, aEs)),
            relation('en-actual-semantic-shift', enActualSense, actualis, 'semanticShiftFrom', aEn),
            relation('fr-actuel-semantic-shift', frActuelSense, actualis, 'semanticShiftFrom', aFr),
            relation('es-actual-semantic-shift', esActualSense, actualis, 'semanticShiftFrom', aEs),

            // night/nuit/noche are a genuine inherited common-origin set. The
            // intermediate etymons keep inheritance paths visible instead of
            // drawing a misleading direct edge from each modern word to PIE.
            relation('en-night-old-english', enNight, oldEnglishNiht, 'inheritedFrom', nEn),
            relation('old-english-niht-proto-germanic', oldEnglishNiht, protoGermanicNahts, 'inheritedFrom', nEn),
            relation('proto-germanic-nahts-pie', protoGermanicNahts, protoIndoEuropeanNokts, 'inheritedFrom', nEn),
            relation('fr-nuit-old-french', frNuit, oldFrenchNuit, 'inheritedFrom', nFr),
            relation('old-french-nuit-latin', oldFrenchNuit, latinNoctem, 'inheritedFrom', nFr),
            relation('es-noche-old-spanish', esNoche, oldSpanishNoche, 'inheritedFrom', nEs),
            relation('old-spanish-noche-latin', oldSpanishNoche, latinNoctem, 'inheritedFrom', nEs),
            relation('latin-noctem-pie', latinNoctem, protoIndoEuropeanNokts, 'inheritedFrom', together(nFr, nEs)),
            relation('en-fr-night-cognate', enNight, frNuit, 'cognateWith', together(nEn, nFr)),
            relation('en-es-night-cognate', enNight, esNoche, 'cognateWith', together(nEn, nEs)),
            relation('fr-es-night-cognate', frNuit, esNoche, 'cognateWith', together(nFr, nEs)),
            relation('en-fr-night-translation', enNightSense, frNuitSense, 'translationEquivalent', together(nEn, nFr)),
            relation('en-es-night-translation', enNightSense, esNocheSense, 'translationEquivalent', together(nEn, nEs)),
        ];
        return { schemaVersion: SNAPSHOT_VERSION, dataset, nodes, relationships };
    }

    const PILOT_SNAPSHOT = createPilotSnapshot();

    return {
        VERSION,
        SNAPSHOT_VERSION,
        OUTLINE_VERSION,
        ACG_VERSION,
        NODE_TYPES: NODE_TYPES.slice(),
        RELATION_TYPES: RELATION_TYPES.slice(),
        VERIFICATION_TYPES: VERIFICATION_TYPES.slice(),
        LIMITS: {
            maxGraphNodes: MAX_GRAPH_NODES,
            maxGraphEdges: MAX_GRAPH_EDGES,
            maxDepth: MAX_DEPTH,
            maxSnapshotNodes: MAX_SNAPSHOT_NODES,
            maxSnapshotEdges: MAX_SNAPSHOT_EDGES
        },
        PILOT_SNAPSHOT,
        normalizeLanguage,
        languageName,
        makeLexemeId,
        makeSenseId,
        expectedDirection,
        validateSnapshot,
        validateGraph,
        createLocalProvider,
        deriveAccessibleOutline,
        toACG,
        toConceptGraph: toACG
    };
});
