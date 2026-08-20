/**
 * AlloFlow instructional text and complexity contract.
 *
 * Keeps educator intent, internal model calibration, and measured output
 * separate. The internal `simplified` resource type remains a renderer and
 * persistence identifier; instructionalText describes how a reading is used.
 */
(function () {
  'use strict';

  var VERSION = 'instructional-context/v1';
  var TEXT_SCHEMA_VERSION = 1;
  var CONTEXT_SCHEMA_VERSION = 1;
  var ROLES = ['primary', 'supplemental', 'unspecified'];
  var FORMS = ['original', 'same-text-supported', 'adapted'];
  var DESIGNATION_SOURCES = ['educator', 'workflow-default', 'legacy-inferred'];
  var PRIMARY_POLICIES = ['preserve-primary', 'educator-directed'];

  var GRADE_CALIBRATION = {
    'Kindergarten': { asl: 6, asw: 1.15, min: 0, max: 1 },
    '1st Grade': { asl: 8, asw: 1.20, min: 1, max: 2 },
    '2nd Grade': { asl: 10, asw: 1.25, min: 2, max: 3 },
    '3rd Grade': { asl: 12, asw: 1.30, min: 3, max: 4 },
    '4th Grade': { asl: 14, asw: 1.35, min: 4, max: 5 },
    '5th Grade': { asl: 15, asw: 1.40, min: 5, max: 6 },
    '6th Grade': { asl: 16, asw: 1.45, min: 6, max: 7 },
    '7th Grade': { asl: 17, asw: 1.50, min: 7, max: 8 },
    '8th Grade': { asl: 18, asw: 1.55, min: 8, max: 9 },
    '9th Grade': { asl: 19, asw: 1.60, min: 9, max: 10 },
    '10th Grade': { asl: 20, asw: 1.62, min: 10, max: 11 },
    '11th Grade': { asl: 21, asw: 1.65, min: 11, max: 12 },
    '12th Grade': { asl: 22, asw: 1.68, min: 11, max: 13 }
  };

  function isObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function cleanText(value, limit) {
    if (value === undefined || value === null) return '';
    return String(value).replace(/\s+/g, ' ').trim().slice(0, limit || 2400);
  }

  function clonePlain(value) {
    if (!isObject(value) && !Array.isArray(value)) return value;
    try { return JSON.parse(JSON.stringify(value)); } catch (_) { return isObject(value) ? {} : []; }
  }

  function ordinal(number) {
    var n = Number(number);
    var mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 13) return n + 'th';
    if (n % 10 === 1) return n + 'st';
    if (n % 10 === 2) return n + 'nd';
    if (n % 10 === 3) return n + 'rd';
    return n + 'th';
  }

  function _normalizeGrade(value) {
    var candidate = value;
    if (isObject(candidate)) {
      candidate = candidate.label || candidate.gradeLabel || candidate.gradeLevel || candidate.grade || candidate.id || candidate.numericGrade;
    }
    var raw = cleanText(candidate, 80);
    var lower = raw.toLowerCase().replace(/[._]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!lower) return null;
    if (/^(pre\s*-?\s*k|prek|pre kindergarten|pre-kindergarten)$/.test(lower)) {
      return { id: 'pre-k', label: 'Pre-K', numericGrade: -1, recognized: true };
    }
    if (/^(k|kg|grade k|kindergarten)$/.test(lower)) {
      return { id: 'k', label: 'Kindergarten', numericGrade: 0, recognized: true };
    }
    if (/^(college|undergraduate|college level)$/.test(lower)) {
      return { id: 'college', label: 'College', numericGrade: 13, recognized: true };
    }
    if (/^(graduate|graduate level|postgraduate)$/.test(lower)) {
      return { id: 'graduate', label: 'Graduate Level', numericGrade: 14, recognized: true };
    }
    var match = lower.match(/^(?:grade\s*)?(\d{1,2})(?:st|nd|rd|th)?(?:\s*grade)?$/);
    if (!match) match = lower.match(/\bgrade\s*(\d{1,2})\b/);
    var numeric = match ? Number(match[1]) : NaN;
    if (Number.isFinite(numeric) && numeric >= 1 && numeric <= 12) {
      return { id: 'g' + numeric, label: ordinal(numeric) + ' Grade', numericGrade: numeric, recognized: true };
    }
    return { id: 'custom', label: raw, numericGrade: null, recognized: false };
  }

  function normalizeGrade(value, fallback) {
    var parsed = _normalizeGrade(value);
    if (parsed && (parsed.recognized || fallback === undefined)) return parsed;
    var fallbackParsed = _normalizeGrade(fallback);
    return fallbackParsed || parsed || { id: 'unknown', label: '', numericGrade: null, recognized: false };
  }

  function normalizeGradeLabel(value, fallback) {
    return normalizeGrade(value, fallback).label;
  }

  function getComplexityTarget(value) {
    var grade = normalizeGrade(value);
    var target = GRADE_CALIBRATION[grade.label];
    if (!target) return null;
    return {
      gradeId: grade.id,
      label: grade.label,
      numericGrade: grade.numericGrade,
      averageSentenceLengthMax: target.asl,
      averageSyllablesPerWordMax: target.asw,
      fkRange: { min: target.min, max: target.max },
      fkLabel: target.min + ' to ' + target.max,
      policyVersion: 'complexity-targets/v1'
    };
  }

  function getSourceCalibrationTarget(value) {
    var grade = normalizeGrade(value);
    var n = grade.numericGrade;
    var label = grade.label;
    if (n === -1) label = 'Pre-K';
    else if (n === 0 || n === 1) label = 'Pre-K';
    else if (n === 2 || n === 3) label = '1st Grade';
    else if (n === 4 || n === 5) label = '3rd Grade';
    else if (n >= 6 && n <= 8) label = '5th Grade';
    else if (n >= 9 && n <= 12) label = '8th Grade';
    else if (n === 13) label = '12th Grade';
    else if (n >= 14) label = 'College';
    return {
      requestedGrade: grade.label,
      promptGrade: label,
      policyVersion: 'empirical-undershoot/v1',
      rationale: 'model-overshoot-compensation'
    };
  }

  function fingerprintText(value) {
    var input = String(value === undefined || value === null ? '' : value).replace(/\r\n?/g, '\n');
    var hash = 2166136261;
    for (var i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return 'txt-' + (hash >>> 0).toString(16).padStart(8, '0') + '-' + input.length;
  }

  function fingerprintValue(value) {
    var serialized = '';
    try { serialized = JSON.stringify(value === undefined ? null : value); } catch (_) { serialized = String(value || ''); }
    return fingerprintText(serialized);
  }

  function isEnglishLanguage(value) {
    var language = cleanText(value || 'English', 80).toLowerCase();
    if (!language) return true;
    if (/bilingual|multilingual|dual\s*language|\+|\/|,/.test(language)) return false;
    return language === 'english' || language === 'en' || language.indexOf('english (') === 0;
  }

  function complexityStatus(score, requestedGrade) {
    var numeric = Number(score);
    var target = getComplexityTarget(requestedGrade);
    if (!Number.isFinite(numeric) || !target) return 'unavailable';
    if (numeric < target.fkRange.min) return 'below-target';
    if (numeric > target.fkRange.max) return 'above-target';
    return 'within-target';
  }

  function normalizeComplexity(raw, options) {
    var source = isObject(raw) ? raw : {};
    var opts = isObject(options) ? options : {};
    var requestedGrade = normalizeGradeLabel(source.requestedGrade || source.targetGrade || opts.requestedGrade || '', '');
    var calibrationTarget = normalizeGradeLabel(source.calibrationTarget || opts.calibrationTarget || '', '');
    var rawMeasured = source.measuredGrade !== undefined ? source.measuredGrade : source.score;
    var measured = Number(rawMeasured);
    var hasMeasured = rawMeasured !== null && rawMeasured !== '' && rawMeasured !== undefined && Number.isFinite(measured);
    var language = cleanText(source.language || opts.language || 'English', 80);
    var fingerprint = cleanText(source.contentFingerprint || opts.contentFingerprint, 120);
    var status = cleanText(source.status, 40);
    if (!status) status = hasMeasured && isEnglishLanguage(language)
      ? complexityStatus(measured, requestedGrade)
      : 'unavailable';
    return {
      requestedGrade: requestedGrade,
      calibrationTarget: calibrationTarget,
      measuredGrade: hasMeasured ? measured : null,
      method: cleanText(source.method || (hasMeasured ? 'flesch-kincaid-en' : ''), 80),
      status: status,
      contentFingerprint: fingerprint,
      measuredAt: cleanText(source.measuredAt, 80),
      language: language
    };
  }

  function normalizeInstructionalText(raw, options) {
    var source = isObject(raw) ? raw : {};
    var opts = isObject(options) ? options : {};
    var role = cleanText(source.role || opts.role, 40);
    var form = cleanText(source.form || opts.form, 40);
    var designationSource = cleanText(source.designationSource || opts.designationSource, 40);
    if (ROLES.indexOf(role) === -1) role = 'unspecified';
    if (FORMS.indexOf(form) === -1) form = opts.defaultForm && FORMS.indexOf(opts.defaultForm) !== -1 ? opts.defaultForm : 'original';
    if (DESIGNATION_SOURCES.indexOf(designationSource) === -1) designationSource = 'legacy-inferred';
    var rawAuthorization = isObject(source.replacementAuthorization) ? source.replacementAuthorization : {};
    var authorizationSource = cleanText(rawAuthorization.source, 40);
    var authorized = rawAuthorization.authorized === true && authorizationSource === 'educator';
    return {
      schemaVersion: TEXT_SCHEMA_VERSION,
      role: role,
      form: form,
      sourceArtifactId: cleanText(source.sourceArtifactId || source.sourceResourceId || opts.sourceArtifactId, 160) || null,
      primaryArtifactId: cleanText(source.primaryArtifactId || source.primaryResourceId || opts.primaryArtifactId, 160) || null,
      designationSource: designationSource,
      replacementAuthorization: {
        authorized: authorized,
        source: authorized ? 'educator' : 'none'
      },
      complexity: normalizeComplexity(source.complexity, opts.complexity)
    };
  }

  function getInstructionalText(item, options) {
    var source = isObject(item) ? item : {};
    var config = isObject(source.config) ? source.config : {};
    var candidate = source.instructionalText || source.textProfile || config.instructionalText || config.textProfile;
    if (candidate) return normalizeInstructionalText(candidate, options);
    return inferInstructionalText(source, options);
  }

  function inferInstructionalText(item, options) {
    var source = isObject(item) ? item : {};
    var opts = isObject(options) ? options : {};
    var type = cleanText(source.type, 80).toLowerCase();
    var inferred = {
      role: 'unspecified',
      form: type === 'simplified' ? 'adapted' : 'original',
      designationSource: 'legacy-inferred',
      sourceArtifactId: null,
      primaryArtifactId: null,
      complexity: {
        requestedGrade: source.targetGradeLevel || (isObject(source.config) ? source.config.grade : ''),
        measuredGrade: source.localStats && (source.localStats.score !== undefined
          ? source.localStats.score
          : source.localStats.gradeLevel),
        method: source.localStats && (source.localStats.score !== undefined || source.localStats.gradeLevel !== undefined)
          ? 'flesch-kincaid-en'
          : '',
        contentFingerprint: typeof source.data === 'string' ? fingerprintText(source.data) : '',
        language: isObject(source.config) ? source.config.language : 'English'
      }
    };
    if (type === 'analysis' && source.data && (source.data.originalText || source.data.rawEnglishText)) {
      inferred.role = 'primary';
      inferred.form = 'original';
      inferred.designationSource = 'workflow-default';
    }
    if (opts.role) inferred.role = opts.role;
    return normalizeInstructionalText(inferred, opts);
  }

  function withComplexityEvidence(instructionalText, evidence, content) {
    var normalized = normalizeInstructionalText(instructionalText);
    var next = clonePlain(normalized);
    var options = isObject(evidence) ? clonePlain(evidence) : {};
    if (content !== undefined) options.contentFingerprint = fingerprintText(content);
    if (!options.measuredAt && Number.isFinite(Number(options.measuredGrade !== undefined ? options.measuredGrade : options.score))) {
      options.measuredAt = new Date().toISOString();
    }
    next.complexity = normalizeComplexity(options, normalized.complexity);
    return next;
  }

  function invalidateComplexityEvidence(instructionalText, content, reason) {
    var normalized = normalizeInstructionalText(instructionalText);
    var next = clonePlain(normalized);
    next.complexity.measuredGrade = null;
    next.complexity.method = '';
    next.complexity.status = cleanText(reason, 40) || 'stale';
    next.complexity.contentFingerprint = content === undefined ? '' : fingerprintText(content);
    next.complexity.measuredAt = '';
    return next;
  }

  function normalizeInstructionalContext(raw, options) {
    var source = isObject(raw) ? raw : {};
    var opts = isObject(options) ? options : {};
    var standardsContext = clonePlain(source.standardsContext || opts.standardsContext || null);
    var policy = cleanText(source.primaryTextPolicy || opts.primaryTextPolicy, 60);
    if (PRIMARY_POLICIES.indexOf(policy) === -1) policy = 'preserve-primary';
    var instructionalGrade = normalizeGradeLabel(
      source.instructionalGrade || (source.grade && (source.grade.instructionalGrade || source.grade.label)) || opts.instructionalGrade,
      opts.fallbackGrade || ''
    );
    return {
      schemaVersion: CONTEXT_SCHEMA_VERSION,
      instructionalGrade: instructionalGrade,
      primaryTextPolicy: policy,
      standardsContext: standardsContext,
      standardsFingerprint: cleanText(source.standardsFingerprint, 120) || fingerprintValue(standardsContext || null)
    };
  }

  function resolveArtifactContext(item, ambient) {
    var source = isObject(item) ? item : {};
    var config = isObject(source.config) ? source.config : {};
    var fallback = isObject(ambient) ? ambient : {};
    var instructionalText = getInstructionalText(source);
    return {
      grade: normalizeGradeLabel(
        instructionalText.complexity.requestedGrade || source.targetGradeLevel || config.grade || fallback.grade,
        fallback.grade || ''
      ),
      language: cleanText(instructionalText.complexity.language || config.language || fallback.language || 'English', 80),
      standards: clonePlain(config.standardsContext || config.standards || fallback.standardsContext || fallback.standards || null),
      instructionalText: instructionalText
    };
  }

  var API = {
    VERSION: VERSION,
    TEXT_SCHEMA_VERSION: TEXT_SCHEMA_VERSION,
    CONTEXT_SCHEMA_VERSION: CONTEXT_SCHEMA_VERSION,
    ROLES: ROLES.slice(),
    FORMS: FORMS.slice(),
    normalizeGrade: normalizeGrade,
    normalizeGradeLabel: normalizeGradeLabel,
    getComplexityTarget: getComplexityTarget,
    getSourceCalibrationTarget: getSourceCalibrationTarget,
    fingerprintText: fingerprintText,
    fingerprintValue: fingerprintValue,
    isEnglishLanguage: isEnglishLanguage,
    complexityStatus: complexityStatus,
    normalizeComplexity: normalizeComplexity,
    normalizeInstructionalText: normalizeInstructionalText,
    getInstructionalText: getInstructionalText,
    inferInstructionalText: inferInstructionalText,
    withComplexityEvidence: withComplexityEvidence,
    invalidateComplexityEvidence: invalidateComplexityEvidence,
    normalizeInstructionalContext: normalizeInstructionalContext,
    resolveArtifactContext: resolveArtifactContext
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') {
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.InstructionalContext = API;
  }
})();
