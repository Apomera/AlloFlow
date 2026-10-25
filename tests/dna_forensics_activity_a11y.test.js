// @vitest-environment jsdom
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {React,ReactDOMClient,loadTool,makeCtx,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

const h=React.createElement,act=React.act;
const sibling=Object.freeze({draft:'Keep the ecology field observation.',revision:11});
const expansion=Object.freeze({expSection:'glossary',learnerNote:'Keep the reference note.'});
const evidence=Object.freeze({claim:'Compare fragment evidence before making a claim.'});
// Independently stated authored teaching datasets; none are extracted from source.
const cases=[
 {name:'Crime Scene Match',enzyme:'EcoRI',match:2,samples:[['Evidence',[130,250,380,510,680]],['Suspect A',[130,290,380,510,680]],['Suspect B',[130,250,380,510,680]],['Suspect C',[180,250,420,510,720]]]},
 {name:'Paternity Test',enzyme:'BamHI',match:2,samples:[['Child',[140,310,450,600]],['Mother',[140,310,520,670]],['Father A',[200,370,450,600]],['Father B',[140,280,520,680]]]},
 {name:'Species ID',enzyme:'HindIII',match:1,samples:[['Unknown',[160,290,430,560,710]],['Wolf',[160,290,430,560,710]],['Coyote',[160,330,430,600,710]],['Dog',[160,290,470,560,750]]]},
 {name:'Outbreak Source',enzyme:'PstI',match:1,samples:[['Patient',[180,340,480,610]],['Restaurant A',[180,340,480,610]],['Restaurant B',[220,340,520,610]],['Restaurant C',[180,380,480,650]]]}
];
const oldAnalysis='Keep the earlier evidence explanation.';
const freshAnalysis='The candidate supports this simplified fragment comparison. Smaller DNA fragments travel farther through the gel.';
let config,host,root,outside,latest,setStore,xp,announce,toast,celebrate,provider,actDescriptor;
const query=selector=>host.querySelector(selector);
const workspace=()=>query('[data-dna-forensics]');
const current=()=>latest.dnaLab;
const caseButton=index=>query(`[data-dna-forensic-case="${index}"]`);
const guess=index=>query(`[data-dna-forensic-guess="${index}"]`);
const submit=()=>query('#dna-forensic-submit');
const aiButton=()=>query('#dna-forensic-ai-button');
const status=()=>query('#dna-forensic-status');
const aiStatus=()=>query('#dna-forensic-ai-status');
function nameOf(node){if(node.hasAttribute('aria-label'))return node.getAttribute('aria-label');if(node.hasAttribute('aria-labelledby'))return node.getAttribute('aria-labelledby').split(/\s+/).map(id=>document.getElementById(id)?.textContent||'').join(' ').replace(/\s+/g,' ').trim();return node.textContent.replace(/\s+/g,' ').trim();}
function initial(patch={}){return{ecology:sibling,dna:expansion,dnaLab:{tab:'forensics',dnaFocusMode:false,dnaGradeOverride:'9-12',visitedTabs:{forensics:true},
 dnaSequence:'ATGAAATAA',dnaReportNote:'Keep my uncertainty reflection.',dnaEvidenceReasoning:'Read all lanes before naming a sample.',learningEvidence:evidence,score:7,badges:{earlierBadge:true},
 forensicCase:0,forensicGelRun:false,forensicGuess:null,forensicResult:null,forensicSolved:2,forensicAI:null,forensicAILoading:false,...patch}};}
function Host({seed}){const[store,update]=React.useState(seed);latest=store;setStore=update;const setToolData=React.useCallback(arg=>update(prev=>typeof arg==='function'?arg(prev):arg),[]);
 return config.render(makeCtx({toolData:store,setToolData,awardXP:xp,announceToSR:announce,addToast:toast,celebrate,callGemini:provider,callTTS:null,callImagen:null}));}
async function mount(patch={},suppliedProvider=provider){provider=suppliedProvider;outside.focus();await act(async()=>root.render(h(Host,{seed:initial(patch)})));}
async function remount(patch={},suppliedProvider=provider){await act(async()=>root.unmount());root=ReactDOMClient.createRoot(host);await mount(patch,suppliedProvider);}
async function commit(patch){await act(async()=>setStore(prev=>({...prev,dnaLab:{...prev.dnaLab,...patch}})));}
async function redraw(){await act(async()=>setStore(prev=>({...prev})));}
async function activate(node){expect(node).not.toBeNull();expect(node).toBeDefined();node.focus();await act(async()=>node.click());}
// jsdom does not implement native button keyboard activation; deliver its native
// click only when no key handler consumed it. Browser tests cover actual keys.
async function activateByKey(node,value){expect(node.tagName).toBe('BUTTON');node.focus();await act(async()=>{const down=new KeyboardEvent('keydown',{key:value,bubbles:true,cancelable:true});node.dispatchEvent(down);if(value==='Enter'&&!down.defaultPrevented)node.click();node.dispatchEvent(new KeyboardEvent('keyup',{key:value,bubbles:true,cancelable:true}));if(value===' '&&!down.defaultPrevented)node.click();});}
async function flush(){await act(async()=>{await Promise.resolve();await Promise.resolve();await Promise.resolve();});}
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};}
async function settle(request,value,failed=false){await act(async()=>{request[failed?'reject':'resolve'](value);await Promise.resolve();await Promise.resolve();await Promise.resolve();});}
function live(node){expect(node).not.toBeNull();expect(node.getAttribute('role')).toBe('status');expect(node.getAttribute('aria-live')).toBe('polite');expect(node.getAttribute('aria-atomic')).toBe('true');expect(node.querySelector('button')).toBeNull();return node;}
function preserved(){expect(latest.ecology).toBe(sibling);expect(latest.dna).toBe(expansion);expect(current().learningEvidence).toBe(evidence);expect(current().dnaSequence).toBe('ATGAAATAA');expect(current().dnaReportNote).toBe('Keep my uncertainty reflection.');expect(current().dnaEvidenceReasoning).toBe('Read all lanes before naming a sample.');expect(current().score).toBe(7);expect(current().badges.earlierBadge).toBe(true);}
function noRewards(){expect(xp).not.toHaveBeenCalled();}
function completed(patch={}){return{forensicGelRun:true,forensicGuess:2,forensicResult:'correct',...patch};}
function expectReset(index){expect(current().forensicCase).toBe(index);expect(current().forensicGelRun).toBe(false);expect(current().forensicGuess).toBeNull();expect(current().forensicResult).toBeNull();expect(current().forensicAI).toBeFalsy();expect(current().forensicAILoading).toBe(false);}
function expectGuarded(button,locked){expect(button.tagName).toBe('BUTTON');expect(button.type).toBe('button');expect(button.disabled).toBe(false);expect(button.getAttribute('aria-disabled')).toBe(String(locked));}

