'use strict';
// Read-only opportunity evidence; writes only into this review directory.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const { executeValidation } = require(path.join(root, 'dev-tools/remediation_validation.cjs'));
const { snapshotInputs } = require(path.join(root, 'dev-tools/remediation_validation_identity.cjs'));
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const manifest = JSON.parse(read('dev-tools/remediation_validation.json'));
const workflow = read('.github/workflows/verify.yml');
const job = workflow.match(/^  remediation-preservation:\r?\n([\s\S]*?)(?=^  [a-z][\w-]*:|$(?![\s\S]))/m)[1];
const desktopInputs = manifest.identityInputs.filter(file => file.startsWith('desktop/web-app/node_modules/'));
const cleanRoom = path.join(__dirname, 'sparse-clean-checkout');
fs.mkdirSync(cleanRoom, { recursive: true });
let runnerCalls = 0, preflightError;
try {
  executeValidation({
    reportDir: path.join(__dirname, 'missing-desktop-dependencies'),
    capture: () => ({ inputSha256: snapshotInputs(cleanRoom, desktopInputs), tools: { probe: 'missing-path reproduction only' }, gitHead: null }),
    run: () => { runnerCalls++; throw new Error('The preflight should prevent a runner invocation'); },
  });
} catch (error) { preflightError = error.message; }
const tracked = spawnSync('git', ['ls-files', '--', ...desktopInputs], { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 10000 });
if (tracked.status !== 0) throw new Error('Could not inspect tracked dependency paths: ' + tracked.stderr);
const calibration = pkg.scripts['verify:mcp-calibration'];
const unitFilters = [...calibration.matchAll(/tests\/[^\s]+\.test\.js/g)].map(match => match[0]);
const discovery = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'list', '--filesOnly', ...unitFilters, '--maxWorkers=1'], { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 60000 });
fs.writeFileSync(path.join(__dirname, 'calibration-unit-discovery.txt'), discovery.stdout + discovery.stderr);
const replacements = ['tests/e2e/document_focus_wrap.spec.ts', 'tests/e2e/document_static_crop_cleanup.spec.ts'];
const browserDiscovery = spawnSync(process.execPath, [path.join(root, 'node_modules/@playwright/test/cli.js'), 'test', ...replacements, '--project=chromium', '--list', '--reporter=list'], { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 60000 });
fs.writeFileSync(path.join(__dirname, 'migrated-browser-discovery.txt'), browserDiscovery.stdout + browserDiscovery.stderr);
const trackedFiles = ['.github/workflows/verify.yml', 'package.json', 'package-lock.json', 'dev-tools/remediation_validation.cjs', 'dev-tools/remediation_validation_identity.cjs', 'dev-tools/remediation_validation.json', ...replacements];
const result = {
  capturedAt: new Date().toISOString(),
  scope: 'Static checked-in configuration, actual Vitest/Playwright discovery, and a sparse missing-dependency preflight reproduction. No application changes, test execution, package installation, or GitHub run.',
  ciPrerequisiteGap: {
    job,
    rootWorkspaces: pkg.workspaces ?? null,
    rootInstallHooks: Object.fromEntries(['preinstall', 'install', 'postinstall', 'prepare'].filter(key => pkg.scripts[key]).map(key => [key, pkg.scripts[key]])),
    requiredDesktopInputs: desktopInputs,
    trackedDesktopInputs: tracked.stdout.trim().split(/\r?\n/).filter(Boolean),
    sparseCheckoutHashes: snapshotInputs(cleanRoom, desktopInputs),
    preflightError,
    runnerCalls,
  },
  calibrationMigrationGap: {
    script: calibration,
    listedUnitFilters: unitFilters.length,
    missingNamedUnitFiles: unitFilters.filter(file => !fs.existsSync(path.join(root, file))),
    discoveryExitCode: discovery.status,
    discoveredUnitFiles: discovery.stdout.trim().split(/\r?\n/).filter(Boolean),
    replacementBrowserFiles: replacements,
    replacementBrowserDiscoveryExitCode: browserDiscovery.status,
    replacementBrowserDiscovery: browserDiscovery.stdout.trim(),
    calibrationInvokesBrowserRunner: /playwright|verify:remediation/.test(calibration),
  },
  sourceSha256: Object.fromEntries(trackedFiles.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')])),
};
fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ preflightError, runnerCalls, missingNamedUnitFiles: result.calibrationMigrationGap.missingNamedUnitFiles, discoveryExitCode: discovery.status, discoveredUnitFiles: result.calibrationMigrationGap.discoveredUnitFiles.length, replacementBrowserDiscoveryExitCode: browserDiscovery.status, browserDiscovery: browserDiscovery.stdout.trim() }, null, 2));
