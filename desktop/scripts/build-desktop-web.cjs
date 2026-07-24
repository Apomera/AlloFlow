#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const DESKTOP_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(DESKTOP_ROOT, '..');
const APP_ROOT = path.join(REPO_ROOT, 'desktop/web-app');
const APP_BUILD = path.join(APP_ROOT, 'build');
const DESKTOP_APP_BUILD = path.join(DESKTOP_ROOT, 'app-build');
const GOOGLE_API_KEY_PATTERN = /AIza[0-9A-Za-z_-]{20,}/g;

function copyDir(source, target) {
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true });
}

function walkFiles(rootDir, files = []) {
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) walkFiles(fullPath, files);
    else if (entry.isFile()) files.push(fullPath);
  }
  return files;
}

function scanForBakedKeys(rootDir) {
  const hits = [];
  for (const file of walkFiles(rootDir)) {
    const ext = path.extname(file).toLowerCase();
    if (!['.html', '.js', '.json', '.css', '.txt', '.map'].includes(ext)) continue;
    const text = fs.readFileSync(file, 'utf8');
    const matches = text.match(GOOGLE_API_KEY_PATTERN);
    if (matches) {
      hits.push({
        file: path.relative(REPO_ROOT, file),
        count: matches.length,
      });
    }
  }
  return hits;
}

function sanitizeBakedGoogleKeys(rootDir) {
  for (const file of walkFiles(rootDir)) {
    const ext = path.extname(file).toLowerCase();
    if (!['.html', '.js', '.json', '.css', '.txt', '.map'].includes(ext)) continue;
    const text = fs.readFileSync(file, 'utf8');
    if (!GOOGLE_API_KEY_PATTERN.test(text)) continue;
    GOOGLE_API_KEY_PATTERN.lastIndex = 0;
    fs.writeFileSync(file, text.replace(GOOGLE_API_KEY_PATTERN, 'desktop-user-provided'), 'utf8');
  }
  GOOGLE_API_KEY_PATTERN.lastIndex = 0;
}

