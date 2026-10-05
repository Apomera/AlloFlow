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
let strokesAtCapture;

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
    const [liveData,setLiveData]=React.useState(store.toolData);
    return tool.render(reactive ? makeCtx({toolData:liveData,setToolData:setLiveData},store) : ctx);
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


const mobileFields=['pigmentR','pigmentG','pigmentB','pigmentDensity','pigmentStainingMass','pigmentOpacityMass','pigmentGranulationMass','pigmentMobilityMass','pigmentMobilityRMass','pigmentMobilityGMass','pigmentMobilityBMass'];
const fixedFields=mobileFields.map(f=>f.replace('pigment','stain'));
const sum=a=>a.reduce((n,v)=>n+v,0),difference=(a,b)=>a.reduce((n,v,i)=>Math.max(n,Math.abs(v-b[i])),0);
const identical=(a,b,label)=>expect(Buffer.from(a.buffer,a.byteOffset,a.byteLength).equals(Buffer.from(b.buffer,b.byteOffset,b.byteLength)),label).toBe(true);
function glaze(engine,{wet=.25,staining=.2,mobileStaining=.8,mobile=1.2}={}) {
  const s=engine.captureState();s.paused=true;
  for(let y=64;y<=128;y++)for(let x=50;x<=142;x++) {
    const i=y*192+x,m=.45;s.water[i]=wet;
    for(const [prefix,mass,trait,color]of [['stain',m,staining,[.7,.24,.10]],['pigment',mobile,mobileStaining,[.08,.28,.66]]]) {
      s[prefix+'Density'][i]=mass;
      for(const [j,c]of ['R','G','B'].entries()){s[prefix+c][i]=mass*color[j];s[prefix+'Mobility'+c+'Mass'][i]=mass*color[j]*.65;}
      for(const [field,value]of [['Staining',trait],['Opacity',.35],['Granulation',.42],['Mobility',.65]])s[prefix+field+'Mass'][i]=mass*value;
    }
  }
  return s;
}
function lift(engine,seed,overrides={},pressure=.8) {
  engine.restoreState(seed);engine.configure(baseParams('lift',{size:60,liftingStrength:.7,...overrides}));engine.dabAt(96,96,pressure);return engine.captureState();
}
const stylus=(x,y,timeStamp,extra={})=>({clientX:x,clientY:y,timeStamp,pointerId:1,pointerType:'pen',pressure:.7,button:0,preventDefault(){},...extra});

