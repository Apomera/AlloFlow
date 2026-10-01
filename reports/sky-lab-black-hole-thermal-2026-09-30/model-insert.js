
  // Schwarzschild equivalents; observed masses do not imply measured Hawking radiation.
  // IAU nominal solar GM and CODATA 2022 constants; Fixsen (2009) CMB reference.
  var BH_THERMAL = { c: 299792458, G: 6.67430e-11, h: 6.62607015e-34, k: 1.380649e-23,
    solarGM: 1.3271244e20, cmbK: 2.72548, logMin: -14, logMax: 10 };
  function blackHoleThermalModel(saved) {
    var raw = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
    var value = raw.bhMassSolar;
    var n = typeof value === 'number' || typeof value === 'string' && value.trim() ? Number(value) : NaN;
    var mass = Number.isFinite(n) ? Math.max(1e-14, Math.min(1e10, n)) : 1;
    var c = BH_THERMAL.c, G = BH_THERMAL.G, hbar = BH_THERMAL.h / (2 * Math.PI), k = BH_THERMAL.k;
    var solarRadius = 2 * BH_THERMAL.solarGM / (c * c);
    var solarTemperature = hbar * c * c * c / (8 * Math.PI * BH_THERMAL.solarGM * k);
    var mmMass = 0.001 / (2 * solarRadius), cmbMass = solarTemperature / BH_THERMAL.cmbK;
    var examples = [
      { id: 'solar', mass: 1 },
      { id: 'millimeter', mass: mmMass },
      { id: 'cmb', mass: cmbMass },
      { id: 'sgrA', mass: 4.0e6 },
      { id: 'm87', mass: 6.5e9 }
    ];
    var example = examples.find(function(entry) { return mass === entry.mass; }) || null;
    var radius = solarRadius * mass, temperature = solarTemperature / mass;
    var area = 4 * Math.PI * radius * radius, planckArea = hbar * G / (c * c * c);
    var ratio = temperature / BH_THERMAL.cmbK;
    var relation = Math.abs(Math.log(ratio)) < 1e-10 ? 'balanced' : ratio > 1 ? 'hotter' : 'colder';
    var scale = 76 / Math.max(1, mass), logMass = Math.log10(mass);
    function chartPoint(m) {
      var t = solarTemperature / m;
      return { x: (Math.log10(m) - BH_THERMAL.logMin) / (BH_THERMAL.logMax - BH_THERMAL.logMin),
        y: (7 - Math.log10(t)) / 25, temperatureK: t };
    }
    return { massSolar: mass, massKg: mass * BH_THERMAL.solarGM / G, logMass: logMass,
      radiusM: radius, diameterM: 2 * radius, temperatureK: temperature,
      entropyOverK: area / (4 * planckArea), areaM2: area, cmbK: BH_THERMAL.cmbK,
      cmbRatio: ratio, cmbRelation: relation, cmbMassSolar: cmbMass, millimeterMassSolar: mmMass,
      example: example ? example.id : 'custom', examples: examples,
      solarDisk: scale, selectedDisk: scale * mass,
      solarTiny: scale < 1, selectedTiny: scale * mass < 1,
      chart: chartPoint(mass), cmbChart: chartPoint(cmbMass),
      curve: Array.from({ length: 49 }, function(_, index) {
        return chartPoint(Math.pow(10, BH_THERMAL.logMin + index / 48 * (BH_THERMAL.logMax - BH_THERMAL.logMin)));
      }) };
  }

