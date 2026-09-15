const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'../..'),file=path.join(root,'applied_challenge_source.jsx');let s=fs.readFileSync(file,'utf8');
function replace(a,b){if(!s.includes(a))throw Error('Missing '+a.slice(0,100));s=s.replace(a,b)}
function between(a,b){const start=s.indexOf(a),end=s.indexOf(b,start);if(start<0||end<0)throw Error(a);return s.slice(start,end).trim()}
let brief=between("      <section tabIndex={-1} data-studio-review='facts'", "      <section className='applied-challenge-section mb-5 rounded-3xl border border-indigo-200");
let ledger=between("        <section className='applied-challenge-section mt-5 rounded-2xl border border-cyan-200", "        <div className='mt-4 flex flex-wrap items-center gap-2 applied-challenge-no-print'>");
let stress=between("        <section className='applied-challenge-section mt-5 rounded-2xl border border-fuchsia-200", "        <section className='applied-challenge-section mt-5 rounded-2xl border border-blue-200");
let validation=between("        <section className='applied-challenge-section mt-5 rounded-2xl border border-blue-200", "        {!focusMode && synthesisPhases.length");
let feedback=between("        {data.feedback && <section", "        </fieldset>");
let teacher=between("        {(isTeacherMode || data.teacherComment)", "      </section>\n    </main>");
replace("label: 'Verified lesson evidence'", "label: 'Linked to a reviewed lesson fact'");
replace("description: 'Use only when the support connects to a teacher-verified lesson fact.'", "description: 'The source fact was reviewed. Explain your own connection; this does not verify your claim.'");
// A draft overview remains available, while learners start with one stage.
replace("  const currentPhase = visiblePhases[phaseIndex]?.id;",`  const currentPhase = visiblePhases[phaseIndex]?.id;
  const stageIndex = Math.max(0, APPLIED_CHALLENGE_STAGES.findIndex(stage => stage.phases.includes(currentPhase)));
  const currentStage = APPLIED_CHALLENGE_STAGES[stageIndex];
  const [reviewOpen, setReviewOpen] = React.useState(false);
  const [exportPreset, setExportPreset] = React.useState('response');
  const [artifactLink, setArtifactLink] = React.useState(data.workspace.artifactUrl);
  const [artifactError, setArtifactError] = React.useState('');
  const [exampleOpen, setExampleOpen] = React.useState(data.plan.supportLevel === 'example');
  const [promptOpen, setPromptOpen] = React.useState(false);
  const stageLabel = stage => tx('applied_challenge.stage.' + stage.id, stage.label);
  const goToStage = index => { setReviewOpen(false); setExampleOpen(false); setPromptOpen(false); goToPhase(APPLIED_CHALLENGE_STAGES[index].phases[0]); };
  const feedbackOutdated = appliedChallengeFeedbackOutdated(data);
  const ImageEditor = typeof window !== 'undefined' && window.AlloModules?.ImageAssetEditor;
  const imageTools = typeof window !== 'undefined' && window.AlloModules?.ImageAssetTools;
  const [visualBusy, setVisualBusy] = React.useState(false);
  const [visualError, setVisualError] = React.useState('');
  const [visualEditor, setVisualEditor] = React.useState(null);
  const visualToken = React.useRef(0);
  React.useEffect(() => () => { visualToken.current++; }, [resourceId, isTeacherMode, props.previewMode]);
  const visual = data.visual;
  const updateVisual = patch => commitField('visual', current => ({ ...normalizeAppliedChallengeVisual(current), ...patch, reviewed: patch.reviewed === true }));
  const generateVisual = async () => {
    if (!isTeacherMode || !props.callImagen || visualBusy || !visual.purpose.trim()) return;
    const token = ++visualToken.current; setVisualBusy(true); setVisualError('');
    try {
      const result = await props.callImagen('Create an instructional scenario illustration. No answer, proposed solution, data labels, quantities, or invented research results. Show only the supplied situation. Context: ' + data.brief.context + '\\nInstructional purpose: ' + visual.purpose, '4:3');
      if (token !== visualToken.current) return;
      const image = normalizeAppliedChallengeVisual({ image: result?.dataUrl || result?.url || result }).image;
      if (!image) throw Error('No usable image');
      updateVisual({ image, alt: '', reviewed: false, source: 'generated' });
    } catch (_) { if (token === visualToken.current) setVisualError(tx('applied_challenge.visual.failed', 'The illustration could not be created. Your challenge is ready to use without it.')); }
    finally { if (token === visualToken.current) setVisualBusy(false); }
  };`);
