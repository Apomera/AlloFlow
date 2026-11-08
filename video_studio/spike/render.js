// render.js - SPIKE (2026-11-07). storyboard JSON + assets -> MP4 (H.264/AAC where the
// browser can encode it), entirely in the page: WebCodecs via Mediabunny, no ffmpeg,
// no server, no SharedArrayBuffer / cross-origin isolation.
//
//   fetch assets -> decode screen clip with CanvasSink -> per frame: drawFrame() onto an
//   OffscreenCanvas -> CanvasSource.add(t, 1/fps) -> mixed narration via AudioBufferSource
//   -> optional soft WebVTT subtitle track -> finalize -> Blob.
import * as MB from './vendor/mediabunny.min.mjs';
import { validateStoryboard, storyboardDuration, buildVtt, cameraFromEvents } from './storyboard.js';
import { drawFrame, baseClipIndexAt } from './compositor.js';

const yieldToUi = () => new Promise(r => setTimeout(r, 0));
const AUDIO_RATE = 48000;

export async function probeSupport() {
  const r = {
    userAgent: navigator.userAgent,
    isSecureContext: !!self.isSecureContext,
    crossOriginIsolated: !!self.crossOriginIsolated,
    webcodecs: typeof VideoEncoder !== 'undefined' && typeof VideoDecoder !== 'undefined' && typeof AudioEncoder !== 'undefined',
    offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
    video: {}, audio: {},
  };
  if (!r.webcodecs) return r;
  const fmt = new MB.Mp4OutputFormat();
  r.mp4Video = fmt.getSupportedVideoCodecs();
  r.mp4Audio = fmt.getSupportedAudioCodecs();
  r.mp4Subtitle = fmt.getSupportedSubtitleCodecs ? fmt.getSupportedSubtitleCodecs() : [];
  for (const c of ['avc', 'vp9', 'av1', 'hevc']) {
    try { r.video[c] = await MB.canEncodeVideo(c, { width: 1280, height: 720, frameRate: 30 }); } catch (e) { r.video[c] = 'error: ' + e.message; }
  }
  for (const c of ['aac', 'opus']) {
    try { r.audio[c] = await MB.canEncodeAudio(c); } catch (e) { r.audio[c] = 'error: ' + e.message; }
  }
  return r;
}

async function decodeAudio(arrayBuffer) {
  const ctx = new OfflineAudioContext(2, 1, AUDIO_RATE);
  return ctx.decodeAudioData(arrayBuffer);
}

async function loadAssets(sb, baseUrl) {
  const loaded = {};
  for (const [name, rel] of Object.entries(sb.assets || {})) {
    const res = await fetch(new URL(rel, baseUrl).href);
    if (!res.ok) throw new Error('asset "' + name + '" failed to load: HTTP ' + res.status + ' (' + rel + ')');
    const ext = rel.split('?')[0].split('.').pop().toLowerCase();
    if (['webm', 'mp4', 'mov', 'mkv'].includes(ext)) {
      const input = new MB.Input({ formats: MB.ALL_FORMATS, source: new MB.BlobSource(await res.blob()) });
      const track = await input.getPrimaryVideoTrack();
      if (!track) throw new Error('asset "' + name + '" has no video track');
      loaded[name] = { kind: 'video', input, track, sink: new MB.CanvasSink(track, { poolSize: 2 }), width: track.displayWidth, height: track.displayHeight, duration: await input.computeDuration() };
    } else if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
      loaded[name] = { kind: 'image', bitmap: await createImageBitmap(await res.blob()) };
    } else if (ext === 'json') {
      loaded[name] = { kind: 'json', data: await res.json() };
    } else if (['wav', 'mp3', 'ogg', 'm4a', 'flac'].includes(ext)) {
      loaded[name] = { kind: 'audio', buffer: await decodeAudio(await res.arrayBuffer()) };
    } else throw new Error('asset "' + name + '": unsupported type .' + ext);
  }
  return loaded;
}

async function mixAudio(sb, assets, durationSec) {
  const entries = (sb.audio || []).filter(a => assets[a.asset] && assets[a.asset].kind === 'audio');
  if (!entries.length) return null;
  const ctx = new OfflineAudioContext(2, Math.ceil(durationSec * AUDIO_RATE), AUDIO_RATE);
  for (const a of entries) {
    const src = ctx.createBufferSource();
    src.buffer = assets[a.asset].buffer;
    const g = ctx.createGain();
    g.gain.value = a.gain === undefined ? 1 : a.gain;
    src.connect(g).connect(ctx.destination);
    src.start(a.start);
  }
  return ctx.startRendering();
}

