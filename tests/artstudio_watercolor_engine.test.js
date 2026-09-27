import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

// Every test here mounts the watercolor engine and runs a real multi-step
// pigment/water simulation. On a quiet box the spread is wide -- 464ms at the
// fast end, 7310ms at the slow -- but under load (other sessions routinely run
// 20-30 node processes here) even the fast ones stall: the 1161ms "deposits
// water and pigment" test blew the 5000ms default once, a 4.3x blowup. That is
// the worker stalling, not the test getting slower, so EVERY test in the file
// carries the budget rather than just whichever two crossed the line first.
//
// If one times out at this value on a QUIET box, the simulation got slower --
// profile it; do not simply raise the number.
// Keep the regular regression budget; an explicit per-run allowance supports
// heavily contended development machines without changing simulation checks.
const WATERCOLOR_SIM_TIMEOUT_MS = Math.max(20000,Math.min(120000,Number(process.env.ALLOFLOW_ARTSTUDIO_TEST_TIMEOUT_MS)||20000));

describe('Art Studio watercolor simulation engine', () => {
  it('enables working Undo and Redo buttons when the engine history changes', async () => {
    const {engine}=await mountWatercolor();
    const undo=container.querySelector('#artstudio-watercolor-undo');
    const redo=container.querySelector('#artstudio-watercolor-redo');
    expect(undo.disabled).toBe(true);expect(redo.disabled).toBe(true);
    engine.dabAt(96,96,0.8);
    expect(undo.disabled).toBe(false);
    await React.act(async()=>undo.click());
    expect(engine.captureState().pigmentDensity.every(v=>v===0)).toBe(true);
    expect(undo.disabled).toBe(true);expect(redo.disabled).toBe(false);
    await React.act(async()=>redo.click());
    expect(engine.captureState().pigmentDensity.some(v=>v>0)).toBe(true);
    expect(undo.disabled).toBe(false);expect(redo.disabled).toBe(true);
  }, WATERCOLOR_SIM_TIMEOUT_MS);

  it('offers finger painting beside the color controls and keeps both touch controls in sync', async () => {
    const {canvas}=await mountWatercolor({},true);
    const toggle=container.querySelector('[aria-label="Draw with a finger"]');
    expect(toggle.closest('.artstudio-watercolor-colors')).toBeTruthy();
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    await React.act(async()=>toggle.click());
    expect(canvas.style.touchAction).toBe('none');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    const scroll=[...container.querySelectorAll('button')].find(b=>b.textContent.includes('Scroll page'));
    await React.act(async()=>scroll.click());
    expect(canvas.style.touchAction).toBe('pan-y');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
  }, WATERCOLOR_SIM_TIMEOUT_MS);

  it('redistributes damp washes into salt crystals without losing pigment or disturbing settled glazes', async () => {
    const {engine}=await mountWatercolor();
    engine.configure(baseParams('round',{size:80,water:0.8,pigment:0.7}),'');
    engine.dabAt(96,96,1);
    const before=engine.captureState();
    const sum=values=>values.reduce((a,b)=>a+b,0);
    engine.configure(baseParams('salt',{size:80}),'');
    engine.dabAt(96,96,1);
    const after=engine.captureState();
    const fields=['pigmentR','pigmentG','pigmentB','pigmentDensity','pigmentStainingMass','pigmentOpacityMass','pigmentGranulationMass','pigmentMobilityMass','pigmentMobilityRMass','pigmentMobilityGMass','pigmentMobilityBMass'];
    for(const field of fields) {
      expect(sum(after[field]),field).toBeCloseTo(sum(before[field]),4);
      expect(after[field].every(v=>v>=0 && v<=2.50001),field).toBe(true);
    }
    expect(after.pigmentDensity.some((v,i)=>v<before.pigmentDensity[i]-0.001)).toBe(true);
    expect(after.pigmentDensity.some((v,i)=>v>before.pigmentDensity[i]+0.001)).toBe(true);
    expect(sum(after.water)).toBeLessThan(sum(before.water));
    expect(after.stainDensity).toEqual(before.stainDensity);
    expect(after.reservoirWater).toBe(1);
    expect(engine.undo()).toBe(true);
    // History uses the existing compact 16-bit wet-state representation.
    const undone=engine.captureState().pigmentDensity;
    expect(Math.max(...undone.map((v,i)=>Math.abs(v-before.pigmentDensity[i])))).toBeLessThan(0.00006);
    expect(engine.redo()).toBe(true);
    const redone=engine.captureState().pigmentDensity;
    expect(Math.max(...redone.map((v,i)=>Math.abs(v-after.pigmentDensity[i])))).toBeLessThan(0.00006);
  }, WATERCOLOR_SIM_TIMEOUT_MS);

  it('leaves dry paint unchanged when salt is applied, even before loose pigment settles', async () => {
    const {engine}=await mountWatercolor();
    engine.configure(baseParams('round',{size:60,water:0}),'');engine.dabAt(96,96,1);
    for(const settled of [false,true]) {
      if(settled) engine.dry();
      const before=engine.captureState();
      engine.configure(baseParams('salt',{size:80}),'');engine.dabAt(96,96,1);
      const after=engine.captureState();
      for(const field of ['water','pigmentR','pigmentG','pigmentB','pigmentDensity','stainR','stainG','stainB','stainDensity','bloom']) expect(after[field],field).toEqual(before[field]);
    }
  }, WATERCOLOR_SIM_TIMEOUT_MS);

  it('keeps salt away from masked cells and preserves a dry underpainting in a wet glaze', async () => {
    const {engine}=await mountWatercolor();
    engine.configure(baseParams('round',{size:80,water:0}),'');engine.dabAt(96,96,1);engine.dry();
    const dry=engine.captureState();
    const seeded=engine.captureState();
    seeded.water.fill(0.45);seeded.pigmentDensity.fill(0.4);
    seeded.pigmentG.fill(0.16);
    for(let i=0;i<seeded.pigmentDensity.length;i++) {
      seeded.pigmentR[i]=i%192<94?0.32:0;seeded.pigmentB[i]=i%192>97?0.32:0;
    }
    for(let y=0;y<192;y++)for(let x=94;x<=97;x++)seeded.mask[y*192+x]=1;
    engine.restoreState(seeded);
    engine.configure(baseParams('salt',{size:80}),'');engine.dabAt(96,96,1);
    const after=engine.captureState();
    expect(after.stainDensity).toEqual(dry.stainDensity);expect(after.stainR).toEqual(dry.stainR);
    for(let y=0;y<192;y++)for(let x=94;x<=97;x++) {
      const i=y*192+x;expect(after.water[i]).toBe(seeded.water[i]);expect(after.pigmentDensity[i]).toBe(seeded.pigmentDensity[i]);
    }
    expect(after.pigmentB.every((v,i)=>i%192>=94 || v===0)).toBe(true);
    expect(after.pigmentR.every((v,i)=>i%192<=97 || v===0)).toBe(true);
    expect(after.pigmentDensity.some((v,i)=>v!==seeded.pigmentDensity[i])).toBe(true);
  }, WATERCOLOR_SIM_TIMEOUT_MS);

  it('settles the final traces of water before becoming idle without losing pigment', async () => {
    const {engine}=await mountWatercolor();
    engine.configure(baseParams('round',{water:0}),'');engine.dabAt(96,96,0.8);
    const state=engine.captureState();
    state.water.fill(0.003);
    const mass=state.pigmentDensity.reduce((n,v)=>n+v,0);
    engine.restoreState(state);engine.advanceSimulation(1);
    const dry=engine.captureState();
    expect(dry.water.every(v=>v===0)).toBe(true);
    expect(dry.pigmentDensity.every(v=>v===0)).toBe(true);
    expect(dry.stainDensity.reduce((n,v)=>n+v,0)).toBeCloseTo(mass,4);
  }, WATERCOLOR_SIM_TIMEOUT_MS);

  it('stops requesting frames after drying and saves the final settled painting', async () => {
    const {engine}=await mountWatercolor();
    engine.configure(baseParams('round',{water:0}),'');
    engine.dabAt(96,96,0.8);
    const frame=requestAnimationFrame.mock.calls.at(-1)[0];
    const requests=requestAnimationFrame.mock.calls.length;
    frame(performance.now()+50);
    expect(requestAnimationFrame.mock.calls.length).toBe(requests);
    expect(engine.captureState().pigmentDensity.every(v=>v===0)).toBe(true);
    const captures=HTMLCanvasElement.prototype.toDataURL.mock.calls.length;
    await React.act(async()=>{await vi.advanceTimersByTimeAsync(300);});
    expect(HTMLCanvasElement.prototype.toDataURL.mock.calls.length).toBeGreaterThan(captures);
  }, WATERCOLOR_SIM_TIMEOUT_MS);

  it('gives light stylus pressure a fine tip and firm pressure a broad stroke', async () => {
    const {engine}=await mountWatercolor();
    engine.configure(baseParams('round',{size:40,water:0}),'');
    engine.dabAt(96,96,0.05);const light=pigmentBounds(engine.captureState());
    engine.clear();engine.dabAt(96,96,1);const firm=pigmentBounds(engine.captureState());
    expect(firm.width).toBeGreaterThan(light.width*2);
    expect(firm.height).toBeGreaterThan(light.height*2);
  }, WATERCOLOR_SIM_TIMEOUT_MS);

  it('shows brush size for hover and keyboard without putting the cursor in the paint or export', async () => {
    const {canvas,engine}=await mountWatercolor();
    canvas.getBoundingClientRect=()=>({left:0,top:0,width:512,height:512});
    const cursor=container.querySelector('#artstudio-watercolor-cursor');
    engine.configure(baseParams('round',{size:20}),'');
    canvas.onpointermove({clientX:100,clientY:120,pointerType:'mouse',pressure:0,timeStamp:20});
    const width=parseFloat(cursor.style.width);
    expect(cursor.style.display).toBe('block');
    expect(cursor.style.pointerEvents).toBe('none');
    expect(engine.captureState().pigmentDensity.some(v=>v>0)).toBe(false);
    engine.configure(baseParams('round',{size:40}),'');
    expect(parseFloat(cursor.style.width)).toBeCloseTo(width*2,4);
    canvas.focus();const previousLeft=parseFloat(cursor.style.left);
    canvas.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',cancelable:true}));
    expect(parseFloat(cursor.style.left)).toBeGreaterThan(previousLeft);
    canvasContexts.get(canvas).stroke.mockClear();engine.captureExport();
    expect(strokesAtCapture).toBe(0);
    expect(engine.captureState().pigmentDensity.some(v=>v>0)).toBe(false);
    canvas.onpointerleave();expect(cursor.style.display).toBe('none');
  }, WATERCOLOR_SIM_TIMEOUT_MS);

  it('places crisp marks on dry paper and softer marks on a prewetted sheet', async () => {
    const {engine} = await mountWatercolor();
    engine.configure(baseParams('round',{size:28,pigment:0.5}), '');
    engine.dabAt(96,96,0.8);
    const dry=engine.captureState();
    engine.clear();engine.wetPaper();engine.dabAt(96,96,0.8);
    const wet=engine.captureState(),center=96*dry.simWidth+96,edge=center+10;
    const dryEdge=dry.pigmentDensity[edge]/dry.pigmentDensity[center];
    const wetEdge=wet.pigmentDensity[edge]/wet.pigmentDensity[center];
    expect(dryEdge).toBeGreaterThan(0.4);
    expect(wetEdge).toBeLessThan(dryEdge*0.7);
  }, WATERCOLOR_SIM_TIMEOUT_MS);

  it('responds to drying rate and pigment opacity during transport', async () => {
    const {engine}=await mountWatercolor();
    const shared={water:1,flowDirection:'none',absorption:0,granulation:0,opacity:0,drying:0};
    engine.configure(baseParams('round',shared),'');engine.wetPaper();engine.dabAt(96,96,0.8);
    const initial=engine.captureState();
    engine.advanceSimulation(24);
    const transparent=engine.captureState();
    engine.configure(baseParams('round',{...shared,drying:1}),'');engine.restoreState(initial);engine.advanceSimulation(24);
    const fastDry=engine.captureState();
    const sum=values=>values.reduce((n,v)=>n+v,0);
    expect(sum(fastDry.water)).toBeLessThan(sum(transparent.water));
    const opaque={...initial,pigmentOpacityMass:new Float32Array(initial.pigmentDensity)};
    engine.configure(baseParams('round',shared),'');engine.restoreState(opaque);engine.advanceSimulation(24);
    expect(radialSpread(engine.captureState().pigmentDensity,initial.simWidth,96,96)).toBeLessThan(radialSpread(transparent.pigmentDensity,initial.simWidth,96,96));
  }, WATERCOLOR_SIM_TIMEOUT_MS);

  it('carries pigment downhill and keeps fully dry paint still', async () => {
    const {engine} = await mountWatercolor();
    engine.configure(baseParams('round', {water:1,flowDirection:'right',flowStrength:1,absorption:0,drying:0,granulation:0}), '');
    engine.dabAt(96,96,0.8);
    const center = state => {
      let moment=0, mass=0;
      state.pigmentDensity.forEach((v,i)=>{const p=v+state.stainDensity[i];mass+=p;moment+=p*(i%state.simWidth);});
      return moment/mass;
    };
    const before=center(engine.captureState());
    engine.advanceSimulation(40);
    expect(center(engine.captureState())).toBeGreaterThan(before+0.4);
    engine.dry();
    const dry=engine.captureState();
    engine.advanceSimulation(20);
    const later=engine.captureState();
    expect(later.pigmentDensity).toEqual(dry.pigmentDensity);
    expect(later.stainDensity).toEqual(dry.stainDensity);
  }, WATERCOLOR_SIM_TIMEOUT_MS);

  it('wets paper without adding pigment, respects masking, and supports undo', async () => {
    const {engine} = await mountWatercolor();
    engine.configure(baseParams('mask', {water:0,size:28}), '');
    for(let i=0;i<4;i++) engine.dabAt(96,96,1);
    const before=engine.captureState();
    const center=96*before.simWidth+96;
    expect(before.mask[center]).toBeGreaterThan(0.8);
    engine.wetPaper();
    const wet=engine.captureState();
    expect(wet.water[0]).toBeCloseTo(0.65,4);
    expect(wet.water[center]).toBeLessThan(0.14);
    expect(wet.pigmentDensity.some(v=>v>0)).toBe(false);
    expect(engine.undo()).toBe(true);
    expect(engine.captureState().water.some(v=>v>0)).toBe(false);
  }, WATERCOLOR_SIM_TIMEOUT_MS);

  it('preserves color mass when saturated glazes are dried and rewetted', async () => {
    const {engine} = await mountWatercolor();
    engine.configure(baseParams('round', {water:0,pigment:1,rewetting:0,color:{r:0.9,g:0.3,b:0.1}}), '');
    for(let layer=0;layer<3;layer++) {
      for(let dab=0;dab<18;dab++) engine.dabAt(96,96,1);
      if(layer<2) engine.dry();
    }
    const totals = state => ['Density','R','G','B'].map(field => state['pigment'+field].reduce((n,v,i)=>n+v+state['stain'+field][i],0));
    const before=totals(engine.captureState());
    engine.dry();
    totals(engine.captureState()).forEach((v,i)=>expect(v/before[i]).toBeCloseTo(1,5));
    engine.configure(baseParams('water',{rewetting:1}), '');
    engine.wetPaper();
    engine.advanceSimulation(20);
    totals(engine.captureState()).forEach((v,i)=>expect(v/before[i]).toBeCloseTo(1,4));
    const state=engine.captureState();
    for(const name of ['water','pigmentDensity','stainDensity','pigmentR','pigmentG','pigmentB']) {
      expect(state[name].every(v=>Number.isFinite(v)&&v>=-0.00001&&v<=3.50001)).toBe(true);
    }
  }, WATERCOLOR_SIM_TIMEOUT_MS);

  it('conserves deposited pigment and color while a wash flows and settles', async () => {
    const {engine} = await mountWatercolor();
    engine.configure(baseParams('round', {size:28,water:1,pigment:0.8,flowDirection:'right',flowStrength:1}), '');
    engine.dabAt(96,96,0.8);
    const totals = state => ['Density','R','G','B'].map(field => state['pigment'+field].reduce((n,v,i)=>n+v+state['stain'+field][i],0));
    const before = totals(engine.captureState());
    engine.advanceSimulation(50);
    const after = totals(engine.captureState());
    after.forEach((value,index)=>expect(value / before[index]).toBeCloseTo(1,4));
  }, WATERCOLOR_SIM_TIMEOUT_MS);
  it('keeps painted pixels unchanged when only the next pigment load changes', async () => {
    const {canvas, engine} = await mountWatercolor();
    engine.configure(baseParams('round', {pigment:0.7}), '');
    engine.dabAt(96, 96, 0.8);
    const rendered = () => {
      engine.captureSnapshot();
      const layers = canvasContexts.get(canvas).drawImage.mock.calls.filter(([layer]) => layer.width === 192);
      const pigmentContext = canvasContexts.get(layers[layers.length - 1][0]);
      return new Uint8ClampedArray(pigmentContext.putImageData.mock.calls.at(-1)[0].data);
    };
    const before = rendered();
    engine.configure(baseParams('round', {pigment:0.05}), '');
    expect(rendered()).toEqual(before);
    expect(canvas.width).toBe(1024);
    expect(canvas.height).toBe(1024);
  }, WATERCOLOR_SIM_TIMEOUT_MS);

  it('retains pigment hue when repeated strokes saturate the paper', async () => {
    const {engine} = await mountWatercolor();
    const color = {r:0.18,g:0.43,b:0.69};
    engine.configure(baseParams('round', {color,water:0,pigment:1,rewetting:0}), '');
    for (let i = 0; i < 24; i++) engine.dabAt(96, 96, 0.8);
    const state = engine.captureState(), index = 96 * state.simWidth + 96;
    expect(state.pigmentDensity[index]).toBeCloseTo(2.5, 3);
    expect(state.pigmentR[index] / state.pigmentDensity[index]).toBeCloseTo(color.r, 4);
    expect(state.pigmentG[index] / state.pigmentDensity[index]).toBeCloseTo(color.g, 4);
    expect(state.pigmentB[index] / state.pigmentDensity[index]).toBeCloseTo(color.b, 4);
  }, WATERCOLOR_SIM_TIMEOUT_MS);

  it('deposits water and pigment and restores compact undo/redo states', async () => {
    const { engine } = await mountWatercolor();
    expect(engine).toBeTruthy();

    engine.dabAt(96, 96, 0.8);
    const painted = engine.captureState();
    expect(painted.water.some((value) => value > 0)).toBe(true);
    expect(painted.pigmentDensity.some((value) => value > 0)).toBe(true);

    const legacyState = { ...painted };
    delete legacyState.pigmentMobilityRMass;
    delete legacyState.pigmentMobilityGMass;
    delete legacyState.pigmentMobilityBMass;
    delete legacyState.stainMobilityRMass;
    delete legacyState.stainMobilityGMass;
    delete legacyState.stainMobilityBMass;
    expect(engine.restoreState(legacyState)).toBe(true);
    expect(engine.captureState().pigmentMobilityRMass.some((value) => value > 0)).toBe(true);

    const compact = engine.captureState(true);
    expect(compact.packed).toBe('uint16-v1');
    expect(compact.water).toBeInstanceOf(Uint16Array);
    expect(compact.pigmentDensity).toBeInstanceOf(Uint16Array);
    expect(compact.pigmentMobilityRMass).toBeInstanceOf(Uint16Array);
    expect(compact.stainMobilityRMass).toBeInstanceOf(Uint16Array);

    expect(engine.undo()).toBe(true);
    expect(engine.captureState().pigmentDensity.some((value) => value > 0)).toBe(false);
    expect(engine.redo()).toBe(true);
    expect(engine.captureState().pigmentDensity.some((value) => value > 0)).toBe(true);
  }, WATERCOLOR_SIM_TIMEOUT_MS);

  it('gives flat, mop, and rigger brushes materially different footprints', async () => {
    const { engine } = await mountWatercolor();

    engine.configure(baseParams('flat'), '');
    engine.dabAt(96, 96, 0.75);
    const flat = pigmentBounds(engine.captureState());

    engine.clear();
    engine.configure(baseParams('mop'), '');
    engine.dabAt(96, 96, 0.75);
    const mop = pigmentBounds(engine.captureState());

    engine.clear();
    engine.configure(baseParams('rigger'), '');
    engine.dabAt(96, 96, 0.75);
    const rigger = pigmentBounds(engine.captureState());

    expect(flat.width).toBeGreaterThan(flat.height * 2);
    expect(Math.abs(mop.width - mop.height)).toBeLessThanOrEqual(2);
    expect(mop.width * mop.height).toBeGreaterThan(flat.width * flat.height);
    expect(rigger.width).toBeGreaterThan(rigger.height * 2);
    expect(rigger.height).toBeLessThan(flat.height);
  }, WATERCOLOR_SIM_TIMEOUT_MS);

  it('captures clean artwork before repainting screen-only flow diagnostics', async () => {
    const { canvas, engine } = await mountWatercolor();
    engine.configure(baseParams('mop', { showWetness: true, showFlow: true }), '');
    engine.dabAt(86, 86, 0.8);

    const mainContext = canvasContexts.get(canvas);
    mainContext.stroke.mockClear();
    const snapshot = engine.captureSnapshot();

    expect(snapshot).toMatch(/^data:image\/png/);
    expect(strokesAtCapture).toBe(0);
    expect(mainContext.stroke).toHaveBeenCalled();
  }, WATERCOLOR_SIM_TIMEOUT_MS);

  it('lets high-mobility color channels travel ahead of low-mobility channels', async () => {
    const { engine } = await mountWatercolor();
    const shared = {
      surface: 'wet',
      flowDirection: 'none',
      size: 24,
      bleed: 1,
      absorption: 0,
      granulation: 0,
      opacity: 0.2,
      drying: 0,
      separation: 1,
    };

    engine.configure(baseParams('round', {
      ...shared,
      color: { r: 1, g: 0, b: 0 },
      mobility: 1,
    }), '');
    engine.dabAt(96, 96, 0.8);
    engine.configure(baseParams('round', {
      ...shared,
      color: { r: 0, g: 0, b: 1 },
      mobility: 0,
    }), '');
    engine.dabAt(96, 96, 0.8);

    expect(engine.advanceSimulation(18)).toBe(18);
    const separated = engine.captureState();
    const redSpread = radialSpread(separated.pigmentR, separated.simWidth, 96, 96);
    const blueSpread = radialSpread(separated.pigmentB, separated.simWidth, 96, 96);

    expect(separated.pigmentMobilityRMass.some((value) => value > 0)).toBe(true);
    expect(redSpread).toBeGreaterThan(blueSpread * 1.1);
  }, WATERCOLOR_SIM_TIMEOUT_MS);

  it('rewets low-staining dry pigment more readily while conserving pigment mass', async () => {
    const { engine } = await mountWatercolor();
    const sum = (values) => values.reduce((total, value) => total + value, 0);

    const runRewet = (staining) => {
      engine.clear();
      engine.configure(baseParams('round', {
        color: { r: 0.9, g: 0.15, b: 0.08 },
        staining,
        granulation: 0,
        rewetting: 1,
      }), '');
      engine.dabAt(96, 96, 0.8);
      engine.dry();
      const dryState = engine.captureState();
      const dryMass = sum(dryState.stainDensity);

      engine.configure(baseParams('water', {
        staining,
        granulation: 0,
        water: 1,
        rewetting: 1,
      }), '');
      engine.dabAt(96, 96, 0.8);
      const rewetted = engine.captureState();
      return {
        dryMass,
        mobileMass: sum(rewetted.pigmentDensity),
        conservedMass: sum(rewetted.pigmentDensity) + sum(rewetted.stainDensity),
      };
    };

    const lowStaining = runRewet(0);
    const highStaining = runRewet(1);

    expect(lowStaining.mobileMass).toBeGreaterThan(highStaining.mobileMass * 2);
    expect(lowStaining.conservedMass).toBeCloseTo(lowStaining.dryMass, 4);
    expect(highStaining.conservedMass).toBeCloseTo(highStaining.dryMass, 4);
  }, WATERCOLOR_SIM_TIMEOUT_MS);

  it('retains more water and bloom under humid low-airflow studio conditions', async () => {
    const { engine } = await mountWatercolor();
    const sum = (values) => values.reduce((total, value) => total + value, 0);
    const shared = {
      surface: 'wet',
      flowDirection: 'none',
      water: 1,
      drying: 0.5,
      bleed: 0.8,
    };

    engine.configure(baseParams('mop', shared), '');
    engine.dabAt(96, 96, 0.8);
    const initial = engine.captureState();

    engine.configure(baseParams('mop', { ...shared, humidity: 1, airflow: 0 }), '');
    expect(engine.restoreState(initial)).toBe(true);
    engine.advanceSimulation(24);
    const humid = engine.captureState();

    engine.configure(baseParams('mop', { ...shared, humidity: 0, airflow: 1 }), '');
    expect(engine.restoreState(initial)).toBe(true);
    engine.advanceSimulation(24);
    const dry = engine.captureState();

    expect(sum(humid.water)).toBeGreaterThan(sum(dry.water) * 1.15);
    expect(sum(humid.bloom)).toBeGreaterThan(sum(dry.bloom));
  }, WATERCOLOR_SIM_TIMEOUT_MS);

  it('models sizing-driven surface retention, fiber fixation, and adjustable bloom response', async () => {
    const { engine } = await mountWatercolor();
    const sum = (values) => values.reduce((total, value) => total + value, 0);
    const shared = {
      surface: 'wet',
      flowDirection: 'none',
      water: 1,
      absorption: 0.9,
      drying: 0.35,
      bleed: 0.82,
      granulation: 0.2,
      bloomSensitivity: 0.6,
    };

    engine.configure(baseParams('mop', shared), '');
    engine.dabAt(96, 96, 0.82);
    const initial = engine.captureState();

    engine.configure(baseParams('mop', { ...shared, sizing: 1 }), '');
    expect(engine.restoreState(initial)).toBe(true);
    engine.advanceSimulation(24);
    const highlySized = engine.captureState();

    engine.configure(baseParams('mop', { ...shared, sizing: 0 }), '');
    expect(engine.restoreState(initial)).toBe(true);
    engine.advanceSimulation(24);
    const lightlySized = engine.captureState();

    expect(sum(highlySized.water)).toBeGreaterThan(sum(lightlySized.water));
    expect(sum(lightlySized.stainDensity)).toBeGreaterThan(sum(highlySized.stainDensity));

    engine.configure(baseParams('mop', { ...shared, sizing: 0.58, bloomSensitivity: 1 }), '');
    expect(engine.restoreState(initial)).toBe(true);
    engine.advanceSimulation(24);
    const bloomResponsive = engine.captureState();

    engine.configure(baseParams('mop', { ...shared, sizing: 0.58, bloomSensitivity: 0 }), '');
    expect(engine.restoreState(initial)).toBe(true);
    engine.advanceSimulation(24);
    const bloomResistant = engine.captureState();

    expect(sum(bloomResponsive.bloom)).toBeGreaterThan(sum(bloomResistant.bloom));
  }, WATERCOLOR_SIM_TIMEOUT_MS);
});
