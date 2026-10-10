import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync(process.env.DINO_CAMERA_INPUT_SOURCE || 'stem_lab/stem_tool_dinolab.js', 'utf8').replace(/\r\n/g, '\n');
function bounded(text, start, end) {
  const a = text.indexOf(start), b = text.indexOf(end, a + start.length);
  if (a < 0 || b <= a || text.indexOf(start, a + start.length) >= 0) throw Error('Missing or ambiguous camera input seam: ' + start);
  return text.slice(a, b);
}
const engine = bounded(source, '  function makeDinoVoxelDig3D(React) {', '  var DinoVoxelDig3DStable = null;');
const modes = bounded(engine, '        function viewKey(p)', '        function cameraPose');
const input = bounded(engine, '// DINO_VOXEL_CAMERA_INPUT_STATE_START', '// DINO_VOXEL_CAMERA_INPUT_ENGINE_END');
const saves = bounded(engine, '        function savePose()', '        function poseValue');
const poseValue = bounded(engine, '        function poseValue', '        function pick(event)');
const events = bounded(engine, '// DINO_VOXEL_CAMERA_INPUT_EVENTS_START', '// DINO_VOXEL_CAMERA_INPUT_EVENTS_END');
const targetSync = bounded(engine, '          var currentView = viewKey(p)', '          var sectionRow =');
const poseSync = bounded(engine, '          var poseKey = JSON.stringify', '          showSelection(hover >= 0 ? hover : p.focus); invalidate();');
const summaryModel = bounded(source, '// DINO_VOXEL_CAMERA_MODEL_START', '// DINO_VOXEL_CAMERA_MODEL_END');
const cameraUI = bounded(source, '// DINO_VOXEL_CAMERA_UI_START', '// DINO_VOXEL_CAMERA_UI_END');

// Native EventTarget exercises the actual listener closures. Pointer capture emits
// real lostpointercapture events synchronously to stress recursive release safety.
function fixture({ view = 'full', camera = 'oblique', pose: initialPose, captureThrows = false, documentMode = 'owned' } = {}) {
  const canvas = new EventTarget(), documentTarget = new EventTarget(), captures = new Set(), callbacks = new Map(), timers = new Map();
  if (documentMode === 'owned') canvas.ownerDocument = documentTarget;
  else if (documentMode === 'partial') canvas.ownerDocument = { addEventListener() { throw Error('Partial document must not be used'); } };
  const calls = { excavate: [], select: [], writes: [], summaries: [], picks: [], invalidate: 0, release: [], prevented: [], nativeClicks: 0 };
  let nextTimer = 1, clock = 0;
  canvas.style = {}; canvas.clientHeight = 400;
  canvas.focus = () => canvas.dispatchEvent(new Event('focus'));
  canvas.setPointerCapture = id => { if (captureThrows) throw Error('Capture unavailable'); captures.add(id); };
  canvas.hasPointerCapture = id => captures.has(id);
  canvas.releasePointerCapture = id => { captures.delete(id); calls.release.push(id); emit('lostpointercapture', { pointerId: id }); };
  const p = { site: { seed: 42 }, state: { depths: Array(24).fill(0), contacts: Array(24).fill(false) },
    focus: 7, inspect: view === 'section', findMode: view === 'find', camera, cameraReset: 0,
    fullCameraReset: 0, sectionCameraReset: 0, findCameraReset: 0, pose: initialPose || null,
    onExcavate(index) { calls.excavate.push(index); }, onSelect(index) { calls.select.push(index); } };
  const latest = { current: p };
  function callbackFor(bank) { return value => calls.writes.push({ bank, value: { ...value } }); }
  p.onPose = callbackFor(view);
  const api = new Function('canvas', 'latest', 'calls', 'callbacks', 'setTimeout', 'clearTimeout',
    'var alive=true,contextLost=false,poseTimer=0,pendingPose=null,pointer=null,hover=-1,lastView=null,lastFocus=null,lastSeed=null,lastObservation=null,lastPose=null,pose={yaw:.72,pitch:.70,zoom:1};\n' +
    // A detached jsdom EventTarget has no ownerDocument for passive-default probing.
    'var cleanups=[],listenerRecords=[];function listen(target,type,callback,options){const opts=options||{passive:false};callbacks.set(target===canvas?type:"document:"+type,callback);target.addEventListener(type,callback,opts);const record={target,type,live:true};listenerRecords.push(record);cleanups.push(()=>{target.removeEventListener(type,callback,opts);record.live=false;});}' +
    'function pick(event){calls.picks.push(event.index);return event.index==null?null:event.index;}' +
    'function showSelection(index){}function toolTargetIndex(p,index){return index>=0?index:p.focus;}' +
    'function resetToolTarget(){hover=-1;}function invalidate(){calls.invalidate++;}' +
    'function publishSummary(summary){calls.summaries.push({...summary});}\n' +
    summaryModel + '\n' + modes + '\n' + input + '\n' + saves + '\n' + poseValue + '\n' + events + '\n' +
    'function sync(p){p=p||latest.current;if(lastSeed!==p.site.seed)lastPose=null;' + targetSync + poseSync + 'lastSeed=p.site.seed;}\n' +
    'return {cameraCommand,queuePoseSave,flushPoseSave,cancelPointerGesture,' +
    'sync,' +
    'setPose(value){pose={...value};},state(){return {pose:{...pose},pointer,secondPointer,pinch,pendingPose,poseTimer};},' +
    'clickState(){return canceledTouchClicks.map(record=>({...record}));},documentListenerCount(){return listenerRecords.filter(record=>record.target!==canvas&&record.live).length;},' +
    'lose(){cancelPointerGesture(false);contextLost=true;},dispose(){alive=false;cancelPointerGesture(false);clearCanceledTouchClicks();if(poseTimer)clearTimeout(poseTimer);cleanups.forEach(cleanup=>cleanup());}};')(
      canvas, latest, calls, callbacks,
      (callback, delay) => { const id = nextTimer++; timers.set(id, { callback, delay, at: clock + delay }); return id; },
      id => timers.delete(id));
  api.sync(); calls.summaries.length = 0;
  documentTarget.addEventListener('click', () => calls.nativeClicks++, { passive: false });
  function eventFor(type, fields = {}) {
    const event = new Event(type, { cancelable: true });
    const defaults = { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 0, clientY: 0, index: 7 };
    for (const [key, value] of Object.entries({ ...defaults, ...fields })) Object.defineProperty(event, key, { value, configurable: true });
    return event;
  }
  function emitDocument(type, fields = {}) { const event = eventFor(type, fields); documentTarget.dispatchEvent(event); return event; }
  function emit(type, fields = {}) {
    const event = eventFor(type, fields);
    if (['pointerdown', 'pointerup', 'pointercancel'].includes(type)) documentTarget.dispatchEvent(event);
    canvas.dispatchEvent(event); if (event.defaultPrevented) calls.prevented.push(type); return event;
  }
  return { api, p, calls, captures, timers, canvas, emit, emitDocument,
    // A unit fixture cannot manufacture isTrusted on Event; invoke the actual captured
    // closure with explicit trusted metadata. The browser flow supplies native events.
    documentDownMetadata(event) { const callback = callbacks.get('document:pointerdown'); expect(callback).toBeTruthy(); callback(event); },
    advance(duration) { clock += duration; for (;;) { const next = [...timers].filter(([, task]) => task.at <= clock).sort((a, b) => a[1].at - b[1].at)[0]; if (!next) break; timers.delete(next[0]); next[1].callback(); } },
    flush() { const tasks = [...timers.values()]; timers.clear(); tasks.forEach(task => task.callback()); },
    switchView(view) { p.inspect = view === 'section'; p.findMode = view === 'find'; p.pose = null; p.onPose = callbackFor(view); api.sync(); } };
}
const touch = (pointerId, clientX, clientY = 0) => ({ pointerId, pointerType: 'touch', clientX, clientY });
function orbit(f) { f.emit('pointerdown'); f.emit('pointermove', { clientX: 20 }); }
function pinch(f, releaseFirst = 2) {
  f.emit('pointerdown', touch(1, 0)); f.emit('pointerdown', touch(2, 100)); f.emit('pointermove', touch(1, -20));
  f.emit('pointerup', touch(releaseFirst, releaseFirst === 1 ? -20 : 100));
  f.emit('pointerup', touch(releaseFirst === 1 ? 2 : 1, releaseFirst === 1 ? 100 : -20));
}

