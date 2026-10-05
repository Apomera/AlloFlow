import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Buffer } from 'node:buffer';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  newStore,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const sourceFile = 'stem_lab/stem_tool_artstudio.js';
const canvasContexts = new WeakMap();
let container;
let root;
let strokesAtCapture,updateViewStudy,updateViewProfile,liveViewData;

function makeContext(canvas) {
  return {
    canvas,
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    putImageData: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    stroke: vi.fn(),
    createImageData: (width, height) => ({
      data: new Uint8ClampedArray(width * height * 4),
      width,
      height,
    }),
  };
}

function baseParams(brush, overrides = {}) {
  return {
    color: { r: 47 / 255, g: 111 / 255, b: 176 / 255 },
    brush,
    surface: 'wet',
    flowDirection: 'down',
    showWetness: false,
    showFlow: false,
    size: 28,
    water: 0.72,
    pigment: 0.68,
    paper: 0.48,
    granulation: 0.54,
    bleed: 0.62,
    absorption: 0.52,
    drying: 0.5,
    flowStrength: 0.6,
    staining: 0.5,
    opacity: 0.4,
    mobility: 0.55,
    separation: 0.7,
    rewetting: 0.48,
    humidity: 0.45,
    airflow: 0.25,
    sizing: 0.58,
    bloomSensitivity: 0.6,
    ...overrides,
  };
}

function radialSpread(values, width, centerX, centerY) {
  let weightedDistance = 0;
  let total = 0;
  for (let index = 0; index < values.length; index++) {
    const amount = values[index];
    if (amount <= 0) continue;
    const x = index % width;
    const y = Math.floor(index / width);
    const dx = x - centerX;
    const dy = y - centerY;
    weightedDistance += amount * (dx * dx + dy * dy);
    total += amount;
  }
  return total > 0 ? weightedDistance / total : 0;
}

