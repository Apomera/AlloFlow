(function() {
'use strict';
if (window.AlloModules && window.AlloModules.GenDispatcherModule) { console.log('[CDN] GenDispatcherModule already loaded, skipping'); return; }
// generate_dispatcher_source.jsx - Phase J of CDN modularization.
// handleGenerate (2,286 lines) — the resource-generation dispatcher.
// Switch-on-type router for simplified/glossary/quiz/outline/image/etc.

// ─── Plan O Step 1: Vocabulary fit (deterministic) ──────────────────────
// Common 7+ letter words that should NOT count as Tier 2 academic vocab.
// Beck/McKeown defines Tier 2 as "high-utility academic words found across
// disciplines"; Tier 1 is everyday common vocab. This list catches false
// positives where word-length alone would misclassify a common word.
const COMMON_LONGER_WORDS = new Set([
  'another','because','between','through','without','thought','everyone','anything','everything','something','sometimes','somewhere','anywhere','believe','remember','important','different','together','morning','evening','country','children','friends','family','brother','sister','parents','teacher','student','teacher','school','student','question','answer','really','always','already','almost','beautiful','people','around','before','during','should','would','could','little','really','yourself','myself','himself','herself','themselves','about','above','across','against','behind','beside','beyond','underneath','tomorrow','yesterday','probably','possibly','definitely','certainly','therefore','however','because','though','although','whether','whenever','wherever','whatever','whichever','suddenly','quickly','slowly','carefully','actually','finally','exactly','maybe','perhaps','quite','everyone','someone','nobody','nothing','everywhere','anywhere','sometimes','always','usually','sometimes','never','wanted','seemed','looked','started','stopped','asked','helped','jumped','walked','talked','played','laughed','smiled','cried','watched','listened','followed','answered','planted','painted','reached','turned','opened','closed','picked','dropped','pulled','pushed','rolled','tossed','grabbed','knocked','shouted','whispered','laughed','climbed','crawled','floated','marched'
]);
// Suffixes that strongly indicate Tier 3 (domain-specific) vocabulary.
const TIER3_SUFFIX_RE = /(?:tion|sion|ology|ography|ography|osis|itis|emia|ase|ative|ation|ical|graphic|metric|phobia|trophy|stitial|chrom|sphere|morph|fluence|mission|version|ception|ulation)$/;

function parseGradeLevelToNum(g) {
  if (!g) return 4;
  const s = String(g).toLowerCase();
  if (/kinder|kg|^k\b/.test(s)) return 0;
  const m = s.match(/(\d+)/);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n <= 12) return n;
  }
  if (/college|under-?grad/.test(s)) return 13;
  if (/grad/.test(s)) return 14;
  return 4;
}

function gradeBandExpectations(grade) {
  // Approximate Beck/McKeown norms for academic vocabulary load per ~500-word
  // lesson, scaled by grade band. Values are conservative starting points;
  // teachers can override when interpreting.
  if (grade <= 2)  return { tier2: 4,  tier3: 2,  band: 'K-2'    };
  if (grade <= 5)  return { tier2: 8,  tier3: 5,  band: '3-5'    };
  if (grade <= 8)  return { tier2: 14, tier3: 9,  band: '6-8'    };
  if (grade <= 12) return { tier2: 22, tier3: 15, band: '9-12'   };
  return                 { tier2: 30, tier3: 22, band: 'College' };
}

// ─── Plan O: In-session LLM-review cache ─────────────────────────────
// Keyed by (dimension, artifact-fingerprint, gradeLevel). On audit re-run,
// dimensions whose inputs haven't changed reuse cached LLM reviews instead
// of re-calling Gemini. Persists for the page session only; cleared on reload.
const _auditLLMCache = new Map();
function _hashStr(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
}
function _auditFingerprint(artifacts, ...extras) {
    const safe = Array.isArray(artifacts) ? artifacts : [];
    const sorted = safe.slice().sort((a, b) => {
        const ai = (a && a.id) || '';
        const bi = (b && b.id) || '';
        return ai < bi ? -1 : ai > bi ? 1 : 0;
    });
    const parts = sorted.map(a => {
        if (!a) return '?';
        let dataHash = '0';
        try { dataHash = _hashStr(JSON.stringify(a.data || null)); } catch (e) { dataHash = 'circ'; }
        return (a.id || '?') + ':' + (a.type || '?') + ':' + dataHash;
    });
    return _hashStr(parts.join('|') + '||' + extras.join('|'));
}

// ─── Plan O: Harvest existing audit signals from artifacts ─────────────
// AlloFlow already produces audit-shaped data inside individual artifacts
// (analysis items contain reading-level bands + accuracy ratings; simplified
// items contain readability shifts; quiz items contain DOK levels). The
// comprehensive audit should USE these signals rather than re-derive them.
function harvestExistingAuditSignals(artifacts) {
  const out = {
    readingLevels: [],         // from analysis items: ranges + explanations
    accuracyRatings: [],       // from analysis items: rating + reason + counts
    simplifiedShifts: [],      // from simplified items: original vs simplified delta
    dokLevels: [],             // from quiz items: per-question DOK
    quizCounts: { total: 0, mcq: 0, reflection: 0 },
    scaffoldCounts: { sentenceFrames: 0, simplifiedTexts: 0, leveledGlossary: 0 },
    multimodal: { text: false, image: false, audio: false, interactive: false },
    distinctTypes: new Set(),
  };
  artifacts.forEach(item => {
    if (!item || !item.type) return;
    out.distinctTypes.add(item.type);
    const d = item.data;
    if (!d) return;
    if (item.type === 'analysis') {
      out.multimodal.text = true;
      if (d.readingLevel && d.readingLevel.range) {
        out.readingLevels.push({
          range: String(d.readingLevel.range),
          explanation: String(d.readingLevel.explanation || ''),
        });
      }
      if (d.accuracy && d.accuracy.rating) {
        out.accuracyRatings.push({
          rating: String(d.accuracy.rating),
          reason: String(d.accuracy.reason || ''),
          discrepancyCount: Array.isArray(d.accuracy.discrepancies) ? d.accuracy.discrepancies.length : 0,
          verifiedFactCount: Array.isArray(d.accuracy.verifiedFacts) ? d.accuracy.verifiedFacts.length : 0,
        });
      }
    } else if (item.type === 'simplified') {
      out.scaffoldCounts.simplifiedTexts++;
      out.multimodal.text = true;
      // Simplified data shape varies; record what we can.
      if (typeof d === 'object' && d) {
        const original = d.originalText || d.original || '';
        const simplified = d.simplifiedText || d.text || (typeof d === 'string' ? d : '');
        if (original && simplified) {
          const origWords = (original.match(/\S+/g) || []).length;
          const simpWords = (simplified.match(/\S+/g) || []).length;
          out.simplifiedShifts.push({
            originalWords: origWords,
            simplifiedWords: simpWords,
            ratio: origWords > 0 ? +(simpWords / origWords).toFixed(2) : null,
            targetGrade: d.targetGrade || d.grade || null,
          });
        }
      }
    } else if (item.type === 'quiz' && d.questions) {
      out.multimodal.interactive = true;
      out.quizCounts.total += d.questions.length;
      d.questions.forEach(q => {
        if (q && q.dok) out.dokLevels.push(String(q.dok));
        if (q && q.type === 'reflection') out.quizCounts.reflection++;
        else out.quizCounts.mcq++;
      });
    } else if (item.type === 'sentence-frames') {
      out.scaffoldCounts.sentenceFrames++;
      out.multimodal.text = true;
    } else if (item.type === 'glossary') {
      out.multimodal.text = true;
      // Tiered glossary entries (with definitionLevel) count as scaffolds
      if (Array.isArray(d) && d.some(g => g && (g.definitionLevel || g.tier))) {
        out.scaffoldCounts.leveledGlossary++;
      }
    } else if (item.type === 'image' || item.type === 'concept-sort') {
      out.multimodal.image = true;
    } else if (item.type === 'adventure' || item.type === 'persona') {
      out.multimodal.interactive = true;
      out.multimodal.text = true;
    }
  });
  return out;
}

// ─── Plan O Step 2: Engagement variety (deterministic + LLM review) ────
function computeEngagementVariety(harvest, artifacts) {
  const distinctTypeCount = harvest.distinctTypes.size;
  const totalArtifacts = artifacts.length;
  // Diversity score: 0-1, where 1 = perfect balance across many types
  const diversity = totalArtifacts > 0
    ? Math.min(1, distinctTypeCount / Math.max(3, Math.min(7, totalArtifacts)))
    : 0;

  // DOK distribution as percentages
  const dokDist = { L1: 0, L2: 0, L3: 0, L4: 0, unknown: 0 };
  harvest.dokLevels.forEach(level => {
    const m = String(level).match(/[1-4]/);
    if (!m) { dokDist.unknown++; return; }
    dokDist['L' + m[0]]++;
  });
  const dokTotal = harvest.dokLevels.length;
  const dokPercent = {};
  if (dokTotal > 0) {
    ['L1','L2','L3','L4','unknown'].forEach(k => {
      dokPercent[k] = Math.round((dokDist[k] / dokTotal) * 100);
    });
  }

  // Multi-modal coverage
  const modalitiesPresent = ['text','image','audio','interactive'].filter(m => harvest.multimodal[m]);

  // Status logic
  let status = 'Aligned';
  const recommendations = [];
  if (distinctTypeCount < 3) {
    status = 'Partially Aligned';
    recommendations.push(`Only ${distinctTypeCount} artifact type(s) present. Consider adding at least 2 more formats (e.g., visual organizer, sentence frames, quiz, leveled text) for engagement variety.`);
  }
  if (modalitiesPresent.length < 2) {
    if (status === 'Aligned') status = 'Partially Aligned';
    recommendations.push(`Only ${modalitiesPresent.length} modality present (${modalitiesPresent.join(', ') || 'none'}). UDL recommends multiple means of representation; add image/visual or interactive elements.`);
  }
  if (dokTotal > 0 && dokDist.L1 / dokTotal > 0.8) {
    if (status === 'Aligned') status = 'Partially Aligned';
    recommendations.push(`Quiz DOK skews heavily to recall (Level 1: ${dokPercent.L1}%). Add Level 2-3 questions that require application or strategic thinking.`);
  }
  if (harvest.scaffoldCounts.sentenceFrames + harvest.scaffoldCounts.simplifiedTexts === 0 && totalArtifacts >= 3) {
    if (status === 'Aligned') status = 'Partially Aligned';
    recommendations.push('No scaffolds detected (sentence frames, simplified text, leveled glossary). Consider adding scaffolds to support diverse learners.');
  }

  return {
    status,
    diversityScore: +diversity.toFixed(2),
    distinctTypeCount,
    distinctTypes: Array.from(harvest.distinctTypes),
    totalArtifacts,
    dokDistribution: dokPercent,
    dokTotal,
    quizCounts: harvest.quizCounts,
    scaffoldCounts: harvest.scaffoldCounts,
    multimodalCoverage: { present: modalitiesPresent, missing: ['text','image','audio','interactive'].filter(m => !harvest.multimodal[m]) },
    simplifiedShiftSamples: harvest.simplifiedShifts.slice(0, 4),
    recommendations,
    notes: 'Counts are deterministic; format-balance recommendations are heuristic. The LLM review provides contextual judgment.',
  };
}

// ─── Plan O Step 5: Content accuracy (harvest + LLM review) ────────────
// AlloFlow already runs accuracy verification when teachers analyze source
// text — analysis.accuracy contains rating + reason + discrepancies +
// verifiedFacts (with citations). We aggregate those signals and add an
// LLM review pass that interprets across analyses + flags claims still
// needing verification in non-analysis artifacts (quiz answers, glossary
// defs, lesson-plan facts).
function computeContentAccuracy(harvest) {
  const ratings = harvest.accuracyRatings || [];
  const totalAnalyses = ratings.length;
  let highCount = 0, mediumCount = 0, lowCount = 0;
  let totalVerifiedFacts = 0, totalDiscrepancies = 0;
  ratings.forEach(r => {
    const rating = String(r.rating || '').toLowerCase();
    if (rating.indexOf('high') >= 0) highCount++;
    else if (rating.indexOf('low') >= 0 || rating.indexOf('poor') >= 0) lowCount++;
    else mediumCount++;
    totalVerifiedFacts += r.verifiedFactCount || 0;
    totalDiscrepancies += r.discrepancyCount || 0;
  });
  // Status logic
  let status = 'Aligned';
  const recommendations = [];
  if (totalAnalyses === 0) {
    status = 'Aligned';
    recommendations.push('No source-text analysis has been run yet. Run "Analyze Source Text" on the lesson source to surface AI-verified facts and any discrepancies.');
  } else {
    if (lowCount > 0) {
      status = 'Not Aligned';
      recommendations.push(`${lowCount} analysis flagged the source content as Low accuracy. Review the discrepancies in those analyses and revise the source before sharing with students.`);
    }
    if (totalDiscrepancies > 0) {
      if (status !== 'Not Aligned') status = 'Partially Aligned';
      recommendations.push(`${totalDiscrepancies} factual discrepancy${totalDiscrepancies === 1 ? '' : 'ies'} flagged across the analyses. Review and either correct the source or remove the affected sections.`);
    }
    if (mediumCount > 0 && status === 'Aligned') {
      status = 'Partially Aligned';
      recommendations.push(`${mediumCount} analysis returned Medium accuracy. Consider adding citations or rephrasing claims that the AI could not fully verify.`);
    }
  }
  return {
    status,
    totalAnalyses,
    accuracyRatingCounts: { high: highCount, medium: mediumCount, low: lowCount },
    totalVerifiedFacts,
    totalDiscrepancies,
    sampleVerifications: ratings.slice(0, 5),
    recommendations,
    notes: 'Aggregated from analyze-source-text accuracy passes. Each analysis already runs Google-Search-grounded verification when generated; this section aggregates those results across the curriculum.',
  };
}

// ─── Plan R+ dim: Differentiation coverage ──────────────────────────────
// UDL-aligned check: does the curriculum offer multiple access paths for
// learners who differ in reading level, language, processing style, or
// expression mode? Deterministic detection of accommodation TYPES present
// across the artifact bundle.
function computeDifferentiationCoverage(artifacts, harvest) {
  const has = function (type) { return artifacts.some(function (a) { return a && a.type === type; }); };
  const flags = {
    leveledReadingText: false,    // simplified text exists
    multipleReadingLevels: false, // simplified at multiple levels (look at differentiationGrades)
    glossarySupport: has('glossary'),
    sentenceFrames: has('sentence-frames'),
    visualOrganizer: has('outline') || has('concept-sort') || has('timeline'),
    quizScaffold: has('quiz'),
    interactiveOrAdventure: has('adventure') || has('persona'),
    visualOrImage: has('image'),
    audioPath: false,             // currently rare; may inflate later as TTS hooks proliferate
  };
  artifacts.forEach(function (a) {
    if (a && a.type === 'simplified') {
      flags.leveledReadingText = true;
      var d = a.data || {};
      // Check if leveled at multiple levels via differentiationGrades or array shape
      if (Array.isArray(d.versions) && d.versions.length > 1) flags.multipleReadingLevels = true;
      if (Array.isArray(d.differentiationGrades) && d.differentiationGrades.length > 1) flags.multipleReadingLevels = true;
    }
    // Audio detection: any artifact with audioUrl/ttsAudio fields
    if (a && a.data) {
      var dd = a.data;
      if (dd.audioUrl || dd.ttsAudio || dd.audioPath || (dd.audio && (dd.audio.url || dd.audio.path))) flags.audioPath = true;
    }
  });
  // Reuse harvest scaffold counts where available
  var sf = harvest && harvest.scaffoldCounts ? harvest.scaffoldCounts : {};
  if ((sf.sentenceFrames || 0) > 0) flags.sentenceFrames = true;
  if ((sf.simplifiedTexts || 0) > 1) flags.multipleReadingLevels = true;
  if ((sf.leveledGlossary || 0) > 0) flags.glossarySupport = true;

  const dims = Object.keys(flags);
  const presentCount = dims.reduce(function (n, k) { return n + (flags[k] ? 1 : 0); }, 0);
  const coverage = dims.length > 0 ? Math.round((presentCount / dims.length) * 100) : 0;
  // Status thresholds: 70%+ Aligned, 40-69% Partial, <40% Not Aligned.
  let status;
  if (coverage >= 70) status = 'Aligned';
  else if (coverage >= 40) status = 'Partially Aligned';
  else status = 'Not Aligned';
  // Per-row recommendation list
  const labelMap = {
    leveledReadingText: 'Leveled / simplified text',
    multipleReadingLevels: 'Multi-level versions (more than one reading level)',
    glossarySupport: 'Glossary / vocabulary support',
    sentenceFrames: 'Sentence frames (writing scaffold)',
    visualOrganizer: 'Visual organizer (outline / concept sort / timeline)',
    quizScaffold: 'Formative check / quiz',
    interactiveOrAdventure: 'Interactive or adventure mode',
    visualOrImage: 'Visual / image support',
    audioPath: 'Audio narration path',
  };
  const missing = dims.filter(function (k) { return !flags[k]; }).map(function (k) { return labelMap[k]; });
  const recommendations = [];
  if (missing.length > 0 && coverage < 70) {
    recommendations.push('Differentiation gaps: missing ' + missing.slice(0, 4).join(', ') + (missing.length > 4 ? ', and more' : '') + '. Generate at least one of these to broaden access for learners with different needs.');
  }
  if (!flags.multipleReadingLevels && flags.leveledReadingText) {
    recommendations.push('Source text exists at one level only. Generate a second simplified version to support a wider reader range.');
  }
  return {
    status,
    coverage,
    presentCount,
    totalAccommodationTypes: dims.length,
    flags,
    missing,
    recommendations,
    notes: 'Detects ' + dims.length + ' UDL accommodation types: leveled text, multi-level versions, glossary, sentence frames, visual organizer, quiz, interactive/adventure, image, audio. Coverage = % of types present. Heuristic — does not assess accommodation quality.',
  };
}

// ─── Plan R+ dim: Cognitive load / pacing ────────────────────────────────
// Compares the lesson-plan's claimed segment durations against an estimate of
// actual time required (reading + activity + quiz). When there's no lesson
// plan, marks the dimension as Not applicable rather than emitting a misleading
// score.
function _parseMinutes(s) {
  if (!s) return null;
  var m = String(s).match(/(\d+)\s*(?:min|minute|mins)/i);
  return m ? parseInt(m[1], 10) : null;
}
function computeCognitiveLoad(artifacts, sourceWordCount, gradeLevel) {
  const lessonPlan = artifacts.slice().reverse().find(function (a) { return a && a.type === 'lesson-plan'; });
  if (!lessonPlan || !lessonPlan.data) {
    return {
      status: 'Not applicable',
      notApplicable: true,
      reason: 'No lesson plan in this curriculum. Generate a Lesson Plan to evaluate pacing realism.',
    };
  }
  const d = lessonPlan.data;
  // Sum claimed time across known segments. Each may live as { duration } or as ' (10 min)' text inside the body.
  const segments = [
    { key: 'directInstruction', label: 'Direct instruction' },
    { key: 'guidedPractice',    label: 'Guided practice' },
    { key: 'independentPractice', label: 'Independent practice' },
    { key: 'closure',           label: 'Closure' },
  ];
  var claimedTotal = 0;
  var perSegment = [];
  segments.forEach(function (s) {
    var seg = d[s.key];
    if (!seg) return;
    var mins = null;
    if (typeof seg === 'object' && seg.duration) mins = _parseMinutes(seg.duration);
    if (mins === null && typeof seg === 'string') mins = _parseMinutes(seg);
    if (mins === null && typeof seg === 'object' && seg.description) mins = _parseMinutes(seg.description);
    if (mins) {
      claimedTotal += mins;
      perSegment.push({ label: s.label, claimedMinutes: mins });
    } else {
      perSegment.push({ label: s.label, claimedMinutes: null });
    }
  });
  // Also check activities array
  if (Array.isArray(d.activities)) {
    d.activities.forEach(function (act) {
      var mins = _parseMinutes(act.duration) || _parseMinutes(act.description);
      if (mins) { claimedTotal += mins; perSegment.push({ label: act.title || act.name || 'Activity', claimedMinutes: mins }); }
    });
  }
  // Estimate actual time required:
  // - Source reading: words / wpm (grade-band adjusted: 100 wpm K-2, 150 wpm 3-5, 200 wpm 6-8, 250 wpm 9-12)
  const gradeNum = parseGradeLevelToNum(gradeLevel);
  let wpm = 200;
  if (gradeNum <= 2) wpm = 100;
  else if (gradeNum <= 5) wpm = 150;
  else if (gradeNum <= 8) wpm = 200;
  else wpm = 250;
  const readingMinutes = sourceWordCount > 0 ? Math.round(sourceWordCount / wpm) : 0;
  // - Quiz: ~1 min per question
  const quizItem = artifacts.find(function (a) { return a && a.type === 'quiz' && a.data && Array.isArray(a.data.questions); });
  const quizMinutes = quizItem ? quizItem.data.questions.length * 1 : 0;
  // - Activities: count distinct artifact types other than reading-only as ~5 min each (rough lower bound)
  const activityTypes = new Set(artifacts
    .filter(function (a) { return a && a.type && !['analysis', 'simplified', 'glossary', 'lesson-plan', 'alignment-report', 'udl-advice'].includes(a.type); })
    .map(function (a) { return a.type; }));
  const activityMinutes = activityTypes.size * 5;
  const estimatedTotal = readingMinutes + quizMinutes + activityMinutes;
  // Score
  let status, ratio;
  if (claimedTotal <= 0) {
    status = 'Partially Aligned'; ratio = null;
  } else {
    ratio = estimatedTotal / claimedTotal;
    if (ratio >= 0.7 && ratio <= 1.4) status = 'Aligned';
    else if (ratio >= 0.4 && ratio <= 2.0) status = 'Partially Aligned';
    else status = 'Not Aligned';
  }
  const recommendations = [];
  if (claimedTotal > 0 && ratio !== null) {
    if (ratio > 1.4) recommendations.push('Lesson plan claims ' + claimedTotal + ' min but content estimates ~' + estimatedTotal + ' min — likely under-scheduled. Consider trimming source text, removing one activity, or adding a second day.');
    if (ratio < 0.7) recommendations.push('Lesson plan claims ' + claimedTotal + ' min but content estimates ~' + estimatedTotal + ' min — likely over-scheduled (lesson may run short). Consider adding a discussion segment or follow-up activity.');
  } else if (claimedTotal === 0) {
    recommendations.push('Lesson plan does not specify segment durations. Add explicit time estimates ("10 min", "15 min") to each segment for realistic pacing.');
  }
  return {
    status,
    claimedTotalMinutes: claimedTotal,
    estimatedTotalMinutes: estimatedTotal,
    ratio: ratio !== null ? Number(ratio.toFixed(2)) : null,
    perSegment,
    breakdown: {
      reading: readingMinutes,
      quiz: quizMinutes,
      activities: activityMinutes,
      wpmAssumption: wpm,
    },
    recommendations,
    notes: 'Estimated time = ' + sourceWordCount + ' source words / ' + wpm + ' wpm + ' + (quizItem ? quizItem.data.questions.length : 0) + ' quiz items × 1 min + ' + activityTypes.size + ' distinct activities × 5 min. Compares against lesson-plan claimed durations. Heuristic — actual classroom pacing varies.',
  };
}

// ─── Plan O Step 6: Combined Pass/Revise + Curriculum Readiness Score ──
// Rolls all comprehensive-audit dimensions into a single 0-100 readiness
// score + overall status + blocking-issues list. Equal weighting across
// dimensions; N/A and computeFailed dimensions are excluded from the math
// but surface in the per-dimension list.
const STATUS_POINTS = { 'Aligned': 20, 'Partially Aligned': 12, 'Not Aligned': 0 };
const ALL_DIMENSIONS = ['standards', 'vocabulary', 'engagement', 'accessibility', 'udl', 'accuracy', 'differentiation', 'cognitiveLoad', 'culturalResponsiveness'];
const DIMENSION_LABELS = {
  standards: 'Standards alignment',
  vocabulary: 'Vocabulary fit',
  engagement: 'Engagement variety',
  accessibility: 'Content accessibility',
  udl: 'UDL principles',
  accuracy: 'Content accuracy',
  differentiation: 'Differentiation coverage',
  cognitiveLoad: 'Cognitive load / pacing',
  culturalResponsiveness: 'Cultural responsiveness',
};

function computeReadinessScore(comprehensive) {
  if (!comprehensive) return null;
  let totalScore = 0;
  let dimensionsEvaluated = 0;
  const dimensionScores = {};
  const blockingIssues = [];

  ALL_DIMENSIONS.forEach(dim => {
    const data = comprehensive[dim];
    if (!data) return;
    // Skip placeholder failures and N/A dimensions from the readiness math
    // but still surface them in the per-dimension list so the teacher can see them.
    if (data.computeFailed) {
      dimensionScores[dim] = { status: 'Compute failed', points: 0, computeFailed: true };
      return;
    }
    if (data.notApplicable) {
      dimensionScores[dim] = { status: 'Not applicable', points: 0, notApplicable: true };
      return;
    }
    dimensionsEvaluated++;
    const status = data.status || 'Partially Aligned';
    const points = (typeof STATUS_POINTS[status] === 'number') ? STATUS_POINTS[status] : 12;
    totalScore += points;
    dimensionScores[dim] = { status, points };
    if (status === 'Not Aligned') {
      // Pull a representative issue per blocked dimension
      let issue = '';
      if (dim === 'standards' && Array.isArray(data.perStandard) && data.perStandard[0]) {
        issue = data.perStandard[0].adminRecommendation || ('Standard ' + (data.perStandard[0].standard || 'unknown') + ' did not pass.');
      }
      else if (dim === 'vocabulary' && Array.isArray(data.recommendations) && data.recommendations[0]) issue = data.recommendations[0];
      else if (dim === 'engagement' && Array.isArray(data.recommendations) && data.recommendations[0]) issue = data.recommendations[0];
      else if (dim === 'accessibility' && Array.isArray(data.recommendations) && data.recommendations[0]) issue = data.recommendations[0];
      else if (dim === 'udl' && data.overallNarrative) issue = data.overallNarrative;
      else if (dim === 'accuracy' && Array.isArray(data.recommendations) && data.recommendations[0]) issue = data.recommendations[0];
      blockingIssues.push({ dimension: DIMENSION_LABELS[dim], issue });
    }
  });

  // Normalize to 0-100. If only some dimensions evaluated, scale by what's there.
  const maxPossible = dimensionsEvaluated * 20;
  const normalizedScore = maxPossible > 0 ? Math.round((totalScore / maxPossible) * 100) : 0;

  // Overall status thresholds
  let overallStatus, overallLabel;
  if (blockingIssues.length > 0) {
    overallStatus = 'Revise';
    overallLabel = 'Revise — critical issues';
  } else if (normalizedScore >= 90) {
    overallStatus = 'Pass';
    overallLabel = 'Pass — ready to deploy';
  } else if (normalizedScore >= 70) {
    overallStatus = 'Pass with notes';
    overallLabel = 'Pass with notes — minor improvements suggested';
  } else if (normalizedScore >= 50) {
    overallStatus = 'Revise';
    overallLabel = 'Revise — multiple dimensions need work';
  } else {
    overallStatus = 'Revise';
    overallLabel = 'Revise — significant gaps across dimensions';
  }

  return {
    score: normalizedScore,
    status: overallStatus,
    label: overallLabel,
    dimensionsEvaluated,
    dimensionScores,
    blockingIssues,
    perDimensionPercent: Object.keys(dimensionScores).reduce((acc, dim) => {
      acc[dim] = Math.round((dimensionScores[dim].points / 20) * 100);
      return acc;
    }, {}),
    notes: 'Equal weighting across 5 comprehensive dimensions. Score is a guide; review the per-dimension findings for context. Any "Not Aligned" dimension blocks an automatic Pass regardless of overall score.',
  };
}

