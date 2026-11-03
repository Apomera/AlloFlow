import {afterEach,describe,expect,it} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const require=createRequire(import.meta.url);
const Discovery=require('../stem_lab/kitchen_studio/kitchen_studio_discovery.js');
const standard={width:600,height:400,anchor:{x:100,y:180},cardWidth:220,cardHeight:100};
const copy=value=>JSON.parse(JSON.stringify(value));
const views=[];
afterEach(()=>{views.splice(0).forEach(view=>view.dispose());document.body.innerHTML='';});

function contained(result,options){
  expect(result).not.toBeNull();
  const r=result.card;
  expect(r.x).toBeGreaterThanOrEqual(8);expect(r.y).toBeGreaterThanOrEqual(8);
  expect(r.x+r.width).toBeLessThanOrEqual(options.width-8);expect(r.y+r.height).toBeLessThanOrEqual(options.height-8);
  expect(result.leader.start).toEqual(options.anchor);
  const e=result.leader.end;
  expect(e.x).toBeGreaterThanOrEqual(r.x);expect(e.x).toBeLessThanOrEqual(r.x+r.width);expect(e.y).toBeGreaterThanOrEqual(r.y);expect(e.y).toBeLessThanOrEqual(r.y+r.height);
  expect(e.x===r.x||e.x===r.x+r.width||e.y===r.y||e.y===r.y+r.height).toBe(true);
}

describe('Tool discovery layout',()=>{
  it('exports browser and CommonJS APIs without a DOM dependency',()=>{
    const context={window:{}};runInNewContext(readFileSync(require.resolve('../stem_lab/kitchen_studio/kitchen_studio_discovery.js'),'utf8'),context);
    expect(Object.keys(context.window.KitchenStudioDiscovery).sort()).toEqual(['layout','mount']);
    expect(context.window.KitchenStudioDiscovery.layout(standard).card.x).toBe(118);
  });
  it('uses the right side with an18px gap when it fits',()=>{
    const result=Discovery.layout(standard);expect(result.card).toEqual({x:118,y:130,width:220,height:100});expect(result.leader).toEqual({start:{x:100,y:180},end:{x:118,y:180}});
  });
  it('uses the left side near the right edge',()=>{
    const options={...standard,anchor:{x:550,y:180}},result=Discovery.layout(options);contained(result,options);expect(result.card.x).toBe(312);expect(result.leader.end).toEqual({x:532,y:180});
  });
  it('uses above on phone widths when side placement cannot fit',()=>{
    const options={...standard,width:300,height:270,anchor:{x:150,y:160}},result=Discovery.layout(options);contained(result,options);expect(result.card).toEqual({x:40,y:42,width:220,height:100});expect(result.leader.end).toEqual({x:150,y:142});
  });
  it('uses below when the upper space is too small',()=>{
    const options={...standard,width:300,height:270,anchor:{x:150,y:40}},result=Discovery.layout(options);contained(result,options);expect(result.card.y).toBe(58);expect(result.leader.end).toEqual({x:150,y:58});
  });
  it('clamps only the cross axis when placing a card beside a corner tool',()=>{
    const options={...standard,anchor:{x:0,y:0}},result=Discovery.layout(options);contained(result,options);expect(result.card).toEqual({x:18,y:8,width:220,height:100});expect(result.leader.end).toEqual({x:18,y:8});
  });
  it('chooses a non-covering corner when an18px gap cannot fit',()=>{
    const options={...standard,width:300,height:270,anchor:{x:150,y:135},cardWidth:220,cardHeight:120},result=Discovery.layout(options);contained(result,options);const r=result.card;expect(options.anchor.x>r.x&&options.anchor.x<r.x+r.width&&options.anchor.y>r.y&&options.anchor.y<r.y+r.height).toBe(false);
  });
  it('keeps a large unavoidable card contained and ends the leader on an edge',()=>{
    const options={...standard,width:100,height:90,anchor:{x:50,y:45},cardWidth:400,cardHeight:300},result=Discovery.layout(options);contained(result,options);expect(result.card).toEqual({x:8,y:8,width:84,height:74});expect(result.leader.end).not.toEqual(options.anchor);
  });
  it.each([[320,270],[390,270],[760,450],[300,270],[17,17]])('keeps edge/corner anchors and leaders inside a%spx by%spx frame',(width,height)=>{
    for(const anchor of [{x:0,y:0},{x:width,y:0},{x:0,y:height},{x:width,y:height},{x:width/2,y:height/2}])contained(Discovery.layout({...standard,width,height,anchor}),{...standard,width,height,anchor});
  });
  it('does not mutate options or return shared point references',()=>{
    const input={...standard,anchor:{...standard.anchor}},before=copy(input);Object.freeze(input.anchor);Object.freeze(input);
    const one=Discovery.layout(input),two=Discovery.layout(input);expect(input).toEqual(before);expect(one).toEqual(two);one.leader.start.x=999;one.card.x=999;expect(two.leader.start.x).toBe(100);expect(input.anchor.x).toBe(100);
  });
  it.each([null,{}, {...standard,width:0},{...standard,height:-1},{...standard,width:16},{...standard,height:16},{...standard,width:NaN},{...standard,height:Infinity},{...standard,cardWidth:0},{...standard,cardHeight:-2},{...standard,cardHeight:'100'},{...standard,cardWidth:Infinity},{...standard,anchor:null},{...standard,anchor:{x:NaN,y:0}},{...standard,anchor:{x:'100',y:10}},{...standard,anchor:{x:-1,y:10}},{...standard,anchor:{x:601,y:10}},{...standard,anchor:{x:100,y:401}}])('rejects malformed or off-frame layout input %#',options=>expect(Discovery.layout(options)).toBeNull());
});

