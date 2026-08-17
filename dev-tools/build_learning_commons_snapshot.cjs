#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const readline = require('node:readline');
const StandardsProvider = require('../standards_provider_module.js');

const DEFAULT_SOURCE_VERSION = 'v1.11.0';
const LICENSE_URL = 'https://creativecommons.org/licenses/by/4.0/';
const ATTRIBUTION = 'Knowledge Graph is provided by Learning Commons under the CC BY-4.0 license. Learning Commons received state standards and written permission under CC BY-4.0 from 1EdTech.';
const DOC_URLS = [
    'https://docs.learningcommons.org/knowledge-graph/datasets/academic-standards',
    'https://docs.learningcommons.org/knowledge-graph/using-knowledge-graph/local-files',
    'https://docs.learningcommons.org/knowledge-graph/resources/license'
];

function usage() {
    return [
        'Build a scoped AlloFlow standards snapshot from Learning Commons JSONL exports.',
        '',
        'Required:',
        '  --nodes <nodes.jsonl> --relationships <relationships.jsonl> --out <snapshot.json>',
        '  --jurisdiction <value> --subject <value> (or explicit --allow-all)',
        '',
        'Optional:',
        '  --grade <value>               Repeatable; matches any listed grade',
        '  --framework-id <identifier>   Restrict items to descendants of this framework',
        '  --include-structural          Include grouping nodes as records',
        '  --include-deprecated          Include records where isCurrent is false',
        '  --module-out <snapshot.js>    Emit a browser/CDN registration module',
        '  --module-key <ModuleName>     AlloModules key the loader probes for (default: derived from --module-out filename)',
        '  --source-version <version>    Default: v1.11.0',
        '  --generated-at <ISO value>    Useful for reproducible builds',
        '  --max-standards <count>       Fail if the scope exceeds this count',
        '  --source-manifest <path>      Manifest containing expected source hashes',
        '  --verify-source               Verify both input files against the manifest',
        '  --allow-all                   Acknowledge an intentionally unscoped import',
        ''
    ].join('\n');
}

