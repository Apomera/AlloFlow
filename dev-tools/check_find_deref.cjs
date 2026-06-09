#!/usr/bin/env node
// check_find_deref.cjs — flag `.find(...).field` chains that turn data drift
// (renamed ids, i18n-filtered arrays, stale persisted state) into hard tool
// crashes.
//
// Background:
//   The STEM Lab audit (2026-06-07, workflow wxhhrqhm1) found ~10 tools using
//   the pattern `ARR.find(x => x.id === id).field` without a null guard.
//   Examples that have already bitten:
//     - stem_tool_autorepair.js:5695  LAB_SCENARIOS.find(s => s.id === id).name
//     - stem_tool_learning_lab.js:18222 same pattern
//     - stem_tool_rocks.js:4524, 4651-4663 chained ROCKS.find(...).label
//   Each crashes the tool the first time the input id mismatches what's in
//   the array — common when a saved `d.toolId` survives an array rename or
//   i18n-cleanse strips entries.
//
// What this gate flags:
//   Any AST CallExpression on `.find(<arrow>)` whose result is immediately
//   member-accessed (.find(...).name, .find(...).label, etc.) WITHOUT being
//   wrapped in optional chaining (.find(...)?.field) or guarded by a
//   surrounding null check.
//
// What this gate does NOT flag:
//   - `.find(...) ?? defaultObj.field`  (caller explicitly guards)
//   - `const r = arr.find(...); if (r) r.field`  (explicit guard)
//   - `arr.find(...)` alone (the result is checked / used safely)
//   - `Array.find(...)` constructor call (not a method)
//
// Replacement pattern:
//   var rec = window.StemLab.findById(ARR, id);
//   var name = rec ? rec.name : 'Unknown';
// OR:
//   var name = window.StemLab.findById(ARR, id)?.name ?? 'Unknown';
//
// Status: BLOCKING as of 2026-06-07 (verify_all passes --blocking). All 11
// audit-named tools have been converted to window.StemLab.findById or
// extract-and-null-guard. New findings will fail the gate.
//
// Usage:
//   node dev-tools/check_find_deref.cjs                  (all stem_lab files)
//   node dev-tools/check_find_deref.cjs --verbose        (per-finding detail)
//   node dev-tools/check_find_deref.cjs --quiet          (only summary)
//
// Exit codes:
//   0 — gate clean OR informational mode (always exit 0 until promoted)
//   1 — reserved for future blocking promotion
//   2 — internal error (parser failure)

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const STEM_DIR = path.join(ROOT, 'stem_lab');
const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose');
const QUIET = args.includes('--quiet');
// Informational by default. Set BLOCKING=true here (or pass --blocking) to
// gate the deploy on this check — only do that after the audit-named tools
// are converted (autorepair, learning_lab, rocks, plus the ~7 others).
const BLOCKING = args.includes('--blocking');

function loadParser() {
    try {
        return require(path.join(ROOT, 'node_modules', '@babel', 'parser'));
    } catch (e) {
        console.error('check_find_deref: @babel/parser not found.');
        console.error('  Install with: cd UDL-Tool-Updated && npm install --no-save @babel/parser');
        process.exit(2);
    }
}

const babelParser = loadParser();

function parse(src, filename) {
    try {
        return babelParser.parse(src, {
            sourceType: 'script',
            plugins: ['jsx'],
            errorRecovery: true,
        });
    } catch (e) {
        if (!QUIET) console.error(`  parse error in ${filename}: ${e.message}`);
        return null;
    }
}

function walk(node, visitor, parent = null) {
    if (!node || typeof node !== 'object') return;
    visitor(node, parent);
    for (const key of Object.keys(node)) {
        if (key === 'loc' || key === 'start' || key === 'end') continue;
        const child = node[key];
        if (Array.isArray(child)) {
            for (const c of child) walk(c, visitor, node);
        } else if (child && typeof child === 'object' && child.type) {
            walk(child, visitor, node);
        }
    }
}

