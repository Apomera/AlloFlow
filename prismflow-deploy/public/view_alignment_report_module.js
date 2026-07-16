/**
 * AlloFlow View - Alignment Report Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='alignment-report' block.
 * Source range: 116 lines body.
 * Renders: standards alignment audit report cards with text/activity/
 * assessment alignment status, evidence quotes, audit notes, gaps list,
 * admin recommendation. Display-only (no edit handlers).
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.AlignmentReportView) {
    console.log('[CDN] ViewAlignmentReportModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewAlignmentReportModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  var _lazyIcon = function (name) {
  return function (props) {
    var I = window.AlloIcons && window.AlloIcons[name];
    return I ? /*#__PURE__*/React.createElement(I, props) : null;
  };
};
var ShieldCheck = _lazyIcon('ShieldCheck');
var BookOpen = _lazyIcon('BookOpen');
var Quote = _lazyIcon('Quote');
var Layout = _lazyIcon('Layout');
var CheckSquare = _lazyIcon('CheckSquare');
var ClipboardList = _lazyIcon('ClipboardList');
var AlertCircle = _lazyIcon('AlertCircle');
var Sparkles = _lazyIcon('Sparkles');

// ─── Plan O: Comprehensive section renderers ───────────────────────────
// Each curriculum-readiness dimension renders as a card with a status and
// supporting evidence, recommendations, or an explicit incomplete state.
function statusBadgeClass(status) {
  if (status === 'Aligned' || status === 'Pass') return 'bg-green-100 text-green-700';
  if (status === 'Not Aligned' || status === 'Revise') return 'bg-red-100 text-red-700';
  if (status === 'Compute failed') return 'bg-amber-100 text-amber-800';
  if (status === 'Not evaluated' || status === 'Not applicable' || status === 'Incomplete') return 'bg-slate-200 text-slate-800';
  // 'Partially Aligned', 'Pass with notes', or anything unknown
  return 'bg-orange-100 text-orange-700';
}
var REPORT_LANGUAGE_NAME_TAGS = {
  english: 'en',
  spanish: 'es',
  french: 'fr',
  german: 'de',
  italian: 'it',
  portuguese: 'pt',
  dutch: 'nl',
  arabic: 'ar',
  chinese: 'zh',
  mandarin: 'zh',
  cantonese: 'yue',
  japanese: 'ja',
  korean: 'ko',
  hindi: 'hi',
  bengali: 'bn',
  urdu: 'ur',
  punjabi: 'pa',
  gujarati: 'gu',
  tamil: 'ta',
  telugu: 'te',
  marathi: 'mr',
  nepali: 'ne',
  russian: 'ru',
  ukrainian: 'uk',
  polish: 'pl',
  turkish: 'tr',
  vietnamese: 'vi',
  thai: 'th',
  indonesian: 'id',
  malay: 'ms',
  swahili: 'sw',
  somali: 'so',
  'haitian creole': 'ht',
  tagalog: 'tl',
  filipino: 'fil',
  greek: 'el',
  hebrew: 'he',
  persian: 'fa',
  farsi: 'fa',
  burmese: 'my',
  myanmar: 'my',
  khmer: 'km',
  lao: 'lo',
  amharic: 'am',
  yoruba: 'yo',
  zulu: 'zu',
  xhosa: 'xh',
  afrikaans: 'af',
  swedish: 'sv',
  norwegian: 'no',
  danish: 'da',
  finnish: 'fi',
  czech: 'cs',
  slovak: 'sk',
  hungarian: 'hu',
  romanian: 'ro',
  bulgarian: 'bg',
  croatian: 'hr',
  serbian: 'sr',
  bosnian: 'bs',
  slovenian: 'sl',
  albanian: 'sq',
  lithuanian: 'lt',
  latvian: 'lv',
  estonian: 'et',
  irish: 'ga',
  welsh: 'cy',
  'scottish gaelic': 'gd',
  'maay maay': 'ymm',
  'chin falam': 'cfm',
  marshallese: 'mh'
};
function normalizeReportLanguageTag(value) {
  var raw = String(value || '').trim();
  if (!raw) return 'und';
  var name = raw.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (/brazil.*portuguese|portuguese.*brazil/.test(name)) return 'pt-BR';
  if (/european.*portuguese|portuguese.*portugal/.test(name)) return 'pt-PT';
  if (/traditional.*chinese|chinese.*traditional/.test(name)) return 'zh-Hant';
  if (/simplified.*chinese|chinese.*simplified/.test(name)) return 'zh-Hans';
  if (REPORT_LANGUAGE_NAME_TAGS[name]) return REPORT_LANGUAGE_NAME_TAGS[name];
  var names = Object.keys(REPORT_LANGUAGE_NAME_TAGS).sort(function (a, b) {
    return b.length - a.length;
  });
  for (var i = 0; i < names.length; i++) {
    var languageName = names[i];
    if (new RegExp('(?:^|\\b)' + languageName.replace(/ /g, '\\s+') + '(?:\\b|$)', 'i').test(name)) return REPORT_LANGUAGE_NAME_TAGS[languageName];
  }
  if (/^(?:[a-z]{2,3})(?:[-_][a-z0-9]{2,8})*$/i.test(raw) || /^und$/i.test(raw)) {
    var candidate = raw.replace(/_/g, '-');
    try {
      if (typeof Intl !== 'undefined' && Intl.getCanonicalLocales) return Intl.getCanonicalLocales(candidate)[0] || 'und';
    } catch (e) {
      return 'und';
    }
    return candidate;
  }
  return 'und';
}
function resolveAuditLanguageTag(comprehensive) {
  if (!comprehensive) return 'und';
  return normalizeReportLanguageTag(comprehensive.auditLanguageTag || comprehensive.auditLanguage);
}
function finiteReportNumber(value) {
  return typeof value === 'number' && isFinite(value) ? value : null;
}
function boundedReportPercent(value) {
  var number = finiteReportNumber(value);
  return number === null ? null : Math.max(0, Math.min(100, Math.round(number)));
}
function boundedReportCount(value, fallback, max) {
  var number = finiteReportNumber(value);
  if (number === null) return fallback;
  number = Math.max(0, Math.floor(number));
  var upperBound = finiteReportNumber(max);
  if (upperBound !== null) number = Math.min(number, Math.max(0, Math.floor(upperBound)));
  return number;
}
function ComprehensiveSection(p) {
  var headingId = p.id ? p.id + '-heading' : undefined;
  return /*#__PURE__*/React.createElement("section", {
    id: p.id || undefined,
    "aria-labelledby": headingId,
    tabIndex: -1,
    className: "bg-white p-6 rounded-xl border border-slate-300 shadow-sm mb-6 scroll-mt-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-4 pb-3 border-b border-slate-200"
  }, /*#__PURE__*/React.createElement("h3", {
    id: headingId,
    className: "font-bold text-slate-800 flex items-center gap-2 text-lg"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, p.icon), " ", p.title), /*#__PURE__*/React.createElement("span", {
    className: 'text-[11px] uppercase font-bold px-2 py-1 rounded ' + statusBadgeClass(p.status)
  }, p.status || 'N/A')), p.children);
}