function parseArgs(argv) {
    const options = { grades: [] };
    const valueFlags = new Set([
        '--nodes', '--relationships', '--out', '--module-out', '--module-key', '--jurisdiction', '--subject',
        '--grade', '--framework-id', '--source-version', '--generated-at', '--max-standards', '--source-manifest'
    ]);
    const booleanFlags = new Set(['--include-structural', '--include-deprecated', '--allow-all', '--verify-source', '--include-components', '--help']);
    const keys = {
        '--nodes': 'nodesPath', '--relationships': 'relationshipsPath', '--out': 'outPath',
        '--module-out': 'moduleOutPath', '--module-key': 'moduleKey', '--jurisdiction': 'jurisdiction', '--subject': 'subject',
        '--framework-id': 'frameworkId', '--source-version': 'sourceVersion', '--source-manifest': 'sourceManifestPath',
        '--generated-at': 'generatedAt', '--max-standards': 'maxStandards'
    };
    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (booleanFlags.has(arg)) {
            options[arg.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = true;
            continue;
        }
        if (!valueFlags.has(arg)) throw new Error(`Unknown argument: ${arg}`);
        const value = argv[i + 1];
        if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}.`);
        i += 1;
        if (arg === '--grade') options.grades.push(value);
        else options[keys[arg]] = value;
    }
    if (options.help) return options;
    for (const key of ['nodesPath', 'relationshipsPath', 'outPath']) {
        if (!options[key]) throw new Error(`Missing required argument: ${key}.`);
    }
    if (!options.allowAll && (!options.jurisdiction || !options.subject)) {
        throw new Error('A scoped import requires both --jurisdiction and --subject. Use --allow-all only after reviewing the full-corpus impact.');
    }
    options.sourceVersion = options.sourceVersion || DEFAULT_SOURCE_VERSION;
    options.generatedAt = options.generatedAt || new Date().toISOString();
    if (options.verifySource && !options.sourceManifestPath) options.sourceManifestPath = path.join(__dirname, 'learning_commons_snapshot_manifest.json');
    if (options.maxStandards !== undefined) {
        options.maxStandards = Number(options.maxStandards);
        if (!Number.isSafeInteger(options.maxStandards) || options.maxStandards < 1) {
            throw new Error('--max-standards must be a positive integer.');
        }
    }
    return options;
}

function lower(value) {
    return String(value === undefined || value === null ? '' : value).trim().toLocaleLowerCase();
}

function labelsOf(node) {
    return Array.isArray(node && node.labels) ? node.labels.map(String) : [];
}

function parseList(value) {
    if (Array.isArray(value)) return value.map(String);
    if (typeof value !== 'string' || !value.trim()) return [];
    const trimmed = value.trim();
    if (trimmed.startsWith('[')) {
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) return parsed.map(String);
        } catch (_) {
            // Fall through to a comma-delimited value.
        }
    }
    return trimmed.split(',').map((item) => item.trim()).filter(Boolean);
}

function matchesFilter(actual, expected) {
    return !expected || lower(actual) === lower(expected);
}

function itemMatches(node, options) {
    if (!labelsOf(node).includes('StandardsFrameworkItem')) return false;
    const properties = node.properties || {};
    if (!options.includeDeprecated && properties.isCurrent === false) return false;
    if (!matchesFilter(properties.jurisdiction, options.jurisdiction)) return false;
    if (!matchesFilter(properties.academicSubject, options.subject)) return false;
    if (options.grades.length) {
        const grades = parseList(properties.gradeLevel).map(lower);
        if (!options.grades.some((grade) => grades.includes(lower(grade)))) return false;
    }
    if (!options.includeStructural && lower(properties.normalizedStatementType) !== 'standard') return false;
    return true;
}

function nodeMatches(node, options) {
    const labels = labelsOf(node);
    if (labels.includes('StandardsFramework')) {
        if (!options.includeStructural) return false;
        if (options.frameworkId) return true;
        const properties = node.properties || {};
        return matchesFilter(properties.jurisdiction, options.jurisdiction)
            && matchesFilter(properties.academicSubject, options.subject);
    }
    return itemMatches(node, options);
}

function stableId(node) {
    const properties = node.properties || {};
    return String(properties.caseIdentifierUUID || properties.identifier || node.identifier || '').trim();
}

function toStandard(node, frameworkContext) {
    const properties = node.properties || {};
    const labels = labelsOf(node);
    const normalizedType = lower(properties.normalizedStatementType);
    const kind = labels.includes('StandardsFramework')
        ? 'framework'
        : normalizedType === 'standard' ? 'standard' : 'group';
    const rawId = String(node.identifier || properties.identifier || '').trim();
    const id = stableId(node);
    const code = String(properties.statementCode || properties.alternateStatementCode || properties.caseIdentifierUUID || properties.identifier || '').trim();
    const description = String(properties.description || properties.name || code).trim();
    if (!id || !code || !description) return null;
    const sourceUrl = String(properties.caseIdentifierURI || '').trim();
    const grades = parseList(properties.gradeLevel);
    const frameworkRoots = frameworkContext && frameworkContext.assignments.get(rawId)
        ? Array.from(frameworkContext.assignments.get(rawId))
        : [];
    const frameworkInfos = frameworkRoots.map((root) => frameworkContext.frameworks.get(root)).filter(Boolean);
    const framework = frameworkInfos.map((info) => info.name).filter(Boolean).join(' | ')
        || [properties.jurisdiction, properties.academicSubject].filter(Boolean).join(' - ')
        || 'Learning Commons Academic Standards';
    const frameworkId = frameworkInfos.map((info) => info.id).filter(Boolean).join(',');
    return {
        id,
        code,
        label: description,
        text: description,
        kind,
        resolvable: kind === 'standard',
        framework,
        frameworkId,
        jurisdiction: String(properties.jurisdiction || '').trim(),
        grade: grades.join(', '),
        subject: String(properties.academicSubject || '').trim(),
        sourceUrl,
        sourceUrls: sourceUrl ? [sourceUrl] : []
    };
}

// LearningComponent nodes are the "learning components" the Learning Web handoff asks for
// upstream (137,380 of them in v1.11.0, attached to standards by `supports` edges). They are
// NOT StandardsFrameworkItems and must not be run through toStandard(): they carry no
// statementCode, no caseIdentifierUUID and no name, only a description, so toStandard would
// mint a UUID as the teacher-visible `code`.
//
// They are emitted as resolvable:false context records instead. The provider excludes
// resolvable:false from every search path (resolveStandard, code/id/label matching, and the
// teacher-facing lists), so the UUID in `code` is inert — it exists only because
// validateSnapshot requires id, code and label to be non-empty. The record is reachable as a
// relationship endpoint, which is exactly what getLearningComponents needs.
function toComponent(node) {
    const properties = node.properties || {};
    const id = stableId(node);
    const description = String(properties.description || properties.name || '').trim();
    if (!id || !description) return null;
    return {
        id,
        code: id,
        label: description,
        text: description,
        kind: 'component',
        resolvable: false,
        framework: '',
        frameworkId: '',
        jurisdiction: '',
        grade: '',
        subject: String(properties.academicSubject || '').trim(),
        sourceUrl: '',
        sourceUrls: []
    };
}

async function readJsonLines(filePath, onValue) {
    const input = fs.createReadStream(filePath, { encoding: 'utf8' });
    const reader = readline.createInterface({ input, crlfDelay: Infinity });
    let lineNumber = 0;
    for await (const line of reader) {
        lineNumber += 1;
        if (!line.trim()) continue;
        let value;
        try {
            value = JSON.parse(line);
        } catch (error) {
            throw new Error(`${filePath}:${lineNumber}: invalid JSON (${error.message})`);
        }
        await onValue(value, lineNumber);
    }
}

async function collectFrameworkContext(nodesPath, relationshipsPath, frameworkId) {
    const frameworks = new Map();
    const frameworkAliases = new Map();
    await readJsonLines(nodesPath, (node) => {
        if (!labelsOf(node).includes('StandardsFramework')) return;
        const properties = node.properties || {};
        const rawId = String(node.identifier || properties.identifier || '').trim();
        if (!rawId) return;
        const info = {
            id: stableId(node),
            name: String(properties.name || properties.description || properties.identifier || rawId).trim(),
            jurisdiction: String(properties.jurisdiction || '').trim(),
            subject: String(properties.academicSubject || '').trim()
        };
        frameworks.set(rawId, info);
        for (const alias of [node.identifier, properties.identifier, properties.caseIdentifierUUID]) {
            const value = String(alias || '').trim();
            if (value) frameworkAliases.set(value.toLocaleLowerCase(), rawId);
        }
    });

    let roots = Array.from(frameworks.keys());
    if (frameworkId) {
        const root = frameworkAliases.get(String(frameworkId).trim().toLocaleLowerCase());
        if (!root) throw new Error(`Framework not found: ${frameworkId}`);
        roots = [root];
    }

    const children = new Map();
    await readJsonLines(relationshipsPath, (edge) => {
        const type = String(edge.label || (edge.properties || {}).relationshipType || '').trim();
        if (lower(type) !== 'haschild') return;
        const source = String(edge.source_identifier || '').trim();
        const target = String(edge.target_identifier || '').trim();
        if (!source || !target) return;
        if (!children.has(source)) children.set(source, new Set());
        children.get(source).add(target);
    });

    const assignments = new Map();
    const descendants = new Set();
    for (const root of roots) {
        const queue = [root];
        const visited = new Set([root]);
        while (queue.length) {
            const current = queue.shift();
            descendants.add(current);
            if (!assignments.has(current)) assignments.set(current, new Set());
            assignments.get(current).add(root);
            for (const target of children.get(current) || []) {
                if (!visited.has(target)) {
                    visited.add(target);
                    queue.push(target);
                }
            }
        }
    }
    return {
        frameworks,
        assignments,
        descendants: frameworkId ? descendants : null
    };
}

function slug(value) {
    return lower(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'all';
}

function exportUrl(version, filename) {
    return `https://cdn.learningcommons.org/knowledge-graph/${encodeURIComponent(version)}/exports/${filename}`;
}

