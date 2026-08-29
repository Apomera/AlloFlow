// math_helpers_source.jsx - Phase I.2 of CDN modularization.
// 5 math-related handlers extracted as a standalone module.

// React state is not committed synchronously, so checking a state-level
// `loading` flag alone cannot stop two rapid clicks from starting duplicate AI
// requests (or awarding XP twice). Keep the small request/award ledgers outside
// React and key them to the resource problem for the lifetime of this module.
const _mathCheckInFlight = new Set();
const _mathHintInFlight = new Set();
const _mathEditInFlight = new Set();
const _mathXpAwardedKeys = new Set();
const _mathHintUsageCounts = new Map();
// History indexes are presentation order, not identity. Keep duplicate resource
// identities attached to the actual artifact objects so reordering or deleting a
// sibling cannot move one learner's answers, hints, or request state to another.
const _mathResourceInstanceKeys = new WeakMap();
const _mathResourceDataInstanceKeys = new WeakMap();
const _mathIssuedResourceInstanceKeys = new Set();
let _mathResourceInstanceCounter = 0;

const _isMathRecord = value => {
  try {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  } catch (_) {
    return false;
  }
};
const _safeMathText = (value, maxLength = 4000) => (
  typeof value === 'string' || typeof value === 'number'
    ? String(value).slice(0, maxLength)
    : ''
);
const _safeMathStateKey = (value, fallback) => {
  const key = _safeMathText(value, 500).trim() || fallback;
  return Object.prototype.hasOwnProperty.call(Object.prototype, key)
    ? `math-state-${encodeURIComponent(key)}`
    : key;
};
const canonicalMathStateKey = (value, fallback = 'math') => (
  _safeMathStateKey(value, _safeMathText(fallback, 500).trim() || 'math')
);
const _mathStableHash = value => {
  const text = String(value == null ? '' : value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};
const getMathResourceId = artifact => {
  const safeArtifact = _isMathRecord(artifact) ? artifact : {};
  const read = (record, key) => {
    try { return _isMathRecord(record) ? record[key] : undefined; } catch (_) { return undefined; }
  };
  const rawData = read(safeArtifact, 'data');
  const data = _isMathRecord(rawData) ? rawData : {};
  const resourceSeed = _safeMathText(read(data, 'title'), 2000)
    || _safeMathText(read(data, 'problem'), 2000)
    || _safeMathText(read(safeArtifact, 'timestamp'), 2000)
    || 'math';
  const suppliedResourceId = _safeMathText(read(safeArtifact, 'id'), 500).trim();
  if (!suppliedResourceId) return 'legacy-math-' + _mathStableHash(resourceSeed);
  return Object.prototype.hasOwnProperty.call(Object.prototype, suppliedResourceId)
    ? 'math-resource-' + _mathStableHash(resourceSeed + '|' + suppliedResourceId)
    : suppliedResourceId;
};
const _mathResourceData = artifact => {
  try {
    const data = artifact?.data;
    return _isMathRecord(data) ? data : null;
  } catch (_) {
    return null;
  }
};
const _mathDataIdentityIsUnambiguous = (data, baseId, artifacts, limit) => {
  if (!_isMathRecord(data)) return false;
  let matches = 0;
  for (let index = 0; index < limit && matches < 2; index += 1) {
    try {
      const candidate = artifacts[index];
      if (_isMathRecord(candidate) && getMathResourceId(candidate) === baseId && candidate.data === data) {
        matches += 1;
      }
    } catch (_) {}
  }
  return matches <= 1;
};
const _knownMathResourceInstanceKey = (artifact, baseId, artifacts, limit) => {
  if (!_isMathRecord(artifact)) return '';
  let key = '';
  try { key = _mathResourceInstanceKeys.get(artifact) || ''; } catch (_) {}
  if (key.startsWith(baseId + '::instance:') && _mathIssuedResourceInstanceKeys.has(key)) return key;
  const data = _mathResourceData(artifact);
  if (data && _mathDataIdentityIsUnambiguous(data, baseId, artifacts, limit)) {
    try { key = _mathResourceDataInstanceKeys.get(data) || ''; } catch (_) { key = ''; }
    if (key.startsWith(baseId + '::instance:') && _mathIssuedResourceInstanceKeys.has(key)) {
      try { _mathResourceInstanceKeys.set(artifact, key); } catch (_) {}
      return key;
    }
  }
  return '';
};
const _adoptMathResourceInstanceKey = (artifact, key, baseId, artifacts, limit) => {
  if (!_isMathRecord(artifact) || !key.startsWith(baseId + '::instance:')) return;
  try { _mathResourceInstanceKeys.set(artifact, key); } catch (_) {}
  const data = _mathResourceData(artifact);
  if (data && _mathDataIdentityIsUnambiguous(data, baseId, artifacts, limit)) {
    try { _mathResourceDataInstanceKeys.set(data, key); } catch (_) {}
  }
};
const _mathResourceInstanceKey = (artifact, baseId, artifacts, limit) => {
  if (!_isMathRecord(artifact)) return baseId;
  const knownKey = _knownMathResourceInstanceKey(artifact, baseId, artifacts, limit);
  if (knownKey) return knownKey;
  let key = '';
  do {
    _mathResourceInstanceCounter += 1;
    key = `${baseId}::instance:${_mathResourceInstanceCounter.toString(36)}`;
    if (_mathIssuedResourceInstanceKeys.has(key)) continue;
    let collidesWithPinnedArtifact = false;
    for (let index = 0; index < limit && !collidesWithPinnedArtifact; index += 1) {
      try {
        collidesWithPinnedArtifact = _safeMathText(artifacts[index]?._mathResourceStateKey, 1000).trim() === key;
      } catch (_) {}
    }
    if (!collidesWithPinnedArtifact) break;
  } while (true);
  _mathIssuedResourceInstanceKeys.add(key);
  _adoptMathResourceInstanceKey(artifact, key, baseId, artifacts, limit);
  return key;
};
const getMathResourceInstanceId = (artifact, artifacts = []) => {
  const baseId = getMathResourceId(artifact);
  if (!_isMathRecord(artifact)) return baseId;
  let safeArtifacts = [];
  try {
    if (Array.isArray(artifacts)) safeArtifacts = artifacts;
  } catch (_) {}
  let historyLength = 0;
  let limit = 0;
  try {
    const length = Number(safeArtifacts.length);
    historyLength = Number.isFinite(length) && length > 0 ? Math.floor(length) : 0;
    limit = Math.min(historyLength, 10000);
  } catch (_) {}
  const historyWasTruncated = historyLength > limit;
  let persistentInstanceId = '';
  try {
    const candidate = _safeMathText(artifact._artifactInstanceId, 140).trim();
    if (/^artifact-[A-Za-z0-9_-]{8,128}$/.test(candidate)) persistentInstanceId = candidate;
  } catch (_) {}
  if (persistentInstanceId && !historyWasTruncated) {
    let persistentMatches = 0;
    for (let index = 0; index < limit && persistentMatches < 2; index += 1) {
      try {
        if (_safeMathText(safeArtifacts[index]?._artifactInstanceId, 140).trim() === persistentInstanceId) {
          persistentMatches += 1;
        }
      } catch (_) {}
    }
    if (persistentMatches <= 1) return `${baseId}::artifact:${persistentInstanceId}`;
  }
  let pinned = '';
  try {
    pinned = _safeMathText(artifact._mathResourceStateKey, 1000).trim();
  } catch (_) {}
  const issuedRuntimePin = pinned.startsWith(baseId + '::instance:')
    && _mathIssuedResourceInstanceKeys.has(pinned);
  const compatiblePersistentPin = pinned.startsWith(baseId + '::history:')
    || pinned.startsWith(baseId + '::detached:');
  if (!historyWasTruncated && pinned && (issuedRuntimePin || compatiblePersistentPin)) {
    let pinnedMatches = 0;
    for (let index = 0; index < limit && pinnedMatches < 2; index += 1) {
      try {
        if (_safeMathText(safeArtifacts[index]?._mathResourceStateKey, 1000).trim() === pinned) pinnedMatches += 1;
      } catch (_) {}
    }
    if (pinnedMatches <= 1) {
      if (issuedRuntimePin) _adoptMathResourceInstanceKey(artifact, pinned, baseId, safeArtifacts, limit);
      return pinned;
    }
  }
  const matchingArtifacts = [];
  for (let index = 0; index < limit; index += 1) {
    try {
      if (_isMathRecord(safeArtifacts[index]) && getMathResourceId(safeArtifacts[index]) === baseId) {
        matchingArtifacts.push(safeArtifacts[index]);
      }
    } catch (_) {}
  }
  let artifactData;
  try { artifactData = artifact.data; } catch (_) { artifactData = undefined; }
  let matchedArtifact = null;
  for (const candidate of matchingArtifacts) {
    if (candidate === artifact) {
      matchedArtifact = candidate;
      break;
    }
  }
  if (!matchedArtifact && artifactData) {
    for (const candidate of matchingArtifacts) {
      let candidateData;
      try { candidateData = candidate.data; } catch (_) { candidateData = undefined; }
      if (candidateData === artifactData) {
        matchedArtifact = candidate;
        break;
      }
    }
  }
  if (matchedArtifact) {
    const existingKey = _knownMathResourceInstanceKey(matchedArtifact, baseId, safeArtifacts, limit);
    if (matchingArtifacts.length > 1 || existingKey || historyWasTruncated) {
      return _mathResourceInstanceKey(matchedArtifact, baseId, safeArtifacts, limit);
    }
    return baseId;
  }
  const existingKey = _knownMathResourceInstanceKey(artifact, baseId, safeArtifacts, limit);
  if (matchingArtifacts.length > 0 || existingKey || historyWasTruncated) {
    return _mathResourceInstanceKey(artifact, baseId, safeArtifacts, limit);
  }
  return baseId;
};
const _safeMathWarn = (warnLog, ...args) => {
  try {
    if (typeof warnLog === 'function') warnLog(...args);
  } catch (_) {}
};
const _safeMathToast = (addToast, message, type) => {
  try {
    if (typeof addToast === 'function') addToast(message, type);
  } catch (_) {}
};
const _mathTranslation = (t, key, fallback) => {
  try {
    if (typeof t === 'function') return t(key) || fallback;
  } catch (_) {}
  return fallback;
};
const _ownMathValue = (record, key) => {
  try {
    return _isMathRecord(record) && Object.prototype.hasOwnProperty.call(record, key)
      ? record[key]
      : undefined;
  } catch (_) {
    return undefined;
  }
};

const _readMathValue = (record, key) => {
  try {
    return _isMathRecord(record) ? record[key] : undefined;
  } catch (_) {
    return undefined;
  }
};

const _mathProblemKey = (resourceId, problemIdx) => JSON.stringify([
  canonicalMathStateKey(resourceId, 'math'),
  _safeMathStateKey(problemIdx, 'problem')
]);

let _mathGlobalLifecycle = 0;
const _mathResourceLifecycle = new Map();
const _mathProblemLifecycle = new Map();

const _captureMathLifecycle = (resourceId, problemIdx) => {
  const resource = canonicalMathStateKey(resourceId, 'math');
  return {
    global: _mathGlobalLifecycle,
    resource: _mathResourceLifecycle.get(resource) || 0,
    problem: _mathProblemLifecycle.get(_mathProblemKey(resourceId, problemIdx)) || 0
  };
};

const _isCurrentMathLifecycle = (resourceId, problemIdx, token) => {
  if (!token) return false;
  const resource = canonicalMathStateKey(resourceId, 'math');
  return token.global === _mathGlobalLifecycle
    && token.resource === (_mathResourceLifecycle.get(resource) || 0)
    && token.problem === (_mathProblemLifecycle.get(_mathProblemKey(resourceId, problemIdx)) || 0);
};

const _mathRequestKey = (resourceId, problemIdx, token) => JSON.stringify([
  canonicalMathStateKey(resourceId, 'math'),
  _safeMathStateKey(problemIdx, 'problem'),
  token.global,
  token.resource,
  token.problem
]);

const _isMathRequestActive = (ledger, resourceId, problemIdx) => {
  try {
    const resourceKey = _safeMathStateKey(resourceId, 'math');
    const problemKey = _safeMathStateKey(problemIdx, 'problem');
    const token = _captureMathLifecycle(resourceKey, problemKey);
    return ledger.has(_mathRequestKey(resourceKey, problemKey, token));
  } catch (_) {
    return false;
  }
};
const isMathCheckRequestActive = (resourceId, problemIdx) =>
  _isMathRequestActive(_mathCheckInFlight, resourceId, problemIdx);
const isMathHintRequestActive = (resourceId, problemIdx) =>
  _isMathRequestActive(_mathHintInFlight, resourceId, problemIdx);

const invalidateMathProblemRequests = (resourceId, problemIdx) => {
  const key = _mathProblemKey(resourceId, problemIdx);
  _mathProblemLifecycle.set(key, (_mathProblemLifecycle.get(key) || 0) + 1);
  _mathXpAwardedKeys.delete(key);
  _mathHintUsageCounts.delete(key);
};

const invalidateMathResourceRequests = resourceId => {
  const resource = canonicalMathStateKey(resourceId, 'math');
  _mathResourceLifecycle.set(resource, (_mathResourceLifecycle.get(resource) || 0) + 1);
  for (const key of Array.from(_mathXpAwardedKeys)) {
    try {
      if (JSON.parse(key)[0] === resource) _mathXpAwardedKeys.delete(key);
    } catch (_) {}
  }
  for (const key of Array.from(_mathHintUsageCounts.keys())) {
    try {
      if (JSON.parse(key)[0] === resource) _mathHintUsageCounts.delete(key);
    } catch (_) {}
  }
};

const invalidateAllMathRequests = () => {
  _mathGlobalLifecycle += 1;
  _mathXpAwardedKeys.clear();
  _mathHintUsageCounts.clear();
};

const _gcdBigInt = (a, b) => {
  let left = a < 0n ? -a : a;
  let right = b < 0n ? -b : b;
  while (right) {
    const remainder = left % right;
    left = right;
    right = remainder;
  }
  return left || 1n;
};

const _normalizeRational = (numerator, denominator) => {
  if (denominator === 0n) return null;
  const sign = denominator < 0n ? -1n : 1n;
  const gcd = _gcdBigInt(numerator, denominator);
  return {
    numerator: (numerator / gcd) * sign,
    denominator: (denominator / gcd) * sign
  };
};

// Parse only a complete decimal/integer token. In particular, do not strip
// prose or operators: `I tried 4 + 2` must never become the number 42.
const _parseDecimalRational = (value) => {
  const text = String(value ?? '')
    .normalize('NFKC')
    .replace(/\u2212/g, '-')
    .trim();
  if (!text || text.length > 250) return null;
  const match = text.match(/^([+-]?)(?:(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d*))?|\.(\d+))$/);
  if (!match) return null;
  const integerPart = (match[2] || '0').replace(/,/g, '');
  const fractionPart = match[3] !== undefined ? match[3] : (match[4] || '');
  if ((integerPart.length + fractionPart.length) > 200) return null;
  const denominator = 10n ** BigInt(fractionPart.length);
  const sign = match[1] === '-' ? -1n : 1n;
  const numerator = sign * BigInt((integerPart + fractionPart) || '0');
  return _normalizeRational(numerator, denominator);
};

