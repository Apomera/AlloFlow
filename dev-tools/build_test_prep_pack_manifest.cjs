#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const registryPath = path.join(root, 'test_prep', 'pack_registry.json');
const manifestPath = path.join(root, 'test_prep', 'pack_manifest.json');
const deployManifestPath = path.join(root, 'desktop', 'web-app', 'public', 'test_prep', 'pack_manifest.json');
const apPsychologyQaScriptPath = path.join(root, 'dev-tools', 'qa_ap_psychology_pilot.cjs');
const epppPartOnePackBuildPath = path.join(root, 'dev-tools', 'build_eppp_part_one_pack.cjs');
const epppNativeQaScriptPath = path.join(root, 'dev-tools', 'qa_eppp_native_pack.cjs');
const allowedCategories = new Set([
  'professional-school-personnel',
  'workforce-vocational',
  'k12-college-readiness',
]);
const allowedLoadModes = new Set(['bundled', 'lazy']);
const allowedVisibility = new Set(['public', 'preview', 'internal']);
const allowedPipelineFamilies = new Set(['eppp-native-preview', 'praxis-legacy', 'ap-native']);
const manifestOnly = process.argv.includes('--manifest-only');

function fail(message) {
  throw new Error('[test-prep manifest] ' + message);
}

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(label + ' is not valid JSON: ' + error.message);
  }
}

function safeRepoPath(value, label) {
  const normalized = String(value || '').replace(/\\/g, '/');
  if (!/^test_prep\/[a-zA-Z0-9_.-]+\.json$/.test(normalized) || normalized.includes('..')) {
    fail(label + ' must be a direct JSON asset under test_prep/.');
  }
  return normalized;
}

function digest(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function repoUrl(repoPath) {
  return './' + repoPath.replace(/\\/g, '/');
}

const transientFileCodes = new Set(['EBUSY', 'EPERM', 'UNKNOWN']);
const retrySignal = new Int32Array(new SharedArrayBuffer(4));

function sameFileBytes(filePath, expectedBuffer) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size === expectedBuffer.length && fs.readFileSync(filePath).equals(expectedBuffer);
  } catch (error) {
    if (error && error.code === 'ENOENT') return false;
    throw error;
  }
}

function retryTransientFileOperation(operation) {
  const attempts = 6;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return operation();
    } catch (error) {
      if (!error || !transientFileCodes.has(error.code) || attempt === attempts - 1) throw error;
      Atomics.wait(retrySignal, 0, 0, 25 * (2 ** attempt));
    }
  }
  return undefined;
}

function copyFileIfChanged(sourcePath, deployPath, sourceBuffer) {
  const expectedBuffer = sourceBuffer || fs.readFileSync(sourcePath);
  fs.mkdirSync(path.dirname(deployPath), { recursive: true });
  return retryTransientFileOperation(() => {
    if (sameFileBytes(deployPath, expectedBuffer)) return false;
    fs.copyFileSync(sourcePath, deployPath);
    if (!sameFileBytes(deployPath, expectedBuffer)) {
      fail('Copied asset failed byte verification: ' + path.relative(root, deployPath).replace(/\\/g, '/') + '.');
    }
    return true;
  });
}

function writeFileIfChanged(filePath, content) {
  const expectedBuffer = Buffer.isBuffer(content) ? content : Buffer.from(String(content), 'utf8');
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  return retryTransientFileOperation(() => {
    if (sameFileBytes(filePath, expectedBuffer)) return false;
    try {
      fs.writeFileSync(filePath, expectedBuffer);
    } catch (error) {
      // OneDrive can transiently deny replacement of a tracked generated file
      // while allowing adjacent writes. Keep a recoverable backup, replace via
      // an adjacent file, and verify the final bytes exactly.
      if (error?.code !== 'UNKNOWN' || !/pack_manifest\.json$/i.test(filePath)) throw error;
      const backup = filePath + '.codex-backup';
      const replacement = filePath + '.codex-replacement';
      fs.copyFileSync(filePath, backup);
      fs.writeFileSync(replacement, expectedBuffer);
      fs.unlinkSync(filePath);
      try { fs.renameSync(replacement, filePath); }
      catch (renameError) { fs.copyFileSync(backup, filePath); throw renameError; }
      try { fs.unlinkSync(backup); } catch (_) {}
    }
    if (!sameFileBytes(filePath, expectedBuffer)) {
      fail('Generated asset failed byte verification: ' + path.relative(root, filePath).replace(/\\/g, '/') + '.');
    }
    return true;
  });
}