// ─── StandardsSection ─────────────────────────────────────────────────
// Standards alignment participates in the shared readiness model.
// Renders the per-standard summary header + the existing per-report cards
// inside the same ComprehensiveSection framework as the others.
function StandardsSection(p) {
  var s = p.standards;
  if (!s) return null;
  var perStandard = Array.isArray(s.perStandard) ? s.perStandard : [];
  return /*#__PURE__*/React.createElement(ComprehensiveSection, {
    id: "audit-standards",
    icon: "🎯",
    title: "Standards alignment",
    status: s.status
  }, " // Top stat row", /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-4 gap-3 mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-slate-50 rounded text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-bold text-slate-800"
  }, s.totalStandards || perStandard.length), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-600"
  }, 'Standard' + ((s.totalStandards || perStandard.length) === 1 ? '' : 's') + ' audited')), /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-emerald-50 rounded text-center border border-emerald-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-bold text-emerald-800"
  }, s.passCount || 0), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-emerald-700"
  }, "Pass")), /*#__PURE__*/React.createElement("div", {
    className: 'p-3 rounded text-center ' + ((s.reviseCount || 0) > 0 ? 'bg-rose-50 border border-rose-200' : 'bg-slate-50 border border-slate-200')
  }, /*#__PURE__*/React.createElement("div", {
    className: 'text-2xl font-bold ' + ((s.reviseCount || 0) > 0 ? 'text-rose-800' : 'text-slate-800')
  }, s.reviseCount || 0), /*#__PURE__*/React.createElement("div", {
    className: 'text-xs ' + ((s.reviseCount || 0) > 0 ? 'text-rose-700' : 'text-slate-600')
  }, "Revise")), /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-slate-50 rounded text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-bold text-slate-800 leading-tight pt-2"
  }, "Holistic Lesson Plan Audit"), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-slate-500 mt-1"
  }, "text + activities + assessment"))),
  // Per-standard collapsible cards
  perStandard.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, perStandard.map(function (report, idx) {
    var passColor = report && report.overallDetermination === 'Pass';
    var pendingColor = report && report.overallDetermination === 'Not evaluated';
    return /*#__PURE__*/React.createElement("details", {
      key: idx,
      open: !passColor,
      className: 'rounded-lg border ' + (passColor ? 'border-emerald-200 bg-emerald-50' : pendingColor ? 'border-slate-300 bg-slate-50' : 'border-rose-200 bg-rose-50')
    }, /*#__PURE__*/React.createElement("summary", {
      className: 'px-3 py-2 cursor-pointer font-semibold text-sm select-none flex items-center justify-between gap-2 ' + (passColor ? 'text-emerald-800 hover:bg-emerald-100' : pendingColor ? 'text-slate-800 hover:bg-slate-100' : 'text-rose-800 hover:bg-rose-100')
    }, /*#__PURE__*/React.createElement("span", {
      className: "flex-1 min-w-0 break-words"
    }, report && report.standard || 'Standard ' + (idx + 1)), /*#__PURE__*/React.createElement("span", {
      className: 'text-[10px] uppercase font-bold px-2 py-0.5 rounded ' + (passColor ? 'bg-emerald-200 text-emerald-900' : pendingColor ? 'bg-slate-200 text-slate-900' : 'bg-rose-200 text-rose-900')
    }, report && report.overallDetermination || 'Not evaluated')), /*#__PURE__*/React.createElement("div", {
      className: "px-3 pb-3 pt-2 bg-white rounded-b-lg space-y-2 text-xs"
    }, report && report.standardBreakdown && (report.standardBreakdown.cognitiveDemand || report.standardBreakdown.contentFocus) && /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-1 md:grid-cols-2 gap-2 mb-2 pb-2 border-b border-slate-200"
    }, report.standardBreakdown.cognitiveDemand && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
      className: "font-bold uppercase text-slate-600"
    }, "Cognitive demand: "), /*#__PURE__*/React.createElement("span", {
      className: "text-slate-800"
    }, report.standardBreakdown.cognitiveDemand)), report.standardBreakdown.contentFocus && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
      className: "font-bold uppercase text-slate-600"
    }, "Content focus: "), /*#__PURE__*/React.createElement("span", {
      className: "text-slate-800"
    }, report.standardBreakdown.contentFocus))), ['textAlignment', 'activityAlignment', 'assessmentAlignment'].map(function (key) {
      var sec = report && report.analysis && report.analysis[key];
      if (!sec) return null;
      var lbl = key === 'textAlignment' ? 'Text' : key === 'activityAlignment' ? 'Activities' : 'Assessment';
      var stat = sec.status || 'N/A';
      return /*#__PURE__*/React.createElement("div", {
        key: key,
        className: "flex items-start gap-2"
      }, /*#__PURE__*/React.createElement("span", {
        className: 'flex-shrink-0 text-[10px] uppercase font-bold px-2 py-0.5 rounded ' + statusBadgeClass(stat),
        style: {
          minWidth: '90px',
          textAlign: 'center'
        }
      }, lbl + ' · ' + stat), /*#__PURE__*/React.createElement("span", {
        className: "text-slate-700 italic"
      }, sec.evidence ? '"' + sec.evidence + '"' : '—'));
    }), report && report.adminRecommendation && /*#__PURE__*/React.createElement("div", {
      className: "mt-2 pt-2 border-t border-slate-200"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] uppercase font-bold text-indigo-700"
    }, "Recommendation: "), /*#__PURE__*/React.createElement("span", {
      className: "text-slate-800"
    }, report.adminRecommendation))));
  })), s.notes && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 text-[11px] text-slate-500 italic"
  }, s.notes));
}
function VocabularySection(p) {
  var v = p.vocab;
  if (!v) return null;
  // Backward-compat: older saved audits only have totalWords; show that as auditedTextWords.
  var sourceWords = typeof v.sourceWords === 'number' ? v.sourceWords : null;
  var auditedTextWords = typeof v.auditedTextWords === 'number' ? v.auditedTextWords : v.totalWords;
  var scaleNote = v.expected && v.expected.scale && v.expected.scale > 1.5 ? '(rescaled ×' + v.expected.scale + ' for bundle size)' : '';
  return /*#__PURE__*/React.createElement(ComprehensiveSection, {
    id: "audit-vocabulary",
    icon: "📚",
    title: "Vocabulary fit",
    status: v.status
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-4 gap-3 mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-slate-50 rounded text-center",
    title: sourceWords !== null ? 'Source words: words in the primary lesson source (matches your "lesson length" intuition).\nAudited: words across the full bundle (every artifact), used for tier classification.' : ''
  }, sourceWords !== null ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-bold text-slate-800"
  }, sourceWords), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-600"
  }, "Source words"), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-slate-500 mt-1"
  }, auditedTextWords + ' across bundle')) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-bold text-slate-800"
  }, auditedTextWords), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-600"
  }, "Total words"))), /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-blue-50 rounded text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-bold text-blue-800"
  }, v.tier2Count), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-blue-700"
  }, "Tier 2 (academic)"), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-slate-500 mt-1"
  }, 'expected ~' + (v.expected && v.expected.tier2) + ' ' + scaleNote)), /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-purple-50 rounded text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-bold text-purple-800"
  }, v.tier3Count), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-purple-700"
  }, "Tier 3 (domain)"), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-slate-500 mt-1"
  }, 'expected ~' + (v.expected && v.expected.tier3) + ' ' + scaleNote)), /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-slate-50 rounded text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-bold text-slate-800"
  }, v.glossaryTermsCount), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-600"
  }, "Glossary terms"))), v.tier2Examples && v.tier2Examples.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold text-blue-800 mb-1"
  }, "Tier 2 examples found:"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1"
  }, v.tier2Examples.map(function (w, i) {
    return /*#__PURE__*/React.createElement("span", {
      key: i,
      className: "text-xs px-2 py-0.5 bg-blue-100 text-blue-900 rounded"
    }, w);
  }))), v.tier3Examples && v.tier3Examples.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold text-purple-800 mb-1"
  }, "Tier 3 examples found:"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1"
  }, v.tier3Examples.map(function (w, i) {
    return /*#__PURE__*/React.createElement("span", {
      key: i,
      className: "text-xs px-2 py-0.5 bg-purple-100 text-purple-900 rounded"
    }, w);
  }))),
  // Reading-level harvest from analysis items
  v.readingLevels && v.readingLevels.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-slate-50 border border-slate-200 rounded mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold text-slate-700 mb-2 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "📖"), " Reading levels (from analyzed source texts)"), /*#__PURE__*/React.createElement("ul", {
    className: "space-y-1 text-sm text-slate-800"
  }, v.readingLevels.map(function (r, i) {
    return /*#__PURE__*/React.createElement("li", {
      key: i,
      className: "flex items-start gap-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-xs px-2 py-0.5 bg-slate-200 text-slate-800 rounded font-semibold whitespace-nowrap"
    }, r.range), r.explanation && /*#__PURE__*/React.createElement("span", {
      className: "text-xs text-slate-600"
    }, r.explanation.slice(0, 240)));
  }))), v.recommendations && v.recommendations.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-amber-50 border border-amber-200 rounded mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold text-amber-900 mb-1"
  }, "Heuristic recommendations:"), /*#__PURE__*/React.createElement("ul", {
    className: "list-disc ml-5 text-sm text-amber-900 space-y-1"
  }, v.recommendations.map(function (r, i) {
    return /*#__PURE__*/React.createElement("li", {
      key: i
    }, r);
  }))),
  // LLM review pairing (Plan O Step 1 enhancement)
  v.llmReview && /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-indigo-50 border border-indigo-200 rounded mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold text-indigo-900 mb-2 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "🤖"), " Literacy-coach review (AI)"), v.llmReview.narrative && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-indigo-900 mb-2"
  }, v.llmReview.narrative), v.llmReview.corrections && v.llmReview.corrections.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mb-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold text-indigo-800 mb-1"
  }, "Likely misclassified (heuristic flagged Tier 2 but really Tier 1):"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1"
  }, v.llmReview.corrections.map(function (w, i) {
    return /*#__PURE__*/React.createElement("span", {
      key: i,
      className: "text-xs px-2 py-0.5 bg-orange-100 text-orange-900 rounded line-through"
    }, w);
  }))), v.llmReview.missedTier2 && v.llmReview.missedTier2.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mb-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold text-indigo-800 mb-1"
  }, "Tier 2 words present but missed by the heuristic:"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1"
  }, v.llmReview.missedTier2.map(function (w, i) {
    return /*#__PURE__*/React.createElement("span", {
      key: i,
      className: "text-xs px-2 py-0.5 bg-blue-100 text-blue-900 rounded"
    }, w);
  }))), v.llmReview.recommendations && v.llmReview.recommendations.length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold text-indigo-800 mb-1"
  }, "Suggested Tier 2 words to add for this topic + grade:"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1"
  }, v.llmReview.recommendations.map(function (w, i) {
    return /*#__PURE__*/React.createElement("span", {
      key: i,
      className: "text-xs px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded font-semibold"
    }, '+ ' + w);
  })))), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-slate-500 italic"
  }, v.notes || ''));
}
function EngagementSection(p) {
  var e = p.eng;
  if (!e) return null;
  var dok = e.dokDistribution || {};
  var modPresent = e.multimodalCoverage && e.multimodalCoverage.present || [];
  var modMissing = e.multimodalCoverage && e.multimodalCoverage.missing || [];
  return /*#__PURE__*/React.createElement(ComprehensiveSection, {
    id: "audit-engagement",
    icon: "🎯",
    title: "Engagement variety",
    status: e.status
  }, " // Top stat row", /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-4 gap-3 mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-slate-50 rounded text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-bold text-slate-800"
  }, e.distinctTypeCount), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-600"
  }, "Distinct artifact types")), /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-slate-50 rounded text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-bold text-slate-800"
  }, e.totalArtifacts), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-600"
  }, "Total artifacts")), /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-slate-50 rounded text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-bold text-slate-800"
  }, Math.round((e.diversityScore || 0) * 100) + '%'), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-600"
  }, "Diversity score")), /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-slate-50 rounded text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-bold text-slate-800"
  }, modPresent.length + '/4'), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-600"
  }, "Modalities present"))),
  // Distinct types chips
  e.distinctTypes && e.distinctTypes.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold text-slate-700 mb-1"
  }, "Artifact types in this curriculum:"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1"
  }, e.distinctTypes.map(function (t, i) {
    return /*#__PURE__*/React.createElement("span", {
      key: i,
      className: "text-xs px-2 py-0.5 bg-indigo-100 text-indigo-900 rounded"
    }, t);
  }))), " // Modalities row", /*#__PURE__*/React.createElement("div", {
    className: "mb-3 grid grid-cols-1 md:grid-cols-2 gap-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold text-emerald-800 mb-1"
  }, "Modalities present:"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1"
  }, modPresent.length > 0 ? modPresent.map(function (m, i) {
    return /*#__PURE__*/React.createElement("span", {
      key: i,
      className: "text-xs px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded"
    }, m);
  }) : /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-slate-500 italic"
  }, "(none)"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold text-rose-800 mb-1"
  }, "Modalities missing:"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1"
  }, modMissing.length > 0 ? modMissing.map(function (m, i) {
    return /*#__PURE__*/React.createElement("span", {
      key: i,
      className: "text-xs px-2 py-0.5 bg-rose-100 text-rose-900 rounded"
    }, m);
  }) : /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-emerald-700"
  }, "all four covered")))),
  // DOK bar
  e.dokTotal > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold text-slate-700 mb-1"
  }, 'Quiz DOK distribution (' + e.dokTotal + ' items, Webb\'s framework):'), /*#__PURE__*/React.createElement("div", {
    role: "img",
    "aria-label": 'Quiz DOK distribution: Level 1 recall ' + (dok.L1 || 0) + ' percent; Level 2 skill and concept ' + (dok.L2 || 0) + ' percent; Level 3 strategic thinking ' + (dok.L3 || 0) + ' percent; Level 4 extended thinking ' + (dok.L4 || 0) + ' percent; unknown ' + (dok.unknown || 0) + ' percent.',
    className: "flex h-6 w-full rounded overflow-hidden border border-slate-200"
  }, (dok.L1 || 0) > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      width: dok.L1 + '%',
      backgroundColor: '#fde68a'
    },
    className: "flex items-center justify-center text-[10px] font-bold text-amber-900",
    title: 'L1 Recall: ' + dok.L1 + '%'
  }, dok.L1 > 8 ? 'L1 ' + dok.L1 + '%' : ''), (dok.L2 || 0) > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      width: dok.L2 + '%',
      backgroundColor: '#86efac'
    },
    className: "flex items-center justify-center text-[10px] font-bold text-green-900",
    title: 'L2 Skill/Concept: ' + dok.L2 + '%'
  }, dok.L2 > 8 ? 'L2 ' + dok.L2 + '%' : ''), (dok.L3 || 0) > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      width: dok.L3 + '%',
      backgroundColor: '#93c5fd'
    },
    className: "flex items-center justify-center text-[10px] font-bold text-blue-900",
    title: 'L3 Strategic Thinking: ' + dok.L3 + '%'
  }, dok.L3 > 8 ? 'L3 ' + dok.L3 + '%' : ''), (dok.L4 || 0) > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      width: dok.L4 + '%',
      backgroundColor: '#c4b5fd'
    },
    className: "flex items-center justify-center text-[10px] font-bold text-purple-900",
    title: 'L4 Extended Thinking: ' + dok.L4 + '%'
  }, dok.L4 > 8 ? 'L4 ' + dok.L4 + '%' : ''), (dok.unknown || 0) > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      width: dok.unknown + '%',
      backgroundColor: '#cbd5e1'
    },
    className: "flex items-center justify-center text-[10px] text-slate-700",
    title: 'Unknown: ' + dok.unknown + '%'
  }, dok.unknown > 8 ? '?' : ''))), " // Scaffold counts", /*#__PURE__*/React.createElement("div", {
    className: "mb-3 grid grid-cols-3 gap-2 text-center text-xs"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-2 bg-slate-50 rounded"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-bold text-slate-800"
  }, e.scaffoldCounts && e.scaffoldCounts.sentenceFrames || 0), /*#__PURE__*/React.createElement("div", {
    className: "text-slate-600"
  }, "sentence frames")), /*#__PURE__*/React.createElement("div", {
    className: "p-2 bg-slate-50 rounded"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-bold text-slate-800"
  }, e.scaffoldCounts && e.scaffoldCounts.simplifiedTexts || 0), /*#__PURE__*/React.createElement("div", {
    className: "text-slate-600"
  }, "simplified texts")), /*#__PURE__*/React.createElement("div", {
    className: "p-2 bg-slate-50 rounded"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-bold text-slate-800"
  }, e.scaffoldCounts && e.scaffoldCounts.leveledGlossary || 0), /*#__PURE__*/React.createElement("div", {
    className: "text-slate-600"
  }, "leveled glossaries"))),
  // Heuristic recommendations
  e.recommendations && e.recommendations.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-amber-50 border border-amber-200 rounded mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold text-amber-900 mb-1"
  }, "Heuristic recommendations:"), /*#__PURE__*/React.createElement("ul", {
    className: "list-disc ml-5 text-sm text-amber-900 space-y-1"
  }, e.recommendations.map(function (r, i) {
    return /*#__PURE__*/React.createElement("li", {
      key: i
    }, r);
  }))),
  // LLM review
  e.llmReview && /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-indigo-50 border border-indigo-200 rounded mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold text-indigo-900 mb-2 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "🤖"), " UDL + DOK review (AI)"), e.llmReview.narrative && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-indigo-900 mb-2"
  }, e.llmReview.narrative), e.llmReview.dokAssessment && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-indigo-900 mb-2 italic"
  }, '"' + e.llmReview.dokAssessment + '"'), e.llmReview.formatGaps && e.llmReview.formatGaps.length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold text-indigo-800 mb-1"
  }, "Suggested format additions:"), /*#__PURE__*/React.createElement("ul", {
    className: "list-disc ml-5 text-sm text-indigo-900 space-y-1"
  }, e.llmReview.formatGaps.map(function (g, i) {
    return /*#__PURE__*/React.createElement("li", {
      key: i
    }, g);
  })))), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-slate-500 italic"
  }, e.notes || ''));
}
function AccessibilitySection(p) {
  var a = p.access;
  if (!a) return null;
  var altPctColor = a.altCoveragePct === null ? 'slate' : a.altCoveragePct >= 80 ? 'emerald' : a.altCoveragePct >= 50 ? 'amber' : 'rose';
  return /*#__PURE__*/React.createElement(ComprehensiveSection, {
    id: "audit-accessibility",
    icon: "♿",
    title: "Content accessibility",
    status: a.status
  }, " // Top stat row", /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-4 gap-3 mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-slate-50 rounded text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-bold text-slate-800"
  }, a.totalImages), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-600"
  }, "Images")), /*#__PURE__*/React.createElement("div", {
    className: 'p-3 rounded text-center bg-' + altPctColor + '-50 border border-' + altPctColor + '-200'
  }, /*#__PURE__*/React.createElement("div", {
    className: 'text-2xl font-bold text-' + altPctColor + '-800'
  }, a.altCoveragePct === null ? 'n/a' : a.altCoveragePct + '%'), /*#__PURE__*/React.createElement("div", {
    className: 'text-xs text-' + altPctColor + '-700'
  }, "Alt-text coverage")), /*#__PURE__*/React.createElement("div", {
    className: 'p-3 rounded text-center ' + (a.colorOnlyCount > 0 ? 'bg-rose-50 border border-rose-200' : 'bg-emerald-50 border border-emerald-200')
  }, /*#__PURE__*/React.createElement("div", {
    className: 'text-2xl font-bold ' + (a.colorOnlyCount > 0 ? 'text-rose-800' : 'text-emerald-800')
  }, a.colorOnlyCount), /*#__PURE__*/React.createElement("div", {
    className: 'text-xs ' + (a.colorOnlyCount > 0 ? 'text-rose-700' : 'text-emerald-700')
  }, "Color-only refs")), /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-slate-50 rounded text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-bold text-slate-800"
  }, a.longestUnbrokenPassage), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-600"
  }, "Longest passage (words)"))),
  // Color-only examples
  a.colorOnlyExamples && a.colorOnlyExamples.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold text-rose-800 mb-1"
  }, "Color-only language found (students with color blindness cannot follow these):"), /*#__PURE__*/React.createElement("ul", {
    className: "list-disc ml-5 text-xs text-rose-900 space-y-0.5"
  }, a.colorOnlyExamples.slice(0, 6).map(function (ex, i) {
    return /*#__PURE__*/React.createElement("li", {
      key: i,
      className: "font-mono italic"
    }, '"' + ex + '"');
  }))),
  // Implicit image references
  a.implicitImageExamples && a.implicitImageExamples.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold text-amber-800 mb-1"
  }, "References to images (verify each has descriptive alt text):"), /*#__PURE__*/React.createElement("ul", {
    className: "list-disc ml-5 text-xs text-amber-900 space-y-0.5"
  }, a.implicitImageExamples.slice(0, 6).map(function (ex, i) {
    return /*#__PURE__*/React.createElement("li", {
      key: i,
      className: "font-mono italic"
    }, '"' + ex + '"');
  }))),
  // Heuristic recommendations
  a.recommendations && a.recommendations.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-amber-50 border border-amber-200 rounded mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold text-amber-900 mb-1"
  }, "Heuristic recommendations:"), /*#__PURE__*/React.createElement("ul", {
    className: "list-disc ml-5 text-sm text-amber-900 space-y-1"
  }, a.recommendations.map(function (r, i) {
    return /*#__PURE__*/React.createElement("li", {
      key: i
    }, r);
  }))),
  // LLM review with student impacts
  a.llmReview && /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-indigo-50 border border-indigo-200 rounded mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold text-indigo-900 mb-2 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "🤖"), " Accessibility-specialist review (AI)"), a.llmReview.narrative && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-indigo-900 mb-3"
  }, a.llmReview.narrative), a.llmReview.studentImpacts && a.llmReview.studentImpacts.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold text-indigo-800 mb-1"
  }, "Student-impact callouts:"), /*#__PURE__*/React.createElement("ul", {
    className: "list-disc ml-5 text-sm text-indigo-900 space-y-1"
  }, a.llmReview.studentImpacts.map(function (s, i) {
    return /*#__PURE__*/React.createElement("li", {
      key: i
    }, s);
  }))), a.llmReview.fixes && a.llmReview.fixes.length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold text-indigo-800 mb-1"
  }, "Suggested fixes:"), /*#__PURE__*/React.createElement("ul", {
    className: "list-disc ml-5 text-sm text-indigo-900 space-y-1"
  }, a.llmReview.fixes.map(function (f, i) {
    return /*#__PURE__*/React.createElement("li", {
      key: i
    }, f);
  })))), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-slate-500 italic"
  }, a.notes || ''));
}
function UdlPillar(p) {
  var pillar = p.pillar;
  if (!pillar) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-white border border-slate-200 rounded mb-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-sm text-slate-800 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    className: "text-lg"
  }, p.icon), " ", p.title), /*#__PURE__*/React.createElement("span", {
    className: 'text-[10px] uppercase font-bold px-2 py-0.5 rounded ' + statusBadgeClass(pillar.status)
  }, pillar.status || 'N/A')), pillar.evidence && /*#__PURE__*/React.createElement("div", {
    className: "mb-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] font-semibold text-emerald-800 uppercase tracking-wider"
  }, "Evidence"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-700"
  }, pillar.evidence)), pillar.gaps && /*#__PURE__*/React.createElement("div", {
    className: "mb-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] font-semibold text-rose-800 uppercase tracking-wider"
  }, "Gaps"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-700"
  }, pillar.gaps)), pillar.recommendation && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] font-semibold text-indigo-800 uppercase tracking-wider"
  }, "Recommendation"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-700"
  }, pillar.recommendation)));
}
function UdlSection(p) {
  var u = p.udl;
  if (!u) return null;
  var priors = u.priorsUsed || {};
  return /*#__PURE__*/React.createElement(ComprehensiveSection, {
    id: "audit-udl",
    icon: "🌐",
    title: "UDL principles (CAST Guidelines v3.0)",
    status: u.status
  }, " // Priors banner", /*#__PURE__*/React.createElement("div", {
    className: "mb-3 p-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, "Priors used: "), (priors.modalitiesPresent || []).length, " modalities (", (priors.modalitiesPresent || []).join(', ') || 'none', "), ", (priors.distinctTypes || []).length, " distinct artifact types, ", (priors.scaffoldCounts && priors.scaffoldCounts.sentenceFrames || 0) + (priors.scaffoldCounts && priors.scaffoldCounts.simplifiedTexts || 0) + (priors.scaffoldCounts && priors.scaffoldCounts.leveledGlossary || 0), " scaffolds."), " // Three pillars", /*#__PURE__*/React.createElement(UdlPillar, {
    pillar: u.representation,
    title: "Representation",
    icon: "👁️"
  }), /*#__PURE__*/React.createElement(UdlPillar, {
    pillar: u.engagement,
    title: "Engagement",
    icon: "✨"
  }), /*#__PURE__*/React.createElement(UdlPillar, {
    pillar: u.actionExpression,
    title: "Action & Expression",
    icon: "✍️"
  }),
  // Overall narrative
  u.overallNarrative && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold text-indigo-900 mb-1 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "🤖"), " UDL specialist synthesis (AI)"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-indigo-900"
  }, u.overallNarrative)), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-slate-500 italic mt-2"
  }, u.notes || ''));
}
function AccuracySection(p) {
  var a = p.acc;
  if (!a) return null;
  var counts = a.accuracyRatingCounts || {
    high: 0,
    medium: 0,
    low: 0
  };
  return /*#__PURE__*/React.createElement(ComprehensiveSection, {
    id: "audit-accuracy",
    icon: "✅",
    title: "Content accuracy",
    status: a.status
  }, " // Top stat row", /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-4 gap-3 mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-slate-50 rounded text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-bold text-slate-800"
  }, a.totalAnalyses), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-600"
  }, "Analyses run")), /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-emerald-50 rounded text-center border border-emerald-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-bold text-emerald-800"
  }, a.totalVerifiedFacts), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-emerald-700"
  }, "Verified facts")), /*#__PURE__*/React.createElement("div", {
    className: 'p-3 rounded text-center ' + (a.totalDiscrepancies > 0 ? 'bg-rose-50 border border-rose-200' : 'bg-slate-50 border border-slate-200')
  }, /*#__PURE__*/React.createElement("div", {
    className: 'text-2xl font-bold ' + (a.totalDiscrepancies > 0 ? 'text-rose-800' : 'text-slate-800')
  }, a.totalDiscrepancies), /*#__PURE__*/React.createElement("div", {
    className: 'text-xs ' + (a.totalDiscrepancies > 0 ? 'text-rose-700' : 'text-slate-600')
  }, "Discrepancies")), /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-slate-50 rounded text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-bold text-slate-800"
  }, counts.high + 'H/' + counts.medium + 'M/' + counts.low + 'L'), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-600"
  }, "Rating mix"))),
  // Sample verifications
  a.sampleVerifications && a.sampleVerifications.length > 0 && /*#__PURE__*/React.createElement("details", {
    className: "mb-3 bg-slate-50 border border-slate-200 rounded p-3"
  }, /*#__PURE__*/React.createElement("summary", {
    className: "cursor-pointer text-sm font-semibold text-slate-800"
  }, 'Per-analysis details (' + a.sampleVerifications.length + ')'), /*#__PURE__*/React.createElement("ul", {
    className: "mt-2 space-y-2"
  }, a.sampleVerifications.map(function (s, i) {
    var ratingColor = (s.rating || '').toLowerCase().indexOf('high') >= 0 ? 'emerald' : (s.rating || '').toLowerCase().indexOf('low') >= 0 ? 'rose' : 'amber';
    return /*#__PURE__*/React.createElement("li", {
      key: i,
      className: "p-2 bg-white border border-slate-200 rounded"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 mb-1"
    }, /*#__PURE__*/React.createElement("span", {
      className: 'text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-' + ratingColor + '-100 text-' + ratingColor + '-800'
    }, s.rating || 'Unknown'), /*#__PURE__*/React.createElement("span", {
      className: "text-xs text-slate-600"
    }, s.verifiedFactCount + ' verified, ' + s.discrepancyCount + ' discrepanc' + (s.discrepancyCount === 1 ? 'y' : 'ies'))), s.reason && /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-slate-700"
    }, s.reason));
  }))),
  // Heuristic recommendations
  a.recommendations && a.recommendations.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-amber-50 border border-amber-200 rounded mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold text-amber-900 mb-1"
  }, "Heuristic recommendations:"), /*#__PURE__*/React.createElement("ul", {
    className: "list-disc ml-5 text-sm text-amber-900 space-y-1"
  }, a.recommendations.map(function (r, i) {
    return /*#__PURE__*/React.createElement("li", {
      key: i
    }, r);
  }))),
  // LLM review with claims to verify
  a.llmReview && /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-indigo-50 border border-indigo-200 rounded mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold text-indigo-900 mb-2 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "🤖"), " Fact-checker review (AI)"), a.llmReview.narrative && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-indigo-900 mb-3"
  }, a.llmReview.narrative), a.llmReview.claimsToVerify && a.llmReview.claimsToVerify.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold text-indigo-800 mb-1"
  }, "Specific claims to double-check:"), /*#__PURE__*/React.createElement("ul", {
    className: "list-disc ml-5 text-sm text-indigo-900 space-y-1"
  }, a.llmReview.claimsToVerify.map(function (c, i) {
    return /*#__PURE__*/React.createElement("li", {
      key: i,
      className: "italic"
    }, '"' + c + '"');
  }))), a.llmReview.fixes && a.llmReview.fixes.length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold text-indigo-800 mb-1"
  }, "Suggested improvements:"), /*#__PURE__*/React.createElement("ul", {
    className: "list-disc ml-5 text-sm text-indigo-900 space-y-1"
  }, a.llmReview.fixes.map(function (f, i) {
    return /*#__PURE__*/React.createElement("li", {
      key: i
    }, f);
  })))), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-slate-500 italic"
  }, a.notes || ''));
}

