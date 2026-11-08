// compositor.js - SPIKE (2026-11-07). Draws ONE frame of a storyboard onto a 2D canvas
// context. No encoding, no I/O, no state: drawFrame(ctx, sb, t, env) is a pure function
// of (storyboard, time, the decoded base image), which is what makes renders repeatable.
//
//   env.baseImage      CanvasImageSource for the active screen/document clip (or null)
//   env.cameraFor(c)   camera keyframes for a base clip (array, may be empty)
//   env.eventsFor(c)   click events [{t,x,y}] for a screen clip (may be empty)
import { cameraAt } from './storyboard.js';

const FONT = '"Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif';
const AMBER = '#f59e0b';
const clamp01 = v => Math.max(0, Math.min(1, v));

export function baseClipIndexAt(sb, t) {
  for (let i = 0; i < sb.clips.length; i++) {
    const c = sb.clips[i];
    if ((c.track === 'screen' || c.track === 'document') && t >= c.start && t < c.end) return i;
  }
  return -1;
}

// Maps image pixels to frame pixels: frameX = imgX * s + ox. The image is "contained"
// in the frame at scale 1, then the camera zooms about (x,y), clamped so we never
// show past the image edge.
export function viewFor(iw, ih, W, H, cam) {
  const s0 = Math.min(W / iw, H / ih);
  const s = s0 * Math.max(1, cam.scale);
  const hw = W / (2 * s), hh = H / (2 * s);
  let cx = cam.x * iw, cy = cam.y * ih;
  cx = iw <= 2 * hw ? iw / 2 : Math.min(Math.max(cx, hw), iw - hw);
  cy = ih <= 2 * hh ? ih / 2 : Math.min(Math.max(cy, hh), ih - hh);
  return { s, ox: W / 2 - cx * s, oy: H / 2 - cy * s, iw, ih };
}

function wrapLines(ctx, text, maxW) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    const probe = line ? line + ' ' + w : w;
    if (line && ctx.measureText(probe).width > maxW) { lines.push(line); line = w; } else line = probe;
  }
  if (line) lines.push(line);
  return lines;
}

function drawRipples(ctx, clip, t, view, events) {
  const srcT = t - clip.start + (clip.srcStart || 0);
  for (const e of events) {
    const age = srcT - e.t;
    if (age < 0 || age > 0.7) continue;
    const p = age / 0.7;
    const px = e.x * view.iw * view.s + view.ox, py = e.y * view.ih * view.s + view.oy;
    ctx.save();
    ctx.globalAlpha = 1 - p;
    ctx.strokeStyle = AMBER;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(px, py, 16 + 54 * p, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawHighlight(ctx, c, t, view, W, H) {
  const fade = Math.min(1, (t - c.start) / 0.25, (c.end - t) / 0.25);
  if (fade <= 0) return;
  const pulse = 1 + 0.12 * Math.sin((t - c.start) * 6);
  const [u, v, w, h] = c.rect;
  const pad = 8;
  const x = u * view.iw * view.s + view.ox - pad, y = v * view.ih * view.s + view.oy - pad;
  const rw = w * view.iw * view.s + pad * 2, rh = h * view.ih * view.s + pad * 2;
  ctx.save();
  ctx.globalAlpha = clamp01(fade);
  ctx.fillStyle = 'rgba(245,158,11,0.16)';
  ctx.strokeStyle = AMBER;
  ctx.lineWidth = 5 * pulse;
  ctx.beginPath();
  ctx.roundRect(x, y, rw, rh, 10);
  ctx.fill();
  ctx.stroke();
  if (c.label) {
    const fs = Math.round(H / 28);
    ctx.font = '700 ' + fs + 'px ' + FONT;
    const tw = ctx.measureText(c.label).width;
    const chipW = tw + 24, chipH = fs + 16;
    const cx = Math.max(8, Math.min(W - chipW - 8, x));
    const cy = y - chipH - 8 >= 8 ? y - chipH - 8 : y + rh + 8;
    ctx.fillStyle = AMBER;
    ctx.beginPath();
    ctx.roundRect(cx, cy, chipW, chipH, 8);
    ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.textBaseline = 'middle';
    ctx.fillText(c.label, cx + 12, cy + chipH / 2 + 1);
  }
  ctx.restore();
}

function drawTitle(ctx, c, t, W, H) {
  const a = clamp01(Math.min((t - c.start) / 0.3, (c.end - t) / 0.3));
  ctx.save();
  ctx.globalAlpha = a;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0f172a');
  g.addColorStop(1, '#1e293b');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = AMBER;
  ctx.fillRect(W * 0.1, H * 0.36, W * 0.06, 6);
  ctx.fillStyle = '#f8fafc';
  ctx.textBaseline = 'alphabetic';
  const fs = Math.round(H / 12);
  ctx.font = '700 ' + fs + 'px ' + FONT;
  const lines = wrapLines(ctx, c.text, W * 0.8);
  lines.forEach((ln, i) => ctx.fillText(ln, W * 0.1, H * 0.36 + fs * 1.5 + i * fs * 1.2));
  if (c.sub) {
    ctx.fillStyle = '#cbd5e1';
    const sfs = Math.round(H / 26);
    ctx.font = '400 ' + sfs + 'px ' + FONT;
    wrapLines(ctx, c.sub, W * 0.8).forEach((ln, i) => ctx.fillText(ln, W * 0.1, H * 0.36 + fs * 1.5 + lines.length * fs * 1.2 + sfs * 1.6 + i * sfs * 1.3));
  }
  ctx.restore();
}

function drawCaption(ctx, c, W, H) {
  const fs = Math.round(H / 24);
  ctx.save();
  ctx.font = '600 ' + fs + 'px ' + FONT;
  ctx.textBaseline = 'alphabetic';
  const lines = wrapLines(ctx, c.text, W * 0.8);
  const lh = fs * 1.3;
  const boxW = Math.min(W * 0.86, Math.max(...lines.map(l => ctx.measureText(l).width)) + 48);
  const boxH = lines.length * lh + 22;
  const x = (W - boxW) / 2, y = H - H * 0.05 - boxH;
  ctx.fillStyle = 'rgba(0,0,0,0.78)';
  ctx.beginPath();
  ctx.roundRect(x, y, boxW, boxH, 12);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  lines.forEach((ln, i) => ctx.fillText(ln, W / 2, y + 11 + fs + i * lh - 4));
  ctx.restore();
}

export function drawFrame(ctx, sb, t, env) {
  const W = sb.width, H = sb.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#0b1220';
  ctx.fillRect(0, 0, W, H);

  const bi = baseClipIndexAt(sb, t);
  let base = null, view = null;
  if (bi >= 0 && env.baseImage) {
    base = sb.clips[bi];
    const cam = cameraAt(env.cameraFor(base), t - base.start);
    view = viewFor(env.baseImage.width, env.baseImage.height, W, H, cam);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(env.baseImage, view.ox, view.oy, view.iw * view.s, view.ih * view.s);
    if (base.track === 'screen') drawRipples(ctx, base, t, view, env.eventsFor(base));
  }
  for (const c of sb.clips) {
    if (c.track === 'highlight' && view && base && c.anchor === base.track && t >= c.start && t < c.end) drawHighlight(ctx, c, t, view, W, H);
  }
  for (const c of sb.clips) if (c.track === 'title' && t >= c.start && t < c.end) drawTitle(ctx, c, t, W, H);
  for (const c of sb.clips) if (c.track === 'caption' && t >= c.start && t < c.end) drawCaption(ctx, c, W, H);
}