function assertScopedServiceWorker(rootDir) {
  const workerPath = path.join(rootDir, 'sw.js');
  if (!fs.existsSync(workerPath)) throw new Error('Desktop web build is missing sw.js.');
  const worker = fs.readFileSync(workerPath, 'utf8');
  const hasScopedShell = /self\.registration\.scope/.test(worker) && /SHELL_URL/.test(worker);
  const rootShellCache = /cache\.(?:add|match|put)\(\s*['"]\/index\.html['"]/.test(worker);
  if (!hasScopedShell || rootShellCache) {
    throw new Error(
      'Desktop service worker must cache the app-scoped index. A root /index.html cache serves the command center inside /app/.'
    );
  }
}

function assertSingleReactBundle(rootDir) {
  const indexPath = path.join(rootDir, 'index.html');
  const html = fs.readFileSync(indexPath, 'utf8');
  const externalMainScripts = html.match(/<script\b(?=[^>]*\bsrc=["']\.?\/?static\/js\/main\.[^"']+\.js["'])[^>]*>\s*<\/script>/gi) || [];
  const hasInlineMainBundle = html.includes('For license information please see main.') || html.includes('reactjs.org/docs/error-decoder.html');

  if (externalMainScripts.length > 0 && hasInlineMainBundle) {
    throw new Error(
      'Desktop web build contains both an inline main bundle and an external static/js/main script. ' +
      'That loads React twice and breaks dynamically loaded modules.'
    );
  }
}

function patchDesktopHtml(rootDir) {
  const indexPath = path.join(rootDir, 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');
  html = html
    .replace(/serviceWorker\.register\(["']\/sw\.js["']/g, 'serviceWorker.register("./sw.js"')
    .replace(/(<script\s+src=["'])\/ai_backend_module\.js(["']\s*><\/script>)/g, '$1./ai_backend_module.js$2');
  fs.writeFileSync(indexPath, html, 'utf8');
}

function main() {
  if (!fs.existsSync(path.join(APP_ROOT, 'package.json'))) {
    throw new Error('desktop/web-app/package.json was not found.');
  }

  const env = {
    ...process.env,
    BROWSER: 'none',
    CI: 'false',
    GENERATE_SOURCEMAP: 'false',
    // The monolith's lint debt (injection-contract globals like __app_id) is
    // baselined and gated by AlloFlow's own dev-tools checks; CRA's ESLint
    // pass must not re-litigate it. Locally this came from the UNTRACKED
    // desktop/web-app/.env — bake it in so CI builds behave identically.
    DISABLE_ESLINT_PLUGIN: 'true',
    ESLINT_NO_DEV_ERRORS: 'true',
    PUBLIC_URL: '.',
    REACT_APP_API_KEY: 'desktop-user-provided',
    // EMPTY, not a placeholder (field-caught 2026-07-06): the old
    // 'desktop-user-provided' sentinel is a TRUTHY string no consumer
    // recognized — the app believed it had a cloud key, sent
    // ?key=desktop-user-provided to Google ("API key not valid" 400 storms),
    // and every keyless routing path (local Kokoro reroute, keyless guard)
    // stayed disabled. Desktop is the no-account surface: no baked key.
    REACT_APP_GEMINI_API_KEY: '',
    GEMINI_API_KEY: 'desktop-user-provided',
    GOOGLE_API_KEY: 'desktop-user-provided',
  };

  const reactScripts = path.join(APP_ROOT, 'node_modules', 'react-scripts', 'bin', 'react-scripts.js');
  if (!fs.existsSync(reactScripts)) {
    throw new Error('react-scripts is not installed in desktop/web-app/node_modules.');
  }

  const buildResult = spawnSync(process.execPath, [reactScripts, 'build'], {
    cwd: APP_ROOT,
    env,
    stdio: 'inherit',
    windowsHide: true,
  });

  if (buildResult.status !== 0) {
    if (buildResult.error) {
      throw new Error('AlloFlow web build failed: ' + buildResult.error.message);
    }
    throw new Error('AlloFlow web build failed.');
  }

  const postbuild = path.join(APP_ROOT, 'postbuild.js');
  if (fs.existsSync(postbuild)) {
    const postbuildResult = spawnSync(process.execPath, [postbuild], {
      cwd: APP_ROOT,
      env,
      stdio: 'inherit',
      windowsHide: true,
    });
    if (postbuildResult.status !== 0) {
      if (postbuildResult.error) {
        throw new Error('AlloFlow postbuild failed: ' + postbuildResult.error.message);
      }
      throw new Error('AlloFlow postbuild failed.');
    }
  }

  if (!fs.existsSync(path.join(APP_BUILD, 'index.html'))) {
    throw new Error('AlloFlow web build did not create build/index.html.');
  }

  copyDir(APP_BUILD, DESKTOP_APP_BUILD);
  patchDesktopHtml(DESKTOP_APP_BUILD);
  sanitizeBakedGoogleKeys(DESKTOP_APP_BUILD);
  assertSingleReactBundle(DESKTOP_APP_BUILD);
  assertScopedServiceWorker(DESKTOP_APP_BUILD);
  const keyHits = scanForBakedKeys(DESKTOP_APP_BUILD);
  if (keyHits.length) {
    const details = keyHits.map((hit) => `${hit.file} (${hit.count})`).join(', ');
    fs.rmSync(DESKTOP_APP_BUILD, { recursive: true, force: true });
    throw new Error('Desktop web build was removed because it appears to contain a Google API key: ' + details);
  }

  console.log('[AlloFlow Desktop] Web app copied to ' + path.relative(REPO_ROOT, DESKTOP_APP_BUILD));
  console.log('[AlloFlow Desktop] Key scan passed');
}

try {
  main();
} catch (error) {
  console.error('[AlloFlow Desktop] ' + error.message);
  process.exitCode = 1;
}