// ─── DifferentiationSection ───────────────────────────────────────────
function DifferentiationSection(p) {
  var d = p.diff;
  if (!d) return null;
  var flags = d.flags || {};
  var labelMap = {
    leveledReadingText: 'Leveled text',
    multipleReadingLevels: 'Multi-level versions',
    glossarySupport: 'Glossary',
    sentenceFrames: 'Sentence frames',
    visualOrganizer: 'Visual organizer',
    quizScaffold: 'Formative check',
    interactiveOrAdventure: 'Interactive / adventure',
    visualOrImage: 'Image / visual',
    audioPath: 'Audio narration'
  };
  return /*#__PURE__*/React.createElement(ComprehensiveSection, {
    id: "audit-differentiation",
    icon: "🎚️",
    title: "Differentiation coverage",
    status: d.status
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-4 gap-3 mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-slate-50 rounded text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-bold text-slate-800"
  }, d.coverage + '%'), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-600"
  }, "UDL coverage")), /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-slate-50 rounded text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-bold text-slate-800"
  }, d.presentCount + '/' + d.totalAccommodationTypes), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-600"
  }, "Accommodation types")), /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-emerald-50 rounded text-center border border-emerald-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-bold text-emerald-800"
  }, Object.keys(flags).filter(function (k) {
    return flags[k];
  }).length), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-emerald-700"
  }, "Present")), /*#__PURE__*/React.createElement("div", {
    className: 'p-3 rounded text-center ' + (d.missing && d.missing.length > 0 ? 'bg-rose-50 border border-rose-200' : 'bg-slate-50 border border-slate-200')
  }, /*#__PURE__*/React.createElement("div", {
    className: 'text-2xl font-bold ' + (d.missing && d.missing.length > 0 ? 'text-rose-800' : 'text-slate-800')
  }, d.missing && d.missing.length || 0), /*#__PURE__*/React.createElement("div", {
    className: 'text-xs ' + (d.missing && d.missing.length > 0 ? 'text-rose-700' : 'text-slate-600')
  }, "Missing"))), " // Inventory grid", /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-3 gap-1.5 mb-3"
  }, Object.keys(flags).map(function (k) {
    var on = flags[k];
    return /*#__PURE__*/React.createElement("div", {
      key: k,
      className: 'flex items-center gap-2 text-xs px-2 py-1.5 rounded border ' + (on ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-500')
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      className: "flex-shrink-0"
    }, on ? '✓' : '○'), /*#__PURE__*/React.createElement("span", {
      className: "min-w-0 break-words"
    }, labelMap[k] || k));
  })), d.recommendations && d.recommendations.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-amber-50 border border-amber-200 rounded mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold text-amber-900 mb-1"
  }, "Heuristic recommendations:"), /*#__PURE__*/React.createElement("ul", {
    className: "list-disc ml-5 text-sm text-amber-900 space-y-1"
  }, d.recommendations.map(function (r, i) {
    return /*#__PURE__*/React.createElement("li", {
      key: i
    }, r);
  }))), d.llmReview && /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-indigo-50 border border-indigo-200 rounded mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold text-indigo-900 mb-2 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "🤖"), " UDL specialist review (AI)"), d.llmReview.narrative && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-indigo-900 mb-2"
  }, d.llmReview.narrative), d.llmReview.priorityAdditions && d.llmReview.priorityAdditions.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mb-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold text-indigo-800 mb-1"
  }, "Priority additions:"), /*#__PURE__*/React.createElement("ul", {
    className: "list-disc ml-5 text-sm text-indigo-900 space-y-1"
  }, d.llmReview.priorityAdditions.map(function (r, i) {
    return /*#__PURE__*/React.createElement("li", {
      key: i
    }, r);
  }))), d.llmReview.qualityFlags && d.llmReview.qualityFlags.length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold text-indigo-800 mb-1"
  }, "Quality flags:"), /*#__PURE__*/React.createElement("ul", {
    className: "list-disc ml-5 text-sm text-indigo-900 space-y-1"
  }, d.llmReview.qualityFlags.map(function (r, i) {
    return /*#__PURE__*/React.createElement("li", {
      key: i
    }, r);
  })))), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-slate-500 italic"
  }, d.notes || ''));
}

