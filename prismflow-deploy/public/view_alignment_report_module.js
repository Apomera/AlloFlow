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
    if (status === 'Aligned' || status === 'Pass') return 'bg-green-100 text-green-700';
    if (status === 'Not Aligned' || status === 'Revise') return 'bg-red-100 text-red-700';
    if (status === 'Compute failed') return 'bg-amber-100 text-amber-800';
    // 'Partially Aligned', 'Pass with notes', or anything unknown
    return 'bg-orange-100 text-orange-700';
  }
  function ComprehensiveSection(p) {
    return React.createElement('div', {
      id: p.id || undefined,
      className: 'bg-white p-6 rounded-xl border border-slate-300 shadow-sm mb-6 scroll-mt-4'
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

  // ─── StandardsSection ─────────────────────────────────────────────────
  // Plan R+: Standards alignment is now the 6th comprehensive dimension.
  // Renders the per-standard summary header + the existing per-report cards
  // inside the same ComprehensiveSection framework as the others.
  function StandardsSection(p) {
    var s = p.standards;
    if (!s) return null;
    var perStandard = Array.isArray(s.perStandard) ? s.perStandard : [];
    return React.createElement(ComprehensiveSection, { id: 'audit-standards', icon: '🎯', title: 'Standards alignment', status: s.status },
      // Top stat row
      React.createElement('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-3 mb-4' },
        React.createElement('div', { className: 'p-3 bg-slate-50 rounded text-center' },
          React.createElement('div', { className: 'text-2xl font-bold text-slate-800' }, s.totalStandards || perStandard.length),
          React.createElement('div', { className: 'text-xs text-slate-600' }, 'Standard' + ((s.totalStandards || perStandard.length) === 1 ? '' : 's') + ' audited')
        ),
        React.createElement('div', { className: 'p-3 bg-emerald-50 rounded text-center border border-emerald-200' },
          React.createElement('div', { className: 'text-2xl font-bold text-emerald-800' }, s.passCount || 0),
          React.createElement('div', { className: 'text-xs text-emerald-700' }, 'Pass')
        ),
        React.createElement('div', {
          className: 'p-3 rounded text-center ' + ((s.reviseCount || 0) > 0 ? 'bg-rose-50 border border-rose-200' : 'bg-slate-50 border border-slate-200')
        },
          React.createElement('div', { className: 'text-2xl font-bold ' + ((s.reviseCount || 0) > 0 ? 'text-rose-800' : 'text-slate-800') }, s.reviseCount || 0),
          React.createElement('div', { className: 'text-xs ' + ((s.reviseCount || 0) > 0 ? 'text-rose-700' : 'text-slate-600') }, 'Revise')
        ),
        React.createElement('div', { className: 'p-3 bg-slate-50 rounded text-center' },
          React.createElement('div', { className: 'text-xs font-bold text-slate-800 leading-tight pt-2' }, 'Holistic Lesson Plan Audit'),
          React.createElement('div', { className: 'text-[10px] text-slate-500 mt-1' }, 'text + activities + assessment')
        )
      ),
      // Per-standard collapsible cards
      perStandard.length > 0 && React.createElement('div', { className: 'space-y-3' },
        perStandard.map(function (report, idx) {
          var passColor = report && report.overallDetermination === 'Pass';
          return React.createElement('details', {
            key: idx,
            open: !passColor,
            className: 'rounded-lg border ' + (passColor ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'),
          },
            React.createElement('summary', {
              className: 'px-3 py-2 cursor-pointer font-semibold text-sm select-none flex items-center justify-between gap-2 ' + (passColor ? 'text-emerald-800 hover:bg-emerald-100' : 'text-rose-800 hover:bg-rose-100'),
            },
              React.createElement('span', { className: 'flex-1 truncate' },
                (report && report.standard) || 'Standard ' + (idx + 1)
              ),
              React.createElement('span', { className: 'text-[10px] uppercase font-bold px-2 py-0.5 rounded ' + (passColor ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900') },
                (report && report.overallDetermination) || 'Revise'
              )
            ),
            React.createElement('div', { className: 'px-3 pb-3 pt-2 bg-white rounded-b-lg space-y-2 text-xs' },
              report && report.standardBreakdown && (report.standardBreakdown.cognitiveDemand || report.standardBreakdown.contentFocus) && React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2 mb-2 pb-2 border-b border-slate-200' },
                report.standardBreakdown.cognitiveDemand && React.createElement('div', null,
                  React.createElement('span', { className: 'font-bold uppercase text-slate-600' }, 'Cognitive demand: '),
                  React.createElement('span', { className: 'text-slate-800' }, report.standardBreakdown.cognitiveDemand)
                ),
                report.standardBreakdown.contentFocus && React.createElement('div', null,
                  React.createElement('span', { className: 'font-bold uppercase text-slate-600' }, 'Content focus: '),
                  React.createElement('span', { className: 'text-slate-800' }, report.standardBreakdown.contentFocus)
                )
              ),
              ['textAlignment', 'activityAlignment', 'assessmentAlignment'].map(function (key) {
                var sec = report && report.analysis && report.analysis[key];
                if (!sec) return null;
                var lbl = key === 'textAlignment' ? 'Text' : key === 'activityAlignment' ? 'Activities' : 'Assessment';
                var stat = sec.status || 'N/A';
                return React.createElement('div', { key: key, className: 'flex items-start gap-2' },
                  React.createElement('span', {
                    className: 'flex-shrink-0 text-[10px] uppercase font-bold px-2 py-0.5 rounded ' + statusBadgeClass(stat),
                    style: { minWidth: '90px', textAlign: 'center' },
                  }, lbl + ' · ' + stat),
                  React.createElement('span', { className: 'text-slate-700 italic' }, sec.evidence ? '"' + sec.evidence + '"' : '—')
                );
              }),
              report && report.adminRecommendation && React.createElement('div', { className: 'mt-2 pt-2 border-t border-slate-200' },
                React.createElement('span', { className: 'text-[10px] uppercase font-bold text-indigo-700' }, 'Recommendation: '),
                React.createElement('span', { className: 'text-slate-800' }, report.adminRecommendation)
              )
            )
          );
        })
      ),
      s.notes && React.createElement('div', { className: 'mt-3 text-[11px] text-slate-500 italic' }, s.notes)
    );
  }

  function VocabularySection(p) {
    var v = p.vocab;
    if (!v) return null;
    // Backward-compat: older saved audits only have totalWords; show that as auditedTextWords.
    var sourceWords = typeof v.sourceWords === 'number' ? v.sourceWords : null;
    var auditedTextWords = typeof v.auditedTextWords === 'number' ? v.auditedTextWords : v.totalWords;
    var scaleNote = (v.expected && v.expected.scale && v.expected.scale > 1.5)
      ? '(rescaled ×' + v.expected.scale + ' for bundle size)'
      : '';
    return React.createElement(ComprehensiveSection, { id: 'audit-vocabulary', icon: '📚', title: 'Vocabulary fit', status: v.status },
      React.createElement('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-3 mb-4' },
        React.createElement('div', {
          className: 'p-3 bg-slate-50 rounded text-center',
          title: sourceWords !== null
            ? 'Source words: words in the primary lesson source (matches your "lesson length" intuition).\nAudited: words across the full bundle (every artifact), used for tier classification.'
            : '',
        },
          sourceWords !== null
            ? React.createElement(React.Fragment, null,
                React.createElement('div', { className: 'text-2xl font-bold text-slate-800' }, sourceWords),
                React.createElement('div', { className: 'text-xs text-slate-600' }, 'Source words'),
                React.createElement('div', { className: 'text-[10px] text-slate-500 mt-1' }, auditedTextWords + ' across bundle')
              )
            : React.createElement(React.Fragment, null,
                React.createElement('div', { className: 'text-2xl font-bold text-slate-800' }, auditedTextWords),
                React.createElement('div', { className: 'text-xs text-slate-600' }, 'Total words')
              )
        ),
        React.createElement('div', { className: 'p-3 bg-blue-50 rounded text-center' },
          React.createElement('div', { className: 'text-2xl font-bold text-blue-800' }, v.tier2Count),
          React.createElement('div', { className: 'text-xs text-blue-700' }, 'Tier 2 (academic)'),
          React.createElement('div', { className: 'text-[10px] text-slate-500 mt-1' }, 'expected ~' + (v.expected && v.expected.tier2) + ' ' + scaleNote)
        ),
        React.createElement('div', { className: 'p-3 bg-purple-50 rounded text-center' },
          React.createElement('div', { className: 'text-2xl font-bold text-purple-800' }, v.tier3Count),
          React.createElement('div', { className: 'text-xs text-purple-700' }, 'Tier 3 (domain)'),
          React.createElement('div', { className: 'text-[10px] text-slate-500 mt-1' }, 'expected ~' + (v.expected && v.expected.tier3) + ' ' + scaleNote)
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
    return React.createElement(ComprehensiveSection, { id: 'audit-engagement', icon: '🎯', title: 'Engagement variety', status: e.status },
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
    return React.createElement(ComprehensiveSection, { id: 'audit-accessibility', icon: '♿', title: 'Content accessibility', status: a.status },
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

  function UdlPillar(p) {
    var pillar = p.pillar;
    if (!pillar) return null;
    return React.createElement('div', { className: 'p-3 bg-white border border-slate-200 rounded mb-2' },
      React.createElement('div', { className: 'flex items-center justify-between mb-2' },
        React.createElement('h4', { className: 'font-bold text-sm text-slate-800 flex items-center gap-2' },
          React.createElement('span', { 'aria-hidden': 'true', className: 'text-lg' }, p.icon),
          ' ', p.title),
        React.createElement('span', {
          className: 'text-[10px] uppercase font-bold px-2 py-0.5 rounded ' + statusBadgeClass(pillar.status)
        }, pillar.status || 'N/A')
      ),
      pillar.evidence && React.createElement('div', { className: 'mb-2' },
        React.createElement('div', { className: 'text-[11px] font-semibold text-emerald-800 uppercase tracking-wider' }, 'Evidence'),
        React.createElement('p', { className: 'text-sm text-slate-700' }, pillar.evidence)
      ),
      pillar.gaps && React.createElement('div', { className: 'mb-2' },
        React.createElement('div', { className: 'text-[11px] font-semibold text-rose-800 uppercase tracking-wider' }, 'Gaps'),
        React.createElement('p', { className: 'text-sm text-slate-700' }, pillar.gaps)
      ),
      pillar.recommendation && React.createElement('div', null,
        React.createElement('div', { className: 'text-[11px] font-semibold text-indigo-800 uppercase tracking-wider' }, 'Recommendation'),
        React.createElement('p', { className: 'text-sm text-slate-700' }, pillar.recommendation)
      )
    );
  }

  function UdlSection(p) {
    var u = p.udl;
    if (!u) return null;
    var priors = u.priorsUsed || {};
    return React.createElement(ComprehensiveSection, { id: 'audit-udl', icon: '🌐', title: 'UDL principles (CAST Guidelines v3.0)', status: u.status },
      // Priors banner
      React.createElement('div', { className: 'mb-3 p-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700' },
        React.createElement('span', { className: 'font-semibold' }, 'Priors used: '),
        (priors.modalitiesPresent || []).length, ' modalities (',
        (priors.modalitiesPresent || []).join(', ') || 'none', '), ',
        (priors.distinctTypes || []).length, ' distinct artifact types, ',
        ((priors.scaffoldCounts && priors.scaffoldCounts.sentenceFrames) || 0) + ((priors.scaffoldCounts && priors.scaffoldCounts.simplifiedTexts) || 0) + ((priors.scaffoldCounts && priors.scaffoldCounts.leveledGlossary) || 0),
        ' scaffolds.'
      ),
      // Three pillars
      React.createElement(UdlPillar, { pillar: u.representation, title: 'Representation', icon: '👁️' }),
      React.createElement(UdlPillar, { pillar: u.engagement, title: 'Engagement', icon: '✨' }),
      React.createElement(UdlPillar, { pillar: u.actionExpression, title: 'Action & Expression', icon: '✍️' }),
      // Overall narrative
      u.overallNarrative && React.createElement('div', { className: 'mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded' },
        React.createElement('div', { className: 'text-xs font-semibold text-indigo-900 mb-1 flex items-center gap-2' },
          React.createElement('span', { 'aria-hidden': 'true' }, '🤖'),
          ' UDL specialist synthesis (AI)'),
        React.createElement('p', { className: 'text-sm text-indigo-900' }, u.overallNarrative)
      ),
      React.createElement('div', { className: 'text-[11px] text-slate-500 italic mt-2' }, u.notes || '')
    );
  }

  function AccuracySection(p) {
    var a = p.acc;
    if (!a) return null;
    var counts = a.accuracyRatingCounts || { high: 0, medium: 0, low: 0 };
    return React.createElement(ComprehensiveSection, { id: 'audit-accuracy', icon: '✅', title: 'Content accuracy', status: a.status },
      // Top stat row
      React.createElement('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-3 mb-4' },
        React.createElement('div', { className: 'p-3 bg-slate-50 rounded text-center' },
          React.createElement('div', { className: 'text-2xl font-bold text-slate-800' }, a.totalAnalyses),
          React.createElement('div', { className: 'text-xs text-slate-600' }, 'Analyses run')
        ),
        React.createElement('div', { className: 'p-3 bg-emerald-50 rounded text-center border border-emerald-200' },
          React.createElement('div', { className: 'text-2xl font-bold text-emerald-800' }, a.totalVerifiedFacts),
          React.createElement('div', { className: 'text-xs text-emerald-700' }, 'Verified facts')
        ),
        React.createElement('div', {
          className: 'p-3 rounded text-center ' + (a.totalDiscrepancies > 0 ? 'bg-rose-50 border border-rose-200' : 'bg-slate-50 border border-slate-200')
        },
          React.createElement('div', { className: 'text-2xl font-bold ' + (a.totalDiscrepancies > 0 ? 'text-rose-800' : 'text-slate-800') }, a.totalDiscrepancies),
          React.createElement('div', { className: 'text-xs ' + (a.totalDiscrepancies > 0 ? 'text-rose-700' : 'text-slate-600') }, 'Discrepancies')
        ),
        React.createElement('div', { className: 'p-3 bg-slate-50 rounded text-center' },
          React.createElement('div', { className: 'text-2xl font-bold text-slate-800' },
            counts.high + 'H/' + counts.medium + 'M/' + counts.low + 'L'),
          React.createElement('div', { className: 'text-xs text-slate-600' }, 'Rating mix')
        )
      ),
      // Sample verifications
      a.sampleVerifications && a.sampleVerifications.length > 0 && React.createElement('details', { className: 'mb-3 bg-slate-50 border border-slate-200 rounded p-3' },
        React.createElement('summary', { className: 'cursor-pointer text-sm font-semibold text-slate-800' },
          'Per-analysis details (' + a.sampleVerifications.length + ')'),
        React.createElement('ul', { className: 'mt-2 space-y-2' },
          a.sampleVerifications.map(function (s, i) {
            var ratingColor = (s.rating || '').toLowerCase().indexOf('high') >= 0 ? 'emerald' :
                              (s.rating || '').toLowerCase().indexOf('low') >= 0 ? 'rose' : 'amber';
            return React.createElement('li', { key: i, className: 'p-2 bg-white border border-slate-200 rounded' },
              React.createElement('div', { className: 'flex items-center gap-2 mb-1' },
                React.createElement('span', {
                  className: 'text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-' + ratingColor + '-100 text-' + ratingColor + '-800'
                }, s.rating || 'Unknown'),
                React.createElement('span', { className: 'text-xs text-slate-600' },
                  s.verifiedFactCount + ' verified, ' + s.discrepancyCount + ' discrepanc' + (s.discrepancyCount === 1 ? 'y' : 'ies'))
              ),
              s.reason && React.createElement('p', { className: 'text-xs text-slate-700' }, s.reason)
            );
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
      // LLM review with claims to verify
      a.llmReview && React.createElement('div', { className: 'p-3 bg-indigo-50 border border-indigo-200 rounded mb-3' },
        React.createElement('div', { className: 'text-xs font-semibold text-indigo-900 mb-2 flex items-center gap-2' },
          React.createElement('span', { 'aria-hidden': 'true' }, '🤖'),
          ' Fact-checker review (AI)'),
        a.llmReview.narrative && React.createElement('p', { className: 'text-sm text-indigo-900 mb-3' }, a.llmReview.narrative),
        a.llmReview.claimsToVerify && a.llmReview.claimsToVerify.length > 0 && React.createElement('div', { className: 'mb-3' },
          React.createElement('div', { className: 'text-xs font-semibold text-indigo-800 mb-1' },
            'Specific claims to double-check:'),
          React.createElement('ul', { className: 'list-disc ml-5 text-sm text-indigo-900 space-y-1' },
            a.llmReview.claimsToVerify.map(function (c, i) {
              return React.createElement('li', { key: i, className: 'italic' }, '"' + c + '"');
            })
          )
        ),
        a.llmReview.fixes && a.llmReview.fixes.length > 0 && React.createElement('div', null,
          React.createElement('div', { className: 'text-xs font-semibold text-indigo-800 mb-1' }, 'Suggested improvements:'),
          React.createElement('ul', { className: 'list-disc ml-5 text-sm text-indigo-900 space-y-1' },
            a.llmReview.fixes.map(function (f, i) { return React.createElement('li', { key: i }, f); })
          )
        )
      ),
      React.createElement('div', { className: 'text-[11px] text-slate-500 italic' }, a.notes || '')
    );
  }

  function ReadinessScoreCard(p) {
    var o = p.overall;
    if (!o) return null;
    var score = typeof o.score === 'number' ? o.score : 0;
    var dimEvaluated = typeof o.dimensionsEvaluated === 'number' ? o.dimensionsEvaluated : 0;

    // Empty-state: no comprehensive dimensions ran, render an informative
    // fallback rather than a misleading 0 / 100 score.
    if (dimEvaluated === 0) {
      return React.createElement('div', {
        className: 'p-6 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 mb-8 text-center'
      },
        React.createElement('div', { className: 'text-4xl mb-2', 'aria-hidden': 'true' }, '📊'),
        React.createElement('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-500 mb-1' },
          'Curriculum Readiness Score'),
        React.createElement('div', { className: 'text-lg font-bold text-slate-700 mb-2' },
          'Not enough artifacts to compute'),
        React.createElement('p', { className: 'text-sm text-slate-600 max-w-md mx-auto' },
          'Generate a few artifacts (analysis, glossary, quiz, sentence frames, etc.) before running the audit to get a meaningful readiness score.')
      );
    }

    // Color band by score
    var band, ringColor, bgColor, textColor;
    if (o.blockingIssues && o.blockingIssues.length > 0) {
      band = 'rose'; ringColor = '#dc2626'; bgColor = '#fef2f2'; textColor = '#991b1b';
    } else if (score >= 90) {
      band = 'emerald'; ringColor = '#059669'; bgColor = '#ecfdf5'; textColor = '#065f46';
    } else if (score >= 70) {
      band = 'lime'; ringColor = '#65a30d'; bgColor = '#f7fee7'; textColor = '#365314';
    } else if (score >= 50) {
      band = 'amber'; ringColor = '#d97706'; bgColor = '#fffbeb'; textColor = '#92400e';
    } else {
      band = 'rose'; ringColor = '#dc2626'; bgColor = '#fef2f2'; textColor = '#991b1b';
    }

    var dimScores = o.perDimensionPercent || {};
    var dimLabels = {
      vocabulary: 'Vocab',
      engagement: 'Engagement',
      accessibility: 'Access',
      udl: 'UDL',
      accuracy: 'Accuracy',
    };

    return React.createElement('div', {
      className: 'p-5 rounded-2xl border-2 mb-8 shadow-sm',
      style: { backgroundColor: bgColor, borderColor: ringColor }
    },
      // Polish #2: Score circle removed — already rendered in the executive summary banner
      // above. This card now functions as the per-dimension chip strip + blocking-issues
      // detail panel that didn't fit in the summary banner.
      React.createElement('div', { className: 'min-w-0' },
        React.createElement('div', { className: 'text-xs font-bold uppercase tracking-wider mb-3', style: { color: textColor, opacity: 0.8 } },
          'Per-Dimension Breakdown'),
          // Per-dimension status chips
          React.createElement('div', { className: 'flex flex-wrap gap-2' },
            ALL_DIMENSIONS_FOR_RENDER.map(function (dim) {
              var dimData = (o.dimensionScores || {})[dim];
              if (!dimData) return null;
              var pct = dimScores[dim] || 0;
              var chipColor = dimData.status === 'Aligned' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                              dimData.status === 'Not Aligned' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                              'bg-amber-100 text-amber-800 border-amber-300';
              return React.createElement('div', {
                key: dim,
                className: 'flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full border ' + chipColor,
              },
                React.createElement('span', null, dimLabels[dim] || dim),
                React.createElement('span', { className: 'font-bold' }, pct + '%')
              );
            })
          ),
          o.blockingIssues && o.blockingIssues.length > 0 && React.createElement('div', { className: 'mt-3 p-2 bg-white border border-rose-300 rounded text-xs' },
            React.createElement('div', { className: 'font-bold text-rose-900 mb-1' }, '🔴 Blocking issues (must fix before Pass):'),
            React.createElement('ul', { className: 'list-disc ml-5 text-rose-900 space-y-1' },
              o.blockingIssues.map(function (b, i) {
                return React.createElement('li', { key: i },
                  React.createElement('span', { className: 'font-semibold' }, b.dimension + ': '),
                  b.issue
                );
              })
            )
          )
        )
      ,
      o.notes && React.createElement('div', { className: 'mt-3 text-[11px] italic', style: { color: textColor, opacity: 0.65 } }, o.notes)
    );
  }

  var ALL_DIMENSIONS_FOR_RENDER = ['standards', 'vocabulary', 'engagement', 'accessibility', 'udl', 'accuracy'];

  // ─── ExecutiveSummary helpers ─────────────────────────────────────────
  // Pull and rank the top recommendations across all dimensions so a teacher
  // sees "what to fix" at the top of the report without scrolling through
  // five separate dimension cards.
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
    };
    if (overall && Array.isArray(overall.blockingIssues)) {
      overall.blockingIssues.forEach(function (b) {
        if (!b || !b.issue) return;
        var dimLabelStr = b.dimension || 'Critical';
        all.push({ priority: 0, dimension: dimLabelStr, dimensionKey: labelToKey[dimLabelStr] || null, text: b.issue });
      });
    }
    ALL_DIMENSIONS_FOR_RENDER.forEach(function (dim) {
      var d = comprehensive[dim];
      if (!d || d.computeFailed || d.notApplicable || d.status === 'Aligned') return;
      var priority = d.status === 'Not Aligned' ? 1 : 2;
      var label = dimLabel[dim] || dim;
      if (Array.isArray(d.recommendations)) d.recommendations.forEach(function (r) {
        if (typeof r === 'string') all.push({ priority: priority, dimension: label, dimensionKey: dim, text: r });
      });
      if (d.llmReview) {
        if (Array.isArray(d.llmReview.fixes)) d.llmReview.fixes.forEach(function (r) {
          if (typeof r === 'string') all.push({ priority: priority, dimension: label, dimensionKey: dim, text: r });
        });
        if (Array.isArray(d.llmReview.formatGaps)) d.llmReview.formatGaps.forEach(function (r) {
          if (typeof r === 'string') all.push({ priority: priority, dimension: label, dimensionKey: dim, text: r });
        });
        if (Array.isArray(d.llmReview.recommendations)) d.llmReview.recommendations.forEach(function (r) {
          if (typeof r === 'string') all.push({ priority: priority + 0.5, dimension: label, dimensionKey: dim, text: 'Add Tier 2 word: "' + r + '"' });
        });
      }
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
            text: p.recommendation,
          });
        }
      });
    }
    all.sort(function (a, b) { return a.priority - b.priority; });
    return all.slice(0, typeof n === 'number' ? n : 4);
  }

  function ExecutiveSummary(p) {
    var c = p.comp;
    var standardsReportCount = p.standardsReportCount || 0;
    var onApplyFixes = p.onApplyFixes;
    if (!c) return null;
    var overall = c.overall || {};
    var score = typeof overall.score === 'number' ? overall.score : null;
    var dimEvaluated = typeof overall.dimensionsEvaluated === 'number' ? overall.dimensionsEvaluated : 0;
    var failedDims = ALL_DIMENSIONS_FOR_RENDER.filter(function (d) { return c[d] && c[d].computeFailed; });
    var topRecs = extractTopRecommendations(c, 4);
    var hasContent = score !== null || topRecs.length > 0 || failedDims.length > 0;
    if (!hasContent) return null;

    var statusClr;
    if (overall.blockingIssues && overall.blockingIssues.length > 0) statusClr = { ring: '#dc2626', bg: '#fef2f2', text: '#991b1b', accent: 'rose' };
    else if (score === null) statusClr = { ring: '#94a3b8', bg: '#f8fafc', text: '#334155', accent: 'slate' };
    else if (score >= 90) statusClr = { ring: '#059669', bg: '#ecfdf5', text: '#065f46', accent: 'emerald' };
    else if (score >= 70) statusClr = { ring: '#65a30d', bg: '#f7fee7', text: '#365314', accent: 'lime' };
    else if (score >= 50) statusClr = { ring: '#d97706', bg: '#fffbeb', text: '#92400e', accent: 'amber' };
    else statusClr = { ring: '#dc2626', bg: '#fef2f2', text: '#991b1b', accent: 'rose' };

    return React.createElement('div', {
      className: 'p-5 rounded-2xl border-2 mb-6 shadow-md max-w-4xl mx-auto',
      style: { backgroundColor: statusClr.bg, borderColor: statusClr.ring },
      role: 'region',
      'aria-label': 'Curriculum audit summary',
    },
      React.createElement('div', { className: 'flex items-center gap-5 mb-3 flex-wrap' },
        // Score circle
        score !== null && dimEvaluated > 0 && React.createElement('div', {
          className: 'relative flex-shrink-0',
          style: { width: '88px', height: '88px' }
        },
          React.createElement('svg', { viewBox: '0 0 88 88', style: { width: '88px', height: '88px' }, 'aria-hidden': 'true' },
            React.createElement('circle', { cx: 44, cy: 44, r: 38, fill: 'none', stroke: '#e2e8f0', strokeWidth: 8 }),
            React.createElement('circle', {
              cx: 44, cy: 44, r: 38, fill: 'none', stroke: statusClr.ring, strokeWidth: 8,
              strokeDasharray: (Math.PI * 2 * 38).toFixed(2),
              strokeDashoffset: ((Math.PI * 2 * 38) * (1 - score / 100)).toFixed(2),
              strokeLinecap: 'round',
              transform: 'rotate(-90 44 44)',
            }),
            React.createElement('text', { x: 44, y: 50, textAnchor: 'middle', fontSize: 24, fontWeight: 900, fill: statusClr.text, fontFamily: 'system-ui, sans-serif' }, score)
          )
        ),
        React.createElement('div', { className: 'flex-1 min-w-0' },
          React.createElement('div', { className: 'text-[11px] font-bold uppercase tracking-wider mb-0.5', style: { color: statusClr.text, opacity: 0.7 } }, 'Curriculum Audit'),
          React.createElement('div', { className: 'text-xl font-black mb-1', style: { color: statusClr.text } },
            score !== null && dimEvaluated > 0
              ? (overall.label || (score + ' / 100'))
              : (dimEvaluated === 0 ? 'No comprehensive dimensions evaluated' : 'Audit summary')
          ),
          React.createElement('div', { className: 'text-xs', style: { color: statusClr.text, opacity: 0.8 } },
            standardsReportCount > 0 ? (standardsReportCount + ' standard' + (standardsReportCount === 1 ? '' : 's') + ' audited · ') : '',
            dimEvaluated + ' of 5 comprehensive dimension' + (dimEvaluated === 1 ? '' : 's') + ' evaluated',
            failedDims.length > 0 ? ' · ' + failedDims.length + ' failed to compute' : ''
          )
        ),
        // Apply fixes button
        typeof onApplyFixes === 'function' && (topRecs.length > 0 || dimEvaluated > 0) && React.createElement('button', {
          type: 'button',
          onClick: onApplyFixes,
          className: 'flex-shrink-0 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2',
          title: 'Open Audit Remediator: review and apply fixes',
        },
          React.createElement('span', { 'aria-hidden': 'true' }, '🛠️'),
          ' Apply suggested fixes'
        )
      ),
      // Failed dimensions warning
      failedDims.length > 0 && React.createElement('div', {
        className: 'mt-2 p-2 bg-amber-50 border border-amber-300 rounded text-xs text-amber-900',
      },
        React.createElement('strong', null, '⚠ ' + failedDims.length + ' dimension' + (failedDims.length === 1 ? '' : 's') + ' failed to compute: '),
        failedDims.map(function (d) { return c[d] && c[d].notes ? d : d; }).join(', '),
        '. The audit ran but is incomplete; try regenerating.'
      ),
      // Top recommendations
      topRecs.length > 0 && React.createElement('div', { className: 'mt-3' },
        React.createElement('div', { className: 'text-[11px] font-bold uppercase tracking-wider mb-2', style: { color: statusClr.text, opacity: 0.7 } },
          'Top ' + topRecs.length + ' suggested fix' + (topRecs.length === 1 ? '' : 'es')),
        React.createElement('ol', { className: 'space-y-1.5 ml-1' },
          topRecs.map(function (r, i) {
            var prClass = r.priority <= 0.5 ? 'bg-rose-100 text-rose-900 border-rose-300 hover:bg-rose-200' :
                          r.priority <= 1.5 ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200' :
                          'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200';
            // Polish #3: when the rec carries a dimensionKey, render the chip as an
            // anchor that smooth-scrolls to the matching dimension card. Falls back
            // to a plain span when no dimensionKey is available (e.g., generic blocking
            // issue with an unrecognized dimension label).
            var chipChildren = [
              React.createElement('span', { key: 'lbl' }, r.dimension),
              r.dimensionKey ? React.createElement('span', { key: 'arr', 'aria-hidden': 'true', className: 'opacity-60' }, ' ↓') : null,
            ];
            var chip = r.dimensionKey
              ? React.createElement('a', {
                  href: '#audit-' + r.dimensionKey,
                  className: 'flex-shrink-0 inline-flex items-center justify-center text-[10px] font-bold uppercase px-2 py-0.5 rounded border no-underline transition-colors ' + prClass,
                  style: { minWidth: '90px', textAlign: 'center' },
                  title: 'Jump to ' + r.dimension + ' card',
                  onClick: function (ev) {
                    var el = document.getElementById('audit-' + r.dimensionKey);
                    if (el) {
                      ev.preventDefault();
                      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      // Brief flash to visually anchor the user's eye.
                      el.style.transition = 'box-shadow 800ms ease-out';
                      el.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.4)';
                      setTimeout(function () { el.style.boxShadow = ''; }, 1200);
                    }
                  },
                }, chipChildren)
              : React.createElement('span', {
                  className: 'flex-shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded border ' + prClass,
                  style: { minWidth: '90px', textAlign: 'center' },
                }, r.dimension);
            return React.createElement('li', { key: i, className: 'flex items-start gap-2 text-sm' },
              chip,
              React.createElement('span', { className: 'text-slate-800', style: { color: statusClr.text } }, r.text)
            );
          })
        )
      )
    );
  }

  function FailedDimensionCard(p) {
    var d = p.data;
    var label = p.label;
    if (!d || !d.computeFailed) return null;
    return React.createElement('div', {
      id: p.id || undefined,
      className: 'bg-amber-50 p-4 rounded-xl border border-amber-300 shadow-sm mb-6 scroll-mt-4',
    },
      React.createElement('div', { className: 'flex items-center gap-2 mb-2' },
        React.createElement('span', { 'aria-hidden': 'true', className: 'text-lg' }, '⚠'),
        React.createElement('h3', { className: 'font-bold text-amber-900' }, label + ' — could not be computed'),
        React.createElement('span', { className: 'ml-auto text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900' }, 'Failed')
      ),
      d.notes && React.createElement('p', { className: 'text-sm text-amber-900 mb-2' }, d.notes),
      d.error && React.createElement('details', { className: 'text-xs text-amber-800' },
        React.createElement('summary', { className: 'cursor-pointer font-semibold' }, 'Show error'),
        React.createElement('pre', { className: 'mt-1 p-2 bg-amber-100 rounded overflow-x-auto whitespace-pre-wrap' }, d.error)
      )
    );
  }

  // Plan R+: N/A card for dimensions explicitly flagged as Not Applicable
  // (e.g., standards alignment when the teacher hasn't entered any target
  // standards, or the future cultural-responsiveness dimension when content
  // has no human-context surface area). Excluded from the readiness score.
  function NotApplicableCard(p) {
    var d = p.data;
    var label = p.label;
    if (!d || !d.notApplicable) return null;
    return React.createElement('div', {
      id: p.id || undefined,
      className: 'bg-slate-50 p-4 rounded-xl border border-dashed border-slate-300 shadow-sm mb-6 scroll-mt-4',
    },
      React.createElement('div', { className: 'flex items-center gap-2 mb-2' },
        React.createElement('span', { 'aria-hidden': 'true', className: 'text-lg' }, '➖'),
        React.createElement('h3', { className: 'font-bold text-slate-700' }, label),
        React.createElement('span', { className: 'ml-auto text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700' }, 'Not applicable')
      ),
      d.reason && React.createElement('p', { className: 'text-sm text-slate-600' }, d.reason)
    );
  }

  function ComprehensiveBlock(p) {
    var c = p.comp;
    if (!c) return null;
    return React.createElement('div', {
      className: 'mt-8 pt-6 border-t border-slate-200 max-w-4xl mx-auto'
    },
      React.createElement('div', { className: 'mb-6' },
        React.createElement('h2', { className: 'text-xl font-black text-slate-800 uppercase tracking-tight mb-1' },
          'Per-Dimension Findings'),
        React.createElement('p', { className: 'text-sm text-slate-600' },
          'Detailed evidence and recommendations from each comprehensive audit dimension. Apply fixes from the summary panel above.')
      ),
      c.overall && React.createElement(ReadinessScoreCard, { overall: c.overall }),
      // Standards rendered first (most teacher-relevant)
      c.standards && (c.standards.computeFailed
        ? React.createElement(FailedDimensionCard, { id: 'audit-standards', data: c.standards, label: 'Standards alignment' })
        : c.standards.notApplicable
        ? React.createElement(NotApplicableCard, { id: 'audit-standards', data: c.standards, label: 'Standards alignment' })
        : React.createElement(StandardsSection, { standards: c.standards })),
      c.vocabulary && (c.vocabulary.computeFailed
        ? React.createElement(FailedDimensionCard, { id: 'audit-vocabulary', data: c.vocabulary, label: 'Vocabulary fit' })
        : React.createElement(VocabularySection, { vocab: c.vocabulary })),
      c.engagement && (c.engagement.computeFailed
        ? React.createElement(FailedDimensionCard, { id: 'audit-engagement', data: c.engagement, label: 'Engagement variety' })
        : React.createElement(EngagementSection, { eng: c.engagement })),
      c.accessibility && (c.accessibility.computeFailed
        ? React.createElement(FailedDimensionCard, { id: 'audit-accessibility', data: c.accessibility, label: 'Content accessibility' })
        : React.createElement(AccessibilitySection, { access: c.accessibility })),
      c.udl && (c.udl.computeFailed
        ? React.createElement(FailedDimensionCard, { id: 'audit-udl', data: c.udl, label: 'UDL principles' })
        : React.createElement(UdlSection, { udl: c.udl })),
      c.accuracy && (c.accuracy.computeFailed
        ? React.createElement(FailedDimensionCard, { id: 'audit-accuracy', data: c.accuracy, label: 'Content accuracy' })
        : React.createElement(AccuracySection, { acc: c.accuracy }))
    );
  }

  function AlignmentReportView(props) {
  var t = props.t;
  var generatedContent = props.generatedContent;
  var comprehensive = generatedContent && generatedContent.data && generatedContent.data.comprehensive;
  var reports = (generatedContent && generatedContent.data && Array.isArray(generatedContent.data.reports)) ? generatedContent.data.reports : [];
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-8 max-w-4xl mx-auto h-full overflow-y-auto pr-2 pb-10"
  },
    // Executive summary banner — always rendered first when comprehensive data exists.
    // Shows readiness score, dimension count, top fixes, and the Apply button so a
    // teacher sees the bottom line + next actions without scrolling past the legacy
    // standards-alignment block.
    comprehensive && React.createElement(ExecutiveSummary, {
      comp: comprehensive,
      standardsReportCount: reports.length,
      onApplyFixes: props.onApplyFixes,
    }),
    // Polish #1: Collapse legacy standards-alignment block by default. Native <details>
    // gives us free keyboard + screen-reader semantics. The summary line shows the
    // count + Pass/Revise distribution; the existing per-report cards render inside
    // when expanded.
    reports.length > 0 && (() => {
      var passCount = 0; var reviseCount = 0;
      reports.forEach(function (r) { if (r && r.overallDetermination === 'Pass') passCount++; else reviseCount++; });
      var allPass = reviseCount === 0;
      var distText = passCount + ' PASS' + (reviseCount > 0 ? ' · ' + reviseCount + ' REVISE' : '');
      var summaryText = '📋 ' + reports.length + ' standard' + (reports.length === 1 ? '' : 's') + ' audited · ' + distText;
      return React.createElement('details', {
        className: 'rounded-xl border-2 overflow-hidden ' + (allPass ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'),
      },
        React.createElement('summary', {
          className: 'px-4 py-3 cursor-pointer font-bold text-sm uppercase tracking-wider select-none ' + (allPass ? 'text-green-800 hover:bg-green-100' : 'text-red-800 hover:bg-red-100'),
        }, summaryText),
        React.createElement('div', { className: 'p-4 bg-white border-t-2 ' + (allPass ? 'border-green-200' : 'border-red-200') + ' space-y-8' },
          reports.map((report, idx) => /*#__PURE__*/React.createElement("div", {
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
  })))
        )
      );
    })(),
    comprehensive && React.createElement(ComprehensiveBlock, { comp: comprehensive, onApplyFixes: props.onApplyFixes })
  );
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.AlignmentReportView = AlignmentReportView;
  window.AlloModules.ViewAlignmentReportModule = true;
})();
