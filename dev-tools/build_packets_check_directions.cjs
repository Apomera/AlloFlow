#!/usr/bin/env node
'use strict';
// Records the directions of the two checks for the youngest students (Quantity Discrimination, Missing Number),
// 2026-11-17, and writes packets_check_directions.js: the words of a check's "Get ready" screen, each as one
// recording. A check made on packets-check.html carries the recordings of its own three lines, and its Get ready
// screen then has a "Hear the directions" button (packet_check_builder.js directionsFor).
//
// The words are not written here: they are read from the file's own labels (word_sounds_take_home_loader.js), so a
// recording always says what the screen says. The voice is the one the read-along maker uses (Kokoro-82M, a machine
// voice), run in a real browser on packets-voice.html through packets_voice_engine.js, and the recording is made
// smaller by the same encoder (MP3, one channel, 64 kbps).
//
//   node dev-tools/build_packets_check_directions.cjs            record every line and write the file
//   node dev-tools/build_packets_check_directions.cjs --check    fail if a line has no recording (records nothing)
//   node dev-tools/build_packets_check_directions.cjs --lines    print the lines
//
// Recording downloads the voice (about 88 MB) from Hugging Face and runs one browser for a few minutes: a heavy job.
// A machine voice does not say a line the same way twice, so --check compares the words only, never the sound.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'packets_check_directions.js');
const MIRRORS = ['desktop/web-app/public', 'desktop/app-build', 'desktop/web-app/build'];
const VOICE = 'af_heart';
const ACTIVITIES = ['quantity_discrimination', 'missing_number'];

function loaderParts() {
  const g = { crypto: require('node:crypto').webcrypto };
  g.window = g;
  new Function('window', fs.readFileSync(path.join(ROOT, 'word_sounds_take_home_loader.js'), 'utf8')).call(g, g);
  return g.AlloWordSoundsTakeHome;
}
function probeBank() {
  const g = {};
  g.window = g;
  new Function('window', fs.readFileSync(path.join(ROOT, 'psychometric_math_probes.js'), 'utf8')).call(g, g);
  return g;
}
// Every line a Get ready screen of the two checks can show: the same rule as readyScreen and timeWords in the loader.
function lines() {
  const loader = loaderParts();
  const checks = require(path.join(ROOT, 'packet_check_builder.js'));
  const L = Object.assign({}, loader.CHECK_LABELS);
  ACTIVITIES.forEach((id) => Object.assign(L, loader.CHECK_ADAPTERS[id].labels));
  const bank = probeBank();
  const limits = new Set();
  ACTIVITIES.forEach((id) => {
    const m = checks.MEASURES[id];
    limits.add(m.timeLimitS);
    const sets = bank[m.bank] || {};
    Object.keys(sets).forEach((grade) => Object.keys(sets[grade] || {}).forEach((form) => { const t = Number(sets[grade][form] && sets[grade][form].timeLimit); if (t > 0) limits.add(t); }));
  });
  const out = [];
  ACTIVITIES.forEach((id) => out.push(L[id + '_directions']));
  [...limits].sort((a, b) => a - b).forEach((s) => out.push(checks.readyTimeLine(L, s)));
  out.push(L.check_ready_untimed, L.check_ready_one_try);
  if (out.some((t) => typeof t !== 'string' || !t.trim())) throw new Error('A line of the Get ready screen is missing from the labels.');
  return [...new Set(out)];
}
function readClips() {
  if (!fs.existsSync(OUT)) return null;
  const g = {};
  new Function('window', 'module', fs.readFileSync(OUT, 'utf8')).call(g, g, undefined);
  return g.AlloPacketCheckDirections || null;
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.wasm': 'application/wasm' };
function serve() {
  const server = http.createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
    const file = path.resolve(ROOT, '.' + decodeURIComponent(String(req.url).split('?')[0].split('#')[0]));
    if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) { res.writeHead(404); res.end('not found'); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': 'no-store' });
      if (req.method === 'HEAD') { res.end(); return; }
      fs.createReadStream(file).pipe(res);
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, base: 'http://127.0.0.1:' + server.address().port + '/' })));
}

