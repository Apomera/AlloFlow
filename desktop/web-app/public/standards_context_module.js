/**
 * AlloFlow shared standards context.
 *
 * This is intentionally a local, bounded normalization contract rather than a
 * standards resolver. It lets every standards-aware path carry the same
 * teacher input (and, later, a resolved provider snapshot) without requiring a
 * network call or claiming that a raw code has been verified.
 */
(function () {
  'use strict';

  var VERSION = 'standards-context/v1';
  var MAX_INPUT = 2400;
  var MAX_PROMPT = 3600;
  var MAX_ENTRIES = 32;
  var MAX_FIELD = 600;
  var MAX_URLS = 12;
  var MAX_RELATIONSHIPS = 12;
  var TEXT_ACCESS_EXPECTATIONS = Object.freeze([
    'unspecified',
    'preserve-primary',
    'supplemental-adaptation-permitted',
    'educator-directed',
    'adaptation-prohibited'
  ]);

  var hasOwn = Object.prototype.hasOwnProperty;

  function own(obj, key) {
    return isObject(obj) && hasOwn.call(obj, key) ? obj[key] : undefined;
  }

  function text(value, limit) {
    if (value === undefined || value === null) return '';
    var raw = '';
    if (typeof value === 'string') raw = value;
    else if (typeof value === 'number') raw = Number.isFinite(value) ? String(value) : '';
    else if (typeof value === 'boolean') raw = String(value);
    else return '';
    var maxLen = limit || MAX_FIELD;
    var bounded = raw.length > maxLen * 4 ? raw.slice(0, maxLen * 4) : raw;
    var out = bounded.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
    return out.slice(0, maxLen);
  }

  function isObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function safeUrl(value, limit) {
    var maxLen = limit || MAX_FIELD;
    var raw = text(value, maxLen);
    if (!raw || /[\s"'<>\\]/.test(raw)) return '';
    if (typeof URL === 'function') {
      try {
        var parsed = new URL(raw);
        if ((parsed.protocol !== 'https:' && parsed.protocol !== 'http:') || parsed.username || parsed.password) return '';
        if (/[\s"'<>\\]/.test(parsed.href) || parsed.href.length > maxLen) return '';
        return parsed.href;
      } catch (_) {
        return '';
      }
    }
    return /^https?:\/\/[a-z0-9.-]+(?::\d{1,5})?(?:[/?#][^\s"'<>\\]*)?$/i.test(raw) ? raw : '';
  }

  function uniqueSafeUrls(values, limit) {
    var out = [];
    var list = Array.isArray(values) ? values : [];
    for (var i = 0; i < list.length && out.length < (limit || MAX_URLS); i++) {
      var item = safeUrl(list[i], MAX_FIELD);
      if (item && out.indexOf(item) === -1) out.push(item);
    }
    return out;
  }

  function pick(obj, keys) {
    if (!isObject(obj)) return '';
    for (var i = 0; i < keys.length; i++) {
      if (!hasOwn.call(obj, keys[i])) continue;
      var value = text(obj[keys[i]], MAX_FIELD);
      if (value) return value;
    }
    return '';
  }

  function normalizeRelationship(value) {
    if (typeof value === 'string') {
      var label = text(value, MAX_FIELD);
      return label ? { label: label } : null;
    }
    if (!isObject(value)) return null;
    var out = {
      id: pick(value, ['id', 'standardId', 'identifier', 'code']),
      relation: pick(value, ['relation', 'type', 'relationship']),
      label: pick(value, ['label', 'title', 'name', 'standard', 'text', 'description'])
    };
    return (out.id || out.relation || out.label) ? out : null;
  }

  function normalizeInstructionalConstraints(value) {
    var source = isObject(value) ? value : {};
    var expectation = text(pick(source, ['textAccessExpectation', 'primaryTextPolicy', 'expectation']), 80);
    if (TEXT_ACCESS_EXPECTATIONS.indexOf(expectation) === -1) expectation = 'unspecified';
    var basis = text(pick(source, ['basis', 'source', 'authority']), 240);
    var safeSourceUrl = safeUrl(pick(source, ['sourceUrl', 'url']), MAX_FIELD);
    return {
      textAccessExpectation: expectation,
      basis: basis,
      sourceUrl: safeSourceUrl,
      notes: text(pick(source, ['notes', 'description']), MAX_FIELD),
      sourced: !!(safeSourceUrl || basis)
    };
  }

  function normalizeEntry(raw, index) {
    var source = typeof raw === 'string' ? { label: raw } : (isObject(raw) ? raw : {});
    var code = pick(source, ['code', 'standardCode', 'identifier', 'id', 'standardId']);
    var label = pick(source, ['label', 'title', 'name', 'standard', 'statement', 'description', 'text']) || code;
    var statement = pick(source, ['text', 'statement', 'description', 'officialText', 'definition']);
    var relationships = [];
    var relA = own(source, 'relationships');
    var relB = own(source, 'relatedStandards');
    var relC = own(source, 'prerequisites');
    var rawRelationships = [].concat(
      Array.isArray(relA) ? relA.slice(0, MAX_RELATIONSHIPS) : [],
      Array.isArray(relB) ? relB.slice(0, MAX_RELATIONSHIPS) : [],
      Array.isArray(relC) ? relC.slice(0, MAX_RELATIONSHIPS) : []
    );
    for (var i = 0; i < rawRelationships.length && relationships.length < MAX_RELATIONSHIPS; i++) {
      var relationship = normalizeRelationship(rawRelationships[i]);
      if (relationship) relationships.push(relationship);
    }
    if (!code && !label && !statement) return null;
    return {
      id: code || ('standard-' + (index + 1)),
      code: code,
      label: label || code || ('Standard ' + (index + 1)),
      text: statement,
      framework: pick(source, ['framework', 'frameworkName', 'system', 'set']),
      jurisdiction: pick(source, ['jurisdiction', 'region', 'state', 'country']),
      grade: pick(source, ['grade', 'gradeLevel', 'band']),
      subject: pick(source, ['subject', 'discipline']),
      sourceUrl: safeUrl(pick(source, ['sourceUrl', 'url', 'officialUrl']), MAX_FIELD),
      sourceUrls: uniqueSafeUrls(own(source, 'sourceUrls'), MAX_URLS),
      relationships: relationships,
      instructionalConstraints: normalizeInstructionalConstraints(
        own(source, 'instructionalConstraints') || own(source, 'textAccessPolicy')
      )
    };
  }

  function extractSource(input) {
    var nested = own(input, 'standardsContext');
    if (isObject(nested)) return nested;
    return input;
  }

  function extractEntries(source) {
    if (Array.isArray(source)) return source.slice(0, MAX_ENTRIES);
    if (typeof source === 'string') {
      return source.slice(0, MAX_INPUT * 4).split(/[;\n]+/).map(function (part) { return part.trim(); }).filter(Boolean).slice(0, MAX_ENTRIES);
    }
    if (!isObject(source)) return [];
    var stds = own(source, 'standards');
    if (Array.isArray(stds)) return stds.slice(0, MAX_ENTRIES);
    var ents = own(source, 'entries');
    if (Array.isArray(ents)) return ents.slice(0, MAX_ENTRIES);
    if (own(source, 'standard') !== undefined) return [own(source, 'standard')];
    if (own(source, 'code') || own(source, 'standardCode') || own(source, 'identifier') || own(source, 'id') || own(source, 'label') || own(source, 'title') || own(source, 'text')) return [source];
    return [];
  }

  function buildPrompt(entries, fallback) {
    var parts = [];
    for (var i = 0; i < entries.length && parts.length < MAX_ENTRIES; i++) {
      var entry = entries[i];
      var head = entry.code && entry.label && entry.code !== entry.label
        ? entry.code + ' — ' + entry.label
        : (entry.code || entry.label);
      if (entry.text && entry.text !== entry.label) head += ': ' + entry.text;
      if (head) parts.push(head);
    }
    return text(parts.join('; ') || fallback, MAX_PROMPT);
  }

  function normalize(input, options) {
    var opts = isObject(options) ? options : {};
    var source = extractSource(input);
    var entries = [];
    var rawEntries = extractEntries(source);
    for (var i = 0; i < rawEntries.length && entries.length < MAX_ENTRIES; i++) {
      var entry = normalizeEntry(rawEntries[i], i);
      if (entry) entries.push(entry);
    }
    var sourceObject = isObject(source) ? source : {};
    var rawExistingProv = own(sourceObject, 'provenance');
    var existingProvenance = isObject(rawExistingProv) ? rawExistingProv : {};
    var inputText = text(
      text(own(sourceObject, 'inputText'), MAX_INPUT) || text(own(sourceObject, 'rawInput'), MAX_INPUT) || (typeof input === 'string' ? input : ''),
      MAX_INPUT
    );
    var promptText = buildPrompt(entries, text(text(own(sourceObject, 'promptText'), MAX_PROMPT) || inputText, MAX_PROMPT));
    var ownSourceUrls = own(sourceObject, 'sourceUrls');
    var ownSourceUrl = own(sourceObject, 'sourceUrl');
    var provSourceUrls = own(existingProvenance, 'sourceUrls');
    var sourceUrls = uniqueSafeUrls([].concat(
      Array.isArray(ownSourceUrls) ? ownSourceUrls : [],
      ownSourceUrl ? [ownSourceUrl] : [],
      Array.isArray(provSourceUrls) ? provSourceUrls : [],
      entries.reduce(function (all, entry) {
        return all.concat(entry.sourceUrl ? [entry.sourceUrl] : [], entry.sourceUrls || []);
      }, [])
    ), MAX_URLS);
    var provider = text(pick(sourceObject, ['provider', 'resolver']) || pick(existingProvenance, ['provider', 'resolver']) || pick(opts, ['provider']), 160) || 'user-input';
    var datasetVersion = text(pick(sourceObject, ['datasetVersion', 'snapshotId']) || pick(existingProvenance, ['datasetVersion', 'snapshotId']) || pick(opts, ['datasetVersion']), 160);
    var resolutionStatus = text(pick(sourceObject, ['resolutionStatus', 'status']) || pick(existingProvenance, ['resolutionStatus', 'status']) || pick(opts, ['resolutionStatus']), 80);
    if (['unresolved', 'partial', 'resolved'].indexOf(resolutionStatus) === -1) {
      resolutionStatus = entries.some(function (entry) { return !!(entry.code && (entry.text || entry.sourceUrl || entry.sourceUrls.length)); })
        ? (entries.every(function (entry) { return !!(entry.code && (entry.text || entry.sourceUrl || entry.sourceUrls.length)); }) ? 'resolved' : 'partial')
        : (entries.length ? 'unresolved' : 'unresolved');
    }
    var provenance = {
      provider: provider,
      datasetVersion: datasetVersion,
      snapshotId: text(pick(sourceObject, ['snapshotId']) || pick(existingProvenance, ['snapshotId']), 160),
      sourceUrls: sourceUrls.slice(),
      resolutionStatus: resolutionStatus,
      retrievedAt: text(pick(sourceObject, ['retrievedAt']) || pick(existingProvenance, ['retrievedAt']), 80),
      license: text(pick(sourceObject, ['license']) || pick(existingProvenance, ['license']), 240),
      attribution: text(pick(sourceObject, ['attribution']) || pick(existingProvenance, ['attribution']), 600)
    };
    var sourceConstraints = normalizeInstructionalConstraints(
      own(sourceObject, 'instructionalConstraints') || own(sourceObject, 'textAccessPolicy')
    );
    if (sourceConstraints.textAccessExpectation === 'unspecified') {
      var constrainedEntry = entries.find(function (entry) {
        return entry.instructionalConstraints
          && entry.instructionalConstraints.textAccessExpectation !== 'unspecified';
      });
      if (constrainedEntry) sourceConstraints = Object.assign({}, constrainedEntry.instructionalConstraints);
    }
    return {
      version: VERSION,
      inputText: inputText,
      promptText: promptText,
      standards: entries,
      provider: provider,
      datasetVersion: datasetVersion,
      snapshotId: provenance.snapshotId,
      sourceUrls: sourceUrls,
      resolutionStatus: resolutionStatus,
      attribution: provenance.attribution,
      provenance: provenance,
      instructionalConstraints: sourceConstraints
    };
  }

  function buildResourceDirective(input, options) {
    var context = normalize(input);
    var opts = isObject(options) ? options : {};
    if (isEmpty(context)) return '';
    var resourceType = text(own(opts, 'resourceType'), 80) || 'resource';
    var textRole = text(own(opts, 'textRole'), 80);
    var lines = [
      'STANDARDS FIDELITY: Use the cited standard text as the instructional target.',
      'Preserve its required content, cognitive verbs, and evidence or product expectations; do not reduce cognitive demand merely to simplify language.'
    ];
    if (resourceType === 'source' || textRole === 'primary') {
      lines.push('PRIMARY TEXT: Build the reading around the standard at the instructional grade. Add access supports without silently replacing the primary text.');
    } else if (resourceType === 'simplified' || textRole === 'supplemental') {
      lines.push('ADAPTED COMPANION: Treat this as supplemental access unless the educator explicitly designates it as a replacement. Preserve the standard\'s concepts, relationships, and thinking task while making language more accessible.');
    } else {
      lines.push('RESOURCE-SPECIFIC ALIGNMENT: Make every task and response expectation visibly traceable to the standard rather than merely mentioning its topic.');
    }
    var constraints = context.instructionalConstraints || {};
    if (constraints.sourced && constraints.textAccessExpectation === 'preserve-primary') {
      lines.push('SOURCED TEXT-ACCESS EXPECTATION: Preserve access to the designated primary text; adaptations are supplemental unless the educator explicitly authorizes replacement.');
    } else if (constraints.sourced && constraints.textAccessExpectation === 'adaptation-prohibited') {
      lines.push('SOURCED TEXT-ACCESS PROHIBITION: Use the designated primary text without generating or distributing an adapted version. Add only same-text access supports.');
    }
    return lines.join('\n');
  }

  function isEmpty(context) {
    var stds = own(context, 'standards');
    return !Array.isArray(stds) || stds.length === 0;
  }

  var API = Object.freeze({
    VERSION: VERSION,
    normalize: normalize,
    resolve: normalize,
    isEmpty: isEmpty,
    normalizeInstructionalConstraints: normalizeInstructionalConstraints,
    TEXT_ACCESS_EXPECTATIONS: TEXT_ACCESS_EXPECTATIONS,
    buildResourceDirective: buildResourceDirective
  });

  if (typeof module === 'object' && module && module.exports) module.exports = API;
  var _win = (typeof window !== 'undefined' && window && (typeof window === 'object' || typeof window === 'function')) ? window : null;
  if (_win) {
    try {
      if (!_win.AlloModules || typeof _win.AlloModules !== 'object') _win.AlloModules = {};
      _win.AlloModules.StandardsContext = API;
    } catch (_) {}
  }
})();