function lineOf(node) {
    return (node.loc && node.loc.start && node.loc.start.line) || '?';
}

function isFindCall(node) {
    // `<something>.find(<arg>)` — CallExpression whose callee is a
    // MemberExpression with property name 'find', NOT optional-chained.
    if (!node || node.type !== 'CallExpression') return false;
    const callee = node.callee;
    if (!callee || callee.type !== 'MemberExpression') return false;
    if (callee.computed) return false;
    if (!callee.property || callee.property.type !== 'Identifier') return false;
    if (callee.property.name !== 'find') return false;
    if (callee.optional) return false;
    if (node.arguments.length === 0) return false;
    const arg = node.arguments[0];
    if (!arg) return false;
    // Only flag when the predicate is an inline arrow or function —
    // skips `arr.find(predicateName)` cases where the predicate name might
    // have null guards built in.
    if (arg.type !== 'ArrowFunctionExpression' && arg.type !== 'FunctionExpression') return false;
    return true;
}

function scanFile(filePath) {
    const src = fs.readFileSync(filePath, 'utf8');
    const ast = parse(src, path.relative(ROOT, filePath));
    if (!ast) return [];
    const findings = [];

    walk(ast, (node, parent) => {
        if (!isFindCall(node)) return;
        if (!parent) return;
        // FLAG: `findCall.field` — parent is a NON-optional MemberExpression
        // whose object IS the find call (left side).
        if (parent.type === 'MemberExpression' && parent.object === node && !parent.optional) {
            // Extract the .field name for the report.
            let fieldName = '?';
            if (parent.property) {
                if (parent.property.type === 'Identifier') fieldName = parent.property.name;
                else if (parent.property.type === 'StringLiteral') fieldName = parent.property.value;
            }
            findings.push({
                line: lineOf(node),
                field: fieldName,
            });
        }
    });

    return findings;
}

function listStemFiles() {
    const out = [];
    function walkDir(dir) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const p = path.join(dir, entry.name);
            if (entry.isDirectory()) walkDir(p);
            else if (entry.isFile() && entry.name.endsWith('.js')) out.push(p);
        }
    }
    walkDir(STEM_DIR);
    return out;
}

function main() {
    const files = listStemFiles();
    let totalFindings = 0;
    const perFile = [];

    for (const f of files) {
        let findings;
        try { findings = scanFile(f); }
        catch (e) {
            if (!QUIET) console.error(`  error scanning ${path.relative(ROOT, f)}: ${e.message}`);
            continue;
        }
        if (findings.length === 0) continue;
        totalFindings += findings.length;
        perFile.push({ file: path.relative(ROOT, f), findings });
    }

    if (totalFindings === 0) {
        console.log('✓ check_find_deref: no `.find(<arrow>)` immediate-deref chains in stem_lab/. Promotion to blocking gate would be safe.');
        return 0;
    }

    const label = BLOCKING ? 'BLOCKED' : 'INFORMATIONAL';
    console.log(`⊙ check_find_deref [${label}]: ${totalFindings} `
        + `\`.find(<arrow>).field\` chain(s) across ${perFile.length} file(s) in stem_lab/.`);
    console.log('  Pattern: ARR.find(x => x.id === id).field — crashes if the id is renamed / i18n-filtered.');
    console.log('  Replacement: window.StemLab.findById(ARR, id)?.field ?? fallback');

    if (VERBOSE || !QUIET) {
        for (const { file, findings } of perFile) {
            console.log('');
            console.log('  ' + file + ':');
            for (const f of findings) {
                console.log(`    line ${f.line}: .find(...).${f.field}`);
            }
        }
    }

    if (BLOCKING) {
        console.error('');
        console.error('check_find_deref: BLOCKING mode — fix the findings above or run without --blocking for informational mode.');
        return 1;
    }
    return 0;
}

process.exit(main());
