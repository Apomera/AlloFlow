// AlloFlow STEM Lab — Particle Lab 3D
// Deterministic, educational particle sandbox for states of matter, gas laws,
// diffusion, collisions, and intermolecular attraction.
(function () {
  'use strict';

  if (!window.StemLab || typeof window.StemLab.registerTool !== 'function') return;
  if (window.StemLab.isRegistered && window.StemLab.isRegistered('particleLab3d')) return;


  function seeded(seed) {
    var value = (seed >>> 0) || 1;
    return function () {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 4294967296;
    };
  }

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function isTransportPreset(value) { return value === 'diffusion' || value === 'osmosis'; }

  function makeParticles(count, preset, temperature, seed, massRatioB) {
    var random = seeded(seed || 2048);
    var particles = [];
    var speed = Math.sqrt(Math.max(1, temperature) / 120) * 1.5;
    var side = Math.ceil(Math.pow(count, 1 / 3));
    for (var i = 0; i < count; i += 1) {
      var typeB = preset === 'diffusion' ? i >= count / 2 : (preset === 'osmosis' && i >= count * 0.75);
      var x, y, z;
      if (preset === 'solid') {
        var ix = i % side;
        var iy = Math.floor(i / side) % side;
        var iz = Math.floor(i / (side * side));
        var spacing = 1.05;
        x = (ix - (side - 1) / 2) * spacing;
        y = -4.2 + iy * spacing;
        z = (iz - (side - 1) / 2) * spacing;
      } else if (preset === 'liquid') {
        x = (random() - 0.5) * 7;
        y = -4.5 + random() * 4.6;
        z = (random() - 0.5) * 7;
      } else {
        x = (random() - 0.5) * 10;
        y = (random() - 0.5) * 10;
        z = (random() - 0.5) * 10;
        if (preset === 'diffusion') x = typeB ? 2.5 + random() * 2.5 : -5 + random() * 2.5;
        if (preset === 'osmosis') x = typeB || i % 2 ? 0.5 + random() * 4.5 : -5 + random() * 4.5;
      }
      var theta = random() * Math.PI * 2;
      var phi = Math.acos(2 * random() - 1);
      var particleMass = typeB ? clamp(Number(massRatioB) || 1, 0.5, 3) : 1;
      var localSpeed = speed * (0.55 + random() * 0.9) / Math.sqrt(particleMass);
      particles.push({
        x: x, y: y, z: z,
        vx: localSpeed * Math.sin(phi) * Math.cos(theta),
        vy: localSpeed * Math.cos(phi),
        vz: localSpeed * Math.sin(phi) * Math.sin(theta),
        type: typeB ? 1 : 0,
        membraneGate: random(),
        homeX: x, homeY: y, homeZ: z, pathLength: 0, journeyTime: 0, distanceSinceParticleHit: 0, freeFlights: [], wallHits: 0, particleHits: 0, membraneHits: 0
      });
    }
    return particles;
  }

  function advanceParticles(particles, settings, dt) {
    var half = settings.boxSize / 2;
    var radius = clamp(Number(settings.particleDiameter) || 0.58, 0.36, 0.9) / 2;
    var collisions = 0;
    var impulse = 0;
    var events = [], tracerCollisions = [];
    var membranePassed = 0, membraneBlocked = 0, membranePassedA = 0, membranePassedB = 0, membraneBlockedA = 0, membraneBlockedB = 0, membraneNetA = 0, membraneNetB = 0;
    var attraction = settings.attraction, osmoticGradient = 0;
    if (settings.preset === 'osmosis') { var osmLeftB = 0, osmLeftN = 0, osmRightB = 0, osmRightN = 0; particles.forEach(function (particle) { if (particle.x < 0) { osmLeftN += 1; if (particle.type) osmLeftB += 1; } else { osmRightN += 1; if (particle.type) osmRightB += 1; } }); osmoticGradient = (osmRightN ? osmRightB / osmRightN : 0) - (osmLeftN ? osmLeftB / osmLeftN : 0); }
    var solid = settings.preset === 'solid';
    var i, j;

    for (i = 0; i < particles.length; i += 1) {
      var p = particles[i], previousX = p.x, particleMass = p.type ? clamp(Number(settings.massRatioB) || 1, 0.5, 3) : 1;
      if (solid) {
        p.vx += (p.homeX - p.x) * 8 * dt;
        p.vy += (p.homeY - p.y) * 8 * dt;
        p.vz += (p.homeZ - p.z) * 8 * dt;
        p.vx *= 0.985; p.vy *= 0.985; p.vz *= 0.985;
      }
      p.vy -= clamp(Number(settings.gravity) || 0, 0, 2) * 2.4 * dt;
      var stepDistance = Math.sqrt(p.vx * p.vx + p.vy * p.vy + p.vz * p.vz) * Math.max(0, dt); p.pathLength = (p.pathLength || 0) + stepDistance; p.distanceSinceParticleHit = (p.distanceSinceParticleHit || 0) + stepDistance; p.journeyTime = (p.journeyTime || 0) + Math.max(0, dt);
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (isTransportPreset(settings.preset) && settings.membrane && previousX * p.x < 0) {
        var permeability = clamp(Number(settings.permeability) || 0, 0, 1), preference = settings.membraneSelectivity || 'both';
        var speciesFactor = preference === 'a' ? (p.type ? 0.08 : 1) : (preference === 'b' ? (p.type ? 1 : 0.08) : 1);
        var effectivePermeability = permeability * speciesFactor;
        if (settings.preset === 'osmosis' && !p.type) effectivePermeability *= previousX < 0 ? clamp(0.55 + osmoticGradient, 0.15, 1) : clamp(0.55 - osmoticGradient, 0.08, 1);
        if (settings.preset === 'osmosis' && p.type) effectivePermeability *= 0.02;
        var transitSignal = 0.5 + 0.5 * Math.sin((p.membraneGate || 0) * 37.7 + p.y * 2.13 + p.z * 1.71);
        if (transitSignal > effectivePermeability) { p.x = previousX < 0 ? -radius : radius; p.vx = previousX < 0 ? -Math.abs(p.vx) : Math.abs(p.vx); membraneBlocked += 1; if (p.type) membraneBlockedB += 1; else membraneBlockedA += 1; p.membraneHits = (p.membraneHits || 0) + 1; if (events.length < 8) events.push({ kind: 'membrane-block', species: p.type ? 1 : 0, x: 0, y: p.y, z: p.z, power: particleMass * Math.abs(p.vx) }); }
        else { p.membraneGate = ((p.membraneGate || 0) + 0.61803398875) % 1; membranePassed += 1; var crossingDirection = previousX < 0 ? 1 : -1; if (p.type) { membranePassedB += 1; membraneNetB += crossingDirection; } else { membranePassedA += 1; membraneNetA += crossingDirection; } if (events.length < 8) events.push({ kind: 'membrane-pass', species: p.type ? 1 : 0, x: 0, y: p.y, z: p.z, power: particleMass * Math.abs(p.vx) }); }
      }
      ['x', 'y', 'z'].forEach(function (axis) {
        var vel = 'v' + axis;
        if (p[axis] > half - radius) { impulse += particleMass * Math.abs(p[vel]) * 2; p[axis] = half - radius; p[vel] = -Math.abs(p[vel]); collisions += 1; p.wallHits = (p.wallHits || 0) + 1; if (events.length < 8) events.push({ kind: 'wall', axis: axis, side: 1, x: p.x, y: p.y, z: p.z, power: particleMass * Math.abs(p[vel]) }); }
        if (p[axis] < -half + radius) { impulse += particleMass * Math.abs(p[vel]) * 2; p[axis] = -half + radius; p[vel] = Math.abs(p[vel]); collisions += 1; p.wallHits = (p.wallHits || 0) + 1; if (events.length < 8) events.push({ kind: 'wall', axis: axis, side: -1, x: p.x, y: p.y, z: p.z, power: particleMass * Math.abs(p[vel]) }); }
      });
    }

    for (i = 0; i < particles.length; i += 1) {
      for (j = i + 1; j < particles.length; j += 1) {
        var a = particles[i], b = particles[j];
        var massA = a.type ? clamp(Number(settings.massRatioB) || 1, 0.5, 3) : 1, massB = b.type ? clamp(Number(settings.massRatioB) || 1, 0.5, 3) : 1;
        var invMassA = 1 / massA, invMassB = 1 / massB, invMassSum = invMassA + invMassB;
        var dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
        var d2 = dx * dx + dy * dy + dz * dz;
        if (d2 > 0.0001 && attraction > 0 && d2 < 6.25) {
          var distA = Math.sqrt(d2);
          var force = attraction * 0.42 * (1 - distA / 2.5) * dt;
          a.vx += dx / distA * force * invMassA; a.vy += dy / distA * force * invMassA; a.vz += dz / distA * force * invMassA;
          b.vx -= dx / distA * force * invMassB; b.vy -= dy / distA * force * invMassB; b.vz -= dz / distA * force * invMassB;
        }
        var minD = radius * 2;
        if (d2 > 0.0001 && d2 < minD * minD) {
          var dist = Math.sqrt(d2);
          var nx = dx / dist, ny = dy / dist, nz = dz / dist, penetration = minD - dist;
          a.x -= nx * penetration * invMassA / invMassSum; a.y -= ny * penetration * invMassA / invMassSum; a.z -= nz * penetration * invMassA / invMassSum;
          b.x += nx * penetration * invMassB / invMassSum; b.y += ny * penetration * invMassB / invMassSum; b.z += nz * penetration * invMassB / invMassSum;
          var rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny + (b.vz - a.vz) * nz;
          if (rel < 0) {
            var impulseMagnitude = -(2 * rel) / invMassSum;
            a.vx -= impulseMagnitude * invMassA * nx; a.vy -= impulseMagnitude * invMassA * ny; a.vz -= impulseMagnitude * invMassA * nz;
            b.vx += impulseMagnitude * invMassB * nx; b.vy += impulseMagnitude * invMassB * ny; b.vz += impulseMagnitude * invMassB * nz;
            collisions += 1; var tracerFlightA = Math.max(0, Number(a.distanceSinceParticleHit) || 0), tracerFlightB = Math.max(0, Number(b.distanceSinceParticleHit) || 0); [a, b].forEach(function (particle) { var flight = Math.max(0, Number(particle.distanceSinceParticleHit) || 0); if (flight > 0) { if (!Array.isArray(particle.freeFlights)) particle.freeFlights = []; particle.freeFlights.push(flight); if (particle.freeFlights.length > 32) particle.freeFlights.shift(); } particle.distanceSinceParticleHit = 0; }); a.particleHits = (a.particleHits || 0) + 1; b.particleHits = (b.particleHits || 0) + 1; if (i === settings.selectedParticle) tracerCollisions.push({ x: a.x, y: a.y, z: a.z, flight: tracerFlightA }); else if (j === settings.selectedParticle) tracerCollisions.push({ x: b.x, y: b.y, z: b.z, flight: tracerFlightB });
            if (events.length < 8) events.push({ kind: 'particle', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2, power: Math.abs(rel) });
          }
        }
      }
    }
    return { collisions: collisions, impulse: impulse, events: events, tracerCollisions: tracerCollisions, membranePassed: membranePassed, membraneBlocked: membraneBlocked, membranePassedA: membranePassedA, membranePassedB: membranePassedB, membraneBlockedA: membraneBlockedA, membraneBlockedB: membraneBlockedB, membraneNetA: membraneNetA, membraneNetB: membraneNetB };
  }

  function meanFreePathEstimate(particleCount, boxSize, particleDiameter) {
    var count = Math.max(1, (Number(particleCount) || 1) - 1), volume = Math.pow(Math.max(0.1, Number(boxSize) || 1), 3), diameter = Math.max(0.01, Number(particleDiameter) || 0.58);
    return volume / (Math.sqrt(2) * count * Math.PI * diameter * diameter);
  }

  function freeFlightDistribution(values, binCount, ceiling) {
    var binsN = Math.max(4, Number(binCount) || 8), clean = (values || []).filter(function (value) { return Number.isFinite(value) && value >= 0; }), maximum = Math.max(0.001, Number(ceiling) || (clean.length ? Math.max.apply(Math, clean) : 1)), bins = new Array(binsN).fill(0);
    clean.forEach(function (value) { bins[Math.min(binsN - 1, Math.floor(value / maximum * binsN))] += 1; });
    var count = clean.length, mean = count ? clean.reduce(function (sum, value) { return sum + value; }, 0) / count : 0;
    return { bins: bins.map(function (value) { return count ? value / count : 0; }), count: count, mean: mean, max: maximum };
  }

  function ensembleFreeFlightStats(particles) {
    var groups = [{ flights: [], hits: 0, time: 0 }, { flights: [], hits: 0, time: 0 }];
    (particles || []).forEach(function (particle) { var group = groups[particle && particle.type ? 1 : 0], flights = particle && Array.isArray(particle.freeFlights) ? particle.freeFlights : []; flights.forEach(function (value) { if (Number.isFinite(value) && value >= 0) group.flights.push(value); }); group.hits += Number(particle && particle.particleHits) || 0; group.time += Number(particle && particle.journeyTime) || 0; });
    function summarize(group) { var count = group.flights.length, mean = count ? group.flights.reduce(function (sum, value) { return sum + value; }, 0) / count : 0, variance = count > 1 ? group.flights.reduce(function (sum, value) { var delta = value - mean; return sum + delta * delta; }, 0) / (count - 1) : 0; return { mean: mean, error: count ? Math.sqrt(variance / count) : 0, samples: count, collisionRate: group.time > 0 ? group.hits / group.time : 0 }; }
    return { a: summarize(groups[0]), b: summarize(groups[1]) };
  }

  function particleJourney(particle) {
    if (!particle) return { pathLength: 0, displacement: 0, efficiency: 0, journeyTime: 0, meanFreePath: 0, meanFreePathError: 0, relativeUncertainty: 0, freeFlightSamples: 0, freeFlights: [], currentFreeFlight: 0, collisionRate: 0, wallHits: 0, particleHits: 0, membraneHits: 0 };
    var dx = particle.x - particle.homeX, dy = particle.y - particle.homeY, dz = particle.z - particle.homeZ, displacement = Math.sqrt(dx * dx + dy * dy + dz * dz), pathLength = Math.max(0, Number(particle.pathLength) || 0), journeyTime = Math.max(0, Number(particle.journeyTime) || 0), particleHits = Number(particle.particleHits) || 0, flights = Array.isArray(particle.freeFlights) ? particle.freeFlights.filter(function (value) { return Number.isFinite(value) && value >= 0; }) : [];
    var meanFreePath = flights.length ? flights.reduce(function (sum, value) { return sum + value; }, 0) / flights.length : Math.max(0, Number(particle.distanceSinceParticleHit) || pathLength), variance = flights.length > 1 ? flights.reduce(function (sum, value) { var delta = value - meanFreePath; return sum + delta * delta; }, 0) / (flights.length - 1) : 0, standardError = flights.length ? Math.sqrt(variance / flights.length) : 0;
    return { pathLength: pathLength, displacement: displacement, efficiency: pathLength > 0 ? clamp(displacement / pathLength, 0, 1) : 0, journeyTime: journeyTime, meanFreePath: meanFreePath, meanFreePathError: standardError, relativeUncertainty: meanFreePath > 0 ? standardError / meanFreePath : 0, freeFlightSamples: flights.length, freeFlights: flights.slice(), currentFreeFlight: Math.max(0, Number(particle.distanceSinceParticleHit) || 0), collisionRate: journeyTime > 0 ? particleHits / journeyTime : 0, wallHits: Number(particle.wallHits) || 0, particleHits: particleHits, membraneHits: Number(particle.membraneHits) || 0 };
  }

  function systemMoments(particles) {
    var n = particles.length || 1, x = 0, y = 0, z = 0, vx = 0, vy = 0, vz = 0;
    particles.forEach(function (p) { x += p.x; y += p.y; z += p.z; vx += p.vx; vy += p.vy; vz += p.vz; }); x /= n; y /= n; z /= n; vx /= n; vy /= n; vz /= n;
    var spread2 = 0; particles.forEach(function (p) { var dx = p.x - x, dy = p.y - y, dz = p.z - z; spread2 += dx * dx + dy * dy + dz * dz; });
    var spread = Math.sqrt(spread2 / n), occupiedVolume = 4 / 3 * Math.PI * Math.pow(Math.max(0.15, spread), 3);
    return { x: x, y: y, z: z, vx: vx, vy: vy, vz: vz, spread: spread, density: n / occupiedVolume, drift: Math.sqrt(vx * vx + vy * vy + vz * vz) };
  }
  function heightDistribution(particles, boxSize, binCount) {
    var binsN = Math.max(4, Number(binCount) || 8), counts = new Array(binsN).fill(0), span = Math.max(0.1, Number(boxSize) || 1), half = span / 2, total = Math.max(1, (particles || []).length), centerY = 0;
    (particles || []).forEach(function (particle) { var y = clamp(Number(particle && particle.y) || 0, -half, half), index = clamp(Math.floor((y + half) / span * binsN), 0, binsN - 1); counts[index] += 1; centerY += y; });
    var fractions = counts.map(function (count) { return count / total; }), quarter = Math.max(1, Math.floor(binsN / 4)), bottomFraction = fractions.slice(0, quarter).reduce(function (sum, value) { return sum + value; }, 0), topFraction = fractions.slice(-quarter).reduce(function (sum, value) { return sum + value; }, 0), smoothing = 1 / total;
    return { bins: fractions, counts: counts, centerY: centerY / total, normalizedCenter: clamp((centerY / total) / Math.max(0.001, half), -1, 1), bottomFraction: bottomFraction, topFraction: topFraction, bottomTopRatio: (bottomFraction + smoothing) / (topFraction + smoothing), uniform: 1 / binsN };
  }
  function diffusionMetrics(particles, boxSize) {
    var leftA = 0, leftB = 0, rightA = 0, rightB = 0, countA = 0, countB = 0, ax = 0, ay = 0, az = 0, bx = 0, by = 0, bz = 0, msdSum = 0, msdA = 0, msdB = 0;
    var bins = 10, profileA = new Array(bins).fill(0), profileTotal = new Array(bins).fill(0), span = Math.max(1, Number(boxSize) || 10);
    particles.forEach(function (p) {
      if (p.x < 0) { if (p.type) leftB += 1; else leftA += 1; } else { if (p.type) rightB += 1; else rightA += 1; }
      if (p.type) { countB += 1; bx += p.x; by += p.y; bz += p.z; } else { countA += 1; ax += p.x; ay += p.y; az += p.z; }
      var dx0 = p.x - p.homeX, dy0 = p.y - p.homeY, dz0 = p.z - p.homeZ, displacement2 = dx0 * dx0 + dy0 * dy0 + dz0 * dz0; msdSum += displacement2; if (p.type) msdB += displacement2; else msdA += displacement2;
      var bin = clamp(Math.floor((p.x / span + 0.5) * bins), 0, bins - 1); profileTotal[bin] += 1; if (!p.type) profileA[bin] += 1;
    });
    ax /= Math.max(1, countA); ay /= Math.max(1, countA); az /= Math.max(1, countA); bx /= Math.max(1, countB); by /= Math.max(1, countB); bz /= Math.max(1, countB);
    var spreadA2 = 0, spreadB2 = 0; particles.forEach(function (p) { var dx = p.x - (p.type ? bx : ax), dy = p.y - (p.type ? by : ay), dz = p.z - (p.type ? bz : az); if (p.type) spreadB2 += dx * dx + dy * dy + dz * dz; else spreadA2 += dx * dx + dy * dy + dz * dz; });
    var leftN = leftA + leftB, rightN = rightA + rightB, total = Math.max(1, particles.length), entropy = 0;
    var leftAFraction = leftN ? leftA / leftN : 0, rightAFraction = rightN ? rightA / rightN : 0;
    profileA = profileA.map(function (value, i) { var fraction = profileTotal[i] ? value / profileTotal[i] : 0.5; if (profileTotal[i] && fraction > 0 && fraction < 1) entropy += profileTotal[i] / total * (-(fraction * Math.log(fraction) + (1 - fraction) * Math.log(1 - fraction)) / Math.LN2); return fraction; });
    return { mixing: clamp(1 - Math.abs(leftAFraction - rightAFraction), 0, 1), entropy: clamp(entropy, 0, 1), msd: msdSum / total, msdA: msdA / Math.max(1, countA), msdB: msdB / Math.max(1, countB), exchange: (rightA + leftB) / total, leftA: leftAFraction, rightA: rightAFraction, leftCount: leftN, rightCount: rightN, leftACount: leftA, rightACount: rightA, leftBCount: leftB, rightBCount: rightB, profileA: profileA, profileTotal: profileTotal, centerA: { x: ax, y: ay, z: az }, centerB: { x: bx, y: by, z: bz }, spreadA: Math.sqrt(spreadA2 / Math.max(1, countA)), spreadB: Math.sqrt(spreadB2 / Math.max(1, countB)), solventRight: countA ? rightA / countA : 0, osmoticShift: (countA ? rightA / countA : 0) - 0.5, soluteLeak: countB ? leftB / countB : 0 };
  }
  function compareTracerTrials(first, second) {
    if (!first || !second) return null;
    var changed = [];
    if (Math.abs((Number(first.temperature) || 0) - (Number(second.temperature) || 0)) > 1) changed.push('temperature');
    if ((Number(first.count) || 0) !== (Number(second.count) || 0)) changed.push('particle count');
    if ((Number(first.boxSize) || 0) !== (Number(second.boxSize) || 0)) changed.push('chamber volume');
    if (Math.abs((Number(first.massRatioB) || 1) - (Number(second.massRatioB) || 1)) > 0.0001) changed.push('particle B mass');
    if (Math.abs((Number(first.particleDiameter) || 0.58) - (Number(second.particleDiameter) || 0.58)) > 0.0001) changed.push('particle diameter');
    if ((first.species || 'A') !== (second.species || 'A')) changed.push('tracer species');
    if (Math.abs((Number(first.attraction) || 0) - (Number(second.attraction) || 0)) > 0.0001) changed.push('attraction');
    if (Math.abs((Number(first.gravity) || 0) - (Number(second.gravity) || 0)) > 0.0001) changed.push('gravity field');
    if (!!first.membrane !== !!second.membrane) changed.push('membrane');
    if (Math.abs((Number(first.permeability) || 0) - (Number(second.permeability) || 0)) > 0.0001) changed.push('permeability');
    if ((first.membraneSelectivity || 'both') !== (second.membraneSelectivity || 'both')) changed.push('membrane preference');
    if ((first.preset || '') !== (second.preset || '')) changed.push('particle model');
    return { changed: changed, fair: changed.length === 1, replicate: changed.length === 0, changedVariable: changed.length === 1 ? changed[0] : '', meanFreePathDelta: Number(second.meanFreePath || 0) - Number(first.meanFreePath || 0), collisionRateDelta: Number(second.collisionRate || 0) - Number(first.collisionRate || 0), densityDelta: Number(second.density || 0) - Number(first.density || 0), temperatureDelta: Number(second.temperature || 0) - Number(first.temperature || 0) };
  }

  function compareTrials(first, second) {
    if (!first || !second) return null;
    var t1 = first.temperatureSetpoint == null ? first.temperature : first.temperatureSetpoint, t2 = second.temperatureSetpoint == null ? second.temperature : second.temperatureSetpoint;
    var changed = [];
    if (t1 !== t2) changed.push('temperature'); if (first.count !== second.count) changed.push('particle count'); if (first.boxSize !== second.boxSize) changed.push('volume');
    if (Math.abs((first.attraction || 0) - (second.attraction || 0)) > 0.0001) changed.push('attraction'); if (Math.abs((first.gravity || 0) - (second.gravity || 0)) > 0.0001) changed.push('gravity field'); if (!!first.membrane !== !!second.membrane) changed.push('membrane'); if (Math.abs((first.permeability || 0) - (second.permeability || 0)) > 0.0001) changed.push('membrane permeability'); if ((first.membraneSelectivity || 'both') !== (second.membraneSelectivity || 'both')) changed.push('membrane preference'); if (Math.abs((first.massRatioB || 1) - (second.massRatioB || 1)) > 0.0001) changed.push('particle B mass'); if (Math.abs((first.particleDiameter || 0.58) - (second.particleDiameter || 0.58)) > 0.0001) changed.push('particle diameter'); if ((first.preset || '') !== (second.preset || '')) changed.push('particle model');
    return { changed: changed, fair: changed.length === 1, temperatureDelta: second.temperature - first.temperature, pressureDelta: second.pressure - first.pressure, countDelta: second.count - first.count, volumeDelta: Math.round(Math.pow(second.boxSize, 3) - Math.pow(first.boxSize, 3)), heightDelta: Number(second.heightCenter || 0) - Number(first.heightCenter || 0), heightRatioDelta: Number(second.heightRatio || 1) - Number(first.heightRatio || 1), transmissionADelta: Number(second.transmissionA || 0) - Number(first.transmissionA || 0), transmissionBDelta: Number(second.transmissionB || 0) - Number(first.transmissionB || 0), separationDelta: Number(second.separation || 0) - Number(first.separation || 0), selectivityDistinctA: Number(first.ciAHigh || 1) < Number(second.ciALow || 0) || Number(second.ciAHigh || 1) < Number(first.ciALow || 0), selectivityDistinctB: Number(first.ciBHigh || 1) < Number(second.ciBLow || 0) || Number(second.ciBHigh || 1) < Number(first.ciBLow || 0), changedVariable: changed.length === 1 ? changed[0] : '' };
  }
  function speedDistribution(particles, binCount) {
    var binsN = Math.max(4, binCount || 12), speeds = particles.map(function (p) { return Math.sqrt(p.vx * p.vx + p.vy * p.vy + p.vz * p.vz); }).sort(function (a, b) { return a - b; });
    var max = speeds.length ? Math.max(0.001, speeds[speeds.length - 1]) : 1, bins = new Array(binsN).fill(0), sum = 0;
    speeds.forEach(function (speed) { sum += speed; bins[Math.min(binsN - 1, Math.floor(speed / max * binsN))] += 1; });
    return { bins: bins, max: max, mean: speeds.length ? sum / speeds.length : 0, p90: speeds.length ? speeds[Math.min(speeds.length - 1, Math.floor(speeds.length * 0.9))] : 0 };
  }
  function speciesKinetics(particles, massRatioB, binCount) {
    var binsN = Math.max(4, binCount || 12), groups = [{ speeds: [], bins: new Array(binsN).fill(0), weightedV2: 0 }, { speeds: [], bins: new Array(binsN).fill(0), weightedV2: 0 }];
    var maximum = 0;
    particles.forEach(function (p) { var speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy + p.vz * p.vz), type = p.type ? 1 : 0, mass = type ? clamp(Number(massRatioB) || 1, 0.5, 3) : 1; groups[type].speeds.push(speed); groups[type].weightedV2 += mass * speed * speed; maximum = Math.max(maximum, speed); });
    maximum = Math.max(0.001, maximum);
    groups.forEach(function (group) { group.speeds.forEach(function (speed) { group.bins[Math.min(binsN - 1, Math.floor(speed / maximum * binsN))] += 1; }); var count = Math.max(1, group.speeds.length); group.bins = group.bins.map(function (value) { return value / count; }); group.mean = group.speeds.reduce(function (sum, value) { return sum + value; }, 0) / count; group.temperature = Math.round(group.weightedV2 / count * 40); group.count = group.speeds.length; });
    return { a: groups[0], b: groups[1], max: maximum };
  }

  function metrics(particles, impulse, boxSize, elapsed, massRatioB) {
    var weightedV2 = 0;
    particles.forEach(function (p) { var mass = p.type ? clamp(Number(massRatioB) || 1, 0.5, 3) : 1; weightedV2 += mass * (p.vx * p.vx + p.vy * p.vy + p.vz * p.vz); });
    var meanWeightedV2 = particles.length ? weightedV2 / particles.length : 0;
    return {
      temperature: Math.round(meanWeightedV2 * 40),
      energy: Math.round(weightedV2 * 5) / 10,
      pressure: Math.round((impulse / Math.max(0.001, elapsed)) / (6 * boxSize * boxSize) * 100) / 10
    };
  }

  function seriesTrend(values) {
    var clean = (values || []).filter(function (value) { return Number.isFinite(value); });
    if (!clean.length) return { direction: 'waiting', delta: 0, min: 0, max: 0, latest: 0 };
    var first = clean[0], latest = clean[clean.length - 1], min = Math.min.apply(Math, clean), max = Math.max.apply(Math, clean);
    var delta = latest - first, tolerance = Math.max(0.01, (max - min) * 0.08, Math.abs(first) * 0.015);
    return { direction: clean.length < 3 || Math.abs(delta) <= tolerance ? 'steady' : (delta > 0 ? 'rising' : 'falling'), delta: delta, min: min, max: max, latest: latest };
  }

  function isCoalescence(previous, current, minimumGrowth) {
    if (!previous || !current) return false;
    var growth = Number(current.largest || 0) - Number(previous.largest || 0), groupsFell = Number(current.clusterCount || 0) < Number(previous.clusterCount || 0);
    return growth >= Math.max(2, Number(minimumGrowth) || 2) && groupsFell;
  }

  function clusterMetrics(particles, cutoff) {
    var list = particles || [], n = list.length, parent = new Array(n), componentSize = new Array(n), threshold = Math.max(0.05, Number(cutoff) || 1.1), threshold2 = threshold * threshold;
    for (var i = 0; i < n; i += 1) { parent[i] = i; componentSize[i] = 1; }
    function root(index) { while (parent[index] !== index) { parent[index] = parent[parent[index]]; index = parent[index]; } return index; }
    function join(a, b) { var ra = root(a), rb = root(b); if (ra === rb) return; if (componentSize[ra] < componentSize[rb]) { var swap = ra; ra = rb; rb = swap; } parent[rb] = ra; componentSize[ra] += componentSize[rb]; }
    for (var a = 0; a < n; a += 1) { for (var b = a + 1; b < n; b += 1) { var dx = Number(list[a].x || 0) - Number(list[b].x || 0), dy = Number(list[a].y || 0) - Number(list[b].y || 0), dz = Number(list[a].z || 0) - Number(list[b].z || 0); if (dx * dx + dy * dy + dz * dz <= threshold2) join(a, b); } }
    var groupMap = {}; for (var p = 0; p < n; p += 1) { var rp = root(p), px = Number(list[p].x || 0), py = Number(list[p].y || 0), pz = Number(list[p].z || 0); if (!groupMap[rp]) groupMap[rp] = { size: 0, x: 0, y: 0, z: 0, radius: 0, members: [] }; groupMap[rp].size += 1; groupMap[rp].x += px; groupMap[rp].y += py; groupMap[rp].z += pz; groupMap[rp].members.push(p); }
    var groups = Object.keys(groupMap).map(function (key) { var group = groupMap[key]; group.x /= group.size; group.y /= group.size; group.z /= group.size; group.members.forEach(function (index) { var dx = Number(list[index].x || 0) - group.x, dy = Number(list[index].y || 0) - group.y, dz = Number(list[index].z || 0) - group.z; group.radius = Math.max(group.radius, Math.sqrt(dx * dx + dy * dy + dz * dz)); }); delete group.members; group.radius += threshold * 0.38; return group; }).sort(function (x, y) { return y.size - x.size; });
    var sizes = groups.map(function (group) { return group.size; }), largest = sizes.length ? sizes[0] : 0, bondedParticles = sizes.reduce(function (sum, size) { return sum + (size > 1 ? size : 0); }, 0);
    return { sizes: sizes, groups: groups, clusterCount: sizes.length, largest: largest, largestFraction: n ? largest / n : 0, bondedFraction: n ? bondedParticles / n : 0, meanSize: sizes.length ? n / sizes.length : 0, cutoff: threshold };
  }

  function binomialWilsonInterval(successes, attempts, zScore) {
    var n = Math.max(0, Number(attempts) || 0), k = clamp(Number(successes) || 0, 0, n), z = Math.max(0.1, Number(zScore) || 1.96);
    if (!n) return { low: 0, high: 1, center: 0.5, width: 1, attempts: 0 };
    var proportion = k / n, z2 = z * z, denominator = 1 + z2 / n, center = (proportion + z2 / (2 * n)) / denominator, margin = z / denominator * Math.sqrt(proportion * (1 - proportion) / n + z2 / (4 * n * n)), low = clamp(center - margin, 0, 1), high = clamp(center + margin, 0, 1);
    return { low: low, high: high, center: center, width: high - low, attempts: n };
  }

  function membraneSelectivityMetrics(passedA, blockedA, passedB, blockedB, preference) {
    var pa = Math.max(0, Number(passedA) || 0), ba = Math.max(0, Number(blockedA) || 0), pb = Math.max(0, Number(passedB) || 0), bb = Math.max(0, Number(blockedB) || 0), attemptsA = pa + ba, attemptsB = pb + bb, transmissionA = attemptsA ? pa / attemptsA : 0, transmissionB = attemptsB ? pb / attemptsB : 0;
    var smoothA = (pa + 1) / (attemptsA + 2), smoothB = (pb + 1) / (attemptsB + 2), mode = preference === 'b' ? 'b' : (preference === 'a' ? 'a' : 'both'), separation = mode === 'a' ? smoothA / smoothB : (mode === 'b' ? smoothB / smoothA : Math.max(smoothA, smoothB) / Math.max(0.001, Math.min(smoothA, smoothB)));
    return { attemptsA: attemptsA, attemptsB: attemptsB, passedA: pa, passedB: pb, transmissionA: transmissionA, transmissionB: transmissionB, separation: separation, preferred: mode, ready: attemptsA >= 5 && attemptsB >= 5 };
  }

  function fickFluxEstimate(diffusionCoefficient, leftCount, rightCount, boxSize) {
    var d = Math.max(0, Number(diffusionCoefficient) || 0), span = Math.max(0.1, Number(boxSize) || 1);
    return -d * 4 * ((Number(rightCount) || 0) - (Number(leftCount) || 0)) / (span * span);
  }

  function diffusionExponent(samples, key) {
    var points = (samples || []).filter(function (sample) { return sample && Number(sample.elapsed) > 0.05 && Number(sample[key]) > 0.001; }).slice(-16);
    if (points.length < 4) return { alpha: 0, regime: 'collecting', note: 'Collect at least four time samples.', samples: points.length };
    var xs = points.map(function (sample) { return Math.log(Number(sample.elapsed)); }), ys = points.map(function (sample) { return Math.log(Number(sample[key])); }), xMean = xs.reduce(function (sum, value) { return sum + value; }, 0) / xs.length, yMean = ys.reduce(function (sum, value) { return sum + value; }, 0) / ys.length, numerator = 0, denominator = 0;
    xs.forEach(function (x, i) { numerator += (x - xMean) * (ys[i] - yMean); denominator += (x - xMean) * (x - xMean); });
    var alpha = denominator > 0.000001 ? numerator / denominator : 0, regime = alpha < 0.35 ? 'confined / plateauing' : (alpha < 0.8 ? 'subdiffusive' : (alpha <= 1.2 ? 'near normal diffusion' : 'superdiffusive'));
    var note = regime === 'near normal diffusion' ? 'MSD is growing roughly in proportion to time.' : (regime === 'superdiffusive' ? 'Persistent motion is spreading particles faster than the normal-diffusion guide.' : (regime === 'subdiffusive' ? 'Collisions and boundaries are slowing the growth of MSD.' : 'The finite chamber is limiting further displacement.'));
    return { alpha: alpha, regime: regime, note: note, samples: points.length };
  }

  function speedHeat(speed, temperature) {
    var reference = Math.max(0.5, Math.sqrt(Math.max(1, temperature) / 120) * 2.2);
    return clamp(Number(speed) / reference, 0, 1);
  }

  window.__alloParticleLabPure = { seeded: seeded, makeParticles: makeParticles, advanceParticles: advanceParticles, particleJourney: particleJourney, meanFreePathEstimate: meanFreePathEstimate, freeFlightDistribution: freeFlightDistribution, ensembleFreeFlightStats: ensembleFreeFlightStats, systemMoments: systemMoments, heightDistribution: heightDistribution, diffusionMetrics: diffusionMetrics, compareTracerTrials: compareTracerTrials, compareTrials: compareTrials, speedDistribution: speedDistribution, speciesKinetics: speciesKinetics, metrics: metrics, seriesTrend: seriesTrend, isCoalescence: isCoalescence, clusterMetrics: clusterMetrics, binomialWilsonInterval: binomialWilsonInterval, membraneSelectivityMetrics: membraneSelectivityMetrics, fickFluxEstimate: fickFluxEstimate, diffusionExponent: diffusionExponent, speedHeat: speedHeat };

  window.StemLab.registerTool('particleLab3d', {
    icon: '\u2728',
    label: 'Particle Lab 3D',
    desc: 'Run fully 3D particle experiments with states of matter, gas laws, diffusion, adjustable collision cross sections, attraction, live measurements, and particle tracing.',
    color: 'cyan',
    category: 'science',
    questHooks: [
      { id: 'particle_run', label: 'Run a particle experiment', icon: '\u25B6\uFE0F', check: function (d) { return (d.runs || 0) >= 1; }, progress: function (d) { return (d.runs || 0) + '/1'; } },
      { id: 'particle_presets', label: 'Explore all five particle presets', icon: '\uD83E\uDDEA', check: function (d) { return Object.keys(d.presetsSeen || {}).length >= 5; }, progress: function (d) { return Object.keys(d.presetsSeen || {}).length + '/5'; } },
      { id: 'particle_trace', label: 'Trace one particle', icon: '\uD83D\uDCCD', check: function (d) { return !!d.traced; }, progress: function (d) { return d.traced ? 'Done!' : 'Not yet'; } },
      { id: 'particle_explain', label: 'Write an evidence-based conclusion', icon: '\uD83D\uDCDD', check: function (d) { return String(d.conclusion || '').trim().length >= 20; }, progress: function (d) { return String(d.conclusion || '').trim().length >= 20 ? 'Done!' : 'Write a conclusion'; } }
    ],
    render: function (ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef;
      var bucket = (ctx.toolData && ctx.toolData.particleLab3d) || {};
      var prefersReducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      var canvasRef = useRef(null), stageRef = useRef(null), runtimeRef = useRef(null), frameRef = useRef(null), settingsRef = useRef(null), keysDialogRef = useRef(null), keysCloseRef = useRef(null), keysOpenerRef = useRef(null);
      var [preset, setPreset] = useState(bucket.preset || 'gas');
      var [temperature, setTemperature] = useState(bucket.temperature || 300);
      var [count, setCount] = useState(bucket.count || 64);
      var [boxSize, setBoxSize] = useState(bucket.boxSize || 11);
      var [particleDiameter, setParticleDiameter] = useState(bucket.particleDiameter == null ? 0.58 : clamp(Number(bucket.particleDiameter) || 0.58, 0.36, 0.9));
      var [attraction, setAttraction] = useState(bucket.attraction == null ? 0.15 : bucket.attraction);
      var [gravity, setGravity] = useState(bucket.gravity == null ? 0 : bucket.gravity);
      var [membrane, setMembrane] = useState(bucket.membrane !== false);
      var [permeability, setPermeability] = useState(bucket.permeability == null ? 0.45 : bucket.permeability);
      var [membraneSelectivity, setMembraneSelectivity] = useState(bucket.membraneSelectivity || 'both');
      var [massRatioB, setMassRatioB] = useState(bucket.massRatioB == null ? 1 : clamp(Number(bucket.massRatioB) || 1, 0.5, 3));
      var [running, setRunning] = useState(false);
      var [trace, setTrace] = useState(!!bucket.trace);
      var [selectedParticle, setSelectedParticle] = useState(Number.isInteger(bucket.selectedParticle) ? bucket.selectedParticle : 0);
      var [selectedInfo, setSelectedInfo] = useState({ speed: 0, x: 0, y: 0, z: 0, type: 0, pathLength: 0, displacement: 0, efficiency: 0, journeyTime: 0, meanFreePath: 0, meanFreePathError: 0, relativeUncertainty: 0, freeFlightSamples: 0, freeFlights: [], currentFreeFlight: 0, collisionRate: 0, wallHits: 0, particleHits: 0, membraneHits: 0 });
      var [vectors, setVectors] = useState(!!bucket.vectors);
      var [flowTrails, setFlowTrails] = useState(!!bucket.flowTrails);
      var [energyColors, setEnergyColors] = useState(bucket.energyColors !== false);
      var [wallSensors, setWallSensors] = useState(bucket.wallSensors !== false);
      var [autoCamera, setAutoCamera] = useState(!!bucket.autoCamera);
      var [followTracer, setFollowTracer] = useState(!!bucket.followTracer && !prefersReducedMotion);
      var [systemProbe, setSystemProbe] = useState(!!bucket.systemProbe);
      var [systemInfo, setSystemInfo] = useState({ x: 0, y: 0, z: 0, spread: 0, density: 0, drift: 0 });
      var [heightInfo, setHeightInfo] = useState({ bins: new Array(8).fill(0.125), counts: new Array(8).fill(0), centerY: 0, normalizedCenter: 0, bottomFraction: 0.25, topFraction: 0.25, bottomTopRatio: 1, uniform: 0.125 });
      var [clusterInfo, setClusterInfo] = useState({ sizes: [], groups: [], clusterCount: 0, largest: 0, largestFraction: 0, bondedFraction: 0, meanSize: 0, cutoff: 1.1 });
      var [wallFaceInfo, setWallFaceInfo] = useState({ 'x+': 0, 'x-': 0, 'y+': 0, 'y-': 0, 'z+': 0, 'z-': 0 });
      var [timeScale, setTimeScale] = useState(bucket.timeScale || 1);
      var [isFullscreen, setIsFullscreen] = useState(false);
      var [cssFullscreen, setCssFullscreen] = useState(false); // immersive fallback when the native API is unavailable (sandboxed iframes) or rejects
      var [showHud, setShowHud] = useState(true);
      var [showKeys, setShowKeys] = useState(false);
      var cssFsRef = useRef(false);
      cssFsRef.current = cssFullscreen;
      var fsActive = isFullscreen || cssFullscreen;
      var [activeProtocol, setActiveProtocol] = useState(bucket.activeProtocol || 'free');
      var [prediction, setPrediction] = useState(bucket.prediction || '');
      var [observation, setObservation] = useState(bucket.observation || '');
      var [conclusion, setConclusion] = useState(bucket.conclusion || '');
      var [coachFeedback, setCoachFeedback] = useState(bucket.coachFeedback || '');
      var [isCoaching, setIsCoaching] = useState(false);
      var [quality, setQuality] = useState(bucket.quality || 'balanced');
      var [fps, setFps] = useState(0);
      var [trials, setTrials] = useState(Array.isArray(bucket.trials) ? bucket.trials.slice(-2) : []);
      var [tracerTrials, setTracerTrials] = useState(Array.isArray(bucket.tracerTrials) ? bucket.tracerTrials.slice(-2) : []);
      var [ready, setReady] = useState(!!(window.THREE && window.THREE.OrbitControls));
      var [loadError, setLoadError] = useState('');
      var [loadAttempt, setLoadAttempt] = useState(0);
      var [stats, setStats] = useState({ temperature: temperature, pressure: 0, energy: 0, collisions: 0 });
      var [distribution, setDistribution] = useState({ bins: new Array(12).fill(0), max: 1, mean: 0, p90: 0 });
      var [speciesMotion, setSpeciesMotion] = useState({ a: { bins: new Array(12).fill(0), mean: 0, temperature: temperature, count: 0 }, b: { bins: new Array(12).fill(0), mean: 0, temperature: temperature, count: 0 }, max: 1 });
      var [ensembleFlights, setEnsembleFlights] = useState({ a: { mean: 0, error: 0, samples: 0, collisionRate: 0 }, b: { mean: 0, error: 0, samples: 0, collisionRate: 0 } });
      var [diffusionInfo, setDiffusionInfo] = useState({ mixing: 0, exchange: 0, leftA: 1, rightA: 0, leftCount: 0, rightCount: 0, profileA: new Array(10).fill(0.5), profileTotal: new Array(10).fill(0), entropy: 0, msd: 0, msdA: 0, msdB: 0, coefficient: 0, coefficientA: 0, coefficientB: 0, elapsed: 0, spreadA: 0, spreadB: 0, solventRight: 0.5, osmoticShift: 0, soluteLeak: 0, milestoneTime: null, flux: 0, fluxA: 0, fluxB: 0, netFluxA: 0, netFluxB: 0, assayPassedA: 0, assayPassedB: 0, assayBlockedA: 0, assayBlockedB: 0, assayConditionKey: '', blocked: 0 });
      var [history, setHistory] = useState([]);
      var [resetKey, setResetKey] = useState(0);
      var runRef = useRef(false), stepRef = useRef(false), lastUiRef = useRef(0);
      settingsRef.current = { preset: preset, temperature: temperature, count: count, attraction: attraction, gravity: gravity, membrane: membrane, permeability: permeability, membraneSelectivity: membraneSelectivity, massRatioB: massRatioB, boxSize: boxSize, particleDiameter: particleDiameter, trace: trace, vectors: vectors, flowTrails: flowTrails, energyColors: energyColors, wallSensors: wallSensors, autoCamera: autoCamera, followTracer: followTracer, systemProbe: systemProbe, timeScale: timeScale, selectedParticle: Math.min(selectedParticle, count - 1) };
      runRef.current = running;

      function persist(patch) {
        if (!ctx.setToolData) return;
        ctx.setToolData(function (prev) {
          var old = (prev && prev.particleLab3d) || {};
          return Object.assign({}, prev, { particleLab3d: Object.assign({}, old, patch) });
        });
      }

      // Engine load via the shared resilient loader (multi-CDN + per-attempt
      // timeout, host-provided) — surfacing a real error with Retry instead of
      // spinning forever. OrbitControls is required (the chamber constructs it
      // unconditionally).
      useEffect(function () {
        if (ready) return;
        var cancelled = false;
        window.StemLab.ensureThree({ orbit: true, orbitRequired: true })
          .then(function () { if (!cancelled) { setLoadError(""); setReady(true); } })
          .catch(function () { if (!cancelled) setLoadError("The 3D engine could not be loaded from any source. School network filters sometimes block CDNs — press Retry, or check the connection."); });
        return function () { cancelled = true; };
      }, [ready, loadAttempt]);

      useEffect(function () {
        if (!ready || !canvasRef.current || !window.THREE) return;
        var THREE = window.THREE, canvas = canvasRef.current;
        var qualityProfile = quality === 'eco' ? { pixelRatio: 1, stars: 70, sphereW: 12, sphereH: 9, flashes: 6, flow: 5 } : (quality === 'ultra' ? { pixelRatio: 2, stars: 240, sphereW: 26, sphereH: 20, flashes: 16, flow: 12 } : { pixelRatio: 1.5, stars: 140, sphereW: 18, sphereH: 14, flashes: 10, flow: 8 });
        var palettes = { solid: { bg: 0x030817, primary: 0x60a5fa, secondary: 0xe0f2fe, edge: 0x93c5fd }, liquid: { bg: 0x00131f, primary: 0x2dd4bf, secondary: 0x38bdf8, edge: 0x5eead4 }, gas: { bg: 0x100819, primary: 0xfbbf24, secondary: 0x22d3ee, edge: 0x67e8f9 }, diffusion: { bg: 0x090617, primary: 0x22d3ee, secondary: 0xf472b6, edge: 0xa78bfa } };
        var palette = palettes[preset] || palettes.gas;
        var palettePrimaryColor = new THREE.Color(palette.primary), paletteSecondaryColor = new THREE.Color(palette.secondary), hotPrimaryColor = new THREE.Color(0xff6b35), hotSecondaryColor = new THREE.Color(0xff3d81);
        var coldSpeedColor = new THREE.Color(0x22d3ee), midSpeedColor = new THREE.Color(0xa78bfa), hotSpeedColor = new THREE.Color(0xfb4d3d), liveSpeedColor = new THREE.Color();
        var reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, qualityProfile.pixelRatio));
        renderer.shadowMap.enabled = quality !== 'eco'; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.setClearColor(palette.bg, 1);
        renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.22;
        if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
        var scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(palette.bg, 0.022);
        var camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100); camera.position.set(11, 8, 13);
        var controls = new THREE.OrbitControls(camera, canvas); controls.enableDamping = true; controls.dampingFactor = 0.08;
        controls.minDistance = 8; controls.maxDistance = 28;
        scene.add(new THREE.HemisphereLight(0xcffafe, 0x172554, 1.15));
        var light = new THREE.DirectionalLight(0xffffff, 1.35); light.position.set(5, 9, 7); light.castShadow = quality !== 'eco'; light.shadow.mapSize.set(quality === 'ultra' ? 2048 : 1024, quality === 'ultra' ? 2048 : 1024); light.shadow.camera.left = light.shadow.camera.bottom = -boxSize; light.shadow.camera.right = light.shadow.camera.top = boxSize; light.shadow.camera.near = 1; light.shadow.camera.far = 35; light.shadow.bias = -0.001; scene.add(light);
        var cyanLight = new THREE.PointLight(palette.primary, 1.7, 28); cyanLight.position.set(-7, 3, 7); scene.add(cyanLight);
        var pinkLight = new THREE.PointLight(palette.secondary, 1.25, 24); pinkLight.position.set(7, -2, -5); scene.add(pinkLight);
        var starGeo = new THREE.BufferGeometry(), starPositions = [], starRandom = seeded(731);
        for (var si = 0; si < qualityProfile.stars; si += 1) { var sr = 13 + starRandom() * 14, st = starRandom() * Math.PI * 2, sp = Math.acos(2 * starRandom() - 1); starPositions.push(sr * Math.sin(sp) * Math.cos(st), sr * Math.cos(sp), sr * Math.sin(sp) * Math.sin(st)); }
        starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
        var starMat = new THREE.PointsMaterial({ color: palette.edge, size: 0.055, transparent: true, opacity: 0.42, depthWrite: false });
        var stars = new THREE.Points(starGeo, starMat); scene.add(stars);
        var boxGeo = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
        var edgeGeo = new THREE.EdgesGeometry(boxGeo), edgeMat = new THREE.LineBasicMaterial({ color: palette.edge, transparent: true, opacity: 0.82 });
        var edges = new THREE.LineSegments(edgeGeo, edgeMat); scene.add(edges);
        var chamberMat = new THREE.MeshPhysicalMaterial({ color: 0x0e7490, transparent: true, opacity: 0.055, roughness: 0.08, metalness: 0.18, side: THREE.BackSide, depthWrite: false });
        var chamber = new THREE.Mesh(boxGeo, chamberMat); scene.add(chamber);
        var grid = new THREE.GridHelper(boxSize, Math.max(8, boxSize * 2), 0x22d3ee, 0x164e63); grid.position.y = -boxSize / 2 - 0.02; grid.material.transparent = true; grid.material.opacity = 0.3; scene.add(grid);
        var shadowGeo = new THREE.PlaneGeometry(boxSize * 0.98, boxSize * 0.98), shadowMat = new THREE.ShadowMaterial({ color: 0x000000, transparent: true, opacity: quality === 'ultra' ? 0.34 : 0.22 });
        var shadowFloor = new THREE.Mesh(shadowGeo, shadowMat); shadowFloor.rotation.x = -Math.PI / 2; shadowFloor.position.y = -boxSize / 2 + 0.015; shadowFloor.receiveShadow = quality !== 'eco'; scene.add(shadowFloor);
        var baseGeo = new THREE.CylinderGeometry(boxSize * 0.48, boxSize * 0.56, 0.24, 48, 1, true);
        var baseMat = new THREE.MeshStandardMaterial({ color: 0x082f49, emissive: palette.primary, emissiveIntensity: 0.55, metalness: 0.72, roughness: 0.24, side: THREE.DoubleSide });
        var base = new THREE.Mesh(baseGeo, baseMat); base.position.y = -boxSize / 2 - 0.17; scene.add(base);
        var sensorGeo = new THREE.PlaneGeometry(boxSize * 0.93, boxSize * 0.93), sensorFaces = [], sensorEnergy = { 'x+': 0, 'x-': 0, 'y+': 0, 'y-': 0, 'z+': 0, 'z-': 0 };
        [{ axis: 'x', side: 1 }, { axis: 'x', side: -1 }, { axis: 'y', side: 1 }, { axis: 'y', side: -1 }, { axis: 'z', side: 1 }, { axis: 'z', side: -1 }].forEach(function (face, faceIndex) {
          var sensorMat = new THREE.MeshBasicMaterial({ color: faceIndex % 2 ? 0x818cf8 : 0x22d3ee, transparent: true, opacity: 0.025, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
          var sensor = new THREE.Mesh(sensorGeo, sensorMat), offset = face.side * (boxSize / 2 - 0.012);
          if (face.axis === 'x') { sensor.position.x = offset; sensor.rotation.y = Math.PI / 2; }
          else if (face.axis === 'y') { sensor.position.y = offset; sensor.rotation.x = Math.PI / 2; }
          else sensor.position.z = offset;
          sensor.userData.faceKey = face.axis + (face.side > 0 ? '+' : '-'); scene.add(sensor); sensorFaces.push(sensor);
        });
        var sphereGeo = new THREE.SphereGeometry(particleDiameter / 2, qualityProfile.sphereW, qualityProfile.sphereH);
        var mats = [new THREE.MeshStandardMaterial({ color: palette.primary, emissive: palette.primary, emissiveIntensity: 0.42, roughness: 0.2, metalness: 0.14 }), new THREE.MeshStandardMaterial({ color: palette.secondary, emissive: palette.secondary, emissiveIntensity: 0.42, roughness: 0.2, metalness: 0.14 })];
        var particles = makeParticles(count, preset, temperature, 2048 + resetKey, massRatioB), particleMaterials = [];
        function makeGlowTexture() {
          var c = document.createElement('canvas'); c.width = c.height = 64; var g = c.getContext('2d');
          var grad = g.createRadialGradient(32, 32, 1, 32, 32, 31); grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.18, 'rgba(255,255,255,.72)'); grad.addColorStop(0.5, 'rgba(80,220,255,.2)'); grad.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = grad; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
        }
        var glowTexture = makeGlowTexture();
        var meshes = [], glows = [];
        particles.forEach(function (p) {
          var particleMat = mats[p.type].clone(); particleMaterials.push(particleMat);
          var m = new THREE.Mesh(sphereGeo, particleMat); m.userData.particleIndex = meshes.length; m.castShadow = quality === 'ultra' || (quality === 'balanced' && meshes.length < 64);
          var glowMat = new THREE.SpriteMaterial({ map: glowTexture, color: p.type ? palette.secondary : palette.primary, transparent: true, opacity: 0.38, blending: THREE.AdditiveBlending, depthWrite: false });
          var glow = new THREE.Sprite(glowMat); glow.scale.set(1.55, 1.55, 1.55); m.add(glow); scene.add(m); meshes.push(m); glows.push(glow);
        });
        var focusGeo = new THREE.TorusGeometry(0.53, 0.035, 10, 48), focusMat = new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.95 });
        var focusRing = new THREE.Mesh(focusGeo, focusMat); focusRing.visible = false; scene.add(focusRing);
        function makeHoloLabelTexture(text) {
          var labelCanvas = document.createElement('canvas'); labelCanvas.width = 512; labelCanvas.height = 112; var labelCtx = labelCanvas.getContext('2d');
          labelCtx.clearRect(0, 0, 512, 112); labelCtx.fillStyle = 'rgba(3,7,18,.72)'; labelCtx.strokeStyle = '#' + new THREE.Color(palette.edge).getHexString(); labelCtx.lineWidth = 2; labelCtx.beginPath(); labelCtx.roundRect(8, 8, 496, 96, 18); labelCtx.fill(); labelCtx.stroke();
          labelCtx.fillStyle = '#' + new THREE.Color(palette.edge).getHexString(); labelCtx.font = '700 28px system-ui, sans-serif'; labelCtx.textAlign = 'center'; labelCtx.textBaseline = 'middle'; labelCtx.fillText(text, 256, 50); labelCtx.font = '600 13px ui-monospace, monospace'; labelCtx.fillStyle = 'rgba(226,232,240,.8)'; labelCtx.fillText('ALLOFLOW PARTICLE CONTAINMENT ARRAY', 256, 78); return new THREE.CanvasTexture(labelCanvas);
        }
        var holoTexture = makeHoloLabelTexture(String(preset || 'gas').toUpperCase() + ' CHAMBER');
        var holoMat = new THREE.SpriteMaterial({ map: holoTexture, transparent: true, opacity: 0.82, depthWrite: false }); var holoLabel = new THREE.Sprite(holoMat); holoLabel.position.set(0, boxSize / 2 + 1.05, 0); holoLabel.scale.set(6.4, 1.4, 1); scene.add(holoLabel);
        var beaconGeo = new THREE.SphereGeometry(0.11, 12, 8), beaconMat = new THREE.MeshBasicMaterial({ color: palette.edge }), beacons = [];
        [-1, 1].forEach(function (bx) { [-1, 1].forEach(function (by) { [-1, 1].forEach(function (bz) { var beacon = new THREE.Mesh(beaconGeo, beaconMat); beacon.position.set(bx * boxSize / 2, by * boxSize / 2, bz * boxSize / 2); scene.add(beacon); beacons.push(beacon); }); }); });
        var attractionGeo = new THREE.BufferGeometry(), attractionMat = new THREE.LineBasicMaterial({ color: 0x818cf8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
        var attractionLines = new THREE.LineSegments(attractionGeo, attractionMat); scene.add(attractionLines);
        var probeGeo = new THREE.IcosahedronGeometry(0.2, 1), probeMat = new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.95 }); var systemBeacon = new THREE.Mesh(probeGeo, probeMat); scene.add(systemBeacon);
        var haloGeo = new THREE.SphereGeometry(1, 18, 12), haloMat = new THREE.MeshBasicMaterial({ color: palette.edge, wireframe: true, transparent: true, opacity: 0.13, blending: THREE.AdditiveBlending, depthWrite: false }); var spreadHalo = new THREE.Mesh(haloGeo, haloMat); scene.add(spreadHalo);
        var densityGeo = new THREE.SphereGeometry(1, quality === 'eco' ? 18 : 28, quality === 'eco' ? 12 : 20), densityMat = new THREE.MeshBasicMaterial({ color: palette.primary, transparent: true, opacity: 0.06, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false }); var densityShell = new THREE.Mesh(densityGeo, densityMat); scene.add(densityShell);
        var dropletHaloGeo = new THREE.SphereGeometry(1, quality === 'eco' ? 14 : 24, quality === 'eco' ? 9 : 16), dropletHalos = [];
        for (var dhi = 0; dhi < (quality === 'eco' ? 4 : 6); dhi += 1) { var dropletHaloMat = new THREE.MeshBasicMaterial({ color: dhi === 0 ? 0x34d399 : (dhi < 3 ? 0x22d3ee : 0x818cf8), wireframe: dhi % 2 === 1, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }), dropletHalo = new THREE.Mesh(dropletHaloGeo, dropletHaloMat); dropletHalo.visible = false; dropletHalo.userData.phase = dhi * 1.13; scene.add(dropletHalo); dropletHalos.push(dropletHalo); }
        var driftArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1, 0xfde047, 0.28, 0.14); scene.add(driftArrow);
        var energyRingGeo = new THREE.RingGeometry(boxSize * 0.31, boxSize * 0.315, 64), energyRingMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.32, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
        var energyRing = new THREE.Mesh(energyRingGeo, energyRingMat); energyRing.rotation.x = -Math.PI / 2; energyRing.position.y = -boxSize / 2 + 0.02; scene.add(energyRing);
        var gravityArrow = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), new THREE.Vector3(-boxSize / 2 + 0.72, boxSize / 2 - 0.72, boxSize / 2 - 0.72), boxSize * 0.28, 0xfde047, 0.38, 0.22); gravityArrow.visible = false; scene.add(gravityArrow);
        var gravityFieldGeo = new THREE.RingGeometry(boxSize * 0.16, boxSize * 0.43, quality === 'eco' ? 40 : 72), gravityFieldMat = new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
        var gravityField = new THREE.Mesh(gravityFieldGeo, gravityFieldMat); gravityField.rotation.x = -Math.PI / 2; gravityField.position.y = -boxSize / 2 + 0.035; gravityField.visible = false; scene.add(gravityField);
        var membraneGeo = new THREE.PlaneGeometry(boxSize * 0.91, boxSize * 0.91, quality === 'eco' ? 8 : 14, quality === 'eco' ? 8 : 14), membraneMat = new THREE.MeshBasicMaterial({ color: 0xa78bfa, wireframe: true, transparent: true, opacity: 0.2, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
        var membranePlane = new THREE.Mesh(membraneGeo, membraneMat); membranePlane.rotation.y = Math.PI / 2; membranePlane.visible = false; scene.add(membranePlane);
        var membranePoreGeo = new THREE.TorusGeometry(1, 0.16, quality === 'eco' ? 6 : 10, quality === 'eco' ? 20 : 36), membranePoreAMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }), membranePoreBMat = new THREE.MeshBasicMaterial({ color: 0xf472b6, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }), membranePores = [];
        for (var py = -2; py <= 2; py += 1) { for (var pz = -2; pz <= 2; pz += 1) { if (Math.abs(py) === 2 && Math.abs(pz) === 2) continue; var poreSpecies = (py + pz + 8) % 2, pore = new THREE.Mesh(membranePoreGeo, poreSpecies ? membranePoreBMat : membranePoreAMat); pore.rotation.y = Math.PI / 2; pore.position.set(0, py * boxSize * 0.175, pz * boxSize * 0.175); pore.userData.species = poreSpecies; pore.userData.phase = (py + 2) * 0.73 + (pz + 2) * 1.17; pore.visible = false; scene.add(pore); membranePores.push(pore); } }
        var speciesHaloGeo = new THREE.SphereGeometry(1, quality === 'eco' ? 12 : 20, quality === 'eco' ? 8 : 14);
        var speciesHaloAMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, wireframe: true, transparent: true, opacity: 0.11, blending: THREE.AdditiveBlending, depthWrite: false }), speciesHaloBMat = new THREE.MeshBasicMaterial({ color: 0xf472b6, wireframe: true, transparent: true, opacity: 0.11, blending: THREE.AdditiveBlending, depthWrite: false });
        var speciesHaloA = new THREE.Mesh(speciesHaloGeo, speciesHaloAMat), speciesHaloB = new THREE.Mesh(speciesHaloGeo, speciesHaloBMat); speciesHaloA.visible = speciesHaloB.visible = false; scene.add(speciesHaloA); scene.add(speciesHaloB);
        var flashPool = [];
        for (var fi = 0; fi < qualityProfile.flashes; fi += 1) { var fm = new THREE.SpriteMaterial({ map: glowTexture, color: 0xfef08a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }); var fs = new THREE.Sprite(fm); fs.visible = false; scene.add(fs); flashPool.push({ sprite: fs, life: 0 }); }
        var arrows = particles.slice(0, 20).map(function () {
          var arrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1, 0xa5f3fc, 0.24, 0.13);
          arrow.visible = false; scene.add(arrow); return arrow;
        });
        var trailGeo = new THREE.BufferGeometry(); var trailMat = new THREE.LineBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.9 });
        var trail = new THREE.Line(trailGeo, trailMat); scene.add(trail); var trailPoints = [];
        var currentFlightGeo = new THREE.BufferGeometry(), currentFlightMat = new THREE.LineDashedMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.8, dashSize: 0.28, gapSize: 0.14, blending: THREE.AdditiveBlending, depthWrite: false }), currentFlightLine = new THREE.Line(currentFlightGeo, currentFlightMat), lastTracerCollision = null, currentFlightEnd = new THREE.Vector3(); currentFlightLine.visible = false; scene.add(currentFlightLine);
        var waypointGeo = new THREE.RingGeometry(0.13, 0.23, quality === 'eco' ? 16 : 28), collisionWaypoints = [], waypointCursor = 0;
        for (var wi = 0; wi < (quality === 'eco' ? 6 : 10); wi += 1) { var waypointMat = new THREE.MeshBasicMaterial({ color: wi % 2 ? 0xfde047 : 0x67e8f9, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }); var waypoint = new THREE.Mesh(waypointGeo, waypointMat); waypoint.visible = false; waypoint.userData.life = 0; waypoint.userData.flight = 0; scene.add(waypoint); collisionWaypoints.push(waypoint); }
        function clearTracerVisuals(anchor) { trailPoints.length = 0; trailGeo.setFromPoints([]); lastTracerCollision = anchor ? new THREE.Vector3(anchor.x, anchor.y, anchor.z) : null; currentFlightLine.visible = false; collisionWaypoints.forEach(function (waypoint) { waypoint.visible = false; waypoint.userData.life = 0; }); }
        var flowLines = [], flowHistories = [];
        for (var ti = 0; ti < Math.min(qualityProfile.flow, particles.length); ti += 1) {
          var fg = new THREE.BufferGeometry(), fc = new THREE.Color().setHSL(0.52 + ti * 0.025, 0.9, 0.63);
          var fmLine = new THREE.LineBasicMaterial({ color: fc, transparent: true, opacity: 0.48, blending: THREE.AdditiveBlending, depthWrite: false });
          var fl = new THREE.Line(fg, fmLine); fl.visible = false; scene.add(fl); flowLines.push(fl); flowHistories.push([]);
        }
        var clock = performance.now(), accumulator = 0, collisionTotal = 0, impulseTotal = 0, metricElapsed = 0, simulationElapsed = 0, transportMilestone = null, membranePassedTotal = 0, membraneBlockedTotal = 0, membranePassedATotal = 0, membranePassedBTotal = 0, membraneNetATotal = 0, membraneNetBTotal = 0, assayPassedA = 0, assayPassedB = 0, assayBlockedA = 0, assayBlockedB = 0, membranePulseA = 0, membranePulseB = 0, membraneBlockPulse = 0, dropletMergePulse = 0, previousClusterSnapshot = null, clusterVisualData = { groups: [] }, assayConditionKey = [settingsRef.current.preset, settingsRef.current.membrane, settingsRef.current.permeability, settingsRef.current.membraneSelectivity].join('|'), pendingFlashEvents = [], fpsFrames = 0, fpsClock = clock;
        var followTarget = new THREE.Vector3(), followDelta = new THREE.Vector3();
        var raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2(), pointerStart = null;
        function onPointerDown(ev) { pointerStart = { x: ev.clientX, y: ev.clientY }; }
        function onPointerUp(ev) {
          if (!pointerStart || Math.hypot(ev.clientX - pointerStart.x, ev.clientY - pointerStart.y) > 6) return;
          var rect = canvas.getBoundingClientRect(); pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1; pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(pointer, camera); var hits = raycaster.intersectObjects(meshes, false);
          if (hits.length) { var index = hits[0].object.userData.particleIndex || 0; setSelectedParticle(index); setTrace(true); persist({ selectedParticle: index, trace: true, traced: true }); if (ctx.announceToSR) ctx.announceToSR('Selected particle ' + (index + 1) + ' for random walk tracing.'); clearTracerVisuals(particles[index]); }
        }
        canvas.addEventListener('pointerdown', onPointerDown); canvas.addEventListener('pointerup', onPointerUp);

        function resize() {
          var w = Math.max(1, canvas.clientWidth), hh = Math.max(1, canvas.clientHeight);
          if (canvas.width !== w || canvas.height !== hh) { renderer.setSize(w, hh, false); camera.aspect = w / hh; camera.updateProjectionMatrix(); }
        }
        function animate(now) {
          frameRef.current = requestAnimationFrame(animate); resize(); var elapsed = Math.min(0.05, (now - clock) / 1000); clock = now;
          var nextAssayConditionKey = [settingsRef.current.preset, settingsRef.current.membrane, settingsRef.current.permeability, settingsRef.current.membraneSelectivity].join('|'); if (nextAssayConditionKey !== assayConditionKey) { assayConditionKey = nextAssayConditionKey; assayPassedA = 0; assayPassedB = 0; assayBlockedA = 0; assayBlockedB = 0; }
          var cameraTracer = particles[settingsRef.current.selectedParticle] || particles[0];
          if (settingsRef.current.followTracer && settingsRef.current.trace && cameraTracer && !reducedMotion) { followTarget.set(cameraTracer.x, cameraTracer.y, cameraTracer.z); followDelta.copy(followTarget).sub(controls.target).multiplyScalar(reducedMotion ? 1 : clamp(elapsed * 4.2, 0.03, 0.24)); controls.target.add(followDelta); camera.position.add(followDelta); }
          controls.autoRotate = !!settingsRef.current.autoCamera && !settingsRef.current.followTracer && !reducedMotion; controls.autoRotateSpeed = 0.62; controls.update(); fpsFrames += 1; if (now - fpsClock >= 1000) { setFps(Math.round(fpsFrames * 1000 / (now - fpsClock))); fpsFrames = 0; fpsClock = now; }
          if (runRef.current || stepRef.current) {
            accumulator += stepRef.current ? 1 / 60 : elapsed * settingsRef.current.timeScale; stepRef.current = false;
            while (accumulator >= 1 / 120) {
              var result = advanceParticles(particles, settingsRef.current, 1 / 120);
              collisionTotal += result.collisions; impulseTotal += result.impulse; membranePassedTotal += result.membranePassed || 0; membranePassedATotal += result.membranePassedA || 0; membranePassedBTotal += result.membranePassedB || 0; assayPassedA += result.membranePassedA || 0; assayPassedB += result.membranePassedB || 0; assayBlockedA += result.membraneBlockedA || 0; assayBlockedB += result.membraneBlockedB || 0; membraneNetATotal += result.membraneNetA || 0; membraneNetBTotal += result.membraneNetB || 0; membraneBlockedTotal += result.membraneBlocked || 0; metricElapsed += 1 / 120; simulationElapsed += 1 / 120; accumulator -= 1 / 120;
              if (result.events && result.events.length) result.events.forEach(function (event) { if (event.kind === 'wall') { var key = event.axis + (event.side > 0 ? '+' : '-'); sensorEnergy[key] = clamp(sensorEnergy[key] + 0.12 + event.power * 0.04, 0, 1); } });
              if (!reducedMotion && result.events && result.events.length) pendingFlashEvents = pendingFlashEvents.concat(result.events).slice(-14);
              if (settingsRef.current.trace && result.tracerCollisions && result.tracerCollisions.length) result.tracerCollisions.forEach(function (collision) { var marker = collisionWaypoints[waypointCursor % collisionWaypoints.length]; waypointCursor += 1; marker.position.set(collision.x, collision.y, collision.z); lastTracerCollision = new THREE.Vector3(collision.x, collision.y, collision.z); marker.userData.life = 1; marker.userData.flight = collision.flight; marker.visible = true; var markerScale = clamp(0.8 + collision.flight / Math.max(0.1, meanFreePathEstimate(settingsRef.current.count, settingsRef.current.boxSize, settingsRef.current.particleDiameter)) * 0.18, 0.8, 1.8); marker.scale.setScalar(markerScale); });
            }
          }
          particles.forEach(function (p, i) {
            var speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy + p.vz * p.vz), heat = speedHeat(speed, settingsRef.current.temperature);
            meshes[i].position.set(p.x, p.y, p.z);
            if (settingsRef.current.energyColors) {
              if (heat < 0.5) liveSpeedColor.copy(coldSpeedColor).lerp(midSpeedColor, heat * 2); else liveSpeedColor.copy(midSpeedColor).lerp(hotSpeedColor, (heat - 0.5) * 2);
              meshes[i].material.color.copy(liveSpeedColor); meshes[i].material.emissive.copy(liveSpeedColor); meshes[i].material.emissiveIntensity = 0.38 + heat * 0.72; glows[i].material.color.copy(liveSpeedColor);
            } else {
              liveSpeedColor.copy(p.type ? paletteSecondaryColor : palettePrimaryColor); meshes[i].material.color.copy(liveSpeedColor); meshes[i].material.emissive.copy(liveSpeedColor); meshes[i].material.emissiveIntensity = 0.32 + clamp((settingsRef.current.temperature - 40) / 860, 0, 1) * 0.62; glows[i].material.color.copy(liveSpeedColor);
            }
            var pulse = 1 + Math.sin(now * 0.003 + i * 0.7) * 0.045;
            meshes[i].scale.setScalar(pulse + clamp(speed * 0.012, 0, 0.12));
            glows[i].material.opacity = clamp(0.2 + speed * 0.055, 0.22, 0.72);
            var gs = clamp(1.25 + speed * 0.16, 1.35, 2.5); glows[i].scale.set(gs, gs, gs);
          });
          stars.rotation.y += elapsed * 0.018; stars.rotation.x = Math.sin(now * 0.00008) * 0.08;
          sensorFaces.forEach(function (sensor) { var key = sensor.userData.faceKey; sensorEnergy[key] = Math.max(0, sensorEnergy[key] - elapsed * 0.7); sensor.visible = !!settingsRef.current.wallSensors; sensor.material.opacity = sensor.visible ? 0.018 + sensorEnergy[key] * 0.38 : 0; });
          beacons.forEach(function (beacon, bi) { var bs = reducedMotion ? 1 : 0.82 + Math.sin(now * 0.003 + bi * 0.75) * 0.22; beacon.scale.setScalar(bs); });
          if (!reducedMotion) { holoLabel.material.opacity = 0.72 + Math.sin(now * 0.0017) * 0.12; holoLabel.position.y = boxSize / 2 + 1.05 + Math.sin(now * 0.0011) * 0.08; }
          var thermal = clamp((settingsRef.current.temperature - 40) / 860, 0, 1);
          cyanLight.color.copy(palettePrimaryColor).lerp(hotPrimaryColor, thermal * 0.68); pinkLight.color.copy(paletteSecondaryColor).lerp(hotSecondaryColor, thermal * 0.52);
          cyanLight.intensity = 1.45 + thermal * 0.85 + (reducedMotion ? 0 : Math.sin(now * 0.0014) * 0.16);
          mats[0].emissiveIntensity = 0.32 + thermal * 0.62; mats[1].emissiveIntensity = 0.32 + thermal * 0.62;
          if (!reducedMotion) { energyRing.rotation.z += elapsed * (0.18 + thermal * 0.5); energyRing.material.opacity = 0.2 + thermal * 0.28 + Math.sin(now * 0.002) * 0.06; }
          var membraneVisible = isTransportPreset(settingsRef.current.preset) && !!settingsRef.current.membrane; membranePlane.visible = membraneVisible; membranePlane.material.opacity = membraneVisible ? 0.06 + (1 - clamp(settingsRef.current.permeability, 0, 1)) * 0.3 : 0; membranePlane.material.color.setHex(settingsRef.current.membraneSelectivity === 'a' ? 0x22d3ee : (settingsRef.current.membraneSelectivity === 'b' ? 0xf472b6 : 0xa78bfa)); if (membraneVisible && !reducedMotion) membranePlane.position.x = Math.sin(now * 0.0018) * 0.025;
          membranePulseA = Math.max(0, membranePulseA - elapsed * 2.8); membranePulseB = Math.max(0, membranePulseB - elapsed * 2.8); membraneBlockPulse = Math.max(0, membraneBlockPulse - elapsed * 3.6); var porePreference = settingsRef.current.membraneSelectivity || 'both', porePermeability = clamp(Number(settingsRef.current.permeability) || 0, 0, 1);
          membranePores.forEach(function (pore) { var preferred = porePreference === 'both' || (porePreference === 'a' && !pore.userData.species) || (porePreference === 'b' && pore.userData.species), openness = porePermeability * (preferred ? 1 : 0.08), porePulse = reducedMotion ? 1 : 1 + Math.sin(now * 0.0035 + pore.userData.phase) * (0.06 + openness * 0.12), poreResponse = pore.userData.species ? membranePulseB : membranePulseA, poreScale = boxSize * 0.035 * (0.38 + openness * 0.92) * porePulse * (1 + poreResponse * 0.26 + membraneBlockPulse * 0.1); pore.visible = membraneVisible; pore.position.x = membranePlane.position.x + (reducedMotion ? 0 : Math.sin(now * 0.0028 + pore.userData.phase) * 0.018); pore.scale.setScalar(poreScale); pore.material.opacity = membraneVisible ? clamp(0.1 + openness * 0.78 + poreResponse * 0.18 + membraneBlockPulse * 0.12, 0, 1) : 0; });
          var gravityStrength = clamp(Number(settingsRef.current.gravity) || 0, 0, 2), gravityVisible = gravityStrength > 0.01; gravityArrow.visible = gravityField.visible = gravityVisible;
          if (gravityVisible) { gravityArrow.setLength(boxSize * (0.16 + gravityStrength * 0.11), 0.38, 0.22); gravityField.material.opacity = 0.08 + gravityStrength * 0.13 + (reducedMotion ? 0 : Math.sin(now * 0.0024) * 0.035); if (!reducedMotion) gravityField.rotation.z -= elapsed * (0.22 + gravityStrength * 0.2); }
          while (pendingFlashEvents.length) { var ev = pendingFlashEvents.shift(), slot = flashPool.find(function (f) { return f.life <= 0; }) || flashPool[0], isMembranePass = ev.kind === 'membrane-pass', isMembraneBlock = ev.kind === 'membrane-block', isDropletMerge = ev.kind === 'droplet-merge'; slot.life = isDropletMerge ? 1.5 : (isMembranePass || isMembraneBlock ? 1.2 : 1); slot.kind = ev.kind; slot.sprite.visible = true; slot.sprite.position.set(ev.x, ev.y, ev.z); slot.sprite.material.color.setHex(isDropletMerge ? 0x34d399 : (isMembraneBlock ? 0xfb7185 : (isMembranePass ? (ev.species ? 0xf472b6 : 0x22d3ee) : (ev.kind === 'particle' ? 0xa78bfa : 0xfef08a)))); if (isMembranePass) { if (ev.species) membranePulseB = 1; else membranePulseA = 1; } if (isMembraneBlock) membraneBlockPulse = 1; if (isDropletMerge) dropletMergePulse = 1; var es = clamp((isDropletMerge ? 0.78 : (isMembranePass ? 0.42 : (isMembraneBlock ? 0.5 : 0.28))) + ev.power * (isDropletMerge ? 0.035 : 0.13), 0.32, 1.45); slot.sprite.scale.set(es, es, es); }
          flashPool.forEach(function (f) { if (f.life <= 0) return; var membraneEvent = f.kind === 'membrane-pass' || f.kind === 'membrane-block', mergeEvent = f.kind === 'droplet-merge', specialEvent = membraneEvent || mergeEvent; f.life -= elapsed * (mergeEvent ? 1.8 : (membraneEvent ? 2.8 : 4.5)); f.sprite.material.opacity = Math.min(1, Math.max(0, f.life)) * (specialEvent ? 0.96 : 0.88); var sc = f.sprite.scale.x + elapsed * (mergeEvent ? 3.6 : (membraneEvent ? 2.8 : 1.8)); f.sprite.scale.set(sc, sc, sc); if (f.life <= 0) f.sprite.visible = false; });
          var selected = particles[settingsRef.current.selectedParticle] || particles[0];
          focusRing.visible = !!settingsRef.current.trace;
          if (focusRing.visible && selected) { focusRing.position.set(selected.x, selected.y, selected.z); focusRing.quaternion.copy(camera.quaternion); focusRing.rotation.z += elapsed * 1.5; }
          collisionWaypoints.forEach(function (waypoint, waypointIndex) { waypoint.userData.life = Math.max(0, waypoint.userData.life - elapsed * 0.075); waypoint.visible = !!settingsRef.current.trace && waypoint.userData.life > 0; if (!waypoint.visible) return; waypoint.quaternion.copy(camera.quaternion); waypoint.material.opacity = 0.22 + waypoint.userData.life * 0.72; if (!reducedMotion) waypoint.rotation.z += elapsed * (waypointIndex % 2 ? -0.65 : 0.65); });
          currentFlightLine.visible = !!settingsRef.current.trace && !!selected && !!lastTracerCollision;
          if (currentFlightLine.visible) { currentFlightEnd.set(selected.x, selected.y, selected.z); currentFlightGeo.setFromPoints([lastTracerCollision, currentFlightEnd]); currentFlightLine.computeLineDistances(); var liveFlightRatio = clamp((Number(selected.distanceSinceParticleHit) || 0) / Math.max(0.1, meanFreePathEstimate(settingsRef.current.count, settingsRef.current.boxSize, settingsRef.current.particleDiameter)), 0, 2); currentFlightMat.color.setHSL(0.52 - liveFlightRatio * 0.2, 0.92, 0.62); currentFlightMat.opacity = reducedMotion ? 0.78 : 0.68 + Math.sin(now * 0.006) * 0.14; currentFlightMat.dashSize = 0.22 + liveFlightRatio * 0.1; }
          arrows.forEach(function (arrow, i) {
            var p = particles[i];
            arrow.visible = !!settingsRef.current.vectors;
            if (!p || !arrow.visible) return;
            var speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy + p.vz * p.vz);
            if (speed > 0.001) arrow.setDirection(new THREE.Vector3(p.vx, p.vy, p.vz).normalize());
            arrow.position.set(p.x, p.y, p.z); arrow.setLength(clamp(speed * 0.42, 0.35, 2.2), 0.24, 0.13);
          });
          var networkPoints = [], networkLimit = 90, cutoff = 2.25;
          if (settingsRef.current.attraction > 0.04) {
            for (var ni = 0; ni < particles.length && networkPoints.length < networkLimit * 2; ni += 1) {
              for (var nj = ni + 1; nj < particles.length && networkPoints.length < networkLimit * 2; nj += 1) {
                var na = particles[ni], nb = particles[nj], ndx = nb.x - na.x, ndy = nb.y - na.y, ndz = nb.z - na.z;
                if (ndx * ndx + ndy * ndy + ndz * ndz < cutoff * cutoff) { networkPoints.push(new THREE.Vector3(na.x, na.y, na.z), new THREE.Vector3(nb.x, nb.y, nb.z)); }
              }
            }
          }
          attractionGeo.setFromPoints(networkPoints); attractionMat.opacity = clamp(settingsRef.current.attraction * 0.22, 0, 0.42);
          dropletMergePulse = Math.max(0, dropletMergePulse - elapsed * 2.4); var showDropletHalos = settingsRef.current.attraction > 0.6; dropletHalos.forEach(function (halo, haloIndex) { var group = clusterVisualData.groups && clusterVisualData.groups[haloIndex], visible = showDropletHalos && group && group.size >= 3; halo.visible = !!visible; if (!visible) return; var followRate = reducedMotion ? 1 : clamp(elapsed * 5.2, 0.04, 0.28), targetRadius = Math.max(0.45, Number(group.radius) || 0.45), haloPulse = reducedMotion ? 1 : 1 + Math.sin(now * 0.0022 + halo.userData.phase) * 0.055; halo.position.x += (group.x - halo.position.x) * followRate; halo.position.y += (group.y - halo.position.y) * followRate; halo.position.z += (group.z - halo.position.z) * followRate; var nextScale = halo.scale.x + (targetRadius * haloPulse * (1 + dropletMergePulse * 0.18) - halo.scale.x) * followRate; halo.scale.setScalar(nextScale); halo.material.opacity = clamp(0.07 + group.size / Math.max(1, settingsRef.current.count) * 0.48 + dropletMergePulse * 0.1 + (reducedMotion ? 0 : Math.sin(now * 0.0018 + halo.userData.phase) * 0.025), 0.07, 0.52); if (!reducedMotion) { halo.rotation.y += elapsed * (0.08 + haloIndex * 0.018); halo.rotation.z -= elapsed * 0.04; } });
          var collective = systemMoments(particles), verticalDensity = heightDistribution(particles, settingsRef.current.boxSize, 8), liveDiffusion = diffusionMetrics(particles, settingsRef.current.boxSize), diffusionVisible = isTransportPreset(settingsRef.current.preset), probeVisible = !!settingsRef.current.systemProbe;
          speciesHaloA.visible = speciesHaloB.visible = diffusionVisible;
          if (diffusionVisible) { speciesHaloA.position.set(liveDiffusion.centerA.x, liveDiffusion.centerA.y, liveDiffusion.centerA.z); speciesHaloB.position.set(liveDiffusion.centerB.x, liveDiffusion.centerB.y, liveDiffusion.centerB.z); speciesHaloA.scale.setScalar(Math.max(0.2, liveDiffusion.spreadA)); speciesHaloB.scale.setScalar(Math.max(0.2, liveDiffusion.spreadB)); speciesHaloAMat.opacity = speciesHaloBMat.opacity = 0.07 + (1 - liveDiffusion.entropy) * 0.08; if (!reducedMotion) { speciesHaloA.rotation.y += elapsed * 0.11; speciesHaloB.rotation.y -= elapsed * 0.13; } }
          systemBeacon.visible = spreadHalo.visible = densityShell.visible = driftArrow.visible = probeVisible; systemBeacon.position.set(collective.x, collective.y, collective.z); spreadHalo.position.copy(systemBeacon.position); densityShell.position.copy(systemBeacon.position); spreadHalo.scale.setScalar(Math.max(0.15, collective.spread)); densityShell.scale.setScalar(Math.max(0.15, collective.spread)); densityShell.material.opacity = clamp(0.035 + collective.density * 0.16, 0.04, 0.2);
          if (probeVisible) { var driftVector = new THREE.Vector3(collective.vx, collective.vy, collective.vz); if (driftVector.lengthSq() > 0.000001) driftArrow.setDirection(driftVector.normalize()); driftArrow.position.copy(systemBeacon.position); driftArrow.setLength(clamp(collective.drift * 1.4, 0.35, 3), 0.28, 0.14); var beaconPulse = reducedMotion ? 1 : 0.9 + Math.sin(now * 0.004) * 0.18; systemBeacon.scale.setScalar(beaconPulse); spreadHalo.rotation.y += reducedMotion ? 0 : elapsed * 0.18; }
          if (settingsRef.current.trace && selected) {
            trail.visible = true; trailPoints.push(new THREE.Vector3(selected.x, selected.y, selected.z));
            if (trailPoints.length > 90) trailPoints.shift(); trailGeo.setFromPoints(trailPoints);
          } else { trail.visible = false; trailPoints.length = 0; }
          flowLines.forEach(function (line, li) {
            var enabled = !!settingsRef.current.flowTrails && !reducedMotion, fp = particles[Math.floor(li * particles.length / flowLines.length)];
            line.visible = enabled;
            if (!enabled || !fp) { flowHistories[li].length = 0; return; }
            var hist = flowHistories[li]; hist.push(new THREE.Vector3(fp.x, fp.y, fp.z)); if (hist.length > 32) hist.shift(); line.geometry.setFromPoints(hist);
          });
          if (now - lastUiRef.current > 400) {
            lastUiRef.current = now; var m = metrics(particles, impulseTotal, settingsRef.current.boxSize, metricElapsed, settingsRef.current.massRatioB);
            var next = { temperature: m.temperature, pressure: m.pressure, energy: m.energy, collisions: collisionTotal };
            var diffusion = liveDiffusion; diffusion.elapsed = simulationElapsed; diffusion.coefficient = diffusion.msd / (6 * Math.max(0.001, simulationElapsed)); diffusion.coefficientA = diffusion.msdA / (6 * Math.max(0.001, simulationElapsed)); diffusion.coefficientB = diffusion.msdB / (6 * Math.max(0.001, simulationElapsed)); diffusion.flux = membranePassedTotal / Math.max(0.001, metricElapsed); diffusion.blocked = membraneBlockedTotal / Math.max(0.001, metricElapsed); diffusion.fluxA = membranePassedATotal / Math.max(0.001, metricElapsed); diffusion.fluxB = membranePassedBTotal / Math.max(0.001, metricElapsed); diffusion.netFluxA = membraneNetATotal / Math.max(0.001, metricElapsed); diffusion.netFluxB = membraneNetBTotal / Math.max(0.001, metricElapsed); diffusion.assayPassedA = assayPassedA; diffusion.assayPassedB = assayPassedB; diffusion.assayBlockedA = assayBlockedA; diffusion.assayBlockedB = assayBlockedB; diffusion.assayConditionKey = assayConditionKey; if (transportMilestone == null && ((settingsRef.current.preset === 'diffusion' && diffusion.mixing >= 0.8) || (settingsRef.current.preset === 'osmosis' && diffusion.osmoticShift >= 0.05 && diffusion.soluteLeak < 0.15))) transportMilestone = simulationElapsed; diffusion.milestoneTime = transportMilestone;
            var kinetic = speciesKinetics(particles, settingsRef.current.massRatioB, 12), ensemble = ensembleFreeFlightStats(particles), clusters = clusterMetrics(particles, Math.max(1.1, settingsRef.current.particleDiameter * 1.9)), clusterMerged = isCoalescence(previousClusterSnapshot, clusters, Math.max(2, Math.round(settingsRef.current.count * 0.02))); if (clusterMerged && !reducedMotion && clusters.groups[0]) pendingFlashEvents = pendingFlashEvents.concat([{ kind: 'droplet-merge', x: clusters.groups[0].x, y: clusters.groups[0].y, z: clusters.groups[0].z, power: clusters.largest - Number(previousClusterSnapshot.largest || 0) }]).slice(-14); previousClusterSnapshot = clusters; setStats(next); setDistribution(speedDistribution(particles, 12)); setSpeciesMotion(kinetic); setEnsembleFlights(ensemble); setDiffusionInfo(diffusion); clusterVisualData = clusters; setClusterInfo(clusters); setHistory(function (old) { return old.concat([{ temperature: m.temperature, temperatureA: kinetic.a.temperature, temperatureB: kinetic.b.temperature, pressure: m.pressure, energy: m.energy, collisions: collisionTotal, mixing: diffusion.mixing, entropy: diffusion.entropy, solventRight: diffusion.solventRight, soluteLeak: diffusion.soluteLeak, coefficientA: diffusion.coefficientA, coefficientB: diffusion.coefficientB, msdA: diffusion.msdA, msdB: diffusion.msdB, netFluxA: diffusion.netFluxA, netFluxB: diffusion.netFluxB, heightCenter: verticalDensity.centerY, heightRatio: verticalDensity.bottomTopRatio, clusterFraction: clusters.largestFraction, clusterCount: clusters.clusterCount, clusterLargest: clusters.largest, clusterMerge: clusterMerged, bondedFraction: clusters.bondedFraction, attraction: settingsRef.current.attraction, gravity: settingsRef.current.gravity, elapsed: diffusion.elapsed }]).slice(-36); });
            setSystemInfo({ x: collective.x, y: collective.y, z: collective.z, spread: collective.spread, density: collective.density, drift: collective.drift }); setHeightInfo(verticalDensity);
            setWallFaceInfo({ 'x+': sensorEnergy['x+'], 'x-': sensorEnergy['x-'], 'y+': sensorEnergy['y+'], 'y-': sensorEnergy['y-'], 'z+': sensorEnergy['z+'], 'z-': sensorEnergy['z-'] });
            if (selected) { var journey = particleJourney(selected); setSelectedInfo({ speed: Math.sqrt(selected.vx * selected.vx + selected.vy * selected.vy + selected.vz * selected.vz), x: selected.x, y: selected.y, z: selected.z, type: selected.type ? 1 : 0, pathLength: journey.pathLength, displacement: journey.displacement, efficiency: journey.efficiency, journeyTime: journey.journeyTime, meanFreePath: journey.meanFreePath, meanFreePathError: journey.meanFreePathError, relativeUncertainty: journey.relativeUncertainty, freeFlightSamples: journey.freeFlightSamples, freeFlights: journey.freeFlights, currentFreeFlight: journey.currentFreeFlight, collisionRate: journey.collisionRate, wallHits: journey.wallHits, particleHits: journey.particleHits, membraneHits: journey.membraneHits }); }
            collisionTotal = 0; impulseTotal = 0; membranePassedTotal = 0; membraneBlockedTotal = 0; membranePassedATotal = 0; membranePassedBTotal = 0; membraneNetATotal = 0; membraneNetBTotal = 0; metricElapsed = 0;
          }
          renderer.render(scene, camera);
        }
        runtimeRef.current = { renderer: renderer, scene: scene, particles: particles, camera: camera, controls: controls, clearTracerVisuals: clearTracerVisuals };
        frameRef.current = requestAnimationFrame(animate);
        return function () {
          cancelAnimationFrame(frameRef.current); canvas.removeEventListener('pointerdown', onPointerDown); canvas.removeEventListener('pointerup', onPointerUp); controls.dispose(); boxGeo.dispose(); edgeGeo.dispose(); baseGeo.dispose(); shadowGeo.dispose(); sensorGeo.dispose(); sphereGeo.dispose(); beaconGeo.dispose(); focusGeo.dispose(); probeGeo.dispose(); haloGeo.dispose(); densityGeo.dispose(); dropletHaloGeo.dispose(); attractionGeo.dispose(); energyRingGeo.dispose(); gravityFieldGeo.dispose(); membraneGeo.dispose(); membranePoreGeo.dispose(); speciesHaloGeo.dispose(); starGeo.dispose(); trailGeo.dispose(); trailMat.dispose(); currentFlightGeo.dispose(); currentFlightMat.dispose(); waypointGeo.dispose(); collisionWaypoints.forEach(function (waypoint) { waypoint.material.dispose(); }); flowLines.forEach(function (line) { line.geometry.dispose(); line.material.dispose(); }); edgeMat.dispose(); chamberMat.dispose(); baseMat.dispose(); shadowMat.dispose(); beaconMat.dispose(); holoMat.dispose(); holoTexture.dispose(); sensorFaces.forEach(function (sensor) { sensor.material.dispose(); }); focusMat.dispose(); probeMat.dispose(); haloMat.dispose(); densityMat.dispose(); dropletHalos.forEach(function (halo) { halo.material.dispose(); }); attractionMat.dispose(); energyRingMat.dispose(); gravityFieldMat.dispose(); membraneMat.dispose(); membranePoreAMat.dispose(); membranePoreBMat.dispose(); speciesHaloAMat.dispose(); speciesHaloBMat.dispose(); starMat.dispose(); glowTexture.dispose(); flashPool.forEach(function (f) { f.sprite.material.dispose(); }); glows.forEach(function (g) { g.material.dispose(); }); particleMaterials.forEach(function (m) { m.dispose(); }); arrows.forEach(function (a) { scene.remove(a); }); mats.forEach(function (m) { m.dispose(); }); driftArrow.line.geometry.dispose(); driftArrow.line.material.dispose(); driftArrow.cone.geometry.dispose(); driftArrow.cone.material.dispose(); gravityArrow.line.geometry.dispose(); gravityArrow.line.material.dispose(); gravityArrow.cone.geometry.dispose(); gravityArrow.cone.material.dispose(); renderer.dispose(); runtimeRef.current = null;
        };
      }, [ready, preset, count, boxSize, particleDiameter, massRatioB, resetKey, quality]);

      useEffect(function () {
        function onFullscreenChange() { var fsEl = document.fullscreenElement || document.webkitFullscreenElement; setIsFullscreen(fsEl === stageRef.current); }
        document.addEventListener('fullscreenchange', onFullscreenChange);
        document.addEventListener('webkitfullscreenchange', onFullscreenChange);
        return function () { document.removeEventListener('fullscreenchange', onFullscreenChange); document.removeEventListener('webkitfullscreenchange', onFullscreenChange); };
      }, []);
      function enterCssFullscreen() {
        // Native fullscreen is blocked in sandboxed iframes (e.g. the Canvas
        // surface) and some embeds — fall back to an in-page immersive view
        // so the button always does something visible.
        setCssFullscreen(true);
        if (ctx.announceToSR) ctx.announceToSR('Immersive view enabled. Press Escape or the exit button to leave.');
      }
      function toggleFullscreen() {
        var stage = stageRef.current; if (!stage) return;
        if (cssFsRef.current) { setCssFullscreen(false); if (ctx.announceToSR) ctx.announceToSR('Exited immersive view.'); return; }
        var fsEl = document.fullscreenElement || document.webkitFullscreenElement;
        if (fsEl) { var exitFs = document.exitFullscreen || document.webkitExitFullscreen; Promise.resolve(exitFs && exitFs.call(document)).catch(function () {}); return; }
        var requestFs = stage.requestFullscreen || stage.webkitRequestFullscreen;
        if (requestFs && document.fullscreenEnabled !== false) { Promise.resolve(requestFs.call(stage)).catch(function () { enterCssFullscreen(); }); }
        else enterCssFullscreen();
      }
      useEffect(function () {
        if (!cssFullscreen) return;
        var previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return function () { document.body.style.overflow = previousOverflow; };
      }, [cssFullscreen]);
      function updateNotebook(field, value) {
        if (field === 'prediction') setPrediction(value); else if (field === 'observation') setObservation(value); else setConclusion(value);
        var patch = {}; patch[field] = value; persist(patch);
      }
      function buildLabReport() {
        var title = currentProtocol ? currentProtocol.title : 'Free Laboratory Investigation';
        var trialLines = trials.length ? trials.map(function (trial, i) { return 'Trial ' + (i + 1) + ': ' + trial.temperature + ' K, pressure ' + trial.pressure + ', N=' + trial.count + ', volume=' + Math.round(trial.boxSize * trial.boxSize * trial.boxSize) + ' u\u00B3, gravity=' + Number(trial.gravity || 0).toFixed(1) + ' g*, permeability=' + Number(trial.permeability == null ? 1 : trial.permeability).toFixed(2) + ', preference=' + (trial.membraneSelectivity || 'both') + ', mass B=' + Number(trial.massRatioB || 1).toFixed(1) + 'x, osmotic shift=' + Math.round(Number(trial.osmoticShift || 0) * 100) + '%, solute leak=' + Math.round(Number(trial.soluteLeak || 0) * 100) + '%, mixing=' + Math.round(Number(trial.mixing || 0) * 100) + '%, entropy=' + Math.round(Number(trial.entropy || 0) * 100) + '%, D*A=' + Number(trial.coefficientA || 0).toFixed(2) + ', D*B=' + Number(trial.coefficientB || 0).toFixed(2) + ', A transmission=' + Math.round(Number(trial.transmissionA || 0) * 100) + '%, B transmission=' + Math.round(Number(trial.transmissionB || 0) * 100) + '%, separation=' + Number(trial.separation || 0).toFixed(2) + 'x, milestone=' + (trial.milestoneTime == null ? 'not reached' : Number(trial.milestoneTime).toFixed(1) + ' s'); }).join('\n') : 'No trials recorded yet.';
        return 'Particle Lab 3D \u2014 ' + title + '\n\nPrediction:\n' + (prediction || '(not entered)') + '\n\nMeasurements:\n' + trialLines + '\n\nObservation:\n' + (observation || '(not entered)') + '\n\nConclusion:\n' + (conclusion || '(not entered)') + '\n\nModel note: simplified mass-adjustable particles in a deterministic educational simulation.';
      }
      function localCoachFeedback() {
        if (!prediction.trim()) return 'Start by making a prediction that names the variable you will change. What do you expect that variable to do to particle motion?';
        if (!trials.length) return 'Your prediction is ready, but you need measurement evidence. Which two conditions could you record while changing only one variable?';
        if (!observation.trim()) return 'Look at both the visible motion and the measurements. What changed between your trials, and what stayed controlled?';
        if (conclusion.trim().length < 20) return 'Build your conclusion from evidence: was your prediction supported, and which specific measurement supports that claim?';
        return 'You have a complete investigation. Which piece of evidence most strongly supports your conclusion, and what alternative explanation can you rule out?';
      }
      async function requestLabCoach() {
        if (isCoaching) return; setIsCoaching(true);
        try {
          var feedback = '';
          if (ctx.aiHintsEnabled && typeof ctx.callGemini === 'function') {
            var prompt = ['You are a warm Socratic K-12 particle-physics lab coach.', 'Respond in at most 4 sentences and end with exactly one question.', 'Do not give the scientific conclusion. Point the student back to their own measurements and controlled variables.', 'Protocol: ' + (currentProtocol ? currentProtocol.title : 'Free laboratory'), 'Prediction: ' + String(prediction || '(none)').slice(0, 800), 'Trials: ' + JSON.stringify(trials.slice(-2)), 'Observation: ' + String(observation || '(none)').slice(0, 800), 'Conclusion draft: ' + String(conclusion || '(none)').slice(0, 1000)].join('\n');
            var response = await ctx.callGemini(prompt, false, false, 0.45); feedback = typeof response === 'string' ? response : String((response && (response.text || response.output || response.response)) || '');
          }
          if (!feedback.trim()) feedback = localCoachFeedback();
          feedback = feedback.trim().slice(0, 1200); setCoachFeedback(feedback); persist({ coachFeedback: feedback, coachRequests: (bucket.coachRequests || 0) + 1 });
          if (ctx.announceToSR) ctx.announceToSR('Lab coach feedback is ready.');
        } catch (error) { var fallback = localCoachFeedback(); setCoachFeedback(fallback); persist({ coachFeedback: fallback }); if (ctx.addToast) ctx.addToast('Using the built-in lab coach.', 'info'); }
        finally { setIsCoaching(false); }
      }
      function copyLabReport() {
        var report = buildLabReport();
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(report).then(function () { if (ctx.addToast) ctx.addToast('Lab report copied.', 'success'); }).catch(function () { if (ctx.addToast) ctx.addToast('Could not copy the lab report.', 'info'); });
        else if (ctx.addToast) ctx.addToast('Clipboard access is unavailable.', 'info');
      }
      function restoreKeysFocus() {
        var opener = keysOpenerRef.current || canvasRef.current;
        requestAnimationFrame(function () { if (opener && opener.isConnected && typeof opener.focus === 'function') opener.focus(); });
      }
      function closeKeys() {
        setShowKeys(false);
        if (ctx.announceToSR) ctx.announceToSR('Closed the keyboard shortcuts panel.');
        restoreKeysFocus();
      }
      function openKeys(opener) {
        keysOpenerRef.current = opener || document.activeElement || canvasRef.current;
        setShowKeys(true);
      }
      useEffect(function () {
        if (!showKeys) return;
        var dialog = keysDialogRef.current;
        var closeButton = keysCloseRef.current;
        if (closeButton) closeButton.focus();
        function onKeysKeyDown(event) {
          if (event.key === 'Escape' || event.key === '?') { event.preventDefault(); event.stopPropagation(); closeKeys(); return; }
          if (event.key !== 'Tab' || !dialog) return;
          var focusable = Array.prototype.slice.call(dialog.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
          if (!focusable.length) { event.preventDefault(); dialog.focus(); return; }
          var first = focusable[0], last = focusable[focusable.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
        if (dialog) dialog.addEventListener('keydown', onKeysKeyDown);
        return function () { if (dialog) dialog.removeEventListener('keydown', onKeysKeyDown); };
      }, [showKeys]);
      function onStageKeyDown(event) {
        if (event.key !== 'Escape' || !cssFsRef.current || showKeys) return;
        event.preventDefault(); event.stopPropagation(); setCssFullscreen(false);
        if (ctx.announceToSR) ctx.announceToSR('Exited immersive view.');
      }
      function onLabKey(event) {
        var target = event.target, tag = target && target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON' || (target && target.isContentEditable)) return;
        if (event.key === 'Escape' && cssFsRef.current) { event.preventDefault(); event.stopPropagation(); setCssFullscreen(false); if (ctx.announceToSR) ctx.announceToSR('Exited immersive view.'); return; }
        if (event.code === 'Space') { event.preventDefault(); setRunning(function (value) { var next = !value; if (ctx.announceToSR) ctx.announceToSR(next ? 'Particle simulation running.' : 'Particle simulation paused.'); return next; }); }
        else if (event.key === 'r' || event.key === 'R') { setRunning(false); setHistory([]); setResetKey(function (k) { return k + 1; }); if (ctx.announceToSR) ctx.announceToSR('Particle chamber reset.'); }
        else if (event.key === 't' || event.key === 'T') { setTrace(function (value) { var next = !value; if (!next) setFollowTracer(false); persist({ trace: next, followTracer: false, traced: next || bucket.traced }); return next; }); }
        else if (event.key === 'v' || event.key === 'V') { setVectors(function (value) { persist({ vectors: !value }); return !value; }); }
        else if (event.key === 'e' || event.key === 'E') { setEnergyColors(function (value) { persist({ energyColors: !value }); return !value; }); }
        else if (event.key === 'm' || event.key === 'M') { setMembrane(function (value) { var next = !value; persist({ membrane: next }); if (ctx.announceToSR) ctx.announceToSR(next ? 'Diffusion membrane enabled.' : 'Diffusion membrane removed.'); return next; }); }
        else if (event.key === 'g' || event.key === 'G') { setGravity(function (value) { var next = value > 0.01 ? 0 : 1; persist({ gravity: next }); if (ctx.announceToSR) ctx.announceToSR(next ? 'Gravity field enabled at one model g.' : 'Gravity field disabled.'); return next; }); }
        else if (event.key === 'f' || event.key === 'F') toggleFullscreen();
        else if (event.key === 'c' || event.key === 'C') setAutoCamera(function (value) { var next = !value; if (next) setFollowTracer(false); persist({ autoCamera: next, followTracer: false }); return next; });
        else if (event.key === 'l' || event.key === 'L') { if (prefersReducedMotion) { if (ctx.announceToSR) ctx.announceToSR('Tracer follow camera is unavailable while reduced motion is preferred.'); } else setFollowTracer(function (value) { var next = !value; if (next) { setTrace(true); setAutoCamera(false); persist({ followTracer: true, trace: true, traced: true, autoCamera: false }); } else persist({ followTracer: false }); if (ctx.announceToSR) ctx.announceToSR(next ? 'Tracer follow camera enabled.' : 'Tracer follow camera disabled.'); return next; }); }
        else if (event.key === 'h' || event.key === 'H') { setShowHud(function (value) { var next = !value; if (ctx.announceToSR) ctx.announceToSR(next ? 'Simulation controls shown.' : 'Simulation controls hidden. Press H to bring them back.'); return next; }); }
        else if (event.key === '?') { event.preventDefault(); openKeys(event.currentTarget); }
      }
      function applyProtocol(protocol) {
        if (!protocol || protocol.id === 'free') { setActiveProtocol('free'); persist({ activeProtocol: 'free' }); return; }
        var protocolOsmosis = protocol.id === 'osmosis', protocolTransport = protocol.id === 'mixing' || protocolOsmosis, protocolTracer = protocol.id === 'mfp' || protocol.id === 'crosssection', protocolGravity = protocol.gravity == null ? 0 : clamp(Number(protocol.gravity) || 0, 0, 2), protocolDiameter = protocol.particleDiameter == null ? 0.58 : clamp(Number(protocol.particleDiameter) || 0.58, 0.36, 0.9);
        setActiveProtocol(protocol.id); setPreset(protocol.preset); setTemperature(protocol.temperature); setCount(protocol.count); setBoxSize(protocol.boxSize); setAttraction(protocol.attraction); setGravity(protocolGravity); setMembrane(protocolTransport); setPermeability(protocolOsmosis ? 0.72 : (protocol.id === 'mixing' ? 0.45 : 1)); setMembraneSelectivity(protocolOsmosis ? 'a' : 'both'); setMassRatioB(1); setParticleDiameter(protocolDiameter); setTrace(protocolTracer); setFollowTracer(false); setSelectedParticle(0); setRunning(false); setTrials([]); setTracerTrials([]); setHistory([]); setResetKey(function (k) { return k + 1; });
        persist({ activeProtocol: protocol.id, preset: protocol.preset, temperature: protocol.temperature, count: protocol.count, boxSize: protocol.boxSize, attraction: protocol.attraction, gravity: protocolGravity, membrane: protocolTransport, permeability: protocolOsmosis ? 0.72 : (protocol.id === 'mixing' ? 0.45 : 1), membraneSelectivity: protocolOsmosis ? 'a' : 'both', massRatioB: 1, particleDiameter: protocolDiameter, trace: protocolTracer, followTracer: false, selectedParticle: 0, trials: [], tracerTrials: [], protocolsOpened: Object.assign({}, bucket.protocolsOpened || {}, (function () { var o = {}; o[protocol.id] = true; return o; })()) });
        if (ctx.announceToSR) ctx.announceToSR('Loaded the ' + protocol.title + ' guided experiment.');
      }
      function choosePreset(next) {
        setPreset(next); setRunning(false); setHistory([]); if (next === 'osmosis') { setMembrane(true); setPermeability(0.72); setMembraneSelectivity('a'); setGravity(0); } setResetKey(function (k) { return k + 1; });
        var seen = Object.assign({}, bucket.presetsSeen || {}); seen[next] = true;
        persist(Object.assign({ preset: next, presetsSeen: seen }, next === 'osmosis' ? { membrane: true, permeability: 0.72, membraneSelectivity: 'a', gravity: 0 } : {}));
        if (ctx.announceToSR) ctx.announceToSR('Loaded the ' + next + ' particle experiment.');
      }
      function toggleRun() {
        var next = !running; setRunning(next);
        if (next) persist({ runs: (bucket.runs || 0) + 1 });
        if (ctx.announceToSR) ctx.announceToSR(next ? 'Particle simulation running.' : 'Particle simulation paused.');
      }
      function setTemp(next) {
        var value = Number(next); setTemperature(value); persist({ temperature: value });
        var rt = runtimeRef.current;
        if (rt && rt.particles.length) {
          var current = metrics(rt.particles, 0, boxSize, 1, massRatioB).temperature || 1;
          var scale = Math.sqrt(value / current);
          rt.particles.forEach(function (p) { p.vx *= scale; p.vy *= scale; p.vz *= scale; });
        }
      }
      function selectParticle(nextValue) {
        var index = clamp(Math.round(Number(nextValue) || 1), 1, count) - 1;
        setSelectedParticle(index); setTrace(true); persist({ selectedParticle: index, trace: true, traced: true });
        var rt = runtimeRef.current, particle = rt && rt.particles ? rt.particles[index] : null;
        if (particle && rt.clearTracerVisuals) rt.clearTracerVisuals(particle);
        if (ctx.announceToSR) ctx.announceToSR('Selected particle ' + (index + 1) + ' of ' + count + ' for random walk tracing.');
      }
      function resetTracerJourney() {
        var rt = runtimeRef.current, selected = rt && rt.particles ? rt.particles[Math.min(selectedParticle, rt.particles.length - 1)] : null;
        if (!selected) return;
        if (rt.clearTracerVisuals) rt.clearTracerVisuals(selected);
        selected.homeX = selected.x; selected.homeY = selected.y; selected.homeZ = selected.z; selected.pathLength = 0; selected.journeyTime = 0; selected.distanceSinceParticleHit = 0; selected.freeFlights = []; selected.wallHits = 0; selected.particleHits = 0; selected.membraneHits = 0;
        setSelectedInfo(function (old) { return Object.assign({}, old, { pathLength: 0, displacement: 0, efficiency: 0, journeyTime: 0, meanFreePath: 0, meanFreePathError: 0, relativeUncertainty: 0, freeFlightSamples: 0, freeFlights: [], currentFreeFlight: 0, collisionRate: 0, wallHits: 0, particleHits: 0, membraneHits: 0 }); });
        setTrace(true); persist({ trace: true, traced: true, tracerRuns: (bucket.tracerRuns || 0) + 1 });
        if (ctx.announceToSR) ctx.announceToSR('Started a new random walk measurement for particle ' + (selectedParticle + 1) + '. Distance, time, and collision counters reset at its current position.');
      }
      function recordTracerJourney() {
        if (selectedInfo.journeyTime < 1 || selectedInfo.particleHits < 1) { if (ctx.announceToSR) ctx.announceToSR('Keep tracing until at least one particle collision has occurred before recording the walk.'); return; }
        var snapshot = { id: Date.now(), species: selectedInfo.type ? 'B' : 'A', particle: selectedParticle + 1, temperature: stats.temperature, count: count, boxSize: boxSize, density: count / Math.pow(boxSize, 3), particleDiameter: particleDiameter, massRatioB: massRatioB, preset: preset, attraction: attraction, gravity: gravity, membrane: membrane, permeability: permeability, membraneSelectivity: membraneSelectivity, pathLength: selectedInfo.pathLength, displacement: selectedInfo.displacement, efficiency: selectedInfo.efficiency, journeyTime: selectedInfo.journeyTime, meanFreePath: selectedInfo.meanFreePath, meanFreePathError: selectedInfo.meanFreePathError, freeFlightSamples: selectedInfo.freeFlightSamples, theoreticalMeanFreePath: meanFreePathEstimate(count, boxSize, particleDiameter), collisionRate: selectedInfo.collisionRate, particleHits: selectedInfo.particleHits };
        var next = tracerTrials.concat([snapshot]).slice(-2); setTracerTrials(next); persist({ tracerTrials: next, tracerCaptures: (bucket.tracerCaptures || 0) + 1 });
        if (ctx.announceToSR) ctx.announceToSR('Recorded tracer walk ' + next.length + ' with mean free path ' + snapshot.meanFreePath.toFixed(1) + ' model units and collision rate ' + snapshot.collisionRate.toFixed(2) + ' per second.');
      }
      function pulseSpeciesHeat(type, temperatureFactor) {
        var rt = runtimeRef.current; if (!rt || !rt.particles || !rt.particles.length) return;
        var velocityScale = Math.sqrt(Math.max(0.1, Number(temperatureFactor) || 1)), affected = 0;
        rt.particles.forEach(function (p) { if ((p.type ? 1 : 0) !== type) return; p.vx *= velocityScale; p.vy *= velocityScale; p.vz *= velocityScale; affected += 1; });
        setHistory([]); setRunning(true); persist({ thermalPulses: (bucket.thermalPulses || 0) + 1 });
        if (ctx.announceToSR) ctx.announceToSR('Thermal pulse applied to particle ' + (type ? 'B' : 'A') + '. ' + affected + ' particles changed temperature. Simulation running to observe energy exchange.');
      }
      function setCameraShot(shot) {
        setAutoCamera(false); setFollowTracer(false); persist({ autoCamera: false, followTracer: false });
        var rt = runtimeRef.current; if (!rt || !rt.camera || !rt.controls) return;
        var positions = { hero: [boxSize * 1.05, boxSize * 0.74, boxSize * 1.18], top: [0.01, boxSize * 1.65, 0.01], close: [boxSize * 0.72, boxSize * 0.35, boxSize * 0.78] };
        var pos = positions[shot] || positions.hero; rt.camera.position.set(pos[0], pos[1], pos[2]); rt.controls.target.set(0, 0, 0); rt.controls.update();
        if (ctx.announceToSR) ctx.announceToSR('Camera changed to ' + shot + ' view.');
      }
      function recordTrial() {
        if (transportMode && membrane && !selectivityAssay.ready) { if (ctx.announceToSR) ctx.announceToSR('Collect at least five membrane encounters for both species before recording this trial.'); return; }
        var trial = { id: Date.now(), preset: preset, temperature: stats.temperature, temperatureSetpoint: temperature, pressure: stats.pressure, count: count, boxSize: boxSize, attraction: attraction, gravity: gravity, membrane: membrane, permeability: permeability, membraneSelectivity: membraneSelectivity, massRatioB: massRatioB, particleDiameter: particleDiameter, heightCenter: heightInfo.centerY, heightRatio: heightInfo.bottomTopRatio, mixing: diffusionInfo.mixing, milestoneTime: diffusionInfo.milestoneTime, osmoticShift: diffusionInfo.osmoticShift, soluteLeak: diffusionInfo.soluteLeak, entropy: diffusionInfo.entropy, msd: diffusionInfo.msd, coefficient: diffusionInfo.coefficient, coefficientA: diffusionInfo.coefficientA, coefficientB: diffusionInfo.coefficientB, msdA: diffusionInfo.msdA, msdB: diffusionInfo.msdB, exchange: diffusionInfo.exchange, transmissionA: selectivityAssay.transmissionA, transmissionB: selectivityAssay.transmissionB, separation: selectivityAssay.separation, assayAttemptsA: selectivityAssay.attemptsA, assayAttemptsB: selectivityAssay.attemptsB, ciALow: selectivityCIA.low, ciAHigh: selectivityCIA.high, ciBLow: selectivityCIB.low, ciBHigh: selectivityCIB.high };
        var next = trials.concat([trial]).slice(-2); setTrials(next); persist({ trials: next, trialsRecorded: (bucket.trialsRecorded || 0) + 1 });
        if (ctx.announceToSR) ctx.announceToSR('Recorded trial at ' + trial.temperature + ' kelvin and pressure ' + trial.pressure + ' model units.');
      }
      function restoreTrial(trial) {
        if (!trial) return; setPreset(trial.preset || 'gas'); setTemperature(trial.temperatureSetpoint == null ? trial.temperature : trial.temperatureSetpoint); setCount(trial.count); setBoxSize(trial.boxSize); setAttraction(trial.attraction || 0); setGravity(trial.gravity || 0); setMembrane(!!trial.membrane); setPermeability(trial.permeability == null ? 1 : trial.permeability); setMembraneSelectivity(trial.membraneSelectivity || 'both'); setMassRatioB(trial.massRatioB == null ? 1 : trial.massRatioB); setParticleDiameter(trial.particleDiameter == null ? 0.58 : trial.particleDiameter); setRunning(false); setHistory([]); setResetKey(function (k) { return k + 1; });
        if (ctx.announceToSR) ctx.announceToSR('Restored recorded trial conditions.');
      }
      function kineticRegime() {
        if (stats.temperature < 180) return { label: 'Low kinetic regime', tone: 'text-sky-700', note: 'Most particles are moving relatively slowly.' };
        if (stats.temperature < 520) return { label: 'Moderate kinetic regime', tone: 'text-violet-700', note: 'The speed distribution is broadening.' };
        return { label: 'High kinetic regime', tone: 'text-rose-700', note: 'Fast particles dominate collisions and wall impacts.' };
      }
      function modelSummary() {
        if ((activeProtocol === 'mfp' || activeProtocol === 'crosssection') && tracerComparison && tracerComparison.fair) return 'Fair test complete: one controlled change produced a measurable mean-free-path difference. Compare both walks with the kinetic-theory prediction.';
        if ((activeProtocol === 'mfp' || activeProtocol === 'crosssection') && tracerTrials.length === 1 && liveTracerControl && liveTracerControl.fair) return 'One-variable setup ready: kinetic theory predicts the direction and size of the change. Choose New walk, collect several flights, then save Walk 2.';
        if ((activeProtocol === 'mfp' || activeProtocol === 'crosssection') && tracerTrials.length === 1 && liveTracerControl && !liveTracerControl.fair && !liveTracerControl.replicate) return 'More than one condition changed after Walk 1. Restore controls until the fair-test badge reports one variable changed.';
        if ((activeProtocol === 'mfp' || activeProtocol === 'crosssection') && tracerTrials.length === 1) return 'Walk 1 is saved. Change only particle count, chamber volume, or particle diameter, choose New walk, then save Walk 2.';
        if ((activeProtocol === 'mfp' || activeProtocol === 'crosssection') && selectedInfo.freeFlightSamples >= 3 && tracerTrials.length === 0) return 'Your free-flight sample is forming. Save this walk, then repeat after changing only particle count, chamber volume, or particle diameter.';
        if ((activeProtocol === 'mfp' || activeProtocol === 'crosssection') && running && selectedInfo.freeFlightSamples < 3) return 'Collecting free flights now. Let the tracer experience several particle collisions so its uncertainty can begin to settle.';
        if ((activeProtocol === 'mfp' || activeProtocol === 'crosssection') && !running) return 'Start the chamber, choose New walk, and follow the yellow tracer through several particle collisions.';
        if (!running) return 'The model is paused. Change one variable, record a trial, then run again.';
        if (preset === 'osmosis' && diffusionInfo.soluteLeak > 0.12) return 'Some solute is leaking through the membrane. Lower permeability or restore the A-selective membrane to model stronger semipermeability.';
        if (preset === 'osmosis' && diffusionInfo.osmoticShift > 0.08) return 'Net solvent movement toward the solution side is visible. The solute remains mostly confined while the solvent distribution shifts.';
        if (transportMode && Math.abs(speciesMotion.a.temperature - speciesMotion.b.temperature) > Math.max(35, stats.temperature * 0.2)) return 'The two species are at different kinetic temperatures. Watch their temperature traces converge as collisions exchange energy.';
        if (preset === 'diffusion' && massRatioB > 1.35 && membraneSelectivity === 'both') return 'Particle B is heavier, so equal-temperature B particles usually travel more slowly. Compare D*A and D*B in the diffusion race.';
        if (preset === 'diffusion' && massRatioB < 0.75 && membraneSelectivity === 'both') return 'Particle B is lighter, so equal-temperature B particles usually travel faster. Compare D*A and D*B in the diffusion race.';
        if (preset === 'diffusion' && membrane && membraneSelectivity !== 'both' && Math.abs(diffusionInfo.fluxA - diffusionInfo.fluxB) > 0.5) return 'The membrane is producing species-selective transport. Compare the A and B crossing rates and the concentration profile.';
        if (preset === 'diffusion' && membrane && diffusionInfo.mixing < 0.35) return 'A strong concentration gradient remains across the membrane. Increase permeability or temperature and watch the mixing index and crossing flux.';
        if (preset === 'diffusion' && diffusionInfo.mixing > 0.82) return 'The two populations are approaching dynamic equilibrium: particles still cross, but the concentration difference between sides is small.';
        if (activeProtocol === 'settling' && gravity <= 0.01) return 'Run and record the microgravity baseline, then increase only gravity for Trial 2.';
        if (activeProtocol === 'settling' && gravity > 0.01 && heightInfo.bottomTopRatio > 1.25) return 'A bottom-heavy density gradient is forming. Compare center height, bottom-to-top population ratio, and wall impacts with Trial 1.';
        if (gravity > 0.01 && wallFaceInfo['y-'] > wallFaceInfo['y+'] + 0.12) return 'The gravity field is creating a bottom-heavy impact pattern. Compare the top and bottom wall sensors for evidence of settling.';
        if (stats.collisions > 18) return 'Particles are colliding frequently. The wall collision rate is high under these conditions.';
        if (stats.temperature > 550) return 'Particle speeds are high, producing more energetic motion and wall impacts.';
        if (attraction > 0.9) return 'Strong attraction is pulling nearby particles into clusters.';
        return 'Particles are moving and exchanging direction through collisions. Watch how the measurements settle over time.';
      }
      function openMoleculeLab() {
        if (typeof ctx.setToolData === 'function') ctx.setToolData(function (prev) { return Object.assign({}, prev, { molecule: Object.assign({}, (prev && prev.molecule) || {}, { moleculeMode: 'viewer' }) }); });
        if (typeof ctx.setStemLabTab === 'function') ctx.setStemLabTab('explore');
        if (typeof ctx.setStemLabTool === 'function') { ctx.setStemLabTool('molecule'); if (ctx.announceToSR) ctx.announceToSR('Opening Molecule Lab.'); }
      }
      function graphPath(values) {
        if (values.length < 2) return '';
        var min = Math.min.apply(Math, values), max = Math.max.apply(Math, values), span = Math.max(1, max - min);
        return values.map(function (v, i) { var x = i / (values.length - 1) * 240; var y = 56 - (v - min) / span * 48; return (i ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1); }).join(' ');
      }
      function percentPath(values) {
        if (!values || values.length < 2) return '';
        return values.map(function (value, i) { var x = 4 + i / (values.length - 1) * 232, y = 56 - clamp(Number(value) || 0, 0, 1) * 48; return (i ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1); }).join(' ');
      }
      function sharedScalePath(values, minimum, maximum) {
        if (!values || values.length < 2) return '';
        var span = Math.max(1, maximum - minimum);
        return values.map(function (value, i) { var x = 4 + i / (values.length - 1) * 232, y = 56 - (Number(value) - minimum) / span * 48; return (i ? 'L' : 'M') + x.toFixed(1) + ',' + clamp(y, 8, 56).toFixed(1); }).join(' ');
      }

      var protocols = [
        { id: 'boyle', icon: '\uD83E\uDE97', title: 'Compression', law: 'Boyle\'s law', accent: 'from-cyan-500 to-blue-600', preset: 'gas', temperature: 320, count: 72, boxSize: 14, attraction: 0, prompt: 'Record Trial 1, shrink the container without changing temperature or particle count, then record Trial 2.', watch: 'Watch pressure and wall-collision frequency.' },
        { id: 'thermal', icon: '\uD83C\uDF21\uFE0F', title: 'Heat at Fixed Volume', law: 'Gay-Lussac\'s law', accent: 'from-amber-500 to-rose-600', preset: 'gas', temperature: 180, count: 72, boxSize: 11, attraction: 0, prompt: 'Record Trial 1, raise temperature while volume and particle count stay fixed, then record Trial 2.', watch: 'Watch the speed distribution broaden.' },
        { id: 'mixing', icon: '\uD83C\uDFA8', title: 'Diffusion Race', law: 'Kinetic molecular theory', accent: 'from-violet-500 to-fuchsia-600', preset: 'diffusion', temperature: 280, count: 80, boxSize: 11, attraction: 0.05, prompt: 'Observe how quickly the two colors mix, then reset and repeat at a higher temperature.', watch: 'Compare trajectories and mixing time.' },
        { id: 'osmosis', icon: '\uD83E\uDDEA', title: 'Osmosis', law: 'Selective transport', accent: 'from-cyan-500 to-violet-600', preset: 'osmosis', temperature: 300, count: 88, boxSize: 11, attraction: 0, prompt: 'Run the A-selective membrane, then compare solvent shift and solute leakage at two permeability settings.', watch: 'Watch solvent A move toward the solution side while solute B remains confined.' },
        { id: 'mfp', icon: '\uD83C\uDFAF', title: 'Mean Free Path', law: 'Kinetic theory', accent: 'from-yellow-500 to-amber-600', preset: 'gas', temperature: 300, count: 48, boxSize: 14, attraction: 0, prompt: 'Start a new tracer walk and save it after several collisions. Then change only particle count, chamber volume, or particle diameter, repeat, and compare the observed mean free path with theory.', watch: 'Watch the free-flight histogram, uncertainty, ensemble mean free path, and fair-test badge.' },
        { id: 'crosssection', icon: '\u25CE', title: 'Collision Cross Section', law: '\u03BB \u221D 1/d\u00B2', accent: 'from-sky-500 to-indigo-600', preset: 'gas', temperature: 300, count: 56, boxSize: 14, particleDiameter: 0.42, attraction: 0, prompt: 'Save a tracer walk with small particles. Increase only collision diameter, start a new walk, and compare collision rate and mean free path.', watch: 'Watch particle size, collision rings, the free-flight ruler, and the inverse-square theory prediction.' },
        { id: 'settling', icon: '\u21E3', title: 'Gravity Gradient', law: 'Barometric distribution', accent: 'from-amber-500 to-indigo-600', preset: 'gas', temperature: 240, count: 88, boxSize: 12, gravity: 0, attraction: 0, prompt: 'Record Trial 1 in microgravity. Increase only gravity, let the chamber evolve, then record Trial 2.', watch: 'Compare top and bottom pressure sensors, density distribution, and wall impacts.' },
        { id: 'condense', icon: '\uD83D\uDCA7', title: 'Condensation', law: 'Intermolecular forces', accent: 'from-emerald-500 to-cyan-600', preset: 'gas', temperature: 170, count: 96, boxSize: 10, attraction: 1.15, prompt: 'Run the chamber and increase attraction. Look for persistent clusters and changes in motion.', watch: 'Use the attraction network as evidence.' }
      ];
      var currentProtocol = protocols.filter(function (p) { return p.id === activeProtocol; })[0] || null;
      var telemetrySeries = [
        { key: 'temperature', label: 'Temperature', short: 'TEMP', unit: 'K', color: '#22d3ee', glow: 'rgba(34,211,238,0.2)', decimals: 0 },
        { key: 'pressure', label: 'Pressure', short: 'PRESS', unit: 'u', color: '#818cf8', glow: 'rgba(129,140,248,0.2)', decimals: 1 },
        { key: 'energy', label: 'Kinetic energy', short: 'ENERGY', unit: 'u', color: '#fbbf24', glow: 'rgba(251,191,36,0.2)', decimals: 1 },
        { key: 'collisions', label: 'Collision activity', short: 'HITS', unit: '/ sample', color: '#fb7185', glow: 'rgba(251,113,133,0.2)', decimals: 0 }
      ].map(function (metric) {
        var values = history.map(function (sample) { return typeof sample === 'number' ? (metric.key === 'temperature' ? sample : 0) : Number(sample[metric.key] || 0); });
        return Object.assign({}, metric, { values: values, trend: seriesTrend(values), current: Number(stats[metric.key] || 0) });
      });
      var trialComparison = trials.length === 2 ? compareTrials(trials[0], trials[1]) : null, transportMode = isTransportPreset(preset);
      var transportTimeline = history.filter(function (sample) { return sample && sample.elapsed != null; }), transportPrimary = transportTimeline.map(function (sample) { return preset === 'osmosis' ? sample.solventRight : sample.mixing; }), transportSecondary = transportTimeline.map(function (sample) { return preset === 'osmosis' ? sample.soluteLeak : sample.entropy; }), transportTarget = preset === 'osmosis' ? 0.55 : 0.8;
      var diffusionFingerprint = transportTimeline.filter(function (sample) { return sample && Number(sample.elapsed) > 0.05 && Number(sample.msdA) > 0.001 && Number(sample.msdB) > 0.001; }), diffusionRegimeA = diffusionExponent(diffusionFingerprint, 'msdA'), diffusionRegimeB = diffusionExponent(diffusionFingerprint, 'msdB'), diffusionTimeMax = diffusionFingerprint.length ? Math.max.apply(Math, diffusionFingerprint.map(function (sample) { return Number(sample.elapsed); })) : 1, diffusionMsdMax = diffusionFingerprint.length ? Math.max.apply(Math, diffusionFingerprint.reduce(function (values, sample) { return values.concat([Number(sample.msdA), Number(sample.msdB)]); }, [1])) : 1;
      function diffusionFingerprintPath(key) { if (diffusionFingerprint.length < 2) return ''; return diffusionFingerprint.map(function (sample, i) { var x = 8 + Math.log(1 + Number(sample.elapsed)) / Math.log(1 + diffusionTimeMax) * 224, y = 58 - Math.log(1 + Number(sample[key])) / Math.log(1 + diffusionMsdMax) * 48; return (i ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1); }).join(' '); }
      var diffusionGuidePath = diffusionFingerprint.length > 1 ? (function () { var first = diffusionFingerprint[0], startT = Math.max(0.05, Number(first.elapsed)), startMsd = Math.max(0.001, Number(first.msdA)), endMsd = startMsd * diffusionTimeMax / startT, x1 = 8 + Math.log(1 + startT) / Math.log(1 + diffusionTimeMax) * 224, y1 = 58 - Math.log(1 + startMsd) / Math.log(1 + diffusionMsdMax) * 48, y2 = 58 - Math.log(1 + endMsd) / Math.log(1 + diffusionMsdMax) * 48; return 'M' + x1.toFixed(1) + ',' + y1.toFixed(1) + 'L232,' + clamp(y2, 8, 58).toFixed(1); })() : '';
      var currentAssayConditionKey = [preset, membrane, permeability, membraneSelectivity].join('|'), assayMatchesConditions = diffusionInfo.assayConditionKey === currentAssayConditionKey, poreOpennessA = membrane ? permeability * (membraneSelectivity === 'b' ? 0.08 : 1) : 0, poreOpennessB = membrane ? permeability * (membraneSelectivity === 'a' ? 0.08 : 1) : 0, selectivityAssay = membraneSelectivityMetrics(assayMatchesConditions ? diffusionInfo.assayPassedA : 0, assayMatchesConditions ? diffusionInfo.assayBlockedA : 0, assayMatchesConditions ? diffusionInfo.assayPassedB : 0, assayMatchesConditions ? diffusionInfo.assayBlockedB : 0, membraneSelectivity), selectivityCIA = binomialWilsonInterval(selectivityAssay.passedA, selectivityAssay.attemptsA), selectivityCIB = binomialWilsonInterval(selectivityAssay.passedB, selectivityAssay.attemptsB), selectivityUncertainty = Math.max(selectivityCIA.width, selectivityCIB.width), selectivityEvidence = !selectivityAssay.ready ? 'collecting evidence' : (selectivityUncertainty > 0.45 ? 'preliminary evidence' : (selectivityUncertainty > 0.25 ? 'developing evidence' : 'stronger evidence')), selectivityLabel = !selectivityAssay.ready ? 'collecting' : (membraneSelectivity === 'a' ? 'A favored ' + selectivityAssay.separation.toFixed(1) + 'x' : (membraneSelectivity === 'b' ? 'B favored ' + selectivityAssay.separation.toFixed(1) + 'x' : (selectivityAssay.separation < 1.35 ? 'balanced' : 'sampling difference ' + selectivityAssay.separation.toFixed(1) + 'x')));
      var fickExpectedA = fickFluxEstimate(diffusionInfo.coefficientA, diffusionInfo.leftACount, diffusionInfo.rightACount, boxSize), fickExpectedB = fickFluxEstimate(diffusionInfo.coefficientB, diffusionInfo.leftBCount, diffusionInfo.rightBCount, boxSize), fickScale = Math.max(0.5, Math.abs(fickExpectedA), Math.abs(fickExpectedB), Math.abs(diffusionInfo.netFluxA || 0), Math.abs(diffusionInfo.netFluxB || 0)), fickAgreementA = Math.abs((diffusionInfo.netFluxA || 0) - fickExpectedA) / fickScale, fickDirection = Math.abs(diffusionInfo.netFluxA || 0) < 0.1 ? 'balanced' : ((diffusionInfo.netFluxA || 0) > 0 ? 'left to right' : 'right to left');
      var thermalTimeline = history.filter(function (sample) { return sample && Number.isFinite(sample.temperatureA) && Number.isFinite(sample.temperatureB); }), thermalA = thermalTimeline.map(function (sample) { return sample.temperatureA; }), thermalB = thermalTimeline.map(function (sample) { return sample.temperatureB; }), thermalValues = thermalA.concat(thermalB), thermalMin = thermalValues.length ? Math.min.apply(Math, thermalValues) : 0, thermalMax = thermalValues.length ? Math.max.apply(Math, thermalValues) : 1, thermalGap = Math.abs(speciesMotion.a.temperature - speciesMotion.b.temperature), thermalGapPercent = Math.round(thermalGap / Math.max(1, (speciesMotion.a.temperature + speciesMotion.b.temperature) / 2) * 100);
      var clusterTimeline = history.filter(function (sample) { return sample && Number.isFinite(sample.clusterFraction); }), clusterFractions = clusterTimeline.map(function (sample) { return sample.clusterFraction; }), clusterTrend = seriesTrend(clusterFractions), coalescenceEvents = clusterTimeline.filter(function (sample) { return sample.clusterMerge; }), lastCoalescence = coalescenceEvents.length ? coalescenceEvents[coalescenceEvents.length - 1] : null, clusterMilestone = clusterTimeline.filter(function (sample) { return Number(sample.attraction) > 0.5 && Number(sample.clusterFraction) >= 0.3; })[0] || null;
      var gravityTimeline = history.filter(function (sample) { return sample && Number.isFinite(sample.heightCenter) && Number.isFinite(sample.heightRatio); }), gravityCenters = gravityTimeline.map(function (sample) { return sample.heightCenter; }), gravityRatios = gravityTimeline.map(function (sample) { return sample.heightRatio; }), gravityCenterMin = gravityCenters.length ? Math.min.apply(Math, gravityCenters.concat([-0.1])) : -0.1, gravityCenterMax = gravityCenters.length ? Math.max.apply(Math, gravityCenters.concat([0.1])) : 0.1, gravityRatioMax = gravityRatios.length ? Math.max.apply(Math, gravityRatios.concat([2])) : 2, gravityCenterTrend = seriesTrend(gravityCenters), gravityRatioTrend = seriesTrend(gravityRatios), gravityMilestone = gravityTimeline.filter(function (sample) { return Number(sample.gravity) > 0.01 && sample.heightRatio >= 1.5; })[0] || null;
      var currentMeanFreePathTheory = meanFreePathEstimate(count, boxSize, particleDiameter), currentMeanFreePathRatio = selectedInfo.meanFreePath / Math.max(0.001, currentMeanFreePathTheory);
      var mfpConfidenceLow = Math.max(0, selectedInfo.meanFreePath - 1.96 * selectedInfo.meanFreePathError), mfpConfidenceHigh = selectedInfo.meanFreePath + 1.96 * selectedInfo.meanFreePathError, mfpAgreementError = Math.abs(selectedInfo.meanFreePath - currentMeanFreePathTheory) / Math.max(0.001, currentMeanFreePathTheory), mfpTheoryInInterval = selectedInfo.freeFlightSamples >= 3 && currentMeanFreePathTheory >= mfpConfidenceLow && currentMeanFreePathTheory <= mfpConfidenceHigh;
      var mfpAgreement = selectedInfo.freeFlightSamples < 3 ? { label: 'Waiting for evidence', note: 'Collect at least three completed free flights.', tone: 'bg-slate-200 text-slate-800' } : (mfpTheoryInInterval ? { label: 'Theory inside 95% range', note: 'The observed uncertainty range includes the kinetic-theory estimate.', tone: 'bg-emerald-200 text-emerald-950' } : (mfpAgreementError <= 0.25 ? { label: 'Close to theory', note: 'The observed mean is within 25% of the kinetic-theory estimate.', tone: 'bg-amber-200 text-amber-950' } : { label: 'Model mismatch', note: 'Sampling variation or non-ideal chamber effects may explain the difference.', tone: 'bg-rose-200 text-rose-950' }));
      var mfpObservedPosition = clamp(currentMeanFreePathRatio / 2, 0, 1) * 100, mfpCiLowPosition = clamp(mfpConfidenceLow / Math.max(0.001, currentMeanFreePathTheory * 2), 0, 1) * 100, mfpCiHighPosition = clamp(mfpConfidenceHigh / Math.max(0.001, currentMeanFreePathTheory * 2), 0, 1) * 100;
      var flightChartCeiling = Math.max(0.1, currentMeanFreePathTheory * 4, selectedInfo.freeFlights.length ? Math.max.apply(Math, selectedInfo.freeFlights) : 0), flightChart = freeFlightDistribution(selectedInfo.freeFlights, 8, flightChartCeiling), expectedFlightBins = flightChart.bins.map(function (_, i) { var low = i / flightChart.bins.length * flightChartCeiling, high = (i + 1) / flightChart.bins.length * flightChartCeiling; return Math.exp(-low / Math.max(0.001, currentMeanFreePathTheory)) - Math.exp(-high / Math.max(0.001, currentMeanFreePathTheory)); }), flightChartPeak = Math.max.apply(Math, flightChart.bins.concat(expectedFlightBins).concat([0.01])), flightTheoryPath = expectedFlightBins.map(function (value, i) { return (i ? 'L' : 'M') + (i * 29 + 17).toFixed(1) + ',' + (56 - value / flightChartPeak * 46).toFixed(1); }).join(' '), flightMeanX = 4 + clamp(selectedInfo.meanFreePath / flightChartCeiling, 0, 1) * 232;
      var recentFlightSequence = selectedInfo.freeFlights.slice(-12), flightSequenceCeiling = Math.max(0.1, currentMeanFreePathTheory * 2.5, recentFlightSequence.length ? Math.max.apply(Math, recentFlightSequence) : 0), flightSequenceTheoryY = 58 - clamp(currentMeanFreePathTheory / flightSequenceCeiling, 0, 1) * 48, flightSequenceLongest = recentFlightSequence.length ? Math.max.apply(Math, recentFlightSequence) : 0, flightSequenceShortest = recentFlightSequence.length ? Math.min.apply(Math, recentFlightSequence) : 0, flightSequenceLongCount = recentFlightSequence.filter(function (flight) { return flight > currentMeanFreePathTheory * 1.5; }).length;
      var tracerComparison = tracerTrials.length === 2 ? compareTracerTrials(tracerTrials[0], tracerTrials[1]) : null;
      var liveTracerConditions = { species: selectedInfo.type ? 'B' : 'A', temperature: stats.temperature, count: count, boxSize: boxSize, particleDiameter: particleDiameter, massRatioB: massRatioB, preset: preset, attraction: attraction, gravity: gravity, membrane: membrane, permeability: permeability, membraneSelectivity: membraneSelectivity, density: count / Math.pow(boxSize, 3), meanFreePath: selectedInfo.meanFreePath, collisionRate: selectedInfo.collisionRate };
      var liveTracerControl = tracerTrials.length === 1 ? compareTracerTrials(tracerTrials[0], liveTracerConditions) : null;
      var mfpPredictionControl = tracerTrials.length === 2 ? tracerComparison : liveTracerControl, mfpPredictionTarget = tracerTrials.length === 2 ? tracerTrials[1] : liveTracerConditions, mfpPredictionAvailable = tracerTrials.length > 0 && mfpPredictionControl && mfpPredictionControl.fair;
      var mfpWalk1Theory = tracerTrials.length ? Number(tracerTrials[0].theoreticalMeanFreePath || meanFreePathEstimate(tracerTrials[0].count, tracerTrials[0].boxSize, tracerTrials[0].particleDiameter)) : 0, mfpTargetTheory = mfpPredictionTarget ? Number(mfpPredictionTarget.theoreticalMeanFreePath || meanFreePathEstimate(mfpPredictionTarget.count, mfpPredictionTarget.boxSize, mfpPredictionTarget.particleDiameter)) : 0, mfpPredictionRatio = mfpWalk1Theory > 0 ? mfpTargetTheory / mfpWalk1Theory : 1;
      var mfpPredictedWalk2 = tracerTrials.length ? Number(tracerTrials[0].meanFreePath || 0) * mfpPredictionRatio : 0, mfpPredictionDeltaPercent = Math.round((mfpPredictionRatio - 1) * 100), mfpPredictionDirection = mfpPredictionRatio > 1.05 ? 'increase' : (mfpPredictionRatio < 0.95 ? 'decrease' : 'remain similar'), mfpPredictionErrorPercent = tracerTrials.length === 2 && mfpPredictedWalk2 > 0 ? Math.abs(Number(tracerTrials[1].meanFreePath || 0) - mfpPredictedWalk2) / mfpPredictedWalk2 * 100 : 0;
      var tracerSampleProgress = clamp(selectedInfo.freeFlightSamples / 12, 0, 1), tracerSampleQuality = selectedInfo.freeFlightSamples < 3 ? { label: 'Collecting', note: 'A few more collisions are needed.', tone: 'text-slate-700', fill: 'bg-slate-400' } : (selectedInfo.relativeUncertainty > 0.35 ? { label: 'High uncertainty', note: 'Keep running to reduce random variation.', tone: 'text-rose-800', fill: 'bg-rose-500' } : (selectedInfo.relativeUncertainty > 0.2 ? { label: 'Developing estimate', note: 'The estimate is beginning to settle.', tone: 'text-amber-800', fill: 'bg-amber-500' } : { label: 'Stable estimate', note: 'The sample has relatively low uncertainty.', tone: 'text-emerald-800', fill: 'bg-emerald-500' }));
      var mfpProtocolSteps = [{ label: 'Start walk', complete: selectedInfo.journeyTime > 0 || tracerTrials.length > 0 }, { label: 'Collect flights', complete: selectedInfo.freeFlightSamples >= 6 || tracerTrials.length > 0 }, { label: 'Save walk 1', complete: tracerTrials.length >= 1 }, { label: 'Change one variable', complete: tracerTrials.length >= 2 ? !!(tracerComparison && tracerComparison.fair) : !!(liveTracerControl && liveTracerControl.fair) }, { label: 'Compare', complete: !!(tracerComparison && tracerComparison.fair) }], mfpStepsComplete = mfpProtocolSteps.filter(function (step) { return step.complete; }).length;
      var heightProfilePeak = Math.max.apply(Math, heightInfo.bins.concat([heightInfo.uniform, 0.01])), heightUniformX = 42 + heightInfo.uniform / heightProfilePeak * 178;
      var pressureFaceCells = [{ key: 'y+', label: 'Top', cls: 'col-start-2 row-start-1' }, { key: 'x-', label: 'Left', cls: 'col-start-1 row-start-2' }, { key: 'z+', label: 'Front', cls: 'col-start-2 row-start-2' }, { key: 'x+', label: 'Right', cls: 'col-start-3 row-start-2' }, { key: 'z-', label: 'Back', cls: 'col-start-4 row-start-2' }, { key: 'y-', label: 'Bottom', cls: 'col-start-2 row-start-3' }];

      var presets = [        { id: 'solid', icon: '\u2744\uFE0F', label: 'Solid', note: 'Particles vibrate near fixed positions.' },
        { id: 'liquid', icon: '\uD83D\uDCA7', label: 'Liquid', note: 'Particles stay close but flow past one another.' },
        { id: 'gas', icon: '\uD83C\uDF2C\uFE0F', label: 'Gas', note: 'Particles spread out and collide with the walls.' },
        { id: 'diffusion', icon: '\uD83D\uDFE3', label: 'Diffusion', note: 'Two particle populations begin on opposite sides.' },
        { id: 'osmosis', icon: '\uD83E\uDDEA', label: 'Osmosis', note: 'Solvent A crosses toward a solution while solute B is restricted.' }
      ];

      return h('div', { className: 'max-w-7xl mx-auto space-y-4 animate-in fade-in duration-300' },
        h('div', { className: 'rounded-2xl border border-cyan-200 bg-gradient-to-r from-slate-950 via-cyan-950 to-slate-900 p-5 text-white shadow-xl' },
          h('div', { className: 'flex flex-wrap items-start justify-between gap-3' },
            h('div', null, h('p', { className: 'text-xs font-black uppercase tracking-[0.2em] text-cyan-300' }, 'Interactive physics sandbox'), h('h2', { className: 'mt-1 text-2xl font-black' }, '\u2728 Particle Lab 3D'), h('p', { className: 'mt-2 max-w-3xl text-sm leading-relaxed text-cyan-50' }, 'Change the conditions, run the model, and use measurements to explain what the particles do. Pointer users can drag and zoom; keyboard users can use the labeled particle selector, camera views, and chamber shortcuts.')),
            h('div', { className: 'rounded-xl border border-cyan-700/60 bg-slate-950/60 px-3 py-2 text-xs text-cyan-100' }, 'Simplified model \u2022 adjustable collision cross section \u2022 fixed timestep')
          )
        ),
        h('section', { className: 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm', 'aria-labelledby': 'particle-protocols-title' },
          h('div', { className: 'flex flex-wrap items-center justify-between gap-2' }, h('div', null, h('p', { className: 'text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700' }, 'Guided investigations'), h('h3', { id: 'particle-protocols-title', className: 'text-lg font-black text-slate-950' }, 'Choose an experiment protocol')), h('button', { type: 'button', onClick: function () { applyProtocol({ id: 'free' }); }, className: 'rounded-lg border px-3 py-2 text-xs font-black ' + (activeProtocol === 'free' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 text-slate-600 hover:bg-slate-100') }, '\u2699 Free laboratory')),
          h('div', { className: 'mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4' }, protocols.map(function (protocol) { var active = activeProtocol === protocol.id; return h('button', { key: protocol.id, type: 'button', onClick: function () { applyProtocol(protocol); }, 'aria-pressed': active, className: 'group relative overflow-hidden rounded-xl border p-3 text-left transition-all ' + (active ? 'border-cyan-400 bg-slate-950 text-white shadow-lg shadow-cyan-900/20' : 'border-slate-200 bg-slate-50 text-slate-900 hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md') }, h('span', { className: 'absolute inset-y-0 left-0 w-1 bg-gradient-to-b ' + protocol.accent }), h('div', { className: 'flex items-start gap-3' }, h('span', { className: 'text-2xl' }, protocol.icon), h('span', null, h('span', { className: 'block text-sm font-black' }, protocol.title), h('span', { className: 'mt-0.5 block text-[10px] font-bold uppercase tracking-wide ' + (active ? 'text-cyan-300' : 'text-slate-500') }, protocol.law))), h('span', { className: 'mt-3 block text-[11px] leading-relaxed ' + (active ? 'text-slate-300' : 'text-slate-600') }, protocol.watch)); }))
        ),
        h('div', { className: 'grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]' },
          h('section', { ref: stageRef, onKeyDown: onStageKeyDown, className: 'overflow-hidden border border-cyan-500/30 bg-slate-950 shadow-2xl shadow-cyan-950/40 ring-1 ring-white/5 ' + (fsActive ? 'h-screen rounded-none flex flex-col' : 'rounded-[24px]'), style: cssFullscreen ? { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', zIndex: 99990, borderRadius: 0 } : undefined, 'aria-label': 'Three-dimensional particle simulation' },
            showHud && h('div', { className: 'flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 px-4 py-3' },
              h('div', { className: 'flex flex-wrap gap-2' }, presets.map(function (p) { return h('button', { key: p.id, type: 'button', onClick: function () { choosePreset(p.id); }, 'aria-pressed': preset === p.id, className: 'rounded-xl border px-3 py-2 text-xs font-bold transition-all ' + (preset === p.id ? 'border-cyan-200 bg-cyan-300 text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.35)]' : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-500/50 hover:bg-slate-800') }, p.icon + ' ' + p.label); })),
              h('div', { className: 'flex flex-wrap items-center gap-2' },
                h('span', { className: 'text-xs text-slate-400' }, ready ? presets.filter(function (p) { return p.id === preset; })[0].note : 'Loading the 3D engine\u2026'),
                h('div', { className: 'flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 p-1', role: 'group', 'aria-label': 'Visual quality' }, ['eco', 'balanced', 'ultra'].map(function (mode) { return h('button', { key: mode, type: 'button', onClick: function () { setQuality(mode); persist({ quality: mode }); }, 'aria-pressed': quality === mode, className: 'min-h-6 rounded px-2 py-1 text-[10px] font-black uppercase tracking-wide ' + (quality === mode ? 'bg-cyan-300 text-slate-950' : 'text-slate-400 hover:bg-slate-700 hover:text-white') }, mode); }))
              )
            ),
            h('div', { className: 'relative min-h-[380px] overflow-hidden bg-slate-950 ' + (fsActive ? 'flex-1' : 'h-[520px]') },
              h('canvas', { ref: canvasRef, tabIndex: 0, role: 'application', 'aria-roledescription': 'Interactive 3D particle chamber', 'aria-label': preset + ' particle simulation', 'aria-describedby': 'particle-chamber-help', 'aria-keyshortcuts': 'Space R T V E M G C L F H ? Escape', onKeyDown: onLabKey, onPointerDown: function (event) { try { event.currentTarget.focus(); } catch (error) {} }, className: 'h-full w-full saturate-[1.15] contrast-[1.04] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-cyan-200' }),
              h('span', { id: 'particle-chamber-help', className: 'sr-only' }, 'Use Space to run or pause and the question mark key for all chamber shortcuts. Use the labeled particle selector and camera-view buttons for keyboard alternatives to clicking particles and dragging the camera.'),
              h('div', { className: 'pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(2,6,23,0.7)_100%)]' }),
              h('div', { className: 'pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent shadow-[0_0_18px_4px_rgba(34,211,238,0.35)]' }),
              h('div', { className: 'pointer-events-none absolute right-3 top-3 min-w-[150px] rounded-xl border border-cyan-300/20 bg-slate-950/65 p-3 text-right shadow-lg backdrop-blur-md' },
                h('div', { className: 'flex items-center justify-end gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300' }, h('span', null, preset + ' chamber'), h('span', { className: 'rounded bg-cyan-300/10 px-1.5 py-0.5 font-mono tracking-normal text-cyan-100' }, (fps || '--') + ' FPS \u2022 ' + quality)),
                h('div', { className: 'mt-1 font-mono text-xl font-black text-white' }, stats.temperature + ' K'),
                h('div', { className: 'mt-1 flex justify-end gap-3 font-mono text-[10px] text-slate-300' }, h('span', null, 'P ' + stats.pressure), h('span', null, 'N ' + count), h('span', null, 'V ' + Math.round(boxSize * boxSize * boxSize)), transportMode && h('span', null, preset === 'osmosis' ? 'Osm ' + (diffusionInfo.osmoticShift >= 0 ? '+' : '') + Math.round(diffusionInfo.osmoticShift * 100) + '%' : 'Mix ' + Math.round(diffusionInfo.mixing * 100) + '%'))
              ),
              transportMode && membrane && h('div', { className: 'pointer-events-none absolute right-3 top-24 w-[150px] rounded-xl border border-violet-300/20 bg-slate-950/70 p-2.5 shadow-[0_0_24px_rgba(167,139,250,0.12)] backdrop-blur-md', role: 'img', 'aria-label': 'Live membrane pore lattice. Species A channel openness ' + Math.round(poreOpennessA * 100) + ' percent. Species B channel openness ' + Math.round(poreOpennessB * 100) + ' percent. Cyan and pink bursts show successful crossings by A and B; coral bursts show reflections.' },
                h('div', { className: 'text-[10px] font-black uppercase tracking-[0.18em] text-violet-200' }, 'Pore lattice'),
                [['A', poreOpennessA, 'bg-cyan-300', 'text-cyan-200'], ['B', poreOpennessB, 'bg-fuchsia-300', 'text-fuchsia-200']].map(function (row) { return h('div', { key: row[0], className: 'mt-2' }, h('div', { className: 'flex justify-between font-mono text-[10px] ' + row[3] }, h('span', null, row[0] + ' channels'), h('span', null, Math.round(row[1] * 100) + '%')), h('div', { className: 'mt-1 h-1.5 overflow-hidden rounded-full bg-white/10' }, h('div', { className: 'h-full rounded-full ' + row[2], style: { width: Math.round(row[1] * 100) + '%' } }))); }),
                h('div', { className: 'mt-2 flex flex-wrap gap-x-2 gap-y-1 border-t border-white/10 pt-2 text-[10px] font-bold text-slate-300' }, h('span', { className: 'inline-flex items-center gap-1' }, h('span', { className: 'h-1.5 w-1.5 rounded-full bg-cyan-300' }), 'pass'), h('span', { className: 'inline-flex items-center gap-1' }, h('span', { className: 'h-1.5 w-1.5 rounded-full bg-rose-400' }), 'reflect'), h('span', { className: 'ml-auto font-mono' }, Number(diffusionInfo.flux || 0).toFixed(1) + '/' + Number(diffusionInfo.blocked || 0).toFixed(1) + ' s'))
              ),              running && h('div', { className: 'pointer-events-none absolute bottom-3 right-3 flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-950/60 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-300 backdrop-blur' }, h('span', { className: 'h-2 w-2 animate-pulse rounded-full bg-emerald-300 shadow-[0_0_10px_2px_rgba(110,231,183,0.7)]' }), 'Live simulation'),
              systemProbe && h('div', { className: 'pointer-events-none absolute bottom-3 left-1/2 min-w-[220px] -translate-x-1/2 rounded-xl border border-yellow-200/30 bg-slate-950/75 px-3 py-2 text-center shadow-[0_0_24px_rgba(253,224,71,0.15)] backdrop-blur' }, h('div', { className: 'text-[10px] font-black uppercase tracking-[0.18em] text-yellow-300' }, '\u25C8 Collective system probe'), h('div', { className: 'mt-1 flex justify-center gap-3 font-mono text-[10px] text-slate-200' }, h('span', null, 'spread ' + systemInfo.spread.toFixed(2)), h('span', null, 'density ' + systemInfo.density.toFixed(3)), h('span', null, 'drift ' + systemInfo.drift.toFixed(2))), h('div', { className: 'mt-0.5 font-mono text-[10px] text-slate-500' }, 'COM ' + systemInfo.x.toFixed(1) + ', ' + systemInfo.y.toFixed(1) + ', ' + systemInfo.z.toFixed(1))),
              !ready && h('div', { className: 'absolute inset-0 z-10 flex items-center justify-center bg-slate-950 p-6 text-center' },
                loadError
                  ? h('div', { role: 'alert', className: 'max-w-sm' },
                      h('p', { className: 'text-sm font-black text-red-300' }, '3D engine unavailable'),
                      h('p', { className: 'mt-2 text-xs leading-relaxed text-slate-300' }, loadError),
                      h('button', { type: 'button', onClick: function () { setLoadError(''); setLoadAttempt(function (a) { return a + 1; }); }, className: 'mt-3 rounded-lg bg-cyan-300 px-4 py-2 text-sm font-black text-cyan-950' }, 'Retry'))
                  : h('div', { role: 'status', 'aria-live': 'polite' },
                      h('div', { className: 'mx-auto h-9 w-9 animate-spin rounded-full border-4 border-cyan-300/20 border-t-cyan-300', 'aria-hidden': true }),
                      h('p', { className: 'mt-3 text-sm font-bold text-cyan-200' }, 'Loading Three.js\u2026'))),
              !showHud && h('button', { type: 'button', onClick: function () { setShowHud(true); if (ctx.announceToSR) ctx.announceToSR('Simulation controls shown.'); }, className: 'absolute left-3 top-3 z-20 rounded-full border border-white/20 bg-slate-950/80 px-3 py-1.5 text-[11px] font-bold text-cyan-200 shadow-lg backdrop-blur hover:bg-slate-800', 'aria-label': 'Show the simulation controls' }, 'Show controls (H)'),
              showKeys && h('div', { role: 'presentation', className: 'absolute inset-0 z-30 flex items-center justify-center bg-slate-950/70 p-4', onClick: function (event) { if (event.target === event.currentTarget) closeKeys(); } },
                h('div', { ref: keysDialogRef, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'particle-keys-title', 'aria-describedby': 'particle-keys-description', tabIndex: -1, className: 'max-h-full w-full max-w-md overflow-y-auto rounded-2xl border border-cyan-300/30 bg-slate-950/95 p-5 shadow-2xl backdrop-blur' },
                  h('div', { className: 'flex items-center justify-between gap-3' }, h('h3', { id: 'particle-keys-title', className: 'text-sm font-black uppercase tracking-wider text-cyan-300' }, 'Keyboard shortcuts'), h('button', { ref: keysCloseRef, type: 'button', onClick: closeKeys, className: 'min-h-6 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-700', 'aria-label': 'Close the keyboard shortcuts panel' }, 'Close')),
                  h('p', { id: 'particle-keys-description', className: 'mt-1 text-[11px] text-slate-300' }, 'Shortcuts work only while the particle chamber has keyboard focus. They do not run while you are using another control or typing.'),
                  h('dl', { className: 'mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[12px]' },
                    [['Space', 'Run or pause the simulation'], ['R', 'Reset the chamber'], ['T', 'Trace one particle (random-walk analyzer)'], ['V', 'Velocity vector arrows'], ['E', 'Speed colors (kinetic energy)'], ['M', 'Diffusion membrane'], ['G', 'Gravity field'], ['C', 'Showcase camera orbit'], ['L', 'Follow the traced particle'], ['F', 'Fullscreen (or immersive view where fullscreen is blocked)'], ['H', 'Hide or show the simulation controls'], ['?', 'Open or close this panel'], ['Esc', 'Close this panel, or exit the immersive view']].map(function (row) {
                      return [h('dt', { key: row[0] + 'k', className: 'rounded-md border border-slate-600 bg-slate-800 px-2 py-0.5 text-center font-mono text-[11px] font-black text-cyan-200' }, row[0]), h('dd', { key: row[0] + 'd', className: 'm-0 self-center text-slate-200' }, row[1])];
                    })),
                  h('p', { className: 'mt-3 border-t border-white/10 pt-2 text-[11px] text-slate-300' }, 'Pointer option: click a particle to trace it, drag to orbit the camera, and use the wheel or pinch to zoom. Keyboard option: use the particle selector and camera-view buttons.'))),
              showHud && h('div', { className: 'pointer-events-none absolute left-3 top-3 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-[11px] text-slate-300 shadow-lg backdrop-blur' }, h('div', { className: 'font-black uppercase tracking-wider text-cyan-300' }, 'Chamber controls'), h('div', { className: 'mt-1' }, 'Click: select \u2022 Drag: orbit \u2022 Wheel: zoom'), h('div', { className: 'mt-1 font-mono text-[10px] text-slate-500' }, 'SPACE run \u2022 R reset \u2022 T trace \u2022 V vectors \u2022 E energy \u2022 M membrane \u2022 G gravity \u2022 C showcase \u2022 L follow \u2022 F fullscreen \u2022 H hide UI \u2022 ? keys'), wallSensors && h('div', { className: 'mt-2 flex items-center gap-2 border-t border-white/10 pt-2 text-[10px] text-indigo-200' }, h('span', { className: 'h-2 w-2 rounded-sm bg-indigo-300 shadow-[0_0_8px_rgba(165,180,252,0.9)]' }), 'Wall glow = local impact pressure'), energyColors && h('div', { className: 'mt-2 border-t border-white/10 pt-2', role: 'img', 'aria-label': 'Particle speed colors range from cyan for slower particles through violet to coral for faster particles.' }, h('div', { className: 'h-1.5 rounded-full bg-gradient-to-r from-cyan-400 via-violet-400 to-red-400 shadow-[0_0_10px_rgba(167,139,250,0.45)]' }), h('div', { className: 'mt-1 flex justify-between text-[10px] font-black uppercase tracking-wide text-slate-400' }, h('span', null, 'slower'), h('span', null, 'particle speed'), h('span', null, 'faster')))),
              trace && h('div', { className: 'pointer-events-none absolute bottom-3 left-3 min-w-[220px] rounded-xl border border-yellow-200/50 bg-yellow-300/90 px-3 py-2 text-slate-950 shadow-[0_0_24px_rgba(253,224,71,0.28)] backdrop-blur', role: 'img', 'aria-label': 'Random walk analyzer for particle ' + (selectedParticle + 1) + ', species ' + (selectedInfo.type ? 'B' : 'A') + '. Speed ' + selectedInfo.speed.toFixed(2) + ' model units per second. Total path ' + selectedInfo.pathLength.toFixed(1) + ' model units, net displacement ' + selectedInfo.displacement.toFixed(1) + ', path efficiency ' + Math.round(selectedInfo.efficiency * 100) + ' percent, ' + selectedInfo.particleHits + ' particle collisions, ' + selectedInfo.wallHits + ' wall collisions, and ' + selectedInfo.membraneHits + ' membrane reflections. Mean free path ' + selectedInfo.meanFreePath.toFixed(1) + ' model units with standard error ' + selectedInfo.meanFreePathError.toFixed(1) + ' from ' + selectedInfo.freeFlightSamples + ' completed free flights, compared with a kinetic theory estimate of ' + currentMeanFreePathTheory.toFixed(1) + ' model units, and particle collision rate ' + selectedInfo.collisionRate.toFixed(2) + ' per second. Glowing rings mark recent tracer collisions, and a dashed color-shifting beam measures the current free flight.' },
                h('div', { className: 'flex items-center justify-between gap-3' }, h('div', { className: 'text-[10px] font-black uppercase tracking-[0.18em]' }, 'Random walk analyzer'), h('span', { className: 'rounded bg-slate-950/10 px-1.5 py-0.5 font-mono text-[10px] font-black' }, (selectedInfo.type ? 'B' : 'A') + '-' + (selectedParticle + 1))),
                h('div', { className: 'mt-1 flex justify-between gap-4 font-mono text-[10px] font-black' }, h('span', null, 'speed ' + selectedInfo.speed.toFixed(2)), h('span', null, 'path ' + selectedInfo.pathLength.toFixed(1) + ' u')),
                h('div', { className: 'mt-1 h-1.5 overflow-hidden rounded-full bg-slate-950/15' }, h('div', { className: 'h-full rounded-full bg-slate-950 transition-all', style: { width: Math.round(selectedInfo.efficiency * 100) + '%' } })),
                h('div', { className: 'mt-1 flex justify-between font-mono text-[10px]' }, h('span', null, 'net ' + selectedInfo.displacement.toFixed(1) + ' u'), h('span', null, Math.round(selectedInfo.efficiency * 100) + '% straightness')),
                h('div', { className: 'mt-1 grid grid-cols-2 gap-2 border-t border-slate-950/10 pt-1 font-mono text-[10px]' }, h('span', null, 'mean free path ' + selectedInfo.meanFreePath.toFixed(1) + ' plus or minus ' + selectedInfo.meanFreePathError.toFixed(1) + ' u'), h('span', { className: 'text-right' }, selectedInfo.collisionRate.toFixed(2) + ' hits/s')),
                h('div', { className: 'mt-1 flex justify-between font-mono text-[10px]' }, h('span', null, selectedInfo.freeFlightSamples + ' completed flights'), h('span', null, 'current flight ' + selectedInfo.currentFreeFlight.toFixed(1) + ' u')),
                h('div', { className: 'mt-1 flex justify-between font-mono text-[10px] opacity-75' }, h('span', null, 'kinetic-theory estimate ' + currentMeanFreePathTheory.toFixed(1) + ' u'), h('span', null, 'observed/theory ' + currentMeanFreePathRatio.toFixed(2) + 'x')),
                h('div', { className: 'mt-1 font-mono text-[10px]' }, selectedInfo.particleHits + ' particle hits \u2022 ' + selectedInfo.wallHits + ' wall hits' + (selectedInfo.membraneHits ? ' \u2022 ' + selectedInfo.membraneHits + ' membrane' : '')),
                h('div', { className: 'mt-0.5 font-mono text-[10px] opacity-70' }, 'x ' + selectedInfo.x.toFixed(1) + '  y ' + selectedInfo.y.toFixed(1) + '  z ' + selectedInfo.z.toFixed(1)),
                h('div', { className: 'mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-950/10 pt-1 text-[10px] font-bold' }, h('span', { className: 'inline-flex items-center gap-1.5' }, h('span', { className: 'h-2 w-2 rounded-full border-2 border-cyan-700', 'aria-hidden': 'true' }), 'Rings: recent collisions'), h('span', { className: 'inline-flex items-center gap-1.5' }, h('span', { className: 'w-4 border-t-2 border-dashed border-cyan-700', 'aria-hidden': 'true' }), 'Dashed beam: current free flight'))
              )
            ),
            showHud && h('div', { className: 'flex flex-wrap items-center gap-2 border-t border-slate-700 p-3' },
              h('button', { type: 'button', onClick: toggleRun, className: 'rounded-lg bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-400' }, running ? '\u23F8 Pause' : '\u25B6 Run'),
              h('button', { type: 'button', onClick: function () { setRunning(false); stepRef.current = true; }, className: 'rounded-lg bg-slate-800 px-3 py-2 text-sm font-bold text-white hover:bg-slate-700' }, '\u23ED Step'),
              h('button', { type: 'button', onClick: function () { setRunning(false); setHistory([]); setResetKey(function (k) { return k + 1; }); }, className: 'rounded-lg bg-slate-800 px-3 py-2 text-sm font-bold text-white hover:bg-slate-700' }, '\u21BB Reset'),
              h('button', { type: 'button', onClick: function () { var next = !trace; setTrace(next); if (!next) setFollowTracer(false); persist({ trace: next, followTracer: false, traced: next || bucket.traced }); }, 'aria-pressed': trace, className: 'rounded-lg px-3 py-2 text-sm font-bold ' + (trace ? 'bg-yellow-300 text-slate-950' : 'bg-slate-800 text-white hover:bg-slate-700') }, '\uD83D\uDCCD Trace'),
              trace && h('button', { type: 'button', onClick: resetTracerJourney, className: 'rounded-lg border border-yellow-300/40 bg-yellow-300/10 px-3 py-2 text-sm font-bold text-yellow-200 hover:bg-yellow-300/20', 'aria-label': 'Start a new random walk measurement for the selected particle' }, '\u25CE New walk'),
              trace && h('button', { type: 'button', onClick: recordTracerJourney, disabled: selectedInfo.journeyTime < 1 || selectedInfo.particleHits < 1, className: 'rounded-lg border border-emerald-300/40 bg-emerald-300/10 px-3 py-2 text-sm font-bold text-emerald-200 hover:bg-emerald-300/20 disabled:cursor-not-allowed disabled:opacity-40', 'aria-label': selectedInfo.particleHits < 1 ? 'Record tracer walk, available after the first particle collision' : 'Record the current tracer walk' }, '\uD83D\uDCCC Save walk'),
              h('button', { type: 'button', onClick: function () { var next = !vectors; setVectors(next); persist({ vectors: next }); }, 'aria-pressed': vectors, className: 'rounded-lg px-3 py-2 text-sm font-bold ' + (vectors ? 'bg-cyan-200 text-slate-950' : 'bg-slate-800 text-white hover:bg-slate-700') }, '\u2197 Velocity'),
              h('button', { type: 'button', onClick: function () { var next = !flowTrails; setFlowTrails(next); persist({ flowTrails: next }); }, 'aria-pressed': flowTrails, className: 'rounded-lg px-3 py-2 text-sm font-bold ' + (flowTrails ? 'bg-violet-300 text-slate-950' : 'bg-slate-800 text-white hover:bg-slate-700') }, '\u223F Flow trails'),
              h('button', { type: 'button', onClick: function () { var next = !energyColors; setEnergyColors(next); persist({ energyColors: next }); }, 'aria-pressed': energyColors, className: 'rounded-lg px-3 py-2 text-sm font-bold ' + (energyColors ? 'bg-gradient-to-r from-cyan-300 via-violet-300 to-red-300 text-slate-950' : 'bg-slate-800 text-white hover:bg-slate-700') }, '\uD83C\uDF08 Speed colors'),
              h('button', { type: 'button', onClick: function () { var next = !wallSensors; setWallSensors(next); persist({ wallSensors: next }); }, 'aria-pressed': wallSensors, className: 'rounded-lg px-3 py-2 text-sm font-bold ' + (wallSensors ? 'bg-indigo-300 text-slate-950' : 'bg-slate-800 text-white hover:bg-slate-700') }, '\u25A3 Wall pressure'),
              h('button', { type: 'button', onClick: function () { var next = !systemProbe; setSystemProbe(next); persist({ systemProbe: next }); }, 'aria-pressed': systemProbe, className: 'rounded-lg px-3 py-2 text-sm font-bold ' + (systemProbe ? 'bg-yellow-300 text-slate-950' : 'bg-slate-800 text-white hover:bg-slate-700') }, '\u25C8 System probe'),
              h('button', { type: 'button', onClick: function () { var next = gravity > 0.01 ? 0 : 1; setGravity(next); persist({ gravity: next }); if (ctx.announceToSR) ctx.announceToSR(next ? 'Gravity field enabled at one model g.' : 'Gravity field disabled.'); }, 'aria-pressed': gravity > 0.01, className: 'rounded-lg px-3 py-2 text-sm font-bold ' + (gravity > 0.01 ? 'bg-amber-300 text-slate-950 shadow-[0_0_18px_rgba(253,224,71,0.3)]' : 'bg-slate-800 text-white hover:bg-slate-700') }, '\u2193 Gravity'),
              h('div', { className: 'flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 p-1', role: 'group', 'aria-label': 'Simulation speed' }, [0.25, 1, 2].map(function (speed) { return h('button', { key: speed, type: 'button', onClick: function () { setTimeScale(speed); persist({ timeScale: speed }); }, 'aria-pressed': timeScale === speed, className: 'min-h-6 rounded px-2 py-1 text-[10px] font-black ' + (timeScale === speed ? 'bg-cyan-300 text-slate-950' : 'text-slate-300 hover:bg-slate-700') }, speed === 0.25 ? 'SLOW' : speed + '\u00D7'); })),
              h('button', { type: 'button', onClick: toggleFullscreen, className: 'rounded-lg bg-slate-800 px-3 py-2 text-sm font-bold text-white hover:bg-slate-700', 'aria-label': fsActive ? 'Exit fullscreen particle chamber' : 'Open fullscreen particle chamber' }, fsActive ? '\u2922 Exit' : '\u26F6 Fullscreen'),
              h('button', { type: 'button', onClick: function () { setShowHud(false); if (ctx.announceToSR) ctx.announceToSR('Simulation controls hidden. Press H or the floating button to bring them back.'); }, className: 'rounded-lg bg-slate-800 px-3 py-2 text-sm font-bold text-white hover:bg-slate-700', 'aria-label': 'Hide the simulation controls. Press H to show them again.' }, 'Hide UI'),
              h('button', { ref: keysOpenerRef, type: 'button', onClick: function (event) { openKeys(event.currentTarget); }, 'aria-expanded': showKeys, 'aria-haspopup': 'dialog', className: 'rounded-lg bg-slate-800 px-3 py-2 text-sm font-bold text-white hover:bg-slate-700', 'aria-label': 'Show the keyboard shortcuts panel' }, 'Keys (?)'),
              h('div', { className: 'ml-auto flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 p-1', role: 'group', 'aria-label': 'Camera views' },
                h('button', { type: 'button', onClick: function () { setCameraShot('hero'); }, className: 'min-h-6 rounded px-2 py-1 text-[10px] font-black uppercase tracking-wide text-cyan-200 hover:bg-slate-700' }, 'Hero'),
                h('button', { type: 'button', onClick: function () { setCameraShot('top'); }, className: 'min-h-6 rounded px-2 py-1 text-[10px] font-black uppercase tracking-wide text-cyan-200 hover:bg-slate-700' }, 'Top'),
                h('button', { type: 'button', onClick: function () { setCameraShot('close'); }, className: 'min-h-6 rounded px-2 py-1 text-[10px] font-black uppercase tracking-wide text-cyan-200 hover:bg-slate-700' }, 'Close'),
                h('button', { type: 'button', onClick: function () { var next = !autoCamera; setAutoCamera(next); if (next) setFollowTracer(false); persist({ autoCamera: next, followTracer: next ? false : followTracer }); }, 'aria-pressed': autoCamera, className: 'min-h-6 rounded px-2 py-1 text-[10px] font-black uppercase tracking-wide ' + (autoCamera ? 'bg-violet-300 text-slate-950' : 'text-violet-200 hover:bg-slate-700') }, '\u25CE Showcase camera'),
                h('button', { type: 'button', disabled: prefersReducedMotion, onClick: function () { var next = !followTracer; setFollowTracer(next); if (next) { setTrace(true); setAutoCamera(false); persist({ followTracer: true, trace: true, traced: true, autoCamera: false }); } else persist({ followTracer: false }); if (ctx.announceToSR) ctx.announceToSR(next ? 'Tracer follow camera enabled.' : 'Tracer follow camera disabled.'); }, 'aria-pressed': followTracer, 'aria-label': prefersReducedMotion ? 'Tracer follow camera unavailable because reduced motion is preferred' : (followTracer ? 'Disable tracer follow camera' : 'Enable tracer follow camera'), className: 'min-h-6 rounded px-2 py-1 text-[10px] font-black uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-45 ' + (followTracer ? 'bg-yellow-300 text-slate-950' : 'text-yellow-200 hover:bg-slate-700') }, '\u25CE Follow tracer')
              ),
              h('span', { role: 'status', 'aria-live': 'polite', className: 'text-xs font-bold ' + (running ? 'text-emerald-300' : 'text-slate-400') }, running ? 'Simulation running' : 'Paused')
            )
          ),
          h('aside', { className: 'space-y-4' },
            h('div', { className: 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm' },
              h('h3', { className: 'font-black text-slate-900' }, 'Experiment controls'),
              h('label', { className: 'mt-4 block text-xs font-bold text-slate-700' }, 'Temperature: ', h('output', { className: 'text-cyan-700' }, temperature + ' K')),
              h('input', { type: 'range', min: 40, max: 900, step: 10, value: temperature, onChange: function (e) { setTemp(e.target.value); }, className: 'mt-1 w-full accent-cyan-600', 'aria-label': 'Temperature in kelvin' }),
              h('label', { className: 'mt-4 block text-xs font-bold text-slate-700' }, 'Particle count: ', h('output', { className: 'text-cyan-700' }, count)),
              h('input', { type: 'range', min: 24, max: 120, step: 8, value: count, onChange: function (e) { var value = Number(e.target.value); setCount(value); setSelectedParticle(function (old) { return Math.min(old, value - 1); }); setRunning(false); setResetKey(function (k) { return k + 1; }); persist({ count: value, selectedParticle: Math.min(selectedParticle, value - 1) }); }, className: 'mt-1 w-full accent-cyan-600', 'aria-label': 'Particle count' }),
              h('label', { htmlFor: 'particle-trace-selector', className: 'mt-4 block text-xs font-bold text-slate-700' }, 'Particle to trace (keyboard alternative to clicking)'),
              h('input', { id: 'particle-trace-selector', type: 'number', min: 1, max: count, step: 1, value: Math.min(selectedParticle, count - 1) + 1, onChange: function (event) { selectParticle(event.target.value); }, className: 'mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900', 'aria-describedby': 'particle-trace-selector-help' }),
              h('p', { id: 'particle-trace-selector-help', className: 'mt-1 text-[10px] leading-relaxed text-slate-500' }, 'Enter a particle number from 1 to ' + count + '. Selecting a particle turns on the random-walk trace.'),
              h('label', { className: 'mt-4 block text-xs font-bold text-slate-700' }, 'Container edge: ', h('output', { className: 'text-cyan-700' }, boxSize + ' u'), h('span', { className: 'ml-1 font-normal text-slate-500' }, '(volume ' + Math.round(boxSize * boxSize * boxSize) + ' u\u00B3)')),
              h('input', { type: 'range', min: 8, max: 15, step: 1, value: boxSize, onChange: function (e) { var value = Number(e.target.value); setBoxSize(value); setRunning(false); setResetKey(function (k) { return k + 1; }); persist({ boxSize: value }); }, className: 'mt-1 w-full accent-cyan-600', 'aria-label': 'Container edge length and volume' }),
              h('label', { className: 'mt-4 block text-xs font-bold text-slate-700' }, 'Collision diameter: ', h('output', { className: 'text-cyan-700' }, particleDiameter.toFixed(2) + ' u')),
              h('input', { type: 'range', min: 0.36, max: 0.9, step: 0.06, value: particleDiameter, onChange: function (e) { var value = Number(e.target.value); setParticleDiameter(value); setRunning(false); setHistory([]); setResetKey(function (k) { return k + 1; }); persist({ particleDiameter: value }); }, className: 'mt-1 w-full accent-cyan-600', 'aria-label': 'Particle collision diameter', 'aria-valuetext': particleDiameter.toFixed(2) + ' model units' }),
              h('p', { className: 'mt-1 text-[10px] leading-relaxed text-slate-500' }, 'Larger cross sections produce more frequent collisions and a shorter theoretical mean free path.'),
              h('label', { className: 'mt-4 block text-xs font-bold text-slate-700' }, 'Attraction strength: ', h('output', { className: 'text-cyan-700' }, attraction.toFixed(2))),
              h('input', { type: 'range', min: 0, max: 1.5, step: 0.05, value: attraction, onChange: function (e) { var value = Number(e.target.value); setAttraction(value); persist({ attraction: value }); }, className: 'mt-1 w-full accent-cyan-600', 'aria-label': 'Interparticle attraction strength' }),
              h('label', { className: 'mt-4 block text-xs font-bold text-slate-700' }, 'Gravity field: ', h('output', { className: 'text-amber-700' }, gravity > 0.01 ? gravity.toFixed(1) + ' g*' : 'Off')),
              h('input', { type: 'range', min: 0, max: 2, step: 0.1, value: gravity, onChange: function (e) { var value = Number(e.target.value); setGravity(value); persist({ gravity: value }); }, className: 'mt-1 w-full accent-amber-500', 'aria-label': 'Downward gravity field strength', 'aria-valuetext': gravity > 0.01 ? gravity.toFixed(1) + ' model g' : 'off' }),
              h('p', { className: 'mt-1 text-[10px] leading-relaxed text-slate-500' }, gravity > 0.01 ? 'Particles accelerate toward the illuminated floor; g* is a model unit, not an Earth-scale calibration.' : 'Microgravity mode: no preferred up or down direction.'),
              transportMode && h('div', { className: 'mt-4 rounded-xl border border-violet-200 bg-violet-50 p-3' },
                h('div', { className: 'flex items-center justify-between gap-2' }, h('div', null, h('div', { className: 'text-xs font-black text-violet-950' }, preset === 'osmosis' ? 'Osmotic membrane' : 'Semipermeable membrane'), h('div', { className: 'text-[10px] text-violet-700' }, membrane ? 'Transport barrier active' : 'Open chamber')), h('button', { type: 'button', onClick: function () { var next = !membrane; setMembrane(next); persist({ membrane: next }); }, 'aria-pressed': membrane, className: 'rounded-lg px-3 py-2 text-xs font-black ' + (membrane ? 'bg-violet-600 text-white' : 'border border-violet-300 bg-white text-violet-800') }, membrane ? 'Remove' : 'Add membrane')),
                h('label', { className: 'mt-3 block text-xs font-bold text-slate-700' }, 'Permeability: ', h('output', { className: 'text-violet-700' }, Math.round(permeability * 100) + '%')),
                h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: permeability, disabled: !membrane, onChange: function (e) { var value = Number(e.target.value); setPermeability(value); persist({ permeability: value }); }, className: 'mt-1 w-full accent-violet-600 disabled:opacity-40', 'aria-label': 'Membrane permeability', 'aria-valuetext': Math.round(permeability * 100) + ' percent' }),
                h('label', { className: 'mt-3 block text-xs font-bold text-slate-700' }, 'Species preference'),
                h('select', { value: membraneSelectivity, disabled: !membrane, onChange: function (e) { var value = e.target.value; setMembraneSelectivity(value); persist({ membraneSelectivity: value }); }, className: 'mt-1 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs text-slate-800 disabled:opacity-40', 'aria-label': 'Membrane species preference' }, h('option', { value: 'both' }, 'A and B equally'), h('option', { value: 'a' }, 'Prefer particle A'), h('option', { value: 'b' }, 'Prefer particle B')),
                h('p', { className: 'mt-1 text-[10px] leading-relaxed text-slate-500' }, 'Controls the probability that a particle crossing the center plane passes through instead of reflecting.'),
                h('label', { className: 'mt-3 block text-xs font-bold text-slate-700' }, 'Relative mass of B: ', h('output', { className: 'text-fuchsia-700' }, massRatioB.toFixed(1) + '\u00d7 A')),
                h('input', { type: 'range', min: 0.5, max: 3, step: 0.1, value: massRatioB, onChange: function (e) { var value = Number(e.target.value); setMassRatioB(value); setRunning(false); setHistory([]); setResetKey(function (k) { return k + 1; }); persist({ massRatioB: value }); }, className: 'mt-1 w-full accent-fuchsia-600', 'aria-label': 'Particle B mass relative to particle A', 'aria-valuetext': massRatioB.toFixed(1) + ' times particle A mass' }),
                h('p', { className: 'mt-1 text-[10px] leading-relaxed text-slate-500' }, massRatioB > 1.05 ? 'B is heavier: at the same temperature it begins slower, while collisions still conserve momentum and energy.' : (massRatioB < 0.95 ? 'B is lighter: at the same temperature it begins faster, while collisions still conserve momentum and energy.' : 'A and B have equal mass and the same starting speed distribution.'))
              )
            ),
            h('div', { className: 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm' },
              h('h3', { className: 'font-black text-slate-900' }, 'Live measurements'),
              h('div', { className: 'mt-3 grid grid-cols-2 gap-2' },
                [['Temperature', stats.temperature + ' K'], ['Pressure', stats.pressure + ' u'], ['Kinetic energy', stats.energy + ' u'], ['Collisions', stats.collisions + ' / sample']].map(function (m) { return h('div', { key: m[0], className: 'rounded-xl bg-slate-100 p-3' }, h('div', { className: 'text-[10px] font-bold uppercase tracking-wide text-slate-500' }, m[0]), h('div', { className: 'mt-1 text-lg font-black text-slate-900' }, m[1])); })
              ),
              transportMode && h('div', { className: 'mt-3 rounded-xl border border-violet-200 bg-gradient-to-br from-slate-950 to-violet-950 p-3 text-white', role: 'img', 'aria-label': (preset === 'osmosis' ? 'Osmosis monitor. Net solvent shift ' + Math.round(diffusionInfo.osmoticShift * 100) + ' percent and solute leakage ' + Math.round(diffusionInfo.soluteLeak * 100) + ' percent.' : 'Diffusion monitor. Mixing index ' + Math.round(diffusionInfo.mixing * 100) + ' percent.') + ' Particle B has a relative mass of ' + massRatioB.toFixed(1) + ' times particle A. Particle A concentration is ' + Math.round(diffusionInfo.leftA * 100) + ' percent on the left and ' + Math.round(diffusionInfo.rightA * 100) + ' percent on the right. Particle A crossing flux ' + diffusionInfo.fluxA.toFixed(1) + ' per second and particle B crossing flux ' + diffusionInfo.fluxB.toFixed(1) + ' per second. Spatial mixing entropy is ' + Math.round(diffusionInfo.entropy * 100) + ' percent. Particle A diffusion coefficient is ' + diffusionInfo.coefficientA.toFixed(2) + ' and particle B diffusion coefficient is ' + diffusionInfo.coefficientB.toFixed(2) + '. Mean squared displacement is ' + diffusionInfo.msd.toFixed(1) + ' square model units. ' + (diffusionInfo.milestoneTime == null ? 'The transport milestone has not been reached.' : 'The transport milestone was reached at ' + diffusionInfo.milestoneTime.toFixed(1) + ' seconds.') },
                h('div', { className: 'flex items-end justify-between gap-3' }, h('div', null, h('div', { className: 'text-[10px] font-black uppercase tracking-[0.16em] text-violet-300' }, preset === 'osmosis' ? 'Osmotic transport' : 'Concentration gradient'), h('div', { className: 'mt-1 text-xl font-black' }, preset === 'osmosis' ? (diffusionInfo.osmoticShift >= 0 ? '+' : '') + Math.round(diffusionInfo.osmoticShift * 100) + '% solvent shift' : Math.round(diffusionInfo.mixing * 100) + '% mixed')), h('div', { className: 'text-right font-mono text-[10px] text-violet-200' }, h('div', null, 'A ' + diffusionInfo.fluxA.toFixed(1) + '/s'), h('div', null, 'B ' + diffusionInfo.fluxB.toFixed(1) + '/s'), h('div', { className: 'text-fuchsia-300' }, 'mB ' + massRatioB.toFixed(1) + '\u00d7'))),
                h('div', { className: 'mt-3 grid grid-cols-3 gap-1.5 text-center' }, (preset === 'osmosis' ? [['Solvent shift', (diffusionInfo.osmoticShift >= 0 ? '+' : '') + Math.round(diffusionInfo.osmoticShift * 100) + '%'], ['Solute leak', Math.round(diffusionInfo.soluteLeak * 100) + '%'], ['D*', diffusionInfo.coefficient.toFixed(2)]] : [['Entropy', Math.round(diffusionInfo.entropy * 100) + '%'], ['D*A', diffusionInfo.coefficientA.toFixed(2)], ['D*B', diffusionInfo.coefficientB.toFixed(2)]]).map(function (item) { return h('div', { key: item[0], className: 'rounded-lg bg-white/[0.06] p-2' }, h('div', { className: 'text-[10px] font-black uppercase tracking-wide text-violet-300' }, item[0]), h('div', { className: 'mt-0.5 font-mono text-xs font-black text-white' }, item[1])); })),
                h('div', { className: 'mt-3 h-2 overflow-hidden rounded-full bg-white/10' }, h('div', { className: 'h-full rounded-full bg-gradient-to-r from-cyan-300 via-violet-300 to-fuchsia-300 transition-all', style: { width: Math.round((preset === 'osmosis' ? diffusionInfo.solventRight : diffusionInfo.mixing) * 100) + '%' } })),
                membrane && h('div', { className: 'mt-3 overflow-hidden rounded-xl border border-emerald-300/20 bg-gradient-to-r from-emerald-950/80 via-slate-950 to-cyan-950/80 p-3', role: 'region', 'aria-label': 'Fick law flux meter. Positive values point from left to right. Observed net flux for species A is ' + Number(diffusionInfo.netFluxA || 0).toFixed(2) + ' particles per second, while the concentration-gradient estimate is ' + fickExpectedA.toFixed(2) + '. Species B observed net flux is ' + Number(diffusionInfo.netFluxB || 0).toFixed(2) + ', with estimate ' + fickExpectedB.toFixed(2) + '.' },
                  h('div', { className: 'flex flex-wrap items-start justify-between gap-2' }, h('div', null, h('div', { className: 'text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200' }, 'Fick law flux meter'), h('div', { className: 'mt-0.5 text-[10px] font-bold text-white' }, 'Does flow follow the concentration gradient?')), h('span', { className: 'rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-1 font-mono text-[10px] text-emerald-100' }, 'J = -D dc/dx')),
                  h('div', { className: 'mt-3 space-y-3' }, [['A', Number(diffusionInfo.netFluxA || 0), fickExpectedA, 'bg-cyan-300', 'text-cyan-100'], ['B', Number(diffusionInfo.netFluxB || 0), fickExpectedB, 'bg-fuchsia-300', 'text-fuchsia-100']].map(function (row) { var observedX = 50 + clamp(row[1] / fickScale, -1, 1) * 45, expectedX = 50 + clamp(row[2] / fickScale, -1, 1) * 45; return h('div', { key: row[0] }, h('div', { className: 'flex justify-between gap-2 font-mono text-[10px] ' + row[4] }, h('span', null, row[0] + ' observed ' + (row[1] >= 0 ? '+' : '') + row[1].toFixed(2) + '/s'), h('span', null, 'gradient estimate ' + (row[2] >= 0 ? '+' : '') + row[2].toFixed(2) + '/s')), h('div', { className: 'relative mt-1 h-3 rounded-full bg-white/10' }, h('span', { className: 'absolute inset-y-0 left-1/2 w-px bg-white/50' }), h('span', { className: 'absolute top-0 h-3 w-1 -translate-x-1/2 rounded-full ' + row[3], style: { left: observedX + '%' } }), h('span', { className: 'absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-yellow-200 bg-slate-950', style: { left: expectedX + '%' } }))); })),
                  h('div', { className: 'mt-2 flex justify-between text-[10px] font-bold uppercase tracking-wide text-slate-400', 'aria-hidden': 'true' }, h('span', null, 'right to left'), h('span', null, 'zero'), h('span', null, 'left to right')),
                  h('div', { className: 'mt-2 rounded-lg border px-2 py-1.5 text-[10px] leading-relaxed ' + (fickAgreementA < 0.35 ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100' : 'border-white/10 bg-white/5 text-slate-200'), role: 'status' }, 'Species A net flow is ' + fickDirection + '. ' + (fickAgreementA < 0.35 ? 'Observed flow currently agrees with the Fick-law direction and scale.' : 'Instantaneous crossings fluctuate; let the chamber run to reveal the average trend.') + ' Bars are observed; yellow diamonds are gradient estimates.')
                ),                membrane && h('div', { className: 'mt-3 overflow-hidden rounded-xl border border-violet-300/20 bg-gradient-to-br from-slate-950 via-violet-950/80 to-fuchsia-950/70 p-3', role: 'region', 'aria-label': 'Membrane selectivity assay. Species A transmission ' + Math.round(selectivityAssay.transmissionA * 100) + ' percent with a 95 percent interval from ' + Math.round(selectivityCIA.low * 100) + ' to ' + Math.round(selectivityCIA.high * 100) + ' percent, from ' + selectivityAssay.attemptsA + ' attempts. Species B transmission ' + Math.round(selectivityAssay.transmissionB * 100) + ' percent with interval from ' + Math.round(selectivityCIB.low * 100) + ' to ' + Math.round(selectivityCIB.high * 100) + ' percent, from ' + selectivityAssay.attemptsB + ' attempts. Evidence quality: ' + selectivityEvidence + '. Separation result: ' + selectivityLabel + '.' },
                  h('div', { className: 'flex flex-wrap items-start justify-between gap-2' }, h('div', null, h('div', { className: 'text-[10px] font-black uppercase tracking-[0.18em] text-violet-200' }, 'Membrane selectivity assay'), h('div', { className: 'mt-0.5 text-[10px] font-bold text-white' }, 'Transmission probability from real encounters')), h('span', { className: 'rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wide ' + (selectivityAssay.ready ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100' : 'border-white/10 bg-white/5 text-slate-300') }, selectivityLabel)),
                  h('div', { className: 'mt-3 space-y-3' }, [['A', selectivityAssay.transmissionA, selectivityAssay.attemptsA, poreOpennessA, 'from-cyan-300 to-sky-500', 'text-cyan-100', selectivityCIA], ['B', selectivityAssay.transmissionB, selectivityAssay.attemptsB, poreOpennessB, 'from-fuchsia-300 to-pink-500', 'text-fuchsia-100', selectivityCIB]].map(function (row) { return h('div', { key: row[0] }, h('div', { className: 'flex justify-between gap-2 font-mono text-[10px] ' + row[5] }, h('span', null, row[0] + ' transmits ' + Math.round(row[1] * 100) + '%'), h('span', null, row[2] + ' encounters, 95% range ' + Math.round(row[6].low * 100) + '-' + Math.round(row[6].high * 100) + '%')), h('div', { className: 'relative mt-1 h-2.5 overflow-hidden rounded-full bg-white/10' }, h('div', { className: 'h-full rounded-full bg-gradient-to-r opacity-75 transition-all ' + row[4], style: { width: Math.round(row[1] * 100) + '%' } }), h('span', { className: 'absolute inset-y-0 border-x border-white/80 bg-white/15', style: { left: Math.round(row[6].low * 100) + '%', width: Math.max(1, Math.round(row[6].width * 100)) + '%' } }), h('span', { className: 'absolute inset-y-0 w-0.5 bg-yellow-200 shadow-[0_0_6px_rgba(253,224,71,0.8)]', style: { left: Math.round(row[3] * 100) + '%' } }))); })),
                  h('div', { className: 'mt-2 flex justify-between gap-3 text-[10px] leading-relaxed text-slate-300' }, h('span', null, 'Bars: observed | pale band: 95% range'), h('span', { className: 'text-right text-yellow-100' }, 'Yellow marker: pore setting')),
                  h('div', { className: 'mt-2 rounded-lg border px-2 py-1.5 text-[10px] ' + (selectivityUncertainty <= 0.25 ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100' : 'border-white/10 bg-white/5 text-slate-200'), role: 'status', 'aria-live': 'polite' }, selectivityEvidence + '. ' + (selectivityAssay.ready ? 'The interval bands narrow as more membrane encounters accumulate.' : 'Both species need at least five encounters.')),
                  h('p', { className: 'mt-2 border-t border-white/10 pt-2 text-[10px] leading-relaxed text-violet-100' }, selectivityAssay.ready ? (membraneSelectivity === 'both' ? 'Equal preference should converge toward similar transmission as encounters accumulate.' : 'The separation factor compares the preferred species transmission with the restricted species.') : 'Collect at least five membrane encounters for each species before interpreting selectivity.')
                ),                preset === 'diffusion' && h('div', { className: 'mt-3 rounded-lg border border-white/10 bg-white/[0.04] p-2', role: 'img', 'aria-label': 'Species diffusion race. Particle A root mean square displacement is ' + Math.sqrt(Math.max(0, diffusionInfo.msdA)).toFixed(1) + ' model units with diffusion coefficient ' + diffusionInfo.coefficientA.toFixed(2) + '. Particle B root mean square displacement is ' + Math.sqrt(Math.max(0, diffusionInfo.msdB)).toFixed(1) + ' model units with diffusion coefficient ' + diffusionInfo.coefficientB.toFixed(2) + '.' },
                  h('div', { className: 'flex items-center justify-between text-[10px] font-black uppercase tracking-wide text-slate-300' }, h('span', null, 'Species diffusion race'), h('span', null, 'RMS distance from start')),
                  [['A', diffusionInfo.msdA, diffusionInfo.coefficientA, 'from-cyan-300 to-sky-500'], ['B', diffusionInfo.msdB, diffusionInfo.coefficientB, 'from-fuchsia-300 to-pink-500']].map(function (race) { var rms = Math.sqrt(Math.max(0, race[1])), width = clamp(rms / Math.max(1, boxSize) * 130, 2, 100); return h('div', { key: race[0], className: 'mt-2' }, h('div', { className: 'flex justify-between font-mono text-[10px] text-slate-200' }, h('span', null, race[0] + '  ' + rms.toFixed(1) + ' u'), h('span', null, 'D* ' + race[2].toFixed(2))), h('div', { className: 'mt-1 h-2 overflow-hidden rounded-full bg-white/10' }, h('div', { className: 'h-full rounded-full bg-gradient-to-r transition-all ' + race[3], style: { width: width + '%' } }))); })
                ),
                preset === 'diffusion' && h('div', { className: 'mt-3 overflow-hidden rounded-xl border border-cyan-300/20 bg-gradient-to-br from-cyan-950/70 via-indigo-950/80 to-fuchsia-950/70 p-3 shadow-[0_0_24px_rgba(34,211,238,0.08)]', role: 'region', 'aria-label': 'Diffusion transport fingerprint. Species A exponent alpha ' + diffusionRegimeA.alpha.toFixed(2) + ', classified as ' + diffusionRegimeA.regime + '. Species B exponent alpha ' + diffusionRegimeB.alpha.toFixed(2) + ', classified as ' + diffusionRegimeB.regime + '. Alpha near one indicates normal diffusion; the dashed line is the normal diffusion guide.' },
                  h('div', { className: 'flex flex-wrap items-start justify-between gap-2' }, h('div', null, h('div', { className: 'text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200' }, 'Transport fingerprint'), h('div', { className: 'mt-0.5 text-[10px] font-bold text-white' }, 'How mean-squared displacement scales with time')), h('span', { className: 'rounded-full border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] text-indigo-100' }, 'MSD ∝ time^α')),
                  h('svg', { viewBox: '0 0 240 68', className: 'mt-2 h-[82px] w-full', role: 'img', 'aria-label': diffusionFingerprint.length > 3 ? 'Log-scaled mean squared displacement chart. Cyan is species A, pink is species B, and the dashed yellow line shows normal diffusion.' : 'Diffusion fingerprint waiting for four measurement samples.' },
                    [16, 32, 48].map(function (y) { return h('line', { key: 'y' + y, x1: 8, y1: y, x2: 232, y2: y, stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }); }),
                    [64, 120, 176].map(function (x) { return h('line', { key: 'x' + x, x1: x, y1: 8, x2: x, y2: 58, stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1 }); }),
                    diffusionFingerprint.length > 3 ? h('g', null, h('path', { d: diffusionGuidePath, fill: 'none', stroke: '#fde68a', strokeWidth: 1.5, strokeDasharray: '5 4', opacity: 0.8 }), h('path', { d: diffusionFingerprintPath('msdA'), fill: 'none', stroke: '#22d3ee', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' }), h('path', { d: diffusionFingerprintPath('msdB'), fill: 'none', stroke: '#f472b6', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' })) : h('text', { x: 120, y: 36, textAnchor: 'middle', fontSize: 9, fill: '#bae6fd' }, 'collecting the transport signature...'),
                    h('text', { x: 8, y: 66, fontSize: 7, fill: '#94a3b8' }, 'early'), h('text', { x: 214, y: 66, fontSize: 7, fill: '#94a3b8' }, 'later')),
                  h('div', { className: 'mt-2 grid grid-cols-2 gap-2' }, [['A', diffusionRegimeA, 'border-cyan-300/30 bg-cyan-300/10 text-cyan-100'], ['B', diffusionRegimeB, 'border-fuchsia-300/30 bg-fuchsia-300/10 text-fuchsia-100']].map(function (item) { return h('div', { key: item[0], className: 'rounded-lg border p-2 ' + item[2] }, h('div', { className: 'flex items-baseline justify-between gap-1' }, h('span', { className: 'text-[10px] font-black uppercase' }, 'Species ' + item[0]), h('span', { className: 'font-mono text-sm font-black' }, item[1].samples < 4 ? '—' : 'α ' + item[1].alpha.toFixed(2))), h('div', { className: 'mt-0.5 text-[10px] font-bold uppercase tracking-wide' }, item[1].regime)); })),
                  h('p', { className: 'mt-2 text-[10px] leading-relaxed text-indigo-100' }, diffusionRegimeA.samples < 4 ? 'Run the chamber to reveal whether motion is ballistic, diffusive, slowed, or confined.' : diffusionRegimeA.note + ' In a finite chamber, the curves eventually flatten as particles encounter boundaries.')
                ),                h('div', { className: 'mt-3 rounded-lg border border-white/10 bg-white/[0.04] p-2', role: 'img', 'aria-label': 'Ensemble collision transport. Species A mean free path ' + ensembleFlights.a.mean.toFixed(1) + ' plus or minus ' + ensembleFlights.a.error.toFixed(1) + ' model units from ' + ensembleFlights.a.samples + ' flights, with collision rate ' + ensembleFlights.a.collisionRate.toFixed(2) + ' per second. Species B mean free path ' + ensembleFlights.b.mean.toFixed(1) + ' plus or minus ' + ensembleFlights.b.error.toFixed(1) + ' model units from ' + ensembleFlights.b.samples + ' flights, with collision rate ' + ensembleFlights.b.collisionRate.toFixed(2) + ' per second. Kinetic theory reference ' + currentMeanFreePathTheory.toFixed(1) + ' model units.' },
                  h('div', { className: 'flex items-center justify-between text-[10px] font-black uppercase tracking-wide text-slate-300' }, h('span', null, 'Ensemble collision transport'), h('span', null, 'theory reference ' + currentMeanFreePathTheory.toFixed(1) + ' u')),
                  [['A', ensembleFlights.a, 'from-cyan-300 to-sky-500'], ['B', ensembleFlights.b, 'from-fuchsia-300 to-pink-500']].map(function (row) { var width = clamp(row[1].mean / Math.max(0.001, currentMeanFreePathTheory * 2) * 100, 0, 100); return h('div', { key: row[0], className: 'mt-2' }, h('div', { className: 'flex justify-between gap-2 font-mono text-[10px] text-slate-200' }, h('span', null, row[0] + ' path ' + row[1].mean.toFixed(1) + ' +/- ' + row[1].error.toFixed(1)), h('span', null, row[1].samples + ' flights, ' + row[1].collisionRate.toFixed(2) + '/s')), h('div', { className: 'relative mt-1 h-2 overflow-hidden rounded-full bg-white/10' }, h('div', { className: 'h-full rounded-full bg-gradient-to-r transition-all ' + row[2], style: { width: width + '%' } }), h('span', { className: 'absolute inset-y-0 left-1/2 w-px bg-yellow-200' }))); }),
                  h('p', { className: 'mt-2 text-[10px] leading-relaxed text-slate-400' }, 'Equal-size species should approach a similar mean free path; mass and speed can still change how often collisions occur.')
                ),
                h('div', { className: 'mt-3 rounded-lg bg-white/[0.04] p-2' },
                  h('div', { className: 'flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-wide text-slate-300' }, h('span', null, preset === 'osmosis' ? 'Solvent right / solute leak' : 'Mixing / entropy'), h('span', null, 'Last ' + Math.min(14, Math.round(transportTimeline.length * 0.4)) + ' s')),
                  h('svg', { viewBox: '0 0 240 64', className: 'mt-1 h-16 w-full', role: 'img', 'aria-label': preset === 'osmosis' ? 'Recent solvent-right fraction and solute leakage over time.' : 'Recent mixing index and spatial entropy over time.' },
                    h('line', { x1: 4, y1: 56, x2: 236, y2: 56, stroke: 'rgba(203,213,225,0.25)', strokeWidth: 1 }),
                    h('line', { x1: 4, y1: 56 - transportTarget * 48, x2: 236, y2: 56 - transportTarget * 48, stroke: '#fde68a', strokeWidth: 1, strokeDasharray: '4 3' }),
                    h('path', { d: percentPath(transportPrimary), fill: 'none', stroke: '#22d3ee', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' }),
                    h('path', { d: percentPath(transportSecondary), fill: 'none', stroke: '#f472b6', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' })
                  ),
                  h('div', { className: 'flex items-center justify-between gap-2 font-mono text-[10px] text-slate-300' }, h('span', null, preset === 'osmosis' ? 'cyan solvent-right' : 'cyan mixing'), h('span', { className: 'text-yellow-200' }, diffusionInfo.milestoneTime == null ? (preset === 'osmosis' ? 'target +5% shift' : 'target 80% mix') : 'target at ' + diffusionInfo.milestoneTime.toFixed(1) + ' s'), h('span', null, preset === 'osmosis' ? 'pink solute leak' : 'pink entropy'))
                ),
                h('svg', { viewBox: '0 0 240 70', className: 'mt-3 h-[70px] w-full', role: 'img', 'aria-label': 'Ten-zone concentration profile from left to right. Each bar shows percent particle A.' },
                  h('line', { x1: 120, y1: 3, x2: 120, y2: 58, stroke: '#c4b5fd', strokeWidth: 1, strokeDasharray: '3 3' }),
                  (diffusionInfo.profileA || []).map(function (value, i) { var aHeight = clamp(value, 0, 1) * 48, bHeight = 48 - aHeight; return h('g', { key: i }, h('rect', { x: i * 23 + 6, y: 8, width: 17, height: Math.max(1, bHeight), rx: 2, fill: '#f472b6', opacity: 0.78 }), h('rect', { x: i * 23 + 6, y: 56 - aHeight, width: 17, height: Math.max(1, aHeight), rx: 2, fill: '#22d3ee', opacity: 0.88 })); }),
                  h('text', { x: 3, y: 68, fontSize: 8, fill: '#cbd5e1' }, 'left'), h('text', { x: 216, y: 68, fontSize: 8, fill: '#cbd5e1' }, 'right'), h('text', { x: 124, y: 10, fontSize: 7, fill: '#c4b5fd' }, 'membrane')
                ),
                h('div', { className: 'mt-1 flex justify-between font-mono text-[10px] text-slate-300' }, h('span', null, 'A cloud ' + diffusionInfo.spreadA.toFixed(1) + ' u'), h('span', null, diffusionInfo.elapsed.toFixed(1) + ' s'), h('span', null, 'B cloud ' + diffusionInfo.spreadB.toFixed(1) + ' u')),
                h('div', { className: 'mt-1 flex justify-between font-mono text-[10px] text-slate-300' }, h('span', null, 'Left: ' + Math.round(diffusionInfo.leftA * 100) + '% A'), h('span', null, 'Right: ' + Math.round(diffusionInfo.rightA * 100) + '% A'))
              ),
              trace && h('div', { className: 'mt-3 rounded-xl border border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50 p-3', role: 'region', 'aria-label': 'Tracer walk comparison notebook' },
                h('div', { className: 'flex items-center justify-between gap-2' }, h('div', null, h('div', { className: 'text-[10px] font-black uppercase tracking-[0.14em] text-amber-800' }, 'Tracer walk notebook'), h('div', { className: 'mt-0.5 text-[10px] text-amber-900' }, 'Compare mean free path under two conditions')), h('span', { className: 'rounded-full bg-amber-200 px-2 py-1 font-mono text-[10px] font-black text-amber-950' }, tracerTrials.length + '/2 saved')),
                (activeProtocol === 'mfp' || activeProtocol === 'crosssection') && h('div', { className: 'mt-2 overflow-hidden rounded-xl border border-amber-300 bg-gradient-to-r from-amber-950 via-slate-950 to-violet-950 p-3 text-white shadow-lg', role: 'region', 'aria-label': 'Mean free path protocol progress. ' + mfpStepsComplete + ' of 5 steps complete.' },
                  h('div', { className: 'flex items-center justify-between gap-2' }, h('div', null, h('div', { className: 'text-[10px] font-black uppercase tracking-[0.18em] text-amber-300' }, 'Guided protocol progress'), h('div', { className: 'mt-0.5 text-[10px] font-bold text-white' }, mfpStepsComplete === 5 ? 'Investigation complete' : 'Next: ' + (mfpProtocolSteps.filter(function (step) { return !step.complete; })[0] || { label: 'Review evidence' }).label)), h('span', { className: 'rounded-full border border-amber-300/40 bg-amber-300/10 px-2 py-1 font-mono text-[10px] font-black text-amber-100' }, mfpStepsComplete + '/5')),
                  h('div', { className: 'mt-3 grid grid-cols-5 gap-1' }, mfpProtocolSteps.map(function (step, i) { return h('div', { key: step.label, className: 'min-w-0 text-center' }, h('div', { className: 'mx-auto flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-black ' + (step.complete ? 'border-emerald-300 bg-emerald-300 text-emerald-950' : 'border-slate-600 bg-slate-800 text-slate-300'), 'aria-hidden': 'true' }, step.complete ? '\u2713' : i + 1), h('div', { className: 'mt-1 text-[10px] font-bold leading-tight ' + (step.complete ? 'text-emerald-200' : 'text-slate-400') }, step.label)); })),
                  h('div', { className: 'mt-3 grid gap-2 sm:grid-cols-[1fr_auto]' }, h('div', { className: 'rounded-lg border border-white/10 bg-white/5 p-2' }, h('div', { className: 'flex items-center justify-between gap-2' }, h('span', { className: 'text-[10px] font-black uppercase tracking-wide text-slate-300' }, 'Sample quality'), h('span', { className: 'text-[10px] font-black ' + tracerSampleQuality.tone.replace('800', '200').replace('700', '200') }, tracerSampleQuality.label)), h('div', { className: 'mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-700', role: 'progressbar', 'aria-label': 'Free-flight sample progress toward twelve recommended samples', 'aria-valuemin': 0, 'aria-valuemax': 12, 'aria-valuenow': Math.min(12, selectedInfo.freeFlightSamples) }, h('div', { className: 'h-full rounded-full transition-all ' + tracerSampleQuality.fill, style: { width: Math.round(tracerSampleProgress * 100) + '%' } })), h('div', { className: 'mt-1 flex justify-between gap-2 text-[10px] text-slate-300' }, h('span', null, tracerSampleQuality.note), h('span', { className: 'shrink-0 font-mono' }, selectedInfo.freeFlightSamples + '/12 flights'))), liveTracerControl && h('div', { className: 'rounded-lg border px-2 py-1.5 text-center ' + (liveTracerControl.fair ? 'border-emerald-300/40 bg-emerald-300/10 text-emerald-100' : (liveTracerControl.replicate ? 'border-slate-500 bg-slate-700/40 text-slate-200' : 'border-rose-300/40 bg-rose-300/10 text-rose-100')), role: 'status', 'aria-live': 'polite' }, h('div', { className: 'text-[10px] font-black uppercase tracking-wide' }, liveTracerControl.fair ? 'One variable changed' : (liveTracerControl.replicate ? 'Conditions unchanged' : 'Multiple changes')), h('div', { className: 'mt-0.5 max-w-[120px] text-[10px] leading-tight' }, liveTracerControl.fair ? liveTracerControl.changedVariable : (liveTracerControl.replicate ? 'Adjust count or volume.' : liveTracerControl.changed.join(', '))))
                )),
                h('div', { className: 'mt-2 rounded-lg border border-amber-200 bg-white/80 p-2' },
                  h('div', { className: 'flex justify-between text-[10px] font-black uppercase tracking-wide text-amber-900' }, h('span', null, 'Live free-flight distribution'), h('span', null, flightChart.count + ' samples')),
                  h('svg', { viewBox: '0 0 240 72', className: 'mt-1 h-[72px] w-full', role: 'img', 'aria-label': 'Histogram of ' + flightChart.count + ' completed free flights. Observed mean ' + selectedInfo.meanFreePath.toFixed(1) + ' model units. Kinetic theory mean ' + currentMeanFreePathTheory.toFixed(1) + ' model units. Bars show observations and the line shows the exponential kinetic theory prediction.' },
                    h('line', { x1: 4, y1: 56, x2: 236, y2: 56, stroke: '#a16207', strokeWidth: 1, opacity: 0.35 }),
                    flightChart.bins.map(function (value, i) { var height = value / flightChartPeak * 46; return h('rect', { key: i, x: i * 29 + 7, y: 56 - height, width: 18, height: Math.max(1, height), rx: 2, fill: '#d97706', opacity: 0.72 }); }),
                    h('path', { d: flightTheoryPath, fill: 'none', stroke: '#7c3aed', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' }),
                    h('line', { x1: flightMeanX, y1: 7, x2: flightMeanX, y2: 58, stroke: '#0f766e', strokeWidth: 2, strokeDasharray: '3 2' }),
                    h('text', { x: 4, y: 69, fontSize: 8, fill: '#92400e' }, 'short flights'), h('text', { x: 196, y: 69, fontSize: 8, fill: '#92400e' }, 'long flights')
                  ),
                  h('div', { className: 'flex justify-between font-mono text-[10px] text-amber-900' }, h('span', null, 'bars observed'), h('span', null, 'dashed mean'), h('span', null, 'line theory'))
                ),
                (activeProtocol === 'mfp' || activeProtocol === 'crosssection') && h('div', { className: 'mt-2 overflow-hidden rounded-xl border border-cyan-200 bg-gradient-to-br from-slate-950 via-cyan-950 to-indigo-950 p-3 text-white shadow-lg', role: 'img', 'aria-label': recentFlightSequence.length ? 'Flight by flight timeline from oldest to newest. Recent completed flight lengths in model units: ' + recentFlightSequence.map(function (flight) { return flight.toFixed(1); }).join(', ') + '. Kinetic theory reference ' + currentMeanFreePathTheory.toFixed(1) + '. Current unfinished flight ' + selectedInfo.currentFreeFlight.toFixed(1) + '.' : 'Flight by flight timeline waiting for the first completed tracer collision.' },
                  h('div', { className: 'flex flex-wrap items-start justify-between gap-2' }, h('div', null, h('div', { className: 'text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300' }, 'Flight-by-flight timeline'), h('div', { className: 'mt-0.5 text-[10px] font-bold text-white' }, 'Temporal order reveals randomness and rare long flights.')), h('div', { className: 'rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-right' }, h('div', { className: 'text-[10px] font-black uppercase tracking-wide text-cyan-200' }, 'Current flight'), h('div', { className: 'font-mono text-xs font-black text-white' }, selectedInfo.currentFreeFlight.toFixed(1) + ' u'))),
                  h('svg', { viewBox: '0 0 240 76', className: 'mt-2 h-[76px] w-full overflow-visible', 'aria-hidden': 'true' },
                    h('line', { x1: 5, y1: 58, x2: 235, y2: 58, stroke: '#67e8f9', strokeWidth: 1, opacity: 0.28 }),
                    h('line', { x1: 5, y1: flightSequenceTheoryY, x2: 235, y2: flightSequenceTheoryY, stroke: '#fde047', strokeWidth: 1.5, strokeDasharray: '4 3', opacity: 0.92 }),
                    recentFlightSequence.length ? recentFlightSequence.map(function (flight, i) { var height = clamp(flight / flightSequenceCeiling, 0, 1) * 48, ratio = flight / Math.max(0.001, currentMeanFreePathTheory), color = ratio > 1.5 ? '#f472b6' : (ratio > 0.75 ? '#a78bfa' : '#22d3ee'); return h('g', { key: i }, h('rect', { x: i * 19 + 8, y: 58 - height, width: 12, height: Math.max(2, height), rx: 3, fill: color, opacity: 0.92 }), h('circle', { cx: i * 19 + 14, cy: 58 - height, r: 2.2, fill: '#ffffff' })); }) : h('text', { x: 120, y: 37, textAnchor: 'middle', fontSize: 9, fill: '#a5f3fc' }, 'Run until the tracer completes its first free flight'),
                    h('text', { x: 6, y: 72, fontSize: 7, fill: '#94a3b8' }, 'older'), h('text', { x: 215, y: 72, fontSize: 7, fill: '#94a3b8' }, 'newer'), h('text', { x: 177, y: Math.max(8, flightSequenceTheoryY - 3), fontSize: 7, fill: '#fde047' }, 'theory mean')
                  ),
                  h('div', { className: 'mt-1 grid grid-cols-3 gap-1.5' }, h('div', { className: 'rounded-lg bg-white/5 p-2' }, h('div', { className: 'text-[10px] font-black uppercase tracking-wide text-cyan-300' }, 'Shortest'), h('div', { className: 'mt-0.5 font-mono text-[10px] font-black' }, recentFlightSequence.length ? flightSequenceShortest.toFixed(1) + ' u' : '--')), h('div', { className: 'rounded-lg bg-white/5 p-2' }, h('div', { className: 'text-[10px] font-black uppercase tracking-wide text-violet-300' }, 'Longest'), h('div', { className: 'mt-0.5 font-mono text-[10px] font-black' }, recentFlightSequence.length ? flightSequenceLongest.toFixed(1) + ' u' : '--')), h('div', { className: 'rounded-lg bg-white/5 p-2' }, h('div', { className: 'text-[10px] font-black uppercase tracking-wide text-fuchsia-300' }, 'Long flights'), h('div', { className: 'mt-0.5 font-mono text-[10px] font-black' }, flightSequenceLongCount + ' above 1.5x'))),
                  h('p', { className: 'mt-2 text-[10px] leading-relaxed text-cyan-100' }, 'A random collision process should look irregular: many short flights can be interrupted by occasional long ones. A trend is not required for the mean to be meaningful.')
                ),
                (activeProtocol === 'mfp' || activeProtocol === 'crosssection') && h('div', { className: 'mt-2 rounded-xl border border-violet-200 bg-gradient-to-br from-white via-violet-50 to-cyan-50 p-3 shadow-sm', role: 'img', 'aria-label': selectedInfo.freeFlightSamples < 3 ? 'Observed versus theory agreement monitor waiting for at least three completed free flights.' : 'Observed versus theory agreement monitor. Observed mean free path ' + selectedInfo.meanFreePath.toFixed(1) + ' model units. Kinetic theory estimate ' + currentMeanFreePathTheory.toFixed(1) + '. Approximate 95 percent uncertainty range ' + mfpConfidenceLow.toFixed(1) + ' to ' + mfpConfidenceHigh.toFixed(1) + '. ' + mfpAgreement.label + '.' },
                  h('div', { className: 'flex flex-wrap items-start justify-between gap-2' }, h('div', null, h('div', { className: 'text-[10px] font-black uppercase tracking-[0.16em] text-violet-800' }, 'Observed vs. kinetic theory'), h('div', { className: 'mt-0.5 text-[10px] font-bold text-slate-800' }, mfpAgreement.note)), h('span', { className: 'rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ' + mfpAgreement.tone }, mfpAgreement.label)),
                  h('div', { className: 'relative mt-5 h-3 rounded-full bg-gradient-to-r from-cyan-200 via-violet-200 to-fuchsia-200 shadow-inner' },
                    h('div', { className: 'absolute inset-y-[-5px] left-1/2 w-0.5 -translate-x-1/2 bg-violet-700' }),
                    selectedInfo.freeFlightSamples > 0 && h('div', { className: 'absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-cyan-700/70', style: { left: mfpCiLowPosition + '%', width: Math.max(1.5, mfpCiHighPosition - mfpCiLowPosition) + '%' } }),
                    selectedInfo.freeFlightSamples > 0 && h('div', { className: 'absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-cyan-700 shadow-[0_0_0_2px_rgba(14,116,144,0.25)]', style: { left: mfpObservedPosition + '%' } })
                  ),
                  h('div', { className: 'mt-1 flex justify-between font-mono text-[10px] text-slate-500' }, h('span', null, '0x theory'), h('span', { className: 'font-black text-violet-800' }, '1x theory'), h('span', null, '2x theory')),
                  h('div', { className: 'mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4' },
                    h('div', { className: 'rounded-lg border border-cyan-100 bg-white/80 p-2' }, h('div', { className: 'text-[10px] font-black uppercase tracking-wide text-cyan-800' }, 'Observed mean'), h('div', { className: 'mt-0.5 font-mono text-xs font-black text-slate-950' }, selectedInfo.freeFlightSamples ? selectedInfo.meanFreePath.toFixed(1) + ' u' : '--')),
                    h('div', { className: 'rounded-lg border border-violet-100 bg-white/80 p-2' }, h('div', { className: 'text-[10px] font-black uppercase tracking-wide text-violet-800' }, 'Theory'), h('div', { className: 'mt-0.5 font-mono text-xs font-black text-slate-950' }, currentMeanFreePathTheory.toFixed(1) + ' u')),
                    h('div', { className: 'rounded-lg border border-indigo-100 bg-white/80 p-2' }, h('div', { className: 'text-[10px] font-black uppercase tracking-wide text-indigo-800' }, 'Approx. 95% range'), h('div', { className: 'mt-0.5 font-mono text-[10px] font-black text-slate-950' }, selectedInfo.freeFlightSamples >= 2 ? mfpConfidenceLow.toFixed(1) + '-' + mfpConfidenceHigh.toFixed(1) + ' u' : '--')),
                    h('div', { className: 'rounded-lg border border-fuchsia-100 bg-white/80 p-2' }, h('div', { className: 'text-[10px] font-black uppercase tracking-wide text-fuchsia-800' }, 'Difference'), h('div', { className: 'mt-0.5 font-mono text-xs font-black text-slate-950' }, selectedInfo.freeFlightSamples ? Math.round(mfpAgreementError * 100) + '%' : '--'))
                  )
                ),
                tracerTrials.length ? h('div', { className: 'mt-2 grid grid-cols-2 gap-2' }, tracerTrials.map(function (walk, i) { return h('div', { key: walk.id, className: 'rounded-lg border border-amber-200 bg-white/80 p-2', 'aria-label': 'Walk ' + (i + 1) + ', species ' + walk.species + ', mean free path ' + walk.meanFreePath.toFixed(1) + ', standard error ' + Number(walk.meanFreePathError || 0).toFixed(1) + ' from ' + Number(walk.freeFlightSamples || walk.particleHits || 0) + ' completed flights, kinetic theory estimate ' + Number(walk.theoreticalMeanFreePath || meanFreePathEstimate(walk.count, walk.boxSize, walk.particleDiameter)).toFixed(1) + ', particle collision diameter ' + Number(walk.particleDiameter || 0.58).toFixed(2) + ', collision rate ' + walk.collisionRate.toFixed(2) + ' per second.' }, h('div', { className: 'flex justify-between text-[10px] font-black text-amber-900' }, h('span', null, 'Walk ' + (i + 1) + ' \u2022 ' + walk.species + '-' + walk.particle), h('span', null, walk.temperature + ' K')), h('div', { className: 'mt-1 font-mono text-xs font-black text-slate-900' }, '\u03BB ' + walk.meanFreePath.toFixed(1) + ' u'), h('div', { className: 'mt-0.5 font-mono text-[10px] text-amber-800' }, 'uncertainty +/- ' + Number(walk.meanFreePathError || 0).toFixed(1) + ' u, n=' + Number(walk.freeFlightSamples || walk.particleHits || 0)), h('div', { className: 'mt-0.5 font-mono text-[10px] text-amber-800' }, 'theory ' + Number(walk.theoreticalMeanFreePath || meanFreePathEstimate(walk.count, walk.boxSize, walk.particleDiameter)).toFixed(1) + ' u'), h('div', { className: 'mt-0.5 font-mono text-[10px] text-slate-600' }, walk.collisionRate.toFixed(2) + ' hits/s \u2022 N ' + walk.count + ' \u2022 V ' + Math.round(Math.pow(walk.boxSize, 3)) + ' \u2022 d ' + Number(walk.particleDiameter || 0.58).toFixed(2))); })) : h('p', { className: 'mt-2 text-[10px] leading-relaxed text-amber-900' }, 'Start a new walk, wait for a particle collision, then use Save walk.'),
                mfpPredictionAvailable && h('div', { className: 'mt-2 overflow-hidden rounded-xl border border-indigo-300 bg-gradient-to-r from-indigo-950 via-violet-950 to-fuchsia-950 p-3 text-white shadow-lg', role: 'img', 'aria-label': (tracerTrials.length === 2 ? 'Kinetic theory prediction check.' : 'Kinetic theory prediction preview.') + ' Changed variable ' + mfpPredictionControl.changedVariable + '. Mean free path is predicted to ' + mfpPredictionDirection + ' from ' + Number(tracerTrials[0].meanFreePath || 0).toFixed(1) + ' to ' + mfpPredictedWalk2.toFixed(1) + ' model units. ' + (tracerTrials.length === 2 ? 'Walk 2 observed value ' + Number(tracerTrials[1].meanFreePath || 0).toFixed(1) + ', prediction error ' + Math.round(mfpPredictionErrorPercent) + ' percent.' : 'Walk 2 has not been saved yet.') },
                  h('div', { className: 'flex flex-wrap items-start justify-between gap-2' }, h('div', null, h('div', { className: 'text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-300' }, tracerTrials.length === 2 ? 'Prediction check' : 'Prediction preview'), h('div', { className: 'mt-0.5 text-[10px] font-bold text-white' }, 'Kinetic theory expects mean free path to ' + mfpPredictionDirection + '.')), h('span', { className: 'rounded-full border border-fuchsia-300/40 bg-fuchsia-300/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-fuchsia-100' }, mfpPredictionControl.changedVariable)),
                  h('div', { className: 'mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2' },
                    h('div', { className: 'rounded-lg border border-white/10 bg-white/5 p-2 text-center' }, h('div', { className: 'text-[10px] font-black uppercase tracking-wide text-indigo-200' }, 'Walk 1 observed'), h('div', { className: 'mt-0.5 font-mono text-lg font-black' }, Number(tracerTrials[0].meanFreePath || 0).toFixed(1)), h('div', { className: 'text-[10px] text-slate-300' }, 'model units')),
                    h('div', { className: 'text-center' }, h('div', { className: 'text-xl font-black text-fuchsia-300', 'aria-hidden': 'true' }, mfpPredictionDirection === 'increase' ? '\u2197' : (mfpPredictionDirection === 'decrease' ? '\u2198' : '\u2192')), h('div', { className: 'mt-0.5 rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] font-black text-fuchsia-100' }, (mfpPredictionDeltaPercent >= 0 ? '+' : '') + mfpPredictionDeltaPercent + '%')),
                    h('div', { className: 'rounded-lg border border-fuchsia-300/30 bg-fuchsia-300/10 p-2 text-center' }, h('div', { className: 'text-[10px] font-black uppercase tracking-wide text-fuchsia-200' }, tracerTrials.length === 2 ? 'Walk 2 observed' : 'Walk 2 predicted'), h('div', { className: 'mt-0.5 font-mono text-lg font-black' }, (tracerTrials.length === 2 ? Number(tracerTrials[1].meanFreePath || 0) : mfpPredictedWalk2).toFixed(1)), h('div', { className: 'text-[10px] text-slate-300' }, tracerTrials.length === 2 ? 'predicted ' + mfpPredictedWalk2.toFixed(1) : 'model units'))
                  ),
                  h('div', { className: 'mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2 text-[10px] leading-relaxed text-indigo-100' }, h('span', null, mfpPredictionControl.changedVariable === 'particle count' || mfpPredictionControl.changedVariable === 'chamber volume' || mfpPredictionControl.changedVariable === 'particle diameter' ? 'Prediction scales Walk 1 by the change in theoretical mean free path.' : 'At fixed number density, this hard-sphere model predicts little mean-free-path change.'), tracerTrials.length === 2 && h('span', { className: 'rounded bg-white/10 px-2 py-1 font-mono font-black text-white' }, Math.round(mfpPredictionErrorPercent) + '% prediction error'))
                ),
                h('p', { className: 'mt-2 text-[10px] leading-relaxed text-amber-900' }, 'Theory uses the hard-sphere kinetic model. Finite walls, membranes, attraction, and short samples can shift the observed value.'),
                tracerComparison && h('div', { className: 'mt-2 rounded-lg bg-amber-950 p-2 text-white', role: 'status', 'aria-label': (tracerComparison.replicate ? 'Repeated conditions comparison.' : (tracerComparison.fair ? 'Fair one-variable tracer comparison. Changed ' + tracerComparison.changedVariable + '.' : 'Confounded tracer comparison. Changed ' + tracerComparison.changed.join(', ') + '.')) + ' Mean free path changed by ' + tracerComparison.meanFreePathDelta.toFixed(1) + ' model units and collision rate changed by ' + tracerComparison.collisionRateDelta.toFixed(2) + ' per second.' },
                  h('div', { className: 'flex items-center justify-between gap-2' }, h('div', { className: 'text-[10px] font-black uppercase tracking-wide text-amber-300' }, 'Walk 2 minus Walk 1'), h('span', { className: 'rounded px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide ' + (tracerComparison.replicate || tracerComparison.fair ? 'bg-emerald-300 text-emerald-950' : 'bg-rose-300 text-rose-950') }, tracerComparison.replicate ? 'replicate' : (tracerComparison.fair ? 'fair test' : 'confounded'))),
                  h('div', { className: 'mt-1 grid grid-cols-2 gap-1 font-mono text-[10px]' }, h('span', null, '\u0394 mean free path ' + (tracerComparison.meanFreePathDelta >= 0 ? '+' : '') + tracerComparison.meanFreePathDelta.toFixed(1)), h('span', null, '\u0394 rate ' + (tracerComparison.collisionRateDelta >= 0 ? '+' : '') + tracerComparison.collisionRateDelta.toFixed(2)), h('span', null, '\u0394 density ' + (tracerComparison.densityDelta >= 0 ? '+' : '') + tracerComparison.densityDelta.toFixed(3)), h('span', null, '\u0394 temp ' + (tracerComparison.temperatureDelta >= 0 ? '+' : '') + tracerComparison.temperatureDelta.toFixed(0) + ' K')),
                  h('p', { className: 'mt-1 text-[10px] leading-relaxed text-amber-100' }, tracerComparison.replicate ? 'Same controlled conditions: use the difference to judge random variation.' : (tracerComparison.fair ? 'Changed only ' + tracerComparison.changedVariable + ': this supports a stronger causal comparison.' : 'Changed variables: ' + tracerComparison.changed.join(', ') + '. Change one condition at a time for a stronger test.'))
                )
              ),
              (activeProtocol === 'settling' || gravity > 0.01) && h('div', { className: 'mt-3 overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-br from-slate-950 via-indigo-950 to-amber-950 p-3 text-white shadow-lg', role: 'region', 'aria-label': 'Vertical density observatory. Current profile from bottom to top. Band populations: ' + heightInfo.bins.map(function (value) { return Math.round(value * 100) + ' percent'; }).join(', ') + '. Center of mass height ' + heightInfo.centerY.toFixed(2) + ' model units. Bottom to top population ratio ' + heightInfo.bottomTopRatio.toFixed(2) + '. Gravity ' + (gravity > 0.01 ? gravity.toFixed(1) + ' model g' : 'off') + '.' },
                h('div', { className: 'flex items-start justify-between gap-2' }, h('div', null, h('div', { className: 'text-[10px] font-black uppercase tracking-[0.17em] text-amber-300' }, 'Vertical density profile'), h('div', { className: 'mt-0.5 text-[10px] text-indigo-100' }, gravity > 0.01 ? 'Watch particles redistribute from top to bottom.' : 'Microgravity baseline should remain roughly uniform.')), h('span', { className: 'rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ' + (gravity > 0.01 ? 'bg-amber-300 text-amber-950' : 'bg-indigo-200 text-indigo-950') }, gravity > 0.01 ? gravity.toFixed(1) + ' g*' : 'baseline')),
                h('svg', { viewBox: '0 0 240 88', className: 'mt-2 h-[88px] w-full', 'aria-hidden': 'true' },
                  h('line', { x1: heightUniformX, y1: 5, x2: heightUniformX, y2: 72, stroke: '#fde047', strokeWidth: 1.3, strokeDasharray: '3 3', opacity: 0.85 }),
                  heightInfo.bins.map(function (value, i) { var width = value / heightProfilePeak * 178, y = 65 - i * 8; return h('g', { key: i }, h('rect', { x: 42, y: y, width: Math.max(2, width), height: 6, rx: 3, fill: i < 3 ? '#fbbf24' : (i < 6 ? '#a78bfa' : '#67e8f9'), opacity: 0.9 }), h('text', { x: 37, y: y + 5, textAnchor: 'end', fontSize: 7, fill: '#cbd5e1' }, Math.round(value * 100) + '%')); }),
                  h('text', { x: 4, y: 70, fontSize: 8, fill: '#fcd34d' }, 'bottom'), h('text', { x: 10, y: 12, fontSize: 8, fill: '#a5f3fc' }, 'top'), h('text', { x: Math.min(200, heightUniformX + 3), y: 84, fontSize: 7, fill: '#fde68a' }, 'uniform reference')
                ),
                h('div', { className: 'mt-1 grid grid-cols-3 gap-1.5 text-center' }, h('div', { className: 'rounded-lg bg-white/5 p-2' }, h('div', { className: 'text-[10px] font-black uppercase tracking-wide text-indigo-200' }, 'Center height'), h('div', { className: 'font-mono text-[10px] font-black' }, (heightInfo.centerY >= 0 ? '+' : '') + heightInfo.centerY.toFixed(2) + ' u')), h('div', { className: 'rounded-lg bg-white/5 p-2' }, h('div', { className: 'text-[10px] font-black uppercase tracking-wide text-amber-200' }, 'Bottom / top'), h('div', { className: 'font-mono text-[10px] font-black' }, heightInfo.bottomTopRatio.toFixed(2) + 'x')), h('div', { className: 'rounded-lg bg-white/5 p-2' }, h('div', { className: 'text-[10px] font-black uppercase tracking-wide text-cyan-200' }, 'Bottom quarter'), h('div', { className: 'font-mono text-[10px] font-black' }, Math.round(heightInfo.bottomFraction * 100) + '%'))),
                h('div', { className: 'mt-3 border-t border-white/10 pt-2' },
                  h('div', { className: 'flex items-center justify-between gap-2' }, h('div', { className: 'text-[10px] font-black uppercase tracking-[0.15em] text-indigo-200' }, 'Gradient evolution'), h('span', { className: 'rounded bg-white/5 px-2 py-1 font-mono text-[10px] text-slate-300' }, gravityTimeline.length + ' samples')),
                  h('div', { className: 'mt-2 grid grid-cols-2 gap-2' },
                    h('div', { className: 'rounded-lg border border-cyan-300/10 bg-white/5 p-2' }, h('div', { className: 'flex justify-between text-[10px] font-black uppercase tracking-wide text-cyan-200' }, h('span', null, 'Center height'), h('span', null, gravityCenterTrend.direction)), h('svg', { viewBox: '0 0 240 64', className: 'mt-1 h-[54px] w-full', role: 'img', 'aria-label': gravityCenters.length > 1 ? 'Center height over time, currently ' + gravityCenterTrend.latest.toFixed(2) + ' model units and ' + gravityCenterTrend.direction + '.' : 'Center height timeline waiting for more samples.' }, gravityCenters.length > 1 ? h('path', { d: sharedScalePath(gravityCenters, gravityCenterMin, gravityCenterMax), fill: 'none', stroke: '#67e8f9', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' }) : h('text', { x: 120, y: 35, textAnchor: 'middle', fontSize: 9, fill: '#a5f3fc' }, 'collecting...')), h('div', { className: 'mt-0.5 flex justify-between font-mono text-[10px] text-slate-400' }, h('span', null, 'start'), h('span', null, (heightInfo.centerY >= 0 ? '+' : '') + heightInfo.centerY.toFixed(2) + ' u'))),
                    h('div', { className: 'rounded-lg border border-amber-300/10 bg-white/5 p-2' }, h('div', { className: 'flex justify-between text-[10px] font-black uppercase tracking-wide text-amber-200' }, h('span', null, 'Bottom / top'), h('span', null, gravityRatioTrend.direction)), h('svg', { viewBox: '0 0 240 64', className: 'mt-1 h-[54px] w-full', role: 'img', 'aria-label': gravityRatios.length > 1 ? 'Bottom to top population ratio over time, currently ' + gravityRatioTrend.latest.toFixed(2) + ' times and ' + gravityRatioTrend.direction + '.' : 'Bottom to top ratio timeline waiting for more samples.' }, gravityRatios.length > 1 ? h('path', { d: sharedScalePath(gravityRatios, 0, gravityRatioMax), fill: 'none', stroke: '#fbbf24', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' }) : h('text', { x: 120, y: 35, textAnchor: 'middle', fontSize: 9, fill: '#fde68a' }, 'collecting...')), h('div', { className: 'mt-0.5 flex justify-between font-mono text-[10px] text-slate-400' }, h('span', null, 'start'), h('span', null, heightInfo.bottomTopRatio.toFixed(2) + 'x')))
                  ),
                  h('div', { className: 'mt-2 rounded-lg border px-2 py-1.5 text-[10px] leading-relaxed ' + (gravityMilestone ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100' : 'border-white/10 bg-white/5 text-indigo-100'), role: 'status', 'aria-live': 'polite' }, gravityMilestone ? 'Gradient milestone reached at ' + Number(gravityMilestone.elapsed || 0).toFixed(1) + ' s when bottom/top reached 1.50x.' : (gravity > 0.01 ? 'Waiting for bottom/top population to reach 1.50x.' : 'Record the baseline, then increase gravity to begin the gradient clock.'))
                )
              ),
              (activeProtocol === 'condense' || attraction > 0.6) && h('div', { className: 'mt-3 overflow-hidden rounded-xl border border-emerald-200 bg-gradient-to-br from-slate-950 via-emerald-950 to-cyan-950 p-3 text-white shadow-lg', role: 'region', 'aria-label': 'Condensation observatory. ' + clusterInfo.clusterCount + ' molecular groups detected using a distance cutoff of ' + clusterInfo.cutoff.toFixed(2) + ' model units. Largest cluster contains ' + clusterInfo.largest + ' particles, or ' + Math.round(clusterInfo.largestFraction * 100) + ' percent of the system. ' + Math.round(clusterInfo.bondedFraction * 100) + ' percent of particles have at least one nearby neighbor. ' + coalescenceEvents.length + ' coalescence events have been detected. Largest cluster trend is ' + clusterTrend.direction + '.' },
                h('div', { className: 'flex flex-wrap items-start justify-between gap-2' }, h('div', null, h('div', { className: 'text-[10px] font-black uppercase tracking-[0.17em] text-emerald-300' }, 'Condensation observatory'), h('div', { className: 'mt-0.5 text-[10px] text-cyan-100' }, 'Watch droplets nucleate and merge.')), h('span', { className: 'rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wide ' + (clusterInfo.largestFraction >= 0.3 ? 'border-emerald-300/40 bg-emerald-300 text-emerald-950' : 'border-white/10 bg-white/5 text-slate-200') }, clusterInfo.largestFraction >= 0.3 ? 'nucleated' : 'molecular vapor')),
                h('div', { className: 'mt-3 grid grid-cols-2 gap-1.5 text-center sm:grid-cols-4' }, [['Largest droplet', clusterInfo.largest + ' particles'], ['Condensed share', Math.round(clusterInfo.largestFraction * 100) + '%'], ['Neighbor bonded', Math.round(clusterInfo.bondedFraction * 100) + '%'], ['Coalescence', coalescenceEvents.length + ' merges']].map(function (item) { return h('div', { key: item[0], className: 'rounded-lg border border-white/10 bg-white/5 p-2' }, h('div', { className: 'text-[10px] font-black uppercase tracking-wide text-emerald-200' }, item[0]), h('div', { className: 'mt-0.5 font-mono text-[10px] font-black text-white' }, item[1])); })),
                h('div', { className: 'mt-3 rounded-lg border border-white/10 bg-white/[0.04] p-2' }, h('div', { className: 'flex justify-between text-[10px] font-black uppercase tracking-wide text-slate-300' }, h('span', null, 'Cluster population'), h('span', null, clusterInfo.clusterCount + ' groups')), h('svg', { viewBox: '0 0 240 70', className: 'mt-1 h-[70px] w-full', role: 'img', 'aria-label': 'Bubble chart of the largest detected molecular clusters. Cluster sizes: ' + clusterInfo.sizes.slice(0, 10).join(', ') + ' particles.' }, clusterInfo.sizes.slice(0, 10).map(function (size, i) { var radius = clamp(Math.sqrt(size) * 3.5, 3, 15), x = 17 + i * 23, y = 35 + (i % 2 ? 11 : -7); return h('g', { key: i }, h('circle', { cx: x, cy: y, r: radius, fill: i === 0 ? '#34d399' : (i < 4 ? '#22d3ee' : '#818cf8'), opacity: 0.35 + Math.min(0.55, size / Math.max(1, clusterInfo.largest) * 0.55), stroke: i === 0 ? '#a7f3d0' : 'rgba(255,255,255,.35)', strokeWidth: 1 }), size > 1 && h('text', { x: x, y: y + 2.5, textAnchor: 'middle', fontSize: 7, fill: '#ffffff' }, size)); }))),
                h('div', { className: 'mt-3 rounded-lg border border-white/10 bg-white/[0.04] p-2' }, h('div', { className: 'flex justify-between text-[10px] font-black uppercase tracking-wide text-slate-300' }, h('span', null, 'Nucleation timeline'), h('span', null, clusterTrend.direction)), h('svg', { viewBox: '0 0 240 64', className: 'mt-1 h-14 w-full', role: 'img', 'aria-label': clusterFractions.length > 1 ? 'Largest cluster fraction over time, currently ' + Math.round(clusterInfo.largestFraction * 100) + ' percent and ' + clusterTrend.direction + '.' : 'Nucleation timeline waiting for more samples.' }, h('line', { x1: 4, y1: 56 - 0.3 * 48, x2: 236, y2: 56 - 0.3 * 48, stroke: '#fde68a', strokeWidth: 1, strokeDasharray: '4 3' }), clusterFractions.length > 1 ? h('g', null, h('path', { d: percentPath(clusterFractions), fill: 'none', stroke: '#34d399', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' }), clusterTimeline.map(function (sample, i) { if (!sample.clusterMerge) return null; var x = 4 + i / Math.max(1, clusterTimeline.length - 1) * 232, y = 56 - clamp(Number(sample.clusterFraction) || 0, 0, 1) * 48; return h('circle', { key: i, cx: x, cy: y, r: 4, fill: '#fde68a', stroke: '#064e3b', strokeWidth: 1.5 }); })) : h('text', { x: 120, y: 35, textAnchor: 'middle', fontSize: 9, fill: '#a7f3d0' }, 'collecting cluster evidence...')), h('div', { className: 'mt-1 flex justify-between text-[10px] text-slate-400' }, h('span', null, 'vapor'), h('span', { className: 'text-yellow-100' }, '30% nucleation marker'), h('span', null, 'droplet'))),
                h('div', { className: 'mt-2 rounded-lg border px-2 py-1.5 text-[10px] leading-relaxed ' + (clusterMilestone ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100' : 'border-white/10 bg-white/5 text-cyan-100'), role: 'status', 'aria-live': 'polite' }, lastCoalescence ? 'Coalescence detected at ' + Number(lastCoalescence.elapsed || 0).toFixed(1) + ' seconds as smaller groups merged into a larger droplet.' : (clusterMilestone ? 'Nucleation milestone reached at ' + Number(clusterMilestone.elapsed || 0).toFixed(1) + ' seconds.' : 'Increase attraction or reduce temperature, then watch small groups merge into a persistent droplet.')),
                h('p', { className: 'mt-2 text-[10px] leading-relaxed text-slate-400' }, 'Model note: clusters are connected groups whose centers fall within ' + clusterInfo.cutoff.toFixed(2) + ' model units; this is an educational proximity criterion, not a molecular phase boundary.')
              ),              wallSensors && h('div', { className: 'mt-3 rounded-xl border border-indigo-200 bg-gradient-to-br from-slate-950 to-indigo-950 p-3 text-white', role: 'img', 'aria-label': 'Relative wall impact map. Top ' + Math.round(wallFaceInfo['y+'] * 100) + ' percent, bottom ' + Math.round(wallFaceInfo['y-'] * 100) + ' percent, left ' + Math.round(wallFaceInfo['x-'] * 100) + ' percent, right ' + Math.round(wallFaceInfo['x+'] * 100) + ' percent, front ' + Math.round(wallFaceInfo['z+'] * 100) + ' percent, back ' + Math.round(wallFaceInfo['z-'] * 100) + ' percent.' },
                h('div', { className: 'flex items-center justify-between' }, h('div', null, h('div', { className: 'text-[10px] font-black uppercase tracking-[0.15em] text-indigo-300' }, 'Six-face pressure map'), h('div', { className: 'mt-0.5 text-[10px] text-slate-400' }, 'Relative recent impact load')), h('span', { className: 'h-2 w-2 rounded-sm bg-indigo-300 shadow-[0_0_10px_rgba(165,180,252,0.9)]' })),
                h('div', { className: 'mt-3 grid grid-cols-4 grid-rows-3 gap-1.5' }, pressureFaceCells.map(function (face) { var load = wallFaceInfo[face.key] || 0, hot = load > 0.52; return h('div', { key: face.key, className: face.cls + ' flex min-h-[42px] flex-col items-center justify-center rounded-lg border border-white/10 transition-colors', style: { backgroundColor: 'rgba(129,140,248,' + (0.08 + load * 0.72).toFixed(2) + ')' } }, h('span', { className: 'text-[10px] font-black uppercase tracking-wide ' + (hot ? 'text-white' : 'text-indigo-200') }, face.label), h('span', { className: 'mt-0.5 font-mono text-xs font-black' }, Math.round(load * 100) + '%')); }))
              ),
              h('div', { className: 'mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3' },
                h('div', { className: 'flex items-center justify-between gap-2' }, h('div', null, h('div', { className: 'text-[10px] font-black uppercase tracking-[0.14em] text-slate-500' }, transportMode ? 'Species speed observatory' : 'Particle speed distribution'), h('div', { className: 'mt-0.5 text-xs font-black ' + kineticRegime().tone }, kineticRegime().label)), h('div', { className: 'text-right font-mono text-[10px] text-slate-500' }, transportMode ? h(React.Fragment, null, h('div', { className: 'text-cyan-700' }, 'A mean ' + speciesMotion.a.mean.toFixed(2)), h('div', { className: 'text-fuchsia-700' }, 'B mean ' + speciesMotion.b.mean.toFixed(2))) : h(React.Fragment, null, h('div', null, 'mean ' + distribution.mean.toFixed(2)), h('div', null, 'p90 ' + distribution.p90.toFixed(2))))),
                h('svg', { viewBox: '0 0 240 72', className: 'mt-2 h-[72px] w-full overflow-visible', role: 'img', 'aria-label': transportMode ? 'Paired histogram of particle A and B speeds. A mean speed ' + speciesMotion.a.mean.toFixed(2) + ' and effective temperature ' + speciesMotion.a.temperature + ' kelvin. B mean speed ' + speciesMotion.b.mean.toFixed(2) + ' and effective temperature ' + speciesMotion.b.temperature + ' kelvin.' : 'Histogram of current particle speeds. Mean speed ' + distribution.mean.toFixed(2) + ', ninetieth percentile ' + distribution.p90.toFixed(2) + '.' },
                  h('defs', null, h('linearGradient', { id: 'particleSpeedGradient', x1: '0%', x2: '100%' }, h('stop', { offset: '0%', stopColor: '#22d3ee' }), h('stop', { offset: '55%', stopColor: '#818cf8' }), h('stop', { offset: '100%', stopColor: '#fb7185' }))),
                  transportMode ? speciesMotion.a.bins.map(function (value, i) { var allFractions = speciesMotion.a.bins.concat(speciesMotion.b.bins).concat([0.01]), peak = Math.max.apply(Math, allFractions), heightA = value / peak * 50, heightB = speciesMotion.b.bins[i] / peak * 50; return h('g', { key: i }, h('rect', { x: i * 20 + 3, y: 58 - heightA, width: 6, height: Math.max(1, heightA), rx: 2, fill: '#22d3ee', opacity: 0.9 }), h('rect', { x: i * 20 + 10, y: 58 - heightB, width: 6, height: Math.max(1, heightB), rx: 2, fill: '#f472b6', opacity: 0.86 })); }) : distribution.bins.map(function (value, i) { var peak = Math.max.apply(Math, distribution.bins.concat([1])), height = value / peak * 52; return h('rect', { key: i, x: i * 20 + 3, y: 58 - height, width: 14, height: Math.max(1, height), rx: 3, fill: 'url(#particleSpeedGradient)', opacity: 0.88 }); }),
                  h('line', { x1: 0, y1: 59, x2: 240, y2: 59, stroke: '#cbd5e1', strokeWidth: 1 }), h('text', { x: 2, y: 70, fontSize: 8, fill: '#64748b' }, 'slower'), h('text', { x: 215, y: 70, fontSize: 8, fill: '#64748b' }, 'faster')
                ),
                transportMode && h('div', { className: 'mt-2 grid grid-cols-2 gap-2', role: 'group', 'aria-label': 'Species kinetic temperature comparison' }, h('div', { className: 'rounded-lg border border-cyan-200 bg-cyan-50 p-2' }, h('div', { className: 'text-[10px] font-black uppercase tracking-wide text-cyan-800' }, 'A kinetic temperature'), h('div', { className: 'mt-0.5 font-mono text-sm font-black text-cyan-950' }, speciesMotion.a.temperature + ' K')), h('div', { className: 'rounded-lg border border-fuchsia-200 bg-fuchsia-50 p-2' }, h('div', { className: 'text-[10px] font-black uppercase tracking-wide text-fuchsia-800' }, 'B kinetic temperature'), h('div', { className: 'mt-0.5 font-mono text-sm font-black text-fuchsia-950' }, speciesMotion.b.temperature + ' K'))),
                transportMode && h('div', { className: 'mt-2 rounded-lg border border-slate-200 bg-white p-2' },
                  h('div', { className: 'flex flex-wrap items-center justify-between gap-2' }, h('div', null, h('div', { className: 'text-[10px] font-black uppercase tracking-wide text-slate-500' }, 'Thermalization experiment'), h('div', { className: 'font-mono text-[10px] font-black ' + (thermalGapPercent <= 10 ? 'text-emerald-700' : 'text-amber-700'), role: 'status', 'aria-live': 'polite' }, thermalGapPercent <= 10 ? 'Near equilibrium' : thermalGapPercent + '% temperature gap')), h('div', { className: 'flex gap-1' }, h('button', { type: 'button', onClick: function () { pulseSpeciesHeat(1, 1.8); }, className: 'rounded-md bg-fuchsia-600 px-2 py-1 text-[10px] font-black text-white hover:bg-fuchsia-500', 'aria-label': 'Apply a heat pulse that raises particle B kinetic temperature by eighty percent' }, 'Heat B +80%'), h('button', { type: 'button', onClick: function () { pulseSpeciesHeat(1, 0.55); }, className: 'rounded-md bg-cyan-700 px-2 py-1 text-[10px] font-black text-white hover:bg-cyan-600', 'aria-label': 'Apply a cooling pulse that lowers particle B kinetic temperature by forty-five percent' }, 'Cool B -45%'))),
                  h('svg', { viewBox: '0 0 240 64', className: 'mt-2 h-14 w-full', role: 'img', 'aria-label': 'Recent species temperature traces. Particle A is ' + speciesMotion.a.temperature + ' kelvin and particle B is ' + speciesMotion.b.temperature + ' kelvin. The temperature gap is ' + thermalGapPercent + ' percent.' },
                    h('line', { x1: 4, y1: 56, x2: 236, y2: 56, stroke: '#cbd5e1', strokeWidth: 1 }),
                    h('path', { d: sharedScalePath(thermalA, thermalMin, thermalMax), fill: 'none', stroke: '#0891b2', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' }),
                    h('path', { d: sharedScalePath(thermalB, thermalMin, thermalMax), fill: 'none', stroke: '#db2777', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' })
                  ),
                  h('div', { className: 'flex justify-between font-mono text-[10px] text-slate-500' }, h('span', null, 'cyan A'), h('span', null, thermalTimeline.length < 2 ? 'Apply a pulse to begin' : 'collisional energy exchange'), h('span', null, 'pink B'))
                ),
                h('div', { className: 'mt-2' }, h('div', { className: 'relative h-2 overflow-hidden rounded-full bg-gradient-to-r from-sky-400 via-violet-500 to-rose-500' }, h('span', { className: 'absolute top-1/2 h-4 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-slate-950 shadow', style: { left: clamp((stats.temperature - 40) / 860 * 100, 0, 100) + '%' } })), h('p', { className: 'mt-1 text-[10px] leading-relaxed text-slate-500' }, transportMode ? 'Equal temperature means equal average kinetic energy, not equal speed. Pulse one species, then watch collisions redistribute energy.' : kineticRegime().note))
              ),
              h('div', { className: 'mt-3 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 p-3 text-white shadow-[0_12px_30px_rgba(15,23,42,0.22)]' },
                h('div', { className: 'flex items-center justify-between gap-3' }, h('div', null, h('div', { className: 'text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300' }, 'Live telemetry array'), h('div', { className: 'mt-0.5 text-[10px] text-slate-400' }, 'Recent 14-second signal window')), h('div', { className: 'flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300' }, h('span', { className: 'relative flex h-2 w-2' }, h('span', { className: 'absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-50' }), h('span', { className: 'relative inline-flex h-2 w-2 rounded-full bg-emerald-300' })), running ? 'Streaming' : 'Paused')),
                h('div', { className: 'mt-3 grid grid-cols-2 gap-2' }, telemetrySeries.map(function (metric) {
                  var trendSymbol = metric.trend.direction === 'rising' ? '\u2197' : metric.trend.direction === 'falling' ? '\u2198' : '\u2192';
                  var path = graphPath(metric.values), lastX = metric.values.length > 1 ? 240 : 0;
                  var span = Math.max(1, metric.trend.max - metric.trend.min), lastY = 56 - (metric.current - metric.trend.min) / span * 48;
                  lastY = clamp(lastY, 8, 56);
                  return h('div', { key: metric.key, className: 'relative overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] p-2', style: { boxShadow: 'inset 0 0 24px ' + metric.glow } },
                    h('div', { className: 'flex items-start justify-between gap-1' }, h('div', null, h('div', { className: 'text-[10px] font-black uppercase tracking-[0.12em] text-slate-400' }, metric.short), h('div', { className: 'mt-0.5 font-mono text-sm font-black text-white' }, metric.current.toFixed(metric.decimals), h('span', { className: 'ml-1 text-[10px] font-bold text-slate-400' }, metric.unit))), h('span', { className: 'font-mono text-[10px] font-black', style: { color: metric.color }, 'aria-label': metric.trend.direction }, trendSymbol + ' ' + metric.trend.direction)),
                    h('svg', { viewBox: '0 0 240 64', className: 'mt-1 h-12 w-full overflow-visible', role: 'img', 'aria-label': metric.label + ' is ' + metric.trend.direction + '. Current value ' + metric.current.toFixed(metric.decimals) + ' ' + metric.unit + '.' },
                      h('line', { x1: 0, y1: 16, x2: 240, y2: 16, stroke: 'rgba(148,163,184,0.12)', strokeWidth: 1 }), h('line', { x1: 0, y1: 40, x2: 240, y2: 40, stroke: 'rgba(148,163,184,0.12)', strokeWidth: 1 }),
                      h('path', { d: path, fill: 'none', stroke: metric.color, strokeWidth: 7, opacity: 0.12, vectorEffect: 'non-scaling-stroke' }),
                      h('path', { d: path, fill: 'none', stroke: metric.color, strokeWidth: 2.25, strokeLinecap: 'round', strokeLinejoin: 'round', vectorEffect: 'non-scaling-stroke' }),
                      metric.values.length > 1 && h('circle', { cx: lastX, cy: lastY, r: 3.5, fill: metric.color, stroke: '#0f172a', strokeWidth: 2, vectorEffect: 'non-scaling-stroke' })
                    )
                  );
                }))
              ),
              h('p', { role: 'status', 'aria-live': 'polite', className: 'mt-3 rounded-lg bg-cyan-50 p-2 text-xs leading-relaxed text-cyan-950' }, modelSummary()),
              h('button', { type: 'button', onClick: recordTrial, disabled: transportMode && membrane && !selectivityAssay.ready, className: 'mt-3 w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45', 'aria-label': transportMode && membrane && !selectivityAssay.ready ? 'Record trial unavailable until both species have at least five membrane encounters' : 'Record this trial' }, transportMode && membrane && !selectivityAssay.ready ? 'Collect membrane evidence ' + Math.min(selectivityAssay.attemptsA, selectivityAssay.attemptsB) + '/5' : '\uD83D\uDCCC Record this trial'),
              trials.length > 0 && h('div', { className: 'mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1' }, trials.map(function (trial, i) { return h('button', { key: trial.id, type: 'button', onClick: function () { restoreTrial(trial); }, className: 'rounded-xl border border-slate-200 bg-white p-3 text-left text-[11px] transition hover:border-cyan-400 hover:shadow-sm', 'aria-label': 'Restore Trial ' + (i + 1) + ' conditions' }, h('div', { className: 'flex items-center justify-between' }, h('strong', { className: 'text-cyan-700' }, 'Trial ' + (i + 1)), h('span', { className: 'text-[10px] font-black uppercase tracking-wide text-slate-400' }, '\u21BA Restore')), h('div', { className: 'mt-1 font-mono text-slate-700' }, trial.temperature + ' K \u2022 P ' + trial.pressure + ' \u2022 N ' + trial.count), h('div', { className: 'mt-1 text-slate-500' }, 'Volume ' + Math.round(trial.boxSize * trial.boxSize * trial.boxSize) + ' u\u00B3 \u2022 attraction ' + Number(trial.attraction || 0).toFixed(2) + ' \u2022 gravity ' + Number(trial.gravity || 0).toFixed(1) + ' g*' + (isTransportPreset(trial.preset) ? ' \u2022 mB ' + Number(trial.massRatioB || 1).toFixed(1) + '\u00d7 \u2022 ' + (trial.membraneSelectivity || 'both') + ' membrane \u2022 ' + (trial.preset === 'osmosis' ? 'osm ' + (Number(trial.osmoticShift || 0) >= 0 ? '+' : '') + Math.round(Number(trial.osmoticShift || 0) * 100) + '%' : 'mix ' + Math.round(Number(trial.mixing || 0) * 100) + '%') + (trial.membrane ? ' \u2022 A/B transmit ' + Math.round(Number(trial.transmissionA || 0) * 100) + '/' + Math.round(Number(trial.transmissionB || 0) * 100) + '% \u2022 separation ' + Number(trial.separation || 0).toFixed(1) + 'x' : '') : ''))); })),
              trialComparison && h('div', { className: 'mt-3 overflow-hidden rounded-xl border ' + (trialComparison.fair ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50') },
                h('div', { className: 'flex items-center justify-between gap-2 px-3 py-2 ' + (trialComparison.fair ? 'bg-emerald-100/70' : 'bg-amber-100/70') }, h('strong', { className: 'text-xs ' + (trialComparison.fair ? 'text-emerald-900' : 'text-amber-900') }, trialComparison.fair ? '\u2713 Fair one-variable test' : '\u26A0 Confounded comparison'), h('span', { className: 'text-[10px] font-black uppercase tracking-wide text-slate-600' }, trialComparison.fair ? 'Changed: ' + trialComparison.changedVariable : trialComparison.changed.length + ' variables changed')),
                h('div', { className: 'grid grid-cols-2 gap-px bg-white/70 p-px text-center' }, ([['\u0394 Temp', trialComparison.temperatureDelta.toFixed(0) + ' K'], ['\u0394 Pressure', trialComparison.pressureDelta.toFixed(1)], ['\u0394 Count', (trialComparison.countDelta > 0 ? '+' : '') + trialComparison.countDelta], ['\u0394 Volume', (trialComparison.volumeDelta > 0 ? '+' : '') + trialComparison.volumeDelta + ' u\u00B3']].concat(activeProtocol === 'settling' ? [['\u0394 Center Y', (trialComparison.heightDelta >= 0 ? '+' : '') + trialComparison.heightDelta.toFixed(2) + ' u'], ['\u0394 Bottom/top', (trialComparison.heightRatioDelta >= 0 ? '+' : '') + trialComparison.heightRatioDelta.toFixed(2) + 'x']] : []).concat(trials[0].membrane && trials[1].membrane ? [['\u0394 A transmit', (trialComparison.transmissionADelta >= 0 ? '+' : '') + Math.round(trialComparison.transmissionADelta * 100) + '%'], ['\u0394 B transmit', (trialComparison.transmissionBDelta >= 0 ? '+' : '') + Math.round(trialComparison.transmissionBDelta * 100) + '%'], ['\u0394 Separation', (trialComparison.separationDelta >= 0 ? '+' : '') + trialComparison.separationDelta.toFixed(2) + 'x'], ['95% distinct?', trialComparison.selectivityDistinctA || trialComparison.selectivityDistinctB ? 'yes' : 'not yet']] : [])).map(function (item) { return h('div', { key: item[0], className: 'bg-white/80 p-2' }, h('div', { className: 'text-[10px] font-bold uppercase text-slate-500' }, item[0]), h('div', { className: 'font-mono text-xs font-black text-slate-900' }, item[1])); })),
                !trialComparison.fair && h('p', { className: 'px-3 py-2 text-[10px] leading-relaxed text-amber-900' }, 'Changed variables: ' + trialComparison.changed.join(', ') + '. Change only one input to make a stronger causal claim.')
              )
            ),
            h('div', { className: 'rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-indigo-50 p-4 text-sm text-slate-700' },
              h('div', { className: 'flex items-center justify-between gap-2' }, h('h3', { className: 'font-black text-cyan-950' }, currentProtocol ? currentProtocol.icon + ' ' + currentProtocol.title : 'Investigation prompt'), currentProtocol && h('span', { className: 'rounded-full bg-white px-2 py-1 text-[10px] font-black uppercase tracking-wide text-indigo-700 shadow-sm' }, currentProtocol.law)),
              h('p', { className: 'mt-2 leading-relaxed' }, currentProtocol ? currentProtocol.prompt : (preset === 'diffusion' ? 'Predict: Will raising temperature make the two colors mix faster? What measurement or visual evidence would support your answer?' : (preset === 'osmosis' ? 'Predict: Which direction will solvent A move, and how will membrane permeability affect solute leakage?' : 'Predict: If temperature rises while the box stays the same size, what will happen to wall collisions and pressure? Run two trials and compare.'))),
              currentProtocol && h('div', { className: 'mt-3 rounded-xl border border-white bg-white/80 p-3 text-xs' }, h('strong', { className: 'text-indigo-800' }, 'Evidence target: '), currentProtocol.watch)
            ),
            h('button', { type: 'button', onClick: openMoleculeLab, className: 'w-full rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-left text-sm font-black text-indigo-900 hover:bg-indigo-100' }, '\u269B\uFE0F Inspect atoms and molecules in Molecule Lab \u2192')
          )
        ),
        h('section', { className: 'overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-white via-indigo-50/40 to-cyan-50/60 shadow-sm', 'aria-labelledby': 'particle-notebook-title' },
          h('div', { className: 'flex flex-wrap items-center justify-between gap-3 border-b border-indigo-100 bg-white/70 px-5 py-4' },
            h('div', null, h('p', { className: 'text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600' }, 'Scientific notebook'), h('h3', { id: 'particle-notebook-title', className: 'text-lg font-black text-slate-950' }, 'Predict \u2192 Observe \u2192 Explain')),
            h('div', { className: 'flex items-center gap-2 text-[10px] font-black uppercase tracking-wide' },
              h('span', { className: 'rounded-full px-2 py-1 ' + (prediction.trim() ? 'bg-cyan-100 text-cyan-800' : 'bg-slate-100 text-slate-400') }, prediction.trim() ? '\u2713 Prediction' : '1 Prediction'),
              h('span', { className: 'rounded-full px-2 py-1 ' + (observation.trim() ? 'bg-violet-100 text-violet-800' : 'bg-slate-100 text-slate-400') }, observation.trim() ? '\u2713 Observation' : '2 Observation'),
              h('span', { className: 'rounded-full px-2 py-1 ' + (conclusion.trim().length >= 20 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400') }, conclusion.trim().length >= 20 ? '\u2713 Conclusion' : '3 Conclusion')
            )
          ),
          h('div', { className: 'grid gap-0 lg:grid-cols-3' },
            h('label', { className: 'block border-b border-indigo-100 p-5 lg:border-b-0 lg:border-r' }, h('span', { className: 'flex items-center gap-2 text-sm font-black text-cyan-900' }, h('span', { className: 'flex h-7 w-7 items-center justify-center rounded-full bg-cyan-100' }, '1'), 'Predict'), h('span', { className: 'mt-2 block text-xs leading-relaxed text-slate-600' }, currentProtocol ? 'Before running: ' + currentProtocol.prompt.split('.')[0] + '.' : 'Before changing a variable, state what you think will happen and why.'), h('textarea', { value: prediction, onChange: function (e) { updateNotebook('prediction', e.target.value); }, rows: 5, maxLength: 800, placeholder: 'I predict that... because...', className: 'mt-3 w-full resize-y rounded-xl border border-cyan-200 bg-white p-3 text-sm text-slate-800 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100' })),
            h('label', { className: 'block border-b border-indigo-100 p-5 lg:border-b-0 lg:border-r' }, h('span', { className: 'flex items-center gap-2 text-sm font-black text-violet-900' }, h('span', { className: 'flex h-7 w-7 items-center justify-center rounded-full bg-violet-100' }, '2'), 'Observe'), h('span', { className: 'mt-2 block text-xs leading-relaxed text-slate-600' }, 'Describe visible motion and cite at least one measurement from the chamber.'), h('textarea', { value: observation, onChange: function (e) { updateNotebook('observation', e.target.value); }, rows: 5, maxLength: 800, placeholder: 'I observed... The measurement changed from... to...', className: 'mt-3 w-full resize-y rounded-xl border border-violet-200 bg-white p-3 text-sm text-slate-800 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100' })),
            h('label', { className: 'block p-5' }, h('span', { className: 'flex items-center gap-2 text-sm font-black text-emerald-900' }, h('span', { className: 'flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100' }, '3'), 'Explain'), h('span', { className: 'mt-2 block text-xs leading-relaxed text-slate-600' }, 'Connect the particle behavior to your evidence. State whether your prediction was supported.'), h('textarea', { value: conclusion, onChange: function (e) { updateNotebook('conclusion', e.target.value); }, rows: 5, maxLength: 1000, placeholder: 'My prediction was supported/not supported because...', className: 'mt-3 w-full resize-y rounded-xl border border-emerald-200 bg-white p-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100' }))
          ),
          coachFeedback && h('div', { className: 'border-t border-indigo-100 bg-indigo-950 px-5 py-4 text-white', role: 'status', 'aria-live': 'polite' }, h('div', { className: 'flex items-start gap-3' }, h('span', { className: 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-300 to-violet-400 text-lg text-slate-950 shadow-lg' }, '\u2728'), h('div', null, h('div', { className: 'text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300' }, ctx.aiHintsEnabled ? 'Socratic lab coach' : 'Built-in lab coach'), h('p', { className: 'mt-1 max-w-4xl text-sm leading-relaxed text-indigo-50' }, coachFeedback)))),
          h('div', { className: 'flex flex-wrap items-center justify-between gap-3 border-t border-indigo-100 bg-slate-950 px-5 py-4 text-white' },
            h('div', null, h('div', { className: 'text-xs text-slate-300' }, h('strong', { className: 'text-cyan-300' }, trials.length + ' trial' + (trials.length === 1 ? '' : 's') + ' recorded'), ' \u2022 ', conclusion.trim().length, ' conclusion characters'), h('div', { className: 'mt-1 text-[10px] text-slate-500' }, ctx.aiHintsEnabled ? 'Notebook text is sent to the coach only when you press Ask lab coach.' : 'AI hints are off; Ask lab coach uses built-in prompts and sends nothing.')),
            h('div', { className: 'flex flex-wrap gap-2' }, h('button', { type: 'button', onClick: requestLabCoach, disabled: isCoaching, className: 'rounded-xl border border-violet-400/40 bg-violet-500/20 px-4 py-2 text-xs font-black text-violet-100 hover:bg-violet-500/30 disabled:cursor-wait disabled:opacity-60' }, isCoaching ? '\u2728 Coach is thinking\u2026' : '\u2728 Ask lab coach'), h('button', { type: 'button', onClick: copyLabReport, className: 'rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-400 px-4 py-2 text-xs font-black text-slate-950 shadow-lg hover:from-cyan-300 hover:to-indigo-300' }, '\uD83D\uDCCB Copy complete lab report'))
          )
        )
      );
    }
  });
})();
