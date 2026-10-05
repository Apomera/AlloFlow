  // Idealized, coplanar equilibrium-tide forcing; no local water-level predictions.
  var TIDAL_REFERENCE = { moonGMKm3s2: 4902.800118, sunGMKm3s2: 132712440041.279419,
    meanMoonDistanceKm: 384400, meanPerigeeKm: 363300, meanApogeeKm: 405500, sunDistanceKm: 149597870.7,
    synodicDays: 29.53059, solarDayHours: 24 };
  function tidalForcingModel(saved) {
    var state = saved && typeof saved === 'object' ? saved : {};
    function input(value, lo, hi, fallback) {
      if ((typeof value !== 'number' && typeof value !== 'string') || (typeof value === 'string' && !value.trim())) return fallback;
      var n = Number(value); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : fallback;
    }
    var reference = Object.assign({}, TIDAL_REFERENCE);
    var phaseStart = input(state.tidePhaseStart, 0, 1, 0), hours = input(state.tideHours, 0, 48, 0);
    var distanceKm = input(state.tideDistanceKm, reference.meanPerigeeKm, reference.meanApogeeKm, reference.meanMoonDistanceKm);
    var includeSun = typeof state.tideIncludeSun === 'boolean' ? state.tideIncludeSun : true;
    var moonStrength = Math.pow(reference.meanMoonDistanceKm / distanceKm, 3);
    var solarRatio = reference.sunGMKm3s2 / reference.moonGMKm3s2 * Math.pow(reference.meanMoonDistanceKm / reference.sunDistanceKm, 3);
    var sunStrength = includeSun ? solarRatio : 0, monthHours = reference.synodicDays * 24;
    function at(h) {
      var angle = Math.PI * 2 * (phaseStart + h / monthHours), observerAngle = Math.PI * 2 * h / 24;
      var moon = moonStrength * Math.cos(2 * (observerAngle - angle)), sun = sunStrength * Math.cos(2 * observerAngle);
      var a = moonStrength * Math.cos(2 * angle) + sunStrength, b = moonStrength * Math.sin(2 * angle);
      return { hours: h, phase: (phaseStart + h / monthHours) % 1, angle: angle, observerAngle: observerAngle,
        moon: moon, sun: sun, total: moon + sun, amplitude: Math.hypot(a, b), bulgeAngle: Math.atan2(b, a) / 2 };
    }
    var current = at(hours), points = Array.from({ length: 193 }, function(_, i) { return at(i / 4); });
    var surface = Array.from({ length: 181 }, function(_, i) {
      var angle = i * Math.PI / 90, moon = moonStrength * Math.cos(2 * (angle - current.angle)), sun = sunStrength * Math.cos(2 * angle);
      return { angle: angle, moon: moon, sun: sun, total: moon + sun };
    });
    var alignment = Math.cos(2 * current.angle), regime = !includeSun ? 'moonOnly' : alignment > 0.9 ? 'spring' : alignment < -0.9 ? 'neap' : 'transition';
    return { reference: reference, phaseStart: phaseStart, hours: hours, distanceKm: distanceKm, includeSun: includeSun,
      moonStrength: moonStrength, solarRatio: solarRatio, sunStrength: sunStrength, monthHours: monthHours,
      lunarDayHours: 1 / (1 / 24 - 1 / monthHours), moonHalfPeriodHours: 0.5 / (1 / 24 - 1 / monthHours),
      current: current, illumination: (1 - Math.cos(current.angle)) / 2, regime: regime, points: points, surface: surface, plotLimit: 1.8 };
  }

