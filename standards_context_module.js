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
  var TEXT_ACCESS_EXPECTATIONS = [
    'unspecified',
    'preserve-primary',
    'supplemental-adaptation-permitted',
    'educator-directed',
    'adaptation-prohibited'
  ];

  function text(value, limit) {
    if (value === undefined || value === null) return '';
    var out = String(value).replace(/\s+/g, ' ').trim();
    return out.slice(0, limit || MAX_FIELD);
  }

  function isObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function uniqueStrings(values, limit) {
    var out = [];
    var list = Array.isArray(values) ? values : [];
    for (var i = 0; i < list.length && out.length < (limit || MAX_URLS); i++) {
      var item = text(list[i], MAX_FIELD);
      if (item && out.indexOf(item) === -1) out.push(item);
    }
    return out;
  }

  function pick(obj, keys) {
    if (!isObject(obj)) return '';
    for (var i = 0; i < keys.length; i++) {
      var value = text(obj[keys[i]], MAX_FIELD);
      if (value) return value;
    }
    return '';
  }

  function normalizeRelationship(value) {
    if (typeof value === 'string') return { label: text(value, MAX_FIELD) };
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
    var expectation = text(
      source.textAccessExpectation || source.primaryTextPolicy || source.expectation,
      80
    );
    if (TEXT_ACCESS_EXPECTATIONS.indexOf(expectation) === -1) expectation = 'unspecified';
    return {
      textAccessExpectation: expectation,
      basis: text(source.basis || source.source || source.authority, 240),
      sourceUrl: text(source.sourceUrl || source.url, MAX_FIELD),
      notes: text(source.notes || source.description, MAX_FIELD),
      sourced: !!(source.sourceUrl || source.url || source.basis || source.authority)
    };
  }

  function normalizeEntry(raw, index) {
    var source = typeof raw === 'string' ? { label: raw } : (isObject(raw) ? raw : {});
    var code = pick(source, ['code', 'standardCode', 'identifier', 'id', 'standardId']);
    var label = pick(source, ['label', 'title', 'name', 'standard', 'statement', 'description', 'text']) || code;
    var statement = pick(source, ['text', 'statement', 'description', 'officialText', 'definition']);
    var relationships = [];
    var rawRelationships = [].concat(source.relationships || [], source.relatedStandards || [], source.prerequisites || []);
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
      sourceUrl: pick(source, ['sourceUrl', 'url', 'officialUrl']),
      sourceUrls: uniqueStrings(source.sourceUrls, MAX_URLS),
      relationships: relationships,
      instructionalConstraints: normalizeInstructionalConstraints(
        source.instructionalConstraints || source.textAccessPolicy
      )
    };
  }

  function extractSource(input) {
    if (isObject(input) && isObject(input.standardsContext)) return input.standardsContext;
    return input;
  }

  function extractEntries(source) {
    if (Array.isArray(source)) return source;
    if (typeof source === 'string') {
      return source.split(/[;\n]+/).map(function (part) { return part.trim(); }).filter(Boolean);
    }
    if (!isObject(source)) return [];
    if (Array.isArray(source.standards)) return source.standards;
    if (Array.isArray(source.entries)) return source.entries;
    if (source.standard !== undefined) return [source.standard];
    if (source.code || source.standardCode || source.identifier || source.id || source.label || source.title || source.text) return [source];
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
    var inputText = text(
      sourceObject.inputText || sourceObject.rawInput || (typeof input === 'string' ? input : ''),
      MAX_INPUT
    );
    var promptText = buildPrompt(entries, text(sourceObject.promptText || inputText, MAX_PROMPT));
    var sourceUrls = uniqueStrings([].concat(
      sourceObject.sourceUrls || [],
      sourceObject.sourceUrl || [],
      entries.reduce(function (all, entry) {
        return all.concat(entry.sourceUrl || [], entry.sourceUrls || []);
      }, [])
    ), MAX_URLS);
    var provider = text(sourceObject.provider || sourceObject.resolver || opts.provider, 160) || 'user-input';
    var datasetVersion = text(sourceObject.datasetVersion || sourceObject.snapshotId || opts.datasetVersion, 160);
    var resolutionStatus = text(sourceObject.resolutionStatus || sourceObject.status || opts.resolutionStatus, 80);
    if (['unresolved', 'partial', 'resolved'].indexOf(resolutionStatus) === -1) {
      resolutionStatus = entries.some(function (entry) { return !!(entry.code && (entry.text || entry.sourceUrl || entry.sourceUrls.length)); })
        ? (entries.every(function (entry) { return !!(entry.code && (entry.text || entry.sourceUrl || entry.sourceUrls.length)); }) ? 'resolved' : 'partial')
        : (entries.length ? 'unresolved' : 'unresolved');
    }
    var existingProvenance = isObject(sourceObject.provenance) ? sourceObject.provenance : {};
    var provenance = {
      provider: provider,
      datasetVersion: datasetVersion,
      snapshotId: text(sourceObject.snapshotId || existingProvenance.snapshotId, 160),
      sourceUrls: sourceUrls,
      resolutionStatus: resolutionStatus,
      retrievedAt: text(sourceObject.retrievedAt || existingProvenance.retrievedAt, 80),
      license: text(sourceObject.license || existingProvenance.license, 240),
      attribution: text(sourceObject.attribution || existingProvenance.attribution, 600)
    };
    var sourceConstraints = normalizeInstructionalConstraints(
      sourceObject.instructionalConstraints || sourceObject.textAccessPolicy
    );
    if (sourceConstraints.textAccessExpectation === 'unspecified') {
      var constrainedEntry = entries.find(function (entry) {
        return entry.instructionalConstraints
          && entry.instructionalConstraints.textAccessExpectation !== 'unspecified';
      });
      if (constrainedEntry) sourceConstraints = constrainedEntry.instructionalConstraints;
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
    var resourceType = text(opts.resourceType, 80) || 'resource';
    var textRole = text(opts.textRole, 80);
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
    return !context || !Array.isArray(context.standards) || context.standards.length === 0;
  }

  var API = {
    VERSION: VERSION,
    normalize: normalize,
    resolve: normalize,
    isEmpty: isEmpty,
    normalizeInstructionalConstraints: normalizeInstructionalConstraints,
    TEXT_ACCESS_EXPECTATIONS: TEXT_ACCESS_EXPECTATIONS.slice(),
    buildResourceDirective: buildResourceDirective
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') {
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.StandardsContext = API;
  }
})();
