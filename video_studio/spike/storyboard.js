// storyboard.js - SPIKE (2026-11-07). The data contract between an editing agent and
// the renderer. Pure functions, no DOM: importable from Node tests and from the page.
//
// Design rule: the agent edits DATA (this JSON), never code. Everything it can say is
// validated here before a single frame is drawn, so a bad edit fails with a readable
// message instead of a broken video.
//
// Storyboard v0 = a flat list of clips on five fixed tracks, plus audio entries.
//   title      full-frame card (opaque)               { text, sub }
//   screen     a screen recording                     { asset, srcStart, camera }
//   document   a still page (PDF page / slide image)  { asset, camera }
//   highlight  box + label drawn on the base visual   { anchor, rect:[u,v,w,h], label }
//   caption    burned-in caption bar (+ WebVTT)       { text }
// Only ONE screen/document clip may be active at a time (no overlap). Coordinates for
// rect / camera / events are normalised 0..1 against the source image, so they survive
// a change of output size.

export const VERSION = 0;
export const TRACKS = ['title', 'screen', 'document', 'highlight', 'caption'];
const MAX_CAPTION_CHARS = 220;

const isNum = v => typeof v === 'number' && Number.isFinite(v);
const isBase = track => track === 'screen' || track === 'document';

export function validateStoryboard(sb) {
  const errors = [];
  const err = m => errors.push(m);
  if (!sb || typeof sb !== 'object') return { ok: false, errors: ['storyboard must be an object'] };
  if (sb.version !== VERSION) err('version must be ' + VERSION);
  for (const k of ['width', 'height', 'fps']) {
    if (!isNum(sb[k]) || sb[k] <= 0) err(k + ' must be a positive number');
  }
  if (isNum(sb.width) && isNum(sb.height) && (sb.width % 2 || sb.height % 2)) err('width and height must be even (H.264 needs even dimensions)');
  const assets = sb.assets && typeof sb.assets === 'object' ? sb.assets : {};
  if (!Array.isArray(sb.clips) || !sb.clips.length) { err('clips must be a non-empty array'); return { ok: false, errors }; }

  sb.clips.forEach((c, i) => {
    const at = 'clips[' + i + ']';
    if (!c || typeof c !== 'object') { err(at + ' must be an object'); return; }
    if (!TRACKS.includes(c.track)) { err(at + '.track "' + c.track + '" is not one of ' + TRACKS.join(', ')); return; }
    if (!isNum(c.start) || !isNum(c.end) || c.start < 0 || c.end <= c.start) err(at + ' needs 0 <= start < end');
    if (isBase(c.track) && !assets[c.asset]) err(at + '.asset "' + c.asset + '" is not declared in assets');
    if (c.events !== undefined && !assets[c.events]) err(at + '.events "' + c.events + '" is not declared in assets');
    if (c.track === 'title' && !String(c.text || '').trim()) err(at + ' title needs text');
    if (c.track === 'caption') {
      const txt = String(c.text || '').trim();
      if (!txt) err(at + ' caption needs text');
      if (txt.length > MAX_CAPTION_CHARS) err(at + ' caption is ' + txt.length + ' chars (max ' + MAX_CAPTION_CHARS + ')');
    }
    if (c.track === 'highlight') {
      if (!isBase(c.anchor)) err(at + '.anchor must be "screen" or "document"');
      const r = c.rect;
      if (!Array.isArray(r) || r.length !== 4 || !r.every(isNum) || r.some(n => n < 0 || n > 1) || r[2] <= 0 || r[3] <= 0) err(at + '.rect must be [u,v,w,h] within 0..1');
    }
    if (c.camera !== undefined && c.camera !== 'auto-from-events') {
      const ok = Array.isArray(c.camera) && c.camera.every(k => k && isNum(k.t) && isNum(k.x) && isNum(k.y) && isNum(k.scale) && k.scale >= 1);
      if (!ok) err(at + '.camera must be "auto-from-events" or [{t,x,y,scale>=1}]');
      else if (c.camera.some((k, j) => j && k.t < c.camera[j - 1].t)) err(at + '.camera keyframes must be in time order');
    }
    if (c.camera === 'auto-from-events' && c.track !== 'screen') err(at + '.camera "auto-from-events" only applies to screen clips');
  });

  const bases = sb.clips.filter(c => c && isBase(c.track) && isNum(c.start) && isNum(c.end)).sort((a, b) => a.start - b.start);
  for (let i = 1; i < bases.length; i++) {
    if (bases[i].start < bases[i - 1].end - 1e-6) err('screen/document clips overlap at ' + bases[i].start.toFixed(2) + 's (only one base visual at a time)');
  }
  sb.clips.forEach((c, i) => {
    if (c && c.track === 'highlight' && isBase(c.anchor) && isNum(c.start) && isNum(c.end)) {
      const hit = bases.some(b => b.track === c.anchor && b.start < c.end && b.end > c.start);
      if (!hit) err('clips[' + i + '] highlight is anchored to "' + c.anchor + '" but no such clip is on screen during it');
    }
  });
  (Array.isArray(sb.audio) ? sb.audio : []).forEach((a, i) => {
    const at = 'audio[' + i + ']';
    if (!a || !assets[a.asset]) err(at + '.asset is not declared in assets');
    if (!a || !isNum(a.start) || a.start < 0) err(at + '.start must be >= 0');
    if (a && a.gain !== undefined && (!isNum(a.gain) || a.gain < 0 || a.gain > 4)) err(at + '.gain must be 0..4');
  });
  return { ok: errors.length === 0, errors };
}