describe('Dino native camera pointer input', () => {
  it('repicks an ordinary tap once while keeping Section and Find selection semantics', () => {
    for (const view of ['full', 'section', 'find']) {
      const f = fixture({ view }); f.emit('pointerdown', { index: 7 }); f.emit('pointerup', { index: 8 });
      expect(f.calls.picks).toEqual([7, 8]); expect(f.calls.excavate).toEqual(view === 'full' ? [8] : []);
      expect(f.calls.select).toEqual(view === 'full' ? [] : [8]); expect(f.captures.size).toBe(0); expect(f.calls.writes).toEqual([]);
    }
  });
  it('preserves the five-pixel Manhattan tap boundary and rejects a far release without pointermove', () => {
    const f = fixture(); f.emit('pointerdown'); f.emit('pointermove', { clientX: 3, clientY: 2 }); f.emit('pointerup', { clientX: 3, clientY: 2 });
    expect(f.calls.excavate).toEqual([7]);
    const g = fixture(); g.emit('pointerdown'); g.emit('pointerup', { clientX: 6 }); expect(g.calls.excavate).toEqual([]); expect(g.calls.writes).toEqual([]);
  });
  it('saves an actual orbit once and never turns its release into excavation', () => {
    const f = fixture(); orbit(f); expect(f.calls.summaries).toEqual([]); f.emit('pointerup', { clientX: 20 });
    expect(f.calls.excavate).toEqual([]); expect(f.calls.writes).toHaveLength(1); expect(f.calls.summaries).toHaveLength(1);
    expect(f.api.state().pose.yaw).toBeCloseTo(.56, 12); expect(f.captures.size).toBe(0);
  });
  it('zooms a two-touch gesture with either release order and never excavates', () => {
    for (const first of [1, 2]) { const f = fixture(); pinch(f, first);
      expect(f.api.state().pose).toEqual({ yaw: .72, pitch: .70, zoom: 1.2 }); expect(f.calls.excavate).toEqual([]);
      expect(f.calls.select).toEqual([]); expect(f.calls.writes).toHaveLength(1); expect(f.captures.size).toBe(0);
    }
  });
  it('never excavates even an unmoved two-touch contact', () => {
    const f = fixture(); f.emit('pointerdown', touch(1, 0)); f.emit('pointerdown', touch(2, 100));
    f.emit('pointerup', touch(2, 100)); f.emit('pointerup', touch(1, 0)); expect(f.calls.excavate).toEqual([]); expect(f.calls.writes).toEqual([]);
  });
  it('uses the initial pinch distance and actual initial zoom rather than compounding moves', () => {
    const f = fixture(); f.api.setPose({ yaw: .4, pitch: .6, zoom: .8 });
    f.emit('pointerdown', touch(1, 0)); f.emit('pointerdown', touch(2, 100)); f.emit('pointermove', touch(2, 150));
    expect(f.api.state().pose.zoom).toBeCloseTo(1.2, 12); f.emit('pointermove', touch(2, 125)); expect(f.api.state().pose.zoom).toBe(1);
    expect(f.api.state().pose.yaw).toBe(.4); expect(f.api.state().pose.pitch).toBe(.6);
  });
  it('clamps pinch zoom at fitted-view limits', () => {
    const f = fixture(); f.emit('pointerdown', touch(1, 0)); f.emit('pointerdown', touch(2, 100));
    f.emit('pointermove', touch(2, 1000)); expect(f.api.state().pose.zoom).toBe(1.8);
    f.emit('pointermove', touch(2, 1)); expect(f.api.state().pose.zoom).toBe(.65);
  });
  it('establishes a safe pinch baseline for overlapping initial touches', () => {
    const f = fixture(); f.emit('pointerdown', touch(1, 0)); f.emit('pointerdown', touch(2, 0));
    f.emit('pointermove', touch(2, 100)); expect(f.api.state().pose.zoom).toBe(1);
    f.emit('pointermove', touch(2, 120)); expect(f.api.state().pose.zoom).toBe(1.2);
  });
  it('ignores third touches and unrelated move, release or cancel events', () => {
    const f = fixture(); f.emit('pointerdown', touch(1, 0)); f.emit('pointerdown', touch(2, 100));
    const before = JSON.stringify(f.api.state().pose); f.emit('pointerdown', touch(3, 200)); f.emit('pointermove', touch(3, 300)); f.emit('pointerup', touch(3, 300)); f.emit('pointercancel', touch(3, 300));
    expect(JSON.stringify(f.api.state().pose)).toBe(before); expect([...f.captures]).toEqual([1, 2]); expect(f.calls.excavate).toEqual([]);
  });
  it('does not replace an active mouse with another pointer or secondary press', () => {
    const f = fixture(); f.emit('pointerdown'); f.emit('pointerdown', { pointerId: 2 }); f.emit('pointerdown', { pointerId: 3, button: 2 });
    expect(f.api.state().pointer.id).toBe(1); expect([...f.captures]).toEqual([1]); expect(f.calls.picks).toEqual([7]);
  });
  it('keeps the remaining finger in navigation mode after one pinch contact ends', () => {
    const f = fixture(); f.emit('pointerdown', touch(1, 0)); f.emit('pointerdown', touch(2, 100)); f.emit('pointerup', touch(1, 0));
    f.emit('pointermove', touch(2, 110)); f.emit('pointerup', touch(2, 110)); expect(f.api.state().pose.yaw).toBeCloseTo(.64, 12);
    expect(f.calls.excavate).toEqual([]); expect(f.calls.writes).toHaveLength(1);
  });
  it('treats cancel, lost capture and blur as cancellation with one settled navigation save', () => {
    for (const type of ['pointercancel', 'lostpointercapture', 'blur']) { const f = fixture(); orbit(f); f.emit(type); f.emit('pointerup');
      expect(f.api.state().pointer).toBe(null); expect(f.calls.excavate).toEqual([]); expect(f.calls.writes).toHaveLength(1); expect(f.captures.size).toBe(0);
    }
  });
  it('cannot orbit on button-free hover after actual lost capture and outside release', () => {
    const f = fixture(); orbit(f); f.canvas.releasePointerCapture(1); const pose = f.api.state().pose;
    f.emit('pointerup', { clientX: 500 }); f.emit('pointermove', { clientX: 700, buttons: 0 });
    expect(f.api.state().pose).toEqual(pose); expect(f.calls.excavate).toEqual([]); expect(f.calls.writes).toHaveLength(1);
  });
  it('cancels both pinch captures without recursive duplicate save', () => {
    const f = fixture(); f.emit('pointerdown', touch(1, 0)); f.emit('pointerdown', touch(2, 100)); f.emit('pointermove', touch(2, 120));
    f.emit('pointercancel', touch(2, 120)); expect(f.calls.writes).toHaveLength(1); expect(f.calls.release).toEqual([1, 2]); expect(f.captures.size).toBe(0);
  });
  it('tolerates capture APIs throwing without converting drag into a tap', () => {
    const f = fixture({ captureThrows: true }); orbit(f); f.emit('pointerup', { clientX: 20 }); expect(f.calls.excavate).toEqual([]); expect(f.calls.writes).toHaveLength(1);
  });
  it('ignores malformed pointer coordinates and keeps touch hover from choosing a tool target', () => {
    const f = fixture(); f.emit('pointerdown', { clientX: NaN }); f.emit('pointermove', touch(2, 100)); expect(f.api.state().pointer).toBe(null); expect(f.calls.picks).toEqual([]);
  });
  it('suppresses Enter and Space excavation while a pointer gesture is active', () => {
    const f = fixture(); f.emit('pointerdown'); f.emit('keydown', { key: 'Enter' }); f.emit('keydown', { key: ' ' }); expect(f.calls.excavate).toEqual([]);
    f.emit('pointercancel'); f.emit('keydown', { key: 'Enter' }); expect(f.calls.excavate).toEqual([7]);
  });
  it('never saves a canceled gesture into a changed view bank', () => {
    const f = fixture(); orbit(f); f.switchView('section'); f.emit('pointercancel'); f.emit('pointerup');
    expect(f.calls.writes).toEqual([]); expect(f.api.state().pose).toEqual({ yaw: 0, pitch: .24, zoom: 1 }); expect(f.captures.size).toBe(0);
  });
  it('cancels gestures on changed seed, reset, full preset, focus and public observation', () => {
    const changes = [p => p.site.seed++, p => { p.fullCameraReset++; p.cameraReset++; }, p => p.camera = 'top', p => p.focus++, p => p.state.depths[0]++, p => p.state.contacts[0] = true];
    for (const change of changes) { const f = fixture(); orbit(f); change(f.p); f.api.sync(); f.emit('pointercancel'); f.emit('pointerup');
      expect(f.calls.writes).toEqual([]); expect(f.calls.excavate).toEqual([]); expect(f.captures.size).toBe(0);
    }
  });
  it('checks changed origin even if an event arrives before sync', () => {
    const f = fixture(); orbit(f); f.p.inspect = true; f.p.onPose = value => f.calls.writes.push({ bank: 'section', value }); f.emit('pointercancel');
    expect(f.calls.writes).toEqual([]); expect(f.calls.excavate).toEqual([]); expect(f.captures.size).toBe(0);
  });
  it('releases gesture captures on context loss or disposal without activation or writes', () => {
    for (const action of ['lose', 'dispose']) { const f = fixture(); orbit(f); f.api[action](); f.emit('pointerup'); f.emit('pointerdown'); f.emit('wheel', { deltaY: -100 }); f.emit('keydown', { key: 'Enter' }); f.emit('keydown', { key: '+' }); expect(f.captures.size).toBe(0); expect(f.calls.writes).toEqual([]); expect(f.calls.excavate).toEqual([]); expect(f.timers.size).toBe(0); expect(f.api.cameraCommand('zoom-in')).toBe(false); }
    expect(engine).toContain('event.preventDefault(); cancelPointerGesture(false); contextLost = true;');
    expect(engine).toContain("alive = false; if (typeof cancelPointerGesture === 'function') cancelPointerGesture(false);");
  });
});

