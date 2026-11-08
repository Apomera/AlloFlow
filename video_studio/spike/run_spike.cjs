/*
 * run_spike.cjs - SPIKE (2026-11-07). Serves this folder on localhost (a secure context, which
 * WebCodecs needs), opens index.html in real browsers via Playwright, renders
 * sample_storyboard.json, and saves each MP4 to out/.
 *
 *   node run_spike.cjs                              # bundled Chromium + system Edge, default encoder
 *   node run_spike.cjs --browsers=msedge --hw=no-preference,prefer-hardware,prefer-software
 *
 * Browsers: chromium (Playwright's bundled build; x64 EMULATED on this ARM laptop),
 *           msedge / chrome (system installs, native).
 * Do NOT run this beside vitest or another Playwright run: timings are the point.
 */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');

const SPIKE = __dirname;
const OUT = path.join(SPIKE, 'out');
fs.mkdirSync(OUT, { recursive: true });
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const browsers = arg('browsers', 'chromium,msedge').split(',');
const hws = arg('hw', 'no-preference').split(',');
const soft = arg('soft', '1');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.webm': 'video/webm', '.png': 'image/png', '.wav': 'audio/wav', '.mp4': 'video/mp4', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  const file = path.normalize(path.join(SPIKE, p === '/' ? 'index.html' : p));
  if (!file.startsWith(SPIKE) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
});

async function runOne(name, hw, port) {
  const launchOpts = name === 'chromium' ? {} : { channel: name };
  const browser = await chromium.launch(launchOpts);
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  const logs = [];
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) logs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => logs.push('pageerror: ' + e.message));
  page.on('response', r => { if (r.status() >= 400) logs.push('HTTP ' + r.status() + ' ' + r.url()); });
  const t0 = Date.now();
  await page.goto('http://127.0.0.1:' + port + '/index.html?autorun=1&hw=' + hw + '&soft=' + soft + (arg('bitrate', '') ? '&bitrate=' + arg('bitrate', '') + '&mode=' + arg('mode', 'variable') : ''));
  await page.waitForFunction(() => window.__spikeDone === true, null, { timeout: 420000, polling: 500 });
  const wallMs = Date.now() - t0;
  const support = await page.evaluate(() => window.__support);
  const result = await page.evaluate(() => window.__spikeResult);
  const version = browser.version();
  let file = null;
  if (result && result.ok) {
    const b64 = await page.evaluate(async () => {
      const blob = await (await fetch(window.__spikeUrl)).blob();
      return await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(String(fr.result).split(',')[1]); fr.readAsDataURL(blob); });
    });
    file = path.join(OUT, name + '_' + hw + (arg('bitrate', '') ? '_' + Number(arg('bitrate', '')) / 1000 + 'k-' + arg('mode', 'variable') : '') + '.mp4');
    fs.writeFileSync(file, Buffer.from(b64, 'base64'));
    // also check that THIS browser can play back what it just made
    const play = await page.evaluate(async () => {
      const v = document.getElementById('player');
      const out = { readyState: v.readyState, duration: v.duration, videoWidth: v.videoWidth, error: v.error && v.error.message };
      try { v.muted = true; await v.play(); await new Promise(r => setTimeout(r, 600)); out.currentTimeAfter600ms = +v.currentTime.toFixed(2); out.played = true; v.pause(); } catch (e) { out.played = false; out.playError = String(e); }
      return out;
    });
    result.playback = play;
  }
  await browser.close();
  return { browser: name, version, hw, wallMs, support, result, file, logs };
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const all = [];
  for (const b of browsers) {
    for (const hw of hws) {
      process.stdout.write('== ' + b + ' / ' + hw + ' ... ');
      try {
        const r = await runOne(b, hw, port);
        all.push(r);
        const s = r.result && r.result.stats;
        process.stdout.write(r.result && r.result.ok
          ? 'ok ' + (r.wallMs / 1000).toFixed(1) + 's wall | ' + s.videoCodec + '/' + (s.audioCodec || '-') + ' | ' + s.renderFps + ' fps render | ' + (s.sizeBytes / 1e6).toFixed(2) + ' MB | x' + s.realtimeFactor + ' realtime\n'
          : 'FAILED: ' + (r.result && r.result.error || 'no result').split('\n')[0] + '\n');
      } catch (e) {
        all.push({ browser: b, hw, error: String(e && e.message || e) });
        process.stdout.write('ERROR ' + String(e && e.message || e).split('\n')[0] + '\n');
      }
    }
  }
  server.close();
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(all, null, 1));
  process.stdout.write('wrote out/results.json\n');
})();
