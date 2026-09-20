const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
let src=read('applied_challenge_source.jsx');
function change(before,after){if(!src.includes(before))throw Error('Missing source anchor: '+before.slice(0,100));src=src.replace(before,after);}
change('function normalizeAppliedChallengeData(value) {',fs.readFileSync(path.join(__dirname,'pass8-reference-helpers.txt'),'utf8')+'\nfunction normalizeAppliedChallengeData(value) {');
change('schemaVersion: 7,','schemaVersion: 8,');
change('    workspace,\n    evidenceLedger,','    workspace,\n    reasoningReferences: normalizeAppliedReasoningReferences(raw.reasoningReferences),\n    evidenceLedger,');
change('    workspace: data.workspace,\n    evidenceLedger:', '    workspace: data.workspace,\n    reasoningReferences: data.reasoningReferences,\n    evidenceLedger:');
change('studentWork: { workspace, linkedWorkAvailable:',`studentWork: { workspace, reasoningReferences: data.reasoningReferences.map((ref, index) => ({ part: ref.part, source: ref.source, rowId: ref.rowId, location: fit(ref.location, 'reasoningReferences.' + index), current: appliedReasoningReferenceState(data, ref.part).current, learnerIdentified: true })), linkedWorkAvailable:`);
change("'Linked-work boundary: review only the supplied explanation.","'Reasoning references are learner-identified locations, not verification. Check the supplied writing across fields before asking the learner to repeat an explanation. Artifact references do not give you access to the artifact.',\n    'Linked-work boundary: review only the supplied explanation.");
// Coverage can acknowledge an explicit learner reference without evaluating it.
change("    { id: 'transfer', label: 'Where else this could help', stage: 4, recorded: !!w.transferReflection.trim() },\n  ];",`    { id: 'transfer', label: 'Where else this could help', stage: 4, recorded: !!w.transferReflection.trim() },
  ].map(item => { const state = appliedReasoningReferenceState(data, item.id); return { ...item, recorded: item.recorded || state.current, reference: state.reference, referenced: state.current, referenceChanged: !!state.reference && !state.current }; });`);
change("  const phase = id => ({ phase: id, elementId: 'applied-workspace-' + id });",`  const phase = id => ({ phase: id, elementId: 'applied-workspace-' + id });
  const linked = !itemId && appliedReasoningReferenceState(data, part);
  if (linked?.current) {
    const ref = linked.reference;
    if (ref.source === 'response') return phase('response');
    if (ref.source === 'artifact') return { phase: 'response', elementId: 'applied-artifact-description' };
    if (data.plan.visualMode !== 'none') return { phase: 'possibilities', rowId: ref.rowId, elementId: 'aps-ledger-evidence-' + ref.rowId };
  }`);
change("    phases,\n    evidenceLedger,",`    phases,
    reasoningReferences: preset === 'task' || preset === 'paper' ? [] : data.reasoningReferences.map(ref => ({ ...ref, label: _apsT(t, 'applied_challenge.review.part.' + ref.part, { evidence: 'Lesson connection', check: 'What I checked', decision: 'Keep or revise, and why', transfer: 'Where else this could help' }[ref.part]), summary: appliedReasoningReferenceSummary(data, ref, t) })),
    evidenceLedger,`);
change("  if (!teaching) {\n",`  if (!teaching) {
    if (m.reasoningReferences.length) body += section(tr('references.heading', 'Where I explained my reasoning'), m.reasoningReferences.map(ref => '<article><h3>' + esc(ref.label) + '</h3>' + text(ref.summary) + '</article>').join(''));
`);
// Normal notes retain selected sources without enabling the organizer.
change('function AppliedChallengeEvidenceSources({ evidence, rowId, t, editable = false })', 'function AppliedChallengeEvidenceSources({ evidence, rowId, t, editable = false, targetId })');
change("document.getElementById('aps-ledger-evidence-' + rowId)?.focus()", "document.getElementById(targetId || 'aps-ledger-evidence-' + rowId)?.focus()");
change('function AppliedChallengeSourceSearch({ t, searchWeb, disabled, rows, onAddReference, session })', 'function AppliedChallengeSourceSearch({ t, searchWeb, disabled, rows, onAddReference, session, notesMode = false, evidenceNotes = \'\', querySuggestions = [] })');
change("      <label className='block text-sm font-bold' htmlFor='aps-source-query'>",`      {querySuggestions.length > 0 && <details className='rounded-xl bg-slate-50 px-3'><summary className='min-h-11 cursor-pointer font-semibold'>{tx('query_help', 'Start from a question we still need to answer')}</summary><p className='pb-2 text-sm'>{tx('query_help_note', 'Choose a question, then edit it before searching. Nothing is sent until you search.')}</p><div className='space-y-2 pb-3'>{querySuggestions.slice(0, 3).map((question, index) => <button key={index} type='button' className='aps-button block w-full text-start' disabled={!available || state.status === 'loading'} onClick={() => { setQuery(question.slice(0, 200)); document.getElementById('aps-source-query')?.focus(); }}>{question}</button>)}</div></details>}
      <label className='block text-sm font-bold' htmlFor='aps-source-query'>`);
