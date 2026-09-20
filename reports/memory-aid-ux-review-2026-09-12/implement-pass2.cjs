const fs=require('fs'),file='memory_aid_source.jsx';let s=fs.readFileSync(file,'utf8');
const change=(old,next)=>{if(!s.includes(old))throw Error('Missing anchor: '+old.slice(0,100));s=s.replace(old,next);};
change("function MemoryAidFollowUp({ card, session, onChange, onSave, tr, saveEvidence }) {\n  const attempt = session.attempt;", `function MemoryAidFollowUp({ card, session, onChange, onSave, tr, saveEvidence }) {
  const attempt = session.attempt;
  const applicationRef = React.useRef(null);
  React.useEffect(() => {
    if (!session.resumeFollowUp || !applicationRef.current) return;
    const details = applicationRef.current;
    details.open = true;
    const summary = details.querySelector('summary');
    if (summary) summary.focus();
    if (typeof details.scrollIntoView === 'function') details.scrollIntoView({ block: 'start' });
  }, [session.resumeFollowUp, attempt.id]);`);
change("    <details><summary className=\"min-h-11 cursor-pointer py-2 font-bold text-teal-900\">{tr('application_title'", "    <details ref={applicationRef} data-memory-application><summary className=\"min-h-11 cursor-pointer py-2 font-bold text-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600\">{tr('application_title'");
change("if (stage !== 'idle' && headingRef.current && typeof headingRef.current.focus === 'function')", "if (stage !== 'idle' && !session?.resumeFollowUp && headingRef.current && typeof headingRef.current.focus === 'function')");
change("  const headingRef = React.useRef(null);", `  const headingRef = React.useRef(null);
  const cueRef = React.useRef(null);
  const previousSupportRef = React.useRef(null);
  React.useEffect(() => {
    const previous = previousSupportRef.current;
    if (stage === 'recall' && previous === 'none' && session?.supportMode === 'cue' && cueRef.current) cueRef.current.focus();
    previousSupportRef.current = stage === 'recall' ? session?.supportMode : null;
  }, [stage, session?.supportMode]);`);
change("<p className=\"text-[11px] font-black uppercase tracking-widest text-cyan-800\">{tr('practice_kicker'", "<p className=\"sr-only\">{tr('practice_kicker'");
change("<div hidden={unsupported} className=\"mt-4 rounded-2xl border border-cyan-200 bg-white p-4\">", "<div ref={cueRef} tabIndex={-1} aria-label={tr('practice_your_cue', 'Your memory cue')} hidden={unsupported} className=\"mt-4 rounded-2xl border border-cyan-200 bg-white p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-700\">");
change("onChange={() => onChange({ responseMode: id, response: '', selfCheckConfirmed: false })}", "onChange={() => onChange({ responseMode: id, selfCheckConfirmed: false })}");
change("        <label className=\"mt-3 block text-sm font-black text-slate-900\">{tr('practice_confidence_question'", `        {unsupported && <div className="mt-3"><button type="button" onClick={() => onChange({ supportMode: 'cue', selfCheckConfirmed: false })} aria-describedby={panelDomIdBase + '-cue-help'} className="min-h-11 rounded-xl border border-cyan-300 bg-white px-3 py-2 text-sm font-bold text-cyan-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-700">{tr('recall_show_cue', 'Show my cue')}</button><p id={panelDomIdBase + '-cue-help'} className="mt-1 text-xs leading-relaxed text-slate-600">{tr('recall_show_cue_help', 'Keeps your response and records this attempt as using a cue.')}</p></div>}
        {responseMode !== 'written' && response.trim() && <p className="mt-2 text-xs text-slate-600">{tr('recall_writing_kept', 'Your writing is kept in this open attempt if you switch back. It is not saved with a response made another way.')}</p>}
        <label className="mt-3 block text-sm font-black text-slate-900">{tr('practice_confidence_question'`);
change("supportMode: latest.supportMode, attempt: latest, followUpSaved: true", "supportMode: latest.supportMode, attempt: latest, followUpSaved: true, resumeFollowUp: true");
change("nextReviewDate: undefined, applicationResponse: undefined, applicationRevealed: false, applicationCheck: '', followUpSaved: false, followUpSaving: false,", "nextReviewDate: undefined, applicationResponse: undefined, applicationRevealed: false, applicationCheck: '', followUpSaved: false, followUpSaving: false, followUpError: false, resumeFollowUp: false,");
change('<header className="mb-5 rounded-3xl border border-teal-200 bg-gradient-to-br from-teal-50 via-white to-cyan-50 p-4 sm:p-5 shadow-sm">', '<header className={practiceIsolationActive ? "mb-3 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3" : "mb-5 rounded-3xl border border-teal-200 bg-gradient-to-br from-teal-50 via-white to-cyan-50 p-4 sm:p-5 shadow-sm"}>');
change('<p className="mb-1 text-xs font-black uppercase tracking-[0.18em] text-teal-800">', '<p hidden={practiceIsolationActive} className="mb-1 text-xs font-black uppercase tracking-[0.18em] text-teal-800">');
change('<p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-700">{practiceIsolationActive', '<p className={practiceIsolationActive ? "sr-only" : "mt-2 max-w-3xl text-sm leading-relaxed text-slate-700"}>{practiceIsolationActive');
change('<div className="memory-aid-no-print flex flex-wrap gap-2">', '<div hidden={practiceIsolationActive && !isTeacherMode} className="memory-aid-no-print flex flex-wrap gap-2">');
change('<div className="border-b border-slate-200 bg-slate-50 p-4 sm:p-5">', '<div className={unsupportedRecall ? "border-b border-slate-200 bg-slate-50 px-4 py-2" : "border-b border-slate-200 bg-slate-50 p-4 sm:p-5"}>');
change('<p className="text-[11px] font-black uppercase tracking-widest text-slate-500">{tr(\'card_target_n\'', '<p hidden={unsupportedRecall} className="text-[11px] font-black uppercase tracking-widest text-slate-500">{tr(\'card_target_n\'');
change("{unsupportedRecall ? tr('memory_target', 'Memory target') : card.target", "{unsupportedRecall ? tr('card_target_n', 'Memory target {n}', { n: index + 1 }) : card.target");
fs.writeFileSync(file,s);console.log('Improved application resume, recall support switching, draft preservation and mobile headings.');
