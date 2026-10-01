import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const source=readFileSync('stem_lab/stem_tool_artstudio.js','utf8');
const helpers=new Function(source.slice(source.indexOf('  function artStudioSpinNumber'),source.indexOf('  function artStudioOpModel'))+'return {engine:artStudioSpinEngine,model:artStudioSpinModel};')();
let frames,contexts,canvases,runtimes,hidden,frameId;
function context(canvas){
  if(contexts.has(canvas))return contexts.get(canvas);
  let path=[];
  const ctx={marks:[],save(){},restore(){},beginPath(){path=[];},arc(...args){path.push(['arc',...args]);},clip(){},
    moveTo(...args){path.push(['move',...args]);},lineTo(...args){path.push(['line',...args]);},
    fill(){this.marks.push({path:structuredClone(path),color:this.fillStyle});},stroke(){this.marks.push({path:structuredClone(path),color:this.strokeStyle});},
    clearRect(){this.marks=[];},fillRect(){this.marks.push({paper:this.fillStyle});},
    getImageData(){return {marks:structuredClone(this.marks)};},putImageData(image){this.marks=structuredClone(image.marks);},
    drawImage(image){if(contexts.has(image))this.marks.push(...structuredClone(contexts.get(image).marks));else this.marks=JSON.parse(atob(image.src.split(',')[1]));}};
  contexts.set(canvas,ctx);return ctx;
}
beforeEach(()=>{
  frames=new Map();contexts=new WeakMap();canvases=[];runtimes=[];hidden=false;frameId=0;
  vi.spyOn(document,'hidden','get').mockImplementation(()=>hidden);
  vi.stubGlobal('requestAnimationFrame',callback=>{frames.set(++frameId,callback);return frameId;});
  vi.stubGlobal('cancelAnimationFrame',id=>frames.delete(id));
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockImplementation(function(){return context(this);});
  vi.spyOn(HTMLCanvasElement.prototype,'toDataURL').mockImplementation(function(){return 'data:image/png;base64,'+btoa(JSON.stringify(context(this).marks));});
  vi.spyOn(Math,'random').mockReturnValue(.5);
  vi.stubGlobal('Image',class{set src(value){this._src=value;queueMicrotask(()=>this.onload?.());}get src(){return this._src;}});
});
afterEach(()=>{runtimes.forEach(runtime=>runtime.dispose());canvases.forEach(canvas=>canvas.remove());vi.restoreAllMocks();vi.unstubAllGlobals();});
function mount(initial={},settings={}){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;document.body.appendChild(canvas);canvases.push(canvas);
  canvas.getBoundingClientRect=()=>({left:0,top:0,width:512,height:512});
  Object.assign(canvas.dataset,{paused:'1',rpm:'120',brush:'6',viscosity:'50',direction:'1',hue:'0',sat:'0',lit:'0',dark:'0',splatter:'0',touchMode:'scroll',...settings});
  const persist=vi.fn(),announce=vi.fn();
  runtimes.push(helpers.engine(canvas,initial,{persist,announce,describe:()=>'',allows:event=>event.pointerType!=='touch'||canvas.dataset.touchMode==='draw'}));
  return {canvas,persist,announce,ctx:context(canvas),state:()=>canvas._captureArtStudioState()};
}
function pointer(canvas,type,x,y,id=1,pointerType='mouse'){
  const event=new MouseEvent(type,{clientX:x,clientY:y,button:0,cancelable:true});
  Object.defineProperties(event,{pointerId:{value:id},pointerType:{value:pointerType},isPrimary:{value:true}});
  canvas['on'+type](event);return event;
}
function key(canvas,value,extra={}){canvas.onkeydown(new KeyboardEvent('keydown',{key:value,cancelable:true,...extra}));}
function frame(time){const current=[...frames.values()];frames.clear();current.forEach(callback=>callback(time));}
function click(canvas,x=330,y=256){pointer(canvas,'pointerdown',x,y);pointer(canvas,'pointerup',x,y);}

