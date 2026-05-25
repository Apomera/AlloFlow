var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? <I {...props} /> : null;
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
    return <div id={p.id || undefined} className="bg-white p-6 rounded-xl border border-slate-300 shadow-sm mb-6 scroll-mt-4"><div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200"><h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg"><span aria-hidden="true">{p.icon}</span> {p.title}</h3><span className={'text-[11px] uppercase font-bold px-2 py-1 rounded ' + statusBadgeClass(p.status)}>{p.status || 'N/A'}</span></div>{p.children}</div>;
  }

  // ─── StandardsSection ─────────────────────────────────────────────────
  // Plan R+: Standards alignment is now the 6th comprehensive dimension.
  // Renders the per-standard summary header + the existing per-report cards
  // inside the same ComprehensiveSection framework as the others.
  function StandardsSection(p) {
    var s = p.standards;
    if (!s) return null;
    var perStandard = Array.isArray(s.perStandard) ? s.perStandard : [];
    return <ComprehensiveSection id="audit-standards" icon="🎯" title="Standards alignment" status={s.status}> // Top stat row
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4"><div className="p-3 bg-slate-50 rounded text-center"><div className="text-2xl font-bold text-slate-800">{s.totalStandards || perStandard.length}</div><div className="text-xs text-slate-600">{'Standard' + ((s.totalStandards || perStandard.length) === 1 ? '' : 's') + ' audited'}</div></div><div className="p-3 bg-emerald-50 rounded text-center border border-emerald-200"><div className="text-2xl font-bold text-emerald-800">{s.passCount || 0}</div><div className="text-xs text-emerald-700">Pass</div></div><div className={'p-3 rounded text-center ' + ((s.reviseCount || 0) > 0 ? 'bg-rose-50 border border-rose-200' : 'bg-slate-50 border border-slate-200')}><div className={'text-2xl font-bold ' + ((s.reviseCount || 0) > 0 ? 'text-rose-800' : 'text-slate-800')}>{s.reviseCount || 0}</div><div className={'text-xs ' + ((s.reviseCount || 0) > 0 ? 'text-rose-700' : 'text-slate-600')}>Revise</div></div><div className="p-3 bg-slate-50 rounded text-center"><div className="text-xs font-bold text-slate-800 leading-tight pt-2">Holistic Lesson Plan Audit</div><div className="text-[10px] text-slate-500 mt-1">text + activities + assessment</div></div></div>{
      // Per-standard collapsible cards
      perStandard.length > 0 && <div className="space-y-3">{perStandard.map(function (report, idx) {
          var passColor = report && report.overallDetermination === 'Pass';
          return <details key={idx} open={!passColor} className={'rounded-lg border ' + (passColor ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50')}><summary className={'px-3 py-2 cursor-pointer font-semibold text-sm select-none flex items-center justify-between gap-2 ' + (passColor ? 'text-emerald-800 hover:bg-emerald-100' : 'text-rose-800 hover:bg-rose-100')}><span className="flex-1 truncate">{report && report.standard || 'Standard ' + (idx + 1)}</span><span className={'text-[10px] uppercase font-bold px-2 py-0.5 rounded ' + (passColor ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900')}>{report && report.overallDetermination || 'Revise'}</span></summary><div className="px-3 pb-3 pt-2 bg-white rounded-b-lg space-y-2 text-xs">{report && report.standardBreakdown && (report.standardBreakdown.cognitiveDemand || report.standardBreakdown.contentFocus) && <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2 pb-2 border-b border-slate-200">{report.standardBreakdown.cognitiveDemand && <div><span className="font-bold uppercase text-slate-600">Cognitive demand: </span><span className="text-slate-800">{report.standardBreakdown.cognitiveDemand}</span></div>}{report.standardBreakdown.contentFocus && <div><span className="font-bold uppercase text-slate-600">Content focus: </span><span className="text-slate-800">{report.standardBreakdown.contentFocus}</span></div>}</div>}{['textAlignment', 'activityAlignment', 'assessmentAlignment'].map(function (key) {
                var sec = report && report.analysis && report.analysis[key];
                if (!sec) return null;
                var lbl = key === 'textAlignment' ? 'Text' : key === 'activityAlignment' ? 'Activities' : 'Assessment';
                var stat = sec.status || 'N/A';
                return <div key={key} className="flex items-start gap-2"><span className={'flex-shrink-0 text-[10px] uppercase font-bold px-2 py-0.5 rounded ' + statusBadgeClass(stat)} style={{
                    minWidth: '90px',
                    textAlign: 'center'
                  }}>{lbl + ' · ' + stat}</span><span className="text-slate-700 italic">{sec.evidence ? '"' + sec.evidence + '"' : '—'}</span></div>;
              })}{report && report.adminRecommendation && <div className="mt-2 pt-2 border-t border-slate-200"><span className="text-[10px] uppercase font-bold text-indigo-700">Recommendation: </span><span className="text-slate-800">{report.adminRecommendation}</span></div>}</div></details>;
        })}</div>}{s.notes && <div className="mt-3 text-[11px] text-slate-500 italic">{s.notes}</div>}</ComprehensiveSection>;
  }
  function VocabularySection(p) {
    var v = p.vocab;
    if (!v) return null;
    // Backward-compat: older saved audits only have totalWords; show that as auditedTextWords.
    var sourceWords = typeof v.sourceWords === 'number' ? v.sourceWords : null;
    var auditedTextWords = typeof v.auditedTextWords === 'number' ? v.auditedTextWords : v.totalWords;
    var scaleNote = v.expected && v.expected.scale && v.expected.scale > 1.5 ? '(rescaled ×' + v.expected.scale + ' for bundle size)' : '';
    return <ComprehensiveSection id="audit-vocabulary" icon="📚" title="Vocabulary fit" status={v.status}><div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4"><div className="p-3 bg-slate-50 rounded text-center" title={sourceWords !== null ? 'Source words: words in the primary lesson source (matches your "lesson length" intuition).\nAudited: words across the full bundle (every artifact), used for tier classification.' : ''}>{sourceWords !== null ? <><div className="text-2xl font-bold text-slate-800">{sourceWords}</div><div className="text-xs text-slate-600">Source words</div><div className="text-[10px] text-slate-500 mt-1">{auditedTextWords + ' across bundle'}</div></> : <><div className="text-2xl font-bold text-slate-800">{auditedTextWords}</div><div className="text-xs text-slate-600">Total words</div></>}</div><div className="p-3 bg-blue-50 rounded text-center"><div className="text-2xl font-bold text-blue-800">{v.tier2Count}</div><div className="text-xs text-blue-700">Tier 2 (academic)</div><div className="text-[10px] text-slate-500 mt-1">{'expected ~' + (v.expected && v.expected.tier2) + ' ' + scaleNote}</div></div><div className="p-3 bg-purple-50 rounded text-center"><div className="text-2xl font-bold text-purple-800">{v.tier3Count}</div><div className="text-xs text-purple-700">Tier 3 (domain)</div><div className="text-[10px] text-slate-500 mt-1">{'expected ~' + (v.expected && v.expected.tier3) + ' ' + scaleNote}</div></div><div className="p-3 bg-slate-50 rounded text-center"><div className="text-2xl font-bold text-slate-800">{v.glossaryTermsCount}</div><div className="text-xs text-slate-600">Glossary terms</div></div></div>{v.tier2Examples && v.tier2Examples.length > 0 && <div className="mb-3"><div className="text-xs font-semibold text-blue-800 mb-1">Tier 2 examples found:</div><div className="flex flex-wrap gap-1">{v.tier2Examples.map(function (w, i) {
            return <span key={i} className="text-xs px-2 py-0.5 bg-blue-100 text-blue-900 rounded">{w}</span>;
          })}</div></div>}{v.tier3Examples && v.tier3Examples.length > 0 && <div className="mb-3"><div className="text-xs font-semibold text-purple-800 mb-1">Tier 3 examples found:</div><div className="flex flex-wrap gap-1">{v.tier3Examples.map(function (w, i) {
            return <span key={i} className="text-xs px-2 py-0.5 bg-purple-100 text-purple-900 rounded">{w}</span>;
          })}</div></div>}{
      // Reading-level harvest from analysis items
      v.readingLevels && v.readingLevels.length > 0 && <div className="p-3 bg-slate-50 border border-slate-200 rounded mb-3"><div className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-2"><span aria-hidden="true">📖</span> Reading levels (from analyzed source texts)</div><ul className="space-y-1 text-sm text-slate-800">{v.readingLevels.map(function (r, i) {
            return <li key={i} className="flex items-start gap-2"><span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-800 rounded font-semibold whitespace-nowrap">{r.range}</span>{r.explanation && <span className="text-xs text-slate-600">{r.explanation.slice(0, 240)}</span>}</li>;
          })}</ul></div>}{v.recommendations && v.recommendations.length > 0 && <div className="p-3 bg-amber-50 border border-amber-200 rounded mb-3"><div className="text-xs font-semibold text-amber-900 mb-1">Heuristic recommendations:</div><ul className="list-disc ml-5 text-sm text-amber-900 space-y-1">{v.recommendations.map(function (r, i) {
            return <li key={i}>{r}</li>;
          })}</ul></div>}{
      // LLM review pairing (Plan O Step 1 enhancement)
      v.llmReview && <div className="p-3 bg-indigo-50 border border-indigo-200 rounded mb-3"><div className="text-xs font-semibold text-indigo-900 mb-2 flex items-center gap-2"><span aria-hidden="true">🤖</span> Literacy-coach review (AI)</div>{v.llmReview.narrative && <p className="text-sm text-indigo-900 mb-2">{v.llmReview.narrative}</p>}{v.llmReview.corrections && v.llmReview.corrections.length > 0 && <div className="mb-2"><div className="text-xs font-semibold text-indigo-800 mb-1">Likely misclassified (heuristic flagged Tier 2 but really Tier 1):</div><div className="flex flex-wrap gap-1">{v.llmReview.corrections.map(function (w, i) {
              return <span key={i} className="text-xs px-2 py-0.5 bg-orange-100 text-orange-900 rounded line-through">{w}</span>;
            })}</div></div>}{v.llmReview.missedTier2 && v.llmReview.missedTier2.length > 0 && <div className="mb-2"><div className="text-xs font-semibold text-indigo-800 mb-1">Tier 2 words present but missed by the heuristic:</div><div className="flex flex-wrap gap-1">{v.llmReview.missedTier2.map(function (w, i) {
              return <span key={i} className="text-xs px-2 py-0.5 bg-blue-100 text-blue-900 rounded">{w}</span>;
            })}</div></div>}{v.llmReview.recommendations && v.llmReview.recommendations.length > 0 && <div><div className="text-xs font-semibold text-indigo-800 mb-1">Suggested Tier 2 words to add for this topic + grade:</div><div className="flex flex-wrap gap-1">{v.llmReview.recommendations.map(function (w, i) {
              return <span key={i} className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded font-semibold">{'+ ' + w}</span>;
            })}</div></div>}</div>}<div className="text-[11px] text-slate-500 italic">{v.notes || ''}</div></ComprehensiveSection>;
  }
  function EngagementSection(p) {
    var e = p.eng;
    if (!e) return null;
    var dok = e.dokDistribution || {};
    var modPresent = e.multimodalCoverage && e.multimodalCoverage.present || [];
    var modMissing = e.multimodalCoverage && e.multimodalCoverage.missing || [];
    return <ComprehensiveSection id="audit-engagement" icon="🎯" title="Engagement variety" status={e.status}> // Top stat row
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4"><div className="p-3 bg-slate-50 rounded text-center"><div className="text-2xl font-bold text-slate-800">{e.distinctTypeCount}</div><div className="text-xs text-slate-600">Distinct artifact types</div></div><div className="p-3 bg-slate-50 rounded text-center"><div className="text-2xl font-bold text-slate-800">{e.totalArtifacts}</div><div className="text-xs text-slate-600">Total artifacts</div></div><div className="p-3 bg-slate-50 rounded text-center"><div className="text-2xl font-bold text-slate-800">{Math.round((e.diversityScore || 0) * 100) + '%'}</div><div className="text-xs text-slate-600">Diversity score</div></div><div className="p-3 bg-slate-50 rounded text-center"><div className="text-2xl font-bold text-slate-800">{modPresent.length + '/4'}</div><div className="text-xs text-slate-600">Modalities present</div></div></div>{
      // Distinct types chips
      e.distinctTypes && e.distinctTypes.length > 0 && <div className="mb-3"><div className="text-xs font-semibold text-slate-700 mb-1">Artifact types in this curriculum:</div><div className="flex flex-wrap gap-1">{e.distinctTypes.map(function (t, i) {
            return <span key={i} className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-900 rounded">{t}</span>;
          })}</div></div>} // Modalities row
      <div className="mb-3 grid grid-cols-1 md:grid-cols-2 gap-2"><div><div className="text-xs font-semibold text-emerald-800 mb-1">Modalities present:</div><div className="flex flex-wrap gap-1">{modPresent.length > 0 ? modPresent.map(function (m, i) {
              return <span key={i} className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded">{m}</span>;
            }) : <span className="text-xs text-slate-500 italic">(none)</span>}</div></div><div><div className="text-xs font-semibold text-rose-800 mb-1">Modalities missing:</div><div className="flex flex-wrap gap-1">{modMissing.length > 0 ? modMissing.map(function (m, i) {
              return <span key={i} className="text-xs px-2 py-0.5 bg-rose-100 text-rose-900 rounded">{m}</span>;
            }) : <span className="text-xs text-emerald-700">all four covered</span>}</div></div></div>{
      // DOK bar
      e.dokTotal > 0 && <div className="mb-3"><div className="text-xs font-semibold text-slate-700 mb-1">{'Quiz DOK distribution (' + e.dokTotal + ' items, Webb\'s framework):'}</div><div className="flex h-6 w-full rounded overflow-hidden border border-slate-200">{(dok.L1 || 0) > 0 && <div style={{
            width: dok.L1 + '%',
            backgroundColor: '#fde68a'
          }} className="flex items-center justify-center text-[10px] font-bold text-amber-900" title={'L1 Recall: ' + dok.L1 + '%'}>{dok.L1 > 8 ? 'L1 ' + dok.L1 + '%' : ''}</div>}{(dok.L2 || 0) > 0 && <div style={{
            width: dok.L2 + '%',
            backgroundColor: '#86efac'
          }} className="flex items-center justify-center text-[10px] font-bold text-green-900" title={'L2 Skill/Concept: ' + dok.L2 + '%'}>{dok.L2 > 8 ? 'L2 ' + dok.L2 + '%' : ''}</div>}{(dok.L3 || 0) > 0 && <div style={{
            width: dok.L3 + '%',
            backgroundColor: '#93c5fd'
          }} className="flex items-center justify-center text-[10px] font-bold text-blue-900" title={'L3 Strategic Thinking: ' + dok.L3 + '%'}>{dok.L3 > 8 ? 'L3 ' + dok.L3 + '%' : ''}</div>}{(dok.L4 || 0) > 0 && <div style={{
            width: dok.L4 + '%',
            backgroundColor: '#c4b5fd'
          }} className="flex items-center justify-center text-[10px] font-bold text-purple-900" title={'L4 Extended Thinking: ' + dok.L4 + '%'}>{dok.L4 > 8 ? 'L4 ' + dok.L4 + '%' : ''}</div>}{(dok.unknown || 0) > 0 && <div style={{
            width: dok.unknown + '%',
            backgroundColor: '#cbd5e1'
          }} className="flex items-center justify-center text-[10px] text-slate-700" title={'Unknown: ' + dok.unknown + '%'}>{dok.unknown > 8 ? '?' : ''}</div>}</div></div>} // Scaffold counts
      <div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs"><div className="p-2 bg-slate-50 rounded"><div className="font-bold text-slate-800">{e.scaffoldCounts && e.scaffoldCounts.sentenceFrames || 0}</div><div className="text-slate-600">sentence frames</div></div><div className="p-2 bg-slate-50 rounded"><div className="font-bold text-slate-800">{e.scaffoldCounts && e.scaffoldCounts.simplifiedTexts || 0}</div><div className="text-slate-600">simplified texts</div></div><div className="p-2 bg-slate-50 rounded"><div className="font-bold text-slate-800">{e.scaffoldCounts && e.scaffoldCounts.leveledGlossary || 0}</div><div className="text-slate-600">leveled glossaries</div></div></div>{
      // Heuristic recommendations
      e.recommendations && e.recommendations.length > 0 && <div className="p-3 bg-amber-50 border border-amber-200 rounded mb-3"><div className="text-xs font-semibold text-amber-900 mb-1">Heuristic recommendations:</div><ul className="list-disc ml-5 text-sm text-amber-900 space-y-1">{e.recommendations.map(function (r, i) {
            return <li key={i}>{r}</li>;
          })}</ul></div>}{
      // LLM review
      e.llmReview && <div className="p-3 bg-indigo-50 border border-indigo-200 rounded mb-3"><div className="text-xs font-semibold text-indigo-900 mb-2 flex items-center gap-2"><span aria-hidden="true">🤖</span> UDL + DOK review (AI)</div>{e.llmReview.narrative && <p className="text-sm text-indigo-900 mb-2">{e.llmReview.narrative}</p>}{e.llmReview.dokAssessment && <p className="text-sm text-indigo-900 mb-2 italic">{'"' + e.llmReview.dokAssessment + '"'}</p>}{e.llmReview.formatGaps && e.llmReview.formatGaps.length > 0 && <div><div className="text-xs font-semibold text-indigo-800 mb-1">Suggested format additions:</div><ul className="list-disc ml-5 text-sm text-indigo-900 space-y-1">{e.llmReview.formatGaps.map(function (g, i) {
              return <li key={i}>{g}</li>;
            })}</ul></div>}</div>}<div className="text-[11px] text-slate-500 italic">{e.notes || ''}</div></ComprehensiveSection>;
  }
  function AccessibilitySection(p) {
    var a = p.access;
    if (!a) return null;
    var altPctColor = a.altCoveragePct === null ? 'slate' : a.altCoveragePct >= 80 ? 'emerald' : a.altCoveragePct >= 50 ? 'amber' : 'rose';
    return <ComprehensiveSection id="audit-accessibility" icon="♿" title="Content accessibility" status={a.status}> // Top stat row
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4"><div className="p-3 bg-slate-50 rounded text-center"><div className="text-2xl font-bold text-slate-800">{a.totalImages}</div><div className="text-xs text-slate-600">Images</div></div><div className={'p-3 rounded text-center bg-' + altPctColor + '-50 border border-' + altPctColor + '-200'}><div className={'text-2xl font-bold text-' + altPctColor + '-800'}>{a.altCoveragePct === null ? 'n/a' : a.altCoveragePct + '%'}</div><div className={'text-xs text-' + altPctColor + '-700'}>Alt-text coverage</div></div><div className={'p-3 rounded text-center ' + (a.colorOnlyCount > 0 ? 'bg-rose-50 border border-rose-200' : 'bg-emerald-50 border border-emerald-200')}><div className={'text-2xl font-bold ' + (a.colorOnlyCount > 0 ? 'text-rose-800' : 'text-emerald-800')}>{a.colorOnlyCount}</div><div className={'text-xs ' + (a.colorOnlyCount > 0 ? 'text-rose-700' : 'text-emerald-700')}>Color-only refs</div></div><div className="p-3 bg-slate-50 rounded text-center"><div className="text-2xl font-bold text-slate-800">{a.longestUnbrokenPassage}</div><div className="text-xs text-slate-600">Longest passage (words)</div></div></div>{
      // Color-only examples
      a.colorOnlyExamples && a.colorOnlyExamples.length > 0 && <div className="mb-3"><div className="text-xs font-semibold text-rose-800 mb-1">Color-only language found (students with color blindness cannot follow these):</div><ul className="list-disc ml-5 text-xs text-rose-900 space-y-0.5">{a.colorOnlyExamples.slice(0, 6).map(function (ex, i) {
            return <li key={i} className="font-mono italic">{'"' + ex + '"'}</li>;
          })}</ul></div>}{
      // Implicit image references
      a.implicitImageExamples && a.implicitImageExamples.length > 0 && <div className="mb-3"><div className="text-xs font-semibold text-amber-800 mb-1">References to images (verify each has descriptive alt text):</div><ul className="list-disc ml-5 text-xs text-amber-900 space-y-0.5">{a.implicitImageExamples.slice(0, 6).map(function (ex, i) {
            return <li key={i} className="font-mono italic">{'"' + ex + '"'}</li>;
          })}</ul></div>}{
      // Heuristic recommendations
      a.recommendations && a.recommendations.length > 0 && <div className="p-3 bg-amber-50 border border-amber-200 rounded mb-3"><div className="text-xs font-semibold text-amber-900 mb-1">Heuristic recommendations:</div><ul className="list-disc ml-5 text-sm text-amber-900 space-y-1">{a.recommendations.map(function (r, i) {
            return <li key={i}>{r}</li>;
          })}</ul></div>}{
      // LLM review with student impacts
      a.llmReview && <div className="p-3 bg-indigo-50 border border-indigo-200 rounded mb-3"><div className="text-xs font-semibold text-indigo-900 mb-2 flex items-center gap-2"><span aria-hidden="true">🤖</span> Accessibility-specialist review (AI)</div>{a.llmReview.narrative && <p className="text-sm text-indigo-900 mb-3">{a.llmReview.narrative}</p>}{a.llmReview.studentImpacts && a.llmReview.studentImpacts.length > 0 && <div className="mb-3"><div className="text-xs font-semibold text-indigo-800 mb-1">Student-impact callouts:</div><ul className="list-disc ml-5 text-sm text-indigo-900 space-y-1">{a.llmReview.studentImpacts.map(function (s, i) {
              return <li key={i}>{s}</li>;
            })}</ul></div>}{a.llmReview.fixes && a.llmReview.fixes.length > 0 && <div><div className="text-xs font-semibold text-indigo-800 mb-1">Suggested fixes:</div><ul className="list-disc ml-5 text-sm text-indigo-900 space-y-1">{a.llmReview.fixes.map(function (f, i) {
              return <li key={i}>{f}</li>;
            })}</ul></div>}</div>}<div className="text-[11px] text-slate-500 italic">{a.notes || ''}</div></ComprehensiveSection>;
  }
  function UdlPillar(p) {
    var pillar = p.pillar;
    if (!pillar) return null;
    return <div className="p-3 bg-white border border-slate-200 rounded mb-2"><div className="flex items-center justify-between mb-2"><h4 className="font-bold text-sm text-slate-800 flex items-center gap-2"><span aria-hidden="true" className="text-lg">{p.icon}</span> {p.title}</h4><span className={'text-[10px] uppercase font-bold px-2 py-0.5 rounded ' + statusBadgeClass(pillar.status)}>{pillar.status || 'N/A'}</span></div>{pillar.evidence && <div className="mb-2"><div className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Evidence</div><p className="text-sm text-slate-700">{pillar.evidence}</p></div>}{pillar.gaps && <div className="mb-2"><div className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider">Gaps</div><p className="text-sm text-slate-700">{pillar.gaps}</p></div>}{pillar.recommendation && <div><div className="text-[11px] font-semibold text-indigo-800 uppercase tracking-wider">Recommendation</div><p className="text-sm text-slate-700">{pillar.recommendation}</p></div>}</div>;
  }
  function UdlSection(p) {
    var u = p.udl;
    if (!u) return null;
    var priors = u.priorsUsed || {};
    return <ComprehensiveSection id="audit-udl" icon="🌐" title="UDL principles (CAST Guidelines v3.0)" status={u.status}> // Priors banner
      <div className="mb-3 p-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700"><span className="font-semibold">Priors used: </span>{(priors.modalitiesPresent || []).length} modalities ({(priors.modalitiesPresent || []).join(', ') || 'none'}), {(priors.distinctTypes || []).length} distinct artifact types, {(priors.scaffoldCounts && priors.scaffoldCounts.sentenceFrames || 0) + (priors.scaffoldCounts && priors.scaffoldCounts.simplifiedTexts || 0) + (priors.scaffoldCounts && priors.scaffoldCounts.leveledGlossary || 0)} scaffolds.</div> // Three pillars
      <UdlPillar pillar={u.representation} title="Representation" icon="👁️" /><UdlPillar pillar={u.engagement} title="Engagement" icon="✨" /><UdlPillar pillar={u.actionExpression} title="Action & Expression" icon="✍️" />{
      // Overall narrative
      u.overallNarrative && <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded"><div className="text-xs font-semibold text-indigo-900 mb-1 flex items-center gap-2"><span aria-hidden="true">🤖</span> UDL specialist synthesis (AI)</div><p className="text-sm text-indigo-900">{u.overallNarrative}</p></div>}<div className="text-[11px] text-slate-500 italic mt-2">{u.notes || ''}</div></ComprehensiveSection>;
  }
  function AccuracySection(p) {
    var a = p.acc;
    if (!a) return null;
    var counts = a.accuracyRatingCounts || {
      high: 0,
      medium: 0,
      low: 0
    };
    return <ComprehensiveSection id="audit-accuracy" icon="✅" title="Content accuracy" status={a.status}> // Top stat row
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4"><div className="p-3 bg-slate-50 rounded text-center"><div className="text-2xl font-bold text-slate-800">{a.totalAnalyses}</div><div className="text-xs text-slate-600">Analyses run</div></div><div className="p-3 bg-emerald-50 rounded text-center border border-emerald-200"><div className="text-2xl font-bold text-emerald-800">{a.totalVerifiedFacts}</div><div className="text-xs text-emerald-700">Verified facts</div></div><div className={'p-3 rounded text-center ' + (a.totalDiscrepancies > 0 ? 'bg-rose-50 border border-rose-200' : 'bg-slate-50 border border-slate-200')}><div className={'text-2xl font-bold ' + (a.totalDiscrepancies > 0 ? 'text-rose-800' : 'text-slate-800')}>{a.totalDiscrepancies}</div><div className={'text-xs ' + (a.totalDiscrepancies > 0 ? 'text-rose-700' : 'text-slate-600')}>Discrepancies</div></div><div className="p-3 bg-slate-50 rounded text-center"><div className="text-2xl font-bold text-slate-800">{counts.high + 'H/' + counts.medium + 'M/' + counts.low + 'L'}</div><div className="text-xs text-slate-600">Rating mix</div></div></div>{
      // Sample verifications
      a.sampleVerifications && a.sampleVerifications.length > 0 && <details className="mb-3 bg-slate-50 border border-slate-200 rounded p-3"><summary className="cursor-pointer text-sm font-semibold text-slate-800">{'Per-analysis details (' + a.sampleVerifications.length + ')'}</summary><ul className="mt-2 space-y-2">{a.sampleVerifications.map(function (s, i) {
            var ratingColor = (s.rating || '').toLowerCase().indexOf('high') >= 0 ? 'emerald' : (s.rating || '').toLowerCase().indexOf('low') >= 0 ? 'rose' : 'amber';
            return <li key={i} className="p-2 bg-white border border-slate-200 rounded"><div className="flex items-center gap-2 mb-1"><span className={'text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-' + ratingColor + '-100 text-' + ratingColor + '-800'}>{s.rating || 'Unknown'}</span><span className="text-xs text-slate-600">{s.verifiedFactCount + ' verified, ' + s.discrepancyCount + ' discrepanc' + (s.discrepancyCount === 1 ? 'y' : 'ies')}</span></div>{s.reason && <p className="text-xs text-slate-700">{s.reason}</p>}</li>;
          })}</ul></details>}{
      // Heuristic recommendations
      a.recommendations && a.recommendations.length > 0 && <div className="p-3 bg-amber-50 border border-amber-200 rounded mb-3"><div className="text-xs font-semibold text-amber-900 mb-1">Heuristic recommendations:</div><ul className="list-disc ml-5 text-sm text-amber-900 space-y-1">{a.recommendations.map(function (r, i) {
            return <li key={i}>{r}</li>;
          })}</ul></div>}{
      // LLM review with claims to verify
      a.llmReview && <div className="p-3 bg-indigo-50 border border-indigo-200 rounded mb-3"><div className="text-xs font-semibold text-indigo-900 mb-2 flex items-center gap-2"><span aria-hidden="true">🤖</span> Fact-checker review (AI)</div>{a.llmReview.narrative && <p className="text-sm text-indigo-900 mb-3">{a.llmReview.narrative}</p>}{a.llmReview.claimsToVerify && a.llmReview.claimsToVerify.length > 0 && <div className="mb-3"><div className="text-xs font-semibold text-indigo-800 mb-1">Specific claims to double-check:</div><ul className="list-disc ml-5 text-sm text-indigo-900 space-y-1">{a.llmReview.claimsToVerify.map(function (c, i) {
              return <li key={i} className="italic">{'"' + c + '"'}</li>;
            })}</ul></div>}{a.llmReview.fixes && a.llmReview.fixes.length > 0 && <div><div className="text-xs font-semibold text-indigo-800 mb-1">Suggested improvements:</div><ul className="list-disc ml-5 text-sm text-indigo-900 space-y-1">{a.llmReview.fixes.map(function (f, i) {
              return <li key={i}>{f}</li>;
            })}</ul></div>}</div>}<div className="text-[11px] text-slate-500 italic">{a.notes || ''}</div></ComprehensiveSection>;
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
    return <ComprehensiveSection id="audit-differentiation" icon="🎚️" title="Differentiation coverage" status={d.status}><div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4"><div className="p-3 bg-slate-50 rounded text-center"><div className="text-2xl font-bold text-slate-800">{d.coverage + '%'}</div><div className="text-xs text-slate-600">UDL coverage</div></div><div className="p-3 bg-slate-50 rounded text-center"><div className="text-2xl font-bold text-slate-800">{d.presentCount + '/' + d.totalAccommodationTypes}</div><div className="text-xs text-slate-600">Accommodation types</div></div><div className="p-3 bg-emerald-50 rounded text-center border border-emerald-200"><div className="text-2xl font-bold text-emerald-800">{Object.keys(flags).filter(function (k) {
              return flags[k];
            }).length}</div><div className="text-xs text-emerald-700">Present</div></div><div className={'p-3 rounded text-center ' + (d.missing && d.missing.length > 0 ? 'bg-rose-50 border border-rose-200' : 'bg-slate-50 border border-slate-200')}><div className={'text-2xl font-bold ' + (d.missing && d.missing.length > 0 ? 'text-rose-800' : 'text-slate-800')}>{d.missing && d.missing.length || 0}</div><div className={'text-xs ' + (d.missing && d.missing.length > 0 ? 'text-rose-700' : 'text-slate-600')}>Missing</div></div></div> // Inventory grid
      <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 mb-3">{Object.keys(flags).map(function (k) {
          var on = flags[k];
          return <div key={k} className={'flex items-center gap-2 text-xs px-2 py-1.5 rounded border ' + (on ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-500')}><span aria-hidden="true" className="flex-shrink-0">{on ? '✓' : '○'}</span><span className="truncate">{labelMap[k] || k}</span></div>;
        })}</div>{d.recommendations && d.recommendations.length > 0 && <div className="p-3 bg-amber-50 border border-amber-200 rounded mb-3"><div className="text-xs font-semibold text-amber-900 mb-1">Heuristic recommendations:</div><ul className="list-disc ml-5 text-sm text-amber-900 space-y-1">{d.recommendations.map(function (r, i) {
            return <li key={i}>{r}</li>;
          })}</ul></div>}{d.llmReview && <div className="p-3 bg-indigo-50 border border-indigo-200 rounded mb-3"><div className="text-xs font-semibold text-indigo-900 mb-2 flex items-center gap-2"><span aria-hidden="true">🤖</span> UDL specialist review (AI)</div>{d.llmReview.narrative && <p className="text-sm text-indigo-900 mb-2">{d.llmReview.narrative}</p>}{d.llmReview.priorityAdditions && d.llmReview.priorityAdditions.length > 0 && <div className="mb-2"><div className="text-xs font-semibold text-indigo-800 mb-1">Priority additions:</div><ul className="list-disc ml-5 text-sm text-indigo-900 space-y-1">{d.llmReview.priorityAdditions.map(function (r, i) {
              return <li key={i}>{r}</li>;
            })}</ul></div>}{d.llmReview.qualityFlags && d.llmReview.qualityFlags.length > 0 && <div><div className="text-xs font-semibold text-indigo-800 mb-1">Quality flags:</div><ul className="list-disc ml-5 text-sm text-indigo-900 space-y-1">{d.llmReview.qualityFlags.map(function (r, i) {
              return <li key={i}>{r}</li>;
            })}</ul></div>}</div>}<div className="text-[11px] text-slate-500 italic">{d.notes || ''}</div></ComprehensiveSection>;
  }

  // ─── CognitiveLoadSection ─────────────────────────────────────────────
  function CognitiveLoadSection(p) {
    var c = p.load;
    if (!c) return null;
    var b = c.breakdown || {};
    var ratioColor = c.ratio === null ? 'slate' : c.ratio >= 0.7 && c.ratio <= 1.4 ? 'emerald' : c.ratio >= 0.4 && c.ratio <= 2.0 ? 'amber' : 'rose';
    return <ComprehensiveSection id="audit-cognitiveLoad" icon="⏱️" title="Cognitive load / pacing" status={c.status}><div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4"><div className="p-3 bg-slate-50 rounded text-center"><div className="text-2xl font-bold text-slate-800">{c.claimedTotalMinutes + 'm'}</div><div className="text-xs text-slate-600">Claimed</div></div><div className="p-3 bg-slate-50 rounded text-center"><div className="text-2xl font-bold text-slate-800">{c.estimatedTotalMinutes + 'm'}</div><div className="text-xs text-slate-600">Estimated</div></div><div className={'p-3 rounded text-center bg-' + ratioColor + '-50 border border-' + ratioColor + '-200'}><div className={'text-2xl font-bold text-' + ratioColor + '-800'}>{c.ratio === null ? 'n/a' : c.ratio + 'x'}</div><div className={'text-xs text-' + ratioColor + '-700'}>Estimated / Claimed</div></div><div className="p-3 bg-slate-50 rounded text-center"><div className="text-xs font-bold text-slate-800 leading-tight pt-1">{'R: ' + b.reading + 'm · Q: ' + b.quiz + 'm · A: ' + b.activities + 'm'}</div><div className="text-[10px] text-slate-500 mt-1">{'Reading at ' + b.wpmAssumption + ' wpm'}</div></div></div>{
      // Per-segment breakdown
      Array.isArray(c.perSegment) && c.perSegment.length > 0 && <div className="mb-3"><div className="text-xs font-semibold text-slate-700 mb-1">Lesson plan segments:</div><ul className="space-y-0.5 text-sm text-slate-700">{c.perSegment.map(function (s, i) {
            return <li key={i} className="flex items-center justify-between gap-2"><span>{s.label}</span><span className={'font-mono text-xs ' + (s.claimedMinutes !== null ? 'text-slate-800' : 'text-slate-400 italic')}>{s.claimedMinutes !== null ? s.claimedMinutes + ' min' : '(no time given)'}</span></li>;
          })}</ul></div>}{c.recommendations && c.recommendations.length > 0 && <div className="p-3 bg-amber-50 border border-amber-200 rounded mb-3"><div className="text-xs font-semibold text-amber-900 mb-1">Heuristic recommendations:</div><ul className="list-disc ml-5 text-sm text-amber-900 space-y-1">{c.recommendations.map(function (r, i) {
            return <li key={i}>{r}</li>;
          })}</ul></div>}{c.llmReview && <div className="p-3 bg-indigo-50 border border-indigo-200 rounded mb-3"><div className="text-xs font-semibold text-indigo-900 mb-2 flex items-center gap-2"><span aria-hidden="true">🤖</span> Pacing review (AI)</div>{c.llmReview.narrative && <p className="text-sm text-indigo-900 mb-2">{c.llmReview.narrative}</p>}{c.llmReview.specificAdjustments && c.llmReview.specificAdjustments.length > 0 && <div><div className="text-xs font-semibold text-indigo-800 mb-1">Specific adjustments:</div><ul className="list-disc ml-5 text-sm text-indigo-900 space-y-1">{c.llmReview.specificAdjustments.map(function (r, i) {
              return <li key={i}>{r}</li>;
            })}</ul></div>}</div>}<div className="text-[11px] text-slate-500 italic">{c.notes || ''}</div></ComprehensiveSection>;
  }

  // ─── CulturalResponsivenessSection ────────────────────────────────────
  function CulturalResponsivenessSection(p) {
    var c = p.cr;
    if (!c) return null;
    return <ComprehensiveSection id="audit-culturalResponsiveness" icon="🤝" title="Cultural responsiveness" status={c.status}>{c.narrative && <p className="text-sm text-slate-800 mb-3 leading-relaxed">{c.narrative}</p>}{
      // Strengths
      Array.isArray(c.strengths) && c.strengths.length > 0 && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded mb-2"><div className="text-xs font-semibold text-emerald-900 mb-1">Strengths:</div><ul className="list-disc ml-5 text-sm text-emerald-900 space-y-1">{c.strengths.map(function (r, i) {
            return <li key={i}>{r}</li>;
          })}</ul></div>}{
      // Gaps
      Array.isArray(c.gaps) && c.gaps.length > 0 && <div className="p-3 bg-amber-50 border border-amber-200 rounded mb-2"><div className="text-xs font-semibold text-amber-900 mb-1">Gaps:</div><ul className="list-disc ml-5 text-sm text-amber-900 space-y-1">{c.gaps.map(function (r, i) {
            return <li key={i}>{r}</li>;
          })}</ul></div>}{
      // Additions (the actionable list)
      Array.isArray(c.additions) && c.additions.length > 0 && <div className="p-3 bg-indigo-50 border border-indigo-200 rounded mb-2"><div className="text-xs font-semibold text-indigo-900 mb-1">Suggested additions:</div><ul className="list-disc ml-5 text-sm text-indigo-900 space-y-1">{c.additions.map(function (r, i) {
            return <li key={i}>{r}</li>;
          })}</ul></div>}<div className="text-[11px] text-slate-500 italic mt-2">{c.notes || ''}</div></ComprehensiveSection>;
  }
  function ReadinessScoreCard(p) {
    var o = p.overall;
    if (!o) return null;
    var score = typeof o.score === 'number' ? o.score : 0;
    var dimEvaluated = typeof o.dimensionsEvaluated === 'number' ? o.dimensionsEvaluated : 0;

    // Empty-state: no comprehensive dimensions ran, render an informative
    // fallback rather than a misleading 0 / 100 score.
    if (dimEvaluated === 0) {
      return <div className="p-6 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 mb-8 text-center"><div className="text-4xl mb-2" aria-hidden="true">📊</div><div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Curriculum Readiness Score</div><div className="text-lg font-bold text-slate-700 mb-2">Not enough artifacts to compute</div><p className="text-sm text-slate-600 max-w-md mx-auto">Generate a few artifacts (analysis, glossary, quiz, sentence frames, etc.) before running the audit to get a meaningful readiness score.</p></div>;
    }

    // Color band by score
    var band, ringColor, bgColor, textColor;
    if (o.blockingIssues && o.blockingIssues.length > 0) {
      band = 'rose';
      ringColor = '#dc2626';
      bgColor = '#fef2f2';
      textColor = '#991b1b';
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
    var dimScores = o.perDimensionPercent || {};
    var dimLabels = {
      vocabulary: 'Vocab',
      engagement: 'Engagement',
      accessibility: 'Access',
      udl: 'UDL',
      accuracy: 'Accuracy'
    };
    return <div className="p-5 rounded-2xl border-2 mb-8 shadow-sm" style={{
      backgroundColor: bgColor,
      borderColor: ringColor
    }}> // Polish #2: Score circle removed — already rendered in the executive summary banner
      // above. This card now functions as the per-dimension chip strip + blocking-issues
      // detail panel that didn't fit in the summary banner.
      <div className="min-w-0"><div className="text-xs font-bold uppercase tracking-wider mb-3" style={{
          color: textColor,
          opacity: 0.8
        }}>Per-Dimension Breakdown</div> // Per-dimension status chips
        <div className="flex flex-wrap gap-2">{ALL_DIMENSIONS_FOR_RENDER.map(function (dim) {
            var dimData = (o.dimensionScores || {})[dim];
            if (!dimData) return null;
            var pct = dimScores[dim] || 0;
            var chipColor = dimData.status === 'Aligned' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : dimData.status === 'Not Aligned' ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-amber-100 text-amber-800 border-amber-300';
            return <div key={dim} className={'flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full border ' + chipColor}><span>{dimLabels[dim] || dim}</span><span className="font-bold">{pct + '%'}</span></div>;
          })}</div>{o.blockingIssues && o.blockingIssues.length > 0 && <div className="mt-3 p-2 bg-white border border-rose-300 rounded text-xs"><div className="font-bold text-rose-900 mb-1">🔴 Blocking issues (must fix before Pass):</div><ul className="list-disc ml-5 text-rose-900 space-y-1">{o.blockingIssues.map(function (b, i) {
              return <li key={i}><span className="font-semibold">{b.dimension + ': '}</span>{b.issue}</li>;
            })}</ul></div>}</div>{o.notes && <div className="mt-3 text-[11px] italic" style={{
        color: textColor,
        opacity: 0.65
      }}>{o.notes}</div>}</div>;
  }
  var ALL_DIMENSIONS_FOR_RENDER = ['standards', 'vocabulary', 'engagement', 'accessibility', 'udl', 'accuracy', 'differentiation', 'cognitiveLoad', 'culturalResponsiveness'];

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
    };else if (score === null) statusClr = {
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
    return <div className="p-5 rounded-2xl border-2 mb-6 shadow-md max-w-4xl mx-auto" style={{
      backgroundColor: statusClr.bg,
      borderColor: statusClr.ring
    }} role="region" aria-label={t("a11y.curriculum_audit_summary")}><div className="flex items-center gap-5 mb-3 flex-wrap">{
        // Score circle
        score !== null && dimEvaluated > 0 && <div className="relative flex-shrink-0" style={{
          width: '88px',
          height: '88px'
        }}><svg viewBox="0 0 88 88" style={{
            width: '88px',
            height: '88px'
          }} aria-hidden="true"><circle cx={44} cy={44} r={38} fill="none" stroke="#e2e8f0" strokeWidth={8} /><circle cx={44} cy={44} r={38} fill="none" stroke={statusClr.ring} strokeWidth={8} strokeDasharray={(Math.PI * 2 * 38).toFixed(2)} strokeDashoffset={(Math.PI * 2 * 38 * (1 - score / 100)).toFixed(2)} strokeLinecap="round" transform="rotate(-90 44 44)" /><text x={44} y={50} textAnchor="middle" fontSize={24} fontWeight={900} fill={statusClr.text} fontFamily="system-ui, sans-serif">{score}</text></svg></div>}<div className="flex-1 min-w-0"><div className="text-[11px] font-bold uppercase tracking-wider mb-0.5" style={{
            color: statusClr.text,
            opacity: 0.7
          }}>Curriculum Audit</div><div className="text-xl font-black mb-1" style={{
            color: statusClr.text
          }}>{score !== null && dimEvaluated > 0 ? overall.label || score + ' / 100' : dimEvaluated === 0 ? 'No comprehensive dimensions evaluated' : 'Audit summary'}</div><div className="text-xs" style={{
            color: statusClr.text,
            opacity: 0.8
          }}>{standardsReportCount > 0 ? standardsReportCount + ' standard' + (standardsReportCount === 1 ? '' : 's') + ' audited · ' : ''}{dimEvaluated + ' of 5 comprehensive dimension' + (dimEvaluated === 1 ? '' : 's') + ' evaluated'}{failedDims.length > 0 ? ' · ' + failedDims.length + ' failed to compute' : ''}</div></div>{
        // Apply fixes button
        typeof onApplyFixes === 'function' && (topRecs.length > 0 || dimEvaluated > 0) && <button type="button" onClick={onApplyFixes} className="flex-shrink-0 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2" title="Open Audit Remediator: review and apply fixes"><span aria-hidden="true">🛠️</span> Apply suggested fixes</button>}{
        // Plan S+ Audit↔Quiz bridge: "Generate Pre-Check on identified gaps".
        // Pulls priority gaps from the audit and seeds a Pre-Check Quiz with
        // them — closing the loop from "audit found prereq gaps" to "students
        // can practice those before the lesson lands."
        typeof p.onGeneratePreCheck === 'function' && topRecs.length > 0 && <button type="button" onClick={function () {
          p.onGeneratePreCheck(topRecs);
        }} className="flex-shrink-0 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2" title="Generate a Pre-Check Quiz that probes the prerequisites the audit identified as gaps. Students take the quiz before the lesson; missed concepts get just-in-time AI explainers."><span aria-hidden="true">🎯</span> Pre-Check from gaps</button>}</div>{
      // Failed dimensions warning
      failedDims.length > 0 && <div className="mt-2 p-2 bg-amber-50 border border-amber-300 rounded text-xs text-amber-900"><strong>{'⚠ ' + failedDims.length + ' dimension' + (failedDims.length === 1 ? '' : 's') + ' failed to compute: '}</strong>{failedDims.map(function (d) {
          return c[d] && c[d].notes ? d : d;
        }).join(', ')}. The audit ran but is incomplete; try regenerating.</div>}{
      // Top recommendations
      topRecs.length > 0 && <div className="mt-3"><div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{
          color: statusClr.text,
          opacity: 0.7
        }}>{'Top ' + topRecs.length + ' suggested fix' + (topRecs.length === 1 ? '' : 'es')}</div><ol className="space-y-1.5 ml-1">{topRecs.map(function (r, i) {
            var prClass = r.priority <= 0.5 ? 'bg-rose-100 text-rose-900 border-rose-300 hover:bg-rose-200' : r.priority <= 1.5 ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200' : 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200';
            // Polish #3: when the rec carries a dimensionKey, render the chip as an
            // anchor that smooth-scrolls to the matching dimension card. Falls back
            // to a plain span when no dimensionKey is available (e.g., generic blocking
            // issue with an unrecognized dimension label).
            var chipChildren = [<span key="lbl">{r.dimension}</span>, r.dimensionKey ? <span key="arr" aria-hidden="true" className="opacity-60"> ↓</span> : null];
            var chip = r.dimensionKey ? <a href={'#audit-' + r.dimensionKey} className={'flex-shrink-0 inline-flex items-center justify-center text-[10px] font-bold uppercase px-2 py-0.5 rounded border no-underline transition-colors ' + prClass} style={{
              minWidth: '90px',
              textAlign: 'center'
            }} title={'Jump to ' + r.dimension + ' card'} onClick={function (ev) {
              var el = document.getElementById('audit-' + r.dimensionKey);
              if (el) {
                ev.preventDefault();
                el.scrollIntoView({
                  behavior: 'smooth',
                  block: 'start'
                });
                // Brief flash to visually anchor the user's eye.
                el.style.transition = 'box-shadow 800ms ease-out';
                el.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.4)';
                setTimeout(function () {
                  el.style.boxShadow = '';
                }, 1200);
              }
            }}>{chipChildren}</a> : <span className={'flex-shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded border ' + prClass} style={{
              minWidth: '90px',
              textAlign: 'center'
            }}>{r.dimension}</span>;
            return <li key={i} className="flex items-start gap-2 text-sm">{chip}<span className="text-slate-800" style={{
                color: statusClr.text
              }}>{r.text}</span></li>;
          })}</ol></div>}</div>;
  }
  function FailedDimensionCard(p) {
    var d = p.data;
    var label = p.label;
    if (!d || !d.computeFailed) return null;
    return <div id={p.id || undefined} className="bg-amber-50 p-4 rounded-xl border border-amber-300 shadow-sm mb-6 scroll-mt-4"><div className="flex items-center gap-2 mb-2"><span aria-hidden="true" className="text-lg">⚠</span><h3 className="font-bold text-amber-900">{label + ' — could not be computed'}</h3><span className="ml-auto text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900">Failed</span></div>{d.notes && <p className="text-sm text-amber-900 mb-2">{d.notes}</p>}{d.error && <details className="text-xs text-amber-800"><summary className="cursor-pointer font-semibold">Show error</summary><pre className="mt-1 p-2 bg-amber-100 rounded overflow-x-auto whitespace-pre-wrap">{d.error}</pre></details>}</div>;
  }

  // Plan R+: N/A card for dimensions explicitly flagged as Not Applicable
  // (e.g., standards alignment when the teacher hasn't entered any target
  // standards, or the future cultural-responsiveness dimension when content
  // has no human-context surface area). Excluded from the readiness score.
  function NotApplicableCard(p) {
    var d = p.data;
    var label = p.label;
    if (!d || !d.notApplicable) return null;
    return <div id={p.id || undefined} className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-300 shadow-sm mb-6 scroll-mt-4"><div className="flex items-center gap-2 mb-2"><span aria-hidden="true" className="text-lg">➖</span><h3 className="font-bold text-slate-700">{label}</h3><span className="ml-auto text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">Not applicable</span></div>{d.reason && <p className="text-sm text-slate-600">{d.reason}</p>}</div>;
  }
  function ComprehensiveBlock(p) {
    var c = p.comp;
    if (!c) return null;
    return <div className="mt-8 pt-6 border-t border-slate-200 max-w-4xl mx-auto"><div className="mb-6"><h2 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-1">Per-Dimension Findings</h2><p className="text-sm text-slate-600">Detailed evidence and recommendations from each comprehensive audit dimension. Apply fixes from the summary panel above.</p></div>{c.overall && <ReadinessScoreCard overall={c.overall} />}{
      // Standards rendered first (most teacher-relevant)
      c.standards && (c.standards.computeFailed ? <FailedDimensionCard id="audit-standards" data={c.standards} label="Standards alignment" /> : c.standards.notApplicable ? <NotApplicableCard id="audit-standards" data={c.standards} label="Standards alignment" /> : <StandardsSection standards={c.standards} />)}{c.vocabulary && (c.vocabulary.computeFailed ? <FailedDimensionCard id="audit-vocabulary" data={c.vocabulary} label="Vocabulary fit" /> : <VocabularySection vocab={c.vocabulary} />)}{c.engagement && (c.engagement.computeFailed ? <FailedDimensionCard id="audit-engagement" data={c.engagement} label="Engagement variety" /> : <EngagementSection eng={c.engagement} />)}{c.accessibility && (c.accessibility.computeFailed ? <FailedDimensionCard id="audit-accessibility" data={c.accessibility} label="Content accessibility" /> : <AccessibilitySection access={c.accessibility} />)}{c.udl && (c.udl.computeFailed ? <FailedDimensionCard id="audit-udl" data={c.udl} label="UDL principles" /> : <UdlSection udl={c.udl} />)}{c.accuracy && (c.accuracy.computeFailed ? <FailedDimensionCard id="audit-accuracy" data={c.accuracy} label="Content accuracy" /> : <AccuracySection acc={c.accuracy} />)}{
      // Plan R+ new dimensions
      c.differentiation && (c.differentiation.computeFailed ? <FailedDimensionCard id="audit-differentiation" data={c.differentiation} label="Differentiation coverage" /> : <DifferentiationSection diff={c.differentiation} />)}{c.cognitiveLoad && (c.cognitiveLoad.computeFailed ? <FailedDimensionCard id="audit-cognitiveLoad" data={c.cognitiveLoad} label="Cognitive load / pacing" /> : c.cognitiveLoad.notApplicable ? <NotApplicableCard id="audit-cognitiveLoad" data={c.cognitiveLoad} label="Cognitive load / pacing" /> : <CognitiveLoadSection load={c.cognitiveLoad} />)}{c.culturalResponsiveness && (c.culturalResponsiveness.computeFailed ? <FailedDimensionCard id="audit-culturalResponsiveness" data={c.culturalResponsiveness} label="Cultural responsiveness" /> : c.culturalResponsiveness.notApplicable ? <NotApplicableCard id="audit-culturalResponsiveness" data={c.culturalResponsiveness} label="Cultural responsiveness" /> : <CulturalResponsivenessSection cr={c.culturalResponsiveness} />)}</div>;
  }
  function AlignmentReportView(props) {
    var t = props.t;
    var generatedContent = props.generatedContent;
    var comprehensive = generatedContent && generatedContent.data && generatedContent.data.comprehensive;
    var reports = generatedContent && generatedContent.data && Array.isArray(generatedContent.data.reports) ? generatedContent.data.reports : [];
    return <div className="space-y-8 max-w-4xl mx-auto h-full overflow-y-auto pr-2 pb-10">{
      // Executive summary banner — readiness score + top fixes + Apply button.
      comprehensive && <ExecutiveSummary comp={comprehensive} standardsReportCount={reports.length} onApplyFixes={props.onApplyFixes} onGeneratePreCheck={props.onGeneratePreCheck} />}{
      // Per-dimension findings (standards is now the first dimension card; the
      // legacy top-level reports[] block has been folded into comprehensive.standards).
      comprehensive && <ComprehensiveBlock comp={comprehensive} onApplyFixes={props.onApplyFixes} />}</div>;
  }
