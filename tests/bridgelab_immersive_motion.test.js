import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act, Simulate } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
let host, root, state, update, media, hidden, configuration, viewerStatus, viewerListener, lastScene;

function mount(overrides = {}) {
  function Lab() {
    const [value, setValue] = React.useState({ bridgeLab: {
      tab: 'build', bridgeView: '3d', loadMode: 'vehicle', vehiclePos: 0.5,
      introDismissed: true, seismicEnabled: true, ...overrides
    } });
    state = value.bridgeLab;
    update = patch => setValue(previous => ({ ...previous, bridgeLab: { ...previous.bridgeLab, ...patch } }));
    return configuration.render(makeCtx({ toolData: value, setToolData: setValue }));
  }
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  act(() => root.render(React.createElement(Lab)));
  // Open native disclosures queue a zero-delay toggle event in jsdom.
  act(() => vi.advanceTimersByTime(0));
}
function button(name) {
  const found = [...host.querySelectorAll('button')].find(node => node.textContent.trim() === name || node.getAttribute('aria-label') === name);
  expect(found, `button ${name}`).toBeTruthy();
  return found;
}
function click(name) { act(() => button(name).click()); }
function tick(ms) { act(() => vi.advanceTimersByTime(ms)); }
function field(name) {
  const labelled = [...host.querySelectorAll('input,select,textarea')].find(node => node.getAttribute('aria-label') === name);
  const label = [...host.querySelectorAll('label')].find(node => node.textContent.trim().startsWith(name));
  const found = labelled || (label && (document.getElementById(label.htmlFor) || label.querySelector('input,select')));
  expect(found, `field ${name}`).toBeTruthy();
  return found;
}
function patch(value) { act(() => update(value)); }

beforeEach(() => {
  vi.useFakeTimers();
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  hidden = false;
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
  const listeners = new Set();
  media = { matches: false, addEventListener: vi.fn((_, fn) => listeners.add(fn)),
    removeEventListener: vi.fn((_, fn) => listeners.delete(fn)),
    change(matches) { this.matches = matches; listeners.forEach(fn => fn()); } };
  vi.stubGlobal('matchMedia', () => media);
  resetStemLab();
  viewerStatus = 'ready';
  viewerListener = null;
  window.StemLab.makeOrbitViewer = () => ({
    attach() {}, push(value) { lastScene = value; }, dispose() {},
    status: () => viewerStatus,
    onStatusChange: listener => { viewerListener = listener; }
  });
  configuration = loadTool('stem_lab/stem_tool_bridgelab.js', 'bridgeLab');
});

