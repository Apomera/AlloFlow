const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'../..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8').replace(/\r\n/g,'\n');
let s=read('applied_challenge_source.jsx');
const replace=(a,b)=>{if(!s.includes(a))throw Error('Missing anchor: '+a.slice(0,100));s=s.replace(a,b);};
// Only view preferences are stored here; learner writing remains host-owned.
replace("const value = !props.previewMode ? JSON.parse", "const value = !props.previewMode && !isTeacherMode ? JSON.parse");
replace("  const [focusMode, setFocusMode] = React.useState(() => !isTeacherMode && readPreference().focus !== false);", "  const [focusMode, setFocusMode] = React.useState(() => !isTeacherMode && readPreference().focus !== false);\n  const [reviewOpen, setReviewOpen] = React.useState(() => readPreference().review === true);\n  const preferenceIdentity = JSON.stringify([preferenceKey, !!isTeacherMode, !!props.previewMode]);");
replace('  const preferenceScope = React.useRef(preferenceKey);','  const preferenceScope = React.useRef(preferenceIdentity);');
replace('  }, [focusRequest, focusMode]);','  }, [focusRequest, focusMode, reviewOpen]);');
replace('if (preferenceScope.current !== preferenceKey) {\n      preferenceScope.current = preferenceKey;', 'if (preferenceScope.current !== preferenceIdentity) {\n      preferenceScope.current = preferenceIdentity;');
replace("const saved = readPreference(); setHintPhase(saved.phase || 'workingQuestion'); setFocusMode(!isTeacherMode && saved.focus !== false); return;", "const saved = readPreference(); setHintPhase(saved.phase || 'workingQuestion'); setFocusMode(!isTeacherMode && saved.focus !== false); setReviewOpen(saved.review === true); setFocusRequest(null); return;");
replace('JSON.stringify({ phase: hintPhase, focus: focusMode })','JSON.stringify({ phase: hintPhase, focus: focusMode, review: reviewOpen })');
replace('}, [preferenceKey, hintPhase, focusMode, props.previewMode, isTeacherMode]);','}, [preferenceIdentity, preferenceKey, hintPhase, focusMode, reviewOpen, props.previewMode, isTeacherMode]);');
replace('  const [reviewOpen, setReviewOpen] = React.useState(false);\n','');
replace("setArtifactLink(data.workspace.artifactUrl); setArtifactError(''); setReviewOpen(false);", "setArtifactLink(data.workspace.artifactUrl); setArtifactError('');");
replace("  const feedbackOutdated = appliedChallengeFeedbackOutdated(data);",String.raw`  const feedbackOutdated = appliedChallengeFeedbackOutdated(data);
  const [feedbackGuide, setFeedbackGuide] = React.useState(null);
  const activeFeedbackGuide = feedbackGuide?.scope === preferenceIdentity ? feedbackGuide.feedback : null;
  const guideOutdated = activeFeedbackGuide && appliedChallengeFeedbackOutdated({ ...data, feedback: activeFeedbackGuide });
  React.useEffect(() => { setFeedbackGuide(null); }, [preferenceIdentity]);
  const responseFocusId = !data.workspace.response.trim() && data.workspace.artifactDescription.trim() ? 'applied-artifact-description' : 'applied-workspace-response';
  const goToCurrentWork = () => {
    setFocusRequest(reviewOpen ? { elementId: 'aps-review-heading' } : currentPhase === 'response' ? { elementId: responseFocusId } : { phase: currentPhase });
  };
  const reviseWithFeedback = () => {
    if (!data.feedback || learnerReadOnly || isTeacherMode) return;
    setFeedbackGuide({ scope: preferenceIdentity, feedback: data.feedback });
    setReviewOpen(false); setFocusMode(true); setHintPhase('response');
    setFocusRequest({ elementId: responseFocusId });
  };
  const returnToFeedback = () => {
    setReviewOpen(false); setFocusMode(true); setHintPhase('testReflection');
    setFocusRequest(data.feedback ? { elementId: 'aps-feedback-heading' } : { phase: 'testReflection' });
  };`);
replace("    updateWorkspace('workingQuestion', data.brief.drivingQuestion); goToPhase('workingQuestion');", "    updateWorkspace('workingQuestion', data.brief.drivingQuestion); goToPhase('workingQuestion');\n    const suggestion = document.getElementById('aps-question-suggestion'); if (suggestion) suggestion.open = false;");
const questionStart=s.indexOf("      {data.brief.drivingQuestion && <div className='rounded-xl bg-orange-50 p-4 text-sm text-orange-950'><p>{data.brief.drivingQuestion}");
if(questionStart<0)throw Error('Question card missing');
const questionEnd=s.indexOf('\n',questionStart);
let question=s.slice(questionStart,questionEnd);
question=question.replace("<div className='rounded-xl bg-orange-50 p-4 text-sm text-orange-950'><p>","<details id='aps-question-suggestion' className='rounded-xl bg-orange-50 px-3 text-sm text-orange-950'><summary className='min-h-11 cursor-pointer font-semibold'>{tx('applied_challenge.question.optional', 'Use or adapt a suggested question')}</summary><div className='pb-3'><p>");
question=question.replace('</button></div>}', '</button></div></details>}');
s=s.slice(0,questionStart)+question+s.slice(questionEnd);
// Keep the current AI next step visible while the learner edits their own work.
replace("    {stage.id === 'build' && <>{field('response')}",String.raw`    {stage.id === 'build' && <>
      {activeFeedbackGuide && <aside aria-label={tx('applied_challenge.feedback.guide', 'Feedback beside my draft')} className='rounded-xl border border-emerald-200 bg-emerald-50 p-3'>
        <p className='text-sm font-bold text-emerald-950'>{guideOutdated ? tx('applied_challenge.feedback.guide_earlier', 'Next step from earlier feedback') : tx('applied_challenge.feedback.guide_current', 'Next step to consider')}</p>
        <p className='mt-2 whitespace-pre-wrap text-sm text-slate-800'>{activeFeedbackGuide.nextStep || activeFeedbackGuide.question}</p>
        <p className='mt-2 text-sm text-slate-600'>{tx('applied_challenge.feedback.guide_choice', 'Decide what is useful, then edit in your own words.')}</p>
        <div className='mt-3 flex flex-wrap gap-2'><button type='button' className='aps-button' onClick={returnToFeedback}>{tx('applied_challenge.feedback.return', 'Return to feedback')}</button><button type='button' className='aps-button' onClick={() => setFeedbackGuide(null)}>{tx('applied_challenge.feedback.hide_guide', 'Hide this guidance')}</button></div>
      </aside>}
      {field('response')}`);
