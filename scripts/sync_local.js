#!/usr/bin/env node
/**
 * AlloFlow — Local App Auto-Sync (Phase B3)
 *
 * Detects which sections have changed in AlloFlowANTI.txt (by comparing
 * fingerprint hashes) and re-extracts + cloud-strips only the changed ones.
 * Optionally triggers local_build.js when sections changed.
 *
 * Usage:
 *   node scripts/sync_local.js                     # dry run — show what changed
 *   node scripts/sync_local.js --apply             # extract changed + rebuild
 *   node scripts/sync_local.js --apply --no-build  # extract only, skip rebuild
 *   node scripts/sync_local.js --apply --force     # force re-extract all sections
 *   node scripts/sync_local.js --validate          # check for cloud code leaking through
 *   node scripts/sync_local.js --verbose           # verbose output
 *
 * How it works:
 *   1. Reads AlloFlowANTI.txt and splits at @section markers (same as extractor)
 *   2. Hashes each section's raw text (SHA-1, first 16 chars)
 *   3. Reads the header comment in each existing section_*.js file (hash stored there)
 *   4. Compares: if hashes differ → section was changed upstream
 *   5. With --apply: runs the extractor only for changed sections
 *   6. After extraction: validates no cloud patterns slipped through
 *   7. Optionally runs local_build.js
 *
 * Exit codes:
 *   0 — no changes (or changes applied successfully)
 *   1 — changes detected (dry run) OR build/extract error
 *   2 — cloud code leak detected after extraction (--validate)
 */
'use strict';

const fs      = require('fs');
const path    = require('path');
const crypto  = require('crypto');
const { execSync, spawnSync } = require('child_process');

// ── Paths ─────────────────────────────────────────────────────────────────────

const ROOT         = path.resolve(__dirname, '..');
const SOURCE       = path.join(ROOT, 'AlloFlowANTI.txt');
const SECTIONS_DIR = path.join(ROOT, 'local-app', 'modules', 'local');
const LOCAL_BUILD  = path.join(ROOT, 'local_build.js');
const EXTRACTOR    = path.join(ROOT, 'scripts', 'extract_modules_local.js');

// ── CLI args ──────────────────────────────────────────────────────────────────

const ARGS      = process.argv.slice(2);
const APPLY     = ARGS.includes('--apply');
const NO_BUILD  = ARGS.includes('--no-build');
const FORCE     = ARGS.includes('--force');
const VALIDATE  = ARGS.includes('--validate');
const VERBOSE   = ARGS.includes('--verbose');

// ── Colour helpers (no dependencies) ─────────────────────────────────────────

const C = {
    reset:  '\x1b[0m',
    bold:   '\x1b[1m',
    green:  '\x1b[32m',
    yellow: '\x1b[33m',
    red:    '\x1b[31m',
    cyan:   '\x1b[36m',
    grey:   '\x1b[90m',
};

function log(msg, color = '') {
    process.stdout.write(color + msg + C.reset + '\n');
}

function info(msg)    { log(`  ${msg}`, C.cyan); }
function ok(msg)      { log(`  ✓ ${msg}`, C.green); }
function warn(msg)    { log(`  ⚠ ${msg}`, C.yellow); }
function err(msg)     { log(`  ✗ ${msg}`, C.red); }
function detail(msg)  { if (VERBOSE) log(`    ${msg}`, C.grey); }

// ── Section parser (mirrors extract_modules_local.js logic) ──────────────────

/**
 * Extract sections from AlloFlowANTI.txt.
 * Returns Map<sectionKey, rawContent (string)>
 */
function parseSections(sourceText) {
    const sections = new Map();
    const MARKER = /^\/\/\s*@section\s+(\w+)/m;
    const lines   = sourceText.split('\n');

    let currentKey  = '__pre_core__';
    let buffer      = [];
    let lineNum     = 0;
    const startLine = new Map();
    startLine.set('__pre_core__', 0);

    for (const line of lines) {
        const match = line.match(/^\/\/\s*@section\s+(\w+)/);
        if (match) {
            // Save buffered content for the previous section
            sections.set(currentKey, { content: buffer.join('\n'), startLine: startLine.get(currentKey) || 0, endLine: lineNum - 1 });
            currentKey = match[1];
            startLine.set(currentKey, lineNum);
            buffer = [];
        } else {
            buffer.push(line);
        }
        lineNum++;
    }
    // Last section
    sections.set(currentKey, { content: buffer.join('\n'), startLine: startLine.get(currentKey) || 0, endLine: lineNum - 1 });

    return sections;
}

/**
 * Compute a short SHA-1 fingerprint for a section's raw content.
 */