function pigmentBounds(state) {
  const width = state.simWidth;
  let minX = width;
  let minY = state.simHeight;
  let maxX = -1;
  let maxY = -1;
  for (let index = 0; index < state.pigmentDensity.length; index++) {
    if (state.pigmentDensity[index] <= 0) continue;
    const x = index % width;
    const y = Math.floor(index / width);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return {
    width: maxX >= minX ? maxX - minX + 1 : 0,
    height: maxY >= minY ? maxY - minY + 1 : 0,
  };
}

async function mountWatercolor(seed = {}, reactive = false) {
  const tool = loadTool(sourceFile, 'artStudio');
  const store = newStore({ artStudio: { tab: 'watercolor', ...seed } });
  const ctx = makeCtx({ toolData: store.toolData }, store);
  const App = () => {
    const [liveData,setLiveData]=React.useState(store.toolData),[profile,setProfile]=React.useState("a");updateViewStudy=setLiveData;updateViewProfile=setProfile;liveViewData=liveData.artStudio;
    return tool.render(reactive ? makeCtx({toolData:liveData,setToolData:setLiveData,activeProfileId:profile},store) : ctx);
  };
  container = document.createElement('div');
  document.body.appendChild(container);
  await React.act(async () => {
    root = ReactDOMClient.createRoot(container);
    root.render(React.createElement(App));
  });
  const canvas = container.querySelector('#watercolorCanvas');
  return { canvas, engine: canvas && canvas._watercolorEngine };
}

beforeEach(() => {
  resetStemLab();
  vi.restoreAllMocks();
  vi.useFakeTimers();
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  strokesAtCapture = -1;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (type) {
    if (type !== '2d') return null;
    if (!canvasContexts.has(this)) canvasContexts.set(this, makeContext(this));
    return canvasContexts.get(this);
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(function () {
    const context = canvasContexts.get(this);
    if (context) strokesAtCapture = context.stroke.mock.calls.length;
    return 'data:image/png;base64,d2F0ZXJjb2xvcg==';
  });
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(async () => {
  if (root) {
    await React.act(async () => root.unmount());
  }
  if (container) container.remove();
  root = null;
  container = null;
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});


const click=async id=>{await React.act(async()=>container.querySelector('#'+id).click());};
const paper=()=>container.querySelector('.artstudio-watercolor-paper');
const zoom=async value=>{await React.act(async()=>{const node=container.querySelector('#artstudio-watercolor-zoom');node.value=String(value);node.dispatchEvent(new Event('change',{bubbles:true}));});};
const pan=()=>click('artstudio-watercolor-mode-pan'),paint=()=>click('artstudio-watercolor-mode-paint');
const pointer=(x,y,type='pointerdown',extra={})=>({type,clientX:x,clientY:y,pointerId:7,pointerType:'mouse',button:0,pressure:.7,timeStamp:0,preventDefault(){},...extra});
const key=async(canvas,value,extra={})=>{await React.act(async()=>canvas.onkeydown({key:value,preventDefault(){},...extra}));};
const identical=(a,b)=>{for(const field of Object.keys(a))if(ArrayBuffer.isView(a[field]))expect(Buffer.from(a[field].buffer,a[field].byteOffset,a[field].byteLength).equals(Buffer.from(b[field].buffer,b[field].byteOffset,b[field].byteLength)),field).toBe(true);for(const field of ['reservoirWater','reservoirPigment','strokeSeed','paused'])expect(b[field],field).toBe(a[field]);};
const mass=s=>s.pigmentDensity.reduce((n,v)=>n+v,0);
function box(canvas,width=192,left=10,top=20){canvas.getBoundingClientRect=()=>({left,top,width,height:width});return (x,y,type='pointerdown',extra={})=>pointer(left+x*width/192,top+y*width/192,type,extra);}
async function stroke(canvas,event){await React.act(async()=>canvas.onpointerdown(event(70,80)));await React.act(async()=>canvas.onpointermove(event(110,100,'pointermove',{timeStamp:80})));await React.act(async()=>canvas.onpointerup(event(120,105,'pointerup',{timeStamp:100})));}

describe('Watercolor paper navigation',()=>{
 it('offers accessible Paint, Pan, zoom, and Fit controls without changing stored painting settings',async()=>{
  const {canvas,engine}=await mountWatercolor({},true);expect(container.querySelector('#artstudio-watercolor-mode-paint').getAttribute('aria-pressed')).toBe('true');expect(container.querySelector('#artstudio-watercolor-mode-pan').getAttribute('aria-pressed')).toBe('false');expect(container.querySelector('#artstudio-watercolor-zoom').value).toBe('1');expect(canvas.getAttribute('aria-describedby')).toContain('artstudio-watercolor-navigation-help');const before=engine.captureState();await pan();await zoom(2);identical(before,engine.captureState());expect(liveViewData.watercolorZoom).toBeUndefined();expect(liveViewData.watercolorNavigation).toBeUndefined();expect(canvas.getAttribute('aria-label')).toContain('Painting is disabled in Pan mode');
 });
 it.each([1.5,2,3])('zooms the sheet to %s× while retaining the fixed 1024 backing and simulation',async scale=>{
  const {canvas,engine}=await mountWatercolor({},true),stage=canvas.parentElement,side=parseFloat(stage.style.width),before=engine.captureState();await zoom(scale);expect(parseFloat(stage.style.width)).toBe(Math.round(side*scale));expect(parseFloat(stage.style.height)).toBe(Math.round(side*scale));expect(canvas.width).toBe(1024);expect(canvas.height).toBe(1024);identical(before,engine.captureState());expect(engine.undo()).toBe(false);
 });
 it.each(['mouse','pen','touch'])('pans with a %s without depositing paint, draining brush loads, or adding history',async type=>{
  const {canvas,engine}=await mountWatercolor({watercolorTouchMode:'scroll'},true);await pan();paper().scrollLeft=150;paper().scrollTop=120;const before=engine.captureState();canvas.releasePointerCapture=vi.fn();await React.act(async()=>canvas.onpointerdown(pointer(90,80,'pointerdown',{pointerType:type})));expect(canvas.style.cursor).toBe('grabbing');await React.act(async()=>canvas.onpointermove(pointer(50,20,'pointermove',{pointerType:type})));expect(paper().scrollLeft).toBe(190);expect(paper().scrollTop).toBe(180);await React.act(async()=>canvas.onpointerup(pointer(50,20,'pointerup',{pointerType:type})));expect(canvas.style.cursor).toBe('grab');expect(canvas.releasePointerCapture).toHaveBeenCalledWith(7);identical(before,engine.captureState());expect(engine.undo()).toBe(false);expect(canvas.style.touchAction).toBe('none');
 });
 it('keeps a pan owned by its original pointer and releases cancelled capture safely',async()=>{
  const {canvas,engine}=await mountWatercolor({},true);await pan();paper().scrollLeft=100;await React.act(async()=>canvas.onpointerdown(pointer(90,80)));await React.act(async()=>{canvas.onpointermove(pointer(10,10,'pointermove',{pointerId:8}));canvas.onpointerup(pointer(10,10,'pointerup',{pointerId:8}));});expect(paper().scrollLeft).toBe(100);expect(canvas.style.cursor).toBe('grabbing');await React.act(async()=>canvas.onpointercancel(pointer(90,80,'pointercancel')));expect(canvas.style.cursor).toBe('grab');await React.act(async()=>canvas.onpointermove(pointer(10,10,'pointermove')));expect(paper().scrollLeft).toBe(100);expect(engine.undo()).toBe(false);
 });
 it('pans by keyboard and prevents Enter or Space from making a dab in Pan mode',async()=>{
  const {canvas,engine}=await mountWatercolor({},true);await pan();Object.defineProperty(paper(),'scrollWidth',{value:800,configurable:true});Object.defineProperty(paper(),'scrollHeight',{value:700,configurable:true});const before=engine.captureState();await key(canvas,'ArrowRight');await key(canvas,'ArrowDown',{shiftKey:true});expect(paper().scrollLeft).toBe(48);expect(paper().scrollTop).toBe(160);await key(canvas,'Enter');await key(canvas,' ');identical(before,engine.captureState());await key(canvas,'End');expect(paper().scrollLeft).toBe(800);await key(canvas,'Home');expect(paper().scrollLeft).toBe(0);expect(paper().scrollTop).toBe(0);expect(engine.undo()).toBe(false);await key(canvas,'p');expect(engine.captureState().paused).not.toBe(before.paused);
 });
 it('keeps identical sheet coordinates, brush footprint, and deposited parcels at different zoom levels',async()=>{
  const {canvas,engine}=await mountWatercolor({},true);engine.togglePause();const seed=engine.captureState();await stroke(canvas,box(canvas));const normal=engine.captureState();engine.restoreState(seed);await zoom(2);await stroke(canvas,box(canvas,384,-200,-150));const detail=engine.captureState();identical(normal,detail);expect(mass(detail)).toBeGreaterThan(0);
 });
 it.each(['mode','zoom','fit'])('safely ends an active painting stroke when changing %s and ignores its late release',async action=>{
  const {canvas,engine}=await mountWatercolor({},true),event=box(canvas);await React.act(async()=>canvas.onpointerdown(event(80,80)));const started=engine.captureState();if(action==='mode')await pan();else if(action==='zoom')await zoom(2);else await click('artstudio-watercolor-fit');await React.act(async()=>canvas.onpointerup(event(140,140,'pointerup')));identical(started,engine.captureState());expect(engine.undo()).toBe(true);expect(mass(engine.captureState())).toBe(0);expect(engine.undo()).toBe(false);
 });
 it('resumes ordinary keyboard and pointer painting after leaving Pan',async()=>{
  const {canvas,engine}=await mountWatercolor({},true);await pan();await key(canvas,'Enter');expect(mass(engine.captureState())).toBe(0);await paint();expect(canvas.style.cursor).toBe('crosshair');await key(canvas,'Enter');expect(mass(engine.captureState())).toBeGreaterThan(0);expect(engine.undo()).toBe(true);await stroke(canvas,box(canvas));expect(mass(engine.captureState())).toBeGreaterThan(0);
 });
 it('uses Fit to restore the whole sheet and scroll origin while retaining the chosen mode and paint',async()=>{
  const {canvas,engine}=await mountWatercolor({},true);await key(canvas,'Enter');await zoom(3);await pan();paper().scrollLeft=240;paper().scrollTop=120;const before=engine.captureState();await click('artstudio-watercolor-fit');expect(container.querySelector('#artstudio-watercolor-zoom').value).toBe('1');expect(paper().scrollLeft).toBe(0);expect(paper().scrollTop).toBe(0);expect(container.querySelector('#artstudio-watercolor-mode-pan').getAttribute('aria-pressed')).toBe('true');identical(before,engine.captureState());
 });
 it('cancels navigation on clear or state restoration so a late move cannot scroll the new artwork',async()=>{
  const {canvas,engine}=await mountWatercolor({},true);await pan();paper().scrollLeft=100;await React.act(async()=>canvas.onpointerdown(pointer(90,80)));engine.clear();await React.act(async()=>canvas.onpointermove(pointer(20,20,'pointermove')));expect(paper().scrollLeft).toBe(100);const saved=engine.captureState();await React.act(async()=>canvas.onpointerdown(pointer(90,80)));engine.restoreState(saved);await React.act(async()=>canvas.onpointermove(pointer(20,20,'pointermove')));expect(paper().scrollLeft).toBe(100);expect(canvas.style.cursor).toBe('grab');
 });
 it('switches to Paint when finger drawing or scrolling is explicitly chosen and keeps guidance accurate',async()=>{
  const {canvas,engine}=await mountWatercolor({},true);await pan();expect([...container.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')==='Draw with a finger').textContent).toBe('Finger: pan');expect(container.querySelector('#artstudio-watercolor-touch-help').textContent).toContain('Painting is disabled');for(const label of ['Scroll page','Draw on paper']){const button=[...container.querySelectorAll('button')].find(b=>b.textContent.endsWith(label));expect(button.getAttribute('aria-pressed')).toBe('false');expect(button.classList.contains('bg-teal-700')).toBe(false);}
  await React.act(async()=>[...container.querySelectorAll('button')].find(b=>b.textContent.endsWith('Draw on paper')).click());expect(container.querySelector('#artstudio-watercolor-mode-paint').getAttribute('aria-pressed')).toBe('true');const event=box(canvas);await React.act(async()=>{canvas.onpointerdown(event(80,80,'pointerdown',{pointerType:'touch'}));canvas.onpointerup(event(80,80,'pointerup',{pointerType:'touch'}));});expect(mass(engine.captureState())).toBeGreaterThan(0);await pan();await React.act(async()=>[...container.querySelectorAll('button')].find(b=>b.textContent.endsWith('Scroll page')).click());expect(canvas.style.touchAction).toBe('pan-y');expect(container.querySelector('#artstudio-watercolor-mode-paint').getAttribute('aria-pressed')).toBe('true');
 });
 it('resets view and gesture ownership for a restored study and for a new learner',async()=>{
  const {canvas}=await mountWatercolor({},true);await zoom(3);await pan();await React.act(async()=>canvas.onpointerdown(pointer(90,80)));paper().scrollLeft=200;await React.act(async()=>updateViewStudy(old=>({...old,artStudio:{...old.artStudio,watercolorRestoreToken:'new-study'}})));expect(container.querySelector('#artstudio-watercolor-zoom').value).toBe('1');expect(container.querySelector('#artstudio-watercolor-mode-paint').getAttribute('aria-pressed')).toBe('true');expect(paper().scrollLeft).toBe(0);await React.act(async()=>canvas.onpointermove(pointer(10,10,'pointermove')));expect(paper().scrollLeft).toBe(0);await zoom(2);await pan();await React.act(async()=>updateViewProfile('b'));expect(container.querySelector('#artstudio-watercolor-zoom').value).toBe('1');expect(container.querySelector('#artstudio-watercolor-mode-paint').getAttribute('aria-pressed')).toBe('true');
 });
 it('keeps brush guides in sheet coordinates after the viewport has scrolled',async()=>{
  const {canvas}=await mountWatercolor({},true);await zoom(2);box(canvas,384,-200,-150);canvas.parentElement.getBoundingClientRect=()=>({left:-200,top:-150,width:384,height:384});await React.act(async()=>canvas.onfocus());const cursor=container.querySelector('#artstudio-watercolor-cursor');expect(parseFloat(cursor.style.left)).toBe(192);expect(parseFloat(cursor.style.top)).toBe(192);await pan();expect(cursor.style.display).toBe('none');
 });
});