// ─── CognitiveLoadSection ─────────────────────────────────────────────
function CognitiveLoadSection(p) {
  var c = p.load;
  if (!c) return null;
  var b = c.breakdown || {};
  var ratioColor = c.ratio === null ? 'slate' : c.ratio >= 0.7 && c.ratio <= 1.4 ? 'emerald' : c.ratio >= 0.4 && c.ratio <= 2.0 ? 'amber' : 'rose';
  return /*#__PURE__*/React.createElement(ComprehensiveSection, {
    id: "audit-cognitiveLoad",
    icon: "⏱️",
    title: "Cognitive load / pacing",
    status: c.status
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-4 gap-3 mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-slate-50 rounded text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-bold text-slate-800"
  }, c.claimedTotalMinutes + 'm'), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-600"
  }, "Claimed")), /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-slate-50 rounded text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-bold text-slate-800"
  }, c.estimatedTotalMinutes + 'm'), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-600"
  }, "Estimated")), /*#__PURE__*/React.createElement("div", {
    className: 'p-3 rounded text-center bg-' + ratioColor + '-50 border border-' + ratioColor + '-200'
  }, /*#__PURE__*/React.createElement("div", {
    className: 'text-2xl font-bold text-' + ratioColor + '-800'
  }, c.ratio === null ? 'n/a' : c.ratio + 'x'), /*#__PURE__*/React.createElement("div", {
    className: 'text-xs text-' + ratioColor + '-700'
  }, "Estimated / Claimed")), /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-slate-50 rounded text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-bold text-slate-800 leading-tight pt-1"
  }, 'R: ' + b.reading + 'm · Q: ' + b.quiz + 'm · A: ' + b.activities + 'm'), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-slate-500 mt-1"
  }, 'Reading at ' + b.wpmAssumption + ' wpm'))),
  // Per-segment breakdown
  Array.isArray(c.perSegment) && c.perSegment.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold text-slate-700 mb-1"
  }, "Lesson plan segments:"), /*#__PURE__*/React.createElement("ul", {
    className: "space-y-0.5 text-sm text-slate-700"
  }, c.perSegment.map(function (s, i) {
    return /*#__PURE__*/React.createElement("li", {
      key: i,
      className: "flex items-center justify-between gap-2"
    }, /*#__PURE__*/React.createElement("span", null, s.label), /*#__PURE__*/React.createElement("span", {
      className: 'font-mono text-xs ' + (s.claimedMinutes !== null ? 'text-slate-800' : 'text-slate-400 italic')
    }, s.claimedMinutes !== null ? s.claimedMinutes + ' min' : '(no time given)'));
  }))), c.recommendations && c.recommendations.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-amber-50 border border-amber-200 rounded mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold text-amber-900 mb-1"
  }, "Heuristic recommendations:"), /*#__PURE__*/React.createElement("ul", {
    className: "list-disc ml-5 text-sm text-amber-900 space-y-1"
  }, c.recommendations.map(function (r, i) {
    return /*#__PURE__*/React.createElement("li", {
      key: i
    }, r);
  }))), c.llmReview && /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-indigo-50 border border-indigo-200 rounded mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold text-indigo-900 mb-2 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "🤖"), " Pacing review (AI)"), c.llmReview.narrative && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-indigo-900 mb-2"
  }, c.llmReview.narrative), c.llmReview.specificAdjustments && c.llmReview.specificAdjustments.length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold text-indigo-800 mb-1"
  }, "Specific adjustments:"), /*#__PURE__*/React.createElement("ul", {
    className: "list-disc ml-5 text-sm text-indigo-900 space-y-1"
  }, c.llmReview.specificAdjustments.map(function (r, i) {
    return /*#__PURE__*/React.createElement("li", {
      key: i
    }, r);
  })))), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-slate-500 italic"
  }, c.notes || ''));
}

