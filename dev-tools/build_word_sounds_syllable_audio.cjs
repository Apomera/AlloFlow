/* Fill only missing curated compounds, component words and whole-word recording
   template targets with the app's local
   Kokoro loader. Free model download on first run; no hosted speech API.
   Re-run to resume interrupted generation. --check decodes every required
   clips in Chromium without loading the model or changing output files.
   --reprocess re-encodes added clips from their cached raw WAVs.
   Requires Playwright Chromium and ffmpeg on PATH; caches stay in .tmp. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const bankPath = path.join(root, 'word_audio_kokoro_bank.json');
const mirrorPath = path.join(root, 'desktop/web-app/public/word_audio_kokoro_bank.json');
const manifestPath = path.join(__dirname, 'word_sounds_syllable_audio_manifest.json');
const work = path.join(root, '.tmp/word-sounds-syllable-audio');
const check = process.argv.includes('--check');
const reprocess = process.argv.includes('--reprocess');
const core = new Function(fs.readFileSync(path.join(root, 'word_sounds_core.js'), 'utf8') + '\nreturn createWordSoundsCore;')()();
const targets = core.syllableWords().sort();
const components = [...new Set(targets.flatMap(word => core.resolveSyllableTask(word, null, 'en').syllables))].sort();
// Recording hints are never sent to TTS: only the complete target word.
const recordingTargets = core.syllableCountWords().filter(word => !targets.includes(word)).sort();
const required = [...new Set([...targets, ...components, ...recordingTargets])].sort();
const bank = JSON.parse(fs.readFileSync(bankPath, 'utf8'));
const checkpointPath = path.join(work, 'generation-checkpoint.json');
const checkpoint = fs.existsSync(checkpointPath) ? JSON.parse(fs.readFileSync(checkpointPath, 'utf8')) : null;
if (checkpoint && !check) Object.assign(bank.words, checkpoint.words);
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const stableWords = words => JSON.stringify(Object.fromEntries(Object.entries(words).sort(([a], [b]) => a.localeCompare(b))));
const manifest = checkpoint && !check ? checkpoint.manifest : fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {
  version: 1,
  source: 'generated_speech',
  engine: 'kokoro-js@1.2.1 / onnx-community/Kokoro-82M-v1.0-ONNX (q8, wasm)',
  voice: 'af_heart', language: 'en-US', speed: 1,
  humanReviewed: false,
  validationNote: 'Native Chromium decoding and waveform measurements verify non-silent playable audio, not linguistic accuracy or human listening review.',
  post: 'trim(1% peak, 30ms/60ms margins) + ramp(2ms/6ms) + ffmpeg libopus 48kbps mono webm',
  baseline: { wordCount: Object.keys(bank.words).length, wordsSha256: sha(stableWords(bank.words)) },
  targets, components, clips: []
};
if (!check) {
  manifest.recordingTargets = recordingTargets;
  if (!manifest.recordingExpansion) manifest.recordingExpansion = {
    preservedWordCount: Object.keys(bank.words).length,
    preservedWordsSha256: sha(stableWords(bank.words)),
    addedWords: recordingTargets.filter(word => !bank.words[word])
  };
}
fs.mkdirSync(work, { recursive: true });
let browser;
const server = http.createServer((req, res) => {
  if (req.url === '/') { res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><html lang="en"><head><title>Local syllable audio build</title></head><body>Local speech generation</body></html>'); return; }
  if (req.url === '/kokoro_tts_loader.js') { res.setHeader('Content-Type', 'application/javascript'); res.end(fs.readFileSync(path.join(root, 'kokoro_tts_loader.js'))); return; }
  res.statusCode = 404; res.end();
});
function assert(condition, message) { if (!condition) throw new Error(message); }
async function writeText(file, text) {
  // OneDrive/antivirus may briefly hold generated files open on Windows.
  for (let attempt = 0; ; attempt++) {
    try { fs.writeFileSync(file, text); return; }
    catch (error) { if (attempt >= 39) throw error; await new Promise(resolve => setTimeout(resolve, 250)); }
  }
}
async function checkpointGeneration() {
  await writeText(checkpointPath, JSON.stringify({ manifest, words: Object.fromEntries(manifest.clips.map(clip => [clip.key, bank.words[clip.key]])) }));
}
async function persist() {
  bank._meta.syllableSupplement = { manifest: 'dev-tools/word_sounds_syllable_audio_manifest.json', addedWords: manifest.clips.length, generated: manifest.generated, humanReviewed: false };
  const bankText = JSON.stringify(bank);
  await writeText(bankPath, bankText);
  await writeText(mirrorPath, bankText);
  await writeText(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
}
async function measurements(page, src) {
  return page.evaluate(async uri => {
    const bytes = await (await fetch(uri)).arrayBuffer();
    const ctx = new AudioContext();
    try {
      const decoded = await ctx.decodeAudioData(bytes);
      const samples = decoded.getChannelData(0);
      let squares = 0, peak = 0, audible = 0, clipped = 0;
      for (const sample of samples) {
        squares += sample * sample;
        peak = Math.max(peak, Math.abs(sample));
        if (Math.abs(sample) > 0.01) audible++;
        if (Math.abs(sample) > 0.999) clipped++;
      }
      return { durationSeconds: decoded.duration, sampleRate: decoded.sampleRate, channels: decoded.numberOfChannels,
        peak, rms: Math.sqrt(squares / samples.length), audibleSeconds: audible / decoded.sampleRate,
        clippedFraction: clipped / samples.length };
    } finally { await ctx.close(); }
  }, src);
}
function validate(word, measured) {
  assert(measured.durationSeconds >= 0.2 && measured.durationSeconds <= 5, word + ': unexpected duration');
  assert(measured.peak > 0.025 && measured.rms > 0.003 && measured.audibleSeconds > 0.07, word + ': inaudible or silent clip');
  assert(measured.clippedFraction < 0.005, word + ': excessive clipping');
}
function trimWav(raw) {
  // Match the existing bank's silence margins; retain quiet word edges and
  // fade the new boundaries rather than abruptly cutting the PCM waveform.
  assert(raw.toString('ascii', 0, 4) === 'RIFF' && raw.toString('ascii', 36, 40) === 'data', 'Expected loader PCM WAV');
  assert(raw.readUInt16LE(20) === 1 && raw.readUInt16LE(22) === 1 && raw.readUInt16LE(34) === 16, 'Expected mono 16-bit PCM');
  const rate = raw.readUInt32LE(24), length = raw.readUInt32LE(40) / 2;
  let peak = 0;
  for (let i = 0; i < length; i++) peak = Math.max(peak, Math.abs(raw.readInt16LE(44 + i * 2)));
  assert(peak > 0, 'Silent source PCM');
  let first = 0, last = length - 1;
  while (first < last && Math.abs(raw.readInt16LE(44 + first * 2)) < peak * 0.01) first++;
  while (last > first && Math.abs(raw.readInt16LE(44 + last * 2)) < peak * 0.01) last--;
  const start = Math.max(0, first - Math.round(rate * 0.03));
  const end = Math.min(length, last + 1 + Math.round(rate * 0.06));
  const count = end - start;
  const wav = Buffer.alloc(44 + count * 2);
  raw.copy(wav, 0, 0, 44); wav.writeUInt32LE(36 + count * 2, 4); wav.writeUInt32LE(count * 2, 40);
  const fadeIn = Math.min(Math.round(rate * 0.002), Math.floor(count / 2));
  const fadeOut = Math.min(Math.round(rate * 0.006), Math.floor(count / 2));
  for (let i = 0; i < count; i++) {
    const gain = Math.min(1, i / fadeIn, (count - 1 - i) / fadeOut);
    wav.writeInt16LE(Math.round(raw.readInt16LE(44 + (start + i) * 2) * gain), 44 + i * 2);
  }
  return { wav, sourceDurationSeconds: length / rate, trimmedLeadingSeconds: start / rate, trimmedTrailingSeconds: (length - end) / rate };
}
async function run() {
  const added = new Set(manifest.clips.map(clip => clip.key));
  const original = Object.fromEntries(Object.entries(bank.words).filter(([word]) => !added.has(word)));
  assert(Object.keys(original).length === manifest.baseline.wordCount && sha(stableWords(original)) === manifest.baseline.wordsSha256, 'Existing bank clips changed');
  if (manifest.recordingExpansion) {
    const newRecordingWords = new Set(manifest.recordingExpansion.addedWords);
    const preserved = Object.fromEntries(Object.entries(bank.words).filter(([word]) => !newRecordingWords.has(word)));
    assert(Object.keys(preserved).length === manifest.recordingExpansion.preservedWordCount && sha(stableWords(preserved)) === manifest.recordingExpansion.preservedWordsSha256, 'Prior compound bank clips changed');
  }
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(17387, '127.0.0.1', resolve); });
  browser = await chromium.launchPersistentContext(path.join(work, 'chromium-profile'), { headless: true, timeout: 120000, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = browser.pages()[0] || await browser.newPage();
  page.on('pageerror', error => console.error('Browser:', error.message));
  await page.goto('http://127.0.0.1:17387/');
  const missing = required.filter(word => !bank.words[word]);
  if (check) assert(missing.length === 0, 'Missing required audio: ' + missing.join(', '));
  if (missing.length && !check) {
    let lastLog = '';
    page.on('console', message => {
      const text = message.text();
      if (/Kokoro|model|Error|failed/i.test(text) && text !== lastLog) { console.log(text.slice(0, 220)); lastLog = text; }
    });
    await page.addScriptTag({ url: '/kokoro_tts_loader.js' });
    console.log('Initializing local Kokoro q8; ' + missing.length + ' missing clips.');
    await page.evaluate(() => window._kokoroTTS.init());
  }
  if (!check) {
    for (const word of reprocess ? manifest.clips.map(clip => clip.key) : missing) {
      const started = Date.now();
      const inputPath = path.join(work, word + '.wav');
      if (reprocess) assert(fs.existsSync(inputPath), 'Reprocessing needs cached raw WAV: ' + word);
      else {
        const wav = await page.evaluate(async text => {
          const url = await window._kokoroTTS.speak(text, 'af_heart', 1);
          if (!url) throw new Error('Local speech generation failed: ' + text);
          const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
          let binary = ''; for (let offset = 0; offset < bytes.length; offset += 16384) binary += String.fromCharCode(...bytes.subarray(offset, offset + 16384));
          return btoa(binary);
        }, word);
        fs.writeFileSync(inputPath, Buffer.from(wav, 'base64'));
      }
      const trimmed = trimWav(fs.readFileSync(inputPath));
      const trimmedPath = path.join(work, word + '.trimmed.wav');
      const outputPath = path.join(work, word + '.webm');
      fs.writeFileSync(trimmedPath, trimmed.wav);
      const encoded = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', trimmedPath, '-ac', '1', '-c:a', 'libopus', '-b:a', '48k', outputPath], { encoding: 'utf8', windowsHide: true });
      assert(encoded.status === 0, 'ffmpeg failed: ' + encoded.stderr);
      const bytes = fs.readFileSync(outputPath);
      const src = 'data:audio/webm;base64,' + bytes.toString('base64');
      const measured = await measurements(page, src); validate(word, measured);
      const previous = manifest.clips.find(clip => clip.key === word);
      const generated = previous?.generated || new Date().toISOString();
      bank.words[word] = src;
      manifest.generated = generated;
      manifest.post = 'trim(1% peak, 30ms/60ms margins) + ramp(2ms/6ms) + ffmpeg libopus 48kbps mono webm';
      manifest.clips = manifest.clips.filter(clip => clip.key !== word);
      manifest.clips.push({ key: word, generated, source: 'generated_speech', humanReviewed: false, voice: 'af_heart', speed: 1,
        bytes: bytes.length, sha256: sha(bytes), sourceDurationSeconds: trimmed.sourceDurationSeconds,
        trimmedLeadingSeconds: trimmed.trimmedLeadingSeconds, trimmedTrailingSeconds: trimmed.trimmedTrailingSeconds, ...measured });
      await checkpointGeneration();
      console.log((reprocess ? 'Reprocessed' : 'Generated ' + manifest.clips.length) + ': ' + word + ' (' + measured.durationSeconds.toFixed(2) + 's, ' + (Date.now() - started) + 'ms build)');
    }
  }
  const decoded = [];
  for (const word of required) {
    const measured = await measurements(page, bank.words[word]); validate(word, measured);
    decoded.push({ word, ...measured });
  }
  if (!check) await persist();
  assert(fs.readFileSync(bankPath, 'utf8') === fs.readFileSync(mirrorPath, 'utf8'), 'Public bank mirror differs');
  const result = { checkedAt: new Date().toISOString(), targets: targets.length, components: components.length, recordingTargets: recordingTargets.length, requiredClips: required.length,
    addedClips: manifest.clips.length, allDecodedAudible: true, humanReviewed: false, bankBytes: fs.statSync(bankPath).size, decoded };
  fs.writeFileSync(path.join(work, 'validation.json'), JSON.stringify(result, null, 2) + '\n');
  console.log('PASS ' + targets.length + ' compound targets, ' + components.length + ' components and ' + recordingTargets.length + ' recording targets; ' + required.length + ' playable audible clips; existing clips preserved.');
}
run().catch(error => { console.error(error.stack || error); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); server.close(); });