function companionUrl(owner, key, label) {
  const value = String(owner && owner[key] || '').trim();
  if (!value) return '';
  if (!repoPathFromAssetUrl(value)) {
    fail(label + ' must resolve to a trusted repository test_prep JSON asset.');
  }
  return value;
}

function repoPathFromAssetUrl(value) {
  const normalized = String(value || '').trim();
  if (/^\.\/test_prep\/[a-zA-Z0-9_.-]+\.json$/.test(normalized)) return normalized.slice(2);
  const cdnMatch = normalized.match(/^https:\/\/alloflow-cdn\.pages\.dev\/(test_prep\/[a-zA-Z0-9_.-]+\.json)$/);
  return cdnMatch ? cdnMatch[1] : '';
}

function bindCompanionAssets(entry, descriptor, options) {
  const input = options && typeof options === 'object' ? options : {};
  const fields = [
    ['learningLibraryUrl', 'learningLibrarySha256'],
    ['learningLibraryQaUrl', 'learningLibraryQaSha256'],
    ['nativeQaUrl', 'nativeQaSha256'],
  ];
  for (const [urlField, hashField] of fields) {
    const assetUrl = descriptor[urlField];
    if (!assetUrl) continue;
    const repoPath = repoPathFromAssetUrl(assetUrl);
    if (!repoPath) fail(entry.id + ' ' + urlField + ' must resolve to a repository test_prep JSON asset.');
    const sourcePath = path.join(root, ...repoPath.split('/'));
    if (!fs.existsSync(sourcePath)) {
      if (urlField === 'nativeQaUrl' && input.allowMissingNativeQa === true) continue;
      fail(entry.id + ' companion asset does not exist: ' + repoPath + '.');
    }
    const sourceBuffer = fs.readFileSync(sourcePath);
    const deployPath = path.join(root, 'desktop', 'web-app', 'public', ...repoPath.split('/'));
    copyFileIfChanged(sourcePath, deployPath, sourceBuffer);
    descriptor[hashField] = digest(sourceBuffer);
  }
}

function embeddedDescriptor(entry) {
  const known = {
    'workplace-safety-foundations-demo': {
      title: 'Workplace Safety Foundations',
      shortTitle: 'Safety Foundations',
      description: 'A five-question demonstration of the reusable practice flow.',
      disclaimer: 'Independent demonstration content. Not an official credential score or certification decision.',
      status: 'ready',
      version: '1.0.0',
      itemCount: 5,
      domainCount: 2,
      itemSchemaVersion: 1,
      responseTypes: ['single-choice'],
      examModes: ['practice-demo'],
    },
    'eppp-part-one': {
      title: 'EPPP Part 1 — Source-Reviewed Practice Bank',
      shortTitle: 'EPPP Part 1',
      description: 'Source-reviewed independent practice for the current EPPP Part 1-Knowledge blueprint.',
      disclaimer: 'Independent, unofficial EPPP preparation. Practice results are not official scores, licensure decisions, or psychometric estimates.',
      status: 'ready',
      version: '3.1.0',
      itemCount: 1500,
      domainCount: 8,
      itemSchemaVersion: 1,
      responseTypes: ['single-choice'],
      examModes: ['computer-delivered-selected-response'],
    },
  }[entry.id];
  if (!known) fail('Unknown embedded pack id: ' + entry.id + '.');
  const descriptor = { ...known };
  for (const key of ['learningLibraryUrl', 'learningLibraryQaUrl', 'nativeQaUrl']) {
    const value = companionUrl(entry, key, entry.id + ' ' + key);
    if (value) descriptor[key] = value;
  }
  return descriptor;
}