replace("<AcTextarea value={data.workspace.artifactDescription}","<AcTextarea id='applied-artifact-description' value={data.workspace.artifactDescription}");
replace("<h3 className='text-sm font-black text-emerald-950'>{tx('applied_challenge.feedback.heading'", "<h3 id='aps-feedback-heading' tabIndex={-1} className='text-sm font-black text-emerald-950'>{tx('applied_challenge.feedback.heading'");
replace("          <p className='mt-3 text-sm text-slate-700'>{appliedChallengeCoverageText(data.feedback.coverage, t)}</p>\n",'');
const nextStep="            <div><dt className='font-black text-emerald-900'>{tx('applied_challenge.feedback.next_step', 'One next step')}</dt><dd className='mt-1 text-slate-800'>{data.feedback.nextStep}</dd></div>\n";
replace(nextStep,'');
const strength="            <div><dt className='font-black text-emerald-900'>{tx('applied_challenge.feedback.strength', 'A strength')}</dt><dd className='mt-1 text-slate-800'>{data.feedback.strength}</dd></div>";
replace(strength,strength.replace('<div>',"<div className='md:col-span-2'>")+String.raw`
            {(data.feedback.nextStep || data.feedback.question) && <div className='rounded-xl border border-emerald-200 bg-white p-3 md:col-span-2'><dt className='font-black text-emerald-900'>{tx('applied_challenge.feedback.next_step', 'One next step')}</dt><dd className='mt-1 whitespace-pre-wrap text-slate-800'>{data.feedback.nextStep || data.feedback.question}
              {!learnerReadOnly && !isTeacherMode && <button type='button' className='aps-button mt-3 block' onClick={reviseWithFeedback}>{tx('applied_challenge.feedback.edit_with', 'Edit my response with this feedback')}</button>}
            </dd></div>`);
const feedbackTail="          </dl>\n        </section>}</>);\n  const phase";
replace(feedbackTail,"          </dl>\n          <details className='mt-3 text-sm text-slate-700'><summary className='min-h-11 cursor-pointer font-semibold'>{tx('applied_challenge.coverage.details', 'What was included in this feedback?')}</summary><p className='pb-2'>{appliedChallengeCoverageText(data.feedback.coverage, t)}</p></details>\n        </section>}</>);\n  const phase");
const audioStart=s.indexOf("      {ReadAloud && <details className='mt-3 applied-challenge-no-print'>");if(audioStart<0)throw Error('Reading header missing');
const audioEnd=s.indexOf('\n',audioStart);let audio=s.slice(audioStart,audioEnd);
audio=audio.replace("className='mt-3 applied-challenge-no-print'", "className='aps-reading-options min-w-0 applied-challenge-no-print'").replace("tx('applied_challenge.reading.options', 'Read or listen to this challenge')", "tx('applied_challenge.reading.short', 'Read or listen')");
s=s.slice(0,audioStart)+String.raw`      <div className='mt-3 flex flex-wrap items-start gap-3 applied-challenge-no-print'>
        {!isTeacherMode && <button type='button' className='aps-button aps-primary' onClick={goToCurrentWork}>{reviewOpen ? tx('applied_challenge.resume.review', 'Go to my review') : workspaceProgress.started ? _apsFill(tx('applied_challenge.resume.stage', 'Continue in {stage}'), { stage: stageLabel(currentStage) }) : tx('applied_challenge.resume.start', 'Start writing')}</button>}
`+audio+"\n      </div>"+s.slice(audioEnd);
replace('.applied-challenge-root .aps-stage-nav{', '.applied-challenge-root .aps-reading-options[open]{flex-basis:100%}.applied-challenge-root textarea{scroll-margin-top:16px}.applied-challenge-root .aps-stage-nav{');
fs.writeFileSync(path.join(root,'applied_challenge_source.jsx'),s);
// questionAccepted is a real boolean, not a malformed writing field.
let boundary=read('studio_response_module.js');
const old="Object.values(raw.workspace).some(value => typeof value !== 'string')";
if(!boundary.includes(old))throw Error('Backup validation anchor missing');
boundary=boundary.replace(old,"Object.entries(raw.workspace).some(([key, value]) => key === 'questionAccepted' ? typeof value !== 'boolean' : typeof value !== 'string')");
fs.writeFileSync(path.join(root,'studio_response_module.js'),boundary);fs.writeFileSync(path.join(root,'desktop/web-app/public/studio_response_module.js'),boundary);
console.log('Implemented a shorter start, work/review shortcuts, feedback-guided editing, and valid question-state backups.');
