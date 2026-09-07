const fs = require('fs');
const file = 'story_forge_source.jsx';
let s = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
function replace(a,b) { if(!s.includes(a)) throw new Error('Missing anchor: '+a.slice(0,100)); s=s.replace(a,b); }
function between(a,b,value) {const start=s.indexOf(a),end=s.indexOf(b,start);if(start<0||end<0)throw Error(a);s=s.slice(0,start)+value+s.slice(end);}
replace('// ── Reading level calculation ──',`// Authored content is shared by comic feedback, vocabulary coverage, and counts.
const getStoryForgeSectionText = (paragraph, dialogue = {}, comic = false) => [
  typeof paragraph?.text === 'string' ? paragraph.text : '',
  ...(comic ? ['speech', 'thought', 'sfx'].map(key => typeof dialogue[key] === 'string' ? dialogue[key] : '') : []),
].filter(text => text.trim()).join('\\n');

// Validate suggestions before offering a preview; never use AI output as the authored section list.
const normalizeStoryForgePlan = (data, comic = false) => {
  const items = comic ? data?.panels : data?.frames;
  if (!Array.isArray(items) || !items.length || items.length > MAX_DRAFT_PARAGRAPHS) throw new Error('Invalid plan size');
  return items.map(item => {
    const caption = comic ? item?.caption : item;
    if (typeof caption !== 'string' || !caption.trim() || caption.length > 5000) throw new Error('Invalid plan section');
    return { scaffoldFrame: caption.trim(), plotBeat: comic && PLOT_BEATS.some(beat => beat.value === item.beat) ? item.beat : '' };
  });
};
const mergeStoryForgePlan = (paragraphs, suggestions, ids) => {
  const next = paragraphs.map(paragraph => ({ ...paragraph }));
  suggestions.forEach((suggestion, index) => {
    const existing = next.find(paragraph => paragraph.id === ids[index]);
    if (existing) {
      existing.scaffoldFrame = suggestion.scaffoldFrame;
      if (!existing.plotBeat) existing.plotBeat = suggestion.plotBeat;
    } else if (!ids[index] && next.length < MAX_DRAFT_PARAGRAPHS) {
      next.push({ id: 'p-plan-' + Date.now() + '-' + index, text: '', ...suggestion });
    }
  });
  return next;
};

// ── Reading level calculation ──`);
replace("const contentSections = paragraphs.filter((p) => String(p?.text || '').trim()).length;", "const sectionText = p => getStoryForgeSectionText(p, (context.panelDialogue || {})[p?.id], layoutMode === 'comic');\n  const contentSections = paragraphs.filter((p) => sectionText(p).trim()).length;");
replace("const totalWords = paragraphs.reduce((sum, p) => sum + countWords(p?.text), 0);", "const totalWords = paragraphs.reduce((sum, p) => sum + countWords(sectionText(p)), 0);");
replace("addIssue(warnings, 'review', 'review-not-run'", "addIssue(blockers, 'review', 'review-not-run'");
replace("const hasText = String(paragraph?.text || paragraph?.scaffoldFrame || '').trim();", "const hasText = getStoryForgeSectionText(paragraph, dialogue, true).trim();");
replace("const t = tFunc || ((k) => k);", `const t = tFunc || ((k) => k);
  const ux = (key, fallback) => {
    const value = t('storyforge_updates.' + key);
    return typeof value === 'string' && value !== 'storyforge_updates.' + key ? value : fallback;
  };`);
replace("const [isProcessing, setIsProcessing] = useState(false);", `const [isProcessing, setIsProcessing] = useState(false);
  const [planProposal, setPlanProposal] = useState(null);
  const [showProjectHealth, setShowProjectHealth] = useState(false);
  const planStateRef = useRef('');
  const planRequestRef = useRef(0);
  const planPreviewRef = useRef(null);
  useEffect(() => () => { planRequestRef.current += 1; }, []);`);
replace("const [panelThumbnails, setPanelThumbnails]", "planStateRef.current = JSON.stringify({ isOpen, paragraphs, panelDialogue, panelDirections, artifactType });\n  const [panelThumbnails, setPanelThumbnails]");
replace("// ── Vocab usage tracking ──", `const authoredSections = useMemo(() => paragraphs.map(p => getStoryForgeSectionText(p, panelDialogue[p.id], layoutMode === 'comic')), [paragraphs, panelDialogue, layoutMode]);
  const authoredText = authoredSections.join('\\n\\n');
  // ── Vocab usage tracking ──`);
