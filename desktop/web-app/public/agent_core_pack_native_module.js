/* Provider-neutral validation for the native AlloFlow resource renderers.
 * The examples are authoring contracts, not evidence of educational review.
 * Validation never evaluates code, fetches sources, or generates model output.
 */
(function () {
  'use strict';
  var TYPES = ['analysis', 'brainstorm', 'adventure', 'persona', 'dbq', 'lesson-plan', 'gemini-bridge', 'alignment-report', 'udl-advice', 'word-sounds'];
  var MAX_ERRORS = 100;
  function record(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }
  function issue(code, path, message) { return { code: code, path: path.slice(0, 600), message: message.slice(0, 2000) }; }
  function appendIssue(items, entry) {
    if (items.length < MAX_ERRORS - 1) items.push(entry);
    else if (items.length === MAX_ERRORS - 1) items.push(issue('diagnostics-truncated', entry.path, 'The diagnostic limit was reached. Correct the reported issues and validate again; additional issues may remain.'));
  }
  function eachValidation(values, errors, visit) {
    for (var i = 0; i < values.length && errors.length < MAX_ERRORS; i++) visit(values[i], i);
  }
  function checkContext(errors, warnings) {
    function fail(path, message, code) { appendIssue(errors, issue(code || 'invalid-native-resource', path, message)); }
    function str(value, path, optional, max) {
      if (optional && (value === undefined || value === null)) return true;
      if (typeof value !== 'string' || (!optional && !value.trim()) || value.length > (max || 120000)) { fail(path, 'Expected ' + (optional ? 'a string' : 'a non-empty string') + ' of at most ' + (max || 120000) + ' characters.'); return false; }
      return true;
    }
    function obj(value, path, optional) {
      if (optional && (value === undefined || value === null)) return false;
      if (!record(value)) { fail(path, 'Expected an object.'); return false; }
      return true;
    }
    function list(value, path, min, max, each, optional) {
      if (optional && (value === undefined || value === null)) return;
      if (!Array.isArray(value)) { fail(path, 'Expected an array.'); return; }
      if (value.length < min || value.length > max) fail(path, 'Expected ' + min + '–' + max + ' entries.');
      for (var index = 0; index < Math.min(value.length, max) && errors.length < MAX_ERRORS; index++) each(value[index], path + '[' + index + ']');
    }
    function strings(value, path, optional, min, max) { list(value, path, min || 0, max || 100, function (entry, p) { str(entry, p, false, 20000); }, optional); }
    function fields(value, path, required, optional) {
      (required || []).forEach(function (key) { str(value[key], path + '.' + key); });
      (optional || []).forEach(function (key) { str(value[key], path + '.' + key, true); });
    }
    function num(value, path, min, max, optional, integer) {
      if (optional && (value === undefined || value === null)) return;
      if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) fail(path, 'Expected ' + (integer ? 'an integer' : 'a finite number') + ' from ' + min + ' to ' + max + '.');
    }
    function enumeration(value, path, allowed, optional) {
      if (optional && (value === undefined || value === null || value === '')) return;
      if (allowed.indexOf(value) < 0) fail(path, 'Expected one of: ' + allowed.join(', ') + '.');
    }
    function bool(value, path) { if (value !== undefined && value !== null && typeof value !== 'boolean') fail(path, 'Expected a boolean.'); }
    function warn(code, path, message) { appendIssue(warnings, issue(code, path, message)); }
    return { fail: fail, str: str, obj: obj, list: list, strings: strings, fields: fields, num: num, enumeration: enumeration, bool: bool, warn: warn, each: function (values, visit) { eachValidation(values, errors, visit); }, exhausted: function () { return errors.length >= MAX_ERRORS; } };
  }

  function analysis(d, p, c) {
    if (!c.obj(d, p)) return;
    c.str(d.originalText, p + '.originalText');
    function report(value, path) {
      if (!c.obj(value, path)) return;
      if (typeof value.readingLevel === 'string') c.str(value.readingLevel, path + '.readingLevel');
      else if (c.obj(value.readingLevel, path + '.readingLevel')) c.fields(value.readingLevel, path + '.readingLevel', ['range', 'explanation']);
      c.strings(value.concepts, path + '.concepts', false, 1);
      c.strings(value.grammar, path + '.grammar', true);
      if (c.obj(value.accuracy, path + '.accuracy')) {
        c.fields(value.accuracy, path + '.accuracy', ['rating', 'reason']);
        c.strings(value.accuracy.discrepancies, path + '.accuracy.discrepancies', true);
        c.strings(value.accuracy.verifiedFacts, path + '.accuracy.verifiedFacts', true);
        c.list(value.accuracy.citations, path + '.accuracy.citations', 0, 100, function (citation, cp) {
          if (c.obj(citation, cp)) c.fields(citation, cp, [], ['uri', 'url', 'title']);
        }, true);
      }
      if (c.obj(value.depthOfKnowledge, path + '.depthOfKnowledge', true)) {
        c.num(value.depthOfKnowledge.level, path + '.depthOfKnowledge.level', 1, 4, false, true);
        c.str(value.depthOfKnowledge.reason, path + '.depthOfKnowledge.reason');
        c.strings(value.depthOfKnowledge.ideas, path + '.depthOfKnowledge.ideas', true);
      }
    }
    report(d, p);
    c.fields(d, p, [], ['sourceLanguage', 'reportLanguage', 'displayReportLanguage']);
    if (c.obj(d.sourceTranslations, p + '.sourceTranslations', true)) c.each(Object.keys(d.sourceTranslations), function (lang) { c.str(d.sourceTranslations[lang], p + '.sourceTranslations.' + lang); });
    if (c.obj(d.reportTranslations, p + '.reportTranslations', true)) c.each(Object.keys(d.reportTranslations), function (lang) { report(d.reportTranslations[lang], p + '.reportTranslations.' + lang); });
    if (c.obj(d.localStats, p + '.localStats', true)) ['score', 'words', 'sentences', 'syllables'].forEach(function (k) { c.num(d.localStats[k], p + '.localStats.' + k, k === 'score' ? -100 : 0, 10000000); });
    c.warn('analysis-review-required', p, 'Reading-level, accuracy, and depth-of-knowledge claims are authored estimates; validation does not independently verify them.');
  }

  function brainstorm(d, p, c) {
    c.list(d, p, 1, 50, function (a, ap) {
      if (!c.obj(a, ap)) return;
      c.fields(a, ap, ['title'], ['guide', 'worksheet', 'connection', 'description', 'facilitationNotes', 'grouping', 'openingQuestion']);
      c.enumeration(a.kind, ap + '.kind', ['idea', 'discussion', 'jigsaw'], true);
      if (a.kind === 'discussion') {
        c.enumeration(a.protocol, ap + '.protocol', ['think-pair-share', 'socratic-seminar', 'fishbowl', 'gallery-walk']);
        c.str(a.openingQuestion, ap + '.openingQuestion');
        c.list(a.questionSets, ap + '.questionSets', 1, 12, function (set, sp) {
          if (!c.obj(set, sp)) return;
          c.enumeration(set.depth, sp + '.depth', ['literal', 'inferential', 'evaluative']);
          c.strings(set.questions, sp + '.questions', false, 1, 30);
        });
        if (c.obj(a.talkStems, ap + '.talkStems', true)) ['agree', 'disagree', 'clarify', 'build'].forEach(function (key) { c.strings(a.talkStems[key], ap + '.talkStems.' + key, true, 0, 20); });
        c.strings(a.lookFors, ap + '.lookFors', true, 0, 30);
      } else if (a.kind === 'jigsaw') {
        c.num(a.groupSize, ap + '.groupSize', 2, 6, false, true);
        c.fields(a, ap, ['homeGroupTask', 'synthesisOrganizer']);
        c.list(a.chunks, ap + '.chunks', 2, 6, function (chunk, cp) {
          if (!c.obj(chunk, cp)) return;
          c.fields(chunk, cp, ['label', 'expertPacket']);
          c.enumeration(chunk.suggestedLevel, cp + '.suggestedLevel', ['support', 'core', 'stretch'], true);
          if (c.obj(chunk.teachBack, cp + '.teachBack')) {
            c.strings(chunk.teachBack.keyPoints, cp + '.teachBack.keyPoints', false, 1, 30);
            c.strings(chunk.teachBack.checkQuestions, cp + '.teachBack.checkQuestions', false, 1, 30);
          }
        });
        if (Array.isArray(a.chunks) && a.chunks.length !== a.groupSize) c.fail(ap + '.chunks', 'The number of expert chunks must equal groupSize.');
        c.list(a.accountabilityCheck, ap + '.accountabilityCheck', 1, 30, function (q, qp) { if (c.obj(q, qp)) c.fields(q, qp, ['q'], ['answer']); });
      } else c.str(a.description, ap + '.description');
      if (c.obj(a.rubric, ap + '.rubric', true)) {
        c.fields(a.rubric, ap + '.rubric', [], ['title']);
        c.list(a.rubric.criteria, ap + '.rubric.criteria', 1, 30, function (criterion, cp) {
          if (!c.obj(criterion, cp)) return;
          c.str(criterion.criterion, cp + '.criterion'); c.num(criterion.weight, cp + '.weight', 0, 100, true);
          if (c.obj(criterion.levels, cp + '.levels')) c.fields(criterion.levels, cp + '.levels', ['1', '2', '3', '4']);
        });
      }
    });
  }

  function scene(d, p, c) {
    if (!c.obj(d, p)) return;
    c.str(d.text, p + '.text');
    c.strings(d.options, p + '.options', false, 0, 12);
    ['voiceMap', 'voices'].forEach(function (k) { if (c.obj(d[k], p + '.' + k, true)) c.each(Object.keys(d[k]), function (name) { c.str(d[k][name], p + '.' + k + '.' + name, false, 240); }); });
    if (c.obj(d.soundParams, p + '.soundParams', true)) c.fields(d.soundParams, p + '.soundParams', [], ['atmosphere', 'element']);
    c.strings(d.charactersInScene, p + '.charactersInScene', true, 0, 30);
    if (c.obj(d.inventoryUpdate, p + '.inventoryUpdate', true)) {
      if (c.obj(d.inventoryUpdate.add, p + '.inventoryUpdate.add', true)) c.fields(d.inventoryUpdate.add, p + '.inventoryUpdate.add', ['name'], ['type', 'description']);
    }
  }
  function adventure(d, p, c) {
    if (!c.obj(d, p)) return;
    if (d.snapshot !== undefined || d.currentScene !== undefined) {
      var state = d.snapshot !== undefined ? d.snapshot : d;
      var sp = d.snapshot !== undefined ? p + '.snapshot' : p;
      if (!c.obj(state, sp)) return;
      scene(state.currentScene, sp + '.currentScene', c);
      c.list(state.history, sp + '.history', 0, 300, function (turn, tp) {
        if (!c.obj(turn, tp)) return;
        c.fields(turn, tp, [], ['type', 'text', 'choice', 'speaker', 'feedback']);
        if (turn.scene !== undefined) scene(turn.scene, tp + '.scene', c);
      }, true);
      c.list(state.inventory, sp + '.inventory', 0, 100, function (entry, ep) { if (c.obj(entry, ep)) c.fields(entry, ep, ['name'], ['type', 'description']); }, true);
      c.list(state.characters, sp + '.characters', 0, 50, function (entry, ep) { if (c.obj(entry, ep)) c.fields(entry, ep, ['name'], ['description', 'role']); }, true);
      c.list(state.systemResources, sp + '.systemResources', 0, 24, function (entry, ep) { if (c.obj(entry, ep)) { c.fields(entry, ep, ['name'], ['unit']); c.num(entry.quantity, ep + '.quantity', -1e12, 1e12); } }, true);
      ['level', 'xp', 'xpToNextLevel', 'energy', 'gold', 'turnCount', 'choiceCount', 'climaxMinTurns', 'episodeTurnLimit'].forEach(function (k) { c.num(state[k], sp + '.' + k, 0, 1e12, true); });
      ['isGameOver', 'enableAutoClimax'].forEach(function (k) { c.bool(state[k], sp + '.' + k); });
    } else scene(d, p, c);
    c.warn('interactive-provider-required', p, 'Saved scenes can be inspected, but continuing an adventure uses the configured runtime model and is not an offline branching graph.');
  }

  function persona(d, p, c) {
    c.list(d, p, 1, 30, function (person, pp) {
      if (!c.obj(person, pp)) return;
      c.fields(person, pp, ['name', 'role', 'context', 'greeting'], ['year', 'visualDescription', 'artStyle', 'nationality', 'voice', 'voiceProfile']);
      c.num(person.initialRapport, pp + '.initialRapport', 0, 100, true);
      c.strings(person.suggestedQuestions, pp + '.suggestedQuestions', true, 0, 30);
      var ids = Object.create(null);
      c.list(person.quests, pp + '.quests', 0, 50, function (q, qp) {
        if (!c.obj(q, qp)) return;
        c.fields(q, qp, ['id', 'text']); c.num(q.difficulty, qp + '.difficulty', 0, 100, true); c.bool(q.isCompleted, qp + '.isCompleted');
        if (typeof q.id === 'string') { if (ids[q.id]) c.fail(qp + '.id', 'Quest IDs must be unique within a persona.'); ids[q.id] = true; }
      }, true);
    });
    c.warn('persona-simulation-review-required', p, 'Personas are authored simulations, not statements by the represented people. Continuing an interview requires the configured runtime model.');
  }

  function dbq(d, p, c) {
    if (!c.obj(d, p)) return;
    c.fields(d, p, ['title', 'historicalContext', 'synthesisPrompt'], ['thesisStarter', 'teacherNotes']);
    var ids = Object.create(null);
    c.list(d.documents, p + '.documents', 1, 30, function (doc, dp) {
      if (!c.obj(doc, dp)) return;
      c.fields(doc, dp, ['id', 'title', 'source', 'excerpt'], ['sourceUrl', 'perspective', 'author', 'date']);
      c.enumeration(doc.excerptKind, dp + '.excerptKind', ['verbatim', 'adapted', 'reconstructed']);
      c.enumeration(doc.documentType, dp + '.documentType', ['primary', 'secondary', 'data', 'visual', 'testimony', 'linked', 'reconstructed'], true);
      if (typeof doc.id === 'string') { if (ids[doc.id]) c.fail(dp + '.id', 'Document IDs must be unique.'); ids[doc.id] = true; }
      if (c.obj(doc.happPrompts, dp + '.happPrompts', true)) c.fields(doc.happPrompts, dp + '.happPrompts', [], ['historical', 'audience', 'purpose', 'pointOfView']);
      ['sourcingQuestions', 'analysisQuestions', 'sentenceStarters'].forEach(function (key) { c.strings(doc[key], dp + '.' + key, true, 0, 30); });
    });
    function references(value, path) {
      c.strings(value, path, false, 0, 30);
      if (Array.isArray(value)) c.each(value, function (id, index) { if (typeof id === 'string' && !ids[id]) c.fail(path + '[' + index + ']', 'Reference must match an existing document ID.'); });
    }
    c.list(d.corroborationClaims, p + '.corroborationClaims', 0, 50, function (claim, cp) {
      if (!c.obj(claim, cp)) return;
      c.fields(claim, cp, ['claim'], ['guideQuestion']); references(claim.supportingDocs || [], cp + '.supportingDocs'); references(claim.challengingDocs || [], cp + '.challengingDocs');
    }, true);
    c.list(d.perspectives, p + '.perspectives', 0, 12, function (perspective, pp) {
      if (!c.obj(perspective, pp)) return;
      c.fields(perspective, pp, ['label'], ['description']); references(perspective.docIds, pp + '.docIds');
    }, true);
    c.list(d.rubric, p + '.rubric', 1, 30, function (row, rp) { if (c.obj(row, rp)) c.fields(row, rp, ['criteria', '1', '2', '3', '4']); }, true);
    c.warn('source-fidelity-review-required', p + '.documents', 'Check excerpts, attribution, excerptKind, and provenance against the supplied sources; structural validation does not verify quotations.');
  }

  function lessonPlan(d, p, c) {
    if (!c.obj(d, p)) return;
    c.fields(d, p, ['essentialQuestion'], ['hook', 'directInstruction', 'guidedPractice', 'independentPractice', 'closure']);
    c.strings(d.objectives, p + '.objectives', false, 1, 50);
    ['materialsNeeded', 'activities', 'assessmentIdeas'].forEach(function (key) { c.strings(d[key], p + '.' + key, true, 0, 100); });
    c.list(d.successCriteria, p + '.successCriteria', 0, 50, function (criterion, cp) {
      if (typeof criterion === 'string') c.str(criterion, cp);
      else if (c.obj(criterion, cp)) c.fields(criterion, cp, ['statement'], ['id', 'source', 'evidence']);
    }, true);
    // Optional planned phase timing for "Lesson at a glance" and the one-page summary.
    c.list(d.timing, p + '.timing', 0, 20, function (step, sp) {
      if (c.obj(step, sp)) { c.fields(step, sp, ['label']); c.num(step.minutes, sp + '.minutes', 1, 240, false, true); }
    }, true);
    if (typeof d.extensions === 'string') c.str(d.extensions, p + '.extensions', true);
    else c.list(d.extensions, p + '.extensions', 0, 50, function (extension, ep) {
      if (typeof extension === 'string') c.str(extension, ep);
      else if (c.obj(extension, ep)) c.fields(extension, ep, ['title', 'description'], ['guide', 'worksheet']);
    }, true);
    c.list(d.recommendedStemTools, p + '.recommendedStemTools', 0, 50, function (tool, tp) { if (c.obj(tool, tp)) c.fields(tool, tp, ['id'], ['name', 'reason', 'purpose']); }, true);
  }

  // Audit dimensions have evolving quantitative fields. Validate collection and
  // text containers used by the renderer while preserving recorded evidence.
  function alignment(d, p, c) {
    if (!c.obj(d, p)) return;
    if (!c.obj(d.comprehensive, p + '.comprehensive')) return;
    var comp = d.comprehensive;
    var dimensions = ['standards', 'vocabulary', 'engagement', 'accessibility', 'udl', 'accuracy', 'differentiation', 'cognitiveLoad', 'culturalResponsiveness'];
    var reportLists = ['reports', 'perArtifact', 'sampleVerifications', 'perSegment', 'blockingIssues', 'incompleteIssues', 'findingAttributions', 'includedArtifacts', 'nodes', 'edges', 'criteria', 'readingLevels'];
    var textLists = ['recommendations', 'corrections', 'missedTier2', 'formatGaps', 'colorOnlyExamples', 'implicitImageExamples', 'studentImpacts', 'fixes', 'claimsToVerify', 'priorityAdditions', 'qualityFlags', 'specificAdjustments', 'strengths', 'gaps', 'additions', 'distinctTypes', 'includedTypes', 'includedArtifactIds', 'artifactIds', 'warnings', 'serializationFailures', 'tier2Words', 'tier3Words', 'tier2Examples', 'tier3Examples', 'modalitiesPresent', 'present', 'missing'];
    var textFields = ['notes', 'reason', 'error', 'narrative', 'standard', 'evidence', 'status', 'issue', 'dimension', 'scoreBasis', 'dokAssessment', 'adminRecommendation', 'overallDetermination', 'cognitiveDemand', 'contentFocus', 'selectionMode', 'generatedAt', 'gradeLevel', 'auditLanguage', 'auditLanguageTag', 'rating', 'overallNarrative', 'title', 'label'];
    var numberFields = ['score', 'sourceWords', 'auditedTextWords', 'totalWords', 'tier2Count', 'tier3Count', 'glossaryTermsCount', 'distinctTypeCount', 'totalArtifacts', 'diversityScore', 'dokTotal', 'totalAnalyses', 'totalVerifiedFacts', 'totalDiscrepancies', 'verifiedFactCount', 'discrepancyCount', 'wordCount', 'sentenceCount', 'avgSentenceLength', 'minutes'];
    var visited = [];
    function walk(value, path, depth) {
      if (!value || typeof value !== 'object' || depth > 24 || c.exhausted()) return;
      if (visited.indexOf(value) >= 0) { c.fail(path, 'Expected acyclic JSON data.'); return; }
      visited.push(value);
      c.each(Object.keys(value), function (key) {
        var child = value[key], cp = path + '.' + key;
        if (textLists.indexOf(key) >= 0) c.strings(child, cp, true, 0, 1000);
        else if (reportLists.indexOf(key) >= 0) c.list(child, cp, 0, 1000, function (entry, ep) { c.obj(entry, ep); }, true);
        else if (textFields.indexOf(key) >= 0) c.str(child, cp, true);
        else if (numberFields.indexOf(key) >= 0) c.num(child, cp, -1e12, 1e12, true);
        if (child && typeof child === 'object') walk(child, cp, depth + 1);
      });
      visited.pop();
    }
    c.list(d.reports, p + '.reports', 0, 100, function (report, rp) { if (c.obj(report, rp)) c.fields(report, rp, ['standard']); }, true);
    var present = 0;
    dimensions.forEach(function (key) { if (comp[key] !== undefined) { present++; c.obj(comp[key], p + '.comprehensive.' + key); } });
    if (!present) c.fail(p + '.comprehensive', 'Include at least one native audit dimension, with evidence or an explicit notEvaluated/notApplicable/computeFailed status.');
    ['auditScope', 'auditMetadata', 'overall', 'alignmentMapGraph'].forEach(function (key) { c.obj(comp[key], p + '.comprehensive.' + key, true); });
    walk(d, p, 0);
    c.warn('audit-not-recomputed', p, 'This validates the saved report shape only. It does not recompute alignment, readiness, source accuracy, or accessibility conformance.');
  }

  function wordSounds(d, p, c, item) {
    c.list(d, p, 1, 200, function (word, wp) {
      if (!c.obj(word, wp)) return;
      var target = word.targetWord || word.word || word.term;
      c.str(target, wp + '.targetWord', false, 240);
      c.fields(word, wp, [], ['term', 'word', 'targetWord', 'displayWord', 'firstSound', 'lastSound', 'definition', 'sentence', 'familyEnding', 'rhymeWord']);
      c.list(word.phonemes, wp + '.phonemes', 1, 40, function (phoneme, pp) {
        if (typeof phoneme === 'string') c.str(phoneme, pp, false, 100);
        else if (c.obj(phoneme, pp)) {
          if (!['sound', 'phoneme', 'ipa'].some(function (key) { return typeof phoneme[key] === 'string' && phoneme[key].trim(); })) c.fail(pp, 'A phoneme object needs sound, phoneme, or ipa text.');
          c.fields(phoneme, pp, [], ['sound', 'phoneme', 'ipa', 'grapheme', 'letter', 'type']);
        }
      });
      ['graphemes', 'rhymes', 'rhymeDistractors', 'blendingDistractors', 'orthographyDistractors', 'sentenceDistractors', 'story', 'familyMembers', 'syllableBlendingOptions'].forEach(function (key) { c.strings(word[key], wp + '.' + key, true, 0, 100); });
      if (Array.isArray(word.syllables)) c.strings(word.syllables, wp + '.syllables', false, 1, 40);
      else c.num(word.syllables, wp + '.syllables', 1, 40, true, true);
      c.num(word.phonemeCount, wp + '.phonemeCount', 1, 40, true, true);
      if (Array.isArray(word.phonemes) && word.phonemeCount !== undefined && word.phonemeCount !== word.phonemes.length) c.fail(wp + '.phonemeCount', 'phonemeCount must match the phonemes array.');
      if (c.obj(word.manipulationTask, wp + '.manipulationTask', true)) {
        c.fields(word.manipulationTask, wp + '.manipulationTask', ['instruction', 'answer'], ['type', 'targetPhoneme']);
        c.strings(word.manipulationTask.distractors, wp + '.manipulationTask.distractors', false, 2, 12);
      }
    });
    c.strings(item.lessonPlanSequence, p.replace(/\.data$/, '') + '.lessonPlanSequence', true, 0, 30);
    c.warn('word-sounds-review-required', p, 'Review pronunciations, phoneme/grapheme mappings, and prepared audio readiness in Word Sounds Studio. Structural validation does not establish phonics accuracy or offline audio availability.');
  }

  // graphData is a drawing contract, not arbitrary HTML. This deliberately small
  // XML subset has no executable, embedded, CSS, or URL-bearing elements. The
  // browser also sanitizes at insertion time, independently of this validator.
  // __ALLO_STATIC_SVG_POLICY_BEGIN__
  var SVG_TAGS = /^(?:svg|g|defs|title|desc|path|rect|circle|ellipse|line|polyline|polygon|text|tspan|linearGradient|radialGradient|stop|clipPath|marker)$/;
  var SVG_NUMERIC = /^(?:x|y|x1|y1|x2|y2|cx|cy|r|rx|ry|dx|dy|width|height|viewBox|points|stroke-width|stroke-dasharray|stroke-dashoffset|stroke-miterlimit|opacity|fill-opacity|stroke-opacity|stop-opacity|offset|font-size|letter-spacing|word-spacing|textLength|startOffset|fx|fy|fr|markerWidth|markerHeight|refX|refY)$/;
  var SVG_WORDS = /^(?:fill-rule|clip-rule|stroke-linecap|stroke-linejoin|text-anchor|dominant-baseline|alignment-baseline|font-weight|font-style|font-family|preserveAspectRatio|gradientUnits|spreadMethod|clipPathUnits|markerUnits|vector-effect|lengthAdjust|role)$/;
  function staticSvgAttribute(name, value) {
    if (name === 'xmlns') return value === 'http://www.w3.org/2000/svg';
    if (name === 'xmlns:xlink') return value === 'http://www.w3.org/1999/xlink';
    if (name === 'aria-label' || name === 'aria-labelledby' || name === 'aria-describedby') return !/[<&\x00-\x1f]/.test(value);
    if (name === 'aria-hidden' || name === 'focusable') return /^(?:true|false)$/.test(value);
    if (name === 'id' || name === 'class') return /^[A-Za-z_][A-Za-z0-9_. -]*$/.test(value);
    if (SVG_NUMERIC.test(name)) return value.length <= 20000 && /^[0-9eE+.,%\s-]+$/.test(value);
    if (SVG_WORDS.test(name)) return /^[A-Za-z0-9 ,_-]+$/.test(value);
    if (name === 'd') return /^[MmZzLlHhVvCcSsQqTtAa0-9eE+.,\s-]+$/.test(value);
    if (name === 'transform' || name === 'gradientTransform') return /^(?:(?:matrix|translate|scale|rotate|skewX|skewY)\([0-9eE+.,\s-]+\)[\s,]*)+$/.test(value);
    if (name === 'fill' || name === 'stroke' || name === 'stop-color' || name === 'color') return /^(?:#[a-fA-F0-9]{3,8}|[A-Za-z]+|(?:rgb|rgba|hsl|hsla)\([0-9.,%+\s-]+\)|url\(#[A-Za-z_][A-Za-z0-9_.-]*\))$/.test(value);
    if (/^(?:clip-path|marker-start|marker-mid|marker-end)$/.test(name)) return /^(?:none|url\(#[A-Za-z_][A-Za-z0-9_.-]*\))$/.test(value);
    if (name === 'orient') return /^(?:auto|auto-start-reverse|[-+0-9.eE]+)$/.test(value);
    return false;
  }
  function validateStaticSvg(value) {
    if (typeof value !== 'string' || !value.trim() || value.length > 120000) return false;
    // This is a bounded recognizer for the subset above, not a permissive HTML
    // parser. Quotes are mandatory, duplicate attributes and XML declarations
    // are rejected, and every character must belong to a recognized token.
    var stack = [], rootSeen = false, count = 0, pos = 0, match;
    var tokens = /<[^>]*>|[^<]+/g;
    while ((match = tokens.exec(value))) {
      if (match.index !== pos) return false;
      var token = match[0]; pos = tokens.lastIndex;
      if (token[0] !== '<') {
        if (!stack.length && token.trim()) return false;
        if (token.replace(/&(?:amp|lt|gt|quot|apos|#\d{1,7}|#x[a-fA-F0-9]{1,6});/g, '').includes('&')) return false;
        continue;
      }
      if (/^<\//.test(token)) {
        var end = /^<\/([A-Za-z]+)\s*>$/.exec(token);
        if (!end || stack.pop() !== end[1]) return false;
        continue;
      }
      var start = /^<([A-Za-z]+)([\s\S]*?)(\/?)>$/.exec(token);
      if (!start || !SVG_TAGS.test(start[1]) || ++count > 2048) return false;
      if (!stack.length) {
        if (rootSeen || start[1] !== 'svg') return false;
        rootSeen = true;
      } else if (start[1] === 'svg') return false;
      var rest = start[2], attrs = Object.create(null), attr;
      while (rest.trim()) {
        attr = /^\s+([A-Za-z][A-Za-z0-9:-]*)\s*=\s*(?:"([^"<>]*)"|'([^'<>]*)')/.exec(rest);
        if (!attr || attrs[attr[1]] || !staticSvgAttribute(attr[1], attr[2] === undefined ? attr[3] : attr[2])) return false;
        attrs[attr[1]] = true; rest = rest.slice(attr[0].length);
      }
      if (!start[3]) stack.push(start[1]);
      if (stack.length > 32) return false;
    }
    return pos === value.length && rootSeen && stack.length === 0;
  }
  // __ALLO_STATIC_SVG_POLICY_END__
  function validateMathGraph(value, path, errors) {
    if (value === undefined || value === null || value === '') return;
    if (!validateStaticSvg(value) && errors.length < MAX_ERRORS) errors.push(issue('unsafe-math-graph', path, 'Use static SVG shapes and text with presentation attributes, at most 120000 characters, 2048 elements and 32 levels. Scripts, animation, links, embedded images, foreign content, CSS, and external references are not supported.'));
  }

  function validateMathData(d, p, errors, warnings) {
    var c = checkContext(errors, warnings || []);
    if (!c.obj(d, p)) return true;
    c.str(d.problem !== undefined ? d.problem : d.question, p + (d.problem !== undefined ? '.problem' : '.question'));
    if (typeof d.answer === 'number') c.num(d.answer, p + '.answer', -1e100, 1e100); else c.str(d.answer, p + '.answer');
    c.str(d.realWorld, p + '.realWorld', true);
    c.list(d.steps, p + '.steps', 0, 100, function (step, sp) {
      if (typeof step === 'string') c.str(step, sp);
      else if (c.obj(step, sp)) c.fields(step, sp, ['explanation'], ['latex']);
    }, true);
    validateMathGraph(d.graphData, p + '.graphData', errors);
    return true;
  }

  function validateResource(item, path, errors, warnings) {
    if (!item || TYPES.indexOf(item.type) < 0) return false;
    var c = checkContext(errors, warnings || []), p = path + '.data', d = item.data;
    if (item.type === 'analysis') analysis(d, p, c);
    else if (item.type === 'brainstorm') brainstorm(d, p, c);
    else if (item.type === 'adventure') adventure(d, p, c);
    else if (item.type === 'persona') persona(d, p, c);
    else if (item.type === 'dbq') dbq(d, p, c);
    else if (item.type === 'lesson-plan') lessonPlan(d, p, c);
    else if (item.type === 'alignment-report') alignment(d, p, c);
    else if (item.type === 'word-sounds') wordSounds(d, p, c, item);
    else if (item.type === 'udl-advice') c.str(d, p);
    else if (item.type === 'gemini-bridge') {
      c.strings(d, p, false, 1, 30);
      c.warn('external-artifact-generation-required', p, 'Gemini Bridge stores prompt steps, not a runnable generated app. Executing the prompts requires the selected external generation workflow.');
    }
    return true;
  }

  function getContracts() {
    var contracts = [
      { type: 'analysis', description: 'Source text and educator analysis; estimates and quotations require review.', example: { originalText: 'A seed needs suitable conditions to germinate.', readingLevel: { range: 'Unmeasured', explanation: 'Educator review pending.' }, concepts: ['Germination'], accuracy: { rating: 'Unreviewed', reason: 'Check against the supplied source.' }, grammar: [], sourceLanguage: 'English' } },
      { type: 'brainstorm', description: 'Idea cards, discussion kits, or jigsaws; optional guide, worksheet, rubric, and coverImage.', variants: ['idea', 'discussion', 'jigsaw'], example: [{ kind: 'discussion', title: 'Compare the evidence', protocol: 'think-pair-share', grouping: 'Think individually, then compare with a partner.', openingQuestion: 'Which detail supports your interpretation?', questionSets: [{ depth: 'literal', questions: ['What does the source state?'] }, { depth: 'inferential', questions: ['What does that detail suggest?'] }], talkStems: { agree: ['I agree because…'], disagree: ['Another interpretation is…'], clarify: ['What do you mean by…?'], build: ['I would add…'] }, lookFors: ['Connect a response to a contribution.'], facilitationNotes: 'Allow thinking time.' }] },
      { type: 'adventure', description: 'Opening scene or saved data.snapshot.currentScene and state. Continued play requires a runtime provider.', example: { text: 'Your team must decide which evidence to examine first.', options: ['Inspect the record', 'Ask a clarifying question'] } },
      { type: 'persona', description: 'Interview character cards with authored context and greeting; further conversation requires a runtime provider.', example: [{ name: 'A fictional researcher', role: 'Investigator', context: 'A fictional voice used to examine the supplied case.', greeting: 'What evidence would you like to discuss?', suggestedQuestions: ['What remains uncertain?'], quests: [] }] },
      { type: 'dbq', description: 'Document evidence packet with explicit excerptKind, unique IDs, optional HAPP prompts, corroboration, and four-level rubric.', example: { title: 'Compare two records', historicalContext: 'Two fictional classroom records are provided for practice.', documents: [{ id: 'A', title: 'Record A', source: 'Original teaching example', excerptKind: 'reconstructed', documentType: 'data', excerpt: 'The group recorded three observations.', sourcingQuestions: ['Who created the record?'], analysisQuestions: ['What can this record establish?'] }], corroborationClaims: [], synthesisPrompt: 'Explain a claim the supplied record supports and what remains uncertain.' } },
      { type: 'lesson-plan', description: 'Lesson plan with objectives, phases, materials, success criteria, optional planned timing ([{ label, minutes }]) for the one-page summary, and optional extension activities.', example: { essentialQuestion: 'How do we support an interpretation?', objectives: ['Connect a claim to source evidence.'], hook: 'Compare two possible interpretations.', guidedPractice: 'Model a claim and its evidence.', independentPractice: 'Develop and explain an interpretation.', closure: 'Identify what changed or remained uncertain.', successCriteria: [{ id: 'evidence', statement: 'I can connect a claim to source evidence.', source: 'author' }], timing: [{ label: 'Hook', minutes: 5 }, { label: 'Guided practice', minutes: 15 }, { label: 'Independent practice', minutes: 15 }, { label: 'Closure', minutes: 5 }] } },
      { type: 'gemini-bridge', description: 'Sequential prompt strings for an external simulation/app-generation workflow, not executable app code.', example: ['Build a classroom tool that lets students compare supplied evidence.', 'Add accessible controls and an explanation of the limitations.'] },
      { type: 'alignment-report', description: 'Recorded comprehensive curriculum audit, not recomputed or verified by pack validation.', example: { reports: [], comprehensive: { standards: { notApplicable: true, reason: 'No target standards have been supplied.' }, accuracy: { notEvaluated: true, reason: 'Source verification has not been performed.' } } } },
      { type: 'udl-advice', description: 'Educator-facing guidance text.', example: 'Offer time to prepare a response and more than one way to communicate it.' },
      { type: 'word-sounds', description: 'Prepared word records with phonemes; review phonics and audio readiness in the studio.', example: [{ term: 'cat', word: 'cat', targetWord: 'cat', phonemes: ['k', 'æ', 't'], phonemeCount: 3, syllables: 1, graphemes: ['c', 'a', 't'] }] }
    ];
    contracts[1].variantExamples = {
      idea: [{ kind: 'idea', title: 'Compare interpretations', description: 'Develop two interpretations, then compare the evidence that supports each.', connection: 'Use details from the supplied source.' }],
      discussion: contracts[1].example,
      jigsaw: [{ kind: 'jigsaw', title: 'Put the evidence together', groupSize: 2,
        chunks: [
          { label: 'Record A', expertPacket: 'Read the first supplied record and identify a claim it supports.', teachBack: { keyPoints: ['Explain the record and its limits.'], checkQuestions: ['Which detail supports the claim?'] } },
          { label: 'Record B', expertPacket: 'Read the second supplied record and identify what it adds.', teachBack: { keyPoints: ['Explain what the second record contributes.'], checkQuestions: ['What remains uncertain?'] } }
        ], homeGroupTask: 'Compare both records and explain an interpretation.', synthesisOrganizer: 'Record A | Record B | Shared interpretation | Open question',
        accountabilityCheck: [{ q: 'How does each record contribute to your interpretation?', answer: 'Connect a claim to evidence from each record and identify a limitation.' }] }]
    };
    contracts[2].variantExamples = { opening: contracts[2].example, snapshot: { snapshot: { currentScene: contracts[2].example, history: [], inventory: [], systemResources: [], turnCount: 1, level: 1, xp: 0, xpToNextLevel: 100, energy: 100, isGameOver: false } } };
    return contracts;
  }
  var api = { TYPES: TYPES, validateResource: validateResource, validateMathData: validateMathData, validateMathGraph: validateMathGraph, validateStaticSvg: validateStaticSvg, getContracts: getContracts };
  if (typeof window !== 'undefined') { window.AlloModules = window.AlloModules || {}; window.AlloModules.AgentCorePackNative = api; }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
