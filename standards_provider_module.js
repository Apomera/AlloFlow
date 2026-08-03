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

    function queryScore(record, query) {
        if (!query) return 0;
        const code = codeToken(record.code);
        const id = idToken(record.id);
        const label = token(record.label);
        const body = token(`${record.label} ${record.text} ${record.code} ${record.id}`);
        if (code === query) return 1000;
        if (id === query) return 950;
        if (label === query) return 900;
        if (label.indexOf(query) === 0) return 800;
        const queryParts = query.split(/[^a-z0-9]+/).filter(Boolean);
        const matchingParts = queryParts.filter((part) => body.indexOf(part) >= 0).length;
        if (queryParts.length && matchingParts === queryParts.length) return 650;
        if (body.indexOf(query) >= 0) return 400;
        return 0;
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
                const score = queryScore(record, normalizedQuery);
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
        function neighborsByType(record, type, direction, maxResults) {
            const out = [];
            let truncated = false;
            for (const entry of adjacency.get(idToken(record.id)) || []) {
                if (entry.relationship.type !== type) continue;
                if (direction && entry.direction !== direction) continue;
                const other = byId.get(entry.otherId);
                if (!other || other.resolvable === false) continue;
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
            // The Academic Standards dataset represents a standard's component
            // statements as its hasChild children (cluster -> standard ->
            // component parts). This returns DIRECT children only, and only
            // resolvable ones; it deliberately does not synthesize components
            // that the source data does not contain. When a dedicated
            // learning-components dataset is imported later, this method is
            // where it surfaces, under the same shape.
            const record = getRecord(id);
            if (!record) return null;
            const maxResults = boundedMax(options);
            const children = neighborsByType(record, 'hasChild', 'outgoing', maxResults);
            return {
                standard: record.resolvable === false ? null : publicRecord(record),
                components: children.records,
                truncated: children.truncated,
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
            getLearningComponents
        };
    }

    function registerLocalSnapshot(snapshot) {
        registeredProvider = createLocalProvider(snapshot);
        return registeredProvider;
    }

    function getRegisteredProvider() {
        return registeredProvider;
    }

    function clearRegisteredProvider() {
        registeredProvider = null;
    }

    if (root && root.__ALLO_LOCAL_STANDARDS_SNAPSHOT__) {
        try {
            registerLocalSnapshot(root.__ALLO_LOCAL_STANDARDS_SNAPSHOT__);
        } catch (error) {
            if (root.console && typeof root.console.warn === 'function') {
                root.console.warn('[StandardsProvider] Ignored invalid injected local snapshot.', error && error.message);
            }
        }
    }

    return {
        VERSION,
        validateSnapshot,
        createLocalProvider,
        registerLocalSnapshot,
        getRegisteredProvider,
        clearRegisteredProvider
    };
});