import {test,expect,type Locator,type Page} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {GlHarness} from './helpers/stem_gl_harness';

test.use({video:'off',trace:'off'});
test.describe.configure({retries:0,timeout:300000});
const output=resolve(process.env.DNA_QUIZ_WCAG_REPORT||'reports/dna-quiz-wcag-20261024');
const harness=new GlHarness({toolId:'dnaLab',toolFile:'stem_lab/stem_tool_dna.js',width:1120,height:900,appStyles:true,layout:'document'});
const sibling={observations:['Keep the earlier ecology evidence.'],revision:4};
const expansion={expSection:null,traceTrait:{puzzles:{p1:{pick:'autosomal_recessive',ranking:['skip_generations','unaffected_carriers','no_sex_bias','present_in_homozygote'],revealed:true}},score:1},learnerNote:'Keep the inheritance reasoning.'};
const saved={dnaSequence:'ATGGCTTTTTAA',dnaReportNote:'Keep my earlier claim.',dnaCompareReflection:'Keep this comparison.',dnaEvidenceReasoning:'Keep the codon evidence.',dnaScenarioScore:2,
 mutationLog:[],dnaExperimentHistory:[{id:'control',label:'Earlier control',dnaSequence:'ATGAAATAA'}]};
const ordered=[0,1,2,3,4,5,6,7,8,9];
const shuffledByZero=[1,2,3,4,5,6,7,8,9,0];
const battleQuestions=[
 'What enzyme reads DNA and builds mRNA?','Name one of the three STOP codons.','What holds the two strands of DNA together?',
 'What cellular structure carries out translation?','What mutation replaces one base with another?','DNA replication is called semi-conservative because?',
 'What does the "A" in ATP stand for?','What structure does tRNA have?',
 'The standard genetic code directly assigns sense codons to how many canonical amino acids?','What is an anticodon?'
];
const scope=(kind:string)=>'[data-dna-quiz="'+kind+'"]';
const clone=(value:any)=>JSON.parse(JSON.stringify(value));

test.beforeAll(async()=>{mkdirSync(output,{recursive:true});await harness.start();});
test.afterAll(async()=>{await harness.stop();});
test.afterEach(async({page})=>{await harness.destroy(page);});
function report(name:string,value:unknown){writeFileSync(resolve(output,name),JSON.stringify(value,null,2));}
async function store(page:Page){return page.evaluate(()=>JSON.parse(JSON.stringify((window as any).__toolData)));}
async function state(page:Page){return(await store(page)).dnaLab;}
async function patch(page:Page,values:Record<string,unknown>){await page.evaluate(values=>(window as any).__ctx.setToolData((p:any)=>({...p,dnaLab:{...p.dnaLab,...values}})),values);}
async function activate(page:Page,node:Locator,key='Enter'){await node.focus();await page.keyboard.press(key);}
async function setup(page:Page,kind='challenge',extra:Record<string,unknown>={}){
 await page.emulateMedia({reducedMotion:'reduce',forcedColors:'none'});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await harness.mount(page,{dnaLab:{...clone(saved),tab:kind,dnaFocusMode:false,dnaGradeOverride:'9-12',showHelix3d:false,
  animPlaying:false,replPlaying:false,transPlaying:false,guidedStarted:false,guidedAnswers:{},dnaReportOpen:false,
  score:7,challengeTier:0,challengeStreak:0,challengeQ:null,challengeAnswer:'',challengeFeedback:'',challengeSolved:false,aiChallengeLoading:false,
  battleOrder:[],battleRound:0,battlePlayerHP:100,battleEnemyHP:100,battleAnswer:'',battleFeedback:'',battleDone:false,battleWon:false,battleUseAI:false,battleAIQ:null,battleAILoading:false,...extra},dna:clone(expansion),ecology:clone(sibling)},undefined,{expectCanvas:false});
 await page.locator('#wrap').evaluate((n:HTMLElement)=>Object.assign(n.style,{width:'100%',background:'#fff',color:'#0f172a',colorScheme:'light'}));
 await page.evaluate(()=>{const w=window as any;w.__quizXP=[];w.__quizAnnouncements=[];w.__quizCelebrations=[];w.__quizBeeps=[];w.__quizToasts=[];w.__quizRequests=[];
  const outside=document.createElement('button');outside.id='dna-quiz-outside';outside.textContent='Other workspace action';document.body.append(outside);
  Object.assign(w.__ctx,{gradeLevel:'10th Grade',callGemini:null,callTTS:null,awardXP:(...a:unknown[])=>w.__quizXP.push(a),
   announceToSR:(s:string)=>w.__quizAnnouncements.push(s),celebrate:(...a:unknown[])=>w.__quizCelebrations.push(a),beep:(...a:unknown[])=>w.__quizBeeps.push(a),addToast:(...a:unknown[])=>w.__quizToasts.push(a)});w.__rerender();Math.random=()=>0;});
 await expect(page.locator(scope(kind))).toBeVisible();return{errors,baseline:await store(page)};
}
async function preserved(page:Page,baseline:any){const current=await store(page);for(const key of Object.keys(saved))expect(current.dnaLab[key],key+' remains saved').toEqual(baseline.dnaLab[key]);
 expect(current.dna).toEqual(baseline.dna);expect(current.ecology).toEqual(baseline.ecology);expect(await harness.glContexts(page)).toEqual([]);
}
async function stableStatus(node:Locator){await expect(node).toHaveRole('status');await expect(node).toHaveAttribute('aria-live','polite');await expect(node).toHaveAttribute('aria-atomic','true');}
async function xp(page:Page){return page.evaluate(()=>(window as any).__quizXP);}
async function installProvider(page:Page){await page.evaluate(()=>{const w=window as any;w.__quizRequests=[];w.__ctx.callGemini=(...args:unknown[])=>new Promise((resolve,reject)=>w.__quizRequests.push({args,resolve,reject}));w.__rerender();});}
async function requestCount(page:Page,count:number){await expect.poll(()=>page.evaluate(()=>(window as any).__quizRequests.length)).toBe(count);}
async function resolveRequest(page:Page,index:number,value:unknown,reject=false){await page.evaluate(async({index,value,reject})=>{const r=(window as any).__quizRequests[index];if(!r)throw Error('Missing deferred quiz request '+index);if(reject)r.reject(new Error(String(value)));else r.resolve(value);await new Promise<void>(done=>setTimeout(done,0));},{index,value,reject});}
async function labelledAnswer(page:Page,kind:'challenge'|'battle'){
 const input=page.locator('#dna-'+kind+'-answer'),question=page.locator('#dna-'+kind+'-question');
 await expect(input).toHaveAccessibleName(kind==='challenge'?'Your answer':'Your battle answer');await expect(question).toHaveRole('heading');await expect(question).toHaveAttribute('tabindex','-1');
 expect(await input.evaluate((n:HTMLInputElement)=>!!n.labels?.length&&[...n.labels].some(label=>label.htmlFor===n.id))).toBe(true);
 const refs=(await input.getAttribute('aria-describedby'))?.split(/\s+/)||[];expect(refs).toContain('dna-'+kind+'-question');expect(refs).toContain('dna-'+kind+'-help');
 for(const id of refs)expect(await page.locator('#'+id).count()).toBe(1);return input;
}

