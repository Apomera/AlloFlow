  // Newtonian binary orbit, viewed in its orbital plane. The Sirius example
  // uses Bond et al. (2017), Tables 4 and 6; its linear scale is derived.
  var BINARY_REFERENCE = {
    massA: 2.063, massB: 1.018, periodYears: 50.1284, eccentricity: 0.59142,
    massAUncertainty: 0.023, massBUncertainty: 0.011,
    periodUncertaintyYears: 0.0043, eccentricityUncertainty: 0.00037,
    solarGM: 1.3271244e20, auMeters: 149597870700, yearSeconds: 365.25 * 86400
  };
  function binaryOrbitModel(saved) {
    saved = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
    function number(raw, low, high, fallback) {
      if (typeof raw !== 'number' && (typeof raw !== 'string' || !raw.trim())) return fallback;
      var value = Number(raw);
      return Number.isFinite(value) ? Math.max(low, Math.min(high, value)) : fallback;
    }
    var ref = Object.assign({}, BINARY_REFERENCE), tau = 2 * Math.PI;
    var siriusAu = Math.cbrt(ref.solarGM * (ref.massA + ref.massB) * Math.pow(ref.periodYears * ref.yearSeconds / tau, 2)) / ref.auMeters;
    var massA = number(saved.binaryMassA, 0.1, 5, ref.massA), massB = number(saved.binaryMassB, 0.1, 5, ref.massB);
    var a = number(saved.binarySeparationAu, 0.5, 40, siriusAu), e = number(saved.binaryEccentricity, 0, 0.8, ref.eccentricity);
    var phase = number(saved.binaryPhase, 0, 1, 0), total = massA + massB;
    var fractionA = massB / total, fractionB = massA / total, bRatio = Math.sqrt(1 - e * e);
    var periodSeconds = tau * Math.sqrt(Math.pow(a * ref.auMeters, 3) / (ref.solarGM * total));
    var circularSpeed = tau * a * ref.auMeters / periodSeconds / 1000;
    function point(f) {
      var mean = tau * f, E = mean;
      // e <= 0.8 keeps Newton's method well conditioned; solve mean anomaly,
      // not true anomaly, so equal slider steps represent equal elapsed time.
      for (var iteration = 0; iteration < 20; iteration++) {
        var correction = (E - e * Math.sin(E) - mean) / (1 - e * Math.cos(E));
        E -= correction; if (Math.abs(correction) < 1e-13) break;
      }
      var x = a * (Math.cos(E) - e), y = a * bRatio * Math.sin(E);
      var separation = a * (1 - e * Math.cos(E)), speedRatio = Math.sqrt(2 * a / separation - 1);
      var velocityFactor = circularSpeed / (1 - e * Math.cos(E));
      var vx = -velocityFactor * Math.sin(E), vy = velocityFactor * bRatio * Math.cos(E);
      return { phase: f, meanAnomaly: mean, eccentricAnomaly: E, separationAu: separation,
        relativeX: x, relativeY: y, speedRatio: speedRatio, relativeSpeedKmS: circularSpeed * speedRatio,
        a: { x: -fractionA * x, y: -fractionA * y, vx: -fractionA * vx, vy: -fractionA * vy, speedKmS: fractionA * circularSpeed * speedRatio },
        b: { x: fractionB * x, y: fractionB * y, vx: fractionB * vx, vy: fractionB * vy, speedKmS: fractionB * circularSpeed * speedRatio } };
    }
    var points = [], orbit = [];
    for (var i = 0; i <= 240; i++) points.push(point(i / 240));
    // Uniform eccentric-anomaly sampling keeps the drawn ellipse smooth.
    for (var j = 0; j <= 180; j++) {
      var E = tau * j / 180, x = a * (Math.cos(E) - e), y = a * bRatio * Math.sin(E);
      orbit.push({ a: { x: -fractionA * x, y: -fractionA * y }, b: { x: fractionB * x, y: fractionB * y } });
    }
    var areaB = Math.PI * Math.pow(a * fractionB, 2) * bRatio / 12;
    var sectors = [0, 0.5].map(function(start) {
      var samples = []; for (var k = 0; k <= 128; k++) samples.push(point(start + k / 128 / 12).b);
      return { startPhase: start, endPhase: start + 1 / 12, areaAu2: areaB, points: samples };
    });
    var isSirius = Math.abs(massA - ref.massA) < 1e-10 && Math.abs(massB - ref.massB) < 1e-10 && Math.abs(a - siriusAu) < 1e-10 && Math.abs(e - ref.eccentricity) < 1e-10;
    return { massA: massA, massB: massB, totalMass: total, separationAu: a, eccentricity: e, phase: phase,
      periodYears: periodSeconds / ref.yearSeconds, elapsedYears: phase * periodSeconds / ref.yearSeconds,
      semimajorA: a * fractionA, semimajorB: a * fractionB,
      periastronAu: a * (1 - e), apastronAu: a * (1 + e), circularSpeedKmS: circularSpeed,
      fastestToSlowest: (1 + e) / (1 - e), plotRadiusAu: a * Math.max(fractionA, fractionB) * 1.8,
      current: point(phase), points: points, orbit: orbit, sectors: sectors,
      reference: ref, siriusSeparationAu: siriusAu, isSirius: isSirius };
  }

