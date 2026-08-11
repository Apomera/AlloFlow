'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const CANONICAL_DIR = path.join(REPO_ROOT, 'stem_lab', 'assets', 'anatomy', 'clinical-atlas');
const PUBLIC_DIR = path.join(REPO_ROOT, 'desktop', 'web-app', 'public', 'stem_lab', 'assets', 'anatomy', 'clinical-atlas');
const BUILD_DIR = path.join(REPO_ROOT, 'desktop', 'web-app', 'build', 'stem_lab', 'assets', 'anatomy', 'clinical-atlas');

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function parseCsvLine(line) {
  const values = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === ',' && !quoted) {
      values.push(value);
      value = '';
    } else {
      value += char;
    }
  }
  values.push(value);
  return values;
}

function readGlbNodeNames(modelBuffer, label) {
  if (modelBuffer.length < 20 || modelBuffer.toString('ascii', 0, 4) !== 'glTF') {
    throw new Error(`${label}: invalid GLB magic`);
  }
  const version = modelBuffer.readUInt32LE(4);
  const declaredLength = modelBuffer.readUInt32LE(8);
  if (version !== 2) throw new Error(`${label}: expected GLB v2, received v${version}`);
  if (declaredLength !== modelBuffer.length) {
    throw new Error(`${label}: header length ${declaredLength} does not match ${modelBuffer.length} bytes`);
  }
  const jsonLength = modelBuffer.readUInt32LE(12);
  const jsonType = modelBuffer.readUInt32LE(16);
  if (jsonType !== 0x4e4f534a || 20 + jsonLength > modelBuffer.length) {
    throw new Error(`${label}: missing or invalid JSON chunk`);
  }
  const document = JSON.parse(modelBuffer.toString('utf8', 20, 20 + jsonLength).replace(/[\u0000\u0020]+$/g, ''));
  return new Set((document.nodes || []).map((node) => node && node.name).filter(Boolean));
}

function loadManifest(directory) {
  const manifestPath = path.join(directory, 'asset-manifest.json');
  return {
    buffer: fs.readFileSync(manifestPath),
    data: JSON.parse(fs.readFileSync(manifestPath, 'utf8')),
  };
}

function checkClinicalAssets() {
  const canonicalManifest = loadManifest(CANONICAL_DIR);
  const publicManifest = loadManifest(PUBLIC_DIR);
  const buildManifest = loadManifest(BUILD_DIR);
  if (!canonicalManifest.buffer.equals(publicManifest.buffer) || !canonicalManifest.buffer.equals(buildManifest.buffer)) {
    throw new Error('Clinical Atlas canonical, public, and build manifests differ');
  }
  const canonicalAttribution = fs.readFileSync(path.join(CANONICAL_DIR, 'ATTRIBUTION.md'));
  const publicAttribution = fs.readFileSync(path.join(PUBLIC_DIR, 'ATTRIBUTION.md'));
  const buildAttribution = fs.readFileSync(path.join(BUILD_DIR, 'ATTRIBUTION.md'));
  if (!canonicalAttribution.equals(publicAttribution) || !canonicalAttribution.equals(buildAttribution)) {
    throw new Error('Clinical Atlas canonical, public, and build attribution files differ');
  }
  if (canonicalManifest.data.schemaVersion !== 1 || !Array.isArray(canonicalManifest.data.packs)) {
    throw new Error('Clinical Atlas manifest schema is invalid');
  }

  const results = canonicalManifest.data.packs.map((pack) => {
    const modelPath = path.join(CANONICAL_DIR, pack.model);
    const crosswalkPath = path.join(CANONICAL_DIR, pack.crosswalk);
    const publicModelPath = path.join(PUBLIC_DIR, pack.model);
    const publicCrosswalkPath = path.join(PUBLIC_DIR, pack.crosswalk);
    const buildModelPath = path.join(BUILD_DIR, pack.model);
    const buildCrosswalkPath = path.join(BUILD_DIR, pack.crosswalk);
    const model = fs.readFileSync(modelPath);
    const crosswalk = fs.readFileSync(crosswalkPath);
    const publicModel = fs.readFileSync(publicModelPath);
    const publicCrosswalk = fs.readFileSync(publicCrosswalkPath);
    const buildModel = fs.readFileSync(buildModelPath);
    const buildCrosswalk = fs.readFileSync(buildCrosswalkPath);

    if (!model.equals(publicModel) || !model.equals(buildModel) || !crosswalk.equals(publicCrosswalk) || !crosswalk.equals(buildCrosswalk)) {
      throw new Error(`${pack.id}: canonical, public, and build assets differ`);
    }
    if (sha256(model) !== pack.sha256.model || sha256(crosswalk) !== pack.sha256.crosswalk) {
      throw new Error(`${pack.id}: asset integrity hash mismatch`);
    }

    const nodeNames = readGlbNodeNames(model, pack.id);
    const lines = crosswalk.toString('utf8').replace(/^\uFEFF/, '').trim().split(/\r?\n/);
    const headers = parseCsvLine(lines.shift() || '');
    const nodeIndex = headers.indexOf('node_name');
    const ontologyIndex = headers.indexOf('OntologyID');
    const labelIndex = headers.indexOf('label');
    if (nodeIndex < 0 || ontologyIndex < 0 || labelIndex < 0) {
      throw new Error(`${pack.id}: crosswalk is missing node_name, OntologyID, or label`);
    }

    const missingNodes = [];
    const ontologyIds = new Set();
    for (const line of lines) {
      if (!line.trim()) continue;
      const row = parseCsvLine(line);
      const nodeName = row[nodeIndex];
      const ontologyId = row[ontologyIndex];
      if (!nodeNames.has(nodeName)) missingNodes.push(nodeName);
      if (!/^(?:UBERON|FMA):\d+$/.test(ontologyId || '')) {
        throw new Error(`${pack.id}: invalid ontology identifier ${ontologyId || '(empty)'}`);
      }
      ontologyIds.add(ontologyId);
    }
    if (missingNodes.length) {
      throw new Error(`${pack.id}: crosswalk nodes absent from GLB: ${missingNodes.join(', ')}`);
    }
    if (lines.filter((line) => line.trim()).length !== pack.modeledStructureCount) {
      throw new Error(`${pack.id}: modeledStructureCount does not match crosswalk rows`);
    }

    return {
      id: pack.id,
      bytes: model.length,
      nodeCount: nodeNames.size,
      crosswalkRows: lines.filter((line) => line.trim()).length,
      ontologyCount: ontologyIds.size,
    };
  });

  return { packCount: results.length, packs: results };
}

if (require.main === module) {
  try {
    const result = checkClinicalAssets();
    for (const pack of result.packs) {
      process.stdout.write(`Clinical Atlas OK: ${pack.id} (${pack.bytes} bytes, ${pack.crosswalkRows} mapped nodes, ${pack.ontologyCount} ontology terms)\n`);
    }
  } catch (error) {
    process.stderr.write(`Clinical Atlas asset check failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { checkClinicalAssets, readGlbNodeNames };
