#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');

const PROFILER_VERSION = 'alloflow-learning-commons-profiler/v1';

function usage() {
    return [
        'Profile Learning Commons Knowledge Graph JSONL exports without importing or registering data.',
        '',
        'Required:',
        '  --nodes <nodes.jsonl> --relationships <relationships.jsonl>',
        '',
        'Optional:',
        '  --json-out <report.json>          Write the report to a file',
        '  --top <count>                     Values to retain per distribution (default: 20)',
        '  --max-hierarchy-edges <count>    Cap in-memory hasChild profiling (default: 500000)',
        ''
    ].join('\n');
}

function parseArgs(argv) {
    const options = {};
    const valueFlags = new Set(['--nodes', '--relationships', '--json-out', '--top', '--max-hierarchy-edges']);
    const booleanFlags = new Set(['--help']);
    const keys = {
        '--nodes': 'nodesPath',
        '--relationships': 'relationshipsPath',
        '--json-out': 'jsonOutPath',
        '--top': 'top',
        '--max-hierarchy-edges': 'maxHierarchyEdges'
    };
    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        if (booleanFlags.has(arg)) {
            options.help = true;
            continue;
        }
        if (!valueFlags.has(arg)) throw new Error(`Unknown argument: ${arg}`);
        const value = argv[index + 1];
        if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}.`);
        index += 1;
        options[keys[arg]] = value;
    }
    if (options.help) return options;
    if (!options.nodesPath || !options.relationshipsPath) throw new Error('Both --nodes and --relationships are required.');
    for (const field of ['top', 'maxHierarchyEdges']) {
        if (options[field] === undefined) continue;
        options[field] = Number(options[field]);
        if (!Number.isSafeInteger(options[field]) || options[field] < 1) throw new Error(`--${field === 'top' ? 'top' : 'max-hierarchy-edges'} must be a positive integer.`);
    }
    options.top = options.top || 20;
    options.maxHierarchyEdges = options.maxHierarchyEdges || 500000;
    return options;
}

function text(value) {
    return value === null || value === undefined ? '' : String(value).trim();
}

function lower(value) {
    return text(value).toLocaleLowerCase();
}

function labelsOf(node) {
    return Array.isArray(node && node.labels) ? node.labels.map(text).filter(Boolean) : [];
}

function parseList(value) {
    if (Array.isArray(value)) return value.map(text).filter(Boolean);
    const raw = text(value);
    if (!raw) return [];
    if (raw.startsWith('[')) {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed.map(text).filter(Boolean);
        } catch (_) {
            // Treat malformed JSON-string arrays as a plain value for profiling.
        }
    }
    return raw.split(',').map((entry) => entry.trim()).filter(Boolean);
}

function increment(map, value) {
    const key = text(value) || '(missing)';
    map.set(key, (map.get(key) || 0) + 1);
}

function topValues(map, limit) {
    return Array.from(map.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => (b.count - a.count) || a.value.localeCompare(b.value))
        .slice(0, limit);
}

function coverage(count, total) {
    return { count, total, ratio: total ? Number((count / total).toFixed(4)) : 0 };
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

function createDistributionSet() {
    return {
        labels: new Map(),
        types: new Map(),
        jurisdictions: new Map(),
        subjects: new Map(),
        grades: new Map(),
        statementTypes: new Map(),
        normalizedStatementTypes: new Map(),
        relationshipTypes: new Map()
    };
}

function finalizeDistributions(distributions, limit) {
    return Object.fromEntries(Object.entries(distributions).map(([key, value]) => [key, topValues(value, limit)]));
}

function nodeAliases(node) {
    const properties = node.properties || {};
    return Array.from(new Set([node.identifier, properties.identifier, properties.caseIdentifierUUID]
        .map(text)
        .filter(Boolean)));
}

async function profileExport(options) {
    const distributions = createDistributionSet();
    const aliases = new Map();
    const itemCoverage = new Map([
        ['identifier', 0],
        ['caseIdentifierUUID', 0],
        ['caseIdentifierURI', 0],
        ['statementCode', 0],
        ['description', 0],
        ['jurisdiction', 0],
        ['academicSubject', 0],
        ['gradeLevel', 0]
    ]);
    const nodeCounts = {
        total: 0,
        frameworks: 0,
        frameworkItems: 0,
        currentItems: 0,
        deprecatedItems: 0,
        unknownCurrentItems: 0,
        duplicateIdentifiers: 0
    };
    const frameworkSamples = [];
    const hasChild = new Map();
    let hasChildEdges = 0;
    let hasChildProfileTruncated = false;

    await readJsonLines(options.nodesPath, (node) => {
        nodeCounts.total += 1;
        increment(distributions.types, node.type);
        for (const label of labelsOf(node)) increment(distributions.labels, label);
        const nodeLabels = labelsOf(node);
        const properties = node.properties || {};
        const aliasesForNode = nodeAliases(node);
        for (const alias of aliasesForNode) {
            if (aliases.has(alias)) nodeCounts.duplicateIdentifiers += 1;
            aliases.set(alias, nodeLabels);
        }
        if (nodeLabels.includes('StandardsFramework')) {
            nodeCounts.frameworks += 1;
            if (frameworkSamples.length < options.top) {
                frameworkSamples.push({
                    identifier: text(properties.identifier || node.identifier),
                    name: text(properties.name),
                    jurisdiction: text(properties.jurisdiction),
                    subject: text(properties.academicSubject),
                    isCurrent: properties.isCurrent
                });
            }
        }
        if (!nodeLabels.includes('StandardsFrameworkItem')) return;
        nodeCounts.frameworkItems += 1;
        if (properties.isCurrent === false) nodeCounts.deprecatedItems += 1;
        else if (properties.isCurrent === true) nodeCounts.currentItems += 1;
        else nodeCounts.unknownCurrentItems += 1;
        increment(distributions.jurisdictions, properties.jurisdiction);
        increment(distributions.subjects, properties.academicSubject);
        increment(distributions.statementTypes, properties.statementType);
        increment(distributions.normalizedStatementTypes, properties.normalizedStatementType);
        for (const grade of parseList(properties.gradeLevel)) increment(distributions.grades, grade);
        for (const [field, value] of Object.entries({
            identifier: properties.identifier || node.identifier,
            caseIdentifierUUID: properties.caseIdentifierUUID,
            caseIdentifierURI: properties.caseIdentifierURI,
            statementCode: properties.statementCode || properties.alternateStatementCode,
            description: properties.description,
            jurisdiction: properties.jurisdiction,
            academicSubject: properties.academicSubject,
            gradeLevel: properties.gradeLevel
        })) {
            if (text(value)) itemCoverage.set(field, itemCoverage.get(field) + 1);
        }
    });

    const relationships = {
        total: 0,
        missingSource: 0,
        missingTarget: 0,
        missingBoth: 0,
        endpointsBothKnown: 0,
        endpointsBothStandardsItems: 0,
        hasChild: 0,
        truncatedHierarchyProfile: false
    };
    await readJsonLines(options.relationshipsPath, (edge) => {
        relationships.total += 1;
        const properties = edge.properties || {};
        const type = text(edge.label || properties.relationshipType || edge.type);
        increment(distributions.relationshipTypes, type);
        const source = text(edge.source_identifier);
        const target = text(edge.target_identifier);
        const sourceKnown = aliases.has(source);
        const targetKnown = aliases.has(target);
        if (!sourceKnown) relationships.missingSource += 1;
        if (!targetKnown) relationships.missingTarget += 1;
        if (!sourceKnown && !targetKnown) relationships.missingBoth += 1;
        if (sourceKnown && targetKnown) {
            relationships.endpointsBothKnown += 1;
            if (aliases.get(source).includes('StandardsFrameworkItem') && aliases.get(target).includes('StandardsFrameworkItem')) {
                relationships.endpointsBothStandardsItems += 1;
            }
        }
        if (lower(type) !== 'haschild') return;
        relationships.hasChild += 1;
        if (hasChildEdges >= options.maxHierarchyEdges) {
            hasChildProfileTruncated = true;
            return;
        }
        hasChildEdges += 1;
        if (!hasChild.has(source)) hasChild.set(source, new Set());
        hasChild.get(source).add(target);
    });

    const hierarchy = {
        frameworkRoots: 0,
        reachableNodes: 0,
        maxDepth: 0,
        cycleDetected: false,
        truncated: hasChildProfileTruncated
    };
    const roots = [];
    for (const [alias, nodeLabels] of aliases.entries()) {
        if (nodeLabels.includes('StandardsFramework') && hasChild.has(alias)) roots.push(alias);
    }
    hierarchy.frameworkRoots = roots.length;

    // BFS records a stable first-observed depth; color-marked DFS detects cycles
    // without treating converging branches in a DAG as cycles.
    const depthByNode = new Map();
    const queue = [];
    for (const root of roots) {
        if (!depthByNode.has(root)) {
            depthByNode.set(root, 0);
            queue.push(root);
        }
    }
    while (queue.length) {
        const current = queue.shift();
        const depth = depthByNode.get(current);
        hierarchy.reachableNodes += 1;
        hierarchy.maxDepth = Math.max(hierarchy.maxDepth, depth);
        for (const target of hasChild.get(current) || []) {
            if (!depthByNode.has(target)) {
                depthByNode.set(target, depth + 1);
                queue.push(target);
            }
        }
    }

    const colors = new Map();
    for (const root of roots) {
        if (colors.get(root) === 2) continue;
        const stack = [{ id: root, exit: false }];
        while (stack.length) {
            const current = stack.pop();
            const color = colors.get(current.id) || 0;
            if (current.exit) {
                colors.set(current.id, 2);
                continue;
            }
            if (color === 1) {
                hierarchy.cycleDetected = true;
                continue;
            }
            if (color === 2) continue;
            colors.set(current.id, 1);
            stack.push({ id: current.id, exit: true });
            for (const target of hasChild.get(current.id) || []) {
                const targetColor = colors.get(target) || 0;
                if (targetColor === 1) hierarchy.cycleDetected = true;
                else if (targetColor === 0) stack.push({ id: target, exit: false });
            }
        }
    }

    const report = {
        profilerVersion: PROFILER_VERSION,
        inputs: {
            nodesPath: path.resolve(options.nodesPath),
            relationshipsPath: path.resolve(options.relationshipsPath)
        },
        nodes: {
            ...nodeCounts,
            distributions: finalizeDistributions(distributions, options.top),
            frameworkSamples,
            academicStandardsCoverage: Object.fromEntries(Array.from(itemCoverage.entries()).map(([field, count]) => [field, coverage(count, nodeCounts.frameworkItems)]))
        },
        relationships: {
            ...relationships,
            knownEndpointRatio: relationships.total ? Number((relationships.endpointsBothKnown / relationships.total).toFixed(4)) : 0,
            standardsItemEndpointRatio: relationships.total ? Number((relationships.endpointsBothStandardsItems / relationships.total).toFixed(4)) : 0
        },
        hierarchy
    };
    if (options.jsonOutPath) {
        fs.mkdirSync(path.dirname(path.resolve(options.jsonOutPath)), { recursive: true });
        fs.writeFileSync(options.jsonOutPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    }
    return report;
}

function printSummary(report) {
    const current = report.nodes.currentItems;
    const deprecated = report.nodes.deprecatedItems;
    const unknown = report.nodes.unknownCurrentItems;
    return [
        `Profiled ${report.nodes.total} nodes and ${report.relationships.total} relationships.`,
        `Academic standards items: ${report.nodes.frameworkItems} (${current} current, ${deprecated} deprecated, ${unknown} unknown current status).`,
        `Frameworks: ${report.nodes.frameworks}; hasChild roots: ${report.hierarchy.frameworkRoots}; max observed depth: ${report.hierarchy.maxDepth}.`,
        `Known relationship endpoints: ${(report.relationships.knownEndpointRatio * 100).toFixed(1)}%; relationships between standards items: ${(report.relationships.standardsItemEndpointRatio * 100).toFixed(1)}%.`,
        report.hierarchy.truncated ? 'Warning: hierarchy profiling reached --max-hierarchy-edges.' : 'Hierarchy profiling completed.'
    ].join('\n');
}

if (require.main === module) {
    Promise.resolve().then(async () => {
        const options = parseArgs(process.argv.slice(2));
        if (options.help) {
            process.stdout.write(usage());
            return;
        }
        const report = await profileExport(options);
        process.stdout.write(`${printSummary(report)}\n`);
        if (options.jsonOutPath) process.stdout.write(`Wrote ${path.resolve(options.jsonOutPath)}\n`);
    }).catch((error) => {
        process.stderr.write(`${error.message}\n\n${usage()}`);
        process.exitCode = 1;
    });
}

module.exports = { PROFILER_VERSION, parseArgs, profileExport, printSummary, usage };
