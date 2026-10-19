import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const sourcePath = process.env.DINO_RENDER_SCHEDULER_SOURCE
  ? path.resolve(process.env.DINO_RENDER_SCHEDULER_SOURCE)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../stem_lab/stem_tool_dinolab.js');
const source = fs.readFileSync(sourcePath, 'utf8');

// Extract and execute the production helper, with no DOM or replacement scheduler.
function extractFunction(name, sceneOnly = false) {
  const marker = new RegExp('function\\s+' + name + '\\s*\\(');
  const offset = sceneOnly ? source.indexOf('var renderRequestRef = React.useRef(null);') : 0;
  if (offset < 0) throw new Error('Missing native scene render owner');
  const match = marker.exec(source.slice(offset));
  if (!match) throw new Error('Missing source function: ' + name);
  const start = offset + match.index;
  const open = source.indexOf('{', start);
  let depth = 0;
  let quote = null;
  let comment = null;
  let escaped = false;
  for (let i = open; i < source.length; i += 1) {
    const c = source[i];
    const next = source[i + 1];
    if (comment === 'line') { if (c === '\n') comment = null; continue; }
    if (comment === 'block') { if (c === '*' && next === '/') { comment = null; i += 1; } continue; }
    if (quote) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '/' && next === '/') { comment = 'line'; i += 1; continue; }
    if (c === '/' && next === '*') { comment = 'block'; i += 1; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{') depth += 1;
    if (c === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error('Unclosed source function: ' + name);
}

const schedulerFactory = vm.runInNewContext('(' + extractFunction('dinoRenderScheduler') + ')', {});

function harness() {
  const pending = new Map();
  const callbacks = new Map();
  const scheduled = [];
  const canceled = [];
  const draws = [];
  let nextId = 0;
  let visible = true;
  let animating = false;
  let resets = 0;
  let onDraw = null;
  // Synthetic callback tags distinguish current and stale frames; the native
  // renderer owns its clock and does not receive RAF timestamps from this helper.
  let frameTag = null;
  const scheduler = schedulerFactory({
    requestFrame(callback) {
      const id = nextId++;
      pending.set(id, callback);
      callbacks.set(id, callback);
      scheduled.push(id);
      return id;
    },
    cancelFrame(id) { canceled.push(id); pending.delete(id); },
    draw() { draws.push(frameTag); if (onDraw) onDraw(scheduler, frameTag); },
    canRender() { return visible; },
    isAnimating() { return animating; },
    resetClock() { resets += 1; }
  });
  return {
    scheduler, pending, scheduled, canceled, draws,
    get resets() { return resets; },
    set visible(value) { visible = value; },
    set animating(value) { animating = value; },
    set onDraw(value) { onDraw = value; },
    run(time = 100) {
      const entry = pending.entries().next().value;
      if (!entry) throw new Error('No frame queued');
      pending.delete(entry[0]);
      frameTag = time;
      entry[1](time);
      return entry[0];
    },
    stale(id, time = 200) {
      if (!callbacks.has(id)) throw new Error('Unknown callback ticket');
      frameTag = time;
      callbacks.get(id)(time);
    }
  };
}

describe('DinoLab on-demand native render scheduler', () => {
  it('is inert until invalidation', () => {
    const h = harness();
    expect(h.pending.size).toBe(0);
    expect(h.scheduled).toEqual([]);
    expect(h.draws).toEqual([]);
  });

  it('coalesces repeated static invalidations into exactly one draw', () => {
    const h = harness();
    h.scheduler.invalidate(); h.scheduler.invalidate(); h.scheduler.invalidate();
    expect(h.scheduled).toEqual([0]);
    h.run(123);
    expect(h.draws).toEqual([123]);
    expect(h.pending.size).toBe(0);
  });

  it('redraws a static scene when it becomes dirty again', () => {
    const h = harness();
    h.scheduler.invalidate(); h.run(10);
    h.scheduler.invalidate(); h.run(20);
    expect(h.draws).toEqual([10, 20]);
    expect(h.scheduled).toEqual([0, 1]);
    expect(h.pending.size).toBe(0);
  });

  it('keeps precisely one pending frame during active animation', () => {
    const h = harness();
    h.animating = true;
    h.scheduler.invalidate();
    for (let step = 0; step < 4; step += 1) {
      h.scheduler.invalidate();
      expect(h.pending.size).toBe(1);
      h.run(step * 16);
      expect(h.pending.size).toBe(1);
    }
    expect(h.draws).toEqual([0, 16, 32, 48]);
    expect(h.scheduled).toEqual([0, 1, 2, 3, 4]);
    h.scheduler.dispose();
  });

  it('renders the final static pose and stops when animation ends', () => {
    const h = harness();
    h.animating = true;
    h.scheduler.invalidate(); h.run(10);
    h.animating = false;
    h.scheduler.invalidate(); h.run(20);
    expect(h.draws).toEqual([10, 20]);
    expect(h.pending.size).toBe(0);
  });

  it('retains hidden dirty work without scheduling a frame', () => {
    const h = harness();
    h.visible = false;
    h.scheduler.invalidate(); h.scheduler.invalidate();
    expect(h.pending.size).toBe(0);
    expect(h.draws).toEqual([]);
    expect(h.resets).toBeGreaterThan(0);
    h.visible = true;
    h.scheduler.invalidate(); h.run(1000);
    expect(h.draws).toEqual([1000]);
    expect(h.pending.size).toBe(0);
  });

  it('cancels RAF id zero and resets the animation clock when hidden', () => {
    const h = harness();
    h.animating = true;
    h.scheduler.invalidate();
    expect(h.scheduled).toEqual([0]);
    h.visible = false;
    h.scheduler.invalidate();
    expect(h.canceled).toEqual([0]);
    expect(h.pending.size).toBe(0);
    expect(h.resets).toBeGreaterThan(0);
    h.stale(0);
    expect(h.draws).toEqual([]);
  });

  it('checks visibility again inside a callback and resumes with a fresh frame', () => {
    const h = harness();
    h.scheduler.invalidate();
    h.visible = false;
    h.run(5000);
    expect(h.draws).toEqual([]);
    expect(h.pending.size).toBe(0);
    expect(h.resets).toBeGreaterThan(0);
    h.visible = true;
    h.scheduler.invalidate(); h.run(5016);
    expect(h.draws).toEqual([5016]);
  });

  it('rejects a canceled callback without clearing its newer replacement', () => {
    const h = harness();
    h.scheduler.invalidate();
    h.visible = false; h.scheduler.invalidate();
    h.visible = true; h.scheduler.invalidate();
    expect(Array.from(h.pending.keys())).toEqual([1]);
    h.stale(0, 777);
    expect(h.draws).toEqual([]);
    expect(Array.from(h.pending.keys())).toEqual([1]);
    h.run(888);
    expect(h.draws).toEqual([888]);
    expect(h.pending.size).toBe(0);
  });

  it('disposes a pending id-zero frame and ignores late callbacks or invalidation', () => {
    const h = harness();
    h.scheduler.invalidate();
    h.scheduler.dispose();
    expect(h.canceled).toEqual([0]);
    expect(h.pending.size).toBe(0);
    h.stale(0);
    h.scheduler.invalidate(); h.scheduler.dispose();
    expect(h.scheduled).toEqual([0]);
    expect(h.draws).toEqual([]);
  });

  it('can be disposed before its first invalidation', () => {
    const h = harness();
    h.scheduler.dispose(); h.scheduler.dispose(); h.scheduler.invalidate();
    expect(h.pending.size).toBe(0);
    expect(h.canceled).toEqual([]);
    expect(h.scheduled).toEqual([]);
  });

  it('preserves invalidation raised while drawing a static scene', () => {
    const h = harness();
    h.onDraw = (scheduler) => { h.onDraw = null; scheduler.invalidate(); };
    h.scheduler.invalidate(); h.run(10);
    expect(h.pending.size).toBe(1);
    h.run(20);
    expect(h.draws).toEqual([10, 20]);
    expect(h.pending.size).toBe(0);
  });

  it('does not requeue active animation when disposed from inside draw', () => {
    const h = harness();
    h.animating = true;
    h.onDraw = (scheduler) => scheduler.dispose();
    h.scheduler.invalidate(); h.run(10);
    expect(h.draws).toEqual([10]);
    expect(h.pending.size).toBe(0);
    expect(h.scheduled).toEqual([0]);
  });

  it('keeps dirty, animation, cancellation, and disposal state per scene', () => {
    const a = harness();
    const b = harness();
    a.animating = true;
    a.scheduler.invalidate(); b.scheduler.invalidate();
    a.run(10); b.run(20);
    expect(a.pending.size).toBe(1);
    expect(b.pending.size).toBe(0);
    a.scheduler.dispose();
    b.scheduler.invalidate(); b.run(30);
    expect(a.draws).toEqual([10]);
    expect(b.draws).toEqual([20, 30]);
    expect(b.pending.size).toBe(0);
  });
});

describe('DinoLab native render invalidation integration', () => {
  it('runs the actual camera, resize, visibility, context, and font invalidators with lifecycle guards', () => {
    function Vector(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    Vector.prototype.clone = function () { return new Vector(this.x, this.y, this.z); };
    Vector.prototype.applyAxisAngle = function () { return this; };
    let invalidations = 0;
    let prevented = 0;
    const state = {
      alive: true, contextLost: false, pageVisible: true,
      renderScheduler: {invalidate() { invalidations += 1; }}, renderRequestRef: {current: null},
      bodyLabelMetricKey: 'old metrics', bodyLabelContext: 'old context', previousBodyLabels: ['old layout'],
      document: {visibilityState: 'visible'},
      assemblyTray: null, cameraStudy: 'full', cameraTargetIsEvidence: false,
      partInspectionFrameRef: {current: null}, supportingRelationRef: {current: null}, selectedBodyPartRef: {current: ''},
      inspectionFrameContext: 'scheduler-test', currentCameraFrame: null,
      measurementGuides: {}, surveyDecorations: {}, evidenceDisplayParts: [],
      overviewHalf: new Vector(4, 2, 1), modelHalf: new Vector(4, 2, 1),
      overviewCenter: new Vector(), cameraTarget: new Vector(),
      THREE: {Vector3: Vector}, yaw: 0, pitch: .2, zoom: 1, len: 8,
      camera: {fov: 50, aspect: 1, position: {set() {}}, updateProjectionMatrix() {}, lookAt() {}, updateMatrixWorld() {}},
      yawRef: {current: {}}, props: {shapeStudy: null}, model: {userData: {}}, dinoFrameDistance() { return 10; }, updateCameraReadout() {},
      canvas: {clientWidth: 800, clientHeight: 400}, renderer: {setSize() {}}
    };
    const names = ['requestSceneRender', 'syncAnimation', 'updateCameraView', 'resize', 'fontMetricsChanged', 'contextWasLost', 'contextWasRestored', 'visibilityChanged'];
    const build = new Function('context', 'with(context){' + names.map(name => extractFunction(name, true)).join('\n') + '\nreturn {' + names.join(',') + '};}');
    const api = build(state);
    api.requestSceneRender();
    expect(invalidations).toBe(0);
    state.renderRequestRef.current = api.syncAnimation;
    api.requestSceneRender();
    expect(invalidations).toBe(1);
    api.updateCameraView(); api.updateCameraView(false);
    expect(invalidations).toBe(2);
    api.resize();
    expect(invalidations).toBe(3);
    expect(state.camera.aspect).toBe(2);
    api.fontMetricsChanged();
    expect(invalidations).toBe(4);
    expect(state.bodyLabelMetricKey).toBe('');
    expect(state.bodyLabelContext).toBe('');
    expect(state.previousBodyLabels).toEqual([]);
    api.contextWasLost({preventDefault() { prevented += 1; }});
    expect(state.contextLost).toBe(true);
    expect(prevented).toBe(1);
    api.contextWasRestored();
    expect(state.contextLost).toBe(false);
    expect(invalidations).toBe(6);
    state.document.visibilityState = 'hidden'; api.visibilityChanged();
    expect(state.pageVisible).toBe(false);
    state.document.visibilityState = 'visible'; api.visibilityChanged();
    expect(state.pageVisible).toBe(true);
    expect(invalidations).toBe(8);
    state.alive = false;
    state.bodyLabelMetricKey = 'disposed metrics';
    api.requestSceneRender(); api.fontMetricsChanged(); api.resize();
    expect(invalidations).toBe(8);
    expect(state.bodyLabelMetricKey).toBe('disposed metrics');
    state.renderRequestRef.current = null;
    api.requestSceneRender();
    expect(invalidations).toBe(8);
  });

  it('wires all native visual mutations, asynchronous wakeups, and disposal without a static frame feedback loop', () => {
    const scene = source.slice(source.indexOf('var renderRequestRef = React.useRef(null);'));
    const hooks = [
      'React.useEffect(function () { requestSceneRender(); });',
      'setDeviceReducedMotion(preference.matches);\n            requestSceneRender();',
      'setMotionPaused(motionPausedRef.current);\n          requestSceneRender();',
      "if (announce) setStatus(lightProfile.label + ' lighting. ' + lightProfile.description);\n                requestSceneRender();",
      "requestSceneRender();\n          if (announce && statusRef.current) statusRef.current.textContent = (nextOpacity >= 98 ?",
      "canvas.addEventListener('webglcontextlost', contextWasLost);",
      "canvas.removeEventListener('webglcontextlost', contextWasLost);",
      "canvas.addEventListener('webglcontextrestored', contextWasRestored);",
      "canvas.removeEventListener('webglcontextrestored', contextWasRestored);",
      "document.fonts.addEventListener('loadingdone', fontMetricsChanged);",
      "document.fonts.removeEventListener('loadingdone', fontMetricsChanged);",
      'document.fonts.ready.then(fontMetricsChanged);',
      "document.addEventListener('visibilitychange', visibilityChanged);",
      "document.removeEventListener('visibilitychange', visibilityChanged);",
      'inViewport = !entry || entry.isIntersecting;\n                syncAnimation();',
      'canRender: function () { return alive && !!renderer && !!scene && !!camera && !contextLost && inViewport && pageVisible; }',
      'isAnimating: function () { return !motionPausedRef.current && !reducedMotionRef.current && !props.shapeStudy; }',
      'resetClock: function () { motionClockRef.current.last = null; }',
      'renderRequestRef.current = activeRenderControl;\n            syncAnimation();',
      'alive = false;\n            if (renderScheduler) renderScheduler.dispose();',
      'if (renderRequestRef.current === activeRenderControl) renderRequestRef.current = null;'
    ];
    for (const hook of hooks) expect(scene.includes(hook)).toBe(true);
    for (const name of ['pointerMove', 'wheelZoom', 'resize']) {
      expect(extractFunction(name, true).includes('updateCameraView();')).toBe(true);
    }
    expect(extractFunction('keyDown', true).includes('requestSceneRender();')).toBe(true);
    const animate = extractFunction('animate', true);
    expect(animate.includes('updateCameraView(false);')).toBe(true);
    expect(animate.includes('renderer.render(scene, camera);')).toBe(true);
    expect(animate.includes('requestSceneRender(')).toBe(false);
    expect(animate.includes('syncAnimation(')).toBe(false);
    expect(animate.includes('requestAnimationFrame(')).toBe(false);
  });
});
