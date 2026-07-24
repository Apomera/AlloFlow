#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.resolve(__dirname, '..');
const manifestPath = path.join(ROOT, 'tool_integrations_manifest.json');
const schemaPath = path.join(ROOT, 'docs', 'alloflow_tool_integration_contract_v1.schema.json');
const sdk = require(path.join(ROOT, 'tool_integration_sdk.js'));
const errors = [];
function relative(file) { return path.relative(ROOT, file).replace(/\\/g, '/'); }
function readJson(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (error) { errors.push(`${relative(file)}: ${error.message}`); return null; } }
function digest(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function requireFile(relativePath, label) { const file = path.join(ROOT, String(relativePath || '')); if (!relativePath || !fs.existsSync(file)) { errors.push(`${label}: missing ${relativePath || 'path'}.`); return null; } return file; }
function requireMirror(paths, label) { if (!Array.isArray(paths) || paths.length !== 2) { errors.push(`${label}: exactly two source/deploy paths are required.`); return []; } const files = paths.map(item => requireFile(item, label)).filter(Boolean); if (files.length === 2 && digest(files[0]) !== digest(files[1])) errors.push(`${label}: source/deploy drift.`); return files; }
function validateContract(contract, label) { const result = sdk.validateContract(contract); if (!result.ok) errors.push(`${label}: ${result.errors.join('; ')}.`); }
function collectForbiddenKeys(value, location, found) { if (!value || typeof value !== 'object') return; if (Array.isArray(value)) { value.forEach((item, index) => collectForbiddenKeys(item, `${location}[${index}]`, found)); return; } for (const [key, item] of Object.entries(value)) { if (/^(fullText|rawText|sourceText|sequence|rawSequence)$/i.test(key)) found.push(`${location}.${key}`); collectForbiddenKeys(item, `${location}.${key}`, found); } }
function validateFixture(file, contract, label) {
  const fixture = file && readJson(file); if (!fixture) return;
  if (fixture.sourceToolId !== contract.id || fixture.sourceToolName !== contract.name || fixture.sourceToolVersion !== contract.version) errors.push(`${label}: fixture source identity does not match its contract.`);
  if (!String(fixture.title || '').trim() || !String(fixture.summary || '').trim()) errors.push(`${label}: fixture requires title and summary.`);
  const receipt = sdk.validateReceipt(fixture.reproducibilityReceipt, contract); if (!receipt.ok) errors.push(`${label}: ${receipt.errors.join('; ')}.`);
  if (contract.capabilities && contract.capabilities.rawDataIncluded === false) { const forbidden = []; collectForbiddenKeys(fixture.data, 'data', forbidden); if (forbidden.length) errors.push(`${label}: bounded fixture exposes forbidden raw fields: ${forbidden.join(', ')}.`); }
  const serialized = JSON.stringify(fixture);
  if (/(?:\bsk-[A-Za-z0-9_-]{20,}\b|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i.test(serialized)) errors.push(`${label}: fixture appears to contain a secret.`);
  if (contract.privacy && contract.privacy.directIdentifiersAllowed !== true && /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(serialized)) errors.push(`${label}: fixture contains a direct identifier.`);
}
const schema = readJson(schemaPath);
const manifest = readJson(manifestPath);
if (!schema || schema.$id !== 'https://alloflow.org/schema/tool-integration-contract-v1.json') errors.push('Contract JSON Schema is missing or has the wrong $id.');
if (!manifest || manifest.schemaVersion !== 1 || !Array.isArray(manifest.integrations)) errors.push('tool_integrations_manifest.json must contain schemaVersion 1 and integrations[].');
if (manifest) {
  const sdkEntry = manifest.sdk || {};
  if (sdkEntry.version !== sdk.version) errors.push(`SDK manifest version ${sdkEntry.version || 'missing'} does not match runtime ${sdk.version}.`);
  const sdkFiles = requireMirror(sdkEntry.paths, 'SDK');
  sdkFiles.forEach(file => { const source = fs.readFileSync(file, 'utf8'); for (const token of ['createAdapter', 'validateContract', 'validateReceipt', sdk.version]) if (!source.includes(token)) errors.push(`SDK: ${relative(file)} does not expose ${token}.`); });
  requireFile(sdkEntry.documentationPath, 'SDK documentation'); requireFile(sdkEntry.templateAdapterPath, 'SDK template adapter');
  const bridgeEntry = manifest.annotationBridge || {};
  if (bridgeEntry.version !== '1.0.0') errors.push(`Annotation inquiry bridge version ${bridgeEntry.version || 'missing'} is unsupported.`);
  const bridgeFiles = requireMirror(bridgeEntry.paths, 'Annotation inquiry bridge');
  bridgeFiles.forEach(file => { const source = fs.readFileSync(file, 'utf8'); for (const token of ['createHandoff', 'createAnnotation', 'summarizeForCapture', bridgeEntry.version]) if (!source.includes(token)) errors.push(`Annotation inquiry bridge: ${relative(file)} does not expose ${token}.`); });
  const evidenceGraphEntry = manifest.evidenceGraph || {};
  if (evidenceGraphEntry.version !== '1.0.0' || evidenceGraphEntry.schemaVersion !== 1) errors.push('Evidence Graph manifest requires generator version 1.0.0 and schema version 1.');
  const evidenceGraphFiles = requireMirror(evidenceGraphEntry.paths, 'Research Evidence Graph');
  evidenceGraphFiles.forEach(file => { const source = fs.readFileSync(file, 'utf8'); for (const token of ['buildEvidenceGraph', 'toW3CWebAnnotations', 'toCslJson', 'toRoCrate', 'https://w3id.org/ro/crate/1.3/context']) if (!source.includes(token)) errors.push(`Research Evidence Graph: ${relative(file)} does not expose ${token}.`); });
  requireFile(evidenceGraphEntry.documentationPath, 'Research Evidence Graph documentation');  const templateContractFile = requireFile(sdkEntry.templateContractPath, 'SDK template contract'); const templateFixtureFile = requireFile(sdkEntry.templateFixturePath, 'SDK template fixture');
  const templateContract = templateContractFile && readJson(templateContractFile); if (templateContract) { validateContract(templateContract, 'SDK template contract'); validateFixture(templateFixtureFile, templateContract, 'SDK template fixture'); }
  for (const asset of manifest.thirdPartyAssets || []) {
    const label = `third-party asset ${asset.id || '(missing id)'}`;
    if (!/^[a-z0-9][a-z0-9_-]+$/.test(asset.id || '')) errors.push(`${label}: invalid id.`);
    if (!/^\d+\.\d+\.\d+$/.test(asset.version || '')) errors.push(`${label}: version must be pinned exactly.`);
    if (!String(asset.license || '').trim() || !/^https:\/\//.test(asset.sourceUrl || '')) errors.push(`${label}: license and HTTPS sourceUrl are required.`);
    requireMirror(asset.assetPaths, `${label} files`);
    const licenses = requireMirror(asset.licensePaths, `${label} license files`); licenses.forEach(file => { if (!fs.readFileSync(file, 'utf8').toLowerCase().includes(String(asset.license).toLowerCase())) errors.push(`${label}: ${relative(file)} does not contain ${asset.license}.`); });
  }
}
const seen = new Set();
for (const entry of manifest && manifest.integrations || []) {
  const contract = entry.contract || {}; const label = contract.id || '(missing id)'; validateContract(contract, label);
  if (seen.has(contract.id)) errors.push(`${label}: duplicate integration id.`); else seen.add(contract.id);
  const adapters = requireMirror(entry.adapterPaths, `${label} adapter`);
  adapters.forEach(file => { const source = fs.readFileSync(file, 'utf8'); const tokens = [contract.id, contract.version, contract.reviewedAt, contract.reviewAfter, contract.license && (contract.license.spdx || contract.license.name), contract.privacy && contract.privacy.sanitizerId].filter(Boolean); tokens.forEach(token => { if (!source.includes(String(token))) errors.push(`${label}: ${relative(file)} does not declare ${token}.`); }); if (entry.sdkRequired === true && !source.includes('AlloFlowToolIntegration')) errors.push(`${label}: ${relative(file)} must use the shared Tool Integration SDK.`); });
  const fixtureFile = requireFile(entry.captureFixturePath, `${label} capture fixture`); validateFixture(fixtureFile, contract, `${label} capture fixture`);
}
if (errors.length) { console.error('Tool integration conformance failed:\n- ' + errors.join('\n- ')); process.exit(1); }
console.log(`Tool integration conformance passed: ${manifest.integrations.length} integration(s), ${(manifest.thirdPartyAssets || []).length} pinned third-party asset(s), SDK v${sdk.version}.`);
