import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';

const source=readFileSync('stem_lab/stem_tool_geometryworld_builder.js','utf8');
class Vector2{constructor(x=0,y=0){this.x=x;this.y=y;}set(x,y){this.x=x;this.y=y;return this;}}
class Vector4{constructor(x=0,y=0,z=0,w=0){this.set(x,y,z,w);}set(x,y,z,w){Object.assign(this,{x,y,z,w});return this;}copy(v){return this.set(v.x,v.y,v.z,v.w);}}
class Color{constructor(value=0){this.value=value;}clone(){return new Color(this.value);}copy(v){this.value=v.value;return this;}}
function load(){
  // These tests exercise export behavior. Avoid parsing the unrelated full tool
  // stylesheet in jsdom; actual WebGL/UI coverage verifies the real styling.
  if(!document.getElementById('allo-geometryworld-builder-css')){const style=document.createElement('style');style.id='allo-geometryworld-builder-css';document.head.appendChild(style);}
  window.THREE={Vector2,Vector4,Color};
  window.StemLab={_registry:{geometryWorld:{aliases:[],render(){return null;}}}};
  new Function(source)();
  return window.StemLab.geometryWorldBuilderPure;
}
function fixture({postFx=false,fail='',autoBlob=false}={}){
  const state={width:306,height:633,ratio:1.5,viewport:new Vector4(4,6,290,612),scissor:new Vector4(8,10,282,590),scissorTest:true,target:{name:'original-target'},clear:new Color(0x123456),alpha:.8};
  const calls={renders:[],captures:[],toBlob:0};let callback;
  const canvas={style:{width:'100%',height:'100%'},toBlob(cb){calls.toBlob++;calls.captures.push([state.width,state.height,state.ratio]);if(fail==='encoding-throw')throw new Error('encoding failed');callback=cb;if(autoBlob)cb(new Blob(['PNG']));}};
  const renderer={domElement:canvas,capabilities:{maxTextureSize:4096},xr:{enabled:true},autoClear:true,
    getContext:()=>({MAX_RENDERBUFFER_SIZE:1,MAX_VIEWPORT_DIMS:2,getParameter:key=>key===1?4096:[4096,4096]}),
    getSize:v=>v.set(state.width,state.height),getPixelRatio:()=>state.ratio,
    setSize(w,h,style){expect(style).toBe(false);state.width=w;state.height=h;state.viewport.set(0,0,w,h);if(fail==='resize'&&w===990)throw new Error('resize failed');},
    setPixelRatio(r){state.ratio=r;this.setSize(state.width,state.height,false);},
    getRenderTarget:()=>state.target,setRenderTarget:t=>{state.target=t;},getViewport:v=>v.copy(state.viewport),setViewport:v=>state.viewport.copy(v),
    getScissor:v=>v.copy(state.scissor),setScissor:v=>state.scissor.copy(v),getScissorTest:()=>state.scissorTest,setScissorTest:v=>{state.scissorTest=v;},
    getClearColor:v=>v.copy(state.clear),getClearAlpha:()=>state.alpha,setClearColor:(c,a)=>{state.clear=c.clone();state.alpha=a;},
    render(scene,camera){calls.renders.push({width:state.width,height:state.height,ratio:state.ratio,camera,scissorTest:state.scissorTest,xr:this.xr.enabled});if(fail==='render'){this.autoClear=false;state.clear=new Color(0);throw new Error('render failed');}}
  };
  const composer={_width:304,_height:630,_pixelRatio:1.25,readBuffer:{name:'read'},writeBuffer:{name:'write'},renderToScreen:true,passes:[{renderToScreen:false}],
    setSize(w,h){this._width=w;this._height=h;},setPixelRatio(r){this._pixelRatio=r;this.setSize(this._width,this._height);},
    render(){calls.renders.push({width:this._width,height:this._height,ratio:this._pixelRatio});[this.readBuffer,this.writeBuffer]=[this.writeBuffer,this.readBuffer];this.passes[0].renderToScreen=true;renderer.setRenderTarget({name:'temporary'});if(fail==='composer')throw new Error('composer failed');}
  };
  const engine={renderer,composer,_postFxEnabled:postFx,scene:{name:'same-scene'},camera:{aspect:306/633,position:[3,4,5],quaternion:[0,0,0,1],up:[0,1,0]},blocks:{original:true},_undoStack:[{action:'place'}],_showcase:{look:'studio',view:'side'}};
  function snapshot(){return JSON.parse(JSON.stringify({state,autoClear:renderer.autoClear,xr:renderer.xr.enabled,composer:{width:composer._width,height:composer._height,ratio:composer._pixelRatio,read:composer.readBuffer,write:composer.writeBuffer,passes:composer.passes},camera:engine.camera,blocks:engine.blocks,undo:engine._undoStack,look:engine._showcase,style:canvas.style}));}
  return {engine,calls,snapshot,encode:blob=>callback(blob)};
}
afterEach(()=>{delete window.__geoWorldEngine;vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();});