function sliceBuffer(buf, from, to) {
  const len = Math.max(0, Math.min(buf.length, to) - from);
  const out = new AudioBuffer({ length: len, numberOfChannels: buf.numberOfChannels, sampleRate: buf.sampleRate });
  for (let ch = 0; ch < buf.numberOfChannels; ch++) out.copyToChannel(buf.getChannelData(ch).subarray(from, from + len), ch);
  return out;
}

// opts: { baseUrl, onProgress(p), signal, hw: 'no-preference'|'prefer-hardware'|'prefer-software',
//         videoCodecs: ['avc','vp9','av1'], softCaptions: true }
export async function renderStoryboard(sb, opts) {
  opts = opts || {};
  const stats = { phases: {}, warnings: [] };
  const mark = (name, t0) => { stats.phases[name] = Math.round(performance.now() - t0); };
  const v = validateStoryboard(sb);
  if (!v.ok) throw new Error('Invalid storyboard:\n - ' + v.errors.join('\n - '));
  const W = sb.width, H = sb.height, fps = sb.fps;
  const duration = storyboardDuration(sb);
  const N = Math.ceil(duration * fps - 1e-9);
  const tAll = performance.now();

  let t0 = performance.now();
  const assets = await loadAssets(sb, opts.baseUrl || location.href);
  mark('loadAssetsMs', t0);

  const eventsOf = clip => (clip.events && assets[clip.events] ? assets[clip.events].data : []);
  const cameraCache = new Map();
  const cameraFor = clip => {
    if (!cameraCache.has(clip)) {
      let kfs = [];
      if (clip.camera === 'auto-from-events') kfs = cameraFromEvents(eventsOf(clip).map(e => ({ ...e, t: e.t - (clip.srcStart || 0) })));
      else if (Array.isArray(clip.camera)) kfs = clip.camera;
      cameraCache.set(clip, kfs);
    }
    return cameraCache.get(clip);
  };

  t0 = performance.now();
  const mixed = await mixAudio(sb, assets, duration);
  mark('mixAudioMs', t0);

  // ---- output + tracks -----------------------------------------------------------
  const format = new MB.Mp4OutputFormat({ fastStart: 'in-memory' });
  const output = new MB.Output({ format, target: new MB.BufferTarget() });
  const wantV = (opts.videoCodecs || ['avc', 'vp9', 'av1']).filter(c => format.getSupportedVideoCodecs().includes(c));
  // opts.bitrate (bits/s) overrides the qualitative preset: hardware encoders can ignore a preset's
  // target and run several times larger, which matters when tutorials are emailed or put in an LMS.
  const quality = opts.bitrate ? new MB.Quality({ bitrate: opts.bitrate, bitrateMode: opts.bitrateMode || 'variable' }) : MB.QUALITY_HIGH;
  stats.qualityRequested = opts.bitrate ? opts.bitrate + ' bps ' + (opts.bitrateMode || 'variable') : 'QUALITY_HIGH';
  const vCodec = await MB.getFirstEncodableVideoCodec(wantV, { width: W, height: H, frameRate: fps, quality });
  if (!vCodec) throw new Error('No video codec from [' + wantV.join(', ') + '] can be encoded in this browser.');
  stats.videoCodec = vCodec;
  if (vCodec !== 'avc') stats.warnings.push('H.264 (avc) is not encodable here; fell back to ' + vCodec + ' in MP4. Many classroom players expect H.264.');
  let encoderConfig = null;
  const canvas = new OffscreenCanvas(W, H);
  const ctx = canvas.getContext('2d', { alpha: false });
  const videoSource = new MB.CanvasSource(canvas, {
    codec: vCodec, quality, hardwareAcceleration: opts.hw || 'no-preference', keyFrameInterval: 2,
    onEncoderConfig: c => { encoderConfig = c; },
  });
  output.addVideoTrack(videoSource, { frameRate: fps });

  let audioSource = null;
  if (mixed) {
    const wantA = ['aac', 'opus'].filter(c => format.getSupportedAudioCodecs().includes(c));
    const aCodec = await MB.getFirstEncodableAudioCodec(wantA);
    if (!aCodec) stats.warnings.push('No audio codec encodable; narration omitted.');
    else {
      stats.audioCodec = aCodec;
      if (aCodec !== 'aac') stats.warnings.push('AAC is not encodable here; narration encoded as ' + aCodec + '.');
      audioSource = new MB.AudioBufferSource({ codec: aCodec, quality: MB.QUALITY_MEDIUM });
      output.addAudioTrack(audioSource, { languageCode: 'eng', name: 'Narration' });
    }
  }
  const vtt = buildVtt(sb);
  let subSource = null;
  const hasCaptions = sb.clips.some(c => c.track === 'caption');
  if (opts.softCaptions !== false && hasCaptions) {
    if ((format.getSupportedSubtitleCodecs ? format.getSupportedSubtitleCodecs() : []).includes('webvtt')) {
      subSource = new MB.TextSubtitleSource('webvtt');
      output.addSubtitleTrack(subSource, { languageCode: 'eng', name: 'English captions' });
    } else stats.warnings.push('MP4 subtitle track (webvtt) not supported by this Mediabunny build; captions are burned in only.');
  }

  // ---- plan which frames belong to which base clip --------------------------------
  const framesByClip = new Map();
  for (let i = 0; i < N; i++) {
    const bi = baseClipIndexAt(sb, i / fps);
    if (bi >= 0) { if (!framesByClip.has(bi)) framesByClip.set(bi, []); framesByClip.get(bi).push(i); }
  }
  const decoders = new Map(); // clip index -> { gen, last, remaining }

  await output.start();
  if (subSource) { await subSource.add(vtt); subSource.close(); }

  // ---- the render loop ------------------------------------------------------------
  t0 = performance.now();
  let audioPos = 0;
  const chunk = AUDIO_RATE; // 1 s of audio per slice, interleaved with video
  let slowest = 0;
  for (let i = 0; i < N; i++) {
    if (opts.signal && opts.signal.aborted) { await output.cancel(); throw new Error('Render cancelled'); }
    const t = i / fps;
    const fStart = performance.now();
    const bi = baseClipIndexAt(sb, t);
    let baseImage = null;
    if (bi >= 0) {
      const clip = sb.clips[bi];
      const a = assets[clip.asset];
      if (a.kind === 'image') baseImage = a.bitmap;
      else if (a.kind === 'video') {
        let d = decoders.get(bi);
        if (!d) {
          const stamps = framesByClip.get(bi).map(fi => fi / fps - clip.start + (clip.srcStart || 0));
          d = { gen: a.sink.canvasesAtTimestamps(stamps), last: null, remaining: stamps.length };
          decoders.set(bi, d);
        }
        const r = await d.gen.next();
        if (r.value && r.value.canvas) d.last = r.value.canvas;
        if (--d.remaining === 0) await d.gen.return();
        baseImage = d.last;
      }
    }
    drawFrame(ctx, sb, t, { baseImage, cameraFor, eventsFor: eventsOf });
    await videoSource.add(t, 1 / fps);
    if (audioSource && audioPos < mixed.length && (t + 1) * AUDIO_RATE > audioPos) {
      const end = Math.min(mixed.length, audioPos + chunk);
      await audioSource.add(sliceBuffer(mixed, audioPos, end));
      audioPos = end;
    }
    slowest = Math.max(slowest, performance.now() - fStart);
    if (i % 15 === 0) { if (opts.onProgress) opts.onProgress({ frame: i, total: N }); await yieldToUi(); }
  }
  if (audioSource) {
    while (audioPos < mixed.length) { const end = Math.min(mixed.length, audioPos + chunk); await audioSource.add(sliceBuffer(mixed, audioPos, end)); audioPos = end; }
    audioSource.close();
  }
  videoSource.close();
  mark('renderLoopMs', t0);

  t0 = performance.now();
  await output.finalize();
  mark('finalizeMs', t0);
  const bytes = output.target.buffer;
  mark('totalMs', tAll);
  stats.frames = N;
  stats.durationSec = duration;
  stats.renderFps = Math.round((N / (stats.phases.renderLoopMs / 1000)) * 10) / 10;
  stats.realtimeFactor = Math.round((duration / (stats.phases.totalMs / 1000)) * 100) / 100; // >1 = faster than real time
  stats.slowestFrameMs = Math.round(slowest);
  stats.sizeBytes = bytes.byteLength;
  stats.encoderConfig = encoderConfig && { codec: encoderConfig.codec, width: encoderConfig.width, height: encoderConfig.height, bitrate: encoderConfig.bitrate, hardwareAcceleration: encoderConfig.hardwareAcceleration };
  stats.softCaptionTrack = !!subSource;
  for (const a of Object.values(assets)) if (a.kind === 'video') a.input.dispose && a.input.dispose();
  return { blob: new Blob([bytes], { type: 'video/mp4' }), vtt, stats };
}
