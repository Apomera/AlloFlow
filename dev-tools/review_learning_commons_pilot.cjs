#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const StandardsProvider = require('../standards_provider_module.js');

const REVIEW_VERSION = 'alloflow-learning-commons-pilot-review/v1';

function usage() {
    return [
        'Review a generated AlloFlow Learning Commons pilot snapshot.',
        '',
        'Required:',
        '  --snapshot <snapshot.json>',
        '',
        'Optional:',
        '  --out <review.json>       Write the bounded QA report',
        ''
    ].join('\n');
}

function parseArgs(argv) {
    const options = {};
    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg === '--help') {
            options.help = true;
            continue;
        }
        if (arg !== '--snapshot' && arg !== '--out') throw new Error(`Unknown argument: ${arg}`);
        const value = argv[index + 1];
        if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}.`);
        index += 1;
        options[arg === '--snapshot' ? 'snapshotPath' : 'outPath'] = value;
    }
    if (!options.help && !options.snapshotPath) throw new Error('--snapshot is required.');
    return options;
}

function sourceIntegrityCheck(dataset) {
    const integrity = dataset && dataset.sourceIntegrity;
    const files = ['nodes', 'relationships'];
    const missing = files.filter((name) => !integrity || !integrity[name] || !integrity[name].sha256 || !integrity[name].bytes);
    return {
        ok: missing.length === 0,
        missing,
        files: integrity || {}
    };
}

function reviewSnapshot(snapshot) {
    const validation = StandardsProvider.validateSnapshot(snapshot);
    if (!validation.ok) {
        return {
            reviewVersion: REVIEW_VERSION,
            ok: false,
            validation: { ok: false, errors: validation.errors, warnings: validation.warnings },
            failures: validation.errors.map((entry) => `${entry.path}: ${entry.message}`)
        };
    }
    const provider = StandardsProvider.createLocalProvider(snapshot);
    const normalized = validation.value;
    const standards = normalized.standards.filter((record) => record.resolvable !== false);
    const structural = normalized.standards.filter((record) => record.resolvable === false);
    const frameworks = normalized.standards.filter((record) => record.kind === 'framework');
    const missingFramework = standards.filter((record) => !record.framework);
    const missingFrameworkId = standards.filter((record) => !record.frameworkId);
    const missingSource = standards.filter((record) => !record.sourceUrl && !record.sourceUrls.length);
    const structuralExposed = [];
    for (const record of structural) {
        const result = provider.resolveStandard(record.code);
        if (result.candidates.some((candidate) => candidate.id === record.id)) structuralExposed.push(record.id);
    }
    let richestNeighborhood = null;
    for (const record of standards) {
        const neighborhood = provider.getNeighborhood(record.id, { depth: 2, maxNodes: 100, maxEdges: 200 });
        if (!richestNeighborhood || neighborhood.relationships.length > richestNeighborhood.relationships.length) {
            richestNeighborhood = Object.assign({ sourceStandardId: record.id }, neighborhood);
        }
    }
    const neighborhoodNodeIds = new Set((richestNeighborhood && richestNeighborhood.nodes || []).map((node) => node.id));
    const invalidNeighborhoodEdges = (richestNeighborhood && richestNeighborhood.relationships || []).filter((edge) => !neighborhoodNodeIds.has(edge.fromId) || !neighborhoodNodeIds.has(edge.toId));
    const context = standards.length ? provider.getStandardContext(standards[0].id) : null;
    const integrity = sourceIntegrityCheck(normalized.dataset);
    const checks = {
        validation: validation.ok,
        hasResolvableStandards: standards.length > 0,
        hasStructuralNodes: structural.length > 0,
        structuralNodesExcludedFromResolution: structuralExposed.length === 0,
        resolvableFrameworkCoverage: missingFramework.length === 0,
        resolvableFrameworkIdCoverage: missingFrameworkId.length === 0,
        resolvableSourceCoverage: missingSource.length === 0,
        sourceIntegrityPresent: integrity.ok,
        attributionPresent: Boolean(normalized.dataset.attribution),
        boundedNeighborhoodEdges: Boolean(richestNeighborhood && richestNeighborhood.relationships.length),
        neighborhoodEndpointsValid: invalidNeighborhoodEdges.length === 0,
        contextProvenanceMatches: Boolean(context && context.provenance && context.provenance.snapshotId === normalized.dataset.snapshotId)
    };
    const failures = [];
    if (!checks.hasResolvableStandards) failures.push('Pilot contains no resolvable standards.');
    if (!checks.hasStructuralNodes) failures.push('Pilot contains no structural graph nodes.');
    if (!checks.structuralNodesExcludedFromResolution) failures.push(`Structural records exposed through resolution: ${structuralExposed.join(', ')}`);
    if (!checks.resolvableFrameworkCoverage) failures.push(`${missingFramework.length} resolvable standards lack framework names.`);
    if (!checks.resolvableFrameworkIdCoverage) failures.push(`${missingFrameworkId.length} resolvable standards lack framework IDs.`);
    if (!checks.resolvableSourceCoverage) failures.push(`${missingSource.length} resolvable standards lack source URLs.`);
    if (!checks.sourceIntegrityPresent) failures.push(`Missing source-integrity metadata for: ${integrity.missing.join(', ')}`);
    if (!checks.attributionPresent) failures.push('Dataset attribution is missing.');
    if (!checks.boundedNeighborhoodEdges) failures.push('No bounded neighborhood edges were found from resolvable standards.');
    if (!checks.neighborhoodEndpointsValid) failures.push(`${invalidNeighborhoodEdges.length} neighborhood edges point outside the returned node set.`);
    if (!checks.contextProvenanceMatches) failures.push('Resolved context provenance does not match the snapshot manifest.');
    return {
        reviewVersion: REVIEW_VERSION,
        ok: failures.length === 0,
        snapshot: {
            provider: normalized.dataset.provider,
            datasetVersion: normalized.dataset.datasetVersion,
            snapshotId: normalized.dataset.snapshotId,
            contentDigest: normalized.dataset.contentDigest,
            sourceIntegrity: normalized.dataset.sourceIntegrity
        },
        counts: {
            records: normalized.standards.length,
            resolvableStandards: standards.length,
            structuralNodes: structural.length,
            frameworkNodes: frameworks.length,
            relationships: normalized.relationships.length,
            relationshipTypes: Array.from(new Set(normalized.relationships.map((edge) => edge.type))).sort()
        },
        coverage: {
            missingFramework: missingFramework.length,
            missingFrameworkId: missingFrameworkId.length,
            missingSource: missingSource.length,
            structuralExposed: structuralExposed.length,
            richestNeighborhood: richestNeighborhood ? {
                sourceStandardId: richestNeighborhood.sourceStandardId,
                nodes: richestNeighborhood.nodes.length,
                relationships: richestNeighborhood.relationships.length,
                truncated: richestNeighborhood.truncated
            } : null
        },
        checks,
        validation: { ok: validation.ok, warnings: validation.warnings },
        failures
    };
}

function readSnapshot(snapshotPath) {
    return JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
}

if (require.main === module) {
    Promise.resolve().then(() => {
        const options = parseArgs(process.argv.slice(2));
        if (options.help) {
            process.stdout.write(usage());
            return;
        }
        const report = reviewSnapshot(readSnapshot(options.snapshotPath));
        if (options.outPath) {
            fs.mkdirSync(path.dirname(path.resolve(options.outPath)), { recursive: true });
            fs.writeFileSync(options.outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
        }
        process.stdout.write(`${report.ok ? 'PASS' : 'FAIL'}: ${report.counts ? `${report.counts.resolvableStandards} standards, ${report.counts.structuralNodes} structural nodes, ${report.counts.relationships} relationships` : 'snapshot validation failed'}\n`);
        if (report.failures.length) process.stdout.write(`${report.failures.map((failure) => `- ${failure}`).join('\n')}\n`);
        if (!report.ok) process.exitCode = 1;
    }).catch((error) => {
        process.stderr.write(`${error.message}\n\n${usage()}`);
        process.exitCode = 1;
    });
}

module.exports = { REVIEW_VERSION, parseArgs, reviewSnapshot, sourceIntegrityCheck, usage };