test('Challenge difficulty, visible labels and native keyboard checks preserve exact matching and one reward per question',async({page})=>{
 const initial=await setup(page,'challenge',{challengeStreak:2}),root=page.locator(scope('challenge')),status=page.locator('#dna-challenge-status');await stableStatus(status);await expect(status).toHaveText('');await status.evaluate(n=>(window as any).__quizChallengeStatus=n);
 const tiers=root.getByRole('group',{name:'Difficulty for next question',exact:true});await expect(tiers).toBeVisible();const medium=tiers.locator('[data-dna-challenge-tier="1"]');
 await activate(page,medium,'Space');await expect(medium).toHaveAttribute('aria-pressed','true');await expect(tiers.locator('[aria-pressed="true"]')).toHaveCount(1);
 await activate(page,page.locator('#dna-challenge-start'));await expect(page.locator('#dna-challenge-question')).toBeFocused();await expect(page.locator('#dna-challenge-question')).toHaveText('What enzyme unwinds DNA during replication?');
 const input=await labelledAnswer(page,'challenge');await page.keyboard.press('Tab');await expect(input).toBeFocused();await input.fill('  hELICase  ');await page.keyboard.press('Enter');
 await expect(input).toBeFocused();await expect(input).toHaveAttribute('readonly','');await expect(page.locator('#dna-challenge-check')).toHaveAttribute('aria-disabled','true');await expect(status).toContainText(/Correct/i);
 const checked=await state(page);expect(checked.score).toBe(22);expect(checked.challengeStreak).toBe(3);expect(checked.challengeSolved).toBe(true);expect(await xp(page)).toEqual([['dnaLab',10,'Challenge correct']]);
 await page.keyboard.press('Enter');await activate(page,page.locator('#dna-challenge-check'),'Space');await page.locator('#dna-challenge-check').evaluate((n:HTMLButtonElement)=>{n.click();n.click();});expect((await state(page)).score).toBe(22);expect(await xp(page)).toHaveLength(1);
 await activate(page,tiers.locator('[data-dna-challenge-tier="2"]'));await expect(page.locator('#dna-challenge-question')).toHaveText('What enzyme unwinds DNA during replication?');expect((await state(page)).challengeSolved).toBe(true);
 await activate(page,page.locator('#dna-challenge-next'),'Space');await expect(page.locator('#dna-challenge-question')).toBeFocused();await expect(page.locator('#dna-challenge-question')).toHaveText('Name the enzyme that joins Okazaki fragments.');await expect(input).toHaveValue('');await expect(input).not.toHaveAttribute('readonly','');await expect(status).toHaveText('');
 expect(await status.evaluate(n=>n===(window as any).__quizChallengeStatus)).toBe(true);await preserved(page,initial.baseline);expect(initial.errors).toEqual([]);
 report('challenge-keyboard-and-rewards.json',{nativeKeyboard:true,difficultyForNextOnly:true,question:'Helicase',scoreAfterThirdStreak:22,oneReward:true,nextQuestion:'Ligase',stableStatus:true});
});

