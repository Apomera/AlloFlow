#!/usr/bin/env node
'use strict';

const fs = require('fs');
const crypto = require('crypto');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { validateDesktopAppBuild } = require('./check-desktop-app-build.cjs');

const DESKTOP_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(DESKTOP_ROOT, '..');
const APP_ROOT = path.join(REPO_ROOT, 'desktop/web-app');
const APP_BUILD = path.join(APP_ROOT, 'build');
const DESKTOP_APP_BUILD = path.join(DESKTOP_ROOT, 'app-build');
const GOOGLE_API_KEY_PATTERN = /AIza[0-9A-Za-z_-]{20,}/g;
const BUILD_INPUT_FINGERPRINT_FILE = '.alloflow-desktop-build-input.json';
const BUILD_INPUT_SCHEMA = 1;
const BUILD_INPUT_ROOTS = [
  path.join(APP_ROOT, 'src'),
  path.join(APP_ROOT, 'public'),
];
const BUILD_INPUT_FILES = [
  path.join(APP_ROOT, 'package.json'),
  path.join(APP_ROOT, 'package-lock.json'),
  path.join(APP_ROOT, 'postbuild.js'),
  __filename,
  path.join(__dirname, 'check-desktop-app-build.cjs'),
];
const BUILD_INPUT_ENV = Object.freeze({
  PUBLIC_URL: '.',
  REACT_APP_DESKTOP: '1',
  REACT_APP_API_MODE: 'local',
  REACT_APP_DATA_BACKEND: 'auto',
  REACT_APP_FIREBASE: 'disabled',
});

function shouldFingerprintPath(file) {
  const relative = path.relative(APP_ROOT, file).split(path.sep).join('/');
  // public/app is the hosted CRA output created immediately before the
  // desktop build. It is not consumed by the desktop root shell and would
  // otherwise force a second 20+ minute compile after every hosted deploy.
  return relative !== 'public/app' && !relative.startsWith('public/app/');
}

function collectBuildInputFiles() {
  const files = BUILD_INPUT_FILES.filter((file) => fs.existsSync(file));
  for (const root of BUILD_INPUT_ROOTS) {
    if (!fs.existsSync(root)) continue;
    for (const file of walkFiles(root)) {
      if (shouldFingerprintPath(file)) files.push(file);
    }
  }
  return Array.from(new Set(files.map((file) => path.resolve(file))))
    .sort((a, b) => a.localeCompare(b));
}

function computeBuildInputFingerprint() {
  const digest = crypto.createHash('sha256');
  digest.update(`alloflow-desktop-build-input-v${BUILD_INPUT_SCHEMA}\0`);
  digest.update(JSON.stringify(BUILD_INPUT_ENV));
  digest.update('\0');
  const files = collectBuildInputFiles();
  for (const file of files) {
    const relative = path.relative(REPO_ROOT, file).split(path.sep).join('/');
    const bytes = fs.readFileSync(file);
    digest.update(relative);
    digest.update('\0');
    digest.update(String(bytes.byteLength));
    digest.update('\0');
    digest.update(bytes);
    digest.update('\0');
  }
  return {
    schema: BUILD_INPUT_SCHEMA,
    sha256: digest.digest('hex'),
    fileCount: files.length,
  };
}

function readPublishedFingerprint() {
  const marker = path.join(DESKTOP_APP_BUILD, BUILD_INPUT_FINGERPRINT_FILE);
  try {
    const value = JSON.parse(fs.readFileSync(marker, 'utf8'));
    if (
      value &&
      value.schema === BUILD_INPUT_SCHEMA &&
      typeof value.sha256 === 'string' &&
      /^[a-f0-9]{64}$/u.test(value.sha256)
    ) {
      return value;
    }
  } catch (_) {
    // Missing/corrupt markers force a safe rebuild.
  }
  return null;
}

