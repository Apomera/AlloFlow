#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const STUDY_SCHEMA = 1;
const RECORD_SCHEMA = 1;
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_DRIVER_PATH = path.join(REPO_ROOT, 'desktop', 'mcp', 'remediation_headless_driver.cjs');
const DEFAULT_OUTPUT_ROOT = path.join(__dirname, 'runs');
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.docx', '.pptx']);

// These are deliberately policy declarations, not arbitrary option presets. In particular,
// there is no built-in "ungated" switch: adding one here would silently fork production policy.
const CONDITIONS = Object.freeze({
  'primary-one-shot': Object.freeze({
    label: 'Canonical primary pass (one shot)',
    implementation: 'canonical-driver',
    autoContinue: false,
    note: 'Includes the production primary remediation pass and deterministic safeguards; it is not a model-free baseline.',
  }),
  'gated-loop': Object.freeze({
    label: 'Canonical evidence-gated refinement loop',
    implementation: 'canonical-driver',
    autoContinue: true,
    note: 'Uses the production accept/revert, keep-best, verification-binding, and plateau policy.',
  }),
  'deterministic-only': Object.freeze({
    label: 'Deterministic-only ablation',
    implementation: 'external-adapter',
    adapterPolicy: 'experimental-deterministic-only-ablation',
    autoContinue: false,
    note: 'Blocked without an explicit adapter because the production driver has no truthful model-free remediation mode.',
  }),
  'ungated-loop': Object.freeze({
    label: 'Ungated iterative ablation',
    implementation: 'external-adapter',
    adapterPolicy: 'experimental-ungated-ablation',
    autoContinue: true,
    note: 'Blocked without an explicit adapter. The study runner never weakens the production loop policy.',
  }),
});

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
}

function stableStringify(value) {
  return JSON.stringify(stableValue(value));
}

function sha256Buffer(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sha256File(filePath) {
  return sha256Buffer(fs.readFileSync(filePath));
}

function slug(value, fallback = 'study') {
  const out = String(value || '').trim().toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return out || fallback;
}

function finiteNumber(value, name, { min, max, integer = false } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n) || (integer && !Number.isSafeInteger(n))) {
    throw new Error(name + ' must be ' + (integer ? 'an integer' : 'a finite number'));
  }
  if (min !== undefined && n < min) throw new Error(name + ' must be at least ' + min);
  if (max !== undefined && n > max) throw new Error(name + ' must be at most ' + max);
  return n;
}

function normalizedDriverOptions(raw, condition) {
  const input = isPlainObject(raw) ? raw : {};
  if (Object.prototype.hasOwnProperty.call(input, 'autoContinue')
    && Boolean(input.autoContinue) !== condition.autoContinue) {
    throw new Error('autoContinue is fixed by condition "' + condition.id + '"; do not override it in study options');
  }
  const visionMode = input.visionMode === undefined ? 'direct' : String(input.visionMode);
  if (!['direct', 'images'].includes(visionMode)) throw new Error('visionMode must be "direct" or "images"');
  const ocrLanguage = input.ocrLanguage === undefined ? '' : String(input.ocrLanguage).slice(0, 32);
  return {
    targetScore: input.targetScore === undefined ? 95 : finiteNumber(input.targetScore, 'targetScore', { min: 1, max: 100 }),
    fixPasses: input.fixPasses === undefined ? 2 : finiteNumber(input.fixPasses, 'fixPasses', { min: 0, max: 10, integer: true }),
    polishPasses: input.polishPasses === undefined ? 0 : finiteNumber(input.polishPasses, 'polishPasses', { min: 0, max: 10, integer: true }),
    taggedPdf: input.taggedPdf === undefined ? true : Boolean(input.taggedPdf),
    autoContinue: condition.autoContinue,
    autoContinueRounds: input.autoContinueRounds === undefined
      ? 3 : finiteNumber(input.autoContinueRounds, 'autoContinueRounds', { min: 1, max: 5, integer: true }),
    visionMode,
    ocrLanguage,
    modelRetryBudget: input.modelRetryBudget === undefined
      ? 6 : finiteNumber(input.modelRetryBudget, 'modelRetryBudget', { min: 0, max: 20, integer: true }),
    maxRunMinutes: input.maxRunMinutes === undefined
      ? 30 : finiteNumber(input.maxRunMinutes, 'maxRunMinutes', { min: 1, max: 240 }),
  };
}

function secretValues() {
  return [
    process.env.GEMINI_API_KEY,
    process.env.REACT_APP_GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.ALLOFLOW_MCP_API_KEY,
  ].filter((value) => typeof value === 'string' && value.length >= 4);
}