test('Challenge wrong-answer retry, Hint, composition and repeated Enter use one stable polite result channel',async({page})=>{
 const initial=await setup(page),root=page.locator(scope('challenge'));await activate(page,page.locator('#dna-challenge-start'),'Space');const input=await labelledAnswer(page,'challenge'),status=page.locator('#dna-challenge-status');await expect(page.locator('#dna-challenge-question')).toHaveText('How many strands does DNA have?');
 await input.fill('2 extra');await page.keyboard.press('Enter');await expect(status).toContainText(/answer is 2/i);expect((await state(page)).score).toBe(7);expect(await xp(page)).toEqual([]);await expect(input).not.toHaveAttribute('readonly','');
 await activate(page,page.locator('#dna-challenge-hint'),'Space');await expect(status).toContainText('double');await expect(root.getByRole('alert')).toHaveCount(0);
 await input.fill('2');await input.dispatchEvent('keydown',{key:'Enter',code:'Enter',repeat:true});await input.dispatchEvent('keydown',{key:'Enter',code:'Enter',isComposing:true});expect((await state(page)).score).toBe(7);expect(await xp(page)).toEqual([]);
 await input.focus();await page.keyboard.press('Enter');await expect(status).toContainText(/Correct/i);expect((await state(page)).score).toBe(17);expect(await xp(page)).toEqual([['dnaLab',10,'Challenge correct']]);
 const announcements=await page.evaluate(()=>(window as any).__quizAnnouncements);expect(announcements.filter((s:string)=>/^(Correct!|Incorrect\. Answer:)/.test(s))).toEqual([]);await preserved(page,initial.baseline);expect(initial.errors).toEqual([]);
 report('challenge-retry-and-feedback.json',{exactMatching:true,wrongThenCorrect:true,IMEAndRepeatIgnored:true,onePoliteFeedbackNode:true,duplicateGlobalFeedbackAnnouncements:0});
});

test('Challenge AI completion respects focus and cancellation; stale, malformed and offscreen responses cannot replace newer questions',async({page})=>{
 const initial=await setup(page),question=page.locator('#dna-challenge-question');await installProvider(page);await activate(page,page.locator('#dna-challenge-ai-start'),'Space');await requestCount(page,1);await expect(page.locator('#dna-challenge-ai-start')).toBeFocused();await expect(page.locator('#dna-challenge-status')).toContainText(/generat/i);
 await page.locator('#dna-quiz-outside').focus();await resolveRequest(page,0,JSON.stringify({question:'Which DNA base pairs with adenine?',answer:'Thymine',hint:'Think A–T.'}));await expect(question).toHaveText('Which DNA base pairs with adenine?');await expect(page.locator('#dna-quiz-outside')).toBeFocused();await expect(page.locator('#dna-challenge-answer')).not.toHaveAttribute('readonly','');
 await activate(page,page.locator('#dna-challenge-ai-next'));await requestCount(page,2);await expect(page.locator('#dna-challenge-ai-next')).toBeFocused();await expect(page.locator('#dna-challenge-answer')).toHaveAttribute('readonly','');
 await activate(page,page.locator('#dna-challenge-ai-stop'),'Space');await expect(page.locator('#dna-challenge-ai-next')).toBeFocused();expect((await state(page)).aiChallengeLoading).toBe(false);
 await resolveRequest(page,1,JSON.stringify({question:'Obsolete stopped question',answer:'A'}));await expect(question).toHaveText('Which DNA base pairs with adenine?');
 await activate(page,page.locator('#dna-challenge-ai-next'));await requestCount(page,3);await resolveRequest(page,2,JSON.stringify({question:'Invalid answer shape',answer:{unexpected:true}}));await expect(question).toHaveText('How many strands does DNA have?');await expect(question).toBeFocused();expect((await state(page)).aiChallengeLoading).toBe(false);await expect(page.locator('#dna-challenge-answer')).not.toHaveAttribute('readonly','');
 await activate(page,page.locator('#dna-challenge-ai-next'));await requestCount(page,4);await activate(page,page.locator('#dna-challenge-next'),'Space');await expect(question).toBeFocused();const newer=(await state(page)).challengeQ;
 await resolveRequest(page,3,JSON.stringify({question:'Obsolete after static Next',answer:'A'}));expect((await state(page)).challengeQ).toEqual(newer);
 await activate(page,page.locator('#dna-challenge-ai-next'));await requestCount(page,5);await activate(page,page.locator('[data-dna-challenge-tier="2"]'),'Space');expect((await state(page)).aiChallengeLoading).toBe(false);
 await resolveRequest(page,4,JSON.stringify({question:'Obsolete after tier change',answer:'A'}));expect((await state(page)).challengeQ).toEqual(newer);
 await activate(page,page.locator('#dna-challenge-ai-next'));await requestCount(page,6);await resolveRequest(page,5,JSON.stringify({question:'Owned accepted question',answer:'AUG',hint:'A start codon.'}));await expect(question).toHaveText('Owned accepted question');await expect(question).toBeFocused();const owned=(await state(page)).challengeQ;
 await activate(page,page.locator('#dna-challenge-ai-next'));await requestCount(page,7);await page.locator('#dna-quiz-outside').focus();await patch(page,{tab:'battle'});await expect(page.locator(scope('battle'))).toBeVisible();
 await resolveRequest(page,6,JSON.stringify({question:'Obsolete offscreen question',answer:'A'}));expect((await state(page)).challengeQ).toEqual(owned);expect((await state(page)).aiChallengeLoading).toBe(false);await expect(page.locator('#dna-quiz-outside')).toBeFocused();
 expect(await xp(page)).toEqual([]);expect((await state(page)).score).toBe(7);await preserved(page,initial.baseline);expect(initial.errors).toEqual([]);report('challenge-ai-ownership.json',{quietCompletion:true,stopReturnsFocus:true,malformedFallsBack:true,staticNextTierAndNavigationInvalidate:true,staleResponsesIgnored:true,noRewards:true});
});