change('{onAddReference && rows.length > 0 &&', '{onAddReference && !notesMode && rows.length > 0 &&');
change("const check = appliedChallengeAttachReference(rows, result, destination, 'search-preview', t);", "const check = notesMode ? appliedChallengeAttachNoteReference(evidenceNotes, result, t) : appliedChallengeAttachReference(rows, result, destination, 'search-preview', t);");
change("onClick={() => onAddReference(result, destination)}", "onClick={() => onAddReference(result, notesMode ? '' : destination)}");
change("tx('length', 'This row has too much writing to add the full reference. Choose another row, create a new one, or edit it first.')", "notesMode ? tx('notes_full', 'Your evidence notes are full. Keep your writing and save the source separately, or make room before adding it.') : tx('length', 'This row has too much writing to add the full reference. Choose another row, create a new one, or edit it first.')");
change("{!destination && rows.length >= 12 ?", "{notesMode ? tx('notes_reference', 'The reference is added to your evidence notes as an unchecked source. Explain what it supports or challenges in your own words.') : !destination && rows.length >= 12 ?");
change("    const newId = 'ledger-' + Date.now().toString(36) + '-' + String(++ledgerIdCounterRef.current);",`    if (current.plan.visualMode === 'none') {
      const attached = appliedChallengeAttachNoteReference(current.workspace.evidence, result, t);
      if (!attached.ok) { addToast(tx('search.notes_full', 'The reference could not be added. Check for a duplicate or make room in your evidence notes.'), 'info'); return; }
      commitField('workspace', old => { const workspace = normalizeAppliedChallengeWorkspace(old); const next = appliedChallengeAttachNoteReference(workspace.evidence, result, t); return next.ok ? { ...workspace, evidence: next.evidence } : workspace; });
      setReviewOpen(false); setFocusMode(true); setHintPhase('evidence'); setFocusRequest({ phase: 'evidence', elementId: 'applied-workspace-evidence' }); return;
    }
    const newId = 'ledger-' + Date.now().toString(36) + '-' + String(++ledgerIdCounterRef.current);`);
change("onAddReference={data.plan.visualMode !== 'none' ? addOutsideReference : null}","onAddReference={addOutsideReference} notesMode={data.plan.visualMode === 'none'} evidenceNotes={data.workspace.evidence} querySuggestions={data.brief.openQuestions}");
change("const field = id => phase(id) ? renderWorkspacePhase(phase(id)) : null;",`const field = id => phase(id) ? <>{renderWorkspacePhase(phase(id))}{id === 'evidence' && <AppliedChallengeEvidenceSources evidence={data.workspace.evidence} t={t} editable={!learnerReadOnly && !isTeacherMode} targetId='applied-workspace-evidence' />}</> : null;`);
// Review references are saved independently from the teacher template.
change("{item.recorded ? recorded : missing}</span></button></li>)",`{item.referenceChanged ? tx('applied_challenge.references.changed_short', 'Recheck my reference') : item.referenced ? appliedReasoningReferenceLabel(item.reference, t) : item.recorded ? recorded : missing}</span></button>
          {item.reference && <p className='mt-2 whitespace-pre-wrap px-2 text-sm text-slate-600'>{item.reference.location}</p>}
          {Object.prototype.hasOwnProperty.call(APPLIED_REASONING_PARTS, item.id) && <AppliedReasoningReferenceEditor key={item.id + JSON.stringify(item.reference || null)} data={data} item={item} t={t} onChange={reference => commitField('reasoningReferences', old => [...normalizeAppliedReasoningReferences(old).filter(ref => ref.part !== item.id), ...(reference ? [reference] : [])])} />}
        </li>)`);
