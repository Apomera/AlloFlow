const assert = require('node:assert/strict');
const { restorePass54Source } = require('./cephalopod_pass54_reference.cjs');

function restorePre55AnimalSource(source) {
  // Later exact inverse guards need the full tool to reach model-only changes.
  const historical = restorePass54Source(source);
  const start = historical.indexOf('function createCLHuntAnimal(');
  const end = historical.indexOf('// Compact, individually owned prey rig.', start);
  assert.ok(start >= 0 && end > start, 'Historical animal factory anchors missing');
  return historical.slice(start, end);
}

module.exports = { restorePre55AnimalSource };
