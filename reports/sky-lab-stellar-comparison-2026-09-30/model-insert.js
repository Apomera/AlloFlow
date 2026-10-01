
  // Fixed literature examples: Bond et al. (2017), sections 8 and 9.
  // Sirius B's quoted thermal uncertainties are internal fit errors.
  var HR_STELLAR_REFERENCES = [
    { id: 'sun', name: 'Sun', t: 5772, l: 1, m: 1, source: 'https://arxiv.org/abs/1510.07674' },
    { id: 'siriusA', name: 'Sirius A', t: 9845, l: 24.74, m: 2.063, tError: 64, lError: 0.70, mError: 0.023, source: 'https://arxiv.org/abs/1703.10625' },
    { id: 'siriusB', name: 'Sirius B', t: 25369, l: 0.02448, m: 1.018, tError: 46, lError: 0.00033, mError: 0.011, source: 'https://arxiv.org/abs/1703.10625' }
  ];
  function hrComparisonModel(tempK, luminosity, mass, scaleMode) {
    var star = hrStellarModel(tempK, luminosity);
    var n = typeof mass === 'number' || typeof mass === 'string' && mass.trim() ? Number(mass) : NaN;
    var solarMass = Number.isFinite(n) ? Math.max(0.1, Math.min(20, n)) : 1;
    var mode = scaleMode === 'true' ? 'true' : 'compressed';
    var reference = HR_STELLAR_REFERENCES.find(function(entry) {
      return star.tempK === entry.t && star.lumin === entry.l && solarMass === entry.m;
    }) || null;
    var scale = 80 / Math.max(1, star.radius);
    var sunDisk = mode === 'true' ? scale : 36;
    var starDisk = mode === 'true' ? scale * star.radius : Math.max(10, Math.min(72, 36 + 18 * Math.log10(star.radius)));
    return { star: star, mass: solarMass, mode: mode, reference: reference,
      sunDisk: sunDisk, starDisk: starDisk, sunTiny: sunDisk < 1, starTiny: starDisk < 1,
      surfaceArea: star.radius * star.radius, emissionPerArea: Math.pow(star.tempK / 5772, 4) };
  }