function redactText(value) {
  let out = String(value === undefined || value === null ? '' : value);
  for (const secret of secretValues()) out = out.split(secret).join('[REDACTED]');
  out = out
    .replace(/\b(Bearer\s+)[A-Za-z0-9._~+\/-]+=*/gi, '$1[REDACTED]')
    .replace(/([?&](?:key|api_key|token|access_token)=)[^&#\s]+/gi, '$1[REDACTED]')
    .replace(/\bAIza[A-Za-z0-9_-]{20,}\b/g, '[REDACTED]');
  return out;
}

function secretKeyName(key) {
  const compact = String(key).replace(/[^a-z0-9]/gi, '').toLowerCase();
  return ['apikey', 'token', 'accesstoken', 'refreshtoken', 'authorization', 'cookie',
    'password', 'secret', 'credential', 'credentials'].includes(compact)
    || compact.endsWith('apikey') || compact.endsWith('accesstoken');
}

function sanitizeForRecord(value, seen = new WeakSet()) {
  if (typeof value === 'string') return redactText(value);
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) return value;
  if (value === undefined) return undefined;
  if (Buffer.isBuffer(value)) return { type: 'Buffer', bytes: value.length, sha256: sha256Buffer(value) };
  if (typeof value !== 'object') return redactText(String(value));
  if (seen.has(value)) return '[Circular]';
  seen.add(value);
  if (Array.isArray(value)) return value.map((item) => sanitizeForRecord(item, seen));
  const out = {};
  for (const [key, item] of Object.entries(value)) {
    out[key] = secretKeyName(key) ? '[REDACTED]' : sanitizeForRecord(item, seen);
  }
  return out;
}

function safeEndpoint(raw) {
  try {
    const parsed = new URL(raw);
    parsed.username = '';
    parsed.password = '';
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch (_) {
    return 'configured-invalid-url';
  }
}

function providerCapabilityPreflight(env = process.env) {
  const endpointRaw = env.ALLOFLOW_MCP_GEMINI_BASE
    || 'https://generativelanguage.googleapis.com/v1beta/models';
  const endpoint = safeEndpoint(endpointRaw);
  let hostname = '';
  let protocol = '';
  try {
    const parsed = new URL(endpointRaw);
    hostname = parsed.hostname.toLowerCase();
    protocol = parsed.protocol.toLowerCase();
  } catch (_) {}
  const loopback = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  const liveGemini = protocol === 'https:' && hostname === 'generativelanguage.googleapis.com';
  const primaryModel = env.ALLOFLOW_MCP_GEMINI_MODEL || 'gemini-3-flash-preview';
  const fallbackModel = env.ALLOFLOW_MCP_GEMINI_FALLBACK_MODEL || 'gemini-2.5-flash-lite';
  // Deliberately inspect only the explicit process environment. The production driver can
  // discover convenience key files, but a study must never probe or silently consume them.
  const explicitCredentialPresent = typeof env.GEMINI_API_KEY === 'string'
    && env.GEMINI_API_KEY.trim().length > 0;
  const providerClass = loopback ? 'scripted' : (liveGemini ? 'live' : 'synthetic');
  const modelSettingsRecorded = Boolean(primaryModel && fallbackModel && endpoint);
  const actualModelTraceComplete = false;
  const fallbackEnabled = fallbackModel !== primaryModel;
  const modelIdentityEligible = actualModelTraceComplete || !fallbackEnabled;
  const liveSettingsEligible = explicitCredentialPresent && providerClass === 'live'
    && modelSettingsRecorded && modelIdentityEligible;
  return {
    state: !explicitCredentialPresent ? 'plan-only-no-explicit-credential'
      : (liveSettingsEligible ? 'ready-live-single-model-settings-recorded'
        : (providerClass === 'live' ? 'ready-live-descriptive-model-trace-incomplete'
          : 'ready-infrastructure-evidence-only')),
    canExecute: explicitCredentialPresent,
    providerClass,
    evidenceClass: providerClass === 'live' ? 'partition_dependent' : 'infrastructure_only',
    effectivenessEligible: liveSettingsEligible,
    eligibilityReason: !explicitCredentialPresent ? 'explicit_GEMINI_API_KEY_required'
      : (providerClass !== 'live' ? 'scripted_or_nonofficial_endpoint'
        : (!modelSettingsRecorded ? 'model_settings_incomplete'
          : (!modelIdentityEligible ? 'actual_model_trace_incomplete_or_fallback_enabled'
            : 'live_single_model_settings_recorded'))),
    provider: 'gemini-generateContent',
    endpoint,
    primaryModel,
    fallbackModel,
    modelSettingsRecorded,
    fallbackEnabled,
    actualModelTraceComplete,
    sampling: 'provider-default',
    temperatureControlled: false,
    seedControlled: false,
    stochasticRepeatRecommended: true,
    explicitCredentialPresent,
    credentialSource: explicitCredentialPresent ? 'env:GEMINI_API_KEY' : null,
    implicitKeyFilesProbed: false,
    networkProbePerformed: false,
  };
}
function readPackageVersion(moduleName) {
  try {
    const packagePath = require.resolve(moduleName + '/package.json', { paths: [REPO_ROOT] });
    return JSON.parse(fs.readFileSync(packagePath, 'utf8')).version || null;
  } catch (_) {
    return null;
  }
}

function collectEngineMetadata(driverPath = DEFAULT_DRIVER_PATH, adapterInfo = null) {
  const preflight = providerCapabilityPreflight();
  let moduleNames = [
    'verification_policy_module.js',
    'doc_builder_renderer_module.js',
    'doc_pipeline_module.js',
    'view_pdf_validator_module.js',
  ];
  try {
    const exported = require(driverPath).MODULE_FILES;
    if (Array.isArray(exported) && exported.length) moduleNames = exported.slice();
  } catch (_) {}
  const extraPolicyFiles = ['doc_pipeline_source.jsx', 'desktop/mcp/vendor/manifest.json'];
  const modules = Array.from(new Set(moduleNames.concat(extraPolicyFiles))).map((name) => {
    const filePath = path.join(REPO_ROOT, name);
    return { name, sha256: fs.existsSync(filePath) ? sha256File(filePath) : null };
  });
  const driverFingerprint = {
    path: path.relative(REPO_ROOT, driverPath).replace(/\\/g, '/'),
    sha256: fs.existsSync(driverPath) ? sha256File(driverPath) : null,
  };
  const vendorManifestPath = path.join(REPO_ROOT, 'desktop/mcp/vendor/manifest.json');
  let vendorBundle = null;
  try {
    const manifest = JSON.parse(fs.readFileSync(vendorManifestPath, 'utf8'));
    vendorBundle = {
      manifestSha256: sha256File(vendorManifestPath),
      policy: manifest.policy || null,
      generatedFrom: manifest.generatedFrom || null,
      files: Array.isArray(manifest.files) ? manifest.files.map((entry) => ({
        path: entry.path,
        sha256: entry.sha256,
        bytes: entry.bytes,
        normalization: entry.normalization || null,
      })) : [],
    };
  } catch (_) {}
  let git = null;
  try {
    const { execFileSync } = require('child_process');
    git = {
      commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPO_ROOT, encoding: 'utf8', windowsHide: true }).trim(),
      trackedDirty: execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], { cwd: REPO_ROOT, encoding: 'utf8', windowsHide: true }).trim().length > 0,
    };
  } catch (_) {}
  const engineAggregateSha256 = sha256Buffer(stableStringify({ driverFingerprint, modules, vendorBundle }));
  return {
    engine: 'AlloFlow canonical remediation headless driver',
    driver: driverFingerprint,
    modules,
    vendorBundle,
    git,
    engineAggregateSha256,
    provider: {
      family: 'Gemini-compatible generateContent',
      primaryModel: preflight.primaryModel,
      fallbackModel: preflight.fallbackModel,
      endpoint: preflight.endpoint,
      credentialPresent: preflight.explicitCredentialPresent,
      providerClass: preflight.providerClass,
      evidenceClass: preflight.evidenceClass,
      liveSettingsEligible: preflight.effectivenessEligible,
      sampling: preflight.sampling,
      temperatureControlled: preflight.temperatureControlled,
      seedControlled: preflight.seedControlled,
      fallbackEnabled: preflight.fallbackEnabled,
      actualModelTraceComplete: preflight.actualModelTraceComplete,
    },
    runtime: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      siteId: process.env.ALLOFLOW_STUDY_SITE_ID ? slug(process.env.ALLOFLOW_STUDY_SITE_ID, 'site') : null,
      playwright: readPackageVersion('playwright'),
    },
    adapter: adapterInfo,
  };
}

