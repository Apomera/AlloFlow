#!/usr/bin/env node
/**
 * AlloFlow — Local App Build
 *
 * Assembles the local-only AlloFlow app from local-app/modules/local/.
 * These module files ARE the source of truth for the local app.
 * No extraction from AlloFlowANTI.txt — that is the web app's source.
 *
 * Pipeline:
 *   1. Read section files from local-app/modules/local/ in SECTION_ORDER
 *   2. Concatenate into local-app/src/LocalApp.jsx
 *   3. Run esbuild to compile JSX → local-app/build/app.js
 *   4. Copy index.html + static assets into local-app/build/
 *
 * Usage:
 *   node local_build.js
 *   node local_build.js --no-bundle      (stop after writing LocalApp.jsx, skip esbuild)
 *   node local_build.js --dev            (esbuild with sourcemap, no minify)
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const NO_BUNDLE = args.includes('--no-bundle');
const DEV_MODE = args.includes('--dev');

// ── Paths ─────────────────────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname);
const LOCAL_APP = path.join(ROOT, 'local-app');
const MODULES_LOCAL = path.join(LOCAL_APP, 'modules', 'local');
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

// ── Step 1 — Concatenate sections → LocalApp.jsx ─────────────────────────────
function assembleLocalApp() {
    console.log('\n── Step 1: Assembling LocalApp.jsx from local modules ────────────────');

    if (!fs.existsSync(MODULES_LOCAL)) {
        console.error('❌ Module source directory not found: ' + MODULES_LOCAL);
        console.error('   local-app/modules/local/ is the source of truth for the local app.');
        process.exit(1);
    }

    const chunks = [];

    chunks.push([
        '// ╔══════════════════════════════════════════════════════════════════════╗',
        '// ║  AlloFlow — Local App                                               ║',
        '// ║  Auto-assembled by local_build.js — DO NOT EDIT MANUALLY            ║',
        `// ║  Built: ${new Date().toISOString()}`,
        '// ╚══════════════════════════════════════════════════════════════════════╝',
        '// @mode react',
        '',
    ].join('\n'));

    let missing = 0;
    for (const sectionName of SECTION_ORDER) {
        const fileName = sectionFilename(sectionName);
        const filePath = path.join(MODULES_LOCAL, fileName);

        if (!fs.existsSync(filePath)) {
            console.warn(`  ⚠️  Section file missing: ${fileName} — skipping`);
            missing++;
            continue;
        }

        let content = fs.readFileSync(filePath, 'utf-8');

        // Strip the metadata header comments (lines starting with // up to the blank line)
        // so they don't pollute the JSX output.
        content = content.replace(/^(?:\/\/[^\n]*\n)+\n/, '');

        chunks.push(
            `\n// ─────────────────────────────────────────────────────────────────────\n` +
            `// Section: ${sectionName}\n` +
            `// ─────────────────────────────────────────────────────────────────────\n` +
            content
        );

        console.log(`  ✅ ${sectionName.padEnd(25)} ${fileName}`);
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

// ── Step 2 — esbuild ──────────────────────────────────────────────────────────
async function runEsbuild() {
    console.log('\n── Step 2: Compiling with esbuild ─────────────────────────────────────');
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
            jsx: 'transform',
            jsxFactory: 'React.createElement',
            jsxFragment: 'React.Fragment',
            loader: { '.js': 'jsx' },
            outfile: OUT_JS,
            sourcemap: true,
            // External packages loaded from CDN/window in index.html
            // Note: lucide-react is NOT external — it's bundled so icons resolve correctly
            external: ['react', 'react-dom', 'react-dom/client'],
            // Inject a require shim so IIFE externals resolve to window globals
            banner: {
                js: `var require = (function() { var map = { 'react': window.React, 'react/jsx-runtime': window.React, 'react-dom': window.ReactDOM, 'react-dom/client': window.ReactDOM }; return function(m) { if (map[m]) return map[m]; throw new Error('Module not found: ' + m); }; })();`
            },
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

// ── Step 3 — Copy static assets ───────────────────────────────────────────────
function copyAssets() {
    console.log('\n── Step 3: Copying static assets ──────────────────────────────────────');

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

// ── Step 4 — Copy shared assets ───────────────────────────────────────────────
function copySharedAssets() {
    console.log('\n── Step 4: Copying shared assets ──────────────────────────────────────');

    const SHARED_DIR = path.join(ROOT, 'shared');
    if (!fs.existsSync(SHARED_DIR)) {
        console.warn('  ⚠️  shared/ directory not found — skipping');
        return;
    }

    const SHARED_BUILD = path.join(BUILD_DIR, 'shared');
    ensureDir(SHARED_BUILD);

    // Copy root-level shared files (CSS, images, data, strings)
    const rootFiles = fs.readdirSync(SHARED_DIR);
    for (const file of rootFiles) {
        const src = path.join(SHARED_DIR, file);
        const stat = fs.statSync(src);
        if (stat.isFile()) {
            fs.copyFileSync(src, path.join(SHARED_BUILD, file));
            console.log(`  📋 shared/${file}`);
        }
    }

    // Copy audio_banks/ subdirectory
    const AUDIO_BANKS_SRC = path.join(SHARED_DIR, 'audio_banks');
    if (fs.existsSync(AUDIO_BANKS_SRC)) {
        const AUDIO_BANKS_DST = path.join(SHARED_BUILD, 'audio_banks');
        ensureDir(AUDIO_BANKS_DST);
        for (const file of fs.readdirSync(AUDIO_BANKS_SRC)) {
            const src = path.join(AUDIO_BANKS_SRC, file);
            if (fs.statSync(src).isFile()) {
                fs.copyFileSync(src, path.join(AUDIO_BANKS_DST, file));
                console.log(`  📋 shared/audio_banks/${file}`);
            }
        }
    }

    // Copy modules/ subdirectory (CDN modules for web app, also usable locally)
    const MODULES_SRC = path.join(SHARED_DIR, 'modules');
    if (fs.existsSync(MODULES_SRC)) {
        const MODULES_DST = path.join(SHARED_BUILD, 'modules');
        ensureDir(MODULES_DST);
        for (const entry of fs.readdirSync(MODULES_SRC)) {
            const src = path.join(MODULES_SRC, entry);
            const stat = fs.statSync(src);
            if (stat.isFile()) {
                fs.copyFileSync(src, path.join(MODULES_DST, entry));
                console.log(`  📋 shared/modules/${entry}`);
            } else if (stat.isDirectory()) {
                // sel_hub/, stem_lab/ subdirs
                const subDst = path.join(MODULES_DST, entry);
                ensureDir(subDst);
                for (const subFile of fs.readdirSync(src)) {
                    const subSrc = path.join(src, subFile);
                    if (fs.statSync(subSrc).isFile()) {
                        fs.copyFileSync(subSrc, path.join(subDst, subFile));
                    }
                }
                const count = fs.readdirSync(subDst).length;
                console.log(`  📋 shared/modules/${entry}/ (${count} files)`);
            }
        }
    }

    console.log('  ✅ Shared assets copied to build/shared/');
}

// ── Copy shared/libs/ (third-party JS libraries + fonts) ──
function copySharedLibs() {
    console.log('\n── Step 5: Copying bundled third-party libraries ─────────────────────');

    const LIBS_SRC = path.join(ROOT, 'shared', 'libs');
    if (!fs.existsSync(LIBS_SRC)) {
        console.warn('  ⚠️  shared/libs/ not found — skipping');
        return;
    }

    const LIBS_DST = path.join(BUILD_DIR, 'shared', 'libs');
    ensureDir(LIBS_DST);

    for (const entry of fs.readdirSync(LIBS_SRC)) {
        const src = path.join(LIBS_SRC, entry);
        const stat = fs.statSync(src);
        if (stat.isFile()) {
            fs.copyFileSync(src, path.join(LIBS_DST, entry));
            console.log(`  📋 shared/libs/${entry}`);
        } else if (stat.isDirectory()) {
            // fonts/ subdir
            const subDst = path.join(LIBS_DST, entry);
            ensureDir(subDst);
            for (const subFile of fs.readdirSync(src)) {
                const subSrc = path.join(src, subFile);
                if (fs.statSync(subSrc).isFile()) {
                    fs.copyFileSync(subSrc, path.join(subDst, subFile));
                }
            }
            const count = fs.readdirSync(subDst).length;
            console.log(`  📋 shared/libs/${entry}/ (${count} files)`);
        }
    }

    console.log('  ✅ Third-party libraries copied to build/shared/libs/');
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
    console.log('┌──────────────────────────────────────────────────────────────────────┐');
    console.log('│  AlloFlow Local Build                                                │');
    console.log('│  Source: local-app/modules/local/ (no monolith extraction)            │');
    console.log('└──────────────────────────────────────────────────────────────────────┘');

    assembleLocalApp();

    if (NO_BUNDLE) {
        console.log('\n── Step 2: Skipped (--no-bundle) ──────────────────────────────────────');
        console.log('\n✅ LocalApp.jsx written. Run esbuild manually to compile.');
        return;
    }

    await runEsbuild();
    copyAssets();
    copySharedAssets();
    copySharedLibs();

    console.log('\n✅ Local build complete.');
    console.log('   Serve with: cd local-app && npm start');
    console.log('   Or the admin Electron app serves local-app/build/ automatically.');
}

main().catch(err => { console.error('❌ Fatal:', err); process.exit(1); });