describe('Spin Art painting and playback',()=>{
  it('paints while paused, finishes fast release endpoints, and undoes a whole gesture',()=>{
    const art=mount();const blank=art.canvas.toDataURL();
    pointer(art.canvas,'pointerdown',290,256);expect(art.ctx.marks.length).toBe(1);expect(frames.size).toBe(0);
    pointer(art.canvas,'pointerup',340,256);
    const result=art.canvas.toDataURL(),drips=art.state().spinDrips;
    expect(drips.at(-1).px).toBe(340);expect(drips.length).toBeGreaterThan(10);expect(art.persist).toHaveBeenCalled();
    art.canvas._spinUndoAction();expect(art.canvas.toDataURL()).toBe(blank);expect(art.state().spinDrips).toEqual([]);
    art.canvas._spinRedoAction();expect(art.canvas.toDataURL()).toBe(result);expect(art.state().spinDrips).toEqual(drips);
  });
  it('places the first paint at the pointer even at a rotated phase',()=>{
    const art=mount({spinAngle:Math.PI/2});click(art.canvas,350,210);
    const drip=art.state().spinDrips[0];expect(drip.px).toBeCloseTo(350);expect(drip.py).toBeCloseTo(210);expect(art.ctx.marks[0].color).toBe('hsl(0,0%,0%)');
  });
  it('ignores unrelated pointers and preserves touch scrolling',()=>{
    const art=mount();expect(pointer(art.canvas,'pointerdown',320,256,4,'touch').defaultPrevented).toBe(false);expect(art.ctx.marks).toEqual([]);
    pointer(art.canvas,'pointerdown',300,256,1);
    pointer(art.canvas,'pointermove',400,200,2);pointer(art.canvas,'pointerup',400,200,2);
    expect(art.canvas._spinPointerDown).toBe(true);expect(art.state().spinDrips.length).toBe(1);
    pointer(art.canvas,'pointercancel',300,256,1);expect(art.canvas._spinPointerDown).toBe(false);
    art.canvas._spinUndoAction();expect(art.ctx.marks).toEqual([]);
  });
  it('supports keyboard paint, undo/redo shortcuts, clear recovery, and branch edits',()=>{
    const art=mount();key(art.canvas,'Enter');const painted=art.canvas.toDataURL();
    art.canvas._spinClearAction();expect(art.ctx.marks).toEqual([]);
    key(art.canvas,'z',{ctrlKey:true});expect(art.canvas.toDataURL()).toBe(painted);
    key(art.canvas,'Z',{metaKey:true,shiftKey:true});expect(art.ctx.marks).toEqual([]);
    key(art.canvas,'z',{metaKey:true});key(art.canvas,'ArrowRight',{shiftKey:true});const branch=art.canvas.toDataURL();
    art.canvas._spinRedoAction();expect(art.canvas.toDataURL()).toBe(branch);expect(art.state().spinDrips).toHaveLength(2);
  });
  it('bounds undo memory to twenty edits',()=>{
    const art=mount();for(let i=0;i<25;i++)key(art.canvas,'Enter');for(let i=0;i<25;i++)art.canvas._spinUndoAction();
    expect(art.state().spinDrips).toHaveLength(5);
  });
  it('resumes in one action, stays idle while paused, and stops when every drop is spent',()=>{
    const art=mount();click(art.canvas);expect(frames.size).toBe(0);
    art.canvas.dataset.paused='0';art.canvas._spinSync();expect(frames.size).toBe(1);
    frame(0);frame(100);expect(art.state().spinAngle).not.toBe(0);expect(frames.size).toBe(1);
    art.canvas.dataset.paused='1';art.canvas._spinSync();const saved=art.canvas.toDataURL();expect(frames.size).toBe(0);
    art.canvas.dataset.paused='0';art.canvas._spinSync();frame(1000);expect(art.canvas.toDataURL()).toBe(saved);
    for(let time=1100;time<8000;time+=100)frame(time);
    expect(art.state().spinDrips).toEqual([]);expect(frames.size).toBe(0);expect(art.persist.mock.calls.at(-1)[0].spinSnapshot).toBe(art.canvas.toDataURL());
  });
  it('produces identical physics and paint on 60 Hz and 120 Hz displays',()=>{
    const initial={spinDrips:[{x:260,y:256,vx:0,vy:0,life:300,size:3,hue:80,sat:85,lit:50}]};
    const a=mount(initial,{paused:'0'});frame(0);for(let i=1;i<=60;i++)frame(i*1000/60);const stateA=a.state();runtimes[0].dispose();
    const b=mount(initial,{paused:'0'});frame(0);for(let i=1;i<=120;i++)frame(i*1000/120);
    expect(b.state()).toEqual(stateA);
  });
  it('does not catch up hidden time and releases all resources on disposal',()=>{
    const art=mount({}, {paused:'0'});click(art.canvas);frame(0);frame(40);
    hidden=true;document.dispatchEvent(new Event('visibilitychange'));expect(frames.size).toBe(0);const saved=art.state();
    hidden=false;document.dispatchEvent(new Event('visibilitychange'));frame(100000);expect(art.state()).toEqual(saved);
    runtimes[0].dispose();expect(frames.size).toBe(0);document.dispatchEvent(new Event('visibilitychange'));expect(frames.size).toBe(0);
  });
  it('respects thickness for new paint and changes rotation direction',()=>{
    const thin=mount({}, {viscosity:'0',paused:'0'}),thick=mount({}, {viscosity:'100',paused:'0',direction:'-1'});
    click(thin.canvas);click(thick.canvas);frame(0);frame(100);
    expect(thin.state().spinDrips[0].x).toBeGreaterThan(thick.state().spinDrips[0].x);
    expect(thin.state().spinAngle).toBeCloseTo(-thick.state().spinAngle);
    thick.canvas.dataset.viscosity='0';key(thick.canvas,'Enter');expect(thick.state().spinDrips[0].flow).toBe(.25);expect(thick.state().spinDrips[1].flow).toBe(1.75);
  });
  it('restores saved paint before exporting and validates malformed particles',async()=>{
    const first=mount();click(first.canvas);const saved=first.state();
    const art=mount({...saved,spinDrips:[...saved.spinDrips,{x:NaN},{x:256,y:256,vx:0,vy:0,life:200,size:-4,hue:10},{x:1e300,y:256,vx:0,vy:0,life:200,size:4,hue:10}]});
    const exported=art.canvas._spinExportAction(true);expect(exported).toBeInstanceOf(Promise);
    await art.canvas._artStudioReady;expect(art.canvas.toDataURL()).toBe(saved.spinSnapshot);expect(art.state().spinDrips).toEqual(saved.spinDrips);
    expect(await exported).toBe(saved.spinSnapshot);
  });
  it('keeps transparent export separate from paper and ignores off-disc paint',()=>{
    const art=mount();pointer(art.canvas,'pointerdown',0,0);expect(art.ctx.marks).toEqual([]);click(art.canvas);
    const transparent=art.canvas._spinExportAction(true);expect(transparent).toBe(art.canvas.toDataURL());expect(art.canvas._spinExportAction()).not.toBe(transparent);
    art.canvas.dataset.dark='1';expect(art.canvas._spinExportAction(true)).toBe(transparent);
  });
  it('bounds restored controls and preserves a reduced-motion pause',()=>{
    expect(helpers.model({spinRPM:Infinity,spinBrush:-20,spinViscosity:1000,spinDirection:17},true)).toEqual({rpm:120,brush:2,viscosity:100,direction:1,paused:true});
    expect(helpers.model({spinPaused:false},true).paused).toBe(false);
  });
});
