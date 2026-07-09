#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const desktopRoot = path.resolve(__dirname, '..');
const runtimePath = path.join(desktopRoot, 'runtime', 'alloflow-desktop-runtime.cjs');
const electronMainPath = path.join(desktopRoot, 'electron', 'main.cjs');
const contractPath = path.join(desktopRoot, 'contracts', 'runtime-contract.json');
const packagePath = path.join(desktopRoot, 'package.json');

const runtime = require(runtimePath);
const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
const desktopPackage = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const runtimeSource = fs.readFileSync(runtimePath, 'utf8');
const electronMainSource = fs.readFileSync(electronMainPath, 'utf8');

const failures = [];

function fail(message) {
  failures.push(message);
}

function expectEqual(label, actual, expected) {
  if (actual !== expected) {
    fail(label + ' expected ' + JSON.stringify(expected) + ' but found ' + JSON.stringify(actual));
  }
}

function routeNeedle(routePath) {
  const beforeParam = String(routePath || '').split('{')[0];
  return beforeParam.endsWith('/') ? beforeParam : beforeParam;
}

function assertRoutePresent(routePath, source, label) {
  const needle = routeNeedle(routePath);
  const escapedNeedle = needle.replace(/\//g, '\\/');
  if (!needle || (!source.includes(needle) && !source.includes(escapedNeedle))) {
    fail(label + ' route is listed in the contract but not found in the runtime source: ' + routePath);
  }
}

if (!contract.version || typeof contract.version !== 'string') {
  fail('contract.version must identify the API contract schema.');
}
expectEqual('runtime.VERSION', runtime.VERSION, desktopPackage.version);
expectEqual('defaultPorts.alloflowLocalEngine', contract.defaultPorts.alloflowLocalEngine, runtime.DEFAULT_CONFIG.localEngine.port);
expectEqual('defaultPorts.schoolBoxHost', contract.defaultPorts.schoolBoxHost, runtime.DEFAULT_CONFIG.schoolBox.port);
expectEqual('defaultPorts.lanShare', contract.defaultPorts.lanShare, runtime.DEFAULT_CONFIG.liveSession.lan.sharePort);
expectEqual('defaultPorts.alloflowLocalAsr', contract.defaultPorts.alloflowLocalAsr, runtime.DEFAULT_CONFIG.localAsr.port);
expectEqual('defaultPorts.alloflowWebApp', contract.defaultPorts.alloflowWebApp, runtime.DEFAULT_CONFIG.app.port);

const commandCenterMatch = electronMainSource.match(/DEFAULT_PORT\s*=\s*Number\([^|]+\|\|\s*(\d+)\)/);
if (!commandCenterMatch) {
  fail('default command-center port could not be found in electron/main.cjs');
} else {
  expectEqual('defaultPorts.commandCenter', contract.defaultPorts.commandCenter, Number(commandCenterMatch[1]));
}

const providerById = new Map((runtime.PROVIDER_PRESETS || []).map((provider) => [provider.id, provider]));
for (const [id, expected] of Object.entries(contract.providers || {})) {
  const actual = providerById.get(id);
  if (!actual) {
    fail('contract provider is missing from runtime presets: ' + id);
    continue;
  }
  expectEqual('providers.' + id + '.label', actual.label, expected.label);
  expectEqual('providers.' + id + '.protocol', actual.protocol, expected.protocol);
  if (expected.baseUrl) expectEqual('providers.' + id + '.baseUrl', actual.baseUrl, expected.baseUrl);
}

for (const entry of contract.httpApi || []) {
  assertRoutePresent(entry.path, runtimeSource, 'HTTP API');
}
for (const entry of contract.staticRoutes || []) {
  assertRoutePresent(entry.path, runtimeSource, 'Static');
}

const liveModes = contract.liveSession && contract.liveSession.modes ? Object.keys(contract.liveSession.modes) : [];
for (const mode of liveModes) {
  if (!runtimeSource.includes("'" + mode + "'") && !runtimeSource.includes('"' + mode + '"')) {
    fail('live-session mode is listed in the contract but not found in the runtime source: ' + mode);
  }
}

if (failures.length) {
  console.error('[AlloFlow Desktop] Runtime contract check failed');
  failures.forEach((message) => console.error(' - ' + message));
  process.exit(1);
}

console.log('[AlloFlow Desktop] Runtime contract check passed');
