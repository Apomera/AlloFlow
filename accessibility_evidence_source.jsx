// Shared accessibility evidence contracts for interactive artifacts and
// document remediation. Pure JavaScript: no React and no pipeline state.

window.AlloModules = window.AlloModules || {};

var ACCESSIBILITY_EVIDENCE_SCHEMA_VERSION = 1;
var ACCESSIBILITY_EVIDENCE_PROFILES = {
  'document-remediation': {
    id: 'document-remediation',
    standard: 'WCAG 2.2 AA',
    scope: 'full-output',
    requiredEvidence: ['ai', 'axe', 'equalAccess'],
  },
  'accessibility-lab': {
    id: 'accessibility-lab',
    standard: 'WCAG 2.2 AA',
    scope: 'interactive-artifact',
    requiredEvidence: ['axe', 'manual'],
  },
};

var ACCESSIBILITY_RULE_FAMILY = {
  'document-language': 'document-language', 'document-title': 'document-title', 'document-metadata': 'document-metadata',
  'heading-root': 'heading-root', 'heading-order': 'heading-order', 'heading-multiple': 'heading-multiple',
  'image-alt': 'missing-alt', 'decorative-alt': 'decorative-alt', 'alt-quality': 'alt-quality',
  'table-header': 'table-header', 'table-caption': 'table-caption', 'form-label': 'form-label', 'button-label': 'button-label',
  'text-contrast-critical': 'text-contrast', 'text-contrast': 'text-contrast', 'nontext-contrast': 'nontext-contrast',
  'main-landmark': 'main-landmark', 'region-landmarks': 'region-landmarks', 'skip-link': 'skip-link',
  'link-text': 'link-text', 'semantic-list': 'semantic-list', 'searchable-text': 'searchable-text', 'reading-order': 'reading-order',
};

var ACCESSIBILITY_RULE_SEVERITY = {
  'document-language': 'critical', 'document-title': 'critical', 'document-metadata': 'minor',
  'heading-root': 'serious', 'heading-order': 'serious', 'heading-multiple': 'minor',
  'image-alt': 'critical', 'decorative-alt': 'minor', 'alt-quality': 'minor',
  'table-header': 'serious', 'table-caption': 'moderate', 'form-label': 'serious', 'button-label': 'minor',
  'text-contrast-critical': 'critical', 'text-contrast': 'serious', 'nontext-contrast': 'serious',
  'main-landmark': 'critical', 'region-landmarks': 'moderate', 'skip-link': 'moderate',
  'link-text': 'moderate', 'semantic-list': 'moderate', 'searchable-text': 'critical', 'reading-order': 'critical',
};

function stableSerializeEvidence(value, seen) {
  if (value === null) return 'null';
  var type = typeof value;
  if (type === 'string') return JSON.stringify(value);
  if (type === 'number') return Number.isFinite(value) ? String(value) : JSON.stringify(String(value));
  if (type === 'boolean') return value ? 'true' : 'false';
  if (type === 'undefined') return '"[undefined]"';
  if (type === 'function' || type === 'symbol') return '"[' + type + ']"';
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  seen = seen || [];
  if (seen.indexOf(value) >= 0) return '"[circular]"';
  var nextSeen = seen.concat([value]);
  if (Array.isArray(value)) {
    return '[' + value.map(function (entry) { return stableSerializeEvidence(entry, nextSeen); }).join(',') + ']';
  }
  var keys = Object.keys(value).sort();
  return '{' + keys.map(function (key) {
    return JSON.stringify(key) + ':' + stableSerializeEvidence(value[key], nextSeen);
  }).join(',') + '}';
}

