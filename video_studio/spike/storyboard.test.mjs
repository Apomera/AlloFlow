// Run: node --test storyboard.test.mjs   (Node's built-in runner: no vitest, so it cannot
// collide with the shared tree's other test runs.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateStoryboard, buildVtt, cameraAt, cameraFromEvents, storyboardDuration } from './storyboard.js';

const base = () => ({
  version: 0, width: 1280, height: 720, fps: 30,
  assets: { scr: 'a.webm', pg: 'p.png', ev: 'e.json', v1: 'v1.wav' },
  clips: [
    { track: 'title', start: 0, end: 2, text: 'Hello' },
    { track: 'screen', start: 2, end: 6, asset: 'scr', events: 'ev', camera: 'auto-from-events' },
    { track: 'document', start: 6, end: 9, asset: 'pg', camera: [{ t: 0, x: 0.5, y: 0.5, scale: 1 }, { t: 1, x: 0.3, y: 0.3, scale: 2 }] },
    { track: 'highlight', anchor: 'document', start: 7, end: 8, rect: [0.1, 0.1, 0.2, 0.1], label: 'Look' },
    { track: 'caption', start: 2.5, end: 4, text: 'First, choose the student.' },
  ],
  audio: [{ asset: 'v1', start: 2.5 }],
});
const errs = sb => validateStoryboard(sb).errors.join(' | ');

test('a well-formed storyboard validates', () => {
  const r = validateStoryboard(base());
  assert.deepEqual(r.errors, []);
  assert.equal(r.ok, true);
  assert.equal(storyboardDuration(base()), 9);
});

test('odd dimensions are rejected (H.264 needs even)', () => {
  const sb = base(); sb.width = 1281;
  assert.match(errs(sb), /even/);
});

test('overlapping screen/document clips are rejected', () => {
  const sb = base(); sb.clips[2].start = 5.5;
  assert.match(errs(sb), /overlap/);
});

test('undeclared assets and bad event refs are rejected', () => {
  const sb = base(); sb.clips[1].asset = 'nope'; sb.clips[1].events = 'nada';
  const e = errs(sb);
  assert.match(e, /asset "nope"/);
  assert.match(e, /events "nada"/);
});

test('unknown track and non-finite times are rejected', () => {
  const sb = base(); sb.clips.push({ track: 'sparkle', start: 0, end: 1 }, { track: 'caption', start: 3, end: 2, text: 'x' });
  const e = errs(sb);
  assert.match(e, /not one of/);
  assert.match(e, /start < end/);
});

test('captions: empty and over-long are rejected', () => {
  const sb = base(); sb.clips.push({ track: 'caption', start: 4, end: 5, text: '  ' }, { track: 'caption', start: 5, end: 6, text: 'x'.repeat(221) });
  const e = errs(sb);
  assert.match(e, /needs text/);
  assert.match(e, /max 220/);
});

test('highlight must have a valid rect and a base clip of its anchor type on screen', () => {
  const sb = base();
  sb.clips[3].rect = [0.1, 1.2, 0.2, 0.1];
  assert.match(errs(sb), /rect must be/);
  const sb2 = base(); sb2.clips[3].anchor = 'screen';
  assert.match(errs(sb2), /no such clip is on screen/);
});

test('camera: bad keyframes, wrong order, and auto-from-events off a screen clip', () => {
  const sb = base(); sb.clips[2].camera = [{ t: 1, x: 0, y: 0, scale: 1 }, { t: 0.5, x: 0, y: 0, scale: 1 }];
  assert.match(errs(sb), /time order/);
  const sb2 = base(); sb2.clips[2].camera = [{ t: 0, x: 0, y: 0, scale: 0.5 }];
  assert.match(errs(sb2), /camera must be/);
  const sb3 = base(); sb3.clips[2].camera = 'auto-from-events';
  assert.match(errs(sb3), /only applies to screen/);
});

test('audio entries need declared assets and sane start/gain', () => {
  const sb = base(); sb.audio.push({ asset: 'ghost', start: -1, gain: 9 });
  const e = errs(sb);
  assert.match(e, /audio\[1\]\.asset/);
  assert.match(e, /start must be >= 0/);
  assert.match(e, /gain must be 0..4/);
});

test('buildVtt: ordered cues, millisecond timestamps, one line each', () => {
  const sb = base(); sb.clips.push({ track: 'caption', start: 0.5, end: 1.25, text: 'Early\nline' });
  const vtt = buildVtt(sb);
  assert.ok(vtt.startsWith('WEBVTT\n\n1\n00:00:00.500 --> 00:00:01.250\nEarly line\n'));
  assert.match(vtt, /2\n00:00:02\.500 --> 00:00:04\.000\nFirst, choose the student\./);
});

test('cameraAt: clamps outside the keyframes and eases between them', () => {
  const k = [{ t: 0, x: 0.5, y: 0.5, scale: 1 }, { t: 2, x: 0.1, y: 0.9, scale: 3 }];
  assert.deepEqual(cameraAt(k, -1), { x: 0.5, y: 0.5, scale: 1 });
  assert.deepEqual(cameraAt(k, 5), { x: 0.1, y: 0.9, scale: 3 });
  const mid = cameraAt(k, 1);
  assert.ok(Math.abs(mid.scale - 2) < 1e-9 && Math.abs(mid.x - 0.3) < 1e-9, 'ease-in-out is symmetric at the midpoint');
  assert.deepEqual(cameraAt([], 1), { x: 0.5, y: 0.5, scale: 1 });
});

test('cameraFromEvents: zoom lands before each click, merges nearby clicks, zooms out after the last', () => {
  const ev = [{ kind: 'click', t: 2, x: 0.2, y: 0.3 }, { kind: 'key', t: 3 }, { kind: 'click', t: 3.5, x: 0.7, y: 0.4 }, { kind: 'click', t: 10, x: 0.5, y: 0.8 }];
  const k = cameraFromEvents(ev);
  assert.deepEqual(k[0], { t: 0, x: 0.5, y: 0.5, scale: 1 });
  for (let i = 1; i < k.length; i++) assert.ok(k[i].t >= k[i - 1].t, 'monotonic at ' + i);
  const zoomedAt = t => cameraAt(k, t).scale;
  assert.ok(zoomedAt(1.4) > 1.6, 'fully zoomed 0.5s before click 1');
  assert.ok(zoomedAt(3.0) > 1.6, 'still zoomed between clicks 1 and 2 (merged, no zoom-out)');
  assert.ok(zoomedAt(7) < 1.01, 'back at full frame in the long gap');
  assert.ok(zoomedAt(20) < 1.01, 'back at full frame at the end');
  assert.deepEqual(cameraFromEvents([]), [{ t: 0, x: 0.5, y: 0.5, scale: 1 }]);
});
