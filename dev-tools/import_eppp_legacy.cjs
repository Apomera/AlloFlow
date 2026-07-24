#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const workspaceRoot = path.resolve(__dirname, '..');
const sourceRoot = path.resolve(process.argv[2] || 'C:\\Users\\cabba\\OneDrive\\Desktop\\EPPP prep');
const outputRoots = [
  path.join(workspaceRoot, 'test_prep', 'eppp_legacy'),
  path.join(workspaceRoot, 'desktop/web-app', 'public', 'test_prep', 'eppp_legacy'),
];
const runtimeEntries = ['index.html', 'favicon.svg', 'README.md', 'LICENSE', 'css', 'js'];

function assertSafeOutput(outputRoot) {
  const relative = path.relative(workspaceRoot, outputRoot);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Refusing to write outside the AlloFlow workspace: ' + outputRoot);
  }
  if (path.basename(outputRoot) !== 'eppp_legacy') {
    throw new Error('Unexpected EPPP output directory: ' + outputRoot);
  }
}

function copyEntry(from, to) {
  const stat = fs.statSync(from);
  if (stat.isDirectory()) {
    fs.mkdirSync(to, { recursive: true });
    for (const name of fs.readdirSync(from)) copyEntry(path.join(from, name), path.join(to, name));
    return;
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function createAlloFlowBridge(outputRoot) {
  fs.writeFileSync(path.join(outputRoot, 'alloflow_embed.css'), `
#alloflow-legacy-notice {
  position: sticky; top: 0; z-index: 99999; padding: 10px 16px;
  border-bottom: 2px solid #f59e0b; background: #fffbeb; color: #451a03;
  font: 600 14px/1.45 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
#alloflow-legacy-notice strong { font-weight: 800; }
#alloflow-legacy-notice a { color: #3730a3; text-decoration: underline; }
`.trimStart(), 'utf8');

  fs.writeFileSync(path.join(outputRoot, 'alloflow_embed.js'), `
(function () {
  'use strict';
  function installNotice() {
    if (!document.body || document.getElementById('alloflow-legacy-notice')) return;
    var notice = document.createElement('aside');
    notice.id = 'alloflow-legacy-notice';
    notice.setAttribute('role', 'note');
    notice.innerHTML = '<strong>AlloFlow legacy workspace:</strong> The complete Pass the EPPP Part 1 study app is available here without its former access gate. Its content is pending item-by-item expert review. Adaptive difficulty and score displays are practice heuristics—not official EPPP equating, pass predictions, or psychometric results.';
    document.body.insertBefore(notice, document.body.firstChild);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installNotice);
  else installNotice();
  try { window.parent.postMessage({ type: 'alloflow-eppp-legacy-ready' }, '*'); } catch (_) {}
}());
`.trimStart(), 'utf8');
}

function stripLegacyAccessGate(outputRoot) {
  const appPath = path.join(outputRoot, 'js', 'app.js');
  let app = fs.readFileSync(appPath, 'utf8');
  const gatePattern = /\n\s*\/\/ --- AUTH & PAYWALL GATE ---[\s\S]*?Auth\.renderPaywall\(main, page\);\s*return;\s*}\s*\n/;
  if (!gatePattern.test(app)) throw new Error('Could not locate the legacy access-gate branch in ' + appPath);
  app = app.replace(gatePattern, '\n');
  fs.writeFileSync(appPath, app, 'utf8');
}

function transformIndex(outputRoot) {
  const indexPath = path.join(outputRoot, 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');
  html = html.replace(/\s*<script\s+src=["']js\/auth\.js["']\s*><\/script>\s*/i, '\n');
  html = html.replace(/<title>[^<]*<\/title>/i, '<title>Pass the EPPP — AlloFlow Legacy Workspace</title>');
  if (!html.includes('alloflow_embed.css')) {
    html = html.replace(/<\/head>/i, '  <link rel="stylesheet" href="alloflow_embed.css">\n</head>');
  }
  if (!html.includes('alloflow_embed.js')) {
    html = html.replace(/<\/body>/i, '  <script src="alloflow_embed.js"></script>\n</body>');
  }
  fs.writeFileSync(indexPath, html, 'utf8');
}

for (const entry of runtimeEntries) {
  if (!fs.existsSync(path.join(sourceRoot, entry))) throw new Error('Missing required EPPP runtime entry: ' + entry);
}

for (const outputRoot of outputRoots) {
  assertSafeOutput(outputRoot);
  fs.rmSync(outputRoot, { recursive: true, force: true });
  fs.mkdirSync(outputRoot, { recursive: true });
  for (const entry of runtimeEntries) copyEntry(path.join(sourceRoot, entry), path.join(outputRoot, entry));
  // The legacy auth file contains the mock Stripe/paywall implementation and is intentionally not bundled.
  fs.rmSync(path.join(outputRoot, 'js', 'auth.js'), { force: true });
  stripLegacyAccessGate(outputRoot);
  createAlloFlowBridge(outputRoot);
  transformIndex(outputRoot);
}

const fileCount = (root) => fs.readdirSync(root, { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile()).length;
console.log('Imported Pass the EPPP learner runtime into AlloFlow.');
for (const outputRoot of outputRoots) console.log(path.relative(workspaceRoot, outputRoot) + ': ' + fileCount(outputRoot) + ' files');
execFileSync(process.execPath, [path.join(__dirname, 'audit_eppp_content.cjs')], { cwd: workspaceRoot, stdio: 'inherit' });
execFileSync(process.execPath, [path.join(__dirname, 'inventory_eppp_learning_content.cjs')], { cwd: workspaceRoot, stdio: 'inherit' });
execFileSync(process.execPath, [path.join(__dirname, 'build_eppp_review_ledger.cjs')], { cwd: workspaceRoot, stdio: 'inherit' });
execFileSync(process.execPath, [path.join(__dirname, 'build_eppp_500_curation_manifest.cjs')], { cwd: workspaceRoot, stdio: 'inherit' });