test('Battle keyboard progression preserves shuffled authored questions, health, comma alternatives, damage and single round rewards',async({page})=>{
 const initial=await setup(page,'battle');await activate(page,page.locator('#dna-battle-start'),'Space');await expect(page.locator('#dna-battle-question')).toBeFocused();expect((await state(page)).battleOrder).toEqual(shuffledByZero);await expect(page.locator('#dna-battle-question')).toContainText(battleQuestions[1]);
 const input=await labelledAnswer(page,'battle'),status=page.locator('#dna-battle-status');await stableStatus(status);await expect(status).toHaveText('');await input.evaluate(n=>(window as any).__quizBattleInput=n);await status.evaluate(n=>(window as any).__quizBattleStatus=n);
 for(const [kind,name]of [['player','Your health'],['enemy','Virus health']]){const meter=page.locator('[data-dna-battle-health="'+kind+'"]');await expect(meter).toHaveRole('meter');await expect(meter).toHaveAccessibleName(name);await expect(meter).toHaveAttribute('aria-valuemin','0');await expect(meter).toHaveAttribute('aria-valuemax','100');await expect(meter).toHaveAttribute('aria-valuenow','100');}
 await page.keyboard.press('Tab');await expect(input).toBeFocused();await input.fill('I choose uAg');await page.keyboard.press('Enter');await expect(input).toBeFocused();await expect(input).toHaveValue('');
 let current=await state(page);expect(current.battleRound).toBe(1);expect(current.battlePlayerHP).toBe(100);expect(current.battleEnemyHP).toBe(88);await expect(status).toContainText(/12 damage/i);await expect(status).toContainText(battleQuestions[2]);expect(await xp(page)).toEqual([['dnaLab',5,'Battle correct']]);
 await activate(page,page.locator('#dna-battle-hint'),'Space');await expect(status).toContainText('Between base pairs');await input.fill('not a bond');await page.keyboard.press('Enter');await expect(input).toBeFocused();current=await state(page);expect(current.battleRound).toBe(2);expect(current.battlePlayerHP).toBe(90);expect(current.battleEnemyHP).toBe(88);await expect(status).toContainText(/10 damage/i);await expect(status).toContainText(battleQuestions[3]);
 await input.fill('Ribosome');await input.dispatchEvent('keydown',{key:'Enter',code:'Enter',repeat:true});await input.dispatchEvent('keydown',{key:'Enter',code:'Enter',isComposing:true});expect((await state(page)).battleRound).toBe(2);
 const attack=page.locator('#dna-battle-attack');await attack.focus();await attack.evaluate((n:HTMLButtonElement)=>{n.click();n.click();});await expect(attack).toBeFocused();current=await state(page);expect(current.battleRound).toBe(3);expect(current.battleEnemyHP).toBe(76);expect(await xp(page)).toEqual([['dnaLab',5,'Battle correct'],['dnaLab',5,'Battle correct']]);
 expect(await input.evaluate(n=>n===(window as any).__quizBattleInput)).toBe(true);expect(await status.evaluate(n=>n===(window as any).__quizBattleStatus)).toBe(true);await expect(page.locator(scope('battle')).getByRole('alert')).toHaveCount(0);await preserved(page,initial.baseline);expect(initial.errors).toEqual([]);
 report('battle-keyboard-progression.json',{shuffledOrder:shuffledByZero,commaAlternativeSubstringMatch:true,correctDamage:12,wrongDamage:10,round:3,playerHP:90,enemyHP:76,sameInputAndStatus:true,singleAwardPerRound:true});
});