// Function declarations below are reached only during events, after commitField initialization.
replace("  const [ledgerExpanded, setLedgerExpanded] = React.useState(!compactScope || data.evidenceLedger.length > 0);", "  const [ledgerExpanded, setLedgerExpanded] = React.useState(true);");
replace("  const [checksExpanded, setChecksExpanded] = React.useState(!compactScope || data.validationCycles.length > 0);", "  const [checksExpanded, setChecksExpanded] = React.useState(true);");
replace("    const label = appliedChallengePhaseLabel(phase, data.family, t);", "    const label = appliedChallengePhaseLabel(phase, data.family, t).replace(/^\\d+\\.\\s*/, '');");
replace("aria-labelledby={headingId} value={data.workspace[phase.id]}","aria-labelledby={headingId} aria-describedby={headingId + '-prompt'} value={data.workspace[phase.id]}");
replace("<p className='mt-1 text-xs leading-relaxed text-slate-600'>{data.supports.phasePrompts[phase.id]}</p>","<p id={headingId + '-prompt'} className='mt-1 text-sm leading-relaxed text-slate-600'>{data.supports.phasePrompts[phase.id]}</p>");
replace("    return <article key={phase.id}","    return <article key={phase.id}");
replace("<p className='text-sm font-bold text-slate-900'>{item.text}</p>","<p className='text-sm font-bold text-slate-900'>{item.text}</p>\n            {entry.needsReview && <p className='mt-2 text-sm text-amber-900'>{tx('applied_challenge.self_check.changed', 'This requirement changed or was rated in an older version. Review it again; your previous note is kept below.')}</p>}");
// Keep an actual source connection in every verified row.
ledger=ledger.replace("<div className='grid gap-3 lg:grid-cols-2'>",`<div className='grid gap-3 lg:grid-cols-2'>
                    <label className='block text-sm font-bold text-slate-700 lg:col-span-2'>{tx('applied_challenge.ledger.link_fact', 'Link a lesson fact')}
                      <select aria-label={_apsFill(tx('applied_challenge.ledger.link_fact_aria', 'Evidence row {n} source fact'), { n: rowNumber })} className='mt-1 min-h-11 w-full min-w-0 max-w-full rounded-xl border border-slate-300 bg-white p-2 text-sm' value={row.factId} onChange={event => { const fact = data.brief.factSources.find(item => item.id === event.target.value); updateEvidenceLedgerRow(row.id, { factId: fact?.id || '', factRevision: fact?.revision || '', status: fact && data.brief.factVerified ? 'verified' : 'needs-check' }); }}>
                        <option value=''>{tx('applied_challenge.ledger.no_link', 'No source fact linked')}</option>
                        {data.brief.factSources.map((fact, index) => <option key={fact.id} value={fact.id}>{index + 1}. {fact.text}</option>)}
                      </select>
                      {row.factId && <span className='mt-2 block text-sm font-normal'>{data.brief.factSources.find(item => item.id === row.factId)?.text || tx('applied_challenge.ledger.removed_fact', 'This source fact changed or was removed. Choose a current fact.')}</span>}
                    </label>`);
ledger=ledger.replace("disabled={id === 'verified' && !data.brief.factVerified}","disabled={id === 'verified' && (!data.brief.factVerified || !data.brief.factSources.some(fact => fact.id === row.factId && fact.revision === row.factRevision))}");
ledger=ledger.replace("{tx('applied_challenge.ledger.heading', 'Evidence & decision ledger')}","{organizerHeading}");
ledger=ledger.replace("{tx('applied_challenge.ledger.note', 'Optional organizer: connect each important claim or option to support, label its certainty honestly, and keep a tradeoff or uncertainty visible.')}","{organizerPrompt}");
// The status follows the evidence, not an unreviewed claim.
ledger=ledger.replace("'Verified lesson evidence'","'Linked to a reviewed lesson fact'");
feedback=feedback.replace("<div className='flex flex-wrap items-center justify-between gap-2'>",`{feedbackOutdated && <p role='status' className='mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-950'>{tx('applied_challenge.feedback.earlier', 'Feedback for an earlier draft or brief. Keep it in view while you revise, or request a new review.')}</p>}
          <div className='flex flex-wrap items-center justify-between gap-2'>`);
