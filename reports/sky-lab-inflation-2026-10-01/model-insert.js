
  // Constant-H expansion teaching model, with no inflaton dynamics or time calibration.
  // The physical wavelength is 2*pi*a/k; Hubble-scale crossing uses ck/(aH) = 1.
  var INFLATION_REFERENCE = { ns: 0.9649, nsError: 0.0042, pivotMpcInv: 0.05, tensorLimit: 0.036 };
  function inflationExpansionModel(saved) {
    var state = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
    function bounded(raw, low, high, fallback) {
      var value = typeof raw === 'number' || typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN;
      return Number.isFinite(value) ? Math.max(low, Math.min(high, value)) : fallback;
    }
    var folds = bounded(state.inflationFolds, 0, 60, 3), initialWaveH = bounded(state.inflationWaveH, 0.25, 2, 0.5);
    var stretch = Math.exp(folds), waveH = initialWaveH * stretch, modeScale = waveH / (2 * Math.PI);
    var crossingFolds = Math.log(2 * Math.PI / initialWaveH), ratioLog = Math.log(modeScale);
    var regime = Math.abs(ratioLog) < 1e-10 ? 'crossing' : ratioLog < 0 ? 'below' : 'above';
    function pattern(wavelength) {
      return Array.from({ length: 321 }, function(_, i) {
        var xH = i / 320;
        // Cosine displacement is illustrative, with unchanged amplitude.
        return { xH: xH, value: Math.cos(2 * Math.PI * (xH - 0.5) / wavelength) };
      });
    }
    var spectrum = { ns: INFLATION_REFERENCE.ns, nsError: INFLATION_REFERENCE.nsError,
      pivotMpcInv: INFLATION_REFERENCE.pivotMpcInv, tensorLimit: INFLATION_REFERENCE.tensorLimit,
      points: Array.from({ length: 81 }, function(_, i) {
        var q = Math.pow(10, -1 + i / 40);
        var a = Math.pow(q, INFLATION_REFERENCE.ns - INFLATION_REFERENCE.nsError - 1);
        var b = Math.pow(q, INFLATION_REFERENCE.ns + INFLATION_REFERENCE.nsError - 1);
        return { q: q, power: Math.pow(q, INFLATION_REFERENCE.ns - 1), low: Math.min(a, b), high: Math.max(a, b) };
      }) };
    return { folds: folds, initialWaveH: initialWaveH, stretch: stretch, volumeStretch: Math.exp(3 * folds),
      waveH: waveH, modeScale: modeScale, crossingFolds: crossingFolds, regime: regime,
      logStretch: folds / Math.LN10, logModeScale: Math.log10(initialWaveH / (2 * Math.PI)) + folds / Math.LN10,
      comovingHubbleRatio: Math.exp(-folds), beforePattern: pattern(initialWaveH), afterPattern: pattern(waveH),
      growth: Array.from({ length: 121 }, function(_, i) {
        var n = i / 2; return { folds: n, logStretch: n / Math.LN10, logModeScale: Math.log10(initialWaveH / (2 * Math.PI)) + n / Math.LN10 };
      }), spectrum: spectrum };
  }