replace("const fullText = paragraphs.map(p => p.text).join(' ');\n    const usage = {};", "const fullText = authoredText;\n    const usage = {};");
replace("}, [paragraphs, vocabTerms]);\n\n  const vocabUsedCount", "}, [authoredText, vocabTerms]);\n\n  const vocabUsedCount");
replace("const totalWords = useMemo(() => paragraphs.reduce((sum, p) => sum + p.text.trim().split(/\\s+/).filter(Boolean).length, 0), [paragraphs]);", "const totalWords = useMemo(() => countWords(authoredText), [authoredText]);");
replace("const fullText = paragraphs.map(p => p.text).join(' ');\n    return computeReadingLevel(fullText);\n  }, [paragraphs]);", "if (language !== 'en' || countWords(authoredText) < 100) return null;\n    return computeReadingLevel(authoredText);\n  }, [authoredText, language]);");
replace("const generateScaffolds = async () => {\n    if (!onCallGemini) return;", `const generateScaffolds = async () => {
    if (!onCallGemini) { sfAnnounce(ux('ai_unavailable', 'AI tools are unavailable. You can keep writing and use the self-check.')); return; }
    const requestId = ++planRequestRef.current;
    const requestState = planStateRef.current;
    const sectionIds = paragraphs.map(p => p.id);
    setPlanProposal(null);`);
between("      if (isComicMode && Array.isArray(data.panels)) {", "    } catch (err) {\n      console.warn('Scaffold generation failed:'", `      const suggestions = normalizeStoryForgePlan(data, isComicMode);
      if (requestId !== planRequestRef.current) return;
      if (requestState !== planStateRef.current) {
        if (addToast) addToast(ux('plan_stale', 'Your draft changed. Generate a new plan to keep your latest edits.'), 'info');
        return;
      }
      setPlanProposal({ suggestions, sectionIds, signature: requestState });
      sfAnnounce(ux('plan_preview_ready', 'Plan suggestions are ready to preview. Your writing has not changed.'));
`);
replace("  // ── Help Me Write — AI coaching per paragraph ──", `  const applyPlanProposal = async () => {
    const proposal = planProposal;
    if (!proposal) return;
    setIsProcessing(true);
    try {
      if (proposal.signature !== planStateRef.current) {
        setPlanProposal(null);
        if (addToast) addToast(ux('plan_stale', 'Your draft changed. Generate a new plan to keep your latest edits.'), 'info');
        return;
      }
      if (!(await saveRevisionCheckpoint(ux('before_plan', 'Before applying plan')))) return;
      if (proposal.signature !== planStateRef.current) {
        setPlanProposal(null);
        if (addToast) addToast(ux('plan_stale', 'Your draft changed. Generate a new plan to keep your latest edits.'), 'info');
        return;
      }
      setParagraphs(current => mergeStoryForgePlan(current, proposal.suggestions, proposal.sectionIds));
      setScaffoldsGenerated(true);
      setIsDirty(true);
      setPlanProposal(null);
      sfAnnounce(ux('plan_applied', 'Plan applied. Your writing and dialogue were preserved.'));
    } finally { setIsProcessing(false); }
  };

  useEffect(() => { if (planProposal) planPreviewRef.current?.focus(); }, [planProposal]);

  // ── Help Me Write — AI coaching per paragraph ──`);
replace("const fullText = paragraphs.map((p, i) => `[Paragraph ${i + 1}] ${p.text}`).join('\\n\\n');", "const fullText = authoredSections.map((text, i) => `[${artifactType === 'comic' ? 'Panel' : 'Scene'} ${i + 1}] ${text}`).join('\\n\\n');");
replace("const ft = paragraphs.map(p => p.text).join(' ');", "const ft = authoredText;");
replace("const sample = paragraphs.find(p => termUsed(p.text, v.term))?.text.substring(0, 100) || null;", "const sample = authoredSections.find(text => termUsed(text, v.term))?.substring(0, 100) || null;");
replace("onClick={() => { setSelfAssessmentSubmitted(true); sfAnnounce(ta('a11y.storyforge_self_assessment_skipped_ai_grading_is_now')); }}", "onClick={() => { setSelfAssessmentSubmitted(true); sfAnnounce(ux('selfcheck_return', 'You can return to the self-check at any time.')); }}");
replace("              {/* ═══ Pre-grade Self-Assessment ═══ */}", `              {!gradingResult && selfAssessmentSubmitted && !isCurrentDraftReviewed && (
                <div role="status" className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                  <p className="text-sm text-indigo-900">{ux('review_choices', 'Complete a self-check or get AI feedback to continue. Your writing stays here if feedback is unavailable.')}</p>
                  <button type="button" onClick={() => setSelfAssessmentSubmitted(false)} className="mt-2 min-h-11 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-bold text-white">{ux('return_selfcheck', 'Return to self-check')}</button>
                </div>
              )}
              {/* ═══ Pre-grade Self-Assessment ═══ */}`);