const _parseConservativeNumericAnswer = (value) => {
  const text = String(value ?? '')
    .normalize('NFKC')
    .replace(/[\u2212\u2013\u2014]/g, '-')
    .replace(/\u2044/g, '/')
    .trim();
  if (!text || text.length > 250) return null;
  const percentMatch = text.match(/^(.+?)\s*%$/);
  if (percentMatch) {
    const base = _parseDecimalRational(percentMatch[1]);
    return base ? _normalizeRational(base.numerator, base.denominator * 100n) : null;
  }
  const mixed = text.match(/^([+-]?)(\d{1,3}(?:,\d{3})+|\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) {
    const whole = BigInt(mixed[2].replace(/,/g, ''));
    const numerator = BigInt(mixed[3]);
    const denominator = BigInt(mixed[4]);
    if (denominator === 0n || numerator >= denominator) return null;
    const sign = mixed[1] === '-' ? -1n : 1n;
    return _normalizeRational(sign * ((whole * denominator) + numerator), denominator);
  }
  const slashParts = text.split('/');
  if (slashParts.length === 1) return _parseDecimalRational(text);
  if (slashParts.length !== 2) return null;
  const numerator = _parseDecimalRational(slashParts[0]);
  const denominator = _parseDecimalRational(slashParts[1]);
  if (!numerator || !denominator || denominator.numerator === 0n) return null;
  return _normalizeRational(
    numerator.numerator * denominator.denominator,
    numerator.denominator * denominator.numerator
  );
};

const _normalizeAnswerText = (value) => {
  let text;
  try {
    text = String(value ?? '')
      .normalize('NFKC')
      .replace(/[\u2212\u2013\u2014]/g, '-')
      .trim();
  } catch (_) {
    return '';
  }
  if (text.startsWith('$$') && text.endsWith('$$') && text.length > 4) {
    text = text.slice(2, -2).trim();
  } else if (text.startsWith('\\[') && text.endsWith('\\]')) {
    text = text.slice(2, -2).trim();
  } else if (text.startsWith('\\(') && text.endsWith('\\)')) {
    text = text.slice(2, -2).trim();
  } else if (text.length > 2 && text.startsWith('$') && text.endsWith('$')) {
    text = text.slice(1, -1).trim();
  }
  const fracPattern = /\\(?:dfrac|tfrac|frac)\s*\{\s*([+-]?(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d*)?|\.\d+))\s*\}\s*\{\s*([+-]?(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d*)?|\.\d+))\s*\}/gi;
  text = text.replace(fracPattern, (match, numerator, denominator, offset, source) => {
    const preceding = source.slice(0, offset).trimEnd().slice(-1);
    return /\d/.test(preceding) ? ` ${numerator}/${denominator}` : `${numerator}/${denominator}`;
  });
  return text
    .replace(/\s*=\s*/g, '=')
    .replace(/\s+/g, ' ')
    .toLowerCase();
};