test('Battle completion moves focus to a described result, retains tie-as-win rewards once and starts a fresh rematch',async({page})=>{
 const initial=await setup(page,'battle',{battleOrder:ordered,battleRound:9,battlePlayerHP:60,battleEnemyHP:50,battleAnswer:'Wrong answer'}),attack=page.locator('#dna-battle-attack');await activate(page,attack,'Space');
 const result=page.locator('#dna-battle-result');await expect(result).toHaveRole('heading');await expect(result).toHaveAttribute('tabindex','-1');await expect(result).toBeFocused();await expect(result).toContainText(/Victory|Cell Defended/i);await expect(result).toHaveAttribute('aria-describedby','dna-battle-result-summary');await expect(page.locator('#dna-battle-result-summary')).toContainText('50');
 let current=await state(page);expect(current.battleRound).toBe(10);expect(current.battlePlayerHP).toBe(50);expect(current.battleEnemyHP).toBe(50);expect(current.battleDone).toBe(true);expect(current.battleWon).toBe(true);expect(await xp(page)).toEqual([['dnaLab',25,'Won Gene Defense battle']]);
 await page.keyboard.press('Enter');expect(await xp(page)).toHaveLength(1);await activate(page,page.locator('#dna-battle-rematch'),'Space');await expect(page.locator('#dna-battle-question')).toBeFocused();current=await state(page);expect(current.battleRound).toBe(0);expect(current.battlePlayerHP).toBe(100);expect(current.battleEnemyHP).toBe(100);expect(current.battleOrder).toEqual(shuffledByZero);expect(current.battleDone).toBe(false);
 await patch(page,{battleOrder:ordered,battleRound:0,battlePlayerHP:10,battleEnemyHP:80,battleAnswer:'Wrong answer',battleDone:false,battleWon:false});await activate(page,page.locator('#dna-battle-attack'));await expect(result).toBeFocused();await expect(result).toContainText(/Defeated|Virus Won/i);expect((await state(page)).battlePlayerHP).toBe(0);expect((await state(page)).battleWon).toBe(false);expect(await xp(page)).toHaveLength(1);
 await preserved(page,initial.baseline);expect(initial.errors).toEqual([]);await page.locator(scope('battle')).screenshot({path:resolve(output,'battle-completed-loss.jpg'),type:'jpeg',quality:90});report('battle-completion.json',{tieWins:true,winningBonusOnce:25,completionFocus:true,HPZeroDefeat:true,rematchResetsBattleOnly:true});
});

