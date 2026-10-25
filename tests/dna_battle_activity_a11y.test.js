// @vitest-environment jsdom
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {React,ReactDOMClient,loadTool,makeCtx,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

const h=React.createElement,act=React.act;
const sibling=Object.freeze({draft:'Keep the ecology field observation.',revision:9});
const expansion=Object.freeze({expSection:'glossary',learnerNote:'Keep the reference note.'});
const evidence=Object.freeze({claim:'A changed codon needs molecular evidence.'});
const order=Object.freeze([0,1,2,3,4,5,6,7,8,9]);
// Independent authored teaching fixtures, not values extracted from the implementation.
const questions=[
 {q:'What enzyme reads DNA and builds mRNA?',a:'RNA Polymerase',hint:'RNA Pol'},
 {q:'Name one of the three STOP codons.',a:'UAA,UAG,UGA',hint:'U-A-A, U-A-G, or U-G-A'},
 {q:'What holds the two strands of DNA together?',a:'Hydrogen bonds',hint:'Between base pairs'},
 {q:'What cellular structure carries out translation?',a:'Ribosome'},
 {q:'What mutation replaces one base with another?',a:'Substitution'},
 {q:'DNA replication is called semi-conservative because?',a:'Each new DNA has one old strand'},
 {q:'What does the "A" in ATP stand for?',a:'Adenosine'},
 {q:'What structure does tRNA have?',a:'Cloverleaf'},
 {q:'The standard genetic code directly assigns sense codons to how many canonical amino acids?',a:'20'},
 {q:'What is an anticodon?',a:'tRNA sequence that pairs with mRNA codon'}
];
const validAI=JSON.stringify({question:'Which enzyme builds an RNA message?',answer:'RNA Polymerase',hint:'Read the template.'});
const nextAI=JSON.stringify({question:'Which structure builds a protein?',answer:'Ribosome',hint:'Translation site.'});
let config,host,root,outside,latest,setStore,changes,xp,announce,toast,provider,actDescriptor;
const query=selector=>host.querySelector(selector);
const workspace=()=>query('[data-dna-quiz="battle"]');
const input=()=>query('#dna-battle-answer');
const question=()=>query('#dna-battle-question');
const attack=()=>query('#dna-battle-attack');
const hint=()=>query('#dna-battle-hint');
const status=()=>query('#dna-battle-status');
const result=()=>query('#dna-battle-result');
const battle=()=>latest.dnaLab;
function nameOf(node){
 if(node.hasAttribute('aria-label'))return node.getAttribute('aria-label');
 if(node.hasAttribute('aria-labelledby'))return node.getAttribute('aria-labelledby').split(/\s+/).map(id=>document.getElementById(id)?.textContent||'').join(' ').replace(/\s+/g,' ').trim();
 return node.textContent.replace(/\s+/g,' ').trim();
}
function initial(patch={}){return{ecology:sibling,dna:expansion,dnaLab:{tab:'battle',dnaFocusMode:false,dnaGradeOverride:'9-12',visitedTabs:{battle:true},
 dnaSequence:'ATGAAATAA',dnaReportNote:'Keep my uncertainty reflection.',dnaEvidenceReasoning:'Compare the before and after codons.',learningEvidence:evidence,score:7,
 badges:{earlierBadge:true},battleRound:0,battlePlayerHP:100,battleEnemyHP:100,battleOrder:[],battleAnswer:'',battleFeedback:'',battleDone:false,battleWon:false,
 battleUseAI:false,battleAIQ:null,battleAILoading:false,...patch}};}
function Host({seed}){
 const [store,update]=React.useState(seed);latest=store;setStore=update;
 const setToolData=React.useCallback(arg=>{changes(arg);update(prev=>typeof arg==='function'?arg(prev):arg);},[]);
 return config.render(makeCtx({toolData:store,setToolData,awardXP:xp,announceToSR:announce,addToast:toast,callGemini:provider,callTTS:null,callImagen:null}));
}
async function mount(patch={},suppliedProvider=provider){provider=suppliedProvider;outside.focus();await act(async()=>{root.render(h(Host,{seed:initial(patch)}));});}
async function remount(patch={},suppliedProvider=provider){await act(async()=>root.unmount());root=ReactDOMClient.createRoot(host);await mount(patch,suppliedProvider);}
async function commit(patch){await act(async()=>{setStore(prev=>({...prev,dnaLab:{...prev.dnaLab,...patch}}));});}
async function activate(node){expect(node).not.toBeNull();expect(node).toBeDefined();node.focus();await act(async()=>node.click());}
async function key(node,keyValue,options={}){expect(node).not.toBeNull();node.focus();const event=new KeyboardEvent('keydown',{key:keyValue,bubbles:true,cancelable:true,...options});await act(async()=>node.dispatchEvent(event));return event;}
// jsdom has no browser default button activation. Supply only its native click;
// a real browser suite is needed for Tab, Enter/Space defaults and visual focus.
async function activateByKey(node,keyValue){expect(node.tagName).toBe('BUTTON');node.focus();await act(async()=>{const event=new KeyboardEvent('keydown',{key:keyValue,bubbles:true,cancelable:true});node.dispatchEvent(event);
 if(keyValue==='Enter'&&!event.defaultPrevented)node.click();node.dispatchEvent(new KeyboardEvent('keyup',{key:keyValue,bubbles:true,cancelable:true}));if(keyValue===' '&&!event.defaultPrevented)node.click();});}
async function flush(){await act(async()=>{await Promise.resolve();await Promise.resolve();await Promise.resolve();});}
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};}
async function settle(request,value,failed=false){await act(async()=>{request[failed?'reject':'resolve'](value);await Promise.resolve();await Promise.resolve();await Promise.resolve();});}
function preserved(){expect(latest.ecology).toBe(sibling);expect(latest.dna).toBe(expansion);expect(battle().learningEvidence).toBe(evidence);
 expect(battle().dnaSequence).toBe('ATGAAATAA');expect(battle().dnaReportNote).toBe('Keep my uncertainty reflection.');expect(battle().dnaEvidenceReasoning).toBe('Compare the before and after codons.');expect(battle().score).toBe(7);expect(battle().badges.earlierBadge).toBe(true);}