function fingerprint(content) {
    return crypto.createHash('sha1').update(content).digest('hex').slice(0, 16);
}

/**
 * Read the stored hash from an existing section file.
 * Format written by extractor: "// hash: <fingerprint>"
 */
function readStoredHash(filePath) {
    if (!fs.existsSync(filePath)) return null;
    try {
        const first = fs.readFileSync(filePath, 'utf8').slice(0, 512);
        const m = first.match(/\/\/\s*hash:\s*([0-9a-f]{8,})/);
        return m ? m[1] : null;
    } catch {
        return null;
    }
}

/**
 * Map from section key → expected filename slug.
 */
function sectionToSlug(key) {
    if (key === '__pre_core__') return 'pre_core';
    // e.g.  ESCAPE_ROOM_ENGINE → escape-room-engine
    return key.toLowerCase().replace(/_/g, '-');
}

// ── Cloud code leak detection (post-extraction validation) ───────────────────

const CLOUD_PATTERNS = [
    { pattern: /import\s+\{[^}]+\}\s+from\s+['"]@google-cloud\/generative-ai['"]/,         label: 'Gemini import' },
    { pattern: /import\s+\{[^}]+\}\s+from\s+['"]openai['"]/,                                label: 'OpenAI import' },
    { pattern: /import\s+\{[^}]+\}\s+from\s+['"]firebase\//,                                label: 'Firebase import' },
    { pattern: /new\s+GoogleGenerativeAI\(/,                                                  label: 'GoogleGenerativeAI constructor' },
    { pattern: /getFirestore\(\)|initializeFirestore\(/,                                      label: 'Firestore init' },
    { pattern: /collection\(db,/,                                                             label: 'Firestore collection call' },
    { pattern: /import\.meta\.env\.VITE_GEMINI/,                                              label: 'Vite Gemini env var' },
    { pattern: /process\.env\.GEMINI_API_KEY/,                                                label: 'Gemini env key (Node)' },
];

function validateCloudStripping(sectionsDir) {
    let leakCount   = 0;
    const leaks     = [];

    const files = fs.readdirSync(sectionsDir).filter(f => f.endsWith('.js'));
    for (const file of files) {
        const filePath = path.join(sectionsDir, file);
        const content  = fs.readFileSync(filePath, 'utf8');
        const lineArr  = content.split('\n');

        for (const { pattern, label } of CLOUD_PATTERNS) {
            const lineIdx = lineArr.findIndex(l => pattern.test(l));
            if (lineIdx !== -1) {
                leaks.push({ file, label, line: lineIdx + 1, text: lineArr[lineIdx].slice(0, 120) });
                leakCount++;
            }
        }
    }

    return { leaks, leakCount };
}

// ── Main ──────────────────────────────────────────────────────────────────────

(async function main() {
    log(`\n${C.bold}${C.cyan}AlloFlow — Local App Sync${C.reset}\n`);

    // ── Read source ───────────────────────────────────────────────────────────

    if (!fs.existsSync(SOURCE)) {
        err(`AlloFlowANTI.txt not found at: ${SOURCE}`);
        process.exit(1);
    }

    info('Reading AlloFlowANTI.txt…');
    const sourceText = fs.readFileSync(SOURCE, 'utf8');
    const lines      = sourceText.split('\n').length;
    info(`  ${lines.toLocaleString()} lines`);

    // ── Parse sections ────────────────────────────────────────────────────────

    info('Parsing sections…');
    const sections = parseSections(sourceText);
    info(`  ${sections.size} sections found`);
    detail([...sections.keys()].join(', '));

    // ── Compare hashes ────────────────────────────────────────────────────────

    if (!fs.existsSync(SECTIONS_DIR)) {
        warn(`Sections dir not found: ${SECTIONS_DIR}`);
        warn('Run: node scripts/extract_modules_local.js  (initial extraction)');
        process.exit(1);
    }

    const changed   = [];
    const unchanged = [];
    const newSec    = [];

    for (const [key, { content, startLine: sl, endLine: el }] of sections) {
        const slug     = sectionToSlug(key);
        const filePath = path.join(SECTIONS_DIR, `section_${slug}.js`);
        const hash     = fingerprint(content);
        const stored   = readStoredHash(filePath);

        if (!fs.existsSync(filePath)) {
            newSec.push({ key, slug, hash, startLine: sl, endLine: el });
            detail(`NEW      ${key}  (${sl}–${el})`);
        } else if (stored !== hash || FORCE) {
            changed.push({ key, slug, hash, stored, startLine: sl, endLine: el });
            detail(`CHANGED  ${key}  was=${stored}  now=${hash}  (${sl}–${el})`);
        } else {
            unchanged.push(key);
            detail(`unchanged ${key}`);
        }
    }

    // ── Report ────────────────────────────────────────────────────────────────

    log('');
    log(`${C.bold}Summary${C.reset}`);
    log(`  ${C.green}${unchanged.length} unchanged${C.reset}`);

    if (newSec.length > 0) {
        log(`  ${C.cyan}${newSec.length} new sections${C.reset}`);
        newSec.forEach(s => log(`    + ${s.key}  (lines ${s.startLine}–${s.endLine})`, C.cyan));
    }

    if (changed.length > 0) {
        log(`  ${C.yellow}${changed.length} changed sections${C.reset}`);
        changed.forEach(s => log(`    ~ ${s.key}  (lines ${s.startLine}–${s.endLine})  was=${s.stored}  now=${s.hash}`, C.yellow));
    }

    const totalDirty = changed.length + newSec.length;

    if (totalDirty === 0) {
        log('');
        ok('Local app is up-to-date with AlloFlowANTI.txt');

        if (VALIDATE) {
            log('');
            info('Running cloud-strip validation…');
            const { leaks, leakCount } = validateCloudStripping(SECTIONS_DIR);
            if (leakCount === 0) {
                ok('No cloud code leaks detected');
            } else {
                leaks.forEach(l => err(`Leak in ${l.file}:${l.line} — ${l.label}\n    ${l.text}`));
                err(`${leakCount} cloud code leak(s) detected in extracted section files!`);
                process.exit(2);
            }
        }

        process.exit(0);
    }

    if (!APPLY && !VALIDATE) {
        log('');
        warn(`${totalDirty} section(s) need updating.`);
        warn('Run with --apply to extract and rebuild:');
        log(`    node scripts/sync_local.js --apply`, C.grey);
        log('');
        process.exit(1);
    }

    // ── Apply: run extractor ──────────────────────────────────────────────────

    if (APPLY) {
        log('');
        info(`Extracting ${totalDirty} changed/new section(s)…`);
        log(`  Running: node ${EXTRACTOR}`, C.grey);

        // The extractor always re-extracts all sections, which is fine (fast ≤ 5s).
        // A section-selective extractor is a future optimisation.
        const result = spawnSync(process.execPath, [EXTRACTOR, ...(VERBOSE ? ['--verbose'] : [])], {
            cwd:   ROOT,
            stdio: 'inherit',
        });

        if (result.status !== 0) {
            err('Extractor failed — aborting sync.');
            process.exit(1);
        }

        ok('Extraction complete');

        // ── Post-extraction validation ────────────────────────────────────────

        log('');
        info('Validating cloud stripping…');
        const { leaks, leakCount } = validateCloudStripping(SECTIONS_DIR);

        if (leakCount > 0) {
            leaks.forEach(l => err(`Leak in ${l.file}:${l.line} — ${l.label}\n    ${l.text}`));
            err(`${leakCount} cloud code leak(s) detected — check extraction rules.`);
            if (!NO_BUILD) {
                warn('Skipping build due to validation failure.');
            }
            process.exit(2);
        } else {
            ok('Validation passed — no cloud code leaks detected');
        }

        // ── Rebuild ───────────────────────────────────────────────────────────

        if (!NO_BUILD) {
            log('');
            info('Rebuilding local app…');
            log(`  Running: node ${LOCAL_BUILD}`, C.grey);

            const buildResult = spawnSync(process.execPath, [LOCAL_BUILD], {
                cwd:   ROOT,
                stdio: 'inherit',
            });

            if (buildResult.status !== 0) {
                err('Build failed.');
                process.exit(1);
            }

            ok('Build complete');
        }
    }

    // ── Validate-only mode ────────────────────────────────────────────────────

    if (VALIDATE && !APPLY) {
        log('');
        info('Running cloud-strip validation (validate-only)…');
        const { leaks, leakCount } = validateCloudStripping(SECTIONS_DIR);
        if (leakCount === 0) {
            ok('No cloud code leaks detected');
        } else {
            leaks.forEach(l => err(`Leak in ${l.file}:${l.line} — ${l.label}\n    ${l.text}`));
            err(`${leakCount} cloud code leak(s) detected!`);
            process.exit(2);
        }
    }

    // ── Completion ────────────────────────────────────────────────────────────

    log('');
    ok('Sync complete');
    log('');

    // Print section diff summary for commit message use
    if (APPLY && totalDirty > 0) {
        const all = [...changed.map(s => `~${s.key}`), ...newSec.map(s => `+${s.key}`)];
        log(`${C.bold}Suggested commit message:${C.reset}`);
        log(`  chore: auto-sync local app (${all.join(', ')})`, C.grey);
        log('');
    }

    process.exit(0);
})();
