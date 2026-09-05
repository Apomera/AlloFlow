#!/usr/bin/env node
'use strict';
// Cross-pack glossary review. 26 packs share one catalog, and a teacher may well use two of
// them in the same year, so any term defined in more than one pack is a place they can quietly
// disagree with each other. This prints every shared term with its definitions side by side.
//
// This is a REPORT, not a gate, and it is deliberately not part of audit_allopacks.cjs.
// Most differences here are correct: a grade-3 pack should define Force more simply than a
// grade-6 one, and Function means unrelated things in a cell pack and an algebra pack. Only a
// human reading them can tell a grade-appropriate difference from a contradiction. Two real
// conflicts were found this way on 2026-09-05, both in Point of View:
//   Compare — defined as "show how two things are alike" while that pack's own reading says
//             "compare what each one knows" and "see the contrast". It contradicted itself.
//   Retell  — defined as telling a story "in a new way", which overwrites the grade-2 pack's
//             meaning of a faithful recount, in order, in the student's own words.
//
//   node dev-tools/report_shared_glossary_terms.cjs [--json]
const fs = require('fs');
const path = require('path');
const dir = path.join(path.resolve(__dirname, '..'), 'allopacks');
const byTerm = new Map();
const gradeOf = {};
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.allopack.json')).sort()) {
  const pack = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8').replace(/^﻿/, ''));
  const slug = f.replace('.allopack.json', '');
  gradeOf[slug] = pack.allopack.gradeLevel;
  const g = pack.history.find((r) => r.type === 'glossary');
  if (!g) continue;
  for (const item of g.data) {
    const key = item.term.trim().toLowerCase();
    if (!byTerm.has(key)) byTerm.set(key, []);
    byTerm.get(key).push({ slug, grade: pack.allopack.gradeLevel, term: item.term, def: item.def, tier: item.tier });
  }
}
const shared = [...byTerm.values()].filter((v) => v.length > 1).sort((a, b) => b.length - a.length || a[0].term.localeCompare(b[0].term));
if (process.argv.includes('--json')) { console.log(JSON.stringify(shared, null, 2)); process.exit(0); }
console.log(shared.length + ' terms are defined in more than one pack.');
console.log('Read each group and ask: is this a grade-appropriate difference, or a contradiction?\n');
for (const defs of shared) {
  console.log('### ' + defs[0].term + '   (' + defs.length + ' packs)');
  for (const d of defs) console.log('   ' + d.slug.padEnd(36) + '[' + d.grade + '] ' + d.tier.padEnd(16) + d.def);
  console.log('');
}
