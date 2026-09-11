/**
 * AlloFlow View - Simplified (Leveled Text) Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='simplified' block.
 * Source range: 1,650 lines body (largest single extraction in the project).
 * Renders: leveled text reader with immersive mode, focus/chunk/crawl/karaoke
 * overlays, side-by-side bilingual layout, define/phonics/revise/cloze/
 * add-glossary interaction modes, level check + rigor report panels,
 * complexity slider, teacher edit mode with formatting toolbar, definition/
 * phonics/revision popups, line focus, theme switcher, immersive toolbar.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.SimplifiedView) {
    console.log('[CDN] ViewSimplifiedModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewSimplifiedModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Inject Chunk Read mood keyframes once. Reduced-motion media query disables
// the animations globally so users with that preference see static styling.
(function () {
  if (typeof document === 'undefined') return;
  if (document.getElementById('allo-chunk-mood-css')) return;
  var st = document.createElement('style');
  st.id = 'allo-chunk-mood-css';
  st.textContent = '@keyframes allo-chunk-popin { 0% { transform: scale(0.95); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }' + '@keyframes allo-chunk-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); } }' + '@media (prefers-reduced-motion: reduce) {' + '  [data-sentence-idx] { animation: none !important; }' + '}';
  if (document.head) document.head.appendChild(st);
})();
// Authoritative dictionary panel (Wiktionary via dictionaryapi.dev, offline-cached)
// rendered beside the AI's leveled definition in the Define popup — triangulation.
// Pure fn of (entry, t); returns null when there's no entry (AI-only fallback).
function renderDictionaryPanel(dict, t) {
  if (!dict) return null;
  var kids = [];
  var sourceUrl = dict.sourceUrl || (dict.word ? 'https://en.wiktionary.org/wiki/' + encodeURIComponent(dict.word) : '');
  kids.push(React.createElement('div', {
    key: 'hd',
    className: 'flex items-center gap-2 mb-1 flex-wrap'
  }, React.createElement('span', {
    className: 'text-[10px] font-bold uppercase tracking-wide text-emerald-700'
  }, t('glossary.popups.dictionary') || 'Dictionary'), dict.phonetic ? React.createElement('span', {
    className: 'text-[11px] text-slate-500'
  }, dict.phonetic) : null, dict.audio ? React.createElement('button', {
    type: 'button',
    onClick: function () {
      try {
        new Audio(dict.audio).play().catch(function () {});
      } catch (_e) {}
    },
    className: 'inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded px-1.5 py-0.5 transition-colors',
    'aria-label': t('glossary.popups.hear_real') || 'Hear a real recording',
    title: t('glossary.popups.hear_real') || 'Hear a real recording'
  }, React.createElement(Volume2, {
    size: 11
  }), React.createElement('span', null, t('glossary.popups.real_audio') || 'Recording')) : null));
  (dict.meanings || []).slice(0, 2).forEach(function (m, mi) {
    var d0 = m.definitions && m.definitions[0] ? m.definitions[0].definition : '';
    if (!d0) return;
    var d0ex = m.definitions[0].example || '';
    kids.push(React.createElement('div', {
      key: 'm' + mi,
      className: 'text-xs text-slate-700 leading-snug mb-1'
    }, m.partOfSpeech ? React.createElement('span', {
      className: 'italic text-slate-500 mr-1'
    }, m.partOfSpeech) : null, d0, d0ex ? React.createElement('span', {
      className: 'block text-[11px] text-slate-500 italic mt-0.5'
    }, '"' + d0ex + '"') : null));
  });
  if (dict.synonyms && dict.synonyms.length) {
    kids.push(React.createElement('div', {
      key: 'syn',
      className: 'text-[11px] text-slate-500 mt-0.5'
    }, (t('glossary.popups.similar') || 'Similar') + ': ' + dict.synonyms.slice(0, 5).join(', ')));
  }
  kids.push(React.createElement('div', {
    key: 'src',
    className: 'text-[10px] text-slate-400 mt-1'
  }, sourceUrl ? React.createElement('a', {
    href: sourceUrl,
    target: '_blank',
    rel: 'noopener noreferrer',
    className: 'text-emerald-700 hover:text-emerald-800 underline decoration-emerald-300 underline-offset-2',
    'aria-label': t('common.more_information') + ': ' + (dict.word || '')
  }, t('common.resource') + ': ' + (dict.source || '')) : t('common.resource') + ': ' + (dict.source || '')));
  return React.createElement('div', {
    className: 'mt-3 pt-3 border-t border-emerald-100'
  }, kids);
}

// Lead with the accessible explanation students asked for, while clearly
// distinguishing it from the sourced dictionary entry that follows.
function renderReadingLevelExplanation(definitionData, t, renderFormattedText) {
  if (!definitionData || !definitionData.text) return null;
  return React.createElement('div', {
    className: 'rounded-lg bg-indigo-50/60 border border-indigo-100 px-3 py-2.5',
    'aria-label': t('glossary.popups.reading_level_explanation') || 'Reading-level explanation'
  }, React.createElement('div', {
    className: 'flex items-center gap-2 mb-1.5 flex-wrap'
  }, React.createElement('span', {
    className: 'text-[10px] font-bold uppercase tracking-wide text-indigo-700'
  }, t('glossary.popups.reading_level_explanation') || 'Reading-level explanation'), React.createElement('span', {
    className: 'text-[10px] font-semibold text-indigo-600 bg-white border border-indigo-200 rounded-full px-1.5 py-0.5'
  }, t('glossary.popups.ai_generated') || 'AI-generated')), React.createElement('div', {
    className: 'text-sm text-slate-700 leading-relaxed'
  }, renderFormattedText(definitionData.text, false)));
}

// Authoritative pronunciation row for the phonics popup: real Wiktionary recording
// + authoritative IPA, shown quietly beside the AI phonics. Pure fn; null when absent.
function renderPhonicsDictRow(phonicsData, t) {
  var d = phonicsData && phonicsData.dictionary;
  if (!d || !d.phonetic && !d.audio) return null;
  var row = [React.createElement('span', {
    key: 'lbl',
    className: 'text-[10px] font-bold text-emerald-700 uppercase tracking-wide'
  }, t('glossary.popups.dictionary') || 'Dictionary')];
  if (d.phonetic) row.push(React.createElement('span', {
    key: 'ipa',
    className: 'font-mono text-xs text-slate-600'
  }, d.phonetic));
  if (d.audio) row.push(React.createElement('button', {
    key: 'aud',
    type: 'button',
    onClick: function () {
      try {
        new Audio(d.audio).play().catch(function () {});
      } catch (_e) {}
    },
    className: 'inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-white hover:bg-emerald-50 border border-emerald-300 rounded px-1.5 py-0.5 transition-colors',
    'aria-label': t('glossary.popups.hear_real') || 'Hear a real recording',
    title: t('glossary.popups.hear_real') || 'Hear a real recording'
  }, React.createElement(Volume2, {
    size: 11
  }), React.createElement('span', null, t('glossary.popups.real_audio') || 'Recording')));
  return React.createElement('div', {
    className: 'flex items-center gap-2 flex-wrap px-1'
  }, row);
}
var _lazyIcon = function (name) {
  return function (props) {
    var I = window.AlloIcons && window.AlloIcons[name];
    return I ? /*#__PURE__*/React.createElement(I, props) : null;
  };
};
var Heart = _lazyIcon('Heart');
var CheckCircle = _lazyIcon('CheckCircle');
var Volume2 = _lazyIcon('Volume2');
var Mic = _lazyIcon('Mic');
var Search = _lazyIcon('Search');
var Ear = _lazyIcon('Ear');
var Plus = _lazyIcon('Plus');
var HelpCircle = _lazyIcon('HelpCircle');
var PenTool = _lazyIcon('PenTool');
var Gamepad2 = _lazyIcon('Gamepad2');
var Pencil = _lazyIcon('Pencil');
var GitCompare = _lazyIcon('GitCompare');
var BookOpen = _lazyIcon('BookOpen');
var Settings = _lazyIcon('Settings');
var ChevronLeft = _lazyIcon('ChevronLeft');
var ChevronRight = _lazyIcon('ChevronRight');
var Copy = _lazyIcon('Copy');
var RefreshCw = _lazyIcon('RefreshCw');
var ShieldCheck = _lazyIcon('ShieldCheck');
var Download = _lazyIcon('Download');
var CheckCircle2 = _lazyIcon('CheckCircle2');
var X = _lazyIcon('X');
var Bold = _lazyIcon('Bold');
var Italic = _lazyIcon('Italic');
var Highlighter = _lazyIcon('Highlighter');
var List = _lazyIcon('List');
var ListOrdered = _lazyIcon('ListOrdered');
var Trophy = _lazyIcon('Trophy');
var ImageIcon = _lazyIcon('ImageIcon');
var Sparkles = _lazyIcon('Sparkles');
var AlertCircle = _lazyIcon('AlertCircle');
var ArrowRight = _lazyIcon('ArrowRight');
var Play = _lazyIcon('Play');
var Pause = _lazyIcon('Pause');
var StopCircle = _lazyIcon('StopCircle');
var Trash2 = _lazyIcon('Trash2');
var ChevronDown = _lazyIcon('ChevronDown');
var ChevronUp = _lazyIcon('ChevronUp');
function simplifiedBodyHasCitationMarkers(body) {
  var inFence = false;
  return String(body || '').split(/\r?\n/).some(function (line) {
    if (/^[ \t]*(?:\x60{3}|~~~)/.test(line)) {
      inFence = !inFence;
      return false;
    }
    if (inFence) return false;
    var prose = line.replace(/\x60[^\x60\n]*\x60/g, '');
    return /\[\s*\u207d[\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079]+\u207e\s*\]\s*\(|\u207d[\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079]+\u207e|\[Source[ \t]+\d+\]/i.test(prose);
  });
}
function resolveSimplifiedReferences(adaptedBody, adaptedReferences, inputReferences, citationAudit) {
  var ownedReferences = String(adaptedReferences || '');
  if (ownedReferences) return ownedReferences;
  var auditAllowsFallback = !citationAudit || citationAudit.enabled === true && Number(citationAudit.sourceCitationCount || 0) > 0;
  if (!auditAllowsFallback || !simplifiedBodyHasCitationMarkers(adaptedBody)) return '';
  return String(inputReferences || '');
}

// Reading resources keep their renderer type ("simplified") separate from
// their instructional use.  These helpers intentionally live outside the
// component so role changes and comparison-source selection remain pure and
// can be regression tested without mounting the full reader.
function getInstructionalContextApi() {
  try {
    return window.AlloModules && window.AlloModules.InstructionalContext ? window.AlloModules.InstructionalContext : null;
  } catch (_) {
    return null;
  }
}
function fallbackInstructionalText(item) {
  var resource = item && typeof item === 'object' ? item : {};
  var config = resource.config && typeof resource.config === 'object' ? resource.config : {};
  var raw = resource.instructionalText || config.instructionalText || {};
  var rawComplexity = raw.complexity && typeof raw.complexity === 'object' ? raw.complexity : {};
  var rawAuthorization = raw.replacementAuthorization && typeof raw.replacementAuthorization === 'object' ? raw.replacementAuthorization : {};
  var role = ['primary', 'supplemental', 'unspecified'].indexOf(raw.role) >= 0 ? raw.role : 'unspecified';
  var form = ['original', 'same-text-supported', 'adapted'].indexOf(raw.form) >= 0 ? raw.form : resource.type === 'simplified' ? 'adapted' : 'original';
  var educatorAuthorized = rawAuthorization.authorized === true && rawAuthorization.source === 'educator';
  return {
    schemaVersion: 1,
    role: role,
    form: form,
    sourceArtifactId: raw.sourceArtifactId || null,
    primaryArtifactId: raw.primaryArtifactId || null,
    designationSource: ['educator', 'workflow-default', 'legacy-inferred'].indexOf(raw.designationSource) >= 0 ? raw.designationSource : 'legacy-inferred',
    replacementAuthorization: {
      authorized: educatorAuthorized,
      source: educatorAuthorized ? 'educator' : 'none'
    },
    complexity: {
      requestedGrade: rawComplexity.requestedGrade || resource.targetGradeLevel || config.grade || '',
      calibrationTarget: rawComplexity.calibrationTarget || '',
      measuredGrade: rawComplexity.measuredGrade !== undefined ? rawComplexity.measuredGrade : resource.localStats && resource.localStats.score !== undefined ? resource.localStats.score : null,
      method: rawComplexity.method || '',
      status: rawComplexity.status || 'unavailable',
      contentFingerprint: rawComplexity.contentFingerprint || '',
      measuredAt: rawComplexity.measuredAt || '',
      language: rawComplexity.language || config.language || 'English'
    }
  };
}
function getSimplifiedInstructionalText(item) {
  var api = getInstructionalContextApi();
  if (api && typeof api.getInstructionalText === 'function') {
    try {
      return api.getInstructionalText(item);
    } catch (_) {}
  }
  return fallbackInstructionalText(item);
}
function updateSimplifiedInstructionalRole(item, requestedRole) {
  var resource = item && typeof item === 'object' ? item : {};
  var role = ['primary', 'supplemental', 'unspecified'].indexOf(requestedRole) >= 0 ? requestedRole : 'unspecified';
  var current = getSimplifiedInstructionalText(resource);
  var nextProfile = Object.assign({}, current, {
    role: role,
    form: resource.type === 'simplified' ? 'adapted' : current.form,
    designationSource: 'educator',
    replacementAuthorization: role === 'primary' ? {
      authorized: true,
      source: 'educator'
    } : {
      authorized: false,
      source: 'none'
    }
  });
  var api = getInstructionalContextApi();
  if (api && typeof api.normalizeInstructionalText === 'function') {
    try {
      nextProfile = api.normalizeInstructionalText(nextProfile);
    } catch (_) {}
  }
  return Object.assign({}, resource, {
    instructionalText: nextProfile
  });
}
function artifactIdentityValues(item) {
  if (!item || typeof item !== 'object') return [];
  return [item.id, item.uiId, item.artifactId, item.resourceId].filter(function (value) {
    return value !== undefined && value !== null && String(value).trim();
  }).map(function (value) {
    return String(value);
  });
}
function artifactsMatch(left, right) {
  if (!left || !right) return false;
  var leftIds = artifactIdentityValues(left);
  var rightIds = artifactIdentityValues(right);
  if (leftIds.some(function (value) {
    return rightIds.indexOf(value) >= 0;
  })) return true;
  return left === right || !leftIds.length && !rightIds.length && left.type === right.type && left.data === right.data;
}
function findFullHistoryArtifact(history, item) {
  var safeHistory = Array.isArray(history) ? history : [];
  for (var index = safeHistory.length - 1; index >= 0; index -= 1) {
    if (artifactsMatch(safeHistory[index], item)) return safeHistory[index];
  }
  return item || {};
}
function upsertFullHistoryArtifact(history, previousItem, updatedItem) {
  var nextHistory = Array.isArray(history) ? history.slice() : [];
  for (var index = nextHistory.length - 1; index >= 0; index -= 1) {
    if (!artifactsMatch(nextHistory[index], previousItem)) continue;
    // Merge over the history record so a partially hydrated current view can
    // never erase provenance, config, or source-link fields.
    nextHistory[index] = Object.assign({}, nextHistory[index], updatedItem);
    return nextHistory;
  }
  nextHistory.push(updatedItem);
  return nextHistory;
}
function getArtifactReadingText(item) {
  if (!item || typeof item !== 'object') return '';
  var data = item.data;
  if (typeof data === 'string') return data;
  if (data && typeof data === 'object') {
    var dataText = data.originalText || data.rawEnglishText || data.sourceText || data.text || data.simplifiedText;
    if (dataText) return String(dataText);
  }
  return String(item.originalText || item.rawEnglishText || item.sourceText || '');
}
function resolveSimplifiedCompareSource(history, adaptedItem, fallbackText) {
  var safeHistory = Array.isArray(history) ? history : [];
  var profile = getSimplifiedInstructionalText(adaptedItem);
  var linkedIds = [profile.sourceArtifactId, profile.primaryArtifactId].filter(function (value, index, values) {
    return value !== undefined && value !== null && String(value).trim() && values.indexOf(value) === index;
  }).map(function (value) {
    return String(value);
  });
  for (var linkIndex = 0; linkIndex < linkedIds.length; linkIndex += 1) {
    for (var historyIndex = safeHistory.length - 1; historyIndex >= 0; historyIndex -= 1) {
      var candidate = safeHistory[historyIndex];
      if (artifactIdentityValues(candidate).indexOf(linkedIds[linkIndex]) < 0) continue;
      var linkedText = getArtifactReadingText(candidate);
      if (linkedText) return {
        text: linkedText,
        artifact: candidate,
        selection: 'linked-artifact'
      };
    }
  }
  for (var index = safeHistory.length - 1; index >= 0; index -= 1) {
    var analysis = safeHistory[index];
    if (!analysis || analysis.type !== 'analysis') continue;
    var analysisText = getArtifactReadingText(analysis);
    if (analysisText) return {
      text: analysisText,
      artifact: analysis,
      selection: 'latest-analysis-fallback'
    };
  }
  return {
    text: String(fallbackText || ''),
    artifact: null,
    selection: 'input-fallback'
  };
}
function getSimplifiedComplexityDisplay(item, ambientGrade) {
  var resource = item && typeof item === 'object' ? item : {};
  var resourceConfig = resource.config && typeof resource.config === 'object' ? resource.config : {};
  var hasCanonicalProfile = !!(resource.instructionalText || resource.textProfile || resourceConfig.instructionalText || resourceConfig.textProfile);
  var profile = getSimplifiedInstructionalText(resource);
  var complexity = profile.complexity && typeof profile.complexity === 'object' ? profile.complexity : {};
  var rawMeasured = complexity.measuredGrade;
  var hasMeasured = rawMeasured !== null && rawMeasured !== '' && rawMeasured !== undefined;
  var measured = hasMeasured ? Number(rawMeasured) : NaN;
  if (!hasCanonicalProfile && !Number.isFinite(measured) && resource.localStats && resource.localStats.score !== undefined) {
    rawMeasured = resource.localStats.score;
    measured = Number(rawMeasured);
  }
  var targetGrade = complexity.requestedGrade || resource.targetGradeLevel || resourceConfig.grade || ambientGrade || '';
  var api = getInstructionalContextApi();
  var currentFingerprint = '';
  if (api && typeof api.fingerprintText === 'function' && typeof resource.data === 'string') {
    try {
      currentFingerprint = api.fingerprintText(resource.data);
    } catch (_) {}
  }
  if (complexity.contentFingerprint && currentFingerprint && complexity.contentFingerprint !== currentFingerprint) {
    return {
      measuredGrade: null,
      targetGrade: targetGrade,
      status: 'stale',
      target: null
    };
  }
  if (!Number.isFinite(measured)) {
    return {
      measuredGrade: null,
      targetGrade: targetGrade,
      status: complexity.status || 'unavailable',
      target: null
    };
  }
  var languageIsEnglish = true;
  if (api && typeof api.isEnglishLanguage === 'function') {
    try {
      languageIsEnglish = api.isEnglishLanguage(complexity.language || 'English');
    } catch (_) {}
  }
  var status = !languageIsEnglish ? 'unavailable' : api && typeof api.complexityStatus === 'function' ? api.complexityStatus(measured, targetGrade) : ['below-target', 'within-target', 'above-target'].indexOf(complexity.status) >= 0 ? complexity.status : 'unavailable';
  var target = null;
  if (api && typeof api.getComplexityTarget === 'function') {
    try {
      target = api.getComplexityTarget(targetGrade);
    } catch (_) {}
  }
  return {
    measuredGrade: measured,
    targetGrade: targetGrade,
    status: status,
    target: target
  };
}
async function checkSimplifiedAlignment(deps) {
  var options = deps || {};
  var generatedContent = options.generatedContent;
  var gradeLevel = options.gradeLevel;
  var leveledTextLanguage = options.leveledTextLanguage;
  var activeResolvedStandardsContext = options.activeResolvedStandardsContext;
  var standardsInput = options.standardsInput;
  var targetStandards = options.targetStandards;
  var alloBotRef = options.alloBotRef;
  var t = options.t;
  var addToast = options.addToast;
  var setIsCheckingAlignment = options.setIsCheckingAlignment;
  var callGemini = options.callGemini;
  var cleanJson = options.cleanJson;
  var setGeneratedContent = options.setGeneratedContent;
  var setHistory = options.setHistory;
  var speak = options.speak;
  var warnLog = options.warnLog;
  var setError = options.setError;
  if (!generatedContent || generatedContent.type !== 'simplified') return;
  var contextModule = window.AlloModules && window.AlloModules.InstructionalContext;
  var alignmentContext = contextModule && typeof contextModule.resolveArtifactContext === 'function' ? contextModule.resolveArtifactContext(generatedContent, {
    grade: gradeLevel,
    language: leveledTextLanguage,
    standardsContext: activeResolvedStandardsContext,
    standards: standardsInput || targetStandards || null
  }) : {
    grade: generatedContent?.targetGradeLevel || generatedContent?.config?.grade || gradeLevel,
    standards: generatedContent?.config?.standardsContext || generatedContent?.config?.standards || activeResolvedStandardsContext || standardsInput || targetStandards || null
  };
  var alignmentGrade = alignmentContext.grade || gradeLevel;
  var alignmentStandardsValue = alignmentContext.standards;
  var alignmentStandardsText = function () {
    if (!alignmentStandardsValue) return '';
    if (typeof alignmentStandardsValue === 'string') return alignmentStandardsValue.trim();
    if (typeof alignmentStandardsValue.promptText === 'string' && alignmentStandardsValue.promptText.trim()) {
      return alignmentStandardsValue.promptText.trim();
    }
    var entries = Array.isArray(alignmentStandardsValue.standards) ? alignmentStandardsValue.standards : Array.isArray(alignmentStandardsValue) ? alignmentStandardsValue : [];
    return entries.map(function (entry) {
      return typeof entry === 'string' ? entry : [entry?.code || entry?.id, entry?.text || entry?.label].filter(Boolean).join(': ');
    }).filter(Boolean).join('; ');
  }().slice(0, 4000);
  if (alloBotRef && alloBotRef.current) {
    var contextMessage = t('bot_events.feedback_audit_start').replace('{standard}', alignmentStandardsText || 'Standard');
    alloBotRef.current.speak(contextMessage);
  }
  if (!alignmentStandardsText) {
    addToast(t('alignment.notifications.no_standard_error'), 'error');
    return;
  }
  setIsCheckingAlignment(true);
  try {
    var textToCheck = typeof generatedContent?.data === 'string' ? generatedContent.data : '';
    var prompt = `
            You are a curriculum specialist. Evaluate the rigor of the following text against ALL provided standards.
            Target Standards: "${alignmentStandardsText}"
            Target Grade Level: ${alignmentGrade}
            Text to Evaluate:
            "${textToCheck.substring(0, 3000)}",
            Task:
            1. Think step-by-step. Analyze the cognitive demand (verbs) and content (nouns) of the standards.
            2. Identify specific evidence in the text that matches these requirements.
            3. Determine if the text supports the full rigor required by the standards, or if simplification has removed necessary depth.
            Return ONLY JSON:
            {
                "evidence": "List specific phrases or sections from the text that serve as evidence of alignment...",
                "status": "Aligned" or "Partially Aligned" or "Not Aligned",
                "rigorReport": "Explanation of how the text meets or fails the cognitive demand based on the evidence...",
                "missingElements": "Specific concepts or structures from the standard that are absent (or 'None')...",
                "improvement": "One specific edit to increase rigor without breaking accessibility."
            }
        `;
    var result = await callGemini(prompt, true);
    var parsedAnalysis = JSON.parse(cleanJson(result));
    var fingerprintText = contextModule && typeof contextModule.fingerprintText === 'function' ? contextModule.fingerprintText(textToCheck) : String(textToCheck.length) + '|' + textToCheck.slice(0, 64) + '|' + textToCheck.slice(-64);
    var fingerprintStandards = contextModule && typeof contextModule.fingerprintValue === 'function' ? contextModule.fingerprintValue(alignmentStandardsValue) : '';
    var analysis = {
      ...parsedAnalysis,
      contentFingerprint: fingerprintText,
      checkedAt: new Date().toISOString(),
      contextSnapshot: {
        grade: alignmentGrade,
        standardsFingerprint: fingerprintStandards,
        standardsText: alignmentStandardsText
      }
    };
    var updatedContent = {
      ...generatedContent,
      alignmentCheck: analysis
    };
    setGeneratedContent(updatedContent);
    setHistory(function (previous) {
      return previous.map(function (item) {
        return item.id === generatedContent.id ? updatedContent : item;
      });
    });
    addToast(t('alignment.notifications.check_complete'), 'success');
    var feedbackKey = 'bot.rigor_feedback_misaligned';
    if (analysis.status === 'Aligned') feedbackKey = 'bot.rigor_feedback_aligned';else if (analysis.status === 'Partially Aligned') feedbackKey = 'bot.rigor_feedback_partial';
    speak(t(feedbackKey));
  } catch (error) {
    warnLog('Unhandled error:', error);
    setError(t('alignment.notifications.error_check'));
    addToast(t('alignment.notifications.check_failed'), 'error');
  } finally {
    setIsCheckingAlignment(false);
  }
}
async function regenerateSimplifiedWithRigor(deps) {
  var options = deps || {};
  var generatedContent = options.generatedContent;
  var setIsProcessing = options.setIsProcessing;
  var splitReferencesFromBody = options.splitReferencesFromBody;
  var extractSourceTextForProcessing = options.extractSourceTextForProcessing;
  var activeResolvedStandardsContext = options.activeResolvedStandardsContext;
  var standardsInput = options.standardsInput;
  var targetStandards = options.targetStandards;
  var gradeLevel = options.gradeLevel;
  var leveledTextLanguage = options.leveledTextLanguage;
  var translationTargetChoices = options.translationTargetChoices;
  var currentUiLanguage = options.currentUiLanguage;
  var selectedLanguages = options.selectedLanguages;
  var resolveTranslationPolicy = options.resolveTranslationPolicy;
  var translationMode = options.translationMode;
  var generateBilingualText = options.generateBilingualText;
  var callGemini = options.callGemini;
  var applySimplifiedTextMutation = options.applySimplifiedTextMutation;
  var setGeneratedContent = options.setGeneratedContent;
  var setHistory = options.setHistory;
  var addToast = options.addToast;
  var t = options.t;
  var warnLog = options.warnLog;
  var setError = options.setError;
  if (!generatedContent || !generatedContent.alignmentCheck || !generatedContent?.data) return;
  setIsProcessing(true);
  try {
    var rawText = typeof generatedContent?.data === 'string' ? generatedContent.data : '';
    var isLeveledText = generatedContent.type === 'simplified';
    var originalParts = isLeveledText ? splitReferencesFromBody(rawText) : {
      body: rawText,
      references: ''
    };
    var sourceExtraction = extractSourceTextForProcessing(originalParts.body, false);
    var currentText = sourceExtraction.text;
    var countCitationMarkers = function (value) {
      return (String(value || '').match(/\[\u207d[\u2070\u00b9\u00b2\u00b3\u2074-\u2079]+\u207e\]\(/g) || []).length;
    };
    var validateRigorCitations = function (original, candidate) {
      var modules = typeof window !== 'undefined' && window.AlloModules;
      var beforeCountFallback = countCitationMarkers(original);
      var afterCountFallback = countCitationMarkers(candidate);
      var citationShaped = beforeCountFallback > 0 || afterCountFallback > 0;
      var unavailable = function (reason, error) {
        return {
          valid: !citationShaped,
          ok: !citationShaped,
          reason: reason,
          error: error ? String(error?.message || error) : undefined,
          beforeCount: beforeCountFallback,
          afterCount: afterCountFallback,
          orderChanged: false
        };
      };
      var normalizeDecision = function (result) {
        if (typeof result === 'boolean') return {
          known: true,
          valid: result
        };
        if (!result || typeof result !== 'object') return {
          known: false,
          valid: false
        };
        if (Object.prototype.hasOwnProperty.call(result, 'valid')) return {
          known: true,
          valid: result.valid === true
        };
        if (Object.prototype.hasOwnProperty.call(result, 'ok')) return {
          known: true,
          valid: result.ok === true
        };
        if (Object.prototype.hasOwnProperty.call(result, 'conserved')) return {
          known: true,
          valid: result.conserved === true
        };
        return {
          known: false,
          valid: false
        };
      };
      var dispatcherValidate = modules?.GenDispatcher?.validateAdaptationCitationConservation;
      if (typeof dispatcherValidate === 'function') {
        try {
          var dispatcherResult = dispatcherValidate(original, candidate);
          var dispatcherDecision = normalizeDecision(dispatcherResult);
          if (!dispatcherDecision.known) return unavailable('citation-validator-invalid-result');
          var dispatcherDetails = dispatcherResult && typeof dispatcherResult === 'object' ? dispatcherResult : {};
          return {
            ...dispatcherDetails,
            valid: dispatcherDecision.valid && !dispatcherDetails.orderChanged,
            ok: dispatcherDecision.valid && !dispatcherDetails.orderChanged,
            beforeCount: Number(dispatcherDetails.beforeCount ?? dispatcherDetails.originalLedger?.occurrences?.length ?? beforeCountFallback),
            afterCount: Number(dispatcherDetails.afterCount ?? dispatcherDetails.candidateLedger?.occurrences?.length ?? afterCountFallback),
            orderChanged: !!dispatcherDetails.orderChanged
          };
        } catch (error) {
          return unavailable('citation-validator-error', error);
        }
      }
      var pipeline = modules?.TextPipelineHelpers;
      var pipelineValidate = pipeline?.validateCitationConservation;
      var extractLedger = pipeline?.extractCitationLedger;
      if (typeof pipelineValidate !== 'function' || typeof extractLedger !== 'function') {
        return unavailable('citation-validator-unavailable');
      }
      try {
        var pipelineResult = pipelineValidate(original, candidate);
        var pipelineDecision = normalizeDecision(pipelineResult);
        if (!pipelineDecision.known) return unavailable('citation-validator-invalid-result');
        var originalOccurrences = extractLedger(original)?.occurrences || [];
        var candidateOccurrences = extractLedger(candidate)?.occurrences || [];
        var orderChanged = originalOccurrences.length !== candidateOccurrences.length || originalOccurrences.some(function (entry, index) {
          return entry?.key !== candidateOccurrences[index]?.key;
        });
        var pipelineDetails = pipelineResult && typeof pipelineResult === 'object' ? pipelineResult : {};
        return {
          ...pipelineDetails,
          valid: pipelineDecision.valid && !orderChanged,
          ok: pipelineDecision.valid && !orderChanged,
          beforeCount: originalOccurrences.length,
          afterCount: candidateOccurrences.length,
          orderChanged: orderChanged
        };
      } catch (error) {
        return unavailable('citation-validator-error', error);
      }
    };
    var contextModule = typeof window !== 'undefined' && window.AlloModules ? window.AlloModules.InstructionalContext : null;
    var ambientStandardsContext = typeof activeResolvedStandardsContext !== 'undefined' ? activeResolvedStandardsContext : null;
    var ambientStandards = typeof standardsInput !== 'undefined' ? standardsInput : typeof targetStandards !== 'undefined' ? targetStandards : null;
    var rigorContext = contextModule && typeof contextModule.resolveArtifactContext === 'function' ? contextModule.resolveArtifactContext(generatedContent, {
      grade: gradeLevel,
      language: leveledTextLanguage,
      standardsContext: ambientStandardsContext,
      standards: ambientStandards
    }) : {
      grade: generatedContent?.instructionalText?.complexity?.requestedGrade || generatedContent?.targetGradeLevel || generatedContent?.config?.grade || gradeLevel,
      language: generatedContent?.instructionalText?.complexity?.language || generatedContent?.config?.language || leveledTextLanguage || 'English',
      standards: generatedContent?.config?.standardsContext || generatedContent?.config?.standards || ambientStandardsContext || ambientStandards || null
    };
    var rigorGrade = rigorContext.grade || gradeLevel;
    var rigorLanguage = rigorContext.language || leveledTextLanguage || 'English';
    var rigorStandardsValue = rigorContext.standards;
    var rigorStandards = function () {
      if (!rigorStandardsValue) return '';
      if (typeof rigorStandardsValue === 'string') return rigorStandardsValue.trim();
      if (typeof rigorStandardsValue.promptText === 'string' && rigorStandardsValue.promptText.trim()) {
        return rigorStandardsValue.promptText.trim();
      }
      var entries = Array.isArray(rigorStandardsValue.standards) ? rigorStandardsValue.standards : Array.isArray(rigorStandardsValue) ? rigorStandardsValue : [];
      return entries.map(function (entry) {
        return typeof entry === 'string' ? entry : [entry?.code || entry?.id, entry?.text || entry?.label].filter(Boolean).join(': ');
      }).filter(Boolean).join('; ');
    }().slice(0, 2400);
    var suggestion = generatedContent.alignmentCheck.improvement;
    var prompt = `
            Rewrite the following educational text to address specific feedback regarding standard alignment.
            Current Text:
            "${currentText}",
            Feedback/Suggestion to Implement:
            "${suggestion}",
            Target Audience: ${rigorGrade} students.
            ${rigorStandards ? `Standards Context: ${rigorStandards}` : ''}
            Instructions:
            - Incorporate the suggestion to increase rigor or alignment.
            - Maintain the appropriate reading level for ${rigorGrade}.
            - Preserve the disciplinary concepts and cognitive demand in the recorded standards context.
            - Write the rewritten text in ${rigorLanguage}.
            ${isLeveledText ? `- Preserve every inline Markdown citation exactly as written, including its superscript number, URL, occurrence count, and order.
            - Keep each citation attached to the same supported claim; never add, remove, duplicate, rename, reorder, or alter a citation.
            - Do not produce a Sources, References, Bibliography, or Works Cited section. AlloFlow appends the preserved reference trailer after validation.` : ''}
        `;
    var rigorTranslationChoices = typeof translationTargetChoices === 'function' ? translationTargetChoices(rigorLanguage, currentUiLanguage, typeof selectedLanguages !== 'undefined' ? selectedLanguages : []) : [];
    var rigorTranslationPolicy = typeof resolveTranslationPolicy === 'function' ? resolveTranslationPolicy(translationMode, rigorLanguage, currentUiLanguage, rigorTranslationChoices) : {
      enabled: false,
      target: 'English',
      mode: 'off'
    };
    var newText = await generateBilingualText(prompt, rigorLanguage, callGemini, rigorTranslationPolicy);
    var rigorCitationAudit = null;
    if (isLeveledText) {
      var candidateParts = splitReferencesFromBody(newText);
      var candidateBody = String(candidateParts.body || '').trim();
      var candidateExtraction = extractSourceTextForProcessing(candidateBody, false);
      var candidateTarget = candidateExtraction.targetLangBlock || candidateExtraction.text;
      var originalForValidation = sourceExtraction.isBilingual ? originalParts.body : currentText;
      var candidateForValidation = sourceExtraction.isBilingual ? candidateBody : candidateTarget;
      var conservation = validateRigorCitations(originalForValidation, candidateForValidation);
      var shouldValidateGeneratedEnglish = !sourceExtraction.isBilingual && (candidateExtraction.isBilingual || String(rigorLanguage || '').trim().toLowerCase() !== 'english');
      if (shouldValidateGeneratedEnglish) {
        var englishConservation = validateRigorCitations(candidateTarget, candidateExtraction.isBilingual ? candidateExtraction.englishBlock : '');
        conservation = {
          ...conservation,
          valid: !!conservation.valid && !!englishConservation.valid,
          ok: !!conservation.valid && !!englishConservation.valid,
          beforeCount: Number(conservation.beforeCount || 0) + Number(englishConservation.beforeCount || 0),
          afterCount: Number(conservation.afterCount || 0) + Number(englishConservation.afterCount || 0),
          orderChanged: !!conservation.orderChanged || !!englishConservation.orderChanged,
          english: englishConservation
        };
      }
      rigorCitationAudit = {
        stage: 'rigor-regeneration',
        valid: !!conservation.valid,
        beforeCount: Number(conservation.beforeCount ?? conservation.originalLedger?.occurrences?.length ?? countCitationMarkers(originalForValidation)),
        afterCount: Number(conservation.afterCount ?? conservation.candidateLedger?.occurrences?.length ?? countCitationMarkers(candidateForValidation)),
        orderChanged: !!conservation.orderChanged,
        ...(conservation.reason ? {
          reason: conservation.reason
        } : {})
      };
      if (!conservation.valid) {
        var citationError = new Error('Rigor regeneration changed or could not verify source citations.');
        citationError.code = 'citation-conservation-failed';
        citationError.details = conservation;
        throw citationError;
      }
      newText = [candidateBody, originalParts.references].filter(Boolean).join('\n\n');
    }
    var priorConfig = generatedContent.config && typeof generatedContent.config === 'object' ? generatedContent.config : {};
    var priorAudit = priorConfig.citationAudit && typeof priorConfig.citationAudit === 'object' ? priorConfig.citationAudit : null;
    var updatedConfig = rigorCitationAudit ? {
      ...priorConfig,
      citationAudit: {
        ...(priorAudit || {
          version: 1,
          policy: 'exact-marker-order',
          enabled: rigorCitationAudit.beforeCount > 0,
          status: 'valid',
          fallbackCount: 0
        }),
        stages: [...(Array.isArray(priorAudit?.stages) ? priorAudit.stages : []), rigorCitationAudit]
      }
    } : generatedContent.config;
    var updatedContent = {
      ...generatedContent,
      data: newText,
      ...(rigorCitationAudit ? {
        config: updatedConfig
      } : {})
    };
    // Keep readability and AI-check evidence tied to the exact rewritten
    // bytes, just as manual edits and undo/redo do.
    if (isLeveledText && typeof applySimplifiedTextMutation === 'function') {
      updatedContent = applySimplifiedTextMutation(updatedContent, newText);
    } else {
      delete updatedContent.localStats;
      var fallbackContextModule = typeof window !== 'undefined' && window.AlloModules ? window.AlloModules.InstructionalContext : null;
      if (fallbackContextModule && typeof fallbackContextModule.getInstructionalText === 'function' && typeof fallbackContextModule.invalidateComplexityEvidence === 'function') {
        var baseInstructionalText = fallbackContextModule.getInstructionalText(updatedContent, {
          complexity: {
            requestedGrade: rigorGrade,
            language: rigorLanguage
          }
        });
        updatedContent.instructionalText = fallbackContextModule.invalidateComplexityEvidence(baseInstructionalText, newText, 'stale');
        updatedContent.targetGradeLevel = rigorGrade;
      }
      delete updatedContent.alignmentCheck;
      if (updatedContent.levelCheck) delete updatedContent.levelCheck;
    }
    setGeneratedContent(updatedContent);
    setHistory(function (previous) {
      return previous.map(function (item) {
        return item.id === generatedContent.id ? updatedContent : item;
      });
    });
    addToast(t('alignment.notifications.regenerated_success'), 'success');
  } catch (error) {
    if (error?.code === 'citation-conservation-failed') {
      warnLog('[CitationConservation] Rigor regeneration rejected; original resource retained.', error.details || error);
      addToast('The rigor rewrite could not preserve and verify every source citation, so the original citation-safe version was retained.', 'warning');
      return;
    }
    warnLog('Unhandled error:', error);
    setError(t('errors.text_regeneration_failed'));
    addToast(t('alignment.notifications.regen_failed'), 'error');
  } finally {
    setIsProcessing(false);
  }
}

// Shared reading structure and word targets. All layouts use the same helpers.
function simplifiedLanguageTag(language) {
  var value = String(language || '').trim();
  var names = {
    english: 'en',
    spanish: 'es',
    french: 'fr',
    german: 'de',
    italian: 'it',
    portuguese: 'pt',
    arabic: 'ar',
    hebrew: 'he',
    persian: 'fa',
    urdu: 'ur',
    hindi: 'hi',
    bengali: 'bn',
    punjabi: 'pa',
    tamil: 'ta',
    telugu: 'te',
    marathi: 'mr',
    gujarati: 'gu',
    russian: 'ru',
    ukrainian: 'uk',
    polish: 'pl',
    turkish: 'tr',
    vietnamese: 'vi',
    korean: 'ko',
    chinese: 'zh',
    'mandarin chinese': 'zh',
    'simplified chinese': 'zh-Hans',
    'traditional chinese': 'zh-Hant',
    japanese: 'ja',
    thai: 'th',
    lao: 'lo',
    khmer: 'km',
    burmese: 'my',
    indonesian: 'id',
    malay: 'ms',
    swahili: 'sw',
    somali: 'so',
    haitian: 'ht',
    'haitian creole': 'ht'
  };
  if (names[value.toLowerCase()]) return names[value.toLowerCase()];
  if (!/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(value)) return undefined;
  try {
    return Intl.getCanonicalLocales(value)[0];
  } catch (_) {
    return undefined;
  }
}
function simplifiedWordSegments(text, language) {
  var value = String(text || '');
  try {
    if (typeof Intl.Segmenter === 'function') {
      return Array.from(new Intl.Segmenter(simplifiedLanguageTag(language), {
        granularity: 'word'
      }).segment(value), function (part) {
        return {
          text: part.segment,
          word: !!part.isWordLike
        };
      });
    }
  } catch (_) {}
  // Keep punctuation and spacing as text; unspaced scripts retain selectable
  // graphemes if the runtime cannot provide dictionary-based segmentation.
  return (value.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]\p{M}*|[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*|[^\p{L}\p{N}]+/gu) || []).map(function (part) {
    return {
      text: part,
      word: /[\p{L}\p{N}]/u.test(part)
    };
  });
}
function simplifiedPlainInline(text) {
  return String(text || '').replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').replace(/\*\*|__|~~|`/g, '').replace(/\*([^*]+)\*/g, '$1');
}
function simplifiedInline(text, leaf) {
  // Structure remains intact in word-help and selection modes. Links remain
  // ordinary links; punctuation is never a definition or phonics target.
  return String(text || '').split(/(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^\)]+\))/g).map(function (part, index) {
    if (/^(\*\*|__)/.test(part)) return /*#__PURE__*/React.createElement("strong", {
      key: index
    }, simplifiedInline(part.slice(2, -2), leaf));
    if (/^\*[^*]/.test(part)) return /*#__PURE__*/React.createElement("em", {
      key: index
    }, simplifiedInline(part.slice(1, -1), leaf));
    if (/^`/.test(part)) return /*#__PURE__*/React.createElement("code", {
      key: index
    }, part.slice(1, -1));
    var link = part.match(/^\[([^\]]+)\]\(([^\)]+)\)$/);
    if (link) return /^(https?:\/\/|mailto:|#|\/)/i.test(link[2]) ? /*#__PURE__*/React.createElement("a", {
      key: index,
      href: link[2],
      target: "_blank",
      rel: "noopener noreferrer",
      className: "underline decoration-2 underline-offset-2 rounded focus-visible:ring-2 focus-visible:ring-indigo-600",
      onClick: e => e.stopPropagation()
    }, link[1]) : /*#__PURE__*/React.createElement(React.Fragment, {
      key: index
    }, link[1]);
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: index
    }, leaf(part));
  });
}
function simplifiedParagraphBlocks(text) {
  var lines = String(text || '').split('\n');
  var output = [],
    paragraph = [];
  var flush = function () {
    if (paragraph.length) output.push({
      type: 'p',
      raw: paragraph.join('\n')
    });
    paragraph = [];
  };
  for (var i = 0; i < lines.length; i += 1) {
    var line = lines[i];
    var heading = line.match(/^\s{0,3}(#{1,6})\s+(.+)$/) || line.match(/^\s*<h([1-6])[^>]*>(.*?)<\/h[1-6]>\s*$/i);
    var item = line.match(/^(\s*)([-+*]|\d+[.)])\s+(.+)$/);
    if (heading) {
      flush();
      output.push({
        type: 'heading',
        level: /^#/.test(heading[1]) ? heading[1].length : Number(heading[1]),
        raw: line,
        text: heading[2]
      });
    } else if (item) {
      flush();
      output.push({
        type: 'li',
        indent: item[1].replace(/\t/g, '    ').length,
        ordered: /^\d/.test(item[2]),
        value: parseInt(item[2], 10) || 1,
        raw: line,
        text: item[3]
      });
    } else if (/^\s*>\s?/.test(line)) {
      flush();
      output.push({
        type: 'quote',
        raw: line,
        text: line.replace(/^\s*>\s?/, '')
      });
    } else if (output.length && output[output.length - 1].type === 'li' && /^\s+\S/.test(line)) {
      var previous = output[output.length - 1];
      previous.raw += '\n' + line;
      previous.text += '\n' + line.trimStart();
    } else {
      paragraph.push(line);
    }
  }
  flush();
  return output;
}
function simplifiedNestLists(blocks, renderBlock) {
  var roots = [],
    stack = [];
  blocks.forEach(function (block, index) {
    if (block.type !== 'li') {
      stack = [];
      roots.push({
        blockRoot: block,
        index: index
      });
      return;
    }
    while (stack.length && (stack[stack.length - 1].indent > block.indent || stack[stack.length - 1].indent === block.indent && stack[stack.length - 1].ordered !== block.ordered)) stack.pop();
    var current = stack[stack.length - 1];
    if (!current || current.indent < block.indent) {
      var list = {
        indent: block.indent,
        ordered: block.ordered,
        start: block.value,
        items: [],
        key: index
      };
      if (current && current.items.length) current.items[current.items.length - 1].children.push(list);else roots.push(list);
      stack.push(list);
      current = list;
    }
    current.items.push({
      block: block,
      index: index,
      children: []
    });
  });
  var materialize = function (entry) {
    if (entry.blockRoot) return renderBlock(entry.blockRoot, entry.index);
    var Tag = entry.ordered ? 'ol' : 'ul';
    return /*#__PURE__*/React.createElement(Tag, {
      key: 'list-' + entry.key,
      start: entry.ordered ? entry.start : undefined,
      className: "my-3 space-y-2",
      style: {
        paddingInlineStart: '1.6em',
        listStyleType: entry.ordered ? 'decimal' : 'disc'
      }
    }, entry.items.map(function (item) {
      return /*#__PURE__*/React.createElement("li", {
        key: item.index,
        value: entry.ordered ? item.block.value : undefined
      }, renderBlock(item.block, item.index), item.children.map(materialize));
    }));
  };
  return roots.map(materialize);
}
function simplifiedPopupStyle(point, widthRem) {
  var fontSize = 16;
  try {
    fontSize = parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;
  } catch (_) {}
  var width = Math.min(widthRem * fontSize, Math.max(0, window.innerWidth - 16));
  return {
    width: width + 'px',
    maxWidth: 'calc(100vw - 16px)',
    left: Math.max(8, Math.min(window.innerWidth - width - 8, (Number(point.x) || 0) - 20)) + 'px',
    top: Math.max(8, Math.min((window.innerHeight - 16) / 2, (Number(point.y) || 0) + 10)) + 'px',
    maxHeight: 'calc(50dvh - 8px)',
    overflowY: 'auto'
  };
}
function SimplifiedView(props) {
  // State reads
  var t = props.t;
  var simplifiedAudioEditLabel = t('common.edit') || '';
  var simplifiedAudioSaveLabel = t('common.save') || '';
  var simplifiedAudioStopLabel = t('common.stop') || '';
  var simplifiedAudioPlayLabel = t('common.play') || '';
  var simplifiedAudioPauseLabel = t('common.pause') || '';
  var simplifiedAudioLoadingLabel = t('common.loading') || '';
  var simplifiedAudioGenerateLabel = t('common.generate') || '';
  var simplifiedAudioRegenerateLabel = t('common.regenerate') || '';
  var simplifiedAudioRemoveLabel = t('common.remove') || '';
  var simplifiedAudioRecordLabel = t('word_sounds.voice_pack_tab_record') || t('common.microphone') || '';
  var simplifiedAudioSavedLabel = t('common.success') || '';
  var simplifiedAudioMissingLabel = t('simplified.missing_label') || '';
  var simplifiedAudioErrorLabel = t('common.error') || '';
  var simplifiedAudioStorageLimitLabel = t('errors.storage_full') || simplifiedAudioErrorLabel;
  var simplifiedAudioSettingsChangedLabel = t('ui_common.unsaved_changes') || simplifiedAudioErrorLabel;
  var simplifiedAudioCopiedLabel = t('common.copy') || '';
  var simplifiedAudioDiagnosticsLabel = t('common.error_analysis') || simplifiedAudioErrorLabel;
  var simplifiedActivityCompleteLabel = t('word_sounds.session_complete') || simplifiedAudioSavedLabel;
  var simplifiedReadingSelectionLabel = t('common.selection') || t('common.resource') || '';
  var simplifiedReadingThemeLabel = t('header.reading_theme_aria') || '';
  var simplifiedTeacherRecordingLabel = t('word_sounds.voice_pack_kind_teacher') || simplifiedAudioRecordLabel;
  var simplifiedStudentRecordingLabel = t('word_sounds.voice_pack_kind_student') || simplifiedAudioRecordLabel;
  var simplifiedHumanRecordingLabel = t('word_sounds.real_recording') || simplifiedAudioRecordLabel;
  var simplifiedHearPhonicsLabel = t('common.click_hear_phonics') || '';
  var simplifiedDefineLabel = t('text_tools.define') || '';
  var simplifiedReadSentenceLabel = t('common.read') || '';
  var simplifiedGeneratingMoreLabel = t('word_sounds.generating_more') || '';
  var simplifiedEnglishTranslationLabel = t('common.english_translation') || '';
  var simplifiedStopAudioDownloadLabel = t('common.audio_stop') || simplifiedAudioStopLabel;
  var generatedContent = props.generatedContent;
  var inputText = props.inputText;
  var gradeLevel = props.gradeLevel;
  var leveledTextLanguage = generatedContent?.config?.language || generatedContent?.instructionalText?.complexity?.language || props.leveledTextLanguage;
  var studentInterests = props.studentInterests;
  var standardsInput = props.standardsInput;
  var sourceTopic = props.sourceTopic;
  var isTeacherMode = props.isTeacherMode;
  var isProcessing = props.isProcessing;
  var isPlaying = props.isPlaying;
  var interactionMode = props.interactionMode;
  var isCompareMode = props.isCompareMode;
  var isFluencyMode = props.isFluencyMode;
  var isEditingLeveledText = props.isEditingLeveledText;
  var isImmersiveReaderActive = props.isImmersiveReaderActive;
  var immersiveSettings = props.immersiveSettings;
  var immersiveRulerY = props.immersiveRulerY;
  var isFocusReaderActive = props.isFocusReaderActive;
  var isChunkReaderActive = props.isChunkReaderActive;
  var chunkReaderIdx = props.chunkReaderIdx;
  var chunkReaderAutoPlay = props.chunkReaderAutoPlay;
  var chunkReaderSpeed = props.chunkReaderSpeed;
  var chunkReaderReadAlong = props.chunkReaderReadAlong;
  var chunkReaderSweepPct = props.chunkReaderSweepPct;
  var chunkReaderMood = props.chunkReaderMood || 'highlight';
  var setChunkReaderMood = props.setChunkReaderMood;
  var chunkTypewriterCharIdx = props.chunkTypewriterCharIdx || 0;
  var isCrawlReaderActive = props.isCrawlReaderActive;
  var isKaraokeOverlayActive = props.isKaraokeOverlayActive;
  var isAnalyzingPos = props.isAnalyzingPos;
  var isCheckingLevel = props.isCheckingLevel;
  var isCheckingAlignment = props.isCheckingAlignment;
  var isLineFocusMode = props.isLineFocusMode;
  var focusedParagraphIndex = props.focusedParagraphIndex;
  var isZenMode = props.isZenMode;
  var definitionData = props.definitionData;
  var phonicsData = props.phonicsData;
  var revisionData = props.revisionData;
  var selectionMenu = props.selectionMenu;
  var isCustomReviseOpen = props.isCustomReviseOpen;
  var customReviseInstruction = props.customReviseInstruction;
  var latestGlossary = props.latestGlossary;
  var history = props.history;
  var complexityLevel = props.complexityLevel;
  var saveOriginalOnAdjust = props.saveOriginalOnAdjust;
  var playbackState = props.playbackState;
  var playbackRate = props.playbackRate;
  var selectedVoice = props.selectedVoice;
  var voiceSpeed = props.voiceSpeed;
  var lineHeight = props.lineHeight;
  var letterSpacing = props.letterSpacing;
  var readingTheme = props.readingTheme;
  var theme = props.theme;
  var isTeacherToolbarExpanded = props.isTeacherToolbarExpanded;
  var downloadingContentId = props.downloadingContentId;
  var playingContentId = props.playingContentId;
  var isSimplifiedAudioDownloading = downloadingContentId === 'dl-simplified-main';
  var isClozeComplete = props.isClozeComplete;
  var isSideBySide = props.isSideBySide;
  var cursorStyles = props.cursorStyles;
  // Setters
  var setInteractionMode = props.setInteractionMode;
  var setIsCompareMode = props.setIsCompareMode;
  var setIsFluencyMode = props.setIsFluencyMode;
  var setSelectionMenu = props.setSelectionMenu;
  var setRevisionData = props.setRevisionData;
  var setPhonicsData = props.setPhonicsData;
  var setIsImmersiveReaderActive = props.setIsImmersiveReaderActive;
  var setImmersiveSettings = props.setImmersiveSettings;
  var setImmersiveRulerY = props.setImmersiveRulerY;
  var setIsFocusReaderActive = props.setIsFocusReaderActive;
  var setIsChunkReaderActive = props.setIsChunkReaderActive;
  var setChunkReaderIdx = props.setChunkReaderIdx;
  var setChunkReaderAutoPlay = props.setChunkReaderAutoPlay;
  var setChunkReaderSpeed = props.setChunkReaderSpeed;
  var setChunkReaderReadAlong = props.setChunkReaderReadAlong;
  var setChunkReaderSweepPct = props.setChunkReaderSweepPct;
  var setIsCrawlReaderActive = props.setIsCrawlReaderActive;
  var setIsKaraokeOverlayActive = props.setIsKaraokeOverlayActive;
  var setPlaybackRate = props.setPlaybackRate;
  var setLineHeight = props.setLineHeight;
  var setLetterSpacing = props.setLetterSpacing;
  var setFocusedParagraphIndex = props.setFocusedParagraphIndex;
  // Line Focus follows keyboard focus as well as the pointer. Keep a
  // focused response visible when the mouse leaves or moves between words.
  var lineFocusParagraphProps = function (paragraphId) {
    var clearFocus = function () {
      setFocusedParagraphIndex(current => current === paragraphId ? null : current);
    };
    return {
      'data-line-focus-paragraph': String(paragraphId),
      tabIndex: isLineFocusMode ? 0 : undefined,
      onFocus: function () {
        setFocusedParagraphIndex(paragraphId);
      },
      onBlur: function (event) {
        if (!event.currentTarget.contains(event.relatedTarget)) clearFocus();
      },
      onMouseEnter: function () {
        setFocusedParagraphIndex(paragraphId);
      },
      onMouseLeave: function (event) {
        if (!event.currentTarget.contains(event.currentTarget.ownerDocument.activeElement)) clearFocus();
      }
    };
  };
  var setIsCustomReviseOpen = props.setIsCustomReviseOpen;
  var setCustomReviseInstruction = props.setCustomReviseInstruction;
  var setComplexityLevel = props.setComplexityLevel;
  var setSaveOriginalOnAdjust = props.setSaveOriginalOnAdjust;
  var setReadingTheme = props.setReadingTheme;
  var setGeneratedContent = props.setGeneratedContent;
  var setHistory = props.setHistory;
  // Refs
  var chunkReaderSweepAudioRef = props.chunkReaderSweepAudioRef;
  var chunkReaderSweepRafRef = props.chunkReaderSweepRafRef;
  var textEditorRef = props.textEditorRef;
  // Handlers
  var handleCloseImmersiveReader = props.handleCloseImmersiveReader;
  var handleGeneratePOSData = props.handleGeneratePOSData;
  var handleCloseSpeedReader = props.handleCloseSpeedReader;
  var handleSpeak = props.handleSpeak;
  var handleWordClick = props.handleWordClick;
  var handlePhonicsClick = props.handlePhonicsClick;
  var handleFormatText = props.handleFormatText;
  var handleSimplifiedTextChange = props.handleSimplifiedTextChange;
  var handleReviseSelection = props.handleReviseSelection;
  var handleQuickAddGlossary = props.handleQuickAddGlossary;
  var handleDefineSelection = props.handleDefineSelection;
  var handleTextMouseUp = props.handleTextMouseUp;
  var handleSetIsSyntaxGameToTrue = props.handleSetIsSyntaxGameToTrue;
  var handleAnalyzePOS = props.handleAnalyzePOS;
  var handleCheckLevel = props.handleCheckLevel;
  var handleCheckAlignment = props.handleCheckAlignment;
  var handleDuplicateResource = props.handleDuplicateResource;
  var handleDownloadAudio = props.handleDownloadAudio;
  var handleToggleIsTeacherToolbarExpanded = props.handleToggleIsTeacherToolbarExpanded;
  var handleToggleIsEditingLeveledText = props.handleToggleIsEditingLeveledText;
  var handleSetIsCustomReviseOpenToFalse = props.handleSetIsCustomReviseOpenToFalse;
  var closeDefinition = props.closeDefinition;
  var closePhonics = props.closePhonics;
  var closeRevision = props.closeRevision;
  var handleFetchWordImage = props.handleFetchWordImage;
  var applyTextRevision = props.applyTextRevision;
  var stopPlayback = props.stopPlayback;
  var handleComplexityAdjustment = props.handleComplexityAdjustment;
  var handleRegenerateWithRigor = props.handleRegenerateWithRigor;
  // Pure helpers
  var splitTextToSentences = props.splitTextToSentences;
  var getSideBySideContent = props.getSideBySideContent;
  var formatInteractiveText = props.formatInteractiveText;
  var renderFormattedText = props.renderFormattedText;
  var splitReferencesFromBody = props.splitReferencesFromBody;
  var parseReferenceItems = props.parseReferenceItems;
  var highlightGlossaryTerms = props.highlightGlossaryTerms;
  var diffWords = props.diffWords;
  var callTTS = props.callTTS;
  var copyToClipboard = props.copyToClipboard;
  var isRtlLang = props.isRtlLang;
  var getContentDirection = props.getContentDirection;
  // Components
  var ImmersiveToolbar = props.ImmersiveToolbar;
  var ImmersiveWord = props.ImmersiveWord;
  var ErrorBoundary = props.ErrorBoundary;
  var FocusReaderOverlay = props.FocusReaderOverlay;
  var PerspectiveCrawlOverlay = props.PerspectiveCrawlOverlay;
  var KaraokeReaderOverlay = props.KaraokeReaderOverlay;
  var ConfettiExplosion = props.ConfettiExplosion;
  var ComplexityGauge = props.ComplexityGauge;
  var SourceReferencesPanel = props.SourceReferencesPanel;
  // The immersive reader is a z-[200] full-screen overlay. Word-level popups
  // (Define / Phonics / selection / revise) default to z-[100]/z-[90], so when
  // immersive is open they render BEHIND it — the definition appears to land in
  // the standard view. Lift them above the overlay while immersive is active
  // (backdrop just under the popup, still above the overlay).
  const _popupZ = isImmersiveReaderActive ? 'z-[220]' : 'z-[100]';
  const _popupBackdropZ = isImmersiveReaderActive ? 'z-[210]' : 'z-[90]';
  // Build the exact text contract shared by visible sentence indexes,
  // in-view playback, karaoke preparation, and Edit Audio.
  var buildSimplifiedContentParts = function (rawText) {
    var fullText = typeof rawText === 'string' ? rawText : String(rawText || '');
    var split = {
      body: fullText,
      references: ''
    };
    try {
      if (typeof splitReferencesFromBody === 'function') split = splitReferencesFromBody(fullText) || split;
    } catch (_) {}
    var normalizedBody = String(split.body || '').replace(/\r\n?/g, '\n').replace(/^[ \t]*<h([1-6])[^>]*>(.*?)<\/h[1-6]>[ \t]*$/gmi, (_match, level, text) => '#'.repeat(Number(level)) + ' ' + text).replace(/^[ \t]*(\*{1,2})([^*\n]+?)\1[ \t]*$/gm, function (_match, _stars, inner) {
      if (/[.!?。！？؟:：]$/.test(inner.trim())) return _match;
      return '## ' + inner.trim();
    });
    return {
      body: normalizedBody,
      references: String(split.references || '')
    };
  };
  var simplifiedContentParts = buildSimplifiedContentParts(generatedContent && generatedContent.data);
  var simplifiedDisplayBody = simplifiedContentParts.body;
  function openReadingReflection() {
    if (!props.onReadReflect) return;
    props.onReadReflect({
      text: simplifiedDisplayBody,
      title: sourceTopic || 'Adapted reading',
      language: leveledTextLanguage || '',
      anchor: {
        kind: 'adapted',
        resourceId: String(generatedContent.id || sourceTopic || 'adapted'),
        section: 'body'
      }
    });
  }
  // The adapted document owns its citation registry. Falling back to the
  // source document is only safe when the adapted document has no reference
  // trailer at all; choosing whichever list is longer can pair adapted body
  // markers with a different source list.
  var simplifiedInputReferences = '';
  try {
    if (inputText && typeof splitReferencesFromBody === 'function') simplifiedInputReferences = String((splitReferencesFromBody(inputText) || {}).references || '');
  } catch (_) {}
  var adaptedCitationAudit = generatedContent && generatedContent.config && generatedContent.config.citationAudit;
  var simplifiedReferences = resolveSimplifiedReferences(simplifiedDisplayBody, simplifiedContentParts.references, simplifiedInputReferences, adaptedCitationAudit);
  simplifiedContentParts.references = simplifiedReferences;
  var simplifiedReadAloudText = simplifiedDisplayBody.trim();
  var ttsPrepState_state = React.useState({
    busy: false,
    done: 0,
    total: 0
  });
  var ttsPrepState = ttsPrepState_state[0];
  var setTtsPrepState = ttsPrepState_state[1];
  var ttsPrepNoticeState = React.useState('');
  var ttsPrepNotice = ttsPrepNoticeState[0],
    setTtsPrepNotice = ttsPrepNoticeState[1];
  var ttsPrepRequestRef = React.useRef(null);
  var ttsPrepContext = JSON.stringify([generatedContent && generatedContent.id, simplifiedReadAloudText, selectedVoice, leveledTextLanguage]);
  var ttsPrepContextRef = React.useRef(ttsPrepContext);
  ttsPrepContextRef.current = ttsPrepContext;
  React.useEffect(function () {
    setTtsPrepNotice('');
    setTtsPrepState({
      busy: false,
      done: 0,
      total: 0
    });
    return function () {
      var request = ttsPrepRequestRef.current;
      ttsPrepRequestRef.current = null;
      if (request && request.controller) request.controller.abort();
    };
  }, [ttsPrepContext]);
  var ownsTtsPreparation = function (request) {
    return ttsPrepRequestRef.current === request && ttsPrepContextRef.current === request.context;
  };
  var saveTtsAsPlayed_state = React.useState(function () {
    // Default ON (2026-07-09): capture-as-you-play costs no extra synthesis;
    // '0' is the explicit per-device opt-out via the checkbox below.
    try {
      return localStorage.getItem('allo_save_karaoke_audio') !== '0';
    } catch (_) {
      return true;
    }
  });
  var saveTtsAsPlayed = saveTtsAsPlayed_state[0];
  var setSaveTtsAsPlayed = saveTtsAsPlayed_state[1];
  // "Copy diagnostics" for the IN-VIEW read-aloud (playSequence path): the
  // karaoke overlay has its own button, but leveled-text playback happens
  // right here — surface the shared window.__alloTtsTrace ring where the
  // teacher is actually looking when audio gets stuck.
  var ttsDiagCopied_state = React.useState(false);
  var ttsDiagCopied = ttsDiagCopied_state[0];
  var setTtsDiagCopied = ttsDiagCopied_state[1];
  var _fallbackCopyTtsDiag = function (text) {
    try {
      var scratch = document.createElement('textarea');
      scratch.setAttribute('aria-label', 'Temporary field for copying read-aloud diagnostics');
      scratch.value = text;
      scratch.setAttribute('readonly', '');
      scratch.style.position = 'fixed';
      scratch.style.opacity = '0';
      document.body.appendChild(scratch);
      scratch.select();
      var ok = document.execCommand('copy');
      scratch.remove();
      return ok;
    } catch (e) {
      return false;
    }
  };
  var copyTtsDiagnostics = function () {
    var payload;
    try {
      payload = JSON.stringify({
        at: new Date().toISOString(),
        surface: 'leveled-text',
        userAgent: typeof navigator !== 'undefined' ? String(navigator.userAgent || '').substring(0, 120) : '',
        flags: {
          geminiQuotaFailed: !!window.__ttsGeminiQuotaFailed,
          geminiAuthFailed: !!window.__ttsGeminiAuthFailed,
          kokoroPresent: !!window._kokoroTTS,
          kokoroReady: !!(window._kokoroTTS && window._kokoroTTS.ready),
          sharedResolver: typeof window.__alloResolveReadAloudAudio === 'function'
        },
        lastRoute: window.__ttsLastRoute || null,
        trace: (window.__alloTtsTrace || []).slice(-120)
      }, null, 2);
    } catch (e) {
      payload = 'diagnostics-serialize-failed: ' + String(e && e.message || e);
    }
    var done = function (ok) {
      if (!ok) return;
      setTtsDiagCopied(true);
      setTimeout(function () {
        setTtsDiagCopied(false);
      }, 2000);
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(payload).then(function () {
          done(true);
        }, function () {
          done(_fallbackCopyTtsDiag(payload));
        });
        return;
      }
    } catch (e) {}
    done(_fallbackCopyTtsDiag(payload));
  };
  var savingAudioKeys_state = React.useState({});
  var savingAudioKeys = savingAudioKeys_state[0];
  var setSavingAudioKeys = savingAudioKeys_state[1];
  var captureAudioErrors_state = React.useState({});
  var captureAudioErrors = captureAudioErrors_state[0];
  var setCaptureAudioErrors = captureAudioErrors_state[1];
  var regenAudioKey_state = React.useState(null);
  var editAudioPlaybackErrors_state = React.useState({});
  var editAudioPlaybackErrors = editAudioPlaybackErrors_state[0];
  var setEditAudioPlaybackErrors = editAudioPlaybackErrors_state[1];
  var regenAudioKey = regenAudioKey_state[0];
  var setRegenAudioKey = regenAudioKey_state[1];
  var setAudioStatusTick = React.useState(0)[1];
  var editAudioOpen_state = React.useState(false);
  var editAudioOpen = editAudioOpen_state[0];
  var setEditAudioOpen = editAudioOpen_state[1];
  var editAudioPlayingKey_state = React.useState(null);
  var editAudioPlayingKey = editAudioPlayingKey_state[0];
  var setEditAudioPlayingKey = editAudioPlayingKey_state[1];
  var editAudioLoadingKey_state = React.useState(null);
  var editAudioLoadingKey = editAudioLoadingKey_state[0];
  var setEditAudioLoadingKey = editAudioLoadingKey_state[1];
  var editAudioMicRequestKey_state = React.useState(null);
  var editAudioMicRequestKey = editAudioMicRequestKey_state[0];
  var setEditAudioMicRequestKey = editAudioMicRequestKey_state[1];
  var editAudioRecordingKey_state = React.useState(null);
  var editAudioRecordingKey = editAudioRecordingKey_state[0];
  var setEditAudioRecordingKey = editAudioRecordingKey_state[1];
  var editAudioRecordingSaveKey_state = React.useState(null);
  var editAudioRecordingSaveKey = editAudioRecordingSaveKey_state[0];
  var setEditAudioRecordingSaveKey = editAudioRecordingSaveKey_state[1];
  var removeAudioKey_state = React.useState(null);
  var removeAudioKey = removeAudioKey_state[0];
  var setRemoveAudioKey = removeAudioKey_state[1];
  var editAudioNotice_state = React.useState('');
  var editAudioNotice = editAudioNotice_state[0];
  var setEditAudioNotice = editAudioNotice_state[1];
  var editAudioPlayerRef = React.useRef(null);
  var editAudioPlayTokenRef = React.useRef(0);
  var editAudioRecordTokenRef = React.useRef(0);
  var editAudioMediaRecorderRef = React.useRef(null);
  var editAudioMediaStreamRef = React.useRef(null);
  var editAudioChunksRef = React.useRef([]);
  var editAudioRecordingTimerRef = React.useRef(null);
  var editAudioRecordingStartedAtRef = React.useRef(0);
  var EDIT_AUDIO_MAX_RECORDING_MS = 120000;
  var immersiveDialogRef = React.useRef(null);
  var [immersiveToolbarBottom, setImmersiveToolbarBottom] = React.useState(0);
  React.useEffect(function () {
    if (!isImmersiveReaderActive || !immersiveSettings?.lineFocus) return;
    var toolbar = immersiveDialogRef.current?.querySelector("[data-immersive-toolbar]");
    var update = function () {
      var bottom = toolbar?.getBoundingClientRect().bottom || 0;
      setImmersiveToolbarBottom(bottom);
      setImmersiveRulerY(previous => Math.max(previous, bottom + immersiveSettings.textSize * 2.5));
    };
    update();
    var observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    if (toolbar) observer?.observe(toolbar);
    window.addEventListener("resize", update);
    return function () {
      observer?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [isImmersiveReaderActive, immersiveSettings?.lineFocus, immersiveSettings?.textSize, setImmersiveRulerY]);
  var phonicsDialogRef = React.useRef(null);
  var phonicsCloseRef = React.useRef(null);
  var definitionDialogRef = React.useRef(null);
  var definitionCloseRef = React.useRef(null);
  var revisionDialogRef = React.useRef(null);
  var revisionCloseRef = React.useRef(null);
  var stopEditAudioPlayback = function () {
    editAudioPlayTokenRef.current += 1;
    try {
      if (editAudioPlayerRef.current) {
        editAudioPlayerRef.current.onended = null;
        editAudioPlayerRef.current.onerror = null;
        editAudioPlayerRef.current.pause();
      }
    } catch (_) {}
    editAudioPlayerRef.current = null;
    setEditAudioPlayingKey(null);
    setEditAudioLoadingKey(null);
  };
  var getReadAloudAudioKey = function (sentence, identityOptions) {
    var baseKey = '';
    try {
      var KS = window.AlloModules && window.AlloModules.KaraokeAudioStore;
      if (KS && typeof KS.keyFor === 'function') baseKey = KS.keyFor(sentence);
    } catch (_) {}
    if (!baseKey) baseKey = String(sentence || '').toLowerCase().replace(/\s+/g, ' ').trim();
    var occurrence = identityOptions && Number.isInteger(Number(identityOptions.occurrence)) ? Number(identityOptions.occurrence) : 0;
    return baseKey ? baseKey + '\u241f' + occurrence : '';
  };
  var updateEditAudioPlaybackIssue = function (sentence, issue, identityOptions) {
    var audioKey = getReadAloudAudioKey(sentence, identityOptions);
    if (!audioKey) return;
    setEditAudioPlaybackErrors(function (prev) {
      var next = Object.assign({}, prev);
      if (issue) next[audioKey] = issue;else delete next[audioKey];
      return next;
    });
  };
  var reportEditAudioPlaybackFailure = function (sentence, sentenceNumber, error, identityOptions) {
    if (error && error.name === 'NotAllowedError') {
      setEditAudioNotice('Audio playback was blocked. Press Play again.');
      return;
    }
    updateEditAudioPlaybackIssue(sentence, {
      code: error && error.name ? error.name : 'playback-failed',
      reason: 'The saved audio could not be decoded or loaded.'
    }, identityOptions);
    setEditAudioNotice('Saved audio for sentence ' + sentenceNumber + ' could not be played. Rebuild or replace it.');
  };
  var setSaveTtsAsPlayedEnabled = function (value) {
    var next = !!value;
    setSaveTtsAsPlayed(next);
    try {
      localStorage.setItem('allo_save_karaoke_audio', next ? '1' : '0');
    } catch (_) {}
  };
  React.useEffect(function () {
    if (typeof window === 'undefined') return;
    var onAudioUpdate = function () {
      setAudioStatusTick(function (n) {
        return n + 1;
      });
    };
    var onAudioCapture = function (event) {
      var detail = event && event.detail ? event.detail : {};
      if (generatedContent && generatedContent.id && detail.resourceId && detail.resourceId !== generatedContent.id) return;
      var key = getReadAloudAudioKey(detail.sentence, detail);
      if (!key) return;
      if (detail.status === 'saving') {
        setSavingAudioKeys(function (prev) {
          return Object.assign({}, prev, {
            [key]: true
          });
        });
        setCaptureAudioErrors(function (prev) {
          var next = Object.assign({}, prev);
          delete next[key];
          return next;
        });
      } else {
        setSavingAudioKeys(function (prev) {
          var next = Object.assign({}, prev);
          delete next[key];
          return next;
        });
        setCaptureAudioErrors(function (prev) {
          var next = Object.assign({}, prev);
          if (detail.status === 'error' || detail.status === 'limit') {
            next[key] = {
              status: detail.status,
              code: detail.code || 'capture-failed',
              reason: detail.reason || 'Played TTS could not be saved.'
            };
          } else {
            delete next[key];
          }
          return next;
        });
        if (detail.status === 'error' || detail.status === 'limit') {
          setEditAudioNotice(detail.reason || 'Played TTS could not be saved. Generate that sentence again to retry.');
        } else {
          updateEditAudioPlaybackIssue(detail.sentence, null, detail);
        }
        setAudioStatusTick(function (n) {
          return n + 1;
        });
      }
    };
    window.addEventListener('alloflow:karaoke-audio-updated', onAudioUpdate);
    window.addEventListener('alloflow:karaoke-audio-capture', onAudioCapture);
    return function () {
      window.removeEventListener('alloflow:karaoke-audio-updated', onAudioUpdate);
      window.removeEventListener('alloflow:karaoke-audio-capture', onAudioCapture);
    };
  }, [generatedContent && generatedContent.id]);
  React.useEffect(function () {
    setSavingAudioKeys({});
    setCaptureAudioErrors({});
    setEditAudioPlaybackErrors({});
  }, [generatedContent && generatedContent.id]);
  React.useEffect(function () {
    if (isEditingLeveledText) return;
    setEditAudioOpen(false);
    stopEditAudioPlayback();
    editAudioRecordTokenRef.current += 1;
    var recorder = editAudioMediaRecorderRef.current;
    try {
      if (recorder && recorder.state !== 'inactive') recorder.stop();
    } catch (_) {}
  }, [isEditingLeveledText]);
  React.useEffect(function () {
    setEditAudioOpen(false);
    stopEditAudioPlayback();
    setEditAudioMicRequestKey(null);
    setEditAudioRecordingKey(null);
    setEditAudioRecordingSaveKey(null);
    setRemoveAudioKey(null);
    setEditAudioNotice('');
    return function () {
      editAudioPlayTokenRef.current += 1;
      editAudioRecordTokenRef.current += 1;
      try {
        if (editAudioPlayerRef.current) {
          editAudioPlayerRef.current.onended = null;
          editAudioPlayerRef.current.onerror = null;
          editAudioPlayerRef.current.pause();
        }
      } catch (_) {}
      editAudioPlayerRef.current = null;
      if (editAudioRecordingTimerRef.current) clearTimeout(editAudioRecordingTimerRef.current);
      editAudioRecordingTimerRef.current = null;
      var recorder = editAudioMediaRecorderRef.current;
      try {
        if (recorder && recorder.state !== 'inactive') {
          recorder.onstop = null;
          recorder.stop();
        }
      } catch (_) {}
      editAudioMediaRecorderRef.current = null;
      var stream = editAudioMediaStreamRef.current;
      try {
        if (stream) stream.getTracks().forEach(function (track) {
          track.stop();
        });
      } catch (_) {}
      editAudioMediaStreamRef.current = null;
      editAudioChunksRef.current = [];
    };
  }, [generatedContent && generatedContent.id]);
  var cleanSentenceForAudio = function (sentence) {
    // Must mirror playSequence's textToSpeak cleaning (phase_k) — the store
    // key is derived from the cleaned sentence on BOTH sides, so a rule
    // present in one place but not the other orphans that sentence's audio.
    // Delegate to THE shared sanitizer when the phase_k module is loaded
    // (2026-07-17) so the two can never drift; the inline chain below is
    // the standalone fallback and must stay rule-identical to it.
    try {
      var _pk = window.AlloModules && window.AlloModules.PhaseKHelpers;
      if (_pk && typeof _pk.toSpokenText === 'function') return _pk.toSpokenText(sentence);
    } catch (_) {}
    return String(sentence || '').replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').replace(/\[?⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]?/g, '').replace(/\[Source\s+\d+\]/gi, '').replace(/\[\d+\]/g, '').replace(/^#{1,6}\s+/gm, '').replace(/\*\*/g, '').replace(/\*/g, '').replace(/__|_/g, '').replace(/~~/g, '').replace(/`/g, '').replace(/^>\s?/gm, '').replace(/^[-*+]\s/gm, '').replace(/^\d+\.\s/gm, '').replace(/\s+/g, ' ').trim();
  };
  var getReadAloudStore = function () {
    try {
      return window.AlloModules && window.AlloModules.KaraokeAudioStore && window.AlloModules.KaraokeAudioStore.current;
    } catch (_) {
      return null;
    }
  };
  var getStoredReadAloudAudioUrl = function (sentence, identityOptions) {
    try {
      var sharedInspect = typeof window !== 'undefined' && window.__alloInspectReadAloudAudio;
      if (typeof sharedInspect === 'function') {
        var inspection = sharedInspect(sentence, 'reference', identityOptions);
        if (inspection && inspection.storedUrl) return inspection.storedUrl;
        if (inspection && inspection.status === 'ready' && inspection.url) return inspection.url;
      }
    } catch (_) {}
    var st = getReadAloudStore();
    try {
      return st && typeof st.get === 'function' ? st.get(sentence, identityOptions || {}) : null;
    } catch (_) {
      return null;
    }
  };
  // The host can refresh callTTS while modules finish loading. Keep the
  // resolver identity tied only to the actual voice profile so capture-status
  // renders do not repeatedly invalidate karaoke's warm cache.
  var karaokeCallTTSRef = React.useRef(callTTS);
  karaokeCallTTSRef.current = callTTS;
  var getKaraokeAudioUrl = React.useCallback(function (sentenceText, requestOptions) {
    var voice = selectedVoice || typeof window !== 'undefined' && window.__alloSelectedVoice || 'Kore';
    var speed = typeof voiceSpeed === 'number' && voiceSpeed > 0 ? voiceSpeed : 1;
    var language = leveledTextLanguage || 'English';
    var options = Object.assign({
      language: language,
      maxRetries: 1,
      priority: 'interactive'
    }, requestOptions || {});
    options.language = language;
    // Snapshot the synthesis profile with the request. The shared service uses
    // it for compatibility and provider resolution, so a settings change
    // mid-request cannot relabel the voice the learner actually heard.
    options.profile = Object.assign({}, options.profile || {}, {
      voice: voice,
      speed: speed,
      synthesisRate: speed,
      language: language,
      voiceResolverVersion: 2
    });
    try {
      var sharedResolver = typeof window !== 'undefined' && window.__alloResolveReadAloudAudio;
      if (typeof sharedResolver === 'function') {
        return Promise.resolve(sharedResolver(sentenceText, options)).catch(function () {
          return null;
        });
      }
    } catch (_) {}
    // Direct store/callTTS compatibility path while the shared host module loads.
    try {
      var st = window.AlloModules && window.AlloModules.KaraokeAudioStore && window.AlloModules.KaraokeAudioStore.current;
      if (st) {
        // Stored-clip compatibility guard (2026-07-17): this resolver used
        // to return st.get() blind, bypassing the voice guard the main
        // playSequence path applies — so an older Puck AI clip kept playing
        // after the teacher selected Kore. The store's shared getCompatible
        // enforces voice/speed/language for AI takes; human recordings
        // remain voice-independent and always play.
        if (typeof st.getCompatible === 'function') {
          var compatibleUrl = st.getCompatible(sentenceText, {
            voice: voice,
            speed: speed,
            language: language
          });
          if (compatibleUrl) return Promise.resolve(compatibleUrl);
        } else {
          var storedUrl = st.get(sentenceText);
          if (storedUrl) return Promise.resolve(storedUrl);
        }
      }
    } catch (_) {}
    var resolver = karaokeCallTTSRef.current;
    if (typeof resolver !== 'function') return Promise.resolve(null);
    return Promise.resolve(resolver(sentenceText, voice, speed, options, language)).catch(function () {
      return null;
    });
  }, [selectedVoice, voiceSpeed, leveledTextLanguage]);
  var getReadAloudAudioProvenance = function (sentence, identityOptions) {
    var inspection = null;
    try {
      var sharedInspect = typeof window !== 'undefined' && window.__alloInspectReadAloudAudio;
      if (typeof sharedInspect === 'function') inspection = sharedInspect(sentence, 'reference', identityOptions);
    } catch (_) {}
    var st = getReadAloudStore();
    var source = inspection && inspection.source != null ? inspection.source : null;
    var metadata = inspection && inspection.metadata ? inspection.metadata : null;
    if (!inspection) {
      try {
        if (st && typeof st.sourceOf === 'function') source = st.sourceOf(sentence, identityOptions || {});
        if (st && typeof st.metadataOf === 'function') metadata = st.metadataOf(sentence, identityOptions || {});
      } catch (_) {}
    }
    if (source === 'human-teacher') return {
      source: source,
      label: simplifiedTeacherRecordingLabel,
      metadata: metadata,
      stale: false
    };
    if (source === 'human-student') return {
      source: source,
      label: simplifiedStudentRecordingLabel,
      metadata: metadata,
      stale: false
    };
    if (source && String(source).indexOf('human') === 0) return {
      source: source,
      label: simplifiedHumanRecordingLabel,
      metadata: metadata,
      stale: false
    };
    var currentVoice = selectedVoice || typeof window !== 'undefined' && window.__alloSelectedVoice || 'Kore';
    var currentSpeed = typeof voiceSpeed === 'number' && voiceSpeed > 0 ? voiceSpeed : 1;
    var currentLanguage = identityOptions && identityOptions.language ? identityOptions.language : leveledTextLanguage || 'English';
    var stale = inspection ? inspection.status === 'stale' : !metadata || Number(metadata.voiceResolverVersion) !== 2 || !!(metadata.voice && String(metadata.voice).toLowerCase() !== String(currentVoice).toLowerCase() || metadata.speed && Math.abs(Number(metadata.speed) - currentSpeed) > 0.001 || metadata.language && String(metadata.language).toLowerCase() !== String(currentLanguage).toLowerCase());
    var details = ['AI voice'];
    if (metadata && metadata.voice) details.push(metadata.voice);
    if (metadata && metadata.speed) details.push(Number(metadata.speed) + '×');
    if (metadata && metadata.language) details.push(metadata.language);
    return {
      source: source || 'ai',
      label: details.join(' · '),
      metadata: metadata,
      stale: stale
    };
  };
  var hasStoredReadAloudAudio = function (sentence, identityOptions) {
    try {
      var sharedInspect = typeof window !== 'undefined' && window.__alloInspectReadAloudAudio;
      if (typeof sharedInspect === 'function') {
        var inspection = sharedInspect(sentence, 'reference', identityOptions);
        if (inspection && inspection.status) return inspection.status === 'ready' || inspection.status === 'stale';
      }
    } catch (_) {}
    var st = getReadAloudStore();
    try {
      return !!(st && st.has(sentence, identityOptions || {}));
    } catch (_) {
      return false;
    }
  };
  var getReadAloudIdentityOptions = function (entry) {
    var language = entry && entry.language ? entry.language : leveledTextLanguage || 'English';
    var speed = typeof voiceSpeed === 'number' && voiceSpeed > 0 ? voiceSpeed : 1;
    var voice = selectedVoice || typeof window !== 'undefined' && window.__alloSelectedVoice || 'Kore';
    return {
      occurrence: entry && Number.isInteger(Number(entry.occurrence)) ? Number(entry.occurrence) : 0,
      identity: entry && entry.identity ? entry.identity : null,
      language: language,
      profile: {
        voice: voice,
        speed: speed,
        synthesisRate: speed,
        language: language,
        voiceResolverVersion: 2
      }
    };
  };
  var getReadAloudAudioSummary = function (sentences) {
    var list = Array.isArray(sentences) ? sentences : [];
    var entries = list.map(function (item, index) {
      return item && typeof item === 'object' ? item : {
        text: String(item || ''),
        occurrence: 0,
        identity: 'legacy:' + index
      };
    });
    var sharedSummary = null;
    try {
      var summaryResolver = typeof window !== 'undefined' && window.__alloGetReadAloudAudioSummary;
      if (typeof summaryResolver === 'function') {
        sharedSummary = summaryResolver(entries.map(function (entry) {
          return entry.text;
        }), 'reference', {
          entries: entries
        });
      }
    } catch (_) {}
    var saved = sharedSummary ? Number(sharedSummary.ready || 0) + Number(sharedSummary.stale || 0) : entries.reduce(function (n, entry) {
      return n + (hasStoredReadAloudAudio(entry.text, getReadAloudIdentityOptions(entry)) ? 1 : 0);
    }, 0);
    var bytes = sharedSummary ? Number(sharedSummary.estimatedBytes || 0) : 0;
    var maxBytes = 0;
    try {
      var st = getReadAloudStore();
      if (!sharedSummary && st && typeof st.estimateBytes === 'function') bytes = st.estimateBytes();
      if (st && typeof st.limits === 'function') maxBytes = st.limits().maxBytes || 0;
    } catch (_) {}
    return {
      saved: saved,
      total: entries.length,
      bytes: bytes,
      maxBytes: maxBytes
    };
  };
  var getReadAloudSentenceEntriesForText = function (rawText) {
    var text = typeof rawText === 'string' ? rawText : String(rawText || '');
    var isTableText = function (p) {
      return p.trim().startsWith('|') || p.indexOf('\n|') !== -1;
    };
    var splitForReadAloud = function (part) {
      try {
        var KS = window.AlloModules && window.AlloModules.KaraokeAudioStore;
        if (KS && typeof KS.splitSentences === 'function') return KS.splitSentences(part);
      } catch (_) {}
      return splitTextToSentences(part);
    };
    var splitBlock = function (block) {
      return String(block || '').split(/\n{2,}/).flatMap(function (p) {
        return isTableText(p) ? [] : splitForReadAloud(p);
      });
    };
    var parts = getSideBySideContent(text);
    var sourceList = [];
    var targetList = [];
    if (parts) {
      sourceList = parts.source.flatMap(function (p) {
        return isTableText(p) ? [] : splitForReadAloud(p);
      });
      targetList = parts.target.flatMap(function (p) {
        return isTableText(p) ? [] : splitForReadAloud(p);
      });
    } else {
      var marker = '--- ENGLISH TRANSLATION ---';
      var markerIndex = text.indexOf(marker);
      if (markerIndex >= 0) {
        sourceList = splitBlock(text.slice(0, markerIndex));
        targetList = splitBlock(text.slice(markerIndex + marker.length));
      } else {
        sourceList = splitBlock(text);
      }
    }
    var counts = new Map();
    var makeEntries = function (list, language, scope) {
      return list.map(function (sentence, index) {
        var cleaned = cleanSentenceForAudio(sentence);
        if (!cleaned || !cleaned.trim()) return null;
        // Match Phase K and the shared service exactly: occurrence is scoped
        // to identical spoken text. Case-folding here made distinct spoken
        // sentences consume each other's duplicate slot.
        var countKey = cleaned;
        var occurrence = counts.get(countKey) || 0;
        counts.set(countKey, occurrence + 1);
        return {
          text: cleaned,
          language: language || 'English',
          occurrence: occurrence,
          identity: scope + ':' + index + ':' + occurrence
        };
      }).filter(Boolean);
    };
    return makeEntries(sourceList, leveledTextLanguage || 'English', 'source').concat(makeEntries(targetList, 'English', 'target'));
  };
  var getReadAloudSentencesForText = function (rawText) {
    return getReadAloudSentenceEntriesForText(rawText).map(function (entry) {
      return entry.text;
    });
  };
  var karaokeReaderSentences = React.useMemo(function () {
    return getReadAloudSentencesForText(simplifiedReadAloudText);
  }, [generatedContent && generatedContent.data]);
  var activeReadAloudStatus = React.useMemo(function () {
    if (!isPlaying || playingContentId && playingContentId !== 'simplified-main') return '';
    var currentIndex = playbackState && Number(playbackState.currentIdx);
    if (!Number.isInteger(currentIndex) || currentIndex < 0) return '';
    var stateSentences = playbackState && Array.isArray(playbackState.sentences) ? playbackState.sentences : karaokeReaderSentences;
    var currentSentence = stateSentences[currentIndex];
    if (!currentSentence) return '';
    return 'Reading sentence ' + (currentIndex + 1) + ': ' + String(currentSentence);
  }, [isPlaying, playingContentId, playbackState && playbackState.currentIdx, playbackState && playbackState.sentences, karaokeReaderSentences]);
  var handlePrepareReadAloudAudio = async function () {
    if (ttsPrepRequestRef.current) return;
    if (typeof window.__alloPrepareReadAloud !== 'function') {
      setTtsPrepNotice('Audio tools are still loading. Please try again.');
      return;
    }
    var entries = getReadAloudSentenceEntriesForText(simplifiedReadAloudText);
    var sentences = entries.map(function (entry) {
      return entry.text;
    });
    if (!sentences.length) return;
    // Note: prep saves every sentence regardless of the capture toggle, and
    // capture now defaults ON — no longer force-enable it here, so a
    // teacher's explicit opt-out survives pressing Save TTS.
    var request = {
      context: ttsPrepContext,
      controller: typeof AbortController === 'function' ? new AbortController() : null
    };
    ttsPrepRequestRef.current = request;
    setTtsPrepNotice('');
    setTtsPrepState({
      busy: true,
      done: 0,
      total: sentences.length
    });
    try {
      var result = await window.__alloPrepareReadAloud(sentences, function (done, total) {
        if (ownsTtsPreparation(request)) setTtsPrepState({
          busy: true,
          done: done,
          total: total || sentences.length
        });
      }, {
        entries: entries,
        signal: request.controller && request.controller.signal
      });
      if (!ownsTtsPreparation(request)) return;
      if (result && result.remaining) {
        setTtsPrepNotice(result.failure && result.failure.reason || result.remaining + ' sentence audio clips remain. Run Save TTS again to retry only missing clips.');
      } else if (result && result.ok) {
        setTtsPrepNotice('Read-aloud audio is saved for all sentences.');
      }
    } catch (_) {
      if (ownsTtsPreparation(request)) setTtsPrepNotice(request.controller && request.controller.signal.aborted ? 'Audio saving stopped. Save TTS again to finish any missing clips.' : 'Audio could not be saved. Please try again.');
    } finally {
      if (ownsTtsPreparation(request)) {
        ttsPrepRequestRef.current = null;
        setTtsPrepState({
          busy: false,
          done: 0,
          total: 0
        });
      }
    }
  };
  var handleRegenerateReadAloudSentence = async function (sentence, key, sentenceNumber, identityOptions) {
    if (!sentence || regenAudioKey) return;
    if (typeof window.__alloRegenerateSentenceAudio !== 'function') {
      setEditAudioNotice('Sentence audio tools are still loading. Please try again.');
      return;
    }
    var wasSaved = hasStoredReadAloudAudio(sentence, identityOptions);
    if (editAudioPlayerRef.current && editAudioPlayerRef.current._alloSentenceKey === key) stopEditAudioPlayback();
    setRegenAudioKey(key);
    setEditAudioNotice((wasSaved ? 'Regenerating' : 'Generating') + ' sentence ' + sentenceNumber + ' audio...');
    try {
      var url = await window.__alloRegenerateSentenceAudio(sentence, identityOptions || {});
      if (!url) throw new Error('No audio was returned');
      updateEditAudioPlaybackIssue(sentence, null, identityOptions);
      setAudioStatusTick(function (n) {
        return n + 1;
      });
      setEditAudioNotice((wasSaved ? 'Regenerated' : 'Generated') + ' audio for sentence ' + sentenceNumber + '.');
    } catch (_) {
      setEditAudioNotice('Could not generate audio for sentence ' + sentenceNumber + '. Please try again.');
    } finally {
      setRegenAudioKey(null);
    }
  };
  var handlePlayEditAudioSentence = async function (sentence, key, sentenceNumber, identityOptions) {
    if (!sentence || editAudioLoadingKey) return;
    var current = editAudioPlayerRef.current;
    if (current && current._alloSentenceKey === key) {
      if (!current.paused) {
        try {
          current.pause();
        } catch (_) {}
        setEditAudioPlayingKey(null);
        setEditAudioNotice('Paused sentence ' + sentenceNumber + '.');
        return;
      }
      try {
        if (isFinite(current.duration) && current.currentTime >= current.duration) current.currentTime = 0;
        await current.play();
        updateEditAudioPlaybackIssue(sentence, null, identityOptions);
        setEditAudioPlayingKey(key);
        setEditAudioNotice('Playing sentence ' + sentenceNumber + '.');
      } catch (error) {
        reportEditAudioPlaybackFailure(sentence, sentenceNumber, error, identityOptions);
      }
      return;
    }
    if (!hasStoredReadAloudAudio(sentence, identityOptions)) {
      setEditAudioNotice('Generate or record audio for sentence ' + sentenceNumber + ' before playing it.');
      return;
    }
    stopEditAudioPlayback();
    var token = ++editAudioPlayTokenRef.current;
    setEditAudioLoadingKey(key);
    setEditAudioNotice('Loading sentence ' + sentenceNumber + ' audio...');
    try {
      var url = getStoredReadAloudAudioUrl(sentence, identityOptions);
      if (token !== editAudioPlayTokenRef.current) return;
      if (!url) throw new Error('No saved audio URL');
      var audio = new Audio(url);
      audio._alloSentenceKey = key;
      audio.preload = 'auto';
      // Preview the stored artifact exactly as students receive it.
      audio.playbackRate = 1;
      audio.onended = function () {
        if (editAudioPlayerRef.current === audio) {
          setEditAudioPlayingKey(null);
          setEditAudioNotice('Finished sentence ' + sentenceNumber + '.');
        }
      };
      audio.onerror = function () {
        if (editAudioPlayerRef.current === audio) {
          editAudioPlayerRef.current = null;
          setEditAudioPlayingKey(null);
          reportEditAudioPlaybackFailure(sentence, sentenceNumber, audio.error, identityOptions);
        }
      };
      editAudioPlayerRef.current = audio;
      await audio.play();
      if (token !== editAudioPlayTokenRef.current) {
        try {
          audio.pause();
        } catch (_) {}
        return;
      }
      updateEditAudioPlaybackIssue(sentence, null, identityOptions);
      setEditAudioPlayingKey(key);
      setEditAudioNotice('Playing sentence ' + sentenceNumber + '.');
    } catch (error) {
      if (token === editAudioPlayTokenRef.current) {
        editAudioPlayerRef.current = null;
        setEditAudioPlayingKey(null);
        reportEditAudioPlaybackFailure(sentence, sentenceNumber, error, identityOptions);
      }
    } finally {
      if (token === editAudioPlayTokenRef.current) setEditAudioLoadingKey(null);
    }
  };
  var releaseEditAudioStream = function () {
    if (editAudioRecordingTimerRef.current) clearTimeout(editAudioRecordingTimerRef.current);
    editAudioRecordingTimerRef.current = null;
    var stream = editAudioMediaStreamRef.current;
    try {
      if (stream) stream.getTracks().forEach(function (track) {
        track.stop();
      });
    } catch (_) {}
    editAudioMediaStreamRef.current = null;
  };
  var handleRecordEditAudioSentence = async function (sentence, key, sentenceNumber, identityOptions) {
    var activeRecorder = editAudioMediaRecorderRef.current;
    if (activeRecorder && activeRecorder._alloSentenceKey === key && activeRecorder.state !== 'inactive') {
      try {
        activeRecorder.stop();
        setEditAudioNotice('Finishing the recording for sentence ' + sentenceNumber + '...');
      } catch (_) {}
      return;
    }
    if (!sentence || editAudioRecordingKey || editAudioMicRequestKey || editAudioRecordingSaveKey) return;
    if (typeof window.__alloStoreRecordedSentenceAudio !== 'function') {
      setEditAudioNotice('Recorded-audio storage is still loading. Please try again.');
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function' || typeof window.MediaRecorder === 'undefined') {
      setEditAudioNotice('Microphone recording is not supported in this browser.');
      return;
    }
    stopEditAudioPlayback();
    var requestToken = ++editAudioRecordTokenRef.current;
    setEditAudioMicRequestKey(key);
    setEditAudioNotice('Opening the microphone for sentence ' + sentenceNumber + '...');
    var stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });
      if (requestToken !== editAudioRecordTokenRef.current) {
        try {
          stream.getTracks().forEach(function (track) {
            track.stop();
          });
        } catch (_) {}
        return;
      }
      editAudioMediaStreamRef.current = stream;
      var MediaRecorderCtor = window.MediaRecorder;
      var preferredTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
      var mimeType = '';
      if (typeof MediaRecorderCtor.isTypeSupported === 'function') {
        for (var typeIdx = 0; typeIdx < preferredTypes.length; typeIdx++) {
          if (MediaRecorderCtor.isTypeSupported(preferredTypes[typeIdx])) {
            mimeType = preferredTypes[typeIdx];
            break;
          }
        }
      }
      var recorder = mimeType ? new MediaRecorderCtor(stream, {
        mimeType: mimeType
      }) : new MediaRecorderCtor(stream);
      recorder._alloSentenceKey = key;
      editAudioChunksRef.current = [];
      recorder.ondataavailable = function (event) {
        if (event && event.data && event.data.size > 0) editAudioChunksRef.current.push(event.data);
      };
      recorder.onerror = function () {
        recorder._alloFailed = true;
        editAudioChunksRef.current = [];
        if (editAudioMediaRecorderRef.current === recorder) editAudioMediaRecorderRef.current = null;
        releaseEditAudioStream();
        setEditAudioMicRequestKey(null);
        setEditAudioRecordingKey(null);
        setEditAudioRecordingSaveKey(null);
        setEditAudioNotice('The microphone stopped unexpectedly. Please record sentence ' + sentenceNumber + ' again.');
      };
      recorder.onstop = async function () {
        var chunks = editAudioChunksRef.current.slice();
        editAudioChunksRef.current = [];
        if (editAudioMediaRecorderRef.current === recorder) editAudioMediaRecorderRef.current = null;
        releaseEditAudioStream();
        setEditAudioRecordingKey(null);
        var durationMs = Math.max(0, Date.now() - (recorder._alloStartedAt || editAudioRecordingStartedAtRef.current || Date.now()));
        if (recorder._alloFailed) return;
        if (!chunks.length) {
          setEditAudioNotice('No audio was captured for sentence ' + sentenceNumber + '.');
          return;
        }
        var recordedBlob = new Blob(chunks, {
          type: recorder.mimeType || mimeType || 'audio/webm'
        });
        setEditAudioRecordingSaveKey(key);
        setEditAudioNotice('Saving the teacher recording for sentence ' + sentenceNumber + ' as MP3...');
        try {
          var saved = await window.__alloStoreRecordedSentenceAudio(sentence, recordedBlob, 'human-teacher', Object.assign({}, identityOptions || {}, {
            durationMs: durationMs
          }));
          if (saved === false) throw new Error('Recording was not saved');
          setAudioStatusTick(function (n) {
            return n + 1;
          });
          updateEditAudioPlaybackIssue(sentence, null, identityOptions);
          setEditAudioNotice('Teacher recording saved for sentence ' + sentenceNumber + '.');
        } catch (_) {
          setEditAudioNotice('Could not save the recording for sentence ' + sentenceNumber + '. Please try again.');
        } finally {
          setEditAudioRecordingSaveKey(null);
        }
      };
      editAudioMediaRecorderRef.current = recorder;
      recorder._alloFailed = false;
      recorder._alloStartedAt = Date.now();
      editAudioRecordingStartedAtRef.current = recorder._alloStartedAt;
      recorder.start(250);
      editAudioRecordingTimerRef.current = setTimeout(function () {
        if (editAudioMediaRecorderRef.current === recorder && recorder.state !== 'inactive') {
          setEditAudioNotice('The two-minute recording limit was reached. Finishing sentence ' + sentenceNumber + '...');
          try {
            recorder.stop();
          } catch (_) {
            recorder.onerror();
          }
        }
      }, EDIT_AUDIO_MAX_RECORDING_MS);
      setEditAudioMicRequestKey(null);
      setEditAudioRecordingKey(key);
      setEditAudioNotice('Recording sentence ' + sentenceNumber + '. Press Stop when finished.');
    } catch (_) {
      editAudioMediaRecorderRef.current = null;
      editAudioChunksRef.current = [];
      releaseEditAudioStream();
      if (stream) {
        try {
          stream.getTracks().forEach(function (track) {
            track.stop();
          });
        } catch (_err) {}
      }
      if (requestToken === editAudioRecordTokenRef.current) {
        setEditAudioMicRequestKey(null);
        setEditAudioRecordingKey(null);
        setEditAudioNotice('Microphone access was not available. Check permission and try again.');
      }
    }
  };
  var handleRemoveReadAloudSentence = async function (sentence, key, sentenceNumber, identityOptions) {
    if (!sentence || removeAudioKey) return;
    if (typeof window.__alloRemoveSentenceAudio !== 'function') {
      setEditAudioNotice('Sentence audio removal is still loading. Please try again.');
      return;
    }
    if (editAudioPlayerRef.current && editAudioPlayerRef.current._alloSentenceKey === key) stopEditAudioPlayback();
    setRemoveAudioKey(key);
    setEditAudioNotice('Removing saved audio for sentence ' + sentenceNumber + '...');
    try {
      var removed = await window.__alloRemoveSentenceAudio(sentence, identityOptions || {});
      if (removed === false) throw new Error('Audio was not removed');
      setAudioStatusTick(function (n) {
        return n + 1;
      });
      updateEditAudioPlaybackIssue(sentence, null, identityOptions);
      setEditAudioNotice('Saved audio removed from sentence ' + sentenceNumber + '.');
    } catch (_) {
      setEditAudioNotice('Could not remove the audio for sentence ' + sentenceNumber + '.');
    } finally {
      setRemoveAudioKey(null);
    }
  };
  var handleToggleEditAudioPanel = function () {
    var next = !editAudioOpen;
    if (!next) {
      stopEditAudioPlayback();
      editAudioRecordTokenRef.current += 1;
      setEditAudioMicRequestKey(null);
      var recorder = editAudioMediaRecorderRef.current;
      try {
        if (recorder && recorder.state !== 'inactive') recorder.stop();
      } catch (_) {}
    }
    setEditAudioOpen(next);
  };
  // Read-aloud for the Define and Explain popups. Both go through the host's
  // handleSpeak, the same path the sentence reader, the immersive word
  // speaker and the glossary use, so voice, speed, provider fallback and
  // the global play state all match the rest of the app. Calling handleSpeak
  // again with the same content id while that id is playing stops it, so one
  // button serves as both play and stop.
  var SIMPLIFIED_DEFINE_AUDIO_ID = 'simplified-define-popup';
  var SIMPLIFIED_REVISION_AUDIO_ID = 'simplified-revision-popup';
  var simplifiedPopupReadAloudLabel = t('common.read_aloud') || 'Read this aloud';
  var simplifiedPopupStopReadingLabel = t('common.stop_reading') || 'Stop reading aloud';
  var simplifiedPopupListenLabel = t('common.listen') || 'Listen';
  var simplifiedPopupStopLabel = t('common.stop') || 'Stop';
  var simplifiedPopupSpokenText = function (parts) {
    return (Array.isArray(parts) ? parts : [parts]).map(function (part) {
      return String(part == null ? '' : part).replace(/\s+/g, ' ').trim();
    }).filter(Boolean).join('. ');
  };
  var renderSimplifiedPopupSpeaker = function (contentId, spokenText) {
    if (typeof handleSpeak !== 'function') return null;
    var text = simplifiedPopupSpokenText(spokenText);
    if (!text) return null;
    var active = !!isPlaying && playingContentId === contentId;
    return /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-simplified-popup-speaker": contentId,
      onClick: function () {
        handleSpeak(text, contentId, 0);
      },
      "aria-label": active ? simplifiedPopupStopReadingLabel : simplifiedPopupReadAloudLabel,
      title: active ? simplifiedPopupStopReadingLabel : simplifiedPopupReadAloudLabel,
      className: `min-h-11 flex items-center gap-1.5 rounded-full px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 ${active ? 'bg-indigo-700 text-white hover:bg-indigo-800' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`
    }, active ? /*#__PURE__*/React.createElement(StopCircle, {
      size: 14,
      "aria-hidden": "true"
    }) : /*#__PURE__*/React.createElement(Volume2, {
      size: 14,
      "aria-hidden": "true"
    }), /*#__PURE__*/React.createElement("span", null, active ? simplifiedPopupStopLabel : simplifiedPopupListenLabel));
  };
  // Closing a popup should not leave its audio running with nothing on
  // screen to stop it. The ref carries the live id into the effect cleanup.
  var simplifiedPlayingContentIdRef = React.useRef(null);
  simplifiedPlayingContentIdRef.current = playingContentId;
  var stopSimplifiedPopupAudio = function (contentId) {
    if (simplifiedPlayingContentIdRef.current === contentId && typeof stopPlayback === 'function') stopPlayback();
  };
  function containSimplifiedModalFocus(e, container, onEscape) {
    if (!e || !container) return;
    var nearestDialog = e.target && typeof e.target.closest === 'function' ? e.target.closest('[role="dialog"]') : null;
    if (nearestDialog && nearestDialog !== container) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      if (typeof onEscape === 'function') onEscape(e);
      return;
    }
    if (e.key !== 'Tab' || typeof container.querySelectorAll !== 'function') return;
    var focusable = Array.prototype.slice.call(container.querySelectorAll('button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')).filter(function (el) {
      return el && !el.hidden && el.getAttribute('aria-hidden') !== 'true';
    });
    if (!focusable.length) {
      e.preventDefault();
      container.focus();
      return;
    }
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
  React.useEffect(function () {
    if (!isImmersiveReaderActive || !generatedContent?.immersiveData) return undefined;
    var previouslyFocused = document.activeElement;
    var timer = setTimeout(function () {
      var closeButton = immersiveDialogRef.current && immersiveDialogRef.current.querySelector('button[aria-label]');
      if (closeButton) closeButton.focus();else if (immersiveDialogRef.current) immersiveDialogRef.current.focus();
    }, 0);
    return function () {
      clearTimeout(timer);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus();
    };
  }, [isImmersiveReaderActive]);
  React.useEffect(function () {
    if (!phonicsData) return undefined;
    var previouslyFocused = document.activeElement;
    var timer = setTimeout(function () {
      if (phonicsCloseRef.current) phonicsCloseRef.current.focus();
    }, 0);
    return function () {
      clearTimeout(timer);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus();
    };
  }, [!!phonicsData]);
  React.useEffect(function () {
    if (!definitionData) return undefined;
    var previouslyFocused = document.activeElement;
    var timer = setTimeout(function () {
      if (definitionCloseRef.current) definitionCloseRef.current.focus();
    }, 0);
    return function () {
      clearTimeout(timer);
      stopSimplifiedPopupAudio(SIMPLIFIED_DEFINE_AUDIO_ID);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function' && document.contains(previouslyFocused)) previouslyFocused.focus();
    };
  }, [!!definitionData]);
  React.useEffect(function () {
    if (!revisionData) return undefined;
    var previouslyFocused = document.activeElement;
    var timer = setTimeout(function () {
      if (revisionCloseRef.current) revisionCloseRef.current.focus();
    }, 0);
    return function () {
      clearTimeout(timer);
      stopSimplifiedPopupAudio(SIMPLIFIED_REVISION_AUDIO_ID);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function' && document.contains(previouslyFocused)) previouslyFocused.focus();
    };
  }, [!!revisionData]);
  var renderEditAudioSentenceTools = function () {
    if (!isTeacherMode || !isEditingLeveledText) return null;
    var sentences = getReadAloudSentenceEntriesForText(simplifiedReadAloudText);
    if (!sentences.length) return null;
    var summary = getReadAloudAudioSummary(sentences);
    var savingCount = Object.keys(savingAudioKeys || {}).length;
    var captureErrorCount = Object.keys(captureAudioErrors || {}).length;
    var panelId = 'allo-edit-audio-' + String(generatedContent && generatedContent.id || 'current').replace(/[^a-z0-9_-]/gi, '-');
    var anyRecordingWork = !!editAudioMicRequestKey || !!editAudioRecordingKey || !!editAudioRecordingSaveKey;
    return /*#__PURE__*/React.createElement("div", {
      className: "border-t border-orange-100 bg-orange-50/80"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2.5"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: handleToggleEditAudioPanel,
      "aria-expanded": editAudioOpen,
      "aria-controls": panelId,
      "aria-label": `${simplifiedAudioEditLabel}. ${summary.saved}/${summary.total} ${simplifiedAudioSavedLabel.toLowerCase()}.`,
      className: "inline-flex items-center justify-center sm:justify-start gap-2 px-3 py-2 rounded-lg text-xs font-bold bg-white text-orange-800 border border-orange-200 hover:bg-orange-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
    }, /*#__PURE__*/React.createElement(Volume2, {
      size: 14
    }), /*#__PURE__*/React.createElement("span", null, simplifiedAudioEditLabel), /*#__PURE__*/React.createElement("span", {
      className: "rounded-full bg-orange-100 text-orange-800 px-2 py-0.5 normal-case"
    }, summary.saved, "/", summary.total, " ", simplifiedAudioSavedLabel.toLowerCase(), summary.maxBytes ? ` · ${Math.round(summary.bytes / 104857.6) / 10}/${Math.round(summary.maxBytes / 104857.6) / 10} MB` : ''), editAudioOpen ? /*#__PURE__*/React.createElement(ChevronUp, {
      size: 14
    }) : /*#__PURE__*/React.createElement(ChevronDown, {
      size: 14
    })), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-center sm:justify-end gap-2 flex-wrap"
    }, savingCount > 0 && /*#__PURE__*/React.createElement("span", {
      className: "inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full px-2 py-1"
    }, /*#__PURE__*/React.createElement(RefreshCw, {
      size: 10,
      className: "animate-spin motion-reduce:animate-none"
    }), " ", simplifiedAudioSaveLabel, " ", savingCount), captureErrorCount > 0 && /*#__PURE__*/React.createElement("span", {
      role: "alert",
      className: "inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-1"
    }, /*#__PURE__*/React.createElement(AlertCircle, {
      size: 10
    }), " ", captureErrorCount, " ", simplifiedAudioErrorLabel), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: copyTtsDiagnostics,
      "aria-label": simplifiedAudioCopiedLabel,
      title: "Copies a technical trace of recent read-aloud attempts — paste it into a bug report if audio gets stuck.",
      className: "inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-full px-2 py-1 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
    }, ttsDiagCopied ? '✓ ' + simplifiedAudioCopiedLabel : '🩺 ' + simplifiedAudioDiagnosticsLabel), /*#__PURE__*/React.createElement("label", {
      className: "inline-flex items-center gap-1.5 text-[11px] text-slate-700 font-semibold cursor-pointer"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: saveTtsAsPlayed,
      onChange: function (event) {
        setSaveTtsAsPlayedEnabled(event.target.checked);
      },
      className: "accent-orange-600",
      "aria-label": simplifiedAudioSaveLabel
    }), /*#__PURE__*/React.createElement("span", null, simplifiedAudioSaveLabel)))), editAudioOpen && /*#__PURE__*/React.createElement("div", {
      id: panelId,
      role: "region",
      "aria-label": simplifiedAudioEditLabel,
      className: "border-t border-orange-100 bg-white p-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-start gap-2 mb-3 text-xs text-slate-600"
    }, /*#__PURE__*/React.createElement(Mic, {
      size: 14,
      className: "mt-0.5 shrink-0 text-orange-700"
    }), /*#__PURE__*/React.createElement("p", null, "Preview saved audio, generate a new AI voice, or record your own teacher narration for each sentence. Recordings replace that sentence only.")), editAudioNotice && /*#__PURE__*/React.createElement("div", {
      role: "status",
      "aria-live": "polite",
      className: "mb-3 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-800"
    }, editAudioNotice), /*#__PURE__*/React.createElement("div", {
      className: "space-y-2 max-h-[34rem] overflow-y-auto pr-1 custom-scrollbar"
    }, sentences.map(function (entry, i) {
      var sentence = entry.text;
      var identityOptions = getReadAloudIdentityOptions(entry);
      var key = 'simplified-' + i;
      var sentenceNumber = i + 1;
      var audioKey = getReadAloudAudioKey(sentence, identityOptions);
      var isSaving = !!savingAudioKeys[audioKey];
      var isSaved = hasStoredReadAloudAudio(sentence, identityOptions);
      var provenance = isSaved ? getReadAloudAudioProvenance(sentence, identityOptions) : {
        source: null,
        label: simplifiedAudioMissingLabel,
        stale: false
      };
      var captureIssue = captureAudioErrors[audioKey];
      var playbackIssue = editAudioPlaybackErrors[audioKey];
      var needsRebuild = !!(isSaved && (provenance.stale || playbackIssue));
      var isGenerating = regenAudioKey === key;
      var isLoading = editAudioLoadingKey === key;
      var isPlayingSentence = editAudioPlayingKey === key;
      var isMicRequest = editAudioMicRequestKey === key;
      var isRecording = editAudioRecordingKey === key;
      var isRecordingSave = editAudioRecordingSaveKey === key;
      var isRemoving = removeAudioKey === key;
      var statusLabel = isMicRequest ? simplifiedAudioEditLabel + ': ' + simplifiedAudioRecordLabel : isRecording ? simplifiedAudioRecordLabel : isRecordingSave ? simplifiedAudioSaveLabel : isGenerating ? isSaved ? simplifiedAudioRegenerateLabel : simplifiedAudioGenerateLabel : isRemoving ? simplifiedAudioRemoveLabel : isSaving ? simplifiedAudioSaveLabel : captureIssue ? captureIssue.status === 'limit' ? simplifiedAudioStorageLimitLabel : simplifiedAudioErrorLabel : playbackIssue ? simplifiedAudioSavedLabel + ' · ' + simplifiedAudioErrorLabel : provenance.stale ? simplifiedAudioSavedLabel + ' · ' + simplifiedAudioSettingsChangedLabel : isSaved ? simplifiedAudioSavedLabel : simplifiedAudioMissingLabel;
      var statusClass = isRecording ? 'bg-red-50 text-red-700 border-red-200' : isMicRequest || isRecordingSave || isGenerating || isRemoving || isSaving || isLoading ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : captureIssue ? captureIssue.status === 'limit' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-red-50 text-red-700 border-red-200' : playbackIssue ? 'bg-red-50 text-red-700 border-red-200' : provenance.stale ? 'bg-amber-50 text-amber-800 border-amber-200' : isSaved ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200';
      var controlsBlocked = isSaving || isGenerating || isRemoving || ttsPrepState.busy;
      var recordDisabled = !isRecording && (anyRecordingWork || !!regenAudioKey || !!removeAudioKey || isSaving || ttsPrepState.busy);
      var actionClass = 'inline-flex items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-45 disabled:cursor-not-allowed';
      return /*#__PURE__*/React.createElement("div", {
        key: key,
        className: "rounded-xl border border-slate-200 bg-slate-50/70 p-3"
      }, /*#__PURE__*/React.createElement("div", {
        className: "flex items-start gap-2"
      }, /*#__PURE__*/React.createElement("span", {
        className: "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[11px] font-black text-orange-800",
        "aria-hidden": "true"
      }, sentenceNumber), /*#__PURE__*/React.createElement("div", {
        className: "min-w-0 flex-1"
      }, /*#__PURE__*/React.createElement("p", {
        dir: "auto",
        className: "text-sm font-medium leading-relaxed text-slate-800"
      }, sentence), /*#__PURE__*/React.createElement("div", {
        className: "mt-1.5 flex items-center gap-1.5 flex-wrap",
        "aria-label": `${simplifiedAudioEditLabel} ${sentenceNumber}: ${statusLabel}. ${provenance.label}.`
      }, /*#__PURE__*/React.createElement("span", {
        className: `inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusClass}`
      }, isMicRequest || isRecordingSave || isGenerating || isRemoving || isSaving || isLoading ? /*#__PURE__*/React.createElement(RefreshCw, {
        size: 9,
        className: "animate-spin motion-reduce:animate-none"
      }) : isRecording ? /*#__PURE__*/React.createElement("span", {
        className: "h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse motion-reduce:animate-none"
      }) : captureIssue || needsRebuild ? /*#__PURE__*/React.createElement(AlertCircle, {
        size: 9
      }) : isSaved ? /*#__PURE__*/React.createElement(CheckCircle2, {
        size: 9
      }) : /*#__PURE__*/React.createElement(AlertCircle, {
        size: 9
      }), statusLabel), /*#__PURE__*/React.createElement("span", {
        className: "text-[10px] font-semibold text-slate-500"
      }, provenance.label)))), /*#__PURE__*/React.createElement("div", {
        role: "group",
        "aria-label": `${simplifiedAudioEditLabel} ${sentenceNumber}`,
        className: "mt-2.5 flex items-center gap-1.5 flex-wrap"
      }, /*#__PURE__*/React.createElement("button", {
        type: "button",
        onClick: function () {
          handlePlayEditAudioSentence(sentence, key, sentenceNumber, identityOptions);
        },
        disabled: !isSaved || isLoading || controlsBlocked || anyRecordingWork || !!editAudioLoadingKey && !isLoading,
        "aria-pressed": isPlayingSentence,
        "aria-label": `${isPlayingSentence ? simplifiedAudioPauseLabel : simplifiedAudioPlayLabel} ${sentenceNumber}`,
        title: !isSaved ? simplifiedAudioGenerateLabel : isPlayingSentence ? simplifiedAudioPauseLabel : simplifiedAudioPlayLabel,
        className: `${actionClass} bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50`
      }, isLoading ? /*#__PURE__*/React.createElement(RefreshCw, {
        size: 12,
        className: "animate-spin motion-reduce:animate-none"
      }) : isPlayingSentence ? /*#__PURE__*/React.createElement(Pause, {
        size: 12
      }) : /*#__PURE__*/React.createElement(Play, {
        size: 12
      }), /*#__PURE__*/React.createElement("span", null, isLoading ? simplifiedAudioLoadingLabel : isPlayingSentence ? simplifiedAudioPauseLabel : simplifiedAudioPlayLabel)), /*#__PURE__*/React.createElement("button", {
        type: "button",
        onClick: function () {
          handleRegenerateReadAloudSentence(sentence, key, sentenceNumber, identityOptions);
        },
        disabled: !!regenAudioKey || isSaving || isRemoving || anyRecordingWork || ttsPrepState.busy,
        "aria-label": `${needsRebuild ? simplifiedAudioRegenerateLabel : isSaved ? simplifiedAudioRegenerateLabel : simplifiedAudioGenerateLabel} ${sentenceNumber}`,
        title: isSaved ? simplifiedAudioRegenerateLabel : simplifiedAudioGenerateLabel,
        className: `${actionClass} bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50`
      }, isGenerating ? /*#__PURE__*/React.createElement(RefreshCw, {
        size: 12,
        className: "animate-spin motion-reduce:animate-none"
      }) : /*#__PURE__*/React.createElement(Volume2, {
        size: 12
      }), /*#__PURE__*/React.createElement("span", null, isGenerating ? isSaved ? simplifiedAudioRegenerateLabel : simplifiedAudioGenerateLabel : needsRebuild ? simplifiedAudioRegenerateLabel : isSaved ? simplifiedAudioRegenerateLabel : simplifiedAudioGenerateLabel)), /*#__PURE__*/React.createElement("button", {
        type: "button",
        onClick: function () {
          handleRecordEditAudioSentence(sentence, key, sentenceNumber, identityOptions);
        },
        disabled: recordDisabled,
        "aria-pressed": isRecording,
        "aria-label": `${isRecording ? simplifiedAudioStopLabel : simplifiedAudioRecordLabel} ${sentenceNumber}`,
        title: isRecording ? simplifiedAudioStopLabel : simplifiedAudioRecordLabel,
        className: `${actionClass} ${isRecording ? 'bg-red-600 text-white border-red-700 hover:bg-red-700' : 'bg-white text-fuchsia-700 border-fuchsia-200 hover:bg-fuchsia-50'}`
      }, isMicRequest || isRecordingSave ? /*#__PURE__*/React.createElement(RefreshCw, {
        size: 12,
        className: "animate-spin motion-reduce:animate-none"
      }) : isRecording ? /*#__PURE__*/React.createElement(StopCircle, {
        size: 12
      }) : /*#__PURE__*/React.createElement(Mic, {
        size: 12
      }), /*#__PURE__*/React.createElement("span", null, isMicRequest ? simplifiedAudioRecordLabel : isRecording ? simplifiedAudioStopLabel : isRecordingSave ? simplifiedAudioSaveLabel : simplifiedAudioRecordLabel)), isSaved && /*#__PURE__*/React.createElement("button", {
        type: "button",
        onClick: function () {
          handleRemoveReadAloudSentence(sentence, key, sentenceNumber, identityOptions);
        },
        disabled: !!removeAudioKey || isSaving || !!regenAudioKey || anyRecordingWork || ttsPrepState.busy,
        "aria-label": `${simplifiedAudioRemoveLabel} ${sentenceNumber}`,
        className: `${actionClass} bg-white text-rose-700 border-rose-200 hover:bg-rose-50`
      }, isRemoving ? /*#__PURE__*/React.createElement(RefreshCw, {
        size: 12,
        className: "animate-spin motion-reduce:animate-none"
      }) : /*#__PURE__*/React.createElement(Trash2, {
        size: 12
      }), /*#__PURE__*/React.createElement("span", null, isRemoving ? simplifiedAudioRemoveLabel : simplifiedAudioRemoveLabel))));
    }))));
  };
  var instructionalTextProfile = getSimplifiedInstructionalText(generatedContent);
  var instructionalRole = instructionalTextProfile.role || 'unspecified';
  var replacementIsEducatorAuthorized = !!(instructionalTextProfile.replacementAuthorization && instructionalTextProfile.replacementAuthorization.authorized === true && instructionalTextProfile.replacementAuthorization.source === 'educator');
  var instructionalRoleLabel = instructionalRole === 'supplemental' ? 'Supplemental access version' : instructionalRole === 'primary' && replacementIsEducatorAuthorized ? 'Primary replacement — educator designated' : instructionalRole === 'primary' ? 'Primary replacement — authorization missing' : 'Instructional role not designated';
  var instructionalRoleTone = instructionalRole === 'supplemental' ? 'bg-blue-50 text-blue-900 border-blue-200' : instructionalRole === 'primary' && replacementIsEducatorAuthorized ? 'bg-violet-50 text-violet-900 border-violet-200' : instructionalRole === 'primary' ? 'bg-red-50 text-red-900 border-red-200' : 'bg-amber-50 text-amber-900 border-amber-200';
  var isSupplementalSourceUnlinked = instructionalRole === 'supplemental' && !instructionalTextProfile.sourceArtifactId && !instructionalTextProfile.primaryArtifactId;
  var handleInstructionalRoleChange = function (event) {
    var nextRole = event && event.target ? event.target.value : 'unspecified';
    if (nextRole === 'primary' && !(instructionalRole === 'primary' && replacementIsEducatorAuthorized)) {
      var confirmed = false;
      try {
        confirmed = window.confirm('Designate this adapted text as the primary replacement? This records an educator-authorized replacement decision. Continue only when replacement is permitted by the student’s documented plan, the instructional target, assessment conditions, and local policy.');
      } catch (_) {}
      if (!confirmed) return;
    }
    var fullBase = findFullHistoryArtifact(history, generatedContent);
    // The open item wins for mutable display fields, while the history copy
    // supplies any metadata omitted by an older hydration path.
    fullBase = Object.assign({}, fullBase || {}, generatedContent || {});
    var updated = updateSimplifiedInstructionalRole(fullBase, nextRole);
    if (typeof setGeneratedContent === 'function') setGeneratedContent(updated);
    if (typeof setHistory === 'function') {
      setHistory(function (previousHistory) {
        return upsertFullHistoryArtifact(previousHistory, generatedContent, updated);
      });
    }
  };
  var instructionalRoleControl = !isZenMode && generatedContent ? /*#__PURE__*/React.createElement("div", {
    className: "mb-4 rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 shadow-sm",
    "data-instructional-role": instructionalRole,
    "data-help-key": "simplified_instructional_role"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center justify-between gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] font-bold uppercase tracking-wider text-slate-600"
  }, "Instructional use"), /*#__PURE__*/React.createElement("span", {
    className: `rounded-full border px-2.5 py-1 text-xs font-bold ${instructionalRoleTone}`
  }, instructionalRoleLabel)), isTeacherMode && /*#__PURE__*/React.createElement("label", {
    className: "flex min-w-0 max-w-full items-center gap-2 text-xs font-semibold text-slate-700"
  }, /*#__PURE__*/React.createElement("span", {
    className: "sr-only"
  }, "Set instructional text role"), /*#__PURE__*/React.createElement("select", {
    value: instructionalRole,
    onChange: handleInstructionalRoleChange,
    "aria-label": "Set instructional text role",
    className: "min-w-0 max-w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
  }, /*#__PURE__*/React.createElement("option", {
    value: "supplemental"
  }, "Supplemental access version"), /*#__PURE__*/React.createElement("option", {
    value: "primary"
  }, "Primary replacement (educator authorization)"), /*#__PURE__*/React.createElement("option", {
    value: "unspecified"
  }, "Not designated")))), isTeacherMode && /*#__PURE__*/React.createElement("p", {
    className: "mt-1.5 text-[11px] leading-relaxed text-slate-600"
  }, "Adapted text remains supplemental by default. Choosing Primary replacement records your educator authorization; use it only when the instructional plan permits replacing the primary text."), isTeacherMode && isSupplementalSourceUnlinked && /*#__PURE__*/React.createElement("p", {
    role: "status",
    className: "mt-2 flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] font-semibold text-amber-900"
  }, /*#__PURE__*/React.createElement(AlertCircle, {
    size: 13,
    className: "mt-0.5 shrink-0"
  }), /*#__PURE__*/React.createElement("span", null, "This supplemental version is not linked to a source or primary artifact. Keep the source text in the resource history before sharing this version."))) : null;
  var simplifiedComplexityDisplay = getSimplifiedComplexityDisplay(generatedContent, gradeLevel);
  var readingColumnState = React.useState(72);
  var readingColumn = readingColumnState[0],
    setReadingColumn = readingColumnState[1];
  var readingEndRef = React.useRef(null);
  var comparisonLanguageState = React.useState('auto');
  var comparisonLanguage = comparisonLanguageState[0],
    setComparisonLanguage = comparisonLanguageState[1];
  React.useEffect(function () {
    setComparisonLanguage('auto');
  }, [generatedContent && generatedContent.id]);
  var readerText = function (key, fallback) {
    var value = t(key);
    return value && value !== key ? value : fallback;
  };
  var readingLanguage = generatedContent?.config?.language || generatedContent?.instructionalText?.complexity?.language || leveledTextLanguage || 'English';
  var wordHelpHint = readerText('simplified.word_navigation_hint', 'Choose a word for help. Use Left and Right arrows to move between words.');
  var comparisonSourceState = React.useState('linked');
  var comparisonSourceId = comparisonSourceState[0],
    setComparisonSourceId = comparisonSourceState[1];
  React.useEffect(function () {
    setComparisonSourceId('linked');
  }, [generatedContent && generatedContent.id]);
  function renderSimplifiedComparison() {
    var resolved = resolveSimplifiedCompareSource(history, generatedContent, inputText);
    var candidates = (history || []).filter(item => item.id !== generatedContent.id && ['analysis', 'simplified'].includes(item.type) && getArtifactReadingText(item));
    var selected = candidates.find(item => String(item.id) === comparisonSourceId);
    var original = selected ? {
      text: getArtifactReadingText(selected),
      artifact: selected,
      selection: 'educator-selected'
    } : resolved;
    var originalLanguage = original.artifact?.config?.language || original.artifact?.instructionalText?.complexity?.language || '';
    var adaptedParts = getSideBySideContent(simplifiedDisplayBody);
    var sourceParts = getSideBySideContent(original.text);
    var effectiveLanguage = comparisonLanguage === 'auto' ? adaptedParts && simplifiedLanguageTag(originalLanguage)?.startsWith('en') ? 'english' : 'adapted' : comparisonLanguage;
    var targetText = adaptedParts ? effectiveLanguage === 'english' ? adaptedParts.targetFull : adaptedParts.sourceFull : simplifiedDisplayBody;
    var sourceText = sourceParts ? effectiveLanguage === 'english' ? sourceParts.targetFull : sourceParts.sourceFull : original.text;
    var targetLanguage = effectiveLanguage === 'english' && adaptedParts ? 'English' : readingLanguage;
    if (sourceParts && effectiveLanguage === 'english') originalLanguage = 'English';
    var stripReferences = value => {
      try {
        return splitReferencesFromBody ? splitReferencesFromBody(String(value || '')).body : String(value || '');
      } catch (_) {
        return String(value || '');
      }
    };
    sourceText = stripReferences(sourceText);
    targetText = stripReferences(targetText);
    // Tokenize whitespace too, so comparison preserves paragraphs and line breaks.
    // Bound the quadratic work; long texts use complete, unchanged source panels.
    var oldTokens = sourceText.match(/\s+|\S+/g) || [],
      newTokens = targetText.match(/\s+|\S+/g) || [];
    var tooLarge = oldTokens.length * newTokens.length > 1000000;
    var mismatch = simplifiedLanguageTag(originalLanguage) && simplifiedLanguageTag(targetLanguage) && simplifiedLanguageTag(originalLanguage).split('-')[0] !== simplifiedLanguageTag(targetLanguage).split('-')[0];
    var showDiff = !tooLarge && !mismatch && sourceText && targetText;
    var diff = [];
    if (showDiff) {
      var matrix = Array.from({
        length: oldTokens.length + 1
      }, () => new Uint32Array(newTokens.length + 1));
      for (var a = 1; a <= oldTokens.length; a++) for (var b = 1; b <= newTokens.length; b++) matrix[a][b] = oldTokens[a - 1] === newTokens[b - 1] ? matrix[a - 1][b - 1] + 1 : Math.max(matrix[a - 1][b], matrix[a][b - 1]);
      var x = oldTokens.length,
        y = newTokens.length;
      while (x || y) {
        if (x && y && oldTokens[x - 1] === newTokens[y - 1]) {
          diff.push({
            type: 'same',
            value: oldTokens[--x]
          });
          --y;
        } else if (x && (!y || matrix[x - 1][y] >= matrix[x][y - 1])) diff.push({
          type: 'del',
          value: oldTokens[--x]
        });else diff.push({
          type: 'add',
          value: newTokens[--y]
        });
      }
      diff.reverse();
    }
    var count = text => simplifiedWordSegments(simplifiedPlainInline(text), targetLanguage).filter(part => part.word).length;
    var renderVersion = (kind, raw) => showDiff ? diff.filter(part => part.type !== (kind === 'source' ? 'add' : 'del')).map((part, i) => part.type === 'same' ? /*#__PURE__*/React.createElement(React.Fragment, {
      key: i
    }, part.value) : part.type === 'del' ? /*#__PURE__*/React.createElement("del", {
      key: i,
      className: "bg-red-100 text-red-900"
    }, part.value) : /*#__PURE__*/React.createElement("ins", {
      key: i,
      className: "bg-green-100 text-green-900"
    }, part.value)) : raw;
    return /*#__PURE__*/React.createElement("div", {
      "data-reading-comparison": "true",
      className: "space-y-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap gap-3 rounded-xl bg-white p-4 border border-slate-200"
    }, /*#__PURE__*/React.createElement("label", {
      className: "min-w-0 flex-1 text-sm font-semibold"
    }, readerText('simplified.compare_source', 'Source version'), /*#__PURE__*/React.createElement("select", {
      value: comparisonSourceId,
      onChange: e => setComparisonSourceId(e.target.value),
      className: "mt-1 block w-full min-w-0 rounded border border-slate-300 p-2"
    }, /*#__PURE__*/React.createElement("option", {
      value: "linked"
    }, readerText('simplified.linked_source', 'Linked source / original')), candidates.map(item => /*#__PURE__*/React.createElement("option", {
      key: item.id,
      value: String(item.id)
    }, item.title || item.topic || item.id)))), adaptedParts && /*#__PURE__*/React.createElement("label", {
      className: "min-w-0 flex-1 text-sm font-semibold"
    }, readerText('simplified.compare_language', 'Adapted version'), /*#__PURE__*/React.createElement("select", {
      value: comparisonLanguage,
      onChange: e => setComparisonLanguage(e.target.value),
      className: "mt-1 block w-full rounded border border-slate-300 p-2"
    }, /*#__PURE__*/React.createElement("option", {
      value: "auto"
    }, readerText('simplified.compare_auto', 'Match source language when known')), /*#__PURE__*/React.createElement("option", {
      value: "adapted"
    }, readingLanguage), /*#__PURE__*/React.createElement("option", {
      value: "english"
    }, simplifiedEnglishTranslationLabel)))), original.selection.endsWith('fallback') && /*#__PURE__*/React.createElement("p", {
      role: "status",
      className: "rounded bg-amber-50 p-3 text-sm text-amber-900"
    }, readerText('simplified.compare_fallback', 'The linked original is unavailable. Check the selected source before reviewing changes.')), (tooLarge || mismatch) && /*#__PURE__*/React.createElement("p", {
      role: "status",
      className: "rounded bg-indigo-50 p-3 text-sm text-indigo-900"
    }, mismatch ? readerText('simplified.compare_different_languages', 'These versions use different languages. Read them side by side; word change highlighting is unavailable.') : readerText('simplified.compare_long_text', 'For this long reading, complete versions are shown without word change highlighting.')), /*#__PURE__*/React.createElement("p", {
      className: "text-sm text-slate-600"
    }, readerText('simplified.compare_word_count', 'Word counts'), ": ", count(sourceText), " → ", count(targetText), ". ", readerText('simplified.compare_review_hint', 'Check key ideas, terminology, examples, and citations before sharing. Word changes alone do not establish accuracy.')), /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-1 md:grid-cols-2 gap-4"
    }, [{
      key: 'source',
      title: t('simplified.diff_original'),
      text: sourceText,
      language: originalLanguage
    }, {
      key: 'adapted',
      title: t('simplified.diff_adapted'),
      text: targetText,
      language: targetLanguage
    }].map(version => /*#__PURE__*/React.createElement("section", {
      key: version.key,
      className: "min-w-0 rounded-xl border border-slate-300 bg-white p-4"
    }, /*#__PURE__*/React.createElement("h3", {
      className: "mb-3 font-bold"
    }, version.title, version.language ? ' · ' + version.language : ''), /*#__PURE__*/React.createElement("div", {
      "data-compare-version": version.key,
      lang: simplifiedLanguageTag(version.language),
      dir: getContentDirection(version.language),
      style: {
        whiteSpace: 'pre-wrap',
        overflowWrap: 'anywhere',
        maxHeight: '70vh',
        overflowY: 'auto'
      },
      tabIndex: 0,
      role: "region",
      "aria-label": version.title
    }, renderVersion(version.key, version.text))))));
  }
  function renderSimplifiedReading() {
    var parts = getSideBySideContent(simplifiedReadAloudText);
    var languages = parts ? [{
      key: 'src',
      label: readingLanguage,
      paragraphs: parts.source
    }, {
      key: 'tgt',
      label: 'English',
      paragraphs: parts.target
    }] : [{
      key: 'mono',
      label: readingLanguage,
      paragraphs: simplifiedReadAloudText.split(/\n{2,}/)
    }];
    var isWordMode = ['define', 'phonics', 'add-glossary'].includes(interactionMode);
    var isSelectionMode = ['explain', 'revise'].includes(interactionMode);
    var sentenceCursor = 0;
    var rendered = languages.map(function (section) {
      return section.paragraphs.map(function (paragraph, paragraphIndex) {
        var paragraphId = section.key === 'mono' ? paragraphIndex : section.key + '-' + paragraphIndex;
        if (paragraph.trim().startsWith('|') || paragraph.includes('\n|')) return /*#__PURE__*/React.createElement("div", {
          key: paragraphId,
          "data-reading-table": "true",
          lang: simplifiedLanguageTag(section.label),
          dir: section.key === 'tgt' ? 'ltr' : getContentDirection(section.label),
          className: "my-4 max-w-full overflow-x-auto",
          tabIndex: 0,
          role: "region",
          "aria-label": readerText('simplified.table_label', 'Reading table')
        }, renderFormattedText(paragraph, false));
        var startIdx = sentenceCursor;
        var blocks = simplifiedParagraphBlocks(paragraph).map(function (block) {
          block.start = sentenceCursor;
          block.sentences = splitTextToSentences(block.raw);
          sentenceCursor += block.sentences.length;
          return block;
        });
        var endIdx = sentenceCursor;
        var shouldFocus = isPlaying ? playbackState.currentIdx >= startIdx && playbackState.currentIdx < endIdx : focusedParagraphIndex === paragraphId;
        var wordIndex = 0;
        var renderWords = function (text) {
          return simplifiedWordSegments(text, section.label).map(function (part, index) {
            if (!part.word) return /*#__PURE__*/React.createElement(React.Fragment, {
              key: index
            }, part.text);
            var order = wordIndex++;
            var label = interactionMode === 'phonics' ? simplifiedHearPhonicsLabel : interactionMode === 'add-glossary' ? readerText('common.click_add_glossary', 'Add to glossary') : simplifiedDefineLabel;
            var activate = function (event) {
              event.stopPropagation();
              if (interactionMode === 'phonics') handlePhonicsClick(part.text, event);else if (interactionMode === 'add-glossary') handleQuickAddGlossary(part.text, true);else handleWordClick(part.text, event);
            };
            return /*#__PURE__*/React.createElement("span", {
              key: index,
              "data-reading-word": order,
              role: "button",
              tabIndex: order === 0 ? 0 : -1,
              "aria-label": label + ': ' + part.text,
              title: label,
              onClick: activate,
              onFocus: function (event) {
                var group = event.currentTarget.closest('[data-reading-paragraph]');
                if (group) group.querySelectorAll('[data-reading-word]').forEach(function (node) {
                  node.tabIndex = node === event.currentTarget ? 0 : -1;
                });
              },
              onKeyDown: function (event) {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  activate(event);
                  return;
                }
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                var group = event.currentTarget.closest('[data-reading-paragraph]');
                if (!group) return;
                var words = Array.from(group.querySelectorAll('[data-reading-word]'));
                var rtl = group.dir === 'rtl';
                var delta = (event.key === 'ArrowRight' ? 1 : -1) * (rtl ? -1 : 1);
                var next = event.key === 'Home' ? 0 : event.key === 'End' ? words.length - 1 : Math.max(0, Math.min(words.length - 1, words.indexOf(event.currentTarget) + delta));
                event.preventDefault();
                words[next]?.focus();
              },
              className: "cursor-help rounded px-0.5 hover:bg-yellow-100 focus:bg-yellow-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1"
            }, part.text);
          });
        };
        var renderBlock = function (block, key) {
          var Tag = block.type === 'heading' ? 'h' + Math.min(6, block.level) : block.type === 'quote' ? 'blockquote' : block.type === 'li' ? 'span' : 'p';
          var text = block.text === undefined ? block.raw : block.text;
          var content;
          if (isWordMode || isSelectionMode) content = simplifiedInline(text, isWordMode ? renderWords : value => value);else content = block.sentences.map(function (sentence, index) {
            var currentGlobalIdx = block.start + index;
            var cleanText = sentence.replace(/^\s*#{1,6}\s+/, '').replace(/^\s*<\/?h[1-6][^>]*>/gi, '').replace(/<\/h[1-6]>\s*$/i, '').replace(/^\s*(?:[-+*]|\d+[.)])\s+/, '').replace(/^\s*>\s?/, '');
            var active = playbackState.currentIdx === currentGlobalIdx;
            if (interactionMode === 'cloze') return /*#__PURE__*/React.createElement("span", {
              key: index
            }, formatInteractiveText(cleanText, true, !!isLineFocusMode), " ");
            var speakSentence = function (event) {
              if (event.target.closest('a,button,input,select,textarea')) return;
              event.stopPropagation();
              handleSpeak(simplifiedReadAloudText, 'simplified-main', currentGlobalIdx);
            };
            return /*#__PURE__*/React.createElement("span", {
              key: index,
              id: 'sentence-' + currentGlobalIdx,
              "data-reading-sentence": currentGlobalIdx,
              role: "button",
              tabIndex: 0,
              "aria-current": active ? 'true' : undefined,
              "aria-label": simplifiedReadSentenceLabel + ': ' + simplifiedPlainInline(cleanText),
              onClick: speakSentence,
              onKeyDown: function (event) {
                if (event.target !== event.currentTarget || event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                speakSentence(event);
              },
              className: `rounded px-0.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1 ${active ? 'bg-yellow-300 text-slate-950' : 'hover:bg-indigo-100/30'}`,
              title: t('common.click_read_from_here')
            }, formatInteractiveText(cleanText, false, !!isLineFocusMode), " ");
          });
          var style = {
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
            lineHeight: 'inherit'
          };
          if (block.type === 'heading') {
            style.fontWeight = 750;
            style.fontSize = block.level === 1 ? '1.5em' : block.level === 2 ? '1.3em' : '1.15em';
            style.marginBlock = '0.9em 0.45em';
          }
          return /*#__PURE__*/React.createElement(Tag, {
            key: key,
            style: style,
            className: block.type === 'quote' ? 'border-l-4 border-indigo-200 pl-4 my-3 italic' : block.type === 'p' ? 'my-3' : undefined
          }, content);
        };
        return /*#__PURE__*/React.createElement("div", _extends({
          key: paragraphId,
          "data-reading-paragraph": paragraphId,
          "data-reading-language": section.label,
          lang: simplifiedLanguageTag(section.label),
          dir: section.key === 'tgt' ? 'ltr' : getContentDirection(section.label)
        }, lineFocusParagraphProps(paragraphId), {
          onMouseUp: isSelectionMode ? handleTextMouseUp : undefined,
          className: `mb-4 rounded-xl transition-opacity motion-reduce:transition-none ${isLineFocusMode ? shouldFocus ? 'opacity-100 bg-slate-800 p-4 text-white' : 'opacity-20 blur-[1px]' : section.key === 'tgt' ? 'text-slate-700' : 'text-slate-800'}`
        }), simplifiedNestLists(blocks, renderBlock));
      });
    });
    var sourceDirection = getContentDirection(readingLanguage);
    return /*#__PURE__*/React.createElement("div", {
      "data-simplified-reading-body": "true",
      className: "w-full min-w-0 text-lg font-medium leading-relaxed font-sans",
      style: {
        maxWidth: parts && isSideBySide ? '100%' : 'min(' + readingColumn + 'ch, 100%)',
        marginInline: 'auto'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "mb-4 flex flex-wrap items-center gap-3 text-sm"
    }, /*#__PURE__*/React.createElement("label", {
      className: "flex items-center gap-2"
    }, readerText('simplified.reading_width', 'Reading width'), /*#__PURE__*/React.createElement("select", {
      "aria-label": readerText('simplified.reading_width', 'Reading width'),
      value: readingColumn,
      onChange: e => setReadingColumn(Number(e.target.value)),
      className: "rounded-lg border border-slate-300 bg-white px-2 py-2 text-slate-800"
    }, /*#__PURE__*/React.createElement("option", {
      value: 40
    }, readerText('simplified.width_narrow', 'Narrow')), /*#__PURE__*/React.createElement("option", {
      value: 56
    }, readerText('simplified.width_medium', 'Medium')), /*#__PURE__*/React.createElement("option", {
      value: 72
    }, readerText('simplified.width_wide', 'Wide')))), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "underline underline-offset-2 rounded px-2 py-2 focus-visible:ring-2 focus-visible:ring-indigo-600",
      onClick: () => readingEndRef.current?.focus()
    }, readerText('simplified.skip_passage', 'Skip reading controls')), props.onReadReflect && /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: openReadingReflection,
      className: "rounded-lg border border-indigo-200 bg-white px-3 py-2 text-indigo-800"
    }, readerText('simplified.read_reflect', 'Read & reflect'))), isWordMode && /*#__PURE__*/React.createElement("p", {
      className: "mb-3 text-sm text-slate-600"
    }, wordHelpHint), /*#__PURE__*/React.createElement("div", {
      className: isLineFocusMode ? 'bg-slate-950 rounded-xl p-4' : ''
    }, parts && isSideBySide ? /*#__PURE__*/React.createElement(React.Fragment, null, parts.source.length !== parts.target.length && /*#__PURE__*/React.createElement("p", {
      role: "status",
      className: "mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
    }, readerText('simplified.unmatched_paragraphs', 'The versions have different paragraph counts. They are shown in order; a row may not be an exact translation match.')), /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-1 md:grid-cols-2 gap-4"
    }, Array.from({
      length: Math.max(rendered[0].length, rendered[1].length)
    }, (_, i) => /*#__PURE__*/React.createElement(React.Fragment, {
      key: i
    }, languages.map((section, j) => /*#__PURE__*/React.createElement("section", {
      key: section.key,
      lang: simplifiedLanguageTag(section.label),
      dir: j === 1 ? 'ltr' : sourceDirection,
      className: "min-w-0 rounded-xl border border-slate-200 bg-white/60 p-4",
      style: {
        backgroundColor: isLineFocusMode ? 'transparent' : undefined
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "mb-3 text-sm font-bold",
      style: {
        color: isLineFocusMode ? '#e2e8f0' : '#334155'
      }
    }, section.label), /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: readingColumn + 'ch',
        marginInline: 'auto'
      }
    }, rendered[j][i] || /*#__PURE__*/React.createElement("p", {
      className: "text-sm italic text-slate-600"
    }, readerText('simplified.no_paired_paragraph', 'No corresponding paragraph in this version.'))))))))) : languages.map((section, i) => /*#__PURE__*/React.createElement("section", {
      key: section.key,
      lang: simplifiedLanguageTag(section.label),
      dir: i === 1 ? 'ltr' : sourceDirection
    }, i === 1 && /*#__PURE__*/React.createElement("h2", {
      className: "my-6 border-t border-indigo-200 pt-4 text-lg font-bold"
    }, simplifiedEnglishTranslationLabel), rendered[i]))), /*#__PURE__*/React.createElement(SourceReferencesPanel, {
      referencesText: simplifiedReferences
    }), /*#__PURE__*/React.createElement("div", {
      ref: readingEndRef,
      tabIndex: -1,
      className: "mt-4 rounded focus-visible:ring-2 focus-visible:ring-indigo-600",
      "aria-label": readerText('simplified.end_of_reading', 'End of reading')
    }), isProcessing && /*#__PURE__*/React.createElement("p", {
      role: "status",
      className: "mt-4 text-sm text-indigo-700"
    }, simplifiedGeneratingMoreLabel));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, activeReadAloudStatus && /*#__PURE__*/React.createElement("span", {
    className: "sr-only",
    role: "status",
    "aria-live": "polite",
    "aria-atomic": "true"
  }, activeReadAloudStatus), isImmersiveReaderActive && generatedContent?.immersiveData && /*#__PURE__*/React.createElement("div", {
    ref: immersiveDialogRef,
    role: "dialog",
    "aria-modal": "true",
    "aria-label": t('immersive.title') || 'Immersive Reader',
    tabIndex: -1,
    onKeyDown: e => containSimplifiedModalFocus(e, immersiveDialogRef.current, handleCloseImmersiveReader),
    className: "fixed inset-0 z-[200] overflow-y-auto animate-in motion-reduce:animate-none fade-in zoom-in-95 duration-300 motion-reduce:animate-none motion-reduce:transition-none flex flex-col font-sans",
    style: {
      backgroundColor: immersiveSettings.bgColor || '#fdfbf7'
    },
    onPointerMove: e => {
      if (immersiveSettings.lineFocus && e.clientY > immersiveToolbarBottom) setImmersiveRulerY(e.clientY);
    },
    onFocusCapture: e => {
      if (immersiveSettings.lineFocus && !e.target.closest("[data-immersive-toolbar]") && e.target.closest("[role=dialog]") === immersiveDialogRef.current) {
        const rect = e.target.getBoundingClientRect();
        setImmersiveRulerY(Math.max(immersiveToolbarBottom + immersiveSettings.textSize * 2.5, rect.top + Math.min(rect.height / 2, immersiveSettings.textSize * 2.5)));
      }
    }
  }, /*#__PURE__*/React.createElement(ImmersiveToolbar, {
    settings: immersiveSettings,
    setSettings: setImmersiveSettings,
    onClose: handleCloseImmersiveReader,
    onGeneratePOS: handleGeneratePOSData,
    isGeneratingPOS: isAnalyzingPos,
    posReady: !!generatedContent?.posEnriched,
    onGenerateSyllables: handleGeneratePOSData,
    isGeneratingSyllables: isAnalyzingPos,
    syllablesReady: !!generatedContent?.posEnriched,
    playbackRate: playbackRate,
    setPlaybackRate: setPlaybackRate,
    lineHeight: lineHeight,
    setLineHeight: setLineHeight,
    letterSpacing: letterSpacing,
    setLetterSpacing: setLetterSpacing,
    isFocusReaderActive: isFocusReaderActive,
    onToggleFocusReader: () => setIsFocusReaderActive(!isFocusReaderActive),
    isChunkReaderActive: isChunkReaderActive,
    onToggleChunkReader: () => {
      setIsChunkReaderActive(!isChunkReaderActive);
      setChunkReaderIdx(0);
      setChunkReaderAutoPlay(false);
    },
    chunkReaderIdx: chunkReaderIdx,
    setChunkReaderIdx: setChunkReaderIdx,
    chunkReaderAutoPlay: chunkReaderAutoPlay,
    setChunkReaderAutoPlay: setChunkReaderAutoPlay,
    chunkReaderSpeed: chunkReaderSpeed,
    setChunkReaderSpeed: setChunkReaderSpeed,
    chunkReaderMood: chunkReaderMood,
    setChunkReaderMood: setChunkReaderMood,
    interactionMode: interactionMode,
    setInteractionMode: setInteractionMode,
    isCrawlReaderActive: isCrawlReaderActive,
    onToggleCrawlReader: () => setIsCrawlReaderActive(!isCrawlReaderActive),
    isKaraokeOverlayActive: isKaraokeOverlayActive,
    onToggleKaraokeOverlay: () => setIsKaraokeOverlayActive(!isKaraokeOverlayActive),
    chunkReaderReadAlong: chunkReaderReadAlong,
    onToggleChunkReaderReadAlong: () => {
      const next = !chunkReaderReadAlong;
      setChunkReaderReadAlong(next);
      setChunkReaderSweepPct(0);
      if (!next) {
        try {
          if (chunkReaderSweepAudioRef.current) {
            chunkReaderSweepAudioRef.current.pause();
            chunkReaderSweepAudioRef.current = null;
          }
        } catch (e) {}
        if (chunkReaderSweepRafRef.current) {
          cancelAnimationFrame(chunkReaderSweepRafRef.current);
          chunkReaderSweepRafRef.current = null;
        }
        try {
          window.speechSynthesis && window.speechSynthesis.cancel();
        } catch (e) {}
      }
    },
    totalSentences: (() => {
      const sbs = getSideBySideContent(simplifiedReadAloudText);
      const ps = sbs ? [...(sbs.source || []), ...(sbs.target || [])] : simplifiedReadAloudText.split(new RegExp('\\n{2,}'));
      return ps.flatMap(p => p.trim().startsWith('|') ? [] : splitTextToSentences(p)).length || 1;
    })()
  }), /*#__PURE__*/React.createElement(ErrorBoundary, {
    fallbackMessage: "Focus reader encountered an error. Please close and reopen."
  }, /*#__PURE__*/React.createElement(FocusReaderOverlay, {
    language: leveledTextLanguage,
    isOpen: isFocusReaderActive,
    onClose: handleCloseSpeedReader,
    text: simplifiedDisplayBody.replace(/<[^>]*>/g, '')
  }), /*#__PURE__*/React.createElement(PerspectiveCrawlOverlay, {
    isOpen: isCrawlReaderActive,
    onClose: () => setIsCrawlReaderActive(false),
    text: (generatedContent?.immersiveData?.filter(w => w.pos !== 'newline')?.map(w => w.text)?.join(' ') || "").replace(/<[^>]*>/g, '')
  }), /*#__PURE__*/React.createElement(KaraokeReaderOverlay, {
    isOpen: isKaraokeOverlayActive,
    isTeacher: isTeacherMode,
    onClose: () => setIsKaraokeOverlayActive(false),
    getAudioUrl: getKaraokeAudioUrl,
    sentenceList: karaokeReaderSentences,
    captureOn: saveTtsAsPlayed,
    onCaptureChange: setSaveTtsAsPlayedEnabled,
    text: (generatedContent?.immersiveData?.filter(w => w.pos !== 'newline')?.map(w => w.text)?.join(' ') || "").replace(/<[^>]*>/g, '')
  })), immersiveSettings.lineFocus && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "fixed top-0 left-0 right-0 bg-black/80 pointer-events-none z-[210] transition-[height] duration-75 ease-out motion-reduce:transition-none",
    style: {
      top: immersiveToolbarBottom + 'px',
      height: Math.max(0, immersiveRulerY - immersiveSettings.textSize * 2.5 - immersiveToolbarBottom) + 'px'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "fixed bottom-0 left-0 right-0 bg-black/80 pointer-events-none z-[210] transition-[top] duration-75 ease-out motion-reduce:transition-none",
    style: {
      top: immersiveRulerY + immersiveSettings.textSize * 2.5 + 'px'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "fixed left-0 right-0 border-b border-indigo-400/30 z-[210] pointer-events-none transition-[top] duration-75 ease-out motion-reduce:transition-none",
    style: {
      top: immersiveRulerY + 'px'
    }
  })), /*#__PURE__*/React.createElement("div", {
    "data-immersive-passage": true,
    tabIndex: 0,
    role: "region",
    "aria-label": "Reading passage. When Line Focus is on, use Up and Down arrows to move the reading window.",
    onKeyDown: e => {
      if (e.target === e.currentTarget && immersiveSettings.lineFocus && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        e.preventDefault();
        const step = immersiveSettings.textSize * lineHeight;
        setImmersiveRulerY(y => Math.max(immersiveToolbarBottom + immersiveSettings.textSize * 2.5, Math.min(window.innerHeight - immersiveSettings.textSize, y + (e.key === "ArrowDown" ? step : -step))));
      }
    },
    className: "flex-grow overflow-y-auto p-5 md:p-16 custom-scrollbar relative z-10 focus-visible:outline focus-visible:outline-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: `max-w-4xl mx-auto transition-all duration-300`,
    style: {
      color: immersiveSettings.fontColor || '#1e293b',
      lineHeight: lineHeight,
      letterSpacing: `${immersiveSettings.wideText ? letterSpacing + 0.15 : letterSpacing}em`,
      wordSpacing: immersiveSettings.wideText ? '0.25em' : 'normal',
      fontFamily: immersiveSettings.fontFamily || undefined
    }
  }, (() => {
    const isTable = p => p.trim().startsWith('|') || p.includes('\n|');
    let sentences = [];
    const sideBySideData = getSideBySideContent(simplifiedReadAloudText);
    if (sideBySideData) {
      const sourceSentences = sideBySideData.source.flatMap(p => isTable(p) ? [] : splitTextToSentences(p));
      const targetSentences = sideBySideData.target.flatMap(p => isTable(p) ? [] : splitTextToSentences(p));
      sentences = [...sourceSentences, ...targetSentences];
    } else {
      const paragraphs = simplifiedReadAloudText.split(/\n{2,}/);
      sentences = paragraphs.flatMap(p => isTable(p) ? [] : splitTextToSentences(p));
    }
    let currentSentenceIdx = 0;
    let currentSentenceText = sentences[0] || "";
    let normalizedSentence = cleanSentenceForAudio(currentSentenceText).replace(/\s+/g, '').toLowerCase();
    let currentTokenBuffer = "";
    // Typewriter char-offset bookkeeping for the active sentence (mood='typewriter').
    // Resets when we encounter the first token of the active sentence; each token in
    // the active sentence contributes wordData.text.length to the rolling offset.
    let activeChunkCharOffset = 0;
    // Read-along uses its own whitespace-free weight clock. The host supplies
    // chunkReaderSweepPct from the playing clip; convert that sentence-level
    // percentage into a local fill for each word instead of lighting the whole
    // sentence at once.
    let activeSweepCharOffset = 0;
    let lastWasActiveSentence = false;
    const reduceMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return generatedContent.immersiveData.map((wordData, i) => {
      if (wordData.pos === 'newline') {
        return /*#__PURE__*/React.createElement("div", {
          key: wordData.id || i,
          className: "w-full h-4"
        });
      }
      while (!normalizedSentence && currentSentenceIdx < sentences.length - 1) {
        currentSentenceIdx++;
        currentSentenceText = sentences[currentSentenceIdx];
        normalizedSentence = cleanSentenceForAudio(currentSentenceText).replace(/\s+/g, '').toLowerCase();
        currentTokenBuffer = "";
      }
      const tokenStr = wordData.text.replace(/\s+/g, '').toLowerCase();
      const assignedIdx = currentSentenceIdx;
      currentTokenBuffer += tokenStr;
      if (currentTokenBuffer.length >= normalizedSentence.length) {
        if (currentSentenceIdx < sentences.length - 1) {
          currentSentenceIdx++;
          currentSentenceText = sentences[currentSentenceIdx];
          normalizedSentence = cleanSentenceForAudio(currentSentenceText).replace(/\s+/g, '').toLowerCase();
          currentTokenBuffer = "";
        }
      }
      const isChunkHighlight = isChunkReaderActive && assignedIdx === chunkReaderIdx;
      const isChunkDimmed = isChunkReaderActive && assignedIdx !== chunkReaderIdx;
      // Track word's char-offset within the active sentence for typewriter mood
      let wordStartChar = -1;
      let wordSweepStart = -1;
      let wordSweepWeight = 0;
      let sentenceSweepWeight = 1;
      if (isChunkHighlight) {
        if (!lastWasActiveSentence) {
          activeChunkCharOffset = 0;
          activeSweepCharOffset = 0;
        }
        wordStartChar = activeChunkCharOffset;
        activeChunkCharOffset += (wordData.text || '').length;
        wordSweepStart = activeSweepCharOffset;
        wordSweepWeight = Math.max(1, tokenStr.length);
        activeSweepCharOffset += wordSweepWeight;
        sentenceSweepWeight = Math.max(1, cleanSentenceForAudio(sentences[assignedIdx] || '').replace(/\s+/g, '').length);
        lastWasActiveSentence = true;
      } else {
        lastWasActiveSentence = false;
      }
      // Mood-aware styling: highlight (default), typewriter, popin, pulse
      let moodOpacity = isChunkDimmed ? 0.45 : 1;
      let moodAnimation = '';
      let showHighlight = isChunkHighlight;
      let readAlongWordProgress = null;
      let readAlongWordState = null;
      if (isChunkHighlight && chunkReaderReadAlong) {
        const sweep = Math.max(0, Math.min(100, Number(chunkReaderSweepPct) || 0));
        const wordStartPct = wordSweepStart / sentenceSweepWeight * 100;
        const wordEndPct = (wordSweepStart + wordSweepWeight) / sentenceSweepWeight * 100;
        readAlongWordProgress = Math.max(0, Math.min(100, (sweep - wordStartPct) / Math.max(0.0001, wordEndPct - wordStartPct) * 100));
        readAlongWordState = readAlongWordProgress >= 100 ? 'complete' : readAlongWordProgress > 0 ? 'current' : 'pending';
        showHighlight = readAlongWordProgress > 0;
        moodOpacity = 1;
      } else if (isChunkReaderActive && chunkReaderMood === 'typewriter') {
        if (isChunkDimmed) moodOpacity = 0.2;
        if (isChunkHighlight) {
          moodOpacity = wordStartChar < chunkTypewriterCharIdx ? 1 : 0;
          if (wordStartChar >= chunkTypewriterCharIdx) showHighlight = false;
        }
      } else if (isChunkReaderActive && chunkReaderMood === 'popin' && isChunkHighlight && !reduceMotion) {
        moodAnimation = 'allo-chunk-popin 0.25s ease-out';
      } else if (isChunkReaderActive && chunkReaderMood === 'pulse' && isChunkHighlight && !reduceMotion) {
        moodAnimation = 'allo-chunk-pulse 2s ease-in-out infinite';
      }
      return /*#__PURE__*/React.createElement("span", {
        key: wordData.id || i,
        "data-sentence-idx": assignedIdx,
        "data-read-along-state": readAlongWordState || undefined,
        "data-read-along-progress": readAlongWordProgress == null ? undefined : Math.round(readAlongWordProgress),
        style: {
          opacity: moodOpacity,
          transition: chunkReaderMood === 'typewriter' ? 'opacity 0.05s linear' : 'all 0.3s ease',
          // In chunk-read mode every word is click-to-jump (onClick below);
          // pointer cursor surfaces the affordance without needing instructions.
          ...(isChunkReaderActive ? {
            cursor: 'pointer'
          } : {}),
          ...(moodAnimation ? {
            animation: moodAnimation
          } : {}),
          ...(readAlongWordProgress != null ? {
            backgroundImage: `linear-gradient(to right, rgba(250, 204, 21, 0.58) 0%, rgba(250, 204, 21, 0.58) ${readAlongWordProgress}%, transparent ${readAlongWordProgress}%, transparent 100%)`,
            borderRadius: '4px',
            boxDecorationBreak: 'clone',
            WebkitBoxDecorationBreak: 'clone'
          } : showHighlight || isPlaying && playbackState.currentIdx === assignedIdx ? {
            backgroundColor: 'rgba(250, 204, 21, 0.35)',
            borderRadius: '4px',
            boxDecorationBreak: 'clone',
            WebkitBoxDecorationBreak: 'clone'
          } : {})
        }
      }, /*#__PURE__*/React.createElement(ImmersiveWord, {
        wordData: wordData,
        settings: immersiveSettings,
        isActive: isPlaying && playbackState.currentIdx === assignedIdx || isChunkHighlight && (!chunkReaderReadAlong || readAlongWordProgress > 0),
        onClick: e => {
          e.stopPropagation();
          if (interactionMode === 'define') {
            handleWordClick(wordData.text, e);
            return;
          }
          if (interactionMode === 'phonics') {
            handlePhonicsClick(wordData.text, e);
            return;
          }
          if (isChunkReaderActive) {
            setChunkReaderIdx(assignedIdx);
          } else {
            // ImmersiveWord is an atomic tap target: speak the word that
            // was tapped through handleSpeak's direct, interactive lane.
            // A unique non-sequence content id avoids rebuilding and
            // synthesizing the entire resource from this sentence.
            const spokenWord = String(wordData.text || '').replace(/\s+/g, ' ').trim();
            if (spokenWord && typeof handleSpeak === 'function') {
              handleSpeak(spokenWord, `immersive-word-${wordData.id || i}`, 0, true);
            }
          }
        }
      }));
    });
  })()))), interactionMode === 'cloze' && isClozeComplete && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 pointer-events-none z-[100] flex items-center justify-center",
    "data-a11y-overlay": "nonmodal-status",
    role: "status",
    "aria-live": "polite",
    "aria-atomic": "true"
  }, /*#__PURE__*/React.createElement(ConfettiExplosion, null), /*#__PURE__*/React.createElement("div", {
    className: "mt-40 bg-green-100 text-green-800 px-6 py-3 rounded-full font-bold border-4 border-white shadow-xl animate-in motion-reduce:animate-none zoom-in duration-500 motion-reduce:animate-none motion-reduce:transition-none flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Trophy, {
    size: 24,
    className: "text-yellow-500 fill-current",
    "aria-hidden": "true"
  }), " ", simplifiedActivityCompleteLabel)), !isZenMode && /*#__PURE__*/React.createElement("div", {
    className: "bg-green-50 p-4 rounded-lg border border-green-100 mb-6"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-green-800"
  }, /*#__PURE__*/React.createElement("strong", null, t('simplified.udl_goal').split(':')[0], ":"), " ", t('simplified.udl_goal').split(':')[1])), instructionalRoleControl, /*#__PURE__*/React.createElement("div", {
    className: `bg-orange-50 border-l-4 border-orange-400 shadow-sm rounded-r-lg relative ${isZenMode ? 'p-4' : 'p-8'}`
  }, !isZenMode && /*#__PURE__*/React.createElement("div", {
    className: "flex justify-center items-center mb-2 flex-wrap gap-2"
  }, (() => {
    const displayGrade = generatedContent?.config?.grade || gradeLevel;
    const displayLang = generatedContent?.config?.language || leveledTextLanguage;
    const displayInterests = generatedContent?.config?.interests || studentInterests || [];
    const displayStandards = generatedContent?.config?.standards || standardsInput;
    return /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("h4", {
      className: "font-comic font-bold text-xl text-orange-800"
    }, isTeacherMode ? `${t('simplified.target_level_label')}: ${displayGrade}` : sourceTopic || simplifiedReadingSelectionLabel), displayLang !== 'English' && /*#__PURE__*/React.createElement("span", {
      className: "bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-bold border border-blue-200"
    }, displayLang), displayInterests.length > 0 && /*#__PURE__*/React.createElement("span", {
      className: "bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full font-bold border border-red-200 flex items-center gap-1"
    }, /*#__PURE__*/React.createElement(Heart, {
      size: 10
    }), " ", t('simplified.engagement_optimized')), displayStandards && /*#__PURE__*/React.createElement("span", {
      className: "bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold border border-green-200 flex items-center gap-1 cursor-help",
      title: `${t('simplified.label_standard')}: ${displayStandards}`
    }, /*#__PURE__*/React.createElement(CheckCircle, {
      size: 10
    }), displayStandards.length > 20 ? displayStandards.substring(0, 20) + '...' : displayStandards));
  })()), /*#__PURE__*/React.createElement("div", {
    className: `flex items-center gap-2 ${isZenMode ? 'justify-center mb-4' : 'justify-center'}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-1 items-center min-w-0 w-full"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap justify-center w-full min-w-0 bg-white rounded-2xl sm:rounded-full p-1 border border-indigo-200 shadow-sm gap-y-1"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      setInteractionMode('read');
      stopPlayback();
      setSelectionMenu(null);
      setRevisionData(null);
      setIsCompareMode(false);
      setIsFluencyMode(false);
    },
    className: `px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${interactionMode === 'read' && !isCompareMode && !isFluencyMode ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-700'}`,
    title: t('simplified.tip_read'),
    "aria-label": t('simplified.read_mode'),
    "data-help-key": "simplified_read_mode"
  }, /*#__PURE__*/React.createElement(Volume2, {
    size: 12
  }), " ", t('simplified.read_mode')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      setIsFluencyMode(true);
      stopPlayback();
      setInteractionMode('read');
      setIsCompareMode(false);
    },
    className: `px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${isFluencyMode ? 'bg-rose-100 text-rose-800 shadow-sm' : 'text-slate-600 hover:text-slate-700'}`,
    title: t('simplified.tip_read_along'),
    "aria-label": t('simplified.read_along'),
    "data-help-key": "simplified_read_along"
  }, /*#__PURE__*/React.createElement(Mic, {
    size: 12
  }), " ", t('simplified.read_along')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      setInteractionMode('define');
      stopPlayback();
      setSelectionMenu(null);
      setRevisionData(null);
      setIsCompareMode(false);
      setIsFluencyMode(false);
    },
    className: `px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${interactionMode === 'define' && !isCompareMode ? 'bg-yellow-100 text-yellow-800 shadow-sm' : 'text-slate-600 hover:text-slate-700'}`,
    title: t('simplified.tip_define'),
    "aria-label": t('simplified.define_mode'),
    "data-help-key": "simplified_define_mode"
  }, /*#__PURE__*/React.createElement(Search, {
    size: 12
  }), " ", t('simplified.define_mode')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      setInteractionMode('phonics');
      stopPlayback();
      setPhonicsData(null);
      setIsCompareMode(false);
      setIsFluencyMode(false);
    },
    className: `px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${interactionMode === 'phonics' && !isCompareMode ? 'bg-emerald-100 text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-700'}`,
    title: t('simplified.tip_phonics'),
    "aria-label": t('simplified.phonics_mode'),
    "data-help-key": "simplified_phonics_mode"
  }, /*#__PURE__*/React.createElement(Ear, {
    size: 12
  }), " ", t('simplified.phonics_mode')), isTeacherMode && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      setInteractionMode('add-glossary');
      stopPlayback();
      setSelectionMenu(null);
      setRevisionData(null);
      setIsCompareMode(false);
      setIsFluencyMode(false);
    },
    className: `px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${interactionMode === 'add-glossary' && !isCompareMode ? 'bg-green-100 text-green-800 shadow-sm' : 'text-slate-600 hover:text-slate-700'}`,
    title: t('simplified.tip_add_term'),
    "aria-label": t('simplified.add_term'),
    "data-help-key": "simplified_add_term"
  }, /*#__PURE__*/React.createElement(Plus, {
    size: 12
  }), " ", t('simplified.add_term')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      setInteractionMode('explain');
      stopPlayback();
      setIsCompareMode(false);
      setIsFluencyMode(false);
    },
    className: `px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${interactionMode === 'explain' && !isCompareMode ? 'bg-teal-100 text-teal-800 shadow-sm' : 'text-slate-600 hover:text-slate-700'}`,
    title: t('simplified.tip_explain'),
    "aria-label": t('simplified.explain_mode'),
    "data-help-key": "simplified_explain_mode"
  }, /*#__PURE__*/React.createElement(HelpCircle, {
    size: 12
  }), " ", t('simplified.explain_mode')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      setInteractionMode('cloze');
      stopPlayback();
      setIsCompareMode(false);
      setIsFluencyMode(false);
    },
    className: `px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${interactionMode === 'cloze' && !isCompareMode ? 'bg-blue-100 text-blue-800 shadow-sm' : 'text-slate-600 hover:text-slate-700'}`,
    title: t('simplified.tip_cloze'),
    "aria-label": t('simplified.cloze_mode'),
    "data-help-key": "simplified_cloze_mode"
  }, /*#__PURE__*/React.createElement(PenTool, {
    size: 12
  }), " ", t('simplified.cloze_mode')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleSetIsSyntaxGameToTrue,
    className: "px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all bg-orange-100 text-orange-800 hover:bg-orange-200 shadow-sm",
    title: t('simplified.tip_scramble'),
    "aria-label": t('simplified.scramble_game'),
    "data-help-key": "simplified_scramble_game"
  }, /*#__PURE__*/React.createElement(Gamepad2, {
    size: 12
  }), " ", t('simplified.scramble_game')), isTeacherMode && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      setInteractionMode('revise');
      stopPlayback();
      setIsCompareMode(false);
    },
    className: `px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${interactionMode === 'revise' && !isCompareMode ? 'bg-purple-100 text-purple-800 shadow-sm' : 'text-slate-600 hover:text-slate-700'}`,
    title: t('simplified.tip_revise'),
    "aria-label": t('simplified.revise_mode'),
    "data-help-key": "simplified_revise_mode"
  }, /*#__PURE__*/React.createElement(Pencil, {
    size: 12
  }), " ", t('simplified.revise_mode')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-help-key": "simplified_compare_mode",
    onClick: () => {
      setIsCompareMode(!isCompareMode);
      stopPlayback();
    },
    className: `px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${isCompareMode ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:text-slate-700'}`,
    title: t('simplified.tip_compare'),
    "aria-label": t('simplified.compare_mode')
  }, /*#__PURE__*/React.createElement(GitCompare, {
    size: 12
  }), " ", t('simplified.compare_mode')))), !isZenMode && /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center justify-center gap-2"
  }, props.onReadReflect && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: openReadingReflection,
    className: "min-h-[44px] px-3 py-2 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 text-sm font-bold"
  }, t('reading_tools.reflect') || 'Read & reflect'), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('common.refresh'),
    "data-help-key": "simplified_immersive_reader",
    onClick: () => {
      if (generatedContent.immersiveData) {
        setIsImmersiveReaderActive(true);
      } else {
        handleAnalyzePOS();
      }
    },
    disabled: isAnalyzingPos || isEditingLeveledText,
    className: "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-fuchsia-600 border border-fuchsia-200 hover:bg-fuchsia-50 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed",
    title: t('simplified.tip_immersive_btn')
  }, isAnalyzingPos ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14,
    className: "animate-spin motion-reduce:animate-none"
  }) : /*#__PURE__*/React.createElement(BookOpen, {
    size: 14
  }), isAnalyzingPos ? t('simplified.loading_reader') : t('simplified.immersive_reader')), /*#__PURE__*/React.createElement("select", {
    value: readingTheme,
    onChange: e => setReadingTheme(e.target.value),
    "aria-label": simplifiedReadingThemeLabel,
    className: `px-2 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${readingTheme === 'default' ? 'border-slate-200 bg-white text-slate-600' : 'border-indigo-300 bg-indigo-50 text-indigo-700'}`
  }, /*#__PURE__*/React.createElement("option", {
    value: "default"
  }, t('header.reading_theme_default')), /*#__PURE__*/React.createElement("option", {
    value: "warm"
  }, t('header.reading_theme_warm')), /*#__PURE__*/React.createElement("option", {
    value: "sepia"
  }, t('header.reading_theme_sepia')), theme !== 'dark' && /*#__PURE__*/React.createElement("option", {
    value: "dark"
  }, t('header.reading_theme_dark')), /*#__PURE__*/React.createElement("option", {
    value: "highContrast"
  }, t('header.reading_theme_contrast')), /*#__PURE__*/React.createElement("option", {
    value: "blue"
  }, t('header.reading_theme_blue')), /*#__PURE__*/React.createElement("option", {
    value: "green"
  }, t('header.reading_theme_green')), /*#__PURE__*/React.createElement("option", {
    value: "rose"
  }, t('header.reading_theme_rose')), /*#__PURE__*/React.createElement("option", {
    value: "dyslexia"
  }, t('header.reading_theme_easy_read'))), isTeacherMode && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center mr-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('common.settings'),
    "data-help-key": "simplified_teacher_tools",
    "aria-expanded": !!isTeacherToolbarExpanded,
    "aria-controls": "simplified-teacher-tools-panel",
    onClick: handleToggleIsTeacherToolbarExpanded,
    className: `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm border ${isTeacherToolbarExpanded ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white text-slate-600 border-slate-200 hover:text-indigo-600 hover:border-indigo-200'}`,
    title: t('simplified.teacher_tools_tooltip')
  }, /*#__PURE__*/React.createElement(Settings, {
    size: 14
  }), /*#__PURE__*/React.createElement("span", {
    className: "hidden sm:inline"
  }, t('simplified.teacher_tools_label')), isTeacherToolbarExpanded ? /*#__PURE__*/React.createElement(ChevronLeft, {
    size: 14
  }) : /*#__PURE__*/React.createElement(ChevronRight, {
    size: 14
  })), /*#__PURE__*/React.createElement("div", {
    id: "simplified-teacher-tools-panel",
    hidden: !isTeacherToolbarExpanded,
    style: {
      display: isTeacherToolbarExpanded ? undefined : 'none'
    },
    className: `flex items-center gap-2 overflow-hidden transition-all duration-300 ease-in-out ${isTeacherToolbarExpanded ? 'flex-wrap max-w-[920px] opacity-100 ml-2' : 'flex-nowrap max-w-0 opacity-0'}`
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleDuplicateResource,
    className: "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-indigo-600 hover:bg-indigo-50 border border-slate-400 transition-all shadow-md whitespace-nowrap",
    title: t('simplified.tip_duplicate_btn'),
    "aria-label": t('simplified.tip_duplicate_btn'),
    "data-help-key": "simplified_duplicate"
  }, /*#__PURE__*/React.createElement(Copy, {
    size: 14
  }), " ", t('common.duplicate')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleCheckLevel,
    disabled: isCheckingLevel,
    className: "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-indigo-600 hover:bg-indigo-50 border border-slate-400 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap",
    title: t('simplified.tip_check_level_btn'),
    "aria-label": t('simplified.tip_check_level_btn'),
    "data-help-key": "simplified_check_level"
  }, isCheckingLevel ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14,
    className: "animate-spin motion-reduce:animate-none"
  }) : /*#__PURE__*/React.createElement(Search, {
    size: 14
  }), isCheckingLevel ? t('simplified.checking') : t('simplified.check_level')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleCheckAlignment,
    disabled: isCheckingAlignment || !standardsInput,
    className: `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${!standardsInput ? 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-600 border-slate-300' : 'bg-white text-indigo-600 hover:bg-indigo-50 border-slate-300'}`,
    title: !standardsInput ? t('simplified.tip_rigor_disabled') : t('simplified.tip_rigor_btn'),
    "aria-label": !standardsInput ? t('simplified.tip_rigor_disabled') : t('simplified.tip_rigor_btn'),
    "data-help-key": "simplified_rigor_report"
  }, isCheckingAlignment ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14,
    className: "animate-spin motion-reduce:animate-none"
  }) : /*#__PURE__*/React.createElement(ShieldCheck, {
    size: 14
  }), isCheckingAlignment ? t('simplified.checking') : t('simplified.rigor_report')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => copyToClipboard(generatedContent?.data),
    className: "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-indigo-600 hover:bg-indigo-50 border border-slate-400 transition-all shadow-md whitespace-nowrap",
    title: t('simplified.tip_copy_btn'),
    "aria-label": t('simplified.tip_copy_btn'),
    "data-help-key": "simplified_copy_text"
  }, /*#__PURE__*/React.createElement(Copy, {
    size: 14
  }), " ", t('common.copy_text')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      if (isSimplifiedAudioDownloading) {
        try {
          window.__alloCancelAudioDownload?.();
        } catch (_) {}
        return;
      }
      handleDownloadAudio(generatedContent?.data, `leveled-text-${gradeLevel}`, 'dl-simplified-main');
    },
    title: isSimplifiedAudioDownloading ? simplifiedStopAudioDownloadLabel : t('simplified.tip_download_audio') || t('common.download_audio'),
    "aria-label": isSimplifiedAudioDownloading ? simplifiedStopAudioDownloadLabel : t('common.download_audio'),
    className: "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-indigo-600 hover:bg-indigo-50 border border-slate-400 transition-all shadow-md whitespace-nowrap",
    "data-help-key": "simplified_download_audio"
  }, isSimplifiedAudioDownloading ? /*#__PURE__*/React.createElement(StopCircle, {
    size: 14
  }) : /*#__PURE__*/React.createElement(Download, {
    size: 14
  }), isSimplifiedAudioDownloading ? t('common.stop') || simplifiedAudioStopLabel : t('common.download_audio')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: function () {
      if (ttsPrepState.busy) {
        var request = ttsPrepRequestRef.current;
        if (request && request.controller) request.controller.abort();
        window.__alloPrepareReadAloudCancel = true;
        return;
      }
      handlePrepareReadAloudAudio();
    },
    className: "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-indigo-600 hover:bg-indigo-50 border border-slate-400 transition-all shadow-md whitespace-nowrap",
    title: ttsPrepState.busy ? t('common.stop') || simplifiedAudioStopLabel : t('immersive.prepare_all') || simplifiedAudioSaveLabel,
    "aria-label": ttsPrepState.busy ? t('common.stop') || simplifiedAudioStopLabel : t('immersive.prepare_all') || simplifiedAudioSaveLabel,
    "data-help-key": "simplified_save_tts"
  }, ttsPrepState.busy ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14,
    className: "animate-spin motion-reduce:animate-none"
  }) : /*#__PURE__*/React.createElement(Volume2, {
    size: 14
  }), ttsPrepState.busy ? `${ttsPrepState.done}/${ttsPrepState.total || '...'} ✓` : simplifiedAudioSaveLabel))), isTeacherMode && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('common.toggle_edit_text'),
    onClick: handleToggleIsEditingLeveledText,
    className: `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${isEditingLeveledText ? 'bg-orange-700 text-white hover:bg-orange-700' : 'bg-white text-orange-700 border border-orange-200 hover:bg-orange-50'}`,
    "data-help-key": "simplified_edit"
  }, isEditingLeveledText ? /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 14
  }) : /*#__PURE__*/React.createElement(Pencil, {
    size: 14
  }), isEditingLeveledText ? t('common.done_editing') : t('common.edit'))))), ttsPrepNotice && /*#__PURE__*/React.createElement("p", {
    role: "status",
    "aria-live": "polite",
    "aria-atomic": "true",
    className: "rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-900"
  }, ttsPrepNotice), definitionData && /*#__PURE__*/React.createElement("div", {
    ref: definitionDialogRef,
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "simplified-definition-title",
    tabIndex: -1,
    onKeyDown: e => containSimplifiedModalFocus(e, definitionDialogRef.current, closeDefinition),
    className: `fixed ${_popupZ} bg-white p-4 rounded-xl shadow-2xl border border-indigo-200 w-64 max-h-[50vh] overflow-y-auto custom-scrollbar animate-in motion-reduce:animate-none fade-in zoom-in-75 duration-300 ease-out motion-reduce:animate-none motion-reduce:transition-none`,
    style: simplifiedPopupStyle(definitionData, 16)
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-start mb-2"
  }, /*#__PURE__*/React.createElement("h5", {
    id: "simplified-definition-title",
    className: "font-bold text-indigo-900 text-lg capitalize"
  }, definitionData.word), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1"
  }, definitionData.text ? renderSimplifiedPopupSpeaker(SIMPLIFIED_DEFINE_AUDIO_ID, [definitionData.word, definitionData.text]) : null, /*#__PURE__*/React.createElement("button", {
    ref: definitionCloseRef,
    type: "button",
    onClick: closeDefinition,
    className: "min-h-11 min-w-11 text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-full p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2",
    "aria-label": t('common.close')
  }, /*#__PURE__*/React.createElement(X, {
    size: 14
  })))), definitionData.text ? renderReadingLevelExplanation(definitionData, t, renderFormattedText) : /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 text-xs text-indigo-500"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 12,
    className: "animate-spin motion-reduce:animate-none"
  }), " ", t('glossary.popups.finding')), definitionData.dictionary && renderDictionaryPanel(definitionData.dictionary, t), definitionData.text && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 pt-3 border-t border-slate-100"
  }, definitionData.imageUrl ? /*#__PURE__*/React.createElement("img", {
    src: definitionData.imageUrl,
    alt: definitionData.word,
    className: "w-full h-32 object-contain rounded-lg bg-slate-50 border border-slate-400"
  }) : definitionData.imageLoading ? /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-center gap-2 text-xs text-indigo-500 h-20 bg-slate-50 rounded-lg border border-slate-400 border-dashed"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 12,
    className: "animate-spin motion-reduce:animate-none"
  }), " ", t('common.loading') || 'Loading picture...') : definitionData.imageError ? /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-500 italic text-center py-2"
  }, t('glossary.popups.image_error') || 'Could not load picture.') : /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleFetchWordImage(definitionData.word),
    className: "w-full flex items-center justify-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg px-3 py-2 transition-colors",
    "aria-label": t('glossary.popups.show_picture') || 'Show picture for this word'
  }, /*#__PURE__*/React.createElement(ImageIcon, {
    size: 12
  }), " ", t('glossary.popups.show_picture') || 'Show picture')), /*#__PURE__*/React.createElement("div", {
    className: "absolute -top-2 left-6 w-4 h-4 bg-white border-t border-l border-indigo-200 transform rotate-45"
  })), definitionData && /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    className: `fixed inset-0 ${_popupBackdropZ}`,
    onClick: closeDefinition
  }), phonicsData && /*#__PURE__*/React.createElement("div", {
    ref: phonicsDialogRef,
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "phonics-popup-title",
    tabIndex: -1,
    onKeyDown: e => containSimplifiedModalFocus(e, phonicsDialogRef.current, closePhonics),
    className: `fixed ${_popupZ} bg-white allo-popover-solid p-5 rounded-xl shadow-2xl border-2 border-emerald-200 w-72 animate-in motion-reduce:animate-none zoom-in-95 duration-200 motion-reduce:animate-none motion-reduce:transition-none`,
    style: simplifiedPopupStyle(phonicsData, 18)
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-start mb-3"
  }, /*#__PURE__*/React.createElement("h5", {
    id: "phonics-popup-title",
    className: "font-black text-emerald-900 text-2xl capitalize tracking-tight"
  }, phonicsData.word), /*#__PURE__*/React.createElement("button", {
    ref: phonicsCloseRef,
    type: "button",
    onClick: closePhonics,
    className: "text-slate-600 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full p-1",
    "aria-label": t('common.close')
  }, /*#__PURE__*/React.createElement(X, {
    size: 14
  }))), phonicsData.isLoading ? /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center justify-center py-6 gap-2 text-emerald-600"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 24,
    className: "animate-spin motion-reduce:animate-none",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold uppercase tracking-wider"
  }, t('glossary.popups.analyzing'))) : phonicsData.data ? /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between bg-emerald-50 p-3 rounded-lg border border-emerald-100"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1"
  }, t('glossary.phonetic_spelling')), /*#__PURE__*/React.createElement("div", {
    className: "text-lg font-serif italic text-slate-700"
  }, "/", phonicsData.data.phoneticSpelling, "/")), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('common.volume'),
    onClick: () => {
      if (phonicsData.audioUrl) {
        const audio = new Audio(phonicsData.audioUrl);
        audio.playbackRate = voiceSpeed || 1;
        audio.play().catch(() => {});
      }
    },
    className: "bg-emerald-700 hover:bg-emerald-800 text-white p-2 rounded-full shadow-md transition-transform hover:scale-110 active:scale-95",
    title: t('glossary.popups.replay')
  }, /*#__PURE__*/React.createElement(Volume2, {
    size: 20,
    className: "fill-current"
  }))), renderPhonicsDictRow(phonicsData, t), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-50 p-2 rounded border border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1"
  }, t('glossary.popups.ipa')), /*#__PURE__*/React.createElement("div", {
    className: "font-mono text-sm text-slate-600"
  }, phonicsData.data.ipa)), /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-50 p-2 rounded border border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1"
  }, t('glossary.popups.syllables')), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-0.5"
  }, phonicsData.data.syllables.map((syl, i) => /*#__PURE__*/React.createElement(React.Fragment, null, i > 0 && /*#__PURE__*/React.createElement("span", {
    className: "text-emerald-500 font-bold px-0.5",
    "aria-hidden": "true"
  }, "•"), /*#__PURE__*/React.createElement("span", {
    className: "bg-white px-1.5 rounded border border-slate-400 text-sm font-bold text-slate-700 shadow-sm"
  }, syl))))))) : /*#__PURE__*/React.createElement("div", {
    className: "text-center text-red-600 text-xs font-bold py-4"
  }, t('glossary.popups.failed')), /*#__PURE__*/React.createElement("div", {
    className: "allo-popover-solid absolute -top-2 left-6 w-4 h-4 bg-white border-t-2 border-l-2 border-emerald-200 transform rotate-45"
  })), phonicsData && /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    className: `fixed inset-0 ${_popupBackdropZ}`,
    onClick: closePhonics
  }), selectionMenu && /*#__PURE__*/React.createElement("div", {
    className: `fixed ${_popupZ} flex flex-col gap-1 items-center animate-in motion-reduce:animate-none fade-in slide-in-from-bottom-2 duration-200`,
    style: {
      top: selectionMenu.y - 50 + 'px',
      left: selectionMenu.x + 'px',
      transform: 'translateX(-50%)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-900/90 text-white text-[11px] px-2 py-0.5 rounded-full mb-1 whitespace-nowrap shadow-sm max-w-[150px] truncate border border-slate-700"
  }, "\"", selectionMenu.text.length > 20 ? selectionMenu.text.substring(0, 20) + '...' : selectionMenu.text, "\""), /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-800 text-white rounded-full shadow-xl p-1 flex items-center gap-1"
  }, isCustomReviseOpen ? /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 px-1 animate-in motion-reduce:animate-none slide-in-from-right-2 duration-200"
  }, /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.enter_custom_revise_instruction'),
    autoFocus: true,
    type: "text",
    value: customReviseInstruction,
    onChange: e => setCustomReviseInstruction(e.target.value),
    onKeyDown: e => {
      if (e.key === 'Enter') handleReviseSelection('custom', customReviseInstruction);
      if (e.key === 'Escape') setIsCustomReviseOpen(false);
    },
    placeholder: t('text_tools.menu_placeholder'),
    className: "text-xs bg-slate-700 border-none rounded-full px-3 py-1.5 focus:ring-1 focus:ring-indigo-400 outline-none text-white w-48 placeholder:text-slate-600"
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('common.continue'),
    onClick: () => handleReviseSelection('custom', customReviseInstruction),
    className: "p-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-full text-white transition-colors",
    disabled: !customReviseInstruction.trim()
  }, /*#__PURE__*/React.createElement(ArrowRight, {
    size: 12
  })), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('common.close_revision_panel'),
    onClick: handleSetIsCustomReviseOpenToFalse,
    className: "p-1.5 text-slate-600 hover:text-white rounded-full transition-colors"
  }, /*#__PURE__*/React.createElement(X, {
    size: 12
  }))) : /*#__PURE__*/React.createElement(React.Fragment, null, interactionMode === 'explain' && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('common.help'),
    onClick: () => handleReviseSelection('explain'),
    className: "px-3 py-1.5 hover:bg-white/20 rounded-full text-xs font-bold transition-colors flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(HelpCircle, {
    size: 12,
    className: "text-teal-700"
  }), " ", t('text_tools.explain')), interactionMode === 'revise' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('common.generate'),
    onClick: () => handleReviseSelection('simplify'),
    className: "px-3 py-1.5 hover:bg-white/20 rounded-full text-xs font-bold transition-colors flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 12,
    className: "text-yellow-700"
  }), " ", t('text_tools.simplify')), /*#__PURE__*/React.createElement("div", {
    className: "w-px h-3 bg-slate-600"
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleReviseSelection('custom-input'),
    className: "px-3 py-1.5 hover:bg-white/20 rounded-full text-xs font-bold transition-colors flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(PenTool, {
    size: 12,
    className: "text-indigo-600"
  }), " ", t('text_tools.custom'))), interactionMode === 'define' && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('common.search'),
    onClick: handleDefineSelection,
    className: "px-3 py-1.5 hover:bg-white/20 rounded-full text-xs font-bold transition-colors flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Search, {
    size: 12,
    className: "text-yellow-700"
  }), " ", t('text_tools.define')), interactionMode === 'add-glossary' && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('common.add'),
    onClick: () => {
      handleQuickAddGlossary(selectionMenu.text, true);
      setSelectionMenu(null);
    },
    className: "px-3 py-1.5 hover:bg-white/20 rounded-full text-xs font-bold transition-colors flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Plus, {
    size: 12,
    className: "text-green-700"
  }), " ", t('text_tools.add_term')))), /*#__PURE__*/React.createElement("div", {
    className: "w-2 h-2 bg-slate-800 rotate-45"
  })), selectionMenu && /*#__PURE__*/React.createElement("div", {
    className: `fixed inset-0 ${_popupBackdropZ} bg-transparent`,
    onMouseDown: e => {
      setSelectionMenu(null);
      setIsCustomReviseOpen(false);
    }
  }), revisionData && /*#__PURE__*/React.createElement("div", {
    ref: revisionDialogRef,
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "simplified-revision-title",
    tabIndex: -1,
    onKeyDown: e => containSimplifiedModalFocus(e, revisionDialogRef.current, closeRevision),
    className: `fixed ${_popupZ} bg-white p-4 rounded-xl shadow-2xl border border-indigo-200 w-72 max-h-[50vh] overflow-y-auto custom-scrollbar animate-in motion-reduce:animate-none zoom-in-95 duration-200 motion-reduce:animate-none motion-reduce:transition-none`,
    style: {
      top: Math.min(window.innerHeight - 300, revisionData.y + 20) + 'px',
      left: Math.min(window.innerWidth - 300, Math.max(20, revisionData.x - 140)) + 'px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center mb-3 pb-2 border-b border-slate-100"
  }, /*#__PURE__*/React.createElement("h5", {
    id: "simplified-revision-title",
    className: "font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-2"
  }, revisionData.type === 'simplify' ? /*#__PURE__*/React.createElement(Sparkles, {
    size: 14,
    className: "text-yellow-500"
  }) : revisionData.type === 'custom' ? /*#__PURE__*/React.createElement(PenTool, {
    size: 14,
    className: "text-indigo-500"
  }) : /*#__PURE__*/React.createElement(HelpCircle, {
    size: 14,
    className: "text-teal-500"
  }), revisionData.type === 'simplify' ? t('simplified.revision.header_simplify') : revisionData.type === 'custom' ? t('simplified.revision.header_custom') : t('simplified.revision.header_explain')), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1"
  }, revisionData.result ? renderSimplifiedPopupSpeaker(SIMPLIFIED_REVISION_AUDIO_ID, revisionData.result) : null, /*#__PURE__*/React.createElement("button", {
    ref: revisionCloseRef,
    type: "button",
    onClick: closeRevision,
    className: "min-h-11 min-w-11 text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-full p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2",
    "aria-label": t('common.close')
  }, /*#__PURE__*/React.createElement(X, {
    size: 14
  })))), revisionData.result ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "text-sm text-slate-800 leading-relaxed font-medium bg-slate-50 p-3 rounded border border-slate-100 mb-3"
  }, renderFormattedText(revisionData.result, false)), (revisionData.type === 'simplify' || revisionData.type === 'custom') && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('common.apply_text_revision'),
    onClick: applyTextRevision,
    className: "min-h-11 w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 12
  }), " ", t('simplified.revision.replace_btn'))) : /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center justify-center py-4 gap-2 text-slate-600"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 20,
    className: "animate-spin motion-reduce:animate-none text-indigo-500"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-xs"
  }, t('simplified.revision.working')))), revisionData && /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    className: `fixed inset-0 ${_popupBackdropZ} bg-black/5`,
    onClick: closeRevision
  }), isTeacherMode && !isCompareMode && !isZenMode && generatedContent && ['simplified', 'quiz', 'sentence-frames', 'glossary'].includes(generatedContent.type) && /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-4 rounded-lg border border-indigo-100 shadow-sm mb-6 mx-1",
    "data-help-key": "simplified_complexity_slider"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2 text-center"
  }, generatedContent.type === 'quiz' ? t('simplified.complexity_controls.adjust_difficulty') : generatedContent.type === 'sentence-frames' ? t('simplified.complexity_controls.adjust_scaffolding') : generatedContent.type === 'glossary' ? t('simplified.complexity_controls.adjust_definition') : t('simplified.complexity_controls.adjust_relative')), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-slate-600 uppercase w-20 text-right"
  }, generatedContent.type === 'quiz' ? t('simplified.complexity_controls.easier') : generatedContent.type === 'sentence-frames' ? t('simplified.complexity_controls.more_support') : t('simplified.complexity_controls.simpler')), /*#__PURE__*/React.createElement("div", {
    className: "relative flex-grow h-6 flex items-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-200 transform -translate-x-1/2"
  }), /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.range_slider'),
    type: "range",
    min: "1",
    max: "9",
    step: "1",
    value: complexityLevel,
    onChange: e => setComplexityLevel(parseInt(e.target.value)),
    onMouseUp: handleComplexityAdjustment,
    onTouchEnd: handleComplexityAdjustment,
    disabled: isProcessing,
    "aria-busy": isProcessing,
    className: "w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 z-10 relative"
  })), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-slate-600 uppercase w-20"
  }, generatedContent.type === 'quiz' ? t('simplified.complexity_controls.harder') : generatedContent.type === 'sentence-frames' ? t('simplified.complexity_controls.less_support') : t('simplified.complexity_controls.complex'))), /*#__PURE__*/React.createElement("div", {
    className: "px-16"
  }, /*#__PURE__*/React.createElement(ComplexityGauge, {
    level: complexityLevel
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-center mt-2 text-xs font-medium h-4"
  }, complexityLevel < 5 && /*#__PURE__*/React.createElement("span", {
    className: "text-green-600 animate-pulse motion-reduce:animate-none"
  }, t('status.adjusting'), "..."), complexityLevel > 5 && /*#__PURE__*/React.createElement("span", {
    className: "text-indigo-600 animate-pulse motion-reduce:animate-none"
  }, t('status.adjusting'), "..."), complexityLevel === 5 && /*#__PURE__*/React.createElement("span", {
    className: "text-slate-600"
  }, t('simplified.complexity_controls.drag_hint'))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-center mt-4 pt-3 border-t border-slate-100"
  }, /*#__PURE__*/React.createElement("label", {
    className: `flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full cursor-pointer select-none transition-all border ${saveOriginalOnAdjust ? 'bg-indigo-100 text-indigo-700 border-indigo-200 ring-2 ring-indigo-500 ring-offset-1 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-700'}`,
    title: t('common.choose_overwrite_version'),
    "data-help-key": "simplified_overwrite_toggle"
  }, /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.toggle_save_original_on_adjust'),
    type: "checkbox",
    checked: saveOriginalOnAdjust,
    onChange: e => setSaveOriginalOnAdjust(e.target.checked),
    className: "hidden"
  }), saveOriginalOnAdjust ? /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 16
  }) : /*#__PURE__*/React.createElement(Copy, {
    size: 16
  }), /*#__PURE__*/React.createElement("span", null, saveOriginalOnAdjust ? t('common.keep_original') : t('common.overwrite_version'))))), !generatedContent.levelCheck && simplifiedComplexityDisplay.measuredGrade !== null && (() => {
    const measured = simplifiedComplexityDisplay.measuredGrade;
    const targetGrade = simplifiedComplexityDisplay.targetGrade;
    const status = simplifiedComplexityDisplay.status;
    const tone = status === 'above-target' ? 'bg-amber-50 border-amber-200 text-amber-900' : status === 'below-target' ? 'bg-blue-50 border-blue-200 text-blue-900' : status === 'within-target' ? 'bg-green-50 border-green-200 text-green-900' : 'bg-slate-50 border-slate-200 text-slate-700';
    const verdict = status === 'above-target' ? `Above the target range for ${targetGrade}` : status === 'below-target' ? `Below the target range for ${targetGrade}` : status === 'within-target' ? `Within the target range for ${targetGrade}` : '';
    const rangeNote = simplifiedComplexityDisplay.target && simplifiedComplexityDisplay.target.fkLabel ? ` Shared target range: ${simplifiedComplexityDisplay.target.fkLabel}.` : '';
    const stats = generatedContent.localStats || {};
    return /*#__PURE__*/React.createElement("div", {
      className: `mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2 text-xs ${tone}`,
      "data-complexity-status": status
    }, /*#__PURE__*/React.createElement("span", {
      className: "font-bold uppercase tracking-wider"
    }, t('simplified.measured_level_label') || 'Measured reading level'), /*#__PURE__*/React.createElement("span", {
      className: "font-mono font-bold text-sm",
      title: `${t('analysis.readability.formula') || 'Flesch-Kincaid'}: (0.39 × ASL) + (11.8 × ASW) - 15.59\n${t('analysis.readability.words') || 'Words'}: ${stats.words || '—'}\n${t('analysis.readability.sentences') || 'Sentences'}: ${stats.sentences || '—'}\n${t('analysis.readability.syllables') || 'Syllables'}: ${stats.syllables || '—'}`
    }, measured), verdict && /*#__PURE__*/React.createElement("span", {
      className: "font-semibold"
    }, verdict), /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] opacity-80"
    }, "Flesch-Kincaid, measured on this passage.", rangeNote, " Use Check Level for a fuller review."));
  })(), !generatedContent.levelCheck && simplifiedComplexityDisplay.status === 'stale' && /*#__PURE__*/React.createElement("div", {
    role: "status",
    className: "mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
  }, /*#__PURE__*/React.createElement("strong", null, "Reading-level measurement needs refresh."), " The text changed after it was measured; use Check Level before relying on a complexity verdict."), generatedContent.levelCheck && /*#__PURE__*/React.createElement("div", {
    className: "mb-6 bg-indigo-50 border border-indigo-100 p-4 rounded-lg animate-in motion-reduce:animate-none slide-in-from-top-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-indigo-100 p-2 rounded-full text-indigo-600 mt-1"
  }, /*#__PURE__*/React.createElement(Search, {
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex-grow"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-indigo-900 text-sm flex items-center justify-between"
  }, t('simplified.level_analysis_title'), /*#__PURE__*/React.createElement("span", {
    className: "text-xs bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full"
  }, generatedContent.levelCheck.confirmedLevel || generatedContent.levelCheck.estimatedLevel)), generatedContent.levelCheck.rubric ? /*#__PURE__*/React.createElement("div", {
    className: "mt-3 space-y-3 bg-white p-3 rounded-lg border border-indigo-100 shadow-sm"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-bold text-slate-600 uppercase tracking-wider mb-2"
  }, t('simplified.complexity_rubric_title')), Object.entries(generatedContent.levelCheck.rubric).map(([key, data]) => {
    const percent = (data.score + 5) / 10 * 100;
    const isAligned = Math.abs(data.score) <= 1;
    const colorClass = isAligned ? 'bg-green-500' : data.score < 0 ? 'bg-blue-400' : 'bg-red-400';
    return /*#__PURE__*/React.createElement("div", {
      key: key,
      className: "space-y-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex justify-between text-xs"
    }, /*#__PURE__*/React.createElement("span", {
      className: "font-bold text-slate-700 capitalize"
    }, key.replace(/([A-Z])/g, ' $1').trim()), /*#__PURE__*/React.createElement("span", {
      className: `font-mono font-bold ${isAligned ? 'text-green-600' : 'text-slate-600'}`
    }, data.score > 0 ? '+' : '', data.score)), /*#__PURE__*/React.createElement("div", {
      className: "relative h-2 bg-slate-100 rounded-full overflow-hidden"
    }, /*#__PURE__*/React.createElement("div", {
      className: "absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-300 z-10"
    }), /*#__PURE__*/React.createElement("div", {
      className: `absolute top-0 bottom-0 rounded-full transition-all duration-500 ${colorClass}`,
      style: {
        left: data.score < 0 ? `${percent}%` : '50%',
        width: `${Math.abs(data.score) * 10}%`
      }
    })), /*#__PURE__*/React.createElement("p", {
      className: "text-[11px] text-slate-600 italic"
    }, data.reason));
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between text-[11px] text-slate-600 font-bold uppercase tracking-widest mt-1"
  }, /*#__PURE__*/React.createElement("span", null, t('simplified.gauge_simple')), /*#__PURE__*/React.createElement("span", null, t('simplified.gauge_aligned')), /*#__PURE__*/React.createElement("span", null, t('simplified.gauge_complex')))) : /*#__PURE__*/React.createElement("div", {
    className: "flex items-center flex-wrap gap-2 mt-1 mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold uppercase tracking-wider text-slate-600"
  }, t('simplified.level_estimate_label'), ":"), /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-indigo-700 bg-white px-2 py-0.5 rounded text-sm border border-indigo-100 shadow-sm"
  }, generatedContent.levelCheck.estimatedLevel), /*#__PURE__*/React.createElement("span", {
    className: `text-xs font-bold px-2 py-0.5 rounded border ${generatedContent.levelCheck.alignment === 'Aligned' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'}`
  }, generatedContent.levelCheck.alignment)), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-700 leading-relaxed mt-2 p-2 bg-indigo-50/50 rounded italic border border-indigo-100/50"
  }, "\"", generatedContent.levelCheck.nuanceSummary || generatedContent.levelCheck.feedback, "\"")), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('common.close_fluency_session'),
    onClick: () => {
      const updated = {
        ...generatedContent
      };
      delete updated.levelCheck;
      setGeneratedContent(updated);
    },
    className: "text-slate-600 hover:text-slate-600 p-1"
  }, /*#__PURE__*/React.createElement(X, {
    size: 14
  })))), generatedContent.alignmentCheck && /*#__PURE__*/React.createElement("div", {
    className: "mb-6 bg-emerald-50 border border-emerald-100 p-4 rounded-lg animate-in motion-reduce:animate-none slide-in-from-top-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-emerald-100 p-2 rounded-full text-emerald-600 mt-1"
  }, /*#__PURE__*/React.createElement(ShieldCheck, {
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex-grow"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-emerald-900 text-sm"
  }, t('simplified.rigor_check_title')), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center flex-wrap gap-2 mt-1 mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold uppercase tracking-wider text-slate-600"
  }, t('simplified.rigor_status_label'), ":"), /*#__PURE__*/React.createElement("span", {
    className: `text-xs font-bold px-2 py-0.5 rounded border ${generatedContent.alignmentCheck.status === 'Aligned' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-orange-100 text-orange-700 border-orange-200'}`
  }, generatedContent.alignmentCheck.status)), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2 mb-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-700 leading-relaxed"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-emerald-800"
  }, t('simplified.rigor_evidence_label'), ":"), " \"", generatedContent.alignmentCheck.evidence, "\""), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-700 leading-relaxed"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-emerald-800"
  }, t('simplified.rigor_analysis_label'), ":"), " ", generatedContent.alignmentCheck.rigorReport), generatedContent.alignmentCheck.missingElements && generatedContent.alignmentCheck.missingElements !== "None" && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-red-700 leading-relaxed bg-red-50 p-2 rounded border border-red-100"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-bold flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(AlertCircle, {
    size: 12
  }), " ", t('simplified.missing_label'), ":"), " ", generatedContent.alignmentCheck.missingElements)), generatedContent.alignmentCheck.improvement && /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-3 rounded border border-emerald-200 mt-2 shadow-sm"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1 flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 12
  }), " ", t('simplified.suggestion_label')), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-600 italic mb-2"
  }, "\"", generatedContent.alignmentCheck.improvement, "\""), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('common.regenerate_with_rigor'),
    onClick: handleRegenerateWithRigor,
    disabled: isProcessing,
    "aria-busy": isProcessing,
    className: "text-xs font-bold bg-emerald-700 text-white px-3 py-1.5 rounded-full hover:bg-emerald-700 transition-colors flex items-center gap-1 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 12,
    className: isProcessing ? "animate-spin motion-reduce:animate-none" : ""
  }), " ", t('simplified.apply_regenerate')))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('common.close_fluency_results'),
    onClick: () => {
      const updated = {
        ...generatedContent
      };
      delete updated.alignmentCheck;
      setGeneratedContent(updated);
    },
    className: "text-slate-600 hover:text-slate-600 p-1"
  }, /*#__PURE__*/React.createElement(X, {
    size: 14
  })))), isCompareMode ? renderSimplifiedComparison() : isEditingLeveledText ? /*#__PURE__*/React.createElement("div", {
    className: "w-full bg-white border border-orange-200 rounded-lg overflow-hidden shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 p-2 bg-orange-50 border-b border-orange-100"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleFormatText('bold'),
    className: "p-1.5 rounded hover:bg-orange-200 text-orange-800 transition-colors",
    title: t('formatting.bold')
  }, /*#__PURE__*/React.createElement(Bold, {
    size: 16,
    strokeWidth: 3
  })), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleFormatText('italic'),
    className: "p-1.5 rounded hover:bg-orange-200 text-orange-800 transition-colors",
    title: t('formatting.italic')
  }, /*#__PURE__*/React.createElement(Italic, {
    size: 16
  })), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleFormatText('highlight'),
    className: "p-1.5 rounded hover:bg-orange-200 text-orange-800 transition-colors",
    title: t('formatting.highlight')
  }, /*#__PURE__*/React.createElement(Highlighter, {
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "w-px h-4 bg-orange-200 mx-1"
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleFormatText('h1'),
    className: "p-1.5 rounded hover:bg-orange-200 text-orange-800 transition-colors font-bold text-xs",
    title: t('formatting.h1')
  }, "H1"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleFormatText('h2'),
    className: "p-1.5 rounded hover:bg-orange-200 text-orange-800 transition-colors font-bold text-xs",
    title: t('formatting.h2')
  }, "H2"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleFormatText('h3'),
    className: "p-1.5 rounded hover:bg-orange-200 text-orange-800 transition-colors font-bold text-xs",
    title: t('formatting.h3') || 'Heading 3'
  }, "H3"), /*#__PURE__*/React.createElement("div", {
    className: "w-px h-4 bg-orange-200 mx-1"
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleFormatText('list'),
    className: "p-1.5 rounded hover:bg-orange-200 text-orange-800 transition-colors",
    title: t('formatting.list')
  }, /*#__PURE__*/React.createElement(List, {
    size: 16
  })), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleFormatText('numlist'),
    className: "p-1.5 rounded hover:bg-orange-200 text-orange-800 transition-colors",
    title: t('formatting.numlist') || 'Numbered List'
  }, /*#__PURE__*/React.createElement(ListOrdered, {
    size: 16
  }))), /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('simplified.revision.placeholder_edit_text') || 'Edit simplified text',
    "data-allo-textundo": "simplified",
    ref: textEditorRef,
    value: generatedContent?.data,
    onChange: e => handleSimplifiedTextChange(e.target.value),
    className: "w-full min-h-[500px] bg-white p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 text-lg text-slate-800 font-medium leading-relaxed resize-none font-sans",
    spellCheck: "false",
    placeholder: t('simplified.revision.placeholder_edit_text')
  }), renderEditAudioSentenceTools()) : renderSimplifiedReading()));
}
SimplifiedView.languageTag = simplifiedLanguageTag;
SimplifiedView.wordSegments = simplifiedWordSegments;
SimplifiedView.paragraphBlocks = simplifiedParagraphBlocks;
SimplifiedView.resolveReferences = resolveSimplifiedReferences;
SimplifiedView.hasCitationMarkers = simplifiedBodyHasCitationMarkers;
SimplifiedView.getInstructionalText = getSimplifiedInstructionalText;
SimplifiedView.updateInstructionalRole = updateSimplifiedInstructionalRole;
SimplifiedView.upsertFullHistoryArtifact = upsertFullHistoryArtifact;
SimplifiedView.resolveCompareSource = resolveSimplifiedCompareSource;
SimplifiedView.getComplexityDisplay = getSimplifiedComplexityDisplay;
SimplifiedView.checkAlignment = checkSimplifiedAlignment;
SimplifiedView.regenerateWithRigor = regenerateSimplifiedWithRigor;

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.SimplifiedView = SimplifiedView;
  window.AlloModules.ViewSimplifiedModule = true;
})();