function descriptorFromPack(entry, pack, sourceBuffer, sourcePath) {
  if (!pack || typeof pack !== 'object' || Array.isArray(pack)) fail(entry.id + ' pack must be an object.');
  if (pack.id !== entry.id) fail(entry.id + ' registry id does not match pack id ' + String(pack.id || '(missing)') + '.');
  if (!Array.isArray(pack.items)) fail(entry.id + ' pack must contain an items array.');
  const responseTypes = Array.from(new Set(
    (Array.isArray(pack.responseTypes) ? pack.responseTypes :
      Array.isArray(pack.capabilities && pack.capabilities.responseTypes) ? pack.capabilities.responseTypes :
        pack.items.map((item) => item && item.type || 'single-choice'))
      .map((value) => String(value || '').trim())
      .filter(Boolean),
  ));
  const examModes = Array.from(new Set(
    (Array.isArray(pack.examModes) ? pack.examModes : [pack.examMode || pack.blueprint && pack.blueprint.examModeReference])
      .map((value) => String(value || '').trim())
      .filter(Boolean),
  ));
  return {
    title: String(pack.title || '').trim(),
    shortTitle: String(pack.shortTitle || pack.title || '').trim(),
    description: String(pack.description || '').trim(),
    disclaimer: String(pack.disclaimer || '').trim(),
    credentialOwner: String(pack.credentialOwner || '').trim(),
    status: String(pack.status || 'research').trim(),
    version: String(pack.version || '0.1.0').trim(),
    blueprintLabel: String(pack.blueprintLabel || '').trim(),
    blueprintEffective: String(pack.blueprintEffective || '').trim(),
    officialBlueprintUrl: String(pack.officialBlueprintUrl || '').trim(),
    itemCount: pack.items.length,
    domainCount: Array.isArray(pack.domains) ? pack.domains.length : 0,
    itemSchemaVersion: Math.max(1, Number(pack.itemSchemaVersion) || Number(pack.schemaVersion) || 1),
    responseTypes,
    examModes,
    ...(entry.loadMode === 'lazy' ? {
      packUrl: repoUrl(sourcePath),
      sha256: digest(sourceBuffer),
    } : {}),
    learningLibraryUrl: companionUrl(pack, 'learningLibraryUrl', entry.id + ' learningLibraryUrl'),
    learningLibraryQaUrl: companionUrl(pack, 'learningLibraryQaUrl', entry.id + ' learningLibraryQaUrl'),
    nativeQaUrl: companionUrl(pack, 'nativeQaUrl', entry.id + ' nativeQaUrl'),
  };
}