// ─── CulturalResponsivenessSection ────────────────────────────────────
function CulturalResponsivenessSection(p) {
  var c = p.cr;
  if (!c) return null;
  return /*#__PURE__*/React.createElement(ComprehensiveSection, {
    id: "audit-culturalResponsiveness",
    icon: "🤝",
    title: "Cultural responsiveness",
    status: c.status
  }, c.narrative && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-800 mb-3 leading-relaxed"
  }, c.narrative),
  // Strengths
  Array.isArray(c.strengths) && c.strengths.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-emerald-50 border border-emerald-200 rounded mb-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold text-emerald-900 mb-1"
  }, "Strengths:"), /*#__PURE__*/React.createElement("ul", {
    className: "list-disc ml-5 text-sm text-emerald-900 space-y-1"
  }, c.strengths.map(function (r, i) {
    return /*#__PURE__*/React.createElement("li", {
      key: i
    }, r);
  }))),
  // Gaps
  Array.isArray(c.gaps) && c.gaps.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-amber-50 border border-amber-200 rounded mb-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold text-amber-900 mb-1"
  }, "Gaps:"), /*#__PURE__*/React.createElement("ul", {
    className: "list-disc ml-5 text-sm text-amber-900 space-y-1"
  }, c.gaps.map(function (r, i) {
    return /*#__PURE__*/React.createElement("li", {
      key: i
    }, r);
  }))),
  // Additions (the actionable list)
  Array.isArray(c.additions) && c.additions.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-indigo-50 border border-indigo-200 rounded mb-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold text-indigo-900 mb-1"
  }, "Suggested additions:"), /*#__PURE__*/React.createElement("ul", {
    className: "list-disc ml-5 text-sm text-indigo-900 space-y-1"
  }, c.additions.map(function (r, i) {
    return /*#__PURE__*/React.createElement("li", {
      key: i
    }, r);
  }))), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-slate-500 italic mt-2"
  }, c.notes || ''));
}
var READINESS_DIMENSION_LABELS = {
  standards: 'Standards',
  vocabulary: 'Vocab',
  engagement: 'Engagement',
  accessibility: 'Access',
  udl: 'UDL',
  accuracy: 'Accuracy',
  differentiation: 'Differentiation',
  cognitiveLoad: 'Pacing',
  culturalResponsiveness: 'Representation'
};
function ReadinessDimensionNav(p) {
  var o = p.overall || {};
  var dimScores = o.perDimensionPercent || {};
  return /*#__PURE__*/React.createElement("nav", {
    "aria-label": "Audit dimension results"
  }, /*#__PURE__*/React.createElement("ul", {
    className: "flex flex-wrap gap-2 list-none p-0 m-0"
  }, ALL_DIMENSIONS_FOR_RENDER.map(function (dim) {
    var dimData = (o.dimensionScores || {})[dim] || {};
    var pctValue = boundedReportPercent(dimScores[dim]);
    var pct = pctValue !== null ? pctValue + '%' : null;
    // Older saved audits may not include dimensionScores. Preserve all nine
    // navigation targets and infer only what their recorded percentage proves.
    var status = dimData.status || (dimData.computeFailed ? 'Compute failed' : dimData.notApplicable ? 'Not applicable' : dimData.notEvaluated ? 'Not evaluated' : pctValue === 100 ? 'Aligned' : pctValue === 0 ? 'Not Aligned' : pctValue !== null ? 'Partially Aligned' : 'Not evaluated');
    var label = READINESS_DIMENSION_LABELS[dim] || dim;
    var chipColor = status === 'Aligned' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : status === 'Not Aligned' ? 'bg-rose-100 text-rose-800 border-rose-300' : status === 'Partially Aligned' ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-slate-100 text-slate-800 border-slate-300';
    return /*#__PURE__*/React.createElement("li", {
      key: dim
    }, /*#__PURE__*/React.createElement("a", {
      href: '#audit-' + dim,
      "aria-label": label + ': ' + status + (pct ? ', ' + pct : ''),
      className: 'flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 ' + chipColor
    }, /*#__PURE__*/React.createElement("span", null, label), /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }, "·"), /*#__PURE__*/React.createElement("span", null, status), pct && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }, "·"), /*#__PURE__*/React.createElement("span", {
      className: "font-bold"
    }, pct))));
  })));
}
function ReadinessScoreCard(p) {
  var o = p.overall;
  if (!o) return null;
  var scoreValue = boundedReportPercent(o.score);
  if (scoreValue === null) scoreValue = boundedReportPercent(o.provisionalScore);
  var score = scoreValue === null ? 0 : scoreValue;
  var isIncomplete = !!o.incomplete || scoreValue === null;
  var dimEvaluated = boundedReportCount(o.dimensionsEvaluated, 0);

  // Empty-state: no comprehensive dimensions ran, render an informative
  // fallback rather than a misleading 0 / 100 score.
  if (dimEvaluated === 0) {
    return /*#__PURE__*/React.createElement("div", {
      className: "p-6 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 mb-8 text-center"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-4xl mb-2",
      "aria-hidden": "true"
    }, "📊"), /*#__PURE__*/React.createElement("h3", {
      className: "text-xs font-bold uppercase tracking-wider text-slate-600 mb-1"
    }, "Curriculum Readiness Score"), /*#__PURE__*/React.createElement("div", {
      className: "text-lg font-bold text-slate-700 mb-2"
    }, "Not enough artifacts to compute"), /*#__PURE__*/React.createElement("p", {
      className: "text-sm text-slate-600 max-w-md mx-auto"
    }, "Generate a few artifacts (analysis, glossary, quiz, sentence frames, etc.) before running the audit to get a meaningful readiness score."), /*#__PURE__*/React.createElement("div", {
      className: "mt-4 text-left"
    }, /*#__PURE__*/React.createElement(ReadinessDimensionNav, {
      overall: o
    })));
  }

  // Color band by score
  var band, ringColor, bgColor, textColor;
  if (o.blockingIssues && o.blockingIssues.length > 0) {
    band = 'rose';
    ringColor = '#dc2626';
    bgColor = '#fef2f2';
    textColor = '#991b1b';
  } else if (isIncomplete) {
    band = 'slate';
    ringColor = '#64748b';
    bgColor = '#f8fafc';
    textColor = '#334155';
  } else if (score >= 90) {
    band = 'emerald';
    ringColor = '#059669';
    bgColor = '#ecfdf5';
    textColor = '#065f46';
  } else if (score >= 70) {
    band = 'lime';
    ringColor = '#65a30d';
    bgColor = '#f7fee7';
    textColor = '#365314';
  } else if (score >= 50) {
    band = 'amber';
    ringColor = '#d97706';
    bgColor = '#fffbeb';
    textColor = '#92400e';
  } else {
    band = 'rose';
    ringColor = '#dc2626';
    bgColor = '#fef2f2';
    textColor = '#991b1b';
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "p-5 rounded-2xl border-2 mb-8 shadow-sm",
    style: {
      backgroundColor: bgColor,
      borderColor: ringColor
    }
  }, " // Polish #2: Score circle removed — already rendered in the executive summary banner // above. This card now functions as the per-dimension chip strip + blocking-issues // detail panel that didn't fit in the summary banner.", /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-xs font-bold uppercase tracking-wider mb-3",
    style: {
      color: textColor
    }
  }, "Per-Dimension Breakdown"), " // Per-dimension status links", /*#__PURE__*/React.createElement(ReadinessDimensionNav, {
    overall: o
  }), o.blockingIssues && o.blockingIssues.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 p-2 bg-white border border-rose-300 rounded text-xs"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-bold text-rose-900 mb-1"
  }, "🔴 Blocking issues (must fix before Pass):"), /*#__PURE__*/React.createElement("ul", {
    className: "list-disc ml-5 text-rose-900 space-y-1"
  }, o.blockingIssues.map(function (b, i) {
    return /*#__PURE__*/React.createElement("li", {
      key: i
    }, /*#__PURE__*/React.createElement("span", {
      className: "font-semibold"
    }, b.dimension + ': '), b.issue);
  }))), o.incompleteIssues && o.incompleteIssues.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 p-2 bg-white border border-slate-300 rounded text-xs"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-bold text-slate-900 mb-1"
  }, "Incomplete evidence:"), /*#__PURE__*/React.createElement("ul", {
    className: "list-disc ml-5 text-slate-800 space-y-1"
  }, o.incompleteIssues.map(function (b, i) {
    return /*#__PURE__*/React.createElement("li", {
      key: i
    }, /*#__PURE__*/React.createElement("span", {
      className: "font-semibold"
    }, b.dimension + ': '), b.issue);
  })))), (o.scoreBasis || o.notes) && /*#__PURE__*/React.createElement("details", {
    className: "mt-3 p-2 bg-white border border-slate-300 rounded text-xs text-slate-800"
  }, /*#__PURE__*/React.createElement("summary", {
    className: "cursor-pointer font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded"
  }, "How scoring works"), o.scoreBasis && /*#__PURE__*/React.createElement("p", {
    className: "mt-2"
  }, o.scoreBasis), o.notes && /*#__PURE__*/React.createElement("p", {
    className: "mt-1 italic"
  }, o.notes)));
}
var ALL_DIMENSIONS_FOR_RENDER = ['standards', 'vocabulary', 'engagement', 'accessibility', 'udl', 'accuracy', 'differentiation', 'cognitiveLoad', 'culturalResponsiveness'];

