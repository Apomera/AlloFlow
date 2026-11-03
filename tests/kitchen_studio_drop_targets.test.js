import {afterEach,describe,expect,it,vi} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const require=createRequire(import.meta.url),Drop=require('../stem_lab/kitchen_studio/kitchen_studio_drop_targets.js');
const source=readFileSync(require.resolve('../stem_lab/kitchen_studio/kitchen_studio_drop_targets.js'),'utf8');
const views=[];
afterEach(()=>{views.splice(0).forEach(view=>view.dispose());vi.restoreAllMocks();document.body.innerHTML='';});
const target=(id,x=300,y=200,width=126,height=43)=>({id,point:{x,y},width,height});
const standard={width:600,height:400,targets:[target('jugFill')]};
const mappings=[['prepare','prepare','prepBoardTarget'],['mat','secure','boardMat'],['spatula','spread','panEdge'],['spatula','crowd','panCenter'],['spread','spread','panEdge'],['plate','plate','servingPlate'],['stock','add150','jugFill'],['probe','thick','probeCenter'],['probe','surface','probeSurface'],['chicken','cook','ovenDrop'],['chicken','serve','serveDrop'],['store','shallow','shallowTray'],['store','chill','fridge'],['store','discard','wasteBin'],['label','label','containerTarget']];
function intersects(a,b){return Math.min(a.x+a.width,b.x+b.width)>Math.max(a.x,b.x)&&Math.min(a.y+a.height,b.y+b.height)>Math.max(a.y,b.y);}
function contained(result,options){
  for(const item of result){
    const card=item.card,anchor=options.targets.find(t=>t.id===item.id).point;
    expect(card.x).toBeGreaterThanOrEqual(8);expect(card.y).toBeGreaterThanOrEqual(8);expect(card.x+card.width).toBeLessThanOrEqual(options.width-8);expect(card.y+card.height).toBeLessThanOrEqual(options.height-8);
    expect(item.leader.start).toEqual(anchor);expect(Object.values(card).every(Number.isFinite)).toBe(true);
    const end=item.leader.end;expect(end.x).toBeGreaterThanOrEqual(card.x);expect(end.x).toBeLessThanOrEqual(card.x+card.width);expect(end.y).toBeGreaterThanOrEqual(card.y);expect(end.y).toBeLessThanOrEqual(card.y+card.height);
    expect(end.x===card.x||end.x===card.x+card.width||end.y===card.y||end.y===card.y+card.height).toBe(true);
  }
}
describe('Physical drop target descriptions',()=>{
  it('exports browser and CommonJS APIs without a DOM',()=>{const context={window:{}};runInNewContext(source,context);expect(Object.keys(context.window.KitchenStudioDropTargets).sort()).toEqual(['activeTarget','layout','mount','supports']);expect(context.window.KitchenStudioDropTargets.activeTarget('probe',{action:'surface'})).toBe('probeSurface');});
  it.each(['prepare','mat','spatula','spread','plate','stock','probe','chicken','store','label'])('supports the simple %s mechanic',kind=>expect(Drop.supports(kind)).toBe(true));
  it.each(['tipPour','tipPlate','insertProbe','stir','handwash','cut','dial','lid','door','ovenDoor','tap','constructor','__proto__',null,{}])('does not advertise advanced or noncarry mechanic %#',kind=>{expect(Drop.supports(kind)).toBe(false);expect(Drop.activeTarget(kind,{action:'plate'})).toBeNull();});
  it.each(mappings)('%s action %s resolves the physical %s marker',(kind,action,id)=>expect(Drop.activeTarget(kind,{action,target:'unrelated-alias',accepted:false})).toBe(id));
  it('requires an action appropriate to the held mechanic instead of guessing from a target or judgement',()=>{
    for(const [kind] of mappings){expect(Drop.activeTarget(kind,{target:'fridge'})).toBeNull();expect(Drop.activeTarget(kind,{action:null,target:'panCenter'})).toBeNull();expect(Drop.activeTarget(kind,{action:'__proto__'})).toBeNull();expect(Drop.activeTarget(kind,{action:'wrong-action',accepted:true})).toBeNull();}
    expect(Drop.activeTarget('stock',{action:'cook'})).toBeNull();expect(Drop.activeTarget('probe',{action:'serve'})).toBeNull();expect(Drop.activeTarget('store',null)).toBeNull();expect(Drop.activeTarget('label',{action:'label',target:'container'})).toBe('containerTarget');
  });
  it('never edits the provided destination',()=>{const destination=Object.freeze({action:'chill',target:'fridge',accepted:false});expect(Drop.activeTarget('store',destination)).toBe('fridge');expect(destination).toEqual({action:'chill',target:'fridge',accepted:false});});
});
describe('Projected drop target layout',()=>{
  it('prefers above a single unobstructed destination with a12px leader',()=>{const result=Drop.layout(standard);expect(result).toEqual([{id:'jugFill',card:{x:237,y:145,width:126,height:43},leader:{start:{x:300,y:200},end:{x:300,y:188}}}]);});
  it('uses below when the upper preferred position would cover the anchor',()=>{const options={...standard,targets:[target('jugFill',300,12)]},result=Drop.layout(options);contained(result,options);expect(result[0].card.y).toBe(24);});
  it.each([[320,270],[390,420],[760,450],[17,17]])('contains labels and keeps actual edge anchors at %s by %s',(width,height)=>{for(const point of [{x:0,y:0},{x:width,y:height},{x:width/2,y:height/2}]){const options={width,height,targets:[{...target('edge'),point}]},result=Drop.layout(options);expect(result).toHaveLength(1);contained(result,options);}});
  it.each([[320,270],[390,420],[760,450]])('separates nearby pan/probe destination labels in a %s by %s canvas',(width,height)=>{
    const options={width,height,targets:[target('centre',width/2,height/2),target('surface',width/2+13,height/2+9),target('oven',width/2-14,height/2-8)]},result=Drop.layout(options);expect(result).toHaveLength(3);contained(result,options);for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)expect(intersects(result[i].card,result[j].card)).toBe(false);
  });
  it('keeps three phone labels clear of top, bottom and keyboard HUDs when there is room',()=>{
    const options={width:320,height:300,targets:[target('tray',100,160,120,40),target('fridge',165,150,120,40),target('waste',225,166,120,40)],avoid:[{x:8,y:8,width:304,height:62},{x:8,y:244,width:304,height:48},{x:150,y:112,width:100,height:25}]},result=Drop.layout(options);expect(result).toHaveLength(3);contained(result,options);for(const item of result){for(const obstacle of options.avoid)expect(intersects(item.card,obstacle)).toBe(false);for(const other of result)if(other!==item)expect(intersects(item.card,other.card)).toBe(false);}
  });
  it('provides a finite bounded fallback when labels and HUDs cannot all fit',()=>{
    const options={width:70,height:55,targets:[target('a',10,10,150,80),target('b',50,40,150,80)],avoid:[{x:0,y:0,width:70,height:55}]},one=Drop.layout(options);expect(one).toHaveLength(2);contained(one,options);expect(one).toEqual(Drop.layout(options));
  });
  it('does not mutate target points, sizes or avoid boxes and returns independent results',()=>{
    const options=Object.freeze({width:600,height:400,targets:Object.freeze([Object.freeze({id:'a',point:Object.freeze({x:300,y:200}),width:126,height:43})]),avoid:Object.freeze([Object.freeze({x:8,y:8,width:200,height:50})])}),before=JSON.stringify(options),one=Drop.layout(options),two=Drop.layout(options);expect(one).toEqual(two);one[0].leader.start.x=999;one[0].card.x=999;expect(two[0].leader.start.x).toBe(300);expect(JSON.stringify(options)).toBe(before);
  });
  it.each([null,{}, {...standard,width:0},{...standard,width:16},{...standard,height:16},{...standard,width:'600'},{...standard,width:NaN},{...standard,height:Infinity},{...standard,targets:null}])('rejects an invalid frame %#',options=>expect(Drop.layout(options)).toEqual([]));
  it.each([null,{},target(''),target('a',-1),target('a',601),target('a',100,-1),target('a',100,401),target('a',NaN),target('a',100,Infinity),target('a',100,100,0),target('a',100,100,Infinity),target('a',100,100,100,-1)])('omits invalid/offscreen targets instead of clamping their anchors %#',bad=>expect(Drop.layout({...standard,targets:[bad,target('valid')]}).map(v=>v.id)).toEqual(['valid']));
  it('deduplicates IDs and safely accepts names that coincide with object prototype keys',()=>{const result=Drop.layout({...standard,targets:[target('__proto__'),target('constructor',350),target('__proto__',400)]});expect(result.map(v=>v.id)).toEqual(['__proto__','constructor']);expect(result[0].leader.start.x).toBe(300);});
  it('ignores malformed or nonpositive avoid boxes',()=>{expect(Drop.layout({...standard,avoid:[null,{}, {x:0,y:0,width:NaN,height:30},{x:0,y:0,width:40,height:0}]})).toEqual(Drop.layout(standard));});
});
function fixture(){
  document.body.innerHTML='<button id="focus">Keep focus</button><div id="viewport"><canvas></canvas><div id="hud"></div><div id="studioDropTargets"><svg id="studioDropLeaders"></svg></div></div>';
  const canvas=document.querySelector('canvas'),overlay=document.getElementById('studioDropTargets'),svg=document.getElementById('studioDropLeaders'),hud=document.getElementById('hud');let frame={left:40,top:70,width:600,height:400},measure={width:126,height:43},hudBox={left:48,top:78,width:584,height:60};
  canvas.getBoundingClientRect=()=>({...frame});hud.getBoundingClientRect=()=>({...hudBox});hud.getClientRects=()=>[hudBox];
  vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(function(){return this.classList.contains('studio-drop-label')?{left:frame.left+(parseFloat(this.style.left)||0),top:frame.top+(parseFloat(this.style.top)||0),...measure}:{left:0,top:0,width:0,height:0};});
  const view=Drop.mount({canvas,avoidElements:[hud]});views.push(view);
  return {view,canvas,overlay,svg,hud,frame:value=>frame={...frame,...value},measure:value=>measure=value,hudBox:value=>hudBox=value,card:id=>overlay.querySelector('[data-drop-target="'+id+'"]'),group:id=>svg.querySelector('[data-drop-anchor="'+id+'"]')};
}
const data={targets:[{id:'jugFill',label:'Jug opening',point:{x:300,y:200}}],active:null};
describe('Projected drop target view',()=>{
  it('starts cleared and adds no focus stop, event handler or live region',()=>{
    const f=fixture(),button=document.getElementById('focus');button.focus();const before=document.activeElement;expect(f.overlay.hidden).toBe(true);expect(f.overlay.getAttribute('aria-hidden')).toBe('true');expect(f.overlay.style.pointerEvents).toBe('none');expect(f.svg.style.pointerEvents).toBe('none');expect({...f.overlay.dataset}).toEqual({});f.view.render(data);expect(document.activeElement).toBe(before);expect(f.overlay.querySelector('button,a,input,select,textarea,[tabindex],[aria-live]')).toBeNull();
  });
  it('renders neutral names and SVG leaders in canvas CSS coordinates',()=>{
    const f=fixture(),result=f.view.render(data),card=f.card('jugFill'),group=f.group('jugFill');expect(result).toHaveLength(1);expect(f.overlay.hidden).toBe(false);expect(f.overlay.dataset.active).toBe('');expect(card.querySelector('strong').textContent).toBe('Jug opening');expect(card.querySelector('small').textContent).toBe('Destination');expect(card.dataset.active).toBe('false');expect(card.getAttribute('aria-hidden')).toBe('true');expect(card.style.pointerEvents).toBe('none');expect(group.style.pointerEvents).toBe('none');expect(f.svg.getAttribute('viewBox')).toBe('0 0 600 400');expect(group.querySelector('circle').getAttribute('cx')).toBe('300');expect(group.querySelector('circle').getAttribute('cy')).toBe('200');expect(group.querySelector('line').getAttribute('x1')).toBe('300');expect(group.querySelector('line').getAttribute('y2')).toBe('188');
  });
  it('changes the physical selection while retaining every alternative and reusing same-target nodes',()=>{
    const f=fixture(),choices={targets:[{id:'probeCenter',label:'Chicken centre',point:{x:300,y:200}},{id:'probeSurface',label:'Chicken surface',point:{x:315,y:206}}],active:'probeCenter'};f.view.render(choices);const centre=f.card('probeCenter'),firstText=centre.querySelector('strong').firstChild;expect(centre.querySelector('small').textContent).toBe('Release here');f.view.render({...choices,active:'probeSurface'});expect(f.card('probeCenter')).toBe(centre);expect(centre.querySelector('strong').firstChild).toBe(firstText);expect(centre.querySelector('small').textContent).toBe('Destination');expect(f.card('probeSurface').dataset.active).toBe('true');expect(f.group('probeSurface').dataset.active).toBe('true');expect(f.overlay.dataset.active).toBe('probeSurface');expect(f.overlay.querySelectorAll('.studio-drop-label')).toHaveLength(2);
  });
  it('updates a same-target point without recreating its label',()=>{const f=fixture();f.view.render(data);const card=f.card('jugFill');f.view.render({targets:[{...data.targets[0],point:{x:400,y:240}}],active:null});expect(f.card('jugFill')).toBe(card);expect(f.group('jugFill').querySelector('circle').getAttribute('cx')).toBe('400');expect(f.group('jugFill').querySelector('circle').getAttribute('cy')).toBe('240');});
  it('uses textContent for names rather than executable markup',()=>{const f=fixture();f.view.render({targets:[{...data.targets[0],label:'<img src=x onerror=alert(1)>'}],active:null});expect(f.card('jugFill').querySelector('strong').children).toHaveLength(0);expect(f.card('jugFill').textContent).toContain('<img');});
  it('avoids visible HUDs and explicit additional avoid boxes',()=>{
    const f=fixture();f.hudBox({left:40,top:205,width:600,height:60});const extra={x:350,y:180,width:150,height:70},result=f.view.render({...data,avoid:[extra]});expect(intersects(result[0].card,{x:0,y:135,width:600,height:60})).toBe(false);expect(intersects(result[0].card,extra)).toBe(false);
  });
  it('ignores hidden, hidden-ancestor, nonvisible and outside HUDs',()=>{
    const f=fixture();f.hudBox({left:40,top:205,width:600,height:60});f.hud.hidden=true;expect(f.view.render(data)[0].card.y).toBe(145);f.hud.hidden=false;f.hud.style.visibility='hidden';expect(f.view.render(data)[0].card.y).toBe(145);f.hud.style.visibility='';const wrapper=document.createElement('div');wrapper.hidden=true;f.hud.replaceWith(wrapper);wrapper.appendChild(f.hud);expect(f.view.render(data)[0].card.y).toBe(145);wrapper.hidden=false;f.hudBox({left:800,top:70,width:100,height:50});expect(f.view.render(data)[0].card.y).toBe(145);
  });
  it('caps measured sizes and inline minimum width in tiny canvases, then expands again',()=>{
    const f=fixture();f.frame({width:70,height:55});f.measure({width:400,height:300});const result=f.view.render({targets:[{...data.targets[0],point:{x:35,y:25}}],active:'jugFill'}),card=f.card('jugFill');contained(result,{width:70,height:55,targets:[target('jugFill',35,25)]});expect(card.style.minWidth).toBe('54px');expect(card.style.maxWidth).toBe('54px');expect(card.style.width).toBe('54px');expect(card.style.height).toBe('39px');f.frame({width:600,height:400});f.measure({width:126,height:43});f.view.render(data);expect(card.style.minWidth).toBe('100px');expect(card.style.width).toBe('126px');expect(card.style.height).toBe('43px');
  });
  it('removes stale tool targets and does not retain a missing active ID',()=>{
    const f=fixture();f.view.render({...data,active:'jugFill'});const oldCard=f.card('jugFill');f.view.render({targets:[{id:'fridge',label:'Refrigerator shelf',point:{x:350,y:150}}],active:'jugFill'});expect(oldCard.isConnected).toBe(false);expect(f.group('jugFill')).toBeNull();expect(f.card('fridge')).not.toBeNull();expect(f.overlay.dataset.active).toBe('');
  });
  it.each([null,{}, {targets:null},{targets:[]},{targets:[{id:'a',label:'',point:{x:10,y:10}}]},{targets:[{id:'a',label:'Outside',point:{x:601,y:10}}]},{targets:[{id:'a',label:'Invalid',point:{x:NaN,y:10}}]}])('clears prior markers for empty or invalid render data %#',value=>{
    const f=fixture();f.view.render(data);expect(f.view.render(value)).toEqual([]);expect(f.overlay.hidden).toBe(true);expect(f.overlay.querySelectorAll('.studio-drop-label')).toHaveLength(0);expect(f.svg.children).toHaveLength(0);expect(f.svg.hasAttribute('viewBox')).toBe(false);expect({...f.overlay.dataset}).toEqual({});
  });
  it('keeps valid targets when a neighbour is malformed, duplicated or unmeasurable',()=>{
    const f=fixture();f.view.render({targets:[data.targets[0],data.targets[0],{id:'bad',label:'Bad point',point:{x:-2,y:20}}],active:'bad'});expect(f.overlay.querySelectorAll('.studio-drop-label')).toHaveLength(1);expect(f.overlay.dataset.active).toBe('');f.measure({width:0,height:0});expect(f.view.render(data)).toEqual([]);expect(f.overlay.hidden).toBe(true);
  });
  it('clears when the canvas becomes unmeasurable',()=>{const f=fixture();f.view.render(data);f.frame({width:0,height:0});expect(f.view.render(data)).toEqual([]);expect(f.overlay.hidden).toBe(true);expect(f.svg.children).toHaveLength(0);});
  it('clears only its own nodes and disposes idempotently',()=>{
    const f=fixture(),other=document.createElement('span');other.textContent='Unowned content';f.overlay.appendChild(other);f.view.render(data);expect(f.view.clear()).toEqual([]);expect(other.isConnected).toBe(true);expect(f.svg.hasAttribute('viewBox')).toBe(false);f.view.render(data);f.view.dispose();f.view.dispose();expect(f.view.render(data)).toEqual([]);expect(f.overlay.hidden).toBe(true);expect(f.overlay.querySelector('.studio-drop-label')).toBeNull();expect({...f.overlay.dataset}).toEqual({});
  });
});
