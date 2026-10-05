  // Kopparapu et al. (2014): one-Earth-mass conservative limits, 2600-7200 K.
  var HABITABLE_ZONE_COEFFICIENTS = [
    { id: 'inner', name: 'Runaway greenhouse', coefficients: [1.107, 1.332e-4, 1.580e-8, -8.308e-12, -1.931e-15] },
    { id: 'outer', name: 'Maximum greenhouse', coefficients: [0.356, 6.171e-5, 1.698e-9, -3.198e-12, -5.575e-16] }
  ];
  var HABITABLE_ZONE_PLANETS = [
    { id: 'venus', name: 'Venus reference', distanceAu: 0.72333199, albedo: 0.77, surfaceK: 737, href: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/venusfact.html' },
    { id: 'earth', name: 'Earth reference', distanceAu: 1.00000011, albedo: 0.294, surfaceK: 288, href: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html' },
    { id: 'mars', name: 'Mars reference', distanceAu: 1.52366231, albedo: 0.25, surfaceK: 214, href: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html' }
  ];
  function habitableZoneModel(saved) {
    var state = saved && typeof saved === 'object' ? saved : {};
    function input(value, lo, hi, fallback) {
      if ((typeof value !== 'number' && typeof value !== 'string') || (typeof value === 'string' && !value.trim())) return fallback;
      var n = Number(value); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : fallback;
    }
    var temperatureK = input(state.hzTemperatureK, 2600, 7200, 5772);
    var luminosity = input(state.hzLuminosity, 0.01, 10, 1);
    var distanceAu = input(state.hzDistanceAu, 0.03, 20, 1.00000011);
    var albedo = input(state.hzAlbedo, 0, 0.9, 0.294);
    var t = temperatureK - 5780;
    var boundaries = HABITABLE_ZONE_COEFFICIENTS.map(function(r) {
      var c = r.coefficients.slice();
      var flux = c[0] + c[1] * t + c[2] * t * t + c[3] * t * t * t + c[4] * Math.pow(t, 4);
      return { id: r.id, name: r.name, coefficients: c, flux: flux, distanceAu: Math.sqrt(luminosity / flux) };
    });
    var inner = boundaries[0], outer = boundaries[1];
    var flux = luminosity / (distanceAu * distanceAu), irradiance = 1361 * flux;
    var reflected = irradiance * albedo, absorbed = irradiance * (1 - albedo), meanAbsorbed = absorbed / 4;
    var equilibriumK = Math.pow(meanAbsorbed / 5.670374419e-8, 0.25);
    var referencePlanets = HABITABLE_ZONE_PLANETS.map(function(p) { return Object.assign({}, p); });
    var reference = referencePlanets.find(function(p) {
      return temperatureK === 5772 && luminosity === 1 && Math.abs(distanceAu - p.distanceAu) < 1e-10 && Math.abs(albedo - p.albedo) < 1e-10;
    }) || null;
    var regime = distanceAu < inner.distanceAu - 1e-12 ? 'inner' : distanceAu > outer.distanceAu + 1e-12 ? 'outer' : 'within';
    return { temperatureK: temperatureK, luminosity: luminosity, luminosityLog: Math.log10(luminosity),
      distanceAu: distanceAu, distanceLog: Math.log10(distanceAu), albedo: albedo, reflectedFraction: albedo, absorbedFraction: 1 - albedo,
      flux: flux, irradiance: irradiance, reflected: reflected, absorbed: absorbed, meanAbsorbed: meanAbsorbed,
      equilibriumK: equilibriumK, equilibriumC: equilibriumK - 273.15, boundaries: boundaries, inner: inner, outer: outer,
      zoneCenterAu: Math.sqrt(inner.distanceAu * outer.distanceAu), regime: regime, reference: reference, references: referencePlanets };
  }

