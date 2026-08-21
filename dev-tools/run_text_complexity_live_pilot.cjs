#!/usr/bin/env node
/**
 * Bounded live-provider canary for source-text complexity calibration.
 *
 * Safety properties:
 * - Dry-run unless --execute is explicit.
 * - Synthetic topic only; no student/source data is accepted.
 * - Credentials come from environment variables and are never reported.
 * - Hard cap of 12 calls; the default canary makes three sequential calls.
 * - Generated text is not persisted or printed. Reports contain fingerprints
 *   and aggregate measurements only.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const InstructionalContext = require('../instructional_context_module.js');
const OfflineEvaluator = require('./evaluate_text_complexity_calibration.cjs');

const PILOT_VERSION = 'text-complexity-live-pilot/v1';
const PROMPT_CONTRACT_VERSION = 'source-calibration-canary/v1';
const HARD_MAX_CALLS = 12;
const HARD_MAX_HTTP_ATTEMPTS = 24;
const DEFAULT_GRADES = Object.freeze(['5th Grade', '8th Grade', '12th Grade']);
const DEFAULT_TOPIC = 'How water moves through the water cycle and affects local weather';
const CLOUD_BACKENDS = new Set(['gemini', 'openai', 'claude']);
const LOCAL_BACKENDS = new Set(['ollama', 'lmstudio', 'localai', 'alloflow-local']);
const ALLOWED_BACKENDS = new Set([...CLOUD_BACKENDS, ...LOCAL_BACKENDS, 'custom']);
const DEFAULT_MODELS = Object.freeze({
  gemini: 'gemini-3-flash-preview',
  openai: 'gpt-4o-mini',
  claude: 'claude-sonnet-5',
  ollama: '',
  lmstudio: '',
  localai: '',
  'alloflow-local': '',
  custom: '',
});

function clean(value, limit = 200) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, limit);
}

function clampInteger(value, fallback, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, Math.round(numeric)));
}

function optionValue(argv, name) {
  const exactIndex = argv.indexOf(name);
  if (exactIndex >= 0 && argv[exactIndex + 1] && !String(argv[exactIndex + 1]).startsWith('--')) {
    return argv[exactIndex + 1];
  }
  const prefix = name + '=';
  const inline = argv.find((arg) => String(arg).startsWith(prefix));
  return inline ? String(inline).slice(prefix.length) : undefined;
}

function parseArgs(argv = process.argv.slice(2)) {
  const gradesValue = optionValue(argv, '--grades');
  const grades = gradesValue
    ? String(gradesValue).split(',').map((grade) => InstructionalContext.normalizeGradeLabel(grade, '')).filter(Boolean)
    : DEFAULT_GRADES.slice();
  const repetitions = clampInteger(optionValue(argv, '--repetitions'), 1, 1, 3);
  const plannedCalls = grades.length * repetitions;
  const maxCalls = clampInteger(optionValue(argv, '--max-calls'), Math.max(1, plannedCalls), 1, HARD_MAX_CALLS);
  const maxRetries = clampInteger(optionValue(argv, '--max-retries'), 3, 1, 4);
  const maxHttpAttempts = clampInteger(
    optionValue(argv, '--max-http-attempts'),
    Math.min(HARD_MAX_HTTP_ATTEMPTS, Math.max(plannedCalls, plannedCalls * maxRetries)),
    Math.max(1, plannedCalls),
    HARD_MAX_HTTP_ATTEMPTS,
  );
  const backend = clean(optionValue(argv, '--backend') || process.env.ALLOFLOW_PILOT_BACKEND || 'gemini', 40).toLowerCase();
  if (!ALLOWED_BACKENDS.has(backend)) throw new Error('Unsupported pilot backend: ' + backend);
  if (!grades.length) throw new Error('At least one recognized grade is required.');
  if (plannedCalls > maxCalls) throw new Error(`Pilot plan requires ${plannedCalls} calls but --max-calls is ${maxCalls}.`);
  if (plannedCalls > HARD_MAX_CALLS) throw new Error(`Pilot plan exceeds the hard ${HARD_MAX_CALLS}-call safety cap.`);
  return {
    execute: argv.includes('--execute'),
    json: argv.includes('--json'),
    backend,
    model: clean(optionValue(argv, '--model') || process.env.ALLOFLOW_PILOT_MODEL || DEFAULT_MODELS[backend], 160),
    baseUrl: clean(optionValue(argv, '--base-url') || process.env.ALLOFLOW_PILOT_BASE_URL, 500),
    grades,
    repetitions,
    maxCalls,
    maxTokens: clampInteger(optionValue(argv, '--max-tokens'), 700, 128, 1200),
    targetWords: clampInteger(optionValue(argv, '--target-words'), 250, 120, 400),
    paceMs: clampInteger(optionValue(argv, '--pace-ms'), 1000, 0, 10000),
    timeoutMs: clampInteger(optionValue(argv, '--timeout-ms'), 60000, 5000, 120000),
    maxRetries,
    maxHttpAttempts,
    output: clean(optionValue(argv, '--output'), 500),
  };
}

function resolveApiKey(backend, env = process.env) {
  const generic = clean(env.ALLOFLOW_PILOT_API_KEY, 10000);
  if (generic) return generic;
  if (backend === 'gemini') return clean(env.GEMINI_API_KEY || env.GOOGLE_API_KEY, 10000);
  if (backend === 'openai') return clean(env.OPENAI_API_KEY, 10000);
  if (backend === 'claude') return clean(env.ANTHROPIC_API_KEY, 10000);
  return '';
}

function providerReadiness(config, env = process.env, injectedGenerator = null) {
  if (typeof injectedGenerator === 'function') {
    return { ready: true, code: 'injected-provider', credentialPresent: false };
  }
  const credentialPresent = Boolean(resolveApiKey(config.backend, env));
  if (CLOUD_BACKENDS.has(config.backend) && !credentialPresent) {
    return { ready: false, code: 'missing-credential', credentialPresent: false };
  }
  if (!config.model && config.backend !== 'alloflow-local') {
    return { ready: false, code: 'missing-model', credentialPresent };
  }
  return {
    ready: true,
    code: LOCAL_BACKENDS.has(config.backend) || config.backend === 'custom'
      ? 'endpoint-unverified'
      : 'configured',
    credentialPresent,
  };
}

function buildPilotPrompt(requestedGrade, options = {}) {
  const grade = InstructionalContext.normalizeGradeLabel(requestedGrade, '5th Grade');
  const topic = clean(options.topic || DEFAULT_TOPIC, 240);
  const targetWords = clampInteger(options.targetWords, 250, 120, 400);
  const guidance = InstructionalContext.buildSourceCalibrationGuidance(grade);
  return [
    `Write a self-contained educational passage about "${topic}".`,
    `Target length: approximately ${targetWords} words, within 10 percent.`,
    guidance,
    'Use accurate facts and a calm expository tone.',
    'Define any necessary domain-specific term simply in the same sentence.',
    'Use concrete examples when an idea is abstract.',
    'Return plain paragraphs only: no title, headings, bullets, citations, bibliography, or commentary about the request.',
  ].join('\n');
}

function buildPilotPlan(config) {
  const rows = [];
  for (const gradeInput of config.grades) {
    const requestedGrade = InstructionalContext.normalizeGradeLabel(gradeInput, '');
    const calibration = InstructionalContext.getSourceCalibrationTarget(requestedGrade);
    const target = InstructionalContext.getComplexityTarget(requestedGrade);
    for (let repetition = 1; repetition <= config.repetitions; repetition++) {
      const prompt = buildPilotPrompt(requestedGrade, config);
      rows.push({
        id: requestedGrade.toLowerCase().replace(/[^a-z0-9]+/g, '-') + `-r${repetition}`,
        requestedGrade,
        calibrationTarget: calibration.promptGrade,
        calibrationPolicyVersion: calibration.policyVersion,
        targetRange: target ? target.fkRange : null,
        repetition,
        prompt,
        promptFingerprint: InstructionalContext.fingerprintText(prompt),
      });
    }
  }
  if (rows.length > config.maxCalls || rows.length > HARD_MAX_CALLS) {
    throw new Error('Resolved pilot plan exceeds its call budget.');
  }
  return rows;
}

function parseRetryAfter(value, now = Date.now()) {
  if (value === undefined || value === null || value === '') return null;
  const numeric = Number(value);
  const seconds = Number.isFinite(numeric) ? numeric : (Date.parse(String(value)) - now) / 1000;
  return Number.isFinite(seconds) ? Math.max(0, seconds) : null;
}

function safeTransportError(code, status = null) {
  const error = new Error(code);
  error.code = code;
  if (status !== null) error.httpStatus = status;
  return error;
}

function createInstrumentedFetch(options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== 'function') throw new Error('A fetch implementation is required.');
  const events = options.events || [];
  const maxRetries = clampInteger(options.maxRetries, 3, 1, 4);
  const timeoutMs = clampInteger(options.timeoutMs, 60000, 100, 120000);
  const maxRetryDelayMs = clampInteger(options.maxRetryDelayMs, 15000, 0, 60000);
  const attemptBudget = options.attemptBudget && typeof options.attemptBudget === 'object'
    ? options.attemptBudget
    : { used: 0, maximum: HARD_MAX_HTTP_ATTEMPTS };
  attemptBudget.used = Math.max(0, Number(attemptBudget.used) || 0);
  attemptBudget.maximum = clampInteger(attemptBudget.maximum, HARD_MAX_HTTP_ATTEMPTS, 1, HARD_MAX_HTTP_ATTEMPTS);
  const sleep = options.sleep || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const random = typeof options.random === 'function' ? options.random : Math.random;
  const waitWithAbort = async (delayMs, signal) => {
    if (!signal) return sleep(delayMs);
    if (signal.aborted) throw safeTransportError('aborted');
    let abortHandler = null;
    try {
      await Promise.race([
        Promise.resolve().then(() => sleep(delayMs)),
        new Promise((resolve, reject) => {
          abortHandler = () => reject(safeTransportError('aborted'));
          signal.addEventListener('abort', abortHandler, { once: true });
        }),
      ]);
    } finally {
      if (abortHandler) signal.removeEventListener('abort', abortHandler);
    }
  };
  return async function pilotFetch(url, requestOptions = {}) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      if (attemptBudget.used >= attemptBudget.maximum) {
        throw safeTransportError('http-attempt-budget-exhausted');
      }
      attemptBudget.used += 1;
      const startedAt = Date.now();
      events.push({ kind: 'attempt', attempt, budgetUsed: attemptBudget.used, budgetMaximum: attemptBudget.maximum });
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const callerSignal = requestOptions.signal || null;
      let timedOut = false;
      const onAbort = () => { try { controller && controller.abort(); } catch (_) {} };
      if (callerSignal && !callerSignal.aborted) callerSignal.addEventListener('abort', onAbort, { once: true });
      const timer = controller ? setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs) : null;
      try {
        if (callerSignal && callerSignal.aborted) throw safeTransportError('aborted');
        const response = await fetchImpl(url, controller ? { ...requestOptions, signal: controller.signal } : requestOptions);
        const retryAfterSec = parseRetryAfter(response && response.headers && response.headers.get('retry-after'));
        events.push({
          kind: 'response', attempt, status: Number(response.status) || 0, ok: Boolean(response.ok),
          retryAfterSec, latencyMs: Math.max(0, Date.now() - startedAt),
        });
        if (response.ok) return response;
        const retryable = response.status === 429 || response.status === 503;
        if (!retryable) throw safeTransportError(response.status === 401 || response.status === 403 ? 'authentication' : 'http-error', response.status);
        if (attempt === maxRetries) throw safeTransportError('rate-limit-exhausted', response.status);
        const exponentialMs = Math.pow(2, attempt - 1) * 1000;
        const jitterMs = Math.round(exponentialMs * 0.5 * random());
        const serverMs = retryAfterSec === null ? 0 : Math.round(retryAfterSec * 1000);
        const delayMs = Math.min(maxRetryDelayMs, Math.max(serverMs, exponentialMs + jitterMs));
        events.push({ kind: 'retry', attempt, nextAttempt: attempt + 1, status: response.status, delayMs, retryAfterSec });
        await waitWithAbort(delayMs, callerSignal);
      } catch (error) {
        if (callerSignal && callerSignal.aborted) throw safeTransportError('aborted');
        if (error && error.code) throw error;
        events.push({ kind: 'network-error', attempt, timeout: timedOut, latencyMs: Math.max(0, Date.now() - startedAt) });
        if (attempt === maxRetries) throw safeTransportError(timedOut ? 'timeout-exhausted' : 'network-exhausted');
        const delayMs = Math.min(maxRetryDelayMs, Math.pow(2, attempt - 1) * 1000 + Math.round(500 * random()));
        events.push({ kind: 'retry', attempt, nextAttempt: attempt + 1, status: null, delayMs, retryAfterSec: null });
        await waitWithAbort(delayMs, callerSignal);
      } finally {
        if (timer) clearTimeout(timer);
        if (callerSignal) callerSignal.removeEventListener('abort', onAbort);
      }
    }
    throw safeTransportError('retry-exhausted');
  };
}

function loadAIProvider() {
  const originalLog = console.log;
  try {
    console.log = () => {};
    return require('../ai_backend_module.js').AIProvider;
  } finally {
    console.log = originalLog;
  }
}

function loadGeminiFactory() {
  if (typeof globalThis.window === 'undefined') globalThis.window = { AlloModules: {} };
  globalThis.window.AlloModules = globalThis.window.AlloModules || {};
  const originalLog = console.log;
  const originalWarn = console.warn;
  try {
    console.log = () => {};
    console.warn = () => {};
    require('../gemini_api_module.js');
    const factory = globalThis.window.AlloModules.createGeminiAPI;
    if (typeof factory !== 'function') throw new Error('Gemini production transport is unavailable.');
    return factory;
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
  }
}

async function withSuppressedProviderConsole(operation) {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  try {
    console.log = () => {};
    console.warn = () => {};
    console.error = () => {};
    return await operation();
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
  }
}

function createProviderGenerator(config, telemetryEvents, env = process.env, attemptBudget = null) {
  const apiKey = resolveApiKey(config.backend, env);
  const fetchWithRetry = createInstrumentedFetch({
    events: telemetryEvents,
    maxRetries: config.maxRetries,
    timeoutMs: config.timeoutMs,
    attemptBudget,
  });
  if (config.backend === 'gemini') {
    const createGeminiAPI = loadGeminiFactory();
    const api = createGeminiAPI({
      apiKey,
      _isCanvasEnv: false,
      GEMINI_MODELS: {
        default: config.model,
        fallback: config.model,
        flash: config.model,
        vision: config.model,
        image: config.model,
      },
      fetchWithExponentialBackoff: (url, options) => fetchWithRetry(url, options),
      optimizeImage: (value) => value,
      warnLog: () => {},
      debugLog: () => {},
      getAbortSignal: () => null,
      canvasAuthBackoffMs: [],
      maxTextOutputTokens: config.maxTokens,
    });
    return async ({ prompt }) => {
      const beforeCounts = {};
      Object.values(globalThis.window.__alloGeminiModelUsage || {}).forEach((entry) => {
        const identity = String(entry && entry.requested || '') + '\u0000' + String(entry && entry.served || '');
        beforeCounts[identity] = Number(entry && entry.count) || 0;
      });
      const modelEvents = [];
      const result = await withSuppressedProviderConsole(() => api.callGemini(
        prompt,
        false,
        false,
        null,
        null,
        null,
        false,
        { onModel: (model) => modelEvents.push(clean(model, 160)) },
      ));
      const ledger = Object.values(globalThis.window.__alloGeminiModelUsage || {});
      const changed = ledger
        .filter((entry) => {
          const identity = String(entry && entry.requested || '') + '\u0000' + String(entry && entry.served || '');
          return Number(entry && entry.count) > Number(beforeCounts[identity] || 0);
        })
        .sort((left, right) => Number(right.lastSeen || 0) - Number(left.lastSeen || 0))[0] || null;
      return {
        text: result,
        requestedModel: clean(changed && changed.requested || modelEvents.at(-1) || config.model, 160) || null,
        servedModel: clean(changed && changed.served, 160) || null,
      };
    };
  }

  const AIProvider = loadAIProvider();
  const modelConfig = config.model ? { default: config.model, fallback: config.model, flash: config.model } : {};
  const provider = new AIProvider({
    backend: config.backend,
    apiKey,
    baseUrl: config.baseUrl || undefined,
    models: modelConfig,
    fetchWithRetry,
    debugLog: () => {},
    warnLog: () => {},
  });
  return async ({ prompt }) => ({
    text: await provider.generateText(prompt, {
      json: false,
      search: false,
      temperature: null,
      maxTokens: config.maxTokens,
    }),
    requestedModel: config.model || null,
    servedModel: null,
  });
}

function distanceFromRange(score, range) {
  const numeric = Number(score);
  if (!Number.isFinite(numeric) || !range) return null;
  if (numeric < range.min) return numeric - range.min;
  if (numeric > range.max) return numeric - range.max;
  return 0;
}

function percentile(values, quantile) {
  const sorted = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (!sorted.length) return null;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * quantile) - 1));
  return sorted[index];
}

function summarizeSamples(samples, telemetryEvents, repetitions) {
  const succeeded = samples.filter((sample) => sample.status === 'succeeded');
  const measured = succeeded.filter((sample) => Number.isFinite(sample.measuredGrade));
  const counts = { withinTarget: 0, aboveTarget: 0, belowTarget: 0, unavailable: 0 };
  measured.forEach((sample) => {
    if (sample.complexityStatus === 'within-target') counts.withinTarget++;
    else if (sample.complexityStatus === 'above-target') counts.aboveTarget++;
    else if (sample.complexityStatus === 'below-target') counts.belowTarget++;
    else counts.unavailable++;
  });
  const distances = measured.map((sample) => Math.abs(sample.distanceFromTargetRange)).filter(Number.isFinite);
  const rateLimitedResponses = telemetryEvents.filter((event) => event.kind === 'response' && event.status === 429).length;
  const retryCount = telemetryEvents.filter((event) => event.kind === 'retry').length;
  const withinTargetRate = measured.length ? counts.withinTarget / measured.length : null;
  const overshootRate = measured.length ? counts.aboveTarget / measured.length : null;
  const enoughForProvisionalDecision = repetitions >= 3 && measured.length >= 9;
  const requestedModels = [...new Set(succeeded.map((sample) => clean(sample.requestedModel, 160)).filter(Boolean))];
  const servedModels = [...new Set(succeeded.map((sample) => clean(sample.servedModel, 160)).filter(Boolean))];
  const modelObservationComplete = succeeded.length > 0
    && succeeded.every((sample) => Boolean(clean(sample.servedModel, 160)));
  const modelIdentityPassed = modelObservationComplete
    && succeeded.every((sample) => clean(sample.requestedModel, 160) === clean(sample.servedModel, 160));
  let calibrationDecision = 'insufficient-sample';
  if (enoughForProvisionalDecision) {
    calibrationDecision = withinTargetRate >= 2 / 3 && overshootRate <= 1 / 4
      ? 'meets-provisional-threshold'
      : 'needs-calibration-adjustment';
  }
  return {
    callsPlanned: samples.length,
    callsAttempted: samples.filter((sample) => sample.status !== 'planned').length,
    callsSucceeded: succeeded.length,
    callsFailed: samples.filter((sample) => sample.status === 'failed').length,
    transportPassed: samples.length > 0 && succeeded.length === samples.length,
    ...counts,
    withinTargetRate,
    overshootRate,
    undershootRate: measured.length ? counts.belowTarget / measured.length : null,
    meanAbsoluteDistanceFromTargetRange: distances.length
      ? distances.reduce((sum, value) => sum + value, 0) / distances.length
      : null,
    latencyMs: {
      p50: percentile(succeeded.map((sample) => sample.latencyMs), 0.5),
      p95: percentile(succeeded.map((sample) => sample.latencyMs), 0.95),
    },
    rateLimitedResponses,
    retryCount,
    rawHttpAttempts: telemetryEvents.filter((event) => event.kind === 'attempt').length,
    requestedModels,
    servedModels,
    modelObservationComplete,
    modelIdentityPassed,
    calibrationDecision,
  };
}

function safeFailure(error) {
  const code = clean(error && (error.code || error.name), 80) || 'generation-failed';
  const status = Number(error && error.httpStatus);
  return { code, httpStatus: Number.isFinite(status) ? status : null };
}

async function runPilot(configInput = {}, runtime = {}) {
  const config = {
    ...parseArgs([]),
    ...configInput,
    grades: Array.isArray(configInput.grades) ? configInput.grades.slice() : DEFAULT_GRADES.slice(),
  };
  config.repetitions = clampInteger(config.repetitions, 1, 1, 3);
  config.maxCalls = clampInteger(config.maxCalls, Math.max(1, config.grades.length * config.repetitions), 1, HARD_MAX_CALLS);
  config.maxHttpAttempts = clampInteger(
    config.maxHttpAttempts,
    Math.min(HARD_MAX_HTTP_ATTEMPTS, config.maxCalls * config.maxRetries),
    Math.max(1, config.grades.length * config.repetitions),
    HARD_MAX_HTTP_ATTEMPTS,
  );
  const plan = buildPilotPlan(config);
  const generate = typeof runtime.generate === 'function' ? runtime.generate : null;
  const readiness = providerReadiness(config, runtime.env || process.env, generate);
  const startedAt = new Date().toISOString();
  const baseReport = {
    schemaVersion: PILOT_VERSION,
    promptContractVersion: PROMPT_CONTRACT_VERSION,
    mode: config.execute ? 'live' : 'dry-run',
    status: config.execute ? (readiness.ready ? 'running' : 'blocked') : 'ready',
    startedAt,
    completedAt: null,
    provider: {
      backend: config.backend,
      model: config.model || null,
      endpointKind: CLOUD_BACKENDS.has(config.backend) ? 'cloud' : (LOCAL_BACKENDS.has(config.backend) ? 'local' : 'custom'),
      credentialPresent: readiness.credentialPresent,
    },
    readiness: { ready: readiness.ready, code: readiness.code },
    callBudget: {
      logical: { planned: plan.length, maximum: config.maxCalls, hardMaximum: HARD_MAX_CALLS },
      httpAttempts: { maximum: config.maxHttpAttempts, hardMaximum: HARD_MAX_HTTP_ATTEMPTS },
    },
    settings: {
      grades: config.grades.slice(), repetitions: config.repetitions, targetWords: config.targetWords,
      maxTokens: config.maxTokens, paceMs: config.paceMs, timeoutMs: config.timeoutMs, maxRetries: config.maxRetries,
    },
    samples: plan.map((sample) => ({
      id: sample.id,
      requestedGrade: sample.requestedGrade,
      calibrationTarget: sample.calibrationTarget,
      calibrationPolicyVersion: sample.calibrationPolicyVersion,
      targetRange: sample.targetRange,
      repetition: sample.repetition,
      promptFingerprint: sample.promptFingerprint,
      status: 'planned',
    })),
    telemetry: { responses: 0, retries: 0, rateLimitedResponses: 0 },
    summary: null,
  };
  if (!config.execute || !readiness.ready) {
    baseReport.completedAt = new Date().toISOString();
    baseReport.summary = summarizeSamples(baseReport.samples, [], config.repetitions);
    return baseReport;
  }

  const telemetryEvents = [];
  const attemptBudget = { used: 0, maximum: config.maxHttpAttempts };
  const providerGenerate = generate || createProviderGenerator(
    config,
    telemetryEvents,
    runtime.env || process.env,
    attemptBudget,
  );
  const sleep = runtime.sleep || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const samples = [];
  for (let index = 0; index < plan.length; index++) {
    if (index > 0 && config.paceMs > 0) await sleep(config.paceMs);
    const sample = plan[index];
    const telemetryStart = telemetryEvents.length;
    const started = Date.now();
    try {
      const generated = await providerGenerate({ prompt: sample.prompt, sample, config });
      const generatedText = typeof generated === 'string' ? generated : String(generated && generated.text || '');
      if (!generatedText.trim()) throw safeTransportError('empty-response');
      const readability = typeof InstructionalContext.measureSourceComplexity === 'function'
        ? InstructionalContext.measureSourceComplexity(generatedText, OfflineEvaluator.calculateReadability)
        : OfflineEvaluator.calculateReadability(generatedText);
      const measuredGrade = readability ? Number(readability.score) : null;
      samples.push({
        id: sample.id,
        requestedGrade: sample.requestedGrade,
        calibrationTarget: sample.calibrationTarget,
        calibrationPolicyVersion: sample.calibrationPolicyVersion,
        targetRange: sample.targetRange,
        repetition: sample.repetition,
        promptFingerprint: sample.promptFingerprint,
        status: 'succeeded',
        outputFingerprint: InstructionalContext.fingerprintText(generatedText),
        outputChars: generatedText.length,
        requestedModel: clean(generated && generated.requestedModel || config.model, 160) || null,
        servedModel: clean(generated && generated.servedModel, 160) || null,
        measuredGrade,
        complexityStatus: InstructionalContext.complexityStatus(measuredGrade, sample.requestedGrade),
        distanceFromTargetRange: distanceFromRange(measuredGrade, sample.targetRange),
        readability: readability ? {
          measurementScope: readability.measurementScope || 'source-body',
          measurementVersion: readability.measurementVersion || null,
          extractionVersion: readability.extractionVersion || null,
          rawFleschKincaidGrade: Number.isFinite(readability.rawFleschKincaidGrade)
            ? readability.rawFleschKincaidGrade
            : measuredGrade,
          displayFleschKincaidGrade: Number.isFinite(readability.displayFleschKincaidGrade)
            ? readability.displayFleschKincaidGrade
            : measuredGrade,
          averageSentenceLength: Number.isFinite(readability.averageSentenceLength)
            ? readability.averageSentenceLength
            : (readability.sentences ? readability.words / readability.sentences : null),
          averageSyllablesPerWord: Number.isFinite(readability.averageSyllablesPerWord)
            ? readability.averageSyllablesPerWord
            : (readability.words ? readability.syllables / readability.words : null),
          words: readability.words,
          sentences: readability.sentences,
          syllables: readability.syllables,
          bodyFingerprint: readability.bodyFingerprint || InstructionalContext.fingerprintText(generatedText),
        } : null,
        latencyMs: Math.max(0, Date.now() - started),
        transportEvents: telemetryEvents.slice(telemetryStart).length,
      });
    } catch (error) {
      samples.push({
        id: sample.id,
        requestedGrade: sample.requestedGrade,
        calibrationTarget: sample.calibrationTarget,
        calibrationPolicyVersion: sample.calibrationPolicyVersion,
        targetRange: sample.targetRange,
        repetition: sample.repetition,
        promptFingerprint: sample.promptFingerprint,
        status: 'failed',
        failure: safeFailure(error),
        latencyMs: Math.max(0, Date.now() - started),
        transportEvents: telemetryEvents.slice(telemetryStart).length,
      });
    }
  }
  baseReport.samples = samples;
  baseReport.completedAt = new Date().toISOString();
  baseReport.status = samples.every((sample) => sample.status === 'succeeded') ? 'complete' : 'partial';
  baseReport.telemetry = {
    responses: telemetryEvents.filter((event) => event.kind === 'response').length,
    retries: telemetryEvents.filter((event) => event.kind === 'retry').length,
    rateLimitedResponses: telemetryEvents.filter((event) => event.kind === 'response' && event.status === 429).length,
    rawHttpAttempts: telemetryEvents.filter((event) => event.kind === 'attempt').length,
  };
  baseReport.summary = summarizeSamples(samples, telemetryEvents, config.repetitions);
  return baseReport;
}

function formatHumanReport(report) {
  const percent = (value) => value === null || value === undefined ? 'n/a' : Math.round(value * 100) + '%';
  const lines = [
    `Text complexity live pilot: ${String(report.status || '').toUpperCase()}`,
    `Mode: ${report.mode}; provider/model: ${report.provider.backend}/${report.provider.model || '(not set)'}`,
    `Readiness: ${report.readiness.code}; logical calls: ${report.callBudget.logical.planned}/${report.callBudget.logical.maximum}; HTTP cap: ${report.callBudget.httpAttempts.maximum}`,
  ];
  if (report.mode === 'dry-run') lines.push('No provider calls were made. Re-run with --execute after configuring a provider credential or local endpoint.');
  if (report.status === 'blocked') lines.push('No provider calls were made because live readiness checks did not pass.');
  if (report.summary) {
    lines.push(`Transport: ${report.summary.callsSucceeded}/${report.summary.callsPlanned} succeeded; retries=${report.summary.retryCount}; 429s=${report.summary.rateLimitedResponses}`);
    lines.push(`Calibration: within=${percent(report.summary.withinTargetRate)}; above=${percent(report.summary.overshootRate)}; below=${percent(report.summary.undershootRate)}; decision=${report.summary.calibrationDecision}`);
    lines.push(`Model observation: ${report.summary.modelObservationComplete ? (report.summary.modelIdentityPassed ? 'matched' : 'mismatch') : 'not reported'}${report.summary.servedModels.length ? `; served=${report.summary.servedModels.join(',')}` : ''}`);
  }
  for (const sample of report.samples || []) {
    const measurement = sample.status === 'succeeded'
      ? `FK ${sample.measuredGrade} (${sample.complexityStatus})`
      : sample.status === 'failed' ? `failed:${sample.failure && sample.failure.code}` : 'planned';
    lines.push(`- ${sample.requestedGrade} r${sample.repetition}: prompt=${sample.calibrationTarget}; ${measurement}`);
  }
  return lines.join('\n');
}

function writeReport(report, outputPath) {
  if (!outputPath) return null;
  const resolved = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, JSON.stringify(report, null, 2) + '\n', 'utf8');
  return resolved;
}

module.exports = {
  PILOT_VERSION,
  PROMPT_CONTRACT_VERSION,
  HARD_MAX_CALLS,
  HARD_MAX_HTTP_ATTEMPTS,
  DEFAULT_GRADES,
  DEFAULT_TOPIC,
  parseArgs,
  resolveApiKey,
  providerReadiness,
  buildPilotPrompt,
  buildPilotPlan,
  parseRetryAfter,
  createInstrumentedFetch,
  createProviderGenerator,
  distanceFromRange,
  summarizeSamples,
  runPilot,
  formatHumanReport,
  writeReport,
};

if (require.main === module) {
  (async () => {
    try {
      const config = parseArgs(process.argv.slice(2));
      const report = await runPilot(config);
      const savedPath = writeReport(report, config.output);
      process.stdout.write((config.json ? JSON.stringify(report, null, 2) : formatHumanReport(report)) + '\n');
      if (savedPath && !config.json) process.stdout.write(`Report written: ${savedPath}\n`);
      if (report.status === 'blocked') process.exitCode = 2;
      else if (report.status === 'partial') process.exitCode = 1;
    } catch (error) {
      process.stderr.write(`Text complexity live pilot failed: ${clean(error && error.message, 300)}\n`);
      process.exitCode = 1;
    }
  })();
}