describe('Dino wheel normalization and camera bank commands', () => {
  it('normalizes pixel, line and page magnitudes to the same proportional zoom', () => {
    for (const fields of [{ deltaY: -100, deltaMode: 0 }, { deltaY: -6.25, deltaMode: 1 }, { deltaY: -.25, deltaMode: 2 }]) {
      const f = fixture(); f.emit('wheel', fields); expect(f.api.state().pose.zoom).toBeCloseTo(1.08, 12); expect(f.calls.writes).toEqual([]); f.flush(); expect(f.calls.writes).toHaveLength(1);
    }
  });
  it('preserves wheel magnitude and caps one event without exceeding camera bounds', () => {
    const f = fixture(); f.emit('wheel', { deltaY: -1 }); expect(f.api.state().pose.zoom).toBeCloseTo(Math.pow(1.08, .01), 12);
    const g = fixture(); g.emit('wheel', { deltaY: -10000 }); expect(g.api.state().pose.zoom).toBeCloseTo(Math.pow(1.08, 2.4), 12);
    for (let i = 0; i < 20; i++) g.emit('wheel', { deltaY: -240 }); expect(g.api.state().pose.zoom).toBe(1.8);
    for (let i = 0; i < 40; i++) g.emit('wheel', { deltaY: 240 }); expect(g.api.state().pose.zoom).toBe(.65);
  });
  it('ignores zero, nonfinite, missing, nonnumeric and unknown-mode wheel events', () => {
    for (const fields of [{ deltaY: 0 }, { deltaY: NaN }, { deltaY: Infinity }, {}, { deltaY: '-100' }, { deltaY: 1, deltaMode: 3 }]) {
      const f = fixture(); const event = f.emit('wheel', fields); expect(f.api.state().pose.zoom).toBe(1); expect(f.timers.size).toBe(0); expect(event.defaultPrevented).toBe(false);
    }
  });
  it('merges orbit followed by wheel into one actual-pose save and prevents late tap', () => {
    const f = fixture(); orbit(f); f.emit('wheel', { deltaY: -100 }); f.emit('pointerup'); expect(f.calls.writes).toEqual([]); f.flush();
    expect(f.calls.writes).toHaveLength(1); expect(f.calls.writes[0].value.yaw).toBeCloseTo(.56, 12); expect(f.calls.writes[0].value.zoom).toBeCloseTo(1.08, 12); expect(f.calls.excavate).toEqual([]);
  });
  it('flushes preceding wheel navigation before a new pointer gesture can overtake it', () => {
    const f = fixture(); f.emit('wheel', { deltaY: -100 }); f.emit('pointerdown'); expect(f.calls.writes).toHaveLength(1); expect(f.timers.size).toBe(0);
    f.emit('pointermove', { clientX: 20 }); f.emit('pointerup', { clientX: 20 }); expect(f.calls.writes).toHaveLength(2); f.flush(); expect(f.calls.writes).toHaveLength(2);
  });
  it('keeps a pending wheel write in its originating bank through three-view round trips', () => {
    const f = fixture(); f.emit('wheel', { deltaY: -100 }); const full = f.api.state().pose; f.switchView('section');
    f.emit('wheel', { deltaY: 100 }); const section = f.api.state().pose; f.switchView('find');
    f.api.cameraCommand('zoom-in'); const find = f.api.state().pose; expect(f.calls.writes.map(write => write.bank)).toEqual(['full', 'section', 'find']);
    for (const [view, saved] of [['full', full], ['section', section], ['find', find]]) { f.p.inspect = view === 'section'; f.p.findMode = view === 'find'; f.p.pose = saved; f.api.sync(); expect(f.api.state().pose).toEqual(saved); }
  });
  it('discards queued wheel writes after seed, reset or full preset invalidates their origin', () => {
    for (const change of [p => p.site.seed++, p => p.fullCameraReset++, p => p.camera = 'top']) { const f = fixture(); f.emit('wheel', { deltaY: -100 }); change(f.p); f.flush(); expect(f.calls.writes).toEqual([]); expect(f.calls.summaries).toEqual([]); }
  });
  it('native zoom commands use the actual pending wheel pose and save it once', () => {
    const f = fixture(); f.emit('wheel', { deltaY: -100 }); expect(f.api.cameraCommand('zoom-in')).toBe(true); f.flush();
    expect(f.calls.writes).toHaveLength(1); expect(f.calls.writes[0].value.zoom).toBeCloseTo(1.188, 12); expect(f.calls.writes[0].bank).toBe('full'); expect(f.calls.summaries).toHaveLength(1);
  });
  it('aligns command, wheel and keyboard to latest view props before effect sync', () => {
    for (const [action, expectedZoom] of [[f => f.api.cameraCommand('zoom-in'), 1.1], [f => f.emit('wheel', { deltaY: -100 }), 1.08], [f => f.emit('keydown', { key: '+' }), 1.1]]) {
      const f = fixture(); f.api.setPose({ yaw: 2, pitch: 1.2, zoom: 1.6 }); f.p.inspect = true; f.p.onPose = value => f.calls.writes.push({ bank: 'section', value });
      action(f); f.flush(); expect(f.calls.writes).toHaveLength(1); expect(f.calls.writes[0].bank).toBe('section');
      expect(f.calls.writes[0].value.yaw).toBe(0); expect(f.calls.writes[0].value.pitch).toBe(.24); expect(f.calls.writes[0].value.zoom).toBeCloseTo(expectedZoom, 12);
    }
  });
  it('aligns reset, preset and new seed before a command and rejects obsolete queued writes', () => {
    for (const change of [p => { p.fullCameraReset++; p.cameraReset++; }, p => p.camera = 'top', p => p.site.seed++]) {
      const f = fixture(); f.emit('wheel', { deltaY: -100 }); f.api.setPose({ yaw: 2, pitch: 1.2, zoom: 1.6 }); change(f.p); f.api.cameraCommand('zoom-in'); f.flush();
      expect(f.calls.writes).toHaveLength(1); expect(f.calls.writes[0].value).toEqual({ yaw: f.p.camera === 'top' ? 0 : .72, pitch: f.p.camera === 'top' ? 1.53 : .70, zoom: 1.1 });
    }
  });
  it('does not save or publish a no-op clamped zoom command or an already reset framing', () => {
    const f = fixture(); f.api.cameraCommand('reset'); expect(f.calls.writes).toEqual([]); expect(f.calls.summaries).toEqual([]);
    f.api.setPose({ yaw: .72, pitch: .70, zoom: 1.8 }); f.api.cameraCommand('zoom-in'); expect(f.calls.writes).toEqual([]);
    f.api.setPose({ yaw: .72, pitch: .70, zoom: .65 }); f.api.cameraCommand('zoom-out'); expect(f.calls.writes).toEqual([]);
  });
  it('reset framing restores the current full preset or Section/Find defaults only', () => {
    for (const [view, camera, expected] of [['full', 'oblique', { yaw: .72, pitch: .70, zoom: 1 }], ['full', 'top', { yaw: 0, pitch: 1.53, zoom: 1 }], ['full', 'side', { yaw: .72, pitch: .20, zoom: 1 }], ['section', 'top', { yaw: 0, pitch: .24, zoom: 1 }], ['find', 'side', { yaw: .66, pitch: .62, zoom: 1 }]]) {
      const f = fixture({ view, camera }); f.api.setPose({ yaw: 3, pitch: .8, zoom: 1.6 }); f.api.cameraCommand('reset');
      expect(f.api.state().pose).toEqual(expected); expect(f.calls.writes).toEqual([{ bank: view, value: expected }]); expect(f.p.camera).toBe(camera); expect(f.p.cameraReset).toBe(0);
    }
  });
  it('native commands cancel an active gesture without duplicate save or excavation', () => {
    const f = fixture(); orbit(f); f.api.cameraCommand('zoom-out'); f.emit('pointerup'); expect(f.calls.writes).toHaveLength(1); expect(f.calls.excavate).toEqual([]); expect(f.captures.size).toBe(0);
  });
  it('rejects unknown commands without changing camera, timers or simulation', () => {
    const f = fixture(), before = JSON.stringify(f.p), pose = f.api.state().pose; expect(f.api.cameraCommand('spin')).toBe(false);
    expect(f.api.state().pose).toEqual(pose); expect(JSON.stringify(f.p)).toBe(before); expect(f.calls.writes).toEqual([]);
  });
  it('publishes summary at settled changes only and never for hover or every pinch move', () => {
    const f = fixture(); f.emit('pointermove', { clientX: 4 }); f.emit('pointerdown', touch(1, 0)); f.emit('pointerdown', touch(2, 100));
    for (let i = 101; i < 120; i++) f.emit('pointermove', touch(2, i)); expect(f.calls.summaries).toEqual([]);
    f.emit('pointerup', touch(2, 119)); f.emit('pointerup', touch(1, 0)); expect(f.calls.summaries).toHaveLength(1);
    expect(f.calls.summaries[0]).toEqual({ view: 'full', orientation: 'oblique', zoomPercent: 119, canZoomIn: true, canZoomOut: true });
    f.switchView('section'); expect(f.calls.summaries[1].orientation).toBe('low'); expect(f.calls.summaries[1].view).toBe('section');
  });
  it('keeps save helper extraction valid with no camera summary bridge dependency', () => {
    const writes = [], p = { site: { seed: 42 }, camera: 'oblique', fullCameraReset: 0, onPose: value => writes.push(value) };
    const api = new Function('latest', 'setTimeout', 'clearTimeout', 'var alive=true,pose={yaw:.72,pitch:.70,zoom:1},poseTimer=0,pendingPose=null;\n' + modes + saves + '\nreturn {savePose,queuePoseSave,flushPoseSave};')({ current: p }, () => 1, () => {});
    api.savePose(); api.queuePoseSave(); api.flushPoseSave(); expect(writes).toHaveLength(2);
  });
  it('never mutates sediment, observed contacts, checkpoint records or Find evidence during navigation', () => {
    const f = fixture(); f.p.checkpoint = { baseline: { version: 1, seed: 42, columns: [{ index: 7, removed: 1, status: 'partial' }] } }; f.p.find = { coord: 'B2', exposed: true };
    const before = JSON.stringify({ site: f.p.site, state: f.p.state, checkpoint: f.p.checkpoint, find: f.p.find }); pinch(f); f.emit('wheel', { deltaY: -100 }); f.api.cameraCommand('reset');
    expect(JSON.stringify({ site: f.p.site, state: f.p.state, checkpoint: f.p.checkpoint, find: f.p.find })).toBe(before); expect(f.calls.excavate).toEqual([]); expect(f.calls.select).toEqual([]);
  });
});