function normalizeSource(value, baseDir) {
  const entry = typeof value === 'string' ? { path: value } : value;
  if (!isPlainObject(entry) || typeof entry.path !== 'string' || !entry.path.trim()) {
    throw new Error('Each source must be a path string or an object with a path');
  }
  const resolvedPath = path.resolve(baseDir, entry.path);
  if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
    throw new Error('Study source does not exist or is not a file: ' + resolvedPath);
  }
  const extension = path.extname(resolvedPath).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) throw new Error('Unsupported study source type: ' + resolvedPath);
  const bytes = fs.statSync(resolvedPath).size;
  const sha256 = sha256File(resolvedPath);
  if (entry.bytes !== undefined) {
    const expectedBytes = finiteNumber(entry.bytes, 'source bytes', { min: 1, integer: true });
    if (expectedBytes !== bytes) {
      throw new Error('Study source byte length mismatch for ' + resolvedPath
        + ': expected ' + expectedBytes + ', found ' + bytes);
    }
  }
  if (entry.sha256 !== undefined) {
    const expectedSha256 = String(entry.sha256).toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(expectedSha256)) throw new Error('Study source sha256 must be 64 lowercase hex characters');
    if (expectedSha256 !== sha256) {
      throw new Error('Study source SHA-256 mismatch for ' + resolvedPath
        + ': expected ' + expectedSha256 + ', found ' + sha256);
    }
  }
  return {
    id: slug(entry.id || entry.documentId || path.basename(resolvedPath, extension), 'document'),
    path: resolvedPath,
    displayPath: path.relative(baseDir, resolvedPath).replace(/\\/g, '/'),
    cohort: entry.cohort || entry.corpusId ? String(entry.cohort || entry.corpusId).slice(0, 64) : 'unspecified',
    partition: (() => {
      const value = String(entry.partition || 'development_pilot');
      const allowed = ['development_pilot', 'development_retrospective', 'safety', 'prospective_held_out'];
      if (!allowed.includes(value)) {
        throw new Error('Source partition must be one of: ' + allowed.join(', '));
      }
      return value;
    })(),
    extension,
    bytes,
    sha256,
  };
}

function normalizeAdapter(conditionId, adapterPath, baseDir) {
  if (!adapterPath) return null;
  const resolvedPath = path.resolve(baseDir, adapterPath);
  if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
    throw new Error('Adapter for ' + conditionId + ' does not exist: ' + resolvedPath);
  }
  return {
    path: resolvedPath,
    displayPath: path.relative(baseDir, resolvedPath).replace(/\\/g, '/'),
    sha256: sha256File(resolvedPath),
  };
}