beforeEach(()=>{actDescriptor=Object.getOwnPropertyDescriptor(globalThis,'IS_REACT_ACT_ENVIRONMENT');globalThis.IS_REACT_ACT_ENVIRONMENT=true;vi.useFakeTimers();resetStemLab();config=loadTool('stem_lab/stem_tool_dna.js','dnaLab');xp=vi.fn();announce=vi.fn();toast=vi.fn();celebrate=vi.fn();provider=null;
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);host=document.createElement('div');outside=document.createElement('button');outside.textContent='Host navigation';document.body.append(outside,host);root=ReactDOMClient.createRoot(host);});
afterEach(async()=>{try{if(root)await act(async()=>root.unmount());}finally{host?.remove();outside?.remove();vi.clearAllTimers();vi.useRealTimers();vi.restoreAllMocks();root=null;host=null;setStore=null;config=null;if(actDescriptor)Object.defineProperty(globalThis,'IS_REACT_ACT_ENVIRONMENT',actDescriptor);else delete globalThis.IS_REACT_ACT_ENVIRONMENT;}});

describe('DNA Forensics accessible evidence and scoring',()=>{
 it('names the case selector, exposes native pressed cases and starts with an empty status without moving focus',async()=>{
  await mount();expect(workspace()).not.toBeNull();const title=query('#dna-forensic-case-title'),group=query('#dna-forensic-cases');expect(title.tagName).toBe('H3');expect(title.tabIndex).toBe(-1);expect(title.textContent).toContain(cases[0].name);expect(group.getAttribute('role')).toBe('group');expect(nameOf(group).length).toBeGreaterThan(0);
  for(let index=0;index<4;index++){const button=caseButton(index);expect(button.tagName).toBe('BUTTON');expect(button.type).toBe('button');expect(nameOf(button)).toContain(cases[index].name);expect(button.getAttribute('aria-pressed')).toBe(String(index===0));}
  expect(live(status()).textContent).toBe('');expect(document.activeElement).toBe(outside);const untouched=latest;await act(async()=>vi.advanceTimersByTime(60000));expect(latest).toBe(untouched);noRewards();preserved();
 });

 it('runs all four unchanged datasets with explicit gel focus, a named canvas and keyboard-accessible fragment table',async()=>{
  for(let index=0;index<4;index++){await remount({forensicCase:index});const verdict=live(status());await activateByKey(query('#dna-forensic-run'),index%2?' ':'Enter');expect(current().forensicGelRun).toBe(true);expect(query('#dna-forensic-run')).toBeNull();
   const title=query('#dna-forensic-gel-title'),region=query('#dna-forensic-fragments'),canvas=workspace().querySelector('canvas'),caption=query('#dna-forensic-gel-caption');expect(title.tagName).toBe('H3');expect(title.tabIndex).toBe(-1);expect(document.activeElement).toBe(title);expect(region.tabIndex).toBe(0);expect(region.getAttribute('role')).toBe('region');expect(region.getAttribute('aria-labelledby').split(/\s+/)).toContain(title.id);
   expect(nameOf(canvas)).toContain(cases[index].name);expect(nameOf(canvas)).toContain(cases[index].samples[0][0]);expect(canvas.getAttribute('aria-describedby').split(/\s+/)).toContain(caption.id);expect(caption.tagName).toBe('CAPTION');
   const table=region.querySelector('table');expect(table.querySelectorAll('thead th[scope="col"]')).toHaveLength(3);const rows=[...table.querySelectorAll('tbody tr')];expect(rows).toHaveLength(4);
   rows.forEach((row,lane)=>{const label=row.querySelector('th[scope="row"]');expect(label.textContent).toBe(cases[index].samples[lane][0]);expect(row.textContent).toContain(cases[index].samples[lane][1].join(', ')+' bp');});
   expect(workspace().textContent).toContain(cases[index].enzyme);expect(status()).toBe(verdict);expect(current().forensicSolved).toBe(2);noRewards();preserved();}
  expect(toast.mock.calls.some(([message])=>/Running gel electrophoresis/i.test(String(message)))).toBe(false);
 });

 it('requires a valid non-reference selection and keeps invalid submits as state-identity no-ops',async()=>{
  await mount({forensicGelRun:true});const group=query('#dna-forensic-choices');expect(group.getAttribute('role')).toBe('group');expect(nameOf(group)).toContain(cases[0].name);expect(nameOf(group)).toContain('Choose the comparison sample');expect(query('#dna-forensic-question').textContent).toContain('Evidence');expect(guess(0)).toBeNull();expectGuarded(submit(),true);
  const blank=latest;await activateByKey(submit(),'Enter');expect(latest).toBe(blank);
  for(const invalid of [0,99,-1]){await commit({forensicGuess:invalid});expectGuarded(submit(),true);const before=latest;await activate(submit());expect(latest).toBe(before);}
  await activateByKey(guess(2),' ');expect(current().forensicGuess).toBe(2);for(let index=1;index<4;index++){expect(guess(index).type).toBe('button');expect(guess(index).getAttribute('aria-pressed')).toBe(String(index===2));}expectGuarded(submit(),false);noRewards();preserved();
 });

 it('scores the four exact authored matches once per attempt and keeps Submit, selections and the concise status mounted',async()=>{
  for(let index=0;index<4;index++){await remount({forensicCase:index,forensicGelRun:true});const node=live(status()),button=submit(),choice=guess(cases[index].match);await activate(choice);await activateByKey(button,index%2?' ':'Enter');
   expect(current().forensicResult).toBe('correct');expect(current().forensicSolved).toBe(3);expect(submit()).toBe(button);expect(document.activeElement).toBe(button);expect(guess(cases[index].match)).toBe(choice);expect(choice.getAttribute('aria-pressed')).toBe('true');expectGuarded(button,true);for(let lane=1;lane<4;lane++)expectGuarded(guess(lane),true);
   expect(status()).toBe(node);expect(node.textContent).toMatch(/correct|supported/i);expect(node.textContent.length).toBeLessThan(360);expect(current().badges.csiGenetics).toBe(true);const completedState=latest;
   await activate(button);await activate(guess(cases[index].match===1?2:1));expect(latest).toBe(completedState);expect(current().forensicGuess).toBe(cases[index].match);expect(xp.mock.calls).toEqual(Array.from({length:index+1},()=>['dnaLab',15,'Solved forensics case']));preserved();}
  expect(toast.mock.calls.some(([message])=>/DNA match confirmed|Not a match/i.test(String(message)))).toBe(false);expect(celebrate).toHaveBeenCalled();
 });

 it('keeps a wrong paternity verdict locked without rewards and explains inherited bands rather than identical full profiles',async()=>{
  await mount({forensicCase:1,forensicGelRun:true});await activate(guess(1));const node=live(status()),button=submit();await activate(button);expect(current().forensicResult).toBe('wrong');expect(current().forensicSolved).toBe(2);expect(document.activeElement).toBe(button);expect(status()).toBe(node);expect(node.textContent).toMatch(/incorrect|not.*match|not.*support|wrong/i);
  expect(workspace().textContent).toMatch(/mother/i);expect(workspace().textContent).toMatch(/450/);expect(workspace().textContent).toMatch(/600/);expect(workspace().textContent).not.toContain('matching samples have identical fragment sizes');const wrong=latest;await activate(button);await activate(guess(2));expect(latest).toBe(wrong);noRewards();preserved();
 });

 it('guards same-turn duplicate submits yet permits the original same-case replay as a new rewarded attempt',async()=>{
  await mount({forensicGelRun:true,forensicGuess:2});const button=submit();button.focus();await act(async()=>{button.click();button.click();button.click();});expect(current().forensicSolved).toBe(3);expect(xp.mock.calls).toEqual([['dnaLab',15,'Solved forensics case']]);const completedState=latest;await activate(button);expect(latest).toBe(completedState);
  const replay=caseButton(0);await activateByKey(replay,' ');expect(document.activeElement).toBe(replay);expectReset(0);expect(current().forensicSolved).toBe(3);await activate(query('#dna-forensic-run'));await activate(guess(2));await activate(submit());expect(current().forensicSolved).toBe(4);expect(xp.mock.calls).toEqual([['dnaLab',15,'Solved forensics case'],['dnaLab',15,'Solved forensics case']]);preserved();
 });

 it('locks the selected sample immediately when Submit and a different guess are activated in the same turn',async()=>{
  await mount({forensicGelRun:true,forensicGuess:2});const button=submit(),correct=guess(2),wrong=guess(1);button.focus();await act(async()=>{button.click();wrong.click();});
  expect(current().forensicResult).toBe('correct');expect(current().forensicGuess).toBe(2);expect(current().forensicSolved).toBe(3);expect(correct.getAttribute('aria-pressed')).toBe('true');expect(wrong.getAttribute('aria-pressed')).toBe('false');expect(document.activeElement).toBe(button);expect(xp.mock.calls).toEqual([['dnaLab',15,'Solved forensics case']]);
  const completedState=latest;await activate(wrong);expect(latest).toBe(completedState);expect(current().forensicGuess).toBe(2);preserved();
 });

 it('cycles Next Case from the fourth case to the first and restores Run focus without autonomous progression',async()=>{
  await mount(completed({forensicCase:3,forensicGuess:1,forensicAI:oldAnalysis}));const node=live(status());await activateByKey(query('#dna-forensic-next'),'Enter');expectReset(0);expect(document.activeElement).toBe(query('#dna-forensic-run'));expect(status()).toBe(node);expect(current().forensicSolved).toBe(2);const reset=latest;await act(async()=>vi.advanceTimersByTime(60000));expect(latest).toBe(reset);noRewards();preserved();
 });

 it('preserves case-button focus while clearing the old attempt and old AI text for a different or same case',async()=>{
  await mount(completed({forensicAI:oldAnalysis}));for(const index of [2,2]){const button=caseButton(index);await activate(button);expect(document.activeElement).toBe(button);expectReset(index);expect(caseButton(index).getAttribute('aria-pressed')).toBe('true');expect(current().forensicSolved).toBe(2);}noRewards();preserved();
 });
});

