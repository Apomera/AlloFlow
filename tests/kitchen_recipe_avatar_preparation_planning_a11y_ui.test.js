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
const $=id=>document.getElementById(id),key='alloflow-kitchen-avatar-v1';
let ui,fullFixture,dryFixture,mincedFixture;
const session=()=>ui.getSession(),facts=()=>({state:session().state,record:session().record,receipts:session().receipts});
const button=kind=>$('avatar'+kind[0].toUpperCase()+kind.slice(1));
const plan=kind=>$('avatar'+kind[0].toUpperCase()+kind.slice(1)+'Plan');
const status=()=>$('avatarStatus').textContent;
const dry=()=>R.drying(session().state),garlic=()=>R.garlicPreparation(session().state);
function mount(){ui=window.KitchenAvatarUI.mount({container:$('prepPlanningHost'),model:M});}
function choose(id,value){$(id).value=String(value);$(id).dispatchEvent(new Event('change',{bubbles:true}));}
function start(activity='garlic-preparation',mode='independent'){choose('avatarActivity',activity);choose('avatarMode',mode);$('avatarStart').click();}
function ready(){for(let n=0;session().pending?.phase!=='ready'&&n<20;n++){$('avatarPlace').click();$('avatarAdvance').click();}expect(session().pending?.phase).toBe('ready');}
function action(kind){expect(button(kind).disabled,kind+' available').toBe(false);button(kind).click();ready();$('avatarCommit').click();}
function act(s,kind,options={}){const prior=s;s=M.begin(s,kind,options);expect(s,kind+' fixture prepares').not.toBe(prior);while(s.pending.phase!=='ready')s=M.advance(s,s.pending.token);const prepared=s;s=M.commit(s,s.pending.token);expect(s,kind+' fixture commits').not.toBe(prepared);return s;}
function seed(s){ui.dispose();const item={id:'preparation-planning-fixture',record:M.createRecord(s)};localStorage.setItem(key,JSON.stringify({version:1,current:item,items:[item]}));mount();}
function cloveDone(){if(!mincedFixture){let s=M.create({activity:'garlic-preparation',mode:'independent'});for(let n=0;n<3;n++)s=act(s,'mince',{clove:0});mincedFixture=s;}return mincedFixture;}
function clothFull(){if(!fullFixture){let s=M.create({activity:'surface-drying',mode:'independent'});for(let area=0;area<4;area++)for(let n=0;n<2;n++)s=act(s,'blot',{area});fullFixture=s;}return fullFixture;}
function surfaceDry(){if(!dryFixture){let s=M.create({activity:'surface-drying',mode:'independent'});for(let area=0;area<8;area++)for(let n=0;n<2;n++){if(R.drying(s.state).cloth===8)s=act(s,'wring');s=act(s,'blot',{area});}dryFixture=s;}return dryFixture;}
function refs(id){const ids=($(id).getAttribute('aria-describedby')||'').split(/\s+/).filter(Boolean);ids.forEach(ref=>expect($(ref),'description '+ref+' exists').not.toBeNull());return ids;}
function availability(kind,available){expect(button(kind).disabled).toBe(!available);expect(refs(button(kind).id)).toContain(plan(kind).id);expect(plan(kind).dataset.available).toBe(String(available));if(session().mode!=='watch')expect(plan(kind).closest('[hidden]')).toBeNull();return plan(kind).textContent;}
function scrub(){const input=$('avatarMovement');input.value='55';input.dispatchEvent(new Event('input',{bubbles:true}));}

beforeEach(()=>{document.body.innerHTML='<div id="prepPlanningHost"></div>';localStorage.clear();window.KitchenRecipes=R;window.KitchenSauceCheck=S;window.KitchenAvatarStation=M;window.KitchenAvatarMotion=V;Object.defineProperty(window,'matchMedia',{configurable:true,value:()=>({matches:true,addEventListener(){},removeEventListener(){}})});vi.spyOn(window,'requestAnimationFrame').mockImplementation(()=>1);vi.spyOn(window,'cancelAnimationFrame').mockImplementation(()=>{});window.eval(source);mount();});
afterEach(()=>{ui?.dispose();vi.restoreAllMocks();localStorage.clear();document.body.replaceChildren();});

