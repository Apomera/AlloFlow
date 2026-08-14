#!/usr/bin/env node
// harvest_reading_library_tables.cjs — emit key/English pairs for the reading
// catalog's DYNAMIC keys.
//
// The shelf, font, facet and length labels are localized at their consumption
// site with a key built from the row's stable id:
//     tr('readinglib_collection_' + collection.id + '_label', collection.label)
// A literal-scanning harvester cannot see those keys, because the key never
// appears as a literal anywhere. This reads the tables themselves and expands
// the same key shape, so the registry gets exactly what the runtime will ask
// for — no more, no less.
'use strict';
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'reading_library_module.js');

const ast = parser.parse(fs.readFileSync(SRC, 'utf8'), { sourceType: 'script', errorRecovery: true });

/** Pull `var NAME = [ {...}, ... ]` out of the module as plain data. */
function readTable(name) {
  let found = null;
  const walk = (node) => {
    if (!node || typeof node !== 'object' || found) return;
    if (node.type === 'VariableDeclarator' && node.id && node.id.name === name && node.init && node.init.type === 'ArrayExpression') {
      found = node.init;
      return;
    }
    for (const k of Object.keys(node)) {
      const v = node[k];
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object' && v.type) walk(v);
    }
  };
  walk(ast.program);
  if (!found) throw new Error(`table not found: ${name}`);
  return found.elements.filter(Boolean).map((el) => {
    const row = {};
    for (const p of el.properties || []) {
      if (!p.key) continue;
      const k = p.key.name || p.key.value;
      if (p.value && p.value.type === 'StringLiteral') row[k] = p.value.value;
    }
    return row;
  });
}

const out = {};
const add = (key, text) => { if (key && text) out[key] = text; };

// Shelf cards: three separate strings per collection.
for (const row of readTable('LIBRARY_COLLECTIONS')) {
  add(`readinglib_collection_${row.id}_label`, row.label);
  add(`readinglib_collection_${row.id}_sources`, row.sourceLine);
  add(`readinglib_collection_${row.id}_summary`, row.summary);
}
// Reader appearance.
for (const row of readTable('READER_THEMES')) add(`readinglib_theme_${row.id}`, row.label);
for (const row of readTable('READER_FONTS')) add(`readinglib_font_${row.id}`, row.label);
// Filter facets.
for (const row of readTable('TOPIC_FACETS')) add(`readinglib_topicfacet_${row.id}`, row.label);
for (const row of readTable('READING_LENGTHS')) add(`readinglib_length_${row.id}`, row.label);
for (const row of readTable('LICENSE_FACETS')) add(`readinglib_license_${row.id}`, row.label);

const dest = path.join(__dirname, 'harvest_readinglib_tables.json');
fs.writeFileSync(dest, JSON.stringify(out, null, 2), 'utf8');
console.log(`expanded ${Object.keys(out).length} dynamic reading-catalog key(s) -> ${path.relative(ROOT, dest)}`);
