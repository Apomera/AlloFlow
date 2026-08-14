/*
 * AlloFlow Walkthrough Copilot - headless note-analysis core.
 *
 * Formative walkthrough and coaching support only. This module never assigns a
 * rating, never calculates an annual or Act 13 score, and never makes an
 * employment recommendation. See CLAUDE_WALKTHROUGH_COPILOT_HANDOFF.md.
 *
 * The module owns the integrity boundary: it holds the observer's source notes
 * immutable, validates every model-proposed suggestion against them, separates
 * objective evidence from interpretation, and refuses to produce output until a
 * human has decided every suggestion. It knows nothing about React, Drive,
 * Apps Script, or a particular model provider. An adapter supplies suggestions;
 * this module decides whether they may be shown, approved, or exported.
 *
 * Two artifacts with opposite retention rules live here. The DRAFT (rejected
 * suggestions, confidence values, warnings) never leaves the session. The
 * RECORD (approved feedback) is what export produces. exportDraft deliberately
 * omits everything in the first category.
 *
 * Source is kept pure ASCII on disk; see the encoding notes in the handoff.
 */
(function () {
  'use strict';

  var CONTRACT_VERSION = '1.0';

  var MAX_NOTE_CHARS = 20000;
  var MAX_FIELD_CHARS = 4000;
  var MAX_SUGGESTIONS = 60;
  var MAX_SPANS_PER_SUGGESTION = 8;
  var MAX_DOMAINS = 12;
  var MAX_COMPONENTS = 120;

  var DECISIONS = ['pending', 'accepted', 'edited', 'rejected'];
  var MODES = ['demo', 'approved'];

  var DEMO_WATERMARK = 'DEMO DRAFT - synthetic content, not a record of any real observation.';

  var DEFAULT_DISCLOSURE =
    'Notes from this walkthrough were organized with AI assistance. '
    + 'The observer wrote, reviewed, and approved all feedback below.';
  var DEFAULT_FORMATIVE_SENTENCE =
    'This is formative coaching feedback and is not part of a summative evaluation.';

  // Fields a suggestion may never carry. The model must not be able to smuggle a
  // rating or an employment recommendation through an unexpected key.
  var FORBIDDEN_SUGGESTION_KEYS = [
    'rating', 'ratings', 'score', 'scores', 'performanceLevel', 'level',
    'summativeRating', 'effectivenessRating', 'recommendation', 'employment',
    'employmentRecommendation', 'act13', 'annualRating', 'rank', 'percentile'
  ];

  // Judgment language belongs in `interpretation`, never in `objectiveEvidence`.
  // This is a heuristic word list, so it is deliberately generous: a warning
  // costs a moment's thought, while a missed judgment ships as though it were
  // something the observer saw. The everyday appraisal words matter as much as
  // the formal ones, because shorthand notes are written in everyday language.
  var JUDGMENT_WORDS = [
    'effective', 'ineffective', 'excellent', 'poor', 'strong', 'weak',
    'engaged', 'disengaged', 'unprepared', 'prepared', 'professional',
    'unprofessional', 'rigorous', 'exemplary', 'inadequate', 'proficient',
    'skilled', 'unskilled', 'mastery', 'struggling',
    'great', 'wonderful', 'terrific', 'impressive', 'seamless', 'masterful',
    'flawless', 'chaotic', 'disorganized', 'enthusiastic', 'warm',
    'love', 'loves', 'clearly love'
  ];

  // Collective subjects that generalize beyond a single cited moment.
  var COLLECTIVE_TERMS = [
    'students', 'the class', 'everyone', 'all students', 'the students',
    'the whole class', 'every student', 'the group', 'they all'
  ];

  function isObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }
  function isString(value) {
    return typeof value === 'string';
  }
  function isNonEmptyString(value) {
    return isString(value) && value.trim() !== '';
  }
  function error(code, path, message) {
    return { code: code, path: path, message: message };
  }
  function warning(code, path, message) {
    return { code: code, path: path, message: message };
  }
  function ok(value, warnings) {
    return { ok: true, errors: [], warnings: warnings || [], value: value };
  }
  function bad(errors, warnings) {
    return { ok: false, errors: errors || [], warnings: warnings || [], value: null };
  }
  function lower(value) {
    return isString(value) ? value.toLowerCase() : '';
  }
  function containsAny(haystack, needles) {
    var text = lower(haystack);
    for (var i = 0; i < needles.length; i += 1) {
      if (text.indexOf(needles[i]) !== -1) return needles[i];
    }
    return null;
  }
  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }
  function stamp(options) {
    if (options && isNonEmptyString(options.now)) return options.now;
    return new Date().toISOString();
  }

  /* ---------------------------------------------------------------------- *
   * Framework configuration
   *
   * Domain count and labels come from configuration. Nothing here assumes four
   * domains or Danielson's numbering, so a district using another model works
   * without a code change. Rubric performance-level text is deliberately not
   * part of this contract; districts supply their own.
   * ---------------------------------------------------------------------- */

  function validateFramework(framework) {
    var errors = [];
    if (!isObject(framework)) {
      return bad([error('framework-invalid', 'framework', 'A framework configuration object is required.')]);
    }
    if (!isNonEmptyString(framework.id)) {
      errors.push(error('framework-id', 'framework.id', 'The framework needs an id.'));
    }
    if (!Array.isArray(framework.domains) || framework.domains.length === 0) {
      errors.push(error('framework-domains', 'framework.domains', 'The framework needs at least one domain.'));
    } else if (framework.domains.length > MAX_DOMAINS) {
      errors.push(error('framework-domains', 'framework.domains', 'Too many domains in the framework configuration.'));
    }
    if (!Array.isArray(framework.components) || framework.components.length === 0) {
      errors.push(error('framework-components', 'framework.components', 'The framework needs at least one component.'));
    } else if (framework.components.length > MAX_COMPONENTS) {
      errors.push(error('framework-components', 'framework.components', 'Too many components in the framework configuration.'));
    }
    if (errors.length) return bad(errors);

    var domainIds = Object.create(null);
    framework.domains.forEach(function (domain, index) {
      if (!isObject(domain) || !isNonEmptyString(domain.id) || !isNonEmptyString(domain.label)) {
        errors.push(error('domain-invalid', 'framework.domains[' + index + ']', 'Each domain needs an id and a label.'));
        return;
      }
      if (domainIds[domain.id]) {
        errors.push(error('domain-duplicate', 'framework.domains[' + index + ']', 'Duplicate domain id ' + domain.id + '.'));
      }
      domainIds[domain.id] = true;
    });

    var componentIds = Object.create(null);
    framework.components.forEach(function (component, index) {
      if (!isObject(component) || !isNonEmptyString(component.id) || !isNonEmptyString(component.label)) {
        errors.push(error('component-invalid', 'framework.components[' + index + ']', 'Each component needs an id and a label.'));
        return;
      }
      if (componentIds[component.id]) {
        errors.push(error('component-duplicate', 'framework.components[' + index + ']', 'Duplicate component id ' + component.id + '.'));
      }
      componentIds[component.id] = true;
      if (!domainIds[component.domainId]) {
        errors.push(error('component-orphan', 'framework.components[' + index + ']', 'Component ' + component.id + ' references unknown domain ' + component.domainId + '.'));
      }
    });

    if (errors.length) return bad(errors);
    return ok({
      id: framework.id,
      label: isNonEmptyString(framework.label) ? framework.label : framework.id,
      domains: clone(framework.domains),
      components: clone(framework.components)
    });
  }

  /* ---------------------------------------------------------------------- *
   * Disclosure
   *
   * Disclosure is structural, not a preference. It may be reworded but never
   * emptied, and a blank disclosure blocks export.
   * ---------------------------------------------------------------------- */

  // "Not supplied" and "deliberately cleared" are different. An absent field is
  // initialization and takes the default. A field the user emptied is kept
  // empty, so export blocks and they are told why, rather than the default
  // silently reappearing under wording they meant to replace.
  function normalizeDisclosure(input) {
    var source = isObject(input) ? input : {};
    var supplied = typeof source.text !== 'undefined' && source.text !== null;
    var text = supplied ? String(source.text).trim() : DEFAULT_DISCLOSURE;

    var formativeSupplied = typeof source.formativeSentence !== 'undefined' && source.formativeSentence !== null;
    var formative = formativeSupplied ? String(source.formativeSentence).trim() : DEFAULT_FORMATIVE_SENTENCE;

    return {
      text: text,
      includeFormativeSentence: source.includeFormativeSentence !== false,
      formativeSentence: formative
    };
  }

  function disclosureLine(disclosure) {
    if (!isObject(disclosure) || !isNonEmptyString(disclosure.text)) return '';
    if (!disclosure.includeFormativeSentence || !isNonEmptyString(disclosure.formativeSentence)) {
      return disclosure.text;
    }
    return disclosure.text + ' ' + disclosure.formativeSentence;
  }

  /* ---------------------------------------------------------------------- *
   * Draft lifecycle
   * ---------------------------------------------------------------------- */

  function createDraft(input, options) {
    var source = isObject(input) ? input : {};
    var errors = [];

    var frameworkReport = validateFramework(source.framework);
    if (!frameworkReport.ok) return frameworkReport;

    if (!isNonEmptyString(source.sourceNotes)) {
      errors.push(error('notes-empty', 'sourceNotes', 'Enter observation notes before analyzing.'));
    } else if (source.sourceNotes.length > MAX_NOTE_CHARS) {
      errors.push(error('notes-long', 'sourceNotes', 'These notes are too long to analyze in one draft.'));
    }

    var mode = isNonEmptyString(source.mode) ? source.mode : 'demo';
    if (DECISIONS.indexOf(mode) !== -1 || MODES.indexOf(mode) === -1) {
      if (MODES.indexOf(mode) === -1) {
        errors.push(error('mode-invalid', 'mode', 'Mode must be demo or approved.'));
      }
    }
    if (mode === 'approved') {
      var approval = source.approval;
      if (!isObject(approval) || approval.providerApproved !== true || approval.scopeConfirmed !== true
        || !isNonEmptyString(approval.affirmedBy)) {
        errors.push(error('approval-missing', 'approval',
          'Approved mode requires an affirmation naming who approved the provider and the formative scope.'));
      }
    }

    if (errors.length) return bad(errors);

    var at = stamp(options);
    var draft = {
      contractVersion: CONTRACT_VERSION,
      id: isNonEmptyString(source.id) ? source.id : 'walkthrough-draft',
      createdAt: at,
      mode: mode,
      approval: mode === 'approved'
        ? {
          affirmedAt: at,
          affirmedBy: source.approval.affirmedBy,
          providerApproved: true,
          scopeConfirmed: true
        }
        : null,
      framework: frameworkReport.value,
      disclosure: normalizeDisclosure(source.disclosure),
      sourceNotesOriginal: source.sourceNotes,
      sourceNotesFrozenAt: at,
      context: isObject(source.context) ? clone(source.context) : {},
      collectionType: isNonEmptyString(source.collectionType) ? source.collectionType : 'unspecified',
      suggestions: [],
      globalWarnings: [],
      principalApproval: { approvedAt: null, approvedSuggestionIds: [] }
    };
    return ok(draft);
  }

  /* ---------------------------------------------------------------------- *
   * Suggestion validation
   *
   * A suggestion may only survive if every claim traces to an exact span of the
   * frozen notes. Offsets are verified against the note text itself, so a model
   * cannot invent a quotation that merely looks plausible.
   * ---------------------------------------------------------------------- */

  function validateSpan(notes, span, path, errors) {
    if (!isObject(span)) {
      errors.push(error('span-invalid', path, 'Each source span must be an object.'));
      return false;
    }
    var start = span.start;
    var end = span.end;
    if (typeof start !== 'number' || typeof end !== 'number'
      || !isFinite(start) || !isFinite(end)
      || start < 0 || end <= start || end > notes.length) {
      errors.push(error('span-range', path, 'Source span offsets fall outside the observation notes.'));
      return false;
    }
    if (!isString(span.text)) {
      errors.push(error('span-text', path, 'Each source span must quote the note text it refers to.'));
      return false;
    }
    if (notes.slice(start, end) !== span.text) {
      errors.push(error('span-mismatch', path,
        'A cited excerpt does not match the observation notes exactly. The suggestion was not shown.'));
      return false;
    }
    return true;
  }

  function detectForbiddenKeys(suggestion, path, errors) {
    Object.keys(suggestion).forEach(function (key) {
      if (FORBIDDEN_SUGGESTION_KEYS.indexOf(key) !== -1) {
        errors.push(error('field-forbidden', path + '.' + key,
          'A suggestion may not carry a rating, score, or employment recommendation.'));
      }
    });
  }

  function suggestionWarnings(suggestion, path) {
    var warnings = [];
    var judgment = containsAny(suggestion.objectiveEvidence, JUDGMENT_WORDS);
    if (judgment) {
      warnings.push(warning('evidence-judgment', path + '.objectiveEvidence',
        'The word "' + judgment + '" is a judgment. Move it to interpretation or restate what was observed.'));
    }
    var collective = containsAny(suggestion.interpretation, COLLECTIVE_TERMS)
      || containsAny(suggestion.objectiveEvidence, COLLECTIVE_TERMS);
    if (collective && suggestion.sourceSpans.length < 2) {
      warnings.push(warning('generalization-unsupported', path,
        'This describes "' + collective + '" but cites a single moment. Add evidence or narrow the claim.'));
    }
    if (!isNonEmptyString(suggestion.interpretation)) {
      warnings.push(warning('interpretation-absent', path + '.interpretation',
        'No interpretation was offered, so this stands as evidence only.'));
    }
    return warnings;
  }

  function validateSuggestions(draft, rawSuggestions) {
    if (!isObject(draft) || !isString(draft.sourceNotesOriginal)) {
      return bad([error('draft-invalid', 'draft', 'A frozen draft is required before suggestions can be validated.')]);
    }
    if (!Array.isArray(rawSuggestions)) {
      return bad([error('suggestions-invalid', 'suggestions', 'Suggestions must be provided as a list.')]);
    }
    if (rawSuggestions.length > MAX_SUGGESTIONS) {
      return bad([error('suggestions-many', 'suggestions', 'Too many suggestions were returned to review reliably.')]);
    }

    var notes = draft.sourceNotesOriginal;
    var componentIndex = Object.create(null);
    draft.framework.components.forEach(function (component) {
      componentIndex[component.id] = component;
    });

    var errors = [];
    var warnings = [];
    var accepted = [];
    var seenIds = Object.create(null);

    rawSuggestions.forEach(function (raw, index) {
      var path = 'suggestions[' + index + ']';
      if (!isObject(raw)) {
        errors.push(error('suggestion-invalid', path, 'Each suggestion must be an object.'));
        return;
      }
      detectForbiddenKeys(raw, path, errors);

      if (!isNonEmptyString(raw.id)) {
        errors.push(error('suggestion-id', path + '.id', 'Each suggestion needs an id.'));
        return;
      }
      if (seenIds[raw.id]) {
        errors.push(error('suggestion-duplicate', path + '.id', 'Duplicate suggestion id ' + raw.id + '.'));
        return;
      }
      seenIds[raw.id] = true;

      // An explicit insufficient-evidence result is a legitimate answer and is
      // kept, but it never carries a component claim.
      if (raw.result === 'insufficient_evidence') {
        accepted.push({
          id: raw.id,
          result: 'insufficient_evidence',
          domainId: null,
          componentId: null,
          sourceSpans: [],
          objectiveEvidence: '',
          interpretation: '',
          note: isNonEmptyString(raw.note) ? raw.note.slice(0, MAX_FIELD_CHARS) : 'The notes do not establish this.',
          confidence: null,
          warnings: [],
          decision: 'pending',
          approvedText: null
        });
        return;
      }

      var component = componentIndex[raw.componentId];
      if (!component) {
        errors.push(error('component-unknown', path + '.componentId',
          'Suggestion references a component that is not in the configured framework.'));
        return;
      }
      if (isNonEmptyString(raw.domainId) && raw.domainId !== component.domainId) {
        errors.push(error('domain-mismatch', path + '.domainId',
          'Suggestion domain does not match the component it cites.'));
        return;
      }
      if (!isNonEmptyString(raw.objectiveEvidence)) {
        errors.push(error('evidence-empty', path + '.objectiveEvidence',
          'A suggestion must state the evidence observed.'));
        return;
      }
      if (raw.objectiveEvidence.length > MAX_FIELD_CHARS
        || (isString(raw.interpretation) && raw.interpretation.length > MAX_FIELD_CHARS)) {
        errors.push(error('field-long', path, 'Suggestion text exceeds the allowed length.'));
        return;
      }
      if (!Array.isArray(raw.sourceSpans) || raw.sourceSpans.length === 0) {
        errors.push(error('span-absent', path + '.sourceSpans',
          'Every claim must cite at least one excerpt from the observation notes.'));
        return;
      }
      if (raw.sourceSpans.length > MAX_SPANS_PER_SUGGESTION) {
        errors.push(error('span-many', path + '.sourceSpans', 'Too many cited excerpts on one suggestion.'));
        return;
      }
      var spansOk = true;
      raw.sourceSpans.forEach(function (span, spanIndex) {
        if (!validateSpan(notes, span, path + '.sourceSpans[' + spanIndex + ']', errors)) spansOk = false;
      });
      if (!spansOk) return;

      var confidence = typeof raw.confidence === 'number' && isFinite(raw.confidence)
        ? Math.min(1, Math.max(0, raw.confidence))
        : null;

      var candidate = {
        id: raw.id,
        result: 'supported',
        domainId: component.domainId,
        componentId: component.id,
        sourceSpans: clone(raw.sourceSpans),
        objectiveEvidence: raw.objectiveEvidence.trim(),
        interpretation: isNonEmptyString(raw.interpretation) ? raw.interpretation.trim() : '',
        note: '',
        confidence: confidence,
        warnings: [],
        decision: 'pending',
        approvedText: null
      };
      candidate.warnings = suggestionWarnings(candidate, path);
      warnings = warnings.concat(candidate.warnings);
      accepted.push(candidate);
    });

    if (errors.length) return bad(errors, warnings);

    var next = clone(draft);
    next.suggestions = accepted;
    next.globalWarnings = globalWarnings(next);
    return ok(next, warnings.concat(next.globalWarnings));
  }

  function globalWarnings(draft) {
    var warnings = [];
    var covered = Object.create(null);
    draft.suggestions.forEach(function (suggestion) {
      if (suggestion.result === 'supported' && suggestion.decision !== 'rejected') {
        covered[suggestion.domainId] = true;
      }
    });
    draft.framework.domains.forEach(function (domain) {
      if (!covered[domain.id]) {
        warnings.push(warning('domain-empty', 'domains.' + domain.id,
          'No evidence was recorded for ' + domain.label + '.'));
      }
    });
    if (draft.suggestions.length === 0) {
      warnings.push(warning('suggestions-none', 'suggestions',
        'No supported components were identified in these notes.'));
    }
    return warnings;
  }

  /* ---------------------------------------------------------------------- *
   * Approval affirmation
   *
   * Approved mode is a statement about authorization that already exists, not
   * a switch that grants one. It therefore records WHO affirmed WHAT, and it
   * is never remembered across sessions: a principal who affirmed in September
   * should be asked again in March rather than discovering months later that
   * the tool has been treating their notes as approved all along.
   * ---------------------------------------------------------------------- */

  var APPROVAL_TERMS = [
    {
      key: 'providerApproved',
      text: 'My district has approved the AI provider and data flow used here for observation notes.'
    },
    {
      key: 'scopeConfirmed',
      text: 'I have confirmed how a walkthrough is treated in our evaluation system, and I am using this within that scope.'
    }
  ];

  function describeApproval() {
    return {
      terms: APPROVAL_TERMS.map(function (term) { return { key: term.key, text: term.text }; }),
      requiresName: true,
      remembered: false,
      note: 'Approved mode changes no analysis. It removes the practice watermark and permits real '
        + 'notes. It is not remembered after this session.'
    };
  }

  /* ---------------------------------------------------------------------- *
   * Manual evidence entry
   *
   * The observer selects a component and quotes their own frozen notes. No
   * model is involved, so this works with no provider configured and no
   * district AI decision, while keeping every integrity rule: the quote has to
   * exist verbatim in the notes, evidence stays separate from interpretation,
   * and the same warnings apply.
   *
   * The quote is located here rather than trusted from the caller, for the
   * same reason model output is: an offset nobody verified is not a citation.
   * ---------------------------------------------------------------------- */

  function locateQuote(notes, quote) {
    if (!isString(notes) || !isNonEmptyString(quote)) {
      return bad([error('quote-empty', 'quote', 'Quote the line of your notes this is based on.')]);
    }
    var needle = quote.trim();
    var at = notes.indexOf(needle);
    if (at === -1) {
      return bad([error('quote-missing', 'quote',
        'That text does not appear in your notes. Copy the wording exactly as you wrote it.')]);
    }
    if (notes.indexOf(needle, at + 1) !== -1) {
      return bad([error('quote-ambiguous', 'quote',
        'That text appears more than once in your notes. Quote a longer stretch so the citation is unambiguous.')]);
    }
    return ok({ start: at, end: at + needle.length, text: needle });
  }

  function addManualSuggestion(draft, input) {
    if (!isObject(draft) || !Array.isArray(draft.suggestions)) {
      return bad([error('draft-invalid', 'draft', 'Lock your notes before adding evidence.')]);
    }
    var entry = isObject(input) ? input : {};
    var span = locateQuote(draft.sourceNotesOriginal, entry.quote);
    if (!span.ok) return span;

    var id = isNonEmptyString(entry.id)
      ? entry.id
      : 'manual-' + (draft.suggestions.length + 1) + '-' + String(entry.componentId || 'x');

    var taken = draft.suggestions.some(function (existing) { return existing.id === id; });
    if (taken) {
      return bad([error('suggestion-duplicate', 'id', 'That evidence id is already used in this draft.')]);
    }

    var candidate = {
      id: id,
      componentId: entry.componentId,
      objectiveEvidence: entry.objectiveEvidence,
      interpretation: entry.interpretation,
      sourceSpans: [span.value]
    };

    // Validate the new claim ALONE against the frozen notes, then append it.
    // Re-validating the whole list would work, but it rebuilds every existing
    // suggestion and so resets their decisions, which then have to be carried
    // back by hand. Validating one and appending keeps decisions untouched
    // because the existing entries are never rebuilt.
    var report = validateSuggestions(draft, [candidate]);
    if (!report.ok) return report;

    var next = clone(draft);
    next.suggestions = draft.suggestions.concat(report.value.suggestions);
    next.globalWarnings = globalWarnings(next);
    return ok(next, report.warnings);
  }

  /* ---------------------------------------------------------------------- *
   * Human decisions
   *
   * Every transition returns a new draft. The frozen notes are copied forward
   * untouched, and editing a suggestion never rewrites its cited excerpt.
   * ---------------------------------------------------------------------- */

  function decideSuggestion(draft, suggestionId, decision, approvedText) {
    if (!isObject(draft) || !Array.isArray(draft.suggestions)) {
      return bad([error('draft-invalid', 'draft', 'A draft is required.')]);
    }
    if (DECISIONS.indexOf(decision) === -1 || decision === 'pending') {
      return bad([error('decision-invalid', 'decision', 'Decision must be accepted, edited, or rejected.')]);
    }
    var index = -1;
    draft.suggestions.forEach(function (suggestion, position) {
      if (suggestion.id === suggestionId) index = position;
    });
    if (index === -1) {
      return bad([error('suggestion-unknown', 'suggestionId', 'That suggestion is not part of this draft.')]);
    }
    if (decision === 'edited' && !isNonEmptyString(approvedText)) {
      return bad([error('edit-empty', 'approvedText', 'An edited suggestion needs approved text.')]);
    }
    if (isString(approvedText) && approvedText.length > MAX_FIELD_CHARS) {
      return bad([error('edit-long', 'approvedText', 'Approved text exceeds the allowed length.')]);
    }

    var next = clone(draft);
    var target = next.suggestions[index];
    target.decision = decision;
    if (decision === 'rejected') {
      target.approvedText = null;
    } else if (decision === 'edited') {
      target.approvedText = approvedText.trim();
    } else {
      target.approvedText = target.result === 'insufficient_evidence'
        ? target.note
        : target.objectiveEvidence;
    }
    // The cited excerpt is never rewritten by an edit.
    target.sourceSpans = clone(draft.suggestions[index].sourceSpans);
    next.sourceNotesOriginal = draft.sourceNotesOriginal;
    next.globalWarnings = globalWarnings(next);
    return ok(next);
  }

  /* ---------------------------------------------------------------------- *
   * Export gating
   * ---------------------------------------------------------------------- */

  function exportReadiness(draft) {
    var errors = [];
    if (!isObject(draft) || !Array.isArray(draft.suggestions)) {
      return bad([error('draft-invalid', 'draft', 'A draft is required.')]);
    }
    if (!isNonEmptyString(disclosureLine(draft.disclosure))) {
      errors.push(error('disclosure-empty', 'disclosure',
        'The disclosure cannot be blank. Reword it if needed, but it must travel with the feedback.'));
    }
    var pending = draft.suggestions.filter(function (suggestion) {
      return suggestion.decision === 'pending';
    });
    if (pending.length) {
      errors.push(error('decisions-pending', 'suggestions',
        'Accept, edit, or reject every suggestion before copying feedback.'));
    }
    var keeps = draft.suggestions.filter(function (suggestion) {
      return suggestion.decision === 'accepted' || suggestion.decision === 'edited';
    });
    if (!keeps.length) {
      errors.push(error('nothing-approved', 'suggestions',
        'Nothing has been approved, so there is no feedback to copy.'));
    }
    if (errors.length) return bad(errors);
    return ok({ approvedCount: keeps.length });
  }

  /* ---------------------------------------------------------------------- *
   * Record output
   *
   * This is the boundary between the draft and the record. Rejected
   * suggestions, confidence values, and warnings are dropped here and never
   * appear in anything that can be filed.
   * ---------------------------------------------------------------------- */

  function buildFormOutput(draft, fieldMap, options) {
    var readiness = exportReadiness(draft);
    if (!readiness.ok) return readiness;

    var map = isObject(fieldMap) ? fieldMap : {};
    var line = disclosureLine(draft.disclosure);
    var watermark = draft.mode === 'demo' ? DEMO_WATERMARK : '';
    var header = watermark ? watermark + '\n' + line : line;

    var byDomain = Object.create(null);
    draft.framework.domains.forEach(function (domain) {
      byDomain[domain.id] = [];
    });
    draft.suggestions.forEach(function (suggestion) {
      if (suggestion.decision !== 'accepted' && suggestion.decision !== 'edited') return;
      if (suggestion.result === 'insufficient_evidence') return;
      var text = suggestion.approvedText || suggestion.objectiveEvidence;
      byDomain[suggestion.domainId].push(text);
    });

    var fields = draft.framework.domains.map(function (domain) {
      var body = byDomain[domain.id].join('\n\n');
      return {
        key: map[domain.id] || domain.label,
        domainId: domain.id,
        label: domain.label,
        empty: body === '',
        // The disclosure travels with every field, so a single-field copy
        // can never arrive without it.
        text: header + '\n\n' + (body === '' ? 'No evidence was recorded for this domain during this walkthrough.' : body)
      };
    });

    var contextFields = [];
    ['teacherDisplayName', 'date', 'period', 'subject', 'observer'].forEach(function (key) {
      if (isNonEmptyString(draft.context[key])) {
        contextFields.push({ key: map[key] || key, domainId: null, label: key, empty: false, text: draft.context[key] });
      }
    });

    var copyAll = contextFields.map(function (field) {
      return field.label + ': ' + field.text;
    }).join('\n');

    var body = fields.map(function (field) {
      var domainBody = field.text.slice(header.length).replace(/^\n+/, '');
      return field.label + '\n' + domainBody;
    }).join('\n\n');

    return ok({
      contractVersion: CONTRACT_VERSION,
      mode: draft.mode,
      watermark: watermark,
      disclosure: line,
      collectionType: draft.collectionType,
      generatedAt: stamp(options),
      contextFields: contextFields,
      fields: fields,
      copyAll: (copyAll ? copyAll + '\n\n' : '') + header + '\n\n' + body
    });
  }

  function exportDraft(draft, fieldMap, options) {
    var output = buildFormOutput(draft, fieldMap, options);
    if (!output.ok) return output;
    var at = stamp(options);
    var approvedIds = draft.suggestions.filter(function (suggestion) {
      return suggestion.decision === 'accepted' || suggestion.decision === 'edited';
    }).map(function (suggestion) {
      return suggestion.id;
    });
    return ok({
      record: output.value,
      principalApproval: { approvedAt: at, approvedSuggestionIds: approvedIds },
      // Deliberately absent: rejected suggestions, confidence values, warnings,
      // and the raw notes. Those belong to the session only.
      containsDraftArtifacts: false
    });
  }

  /* ---------------------------------------------------------------------- *
   * Practice mode
   *
   * Compares the observer's decisions against a scenario's reference reading.
   * This deliberately produces no score, no percentage, and no pass mark. The
   * reference is one defensible reading, so the output is framed as agreement
   * and divergence between two readings, with prompts for discussion.
   *
   * Practice results are self-reported and unverified. They must never be
   * presented as certification, calibration, or a measure of anyone's skill.
   * ---------------------------------------------------------------------- */

  function keptSuggestions(draft) {
    return draft.suggestions.filter(function (suggestion) {
      return suggestion.decision === 'accepted' || suggestion.decision === 'edited';
    });
  }

  function compareToReference(scenario, draft) {
    if (!isObject(scenario) || !isObject(scenario.reference)) {
      return bad([error('scenario-invalid', 'scenario', 'A scenario with a reference reading is required.')]);
    }
    if (!isObject(draft) || !Array.isArray(draft.suggestions)) {
      return bad([error('draft-invalid', 'draft', 'A reviewed draft is required.')]);
    }
    var pending = draft.suggestions.filter(function (suggestion) {
      return suggestion.decision === 'pending';
    });
    if (pending.length) {
      return bad([error('decisions-pending', 'suggestions',
        'Decide every suggestion before comparing readings.')]);
    }

    var reference = scenario.reference;
    var support = Array.isArray(reference.support) ? reference.support : [];
    var overreach = Array.isArray(reference.overreach) ? reference.overreach : [];
    var kept = keptSuggestions(draft);
    var keptComponents = kept.map(function (suggestion) { return suggestion.componentId; });
    var keptIds = kept.map(function (suggestion) { return suggestion.id; });

    var agreements = [];
    var divergences = [];

    support.forEach(function (componentId) {
      if (keptComponents.indexOf(componentId) !== -1) {
        agreements.push({
          componentId: componentId,
          note: 'You and the reference reading both found this supported by the notes.'
        });
      } else {
        divergences.push({
          kind: 'reference-kept-you-did-not',
          componentId: componentId,
          note: 'The reference reading kept this one. Look again at what the notes actually record, then decide whether you still disagree.'
        });
      }
    });

    overreach.forEach(function (componentId) {
      if (keptComponents.indexOf(componentId) !== -1) {
        divergences.push({
          kind: 'you-kept-reference-did-not',
          componentId: componentId,
          note: 'The reference reading treats this as reaching past the evidence. What in the notes would have to be there for it to hold?'
        });
      } else {
        agreements.push({
          componentId: componentId,
          note: 'You and the reference reading both declined to claim this.'
        });
      }
    });

    var declaredInsufficient = draft.suggestions.some(function (suggestion) {
      return suggestion.result === 'insufficient_evidence'
        && (suggestion.decision === 'accepted' || suggestion.decision === 'edited');
    });
    if (reference.expectInsufficient === true && !declaredInsufficient) {
      divergences.push({
        kind: 'insufficient-not-declared',
        componentId: null,
        note: 'The reference reading says the honest result here is that the notes do not establish much. Saying so is a finding, not a failure.'
      });
    }

    var pair = reference.preferBetweenPair;
    if (isObject(pair)) {
      var keptPreferred = keptIds.indexOf(pair.prefer) !== -1;
      var keptWeaker = keptIds.indexOf(pair.over) !== -1;
      if (keptWeaker && !keptPreferred) {
        divergences.push({
          kind: 'weaker-of-pair',
          componentId: pair.componentId,
          note: 'Two candidates addressed this component. The reference reading prefers the one that quotes an action over the one that quotes a conclusion.'
        });
      } else if (keptPreferred && !keptWeaker) {
        agreements.push({
          componentId: pair.componentId,
          note: 'You kept the candidate grounded in an observable action rather than the one that carried a conclusion.'
        });
      }
    }

    return ok({
      scenarioId: scenario.id,
      trustModel: 'learner-device-unverified',
      selfReported: true,
      isCalibration: false,
      agreements: agreements,
      divergences: divergences,
      referenceNote: isNonEmptyString(reference.note) ? reference.note : '',
      discussion: Array.isArray(scenario.discussion) ? scenario.discussion.slice() : [],
      disclaimer: 'The reference reading is one defensible reading, not an answer key. '
        + 'Use it to start a conversation, not to settle one.'
    });
  }

  /* ---------------------------------------------------------------------- *
   * Delivery to a principal-owned Apps Script
   *
   * The script runs in the principal's own Google account, writes to their own
   * Drive, and shares each note with one named teacher. This module never
   * talks to an AlloFlow server, and it refuses to hand over anything the
   * human has not approved.
   *
   * Delivery carries the RECORD, never the draft. buildFormOutput already
   * strips rejected suggestions, confidence values and warnings, so what goes
   * over the wire is exactly what the observer approved.
   * ---------------------------------------------------------------------- */

  var EXEC_URL_PATTERN = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/;
  var EMAIL_PATTERN = /^[^@\s]+@[^@\s.]+\.[^@\s]+$/;

  function validateExecUrl(value) {
    var url = isString(value) ? value.trim() : '';
    if (!url) return bad([error('url-empty', 'execUrl', 'Paste the web app URL from your deployment.')]);
    if (url.indexOf('http://') === 0) {
      return bad([error('url-insecure', 'execUrl', 'That URL is not secure. A deployment URL always begins with https.')]);
    }
    if (!EXEC_URL_PATTERN.test(url)) {
      return bad([error('url-shape', 'execUrl',
        'That does not look like an Apps Script web app URL. It should begin with https://script.google.com/macros/s/ and end with /exec.')]);
    }
    return ok(url);
  }

  function validateRecipient(email, allowedDomain) {
    var value = isString(email) ? email.trim().toLowerCase() : '';
    if (!EMAIL_PATTERN.test(value)) {
      return bad([error('recipient-invalid', 'teacherEmail',
        'Enter the teacher\'s school email address. Feedback is shared with a named account, never by link.')]);
    }
    if (isNonEmptyString(allowedDomain)) {
      var at = value.lastIndexOf('@');
      if (value.slice(at + 1) !== String(allowedDomain).toLowerCase()) {
        return bad([error('recipient-domain', 'teacherEmail',
          'That address is outside ' + allowedDomain + '. Check it before sending staff feedback outside your school domain.')]);
      }
    }
    return ok(value);
  }

  // The transport is injected so this stays testable and so the module never
  // assumes fetch exists (Canvas, Desktop and Node all differ).
  function createDelivery(options) {
    var settings = isObject(options) ? options : {};
    var urlReport = validateExecUrl(settings.execUrl);
    if (!urlReport.ok) return urlReport;
    var post = typeof settings.post === 'function' ? settings.post : null;
    if (!post) return bad([error('transport-missing', 'post', 'No transport was supplied for delivery.')]);

    var execUrl = urlReport.value;
    var token = isNonEmptyString(settings.token) ? settings.token : '';

    function call(action, payload) {
      var body = { action: action };
      Object.keys(payload || {}).forEach(function (key) { body[key] = payload[key]; });
      if (token) body.token = token;
      return post(execUrl, body);
    }

    return ok({
      execUrl: execUrl,
      hasToken: !!token,
      claim: function () {
        return call('claim', {}).then(function (result) {
          if (!result || result.ok === false) {
            return bad([error((result && result.code) || 'claim-failed', 'claim',
              (result && result.error) || 'The script did not accept the connection.')]);
          }
          token = isNonEmptyString(result.token) ? result.token : token;
          return ok({ token: token, owner: result.owner || '', version: result.version });
        });
      },
      selfTest: function () {
        return call('selftest', {}).then(function (result) {
          if (!result || result.ok === false) {
            return bad([error((result && result.code) || 'selftest-failed', 'selftest',
              (result && result.error) || 'The script did not answer the self-test.')]);
          }
          return ok(result);
        });
      },
      deliver: function (draft, fieldMap, deliveryOptions) {
        var opts = isObject(deliveryOptions) ? deliveryOptions : {};
        var recipient = validateRecipient(opts.teacherEmail, opts.allowedDomain);
        if (!recipient.ok) return Promise.resolve(recipient);

        var output = buildFormOutput(draft, fieldMap, opts);
        if (!output.ok) return Promise.resolve(output);

        if (draft.mode === 'demo') {
          return Promise.resolve(bad([error('demo-mode', 'mode',
            'This draft is practice material. Delivery is only available for an approved observation.')]));
        }

        var fields = output.value.fields
          .filter(function (field) { return !field.empty; })
          .map(function (field) { return { label: field.key, text: field.text }; });

        return call('deliver', {
          teacherEmail: recipient.value,
          teacherDisplayName: (draft.context && draft.context.teacherDisplayName) || '',
          subject: opts.subject || 'Walkthrough feedback',
          disclosure: output.value.disclosure,
          fields: fields,
          notify: opts.notify !== false,
          restrictToDomain: opts.restrictToDomain !== false
        }).then(function (result) {
          if (!result || result.ok === false) {
            return bad([error((result && result.code) || 'deliver-failed', 'deliver',
              (result && result.error) || 'The script did not save the feedback.')]);
          }
          return ok({
            url: result.url,
            fileId: result.fileId,
            sharedWith: result.sharedWith,
            notified: !!result.notified,
            at: result.at
          });
        });
      }
    });
  }

  /* ---------------------------------------------------------------------- *
   * Session teardown
   * ---------------------------------------------------------------------- */

  function clearDraft(draft) {
    if (!isObject(draft)) return ok(null);
    return ok({
      id: draft.id,
      cleared: true,
      sourceNotesOriginal: '',
      suggestions: [],
      globalWarnings: [],
      note: 'The working draft was cleared. Anything not copied out is gone.'
    });
  }

  var api = {
    CONTRACT_VERSION: CONTRACT_VERSION,
    DEFAULT_DISCLOSURE: DEFAULT_DISCLOSURE,
    DEFAULT_FORMATIVE_SENTENCE: DEFAULT_FORMATIVE_SENTENCE,
    DEMO_WATERMARK: DEMO_WATERMARK,
    MODES: MODES.slice(),
    DECISIONS: DECISIONS.slice(),
    validateFramework: validateFramework,
    normalizeDisclosure: normalizeDisclosure,
    disclosureLine: disclosureLine,
    createDraft: createDraft,
    validateSuggestions: validateSuggestions,
    decideSuggestion: decideSuggestion,
    exportReadiness: exportReadiness,
    buildFormOutput: buildFormOutput,
    exportDraft: exportDraft,
    compareToReference: compareToReference,
    validateExecUrl: validateExecUrl,
    validateRecipient: validateRecipient,
    createDelivery: createDelivery,
    locateQuote: locateQuote,
    addManualSuggestion: addManualSuggestion,
    describeApproval: describeApproval,
    clearDraft: clearDraft
  };

  if (typeof window !== 'undefined') {
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.WalkthroughCopilot = api;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
