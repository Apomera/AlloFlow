#!/usr/bin/env node
/**
 * Pipeline integrity checker.
 *
 * Scans the UI for every `_docPipeline.XXX` call and cross-references against
 * the exports in doc_pipeline_source.jsx + doc_pipeline_module.js. Any UI call
 * that doesn't map to an export is a "dangling reference" — at runtime it will
 * throw "X is not a function" when the user clicks the button.
 *
 * This is the class of bug that bit us twice:
 *   - 1542fc8 silently dropped Expert Workbench (processExpertCommand)
 *   - 1ce8054 silently dropped Multi-session + Tier 2/2.5/3 (7 functions)
 * Both times the commit message was bland and unrelated.
 *
 * Usage:
 *   node check-pipeline-integrity.js          # exits non-zero if dangling refs found
 *   node check-pipeline-integrity.js --quiet  # only print on failure
 *
 * Install as a pre-commit hook:
 *   cp check-pipeline-integrity.js .git/hooks/pre-commit
 *   chmod +x .git/hooks/pre-commit
 *
 * …or add to package.json scripts: "precommit": "node check-pipeline-integrity.js"
 */
const fs = require('fs');
const path = require('path');

// ROOT = repo root (parent of dev-tools/)
const ROOT = path.resolve(__dirname, '..');
const UI_FILES = [
  path.join(ROOT, 'AlloFlowANTI.txt'),
  path.join(ROOT, 'prismflow-deploy', 'src', 'App.jsx'),
];
const PIPELINE_FILES = [
  path.join(ROOT, 'doc_pipeline_source.jsx'),
  path.join(ROOT, 'doc_pipeline_module.js'),
];

const quiet = process.argv.includes('--quiet');

function read(file) {
  try { return fs.readFileSync(file, 'utf-8'); }
  catch (e) { console.error('Cannot read ' + file + ': ' + e.message); return ''; }
}

// Every identifier the UI tries to call on the pipeline object.
function uiCalls(src) {
  const re = /_docPipeline\.([a-zA-Z_][a-zA-Z0-9_]*)/g;
  const found = new Set();
  let m;
  while ((m = re.exec(src)) !== null) found.add(m[1]);
  return found;
}

// Every identifier exported from the factory's `return { ... }` block.
function exportsIn(src) {
  const start = src.indexOf('\n  return {');
  if (start === -1) return new Set();
  // Match the closing `};` at indent level 2.
  const end = src.indexOf('\n  };', start);
  if (end === -1) return new Set();
  const block = src.slice(start, end);
  const re = /^\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*:/gm;
  const found = new Set();
  let m;
  while ((m = re.exec(block)) !== null) found.add(m[1]);
  return found;
}

const allUiCalls = new Set();
UI_FILES.forEach(f => {
  const src = read(f);
  uiCalls(src).forEach(c => allUiCalls.add(c));
});

const pipelineExports = {};
PIPELINE_FILES.forEach(f => {
  pipelineExports[path.basename(f)] = exportsIn(read(f));
});

// A call is "dangling" if at least one pipeline file is missing it.
const dangling = {};
allUiCalls.forEach(call => {
  Object.keys(pipelineExports).forEach(fileName => {
    if (!pipelineExports[fileName].has(call)) {
      (dangling[fileName] = dangling[fileName] || []).push(call);
    }
  });
});

const hasIssues = Object.values(dangling).some(arr => arr.length > 0);

if (hasIssues) {
  console.error('\n❌ Pipeline integrity check FAILED\n');
  console.error('The UI calls these _docPipeline methods that are not exported. At runtime,');
  console.error('calling them will throw "X is not a function" — exactly the class of regression');
  console.error('that hit us in 1542fc8 (Expert Workbench) and 1ce8054 (Multi-session).\n');
  Object.keys(dangling).forEach(fileName => {
    if (dangling[fileName].length === 0) return;
    console.error('  ' + fileName + ' is missing ' + dangling[fileName].length + ' export(s):');
    dangling[fileName].sort().forEach(name => console.error('    • ' + name));
    console.error('');
  });
  console.error('Fix: either add the missing exports to the factory return block, or remove');
  console.error('the UI call sites. If you are seeing this after a rebase/merge, an earlier');
  console.error('commit likely dropped code accidentally — check `git log -S "<name>" -- <file>`.');
  process.exit(1);
}

if (!quiet) {
  console.log('✓ Pipeline integrity OK');
  console.log('  UI calls: ' + allUiCalls.size);
  Object.keys(pipelineExports).forEach(f => {
    console.log('  ' + f + ' exports: ' + pipelineExports[f].size);
  });
}
process.exit(0);
