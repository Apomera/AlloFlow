const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const repo = process.env.WORD_SOUNDS_REPO || 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const file = process.argv.includes('--repo') ? path.join(repo, 'word_sounds_module.js') : path.join(__dirname, 'candidate/word_sounds_module.js');
const source = fs.readFileSync(file, 'utf8');
const begin = source.indexOf('// BEGIN WORD SOUNDS SYLLABLE RECORDING EDITOR'), end = source.indexOf('// END WORD SOUNDS SYLLABLE RECORDING EDITOR');
assert.ok(begin >= 0 && end > begin);
const context = { window: {}, Float32Array, ArrayBuffer, DataView, Number, Math, Array, Error };
vm.createContext(context); vm.runInContext(source.slice(begin, end), context);
const processPcm = context.processWordSoundsSyllablePcm, encode = context.encodeWordSoundsSyllableWav;
const rate = 16000, count = 16000;
let groups = 0;
function check(name, run) { run(); groups++; console.log('PASS ' + name); }
const signal = () => { const a = new Float32Array(count); for (let i = 6400; i < 9600; i++) a[i] = .2 * Math.sin((i - 6400) * Math.PI / 16); a[6100] = .00015; a[9900] = -.00015; return a; };
check('trim preserves quiet consonants and 200 ms on both sides', () => {
  const original = signal(), before = original.slice();
  const result = processPcm([original], rate, { trimSilence: true });
  assert.equal(result.startFrame, 2900); assert.equal(result.endFrame, 13101);
  assert.ok(result.channels[0][3200] > .0001); assert.ok(result.channels[0][7000] < -.0001);
  assert.deepEqual(original, before); assert.equal(result.gain, 1);
});
check('speech touching either edge retains that edge', () => {
  const a = signal(); a[0] = .00011; a[count - 1] = -.00011;
  const r = processPcm([a], rate, { trimSilence: true }); assert.equal(r.startFrame, 0); assert.equal(r.endFrame, count);
});
check('tiny silence edits under 100 ms leave boundaries unchanged', () => {
  const a = signal(); a[3600] = .001; a[12400] = .001;
  const r = processPcm([a], rate, { trimSilence: true }); assert.equal(r.startFrame, 0); assert.equal(r.endFrame, count);
});
check('constant low background stays present rather than removing frication', () => {
  const a = signal(); for (let i = 0; i < count; i++) if (!a[i]) a[i] = .0002;
  const r = processPcm([a], rate, { trimSilence: true }); assert.equal(r.startFrame, 0); assert.equal(r.endFrame, count);
});
check('leveling caps quiet-recording boosts at two', () => {
  const a = signal(), r = processPcm([a], rate, { levelVolume: true });
  assert.equal(r.gain, 2); assert.ok(Math.max(...r.channels[0]) <= .401); assert.equal(r.channels[0].length, count);
});
check('loud-recording leveling keeps headroom', () => {
  const a = signal(); a[7000] = 1;
  const r = processPcm([a], rate, { levelVolume: true }); assert.equal(r.gain, .8); assert.ok(Math.abs(r.channels[0][7000] - .8) < 1e-6);
});
check('both stereo channels determine trim bounds and gain without cancellation', () => {
  const left = signal(), right = Float32Array.from(left, v => -v); right[1000] = -.5;
  const r = processPcm([left, right], rate, { trimSilence: true, levelVolume: true });
  assert.equal(r.startFrame, 0); assert.equal(r.gain, 1.6); assert.ok(r.channels[0][7000] * r.channels[1][7000] <= 0); assert.equal(r.channels.length, 2);
});
check('disabled options preserve all sample values', () => {
  const a = signal(), r = processPcm([a], rate, {}); assert.deepEqual(r.channels[0], a); assert.equal(r.removedSeconds, 0); assert.equal(r.gain, 1);
});
check('silent and invalid PCM fail before output', () => {
  assert.throws(() => processPcm([new Float32Array(count)], rate, {}), /silent/);
  const invalid = signal(); invalid[1] = NaN; assert.throws(() => processPcm([invalid], rate, {}), /invalid audio samples/);
  assert.throws(() => processPcm([signal(), new Float32Array(3)], rate, {}), /between/);
  assert.throws(() => processPcm([signal()], 0, {}), /sample rate/);
});
check('WAV header and PCM16 mono samples use standard little-endian encoding', () => {
  const a = signal(); a[0] = -1; a[1] = 1; a[2] = .5;
  const wav = encode([a], rate), v = new DataView(wav), b = Buffer.from(wav);
  assert.equal(b.subarray(0, 4).toString(), 'RIFF'); assert.equal(b.subarray(8, 12).toString(), 'WAVE');
  assert.equal(v.getUint32(4, true), wav.byteLength - 8); assert.equal(v.getUint16(20, true), 1);
  assert.equal(v.getUint16(22, true), 1); assert.equal(v.getUint32(24, true), rate); assert.equal(v.getUint16(34, true), 16);
  assert.equal(v.getUint32(40, true), count * 2); assert.equal(v.getInt16(44, true), -32768); assert.equal(v.getInt16(46, true), 32767); assert.equal(v.getInt16(48, true), 16384);
});
check('WAV stereo channels interleave correctly', () => {
  const left = signal(), right = signal(); left[0] = .25; right[0] = -.5;
  const v = new DataView(encode([left, right], rate)); assert.equal(v.getUint16(22, true), 2); assert.equal(v.getUint16(32, true), 4);
  assert.equal(v.getInt16(44, true), 8192); assert.equal(v.getInt16(46, true), -16384);
});
check('oversize cleaned output fails within existing delivery cap', () => {
  assert.throws(() => encode([new Float32Array(44100 * 8)], 44100), /384 KB/);
});
check('nonfinite WAV samples fail instead of becoming valid-looking audio', () => {
  const a = signal(); a[0] = Infinity; assert.throws(() => encode([a], rate), /invalid audio samples/);
});
check('all output durations match sample count exactly', () => {
  for (const sampleRate of [8000, 16000, 44100, 48000]) { const a = new Float32Array(sampleRate); a[Math.floor(sampleRate / 2)] = .5;
    const r = processPcm([a], sampleRate, { trimSilence: true, levelVolume: true });
    assert.equal(r.durationSeconds, r.channels[0].length / sampleRate); assert.ok(r.durationSeconds >= .4 && r.durationSeconds < .401);
    assert.equal(encode(r.channels, sampleRate).byteLength, 44 + r.channels[0].length * 2);
  }
});
console.log(JSON.stringify({ groups, source: file }));