function live(){const node=status();expect(node).not.toBeNull();expect(node.getAttribute('role')).toBe('status');expect(node.getAttribute('aria-live')).toBe('polite');expect(node.getAttribute('aria-atomic')).toBe('true');return node;}
function noRewards(){expect(xp).not.toHaveBeenCalled();}
function active(patch={}){return{battleOrder:[...order],...patch};}
function expectStaticFallback(round,expectedOrder,player=100,enemy=100){expect(battle().battleUseAI).toBe(false);expect(battle().battleAIQ).toBeNull();expect(battle().battleAILoading).toBe(false);expect(battle().battleRound).toBe(round);expect(battle().battleOrder).toBe(expectedOrder);
 expect(battle().battlePlayerHP).toBe(player);expect(battle().battleEnemyHP).toBe(enemy);expect(question().textContent).toContain(questions[expectedOrder[round]].q);}

beforeEach(()=>{
 actDescriptor=Object.getOwnPropertyDescriptor(globalThis,'IS_REACT_ACT_ENVIRONMENT');globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 vi.useFakeTimers();resetStemLab();config=loadTool('stem_lab/stem_tool_dna.js','dnaLab');changes=vi.fn();xp=vi.fn();announce=vi.fn();toast=vi.fn();provider=null;
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);vi.spyOn(Math,'random').mockReturnValue(0);
 host=document.createElement('div');outside=document.createElement('button');outside.textContent='Host navigation';document.body.append(outside,host);root=ReactDOMClient.createRoot(host);
});
afterEach(async()=>{try{if(root)await act(async()=>root.unmount());}finally{host?.remove();outside?.remove();vi.clearAllTimers();vi.useRealTimers();vi.restoreAllMocks();root=null;host=null;setStore=null;config=null;
 if(actDescriptor)Object.defineProperty(globalThis,'IS_REACT_ACT_ENVIRONMENT',actDescriptor);else delete globalThis.IS_REACT_ACT_ENVIRONMENT;}});