test('Battle AI loading retains controls and focus, while Stop, navigation and orphaned loading recover the current static round',async({page})=>{
 const initial=await setup(page,'battle');await installProvider(page);await activate(page,page.locator('#dna-battle-ai-start'),'Space');await requestCount(page,1);await expect(page.locator('#dna-battle-question')).toBeFocused();
 const input=await labelledAnswer(page,'battle'),status=page.locator('#dna-battle-status');await input.evaluate(n=>(window as any).__quizAIBattleInput=n);await expect(input).toHaveAttribute('readonly','');await stableStatus(status);await expect(status).toContainText(/generat|prepar/i);
 await resolveRequest(page,0,JSON.stringify({question:'Which base pairs with adenine in DNA?',answer:'Thymine',hint:'A–T.'}));await expect(page.locator('#dna-battle-question')).toContainText('Which base pairs with adenine in DNA?');await expect(page.locator('#dna-battle-question')).toBeFocused();await expect(input).not.toHaveAttribute('readonly','');
 await input.fill('Thymine');await page.keyboard.press('Enter');await requestCount(page,2);await expect(input).toBeFocused();await expect(input).toHaveAttribute('readonly','');expect(await input.evaluate(n=>n===(window as any).__quizAIBattleInput)).toBe(true);await expect(status).toContainText(/12 damage/i);
 await page.locator('#dna-quiz-outside').focus();await resolveRequest(page,1,JSON.stringify({question:'What is the usual start codon?',answer:'AUG',hint:'Three RNA letters.'}));await expect(page.locator('#dna-battle-question')).toContainText('What is the usual start codon?');await expect(page.locator('#dna-quiz-outside')).toBeFocused();
 await input.fill('AUG');await page.keyboard.press('Enter');await requestCount(page,3);await expect(input).toHaveAttribute('readonly','');const waiting=await state(page);expect(waiting.battleRound).toBe(2);expect(waiting.battleEnemyHP).toBe(76);
 await activate(page,page.locator('#dna-battle-ai-stop'),'Space');await expect(input).not.toHaveAttribute('readonly','');const fallback=await state(page);expect(fallback.battleRound).toBe(waiting.battleRound);expect(fallback.battleOrder).toEqual(waiting.battleOrder);expect(fallback.battlePlayerHP).toBe(waiting.battlePlayerHP);expect(fallback.battleEnemyHP).toBe(waiting.battleEnemyHP);expect(fallback.battleUseAI).toBe(false);expect(fallback.battleAILoading).toBe(false);await expect(page.locator('#dna-battle-question')).toContainText(battleQuestions[3]);
 expect(await page.evaluate(()=>{const e=document.activeElement;return!!e&&e!==document.body&&document.querySelector('[data-dna-quiz="battle"]')?.contains(e);})).toBe(true);
 await resolveRequest(page,2,JSON.stringify({question:'Stopped obsolete round',answer:'A'}));expect((await state(page)).battleOrder).toEqual(fallback.battleOrder);expect((await state(page)).battleAIQ).toBeNull();expect((await state(page)).battleEnemyHP).toBe(76);
 await patch(page,{battleDone:true});await activate(page,page.locator('#dna-battle-ai-rematch'));await requestCount(page,4);await page.locator('#dna-quiz-outside').focus();await patch(page,{tab:'challenge'});await resolveRequest(page,3,JSON.stringify({question:'Obsolete offscreen rematch',answer:'A'}));expect((await state(page)).battleAIQ).toBeNull();expect((await state(page)).battleAILoading).toBe(false);await expect(page.locator('#dna-quiz-outside')).toBeFocused();
 await patch(page,{tab:'battle',battleOrder:ordered,battleRound:3,battlePlayerHP:65,battleEnemyHP:70,battleDone:false,battleWon:false,battleUseAI:true,battleAILoading:true,battleAIQ:null});
 await expect(page.locator('#dna-battle-question')).toContainText(battleQuestions[3]);await expect(input).not.toHaveAttribute('readonly','');const recovered=await state(page);expect(recovered.battleUseAI).toBe(false);expect(recovered.battleAILoading).toBe(false);expect(recovered.battleRound).toBe(3);expect(recovered.battlePlayerHP).toBe(65);expect(recovered.battleEnemyHP).toBe(70);await requestCount(page,4);
 expect(await xp(page)).toEqual([['dnaLab',5,'Battle correct'],['dnaLab',5,'Battle correct']]);await preserved(page,initial.baseline);expect(initial.errors).toEqual([]);report('battle-ai-focus-and-recovery.json',{inputRetainedWhileLoading:true,quietResolution:true,stopRetainsRoundAndHP:true,staleAndOffscreenRequestsIgnored:true,orphanLoadingRecoveredWithoutRequest:true});
});