function buildStudyPlan(config, deps = {}) {
  if (!isPlainObject(config)) throw new Error('Study configuration must be an object');
  const baseDir = path.resolve(config.baseDir || process.cwd());
  if (!Array.isArray(config.sources) || config.sources.length === 0) throw new Error('At least one study source is required');
  const sources = config.sources.map((entry) => normalizeSource(entry, baseDir));
  let protocol = null;
  if (config.protocolPath) {
    const protocolPath = path.resolve(baseDir, String(config.protocolPath));
    if (!fs.existsSync(protocolPath) || !fs.statSync(protocolPath).isFile()) {
      throw new Error('Study protocol does not exist: ' + protocolPath);
    }
    const protocolSha256 = sha256File(protocolPath);
    if (config.protocolSha256 !== undefined && String(config.protocolSha256).toLowerCase() !== protocolSha256) {
      throw new Error('Study protocol SHA-256 mismatch: expected ' + config.protocolSha256 + ', found ' + protocolSha256);
    }
    protocol = {
      path: path.relative(baseDir, protocolPath).replace(/\\/g, '/'),
      sha256: protocolSha256,
    };
  }
  const conditionIds = Array.isArray(config.conditions) && config.conditions.length
    ? config.conditions.map(String) : ['primary-one-shot', 'gated-loop'];
  if (new Set(conditionIds).size !== conditionIds.length) throw new Error('Study conditions must be unique');
  const repetitions = config.repetitions === undefined
    ? 1 : finiteNumber(config.repetitions, 'repetitions', { min: 1, max: 100, integer: true });
  const outputRoot = path.resolve(baseDir, config.outputRoot || DEFAULT_OUTPUT_ROOT);
  const adapters = isPlainObject(config.adapters) ? config.adapters : {};
  const baseOptions = isPlainObject(config.options) ? config.options : {};
  const perCondition = isPlainObject(config.conditionOptions) ? config.conditionOptions : {};
  const normalizedConditions = conditionIds.map((id) => {
    const definition = CONDITIONS[id];
    if (!definition) throw new Error('Unknown study condition: ' + id);
    const withId = Object.assign({ id }, definition);
    const adapter = normalizeAdapter(id, adapters[id], baseDir);
    if (definition.implementation === 'canonical-driver' && adapter) {
      throw new Error('Canonical condition "' + id + '" cannot take an adapter; use a named experimental condition');
    }
    const options = normalizedDriverOptions(Object.assign({}, baseOptions, perCondition[id] || {}), withId);
    return {
      id,
      label: definition.label,
      implementation: definition.implementation,
      adapterPolicy: definition.adapterPolicy || null,
      note: definition.note,
      adapter,
      options,
      ready: definition.implementation === 'canonical-driver' || adapter !== null,
      blockedReason: definition.implementation === 'external-adapter' && adapter === null
        ? 'adapter_required:' + definition.adapterPolicy : null,
    };
  });

  const seedProvided = typeof config.randomizationSeed === 'string' && config.randomizationSeed.length > 0;
  const randomizationSeed = seedProvided ? config.randomizationSeed : 'alloflow-refinement-study-v1';
  const blindingEligible = seedProvided && /^[a-f0-9]{64}$/i.test(randomizationSeed);
  const identity = {
    schema: STUDY_SCHEMA,
    protocolSha256: protocol && protocol.sha256,
    sources: sources.map(({ id, cohort, partition, extension, bytes, sha256 }) => ({ id, cohort, partition, extension, bytes, sha256 })),
    conditions: normalizedConditions.map(({ id, implementation, adapterPolicy, adapter, options }) => ({
      id, implementation, adapterPolicy, adapterSha256: adapter && adapter.sha256, options,
    })),
    repetitions,
    randomizationSeed,
  };
  const planHash = sha256Buffer(stableStringify(identity));
  const studyId = slug(config.studyId || ('refinement-' + planHash.slice(0, 12)), 'refinement-study');
  const generatedAt = (deps.now ? deps.now() : new Date()).toISOString();
  const runs = [];
  for (const source of sources) {
    for (let repetition = 1; repetition <= repetitions; repetition++) {
      for (const condition of normalizedConditions) {
        const optionsHash = sha256Buffer(stableStringify(condition.options));
        const runIdentity = source.sha256 + ':' + condition.id + ':' + repetition + ':' + optionsHash;
        const runHash = sha256Buffer(runIdentity);
        const runId = [source.id, source.sha256.slice(0, 8), condition.id, 'r' + String(repetition).padStart(2, '0'), runHash.slice(0, 8)].join('--');
        runs.push({
          runId,
          blindId: 'B-' + sha256Buffer(identity.randomizationSeed + ':' + runIdentity).slice(0, 32).toUpperCase(),
          source,
          condition,
          repetition,
          optionsHash,
          outputDir: path.join(outputRoot, studyId, runId),
          status: condition.ready ? 'ready' : 'blocked',
          blockedReason: condition.blockedReason,
        });
      }
    }
  }
  const blindIds = runs.map((run) => run.blindId);
  if (new Set(blindIds).size !== blindIds.length) throw new Error('Opaque reviewer identifier collision; replace the allocation seed');
  runs.sort((a, b) => sha256Buffer(identity.randomizationSeed + ':' + a.runId)
    .localeCompare(sha256Buffer(identity.randomizationSeed + ':' + b.runId)));
  return {
    schema: STUDY_SCHEMA,
    kind: 'alloflow-refinement-study-plan',
    studyId,
    planHash,
    protocol,
    protocolSha256: protocol ? protocol.sha256 : planHash,
    generatedAt,
    baseDir,
    outputRoot,
    repetitions,
    randomizationSeedCommitment: sha256Buffer(identity.randomizationSeed),
    blinding: {
      seedProvided,
      seedCommitment: sha256Buffer(identity.randomizationSeed),
      blindingEligible,
      warning: blindingEligible ? null : 'A secret 256-bit hexadecimal randomizationSeed is required for confirmatory blinding.',
    },
    conditions: normalizedConditions,
    sources,
    runs,
    safety: {
      providerCallsMade: false,
      executeRequired: true,
      credentialsRecorded: false,
      providerPreflight: providerCapabilityPreflight(deps.env || process.env),
    },
  };
}

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function atomicWrite(filePath, bytes) {
  ensureDirectory(path.dirname(filePath));
  const temp = filePath + '.tmp-' + process.pid + '-' + crypto.randomBytes(4).toString('hex');
  fs.writeFileSync(temp, bytes);
  fs.renameSync(temp, filePath);
}

function atomicWriteJson(filePath, value) {
  atomicWrite(filePath, Buffer.from(JSON.stringify(sanitizeForRecord(value), null, 2) + '\n', 'utf8'));
}

function writeImmutableBytes(filePath, bytes) {
  const value = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  if (fs.existsSync(filePath)) {
    const existing = fs.readFileSync(filePath);
    if (!existing.equals(value)) throw new Error('Immutable study artifact already exists with different bytes: ' + filePath);
  } else {
    atomicWrite(filePath, value);
  }
}

