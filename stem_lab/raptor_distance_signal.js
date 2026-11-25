/* Read a supplied opaque pixel row from the existing distance-detail image.
 * Values are arithmetic mean RGB code values, not calibrated luminance or
 * predictions of retinal response, contrast sensitivity or animal detection.
 */
(function (global) {
  'use strict';
  if (!global || typeof global !== 'object' || global.RaptorDistanceSignal) return;

  var WIDTH = 1024, HEIGHT = 512;
  function own(value, key) { return Object.prototype.hasOwnProperty.call(value, key); }
  function snapshot(raw) {
    var evidence = global.RaptorDistanceEvidence;
    return evidence && evidence.version === 1 && typeof evidence.snapshot === 'function' ? evidence.snapshot(raw) : null;
  }
  function regionFor(settings) {
    if (!settings || typeof settings !== 'object' ||
        typeof settings.widthM !== 'number' || !Number.isFinite(settings.widthM) || settings.widthM <= 0 ||
        typeof settings.distance !== 'number' || !Number.isFinite(settings.distance) || settings.distance <= 0 ||
        typeof settings.detailFov !== 'number' || !Number.isFinite(settings.detailFov) || settings.detailFov <= 0 || settings.detailFov >= 180) return null;
    var denom = 2 * settings.distance * Math.tan(settings.detailFov * Math.PI / 360);
    if (!Number.isFinite(denom) || denom <= 0) return null;
    var projectedWidth = settings.widthM / denom * WIDTH;
    if (!Number.isFinite(projectedWidth) || projectedWidth <= 0) return null;
    var x0 = Math.ceil(WIDTH / 2 - projectedWidth * .30), x1 = Math.floor(WIDTH / 2 + projectedWidth * .30);
    var count = x1 - x0 + 1;
    if (!Number.isInteger(x0) || !Number.isInteger(x1) || x0 < 0 || x1 >= WIDTH || count <= 0) return null;
    return { x0: x0, x1: x1, y: HEIGHT / 2, count: count,
      width: WIDTH, height: HEIGHT, plaqueWidthPixels: projectedWidth };
  }
  function region(rawSettings, width, height) {
    if (width !== WIDTH || height !== HEIGHT) return null;
    var settings = snapshot(rawSettings);
    return settings ? regionFor(settings) : null;
  }
  function readRow(raw, count) {
    if (!Number.isInteger(count) || count <= 0) return null;
    var plainArray = Array.isArray(raw) && Object.getPrototypeOf(raw) === Array.prototype;
    var plainClamped = typeof Uint8ClampedArray === 'function' && raw instanceof Uint8ClampedArray &&
      Object.getPrototypeOf(raw) === Uint8ClampedArray.prototype;
    if ((!plainArray && !plainClamped) || raw.length !== count * 4) return null;
    var values = [], min = Infinity, max = -Infinity;
    for (var i = 0; i < raw.length; i += 4) {
      var sum = 0;
      for (var channel = 0; channel < 4; channel++) {
        if (!own(raw, i + channel)) return null;
        var value = raw[i + channel];
        if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 255 ||
            (channel === 3 && value !== 255)) return null;
        if (channel < 3) sum += value;
      }
      var mean = sum / 3;
      values.push(mean); min = Math.min(min, mean); max = Math.max(max, mean);
    }
    return { values: values, min: min, max: max, range: max - min };
  }
  function fromRows(rawSettings, humanRGBA, eagleRGBA) {
    var settings = snapshot(rawSettings);
    if (!settings) return null;
    var sample = regionFor(settings);
    if (!sample) return null;
    var human = readRow(humanRGBA, sample.count), eagle = readRow(eagleRGBA, sample.count);
    return human && eagle ? { settings: settings, region: sample, human: human, eagle: eagle } : null;
  }
  global.RaptorDistanceSignal = Object.freeze({ version: 1, region: region, fromRows: fromRows });
})(typeof window !== 'undefined' && window && typeof window === 'object' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));