// ─── ExecutiveSummary helpers ─────────────────────────────────────────
// Pull and rank the top recommendations across all dimensions so a teacher
// sees "what to fix" at the top of the report without scrolling through
// nine separate dimension cards.
function extractTopRecommendations(comprehensive, n) {
  var all = [];
  if (!comprehensive) return all;
  var dimLabel = {
    standards: 'Standards',
    vocabulary: 'Vocabulary',
    engagement: 'Engagement',
    accessibility: 'Accessibility',
    udl: 'UDL',
    accuracy: 'Accuracy',
    differentiation: 'Differentiation',
    cognitiveLoad: 'Pacing',
    culturalResponsiveness: 'Representation'
  };
  // Priority 0: blocking issues from readiness-score roll-up (Not Aligned dimensions)
  var overall = comprehensive.overall;
  // Reverse-lookup: blocking issues store dimension as a label string ("Content accessibility")
  // — map back to keys ('accessibility') so links resolve.
  var labelToKey = {
    'Standards alignment': 'standards',
    'Vocabulary fit': 'vocabulary',
    'Engagement variety': 'engagement',
    'Content accessibility': 'accessibility',
    'UDL principles': 'udl',
    'Content accuracy': 'accuracy',
    'Differentiation coverage': 'differentiation',
    'Cognitive load / pacing': 'cognitiveLoad',
    'Cultural responsiveness': 'culturalResponsiveness'
  };
  if (overall && Array.isArray(overall.blockingIssues)) {
    overall.blockingIssues.forEach(function (b) {
      if (!b || !b.issue) return;
      var dimLabelStr = b.dimension || 'Critical';
      all.push({
        priority: 0,
        dimension: dimLabelStr,
        dimensionKey: labelToKey[dimLabelStr] || null,
        text: b.issue
      });
    });
  }
  ALL_DIMENSIONS_FOR_RENDER.forEach(function (dim) {
    var d = comprehensive[dim];
    if (!d || d.computeFailed || d.notApplicable || d.status === 'Aligned') return;
    var priority = d.status === 'Not Aligned' ? 1 : 2;
    var label = dimLabel[dim] || dim;
    if (Array.isArray(d.recommendations)) d.recommendations.forEach(function (r) {
      if (typeof r === 'string') all.push({
        priority: priority,
        dimension: label,
        dimensionKey: dim,
        text: r
      });
    });
    if (d.llmReview) {
      if (Array.isArray(d.llmReview.fixes)) d.llmReview.fixes.forEach(function (r) {
        if (typeof r === 'string') all.push({
          priority: priority,
          dimension: label,
          dimensionKey: dim,
          text: r
        });
      });
      if (Array.isArray(d.llmReview.formatGaps)) d.llmReview.formatGaps.forEach(function (r) {
        if (typeof r === 'string') all.push({
          priority: priority,
          dimension: label,
          dimensionKey: dim,
          text: r
        });
      });
      if (Array.isArray(d.llmReview.recommendations)) d.llmReview.recommendations.forEach(function (r) {
        if (typeof r === 'string') all.push({
          priority: priority + 0.5,
          dimension: label,
          dimensionKey: dim,
          text: 'Add Tier 2 word: "' + r + '"'
        });
      });
      // Plan R+ new-dimension fields
      if (Array.isArray(d.llmReview.priorityAdditions)) d.llmReview.priorityAdditions.forEach(function (r) {
        if (typeof r === 'string') all.push({
          priority: priority,
          dimension: label,
          dimensionKey: dim,
          text: r
        });
      });
      if (Array.isArray(d.llmReview.specificAdjustments)) d.llmReview.specificAdjustments.forEach(function (r) {
        if (typeof r === 'string') all.push({
          priority: priority,
          dimension: label,
          dimensionKey: dim,
          text: r
        });
      });
    }
    // Cultural responsiveness stores additions at the dimension top level (not under llmReview)
    if (dim === 'culturalResponsiveness' && Array.isArray(d.additions)) d.additions.forEach(function (r) {
      if (typeof r === 'string') all.push({
        priority: priority,
        dimension: label,
        dimensionKey: dim,
        text: r
      });
    });
  });
  // UDL pillar recommendations — all anchor to the single UDL card
  if (comprehensive.udl && !comprehensive.udl.computeFailed) {
    ['representation', 'engagement', 'actionExpression'].forEach(function (pillar) {
      var p = comprehensive.udl[pillar];
      if (p && p.recommendation && p.status !== 'Aligned') {
        var pname = pillar === 'actionExpression' ? 'Action & Expression' : pillar.charAt(0).toUpperCase() + pillar.slice(1);
        all.push({
          priority: p.status === 'Not Aligned' ? 1 : 2,
          dimension: 'UDL · ' + pname,
          dimensionKey: 'udl',
          text: p.recommendation
        });
      }
    });
  }
  all.sort(function (a, b) {
    return a.priority - b.priority;
  });
  var seenRecommendations = new Set();
  var uniqueRecommendations = all.filter(function (item) {
    var normalizedText = String(item.text || '').replace(/\s+/g, ' ').trim().toLowerCase();
    var key = String(item.dimensionKey || item.dimension || '') + '|' + normalizedText;
    if (!normalizedText || seenRecommendations.has(key)) return false;
    seenRecommendations.add(key);
    return true;
  });
  return uniqueRecommendations.slice(0, typeof n === 'number' ? n : 4);
}
function ExecutiveSummary(p) {
  var c = p.comp;
  var t = typeof p.t === 'function' ? p.t : function () {
    return 'Curriculum audit summary';
  };
  var standardsReportCount = p.standardsReportCount || 0;
  var onApplyFixes = p.onApplyFixes;
  var generatedAt = c && c.auditMetadata && c.auditMetadata.generatedAt;
  var generatedDateLabel = null;
  if (generatedAt) {
    var generatedDate = new Date(generatedAt);
    if (!isNaN(generatedDate.getTime())) {
      generatedDateLabel = generatedDate.toLocaleString();
    }
  }
  if (!c) return null;
  var overall = c.overall || {};
  var certifiedScore = boundedReportPercent(overall.score);
  var score = certifiedScore !== null ? certifiedScore : boundedReportPercent(overall.provisionalScore);
  var scoreIsProvisional = certifiedScore === null && score !== null;
  var dimTotal = boundedReportCount(overall.totalDimensions, ALL_DIMENSIONS_FOR_RENDER.length);
  var dimApplicable = boundedReportCount(overall.dimensionsApplicable, dimTotal, dimTotal);
  var dimEvaluated = boundedReportCount(overall.dimensionsEvaluated, 0, dimApplicable);
  var failedDims = ALL_DIMENSIONS_FOR_RENDER.filter(function (d) {
    return c[d] && c[d].computeFailed;
  });
  var topRecs = extractTopRecommendations(c, 4);
  var hasContent = score !== null || topRecs.length > 0 || failedDims.length > 0;
  if (!hasContent) return null;
  var statusClr;
  if (overall.blockingIssues && overall.blockingIssues.length > 0) statusClr = {
    ring: '#dc2626',
    bg: '#fef2f2',
    text: '#991b1b',
    accent: 'rose'
  };else if (scoreIsProvisional || score === null) statusClr = {
    ring: '#94a3b8',
    bg: '#f8fafc',
    text: '#334155',
    accent: 'slate'
  };else if (score >= 90) statusClr = {
    ring: '#059669',
    bg: '#ecfdf5',
    text: '#065f46',
    accent: 'emerald'
  };else if (score >= 70) statusClr = {
    ring: '#65a30d',
    bg: '#f7fee7',
    text: '#365314',
    accent: 'lime'
  };else if (score >= 50) statusClr = {
    ring: '#d97706',
    bg: '#fffbeb',
    text: '#92400e',
    accent: 'amber'
  };else statusClr = {
    ring: '#dc2626',
    bg: '#fef2f2',
    text: '#991b1b',
    accent: 'rose'
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "p-5 rounded-2xl border-2 mb-6 shadow-md max-w-4xl mx-auto",
    style: {
      backgroundColor: statusClr.bg,
      borderColor: statusClr.ring
    },
    role: "region",
    "aria-label": t("a11y.curriculum_audit_summary")
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-5 mb-3 flex-wrap"
  },
  // Score circle
  score !== null && dimEvaluated > 0 && /*#__PURE__*/React.createElement("div", {
    className: "relative flex-shrink-0",
    style: {
      width: '88px',
      height: '88px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "sr-only"
  }, (scoreIsProvisional ? 'Provisional curriculum readiness score: ' : 'Curriculum readiness score: ') + score + ' out of 100.'), /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 88 88",
    style: {
      width: '88px',
      height: '88px'
    },
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: 44,
    cy: 44,
    r: 38,
    fill: "none",
    stroke: "#e2e8f0",
    strokeWidth: 8
  }), /*#__PURE__*/React.createElement("circle", {
    cx: 44,
    cy: 44,
    r: 38,
    fill: "none",
    stroke: statusClr.ring,
    strokeWidth: 8,
    strokeDasharray: (Math.PI * 2 * 38).toFixed(2),
    strokeDashoffset: (Math.PI * 2 * 38 * (1 - score / 100)).toFixed(2),
    strokeLinecap: "round",
    transform: "rotate(-90 44 44)"
  }), /*#__PURE__*/React.createElement("text", {
    x: 44,
    y: 50,
    textAnchor: "middle",
    fontSize: 24,
    fontWeight: 900,
    fill: statusClr.text,
    fontFamily: "system-ui, sans-serif"
  }, score))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] font-bold uppercase tracking-wider mb-0.5",
    style: {
      color: statusClr.text
    }
  }, "Curriculum Audit"), /*#__PURE__*/React.createElement("h2", {
    className: "text-xl font-black mb-1",
    style: {
      color: statusClr.text
    }
  }, score !== null && dimEvaluated > 0 ? overall.label || score + ' / 100' : dimEvaluated === 0 ? 'No comprehensive dimensions evaluated' : 'Audit summary'), /*#__PURE__*/React.createElement("div", {
    className: "text-xs",
    style: {
      color: statusClr.text
    }
  }, standardsReportCount > 0 ? standardsReportCount + ' standard' + (standardsReportCount === 1 ? '' : 's') + ' audited · ' : '', dimEvaluated + ' of ' + dimApplicable + ' applicable comprehensive dimension' + (dimApplicable === 1 ? '' : 's') + ' evaluated · ' + dimTotal + ' total', failedDims.length > 0 ? ' · ' + failedDims.length + ' failed to compute' : '', generatedDateLabel ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", null, " · Generated "), /*#__PURE__*/React.createElement("time", {
    dateTime: generatedAt
  }, generatedDateLabel)) : null)),
  // Apply fixes button
  typeof onApplyFixes === 'function' && (topRecs.length > 0 || dimEvaluated > 0) && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onApplyFixes,
    className: "flex-shrink-0 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2",
    title: "Open Audit Remediator: review and apply fixes"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "🛠️"), " Apply suggested fixes"),
  // Plan S+ Audit↔Quiz bridge: "Generate Pre-Check on identified gaps".
  // Pulls priority gaps from the audit and seeds a Pre-Check Quiz with
  // them — closing the loop from "audit found prereq gaps" to "students
  // can practice those before the lesson lands."
  typeof p.onGeneratePreCheck === 'function' && topRecs.length > 0 && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: function () {
      p.onGeneratePreCheck(topRecs);
    },
    className: "flex-shrink-0 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2",
    title: "Generate a Pre-Check Quiz that probes the prerequisites the audit identified as gaps. Students take the quiz before the lesson; missed concepts get just-in-time AI explainers."
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "🎯"), " Pre-Check from gaps")),
  // Failed dimensions warning
  failedDims.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mt-2 p-2 bg-amber-50 border border-amber-300 rounded text-xs text-amber-900"
  }, /*#__PURE__*/React.createElement("strong", null, '⚠ ' + failedDims.length + ' dimension' + (failedDims.length === 1 ? '' : 's') + ' failed to compute: '), failedDims.map(function (d) {
    return c[d] && c[d].notes ? d : d;
  }).join(', '), ". The audit ran but is incomplete; try regenerating."),
  // Top recommendations
  topRecs.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mt-3"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-[11px] font-bold uppercase tracking-wider mb-2",
    style: {
      color: statusClr.text
    }
  }, 'Top ' + topRecs.length + ' suggested fix' + (topRecs.length === 1 ? '' : 'es')), /*#__PURE__*/React.createElement("ol", {
    className: "space-y-1.5 ml-1"
  }, topRecs.map(function (r, i) {
    var prClass = r.priority <= 0.5 ? 'bg-rose-100 text-rose-900 border-rose-300 hover:bg-rose-200' : r.priority <= 1.5 ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200' : 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200';
    // Polish #3: when the rec carries a dimensionKey, render the chip as an
    // anchor that smooth-scrolls to the matching dimension card. Falls back
    // to a plain span when no dimensionKey is available (e.g., generic blocking
    // issue with an unrecognized dimension label).
    var chipChildren = [/*#__PURE__*/React.createElement("span", {
      key: "lbl"
    }, r.dimension), r.dimensionKey ? /*#__PURE__*/React.createElement("span", {
      key: "arr",
      "aria-hidden": "true",
      className: "opacity-60"
    }, " ↓") : null];
    var chip = r.dimensionKey ? /*#__PURE__*/React.createElement("a", {
      href: '#audit-' + r.dimensionKey,
      className: 'flex-shrink-0 inline-flex items-center justify-center text-[10px] font-bold uppercase px-2 py-0.5 rounded border no-underline transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2 ' + prClass,
      style: {
        minWidth: '90px',
        textAlign: 'center'
      },
      title: 'Jump to ' + r.dimension + ' card',
      onClick: function (ev) {
        var el = document.getElementById('audit-' + r.dimensionKey);
        if (el) {
          ev.preventDefault();
          var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          el.scrollIntoView({
            behavior: reduceMotion ? 'auto' : 'smooth',
            block: 'start'
          });
          el.focus({
            preventScroll: true
          });
          if (!reduceMotion) {
            // Brief flash to visually anchor the user's eye.
            el.style.transition = 'box-shadow 800ms ease-out';
            el.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.4)';
            setTimeout(function () {
              el.style.boxShadow = '';
            }, 1200);
          }
        }
      }
    }, chipChildren) : /*#__PURE__*/React.createElement("span", {
      className: 'flex-shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded border ' + prClass,
      style: {
        minWidth: '90px',
        textAlign: 'center'
      }
    }, r.dimension);
    return /*#__PURE__*/React.createElement("li", {
      key: i,
      className: "flex items-start gap-2 text-sm"
    }, chip, /*#__PURE__*/React.createElement("span", {
      className: "text-slate-800",
      style: {
        color: statusClr.text
      }
    }, r.text));
  }))));
}
function formatCoverageMetric(numerator, denominator, percent, unitLabel) {
  var safeDenominator = boundedReportCount(denominator, null);
  if (safeDenominator === null || safeDenominator <= 0) return 'N/A — no eligible ' + unitLabel;
  var safeNumerator = boundedReportCount(numerator, null, safeDenominator);
  if (safeNumerator === null) return 'Not recorded in this saved audit';
  var resolvedPercent = boundedReportPercent(percent);
  if (resolvedPercent === null) resolvedPercent = boundedReportPercent(safeNumerator / safeDenominator * 100);
  return safeNumerator + ' of ' + safeDenominator + ' ' + unitLabel + ' (' + resolvedPercent + '%)';
}
function AudioMetric(p) {
  return /*#__PURE__*/React.createElement("div", {
    className: "p-3 rounded-lg bg-white border border-indigo-200"
  }, /*#__PURE__*/React.createElement("dt", {
    className: "text-xs font-bold text-indigo-950"
  }, p.label), /*#__PURE__*/React.createElement("dd", {
    className: "mt-1 text-sm font-semibold text-slate-900"
  }, p.value), p.detail && /*#__PURE__*/React.createElement("dd", {
    className: "mt-1 text-xs text-slate-700"
  }, p.detail));
}
function AudioCoverageSummary(p) {
  var a = p.audio;
  if (!a) return null;
  var exactUnscopedCount = boundedReportCount(a.unscopedAudioArtifacts, null);
  var hasExactUnscopedCount = exactUnscopedCount !== null;
  var legacyEmbeddedCount = boundedReportCount(a.unscopedEmbeddedAudioArtifacts, 0);
  var legacyPreparedCount = boundedReportCount(a.unscopedPreparedAudioArtifacts, 0);
  var unscopedCount = hasExactUnscopedCount ? exactUnscopedCount : Math.max(legacyEmbeddedCount, legacyPreparedCount);
  var runtimeFallbackCount = boundedReportCount(a.runtimeFallbackArtifacts, null);
  return /*#__PURE__*/React.createElement("section", {
    "aria-labelledby": "audit-audio-coverage-heading",
    className: "mb-4 p-4 rounded-xl border border-indigo-300 bg-indigo-50 text-indigo-950"
  }, /*#__PURE__*/React.createElement("h3", {
    id: "audit-audio-coverage-heading",
    className: "font-bold text-base"
  }, "Audio access coverage"), /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-sm text-indigo-950"
  }, "Capability, dedicated controls, embedded files, and synchronized audio are different evidence levels. Counts below use readable resources or readable sentences as their denominator."), /*#__PURE__*/React.createElement("dl", {
    className: "mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement(AudioMetric, {
    label: "App-wide read aloud",
    value: formatCoverageMetric(a.readAloudCapableArtifacts, a.readableArtifacts, a.readAloudCapabilityPct, 'readable resources'),
    detail: "Counts resources that can use the global Read This Page text-to-speech pathway."
  }), /*#__PURE__*/React.createElement(AudioMetric, {
    label: "Dedicated read-aloud controls",
    value: formatCoverageMetric(a.dedicatedReadAloudArtifacts, a.readableArtifacts, a.dedicatedReadAloudPct, 'readable resources'),
    detail: "Counts resources with their own Listen or read-aloud controls."
  }), /*#__PURE__*/React.createElement(AudioMetric, {
    label: "Embedded audio files",
    value: formatCoverageMetric(a.embeddedAudioArtifacts, a.readableArtifacts, a.embeddedAudioPct, 'readable resources'),
    detail: "Counts audio already attached to a readable resource; on-demand TTS is not counted here."
  }), /*#__PURE__*/React.createElement(AudioMetric, {
    label: "Prepared synchronized audio",
    value: formatCoverageMetric(a.preparedSentences, a.expectedSentences, a.preparedSentenceCoveragePct, 'readable sentences'),
    detail: "Counts saved sentence clips that match readable sentences in the audited resources."
  })), a.runtimeFallbackAvailable && /*#__PURE__*/React.createElement("p", {
    className: "mt-3 text-xs text-indigo-950"
  }, /*#__PURE__*/React.createElement("strong", null, "Runtime fallback:"), runtimeFallbackCount !== null ? ' ' + runtimeFallbackCount + ' readable resource' + (runtimeFallbackCount === 1 ? ' relies' : 's rely') + ' on on-demand speech for one or more sentences because prepared synchronized audio is incomplete.' : ' At least one readable resource can be spoken on demand but does not have complete prepared synchronized audio.'), unscopedCount > 0 && /*#__PURE__*/React.createElement("p", {
    className: "mt-2 text-xs text-amber-950 bg-amber-50 border border-amber-300 rounded p-2"
  }, /*#__PURE__*/React.createElement("strong", null, "Unscoped audio:"), (hasExactUnscopedCount ? ' ' : ' At least ') + unscopedCount + ' audio-bearing artifact' + (unscopedCount === 1 ? ' was' : 's were') + ' excluded from coverage percentages because no readable source text could be matched to the audio.'), a.notes && /*#__PURE__*/React.createElement("p", {
    className: "mt-2 text-xs text-slate-700 italic"
  }, a.notes));
}
function FailedDimensionCard(p) {
  var d = p.data;
  var label = p.label;
  if (!d || !d.computeFailed) return null;
  var headingId = p.id ? p.id + '-heading' : undefined;
  return /*#__PURE__*/React.createElement("section", {
    id: p.id || undefined,
    "aria-labelledby": headingId,
    tabIndex: -1,
    className: "bg-amber-50 p-4 rounded-xl border border-amber-300 shadow-sm mb-6 scroll-mt-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    className: "text-lg"
  }, "⚠"), /*#__PURE__*/React.createElement("h3", {
    id: headingId,
    className: "font-bold text-amber-900"
  }, label + ' — could not be computed'), /*#__PURE__*/React.createElement("span", {
    className: "ml-auto text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900"
  }, "Failed")), d.notes && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-amber-900 mb-2"
  }, d.notes), d.error && /*#__PURE__*/React.createElement("details", {
    className: "text-xs text-amber-800"
  }, /*#__PURE__*/React.createElement("summary", {
    className: "cursor-pointer font-semibold"
  }, "Show error"), /*#__PURE__*/React.createElement("pre", {
    className: "mt-1 p-2 bg-amber-100 rounded overflow-x-auto whitespace-pre-wrap"
  }, d.error)));
}
function NotEvaluatedCard(p) {
  var d = p.data;
  var label = p.label;
  if (!d || !d.notEvaluated) return null;
  var reason = d.reason || Array.isArray(d.recommendations) && d.recommendations[0] || d.notes || 'Required evidence was not available for this dimension.';
  var headingId = p.id ? p.id + '-heading' : undefined;
  return /*#__PURE__*/React.createElement("section", {
    id: p.id || undefined,
    "aria-labelledby": headingId,
    tabIndex: -1,
    className: "bg-slate-50 p-4 rounded-xl border border-slate-300 shadow-sm mb-6 scroll-mt-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    className: "text-lg"
  }, "◌"), /*#__PURE__*/React.createElement("h3", {
    id: headingId,
    className: "font-bold text-slate-800"
  }, label), /*#__PURE__*/React.createElement("span", {
    className: "ml-auto text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800"
  }, "Not evaluated")), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-700"
  }, reason), Array.isArray(d.recommendations) && d.recommendations.length > 1 && /*#__PURE__*/React.createElement("ul", {
    className: "list-disc ml-5 mt-2 text-sm text-slate-700 space-y-1"
  }, d.recommendations.slice(1, 5).map(function (item, index) {
    return /*#__PURE__*/React.createElement("li", {
      key: index
    }, item);
  })));
}
function MissingDimensionCard(p) {
  return /*#__PURE__*/React.createElement(NotEvaluatedCard, {
    id: p.id,
    label: p.label,
    data: {
      notEvaluated: true,
      reason: 'This required dimension was not returned by the saved audit. Regenerate the audit to complete this evidence.'
    }
  });
}