// Mobile reference is above the active work and collapses to one entry point.
change("  const renderReference = () => <aside className='aps-reference min-w-0 rounded-2xl bg-slate-50 p-4'", "  const renderReference = () => <details className='aps-reference min-w-0 rounded-2xl bg-slate-50 p-3'");
change("    <h2 className='text-base font-bold text-slate-900'>{tx('applied_challenge.reference.heading', 'Challenge reference')}</h2>", "    <summary className='min-h-11 cursor-pointer text-sm font-bold text-slate-900'>{tx('applied_challenge.reference.nearby', 'Lesson ideas and requirements')}</summary>");
change("  </aside>;\n  const renderHelp",`    <button type='button' className='aps-button mt-3' onClick={event => { event.currentTarget.closest('details').open = false; goToCurrentWork(); }}>{tx('applied_challenge.reference.return', 'Return to my writing')}</button>
  </details>;
  const renderHelp`);
change("<div className='aps-grid'><div", "<div className='aps-grid'>{renderReference()}<div");
change('</div>{renderReference()}</div>', '</div></div>');
change('.applied-challenge-root .aps-reference{order:2}', '.applied-challenge-root .aps-reference{order:0}');
change('.applied-challenge-root .aps-grid{display:grid;', '.applied-challenge-root .aps-reference{grid-column:1 / -1}.applied-challenge-root .aps-grid{display:grid;');
change('grid-template-columns:minmax(0,1fr) 270px;gap:24px', 'grid-template-columns:minmax(0,1fr);gap:12px');
change("{_apsFill(tx('applied_challenge.workspace.progress', '{started} of {total} sections started'), workspaceProgress)}", "{reviewOpen ? tx('applied_challenge.review.heading', 'Review my response') : _apsFill(tx('applied_challenge.workspace.stage_progress', '{stage} · Step {number} of 5'), { stage: stageLabel(currentStage), number: stageIndex + 1 })}");
// The context remains accessible without repeating it above the first field.
change("<p className='text-sm leading-relaxed text-slate-700'>{data.brief.context}</p>", "<details className='rounded-xl bg-slate-50 px-3 text-sm'><summary className='min-h-11 cursor-pointer font-semibold'>{tx('applied_challenge.reference.situation', 'Read the situation')}</summary><p className='pb-3 leading-relaxed text-slate-700'>{data.brief.context}</p></details>");
change("      {field('response')}{details(tx('applied_challenge.artifact.heading', 'Add a sketch, model, or recorded explanation'), <>",`      <div className='rounded-xl bg-slate-50 p-3'><p className='text-sm font-semibold'>{tx('applied_challenge.artifact.choice', 'How would you like to show your reasoning?')}</p><div className='mt-2 flex flex-wrap gap-2'><button type='button' className='aps-button' onClick={() => setFocusRequest({ phase: 'response', elementId: 'applied-workspace-response' })}>{tx('applied_challenge.artifact.write', 'Write here')}</button><button type='button' className='aps-button' onClick={() => setFocusRequest({ phase: 'response', elementId: 'applied-artifact-url' })}>{tx('applied_challenge.artifact.link', 'Use a sketch, model, or recording')}</button></div></div>
      {field('response')}{details(tx('applied_challenge.artifact.heading', 'Add a sketch, model, or recorded explanation'), <>`);