function collectAuditText(artifacts) {
  // sourceText  = primary lesson text only (analysis.originalText, falls back to simplified).
  //               Used for the teacher-facing "word count" so it matches their intuition.
  // text        = bundle of EVERY artifact's content, used for tier classification across
  //               the whole curriculum (so we catch academic vocab in glossary defs, quiz, etc.).
  // glossaryTerms = explicit glossary entries (always Tier 3).
  const out = { text: '', sourceText: '', glossaryTerms: [] };
  let analysisText = '';
  let simplifiedText = '';
  artifacts.forEach(item => {
    const d = item.data;
    if (!d) return;
    if (item.type === 'analysis') {
      if (d.originalText) {
        analysisText = String(d.originalText);
        out.text += analysisText + ' ';
      }
      if (Array.isArray(d.concepts)) out.text += d.concepts.join(' ') + ' ';
    } else if (item.type === 'glossary' && Array.isArray(d)) {
      d.forEach(g => {
        if (g.term)       out.glossaryTerms.push(String(g.term).toLowerCase());
        if (g.def)        out.text += String(g.def) + ' ';
        if (g.definition) out.text += String(g.definition) + ' ';
      });
    } else if (item.type === 'lesson-plan') {
      ['directInstruction','guidedPractice','independentPractice','closure','essentialQuestion'].forEach(k => {
        if (d[k]) out.text += String(d[k]) + ' ';
      });
      if (Array.isArray(d.objectives)) out.text += d.objectives.join(' ') + ' ';
    } else if (item.type === 'quiz' && d.questions) {
      d.questions.forEach(q => {
        if (q.question) out.text += String(q.question) + ' ';
        if (q.text)     out.text += String(q.text) + ' ';
        if (Array.isArray(q.options)) out.text += q.options.join(' ') + ' ';
      });
    } else if (item.type === 'sentence-frames') {
      if (Array.isArray(d.items)) d.items.forEach(i => i && i.text && (out.text += i.text + ' '));
      if (typeof d === 'string') out.text += d + ' ';
      if (d.text) out.text += String(d.text) + ' ';
    } else if (item.type === 'outline') {
      if (d.main) out.text += String(d.main) + ' ';
      if (Array.isArray(d.branches)) d.branches.forEach(b => {
        if (b && b.title) out.text += String(b.title) + ' ';
        if (b && Array.isArray(b.items)) out.text += b.items.join(' ') + ' ';
      });
    } else if (item.type === 'simplified' && typeof d === 'string') {
      simplifiedText = d;
      out.text += d + ' ';
    } else if (item.type === 'simplified' && d && d.text) {
      simplifiedText = String(d.text);
      out.text += simplifiedText + ' ';
    }
  });
  // Resolve sourceText: prefer the analysis.originalText (true source), else simplified.
  out.sourceText = analysisText || simplifiedText || '';
  return out;
}

function computeVocabularyFit(artifacts, gradeLevel) {
  const { text, sourceText, glossaryTerms } = collectAuditText(artifacts);
  // sourceWords: count of words in the primary source text only (matches teacher intuition).
  // auditedTextWords: count across the full bundle (every artifact's content).
  const sourceWordList = (sourceText.toLowerCase().match(/[a-z]{3,}/g)) || [];
  const sourceWords = sourceWordList.length;
  const words = (text.toLowerCase().match(/[a-z]{3,}/g)) || [];
  const auditedTextWords = words.length;
  const uniqueSet = new Set(words);
  const tier3Set = new Set(glossaryTerms);

  let tier1 = 0, tier2 = 0, tier3 = 0;
  const tier2Examples = [];
  const tier3Examples = [];

  uniqueSet.forEach(word => {
    if (tier3Set.has(word) || (word.length >= 9 && TIER3_SUFFIX_RE.test(word))) {
      tier3++;
      if (tier3Examples.length < 8) tier3Examples.push(word);
    } else if (word.length >= 7 && !COMMON_LONGER_WORDS.has(word)) {
      tier2++;
      if (tier2Examples.length < 8) tier2Examples.push(word);
    } else {
      tier1++;
    }
  });

  const gradeNum = parseGradeLevelToNum(gradeLevel);
  const baseExpected = gradeBandExpectations(gradeNum);
  // Beck/McKeown norms are calibrated to a single ~1500-word text. The audited bundle
  // can be 3-5x larger when it includes simplified text + lesson plan + quiz + glossary.
  // Rescale tier expectations proportionally so 5th-grade Solar System bundle (~4400 words)
  // doesn't compare against single-text norms.
  const TYPICAL_SINGLE_TEXT_WORDS = 1500;
  const scale = auditedTextWords > 0 ? Math.max(1, auditedTextWords / TYPICAL_SINGLE_TEXT_WORDS) : 1;
  const expected = {
    tier2: Math.round(baseExpected.tier2 * scale),
    tier3: Math.round(baseExpected.tier3 * scale),
    band: baseExpected.band,
    gradeBand: baseExpected.band,
    scale: Number(scale.toFixed(2)),
    perTextTier2: baseExpected.tier2,
    perTextTier3: baseExpected.tier3,
  };
  const recommendations = [];
  let status = 'Aligned';

  if (tier2 < expected.tier2 * 0.5) {
    status = 'Partially Aligned';
    recommendations.push(`Tier 2 academic vocabulary is light for grade band ${expected.band} (~${tier2} unique vs ~${expected.tier2} expected). Consider adding cross-curricular academic words such as "examine", "evidence", "consequence", "framework", "interpret".`);
  } else if (tier2 > expected.tier2 * 2.5) {
    status = 'Partially Aligned';
    recommendations.push(`Tier 2 vocabulary load is heavy for grade band ${expected.band} (~${tier2} unique vs ~${expected.tier2} expected). May overwhelm; consider simpler synonyms or adding sentence-frame scaffolds.`);
  }
  if (tier3 < expected.tier3 * 0.5) {
    if (status === 'Aligned') status = 'Partially Aligned';
    recommendations.push(`Tier 3 domain vocabulary is light (~${tier3} unique vs ~${expected.tier3} expected). Add ${Math.max(2, expected.tier3 - tier3)} more glossary terms specific to the topic.`);
  }
  if (sourceWords < 200 && artifacts.length > 0) {
    recommendations.push('Source text is short (<200 words). Vocabulary signal may be unreliable; consider expanding the source material before relying on this audit.');
  }

  return {
    status,
    sourceWords,
    auditedTextWords,
    totalWords: auditedTextWords, // legacy alias for backward compat with old saved audits
    uniqueWords: uniqueSet.size,
    tier1Count: tier1,
    tier2Count: tier2,
    tier3Count: tier3,
    glossaryTermsCount: glossaryTerms.length,
    expected,
    tier2Examples,
    tier3Examples,
    recommendations,
    notes: 'sourceWords = primary source text only (matches teacher intuition); auditedTextWords = across the full curriculum bundle (used for tier classification). Tier expectations scaled to bundle size (×' + Number(scale.toFixed(2)) + ').',
  };
}