describe('Showcase native high-resolution image capture',()=>{
  it('preserves aspect with a bounded2048px long edge on phones and desktops',()=>{
    const api=load();expect(api.showcaseExportSize(306,633)).toEqual({width:990,height:2048});expect(api.showcaseExportSize(1440,848)).toEqual({width:2048,height:1206});
    expect(api.showcaseExportSize(1e8,1e8)).toEqual({width:2048,height:2048});expect(api.showcaseExportSize(300,600,1600)).toEqual({width:800,height:1600});expect(()=>api.showcaseExportSize(0,600)).toThrow();
  });
  it('renders real high-resolution pixels and restores the live state before encoding completes',async()=>{
    const api=load(),f=fixture(),before=f.snapshot(),pending=api.captureShowcaseImage(f.engine);
    expect(f.calls.renders).toEqual([{width:990,height:2048,ratio:1,camera:f.engine.camera,scissorTest:false,xr:false}]);expect(f.calls.captures).toEqual([[990,2048,1]]);expect(f.snapshot()).toEqual(before);
    f.encode(new Blob(['PNG']));expect(await pending).toMatchObject({width:990,height:2048});expect(f.snapshot()).toEqual(before);
  });
  it('renders active postprocessing at export resolution and restores its independent DPR, dimensions and buffers',async()=>{
    const api=load(),f=fixture({postFx:true}),before=f.snapshot(),read=f.engine.composer.readBuffer,write=f.engine.composer.writeBuffer,pending=api.captureShowcaseImage(f.engine);
    expect(f.calls.renders).toEqual([{width:990,height:2048,ratio:1}]);expect(f.snapshot()).toEqual(before);expect(f.engine.composer.readBuffer).toBe(read);expect(f.engine.composer.writeBuffer).toBe(write);f.encode(new Blob(['PNG']));await pending;
  });
  it.each(['render','composer','resize','encoding-throw'])('restores renderer, composer and camera when %s fails',async fail=>{
    const api=load(),f=fixture({postFx:fail==='composer',fail}),before=f.snapshot();await expect(api.captureShowcaseImage(f.engine)).rejects.toThrow();expect(f.snapshot()).toEqual(before);
  });
  it('restores state when encoding returns no blob',async()=>{
    const api=load(),f=fixture(),before=f.snapshot(),pending=api.captureShowcaseImage(f.engine);f.encode(null);await expect(pending).rejects.toThrow('encoded');expect(f.snapshot()).toEqual(before);
  });
  it('does not leave an unresolved capture busy forever when the encoder never calls back',async()=>{
    vi.useFakeTimers();const api=load(),f=fixture(),before=f.snapshot(),pending=api.captureShowcaseImage(f.engine),check=expect(pending).rejects.toThrow('too long');await vi.advanceTimersByTimeAsync(20000);await check;expect(f.snapshot()).toEqual(before);
  });
  it('clears busy state and removes the temporary link if downloading fails',async()=>{
    vi.useFakeTimers();const api=load(),f=fixture({autoBlob:true}),before=f.snapshot(),updates=[],toasts=[];window.__geoWorldEngine=f.engine;
    const create=vi.fn(()=> 'blob:export'),revoke=vi.fn();vi.stubGlobal('URL',{createObjectURL:create,revokeObjectURL:revoke});
    vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{throw new Error('download blocked');});
    const ctx={updateMulti:(tool,patch)=>updates.push(patch),addToast:(text,kind)=>toasts.push({text,kind})};expect(await api.saveShowcaseImage(ctx)).toBe(false);
    expect(f.snapshot()).toEqual(before);expect(f.engine._showcaseExporting).toBe(false);expect(updates).toEqual([{showcaseSaving:true},{showcaseSaving:false}]);expect(document.querySelector('a[download="geometry-world-creation.png"]')).toBeNull();
    await vi.advanceTimersByTimeAsync(1000);expect(revoke).toHaveBeenCalledWith('blob:export');expect(toasts.at(-1).kind).toBe('error');vi.unstubAllGlobals();
  });
  it('ignores repeated Save clicks while encoding without starting another render',async()=>{
    const api=load(),f=fixture(),updates=[];window.__geoWorldEngine=f.engine;
    vi.stubGlobal('URL',{createObjectURL:()=> 'blob:export',revokeObjectURL:vi.fn()});vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
    const ctx={updateMulti:(tool,patch)=>updates.push(patch)},first=api.saveShowcaseImage(ctx);expect(await api.saveShowcaseImage(ctx)).toBe(false);expect(f.calls.toBlob).toBe(1);f.encode(new Blob(['PNG']));expect(await first).toBe(true);expect(updates.at(-1)).toEqual({showcaseSaving:false});vi.unstubAllGlobals();
  });
});