change("'Link your work and describe the reasoning it shows. Check that your teacher can access the link. A written explanation also works.'", "'Link your work and explain its reasoning. Include a slide, diagram label, or recording timestamp to help your reader find it. Check that your teacher can access the link.'");
// Teacher setup: put time next to the learning target and summarize chosen behavior.
const time="          <label className={labelClass}>{tx('applied_challenge.plan.availableTime', 'Available time')}<input value={plan.availableTime} onChange={event => setPlan({ ...plan, availableTime: event.target.value })} maxLength={100} placeholder={tx('applied_challenge.plan.time_placeholder', 'For example, one lesson or three sessions')} className={selectClass} /></label>";
change(time,'');
change("        <details className='rounded-xl border border-orange-200 bg-white p-3'><summary className='min-h-11 cursor-pointer text-sm font-bold'>{tx('applied_challenge.plan.constraints', 'Time, materials, and lesson selection')}", time+"\n        <details className='rounded-xl border border-orange-200 bg-white p-3'><summary className='min-h-11 cursor-pointer text-sm font-bold'>{tx('applied_challenge.plan.materials_selection', 'Materials and lesson selection')}");
change("        <label className={labelClass}>{tx('applied_challenge.panel.match', 'Challenge match')}", "        <details className='rounded-xl border border-orange-200 bg-white p-3'><summary className='min-h-11 cursor-pointer text-sm font-bold'>{tx('applied_challenge.panel.customize', 'Customize the challenge and support')}</summary><div className='mt-3 space-y-4'>\n        <label className={labelClass}>{tx('applied_challenge.panel.match', 'Challenge match')}");
change("        <label className={labelClass}>{tx('applied_challenge.panel.instructions', 'Teacher instructions')}", "        </div></details>\n        <label className={labelClass}>{tx('applied_challenge.panel.instructions', 'Teacher instructions')}");
change("      <div className='px-3 pb-3'>\n        <button",`      <div className='mx-3 mb-3 rounded-xl border border-orange-200 bg-white p-3 text-sm' aria-label={tx('applied_challenge.panel.summary', 'Your task settings')}>
        <p className='font-bold'>{appliedChallengeScopeText(scope, 'label', t)}{plan.availableTime && ' · ' + plan.availableTime}</p>
        <p className='mt-1'>{appliedChallengeScopeText(scope, 'description', t)}</p><p className='mt-2'>{appliedChallengeAgencyText(agencyMode, 'description', t)}</p>
        <p className='mt-2'>{plan.supportLevel === 'example' ? tx('applied_challenge.plan.example', 'Start with a parallel example') : plan.supportLevel === 'independent' ? tx('applied_challenge.plan.independent', 'Independent start; help stays available') : tx('applied_challenge.plan.prompt', 'Thinking prompts available')}</p>
        <p className='mt-2 text-slate-600'>{tx('applied_challenge.panel.check_plan', 'In your instructions, say whether learners will plan a check or carry it out. Review the generated product against the available time.')}</p>
      </div>
      <div className='px-3 pb-3'>
        <button`);
fs.writeFileSync(path.join(root,'applied_challenge_source.jsx'),src);
let boundary=read('studio_response_module.js');
function bc(before,after){if(!boundary.includes(before))throw Error('Missing boundary anchor '+before.slice(0,80));boundary=boundary.replace(before,after);}
bc("const appliedFields = ['workspace',", "const appliedFields = ['reasoningReferences', 'workspace',");
bc("coverage version workspaceFields", "reasoningReferences part rowId location referenceFingerprint transfer coverage version workspaceFields");
bc("workspace: {}, evidenceLedger: []", "workspace: {}, reasoningReferences: [], evidenceLedger: []");
bc("['evidenceLedger', 'validationCycles'].some", "['reasoningReferences', 'evidenceLedger', 'validationCycles'].some");
bc("!isTeacherMode && React.createElement('div', { className: 'mb-4 flex flex-wrap items-center gap-2 studio-recovery' },",`!isTeacherMode && React.createElement(resource.type === 'applied-challenge' ? 'details' : 'div', { className: 'mb-3 flex flex-wrap items-center gap-2 studio-recovery', ...(resource.type === 'applied-challenge' ? { open: studentWorkStatus === 'error' || undefined } : {}) },
        resource.type === 'applied-challenge' && React.createElement('summary', { className: 'min-h-11 cursor-pointer rounded-xl border px-3 py-2 text-sm font-semibold' }, tr('work_menu', 'My work: backup and restore')),`);
bc("      React.createElement(View, { ...viewProps",`      !isTeacherMode && resource.type === 'applied-challenge' && React.createElement('p', { className: 'mb-2 text-xs text-slate-600', role: 'status' }, backupMessage || tr('local_short', 'Work is saved on this device; it has not been submitted.')),
      React.createElement(View, { ...viewProps`);
fs.writeFileSync(path.join(root,'studio_response_module.js'),boundary);
fs.writeFileSync(path.join(root,'desktop/web-app/public/studio_response_module.js'),boundary);
let builder=read('_build_applied_challenge_module.js');
const anchor="'  _testing: {'";
if(!builder.includes(anchor))throw Error('Missing testing export anchor');
builder=builder.replace(anchor + ',', anchor + ",\n  '    normalizeAppliedReasoningReferences, appliedReasoningSource, appliedReasoningReferenceState, appliedChallengeAttachNoteReference,',");
// Keep the builder's array commas and generated object commas correct.
builder=builder.replace("appliedChallengeAttachNoteReference',,", "appliedChallengeAttachNoteReference,',");
fs.writeFileSync(path.join(root,'_build_applied_challenge_module.js'),builder);
console.log('Implemented pass 8 resource, shared response, and build-source changes.');
