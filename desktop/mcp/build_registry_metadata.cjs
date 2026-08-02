#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { buildManifest } = require('./build_mcpb.cjs');

const REGISTRY_SCHEMA = 'https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json';
const REGISTRY_NAME = 'io.github.apomera/alloflow-remediation';
const REPOSITORY_URL = 'https://github.com/Apomera/AlloFlow';
const RELEASE_FILE = 'alloflow-remediation.mcpb';

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (!['--artifact', '--tag', '--output'].includes(key)) throw new Error('Unknown argument: ' + key);
    if (!argv[i + 1]) throw new Error(key + ' requires a value');
    options[key.slice(2)] = argv[++i];
  }
  return options;
}

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function buildRegistryMetadata({ artifactPath, tag } = {}) {
  const version = buildManifest().version;
  const expectedTag = 'mcpb-v' + version;
  const releaseTag = tag || expectedTag;
  if (releaseTag !== expectedTag) {
    throw new Error('Registry tag ' + releaseTag + ' does not match MCPB manifest version ' + version + ' (expected ' + expectedTag + ')');
  }
  const artifact = path.resolve(artifactPath || path.join(__dirname, '..', 'dist', 'mcpb', RELEASE_FILE));
  const stat = fs.statSync(artifact, { throwIfNoEntry: false });
  if (!stat || !stat.isFile() || stat.size < 1000) throw new Error('MCPB artifact is missing or implausibly small: ' + artifact);
  const identifier = REPOSITORY_URL + '/releases/download/' + encodeURIComponent(releaseTag) + '/' + RELEASE_FILE;
  const metadata = {
    $schema: REGISTRY_SCHEMA,
    name: REGISTRY_NAME,
    title: 'AlloFlow Document Remediation',
    description: 'Local-first document accessibility remediation using the canonical AlloFlow app pipeline.',
    repository: { url: REPOSITORY_URL, source: 'github' },
    version,
    packages: [{
      registryType: 'mcpb',
      identifier,
      fileSha256: sha256File(artifact),
      transport: { type: 'stdio' },
    }],
  };
  if (metadata.description.length > 100) throw new Error('Registry description exceeds 100 characters');
  if (!identifier.toLowerCase().includes('mcp') || !identifier.endsWith('.mcpb')) throw new Error('Registry MCPB identifier is invalid');
  return metadata;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const metadata = buildRegistryMetadata({ artifactPath: options.artifact, tag: options.tag });
  const output = path.resolve(options.output || path.join(__dirname, '..', 'dist', 'mcpb', 'server.json'));
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(metadata, null, 2) + '\n', 'utf8');
  process.stdout.write('MCP REGISTRY METADATA: PASS (' + metadata.name + '@' + metadata.version + ', ' + metadata.packages[0].fileSha256 + ')\n');
}

module.exports = { buildRegistryMetadata, sha256File, REGISTRY_NAME, REGISTRY_SCHEMA, RELEASE_FILE };
if (require.main === module) {
  try { main(); } catch (error) { console.error('[build-registry-metadata] ERROR: ' + error.message); process.exitCode = 1; }
}
