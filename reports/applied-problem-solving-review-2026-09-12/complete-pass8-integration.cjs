const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'../..');
function edit(file,fn){const p=path.join(root,file),before=fs.readFileSync(p,'utf8'),after=fn(before);if(before===after)throw Error('No change to '+file);fs.writeFileSync(p,after);return after;}
function replace(text,before,after){if(!text.includes(before))throw Error('Missing '+before.slice(0,100));return text.replace(before,after);}
edit('applied_challenge_source.jsx',text=>{
  text=replace(text,"    feedbackContextVersion: purpose === 'feedback' ? 1 : undefined,", "    reasoningReferences: data.reasoningReferences,\n    feedbackContextVersion: purpose === 'feedback' ? 2 : undefined,");
  text=replace(text,"return _apsString(evidence, 2200).split", "return _apsString(evidence, 8000).split");
  text=replace(text,"tx('search.notes_full',", "tx('applied_challenge.search.notes_changed',");
  text=replace(text,"<p id={headingId + '-prompt'} className='mt-1 text-sm leading-relaxed text-slate-600'>", "<p id={headingId + '-prompt'} className={data.supports.phasePrompts[phase.id] === label ? 'sr-only' : 'mt-1 text-sm leading-relaxed text-slate-600'}>");
  // A short glossary stays optional and does not add another AI operation.
  text=replace(text,"    {details(tx('applied_challenge.reference.full', 'Full challenge brief')", `    {details(tx('applied_challenge.reference.words', 'Words used in this challenge'), <dl className='space-y-2 text-sm'>{[['claim', 'Claim', 'An idea or answer you want to support.'], ['assumption', 'Assumption', 'Something you are treating as true but still need to check.'], ['tradeoff', 'Tradeoff', 'What you gain and what you give up with a choice.'], ['criterion', 'Criterion', 'A requirement you use to judge how well an option works.']].map(([id, label, meaning]) => <div key={id}><dt className='font-semibold'>{tx('applied_challenge.vocabulary.' + id + '.label', label)}</dt><dd>{tx('applied_challenge.vocabulary.' + id + '.meaning', meaning)}</dd></div>)}</dl>)}
    {details(tx('applied_challenge.reference.full', 'Full challenge brief')`);
  return text;
});
const boundary=edit('studio_response_module.js',text=>replace(text,"Work is saved on this device; it has not been submitted.","This workspace uses device storage. Saving does not submit your work."));
fs.writeFileSync(path.join(root,'desktop/web-app/public/studio_response_module.js'),boundary);
edit('doc_pipeline_source.jsx',text=>{
  const start=text.indexOf("       } else if (item.type === 'applied-challenge') {");
  if(start<0)throw Error('Missing APS lane');
  let tail=text.slice(start);
  tail=replace(tail,'                  evidenceLedger: (Array.isArray(raw.evidenceLedger)',`                  reasoningReferences: (Array.isArray(raw.reasoningReferences) ? raw.reasoningReferences : []).filter(ref => ref && ['evidence','check','decision','transfer'].includes(ref.part) && ['response','artifact','ledger'].includes(ref.source)).slice(0,4).map(ref => ({ label: { evidence: 'Lesson connection', check: 'What I checked', decision: 'Keep or revise, and why', transfer: 'Where else this could help' }[ref.part], summary: 'Learner-identified location (' + ref.source + '): ' + str(ref.location,1200) + ' — Recheck against the current work.' })),
                  evidenceLedger: (Array.isArray(raw.evidenceLedger)`);
  tail=replace(tail,"          const workspaceHtml =",`          const reasoningReferencesHtml = (m.reasoningReferences || []).length ? '<section class="ace-panel"><h3 class="ace-h3">' + esc(tx('applied_challenge.references.heading', 'Where I explained my reasoning')) + '</h3>' + m.reasoningReferences.map(ref => '<article><h4 class="ace-h4">' + esc(ref.label) + '</h4><p class="ace-p ace-prewrap">' + esc(ref.summary) + '</p></article>').join('') + '</section>' : '';
          const workspaceHtml =`);
  tail=replace(tail,'              + workspaceHtml','              + workspaceHtml + reasoningReferencesHtml');
  return text.slice(0,start)+tail;
});
// Add the new strings to the shipped catalog; existing translated keys stay intact.
const file=path.join(root,'ui_strings.js'),catalog=JSON.parse(fs.readFileSync(file,'utf8'));
function put(key,value){const keys=key.split('.');let parent=catalog;for(const k of keys.slice(0,-1))parent=parent[k]||(parent[k]={});parent[keys.at(-1)]=value;}
const source=fs.readFileSync(path.join(root,'applied_challenge_source.jsx'),'utf8');
for(const match of source.matchAll(/(?:tx|_apsT\(t,)\s*\(?'(applied_challenge\.[^']+)',\s*'((?:\\.|[^'\\])*)'/g)) { const key=match[1]; let obj=catalog;for(const part of key.split('.'))obj=obj?.[part];if(obj===undefined)put(key,match[2].replace(/\\'/g,"'").replace(/\\n/g,'\n')); }
const groups={
  references:{response:'Pointed to in my response',artifact:'Learner identified this in linked work',ledger:'Pointed to in my evidence notes',changed:'The work changed. Recheck this reference.',changed_short:'Recheck my reference',response_source:'My written response',artifact_source:'My linked work and explanation',ledger_source:'Evidence row {n}',edit_aria:'Point to existing reasoning: {part}',edit:'Review my reference',add:"I've explained this elsewhere",note:'Point to a passage, paragraph, diagram label, or recording timestamp. This is your own reference, not a check of its quality. Linked work is not inspected by AI.',where:'Where I explained it',choose:'Choose existing work',location:'Passage or location',save:'Save my reference',empty:'Add your response, a linked-work explanation, or evidence notes first.',remove:'Remove this reference',heading:'Where I explained my reasoning'},
  search:{query_help:'Start from a question we still need to answer',query_help_note:'Choose a question, then edit it before searching. Nothing is sent until you search.',notes_full:'Your evidence notes are full. Keep your writing and save the source separately, or make room before adding it.',notes_reference:'The reference is added to your evidence notes as an unchecked source. Explain what it supports or challenges in your own words.'},
};
Object.entries(groups).forEach(([group,entries])=>Object.entries(entries).forEach(([key,value])=>put('applied_challenge.'+group+'.'+key,value)));
put('studio_response.work_menu','My work: backup and restore');put('studio_response.local_short','This workspace uses device storage. Saving does not submit your work.');
put('applied_challenge.artifact.note','Link your work and explain its reasoning. Include a slide, diagram label, or recording timestamp to help your reader find it. Check that your teacher can access the link.');
for(const [id,label,meaning] of [['claim','Claim','An idea or answer you want to support.'],['assumption','Assumption','Something you are treating as true but still need to check.'],['tradeoff','Tradeoff','What you gain and what you give up with a choice.'],['criterion','Criterion','A requirement you use to judge how well an option works.']]){put('applied_challenge.vocabulary.'+id+'.label',label);put('applied_challenge.vocabulary.'+id+'.meaning',meaning);}
const encoded=JSON.stringify(catalog,null,2)+'\n';fs.writeFileSync(file,encoded);fs.writeFileSync(path.join(root,'desktop/web-app/public/ui_strings.js'),encoded);
console.log('Finished response freshness, full export, glossary and UI catalog integration.');