test('Quiz activities reflow at 320px with expanded text spacing, reachable 44px targets and normal and forced-color focus',async({page})=>{
 await page.setViewportSize({width:320,height:900});const initial=await setup(page,'challenge',{challengeQ:{type:'static',question:'How many strands does DNA have?',answer:'2',hint:'Think double.'}});
 await page.addStyleTag({content:'[data-dna-quiz], [data-dna-quiz] *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}[data-dna-quiz] p{margin-bottom:2em!important}'});
 const normal=await focusEvidence(page.locator('#dna-challenge-answer'));await page.locator('#dna-challenge-answer').focus();const focusedNormal=await settledFocus(page.locator('#dna-challenge-answer'));checkFocus(focusedNormal);expect(focusedNormal.shadow).toContain('inset');expect(focusedNormal.shadow).toContain('rgb(255, 255, 255)');
 const results:any[]=[];for(const kind of ['challenge','battle']){await patch(page,kind==='challenge'?{tab:'challenge'}:{tab:'battle',battleOrder:ordered,battleRound:1,battlePlayerHP:65,battleEnemyHP:72,battleDone:false,battleUseAI:false,battleAILoading:false,battleAnswer:''});
  const root=page.locator(scope(kind));await expect(root).toBeVisible();if(kind==='challenge'){const summary=root.locator('details > summary');await activate(page,summary,'Space');await expect(root.locator('details')).toHaveAttribute('open','');}
  await page.emulateMedia({reducedMotion:'reduce',forcedColors:'active'});const before=await state(page),targets:any[]=[];
  for(const control of await root.locator('button,input,textarea,select,summary,[tabindex="0"]').all()){if(!await control.isVisible())continue;await control.scrollIntoViewIfNeeded();await control.focus();const geometry=await control.evaluate((n:HTMLElement)=>{const b=n.getBoundingClientRect(),hit=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);return{id:n.id,text:n.textContent?.trim().slice(0,90),left:b.left,right:b.right,width:b.width,height:b.height,centerHits:!!hit&&(hit===n||n.contains(hit))};});
   expect(geometry.left,kind+': '+geometry.id).toBeGreaterThanOrEqual(-1);expect(geometry.right,kind+': '+geometry.id).toBeLessThanOrEqual(321);expect(geometry.width,kind+': '+geometry.id).toBeGreaterThanOrEqual(44);expect(geometry.height,kind+': '+geometry.id).toBeGreaterThanOrEqual(44);expect(geometry.centerHits,kind+': '+geometry.id).toBe(true);checkFocus(await settledFocus(control));targets.push(geometry);}
  const layout=await root.evaluate((n:HTMLElement)=>{const b=n.getBoundingClientRect();return{left:b.left,right:b.right,client:n.clientWidth,scroll:n.scrollWidth,document:document.documentElement.scrollWidth,forced:matchMedia('(forced-colors: active)').matches};});expect(layout.left).toBeGreaterThanOrEqual(-1);expect(layout.right).toBeLessThanOrEqual(321);expect(layout.scroll,kind+' scoped reflow').toBeLessThanOrEqual(layout.client+1);expect(layout.forced).toBe(true);expect(await state(page)).toEqual(before);
  await root.screenshot({path:resolve(output,kind+'-320px-forced-colors.jpg'),type:'jpeg',quality:90});results.push({kind,layout,targets});}
 await preserved(page,initial.baseline);expect(initial.errors).toEqual([]);report('mobile-reflow-targets-focus.json',{scope:'Challenge and Battle activity roots, including the opened codon reference; other DNA workspaces excluded.',textSpacing:{line:1.5,letter:'.12em',word:'.16em',paragraph:'2em'},normalBeforeFocus:normal,normalFocus:focusedNormal,results});
});

test('Scoped axe checks quiz questions, feedback, loading and completed battles; health text contrasts against fills and empty tracks',async({page})=>{
 const initial=await setup(page);await page.addScriptTag({path:resolve('node_modules/axe-core/axe.min.js')});const scans:any[]=[],health:any[]=[];
 async function scan(name:string,kind:string){const audit=await page.locator(scope(kind)).evaluate(async root=>{const r=await(window as any).axe.run(root,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}}),compact=(v:any)=>({id:v.id,impact:v.impact,nodes:v.nodes.map((n:any)=>({target:n.target,html:n.html,failureSummary:n.failureSummary}))});return{version:r.testEngine.version,violations:r.violations.map(compact),incomplete:r.incomplete.map(compact),passes:r.passes.map((v:any)=>v.id)};});scans.push({name,kind,...audit});report('scoped-axe.json',{scope:'Challenge difficulty, authored/AI question and feedback controls; Battle health, question/loading controls and completion.',limitation:'Scoped Chromium automation does not establish complete WCAG conformance. Incomplete rules remain recorded. Screen-reader speech was not tested.',scans});}
 await scan('Challenge introduction','challenge');await activate(page,page.locator('#dna-challenge-start'));await scan('Challenge unanswered','challenge');await activate(page,page.locator(scope('challenge')).locator('details > summary'),'Space');await scan('Challenge opened codon reference','challenge');await activate(page,page.locator(scope('challenge')).locator('details > summary'),'Space');await page.locator('#dna-challenge-answer').fill('Wrong');await page.keyboard.press('Enter');await scan('Challenge incorrect','challenge');await page.locator('#dna-challenge-answer').fill('2');await page.keyboard.press('Enter');await scan('Challenge correct','challenge');
 await installProvider(page);await activate(page,page.locator('#dna-challenge-ai-next'));await requestCount(page,1);await scan('Challenge generating','challenge');await activate(page,page.locator('#dna-challenge-ai-stop'));
 await patch(page,{tab:'battle'});await scan('Battle introduction','battle');await activate(page,page.locator('#dna-battle-start'));await scan('Battle active','battle');health.push({state:'Full HP',meters:await healthContrast(page)});
 await page.locator('#dna-battle-answer').fill('UAA');await page.keyboard.press('Enter');await scan('Battle correct and next question','battle');health.push({state:'Partially empty enemy track',meters:await healthContrast(page)});
 await page.locator('#dna-battle-answer').fill('Wrong');await page.keyboard.press('Enter');await scan('Battle incorrect and next question','battle');health.push({state:'Partially empty player track',meters:await healthContrast(page)});
 await patch(page,{battleDone:true,battleWon:true,battlePlayerHP:50,battleEnemyHP:50,battleFeedback:'✅ Correct! Dealt 12 damage!',battleReadyNotice:''});await scan('Battle victory','battle');await activate(page,page.locator('#dna-battle-ai-rematch'));await requestCount(page,2);await scan('Battle generating','battle');health.push({state:'AI waiting health',meters:await healthContrast(page)});await activate(page,page.locator('#dna-battle-ai-stop'));
 await patch(page,{battleDone:true,battleWon:false,battlePlayerHP:0,battleEnemyHP:80,battleFeedback:'❌ Wrong! RNA Polymerase. Took 10 damage!',battleReadyNotice:''});await scan('Battle defeat','battle');
 report('health-overlay-contrast.json',{method:'Computed HP text and opaque track colors plus actual linear-gradient fill color endpoints, using WCAG sRGB relative luminance. Tests include full and partially empty tracks.',limitation:'Supplements gradient-background axe incompletes; does not model antialiasing or establish full WCAG conformance.',states:health});
 expect(scans.flatMap(s=>s.violations),JSON.stringify(scans.filter(s=>s.violations.length))).toEqual([]);for(const state of health){expect(state.meters).toHaveLength(2);for(const meter of state.meters){expect(meter.limitations,state.state+': '+meter.name).toEqual([]);expect(meter.ratios.length).toBeGreaterThanOrEqual(3);for(const ratio of meter.ratios)expect(ratio,state.state+': '+meter.name).toBeGreaterThanOrEqual(4.5);}}
 await preserved(page,initial.baseline);expect(initial.errors).toEqual([]);
});