const _simpleAssignment = text => {
  const match = text.match(/^([a-z])\s*=\s*(.+)$/i);
  if (!match || match[2].includes('=')) return null;
  const rhs = match[2].trim();
  return rhs ? { variable: match[1].toLowerCase(), rhs } : null;
};

const areMathAnswersEquivalent = (studentAnswer, correctAnswer) => {
  let studentText = _normalizeAnswerText(studentAnswer);
  let correctText = _normalizeAnswerText(correctAnswer);
  if (!studentText || !correctText) return false;
  if (studentText === correctText) return true;
  const studentAssigned = _simpleAssignment(studentText);
  const correctAssigned = _simpleAssignment(correctText);
  if (!!studentAssigned !== !!correctAssigned) {
    studentText = studentAssigned?.rhs || studentText;
    correctText = correctAssigned?.rhs || correctText;
  } else if (studentAssigned || correctAssigned) {
    if (studentAssigned.variable !== correctAssigned.variable) return false;
    studentText = studentAssigned.rhs;
    correctText = correctAssigned.rhs;
  }
  const studentNumber = _parseConservativeNumericAnswer(studentText);
  const correctNumber = _parseConservativeNumericAnswer(correctText);
  return !!studentNumber && !!correctNumber
    && studentNumber.numerator === correctNumber.numerator
    && studentNumber.denominator === correctNumber.denominator;
};

const gradeMathSelfAssessment = (problems, answers) => {
  let source = [];
  try {
    if (Array.isArray(problems)) source = problems;
  } catch (_) {}
  const answerMap = _isMathRecord(answers) ? answers : {};
  let results = [];
  try {
    results = source.flatMap((problem, sourceIndex) => {
      if (!_isMathRecord(problem)) return [];
      const problemId = _safeMathText(
        _readMathValue(problem, '__viewKey')
          ?? _readMathValue(problem, 'id')
          ?? _readMathValue(problem, 'problemId')
          ?? sourceIndex,
        500
      );
      const rawResponse = _ownMathValue(answerMap, problemId) ?? '';
      const response = _safeMathText(rawResponse, 2000);
      const expected = _readMathValue(problem, 'answer') ?? _readMathValue(problem, 'correct_answer') ?? '';
      return [{
        problemId,
        question: _safeMathText(
          _readMathValue(problem, 'question') ?? _readMathValue(problem, 'problem') ?? '',
          2000
        ),
        response,
        correct: areMathAnswersEquivalent(rawResponse, expected)
      }];
    });
  } catch (_) {
    results = [];
  }
  const score = results.reduce((sum, result) => sum + (result.correct ? 1 : 0), 0);
  const total = results.length;
  return {
    score,
    total,
    percentage: total ? Math.round((score / total) * 100) : 0,
    answers: Object.fromEntries(results.map(result => [result.problemId, result.response])),
    results
  };
};

const _legacyHintKey = (resourceId, problemIdx) =>
  `${_safeMathStateKey(resourceId, 'math')}_${_safeMathStateKey(problemIdx, 'problem')}`;

const _looksLikeHintEntry = value => _isMathRecord(value) && (
  Array.isArray(value.hints)
  || typeof value.loading === 'boolean'
  || ['number', 'string'].includes(typeof value.count)
);