// Plan R+: N/A card for dimensions explicitly flagged as Not Applicable
// (e.g., standards alignment when the teacher hasn't entered any target
// standards, or the future cultural-responsiveness dimension when content
// has no human-context surface area). Excluded from the readiness score.
function NotApplicableCard(p) {
  var d = p.data;
  var label = p.label;
  if (!d || !d.notApplicable) return null;
  var headingId = p.id ? p.id + '-heading' : undefined;
  return /*#__PURE__*/React.createElement("section", {
    id: p.id || undefined,
    "aria-labelledby": headingId,
    tabIndex: -1,
    className: "bg-slate-50 p-4 rounded-xl border border-dashed border-slate-300 shadow-sm mb-6 scroll-mt-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    className: "text-lg"
  }, "➖"), /*#__PURE__*/React.createElement("h3", {
    id: headingId,
    className: "font-bold text-slate-700"
  }, label), /*#__PURE__*/React.createElement("span", {
    className: "ml-auto text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700"
  }, "Not applicable")), d.reason && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-600"
  }, d.reason));
}
function ComprehensiveBlock(p) {
  var c = p.comp;
  if (!c) return null;
  return /*#__PURE__*/React.createElement("section", {
    "aria-labelledby": "audit-findings-heading",
    className: "mt-8 pt-6 border-t border-slate-200 max-w-4xl mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-6"
  }, /*#__PURE__*/React.createElement("h2", {
    id: "audit-findings-heading",
    className: "text-xl font-black text-slate-800 uppercase tracking-tight mb-1"
  }, "Per-Dimension Findings"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-600"
  }, "Detailed evidence and recommendations from each comprehensive audit dimension. Apply fixes from the summary panel above.")), c.auditScope && /*#__PURE__*/React.createElement("div", {
    className: "mb-4 p-3 rounded border border-slate-300 bg-slate-50 text-sm text-slate-800"
  }, /*#__PURE__*/React.createElement("strong", null, "Audit scope: "), (c.auditScope.includedArtifactIds || []).length + ' artifact' + ((c.auditScope.includedArtifactIds || []).length === 1 ? '' : 's'), (c.auditScope.includedTypes || []).length > 0 ? /*#__PURE__*/React.createElement("span", null, ' · ' + c.auditScope.includedTypes.join(', ')) : null, c.auditScope.selectionMode ? /*#__PURE__*/React.createElement("span", null, ' · Selection: ' + c.auditScope.selectionMode) : null, (c.auditScope.excludedArtifactCount || 0) > 0 ? /*#__PURE__*/React.createElement("span", null, ' · ' + c.auditScope.excludedArtifactCount + ' eligible artifact' + (c.auditScope.excludedArtifactCount === 1 ? '' : 's') + ' outside scope') : null, c.auditScope.contextTruncated ? /*#__PURE__*/React.createElement("span", null, " · AI context was truncated") : null, c.auditScope.warnings && c.auditScope.warnings.length > 0 ? /*#__PURE__*/React.createElement("ul", {
    className: "list-disc ml-5 mt-1"
  }, c.auditScope.warnings.map(function (w, i) {
    return /*#__PURE__*/React.createElement("li", {
      key: i
    }, w);
  })) : null), /*#__PURE__*/React.createElement("div", {
    className: "mb-4 p-3 rounded border border-blue-300 bg-blue-50 text-sm text-blue-950"
  }, /*#__PURE__*/React.createElement("strong", null, "Accessibility scope: "), "These are selected content-accessibility indicators, not a WCAG conformance assessment. Manual keyboard, screen-reader, zoom/reflow, contrast, and rendered-content testing are still required."), c.differentiation && c.differentiation.audioCoverage && /*#__PURE__*/React.createElement(AudioCoverageSummary, {
    audio: c.differentiation.audioCoverage
  }), c.overall && /*#__PURE__*/React.createElement(ReadinessScoreCard, {
    overall: c.overall
  }),
  // Standards rendered first (most teacher-relevant)
  c.standards ? c.standards.computeFailed ? /*#__PURE__*/React.createElement(FailedDimensionCard, {
    id: "audit-standards",
    data: c.standards,
    label: "Standards alignment"
  }) : c.standards.notApplicable ? /*#__PURE__*/React.createElement(NotApplicableCard, {
    id: "audit-standards",
    data: c.standards,
    label: "Standards alignment"
  }) : /*#__PURE__*/React.createElement(StandardsSection, {
    standards: c.standards
  }) : /*#__PURE__*/React.createElement(MissingDimensionCard, {
    id: "audit-standards",
    label: "Standards alignment"
  }), c.vocabulary ? c.vocabulary.computeFailed ? /*#__PURE__*/React.createElement(FailedDimensionCard, {
    id: "audit-vocabulary",
    data: c.vocabulary,
    label: "Vocabulary fit"
  }) : c.vocabulary.notEvaluated ? /*#__PURE__*/React.createElement(NotEvaluatedCard, {
    id: "audit-vocabulary",
    data: c.vocabulary,
    label: "Vocabulary fit"
  }) : /*#__PURE__*/React.createElement(VocabularySection, {
    vocab: c.vocabulary
  }) : /*#__PURE__*/React.createElement(MissingDimensionCard, {
    id: "audit-vocabulary",
    label: "Vocabulary fit"
  }), c.engagement ? c.engagement.computeFailed ? /*#__PURE__*/React.createElement(FailedDimensionCard, {
    id: "audit-engagement",
    data: c.engagement,
    label: "Engagement variety"
  }) : c.engagement.notEvaluated ? /*#__PURE__*/React.createElement(NotEvaluatedCard, {
    id: "audit-engagement",
    data: c.engagement,
    label: "Engagement variety"
  }) : /*#__PURE__*/React.createElement(EngagementSection, {
    eng: c.engagement
  }) : /*#__PURE__*/React.createElement(MissingDimensionCard, {
    id: "audit-engagement",
    label: "Engagement variety"
  }), c.accessibility ? c.accessibility.computeFailed ? /*#__PURE__*/React.createElement(FailedDimensionCard, {
    id: "audit-accessibility",
    data: c.accessibility,
    label: "Content accessibility"
  }) : c.accessibility.notEvaluated ? /*#__PURE__*/React.createElement(NotEvaluatedCard, {
    id: "audit-accessibility",
    data: c.accessibility,
    label: "Content accessibility"
  }) : /*#__PURE__*/React.createElement(AccessibilitySection, {
    access: c.accessibility
  }) : /*#__PURE__*/React.createElement(MissingDimensionCard, {
    id: "audit-accessibility",
    label: "Content accessibility"
  }), c.udl ? c.udl.computeFailed ? /*#__PURE__*/React.createElement(FailedDimensionCard, {
    id: "audit-udl",
    data: c.udl,
    label: "UDL principles"
  }) : c.udl.notEvaluated ? /*#__PURE__*/React.createElement(NotEvaluatedCard, {
    id: "audit-udl",
    data: c.udl,
    label: "UDL principles"
  }) : /*#__PURE__*/React.createElement(UdlSection, {
    udl: c.udl
  }) : /*#__PURE__*/React.createElement(MissingDimensionCard, {
    id: "audit-udl",
    label: "UDL principles"
  }), c.accuracy ? c.accuracy.computeFailed ? /*#__PURE__*/React.createElement(FailedDimensionCard, {
    id: "audit-accuracy",
    data: c.accuracy,
    label: "Content accuracy"
  }) : c.accuracy.notEvaluated ? /*#__PURE__*/React.createElement(NotEvaluatedCard, {
    id: "audit-accuracy",
    data: c.accuracy,
    label: "Content accuracy"
  }) : /*#__PURE__*/React.createElement(AccuracySection, {
    acc: c.accuracy
  }) : /*#__PURE__*/React.createElement(MissingDimensionCard, {
    id: "audit-accuracy",
    label: "Content accuracy"
  }),
  // Plan R+ new dimensions
  c.differentiation ? c.differentiation.computeFailed ? /*#__PURE__*/React.createElement(FailedDimensionCard, {
    id: "audit-differentiation",
    data: c.differentiation,
    label: "Differentiation coverage"
  }) : c.differentiation.notEvaluated ? /*#__PURE__*/React.createElement(NotEvaluatedCard, {
    id: "audit-differentiation",
    data: c.differentiation,
    label: "Differentiation coverage"
  }) : /*#__PURE__*/React.createElement(DifferentiationSection, {
    diff: c.differentiation
  }) : /*#__PURE__*/React.createElement(MissingDimensionCard, {
    id: "audit-differentiation",
    label: "Differentiation coverage"
  }), c.cognitiveLoad ? c.cognitiveLoad.computeFailed ? /*#__PURE__*/React.createElement(FailedDimensionCard, {
    id: "audit-cognitiveLoad",
    data: c.cognitiveLoad,
    label: "Cognitive load / pacing"
  }) : c.cognitiveLoad.notApplicable ? /*#__PURE__*/React.createElement(NotApplicableCard, {
    id: "audit-cognitiveLoad",
    data: c.cognitiveLoad,
    label: "Cognitive load / pacing"
  }) : c.cognitiveLoad.notEvaluated ? /*#__PURE__*/React.createElement(NotEvaluatedCard, {
    id: "audit-cognitiveLoad",
    data: c.cognitiveLoad,
    label: "Cognitive load / pacing"
  }) : /*#__PURE__*/React.createElement(CognitiveLoadSection, {
    load: c.cognitiveLoad
  }) : /*#__PURE__*/React.createElement(MissingDimensionCard, {
    id: "audit-cognitiveLoad",
    label: "Cognitive load / pacing"
  }), c.culturalResponsiveness ? c.culturalResponsiveness.computeFailed ? /*#__PURE__*/React.createElement(FailedDimensionCard, {
    id: "audit-culturalResponsiveness",
    data: c.culturalResponsiveness,
    label: "Cultural responsiveness"
  }) : c.culturalResponsiveness.notApplicable ? /*#__PURE__*/React.createElement(NotApplicableCard, {
    id: "audit-culturalResponsiveness",
    data: c.culturalResponsiveness,
    label: "Cultural responsiveness"
  }) : c.culturalResponsiveness.notEvaluated ? /*#__PURE__*/React.createElement(NotEvaluatedCard, {
    id: "audit-culturalResponsiveness",
    data: c.culturalResponsiveness,
    label: "Cultural responsiveness"
  }) : /*#__PURE__*/React.createElement(CulturalResponsivenessSection, {
    cr: c.culturalResponsiveness
  }) : /*#__PURE__*/React.createElement(MissingDimensionCard, {
    id: "audit-culturalResponsiveness",
    label: "Cultural responsiveness"
  }));
}
function AlignmentReportView(props) {
  var t = props.t;
  var generatedContent = props.generatedContent;
  var comprehensive = generatedContent && generatedContent.data && generatedContent.data.comprehensive;
  var reports = generatedContent && generatedContent.data && Array.isArray(generatedContent.data.reports) ? generatedContent.data.reports : [];
  if (!comprehensive) return /*#__PURE__*/React.createElement("section", {
    className: "curriculum-audit-report max-w-4xl mx-auto h-full overflow-y-auto p-6",
    role: "region",
    "aria-labelledby": "curriculum-audit-report-heading",
    tabIndex: 0,
    lang: "en"
  }, /*#__PURE__*/React.createElement("h1", {
    id: "curriculum-audit-report-heading",
    className: "text-xl font-black text-slate-800"
  }, "Curriculum audit report"), /*#__PURE__*/React.createElement("div", {
    role: "status",
    className: "mt-4 rounded-xl border border-slate-300 bg-slate-50 p-4"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "font-bold text-slate-800"
  }, "Audit details are unavailable"), /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-sm text-slate-700"
  }, "This saved resource does not contain the comprehensive audit data needed to render the report. Regenerate the curriculum audit to restore all nine evidence dimensions.")));
  return /*#__PURE__*/React.createElement("section", {
    className: "curriculum-audit-report space-y-8 max-w-4xl mx-auto h-full overflow-y-auto pr-2 pb-10 print:h-auto print:overflow-visible print:pr-0",
    role: "region",
    "aria-labelledby": "curriculum-audit-report-heading",
    tabIndex: 0,
    lang: resolveAuditLanguageTag(comprehensive)
  }, /*#__PURE__*/React.createElement("h1", {
    id: "curriculum-audit-report-heading",
    className: "sr-only"
  }, "Curriculum audit report"),
  // Executive summary banner — readiness score + top fixes + Apply button.
  comprehensive && /*#__PURE__*/React.createElement(ExecutiveSummary, {
    t: t,
    comp: comprehensive,
    standardsReportCount: reports.length,
    onApplyFixes: props.onApplyFixes,
    onGeneratePreCheck: props.onGeneratePreCheck
  }),
  // Per-dimension findings (standards is now the first dimension card; the
  // legacy top-level reports[] block has been folded into comprehensive.standards).
  comprehensive && /*#__PURE__*/React.createElement(ComprehensiveBlock, {
    comp: comprehensive,
    onApplyFixes: props.onApplyFixes
  }));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.AlignmentReportView = AlignmentReportView;
  window.AlloModules.ViewAlignmentReportModule = true;
})();