replace("disabled={isProcessing || (!selfAssessmentSubmitted)}", "disabled={!onCallGemini || isProcessing || (!selfAssessmentSubmitted)}");
replace("onClick={generateScaffolds}\n                    disabled={isProcessing}", "onClick={generateScaffolds}\n                    disabled={!onCallGemini || isProcessing}");
replace("                  <button\n                    type=\"button\"\n                    onClick={() => setShowWritingTools", `                  <button type="button" aria-pressed={focusMode} onClick={() => { setFocusMode(!focusMode); setFocusParagraphIdx(0); }} className="min-h-11 rounded-full border border-indigo-300 px-4 py-2 text-xs font-bold text-indigo-800">{focusMode ? ux('all_scenes', 'All scenes') : ux('focus_writing', 'Focus on writing')}</button>
                  <button
                    type="button"
                    onClick={() => setShowWritingTools`);
replace("                  {showWritingTools && (", `              {!onCallGemini && <p role="status" className="text-xs text-slate-600">{ux('ai_unavailable', 'AI tools are unavailable. You can keep writing and use the self-check.')}</p>}
              {planProposal && (
                <section ref={planPreviewRef} tabIndex={-1} aria-labelledby="sf-plan-preview-title" className="rounded-2xl border-2 border-indigo-300 bg-indigo-50 p-4">
                  <h4 id="sf-plan-preview-title" className="font-bold text-indigo-900">{ux('plan_preview', 'Preview plan suggestions')}</h4>
                  <p className="mt-1 text-sm text-indigo-900">{ux('plan_preserves', 'Applying updates planning prompts only. Your scenes, writing, dialogue, and artwork stay intact. A checkpoint is saved first.')}</p>
                  <ol className="my-3 list-decimal space-y-2 pl-5 text-sm text-slate-800">{planProposal.suggestions.map((item, i) => <li key={i}>{item.scaffoldFrame}</li>)}</ol>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => void applyPlanProposal()} disabled={isProcessing} className="min-h-11 rounded-lg bg-indigo-700 px-4 py-2 font-bold text-white disabled:opacity-50">{ux('apply_plan', 'Apply plan')}</button>
                    <button type="button" onClick={() => setPlanProposal(null)} className="min-h-11 rounded-lg border border-slate-400 bg-white px-4 py-2 font-bold text-slate-800">{ux('keep_draft', 'Keep current plan')}</button>
                  </div>
                </section>
              )}
                  {showWritingTools && (`);
replace("onClick={() => setGenre(key)}", "onClick={() => setGenre(key)}\n                      aria-pressed={genre === key}");
replace("onClick={() => selectWritingView(key)}\n                          className=", "onClick={() => selectWritingView(key)}\n                          aria-pressed={writingView === key}\n                          className=");
// Put the fundamental format decision before title/genre; retain existing advanced assignment controls.
const artStart=s.indexOf('              {/* Artifact type picker */}');
const artEnd=s.indexOf('              {/* Vocab Terms */}',artStart);
const artifact=s.slice(artStart,artEnd);s=s.slice(0,artStart)+s.slice(artEnd);
replace('              {/* Title & Author */}',artifact+'              {/* Title & Author */}');
// Optional genre choices no longer dominate the initial viewport.
replace('              {/* Genre Picker */}\n              <div className=', '              {/* Genre Picker */}\n              <details data-sf-genre-options className=');
replace('                  <BookOpen size={16} /> Genre\n                </h4>', '                  <BookOpen size={16} /> Genre\n                </summary>');
const genreStart=s.indexOf('{/* Genre Picker */}');const genreEnd=s.indexOf('{/* Vocab Terms */}',genreStart);
let genreBlock=s.slice(genreStart,genreEnd).replace('<h4 className=', '<summary className=').replace(/<\/div>\s*$/, '</details>\n\n              ');
s=s.slice(0,genreStart)+genreBlock+s.slice(genreEnd);
// Accessible mobile step switcher and optional health disclosure.
replace('      {/* Workflow readiness */}', `      <div className="sf-mobile-workflow">
        <label htmlFor="sf-mobile-step" className="sr-only">{ux('choose_step', 'Choose a step')}</label>
        <select id="sf-mobile-step" value={phase} onChange={e => changePhase(e.target.value)}>{PHASES.map((p, i) => <option key={p} value={p} disabled={!canEnterPhase(p)}>{i + 1}. {phaseLabel(i)}</option>)}</select>
        <button type="button" aria-expanded={showProjectHealth} aria-controls="sf-project-health" onClick={() => setShowProjectHealth(v => !v)}>{ux('checklist', 'Checklist')}</button>
      </div>
      {/* Workflow readiness */}`);