const _rawHintEntry = (state, resourceId, problemIdx) => {
  if (!_isMathRecord(state)) return null;
  const resource = _safeMathStateKey(resourceId, 'math');
  const problem = _safeMathStateKey(problemIdx, 'problem');
  const resourceValue = _ownMathValue(state, resource);
  if (_isMathRecord(resourceValue) && !_looksLikeHintEntry(resourceValue)) {
    const nestedValue = _ownMathValue(resourceValue, problem);
    if (_isMathRecord(nestedValue)) return nestedValue;
  }
  const legacyValue = _ownMathValue(state, _legacyHintKey(resourceId, problemIdx));
  return _isMathRecord(legacyValue) ? legacyValue : null;
};

const _normalizeHintEntry = raw => {
  const hints = (Array.isArray(raw?.hints) ? raw.hints : [])
    .filter(value => typeof value === 'string')
    .map(value => value.trim().slice(0, 1000))
    .filter(Boolean)
    .slice(0, 3);
  const declared = Number(raw?.count);
  const count = Math.max(hints.length, Number.isFinite(declared) ? Math.floor(declared) : 0);
  return {
    hints,
    count: Math.max(0, Math.min(3, count)),
    loading: raw?.loading === true
  };
};

const _hintCount = (mathHintData, resourceId, problemIdx) => {
  const key = _mathProblemKey(resourceId, problemIdx);
  const stored = _normalizeHintEntry(_rawHintEntry(mathHintData, resourceId, problemIdx)).count;
  const count = Math.max(stored, _mathHintUsageCounts.get(key) || 0);
  _mathHintUsageCounts.set(key, count);
  return count;
};

const _withHintEntry = (state, resourceId, problemIdx, create) => {
  const root = _isMathRecord(state) ? state : {};
  const resource = _safeMathStateKey(resourceId, 'math');
  const problem = _safeMathStateKey(problemIdx, 'problem');
  const existingResource = _ownMathValue(root, resource);
  const nested = _isMathRecord(existingResource) && !_looksLikeHintEntry(existingResource)
    ? existingResource
    : {};
  const previous = _normalizeHintEntry(_rawHintEntry(root, resourceId, problemIdx));
  return {
    ...root,
    [resource]: {
      ...nested,
      [problem]: create(previous)
    }
  };
};

const _awardMathXpOnce = async ({ resourceId, problemIdx, score, hintsUsed, alreadyAwarded, handleScoreUpdate, warnLog }) => {
  const requestKey = _mathProblemKey(resourceId, problemIdx);
  if (alreadyAwarded || _mathXpAwardedKeys.has(requestKey)) {
    _mathXpAwardedKeys.add(requestKey);
    return { xpAwarded: true, xpEarned: 0 };
  }
  const safeScore = Number(score);
  const safeHints = Number(hintsUsed);
  if (!Number.isFinite(safeScore) || safeScore <= 0 || typeof handleScoreUpdate !== 'function') {
    return { xpAwarded: false, xpEarned: 0 };
  }
  const boundedScore = Math.min(100, safeScore);
  const boundedHints = Number.isFinite(safeHints) ? Math.max(0, Math.min(3, Math.floor(safeHints))) : 0;
  const xpEarned = Math.max(0, Math.round((boundedScore / 10) * Math.max(0.25, 1 - boundedHints * 0.25)));
  if (!xpEarned) return { xpAwarded: false, xpEarned: 0 };
  // Reserve before awaiting so a second invocation cannot race the callback.
  _mathXpAwardedKeys.add(requestKey);
  try {
    await Promise.resolve(handleScoreUpdate(xpEarned, 'Math Problem', resourceId));
    return { xpAwarded: true, xpEarned };
  } catch (error) {
    _mathXpAwardedKeys.delete(requestKey);
    _safeMathWarn(warnLog, 'Math XP award failed:', error);
    return { xpAwarded: false, xpEarned: 0 };
  }
};

const _callMathAi = async (callGemini, prompt, jsonMode, deps = {}) => {
  if (typeof callGemini !== 'function') throw new Error('Math AI service is unavailable');
  const configuredTimeout = Number(deps.mathRequestTimeoutMs);
  const timeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout > 0
    ? Math.max(1, Math.min(120000, Math.floor(configuredTimeout)))
    : 45000;
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  let timer = null;
  const timeout = new Promise((resolve, reject) => {
    timer = setTimeout(() => {
      try { controller?.abort(); } catch (_) {}
      const error = new Error('Math request timed out');
      error.name = 'TimeoutError';
      reject(error);
    }, timeoutMs);
  });
  try {
    let request;
    try {
      request = Promise.resolve(callGemini(prompt, jsonMode, false, null, null, controller?.signal || null));
    } catch (error) {
      request = Promise.reject(error);
    }
    return await Promise.race([request, timeout]);
  } finally {
    if (timer != null) clearTimeout(timer);
  }
};

const _parseMathEvaluation = (result) => {
  if (typeof result !== 'string') throw new Error('Evaluation response was not text');
  const cleaned = result.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (parseErr) {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Could not parse evaluation response');
    parsed = JSON.parse(jsonMatch[0]);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Evaluation response must be an object');
  }
  const verdict = typeof parsed.verdict === 'string' ? parsed.verdict.trim().toLowerCase() : '';
  if (!['correct', 'partial', 'incorrect'].includes(verdict)) {
    throw new Error('Evaluation response had an invalid verdict');
  }
  if (typeof parsed.score !== 'number' || !Number.isFinite(parsed.score) || parsed.score < 0 || parsed.score > 100) {
    throw new Error('Evaluation response had an invalid score');
  }
  // Keep the categorical verdict and numeric credit mutually consistent. A
  // correct response receives full credit, an incorrect response receives no
  // credit, and partial credit stays strictly between those endpoints. Model
  // output that contradicts itself is untrusted and must fail closed rather
  // than awarding XP from one field while rendering the other.
  const scoreIsConsistent = verdict === 'correct'
    ? parsed.score === 100
    : verdict === 'incorrect'
      ? parsed.score === 0
      : parsed.score > 0 && parsed.score < 100;
  if (!scoreIsConsistent) {
    throw new Error('Evaluation response had an inconsistent verdict and score');
  }
  if (typeof parsed.feedback !== 'string' || !parsed.feedback.trim()) {
    throw new Error('Evaluation response had invalid feedback');
  }
  return { verdict, score: parsed.score, feedback: parsed.feedback.trim().slice(0, 2000) };
};

