import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8').replace(/\r\n/g, '\n');
function bounded(text, start, end) {
  const a = text.indexOf(start), b = text.indexOf(end, a + start.length);
  if (a < 0 || b <= a || text.indexOf(start, a + start.length) >= 0) throw new Error('Missing or ambiguous camera helper: ' + start);
  return text.slice(a, b);
}
const modes = bounded(source, '        function viewKey(p)', '        function cameraPose()');
const saves = bounded(source, '        function savePose()', '        function poseValue(');
const resetKey = { full: 'fullCameraReset', section: 'sectionCameraReset', find: 'findCameraReset' };
function harness(view = 'full') {
  const writes = [], banks = { full: null, section: null, find: null };
  function props(mode, changes = {}) {
    return {
      site: { seed: 42 }, findMode: mode === 'find', inspect: mode === 'section',
      fullCameraReset: 0, sectionCameraReset: 0, findCameraReset: 0, camera: 'oblique',
      onPose(value) { const saved = structuredClone(value); banks[mode] = saved; writes.push({ view: mode, value: saved }); },
      ...changes
    };
  }
  const latest = { current: props(view) };
  const H = new Function('latest', 'setTimeout', 'clearTimeout',
    modes + '\nvar alive = true, poseTimer = 0, pendingPose = null, pose = {yaw: .72,pitch: .70,zoom: 1};\n' + saves +
    '\nreturn {viewKey,viewReset,savePose,flushPoseSave,queuePoseSave,' +
    'setPose(value) { pose = {yaw:value.yaw,pitch:value.pitch,zoom:value.zoom}; },' +
    'setAlive(value) { alive = value; }, pending() { return pendingPose; }};'
  )(latest, globalThis.setTimeout, globalThis.clearTimeout);
  return { H, latest, props, writes, banks };
}
const wheelPose = { yaw: .72, pitch: .70, zoom: 1.08 };
const newerPose = { yaw: 1.12, pitch: .91, zoom: 1.28 };

beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

