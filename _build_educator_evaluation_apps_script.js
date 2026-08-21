#!/usr/bin/env node
/**
 * Build the authenticated Apps Script shell for Educator Growth & Evaluation.
 *
 * Outputs are intentionally self-contained: React, ReactDOM, and the shared
 * educator evaluation source are bundled into Portal.html. No browser request
 * to a package CDN is required. The server-side Apps Script implementation is
 * maintained separately in apps_script/educator_evaluation/Code.gs.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const esbuild = require('esbuild');

const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'educator_evaluation_source.jsx');
const OUT_DIR = path.join(ROOT, 'apps_script', 'educator_evaluation');
const INDEX_OUT = path.join(OUT_DIR, 'Index.html');
const PORTAL_OUT = path.join(OUT_DIR, 'Portal.html');
const REACT = path.join(ROOT, 'desktop', 'web-app', 'node_modules', 'react', 'index.js');
const REACT_DOM = path.join(ROOT, 'desktop', 'web-app', 'node_modules', 'react-dom', 'client.js');
const CHECK = process.argv.includes('--check');

for (const required of [SOURCE, REACT, REACT_DOM]) {
  if (!fs.existsSync(required)) {
    console.error('Required source not found:', required);
    process.exit(1);
  }
}

const indexHtml = `<!doctype html>
<html lang="en">
<head>
  <base target="_top">
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#10233f">
  <title>AlloFlow Educator Growth &amp; Evaluation</title>
  <style>
    html,body,#educator-evaluation-root{min-height:100%;margin:0}
    body{background:#f4f7fb}
    .ae-portal-boot{box-sizing:border-box;min-height:100vh;display:grid;place-items:center;padding:24px;text-align:center;font:16px/1.5 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#24324a}
    .ae-portal-boot strong{display:block;margin-bottom:6px;font-size:22px;color:#173e70}
    .ae-portal-noscript{max-width:680px;margin:40px auto;padding:20px;border:1px solid #d8deea;border-radius:14px;background:#fff;font:16px/1.5 system-ui;color:#24324a}
  </style>
</head>
<body>
  <div id="educator-evaluation-root">
    <div class="ae-portal-boot" role="status" aria-live="polite">
      <div><strong>Educator Growth &amp; Evaluation</strong>Verifying your district account and loading your assigned records&hellip;</div>
    </div>
  </div>
  <noscript><div class="ae-portal-noscript">JavaScript is required to use the evaluation portal.</div></noscript>
  <?!= include('Portal'); ?>
</body>
</html>
`;

const source = fs.readFileSync(SOURCE, 'utf8');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-evaluation-portal-'));
const entry = path.join(tempDir, 'portal-entry.jsx');
const bundle = path.join(tempDir, 'portal-bundle.js');
const asImport = (file) => file.replace(/\\/g, '/');

const qrSource = fs.readFileSync(path.join(ROOT, 'qrcode.js'), 'utf8');
const entrySource = `import React from ${JSON.stringify(asImport(REACT))};
import { createRoot } from ${JSON.stringify(asImport(REACT_DOM))};

${qrSource}
if (typeof window !== 'undefined') window.qrcode = window.qrcode || qrcode;

${source}

function portalError(value) {
  if (value instanceof Error) return value;
  const detail = value && value.error;
  const message = value && typeof value.message === 'string'
    ? value.message
    : (typeof detail === 'string' ? detail
      : (detail && typeof detail.message === 'string' ? detail.message
        : (typeof value === 'string' ? value : 'The evaluation portal request failed.')));
  const error = new Error(message);
  if (value && typeof value.code === 'string') error.code = value.code;
  else if (detail && typeof detail.code === 'string') error.code = detail.code;
  if (value && typeof value.retryable === 'boolean') error.retryable = value.retryable;
  else if (detail && typeof detail.retryable === 'boolean') error.retryable = detail.retryable;
  return error;
}

function requireAppsScriptRunner() {
  if (!window.google || !window.google.script || !window.google.script.run) {
    throw new Error('This page must be opened from the district Apps Script web-app URL.');
  }
  return window.google.script.run;
}

function getPortalBootstrap() {
  return new Promise((resolve, reject) => {
    let runner;
    try { runner = requireAppsScriptRunner(); }
    catch (error) { reject(error); return; }
    runner
      .withSuccessHandler((response) => {
        if (!response || response.ok === false) { reject(portalError(response)); return; }
        window.__alloEvaluationCurrentUser = response.currentUser || null;
        resolve(response);
      })
      .withFailureHandler((error) => reject(portalError(error)))
      .getPortalBootstrap();
  });
}

function savePortalWorkspace(request) {
  return new Promise((resolve, reject) => {
    if (!request || typeof request !== 'object' || !request.workspace) {
      reject(new Error('A workspace and expected revision are required.'));
      return;
    }
    let runner;
    try { runner = requireAppsScriptRunner(); }
    catch (error) { reject(error); return; }
    runner
      .withSuccessHandler((response) => {
        if (!response || response.ok === false) { reject(portalError(response)); return; }
        resolve(response);
      })
      .withFailureHandler((error) => reject(portalError(error)))
      .savePortalWorkspace(request);
  });
}

function sendPortalNotification(request) {
  return new Promise((resolve, reject) => {
    if (!request || typeof request !== 'object' || !request.teacherId) {
      reject(new Error('An authorized educator record is required.'));
      return;
    }
    let runner;
    try { runner = requireAppsScriptRunner(); }
    catch (error) { reject(error); return; }
    runner
      .withSuccessHandler((response) => {
        if (!response || response.ok === false) { reject(portalError(response)); return; }
        resolve(response);
      })
      .withFailureHandler((error) => reject(portalError(error)))
      .sendPortalNotification(request);
  });
}

function sharePortalReleasedEvaluation(request) {
  return new Promise((resolve, reject) => {
    if (!request || typeof request !== 'object' || !request.teacherId) {
      reject(new Error('An authorized educator record is required.'));
      return;
    }
    let runner;
    try { runner = requireAppsScriptRunner(); }
    catch (error) { reject(error); return; }
    runner
      .withSuccessHandler((response) => {
        if (!response || response.ok === false) { reject(portalError(response)); return; }
        resolve(response);
      })
      .withFailureHandler((error) => reject(portalError(error)))
      .sharePortalReleasedEvaluation(request);
  });
}

function reviewPortalReleasedEvaluation(request) {
  return new Promise((resolve, reject) => {
    if (!request || typeof request !== 'object' || !request.teacherId) {
      reject(new Error('An authorized educator record is required.'));
      return;
    }
    let runner;
    try { runner = requireAppsScriptRunner(); }
    catch (error) { reject(error); return; }
    runner
      .withSuccessHandler((response) => {
        if (!response || response.ok === false) { reject(portalError(response)); return; }
        resolve(response);
      })
      .withFailureHandler((error) => reject(portalError(error)))
      .reviewPortalReleasedEvaluationShare(request);
  });
}

function recordPortalReleasedSummaryOpened(request) {
  return new Promise((resolve, reject) => {
    if (!request || typeof request !== 'object' || !request.teacherId) {
      reject(new Error('An authorized educator record is required.'));
      return;
    }
    let runner;
    try { runner = requireAppsScriptRunner(); }
    catch (error) { reject(error); return; }
    runner
      .withSuccessHandler((response) => {
        if (!response || response.ok === false) { reject(portalError(response)); return; }
        resolve(response);
      })
      .withFailureHandler((error) => reject(portalError(error)))
      .recordReleasedSummaryOpened(request);
  });
}

function getPortalSetupHealthClient() {
  return new Promise((resolve, reject) => {
    let runner;
    try { runner = requireAppsScriptRunner(); }
    catch (error) { reject(error); return; }
    runner
      .withSuccessHandler((response) => {
        if (!response || response.ok === false) { reject(portalError(response)); return; }
        resolve(response);
      })
      .withFailureHandler((error) => reject(portalError(error)))
      .getPortalSetupHealth();
  });
}

function reviewPortalAnnualRolloverClient(request) {
  return new Promise((resolve, reject) => {
    if (!request || typeof request !== 'object' || !request.nextAcademicYear) {
      reject(new Error('A next academic year is required.'));
      return;
    }
    let runner;
    try { runner = requireAppsScriptRunner(); }
    catch (error) { reject(error); return; }
    runner
      .withSuccessHandler((response) => {
        if (!response || response.ok === false) { reject(portalError(response)); return; }
        resolve(response);
      })
      .withFailureHandler((error) => reject(portalError(error)))
      .reviewPortalAnnualRollover(request);
  });
}

function performPortalAnnualRolloverClient(request) {
  return new Promise((resolve, reject) => {
    if (!request || typeof request !== 'object' || !request.reviewToken) {
      reject(new Error('A current annual rollover review is required.'));
      return;
    }
    let runner;
    try { runner = requireAppsScriptRunner(); }
    catch (error) { reject(error); return; }
    runner
      .withSuccessHandler((response) => {
        if (!response || response.ok === false) { reject(portalError(response)); return; }
        resolve(response);
      })
      .withFailureHandler((error) => reject(portalError(error)))
      .performPortalAnnualRollover(request);
  });
}

function reconcilePortalAnnualRolloverClient() {
  return new Promise((resolve, reject) => {
    let runner;
    try { runner = requireAppsScriptRunner(); }
    catch (error) { reject(error); return; }
    runner
      .withSuccessHandler((response) => {
        if (!response || response.ok === false) { reject(portalError(response)); return; }
        resolve(response);
      })
      .withFailureHandler((error) => reject(portalError(error)))
      .reconcilePortalAnnualRollover();
  });
}

function callPortalAdminRpc(method, request) {
  return new Promise((resolve, reject) => {
    let runner;
    try { runner = requireAppsScriptRunner(); }
    catch (error) { reject(error); return; }
    const call = runner
      .withSuccessHandler((response) => {
        if (!response || response.ok === false) { reject(portalError(response)); return; }
        resolve(response);
      })
      .withFailureHandler((error) => reject(portalError(error)));
    if (!call || typeof call[method] !== 'function') {
      reject(new Error('This deployment does not include the requested administrator operation.'));
      return;
    }
    if (request === undefined) call[method](); else call[method](request);
  });
}

function readPortalDeepLink(parameters) {
  const params = parameters && typeof parameters === 'object'
    ? { get: (name) => parameters[name] == null ? '' : String(parameters[name]) }
    : new URLSearchParams(window.location.search || '');
  const allowedViews = new Set(['overview', 'trends', 'staff', 'walkthroughs', 'formal', 'spm', 'audit', 'about']);
  const safeOpaqueId = (name) => {
    const value = (params.get(name) || '').trim();
    return /^[A-Za-z0-9_.:-]{1,160}$/.test(value) ? value : '';
  };
  const requestedView = (params.get('view') || '').trim().toLowerCase();
  return Object.freeze({
    view: allowedViews.has(requestedView) ? requestedView : '',
    teacherId: safeOpaqueId('teacher'),
    recordId: safeOpaqueId('record'),
  });
}

function mountPortal(initialRoute) {
  const repository = Object.freeze({
    kind: 'apps-script',
    bootstrap: getPortalBootstrap,
    saveWorkspace: savePortalWorkspace,
    sendNotification: sendPortalNotification,
    reviewReleasedEvaluation: reviewPortalReleasedEvaluation,
    shareReleasedEvaluation: sharePortalReleasedEvaluation,
    recordReleasedSummaryOpened: recordPortalReleasedSummaryOpened,
    getCohortStats: (request) => callPortalAdminRpc('getPortalCohortStats', request),
    getSetupHealth: getPortalSetupHealthClient,
    reviewAnnualRollover: reviewPortalAnnualRolloverClient,
    performAnnualRollover: performPortalAnnualRolloverClient,
    reconcileAnnualRollover: reconcilePortalAnnualRolloverClient,
    getAdminOperations: () => callPortalAdminRpc('getPortalAdminOperations'),
    reviewDirectoryChange: (request) => callPortalAdminRpc('reviewPortalDirectoryChange', request),
    performDirectoryChange: (request) => callPortalAdminRpc('performPortalDirectoryChange', request),
    reviewCycleSchedule: (request) => callPortalAdminRpc('reviewPortalCycleSchedule', request),
    performCycleSchedule: (request) => callPortalAdminRpc('performPortalCycleSchedule', request),
    reviewConfiguration: (request) => callPortalAdminRpc('reviewPortalWorkspaceConfiguration', request),
    performConfiguration: (request) => callPortalAdminRpc('performPortalWorkspaceConfiguration', request),
    reviewDistrictExport: (request) => callPortalAdminRpc('reviewPortalDistrictExport', request),
    performDistrictExport: (request) => callPortalAdminRpc('performPortalDistrictExport', request),
    getAnnualArchives: () => callPortalAdminRpc('getPortalAnnualArchives'),
    reviewArchiveRestoreRehearsal: (request) => callPortalAdminRpc('reviewPortalArchiveRestoreRehearsal', request),
    performArchiveRestoreRehearsal: (request) => callPortalAdminRpc('performPortalArchiveRestoreRehearsal', request),
    getInitialRoute: () => initialRoute,
  });
  window.__alloEvaluationRepository = repository;
  window.__alloEvaluationCurrentUser = null;
  window.__alloEvaluationInitialRoute = initialRoute;
  const rootElement = document.getElementById('educator-evaluation-root');
  if (!rootElement) throw new Error('Evaluation portal mount element not found.');
  createRoot(rootElement).render(React.createElement(EducatorEvaluationPanel, {
    standalone: true,
    repository,
    initialRoute,
  }));
}

// Apps Script web apps run in an iframe, so google.script.url is the canonical
// way to read the deployed /exec URL. The location.search fallback keeps the
// generated bundle easy to exercise in a normal browser test harness.
if (window.google && window.google.script && window.google.script.url && typeof window.google.script.url.getLocation === 'function') {
  window.google.script.url.getLocation((location) => mountPortal(readPortalDeepLink(location && location.parameter)));
} else {
  mountPortal(readPortalDeepLink());
}
`;

try {
  fs.writeFileSync(entry, entrySource, 'utf8');
  esbuild.buildSync({
    entryPoints: [entry],
    outfile: bundle,
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['es2020'],
    minify: true,
    legalComments: 'none',
    charset: 'utf8',
    define: { 'process.env.NODE_ENV': '"production"' },
  });

  // A literal closing script token would terminate the HtmlService template.
  const bundledJs = fs.readFileSync(bundle, 'utf8').replace(/<\/script/gi, '<\\/script');
  const portalHtml = `<script>\n/* Generated by _build_educator_evaluation_apps_script.js. Do not edit. */\n${bundledJs}\n</script>\n`;

  if (CHECK) {
    const checks = [[INDEX_OUT, indexHtml], [PORTAL_OUT, portalHtml]];
    const stale = checks.filter(([file, expected]) => !fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== expected);
    if (stale.length) {
      console.error('Apps Script evaluation portal output is stale:', stale.map(([file]) => path.relative(ROOT, file)).join(', '));
      process.exitCode = 1;
    } else {
      console.log('Apps Script evaluation portal output is current.');
    }
  } else {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(INDEX_OUT, indexHtml, 'utf8');
    fs.writeFileSync(PORTAL_OUT, portalHtml, 'utf8');
    console.log(`Built ${path.relative(ROOT, INDEX_OUT)} and ${path.relative(ROOT, PORTAL_OUT)} (${Math.ceil(Buffer.byteLength(portalHtml) / 1024)} KiB)`);
  }
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