replace('<div className="sf-project-health px-3 sm:px-6 pb-3">', '<div id="sf-project-health" data-expanded={showProjectHealth} className="sf-project-health px-3 sm:px-6 pb-3">');
replace('<section className="bg-slate-50 border-b', '<section className="sf-step-guide bg-slate-50 border-b');
replace('<style>{`', `<style>{\x60
        .sf-mobile-workflow{display:none}
        @media(max-width:639px){
          .sf-mobile-workflow{display:flex;gap:8px;padding:6px 12px;background:#fff;border-bottom:1px solid #cbd5e1;flex-shrink:0}
          .sf-mobile-workflow select{flex:1;min-width:0;border:1px solid #64748b;border-radius:8px;padding:8px;min-height:44px;color:#0f172a;background:#fff}
          .sf-mobile-workflow button{min-height:44px;padding:8px;color:#0f172a;border:1px solid #64748b;border-radius:8px;background:#fff}
          .sf-workflow-dashboard nav{display:none}
          .sf-project-health[data-expanded="false"]{display:none}
          .sf-project-health[data-expanded="true"]{padding-top:8px;max-height:25vh;overflow:auto}
          .sf-step-guide{padding:6px 12px}
          .sf-step-guide h2,.sf-step-guide p,.sf-step-guide .text-rose-600{display:none}
          .sf-step-guide #sf-phase-requirements{padding:6px 8px;font-size:12px}
          [data-sf-step-summary]{display:none}
          [data-sf-footer-action="back"]{flex:0 0 auto!important}
          [data-sf-footer-action="next"]{flex:1!important}
        }
`);
// Collapse nonessential analytics while retaining all features.
replace('              {/* Writing Analytics */}\n              <div className=', '              {/* Writing Analytics */}\n              <details data-sf-analytics className=');
replace('<h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">{t("headings.writing_analytics")}</h4>', '<summary className="cursor-pointer text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">{t("headings.writing_analytics")}</summary>');
const analyticsStart=s.indexOf('{/* Writing Analytics */}');const analyticsEnd=s.indexOf('              {isProcessing && (',analyticsStart);
let analytics=s.slice(analyticsStart,analyticsEnd);const lastClose=analytics.lastIndexOf('</div>');analytics=analytics.slice(0,lastClose)+'</details>'+analytics.slice(lastClose+6);s=s.slice(0,analyticsStart)+analytics+s.slice(analyticsEnd);
replace('{readingLevel?.sentences || 0}', "{authoredText.split(/[.!?]+/).filter(text => text.trim()).length}");
replace("{ta('a11y.storyforge_ui_reading_grade')}", "{ux('reading_estimate', 'Text complexity estimate')}");
between("                    {(() => {\n                      const target = gradeLevelToNumber(gradeLevel);", "                  </div>\n                )}", "                    <span> · {ux('estimate_note', 'Approximate English text complexity, not a writing quality score.')}</span>\n");
replace('                {/* Story Arc — emotional fortune curve', `                {!readingLevel && <p className="mt-2 text-xs text-slate-600">{ux('estimate_threshold', 'A complexity estimate is available for English drafts with at least 100 words.')}</p>}
                {/* Story Arc — emotional fortune curve`);
fs.writeFileSync(file,s);
// Existing Windows-sensitive assertions should not depend on checkout line endings.
const test='tests/story_forge_guided_flow.test.js';let ts=fs.readFileSync(test,'utf8');ts=ts.replace("readFileSync('story_forge_source.jsx', 'utf8');", "readFileSync('story_forge_source.jsx', 'utf8').replace(/\\r\\n/g, '\\n');");fs.writeFileSync(test,ts);
// New copy participates in the host's English fallback instead of requiring every locale to update atomically.
const english={};for(const match of s.matchAll(/ux\('([^']+)', '([^']+)'\)/g))english[match[1]]=match[2];
for(const p of ['ui_strings.js','desktop/web-app/public/ui_strings.js']){if(fs.existsSync(p)){const data=JSON.parse(fs.readFileSync(p,'utf8'));data.storyforge_updates={...data.storyforge_updates,...english};fs.writeFileSync(p,JSON.stringify(data,null,2)+'\n');}}
console.log('Story Forge source updated');