describe('Watercolor gradual lifting and independent glaze traits',()=>{
 it('retains the settled glaze response beneath fresh washes with different staining',async()=>{
  const {engine}=await mountWatercolor();const seed=glaze(engine),first=lift(engine,seed);
  seed.pigmentStainingMass=seed.pigmentDensity.map(v=>v*.05);const second=lift(engine,seed);
  for(const field of fixedFields)identical(first[field],second[field],field);
  expect(sum(first.stainDensity)).toBeLessThan(sum(seed.stainDensity));
 });
 it('does not let the selected pigment traits alter an existing glaze during lifting',async()=>{
  const {engine}=await mountWatercolor();const seed=glaze(engine),a=lift(engine,seed,{staining:0,pigment:0}),b=lift(engine,seed,{staining:1,pigment:1,color:{r:1,g:0,b:1}});
  for(const field of [...mobileFields,...fixedFields,'water'])identical(a[field],b[field],field);
 });
 it('leaves more staining dry color anchored and makes sized paper easier to lift',async()=>{
  const {engine}=await mountWatercolor();const low=glaze(engine,{staining:.1}),high=glaze(engine,{staining:.9});
  const removed=s=>sum(s.stainDensity)-sum(lift(engine,s).stainDensity);
  expect(removed(low)).toBeGreaterThan(removed(high)*3);
  expect(sum(lift(engine,low,{sizing:1}).stainDensity)).toBeLessThan(sum(lift(engine,low,{sizing:0}).stainDensity));
 });
 it('gives gentle and strong lifting distinct monotonic pickup while keeping residual paint',async()=>{
  const {engine}=await mountWatercolor();const seed=glaze(engine),gentle=lift(engine,seed,{liftingStrength:.15}),strong=lift(engine,seed,{liftingStrength:1});
  for(const field of ['pigmentDensity','stainDensity']){expect(sum(strong[field])).toBeLessThan(sum(gentle[field]));expect(sum(gentle[field])).toBeLessThan(sum(seed[field]));expect(strong[field][96*192+96]).toBeGreaterThan(0);}
 });
 it('uses zero strength to add clear water without removing any color or properties',async()=>{
  const {engine}=await mountWatercolor();const seed=glaze(engine,{wet:0}),after=lift(engine,seed,{liftingStrength:0});
  for(const field of [...mobileFields,...fixedFields,'mask'])identical(after[field],seed[field],field);
  expect(after.bloom.every(v=>Number.isFinite(v)&&v>=0)).toBe(true);
  expect(sum(after.water)).toBeGreaterThan(sum(seed.water));
 });
 it('requires moisture and can lift a damp wash with an unloaded water brush',async()=>{
  const {engine}=await mountWatercolor();const dry=glaze(engine,{wet:0}),unchanged=lift(engine,dry,{water:0});
  for(const field of [...mobileFields,...fixedFields,'water'])identical(unchanged[field],dry[field],field);
  const damp=glaze(engine,{wet:.25}),after=lift(engine,damp,{water:0});expect(sum(after.stainDensity)).toBeLessThan(sum(damp.stainDensity));expect(sum(after.water)).toBe(sum(damp.water));
 });
 it('increases pickup with stylus pressure without bleaching the remaining pigment parcels',async()=>{
  const {engine}=await mountWatercolor();const seed=glaze(engine),light=lift(engine,seed,{},.1),firm=lift(engine,seed,{},1),at=96*192+96;
  expect(sum(firm.stainDensity)).toBeLessThan(sum(light.stainDensity));
  for(const fields of [mobileFields,fixedFields]){const density=fields.find(f=>f.endsWith('Density')),ratio=firm[density][at]/seed[density][at];for(const field of fields)expect(firm[field][at]/seed[field][at],field).toBeCloseTo(ratio,6);}
 });
 it('protects masked cells and keeps color and water outside the brush unchanged',async()=>{
  const {engine}=await mountWatercolor();const seed=glaze(engine);for(let y=0;y<192;y++)for(let x=94;x<=98;x++)seed.mask[y*192+x]=1;
  const after=lift(engine,seed,{liftingStrength:1});identical(after.mask,seed.mask,'mask');
  for(const field of ['water',...mobileFields,...fixedFields])for(const i of [96*192+96,96*192+60,64*192+96])expect(after[field][i],field).toBe(seed[field][i]);
  expect(sum(after.stainDensity)).toBeLessThan(sum(seed.stainDensity));
 });
 it('clamps invalid strengths, falls back safely, and keeps repeated lifting finite',async()=>{
  const {engine}=await mountWatercolor();const seed=glaze(engine),normal=lift(engine,seed),invalid=lift(engine,seed,{liftingStrength:NaN}),legacy=lift(engine,seed,{liftingStrength:undefined});
  for(const field of [...mobileFields,...fixedFields]){identical(normal[field],invalid[field],field);identical(normal[field],legacy[field],field);}
  const zero=lift(engine,seed,{liftingStrength:0}),negative=lift(engine,seed,{liftingStrength:-2}),max=lift(engine,seed,{liftingStrength:1}),excess=lift(engine,seed,{liftingStrength:2});
  identical(zero.stainDensity,negative.stainDensity,'negative strength');identical(max.stainDensity,excess.stainDensity,'excess strength');
  for(let n=0;n<12;n++)engine.dabAt(96,96,1);const after=engine.captureState();for(const field of ['water',...mobileFields,...fixedFields])expect(after[field].every(v=>Number.isFinite(v)&&v>=0),field).toBe(true);
 });
 it('stores a coalesced stroke in one Undo step and restores lifted color in compact saves',async()=>{
  const {canvas,engine}=await mountWatercolor();const seed=glaze(engine);engine.restoreState(seed);engine.configure(baseParams('lift',{size:36,liftingStrength:.85}));canvas.getBoundingClientRect=()=>({left:0,top:0,width:192,height:192});
  canvas.onpointerdown(stylus(70,96,0));canvas.onpointermove(stylus(110,96,80,{getCoalescedEvents:()=>[stylus(85,96,30),stylus(100,96,60)]}));canvas.onpointerup(stylus(120,96,100,{type:'pointerup'}));const after=engine.captureState();
  expect(after.stainDensity[96*192+120]).toBeLessThan(seed.stainDensity[96*192+120]);expect(engine.undo()).toBe(true);for(const field of [...fixedFields,...mobileFields,'water'])expect(difference(engine.captureState()[field],seed[field]),field).toBeLessThan(.00006);expect(engine.undo()).toBe(false);
  expect(engine.redo()).toBe(true);const compact=engine.captureState(true);engine.clear();engine.restoreState(compact);for(const field of [...fixedFields,...mobileFields,'water'])expect(difference(engine.captureState()[field],after[field]),field).toBeLessThan(.00006);
 });
 it('exposes associated Lift strength and disables only the inactive pigment load',async()=>{
  await mountWatercolor({},true);const button=[...container.querySelectorAll('button')].find(b=>b.textContent.endsWith(' Lift'));await React.act(async()=>button.click());
  const strength=container.querySelector('input[aria-label="Lift strength"]');expect(strength.value).toBe('70');expect(strength.getAttribute('aria-describedby')).toBe('artstudio-watercolor-lift-help');expect(strength.disabled).toBe(false);expect(container.querySelector('input[aria-label="Water"]').disabled).toBe(false);expect(container.querySelector('input[aria-label="Pigment"]').disabled).toBe(true);
  const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;await React.act(async()=>{setter.call(strength,'25');strength.dispatchEvent(new Event('input',{bubbles:true}));});expect(strength.value).toBe('25');
  await React.act(async()=>[...container.querySelectorAll('button')].find(b=>b.textContent.endsWith(' Round')).click());expect(container.querySelector('input[aria-label="Lift strength"]')).toBeNull();expect(container.querySelector('input[aria-label="Pigment"]').disabled).toBe(false);
  await React.act(async()=>[...container.querySelectorAll('button')].find(b=>b.textContent.endsWith(' Lift')).click());expect(container.querySelector('input[aria-label="Lift strength"]').value).toBe('25');
 });
 it('reconfigures a live Lift brush with the saved strength before the next dab',async()=>{
  const {engine}=await mountWatercolor({watercolorBrush:'lift',watercolorLifting:0},true);const seed=glaze(engine);engine.restoreState(seed);engine.dabAt(96,96,.8);identical(engine.captureState().stainDensity,seed.stainDensity,'zero UI strength');
  const strength=container.querySelector('input[aria-label="Lift strength"]'),setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;await React.act(async()=>{setter.call(strength,'100');strength.dispatchEvent(new Event('input',{bubbles:true}));});engine.dabAt(96,96,.8);expect(sum(engine.captureState().stainDensity)).toBeLessThan(sum(seed.stainDensity));
 });
});