async function sha256File(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const input = fs.createReadStream(filePath);
        input.on('error', reject);
        input.on('data', (chunk) => hash.update(chunk));
        input.on('end', () => resolve(hash.digest('hex').toUpperCase()));
    });
}

async function verifySourceFiles(options) {
    if (!options.sourceManifestPath) throw new Error('Source verification requires --source-manifest or the default source manifest.');
    let manifest;
    try {
        manifest = JSON.parse(fs.readFileSync(options.sourceManifestPath, 'utf8'));
    } catch (error) {
        throw new Error(`Unable to read source manifest ${options.sourceManifestPath}: ${error.message}`);
    }
    if (manifest.exportVersion !== options.sourceVersion) {
        throw new Error(`Source manifest exportVersion ${manifest.exportVersion || '(missing)'} does not match ${options.sourceVersion}.`);
    }
    const expectedFiles = {
        nodes: { path: options.nodesPath, url: manifest.access && manifest.access.nodesUrl },
        relationships: { path: options.relationshipsPath, url: manifest.access && manifest.access.relationshipsUrl }
    };
    const verified = {};
    for (const [name, file] of Object.entries(expectedFiles)) {
        const expected = manifest.sourceIntegrity && manifest.sourceIntegrity[name];
        if (!expected || !expected.sha256 || !Number.isSafeInteger(Number(expected.bytes))) {
            throw new Error(`Source manifest is missing integrity metadata for ${name}.`);
        }
        const stat = fs.statSync(file.path);
        if (stat.size !== Number(expected.bytes)) {
            throw new Error(`${name} byte length ${stat.size} does not match the manifest value ${expected.bytes}.`);
        }
        const actualHash = await sha256File(file.path);
        if (actualHash !== String(expected.sha256).toUpperCase()) {
            throw new Error(`${name} SHA-256 ${actualHash} does not match the manifest value ${expected.sha256}.`);
        }
        verified[name] = {
            bytes: Number(expected.bytes),
            sha256: actualHash,
            etag: String(expected.etag || ''),
            lastModified: String(expected.lastModified || ''),
            url: String(file.url || '')
        };
    }
    return verified;
}