feedback=feedback.replace("<span className='rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-950'>{appliedChallengeFeedbackStatusLabel(data.feedback.status, t)}</span>","{!feedbackOutdated && <span className='rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-950'>{appliedChallengeFeedbackStatusLabel(data.feedback.status, t)}</span>}");
const marker="  if (!resourceActive) return";const end=s.indexOf(marker);if(end<0)throw Error(marker);
s=s.slice(0,end)+`
  const organizerCopy = {
    investigate: ['Evidence plan', 'Connect a research question to evidence you need, a feasible method, and a limit.'],
    design: ['Design comparison', 'Compare possible designs using a lesson fact, a constraint, and a likely failure point.'],
    decide: ['Compare the options', 'Use the same criteria for each option. Link evidence and keep the tradeoff visible.'],
    propose: ['Plan and assumptions', 'Connect an action to the need it serves, its supporting evidence, and a resource assumption.'],
    explore: ['Reasons and alternatives', 'Compare positions, their supporting reasons, and a counterexample or unresolved question.'],
  }[data.family];
  const organizerHeading = tx('applied_challenge.organizer.' + data.family + '.heading', organizerCopy[0]);
  const organizerPrompt = tx('applied_challenge.organizer.' + data.family + '.prompt', organizerCopy[1]);
  const renderBrief = () => (${brief});
  const renderLedger = () => (${ledger});
  const renderStress = () => (${stress});
  const renderValidation = () => (${validation});
  const renderFeedback = () => (<>${feedback}</>);
  const phase = id => visiblePhases.find(item => item.id === id);
  const field = id => phase(id) ? renderWorkspacePhase(phase(id)) : null;
  const details = (label, children, open = false) => <details className='aps-details mt-4 rounded-xl border border-slate-200 bg-white p-4' open={open || undefined}><summary className='min-h-11 cursor-pointer text-sm font-bold text-slate-800'>{label}</summary><div className='mt-3 space-y-4'>{children}</div></details>;
  const printPreset = () => {
    const preset = exportPreset === 'teacher' && !isTeacherMode ? 'response' : exportPreset;
    const printable = { ...generatedContent, data: { ...data, appliedChallengeExportPreset: preset } };
    if (typeof onPrint === 'function') { try { if (onPrint(printable, { worksheet: preset === 'paper', teacherKey: false }) !== false) return; } catch (_) {} }
    const popup = window.open('', '_blank');
    if (!popup) { addToast(tx('applied_challenge.export.popup', 'Allow the preview window, then try again.'), 'info'); return; }
    popup.document.open(); popup.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Applied Problem Solving</title></head><body>' + renderAppliedChallengePreset(data, preset, t) + '</body></html>'); popup.document.close();
  };
  const renderReference = () => <aside className='aps-reference min-w-0 rounded-2xl bg-slate-50 p-4' aria-label={tx('applied_challenge.reference.heading', 'Challenge reference')}>
    <h2 className='text-base font-bold text-slate-900'>{tx('applied_challenge.reference.heading', 'Challenge reference')}</h2>
    {data.plan.learningTarget && <p className='mt-2 text-sm text-slate-700'>{data.plan.learningTarget}</p>}
    {details(tx('applied_challenge.reference.facts', 'Lesson ideas'), <><p className='text-sm text-slate-600'>{data.brief.factVerified ? tx('applied_challenge.reference.reviewed', 'Source facts reviewed by your teacher. Your connections are your own reasoning.') : tx('applied_challenge.reference.pending', 'These source statements are awaiting teacher review.')}</p><ol className='list-decimal space-y-3 pl-5 text-sm'>{data.brief.factSources.map(fact => <li key={fact.id}>{fact.text}{fact.sourceLocation && <span className='mt-1 block text-xs text-slate-600'>{fact.sourceLocation}</span>}</li>)}</ol></>)}
    {details(tx('applied_challenge.reference.criteria', 'What your response needs'), <ul className='list-disc space-y-2 pl-5 text-sm'>{data.brief.criteria.map((item, index) => <li key={index}>{item}</li>)}</ul>)}
    {details(tx('applied_challenge.reference.limits', 'Limits and unknowns'), <><ul className='list-disc space-y-2 pl-5 text-sm'>{[...data.brief.constraints, ...data.brief.openQuestions].map((item, index) => <li key={index}>{item}</li>)}</ul>{data.plan.materials && <p className='text-sm'>{data.plan.materials}</p>}</>)}
    {details(tx('applied_challenge.reference.full', 'Full challenge brief'), <><p className='text-sm'>{data.brief.context}</p><p className='text-sm'>{data.brief.role} · {data.brief.audience}</p><p className='text-sm'>{data.brief.evidenceBoundary}</p></>)}
    {visual.image && visual.alt.trim() && visual.reviewed && <figure className='mt-4'><img src={visual.image} alt={visual.alt} className='max-h-72 w-full rounded-xl object-contain' /><figcaption className='mt-2 text-sm text-slate-600'>{visual.purpose}</figcaption></figure>}
  </aside>;
  const renderHelp = () => <section className='applied-challenge-no-print mt-4 border-t border-slate-200 pt-4' aria-label={tx('applied_challenge.help.heading', 'Support for this step')}>
    <div className='flex flex-wrap gap-2'>
      <button type='button' aria-expanded={promptOpen} aria-controls='aps-thinking-prompt' onClick={() => setPromptOpen(!promptOpen)} className='aps-button'>{tx('applied_challenge.help.prompt', 'Show a thinking prompt')}</button>
      {data.supports.parallelExample.move && <button type='button' aria-expanded={exampleOpen} aria-controls='aps-parallel-example' onClick={() => setExampleOpen(!exampleOpen)} className='aps-button'>{tx('applied_challenge.help.example', 'See a parallel example')}</button>}
      {typeof callGemini === 'function' && <button type='button' onClick={requestHint} disabled={!!busy || isProcessing} className='aps-button'>{busy === 'hint' ? tx('applied_challenge.workspace.hint_busy', 'Thinking of one hint...') : tx('applied_challenge.workspace.hint', 'Ask for one hint')}</button>}
    </div>
    <div id='aps-thinking-prompt' hidden={!promptOpen} className='mt-3 rounded-xl bg-indigo-50 p-4 text-sm text-indigo-950'>{data.supports.phasePrompts[hintPhase]}{currentStage.id === 'understand' && data.supports.frameStarter && <p className='mt-3'>{data.supports.frameStarter}</p>}</div>
    <div id='aps-parallel-example' hidden={!exampleOpen} className='mt-3 rounded-xl bg-indigo-50 p-4 text-sm text-indigo-950'><h3 className='font-bold'>{data.supports.parallelExample.context}</h3><p className='mt-2'>{data.supports.parallelExample.move}</p><p className='mt-2'>{data.supports.parallelExample.whyItHelps}</p></div>
    {data.coachHint && <p role='status' className='mt-3 rounded-xl bg-violet-50 p-4 text-sm text-violet-950'>{data.coachHint}</p>}
  </section>;
  const renderStage = stage => <section key={stage.id} className='aps-stage min-w-0 space-y-4' aria-labelledby={'aps-stage-' + stage.id}>
    <h2 id={'aps-stage-' + stage.id} className='text-xl font-bold text-slate-900'>{stageLabel(stage)}</h2>
    {stage.id === 'understand' && <>
      <p className='text-sm leading-relaxed text-slate-700'>{data.brief.context}</p>
      {data.brief.drivingQuestion && <div className='rounded-xl bg-orange-50 p-4 text-sm text-orange-950'><p>{data.brief.drivingQuestion}</p><button type='button' onClick={() => updateWorkspace('workingQuestion', data.brief.drivingQuestion)} className='aps-button mt-3'>{tx('applied_challenge.question.use', 'Use this question')}</button></div>}
      {!data.brief.drivingQuestion && <p className='text-sm text-slate-700'>{data.brief.seedDirection}</p>}
      {field('workingQuestion')}
      {phase('stakeholders') && details(tx('applied_challenge.more.people', 'People and constraints'), field('stakeholders'))}
    </>}
    {stage.id === 'explore' && <>{field('possibilities')}{data.plan.visualMode !== 'none' && details(organizerHeading, renderLedger(), data.evidenceLedger.length > 0)}{details(tx('applied_challenge.more.reasoning', 'Evidence, assumptions, and tradeoffs'), <>{field('evidence')}{field('assumptions')}{field('tradeoffs')}</>)}</>}
    {stage.id === 'build' && <>{field('response')}{details(tx('applied_challenge.artifact.heading', 'Add a sketch, model, or recorded explanation'), <>
      <p className='text-sm text-slate-600'>{tx('applied_challenge.artifact.note', 'Link your work and describe the reasoning it shows. Check that your teacher can access the link. A written explanation also works.')}</p>
      <label className='block text-sm font-bold'>{tx('applied_challenge.artifact.url', 'Link to my work')}<input type='url' value={artifactLink} onChange={event => { setArtifactLink(event.target.value); setArtifactError(''); }} onBlur={() => { if (artifactLink.trim() && !appliedChallengeSafeUrl(artifactLink)) { setArtifactError(tx('applied_challenge.artifact.invalid', 'Use a complete https:// or http:// link.')); return; } updateWorkspace('artifactUrl', artifactLink); }} className='mt-2 min-h-11 w-full min-w-0 rounded-xl border border-slate-300 p-3 text-base' /></label>
      {artifactError && <p role='alert' className='text-sm text-rose-800'>{artifactError}</p>}
      <label className='block text-sm font-bold'>{tx('applied_challenge.artifact.description', 'Explanation of my work')}<AcTextarea value={data.workspace.artifactDescription} onChange={event => updateWorkspace('artifactDescription', event.target.value)} rows={4} maxLength={4000} className='mt-2 w-full rounded-xl border border-slate-300 p-3 text-base' /></label>
    </>)}</>}
    {stage.id === 'check' && <>
      <p className='text-sm text-slate-600'>{tx('applied_challenge.check.intro', 'Compare a strong alternative, ask for feedback, or try a small test. Record what you found, or what remains unchecked.')}</p>
      {field('testReflection')}
      {details(tx('applied_challenge.check.criteria', 'Check against the success criteria'), renderSelfCheck())}
      {details(tx('applied_challenge.check.trail', 'Plan and record a detailed check'), renderValidation(), data.validationCycles.length > 0)}
      {typeof callGemini === 'function' && details(tx('applied_challenge.check.ai', 'Ask AI to challenge my reasoning'), <>{renderStress()}<button type='button' onClick={requestFeedback} disabled={!!busy || isProcessing} className='aps-button'>{busy === 'feedback' ? tx('applied_challenge.feedback.busy', 'Reviewing your reasoning...') : tx('applied_challenge.feedback.request', 'Get strengths-first AI feedback')}</button>{!appliedChallengeFeedbackReady(data).ok && <p className='text-sm text-slate-600'>{readyReason(appliedChallengeFeedbackReady(data))}</p>}</>)}
      {renderFeedback()}{field('revision')}
    </>}
    {stage.id === 'reflect' && <>{field('transferReflection')}<p className='text-sm text-slate-600'>{tx('applied_challenge.reflect.note', 'Explain where the same lesson idea could help in a new situation. Your final review brings your reasoning together.')}</p></>}
  </section>;
  if (!resourceActive) return <div role='status' className='p-6 text-sm text-slate-600'>{tx('applied_challenge.preparing', 'Preparing Applied Challenge Studio...')}</div>;
  return <main id='applied-challenge-print-root' className='applied-challenge-root mx-auto w-full max-w-6xl p-3 sm:p-6' aria-labelledby='applied-challenge-title'>
    <style>{\`
      .applied-challenge-root{overflow-wrap:anywhere;color:#0f172a}.applied-challenge-root *{box-sizing:border-box}.applied-challenge-root select{min-width:0;max-width:100%;width:100%}.applied-challenge-root textarea,.applied-challenge-root input{font-size:16px}.applied-challenge-root .aps-button{min-height:44px;padding:9px 14px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;color:#334155;font-size:14px;font-weight:600}.applied-challenge-root .aps-button:disabled{opacity:.5}.applied-challenge-root [aria-current=step]{background:#fff1e8;border-color:#c2410c;color:#9a3412}.applied-challenge-root .applied-challenge-print-text{display:none}.applied-challenge-root .aps-grid{display:grid;grid-template-columns:minmax(0,1fr) 270px;gap:24px}.applied-challenge-root .aps-primary{background:#9a3412;color:#fff;border-color:#9a3412}.applied-challenge-root summary{padding:10px 0}.applied-challenge-root button:focus-visible,.applied-challenge-root summary:focus-visible,.applied-challenge-root select:focus-visible,.applied-challenge-root input:focus-visible{outline:2px solid #c2410c;outline-offset:3px}@media(max-width:760px){.applied-challenge-root .aps-grid{grid-template-columns:minmax(0,1fr)}.applied-challenge-root .aps-reference{order:2}}
      @media print{.applied-challenge-no-print,.studio-sharing{display:none!important}.applied-challenge-root textarea{display:none!important}.applied-challenge-root .applied-challenge-print-text{display:block;white-space:pre-wrap}.applied-challenge-root details>*{display:block!important}.applied-challenge-root .aps-grid{display:block}}
    \`}</style>
    <header className='mb-5 rounded-2xl border border-orange-200 bg-white p-5'>
      <div className='flex flex-wrap items-start justify-between gap-3'><div className='min-w-0'><p className='mb-2 text-sm font-semibold text-orange-800'>{tx('applied_challenge.product_name', 'Applied Problem Solving')}</p>{isTeacherMode && isEditing ? <input aria-label={tx('applied_challenge.aria.title', 'Challenge title')} value={data.title} onChange={event => commitField('title', event.target.value)} className='w-full rounded-xl border p-2 text-xl' /> : <h1 id='applied-challenge-title' className='text-2xl font-bold text-slate-900'>{data.title}</h1>}<p className='mt-2 text-sm text-slate-600'>{data.brief.deliverable}</p></div>
      {isTeacherMode && <button type='button' className='aps-button applied-challenge-no-print' onClick={() => setIsEditing(!isEditing)}>{isEditing ? tx('applied_challenge.teacher.done', 'Done editing') : tx('applied_challenge.teacher.edit', 'Edit challenge brief')}</button>}</div>
      {ReadAloud && <ReadAloud resource={generatedContent} referenceResource={props.referenceResource} isTeacherMode={isTeacherMode} allowGenerate={isTeacherMode && !props.previewMode} handleNoteUpdate={handleNoteUpdate} callGemini={callGeminiProp} addToast={addToast} t={t} voiceSpeed={props.voiceSpeed} voiceVolume={props.voiceVolume} stopPlayback={props.stopPlayback} />}
      {SharingCheck && isTeacherMode && <SharingCheck resource={generatedContent} t={t} />}
    </header>
    {isTeacherMode && learnerReadOnly ? <>
      <p className='mb-4 rounded-xl bg-orange-50 p-4 text-sm text-orange-950'>{tx('applied_challenge.teacher.preview_note', 'Review the learning target, facts, and supports, then use Student preview to try the five-stage workspace.')}</p>
      {renderBrief()}
      {details(tx('applied_challenge.teacher.plan', 'Learning target and task settings'), <>
        {['learningTarget', 'availableTime', 'materials'].map(key => <label key={key} className='block text-sm font-bold'>{tx('applied_challenge.plan.' + key, { learningTarget: 'Lesson idea to apply', availableTime: 'Available time', materials: 'Available materials and limits' }[key])}<AcTextarea value={data.plan[key]} onChange={event => commitField('plan', { ...data.plan, [key]: event.target.value })} rows={2} className='mt-2 w-full rounded-xl border p-3' /></label>)}
        <label className='block text-sm font-bold'>{tx('applied_challenge.plan.support', 'Starting support')}<select value={data.plan.supportLevel} onChange={event => commitField('plan', { ...data.plan, supportLevel: event.target.value })} className='mt-2 min-h-11 rounded-xl border p-2'><option value='prompt'>{tx('applied_challenge.plan.prompt', 'Thinking prompts available')}</option><option value='example'>{tx('applied_challenge.plan.example', 'Start with a parallel example')}</option><option value='independent'>{tx('applied_challenge.plan.independent', 'Independent start; help stays available')}</option></select></label>
        <label className='block text-sm font-bold'>{tx('applied_challenge.panel.ai_role', 'Who frames the problem?')}<select value={data.agencyMode} onChange={event => commitField('agencyMode', event.target.value)} className='mt-2 min-h-11 rounded-xl border p-2'>{Object.keys(APPLIED_CHALLENGE_AGENCY_MODES).map(id => <option value={id} key={id}>{appliedChallengeAgencyText(id, 'label', t)}</option>)}</select></label>
        <label className='block text-sm font-bold'>{tx('applied_challenge.panel.depth', 'Challenge depth')}<select value={data.scope} onChange={event => commitField('scope', event.target.value)} className='mt-2 min-h-11 rounded-xl border p-2'>{Object.keys(APPLIED_CHALLENGE_SCOPES).map(id => <option value={id} key={id}>{appliedChallengeScopeText(id, 'label', t)}</option>)}</select></label>
        <label className='block text-sm font-bold'>{tx('applied_challenge.panel.family', 'Challenge family')}<select value={data.family} onChange={event => commitField('family', event.target.value)} className='mt-2 min-h-11 rounded-xl border p-2'>{Object.keys(APPLIED_CHALLENGE_FAMILIES).map(id => <option value={id} key={id}>{appliedChallengeFamilyText(id, 'label', t)}</option>)}</select></label>
        <p className='text-sm text-slate-600'>{data.fitReason}</p>
      </>)}
      {details(tx('applied_challenge.teacher.source', 'Review source connections'), <>
        <p className='text-sm text-slate-600'>{tx('applied_challenge.teacher.excerpt_note', 'This excerpt was available during generation. It may cover only part of a long lesson.')}</p><pre className='whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm'>{data.sourceExcerpt}</pre>
        {data.brief.factSources.map((fact, index) => <section key={fact.id} className='rounded-xl border p-3'><p className='text-sm font-bold'>{fact.text}</p>{['sourceQuote', 'sourceLocation'].map(key => <label key={key} className='mt-2 block text-sm'>{tx('applied_challenge.source.' + key, key === 'sourceQuote' ? 'Supporting source excerpt' : 'Source location')}<AcTextarea value={fact[key]} onChange={event => updateBrief({ factSources: data.brief.factSources.map(item => item.id === fact.id ? { ...item, [key]: event.target.value } : item), factVerified: false })} rows={2} className='mt-1 w-full rounded-xl border p-2' /></label>)}</section>)}
      </>)}
      {details(tx('applied_challenge.teacher.supports', 'Edit prompts and parallel example'), <>
        {['context', 'move', 'whyItHelps'].map(key => <label key={key} className='block text-sm'>{tx('applied_challenge.example.' + key, { context: 'Parallel example context', move: 'Reasoning move', whyItHelps: 'What to notice' }[key])}<AcTextarea value={data.supports.parallelExample[key]} onChange={event => updateSupports({ parallelExample: { ...data.supports.parallelExample, [key]: event.target.value } })} rows={3} className='mt-2 w-full rounded-xl border p-3' /></label>)}
        {visiblePhases.map(item => <label key={item.id} className='block text-sm'>{appliedChallengePhaseLabel(item, data.family, t)}<AcTextarea value={data.supports.phasePrompts[item.id]} onChange={event => updateSupports({ phasePrompts: { ...data.supports.phasePrompts, [item.id]: event.target.value } })} rows={2} className='mt-2 w-full rounded-xl border p-3' /></label>)}
      </>)}
      {details(tx('applied_challenge.visual.heading', 'Visual support'), <>
        <label className='flex items-center gap-2 text-sm'><input type='checkbox' checked={data.plan.visualMode === 'organizer'} onChange={event => commitField('plan', { ...data.plan, visualMode: event.target.checked ? 'organizer' : 'none' })} />{tx('applied_challenge.visual.organizer', 'Offer an editable organizer matched to this challenge')}</label>
        <p className='text-sm text-slate-600'>{tx('applied_challenge.visual.optional', 'A scenario illustration is optional. It must support understanding without supplying the solution or inventing evidence.')}</p>
        <label className='block text-sm font-bold'>{tx('applied_challenge.visual.purpose', 'What should the illustration help learners understand?')}<AcTextarea value={visual.purpose} onChange={event => updateVisual({ purpose: event.target.value })} rows={2} className='mt-2 w-full rounded-xl border p-3' /></label>
        <button type='button' className='aps-button' disabled={!props.callImagen || !visual.purpose.trim() || visualBusy} onClick={generateVisual}>{visualBusy ? tx('applied_challenge.visual.creating', 'Creating illustration…') : tx('applied_challenge.visual.create', 'Generate optional illustration')}</button>
        {visualError && <p role='alert' className='text-sm text-rose-800'>{visualError}</p>}
        {visual.image && <><img src={visual.image} alt={visual.alt || tx('applied_challenge.visual.unreviewed', 'Unreviewed scenario illustration')} className='max-h-72 max-w-full rounded-xl object-contain' /><label className='block text-sm font-bold'>{tx('applied_challenge.visual.alt', 'Image description')}<AcTextarea value={visual.alt} onChange={event => updateVisual({ alt: event.target.value })} rows={3} className='mt-2 w-full rounded-xl border p-3' /></label><div className='flex flex-wrap gap-2'><button type='button' className='aps-button' disabled={!visual.alt.trim()} aria-pressed={visual.reviewed} onClick={() => updateVisual({ reviewed: !visual.reviewed })}>{visual.reviewed ? tx('applied_challenge.visual.unapprove', 'Mark for re-review') : tx('applied_challenge.visual.approve', 'Approve description and illustration')}</button>{ImageEditor && visual.image.startsWith('data:') && <button type='button' className='aps-button' onClick={() => setVisualEditor(visual.image)}>{tx('applied_challenge.visual.crop', 'Fit or crop illustration')}</button>}<button type='button' className='aps-button' onClick={() => { visualToken.current++; setVisualBusy(false); updateVisual({ image: '', alt: '', reviewed: false }); }}>{tx('applied_challenge.visual.remove', 'Remove illustration')}</button></div></>}
        {visualEditor && ImageEditor && <ImageEditor sourceDataUrl={visualEditor} onApply={result => { updateVisual({ image: result.dataUrl }); setVisualEditor(null); }} onCancel={() => setVisualEditor(null)} />}
        {!props.callImagen && <p className='text-sm text-slate-600'>{tx('applied_challenge.visual.unavailable', 'Image generation is unavailable. The editable organizer and text challenge remain available.')}</p>}
      </>)}
    </> : <>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-3 applied-challenge-no-print'><nav className='flex min-w-0 flex-wrap gap-2' aria-label={tx('applied_challenge.navigation', 'Problem-solving stages')}>{APPLIED_CHALLENGE_STAGES.map((stage, index) => <button key={stage.id} type='button' className='aps-button' aria-current={!reviewOpen && index === stageIndex ? 'step' : undefined} onClick={() => goToStage(index)}>{index + 1}. {stageLabel(stage)}</button>)}</nav><button type='button' className='aps-button' aria-pressed={!focusMode} onClick={() => { setFocusMode(!focusMode); setReviewOpen(false); }}>{focusMode ? tx('applied_challenge.focus.show_all', 'Show all steps') : tx('applied_challenge.focus.one_step', 'Focus on one step')}</button></div>
      <p className='mb-4 text-sm text-slate-600' aria-live='polite'>{_apsFill(tx('applied_challenge.workspace.progress', '{started} of {total} sections started'), workspaceProgress)}</p>
      <div className='aps-grid'><div className='min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5'>
        {reviewOpen ? <section aria-labelledby='aps-review-heading'><h2 id='aps-review-heading' className='text-xl font-bold'>{tx('applied_challenge.review.heading', 'Review my response')}</h2><p className='mt-2 text-sm text-slate-600'>{tx('applied_challenge.review.note', 'Check your reasoning and remaining uncertainties. This review does not submit your work; use the available download or class submission controls when ready.')}</p>{visiblePhases.filter(item => data.workspace[item.id].trim()).map(item => <section key={item.id} className='mt-4'><h3 className='text-sm font-bold'>{appliedChallengePhaseLabel(item, data.family, t).replace(/^\\d+\\.\\s*/, '')}</h3><p className='mt-1 whitespace-pre-wrap text-sm'>{data.workspace[item.id]}</p></section>)}{!data.workspace.response.trim() && <p role='status' className='mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-950'>{tx('applied_challenge.review.no_draft', 'Your main response is still empty. Return to Build to add it.')}</p>}{data.workspace.artifactUrl && <a href={data.workspace.artifactUrl} target='_blank' rel='noopener noreferrer' className='mt-4 block underline'>{tx('applied_challenge.artifact.open', 'Open my linked work')}</a>}<p className='mt-2 whitespace-pre-wrap text-sm'>{data.workspace.artifactDescription}</p><button type='button' onClick={() => goToStage(2)} className='aps-button mt-4'>{tx('applied_challenge.review.return', 'Return to my draft')}</button></section> : <>{(focusMode ? [currentStage] : APPLIED_CHALLENGE_STAGES).map(renderStage)}{focusMode && renderHelp()}<nav aria-label={tx('applied_challenge.focus.move', 'Move between steps')} className='mt-6 flex flex-wrap justify-between gap-3 applied-challenge-no-print'><button type='button' className='aps-button' disabled={stageIndex === 0} onClick={() => goToStage(stageIndex - 1)}>{tx('applied_challenge.focus.back', 'Back')}</button><button type='button' className='aps-button aps-primary' onClick={() => stageIndex < 4 ? goToStage(stageIndex + 1) : setReviewOpen(true)}>{stageIndex < 4 ? _apsFill(tx('applied_challenge.focus.continue', 'Continue to {stage}'), { stage: stageLabel(APPLIED_CHALLENGE_STAGES[stageIndex + 1]) }) : tx('applied_challenge.review.heading', 'Review my response')}</button></nav></>}
      </div>{renderReference()}</div>
    </>}
    ${teacher}
    <section className='applied-challenge-no-print mt-5 rounded-2xl border border-slate-200 bg-white p-4' aria-label={tx('applied_challenge.export.heading', 'Print or save a copy')}><div className='flex flex-wrap items-end gap-3'><label className='min-w-0 text-sm font-bold'>{tx('applied_challenge.export.copy', 'Copy to prepare')}<select value={exportPreset} onChange={event => setExportPreset(event.target.value)} className='mt-2 min-h-11 rounded-xl border border-slate-300 p-2'>{['task', 'response', ...(isTeacherMode ? ['teacher'] : []), 'paper'].map(preset => <option key={preset} value={preset}>{tx('applied_challenge.export.preset.' + preset, { task: 'Student task', response: 'My response', teacher: 'Teacher review', paper: 'Paper organizer' }[preset])}</option>)}</select></label><button type='button' className='aps-button' onClick={printPreset}>{tx('applied_challenge.export.prepare', 'Open print / PDF preview')}</button></div></section>
  </main>;
}
`;
// Artifact, optional image, and schema helpers remain bounded and separate from learner text.
const visualHelpers=`
function normalizeAppliedChallengeVisual(value) {
  const raw = value && typeof value === 'object' ? value : {};
  const image = typeof raw.image === 'string' && raw.image.length <= 6000000 && /^data:image\\/(?:png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(raw.image) ? raw.image : appliedChallengeSafeUrl(raw.image);
  return { image, alt: _apsString(raw.alt, 1200), purpose: _apsString(raw.purpose, 1200), reviewed: raw.reviewed === true, source: _apsString(raw.source, 100) };
}
`;
s=s.replace('function normalizeAppliedChallengePlan',visualHelpers+'\nfunction normalizeAppliedChallengePlan');
s=s.replace('    plan: normalizeAppliedChallengePlan(raw.plan),','    plan: normalizeAppliedChallengePlan(raw.plan),\n    visual: normalizeAppliedChallengeVisual(raw.visual),');
fs.writeFileSync(file,s);console.log('Five-stage learner workspace and teacher review views written.');
