const assert=require('node:assert/strict'),zlib=require('node:zlib');
function pixels(bytes) {
  let width, height, channels, offset = 8;
  const parts = [];
  assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
  while (offset < bytes.length) {
    const size = bytes.readUInt32BE(offset), type = bytes.subarray(offset + 4, offset + 8).toString(), data = bytes.subarray(offset + 8, offset + 8 + size);
    offset += size + 12;
    if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); assert.equal(data[8], 8); assert.ok([2, 6].includes(data[9])); channels = data[9] === 6 ? 4 : 3; }
    if (type === 'IDAT') parts.push(data);
    if (type === 'IEND') break;
  }
  const raw = zlib.inflateSync(Buffer.concat(parts)), stride = width * channels, data = Buffer.alloc(stride * height);
  const paeth = (a, b, c) => { const p = a + b - c, da = Math.abs(p - a), db = Math.abs(p - b), dc = Math.abs(p - c); return da <= db && da <= dc ? a : db <= dc ? b : c; };
  for (let y = 0; y < height; y++) for (let x = 0; x < stride; x++) {
    const i = y * stride + x, f = raw[y * (stride + 1)], a = x >= channels ? data[i - channels] : 0, b = y ? data[i - stride] : 0, c = y && x >= channels ? data[i - stride - channels] : 0;
    assert.ok(f <= 4);
    data[i] = (raw[y * (stride + 1) + 1 + x] + (f === 0 ? 0 : f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : paeth(a, b, c))) & 255;
  }
  return { width, height, channels, data };
}
function stats(bytes) {
  const p = pixels(bytes), luminance = new Float64Array(p.width * p.height);
  let sum = 0, clipped = 0, nonblack = 0, xsum = 0, ysum = 0;
  for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++) {
    const i = (y * p.width + x) * p.channels, r = p.data[i], g = p.data[i + 1], b = p.data[i + 2], l = .2126 * Math.max(0, r - 1) + .7152 * Math.max(0, g - 3) + .0722 * Math.max(0, b - 6);
    luminance[y * p.width + x] = l; sum += l; xsum += x * l; ysum += y * l;
    if (l > 1) nonblack++;
    if (Math.min(r, g, b) >= 250) clipped++;
  }
  const cx = sum ? xsum / sum : 0, cy = sum ? ysum / sum : 0;
  let xx = 0, yy = 0, xy = 0, outer = 0;
  for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++) {
    const l = luminance[y * p.width + x], dx = x - cx, dy = y - cy;
    xx += dx * dx * l; yy += dy * dy * l; xy += dx * dy * l;
    // Exclude the central bulge to measure the surrounding emitted disk.
    if (Math.hypot(dx, dy) > p.height * .12) outer += l;
  }
  const discriminant = Math.hypot(xx - yy, 2 * xy), major = sum ? Math.sqrt(Math.max(0, (xx + yy + discriminant) / (2 * sum))) : 0, minor = sum ? Math.sqrt(Math.max(0, (xx + yy - discriminant) / (2 * sum))) : 0;
  return { width: p.width, height: p.height, sumLuminance: sum, meanLuminance: sum / (p.width * p.height), outerLuminance: outer, nonblackPixels: nonblack, clippedFraction: clipped / (p.width * p.height), centroid: [cx, cy], majorSigma: major, minorSigma: minor };
}
function difference(aBytes, bBytes) {
  const a = pixels(aBytes), b = pixels(bBytes);
  assert.equal(a.width, b.width); assert.equal(a.height, b.height);
  let absolute = 0, changed = 0, maximum = 0;
  for (let pixel = 0; pixel < a.width * a.height; pixel++) { let d = 0; for (let channel = 0; channel < 3; channel++) d += Math.abs(a.data[pixel * a.channels + channel] - b.data[pixel * b.channels + channel]); absolute += d; maximum = Math.max(maximum, d / 3); if (d) changed++; }
  return { meanAbsoluteRgb: absolute / (a.width * a.height * 3), changedFraction: changed / (a.width * a.height), maxMeanRgb: maximum };
}


module.exports={pixels,stats,difference};