const _handleCheckMathWorkCore = async (resourceId, problemIdx, question, correctAnswer, steps, studentWork, deps = {}) => {
  const { mathCheckResults = {}, mathHintData = {}, setMathCheckResults, addToast, t, callGemini, warnLog, handleScoreUpdate } = deps;
  try { if (window._DEBUG_MATH_HELPERS) console.log("[MathHelpers] handleCheckMathWork fired"); } catch(_) {}
      const trimmedStudentWork = studentWork.trim();
      if (!trimmedStudentWork) {
          addToast('Please enter an answer before checking!', 'info');
          return;
      }
      const existing = mathCheckResults[resourceId]?.[problemIdx];
      const currentHintCount = _hintCount(mathHintData, resourceId, problemIdx);
      if (areMathAnswersEquivalent(studentWork, correctAnswer)) {
        const award = await _awardMathXpOnce({
            resourceId,
            problemIdx,
            score: 100,
            hintsUsed: currentHintCount,
            alreadyAwarded: !!existing?.xpAwarded,
            handleScoreUpdate,
            warnLog
        });
        setMathCheckResults(prev => {
            const previous = prev?.[resourceId]?.[problemIdx] || {};
            return {
                ...(prev || {}),
                [resourceId]: {
                    ...(prev?.[resourceId] || {}),
                    [problemIdx]: { ...previous, checking: false, verdict: 'correct', score: 100, feedback: 'Perfect! Your answer is exactly right. ✅', checked: true, hintsUsed: currentHintCount, xpAwarded: !!previous.xpAwarded || award.xpAwarded, xpEarned: award.xpEarned, fastPath: true }
                }
            };
        });
        addToast(t('math.check.correct') || 'Correct! Great work! 🎉', 'success');
        return;
      }
      setMathCheckResults(prev => {
          const previous = prev?.[resourceId]?.[problemIdx] || {};
          return {
              ...(prev || {}),
              [resourceId]: {
                  ...(prev?.[resourceId] || {}),
                  [problemIdx]: { ...previous, checking: true, verdict: null, score: 0, feedback: '', checked: false, xpAwarded: !!previous.xpAwarded || _mathXpAwardedKeys.has(_mathProblemKey(resourceId, problemIdx)), xpEarned: 0, fastPath: false }
              }
          };
      });
      try {
          const stepsText = (steps || []).map((s, i) => `Step ${i+1}: ${s.explanation}${s.latex ? ' (' + s.latex + ')' : ''}`).join('\n');
          const prompt = `You are a patient, encouraging math teacher evaluating a student's work.
PROBLEM: ${question}
CORRECT ANSWER: ${correctAnswer}
${stepsText ? 'SOLUTION STEPS:\n' + stepsText : ''}
STUDENT'S RESPONSE:
${studentWork}
Evaluate the student's work. Consider:
1. Is the final answer correct or close?
2. Did the student show reasonable work/reasoning?
3. Are there any conceptual misunderstandings?
Return ONLY valid JSON:
{
  "verdict": "correct" | "partial" | "incorrect",
  "score": <number 0-100>,
  "feedback": "<2-3 sentences of encouraging, specific feedback. If incorrect, hint at the right approach without giving the answer. If partial, acknowledge what's right and guide toward completion.>"
}`;
          const { verdict, score, feedback } = _parseMathEvaluation(await callGemini(prompt, true));
          const latestHintCount = _hintCount(mathHintData, resourceId, problemIdx);
          const award = await _awardMathXpOnce({
              resourceId,
              problemIdx,
              score,
              hintsUsed: latestHintCount,
              alreadyAwarded: !!existing?.xpAwarded,
              handleScoreUpdate,
              warnLog
          });
          setMathCheckResults(prev => {
              const previous = prev?.[resourceId]?.[problemIdx] || {};
              return {
                  ...(prev || {}),
                  [resourceId]: {
                      ...(prev?.[resourceId] || {}),
                      [problemIdx]: { ...previous, checking: false, verdict, score, feedback, checked: true, hintsUsed: latestHintCount, xpAwarded: !!previous.xpAwarded || award.xpAwarded, xpEarned: award.xpEarned, fastPath: false }
                  }
              };
          });
          // XP calculation and commitment are handled atomically above.
          const toastMsg = verdict === 'correct' ? (t('math.check.correct') || 'Excellent work! ✨')
              : verdict === 'partial' ? (t('math.check.partial') || 'Good effort, keep going! 🟡')
              : (t('math.check.incorrect') || 'Not quite right — try again! 💪');
          addToast(toastMsg, verdict === 'correct' ? 'success' : verdict === 'partial' ? 'info' : 'warning');
      } catch (err) {
          warnLog("Math check failed:", err);
          setMathCheckResults(prev => {
              const previous = prev?.[resourceId]?.[problemIdx] || {};
              return {
                  ...(prev || {}),
                  [resourceId]: {
                      ...(prev?.[resourceId] || {}),
                      [problemIdx]: { ...previous, checking: false, verdict: 'error', score: 0, feedback: t('math.check.error') || 'Could not evaluate — please try again.', checked: false, xpAwarded: !!previous.xpAwarded || _mathXpAwardedKeys.has(_mathProblemKey(resourceId, problemIdx)), xpEarned: 0, fastPath: false }
                  }
              };
          });
          addToast(t('math.check.error') || 'Evaluation failed — try again', 'error');
      }
};

const handleCheckMathWork = async (resourceId, problemIdx, question, correctAnswer, steps, studentWork, deps = {}) => {
  const safeDeps = _isMathRecord(deps) ? deps : {};
  const resourceKey = _safeMathStateKey(resourceId, 'math');
  const problemKey = _safeMathStateKey(problemIdx, 'problem');
  if (typeof safeDeps.setMathCheckResults !== 'function') {
    _safeMathToast(safeDeps.addToast, 'Math grading is unavailable right now.', 'error');
    return;
  }
  const token = _captureMathLifecycle(resourceKey, problemKey);
  const requestKey = _mathRequestKey(resourceKey, problemKey, token);
  if (_mathCheckInFlight.has(requestKey)) return;
  _mathCheckInFlight.add(requestKey);
  const isCurrent = () => _isCurrentMathLifecycle(resourceKey, problemKey, token);
  const guardedSetMathCheckResults = update => {
    if (!isCurrent()) return;
    return safeDeps.setMathCheckResults(previous => {
      if (!isCurrent()) return previous;
      return typeof update === 'function' ? update(previous) : update;
    });
  };
  const guardedToast = (message, type) => {
    if (isCurrent()) _safeMathToast(safeDeps.addToast, message, type);
  };
  const guardedScoreUpdate = typeof safeDeps.handleScoreUpdate === 'function'
    ? (...args) => {
        if (!isCurrent()) {
          const error = new Error('Math grading request was invalidated');
          error.name = 'AbortError';
          return Promise.reject(error);
        }
        return safeDeps.handleScoreUpdate(...args);
      }
    : undefined;
  const normalizedSteps = (Array.isArray(steps) ? steps : [])
    .filter(_isMathRecord)
    .map(step => ({
      explanation: _safeMathText(step.explanation, 2000),
      latex: _safeMathText(step.latex, 2000)
    }));
  try {
    return await _handleCheckMathWorkCore(
      resourceKey,
      problemKey,
      _safeMathText(question, 4000),
      _safeMathText(correctAnswer, 2000),
      normalizedSteps,
      _safeMathText(studentWork, 12000),
      {
        ...safeDeps,
        mathCheckResults: _isMathRecord(safeDeps.mathCheckResults) ? safeDeps.mathCheckResults : {},
        mathHintData: _isMathRecord(safeDeps.mathHintData) ? safeDeps.mathHintData : {},
        setMathCheckResults: guardedSetMathCheckResults,
        addToast: guardedToast,
        t: key => _mathTranslation(safeDeps.t, key, ''),
        warnLog: (...args) => _safeMathWarn(safeDeps.warnLog, ...args),
        handleScoreUpdate: guardedScoreUpdate,
        callGemini: (prompt, jsonMode) => _callMathAi(safeDeps.callGemini, prompt, jsonMode, safeDeps)
      }
    );
  } catch (error) {
    _safeMathWarn(safeDeps.warnLog, 'Math grading could not start:', error);
    if (isCurrent()) _safeMathToast(safeDeps.addToast, 'Math grading is unavailable right now.', 'error');
  } finally {
    _mathCheckInFlight.delete(requestKey);
  }
};