export function storyboardDuration(sb) {
  return (sb.clips || []).reduce((m, c) => (isNum(c.end) && c.end > m ? c.end : m), 0);
}

// ---- WebVTT from caption clips --------------------------------------------------
function ts(sec) {
  const s = Math.max(0, sec);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  const whole = Math.floor(s % 60);
  const ms = Math.min(999, Math.round((s - Math.floor(s)) * 1000));
  const p = (n, w) => String(n).padStart(w, '0');
  return p(h, 2) + ':' + p(m, 2) + ':' + p(whole, 2) + '.' + p(ms, 3);
}
export function buildVtt(sb) {
  const caps = sb.clips.filter(c => c.track === 'caption').sort((a, b) => a.start - b.start);
  const out = ['WEBVTT', ''];
  caps.forEach((c, i) => {
    out.push(String(i + 1), ts(c.start) + ' --> ' + ts(c.end), String(c.text).replace(/[\r\n]+/g, ' ').trim(), '');
  });
  return out.join('\n');
}

// ---- Camera ---------------------------------------------------------------------
export const easeInOutCubic = p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

// keyframes: [{t,x,y,scale}] in clip-relative seconds. Returns the camera at time t.
export function cameraAt(kfs, t) {
  if (!Array.isArray(kfs) || !kfs.length) return { x: 0.5, y: 0.5, scale: 1 };
  if (t <= kfs[0].t) return { x: kfs[0].x, y: kfs[0].y, scale: kfs[0].scale };
  const last = kfs[kfs.length - 1];
  if (t >= last.t) return { x: last.x, y: last.y, scale: last.scale };
  for (let i = 1; i < kfs.length; i++) {
    if (t < kfs[i].t) {
      const a = kfs[i - 1], b = kfs[i];
      const span = b.t - a.t;
      const p = span <= 0 ? 1 : easeInOutCubic((t - a.t) / span);
      return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p, scale: a.scale + (b.scale - a.scale) * p };
    }
  }
  return { x: last.x, y: last.y, scale: last.scale };
}

// The "agentic edit from the event log" idea in ~25 lines: given click events
// [{t,x,y}] (seconds into the recording, normalised position), zoom in just before
// each click, hold, and zoom back out when there is a long gap. No video analysis.
export function cameraFromEvents(events, opts) {
  // hold is short on purpose: a click usually changes something ELSEWHERE on the page (a banner, a
  // new chart bar), and a camera still parked on the button hides that result.
  const o = Object.assign({ scale: 1.7, lead: 0.5, easeIn: 0.45, hold: 0.8, easeOut: 0.6, mergeGap: 2.5 }, opts || {});
  const clicks = (events || []).filter(e => e && e.kind !== 'key' && isNum(e.t) && isNum(e.x) && isNum(e.y)).sort((a, b) => a.t - b.t);
  const kfs = [{ t: 0, x: 0.5, y: 0.5, scale: 1 }];
  let lastT = 0;
  const push = (t, x, y, scale) => { lastT = Math.max(lastT + 0.01, t); kfs.push({ t: lastT, x, y, scale }); };
  clicks.forEach((e, i) => {
    const prev = clicks[i - 1], next = clicks[i + 1];
    const merged = !!prev && e.t - prev.t <= o.mergeGap; // still zoomed from the last click: pan, do not zoom out
    if (!merged) push(e.t - o.lead - o.easeIn, 0.5, 0.5, 1); // start of the zoom-in, from the full frame
    push(e.t - o.lead, e.x, e.y, o.scale);                  // arrive at the target before the click
    push(e.t + o.hold, e.x, e.y, o.scale);                  // hold through the click
    if (!next || next.t - e.t > o.mergeGap) push(e.t + o.hold + o.easeOut, 0.5, 0.5, 1);
  });
  return kfs;
}
