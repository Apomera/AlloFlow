#!/usr/bin/env node
/**
 * AlloFlow — Clean Verbatim Section Overrides
 *
 * Compares every file in modules/local/ against its modules/raw/ counterpart.
 * Files whose content is identical (after stripping header comments) are
 * redundant overrides — local_build.js will automatically fall back to raw/.
 *
 * Usage:
 *   node scripts/clean_verbatim_sections.js            (audit only — no deletions)
 *   node scripts/clean_verbatim_sections.js --delete   (delete confirmed verbatim files)
 *
 * Safe to run multiple times. Only deletes if --delete flag is passed.
 * Always run `node local_build.js` after to confirm the build still works.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const args      = process.argv.slice(2);
const DO_DELETE = args.includes('--delete');

const ROOT          = path.resolve(__dirname, '..');
const LOCAL_APP     = path.join(ROOT, 'local-app');
const MODULES_LOCAL = path.join(LOCAL_APP, 'modules', 'local');
const MODULES_RAW   = path.join(LOCAL_APP, 'modules', 'raw');

function stripHeader(content) {
    return content.replace(/^(?:\/\/[^\n]*\n)+\n?/, '').trimStart();
}

function normalizeContent(content) {
    // Strip headers AND normalize line endings for reliable comparison
    return stripHeader(content).replace(/\r\n/g, '\n').trimEnd();
}

console.log('\n══ AlloFlow Verbatim Section Audit ════════════════════════════════════');
if (DO_DELETE) {
    console.log('   --delete flag set — verbatim files WILL be removed from modules/local/\n');
} else {
    console.log('   Audit only. Pass --delete to remove confirmed verbatim files.\n');
}

if (!fs.existsSync(MODULES_LOCAL)) {
    console.error(`❌ modules/local/ not found: ${MODULES_LOCAL}`);
    process.exit(1);
}
if (!fs.existsSync(MODULES_RAW)) {
    console.error(`❌ modules/raw/ not found: ${MODULES_RAW}`);
    process.exit(1);
}

const localFiles = fs.readdirSync(MODULES_LOCAL).filter(f => f.endsWith('.js'));

const results = {
    verbatim:     [],  // safe to delete — identical to raw/
    modified:     [],  // has real differences — must keep in local/
    noRaw:        [],  // no raw/ counterpart — local-only section
};

for (const file of localFiles) {
    const localPath = path.join(MODULES_LOCAL, file);
    const rawPath   = path.join(MODULES_RAW,   file);

    if (!fs.existsSync(rawPath)) {
        results.noRaw.push(file);
        continue;
    }

    const localContent = normalizeContent(fs.readFileSync(localPath, 'utf-8'));
    const rawContent   = normalizeContent(fs.readFileSync(rawPath,   'utf-8'));

    if (localContent === rawContent) {
        results.verbatim.push(file);
    } else {
        // Show a quick summary of the diff size
        const localLines = localContent.split('\n').length;
        const rawLines   = rawContent.split('\n')  .length;
        const delta      = localLines - rawLines;
        results.modified.push({ file, localLines, rawLines, delta });
    }
}

// ── Report ────────────────────────────────────────────────────────────────────
console.log(`\n  LOCAL-ONLY sections (no raw/ counterpart — always build from local/):`);
if (results.noRaw.length === 0) {
    console.log('    none');
} else {
    results.noRaw.forEach(f => console.log(`    ${f}`));
}

console.log(`\n  MODIFIED sections (real differences from raw/ — must keep in local/):`);
if (results.modified.length === 0) {
    console.log('    none');
} else {
    results.modified.forEach(({ file, localLines, rawLines, delta }) => {
        const sign = delta >= 0 ? '+' : '';
        console.log(`    ${file.padEnd(45)} local=${localLines} raw=${rawLines} delta=${sign}${delta}`);
    });
}

console.log(`\n  VERBATIM sections (identical to raw/ — ${DO_DELETE ? 'DELETING' : 'safe to delete'}):`);
if (results.verbatim.length === 0) {
    console.log('    none — modules/local/ is already lean');
} else {
    results.verbatim.forEach(file => {
        if (DO_DELETE) {
            fs.unlinkSync(path.join(MODULES_LOCAL, file));
            console.log(`    🗑  DELETED  ${file}`);
        } else {
            console.log(`    →  ${file}`);
        }
    });
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n══ Summary ═════════════════════════════════════════════════════════════');
console.log(`  Local-only : ${results.noRaw.length} file(s) — kept`);
console.log(`  Modified   : ${results.modified.length} file(s) — kept`);
console.log(`  Verbatim   : ${results.verbatim.length} file(s) — ${DO_DELETE ? 'deleted' : 'can be deleted with --delete'}`);

if (!DO_DELETE && results.verbatim.length > 0) {
    console.log(`\n  Run with --delete to remove the ${results.verbatim.length} verbatim file(s):`);
    console.log(`    node scripts/clean_verbatim_sections.js --delete`);
}

if (DO_DELETE && results.verbatim.length > 0) {
    console.log(`\n  Verify the build still works:`);
    console.log(`    node local_build.js`);
}

console.log('');