async function record(list) {
  const { chromium } = require(path.join(ROOT, 'node_modules/playwright'));
  const { server, base } = await serve();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await (await browser.newContext()).newPage();
    page.on('pageerror', (e) => console.log('page error: ' + String(e && e.message || e).slice(0, 200)));
    await page.goto(base + 'packets-voice.html', { waitUntil: 'load' });
    console.log('Getting the voice (about 88 MB, from Hugging Face)...');
    // The download from Hugging Face stalls now and then; a second try has always gone through.
    let started = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      started = await page.evaluate(() => window.AlloPacketVoiceEngine.get().then(() => window.AlloPacketVoiceEngine.getMp3()).then((mp3) => ({ ok: true, mp3: !!mp3 }), (e) => ({ ok: false, why: String(e && e.message || e) })));
      if (started.ok) break;
      console.log('  try ' + attempt + ' of 3 did not start: ' + started.why);
    }
    if (!started.ok) throw new Error('The voice did not start: ' + started.why);
    if (!started.mp3) throw new Error('The MP3 encoder did not arrive.');
    const clips = {};
    for (const text of list) {
      const made = await page.evaluate(async ([say, voice]) => {
        const E = window.AlloPacketVoiceEngine;
        const wav = await E.speak(say, voice, {});
        const ms = E.wavMs(wav);
        const mp3 = await E.wavToMp3(wav, 64);
        return { ms, uri: E.toDataUri(mp3, 'audio/mpeg'), bytes: mp3.length };
      }, [text, VOICE]);
      // A recording far shorter than its words is a failed one (about 45 ms a character is fast speech).
      if (!/^data:audio\/mpeg;base64,/.test(made.uri) || made.ms < Math.max(600, text.length * 30)) throw new Error('The recording of "' + text + '" is too short (' + made.ms + ' ms).');
      clips[text] = { uri: made.uri, ms: Math.round(made.ms) };
      console.log('  ' + (made.ms / 1000).toFixed(1) + ' s, ' + Math.round(made.bytes / 1024) + ' KB: ' + text);
    }
    return clips;
  } finally {
    await browser.close();
    server.close();
  }
}

function write(clips) {
  const day = new Date();
  const made = day.getFullYear() + '-' + String(day.getMonth() + 1).padStart(2, '0') + '-' + String(day.getDate()).padStart(2, '0');
  const data = { voice: 'Kokoro-82M text-to-speech (voice ' + VOICE + '), a machine voice', made: made, humanReviewed: false, clips: {}, ms: {} };
  Object.keys(clips).forEach((text) => { data.clips[text] = clips[text].uri; data.ms[text] = clips[text].ms; });
  const body = '// Generated by dev-tools/build_packets_check_directions.cjs. Do not edit.\n'
    + '// The directions of the two checks for the youngest students (Quantity Discrimination, Missing Number), each line of\n'
    + '// the "Get ready" screen as one recording: a machine voice (Kokoro-82M), made ahead of time. No person has listened to\n'
    + '// each one. A check made on packets-check.html carries the recordings of its own lines; nothing is recorded or\n'
    + '// downloaded when a check is made or opened.\n'
    + '(function (root) {\n  var data = ' + JSON.stringify(data, null, 1).replace(/\n/g, '\n  ') + ';\n'
    + '  root.AlloPacketCheckDirections = data;\n  if (typeof module !== \'undefined\' && module && module.exports) module.exports = data;\n'
    + '})(typeof window !== \'undefined\' ? window : globalThis);\n';
  fs.writeFileSync(OUT, body);
  const written = ['packets_check_directions.js'];
  for (const m of MIRRORS) {
    const dir = path.join(ROOT, m);
    if (!fs.existsSync(dir)) continue;
    fs.writeFileSync(path.join(dir, 'packets_check_directions.js'), body);
    written.push(m + '/packets_check_directions.js');
  }
  return { written, kb: Math.round(Buffer.byteLength(body) / 1024) };
}

(async () => {
  const list = lines();
  if (process.argv.includes('--lines')) { list.forEach((t) => console.log(t)); return; }
  if (process.argv.includes('--check')) {
    const have = readClips();
    const missing = list.filter((t) => !have || !have.clips || !/^data:audio\/mpeg;base64,/.test(String(have.clips[t] || '')));
    const extra = have && have.clips ? Object.keys(have.clips).filter((t) => !list.includes(t)) : [];
    const stale = MIRRORS.filter((m) => fs.existsSync(path.join(ROOT, m, 'packets_check_directions.js')) && fs.readFileSync(path.join(ROOT, m, 'packets_check_directions.js'), 'utf8') !== fs.readFileSync(OUT, 'utf8'));
    if (missing.length || extra.length || stale.length) {
      missing.forEach((t) => console.error('No recording of: ' + t));
      extra.forEach((t) => console.error('A recording of words no screen shows: ' + t));
      stale.forEach((m) => console.error('Stale copy: ' + m + '/packets_check_directions.js'));
      process.exitCode = 1;
      return;
    }
    console.log('check directions are current (' + list.length + ' lines recorded)');
    return;
  }
  const clips = await record(list);
  const out = write(clips);
  console.log('Wrote ' + out.written.join(', ') + ' (' + out.kb + ' KB, ' + list.length + ' lines).');
})().catch((e) => { console.error(String(e && e.message || e)); process.exitCode = 1; });