async function buildSnapshot(options) {
    const sourceIntegrity = options.verifySource ? await verifySourceFiles(options) : null;
    const frameworkContext = await collectFrameworkContext(options.nodesPath, options.relationshipsPath, options.frameworkId);
    const descendants = frameworkContext.descendants;
    const rawToStable = new Map();
    const standards = [];
    await readJsonLines(options.nodesPath, (node) => {
        if (descendants && !descendants.has(String(node.identifier || ''))) return;
        if (!nodeMatches(node, options)) return;
        const standard = toStandard(node, frameworkContext);
        if (!standard) return;
        const rawId = String(node.identifier || '').trim();
        if (!rawId) return;
        rawToStable.set(rawId, standard.id);
        standards.push(standard);
        if (options.maxStandards && standards.length > options.maxStandards) {
            throw new Error(`Scope exceeded --max-standards ${options.maxStandards}. Narrow the filters or raise the reviewed limit.`);
        }
    });
    standards.sort((a, b) => a.code.localeCompare(b.code) || a.id.localeCompare(b.id));

    // Optional: pull in the LearningComponent nodes attached to the in-scope standards.
    // Two extra streaming passes, and only when asked, so the default build is byte-identical.
    //   pass A  relationships: every `supports` edge whose TARGET is an in-scope standard
    //                          contributes its SOURCE (the component) to the wanted set
    //   pass B  nodes:         materialise those components as resolvable:false records
    // The existing edge loop below then picks the `supports` edges up on its own, because it
    // has no type filter and both endpoints now resolve through rawToStable.
    let componentCount = 0;
    if (options.includeComponents) {
        const wanted = new Set();
        await readJsonLines(options.relationshipsPath, (edge) => {
            const type = String(edge.label || (edge.properties || {}).relationshipType || '').trim();
            if (lower(type) !== 'supports') return;
            const target = String(edge.target_identifier || '').trim();
            if (!target || !rawToStable.has(target)) return;
            const source = String(edge.source_identifier || '').trim();
            if (source) wanted.add(source);
        });
        // validateSnapshot rejects the whole snapshot on a duplicate id, so guard on the
        // STABLE id as well as the raw one: two raw identifiers can normalise to the same
        // stable id, and a component must never collide with a standard already emitted.
        const takenIds = new Set(standards.map((standard) => standard.id));
        const components = [];
        if (wanted.size) {
            await readJsonLines(options.nodesPath, (node) => {
                const rawId = String(node.identifier || '').trim();
                if (!rawId || !wanted.has(rawId)) return;
                if (!labelsOf(node).includes('LearningComponent')) return;
                const component = toComponent(node);
                if (!component) return;
                if (rawToStable.has(rawId) || takenIds.has(component.id)) return;
                takenIds.add(component.id);
                rawToStable.set(rawId, component.id);
                components.push(component);
            });
        }
        components.sort((a, b) => a.id.localeCompare(b.id));
        componentCount = components.length;
        for (const component of components) standards.push(component);
    }

    const relationships = [];
    const edgeKeys = new Set();
    await readJsonLines(options.relationshipsPath, (edge) => {
        const fromId = rawToStable.get(String(edge.source_identifier || ''));
        const toId = rawToStable.get(String(edge.target_identifier || ''));
        if (!fromId || !toId) return;
        const properties = edge.properties || {};
        const type = String(edge.label || properties.relationshipType || '').trim();
        if (!type) return;
        const key = `${fromId}|${toId}|${type}`;
        if (edgeKeys.has(key)) return;
        edgeKeys.add(key);
        relationships.push({ fromId, toId, type, source: String(properties.attributionStatement || properties.provider || ATTRIBUTION) });
    });
    relationships.sort((a, b) => a.fromId.localeCompare(b.fromId) || a.toId.localeCompare(b.toId) || a.type.localeCompare(b.type));

    const scope = {
        frameworkId: options.frameworkId || '',
        jurisdiction: options.jurisdiction || '',
        subject: options.subject || '',
        grades: (options.grades || []).slice().sort(),
        includeStructural: Boolean(options.includeStructural),
        includeDeprecated: Boolean(options.includeDeprecated),
        // Only present when enabled. `scope` is hashed into contentDigest and snapshotId, so
        // adding an always-present key would change the digest of every existing snapshot on
        // its next rebuild and make an unchanged import look like changed data.
        ...(options.includeComponents ? { includeComponents: true } : {})
    };
    // The label feeds snapshotId, so components have to be visible there: a snapshot with
    // components is a different artifact from one without, and the ids must not collide.
    const scopeLabel = [scope.frameworkId, scope.jurisdiction, scope.subject, scope.grades.join('_') || 'all-grades', scope.includeStructural ? 'structural' : 'standards', scope.includeDeprecated ? 'deprecated' : 'current', scope.includeComponents ? 'components' : ''].filter(Boolean).map(slug).join('-');
    const contentDigest = crypto.createHash('sha256').update(JSON.stringify({ sourceVersion: options.sourceVersion, scope, standards, relationships })).digest('hex');
    const snapshot = {
        schemaVersion: StandardsProvider.VERSION,
        dataset: {
            provider: 'Learning Commons Knowledge Graph',
            datasetVersion: options.sourceVersion,
            snapshotId: `learning-commons-${slug(options.sourceVersion)}-${scopeLabel}-${contentDigest.slice(0, 16)}`,
            generatedAt: options.generatedAt,
            contentDigest,
            ...(sourceIntegrity ? { sourceIntegrity } : {}),
            license: LICENSE_URL,
            attribution: ATTRIBUTION,
            sourceUrls: [...DOC_URLS, exportUrl(options.sourceVersion, 'nodes.jsonl'), exportUrl(options.sourceVersion, 'relationships.jsonl')]
        },
        standards,
        relationships
    };
    const report = StandardsProvider.validateSnapshot(snapshot);
    if (!report.ok) {
        const details = report.errors.map((entry) => `${entry.path}: ${entry.message}`).join('; ');
        throw new Error(`Generated snapshot failed AlloFlow validation: ${details}`);
    }
    return snapshot;
}

