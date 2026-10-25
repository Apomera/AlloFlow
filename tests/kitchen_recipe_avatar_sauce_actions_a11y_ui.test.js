// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';

const require=createRequire(import.meta.url);
const M=require('../stem_lab/kitchen_studio/recipe_lab_avatar_model.js');
const R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js');
const S=require('../stem_lab/kitchen_studio/recipe_lab_sauce_check.js');
const V=require('../stem_lab/kitchen_studio/recipe_lab_avatar_motion.js');
const source=readFileSync('stem_lab/kitchen_studio/recipe_lab_avatar.js','utf8');
const $=id=>document.getElementById(id),storageKey='alloflow-kitchen-avatar-v1';
const kinds=['combinePasta','loadMushrooms','inspect','fold','pour'];
let ui,lateFixture,limitFixture;
const session=()=>ui.getSession();
const facts=()=>({state:session().state,record:session().record,receipts:session().receipts});
const button=kind=>$('avatar'+kind[0].toUpperCase()+kind.slice(1));
const plan=kind=>$('avatar'+kind[0].toUpperCase()+kind.slice(1)+'Plan');
const status=()=>$('avatarStatus').textContent;
function mount(){ui=window.KitchenAvatarUI.mount({container:$('sauceActionsHost'),model:M});}
function choose(id,value){$(id).value=String(value);$(id).dispatchEvent(new Event('change',{bubbles:true}));}
function start(activity='avatar-sauce-rescue',mode='independent'){choose('avatarActivity',activity);choose('avatarMode',mode);$('avatarStart').click();}
function ready(){for(let n=0;session().pending?.phase!=='ready'&&n<20;n++){$('avatarPlace').click();$('avatarAdvance').click();}expect(session().pending?.phase).toBe('ready');}
function action(kind){expect(button(kind).disabled,kind+' available').toBe(false);button(kind).click();ready();$('avatarCommit').click();}
function act(s,kind,options={}){const prior=s;s=M.begin(s,kind,options);expect(s,kind+' fixture prepares').not.toBe(prior);while(s.pending.phase!=='ready')s=M.advance(s,s.pending.token);const prepared=s;s=M.commit(s,s.pending.token);expect(s,kind+' fixture commits').not.toBe(prepared);return s;}
function seed(s){ui.dispose();const item={id:'sauce-actions-fixture',record:M.createRecord(s)};localStorage.setItem(storageKey,JSON.stringify({version:1,current:item,items:[item]}));mount();}
function refs(id){const ids=($(id).getAttribute('aria-describedby')||'').split(/\s+/).filter(Boolean);ids.forEach(ref=>expect($(ref),'description '+ref+' exists').not.toBeNull());return ids;}
function availability(kind,available){expect(button(kind).disabled).toBe(!available);expect(refs(button(kind).id)).toContain(plan(kind).id);expect(plan(kind).dataset.available).toBe(String(available));if(session().mode!=='watch')expect(plan(kind).closest('[hidden]')).toBeNull();return plan(kind).textContent;}
function scrub(){const input=$('avatarMovement');input.value='53';input.dispatchEvent(new Event('input',{bubbles:true}));}
function late(){if(!lateFixture){let s=M.create({activity:'finish-pasta-in-sauce',mode:'independent'});for(let n=0;n<42;n++)s=act(s,'waitPan',{seconds:60});s=act(s,'waitPan',{seconds:15});s=act(s,'fold');lateFixture=act(s,'fold');expect(lateFixture.state.time).toBe(3597);}return lateFixture;}
function limited(){if(!limitFixture){let s=M.create({mode:'independent'});for(let n=0;n<96;n++)s=act(s,'inspect');expect(s.limitReached).toBe(true);limitFixture=s;}return limitFixture;}
function reduceReserve(){start();choose('avatarSource','reduced');choose('avatarDose',100);action('pour');expect(session().state.pot.reserve).toBe(50);}

beforeEach(()=>{document.body.innerHTML='<div id="sauceActionsHost"></div>';localStorage.clear();window.KitchenRecipes=R;window.KitchenSauceCheck=S;window.KitchenAvatarStation=M;window.KitchenAvatarMotion=V;Object.defineProperty(window,'matchMedia',{configurable:true,value:()=>({matches:true,addEventListener(){},removeEventListener(){}})});vi.spyOn(window,'requestAnimationFrame').mockImplementation(()=>1);vi.spyOn(window,'cancelAnimationFrame').mockImplementation(()=>{});window.eval(source);mount();start();});
afterEach(()=>{ui?.dispose();vi.restoreAllMocks();localStorage.clear();document.body.replaceChildren();});

