/*
 * analyze.cjs - SPIKE (2026-11-07). Checks rendered MP4s with ffprobe/ffmpeg, NOT with the
 * browser that made them:
 *   - container/codec facts (ffprobe), clean decode (ffmpeg -v error), soft caption track
 *   - A/V SYNC: each cut has a 1 kHz beep placed at the exact cut time. The visual cut is found
 *     from per-frame pixel change, the beep onset from decoded audio samples; skew = audio - video.
 *   - frames at chosen moments + a contact sheet, so a human can look at the composition.
 *
 *   node analyze.cjs out/msedge_prefer-software.mp4 [more.mp4 ...]
 */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SPIKE = __dirname;
const rep = JSON.parse(fs.readFileSync(path.join(SPIKE, 'fixtures_report.json'), 'utf8'));
const sb = JSON.parse(fs.readFileSync(path.join(SPIKE, 'sample_storyboard.json'), 'utf8'));
const events = JSON.parse(fs.readFileSync(path.join(SPIKE, 'assets', 'events.json'), 'utf8'));
const FRAMES = path.join(SPIKE, 'out', 'frames');
fs.mkdirSync(FRAMES, { recursive: true });

const run = (cmd, args, opts) => spawnSync(cmd, args, Object.assign({ maxBuffer: 256 * 1024 * 1024 }, opts));
const rawGray = file => {
  const r = run('ffmpeg', ['-v', 'error', '-i', file, '-an', '-vf', 'scale=32:18:flags=area,format=gray', '-f', 'rawvideo', '-pix_fmt', 'gray', 'pipe:1']);
  return r.stdout;
};
const rawAudio = file => {
  const r = run('ffmpeg', ['-v', 'error', '-i', file, '-vn', '-ac', '1', '-ar', '48000', '-f', 'f32le', 'pipe:1']);
  const b = r.stdout;
  return new Float32Array(b.buffer, b.byteOffset, Math.floor(b.byteLength / 4));
};

