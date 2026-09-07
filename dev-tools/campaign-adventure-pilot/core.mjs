// Scenario transport and persistence. No access to the main app's stores or session.
export const PREFIX = 'alloflow-campaign-pilot:v1:';
const MAX_COMMANDS = 500;
const copy = x => JSON.parse(JSON.stringify(x));
export function makeRun(adapter, {seed = 'FIELD-01', runId, config = {}} = {}) {
  if(typeof seed!=='string'||!seed.trim()||seed.length>32)throw new Error('Use a world seed of 1 to 32 characters.');
  const id = runId || globalThis.crypto.randomUUID();
  if(!/^[a-zA-Z0-9-]{1,64}$/.test(id))throw new Error('Invalid run ID.');
  const initial = adapter.start(seed.trim(),config);
  return {version:1,campaignId:adapter.id,runId:id,seed:seed.trim(),config:adapter.config(initial),
    commands:[],notes:[],createdAt:new Date().toISOString()};
}
export function materialize(adapter, run) {
  if(run.campaignId!==adapter.id)throw new Error('This save belongs to a different campaign.');
  let model=adapter.start(run.seed,run.config);
  for(const id of run.commands){
    const action=adapter.actions(model).find(a=>a.id===id);
    if(!action||action.disabled)throw new Error('Saved action is no longer valid: '+id);
    model=adapter.step(model,id);
  }
  return model;
}
export function dispatch(adapter, run, actionId, expectedRevision = run.commands.length) {
  if(expectedRevision!==run.commands.length)throw new Error('That decision has already been handled.');
  if(run.commands.length>=MAX_COMMANDS)throw new Error('This pilot run has reached its decision limit.');
  const model=materialize(adapter,run);
  const action=adapter.actions(model).find(a=>a.id===actionId);
  if(!action||action.disabled)throw new Error('That action is unavailable in the current situation.');
  const next={...copy(run),commands:[...run.commands,actionId]};
  materialize(adapter,next); // Reject bad transitions before committing the command.
  return next;
}
export function validateRun(adapter, raw) {
  if(!raw||raw.version!==1||raw.campaignId!==adapter.id||!/^[a-zA-Z0-9-]{1,64}$/.test(raw.runId||''))throw new Error('Unrecognized pilot save.');
  if(typeof raw.seed!=='string'||!raw.seed.trim()||raw.seed.length>32)throw new Error('Invalid saved world seed.');
  if(!Array.isArray(raw.commands)||raw.commands.length>MAX_COMMANDS||raw.commands.some(c=>typeof c!=='string'||c.length>120))throw new Error('Invalid saved decisions.');
  if(!Array.isArray(raw.notes)||raw.notes.length>100||raw.notes.some(n=>!n||!Number.isInteger(n.revision)||n.revision<0||n.revision>raw.commands.length||typeof n.text!=='string'||n.text.length>1200))throw new Error('Invalid saved field notes.');
  if(typeof raw.createdAt!=='string'||!Number.isFinite(Date.parse(raw.createdAt)))throw new Error('Invalid saved date.');
  // Adapters reject unknown model versions/configuration rather than silently changing them.
  const run={version:1,campaignId:raw.campaignId,runId:raw.runId,seed:raw.seed,
    config:copy(raw.config),commands:raw.commands.slice(),notes:copy(raw.notes),createdAt:raw.createdAt};
  materialize(adapter,run);
  return run;
}
export function saveKey(run){return PREFIX+run.campaignId+':'+run.runId;}
export function saveRun(storage,run){
  try {
    const key=saveKey(run),existing=storage.getItem?.(key);
    if(existing){
      let old;
      try{old=JSON.parse(existing);}catch{return {ok:false,message:'The existing saved journey needs recovery and was left untouched. Download this journey to keep your work.'};}
      if(old.version!==1||old.campaignId!==run.campaignId||old.runId!==run.runId||old.seed!==run.seed||
        !Array.isArray(old.commands)||!Array.isArray(old.notes)||
        old.commands.some((id,i)=>run.commands[i]!==id)||
        old.notes.some((note,i)=>JSON.stringify(run.notes[i])!==JSON.stringify(note))){
        return {ok:false,message:'Another version of this journey is already saved. It was left untouched. Download your journal before reopening the saved version.'};
      }
    }
    storage.setItem(key,JSON.stringify(run));return {ok:true};
  }
  catch(error){return {ok:false,message:'This browser could not save the journey. Keep this page open and download your journal.'};}
}
export function readRun(storage,key,adapters){
  if(!key.startsWith(PREFIX))throw new Error('Only pilot saves can be opened here.');
  const text=storage.getItem(key);
  if(!text||text.length>180000)throw new Error('This pilot save cannot be read. It has been left untouched.');
  const raw=JSON.parse(text);
  const adapter=adapters.find(a=>a.id===raw.campaignId);
  if(!adapter)throw new Error('This save needs a campaign that is not available in this pilot.');
  const run=validateRun(adapter,raw);
  if(saveKey(run)!==key)throw new Error('Saved journey identity does not match its storage key.');
  return run;
}
export function listRuns(storage,adapters){
  const result=[];
  for(let i=0;i<storage.length;i++){
    const key=storage.key(i);
    if(!key?.startsWith(PREFIX))continue;
    try{const run=readRun(storage,key,adapters);result.push({key,run});}
    catch(error){result.push({key,error:'Saved journey needs recovery; original data retained.'});}
  }
  return result.sort((a,b)=>(b.run?.createdAt||'').localeCompare(a.run?.createdAt||''));
}
export function addNote(run,text) {
  const value=String(text).trim();
  if(!value||value.length>1200||run.notes.length>=100)throw new Error('Write a field note of 1 to 1,200 characters (up to 100 notes per journey).');
  return {...copy(run),notes:[...run.notes,{revision:run.commands.length,text:value}]};
}
export function forkRun(run,revision,runId=globalThis.crypto.randomUUID()){
  if(!Number.isInteger(revision)||revision<0||revision>run.commands.length)throw new Error('Invalid replay point.');
  return {...copy(run),runId,createdAt:new Date().toISOString(),
    commands:run.commands.slice(0,revision),notes:run.notes.filter(n=>n.revision<=revision)};
}
// An optional narrator receives a detached scene, never an engine or a mutable run.
// Returned prose is displayed as text. It has no authority over actions or metrics.
export async function narrate(scene,provider,{timeoutMs=1800,signal}={}) {
  if(!provider)return {text:scene.body,status:'authored'};
  if(signal?.aborted)return {text:scene.body,status:'fallback'};
  const controller=new AbortController();
  const abort=()=>controller.abort();
  signal?.addEventListener('abort',abort,{once:true});
  if(signal?.aborted)controller.abort();
  let timer;
  try {
    const result=await Promise.race([
      Promise.resolve().then(()=>provider(copy({title:scene.title,body:scene.body,evidence:scene.evidence}),{signal:controller.signal})),
      new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('timeout'));},timeoutMs);}),
      new Promise((_,reject)=>{controller.signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true});})
    ]);
    if(controller.signal.aborted)throw new Error('aborted');
    if(typeof result!=='string'||!result.trim()||result.length>1800)throw new Error('Invalid narration.');
    return {text:result.trim(),status:'optional'};
  } catch {return {text:scene.body,status:'fallback'};}
  finally {clearTimeout(timer);controller.abort();signal?.removeEventListener('abort',abort);}
}