// Synchronous SHA-256 keeps evidence identity available during React render and
// matches Web Crypto's SHA-256 output. It is a change detector, not a signature.
function sha256Hex(value) {
  var text = unescape(encodeURIComponent(String(value == null ? '' : value)));
  var maxWord = Math.pow(2, 32);
  var words = [];
  var asciiBitLength = text.length * 8;
  var hash = sha256Hex.h = sha256Hex.h || [];
  var k = sha256Hex.k = sha256Hex.k || [];
  var primeCounter = k.length;
  var isComposite = {};
  for (var candidate = 2; primeCounter < 64; candidate += 1) {
    if (!isComposite[candidate]) {
      for (var multiple = 0; multiple < 313; multiple += candidate) isComposite[multiple] = candidate;
      hash[primeCounter] = (Math.pow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter] = (Math.pow(candidate, 1 / 3) * maxWord) | 0;
      primeCounter += 1;
    }
  }
  text += '\x80';
  while (text.length % 64 !== 56) text += '\x00';
  for (var i = 0; i < text.length; i += 1) {
    var code = text.charCodeAt(i);
    words[i >> 2] |= code << ((3 - i) % 4) * 8;
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength;
  var workingHash = hash.slice(0);
  for (var block = 0; block < words.length;) {
    var oldHash = workingHash.slice(0);
    var schedule = words.slice(block, block += 16);
    for (i = 0; i < 64; i += 1) {
      var w15 = schedule[i - 15];
      var w2 = schedule[i - 2];
      var a = workingHash[0];
      var e = workingHash[4];
      var temp1 = workingHash[7]
        + ((e >>> 6 | e << 26) ^ (e >>> 11 | e << 21) ^ (e >>> 25 | e << 7))
        + ((e & workingHash[5]) ^ ((~e) & workingHash[6]))
        + k[i]
        + (schedule[i] = i < 16 ? schedule[i] : (
          schedule[i - 16]
          + ((w15 >>> 7 | w15 << 25) ^ (w15 >>> 18 | w15 << 14) ^ (w15 >>> 3))
          + schedule[i - 7]
          + ((w2 >>> 17 | w2 << 15) ^ (w2 >>> 19 | w2 << 13) ^ (w2 >>> 10))
        ) | 0);
      var temp2 = ((a >>> 2 | a << 30) ^ (a >>> 13 | a << 19) ^ (a >>> 22 | a << 10))
        + ((a & workingHash[1]) ^ (a & workingHash[2]) ^ (workingHash[1] & workingHash[2]));
      workingHash = [(temp1 + temp2) | 0].concat(workingHash);
      workingHash[4] = (workingHash[4] + temp1) | 0;
      workingHash.pop();
    }
    for (i = 0; i < 8; i += 1) workingHash[i] = (workingHash[i] + oldHash[i]) | 0;
  }
  var result = '';
  for (i = 0; i < 8; i += 1) {
    for (var byte = 3; byte >= 0; byte -= 1) {
      var b = workingHash[i] >> (byte * 8) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

function createArtifactBinding(payload, options) {
  options = options || {};
  var canonical = stableSerializeEvidence({
    rendererRevision: options.rendererRevision || null,
    scope: options.scope || 'interactive-artifact',
    payload: payload,
  });
  return {
    version: ACCESSIBILITY_EVIDENCE_SCHEMA_VERSION,
    algorithm: 'SHA-256',
    digest: sha256Hex(canonical),
    canonicalLength: canonical.length,
    scope: options.scope || 'interactive-artifact',
    rendererRevision: options.rendererRevision || null,
  };
}

function bindingFingerprint(binding) {
  return binding && binding.algorithm === 'SHA-256' && /^[0-9a-f]{64}$/.test(String(binding.digest || ''))
    ? 'sha256:' + binding.digest
    : '';
}

function normalizeSeverity(value, fallback) {
  var severity = String(value || fallback || 'moderate').toLowerCase();
  if (severity === 'high') severity = 'serious';
  if (severity === 'warning' || severity === 'warn') severity = 'moderate';
  return ['critical', 'serious', 'moderate', 'minor'].indexOf(severity) >= 0 ? severity : 'moderate';
}

function canonicalizeFinding(finding, defaults) {
  finding = finding && typeof finding === 'object' ? finding : {};
  defaults = defaults || {};
  var ruleId = String(finding.ruleId || finding.id || defaults.ruleId || 'other').toLowerCase().trim();
  var reportedSeverity = String(finding.severity || defaults.severity || '').toLowerCase();
  var severity = normalizeSeverity(ACCESSIBILITY_RULE_SEVERITY[ruleId] || reportedSeverity, 'moderate');
  var description = String(finding.description || finding.issue || finding.message || finding.help || defaults.description || ruleId);
  var normalized = Object.assign({}, finding, {
    schemaVersion: ACCESSIBILITY_EVIDENCE_SCHEMA_VERSION,
    source: String(finding.source || defaults.source || 'manual'),
    ruleId: ruleId,
    issue: String(finding.issue || description),
    description: description,
    wcag: String(finding.wcag || defaults.wcag || ''),
    severity: severity,
    count: Math.max(1, Math.floor(Number(finding.count) || 1)),
    status: ['open', 'fix-in-progress', 'ready-to-retest', 'verified', 'accepted-risk'].indexOf(finding.status) >= 0
      ? finding.status
      : String(defaults.status || 'open'),
    requiresManualReview: finding.requiresManualReview === true || ruleId === 'other',
  });
  if (reportedSeverity && severity !== reportedSeverity) {
    normalized._reportedSeverity = reportedSeverity;
    normalized._severityCorrected = true;
  }
  if (ruleId === 'other' && !normalized._manualReviewReason) normalized._manualReviewReason = 'unclassified-audit-rule';
  normalized.findingKey = findingKey(normalized);
  return normalized;
}

function findingKey(issue) {
  var ruleId = String((issue && issue.ruleId) || '').toLowerCase().trim();
  if (Object.prototype.hasOwnProperty.call(ACCESSIBILITY_RULE_FAMILY, ruleId)) {
    return 'family:' + ACCESSIBILITY_RULE_FAMILY[ruleId];
  }
  if (/^(?:manual|axe):/.test(ruleId)) {
    return 'rule:' + ruleId;
  }
  var text = String((issue && (issue.issue || issue.description || issue.text)) || '').toLowerCase();
  var wcag = String((issue && issue.wcag) || '').toLowerCase().replace(/[^0-9.]/g, '');
  text = text
    .replace(/alternative\s+text/g, 'alt text')
    .replace(/alternative\s+descriptions?/g, 'alt text')
    .replace(/alt\s+attributes?/g, 'alt text')
    .replace(/(?:image\w*\s+)?(?:do|does)\s+not\s+contain\s+alt\s+text/g, 'missing alt text')
    .replace(/alt\s+text\s+(?:is\s+)?(?:empty|blank)/g, 'missing alt text')
    .replace(/\bno\s+(alt\s+text|image\s+description)(?:\s+is)?\s*(?:provided|supplied|available)?/g, 'missing $1')
    .replace(/colour/g, 'color')
    .replace(/does\s+not\s+have|do\s+not\s+have|has\s+no|have\s+no|not\s+provided|lacks?|without|absent/g, 'missing')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  var families = [
    ['decorative-alt', /decorative.*alt|alt.*decorative/],
    ['missing-alt', /(?:missing\s+alt\s+text|image\w*\s+missing\s+alt|alt\s+text\s+missing)/],
    ['alt-quality', /alt\s+text|image\s+description/],
    ['heading-multiple', /(?:multiple|more\s+than\s+one|duplicate).*h1|h1.*(?:multiple|duplicate)/],
    ['heading-root', /(?:missing|no)\s+(?:an?\s+)?(?:h1|top[ -]level|primary|level\s+(?:one|1))(?:\s+heading)?|(?:h1|top[ -]level\s+heading|primary\s+heading).*missing/],
    ['heading-order', /heading.*(?:hierarchy|order|level|skip)|(?:hierarchy|order|level|skip).*heading/],
    ['table-header', /table.*(?:header|scope|th\b)|(?:header|scope|th\b).*table/],
    ['table-caption', /table.*caption|caption.*table/],
    ['form-label', /(?:form|input|control).*label|label.*(?:form|input|control)/],
    ['button-label', /(?:icon|button).*(?:label|name)|(?:label|name).*(?:icon|button)/],
    ['contrast', /contrast|foreground.*background|background.*foreground/],
    ['main-landmark', /main.*landmark|landmark.*main/],
    ['region-landmarks', /(?:header|footer|nav).*landmark|landmark.*(?:header|footer|nav)|missing.*(?:header|footer|nav)/],
    ['skip-link', /skip.*(?:link|navigation)|(?:link|navigation).*skip/],
    ['link-text', /link.*(?:descriptive|purpose|text)|(?:descriptive|purpose).*link/],
    ['semantic-list', /semantic.*list|list.*semantic|bullet.*list/],
    ['searchable-text', /(?:no|missing|without).*searchable\s+text|searchable\s+text.*(?:missing|absent)|image[ -]only|scanned.*text\s+layer/],
    ['reading-order', /reading\s+order|logical\s+(?:reading\s+)?order/],
    ['document-title', /document.*title|title.*document/],
    ['document-metadata', /(?:document|pdf).*(?:metadata|author|subject)|(?:metadata|author|subject).*(?:document|pdf)/],
    ['document-language', /(?:document|html).*lang|language.*(?:document|html)/],
  ];
  for (var fi = 0; fi < families.length; fi += 1) {
    if (families[fi][1].test(text)) {
      var family = families[fi][0];
      if (family === 'contrast') {
        if (/\b(?:graphic|icon|user\s+interface|ui|control|component|border|non\s*text)\b/.test(text)) return 'family:nontext-contrast';
        if (/\b(?:text|foreground|font|word|words|character|characters)\b/.test(text)) return 'family:text-contrast';
        return (wcag || 'wcag-unknown') + '|contrast';
      }
      return 'family:' + family;
    }
  }
  var stop = { the: 1, a: 1, an: 1, and: 1, or: 1, to: 1, of: 1, for: 1, in: 1, on: 1, is: 1, are: 1, be: 1, should: 1, document: 1, element: 1, elements: 1 };
  var tokens = Array.from(new Set(text.split(/\s+/).filter(function (token) { return token.length > 1 && !stop[token]; }))).sort().slice(0, 12);
  return tokens.length ? ((wcag || 'wcag-unknown') + '|tokens:' + tokens.join('-')) : '';
}

function diffFindings(baseline, current) {
  if (!Array.isArray(baseline) || !Array.isArray(current)) return null;
  var currentKeys = new Set(current.map(findingKey).filter(Boolean));
  var baselineKeys = new Set(baseline.map(findingKey).filter(Boolean));
  var resolved = baseline.filter(function (item) { var key = findingKey(item); return key && !currentKeys.has(key); });
  var persisted = baseline.filter(function (item) { var key = findingKey(item); return key && currentKeys.has(key); });
  var introduced = current.filter(function (item) { var key = findingKey(item); return key && !baselineKeys.has(key); });
  var countSeverity = function (items, severity) {
    return items.filter(function (item) { return String(item && item.severity || '').toLowerCase() === severity; }).length;
  };
  return {
    resolved: resolved,
    persisted: persisted,
    introduced: introduced,
    baseline: baseline,
    summary: {
      resolvedCount: resolved.length,
      persistedCount: persisted.length,
      introducedCount: introduced.length,
      totalPre: baseline.length,
      resolvedBySeverity: {
        critical: countSeverity(resolved, 'critical'), serious: countSeverity(resolved, 'serious'),
        moderate: countSeverity(resolved, 'moderate'), minor: countSeverity(resolved, 'minor'),
      },
      persistedBySeverity: {
        critical: countSeverity(persisted, 'critical'), serious: countSeverity(persisted, 'serious'),
        moderate: countSeverity(persisted, 'moderate'), minor: countSeverity(persisted, 'minor'),
      },
    },
  };
}

function normalizeProfile(profile) {
  if (typeof profile === 'string' && ACCESSIBILITY_EVIDENCE_PROFILES[profile]) {
    return Object.assign({}, ACCESSIBILITY_EVIDENCE_PROFILES[profile]);
  }
  profile = profile && typeof profile === 'object' ? profile : {};
  var base = ACCESSIBILITY_EVIDENCE_PROFILES[profile.id] || ACCESSIBILITY_EVIDENCE_PROFILES['accessibility-lab'];
  return Object.assign({}, base, profile, {
    requiredEvidence: Array.isArray(profile.requiredEvidence) ? profile.requiredEvidence.slice() : base.requiredEvidence.slice(),
  });
}

function evidenceLaneState(lane, evidence) {
  evidence = evidence && typeof evidence === 'object' ? evidence : null;
  if (!evidence || evidence.executed !== true) return { id: lane, execution: 'unavailable', findings: null, review: null };
  var findings = Number.isFinite(evidence.findingCount) ? Math.max(0, Math.floor(evidence.findingCount)) : null;
  var review = Number.isFinite(evidence.reviewCount) ? Math.max(0, Math.floor(evidence.reviewCount)) : null;
  if (findings === null || review === null || evidence.partial === true) {
    return { id: lane, execution: 'partial', findings: findings, review: review };
  }
  return {
    id: lane,
    execution: review > 0 ? 'complete-with-review' : 'complete',
    findings: findings,
    review: review,
  };
}

function deriveProfileVerificationState(input, profile) {
  input = input || {};
  var selectedProfile = normalizeProfile(profile || input.profile);
  var evidence = input.evidence || {};
  var lanes = {};
  selectedProfile.requiredEvidence.forEach(function (lane) {
    lanes[lane] = evidenceLaneState(lane, evidence[lane]);
  });
  var laneValues = selectedProfile.requiredEvidence.map(function (lane) { return lanes[lane]; });
  var allUnavailable = laneValues.every(function (lane) { return lane.execution === 'unavailable'; });
  var executionComplete = laneValues.every(function (lane) {
    return lane.execution === 'complete' || lane.execution === 'complete-with-review';
  });
  var findingCount = laneValues.reduce(function (sum, lane) { return sum + (lane.findings || 0); }, 0);
  var reviewCount = laneValues.reduce(function (sum, lane) { return sum + (lane.review || 0); }, 0);
  var hasUnknownCounts = laneValues.some(function (lane) { return lane.findings === null || lane.review === null; });
  var outcomeState = findingCount > 0 ? 'fail' : (reviewCount > 0 ? 'review-required' : (executionComplete ? 'pass' : 'unknown'));
  var verificationState = allUnavailable
    ? 'unavailable'
    : (!executionComplete || hasUnknownCounts ? 'partial' : (findingCount > 0 || reviewCount > 0 ? 'review-required' : 'complete'));
  var reasons = [];
  laneValues.forEach(function (lane) {
    if (lane.execution === 'unavailable') reasons.push(lane.id + '-unavailable');
    else if (lane.execution === 'partial') reasons.push(lane.id + '-partial');
    if ((lane.findings || 0) > 0) reasons.push(lane.id + '-confirmed-findings:' + lane.findings);
    if ((lane.review || 0) > 0) reasons.push(lane.id + '-manual-review:' + lane.review);
  });
  return {
    profile: selectedProfile.id,
    standard: selectedProfile.standard,
    verificationScope: selectedProfile.scope,
    verificationState: verificationState,
    executionState: allUnavailable ? 'unavailable' : (executionComplete ? 'complete' : 'partial'),
    outcomeState: outcomeState,
    fullyVerifiedSuccess: verificationState === 'complete' && outcomeState === 'pass',
    success: verificationState === 'complete' && outcomeState === 'pass',
    requiresManualReview: verificationState !== 'complete',
    knownFindingCount: findingCount,
    reviewCount: reviewCount,
    coverage: lanes,
    reasons: reasons,
  };
}

window.AlloModules.AccessibilityEvidence = {
  schemaVersion: ACCESSIBILITY_EVIDENCE_SCHEMA_VERSION,
  profiles: ACCESSIBILITY_EVIDENCE_PROFILES,
  stableSerialize: stableSerializeEvidence,
  sha256Hex: sha256Hex,
  createArtifactBinding: createArtifactBinding,
  bindingFingerprint: bindingFingerprint,
  canonicalizeFinding: canonicalizeFinding,
  findingKey: findingKey,
  diffFindings: diffFindings,
  normalizeProfile: normalizeProfile,
  deriveProfileVerificationState: deriveProfileVerificationState,
};
window.AlloModules.AccessibilityEvidenceModule = true;