function rendererTree({ theme = true, ui = true, status = 'ready', view = 'full', camera = 'oblique', pose = null } = {}) {
  const commands = [], stateUpdates = [], refs = [];
  const React = { Fragment: 'Fragment', createElement(type, props, ...children) { return { type, props: props || {}, children }; },
    useRef(value) { const ref = { current: refs.length === 3 ? { cameraCommand(command) { commands.push(command); } } : value }; refs.push(ref); return ref; },
    useState(value) { const result = typeof value === 'function' ? value() : value === 'loading' ? status : value; return [result, update => stateUpdates.push(update)]; }, useEffect() {} };
  const factory = new Function('React', 'digVoxelFindLook', summaryModel + '\n' + (ui ? cameraUI : '') + '\n' + engine + '\nreturn makeDinoVoxelDig3D(React);')(React, () => 'surface');
  const props = { site: { seed: 42 }, state: { depths: Array(24).fill(0), contacts: Array(24).fill(false), tool: 'brush' },
    focus: 0, inspect: view === 'section', findMode: view === 'find', camera, pose, preview: true,
    T: theme ? { deeper: '#111', panel: '#222', border: '#444', text: '#eee', muted: '#bbb' } : null,
    translate(_key, fallback) { return fallback; } };
  if (view === 'find') props.findMode = false; // Tree tests below use Full/Section; Find events are exercised above.
  const tree = factory(props);
  function byId(id, node = tree) { if (!node || typeof node !== 'object') return null; if (node.props?.id === id) return node;
    for (const child of node.children || []) { const found = Array.isArray(child) ? child.map(value => byId(id, value)).find(Boolean) : byId(id, child); if (found) return found; } return null; }
  return { tree, byId, commands, stateUpdates };
}
describe('Dino renderer native camera controls bridge', () => {
  it('mounts camera controls as a sibling and links both existing native hint elements', () => {
    const f = rendererTree(); expect(f.tree.type).toBe('Fragment'); expect(f.tree.children.filter(Boolean).map(child => child.props.id)).toEqual(['dino-voxel-camera-controls', 'dino-voxel-stage']);
    const canvas = f.byId('dino-voxel-canvas'), descriptions = canvas.props['aria-describedby'].split(' ');
    for (const id of ['dino-voxel-camera-touch-hint', 'dino-voxel-camera-scale-hint']) { expect(descriptions).toContain(id); expect(f.byId(id).props.id).toBe(id); }
    expect(f.byId('dino-voxel-camera-summary').props['aria-live']).toBe('off');
  });
  it('omits native hint references when theme or optional native helper is absent', () => {
    for (const options of [{ theme: false }, { ui: false }]) { const f = rendererTree(options); expect(f.tree.children[0]).toBe(null);
      expect(f.byId('dino-voxel-canvas').props['aria-describedby']).not.toContain('dino-voxel-camera-touch-hint'); expect(f.byId('dino-voxel-canvas').props['aria-describedby']).not.toContain('dino-voxel-camera-scale-hint'); }
  });
  it('routes all three native buttons through the actual engine cameraCommand bridge', () => {
    const f = rendererTree(); for (const action of ['zoom-in', 'zoom-out', 'reset']) f.byId('dino-voxel-camera-' + action).props.onClick();
    expect(f.commands).toEqual(['zoom-in', 'zoom-out', 'reset']);
  });
  it('disables camera controls while loading, failed or context-lost', () => {
    for (const status of ['loading', 'failed', 'lost']) { const f = rendererTree({ status });
      for (const action of ['zoom-in', 'zoom-out', 'reset']) { const button = f.byId('dino-voxel-camera-' + action); expect(button.props.disabled).toBe(true); button.props.onClick(); } expect(f.commands).toEqual([]); }
  });
  it('initializes the visible summary from actual full preset and Section stored pose', () => {
    const top = rendererTree({ camera: 'top' }); expect(top.byId('dino-voxel-camera-summary').props['data-dig-camera-orientation']).toBe('overhead');
    const side = rendererTree({ camera: 'side' }); expect(side.byId('dino-voxel-camera-summary').props['data-dig-camera-orientation']).toBe('low');
    const section = rendererTree({ view: 'section', pose: { yaw: 2, pitch: 1.3, zoom: 1.4 } });
    expect(section.byId('dino-voxel-camera-summary').props['data-dig-camera-view']).toBe('section'); expect(section.byId('dino-voxel-camera-summary').props['data-dig-camera-zoom']).toBe(140); expect(section.byId('dino-voxel-camera-summary').props['data-dig-camera-orientation']).toBe('overhead');
  });
});

