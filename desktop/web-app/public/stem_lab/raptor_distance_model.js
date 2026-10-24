/* Fixed-scene distance-detail illustration. Pure data and mathematics only.
 * The chosen Gaussian transfer is a teaching convention, not a fitted retinal
 * model, contrast-sensitivity function, perception test, or detection predictor.
 */
(function (global) {
  'use strict';
  if (global.RaptorDistanceModel) return;

  var VERSION = 1, WIDTH_M = .30, WIDE_FOV = 20, DETAIL_FOV = .75;
  var REFERENCE_LIMIT = 60, EAGLE_LIMIT = 140;
  var LOG_TEN = Math.log(10), DEGREE = Math.PI / 180;

  function freeze(value) {
    if (value && typeof value === 'object') {
      Object.keys(value).forEach(function (key) { freeze(value[key]); });
      Object.freeze(value);
    }
    return value;
  }
  function plain(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    var prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }
  function number(value, fallback, low, high) {
    return typeof value === 'number' && Number.isFinite(value)
      ? Math.round(Math.max(low, Math.min(high, value))) : fallback;
  }
  function normalize(raw) {
    var value = plain(raw) && raw.version === VERSION ? raw : {};
    return {
      version: VERSION,
      distance: number(value.distance, 120, 40, 300),
      contrast: number(value.contrast, 95, 10, 100),
      cycles: number(value.cycles, 12, 4, 20),
      widthM: WIDTH_M, wideFov: WIDE_FOV, detailFov: DETAIL_FOV
    };
  }
  function metrics(raw) {
    var settings = normalize(raw);
    var angleDeg = 2 * Math.atan(WIDTH_M / (2 * settings.distance)) / DEGREE;
    var cyclesPerDegree = settings.cycles / angleDeg;
    // Convention: each selected limit attenuates a sinusoid to 10% of its
    // input modulation. Neither limit is a hard visibility/detection cutoff.
    var referenceTransfer = Math.exp(-LOG_TEN * Math.pow(cyclesPerDegree / REFERENCE_LIMIT, 2));
    var eagleTransfer = Math.exp(-LOG_TEN * Math.pow(cyclesPerDegree / EAGLE_LIMIT, 2));
    return {
      settings: settings,
      angleDeg: angleDeg, cyclesPerDegree: cyclesPerDegree,
      referenceLimit: REFERENCE_LIMIT, eagleLimit: EAGLE_LIMIT,
      // This band only compares frequency with two illustrative reference
      // numbers. It deliberately does not change when input contrast changes.
      referenceBand: cyclesPerDegree <= REFERENCE_LIMIT ? 'both' : cyclesPerDegree <= EAGLE_LIMIT ? 'eagle' : 'neither',
      magnification: Math.tan(WIDE_FOV * DEGREE / 2) / Math.tan(DETAIL_FOV * DEGREE / 2),
      referenceTransfer: referenceTransfer, eagleTransfer: eagleTransfer,
      referenceAttenuation: referenceTransfer * settings.contrast / 100,
      eagleAttenuation: eagleTransfer * settings.contrast / 100
    };
  }
  function gaussianSigmaPixels(limit, widthPixels) {
    if (typeof limit !== 'number' || !Number.isFinite(limit) || limit <= 0 ||
        typeof widthPixels !== 'number' || !Number.isFinite(widthPixels) || widthPixels < 0) {
      throw new RangeError('Gaussian illustration needs a positive finite limit and nonnegative finite pixel width.');
    }
    var sigma = (widthPixels / DETAIL_FOV) / (2 * Math.PI * limit) * Math.sqrt(2 * LOG_TEN);
    if (!Number.isFinite(sigma)) throw new RangeError('Gaussian illustration exceeds finite sampling dimensions.');
    return sigma;
  }

  var presets = freeze({
    near: normalize({ version: VERSION, distance: 40, contrast: 95, cycles: 12 }),
    middle: normalize({ version: VERSION, distance: 120, contrast: 95, cycles: 12 }),
    far: normalize({ version: VERSION, distance: 300, contrast: 95, cycles: 12 })
  });
  var sources = freeze({
    eagle: {
      title: 'Reymond, 1985: spatial visual acuity of the wedge-tailed eagle',
      url: 'https://pubmed.ncbi.nlm.nih.gov/4090282/',
      species: 'Aquila audax', range: [132, 143], units: 'cycles per degree', selected: EAGLE_LIMIT,
      scope: 'Maximum behavioral acuity in the reported luminance experiment. Acuity declined at lower luminance. The selected 140 is an illustrative value within this range, not a parameter for every raptor.'
    },
    reference: {
      title: 'Potier, Mitkus and Kelber, 2018: resolution and contrast sensitivity',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6125913/',
      species: 'Human reference discussed in a Harris\'s hawk study', range: [30, 60], units: 'cycles per degree', selected: REFERENCE_LIMIT,
      scope: 'The introduction summarizes a published human achromatic-grating range of 30–60 cycles per degree. The selected 60 is its upper end, not a universal human threshold or a new measurement from this hawk experiment.'
    }
  });
  var assumptions = freeze({
    geometry: 'A centered, perpendicular 0.30 m target; exact visual-angle geometry. Both comparison conditions use the same target, distance and field of view.',
    magnification: 'Both detail panels share the same 0.75 degree horizontal field. Their equal display magnification relative to the 20 degree overview is a camera aid, not animal acuity.',
    filter: 'A chosen Gaussian illustration with 10% sinusoidal contrast transfer at each selected limit. This transfer curve is not a measured retina or a fitted biological contrast-sensitivity function.',
    contrast: 'The input modulation scales both Gaussian results equally. The frequency reference bands are not detection or recognition predictions, especially for low contrast.',
    sampling: 'Pixel width determines sigma in display pixels. Screen pixels, viewing conditions and the human viewer constrain the rendered demonstration; it is not a calibrated acuity test.',
    limits: 'No prey detection distance, species identification, hunting outcome, low-light response, color vision or live-flight physics is predicted.'
  });
  global.RaptorDistanceModel = Object.freeze({
    version: VERSION, normalize: normalize, metrics: metrics,
    gaussianSigmaPixels: gaussianSigmaPixels,
    presets: presets, sources: sources, assumptions: assumptions
  });
})(typeof window !== 'undefined' ? window : globalThis);