function buildManifest(options) {
  const input = options && typeof options === 'object' ? options : {};
  const registry = readJson(registryPath, 'pack registry');
  if (registry.schemaVersion !== 1 || !Array.isArray(registry.entries) || !Array.isArray(registry.categories)) {
    fail('Registry must use schemaVersion 1 with categories and entries arrays.');
  }
  const categoryIds = registry.categories.map((category) => String(category && category.id || ''));
  if (categoryIds.length !== allowedCategories.size || new Set(categoryIds).size !== categoryIds.length ||
      categoryIds.some((id) => !allowedCategories.has(id))) {
    fail('Registry categories must define each supported portfolio category exactly once.');
  }

  const seenIds = new Set();
  const manifestEntries = registry.entries.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) fail('Entry ' + (index + 1) + ' must be an object.');
    const id = String(entry.id || '').trim();
    if (!/^[a-z0-9][a-z0-9-]{2,99}$/.test(id)) fail('Entry ' + (index + 1) + ' has an invalid id.');
    if (seenIds.has(id)) fail('Duplicate registry id: ' + id + '.');
    seenIds.add(id);
    const loadMode = String(entry.loadMode || '');
    const visibility = String(entry.visibility || '');
    const portfolioCategories = Array.isArray(entry.portfolioCategories) ? entry.portfolioCategories.map(String) : [];
    if (!allowedLoadModes.has(loadMode)) fail(id + ' has an invalid loadMode.');
    if (!allowedVisibility.has(visibility)) fail(id + ' has an invalid visibility.');
    if (!portfolioCategories.length || portfolioCategories.some((category) => !allowedCategories.has(category))) {
      fail(id + ' must declare at least one supported portfolio category.');
    }
    if (entry.pipelineFamily && !allowedPipelineFamilies.has(entry.pipelineFamily)) fail(id + ' has an invalid pipelineFamily.');
    if (entry.pipelineFamily === 'ap-native' && /_pack\.json$/i.test(String(entry.sourcePath || ''))) {
      fail(id + ' AP-native source must not use the legacy *_pack.json suffix.');
    }

    let descriptor;
    if (entry.embedded === true) {
      if (entry.sourcePath) fail(id + ' cannot be both embedded and source-backed.');
      descriptor = embeddedDescriptor(entry);
    } else {
      const sourcePath = safeRepoPath(entry.sourcePath, id + ' sourcePath');
      const absoluteSourcePath = path.join(root, ...sourcePath.split('/'));
      if (!fs.existsSync(absoluteSourcePath)) fail(id + ' source file does not exist: ' + sourcePath + '.');
      const sourceBuffer = fs.readFileSync(absoluteSourcePath);
      const pack = readJson(absoluteSourcePath, id + ' pack');
      descriptor = descriptorFromPack(entry, pack, sourceBuffer, sourcePath);
      if (entry.loadMode === 'lazy') {
        const deployPath = path.join(root, 'desktop', 'web-app', 'public', ...sourcePath.split('/'));
        copyFileIfChanged(absoluteSourcePath, deployPath, sourceBuffer);
      }
    }
    bindCompanionAssets(entry, descriptor, { allowMissingNativeQa: input.allowMissingNativeQa === true });

    if (!descriptor.title || !descriptor.shortTitle || !descriptor.version) fail(id + ' descriptor is missing title or version metadata.');
    return {
      id,
      loadMode,
      visibility,
      portfolioCategories,
      ...descriptor,
    };
  });

  const manifest = {
    schemaVersion: 1,
    catalogVersion: String(registry.catalogVersion || '1'),
    categories: registry.categories.map((category) => ({
      id: String(category.id),
      label: String(category.label || category.id),
    })),
    entries: manifestEntries,
  };
  const serialized = JSON.stringify(manifest, null, 2) + '\n';
  writeFileIfChanged(manifestPath, serialized);
  writeFileIfChanged(deployManifestPath, serialized);
  return manifest;
}

let manifest;
if (manifestOnly) {
  // Release recovery path: rebuild descriptors and deploy mirrors from the
  // already-reviewed pack bytes without invoking any content generator.
  manifest = buildManifest();
} else {
  if (!fs.existsSync(epppPartOnePackBuildPath) || !fs.existsSync(epppNativeQaScriptPath)) fail('EPPP Part 1 pack/QA builder is missing.');
  execFileSync(process.execPath, [epppPartOnePackBuildPath], { cwd: root, stdio: 'inherit' });
  execFileSync(process.execPath, [epppNativeQaScriptPath], { cwd: root, stdio: 'inherit' });
  manifest = buildManifest({ allowMissingNativeQa: true });
  if (manifest.entries.some((entry) => entry.id === 'ap-psychology-pilot')) {
    if (!fs.existsSync(apPsychologyQaScriptPath)) fail('AP Psychology QA generator is missing.');
    execFileSync(process.execPath, [apPsychologyQaScriptPath], { cwd: root, stdio: 'inherit' });
  }
  manifest = buildManifest();
}
process.stdout.write(
  'Built test_prep/pack_manifest.json with ' + manifest.entries.length +
  ' entries (' + manifest.entries.filter((entry) => entry.loadMode === 'lazy').length + ' lazy) after bound AP QA.\n',
);