function writeBuildInputFingerprint(rootDir, fingerprint) {
  fs.writeFileSync(
    path.join(rootDir, BUILD_INPUT_FINGERPRINT_FILE),
    JSON.stringify({ ...fingerprint, createdAt: new Date().toISOString() }, null, 2) + '\n',
    'utf8'
  );
}

function replaceWithStagedDirectory(stagedDir, targetDir, stagingRoot) {
  const previousDir = path.join(stagingRoot, 'previous-app-build');
  let movedPrevious = false;
  try {
    if (fs.existsSync(targetDir)) {
      fs.renameSync(targetDir, previousDir);
      movedPrevious = true;
    }
    fs.renameSync(stagedDir, targetDir);
  } catch (error) {
    if (movedPrevious && !fs.existsSync(targetDir) && fs.existsSync(previousDir)) {
      try {
        fs.renameSync(previousDir, targetDir);
      } catch (restoreError) {
        const recoveryError = new Error(
          `Could not publish the staged desktop build (${error.message}) or restore the previous build (${restoreError.message}). `
          + `Recovery copy: ${previousDir}`
        );
        recoveryError.preserveStagingRoot = true;
        throw recoveryError;
      }
    }
    throw error;
  }
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
    // An invalid placeholder is still truthy and has caused live 400 storms.
    // Remove a baked key entirely so every desktop keyless/local route remains
    // enabled even if a hosted build environment accidentally supplied one.
    fs.writeFileSync(file, text.replace(GOOGLE_API_KEY_PATTERN, ''), 'utf8');
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

function stageDesktopAppBuild(sourceBuildDir = APP_BUILD, inputFingerprint = null) {
  const stagingRoot = fs.mkdtempSync(path.join(DESKTOP_ROOT, '.app-build-stage-'));
  const stagedDir = path.join(stagingRoot, 'next-app-build');
  let published = false;
  let preserveStagingRoot = false;
  try {
    fs.cpSync(sourceBuildDir, stagedDir, { recursive: true });
    patchDesktopHtml(stagedDir);
    sanitizeBakedGoogleKeys(stagedDir);
    if (inputFingerprint) writeBuildInputFingerprint(stagedDir, inputFingerprint);
    assertSingleReactBundle(stagedDir);
    assertScopedServiceWorker(stagedDir);
    const keyHits = scanForBakedKeys(stagedDir);
    if (keyHits.length) {
      const details = keyHits.map((hit) => `${hit.file} (${hit.count})`).join(', ');
      throw new Error(
        'Staged desktop web build appears to contain a Google API key; the previous app-build was left intact: '
        + details
      );
    }
    validateDesktopAppBuild({ repoRoot: REPO_ROOT, appBuildDir: stagedDir });
    replaceWithStagedDirectory(stagedDir, DESKTOP_APP_BUILD, stagingRoot);
    published = true;
  } catch (error) {
    preserveStagingRoot = error && error.preserveStagingRoot === true;
    throw error;
  } finally {
    if (preserveStagingRoot) {
      console.error('[AlloFlow Desktop] Preserving staging directory for manual recovery: ' + stagingRoot);
    } else {
      try {
        fs.rmSync(stagingRoot, { recursive: true, force: true });
      } catch (error) {
        if (published) {
          console.warn('[AlloFlow Desktop] Could not remove the old staging directory: ' + error.message);
        }
      }
    }
  }
}

function buildAndStage({ buildOutputDir, inputFingerprint }) {
  const env = {
    ...process.env,
    BUILD_PATH: buildOutputDir,
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
    REACT_APP_DESKTOP: '1',
    REACT_APP_API_MODE: 'local',
    REACT_APP_DATA_BACKEND: 'auto',
    REACT_APP_API_KEY: '',
    REACT_APP_AUTH_DOMAIN: '',
    REACT_APP_PROJECT_ID: '',
    REACT_APP_STORAGE_BUCKET: '',
    REACT_APP_MESSAGING_SENDER_ID: '',
    REACT_APP_APP_ID: '',
    REACT_APP_MEASUREMENT_ID: '',
    REACT_APP_FIREBASE_APP_CHECK_SITE_KEY: '',
    REACT_APP_POCKETBASE_URL: '',
    REACT_APP_STUDENT_BASE_URL: '',
    REACT_APP_DISALLOWED_STUDENT_HOSTS: '',
    // EMPTY, not a placeholder (field-caught 2026-07-06): the old
    // 'desktop-user-provided' sentinel is a TRUTHY string no consumer
    // recognized — the app believed it had a cloud key, sent
    // ?key=desktop-user-provided to Google ("API key not valid" 400 storms),
    // and every keyless routing path (local Kokoro reroute, keyless guard)
    // stayed disabled. Desktop is the no-account surface: no baked key.
    REACT_APP_GEMINI_API_KEY: '',
    GEMINI_API_KEY: '',
    GOOGLE_API_KEY: '',
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

  if (!fs.existsSync(path.join(buildOutputDir, 'index.html'))) {
    throw new Error('AlloFlow web build did not create build/index.html.');
  }

  stageDesktopAppBuild(buildOutputDir, inputFingerprint);

  console.log('[AlloFlow Desktop] Web app atomically staged at ' + path.relative(REPO_ROOT, DESKTOP_APP_BUILD));
  console.log('[AlloFlow Desktop] Key scan, remediation parity, manifest, and service-worker checks passed');
}

function main() {
  const args = process.argv.slice(2);
  const isolatedOutput = args.includes('--isolated-output');
  const unknownArgs = args.filter((arg) => arg !== '--isolated-output');
  if (unknownArgs.length) {
    throw new Error('Unknown argument(s): ' + unknownArgs.join(', '));
  }
  if (!fs.existsSync(path.join(APP_ROOT, 'package.json'))) {
    throw new Error('desktop/web-app/package.json was not found.');
  }

  const inputFingerprint = computeBuildInputFingerprint();
  const publishedFingerprint = readPublishedFingerprint();
  const forceBuild = process.env.FORCE_DESKTOP_BUILD === '1';
  if (
    !forceBuild &&
    publishedFingerprint &&
    publishedFingerprint.sha256 === inputFingerprint.sha256
  ) {
    validateDesktopAppBuild({ repoRoot: REPO_ROOT, appBuildDir: DESKTOP_APP_BUILD });
    assertSingleReactBundle(DESKTOP_APP_BUILD);
    assertScopedServiceWorker(DESKTOP_APP_BUILD);
    const keyHits = scanForBakedKeys(DESKTOP_APP_BUILD);
    if (keyHits.length) {
      throw new Error('Cached desktop app-build contains a baked Google API key.');
    }
    console.log(
      `[AlloFlow Desktop] Inputs unchanged (${inputFingerprint.sha256.slice(0, 12)}); ` +
      'verified the existing app-build without recompiling. Set FORCE_DESKTOP_BUILD=1 to rebuild.'
    );
    return;
  }

  const isolatedOutputRoot = isolatedOutput
    ? fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-desktop-web-'))
    : '';
  const buildOutputDir = isolatedOutputRoot
    ? path.join(isolatedOutputRoot, 'build')
    : APP_BUILD;
  try {
    buildAndStage({ buildOutputDir, inputFingerprint });
  } finally {
    if (isolatedOutputRoot) {
      try {
        fs.rmSync(isolatedOutputRoot, { recursive: true, force: true });
      } catch (error) {
        console.warn('[AlloFlow Desktop] Could not remove isolated build output: ' + error.message);
      }
    }
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error('[AlloFlow Desktop] ' + error.message);
    process.exitCode = 1;
  }
}

module.exports = {
  BUILD_INPUT_FINGERPRINT_FILE,
  computeBuildInputFingerprint,
  readPublishedFingerprint,
  shouldFingerprintPath,
};