describe('DNA Battle semantics and immediate static play',()=>{
 it('keeps an initially empty persistent status, visible answer label, prompt description and named health meters without taking saved-state focus',async()=>{
  await mount();expect(workspace()).not.toBeNull();const node=live();expect(node.textContent).toBe('');expect(document.activeElement).toBe(outside);noRewards();
  await commit(active({battlePlayerHP:73,battleEnemyHP:49}));expect(status()).toBe(node);expect(question().tagName).toBe('H3');expect(question().tabIndex).toBe(-1);expect(question().textContent).toContain(questions[0].q);expect(question().textContent).toMatch(/Round\s+1\s*(?:of|\/)\s*10/i);
  const answer=input();expect(answer.labels).toHaveLength(1);expect(answer.labels[0].textContent).toBe('Your battle answer');expect(answer.labels[0].htmlFor).toBe(answer.id);
  const described=answer.getAttribute('aria-describedby').split(/\s+/);expect(described).toContain('dna-battle-question');expect(described).toContain('dna-battle-help');for(const id of described)expect(document.getElementById(id)).not.toBeNull();
  for(const [id,label,value] of [['player','Your health',73],['enemy','Virus health',49]]){const meter=query(`[data-dna-battle-health="${id}"]`);expect(meter.getAttribute('role')).toBe('meter');expect(nameOf(meter)).toBe(label);expect(meter.getAttribute('aria-valuemin')).toBe('0');expect(meter.getAttribute('aria-valuemax')).toBe('100');expect(meter.getAttribute('aria-valuenow')).toBe(String(value));}
  for(const control of [attack(),hint()]){expect(control.tagName).toBe('BUTTON');expect(control.type).toBe('button');}expect(document.activeElement).toBe(outside);noRewards();preserved();
 });

 it('shuffles all ten authored questions by the existing Fisher–Yates rule and focuses the first explicit Start question',async()=>{
  await mount();await activateByKey(query('#dna-battle-start'),' ');expect(battle().battleOrder).toEqual([1,2,3,4,5,6,7,8,9,0]);expect(new Set(battle().battleOrder).size).toBe(10);
  expect(battle().battleRound).toBe(0);expect(battle().battlePlayerHP).toBe(100);expect(battle().battleEnemyHP).toBe(100);expect(document.activeElement).toBe(question());expect(question().textContent).toContain(questions[1].q);expect(input().value).toBe('');noRewards();preserved();
 });

 it('shows a neutral hint in the same status without advancing, damaging or awarding',async()=>{
  await mount(active());const node=live(),before=battle();await activateByKey(hint(),'Enter');expect(status()).toBe(node);expect(node.textContent).toContain(questions[0].hint);
  expect(node.className+' '+node.getAttribute('style')).toMatch(/amber|#(?:b45309|92400e|78350f)/i);expect(battle().battleRound).toBe(before.battleRound);expect(battle().battleOrder).toBe(before.battleOrder);expect(battle().battlePlayerHP).toBe(100);expect(battle().battleEnemyHP).toBe(100);expect(document.activeElement).toBe(hint());noRewards();preserved();
 });

 it('accepts case-insensitive comma alternatives and containing answers, deals 19 damage and immediately clears/advances',async()=>{
  Math.random.mockReturnValue(.999);await mount(active({battleRound:1,battleAnswer:'  I think uAg is a STOP codon  '}));const node=live();await key(input(),'Enter');
  expect(battle().battleEnemyHP).toBe(81);expect(battle().battlePlayerHP).toBe(100);expect(battle().battleRound).toBe(2);expect(battle().battleAnswer).toBe('');expect(battle().battleDone).toBe(false);expect(question().textContent).toContain(questions[2].q);expect(status()).toBe(node);expect(node.textContent).toMatch(/Correct.*19/i);expect(node.textContent).toContain(questions[2].q);
  expect(xp.mock.calls).toEqual([['dnaLab',5,'Battle correct']]);await act(async()=>vi.advanceTimersByTime(60000));expect(battle().battleRound).toBe(2);preserved();
 });

 it('applies the existing wrong-answer damage and first accepted answer while immediately showing the next prompt',async()=>{
  Math.random.mockReturnValue(.999);await mount(active({battleAnswer:'Definitely not an enzyme'}));await activate(attack());expect(battle().battlePlayerHP).toBe(83);expect(battle().battleEnemyHP).toBe(100);expect(battle().battleRound).toBe(1);expect(battle().battleAnswer).toBe('');expect(live().textContent).toContain('RNA Polymerase');expect(live().textContent).toMatch(/17/);expect(question().textContent).toContain(questions[1].q);noRewards();preserved();
 });

 it('ignores blank answers, composing Enter, legacy IME key229 and repeated Enter without consuming a round',async()=>{
  await mount(active());await key(input(),'Enter');await activate(attack());expect(battle().battleRound).toBe(0);noRewards();await commit({battleAnswer:'RNA Polymerase'});
  for(const options of [{isComposing:true},{keyCode:229},{repeat:true}]){await key(input(),'Enter',options);expect(battle().battleRound).toBe(0);expect(battle().battleEnemyHP).toBe(100);noRewards();}
  await key(input(),'Enter');expect(battle().battleRound).toBe(1);expect(battle().battleEnemyHP).toBe(88);expect(xp.mock.calls).toEqual([['dnaLab',5,'Battle correct']]);preserved();
 });

 it('guards same-turn Attack/Enter duplicates and unlocks only for a newly committed round',async()=>{
  await mount(active({battleAnswer:'RNA Polymerase'}));const button=attack(),answer=input();button.focus();await act(async()=>{button.click();button.click();answer.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));});
  expect(battle().battleRound).toBe(1);expect(battle().battleEnemyHP).toBe(88);expect(xp.mock.calls).toEqual([['dnaLab',5,'Battle correct']]);await commit({battleAnswer:'UGA'});await activateByKey(attack(),' ');expect(battle().battleRound).toBe(2);expect(battle().battleEnemyHP).toBe(76);expect(xp.mock.calls).toEqual([['dnaLab',5,'Battle correct'],['dnaLab',5,'Battle correct']]);preserved();
 });

 it.each([
  {label:'enemy health reaches zero',round:0,player:80,enemy:12,answer:'RNA Polymerase',won:true,playerAfter:80,enemyAfter:0,correct:true},
  {label:'player health reaches zero',round:0,player:10,enemy:80,answer:'not correct',won:false,playerAfter:0,enemyAfter:80,correct:false},
  {label:'round ten ends in the existing health tie win',round:9,player:88,enemy:100,answer:'tRNA sequence that pairs with mRNA codon',won:true,playerAfter:88,enemyAfter:88,correct:true}
 ])('completes when $label, focuses its result and grants exactly the established rewards',async example=>{
  await mount(active({battleRound:example.round,battlePlayerHP:example.player,battleEnemyHP:example.enemy,battleAnswer:example.answer}));const node=live();await activate(attack());
  expect(battle().battleDone).toBe(true);expect(battle().battleWon).toBe(example.won);expect(battle().battleRound).toBe(example.round+1);expect(battle().battlePlayerHP).toBe(example.playerAfter);expect(battle().battleEnemyHP).toBe(example.enemyAfter);expect(result().tagName).toBe('H3');expect(result().tabIndex).toBe(-1);expect(document.activeElement).toBe(result());expect(result().getAttribute('aria-describedby')).toContain('dna-battle-result-summary');
  expect(query('#dna-battle-result-summary').textContent).toContain(String(example.playerAfter));expect(query('#dna-battle-result-summary').textContent).toContain(String(example.enemyAfter));expect(status()).toBe(node);
  const expected=[];if(example.correct)expected.push(['dnaLab',5,'Battle correct']);if(example.won)expected.push(['dnaLab',25,'Won Gene Defense battle']);expect(xp.mock.calls).toEqual(expected);expect(battle().badges.geneWarrior).toBe(example.won?true:undefined);
  const done=latest;await key(result(),'Enter');await act(async()=>vi.advanceTimersByTime(60000));expect(latest).toBe(done);expect(xp.mock.calls).toEqual(expected);preserved();
 });

 it('leaves a saved completion focus alone and an explicit rematch resets only battle play without awarding',async()=>{
  await mount(active({battleRound:10,battleDone:true,battleWon:true,battlePlayerHP:42,battleEnemyHP:0,battleFeedback:'Correct! Last attack.',badges:{earlierBadge:true,geneWarrior:true}}));expect(document.activeElement).toBe(outside);const node=live();
  await activateByKey(query('#dna-battle-rematch'),'Enter');expect(document.activeElement).toBe(question());expect(battle().battleRound).toBe(0);expect(battle().battlePlayerHP).toBe(100);expect(battle().battleEnemyHP).toBe(100);expect(battle().battleOrder).toEqual([1,2,3,4,5,6,7,8,9,0]);expect(battle().battleDone).toBe(false);expect(battle().battleWon).toBe(false);expect(battle().battleAnswer).toBe('');expect(status()).toBe(node);noRewards();preserved();
 });
});