function writeImmutableJson(filePath, value) {
  const bytes = Buffer.from(JSON.stringify(sanitizeForRecord(value), null, 2) + '\n', 'utf8');
  writeImmutableBytes(filePath, bytes);
  return artifactDescriptor(filePath, 'json-evidence');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function serializeError(error) {
  return sanitizeForRecord({
    name: (error && error.name) || 'Error',
    code: error && error.code !== undefined ? error.code : null,
    message: (error && error.message) || String(error),
    stack: error && error.stack ? String(error.stack).split(/\r?\n/).slice(0, 12).join('\n') : null,
  });
}

function loadAdapter(condition, baseDir = process.cwd()) {
  if (!condition.adapter) throw new Error('Condition "' + condition.id + '" requires adapter policy ' + condition.adapterPolicy);
  const adapterPath = path.resolve(baseDir, condition.adapter.path);
  if (sha256File(adapterPath) !== condition.adapter.sha256) throw new Error('Adapter changed after the study plan was created: ' + adapterPath);
  delete require.cache[require.resolve(adapterPath)];
  const adapter = require(adapterPath);
  if (!adapter || typeof adapter.run !== 'function' || !isPlainObject(adapter.metadata)) {
    throw new Error('Study adapter must export { metadata, async run(context) }');
  }
  if (adapter.metadata.condition !== condition.id || adapter.metadata.policy !== condition.adapterPolicy) {
    throw new Error('Study adapter metadata must declare condition="' + condition.id
      + '" and policy="' + condition.adapterPolicy + '"');
  }
  return { adapter, metadata: sanitizeForRecord(adapter.metadata) };
}

function artifactDescriptor(filePath, kind) {
  const bytes = fs.readFileSync(filePath);
  return {
    kind,
    path: path.basename(filePath),
    bytes: bytes.length,
    sha256: sha256Buffer(bytes),
  };
}

function extractMetrics(result, driverOptions) {
  return sanitizeForRecord({
    scores: {
      before: result.beforeScore ?? null,
      after: result.afterScore ?? null,
      source: result.scoreSource ?? null,
      estimatedMinimum: result.estimatedMinimumScore ?? null,
    },
    verification: {
      state: result.verificationState ?? null,
      htmlBound: result.verificationHtmlBound === true,
      aiIncomplete: result.aiVerificationIncomplete === true,
      remainingAxeViolations: result.remainingAxeViolations ?? null,
      remainingEqualAccessFailures: result.remainingEqualAccessFailures ?? null,
      auditCoverage: result.auditCoverage ?? null,
      verdict: result.verdict ?? null,
    },
    delivery: {
      taggedPdfRequested: driverOptions.taggedPdf,
      taggedPdfProduced: typeof result.taggedPdfB64 === 'string' && result.taggedPdfB64.length > 0,
      taggedPdfVerdict: result.taggedPdfDelivery ?? null,
      taggedPdfExportMode: result.taggedPdfExportMode ?? null,
      taggedPdfError: result.taggedPdfError ?? null,
      activeContentScanVerified: result.activeContentScanVerified === true,
      activeContentDetected: result.activeContentDetected === true,
    },
    fidelity: {
      integrityCoverage: result.integrityCoverage ?? null,
      integrityWarning: result.integrityWarning ?? null,
      notes: result.fidelityNotes ?? [],
    },
    transport: result.stats ?? null,
    pipelineRunId: result.runId ?? null,
  });
}

function validateExistingRecord(record, item, plan) {
  if (!record || record.schema !== RECORD_SCHEMA || record.kind !== 'alloflow-refinement-study-record'
    || record.planHash !== plan.planHash || record.runId !== item.runId
    || record.source.sha256 !== item.source.sha256 || record.optionsHash !== item.optionsHash) {
    throw new Error('Existing run record does not match this plan; refusing to overwrite or resume it');
  }
}

async function executeRun(item, plan, context) {
  const recordPath = path.join(item.outputDir, 'study-record.json');
  const checkpointPath = path.join(item.outputDir, 'checkpoint.json');
  const now = context.now || (() => new Date());
  let prior = null;
  let resumeCheckpoint = null;
  if (fs.existsSync(recordPath)) {
    prior = readJson(recordPath);
    validateExistingRecord(prior, item, plan);
    const finalResultPath = path.join(item.outputDir, 'result.json');
    if (fs.existsSync(finalResultPath)) {
      const immutableResult = readJson(finalResultPath);
      if (immutableResult.schema !== 'alloflow.mcp-refinement-result/v1'
        || immutableResult.runId !== item.runId
        || immutableResult.document.sourceSha256 !== item.source.sha256
        || immutableResult.protocol.protocolSha256 !== plan.protocolSha256) {
        throw new Error('Immutable result.json does not match this plan; refusing to skip or overwrite it');
      }
      return { status: 'skipped-' + immutableResult.outcome.status, recordPath, resultPath: finalResultPath, runId: item.runId };
    }
    if (prior.status === 'complete' || prior.status === 'incomplete') {
      throw new Error('Finalized progress record is missing immutable result.json; inspect the interrupted run before resuming');
    }
    if (!context.resume) throw new Error('Incomplete run exists for ' + item.runId + '; pass --resume to continue it');
    if (fs.existsSync(checkpointPath)) {
      const checkpoint = readJson(checkpointPath);
      if (checkpoint.sourceSha256 !== item.source.sha256 || checkpoint.optionsHash !== item.optionsHash
        || checkpoint.condition !== item.condition.id || !checkpoint.snapshot) {
        throw new Error('Resume checkpoint does not match the source, condition, and exact options');
      }
      resumeCheckpoint = checkpoint.snapshot;
    }
  }

  if (sha256File(item.source.path) !== item.source.sha256) {
    throw new Error('Source changed after the study plan was created: ' + item.source.path);
  }
  ensureDirectory(item.outputDir);
  const started = now();
  const monotonicStart = process.hrtime.bigint();
  const events = [];
  let checkpointsWritten = 0;
  let latestCheckpoint = prior && prior.resume ? prior.resume.latestCheckpoint : null;
  const adapterLoaded = item.condition.implementation === 'external-adapter'
    ? loadAdapter(item.condition, plan.baseDir) : null;
  const engine = context.engineMetadata
    ? context.engineMetadata(item, adapterLoaded) : collectEngineMetadata(context.driverPath, adapterLoaded && {
      path: item.condition.adapter.displayPath,
      sha256: item.condition.adapter.sha256,
      metadata: adapterLoaded.metadata,
    });
  let record = {
    schema: RECORD_SCHEMA,
    kind: 'alloflow-refinement-study-record',
    studyId: plan.studyId,
    planHash: plan.planHash,
    runId: item.runId,
    blindId: item.blindId,
    status: 'running',
    condition: {
      id: item.condition.id,
      label: item.condition.label,
      implementation: item.condition.implementation,
      adapterPolicy: item.condition.adapterPolicy,
      note: item.condition.note,
    },
    repetition: item.repetition,
    source: {
      id: item.source.id,
      path: item.source.displayPath,
      cohort: item.source.cohort,
      partition: item.source.partition,
      extension: item.source.extension,
      bytes: item.source.bytes,
      sha256: item.source.sha256,
    },
    exactDriverOptions: item.condition.options,
    optionsHash: item.optionsHash,
    engine,
    timings: { startedAt: started.toISOString(), finishedAt: null, totalMs: null, events: [] },
    rounds: { enabled: item.condition.options.autoContinue, roundsRun: 0, log: [] },
    metrics: null,
    artifacts: { sourceSha256: item.source.sha256, outputs: [] },
    resume: {
      requested: context.resume === true,
      usedCheckpoint: resumeCheckpoint !== null,
      attempt: prior && prior.resume && Number.isSafeInteger(prior.resume.attempt) ? prior.resume.attempt + 1 : 1,
      checkpointsWritten: 0,
      latestCheckpoint,
    },
    error: null,
    credentialMaterialRecorded: false,
  };
  atomicWriteJson(recordPath, record);

  const elapsedMs = () => Number(process.hrtime.bigint() - monotonicStart) / 1e6;
  const onLog = (line) => {
    events.push({ elapsedMs: Math.round(elapsedMs()), message: redactText(line).slice(0, 1000) });
    if (events.length > 1000) events.splice(0, events.length - 1000);
  };
  const onCheckpoint = async (snapshot) => {
    checkpointsWritten++;
    const wrapper = {
      schema: 1,
      runId: item.runId,
      sourceSha256: item.source.sha256,
      condition: item.condition.id,
      optionsHash: item.optionsHash,
      writtenAt: now().toISOString(),
      snapshot,
    };
    atomicWriteJson(checkpointPath, wrapper);
    latestCheckpoint = {
      path: path.basename(checkpointPath),
      sha256: sha256File(checkpointPath),
      stage: snapshot && snapshot.stage ? String(snapshot.stage) : null,
      writtenAt: wrapper.writtenAt,
    };
    record.resume.checkpointsWritten = checkpointsWritten;
    record.resume.latestCheckpoint = latestCheckpoint;
    record.timings.events = events.slice();
    atomicWriteJson(recordPath, record);
    return { persisted: true };
  };

  const driverOptions = Object.assign({}, item.condition.options, {
    filePath: item.source.path,
    onLog,
    onCheckpoint,
    resumeCheckpoint,
  });
  try {
    let result;
    if (adapterLoaded) {
      result = await adapterLoaded.adapter.run({
        driver: context.driver,
        sourcePath: item.source.path,
        driverOptions: Object.assign({}, driverOptions),
        callbacks: { onLog, onCheckpoint },
        condition: sanitizeForRecord(item.condition),
      });
      if (result && isPlainObject(result) && isPlainObject(result.driverResult)) result = result.driverResult;
    } else {
      result = await context.driver.remediate(driverOptions);
    }
    if (!isPlainObject(result)) throw new Error('Study condition returned no driver-compatible result object');

    const outputs = [];
    if (typeof result.accessibleHtml === 'string') {
      const htmlPath = path.join(item.outputDir, 'output.html');
      writeImmutableBytes(htmlPath, Buffer.from(result.accessibleHtml, 'utf8'));
      outputs.push(artifactDescriptor(htmlPath, 'accessible-html'));
    }
    if (typeof result.taggedPdfB64 === 'string' && result.taggedPdfB64.length) {
      const pdfBytes = Buffer.from(result.taggedPdfB64, 'base64');
      if (pdfBytes.length < 5 || pdfBytes.subarray(0, 5).toString('latin1') !== '%PDF-') {
        throw new Error('Driver returned taggedPdfB64 that is not a PDF artifact');
      }
      const pdfPath = path.join(item.outputDir, 'output.pdf');
      writeImmutableBytes(pdfPath, pdfBytes);
      outputs.push(artifactDescriptor(pdfPath, 'tagged-pdf'));
    }
    if (outputs.length === 0) throw new Error('Study condition produced no accessible HTML or tagged PDF artifact');
    const pdfRequested = item.source.extension === '.pdf' && item.condition.options.taggedPdf === true;
    const pdfArtifact = outputs.find((entry) => entry.kind === 'tagged-pdf') || null;
    let pdfValidation = null;
    let pdfValidationError = null;
    if (pdfRequested && pdfArtifact) {
      try {
        if (!context.driver || typeof context.driver.validatePdfUaCli !== 'function') {
          throw new Error('exact-byte PDF/UA validator is unavailable');
        }
        pdfValidation = await context.driver.validatePdfUaCli({
          filePath: path.join(item.outputDir, pdfArtifact.path),
          onProgress: onLog,
        });
      } catch (error) {
        pdfValidationError = serializeError(error);
      }
    }
    const htmlBindingValid = result.verificationHtmlBound === true;
    const pdfDeliveryValid = !pdfRequested || Boolean(pdfArtifact
      && result.taggedPdfDelivery && result.taggedPdfDelivery.ok === true);
    const pdfValidationBound = !pdfRequested || Boolean(pdfArtifact && pdfValidation
      && pdfValidation.inputSha256 === pdfArtifact.sha256
      && pdfValidation.inputBytes === pdfArtifact.bytes);
    const finalArtifactEvidenceBound = htmlBindingValid && pdfDeliveryValid && pdfValidationBound;
    const finished = now();
    record.status = finalArtifactEvidenceBound ? 'complete' : 'incomplete';
    record.timings = {
      startedAt: record.timings.startedAt,
      finishedAt: finished.toISOString(),
      totalMs: Math.round(elapsedMs()),
      events,
    };
    record.rounds = {
      enabled: item.condition.options.autoContinue,
      roundsRun: result.autoContinue && Number.isSafeInteger(result.autoContinue.roundsRun)
        ? result.autoContinue.roundsRun : 0,
      log: result.autoContinue && Array.isArray(result.autoContinue.log)
        ? result.autoContinue.log.map((line) => redactText(line).slice(0, 1000)) : [],
    };
    record.metrics = extractMetrics(result, item.condition.options);
    record.artifacts.outputs = outputs;
    record.resume.checkpointsWritten = checkpointsWritten;
    record.resume.latestCheckpoint = latestCheckpoint;

    const finalArtifact = pdfRequested
      ? (pdfArtifact || outputs.find((entry) => entry.kind === 'accessible-html'))
      : outputs.find((entry) => entry.kind === 'accessible-html');
    const verificationEvidence = {
      schema: 1,
      runId: item.runId,
      blindId: item.blindId,
      sourceSha256: item.source.sha256,
      finalArtifactSha256: finalArtifact.sha256,
      verificationSubjectSha256: outputs.find((entry) => entry.kind === 'accessible-html')?.sha256 || finalArtifact.sha256,
      verificationBindingValid: htmlBindingValid,
      finalArtifactEvidenceBound,
      pdfDeliveryValid,
      pdfValidationBound,
      pdfValidation,
      pdfValidationError,
      automated: extractMetrics(result, item.condition.options),
    };
    const verificationPath = path.join(item.outputDir, 'verification-evidence.json');
    writeImmutableJson(verificationPath, verificationEvidence);
    const verificationSha256 = sha256File(verificationPath);
    const roundLog = result.autoContinue && Array.isArray(result.autoContinue.log)
      ? result.autoContinue.log.map((line) => redactText(line).slice(0, 1000)) : [];
    const resultRecord = {
      schema: 'alloflow.mcp-refinement-result/v1',
      observationId: item.blindId,
      runId: item.runId,
      capturedAt: finished.toISOString(),
      document: {
        documentId: item.source.id,
        sourceSha256: item.source.sha256,
        partition: item.source.partition,
      },
      condition: {
        kind: ({ 'primary-one-shot': 'one_shot', 'gated-loop': 'gated_loop', 'deterministic-only': 'deterministic_only', 'ungated-loop': 'ungated_loop' })[item.condition.id],
        replicate: item.repetition,
      },
      protocol: {
        protocolSha256: plan.protocolSha256,
        engine: {
          name: engine.engine,
          version: engine.git && engine.git.commit ? engine.git.commit : 'working-tree',
          buildSha256: engine.engineAggregateSha256 || engine.driver.sha256,
        },
        provider: engine.provider.family,
        model: {
          primary: engine.provider.primaryModel,
          fallback: engine.provider.fallbackModel,
          endpoint: engine.provider.endpoint,
          sampling: engine.provider.sampling,
          temperatureControlled: engine.provider.temperatureControlled,
          seedControlled: engine.provider.seedControlled,
          fallbackEnabled: engine.provider.fallbackEnabled,
          actualModelTraceComplete: engine.provider.actualModelTraceComplete,
        },
        sharedOptions: Object.fromEntries(Object.entries(item.condition.options)
          .filter(([key]) => key !== 'autoContinue' && key !== 'autoContinueRounds')),
        conditionOptions: {
          autoContinue: item.condition.options.autoContinue,
          autoContinueRounds: item.condition.options.autoContinueRounds,
        },
      },
      execution: (() => {
        const providerClass = engine.provider.providerClass || engine.provider.evidenceClass;
        const evidenceClass = providerClass !== 'live'
          ? 'infrastructure_only'
          : (item.source.partition === 'prospective_held_out'
            ? 'prospective_confirmatory' : 'development_descriptive');
        return {
          providerClass,
          evidenceClass,
          effectivenessEligible: providerClass === 'live'
            && evidenceClass === 'prospective_confirmatory'
            && engine.provider.liveSettingsEligible === true,
        };
      })(),
      artifacts: {
        finalSha256: finalArtifact.sha256,
        verificationSha256,
        verificationSubjectSha256: verificationEvidence.verificationSubjectSha256,
        verificationBindingValid: htmlBindingValid,
        finalArtifactEvidenceBound,
      },
      outcome: {
        status: finalArtifactEvidenceBound ? 'complete' : 'incomplete',
        automated: {
          beforeScore: result.beforeScore ?? null,
          afterScore: result.afterScore ?? null,
          openIssueCount: null,
          introducedDefectCount: null,
          verificationComplete: result.verificationState === 'complete',
          pdfUaStatus: pdfValidation ? pdfValidation.status : null,
          pdfUaFailedRules: pdfValidation && Number.isSafeInteger(pdfValidation.failedRules) ? pdfValidation.failedRules : null,
          pdfUaFailedChecks: pdfValidation && Number.isSafeInteger(pdfValidation.failedChecks) ? pdfValidation.failedChecks : null,
          deliveryRefusal: pdfRequested && !pdfArtifact ? (result.taggedPdfError || 'tagged_pdf_not_produced') : null,
        },
        expertConfirmed: null,
      },
      rounds: {
        attempted: result.autoContinue && Number.isSafeInteger(result.autoContinue.roundsRun) ? result.autoContinue.roundsRun : 0,
        accepted: roundLog.filter((line) => /accepted:/i.test(line)).length,
        reverted: roundLog.filter((line) => /REVERTED/i.test(line)).length,
      },
      usage: {
        latencyMs: record.timings.totalMs,
        modelCalls: result.stats && Number.isFinite(result.stats.apiCalls) ? result.stats.apiCalls : null,
        inputTokens: null,
        outputTokens: null,
        costUsd: null,
      },
      expertAdjudication: {
        status: 'unassigned',
        annotationJoinKey: item.blindId,
        expectedSubjectSha256: finalArtifact.sha256,
        annotationFile: null,
        annotationSha256: null,
      },
    };
    const resultPath = path.join(item.outputDir, 'result.json');
    writeImmutableJson(resultPath, resultRecord);
    const reviewRoot = path.join(plan.outputRoot, plan.studyId, 'reviewer-packets', item.blindId);
    ensureDirectory(reviewRoot);
    const reviewExtension = path.extname(finalArtifact.path) || '.bin';
    const blindedArtifactPath = path.join(reviewRoot, 'candidate' + reviewExtension);
    writeImmutableBytes(blindedArtifactPath, fs.readFileSync(path.join(item.outputDir, finalArtifact.path)));
    const blindedSourcePath = path.join(reviewRoot, 'source' + item.source.extension);
    writeImmutableBytes(blindedSourcePath, fs.readFileSync(item.source.path));
    const reviewManifest = {
      schema: 'alloflow.blinded-review-packet/v1',
      blindId: item.blindId,
      subjectSha256: finalArtifact.sha256,
      sourceSha256: item.source.sha256,
      source: path.basename(blindedSourcePath),
      artifact: path.basename(blindedArtifactPath),
      expertAnnotation: null,
    };
    writeImmutableJson(path.join(reviewRoot, 'review-manifest.json'), reviewManifest);
    const annotationTemplate = {
      schema: 'alloflow.mcp-refinement-expert-annotation/v1',
      annotationId: null,
      annotationProtocolSha256: plan.protocolSha256,
      annotationJoinKey: item.blindId,
      subjectSha256: finalArtifact.sha256,
      blinded: true,
      reviewerCount: null,
      baselineAdjudicationSha256: null,
      baselineMaterialIssueCount: null,
      criticalSeriousIssuesResolved: null,
      materialDefectsIntroduced: null,
      pass: null,
      adjudicatedAt: null,
      contentCommitmentSha256: null,
    };
    writeImmutableJson(path.join(reviewRoot, 'expert-annotation.template.json'), annotationTemplate);
    atomicWriteJson(recordPath, record);
    return { status: record.status, recordPath, resultPath, runId: item.runId, blindId: item.blindId };
  } catch (error) {
    const finished = now();
    record.status = 'failed';
    record.timings = {
      startedAt: record.timings.startedAt,
      finishedAt: finished.toISOString(),
      totalMs: Math.round(elapsedMs()),
      events,
    };
    record.resume.checkpointsWritten = checkpointsWritten;
    record.resume.latestCheckpoint = latestCheckpoint;
    record.error = serializeError(error);
    atomicWriteJson(recordPath, record);
    return { status: 'failed', recordPath, runId: item.runId, error: record.error };
  }
}

async function executeStudyPlan(plan, options = {}) {
  if (options.execute !== true) {
    throw new Error('Execution authorization missing: pass execute:true (CLI: --execute). Planning never calls a provider.');
  }
  if (!plan || plan.schema !== STUDY_SCHEMA || plan.kind !== 'alloflow-refinement-study-plan') {
    throw new Error('Invalid refinement study plan');
  }
  if (options.confirm !== plan.studyId) {
    throw new Error('Execution confirmation mismatch: pass the exact studyId as confirm (CLI: --confirm ' + plan.studyId + ').');
  }
  const driverPath = path.resolve(options.driverPath || DEFAULT_DRIVER_PATH);
  if (plan.sources.some((source) => source.partition === 'prospective_held_out')
    && (!plan.blinding || plan.blinding.blindingEligible !== true)) {
    throw new Error('Prospective held-out execution requires a secret 256-bit hexadecimal randomizationSeed.');
  }
  const preflight = providerCapabilityPreflight(options.env || process.env);
  if (!preflight.canExecute) {
    throw new Error('Execution requires an explicit GEMINI_API_KEY in the process environment; implicit key files are disabled for studies.');
  }
  // Enforce this before loading the driver: study execution may never fall through to the
  // maintainer convenience file or an implicitly configured env file.
  const priorNoKeyFiles = process.env.ALLOFLOW_MCP_NO_KEY_FILES;
  process.env.ALLOFLOW_MCP_NO_KEY_FILES = '1';
  const requestedRunIds = Array.isArray(options.onlyRun) ? new Set(options.onlyRun.map(String)) : null;
  const runnable = plan.runs.filter((run) => run.status === 'ready' && (!requestedRunIds || requestedRunIds.has(run.runId)));
  if (requestedRunIds) {
    const found = new Set(runnable.map((run) => run.runId));
    const missing = [...requestedRunIds].filter((id) => !found.has(id));
    if (missing.length) throw new Error('Unknown or blocked --only-run id(s): ' + missing.join(', '));
  }
  const maxRuns = finiteNumber(options.maxRuns, 'maxRuns', { min: 1, max: 10000, integer: true });
  if (runnable.length > maxRuns) {
    throw new Error('Selected ' + runnable.length + ' runnable studies, exceeding explicit maxRuns=' + maxRuns + '.');
  }
  const outcomes = plan.runs.filter((run) => run.status !== 'ready').map((run) => ({
    status: 'blocked', runId: run.runId, reason: run.blockedReason,
  }));
  let driver = options.driver || null;
  try {
    if (runnable.length && !driver) {
      const driverModule = options.driverModule || require(driverPath);
      const factory = options.driverFactory || driverModule.createDriver;
      if (typeof factory !== 'function') throw new Error('Remediation driver does not export createDriver');
      driver = factory({ log: () => {} });
    }
    for (const item of runnable) {
      const outcome = await executeRun(item, plan, {
        driver,
        driverPath,
        resume: options.resume === true,
        now: options.now,
        engineMetadata: options.engineMetadata,
      });
      outcomes.push(outcome);
      if (outcome.status === 'failed' && options.stopOnError === true) break;
    }
  } finally {
    if (!options.driver && driver && typeof driver.close === 'function') await driver.close();
    if (priorNoKeyFiles === undefined) delete process.env.ALLOFLOW_MCP_NO_KEY_FILES;
    else process.env.ALLOFLOW_MCP_NO_KEY_FILES = priorNoKeyFiles;
  }
  return {
    studyId: plan.studyId,
    planHash: plan.planHash,
    executed: true,
    outcomes,
    selectedRuns: runnable.length,
    providerClass: preflight.providerClass,
    evidenceClass: preflight.evidenceClass,
    liveSettingsEligible: preflight.effectivenessEligible,
    summary: outcomes.reduce((acc, outcome) => {
      acc[outcome.status] = (acc[outcome.status] || 0) + 1;
      return acc;
    }, {}),
  };
}

module.exports = {
  STUDY_SCHEMA,
  RECORD_SCHEMA,
  CONDITIONS,
  DEFAULT_DRIVER_PATH,
  DEFAULT_OUTPUT_ROOT,
  buildStudyPlan,
  executeStudyPlan,
  collectEngineMetadata,
  providerCapabilityPreflight,
  extractMetrics,
  loadAdapter,
  normalizedDriverOptions,
  redactText,
  sanitizeForRecord,
  sha256Buffer,
  sha256File,
  stableStringify,
};
