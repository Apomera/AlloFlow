const fs = require('node:fs');
const path = require('node:path');
const acorn = require('acorn');
const assert = require('node:assert/strict');
const keys = ['intro', 'round_label', 'latest_option', 'round_option', 'starting_counts', 'latest_button', 'round_note', 'observed_range'];
module.exports = function(base, source) {
  const labels = new Map();
  function walk(node) {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'CallExpression' && node.callee.name === 'ct') {
      const [key, fallback] = node.arguments;
      if (key?.type === 'Literal' && fallback?.type === 'Literal' && keys.includes(key.value)) labels.set('resistance_comparison_' + key.value, fallback.value);
    }
    for (const child of Object.values(node)) {
      if (Array.isArray(child)) child.forEach(walk);
      else if (child && typeof child.type === 'string') walk(child);
    }
  }
  walk(acorn.parse(source, { ecmaVersion: 'latest' })); assert.equal(labels.size, 8);
  const before = JSON.parse(base), original = before.stem.microbiology;
  let text = base;
  const newline = text.includes('\r\n') ? '\r\n' : '\n', additions = [];
  for (const [key, value] of labels) {
    if (original[key] === undefined) additions.push('      ' + JSON.stringify(key) + ': ' + JSON.stringify(value) + ',');
    else {
      const previous = JSON.stringify(key) + ': ' + JSON.stringify(original[key]);
      assert.equal(text.indexOf(previous), text.lastIndexOf(previous)); assert(text.includes(previous));
      text = text.replace(previous, JSON.stringify(key) + ': ' + JSON.stringify(value));
    }
  }
  const anchor = '      "resistance_comparison_title":';
  assert(text.includes(anchor)); assert.equal(text.indexOf(anchor), text.lastIndexOf(anchor));
  if (additions.length) text = text.replace(anchor, additions.join(newline) + newline + anchor);
  const after = JSON.parse(text);
  const expected = structuredClone(before);
  for (const [key, value] of labels) expected.stem.microbiology[key] = value;
  assert.deepEqual(after, expected, 'Registry patch changed another namespace or label.');
  return { text, labels: Object.fromEntries(labels) };
};
