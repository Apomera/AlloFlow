#!/usr/bin/env node
/**
 * AlloFlow B2.3 — Local App Build
 *
 * Assembles the local-only AlloFlow app from cloud-stripped section files.
 * Pipeline:
 *   1. Run extract_modules_local.js (unless --skip-extract)
 *   2. Read section files from local-app/modules/local/ in SECTION_ORDER
 *   3. Concatenate into local-app/src/LocalApp.jsx
 *   4. Run esbuild to compile JSX → local-app/build/app.js
 *   5. Copy index.html + static assets into local-app/build/
 *
 * Usage:
 *   node local_build.js
 *   node local_build.js --skip-extract   (use existing section files, skip re-extraction)
 *   node local_build.js --no-bundle      (stop after writing LocalApp.jsx, skip esbuild)
 *   node local_build.js --dev            (esbuild in watch mode, skips extract)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const SKIP_EXTRACT = args.includes('--skip-extract') || args.includes('--dev');
const NO_BUNDLE = args.includes('--no-bundle');
const DEV_MODE = args.includes('--dev');

// ── Paths ─────────────────────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname);
const LOCAL_APP = path.join(ROOT, 'local-app');
const MODULES_LOCAL = path.join(LOCAL_APP, 'modules', 'local');
const MANIFEST_PATH = path.join(LOCAL_APP, 'modules', 'manifest_local.json');
const SRC_DIR = path.join(LOCAL_APP, 'src');
const BUILD_DIR = path.join(LOCAL_APP, 'build');
const OUT_JSX = path.join(SRC_DIR, 'LocalApp.jsx');
const OUT_JS = path.join(BUILD_DIR, 'app.js');

// Section files must be concatenated in this exact order to preserve scope.
// Matches SECTION_ORDER in extract_modules_local.js.
const SECTION_ORDER = [
    '__pre_core__',
    'GLOBAL_MUTE',
    'LARGE_FILE_HANDLER',
    'SAFETY_CHECKER',
    'WORD_SOUNDS_STRINGS',
    'PHONEME_DATA',
    'VISUAL_PANEL',
    'WORD_SOUNDS_GENERATOR',
    'WORD_SOUNDS_REVIEW',
    'STUDENT_ANALYTICS',
    'STUDENT_SUBMIT',
    'SPEECH_BUBBLE',
    'ALLOBOT',
    'MISSION_REPORT',
    'STUDENT_QUIZ',
    'DRAFT_FEEDBACK',
    'TEACHER_GATE',
    'ADVENTURE_SYSTEMS',
    'INTERACTIVE_GAMES',
    'ADVENTURE_UI',
    'CHARTS',
    'ESCAPE_ROOM',
    'ESCAPE_ROOM_TEACHER',
    'LIVE_QUIZ',
    'LEARNER_PROGRESS',
    'TEACHER_DASHBOARD',
    'QUICKSTART_WIZARD',
    'IMMERSIVE_READER',
    'CAST_LOBBY',
    'READ_THIS_PAGE',
    'BILINGUAL_RENDERER',
    '__main_app__',
];

function sectionFilename(name) {
    const safe = name.toLowerCase().replace(/__/g, '').replace(/_/g, '-') || 'pre-core';
    return `section_${safe}.js`;
}

function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ── Step 1 — (Re-)extract local sections ─────────────────────────────────────
function runExtract() {
    console.log('\n── Step 1: Extracting local sections ──────────────────────────────────');
    const extractScript = path.join(ROOT, 'scripts', 'extract_modules_local.js');
    if (!fs.existsSync(extractScript)) {
        console.error('❌ scripts/extract_modules_local.js not found');
        process.exit(1);
    }
    const result = spawnSync(process.execPath, [extractScript], {
        stdio: 'inherit',
        cwd: ROOT,
    });
    if (result.status !== 0) {
        console.error('❌ Extraction failed (exit code ' + result.status + ')');
        process.exit(1);
    }
}

// ── Step 2-3 — Concatenate sections → LocalApp.jsx ───────────────────────────
function assembleLocalApp() {
    console.log('\n── Step 2-3: Assembling LocalApp.jsx ──────────────────────────────────');

    if (!fs.existsSync(MANIFEST_PATH)) {
        console.error('❌ Manifest not found: ' + MANIFEST_PATH);
        console.error('   Run without --skip-extract to regenerate.');
        process.exit(1);
    }

    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
    const chunks = [];

    chunks.push([
        '// ╔══════════════════════════════════════════════════════════════════════╗',
        '// ║  AlloFlow — Local App (cloud-stripped)                              ║',
        '// ║  Auto-assembled by local_build.js — DO NOT EDIT MANUALLY            ║',
        `// ║  Built: ${new Date().toISOString()}`,
        '// ╚══════════════════════════════════════════════════════════════════════╝',
        '// @mode react',
        '',
    ].join('\n'));

    let missing = 0;
    for (const sectionName of SECTION_ORDER) {
        const entry = manifest.sections[sectionName];
        if (!entry) {
            console.warn(`  ⚠️  Section not in manifest: ${sectionName} — skipping`);
            missing++;
            continue;
        }

        const filePath = path.join(MODULES_LOCAL, entry.file);
        if (!fs.existsSync(filePath)) {
            console.warn(`  ⚠️  Section file missing: ${entry.file} — skipping`);
            missing++;
            continue;
        }

        let content = fs.readFileSync(filePath, 'utf-8');

        // Strip the metadata header comments (lines starting with // up to the blank line)
        // so they don't pollute the JSX output.
        content = content.replace(/^(?:\/\/[^\n]*\n)+\n/, '');

        chunks.push(
            `\n// ─────────────────────────────────────────────────────────────────────\n` +
            `// Section: ${sectionName}  [${entry.hash}]\n` +
            `// ─────────────────────────────────────────────────────────────────────\n` +
            content
        );

        console.log(`  ✅ ${sectionName.padEnd(25)} [${entry.hash}]${entry.cloudStripped ? ' 🔧stripped' : ''}`);
    }

    if (missing > 0) {
        console.warn(`\n  ⚠️  ${missing} section(s) missing. Output may be incomplete.`);
    }

    ensureDir(SRC_DIR);
    const assembled = chunks.join('\n');
    fs.writeFileSync(OUT_JSX, assembled, 'utf-8');

    const lineCount = assembled.split('\n').length;
    const kb = Math.round(Buffer.byteLength(assembled, 'utf-8') / 1024);
    console.log(`\n  📄 LocalApp.jsx: ${lineCount.toLocaleString()} lines, ${kb} KB`);
    console.log(`     → ${path.relative(ROOT, OUT_JSX)}`);
}

// ── Step 4 — esbuild ──────────────────────────────────────────────────────────
async function runEsbuild() {
    console.log('\n── Step 4: Compiling with esbuild ─────────────────────────────────────');
    ensureDir(BUILD_DIR);

    // Use esbuild's JS API to avoid Node version compatibility issues with
    // the CLI binary path on Windows + newer Node versions.
    let esbuild;
    try {
        esbuild = require(path.join(LOCAL_APP, 'node_modules', 'esbuild'));
    } catch {
        try {
            esbuild = require(path.join(ROOT, 'node_modules', 'esbuild'));
        } catch {
            console.error('❌ esbuild not found. Run: cd local-app && npm install');
            process.exit(1);
        }
    }

    console.log(`  🔨 esbuild (JS API) — compiling LocalApp.jsx…`);

    try {
        const result = await esbuild.build({
            entryPoints: [OUT_JSX],
            bundle: true,
            platform: 'browser',
            format: 'iife',
            globalName: 'AlloFlowApp',
            jsx: 'automatic',
            loader: { '.js': 'jsx' },
            outfile: OUT_JS,
            sourcemap: true,
            // External packages loaded from CDN/window in index.html
            external: ['react', 'react-dom', 'lucide-react'],
            minify: !DEV_MODE,
            logLevel: 'warning',
        });

        if (result.errors.length > 0) {
            console.error('❌ esbuild errors:');
            result.errors.forEach(e => console.error('  ', e.text, e.location ? `(${e.location.file}:${e.location.line})` : ''));
            process.exit(1);
        }
        if (result.warnings.length > 0) {
            console.warn(`  ⚠️  ${result.warnings.length} warning(s)`);
        }
    } catch (err) {
        console.error('❌ esbuild failed:', err.message || err);
        // Print first few errors
        if (err.errors) {
            err.errors.slice(0, 5).forEach(e => {
                const loc = e.location ? ` (${e.location.file}:${e.location.line}:${e.location.column})` : '';
                console.error('  ', e.text + loc);
            });
            if (err.errors.length > 5) console.error(`  … and ${err.errors.length - 5} more`);
        }
        process.exit(1);
    }

    const outStat = fs.existsSync(OUT_JS) ? fs.statSync(OUT_JS) : null;
    if (outStat) {
        const kb = Math.round(outStat.size / 1024);
        console.log(`\n  📦 app.js: ${kb} KB → ${path.relative(ROOT, OUT_JS)}`);
    }
}

// ── Step 5 — Copy static assets ───────────────────────────────────────────────
function copyAssets() {
    console.log('\n── Step 5: Copying static assets ──────────────────────────────────────');

    const PUBLIC_DIR = path.join(LOCAL_APP, 'public');
    if (!fs.existsSync(PUBLIC_DIR)) {
        console.log('  ℹ️  No local-app/public/ directory — skipping asset copy');
        return;
    }

    // Copy files from public/ to build/
    const files = fs.readdirSync(PUBLIC_DIR);
    for (const file of files) {
        const src = path.join(PUBLIC_DIR, file);
        const dst = path.join(BUILD_DIR, file);
        if (fs.statSync(src).isFile()) {
            fs.copyFileSync(src, dst);
            console.log(`  📋 ${file}`);
        }
    }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
    console.log('┌──────────────────────────────────────────────────────────────────────┐');
    console.log('│  AlloFlow Local Build                                                │');
    console.log('└──────────────────────────────────────────────────────────────────────┘');

    if (!SKIP_EXTRACT) {
        runExtract();
    } else {
        console.log('\n── Step 1: Skipped (--skip-extract) ───────────────────────────────────');
    }

    assembleLocalApp();

    if (NO_BUNDLE) {
        console.log('\n── Step 4: Skipped (--no-bundle) ──────────────────────────────────────');
        console.log('\n✅ LocalApp.jsx written. Run esbuild manually to compile.');
        return;
    }

    await runEsbuild();
    copyAssets();

    console.log('\n✅ Local build complete.');
    console.log('   Serve with: cd local-app && npm start');
    console.log('   Or the admin Electron app serves local-app/build/ automatically.');
}

main().catch(err => { console.error('❌ Fatal:', err); process.exit(1); });