describe('DNA Forensics owned explanations and safe recovery',()=>{
 it('keeps the stable request button, separate live status and busy explanation region without async focus stealing',async()=>{
  const request=deferred(),ai=vi.fn(()=>request.promise);await mount(completed({forensicAI:oldAnalysis}),ai);const button=aiButton(),node=live(aiStatus()),region=query('#dna-forensic-explanation'),label=nameOf(button);expect(region.getAttribute('role')).toBe('region');expect(nameOf(region).length).toBeGreaterThan(0);
  await activateByKey(button,' ');await flush();expect(ai).toHaveBeenCalledTimes(1);expect(aiButton()).toBe(button);expect(nameOf(button)).toBe(label);expectGuarded(button,true);expect(document.activeElement).toBe(button);expect(region.getAttribute('aria-busy')).toBe('true');expect(node.closest('[aria-busy="true"]')).toBeNull();expect(live(aiStatus())).toBe(node);expect(region.textContent).toContain(oldAnalysis);
  const pending=latest;await activate(button);expect(latest).toBe(pending);outside.focus();await settle(request,freshAnalysis);expect(document.activeElement).toBe(outside);expect(query('#dna-forensic-explanation')).toBe(region);expect(region.getAttribute('aria-busy')).toBe('false');expect(region.textContent).toContain(freshAnalysis);expect(aiStatus()).toBe(node);expectGuarded(button,false);noRewards();preserved();
 });

 it('retains the focused request button when its provider disappears before a rejected or invalid response',async()=>{
  for(const failed of [true,false]){const request=deferred(),ai=vi.fn(()=>request.promise);await remount(completed(),ai);const button=aiButton();await activate(button);await flush();expect(document.activeElement).toBe(button);provider=null;await redraw();expect(aiButton()).toBe(button);expect(document.activeElement).toBe(button);
   await settle(request,failed?Error('Rejected after provider removal'):{text:'Invalid nonstring prose'},failed);expect(current().forensicAILoading).toBe(false);expect(current().forensicAI).toBeNull();expect(aiButton()).toBe(button);expect(document.activeElement).toBe(button);expectGuarded(button,true);expect(live(aiStatus()).textContent).toMatch(/unavailable|could not|couldn't|failed/i);
   expect(current().forensicResult).toBe('correct');expect(current().forensicGuess).toBe(2);expect(current().forensicSolved).toBe(2);noRewards();preserved();}
 });

 it('adopts plain nonempty prose and safely recovers rejected, throwing, empty or nonstring provider results',async()=>{
  const failures=[()=>{throw Error('Synchronous failure');},()=>Promise.reject(Error('Rejected provider')),()=>null,()=>undefined,()=>42,()=>({text:'Not a string'}),()=>'',()=>'   '];
  const plain=vi.fn(()=>freshAnalysis);await mount(completed(),plain);await activate(aiButton());await flush();expect(current().forensicAI).toBe(freshAnalysis);expect(current().forensicAILoading).toBe(false);noRewards();
  for(const failure of failures){const ai=vi.fn(failure);await remount(completed(),ai);await activate(aiButton());await flush();expect(current().forensicAILoading).toBe(false);expectGuarded(aiButton(),false);expect(live(aiStatus()).textContent).toMatch(/unavailable|could not|couldn't|failed/i);expect(query('#dna-forensic-explanation').textContent).not.toContain('[object Object]');expect(ai).toHaveBeenCalledTimes(1);expect(current().forensicResult).toBe('correct');expect(current().forensicSolved).toBe(2);noRewards();preserved();}
 });

 it('supplies all unchanged paternity fragments and the unexplained child bands to the AI without claiming identical profiles',async()=>{
  const request=deferred(),ai=vi.fn(()=>request.promise);await mount(completed({forensicCase:1}),ai);await activate(aiButton());await flush();const prompt=ai.mock.calls[0][0];expect(prompt).toContain('Paternity Test');expect(prompt).toContain('BamHI');for(const[label,fragments]of cases[1].samples){expect(prompt).toContain(label);expect(prompt).toMatch(new RegExp(fragments.join('\\s*,\\s*')));}
  expect(prompt).toMatch(/450\D+600/);expect(prompt).toMatch(/not.*mother|unaccounted|unexplained|inherited/i);expect(prompt).not.toContain('share identical fragment sizes');expect(current().forensicGuess).toBe(2);noRewards();preserved();
 });

 it('stops waiting locally, keeps earlier prose and restores the trigger or Submit when its provider disappears',async()=>{
  for(const removeProvider of [false,true]){const request=deferred(),ai=vi.fn(()=>request.promise);await remount(completed({forensicAI:oldAnalysis}),ai);await activate(aiButton());await flush();if(removeProvider){provider=null;await redraw();}
   await activateByKey(query('#dna-forensic-ai-stop'),' ');expect(current().forensicAILoading).toBe(false);expect(current().forensicAI).toBe(oldAnalysis);expect(document.activeElement).toBe(removeProvider?submit():aiButton());const stopped=latest;await settle(request,freshAnalysis);expect(latest).toBe(stopped);expect(current().forensicSolved).toBe(2);noRewards();preserved();}
 });

 it('invalidates old explanations on same-case replay and case switching before either a late success or failure',async()=>{
  for(const target of [1,2]){const request=deferred(),ai=vi.fn(()=>request.promise);await remount(completed({forensicCase:1,forensicAI:oldAnalysis}),ai);await activate(aiButton());await flush();const button=caseButton(target);await activate(button);expectReset(target);expect(document.activeElement).toBe(button);const selected=latest;await settle(request,target===1?freshAnalysis:Error('Late rejection'),target===2);expect(latest).toBe(selected);expectReset(target);noRewards();preserved();}
 });

 it('cancels a pending explanation when Next cycles the case and prevents late prose or loading changes',async()=>{
  const request=deferred(),ai=vi.fn(()=>request.promise);await mount(completed({forensicCase:3,forensicGuess:1,forensicAI:oldAnalysis}),ai);await activate(aiButton());await flush();await activate(query('#dna-forensic-next'));expectReset(0);expect(document.activeElement).toBe(query('#dna-forensic-run'));const next=latest;await settle(request,freshAnalysis);expect(latest).toBe(next);expectReset(0);noRewards();preserved();
 });

 it('invalidates offscreen and unmounted work without applying later text, rewards or focus changes',async()=>{
  const away=deferred(),removed=deferred(),ai=vi.fn().mockReturnValueOnce(away.promise).mockReturnValueOnce(removed.promise);await mount(completed({forensicAI:oldAnalysis}),ai);await activate(aiButton());await flush();await commit({tab:'learn'});const offscreen=latest;outside.focus();await settle(away,freshAnalysis);expect(latest).toBe(offscreen);expect(document.activeElement).toBe(outside);await commit({tab:'forensics'});expect(current().forensicAILoading).toBe(false);expect(current().forensicAI).toBe(oldAnalysis);
  await activate(aiButton());await flush();await act(async()=>root.unmount());root=null;const unmounted=latest;outside.focus();await settle(removed,Error('Late unmount rejection'),true);expect(latest).toBe(unmounted);expect(document.activeElement).toBe(outside);noRewards();preserved();
 });

 it('lets a new completed attempt own its explanation while an old same-case request cannot overwrite it',async()=>{
  const old=deferred(),fresh=deferred(),ai=vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);await mount(completed(),ai);await activate(aiButton());await flush();await activate(caseButton(0));await activate(query('#dna-forensic-run'));await activate(guess(2));await activate(submit());expect(current().forensicSolved).toBe(3);await activate(aiButton());await flush();expect(ai).toHaveBeenCalledTimes(2);const waiting=latest;outside.focus();await settle(old,'Old attempt prose.');expect(latest).toBe(waiting);expect(current().forensicAILoading).toBe(true);await settle(fresh,freshAnalysis);expect(current().forensicAI).toBe(freshAnalysis);expect(current().forensicSolved).toBe(3);expect(document.activeElement).toBe(outside);expect(xp.mock.calls).toEqual([['dnaLab',15,'Solved forensics case']]);preserved();
 });

 it('recovers orphaned saved loading without calling a provider, erasing prior work, awarding or moving focus',async()=>{
  const ai=vi.fn(()=>freshAnalysis);await mount(completed({forensicCase:1,forensicAILoading:true,forensicAI:oldAnalysis}),ai);await flush();expect(current().forensicAILoading).toBe(false);expect(current().forensicAI).toBe(oldAnalysis);expect(current().forensicCase).toBe(1);expect(current().forensicGuess).toBe(2);expect(current().forensicGelRun).toBe(true);expect(current().forensicResult).toBe('correct');expect(current().forensicSolved).toBe(2);expect(document.activeElement).toBe(outside);expect(ai).not.toHaveBeenCalled();noRewards();preserved();
 });
});
