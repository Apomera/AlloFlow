#!/usr/bin/env node
/**
 * Migrate the 6 remaining Category B modules via the reverse-compile pipeline.
 * For each: run _reverse_migrate, verify semantic equivalence, delete the
 * legacy build_view_*.js + its c:/tmp/mini_*.txt source (if present).
 */
const fs = require('fs');
const { execSync } = require('child_process');
const parser = require('@babel/parser');
const generator = require('@babel/generator').default;
const traverse = require('@babel/traverse').default;

const ROOT = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
process.chdir(ROOT);

const REMAINING = ['alignment_report', 'analysis', 'quiz', 'simplified', 'timeline', 'glossary'];

function normalizeJS(code) {
  const ast = parser.parse(code, { sourceType: 'script', plugins: ['jsx'], allowReturnOutsideFunction: true });
  traverse(ast, {
    enter(p) {
      p.node.leadingComments = null;
      p.node.trailingComments = null;
      p.node.innerComments = null;
      p.node.loc = null;
      p.node.extra = null;
    },
  });
  return generator(ast, { comments: false, compact: true, retainLines: false, jsescOption: { minimal: true } }).code;
}

const successes = [];
const failures = [];

for (const stem of REMAINING) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`MIGRATING: ${stem}`);
  console.log('='.repeat(60));

  const moduleFile = `view_${stem}_module.js`;
  const buildScript = `build_view_${stem}.js`;
  const tmpSource = `c:/tmp/mini_${stem}.txt`;
  const tmpSourceAlt = `c:/tmp/${stem}_inner.txt`; // glossary uses this naming

  if (!fs.existsSync(buildScript)) { failures.push(`${stem}: build script missing`); continue; }
  if (!fs.existsSync(moduleFile)) { failures.push(`${stem}: deployed module missing`); continue; }

  // Snapshot deployed module for verification + rollback
  const deployedSave = `C:/tmp/_${stem}_deployed_pre_migrate.js`;
  fs.copyFileSync(moduleFile, deployedSave);
  const deployed = fs.readFileSync(deployedSave, 'utf-8');

  // Run the migrator (will reverse-compile, write source.jsx + _build_view_X_module.js, rebuild)
  try {
    execSync(`node _reverse_migrate.cjs ${stem}`, { cwd: ROOT, stdio: 'pipe' });
  } catch (e) {
    console.log(`  FAIL: migrator threw`);
    console.log(`    ${(e.stderr ? e.stderr.toString() : e.message).slice(0, 500)}`);
    failures.push(`${stem}: migrator error`);
    fs.copyFileSync(deployedSave, moduleFile);
    fs.copyFileSync(deployedSave, `desktop/web-app/public/${moduleFile}`);
    continue;
  }

  // Verify semantic equivalence
  const rebuilt = fs.readFileSync(moduleFile, 'utf-8');
  let semanticMatch = false;
  let normErr = null;
  try {
    const nO = normalizeJS(deployed);
    const nB = normalizeJS(rebuilt);
    semanticMatch = nO === nB;
  } catch (e) {
    normErr = e.message;
  }

  if (semanticMatch) {
    console.log(`  OK: semantic equivalence verified`);
    // Delete legacy build script + stale tmp source
    fs.unlinkSync(buildScript);
    let tmpDeleted = false;
    if (fs.existsSync(tmpSource)) { fs.unlinkSync(tmpSource); tmpDeleted = true; }
    if (fs.existsSync(tmpSourceAlt)) { fs.unlinkSync(tmpSourceAlt); tmpDeleted = true; }
    console.log(`  Deleted legacy ${buildScript}` + (tmpDeleted ? ` + tmp source` : ` (no tmp source to delete)`));
    successes.push(stem);
  } else {
    console.log(`  FAIL: semantic match failed${normErr ? ' (parse error: ' + normErr + ')' : ''}`);
    // Restore deployed
    fs.copyFileSync(deployedSave, moduleFile);
    fs.copyFileSync(deployedSave, `desktop/web-app/public/${moduleFile}`);
    // Remove the new source + build script so state is clean for next attempt
    if (fs.existsSync(`view_${stem}_source.jsx`)) fs.unlinkSync(`view_${stem}_source.jsx`);
    if (fs.existsSync(`_build_view_${stem}_module.js`)) fs.unlinkSync(`_build_view_${stem}_module.js`);
    failures.push(`${stem}: semantic mismatch`);
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log(`SUMMARY`);
console.log('='.repeat(60));
console.log(`Migrated: ${successes.length} / ${REMAINING.length}`);
successes.forEach(s => console.log(`  OK  ${s}`));
if (failures.length) {
  console.log(`\nFailed: ${failures.length}`);
  failures.forEach(f => console.log(`  ERR ${f}`));
}