describe('Preparation planning connects actual food and cloth constraints to deliberate actions',()=>{
  it('associates the clove chooser and cutting button with a quiet per-action explanation',()=>{
    start();expect(refs('avatarClove')).toEqual(expect.arrayContaining(['avatarCloveReceipt','avatarMincePlan']));expect(refs('avatarMince')).toContain('avatarMincePlan');expect(plan('mince').closest('[aria-live]')).toBeNull();expect(plan('mince').getAttribute('role')).not.toBe('status');expect(availability('mince',true)).toMatch(/clove 1/i);
  });

  it.each(['surface-drying','rinse-and-dry-produce'])('associates blotting and wringing with current guidance in %s',activity=>{
    start(activity);expect(refs('avatarArea')).toEqual(expect.arrayContaining(['avatarAreaReceipt','avatarBlotPlan']));for(const kind of ['blot','wring']){expect(refs(button(kind).id)).toContain(plan(kind).id);expect(plan(kind).closest('[aria-live]')).toBeNull();expect(plan(kind).getAttribute('role')).not.toBe('status');}
  });

  it('tracks whole, sliced, chopped and minced stages using only actual released passes',()=>{
    start();expect(garlic().cloves[0].texture).toBe('whole');for(const texture of ['sliced','chopped','minced']){action('mince');expect(garlic().cloves[0].texture).toBe(texture);expect(plan('mince').textContent).toMatch(new RegExp(texture,'i'));}expect(session().state.time).toBe(0);expect(session().record.intents).toHaveLength(3);choose('avatarClove',1);for(let n=0;n<3;n++)action('mince');expect(garlic().complete).toBe(true);expect(availability('mince',false)).toMatch(/minced/i);expect(session().record.intents).toHaveLength(6);expect($('avatarHandle').getAttribute('tabindex')).toBe('-1');
  });

  it('explains an already minced clove without a field error and recovers on another clove',()=>{
    seed(cloveDone());choose('avatarClove',0);const before=facts();expect(availability('mince',false)).toMatch(/already.*minced/i);expect(status()).toBe(plan('mince').textContent);expect($('avatarClove').getAttribute('aria-invalid')).not.toBe('true');choose('avatarClove',1);expect(availability('mince',true)).toMatch(/clove 2/i);expect(status()).toBe(plan('mince').textContent);expect(facts()).toEqual(before);
  });

  it('keeps scene keyboard focus and the minced-clove correction together',()=>{
    seed(cloveDone());choose('avatarClove',1);const before=facts();$('avatarSelect-clove-1').focus();$('avatarSelect-clove-1').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));expect(document.activeElement).toBe($('avatarSelect-clove-0'));expect($('avatarClove').value).toBe('0');expect(status()).toBe(plan('mince').textContent);expect(status()).toMatch(/already.*minced/i);expect(status()).not.toContain('Prepare an action when you are ready');expect(facts()).toEqual(before);
  });

  it('shares the same minced-clove constraint with the hand chooser and semantic activation',()=>{
    seed(cloveDone());choose('avatarClove',0);const before=facts();choose('avatarActiveTool','mince');expect(refs('avatarActiveTool')).toContain('avatarMincePlan');expect(status()).toBe(plan('mince').textContent);$('avatarHandle').dispatchEvent(new MouseEvent('click',{detail:0,bubbles:true}));expect(status()).toBe(plan('mince').textContent);expect(session().pending).toBeNull();expect(facts()).toEqual(before);
  });

  it('retains a prepared clove after chooser tampering and keeps rehearsal and cancellation quiet',()=>{
    start();choose('avatarClove',1);button('mince').click();const before=facts(),message=status();choose('avatarClove',0);expect($('avatarClove').value).toBe('1');expect(session().pending.clove).toBe(1);expect(plan('mince').textContent).toMatch(/prepared.*clove 2/i);scrub();expect(status()).toBe(message);expect(facts()).toEqual(before);$('avatarCancel').click();expect(session().pending).toBeNull();expect(facts()).toEqual(before);
  });

  it('records exactly one cutting pass for the retained clove at final release',()=>{
    start();choose('avatarClove',1);button('mince').click();const before=facts();ready();expect(facts()).toEqual(before);$('avatarCommit').click();$('avatarCommit').click();expect(garlic().cloves.map(c=>c.stage)).toEqual([0,1]);expect(session().record.intents).toHaveLength(1);expect(session().record.intents[0]).toMatchObject({kind:'mince',clove:1});expect(session().state.time).toBe(before.state.time);
  });

  it('keeps pre-rinse prerequisites visible without advertising established surface marks',()=>{
    start('rinse-and-dry-produce');expect($('avatarDryingPlan').hidden).toBe(true);for(const kind of ['blot','wring']){const text=availability(kind,false);expect(text).toMatch(/rinse/i);expect(text).not.toMatch(/16 (?:surface[- ]water )?marks|30 mL on|has 2 (?:water|surface)marks/i);}expect(availability('rinseProduce',true)).toMatch(/rinse/i);expect(plan('blot').closest('fieldset')).not.toBe($('avatarDryingPlan'));
  });

  it('does not establish retained water or unlock cloth actions during a rinse preview or cancellation',()=>{
    start('rinse-and-dry-produce');const before=facts();button('rinseProduce').click();const message=status();scrub();expect(session().state.prep.rinsed).toBe(false);expect(button('blot').disabled).toBe(true);expect(button('wring').disabled).toBe(true);expect(status()).toBe(message);expect(facts()).toEqual(before);$('avatarCancel').click();expect(facts()).toEqual(before);expect(session().state.prep.rinsed).toBe(false);
  });

  it('establishes one rinse on release, moves cloth plans into the visible area fieldset, and blocks repeat rinsing',()=>{
    start('rinse-and-dry-produce');const before=facts();action('rinseProduce');expect(session().state.prep.rinsed).toBe(true);expect(dry()).toMatchObject({remaining:16,cloth:0,surfaceWater:30});expect($('avatarDryingPlan').hidden).toBe(false);expect(plan('blot').closest('fieldset')).toBe($('avatarDryingPlan'));expect(availability('blot',true)).toMatch(/area/i);expect(availability('wring',false)).toMatch(/empty|no water|nothing/i);expect(availability('rinseProduce',false)).toMatch(/already|recorded/i);expect(session().record.intents).toHaveLength(before.record.intents.length+1);expect(session().state.time).toBe(before.state.time);
  });

  it('explains a dry selected area and recovers by selecting a wet one',()=>{
    start('surface-drying');action('blot');action('blot');const before=facts();choose('avatarArea',0);expect(availability('blot',false)).toMatch(/dry/i);expect(status()).toBe(plan('blot').textContent);expect($('avatarArea').getAttribute('aria-invalid')).not.toBe('true');choose('avatarArea',1);expect(availability('blot',true)).toMatch(/area 2/i);expect(status()).toBe(plan('blot').textContent);expect(facts()).toEqual(before);
  });

  it('keeps a dry-area scene correction instead of generic prepare advice',()=>{
    start('surface-drying');action('blot');action('blot');choose('avatarArea',1);const before=facts();$('avatarSelect-area-1').focus();$('avatarSelect-area-1').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));expect(document.activeElement).toBe($('avatarSelect-area-0'));expect(status()).toBe(plan('blot').textContent);expect(status()).toMatch(/dry/i);expect(status()).not.toContain('Prepare an action when you are ready');expect(facts()).toEqual(before);
  });

  it('explains both a dry area and a full cloth, then requires both parts of recovery',()=>{
    seed(clothFull());choose('avatarArea',0);const before=facts();const blocked=availability('blot',false);expect(blocked).toMatch(/dry/i);expect(blocked).toMatch(/full|capacity|saturat/i);expect(blocked).toMatch(/wet/i);expect(blocked).toMatch(/wring/i);expect(availability('wring',true)).toMatch(/cloth|water/i);expect($('avatarArea').getAttribute('aria-invalid')).not.toBe('true');action('wring');expect(dry().cloth).toBe(0);expect(availability('blot',false)).toMatch(/dry/i);choose('avatarArea',4);expect(availability('blot',true)).toMatch(/area 5/i);expect(session().record.intents).toHaveLength(before.record.intents.length+1);
  });

  it('shares the empty-cloth reason through the hand without preparing a useless wring',()=>{
    start('surface-drying');const before=facts();choose('avatarActiveTool','wring');expect(refs('avatarActiveTool')).toContain('avatarWringPlan');expect(availability('wring',false)).toMatch(/empty|no water|nothing/i);expect(status()).toBe(plan('wring').textContent);$('avatarHandle').dispatchEvent(new MouseEvent('click',{detail:0,bubbles:true}));expect(status()).toBe(plan('wring').textContent);expect(session().pending).toBeNull();expect(facts()).toEqual(before);
  });

  it('retains the prepared area after tampering and keeps its guidance quiet while scrubbing',()=>{
    start('surface-drying');choose('avatarArea',5);button('blot').click();const before=facts(),message=status();choose('avatarArea',0);expect($('avatarArea').value).toBe('5');expect(session().pending.area).toBe(5);expect(plan('blot').textContent).toMatch(/prepared.*area 6/i);scrub();expect(status()).toBe(message);expect(facts()).toEqual(before);$('avatarCancel').click();expect(facts()).toEqual(before);
  });

  it('moves one retained surface mark only once at the final blot release',()=>{
    start('surface-drying');choose('avatarArea',4);const before=facts(),water=dry();button('blot').click();ready();expect(facts()).toEqual(before);$('avatarCommit').click();$('avatarCommit').click();expect(dry().areas[4]).toBe(water.areas[4]-1);expect(dry().cloth).toBe(water.cloth+1);expect(dry().surfaceWater).toBeCloseTo(water.surfaceWater-1.875,8);expect(dry().clothWater).toBeCloseTo(water.clothWater+1.875,8);expect(session().record.intents).toHaveLength(1);expect(session().record.intents[0]).toMatchObject({kind:'blot',area:4});expect(session().state.time).toBe(before.state.time);
  });

  it('permits an early wring and empties the actual cloth only once on release',()=>{
    start('surface-drying');action('blot');const before=facts(),water=dry();expect(availability('wring',true)).toMatch(/cloth|water/i);button('wring').click();ready();expect(facts()).toEqual(before);$('avatarCommit').click();$('avatarCommit').click();expect(dry().cloth).toBe(0);expect(dry().remaining).toBe(water.remaining);expect(session().receipts.at(-1).after.wrungWaterMl).toBeCloseTo(water.clothWater,8);expect(session().record.intents).toHaveLength(before.record.intents.length+1);expect(session().state.time).toBe(before.state.time);
  });

  it('distinguishes a dry surface from the remaining cloth water needed to finish',()=>{
    seed(surfaceDry());expect(dry()).toMatchObject({complete:true,remaining:0,cloth:8});expect(availability('blot',false)).toMatch(/dry/i);expect(availability('wring',true)).toMatch(/cloth|water/i);action('wring');expect(dry()).toMatchObject({remaining:0,cloth:0});expect(availability('blot',false)).toMatch(/dry/i);expect(availability('wring',false)).toMatch(/empty|no water|nothing/i);
  });

  it('keeps Practice suggestions advisory for unfinished cloves and an early cloth wring',()=>{
    start('garlic-preparation','practice');choose('avatarClove',1);expect(availability('mince',true)).toMatch(/clove 2/i);start('surface-drying','practice');action('blot');expect(dry().cloth).toBe(1);expect(availability('wring',true)).toMatch(/cloth|water/i);
  });

  it('uses demonstration guidance in Watch and removes stale hand descriptions on another activity',()=>{
    start('garlic-preparation','watch');expect(availability('mince',false)).toMatch(/Watch.*demonstration/i);start('rinse-and-dry-produce','watch');for(const kind of ['rinseProduce','blot','wring'])expect(availability(kind,false)).toMatch(/Watch.*demonstration/i);start('surface-drying');choose('avatarActiveTool','wring');expect(refs('avatarActiveTool')).toContain('avatarWringPlan');start('avatar-sauce-rescue');expect(refs('avatarActiveTool')).toContain('avatarInspectPlan');for(const kind of ['mince','blot','wring','rinseProduce']){expect(refs('avatarActiveTool')).not.toContain(plan(kind).id);expect(plan(kind).closest('[hidden]')).not.toBeNull();}
  });
});
