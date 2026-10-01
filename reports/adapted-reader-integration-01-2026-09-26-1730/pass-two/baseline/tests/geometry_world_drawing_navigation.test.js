import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {React,ReactDOMClient,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let root,host;
beforeEach(()=>{
 vi.useFakeTimers();const lab=resetStemLab();lab.registerTool('geometryWorld',{aliases:[],render(ctx){return ctx.React.createElement('main',{id:'geoworld-fs-workspace'},ctx.React.createElement('div',{id:'geoworld-fs-wrap',tabIndex:0}));}});
 if(!document.getElementById('allo-geometryworld-builder-css')){const style=document.createElement('style');style.id='allo-geometryworld-builder-css';document.head.appendChild(style);}
 new Function(readFileSync('stem_lab/stem_tool_geometryworld_builder.js','utf8'))();
});
afterEach(()=>{if(root)React.act(()=>root.unmount());host?.remove();root=null;host=null;delete window.__geoWorldEngine;vi.clearAllTimers();vi.useRealTimers();});
function mount(initial={}){
 let current,patch;const engine={_currentLesson:window.StemLab.geometryWorldBuilderPure.FREE_BUILD_LESSON,blocks:{},blocksPlaced:0,releaseInput:vi.fn(),getBlocksArr(){return [];},isDrawingAllowed:()=>true,drawAtCrosshair:vi.fn(),cancelDrawing:vi.fn(),camera:{position:{x:0,y:3,z:6}}};
 window.__geoWorldEngine=engine;host=document.createElement('div');document.body.appendChild(host);
 function Host(){const [data,setData]=React.useState({geometryWorld:{activeLesson:'builderSandbox',worldActive:true,sandboxDockCollapsed:false,builderPanel:'build',...initial}});current=data.geometryWorld;patch=v=>setData(old=>({...old,geometryWorld:{...old.geometryWorld,...v}}));engine.setDrawMode=vi.fn(mode=>patch({drawMode:mode,drawPreview:null}));engine.setDrawHeight=vi.fn(height=>{if(height>=1&&height<=32&&Number.isInteger(height))patch({drawWallHeight:height});});return window.StemLab._registry.geometryWorld.render({React,toolData:data,updateMulti:(tool,v)=>setData(old=>({...old,[tool]:{...old[tool],...v}})),setStemLabTool:vi.fn(),announceToSR:vi.fn(),addToast:vi.fn()});}
 root=ReactDOMClient.createRoot(host);React.act(()=>root.render(React.createElement(Host)));
 return {engine,state:()=>current,patch:v=>React.act(()=>patch(v)),button:text=>[...host.querySelectorAll('button')].find(b=>b.textContent===text),click:button=>React.act(()=>button.click())};
}
describe('accessible drawing controls',()=>{
 it('keeps single blocks selected until a learner explicitly changes the tool',()=>{const app=mount(),group=host.querySelector('[aria-label="Drawing tool"]');expect([...group.querySelectorAll('button')].map(b=>b.textContent)).toEqual(['Block','Line','Floor','Wall']);expect(group.querySelector('[aria-pressed="true"]').textContent).toBe('Block');expect(host.querySelector('.gwe-draw-hud')).toBeNull();app.click(app.button('Floor'));expect(app.state().drawMode).toBe('floor');expect(group.querySelector('[aria-pressed="true"]').textContent).toBe('Floor');expect(app.button('Set start')).toBeTruthy();});
 it('exposes wall height as a labeled constrained number control',()=>{const app=mount({drawMode:'wall',drawWallHeight:4});const input=host.querySelector('[aria-label="Wall height in blocks"]');expect(input.type).toBe('number');expect(input.min).toBe('1');expect(input.max).toBe('32');expect(input.value).toBe('4');expect(host.querySelector('.gwe-drawing-tools').textContent).toContain('Escape cancels');});
 it('returns keyboard focus to the world when opening the drawing view',()=>{const app=mount({drawMode:'line'});app.click(app.button('Open drawing view'));React.act(()=>vi.advanceTimersByTime(40));expect(app.state().sandboxDockCollapsed).toBe(true);expect(document.activeElement.id).toBe('geoworld-fs-wrap');expect(app.button('Set start')).toBeTruthy();});
 it('describes dimensions in a polite live region and exposes one explicit commit',()=>{const app=mount({drawMode:'floor',drawPreview:{started:true,ok:true,count:12,reason:'3 × 4 × 1 blocks · 12 cells'}});expect(host.querySelector('.gwe-draw-hud [role="status"]').textContent).toContain('12 cells');app.click(app.button('Place 12 blocks'));expect(app.engine.drawAtCrosshair).toHaveBeenCalledOnce();});
 it('disables a blocked preview and leaves cancellation available',()=>{const app=mount({drawMode:'wall',drawPreview:{started:true,ok:false,count:12,reason:'A block is in the way.'}});expect(app.button('Place 12 blocks').disabled).toBe(true);app.click(app.button('Place 12 blocks'));expect(app.engine.drawAtCrosshair).not.toHaveBeenCalled();app.click(app.button('Cancel'));expect(app.engine.cancelDrawing).toHaveBeenCalledOnce();});
 it('can return directly to the default Block tool without creating cells',()=>{const app=mount({drawMode:'line'});app.click(app.button('Block tool'));expect(app.state().drawMode).toBe('single');expect(app.engine.drawAtCrosshair).not.toHaveBeenCalled();expect(host.querySelector('.gwe-draw-hud')).toBeNull();});
 it('removes preview actions when another view owns interaction',()=>{const app=mount({drawMode:'line'});expect(host.querySelector('.gwe-draw-hud')).not.toBeNull();app.engine._showcase={};app.patch({showcaseActive:true});expect(host.querySelector('.gwe-draw-hud')).toBeNull();});
});