function analyze(file) {
  const out = { file: path.basename(file) };
  const pr = JSON.parse(run('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file]).stdout.toString());
  out.format = { name: pr.format.format_name, durationSec: +(+pr.format.duration).toFixed(3), sizeMB: +(pr.format.size / 1e6).toFixed(2) };
  out.streams = pr.streams.map(s => ({ type: s.codec_type, codec: s.codec_name, profile: s.profile, size: s.width ? s.width + 'x' + s.height : undefined, fps: s.avg_frame_rate, frames: s.nb_frames, startSec: s.start_time, durationSec: s.duration, bitrateKbps: s.bit_rate ? Math.round(s.bit_rate / 1000) : undefined, sampleRate: s.sample_rate, tags: s.tags && s.tags.language }));
  const dec = run('ffmpeg', ['-v', 'error', '-i', file, '-f', 'null', '-']);
  out.decodeErrors = String(dec.stderr || '').split(/\r?\n/).filter(Boolean).slice(0, 5);

  // WebVTT-in-MP4 is stored as a 'wvtt' sample entry. ffmpeg does not know that codec, so it
  // reports the track as codec_type=data / codec_name=unknown: match on the codec TAG instead.
  const sub = pr.streams.find(s => s.codec_tag_string === 'wvtt' || s.codec_type === 'subtitle');
  const expectedCues = sb.clips.filter(c => c.track === 'caption').length;
  out.softCaptions = sub ? {
    tag: sub.codec_tag_string, ffprobeType: sub.codec_type, ffprobeCodec: sub.codec_name, packets: +sub.nb_frames,
    expectedPackets: expectedCues * 2 + ' (' + expectedCues + ' cues + ' + expectedCues + ' empty-gap boxes)',
    ffmpegCanExtractIt: run('ffmpeg', ['-y', '-v', 'error', '-i', file, '-map', '0:' + sub.index, '-f', 'webvtt', path.join(SPIKE, 'out', '_sub.vtt')]).status === 0,
  } : null;

  // ---- sync -----------------------------------------------------------------------------
  const fps = 30;
  const g = rawGray(file);
  const per = 32 * 18, n = Math.floor(g.length / per);
  const mad = new Float64Array(n);
  for (let i = 1; i < n; i++) { let s = 0; for (let k = 0; k < per; k++) s += Math.abs(g[i * per + k] - g[(i - 1) * per + k]); mad[i] = s / per; }
  const aud = rawAudio(file);
  const cuts = [['title -> screen', rep.cuts.titleToScreen, true], ['screen -> document', rep.cuts.screenToDocument, true], ['document -> end card (fade)', rep.cuts.documentToEnd, false]];
  out.videoFrames = n;
  out.sync = cuts.map(([label, t, hard]) => {
    // audio: first sample above threshold in a narration-free window around the cut
    const a0 = Math.max(0, Math.floor((t - 0.3) * 48000)), a1 = Math.min(aud.length, Math.floor((t + 0.4) * 48000));
    let on = -1;
    // the beep is ffmpeg's sine source (peak 0.125) at gain 0.5 => peak ~0.06; speech never plays in this window
    for (let i = a0; i < a1; i++) if (Math.abs(aud[i]) > 0.02) { on = i; break; }
    const audioT = on < 0 ? null : on / 48000;
    let videoT = null;
    if (hard) { // the frame with the biggest pixel change near the cut
      let best = 0, bi = -1;
      for (let i = Math.max(1, Math.floor((t - 0.3) * fps)); i < Math.min(n, Math.ceil((t + 0.4) * fps)); i++) if (mad[i] > best) { best = mad[i]; bi = i; }
      videoT = bi < 0 ? null : bi / fps;
    }
    return { cut: label, expectedSec: t, videoCutSec: videoT === null ? 'n/a (fade)' : +videoT.toFixed(3), beepOnsetSec: audioT === null ? 'NOT FOUND' : +audioT.toFixed(3), audioMinusVideoMs: videoT !== null && audioT !== null ? Math.round((audioT - videoT) * 1000) : null, beepVsExpectedMs: audioT === null ? null : Math.round((audioT - t) * 1000) };
  });
  return out;
}

function frames(file, tag) {
  const save = events.find(e => e.target === '#save').t, sbk = events.find(e => e.target === '#sb').t;
  const scr = sb.clips.find(c => c.track === 'screen'), doc = sb.clips.find(c => c.track === 'document'), hl = sb.clips.find(c => c.track === 'highlight');
  const endCard = sb.clips.filter(c => c.track === 'title').pop();
  const moments = [
    ['title+caption', 1.5], ['click1 zoom+ripple', scr.start + sbk + 0.15], ['save click (zoomed)', scr.start + save + 0.3], ['result visible', scr.start + save + 1.6],
    ['document wide', doc.start + 0.9], ['zoom+highlight', hl.start + 1.0], ['end card', endCard.end - 0.9],
  ];
  const files = moments.map(([label, t], i) => {
    const f = path.join(FRAMES, tag + '_' + (i + 1) + '.png');
    run('ffmpeg', ['-y', '-v', 'error', '-ss', t.toFixed(3), '-i', file, '-frames:v', '1', f]);
    return { label, t: +t.toFixed(2), f };
  });
  const sheet = path.join(FRAMES, tag + '_sheet.png');
  const inputs = files.flatMap(x => ['-i', x.f]);
  const filt = files.map((_, i) => '[' + i + ':v]scale=640:360[v' + i + ']').join(';') + ';' + files.map((_, i) => '[v' + i + ']').join('') + 'xstack=inputs=' + files.length + ':layout=' + files.map((_, i) => (i % 3) * 640 + '_' + Math.floor(i / 3) * 360).join('|') + '[o]';
  run('ffmpeg', ['-y', '-v', 'error', ...inputs, '-filter_complex', filt, '-map', '[o]', '-frames:v', '1', sheet]);
  return { sheet, moments: files.map(x => x.label + ' @' + x.t + 's') };
}

const targets = process.argv.slice(2).filter(a => !a.startsWith('--'));
const results = targets.map(f => {
  const file = path.resolve(f);
  const a = analyze(file);
  if (process.argv.includes('--frames')) a.frames = frames(file, path.basename(f, '.mp4'));
  return a;
});
fs.writeFileSync(path.join(SPIKE, 'out', 'analysis.json'), JSON.stringify(results, null, 1));
for (const r of results) {
  console.log('\n=== ' + r.file);
  console.log(JSON.stringify({ format: r.format, streams: r.streams, decodeErrors: r.decodeErrors, softCaptions: r.softCaptions, videoFrames: r.videoFrames }, null, 1));
  console.log('sync:'); console.table(r.sync);
  if (r.frames) console.log(JSON.stringify(r.frames, null, 1));
}
