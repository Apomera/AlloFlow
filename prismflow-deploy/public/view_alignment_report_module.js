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
      return I ? React.createElement(I, props) : null;
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
  // Each dimension (vocabulary, engagement, accessibility, udl, content
  // accuracy) renders as a card with status + body content.
  function statusBadgeClass(status) {
    if (status === 'Aligned')   return 'bg-green-100 text-green-700';
    if (status === 'Not Aligned') return 'bg-red-100 text-red-700';
    return 'bg-orange-100 text-orange-700';
  }
  function ComprehensiveSection(p) {
    return React.createElement('div', {
      className: 'bg-white p-6 rounded-xl border border-slate-300 shadow-sm mb-6'
    },
      React.createElement('div', { className: 'flex items-center justify-between mb-4 pb-3 border-b border-slate-200' },
        React.createElement('h3', { className: 'font-bold text-slate-800 flex items-center gap-2 text-lg' },
          React.createElement('span', { 'aria-hidden': 'true' }, p.icon),
          ' ', p.title
        ),
        React.createElement('span', {
          className: 'text-[11px] uppercase font-bold px-2 py-1 rounded ' + statusBadgeClass(p.status)
        }, p.status || 'N/A')
      ),
      p.children
    );
  }

  function VocabularySection(p) {
    var v = p.vocab;
    if (!v) return null;
    return React.createElement(ComprehensiveSection, { icon: '📚', title: 'Vocabulary fit', status: v.status },
      React.createElement('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-3 mb-4' },
        React.createElement('div', { className: 'p-3 bg-slate-50 rounded text-center' },
          React.createElement('div', { className: 'text-2xl font-bold text-slate-800' }, v.totalWords),
          React.createElement('div', { className: 'text-xs text-slate-600' }, 'Total words')
        ),
        React.createElement('div', { className: 'p-3 bg-blue-50 rounded text-center' },
          React.createElement('div', { className: 'text-2xl font-bold text-blue-800' }, v.tier2Count),
          React.createElement('div', { className: 'text-xs text-blue-700' }, 'Tier 2 (academic)'),
          React.createElement('div', { className: 'text-[10px] text-slate-500 mt-1' }, 'expected ~' + (v.expected && v.expected.tier2))
        ),
        React.createElement('div', { className: 'p-3 bg-purple-50 rounded text-center' },
          React.createElement('div', { className: 'text-2xl font-bold text-purple-800' }, v.tier3Count),
          React.createElement('div', { className: 'text-xs text-purple-700' }, 'Tier 3 (domain)'),
          React.createElement('div', { className: 'text-[10px] text-slate-500 mt-1' }, 'expected ~' + (v.expected && v.expected.tier3))
        ),
        React.createElement('div', { className: 'p-3 bg-slate-50 rounded text-center' },
          React.createElement('div', { className: 'text-2xl font-bold text-slate-800' }, v.glossaryTermsCount),
          React.createElement('div', { className: 'text-xs text-slate-600' }, 'Glossary terms')
        )
      ),
      v.tier2Examples && v.tier2Examples.length > 0 && React.createElement('div', { className: 'mb-3' },
        React.createElement('div', { className: 'text-xs font-semibold text-blue-800 mb-1' }, 'Tier 2 examples found:'),
        React.createElement('div', { className: 'flex flex-wrap gap-1' },
          v.tier2Examples.map(function (w, i) {
            return React.createElement('span', { key: i, className: 'text-xs px-2 py-0.5 bg-blue-100 text-blue-900 rounded' }, w);
          })
        )
      ),
      v.tier3Examples && v.tier3Examples.length > 0 && React.createElement('div', { className: 'mb-3' },
        React.createElement('div', { className: 'text-xs font-semibold text-purple-800 mb-1' }, 'Tier 3 examples found:'),
        React.createElement('div', { className: 'flex flex-wrap gap-1' },
          v.tier3Examples.map(function (w, i) {
            return React.createElement('span', { key: i, className: 'text-xs px-2 py-0.5 bg-purple-100 text-purple-900 rounded' }, w);
          })
        )
      ),
      // Reading-level harvest from analysis items
      v.readingLevels && v.readingLevels.length > 0 && React.createElement('div', { className: 'p-3 bg-slate-50 border border-slate-200 rounded mb-3' },
        React.createElement('div', { className: 'text-xs font-semibold text-slate-700 mb-2 flex items-center gap-2' },
          React.createElement('span', { 'aria-hidden': 'true' }, '📖'),
          ' Reading levels (from analyzed source texts)'),
        React.createElement('ul', { className: 'space-y-1 text-sm text-slate-800' },
          v.readingLevels.map(function (r, i) {
            return React.createElement('li', { key: i, className: 'flex items-start gap-2' },
              React.createElement('span', { className: 'text-xs px-2 py-0.5 bg-slate-200 text-slate-800 rounded font-semibold whitespace-nowrap' }, r.range),
              r.explanation && React.createElement('span', { className: 'text-xs text-slate-600' }, r.explanation.slice(0, 240))
            );
          })
        )
      ),
      v.recommendations && v.recommendations.length > 0 && React.createElement('div', { className: 'p-3 bg-amber-50 border border-amber-200 rounded mb-3' },
        React.createElement('div', { className: 'text-xs font-semibold text-amber-900 mb-1' }, 'Heuristic recommendations:'),
        React.createElement('ul', { className: 'list-disc ml-5 text-sm text-amber-900 space-y-1' },
          v.recommendations.map(function (r, i) { return React.createElement('li', { key: i }, r); })
        )
      ),
      // LLM review pairing (Plan O Step 1 enhancement)
      v.llmReview && React.createElement('div', { className: 'p-3 bg-indigo-50 border border-indigo-200 rounded mb-3' },
        React.createElement('div', { className: 'text-xs font-semibold text-indigo-900 mb-2 flex items-center gap-2' },
          React.createElement('span', { 'aria-hidden': 'true' }, '🤖'), ' Literacy-coach review (AI)'),
        v.llmReview.narrative && React.createElement('p', { className: 'text-sm text-indigo-900 mb-2' }, v.llmReview.narrative),
        v.llmReview.corrections && v.llmReview.corrections.length > 0 && React.createElement('div', { className: 'mb-2' },
          React.createElement('div', { className: 'text-xs font-semibold text-indigo-800 mb-1' },
            'Likely misclassified (heuristic flagged Tier 2 but really Tier 1):'),
          React.createElement('div', { className: 'flex flex-wrap gap-1' },
            v.llmReview.corrections.map(function (w, i) {
              return React.createElement('span', { key: i, className: 'text-xs px-2 py-0.5 bg-orange-100 text-orange-900 rounded line-through' }, w);
            })
          )
        ),
        v.llmReview.missedTier2 && v.llmReview.missedTier2.length > 0 && React.createElement('div', { className: 'mb-2' },
          React.createElement('div', { className: 'text-xs font-semibold text-indigo-800 mb-1' },
            'Tier 2 words present but missed by the heuristic:'),
          React.createElement('div', { className: 'flex flex-wrap gap-1' },
            v.llmReview.missedTier2.map(function (w, i) {
              return React.createElement('span', { key: i, className: 'text-xs px-2 py-0.5 bg-blue-100 text-blue-900 rounded' }, w);
            })
          )
        ),
        v.llmReview.recommendations && v.llmReview.recommendations.length > 0 && React.createElement('div', null,
          React.createElement('div', { className: 'text-xs font-semibold text-indigo-800 mb-1' },
            'Suggested Tier 2 words to add for this topic + grade:'),
          React.createElement('div', { className: 'flex flex-wrap gap-1' },
            v.llmReview.recommendations.map(function (w, i) {
              return React.createElement('span', { key: i, className: 'text-xs px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded font-semibold' }, '+ ' + w);
            })
          )
        )
      ),
      React.createElement('div', { className: 'text-[11px] text-slate-500 italic' }, v.notes || '')
    );
  }

  function EngagementSection(p) {
    var e = p.eng;
    if (!e) return null;
    var dok = e.dokDistribution || {};
    var modPresent = e.multimodalCoverage && e.multimodalCoverage.present || [];
    var modMissing = e.multimodalCoverage && e.multimodalCoverage.missing || [];
    return React.createElement(ComprehensiveSection, { icon: '🎯', title: 'Engagement variety', status: e.status },
      // Top stat row
      React.createElement('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-3 mb-4' },
        React.createElement('div', { className: 'p-3 bg-slate-50 rounded text-center' },
          React.createElement('div', { className: 'text-2xl font-bold text-slate-800' }, e.distinctTypeCount),
          React.createElement('div', { className: 'text-xs text-slate-600' }, 'Distinct artifact types')
        ),
        React.createElement('div', { className: 'p-3 bg-slate-50 rounded text-center' },
          React.createElement('div', { className: 'text-2xl font-bold text-slate-800' }, e.totalArtifacts),
          React.createElement('div', { className: 'text-xs text-slate-600' }, 'Total artifacts')
        ),
        React.createElement('div', { className: 'p-3 bg-slate-50 rounded text-center' },
          React.createElement('div', { className: 'text-2xl font-bold text-slate-800' }, Math.round((e.diversityScore || 0) * 100) + '%'),
          React.createElement('div', { className: 'text-xs text-slate-600' }, 'Diversity score')
        ),
        React.createElement('div', { className: 'p-3 bg-slate-50 rounded text-center' },
          React.createElement('div', { className: 'text-2xl font-bold text-slate-800' }, modPresent.length + '/4'),
          React.createElement('div', { className: 'text-xs text-slate-600' }, 'Modalities present')
        )
      ),
      // Distinct types chips
      e.distinctTypes && e.distinctTypes.length > 0 && React.createElement('div', { className: 'mb-3' },
        React.createElement('div', { className: 'text-xs font-semibold text-slate-700 mb-1' }, 'Artifact types in this curriculum:'),
        React.createElement('div', { className: 'flex flex-wrap gap-1' },
          e.distinctTypes.map(function (t, i) {
            return React.createElement('span', { key: i, className: 'text-xs px-2 py-0.5 bg-indigo-100 text-indigo-900 rounded' }, t);
          })
        )
      ),
      // Modalities row
      React.createElement('div', { className: 'mb-3 grid grid-cols-1 md:grid-cols-2 gap-2' },
        React.createElement('div', null,
          React.createElement('div', { className: 'text-xs font-semibold text-emerald-800 mb-1' }, 'Modalities present:'),
          React.createElement('div', { className: 'flex flex-wrap gap-1' },
            modPresent.length > 0 ? modPresent.map(function (m, i) {
              return React.createElement('span', { key: i, className: 'text-xs px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded' }, m);
            }) : React.createElement('span', { className: 'text-xs text-slate-500 italic' }, '(none)')
          )
        ),
        React.createElement('div', null,
          React.createElement('div', { className: 'text-xs font-semibold text-rose-800 mb-1' }, 'Modalities missing:'),
          React.createElement('div', { className: 'flex flex-wrap gap-1' },
            modMissing.length > 0 ? modMissing.map(function (m, i) {
              return React.createElement('span', { key: i, className: 'text-xs px-2 py-0.5 bg-rose-100 text-rose-900 rounded' }, m);
            }) : React.createElement('span', { className: 'text-xs text-emerald-700' }, 'all four covered')
          )
        )
      ),
      // DOK bar
      e.dokTotal > 0 && React.createElement('div', { className: 'mb-3' },
        React.createElement('div', { className: 'text-xs font-semibold text-slate-700 mb-1' },
          'Quiz DOK distribution (' + e.dokTotal + ' items, Webb\'s framework):'),
        React.createElement('div', { className: 'flex h-6 w-full rounded overflow-hidden border border-slate-200' },
          (dok.L1 || 0) > 0 && React.createElement('div', { style: { width: dok.L1 + '%', backgroundColor: '#fde68a' }, className: 'flex items-center justify-center text-[10px] font-bold text-amber-900', title: 'L1 Recall: ' + dok.L1 + '%' }, dok.L1 > 8 ? 'L1 ' + dok.L1 + '%' : ''),
          (dok.L2 || 0) > 0 && React.createElement('div', { style: { width: dok.L2 + '%', backgroundColor: '#86efac' }, className: 'flex items-center justify-center text-[10px] font-bold text-green-900', title: 'L2 Skill/Concept: ' + dok.L2 + '%' }, dok.L2 > 8 ? 'L2 ' + dok.L2 + '%' : ''),
          (dok.L3 || 0) > 0 && React.createElement('div', { style: { width: dok.L3 + '%', backgroundColor: '#93c5fd' }, className: 'flex items-center justify-center text-[10px] font-bold text-blue-900', title: 'L3 Strategic Thinking: ' + dok.L3 + '%' }, dok.L3 > 8 ? 'L3 ' + dok.L3 + '%' : ''),
          (dok.L4 || 0) > 0 && React.createElement('div', { style: { width: dok.L4 + '%', backgroundColor: '#c4b5fd' }, className: 'flex items-center justify-center text-[10px] font-bold text-purple-900', title: 'L4 Extended Thinking: ' + dok.L4 + '%' }, dok.L4 > 8 ? 'L4 ' + dok.L4 + '%' : ''),
          (dok.unknown || 0) > 0 && React.createElement('div', { style: { width: dok.unknown + '%', backgroundColor: '#cbd5e1' }, className: 'flex items-center justify-center text-[10px] text-slate-700', title: 'Unknown: ' + dok.unknown + '%' }, dok.unknown > 8 ? '?' : '')
        )
      ),
      // Scaffold counts
      React.createElement('div', { className: 'mb-3 grid grid-cols-3 gap-2 text-center text-xs' },
        React.createElement('div', { className: 'p-2 bg-slate-50 rounded' },
          React.createElement('div', { className: 'font-bold text-slate-800' }, e.scaffoldCounts && e.scaffoldCounts.sentenceFrames || 0),
          React.createElement('div', { className: 'text-slate-600' }, 'sentence frames')
        ),
        React.createElement('div', { className: 'p-2 bg-slate-50 rounded' },
          React.createElement('div', { className: 'font-bold text-slate-800' }, e.scaffoldCounts && e.scaffoldCounts.simplifiedTexts || 0),
          React.createElement('div', { className: 'text-slate-600' }, 'simplified texts')
        ),
        React.createElement('div', { className: 'p-2 bg-slate-50 rounded' },
          React.createElement('div', { className: 'font-bold text-slate-800' }, e.scaffoldCounts && e.scaffoldCounts.leveledGlossary || 0),
          React.createElement('div', { className: 'text-slate-600' }, 'leveled glossaries')
        )
      ),
      // Heuristic recommendations
      e.recommendations && e.recommendations.length > 0 && React.createElement('div', { className: 'p-3 bg-amber-50 border border-amber-200 rounded mb-3' },
        React.createElement('div', { className: 'text-xs font-semibold text-amber-900 mb-1' }, 'Heuristic recommendations:'),
        React.createElement('ul', { className: 'list-disc ml-5 text-sm text-amber-900 space-y-1' },
          e.recommendations.map(function (r, i) { return React.createElement('li', { key: i }, r); })
        )
      ),
      // LLM review
      e.llmReview && React.createElement('div', { className: 'p-3 bg-indigo-50 border border-indigo-200 rounded mb-3' },
        React.createElement('div', { className: 'text-xs font-semibold text-indigo-900 mb-2 flex items-center gap-2' },
          React.createElement('span', { 'aria-hidden': 'true' }, '🤖'), ' UDL + DOK review (AI)'),
        e.llmReview.narrative && React.createElement('p', { className: 'text-sm text-indigo-900 mb-2' }, e.llmReview.narrative),
        e.llmReview.dokAssessment && React.createElement('p', { className: 'text-sm text-indigo-900 mb-2 italic' }, '"' + e.llmReview.dokAssessment + '"'),
        e.llmReview.formatGaps && e.llmReview.formatGaps.length > 0 && React.createElement('div', null,
          React.createElement('div', { className: 'text-xs font-semibold text-indigo-800 mb-1' }, 'Suggested format additions:'),
          React.createElement('ul', { className: 'list-disc ml-5 text-sm text-indigo-900 space-y-1' },
            e.llmReview.formatGaps.map(function (g, i) { return React.createElement('li', { key: i }, g); })
          )
        )
      ),
      React.createElement('div', { className: 'text-[11px] text-slate-500 italic' }, e.notes || '')
    );
  }

  function AccessibilitySection(p) {
    var a = p.access;
    if (!a) return null;
    var altPctColor = a.altCoveragePct === null ? 'slate' : a.altCoveragePct >= 80 ? 'emerald' : a.altCoveragePct >= 50 ? 'amber' : 'rose';
    return React.createElement(ComprehensiveSection, { icon: '♿', title: 'Content accessibility', status: a.status },
      // Top stat row
      React.createElement('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-3 mb-4' },
        React.createElement('div', { className: 'p-3 bg-slate-50 rounded text-center' },
          React.createElement('div', { className: 'text-2xl font-bold text-slate-800' }, a.totalImages),
          React.createElement('div', { className: 'text-xs text-slate-600' }, 'Images')
        ),
        React.createElement('div', { className: 'p-3 rounded text-center bg-' + altPctColor + '-50 border border-' + altPctColor + '-200' },
          React.createElement('div', { className: 'text-2xl font-bold text-' + altPctColor + '-800' },
            a.altCoveragePct === null ? 'n/a' : a.altCoveragePct + '%'),
          React.createElement('div', { className: 'text-xs text-' + altPctColor + '-700' }, 'Alt-text coverage')
        ),
        React.createElement('div', {
          className: 'p-3 rounded text-center ' + (a.colorOnlyCount > 0 ? 'bg-rose-50 border border-rose-200' : 'bg-emerald-50 border border-emerald-200')
        },
          React.createElement('div', { className: 'text-2xl font-bold ' + (a.colorOnlyCount > 0 ? 'text-rose-800' : 'text-emerald-800') }, a.colorOnlyCount),
          React.createElement('div', { className: 'text-xs ' + (a.colorOnlyCount > 0 ? 'text-rose-700' : 'text-emerald-700') }, 'Color-only refs')
        ),
        React.createElement('div', { className: 'p-3 bg-slate-50 rounded text-center' },
          React.createElement('div', { className: 'text-2xl font-bold text-slate-800' }, a.longestUnbrokenPassage),
          React.createElement('div', { className: 'text-xs text-slate-600' }, 'Longest passage (words)')
        )
      ),
      // Color-only examples
      a.colorOnlyExamples && a.colorOnlyExamples.length > 0 && React.createElement('div', { className: 'mb-3' },
        React.createElement('div', { className: 'text-xs font-semibold text-rose-800 mb-1' },
          'Color-only language found (students with color blindness cannot follow these):'),
        React.createElement('ul', { className: 'list-disc ml-5 text-xs text-rose-900 space-y-0.5' },
          a.colorOnlyExamples.slice(0, 6).map(function (ex, i) {
            return React.createElement('li', { key: i, className: 'font-mono italic' }, '"' + ex + '"');
          })
        )
      ),
      // Implicit image references
      a.implicitImageExamples && a.implicitImageExamples.length > 0 && React.createElement('div', { className: 'mb-3' },
        React.createElement('div', { className: 'text-xs font-semibold text-amber-800 mb-1' },
          'References to images (verify each has descriptive alt text):'),
        React.createElement('ul', { className: 'list-disc ml-5 text-xs text-amber-900 space-y-0.5' },
          a.implicitImageExamples.slice(0, 6).map(function (ex, i) {
            return React.createElement('li', { key: i, className: 'font-mono italic' }, '"' + ex + '"');
          })
        )
      ),
      // Heuristic recommendations
      a.recommendations && a.recommendations.length > 0 && React.createElement('div', { className: 'p-3 bg-amber-50 border border-amber-200 rounded mb-3' },
        React.createElement('div', { className: 'text-xs font-semibold text-amber-900 mb-1' }, 'Heuristic recommendations:'),
        React.createElement('ul', { className: 'list-disc ml-5 text-sm text-amber-900 space-y-1' },
          a.recommendations.map(function (r, i) { return React.createElement('li', { key: i }, r); })
        )
      ),
      // LLM review with student impacts
      a.llmReview && React.createElement('div', { className: 'p-3 bg-indigo-50 border border-indigo-200 rounded mb-3' },
        React.createElement('div', { className: 'text-xs font-semibold text-indigo-900 mb-2 flex items-center gap-2' },
          React.createElement('span', { 'aria-hidden': 'true' }, '🤖'), ' Accessibility-specialist review (AI)'),
        a.llmReview.narrative && React.createElement('p', { className: 'text-sm text-indigo-900 mb-3' }, a.llmReview.narrative),
        a.llmReview.studentImpacts && a.llmReview.studentImpacts.length > 0 && React.createElement('div', { className: 'mb-3' },
          React.createElement('div', { className: 'text-xs font-semibold text-indigo-800 mb-1' }, 'Student-impact callouts:'),
          React.createElement('ul', { className: 'list-disc ml-5 text-sm text-indigo-900 space-y-1' },
            a.llmReview.studentImpacts.map(function (s, i) { return React.createElement('li', { key: i }, s); })
          )
        ),
        a.llmReview.fixes && a.llmReview.fixes.length > 0 && React.createElement('div', null,
          React.createElement('div', { className: 'text-xs font-semibold text-indigo-800 mb-1' }, 'Suggested fixes:'),
          React.createElement('ul', { className: 'list-disc ml-5 text-sm text-indigo-900 space-y-1' },
            a.llmReview.fixes.map(function (f, i) { return React.createElement('li', { key: i }, f); })
          )
        )
      ),
      React.createElement('div', { className: 'text-[11px] text-slate-500 italic' }, a.notes || '')
    );
  }

  function ComprehensiveBlock(p) {
    var c = p.comp;
    if (!c) return null;
    return React.createElement('div', {
      className: 'mt-12 pt-8 border-t-4 border-indigo-500 max-w-4xl mx-auto'
    },
      React.createElement('div', { className: 'mb-6' },
        React.createElement('h2', { className: 'text-2xl font-black text-slate-800 uppercase tracking-tight mb-1' },
          'Comprehensive Curriculum Audit'),
        React.createElement('p', { className: 'text-sm text-slate-600' },
          'Multi-dimensional analysis beyond standards alignment. Each dimension evaluates the curriculum against a specific quality lens. Hybrid: deterministic computation + AI review.')
      ),
      c.vocabulary && React.createElement(VocabularySection, { vocab: c.vocabulary }),
      c.engagement && React.createElement(EngagementSection, { eng: c.engagement }),
      c.accessibility && React.createElement(AccessibilitySection, { access: c.accessibility })
    );
  }

  function AlignmentReportView(props) {
  var t = props.t;
  var generatedContent = props.generatedContent;
  var comprehensive = generatedContent && generatedContent.data && generatedContent.data.comprehensive;
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-8 max-w-4xl mx-auto h-full overflow-y-auto pr-2 pb-10"
  }, generatedContent.data.reports.map((report, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: "animate-in slide-in-from-bottom-4 duration-500"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-800 text-white px-4 py-2 rounded-t-xl font-bold text-xs uppercase tracking-wider flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", null, t('alignment.audit_report'), " ", idx + 1), /*#__PURE__*/React.createElement("span", {
    className: "bg-slate-700 px-2 py-0.5 rounded text-yellow-400"
  }, report.standard)), /*#__PURE__*/React.createElement("div", {
    className: `p-6 rounded-b-xl border-l-8 shadow-sm transition-all ${report.overallDetermination === 'Pass' ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-start"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-black text-slate-800 uppercase tracking-tight mb-2"
  }, t('alignment.certification')), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 text-sm font-bold text-slate-600"
  }, /*#__PURE__*/React.createElement(ShieldCheck, {
    size: 18
  }), " ", report.standard)), /*#__PURE__*/React.createElement("div", {
    className: `px-4 py-2 rounded-lg font-black text-xl uppercase border-2 shadow-sm ${report.overallDetermination === 'Pass' ? 'text-green-700 border-green-600 bg-green-100' : 'text-red-700 border-red-600 bg-red-100'}`
  }, report.overallDetermination)), /*#__PURE__*/React.createElement("div", {
    className: "mt-6 pt-6 border-t border-black/10 grid grid-cols-1 md:grid-cols-2 gap-6"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
    className: "text-xs font-bold uppercase text-slate-600 mb-1"
  }, t('alignment.cognitive_demand')), /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-medium text-slate-800"
  }, report.standardBreakdown?.cognitiveDemand || "—")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
    className: "text-xs font-bold uppercase text-slate-600 mb-1"
  }, t('alignment.content_focus')), /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-medium text-slate-800"
  }, report.standardBreakdown?.contentFocus || "—")))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-3 gap-6 mt-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-6 rounded-xl border border-slate-400 shadow-sm flex flex-col h-full"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center mb-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-slate-800 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(BookOpen, {
    size: 18,
    className: "text-indigo-600"
  }), " ", t('alignment.text_alignment')), /*#__PURE__*/React.createElement("span", {
    className: `text-[11px] uppercase font-bold px-2 py-1 rounded ${report.analysis?.textAlignment?.status === 'Aligned' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`
  }, report.analysis?.textAlignment?.status || "N/A")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4 text-sm flex-grow"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-50 p-3 rounded-lg border border-slate-100 relative"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute top-3 left-3 text-slate-600"
  }, /*#__PURE__*/React.createElement(Quote, {
    size: 16,
    className: "fill-current"
  })), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-slate-600 uppercase block mb-1 pl-6"
  }, t('alignment.evidence')), /*#__PURE__*/React.createElement("p", {
    className: "italic text-slate-700 pl-6 leading-relaxed"
  }, "\"", report.analysis?.textAlignment?.evidence || "—", "\"")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-slate-600 uppercase block mb-1"
  }, t('alignment.audit_notes')), /*#__PURE__*/React.createElement("p", {
    className: "text-slate-600 leading-relaxed"
  }, report.analysis?.textAlignment?.notes || "—")))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-6 rounded-xl border border-slate-400 shadow-sm flex flex-col h-full"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center mb-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-slate-800 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Layout, {
    size: 18,
    className: "text-purple-600"
  }), " Activities"), /*#__PURE__*/React.createElement("span", {
    className: `text-[11px] uppercase font-bold px-2 py-1 rounded ${report.analysis.activityAlignment?.status === 'Aligned' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`
  }, report.analysis.activityAlignment?.status || "N/A")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4 text-sm flex-grow"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-50 p-3 rounded-lg border border-slate-100 relative"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute top-3 left-3 text-slate-600"
  }, /*#__PURE__*/React.createElement(Quote, {
    size: 16,
    className: "fill-current"
  })), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-slate-600 uppercase block mb-1 pl-6"
  }, t('alignment.evidence')), /*#__PURE__*/React.createElement("p", {
    className: "italic text-slate-700 pl-6 leading-relaxed"
  }, "\"", report.analysis.activityAlignment?.evidence || "No interactive activities found.", "\"")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-slate-600 uppercase block mb-1"
  }, t('alignment.audit_notes')), /*#__PURE__*/React.createElement("p", {
    className: "text-slate-600 leading-relaxed"
  }, report.analysis.activityAlignment?.notes || "Generate activities like Sorts or Timelines to populate this.")))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-6 rounded-xl border border-slate-400 shadow-sm flex flex-col h-full"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center mb-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-slate-800 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(CheckSquare, {
    size: 18,
    className: "text-teal-600"
  }), " ", t('alignment.assessment')), /*#__PURE__*/React.createElement("span", {
    className: `text-[11px] uppercase font-bold px-2 py-1 rounded ${report.analysis?.assessmentAlignment?.status === 'Aligned' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`
  }, report.analysis?.assessmentAlignment?.status || "N/A")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4 text-sm flex-grow"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-50 p-3 rounded-lg border border-slate-100 relative"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute top-3 left-3 text-slate-600"
  }, /*#__PURE__*/React.createElement(Quote, {
    size: 16,
    className: "fill-current"
  })), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-slate-600 uppercase block mb-1 pl-6"
  }, t('alignment.evidence')), /*#__PURE__*/React.createElement("p", {
    className: "italic text-slate-700 pl-6 leading-relaxed"
  }, "\"", report.analysis?.assessmentAlignment?.evidence || "—", "\"")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-slate-600 uppercase block mb-1"
  }, t('alignment.audit_notes')), /*#__PURE__*/React.createElement("p", {
    className: "text-slate-600 leading-relaxed"
  }, report.analysis?.assessmentAlignment?.notes || "—"))))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-6 rounded-xl border border-slate-400 shadow-sm mt-6"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2"
  }, /*#__PURE__*/React.createElement(ClipboardList, {
    size: 18,
    className: "text-blue-500"
  }), " ", t('alignment.admin_report_title')), report.gaps && report.gaps.length > 0 && report.gaps[0] !== "None" && /*#__PURE__*/React.createElement("div", {
    className: "mb-6"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-xs font-bold text-red-500 uppercase tracking-wider mb-2 flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(AlertCircle, {
    size: 12
  }), " ", t('alignment.gaps')), /*#__PURE__*/React.createElement("ul", {
    className: "list-disc list-inside text-sm text-slate-700 space-y-1 ml-2"
  }, report.gaps.map((gap, i) => /*#__PURE__*/React.createElement("li", {
    key: i,
    className: "marker:text-red-400"
  }, gap)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
    className: "text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2 flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 12
  }), " ", t('alignment.recommendation')), /*#__PURE__*/React.createElement("div", {
    className: "bg-indigo-50 p-4 rounded-lg text-sm text-indigo-900 leading-relaxed border border-indigo-100 font-medium"
  }, report.adminRecommendation || "No recommendation was generated for this standard."))), idx < (generatedContent?.data?.reports?.length || 0) - 1 && /*#__PURE__*/React.createElement("hr", {
    className: "my-8 border-slate-300"
  }))), comprehensive && React.createElement(ComprehensiveBlock, { comp: comprehensive }));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.AlignmentReportView = AlignmentReportView;
  window.AlloModules.ViewAlignmentReportModule = true;
})();
