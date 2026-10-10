const fs = require('fs'), path = require('path'), assert = require('assert/strict'), crypto = require('crypto');
const repo = process.env.WORD_SOUNDS_REPO || 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const moduleFile = process.argv.includes('--repo') ? path.join(repo, 'word_sounds_module.js') : path.join(__dirname, 'candidate/word_sounds_module.js');
const { chromium } = require(require.resolve('playwright', { paths: [repo] }));
const source = fs.readFileSync(moduleFile, 'utf8'), core = fs.readFileSync(path.join(repo, 'word_sounds_core.js'), 'utf8');
const editor = source.slice(source.indexOf('// BEGIN WORD SOUNDS SYLLABLE RECORDING EDITOR'), source.indexOf('// END WORD SOUNDS SYLLABLE RECORDING EDITOR'));
const wordBank = JSON.parse(fs.readFileSync(path.join(repo, 'word_audio_kokoro_bank.json'), 'utf8'));
const fixtures = Object.fromEntries(['sun', 'set'].map(word => [word, wordBank.words[word]]));
assert.ok(Object.values(fixtures).every(value => typeof value === 'string' && value.startsWith('data:audio/')));
let browser;
async function run() {
  browser = await chromium.launch({ headless: true, timeout: 120000 }); const page = await browser.newPage();
  await page.setContent('<!doctype html><title>Native syllable cleanup verification</title>');
  await page.addScriptTag({ content: core + '\nconst WS_CORE = createWordSoundsCore();\n' + editor });
  const results = await page.evaluate(async bankFixtures => {
    const samples = new Float32Array(16000 * 1.5);
    for (let i = 8000; i < 16000; i++) samples[i] = .18 * Math.sin(i * Math.PI / 18);
    // Quiet frication outside the voiced center must survive native decode and cleanup.
    for (let i = 7200; i < 8000; i++) samples[i] = .0003 * Math.sin(i * Math.PI / 2);
    for (let i = 16000; i < 16800; i++) samples[i] = .0003 * Math.sin(i * Math.PI / 2);
    const bytes = encodeWordSoundsSyllableWav([samples], 16000);
    const input = await readWordSoundsSyllableRecording(new Blob([bytes], { type: 'audio/wav' }));
    // Chromium resamples 16 kHz input into the offline context's 44.1 kHz rate;
    // compare against that decoded peak so interpolation overshoot is accounted for.
    const inputDecoded = await decodeWordSoundsSyllableBytes(bytes, window.OfflineAudioContext);
    let inputPeak = 0; for (const sample of inputDecoded.getChannelData(0)) inputPeak = Math.max(inputPeak, Math.abs(sample));
    const cleaned = await cleanWordSoundsSyllableRecording(input, { trimSilence: true, levelVolume: true });
    const decoded = await decodeWordSoundsSyllableBytes(Uint8Array.from(atob(cleaned.asset.base64), c => c.charCodeAt(0)).buffer, window.OfflineAudioContext);
    const output = decoded.getChannelData(0); let peak = 0, earliest = output.length, latest = -1;
    for (let i = 0; i < output.length; i++) { peak = Math.max(peak, Math.abs(output[i])); if (Math.abs(output[i]) > .0001) { earliest = Math.min(earliest, i); latest = i; } }
    const task = WS_CORE.createReviewedSyllableTask({ targetWord: 'sunset', language: 'en', syllables: ['sun', 'set'], assets: [cleaned.asset, cleaned.asset], revision: 1, reviewed: true });
    const storedClips = []; let paddedFixture;
    for (const [word, dataUrl] of Object.entries(bankFixtures)) {
      const [header, base64] = dataUrl.split(','), mime = header.slice(5).split(';')[0];
      const bankBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0)).buffer;
      const checked = await readWordSoundsSyllableRecording(new Blob([bankBytes], { type: mime }));
      if (word === 'sun') {
        const originalDecoded = await decodeWordSoundsSyllableBytes(bankBytes, window.OfflineAudioContext);
        const margin = Math.round(originalDecoded.sampleRate * .6), originalChannel = originalDecoded.getChannelData(0);
        const padded = new Float32Array(originalChannel.length + margin * 2);
        for (let index = 0; index < originalChannel.length; index++) padded[margin + index] = originalChannel[index] * .25;
        const paddedWav = encodeWordSoundsSyllableWav([padded], originalDecoded.sampleRate);
        let binary = ''; for (const byte of new Uint8Array(paddedWav)) binary += String.fromCharCode(byte);
        paddedFixture = { base64: btoa(binary), source: 'word_audio_kokoro_bank.json: sun', sourceMime: mime, sourceDuration: originalDecoded.duration, duration: padded.length / originalDecoded.sampleRate, sampleRate: originalDecoded.sampleRate, channels: 1, bytes: paddedWav.byteLength, paddingSecondsEachEnd: .6, gain: .25 };
      }
      const bankResult = await cleanWordSoundsSyllableRecording(checked, { trimSilence: true, levelVolume: true });
      const bankDecoded = await decodeWordSoundsSyllableBytes(Uint8Array.from(atob(bankResult.asset.base64), c => c.charCodeAt(0)).buffer, window.OfflineAudioContext);
      let bankPeak = 0; for (const sample of bankDecoded.getChannelData(0)) bankPeak = Math.max(bankPeak, Math.abs(sample));
      storedClips.push({ word, sourceMime: mime, outputMime: bankResult.asset.mime, duration: bankDecoded.duration, originalDuration: checked.durationSeconds, gain: bankResult.gain, peak: bankPeak, bytes: atob(bankResult.asset.base64).length, validAsset: !!WS_CORE.syllableAssetSource(bankResult.asset) });
    }
    return { inputDuration: input.durationSeconds, inputPeak, outputDuration: decoded.duration, removedSeconds: cleaned.removedSeconds, gain: cleaned.gain, peak, leadingMargin: earliest / decoded.sampleRate, trailingMargin: (output.length - latest - 1) / decoded.sampleRate, byteLength: atob(cleaned.asset.base64).length, validSavedBoard: WS_CORE.reviewedSyllableReady(task), mime: cleaned.asset.mime, sampleRate: decoded.sampleRate, channels: decoded.numberOfChannels, storedClips, paddedFixture };
  }, fixtures);
  const fixtureDirectory = path.resolve(__dirname, '../next-browser-results'); fs.mkdirSync(fixtureDirectory, { recursive: true });
  fs.writeFileSync(path.join(fixtureDirectory, 'sun-padded.wav'), Buffer.from(results.paddedFixture.base64, 'base64'));
  delete results.paddedFixture.base64;
  fs.writeFileSync(path.join(fixtureDirectory, 'sun-padded.json'), JSON.stringify(results.paddedFixture, null, 2));
  console.log('Native cleanup measurements', JSON.stringify(results));
  assert.ok(Math.abs(results.inputDuration - 1.5) < .01); assert.equal(results.mime, 'audio/wav'); assert.equal(results.gain, 2);
  assert.ok(results.removedSeconds > .45 && results.removedSeconds < .55); assert.ok(results.outputDuration > .99 && results.outputDuration < 1.02);
  assert.ok(Math.abs(results.peak - results.inputPeak * results.gain) < .001); assert.ok(results.leadingMargin >= .195 && results.leadingMargin < .205); assert.ok(results.trailingMargin >= .195 && results.trailingMargin < .205);
  assert.ok(results.byteLength <= 384000); assert.equal(results.validSavedBoard, true); assert.equal(results.channels, 1);
  for (const clip of results.storedClips) {
    assert.equal(clip.outputMime, 'audio/wav'); assert.ok(clip.gain > 0 && clip.gain <= 2); assert.ok(clip.peak > .0001 && clip.peak <= .801);
    assert.ok(clip.duration >= .08 && clip.duration <= clip.originalDuration + .001); assert.ok(clip.bytes <= 384000); assert.equal(clip.validAsset, true);
  }
  fs.writeFileSync(path.join(__dirname, 'native-results.json'), JSON.stringify({ passed: true, moduleSha256: crypto.createHash('sha256').update(source).digest('hex'), results, limits: 'Real Chromium OfflineAudioContext decode of generated PCM WAV and stored Kokoro sun/set bank recordings; no microphone hardware or subjective pronunciation assessment.' }, null, 2));
  console.log('PASS native Chromium PCM WAV and stored Kokoro bank decode, cleanup, second decode and reviewed-board validation', JSON.stringify(results));
}
run().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => browser?.close());
