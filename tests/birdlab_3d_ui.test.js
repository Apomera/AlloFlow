import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';
import { sliceBetween } from './helpers/anchored_slice.js';

const { act } = React;
const source = readFileSync('stem_lab/stem_tool_birdlab.js', 'utf8');
const componentSource = sliceBetween(source, '  function Birdlab3DObservatory(', '  // ── Reduced motion CSS', { file: 'stem_tool_birdlab.js' });
let root, host, previousMedia;
const state = { ready: true, paused: false, camera: 'orbit', lighting: 'daylight', speed: 1, phase: 'gliding', label: 'Gliding through the clearing', altitude: 6, airspeed: 8.3, wingbeat: 0, time: 12 };

function controller() {
  return Object.fromEntries(['setStudyOverlay', 'setPaused', 'setSpeed', 'setCamera', 'setLighting', 'setRepeatFlights', 'setMode', 'setBinoculars', 'setCrouching', 'recordSighting', 'lockPointer', 'setMove', 'stepMove', 'seek', 'resetView', 'restart', 'dispose', 'getState'].map(name => [name, vi.fn()]));
}
function button(label) { return [...host.querySelectorAll('button')].find(el => el.textContent === label); }
async function mount(load, props = {}) {
  const View = new Function('loadBirdlab3D', componentSource + '\nreturn Birdlab3DObservatory;')(load);
  await act(async () => root.render(React.createElement(View, { React, onBack: vi.fn(), onMenu: vi.fn(), ...props })));
  return View;
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  previousMedia = window.matchMedia;
  window.matchMedia = vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host.remove();
  window.matchMedia = previousMedia;
  delete window.BirdLab3D;
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('BirdLab optional 3D view lifecycle', () => {
  it('offers a hawk course overlay without starting playback or recording a sighting', async () => {
    const scene=controller(); let publish;
    window.BirdLab3D={mount:vi.fn((canvas,options)=>{publish=options.onState;publish({...state,paused:true,studyOverlay:false});return scene;})};
    await mount(()=>Promise.resolve());
    expect(button('Flight study overlay').getAttribute('aria-pressed')).toBe('false');
    await act(async()=>button('Flight study overlay').click());
    expect(scene.setStudyOverlay).toHaveBeenCalledWith(true);
    await act(async()=>publish({studyOverlay:true,studyOverlayVisible:true}));
    expect(host.querySelector('[data-birdlab-3d-study-key]').textContent).toContain('illustrative course');
    expect(host.querySelector('[data-birdlab-3d-study-key]').textContent).toContain('not a force');
    await act(async()=>button('See whole route').click());
    expect(scene.setCamera).toHaveBeenCalledWith('wide');
    expect(scene.setPaused).not.toHaveBeenCalled();
    expect(scene.seek).not.toHaveBeenCalled();
    expect(scene.recordSighting).not.toHaveBeenCalled();
    await act(async()=>publish({camera:'robin',studyOverlayVisible:false}));
    expect(button('Flight study overlay')).toBeUndefined();
    expect(host.querySelector('[data-birdlab-3d-study-key]')).toBeNull();
    await act(async()=>publish({camera:'orbit',studyOverlayVisible:true}));
    expect(button('Flight study overlay').getAttribute('aria-pressed')).toBe('true');
    expect(window.BirdLab3D.mount).toHaveBeenCalledTimes(1);
  });
  it('identifies and records a mammal in the same notebook without revealing an unobserved species', async () => {
    const scene=controller(); let publish;
    const squirrel={id:'graySquirrel',category:'mammal',name:'Eastern gray squirrel',scientificName:'Sciurus carolinensis',behavior:'Handling a seed',distance:3.2,progress:.4,identified:false};
    window.BirdLab3D={mount:vi.fn((canvas,options)=>{publish=options.onState;publish({...state,mode:'free',binoculars:true,observation:squirrel,sightings:[]});return scene;})};
    await mount(()=>Promise.resolve());
    const card=host.querySelector('.birdlab-3d-observation');
    expect(card.querySelector('h2').textContent).toBe('Wildlife in view');
    expect(card.textContent).not.toContain(squirrel.name); expect(button('Record sighting').disabled).toBe(true);
    await act(async()=>publish({observation:{...squirrel,progress:1,identified:true}}));
    expect(card.textContent).toContain('Woodland mammal'); expect(card.textContent).toContain(squirrel.scientificName);
    await act(async()=>button('Record sighting').click()); expect(scene.recordSighting).toHaveBeenCalledTimes(1);
    await act(async()=>publish({sightings:[{...squirrel,time:8.5}]}));
    expect(host.querySelector('.birdlab-3d-notebook').textContent).toContain(squirrel.name);
    expect(button('Recorded in notebook').disabled).toBe(true);
  });
  it('reveals only an identified current binocular subject and clears stale details when the view changes', async () => {
    const scene=controller(); let publish;
    const jay={id:'blueJay',name:'Blue jay',scientificName:'Cyanocitta cristata',behavior:'Watching from the leaf litter',distance:4.26,progress:.3,identified:false};
    window.BirdLab3D={mount:vi.fn((canvas,options)=>{publish=options.onState;publish({...state,mode:'free',binoculars:false,wildlife:[{id:'grouse',name:'Ruffed grouse',behavior:'Hidden behind a trunk'}]});return scene;})};
    await mount(()=>Promise.resolve());
    const side=host.querySelector('aside');
    expect(side.textContent).not.toContain('Ruffed grouse');
    expect(side.textContent).not.toContain('Hidden behind a trunk');
    expect(button('Record sighting').disabled).toBe(true);
    expect(side.textContent).toContain('Raise your binoculars');
    await act(async()=>publish({binoculars:true,observation:jay}));
    expect(side.textContent).not.toContain(jay.scientificName);
    expect(side.querySelector('h2').textContent).toBe('Wildlife in view');
    expect(host.querySelector('progress').value).toBe(.3);
    expect(host.querySelector('progress').closest('[aria-live]')).toBeNull();
    expect(host.querySelector('[data-birdlab-3d-identification]').textContent).toBe('');
    expect(button('Record sighting').disabled).toBe(true);
    await act(async()=>publish({observation:{...jay,identified:true,progress:1}}));
    expect(side.querySelector('h2').textContent).toBe('Blue jay');
    expect(side.textContent).toContain(jay.scientificName);
    expect(host.querySelector('[data-birdlab-3d-observation-details]').textContent).toBe('4.3 m away · Watching from the leaf litter');
    expect(host.querySelector('.birdlab-3d-reticle').getAttribute('data-focus')).toBe('identified');
    expect(button('Record sighting').disabled).toBe(false);
    const announcement=host.querySelector('[data-birdlab-3d-identification]').textContent;
    await act(async()=>publish({observation:{...jay,identified:true,progress:1,distance:4.18,behavior:'Turning its head'}}));
    expect(host.querySelector('[data-birdlab-3d-identification]').textContent).toBe(announcement);
    await act(async()=>publish({observation:null}));
    expect(host.querySelector('[data-birdlab-3d-observation-details]')).toBeNull();
    expect(button('Record sighting').disabled).toBe(true);
    await act(async()=>publish({binoculars:false,observation:{...jay,identified:true}}));
    expect(side.querySelector('h2').textContent).toBe('Watch the woodland');
    expect(side.textContent).not.toContain(jay.scientificName);
    expect(host.querySelector('progress')).toBeNull();
    expect(button('Record sighting').disabled).toBe(true);
    expect(scene.setCamera).not.toHaveBeenCalled();
  });
  it('records identified birds only through the engine and keeps visit notes across modes and a view reset', async () => {
    const scene=controller(); let publish;
    const dove={id:'mourningDove',name:'Mourning dove',scientificName:'Zenaida macroura',behavior:'Foraging',distance:3.14,progress:1,identified:true};
    const entry={...dove,time:72.4};
    window.BirdLab3D={mount:vi.fn((canvas,options)=>{publish=options.onState;publish({...state,mode:'free',binoculars:true,observation:dove,sightings:[]});return scene;})};
    await mount(()=>Promise.resolve());
    await act(async()=>button('Record sighting').click());
    expect(scene.recordSighting).toHaveBeenCalledTimes(1);
    expect(host.querySelector('.birdlab-3d-notebook')).toBeNull();
    await act(async()=>publish({sightings:[entry]}));
    const notebook=host.querySelector('.birdlab-3d-notebook');
    expect(notebook.children).toHaveLength(1);
    expect(notebook.textContent).toContain('Mourning dove');
    expect(notebook.textContent).toContain('Zenaida macroura');
    expect(notebook.textContent).toContain('3.1 m away · 1:12 into your visit');
    expect(button('Recorded in notebook').disabled).toBe(true);
    expect(host.querySelector('[data-birdlab-3d-identification]').textContent).toContain('is in your field notebook');
    await act(async()=>button('Recorded in notebook').click());
    expect(scene.recordSighting).toHaveBeenCalledTimes(1);
    await act(async()=>button('Return to clearing').click());
    expect(scene.resetView).toHaveBeenCalledTimes(1);
    expect(notebook.children).toHaveLength(1);
    await act(async()=>publish({mode:'guided',observation:null,binoculars:false}));
    expect(host.querySelector('.birdlab-3d-notebook')).toBeNull();
    await act(async()=>publish({mode:'free'}));
    expect(host.querySelector('.birdlab-3d-notebook').children).toHaveLength(1);
    expect(host.querySelector('.birdlab-3d-notebook').textContent).toContain('Mourning dove');
    expect(scene.seek).not.toHaveBeenCalled();
    expect(scene.setCamera).not.toHaveBeenCalled();
    expect(window.BirdLab3D.mount).toHaveBeenCalledTimes(1);
  });
  it('offers crouching and binocular identification while reduced-motion birds remain paused', async () => {
    window.matchMedia=vi.fn(()=>({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()}));
    const scene=controller(); let publish;
    const robin={id:'robin',name:'American robin',scientificName:'Turdus migratorius',behavior:'Resting',distance:2.8,progress:.5,identified:false};
    window.BirdLab3D={mount:vi.fn((canvas,options)=>{publish=options.onState;publish({...state,mode:'free',paused:options.reducedMotion,binoculars:true,observation:robin});return scene;})};
    await mount(()=>Promise.resolve());
    const crouch=host.querySelector('[aria-label="Crouch · C"]');
    expect(crouch.disabled).toBe(false);
    expect(crouch.getAttribute('aria-pressed')).toBe('false');
    await act(async()=>crouch.click());
    expect(scene.setCrouching).toHaveBeenLastCalledWith(true);
    await act(async()=>publish({crouching:true}));
    expect(crouch.textContent).toBe('Stand up · C');
    expect(crouch.getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('#birdlab-3d-camera-help').textContent).toContain('C lowers your viewpoint');
    expect(host.querySelector('.birdlab-3d-observation').textContent).toContain('The woodland is paused');
    await act(async()=>publish({observation:{...robin,progress:1,identified:true}}));
    expect(button('Record sighting').disabled).toBe(false);
    await act(async()=>button('Record sighting').click());
    expect(scene.recordSighting).toHaveBeenCalledTimes(1);
    expect(scene.setPaused).not.toHaveBeenCalled();
    expect(button('Resume woodland')).toBeTruthy();
    expect(host.querySelector('[aria-label="Walk forward"]').disabled).toBe(true);
    await act(async()=>crouch.click());
    expect(scene.setCrouching).toHaveBeenLastCalledWith(false);
  });
  it('switches to first-person controls and restores guided study through the engine without remounting', async () => {
    const scene = controller(); let publish;
    const guided = {...state,mode:'guided',camera:'blueJay',paused:true,speed:.25,time:15.9};
    window.BirdLab3D = {mount:vi.fn((canvas,options)=>{publish=options.onState;publish(guided);return scene;})};
    await mount(()=>Promise.resolve());
    await act(async()=>button('Free roam').click());
    expect(scene.setMode).toHaveBeenLastCalledWith('free');
    await act(async()=>publish({mode:'free',camera:'walk',binoculars:false,time:0,speed:1}));
    expect(button('Free roam').getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('[aria-label="Flight playback speed"]')).toBeNull();
    expect(host.querySelector('input[type="range"]')).toBeNull();
    expect(host.querySelector('[aria-label="Study woodland bird behavior"]')).toBeNull();
    expect(host.querySelector('canvas').getAttribute('aria-label')).toContain('W A S D');
    expect(button('Resume woodland')).toBeTruthy();
    expect(host.querySelector('[aria-label="Walk forward"]').disabled).toBe(true);
    await act(async()=>button('Raise binoculars · B').click());
    expect(scene.setBinoculars).toHaveBeenLastCalledWith(true);
    await act(async()=>publish({binoculars:true}));
    expect(host.querySelector('.birdlab-3d-binocular-mask')).toBeTruthy();
    await act(async()=>button('Lock mouse look').click());
    expect(scene.lockPointer).toHaveBeenCalledTimes(1);
    await act(async()=>button('Guided study').click());
    expect(scene.setMode).toHaveBeenLastCalledWith('guided');
    await act(async()=>publish(guided));
    expect(Number(host.querySelector('input[type="range"]').value)).toBeCloseTo(15.9);
    expect(button('Blue jay').getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('.birdlab-3d-binocular-mask')).toBeNull();
    expect(scene.seek).not.toHaveBeenCalled(); expect(scene.setPaused).not.toHaveBeenCalled();
    expect(window.BirdLab3D.mount).toHaveBeenCalledTimes(1);
  });
  it('routes touch holds and accessible single steps, releasing movement on cancellation', async () => {
    const scene=controller();
    window.BirdLab3D={mount:vi.fn((canvas,options)=>{options.onState({...state,mode:'free',camera:'walk'});return scene;})};
    await mount(()=>Promise.resolve());
    const forward=host.querySelector('[aria-label="Walk forward"]');
    await act(async()=>forward.dispatchEvent(new Event('pointerdown',{bubbles:true,cancelable:true})));
    expect(scene.setMove).toHaveBeenLastCalledWith('forward',true);
    await act(async()=>forward.dispatchEvent(new Event('pointercancel',{bubbles:true})));
    expect(scene.setMove).toHaveBeenLastCalledWith('forward',false);
    await act(async()=>forward.click());
    expect(scene.stepMove).toHaveBeenLastCalledWith('forward');
    await act(async()=>button('Pause woodland').click());
    expect(scene.setPaused).toHaveBeenLastCalledWith(true); expect(forward.disabled).toBe(true);
  });
  it('offers an accessible repeat toggle only for the shared birds and exits it when scrubbing or returning to the hawk',async()=>{
    const scene=controller();
    window.BirdLab3D={mount:vi.fn((canvas,options)=>{options.onState({...state,paused:true});return scene;})};
    await mount(()=>Promise.resolve());expect(button('Repeat flights')).toBeUndefined();
    await act(async()=>button('Mourning dove').click());
    const repeat=button('Repeat flights');expect(repeat.getAttribute('aria-pressed')).toBe('false');
    expect(document.getElementById(repeat.getAttribute('aria-describedby')).textContent).toBe('Keeps both flights and shortens the resting pauses.');
    await act(async()=>repeat.click());expect(scene.setRepeatFlights).toHaveBeenLastCalledWith(true);
    expect(repeat.getAttribute('aria-pressed')).toBe('true');expect(button('Play flight')).toBeTruthy();
    expect(scene.setPaused).not.toHaveBeenCalled();expect(scene.setSpeed).not.toHaveBeenCalled();
    const study=host.querySelector('[aria-label="Study woodland bird behavior"]');
    await act(async()=>[...study.querySelectorAll('button')].find(el=>el.textContent==='Flight').click());
    expect(repeat.getAttribute('aria-pressed')).toBe('false');expect(scene.seek).toHaveBeenLastCalledWith(12.7);
    await act(async()=>repeat.click());await act(async()=>button('Orbit').click());
    expect(button('Repeat flights')).toBeUndefined();
    await act(async()=>button('Ruffed grouse').click());expect(button('Repeat flights').getAttribute('aria-pressed')).toBe('false');
    await act(async()=>root.unmount());root=null;expect(scene.dispose).toHaveBeenCalledTimes(1);
  });
  it.each([['mourningDove','Mourning dove',12.7],['grouse','Ruffed grouse',18.55],['blueJay','Blue jay',15.9],['northernCardinal','Northern cardinal',13.6],['darkEyedJunco','Dark-eyed junco',17.05],['tuftedTitmouse','Tufted titmouse',20.8],['easternTowhee','Eastern towhee',15.1]])('studies the shared %s without redirecting its flight controls to the hawk', async (id,label,time) => {
    const scene = controller();
    window.BirdLab3D = { mount: vi.fn((canvas, options) => { options.onState({...state,wildlife:[{id,name:label,behavior:'Foraging'}]}); return scene; }) };
    await mount(() => Promise.resolve());
    await act(async () => button(label).click());
    expect(scene.setCamera).toHaveBeenLastCalledWith(id);
    expect(host.querySelector('canvas').getAttribute('aria-label')).toContain(label.toLowerCase());
    const study = host.querySelector('[aria-label="Study woodland bird behavior"]');
    await act(async () => [...study.querySelectorAll('button')].find(el=>el.textContent==='Flight').click());
    expect(scene.seek).toHaveBeenLastCalledWith(time);
    expect(scene.setCamera).toHaveBeenCalledTimes(1);
    await act(async () => host.querySelector('[aria-label="Study a flight moment"] button').click());
    expect(scene.setCamera).toHaveBeenLastCalledWith('orbit');
  });
  it('does not create a renderer when the user leaves while scripts are loading', async () => {
    let finish;
    const load = new Promise(resolve => { finish = resolve; });
    window.BirdLab3D = { mount: vi.fn() };
    await mount(() => load);
    expect(host.textContent).toContain('Preparing your observation');
    await act(async () => root.unmount());
    root = null;
    await act(async () => finish());
    expect(window.BirdLab3D.mount).not.toHaveBeenCalled();
  });

  it('keeps one renderer across host updates, routes controls, and disposes on exit', async () => {
    const scene = controller();
    window.BirdLab3D = { mount: vi.fn((canvas, options) => { options.onState(state); return scene; }) };
    const View = await mount(() => Promise.resolve());
    await act(async () => root.render(React.createElement(View, { React, onBack: vi.fn(), onMenu: vi.fn() })));
    expect(window.BirdLab3D.mount).toHaveBeenCalledTimes(1);
    await act(async () => button('Pause flight').click());
    expect(scene.setPaused).toHaveBeenLastCalledWith(true);
    await act(async () => host.querySelector('canvas').dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true })));
    expect(scene.setPaused).toHaveBeenLastCalledWith(false);
    await act(async () => button('Follow').click());
    expect(scene.setCamera).toHaveBeenLastCalledWith('follow');
    await act(async () => { const select = host.querySelector('select'); select.value = '0.25'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(scene.setSpeed).toHaveBeenLastCalledWith(0.25);
    await act(async () => button('Restart flight').click());
    expect(scene.restart).toHaveBeenCalledTimes(1);
    await act(async () => root.unmount());
    root = null;
    expect(scene.dispose).toHaveBeenCalledTimes(1);
  });

  it('starts reduced-motion observations paused and keeps playback an explicit choice', async () => {
    window.matchMedia = vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    const scene = controller();
    window.BirdLab3D = { mount: vi.fn((canvas, options) => { options.onState({ ...state, paused: options.reducedMotion }); return scene; }) };
    await mount(() => Promise.resolve());
    expect(window.BirdLab3D.mount.mock.calls[0][1].reducedMotion).toBe(true);
    expect(button('Play flight')).toBeTruthy();
    expect(scene.setPaused).not.toHaveBeenCalled();
    await act(async () => button('Play flight').click());
    expect(scene.setPaused).toHaveBeenCalledWith(false);
  });

  it('observes woodland neighbors without replaying flight or showing hawk measurements as their own', async () => {
    const scene = controller();
    window.BirdLab3D = { mount: vi.fn((canvas, options) => { options.onState({...state,wildlife:[
      {id:'robin',behavior:'Foraging'},{id:'chickadee',behavior:'Hopping'}]}); return scene; }) };
    await mount(() => Promise.resolve());
    for(const [label,id,name,behavior] of [['Robin','robin','American robin','Foraging'],['Chickadee','chickadee','Black-capped chickadee','Hopping']]) {
      await act(async()=>button(label).click());
      expect(scene.setCamera).toHaveBeenLastCalledWith(id);
      expect(host.querySelector('h2').textContent).toBe(name);
      expect(host.querySelector('canvas').getAttribute('aria-label')).toContain(name.toLowerCase());
      expect(host.querySelector('[data-birdlab-3d-behavior]').textContent).toBe(behavior);
      expect(host.querySelector('.birdlab-3d-readouts')).toBeNull();
      expect(button(label).getAttribute('aria-pressed')).toBe('true');
    }
    expect(scene.seek).not.toHaveBeenCalled();expect(scene.restart).not.toHaveBeenCalled();
    expect(scene.setPaused).not.toHaveBeenCalled();
    await act(async()=>button('Orbit').click());
    expect(host.querySelector('h2').textContent).toBe('Red-tailed hawk');
    expect(host.querySelectorAll('[data-birdlab-3d-readout]')).toHaveLength(4);
    expect(window.BirdLab3D.mount).toHaveBeenCalledTimes(1);
  });

  it('routes each study moment to a paused point without changing the camera or speed', async () => {
    const scene = controller();
    window.BirdLab3D = { mount: vi.fn((canvas, options) => { options.onState({ ...state, camera: 'follow', speed: 0.25 }); return scene; }) };
    await mount(() => Promise.resolve());
    for (const [label, time] of [['Perch', 1], ['Takeoff', 4.2], ['Glide', 14], ['Landing', 36.8]]) {
      await act(async () => button(label).click());
      expect(scene.seek).toHaveBeenLastCalledWith(time);
      expect(button('Play flight')).toBeTruthy();
      expect(Number(host.querySelector('input[type="range"]').value)).toBeCloseTo(time);
    }
    expect(button('Follow').getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('select').value).toBe('0.25');
    expect(scene.setCamera).not.toHaveBeenCalled();
    expect(scene.setSpeed).not.toHaveBeenCalled();
    expect(scene.restart).not.toHaveBeenCalled();
  });

  it('keeps the accessible timeline in the current loop and scrubs through the engine', async () => {
    const scene = controller();
    let publish;
    window.BirdLab3D = { mount: vi.fn((canvas, options) => { publish = options.onState; options.onState({ ...state, time: 58.5 }); return scene; }) };
    await mount(() => Promise.resolve());
    const timeline = host.querySelector('input[type="range"]');
    expect(host.querySelector('label[for="' + timeline.id + '"]').textContent).toBe('Flight timeline');
    expect(timeline.max).toBe('44');
    expect(timeline.step).toBe('0.1');
    expect(Number(timeline.value)).toBe(14.5);
    expect(timeline.getAttribute('aria-valuetext')).toContain('14.5 seconds of 44 seconds');
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(timeline, '36.8');
      timeline.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(scene.seek).toHaveBeenLastCalledWith(36.8);
    expect(button('Play flight')).toBeTruthy();
    await act(async () => publish({ ...state, time: 80.8, paused: true, phase: 'landing', label: 'Reaching for the perch' }));
    expect(Number(timeline.value)).toBeCloseTo(36.8);
    expect(timeline.getAttribute('aria-valuetext')).toContain('Reaching for the perch');
    expect(button('Landing').getAttribute('aria-pressed')).toBe('true');
    await act(async () => publish({ ...state, time: 44, paused: true, phase: 'perched' }));
    expect(Number(timeline.value)).toBe(44);
    await act(async () => publish({ ...state, time: 44.1, paused: false, phase: 'perched' }));
    expect(Number(timeline.value)).toBeCloseTo(.1);
  });

  it('changes woodland lighting independently of flight playback and follows engine state', async () => {
    const scene = controller();
    let publish;
    window.BirdLab3D = { mount: vi.fn((canvas, options) => { publish = options.onState; options.onState(state); return scene; }) };
    await mount(() => Promise.resolve());
    expect(button('Daylight').getAttribute('aria-pressed')).toBe('true');
    await act(async () => button('Golden hour').click());
    expect(scene.setLighting).toHaveBeenLastCalledWith('golden');
    expect(button('Golden hour').getAttribute('aria-pressed')).toBe('true');
    expect(button('Pause flight')).toBeTruthy();
    expect(scene.setPaused).not.toHaveBeenCalled();
    expect(scene.seek).not.toHaveBeenCalled();
    await act(async () => publish({ lighting: 'daylight' }));
    expect(button('Daylight').getAttribute('aria-pressed')).toBe('true');
    expect(button('Golden hour').getAttribute('aria-pressed')).toBe('false');
  });

  it('names its controls through the host translator', async () => {
    window.BirdLab3D = { mount: vi.fn((canvas, options) => { options.onState(state); return controller(); }) };
    await mount(() => Promise.resolve(), { t: (key, fallback) => '[' + key + '] ' + fallback });
    for (const key of ['a11y_observation_mode', 'a11y_interactive_3d_woodland', 'a11y_flight_playback', 'a11y_flight_playback_speed',
      'a11y_camera_view', 'a11y_woodland_lighting', 'a11y_observe_woodland_birds', 'a11y_study_a_flight_moment']) {
      expect(host.querySelector('[aria-label^="[stem.birdlab.' + key + '] "]'), key).not.toBeNull();
    }
    expect(host.querySelector('[aria-label="Camera view"]')).toBeNull();
    // The tool passes its own translator in; without it the labels stay English.
    expect(source.includes('h(Birdlab3DObservatory, {React:React, t:__alloT,'), 'render passes __alloT').toBe(true);
  });

  it('provides a retry and a working 2D exit after a load failure', async () => {
    const onBack = vi.fn();
    let attempts = 0;
    const scene = controller();
    window.BirdLab3D = { mount: vi.fn((canvas, options) => { options.onState(state); return scene; }) };
    await mount(() => ++attempts === 1 ? Promise.reject(new Error('Offline asset unavailable')) : Promise.resolve(), { onBack });
    expect(host.querySelector('[role="alert"]').textContent).toContain('Offline asset unavailable');
    expect(host.querySelector('input[type="range"]').disabled).toBe(true);
    expect(button('Landing').disabled).toBe(true);
    expect(button('Golden hour').disabled).toBe(true);
    const previousCanvas = host.querySelector('canvas');
    await act(async () => button('Return to 2D habitats').click());
    expect(onBack).toHaveBeenCalledTimes(1);
    await act(async () => button('Retry 3D').click());
    expect(host.querySelector('canvas')).not.toBe(previousCanvas);
    expect(host.querySelector('[data-birdlab-3d-ready]').getAttribute('data-birdlab-3d-ready')).toBe('true');
    expect(attempts).toBe(2);
  });

  it('disposes a lost context and recreates a canvas for the next attempt', async () => {
    let errorHandler;
    const scene = controller();
    window.BirdLab3D = { mount: vi.fn((canvas, options) => { errorHandler = options.onError; options.onState(state); return scene; }) };
    await mount(() => Promise.resolve());
    const oldCanvas = host.querySelector('canvas');
    await act(async () => errorHandler('Graphics context was interrupted'));
    expect(scene.dispose).toHaveBeenCalled();
    expect(button('Pause flight').disabled).toBe(true);
    await act(async () => button('Retry 3D').click());
    expect(host.querySelector('canvas')).not.toBe(oldCanvas);
    expect(window.BirdLab3D.mount).toHaveBeenCalledTimes(2);
  });
});