// The app's CDN loader verifies a load by probing window.AlloModules[<name>]
// (names like StandardsSnapshotCcssMath at AlloFlowANTI loadModule call sites);
// without this per-module alias every snapshot load is flagged FAILED and
// re-fetched through the GitHub fallback on each boot.
function deriveModuleKey(moduleOutPath) {
    const base = path.basename(String(moduleOutPath || ''), '.js');
    if (!base) return '';
    const parts = base.split(/[^a-zA-Z0-9]+/).filter(Boolean);
    const words = [];
    for (let i = 0; i < parts.length; i += 1) {
        if (parts[i].toLowerCase() === 'grade' && /^\d+$/.test(parts[i + 1] || '')) {
            words.push('G' + parts[i + 1]);
            i += 1;
        } else {
            words.push(parts[i].charAt(0).toUpperCase() + parts[i].slice(1).toLowerCase());
        }
    }
    return 'StandardsSnapshot' + words.join('');
}

function registrationModule(snapshot, moduleKey) {
    const encoded = JSON.stringify(snapshot).replace(/[\u2028\u2029]/g, (character) => character === '\u2028' ? '\\u2028' : '\\u2029');
    return `(function (root) {\n    'use strict';\n    var snapshot = ${encoded};\n    if (!root) return;\n    root.AlloModules = root.AlloModules || {};\n    var provider = root.AlloModules.StandardsProvider;\n    if (provider && typeof provider.registerLocalSnapshot === 'function') {\n        provider.registerLocalSnapshot(snapshot);\n    } else {\n        root.__ALLO_LOCAL_STANDARDS_SNAPSHOTS__ = root.__ALLO_LOCAL_STANDARDS_SNAPSHOTS__ || [];\n        root.__ALLO_LOCAL_STANDARDS_SNAPSHOTS__.push(snapshot);\n    }\n    root.AlloModules.LocalStandardsSnapshots = (root.AlloModules.LocalStandardsSnapshots || []).concat([{\n        manifest: snapshot.dataset,\n        standardCount: snapshot.standards.length,\n        relationshipCount: snapshot.relationships.length\n    }]);\n    root.AlloModules.LocalStandardsSnapshot = {\n        manifest: snapshot.dataset,\n        standardCount: snapshot.standards.length,\n        relationshipCount: snapshot.relationships.length\n    };\n${moduleKey ? `    root.AlloModules.${moduleKey} = root.AlloModules.LocalStandardsSnapshot;\n` : ''}})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));\n`;
}

