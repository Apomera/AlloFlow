
  // Rounded Planck 2018 central inputs; flat matter + cosmological constant.
  // Radiation and detailed neutrino evolution are omitted: restrict to z <= 15.
  var COSMIC_DISTANCE = { h0: 67.4, omegaM: 0.315, cKms: 299792.458,
    mpcKm: 3.0856775814913673e19, gyrSeconds: 31557600e9, comparisonH0: 73.04 };
  function cosmicDistanceIntegral(z) {
    if (z === 0) return 0;
    function f(x) { return 1 / Math.sqrt(COSMIC_DISTANCE.omegaM * Math.pow(1 + x, 3) + 1 - COSMIC_DISTANCE.omegaM); }
    function integrate(a, b, fa, fm, fb, whole, tolerance, depth) {
      var m = (a + b) / 2, fl = f((a + m) / 2), fr = f((m + b) / 2);
      var left = (m - a) * (fa + 4 * fl + fm) / 6, right = (b - m) * (fm + 4 * fr + fb) / 6;
      var error = left + right - whole;
      if (depth === 0 || Math.abs(error) <= 15 * tolerance) return left + right + error / 15;
      return integrate(a, m, fa, fl, fm, left, tolerance / 2, depth - 1)
        + integrate(m, b, fm, fr, fb, right, tolerance / 2, depth - 1);
    }
    var fa = f(0), fm = f(z / 2), fb = f(z);
    return integrate(0, z, fa, fm, fb, z * (fa + 4 * fm + fb) / 6, 1e-10, 18);
  }
  function cosmicAgeFactor(z) {
    var lambda = 1 - COSMIC_DISTANCE.omegaM;
    return 2 / (3 * Math.sqrt(lambda)) * Math.asinh(Math.sqrt(lambda / COSMIC_DISTANCE.omegaM) / Math.pow(1 + z, 1.5));
  }
  // Cache only dimensionless reference curves; returned samples remain private copies.
  var cosmicDistanceSamples = null;
  function cosmicDistanceModel(saved) {
    var state = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
    function bounded(raw, low, high, fallback) {
      var number = typeof raw === 'number' || typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN;
      return Number.isFinite(number) ? Math.max(low, Math.min(high, number)) : fallback;
    }
    var z = Math.round(bounded(state.cosmoZ, 0, 15, 1) * 10000) / 10000;
    var h0 = bounded(state.cosmoH0, 50, 90, COSMIC_DISTANCE.h0);
    var hubbleGyr = COSMIC_DISTANCE.mpcKm / h0 / COSMIC_DISTANCE.gyrSeconds, ageNow = cosmicAgeFactor(0) * hubbleGyr;
    function quantities(redshift, integral) {
      var ageThen = cosmicAgeFactor(redshift) * hubbleGyr, lookback = ageNow - ageThen;
      // One Gyr times c equals one billion light-years, using the same Julian year.
      var nowGly = integral * hubbleGyr;
      return { z: redshift, scaleFactor: 1 / (1 + redshift), ageGyr: ageThen,
        lookbackGyr: lookback, lightTravelGly: lookback, nowGly: nowGly,
        thenGly: nowGly / (1 + redshift) };
    }
    if (!cosmicDistanceSamples) cosmicDistanceSamples = Array.from({ length: 151 }, function(_, i) {
      var redshift = i / 10; return { z: redshift, integral: cosmicDistanceIntegral(redshift) };
    });
    var selected = quantities(z, cosmicDistanceIntegral(z));
    return Object.assign(selected, { h0: h0, omegaM: COSMIC_DISTANCE.omegaM, omegaLambda: 1 - COSMIC_DISTANCE.omegaM,
      ageNowGyr: ageNow, hubbleGyr: hubbleGyr, nowMpc: COSMIC_DISTANCE.cKms / h0 * cosmicDistanceIntegral(z),
      redshiftReference: REDSHIFT_REFERENCES.find(function(reference) { return reference.id === state.cosmoRedshiftReference && Math.abs(reference.z - z) < 0.00005; }) || null,
      source: h0 === COSMIC_DISTANCE.h0 ? 'planck' : h0 === COSMIC_DISTANCE.comparisonH0 ? 'shoes' : 'custom',
      samples: cosmicDistanceSamples.map(function(p) { return quantities(p.z, p.integral); }) });
  }

