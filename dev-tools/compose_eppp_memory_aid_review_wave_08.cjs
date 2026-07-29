const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const moduleRoot = path.join(__dirname, 'eppp_memory_aid_wave08');
const manifest = JSON.parse(fs.readFileSync(path.join(moduleRoot, 'manifest.json'), 'utf8'));
const catalogPath = process.env.EPPP_WAVE08_CATALOG_PATH ? path.resolve(process.env.EPPP_WAVE08_CATALOG_PATH) : path.join(root, 'test_prep/eppp_learning_library.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const canonicalById = new Map(catalog.memoryAids.map((item) => [item.id, item]));
const records = [];
const pending = [];

for (const [domainId, entry] of Object.entries(manifest.domains)) {
  const modulePath = path.join(moduleRoot, entry.module);
  if (entry.status === 'pending') {
    pending.push(Number(domainId));
    if (fs.existsSync(modulePath)) throw new Error(`Pending Domain ${domainId} unexpectedly has a module`);
    continue;
  }
  if (!fs.existsSync(modulePath)) throw new Error(`Missing active Domain ${domainId} module`);
  const module = JSON.parse(fs.readFileSync(modulePath, 'utf8'));
  if (module.domainId !== Number(domainId)) throw new Error(`Domain mismatch in ${entry.module}`);
  if (module.items.length !== entry.expectedItems) {
    throw new Error(`${entry.module}: expected ${entry.expectedItems}, found ${module.items.length}`);
  }
  records.push(...module.items);
}

const ids = records.map((item) => item.legacyId);
if (new Set(ids).size !== ids.length) throw new Error('Duplicate stable ID across Wave 08 domain modules');
const canonicalScope = ids.map((id) => canonicalById.get(id));
if (canonicalScope.some((item) => !item)) throw new Error('A Wave 08 module ID is absent from the canonical 255-item inventory');
const canonicalScopeIds = new Set(canonicalScope.map((item) => item.id));
for (const id of ids) if (!canonicalScopeIds.has(id)) throw new Error(`Module record is absent from canonical scope: ${id}`);
for (const item of records) {
  if (!item.content || !item.references?.length || item.references.length !== item.sourceDetails?.length) {
    throw new Error(`Incomplete claim/source record: ${item.legacyId}`);
  }
  if (item.references.some((url, index) => url !== item.sourceDetails[index].url)) {
    throw new Error(`Reference order mismatch: ${item.legacyId}`);
  }
}

if (pending.length) {
  console.log(JSON.stringify({
    status: 'pending-domain-modules',
    reviewedRecords: records.length,
    canonicalScopeRecords: canonicalScope.length,
    pendingDomains: pending,
    missingRecords: canonicalScope.length - records.length,
  }, null, 2));
  process.exitCode = 2;
} else {
  if (records.length !== canonicalScope.length || records.length !== 149) {
    throw new Error(`Final completeness failure: records=${records.length}, canonicalScope=${canonicalScope.length}`);
  }
  require('./eppp_memory_aid_wave08/write_final_artifact.cjs')({ root, moduleRoot, manifest, records, canonicalScope });
}
