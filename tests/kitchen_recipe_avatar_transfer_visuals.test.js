// @vitest-environment jsdom
import {beforeEach,afterEach,describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const source=readFileSync('stem_lab/kitchen_studio/recipe_lab_avatar_transfer.js','utf8');
let view;
const node=key=>key==='panel'?view.element:view.element.querySelector('[data-avatar-transfer="'+key+'"]');
const water=(extra={})=>Object.freeze({potMl:800,savedMl:100,discardedMl:50,evaporatedMl:50,startingMl:1000,targetSavedMl:100,savedCapacityMl:200,complete:true,balanced:true,...extra});
const starch=(extra={})=>Object.freeze({potG:4.8,savedG:.4,discardedG:.3,startingG:4.5,releasedG:1,surfaceG:.64,complete:true,balanced:true,...extra});
const lastTransfer=(extra={})=>Object.freeze({actionNumber:4,time:480,actor:'learner',from:'pot',to:'jug',requestedMl:50,actualMl:50,starchG:.2,sourceTemperature:100,...extra});
const data=(extra={})=>({water:water(),starch:starch(),lastTransfer:null,...extra});
beforeEach(()=>{document.body.innerHTML='<div id="host"><p id="existing">Existing controls</p></div>';localStorage.clear();sessionStorage.clear();window.eval(source);view=window.KitchenAvatarWaterTransfer.mount({container:document.getElementById('host')});});
afterEach(()=>{view.destroy();document.body.replaceChildren();});
describe('Cooking water study keeps committed destinations and actual transfers distinct',()=>{
  it('uses one conserved water scale and includes new dissolved starch release without adding surface starch',()=>{
    view.update(data());expect(node('panel').dataset.waterBudget).toBe('balanced');expect(node('panel').dataset.starchBudget).toBe('balanced');
    expect(node('water-accounting').textContent).toBe('1000 mL accounted for · 50 mL evaporated.');expect(node('starch-accounting').textContent).toBe('5.5 g dissolved starch accounted for · 1 g released during this activity.');expect(node('surface').textContent).toContain('0.64 g surface starch');
    for(const [key,fraction] of [['pot',.8],['saved',.1],['discarded',.05],['evaporated',.05]])expect(Number(node('water-'+key).dataset.fraction)).toBeCloseTo(fraction,12);
    expect(node('pot-ml').textContent).toBe('800 mL');expect(node('saved-grams').textContent).toBe('0.4 g dissolved');expect(node('discarded-ml').textContent).toBe('50 mL');expect(node('saved-fill').dataset.fraction).toBe('0.5');
  });
  it('keeps the weighted jug concentration independent when later cooking changes the pot',()=>{
    view.update(data());expect(node('pot-ratio').textContent).toBe('0.6 g / 100 mL');expect(node('saved-ratio').textContent).toBe('0.4 g / 100 mL');expect(node('discarded-ratio').textContent).toBe('0.6 g / 100 mL');
    view.update(data({water:water({potMl:750,evaporatedMl:100}),starch:starch({potG:5.3,releasedG:1.5})}));expect(node('pot-ratio').textContent).toBe('0.707 g / 100 mL');expect(node('saved-ratio').textContent).toBe('0.4 g / 100 mL');expect(node('saved-grams').textContent).toBe('0.4 g dissolved');
    view.update(data({water:water({potMl:700,savedMl:150,evaporatedMl:100}),starch:starch({potG:4.946666666666667,savedG:.7533333333333334,releasedG:1.5})}));expect(node('saved-ratio').textContent).toBe('0.502 g / 100 mL');expect(node('saved-fill').dataset.fraction).toBe('0.75');expect(node('panel').dataset.starchBudget).toBe('balanced');
  });
  it('shows only the last actual transferred amount and keeps its historical concentration fixed',()=>{
    const receipt=lastTransfer();view.update(data({lastTransfer:receipt}));expect(node('receipt').dataset.recorded).toBe('true');expect(node('receipt-meta').textContent).toBe('Last transfer · action 4 · 8:00 · Learner');expect(node('receipt-amount').textContent).toBe('50 mL + 0.2 g starch saved');expect(node('receipt-ratio').textContent).toBe('0.4 g / 100 mL at this transfer.');
    view.update(data({water:water({potMl:750,evaporatedMl:100}),starch:starch({potG:5.3,releasedG:1.5}),lastTransfer:receipt}));expect(node('receipt-ratio').textContent).toBe('0.4 g / 100 mL at this transfer.');
    view.update(data({lastTransfer:lastTransfer({to:'drain',actualMl:17,requestedMl:250,starchG:.085,actor:'demonstrator',time:0})}));expect(node('receipt-amount').textContent).toBe('17 mL + 0.085 g starch discarded');expect(node('receipt-amount').textContent).not.toContain('250');expect(node('receipt-meta').textContent).toContain('0:00 · Watch');
  });
  it('does not create transfer evidence or a pasta observation from live quantities',()=>{
    for(const lastTransfer of [null,{actualMl:50,starchG:.3},lastTransferFixture({time:NaN}),lastTransferFixture({actionNumber:0}),lastTransferFixture({to:'pot'}),lastTransferFixture({starchG:null})]){view.update(data({lastTransfer,pasta:{texture:'Ready'},sample:{label:'Soft'}}));expect(node('receipt').dataset.recorded).toBe('false');expect(node('receipt-amount').textContent).toBe('No transfer recorded');expect(view.element.textContent).not.toContain('Ready');expect(view.element.textContent).not.toContain('Soft');}
  });
  it('keeps all committed facts, receipts and storage unchanged across staged fill and carry previews',()=>{
    const entry=Object.freeze(data({lastTransfer:lastTransfer()})),before=JSON.stringify(entry);view.update(entry);const vessels=node('vessels').innerHTML,receipt=node('receipt').innerHTML,bar=node('water-bar').innerHTML,waterText=node('water-accounting').textContent,starchText=node('starch-accounting').textContent;
    for(const fillFraction of [0,.3,1])for(const angle of [-40,0,40]){view.update({...entry,preview:Object.freeze({active:true,amountMl:50,stage:'carry',fillFraction,angle,deliveredFraction:0,flowing:false})});expect(node('vessels').innerHTML).toBe(vessels);expect(node('receipt').innerHTML).toBe(receipt);expect(node('water-bar').innerHTML).toBe(bar);expect(node('water-accounting').textContent).toBe(waterText);expect(node('starch-accounting').textContent).toBe(starchText);expect(node('preview-title').textContent).toBe('50 mL prepared scoop');expect(node('ladle-fill').dataset.fraction).toBe(String(fillFraction));expect(node('ladle-fill').getAttribute('transform')).toBe('rotate('+(-angle)+' 0 5)');expect(node('preview-note').textContent).toContain('unchanged until Release');}
    expect(JSON.stringify(entry)).toBe(before);expect(localStorage.length).toBe(0);expect(sessionStorage.length).toBe(0);view.update(entry);expect(node('preview').hidden).toBe(true);expect(node('receipt').innerHTML).toBe(receipt);
  });
  it('distinguishes the100mL saving goal from200mL capacity and a retained10mL dose from a full50mL ladle',()=>{
    view.update(data({preview:{active:true,amountMl:10,fillFraction:.2,angle:0}}));expect(node('saved-ml').textContent).toBe('100 mL');expect(node('saved-fill').dataset.fraction).toBe('0.5');expect(node('preview-title').textContent).toBe('10 mL prepared scoop');expect(node('ladle-fill').dataset.fraction).toBe('0.2');expect(Number(node('ladle-fill').getAttribute('height'))).toBeCloseTo(6.4,12);
    view.update(data({water:water({savedCapacityMl:undefined})}));expect(node('saved-fill').dataset.fraction).toBe('');expect(node('saved-ml').textContent).toBe('100 mL');expect(node('saved-ratio').textContent).toBe('0.4 g / 100 mL');
  });
  it('treats missing, malformed and inconsistent budgets as unavailable without hiding valid vessel facts',()=>{
    for(const changed of [{complete:false},{balanced:false},{startingMl:999},{potMl:NaN},{evaporatedMl:Infinity},{savedMl:-1},{discardedMl:null}]){view.update(data({water:water(changed)}));expect(node('panel').dataset.waterBudget).toBe('unavailable');expect(node('water-accounting').textContent).toBe('Water accounting unavailable.');expect(node('water-pot').dataset.fraction).toBe('');expect(node('water-pot').style.width).toBe('0%');}
    for(const changed of [{complete:false},{balanced:false},{startingG:5},{releasedG:null},{potG:NaN},{savedG:Infinity},{discardedG:-1}]){view.update(data({starch:starch(changed)}));expect(node('panel').dataset.starchBudget).toBe('unavailable');expect(node('starch-accounting').textContent).toBe('Dissolved-starch accounting unavailable.');expect(node('pot-ml').textContent).toBe('800 mL');}
    view.update(data({water:water({savedMl:null}),starch:starch({savedG:null})}));expect(node('saved-ml').textContent).toBe('Not available');expect(node('saved-ratio').textContent).toBe('Concentration unavailable');expect(node('saved-fill').dataset.fraction).toBe('');
  });
  it('supports the earlier untimed activity with no evaporated/released field and handles zero and traces',()=>{
    view.update(data({water:water({potMl:850,evaporatedMl:undefined}),starch:starch({startingG:5.5,releasedG:undefined,surfaceG:undefined})}));expect(node('panel').dataset.waterBudget).toBe('balanced');expect(node('panel').dataset.starchBudget).toBe('balanced');expect(node('water-accounting').textContent).toBe('1000 mL accounted for.');expect(node('starch-accounting').textContent).toBe('5.5 g dissolved starch accounted for.');expect(node('surface').hidden).toBe(true);
    view.update(data({water:water({potMl:0,savedMl:0,discardedMl:0,evaporatedMl:0,startingMl:0}),starch:starch({potG:0,savedG:0,discardedG:0,startingG:0,releasedG:0})}));expect(node('pot-ml').textContent).toBe('0 mL');expect(node('pot-ratio').textContent).toBe('No liquid');expect(node('saved-vessel').dataset.concentration).toBe('');expect(node('water-accounting').textContent).toContain('0 mL accounted for');expect(node('water-pot').dataset.fraction).toBe('0');
    view.update(data({water:water({potMl:.00001}),starch:starch({potG:.00000001})}));expect(node('pot-ml').textContent).toBe('Trace (<0.01 mL)');expect(node('pot-grams').textContent).toBe('Trace (<0.001 g) dissolved');
    for(const fillFraction of [undefined,null,-1,2,NaN,Infinity]){view.update(data({preview:{active:true,amountMl:NaN,fillFraction,angle:Infinity}}));expect(node('ladle-fill').dataset.fraction).toBe('');expect(node('ladle-fill').getAttribute('visibility')).toBe('hidden');expect(node('ladle-body').getAttribute('transform')).toBe('translate(32 65) rotate(0)');}
  });
  it('has unique accessible headings, leaves existing controls intact and never injects supplied markup',()=>{
    view.update(data({lastTransfer:lastTransfer({actor:'<img src=x onerror=bad()>',sourceTemperature:'<script>bad()</script>'}),preview:{active:true,amountMl:'<img src=x>',stage:'<script>bad()</script>',angle:'bad'}}));expect(view.element.querySelectorAll('img,script,input,button,select')).toHaveLength(0);expect(node('title').tagName).toBe('H4');expect(view.element.getAttribute('aria-labelledby')).toBe(node('title').id);expect(view.element.querySelectorAll('[aria-live]')).toHaveLength(0);expect(document.getElementById('existing').textContent).toBe('Existing controls');
    const second=window.KitchenAvatarWaterTransfer.mount({container:document.getElementById('host')});expect(second.element.getAttribute('aria-labelledby')).not.toBe(view.element.getAttribute('aria-labelledby'));second.destroy();expect(view.update(null)).toBe(false);expect(view.element.hidden).toBe(true);view.destroy();view.destroy();expect(view.update(data())).toBe(false);expect(document.getElementById('existing')).not.toBeNull();
  });
});
function lastTransferFixture(extra){return lastTransfer(extra);}
