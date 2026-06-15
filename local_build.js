#!/usr/bin/env node
/**
 * local_build.js — Builds local-app/build/ from local-app/src/LocalApp.jsx
 *
 * Usage:
 *   node local_build.js              # full build
 *   node local_build.js --skip-extract  # skip module extraction, re-bundle only
 *   node local_build.js --dev        # development (no minification, source maps)
 */

'use strict';

const path = require('path');
const fs   = require('fs');

const ROOT      = __dirname;
const APP_DIR   = path.join(ROOT, 'local-app');
const BUILD_DIR = path.join(APP_DIR, 'build');
const SRC_DIR   = path.join(APP_DIR, 'src');
const PUBLIC_DIR = path.join(APP_DIR, 'public');

const args      = process.argv.slice(2);
const isDev     = args.includes('--dev');
const skipExtract = args.includes('--skip-extract');

// ── Helpers ────────────────────────────────────────────────────────────────────

function copyFile(src, dst) {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dst);
    console.log(`  copy  ${path.relative(ROOT, src)} → ${path.relative(ROOT, dst)}`);
  }
}

function writeStub(dst, content = '') {
  if (!fs.existsSync(dst)) {
    fs.writeFileSync(dst, content, 'utf-8');
    console.log(`  stub  ${path.relative(ROOT, dst)}`);
  }
}

// ── Phase 0: Ensure build dir ─────────────────────────────────────────────────

fs.mkdirSync(BUILD_DIR, { recursive: true });

// ── Phase 1: Copy public assets ───────────────────────────────────────────────

console.log('[local_build] Copying public assets...');
copyFile(path.join(PUBLIC_DIR, 'index.html'), path.join(BUILD_DIR, 'index.html'));

// Copy tailwind.css if it exists; otherwise the HTML falls back to CDN
copyFile(path.join(PUBLIC_DIR, 'tailwind.css'), path.join(BUILD_DIR, 'tailwind.css'));

// React UMD bundles (needed for the index.html script tags)
const reactSrc  = path.join(APP_DIR, 'node_modules', 'react', 'umd', 'react.development.js');
const rdSrc     = path.join(APP_DIR, 'node_modules', 'react-dom', 'umd', 'react-dom.development.js');
copyFile(reactSrc, path.join(BUILD_DIR, 'react.development.js'));
copyFile(rdSrc,    path.join(BUILD_DIR, 'react-dom.development.js'));

// ── Phase 2: Copy helper module files ─────────────────────────────────────────

console.log('[local_build] Copying module helpers...');
// sharedContext_local.js lives at local-app/sharedContext_local.js
copyFile(path.join(APP_DIR, 'sharedContext_local.js'), path.join(BUILD_DIR, 'sharedContext_local.js'));
// Real local modules (LM Studio AI routing + SQLite DB client) — these are
// loaded by index.html script tags and MUST be the real implementations.
copyFile(path.join(PUBLIC_DIR, 'ai_local_module.js'), path.join(BUILD_DIR, 'ai_local_module.js'));
copyFile(path.join(PUBLIC_DIR, 'db_local_module.js'), path.join(BUILD_DIR, 'db_local_module.js'));

// ── Phase 2b: Copy shared runtime assets (fetched as /shared/* by the app) ───
// The web app (CRA) serves all of prismflow-deploy/public/ at the site root;
// the local app requests the same files under ./shared/. Mirror the layout:
//   shared/<top-level files>      ← strings, loaders, json, images
//   shared/libs/                  ← vendored browser libraries
//   shared/modules/               ← runtime-loaded feature modules
//   shared/modules/stem_lab/      ← STEM Lab tool plugins
//   shared/modules/sel_hub/       ← SEL Hub tool plugins

console.log('[local_build] Copying shared assets...');
const WEB_PUBLIC = path.join(ROOT, 'prismflow-deploy', 'public');
const SHARED_DIR = path.join(BUILD_DIR, 'shared');
fs.mkdirSync(SHARED_DIR, { recursive: true });

function findSource(f) {
  const rootSrc = path.join(ROOT, f);
  if (fs.existsSync(rootSrc)) return rootSrc;
  const webSrc = path.join(WEB_PUBLIC, f);
  if (fs.existsSync(webSrc)) return webSrc;
  return null;
}

function copyDir(srcDir, dstDir) {
  fs.mkdirSync(dstDir, { recursive: true });
  let n = 0;
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, entry.name);
    const dst = path.join(dstDir, entry.name);
    if (entry.isDirectory()) {
      n += copyDir(src, dst);
    } else {
      fs.copyFileSync(src, dst);
      n++;
    }
  }
  return n;
}

const SHARED_FILES = [
  'ui_strings.js',            // i18n strings — without this the UI shows raw keys
  'help_strings.js',
  'kokoro_tts_loader.js',
  'piper_tts_loader.js',
  'audio_bank.json',
  'psychometric_probes.json',
  'psychometric_literacy_probes.json',
  'psychometric_math_probes.json',
  'rainbow-book.jpg',
];
for (const f of SHARED_FILES) {
  const src = findSource(f);
  if (src) copyFile(src, path.join(SHARED_DIR, f));
  else console.warn(`  WARN  shared asset not found anywhere: ${f}`);
}

