import {createAdapters} from './adapters.mjs';
import {makeRun,materialize,dispatch,saveRun,readRun,listRuns,addNote,forkRun,narrate,saveKey} from './core.mjs';
import {landscape} from './scene-art.mjs';
export function mountFieldJourneys(root,options={}){
const $=id=>root.querySelector('#'+id);
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const button=(label,fn,cls='')=>{const b=el('button',cls,label);b.type='button';b.addEventListener('click',fn);return b;};
const clone=x=>JSON.parse(JSON.stringify(x));
const noteDrafts=new Map();
let adapters=[],run=null,adapter=null,view=null,selected=null,provider=null,narratorRequest=null,narratorSerial=0;
let notice='',warning=false,storage=null,sound=false,audioContext=null,audioNodes=[],audioGain=null;
let destroyed=false,soundSerial=0,reading=null;
const main=$('main');
function announce(text){const n=$('announcer');if(n)n.textContent=text;}
function message(text,isWarning=false){notice=text;warning=isWarning;const n=$('notice');if(n){n.textContent=text;n.hidden=!text;n.className='notice'+(isWarning?' warning':'');}announce(text);}
function persist(){
  if(!storage){message('Browser storage is unavailable. This run stays in memory; download your journal to keep it.',true);return false;}
  const result=saveRun(storage,run);
  if(!result.ok)message(result.message,true);
  else message('Journey saved on this device.');
  return result.ok;
}
function cancelNarration(){narratorSerial++;narratorRequest?.abort();narratorRequest=null;}
function stopSound(){
  soundSerial++;
  for(const node of audioNodes){try{node.stop?.();}catch{}try{node.disconnect?.();}catch{}}
  audioNodes=[];try{audioGain?.disconnect();}catch{}audioGain=null;
}
async function playSound(){
  stopSound();if(!sound||!view||document.hidden||destroyed)return;
  const serial=soundSerial;
  try{
    if(options.ensureSound)await options.ensureSound();
    if(destroyed||serial!==soundSerial||!sound||document.hidden)return;
    const Ctx=window.AudioContext||window.webkitAudioContext;
    if(!Ctx)throw new Error('Audio unavailable.');
    audioContext=audioContext||new Ctx();audioContext.resume().catch(()=>{if(destroyed||serial!==soundSerial)return;sound=false;stopSound();message('Sound could not start. The journey remains available.',true);});
    audioGain=audioContext.createGain();audioGain.gain.value=.15;audioGain.connect(audioContext.destination);
    audioNodes=window.AlloModules.playGenerativeSoundscape(audioContext,audioGain,view.sound,{gentle:true,sceneText:view.body,themeSeed:run.seed});
  }catch{if(destroyed||serial!==soundSerial)return;sound=false;stopSound();message('Sound is unavailable. The journey remains available.',true);}
}
function stopReading(){if(reading){window.speechSynthesis?.cancel();reading=null;}}
function readScene(){
  if(!window.speechSynthesis||!window.SpeechSynthesisUtterance){message('Read aloud is unavailable in this browser.',true);return;}
  stopReading();const utterance=new SpeechSynthesisUtterance(view.title+'. '+view.body);reading=utterance;
  utterance.rate=.92;utterance.onstart=()=>{if(audioGain)audioGain.gain.value=.035;};
  const restore=()=>{if(reading===utterance)reading=null;if(audioGain)audioGain.gain.value=.15;};utterance.onend=restore;utterance.onerror=()=>{restore();message('Read aloud could not finish. The scene text is still available.',true);};
  window.speechSynthesis.speak(utterance);
}
async function refreshNarration(){
  cancelNarration();if(!view)return;
  const serial=narratorSerial;const capturedRun=run.runId;const revision=run.commands.length;
  narratorRequest=new AbortController();
  const status=$('narration-status'),extra=$('optional-text');
  if(status)status.textContent=provider?'Authored scene ready. Checking optional narration…':'Authored scene · grounded in the simulation';
  if(extra){extra.hidden=true;extra.textContent='';}
  const result=await narrate(view,provider,{signal:narratorRequest.signal});
  if(serial!==narratorSerial||run?.runId!==capturedRun||run.commands.length!==revision)return;
  const current=$('narration-status');
  if(current)current.textContent=result.status==='fallback'?'Optional narration unavailable. The authored scene remains playable.':result.status==='optional'?'Authored scene with optional narration':'Authored scene · grounded in the simulation';
  if(result.status==='fallback')announce('Optional narration unavailable. You can continue with the authored scene.');
  if(result.status==='optional'&&$('optional-text')){$('optional-text').textContent=result.text;$('optional-text').hidden=false;}
}
function makeNotice(){const n=el('div','notice'+(warning?' warning':''),notice);n.id='notice';n.hidden=!notice;n.setAttribute('role','status');return n;}
function downloadJournal(){
  const model=materialize(adapter,run);
  const payload={...clone(run),journal:adapter.view(model).receipts};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='field-journey-'+run.campaignId+'-'+run.runId+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function activate(next,focus=true){
  cancelNarration();stopReading();stopSound();run=next;adapter=adapters.find(a=>a.id===run.campaignId);selected=adapter.id==='watershed'?'forestBuffer':'0';
  renderJourney(focus);
}
function startJourney(a,seed){
  try{const next=makeRun(a,{seed});run=next;adapter=a;persist();activate(next);}
  catch(error){message(error.message,true);}
}
function resumeJourney(key){
  try{const next=readRun(storage,key,adapters);message('Saved journey resumed.');activate(next);}
  catch(error){message(error.message+' The stored data has not been changed.',true);}
}
function returnHome(){cancelNarration();stopReading();stopSound();run=null;adapter=null;view=null;renderHome();main.focus();}
function renderHome(){
  main.replaceChildren();
  if(options.embedded)main.append(el('p','embedded-label','FIELD JOURNEYS · OPTIONAL PILOT'));
  const intro=el('section','intro');intro.append(el('p','eyebrow','EXPLORE · CHOOSE · RETURN'),el('h1','','Small choices.\nLiving worlds.'),el('p','','Step into a place that changes with your decisions. Follow a river through ten years of restoration, or help a grove leave a next generation.'));
  main.append(intro,makeNotice());
  const cards=el('div','campaign-grid');
  adapters.forEach(a=>{
    const card=el('section','campaign-card'),art=el('div','card-art');art.setAttribute('aria-hidden','true');
    const v=a.view(a.start('FIELD-01',{}));const map=landscape(v,()=>{},'');map.querySelectorAll('button').forEach(b=>b.remove());art.append(map);
    const body=el('div','card-body');body.append(el('p','eyebrow',a.eyebrow),el('h2','',a.title),el('p','',a.intro));
    const seedLabel=el('label','seed-label','World seed');const seed=el('input');seed.id='seed-'+a.id;seed.value='FIELD-01';seed.maxLength=32;seed.spellcheck=false;seedLabel.append(seed);body.append(seedLabel);
    body.append(button('Begin '+a.label,()=>startJourney(a,seed.value),'primary'));card.append(art,body);cards.append(card);
  });main.append(cards);
  const saved=el('section','saved');saved.append(el('h2','','Your saved journeys'));
  try {
    const records=storage?listRuns(storage,adapters):[];
    if(!records.length)saved.append(el('p','status-line','Your journeys will appear here after you begin.'));
    for(const item of records){
      const row=el('div','save-row'),text=el('div');
      if(item.run){
        const a=adapters.find(a=>a.id===item.run.campaignId);const v=a.view(materialize(a,item.run));
        text.append(el('h3','',a.label+' · '+item.run.seed),el('p','',v.period+' · '+item.run.commands.length+' decisions · '+new Date(item.run.createdAt).toLocaleDateString()));
        row.append(text,button('Resume '+a.label,()=>resumeJourney(item.key)));
      }else {text.append(el('h3','','Journey needs recovery'),el('p','',item.error));row.append(text);}
      saved.append(row);
    }
  }catch{saved.append(el('p','status-line','Saved journeys cannot be read in this browser.'));}main.append(saved);
  const file=el('input');file.type='file';file.accept='.json,application/json';file.hidden=true;
  file.addEventListener('change',async()=>{
    const chosen=file.files[0];if(!chosen)return;
    try{
      if(chosen.size>180000)throw new Error('Choose a pilot journal smaller than 180 KB.');
      const raw=JSON.parse(await chosen.text());const a=adapters.find(a=>a.id===raw.campaignId);
      if(!a)throw new Error('This is not a recognized pilot journey.');
      // Treat importing as a new run, never an overwrite of an existing saved journey.
      const {validateRun}=await import('./core.mjs');
      const checked=validateRun(a,raw),next=forkRun(checked,checked.commands.length);
      run=next;adapter=a;persist();activate(next);
    }catch(error){message(error.message,true);}
  });
  const tools=el('div','footer-tools');tools.append(button('Open a downloaded journey',()=>file.click()),file);main.append(tools);
  renderPilotDetails();
}
function choose(id,revision){
  try {
    const next=dispatch(adapter,run,id,revision);run=next;persist();stopReading();renderJourney(true);
    announce(adapter.label+'. '+view.period+'. '+view.title+'. '+notice);
  }catch(error){message(error.message,true);}
}
function selectLocation(id){
  selected=id;renderJourney(false);
  root.querySelector('[data-location="'+id+'"]')?.focus();
}
function renderJourney(focus=false){
  const model=materialize(adapter,run);view=adapter.view(model);
  if(!view.locations.some(l=>l.id===selected))selected=view.locations[0].id;
  main.replaceChildren();
  const heading=el('div','journey-heading'),titles=el('div');
  titles.append(button('← Field station',returnHome,'quiet'),el('p','eyebrow',adapter.eyebrow),el('h1','',adapter.title));
  const tools=el('div','header-actions');
  const soundButton=button(sound?'Sound on':'Sound off',()=>{sound=!sound;playSound();soundButton.textContent=sound?'Sound on':'Sound off';soundButton.setAttribute('aria-pressed',String(sound));});
  soundButton.setAttribute('aria-pressed',String(sound));
  tools.append(soundButton,button('Download journal',downloadJournal));
  heading.append(titles,tools);main.append(heading,makeNotice());
  const journey=el('div','journey'),left=el('section'),right=el('section');
  left.setAttribute('aria-label','Landscape and model state');right.setAttribute('aria-label','Scene and decisions');
  const map=landscape(view,selectLocation,selected);
  map.querySelectorAll('button').forEach((b,i)=>b.dataset.location=view.locations[i].id);
  left.append(map);
  const caption=el('div','map-caption');caption.append(el('span','',adapter.id==='watershed'?'Choose a reach to plan fieldwork.':'Choose a patch to inspect the grove.'),el('span','',run.seed));left.append(caption);
  const location=view.locations.find(l=>l.id===selected),info=el('div','location-info');
  info.append(el('h3','',location.name));
  const locationText=location.description+(adapter.id==='grove'?'. '+location.value+' living trees here. '+(location.gap?'A storm has opened the canopy.':'')+(location.trees.some(t=>t.descendant)?' Smaller trees show descendants.':''):'');
  info.append(el('p','',locationText));
  left.append(info);
  const metrics=el('div','metrics');metrics.setAttribute('aria-label','Current model values');
  view.metrics.forEach(m=>{const metric=el('div','metric'),value=el('span','metric-value',m.value);value.append(el('small','',m.unit));metric.append(value,el('span','metric-label',m.label));metrics.append(metric);});left.append(metrics);
  const support=el('details');support.append(el('summary','','Help me reason through this'),el('p','',view.support));left.append(support);
  const scene=el('section','scene');scene.setAttribute('aria-labelledby','scene-title');
  const meta=el('div','scene-meta');meta.append(el('p','eyebrow',view.ended?'FIELD NOTES · FINAL CHAPTER':'FIELD NOTES · '+view.period.toUpperCase()),button('Read aloud',readScene),button('Stop',stopReading));scene.append(meta);
  const title=el('h2','',view.title);title.id='scene-title';title.tabIndex=-1;
  const body=el('p','scene-body',view.body);body.id='scene-body';
  const extra=el('p','optional-narration');extra.id='optional-text';extra.hidden=true;
  const state=el('p','status-line');state.id='narration-status';
  scene.append(title,body,extra,state);
  const progressRow=el('div','progress-row');progressRow.append(el('span','',view.period),el('span','',view.progress+' / '+view.total+' years observed'));
  const progress=el('progress');progress.max=view.total;progress.value=view.progress;progress.setAttribute('aria-label','Years observed');scene.append(progressRow,progress);right.append(scene);
  const decisions=el('section','decisions');decisions.append(el('h3','',view.prompt));
  let actions=view.actions;
  if(adapter.id==='watershed'&&view.phase==='year'){
    actions=actions.filter(a=>a.location===selected||a.location==='all'||!a.location);
    decisions.append(el('p','action-group','Fieldwork · '+location.name));
  }
  let allLabel=false;
  actions.forEach(action=>{
    if(action.location==='all'&&!allLabel){decisions.append(el('p','action-group','Across the watershed'));allLabel=true;}
    // Capture revision now, not when a queued/double click eventually fires.
    const revision=run.commands.length;
    const safeButton=button('',()=>choose(action.id,revision),'action'+(!action.location?' primary':''));
    safeButton.dataset.action=action.id;safeButton.disabled=!!action.disabled;
    const label=el('span','action-title');label.append(el('span','',action.label));
    if(action.cost!=null)label.append(el('span','action-cost',action.cost+'h'+(action.disabled?' · unavailable':'')));
    safeButton.append(label,el('span','action-hint',action.location?action.tradeoff:action.hint));
    decisions.append(safeButton);
  });
  if(view.ended)decisions.append(el('p','',adapter.disclosure));
  right.append(decisions);
  if(view.evidence.length){
    const evidence=el('section','evidence');evidence.append(el('h3','',adapter.id==='watershed'?'After fieldwork → after the year':'What the last year recorded'));
    const table=el('table'),head=el('thead'),tr=el('tr');
    ['Evidence',adapter.id==='watershed'?'Before → after':'Result'].forEach(text=>{const th=el('th','',text);th.scope='col';tr.append(th);});head.append(tr);table.append(head);
    const tbody=el('tbody');view.evidence.forEach(item=>{const row=el('tr'),name=el('td','',item.label),value=el('td','number',item.before==null?String(item.after):item.before+' → '+item.after);name.title=item.detail;row.append(name,value);tbody.append(row);});table.append(tbody);evidence.append(table);right.insertBefore(evidence,decisions);
  }
  journey.append(left,right);main.append(journey);renderJournal();renderPilotDetails();
  if(focus)title.focus({preventScroll:false});
  playSound();refreshNarration();
}
function renderJournal(){
  const journal=el('section','journal'),history=el('div'),notes=el('div','notes');
  history.append(el('h2','','The field journal'));
  const receipts=el('div','receipts');receipts.tabIndex=0;receipts.setAttribute('role','region');receipts.setAttribute('aria-label','Recorded annual evidence');
  if(!view.receipts.length)receipts.append(el('p','status-line','Observe your first year to record its event and consequences.'));
  for(const record of view.receipts){const item=el('article','receipt');item.append(el('h3','',record.title),el('p','',record.text),el('p','',record.detail));receipts.append(item);}history.append(receipts);
  if(run.commands.length){
    history.append(button('Replay the latest year',()=>{
      let revision=run.commands.length-1;
      if(adapter.id==='watershed'){
        const lastEnd=run.commands.lastIndexOf('end-year');
        const prior=run.commands.lastIndexOf('continue',lastEnd-1);
        revision=prior>=0?prior+1:0;
      }
      const next=forkRun(run,revision);run=next;persist();message('A new branch is ready in the same world. The previous journey is still saved.');activate(next);
    }));
    history.append(el('p','status-line','Opens a separate saved branch with the same world seed.'));
  }
  const label=el('label','','What changed, and what might you try next?');label.htmlFor='field-note';
  const input=el('textarea');input.id='field-note';input.maxLength=1200;input.placeholder='Use something you observed as evidence…';
  input.value=noteDrafts.get(run.runId)||'';
  const noteRunId=run.runId;input.addEventListener('input',()=>noteDrafts.set(noteRunId,input.value));
  notes.append(label,input,button('Save field note',()=>{
    try{run=addNote(run,input.value);noteDrafts.delete(run.runId);persist();renderJourney();$('field-note').focus();}catch(error){message(error.message,true);}
  }));
  for(const note of run.notes)notes.append(el('p','note',note.text));
  journal.append(history,notes);main.append(journal);
}
function renderPilotDetails(){
  const details=el('details','pilot-details');
  details.append(el('summary','',options.embedded?'About Field Journeys':'About this pilot and its isolation checks'),
    el('p','',options.embedded?'Explore two campaigns using the existing simulations. Journeys save on this device and can be downloaded. Your regular adventures and campaigns keep their own saves.':'This is a separate development host. It reads the existing Tree Life Lab engine and Adventure soundscape code unchanged. The watershed bridge copies exact source functions at build time. No app account, cloud session, API key, or regular campaign save is connected.'),
    el('p','',options.embedded?'Scenes describe results from the simulation. This pilot uses authored narration and does not require an AI connection.':'The visible scenes are authored from model results. Optional narration is an extension point only: no live AI provider is configured. These local checks simulate failure without making a network request.'),
    el('p','',adapter?adapter.disclosure:'Both campaigns use educational models. Their indices and scenario assumptions are not real-world forecasts.'));
  if(run&&!options.embedded){
    details.append(button('Simulate narrator outage',()=>{provider=()=>Promise.reject(new Error('Simulated outage'));refreshNarration();}),
      button('Simulate malformed narration',()=>{provider=()=>({systemStateUpdate:{quality:100}});refreshNarration();}),
      button('Use authored narration',()=>{provider=null;refreshNarration();}));
  }
  main.append(details);
}
const visibility=()=>{if(document.hidden){stopSound();stopReading();}else playSound();};
function destroy(){
  if(destroyed)return;destroyed=true;cancelNarration();sound=false;stopSound();stopReading();
  audioContext?.close().catch(()=>{});audioContext=null;noteDrafts.clear();
  document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',destroy);
}
try{
  adapters=createAdapters(window.__alloTreeLabEngine);
  try{storage=window.localStorage;}catch{storage=null;}
  renderHome();
  document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',destroy);
}catch(error){main.replaceChildren(el('h1','','The field station could not open'),el('p','',error.message),el('p','','Your existing adventures and campaign saves have not been changed.'));}
return Object.freeze({snapshot:()=>run?clone({run,view}):null,setNarrator:fn=>{provider=fn;refreshNarration();},showHome:returnHome,destroy});
}
