#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const expectedAssetSha = '183673651cfa8c473a26641d42011d43be44eb2fea44e6e6ab8e2b0065d07483';
const sourceDataPath = path.join(root, 'stem_lab', 'stem_data_cellatlas_muraro.js');
const desktopDataPath = path.join(root, 'desktop', 'web-app', 'public', 'stem_lab', 'stem_data_cellatlas_muraro.js');
const sourceToolPath = path.join(root, 'stem_lab', 'stem_tool_cellatlas.js');
const desktopToolPath = path.join(root, 'desktop', 'web-app', 'public', 'stem_lab', 'stem_tool_cellatlas.js');

let checks = 0;
function assert(condition, message) {
  checks += 1;
  if (!condition) throw new Error(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

const sourceData = fs.readFileSync(sourceDataPath, 'utf8');
const sandbox = {};
sandbox.window = sandbox;
vm.runInNewContext(sourceData, sandbox, { filename: sourceDataPath });
const snapshot = sandbox.__alloCellAtlasRealSnapshots && sandbox.__alloCellAtlasRealSnapshots.muraroPancreas;

assert(snapshot, 'Snapshot did not attach to the browser global.');
assert(snapshot.snapshotVersion === 2, 'Unexpected snapshot schema version.');
assert(snapshot.id === 'muraro-pancreas-aggregates-v2', 'Unexpected snapshot id.');
assert(snapshot.source.assetSha256 === expectedAssetSha, 'Pinned H5AD checksum changed.');
assert(snapshot.source.datasetVersionId === 'ac56150b-add4-4336-9059-6d3d3ce17f3b', 'Dataset version changed.');
assert(snapshot.source.primaryCellCount === 2126, 'Primary cell count changed.');
assert(snapshot.source.featureCount === 15643, 'Feature count changed.');
assert(snapshot.source.donorCount === 4, 'Donor count changed.');
assert(snapshot.privacy.aggregateOnly === true, 'Snapshot must remain aggregate-only.');
assert(snapshot.privacy.containsCellRows === false, 'Snapshot must not contain cell rows.');
assert(snapshot.privacy.containsDonorIdentifiers === false, 'Snapshot must not contain donor identifiers.');
assert(snapshot.privacy.containsSequences === false, 'Snapshot must not contain sequences.');
assert(snapshot.replicatePolicy.pseudonymized === true, 'Replicate labels must remain pseudonymous.');
assert(snapshot.replicatePolicy.sourceDonorIdsIncluded === false, 'Source donor IDs must not be exported.');
assert(Array.isArray(snapshot.replicates) && snapshot.replicates.length === 4, 'Expected four aggregate source replicates.');
assert(!sourceData.includes('"D28"'), 'A donor identifier leaked into the generated artifact.');
assert(!sourceData.includes('"D29"'), 'A donor identifier leaked into the generated artifact.');
assert(!sourceData.includes('"D30"'), 'A donor identifier leaked into the generated artifact.');
assert(!sourceData.includes('"D31"'), 'A donor identifier leaked into the generated artifact.');

const expectedReplicates = [
  { id: 'replicate_a', primary: 182, mapped: 172 },
  { id: 'replicate_b', primary: 574, mapped: 510 },
  { id: 'replicate_c', primary: 687, mapped: 681 },
  { id: 'replicate_d', primary: 683, mapped: 654 },
];
for (let index = 0; index < expectedReplicates.length; index += 1) {
  const actual = snapshot.replicates[index];
  const expected = expectedReplicates[index];
  assert(actual.id === expected.id, `Unexpected replicate id at index ${index}.`);
  assert(actual.primaryCellCount === expected.primary, `${actual.label} primary count changed.`);
  assert(actual.mappedCellCount === expected.mapped, `${actual.label} mapped count changed.`);
}
assert(snapshot.replicates.reduce((sum, item) => sum + item.primaryCellCount, 0) === 2126, 'Replicate primary counts do not sum to source total.');
assert(snapshot.replicates.reduce((sum, item) => sum + item.mappedCellCount, 0) === 2017, 'Replicate mapped counts do not sum to lesson total.');
assert(snapshot.replicates[0].cellTypes.stellate.cellCount === 1, 'Expected low-count Replicate A stellate group changed.');
assert(snapshot.replicates[1].cellTypes.endothelial.cellCount === 2, 'Expected low-count Replicate B endothelial group changed.');
assert(snapshot.replicates[1].cellTypes.endothelial.genes.KDR.detectionPct === 100, 'Expected Replicate B KDR observation changed.');

const mappedCount = Object.values(snapshot.cellTypes)
  .filter((cell) => cell.available)
  .reduce((sum, cell) => sum + cell.cellCount, 0);
assert(mappedCount === 2017, 'Mapped lesson cell count changed.');
assert(snapshot.cellTypes.immune.available === false, 'Unavailable immune group must not be fabricated.');
assert(snapshot.cellTypes.acinar.genes.GCG.detectionPct === 100, 'Expected broad GCG detection observation changed.');
assert(snapshot.cellTypes.acinar.genes.GCG.relativeMeanPct === 2.4, 'Expected acinar GCG relative signal changed.');

const canonical = {
  beta: 'INS',
  alpha: 'GCG',
  delta: 'SST',
  ductal: 'KRT19',
  acinar: 'PRSS1',
  stellate: 'COL3A1',
  endothelial: 'KDR',
};
for (const [cellId, geneId] of Object.entries(canonical)) {
  assert(
    snapshot.cellTypes[cellId].genes[geneId].relativeMeanPct === 100,
    `${cellId}:${geneId} is no longer the strongest displayed real mean.`,
  );
}

assert(sourceData === fs.readFileSync(desktopDataPath, 'utf8'), 'Source and desktop data artifacts differ.');
assert(
  fs.readFileSync(sourceToolPath, 'utf8') === fs.readFileSync(desktopToolPath, 'utf8'),
  'Source and desktop Cell Atlas tools differ.',
);

for (const loader of ['build.js', 'AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt']) {
  const text = read(loader);
  const dataIndex = text.indexOf('stem_lab/stem_data_cellatlas_muraro.js');
  const toolIndex = text.indexOf('stem_lab/stem_tool_cellatlas.js');
  assert(dataIndex >= 0, `${loader} does not load the real snapshot.`);
  assert(toolIndex > dataIndex, `${loader} must load the snapshot before the tool.`);
  if (loader !== 'build.js') {
    assert(
      text.includes("s.async = !orderedCellAtlasDependency"),
      `${loader} does not enforce execution order for the snapshot dependency.`,
    );
  }
}

const generator = read('dev-tools/generate_cellatlas_real_snapshot.py');
assert(generator.includes(expectedAssetSha), 'Generator is not pinned to the audited H5AD checksum.');
assert(generator.includes('containsDonorIdentifiers'), 'Generator is missing its privacy declaration.');
assert(generator.includes('replicatePolicy'), 'Generator is missing pseudonymous replicate aggregation.');
assert(generator.includes('sourceDonorIdsIncluded'), 'Generator is missing its donor-ID export declaration.');

console.log(`Cell Atlas real-data audit passed (${checks} assertions).`);
console.log(`  Dataset version: ${snapshot.source.datasetVersionId}`);
console.log(`  Asset SHA-256:   ${snapshot.source.assetSha256}`);
console.log(`  Aggregate cells: ${mappedCount}/${snapshot.source.primaryCellCount}`);
console.log(`  Replicate groups: ${snapshot.replicates.length} pseudonymous aggregates`);
