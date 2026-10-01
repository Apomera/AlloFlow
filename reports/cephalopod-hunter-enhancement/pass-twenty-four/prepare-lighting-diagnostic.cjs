'use strict';

// Root-only preparation. The single exposure is a diagnostic fixture; natural
// composition, quality and phone tests continue to load the canonical source.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = process.cwd();
const sourcePath = path.resolve(root, process.argv[2] || 'stem_lab/stem_tool_cephalopodlab.js');
const outputPath = path.resolve(root, process.argv[3] || 'reports/cephalopod-hunter-enhancement/pass-twenty-four/lighting-diagnostic.generated.cjs');
const proofPath = path.join(path.dirname(outputPath), 'lighting-diagnostic-proof.json');
assert.ok(outputPath.startsWith(path.resolve(__dirname) + path.sep), 'Diagnostic output must stay inside the assigned pass-twenty-four folder');
assert.notEqual(outputPath, sourcePath, 'Diagnostic preparation cannot overwrite the input runtime');
const source = fs.readFileSync(sourcePath, 'utf8');
const anchor = '        var clock = new THREE.Clock();';
const exposure = '        window.__clLightingFixtureState=gameState; // Diagnostic exposure only.\n';
assert.equal(source.split(anchor).length - 1, 1, 'The production clock anchor must occur exactly once');
assert.equal(source.includes('__clLightingFixtureState'), false, 'Canonical source must have no diagnostic exposure');
const at = source.indexOf(anchor);
assert.ok(source.lastIndexOf('var gameState = {', at) >= 0, 'Expose only the already initialized production state');
assert.ok(source.indexOf('function loop() {', at) > at, 'Expose before the existing production frame loop');
const diagnostic = source.slice(0, at) + exposure + source.slice(at);
assert.equal(diagnostic.replace(exposure, ''), source, 'Removing only the exposure must restore canonical bytes exactly');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const proof = {
  source: path.relative(root, sourcePath).replace(/\\/g, '/'),
  output: path.relative(root, outputPath).replace(/\\/g, '/'),
  sourceSha256: sha256(source), diagnosticSha256: sha256(diagnostic),
  restoredSha256: sha256(diagnostic.replace(exposure, '')),
  onlyChange: exposure.trim(), exactReverseProof: true,
  rngConservation: 'All existing seeded calls and production source bytes are unchanged after removal of the one state-reference exposure.',
  scope: 'Day/night/depth fixture only. It is not natural scene composition evidence and does not force shafts or post-processing.',
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, diagnostic);
fs.writeFileSync(proofPath, JSON.stringify(proof, null, 2) + '\n');
console.log(JSON.stringify(proof, null, 2));