const _handleGetMathHintCore = async (resourceId, problemIdx, question, correctAnswer, steps, deps = {}) => {
  const { mathHintData = {}, studentResponses = {}, setMathHintData, addToast, callGemini, warnLog } = deps;
  try { if (window._DEBUG_MATH_HELPERS) console.log("[MathHelpers] handleGetMathHint fired"); } catch(_) {}
    const existing = _normalizeHintEntry(_rawHintEntry(mathHintData, resourceId, problemIdx));
    if (existing.count >= 3) {
        setMathHintData(prev => _withHintEntry(prev, resourceId, problemIdx, latest => ({ ...latest, loading: false })));
        return;
    }
    setMathHintData(prev => _withHintEntry(prev, resourceId, problemIdx, latest => ({ ...latest, loading: true })));
    try {
        const hintLevel = existing.count + 1;
        const prevHints = existing.hints.map((h, i) => `Hint ${i + 1}: ${h}`).join('\n');
        const studentWork = _safeMathText(_ownMathValue(_ownMathValue(studentResponses, resourceId), problemIdx), 4000);
        const prompt = `You are a patient math tutor giving a hint for a problem.
PROBLEM: ${question}
CORRECT ANSWER: ${correctAnswer}
${steps ? 'SOLUTION STEPS:\n' + steps.map((s, i) => 'Step ' + (i + 1) + ': ' + s.explanation).join('\n') : ''}
${studentWork ? 'STUDENT WORK SO FAR: ' + studentWork : 'Student has not started yet.'}
${prevHints ? 'PREVIOUS HINTS GIVEN:\n' + prevHints : ''}
Give HINT #${hintLevel} of 3 (progressive difficulty):
- Hint 1: A gentle nudge about what strategy or concept to use. Do NOT reveal numbers or the answer.
- Hint 2: More specific guidance — point to the key step or operation needed. Still don't give the answer.
- Hint 3: Walk through the first step explicitly and set up the equation. Stop just before the final answer.
Return ONLY the hint text as a single paragraph (no JSON, no markdown). Keep it under 2 sentences. Be encouraging.`;
        const hintText = await callGemini(prompt, true);
        if (typeof hintText !== 'string') throw new Error('Hint response was not text');
        const cleanHint = hintText.replace(/```/g, '').replace(/^["']|["']$/g, '').trim().slice(0, 1000);
        if (!cleanHint) throw new Error('Hint response was empty');
        const deliveredCount = Math.min(3, existing.count + 1);
        setMathHintData(prev => _withHintEntry(prev, resourceId, problemIdx, latest => {
            if (latest.count >= 3) return { ...latest, loading: false };
            const hints = [...latest.hints, cleanHint].slice(0, 3);
            return {
                hints,
                loading: false,
                count: Math.max(hints.length, Math.min(3, latest.count + 1))
            };
        }));
        const usageKey = _mathProblemKey(resourceId, problemIdx);
        _mathHintUsageCounts.set(usageKey, Math.max(_mathHintUsageCounts.get(usageKey) || 0, deliveredCount));
        addToast(existing.count === 0 ? 'Hint unlocked! 💡 (-25% max XP)' : existing.count === 1 ? 'Second hint! 💡 (-50% max XP)' : 'Final hint! 💡 (-75% max XP)', 'info');
    } catch (err) {
        warnLog("Hint generation failed:", err);
        setMathHintData(prev => _withHintEntry(prev, resourceId, problemIdx, latest => ({ ...latest, loading: false })));
        addToast('Could not generate hint — try again', 'error');
    }
};

const handleGetMathHint = async (resourceId, problemIdx, question, correctAnswer, steps, deps = {}) => {
  const safeDeps = _isMathRecord(deps) ? deps : {};
  const resourceKey = _safeMathStateKey(resourceId, 'math');
  const problemKey = _safeMathStateKey(problemIdx, 'problem');
  if (typeof safeDeps.setMathHintData !== 'function') {
    _safeMathToast(safeDeps.addToast, 'Math hints are unavailable right now.', 'error');
    return;
  }
  const token = _captureMathLifecycle(resourceKey, problemKey);
  const requestKey = _mathRequestKey(resourceKey, problemKey, token);
  if (_mathHintInFlight.has(requestKey)) return;
  _mathHintInFlight.add(requestKey);
  const isCurrent = () => _isCurrentMathLifecycle(resourceKey, problemKey, token);
  const guardedSetMathHintData = update => {
    if (!isCurrent()) return;
    return safeDeps.setMathHintData(previous => {
      if (!isCurrent()) return previous;
      return typeof update === 'function' ? update(previous) : update;
    });
  };
  const guardedToast = (message, type) => {
    if (isCurrent()) _safeMathToast(safeDeps.addToast, message, type);
  };
  const normalizedSteps = (Array.isArray(steps) ? steps : [])
    .filter(_isMathRecord)
    .map(step => ({
      explanation: _safeMathText(step.explanation, 2000),
      latex: _safeMathText(step.latex, 2000)
    }));
  try {
    return await _handleGetMathHintCore(
      resourceKey,
      problemKey,
      _safeMathText(question, 4000),
      _safeMathText(correctAnswer, 2000),
      normalizedSteps,
      {
        ...safeDeps,
        mathHintData: _isMathRecord(safeDeps.mathHintData) ? safeDeps.mathHintData : {},
        studentResponses: _isMathRecord(safeDeps.studentResponses) ? safeDeps.studentResponses : {},
        setMathHintData: guardedSetMathHintData,
        addToast: guardedToast,
        warnLog: (...args) => _safeMathWarn(safeDeps.warnLog, ...args),
        callGemini: (prompt, jsonMode) => _callMathAi(safeDeps.callGemini, prompt, jsonMode, safeDeps)
      }
    );
  } catch (error) {
    _safeMathWarn(safeDeps.warnLog, 'Math hint request could not start:', error);
    if (isCurrent()) _safeMathToast(safeDeps.addToast, 'Math hints are unavailable right now.', 'error');
  } finally {
    _mathHintInFlight.delete(requestKey);
  }
};

const _stableMathProblemId = (resourceId, problem, problemIdx, salt = '') => {
  const seed = [
    String(resourceId ?? 'math'),
    String(problemIdx),
    String(problem?.question ?? ''),
    String(problem?.expression ?? ''),
    String(problem?.answer ?? ''),
    String(salt)
  ].join('|');
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `math-problem-${(hash >>> 0).toString(36)}`;
};

const handleMathEdit = async (editInstruction, deps) => {
  const safeDeps = _isMathRecord(deps) ? deps : {};
  const { generatedContent, history, mathResourceId, leveledTextLanguage, translationMode, resolveTranslationPolicy, currentUiLanguage, gradeLevel, mathSubject, setIsMathEditingChat, setGeneratedContent, setHistory, setMathEditInput, callGemini, cleanJson, safeJsonParse, addToast, warnLog, onMathProblemsChanged } = safeDeps;
  const instruction = _safeMathText(editInstruction, 2000).trim();
  const capturedContent = generatedContent;
  if (!instruction || !Array.isArray(capturedContent?.data?.problems)) return;
  const suppliedResourceId = _safeMathText(mathResourceId, 1000).trim();
  const capturedResourceId = suppliedResourceId || getMathResourceInstanceId(capturedContent, history);
  const editScope = 'full-set-edit';
  const lifecycleToken = _captureMathLifecycle(capturedResourceId, editScope);
  const requestKey = _mathRequestKey(capturedResourceId, editScope, lifecycleToken);
  if (_mathEditInFlight.has(requestKey)) return;
  _mathEditInFlight.add(requestKey);
  const isCurrent = () => _isCurrentMathLifecycle(capturedResourceId, editScope, lifecycleToken);
  const matchesCapturedResource = candidate => {
    if (!_isMathRecord(candidate)) return false;
    if (candidate === capturedContent) return true;
    return getMathResourceInstanceId(candidate, history) === capturedResourceId;
  };
  const setEditBusy = value => {
    try {
      if (typeof setIsMathEditingChat === 'function') setIsMathEditingChat(value);
    } catch (error) {
      _safeMathWarn(warnLog, 'Math edit busy state could not be updated:', error);
    }
  };
  // Resolved once from the host-threaded policy. Falls back to the historical
  // rule (gloss into English when the content is not English) if an older host
  // has not threaded the resolver yet, so a stale CDN never silently changes
  // what teachers get.
  const _xlate = (typeof resolveTranslationPolicy === 'function')
    ? resolveTranslationPolicy(translationMode, leveledTextLanguage, currentUiLanguage)
    : { enabled: !!leveledTextLanguage && leveledTextLanguage !== 'English' && leveledTextLanguage !== 'All Selected Languages', target: 'English', mode: 'auto' };
  try { if (window._DEBUG_MATH_HELPERS) console.log("[MathHelpers] handleMathEdit fired"); } catch(_) {}
      setEditBusy(true);
      try {
          const currentProblems = capturedContent.data.problems.map((p, i) =>
              `Problem ${i+1} [${p.taskType || 'simplify'}]: ${p.question} (Answer: ${p.answer})`
          ).join("\n");
          const prompt = `
              You are an Expert Math Curriculum Designer.
              ${leveledTextLanguage && leveledTextLanguage !== 'English' ? 'IMPORTANT: Generate ALL text content (questions, explanations, steps, real-world applications) in ' + leveledTextLanguage + '.' + (_xlate.enabled ? ' After each text field, include a ' + _xlate.target + ' translation in parentheses.' : ' Do NOT add a translation in parentheses or anywhere else.') + ' Keep mathematical expressions and JSON keys in English.' : ''}
              A teacher has an existing problem set and wants to modify it.

              CURRENT PROBLEMS (the [bracket] tag is the taskType — preserve unless edit specifically changes the action):
              ${currentProblems}

              TEACHER'S EDIT REQUEST: "${instruction}"
              Grade Level: ${gradeLevel}
              Subject: ${mathSubject}

              INSTRUCTIONS:
              Apply the teacher's requested changes to the problem set.
              This may include: making problems easier/harder, adding more problems,
              changing topics, adjusting difficulty, adding specific problem types,
              changing the theme/context, or any other modification.
              Keep problems the teacher didn't mention unchanged unless the edit applies to all.
              The "question" field must NOT include a leading directive verb (no "Simplify:" / "Solve:") — the renderer prepends it from taskType.

              Return ONLY the MODIFIED problem set as JSON:
              {
                "title": "Modified Problem Set",
                "problems": [
                  {
                    "question": "Problem text without leading directive...",
                    "taskType": "simplify | solve | evaluate | factor | graph | compute | word_problem | prove | convert",
                    "expression": "Math expression",
                    "answer": "The answer",
                    "steps": [{ "explanation": "Clear step-by-step explanation", "latex": "Math expression" }],
                    "realWorld": "1-2 sentence real-life connection — name a specific career or situation, NOT a word problem restatement"
                  }
                ],
                "graphData": null
              }
          `;
          const result = await _callMathAi(callGemini, prompt, true, safeDeps);
          if (!isCurrent()) return;
          let cleaned = cleanJson(result);
          let rawContent = safeJsonParse(result);
          if (!rawContent) {
            try { rawContent = JSON.parse(cleaned); } catch (_) {}
          }
          if (!rawContent) {
            const jsonMatch = result.match(/[\[{][\s\S]*[\]}]/);
            if (jsonMatch) {
              const extracted = jsonMatch[0];
              if (typeof window !== 'undefined' && window.jsonrepair) {
                try { rawContent = JSON.parse(window.jsonrepair(extracted)); } catch (_) {}
              }
              if (!rawContent) {
                try { rawContent = JSON.parse(extracted); } catch (_) {}
              }
            }
          }
          if (!rawContent) throw new Error("Parse failed after all strategies");
          const normalizeSteps = (steps) => {
              if (!Array.isArray(steps)) return [];
              return steps.map(s => typeof s === "string" ? { explanation: s, latex: "" } : s);
          };
          const VALID_TT = new Set(['simplify','solve','evaluate','factor','graph','compute','word_problem','prove','convert']);
          const normTaskType = (raw, fallback) => {
              const t = (raw || '').toString().trim().toLowerCase();
              if (VALID_TT.has(t)) return t;
              return VALID_TT.has(fallback) ? fallback : 'simplify';
          };
          if (!Array.isArray(rawContent.problems)) throw new Error('Edited problem set did not contain a problems array');
          const usedProblemIds = new Set();
          const normalizedProblems = rawContent.problems.map((problem, problemIdx) => {
              if (!problem || typeof problem !== 'object' || Array.isArray(problem)) {
                  throw new Error('Edited problem set contained an invalid problem');
              }
              const previousProblem = capturedContent.data.problems?.[problemIdx];
              const suppliedId = typeof problem.id === 'string' && problem.id.trim() ? problem.id.trim() : '';
              const previousId = typeof previousProblem?.id === 'string' && previousProblem.id.trim() ? previousProblem.id.trim() : '';
              let id = suppliedId || previousId || _stableMathProblemId(capturedResourceId, problem, problemIdx);
              let collision = 1;
              while (usedProblemIds.has(id)) {
                  id = _stableMathProblemId(capturedResourceId, problem, problemIdx, collision);
                  collision += 1;
              }
              usedProblemIds.add(id);
              return {
                  ...problem,
                  id,
                  taskType: normTaskType(problem.taskType, previousProblem?.taskType),
                  steps: normalizeSteps(problem.steps)
              };
          });
          const safeRawContent = Object.fromEntries(
              Object.entries(rawContent).filter(([key]) => !['__proto__', 'prototype', 'constructor'].includes(key))
          );
          const normalizedTitle = typeof safeRawContent.title === 'string' && safeRawContent.title.trim()
              ? safeRawContent.title
              : (capturedContent.data.title || 'Modified Problems');
          const normalizedGraphAlt = typeof safeRawContent.graphAlt === 'string'
              ? safeRawContent.graphAlt
              : (capturedContent.data.graphAlt ?? null);
          const normalizedContent = {
              ...capturedContent.data,
              ...safeRawContent,
              title: normalizedTitle,
              problems: normalizedProblems,
              graphData: safeRawContent.graphData ?? capturedContent.data.graphData ?? null,
              graphAlt: normalizedGraphAlt
          };
          if (!isCurrent()) return;
          if (typeof setGeneratedContent !== 'function') {
              throw new Error('Math content state is unavailable');
          }
          setGeneratedContent(previousContent => (
              matchesCapturedResource(previousContent)
                  ? { ...previousContent, _mathResourceStateKey: capturedResourceId, data: normalizedContent }
                  : previousContent
          ));
          if (typeof setHistory === 'function') {
              setHistory(previousHistory => {
                  if (!Array.isArray(previousHistory)) return previousHistory;
                  const identityIndex = previousHistory.indexOf(capturedContent);
                  const targetIndex = identityIndex >= 0
                      ? identityIndex
                      : previousHistory.findIndex(matchesCapturedResource);
                  if (targetIndex < 0) return previousHistory;
                  const nextHistory = previousHistory.slice();
                  nextHistory[targetIndex] = {
                      ...previousHistory[targetIndex],
                      _mathResourceStateKey: capturedResourceId,
                      data: normalizedContent
                  };
                  return nextHistory;
              });
          }
          invalidateMathResourceRequests(capturedResourceId);
          if (typeof onMathProblemsChanged === 'function') {
              try {
                  onMathProblemsChanged(capturedResourceId);
              } catch (callbackError) {
                  _safeMathWarn(warnLog, 'Math problem state invalidation failed:', callbackError);
              }
          }
          _safeMathToast(addToast, `✏️ Problems updated: "${instruction.substring(0, 40)}..."`, 'success');
          try {
              if (typeof setMathEditInput === 'function') setMathEditInput('');
          } catch (inputError) {
              _safeMathWarn(warnLog, 'Math edit input could not be cleared:', inputError);
          }
      } catch (e) {
          if (isCurrent()) {
              _safeMathWarn(warnLog, 'Math Edit Error:', e);
              _safeMathToast(addToast, 'Failed to modify problems — try rephrasing your request', 'error');
          }
      } finally {
          _mathEditInFlight.delete(requestKey);
          if (_mathEditInFlight.size === 0) setEditBusy(false);
      }
};

const handleGenerateSimilar = async (deps) => {
  const { generatedContent, setIsProcessing, setMathInput, addToast, t, callGemini, warnLog, handleGenerateMath } = deps;
  try { if (window._DEBUG_MATH_HELPERS) console.log("[MathHelpers] handleGenerateSimilar fired"); } catch(_) {}
      const firstProblem = generatedContent?.data?.problems?.[0]?.question;
      if (!firstProblem) return;
      setIsProcessing(true);
      addToast(t('math.creating_variation'), "info");
      try {
          const prompt = `
            Create a single new math problem that is a variation of this one with different numbers.
            Keep the difficulty and concept identical.
            Original Problem: "${firstProblem}",
            Return ONLY the raw text of the new problem. No intro/outro.
          `;
          const newProblem = await callGemini(prompt);
          const cleanProblem = newProblem.trim();
          setMathInput(cleanProblem);
          await handleGenerateMath(cleanProblem);
      } catch (e) {
          warnLog("Similar Problem Error:", e);
          addToast(t('math.error_variation'), "error");
          setIsProcessing(false);
      }
};

const handleGenerateOutcome = async (deps) => {
  const { generatedContent, setIsProcessing, setGenerationStep, setError, addToast, t, callGemini, warnLog, handleAddToMapList } = deps;
  try { if (window._DEBUG_MATH_HELPERS) console.log("[MathHelpers] handleGenerateOutcome fired"); } catch(_) {}
      if (!generatedContent || generatedContent.type !== 'outline') return;
      const branches = generatedContent?.data?.branches || [];
      const problems = branches.filter(b => b.title.toLowerCase().includes('problem') || b.title.toLowerCase().includes('challenge'));
      const solutions = branches.filter(b => !b.title.toLowerCase().includes('problem') && !b.title.toLowerCase().includes('challenge') && !b.title.toLowerCase().includes('outcome'));
      const problemText = problems.map(b => `${b.title}: ${b.items.join(', ')}`).join('\n');
      const solutionText = solutions.map(b => `Solution: ${b.title} (${b.items.join(', ')})`).join('\n');
      if (!problemText && !solutionText) {
          addToast(t('errors.no_context_for_outcome'), "error");
          return;
      }
      setIsProcessing(true);
      setGenerationStep("Analyzing solutions & generating outcome...");
      const prompt = `
        You are analyzing a Problem Solving scenario.
        CONTEXT:
        ${problemText}
        PROPOSED SOLUTIONS:
        ${solutionText}
        TASK:
        Generate a realistic 'Outcome & Evaluation' step.
        1. Briefly describe the likely result of implementing these solutions.
        2. Evaluate the success (e.g., 'The immediate issue was resolved, but...').
        3. Mention one trade-off or lesson learned.
        Return ONLY the text of the outcome (max 50 words). Do not include "Outcome:" prefix.
      `;
      try {
          const result = await callGemini(prompt);
          if (result) {
              const cleanResult = result.replace(/^Outcome:\s*/i, '').replace(/['"]/g, '').trim();
              handleAddToMapList(cleanResult);
          }
      } catch (error) {
          warnLog("Outcome Generation Failed", error);
          setError(t('errors.generation_failed'));
      } finally {
          setIsProcessing(false);
      }
};

const generateMathFluencySet = (operation, difficulty, count = 120) => {
    const problems = [];
    const used = new Set();
    const maxOp = difficulty === 'single' ? 12 : (difficulty === 'double' ? 99 : 12);
    const minOp = difficulty === 'double' ? 10 : 0;
    for (let attempt = 0; attempt < 500 && problems.length < count; attempt++) {
        let a, b, answer, op;
        const ops = operation === 'mixed' ? ['add','sub','mul','div'] : [operation];
        op = ops[Math.floor(Math.random() * ops.length)];
        if (op === 'add') {
            a = Math.floor(Math.random() * (maxOp - minOp + 1)) + minOp;
            b = Math.floor(Math.random() * (maxOp - minOp + 1)) + minOp;
            answer = a + b;
        } else if (op === 'sub') {
            a = Math.floor(Math.random() * (maxOp - minOp + 1)) + minOp;
            b = Math.floor(Math.random() * (a + 1));
            answer = a - b;
        } else if (op === 'mul') {
            const mulMax = difficulty === 'double' ? 15 : 12;
            a = Math.floor(Math.random() * (mulMax + 1));
            b = Math.floor(Math.random() * (12 + 1));
            answer = a * b;
        } else {
            b = Math.floor(Math.random() * 12) + 1;
            answer = Math.floor(Math.random() * (12 + 1));
            a = b * answer;
        }
        const key = `${a}${op}${b}`;
        if (!used.has(key)) {
            used.add(key);
            const symbol = op === 'add' ? '+' : op === 'sub' ? '−' : op === 'mul' ? '×' : '÷';
            problems.push({ a, b, op, symbol, answer, studentAnswer: null, correct: null });
        }
    }
    return problems;
};

window.AlloModules = window.AlloModules || {};
window.AlloModules.MathHelpers = {
  canonicalMathStateKey,
  getMathResourceId,
  getMathResourceInstanceId,
  areMathAnswersEquivalent,
  gradeMathSelfAssessment,
  handleCheckMathWork,
  handleGetMathHint,
  isMathCheckRequestActive,
  isMathHintRequestActive,
  invalidateMathProblemRequests,
  invalidateMathResourceRequests,
  invalidateAllMathRequests,
  handleMathEdit,
  handleGenerateSimilar,
  handleGenerateOutcome,
  generateMathFluencySet,
};