afterEach(() => {
  if (root) act(() => root.unmount());
  root = null;
  host?.remove();
  document.getElementById('allo-live-bridgelab')?.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('Bridge Lab immersive earthquake interaction', () => {
  const scenePose = overrides => ({ version: 'bridge-scene-v1', source: 'current', view: 'immersive', observer: 'bank',
    walkPos: 0.63, yaw: 27, pitch: -12, bankYaw: 18, bankPitch: -8, rotY: 46, rotX: 23, zoom: 1.4, ...overrides });
  const sceneTrial = overrides => ({ version: 'bridge-seismic-v1', name: 'My scene',
    inputs: { archetype: 'balanced', groundFrequencyHz: 1.1, intensityG: 0.12, dampingRatio: 0.05 },
    timeS: 7.217, prediction: '', observation: 'Energy moves into the damper.', scene: scenePose(), ...overrides });

  it('records displayed reference A with its exact time and independent note, preserving the working experiment', () => {
    const unsupported={version:'future-model',observation:'Keep me'};
    mount({ bridgeView:'immersive', bridgeObserver:'bank', seismicGuideOpen:true, seismicSceneRecording:true,
      seismicTrials:[unsupported], seismicPrediction:'Prediction for B', seismicObservation:'Explanation for B',
      span:40, bridgeBankYaw:18, bridgeBankPitch:-8 });
    click('Prepare 5% / 20% comparison');
    patch({seismicTime:7.217,seismicSceneNote:'A sways farther; damping carries energy away.'});
    click('A · reference');
    const baseline=state.seismicGuideBaseline;
    click('Save scene observation');
    expect(state.seismicTrials[0]).toEqual(unsupported);
    const record=state.seismicTrials[1];
    expect(record).toMatchObject({version:'bridge-seismic-v1',timeS:7.217,prediction:'',
      observation:'A sways farther; damping carries energy away.',inputs:baseline.inputs,
      scene:{source:'reference',view:'immersive',observer:'bank',bankYaw:18,bankPitch:-8}});
    expect(record.inputs).not.toBe(baseline.inputs);
    expect(state).toMatchObject({seismicDampingRatio:0.2,seismicSceneTrial:'reference',seismicTime:7.217,
      seismicPrediction:'Prediction for B',seismicObservation:'Explanation for B',span:40,seismicSceneNote:'',seismicPlaying:false,autoDriving:false});
    expect(host.querySelector('[data-scene-record-saved]').textContent).toContain('saved');
    expect(document.getElementById('allo-live-bridgelab').textContent).toContain('Scene observation saved');
    click('Replay scene');
    expect(host.querySelector('[data-scene-record-saved]')).toBeNull();
    click('Pause scene replay');
    expect(host.querySelector('[data-scene-record-saved]')).toBeTruthy();
  });

  it('pauses on opening, typing and saving without rounding the recorded frame', () => {
    mount({seismicTime:7.217,seismicSceneRecording:'true'});
    expect(host.querySelector('[data-bridge-scene-recorder]').open).toBe(false);
    click('Replay scene'); tick(100);
    const before=state.seismicTime;
    act(() => {const details=host.querySelector('[data-bridge-scene-recorder]'); details.open=true; details.dispatchEvent(new Event('toggle'));});
    tick(0);
    expect(state.seismicPlaying).toBe(false);
    tick(200); expect(state.seismicTime).toBe(before);
    click('Replay scene'); tick(100);
    const writtenTime=state.seismicTime;
    act(() => Simulate.change(field('Scene observation note'),{target:{value:'The deck lags behind the ground.'}}));
    expect(state.seismicPlaying).toBe(false);
    expect(state.seismicTime).toBe(writtenTime);
    click('Replay scene'); tick(100);
    const savedTime=state.seismicTime;
    click('Save scene observation');
    expect(state.seismicTrials[0].timeS).toBe(savedTime);
    tick(200); expect(state.seismicTime).toBe(savedTime);
    expect(state.seismicTrials[0].observation).toBe('The deck lags behind the ground.');
  });

  it.each([['immersive','bank'],['immersive','deck'],['3d','deck']])('revisits the saved %s / %s pose and focuses the paused scene', (view,observer) => {
    mount({bridgeView:view,bridgeObserver:observer,bridgeWalkPos:0.63,bridgeLookYaw:27,bridgeLookPitch:-12,
      bridgeBankYaw:18,bridgeBankPitch:-8,rot3d:{rotY:46,rotX:23},zoom3d:1.4,seismicTime:7.217,
      seismicSceneRecording:true,seismicSceneNote:'Look at the deck.',seismicPrediction:'Keep prediction',seismicObservation:'Keep explanation'});
    click('Save scene observation');
    const record=state.seismicTrials[0];
    patch({bridgeView:'2d',bridgeObserver:'deck',bridgeWalkPos:0.12,bridgeLookYaw:-3,bridgeLookPitch:2,
      bridgeBankYaw:-10,bridgeBankPitch:3,rot3d:{rotY:5,rotX:6},zoom3d:0.7,seismicTime:18,seismicDampingRatio:0.3,
      seismicSceneCompare:true,seismicSceneTrial:'reference',seismicReadoutCollapsed:true,seismicSceneNote:'Another draft'});
    click('Revisit scene observation 1: '+record.name);
    expect(state).toMatchObject({bridgeView:view,bridgeObserver:observer,bridgeWalkPos:0.63,bridgeLookYaw:27,bridgeLookPitch:-12,
      bridgeBankYaw:18,bridgeBankPitch:-8,rot3d:{rotY:46,rotX:23},zoom3d:1.4,seismicTime:7.217,seismicDampingRatio:0.05,
      seismicSceneCompare:false,seismicSceneTrial:'current',seismicSceneRecording:true,seismicSceneNote:'Look at the deck.',
      seismicReadoutCollapsed:false,seismicPlaying:false,autoDriving:false,seismicPrediction:'Keep prediction',seismicObservation:'Keep explanation'});
    expect(document.activeElement.getAttribute('aria-describedby')).toBe('bridge-gl-description');
    expect(host.querySelector('[data-scene-record-context]').textContent).toContain('7.217 s');
  });

  it('keeps graphics failure in 2D while restoring a saved bank pose for deliberate recovery', () => {
    const record=sceneTrial();
    mount({seismicTrials:[record]});
    act(() => {viewerStatus='failed'; viewerListener('failed');});
    act(() => media.change(true));
    click('Revisit scene observation 1: My scene');
    expect(state).toMatchObject({bridgeView:'2d',bridgeObserver:'bank',bridgeBankYaw:18,bridgeBankPitch:-8,
      seismicTime:7.217,seismicPlaying:false,seismicSceneNote:record.observation});
    expect(document.activeElement.hasAttribute('data-bridge-elevation')).toBe(true);
    act(() => {viewerStatus='ready'; viewerListener('ready');});
    expect(state.bridgeView).toBe('2d');
    click('From the riverbank');
    expect(state).toMatchObject({bridgeView:'immersive',bridgeObserver:'bank',bridgeBankYaw:18,bridgeBankPitch:-8,seismicTime:7.217,seismicPlaying:false});
    expect(button('Replay scene').disabled).toBe(true);
  });

  it.each([{bankYaw:Infinity},{walkPos:0.99},{zoom:'1.4'},{version:'bridge-scene-v2'}])('ignores invalid optional pose %j while keeping a valid earthquake trial', invalid => {
    const record=sceneTrial({scene:scenePose(invalid)});
    mount({bridgeView:'2d',seismicTrials:[record],bridgeBankYaw:5,seismicTime:18});
    expect(host.querySelector('[data-seismic-trial="0"]')).toBeTruthy();
    expect(host.querySelector('[data-seismic-scene-context]')).toBeNull();
    click('Restore earthquake trial 1: My scene');
    expect(state).toMatchObject({bridgeView:'2d',bridgeBankYaw:5,seismicTime:7.217,seismicDampingRatio:0.05,
      seismicObservation:record.observation,seismicPlaying:false});
  });

  it('shares the four-trial limit, preserves unsupported records and permits saving after removal', () => {
    const records=[0,1,2,3].map(i => sceneTrial({name:'Trial '+i}));
    const future={version:'future-model'};
    mount({seismicSceneRecording:true,seismicSceneNote:'Keep this draft',seismicTrials:[future,...records]});
    expect(button('Save scene observation').disabled).toBe(true);
    click('Save scene observation');
    expect(state.seismicTrials).toHaveLength(5);
    expect(state.seismicSceneNote).toBe('Keep this draft');
    click('Remove earthquake trial 2: Trial 1');
    expect(button('Save scene observation').disabled).toBe(false);
    click('Save scene observation');
    expect(state.seismicTrials).toHaveLength(5);
    expect(state.seismicTrials[0]).toEqual(future);
    expect(state.seismicTrials.at(-1).observation).toBe('Keep this draft');
    const name=state.seismicTrials.at(-1).name;
    click('Remove earthquake trial 4: '+name);
    expect(host.querySelector('[data-scene-record-saved]')).toBeNull();
  });

  it('prints escaped observations, source, precise time and recalculated power without interactive controls', () => {
    const record=sceneTrial({scene:scenePose({source:'reference'}),observation:'<img src=x onerror=alert(1)> Ground → deck',
      peaks:{relativeM:999999},sample:{storedPowerWPerKg:999999}});
    mount({seismicTrials:[record]});
    const expected=host.querySelector('[data-seismic-scene-power]').textContent;
    expect(expected).not.toContain('999999');
    click('Open earthquake evidence report');
    const report=host.querySelector('[data-bridge-print-seismic]');
    expect(report.textContent).toContain('Captured from the reference scene · Riverbank viewpoint');
    expect(report.textContent).toContain('Inspected time: 7.217 s');
    expect(report.textContent).toContain(expected);
    expect(report.textContent).toContain(record.observation);
    expect(report.querySelector('img')).toBeNull();
    expect(report.querySelector('button,input,textarea,select')).toBeNull();
  });

  it('bounds separate imported notes and normalizes the saved camera without changing static design', () => {
    mount({seismicSceneRecording:true,seismicSceneNote:'a'.repeat(2100),rot3d:{rotY:766,rotX:999},
      bridgeLookYaw:999,zoom3d:99,span:45,materialId:'aluminum'});
    expect(field('Scene observation note').value).toHaveLength(2000);
    click('Save scene observation');
    expect(state.seismicTrials[0].observation).toHaveLength(2000);
    expect(state.seismicTrials[0].scene).toMatchObject({rotY:46,rotX:78,yaw:180,zoom:3.2});
    expect(state).toMatchObject({span:45,materialId:'aluminum'});
  });

  it('opens energy transfer without starting motion and keeps its rates synchronized with replay', () => {
    mount({ seismicTime: 7.217, seismicEnergyFlow: 'true', seismicObservation: 'Keep my energy notes.' });
    expect(host.querySelector('[data-flow-frame]')).toBeNull();
    patch({ seismicEnergyFlow: true });
    const power = id => Number(host.querySelector('[data-flow-path="' + id + '"]').dataset.flowPower);
    const input = Number(host.querySelector('[data-seismic-input-power]').dataset.seismicInputPower);
    expect(power('input')).toBe(input);
    expect(Number(host.querySelector('[data-flow-stored-rate]').dataset.flowStoredRate)).toBeCloseTo(power('input') - power('damping'), 12);
    expect(host.querySelector('[data-flow-frame]').dataset.flowFrame).toBe('7.217');
    const sig=lastScene.sig;
    click('Replay scene');
    tick(100);
    expect(Number(host.querySelector('[data-flow-frame]').dataset.flowFrame)).toBeCloseTo(7.317, 10);
    patch({ seismicEnergyFlow: false });
    tick(100);
    expect(state.seismicPlaying).toBe(true);
    expect(host.querySelector('[data-flow-frame]')).toBeNull();
    expect(lastScene.sig).toBe(sig);
    expect(state.seismicObservation).toBe('Keep my energy notes.');
  });

  it('uses the selected trial for transfer while preserving the shared A/B clock', () => {
    mount({ seismicEnergyFlow: true, seismicGuideOpen: true });
    click('Prepare 5% / 20% comparison');
    patch({ seismicTime: 7.217 });
    const rates=() => [...host.querySelectorAll('[data-flow-path]')].map(n => n.dataset.flowPower);
    const b=rates();
    click('A · reference');
    expect(host.querySelector('[data-flow-frame]').dataset.flowTrial).toBe('reference');
    expect(rates()).not.toEqual(b);
    expect(state.seismicTime).toBe(7.217);
    expect(host.querySelector('[data-flow-frame] svg').getAttribute('aria-label')).toContain('A · reference');
    click('B · current');
    expect(rates()).toEqual(b);
    expect(state.seismicDampingRatio).toBe(0.2);
  });

  it('shows zero transfer at rest and internal exchange without damping after shaking ends', () => {
    media.change(true);
    mount({ seismicEnergyFlow: true, seismicIntensityG: 0, seismicTime: 18 });
    expect([...host.querySelectorAll('[data-flow-path]')].every(n => n.dataset.flowDirection === '0')).toBe(true);
    expect(host.querySelector('[data-flow-stored-rate]').textContent).toBe('Stored energy unchanged: 0.000 W/kg');
    expect(host.querySelector('[data-flow-frame] svg').getAttribute('aria-label')).toContain('No transfer');
    patch({ seismicIntensityG: 0.12, seismicDampingRatio: 0, seismicTime: 18 });
    expect(host.querySelector('[data-flow-path="input"]').dataset.flowDirection).toBe('0');
    expect(host.querySelector('[data-flow-path="damping"]').dataset.flowDirection).toBe('0');
    expect(host.querySelector('[data-flow-path="exchange"]').dataset.flowDirection).not.toBe('0');
    expect(host.querySelector('[data-flow-stored-rate]').dataset.flowStoredRate).toBe('0');
    expect(button('Replay scene').disabled).toBe(true);
  });

  it('retains transfer settings through folded measurements, 2D fallback and graphics recovery', () => {
    mount({ bridgeView: 'immersive', seismicEnergyFlow: true, seismicTime: 7.217 });
    const diagram=() => host.querySelector('[data-flow-frame] svg').getAttribute('aria-label');
    const before=diagram();
    patch({ seismicReadoutCollapsed: true });
    expect(host.querySelector('[data-flow-frame]')).toBeNull();
    expect(state.seismicEnergyFlow).toBe(true);
    patch({ seismicReadoutCollapsed: false });
    expect(diagram()).toBe(before);
    viewerStatus='failed'; act(() => viewerListener('failed'));
    expect(host.querySelector('[data-bridge-energy-flow="fallback"]').open).toBe(true);
    expect(diagram()).toBe(before);
    viewerStatus='ready'; act(() => viewerListener('ready'));
    click('On the bridge');
    expect(host.querySelector('[data-bridge-energy-flow="scene"]').open).toBe(true);
    expect(diagram()).toBe(before);
    patch({ seismicEnabled: false });
    expect(host.querySelector('[data-bridge-energy-flow]')).toBeNull();
  });

  it('labels the fallback as the current experiment while a reference scene is selected', () => {
    mount({ seismicEnergyFlow: true, seismicGuideOpen: true });
    click('Prepare 5% / 20% comparison');
    patch({ seismicTime: 8 });
    const b=host.querySelector('[data-flow-frame] svg').getAttribute('aria-label');
    click('A · reference');
    patch({ bridgeView: '2d' });
    const frame=host.querySelector('[data-flow-frame]');
    expect(frame.dataset.flowTrial).toBe('current');
    expect(frame.textContent).toContain('Current experiment');
    expect(frame.querySelector('svg').getAttribute('aria-label').split(' s. ')[1]).toBe(b.split(' s. ')[1]);
    expect(state.seismicTime).toBe(8);
    expect(state.seismicPlaying).toBe(false);
  });

  it('jumps to exact model peaks from the scene, pauses replay, and preserves viewpoint and writing', () => {
    mount({ bridgeView: 'immersive', bridgeObserver: 'bank', bridgeBankYaw: 18, seismicTime: 5,
      seismicObservation: 'Compare the two peaks.', seismicMotionGuide: true });
    const sig = lastScene.sig;
    click('Inspect peak motion');
    const peak = state.seismicTime;
    patch({ seismicTime: 3 });
    click('Replay scene');
    act(() => Simulate.change(field('Scene key moments'), { target: { value: 'motion' } }));
    expect(state).toMatchObject({ seismicTime: peak, seismicPlaying: false, autoDriving: false,
      bridgeObserver: 'bank', bridgeBankYaw: 18, seismicObservation: 'Compare the two peaks.' });
    expect(lastScene.sig).toBe(sig);
    expect(Number(host.querySelector('[data-motion-frame]').dataset.motionFrame)).toBe(peak);
    const insight = host.querySelector('[data-bridge-moment-insight="motion"]');
    expect(insight.textContent).toContain((Math.abs(lastScene.quake.deckM - lastScene.quake.groundM) * 100).toFixed(2) + ' cm');
    expect(field('Scene key moments').getAttribute('aria-describedby')).toBe(insight.id);
    act(() => Simulate.change(field('Scene key moments'), { target: { value: 'acceleration' } }));
    const accelerationTime = state.seismicTime;
    expect(host.querySelector('[data-bridge-moment-insight="acceleration"]').textContent).toContain('stationary frame');
    click('Inspect peak acceleration');
    expect(state.seismicTime).toBe(accelerationTime);
  });

  it('uses each A/B trial peak without retiming the shared clock when changing trials', () => {
    mount({ seismicGuideOpen: true });
    click('Prepare 5% / 20% comparison');
    const peakTime = () => Number(field('Scene key moments').querySelector('option[value="motion"]').dataset.momentTime);
    const b = peakTime();
    click('A · reference');
    const a = peakTime();
    expect(a).not.toBe(b);
    act(() => Simulate.change(field('Scene key moments'), { target: { value: 'motion' } }));
    expect(state.seismicTime).toBe(a);
    expect(host.querySelector('[data-bridge-moment-insight]').dataset.momentTrial).toBe('reference');
    click('B · current');
    expect(state.seismicTime).toBe(a);
    expect(field('Scene key moments').value).toBe('');
    expect(host.querySelector('[data-bridge-moment-insight]')).toBeNull();
    act(() => Simulate.change(field('Scene key moments'), { target: { value: 'motion' } }));
    expect(state.seismicTime).toBe(b);
    expect(state.seismicDampingRatio).toBe(0.2);
    expect(host.querySelector('[data-bridge-moment-insight]').dataset.momentTrial).toBe('current');
    patch({ seismicIntensityG: 0 });
    expect(field('Scene key moments').querySelector('option[value="motion"]').disabled).toBe(true);
    click('A · reference');
    expect(field('Scene key moments').querySelector('option[value="motion"]').disabled).toBe(false);
  });

  it('clears moment explanations after scrubbing and during playback without storing a stale selection', () => {
    mount();
    act(() => Simulate.change(field('Scene key moments'), { target: { value: 'motion' } }));
    const peak = state.seismicTime;
    patch({ seismicTime: peak + 0.001 });
    expect(field('Scene key moments').value).toBe('');
    expect(host.querySelector('[data-bridge-moment-insight]')).toBeNull();
    patch({ seismicTime: peak });
    expect(field('Scene key moments').value).toBe('motion');
    click('Replay scene');
    expect(host.querySelector('[data-bridge-moment-insight]')).toBeNull();
    expect(field('Scene key moments').hasAttribute('aria-describedby')).toBe(false);
    tick(100);
    expect(field('Scene key moments').value).toBe('');
  });

  it('keeps boundary frames usable with zero shaking and reduced motion, without inventing a peak', () => {
    media.change(true);
    mount({ seismicIntensityG: 0, seismicTime: 5 });
    const select = field('Scene key moments');
    for (const id of ['motion', 'acceleration']) {
      expect(select.querySelector('option[value="' + id + '"]').disabled).toBe(true);
      expect(select.querySelector('option[value="' + id + '"]').textContent).toContain('no shaking');
      act(() => Simulate.change(select, { target: { value: id } }));
      expect(state.seismicTime).toBe(5);
    }
    for (const [id, time] of [['free', 16], ['end', 24], ['start', 0]]) {
      act(() => Simulate.change(select, { target: { value: id } }));
      expect(state.seismicTime).toBe(time);
      expect(state.seismicPlaying).toBe(false);
      expect(host.querySelector('[data-bridge-moment-insight]').textContent).toContain('No ground motion was applied');
      expect(host.querySelector('[data-bridge-moment-insight]').textContent).toContain('0.000 J/kg');
    }
    expect(button('Replay scene').disabled).toBe(true);
  });

  it('keeps moment navigation available when measurements are folded and rejects invalid commands', () => {
    mount({ bridgeView: 'immersive', seismicReadoutCollapsed: true, seismicTime: 7 });
    act(() => Simulate.change(field('Scene key moments'), { target: { value: 'constructor' } }));
    expect(state.seismicTime).toBe(7);
    act(() => Simulate.change(field('Scene key moments'), { target: { value: 'free' } }));
    expect(state.seismicTime).toBe(16);
    expect(field('Scene key moments').hasAttribute('aria-describedby')).toBe(false);
    expect(host.querySelector('[data-bridge-moment-insight]')).toBeNull();
    patch({ seismicReadoutCollapsed: false });
    expect(host.querySelector('[data-bridge-moment-insight="free"]').textContent).toContain('Ground motion has ended');
    act(() => Simulate.change(field('Scene key moments'), { target: { value: 'end' } }));
    expect(host.querySelector('[data-bridge-moment-insight="end"]').textContent).toContain('does not mean the deck has settled');
  });

  it('keeps the chosen explanation when undamped motion and acceleration share a peak frame', () => {
    mount({ seismicDampingRatio: 0 });
    const options = field('Scene key moments');
    expect(options.querySelector('option[value="motion"]').dataset.momentTime)
      .toBe(options.querySelector('option[value="acceleration"]').dataset.momentTime);
    for (const id of ['acceleration', 'motion', 'acceleration']) {
      act(() => Simulate.change(options, { target: { value: id } }));
      expect(options.value).toBe(id);
      expect(host.querySelector('[data-bridge-moment-insight]').dataset.bridgeMomentInsight).toBe(id);
    }
    act(() => Simulate.change(options, { target: { value: 'end' } }));
    expect(host.querySelector('[data-bridge-moment-insight]').textContent).toContain('does not mean the deck has settled');
  });

  it('distinguishes very small nonzero peak readings from a zero-input experiment', () => {
    mount({ seismicIntensityG: 0.000001 });
    act(() => Simulate.change(field('Scene key moments'), { target: { value: 'motion' } }));
    expect(host.querySelector('[data-bridge-moment-insight]').textContent).toContain('Magnitude: <0.01 cm');
    act(() => Simulate.change(field('Scene key moments'), { target: { value: 'acceleration' } }));
    expect(host.querySelector('[data-bridge-moment-insight]').textContent).toContain('Magnitude: <0.001 g');
    expect(host.querySelector('[data-bridge-moment-insight]').textContent).not.toContain('No ground motion');
  });

  it('folds scene measurements without resetting the clock, selected trial, or resting rails', () => {
    mount({ bridgeView: 'immersive', bridgeObserver: 'bank', seismicGuideOpen: true,
      seismicMotionGuide: true, seismicSceneEnergy: true });
    click('Prepare 5% / 20% comparison');
    patch({ seismicTime: 8 });
    click('A · reference');
    const readings = host.querySelector('[data-motion-frame]').textContent;
    patch({ seismicReadoutCollapsed: true });
    expect(host.querySelector('[data-bridge-scene-readout]').open).toBe(false);
    expect(host.querySelector('[data-motion-frame]')).toBeNull();
    expect(host.querySelector('[data-bridge-scene-energy-frame]')).toBeNull();
    expect(host.querySelector('[data-bridge-scene-readout]').textContent).toContain('A · reference · 8.00 s');
    expect(lastScene.motionGuide).toBe(true);
    expect(state.seismicTime).toBe(8);
    click('Switch to deck viewpoint');
    expect(state.seismicReadoutCollapsed).toBe(true);
    expect(state.seismicSceneTrial).toBe('reference');
    patch({ seismicReadoutCollapsed: false });
    expect(host.querySelector('[data-motion-frame]').textContent).toBe(readings);
    expect(host.querySelector('[data-bridge-scene-energy-frame]')).toBeTruthy();
    click('Replay scene');
    patch({ seismicReadoutCollapsed: true });
    tick(200);
    expect(state.seismicTime).toBeGreaterThan(8);
    expect(state.seismicPlaying).toBe(true);
  });

  it('switches deck and riverbank observers at the same time while preserving both viewpoints and notes', () => {
    mount({ bridgeView: 'immersive', bridgeWalkPos: 0.64, bridgeLookYaw: 32, bridgeLookPitch: -7,
      seismicTime: 8, seismicObservation: 'Keep this observation.' });
    click('Run earthquake');
    click('From the riverbank');
    expect(state).toMatchObject({ bridgeView: 'immersive', bridgeObserver: 'bank', seismicTime: 8, seismicPlaying: false,
      bridgeWalkPos: 0.64, bridgeLookYaw: 32, bridgeLookPitch: -7, seismicObservation: 'Keep this observation.' });
    expect(lastScene.cameraMode).toBe('bank');
    expect(host.querySelector('[data-bridge-observer-hint]').textContent).toContain('moves with the ground');
    expect(host.querySelector('#bridge-walk-position')).toBeNull();
    act(() => Simulate.change(field('Look left or right (°)'), { target: { value: '20' } }));
    act(() => Simulate.change(field('Look up or down (°)'), { target: { value: '-12' } }));
    click('Switch to deck viewpoint');
    expect(lastScene.cameraMode).toBe('deck');
    expect(state.bridgeWalkPos).toBe(0.64);
    expect(field('Look left or right (°)').value).toBe('32');
    expect(field('Look up or down (°)').value).toBe('-7');
    click('Switch to riverbank viewpoint');
    expect(lastScene.bankYaw).toBe(20);
    expect(lastScene.bankPitch).toBe(-12);
    expect(state.seismicTime).toBe(8);
    expect(document.activeElement).toBe(host.querySelector('[aria-describedby="bridge-gl-description"]'));
  });

  it('supports bank keyboard controls and presets without changing the saved deck position', () => {
    mount({ bridgeView: 'immersive', bridgeObserver: 'bank', bridgeWalkPos: 0.72 });
    const viewer = host.querySelector('[aria-describedby="bridge-gl-description"]');
    act(() => Simulate.keyDown(viewer, { key: 'ArrowUp' }));
    act(() => Simulate.keyDown(viewer, { key: 'ArrowRight' }));
    expect(state).toMatchObject({ bridgeBankPitch: 5, bridgeBankYaw: 8, bridgeWalkPos: 0.72 });
    act(() => Simulate.keyDown(viewer, { key: 'Home' }));
    expect(state).toMatchObject({ bridgeBankPitch: 0, bridgeBankYaw: 0, bridgeWalkPos: 0.72 });
    click('Look along the bank');
    expect(state.bridgeBankYaw).toBe(90);
    expect(button('Look along the bank').getAttribute('aria-pressed')).toBe('true');
    click('Run earthquake');
    click('Face the bridge');
    expect(state).toMatchObject({ bridgeBankYaw: 0, bridgeBankPitch: 0, seismicPlaying: false });
    click('Look along the bank');
    click('Reset viewpoint');
    expect(state.bridgeBankYaw).toBe(0);
    expect(document.activeElement).toBe(viewer);
  });

  it('keeps bank A/B comparisons at one time with unchanged measurements and no automatic playback', () => {
    media.change(true);
    mount({ bridgeView: 'immersive', bridgeObserver: 'bank', seismicGuideOpen: true, seismicMotionGuide: true });
    click('Prepare 5% / 20% comparison');
    patch({ seismicTime: 8 });
    const b = lastScene.quake.deckM;
    const sig = lastScene.sig;
    click('A · reference');
    const a = lastScene.quake.deckM;
    expect(a).not.toBe(b);
    expect(lastScene.cameraMode).toBe('bank');
    click('Switch to deck viewpoint');
    expect(lastScene.quake.deckM).toBe(a);
    expect(state.seismicSceneTrial).toBe('reference');
    expect(state.seismicTime).toBe(8);
    click('Switch to riverbank viewpoint');
    expect(lastScene.quake.deckM).toBe(a);
    click('B · current');
    expect(lastScene.quake.deckM).toBe(b);
    expect(lastScene.sig).toBe(sig);
    expect(state.seismicPlaying).toBe(false);
    expect(button('Replay scene').disabled).toBe(true);
  });

  it('normalizes bank settings and retains them through viewer loss and deliberate recovery', () => {
    mount({ bridgeView: 'immersive', bridgeObserver: 'bank', bridgeBankYaw: 999, bridgeBankPitch: -999 });
    expect(lastScene.bankYaw).toBe(180);
    expect(lastScene.bankPitch).toBe(-60);
    viewerStatus = 'failed';
    act(() => viewerListener('failed'));
    expect(state.bridgeView).toBe('2d');
    expect(button('From the riverbank').disabled).toBe(true);
    expect(host.querySelector('[data-bridge-observer-switch]')).toBeNull();
    viewerStatus = 'ready';
    act(() => viewerListener('ready'));
    expect(state.bridgeView).toBe('2d');
    click('From the riverbank');
    expect(lastScene.cameraMode).toBe('bank');
    expect(lastScene.bankYaw).toBe(180);
    patch({ bridgeObserver: 'invalid' });
    expect(lastScene.cameraMode).toBe('deck');
  });

  it('tracks signed ground and deck motion against rest, preserving time and current inputs', () => {
    mount({ seismicTime: 7.2, seismicMotionGuide: 'true' });
    expect(lastScene.motionGuide).toBe(false);
    expect(host.querySelector('[data-motion-frame]')).toBeNull();
    patch({ seismicMotionGuide: true });
    expect(lastScene.motionGuide).toBe(true);
    const frame = () => host.querySelector('[data-motion-frame]');
    const reading = key => Number(host.querySelector('[data-motion-reading="' + key + '"]').dataset.motionValueM);
    expect(frame().dataset.motionFrame).toBe('7.2');
    expect(reading('ground')).toBe(lastScene.quake.groundM);
    expect(reading('deck')).toBe(lastScene.quake.deckM);
    expect(reading('deck') - reading('ground')).toBeCloseTo(reading('relative'), 10);
    const range = frame().dataset.motionRangeM;
    const sig = lastScene.sig;
    patch({ seismicTime: 24 });
    expect(frame().dataset.motionRangeM).toBe(range);
    expect(frame().dataset.motionFrame).toBe('24');
    expect(lastScene.sig).toBe(sig);
    patch({ seismicMotionGuide: false });
    expect(host.querySelector('[data-motion-frame]')).toBeNull();
    expect(lastScene.motionGuide).toBe(false);
    expect(state.seismicTime).toBe(24);
  });

  it('uses the selected A/B motion and a common full-event range for both scenes', () => {
    mount({ seismicMotionGuide: true, seismicGuideOpen: true });
    click('Prepare 5% / 20% comparison');
    patch({ seismicTime: 8 });
    const frame = () => host.querySelector('[data-motion-frame]');
    const range = frame().dataset.motionRangeM;
    const b = host.querySelector('[data-motion-reading="deck"]').dataset.motionValueM;
    click('A · reference');
    expect(frame().dataset.motionTrial).toBe('reference');
    expect(frame().dataset.motionRangeM).toBe(range);
    expect(Number(host.querySelector('[data-motion-reading="deck"]').dataset.motionValueM)).toBe(lastScene.quake.deckM);
    expect(host.querySelector('[data-motion-reading="deck"]').dataset.motionValueM).not.toBe(b);
    click('B · current');
    expect(frame().dataset.motionTrial).toBe('current');
    expect(frame().dataset.motionRangeM).toBe(range);
    expect(host.querySelector('[data-motion-reading="deck"]').dataset.motionValueM).toBe(b);
    expect(state.seismicTime).toBe(8);
    expect(state.seismicDampingRatio).toBe(0.2);
  });

  it('keeps a finite, readable motion guide with zero shaking, reduced motion, and a failed viewer', () => {
    media.change(true);
    mount({ seismicMotionGuide: true, seismicIntensityG: 0, seismicTime: 12 });
    expect([...host.querySelectorAll('[data-motion-reading]')].every(node => node.textContent.endsWith('0.00 cm'))).toBe(true);
    expect(Number(host.querySelector('[data-motion-frame]').dataset.motionRangeM)).toBeGreaterThan(0);
    const readings = host.querySelector('[data-motion-frame]').textContent;
    patch({ bridgeView: '2d' });
    expect(host.querySelector('[data-bridge-motion-guide="scene"]')).toBeNull();
    expect(host.querySelector('[data-bridge-motion-guide="fallback"]')).toBeTruthy();
    expect(host.querySelector('[data-motion-frame]').textContent).toContain('Current experiment');
    click('Step forward 0.5 s');
    expect(host.querySelector('[data-motion-frame]').dataset.motionFrame).toBe('12.5');
    expect(state.seismicPlaying).not.toBe(true);
    patch({ bridgeView: 'immersive' });
    viewerStatus = 'failed';
    act(() => viewerListener('failed'));
    expect(host.querySelector('[data-bridge-motion-guide="fallback"]')).toBeTruthy();
    expect(host.querySelectorAll('[data-motion-frame]')).toHaveLength(1);
    patch({ seismicEnabled: false });
    expect(host.querySelector('[data-bridge-motion-guide]')).toBeNull();
  });

  it('prepares a controlled damping pair without overwriting existing trials, notes, or static inputs', () => {
    const trials = [{ version: 'unsupported-future', notes: 'Keep this record.' }];
    mount({ seismicGuideOpen: true, seismicFrequencyHz: 0.8, seismicIntensityG: 0.15, seismicArchetype: 'flexible',
      seismicPrediction: 'Notebook prediction', seismicObservation: 'Notebook evidence', seismicTrials: trials,
      seismicGuidePrediction: 'More damping may reduce motion.', span: 42, seismicTime: 8 });
    click('Run earthquake');
    click('Prepare 5% / 20% comparison');
    expect(state).toMatchObject({ seismicDampingRatio: 0.2, seismicTime: 0, seismicPlaying: false, seismicSceneCompare: true,
      seismicSceneSource: 'guide', seismicSceneTrial: 'current', span: 42, seismicPrediction: 'Notebook prediction',
      seismicObservation: 'Notebook evidence', seismicGuidePrediction: 'More damping may reduce motion.' });
    expect(state.seismicTrials).toEqual(trials);
    expect(state.seismicGuideBaseline.inputs).toEqual({ archetype: 'flexible', groundFrequencyHz: 0.8, intensityG: 0.15, dampingRatio: 0.05 });
    expect(host.querySelector('[data-guide-feedback]').textContent).toContain('Damping is the only input');
    tick(500);
    expect(state.seismicTime).toBe(0);
  });

  it('switches A and B at one time and viewpoint, with paired energy scales and unchanged current inputs', () => {
    mount({ seismicGuideOpen: true, bridgeView: 'immersive', bridgeWalkPos: 0.5, bridgeLookYaw: 90, seismicSceneEnergy: true });
    click('Prepare 5% / 20% comparison');
    patch({ seismicTime: 7.2 });
    const b = lastScene.quake.deckM;
    const scale = host.querySelector('[data-bridge-scene-energy-frame]').dataset.energyLimit;
    click('Run earthquake');
    click('A · reference');
    expect(lastScene.quake.deckM).not.toBe(b);
    expect(state).toMatchObject({ seismicTime: 7.2, seismicDampingRatio: 0.2, seismicPlaying: false, bridgeWalkPos: 0.5, bridgeLookYaw: 90 });
    expect(host.querySelector('[data-bridge-scene-readout]').dataset.sceneTrial).toBe('reference');
    expect(host.querySelector('[data-bridge-scene-energy-frame]').dataset.energyLimit).toBe(scale);
    click('B · current');
    expect(lastScene.quake.deckM).toBe(b);
    expect(host.querySelector('[data-bridge-scene-energy-frame]').dataset.energyLimit).toBe(scale);
    click('A · reference');
    act(() => Simulate.change(field('Damping ratio (%)'), { target: { value: '30' } }));
    expect(state.seismicSceneTrial).toBe('current');
    click('End scene comparison');
    expect(state.seismicSceneCompare).toBe(false);
  });

  it('records paired inputs and time, marks earlier settings, and prints recalculated evidence with writing', () => {
    mount({ seismicGuideOpen: true, seismicGuidePrediction: '<script>prediction</script>', seismicGuideClaim: 'B moved less.',
      seismicGuideReasoning: 'I compared stored energy after the shaking ended.' });
    click('Prepare 5% / 20% comparison');
    click('Inspect both at 16 s');
    click('Record paired evidence');
    expect(state.seismicGuideEvidence).toMatchObject({ version: 'bridge-damping-evidence-v1', timeS: 16,
      referenceInputs: { dampingRatio: 0.05 }, currentInputs: { dampingRatio: 0.2 } });
    expect(host.querySelector('[data-guide-evidence]').dataset.guideEvidence).toBe('matching');
    const recorded = host.querySelector('[data-guide-readings="recorded"]').textContent;
    expect(host.querySelector('[data-guide-readings="recorded"] [data-guide-measure="3"] [data-guide-value="b"]').textContent).toContain('<0.001 J/kg');
    patch({ seismicFrequencyHz: 2, seismicTime: 24, seismicEnabled: false,
      seismicGuideEvidence: { ...state.seismicGuideEvidence, inventedPeak: 999999 } });
    expect(host.querySelector('[data-guide-evidence]').dataset.guideEvidence).toBe('earlier');
    expect(host.querySelector('[data-guide-feedback]').textContent).toContain('Response mode or ground motion differs');
    expect(host.querySelector('[data-guide-readings="recorded"]').textContent).toBe(recorded);
    click('Open investigation report');
    const report = host.querySelector('[data-bridge-damping-guide="print"]');
    expect(report.querySelector('[data-guide-readings="recorded"]').textContent).toBe(recorded);
    expect(report.textContent).toContain('<script>prediction</script>');
    expect(report.textContent).toContain('I compared stored energy');
    expect(report.textContent).not.toContain('999999');
    expect(report.querySelectorAll('button,input,textarea,script')).toHaveLength(0);
  });

  it('identifies zero input and identical damping without asserting a useful damping result', () => {
    mount({ seismicGuideOpen: true, seismicIntensityG: 0 });
    click('Prepare 5% / 20% comparison');
    expect(host.querySelector('[data-guide-feedback]').textContent).toContain('no shaking');
    expect(host.querySelector('[data-guide-readings="current"]').textContent).not.toMatch(/NaN|Infinity/);
    patch({ seismicIntensityG: 0.12 });
    click('Prepare 5% / 20% comparison');
    patch({ seismicDampingRatio: 0.05 });
    expect(host.querySelector('[data-guide-feedback]').textContent).toContain('Damping is also identical');
  });

  it('ignores invalid restored guide records and falls back to the current scene without starting playback', () => {
    mount({ seismicGuideOpen: true, seismicSceneCompare: true, seismicSceneSource: 'guide', seismicSceneTrial: 'reference', seismicPlaying: true,
      seismicGuideBaseline: { version: 'bridge-damping-v1', inputs: { dampingRatio: 0.05, archetype: 'constructor' } },
      seismicGuideEvidence: { version: 'bridge-damping-evidence-v1', timeS: Infinity, referenceInputs: {}, currentInputs: {} } });
    expect(host.querySelector('[data-guide-evidence]')).toBeNull();
    expect(host.querySelector('[data-bridge-scene-readout]').dataset.sceneTrial).toBe('current');
    expect(host.querySelector('[data-guide-feedback]').textContent).toContain('Prepare the pair');
    expect(state.seismicPlaying).toBe(false);
  });

  it('compares a saved scene using shared time rather than its saved time and warns of different shaking', () => {
    mount({ seismicTime: 8, seismicTrials: [{ version: 'bridge-seismic-v1', name: 'Earlier test', timeS: 1,
      inputs: { archetype: 'stiff', groundFrequencyHz: 0.8, intensityG: 0.2, dampingRatio: 0.1 } }] });
    const b = lastScene.quake.deckM;
    click('Compare saved trial in scene');
    click('A · reference');
    expect(state.seismicTime).toBe(8);
    expect(lastScene.quake.deckM).not.toBe(b);
    expect(host.querySelector('[data-bridge-scene-readout]').textContent).toContain('different ground motion');
    patch({ seismicTrials: [] });
    expect(host.querySelector('[data-bridge-scene-readout]').dataset.sceneTrial).toBe('current');
    expect(lastScene.quake.deckM).toBe(b);
  });

  it.each(['tacoma', 'millennium'])('uses deliberate qualitative steps for the %s mechanism and links to the guide', selectedCase => {
    mount({ tab: 'cases', selectedCase, flutterStep: Infinity, pedestrianStep: -200 });
    const illustration = host.querySelector('[data-bridge-dynamics]');
    expect(illustration.querySelector('[data-dynamics-step]').dataset.dynamicsStep).toBe('0');
    expect(illustration.textContent).toContain('do not predict wind speed, crowd limits');
    expect(illustration.querySelectorAll('input[type="range"],style')).toHaveLength(0);
    const steps = illustration.querySelectorAll('[role="group"] button');
    act(() => steps[2].click());
    expect(illustration.querySelector('[data-dynamics-step]').dataset.dynamicsStep).toBe('2');
    expect(steps[2].getAttribute('aria-pressed')).toBe('true');
    expect(illustration.textContent).not.toMatch(/STRUCTURE FAILING|Critical:|at any wind speed/);
    click('Investigate damping and energy');
    expect(state).toMatchObject({ tab: 'build', seismicEnabled: true, seismicGuideOpen: true, seismicPlaying: false });
  });

  it('selects deliberate viewpoints, pauses motion, preserves evidence, and returns focus to the scene', () => {
    mount({ bridgeView: 'immersive', seismicTime: 8, seismicObservation: 'Keep my evidence.' });
    click('Run earthquake');
    click('River overlook');
    expect(state).toMatchObject({ bridgeWalkPos: 0.5, bridgeLookYaw: 90, bridgeLookPitch: -8,
      seismicTime: 8, seismicPlaying: false, seismicObservation: 'Keep my evidence.' });
    expect(button('River overlook').getAttribute('aria-pressed')).toBe('true');
    expect(document.activeElement.getAttribute('aria-describedby')).toBe('bridge-gl-description');
    tick(300);
    expect(state.seismicTime).toBe(8);
    click('Look back toward entrance');
    expect(state).toMatchObject({ bridgeWalkPos: 0.85, bridgeLookYaw: 180, bridgeLookPitch: 0 });
    expect(button('River overlook').getAttribute('aria-pressed')).toBe('false');
    expect(button('Look back toward entrance').getAttribute('aria-pressed')).toBe('true');
    const drive = [...host.querySelectorAll('button')].find(node => node.textContent.includes('Auto-Drive Vehicle'));
    act(() => drive.click());
    expect(state.autoDriving).toBe(true);
    click('Along the deck');
    expect(state).toMatchObject({ bridgeWalkPos: 0.12, bridgeLookYaw: 0, bridgeLookPitch: 0, autoDriving: false });
    patch({ bridgeLookYaw: 1 });
    expect(button('Along the deck').getAttribute('aria-pressed')).toBe('false');
    act(() => media.change(true));
    click('River overlook');
    expect(state.bridgeLookYaw).toBe(90);
    expect(state.seismicPlaying).toBe(false);
  });

  it('uses fixed energy proportions in the scene and updates the shaking phase at 16 seconds', () => {
    mount({ bridgeView: 'immersive', seismicSceneEnergy: true, seismicTime: 7.2 });
    const frame = () => host.querySelector('[data-bridge-scene-energy-frame]');
    const parts = () => [...host.querySelectorAll('[data-scene-energy-part]')];
    const limit = Number(frame().dataset.energyLimit);
    expect(limit).toBeGreaterThan(0);
    expect(host.querySelector('[data-bridge-scene-readout]').getAttribute('aria-live')).toBe('off');
    expect(host.querySelector('[data-bridge-scene-phase]').dataset.bridgeScenePhase).toBe('shaking');
    for (const part of parts()) expect(parseFloat(part.style.width)).toBeCloseTo(Number(part.dataset.energyValue) / limit * 100, 8);
    const dissipated = Number(parts()[2].dataset.energyValue);
    patch({ seismicTime: 16 });
    expect(host.querySelector('[data-bridge-scene-phase]').dataset.bridgeScenePhase).toBe('free');
    expect(frame().dataset.bridgeSceneEnergyFrame).toBe('16');
    expect(Number(frame().dataset.energyLimit)).toBe(limit);
    expect(Number(parts()[2].dataset.energyValue)).toBeGreaterThan(dissipated);
    patch({ seismicTime: 24 });
    expect(Number(frame().dataset.energyLimit)).toBe(limit);
    expect(parts().reduce((total, part) => total + parseFloat(part.style.width), 0)).toBeLessThanOrEqual(100);
    patch({ seismicIntensityG: 0 });
    expect(parts().every(part => part.style.width === '0%')).toBe(true);
    expect(frame().textContent).not.toMatch(/NaN|Infinity|undefined/);
    patch({ seismicSceneEnergy: false });
    expect(frame()).toBeNull();
    expect(host.querySelector('[data-bridge-scene-energy]').open).toBe(false);
  });

  it('runs a complete frequency scan only on request and inspects the selected peak in the scene', () => {
    mount({ seismicScanOpen: true, seismicScanMeasure: 'constructor', seismicTime: 6, seismicFrequencyHz: 2,
      seismicPrediction: 'I predict a peak near the natural frequency.', seismicTrialName: 'Frequency evidence' });
    tick(100);
    expect(host.querySelector('[data-seismic-scan-status]').dataset.seismicScanStatus).toBe('idle');
    expect(host.querySelector('[data-seismic-scan-results]')).toBeNull();
    click('Run earthquake');
    click('Run frequency scan');
    expect(state.seismicPlaying).toBe(false);
    tick(1000);
    expect(host.querySelector('[data-seismic-scan-status]').dataset.seismicScanStatus).toBe('complete');
    expect(host.querySelector('[data-seismic-scan-curve]').getAttribute('points').split(' ')).toHaveLength(57);
    expect(field('Frequency scan measure').value).toBe('relative');
    click('Select largest response');
    const slider = host.querySelector('[aria-label="Select scanned frequency (Hz)"]');
    const selected = Number(slider.getAttribute('aria-valuenow'));
    expect(selected).toBeGreaterThanOrEqual(1);
    expect(selected).toBeLessThanOrEqual(1.2);
    expect(state).toMatchObject({ seismicTime: 6, seismicFrequencyHz: 2 });
    click('Inspect this frequency');
    expect(state).toMatchObject({ seismicFrequencyHz: selected, seismicPlaying: false,
      seismicPrediction: 'I predict a peak near the natural frequency.' });
    expect(state.seismicTime).toBeGreaterThan(0);
    expect(state.seismicTime).toBeLessThan(24);
    expect(document.activeElement.getAttribute('aria-describedby')).toBe('bridge-gl-description');
    click('Save earthquake trial');
    expect(state.seismicTrials[0].inputs.groundFrequencyHz).toBe(selected);
    expect(host.querySelector('[data-seismic-scan-results]')).not.toBeNull();
    act(() => Simulate.keyDown(slider, { key: 'End', preventDefault() {} }));
    expect(button('Next frequency').disabled).toBe(true);
    act(() => Simulate.keyDown(slider, { key: 'Home', preventDefault() {} }));
    expect(button('Previous frequency').disabled).toBe(true);
    act(() => Simulate.keyDown(slider, { key: 'PageUp', preventDefault() {} }));
    expect(slider.getAttribute('aria-valuenow')).toBe('0.45');
    act(() => Simulate.change(field('Frequency scan measure'), { target: { value: 'acceleration' } }));
    expect(slider.getAttribute('aria-valuetext')).toContain(' g');
    click('Select largest response');
    const accelerationPeak = Number(slider.getAttribute('aria-valuenow'));
    click('Inspect this frequency');
    expect(state.seismicFrequencyHz).toBe(accelerationPeak);
    expect(state.seismicPlaying).toBe(false);
  });

  it('cancels partial scans and discards stale work when the response settings change', () => {
    mount({ seismicScanOpen: true });
    click('Run frequency scan');
    tick(3);
    expect(host.querySelector('progress').value).toBeGreaterThan(0);
    click('Cancel frequency scan');
    expect(document.activeElement).toBe(host.querySelector('[data-bridge-seismic-scan]'));
    tick(1000);
    expect(host.querySelector('[data-seismic-scan-status]').dataset.seismicScanStatus).toBe('cancelled');
    expect(host.querySelector('[data-seismic-scan-results]')).toBeNull();
    click('Run frequency scan');
    tick(3);
    patch({ seismicDampingRatio: 0.2 });
    tick(1000);
    expect(host.querySelector('[data-seismic-scan-status]').dataset.seismicScanStatus).toBe('stale');
    expect(host.querySelector('[data-seismic-scan-results]')).toBeNull();
    expect(button('Run frequency scan').disabled).toBe(false);
  });

  it('keeps a completed scan across replay and static design changes but hides it for changed physical inputs', () => {
    mount({ seismicScanOpen: true });
    click('Run frequency scan');
    tick(1000);
    const curve = host.querySelector('[data-seismic-scan-curve]').getAttribute('points');
    patch({ seismicTime: 20, seismicFrequencyHz: 2, seismicReplaySpeed: 0.25, span: 44, seismicObservation: 'Keep writing' });
    expect(host.querySelector('[data-seismic-scan-curve]').getAttribute('points')).toBe(curve);
    for (const settings of [{ seismicIntensityG: 0.3 }, { seismicArchetype: 'stiff' }]) {
      patch(settings);
      expect(host.querySelector('[data-seismic-scan-status]').dataset.seismicScanStatus).toBe('stale');
      expect(host.querySelector('[data-seismic-scan-results]')).toBeNull();
    }
    expect(state.seismicObservation).toBe('Keep writing');
  });

  it.each([{ seismicScanOpen: false }, { tab: 'forces' }, { seismicEnabled: false }])('cancels pending frequency work when leaving its context: %j', change => {
    mount({ seismicScanOpen: true });
    click('Run frequency scan');
    tick(3);
    patch(change);
    tick(1000);
    patch({ seismicScanOpen: true, seismicEnabled: true, tab: 'build' });
    expect(host.querySelector('[data-seismic-scan-status]').dataset.seismicScanStatus).toBe('cancelled');
    expect(host.querySelector('[data-seismic-scan-results]')).toBeNull();
  });

  it('cancels hidden and unmounted scan timers without resuming automatically', () => {
    mount({ seismicScanOpen: true });
    click('Run frequency scan');
    act(() => { hidden = true; document.dispatchEvent(new Event('visibilitychange')); });
    tick(1000);
    act(() => { hidden = false; document.dispatchEvent(new Event('visibilitychange')); });
    expect(host.querySelector('[data-seismic-scan-status]').dataset.seismicScanStatus).toBe('cancelled');
    click('Run frequency scan');
    act(() => root.unmount());
    root = null;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('supports deliberate zero-input investigation in the 2D reduced-motion view', () => {
    mount({ seismicScanOpen: true, seismicIntensityG: 0, bridgeView: '2d' });
    act(() => media.change(true));
    click('Run frequency scan');
    tick(1000);
    expect(host.querySelector('[data-seismic-scan-results]').textContent).toContain('All responses are zero');
    expect(button('Select largest response').disabled).toBe(true);
    expect(host.querySelector('[data-seismic-scan-curve]').getAttribute('points')).not.toMatch(/NaN|Infinity/);
    click('Next frequency');
    click('Inspect this frequency');
    expect(state.seismicTime).toBe(0);
    expect(state.seismicPlaying).toBe(false);
    expect(document.activeElement).toBe(host.querySelector('[data-bridge-elevation]'));
  });

  it('selects any saved reference without changing the current experiment or student notes', () => {
    mount({ seismicTrialName: 'Original', seismicTime: 3 });
    click('Save earthquake trial');
    click('Try 20% damping');
    patch({ seismicTrialName: 'Damped', seismicTime: 12 });
    click('Save earthquake trial');
    patch({ seismicDampingRatio: 0.1, seismicTime: 6, seismicObservation: 'Current writing' });
    click('Run earthquake');
    act(() => Simulate.change(field('Earthquake reference trial'), { target: { value: '1' } }));
    expect(state).toMatchObject({ seismicReferenceIndex: 1, seismicDampingRatio: 0.1, seismicTime: 6,
      seismicPlaying: false, seismicObservation: 'Current writing' });
    expect(host.querySelector('[data-seismic-trial-comparison]').textContent).toContain('Reference: Damped');
    click('Compare on timeline');
    expect(document.activeElement).toBe(host.querySelector('[data-seismic-chart-slider]'));
    expect(field('Timeline reference trial').value).toBe('1');
    act(() => Simulate.change(field('Timeline reference trial'), { target: { value: '0' } }));
    expect(field('Earthquake reference trial').value).toBe('0');
    expect(state.seismicTime).toBe(6);
  });

  it('overlays trials at the current time without shifting by the saved inspection time', () => {
    mount({ seismicTime: 1 });
    click('Save earthquake trial');
    click('Try 20% damping');
    patch({ seismicTime: 10 });
    click('Compare on timeline');
    const frame = () => host.querySelector('[data-seismic-compare-frame]');
    const values = () => [...frame().children].map(node => parseFloat(node.textContent.split(': ')[1]));
    expect(frame().getAttribute('data-seismic-compare-frame')).toBe('10');
    expect(Math.abs(values()[0])).toBeGreaterThan(Math.abs(values()[1]) * 2);
    const history = host.querySelector('[data-seismic-comparison-curves] polyline').getAttribute('points');
    patch({ seismicTime: 16 });
    expect(frame().getAttribute('data-seismic-compare-frame')).toBe('16');
    expect(host.querySelector('[data-seismic-comparison-curves] polyline').getAttribute('points')).toBe(history);
    act(() => Simulate.change(field('Comparison measure'), { target: { value: 'stored' } }));
    expect(frame().textContent).toContain('J/kg');
    expect(values().every(value => value >= 0)).toBe(true);
    expect(state.seismicTrials[0].timeS).toBe(1);
  });

  it('retains reference identity when earlier records are removed and recovers when the reference is deleted', () => {
    const unsupported = { version: 'future', notes: 'Preserve me.' };
    mount({ seismicTrials: [unsupported], seismicReferenceIndex: 99, seismicCompareMeasure: 'constructor', seismicTimeline: 'comparison' });
    expect(button('Compare trials').disabled).toBe(true);
    expect(button('Energy over time').getAttribute('aria-pressed')).toBe('true');
    for (const name of ['First', 'Second', 'Third']) {
      patch({ seismicTrialName: name });
      click('Save earthquake trial');
    }
    act(() => Simulate.change(field('Earthquake reference trial'), { target: { value: '2' } }));
    click('Compare on timeline');
    expect(field('Comparison measure').value).toBe('relative');
    click('Remove earthquake trial 1: First');
    expect(state.seismicReferenceIndex).toBe(1);
    expect(host.querySelector('[data-seismic-trial-comparison]').textContent).toContain('Reference: Third');
    click('Remove earthquake trial 2: Third');
    expect(state.seismicReferenceIndex).toBe(0);
    expect(host.querySelector('[data-seismic-trial-comparison]').textContent).toContain('Reference: Second');
    click('Remove earthquake trial 1: Second');
    expect(state.seismicTimeline).toBe('energy');
    expect(button('Compare trials').disabled).toBe(true);
    expect(document.activeElement.id).toBe('bridge-seismic-notebook');
    expect(state.seismicTrials).toEqual([unsupported]);
  });

  it('matches only the reference ground motion and keeps the chosen response and notes', () => {
    mount({ seismicFrequencyHz: 0.65, seismicIntensityG: 0.1, seismicTrialName: 'Ground input' });
    click('Save earthquake trial');
    patch({ seismicFrequencyHz: 2, seismicIntensityG: 0.3, seismicArchetype: 'stiff', seismicDampingRatio: 0.2,
      seismicTime: 9, seismicPrediction: 'Keep this prediction', span: 44 });
    expect(host.querySelector('[data-seismic-trial-comparison]').textContent).toContain('The ground motion differs');
    click('Run earthquake');
    click('Use reference shaking');
    expect(state).toMatchObject({ seismicFrequencyHz: 0.65, seismicIntensityG: 0.1, seismicArchetype: 'stiff', seismicDampingRatio: 0.2,
      seismicTime: 0, seismicPlaying: false, span: 44, seismicPrediction: 'Keep this prediction' });
    expect(host.querySelector('[data-seismic-trial-comparison]').textContent).toContain('Both trials use the same ground motion');
    expect(host.querySelector('[data-seismic-trial-comparison]').textContent).toContain('Several settings changed');
  });

  it('reports absolute changes without an invalid percentage when the reference has zero input', () => {
    mount({ seismicIntensityG: 0 });
    click('Save earthquake trial');
    const comparison = () => host.querySelector('[data-seismic-trial-comparison]');
    expect(comparison().textContent).toContain('No percentage: reference is near zero.');
    expect(comparison().querySelector('tbody tr').lastElementChild.querySelector('[data-seismic-cell-value]').textContent).toBe('0.000 cm');
    patch({ seismicFrequencyHz: 2 });
    expect(comparison().textContent).toContain('Both trials use the same ground motion.');
    patch({ seismicIntensityG: 0.12 });
    expect(comparison().textContent).toContain('No percentage: reference is near zero.');
    expect(comparison().textContent).not.toMatch(/NaN|Infinity|undefined/);
    const change = comparison().querySelector('tbody tr').lastElementChild;
    expect(parseFloat(change.querySelector('[data-seismic-cell-value]').textContent)).toBeGreaterThan(0);
  });

  it('prints the selected reference and current settings with the same comparison values even when disabled', () => {
    mount({ seismicTrialName: 'First' });
    click('Save earthquake trial');
    click('Try 20% damping');
    patch({ seismicTrialName: '<b>Second</b>' });
    click('Save earthquake trial');
    act(() => Simulate.change(field('Earthquake reference trial'), { target: { value: '1' } }));
    patch({ seismicDampingRatio: 0.1 });
    const table = host.querySelector('[data-seismic-trial-comparison] table').textContent;
    patch({ seismicEnabled: false, tab: 'print' });
    const report = host.querySelector('[data-bridge-print-seismic]');
    expect(report.querySelector('[data-seismic-trial-comparison] table').textContent).toBe(table);
    expect(report.textContent).toContain('Reference: <b>Second</b>');
    expect(report.textContent).toContain('10% damping');
    expect(report.querySelectorAll('button,input,select,textarea,b')).toHaveLength(0);
  });

  it('runs quarter-speed replay without rounding drift and changes speed without changing the response', () => {
    mount();
    const history = host.querySelector('[data-seismic-energy-area="elastic"]').getAttribute('points');
    act(() => Simulate.change(field('Replay speed'), { target: { value: '0.25' } }));
    click('Run earthquake');
    tick(4000);
    expect(state.seismicTime).toBe(1);
    expect(field('Scene replay speed').value).toBe('0.25');
    act(() => Simulate.change(field('Scene replay speed'), { target: { value: '0.5' } }));
    tick(1000);
    expect(state.seismicTime).toBe(1.5);
    expect(state.seismicPlaying).toBe(true);
    expect(host.querySelector('[data-seismic-energy-area="elastic"]').getAttribute('points')).toBe(history);
    patch({ seismicTime: 23.975, seismicReplaySpeed: 0.25 });
    tick(100);
    expect(state.seismicTime).toBe(24);
    expect(state.seismicPlaying).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('offers shared replay controls in the scene and pauses both views when scrubbing', () => {
    mount({ bridgeView: 'immersive', seismicTime: 5 });
    click('Replay scene');
    tick(100);
    expect(button('Pause earthquake').getAttribute('aria-pressed')).toBe('true');
    click('Pause scene replay');
    expect(state.seismicTime).toBe(5.1);
    click('Replay scene');
    act(() => Simulate.change(field('Scene replay time (s)'), { target: { value: '12.5' } }));
    expect(state).toMatchObject({ seismicTime: 12.5, seismicPlaying: false, autoDriving: false });
    expect(field('Experiment time (s)').value).toBe('12.5');
    expect(host.querySelector('[data-seismic-time-cursor]').getAttribute('data-seismic-time-cursor')).toBe('12.5');
    act(() => media.change(true));
    expect(button('Replay scene').disabled).toBe(true);
    expect(field('Scene replay time (s)').disabled).toBe(false);
  });

  it('inspects the timeline with keyboard controls and keeps energy and motion at the same time', () => {
    mount({ seismicTime: 3 });
    click('Run earthquake');
    const slider = host.querySelector('[data-seismic-chart-slider]');
    function press(key) { act(() => Simulate.keyDown(slider, { key })); }
    press('PageUp');
    expect(state).toMatchObject({ seismicTime: 4, seismicPlaying: false });
    press('ArrowLeft');
    expect(state.seismicTime).toBe(3.95);
    press('End');
    expect(state.seismicTime).toBe(24);
    press('ArrowRight');
    expect(state.seismicTime).toBe(24);
    expect(slider.getAttribute('aria-valuetext')).toContain('Free vibration');
    click('Motion over time');
    expect(host.querySelector('[data-bridge-seismic-timeline]').getAttribute('data-bridge-seismic-timeline')).toBe('motion');
    expect(state.seismicTime).toBe(24);
    press('Home');
    press('ArrowDown');
    expect(state.seismicTime).toBe(0);
    expect(slider.getAttribute('aria-valuenow')).toBe('0');
    expect(host.querySelector('[data-seismic-input-power]').textContent).toContain('No input work');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('maps pointer scrubbing to bounded model time and stops dragging after capture is released', () => {
    mount();
    const slider = host.querySelector('[data-seismic-chart-slider]');
    let captured = false;
    slider.getBoundingClientRect = () => ({ left: 100, width: 240 });
    slider.setPointerCapture = () => { captured = true; };
    slider.hasPointerCapture = () => captured;
    slider.releasePointerCapture = () => { captured = false; };
    function pointer(type, clientX, extra = {}) { act(() => Simulate[type](slider, { pointerId: 1, button: 0, isPrimary: true, clientX, ...extra })); }
    pointer('pointerDown', 220);
    expect(state.seismicTime).toBe(12);
    expect(document.activeElement).toBe(slider);
    pointer('pointerMove', 400);
    expect(state.seismicTime).toBe(24);
    pointer('pointerUp', 50);
    expect(state.seismicTime).toBe(0);
    pointer('pointerMove', 220);
    pointer('pointerDown', 220, { button: 2 });
    expect(state.seismicTime).toBe(0);
  });

  it('normalizes restored replay options and refreshes history only when physical settings change', () => {
    mount({ seismicReplaySpeed: 'invalid', seismicTimeline: 'invalid', seismicTime: 16 });
    expect(field('Replay speed').value).toBe('1');
    expect(button('Energy over time').getAttribute('aria-pressed')).toBe('true');
    const history = () => host.querySelector('[data-seismic-energy-area="elastic"]').getAttribute('points');
    const initial = history();
    expect(host.querySelector('[data-seismic-input-power]').textContent).toContain('No input work');
    patch({ seismicTime: 8 });
    expect(history()).toBe(initial);
    click('Try 20% damping');
    expect(history()).not.toBe(initial);
    patch({ seismicIntensityG: 0 });
    expect(host.querySelector('[data-bridge-seismic-timeline]').textContent).not.toMatch(/NaN|Infinity|undefined/);
  });

  it('inspects peak frames without motion and synchronizes the ground/deck diagram in 2D', () => {
    mount({ bridgeView: '2d', seismicTime: 3 });
    click('Inspect peak motion');
    expect(state.seismicPlaying).toBe(false);
    expect(state.seismicTime).toBeGreaterThan(3);
    const diagram = host.querySelector('[data-seismic-diagram]');
    const deck = Number(diagram.querySelector('[data-seismic-deck-x]').getAttribute('data-seismic-deck-x'));
    const ground = Number(diagram.querySelector('[data-seismic-ground-x]').getAttribute('data-seismic-ground-x'));
    expect(Math.abs(deck - ground)).toBeGreaterThan(20);
    click('Inspect peak acceleration');
    expect(state.seismicPlaying).toBe(false);
    click('Inspect end of shaking');
    expect(state.seismicTime).toBe(16);
    expect(host.querySelector('[data-bridge-seismic-readout]').textContent).toContain('Free vibration');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('saves compact earthquake evidence through labelled fields and restores a paused experiment', () => {
    mount({ seismicTime: 7.2, seismicDampingRatio: 0.03 });
    act(() => Simulate.change(field('Earthquake trial name'), { target: { value: 'Resonance trial' } }));
    act(() => Simulate.change(field('Earthquake prediction'), { target: { value: 'The deck will build up motion.' } }));
    act(() => Simulate.change(field('Earthquake observation and explanation'), { target: { value: 'Energy remains when the ground stops.' } }));
    click('Run earthquake');
    click('Save earthquake trial');
    expect(state.seismicPlaying).toBe(false);
    expect(state.seismicTrials).toHaveLength(1);
    const saved = state.seismicTrials[0];
    expect(saved).toMatchObject({ version: 'bridge-seismic-v1', name: 'Resonance trial', timeS: 7.2,
      inputs: { archetype: 'balanced', groundFrequencyHz: 1.1, intensityG: 0.12, dampingRatio: 0.03 },
      prediction: 'The deck will build up motion.', observation: 'Energy remains when the ground stops.' });
    expect(saved).not.toHaveProperty('samples');
    expect(saved).not.toHaveProperty('peaks');
    patch({ seismicTime: 1, seismicDampingRatio: 0.3, seismicFrequencyHz: 2, seismicPrediction: 'Changed', bridgeView: '2d' });
    click('Restore earthquake trial 1: Resonance trial');
    expect(state).toMatchObject({ seismicTime: 7.2, seismicDampingRatio: 0.03, seismicFrequencyHz: 1.1,
      seismicPlaying: false, autoDriving: false, bridgeView: '2d', seismicPrediction: saved.prediction });
  });

  it('compares the whole event and identifies when several settings changed', () => {
    mount();
    click('Save earthquake trial');
    click('Try 20% damping');
    const comparison = () => host.querySelector('[data-seismic-trial-comparison]');
    expect(comparison().textContent).toContain('Changed settings: Damping ratio (%)');
    expect(comparison().textContent).not.toContain('Several settings changed');
    const motion = [...comparison().querySelectorAll('tbody tr')][0];
    expect(parseFloat(motion.children[2].querySelector('[data-seismic-cell-value]').textContent)).toBeLessThan(parseFloat(motion.children[1].querySelector('[data-seismic-cell-value]').textContent));
    const before = comparison().textContent;
    patch({ seismicTime: 12 });
    expect(comparison().textContent).toBe(before);
    patch({ seismicIntensityG: 0.2 });
    expect(comparison().textContent).toContain('Several settings changed');
  });

  it('limits displayed trials, preserves unsupported records, and keeps focus when one is removed', () => {
    const future = { version: 'future', notes: 'Keep this imported record.' };
    mount({ seismicTrials: [future] });
    for (let index = 0; index < 4; index++) click('Save earthquake trial');
    expect(button('Save earthquake trial').disabled).toBe(true);
    expect(state.seismicTrials).toHaveLength(5);
    expect(host.querySelectorAll('[data-seismic-trial]')).toHaveLength(4);
    click('Remove earthquake trial 2: Trial 2');
    expect(document.activeElement.id).toBe('bridge-seismic-notebook');
    expect(button('Save earthquake trial').disabled).toBe(false);
    expect(state.seismicTrials[0]).toEqual(future);
  });

  it('prints saved evidence and unsaved writing safely even with the earthquake disabled', () => {
    mount({ seismicTime: 7.2, seismicPrediction: '<script>prediction</script>', seismicObservation: 'Observed decay.' });
    click('Save earthquake trial');
    patch({ seismicEnabled: false, seismicObservation: 'A later unsaved observation.', tab: 'print' });
    const report = host.querySelector('[data-bridge-print-seismic]');
    expect(report.textContent).toContain('<script>prediction</script>');
    expect(report.querySelector('script')).toBeNull();
    expect(report.textContent).toContain('Observed decay.');
    expect(report.textContent).toContain('A later unsaved observation.');
    expect(report.textContent).toContain('7.20 s');
    expect(report.textContent).toContain('J/kg');
    expect(report.querySelectorAll('button,input,textarea')).toHaveLength(0);
    expect(report.textContent).not.toMatch(/NaN|Infinity|undefined/);
  });

  it('rejects corrupt trial inputs and recalculates results instead of trusting imported answers', () => {
    mount({ seismicTrials: [null, { version: 'future' }, {
      version: 'bridge-seismic-v1', inputs: { archetype: 'balanced', groundFrequencyHz: 1.1, intensityG: 0, dampingRatio: 0.05 },
      name: 'Zero input', timeS: 5, peaks: { relativeM: 999 }
    }] });
    expect(host.querySelectorAll('[data-seismic-trial]')).toHaveLength(1);
    const trial = host.querySelector('[data-seismic-trial]');
    expect(trial.textContent).toContain('Peak relative motion: 0.00 cm');
    expect(trial.textContent).not.toContain('999');
    expect(trial.textContent).not.toMatch(/NaN|Infinity|undefined/);
  });

  it('enters and leaves the on-bridge view with bounded, labelled viewpoint controls', () => {
    mount({ bridgeWalkPos: 5, bridgeLookYaw: -999, bridgeLookPitch: 99 });
    click('On the bridge');
    expect(state.bridgeView).toBe('immersive');
    expect(button('On the bridge').getAttribute('aria-pressed')).toBe('true');
    expect(Number(field('Position on bridge (%)').value)).toBe(97);
    expect(Number(field('Look left or right (°)').value)).toBe(-180);
    expect(Number(field('Look up or down (°)').value)).toBe(60);
    click('Reset viewpoint');
    expect(state).toMatchObject({ bridgeWalkPos: 0.12, bridgeLookYaw: 0, bridgeLookPitch: 0 });
    click('3D structure');
    expect(state.bridgeView).toBe('3d');
  });

  it('requires an explicit start, pauses in place, and stops at the finite event end', () => {
    mount({ seismicPlaying: true, seismicTime: 5 });
    expect(state.seismicPlaying).toBe(false);
    tick(200);
    expect(state.seismicTime).toBe(5);
    click('Run earthquake');
    tick(200);
    expect(state.seismicTime).toBeCloseTo(5.2);
    click('Pause earthquake');
    const paused = state.seismicTime;
    tick(200);
    expect(state.seismicTime).toBe(paused);
    patch({ seismicTime: 23.9 });
    click('Run earthquake');
    tick(200);
    expect(state.seismicTime).toBe(24);
    expect(state.seismicPlaying).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    click('Restart experiment');
    expect(state.seismicTime).toBe(0);
    expect(state.seismicPlaying).toBe(false);
  });

  it('keeps vehicle and earthquake playback mutually exclusive', () => {
    mount();
    const drive = [...host.querySelectorAll('button')].find(node => node.textContent.includes('Auto-Drive Vehicle'));
    act(() => drive.click());
    tick(120);
    expect(state.autoDriving).toBe(true);
    click('Run earthquake');
    expect(state.autoDriving).toBe(false);
    expect(state.seismicPlaying).toBe(true);
    const vehiclePosition = state.vehiclePos;
    tick(200);
    expect(state.vehiclePos).toBe(vehiclePosition);
    const startDrive = [...host.querySelectorAll('button')].find(node => node.textContent.includes('Auto-Drive Vehicle'));
    act(() => startDrive.click());
    expect(state.seismicPlaying).toBe(false);
    expect(state.autoDriving).toBe(true);
    const seismicTime = state.seismicTime;
    tick(240);
    expect(state.seismicTime).toBe(seismicTime);
  });

  it('pauses on 2D selection, tab exit, document hiding, and WebGL failure without resuming silently', () => {
    mount();
    click('Run earthquake');
    tick(100);
    click('Labelled 2D view');
    expect(state.seismicPlaying).toBe(false);
    click('3D structure');
    click('Run earthquake');
    patch({ tab: 'forces' });
    expect(state.seismicPlaying).toBe(false);
    patch({ tab: 'build' });
    click('Run earthquake');
    hidden = true;
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(state.seismicPlaying).toBe(false);
    const paused = state.seismicTime;
    hidden = false;
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    tick(100);
    expect(state.seismicTime).toBe(paused);
    click('Run earthquake');
    act(() => { viewerStatus = 'failed'; viewerListener?.('failed'); });
    expect(state).toMatchObject({ seismicPlaying: false, bridgeView: '2d' });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('offers deliberate time steps under reduced motion and stops existing motion when the preference changes', () => {
    mount();
    click('Run earthquake');
    tick(100);
    act(() => media.change(true));
    expect(state.seismicPlaying).toBe(false);
    const paused = state.seismicTime;
    click('Step forward 0.5 s');
    expect(state.seismicTime).toBeCloseTo(paused + 0.5);
    tick(1000);
    expect(state.seismicTime).toBeCloseTo(paused + 0.5);
    expect(vi.getTimerCount()).toBe(0);
    patch({ seismicTime: 23.8 });
    click('Step forward 0.5 s');
    expect(state.seismicTime).toBe(24);
  });

  it('keeps the static member analysis and saved crossing evidence unchanged by the earthquake experiment', () => {
    mount({ seismicEnabled: false });
    click('Test all positions');
    const inspectorBefore = host.querySelector('[data-bridge-inspector]').textContent;
    const sweepBefore = state.vehicleSweep;
    patch({ seismicEnabled: true, seismicTime: 8, seismicArchetype: 'flexible', seismicFrequencyHz: 0.65,
      seismicIntensityG: 0.4, seismicDampingRatio: 0.2, bridgeView: 'immersive', bridgeWalkPos: 0.7 });
    expect(host.querySelector('[data-bridge-inspector]').textContent).toBe(inspectorBefore);
    expect(state.vehicleSweep).toBe(sweepBefore);
    expect(host.querySelector('[data-bridge-sweep]').textContent).toContain('Lowest safety factor across the crossing');
    expect(host.querySelector('[data-bridge-sweep]').textContent).not.toContain('The design changed');
    expect(host.querySelector('[data-bridge-energy]').textContent).toContain('J/kg');
    expect(host.querySelector('[data-bridge-seismic]').textContent).toMatch(/separate|does not change|unchanged/i);
  });

  it('renders finite energy and comparison evidence for zero input and malformed restored controls', () => {
    mount({ seismicTime: Infinity, seismicFrequencyHz: 'bad', seismicIntensityG: 0, seismicDampingRatio: -5,
      seismicArchetype: 'unknown' });
    expect(Number(field('Experiment time (s)').value)).toBe(0);
    expect(Number(field('Ground shaking frequency (Hz)').value)).toBe(1.1);
    expect(Number(field('Damping ratio (%)').value)).toBe(0);
    const panel = host.querySelector('[data-bridge-seismic]');
    expect(panel.textContent).not.toMatch(/NaN|Infinity|undefined/);
    expect(host.querySelectorAll('[data-bridge-seismic-comparison] tbody tr')).toHaveLength(3);
  });

  it('releases quake timers and media listeners on unmount', () => {
    mount();
    click('Run earthquake');
    tick(100);
    expect(state.seismicPlaying).toBe(true);
    act(() => root.unmount());
    root = null;
    expect(vi.getTimerCount()).toBe(0);
    expect(media.removeEventListener).toHaveBeenCalled();
  });
});
