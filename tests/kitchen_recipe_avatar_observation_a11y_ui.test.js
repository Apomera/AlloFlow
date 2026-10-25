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
const $=id=>document.getElementById(id);
let ui;
const session=()=>ui.getSession();
const status=()=>$('avatarStatus').textContent;
const facts=()=>({state:session().state,record:session().record,receipts:session().receipts});
const button=kind=>$('avatar'+kind[0].toUpperCase()+kind.slice(1));
function choose(id,value){$(id).value=String(value);$(id).dispatchEvent(new Event('change',{bubbles:true}));}
function start(activity='avatar-sauce-rescue',mode='independent'){choose('avatarActivity',activity);choose('avatarMode',mode);$('avatarStart').click();}
function ready(){for(let n=0;session().pending?.phase!=='ready'&&n<20;n++){$('avatarPlace').click();$('avatarAdvance').click();}expect(session().pending?.phase).toBe('ready');}
function prepare(kind){expect(button(kind).disabled,kind+' available').toBe(false);button(kind).click();ready();}
function action(kind){prepare(kind);$('avatarCommit').click();return session().lastReceipt;}
function assertInspection(receipt){expect(receipt.inspection).toBeTruthy();expect(receipt.inspection.label).toBeTruthy();expect(receipt.inspection.observation).toBeTruthy();expect(status()).toContain(receipt.inspection.label);expect(status()).toContain(receipt.inspection.observation);}
function namedByHeading(id){const node=$(id),ids=(node.getAttribute('aria-labelledby')||'').split(/\s+/).filter(Boolean);expect(ids.length).toBeGreaterThan(0);const headings=ids.map(key=>$(key));headings.forEach(heading=>{expect(heading).not.toBeNull();expect(heading.matches('h1,h2,h3,h4,h5,h6')).toBe(true);expect(heading.closest('[hidden]')).toBeNull();expect(heading.textContent.trim()).not.toBe('');});return headings.map(heading=>heading.textContent).join(' ');}

beforeEach(()=>{
  document.body.innerHTML='<div id="observationHost"></div>';localStorage.clear();
  window.KitchenRecipes=R;window.KitchenSauceCheck=S;window.KitchenAvatarStation=M;window.KitchenAvatarMotion=V;
  Object.defineProperty(window,'matchMedia',{configurable:true,value:()=>({matches:true,addEventListener(){},removeEventListener(){}})});
  vi.spyOn(window,'requestAnimationFrame').mockImplementation(()=>1);vi.spyOn(window,'cancelAnimationFrame').mockImplementation(()=>{});
  window.eval(source);ui=window.KitchenAvatarUI.mount({container:$('observationHost'),model:M});
});
afterEach(()=>{ui?.dispose();vi.restoreAllMocks();localStorage.clear();document.body.replaceChildren();});

