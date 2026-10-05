
  // Johnson V examples: Willmer (2018) and ESA's original Hipparcos catalogue (1997).
  var MAGNITUDE_REFERENCES = [
    { id: 'sun', name: 'Sun reference', absoluteV: 4.81, distancePc: 10,
      source: 'Willmer 2018 · Solar V magnitude', href: 'https://arxiv.org/abs/1804.07788',
      basis: 'Adopted solar M_V = +4.81 from Willmer (2018), in the Vega magnitude system. The Sun example starts at the standard distance of 10 pc.' },
    { id: 'sirius', name: 'Sirius', hip: 32349, apparentV: -1.44, parallaxMas: 379.21, parallaxErrorMas: 1.58,
      source: 'ESA 1997 · Hipparcos catalogue', href: 'https://vizier.cds.unistra.fr/viz-bin/VizieR?-source=I/239/hip_main&HIP=32349,91262',
      basis: 'HIP 32349: Johnson V = −1.44; parallax = 379.21 ± 1.58 mas in the ESA 1997 catalogue. M_V is inferred from these inputs assuming negligible extinction.' },
    { id: 'vega', name: 'Vega', hip: 91262, apparentV: 0.03, parallaxMas: 128.93, parallaxErrorMas: 0.55,
      source: 'ESA 1997 · Hipparcos catalogue', href: 'https://vizier.cds.unistra.fr/viz-bin/VizieR?-source=I/239/hip_main&HIP=32349,91262',
      basis: 'HIP 91262: Johnson V = +0.03; parallax = 128.93 ± 0.55 mas in the ESA 1997 catalogue. M_V is inferred from these inputs assuming negligible extinction.' }
  ];
  function magnitudeModel(saved) {
    var state = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
    function bounded(raw, low, high, fallback) {
      var value = typeof raw === 'number' || typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN;
      return Number.isFinite(value) ? Math.max(low, Math.min(high, value)) : fallback;
    }
    var references = MAGNITUDE_REFERENCES.map(function(raw) {
      var r = Object.assign({}, raw);
      if (r.parallaxMas) { r.distancePc = 1000 / r.parallaxMas; r.absoluteV = r.apparentV - 5 * Math.log10(r.distancePc / 10); }
      return r;
    });
    var id = ['sun', 'sirius', 'vega', 'custom'].indexOf(state.magnitudeReference) >= 0 ? state.magnitudeReference : 'sun';
    var reference = references.find(function(r) { return r.id === id; }) || null;
    var absoluteV = reference ? reference.absoluteV : bounded(state.magnitudeMv, -10, 15, 4.81);
    var distancePc = bounded(state.magnitudeDistancePc, 0.1, 10000, reference ? reference.distancePc : 10);
    var extinctionV = Math.round(bounded(state.magnitudeAv, 0, 5, 0) * 10) / 10;
    var distanceLog = Math.log10(distancePc), distanceModulus = 5 * Math.log10(distancePc / 10);
    var unextinguishedV = absoluteV + distanceModulus, apparentV = unextinguishedV + extinctionV;
    var distanceFluxLog = -2 * Math.log10(distancePc / 10), fluxLog = distanceFluxLog - 0.4 * extinctionV;
    var distanceFlux = Math.pow(10, distanceFluxLog), transmission = Math.pow(10, -0.4 * extinctionV);
    var fluxRatio = Math.pow(10, fluxLog), vLightVsSun = Math.pow(10, 0.4 * (4.81 - absoluteV));
    var points = Array.from({ length: 101 }, function(_, i) {
      var logPc = -1 + i / 20, modulus = 5 * (logPc - 1);
      return { distanceLog: logPc, distancePc: Math.pow(10, logPc), unextinguishedV: absoluteV + modulus, apparentV: absoluteV + modulus + extinctionV };
    });
    var regime = Math.abs(fluxLog) < 1e-10 ? 'equal' : fluxLog > 0 ? 'brighter' : 'fainter';
    return { referenceId: id, reference: reference, references: references, absoluteV: absoluteV, distancePc: distancePc,
      distanceLy: distancePc * 3.261563777167433, distanceLog: distanceLog, extinctionV: extinctionV, distanceModulus: distanceModulus,
      unextinguishedV: unextinguishedV, apparentV: apparentV, distanceFlux: distanceFlux, distanceFluxLog: distanceFluxLog,
      transmission: transmission, fluxRatio: fluxRatio, fluxLog: fluxLog, vLightVsSun: vLightVsSun, regime: regime, points: points };
  }

