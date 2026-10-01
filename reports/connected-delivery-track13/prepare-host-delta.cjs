// Build an integration artifact only. Never writes the shared host.
const fs = require('node:fs');
const path = require('node:path');
const { createTwoFilesPatch } = require('diff');
const root = path.resolve(__dirname, '../..');
const before = fs.readFileSync(path.join(root, 'AlloFlowANTI.txt'), 'utf8').replace(/\r\n/g, '\n');
let after = before;
function replaceOnce(from, to) {
  if (after.split(from).length !== 2) throw new Error('Host integration anchor is missing or ambiguous: ' + from.slice(0, 100));
  after = after.replace(from, to);
}
replaceOnce(
  '              resource = _alloStudentSafeResources([resource])[0];',
  `              const receivedResourceId = resource && resource.id;
              // Pair expansion can prepend an original. Preserve the identity
              // that this message actually delivered and requested to open.
              resource = _alloStudentSafeResources([resource]).find(item => item.id === receivedResourceId);`
);
replaceOnce(
  "          const assignmentRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', assignmentId);",
  `          // Describe the uploaded bodies, not their compact reference entries.
          // A failed read falls through to the existing full-pack fallback.
          const deliveryResources = await hydrateSessionAssets(appId, resources);
          if (!Array.isArray(deliveryResources) || deliveryResources.some(item => !item || item.__alloResourceRef || item.__alloResourcesManifestRef)) {
              throw new Error('Assignment resource assets are unavailable');
          }
          const deliverySummary = _alloSharedActivityModule()?.describeAssignmentDelivery?.(deliveryResources, resources[0]?.id, selectedResourceIds);
          const assignmentRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', assignmentId);`
);
replaceOnce(
  '              currentResourceId: resources[0]?.id || resourcesToAssign[0]?.id || null,\n              resources,',
  '              currentResourceId: resources[0]?.id || resourcesToAssign[0]?.id || null,\n              resources,\n              deliverySummary,'
);
replaceOnce(
  'deliverySummary: _alloSharedActivityModule()?.describeAssignmentDelivery?.(resources, resources[0]?.id, selectedResourceIds), createdAt:',
  'deliverySummary, createdAt:'
);
replaceOnce(
  `                  let restoredResources = rawResources;
                  try {
                      restoredResources = await hydrateSessionAssets(hostId, rawResources);
                  } catch (hydrateErr) {
                      warnLog('Assignment asset hydration failed:', hydrateErr);
                  }`,
  `                  const restoredResources = await hydrateSessionAssets(hostId, rawResources);
                  if (!Array.isArray(restoredResources) || restoredResources.some(item => !item || item.__alloResourceRef || item.__alloResourcesManifestRef)) {
                      throw new Error('Assignment resource assets are unavailable');
                  }`
);
fs.writeFileSync(path.join(__dirname, 'host-integration.patch'), createTwoFilesPatch('AlloFlowANTI.txt', 'AlloFlowANTI.txt', before, after, '', '', { context: 4 }));
console.log('Prepared host-integration.patch; shared host was not modified.');
