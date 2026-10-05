const assert = require('node:assert/strict');
function collect(source) {
  assert.equal(typeof source, 'string');
  return {};
}
function patch(base, source) {
  assert.equal(typeof base, 'string');
  const labels = collect(source);
  const registry = JSON.parse(base);
  assert(registry.stem && registry.stem.microbiology && typeof registry.stem.microbiology === 'object');
  return { text: base, labels };
}
module.exports = patch;
module.exports.collect = collect;
