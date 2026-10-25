// @vitest-environment jsdom
import {beforeEach,afterEach,describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const source=readFileSync('stem_lab/kitchen_studio/recipe_lab_avatar_tomatoes.js','utf8');
let view;
const node=key=>view.element.querySelector('[data-avatar-tomato="'+key+'"]');
const piece=(extra={})=>Object.freeze({index:0,stage:0,texture:'firm chunk',ready:false,juice:60/14,...extra});
beforeEach(()=>{document.body.innerHTML='<div id="host"><p id="existing">Existing controls</p></div>';localStorage.clear();sessionStorage.clear();window.eval(source);view=window.KitchenAvatarTomatoes.mount({container:document.getElementById('host')});});
afterEach(()=>{view.destroy();document.body.replaceChildren();});
describe('Tomato magnifier separates committed texture from movement',()=>{
  it('uses four distinct ingredient shapes and the corresponding committed labels',()=>{
    const versions=[piece(),piece({ready:true,texture:'softened chunk'}),piece({stage:1,ready:true,texture:'split'}),piece({stage:2,ready:false,texture:'crushed',juice:0})],shapes=[];
    for(const [index,entry] of versions.entries()){expect(view.update({piece:entry,pieceCount:14})).toBe(true);shapes.push(node('piece').innerHTML);expect(node('stage').textContent).toBe(['Firm chunk','Softened chunk','Split','Crushed'][index]);expect(view.element.dataset.appearance).toBe(['firm','softened','split','crushed'][index]);const parsed=document.createElementNS('http://www.w3.org/2000/svg','g');parsed.innerHTML=window.KitchenAvatarTomatoes.scenePieceMarkup(entry);expect(parsed.innerHTML).toBe(node('piece').innerHTML);}
    expect(new Set(shapes).size).toBe(4);expect(node('readiness').textContent).toContain('already crushed');expect(node('juice').textContent).toBe('0 mL');
  });
  it('displays actual retained juice, selected piece, and readiness without inventing measurements',()=>{
    view.update({piece:piece({index:13,ready:true,juice:1.713571}),pieceCount:14});expect(node('title').textContent).toBe('Tomato piece 14 of 14');expect(node('juice').textContent).toBe('1.714 mL');expect(node('readiness').textContent).toContain('Soft enough');expect(view.element.dataset.juice).toBe('1.713571');
    view.update({piece:piece({juice:null})});expect(node('juice').textContent).toBe('Not available');view.update({piece:piece({juice:.00001})});expect(node('juice').textContent).toBe('Trace (<0.001 mL)');expect(node('title').textContent).toBe('Tomato piece 1');
  });
  it('never changes committed food, retained juice or supplied objects while moving the preview tool',()=>{
    const entry=piece({ready:true}),data=Object.freeze({piece:entry,pieceCount:14}),before=JSON.stringify(data);view.update(data);const art=node('piece').innerHTML,text=node('stage').textContent,juice=node('juice').textContent;
    for(const contact of [-2,0,.25,.75,1,4,NaN]){view.update({...data,preview:Object.freeze({active:true,phase:'press',contact})});expect(node('piece').innerHTML).toBe(art);expect(node('stage').textContent).toBe(text);expect(node('juice').textContent).toBe(juice);expect(node('preview-note').hidden).toBe(false);expect(node('preview-note').textContent).toContain('have not changed');expect(node('preview-tool').getAttribute('transform')).not.toContain('NaN');expect(Number(node('preview').dataset.contact)).toBeGreaterThanOrEqual(0);expect(Number(node('preview').dataset.contact)).toBeLessThanOrEqual(1);}
    expect(JSON.stringify(data)).toBe(before);expect(localStorage.length).toBe(0);expect(sessionStorage.length).toBe(0);view.update(data);expect(node('preview-note').hidden).toBe(true);expect(view.element.dataset.preview).toBe('false');
  });
  it('reflects an actual released change while keeping the selected ingredient node stable',()=>{
    view.update({piece:piece({ready:true}),pieceCount:14});const element=node('piece'),first=element.innerHTML;view.update({piece:piece({stage:1,ready:true,juice:2.142857}),pieceCount:14});expect(node('piece')).toBe(element);expect(element.innerHTML).not.toBe(first);expect(node('stage').textContent).toBe('Split');expect(node('juice').textContent).toBe('2.143 mL');expect(node('preview-note').hidden).toBe(true);
  });
  it('offers text equivalents and decorative SVG without adding another focus stop',()=>{
    view.update({piece:piece(),pieceCount:14});expect(view.element.tagName).toBe('SECTION');expect(document.getElementById(view.element.getAttribute('aria-labelledby'))).toBe(node('title'));expect(node('art').getAttribute('aria-hidden')).toBe('true');expect(node('art').getAttribute('focusable')).toBe('false');expect(view.element.querySelectorAll('button,input,select,[tabindex]')).toHaveLength(0);expect(node('readiness').textContent).toContain('still firm');expect(view.element.querySelector('[aria-live]')).toBeNull();
  });
  it('hides absent or malformed pieces and avoids arbitrary strings inside SVG',()=>{
    for(const entry of [undefined,null,{},piece({index:-1}),piece({index:1.2}),piece({stage:8}),piece({stage:NaN})]){expect(view.update({piece:entry})).toBe(false);expect(view.element.hidden).toBe(true);expect(window.KitchenAvatarTomatoes.scenePieceMarkup(entry)).toBe('');}
    view.update({piece:piece({texture:'<img src=x onerror=alert(1)>',juice:Infinity}),pieceCount:'<script>x</script>',preview:{active:true,contact:'<script>x</script>'}});expect(view.element.hidden).toBe(false);expect(view.element.querySelector('img,script')).toBeNull();expect(node('juice').textContent).toBe('Not available');expect(node('stage').textContent).toBe('Firm chunk');expect(node('preview').dataset.contact).toBe('0');
  });
  it('preserves host siblings, uses independent IDs and destroys only its own view',()=>{
    const other=window.KitchenAvatarTomatoes.mount({container:document.getElementById('host')});expect(other.element.getAttribute('aria-labelledby')).not.toBe(view.element.getAttribute('aria-labelledby'));view.destroy();view.destroy();expect(view.update({piece:piece()})).toBe(false);expect(document.getElementById('existing').textContent).toBe('Existing controls');expect(other.element.isConnected).toBe(true);other.destroy();expect(document.getElementById('host').children).toHaveLength(1);
  });
});