describe('Sauce, batch transfer and loading controls explain actual actions before release',()=>{
  it('associates supported actions with quiet visible cards and hides unsupported cards',()=>{
    for(const activity of ['avatar-sauce-rescue','tomato-texture','cool-and-fold-sauce','finish-pasta-in-sauce','hold-and-recheck-sauce','reduce-and-check-sauce','soften-and-press-tomatoes','preheat-and-load-mushrooms']){
      start(activity);const supported=M.getActivity(activity).kinds;
      for(const kind of kinds){expect(plan(kind)).not.toBeNull();if(supported.includes(kind)){expect(refs(button(kind).id)).toContain(plan(kind).id);expect(plan(kind).closest('[hidden]')).toBeNull();expect(plan(kind).closest('[aria-live]')).toBeNull();expect(plan(kind).getAttribute('role')).not.toBe('status');}else expect(plan(kind).closest('[hidden]')).not.toBeNull();}
    }
  });

  it('allows the supplied200g mushroom tray to be loaded below the illustrative temperature range',()=>{
    start('preheat-and-load-mushrooms');const before=facts();expect(session().state.pan.temp).toBe(22);expect(availability('loadMushrooms',true)).toMatch(/200/);expect(plan('loadMushrooms').textContent).toMatch(/below|22|range/i);expect(facts()).toEqual(before);
  });

  it('keeps loading rehearsal and cancellation observational',()=>{
    start('preheat-and-load-mushrooms');button('loadMushrooms').click();const before=facts(),message=status();scrub();expect(status()).toBe(message);expect(facts()).toEqual(before);ready();expect(facts()).toEqual(before);$('avatarCancel').click();expect(facts()).toEqual(before);expect(session().state.pan.produce).toBe(false);
  });

  it('records the entire mushroom tray once without advancing kitchen time',()=>{
    start('preheat-and-load-mushrooms');const before=facts();action('loadMushrooms');expect(session().state.pan.produce).toBe(true);expect(session().state.time).toBe(before.state.time);expect(session().record.intents).toHaveLength(before.record.intents.length+1);expect(session().receipts.at(-1).produceTransfer.grams).toBe(200);expect(availability('loadMushrooms',false)).toMatch(/already|recorded|loaded/i);
  });

  it('shares the already-loaded reason through the hand without creating a second batch',()=>{
    start('preheat-and-load-mushrooms');action('loadMushrooms');const before=facts();choose('avatarActiveTool','loadMushrooms');expect(refs('avatarActiveTool')).toContain('avatarLoadMushroomsPlan');expect(status()).toBe(plan('loadMushrooms').textContent);$('avatarHandle').dispatchEvent(new MouseEvent('click',{detail:0,bubbles:true}));expect(status()).toBe(plan('loadMushrooms').textContent);expect(session().pending).toBeNull();expect(facts()).toEqual(before);
  });

  it('explains why finishing needs a released pasta transfer before inspecting the combined dish',()=>{
    start('finish-pasta-in-sauce');const before=facts();expect(availability('inspect',false)).toMatch(/transfer|combine|pasta/i);expect(availability('combinePasta',true)).toMatch(/160/);choose('avatarActiveTool','inspect');expect(refs('avatarActiveTool')).toContain('avatarInspectPlan');expect(status()).toBe(plan('inspect').textContent);$('avatarHandle').dispatchEvent(new MouseEvent('click',{detail:0,bubbles:true}));expect(status()).toBe(plan('inspect').textContent);expect(session().pending).toBeNull();expect(facts()).toEqual(before);
  });

  it('transfers the160g dry-equivalent batch and records the six-second toss exactly once',()=>{
    start('finish-pasta-in-sauce');const before=facts();action('combinePasta');expect(session().state.pan.combined).toBe(true);expect(session().state.time).toBe(before.state.time+6);expect(session().record.intents).toHaveLength(before.record.intents.length+1);expect(session().receipts.at(-1).pastaTransfer.dryEquivalentGrams).toBe(160);expect(availability('combinePasta',false)).toMatch(/already|recorded|transferred|combined/i);expect(availability('inspect',true)).toMatch(/check|inspect|observation|sample/i);
  });

  it('does not unlock inspection during a pasta-transfer preview or after canceling it',()=>{
    start('finish-pasta-in-sauce');button('combinePasta').click();const before=facts(),message=status();scrub();expect(status()).toBe(message);ready();expect(button('inspect').disabled).toBe(true);expect(session().state.pan.combined).toBe(false);$('avatarCancel').click();expect(facts()).toEqual(before);expect(availability('inspect',false)).toMatch(/transfer|combine|pasta/i);
  });

  it('gives the hand the same once-only transfer reason after the pasta is combined',()=>{
    start('finish-pasta-in-sauce');action('combinePasta');const before=facts();choose('avatarActiveTool','combinePasta');expect(refs('avatarActiveTool')).toContain('avatarCombinePastaPlan');expect(status()).toBe(plan('combinePasta').textContent);$('avatarHandle').dispatchEvent(new MouseEvent('click',{detail:0,bubbles:true}));expect(status()).toBe(plan('combinePasta').textContent);expect(facts()).toEqual(before);
  });

  it('keeps folding and saved-water addition available before transfer in finishing Practice',()=>{
    start('finish-pasta-in-sauce','practice');const before=facts();expect(availability('fold',true)).toMatch(/6|six/i);expect(availability('pour',true)).toMatch(/water|liquid|splash|pour/i);expect(session().state.pan.combined).toBe(false);expect(facts()).toEqual(before);
  });

  it('describes the actual coached sauce step instead of advertising an out-of-order fold or pour',()=>{
    start('avatar-sauce-rescue','practice');expect(availability('inspect',true)).toMatch(/check|inspect|observation|sample/i);expect(availability('fold',false)).toMatch(/step|inspect|check|practice/i);expect(availability('pour',false)).toMatch(/step|inspect|check|practice/i);action('inspect');expect(availability('pour',true)).toMatch(/water|liquid|splash|pour/i);expect(availability('inspect',false)).toMatch(/step|pour|practice/i);choose('avatarSource','plain');choose('avatarDose',60);action('pour');expect(availability('fold',true)).toMatch(/6|six/i);
  });

  it('retains tomato Practice phase constraints while permitting Independent checks and folds',()=>{
    start('tomato-texture','practice');expect(availability('inspect',true)).toMatch(/check|inspect|sample|observation/i);expect(availability('fold',false)).toMatch(/step|check|inspect|practice/i);start('tomato-texture');expect(availability('inspect',true)).toMatch(/check|inspect|sample|observation/i);expect(availability('fold',true)).toMatch(/6|six/i);
  });

  it('keeps other sauce Practice suggestions advisory when a six-second fold is physically usable',()=>{
    for(const activity of ['cool-and-fold-sauce','reduce-and-check-sauce','soften-and-press-tomatoes']){start(activity,'practice');const before=facts();expect(availability('fold',true)).toMatch(/6|six/i);expect(facts()).toEqual(before);}
  });

  it('permits repeated Independent inspections and records each actual untimed observation',()=>{
    const before=facts();action('inspect');expect(availability('inspect',true)).toMatch(/check|inspect|sample|observation/i);action('inspect');expect(session().record.intents).toHaveLength(before.record.intents.length+2);expect(session().state.time).toBe(before.state.time);expect(session().receipts.slice(-2).every(receipt=>!!receipt.inspection)).toBe(true);
  });

  it('advances a fold by six seconds only when the prepared action is released',()=>{
    button('fold').click();const before=facts(),message=status();scrub();expect(status()).toBe(message);expect(facts()).toEqual(before);ready();expect(facts()).toEqual(before);$('avatarCommit').click();expect(session().state.time).toBe(before.state.time+6);expect(session().record.intents).toHaveLength(before.record.intents.length+1);expect(session().record.intents.at(-1).kind).toBe('fold');
  });

  it('explains a three-second remainder without permitting a six-second fold or transfer',()=>{
    seed(late());const before=facts();expect(session().state.time).toBe(3597);expect(availability('fold',false)).toMatch(/3|six|6|remaining|limit/i);expect(availability('combinePasta',false)).toMatch(/3|six|6|remaining|limit/i);expect(facts()).toEqual(before);
  });

  it('associates liquid source and measured amount with both source facts and pour availability',()=>{
    for(const id of ['avatarSource','avatarDose'])expect(refs(id)).toEqual(expect.arrayContaining(['avatarSourceReceipt','avatarPourPlan']));expect(refs('avatarPour')).toContain('avatarPourPlan');expect(plan('pour').closest('fieldset').id).toBe('avatarWaterPlan');
  });

  it('announces source facts and the pour explanation after deliberate amount or source choices',()=>{
    const before=facts();choose('avatarDose',20);expect(status()).toContain($('avatarSourceReceipt').textContent);expect(status()).toContain(plan('pour').textContent);choose('avatarSource','reduced');expect(status()).toContain($('avatarSourceReceipt').textContent);expect(status()).toContain(plan('pour').textContent);expect(facts()).toEqual(before);
  });

  it('explains an insufficient selected quantity and recovers with a smaller finite pour',()=>{
    reduceReserve();const before=facts();choose('avatarDose',100);expect(availability('pour',false)).toMatch(/50|smaller|remain|enough/i);expect($('avatarDose').getAttribute('aria-invalid')).toBe('true');choose('avatarDose',20);expect(availability('pour',true)).toMatch(/20/);expect($('avatarDose').getAttribute('aria-invalid')).not.toBe('true');expect(facts()).toEqual(before);
  });

  it('shares an exhausted-source explanation with the hand while another supplied source remains usable',()=>{
    reduceReserve();choose('avatarDose',50);action('pour');expect(session().state.pot.reserve).toBe(0);choose('avatarDose',10);expect(availability('pour',false)).toMatch(/empty|no more|no.*water|no.*liquid/i);const before=facts();choose('avatarActiveTool','pour');expect(status()).toBe(plan('pour').textContent);$('avatarHandle').dispatchEvent(new MouseEvent('click',{detail:0,bubbles:true}));expect(status()).toBe(plan('pour').textContent);expect(facts()).toEqual(before);choose('avatarSource','plain');expect(availability('pour',true)).toMatch(/10/);expect(facts()).toEqual(before);
  });

  it('restores both prepared liquid fields and keeps receipt, validity and status quiet after tampering',()=>{
    reduceReserve();choose('avatarDose',20);button('pour').click();const before=facts(),message=status(),receipt=$('avatarSourceReceipt').textContent;choose('avatarDose',100);choose('avatarSource','plain');expect($('avatarDose').value).toBe('20');expect($('avatarSource').value).toBe('reduced');expect(session().pending).toMatchObject({kind:'pour',source:'reduced',amountMl:20});expect($('avatarSourceReceipt').textContent).toBe(receipt);for(const id of ['avatarSource','avatarDose'])expect($(id).getAttribute('aria-invalid')).not.toBe('true');expect(plan('pour').textContent).toMatch(/20/);scrub();expect(status()).toBe(message);$('avatarCancel').click();expect(facts()).toEqual(before);
  });

  it('releases only the retained liquid selection and amount after tampering',()=>{
    reduceReserve();choose('avatarDose',20);button('pour').click();const before=facts();choose('avatarDose',100);choose('avatarSource','plain');ready();$('avatarCommit').click();expect(session().record.intents).toHaveLength(before.record.intents.length+1);expect(session().record.intents.at(-1)).toMatchObject({kind:'pour',source:'reduced',amountMl:20});expect(session().state.pot.reserve).toBe(before.state.pot.reserve-20);expect(session().state.pot.plainWater).toBe(before.state.pot.plainWater);expect(session().state.time).toBe(before.state.time);
  });

  it('uses demonstration guidance in Watch and does not announce hidden liquid chooser changes',()=>{
    for(const activity of ['avatar-sauce-rescue','finish-pasta-in-sauce','preheat-and-load-mushrooms']){start(activity,'watch');const before=facts(),message=status();for(const kind of kinds.filter(kind=>M.getActivity(activity).kinds.includes(kind)))expect(availability(kind,false)).toMatch(/watch|demonstrat/i);choose('avatarSource','reduced');choose('avatarDose',20);expect(status()).toBe(message);expect(facts()).toEqual(before);}
  });

  it('explains the exhausted action allowance instead of ordinary source or guide conditions',()=>{
    seed(limited());const before=facts();for(const kind of ['inspect','fold','pour'])expect(availability(kind,false)).toMatch(/action limit|allowance|start fresh/i);expect(facts()).toEqual(before);
  });

  it('clears stale sauce and batch-action descriptions when changing to preparation',()=>{
    start('finish-pasta-in-sauce');choose('avatarActiveTool','combinePasta');expect(refs('avatarActiveTool')).toContain('avatarCombinePastaPlan');start('garlic-preparation');for(const kind of kinds)expect(plan(kind).closest('[hidden]')).not.toBeNull();const active=refs('avatarActiveTool');expect(active).toContain('avatarMincePlan');expect(active).not.toEqual(expect.arrayContaining(kinds.map(kind=>plan(kind).id)));
  });

  it('uses the saved-water supply in both finishing and holding without offering plain water',()=>{
    for(const activity of ['finish-pasta-in-sauce','hold-and-recheck-sauce']){start(activity);const before=facts();expect($('avatarSource').value).toBe('reduced');const plain=$('avatarSource').querySelector('[value=plain]');expect(plain.disabled).toBe(true);choose('avatarDose',20);expect(availability('pour',true)).toMatch(/20/);expect($('avatarSourceReceipt').textContent).toMatch(/saved|starch/i);expect(facts()).toEqual(before);}
  });
});
