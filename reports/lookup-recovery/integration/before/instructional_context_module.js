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
  var SOURCE_BODY_EXTRACTION_VERSION = 'measurable-source-body/v1';
  var SOURCE_COMPLEXITY_MEASUREMENT_VERSION = 'source-body-fk/v1';
  var ROLES = ['primary', 'supplemental', 'unspecified'];
  var FORMS = ['original', 'same-text-supported', 'adapted'];
  var DESIGNATION_SOURCES = ['educator', 'workflow-default', 'legacy-inferred'];
  var PRIMARY_POLICIES = ['preserve-primary', 'educator-directed'];
  var ADAPTED_TEXT_POLICIES = ['include', 'omit', 'prohibited'];
  var PRIMARY_TEXT_ACCESS = ['required', 'available'];
  var TEXT_ACCESS_DECISION_SOURCES = ['educator', 'standard', 'workflow-default'];

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

  function getSourceCalibrationStyle(value) {
    var calibration = isObject(value) && value.promptGrade
      ? value
      : getSourceCalibrationTarget(value);
    var promptGrade = normalizeGradeLabel(calibration.promptGrade || calibration.calibrationTarget || '', '');
    if (promptGrade === 'Pre-K') return 'Use extremely short sentences, generally 3-5 words, and no compound sentences.';
    if (promptGrade === '1st Grade') return 'Use short declarative sentences and high-frequency vocabulary.';
    if (promptGrade === '3rd Grade') return 'Use mostly simple sentences with only limited compound sentences.';
    if (promptGrade === '5th Grade') return 'Use straightforward syntax and avoid dense academic language.';
    if (promptGrade === '8th Grade') return 'Use clear standard language without unnecessary jargon or nested clauses.';
    return 'Use direct language and sentence structures appropriate to the calibrated target.';
  }

  function buildSourceCalibrationGuidance(value) {
    var calibration = getSourceCalibrationTarget(value);
    return [
      'REQUESTED INSTRUCTIONAL TARGET: ' + calibration.requestedGrade,
      'INTERNAL GENERATION CALIBRATION: ' + calibration.promptGrade,
      'The internal target compensates for observed model overshoot; it is not the educator-facing grade label.',
      getSourceCalibrationStyle(calibration),
      'If a sentence is borderline, split it and prefer the shorter accurate word.'
    ].join('\n');
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


  // Exact UTF-16 source identity: unlike readability fingerprints, CRLF,
  // whitespace and Unicode normalization remain distinct. This checksum is
  // not proof of historical authenticity; preservation also uses equality.
  function fingerprintSourceText(text) {
    if (typeof text !== 'string') return '';
    var hash = 2166136261;
    for (var i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return 'source-utf16-v1-' + (hash >>> 0).toString(16).padStart(8, '0') + '-' + text.length;
  }

  function createSourceSnapshot(text, options) {
    if (typeof text !== 'string') return null;
    var opts = isObject(options) ? options : {};
    var provenance = isObject(opts.provenance) ? opts.provenance : {};
    return {
      schemaVersion: 1,
      text: text,
      language: cleanText(opts.language, 80) || 'English',
      format: cleanText(opts.format, 80) || 'plain-text',
      sourceArtifactId: opts.sourceArtifactId == null ? null : cleanText(opts.sourceArtifactId, 160) || null,
      capturedAt: cleanText(opts.capturedAt, 80) || new Date().toISOString(),
      fingerprint: fingerprintSourceText(text),
      provenance: {
        selection: cleanText(provenance.selection || opts.selection, 100) || 'selected-text',
        origin: cleanText(provenance.origin, 100) || 'selected-source',
        note: cleanText(provenance.note, 600)
      }
    };
  }

  function getSourceSnapshot(item) {
    if (!isObject(item)) return null;
    var candidate = item.sourceSnapshot || (!item.type && item.schemaVersion === 1 && typeof item.text === 'string' ? item : null);
    if (!isObject(candidate) || candidate.schemaVersion !== 1 || typeof candidate.text !== 'string'
        || candidate.fingerprint !== fingerprintSourceText(candidate.text)) return null;
    // Owned whitelisted copy; never search unrelated history for a source.
    return createSourceSnapshot(candidate.text, candidate);
  }

  function isSupportedOriginal(item) {
    if (!isObject(item) || item.type !== 'simplified' || typeof item.data !== 'string') return false;
    var snapshot = getSourceSnapshot(item);
    return !!snapshot && getInstructionalText(item).form === 'same-text-supported'
      && item.data === snapshot.text;
  }


  function normalizeReadingUnitId(value) {
    var unit = value == null ? '' : cleanText(value, 160);
    return !unit || unit === 'all' || unit === 'uncategorized' ? null : unit;
  }

  function readingUnit(item) {
    return normalizeReadingUnitId(item && (item.unitId !== undefined ? item.unitId : item.config && item.config.unitId));
  }

  function normalizeSourceInstructionalText(raw, options) {
    var opts = isObject(options) ? options : {};
    var profile = normalizeInstructionalText(raw, {
      role: opts.role || 'primary', form: 'original', designationSource: opts.designationSource || 'workflow-default',
      sourceArtifactId: opts.sourceArtifactId, primaryArtifactId: opts.sourceArtifactId,
      complexity: { language: opts.language || 'English' }
    });
    return Object.assign({}, profile, { form: 'original', replacementAuthorization: { authorized: false, source: 'none' } });
  }

  function isAuthorizedAdaptedPrimary(item) {
    var profile = getInstructionalText(item);
    return profile.form === 'adapted' && profile.role === 'primary'
      && profile.replacementAuthorization.authorized === true && profile.replacementAuthorization.source === 'educator';
  }

  function getSourceInstructionalText(item) {
    var source = isObject(item) ? item : {};
    var profile = getInstructionalText(source);
    var raw = source.sourceInstructionalText || (source.config && source.config.sourceInstructionalText);
    if (profile.form !== 'adapted') raw = profile;
    var snapshot = getSourceSnapshot(source);
    return normalizeSourceInstructionalText(raw, {
      // A legacy educator-selected adapted main does not automatically make
      // its retained original another main text.
      role: isAuthorizedAdaptedPrimary(source) ? 'supplemental' : 'primary',
      sourceArtifactId: snapshot && snapshot.sourceArtifactId,
      language: snapshot && snapshot.language
    });
  }

  function readingFamilyIds(item) {
    if (!isObject(item)) return [];
    var profile = getInstructionalText(item), snapshot = getSourceSnapshot(item);
    var values = [item.sourceFamilyId, item.config && item.config.sourceFamilyId];
    if (item.type === 'analysis' && profile.form !== 'adapted') values.push(item.id);
    if (snapshot) values.push(snapshot.sourceArtifactId);
    values.push(profile.sourceArtifactId, profile.primaryArtifactId);
    if (profile.form !== 'adapted') values.push(item.id);
    return values.map(function (value) { return value == null ? '' : String(value); })
      .filter(function (value, index, all) { return value && all.indexOf(value) === index; });
  }

  function getReadingSourceFamilyId(item) {
    var ids = readingFamilyIds(item);
    return ids.length ? ids[0] : null;
  }

  function sameReadingSourceFamily(left, right) {
    if (!isObject(left) || !isObject(right) || readingUnit(left) !== readingUnit(right)) return false;
    var leftExplicit = left.sourceFamilyId || (left.config && left.config.sourceFamilyId);
    var rightExplicit = right.sourceFamilyId || (right.config && right.config.sourceFamilyId);
    if (leftExplicit && rightExplicit) return String(leftExplicit) === String(rightExplicit);
    var leftIds = readingFamilyIds(left), rightIds = readingFamilyIds(right);
    if (leftIds.some(function (id) { return rightIds.indexOf(id) !== -1; })) return true;
    var a = getSourceSnapshot(left), b = getSourceSnapshot(right);
    // Legacy unlinked copies can match exact text only within the same lesson,
    // and never override two competing explicit source identities.
    var aOrigin = a && a.sourceArtifactId, bOrigin = b && b.sourceArtifactId;
    if ((leftExplicit && rightExplicit) || (aOrigin && bOrigin && aOrigin !== bOrigin)) return false;
    return !!a && !!b && !aOrigin && !bOrigin && a.fingerprint === b.fingerprint && a.text === b.text;
  }

  function createSupportedReading(textOrSnapshot, options) {
    var opts = isObject(options) ? options : {};
    var snapshot = typeof textOrSnapshot === 'string'
      ? createSourceSnapshot(textOrSnapshot, opts) : getSourceSnapshot(textOrSnapshot);
    if (!snapshot) return null;
    var inherited = opts.instructionalText || opts.sourceInstructionalText
      || (opts.sourceItem && getSourceInstructionalText(opts.sourceItem))
      || (opts.config && opts.config.instructionalText);
    var sourceProfile = normalizeSourceInstructionalText(inherited, {
      role: opts.role || 'primary', sourceArtifactId: snapshot.sourceArtifactId,
      language: snapshot.language, designationSource: opts.designationSource
    });
    var profile = normalizeInstructionalText(Object.assign({}, sourceProfile, {
      form: 'same-text-supported', replacementAuthorization: { authorized: false, source: 'none' }
    }));
    var config = isObject(opts.config) ? clonePlain(opts.config) : {};
    config.language = snapshot.language;
    config.instructionalText = clonePlain(profile);
    if (config.sourceInstructionalText) config.sourceInstructionalText = clonePlain(sourceProfile);
    delete config.sourceSnapshot;
    delete config.textProfile;
    var id = opts.id == null ? 'original-' + snapshot.fingerprint : String(opts.id);
    var familyId = cleanText(opts.sourceFamilyId || (opts.sourceItem && getReadingSourceFamilyId(opts.sourceItem)) || snapshot.sourceArtifactId || id, 200);
    var unitId = normalizeReadingUnitId(opts.unitId !== undefined ? opts.unitId : opts.sourceItem && opts.sourceItem.unitId);
    var reading = {
      id: id, type: 'simplified', title: cleanText(opts.title, 300) || 'Original with supports',
      data: snapshot.text, dataEncoding: 'text/v1', sourceSnapshot: snapshot,
      instructionalText: profile, sourceInstructionalText: sourceProfile,
      sourceFamilyId: familyId, unitId: unitId, config: config
    };
    if (opts.instructionalContext) reading.instructionalContext = clonePlain(opts.instructionalContext);
    if (opts.standardsContext) reading.standardsContext = clonePlain(opts.standardsContext);
    if (opts.readingSupports) reading.readingSupports = validateReadingSupports(reading, opts.readingSupports);
    return reading;
  }

  function getReadingArtifactLabel(item) {
    if (isSupportedOriginal(item)) return 'Original with supports';
    if (item && item.readingPreservation && item.readingPreservation.status === 'unavailable') return 'Original unavailable';
    var profile = getInstructionalText(item);
    if (profile.form === 'same-text-supported') return 'Reading text (original unavailable)';
    if (profile.form === 'adapted') return 'Adapted text';
    return item && item.type === 'analysis' ? 'Source analysis' : 'Original text';
  }

  function getReadingRoleLabel(itemOrProfile) {
    var profile = isObject(itemOrProfile) && !itemOrProfile.type && itemOrProfile.role
      ? normalizeInstructionalText(itemOrProfile) : getInstructionalText(itemOrProfile);
    return profile.role === 'primary' ? 'Main reading' : profile.role === 'supplemental' ? 'Supporting reading' : 'Not designated';
  }

  function updateInstructionalRole(item, requestedRole, options) {
    if (!isObject(item) || ROLES.indexOf(requestedRole) === -1) return item;
    var opts = isObject(options) ? options : {};
    var current = getInstructionalText(item);
    if (current.form === 'same-text-supported' && !isSupportedOriginal(item) && requestedRole === 'primary') return item;
    var authorized = current.form === 'adapted' && requestedRole === 'primary'
      && (opts.authorizeReplacement === true || isAuthorizedAdaptedPrimary(item));
    if (current.form === 'adapted' && requestedRole === 'primary' && !authorized) return item;
    var profile = normalizeInstructionalText(Object.assign({}, current, {
      role: requestedRole, designationSource: 'educator',
      replacementAuthorization: { authorized: authorized, source: authorized ? 'educator' : 'none' }
    }));
    var out = Object.assign({}, item, { instructionalText: profile });
    if (isObject(item.config)) out.config = Object.assign({}, item.config, { instructionalText: clonePlain(profile) });
    if (current.form !== 'adapted') {
      out.sourceInstructionalText = normalizeSourceInstructionalText(profile);
      if (out.config && out.config.sourceInstructionalText) out.config.sourceInstructionalText = clonePlain(out.sourceInstructionalText);
    }
    return out;
  }

  function updateReadingFamilyRole(items, selectedItem, requestedRole, options) {
    var source = Array.isArray(items) ? items : [];
    var selected = source.find(function (item) { return item && selectedItem && String(item.id) === String(selectedItem.id); }) || selectedItem;
    var updated = updateInstructionalRole(selected, requestedRole, options);
    if (updated === selected) return { items: source, item: selected, changedIds: [] };
    var adaptedEdit = getInstructionalText(selected).form === 'adapted';
    var sourceProfile = adaptedEdit ? null : normalizeSourceInstructionalText(updated.instructionalText);
    var changedIds = [];
    var output = source.map(function (item) {
      var next = item;
      if (item === selected || (item && selected && String(item.id) === String(selected.id))) next = updated;
      else if (!adaptedEdit && sameReadingSourceFamily(item, selected)) {
        if (getInstructionalText(item).form === 'adapted') {
          next = Object.assign({}, item, { sourceInstructionalText: clonePlain(sourceProfile) });
          if (item.config && item.config.sourceInstructionalText) next.config = Object.assign({}, item.config, { sourceInstructionalText: clonePlain(sourceProfile) });
        }
        else {
          next = updateInstructionalRole(item, requestedRole, options);
          if (next !== item) next.sourceInstructionalText = clonePlain(sourceProfile);
        }
      }
      if (next !== item) changedIds.push(String(item.id));
      return next;
    });
    return { items: output, item: updated, changedIds: changedIds };
  }

  function ensureReadingSourcePairs(items, options) {
    var source = Array.isArray(items) ? items.filter(isObject) : [];
    var history = options && Array.isArray(options.history) ? options.history : [];
    var available = source.concat(history.filter(function (item) { return item && !source.some(function (current) { return current.id === item.id; }); }));
    var originals = source.filter(isSupportedOriginal), output = [];
    source.forEach(function (item) {
      var snapshot = ['analysis', 'simplified'].indexOf(item.type) !== -1 && getInstructionalText(item).form === 'adapted' ? getSourceSnapshot(item) : null;
      if (snapshot && !originals.some(function (original) {
        return sameReadingSourceFamily(original, item) && original.data === snapshot.text;
      })) {
        var existing = available.find(function (candidate) {
          return isSupportedOriginal(candidate) && sameReadingSourceFamily(candidate, item) && candidate.data === snapshot.text;
        });
        var linkedSource = existing || available.find(function (candidate) {
          return candidate.type === 'analysis' && sameReadingSourceFamily(candidate, item);
        });
        var role = linkedSource ? getSourceInstructionalText(linkedSource) : getSourceInstructionalText(item);
        var reading = existing || createSupportedReading(snapshot, {
          title: (cleanText(item.title, 260) || 'Reading') + ' — original',
          config: { language: snapshot.language, grade: item.config && item.config.grade },
          sourceInstructionalText: role, sourceFamilyId: getReadingSourceFamilyId(item),
          unitId: readingUnit(item), instructionalContext: item.instructionalContext, standardsContext: item.standardsContext
        });
        if (!existing) {
          var baseId = reading.id, suffix = 1;
          while (source.concat(output).some(function (entry) { return entry.id === reading.id; })) reading.id = baseId + '-' + suffix++;
        }
        originals.push(reading);
        output.push(reading);
      }
      output.push(item);
    });
    return output;
  }

  function readableArtifactText(item) {
    if (!isObject(item)) return '';
    if (item.type === 'analysis') return typeof (item.data && item.data.originalText) === 'string' ? item.data.originalText : '';
    return item.type === 'simplified' && typeof item.data === 'string' ? item.data : '';
  }

  function usablePrimary(item) {
    var profile = getInstructionalText(item);
    if (profile.role !== 'primary' || !readableArtifactText(item).trim()) return false;
    if (profile.form === 'same-text-supported') return isSupportedOriginal(item);
    if (profile.form === 'adapted') return isAuthorizedAdaptedPrimary(item);
    return item.type === 'analysis' || (getSourceSnapshot(item) && item.data === getSourceSnapshot(item).text);
  }

  function resolveReadingSource(options) {
    var opts = isObject(options) ? options : {};
    var items = Array.isArray(opts.items) ? opts.items : (Array.isArray(opts.history) ? opts.history : []);
    var hasScope = opts.unitId !== undefined && opts.unitId !== 'all';
    var scope = normalizeReadingUnitId(opts.unitId);
    var candidates = items.filter(function (item) {
      return item && ['analysis', 'simplified'].indexOf(item.type) !== -1 && readableArtifactText(item).trim()
        && (!hasScope || readingUnit(item) === scope);
    }).map(function (item) {
      var profile = getInstructionalText(item);
      return { id: item.id, title: item.title || 'Reading', artifact: item, item: item, unitId: readingUnit(item),
        instructionalText: profile, profile: profile, sourceFamilyId: getReadingSourceFamilyId(item),
        eligible: (profile.form !== 'same-text-supported' || isSupportedOriginal(item))
          && (profile.form !== 'adapted' || profile.role !== 'primary' || isAuthorizedAdaptedPrimary(item)) };
    });
    function resolved(artifact, selection, textOverride, suppliedSnapshot) {
      var text = textOverride !== undefined ? textOverride : readableArtifactText(artifact);
      var profile = artifact ? getInstructionalText(artifact) : normalizeInstructionalText(opts.inputInstructionalText || opts.instructionalText, { role: 'primary', form: 'original', designationSource: 'workflow-default', complexity: { language: opts.language || 'English' } });
      var snapshot = suppliedSnapshot || (artifact && getSourceSnapshot(artifact));
      if (artifact && artifact.type === 'analysis' && profile.form !== 'adapted' && (!snapshot || snapshot.text !== text || !snapshot.sourceArtifactId)) {
        snapshot = createSourceSnapshot(text, { sourceArtifactId: artifact.id, language: artifact.config && artifact.config.language || opts.language, selection: 'saved-analysis' });
      }
      if (!artifact && !snapshot && profile.form !== 'adapted') snapshot = createSourceSnapshot(text, { language: opts.language, selection: selection });
      var unitId = artifact ? readingUnit(artifact) : scope;
      var sourceRole = opts.sourceInstructionalText ? normalizeSourceInstructionalText(opts.sourceInstructionalText)
        : artifact ? getSourceInstructionalText(artifact) : profile.form === 'adapted'
          ? getSourceInstructionalText({ type: 'simplified', instructionalText: profile, sourceSnapshot: snapshot }) : normalizeSourceInstructionalText(profile);
      var familyId = cleanText(opts.sourceFamilyId || (artifact && getReadingSourceFamilyId(artifact))
        || (snapshot && snapshot.sourceArtifactId) || (snapshot && 'input-' + (unitId || 'uncategorized') + '-' + snapshot.fingerprint), 200) || null;
      return {
        status: 'resolved', selection: selection, text: text, artifact: artifact || null, item: artifact || null,
        inputArtifactId: artifact ? artifact.id : opts.inputArtifactId || null,
        sourceArtifactId: snapshot ? snapshot.sourceArtifactId : null, sourceFamilyId: familyId,
        unitId: unitId, instructionalText: profile, sourceInstructionalText: sourceRole,
        sourceSnapshot: snapshot || null, candidates: candidates
      };
    }
    if (opts.sourceArtifactId === '__input__') {
      if (typeof opts.inputText !== 'string' || !opts.inputText.trim()) return { status: 'missing', reason: 'empty-input', candidates: candidates, text: '' };
      return resolved(null, 'explicit-input', opts.inputText, getSourceSnapshot(opts.sourceSnapshot));
    }
    var explicit = opts.selected || (opts.sourceArtifactId != null && String(opts.sourceArtifactId)
      ? candidates.find(function (candidate) { return String(candidate.id) === String(opts.sourceArtifactId); }) : null);
    if (explicit && explicit.artifact) explicit = explicit.artifact;
    var supplied = getSourceSnapshot(opts.sourceSnapshot);
    if (typeof opts.textOverride === 'string') {
      if (!opts.textOverride.trim()) return { status: 'missing', reason: 'empty-override', candidates: candidates, text: '' };
      var matching = explicit && readableArtifactText(explicit) === opts.textOverride ? explicit : null;
      return resolved(matching, 'explicit-text', opts.textOverride, supplied);
    }
    if (opts.selected || (opts.sourceArtifactId != null && String(opts.sourceArtifactId))) {
      if (!explicit || !readableArtifactText(explicit).trim()) return { status: 'missing', reason: 'selected-source-unavailable', candidates: candidates, text: '' };
      if (getInstructionalText(explicit).form === 'same-text-supported' && !isSupportedOriginal(explicit)) {
        return { status: 'missing', reason: 'unverified-original', candidates: candidates, text: '' };
      }
      if (getInstructionalText(explicit).form === 'adapted' && getInstructionalText(explicit).role === 'primary' && !isAuthorizedAdaptedPrimary(explicit)) {
        return { status: 'missing', reason: 'unauthorized-adapted-main', candidates: candidates, text: '' };
      }
      return resolved(explicit, 'explicit-artifact');
    }
    var eligible = candidates.filter(function (candidate) { return candidate.eligible; });
    if (!hasScope && new Set(eligible.map(function (candidate) { return candidate.unitId; })).size > 1) {
      return { status: 'ambiguous', reason: 'choose-lesson-source', candidates: candidates, text: '' };
    }
    var mains = eligible.filter(function (candidate) { return usablePrimary(candidate.artifact); });
    var pool = mains.length ? mains : eligible.filter(function (candidate) { return getInstructionalText(candidate.artifact).role !== 'primary'; });
    var distinct = [];
    pool.forEach(function (candidate) {
      if (!distinct.some(function (other) {
        return sameReadingSourceFamily(candidate.artifact, other.artifact) && readableArtifactText(candidate.artifact) === readableArtifactText(other.artifact);
      })) distinct.push(candidate);
    });
    if (distinct.length === 1) return resolved(distinct[0].artifact, mains.length ? 'lesson-main' : 'lesson-source');
    if (!eligible.length && typeof opts.inputText === 'string' && opts.inputText.trim()) return resolved(null, 'input', opts.inputText, supplied);
    return { status: distinct.length ? 'ambiguous' : 'missing', reason: distinct.length ? 'choose-source' : 'no-readable-source', candidates: candidates, text: '' };
  }

  function summarizeReadingAccess(items, options) {
    var opts = isObject(options) ? options : {};
    var source = Array.isArray(items) ? items.filter(isObject) : [];
    var readings = opts.includeSourcePairs === true ? ensureReadingSourcePairs(source, opts) : source;
    var primary = readings.filter(usablePrimary);
    var supplemental = readings.filter(function (item) { return getInstructionalText(item).role === 'supplemental' && readableArtifactText(item).trim(); });
    var adaptations = readings.filter(function (item) { return ['analysis', 'simplified'].indexOf(item.type) !== -1 && getInstructionalText(item).form === 'adapted'; });
    var unspecified = adaptations.filter(function (item) { return getInstructionalText(item).role === 'unspecified'; });
    var unauthorized = adaptations.filter(function (item) { return getInstructionalText(item).role === 'primary' && !isAuthorizedAdaptedPrimary(item); });
    var missingSource = adaptations.filter(function (item) {
      var snapshot = getSourceSnapshot(item);
      return !snapshot || !readings.some(function (candidate) {
        return candidate !== item && sameReadingSourceFamily(candidate, item) && getInstructionalText(candidate).form !== 'adapted'
          && readableArtifactText(candidate) === snapshot.text
          && (candidate.type === 'analysis' || isSupportedOriginal(candidate));
      });
    });
    var missingPrimary = adaptations.filter(function (item) {
      return !primary.some(function (candidate) { return candidate === item || sameReadingSourceFamily(candidate, item); });
    });
    return { items: readings, primary: primary, supplemental: supplemental, unspecifiedAdapted: unspecified,
      unauthorizedPrimaryAdaptations: unauthorized, missingSourceCompanions: missingSource,
      missingPrimaryCompanions: missingPrimary, hasPrimary: primary.length > 0,
      hasSupplementalWithoutPrimary: supplemental.some(function (item) {
        return !primary.some(function (candidate) { return sameReadingSourceFamily(candidate, item); });
      })
    };
  }


  function isSourceTextBoundary(text, offset) {
    if (offset <= 0 || offset >= text.length) return true;
    var before = text.charCodeAt(offset - 1);
    var after = text.charCodeAt(offset);
    return !(before >= 0xD800 && before <= 0xDBFF && after >= 0xDC00 && after <= 0xDFFF);
  }

  function readingSupportScope(value) {
    if (!isObject(value) || ['analysis', 'simplified'].indexOf(value.type) === -1) return null;
    var snapshot = getSourceSnapshot(value);
    return { sourceFamilyId: getReadingSourceFamilyId(value), unitId: readingUnit(value),
      ownerArtifactId: value.id == null ? null : String(value.id),
      sourceFingerprint: snapshot && snapshot.fingerprint, preserved: isSupportedOriginal(value) };
  }

  function readingSupportScopeMismatch(scope, envelope) {
    if (!scope) return false;
    var familyMismatch = envelope.sourceFamilyId && scope.sourceFamilyId && String(envelope.sourceFamilyId) !== String(scope.sourceFamilyId);
    // Moving the same saved original keeps its own curation. A different artifact
    // cannot borrow supports from another lesson merely because its prose matches.
    var samePreservedOwner = scope.preserved && scope.ownerArtifactId && envelope.ownerArtifactId
      && String(envelope.ownerArtifactId) === scope.ownerArtifactId
      && envelope.sourceFingerprint === scope.sourceFingerprint
      && envelope.sourceFamilyId && String(envelope.sourceFamilyId) === String(scope.sourceFamilyId);
    return !!familyMismatch || (Object.prototype.hasOwnProperty.call(envelope, 'unitId')
      && normalizeReadingUnitId(envelope.unitId) !== scope.unitId && !samePreservedOwner);
  }

  function sameSupportRange(left, right) {
    return left.start === right.start && left.end === right.end && left.quote === right.quote;
  }

  function overlappingSupportRanges(left, right) {
    return left.start < right.end && left.end > right.start;
  }

  function validSupportAnchor(snapshot, entry) {
    return !!snapshot && isObject(entry) && Number.isInteger(entry.start) && Number.isInteger(entry.end)
      && entry.start >= 0 && entry.end > entry.start && entry.end <= snapshot.text.length
      && isSourceTextBoundary(snapshot.text, entry.start) && isSourceTextBoundary(snapshot.text, entry.end)
      && typeof entry.quote === 'string' && snapshot.text.slice(entry.start, entry.end) === entry.quote;
  }

  // An optional picture beside a word support (a Mulberry symbol or a screened
  // photo), stored inline so students see exactly the pixels that were checked.
  // Each picture is a small copy and a reading's pictures share one budget,
  // earliest first, so saves and student packs stay light. (Live sessions strip
  // every image app-wide; the written support still travels.) A bad or
  // over-budget picture is dropped, never the written support.
  var SUPPORT_PICTURE_MAX_CHARS = 32000;
  var SUPPORT_PICTURES_TOTAL_CHARS = 64000;
  function normalizeSupportImage(value) {
    if (!isObject(value)) return null;
    var src = typeof value.src === 'string' ? value.src : '';
    if (src.length > SUPPORT_PICTURE_MAX_CHARS || !/^data:image\/(png|jpeg|gif|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/i.test(src)) return null;
    var https = function (url) { url = typeof url === 'string' ? url.trim() : ''; return /^https:\/\//i.test(url) ? url.slice(0, 2000) : ''; };
    var credit = isObject(value.attribution) ? value.attribution : {};
    var attribution = { set: cleanText(credit.set, 120), author: cleanText(credit.author, 160), license: cleanText(credit.license, 120), via: cleanText(credit.via, 120), url: https(credit.url) };
    if (cleanText(credit.title, 160)) attribution.title = cleanText(credit.title, 160);
    if (https(credit.licenseUrl)) attribution.licenseUrl = https(credit.licenseUrl);
    return {
      src: src,
      alt: cleanText(value.alt, 250),
      altSource: value.altSource === 'vision' ? 'vision' : 'author',
      source: value.source === 'mulberry' || value.source === 'wikimedia' ? value.source : 'upload',
      attribution: attribution.set || attribution.author ? attribution : null
    };
  }
  function readingSupportPictureBudget(supports) {
    var used = 0;
    (isObject(supports) && Array.isArray(supports.annotations) ? supports.annotations : []).forEach(function (entry) {
      if (isObject(entry) && isObject(entry.image) && typeof entry.image.src === 'string') used += entry.image.src.length;
    });
    return { used: used, total: SUPPORT_PICTURES_TOTAL_CHARS, perPicture: SUPPORT_PICTURE_MAX_CHARS, remaining: Math.max(0, SUPPORT_PICTURES_TOTAL_CHARS - used) };
  }

  // Anchors are half-open UTF-16 ranges in canonical sourceSnapshot.text.
  // Curation is additive metadata; neither annotations nor removals change prose.
  function validateReadingSupports(snapshotValue, candidates) {
    var snapshot = getSourceSnapshot(snapshotValue);
    var scope = readingSupportScope(snapshotValue);
    var envelope = isObject(candidates) ? candidates : {};
    var entries = Array.isArray(candidates) ? candidates : (Array.isArray(envelope.annotations) ? envelope.annotations : []);
    var previousRejected = Number.isInteger(envelope.rejectedCount) && envelope.rejectedCount > 0 ? envelope.rejectedCount : 0;
    var annotations = [], suppressedAnnotations = [];
    var rejectedCount = previousRejected;
    var invalidSource = !snapshot || (envelope.schemaVersion !== undefined && envelope.schemaVersion !== 1)
      || (envelope.sourceFingerprint && envelope.sourceFingerprint !== snapshot.fingerprint)
      || readingSupportScopeMismatch(scope, envelope);
    var ids = Object.create(null);
    var pictureChars = 0;
    (Array.isArray(envelope.suppressedAnnotations) ? envelope.suppressedAnnotations : []).forEach(function (entry) {
      if (invalidSource || !validSupportAnchor(snapshot, entry)) { rejectedCount++; return; }
      if (!suppressedAnnotations.some(function (current) { return sameSupportRange(current, entry); })) {
        suppressedAnnotations.push({ start: entry.start, end: entry.end, quote: entry.quote });
      }
    });
    entries.forEach(function (entry) {
      var valid = !invalidSource && validSupportAnchor(snapshot, entry)
        && typeof entry.text === 'string' && !!entry.text.trim() && entry.text.length <= 2400
        && ['gloss', 'definition', 'explanation'].indexOf(entry.kind || 'gloss') !== -1;
      var id = valid ? cleanText(entry.id, 160) || 'support-' + entry.start + '-' + entry.end : '';
      if (valid && suppressedAnnotations.some(function (removed) { return overlappingSupportRanges(removed, entry); })) return;
      if (valid && (ids[id] || annotations.some(function (annotation) { return overlappingSupportRanges(entry, annotation); }))) valid = false;
      if (!valid) { rejectedCount++; return; }
      ids[id] = true;
      var accepted = {
        id: id, kind: entry.kind || 'gloss', start: entry.start, end: entry.end,
        quote: entry.quote, text: entry.text,
        language: cleanText(entry.language, 80) || snapshot.language,
        origin: entry.origin === 'educator' ? 'educator' : 'generated',
        pinned: entry.pinned === true,
        priority: entry.priority === 'essential' ? 'essential' : 'helpful'
      };
      // Only a teacher's own support carries a picture; a generated suggestion never does.
      var picture = accepted.origin === 'educator' ? normalizeSupportImage(entry.image) : null;
      if (picture && pictureChars + picture.src.length <= SUPPORT_PICTURES_TOTAL_CHARS) {
        pictureChars += picture.src.length;
        accepted.image = picture;
      }
      annotations.push(accepted);
    });
    annotations.sort(function (left, right) { return left.start - right.start; });
    suppressedAnnotations.sort(function (left, right) { return left.start - right.start; });
    var coverageInvalid = false;
    var seenCoverage = [];
    function validatedRanges(value) {
      if (!Array.isArray(value)) return [];
      var ranges = [];
      value.forEach(function (entry) {
        var valid = !invalidSource && isObject(entry) && Number.isInteger(entry.start) && Number.isInteger(entry.end)
          && entry.start >= 0 && entry.end > entry.start && entry.end <= snapshot.text.length
          && isSourceTextBoundary(snapshot.text, entry.start) && isSourceTextBoundary(snapshot.text, entry.end);
        if (valid && seenCoverage.some(function (range) { return overlappingSupportRanges(entry, range); })) valid = false;
        if (!valid) { coverageInvalid = true; return; }
        var range = { start: entry.start, end: entry.end };
        if (entry.reason) range.reason = cleanText(entry.reason, 100);
        ranges.push(range);
        seenCoverage.push(range);
      });
      return ranges.sort(function (left, right) { return left.start - right.start; });
    }
    var coveredRanges = validatedRanges(envelope.coveredRanges);
    var skippedRanges = validatedRanges(envelope.skippedRanges);
    var result = {
      schemaVersion: 1, sourceFingerprint: snapshot ? snapshot.fingerprint : '', annotations: annotations,
      suppressedAnnotations: suppressedAnnotations, rejectedCount: rejectedCount,
      coveredRanges: coveredRanges, skippedRanges: skippedRanges,
      status: invalidSource || envelope.status === 'unavailable' ? 'unavailable' : (rejectedCount || skippedRanges.length || coverageInvalid || envelope.status === 'partial' ? 'partial' : 'complete')
    };
    if (scope || envelope.sourceFamilyId) result.sourceFamilyId = scope ? scope.sourceFamilyId : cleanText(envelope.sourceFamilyId, 200) || null;
    if (scope || Object.prototype.hasOwnProperty.call(envelope, 'unitId')) result.unitId = scope ? scope.unitId : normalizeReadingUnitId(envelope.unitId);
    if (scope || envelope.ownerArtifactId) result.ownerArtifactId = scope ? scope.ownerArtifactId : cleanText(envelope.ownerArtifactId, 200) || null;
    return result;
  }

  function requireReadingSupportState(snapshotValue, supports) {
    var snapshot = getSourceSnapshot(snapshotValue);
    var envelope = isObject(supports) ? supports : {};
    if (!snapshot) throw new Error('A complete saved source is required to edit word supports.');
    if ((envelope.schemaVersion !== undefined && envelope.schemaVersion !== 1)
      || (envelope.sourceFingerprint && envelope.sourceFingerprint !== snapshot.fingerprint)
      || readingSupportScopeMismatch(readingSupportScope(snapshotValue), envelope)) {
      throw new Error('These word supports belong to a different source or lesson. Reopen the matching original.');
    }
    return validateReadingSupports(snapshotValue, supports);
  }

  function upsertReadingSupport(snapshotValue, supports, annotation) {
    var current = requireReadingSupportState(snapshotValue, supports);
    if (!isObject(annotation)) throw new Error('Choose an exact source occurrence and enter its word support.');
    var existing = current.annotations.find(function (entry) { return annotation.id ? entry.id === annotation.id : sameSupportRange(entry, annotation); });
    var proposed = Object.assign({}, existing || {}, annotation, { origin: 'educator' });
    var checked = validateReadingSupports(snapshotValue, [proposed]);
    if (checked.annotations.length !== 1 || checked.rejectedCount) throw new Error('Choose an exact source occurrence and enter a nonempty word support of at most 2,400 characters.');
    proposed = checked.annotations[0];
    var others = current.annotations.filter(function (entry) { return !existing || entry.id !== existing.id; });
    if (others.some(function (entry) { return entry.id === proposed.id || overlappingSupportRanges(entry, proposed); })) {
      throw new Error('This word support overlaps another support. Edit or remove that support first.');
    }
    // An intentional teacher addition restores its selected occurrence, including
    // a narrower or wider range than an earlier removal.
    return validateReadingSupports(snapshotValue, Object.assign({}, current, {
      annotations: others.concat([proposed]),
      suppressedAnnotations: current.suppressedAnnotations.filter(function (entry) { return !overlappingSupportRanges(entry, proposed); }),
      status: current.status === 'unavailable' ? 'partial' : current.status
    }));
  }

  function removeReadingSupport(snapshotValue, supports, id) {
    var current = requireReadingSupportState(snapshotValue, supports);
    var removed = current.annotations.find(function (entry) { return entry.id === id; });
    if (!removed) throw new Error('That word support is no longer available. Reopen the support list.');
    return validateReadingSupports(snapshotValue, Object.assign({}, current, {
      annotations: current.annotations.filter(function (entry) { return entry.id !== id; }),
      suppressedAnnotations: current.suppressedAnnotations.concat([{ start: removed.start, end: removed.end, quote: removed.quote }])
    }));
  }

  function setReadingSupportPinned(snapshotValue, supports, id, pinned) {
    var current = requireReadingSupportState(snapshotValue, supports);
    var selected = current.annotations.find(function (entry) { return entry.id === id; });
    if (!selected) throw new Error('That word support is no longer available. Reopen the support list.');
    return validateReadingSupports(snapshotValue, Object.assign({}, current, {
      annotations: current.annotations.map(function (entry) { return entry.id === id ? Object.assign({}, entry, { pinned: pinned === true }) : entry; })
    }));
  }

  function mergeReadingSupports(snapshotValue, supports, regenerated) {
    var current = requireReadingSupportState(snapshotValue, supports);
    var incoming = requireReadingSupportState(snapshotValue, regenerated);
    var retained = current.annotations.filter(function (entry) {
      return entry.origin === 'educator' || entry.pinned || incoming.status === 'unavailable'
        || incoming.skippedRanges.some(function (range) { return overlappingSupportRanges(range, entry); });
    });
    // Regeneration can suggest priority, never educator provenance or pins.
    var generated = incoming.annotations.filter(function (entry) {
      return !retained.some(function (saved) { return overlappingSupportRanges(saved, entry); })
        && !current.suppressedAnnotations.some(function (removed) { return overlappingSupportRanges(removed, entry); });
    }).map(function (entry) { return Object.assign({}, entry, { origin: 'generated', pinned: false }); });
    return validateReadingSupports(snapshotValue, Object.assign({}, incoming, {
      annotations: retained.concat(generated), suppressedAnnotations: current.suppressedAnnotations,
      status: incoming.status === 'unavailable' && retained.length ? 'partial' : incoming.status
    }));
  }

  // ── Word help on an ADAPTED text (opt-in; students see it only when shown) ──
  // Kept apart from readingSupports, which belongs to the original, as
  // adaptedReadingSupports on the adapted item. Anchors are ranges in the
  // adapted PASSAGE: the leading part of item.data before any English
  // translation or references. The envelope records the passage's length and
  // fingerprint, so an edited passage makes its word help stale instead of
  // pointing at the wrong words; text appended after the passage does not.
  var ADAPTED_TRANSLATION_MARKER = /\n?[ \t]*---[ \t]*ENGLISH TRANSLATION[ \t]*---/i;
  function isAdaptedReading(item) {
    return isObject(item) && item.type === 'simplified' && typeof item.data === 'string'
      && getInstructionalText(item).form === 'adapted';
  }
  function adaptedPassageLength(text) {
    var end = text.length;
    var marker = ADAPTED_TRANSLATION_MARKER.exec(text);
    if (marker) end = Math.min(end, marker.index);
    var helpers = typeof window !== 'undefined' && window.AlloModules && window.AlloModules.TextPipelineHelpers;
    if (helpers && typeof helpers.splitReferencesFromBody === 'function') {
      try {
        var split = helpers.splitReferencesFromBody(text.slice(0, end));
        // Only a split that leaves the passage as an exact prefix is usable.
        if (split && typeof split.body === 'string' && split.references && text.slice(0, split.body.length) === split.body) end = Math.min(end, split.body.length);
      } catch (_) {}
    }
    while (end > 0 && /\s/.test(text.charAt(end - 1))) end--;
    return end;
  }
  function adaptedSnapshotFor(item, length) {
    var config = isObject(item.config) ? item.config : {};
    return createSourceSnapshot(item.data.slice(0, length), {
      language: cleanText(item.language || config.language, 80) || 'English', sourceArtifactId: item.id,
      provenance: { selection: 'adapted-passage', origin: 'adapted-text' }
    });
  }
  // The passage word help is anchored to, and the word help keyed to it: rebuilt
  // from a stored envelope's length (checked against its fingerprint), or taken
  // fresh from the text. When text was only ADDED after that passage, every
  // anchor is still in place, so the word help carries onto the longer passage
  // and the new text can get word help too.
  function adaptedSupportState(item, supports) {
    if (!isAdaptedReading(item)) return null;
    var envelope = isObject(supports) && Number.isInteger(supports.passageLength) ? supports : null;
    var currentLength = adaptedPassageLength(item.data);
    if (!envelope) return currentLength > 0 ? { snapshot: adaptedSnapshotFor(item, currentLength), supports: supports } : null;
    var length = envelope.passageLength;
    if (length <= 0 || length > item.data.length) return null;
    var stored = adaptedSnapshotFor(item, length);
    if (envelope.sourceFingerprint !== stored.fingerprint) return null;
    if (currentLength > length) {
      var grown = adaptedSnapshotFor(item, currentLength);
      // "ran" growing into "ranted" changed the last word: that is an edit, not an addition.
      if (!isWordEdge(grown.text, length)) return null;
      return { snapshot: grown, supports: Object.assign({}, envelope, { sourceFingerprint: grown.fingerprint, passageLength: currentLength }) };
    }
    return { snapshot: stored, supports: envelope };
  }
  function getAdaptedSupportSnapshot(item, supports) {
    var state = adaptedSupportState(item, supports);
    return state ? state.snapshot : null;
  }
  function adaptedEnvelope(result, snapshot, shown) {
    return Object.assign({}, result, { passageLength: snapshot.text.length, shown: shown === true });
  }
  function validateAdaptedReadingSupports(item, supports) {
    var state = adaptedSupportState(item, supports);
    if (!state) {
      return { schemaVersion: 1, annotations: [], suppressedAnnotations: [], rejectedCount: 0, coveredRanges: [], skippedRanges: [],
        status: isObject(supports) ? 'stale' : 'unavailable', passageLength: 0, shown: false };
    }
    return adaptedEnvelope(validateReadingSupports(state.snapshot, state.supports || {}), state.snapshot, isObject(supports) && supports.shown === true);
  }
  function requireAdaptedState(item, supports) {
    if (!isAdaptedReading(item)) throw new Error('Open an adapted reading to edit its word help.');
    var state = adaptedSupportState(item, supports);
    if (!state) throw new Error('The adapted text changed after its word help was made. Refresh its suggestions to start again.');
    return state;
  }
  function upsertAdaptedReadingSupport(item, supports, annotation) {
    var state = requireAdaptedState(item, supports);
    return adaptedEnvelope(upsertReadingSupport(state.snapshot, state.supports, annotation), state.snapshot, isObject(supports) && supports.shown === true);
  }
  function removeAdaptedReadingSupport(item, supports, id) {
    var state = requireAdaptedState(item, supports);
    return adaptedEnvelope(removeReadingSupport(state.snapshot, state.supports, id), state.snapshot, supports.shown === true);
  }
  function setAdaptedReadingSupportPinned(item, supports, id, pinned) {
    var state = requireAdaptedState(item, supports);
    return adaptedEnvelope(setReadingSupportPinned(state.snapshot, state.supports, id, pinned), state.snapshot, supports.shown === true);
  }
  function setAdaptedReadingSupportsShown(item, supports, shown) {
    var state = requireAdaptedState(item, supports);
    return adaptedEnvelope(validateReadingSupports(state.snapshot, state.supports || {}), state.snapshot, shown);
  }
  // Suggestions are generated against this snapshot: the current word help's,
  // or a fresh one when there is none yet or the passage was edited.
  function adaptedGenerationSnapshot(item, supports) {
    return getAdaptedSupportSnapshot(item, supports) || getAdaptedSupportSnapshot(item, null);
  }
  // Word help students can see stays as the teacher last reviewed it: anything
  // that adds explanations they have not read (new suggestions, explanations
  // kept after an edit, or copied from the original) hides it until they show it again.
  function supportKey(entry) { return entry.start + ':' + entry.end + ':' + entry.text; }
  function addsUnreviewed(before, after) {
    var seen = {};
    before.forEach(function (entry) { seen[supportKey(entry)] = true; });
    return after.some(function (entry) { return !seen[supportKey(entry)]; });
  }
  // Refresh keeps teacher edits, pins and removals; stale word help starts over.
  function mergeAdaptedReadingSupports(item, supports, regenerated) {
    var state = adaptedSupportState(item, supports);
    // Stale word help: keep the teacher's explanations and removals whose words
    // survived the edit (as Keep does), then add the suggestions to those.
    var stale = !state && isObject(supports);
    if (stale) {
      var fresh = getAdaptedSupportSnapshot(item, null);
      if (fresh) state = { snapshot: fresh, supports: rebaseAdaptedReadingSupports(item, supports) };
    }
    var snapshot = state ? state.snapshot : getAdaptedSupportSnapshot(item, null);
    if (!snapshot) throw new Error('This adapted reading has no passage to support.');
    var before = state ? validateReadingSupports(snapshot, state.supports || {}).annotations : [];
    var merged = state ? mergeReadingSupports(snapshot, state.supports, regenerated) : validateReadingSupports(snapshot, regenerated);
    return adaptedEnvelope(merged, snapshot, !stale && !!state && isObject(supports) && supports.shown === true && !addsUnreviewed(before, merged.annotations));
  }
  // Start over on the current passage, e.g. after an edit left word help stale.
  function clearAdaptedReadingSupports(item) {
    var snapshot = getAdaptedSupportSnapshot(item, null);
    if (!snapshot) throw new Error('This adapted reading has no passage to support.');
    return adaptedEnvelope(validateReadingSupports(snapshot, {}), snapshot, false);
  }
  // After an edit, keep the word help whose words are still in the passage: each
  // entry moves to the nearest whole-word match of its own quote. Removed
  // suggestions move the same way, so a refresh does not bring them back.
  // Word edges from the platform's word segmenter, so Chinese, Japanese and Thai
  // (no spaces) work; without one, a letter or digit on both sides - read as whole
  // characters, not UTF-16 halves - means the edge is inside a word.
  // A few recent texts: callers alternate between a stored passage and the text
  // on screen, and a one-text cache re-segmented both for every word.
  var recentWordEdges = [];
  function wordEdgesOf(text) {
    for (var i = 0; i < recentWordEdges.length; i++) if (recentWordEdges[i].text === text) return recentWordEdges[i].edges;
    var edges = null;
    try {
      if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
        edges = new Set([0, text.length]);
        Array.from(new Intl.Segmenter(undefined, { granularity: 'word' }).segment(text)).forEach(function (part) {
          edges.add(part.index); edges.add(part.index + part.segment.length);
        });
      }
    } catch (_) { edges = null; }
    recentWordEdges.unshift({ text: text, edges: edges });
    recentWordEdges.length = Math.min(recentWordEdges.length, 4);
    return edges;
  }
  function isWordEdge(text, index) {
    if (index <= 0 || index >= text.length) return true;
    // "heron" ends before a possessive ('s), whichever way the platform splits words.
    if (/^['’]s(?![\p{L}\p{M}\p{N}])/u.test(text.slice(index, index + 3))) return true;
    var edges = wordEdgesOf(text);
    if (edges) return edges.has(index);
    var wordChar = /[\p{L}\p{M}\p{N}]/u;
    var before = text.codePointAt(index - 1);
    if (index >= 2 && before >= 0xDC00 && before <= 0xDFFF) before = text.codePointAt(index - 2);
    return !(wordChar.test(String.fromCodePoint(before)) && wordChar.test(String.fromCodePoint(text.codePointAt(index))));
  }
  // The nearest free whole-word match of quote: { start, end }, or null. With
  // anyCase, capitals do not matter (compared match by match, so one unusual
  // letter elsewhere in the passage cannot switch it off).
  function nearestWholeWordMatch(text, quote, near, taken, anyCase) {
    var pattern, match, best = null;
    try { pattern = new RegExp(quote.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), anyCase ? 'giu' : 'gu'); } catch (_) { return null; }
    while ((match = pattern.exec(text))) {
      var at = match.index, end = at + match[0].length;
      pattern.lastIndex = at + 1;
      if (!match[0].length || !isWordEdge(text, at) || !isWordEdge(text, end)) continue;
      if (taken.some(function (range) { return at < range.end && end > range.start; })) continue;
      if (!best || Math.abs(at - near) < Math.abs(best.start - near)) best = { start: at, end: end };
    }
    return best;
  }
  function rebaseAdaptedReadingSupports(item, supports) {
    var snapshot = getAdaptedSupportSnapshot(item, null);
    if (!snapshot) throw new Error('This adapted reading has no passage to support.');
    var stored = isObject(supports) ? supports : {};
    // Kept entries place first, so a removed suggestion never lands on one and hides it.
    var taken = [];
    var move = function (list) {
      return (Array.isArray(list) ? list : []).map(function (entry) {
        if (!isObject(entry) || typeof entry.quote !== 'string' || !entry.quote.trim()) return null;
        var hit = nearestWholeWordMatch(snapshot.text, entry.quote, Number.isInteger(entry.start) ? entry.start : 0, taken);
        if (!hit) return null;
        taken.push(hit);
        return Object.assign({}, entry, { start: hit.start, end: hit.end });
      }).filter(Boolean);
    };
    var moved = validateReadingSupports(snapshot, { annotations: move(stored.annotations), suppressedAnnotations: move(stored.suppressedAnnotations) });
    return adaptedEnvelope(moved, snapshot, false);
  }
  // Reuse the original's explanations for words the adapted passage kept, at
  // each word's first free whole-word match. Words already explained here, or
  // removed here by the teacher, are left alone.
  function importOriginalSupportsIntoAdapted(item, supports, originalAnnotations) {
    var state = requireAdaptedState(item, supports);
    var snapshot = state.snapshot;
    var current = validateReadingSupports(snapshot, state.supports || {});
    var seen = {}, ids = {}, added = [];
    current.annotations.concat(current.suppressedAnnotations).forEach(function (entry) { seen[entry.quote.toLowerCase()] = true; ids[entry.id] = true; });
    var taken = current.annotations.concat(current.suppressedAnnotations).map(function (entry) { return { start: entry.start, end: entry.end }; });
    (Array.isArray(originalAnnotations) ? originalAnnotations : []).forEach(function (entry) {
      if (!isObject(entry) || typeof entry.quote !== 'string' || !entry.quote.trim() || seen[entry.quote.toLowerCase()]) return;
      var hit = nearestWholeWordMatch(snapshot.text, entry.quote, 0, taken, true);
      if (!hit) return;
      var start = hit.start, end = hit.end, id = 'original-' + start + '-' + end;
      seen[entry.quote.toLowerCase()] = true;
      taken.push(hit);
      if (ids[id]) return;
      added.push(Object.assign({}, entry, { id: id, start: start, end: end, quote: snapshot.text.slice(start, end) }));
    });
    var merged = validateReadingSupports(snapshot, Object.assign({}, current, { annotations: current.annotations.concat(added) }));
    return adaptedEnvelope(merged, snapshot, false);
  }

  function selectReadingSupports(snapshotValue, supports, options) {
    var checked = validateReadingSupports(snapshotValue, supports);
    if (!options || options.density !== 'light') return checked.annotations;
    var snapshot = getSourceSnapshot(snapshotValue);
    if (!snapshot) return [];
    var paragraphs = [], paragraphStart = 0;
    var breaks = /(?:\r\n|\n|\r(?!\n))[\t ]*(?:\r\n|\n|\r(?!\n))/g, match;
    while ((match = breaks.exec(snapshot.text))) {
      paragraphs.push({ start: paragraphStart, end: match.index });
      paragraphStart = match.index + match[0].length;
    }
    paragraphs.push({ start: paragraphStart, end: snapshot.text.length });
    var selected = checked.annotations.filter(function (entry) { return entry.pinned; });
    paragraphs.forEach(function (paragraph) {
      var words = [], segmenter;
      if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
        try { segmenter = new Intl.Segmenter(undefined, { granularity: 'word' }); } catch (_) {}
      }
      var text = snapshot.text.slice(paragraph.start, paragraph.end);
      if (segmenter) for (var word of segmenter.segment(text)) { if (word.isWordLike) words.push(paragraph.start + word.index); }
      else {
        var pattern = /[\p{L}\p{M}\p{N}]+(?:[’'-][\p{L}\p{M}\p{N}]+)*/gu, found;
        while ((found = pattern.exec(text))) words.push(paragraph.start + found.index);
      }
      function wordIndex(offset) { var index = 0; while (index < words.length && words[index] < offset) index++; return index; }
      var maximum = Math.max(1, Math.min(3, Math.ceil(words.length / 55)));
      var inParagraph = function (entry) { return entry.start >= paragraph.start && entry.start < paragraph.end; };
      var candidates = checked.annotations.filter(function (entry) { return !entry.pinned && inParagraph(entry); });
      candidates.sort(function (left, right) {
        return Number(right.priority === 'essential') - Number(left.priority === 'essential')
          || Number(right.origin === 'educator') - Number(left.origin === 'educator') || left.start - right.start;
      });
      candidates.forEach(function (entry) {
        var nearby = selected.filter(inParagraph);
        if (nearby.length >= maximum) return;
        if (nearby.some(function (other) {
          var earlier = other.start < entry.start ? other : entry, later = earlier === other ? entry : other;
          return wordIndex(later.start) - wordIndex(earlier.end) < 8;
        })) return;
        selected.push(entry);
      });
    });
    return selected.sort(function (left, right) { return left.start - right.start; });
  }

  function _sourceFooterLabel(value) {
    return String(value || '')
      .trim()
      .replace(/^#{1,6}\s+/, '')
      .replace(/\s+#+\s*$/, '')
      .replace(/^[*_]+|[*_]+$/g, '')
      .replace(/:\s*$/, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function _isSourceFooterBoundary(value) {
    var raw = String(value || '').trim();
    if (!raw) return false;
    var label = _sourceFooterLabel(raw);
    if (/^(?:source text references|accuracy check references|referenced sources|verified sources|sources|references|works? cited|bibliography|citations)$/.test(label)) return true;
    if (/^(?:source[- ]support|source[- ]support check|citation support|grounding support)$/.test(label)) return true;
    if (/^(?:about this document|ai (?:use |assistance )?disclosure|ai-generated content disclosure|artificial intelligence disclosure)$/.test(label)) return true;
    var proseLabel = raw
      .replace(/^\s*(?:>|[-*+]\s+)?/, '')
      .replace(/^[*_]+/, '')
      .replace(/[*_]+\s*$/, '')
      .trim();
    return /^(?:Source-support check\s*\(automated|Partial-grounding notice\s*:|Source-attribution notice\s*:|About this document\s*:\s*drafted with AI assistance|(?:AI(?: use| assistance|-generated content)?|Artificial intelligence) disclosure\s*:)/i.test(proseLabel);
  }

  /**
   * Return the canonical prose scope used for generated-source readability.
   *
   * The generated title and application-authored evidence/disclosure trailers
   * are artifact chrome, not learner prose. Standalone Markdown headings are
   * excluded because the host tokenizer treats every newline-delimited heading
   * label as a sentence. Inline Markdown anchors are deliberately left intact
   * so the readability tokenizer can retain their visible labels.
   */
  function extractMeasurableSourceBody(value) {
    var artifact = String(value === undefined || value === null ? '' : value)
      .replace(/\r\n?/g, '\n')
      .replace(/^\uFEFF/, '')
      .replace(/[ \t]+$/gm, '')
      .trim();
    if (!artifact) return '';
    var lines = artifact.split('\n');
    var first = lines.length ? lines[0].trim() : '';
    if (/^Title\s*:\s*\S/i.test(first) || /^#(?!#)\s+\S/.test(first)) lines.shift();

    var cutoff = lines.length;
    for (var i = 0; i < lines.length; i++) {
      if (_isSourceFooterBoundary(lines[i])) {
        cutoff = i;
        break;
      }
    }
    lines = lines.slice(0, cutoff);
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
    if (lines.length && /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(lines[lines.length - 1])) lines.pop();
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();

    lines = lines.filter(function (line) {
      return !/^\s{0,3}#{1,6}[ \t]+.+?[ \t]*#*[ \t]*$/.test(String(line));
    });
    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  function _finiteNumber(value) {
    if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) return null;
    var numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  function _readabilitySnapshot(value) {
    if (!isObject(value)) return null;
    var score = _finiteNumber(value.score);
    var words = _finiteNumber(value.words);
    var sentences = _finiteNumber(value.sentences);
    var syllables = _finiteNumber(value.syllables);
    return {
      score: score === null ? null : score.toFixed(1),
      words: words,
      sentences: sentences,
      syllables: syllables
    };
  }

  function measureSourceComplexity(artifactText, calculateReadability) {
    if (typeof calculateReadability !== 'function') return null;
    var artifact = String(artifactText === undefined || artifactText === null ? '' : artifactText)
      .replace(/\r\n?/g, '\n')
      .trim();
    var body = extractMeasurableSourceBody(artifact);
    if (!body) return null;
    var artifactStats = null;
    var bodyStats = null;
    try {
      artifactStats = calculateReadability(artifact);
      bodyStats = body === artifact ? artifactStats : calculateReadability(body);
    } catch (_) {
      return null;
    }
    var snapshot = _readabilitySnapshot(bodyStats);
    if (!snapshot) return null;
    var hasCounts = snapshot.words !== null && snapshot.words > 0
      && snapshot.sentences !== null && snapshot.sentences > 0
      && snapshot.syllables !== null && snapshot.syllables >= 0;
    var averageSentenceLength = hasCounts ? snapshot.words / snapshot.sentences : null;
    var averageSyllablesPerWord = hasCounts ? snapshot.syllables / snapshot.words : null;
    var rawGrade = hasCounts
      ? (0.39 * averageSentenceLength) + (11.8 * averageSyllablesPerWord) - 15.59
      : _finiteNumber(snapshot.score);
    var clampedGrade = rawGrade === null ? _finiteNumber(snapshot.score) : Math.max(0, Math.min(18, rawGrade));
    var displayScore = clampedGrade === null ? null : clampedGrade.toFixed(1);
    var displayGrade = displayScore === null ? null : Number(displayScore);
    return {
      measurementVersion: SOURCE_COMPLEXITY_MEASUREMENT_VERSION,
      extractionVersion: SOURCE_BODY_EXTRACTION_VERSION,
      measurementScope: 'source-body',
      method: 'flesch-kincaid-en',
      score: displayScore,
      rawFleschKincaidGrade: rawGrade,
      displayFleschKincaidGrade: displayGrade,
      averageSentenceLength: averageSentenceLength,
      averageSyllablesPerWord: averageSyllablesPerWord,
      words: snapshot.words,
      sentences: snapshot.sentences,
      syllables: snapshot.syllables,
      bodyCounts: {
        characters: body.length,
        words: snapshot.words,
        sentences: snapshot.sentences,
        syllables: snapshot.syllables
      },
      artifactCharacterCount: artifact.length,
      bodyCharacterCount: body.length,
      artifactFingerprint: fingerprintText(artifact),
      bodyFingerprint: fingerprintText(body),
      legacyArtifactMetrics: _readabilitySnapshot(artifactStats)
    };
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
    var sourceCarriesMeasurement = source.measuredGrade !== undefined || source.score !== undefined
      || source.measurementVersion !== undefined || source.rawFleschKincaidGrade !== undefined;
    var metricSource = sourceCarriesMeasurement ? source : opts;
    var rawFk = _finiteNumber(metricSource.rawFleschKincaidGrade);
    var displayFk = _finiteNumber(metricSource.displayFleschKincaidGrade);
    if (displayFk === null && hasMeasured) displayFk = measured;
    var averageSentenceLength = _finiteNumber(metricSource.averageSentenceLength);
    var averageSyllablesPerWord = _finiteNumber(metricSource.averageSyllablesPerWord);
    var rawBodyCounts = isObject(metricSource.bodyCounts) ? metricSource.bodyCounts : {};
    var hasBodyCounts = Object.keys(rawBodyCounts).length > 0;
    var bodyCounts = hasBodyCounts ? {
      characters: _finiteNumber(rawBodyCounts.characters),
      words: _finiteNumber(rawBodyCounts.words),
      sentences: _finiteNumber(rawBodyCounts.sentences),
      syllables: _finiteNumber(rawBodyCounts.syllables)
    } : null;
    var legacyArtifactMetrics = _readabilitySnapshot(metricSource.legacyArtifactMetrics);
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
      language: language,
      measurementScope: cleanText(metricSource.measurementScope, 40),
      measurementVersion: cleanText(metricSource.measurementVersion, 80),
      extractionVersion: cleanText(metricSource.extractionVersion, 80),
      rawFleschKincaidGrade: rawFk,
      displayFleschKincaidGrade: displayFk,
      averageSentenceLength: averageSentenceLength,
      averageSyllablesPerWord: averageSyllablesPerWord,
      bodyCounts: bodyCounts,
      artifactCharacterCount: _finiteNumber(metricSource.artifactCharacterCount),
      bodyCharacterCount: _finiteNumber(metricSource.bodyCharacterCount),
      artifactFingerprint: cleanText(metricSource.artifactFingerprint, 120),
      bodyFingerprint: cleanText(metricSource.bodyFingerprint, 120),
      legacyArtifactMetrics: legacyArtifactMetrics
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
    var authorized = form === 'adapted' && rawAuthorization.authorized === true && authorizationSource === 'educator';
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
    next.complexity.measurementScope = '';
    next.complexity.measurementVersion = '';
    next.complexity.extractionVersion = '';
    next.complexity.rawFleschKincaidGrade = null;
    next.complexity.displayFleschKincaidGrade = null;
    next.complexity.averageSentenceLength = null;
    next.complexity.averageSyllablesPerWord = null;
    next.complexity.bodyCounts = null;
    next.complexity.artifactCharacterCount = null;
    next.complexity.bodyCharacterCount = null;
    next.complexity.artifactFingerprint = '';
    next.complexity.bodyFingerprint = '';
    next.complexity.legacyArtifactMetrics = null;
    return next;
  }

  function _instructionalConstraintsFromStandards(standardsContext) {
    var context = isObject(standardsContext) ? standardsContext : {};
    if (isObject(context.instructionalConstraints)
        && cleanText(context.instructionalConstraints.textAccessExpectation, 80) !== 'unspecified') {
      return context.instructionalConstraints;
    }
    var entries = Array.isArray(context.standards) ? context.standards : [];
    for (var i = 0; i < entries.length; i++) {
      var constraints = entries[i] && entries[i].instructionalConstraints;
      if (isObject(constraints) && cleanText(constraints.textAccessExpectation, 80) !== 'unspecified') {
        return constraints;
      }
    }
    return isObject(context.instructionalConstraints) ? context.instructionalConstraints : {};
  }

  function _standardsText(standardsContext, standardsInput) {
    var context = isObject(standardsContext) ? standardsContext : {};
    var entries = Array.isArray(context.standards) ? context.standards : [];
    var values = [standardsInput, context.inputText, context.promptText];
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      if (isObject(entry)) {
        values.push(entry.code, entry.label, entry.text, entry.statement, entry.description);
      } else {
        values.push(entry);
      }
    }
    return values.map(function (value) { return cleanText(value, 3600); }).filter(Boolean).join(' ');
  }

  /**
   * Resolve the two independent text-access decisions used by planning:
   * whether students must retain the primary text, and whether an adapted
   * companion should be included. A grade-level/complex-text requirement
   * affects only the former. Suppressing adaptation requires either an
   * educator choice or an explicit, sourced prohibition.
   */
  function deriveTextAccessPlan(raw, options) {
    var source = isObject(raw) ? raw : {};
    var opts = isObject(options) ? options : {};
    var standardsContext = source.standardsContext || opts.standardsContext || null;
    var constraints = _instructionalConstraintsFromStandards(standardsContext);
    var expectation = cleanText(constraints.textAccessExpectation, 80) || 'unspecified';
    var sourced = constraints.sourced === true
      || !!cleanText(constraints.basis || constraints.authority || constraints.sourceUrl || constraints.url, 600);
    var searchable = _standardsText(standardsContext, opts.standardsInput || opts.standards || '');
    var textComplexityRequirement = /\b(?:text complexity|appropriately complex text|grade[- ]level complex text|complex (?:literary|informational|source) texts?|independently and proficiently|high end of (?:the )?text complexity band)\b/i.test(searchable)
      || /\b(?:CCSS\.)?(?:ELA-LITERACY\.)?(?:RL|RI|RST|RH)\.[A-Z0-9-]+\.10\b/i.test(searchable);
    var standardRequiresPrimary = expectation === 'preserve-primary'
      || expectation === 'adaptation-prohibited'
      || textComplexityRequirement;
    var sourcedProhibition = sourced && expectation === 'adaptation-prohibited';

    var explicitAdaptedPolicy = cleanText(source.adaptedTextPolicy || opts.adaptedTextPolicy, 40);
    var adaptedTextPolicy = ADAPTED_TEXT_POLICIES.indexOf(explicitAdaptedPolicy) !== -1
      ? explicitAdaptedPolicy : 'include';
    if (adaptedTextPolicy === 'prohibited' && !sourcedProhibition) adaptedTextPolicy = 'omit';
    if (sourcedProhibition) adaptedTextPolicy = 'prohibited';

    var decisionSource = cleanText(source.adaptedTextPolicySource || opts.adaptedTextPolicySource, 40);
    if (sourcedProhibition) decisionSource = 'standard';
    else if (explicitAdaptedPolicy === 'prohibited') decisionSource = 'educator';
    else if (TEXT_ACCESS_DECISION_SOURCES.indexOf(decisionSource) === -1) {
      decisionSource = explicitAdaptedPolicy ? 'educator' : 'workflow-default';
    }

    var explicitPrimaryAccess = cleanText(source.primaryTextAccess || opts.primaryTextAccess, 40);
    var primaryTextAccess = PRIMARY_TEXT_ACCESS.indexOf(explicitPrimaryAccess) !== -1
      ? explicitPrimaryAccess : (standardRequiresPrimary ? 'required' : 'available');
    if (standardRequiresPrimary) primaryTextAccess = 'required';

    var reason = sourcedProhibition
      ? 'sourced-adaptation-prohibition'
      : (expectation === 'preserve-primary' && sourced
          ? 'sourced-primary-text-requirement'
          : (textComplexityRequirement
              ? 'standard-text-complexity-requirement'
              : (explicitAdaptedPolicy ? 'educator-choice' : 'default-access-companion')));
    return {
      primaryTextAccess: primaryTextAccess,
      adaptedTextPolicy: adaptedTextPolicy,
      adaptedTextPolicySource: decisionSource,
      textAccessReason: reason,
      standardRequiresPrimary: standardRequiresPrimary,
      sourcedAdaptationProhibition: sourcedProhibition
    };
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
    var textAccess = deriveTextAccessPlan(source, Object.assign({}, opts, { standardsContext: standardsContext }));
    return {
      schemaVersion: CONTEXT_SCHEMA_VERSION,
      instructionalGrade: instructionalGrade,
      primaryTextPolicy: policy,
      primaryTextAccess: textAccess.primaryTextAccess,
      adaptedTextPolicy: textAccess.adaptedTextPolicy,
      adaptedTextPolicySource: textAccess.adaptedTextPolicySource,
      textAccessReason: textAccess.textAccessReason,
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
    SOURCE_BODY_EXTRACTION_VERSION: SOURCE_BODY_EXTRACTION_VERSION,
    SOURCE_COMPLEXITY_MEASUREMENT_VERSION: SOURCE_COMPLEXITY_MEASUREMENT_VERSION,
    ROLES: ROLES.slice(),
    FORMS: FORMS.slice(),
    ADAPTED_TEXT_POLICIES: ADAPTED_TEXT_POLICIES.slice(),
    PRIMARY_TEXT_ACCESS: PRIMARY_TEXT_ACCESS.slice(),
    normalizeGrade: normalizeGrade,
    normalizeGradeLabel: normalizeGradeLabel,
    getComplexityTarget: getComplexityTarget,
    getSourceCalibrationTarget: getSourceCalibrationTarget,
    getSourceCalibrationStyle: getSourceCalibrationStyle,
    buildSourceCalibrationGuidance: buildSourceCalibrationGuidance,
    fingerprintText: fingerprintText,
    fingerprintSourceText: fingerprintSourceText,
    createSourceSnapshot: createSourceSnapshot,
    getSourceSnapshot: getSourceSnapshot,
    normalizeReadingUnitId: normalizeReadingUnitId,
    normalizeSourceInstructionalText: normalizeSourceInstructionalText,
    getSourceInstructionalText: getSourceInstructionalText,
    getReadingSourceFamilyId: getReadingSourceFamilyId,
    sameReadingSourceFamily: sameReadingSourceFamily,
    sameReadingFamily: sameReadingSourceFamily,
    getReadingRoleLabel: getReadingRoleLabel,
    updateInstructionalRole: updateInstructionalRole,
    updateReadingFamilyRole: updateReadingFamilyRole,
    resolveReadingSource: resolveReadingSource,
    summarizeReadingAccess: summarizeReadingAccess,

    createSupportedReading: createSupportedReading,
    isSupportedOriginal: isSupportedOriginal,
    getReadingArtifactLabel: getReadingArtifactLabel,
    ensureReadingSourcePairs: ensureReadingSourcePairs,
    validateReadingSupports: validateReadingSupports,
    upsertReadingSupport: upsertReadingSupport,
    readingSupportPictureBudget: readingSupportPictureBudget,
    isAdaptedReading: isAdaptedReading,
    getAdaptedSupportSnapshot: getAdaptedSupportSnapshot,
    adaptedGenerationSnapshot: adaptedGenerationSnapshot,
    validateAdaptedReadingSupports: validateAdaptedReadingSupports,
    upsertAdaptedReadingSupport: upsertAdaptedReadingSupport,
    removeAdaptedReadingSupport: removeAdaptedReadingSupport,
    setAdaptedReadingSupportPinned: setAdaptedReadingSupportPinned,
    setAdaptedReadingSupportsShown: setAdaptedReadingSupportsShown,
    mergeAdaptedReadingSupports: mergeAdaptedReadingSupports,
    clearAdaptedReadingSupports: clearAdaptedReadingSupports,
    rebaseAdaptedReadingSupports: rebaseAdaptedReadingSupports,
    importOriginalSupportsIntoAdapted: importOriginalSupportsIntoAdapted,
    isWordEdge: isWordEdge,
    removeReadingSupport: removeReadingSupport,
    setReadingSupportPinned: setReadingSupportPinned,
    mergeReadingSupports: mergeReadingSupports,
    selectReadingSupports: selectReadingSupports,

    fingerprintValue: fingerprintValue,
    extractMeasurableSourceBody: extractMeasurableSourceBody,
    measureSourceComplexity: measureSourceComplexity,
    isEnglishLanguage: isEnglishLanguage,
    complexityStatus: complexityStatus,
    normalizeComplexity: normalizeComplexity,
    normalizeInstructionalText: normalizeInstructionalText,
    getInstructionalText: getInstructionalText,
    inferInstructionalText: inferInstructionalText,
    withComplexityEvidence: withComplexityEvidence,
    invalidateComplexityEvidence: invalidateComplexityEvidence,
    deriveTextAccessPlan: deriveTextAccessPlan,
    normalizeInstructionalContext: normalizeInstructionalContext,
    resolveArtifactContext: resolveArtifactContext
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') {
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.InstructionalContext = API;
  }
})();