async function focusEvidence(control:Locator){return control.evaluate((n:HTMLElement)=>{const s=getComputedStyle(n);return{visible:n.matches(':focus-visible'),width:parseFloat(s.outlineWidth),offset:parseFloat(s.outlineOffset),style:s.outlineStyle,color:s.outlineColor,shadow:s.boxShadow,forced:matchMedia('(forced-colors: active)').matches};});}
async function settledFocus(control:Locator){await expect.poll(async()=>{const s=await focusEvidence(control);return s.visible&&s.width>=3&&s.offset<=-3&&s.style!=='none';}).toBe(true);return focusEvidence(control);}
function checkFocus(value:Awaited<ReturnType<typeof focusEvidence>>){expect(value.visible).toBe(true);expect(value.width).toBeGreaterThanOrEqual(3);expect(value.offset).toBeLessThanOrEqual(-3);expect(value.style).not.toBe('none');}
async function healthContrast(page:Page){return page.locator('[data-dna-battle-health]').evaluateAll(meters=>{
 type Color=[number,number,number,number];const parse=(s:string):Color|null=>{const parts=s.match(/^rgba?\(([^)]+)\)$/i)?.[1].split(/[\s,\/]+/).filter(Boolean);if(!parts||parts.length<3)return null;const c=(v:string)=>v.endsWith('%')?parseFloat(v)*2.55:parseFloat(v);return[c(parts[0]),c(parts[1]),c(parts[2]),parts[3]?parseFloat(parts[3])/(parts[3].endsWith('%')?100:1):1];};
 const lum=(c:Color)=>{const a=c.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*a[0]+.7152*a[1]+.0722*a[2];};
 return meters.map(meter=>{const limitations:string[]=[],all=[meter,...Array.from(meter.querySelectorAll('*'))],hp=all.filter(n=>/^\d+\s*HP$/.test(n.textContent?.trim()||'')).at(-1),text=hp?parse(getComputedStyle(hp).color):null;
  if(!hp||!text)limitations.push('No computed RGB HP text found.');const track=parse(getComputedStyle(meter).backgroundColor);if(!track||track[3]!==1)limitations.push('Meter track is not an opaque RGB color.');
  const fills=all.flatMap(n=>{const image=getComputedStyle(n).backgroundImage;if(image==='none')return[];if(!/^linear-gradient\(/.test(image)){limitations.push('Unmodeled fill image.');return[];}return(image.match(/rgba?\([^)]+\)/gi)||[]).map(parse).filter((c:Color|null):c is Color=>!!c);});if(fills.length<2)limitations.push('Expected gradient endpoint colors.');
  for(let n:Element|null=hp||meter;n;n=n.parentElement)if(Number(getComputedStyle(n).opacity)!==1)limitations.push('Ancestor opacity needs review.');
  const grounds=[...(track?[track]:[]),...fills],ratios=text?grounds.map(bg=>{if(bg[3]!==1)limitations.push('Transparent endpoint needs compositing.');const a=lum(text),b=lum(bg);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);}):[];
  return{name:meter.getAttribute('aria-label'),value:meter.getAttribute('aria-valuenow'),foreground:hp?getComputedStyle(hp).color:null,track:getComputedStyle(meter).backgroundColor,fillEndpoints:fills,ratios,limitations:[...new Set(limitations)]};});
 });}
