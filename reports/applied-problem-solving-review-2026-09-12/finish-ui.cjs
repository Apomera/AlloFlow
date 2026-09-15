const fs=require('fs');
function edit(p,fn){const s=fs.readFileSync(p,'utf8');fs.writeFileSync(p,fn(s));}
edit('tests/applied_challenge_interaction.test.js',s=>s.replace("if (!options.teacher) await clickButton('Show all steps');","if (!options.teacher && Array.from(host.querySelectorAll('button')).some(button => button.textContent === 'Show all steps')) await clickButton('Show all steps');"));
edit('tests/applied_challenge_export.test.js',s=>s.replace("expect(source).toContain('#applied-challenge-print-root');","expect(source).toContain(\"id='applied-challenge-print-root'\");\n    expect(source).toContain('renderAppliedChallengePreset(data, preset, t)');"));
edit('applied_challenge_source.jsx',s=>{
  s=s.replace('function AcTextarea(props) {',`// Preserve line breaks while a teacher edits a list; the saved list remains normalized.
function AcListTextarea(props) {
  const [draft, setDraft] = React.useState(props.value || '');
  const editing = React.useRef(false);
  React.useEffect(() => { if (!editing.current) setDraft(props.value || ''); }, [props.value]);
  return <AcTextarea {...props} value={draft} onFocus={() => { editing.current = true; }} onChange={event => { setDraft(event.target.value); props.onChange(event); }} onBlur={() => { editing.current = false; setDraft(props.value || ''); }} />;
}

function AcTextarea(props) {`);
  s=s.replace(/<AcTextarea (aria-label=\{tx\('applied_challenge\.aria\.(?:facts|open_questions|stakeholders|criteria|constraints)'[^\n]+)/g,'<AcListTextarea $1');
  s=s.replace("const [focusRequest, setFocusRequest] = React.useState(null);", "const [focusRequest, setFocusRequest] = React.useState(null);\n  const preferenceScope = React.useRef(preferenceKey);");
  s=s.replace("if (props.previewMode || isTeacherMode) return;\n    try { sessionStorage.setItem", "if (preferenceScope.current !== preferenceKey) {\n      preferenceScope.current = preferenceKey;\n      const saved = readPreference(); setHintPhase(saved.phase || 'workingQuestion'); setFocusMode(!isTeacherMode && saved.focus !== false); return;\n    }\n    if (props.previewMode || isTeacherMode) return;\n    try { sessionStorage.setItem");
  s=s.replace("const visual = data.visual;",`const visual = data.visual;
  React.useEffect(() => {
    setArtifactLink(data.workspace.artifactUrl); setArtifactError(''); setReviewOpen(false);
    setExampleOpen(data.plan.supportLevel === 'example'); setHelpOpen(data.plan.supportLevel !== 'independent');
    setPromptOpen(false); setVisualEditor(null); setVisualBusy(false); setVisualError('');
  }, [resourceId, props.activeProfileId, props.previewMode, isTeacherMode]);`);
  const supportAnchor="{['context', 'move', 'whyItHelps'].map(key => <label";
  s=s.replace(supportAnchor,`<label className='block text-sm'>{tx('applied_challenge.supports.starter', 'Optional question starter')}<AcTextarea value={data.supports.frameStarter} onChange={event => updateSupports({ frameStarter: event.target.value })} rows={2} className='mt-2 w-full rounded-xl border p-3' /></label>
        {['frameChoices', 'coachPrompts'].map(key => <label key={key} className='block text-sm'>{tx('applied_challenge.supports.' + key, key === 'frameChoices' ? 'Possible directions (one per line)' : 'Thinking prompts (one per line)')}<AcListTextarea value={data.supports[key].join('\\n')} onChange={event => updateSupports({ [key]: event.target.value.split('\\n') })} rows={3} className='mt-2 w-full rounded-xl border p-3' /></label>)}
        `+supportAnchor);
  return s;
});
edit('reports/applied-problem-solving-review-2026-09-12/build-fixture.cjs',s=>{
  s=s.replace("'resource_read_aloud_module.js','applied_challenge_module.js'", "'resource_read_aloud_module.js','image_asset_editor_module.js','applied_challenge_module.js'");
  s=s.replace("callGemini:params.has('offline')?null:async()=>'{\"hint\":\"Which lesson fact supports that option?\"}'",`callImagen:window.reviewTeacher ? async()=>window.mockIllustration : null,callGemini:params.has('offline')?null:async(prompt)=>prompt.includes('strength')?JSON.stringify({strength:'Your two options use the lesson ideas.',lessonConnectionCheck:'You distinguish infiltration from runoff.',evidenceOrConstraintCheck:'Local soil conditions still need checking.',nextStep:'Name an observation that could change your plan.',question:'What would make the other option stronger?',status:'developing'}):JSON.stringify({hint:'Which lesson fact supports that option?',challenge:'The soil may absorb water slowly.',whyItMatters:'Infiltration affects runoff.',question:'What observation could change your choice?'})`);
  return s;
});