// Vendored browser libraries (pdf.js, storage, math) — no CDN at runtime
const LIBS_SRC = path.join(PUBLIC_DIR, 'libs');
if (fs.existsSync(LIBS_SRC)) {
  const n = copyDir(LIBS_SRC, path.join(SHARED_DIR, 'libs'));
  console.log(`  copy  local-app/public/libs → build/shared/libs (${n} files)`);
} else {
  console.warn('  WARN  local-app/public/libs missing — PDF + storage libraries unavailable');
}

// Runtime-loaded feature modules (all *_module.js the web app serves)
const MODULES_DIR = path.join(SHARED_DIR, 'modules');
fs.mkdirSync(MODULES_DIR, { recursive: true });
let moduleCount = 0;
for (const f of fs.readdirSync(WEB_PUBLIC)) {
  if (f.endsWith('_module.js')) {
    fs.copyFileSync(path.join(WEB_PUBLIC, f), path.join(MODULES_DIR, f));
    moduleCount++;
  }
}
console.log(`  copy  prismflow-deploy/public/*_module.js → build/shared/modules (${moduleCount} files)`);

// STEM Lab + SEL Hub tool plugin directories
for (const dir of ['stem_lab', 'sel_hub']) {
  const src = path.join(WEB_PUBLIC, dir);
  if (fs.existsSync(src)) {
    const n = copyDir(src, path.join(MODULES_DIR, dir));
    console.log(`  copy  prismflow-deploy/public/${dir} → build/shared/modules/${dir} (${n} files)`);
  } else {
    console.warn(`  WARN  plugin directory not found: ${dir}`);
  }
}

// A few stem/sel tools live at the web public TOP LEVEL but are requested
// under the plugin dirs — place them where the plugin loader looks.
for (const f of fs.readdirSync(WEB_PUBLIC)) {
  const target = f.startsWith('stem_tool_') ? 'stem_lab' : f.startsWith('sel_tool_') ? 'sel_hub' : null;
  if (target && f.endsWith('.js')) {
    const dst = path.join(MODULES_DIR, target, f);
    if (!fs.existsSync(dst)) {
      fs.copyFileSync(path.join(WEB_PUBLIC, f), dst);
      console.log(`  copy  ${f} → build/shared/modules/${target}/${f} (top-level tool)`);
    }
  }
}

// ── Phase 2c: Compile Tailwind CSS (same pipeline as the web app) ────────────

console.log('[local_build] Compiling Tailwind CSS...');
const TW_BIN = path.join(ROOT, 'prismflow-deploy', 'node_modules', '.bin',
  process.platform === 'win32' ? 'tailwindcss.cmd' : 'tailwindcss');
const TW_INPUT = path.join(ROOT, 'prismflow-deploy', 'src', 'index.css');
if (fs.existsSync(TW_BIN) && fs.existsSync(TW_INPUT)) {
  const { spawnSync } = require('child_process');
  const r = spawnSync(TW_BIN, [
    '-c', path.join(APP_DIR, 'tailwind.local.config.js'),
    '-i', TW_INPUT,
    '-o', path.join(BUILD_DIR, 'tailwind.css'),
    '--minify',
  ], { cwd: APP_DIR, stdio: 'pipe', encoding: 'utf-8' });
  if (r.status === 0) {
    const kb = (fs.statSync(path.join(BUILD_DIR, 'tailwind.css')).size / 1024).toFixed(0);
    console.log(`  tailwind.css compiled (${kb} KB)`);
  } else {
    console.warn('  WARN  Tailwind compile failed (CDN fallback will be used):', (r.stderr || '').slice(0, 300));
  }
} else {
  console.warn('  WARN  tailwindcss CLI not found — run npm install in prismflow-deploy/ (CDN fallback will be used)');
}

// ── Phase 3: Bundle LocalApp.jsx with esbuild ─────────────────────────────────

console.log('[local_build] Bundling LocalApp.jsx...');

let esbuild;
try {
  // Prefer local-app's own esbuild installation
  esbuild = require(path.join(APP_DIR, 'node_modules', 'esbuild'));
} catch {
  try {
    esbuild = require('esbuild');
  } catch {
    console.error('[local_build] esbuild not found. Run: cd local-app && npm install');
    process.exit(1);
  }
}

const entryPoint = path.join(SRC_DIR, 'LocalApp.jsx');
if (!fs.existsSync(entryPoint)) {
  console.error('[local_build] Missing entry point:', entryPoint);
  process.exit(1);
}

esbuild.build({
  entryPoints: [entryPoint],
  bundle: true,
  outfile: path.join(BUILD_DIR, 'app.js'),
  format: 'iife',
  // React + ReactDOM are loaded as UMD globals from index.html script tags
  external: [],
  define: {
    'process.env.NODE_ENV': isDev ? '"development"' : '"production"',
  },
  loader: { '.jsx': 'jsx', '.js': 'js', '.tsx': 'tsx', '.ts': 'ts' },
  minify: !isDev,
  sourcemap: isDev ? 'inline' : false,
  logLevel: 'info',
  jsx: 'automatic',
}).then(() => {
  const size = (fs.statSync(path.join(BUILD_DIR, 'app.js')).size / 1024 / 1024).toFixed(1);
  console.log(`[local_build] ✅ Done — build/app.js (${size} MB)`);
  console.log('[local_build] local-app/build/ is ready.');
}).catch(err => {
  console.error('[local_build] ❌ Build failed:', err.message);
  process.exit(1);
});
