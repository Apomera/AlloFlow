// @vitest-environment jsdom
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const M=require('../stem_lab/kitchen_studio/recipe_lab_avatar_model.js');
const R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js');
const S=require('../stem_lab/kitchen_studio/recipe_lab_sauce_check.js');
const V=require('../stem_lab/kitchen_studio/recipe_lab_avatar_motion.js');
const source=readFileSync('stem_lab/kitchen_studio/recipe_lab_avatar.js','utf8');
const $=id=>document.getElementById(id),storageKey='alloflow-kitchen-avatar-v1';
let ui,dryFixture,turnLimitFixture;
const session=()=>ui.getSession(),facts=()=>({state:session().state,record:session().record,receipts:session().receipts});
const button=kind=>$('avatar'+kind[0].toUpperCase()+kind.slice(1));
const card=kind=>$('avatar'+kind[0].toUpperCase()+kind.slice(1)+'Plan');
const status=()=>$('avatarStatus').textContent;
function mount(){ui=window.KitchenAvatarUI.mount({container:$('targetActionsHost'),model:M});}
function choose(id,value){$(id).value=String(value);$(id).dispatchEvent(new Event('change',{bubbles:true}));}
function start(activity='separate-and-check-pasta',mode='independent'){choose('avatarActivity',activity);choose('avatarMode',mode);$('avatarStart').click();}
function ready(){for(let n=0;session().pending?.phase!=='ready'&&n<20;n++){$('avatarPlace').click();$('avatarAdvance').click();}expect(session().pending?.phase).toBe('ready');}
function action(kind){expect(button(kind).disabled,kind+' available').toBe(false);button(kind).click();ready();$('avatarCommit').click();}
function act(s,kind,options={}){const before=s;s=M.begin(s,kind,options);expect(s,kind+' fixture prepares').not.toBe(before);while(s.pending.phase!=='ready')s=M.advance(s,s.pending.token);const prepared=s;s=M.commit(s,s.pending.token);expect(s,kind+' fixture commits').not.toBe(prepared);return s;}
function seed(s){ui.dispose();const item={id:'target-actions-fixture',record:M.createRecord(s)};localStorage.setItem(storageKey,JSON.stringify({version:1,current:item,items:[item]}));mount();}
function refs(id){const ids=($(id).getAttribute('aria-describedby')||'').split(/\s+/).filter(Boolean);ids.forEach(ref=>expect($(ref),'description '+ref+' exists').not.toBeNull());return ids;}
function available(kind,value){expect(button(kind).disabled).toBe(!value);expect(card(kind).dataset.available).toBe(String(value));expect(refs(button(kind).id)).toContain(card(kind).id);return card(kind).textContent;}
function scrub(){const input=$('avatarMovement');input.value='65';input.dispatchEvent(new Event('input',{bubbles:true}));}
function dryPot(){if(!dryFixture){let s=M.create({activity:'separate-and-check-pasta',mode:'independent'});s=act(s,'setPotHeat',{setting:3});for(let n=0;s.state.pot.water>0&&s.state.time<=3480&&n<54;n++)s=act(s,'waitPot',{seconds:60});expect(s.state.pot.water).toBe(0);expect(s.state.time).toBeLessThan(3600);dryFixture=s;}return dryFixture;}
function turnLimit(){if(!turnLimitFixture){let s=M.create({activity:'mushroom-turning',mode:'independent'});for(let n=0;n<96;n++)s=act(s,'turnMushroom',{piece:0});expect(s.limitReached).toBe(true);turnLimitFixture=s;}return turnLimitFixture;}

beforeEach(()=>{document.body.innerHTML='<div id="targetActionsHost"></div>';localStorage.clear();window.KitchenRecipes=R;window.KitchenSauceCheck=S;window.KitchenAvatarStation=M;window.KitchenAvatarMotion=V;Object.defineProperty(window,'matchMedia',{configurable:true,value:()=>({matches:true,addEventListener(){},removeEventListener(){}})});vi.spyOn(window,'requestAnimationFrame').mockImplementation(()=>1);vi.spyOn(window,'cancelAnimationFrame').mockImplementation(()=>{});window.eval(source);mount();});
afterEach(()=>{ui?.dispose();vi.restoreAllMocks();localStorage.clear();document.body.replaceChildren();});

