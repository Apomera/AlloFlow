'use strict';
// Unit-test the SD-Turbo loader's pure pipeline math in node.
global.window = {};
require(require('path').join(__dirname, '..', 'sd_turbo_loader.js'));
const I = global.window._sdTurbo.__internals;
let passed = 0; const failures = [];
const check = (name, cond) => { if (cond) passed += 1; else { failures.push(name); console.error('FAIL: ' + name); } };

// randn: mean ~0, std ~sigma
const n = 65536;
const lat = I.randnLatents(n, I.constants.SIGMA);
const mean = lat.reduce((a, b) => a + b, 0) / n;
const std = Math.sqrt(lat.reduce((a, b) => a + b * b, 0) / n - mean * mean);
check('randn mean ~ 0', Math.abs(mean) < 0.5);
check('randn std ~ sigma', Math.abs(std - I.constants.SIGMA) < 0.5);

// scale: x / sqrt(sigma^2+1)
const scaled = I.scaleModelInputs(new Float32Array([14.648737]), I.constants.SIGMA);
check('c_in scaling', Math.abs(scaled[0] - 14.648737 / Math.sqrt(I.constants.SIGMA ** 2 + 1)) < 1e-6);

// denoise: (sample - sigma*eps)/0.18215 — hand-computed
const den = I.denoiseToVaeLatents(new Float32Array([2.0]), new Float32Array([0.1]), I.constants.SIGMA, I.constants.VAE_SCALING);
const expected = (2.0 - I.constants.SIGMA * 0.1) / I.constants.VAE_SCALING;
check('denoise formula', Math.abs(den[0] - expected) < 1e-5);

// chwToRgba: -1 → 0, 0 → 128, 1 → 255, alpha 255; correct plane indexing
const w = 2, h = 1, plane = w * h;
const chw = new Float32Array(3 * plane);
chw[0 * plane + 0] = -1; chw[1 * plane + 0] = 0; chw[2 * plane + 0] = 1;   // pixel0 RGB
chw[0 * plane + 1] = 1;  chw[1 * plane + 1] = -1; chw[2 * plane + 1] = 0;  // pixel1 RGB
const rgba = I.chwToRgba(chw, w, h);
check('rgba pixel0', rgba[0] === 0 && rgba[1] === 128 && rgba[2] === 255 && rgba[3] === 255);
check('rgba pixel1', rgba[4] === 255 && rgba[5] === 0 && rgba[6] === 128 && rgba[7] === 255);

// half round-trip on representative latent values
const vals = new Float32Array([0, 1, -1, 0.5, 14.6146, -14.6146, 3.14159, 1e-3]);
const rt = I.fromHalf(I.toHalf(vals));
let maxRel = 0;
for (let i = 1; i < vals.length; i++) maxRel = Math.max(maxRel, Math.abs(rt[i] - vals[i]) / Math.abs(vals[i]));
check('fp16 round-trip < 0.1% rel error', rt[0] === 0 && maxRel < 1e-3);

console.log('\n[SD math] ' + passed + ' passed, ' + failures.length + ' failed');
process.exit(failures.length ? 1 : 0);