describe('Committed observations are available in concise screen-reader feedback',()=>{
  it('includes the actual spoon result and observation in the polite atomic status',()=>{
    start();const receipt=action('inspect');assertInspection(receipt);
    expect($('avatarStatus').getAttribute('role')).toBe('status');
    expect($('avatarStatus').getAttribute('aria-live')).toBe('polite');
    expect($('avatarStatus').getAttribute('aria-atomic')).toBe('true');
  });

  it('reports the latest actual check after a change rather than reusing earlier evidence',()=>{
    start();const first=action('inspect');action('fold');const latest=action('inspect');
    expect(latest.index).toBeGreaterThan(first.index);assertInspection(latest);
    expect(session().record.intents.map(intent=>intent.kind)).toEqual(['inspect','fold','inspect']);
  });

  it.each(['reserve-and-drain','cover-and-check-pasta','separate-and-check-pasta','cook-save-and-drain-pasta'])('announces actual pasta texture and the recorded observation in %s',activity=>{
    start(activity);const before=session().state.time,receipt=action('samplePasta');assertInspection(receipt);
    expect(receipt.inspection.kind).toBe('pasta');expect(session().state.time).toBe(before);
  });

  it('includes pasta texture recorded with a finishing sauce check',()=>{
    start('finish-pasta-in-sauce');action('combinePasta');const receipt=action('inspect');assertInspection(receipt);
    expect(receipt.finishCheck.pastaTexture).toBeTruthy();expect(status()).toContain(receipt.finishCheck.pastaTexture);
  });

  it.each(['mushroom-turning','moisture-and-browning'])('announces the selected piece and only the face actually revealed in %s',activity=>{
    start(activity);choose('avatarMushroomPiece',2);const receipt=action('turnMushroom'),turn=receipt.mushroomTurn;
    expect(turn.piece).toBe(2);expect(status()).toMatch(/mushroom\s+3/i);
    expect(status()).toContain('face '+(turn.revealedFace===0?'A':'B'));expect(status()).toContain(turn.color);
    const otherFace=turn.revealedFace===0?'B':'A';expect(status()).not.toMatch(new RegExp('face\\s+'+otherFace+'\\s*:','i'));
    expect(session().record.intents).toHaveLength(1);
  });

  it('does not announce or record a new observation while preparing, moving, or canceling a check',()=>{
    start();const before=facts();button('inspect').click();const prepared=status();
    for(const value of [10,60,95]){$('avatarMovement').value=String(value);$('avatarMovement').dispatchEvent(new Event('input',{bubbles:true}));expect(status()).toBe(prepared);expect(facts()).toEqual(before);}
    ready();expect(facts()).toEqual(before);expect(session().reading).toBeNull();
    $('avatarCancel').click();expect(facts()).toEqual(before);expect(session().reading).toBeNull();expect(status()).toMatch(/cancel|unchanged/i);
  });

  it('keeps a revealed face unknown during a turn preview and cancellation',()=>{
    start('mushroom-turning');choose('avatarMushroomPiece',3);const before=facts();button('turnMushroom').click();const prepared=status();
    for(const value of [20,75,100]){$('avatarMovement').value=String(value);$('avatarMovement').dispatchEvent(new Event('input',{bubbles:true}));expect(status()).toBe(prepared);expect(facts()).toEqual(before);}
    ready();expect(facts()).toEqual(before);expect(status()).not.toMatch(/revealed mushroom|face\s+[AB]\s*:/i);
    $('avatarCancel').click();expect(facts()).toEqual(before);expect(status()).not.toMatch(/revealed mushroom|face\s+[AB]\s*:/i);
  });

  it('updates observation feedback once for each repeated committed check',async()=>{
    start();const changes=[];const observer=new MutationObserver(records=>changes.push(...records));
    try{
      for(let count=1;count<=2;count++){
        prepare('inspect');changes.length=0;observer.observe($('avatarStatus'),{childList:true,characterData:true,subtree:true});
        $('avatarCommit').click();await Promise.resolve();changes.push(...observer.takeRecords());observer.disconnect();
        expect(changes).toHaveLength(1);assertInspection(session().lastReceipt);expect(session().record.intents).toHaveLength(count);
      }
    }finally{observer.disconnect();}
  });

  it('names the sauce evidence focus destination from its visible heading',()=>{
    start('avatar-sauce-rescue','practice');namedByHeading('avatarReading');
    action('inspect');action('pour');action('fold');action('fold');prepare('inspect');$('avatarCommit').focus();$('avatarCommit').click();
    expect(session().guide.complete).toBe(true);expect(document.activeElement).toBe($('avatarReading'));
    expect(namedByHeading('avatarReading')).toMatch(/spoon check/i);
  });

  it('names completed preparation evidence from the activity heading',()=>{
    start('garlic-preparation','practice');namedByHeading('avatarActivityEvidence');
    for(let pass=0;pass<5;pass++)action('mince');prepare('mince');$('avatarCommit').focus();$('avatarCommit').click();
    expect(session().guide.complete).toBe(true);expect(document.activeElement).toBe($('avatarActivityEvidence'));
    expect(namedByHeading('avatarActivityEvidence')).toMatch(/slice|chop|mince/i);
  });
});
