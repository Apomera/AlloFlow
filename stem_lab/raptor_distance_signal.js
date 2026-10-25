/* Read a supplied opaque pixel row from the existing distance-detail image.
 * Values are arithmetic mean RGB code values, not calibrated luminance or
 * predictions of retinal response, contrast sensitivity or animal detection.
 */
(function (global) {
  'use strict';
  if (global.RaptorDistanceSignal) return;

  var WIDTH = 1024, HEIGHT = 512;
  function own(value, key) { return Object.prototype.hasOwnProperty.call(value, key); }
  function snapshot(raw) {
    var evidence = global.RaptorDistanceEvidence;
    return evidence && evidence.version === 1 && typeof evidence.snapshot === 'function' ? evidence.snapshot(raw) : null;
  }
  function regionFor(settings) {
    var projectedWidth = settings.widthM / (2 * settings.distance * Math.tan(settings.detailFov * Math.PI / 360)) * WIDTH;
    var x0 = Math.ceil(WIDTH / 2 - projectedWidth * .30), x1 = Math.floor(WIDTH / 2 + projectedWidth * .30);
    return { x0: x0, x1: x1, y: HEIGHT / 2, count: x1 - x0 + 1,
      width: WIDTH, height: HEIGHT, plaqueWidthPixels: projectedWidth };
  }
  function region(rawSettings, width, height) {
    if (width !== WIDTH || height !== HEIGHT) return null;
    var settings = snapshot(rawSettings);
    return settings ? regionFor(settings) : null;
  }
  function readRow(raw, count) {
    var plainArray = Array.isArray(raw) && Object.getPrototypeOf(raw) === Array.prototype;
    if ((!plainArray && !(raw instanceof Uint8ClampedArray)) || raw.length !== count * 4) return null;
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
    var sample = regionFor(settings), human = readRow(humanRGBA, sample.count), eagle = readRow(eagleRGBA, sample.count);
    return human && eagle ? { settings: settings, region: sample, human: human, eagle: eagle } : null;
  }
  global.RaptorDistanceSignal = Object.freeze({ version: 1, region: region, fromRows: fromRows });
})(typeof window !== 'undefined' ? window : globalThis);
