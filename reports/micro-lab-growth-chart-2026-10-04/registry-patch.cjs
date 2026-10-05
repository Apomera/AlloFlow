const acorn = require('acorn');
const assert = require('node:assert/strict');
const prefix = 'stem.microbiology.growth_visual_';
const fallbacks = {
  hour: 'Chart model hour',
  selected: 'Selected model hour',
  control: 'Control at selected hour',
  trial: 'Trial at selected hour',
  difference: 'Trial minus control at selected hour',
  note: 'The guide follows the same model hour used for citations and notebook comparisons. Saved predictions and outcomes refer to hour 24.',
  scale: 'Fixed scale: 0–100 arbitrary population units; 0–24 model hours.',
  legend: 'Control: dashed line and circle. Trial: solid line and diamond.'
};
function collect(source) {
  const labels = new Map();
  function walk(node) {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'CallExpression' && node.callee.type === 'Identifier' && node.callee.name === '__alloMBT') {
      const [key, fallback] = node.arguments;
      if (key?.type === 'Literal' && typeof key.value === 'string' && key.value.startsWith(prefix)) {
        const suffix = key.value.slice(prefix.length);
        assert(Object.hasOwn(fallbacks, suffix), 'Unexpected Growth chart label: ' + suffix);
        assert(fallback?.type === 'Literal' && typeof fallback.value === 'string');
        assert.equal(fallback.value, fallbacks[suffix], 'Growth chart fallback changed: ' + suffix);
        const registryKey = 'growth_visual_' + suffix;
        if (labels.has(registryKey)) assert.equal(labels.get(registryKey), fallback.value);
        labels.set(registryKey, fallback.value);
      }
    }
    for (const child of Object.values(node)) {
      if (Array.isArray(child)) child.forEach(walk);
      else if (child && typeof child.type === 'string') walk(child);
    }
  }
  walk(acorn.parse(source, { ecmaVersion: 'latest' }));
  assert.equal(labels.size, 8, 'Expected exactly eight Growth chart labels.');
  return Object.fromEntries(labels);
}
function patch(base, source) {
  const labels = collect(source), before = JSON.parse(base);
  const original = before.stem.microbiology;
  const newline = base.includes('\r\n') ? '\r\n' : '\n';
  const additions = [];
  for (const [key, value] of Object.entries(labels)) {
    assert.equal(original[key], undefined, 'The parent already contains Growth chart label: ' + key);
    additions.push('      ' + JSON.stringify(key) + ': ' + JSON.stringify(value) + ',');
  }
  const anchor = '      "investigation_chart_alt":';
  assert(base.includes(anchor)); assert.equal(base.indexOf(anchor), base.lastIndexOf(anchor));
  const text = base.replace(anchor, additions.join(newline) + newline + anchor);
  const expected = structuredClone(before);
  Object.assign(expected.stem.microbiology, labels);
  assert.deepEqual(JSON.parse(text), expected, 'Registry patch changed another namespace or label.');
  return { text, labels };
}
module.exports = patch;
module.exports.collect = collect;