describe('Selected bundle, mushroom and measured-profile action explanations',()=>{
  it('associates the bundle chooser and sweep button with quiet current guidance',()=>{
    start();expect(refs('avatarPastaGroup')).toEqual(expect.arrayContaining(['avatarStrandChoice','avatarSeparatePastaPlan']));expect(refs('avatarSeparatePasta')).toContain('avatarSeparatePastaPlan');expect(card('separatePasta').closest('[aria-live]')).toBeNull();expect(card('separatePasta').getAttribute('role')).not.toBe('status');
  });

  it('explains the provided loose bundle without treating its valid selection as a field error',()=>{
    start();const before=facts();choose('avatarPastaGroup',0);expect(R.pastaSurface(session().state).groups[0].separated).toBe(true);expect(available('separatePasta',false)).toMatch(/already.*separat|separat.*already/i);expect(status()).toBe(card('separatePasta').textContent);expect($('avatarPastaGroup').getAttribute('aria-invalid')).not.toBe('true');expect(facts()).toEqual(before);
  });

  it('recovers a usable sweep by selecting a clumped bundle without changing food',()=>{
    start();const before=facts();choose('avatarPastaGroup',2);expect(available('separatePasta',true)).toMatch(/bundle 3/i);expect(status()).toBe(card('separatePasta').textContent);expect($('avatarPastaGroup').getAttribute('aria-invalid')).not.toBe('true');expect(facts()).toEqual(before);
  });

  it('keeps scene keyboard focus and the actual already-separated correction',()=>{
    start();choose('avatarPastaGroup',1);const before=facts();$('avatarSelect-strand-1').focus();$('avatarSelect-strand-1').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));expect($('avatarPastaGroup').value).toBe('0');expect(document.activeElement).toBe($('avatarSelect-strand-0'));expect(status()).toBe(card('separatePasta').textContent);expect(status()).toMatch(/already.*separat|separat.*already/i);expect(status()).not.toContain('Prepare an action when you are ready');expect(facts()).toEqual(before);
  });

  it('shares the blocked sweep reason with the hand chooser and semantic activation',()=>{
    start();choose('avatarPastaGroup',0);const before=facts();choose('avatarActiveTool','separatePasta');expect(refs('avatarActiveTool')).toContain('avatarSeparatePastaPlan');expect(status()).toBe(card('separatePasta').textContent);$('avatarHandle').dispatchEvent(new MouseEvent('click',{detail:0,bubbles:true}));expect(status()).toBe(card('separatePasta').textContent);expect(session().pending).toBeNull();expect(facts()).toEqual(before);
  });

  it('retains the prepared group after chooser tampering and quiet scrubbing or cancellation',()=>{
    start();choose('avatarPastaGroup',4);button('separatePasta').click();const before=facts(),message=status();choose('avatarPastaGroup',1);expect(session().pending.group).toBe(4);expect($('avatarPastaGroup').value).toBe('4');expect(card('separatePasta').textContent).toMatch(/prepared.*bundle 5/i);scrub();expect(status()).toBe(message);expect(facts()).toEqual(before);$('avatarCancel').click();expect(facts()).toEqual(before);
  });

  it('records only the retained bundle on Release without cooking or instant texture change',()=>{
    start();choose('avatarPastaGroup',3);const before=facts();button('separatePasta').click();ready();expect(facts()).toEqual(before);$('avatarCommit').click();const after=session();expect(after.record.intents).toHaveLength(before.record.intents.length+1);expect(after.record.intents.at(-1)).toMatchObject({kind:'separatePasta',group:3});expect(after.state.time).toBe(before.state.time);for(const key of ['water','temp','progress'])expect(after.state.pot[key]).toEqual(before.state.pot[key]);expect(after.state.pot.bundles.map(b=>b.progress)).toEqual(before.state.pot.bundles.map(b=>b.progress));expect(R.pastaSurface(after.state).groups[3].separated).toBe(true);expect(available('separatePasta',false)).toMatch(/already.*separat|separat.*already/i);
  });

  it('names an evaporated pot as a separate constraint for a still-clumped bundle',()=>{
    seed(dryPot());choose('avatarPastaGroup',1);const before=facts();expect(R.pastaSurface(session().state).groups[1].separated).toBe(false);expect(available('separatePasta',false)).toMatch(/water|empty|dry/i);expect(status()).toBe(card('separatePasta').textContent);expect($('avatarPastaGroup').getAttribute('aria-invalid')).not.toBe('true');expect(facts()).toEqual(before);
  });

  it('keeps the starting-sample suggestion advisory for a usable Practice sweep',()=>{
    start('separate-and-check-pasta','practice');choose('avatarPastaGroup',2);expect(session().state.pot.sample).toBeNull();expect(available('separatePasta',true)).toMatch(/bundle 3/i);expect(card('separatePasta').textContent).not.toMatch(/must.*sample|sample.*required/i);
  });

  it('describes Watch through demonstration controls and clears an inactive bundle-hand association',()=>{
    start('separate-and-check-pasta','watch');expect(available('separatePasta',false)).toMatch(/Watch.*demonstration/i);const message=status();choose('avatarPastaGroup',3);expect(status()).toBe(message);start();choose('avatarActiveTool','separatePasta');expect(refs('avatarActiveTool')).toContain('avatarSeparatePastaPlan');start('garlic-preparation');expect(refs('avatarActiveTool')).not.toContain('avatarSeparatePastaPlan');expect(card('separatePasta').closest('[hidden]')).not.toBeNull();
  });

  it.each(['mushroom-turning','moisture-and-browning'])('associates mushroom choice and turning with actual surface guidance in %s',activity=>{
    start(activity);expect(refs('avatarMushroomPiece')).toEqual(expect.arrayContaining(['avatarMushroomChoice','avatarTurnMushroomPlan']));expect(refs('avatarTurnMushroom')).toContain('avatarTurnMushroomPlan');expect(card('turnMushroom').closest('[aria-live]')).toBeNull();expect(available('turnMushroom',true)).toMatch(/piece 1|mushroom 1/i);
  });

  it('announces a deliberate mushroom choice and keeps its scene selection truthful',()=>{
    start('mushroom-turning');const before=facts();choose('avatarMushroomPiece',2);expect(status()).toBe(card('turnMushroom').textContent);expect(status()).toMatch(/piece 3|mushroom 3/i);$('avatarSelect-mushroom-2').focus();$('avatarSelect-mushroom-2').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));expect(document.activeElement).toBe($('avatarSelect-mushroom-3'));expect(status()).toBe(card('turnMushroom').textContent);expect(status()).toMatch(/piece 4|mushroom 4/i);expect(status()).not.toContain('Prepare an action when you are ready');expect(facts()).toEqual(before);
  });

  it('restores the original mushroom target while a turn is prepared',()=>{
    start('mushroom-turning');choose('avatarMushroomPiece',6);button('turnMushroom').click();const before=facts(),message=status();choose('avatarMushroomPiece',1);expect(session().pending.piece).toBe(6);expect($('avatarMushroomPiece').value).toBe('6');expect(card('turnMushroom').textContent).toMatch(/prepared.*(?:piece|mushroom) 7/i);scrub();expect(status()).toBe(message);expect(facts()).toEqual(before);$('avatarCancel').click();expect(facts()).toEqual(before);
  });

  it('does not reveal the hidden face or modify committed surfaces during a turn preview',()=>{
    start('mushroom-turning');const before=facts(),faces=[$('avatarMushroomFace0').textContent,$('avatarMushroomFace1').textContent];button('turnMushroom').click();for(const value of [15,50,95]){$('avatarMovement').value=String(value);$('avatarMovement').dispatchEvent(new Event('input',{bubbles:true}));expect(facts()).toEqual(before);expect([$('avatarMushroomFace0').textContent,$('avatarMushroomFace1').textContent]).toEqual(faces);}expect(card('turnMushroom').textContent).toMatch(/prepared|release|cancel/i);$('avatarCancel').click();expect(facts()).toEqual(before);
  });

  it('permits repeated untimed turns of a previously revealed piece and records each once',()=>{
    start('mushroom-turning');const before=facts(),down=before.state.pan.pieces[0].down;action('turnMushroom');expect(session().state.pan.pieces[0].down).not.toBe(down);expect(available('turnMushroom',true)).toMatch(/turn|reveal/i);action('turnMushroom');expect(session().state.pan.pieces[0].down).toBe(down);expect(session().record.intents).toHaveLength(before.record.intents.length+2);expect(session().state.time).toBe(before.state.time);expect(available('turnMushroom',true)).toMatch(/turn|reveal/i);
  });

  it('explains the action allowance rather than inventing an exhausted mushroom',()=>{
    seed(turnLimit());expect(available('turnMushroom',false)).toMatch(/action limit|action allowance/i);choose('avatarMushroomPiece',1);expect(status()).toBe(card('turnMushroom').textContent);expect($('avatarMushroomPiece').getAttribute('aria-invalid')).not.toBe('true');
  });

  it('keeps Watch turning guidance unavailable through the learner hand controls',()=>{
    start('mushroom-turning','watch');expect(available('turnMushroom',false)).toMatch(/Watch.*demonstration/i);const before=facts(),message=status();choose('avatarMushroomPiece',4);expect(status()).toBe(message);expect(facts()).toEqual(before);
  });

  it('explains that recording needs a real split before locking the whole profile',()=>{
    start('precision-mushroom-cuts');expect(refs('avatarFinishCuts')).toContain('avatarFinishCutsPlan');expect(card('finishCuts').closest('[aria-live]')).toBeNull();expect(available('finishCuts',false)).toMatch(/split|cut/i);expect(card('finishCuts').textContent).toMatch(/first|at least|two|2/i);expect(session().state.prep.cuts).toEqual([40]);
  });

  it('permits recording after one imperfect split without inventing a target prerequisite',()=>{
    start('precision-mushroom-cuts');choose('avatarCutMm',1);action('sliceProduce');expect(session().state.prep.cuts).toEqual([1,39]);expect(R.cutProfile(session().state).onTarget).toBe(false);expect(available('finishCuts',true)).toMatch(/1.*39/);expect(card('finishCuts').textContent).toMatch(/record|lock/i);
  });

  it('keeps the prepared recording about the entire actual profile during chooser changes',()=>{
    start('precision-mushroom-cuts');choose('avatarCutMm',1);action('sliceProduce');button('finishCuts').click();const before=facts(),message=status();choose('avatarCutPiece',1);choose('avatarCutMm',5);expect(session().pending.kind).toBe('finishCuts');expect(card('finishCuts').textContent).toMatch(/1.*39/);expect(card('finishCuts').textContent).toMatch(/prepared|finish|cancel/i);scrub();expect(status()).toBe(message);expect(facts()).toEqual(before);$('avatarCancel').click();expect(facts()).toEqual(before);expect(session().state.prep.cut).toBe(false);
  });

  it('records the actual widths once and explains the lock without claiming target success',()=>{
    start('precision-mushroom-cuts');choose('avatarCutMm',1);action('sliceProduce');const before=facts();action('finishCuts');expect(session().state.prep.cuts).toEqual([1,39]);expect(session().state.prep.cut).toBe(true);expect(session().record.intents).toHaveLength(before.record.intents.length+1);expect(session().state.time).toBe(before.state.time);expect(available('finishCuts',false)).toMatch(/recorded|locked|already/i);expect(button('sliceProduce').disabled).toBe(true);expect(R.cutProfile(session().state).onTarget).toBe(false);
  });

  it('gives the record-before-split correction through the hand and clears inactive target plans',()=>{
    start('precision-mushroom-cuts');const before=facts();choose('avatarActiveTool','finishCuts');expect(refs('avatarActiveTool')).toContain('avatarFinishCutsPlan');expect(status()).toBe(card('finishCuts').textContent);$('avatarHandle').dispatchEvent(new MouseEvent('click',{detail:0,bubbles:true}));expect(status()).toBe(card('finishCuts').textContent);expect(facts()).toEqual(before);start('precision-mushroom-cuts','watch');expect(available('finishCuts',false)).toMatch(/Watch.*demonstration/i);start('garlic-preparation');for(const id of ['avatarFinishCutsPlan','avatarTurnMushroomPlan','avatarSeparatePastaPlan'])expect(refs('avatarActiveTool')).not.toContain(id);expect(card('finishCuts').closest('[hidden]')).not.toBeNull();
  });
});
