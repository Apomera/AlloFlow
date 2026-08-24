/*
 * AlloFlow local standards provider.
 *
 * This module deliberately reads an already-bundled snapshot. It does not
 * fetch, call an API, or infer authority from a fuzzy match. A future remote
 * adapter can implement the same small provider contract without changing
 * lesson-generation consumers.
 */
(function registerStandardsProvider(root, factory) {
    const api = factory(root || (typeof globalThis !== 'undefined' ? globalThis : {}));
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (root) {
        root.AlloModules = root.AlloModules || {};
        root.AlloModules.StandardsProvider = api;
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function createStandardsProvider(root) {
    'use strict';

    const VERSION = 'alloflow-standards-snapshot/v1';
    const MAX_TEXT = 600;
    const MAX_RESULTS = 50;
    // Minimum matched information for a hit to be offered at all. Tuned
    // against the 2,345 shipped standards: at 4 a context seed with no lexical
    // hook ("Geckos", "camouflage") correctly returns nothing, while a goal
    // sentence still finds its standard.
    const MIN_QUERY_WEIGHT = 4;

    // Singular/plural only. "fractions" must match a standard that says
    // "fraction" — that mismatch alone made correct seeds return nothing.
    // Deliberately not a full stemmer: aggressive stemming conflates unrelated
    // words, and this corpus is small enough that the simple case is the case.
    function stemWord(word) {
        if (word.length > 4 && /ies$/.test(word)) return word.slice(0, -3) + 'y';
        if (word.length > 4 && /(ches|shes|sses|xes)$/.test(word)) return word.slice(0, -2);
        if (word.length > 3 && /s$/.test(word) && !/ss$/.test(word)) return word.slice(0, -1);
        return word;
    }
    const MAX_NODES = 100;
    const MAX_EDGES = 200;
    const MAX_DEPTH = 4;
    let registeredProvider = null;

    function isObject(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    function text(value, limit) {
        if (value === null || value === undefined) return '';
        return String(value).replace(/\s+/g, ' ').trim().slice(0, limit || MAX_TEXT);
    }

    function token(value) {
        return text(value, MAX_TEXT).toLocaleLowerCase();
    }

    function codeToken(value) {
        return token(value)
            .replace(/[\u2010-\u2015\u2212]/g, '-')
            .replace(/\s+/g, ' ');
    }

    function idToken(value) {
        return token(value);
    }

    function array(value) {
        return Array.isArray(value) ? value : [];
    }

    function uniqueStrings(values, limit) {
        const out = [];
        const seen = new Set();
        for (const value of array(values)) {
            const next = text(value, 500);
            if (!next || seen.has(next)) continue;
            seen.add(next);
            out.push(next);
            if (out.length >= (limit || 10)) break;
        }
        return out;
    }

    function issue(code, path, message) {
        return { code, path, message };
    }

    function normalizeSourceIntegrity(raw) {
        const value = isObject(raw) ? raw : {};
        const out = {};
        for (const name of ['nodes', 'relationships']) {
            if (!isObject(value[name])) continue;
            const file = value[name];
            out[name] = {
                bytes: Number.isSafeInteger(Number(file.bytes)) ? Number(file.bytes) : 0,
                sha256: text(file.sha256, 128),
                etag: text(file.etag, 240),
                lastModified: text(file.lastModified, 80),
                url: text(file.url, 800)
            };
        }
        return out;
    }

    function normalizeRecord(raw, path) {
        const value = isObject(raw) ? raw : {};
        const kind = text(value.kind || 'standard', 40).toLocaleLowerCase() || 'standard';
        const resolvable = value.resolvable === undefined
            ? kind === 'standard'
            : value.resolvable !== false && value.resolvable !== 'false';
        return {
            id: text(value.id, 240),
            code: text(value.code, 240),
            label: text(value.label, MAX_TEXT),
            text: text(value.text || value.description, MAX_TEXT),
            kind,
            resolvable,
            framework: text(value.framework, 160),
            frameworkId: text(value.frameworkId, 240),
            jurisdiction: text(value.jurisdiction, 160),
            grade: text(value.grade, 80),
            subject: text(value.subject, 160),
            sourceUrl: text(value.sourceUrl, 800),
            sourceUrls: uniqueStrings(value.sourceUrls, 10),
            _path: path
        };
    }

    function normalizeRelationship(raw, path) {
        const value = isObject(raw) ? raw : {};
        return {
            fromId: text(value.fromId || value.sourceId || value.from, 240),
            toId: text(value.toId || value.targetId || value.to, 240),
            type: text(value.type || value.relation, 120),
            source: text(value.source, 500),
            _path: path
        };
    }

    function publicRecord(record) {
        if (!record) return null;
        const out = Object.assign({}, record);
        delete out._path;
        return out;
    }

    function publicRelationship(relationship) {
        const out = Object.assign({}, relationship);
        delete out._path;
        return out;
    }


    // Every TeX command that appears in the shipped snapshots, with its count
    // at the time of writing. Anything outside this list is left alone rather
    // than guessed at, so an unknown command degrades to its own source text.
    const TEX_SYMBOLS = [
        ['times', '\u00d7'],   // 82
        ['div', '\u00f7'],     // 32
        ['theta', '\u03b8'],   // 16
        ['pi', '\u03c0'],      // 14
        ['degree', '\u00b0'],  // 8
        ['circ', '\u00b0'],    // 2
        ['Box', '\u25a1'],     // 6
        ['neq', '\u2260'],     // 6
        ['approx', '\u2248'],  // 2
        ['geq', '\u2265'],     // 2
        ['sin', 'sin'],         // 8
        ['cos', 'cos'],         // 6
        ['tan', 'tan'],         // 4
        ['left', ''],           // 6 — sizing hints, no glyph
        ['right', '']           // 6
    ];
    // \frac{1}{2} -> 1/2. Run to a fixed point so a nested numerator resolves
    // from the inside out; the loop is bounded because each pass removes a
    // \frac, and the snapshots never nest more than one deep.
    function expandFractions(source) {
        let out = String(source);
        for (let pass = 0; pass < 6; pass += 1) {
            const next = out.replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, (all, top, bottom) => {
                const a = top.trim();
                const b = bottom.trim();
                // Parenthesise anything that is not a bare term, so
                // \frac{a+b}{c} does not silently become a+b/c.
                const wrap = (part) => (/^[A-Za-z0-9.]+$/.test(part) ? part : '(' + part + ')');
                return wrap(a) + '/' + wrap(b);
            });
            if (next === out) break;
            out = next;
        }
        return out;
    }
    // Turn the TeX that appears in standard text into readable plain text.
    // This is a DISPLAY helper: it never touches stored records, and the
    // search index still runs over the original text.
    function toPlainMath(value) {
        if (value == null) return '';
        let out = String(value);
        if (out.indexOf('\\') < 0 && out.indexOf('$') < 0) return out;
        out = expandFractions(out);
        out = out.replace(/\\sqrt\s*\{([^{}]*)\}/g, (all, inner) => '\u221a' + inner.trim());
        for (const [name, glyph] of TEX_SYMBOLS) {
            // (?![a-zA-Z]) so \circ is not eaten by a \c rule and \times does
            // not match inside a longer command name.
            out = out.replace(new RegExp('\\\\' + name + '(?![a-zA-Z])', 'g'), glyph);
        }
        // Delimiters last: by here the content between them is already plain.
        out = out.replace(/\$/g, '');
        return out.replace(/\s+/g, ' ').trim();
    }

    function validateSnapshot(input) {
        const errors = [];
        const warnings = [];
        if (!isObject(input)) {
            return { ok: false, errors: [issue('snapshot-type', '$', 'Snapshot must be an object.')], warnings, value: null };
        }
        if (input.schemaVersion !== VERSION) {
            errors.push(issue('schema-version', '$.schemaVersion', `Expected ${VERSION}.`));
        }
        const rawDataset = isObject(input.dataset) ? input.dataset : {};
        const dataset = {
            provider: text(rawDataset.provider, 160),
            datasetVersion: text(rawDataset.datasetVersion, 160),
            snapshotId: text(rawDataset.snapshotId, 240),
            generatedAt: text(rawDataset.generatedAt, 80),
            license: text(rawDataset.license, 600),
            attribution: text(rawDataset.attribution, 600),
            contentDigest: text(rawDataset.contentDigest, 80),
            sourceIntegrity: normalizeSourceIntegrity(rawDataset.sourceIntegrity),
            sourceUrls: uniqueStrings(rawDataset.sourceUrls, 20)
        };
        for (const field of ['provider', 'datasetVersion', 'snapshotId']) {
            if (!dataset[field]) errors.push(issue('dataset-field-required', `$.dataset.${field}`, `${field} is required.`));
        }
        if (!dataset.license) warnings.push(issue('dataset-license-missing', '$.dataset.license', 'A license or usage note is recommended.'));
        if (!dataset.attribution) warnings.push(issue('dataset-attribution-missing', '$.dataset.attribution', 'Attribution is recommended.'));

        if (!Array.isArray(input.standards)) {
            errors.push(issue('standards-type', '$.standards', 'standards must be an array.'));
        }
        const standards = [];
        const ids = new Set();
        for (let index = 0; index < array(input.standards).length; index += 1) {
            const path = `$.standards[${index}]`;
            const record = normalizeRecord(input.standards[index], path);
            if (!record.id || !record.code || !record.label) {
                errors.push(issue('standard-field-required', path, 'Each standard requires id, code, and label.'));
                continue;
            }
            if (ids.has(idToken(record.id))) {
                errors.push(issue('duplicate-standard-id', `${path}.id`, `Duplicate standard id: ${record.id}.`));
                continue;
            }
            ids.add(idToken(record.id));
            standards.push(record);
        }
        if (!standards.length) errors.push(issue('standards-empty', '$.standards', 'At least one valid standard is required.'));

        if (!Array.isArray(input.relationships)) {
            warnings.push(issue('relationships-missing', '$.relationships', 'No relationships were supplied; the graph will contain isolated standards.'));
        }
        const relationships = [];
        for (let index = 0; index < array(input.relationships).length; index += 1) {
            const path = `$.relationships[${index}]`;
            const relationship = normalizeRelationship(input.relationships[index], path);
            const fromExists = ids.has(idToken(relationship.fromId));
            const toExists = ids.has(idToken(relationship.toId));
            if (!relationship.fromId || !relationship.toId || !relationship.type) {
                warnings.push(issue('relationship-incomplete', path, 'Relationship missing an endpoint or type; it was dropped.'));
            } else if (!fromExists || !toExists) {
                warnings.push(issue('relationship-missing-node', path, 'Relationship endpoint is not present; it was dropped.'));
            } else {
                relationships.push(relationship);
            }
        }

        const value = errors.length ? null : {
            schemaVersion: VERSION,
            dataset,
            standards,
            relationships
        };
        return { ok: errors.length === 0, errors, warnings, value };
    }

    function cloneManifest(dataset) {
        return {
            schemaVersion: VERSION,
            provider: dataset.provider,
            datasetVersion: dataset.datasetVersion,
            snapshotId: dataset.snapshotId,
            generatedAt: dataset.generatedAt,
            license: dataset.license,
            attribution: dataset.attribution,
            contentDigest: dataset.contentDigest,
            sourceIntegrity: dataset.sourceIntegrity,
            sourceUrls: dataset.sourceUrls.slice()
        };
    }

    function normalizeFilters(filters) {
        const input = isObject(filters) ? filters : {};
        const out = {};
        for (const field of ['framework', 'jurisdiction', 'grade', 'subject']) {
            if (input[field] !== undefined && input[field] !== null && text(input[field], 160)) {
                out[field] = token(input[field]);
            }
        }
        return out;
    }

    function matchesFilters(record, filters) {
        for (const field of ['framework', 'jurisdiction', 'grade', 'subject']) {
            if (filters[field] && token(record[field]) !== filters[field]) return false;
        }
        return true;
    }

    function compareRecords(a, b) {
        return codeToken(a.record.code).localeCompare(codeToken(b.record.code))
            || token(a.record.framework).localeCompare(token(b.record.framework))
            || idToken(a.record.id).localeCompare(idToken(b.record.id));
    }

    // Words a teacher says AROUND a goal rather than in it. They must be
    // dropped BEFORE rarity weighting, not after: they are rare in standards
    // prose — "students" occurs in 3 of 2345 shipped standards and "will" in
    // 15 — so inverse-document-frequency hands them more weight than any real
    // term. Measured: with "will" left in, "students will compare two
    // fractions" ranked a two-way-frequency-table standard above every
    // fraction standard in the corpus.
    const QUERY_FRAMING_WORDS = new Set([
        'students', 'student', 'teach', 'teaching', 'taught', 'lesson', 'lessons',
        'class', 'classroom', 'kids', 'children', 'want', 'wants', 'need', 'needs',
        'help', 'going', 'will', 'shall', 'would', 'could', 'should', 'able',
        'them', 'they', 'their', 'this', 'that', 'with', 'from', 'have', 'has', 'had',
        'about', 'what', 'when', 'where', 'why', 'how', 'the', 'and', 'for', 'are',
        'can', 'into', 'unit', 'plan', 'planning', 'activity', 'activities',
        'learn', 'learning', 'learners', 'cover', 'covering', 'doing', 'make',
        'making', 'get', 'getting', 'also', 'some', 'more', 'than', 'been', 'being'
    ]);

    // Rank by how much INFORMATION matched, not by what fraction of the query
    // matched. Coverage scoring rewards a standard for containing the query's
    // junk words, which is how a sentence-shaped goal used to land on the wrong
    // standard. `idf` is supplied by the provider, which alone can see the
    // corpus; without it this falls back to presence-only scoring.
    function queryScore(record, query, index) {
        if (!query) return 0;
        const code = codeToken(record.code);
        const id = idToken(record.id);
        const label = token(record.label);
        const body = token(`${record.label} ${record.text} ${record.code} ${record.id}`);
        if (code === query) return 1000;
        if (id === query) return 950;
        if (label === query) return 900;
        if (label.indexOf(query) === 0) return 800;
        const parts = query.split(/[^a-z0-9]+/).filter(Boolean);
        // Tokens under 3 characters occur almost everywhere — splitting
        // "3.OA.A.1" yields parts present in 1613 / 91 / 2344 / 2311 standards
        // — so a query made only of fragments has no lexical signal at all and
        // must fall through to substring matching rather than fuzzy scoring.
        const terms = Array.from(new Set(parts.filter((p) => p.length >= 3 && !QUERY_FRAMING_WORDS.has(p)).map(stemWord)));
        if (!terms.length) return body.indexOf(query) >= 0 ? 400 : 0;
        const weigh = (index && typeof index.idf === 'function') ? index.idf : () => 1;
        const stems = (index && typeof index.stemsFor === 'function') ? index.stemsFor(record) : null;
        let weight = 0;
        let hits = 0;
        for (const term of terms) {
            // Stem set first (whole-word, plural-tolerant), raw substring as
            // a fallback so partial words like "fraction" in "fractional" are
            // not lost.
            if ((stems && stems.has(term)) || body.indexOf(term) >= 0) { weight += weigh(term); hits += 1; }
        }
        if (!hits) return body.indexOf(query) >= 0 ? 400 : 0;
        // One incidental word is not a match. Without this, "our school
        // garden" pulled in 133 standards on the strength of "school" alone.
        if (terms.length >= 2 && hits < 2) return 0;
        if (weight < MIN_QUERY_WEIGHT) return 0;
        if (hits === terms.length) return 650;
        return Math.min(649, 400 + Math.round(weight * 18));
    }

    function makeError(message, report) {
        const error = new Error(message);
        error.report = report;
        return error;
    }

    function createLocalProvider(snapshot) {
        const report = validateSnapshot(snapshot);
        if (!report.ok) throw makeError('Invalid local standards snapshot.', report);
        const value = report.value;
        const byId = new Map();
        const adjacency = new Map();
        for (const record of value.standards) {
            byId.set(idToken(record.id), record);
            adjacency.set(idToken(record.id), []);
        }
        // Document frequency over the snapshot, built once. queryScore needs
        // to know which words are common HERE — "fractions" is rare and
        // meaningful, "text" is everywhere — and only this scope can see the
        // whole corpus.
        const docFreq = new Map();
        const stemIndex = new Map();
        for (const record of value.standards) {
            const seen = new Set(token(`${record.label} ${record.text}`).split(/[^a-z0-9]+/)
                .filter((w) => w.length >= 3).map(stemWord));
            stemIndex.set(idToken(record.id), seen);
            for (const word of seen) docFreq.set(word, (docFreq.get(word) || 0) + 1);
        }
        const corpusSize = Math.max(1, value.standards.length);
        const searchIndex = {
            idf: (term) => Math.log(corpusSize / (1 + (docFreq.get(term) || 0))),
            stemsFor: (record) => stemIndex.get(idToken(record && record.id)) || null
        };

        for (const relationship of value.relationships) {
            const from = idToken(relationship.fromId);
            const to = idToken(relationship.toId);
            adjacency.get(from).push({ relationship, otherId: to, direction: 'outgoing' });
            adjacency.get(to).push({ relationship, otherId: from, direction: 'incoming' });
        }

        function getRecord(id) {
            return byId.get(idToken(id)) || null;
        }

        function searchStandards(query, filters, options) {
            const normalizedQuery = token(query);
            const normalizedFilters = normalizeFilters(filters);
            const inputOptions = isObject(options) ? options : {};
            const maxResults = Math.max(1, Math.min(Number(inputOptions.maxResults) || MAX_RESULTS, MAX_RESULTS));
            const scored = [];
            for (const record of value.standards) {
                if (record.resolvable === false) continue;
                if (!matchesFilters(record, normalizedFilters)) continue;
                const score = queryScore(record, normalizedQuery, searchIndex);
                if (normalizedQuery && score === 0) continue;
                scored.push({ record, score });
            }
            scored.sort((a, b) => (b.score - a.score) || compareRecords(a, b));
            return {
                query: text(query, MAX_TEXT),
                filters: Object.assign({}, normalizedFilters),
                matches: scored.slice(0, maxResults).map((entry) => publicRecord(entry.record)),
                total: scored.length,
                truncated: scored.length > maxResults
            };
        }

        function exactCandidates(query, filters) {
            const normalizedQuery = token(query);
            const normalizedCode = codeToken(query);
            const normalizedFilters = normalizeFilters(filters);
            const codeMatches = value.standards.filter((record) => record.resolvable !== false && codeToken(record.code) === normalizedCode && matchesFilters(record, normalizedFilters));
            if (codeMatches.length) return codeMatches;
            const idMatches = value.standards.filter((record) => record.resolvable !== false && idToken(record.id) === normalizedQuery && matchesFilters(record, normalizedFilters));
            if (idMatches.length) return idMatches;
            return value.standards.filter((record) => record.resolvable !== false && token(record.label) === normalizedQuery && matchesFilters(record, normalizedFilters));
        }

        function contextFor(record, query) {
            const links = (adjacency.get(idToken(record.id)) || []).map((entry) => {
                const related = getRecord(entry.otherId);
                return {
                    id: related.id,
                    code: related.code,
                    label: related.label,
                    type: entry.relationship.type,
                    direction: entry.direction,
                    source: entry.relationship.source
                };
            });
            const contextInput = {
                inputText: text(query || record.code || record.id, MAX_TEXT),
                promptText: text(record.text || record.label, MAX_TEXT),
                standards: [Object.assign({}, publicRecord(record), { relationships: links })],
                provider: value.dataset.provider,
                datasetVersion: value.dataset.datasetVersion,
                snapshotId: value.dataset.snapshotId,
                sourceUrls: uniqueStrings([].concat(value.dataset.sourceUrls, record.sourceUrls, record.sourceUrl), 20),
                attribution: value.dataset.attribution,
                resolutionStatus: 'resolved',
                provenance: {
                    provider: value.dataset.provider,
                    datasetVersion: value.dataset.datasetVersion,
                    snapshotId: value.dataset.snapshotId,
                    sourceUrls: uniqueStrings([].concat(value.dataset.sourceUrls, record.sourceUrls, record.sourceUrl), 20),
                    resolutionStatus: 'resolved',
                    license: value.dataset.license,
                    attribution: value.dataset.attribution,
                    contentDigest: value.dataset.contentDigest,
                    sourceIntegrity: value.dataset.sourceIntegrity
                }
            };
            const standardsContext = root && root.AlloModules && root.AlloModules.StandardsContext;
            let context = standardsContext && typeof standardsContext.resolve === 'function'
                ? standardsContext.resolve(contextInput)
                : contextInput;
            context = Object.assign({}, context, {
                attribution: value.dataset.attribution,
                provenance: Object.assign({}, context.provenance, { attribution: value.dataset.attribution })
            });
            return context;
        }

        function resolveStandard(query, filters, options) {
            const candidates = exactCandidates(query, filters);
            if (candidates.length === 1) {
                const match = publicRecord(candidates[0]);
                return {
                    status: 'resolved',
                    query: text(query, MAX_TEXT),
                    match,
                    candidates: [match],
                    context: contextFor(candidates[0], query)
                };
            }
            if (candidates.length > 1) {
                return {
                    status: 'ambiguous',
                    query: text(query, MAX_TEXT),
                    match: null,
                    candidates: candidates.slice().sort((a, b) => compareRecords({ record: a }, { record: b })).map(publicRecord),
                    context: null
                };
            }
            const search = searchStandards(query, filters, options);
            return {
                status: 'not-found',
                query: text(query, MAX_TEXT),
                match: null,
                candidates: search.matches,
                context: null
            };
        }

        function getStandardContext(id) {
            const record = getRecord(id);
            return record && record.resolvable !== false ? contextFor(record, record.code || record.id) : null;
        }

        function getNeighborhood(id, options) {
            const rootRecord = getRecord(id);
            if (!rootRecord) return null;
            const inputOptions = isObject(options) ? options : {};
            const maxDepth = Math.max(0, Math.min(Number(inputOptions.depth) || 1, MAX_DEPTH));
            const maxNodes = Math.max(1, Math.min(Number(inputOptions.maxNodes) || MAX_NODES, MAX_NODES));
            const maxEdges = Math.max(0, Math.min(Number(inputOptions.maxEdges) || MAX_EDGES, MAX_EDGES));
            // Component-flooding guard. In --include-components snapshots a single standard can
            // carry dozens of LearningComponents over `supports` edges (L.1.1.h in ccss-ela has
            // 38), and an uncapped BFS spends the whole node budget on them, starving the
            // related standards, clusters and progression context this method exists to return.
            // Components may take at most a third of the node budget (never fewer than 4)
            // unless the caller overrides with options.maxComponents. Skipped components mark
            // the result truncated, so callers see coverage was bounded rather than complete.
            const maxComponents = Number.isFinite(Number(inputOptions.maxComponents))
                ? Math.max(0, Number(inputOptions.maxComponents))
                : Math.max(4, Math.floor(maxNodes / 3));
            let componentCount = 0;
            const rootId = idToken(rootRecord.id);
            const depths = new Map([[rootId, 0]]);
            const queue = [rootId];
            const nodeIds = new Set([rootId]);
            const edges = [];
            let truncated = false;
            while (queue.length) {
                const current = queue.shift();
                const currentDepth = depths.get(current);
                if (currentDepth >= maxDepth) continue;
                for (const entry of adjacency.get(current) || []) {
                    const otherId = entry.otherId;
                    if (edges.length >= maxEdges) {
                        truncated = true;
                        break;
                    }
                    const relationship = publicRelationship(entry.relationship);
                    const edge = Object.assign({}, relationship, {
                        direction: entry.direction,
                        fromId: relationship.fromId,
                        toId: relationship.toId
                    });
                    if (!nodeIds.has(otherId)) {
                        if (nodeIds.size >= maxNodes) {
                            truncated = true;
                            continue;
                        }
                        const otherRecord = byId.get(otherId);
                        if (otherRecord && otherRecord.kind === 'component') {
                            if (componentCount >= maxComponents) {
                                truncated = true;
                                continue;
                            }
                            componentCount += 1;
                        }
                        nodeIds.add(otherId);
                        depths.set(otherId, currentDepth + 1);
                        queue.push(otherId);
                    }
                    if (edges.length >= maxEdges) {
                        truncated = true;
                        break;
                    }
                    const edgeKey = `${edge.fromId}|${edge.toId}|${edge.type}`;
                    if (!edges.some((existing) => `${existing.fromId}|${existing.toId}|${existing.type}` === edgeKey)) edges.push(edge);
                }
            }
            const nodes = Array.from(nodeIds).map((nodeId) => publicRecord(byId.get(nodeId))).filter(Boolean);
            nodes.sort((a, b) => (a.id === rootRecord.id ? -1 : b.id === rootRecord.id ? 1 : compareRecords({ record: a }, { record: b })));
            return {
                rootId: rootRecord.id,
                depth: maxDepth,
                nodes,
                relationships: edges,
                truncated
            };
        }

        // Directed progression lookups over buildsTowards / relatesTo edges.
        //
        // Direction semantics were verified empirically against the CCSS Math
        // snapshot before this was written: across all 757 buildsTowards edges,
        // fromId is never a later grade than toId (370 ascend a grade, 387 are
        // within-grade, 0 descend). So "A buildsTowards B" reads "A comes
        // before B", and the prerequisites of X are the SOURCES of X's
        // incoming buildsTowards edges. relatesTo carries no direction and is
        // surfaced symmetrically.
        //
        // Teacher-facing lists contain only resolvable records — structural
        // grouping/framework nodes stay traversal-only, same rule as
        // resolveStandard. Results are bounded and deterministically ordered.
        // includeUnresolvable is opt-in and off for every existing caller. Non-resolvable
        // records are normally structural scaffolding (frameworks, clusters) that must never
        // surface as a "related standard", hence the default skip. Learning components are the
        // one legitimate exception: they are deliberately non-resolvable so they stay out of
        // search, yet they are exactly what getLearningComponents is asked to return.
        function neighborsByType(record, type, direction, maxResults, includeUnresolvable) {
            const out = [];
            let truncated = false;
            for (const entry of adjacency.get(idToken(record.id)) || []) {
                if (entry.relationship.type !== type) continue;
                if (direction && entry.direction !== direction) continue;
                const other = byId.get(entry.otherId);
                if (!other) continue;
                if (other.resolvable === false && !includeUnresolvable) continue;
                if (out.length >= maxResults) { truncated = true; break; }
                out.push(publicRecord(other));
            }
            out.sort((a, b) => compareRecords({ record: a }, { record: b }));
            return { records: out, truncated };
        }

        function boundedMax(options) {
            const inputOptions = isObject(options) ? options : {};
            return Math.max(1, Math.min(Number(inputOptions.maxResults) || MAX_RESULTS, MAX_RESULTS));
        }

        function getPrerequisites(id, options) {
            const record = getRecord(id);
            if (!record || record.resolvable === false) return null;
            const maxResults = boundedMax(options);
            const before = neighborsByType(record, 'buildsTowards', 'incoming', maxResults);
            const after = neighborsByType(record, 'buildsTowards', 'outgoing', maxResults);
            return {
                standard: publicRecord(record),
                prerequisites: before.records,
                leadsTo: after.records,
                truncated: before.truncated || after.truncated,
                // Provenance, not certification: these edges come from the
                // snapshot's source dataset, and consumers must keep the
                // manifest's usage boundary (no high-stakes use) visible.
                edgeSource: 'buildsTowards',
                dataset: cloneManifest(value.dataset)
            };
        }

        function getRelatedStandards(id, options) {
            const record = getRecord(id);
            if (!record || record.resolvable === false) return null;
            const maxResults = boundedMax(options);
            const related = neighborsByType(record, 'relatesTo', null, maxResults);
            return {
                standard: publicRecord(record),
                related: related.records,
                truncated: related.truncated,
                edgeSource: 'relatesTo',
                dataset: cloneManifest(value.dataset)
            };
        }

        function getLearningComponents(id, options) {
            // NAMING WARNING — see getComponentCoverage. That function also says "component"
            // but means a standard's hasChild sub-statements, which are auditable. This one
            // means pedagogical LearningComponent nodes, which are not. Different edge, different
            // meaning; `edgeSource` on both returns is the reliable discriminator.
            //
            // Two possible sources, in order of authority:
            //
            //   1. Real LearningComponent nodes, attached to the standard by INCOMING
            //      `supports` edges. This is the upstream learning-components layer, and it
            //      only exists in snapshots built with --include-components.
            //   2. Otherwise the historical approximation: the standard's own hasChild
            //      children (cluster -> standard -> component parts).
            //
            // The approximation is kept because most shipped snapshots do not carry
            // components, and it is better than nothing — but it is a different thing, so
            // edgeSource always reports which one the caller got. Nothing is synthesized.
            const record = getRecord(id);
            if (!record) return null;
            const maxResults = boundedMax(options);
            const supported = neighborsByType(record, 'supports', 'incoming', maxResults, true);
            const children = supported.records.length ? supported : neighborsByType(record, 'hasChild', 'outgoing', maxResults);
            return {
                standard: record.resolvable === false ? null : publicRecord(record),
                components: children.records,
                truncated: children.truncated,
                edgeSource: supported.records.length ? 'supports' : 'hasChild',
                dataset: cloneManifest(value.dataset)
            };
        }

        function getPrerequisiteGaps(queries, options) {
            // Deterministic set difference, not inference: resolve each audited
            // query to a snapshot standard, then list the source-provided
            // buildsTowards SOURCES of those standards that are not themselves
            // in the audited set. Nothing here guesses — every listed gap is a
            // concrete edge in the reviewed dataset, and unresolved queries are
            // reported rather than silently dropped, so "no gaps" can never
            // mean "we could not read your standards".
            const list = array(queries).slice(0, MAX_RESULTS);
            const maxResults = boundedMax(options);
            const evaluated = [];
            const unresolved = [];
            const coveredIds = new Set();
            const resolvedRecords = [];
            for (const query of list) {
                const resolution = resolveStandard(query);
                if (resolution && resolution.status === 'resolved' && resolution.match) {
                    coveredIds.add(idToken(resolution.match.id));
                    resolvedRecords.push({ query: text(query, MAX_TEXT), record: byId.get(idToken(resolution.match.id)) });
                } else {
                    unresolved.push({ query: text(query, MAX_TEXT), status: resolution ? resolution.status : 'unresolved' });
                }
            }
            const missingById = new Map();
            for (const entry of resolvedRecords) {
                const prereqs = neighborsByType(entry.record, 'buildsTowards', 'incoming', maxResults);
                const missingIds = [];
                for (const prereq of prereqs.records) {
                    if (coveredIds.has(idToken(prereq.id))) continue;
                    missingIds.push(prereq.id);
                    const existing = missingById.get(idToken(prereq.id));
                    if (existing) {
                        if (!existing.buildsToward.includes(entry.record.code)) existing.buildsToward.push(entry.record.code);
                    } else if (missingById.size < maxResults) {
                        missingById.set(idToken(prereq.id), Object.assign({}, prereq, { buildsToward: [entry.record.code] }));
                    }
                }
                evaluated.push({
                    query: entry.query,
                    standard: publicRecord(entry.record),
                    prerequisiteCount: prereqs.records.length,
                    missingIds,
                    truncated: prereqs.truncated
                });
            }
            const missing = Array.from(missingById.values());
            missing.sort((a, b) => compareRecords({ record: a }, { record: b }));
            // prerequisiteEdgesExamined is the count of buildsTowards edges actually looked at.
            // It exists because `missing.length === 0` has TWO meanings and they are opposite:
            // "checked, and the sequencing is complete" versus "there was nothing to check".
            // Only ccss-math carries buildsTowards edges (757, which is every one in the whole
            // Learning Commons v1.11.0 export); ccss-ela and ma-science-grade-5 have none. So an
            // ELA audit resolves its standards, finds 0 of 0 prerequisites, and a caller reading
            // only `missing.length` reports a clean bill of health for a check that never ran.
            // Callers MUST gate any "no missing prerequisites" claim on this being > 0.
            const prerequisiteEdgesExamined = evaluated.reduce((total, entry) => total + (entry.prerequisiteCount || 0), 0);
            return {
                evaluated,
                missing,
                unresolved,
                prerequisiteEdgesExamined,
                edgeSource: 'buildsTowards',
                dataset: cloneManifest(value.dataset)
            };
        }


        // A zero-input "surprise me" needs a standard nobody named for it.
        // Sampling belongs to the provider because only the provider holds the
        // records; handing the array out instead would let a caller mutate the
        // loaded snapshot.
        // CCSS puts the grade in the code and nowhere else, in three shapes:
        // leading (3.MD.A.1), embedded (RI.3.1), and banded (RST.11-12.7).
        function gradeOfCode(code) {
            const text = String(code || '');
            // HSA-SSE.B.3.c is high-school algebra, not grade 3 — the embedded
            // number there is a sub-part index. Only the HS prefix says so.
            if (/^HS/i.test(text)) return null;
            const hit = text.match(/^(K|\d{1,2}(?:-\d{1,2})?)\./) || text.match(/\.(K|\d{1,2}(?:-\d{1,2})?)\./);
            return hit ? hit[1].toUpperCase() : null;
        }
        function codeCoversGrade(code, wanted) {
            const found = gradeOfCode(code);
            if (!found || !wanted) return false;
            if (found === wanted) return true;
            // A band standard genuinely applies to every grade it spans, so
            // grade 11 must be able to draw an 11-12 standard.
            const band = found.match(/^(\d{1,2})-(\d{1,2})$/);
            const asNumber = Number(wanted);
            return Boolean(band) && Number.isFinite(asNumber)
                && asNumber >= Number(band[1]) && asNumber <= Number(band[2]);
        }
        // The grade selector hands over free text: "Grade 3", "5th", "K",
        // "Kindergarten". Word boundaries alone do not cut those apart.
        function wantedGrade(raw) {
            const text = String(raw || '');
            if (/kinder/i.test(text) || /(^|\W)k(\W|$)/i.test(text)) return 'K';
            const digits = text.match(/\d{1,2}/);
            return digits ? digits[0] : null;
        }
        function sampleStandards(options) {
            const opts = options || {};
            const want = Math.max(1, Math.min(20, Number(opts.count) || 1));
            const wanted = wantedGrade(opts.gradeLevel);
            const usable = value.standards.filter((r) => r.resolvable !== false && String(r.code || '').trim());
            // Fall back to the whole corpus rather than returning nothing: a
            // grade with no coverage is a reason to widen, not to fail.
            const graded = wanted ? usable.filter((r) => codeCoversGrade(r.code, wanted)) : [];
            const pool = graded.length ? graded : usable;
            const picked = [];
            const taken = new Set();
            for (let guard = 0; picked.length < Math.min(want, pool.length) && guard < pool.length * 8; guard += 1) {
                const at = Math.floor(Math.random() * pool.length);
                if (taken.has(at)) continue;
                taken.add(at);
                picked.push(publicRecord(pool[at]));
            }
            return { standards: picked, pool: pool.length, gradeFiltered: graded.length > 0 };
        }
        function getComponentCoverage(queries, options) {
            // NAMING WARNING — this is NOT getLearningComponents, and the two words "component"
            // mean different things:
            //
            //   getComponentCoverage   hasChild   sub-STATEMENTS of a standard (5.MD.A.1 ->
            //                                     5.MD.A.1a). Things a teacher can audit against,
            //                                     hence "is it in the audited set".
            //   getLearningComponents  supports   pedagogical LearningComponent nodes ("Act out
            //                                     'look'"). Never in an audited set.
            //
            // Do not "fix" this one to use `supports` for symmetry. LearningComponents can never
            // be members of an audited set, so it would report 0% coverage forever. Both
            // functions report their edge type in `edgeSource`; trust that, not the name.
            //
            // Component-level alignment by SET MEMBERSHIP, the same spine as
            // getPrerequisiteGaps: resolve the audited standards, then for each
            // one that has source-provided hasChild components, report which
            // components are themselves in the audited set and which are not.
            // "You audited the cluster but only 2 of its 4 component standards
            // appear in the audited set" — a concrete, checkable statement.
            // Nothing maps free-text evidence onto components; that would be
            // inference wearing a coverage badge.
            const list = array(queries).slice(0, MAX_RESULTS);
            const maxResults = boundedMax(options);
            const unresolved = [];
            const coveredIds = new Set();
            const resolvedRecords = [];
            for (const query of list) {
                const resolution = resolveStandard(query);
                if (resolution && resolution.status === 'resolved' && resolution.match) {
                    coveredIds.add(idToken(resolution.match.id));
                    resolvedRecords.push({ query: text(query, MAX_TEXT), record: byId.get(idToken(resolution.match.id)) });
                } else {
                    unresolved.push({ query: text(query, MAX_TEXT), status: resolution ? resolution.status : 'unresolved' });
                }
            }
            const evaluated = [];
            for (const entry of resolvedRecords) {
                const children = neighborsByType(entry.record, 'hasChild', 'outgoing', maxResults);
                if (!children.records.length) continue;   // leaf standards are not "0% covered"
                const components = children.records.map((component) => ({
                    ...component,
                    covered: coveredIds.has(idToken(component.id))
                }));
                evaluated.push({
                    query: entry.query,
                    standard: publicRecord(entry.record),
                    components,
                    coveredCount: components.filter((component) => component.covered).length,
                    truncated: children.truncated
                });
            }
            return {
                evaluated,
                unresolved,
                edgeSource: 'hasChild',
                dataset: cloneManifest(value.dataset)
            };
        }

        return {
            VERSION,
            getManifest: () => cloneManifest(value.dataset),
            // Contract name from the Learning Web plan; same object as
            // getManifest, kept as an alias rather than a second code path.
            getDatasetManifest: () => cloneManifest(value.dataset),
            getValidationReport: () => ({ ok: report.ok, errors: report.errors.slice(), warnings: report.warnings.slice() }),
            searchStandards,
            resolveStandard,
            getStandardContext,
            getNeighborhood,
            getPrerequisites,
            getRelatedStandards,
            getLearningComponents,
            getPrerequisiteGaps,
            getComponentCoverage,
            sampleStandards
        };
    }

    // Multi-snapshot registry.
    //
    // registerLocalSnapshot used to hold a SINGLE slot, so loading a second
    // snapshot module silently replaced the first — with three reviewed
    // snapshots shipped (MA science, CCSS math, CCSS ELA) and loadModule
    // injecting async script tags in no guaranteed order, that meant "which
    // standards exist" depended on network timing. Snapshots are now keyed by
    // snapshotId (re-registering the same id is idempotent), and the exposed
    // provider is rebuilt over the union: standards deduped by id,
    // relationships by from|to|type. Each snapshot is still validated
    // INDIVIDUALLY first, so one bad file cannot poison the union, and a
    // single registered snapshot behaves exactly as before.
    const registeredSnapshots = new Map();
    // Lazy-rebuild flag: registrations mark the union stale instead of paying
    // for the full stem/index build per registration. Three 2-5 MB snapshots
    // register during app boot; the eager build-per-registration (plus a full
    // throwaway index build used only for validation) produced multi-second
    // main-thread long tasks in the first seconds of every session.
    let registeredProviderDirty = false;

    function rebuildRegisteredProvider() {
        registeredProviderDirty = false;
        if (registeredSnapshots.size === 0) { registeredProvider = null; return null; }
        const snapshots = Array.from(registeredSnapshots.values());
        if (snapshots.length === 1) {
            registeredProvider = createLocalProvider(snapshots[0]);
            return registeredProvider;
        }
        const seenIds = new Set();
        const standards = [];
        const seenEdges = new Set();
        const relationships = [];
        for (const snap of snapshots) {
            for (const record of snap.standards) {
                const key = idToken(record.id);
                if (seenIds.has(key)) continue;
                seenIds.add(key);
                standards.push(record);
            }
            for (const relationship of snap.relationships) {
                const key = `${idToken(relationship.fromId)}|${idToken(relationship.toId)}|${relationship.type}`;
                if (seenEdges.has(key)) continue;
                seenEdges.add(key);
                relationships.push(relationship);
            }
        }
        const first = snapshots[0];
        const combinedFrom = snapshots.map((s) => ({
            snapshotId: s.dataset && s.dataset.snapshotId,
            datasetVersion: s.dataset && s.dataset.datasetVersion,
            provider: s.dataset && s.dataset.provider
        }));
        const dataset = Object.assign({}, first.dataset, {
            snapshotId: 'combined:' + combinedFrom.map((c) => c.snapshotId || 'unknown').join('+')
        });
        const base = createLocalProvider({
            schemaVersion: first.schemaVersion,
            dataset,
            standards,
            relationships
        });
        // The validator normalizes the dataset to known fields, so combinedFrom
        // cannot ride through it — decorate the manifest accessors instead.
        // Every per-result `dataset` still carries the combined snapshotId,
        // which names its parts; this adds the structured list at the top.
        const withParts = (manifest) => Object.assign(manifest, {
            combinedFrom: combinedFrom.map((entry) => Object.assign({}, entry))
        });
        registeredProvider = Object.assign({}, base, {
            getManifest: () => withParts(base.getManifest()),
            getDatasetManifest: () => withParts(base.getDatasetManifest())
        });
        return registeredProvider;
    }

    function scheduleIdleProviderRebuild() {
        // Build the union index during browser idle time so the first consumer
        // usually finds it ready without anyone paying for it mid-boot. The
        // getRegisteredProvider() fallback below keeps correctness if a
        // consumer arrives first (or no idle callback exists, as in tests).
        const run = () => { if (registeredProviderDirty) rebuildRegisteredProvider(); };
        if (root && typeof root.requestIdleCallback === 'function') root.requestIdleCallback(run, { timeout: 10000 });
        else if (root && typeof root.setTimeout === 'function') root.setTimeout(run, 2000);
    }

    function registerLocalSnapshot(snapshot) {
        // Validate the individual snapshot first — unchanged failure behavior,
        // but via validateSnapshot alone: the previous createLocalProvider call
        // built a full throwaway search index just to validate.
        const report = validateSnapshot(snapshot);
        if (!report.ok) throw makeError('Invalid local standards snapshot.', report);
        const key = (snapshot && snapshot.dataset && snapshot.dataset.snapshotId) || ('unkeyed:' + registeredSnapshots.size);
        registeredSnapshots.set(key, snapshot);
        // No caller consumes the returned provider (snapshot module tails and
        // drainInjectedSnapshots both ignore it), so registration no longer
        // returns the eagerly built union.
        registeredProviderDirty = true;
        scheduleIdleProviderRebuild();
        return null;
    }

    function getRegisteredProvider() {
        if (registeredProviderDirty) rebuildRegisteredProvider();
        return registeredProvider;
    }

    function getRegisteredSnapshotManifests() {
        return Array.from(registeredSnapshots.values()).map((snap) => cloneManifest(snap.dataset));
    }

    function clearRegisteredProvider() {
        registeredSnapshots.clear();
        registeredProvider = null;
        registeredProviderDirty = false;
    }

    function drainInjectedSnapshots() {
        if (!root) return;
        const injected = [];
        if (root.__ALLO_LOCAL_STANDARDS_SNAPSHOT__) injected.push(root.__ALLO_LOCAL_STANDARDS_SNAPSHOT__);
        if (Array.isArray(root.__ALLO_LOCAL_STANDARDS_SNAPSHOTS__)) injected.push(...root.__ALLO_LOCAL_STANDARDS_SNAPSHOTS__);
        for (const snapshot of injected) {
            try {
                registerLocalSnapshot(snapshot);
            } catch (error) {
                if (root.console && typeof root.console.warn === 'function') {
                    root.console.warn('[StandardsProvider] Ignored invalid injected local snapshot.', error && error.message);
                }
            }
        }
    }
    drainInjectedSnapshots();

    return {
        VERSION,
        toPlainMath,
        validateSnapshot,
        createLocalProvider,
        registerLocalSnapshot,
        getRegisteredProvider,
        getRegisteredSnapshotManifests,
        clearRegisteredProvider
    };
});