describe('DNA Battle asynchronous question ownership and recovery',()=>{
 it('keeps pending question/input/actions mounted and guarded, then resolves without stealing outside focus',async()=>{
  const request=deferred(),ai=vi.fn(()=>request.promise);await mount({},ai);const node=live();await activateByKey(query('#dna-battle-ai-start'),' ');await flush();expect(ai).toHaveBeenCalledTimes(1);
  const answer=input(),prompt=question(),attackButton=attack(),hintButton=hint();expect(answer).not.toBeNull();expect(answer.readOnly).toBe(true);expect(battle().battleAILoading).toBe(true);expect(attackButton.getAttribute('aria-disabled')).toBe('true');expect(hintButton.getAttribute('aria-disabled')).toBe('true');expect(node.closest('[aria-busy="true"]')).toBeNull();
  const pending=battle();await activate(attackButton);await activate(hintButton);await key(answer,'Enter');expect(battle().battleRound).toBe(pending.battleRound);expect(battle().battlePlayerHP).toBe(100);expect(battle().battleEnemyHP).toBe(100);noRewards();
  outside.focus();await settle(request,validAI);expect(document.activeElement).toBe(outside);expect(input()).toBe(answer);expect(question()).toBe(prompt);expect(attack()).toBe(attackButton);expect(hint()).toBe(hintButton);expect(status()).toBe(node);expect(answer.readOnly).toBe(false);expect(battle().battleAILoading).toBe(false);expect(question().textContent).toContain('Which enzyme builds an RNA message?');noRewards();preserved();
 });

 it('adopts a plain valid provider value and retains answer focus/DOM while the next explicit answer requests its AI round',async()=>{
  const request=deferred(),ai=vi.fn().mockReturnValueOnce(validAI).mockReturnValueOnce(request.promise);await mount({},ai);await activate(query('#dna-battle-ai-start'));await flush();expect(battle().battleAIQ.a).toBe('RNA Polymerase');const answer=input(),prompt=question();await commit({battleAnswer:'RNA Polymerase'});await key(answer,'Enter');await flush();
  expect(battle().battleRound).toBe(1);expect(battle().battleEnemyHP).toBe(88);expect(battle().battleAILoading).toBe(true);expect(input()).toBe(answer);expect(question()).toBe(prompt);expect(answer.readOnly).toBe(true);expect(document.activeElement).toBe(answer);expect(ai).toHaveBeenCalledTimes(2);expect(xp.mock.calls).toEqual([['dnaLab',5,'Battle correct']]);
  outside.focus();await settle(request,nextAI);expect(document.activeElement).toBe(outside);expect(answer.readOnly).toBe(false);expect(question().textContent).toContain('Which structure builds a protein?');expect(battle().battleRound).toBe(1);preserved();
 });

 it('recovers synchronous throws, rejection, malformed JSON and wrong/empty field types to the existing static order without rewards',async()=>{
  const failures=[()=>{throw Error('Synchronous provider failure');},()=>Promise.reject(Error('Rejected provider')),()=>'{bad json',()=>JSON.stringify({question:{text:'Invalid'},answer:'DNA'}),()=>JSON.stringify({question:'Valid prompt?',answer:42}),()=>JSON.stringify({question:'   ',answer:'DNA'}),()=>JSON.stringify({question:'Valid prompt?',answer:'   '}),()=>JSON.stringify({question:'Valid prompt?',answer:'DNA',hint:{text:'Invalid'}})];
  for(const failure of failures){const ai=vi.fn(failure);await remount({},ai);await activate(query('#dna-battle-ai-start'));await flush();const shuffled=battle().battleOrder;expect(shuffled).toEqual([1,2,3,4,5,6,7,8,9,0]);expectStaticFallback(0,shuffled);expect(input().readOnly).toBe(false);expect(live().textContent).toMatch(/static|unavailable|could not|fallback/i);expect(ai).toHaveBeenCalledTimes(1);noRewards();preserved();}
 });

 it('stops local AI generation at the current round without resetting HP/order and ignores its later completion',async()=>{
  const request=deferred(),ai=vi.fn(()=>request.promise);await mount({},ai);await activate(query('#dna-battle-ai-start'));await flush();await commit({battlePlayerHP:67,battleEnemyHP:58});const shuffled=battle().battleOrder;input().focus();await activateByKey(query('#dna-battle-ai-stop'),' ');
  expectStaticFallback(0,shuffled,67,58);expect(input().readOnly).toBe(false);expect(document.activeElement).not.toBe(document.body);const stopped=latest;await settle(request,validAI);expect(latest).toBe(stopped);expectStaticFallback(0,shuffled,67,58);noRewards();preserved();
 });

 it('lets a newer AI rematch own its response while an older success cannot overwrite the restarted game',async()=>{
  const old=deferred(),fresh=deferred(),ai=vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);await mount({},ai);await activate(query('#dna-battle-ai-start'));await flush();await commit({battleDone:true,battleWon:false});await activate(query('#dna-battle-ai-rematch'));await flush();const restarted=latest;expect(ai).toHaveBeenCalledTimes(2);
  outside.focus();await settle(old,validAI);expect(latest).toBe(restarted);expect(battle().battleAILoading).toBe(true);expect(document.activeElement).toBe(outside);await settle(fresh,nextAI);expect(question().textContent).toContain('Which structure builds a protein?');expect(battle().battleRound).toBe(0);expect(battle().battlePlayerHP).toBe(100);expect(battle().battleEnemyHP).toBe(100);expect(document.activeElement).toBe(outside);noRewards();preserved();
 });

 it('rejects responses for replaced order/round state and leaves the current HP, answer and prompt untouched',async()=>{
  const request=deferred(),ai=vi.fn(()=>request.promise);await mount({},ai);await activate(query('#dna-battle-ai-start'));await flush();await commit({battleOrder:[...order],battleRound:3,battlePlayerHP:61,battleEnemyHP:37,battleUseAI:false,battleAILoading:false,battleAIQ:null,battleAnswer:'Keep this answer'});const replacement=latest;outside.focus();await settle(request,validAI);
  expect(latest).toBe(replacement);expect(battle().battleRound).toBe(3);expect(battle().battlePlayerHP).toBe(61);expect(battle().battleEnemyHP).toBe(37);expect(input().value).toBe('Keep this answer');expect(question().textContent).toContain(questions[3].q);expect(document.activeElement).toBe(outside);noRewards();preserved();
 });

 it('invalidates offscreen and unmounted requests so late failures cannot change saved state, rewards or focus',async()=>{
  const away=deferred(),removed=deferred(),ai=vi.fn().mockReturnValueOnce(away.promise).mockReturnValueOnce(removed.promise);await mount({},ai);await activate(query('#dna-battle-ai-start'));await flush();await commit({tab:'learn'});const offscreen=latest;outside.focus();await settle(away,Error('Late offscreen rejection'),true);expect(latest).toBe(offscreen);expect(document.activeElement).toBe(outside);noRewards();
  await commit({tab:'battle'});expect(battle().battleAILoading).toBe(false);expect(battle().battleUseAI).toBe(false);await commit({battleDone:true,battleWon:false});await activate(query('#dna-battle-ai-rematch'));await flush();expect(ai).toHaveBeenCalledTimes(2);
  await act(async()=>root.unmount());root=null;const before=latest,calls=changes.mock.calls.length;outside.focus();await settle(removed,Error('Late unmount rejection'),true);expect(latest).toBe(before);expect(changes).toHaveBeenCalledTimes(calls);expect(document.activeElement).toBe(outside);noRewards();preserved();
 });

 it('recovers an orphaned saved loading state without calling the provider, changing battle progress or taking focus',async()=>{
  const ai=vi.fn(()=>Promise.resolve(validAI)),savedOrder=[...order].reverse();await mount({battleOrder:savedOrder,battleRound:4,battlePlayerHP:72,battleEnemyHP:53,battleUseAI:true,battleAILoading:true,battleAIQ:null,battleAnswer:'Keep my draft'},ai);await flush();expectStaticFallback(4,savedOrder,72,53);expect(input().value).toBe('Keep my draft');expect(input().readOnly).toBe(false);expect(document.activeElement).toBe(outside);expect(ai).not.toHaveBeenCalled();noRewards();preserved();
 });
});