describe('Dino canceled native touch clicks', () => {
  it('blocks only the retargeted click after a canceled canvas touch and leaves evidence unchanged', () => {
    const f = fixture(), before = JSON.stringify(f.p);
    f.emit('pointerdown', touch(3, 131, 641)); f.emit('blur');
    expect(f.api.clickState()).toMatchObject([{ id: 3, type: 'touch', ended: false, timer: 0 }]);
    f.emitDocument('pointerup', { ...touch(3, 131, 641), detail: 1 });
    const click = f.emitDocument('click', { ...touch(3, 131, 641), detail: 1 });
    expect(click.defaultPrevented).toBe(true); expect(f.calls.nativeClicks).toBe(0);
    expect(f.calls.excavate).toEqual([]); expect(f.calls.select).toEqual([]); expect(f.calls.writes).toEqual([]);
    expect(JSON.stringify(f.p)).toBe(before); expect(f.api.clickState()).toEqual([]); expect(f.timers.size).toBe(0);
    expect(f.emitDocument('click', { ...touch(3, 131, 641), detail: 1 }).defaultPrevented).toBe(false);
    expect(f.calls.nativeClicks).toBe(1);
  });
  it('preserves an ordinary canvas touch tap and its unsuppressed native click', () => {
    const f = fixture(); f.emit('pointerdown', touch(3, 10)); f.emit('pointerup', touch(3, 10));
    expect(f.calls.excavate).toEqual([7]); expect(f.api.clickState()).toEqual([]);
    expect(f.emitDocument('click', { ...touch(3, 10), detail: 1 }).defaultPrevented).toBe(false); expect(f.calls.nativeClicks).toBe(1);
  });
  it('preserves keyboard activation, unrelated IDs, pen/mouse types and zero-detail clicks', () => {
    const f = fixture(); f.emit('pointerdown', touch(3, 10)); f.emit('blur');
    for (const fields of [{ pointerId: -1, pointerType: '', detail: 0 }, { pointerId: 4, pointerType: 'touch', detail: 1 }, { pointerId: 3, pointerType: 'mouse', detail: 1 }, { pointerId: 3, pointerType: 'pen', detail: 1 }, { pointerId: 3, pointerType: 'touch', detail: 0 }]) {
      expect(f.emitDocument('click', fields).defaultPrevented).toBe(false);
    }
    expect(f.calls.nativeClicks).toBe(5); expect(f.api.clickState()).toHaveLength(1);
    expect(f.emitDocument('click', { ...touch(3, 10), detail: 1 }).defaultPrevented).toBe(true);
  });
  it('allows a fresh native-control sequence with the same pointer ID', () => {
    const f = fixture(); f.emit('pointerdown', touch(3, 10)); f.emit('blur');
    f.emitDocument('pointerdown', touch(3, 500)); f.emitDocument('pointerup', touch(3, 500));
    expect(f.api.clickState()).toEqual([]); expect(f.emitDocument('click', { ...touch(3, 500), detail: 1 }).defaultPrevented).toBe(false);
    expect(f.calls.nativeClicks).toBe(1); expect(f.calls.excavate).toEqual([]);
  });
  it('does not treat a fresh pointer of another type as reuse of a canceled touch', () => {
    const f = fixture(); f.emit('pointerdown', touch(3, 10)); f.emit('blur');
    f.emitDocument('pointerdown', { pointerId: 3, pointerType: 'pen' });
    expect(f.api.clickState()).toHaveLength(1); expect(f.emitDocument('click', { pointerId: 3, pointerType: 'pen', detail: 1 }).defaultPrevented).toBe(false);
    expect(f.emitDocument('click', { ...touch(3, 10), detail: 1 }).defaultPrevented).toBe(true);
  });
  it('arms both actual pinch contacts before reentrant lost-capture release and consumes each once', () => {
    const f = fixture(); f.emit('pointerdown', touch(3, 0)); f.emit('pointerdown', touch(4, 100)); f.emit('blur');
    expect(f.calls.release).toEqual([3, 4]); expect(f.captures.size).toBe(0);
    expect(f.api.clickState().map(record => record.id)).toEqual([3, 4]); expect(f.calls.writes).toEqual([]);
    for (const id of [4, 3]) { f.emitDocument('pointerup', touch(id, 100)); expect(f.emitDocument('click', { ...touch(id, 100), detail: 1 }).defaultPrevented).toBe(true); }
    expect(f.api.clickState()).toEqual([]); expect(f.timers.size).toBe(0); expect(f.calls.nativeClicks).toBe(0); expect(f.calls.excavate).toEqual([]);
  });
  it('expires an ended record after exactly 750 ms without imposing a global control delay', () => {
    const f = fixture(); f.emit('pointerdown', touch(3, 10)); f.emit('blur'); f.emitDocument('pointerup', touch(3, 10));
    expect(f.api.clickState()[0].ended).toBe(true); expect(f.timers.size).toBe(1);
    f.advance(749); expect(f.api.clickState()).toHaveLength(1);
    expect(f.emitDocument('click', { ...touch(4, 10), detail: 1 }).defaultPrevented).toBe(false);
    f.advance(1); expect(f.api.clickState()).toEqual([]); expect(f.timers.size).toBe(0);
    expect(f.emitDocument('click', { ...touch(3, 10), detail: 1 }).defaultPrevented).toBe(false);
  });
  it('retains a still-held canceled contact without an elapsed-time blanket suppression', () => {
    const f = fixture(); f.emit('pointerdown', touch(3, 10)); f.emit('blur'); f.advance(60000);
    expect(f.api.clickState()).toMatchObject([{ id: 3, ended: false, timer: 0 }]); expect(f.timers.size).toBe(0);
    expect(f.emitDocument('click', { ...touch(4, 10), detail: 1 }).defaultPrevented).toBe(false);
    f.emitDocument('pointerup', touch(3, 10)); expect(f.emitDocument('click', { ...touch(3, 10), detail: 1 }).defaultPrevented).toBe(true);
  });
  it('observes a native pointercancel even when cancellation first arms during canvas dispatch', () => {
    const f = fixture(); f.emit('pointerdown', touch(3, 10)); f.emit('pointercancel', touch(3, 10));
    expect(f.api.clickState()).toMatchObject([{ id: 3, ended: true }]); expect(f.timers.size).toBe(1);
    f.advance(750); expect(f.api.clickState()).toEqual([]); expect(f.calls.excavate).toEqual([]);
  });
  it('marks a stale-origin cancellation discovered during pointerup as physically ended', () => {
    const f = fixture(); f.emit('pointerdown', touch(3, 10)); f.p.focus++;
    f.emit('pointerup', touch(3, 10)); expect(f.api.clickState()).toMatchObject([{ id: 3, ended: true }]);
    expect(f.timers.size).toBe(1); expect(f.calls.excavate).toEqual([]); expect(f.calls.writes).toEqual([]);
    expect(f.emitDocument('click', { ...touch(3, 10), detail: 1 }).defaultPrevented).toBe(true); expect(f.timers.size).toBe(0);
  });
  it('protects a late native touch click after context loss without saving or excavating', () => {
    const f = fixture(); f.emit('pointerdown', touch(3, 10)); f.api.lose(); f.emitDocument('pointerup', touch(3, 10));
    expect(f.api.clickState()).toMatchObject([{ id: 3, ended: true }]);
    expect(f.emitDocument('click', { ...touch(3, 10), detail: 1 }).defaultPrevented).toBe(true);
    expect(f.calls.writes).toEqual([]); expect(f.calls.excavate).toEqual([]); expect(f.calls.nativeClicks).toBe(0); expect(f.timers.size).toBe(0);
  });
  it('disposes every guard timer and document listener without retaining canceled contacts', () => {
    const f = fixture(); f.emit('pointerdown', touch(3, 10)); f.emit('blur'); f.emitDocument('pointerup', touch(3, 10));
    expect(f.api.documentListenerCount()).toBe(4); expect(f.timers.size).toBe(1); f.api.dispose();
    expect(f.api.clickState()).toEqual([]); expect(f.api.documentListenerCount()).toBe(0); expect(f.timers.size).toBe(0);
    expect(f.emitDocument('click', { ...touch(3, 10), detail: 1 }).defaultPrevented).toBe(false); expect(f.calls.nativeClicks).toBe(1);
    f.api.dispose(); expect(f.timers.size).toBe(0); expect(f.calls.excavate).toEqual([]);
  });
  it('does not retain a fresh cancellation created by disposal itself', () => {
    const f = fixture(); f.emit('pointerdown', touch(3, 10)); f.api.dispose();
    expect(f.captures.size).toBe(0); expect(f.api.clickState()).toEqual([]); expect(f.timers.size).toBe(0); expect(f.api.documentListenerCount()).toBe(0);
  });
  it('keeps partial renderer fixtures usable without an owned document listener interface', () => {
    for (const documentMode of ['absent', 'partial']) { const f = fixture({ documentMode }); f.emit('pointerdown', touch(3, 10)); f.emit('blur');
      expect(f.api.clickState()).toEqual([]); expect(f.api.documentListenerCount()).toBe(0); expect(f.captures.size).toBe(0); expect(f.timers.size).toBe(0);
    }
  });
  it('never evicts still-held canceled contacts or restricts an unrelated native button sequence', () => {
    const f = fixture(); f.emit('pointerdown', touch(3, 0)); f.emit('pointerdown', touch(4, 100)); f.emit('blur');
    f.emit('pointerdown', touch(5, 200)); expect(f.api.state().pointer).toBe(null); expect(f.captures.size).toBe(0);
    expect(f.api.clickState().map(record => record.id)).toEqual([3, 4]);
    f.emitDocument('pointerdown', touch(5, 200)); f.emitDocument('pointerup', touch(5, 200));
    expect(f.emitDocument('click', { ...touch(5, 200), detail: 1 }).defaultPrevented).toBe(false); expect(f.calls.nativeClicks).toBe(1);
    for (const id of [3, 4]) { f.emitDocument('pointerup', touch(id, 100)); expect(f.emitDocument('click', { ...touch(id, 100), detail: 1 }).defaultPrevented).toBe(true); }
  });
  it('retires ended pinch tombstones on a fresh canvas sequence without waiting for expiry', () => {
    const f = fixture(); f.emit('pointerdown', touch(3, 0)); f.emit('pointerdown', touch(4, 100)); f.emit('blur');
    f.emitDocument('pointerup', touch(3, 0)); f.emitDocument('pointerup', touch(4, 100)); expect(f.timers.size).toBe(2);
    f.emit('pointerdown', touch(5, 10)); expect(f.api.state().pointer.id).toBe(5); expect(f.api.clickState()).toEqual([]); expect(f.timers.size).toBe(0);
    f.emit('pointerup', touch(5, 10)); expect(f.calls.excavate).toEqual([7]);
  });
  it('recovers a missing physical end only from a fresh trusted primary touch contact set', () => {
    const f = fixture(); f.emit('pointerdown', touch(3, 0)); f.emit('pointerdown', touch(4, 100)); f.emit('blur');
    for (const event of [{ pointerId: 5, pointerType: 'touch', isTrusted: false, isPrimary: true }, { pointerId: 5, pointerType: 'touch', isTrusted: true, isPrimary: false }, { pointerId: 5, pointerType: 'pen', isTrusted: true, isPrimary: true }, { pointerId: 5, pointerType: 'mouse', isTrusted: true, isPrimary: true }]) {
      f.documentDownMetadata(event); expect(f.api.clickState().map(record => record.id)).toEqual([3, 4]);
    }
    f.documentDownMetadata({ pointerId: 5, pointerType: 'touch', isTrusted: true, isPrimary: true }); expect(f.api.clickState()).toEqual([]);
    f.emit('pointerdown', touch(5, 10)); f.emit('pointerup', touch(5, 10)); expect(f.calls.excavate).toEqual([7]);
    expect(f.emitDocument('click', { ...touch(5, 10), detail: 1 }).defaultPrevented).toBe(false);
  });
  it('leaves mouse and pen cancellation behavior and click activation unchanged', () => {
    for (const pointerType of ['mouse', 'pen']) { const f = fixture(); f.emit('pointerdown', { pointerId: 3, pointerType }); f.emit('blur');
      expect(f.api.clickState()).toEqual([]); expect(f.emitDocument('click', { pointerId: 3, pointerType, detail: 1 }).defaultPrevented).toBe(false); expect(f.calls.nativeClicks).toBe(1);
    }
  });
});