const handleGenerate = async (type, langOverride = null, keepLoading = false, textOverride = null, configOverride = {}, switchView = true, deps) => {
  const { gradeLevel, outlineType, visualStyle, visualLayoutMode, quizMcqCount, persistedLessonDNA, leveledTextCustomInstructions, quizCustomInstructions, glossaryCustomInstructions, frameCustomInstructions, adventureCustomInstructions, brainstormCustomInstructions, faqCustomInstructions, outlineCustomInstructions, visualCustomInstructions, lessonCustomAdditions, timelineTopic, sourceTopic, history, inputText, differentiationRange, leveledTextLanguage, selectedLanguages, studentInterests, guidedMode, guidedStep, standardsInput, targetStandards, dokLevel, sourceLength, sourceTone, textFormat, useEmojis, fullPackTargetGroup, rosterKey, imageGenerationStyle, imageAspectRatio, enableEmojiInline, cellGameDifficulty, includeSourceCitations, includeBibliography, currentUiLanguage, sourceCustomInstructions, sourceVocabulary, sourceLevel, generatedContent, mathSubject, mathMode, mathInput, mathQuantity, isAutoConfigEnabled, resourceCount, isParentMode, isIndependentMode, isTeacherMode, frameType, fillInTheBlank, vocabularyType, enableFactionResources, factionResourceMode, isAdventureStoryMode, isSocialStoryMode, isImmersiveMode, adventureChanceMode, adventureConsistentCharacters, adventureFreeResponseEnabled, adventureLanguageMode, adventureInputMode, apiKey, setIsMapLocked, setIsProcessing, setGenerationStep, setInteractionMode, setDefinitionData, setSelectionMenu, setRevisionData, setIsReviewGame, setReviewGameState, setGuidedStep, setGeneratedContent, setActiveView, setHistory, setError, setShowKokoroOfferModal, alloBotRef, pdfFixResult, addToast, t, warnLog, debugLog, callGemini, cleanJson, safeJsonParse, callImagen, extractSourceTextForProcessing, formatLessonDNA, getDifferentiationGrades, getGroupDifferentiationContext, flyToElement, fisherYatesShuffle, sanitizeTruncatedCitations, normalizeCitationPlacement, fixCitationPlacement, generateBibliographyString, processGrounding, parseFlowChartData, verifyMathProblems, normalizeResourceLinks, detectClimaxArchetype, handleGenerateLessonPlan, handleGenerateMath, handleGenerateSource, autoConfigureSettings, applyDetailedAutoConfig, getAssetManifest, getLessonContext, buildLessonPlanPrompt, buildStudyGuidePrompt, buildParentGuidePrompt, GUIDED_STEPS, LENGTH_THRESHOLDS, TIMELINE_MODE_DEFINITIONS, audioRef, autoRemoveWords, bridgeSimType, bridgeStepCount, conceptImageMode, conceptItemCount, conceptSortImageStyle, creativeMode, faqCount, glossaryDefinitionLevel, glossaryImageStyle, glossaryTier2Count, glossaryTier3Count, includeCharts, includeEtymology, includeTimelineVisuals, isBotVisible, isMathGraphEnabled, keepCitations, leveledTextLength, noText, passAnalysisToQuiz, quizReflectionCount, selectedConcepts, standardsPromptString, timelineImageStyle, timelineItemCount, timelineMode, useLowQualityVisuals, setGameMode, setGlossarySearchTerm, setIsConceptMapReady, setIsEditingAnalysis, setIsEditingBrainstorm, setIsEditingFaq, setIsEditingGlossary, setIsEditingLeveledText, setIsEditingOutline, setIsEditingQuiz, setIsEditingScaffolds, setIsGeneratingPersona, setIsInteractiveVenn, setIsMatchingGame, setIsMemoryGame, setIsPlaying, setIsPresentationMode, setIsSideBySide, setIsStudentBingoGame, setIsVennPlaying, setPersonaState, setPresentationState, setProcessingProgress, setShowQuizAnswers, setStickers, calculateReadability, callGeminiImageEdit, checkAccuracyWithSearch, chunkText, countWords, executeVisualPlan, filterEducationalSources, formatMathQuestion, generateHelpfulHint, generateVisualPlan, getDefaultTitle, performDeepVerification, repairGeneratedText, resetPersonaInterviewState, validateSequenceStructure } = deps;
  try { if (window._DEBUG_GEN_DISPATCHER) console.log("[GenDispatcher] handleGenerate fired:", type); } catch(_) {}
    setIsMapLocked(false);
    const effectiveGrade = configOverride.grade || gradeLevel;
    const effectiveOutlineType = configOverride.outlineType || outlineType;
    const effectiveVisualStyle = configOverride.visualStyle || visualStyle;
    const effectiveQuizCount = configOverride.quizCount || quizMcqCount;
    const lessonDNA = configOverride.lessonDNA || persistedLessonDNA || null;
    const dnaPromptBlock = formatLessonDNA(lessonDNA);
    const effCustomInstructions = (configOverride && configOverride.customInstructions)
        ? configOverride.customInstructions
        : (
            type === 'simplified' ? leveledTextCustomInstructions :
            type === 'quiz' ? quizCustomInstructions :
            type === 'glossary' ? glossaryCustomInstructions :
            type === 'sentence-frames' ? frameCustomInstructions :
            type === 'adventure' ? adventureCustomInstructions :
            type === 'brainstorm' ? brainstormCustomInstructions :
            type === 'faq' ? faqCustomInstructions :
            type === 'outline' ? outlineCustomInstructions :
            type === 'image' ? visualCustomInstructions :
            type === 'timeline' ? (timelineTopic || sourceTopic) :
            ''
        );
    let textToProcess = textOverride;
    if (textToProcess === null) {
        const latestAnalysis = history.slice().reverse().find(h => h && h.type === 'analysis');
        if (type !== 'analysis' && latestAnalysis?.data?.originalText) {
            const rawText = latestAnalysis.data.originalText;
            const citationSeparator = "### Accuracy Check References";
            if (rawText.includes(citationSeparator)) {
                textToProcess = rawText.split(citationSeparator)[0].trim();
            } else {
                textToProcess = rawText;
            }
        } else {
            textToProcess = inputText;
        }
    }
    if (!textToProcess || !textToProcess.trim()) return;
    if (textToProcess.includes('--- ENGLISH TRANSLATION ---')) {
        const extracted = extractSourceTextForProcessing(textToProcess, true); // prefer English
        if (extracted.isBilingual) {
            textToProcess = extracted.englishBlock || extracted.text;
            warnLog('[Generate] Bilingual source detected — using English block for ' + type + ' generation (' + textToProcess.length + ' chars)');
        }
    }
    if (type === 'simplified' && differentiationRange !== 'None' && Object.keys(configOverride).length === 0) {
        const gradesToGen = getDifferentiationGrades(gradeLevel, differentiationRange);
        if (gradesToGen.length > 1) {
            setIsProcessing(true);
            try {
                for (let i = 0; i < gradesToGen.length; i++) {
                    const grade = gradesToGen[i];
                    const isLast = i === gradesToGen.length - 1;
                    setGenerationStep(`Generating version for ${grade}...`);
                    await handleGenerate('simplified', null, !isLast, textToProcess, { grade: grade }, false, deps);
                    if (!isLast) await new Promise(r => setTimeout(r, 800));
                }
                addToast(`Generated ${gradesToGen.length} differentiated versions!`, "success");
                if (guidedMode) {
                  const currentIdx = GUIDED_STEPS.findIndex(s => s.id === 'simplified');
                  if (currentIdx >= 0) {
                    setTimeout(() => setGuidedStep(prev => prev === currentIdx && prev < GUIDED_STEPS.length - 1 ? prev + 1 : prev), 1200);
                    setTimeout(() => addToast(t('guided.history_hint'), 'info'), 2000);
                  }
                }
            } catch (e) {
                warnLog("Unhandled error:", e);
                addToast(t('toasts.batch_diff_failed'), "error");
            } finally {
                setIsProcessing(false);
            }
            return;
        }
    }
    if (type === 'simplified') {
        setInteractionMode('read');
        setDefinitionData(null);
        setSelectionMenu(null);
        setRevisionData(null);
    }
    setIsReviewGame(false);
    setReviewGameState({ claimed: new Set(), activeQuestion: null, showAnswer: false });
    const effectiveLanguage = langOverride || leveledTextLanguage;
    const differentiationContext = getGroupDifferentiationContext();
    const dialectInstruction = effectiveLanguage !== 'English' ? "STRICT DIALECT ADHERENCE: If a specific dialect is named (e.g. 'Brazilian Portuguese' vs 'European Portuguese'), explicitly use that region's vocabulary, spelling, and grammar conventions." : "";
    if (effectiveLanguage === 'All Selected Languages' && !langOverride) {
        if (type === 'glossary') {
            await handleGenerate(type, 'English', keepLoading, textToProcess, configOverride, switchView, deps);
            return;
        }
        if (['analysis', 'brainstorm', 'udl-advice', 'alignment-report'].includes(type)) {
             await handleGenerate(type, 'English', keepLoading, textToProcess, configOverride, switchView, deps);
             return;
        }
        setIsProcessing(true);
        try {
            const langsToGen = ['English', ...selectedLanguages];
            const uniqueLangs = [...new Set(langsToGen)];
            for (let i = 0; i < uniqueLangs.length; i++) {
                const lang = uniqueLangs[i];
                const isLastLang = i === uniqueLangs.length - 1;
                const batchKeepLoading = !isLastLang || keepLoading;
                setGenerationStep(`${t('status.generating')} ${type} (${lang})...`);
                await handleGenerate(type, lang, batchKeepLoading, textToProcess, configOverride, switchView, deps);
                await new Promise(r => setTimeout(r, 500));
            }
            addToast(`All ${type} resources generated!`, "success");
            if (type === 'simplified') flyToElement('ui-tool-simplified');
            if (type === 'glossary') flyToElement('ui-tool-glossary');
            if (type === 'outline') flyToElement('tour-tool-outline');
            if (type === 'image') flyToElement('tour-tool-visual');
            if (guidedMode) {
              const typeToGuidedId = { 'analysis': 'analysis', 'glossary': 'glossary', 'simplified': 'simplified', 'outline': 'outline', 'image': 'image', 'faq': 'faq', 'sentence-frames': 'sentence-frames', 'brainstorm': 'brainstorm', 'persona': 'persona', 'timeline': 'timeline', 'concept-sort': 'concept-sort', 'quiz': 'quiz', 'lesson-plan': 'lesson-plan', 'alignment-report': '_final' };
              const matchedId = typeToGuidedId[type];
              if (matchedId) {
                const currentIdx = GUIDED_STEPS.findIndex(s => s.id === matchedId);
                if (currentIdx >= 0 && currentIdx === guidedStep && guidedStep < GUIDED_STEPS.length - 1) {
                  setTimeout(() => setGuidedStep(prev => prev + 1), 1200);
                  setTimeout(() => addToast(t('guided.history_hint'), 'info'), 2000);
                }
              }
            }
        } catch (err) {
            console.error('[GenDispatcher] Batch generation error:', err);
            warnLog("Unhandled error:", err);
            setError(t('errors.batch_generation_failed'));
            if (alloBotRef.current) alloBotRef.current.speak(t('bot_events.feedback_error_apology'), 'confused');
        } finally {
            if (!keepLoading) setIsProcessing(false);
        }
        return;
    }
    setIsProcessing(true);
    setGenerationStep(t('status_steps.initializing'));
    setProcessingProgress({ current: 0, total: 0 });
    setError(null);
    setGlossarySearchTerm('');
    setGameMode(null);
    setIsMemoryGame(false);
    setIsMatchingGame(false);
    setIsStudentBingoGame(false);
    setShowQuizAnswers(false);
    setIsEditingLeveledText(false);
    setIsEditingFaq(false);
    setIsEditingQuiz(false);
    setIsEditingScaffolds(false);
    setIsEditingAnalysis(false);
    setIsEditingGlossary(false);
    setIsEditingBrainstorm(false);
    setIsEditingOutline(false);
    setIsSideBySide(false);
    setIsConceptMapReady(false);
    setIsInteractiveVenn(false);
    setIsVennPlaying(false);
    setIsPresentationMode(false);
    setPresentationState({});
    if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
    }
    generateHelpfulHint(type, textToProcess, false);
    if (switchView) {
        setGeneratedContent(null);
        setActiveView('input');
    }
    try {
      let content;
      let metaInfo = '';
      if (type === 'glossary') {
        const t2Count = glossaryTier2Count || 0;
        const t3Count = glossaryTier3Count || 0;
        const totalTerms = t2Count + t3Count;
        if (totalTerms === 0) {
             addToast(t('toasts.request_at_least_one'), "error");
             setIsProcessing(false);
             return;
        }
        let levelContext = "";
        if (glossaryDefinitionLevel === 'Same as Source Text') {
            levelContext = "Write definitions that match the reading level/complexity of the provided source text.";
        } else if (glossaryDefinitionLevel === 'Same as Global Level') {
            levelContext = `Write definitions simplified for a ${gradeLevel} student.`;
        } else {
             levelContext = `Write definitions simplified for a ${glossaryDefinitionLevel} student.`;
        }
        let prompt = '';
        const langsReq = [...selectedLanguages];
        if (effectiveLanguage !== 'English' && effectiveLanguage !== 'All Selected Languages' && !langsReq.includes(effectiveLanguage)) {
            langsReq.push(effectiveLanguage);
        }
        if (langsReq.length > 0) {
            prompt = `
              Analyze the following text and identify vocabulary.
              Find exactly:
              - ${t2Count} "Academic" (Tier 2) terms: General sophisticated words used across disciplines (e.g., "analyze", "verify").
              - ${t3Count} "Domain-Specific" (Tier 3) terms: Specific to this specific topic/field (e.g., "photosynthesis", "isotope").
              For each term, provide:
              1. An English definition. ${levelContext}
              2. The Tier category ("Academic" or "Domain-Specific").
              3. Translations into: ${langsReq.join(', ')}.
              ${includeEtymology ? `
              4. Etymology / Word Roots for EVERY term (Academic AND Domain-Specific):
                 Provide 2-4 plain sentences on the word's origin, appropriate for a ${gradeLevel} student.
                 MANDATORY requirements — do NOT skip any:
                 (a) The ACTUAL root morpheme(s) must appear verbatim as named strings in the "roots" array below — e.g., for "photosynthesis" the roots are "photo" and "synthesis". Do NOT write vague phrases like "comes from Greek" without naming the specific word/morpheme.
                 (b) Include brief word history when known: when/how the term entered English, meaning-shift over time, or who coined it. If unknown, skip this sentence — do not invent history.
                 (c) Name 1-3 related modern English words that share the same root, so students see the word family (e.g., for "photosynthesis": photograph, photon, photogenic).
                 Style by audience:
                 - K-5: simple sentences like "Comes from the Greek word photo meaning light — the same root appears in photograph and photon."
                 - 6-12: break into prefix/root/suffix, name source languages, and mention entry-into-English date if known.
                 - Skip terms with no meaningful etymology (proper nouns, brand names, very recent coinages). If so, OMIT the etymology, etymologyByLang, roots, AND any related fields together.
                 MULTI-LANGUAGE PROSE: Produce the etymology prose up front in ALL of these languages: ${['English', ...langsReq].join(', ')}. Put each translation into the "etymologyByLang" object keyed by the English language name. Keep root morphemes in their source-language script (e.g. Greek "photo" stays as "photo" in every language version). Each language's prose should be 2-4 idiomatic sentences at roughly the same reading level — not a word-for-word translation of the English.
                 Output structure — add to each qualifying term:
                   "etymology": "English prose version (legacy field, mirrors etymologyByLang.English)",
                   "etymologyByLang": { ${['English', ...langsReq].map(L => `"${L}": "prose in ${L}"`).join(', ')} },
                   "roots": [
                     { "root": "photo",     "lang": "Greek", "meaning": "light",              "related": ["photograph", "photon", "photogenic"] },
                     { "root": "synthesis", "lang": "Greek", "meaning": "putting together",   "related": ["synthetic", "synthesize"] }
                   ]
                 Each "root" = source-language morpheme (prefix / root / suffix). "lang" = origin language name. "meaning" = short English meaning (1-4 words). "related" = 1-3 modern English words sharing this root (optional per-root; include when they genuinely exist in common usage).
              ` : ''}
              ${effCustomInstructions ? `IMPORTANT: Prioritize these specific terms/concepts if they appear in the text: "${effCustomInstructions}".` : ''}
              ${useEmojis ? 'Include a relevant emoji for each term.' : 'Do not use emojis.'}
              ${langsReq.length > 0 ? "STRICT DIALECT ADHERENCE: For any requested language that specifies a region (e.g. 'Brazilian Portuguese'), use that specific dialect's conventions." : ""}
              CRITICAL FOR TRANSLATIONS: Provide both the translated TERM and the translated DEFINITION.
              Format: "Translated Term: Translated Definition",
              Return ONLY a JSON array: [{ "term": "Name", "def": "English Definition", "tier": "Academic" | "Domain-Specific", "translations": { "Lang": "TranslatedTerm: TranslatedDefinition" }${includeEtymology ? ', "etymology": "..." (optional), "etymologyByLang": { "English": "...", "Spanish": "..." } (optional, one key per requested language), "roots": [{ "root": "...", "lang": "...", "meaning": "..." }] (optional)' : ''} }]
              ${differentiationContext}
              Text: "${textToProcess}"
            `;
            metaInfo = `${t2Count} T2 / ${t3Count} T3 Terms - ${langsReq.join(', ')}`;
        } else {
            prompt = `
              Analyze the following text and identify vocabulary.
              Find exactly:
              - ${t2Count} "Academic" (Tier 2) terms: General sophisticated words used across disciplines.
              - ${t3Count} "Domain-Specific" (Tier 3) terms: Specific to this specific topic/field.
              For each term, provide:
              1. An English definition. ${levelContext}
              2. The Tier category ("Academic" or "Domain-Specific").
              ${includeEtymology ? `
              3. Etymology / Word Roots for EVERY term (Academic AND Domain-Specific):
                 Provide 2-4 plain sentences on the word's origin, appropriate for a ${gradeLevel} student.
                 MANDATORY requirements — do NOT skip any:
                 (a) The ACTUAL root morpheme(s) must appear verbatim as named strings in the "roots" array below — e.g., for "photosynthesis" the roots are "photo" and "synthesis". Do NOT write vague phrases like "comes from Greek" without naming the specific word/morpheme.
                 (b) Include brief word history when known: when/how the term entered English, meaning-shift over time, or who coined it. If unknown, skip this sentence — do not invent history.
                 (c) Name 1-3 related modern English words that share the same root, so students see the word family (e.g., for "photosynthesis": photograph, photon, photogenic).
                 Style by audience:
                 - K-5: simple sentences like "Comes from the Greek word photo meaning light — the same root appears in photograph and photon."
                 - 6-12: break into prefix/root/suffix, name source languages, and mention entry-into-English date if known.
                 - Skip terms with no meaningful etymology (proper nouns, brand names, very recent coinages). If so, OMIT the etymology, roots, AND related fields together.
                 Output structure — add to each qualifying term:
                   "etymology": "prose sentences described above",
                   "roots": [
                     { "root": "photo",     "lang": "Greek", "meaning": "light",              "related": ["photograph", "photon", "photogenic"] },
                     { "root": "synthesis", "lang": "Greek", "meaning": "putting together",   "related": ["synthetic", "synthesize"] }
                   ]
                 Each "root" = source-language morpheme. "lang" = origin language. "meaning" = short English meaning (1-4 words). "related" = 1-3 modern English words sharing this root (optional per-root; include when they genuinely exist).
              ` : ''}
              ${effCustomInstructions ? `IMPORTANT: Prioritize these specific terms/concepts if they appear in the text: "${effCustomInstructions}".` : ''}
              ${useEmojis ? 'Include a relevant emoji for each term.' : 'Do not use emojis.'}
              Return ONLY a JSON array: [{ "term": "Name", "def": "English Definition", "tier": "Academic" | "Domain-Specific"${includeEtymology ? ', "etymology": "..." (optional), "roots": [{ "root": "...", "lang": "...", "meaning": "..." }] (optional)' : ''} }]
              ${differentiationContext}
              Text: "${textToProcess}"
            `;
            metaInfo = `${t2Count} T2 / ${t3Count} T3 Terms - English Only`;
        }
        setGenerationStep(t('status_steps.extracting_vocab'));
        const result = await callGemini(prompt, true);
        try {
            let parsedContent = JSON.parse(cleanJson(result));
            if (!Array.isArray(parsedContent)) {
                if (parsedContent.terms) parsedContent = parsedContent.terms;
                else if (parsedContent.items) parsedContent = parsedContent.items;
                else if (parsedContent.glossary) parsedContent = parsedContent.glossary;
                else parsedContent = [];
            }
            addToast(autoRemoveWords ? t('status_steps.refining_icons') : t('status_steps.generating_icons'), "info");
            setGenerationStep(autoRemoveWords ? t('status_steps.refining_icons') : t('status_steps.generating_icons'));
            const BATCH_SIZE = 10;
            const BATCH_DELAY_MS = 500;
            const MAX_RETRIES = 3;
            const processedContent = [];
            const generateImageWithRetry = async (item, index, total) => {
                try {
                    const styleInstruction = glossaryImageStyle.trim() ? `Style: ${glossaryImageStyle}.` : 'Simple, clear, flat vector art style.';
                    const imgPrompt = `Icon style illustration of "${item.term}" (Context: ${item.def}). ${styleInstruction} White background. STRICTLY NO TEXT, NO LABELS, NO LETTERS. Visual only. Educational icon.`;
                    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
                        try {
                            if (attempt > 0) {
                                const backoffMs = 1000 * Math.pow(2, attempt);
                                debugLog(`⏳ Retry ${attempt + 1}/${MAX_RETRIES} for "${item.term}" after ${backoffMs}ms...`);
                                await new Promise(r => setTimeout(r, backoffMs));
                            }
                            let imageUrl = await callImagen(imgPrompt);
                            if (autoRemoveWords && imageUrl) {
                                try {
                                    const rawBase64 = imageUrl.split(',')[1];
                                    const editPrompt = "Remove all text, labels, letters, and words from the image. Keep the illustration clean.";
                                    imageUrl = await callGeminiImageEdit(editPrompt, rawBase64);
                                } catch (editErr) {
                                    warnLog("Auto-remove text failed for term:", item.term, editErr);
                                }
                            }
                            debugLog(`✅ Image ${index + 1}/${total} generated for: ${item.term}`);
                            return { ...item, image: imageUrl };
                        } catch (e) {
                            const is401 = e.message && e.message.includes('401');
                            if (is401 && attempt < MAX_RETRIES - 1) {
                                warnLog(`⚠️ Rate limited on "${item.term}", will retry...`);
                                continue;
                            }
                            console.error(`[Imagen] ❌ Image failed for "${item.term}" after ${attempt + 1} attempts:`, e.message);
                            return item;
                        }
                    }
                    return item;
                } catch (e) { warnLog("Unhandled error in generateImageWithRetry:", e); }
            };
            for (let i = 0; i < parsedContent.length; i += BATCH_SIZE) {
                const batch = parsedContent.slice(i, i + BATCH_SIZE);
                const batchNum = Math.floor(i / BATCH_SIZE) + 1;
                const totalBatches = Math.ceil(parsedContent.length / BATCH_SIZE);
                debugLog(`🔄 Processing batch ${batchNum}/${totalBatches} (${batch.length} items)...`);
                const batchResults = await Promise.all(
                    batch.map((item, idx) => generateImageWithRetry(item, i + idx, parsedContent.length))
                );
                processedContent.push(...batchResults);
                if (i + BATCH_SIZE < parsedContent.length) {
                    await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
                }
            }
            debugLog(`✅ All ${processedContent.length} glossary images processed!`);
            content = processedContent;
        } catch (parseErr) {
            warnLog("Glossary Parse Error:", parseErr);
            throw new Error("Failed to parse Glossary JSON. The AI response was not valid.");
        }
      } else if (type === 'simplified') {
        let complexityGuide = "";
        if (effectiveGrade === 'Kindergarten') {
            complexityGuide = `
            CRITICAL: WRITE FOR AN EMERGENT READER (Age 5-6).
            - Use extremely simple, repetitive sentence structures (e.g., "The sun is hot. The sun is big.").
            - Maximum 5-7 words per sentence.
            - Use ONLY basic high-frequency sight words (Dolch Pre-Primer/Primer list).
            - No abstract concepts. Concrete nouns and verbs only.
            - Avoid pronouns where possible; repeat the noun for clarity.
            - Break content into a list of simple statements.
            - COMPLEX TOPIC HANDLING: If the topic is complex, break it down into single-step, concrete actions. Use "Subject-Verb" patterns only.
            `;
        } else if (effectiveGrade === '1st Grade') {
             complexityGuide = `
            CRITICAL: WRITE FOR AN EARLY READER (Age 6-7).
            - Short, simple sentences. Strictly avoid compound sentences (avoid connecting clauses with "and", "but", "because").
            - Maximum 8-10 words per sentence.
            - Focus on decoding simple words.
            - One single idea per sentence.
            - COMPLEX TOPIC HANDLING: Reduce complex ideas to their most basic cause-and-effect relationship using simple words. Break long ideas into two sentences.
            `;
        } else if (['2nd Grade', '3rd Grade'].includes(effectiveGrade)) {
             complexityGuide = `
            SIMPLIFY FOR EARLY FLUENCY:
            - Use standard subject-verb-object sentence structure.
            - Avoid complex academic vocabulary unless defined immediately.
            - Keep paragraphs short (2-3 sentences).
            - Target a complexity slightly lower than standard ${effectiveGrade} to ensure accessibility.
            - COMPLEX TOPIC HANDLING: Use short sentences. Break compound sentences into two separate sentences. Use analogies for abstract ideas. Avoid passive voice completely.
            `;
        } else if (['4th Grade', '5th Grade'].includes(effectiveGrade)) {
             complexityGuide = `
            UPPER ELEMENTARY ADJUSTMENT:
            - Use clear, direct language.
            - Sentences can be slightly longer but avoid dense syntax.
            - Introduce academic vocabulary with context clues.
            - COMPLEX TOPIC HANDLING: Focus on clarity. Avoid passive voice. Break down multi-step processes into distinct sentences. Prioritize readability over stylistic flair.
            `;
        } else if (['6th Grade', '7th Grade', '8th Grade'].includes(effectiveGrade)) {
             complexityGuide = `
            MIDDLE SCHOOL ADAPTATION (TRANSITION TO ACADEMIC TEXT):
            - Bridge conversational and academic language.
            - Use a mix of simple, compound, and complex sentences, but favor clarity for complex topics.
            - Introduce domain-specific vocabulary with clear context clues.
            - Focus on explanatory depth while maintaining clarity.
            - COMPLEX TOPIC HANDLING: Ensure syntax remains straightforward even when discussing advanced concepts. Avoid convoluted sentence structures or nested clauses.
            `;
        } else if (['9th Grade', '10th Grade'].includes(effectiveGrade)) {
             complexityGuide = `
            HIGH SCHOOL FOUNDATION (STANDARD RIGOR):
            - Use standard high school sentence variety and paragraph structure.
            - Include abstract concepts and analytical language.
            - Vocabulary should be precise and grade-appropriate (Tier 2 and Tier 3 words).
            - Tone should be formal but accessible.
            `;
        } else if (['11th Grade', '12th Grade'].includes(effectiveGrade)) {
             complexityGuide = `
            COLLEGE PREP / ADVANCED HIGH SCHOOL:
            - Sophisticated syntax and nuanced argumentation.
            - Use rhetorical devices and high-level academic vocabulary without simplification.
            - Assume ability to handle dense text and abstract reasoning.
            - Focus on synthesis of ideas.
            `;
        } else if (['College', 'Graduate Level'].includes(effectiveGrade)) {
             complexityGuide = `
            PROFESSIONAL / ACADEMIC DISCOURSE:
            - Expert-level density and precision.
            - Use professional terminology freely.
            - Complex sentence structures including extensive subordination.
            - Target an educated, adult audience.
            `;
        }
        let targetWords = countWords(textToProcess);
        let lengthInstruction = "";
        const percentageMatch = leveledTextLength.match(/\((\d+)%\)/);
        if (leveledTextLength === 'Same as Source') {
            lengthInstruction = `TARGET LENGTH: Maintain approximately the same length as the source text (~${targetWords} words). Do not significantly shorten or expand unless necessary for the target grade level.`;
        } else if (percentageMatch) {
             const percentage = parseInt(percentageMatch[1], 10);
             const multiplier = percentage / 100;
             targetWords = Math.max(50, Math.round(targetWords * multiplier));
             let action = "Modify";
             if (percentage < 100) action = "Condense";
             else if (percentage > 100) action = "Expand";
             lengthInstruction = `TARGET LENGTH: ${action} the text to approximately ${targetWords} words (${percentage}% of original).`;
        } else if (leveledTextLength.includes('words')) {
             const match = leveledTextLength.match(/\d+/);
             if (match) {
                 targetWords = parseInt(match[0], 10);
                 lengthInstruction = `TARGET LENGTH: Write approximately ${targetWords} words.`;
             }
        }
        let formatInstruction = "";
        const outputLangInstruction = effectiveLanguage !== 'English' ? `Write the content primarily in ${effectiveLanguage}.` : "";
        if (textFormat === 'Dialogue Script') {
            formatInstruction = `
            FORMAT: DIALOGUE SCRIPT (Reader's Theater)
            - Create a cast of characters relevant to the topic (e.g., "Professor Proton", "Student A", or historical figures).
            - ${outputLangInstruction}
            - Use clear character labels (e.g. "**Character Name:** ...").
            - Include stage directions in italics or parentheses.
            - Ensure the educational content is explained through the natural conversation.
            - CRITICAL FOR TRANSLATION: In the English translation section, do NOT include the target language terms in parentheses. Keep the English text fully English.
            `;
        } else if (textFormat === 'Mock Advertisement') {
            formatInstruction = `
            FORMAT: MOCK ADVERTISEMENT / BROCHURE
            - Transform the educational content into a persuasive advertisement, brochure, or commercial script.
            - ${outputLangInstruction}
            - Use catchy headlines, slogans, and enthusiastic language.
            - Present key facts as "product features" or "benefits".
            - Include a "Call to Action" related to the topic.
            - Maintain accuracy while using a promotional tone.
            `;
        } else if (textFormat === 'News Report') {
            formatInstruction = `
            FORMAT: BREAKING NEWS REPORT
            - Write the content as a newspaper article or TV news transcript.
            - ${outputLangInstruction}
            - Use a journalistic tone (Who, What, Where, When, Why).
            - Include a catchy headline and a dateline.
            - Include "quotes" from relevant figures (experts, historical figures, or witnesses).
            - Structure with the most important facts first (inverted pyramid).
            `;
        } else if (textFormat === 'Podcast Script') {
            formatInstruction = `
            FORMAT: PODCAST SCRIPT
            - Write a script for two hosts: "Alex" (Male, enthusiastic) and "Sam" (Female, thoughtful/analytical).
            - ${outputLangInstruction}
            - Use a conversational, energetic, and engaging tone.
            - Include [Sound Effect] cues where appropriate (e.g., *[Upbeat intro music fades]*).
            - Have the hosts ask each other questions to break down complex ideas naturally.
            - Include an Intro (with a catchy podcast name) and an Outro.
            `;
        } else if (textFormat === 'Social Media Thread') {
            const slangInstruction = effectiveLanguage === 'English'
                ? '- TONE: Use contemporary English slang and lingo (e.g., "straight up fire", "no cap", "weak sauce", "GOAT", "lowkey") to make it relatable and engaging.'
                : `- TONE: Use contemporary slang and lingo appropriate for ${effectiveLanguage} speaking youth culture. Do NOT use English slang unless it is commonly used loan-words in that language.`;
            formatInstruction = `
            FORMAT: SOCIAL MEDIA THREAD
            - Break the content into a series of 6-10 short, punchy posts (like a Twitter/X thread).
            - ${outputLangInstruction}
            - Number each post (e.g., 1/8, 2/8).
            - Use emojis liberally to structure the visual flow.
            - Use hashtags relevant to the topic.
            - Focus on hooks ("Did you know?") and key takeaways.
            ${slangInstruction}
            - LANGUAGE CONSISTENCY: If you include parenthetical explanations for slang terms, ensure they match the language of the current section.
              - In the ${effectiveLanguage} section: Explanations must be in ${effectiveLanguage}.
              - In the English Translation section: Explanations must be in English.
              - Do NOT cross-contaminate languages in parenthetical glosses.
            `;
        } else if (textFormat === 'Poetry') {
            formatInstruction = `
            FORMAT: POETRY / VERSE
            - Rewrite the educational content as a poem (e.g., Rhyming Couplets, Free Verse, or Ballad).
            - ${outputLangInstruction}
            - Ensure the rhyme and rhythm help with memorization of key facts.
            - Use sensory details and imagery while maintaining factual accuracy.
            - Structure: Clear stanzas.
            `;
        } else if (textFormat === 'Narrative Story') {
            formatInstruction = `
            FORMAT: NARRATIVE STORY / FICTION
            - Transform the educational content into a short story.
            - ${outputLangInstruction}
            - Create characters and a setting relevant to the topic.
            - Weave the facts and concepts naturally into the plot and dialogue.
            - Ensure the story has a clear beginning, middle, and end.
            `;
        }
      let textWithoutRefs = textToProcess;
      let extractedReferences = "";
      const refHeaders = [
          "### Source Text References",
          "### Accuracy Check References",
          "### Verified Sources"
      ];
      for (const header of refHeaders) {
          if (textToProcess.includes(header)) {
              const parts = textToProcess.split(header);
              if (parts.length > 1) {
                  textWithoutRefs = parts[0].trim();
                  let rawRefs = parts.slice(1).join(header).trim();
                  rawRefs = rawRefs.replace(/\s+(?=\d+\.\s*\[)/g, '\n');
                  extractedReferences = header + '\n' + rawRefs;
              }
              break;
          }
      }
      const chunks = chunkText(textWithoutRefs, 9000);
      const isMultiChunk = chunks.length > 1;
      if (isMultiChunk) {
            addToast(t('meta.processing_sections', { count: chunks.length }) || `Text is long. Processing ${chunks.length} sections...`, "info");
            setProcessingProgress({ current: 0, total: chunks.length });
      }
      const newId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const _initialMeta = `${effectiveGrade} - ${effectiveLanguage} ${textFormat !== 'Standard Text' ? `(${textFormat})` : ''}${isMultiChunk ? ` (${t('meta.multi_part') || 'Multi-part'})` : ''}`;
      metaInfo = _initialMeta;
      const _itemConfig = {
          grade: effectiveGrade,
          language: effectiveLanguage,
          standards: standardsPromptString || "",
          interests: studentInterests,
          ...(configOverride.rosterGroupId ? {
              rosterGroupId: configOverride.rosterGroupId,
              rosterGroupName: configOverride.rosterGroupName,
              rosterGroupColor: configOverride.rosterGroupColor
          } : {})
      };
      const tempItem = {
          id: newId,
          type,
          data: "",
          meta: metaInfo,
          title: type === 'simplified' ? `Leveled Text (${effectiveGrade})` : getDefaultTitle(type),
          timestamp: new Date(),
          config: _itemConfig
      };
      setHistory(prev => [...prev, tempItem]);
      if (switchView || !generatedContent) {
          setGeneratedContent(tempItem);
          setActiveView('simplified');
      }
      let fullTargetText = "";
      let fullEnglishText = "";
      const delimiter = "--- ENGLISH TRANSLATION ---";
      for (let i = 0; i < chunks.length; i++) {
          const isLast = i === chunks.length - 1;
          if (isMultiChunk) {
              setGenerationStep(`Adapting section ${i + 1} of ${chunks.length}...`);
              setProcessingProgress({ current: i + 1, total: chunks.length });
          } else {
              setGenerationStep(t('status_steps.adapting_text'));
          }
          const chunkIntro = isMultiChunk
              ? `Rewrite the following PART ${i+1} of ${chunks.length} of a text for ${effectiveGrade} level in ${effectiveLanguage}.`
              : `Rewrite the following text for ${effectiveGrade} level in ${effectiveLanguage}.`;
          const chunkTargetPrompt = `
            ${chunkIntro}
            ${complexityGuide}
            ${lengthInstruction}
            ${formatInstruction}
            ${effCustomInstructions ? `Custom Instructions: ${effCustomInstructions}` : ''}
            ${useEmojis ? '- Use emojis liberally throughout the text to provide visual cues and engagement (e.g., "The sun ☀️ is a star ⭐").' : '- Do not use emojis.'}
            ${keepCitations ? '- CITATION PRESERVATION (CRITICAL): The source text uses specific markdown citations like [⁽¹⁾](url). You MUST retain this exact format (Superscript in brackets + Link). Do NOT convert to [1], (1), or loose text. Ensure links remain clickable.' : '- Remove all hyperlinks and citations.'}
            - DO NOT emit any "Sources", "References", "Bibliography", "Verified Sources", "Références", "Sources du texte", "Referencias", "Quellen", or equivalent section. The references list is appended automatically by the app — any references section you produce will be discarded and may cause duplicates.
            ${includeCharts ? `- DATA VISUALIZATION: Analyze the text for structured data.
            1. If quantitative comparisons exist, insert a Chart on its own line (NO line breaks inside brackets):
               [[CHART: { "type": "bar", "title": "Title", "data": [{"label": "A", "value": 10}, {"label": "B", "value": 20}] }]]
            2. If a single percentage is highlighted, use a Donut Chart:
               [[CHART: { "type": "donut", "title": "Title", "percentage": 75, "label": "75%" }]]
            3. If qualitative data exists, use a Markdown Table.
            4. You may include both if appropriate.` : ''}
            ${studentInterests.length > 0 ? `- CRITICAL: Explain key concepts using analogies and examples related to: "${studentInterests.join(', ')}" to increase engagement and relevance.` : ''}
            ${standardsPromptString ? `- CRITICAL: Align the text complexity and skill focus to meet Target Standards: "${standardsPromptString}".` : ''}
            ${dokLevel ? `- Target Webb's Depth of Knowledge (DOK): ${dokLevel}` : ''}
            ${dialectInstruction}
            ${differentiationContext}
            CRITICAL: Return ONLY the ${effectiveLanguage} text. Do NOT provide an English translation yet.
            Text Segment: "${chunks[i]}"
          `;
          let targetResult = await callGemini(chunkTargetPrompt);
          targetResult = String(targetResult || "").replace(/^```[a-zA-Z]*\n/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
          fullTargetText += targetResult + "\n\n";
          if (effectiveLanguage !== 'English') {
              if (isMultiChunk) setGenerationStep(`Translating section ${i + 1} of ${chunks.length}...`);
              else setGenerationStep(t('status_steps.translating') || 'Translating...');
              const chunkTransPrompt = `
                Translate the following ${effectiveLanguage} text into English.
                Maintain the formatting, tone, emojis, and citation markers exactly.
                Return ONLY the English translation.
                Text to Translate:
                "${targetResult}"
              `;
              let transResult = await callGemini(chunkTransPrompt);
              transResult = String(transResult || "").replace(/^```[a-zA-Z]*\n/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
              fullEnglishText += transResult + "\n\n";
          } else {
              fullEnglishText += targetResult + "\n\n";
          }
          let currentTargetDisplay = fullTargetText.trim();
          let currentEnglishDisplay = fullEnglishText.trim();
          if (isLast && extractedReferences && keepCitations) {
              currentTargetDisplay += `\n\n${extractedReferences}`;
          }
          let currentTotal = currentTargetDisplay;
          if (keepCitations) {
              currentTotal = sanitizeTruncatedCitations(currentTotal);
              currentTotal = normalizeCitationPlacement(currentTotal);
              if (effectiveLanguage !== 'English') {
                  currentEnglishDisplay = sanitizeTruncatedCitations(currentEnglishDisplay);
                  currentEnglishDisplay = normalizeCitationPlacement(currentEnglishDisplay);
              }
          }
          if (effectiveLanguage !== 'English') {
              currentTotal += `\n\n${delimiter}\n\n${currentEnglishDisplay}`;
          }
          const updatedItem = { ...tempItem, data: currentTotal };
          if (switchView || (generatedContent && generatedContent.id === newId)) {
              setGeneratedContent(updatedItem);
          }
          setHistory(prev => prev.map(item => item.id === newId ? updatedItem : item));
          if (!isLast) await new Promise(r => setTimeout(r, 800));
      }
      if (!isMultiChunk) {
          const trimmedTarget = fullTargetText.trim();
          const wc = countWords(trimmedTarget);
          const minWords = targetWords * LENGTH_THRESHOLDS.MIN_VARIANCE;
          const maxWords = targetWords * LENGTH_THRESHOLDS.MAX_VARIANCE;
          let repaired = null;
          const repairCtx = `Grade: ${effectiveGrade}, Topic: ${sourceTopic || "General"}, Format: ${textFormat}`;
          if (wc < minWords) {
              setGenerationStep(t('status.text_expanding'));
              repaired = await repairGeneratedText(trimmedTarget, 'too_short', targetWords, repairCtx, keepCitations);
          } else if (wc > maxWords) {
              setGenerationStep(t('status.text_condensing') || 'Condensing text...');
              repaired = await repairGeneratedText(trimmedTarget, 'too_long', targetWords, repairCtx, keepCitations);
          }
          if (repaired) {
              fullTargetText = repaired;
              let repairedTarget = fullTargetText.trim();
              let repairedEnglish = fullEnglishText.trim();
              if (extractedReferences && keepCitations) {
                  repairedTarget += `\n\n${extractedReferences}`;
              }
              let repairedTotal = repairedTarget;
              if (keepCitations) {
                  repairedTotal = sanitizeTruncatedCitations(repairedTotal);
                  repairedTotal = normalizeCitationPlacement(repairedTotal);
                  if (effectiveLanguage !== 'English') {
                      repairedEnglish = sanitizeTruncatedCitations(repairedEnglish);
                      repairedEnglish = normalizeCitationPlacement(repairedEnglish);
                  }
              }
              if (effectiveLanguage !== 'English') {
                  repairedTotal += `\n\n${delimiter}\n\n${repairedEnglish}`;
              }
              metaInfo = `${effectiveGrade} - ${effectiveLanguage} ${textFormat !== 'Standard Text' ? `(${textFormat})` : ''} (Refined)`;
              const refinedItem = { ...tempItem, data: repairedTotal, meta: metaInfo };
              if (switchView || (generatedContent && generatedContent.id === newId)) {
                  setGeneratedContent(refinedItem);
              }
              setHistory(prev => prev.map(item => item.id === newId ? refinedItem : item));
          }
      }
      addToast(`${getDefaultTitle(type)} generated!`, "success");
      if (switchView) flyToElement('ui-tool-simplified');
      if (guidedMode) {
          const currentIdx = GUIDED_STEPS.findIndex(s => s.id === 'simplified');
          if (currentIdx >= 0 && currentIdx === guidedStep && guidedStep < GUIDED_STEPS.length - 1) {
              setTimeout(() => setGuidedStep(prev => prev + 1), 1200);
              setTimeout(() => addToast(t('guided.history_hint'), 'info'), 2000);
          }
      }
      return;
      } else if (type === 'outline') {
        let promptInstructions = "";
        let structureHint = "";
        switch(effectiveOutlineType) {
            case 'Structured Outline':
                promptInstructions = "Create a hierarchical outline with main topics and sub-points.";
                break;
            case 'Flow Chart':
                promptInstructions = "Create a step-by-step process flow. If the process naturally has decision points, conditional paths, or branching logic (e.g., 'If X happens, go to step A; otherwise, go to step B'), include a 'connectsTo' array on each branch containing the 0-based indices of the steps it connects to. For simple linear flows where each step leads to the next, you may omit connectsTo. Example with branching: [{'title':'Check condition','items':['Evaluate X'],'connectsTo':[2,3]}, {'title':'Path A','items':['Do A'],'connectsTo':[4]}, {'title':'Path B','items':['Do B'],'connectsTo':[4]}, {'title':'Final step','items':['Done']}]. Aim for 5-8 steps total.";
                break;
            case 'Key Concept Map':
                promptInstructions = "Identify the central concept and branch out into key related attributes or sub-concepts. CRITICAL: Keep all labels extremely concise (max 4-5 words) to fit inside visual nodes.";
                break;
            case 'Venn Diagram':
                promptInstructions = "Identify two distinct contrasting categories (Set A, Set B) from the text and their shared commonalities (Shared).";
                structureHint = "CRITICAL FOR VENN DIAGRAM: You MUST return exactly 3 branches in this order: 1. The first distinct category (Set A). 2. The second distinct category (Set B). 3. The shared/overlapping traits (Title: 'Shared').";
                break;
            case 'T-Chart':
                promptInstructions = "Identify two contrasting categories from the text that students must sort items into (e.g. Renewable vs Non-Renewable, Mammals vs Reptiles, Igneous vs Sedimentary, Prokaryotes vs Eukaryotes). Generate 6-12 canonical, unambiguous items balanced ~50/50 between the two columns. Items should be 1-3 words each.";
                structureHint = "CRITICAL FOR T-CHART: You MUST return exactly 2 branches. Branch 1 title = left column header (2-3 words). Branch 2 title = right column header (2-3 words). Each branch's 'items' array contains the entries that belong in that column. Avoid edge cases — every item should clearly belong to exactly one column.";
                break;
            case 'Fishbone':
                promptInstructions = "Identify a central problem or effect from the text, then organize its CAUSES into 4-6 named CATEGORIES (the 'bones' of the fishbone diagram). Use domain-appropriate categories: for engineering/quality use the classic '6Ms' (People, Methods, Machines, Materials, Measurements, Environment) or a subset; for biology/ecology use categories like Genetic, Environmental, Behavioral, Physiological; for history use Political, Economic, Social, Cultural; for science use Causes, Conditions, Reactions, Outcomes. Pick categories that fit the topic. Within each category, list 2-4 specific causes (1-4 words each). The 'main' field is the central effect/problem being analyzed.";
                structureHint = "CRITICAL FOR FISHBONE: Return 4-6 branches. Each branch represents one CATEGORY of causes (a 'bone'). Branch.title = category name (1-3 words, e.g. 'Equipment', 'Methods'). Branch.items = specific causes within that category (2-4 items per branch). The main field describes the overall effect/problem being analyzed. Avoid generic categories — pick ones that fit the specific topic.";
                break;
            case 'Cause and Effect':
                promptInstructions = "Identify the central event/phenomenon. List its antecedent 'Causes' (factors leading to it) and subsequent 'Effects' (consequences resulting from it). If a sequential chain reaction exists, list it.";
                structureHint = "CRITICAL: Return branches with specific titles: 'Causes', 'Effects', or 'Chain'. Example: [{ 'title': 'Causes', 'items': ['Cause 1', 'Cause 2'] }, { 'title': 'Effects', 'items': ['Effect 1'] }]";
                break;
            case 'Problem Solution':
                promptInstructions = "Identify the core problem discussed and list the solutions or steps taken to resolve it.";
                break;
            default:
                promptInstructions = "Create a structured summary.";
        }
        const prompt = `
          Analyze the provided text and create a structured visual representation.
          Type: ${effectiveOutlineType}
          ${promptInstructions}
          ${structureHint}
          ${effCustomInstructions ? `Custom Instructions: ${effCustomInstructions}` : ''}
          Adapt the language to ${effectiveLanguage} and the complexity to ${gradeLevel}.
          ${standardsPromptString ? `Ensure the structure supports the cognitive requirements of Standards: "${standardsPromptString}".` : ''}
          ${useEmojis ? 'Include a relevant emoji at the start of every "main", "title", and "item" field to serve as a visual anchor.' : 'Do not use emojis.'}
          ${dialectInstruction}
          Return ONLY JSON matching this structure exactly (conceptually map the requested type to this hierarchy):
          { "main": "Central Topic/Goal/Problem", ${effectiveLanguage !== 'English' ? '"main_en": "...", ' : ''}"branches": [{ "title": "Category/Step/Solution/Cause", ${effectiveLanguage !== 'English' ? '"title_en": "...", ' : ''}"items": ["Detail/Substep/Effect"], ${effectiveLanguage !== 'English' ? '"items_en": ["..."], ' : ''}"connectsTo": [1] }] }
          Note: "connectsTo" is an optional array of 0-based branch indices. Include it only for Flow Chart type when branching exists.
          ${differentiationContext}
          Text: "${textToProcess}"
        `;
        const result = await callGemini(prompt, true);
        try {
            content = JSON.parse(cleanJson(result));
            if (!content) content = {};
            if (!content.main) content.main = "Main Topic";
            if (!content.branches || !Array.isArray(content.branches)) {
                if (content.items && Array.isArray(content.items)) {
                    content.branches = [{ title: "Key Points", items: content.items }];
                } else {
                    content.branches = [];
                }
            }
            content.branches = content.branches.map(b => ({
                ...b,
                title: b.title || "Untitled Section",
                items: Array.isArray(b.items) ? b.items : []
            }));
            content.structureType = effectiveOutlineType;
        } catch (parseErr) {
            warnLog("Outline JSON parse failed. Attempting AI repair...", parseErr);
            const repairPrompt = `
              The following JSON is malformed. Please fix the syntax errors and return ONLY the valid JSON.
              Malformed JSON:
              ${result}
            `;
            try {
                const repairResult = await callGemini(repairPrompt, true);
                content = JSON.parse(cleanJson(repairResult));
                if (!content) content = {};
                if (!content.branches || !Array.isArray(content.branches)) content.branches = [];
                content.structureType = effectiveOutlineType;
            } catch (finalErr) {
                warnLog("Outline Repair Failed:", finalErr);
                throw new Error("Failed to parse Visual Organizer data. Please try regenerating.");
            }
        }
        metaInfo = `${gradeLevel} - ${effectiveLanguage} - ${effectiveOutlineType}`;
      } else if (type === 'image') {
        console.log('[VisualDebug] dispatcher routing to image branch; effectiveVisualStyle=', effectiveVisualStyle, 'visualLayoutMode=', typeof visualLayoutMode !== 'undefined' ? visualLayoutMode : '(undefined)');
        setGenerationStep(t('status_steps.analyzing_visuals'));
        const promptGenPrompt = `
            Analyze the following text to create a visual plan for an educational diagram: "${textToProcess}".
            ${effCustomInstructions ? `Specific instructions: "${effCustomInstructions}".` : ''}
            Task:
            1. List key visual elements (physical objects, icons, spatial relationships) for the image generator prompt.
            2. Write a concise (1-sentence) Alt Text description for screen readers describing what the final diagram will show (e.g. "A diagram showing the water cycle stages").
            Constraints: ${noText ? "NO TEXT LABELS." : fillInTheBlank ? "NO TEXT LABELS. Include empty white boxes for students to write in." : `Include essential labels only in ${effectiveLanguage}.`}
            ${useEmojis ? 'Emphasize simple, emoji-like iconography.' : ''}
            Return ONLY JSON:
            {
                "visualElements": "comma-separated list of elements...",
                "altText": "Concise description..."
            }
        `;
        const result = await callGemini(promptGenPrompt, true);
        let imagePrompt = "";
        let altText = "Educational diagram.";
        try {
            const parsed = JSON.parse(cleanJson(result));
            imagePrompt = parsed.visualElements;
            altText = parsed.altText || "Educational diagram.";
        } catch (e) {
            warnLog("Image prompt JSON parse failed, falling back to raw text", e);
            imagePrompt = result;
        }
        let styleDescription = "";
        if (effectiveVisualStyle === 'Default') {
             styleDescription = noText ? "Clean, text-free vector art." : fillInTheBlank ? "Black and white worksheet line art, empty boxes." : "Clean educational vector art, minimal text.";
             if (creativeMode) styleDescription += " Detailed, artistic.";
        } else {
             styleDescription = `${effectiveVisualStyle} style.`;
             if (fillInTheBlank) styleDescription += " Black and white, empty boxes for writing.";
             if (noText) styleDescription += " No text labels, visual only.";
        }
        if (useEmojis) styleDescription += " Style: Flat, colorful, emoji-like icons.";
        const finalPrompt = `Educational diagram: ${imagePrompt}. Style: ${styleDescription}. White background, high contrast, clear lines.`;
        const targetWidth = useLowQualityVisuals ? 300 : 800;
        const targetQual = useLowQualityVisuals ? 0.5 : 0.9;
        let visualPlan = null;
        if (visualLayoutMode !== 'single') {
            try {
                if (visualLayoutMode === 'auto') {
                    visualPlan = await generateVisualPlan(textToProcess.substring(0, 500), effectiveGrade, effectiveLanguage, effectiveVisualStyle, effCustomInstructions);
                } else {
                    const templateHint = `You MUST use layout: "${visualLayoutMode}".`;
                    const concept = textToProcess.substring(0, 500);
                    visualPlan = await generateVisualPlan(concept + '\n\n' + templateHint, effectiveGrade, effectiveLanguage, effectiveVisualStyle, effCustomInstructions);
                    if (visualPlan) visualPlan.layout = visualLayoutMode;
                }
            } catch (planErr) {
                console.error('[VisualDebug] generateVisualPlan threw:', planErr);
                warnLog('[ArtDirector] Plan generation failed, falling back to single image', planErr);
            }
        }
        if (visualPlan && visualPlan.layout !== 'single' && visualPlan.panels.length > 1) {
            setGenerationStep(t('visual_director.generating_panels') || 'Generating multi-panel illustration...');
            const executedPlan = await executeVisualPlan(visualPlan, targetWidth, targetQual, effectiveVisualStyle);
            if (!executedPlan?.panels?.some(p => p?.imageUrl)) {
                console.error('[VisualDebug] executeVisualPlan returned all-null panels:', executedPlan);
            }
            content = {
                prompt: finalPrompt,
                style: styleDescription,
                imageUrl: executedPlan.panels[0]?.imageUrl || null,
                altText: altText,
                visualPlan: executedPlan
            };
            metaInfo = t('visual_director.multi_panel', { count: executedPlan.panels.length }) || `Multi-Panel (${executedPlan.panels.length} panels)`;
        } else {
        setGenerationStep(t('status_steps.rendering_diagram'));
        let imageBase64;
        try {
            imageBase64 = await callImagen(finalPrompt, targetWidth, targetQual);
        } catch(e) {
            console.error('[VisualDebug] callImagen threw:', e);
            warnLog('Image generation failed:', e);
            if (typeof setError === 'function') setError(`Image generation failed: ${e?.message || e}`);
            return;
        }
        if (!imageBase64) {
            console.error('[VisualDebug] callImagen returned falsy imageBase64; bailing');
            if (typeof setError === 'function') setError('Image generation produced no output');
            return;
        }
        if (fillInTheBlank || noText || creativeMode) {
             try {
                 setGenerationStep(t('status.refining_image'));
                 const rawBase64 = imageBase64.split(',')[1];
                 let refinePrompt = "";
                 if (fillInTheBlank) {
                     refinePrompt = "Edit this educational diagram. Replace ALL text labels, numbers, and words with empty white rectangular boxes. Ensure the boxes are large enough for a student to write in. Keep the leader lines and arrows pointing to the boxes. Maintain the black and white line art style.";
                 } else if (noText) {
                     refinePrompt = "Remove all text, labels, letters, numbers, and words from this image. Keep the visual illustrations and diagram structure perfectly intact. The result should be a clean, text-free visual.";
                 } else if (creativeMode) {
                     refinePrompt = "Enhance this image to make it significantly more eye-catching and visually appealing. Increase contrast, vibrancy, and lighting effects while maintaining the educational clarity of the diagram. Make it look like a high-quality textbook illustration.";
                 }
                 if (refinePrompt) {
                     const refinedImage = await callGeminiImageEdit(refinePrompt, rawBase64, targetWidth, targetQual);
                     if (refinedImage) {
                         imageBase64 = refinedImage;
                         addToast(t('visuals.actions.enhanced_success'), "success");
                     }
                 }
             } catch (refineErr) {
                 warnLog("Auto-refinement failed:", refineErr);
                 addToast(t('visuals.actions.enhanced_skipped'), "warning");
             }
        }
        content = { prompt: finalPrompt, style: styleDescription, imageUrl: imageBase64, altText: altText };
        if (fillInTheBlank) {
            metaInfo = t('meta.worksheet_mode');
        } else {
            metaInfo = effectiveVisualStyle !== 'Default' ? effectiveVisualStyle : t('meta.visual_diagram');
        }
        }
      } else if (type === 'quiz') {
        setShowQuizAnswers(false);
        // Plan S: Quiz is now mode-aware. Default 'exit-ticket' preserves the
        // existing behavior for any caller that doesn't pass a mode.
        const _quizMode = (configOverride && configOverride.quizMode) || 'exit-ticket';
        const _qmStrategies = (window.AlloModules && window.AlloModules.QuizModeStrategies) || null;
        const _modeStrategy = _qmStrategies ? _qmStrategies.getStrategy(_quizMode) : null;
        const _modeFraming = _modeStrategy ? _modeStrategy.generation.promptFrame : 'Create a short "Exit Ticket" quiz based on this text.';
        const _modeQuestionTargets = _modeStrategy ? _modeStrategy.generation.questionTargets : 'today\'s lesson content';
        // Pre-check + review modes draw on different context: pre-check needs
        // PREREQUISITE concepts (what the source assumes), review pulls from
        // earlier history items rather than today's source.
        let analysisContext = "";
        if (passAnalysisToQuiz || _quizMode === 'pre-check' || _quizMode === 'review') {
             const analysisItem = history.slice().reverse().find(h => h && h.type === 'analysis');
             if (analysisItem && analysisItem.data) {
                 const { concepts, readingLevel } = analysisItem.data;
                 const levelStr = typeof readingLevel === 'object' ? readingLevel.range : readingLevel;
                 if (_quizMode === 'pre-check') {
                     analysisContext = `\n                 SOURCE ANALYSIS (for prerequisite identification):\n                 - Key Concepts the Lesson Will Teach: ${concepts ? concepts.join(', ') : 'N/A'}\n                 - Lesson Reading Level: ${levelStr}\n                 INSTRUCTION: For EACH key concept above, identify ONE prerequisite the student should already know to access that concept, then write a probe testing that prerequisite. Probes should test PRIOR knowledge (e.g., for "photosynthesis" the prerequisite might be "what plants need to grow"). Do NOT test today's lesson content directly.\n                 `;
                 } else if (_quizMode === 'review') {
                     // Pull historical concepts from prior history items too (multiple analyses)
                     const allAnalyses = history.filter(h => h && h.type === 'analysis');
                     const allConcepts = allAnalyses.flatMap(h => (h.data && h.data.concepts) || []).filter(Boolean);
                     analysisContext = `\n                 PRIOR LESSON CONCEPTS FOR SPACED RETRIEVAL:\n                 - Earlier Concepts Across History: ${allConcepts.length > 0 ? allConcepts.join(', ') : 'N/A (use today\'s source as fallback)'}\n                 - Today's Concepts: ${concepts ? concepts.join(', ') : 'N/A'}\n                 INSTRUCTION: Probe retention of EARLIER concepts (not today's). If only today's concepts are available, probe deeper retention of today's content from a few angles.\n                 `;
                 } else {
                     analysisContext = `\n                 PRIORITY CONTEXT FROM SOURCE ANALYSIS:\n                 - Key Concepts Identified: ${concepts ? concepts.join(', ') : 'N/A'}\n                 - Detected Source Level: ${levelStr}\n                 INSTRUCTION: Ensure the quiz questions specifically target these identified concepts to check for understanding.\n                 `;
                 }
             }
        }
        let dokInstruction = "";
        if (dokLevel === "Mixed") {
            dokInstruction = "Structure the questions progressively: Start with simple DOK 1 (Recall) questions, then move to DOK 2 (Skill/Concept), and end with DOK 3 (Strategic Thinking).";
        } else if (dokLevel) {
            dokInstruction = `Target Webb's Depth of Knowledge (DOK): ${dokLevel}`;
        }
        const _modeItemCount = (_modeStrategy && _modeStrategy.generation.defaultItemCount) || effectiveQuizCount;
        // Use mode default ONLY when the caller didn't explicitly request a count
        const _resolvedItemCount = (configOverride && configOverride.quizMcqCount) ? configOverride.quizMcqCount : _modeItemCount;
        // Plan S Slice 2: per-mode item type mix. exit-ticket stays MCQ-only by default
        // for back-compat; pre-check + review get fill-blank + short-answer in the mix.
        const _modeItemMix = (_modeStrategy && _modeStrategy.generation.defaultItemTypeMix) || { mcq: _resolvedItemCount };
        const _mcqCount = _modeItemMix.mcq || 0;
        const _fillBlankCount = _modeItemMix['fill-blank'] || 0;
        const _shortAnswerCount = _modeItemMix['short-answer'] || 0;
        // Build item-type-specific instruction blocks dynamically
        const _itemTypeBlocks = [];
        if (_mcqCount > 0) _itemTypeBlocks.push(_mcqCount + ' Multiple Choice Question(s) with 4 options each');
        if (_fillBlankCount > 0) _itemTypeBlocks.push(_fillBlankCount + ' Fill-in-the-Blank Question(s)');
        if (_shortAnswerCount > 0) _itemTypeBlocks.push(_shortAnswerCount + ' Short-Answer Question(s) (1-2 sentence response)');
        const _includeReflections = (_quizMode === 'exit-ticket' && quizReflectionCount > 0);
        if (_includeReflections) _itemTypeBlocks.push(quizReflectionCount + ' Open-Ended Reflection Question(s)');
        const _itemTypeInstructions = _itemTypeBlocks.map(function (s, i) { return (i + 1) + '. ' + s + '.'; }).join('\n          ');
        // JSON shape varies by what's requested
        const _jsonShape = `{
            "questions": [
              { "type": "mcq", "question": "...", ${effectiveLanguage !== 'English' ? '"question_en": "...", ' : ''}"options": ["..."], ${effectiveLanguage !== 'English' ? '"options_en": ["..."], ' : ''}"correctAnswer": "..." }${_fillBlankCount > 0 ? `,
              { "type": "fill-blank", "question": "Sentence with ___ for the blank.", ${effectiveLanguage !== 'English' ? '"question_en": "...", ' : ''}"expectedFill": "...", "acceptableAlternatives": ["alt1", "alt2"] }` : ''}${_shortAnswerCount > 0 ? `,
              { "type": "short-answer", "question": "Open prompt requiring 1-2 sentence response.", ${effectiveLanguage !== 'English' ? '"question_en": "...", ' : ''}"expectedAnswer": "Concise reference answer (10-30 words) covering the key idea." }` : ''}
            ]${_includeReflections ? `,
            "reflections": [${effectiveLanguage !== 'English' ? '{ "text": "...", "text_en": "..." }' : '"Question..."'}]` : ''}
          }`;
        const prompt = `
          ${_modeFraming}
          Quiz target: ${_modeQuestionTargets}.
          Audience: ${gradeLevel} level students.
          ${dnaPromptBlock}
          Language: ${effectiveLanguage}.
          ${dokInstruction}
          ${standardsPromptString ? `Ensure questions align with Standards: "${standardsPromptString}".` : ''}
          ${analysisContext}
          Include the following item types:
          ${_itemTypeInstructions}
          ${_fillBlankCount > 0 ? 'For each Fill-in-the-Blank: write a complete sentence with the target term replaced by "___" (3 underscores). Provide expectedFill (the precise word/phrase) AND a short list of acceptableAlternatives (synonyms or common variants — typos NOT included; the grader handles those).' : ''}
          ${_shortAnswerCount > 0 ? 'For each Short-Answer: write a question that requires a 1-2 sentence response demonstrating understanding (not just recall). Provide expectedAnswer as a 10-30 word reference answer the AI grader can compare student responses against.' : ''}
          ${lessonDNA ? `Instruction: Ensure questions align with the "Core Concepts" and test the "Required Vocabulary" listed in the Lesson DNA above.` : ''}
          ${useEmojis ? 'Include relevant emojis in questions and options to support understanding.' : 'Do not use emojis.'}
          ${effCustomInstructions ? `Custom Instructions: ${effCustomInstructions}` : ''}
          ${effectiveLanguage !== 'English' ? 'For every question, option, and reflection, provide an English translation field (suffix _en).' : ''}
          ${dialectInstruction}
          Return ONLY valid JSON: ${_jsonShape}
          ${differentiationContext}
          ${_quizMode === 'exit-ticket' ? `Text: "${textToProcess}"` : `Source text (for context only — do not directly quiz on it for ${_quizMode} mode):\n"${textToProcess}"`}
        `;
        setGenerationStep(t('status_steps.drafting_quiz'));
        const result = await callGemini(prompt, true);
        try {
            content = JSON.parse(cleanJson(result));
            if (!content) content = {};
            if (Array.isArray(content)) {
                 content = { questions: content, reflections: [] };
            }
            if (!content.questions || !Array.isArray(content.questions)) content.questions = [];
            if (!content.reflections || !Array.isArray(content.reflections)) content.reflections = [];
            // Plan S Slice 2: type-aware normalization. MCQ keeps its options + correctAnswer
            // shape; fill-blank requires expectedFill; short-answer requires expectedAnswer.
            // Items missing a `type` field default to 'mcq' for back-compat.
            content.questions = content.questions.map(q => {
                const itemType = q.type || 'mcq';
                const base = {
                    ...q,
                    type: itemType,
                    question: q.question || "Question text missing",
                };
                if (itemType === 'mcq') {
                    base.options = Array.isArray(q.options) ? q.options : ["True", "False"];
                    base.correctAnswer = q.correctAnswer || "";
                } else if (itemType === 'fill-blank') {
                    base.expectedFill = q.expectedFill || "";
                    base.acceptableAlternatives = Array.isArray(q.acceptableAlternatives) ? q.acceptableAlternatives : [];
                } else if (itemType === 'short-answer') {
                    base.expectedAnswer = q.expectedAnswer || "";
                }
                return base;
            });
            try {
                const checkedQuestions = await Promise.all(content.questions.map(async (q, idx) => {
                    // Only fact-check MCQ items — fill-blank and short-answer have their
                    // own grader at student-response time, no pre-grading needed.
                    if (q.type && q.type !== 'mcq') return q;
                    setGenerationStep(`${t('status_steps.verifying_answers')} (${idx + 1}/${content.questions.length})...`);
                    await new Promise(resolve => setTimeout(resolve, idx * 200));
                    const checkPrompt = `
                        Verify the factual accuracy of this multiple choice question designed for a ${gradeLevel} student.
                        Question: "${q.question}"
                        Options: ${q.options.join(', ')}
                        Indicated Correct Answer: "${q.correctAnswer}",
                        Task:
                        Determine if the indicated correct answer is the single, factually correct option. Then explain the correct answer and debunk the distractors.
                        Output Requirements:
                        1. If the Indicated Answer is CORRECT and UNIQUE:
                           Start immediately with: "**Verified Correct Answer:** [Full text of the correct option]".
                           Then follow with a concise explanation of why it is correct.
                           Then add a section "**Why other options are incorrect:**" and provide a brief bulleted list explaining the error in each distractor.
                        2. If the Indicated Answer is INCORRECT, AMBIGUOUS, or NOT UNIQUE:
                           Start immediately with: "**CORRECTION / WARNING:** [State clearly if the answer is wrong or multiple are correct]".
                           Then state: "**Actual Correct Answer:** [Full text of the correct option(s)]".
                           Then explain the discrepancy or error.
                        Format Guidelines:
                        - Do NOT repeat the Question text.
                        - Use **bold** for the headers as specified.
                        - Keep the explanation concise.
                        - Write the explanation in ${effectiveLanguage}.
                        ${effectiveLanguage !== 'English' ? `- After the explanation, add a new line "--- English Translation ---" and provide the explanation in English.` : ''}
                        ${dialectInstruction}
                    `;
                    try {
                        const factCheckResult = await callGemini(checkPrompt);
                        return { ...q, factCheck: factCheckResult };
                    } catch (err) {
                        warnLog(`Auto fact check failed for question ${idx}`, err);
                        return q;
                    }
                }));
                content.questions = checkedQuestions;
            } catch (err) {
                warnLog("Fact checking process encountered an error", err);
            }
        } catch (parseErr) {
             warnLog("Quiz Parse Error:", parseErr);
             throw new Error("Failed to parse Quiz JSON. The AI response was not valid.");
        }
        // Plan S: stamp the mode onto the content so the view can render
        // mode-aware behavior (intro banner, AI explainer, confidence rating).
        if (content && typeof content === 'object') {
            content.mode = _quizMode;
            content.modeLabel = _modeStrategy ? _modeStrategy.label : 'Exit Ticket';
            content.modeIcon = _modeStrategy ? _modeStrategy.icon : '📝';
        }
        const _modeMetaPrefix = _modeStrategy && _quizMode !== 'exit-ticket' ? _modeStrategy.label + ' · ' : '';
        metaInfo = `${_modeMetaPrefix}${gradeLevel} - Quiz (${_resolvedItemCount}MC/${_quizMode === 'exit-ticket' ? quizReflectionCount : 0}Ref)${dokLevel ? ` - ${dokLevel.split(':')[0]}` : ''} - ${effectiveLanguage}`;
      } else if (type === 'analysis') {
        let verificationContext = "";
        let collectedSources = [];
        let isSearchActive = checkAccuracyWithSearch;
        if (checkAccuracyWithSearch) {
            try {
                const deepResult = await performDeepVerification(textToProcess);
                verificationContext = deepResult.text;
                collectedSources = (deepResult.sources || []).map(s => ({ uri: s.uri, title: s.title }));
                if (!verificationContext || verificationContext.length < 10) {
                    verificationContext = "Verification attempted but no specific data returned.";
                    isSearchActive = false;
                }
            } catch (verifyErr) {
                warnLog("Analysis Verification Step Failed", verifyErr);
                addToast(t('toasts.verification_failed_proceed'), "info");
                isSearchActive = false;
            }
        }
        setGenerationStep(checkAccuracyWithSearch ? t('status_steps.synthesizing_analysis') : t('status_steps.analyzing_structure'));
        const targetUiLang = currentUiLanguage || 'English';
        const isTranslatedAnalysis = targetUiLang !== 'English';
        const prompt = `
          Analyze the following text for an educator.
          ${verificationContext ? `
          --- VERIFICATION REPORT (FROM GOOGLE SEARCH) ---
          The text has already been fact-checked. Here are the findings (with citations):
          """
          ${verificationContext}
          """,
          INSTRUCTION:
          1. Use the "Verification Report" above to populate the "accuracy" section of the JSON.
          2. Specifically separate findings into "discrepancies" and "verifiedFacts".
          ------------------------------------------------
          ` : ''}
          Provide:
          1. Reading Level: Estimate a 3-grade range based on U.S. Grade Level standards (e.g. "3rd-5th Grade", "6th-8th Grade", "K-2nd Grade"). Provide a detailed pedagogical analysis of text complexity, citing specific examples of sentence structure and vocabulary load.
          2. Key Concepts (array of strings)
          3. Estimated Accuracy (e.g. "High", "Moderate", with a short explanation).
          4. Potential Grammar/Spelling Issues (list specific examples or say "None detected")
          ${isTranslatedAnalysis ? `5. Translated Text: A full, fluent translation of the source text into ${targetUiLang}.` : ''}
          CRITICAL OUTPUT INSTRUCTION:
          You MUST return VALID JSON. Do not wrap the JSON in markdown code blocks.
          *** CITATION RETENTION RULE ***:
          When populating the "discrepancies" and "verifiedFacts" arrays, you MUST include the bracketed citation numbers (e.g. [1], [2]) exactly as they appear in the Verification Report.
          - Correct: "The text claims X, but sources say Y [1]."
          - Incorrect: "The text claims X, but sources say Y.",
          ${isTranslatedAnalysis ? `
          LANGUAGE INSTRUCTIONS:
          - Translate all analysis fields (concepts, explanations, accuracy reasons, grammar notes) into ${targetUiLang}.
          - Include the "translatedText" field with the text translated into ${targetUiLang}.
          - CRITICAL: Calculate the "readingLevel" based on the complexity of the ORIGINAL English source text, NOT the translation.
          --- BILINGUAL ARRAYS REQUIREMENT ---
          For the "discrepancies" and "verifiedFacts" arrays specifically:
          You MUST provide both the ${targetUiLang} translation AND the original English text for every item.
          Format each string exactly like this:
          "${targetUiLang} Version... [1] --- ENGLISH TRANSLATION --- Original English Version... [1]"
          ` : ''}
          Required JSON Structure:
          {
            "readingLevel": { "range": "...", "explanation": "..." },
            "concepts": ["..."],
            "accuracy": {
                "rating": "...",
                "reason": "..."${checkAccuracyWithSearch ? ', \n"discrepancies": ["Error found... [1]", "Inaccuracy... [2]"], \n"verifiedFacts": ["Fact verified... [3]", "Date confirmed... [1]"]' : ''}
            },
            "grammar": ["..."]${isTranslatedAnalysis ? ', \n"translatedText": "..."' : ''}
          }
          ${differentiationContext}
          Text: "${textToProcess}"
        `;
        const result = await callGemini(prompt, true, false);
        let resultText = "";
        if (typeof result === 'object' && result !== null) {
            resultText = result.text || JSON.stringify(result);
        } else {
            resultText = String(result || "");
        }
        if (!resultText || resultText.trim().length < 5) {
             throw new Error("AI returned empty response. Please try again.");
        }
        let analysisData;
        try {
             const cleanedResult = cleanJson(resultText);
             if (!cleanedResult || (!cleanedResult.trim().startsWith('{') && !cleanedResult.trim().startsWith('['))) {
                 throw new Error("Response format is not JSON");
             }
             analysisData = JSON.parse(cleanedResult);
        } catch (parseError) {
             warnLog("Analysis JSON parse issue. Attempting AI Repair...", parseError);
             setGenerationStep('Formatting analysis results...');
             try {
                 const safeSnippet = String(resultText).substring(0, 20000);
                 const repairPrompt = `
                    The previous AI response was meant to be JSON but was returned as conversational text.
                    Please convert the text below into the required JSON structure.
                    Required Structure:
                    {
                        "readingLevel": { "range": "...", "explanation": "..." },
                        "concepts": ["..."],
                        "accuracy": {
                            "rating": "...",
                            "reason": "...",
                            "discrepancies": ["..."],
                            "verifiedFacts": ["..."]
                        },
                        "grammar": ["..."]${isTranslatedAnalysis ? ', "translatedText": "..."' : ''}
                    }
                    Input Text to Convert:
                    """
                    ${safeSnippet}
                    """,
                    Return ONLY valid JSON.
                 `;
                 const repairResult = await callGemini(repairPrompt, true);
                 analysisData = JSON.parse(cleanJson(repairResult));
             } catch (repairErr) {
                 warnLog("Analysis Repair Failed:", repairErr);
                 analysisData = {
                     readingLevel: { range: "N/A", explanation: "AI returned unstructured text or invalid JSON. See verification section." },
                     concepts: ["Analysis format issue"],
                     accuracy: { rating: "See Report", reason: resultText },
                     grammar: []
                 };
             }
        }
        analysisData = {
             readingLevel: analysisData.readingLevel || { range: "N/A", explanation: "Could not determine level." },
             concepts: Array.isArray(analysisData.concepts) ? analysisData.concepts : (analysisData.concepts ? [String(analysisData.concepts)] : []),
             accuracy: analysisData.accuracy || { rating: "Unknown", reason: "Could not verify accuracy." },
             grammar: Array.isArray(analysisData.grammar) ? analysisData.grammar : [],
             translatedText: analysisData.translatedText
        };
        if (typeof analysisData.readingLevel === 'string') {
            analysisData.readingLevel = { range: analysisData.readingLevel, explanation: "AI did not provide detailed explanation." };
        }
        let gatheredCitations = "";
        if (isSearchActive && collectedSources.length > 0) {
             const combinedFindings = [
                 ...(analysisData.accuracy.discrepancies || []),
                 ...(analysisData.accuracy.verifiedFacts || [])
             ].join(" ");
             const _normalizeCitationBrackets = (text) => text.replace(
                 /\[(?:Source\s+)?(\d+(?:\s*,\s*(?:Source\s+)?\d+)*)\]/gi,
                 (match, inner) => {
                     const nums = inner.match(/\d+/g) || [];
                     if (nums.length === 0) return match;
                     return nums.map(n => `[${n}]`).join(' ');
                 }
             );
             const expandedFindings = _normalizeCitationBrackets(combinedFindings);
             const _eduWrapped = filterEducationalSources(
                 collectedSources.map(s => ({ web: { uri: s.uri, title: s.title } }))
             );
             const _eduUriSet = new Set(_eduWrapped.map(c => c.web.uri));
             const usedIndices = new Set();
             const finalSources = [];
             const oldToNewIndexMap = new Map();
             const rejectedIndices = new Set(); // educationally-filtered indices (1-based)
             let newCounter = 1;
             collectedSources.forEach((source, idx) => {
                 const originalGlobalIndex = idx + 1;
                 const marker = `[${originalGlobalIndex}]`;
                 if (!expandedFindings.includes(marker)) return; // unreferenced — skip
                 if (!_eduUriSet.has(source.uri)) {
                     rejectedIndices.add(originalGlobalIndex);
                     return;
                 }
                 usedIndices.add(originalGlobalIndex);
                 finalSources.push({ ...source, newIndex: newCounter });
                 oldToNewIndexMap.set(originalGlobalIndex, newCounter);
                 newCounter++;
             });
             let citationText = "";
             if (finalSources.length > 0) {
                 finalSources.forEach((source) => {
                     const safeTitle = (source.title || "Web Source").replace(/[\[\]]/g, '');
                     citationText += `\n${source.newIndex}. [${safeTitle}](${source.uri})`;
                 });
             } else {
                 citationText += "\n(Sources consulted during verification)";
                 collectedSources.forEach((s, i) => {
                    const safeTitle = (s.title || "Web Source").replace(/[\[\]]/g, '');
                    citationText += `\n${i+1}. [${safeTitle}](${s.uri})`;
                 });
             }
             gatheredCitations = citationText;
             const rehydrateList = (list) => {
                 if (!Array.isArray(list)) return [];
                 return list.map(itemText => {
                     let processedText = _normalizeCitationBrackets(itemText);
                     rejectedIndices.forEach(rej => {
                         const marker = `[${rej}]`;
                         processedText = processedText.split(marker).join('');
                     });
                     collectedSources.forEach((source, idx) => {
                         const originalGlobalIndex = idx + 1;
                         const marker = `[${originalGlobalIndex}]`;
                         if (processedText.includes(marker) && source.uri && oldToNewIndexMap.has(originalGlobalIndex)) {
                             const newNum = oldToNewIndexMap.get(originalGlobalIndex);
                             const supMap = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹' };
                             const supNum = String(newNum).split('').map(d => supMap[d] || d).join('');
                             const interactiveMarker = `[⁽${supNum}⁾](${source.uri})`;
                             processedText = processedText.split(marker).join(interactiveMarker);
                         }
                     });
                     processedText = processedText.replace(/\s*\[\d+\]\s*/g, ' ').replace(/\s+([.,;:!?])/g, '$1').replace(/\s{2,}/g, ' ').trim();
                     return processedText;
                 });
             };
             if (analysisData.accuracy) {
                 if (analysisData.accuracy.discrepancies) {
                     analysisData.accuracy.discrepancies = rehydrateList(analysisData.accuracy.discrepancies);
                 }
                 if (analysisData.accuracy.verifiedFacts) {
                     analysisData.accuracy.verifiedFacts = rehydrateList(analysisData.accuracy.verifiedFacts);
                 }
                 analysisData.accuracy.citations = gatheredCitations;
             }
        }
        const localStats = calculateReadability(textToProcess);
        const textForDisplay = analysisData.translatedText || textToProcess;
        let cleanedTextForDisplay = textForDisplay.split('\n').map(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith('**') && trimmed.endsWith('**') && trimmed.length > 4) {
                return line.replace(/^(\s*)\*\*(.*)\*\*$/, '$1$2');
            }
            return line;
        }).join('\n');
        const _nonEmpty = cleanedTextForDisplay.split('\n').filter(l => l.trim());
        const _headerCount = _nonEmpty.filter(l => l.trim().startsWith('#')).length;
        if (_nonEmpty.length > 3 && _headerCount / _nonEmpty.length > 0.4) {
            cleanedTextForDisplay = cleanedTextForDisplay.split('\n').map(line => {
                const trimmed = line.trim();
                if (/^#{1,6}\s+/.test(trimmed)) {
                    return line.replace(/^(\s*)#{1,6}\s+(.*)$/, '$1**$2**');
                }
                return line;
            }).join('\n');
        }
        content = {
            ...analysisData,
            originalText: cleanedTextForDisplay,
            rawEnglishText: textToProcess,
            localStats
        };
        metaInfo = isSearchActive ? t('meta.analysis_verified') : t('meta.analysis_standard');
      } else if (type === 'faq') {
        const prompt = `
            Generate ${faqCount} Frequently Asked Questions (FAQs) based on the text below.
            Target Audience: ${gradeLevel} students.
            Language: ${effectiveLanguage}.
            ${studentInterests.length > 0 ? `Integrate metaphors or examples related to "${studentInterests.join(', ')}" where helpful.` : ''}
            ${useEmojis ? 'Include relevant emojis in the questions and answers.' : 'Do not use emojis.'}
            ${effCustomInstructions ? `Custom Instructions: ${effCustomInstructions}` : ''}
            ${effectiveLanguage !== 'English' ? 'Provide English translations for every question and answer.' : ''}
            ${dialectInstruction}
            Format: Return ONLY a JSON array of objects with "question", "answer" ${effectiveLanguage !== 'English' ? ', "question_en", "answer_en"' : ''} keys.
            Example: [{"question": "Why is the sky blue? ☁️", "answer": "...", "question_en": "...", "answer_en": "..."}]
            ${differentiationContext}
            Text: "${textToProcess}"
        `;
        setGenerationStep(t('status_steps.identifying_misconceptions'));
        const result = await callGemini(prompt, true);
        try {
            let parsed = JSON.parse(cleanJson(result));
            if (!Array.isArray(parsed)) {
                 if (parsed.faqs) parsed = parsed.faqs;
                 else if (parsed.questions) parsed = parsed.questions;
                 else parsed = [];
            }
            content = parsed;
            metaInfo = `${faqCount} Questions - ${gradeLevel} - ${effectiveLanguage}`;
        } catch (parseErr) {
             warnLog("FAQ Parse Error:", parseErr);
             throw new Error("Failed to parse FAQ JSON. The AI response was not valid.");
        }
      } else if (type === 'brainstorm') {
         setGenerationStep(t('status_steps.brainstorming') || "Brainstorming ideas...");
         if (alloBotRef.current) alloBotRef.current.speak(t('bot_events.brainstorming_start') || "Ooh, let me think of some fun activities!", 'thinking');
         const audienceDesc = isIndependentMode ? "a single independent learner (self-study)" : `${gradeLevel} students`;
         const taskDesc = isIndependentMode
            ? "Generate a list of 5-8 'Solo Projects' and 'Real-world Experiments' suitable for one person to complete independently at home. Focus on DIY, creative application, or research challenges."
            : "Generate a list of 5-8 engaging, hands-on, or interdisciplinary activity ideas that connect the key concepts to other domains or physical activities.";
         const historySource = configOverride.historyOverride || history;
         const prompt = `
            You are a creative pedagogical expert.
            Analyze the following source text and the context of previously generated resources in the user's history.
            ${dnaPromptBlock}
            ${taskDesc}
            Context from Resource History:
            ${historySource.length > 0 ? historySource.map(h => `- ${h.type}: ${h.title}`).join('\n') : "No previous resources generated yet."}
            ${differentiationContext}
            Source Text: "${textToProcess}",
            ${effCustomInstructions ? `Custom Focus/Instructions: ${effCustomInstructions}` : ''}
            ${standardsPromptString ? `Ensure activities help students demonstrate mastery of Standards: "${standardsPromptString}".` : ''}
            ${lessonDNA ? `Task: Generate activity ideas that specifically help students answer the "Essential Question" or master the "Core Concepts".` : ''}
            Target Audience: ${audienceDesc}.
            Interests: ${studentInterests.length > 0 ? studentInterests.join(', ') : 'General'}.
            Output Format: Return ONLY a JSON array of objects: [{ "title": "Activity Name", "description": "Detailed description of the activity", "connection": "How it connects to concepts" }]
         `;
         const result = await callGemini(prompt, true);
         try {
             let parsed = JSON.parse(cleanJson(result));
             if (!Array.isArray(parsed)) {
                 if (parsed.ideas && Array.isArray(parsed.ideas)) parsed = parsed.ideas;
                 else if (parsed.activities && Array.isArray(parsed.activities)) parsed = parsed.activities;
                 else parsed = [];
             }
             content = parsed;
             metaInfo = t('meta.engagement_ideas');
         } catch (parseErr) {
             warnLog("Brainstorm Parse Error:", parseErr);
             throw new Error("Failed to parse Brainstorm JSON. The AI response was not valid.");
         }
      } else if (type === 'sentence-frames') {
         const prompt = `
            Create writing supports (Scaffolds) based on the text below for ${gradeLevel} students.
            Type: ${frameType}
            Language: ${effectiveLanguage}.
            ${studentInterests.length > 0 ? `Context: Relate to ${studentInterests.join(', ')} if possible.` : ''}
            ${effCustomInstructions ? `Instructions: ${effCustomInstructions}` : ''}
            ${standardsPromptString ? `Design scaffolds to support the skills required by Standards: "${standardsPromptString}".` : ''}
            ${effectiveLanguage !== 'English' ? 'Provide English translations for all text.' : 'Do NOT provide translations.'}
            ${dialectInstruction}
            ${useEmojis ? 'Include relevant emojis in the sentence starters or prompts.' : 'Do not use emojis.'}
            Output Requirements:
            1. Scaffolds:
               - If "Sentence Starters": Provide 5-8 distinct sentence beginnings that help students structure an answer or argument about the text.
               - If "Paragraph Frame": Provide a fill-in-the-blank paragraph structure. Use [blank] (bracketed text) to indicate where students should write.
               - If "Discussion Prompts": Provide 3-5 provocative discussion questions.
            2. Grading Rubric:
               - Create a Markdown table rubric (Criteria vs Levels 1-5) specifically for this activity.
               - Include criteria for Content, Use of Scaffolds, and Mechanics.
            Return ONLY a JSON object with this structure:
            {
                "mode": "list" (for Starters/Prompts) OR "paragraph" (for Frame),
                "items": [{ "text": "..."${effectiveLanguage !== 'English' ? ', "text_en": "..."' : ''} }] (if mode is list),
                "text": "..." (if mode is paragraph)${effectiveLanguage !== 'English' ? ', "text_en": "..."' : ''},
                "rubric": "Markdown string of the rubric table",
            }
            ${differentiationContext}
            Text: "${textToProcess}"
         `;
         setGenerationStep(t('status_steps.constructing_scaffolds'));
         const result = await callGemini(prompt, true);
         try {
             content = JSON.parse(cleanJson(result));
             if (!content.mode) content.mode = frameType === 'Paragraph Frame' ? 'paragraph' : 'list';
             if (content.mode === 'list' && (!content.items || !Array.isArray(content.items))) {
                 content.items = content.starters || content.prompts || [];
             }
             if (content.mode === 'paragraph' && !content.text) {
                 content.text = content.paragraph || "";
             }
             metaInfo = `${frameType} - ${effectiveLanguage}`;
         } catch (parseErr) {
             warnLog("Scaffolds Parse Error:", parseErr);
             throw new Error("Failed to parse Scaffolds JSON. The AI response was not valid.");
         }
      } else if (type === 'alignment-report') {
         // Plan O Step 1.5: ungated. The audit runs even without target standards
         // — the standards-alignment LLM call is skipped (see line 1935 below)
         // and the comprehensive dimensions still produce a meaningful report.
         const artifactsToAudit = history.filter(h =>
             h.type !== 'alignment-report' &&
             h.type !== 'udl-advice' &&
             h.type !== 'gemini-bridge'
         );
         if (artifactsToAudit.length === 0) {
             throw new Error("No resources found to audit. Please generate a Lesson Plan, Text, or Quiz first.");
         }
         const getAuditText = (item) => {
             const d = item.data;
             if (!d) return "No content.";
             if (typeof d === 'string') return d;
             switch (item.type) {
                 case 'lesson-plan':
                     return `
                     OBJECTIVES: ${Array.isArray(d.objectives) ? d.objectives.join('; ') : d.objectives}
                     ESSENTIAL QUESTION: ${d.essentialQuestion}
                     DIRECT INSTRUCTION: ${d.directInstruction}
                     GUIDED PRACTICE: ${d.guidedPractice}
                     INDEPENDENT PRACTICE: ${d.independentPractice}
                     ASSESSMENT/CLOSURE: ${d.closure}
                     `;
                 case 'quiz':
                     if (!d.questions) return t('export.no_questions');
                     return d.questions.map((q, i) => `Q${i+1}: ${q.question} (Correct: ${q.correctAnswer})`).join('\n');
                 case 'glossary':
                     if (!Array.isArray(d)) return t('export.no_terms');
                     return d.map(gItem => `${t('export.term_label')} ${gItem.term} - ${t('export.def_label')} ${gItem.def}${gItem.etymology ? ` — Roots: ${gItem.etymology}` : ''}`).join('; ');
                 case 'sentence-frames':
                     return d.mode === 'list'
                         ? (d.items ? d.items.map(i => i.text).join('\n') : '')
                         : d.text;
                 case 'outline':
                     return `${t('export.main_label')} ${d.main}. ${t('export.structure_label')} ${d.branches?.map(b => `${b.title} (${b.items?.join(', ')})`).join('; ')}`;
                 case 'timeline':
                       if (!Array.isArray(d)) return t('export.no_events');
                       return d.map(evt => `${evt.date}: ${evt.event}`).join('\n');
                 case 'concept-sort':
                       if (!d.categories || !d.items) return t('export.incomplete_sort');
                       return `${t('export.categories_label')} ${d.categories.map(c => c.label).join(', ')}. ${t('export.items_label')} ${d.items.map(i => i.content).join(', ')}`;
                 case 'math':
                       const probs = d.problems || [d];
                       return probs.map(p => `${t('export.problem_label')} ${formatMathQuestion(p)}. ${t('export.answer_label')} ${p.answer}`).join('\n');
                 case 'brainstorm':
                       if (!Array.isArray(d)) return t('export.no_ideas');
                       return d.map(b => `${t('export.activity_label')} ${b.title} - ${b.description}`).join('\n');
                 case 'adventure':
                       return `${t('export.scenario_label')} ${d.currentScene?.text || t('export.no_active_scene')}`;
                 case 'persona':
                       if (!Array.isArray(d)) return t('export.no_personas');
                       return d.map(p => `${t('export.interview_figure_label')} ${p.name} (${p.role})`).join('\n');
                 case 'analysis':
                       return `${t('export.analysis_source_label')} ${d.readingLevel?.range || t('export.unknown_level')}. ${t('export.key_concepts_label')} ${d.concepts?.join(', ')}.`;
                 default:
                     try { return JSON.stringify(d).substring(0, 500); }
                     catch (circErr) { return `[${item.type} content]`; }
             }
         };
         const failedTypes = [];
         const safeGetAuditText = (item) => {
             try {
                 const txt = getAuditText(item);
                 if (typeof txt === 'string') return txt;
                 try { return JSON.stringify(txt).substring(0, 500); }
                 catch (circErr) {
                     failedTypes.push(item.type);
                     return `[${item.type} content]`;
                 }
             } catch (e) {
                 failedTypes.push(item.type);
                 warnLog(`[Alignment] Failed to serialize ${item.type} artifact:`, e);
                 return `[${item.type} content could not be serialized for audit]`;
             }
         };
         let comprehensiveContext = "";
         const MAX_TOTAL_CONTEXT = 30000;
         let contextOverflowed = false;
         artifactsToAudit.forEach((item, index) => {
             if (contextOverflowed) return;
             const label = item.title || getDefaultTitle(item.type);
             let contentStr = safeGetAuditText(item);
             if (contentStr.length > 2500) contentStr = contentStr.substring(0, 2500) + "... [truncated]";
             const chunk = `\n--- ARTIFACT ${index + 1}: ${label.toUpperCase()} (${item.type}) ---\n${contentStr}\n`;
             if (comprehensiveContext.length + chunk.length > MAX_TOTAL_CONTEXT) {
                 comprehensiveContext += `\n--- [Additional ${artifactsToAudit.length - index} artifact(s) omitted to fit audit window] ---\n`;
                 contextOverflowed = true;
                 return;
             }
             comprehensiveContext += chunk;
         });
         if (failedTypes.length > 0) {
             const uniq = Array.from(new Set(failedTypes));
             warnLog(`[Alignment] ${failedTypes.length} artifact(s) could not be serialized. Types: ${uniq.join(', ')}`);
         }
         const prompt = `
            Act as a strict District Curriculum Administrator conducting a **Holistic Lesson Plan Audit**.
            Your goal is to certify if the ENTIRE COLLECTION of generated resources aligns with the Target Standards.
            TARGET STANDARDS: "${standardsPromptString}"
            TARGET GRADE LEVEL: ${gradeLevel}
            --- LESSON ARTIFACTS SUBMITTED FOR AUDIT ---
            ${comprehensiveContext}
            --- AUDIT PROTOCOL ---
            Perform the Audit Protocol for EACH standard provided:
            1. DECONSTRUCT: Break the standard into required Content (Nouns) and Skills (Verbs/DOK).
            2. HOLISTIC EVIDENCE GATHERING: Look across ALL artifacts provided above.
               - **Instructional Alignment:** Does the Lesson Plan and Text teach the required content?
               - **Activity Alignment:** Do the Scaffolds, Organizers, and Games (Timeline/Sorts) force students to practice the specific skills?
               - **Assessment Alignment:** Does the Quiz or Adventure outcome verify mastery of the standard?
            3. GAP ANALYSIS: If a standard requires "Analysis," but the resources only provide "Recall" (Glossary/Basic Quiz), mark it as Partially Aligned.
            Return ONLY JSON with this structure:
            {
              "reports": [
                {
                    "standard": "The specific Standard Code being audited",
                    "standardBreakdown": { "cognitiveDemand": "...", "contentFocus": "..." },
                    "analysis": {
                        "textAlignment": {
                            "status": "Aligned" | "Partially Aligned" | "Not Aligned",
                            "evidence": "Cites specific artifacts (e.g. 'The Lesson Plan Hook covers...')",
                            "notes": "...",
                        },
                        "activityAlignment": {
                            "status": "Aligned" | "Partially Aligned" | "Not Aligned",
                            "evidence": "Cites specific artifacts (e.g. 'The Concept Sort requires distinguishing...', 'The Timeline builds sequence...')",
                            "notes": "Evaluation of how these activities practice the standard's skills.",
                        },
                        "assessmentAlignment": {
                            "status": "Aligned" | "Partially Aligned" | "Not Aligned",
                            "evidence": "Cites specific artifacts (e.g. 'Quiz Question 3 tests...')",
                            "notes": "...",
                        }
                    },
                    "overallDetermination": "Pass" | "Revise",
                    "gaps": ["List of specific missing elements or rigor gaps..."],
                    "adminRecommendation": "Formal paragraph recommending next steps...",
                }
              ]
            }
         `;
         // ---- Standards alignment (LLM): only if standards are provided -----
         if (targetStandards.length > 0) {
             setGenerationStep && setGenerationStep('Auditing standards alignment...');
             const result = await callGemini(prompt, true);
             try {
                 content = JSON.parse(cleanJson(result));
                 metaInfo = `Standards: ${standardsPromptString}`;
             } catch (parseErr) {
                 warnLog("Alignment Report Parse Error (attempt 1):", parseErr);
                 try {
                     await new Promise(r => setTimeout(r, 750));
                     const retryPrompt = `${prompt}\n\nCRITICAL: Your previous response failed JSON.parse. Return ONLY a single valid JSON object matching the structure above. No prose, no markdown fences, no trailing commas.`;
                     const retryResult = await callGemini(retryPrompt, true);
                     content = JSON.parse(cleanJson(retryResult));
                     metaInfo = `Standards: ${standardsPromptString}`;
                 } catch (retryErr) {
                     warnLog("Alignment Report Parse Error (attempt 2):", retryErr);
                     throw new Error("Failed to parse Alignment Report JSON. The AI response was not valid.");
                 }
             }
         } else {
             // No standards provided: skip the alignment LLM call but still
             // produce a content object so the comprehensive dimensions can
             // attach. The render handles empty reports[] gracefully.
             content = { reports: [] };
             metaInfo = `Comprehensive audit (no target standards)`;
         }

         // ---- Plan O Steps 1-5: Comprehensive dimensions (PARALLEL) ---------
         // Deterministic computations run synchronously first (microseconds).
         // The 5 LLM review calls then run in parallel via Promise.all, cutting
         // wall-clock from ~30-60s sequential to ~10s.
         const auditHarvest = harvestExistingAuditSignals(artifactsToAudit);
         content.comprehensive = content.comprehensive || {};

         // ---- Plan R+: Standards alignment as 6th dimension -----------------
         // Fold the standards-alignment data (already produced by the LLM call
         // above when targetStandards exist) into comprehensive.standards so it
         // counts toward the readiness score and renders in the same dimension
         // framework as the others. content.reports is kept as a back-compat
         // alias but the canonical shape going forward is comprehensive.standards.
         (function buildStandardsDimension() {
             const reports = Array.isArray(content.reports) ? content.reports : [];
             if (reports.length === 0) {
                 // No standards entered → not applicable, exclude from score math.
                 content.comprehensive.standards = {
                     status: 'Not applicable',
                     notApplicable: true,
                     reason: 'No target standards entered. Add a standard in the settings panel to include standards alignment in the audit.',
                     perStandard: [],
                 };
                 return;
             }
             let passCount = 0; let reviseCount = 0;
             const recs = [];
             reports.forEach(function (r) {
                 if (r && r.overallDetermination === 'Pass') passCount++;
                 else reviseCount++;
                 if (r && r.adminRecommendation) recs.push(r.adminRecommendation);
             });
             let status;
             if (reviseCount === 0) status = 'Aligned';
             else if (passCount === 0) status = 'Not Aligned';
             else status = 'Partially Aligned';
             content.comprehensive.standards = {
                 status,
                 perStandard: reports,
                 totalStandards: reports.length,
                 passCount,
                 reviseCount,
                 recommendations: recs.slice(0, 5),
                 notes: reports.length + ' standard' + (reports.length === 1 ? '' : 's') + ' audited via Holistic Lesson Plan Audit. Each standard evaluated for text-, activity-, and assessment-alignment + cognitive demand.',
             };
         })();

         // ---- Sync deterministic compute (Steps 1, 2, 3, 5 stats) -----------
         // On compute failure, write a placeholder marker so the teacher sees
         // "Couldn't compute" instead of the dimension silently disappearing.
         const failedPlaceholder = (label, err) => ({
             status: 'Compute failed',
             computeFailed: true,
             error: err && err.message ? String(err.message).slice(0, 240) : 'Unknown error',
             notes: label + ' could not be computed for this audit. The error has been logged. Try regenerating the audit; if the problem persists, check the artifacts have the expected shape.',
         });

         let vocabFit = null;
         try {
             vocabFit = computeVocabularyFit(artifactsToAudit, gradeLevel);
             vocabFit.readingLevels = auditHarvest.readingLevels;
             content.comprehensive.vocabulary = vocabFit;
         } catch (vocabErr) {
             warnLog('[Alignment] Vocabulary fit computation failed:', vocabErr);
             content.comprehensive.vocabulary = failedPlaceholder('Vocabulary', vocabErr);
         }

         let engagement = null;
         try {
             engagement = computeEngagementVariety(auditHarvest, artifactsToAudit);
             content.comprehensive.engagement = engagement;
         } catch (engErr) {
             warnLog('[Alignment] Engagement variety computation failed:', engErr);
             content.comprehensive.engagement = failedPlaceholder('Engagement variety', engErr);
         }

         let accessibility = null;
         try {
             accessibility = computeContentAccessibility(artifactsToAudit, auditHarvest, gradeLevel);
             content.comprehensive.accessibility = accessibility;
         } catch (accErr) {
             warnLog('[Alignment] Accessibility computation failed:', accErr);
             content.comprehensive.accessibility = failedPlaceholder('Content accessibility', accErr);
         }

         let accuracy = null;
         try {
             accuracy = computeContentAccuracy(auditHarvest);
             content.comprehensive.accuracy = accuracy;
         } catch (accuracyErr) {
             warnLog('[Alignment] Content accuracy computation failed:', accuracyErr);
             content.comprehensive.accuracy = failedPlaceholder('Content accuracy', accuracyErr);
         }

         // ---- Plan R+ new dimensions: differentiation + cognitive load ----
         let differentiation = null;
         try {
             differentiation = computeDifferentiationCoverage(artifactsToAudit, auditHarvest);
             content.comprehensive.differentiation = differentiation;
         } catch (diffErr) {
             warnLog('[Alignment] Differentiation computation failed:', diffErr);
             content.comprehensive.differentiation = failedPlaceholder('Differentiation coverage', diffErr);
         }

         let cognitiveLoad = null;
         try {
             const sourceWords = (vocabFit && typeof vocabFit.sourceWords === 'number') ? vocabFit.sourceWords : 0;
             cognitiveLoad = computeCognitiveLoad(artifactsToAudit, sourceWords, gradeLevel);
             content.comprehensive.cognitiveLoad = cognitiveLoad;
         } catch (clErr) {
             warnLog('[Alignment] Cognitive load computation failed:', clErr);
             content.comprehensive.cognitiveLoad = failedPlaceholder('Cognitive load / pacing', clErr);
         }

         // Shared grade band derived once for all dimensions
         const dimGradeBand = (vocabFit && vocabFit.expected && vocabFit.expected.gradeBand) || gradeLevel;

         // ---- Async LLM reviews (parallel) ---------------------------------
         setGenerationStep && setGenerationStep('Running 8 audit dimensions in parallel...');

         // Each task is self-contained: build prompt → call → parse → apply.
         // Tasks return null on any failure; failures are logged but don't
         // block other dimensions or the overall audit.
         const vocabTask = vocabFit ? (async () => {
             const fp = 'vocab:' + _auditFingerprint(artifactsToAudit, gradeLevel);
             const cached = _auditLLMCache.get(fp);
             if (cached) { content.comprehensive.vocabulary.llmReview = cached; return; }
             try {
                 const contextSnippet = (comprehensiveContext || '').slice(0, 4000);
                 const prompt = `You are a literacy coach reviewing a heuristic vocabulary classification.\n\nThe system classified words from a lesson as:\n- Tier 1 (everyday): ${vocabFit.tier1Count} unique words\n- Tier 2 (academic, cross-disciplinary): ${vocabFit.tier2Count} unique words. Examples flagged by the heuristic: ${(vocabFit.tier2Examples || []).join(', ') || '(none)'}\n- Tier 3 (domain-specific): ${vocabFit.tier3Count} unique words. Examples flagged: ${(vocabFit.tier3Examples || []).join(', ') || '(none)'}\n\nGrade band: ${vocabFit.expected.gradeBand}\nExpected per Beck/McKeown norms: ~${vocabFit.expected.tier2} Tier 2 + ~${vocabFit.expected.tier3} Tier 3 unique words.\n\nSource text excerpt (first 4000 chars):\n"""\n${contextSnippet}\n"""\n\nReview the heuristic classifications and provide:\n1. "corrections": array of words from the Tier 2 examples that the heuristic got WRONG (i.e., they're really Tier 1 everyday words). Common false positives to watch for: long-but-common words like "tomorrow", "remember", "different", "without", "morning".\n2. "missedTier2": array of 2-4 Tier 2 academic words that ARE in the source text but the heuristic likely missed (e.g., shorter words like "claim", "reveal", "trace", "frame" that appear academically).\n3. "recommendations": array of 2-3 specific Tier 2 academic words to ADD to this lesson, contextually appropriate to the topic and grade band. Each recommendation must be one to three words.\n4. "narrative": ONE paragraph (2-3 sentences) summarizing whether the lesson's vocabulary load is appropriate for the grade band, and what the most important next move is.\n\nReturn ONLY a single valid JSON object with exactly these four fields. No prose outside the JSON, no markdown fences.`;
                 const result = await callGemini(prompt, true);
                 const review = JSON.parse(cleanJson(result));
                 const reviewShape = {
                     corrections: Array.isArray(review.corrections) ? review.corrections.slice(0, 12) : [],
                     missedTier2: Array.isArray(review.missedTier2) ? review.missedTier2.slice(0, 8) : [],
                     recommendations: Array.isArray(review.recommendations) ? review.recommendations.slice(0, 6) : [],
                     narrative: typeof review.narrative === 'string' ? review.narrative : '',
                 };
                 content.comprehensive.vocabulary.llmReview = reviewShape;
                 _auditLLMCache.set(fp, reviewShape);
             } catch (e) { warnLog('[Alignment] Vocab LLM review failed:', e); }
         })() : Promise.resolve();

         const engagementTask = engagement ? (async () => {
             const fp = 'engagement:' + _auditFingerprint(artifactsToAudit, dimGradeBand);
             const cached = _auditLLMCache.get(fp);
             if (cached) { content.comprehensive.engagement.llmReview = cached; return; }
             try {
                 // DOK fallback: when engagement.dokTotal === 0 BUT a quiz exists in the
                 // artifacts (i.e., the quiz generator didn't tag DOK levels), pass the
                 // actual quiz questions to the LLM so it can estimate DOK rather than
                 // falsely report "no quiz items." Verified bug from Solar System audit.
                 const quizItem = artifactsToAudit.find(function (h) { return h && h.type === 'quiz' && h.data; });
                 const hasQuiz = !!(quizItem && quizItem.data && Array.isArray(quizItem.data.questions) && quizItem.data.questions.length > 0);
                 const needsDokFallback = hasQuiz && (engagement.dokTotal === 0 || !engagement.dokTotal);
                 const quizSnippet = needsDokFallback
                     ? quizItem.data.questions.slice(0, 12).map(function (q, i) {
                         var qt = (q && (q.question || q.text)) ? String(q.question || q.text) : '';
                         return (i + 1) + '. ' + qt.slice(0, 220);
                       }).join('\n')
                     : '';
                 const dokFallbackBlock = needsDokFallback
                     ? '\n\nDOK FALLBACK NEEDED: This quiz has ' + quizItem.data.questions.length + ' questions but no DOK metadata. Estimate DOK distribution from the question stems below. Return percentages summing to 100. Examples:\n' + quizSnippet
                     : '';
                 const dokInstruction = needsDokFallback
                     ? '3. "dokAssessment": ONE sentence on the estimated DOK distribution from the questions above (e.g., "Estimated ~70% L1 recall, ~25% L2, ~5% L3; add 2-3 strategic-thinking items").\n4. "estimatedDokDistribution": object with percentage estimates {"L1": int, "L2": int, "L3": int, "L4": int} based on the questions above (must sum to 100).'
                     : '3. "dokAssessment": ONE sentence on whether the DOK balance is appropriate (e.g., "DOK skews recall-heavy; add 2-3 application-level questions" or "DOK distribution is well-balanced for ' + dimGradeBand + '"). If dokTotal is 0, say "No quiz items present to evaluate DOK."';
                 const prompt = `You are an expert in UDL (Universal Design for Learning) and Webb's Depth of Knowledge framework. Review the engagement-variety profile of this curriculum.\n\nDeterministic stats:\n- Distinct artifact types: ${engagement.distinctTypeCount} (${engagement.distinctTypes.join(', ')})\n- Total artifacts: ${engagement.totalArtifacts}\n- Diversity score: ${engagement.diversityScore} (0=single type, 1=balanced)\n- DOK distribution (% of quiz items, ${engagement.dokTotal} total): L1=${engagement.dokDistribution.L1 || 0}%, L2=${engagement.dokDistribution.L2 || 0}%, L3=${engagement.dokDistribution.L3 || 0}%, L4=${engagement.dokDistribution.L4 || 0}%, unknown=${engagement.dokDistribution.unknown || 0}%\n- Scaffolds: ${engagement.scaffoldCounts.sentenceFrames} sentence-frames sets, ${engagement.scaffoldCounts.simplifiedTexts} simplified texts, ${engagement.scaffoldCounts.leveledGlossary} leveled glossaries\n- Modalities present: ${engagement.multimodalCoverage.present.join(', ') || '(none)'}\n- Modalities missing: ${engagement.multimodalCoverage.missing.join(', ') || '(none)'}\n- Grade band: ${dimGradeBand}${dokFallbackBlock}\n\nProvide:\n1. "narrative": ONE paragraph (2-3 sentences) on whether engagement variety is appropriate for the grade band and what is most needed.\n2. "formatGaps": array of 1-3 specific format additions that would most improve engagement (e.g., "add a Visual Organizer to give visual learners a non-text path through the content", "add a brief Adventure scenario for kinesthetic engagement"). Each entry should be a sentence.\n${dokInstruction}\n\nReturn ONLY a single valid JSON object with exactly these fields.`;
                 const result = await callGemini(prompt, true);
                 const review = JSON.parse(cleanJson(result));
                 const reviewShape = {
                     narrative: typeof review.narrative === 'string' ? review.narrative : '',
                     formatGaps: Array.isArray(review.formatGaps) ? review.formatGaps.slice(0, 5) : [],
                     dokAssessment: typeof review.dokAssessment === 'string' ? review.dokAssessment : '',
                 };
                 // If LLM estimated DOK distribution as fallback, attach it to engagement directly
                 // so the render shows the bar chart instead of "no quiz items."
                 if (needsDokFallback && review.estimatedDokDistribution && typeof review.estimatedDokDistribution === 'object') {
                     const est = review.estimatedDokDistribution;
                     const safeNum = function (v) { return typeof v === 'number' && v >= 0 ? Math.round(v) : 0; };
                     content.comprehensive.engagement.dokDistribution = {
                         L1: safeNum(est.L1),
                         L2: safeNum(est.L2),
                         L3: safeNum(est.L3),
                         L4: safeNum(est.L4),
                         unknown: 0,
                     };
                     content.comprehensive.engagement.dokTotal = quizItem.data.questions.length;
                     content.comprehensive.engagement.dokSource = 'llm-estimated';
                 }
                 content.comprehensive.engagement.llmReview = reviewShape;
                 _auditLLMCache.set(fp, reviewShape);
             } catch (e) { warnLog('[Alignment] Engagement LLM review failed:', e); }
         })() : Promise.resolve();

         const accessTask = accessibility ? (async () => {
             const fp = 'accessibility:' + _auditFingerprint(artifactsToAudit, dimGradeBand);
             const cached = _auditLLMCache.get(fp);
             if (cached) { content.comprehensive.accessibility.llmReview = cached; return; }
             try {
                 const prompt = `You are a school accessibility specialist (school psychologist with assistive-technology expertise). Review the content-level accessibility of this curriculum.\n\nDeterministic findings:\n- Total images: ${accessibility.totalImages} (${accessibility.imagesWithAlt} with alt text${accessibility.altCoveragePct !== null ? ', ' + accessibility.altCoveragePct + '% coverage' : ''})\n- Color-only language hits: ${accessibility.colorOnlyCount}${accessibility.colorOnlyExamples.length > 0 ? ' (examples: ' + accessibility.colorOnlyExamples.slice(0, 3).join(' | ') + ')' : ''}\n- Implicit image references: ${accessibility.implicitImageCount}${accessibility.implicitImageExamples.length > 0 ? ' (examples: ' + accessibility.implicitImageExamples.slice(0, 3).join(' | ') + ')' : ''}\n- Longest unbroken passage: ${accessibility.longestUnbrokenPassage} words\n- Grade band: ${dimGradeBand}\n\nSource text excerpt (first 3000 chars):\n"""\n${(comprehensiveContext || '').slice(0, 3000)}\n"""\n\nProvide:\n1. "narrative": ONE paragraph (2-3 sentences) on overall content accessibility for this grade band. Focus on student impact (what would a student with X experience here?), not WCAG terminology.\n2. "studentImpacts": array of 1-3 specific student-experience callouts. Each entry pairs a student profile with what they would encounter, e.g., "A student using a screen reader would hear 'image' with no description for 3 of the 4 figures, missing the visual evidence for the photosynthesis diagram." Be specific and concrete.\n3. "fixes": array of 2-4 actionable fix suggestions a teacher could apply to THIS content. Each fix should be a sentence, concrete, and tied to the specific findings.\n\nReturn ONLY a single valid JSON object with exactly these three fields.`;
                 const result = await callGemini(prompt, true);
                 const review = JSON.parse(cleanJson(result));
                 const reviewShape = {
                     narrative: typeof review.narrative === 'string' ? review.narrative : '',
                     studentImpacts: Array.isArray(review.studentImpacts) ? review.studentImpacts.slice(0, 5) : [],
                     fixes: Array.isArray(review.fixes) ? review.fixes.slice(0, 6) : [],
                 };
                 content.comprehensive.accessibility.llmReview = reviewShape;
                 _auditLLMCache.set(fp, reviewShape);
             } catch (e) { warnLog('[Alignment] Accessibility LLM review failed:', e); }
         })() : Promise.resolve();

         // UDL is pure-LLM (no deterministic stats; uses harvest priors)
         const udlTask = (async () => {
             const fp = 'udl:' + _auditFingerprint(artifactsToAudit, dimGradeBand);
             const cached = _auditLLMCache.get(fp);
             if (cached) { content.comprehensive.udl = cached; return; }
             try {
                 const modPresent = auditHarvest.multimodal || {};
                 const scaffoldCounts = auditHarvest.scaffoldCounts || {};
                 const distinctTypes = Array.from(auditHarvest.distinctTypes || []);
                 const prompt = `You are a CAST-trained UDL specialist evaluating a curriculum against the three Universal Design for Learning principles (CAST UDL Guidelines v3.0). Each principle has its own pillar. Rate each pillar individually, not the curriculum as a whole.\n\nCurriculum profile (deterministic):\n- Distinct artifact types: ${distinctTypes.join(', ') || '(none)'}\n- Modalities: text=${!!modPresent.text}, image=${!!modPresent.image}, audio=${!!modPresent.audio}, interactive=${!!modPresent.interactive}\n- Scaffolds: ${scaffoldCounts.sentenceFrames || 0} sentence-frame sets, ${scaffoldCounts.simplifiedTexts || 0} simplified texts, ${scaffoldCounts.leveledGlossary || 0} leveled glossaries\n- Reading levels: ${(auditHarvest.readingLevels || []).map(r => r.range).join('; ') || '(none)'}\n- Grade band: ${dimGradeBand}\n\nSource excerpt (first 2500 chars):\n"""\n${(comprehensiveContext || '').slice(0, 2500)}\n"""\n\nFor EACH UDL pillar, evaluate using these prompts:\n\n1. REPRESENTATION (how is content presented?). Multiple ways to access the same content? Visual + auditory + text + interactive? Customizable display? Vocabulary support? Activate background knowledge? Highlight patterns?\n\n2. ENGAGEMENT (why do learners invest effort?). Choices/autonomy? Authenticity, relevance, cultural responsiveness? Optimal challenge with scaffolds? Sustained-effort supports (goal-setting, feedback, self-reflection)?\n\n3. ACTION & EXPRESSION (how do learners demonstrate what they know?). Multiple ways to respond (writing, speaking, drawing, building, performing)? Tools and assistive-tech support? Goal-setting and progress-monitoring scaffolds?\n\nReturn ONLY a single valid JSON object:\n{\n  "representation": { "status": "Aligned"|"Partially Aligned"|"Not Aligned", "evidence": "...", "gaps": "...", "recommendation": "ONE sentence" },\n  "engagement":     { "status": "...", "evidence": "...", "gaps": "...", "recommendation": "..." },\n  "actionExpression":{ "status": "...", "evidence": "...", "gaps": "...", "recommendation": "..." },\n  "overallNarrative": "ONE paragraph (2-3 sentences) summarizing UDL alignment and naming the most pressing pillar to strengthen",\n  "overallStatus": "Aligned"|"Partially Aligned"|"Not Aligned"\n}\n\nNo prose outside the JSON. No markdown fences. No trailing commas.`;
                 const result = await callGemini(prompt, true);
                 const udl = JSON.parse(cleanJson(result));
                 const pillarShape = function (p) {
                     const safe = p && typeof p === 'object' ? p : {};
                     return {
                         status: typeof safe.status === 'string' ? safe.status : 'Partially Aligned',
                         evidence: typeof safe.evidence === 'string' ? safe.evidence : '',
                         gaps: typeof safe.gaps === 'string' ? safe.gaps : '',
                         recommendation: typeof safe.recommendation === 'string' ? safe.recommendation : '',
                     };
                 };
                 const udlShape = {
                     status: typeof udl.overallStatus === 'string' ? udl.overallStatus : 'Partially Aligned',
                     overallNarrative: typeof udl.overallNarrative === 'string' ? udl.overallNarrative : '',
                     representation: pillarShape(udl.representation),
                     engagement: pillarShape(udl.engagement),
                     actionExpression: pillarShape(udl.actionExpression),
                     priorsUsed: {
                         distinctTypes: distinctTypes,
                         modalitiesPresent: ['text','image','audio','interactive'].filter(function (m) { return !!modPresent[m]; }),
                         scaffoldCounts: scaffoldCounts,
                     },
                     notes: 'Per CAST UDL Guidelines v3.0. Each pillar evaluated against the deterministic curriculum profile + LLM judgment of the source content.',
                 };
                 content.comprehensive.udl = udlShape;
                 _auditLLMCache.set(fp, udlShape);
             } catch (e) {
                 warnLog('[Alignment] UDL evaluation failed:', e);
                 if (!content.comprehensive.udl) {
                     content.comprehensive.udl = {
                         status: 'Compute failed',
                         computeFailed: true,
                         error: e && e.message ? String(e.message).slice(0, 240) : 'UDL LLM call failed or response could not be parsed.',
                         notes: 'UDL principles evaluation could not complete. The error has been logged. Try regenerating the audit.',
                     };
                 }
             }
         })();

         const accuracyTask = accuracy ? (async () => {
             const fp = 'accuracy:' + _auditFingerprint(artifactsToAudit, dimGradeBand);
             const cached = _auditLLMCache.get(fp);
             if (cached) { content.comprehensive.accuracy.llmReview = cached; return; }
             try {
                 const prompt = `You are a fact-checking editor reviewing a curriculum's content accuracy. The lesson's source text was previously analyzed and AI-graded for accuracy.\n\nDeterministic harvest from analysis items:\n- Total analyses run: ${accuracy.totalAnalyses}\n- Accuracy ratings: ${accuracy.accuracyRatingCounts.high} High, ${accuracy.accuracyRatingCounts.medium} Medium, ${accuracy.accuracyRatingCounts.low} Low\n- Total verified facts: ${accuracy.totalVerifiedFacts}\n- Total discrepancies flagged: ${accuracy.totalDiscrepancies}\n- Grade band: ${dimGradeBand}\n\nSample analysis verifications (first 3):\n${accuracy.sampleVerifications.slice(0, 3).map((s, i) => `  ${i+1}. Rating: ${s.rating}, ${s.verifiedFactCount} verified, ${s.discrepancyCount} discrepancies. Reason: "${(s.reason || '').slice(0, 200)}"`).join('\n') || '(no analyses available)'}\n\nFull source excerpt (first 3000 chars):\n"""\n${(comprehensiveContext || '').slice(0, 3000)}\n"""\n\nProvide:\n1. "narrative": ONE paragraph (2-3 sentences) on overall content accuracy. If no analyses have been run, explicitly suggest running "Analyze Source Text" before deploying this curriculum.\n2. "claimsToVerify": array of 1-4 specific factual claims in NON-analysis artifacts (quiz questions, glossary definitions, lesson-plan facts) that a teacher should double-check. Each entry should be the actual claim quoted or paraphrased. Focus on claims with measurable risk (specific dates, numbers, named people/places, scientific assertions).\n3. "fixes": array of 1-3 actionable suggestions for improving accuracy ("add citations to the quiz answers", "verify the dates in the timeline against a primary source", etc.).\n\nReturn ONLY a single valid JSON object with exactly these three fields. No prose outside the JSON.`;
                 const result = await callGemini(prompt, true);
                 const review = JSON.parse(cleanJson(result));
                 const reviewShape = {
                     narrative: typeof review.narrative === 'string' ? review.narrative : '',
                     claimsToVerify: Array.isArray(review.claimsToVerify) ? review.claimsToVerify.slice(0, 6) : [],
                     fixes: Array.isArray(review.fixes) ? review.fixes.slice(0, 5) : [],
                 };
                 content.comprehensive.accuracy.llmReview = reviewShape;
                 _auditLLMCache.set(fp, reviewShape);
             } catch (e) { warnLog('[Alignment] Accuracy LLM review failed:', e); }
         })() : Promise.resolve();

         // ---- Plan R+ Differentiation review (LLM grades the scaffold mix) ---
         const differentiationTask = (differentiation && !differentiation.computeFailed) ? (async () => {
             const fp = 'differentiation:' + _auditFingerprint(artifactsToAudit, dimGradeBand);
             const cached = _auditLLMCache.get(fp);
             if (cached) { content.comprehensive.differentiation.llmReview = cached; return; }
             try {
                 const flags = differentiation.flags || {};
                 const present = Object.keys(flags).filter(function (k) { return flags[k]; });
                 const missing = differentiation.missing || [];
                 const prompt = 'You are a UDL specialist reviewing how a curriculum supports learner variability.\n\nDeterministic scaffold inventory (' + differentiation.coverage + '% coverage):\n- Present: ' + (present.join(', ') || '(none)') + '\n- Missing: ' + (missing.join(', ') || '(none)') + '\n\nGrade band: ' + dimGradeBand + '\n\nSource excerpt (first 2000 chars):\n"""\n' + (comprehensiveContext || '').slice(0, 2000) + '\n"""\n\nProvide:\n1. "narrative": ONE paragraph (2-3 sentences) on whether the scaffold mix realistically serves the range of learners typical at this grade band. Name the most impactful missing scaffold for THIS content (some content needs visuals more than text-leveling; some needs audio more than visuals).\n2. "priorityAdditions": array of 1-3 specific scaffold-add suggestions ranked by impact for the grade band and topic. Each entry one short sentence.\n3. "qualityFlags": array of 0-2 sentences flagging any present-but-likely-thin scaffolds (e.g., "glossary present but only 4 terms — consider expanding for ELL support").\n\nReturn ONLY a single valid JSON object with exactly these three fields.';
                 const result = await callGemini(prompt, true);
                 const review = JSON.parse(cleanJson(result));
                 const reviewShape = {
                     narrative: typeof review.narrative === 'string' ? review.narrative : '',
                     priorityAdditions: Array.isArray(review.priorityAdditions) ? review.priorityAdditions.slice(0, 5) : [],
                     qualityFlags: Array.isArray(review.qualityFlags) ? review.qualityFlags.slice(0, 4) : [],
                 };
                 content.comprehensive.differentiation.llmReview = reviewShape;
                 _auditLLMCache.set(fp, reviewShape);
             } catch (e) { warnLog('[Alignment] Differentiation LLM review failed:', e); }
         })() : Promise.resolve();

         // ---- Plan R+ Cognitive load review (LLM judges pacing realism) ------
         const cognitiveLoadTask = (cognitiveLoad && !cognitiveLoad.notApplicable && !cognitiveLoad.computeFailed) ? (async () => {
             const fp = 'cognitiveLoad:' + _auditFingerprint(artifactsToAudit, dimGradeBand);
             const cached = _auditLLMCache.get(fp);
             if (cached) { content.comprehensive.cognitiveLoad.llmReview = cached; return; }
             try {
                 const segs = (cognitiveLoad.perSegment || []).map(function (s) { return s.label + ': ' + (s.claimedMinutes !== null ? s.claimedMinutes + ' min' : '(no time given)'); }).join('\n - ');
                 const prompt = 'You are an experienced classroom teacher reviewing a lesson plan for realistic pacing.\n\nClaimed segment durations:\n - ' + (segs || '(none)') + '\nClaimed total: ' + cognitiveLoad.claimedTotalMinutes + ' min\n\nDeterministic estimate of actual time required: ' + cognitiveLoad.estimatedTotalMinutes + ' min\n  - Reading: ' + cognitiveLoad.breakdown.reading + ' min (assumes ' + cognitiveLoad.breakdown.wpmAssumption + ' wpm at this grade)\n  - Quiz: ' + cognitiveLoad.breakdown.quiz + ' min\n  - Activities: ' + cognitiveLoad.breakdown.activities + ' min\n\nClaimed-vs-estimated ratio: ' + (cognitiveLoad.ratio || 'n/a') + '\nGrade band: ' + dimGradeBand + '\n\nProvide:\n1. "narrative": ONE paragraph (2-3 sentences) on whether the pacing is realistic and what the most likely failure mode is (running out of time vs. dead time). Be specific about which segment is most likely the squeeze point.\n2. "specificAdjustments": array of 1-3 concrete adjustments ("trim source text to 800 words", "drop one quiz question", "split into 2 days"). Each entry one short sentence.\n\nReturn ONLY a single valid JSON object with exactly these two fields.';
                 const result = await callGemini(prompt, true);
                 const review = JSON.parse(cleanJson(result));
                 const reviewShape = {
                     narrative: typeof review.narrative === 'string' ? review.narrative : '',
                     specificAdjustments: Array.isArray(review.specificAdjustments) ? review.specificAdjustments.slice(0, 5) : [],
                 };
                 content.comprehensive.cognitiveLoad.llmReview = reviewShape;
                 _auditLLMCache.set(fp, reviewShape);
             } catch (e) { warnLog('[Alignment] Cognitive load LLM review failed:', e); }
         })() : Promise.resolve();

         // ---- Plan R+ Cultural responsiveness (LLM-detected N/A) ---------------
         // First gate: does this content have human contexts/examples/perspectives
         // to evaluate? If not, dimension returns notApplicable and is excluded from
         // the readiness math.
         const culturalTask = (async () => {
             const fp = 'culturalResponsiveness:' + _auditFingerprint(artifactsToAudit, dimGradeBand);
             const cached = _auditLLMCache.get(fp);
             if (cached) { content.comprehensive.culturalResponsiveness = cached; return; }
             try {
                 const prompt = 'You are an experienced equity-and-inclusion educator reviewing a curriculum for cultural responsiveness.\n\nFIRST decide whether this content has human contexts, examples, perspectives, or named people that representation considerations apply to. Pure mechanics (math equations, phonics drills, titration steps) often do NOT — for those, return { "notApplicable": true, "reason": "Brief explanation of why representation considerations do not apply." }\n\nIf the content DOES have human surface area, evaluate:\n- Diversity of names, examples, settings, and perspectives represented\n- Avoidance of stereotypes or single-story framing\n- Inclusion of underrepresented or non-dominant perspectives where relevant\n- Asset-based (not deficit-based) framing of communities discussed\n\nGrade band: ' + dimGradeBand + '\n\nSource excerpt (first 3500 chars):\n"""\n' + (comprehensiveContext || '').slice(0, 3500) + '\n"""\n\nReturn ONLY a single valid JSON object. EITHER:\n  { "notApplicable": true, "reason": "..." }\nOR (when applicable):\n  {\n    "notApplicable": false,\n    "status": "Aligned" | "Partially Aligned" | "Not Aligned",\n    "narrative": "ONE paragraph (2-3 sentences) honestly assessing the representation. Avoid both inflation and over-criticism — name what is present, what is missing, and what one specific addition would most strengthen the lesson.",\n    "strengths": array of 0-3 specific things this content does well (named, concrete),\n    "gaps": array of 0-3 specific gaps (named, concrete, not generic),\n    "additions": array of 1-3 concrete suggestions for adding underrepresented perspectives, examples, or framings\n  }\n\nNo prose outside the JSON. No markdown fences. Be honest, not performative.';
                 const result = await callGemini(prompt, true);
                 const review = JSON.parse(cleanJson(result));
                 if (review && review.notApplicable === true) {
                     content.comprehensive.culturalResponsiveness = {
                         status: 'Not applicable',
                         notApplicable: true,
                         reason: typeof review.reason === 'string' ? review.reason : 'Content has no human surface area to evaluate.',
                         notes: 'LLM judged this content does not have representation considerations to evaluate (e.g., pure mechanics, math equations, phonics drills).',
                     };
                 } else {
                     content.comprehensive.culturalResponsiveness = {
                         status: typeof review.status === 'string' ? review.status : 'Partially Aligned',
                         narrative: typeof review.narrative === 'string' ? review.narrative : '',
                         strengths: Array.isArray(review.strengths) ? review.strengths.slice(0, 5) : [],
                         gaps: Array.isArray(review.gaps) ? review.gaps.slice(0, 5) : [],
                         additions: Array.isArray(review.additions) ? review.additions.slice(0, 5) : [],
                         notes: 'LLM-graded representation review. Inherently judgment-laden — treat findings as a starting point for teacher reflection, not a verdict.',
                     };
                 }
                 _auditLLMCache.set(fp, content.comprehensive.culturalResponsiveness);
             } catch (e) {
                 warnLog('[Alignment] Cultural responsiveness LLM call failed:', e);
                 content.comprehensive.culturalResponsiveness = {
                     status: 'Compute failed',
                     computeFailed: true,
                     error: e && e.message ? String(e.message).slice(0, 240) : 'Cultural responsiveness LLM call failed.',
                     notes: 'Cultural responsiveness evaluation could not complete.',
                 };
             }
         })();

         await Promise.all([vocabTask, engagementTask, accessTask, udlTask, accuracyTask, differentiationTask, cognitiveLoadTask, culturalTask]);

         // ---- Plan O Step 6: Curriculum Readiness Score (roll-up) -----------
         setGenerationStep && setGenerationStep('Computing curriculum readiness score...');
         try {
             const readiness = computeReadinessScore(content.comprehensive);
             if (readiness) {
                 content.comprehensive.overall = readiness;
             }
         } catch (rollupErr) {
             warnLog('[Alignment] Readiness score computation failed:', rollupErr);
         }
      } else if (type === 'timeline') {
         setGenerationStep(t('status_steps.extracting_sequence'));
         const effectiveCount = configOverride.timelineCount || timelineItemCount;
         const effectiveTopic = effCustomInstructions || timelineTopic || sourceTopic || "General Sequence";
         const effectiveMode = configOverride.timelineMode || timelineMode || 'auto';
         const isAutoMode = effectiveMode === 'auto';
         const modeDef = !isAutoMode ? TIMELINE_MODE_DEFINITIONS[effectiveMode] : null;
         const modeListForAuto = Object.entries(TIMELINE_MODE_DEFINITIONS)
             .map(([k, def]) => `  - "${k}": ${def.label} — ${def.description}. e.g., ${def.examples}`)
             .join('\n');
         const modeSection = isAutoMode ? `
             *** MODE SELECTION (AUTO-DETECT) ***
             Examine the source text AND the teacher's content hint below, then pick the single best ordering mode from this list:
${modeListForAuto}
             Teacher's content hint: "${effectiveTopic}" (may explicitly suggest a mode; if so, prefer that)
             Return your pick as "detectedMode": "<mode key>" in the JSON response.
             Use that mode's ordering criterion for the items.
         ` : `
             *** ORDERING MODE (LOCKED BY TEACHER) ***
             Mode: ${modeDef.label}
             Criterion: ${modeDef.description}
             Example positions: ${modeDef.examples}
             ${modeDef.guidance}
             The progressionLabel should follow the template: "${modeDef.labelTemplate}"
         `;
          const prompt = `
             You are a Sequence Validation Expert. Your task is to extract or CREATE a SINGLE, UNAMBIGUOUS sequence from the provided text.
             Target Audience: ${gradeLevel} students.
             Language: ${effectiveLanguage}.
             Focus Topic / Content hint: "${effectiveTopic}"
             ${modeSection}
             *** FUNDAMENTAL REQUIREMENT ***
             There must be EXACTLY ONE CORRECT ORDER for the items you generate. A student must be able to determine the correct order purely from the item descriptions without guessing.
             *** VALIDATION RULES (You MUST verify each) ***
             Rule 1: BINARY COMPARABILITY - For any two items A and B, it must be objectively determinable which comes "before" or "after" on the axis.
             Rule 2: NO TIES - No two items can reasonably occupy the same position.
             Rule 3: NO AMBIGUOUS WORDING - Avoid vague terms. Use specifics: "1776" not "Colonial Era", "Cell" not "Small Structure".
             Rule 4: SELF-CONTAINED ITEMS - Each item must make sense in isolation (no "Then...", "Next...", "It...").
             Rule 5: EXTRACTABLE FROM TEXT - Items must be derivable from the source text (or clearly inferred logical steps).
             Rule 6: MINIMUM DISTINCTIVENESS - Each item must differ enough that its position is unambiguous.
             *** ITEM COUNT RULE ***
             Generate ONLY as many items as the text can clearly support with UNAMBIGUOUS ordering.
             - Minimum: 4 items (fewer = too easy, not enough to form a meaningful sequence)
             - Maximum: 10 items (more = overwhelming for students)
             - Preferred: ${effectiveCount ? effectiveCount : '5-7'} items if the text supports it
             - CRITICAL: Do NOT pad with items that have ambiguous positions just to reach a count.
             *** PRE-GENERATION CHECKLIST (Internal - do not output) ***
             Before generating, mentally verify:
             [ ] Can I state the SINGLE ordering criterion in one clear phrase?
             [ ] For every pair of items, can I definitively say which is "earlier/smaller/lower" on this axis?
             [ ] If I shuffled these items, would an informed student find exactly ONE correct arrangement?
             [ ] Are all items self-contained with no pronouns or relative words?
             ${effectiveLanguage !== 'English' ? 'Provide English translations for all labels and descriptions.' : ''}
             ${dialectInstruction}
             Return ONLY a JSON object with this structure:
             {
                 ${isAutoMode ? '"detectedMode": "<one of: chronological, procedural, lifecycle, size, hierarchy, cause-effect, intensity, narrative>",' : ''}
                 "progressionLabel": "AXIS: [Criterion Name] ([Low End] → [High End])",
                 ${effectiveLanguage !== 'English' ? '"progressionLabel_en": "English translation of the label",' : ''}
                 "items": [
                     {
                         "date": "Specific Position (e.g., '1776', 'Step 1', '10 cm')",
                         ${effectiveLanguage !== 'English' ? '"date_en": "...",' : ''}
                         "event": "Complete, standalone description of this item",
                         ${effectiveLanguage !== 'English' ? '"event_en": "..."' : ''}
                     }
                 ]
             }
             EXAMPLE progressionLabel formats:
             - "Timeline: Earliest (1492) → Latest (1776)"
             - "Size Scale: Smallest (Atom) → Largest (Universe)"
             - "Process Steps: First (Observe) → Last (Conclude)"
             ${differentiationContext}
             Text: "${textToProcess}"
          `;
         const result = await callGemini(prompt, true);
         const parseTimelineResponse = (raw) => {
             const parsed = JSON.parse(cleanJson(raw));
             let itemsArray = [];
             let progressionLabel = t('timeline.progression_label_default') || 'Sequential Order';
             let progressionLabel_en = null;
             let detectedMode = null;
             if (parsed && !Array.isArray(parsed) && parsed.items) {
                 itemsArray = parsed.items;
                 if (parsed.progressionLabel) progressionLabel = parsed.progressionLabel;
                 if (parsed.progressionLabel_en) progressionLabel_en = parsed.progressionLabel_en;
                 if (parsed.detectedMode && TIMELINE_MODE_DEFINITIONS[parsed.detectedMode]) {
                     detectedMode = parsed.detectedMode;
                 }
             }
             else if (Array.isArray(parsed)) {
                 itemsArray = parsed;
             }
             else if (parsed) {
                 if (parsed.events) itemsArray = parsed.events;
                 else if (parsed.sequence) itemsArray = parsed.sequence;
                 else itemsArray = [];
             }
             const finalMode = isAutoMode ? (detectedMode || 'chronological') : effectiveMode;
             return {
                 progressionLabel,
                 progressionLabel_en,
                 items: itemsArray,
                 mode: finalMode,
                 autoDetected: isAutoMode
             };
         };
         try {
             content = parseTimelineResponse(result);
             metaInfo = t('meta.events_count', { count: content.items.length });
         } catch (parseErr) {
             warnLog("Timeline Parse Error (attempt 1):", parseErr);
             try {
                 const retryPrompt = `The previous response was not valid JSON. Return ONLY a valid JSON object matching this exact structure, with no prose, no markdown fences, and no trailing commas:\n{\n    "progressionLabel": "AXIS: ...",\n    "items": [ { "date": "...", "event": "..." } ]\n}\nPrevious response to repair:\n${result}`;
                 const retryResult = await callGemini(retryPrompt, true);
                 content = parseTimelineResponse(retryResult);
                 metaInfo = t('meta.events_count', { count: content.items.length });
             } catch (retryErr) {
                 warnLog("Timeline Parse Error (attempt 2):", retryErr);
                 throw new Error("Failed to parse Timeline JSON. The AI response was not valid.");
             }
         }
         try {
             const validation = validateSequenceStructure(content, content.mode || effectiveMode);
             if (!validation.ok) {
                 content.validationIssues = validation.issues;
                 warnLog('[Timeline] Structural validation issues:', validation.issues);
             }
         } catch (vErr) {
             warnLog('[Timeline] Validator threw:', vErr);
         }
         if (includeTimelineVisuals && content.items && content.items.length > 0) {
             setGenerationStep(t('timeline.visuals.generating') || 'Generating sequence visuals...');
             addToast(t('timeline.visuals.generating') || 'Generating sequence visuals...', 'info');
             let failCount = 0;
             const POOL_SIZE = 5;
             const MAX_RETRIES = 3;
             const progression = content.progressionLabel || 'sequential order';
             const generateOne = async (item) => {
                 const styleInstruction = timelineImageStyle.trim() ? `Style: ${timelineImageStyle}.` : 'Educational style.';
                 const imgPrompt = `Simple vector icon/illustration of: "${item.event}" (sequence position: "${item.date || ''}"). Context: part of a sequence ordered by ${progression}. White background. ${styleInstruction} No text. Visual only.`;
                 for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
                     try {
                         if (attempt > 0) await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
                         let imageUrl = await callImagen(imgPrompt);
                         if (autoRemoveWords && imageUrl) {
                             try {
                                 const rawBase64 = imageUrl.split(',')[1];
                                 const editPrompt = "Remove all text, labels, letters, and words from the image. Keep the illustration clean.";
                                 imageUrl = await callGeminiImageEdit(editPrompt, rawBase64);
                             } catch (editErr) {
                                 warnLog("Timeline batch auto-remove text failed for:", item.event, editErr);
                             }
                         }
                         return { ...item, image: imageUrl };
                     } catch (e) {
                         if (attempt === MAX_RETRIES - 1) { failCount++; warnLog('Timeline image gen failed', e); return item; }
                     }
                 }
                 return item;
             };
             const output = new Array(content.items.length);
             for (let i = 0; i < content.items.length; i += POOL_SIZE) {
                 const batch = content.items.slice(i, i + POOL_SIZE);
                 const results = await Promise.all(batch.map(generateOne));
                 results.forEach((r, j) => { output[i + j] = r; });
             }
             content.items = output;
             if (failCount > 0) {
                 const msg = t('timeline.visuals.failed', { failed: failCount, total: content.items.length });
                 addToast((msg && msg !== 'timeline.visuals.failed') ? msg : `${failCount} of ${content.items.length} visuals couldn't be generated. Cards will show text only.`, 'warning');
             }
         }
      } else if (type === 'math') {
          setGenerationStep(t('status_steps.solving_visualizing'));
          const problemToSolve = configOverride.mathInput || mathInput || sourceTopic || "Create a relevant word problem based on the text";
          const mode = configOverride.mathMode || mathMode || 'Problem Set Generator';
          const subject = configOverride.mathSubject || mathSubject || 'General Math';
          const mathContextPrompt = `Source Context: "${textToProcess.substring(0, 1500)}..."\nGrade Level: ${gradeLevel}\nInterests: ${studentInterests.join(', ')}`;
          let prompt = "";
          if (mode === 'Problem Set Generator') {
              prompt = `
                You are an expert Math Curriculum Designer.
                ${leveledTextLanguage && leveledTextLanguage !== 'English' ? 'IMPORTANT: Generate ALL text content (questions, explanations, steps, real-world applications) in ' + leveledTextLanguage + '. After each text field, include an English translation in parentheses. Keep mathematical expressions and JSON keys in English.' : ''}
                Topic/Skill: "${problemToSolve}"
                ${mathContextPrompt}
                Instruction: Create EXACTLY the number and types of problems described in the Topic/Skill above. Match the count, types, and difficulty the user specified. If no specific count is given, create 5 problems.
                Context Usage: Frame the word problems using characters, settings, or themes from the Source Context.
                Output Format:
                Return a JSON object with a "problems" array.
                Return ONLY JSON in the following format:
                {
                  "title": "Problem Set: ${problemToSolve.substring(0, 30)}...",
                  "problems": [
                    {
                      "question": "Problem 1 text...",
                      "answer": "Answer 1",
                      "steps": [{ "explanation": "...", "latex": "..." }],
                      "realWorld": "1-2 sentence real-life connection — name a specific career or everyday situation where this skill is used. Do NOT restate the problem as a word problem.",
                    }
                  ],
                  "graphData": null
                }
              `;
          } else {
              prompt = `
                You are an Expert Math & Science Tutor.
                ${leveledTextLanguage && leveledTextLanguage !== 'English' ? 'IMPORTANT: Generate ALL text content (explanations, steps, real-world applications) in ' + leveledTextLanguage + '. After each text field, include an English translation in parentheses. Keep mathematical expressions and JSON keys in English.' : ''}
                Subject: ${subject}
                Mode: ${mode}
                Problem: "${problemToSolve}"
                Context: ${mathContextPrompt}
                Instructions: Solve the problem or explain the concept.
                ${isMathGraphEnabled ? 'VISUALS REQUIRED: Generate a self-contained SVG graph or diagram in the "graphData" field.' : ''}
                Return ONLY JSON:
                {
                  "problem": "Clean Latex string of the input",
                  "answer": "Final Answer string",
                  "steps": [{ "explanation": "Step explanation", "latex": "Step math in Latex" }],
                  "graphData": "SVG string or null",
                  "realWorld": "Connection string explanation"
                }
              `;
          }
          const result = await callGemini(prompt, true);
          let rawContent;
          let cleaned;
          try {
              cleaned = cleanJson(result);
              rawContent = safeJsonParse(result);
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
              if (!rawContent) throw new Error("Failed to parse Math JSON after all strategies.");
          } catch (parseErr) {
               warnLog("Math Parse Error:", parseErr);
               throw new Error("Failed to parse Math JSON.");
          }
          let normalizedContent = {
              title: rawContent.title || 'Math & STEM Solver',
              problems: [],
              graphData: rawContent.graphData || null
          };
          const normalizeSteps = (steps) => {
              if (!Array.isArray(steps)) return [];
              return steps.map(s => (typeof s === 'string' ? { explanation: s, latex: '' } : s));
          };
          if (Array.isArray(rawContent.problems)) {
              normalizedContent.problems = rawContent.problems.map(p => ({ ...p, steps: normalizeSteps(p.steps) }));
          } else {
              normalizedContent.problems = [{
                  question: rawContent.problem || problemToSolve,
                  answer: rawContent.answer,
                  steps: normalizeSteps(rawContent.steps),
                  realWorld: rawContent.realWorld
              }];
          }
          content = normalizedContent;
          metaInfo = `${subject} - ${mode}`;
      } else if (type === 'gemini-bridge') {
         setGenerationStep(t('status_steps.engineering_prompts', { count: bridgeStepCount }));
         const context = getLessonContext();
         const stackMap = {
            'react': 'Interactive Web App (React)',
            'python': 'Data Visualization (Python)',
            'physics': 'Physics Simulation (p5.js)',
            'chatbot': 'AI Character Chatbot (HTML/JS)',
         };
         const techStack = stackMap[bridgeSimType] || bridgeSimType;
         const prompt = `
            You are an Expert Prompt Engineer specializing in Generative AI Coding tools (Gemini Canvas).
            Goal: Create a sequential, iterative guide (Chain of Thought) that a user can copy/paste one by one to build a robust educational application.
            Target Tech Stack: ${techStack}
            Target Grade Level: ${gradeLevel}
            Language: ${effectiveLanguage}
            Step Count: Exactly ${bridgeStepCount} steps.
            Lesson Context:
            ${context}
            Strategy:
            Break the development process down into ${bridgeStepCount} logical prompts.
            - Step 1: Setup basic file structure, "Hello World", and core UI layout.
            - Middle Steps: Implement specific logic, interactivity, and educational content based on the Context.
            - Final Step: Polish, CSS styling (Tailwind), and error handling.
            Format:
            Return ONLY a JSON array of strings. Each string is the specific prompt the user should paste into Gemini.
            Example: ["Create a single file React app that...", "Now add a state variable for...", "Finally, style the component using..."]
         `;
         const result = await callGemini(prompt, true);
         try {
             content = JSON.parse(cleanJson(result));
             if (!Array.isArray(content)) content = [result];
         } catch (e) {
             content = [result];
         }
         metaInfo = t('meta.bridge_info', { type: bridgeSimType, count: bridgeStepCount });
      } else if (type === 'concept-sort') {
         setGenerationStep(t('status_steps.categorizing_concepts'));
         const isLowerGrade = ['Kindergarten', '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade'].includes(gradeLevel);
         const isAutoCount = !conceptItemCount || conceptItemCount === '';
         const itemCountInstruction = isAutoCount
            ? `2. Generate items (cards) for students to sort into these categories. *** ITEM COUNT RULE *** Generate ONLY as many items as the source text can clearly support — items must be unambiguous, distinctive, and sortable into exactly ONE of the categories. Minimum 6 items. Maximum 30 items. Preferred: 12-18 items if the text supports it (richer texts can support more). Do NOT pad with weak or ambiguous items just to reach a count.`
            : `2. Generate exactly ${conceptItemCount} items (cards) that students must sort into these categories.`;
         let categoryInstruction = "1. Identify 2 or 3 contrasting categories, concepts, or themes central to the text (e.g., \"Renewable vs Non-Renewable\", \"Federalist vs Anti-Federalist\", \"Input vs Output\").";
         if (selectedConcepts.length > 0) {
             categoryInstruction = `1. Use these specific categories: ${selectedConcepts.join(', ')}. Ensure items fit clearly into exactly one of these categories.`;
         }
         const prompt = `
            Analyze the provided source text to create a "Concept Sort" activity.
            Target Audience: ${gradeLevel} students.
            Language: ${effectiveLanguage}.
            Task:
            ${categoryInstruction}
            ${itemCountInstruction}
            Differentiation Strategy for ${gradeLevel}:
            ${isLowerGrade
                ? '- LOWER LEVEL: Focus on concrete, tangible examples. The content of the cards should be short (1-5 words) to act as captions for visual support.'
                : '- UPPER LEVEL: Focus on abstract concepts, nuances, or specific quotes. Use complex sentences or scenarios.'
            }
            ${effCustomInstructions ? `Custom Focus: ${effCustomInstructions}` : ''}
            ${effectiveLanguage !== 'English' ? 'Ensure all categories and items are in the target language.' : ''}
            ${dialectInstruction}
            Return ONLY JSON with this structure:
            {
                "categories": [
                    { "id": "c1", "label": "Category 1 Name", "color": "bg-indigo-500" },
                    { "id": "c2", "label": "Category 2 Name", "color": "bg-pink-500" }
                ],
                "items": [
                    { "id": "i1", "content": "Card Text", "categoryId": "c1" },
                    { "id": "i2", "content": "Card Text", "categoryId": "c2" }
                ]
            }
            Text: "${textToProcess.substring(0, 10000)}"
         `;
         const result = await callGemini(prompt, true);
         try {
             content = JSON.parse(cleanJson(result));
             if (!content.categories) content.categories = [];
             if (!content.items) content.items = [];
             const wordCount = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length;
             const itemsAreShort = content.items.length > 0 && content.items.every(it => wordCount(it.content) <= 6);
             const shouldGenerateImages =
                 conceptImageMode === 'always' ||
                 (conceptImageMode === 'auto' && itemsAreShort);
             if (shouldGenerateImages && content.items.length > 0) {
                 setGenerationStep('Generating card visuals...');
                 addToast(t('toasts.generating_card_visuals'), "info");
                 // POOL_SIZE was 5, dropped to 2 to reduce concurrent rate-limit
                 // triggers on Imagen. callImagen has its own 3-retry exponential
                 // backoff (1s/2s/4s, see AlloFlowANTI.txt:13021), but when 5
                 // requests fire at once and the first hits a 429, the others
                 // are already in flight and exhaust their retries within ~7s.
                 // Smaller pool + a final-pass sweep recovers more cards.
                 const POOL_SIZE = 2;
                 const generateOne = async (item) => {
                     try {
                         const styleInstruction = conceptSortImageStyle.trim() ? `Style: ${conceptSortImageStyle}.` : 'Educational style.';
                         const imgPrompt = `Simple, clear vector icon or illustration of: "${item.content}". White background. ${styleInstruction} No text.`;
                         const imageUrl = await callImagen(imgPrompt);
                         return { ...item, image: imageUrl };
                     } catch (e) {
                         warnLog("Card image gen failed", e);
                         return item;
                     }
                 };
                 const output = new Array(content.items.length);
                 for (let i = 0; i < content.items.length; i += POOL_SIZE) {
                     const batch = content.items.slice(i, i + POOL_SIZE);
                     const results = await Promise.all(batch.map(generateOne));
                     results.forEach((r, j) => { output[i + j] = r; });
                 }
                 // Final-pass retry sweep: any items still without images get a
                 // second chance with serialized calls + 750ms gap. Catches
                 // stragglers that hit transient rate limits during the burst.
                 // Doesn't retry items that came back without images for safety
                 // reasons (those would fail again the same way).
                 const stillMissingIdx = output
                     .map((it, idx) => (!it || !it.image) ? idx : -1)
                     .filter(idx => idx >= 0);
                 if (stillMissingIdx.length > 0) {
                     setGenerationStep(`Retrying ${stillMissingIdx.length} card visual${stillMissingIdx.length === 1 ? '' : 's'}...`);
                     for (const idx of stillMissingIdx) {
                         const item = output[idx];
                         if (!item) continue;
                         const refreshed = await generateOne(item);
                         if (refreshed && refreshed.image) {
                             output[idx] = refreshed;
                         }
                         // 750ms gap so the rate-limit window has time to clear
                         // between retries. Total worst case: N × (callImagen
                         // retries up to ~7s + 750ms gap) = ~8s per missing card.
                         // For typical 8-card decks with 2-3 stragglers, ~16-24s.
                         await new Promise(r => setTimeout(r, 750));
                     }
                 }
                 // Recount AFTER the sweep so the warning toast reflects what
                 // actually shipped, not the first-pass failures.
                 const finalFailCount = output.filter(it => !it || !it.image).length;
                 content.items = output;
                 if (finalFailCount > 0) {
                     const msg = t('concept_sort.visuals_failed', { failed: finalFailCount, total: content.items.length });
                     addToast(
                         (msg && msg !== 'concept_sort.visuals_failed') ? msg : `${finalFailCount} of ${content.items.length} card visuals couldn't be generated after retries. Cards will show text only — you can regenerate or upload images in edit mode.`,
                         "warning"
                     );
                 }
             }
             const catCount = content.categories.length;
             metaInfo = shouldGenerateImages
                ? t('meta.categories_visual', { count: catCount })
                : t('meta.categories_text', { count: catCount });
         } catch (parseErr) {
             warnLog("Concept Sort Parse Error:", parseErr);
             throw new Error("Failed to parse Concept Sort JSON. The AI response was not valid.");
         }
      } else if (type === 'dbq') {
         console.log('[DBQ] Branch entered. gradeLevel=' + gradeLevel + ', textToProcess length=' + (textToProcess?.length || 0) + ', effectiveLanguage=' + effectiveLanguage);
         setGenerationStep('Creating Document-Based Questions...');
         const isElementary = /k|1st|2nd|3rd|4th|5th/i.test(gradeLevel);
         const isMiddle = /6th|7th|8th/i.test(gradeLevel);
         const _dbqMode = window._dbqMode || 'standard';
         const _dbqFocusTopic = document.getElementById('dbq-focus-topic')?.value || '';
         const _dbqCustomDocs = document.getElementById('dbq-custom-docs')?.value || '';
         const _dbqCustomEssayFocus = document.getElementById('dbq-custom-essay-focus')?.value || '';
         const _dbqTeacherLinks = document.getElementById('dbq-teacher-links')?.value || '';
         console.log('[DBQ] Mode=' + _dbqMode + ', focusTopic=' + _dbqFocusTopic.substring(0, 60) + ', hasCustomDocs=' + !!_dbqCustomDocs + ', hasTeacherLinks=' + !!_dbqTeacherLinks);
         let _dbqSearchResults = '';
         if ((_dbqMode === 'search' || _dbqMode === 'links') && (window._webSearch || window._aiBackend?.webSearch)) {
           try {
             setGenerationStep('Searching for primary sources...');
             const searcher = window._webSearch || window._aiBackend?.webSearch;
             const topic = _dbqFocusTopic || textToProcess.substring(0, 200);
             let allResults = [];
             if (_dbqMode === 'links' && _dbqTeacherLinks.trim()) {
               const urls = _dbqTeacherLinks.trim().split('\n').filter(u => u.trim().startsWith('http'));
               for (const url of urls.slice(0, 6)) {
                 try {
                   const domain = new URL(url.trim()).hostname;
                   const siteResults = await searcher.search(`site:${domain} ${topic}`, 1);
                   allResults.push({ url: url.trim(), title: siteResults[0]?.title || domain, snippet: siteResults[0]?.snippet || 'Teacher-provided source' });
                 } catch(e) { allResults.push({ url: url.trim(), title: url.trim().split('/').pop(), snippet: 'Teacher-provided document' }); }
               }
             } else {
               const [archiveResults, generalResults] = await Promise.all([
                 searcher.search(`${topic} primary source document site:loc.gov OR site:archives.gov OR site:avalon.law.yale.edu OR site:founders.archives.gov`, 5).catch(() => []),
                 searcher.search(`${topic} primary source historical document`, 5).catch(() => [])
               ]);
               const seen = new Set();
               [...archiveResults, ...generalResults].forEach(r => {
                 if (r.url && !seen.has(r.url)) { seen.add(r.url); allResults.push(r); }
               });
             }
             if (allResults.length > 0) {
               _dbqSearchResults = '\n\nREAL WEB SOURCES FOUND (use these URLs and information to build document excerpts):\n' +
                 allResults.slice(0, 8).map((r, i) => `${i + 1}. "${r.title}" — ${r.url}\n   Preview: ${r.snippet || 'No preview available'}`).join('\n') +
                 '\n\nINSTRUCTIONS FOR WEB SOURCES:\n- Use the actual URLs above in the "sourceUrl" field for each document\n- Use the title and snippet as the basis for the document excerpt, then EXPAND it to a substantial passage\n- Set documentType to "linked" for documents from web sources\n- Students will be able to click through to read the full original source\n';
             }
           } catch(searchErr) { console.warn('[DBQ] Web search failed:', searchErr?.message); }
         }
         const _dbqModeInstructions = _dbqMode === 'perspectives'
           ? `\n\nSPECIAL MODE — COMPETING PERSPECTIVES:\nYou MUST structure this DBQ around two or more clearly opposing viewpoints or interpretations.${_dbqFocusTopic ? ' Focus on: ' + _dbqFocusTopic + '.' : ''}\n- At least 2 documents should represent each major perspective\n- Label each document's perspective in a "perspective" field (e.g., "Federalist", "Anti-Federalist", "Pro-expansion", "Indigenous resistance")\n- The corroborationClaims MUST include at least one claim where documents directly contradict each other\n- The synthesis essay prompt MUST require students to evaluate BOTH perspectives and take a position\n- Include a "perspectives" array in the JSON root: [{"label": "Perspective A Name", "description": "Brief description", "docIds": ["A","C"]}, {"label": "Perspective B Name", "description": "Brief description", "docIds": ["B","D"]}]\n`
           : (_dbqMode === 'search' || _dbqMode === 'links')
           ? `\n\nSPECIAL MODE — WEB-ENHANCED SOURCES WITH REAL LINKS:\n${_dbqFocusTopic ? 'Topic focus: ' + _dbqFocusTopic + '.\n' : ''}Use the real web sources provided below to build document excerpts. Each document MUST include a "sourceUrl" field linking to the original source.\n- For each web source, create a substantial excerpt based on the title and snippet, expanded with historically accurate content\n- Include a mix of document types: speeches, letters, newspaper editorials, government records, testimony, data/statistics\n- Set "documentType" to "linked" for documents sourced from web search\n- Also include 1-2 documents extracted from the provided source text (documentType: "primary" or "secondary")\n- Aim for ${isElementary ? '3-4' : '5-6'} total documents\n- Each document's "sourceUrl" field MUST contain the actual URL from the web search results${_dbqSearchResults}\n`
           : _dbqMode === 'custom' && _dbqCustomDocs.trim()
           ? `\n\nSPECIAL MODE — TEACHER-PROVIDED DOCUMENTS:\nThe teacher has provided specific documents below. You MUST use EXACTLY these documents as the document excerpts. Do NOT generate, modify, or replace them. Your job is to:\n- Preserve each document's exact text as the "excerpt"\n- Parse any "Title:" and "Source:" lines the teacher provided for each document\n- If a line starts with http, use it as the "sourceUrl" for that document\n- Add appropriate "documentType" classification (primary, secondary, data, visual, testimony, linked)\n- Generate HAPP prompts, sourcing questions, analysis questions, and sentence starters for each document\n- Create corroboration claims that connect across the teacher's documents\n- Write a synthesis essay prompt${_dbqCustomEssayFocus ? ' focused on: ' + _dbqCustomEssayFocus : ''}\n- Build the rubric appropriate to the grade level\n\nTEACHER-PROVIDED DOCUMENTS (separated by ---):\n"""\n${_dbqCustomDocs}\n"""\n`
           : '';
         const dbqPrompt = `You are an expert social studies and ELA curriculum designer creating a Document-Based Question (DBQ) activity.

Target Audience: ${gradeLevel} students.
Language: ${effectiveLanguage}.${_dbqModeInstructions}
${effCustomInstructions ? `Teacher Instructions: ${effCustomInstructions}` : ''}

Source Material (use ALL of this to create rich, substantial document excerpts):
"""
${textToProcess.substring(0, isElementary ? 6000 : isMiddle ? 10000 : 15000)}
"""

Create a complete DBQ activity packet with these components:

1. HISTORICAL CONTEXT: A brief (2-3 sentence) introduction that sets the stage for students.${isElementary ? ' Use simple, engaging language.' : ''}

2. DOCUMENTS: Extract or create ${isElementary ? '3' : isMiddle ? '4' : '5-6'} document excerpts from the source material. Each document MUST be:
   - A SUBSTANTIAL passage — ${isElementary ? 'at least 50-100 words each. Students need enough text to practice reading and finding evidence.' : isMiddle ? 'at least 100-200 words each. Include enough detail for students to analyze author perspective and identify key evidence.' : 'at least 200-400 words each. AP/high school documents must be long enough for deep textual analysis, sourcing, and corroboration.'}
   - A distinct passage, quote, data point, or perspective from the text
   - Labeled (Document A, Document B, etc.)
   - Accompanied by a source citation (author, date, context)
   - Adapted to ${gradeLevel} reading level — ${isElementary ? 'use simple vocabulary and short sentences' : isMiddle ? 'use grade-appropriate vocabulary with context clues for harder terms' : 'maintain original complexity and academic vocabulary'}
   - Include a "documentType" field: one of "primary", "secondary", "data", "visual", "testimony"
   - IMPORTANT: Do NOT truncate or over-summarize. Real DBQ documents are meaty — give students something substantial to work with.

3. HAPP SOURCING FRAMEWORK: For each document, provide structured HAPP (Historical context, Audience, Purpose, Point of view) scaffolding:
   - "happPrompts": An object with guiding questions for each HAPP dimension
${isElementary ? '   - Use simple sentence starters like "This was written by..." and "The author wanted to..."' : isMiddle ? '   - Use guided questions like "Who wrote this and when?" and "What was the author trying to do?"' : '   - Use open-ended analytical questions appropriate for AP-level critical thinking'}

4. SOURCING QUESTIONS: For each document, provide ${isElementary ? '1' : '2'} sourcing questions.
${isElementary ? '   - Use sentence starters: "I think the author wrote this because..."' : ''}

5. ANALYSIS QUESTIONS: For each document, provide ${isElementary ? '1' : '2'} analysis questions.
${isElementary ? '   - Use sentence starters: "The main idea is..." and "I know this because..."' : ''}

6. CORROBORATION CLAIMS: Identify 2-3 key claims or themes that appear across multiple documents. For each claim, note which document IDs support or challenge it.

7. SYNTHESIS ESSAY PROMPT: A culminating writing prompt that requires students to use evidence from multiple documents.
${isElementary ? '   Include a simple thesis sentence starter: "I think ___ because Document A shows ___ and Document B shows ___."' : isMiddle ? '   Include a thesis template: "Although [counterargument], [your position] because [reason 1] and [reason 2]."' : ''}

8. RUBRIC: A 4-point rubric (1-4) with criteria for: Thesis, Evidence Use, Analysis, Organization.
${isElementary ? '   - Rubric language should be simple and encouraging. A "4" for elementary means: states a clear opinion with a reason, mentions at least 2 documents, uses simple connecting words. A "1" means: no clear opinion stated.' : isMiddle ? '   - Rubric should reflect middle school expectations. A "4" means: clear thesis with counterargument acknowledgment, cites 3+ documents with specific evidence, explains WHY evidence matters. A "1" means: no thesis, no document references.' : '   - Rubric should reflect AP/high school rigor. A "4" means: nuanced thesis addressing complexity, integrates evidence from most documents with analysis of perspective/bias, demonstrates historical thinking skills (causation, continuity, contextualization). A "1" means: restatement without analysis.'}

${effectiveLanguage !== 'English' ? `All content must be in ${effectiveLanguage}.` : ''}

Return ONLY JSON:
{
  "title": "DBQ Title",
  "historicalContext": "Context paragraph",
  "documents": [
    {
      "id": "A",
      "title": "Document A: Title",
      "documentType": "primary",
      "source": "Author, Date, Context",
      "sourceUrl": "https://... (REQUIRED for linked documents, optional for others)",
      "excerpt": "The document text...",
      "happPrompts": {
        "historical": "What was happening when this was created?",
        "audience": "Who was this written for?",
        "purpose": "Why was this created?",
        "pointOfView": "What perspective does the author have?"
      },
      "sourcingQuestions": ["Question 1"],
      "analysisQuestions": ["Question 1"],
      "sentenceStarters": ${isElementary || isMiddle ? '["I think the author...", "This document shows..."]' : 'null'}
    }
  ],
  "corroborationClaims": [
    {
      "claim": "A key theme or argument",
      "supportingDocs": ["A", "C"],
      "challengingDocs": ["B"],
      "guideQuestion": "How do Documents A and C agree on this? How does Document B differ?"
    }
  ],
  "synthesisPrompt": "The essay question...",
  "thesisStarter": ${isElementary || isMiddle ? '"I believe that ___ because..."' : 'null'},
  "rubric": [
    {"criteria": "Thesis", "1": "description", "2": "description", "3": "description", "4": "description"},
    {"criteria": "Evidence Use", "1": "...", "2": "...", "3": "...", "4": "..."},
    {"criteria": "Analysis", "1": "...", "2": "...", "3": "...", "4": "..."},
    {"criteria": "Organization", "1": "...", "2": "...", "3": "...", "4": "..."}
  ],
  "teacherNotes": "Brief notes on scaffolding, differentiation, or extension ideas"
}`;
         console.log('[DBQ] About to call Gemini. Prompt length=' + dbqPrompt.length);
         const result = await callGemini(dbqPrompt, true);
         console.log('[DBQ] Gemini returned. Result length=' + (result?.length || 0) + '. Preview: ' + String(result || '').substring(0, 200));
         try {
             content = JSON.parse(cleanJson(result));
             if (!content.documents) content.documents = [];
             if (!content.rubric) content.rubric = [];
             metaInfo = `${content.documents?.length || 0} documents · ${content.rubric?.length || 0} rubric criteria`;
             console.log('[DBQ] Parsed successfully. ' + metaInfo);
         } catch (parseErr) {
             warnLog("DBQ Parse Error:", parseErr);
             console.error('[DBQ] JSON parse failed. Raw response (first 1000 chars):', String(result || '').substring(0, 1000));
             throw new Error("Failed to parse DBQ JSON. The AI response was not valid.");
         }
      } else if (type === 'lesson-plan') {
         setGenerationStep(isIndependentMode ? t('lesson_plan.status_creating_study') : (isParentMode ? t('lesson_plan.status_creating_family') : t('lesson_plan.status_synthesizing')));
         const historySource = configOverride.historyOverride || history;
         const context = getLessonContext(historySource);
         const assetManifest = configOverride.assetManifest || getAssetManifest(historySource);
         let prompt;
         if (isIndependentMode) {
             prompt = buildStudyGuidePrompt(context, effectiveLanguage);
         } else if (isParentMode) {
             prompt = buildParentGuidePrompt(context, effectiveLanguage);
         } else {
             prompt = buildLessonPlanPrompt(context, assetManifest, effectiveLanguage, effCustomInstructions);
         }
         const result = await callGemini(prompt, true);
         try {
             content = safeJsonParse(result);
             if (!content) {
                 const cleaned = cleanJson(result);
                 content = JSON.parse(cleaned);
             }
         } catch (parseErr) {
             warnLog("Lesson Plan Parse Error:", parseErr);
             throw new Error("Failed to parse Lesson Plan JSON. The AI response was not valid.");
         }
         if (!content) content = {};
         if (!content.objectives || !Array.isArray(content.objectives)) content.objectives = [];
         if (!content.extensions || !Array.isArray(content.extensions)) content.extensions = [];
         const stringFields = ['essentialQuestion', 'hook', 'directInstruction', 'guidedPractice', 'independentPractice', 'closure'];
         stringFields.forEach(field => {
             if (!content[field]) content[field] = "";
         });
         if (!content.extensions) content.extensions = [];
         if (!Array.isArray(content.extensions)) {
             if (content.extensions) {
                 content.extensions = [content.extensions];
             } else {
                 content.extensions = [];
             }
         }
         metaInfo = `${effectiveGrade} - ${isIndependentMode ? t('meta.study_guide') : (isParentMode ? t('meta.family_guide') : t('meta.udl_aligned'))}`;
      } else if (type === 'adventure') {
        setGenerationStep(t('status_steps.designing_adventure'));
        let langInstruction = "Language: English.";
        if (effectiveLanguage !== 'English') {
             langInstruction = `Language: ${effectiveLanguage}. Do NOT provide English translations for this JSON output.`;
        }
        const toneInstruction = isAdventureStoryMode
            ? "TONE: Story Time Mode (Family Friendly). Focus on exploration, mystery, and puzzles. Avoid combat."
            : "TONE: Standard Adventure. Balance exploration with risk and consequences.";
        const prompt = `
          You are a dungeon master running a "Choose Your Own Adventure" educational simulation.
          ${dnaPromptBlock}
          Source Material: "${textToProcess.substring(0, 3000)}",
          --- SETTINGS ---
          Target Audience: ${gradeLevel} students.
          ${langInstruction}
          ${toneInstruction}
          ${studentInterests.length > 0 ? `Theme/Interests: Integrate elements of "${studentInterests.join(', ')}" to engage the student.` : ''}
          ${effCustomInstructions ? `Custom Instructions: ${effCustomInstructions}` : ''}
          ${lessonDNA && lessonDNA.visualContext ? `VISUAL CONTINUITY: The student has just studied a diagram described as: "${lessonDNA.visualContext}". Ensure the opening scene description visually matches this setting.` : ''}
          Task: Create the OPENING SCENE of an interactive story that helps the student explore the concepts in the source text.
          - Put the student in a role related to the topic.
          - The story should be engaging but educational.
          - CRITICAL: Do NOT list the choices in the 'text' narrative. Only describe the situation. The choices will be displayed as buttons.
          - Provide exactly 4 distinct choices for what to do next.
          VOICE ACTING INSTRUCTIONS:
          Return a "voices" map where the key is the character name and value is one of: [Fenrir, Kore, Leda, Orus, Charon, Zephyr, Aoede].
          Return ONLY JSON:
          {
            "text": "The descriptive text of the opening scene...",
            "options": ["Choice 1", "Choice 2", "Choice 3", "Choice 4"],
            "inventoryUpdate": { "add": { "name": "Item Name", "type": "permanent" } } OR null,
            "voices": { "Character Name": "VoiceName" },
            "soundParams": {
                "atmosphere": "One of: Tense, Calm, Ethereal, Dark, Joyful",
                "element": "One of: Fire, Water, Wind, Machinery, Nature, Silence"
            }
          }
        `;
        const result = await callGemini(prompt, true);
        try {
            content = JSON.parse(cleanJson(result));
            if (!content) content = {};
            if (!content.text) content.text = t('adventure.fallback_opening');
            if (!content.options || !Array.isArray(content.options)) content.options = [];
            if (!content.voiceMap) content.voiceMap = {};
        } catch (e) {
            warnLog("Adventure Parse Error", e);
            if (alloBotRef.current) alloBotRef.current.speak(t('bot_events.feedback_error_apology'), 'confused');
            throw new Error("Failed to parse Adventure JSON.");
        }
        metaInfo = t('meta.opening_scene');
      } else if (type === 'persona') {
          setIsProcessing(true);
          setGenerationStep(t('status_steps.identifying_figures'));
          if (switchView || !generatedContent) {
              setActiveView('persona');
          }
          resetPersonaInterviewState();
          try {
              const prompt = `
                Analyze the following text about "${sourceTopic || "the current lesson topic"}".
                Source Text:
                "${textToProcess.substring(0, 3000)}...",
                Task: Identify 3 specific historical figures, experts, or fictional archetypes (e.g., 'A Union Soldier', 'Marie Curie', 'A Red Blood Cell') relevant to this content that a ${gradeLevel} student could interview to learn more.
                Return ONLY a JSON array of objects with this exact structure:
                [
                    {
                        "name": "Name",
                        "role": "Short Description",
                        "year": "Relevant Year or Era",
                        "context": "Why they are relevant",
                        "visualDescription": "A highly detailed physical description for an image generator (e.g., 'Oil painting of [Name], [details], neutral background').",
                        "greeting": "A short, engaging starting message from this character to the student.",
                    }
                ]
              `;
              const result = await callGemini(prompt, false, true);
              let textToParse = "";
              if (typeof result === 'object' && result !== null && result.text) {
                  textToParse = result.text;
              } else {
                  textToParse = String(result || "");
              }
              let parsedOptions = [];
              if (!textToParse.includes('[') && !textToParse.includes('{')) {
                   warnLog("Persona Gen: No JSON found in response.");
                   addToast(t('toasts.character_data_not_found'), "warning");
                   throw new Error("No JSON found");
              }
              try {
                  parsedOptions = JSON.parse(cleanJson(textToParse));
              } catch (e) {
                  warnLog("Standard parse failed. Attempting robust parse...");
                  parsedOptions = safeJsonParse(textToParse);
          }
          if (Array.isArray(parsedOptions) && parsedOptions.length > 0) {
               parsedOptions = parsedOptions.map(p => ({
                   name: p.name || "Unknown Figure",
                   role: p.role || "Historical Figure",
                   year: p.year || "Unknown Era",
                   context: p.context || "No details provided.",
                   visualDescription: p.visualDescription || "",
                   greeting: p.greeting || "Hello.",
                   quests: Array.isArray(p.quests) ? p.quests : [],
                   suggestedQuestions: Array.isArray(p.suggestedQuestions) ? p.suggestedQuestions : []
               }));
               setPersonaState(prev => ({ ...prev, options: parsedOptions }));
               content = parsedOptions;
               metaInfo = t('meta.interview_candidates');
              } else {
                   throw new Error("Invalid persona format received.");
              }
          } catch (err) {
              warnLog("Persona Generation Error:", err);
           if (alloBotRef.current) alloBotRef.current.speak(t('bot_events.feedback_error_apology'), 'confused');
              throw new Error("Failed to identify historical figures.");
          } finally {
              setIsGeneratingPersona(false);
          }
      }
      let itemTitle = getDefaultTitle(type);
      if (type === 'analysis') {
          const existingCount = history.filter(h => h.type === 'analysis').length;
          if (existingCount > 0) {
              itemTitle += ` (V${existingCount + 1})`;
          }
      }
      if (type === 'simplified') {
          itemTitle = `Leveled Text (${effectiveGrade})`;
      }
      const newItem = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          type,
          data: content,
          meta: metaInfo,
          title: itemTitle,
          timestamp: new Date(),
          config: {
              grade: effectiveGrade,
              language: effectiveLanguage,
              standards: standardsPromptString || "",
              interests: studentInterests,
              ...(configOverride.rosterGroupId ? {
                  rosterGroupId: configOverride.rosterGroupId,
                  rosterGroupName: configOverride.rosterGroupName,
                  rosterGroupColor: configOverride.rosterGroupColor
              } : {})
          }
      };
      setHistory(prev => [...prev, newItem]);
      if (switchView || !generatedContent) {
          setGeneratedContent({ type, data: content, id: newItem.id, config: newItem.config });
          setActiveView(type);
          setStickers([]);
      }
      const toastTitle = type === 'simplified' ? "Adapted Text" : getDefaultTitle(type);
      addToast(`${toastTitle} generated!`, "success");
      if (guidedMode) {
        const typeToGuidedId = { 'analysis': 'analysis', 'glossary': 'glossary', 'simplified': 'simplified', 'outline': 'outline', 'image': 'image', 'faq': 'faq', 'sentence-frames': 'sentence-frames', 'brainstorm': 'brainstorm', 'persona': 'persona', 'timeline': 'timeline', 'concept-sort': 'concept-sort', 'quiz': 'quiz', 'lesson-plan': 'lesson-plan', 'alignment-report': '_final' };
        const matchedId = typeToGuidedId[type];
        if (matchedId) {
          const stepIdx = GUIDED_STEPS.findIndex(s => s.id === matchedId);
          if (stepIdx >= 0) {
            setTimeout(() => {
              setGuidedStep(prev => {
                if (prev === stepIdx && prev < GUIDED_STEPS.length - 1) {
                  return prev + 1;
                }
                return prev; // don't advance if user already moved past this step
              });
            }, 1200);
            setTimeout(() => addToast(t('guided.history_hint'), 'info'), 2000);
          }
        }
      }
      if (switchView) {
          if (type === 'simplified') flyToElement('ui-tool-simplified');
          if (type === 'glossary') flyToElement('ui-tool-glossary');
          if (type === 'quiz') flyToElement('ui-tool-quiz');
          if (type === 'faq') flyToElement('tour-tool-faq');
          if (type === 'brainstorm') flyToElement('tour-tool-brainstorm');
          if (type === 'sentence-frames') flyToElement('tour-tool-scaffolds');
          if (type === 'timeline') flyToElement('tour-tool-timeline');
          if (type === 'concept-sort') flyToElement('tour-tool-concept-sort');
          if (type === 'dbq') flyToElement('tour-tool-dbq');
          if (type === 'alignment-report') flyToElement('tour-tool-alignment');
          if (type === 'gemini-bridge') flyToElement('tour-tool-brainstorm');
          if (type === 'outline') flyToElement('tour-tool-outline');
          if (type === 'image') flyToElement('tour-tool-visual');
          if (type === 'analysis') flyToElement('tour-tool-analysis');
      }
      return newItem;
    } catch (err) {
      if (!err.message?.includes("401")) {
          warnLog("Unhandled error:", err);
      }
      const errMsg = err.message?.includes("Blocked") ? "Content blocked by safety filters." :
                     err.message?.includes("Stopped") ? "Generation stopped by AI model." :
                     err.message?.includes("401") ? "Daily Usage Limit Reached. Please try again later." :
                     "Error generating content. Please try again.";
      setError(errMsg);
      addToast(errMsg, "error");
      if (isBotVisible && alloBotRef.current) {
          const actionName = type === 'analysis' ? 'analyzing the source' : 'generating content';
          alloBotRef.current.speak(`I ran into a problem ${actionName}: ${errMsg}.`);
      }
    } finally {
      if (!keepLoading) setIsProcessing(false);
      setProcessingProgress({ current: 0, total: 0 });
    }
};

window.AlloModules = window.AlloModules || {};
window.AlloModules.GenDispatcher = { handleGenerate };

window.AlloModules.GenDispatcherModule = true;
console.log('[GenDispatcher] handleGenerate registered');
})();