async function writeBuild(options) {
    const snapshot = await buildSnapshot(options);
    fs.mkdirSync(path.dirname(path.resolve(options.outPath)), { recursive: true });
    fs.writeFileSync(options.outPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
    if (options.moduleOutPath) {
        fs.mkdirSync(path.dirname(path.resolve(options.moduleOutPath)), { recursive: true });
        fs.writeFileSync(options.moduleOutPath, registrationModule(snapshot, options.moduleKey || deriveModuleKey(options.moduleOutPath)), 'utf8');
    }
    return snapshot;
}

if (require.main === module) {
    Promise.resolve().then(async () => {
        const options = parseArgs(process.argv.slice(2));
        if (options.help) {
            process.stdout.write(usage());
            return;
        }
        const snapshot = await writeBuild(options);
        const componentTotal = snapshot.standards.filter((record) => record.kind === 'component').length;
        process.stdout.write(`Built ${snapshot.standards.length - componentTotal} standards, ${componentTotal} learning components and ${snapshot.relationships.length} relationships (${snapshot.dataset.snapshotId}).\n`);
    }).catch((error) => {
        process.stderr.write(`${error.message}\n\n${usage()}`);
        process.exitCode = 1;
    });
}

module.exports = { ATTRIBUTION, LICENSE_URL, buildSnapshot, parseArgs, registrationModule, sha256File, usage, verifySourceFiles, writeBuild };