describe('Dino camera pose persistence across all three views', () => {
  it('maps each mode to its own reset counter', () => {
    const { H, props } = harness();
    for (const view of ['full', 'section', 'find']) {
      const p = props(view, { fullCameraReset: 11, sectionCameraReset: 22, findCameraReset: 33 });
      expect(H.viewKey(p)).toBe(view);
      expect(H.viewReset(p, view)).toBe({ full: 11, section: 22, find: 33 }[view]);
    }
  });

  it('debounces consecutive wheel updates and captures the most recent wheel pose', () => {
    for (const view of ['full', 'section', 'find']) {
      const { H, writes } = harness(view);
      H.setPose(wheelPose); H.queuePoseSave(); vi.advanceTimersByTime(100);
      H.setPose(newerPose); H.queuePoseSave(); vi.advanceTimersByTime(159);
      expect(writes).toEqual([]);
      vi.advanceTimersByTime(1);
      expect(writes).toEqual([{ view, value: newerPose }]);
      expect(H.pending()).toBeNull();
    }
  });

  it('does not roll back newer immediate arrow, key-zoom or drag input to an earlier wheel pose', () => {
    for (const view of ['full', 'section', 'find']) {
      const { H, writes, banks } = harness(view);
      H.setPose(wheelPose); H.queuePoseSave(); vi.advanceTimersByTime(70);
      H.setPose(newerPose); H.savePose();
      expect(H.pending()).toBeNull();
      // A real props.pose render calls flushPoseSave before applying the pose.
      H.flushPoseSave(); vi.advanceTimersByTime(500);
      expect(writes).toEqual([{ view, value: newerPose }]);
      expect(banks[view]).toEqual(newerPose);
    }
  });

  it('saves a queued wheel pose to its originating bank when switching views', () => {
    for (const origin of ['full', 'section', 'find']) for (const destination of ['full', 'section', 'find']) {
      if (origin === destination) continue;
      const { H, latest, props, writes, banks } = harness(origin);
      H.setPose(wheelPose); H.queuePoseSave();
      latest.current = props(destination);
      H.flushPoseSave(); vi.advanceTimersByTime(500);
      expect(writes).toEqual([{ view: origin, value: wheelPose }]);
      expect(banks[origin]).toEqual(wheelPose); expect(banks[destination]).toBeNull();
      H.setPose(newerPose); H.queuePoseSave(); vi.advanceTimersByTime(160);
      expect(writes).toEqual([{ view: origin, value: wheelPose }, { view: destination, value: newerPose }]);
      expect(banks[destination]).toEqual(newerPose);
    }
  });

  it('rejects a pending pose after resetting that view', () => {
    for (const view of ['full', 'section', 'find']) {
      const { H, latest, props, writes } = harness(view);
      H.setPose(wheelPose); H.queuePoseSave();
      latest.current = props(view, { [resetKey[view]]: 1 });
      H.flushPoseSave(); vi.advanceTimersByTime(500);
      expect(writes).toEqual([]); expect(H.pending()).toBeNull();
      H.setPose(newerPose); H.queuePoseSave(); vi.advanceTimersByTime(160);
      expect(writes).toEqual([{ view, value: newerPose }]);
    }
  });

  it('checks the originating reset bank after a quick mode switch', () => {
    for (const origin of ['full', 'section', 'find']) {
      const destination = origin === 'find' ? 'full' : 'find';
      const { H, latest, props, writes } = harness(origin);
      H.setPose(wheelPose); H.queuePoseSave();
      latest.current = props(destination, { [resetKey[origin]]: 1 });
      H.flushPoseSave(); vi.advanceTimersByTime(500);
      expect(writes).toEqual([]);
    }
  });

  it('does not cancel an originating write when only another camera bank resets', () => {
    for (const origin of ['full', 'section', 'find']) {
      const destination = origin === 'find' ? 'section' : 'find';
      const { H, latest, props, writes } = harness(origin);
      H.setPose(wheelPose); H.queuePoseSave();
      latest.current = props(destination, { [resetKey[destination]]: 5 });
      H.flushPoseSave(); vi.advanceTimersByTime(500);
      expect(writes).toEqual([{ view: origin, value: wheelPose }]);
    }
  });

  it('rejects stale pending poses after loading a different excavation site', () => {
    for (const view of ['full', 'section', 'find']) {
      const { H, latest, props, writes } = harness(view);
      H.setPose(wheelPose); H.queuePoseSave();
      latest.current = props(view, { site: { seed: 43 } });
      H.flushPoseSave(); vi.advanceTimersByTime(500);
      expect(writes).toEqual([]); expect(H.pending()).toBeNull();
    }
  });

  it('rejects a queued full-site camera pose after changing the camera preset', () => {
    const { H, latest, props, writes } = harness('full');
    H.setPose(wheelPose); H.queuePoseSave();
    latest.current = props('full', { camera: 'top' });
    H.flushPoseSave(); vi.advanceTimersByTime(500);
    expect(writes).toEqual([]);
  });

  it('keeps section and find poses independent from full-site camera presets', () => {
    for (const view of ['section', 'find']) {
      const { H, latest, props, writes } = harness(view);
      H.setPose(wheelPose); H.queuePoseSave();
      latest.current = props('full', { camera: 'side' });
      H.flushPoseSave(); vi.advanceTimersByTime(500);
      expect(writes).toEqual([{ view, value: wheelPose }]);
    }
  });

  it('does not write the same queued pose twice after an explicit flush', () => {
    const { H, writes } = harness('find');
    H.setPose(wheelPose); H.queuePoseSave(); H.flushPoseSave(); H.flushPoseSave(); vi.advanceTimersByTime(500);
    expect(writes).toEqual([{ view: 'find', value: wheelPose }]);
  });

  it('stops immediate and queued camera writes after the engine is disposed', () => {
    const { H, writes } = harness('find');
    H.setPose(wheelPose); H.queuePoseSave(); H.setAlive(false);
    H.flushPoseSave(); H.setPose(newerPose); H.savePose(); vi.advanceTimersByTime(500);
    expect(writes).toEqual([]); expect(H.pending()).toBeNull();
  });

  it('ships identical mode and camera-save helpers in the desktop mirror', () => {
    const mirror = readFileSync('desktop/web-app/public/stem_lab/stem_tool_dinolab.js', 'utf8').replace(/\r\n/g, '\n');
    expect(bounded(mirror, '        function viewKey(p)', '        function cameraPose()')).toBe(modes);
    expect(bounded(mirror, '        function savePose()', '        function poseValue(')).toBe(saves);
  });
});
