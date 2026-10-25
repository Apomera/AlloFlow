// @vitest-environment jsdom
import {beforeEach,afterEach,describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const source=readFileSync('stem_lab/kitchen_studio/recipe_lab_avatar_mushrooms.js','utf8');
let view;
const node=key=>view.element.querySelector('[data-avatar-mushroom="'+key+'"]');
const card=index=>view.element.querySelector('[data-face="'+index+'"]');
const face=(index,extra={})=>Object.freeze({face:index,color:'golden',actionNumber:index+1,time:30,current:true,actor:'learner',...extra});
const piece=(extra={})=>Object.freeze({index:0,topFace:1,topColor:'pale',crowded:false,faces:Object.freeze([null,null]),...extra});
const data=(extra={})=>({piece:piece(),pieceCount:14,contact:.87,neighbors:1,pan:{freeWaterMl:12.34567,temperature:106.234,heat:2},...extra});
beforeEach(()=>{document.body.innerHTML='<div id="host"><p id="existing">Existing controls</p></div>';localStorage.clear();sessionStorage.clear();window.eval(source);view=window.KitchenAvatarMushrooms.mount({container:document.getElementById('host')});});
afterEach(()=>{view.destroy();document.body.replaceChildren();});
describe('Mushroom detail preserves visible surfaces and actual face evidence',()=>{
  it('shows the visible face but never leaks a supplied hidden bottom color or unrecorded face',()=>{
    view.update(data({piece:piece({bottomColor:'scorched',bottom:8,damage:9})}));expect(node('live-color').textContent).toBe('Pale');expect(node('live-side').textContent).toBe('Face B is exposed.');expect(card(0).dataset.freshness).toBe('unobserved');expect(card(1).dataset.freshness).toBe('unobserved');expect(card(0).textContent).toContain('No recorded turn');expect(card(1).textContent).toContain('No recorded turn');expect(view.element.textContent).not.toContain('Scorched');
  });
  it('distinguishes current and historical recorded A/B faces with their actual actions and time',()=>{
    view.update(data({piece:piece({topFace:0,topColor:'dark',faces:[face(0,{current:false}),face(1,{color:'pale',time:0,actor:'demonstrator'})]})}));expect(node('live-color').textContent).toBe('Dark');expect(card(0).dataset.position).toBe('exposed');expect(card(0).dataset.freshness).toBe('historical');expect(card(0).textContent).toContain('Golden when revealed');expect(card(0).textContent).toContain('Action 1 · 0:30 · Learner');expect(card(0).textContent).toContain('Earlier reveal');expect(card(1).dataset.position).toBe('pan');expect(card(1).dataset.freshness).toBe('current');expect(card(1).textContent).toContain('Action 2 · 0:00 · Watch');expect(card(1).textContent).toContain('Unchanged since this reveal');
  });
  it('uses pan-scoped water and actual contact, width and heat factors without inventing per-piece moisture',()=>{
    view.update(data({widthMm:5,relativeHeat:1.234}));expect(node('contact').textContent).toBe('87%');expect(node('crowding').textContent).toBe('Not crowded · 1 nearby');expect(node('pan-water').textContent).toBe('12.346 mL');expect(node('pan-temperature').textContent).toBe('106.2 °C');expect(node('width').textContent).toBe('5 mm');expect(node('relative-heat').textContent).toBe('1.23 ×');expect(node('scope').textContent).toContain('belongs to the whole pan');
    view.update(data({contact:null,neighbors:null,widthMm:null,relativeHeat:null,pan:{freeWaterMl:null,temperature:undefined}}));for(const key of ['contact','pan-water','pan-temperature','width','relative-heat'])expect(node(key).textContent).toBe('Not available');expect(node('crowding').textContent).toBe('Not crowded');view.update(data({pan:{freeWaterMl:.00001,temperature:0}}));expect(node('pan-water').textContent).toBe('Trace (<0.001 mL)');expect(node('pan-temperature').textContent).toBe('0 °C');expect(node('width').parentElement.hidden).toBe(true);
  });
  it('keeps all faces, measurements and source objects unchanged while previewing a turn or placement',()=>{
    const entry=Object.freeze(data({piece:piece({faces:Object.freeze([face(0),null])}),pan:Object.freeze({freeWaterMl:10,temperature:100,heat:2})})),before=JSON.stringify(entry);view.update(entry);const live=node('live-piece').innerHTML,faces=node('faces').innerHTML,facts=node('facts').textContent;
    for(const kind of ['turnMushroom','moveMushroom','<script>x</script>']){view.update({...entry,preview:{active:true,kind}});expect(node('live-piece').innerHTML).toBe(live);expect(node('faces').innerHTML).toBe(faces);expect(node('facts').textContent).toBe(facts);expect(node('preview-note').hidden).toBe(false);expect(node('preview-tool').hasAttribute('hidden')).toBe(false);expect(node('preview-note').textContent).toContain('stay unchanged until Release');}
    expect(JSON.stringify(entry)).toBe(before);expect(localStorage.length).toBe(0);expect(sessionStorage.length).toBe(0);view.update(entry);expect(node('preview-note').hidden).toBe(true);expect(node('preview-tool').hasAttribute('hidden')).toBe(true);
  });
  it('updates the visible identity and only the newly recorded face after a released turn',()=>{
    view.update(data());const original=card(1).querySelector('svg').innerHTML;view.update(data({piece:piece({topFace:0,topColor:'golden',faces:[face(0),null]})}));expect(node('live-side').textContent).toBe('Face A is exposed.');expect(card(0).dataset.freshness).toBe('current');expect(card(1).dataset.freshness).toBe('unobserved');expect(card(1).querySelector('svg').innerHTML).toBe(original);expect(card(1).textContent).toContain('No recorded turn');
  });
  it('gives all four colors visibly different artwork and validates markup enum input',()=>{
    const shapes=['pale','golden','dark','scorched'].map(value=>window.KitchenAvatarMushrooms.scenePieceMarkup(value));expect(new Set(shapes).size).toBe(4);for(const value of [null,undefined,'<img src=x>','unknown',12])expect(window.KitchenAvatarMushrooms.scenePieceMarkup(value)).toBe('');
    for(const current of ['pale','golden','dark','scorched']){view.update(data({piece:piece({topColor:current})}));const parsed=document.createElementNS('http://www.w3.org/2000/svg','g');parsed.innerHTML=window.KitchenAvatarMushrooms.scenePieceMarkup(current);expect(node('live-piece').innerHTML).toBe(parsed.innerHTML);}
  });
  it('rejects malformed evidence and invalid selected pieces, with no arbitrary HTML injection',()=>{
    for(const entry of [null,{},piece({index:-1}),piece({index:NaN}),piece({topFace:2})]){expect(view.update({piece:entry})).toBe(false);expect(view.element.hidden).toBe(true);}
    for(const reading of [face(1),face(0,{color:'<script>x</script>'}),face(0,{actionNumber:0}),face(0,{current:undefined}),face(0,{time:Infinity})]){view.update(data({piece:piece({topColor:'<img src=x>',faces:[reading,null]})}));expect(node('live-color').textContent).toBe('Color not available');expect(card(0).dataset.freshness).toBe('unobserved');expect(view.element.querySelector('script,img')).toBeNull();}
    view.update(data({contact:-1,neighbors:-2,pan:{freeWaterMl:NaN,temperature:Infinity}}));expect(node('contact').textContent).toBe('Not available');expect(node('pan-water').textContent).toBe('Not available');expect(node('pan-temperature').textContent).toBe('Not available');
  });
  it('retains native text alternatives, heading structure and independent mount lifecycles',()=>{
    view.update(data());expect(node('title').tagName).toBe('H4');expect(document.getElementById(view.element.getAttribute('aria-labelledby'))).toBe(node('title'));for(const svg of view.element.querySelectorAll('svg')){expect(svg.getAttribute('aria-hidden')).toBe('true');expect(svg.getAttribute('focusable')).toBe('false');}expect(view.element.querySelectorAll('button,input,select,[tabindex],[aria-live]')).toHaveLength(0);
    const other=window.KitchenAvatarMushrooms.mount({container:document.getElementById('host')});expect(other.element.getAttribute('aria-labelledby')).not.toBe(view.element.getAttribute('aria-labelledby'));view.destroy();view.destroy();expect(view.update(data())).toBe(false);expect(other.element.isConnected).toBe(true);expect(document.getElementById('existing').textContent).toBe('Existing controls');other.destroy();expect(document.getElementById('host').children).toHaveLength(1);
  });
});