function fixture(){
  document.body.innerHTML='<button id="keepFocus">Keep focus</button><div id="viewport"><canvas></canvas><div id="studioDiscovery"><svg id="studioDiscoveryLeader"><line id="studioDiscoveryLine"></line><circle id="studioDiscoveryDot"></circle></svg><div id="studioDiscoveryCard"><strong id="studioDiscoveryTitle"></strong><span id="studioDiscoveryBadge"></span><p id="studioDiscoveryHint"></p></div></div></div>';
  const canvas=document.querySelector('canvas'),overlay=document.getElementById('studioDiscovery'),card=document.getElementById('studioDiscoveryCard');let frame={width:600,height:400},measure={width:220,height:100};
  canvas.getBoundingClientRect=()=>({left:40,top:70,...frame});card.getBoundingClientRect=()=>({...measure});
  const view=Discovery.mount({canvas});views.push(view);
  return {view,canvas,overlay,card,frame:value=>frame=value,measure:value=>measure=value,node:id=>document.getElementById(id)};
}
const tool={id:'soap',name:'soap',hint:'Tap to model washing hands.',readOnly:false,point:{x:100,y:180}};

describe('Tool discovery view',()=>{
  it('starts hidden with no old metadata and does not move focus',()=>{
    const f=fixture();f.node('keepFocus').focus();const active=document.activeElement;expect(f.overlay.hidden).toBe(true);expect(f.overlay.getAttribute('aria-hidden')).toBe('true');expect(f.overlay.style.pointerEvents).toBe('none');expect({...f.overlay.dataset}).toEqual({});f.view.render(tool);expect(document.activeElement).toBe(active);expect(f.overlay.querySelector('[aria-live]')).toBeNull();
  });
  it('renders the tool text and a leader in canvas CSS coordinates',()=>{
    const f=fixture(),result=f.view.render(tool);expect(result).toEqual(Discovery.layout(standard));expect(f.overlay.hidden).toBe(false);expect(f.overlay.dataset.tool).toBe('soap');expect(f.overlay.dataset.readOnly).toBe('false');expect(f.node('studioDiscoveryTitle').textContent).toBe('soap');expect(f.node('studioDiscoveryHint').textContent).toBe(tool.hint);expect(f.node('studioDiscoveryBadge').textContent).toBe('3D tool');expect(f.card.style.left).toBe('118px');expect(f.card.style.top).toBe('130px');expect(f.node('studioDiscoveryLeader').getAttribute('viewBox')).toBe('0 0 600 400');expect(f.node('studioDiscoveryLine').getAttribute('x1')).toBe('100');expect(f.node('studioDiscoveryLine').getAttribute('x2')).toBe('118');expect(f.node('studioDiscoveryDot').getAttribute('cy')).toBe('180');
  });
  it('moves a same-tool anchor without rewriting its unchanged text',()=>{
    const f=fixture();f.view.render(tool);const titleChild=f.node('studioDiscoveryTitle').firstChild,hintChild=f.node('studioDiscoveryHint').firstChild;f.view.render({...tool,point:{x:550,y:180}});expect(f.node('studioDiscoveryTitle').firstChild).toBe(titleChild);expect(f.node('studioDiscoveryHint').firstChild).toBe(hintChild);expect(f.card.style.left).toBe('312px');expect(f.node('studioDiscoveryDot').getAttribute('cx')).toBe('550');
  });
  it('updates effective hint and read-only wording for a changed context',()=>{
    const f=fixture();f.view.render(tool);f.view.render({...tool,id:'tub',name:'leftovers',hint:'This view is read-only.',readOnly:true});expect(f.overlay.dataset.tool).toBe('tub');expect(f.overlay.dataset.readOnly).toBe('true');expect(f.node('studioDiscoveryBadge').textContent).toBe('Read-only view');expect(f.node('studioDiscoveryHint').textContent).toBe('This view is read-only.');
  });
  it('renders untrusted text as text rather than markup',()=>{
    const f=fixture();f.view.render({...tool,name:'<img src=x onerror=alert(1)>',hint:'<b>Lift lid</b>'});expect(f.node('studioDiscoveryTitle').textContent).toContain('<img');expect(f.node('studioDiscoveryTitle').children.length).toBe(0);expect(f.node('studioDiscoveryHint').children.length).toBe(0);
  });
  it('refits at phone sizes and expands again after a wider resize',()=>{
    const f=fixture();f.frame({width:160,height:270});f.measure({width:144,height:90});let result=f.view.render({...tool,point:{x:80,y:160}});contained(result,{width:160,height:270,anchor:{x:80,y:160}});expect(f.card.style.maxWidth).toBe('144px');f.frame({width:760,height:450});f.measure({width:220,height:100});result=f.view.render(tool);expect(result.card.width).toBe(220);expect(f.card.style.maxWidth).toBe('250px');
  });
  it('caps an oversized measured card to the visible frame',()=>{
    const f=fixture();f.frame({width:300,height:270});f.measure({width:400,height:400});const result=f.view.render({...tool,point:{x:150,y:135}});contained(result,{width:300,height:270,anchor:{x:150,y:135}});expect(f.card.style.width).toBe('250px');expect(f.card.style.height).toBe('254px');
  });
  it('clears every owned label, style and projected attribute',()=>{
    const f=fixture();f.view.render(tool);expect(f.view.clear()).toBeNull();expect(f.overlay.hidden).toBe(true);expect({...f.overlay.dataset}).toEqual({});for(const id of ['studioDiscoveryTitle','studioDiscoveryHint','studioDiscoveryBadge'])expect(f.node(id).textContent).toBe('');for(const key of ['left','top','width','height','maxWidth','maxHeight'])expect(f.card.style[key]).toBe('');for(const key of ['x1','y1','x2','y2'])expect(f.node('studioDiscoveryLine').hasAttribute(key)).toBe(false);expect(f.node('studioDiscoveryDot').hasAttribute('cx')).toBe(false);expect(f.node('studioDiscoveryLeader').hasAttribute('viewBox')).toBe(false);
  });
  it.each([null,{}, {...tool,id:''},{...tool,name:''},{...tool,hint:null},{...tool,readOnly:'false'},{...tool,point:{x:601,y:0}},{...tool,point:{x:0,y:NaN}}])('clears an existing card on invalid render data %#',data=>{
    const f=fixture();f.view.render(tool);expect(f.view.render(data)).toBeNull();expect(f.overlay.hidden).toBe(true);expect({...f.overlay.dataset}).toEqual({});
  });
  it('clears when the canvas or card has no measurable area',()=>{
    const f=fixture();f.view.render(tool);f.frame({width:0,height:0});expect(f.view.render(tool)).toBeNull();expect(f.overlay.hidden).toBe(true);f.frame({width:600,height:400});f.measure({width:0,height:0});expect(f.view.render(tool)).toBeNull();expect(f.overlay.hidden).toBe(true);
  });
  it('disposes idempotently and never restores a card afterward',()=>{
    const f=fixture();f.view.render(tool);f.view.dispose();f.view.dispose();expect(f.view.render(tool)).toBeNull();expect(f.overlay.hidden).toBe(true);expect({...f.overlay.dataset}).toEqual({});expect(f.view.clear()).toBeNull();
  });
});
