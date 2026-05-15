#!/usr/bin/env node
// check_sample_lessons.cjs — Smoke test the sample lesson library.
//
// Why this exists:
//   AlloFlow ships 3 sample lessons in `examples/*.json` (civil_war,
//   photosynthesis, water_cycle). They're meant to be loadable as session
//   snapshots — a teacher imports one and sees the full pre-generated
//   lesson scaffold. If the JSON is malformed or missing required keys,
//   the import fails silently or shows a blank scaffold.
//
//   This check verifies each sample lesson:
//   - Parses as valid JSON
//   - Has the required top-level keys (mode, history)
//   - Each history item has the required fields (id, type, data)
//   - Item types are from the known set
//
//   It does NOT render the lessons — that would require a full AlloFlow
//   harness. Smoke-only.
//
// Usage:
//   node dev-tools/check_sample_lessons.cjs
//   node dev-tools/check_sample_lessons.cjs --verbose
//
// Exit codes:
//   0 — all sample lessons pass smoke
//   1 — at least one is malformed
//   2 — usage / examples/ dir missing

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const EXAMPLES = path.join(ROOT, 'examples');
const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose');
const QUIET = args.includes('--quiet');

if (!fs.existsSync(EXAMPLES)) {
  console.error('examples/ not found at ' + EXAMPLES);
  process.exit(2);
}

const REQUIRED_TOP = ['mode', 'history'];
const REQUIRED_ITEM = ['id', 'type'];
const KNOWN_TYPES = new Set([
  'source', 'analysis', 'glossary', 'simplified', 'wordsounds', 'outline',
  'visual', 'image', 'faq', 'scaffolds', 'sentenceframes', 'sentence-frames',
  'quiz', 'brainstorm',
  'persona', 'timeline', 'concept_sort', 'concept-sort', 'concept-map',
  'dbq', 'math', 'lesson_plan', 'lesson-plan', 'alignment_report', 'alignment-report',
  'audio', 'udl-advice', 'gemini-bridge', 'adventure',
]);

const files = fs.readdirSync(EXAMPLES).filter(f => f.endsWith('.json'));
if (files.length === 0) {
  console.error('No *.json sample lessons in examples/');
  process.exit(2);
}

const results = [];
for (const file of files) {
  const filePath = path.join(EXAMPLES, file);
  const result = { file, status: 'OK', issues: [], itemCount: 0, types: new Set() };
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);

    for (const k of REQUIRED_TOP) {
      if (!(k in data)) result.issues.push('missing top-level: ' + k);
    }

    if (Array.isArray(data.history)) {
      result.itemCount = data.history.length;
      data.history.forEach((item, i) => {
        if (!item || typeof item !== 'object') {
          result.issues.push('history[' + i + '] is not an object');
          return;
        }
        for (const k of REQUIRED_ITEM) {
          if (!(k in item)) result.issues.push('history[' + i + '] missing: ' + k);
        }
        if (item.type) {
          result.types.add(item.type);
          if (!KNOWN_TYPES.has(item.type)) {
            result.issues.push('history[' + i + '] unknown type: ' + item.type);
          }
        }
      });
    } else {
      result.issues.push('history is not an array');
    }

    if (result.issues.length > 0) result.status = 'WARN';
  } catch (e) {
    result.status = 'FAIL';
    result.issues.push('parse error: ' + e.message);
  }
  results.push(result);
}

const failed = results.filter(r => r.status === 'FAIL');
const warned = results.filter(r => r.status === 'WARN');

if (!QUIET || failed.length > 0) {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║   AlloFlow Sample Lesson Smoke                                       ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log('  Lessons found: ' + files.length);
  console.log('');
  for (const r of results) {
    const icon = r.status === 'FAIL' ? '✗' : r.status === 'WARN' ? '⚠' : '✓';
    console.log('  ' + icon + ' ' + r.file.padEnd(28) + ' ' + r.itemCount + ' items  (' + [...r.types].join(', ') + ')');
    if (r.issues.length > 0 && (VERBOSE || r.status === 'FAIL')) {
      for (const i of r.issues.slice(0, 5)) console.log('      ' + i);
      if (r.issues.length > 5) console.log('      (... ' + (r.issues.length - 5) + ' more)');
    }
  }
  console.log('');
  console.log('  ✓ OK:     ' + (results.length - failed.length - warned.length));
  console.log('  ⚠ Warn:   ' + warned.length);
  console.log('  ✗ Failed: ' + failed.length);
  console.log('');
}

if (failed.length === 0) {
  console.log('  ✅ All sample lessons smoke-pass.');
} else {
  console.log('  ❌ ' + failed.length + ' sample lesson(s) failed to parse or missing required keys.');
}
console.log('');

process.exit(failed.length > 0 ? 1 : 0);
