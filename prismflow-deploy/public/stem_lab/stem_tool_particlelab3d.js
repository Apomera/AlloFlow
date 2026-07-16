// AlloFlow STEM Lab — Particle Lab 3D
// Deterministic, educational particle sandbox for states of matter, gas laws,
// diffusion, collisions, and intermolecular attraction.
(function () {
  'use strict';

  if (!window.StemLab || typeof window.StemLab.registerTool !== 'function') return;
  if (window.StemLab.isRegistered && window.StemLab.isRegistered('particleLab3d')) return;

  var THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  var ORBIT_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';

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
    var radius = 0.29;
    var collisions = 0;
    var impulse = 0;
    var events = [];
    var membranePassed = 0, membraneBlocked = 0, membranePassedA = 0, membranePassedB = 0;
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
        if (transitSignal > effectivePermeability) { p.x = previousX < 0 ? -radius : radius; p.vx = previousX < 0 ? -Math.abs(p.vx) : Math.abs(p.vx); membraneBlocked += 1; p.membraneHits = (p.membraneHits || 0) + 1; }
        else { p.membraneGate = ((p.membraneGate || 0) + 0.61803398875) % 1; membranePassed += 1; if (p.type) membranePassedB += 1; else membranePassedA += 1; }
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
            collisions += 1; [a, b].forEach(function (particle) { var flight = Math.max(0, Number(particle.distanceSinceParticleHit) || 0); if (flight > 0) { if (!Array.isArray(particle.freeFlights)) particle.freeFlights = []; particle.freeFlights.push(flight); if (particle.freeFlights.length > 32) particle.freeFlights.shift(); } particle.distanceSinceParticleHit = 0; }); a.particleHits = (a.particleHits || 0) + 1; b.particleHits = (b.particleHits || 0) + 1;
            if (events.length < 8) events.push({ kind: 'particle', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2, power: Math.abs(rel) });
          }
        }
      }
    }
    return { collisions: collisions, impulse: impulse, events: events, membranePassed: membranePassed, membraneBlocked: membraneBlocked, membranePassedA: membranePassedA, membranePassedB: membranePassedB };
  }

  function meanFreePathEstimate(particleCount, boxSize, particleDiameter) {
    var count = Math.max(1, (Number(particleCount) || 1) - 1), volume = Math.pow(Math.max(0.1, Number(boxSize) || 1), 3), diameter = Math.max(0.01, Number(particleDiameter) || 0.58);
    return volume / (Math.sqrt(2) * count * Math.PI * diameter * diameter);
  }

  function particleJourney(particle) {
    if (!particle) return { pathLength: 0, displacement: 0, efficiency: 0, journeyTime: 0, meanFreePath: 0, meanFreePathError: 0, relativeUncertainty: 0, freeFlightSamples: 0, currentFreeFlight: 0, collisionRate: 0, wallHits: 0, particleHits: 0, membraneHits: 0 };
    var dx = particle.x - particle.homeX, dy = particle.y - particle.homeY, dz = particle.z - particle.homeZ, displacement = Math.sqrt(dx * dx + dy * dy + dz * dz), pathLength = Math.max(0, Number(particle.pathLength) || 0), journeyTime = Math.max(0, Number(particle.journeyTime) || 0), particleHits = Number(particle.particleHits) || 0, flights = Array.isArray(particle.freeFlights) ? particle.freeFlights.filter(function (value) { return Number.isFinite(value) && value >= 0; }) : [];
    var meanFreePath = flights.length ? flights.reduce(function (sum, value) { return sum + value; }, 0) / flights.length : Math.max(0, Number(particle.distanceSinceParticleHit) || pathLength), variance = flights.length > 1 ? flights.reduce(function (sum, value) { var delta = value - meanFreePath; return sum + delta * delta; }, 0) / (flights.length - 1) : 0, standardError = flights.length ? Math.sqrt(variance / flights.length) : 0;
    return { pathLength: pathLength, displacement: displacement, efficiency: pathLength > 0 ? clamp(displacement / pathLength, 0, 1) : 0, journeyTime: journeyTime, meanFreePath: meanFreePath, meanFreePathError: standardError, relativeUncertainty: meanFreePath > 0 ? standardError / meanFreePath : 0, freeFlightSamples: flights.length, currentFreeFlight: Math.max(0, Number(particle.distanceSinceParticleHit) || 0), collisionRate: journeyTime > 0 ? particleHits / journeyTime : 0, wallHits: Number(particle.wallHits) || 0, particleHits: particleHits, membraneHits: Number(particle.membraneHits) || 0 };
  }

  function systemMoments(particles) {
    var n = particles.length || 1, x = 0, y = 0, z = 0, vx = 0, vy = 0, vz = 0;
    particles.forEach(function (p) { x += p.x; y += p.y; z += p.z; vx += p.vx; vy += p.vy; vz += p.vz; }); x /= n; y /= n; z /= n; vx /= n; vy /= n; vz /= n;
    var spread2 = 0; particles.forEach(function (p) { var dx = p.x - x, dy = p.y - y, dz = p.z - z; spread2 += dx * dx + dy * dy + dz * dz; });
    var spread = Math.sqrt(spread2 / n), occupiedVolume = 4 / 3 * Math.PI * Math.pow(Math.max(0.15, spread), 3);
    return { x: x, y: y, z: z, vx: vx, vy: vy, vz: vz, spread: spread, density: n / occupiedVolume, drift: Math.sqrt(vx * vx + vy * vy + vz * vz) };
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
    return { mixing: clamp(1 - Math.abs(leftAFraction - rightAFraction), 0, 1), entropy: clamp(entropy, 0, 1), msd: msdSum / total, msdA: msdA / Math.max(1, countA), msdB: msdB / Math.max(1, countB), exchange: (rightA + leftB) / total, leftA: leftAFraction, rightA: rightAFraction, leftCount: leftN, rightCount: rightN, profileA: profileA, profileTotal: profileTotal, centerA: { x: ax, y: ay, z: az }, centerB: { x: bx, y: by, z: bz }, spreadA: Math.sqrt(spreadA2 / Math.max(1, countA)), spreadB: Math.sqrt(spreadB2 / Math.max(1, countB)), solventRight: countA ? rightA / countA : 0, osmoticShift: (countA ? rightA / countA : 0) - 0.5, soluteLeak: countB ? leftB / countB : 0 };
  }
  function compareTrials(first, second) {
    if (!first || !second) return null;
    var t1 = first.temperatureSetpoint == null ? first.temperature : first.temperatureSetpoint, t2 = second.temperatureSetpoint == null ? second.temperature : second.temperatureSetpoint;
    var changed = [];
    if (t1 !== t2) changed.push('temperature'); if (first.count !== second.count) changed.push('particle count'); if (first.boxSize !== second.boxSize) changed.push('volume');
    if (Math.abs((first.attraction || 0) - (second.attraction || 0)) > 0.0001) changed.push('attraction'); if (Math.abs((first.gravity || 0) - (second.gravity || 0)) > 0.0001) changed.push('gravity field'); if (!!first.membrane !== !!second.membrane) changed.push('membrane'); if (Math.abs((first.permeability || 0) - (second.permeability || 0)) > 0.0001) changed.push('membrane permeability'); if ((first.membraneSelectivity || 'both') !== (second.membraneSelectivity || 'both')) changed.push('membrane preference'); if (Math.abs((first.massRatioB || 1) - (second.massRatioB || 1)) > 0.0001) changed.push('particle B mass'); if ((first.preset || '') !== (second.preset || '')) changed.push('particle model');
    return { changed: changed, fair: changed.length === 1, temperatureDelta: second.temperature - first.temperature, pressureDelta: second.pressure - first.pressure, countDelta: second.count - first.count, volumeDelta: Math.round(Math.pow(second.boxSize, 3) - Math.pow(first.boxSize, 3)), changedVariable: changed.length === 1 ? changed[0] : '' };
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

  function speedHeat(speed, temperature) {
    var reference = Math.max(0.5, Math.sqrt(Math.max(1, temperature) / 120) * 2.2);
    return clamp(Number(speed) / reference, 0, 1);
  }

  window.__alloParticleLabPure = { seeded: seeded, makeParticles: makeParticles, advanceParticles: advanceParticles, particleJourney: particleJourney, meanFreePathEstimate: meanFreePathEstimate, systemMoments: systemMoments, diffusionMetrics: diffusionMetrics, compareTrials: compareTrials, speedDistribution: speedDistribution, speciesKinetics: speciesKinetics, metrics: metrics, seriesTrend: seriesTrend, speedHeat: speedHeat };

  window.StemLab.registerTool('particleLab3d', {
    icon: '\u2728',
    label: 'Particle Lab 3D',
    desc: 'Run fully 3D particle experiments with states of matter, gas laws, diffusion, collisions, attraction, live measurements, and particle tracing.',
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
      var canvasRef = useRef(null), stageRef = useRef(null), runtimeRef = useRef(null), frameRef = useRef(null), settingsRef = useRef(null);
      var [preset, setPreset] = useState(bucket.preset || 'gas');
      var [temperature, setTemperature] = useState(bucket.temperature || 300);
      var [count, setCount] = useState(bucket.count || 64);
      var [boxSize, setBoxSize] = useState(bucket.boxSize || 11);
      var [attraction, setAttraction] = useState(bucket.attraction == null ? 0.15 : bucket.attraction);
      var [gravity, setGravity] = useState(bucket.gravity == null ? 0 : bucket.gravity);
      var [membrane, setMembrane] = useState(bucket.membrane !== false);
      var [permeability, setPermeability] = useState(bucket.permeability == null ? 0.45 : bucket.permeability);
      var [membraneSelectivity, setMembraneSelectivity] = useState(bucket.membraneSelectivity || 'both');
      var [massRatioB, setMassRatioB] = useState(bucket.massRatioB == null ? 1 : clamp(Number(bucket.massRatioB) || 1, 0.5, 3));
      var [running, setRunning] = useState(false);
      var [trace, setTrace] = useState(!!bucket.trace);
      var [selectedParticle, setSelectedParticle] = useState(Number.isInteger(bucket.selectedParticle) ? bucket.selectedParticle : 0);
      var [selectedInfo, setSelectedInfo] = useState({ speed: 0, x: 0, y: 0, z: 0, type: 0, pathLength: 0, displacement: 0, efficiency: 0, journeyTime: 0, meanFreePath: 0, meanFreePathError: 0, relativeUncertainty: 0, freeFlightSamples: 0, currentFreeFlight: 0, collisionRate: 0, wallHits: 0, particleHits: 0, membraneHits: 0 });
      var [vectors, setVectors] = useState(!!bucket.vectors);
      var [flowTrails, setFlowTrails] = useState(!!bucket.flowTrails);
      var [energyColors, setEnergyColors] = useState(bucket.energyColors !== false);
      var [wallSensors, setWallSensors] = useState(bucket.wallSensors !== false);
      var [autoCamera, setAutoCamera] = useState(!!bucket.autoCamera);
      var [systemProbe, setSystemProbe] = useState(!!bucket.systemProbe);
      var [systemInfo, setSystemInfo] = useState({ x: 0, y: 0, z: 0, spread: 0, density: 0, drift: 0 });
      var [wallFaceInfo, setWallFaceInfo] = useState({ 'x+': 0, 'x-': 0, 'y+': 0, 'y-': 0, 'z+': 0, 'z-': 0 });
      var [timeScale, setTimeScale] = useState(bucket.timeScale || 1);
      var [isFullscreen, setIsFullscreen] = useState(false);
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
      var [stats, setStats] = useState({ temperature: temperature, pressure: 0, energy: 0, collisions: 0 });
      var [distribution, setDistribution] = useState({ bins: new Array(12).fill(0), max: 1, mean: 0, p90: 0 });
      var [speciesMotion, setSpeciesMotion] = useState({ a: { bins: new Array(12).fill(0), mean: 0, temperature: temperature, count: 0 }, b: { bins: new Array(12).fill(0), mean: 0, temperature: temperature, count: 0 }, max: 1 });
      var [diffusionInfo, setDiffusionInfo] = useState({ mixing: 0, exchange: 0, leftA: 1, rightA: 0, leftCount: 0, rightCount: 0, profileA: new Array(10).fill(0.5), profileTotal: new Array(10).fill(0), entropy: 0, msd: 0, msdA: 0, msdB: 0, coefficient: 0, coefficientA: 0, coefficientB: 0, elapsed: 0, spreadA: 0, spreadB: 0, solventRight: 0.5, osmoticShift: 0, soluteLeak: 0, milestoneTime: null, flux: 0, fluxA: 0, fluxB: 0, blocked: 0 });
      var [history, setHistory] = useState([]);
      var [resetKey, setResetKey] = useState(0);
      var runRef = useRef(false), stepRef = useRef(false), lastUiRef = useRef(0);
      settingsRef.current = { preset: preset, temperature: temperature, count: count, attraction: attraction, gravity: gravity, membrane: membrane, permeability: permeability, membraneSelectivity: membraneSelectivity, massRatioB: massRatioB, boxSize: boxSize, trace: trace, vectors: vectors, flowTrails: flowTrails, energyColors: energyColors, wallSensors: wallSensors, autoCamera: autoCamera, systemProbe: systemProbe, timeScale: timeScale, selectedParticle: Math.min(selectedParticle, count - 1) };
      runRef.current = running;

      function persist(patch) {
        if (!ctx.setToolData) return;
        ctx.setToolData(function (prev) {
          var old = (prev && prev.particleLab3d) || {};
          return Object.assign({}, prev, { particleLab3d: Object.assign({}, old, patch) });
        });
      }

      useEffect(function () {
        if (ready) return;
        function loadOrbit() {
          if (window.THREE && window.THREE.OrbitControls) { setReady(true); return; }
          var script = document.createElement('script'); script.src = ORBIT_URL; script.async = true;
          script.onload = function () { setReady(true); }; document.head.appendChild(script);
        }
        if (window.THREE) { loadOrbit(); return; }
        var script = document.createElement('script'); script.src = THREE_URL; script.async = true; script.onload = loadOrbit; document.head.appendChild(script);
      }, [ready]);

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
        var sphereGeo = new THREE.SphereGeometry(0.29, qualityProfile.sphereW, qualityProfile.sphereH);
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
        var driftArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1, 0xfde047, 0.28, 0.14); scene.add(driftArrow);
        var energyRingGeo = new THREE.RingGeometry(boxSize * 0.31, boxSize * 0.315, 64), energyRingMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.32, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
        var energyRing = new THREE.Mesh(energyRingGeo, energyRingMat); energyRing.rotation.x = -Math.PI / 2; energyRing.position.y = -boxSize / 2 + 0.02; scene.add(energyRing);
        var gravityArrow = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), new THREE.Vector3(-boxSize / 2 + 0.72, boxSize / 2 - 0.72, boxSize / 2 - 0.72), boxSize * 0.28, 0xfde047, 0.38, 0.22); gravityArrow.visible = false; scene.add(gravityArrow);
        var gravityFieldGeo = new THREE.RingGeometry(boxSize * 0.16, boxSize * 0.43, quality === 'eco' ? 40 : 72), gravityFieldMat = new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
        var gravityField = new THREE.Mesh(gravityFieldGeo, gravityFieldMat); gravityField.rotation.x = -Math.PI / 2; gravityField.position.y = -boxSize / 2 + 0.035; gravityField.visible = false; scene.add(gravityField);
        var membraneGeo = new THREE.PlaneGeometry(boxSize * 0.91, boxSize * 0.91, quality === 'eco' ? 8 : 14, quality === 'eco' ? 8 : 14), membraneMat = new THREE.MeshBasicMaterial({ color: 0xa78bfa, wireframe: true, transparent: true, opacity: 0.2, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
        var membranePlane = new THREE.Mesh(membraneGeo, membraneMat); membranePlane.rotation.y = Math.PI / 2; membranePlane.visible = false; scene.add(membranePlane);
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
        var flowLines = [], flowHistories = [];
        for (var ti = 0; ti < Math.min(qualityProfile.flow, particles.length); ti += 1) {
          var fg = new THREE.BufferGeometry(), fc = new THREE.Color().setHSL(0.52 + ti * 0.025, 0.9, 0.63);
          var fmLine = new THREE.LineBasicMaterial({ color: fc, transparent: true, opacity: 0.48, blending: THREE.AdditiveBlending, depthWrite: false });
          var fl = new THREE.Line(fg, fmLine); fl.visible = false; scene.add(fl); flowLines.push(fl); flowHistories.push([]);
        }
        var clock = performance.now(), accumulator = 0, collisionTotal = 0, impulseTotal = 0, metricElapsed = 0, simulationElapsed = 0, transportMilestone = null, membranePassedTotal = 0, membraneBlockedTotal = 0, membranePassedATotal = 0, membranePassedBTotal = 0, pendingFlashEvents = [], fpsFrames = 0, fpsClock = clock;
        var raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2(), pointerStart = null;
        function onPointerDown(ev) { pointerStart = { x: ev.clientX, y: ev.clientY }; }
        function onPointerUp(ev) {
          if (!pointerStart || Math.hypot(ev.clientX - pointerStart.x, ev.clientY - pointerStart.y) > 6) return;
          var rect = canvas.getBoundingClientRect(); pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1; pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(pointer, camera); var hits = raycaster.intersectObjects(meshes, false);
          if (hits.length) { var index = hits[0].object.userData.particleIndex || 0; setSelectedParticle(index); setTrace(true); persist({ selectedParticle: index, trace: true, traced: true }); if (ctx.announceToSR) ctx.announceToSR('Selected particle ' + (index + 1) + ' for random walk tracing.'); trailPoints.length = 0; }
        }
        canvas.addEventListener('pointerdown', onPointerDown); canvas.addEventListener('pointerup', onPointerUp);

        function resize() {
          var w = Math.max(1, canvas.clientWidth), hh = Math.max(1, canvas.clientHeight);
          if (canvas.width !== w || canvas.height !== hh) { renderer.setSize(w, hh, false); camera.aspect = w / hh; camera.updateProjectionMatrix(); }
        }
        function animate(now) {
          frameRef.current = requestAnimationFrame(animate); resize(); controls.autoRotate = !!settingsRef.current.autoCamera && !reducedMotion; controls.autoRotateSpeed = 0.62; controls.update(); fpsFrames += 1; if (now - fpsClock >= 1000) { setFps(Math.round(fpsFrames * 1000 / (now - fpsClock))); fpsFrames = 0; fpsClock = now; }
          var elapsed = Math.min(0.05, (now - clock) / 1000); clock = now;
          if (runRef.current || stepRef.current) {
            accumulator += stepRef.current ? 1 / 60 : elapsed * settingsRef.current.timeScale; stepRef.current = false;
            while (accumulator >= 1 / 120) {
              var result = advanceParticles(particles, settingsRef.current, 1 / 120);
              collisionTotal += result.collisions; impulseTotal += result.impulse; membranePassedTotal += result.membranePassed || 0; membranePassedATotal += result.membranePassedA || 0; membranePassedBTotal += result.membranePassedB || 0; membraneBlockedTotal += result.membraneBlocked || 0; metricElapsed += 1 / 120; simulationElapsed += 1 / 120; accumulator -= 1 / 120;
              if (result.events && result.events.length) result.events.forEach(function (event) { if (event.kind === 'wall') { var key = event.axis + (event.side > 0 ? '+' : '-'); sensorEnergy[key] = clamp(sensorEnergy[key] + 0.12 + event.power * 0.04, 0, 1); } });
              if (!reducedMotion && result.events && result.events.length) pendingFlashEvents = pendingFlashEvents.concat(result.events).slice(-14);
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
          var gravityStrength = clamp(Number(settingsRef.current.gravity) || 0, 0, 2), gravityVisible = gravityStrength > 0.01; gravityArrow.visible = gravityField.visible = gravityVisible;
          if (gravityVisible) { gravityArrow.setLength(boxSize * (0.16 + gravityStrength * 0.11), 0.38, 0.22); gravityField.material.opacity = 0.08 + gravityStrength * 0.13 + (reducedMotion ? 0 : Math.sin(now * 0.0024) * 0.035); if (!reducedMotion) gravityField.rotation.z -= elapsed * (0.22 + gravityStrength * 0.2); }
          while (pendingFlashEvents.length) { var ev = pendingFlashEvents.shift(), slot = flashPool.find(function (f) { return f.life <= 0; }) || flashPool[0]; slot.life = 1; slot.sprite.visible = true; slot.sprite.position.set(ev.x, ev.y, ev.z); var es = clamp(0.28 + ev.power * 0.13, 0.32, 1.25); slot.sprite.scale.set(es, es, es); }
          flashPool.forEach(function (f) { if (f.life <= 0) return; f.life -= elapsed * 4.5; f.sprite.material.opacity = Math.max(0, f.life) * 0.88; var sc = f.sprite.scale.x + elapsed * 1.8; f.sprite.scale.set(sc, sc, sc); if (f.life <= 0) f.sprite.visible = false; });
          var selected = particles[settingsRef.current.selectedParticle] || particles[0];
          focusRing.visible = !!settingsRef.current.trace;
          if (focusRing.visible && selected) { focusRing.position.set(selected.x, selected.y, selected.z); focusRing.quaternion.copy(camera.quaternion); focusRing.rotation.z += elapsed * 1.5; }
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
          var collective = systemMoments(particles), liveDiffusion = diffusionMetrics(particles, settingsRef.current.boxSize), diffusionVisible = isTransportPreset(settingsRef.current.preset), probeVisible = !!settingsRef.current.systemProbe;
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
            var diffusion = liveDiffusion; diffusion.elapsed = simulationElapsed; diffusion.coefficient = diffusion.msd / (6 * Math.max(0.001, simulationElapsed)); diffusion.coefficientA = diffusion.msdA / (6 * Math.max(0.001, simulationElapsed)); diffusion.coefficientB = diffusion.msdB / (6 * Math.max(0.001, simulationElapsed)); diffusion.flux = membranePassedTotal / Math.max(0.001, metricElapsed); diffusion.blocked = membraneBlockedTotal / Math.max(0.001, metricElapsed); diffusion.fluxA = membranePassedATotal / Math.max(0.001, metricElapsed); diffusion.fluxB = membranePassedBTotal / Math.max(0.001, metricElapsed); if (transportMilestone == null && ((settingsRef.current.preset === 'diffusion' && diffusion.mixing >= 0.8) || (settingsRef.current.preset === 'osmosis' && diffusion.osmoticShift >= 0.05 && diffusion.soluteLeak < 0.15))) transportMilestone = simulationElapsed; diffusion.milestoneTime = transportMilestone;
            var kinetic = speciesKinetics(particles, settingsRef.current.massRatioB, 12); setStats(next); setDistribution(speedDistribution(particles, 12)); setSpeciesMotion(kinetic); setDiffusionInfo(diffusion); setHistory(function (old) { return old.concat([{ temperature: m.temperature, temperatureA: kinetic.a.temperature, temperatureB: kinetic.b.temperature, pressure: m.pressure, energy: m.energy, collisions: collisionTotal, mixing: diffusion.mixing, entropy: diffusion.entropy, solventRight: diffusion.solventRight, soluteLeak: diffusion.soluteLeak, coefficientA: diffusion.coefficientA, coefficientB: diffusion.coefficientB, msdA: diffusion.msdA, msdB: diffusion.msdB, elapsed: diffusion.elapsed }]).slice(-36); });
            setSystemInfo({ x: collective.x, y: collective.y, z: collective.z, spread: collective.spread, density: collective.density, drift: collective.drift });
            setWallFaceInfo({ 'x+': sensorEnergy['x+'], 'x-': sensorEnergy['x-'], 'y+': sensorEnergy['y+'], 'y-': sensorEnergy['y-'], 'z+': sensorEnergy['z+'], 'z-': sensorEnergy['z-'] });
            if (selected) { var journey = particleJourney(selected); setSelectedInfo({ speed: Math.sqrt(selected.vx * selected.vx + selected.vy * selected.vy + selected.vz * selected.vz), x: selected.x, y: selected.y, z: selected.z, type: selected.type ? 1 : 0, pathLength: journey.pathLength, displacement: journey.displacement, efficiency: journey.efficiency, journeyTime: journey.journeyTime, meanFreePath: journey.meanFreePath, meanFreePathError: journey.meanFreePathError, relativeUncertainty: journey.relativeUncertainty, freeFlightSamples: journey.freeFlightSamples, currentFreeFlight: journey.currentFreeFlight, collisionRate: journey.collisionRate, wallHits: journey.wallHits, particleHits: journey.particleHits, membraneHits: journey.membraneHits }); }
            collisionTotal = 0; impulseTotal = 0; membranePassedTotal = 0; membraneBlockedTotal = 0; membranePassedATotal = 0; membranePassedBTotal = 0; metricElapsed = 0;
          }
          renderer.render(scene, camera);
        }
        runtimeRef.current = { renderer: renderer, scene: scene, particles: particles, camera: camera, controls: controls };
        frameRef.current = requestAnimationFrame(animate);
        return function () {
          cancelAnimationFrame(frameRef.current); canvas.removeEventListener('pointerdown', onPointerDown); canvas.removeEventListener('pointerup', onPointerUp); controls.dispose(); boxGeo.dispose(); edgeGeo.dispose(); baseGeo.dispose(); shadowGeo.dispose(); sensorGeo.dispose(); sphereGeo.dispose(); beaconGeo.dispose(); focusGeo.dispose(); probeGeo.dispose(); haloGeo.dispose(); densityGeo.dispose(); attractionGeo.dispose(); energyRingGeo.dispose(); gravityFieldGeo.dispose(); membraneGeo.dispose(); speciesHaloGeo.dispose(); starGeo.dispose(); trailGeo.dispose(); trailMat.dispose(); flowLines.forEach(function (line) { line.geometry.dispose(); line.material.dispose(); }); edgeMat.dispose(); chamberMat.dispose(); baseMat.dispose(); shadowMat.dispose(); beaconMat.dispose(); holoMat.dispose(); holoTexture.dispose(); sensorFaces.forEach(function (sensor) { sensor.material.dispose(); }); focusMat.dispose(); probeMat.dispose(); haloMat.dispose(); densityMat.dispose(); attractionMat.dispose(); energyRingMat.dispose(); gravityFieldMat.dispose(); membraneMat.dispose(); speciesHaloAMat.dispose(); speciesHaloBMat.dispose(); starMat.dispose(); glowTexture.dispose(); flashPool.forEach(function (f) { f.sprite.material.dispose(); }); glows.forEach(function (g) { g.material.dispose(); }); particleMaterials.forEach(function (m) { m.dispose(); }); arrows.forEach(function (a) { scene.remove(a); }); mats.forEach(function (m) { m.dispose(); }); driftArrow.line.geometry.dispose(); driftArrow.line.material.dispose(); driftArrow.cone.geometry.dispose(); driftArrow.cone.material.dispose(); gravityArrow.line.geometry.dispose(); gravityArrow.line.material.dispose(); gravityArrow.cone.geometry.dispose(); gravityArrow.cone.material.dispose(); renderer.dispose(); runtimeRef.current = null;
        };
      }, [ready, preset, count, boxSize, massRatioB, resetKey, quality]);

      useEffect(function () {
        function onFullscreenChange() { setIsFullscreen(document.fullscreenElement === stageRef.current); }
        document.addEventListener('fullscreenchange', onFullscreenChange);
        return function () { document.removeEventListener('fullscreenchange', onFullscreenChange); };
      }, []);
      function toggleFullscreen() {
        var stage = stageRef.current; if (!stage) return;
        if (document.fullscreenElement) { Promise.resolve(document.exitFullscreen && document.exitFullscreen()).catch(function () {}); }
        else if (stage.requestFullscreen) { Promise.resolve(stage.requestFullscreen()).catch(function () { if (ctx.addToast) ctx.addToast('Fullscreen is not available in this browser.', 'info'); }); }
      }
      function updateNotebook(field, value) {
        if (field === 'prediction') setPrediction(value); else if (field === 'observation') setObservation(value); else setConclusion(value);
        var patch = {}; patch[field] = value; persist(patch);
      }
      function buildLabReport() {
        var title = currentProtocol ? currentProtocol.title : 'Free Laboratory Investigation';
        var trialLines = trials.length ? trials.map(function (trial, i) { return 'Trial ' + (i + 1) + ': ' + trial.temperature + ' K, pressure ' + trial.pressure + ', N=' + trial.count + ', volume=' + Math.round(trial.boxSize * trial.boxSize * trial.boxSize) + ' u\u00B3, gravity=' + Number(trial.gravity || 0).toFixed(1) + ' g*, permeability=' + Number(trial.permeability == null ? 1 : trial.permeability).toFixed(2) + ', preference=' + (trial.membraneSelectivity || 'both') + ', mass B=' + Number(trial.massRatioB || 1).toFixed(1) + 'x, osmotic shift=' + Math.round(Number(trial.osmoticShift || 0) * 100) + '%, solute leak=' + Math.round(Number(trial.soluteLeak || 0) * 100) + '%, mixing=' + Math.round(Number(trial.mixing || 0) * 100) + '%, entropy=' + Math.round(Number(trial.entropy || 0) * 100) + '%, D*A=' + Number(trial.coefficientA || 0).toFixed(2) + ', D*B=' + Number(trial.coefficientB || 0).toFixed(2) + ', milestone=' + (trial.milestoneTime == null ? 'not reached' : Number(trial.milestoneTime).toFixed(1) + ' s'); }).join('\n') : 'No trials recorded yet.';
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
      useEffect(function () {
        function onLabKey(event) {
          var target = event.target, tag = target && target.tagName;
          if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON' || (target && target.isContentEditable)) return;
          if (event.code === 'Space') { event.preventDefault(); setRunning(function (value) { var next = !value; if (ctx.announceToSR) ctx.announceToSR(next ? 'Particle simulation running.' : 'Particle simulation paused.'); return next; }); }
          else if (event.key === 'r' || event.key === 'R') { setRunning(false); setHistory([]); setResetKey(function (k) { return k + 1; }); if (ctx.announceToSR) ctx.announceToSR('Particle chamber reset.'); }
          else if (event.key === 't' || event.key === 'T') { setTrace(function (value) { persist({ trace: !value, traced: !value || bucket.traced }); return !value; }); }
          else if (event.key === 'v' || event.key === 'V') { setVectors(function (value) { persist({ vectors: !value }); return !value; }); }
          else if (event.key === 'e' || event.key === 'E') { setEnergyColors(function (value) { persist({ energyColors: !value }); return !value; }); }
          else if (event.key === 'm' || event.key === 'M') { setMembrane(function (value) { var next = !value; persist({ membrane: next }); if (ctx.announceToSR) ctx.announceToSR(next ? 'Diffusion membrane enabled.' : 'Diffusion membrane removed.'); return next; }); }
          else if (event.key === 'g' || event.key === 'G') { setGravity(function (value) { var next = value > 0.01 ? 0 : 1; persist({ gravity: next }); if (ctx.announceToSR) ctx.announceToSR(next ? 'Gravity field enabled at one model g.' : 'Gravity field disabled.'); return next; }); }
          else if (event.key === 'f' || event.key === 'F') toggleFullscreen();
          else if (event.key === 'c' || event.key === 'C') setAutoCamera(function (value) { persist({ autoCamera: !value }); return !value; });
        }
        window.addEventListener('keydown', onLabKey);
        return function () { window.removeEventListener('keydown', onLabKey); };
      }, []);
      function applyProtocol(protocol) {
        if (!protocol || protocol.id === 'free') { setActiveProtocol('free'); persist({ activeProtocol: 'free' }); return; }
        var protocolOsmosis = protocol.id === 'osmosis', protocolTransport = protocol.id === 'mixing' || protocolOsmosis;
        setActiveProtocol(protocol.id); setPreset(protocol.preset); setTemperature(protocol.temperature); setCount(protocol.count); setBoxSize(protocol.boxSize); setAttraction(protocol.attraction); setGravity(0); setMembrane(protocolTransport); setPermeability(protocolOsmosis ? 0.72 : (protocol.id === 'mixing' ? 0.45 : 1)); setMembraneSelectivity(protocolOsmosis ? 'a' : 'both'); setMassRatioB(1); setRunning(false); setTrials([]); setHistory([]); setResetKey(function (k) { return k + 1; });
        persist({ activeProtocol: protocol.id, preset: protocol.preset, temperature: protocol.temperature, count: protocol.count, boxSize: protocol.boxSize, attraction: protocol.attraction, gravity: 0, membrane: protocolTransport, permeability: protocolOsmosis ? 0.72 : (protocol.id === 'mixing' ? 0.45 : 1), membraneSelectivity: protocolOsmosis ? 'a' : 'both', massRatioB: 1, trials: [], protocolsOpened: Object.assign({}, bucket.protocolsOpened || {}, (function () { var o = {}; o[protocol.id] = true; return o; })()) });
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
      function resetTracerJourney() {
        var rt = runtimeRef.current, selected = rt && rt.particles ? rt.particles[Math.min(selectedParticle, rt.particles.length - 1)] : null;
        if (!selected) return;
        selected.homeX = selected.x; selected.homeY = selected.y; selected.homeZ = selected.z; selected.pathLength = 0; selected.journeyTime = 0; selected.distanceSinceParticleHit = 0; selected.freeFlights = []; selected.wallHits = 0; selected.particleHits = 0; selected.membraneHits = 0;
        setSelectedInfo(function (old) { return Object.assign({}, old, { pathLength: 0, displacement: 0, efficiency: 0, journeyTime: 0, meanFreePath: 0, meanFreePathError: 0, relativeUncertainty: 0, freeFlightSamples: 0, currentFreeFlight: 0, collisionRate: 0, wallHits: 0, particleHits: 0, membraneHits: 0 }); });
        setTrace(true); persist({ trace: true, traced: true, tracerRuns: (bucket.tracerRuns || 0) + 1 });
        if (ctx.announceToSR) ctx.announceToSR('Started a new random walk measurement for particle ' + (selectedParticle + 1) + '. Distance, time, and collision counters reset at its current position.');
      }
      function recordTracerJourney() {
        if (selectedInfo.journeyTime < 1 || selectedInfo.particleHits < 1) { if (ctx.announceToSR) ctx.announceToSR('Keep tracing until at least one particle collision has occurred before recording the walk.'); return; }
        var snapshot = { id: Date.now(), species: selectedInfo.type ? 'B' : 'A', particle: selectedParticle + 1, temperature: stats.temperature, count: count, boxSize: boxSize, density: count / Math.pow(boxSize, 3), massRatioB: massRatioB, pathLength: selectedInfo.pathLength, displacement: selectedInfo.displacement, efficiency: selectedInfo.efficiency, journeyTime: selectedInfo.journeyTime, meanFreePath: selectedInfo.meanFreePath, meanFreePathError: selectedInfo.meanFreePathError, freeFlightSamples: selectedInfo.freeFlightSamples, theoreticalMeanFreePath: meanFreePathEstimate(count, boxSize), collisionRate: selectedInfo.collisionRate, particleHits: selectedInfo.particleHits };
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
        setAutoCamera(false); persist({ autoCamera: false });
        var rt = runtimeRef.current; if (!rt || !rt.camera || !rt.controls) return;
        var positions = { hero: [boxSize * 1.05, boxSize * 0.74, boxSize * 1.18], top: [0.01, boxSize * 1.65, 0.01], close: [boxSize * 0.72, boxSize * 0.35, boxSize * 0.78] };
        var pos = positions[shot] || positions.hero; rt.camera.position.set(pos[0], pos[1], pos[2]); rt.controls.target.set(0, 0, 0); rt.controls.update();
        if (ctx.announceToSR) ctx.announceToSR('Camera changed to ' + shot + ' view.');
      }
      function recordTrial() {
        var trial = { id: Date.now(), preset: preset, temperature: stats.temperature, temperatureSetpoint: temperature, pressure: stats.pressure, count: count, boxSize: boxSize, attraction: attraction, gravity: gravity, membrane: membrane, permeability: permeability, membraneSelectivity: membraneSelectivity, massRatioB: massRatioB, mixing: diffusionInfo.mixing, milestoneTime: diffusionInfo.milestoneTime, osmoticShift: diffusionInfo.osmoticShift, soluteLeak: diffusionInfo.soluteLeak, entropy: diffusionInfo.entropy, msd: diffusionInfo.msd, coefficient: diffusionInfo.coefficient, coefficientA: diffusionInfo.coefficientA, coefficientB: diffusionInfo.coefficientB, msdA: diffusionInfo.msdA, msdB: diffusionInfo.msdB, exchange: diffusionInfo.exchange };
        var next = trials.concat([trial]).slice(-2); setTrials(next); persist({ trials: next, trialsRecorded: (bucket.trialsRecorded || 0) + 1 });
        if (ctx.announceToSR) ctx.announceToSR('Recorded trial at ' + trial.temperature + ' kelvin and pressure ' + trial.pressure + ' model units.');
      }
      function restoreTrial(trial) {
        if (!trial) return; setPreset(trial.preset || 'gas'); setTemperature(trial.temperatureSetpoint == null ? trial.temperature : trial.temperatureSetpoint); setCount(trial.count); setBoxSize(trial.boxSize); setAttraction(trial.attraction || 0); setGravity(trial.gravity || 0); setMembrane(!!trial.membrane); setPermeability(trial.permeability == null ? 1 : trial.permeability); setMembraneSelectivity(trial.membraneSelectivity || 'both'); setMassRatioB(trial.massRatioB == null ? 1 : trial.massRatioB); setRunning(false); setHistory([]); setResetKey(function (k) { return k + 1; });
        if (ctx.announceToSR) ctx.announceToSR('Restored recorded trial conditions.');
      }
      function kineticRegime() {
        if (stats.temperature < 180) return { label: 'Low kinetic regime', tone: 'text-sky-700', note: 'Most particles are moving relatively slowly.' };
        if (stats.temperature < 520) return { label: 'Moderate kinetic regime', tone: 'text-violet-700', note: 'The speed distribution is broadening.' };
        return { label: 'High kinetic regime', tone: 'text-rose-700', note: 'Fast particles dominate collisions and wall impacts.' };
      }
      function modelSummary() {
        if (!running) return 'The model is paused. Change one variable, record a trial, then run again.';
        if (preset === 'osmosis' && diffusionInfo.soluteLeak > 0.12) return 'Some solute is leaking through the membrane. Lower permeability or restore the A-selective membrane to model stronger semipermeability.';
        if (preset === 'osmosis' && diffusionInfo.osmoticShift > 0.08) return 'Net solvent movement toward the solution side is visible. The solute remains mostly confined while the solvent distribution shifts.';
        if (transportMode && Math.abs(speciesMotion.a.temperature - speciesMotion.b.temperature) > Math.max(35, stats.temperature * 0.2)) return 'The two species are at different kinetic temperatures. Watch their temperature traces converge as collisions exchange energy.';
        if (preset === 'diffusion' && massRatioB > 1.35 && membraneSelectivity === 'both') return 'Particle B is heavier, so equal-temperature B particles usually travel more slowly. Compare D*A and D*B in the diffusion race.';
        if (preset === 'diffusion' && massRatioB < 0.75 && membraneSelectivity === 'both') return 'Particle B is lighter, so equal-temperature B particles usually travel faster. Compare D*A and D*B in the diffusion race.';
        if (preset === 'diffusion' && membrane && membraneSelectivity !== 'both' && Math.abs(diffusionInfo.fluxA - diffusionInfo.fluxB) > 0.5) return 'The membrane is producing species-selective transport. Compare the A and B crossing rates and the concentration profile.';
        if (preset === 'diffusion' && membrane && diffusionInfo.mixing < 0.35) return 'A strong concentration gradient remains across the membrane. Increase permeability or temperature and watch the mixing index and crossing flux.';
        if (preset === 'diffusion' && diffusionInfo.mixing > 0.82) return 'The two populations are approaching dynamic equilibrium: particles still cross, but the concentration difference between sides is small.';
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
      var thermalTimeline = history.filter(function (sample) { return sample && Number.isFinite(sample.temperatureA) && Number.isFinite(sample.temperatureB); }), thermalA = thermalTimeline.map(function (sample) { return sample.temperatureA; }), thermalB = thermalTimeline.map(function (sample) { return sample.temperatureB; }), thermalValues = thermalA.concat(thermalB), thermalMin = thermalValues.length ? Math.min.apply(Math, thermalValues) : 0, thermalMax = thermalValues.length ? Math.max.apply(Math, thermalValues) : 1, thermalGap = Math.abs(speciesMotion.a.temperature - speciesMotion.b.temperature), thermalGapPercent = Math.round(thermalGap / Math.max(1, (speciesMotion.a.temperature + speciesMotion.b.temperature) / 2) * 100);
      var currentMeanFreePathTheory = meanFreePathEstimate(count, boxSize), currentMeanFreePathRatio = selectedInfo.meanFreePath / Math.max(0.001, currentMeanFreePathTheory);
      var tracerComparison = tracerTrials.length === 2 ? { meanFreePathDelta: tracerTrials[1].meanFreePath - tracerTrials[0].meanFreePath, collisionRateDelta: tracerTrials[1].collisionRate - tracerTrials[0].collisionRate, densityDelta: tracerTrials[1].density - tracerTrials[0].density, temperatureDelta: tracerTrials[1].temperature - tracerTrials[0].temperature } : null;
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
            h('div', null, h('p', { className: 'text-xs font-black uppercase tracking-[0.2em] text-cyan-300' }, 'Interactive physics sandbox'), h('h2', { className: 'mt-1 text-2xl font-black' }, '\u2728 Particle Lab 3D'), h('p', { className: 'mt-2 max-w-3xl text-sm leading-relaxed text-cyan-50' }, 'Change the conditions, run the model, and use measurements to explain what the particles do. Drag to rotate, scroll to zoom, and pause to inspect any moment.')),
            h('div', { className: 'rounded-xl border border-cyan-700/60 bg-slate-950/60 px-3 py-2 text-xs text-cyan-100' }, 'Simplified model \u2022 equal-mass particles \u2022 fixed timestep')
          )
        ),
        h('section', { className: 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm', 'aria-labelledby': 'particle-protocols-title' },
          h('div', { className: 'flex flex-wrap items-center justify-between gap-2' }, h('div', null, h('p', { className: 'text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700' }, 'Guided investigations'), h('h3', { id: 'particle-protocols-title', className: 'text-lg font-black text-slate-950' }, 'Choose an experiment protocol')), h('button', { type: 'button', onClick: function () { applyProtocol({ id: 'free' }); }, className: 'rounded-lg border px-3 py-2 text-xs font-black ' + (activeProtocol === 'free' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 text-slate-600 hover:bg-slate-100') }, '\u2699 Free laboratory')),
          h('div', { className: 'mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4' }, protocols.map(function (protocol) { var active = activeProtocol === protocol.id; return h('button', { key: protocol.id, type: 'button', onClick: function () { applyProtocol(protocol); }, 'aria-pressed': active, className: 'group relative overflow-hidden rounded-xl border p-3 text-left transition-all ' + (active ? 'border-cyan-400 bg-slate-950 text-white shadow-lg shadow-cyan-900/20' : 'border-slate-200 bg-slate-50 text-slate-900 hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md') }, h('span', { className: 'absolute inset-y-0 left-0 w-1 bg-gradient-to-b ' + protocol.accent }), h('div', { className: 'flex items-start gap-3' }, h('span', { className: 'text-2xl' }, protocol.icon), h('span', null, h('span', { className: 'block text-sm font-black' }, protocol.title), h('span', { className: 'mt-0.5 block text-[10px] font-bold uppercase tracking-wide ' + (active ? 'text-cyan-300' : 'text-slate-500') }, protocol.law))), h('span', { className: 'mt-3 block text-[11px] leading-relaxed ' + (active ? 'text-slate-300' : 'text-slate-600') }, protocol.watch)); }))
        ),
        h('div', { className: 'grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]' },
          h('section', { ref: stageRef, className: 'overflow-hidden border border-cyan-500/30 bg-slate-950 shadow-2xl shadow-cyan-950/40 ring-1 ring-white/5 ' + (isFullscreen ? 'h-screen rounded-none flex flex-col' : 'rounded-[24px]'), 'aria-label': 'Three-dimensional particle simulation' },
            h('div', { className: 'flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 px-4 py-3' },
              h('div', { className: 'flex flex-wrap gap-2' }, presets.map(function (p) { return h('button', { key: p.id, type: 'button', onClick: function () { choosePreset(p.id); }, 'aria-pressed': preset === p.id, className: 'rounded-xl border px-3 py-2 text-xs font-bold transition-all ' + (preset === p.id ? 'border-cyan-200 bg-cyan-300 text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.35)]' : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-500/50 hover:bg-slate-800') }, p.icon + ' ' + p.label); })),
              h('div', { className: 'flex flex-wrap items-center gap-2' },
                h('span', { className: 'text-xs text-slate-400' }, ready ? presets.filter(function (p) { return p.id === preset; })[0].note : 'Loading the 3D engine\u2026'),
                h('div', { className: 'flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 p-1', role: 'group', 'aria-label': 'Visual quality' }, ['eco', 'balanced', 'ultra'].map(function (mode) { return h('button', { key: mode, type: 'button', onClick: function () { setQuality(mode); persist({ quality: mode }); }, 'aria-pressed': quality === mode, className: 'rounded px-2 py-1 text-[9px] font-black uppercase tracking-wide ' + (quality === mode ? 'bg-cyan-300 text-slate-950' : 'text-slate-400 hover:bg-slate-700 hover:text-white') }, mode); }))
              )
            ),
            h('div', { tabIndex: 0, role: 'application', 'aria-roledescription': 'Interactive 3D particle chamber', 'aria-label': 'Particle chamber. Click a particle to trace it, drag to orbit, and use the wheel to zoom. Space runs or pauses. R resets. T toggles tracing. V toggles vectors. E toggles speed colors. M toggles the membrane. G toggles gravity. C toggles the camera. F toggles fullscreen.', 'aria-keyshortcuts': 'Space R T V E M G C F', onPointerDown: function (event) { try { event.currentTarget.focus(); } catch (error) {} }, className: 'relative min-h-[380px] overflow-hidden bg-slate-950 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-cyan-200 ' + (isFullscreen ? 'flex-1' : 'h-[520px]') },
              h('canvas', { ref: canvasRef, className: 'h-full w-full saturate-[1.15] contrast-[1.04]', role: 'img', 'aria-label': preset + ' particle simulation in a transparent cubic container. Current measured temperature ' + stats.temperature + ' kelvin and pressure ' + stats.pressure + ' model units. Gravity field ' + (gravity > 0.01 ? 'active at ' + gravity.toFixed(1) + ' model g' : 'off') + (preset === 'diffusion' ? '. Diffusion mixing index ' + Math.round(diffusionInfo.mixing * 100) + ' percent' : (preset === 'osmosis' ? '. Osmotic solvent shift ' + Math.round(diffusionInfo.osmoticShift * 100) + ' percent and solute leakage ' + Math.round(diffusionInfo.soluteLeak * 100) + ' percent' : '')) + (transportMode ? '. Particle B relative mass ' + massRatioB.toFixed(1) + ' times particle A' : '') + '.' }),
              h('div', { className: 'pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(2,6,23,0.7)_100%)]' }),
              h('div', { className: 'pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent shadow-[0_0_18px_4px_rgba(34,211,238,0.35)]' }),
              h('div', { className: 'pointer-events-none absolute right-3 top-3 min-w-[150px] rounded-xl border border-cyan-300/20 bg-slate-950/65 p-3 text-right shadow-lg backdrop-blur-md' },
                h('div', { className: 'flex items-center justify-end gap-2 text-[9px] font-black uppercase tracking-[0.22em] text-cyan-300' }, h('span', null, preset + ' chamber'), h('span', { className: 'rounded bg-cyan-300/10 px-1.5 py-0.5 font-mono tracking-normal text-cyan-100' }, (fps || '--') + ' FPS \u2022 ' + quality)),
                h('div', { className: 'mt-1 font-mono text-xl font-black text-white' }, stats.temperature + ' K'),
                h('div', { className: 'mt-1 flex justify-end gap-3 font-mono text-[10px] text-slate-300' }, h('span', null, 'P ' + stats.pressure), h('span', null, 'N ' + count), h('span', null, 'V ' + Math.round(boxSize * boxSize * boxSize)), transportMode && h('span', null, preset === 'osmosis' ? 'Osm ' + (diffusionInfo.osmoticShift >= 0 ? '+' : '') + Math.round(diffusionInfo.osmoticShift * 100) + '%' : 'Mix ' + Math.round(diffusionInfo.mixing * 100) + '%'))
              ),
              running && h('div', { className: 'pointer-events-none absolute bottom-3 right-3 flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-950/60 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-300 backdrop-blur' }, h('span', { className: 'h-2 w-2 animate-pulse rounded-full bg-emerald-300 shadow-[0_0_10px_2px_rgba(110,231,183,0.7)]' }), 'Live simulation'),
              systemProbe && h('div', { className: 'pointer-events-none absolute bottom-3 left-1/2 min-w-[220px] -translate-x-1/2 rounded-xl border border-yellow-200/30 bg-slate-950/75 px-3 py-2 text-center shadow-[0_0_24px_rgba(253,224,71,0.15)] backdrop-blur' }, h('div', { className: 'text-[9px] font-black uppercase tracking-[0.18em] text-yellow-300' }, '\u25C8 Collective system probe'), h('div', { className: 'mt-1 flex justify-center gap-3 font-mono text-[9px] text-slate-200' }, h('span', null, 'spread ' + systemInfo.spread.toFixed(2)), h('span', null, 'density ' + systemInfo.density.toFixed(3)), h('span', null, 'drift ' + systemInfo.drift.toFixed(2))), h('div', { className: 'mt-0.5 font-mono text-[8px] text-slate-500' }, 'COM ' + systemInfo.x.toFixed(1) + ', ' + systemInfo.y.toFixed(1) + ', ' + systemInfo.z.toFixed(1))),
              !ready && h('div', { className: 'absolute inset-0 flex items-center justify-center bg-slate-950 text-sm font-bold text-cyan-200' }, 'Loading Three.js\u2026'),
              h('div', { className: 'pointer-events-none absolute left-3 top-3 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-[11px] text-slate-300 shadow-lg backdrop-blur' }, h('div', { className: 'font-black uppercase tracking-wider text-cyan-300' }, 'Chamber controls'), h('div', { className: 'mt-1' }, 'Click: select \u2022 Drag: orbit \u2022 Wheel: zoom'), h('div', { className: 'mt-1 font-mono text-[9px] text-slate-500' }, 'SPACE run \u2022 R reset \u2022 T trace \u2022 V vectors \u2022 E energy \u2022 M membrane \u2022 G gravity \u2022 C camera \u2022 F fullscreen'), wallSensors && h('div', { className: 'mt-2 flex items-center gap-2 border-t border-white/10 pt-2 text-[9px] text-indigo-200' }, h('span', { className: 'h-2 w-2 rounded-sm bg-indigo-300 shadow-[0_0_8px_rgba(165,180,252,0.9)]' }), 'Wall glow = local impact pressure'), energyColors && h('div', { className: 'mt-2 border-t border-white/10 pt-2', role: 'img', 'aria-label': 'Particle speed colors range from cyan for slower particles through violet to coral for faster particles.' }, h('div', { className: 'h-1.5 rounded-full bg-gradient-to-r from-cyan-400 via-violet-400 to-red-400 shadow-[0_0_10px_rgba(167,139,250,0.45)]' }), h('div', { className: 'mt-1 flex justify-between text-[8px] font-black uppercase tracking-wide text-slate-400' }, h('span', null, 'slower'), h('span', null, 'particle speed'), h('span', null, 'faster')))),
              trace && h('div', { className: 'pointer-events-none absolute bottom-3 left-3 min-w-[220px] rounded-xl border border-yellow-200/50 bg-yellow-300/90 px-3 py-2 text-slate-950 shadow-[0_0_24px_rgba(253,224,71,0.28)] backdrop-blur', role: 'img', 'aria-label': 'Random walk analyzer for particle ' + (selectedParticle + 1) + ', species ' + (selectedInfo.type ? 'B' : 'A') + '. Speed ' + selectedInfo.speed.toFixed(2) + ' model units per second. Total path ' + selectedInfo.pathLength.toFixed(1) + ' model units, net displacement ' + selectedInfo.displacement.toFixed(1) + ', path efficiency ' + Math.round(selectedInfo.efficiency * 100) + ' percent, ' + selectedInfo.particleHits + ' particle collisions, ' + selectedInfo.wallHits + ' wall collisions, and ' + selectedInfo.membraneHits + ' membrane reflections. Mean free path ' + selectedInfo.meanFreePath.toFixed(1) + ' model units with standard error ' + selectedInfo.meanFreePathError.toFixed(1) + ' from ' + selectedInfo.freeFlightSamples + ' completed free flights, compared with a kinetic theory estimate of ' + currentMeanFreePathTheory.toFixed(1) + ' model units, and particle collision rate ' + selectedInfo.collisionRate.toFixed(2) + ' per second.' },
                h('div', { className: 'flex items-center justify-between gap-3' }, h('div', { className: 'text-[9px] font-black uppercase tracking-[0.18em]' }, 'Random walk analyzer'), h('span', { className: 'rounded bg-slate-950/10 px-1.5 py-0.5 font-mono text-[9px] font-black' }, (selectedInfo.type ? 'B' : 'A') + '-' + (selectedParticle + 1))),
                h('div', { className: 'mt-1 flex justify-between gap-4 font-mono text-[10px] font-black' }, h('span', null, 'speed ' + selectedInfo.speed.toFixed(2)), h('span', null, 'path ' + selectedInfo.pathLength.toFixed(1) + ' u')),
                h('div', { className: 'mt-1 h-1.5 overflow-hidden rounded-full bg-slate-950/15' }, h('div', { className: 'h-full rounded-full bg-slate-950 transition-all', style: { width: Math.round(selectedInfo.efficiency * 100) + '%' } })),
                h('div', { className: 'mt-1 flex justify-between font-mono text-[9px]' }, h('span', null, 'net ' + selectedInfo.displacement.toFixed(1) + ' u'), h('span', null, Math.round(selectedInfo.efficiency * 100) + '% straightness')),
                h('div', { className: 'mt-1 grid grid-cols-2 gap-2 border-t border-slate-950/10 pt-1 font-mono text-[9px]' }, h('span', null, 'mean free path ' + selectedInfo.meanFreePath.toFixed(1) + ' plus or minus ' + selectedInfo.meanFreePathError.toFixed(1) + ' u'), h('span', { className: 'text-right' }, selectedInfo.collisionRate.toFixed(2) + ' hits/s')),
                h('div', { className: 'mt-1 flex justify-between font-mono text-[8px]' }, h('span', null, selectedInfo.freeFlightSamples + ' completed flights'), h('span', null, 'current flight ' + selectedInfo.currentFreeFlight.toFixed(1) + ' u')),
                h('div', { className: 'mt-1 flex justify-between font-mono text-[8px] opacity-75' }, h('span', null, 'kinetic-theory estimate ' + currentMeanFreePathTheory.toFixed(1) + ' u'), h('span', null, 'observed/theory ' + currentMeanFreePathRatio.toFixed(2) + 'x')),
                h('div', { className: 'mt-1 font-mono text-[9px]' }, selectedInfo.particleHits + ' particle hits \u2022 ' + selectedInfo.wallHits + ' wall hits' + (selectedInfo.membraneHits ? ' \u2022 ' + selectedInfo.membraneHits + ' membrane' : '')),
                h('div', { className: 'mt-0.5 font-mono text-[8px] opacity-70' }, 'x ' + selectedInfo.x.toFixed(1) + '  y ' + selectedInfo.y.toFixed(1) + '  z ' + selectedInfo.z.toFixed(1))
              )
            ),
            h('div', { className: 'flex flex-wrap items-center gap-2 border-t border-slate-700 p-3' },
              h('button', { type: 'button', onClick: toggleRun, className: 'rounded-lg bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-400' }, running ? '\u23F8 Pause' : '\u25B6 Run'),
              h('button', { type: 'button', onClick: function () { setRunning(false); stepRef.current = true; }, className: 'rounded-lg bg-slate-800 px-3 py-2 text-sm font-bold text-white hover:bg-slate-700' }, '\u23ED Step'),
              h('button', { type: 'button', onClick: function () { setRunning(false); setHistory([]); setResetKey(function (k) { return k + 1; }); }, className: 'rounded-lg bg-slate-800 px-3 py-2 text-sm font-bold text-white hover:bg-slate-700' }, '\u21BB Reset'),
              h('button', { type: 'button', onClick: function () { var next = !trace; setTrace(next); persist({ trace: next, traced: next || bucket.traced }); }, 'aria-pressed': trace, className: 'rounded-lg px-3 py-2 text-sm font-bold ' + (trace ? 'bg-yellow-300 text-slate-950' : 'bg-slate-800 text-white hover:bg-slate-700') }, '\uD83D\uDCCD Trace'),
              trace && h('button', { type: 'button', onClick: resetTracerJourney, className: 'rounded-lg border border-yellow-300/40 bg-yellow-300/10 px-3 py-2 text-sm font-bold text-yellow-200 hover:bg-yellow-300/20', 'aria-label': 'Start a new random walk measurement for the selected particle' }, '\u25CE New walk'),
              trace && h('button', { type: 'button', onClick: recordTracerJourney, disabled: selectedInfo.journeyTime < 1 || selectedInfo.particleHits < 1, className: 'rounded-lg border border-emerald-300/40 bg-emerald-300/10 px-3 py-2 text-sm font-bold text-emerald-200 hover:bg-emerald-300/20 disabled:cursor-not-allowed disabled:opacity-40', 'aria-label': selectedInfo.particleHits < 1 ? 'Record tracer walk, available after the first particle collision' : 'Record the current tracer walk' }, '\uD83D\uDCCC Save walk'),
              h('button', { type: 'button', onClick: function () { var next = !vectors; setVectors(next); persist({ vectors: next }); }, 'aria-pressed': vectors, className: 'rounded-lg px-3 py-2 text-sm font-bold ' + (vectors ? 'bg-cyan-200 text-slate-950' : 'bg-slate-800 text-white hover:bg-slate-700') }, '\u2197 Velocity'),
              h('button', { type: 'button', onClick: function () { var next = !flowTrails; setFlowTrails(next); persist({ flowTrails: next }); }, 'aria-pressed': flowTrails, className: 'rounded-lg px-3 py-2 text-sm font-bold ' + (flowTrails ? 'bg-violet-300 text-slate-950' : 'bg-slate-800 text-white hover:bg-slate-700') }, '\u223F Flow trails'),
              h('button', { type: 'button', onClick: function () { var next = !energyColors; setEnergyColors(next); persist({ energyColors: next }); }, 'aria-pressed': energyColors, className: 'rounded-lg px-3 py-2 text-sm font-bold ' + (energyColors ? 'bg-gradient-to-r from-cyan-300 via-violet-300 to-red-300 text-slate-950' : 'bg-slate-800 text-white hover:bg-slate-700') }, '\uD83C\uDF08 Speed colors'),
              h('button', { type: 'button', onClick: function () { var next = !wallSensors; setWallSensors(next); persist({ wallSensors: next }); }, 'aria-pressed': wallSensors, className: 'rounded-lg px-3 py-2 text-sm font-bold ' + (wallSensors ? 'bg-indigo-300 text-slate-950' : 'bg-slate-800 text-white hover:bg-slate-700') }, '\u25A3 Wall pressure'),
              h('button', { type: 'button', onClick: function () { var next = !systemProbe; setSystemProbe(next); persist({ systemProbe: next }); }, 'aria-pressed': systemProbe, className: 'rounded-lg px-3 py-2 text-sm font-bold ' + (systemProbe ? 'bg-yellow-300 text-slate-950' : 'bg-slate-800 text-white hover:bg-slate-700') }, '\u25C8 System probe'),
              h('button', { type: 'button', onClick: function () { var next = gravity > 0.01 ? 0 : 1; setGravity(next); persist({ gravity: next }); if (ctx.announceToSR) ctx.announceToSR(next ? 'Gravity field enabled at one model g.' : 'Gravity field disabled.'); }, 'aria-pressed': gravity > 0.01, className: 'rounded-lg px-3 py-2 text-sm font-bold ' + (gravity > 0.01 ? 'bg-amber-300 text-slate-950 shadow-[0_0_18px_rgba(253,224,71,0.3)]' : 'bg-slate-800 text-white hover:bg-slate-700') }, '\u2193 Gravity'),
              h('div', { className: 'flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 p-1', role: 'group', 'aria-label': 'Simulation speed' }, [0.25, 1, 2].map(function (speed) { return h('button', { key: speed, type: 'button', onClick: function () { setTimeScale(speed); persist({ timeScale: speed }); }, 'aria-pressed': timeScale === speed, className: 'rounded px-2 py-1 text-[10px] font-black ' + (timeScale === speed ? 'bg-cyan-300 text-slate-950' : 'text-slate-300 hover:bg-slate-700') }, speed === 0.25 ? 'SLOW' : speed + '\u00D7'); })),
              h('button', { type: 'button', onClick: toggleFullscreen, className: 'rounded-lg bg-slate-800 px-3 py-2 text-sm font-bold text-white hover:bg-slate-700', 'aria-label': isFullscreen ? 'Exit fullscreen particle chamber' : 'Open fullscreen particle chamber' }, isFullscreen ? '\u2922 Exit' : '\u26F6 Fullscreen'),
              h('div', { className: 'ml-auto flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 p-1', role: 'group', 'aria-label': 'Camera views' },
                h('button', { type: 'button', onClick: function () { setCameraShot('hero'); }, className: 'rounded px-2 py-1 text-[10px] font-black uppercase tracking-wide text-cyan-200 hover:bg-slate-700' }, 'Hero'),
                h('button', { type: 'button', onClick: function () { setCameraShot('top'); }, className: 'rounded px-2 py-1 text-[10px] font-black uppercase tracking-wide text-cyan-200 hover:bg-slate-700' }, 'Top'),
                h('button', { type: 'button', onClick: function () { setCameraShot('close'); }, className: 'rounded px-2 py-1 text-[10px] font-black uppercase tracking-wide text-cyan-200 hover:bg-slate-700' }, 'Close'),
                h('button', { type: 'button', onClick: function () { var next = !autoCamera; setAutoCamera(next); persist({ autoCamera: next }); }, 'aria-pressed': autoCamera, className: 'rounded px-2 py-1 text-[10px] font-black uppercase tracking-wide ' + (autoCamera ? 'bg-violet-300 text-slate-950' : 'text-violet-200 hover:bg-slate-700') }, autoCamera ? '\u25C9 Orbiting' : '\u25CE Showcase')
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
              h('input', { type: 'range', min: 24, max: 120, step: 8, value: count, onChange: function (e) { var value = Number(e.target.value); setCount(value); setRunning(false); setResetKey(function (k) { return k + 1; }); persist({ count: value }); }, className: 'mt-1 w-full accent-cyan-600', 'aria-label': 'Particle count' }),
              h('label', { className: 'mt-4 block text-xs font-bold text-slate-700' }, 'Container edge: ', h('output', { className: 'text-cyan-700' }, boxSize + ' u'), h('span', { className: 'ml-1 font-normal text-slate-500' }, '(volume ' + Math.round(boxSize * boxSize * boxSize) + ' u\u00B3)')),
              h('input', { type: 'range', min: 8, max: 15, step: 1, value: boxSize, onChange: function (e) { var value = Number(e.target.value); setBoxSize(value); setRunning(false); setResetKey(function (k) { return k + 1; }); persist({ boxSize: value }); }, className: 'mt-1 w-full accent-cyan-600', 'aria-label': 'Container edge length and volume' }),
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
                h('div', { className: 'flex items-end justify-between gap-3' }, h('div', null, h('div', { className: 'text-[10px] font-black uppercase tracking-[0.16em] text-violet-300' }, preset === 'osmosis' ? 'Osmotic transport' : 'Concentration gradient'), h('div', { className: 'mt-1 text-xl font-black' }, preset === 'osmosis' ? (diffusionInfo.osmoticShift >= 0 ? '+' : '') + Math.round(diffusionInfo.osmoticShift * 100) + '% solvent shift' : Math.round(diffusionInfo.mixing * 100) + '% mixed')), h('div', { className: 'text-right font-mono text-[9px] text-violet-200' }, h('div', null, 'A ' + diffusionInfo.fluxA.toFixed(1) + '/s'), h('div', null, 'B ' + diffusionInfo.fluxB.toFixed(1) + '/s'), h('div', { className: 'text-fuchsia-300' }, 'mB ' + massRatioB.toFixed(1) + '\u00d7'))),
                h('div', { className: 'mt-3 grid grid-cols-3 gap-1.5 text-center' }, (preset === 'osmosis' ? [['Solvent shift', (diffusionInfo.osmoticShift >= 0 ? '+' : '') + Math.round(diffusionInfo.osmoticShift * 100) + '%'], ['Solute leak', Math.round(diffusionInfo.soluteLeak * 100) + '%'], ['D*', diffusionInfo.coefficient.toFixed(2)]] : [['Entropy', Math.round(diffusionInfo.entropy * 100) + '%'], ['D*A', diffusionInfo.coefficientA.toFixed(2)], ['D*B', diffusionInfo.coefficientB.toFixed(2)]]).map(function (item) { return h('div', { key: item[0], className: 'rounded-lg bg-white/[0.06] p-2' }, h('div', { className: 'text-[8px] font-black uppercase tracking-wide text-violet-300' }, item[0]), h('div', { className: 'mt-0.5 font-mono text-xs font-black text-white' }, item[1])); })),
                h('div', { className: 'mt-3 h-2 overflow-hidden rounded-full bg-white/10' }, h('div', { className: 'h-full rounded-full bg-gradient-to-r from-cyan-300 via-violet-300 to-fuchsia-300 transition-all', style: { width: Math.round((preset === 'osmosis' ? diffusionInfo.solventRight : diffusionInfo.mixing) * 100) + '%' } })),
                preset === 'diffusion' && h('div', { className: 'mt-3 rounded-lg border border-white/10 bg-white/[0.04] p-2', role: 'img', 'aria-label': 'Species diffusion race. Particle A root mean square displacement is ' + Math.sqrt(Math.max(0, diffusionInfo.msdA)).toFixed(1) + ' model units with diffusion coefficient ' + diffusionInfo.coefficientA.toFixed(2) + '. Particle B root mean square displacement is ' + Math.sqrt(Math.max(0, diffusionInfo.msdB)).toFixed(1) + ' model units with diffusion coefficient ' + diffusionInfo.coefficientB.toFixed(2) + '.' },
                  h('div', { className: 'flex items-center justify-between text-[8px] font-black uppercase tracking-wide text-slate-300' }, h('span', null, 'Species diffusion race'), h('span', null, 'RMS distance from start')),
                  [['A', diffusionInfo.msdA, diffusionInfo.coefficientA, 'from-cyan-300 to-sky-500'], ['B', diffusionInfo.msdB, diffusionInfo.coefficientB, 'from-fuchsia-300 to-pink-500']].map(function (race) { var rms = Math.sqrt(Math.max(0, race[1])), width = clamp(rms / Math.max(1, boxSize) * 130, 2, 100); return h('div', { key: race[0], className: 'mt-2' }, h('div', { className: 'flex justify-between font-mono text-[9px] text-slate-200' }, h('span', null, race[0] + '  ' + rms.toFixed(1) + ' u'), h('span', null, 'D* ' + race[2].toFixed(2))), h('div', { className: 'mt-1 h-2 overflow-hidden rounded-full bg-white/10' }, h('div', { className: 'h-full rounded-full bg-gradient-to-r transition-all ' + race[3], style: { width: width + '%' } }))); })
                ),
                h('div', { className: 'mt-3 rounded-lg bg-white/[0.04] p-2' },
                  h('div', { className: 'flex items-center justify-between gap-2 text-[8px] font-black uppercase tracking-wide text-slate-300' }, h('span', null, preset === 'osmosis' ? 'Solvent right / solute leak' : 'Mixing / entropy'), h('span', null, 'Last ' + Math.min(14, Math.round(transportTimeline.length * 0.4)) + ' s')),
                  h('svg', { viewBox: '0 0 240 64', className: 'mt-1 h-16 w-full', role: 'img', 'aria-label': preset === 'osmosis' ? 'Recent solvent-right fraction and solute leakage over time.' : 'Recent mixing index and spatial entropy over time.' },
                    h('line', { x1: 4, y1: 56, x2: 236, y2: 56, stroke: 'rgba(203,213,225,0.25)', strokeWidth: 1 }),
                    h('line', { x1: 4, y1: 56 - transportTarget * 48, x2: 236, y2: 56 - transportTarget * 48, stroke: '#fde68a', strokeWidth: 1, strokeDasharray: '4 3' }),
                    h('path', { d: percentPath(transportPrimary), fill: 'none', stroke: '#22d3ee', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' }),
                    h('path', { d: percentPath(transportSecondary), fill: 'none', stroke: '#f472b6', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' })
                  ),
                  h('div', { className: 'flex items-center justify-between gap-2 font-mono text-[9px] text-slate-300' }, h('span', null, preset === 'osmosis' ? 'cyan solvent-right' : 'cyan mixing'), h('span', { className: 'text-yellow-200' }, diffusionInfo.milestoneTime == null ? (preset === 'osmosis' ? 'target +5% shift' : 'target 80% mix') : 'target at ' + diffusionInfo.milestoneTime.toFixed(1) + ' s'), h('span', null, preset === 'osmosis' ? 'pink solute leak' : 'pink entropy'))
                ),
                h('svg', { viewBox: '0 0 240 70', className: 'mt-3 h-[70px] w-full', role: 'img', 'aria-label': 'Ten-zone concentration profile from left to right. Each bar shows percent particle A.' },
                  h('line', { x1: 120, y1: 3, x2: 120, y2: 58, stroke: '#c4b5fd', strokeWidth: 1, strokeDasharray: '3 3' }),
                  (diffusionInfo.profileA || []).map(function (value, i) { var aHeight = clamp(value, 0, 1) * 48, bHeight = 48 - aHeight; return h('g', { key: i }, h('rect', { x: i * 23 + 6, y: 8, width: 17, height: Math.max(1, bHeight), rx: 2, fill: '#f472b6', opacity: 0.78 }), h('rect', { x: i * 23 + 6, y: 56 - aHeight, width: 17, height: Math.max(1, aHeight), rx: 2, fill: '#22d3ee', opacity: 0.88 })); }),
                  h('text', { x: 3, y: 68, fontSize: 8, fill: '#cbd5e1' }, 'left'), h('text', { x: 216, y: 68, fontSize: 8, fill: '#cbd5e1' }, 'right'), h('text', { x: 124, y: 10, fontSize: 7, fill: '#c4b5fd' }, 'membrane')
                ),
                h('div', { className: 'mt-1 flex justify-between font-mono text-[9px] text-slate-300' }, h('span', null, 'A cloud ' + diffusionInfo.spreadA.toFixed(1) + ' u'), h('span', null, diffusionInfo.elapsed.toFixed(1) + ' s'), h('span', null, 'B cloud ' + diffusionInfo.spreadB.toFixed(1) + ' u')),
                h('div', { className: 'mt-1 flex justify-between font-mono text-[9px] text-slate-300' }, h('span', null, 'Left: ' + Math.round(diffusionInfo.leftA * 100) + '% A'), h('span', null, 'Right: ' + Math.round(diffusionInfo.rightA * 100) + '% A'))
              ),
              trace && h('div', { className: 'mt-3 rounded-xl border border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50 p-3', role: 'region', 'aria-label': 'Tracer walk comparison notebook' },
                h('div', { className: 'flex items-center justify-between gap-2' }, h('div', null, h('div', { className: 'text-[10px] font-black uppercase tracking-[0.14em] text-amber-800' }, 'Tracer walk notebook'), h('div', { className: 'mt-0.5 text-[10px] text-amber-900' }, 'Compare mean free path under two conditions')), h('span', { className: 'rounded-full bg-amber-200 px-2 py-1 font-mono text-[9px] font-black text-amber-950' }, tracerTrials.length + '/2 saved')),
                tracerTrials.length ? h('div', { className: 'mt-2 grid grid-cols-2 gap-2' }, tracerTrials.map(function (walk, i) { return h('div', { key: walk.id, className: 'rounded-lg border border-amber-200 bg-white/80 p-2', 'aria-label': 'Walk ' + (i + 1) + ', species ' + walk.species + ', mean free path ' + walk.meanFreePath.toFixed(1) + ', standard error ' + Number(walk.meanFreePathError || 0).toFixed(1) + ' from ' + Number(walk.freeFlightSamples || walk.particleHits || 0) + ' completed flights, kinetic theory estimate ' + Number(walk.theoreticalMeanFreePath || meanFreePathEstimate(walk.count, walk.boxSize)).toFixed(1) + ', collision rate ' + walk.collisionRate.toFixed(2) + ' per second.' }, h('div', { className: 'flex justify-between text-[9px] font-black text-amber-900' }, h('span', null, 'Walk ' + (i + 1) + ' \u2022 ' + walk.species + '-' + walk.particle), h('span', null, walk.temperature + ' K')), h('div', { className: 'mt-1 font-mono text-xs font-black text-slate-900' }, '\u03BB ' + walk.meanFreePath.toFixed(1) + ' u'), h('div', { className: 'mt-0.5 font-mono text-[9px] text-amber-800' }, 'uncertainty +/- ' + Number(walk.meanFreePathError || 0).toFixed(1) + ' u, n=' + Number(walk.freeFlightSamples || walk.particleHits || 0)), h('div', { className: 'mt-0.5 font-mono text-[9px] text-amber-800' }, 'theory ' + Number(walk.theoreticalMeanFreePath || meanFreePathEstimate(walk.count, walk.boxSize)).toFixed(1) + ' u'), h('div', { className: 'mt-0.5 font-mono text-[9px] text-slate-600' }, walk.collisionRate.toFixed(2) + ' hits/s \u2022 N ' + walk.count + ' \u2022 V ' + Math.round(Math.pow(walk.boxSize, 3)))); })) : h('p', { className: 'mt-2 text-[10px] leading-relaxed text-amber-900' }, 'Start a new walk, wait for a particle collision, then use Save walk.'),
                h('p', { className: 'mt-2 text-[9px] leading-relaxed text-amber-900' }, 'Theory uses the hard-sphere kinetic model. Finite walls, membranes, attraction, and short samples can shift the observed value.'),
                tracerComparison && h('div', { className: 'mt-2 rounded-lg bg-amber-950 p-2 text-white', role: 'status' }, h('div', { className: 'text-[8px] font-black uppercase tracking-wide text-amber-300' }, 'Walk 2 minus Walk 1'), h('div', { className: 'mt-1 grid grid-cols-2 gap-1 font-mono text-[9px]' }, h('span', null, '\u0394 mean free path ' + (tracerComparison.meanFreePathDelta >= 0 ? '+' : '') + tracerComparison.meanFreePathDelta.toFixed(1)), h('span', null, '\u0394 rate ' + (tracerComparison.collisionRateDelta >= 0 ? '+' : '') + tracerComparison.collisionRateDelta.toFixed(2)), h('span', null, '\u0394 density ' + (tracerComparison.densityDelta >= 0 ? '+' : '') + tracerComparison.densityDelta.toFixed(3)), h('span', null, '\u0394 temp ' + (tracerComparison.temperatureDelta >= 0 ? '+' : '') + tracerComparison.temperatureDelta.toFixed(0) + ' K')))
              ),
              wallSensors && h('div', { className: 'mt-3 rounded-xl border border-indigo-200 bg-gradient-to-br from-slate-950 to-indigo-950 p-3 text-white', role: 'img', 'aria-label': 'Relative wall impact map. Top ' + Math.round(wallFaceInfo['y+'] * 100) + ' percent, bottom ' + Math.round(wallFaceInfo['y-'] * 100) + ' percent, left ' + Math.round(wallFaceInfo['x-'] * 100) + ' percent, right ' + Math.round(wallFaceInfo['x+'] * 100) + ' percent, front ' + Math.round(wallFaceInfo['z+'] * 100) + ' percent, back ' + Math.round(wallFaceInfo['z-'] * 100) + ' percent.' },
                h('div', { className: 'flex items-center justify-between' }, h('div', null, h('div', { className: 'text-[10px] font-black uppercase tracking-[0.15em] text-indigo-300' }, 'Six-face pressure map'), h('div', { className: 'mt-0.5 text-[10px] text-slate-400' }, 'Relative recent impact load')), h('span', { className: 'h-2 w-2 rounded-sm bg-indigo-300 shadow-[0_0_10px_rgba(165,180,252,0.9)]' })),
                h('div', { className: 'mt-3 grid grid-cols-4 grid-rows-3 gap-1.5' }, pressureFaceCells.map(function (face) { var load = wallFaceInfo[face.key] || 0, hot = load > 0.52; return h('div', { key: face.key, className: face.cls + ' flex min-h-[42px] flex-col items-center justify-center rounded-lg border border-white/10 transition-colors', style: { backgroundColor: 'rgba(129,140,248,' + (0.08 + load * 0.72).toFixed(2) + ')' } }, h('span', { className: 'text-[8px] font-black uppercase tracking-wide ' + (hot ? 'text-white' : 'text-indigo-200') }, face.label), h('span', { className: 'mt-0.5 font-mono text-xs font-black' }, Math.round(load * 100) + '%')); }))
              ),
              h('div', { className: 'mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3' },
                h('div', { className: 'flex items-center justify-between gap-2' }, h('div', null, h('div', { className: 'text-[10px] font-black uppercase tracking-[0.14em] text-slate-500' }, transportMode ? 'Species speed observatory' : 'Particle speed distribution'), h('div', { className: 'mt-0.5 text-xs font-black ' + kineticRegime().tone }, kineticRegime().label)), h('div', { className: 'text-right font-mono text-[9px] text-slate-500' }, transportMode ? h(React.Fragment, null, h('div', { className: 'text-cyan-700' }, 'A mean ' + speciesMotion.a.mean.toFixed(2)), h('div', { className: 'text-fuchsia-700' }, 'B mean ' + speciesMotion.b.mean.toFixed(2))) : h(React.Fragment, null, h('div', null, 'mean ' + distribution.mean.toFixed(2)), h('div', null, 'p90 ' + distribution.p90.toFixed(2))))),
                h('svg', { viewBox: '0 0 240 72', className: 'mt-2 h-[72px] w-full overflow-visible', role: 'img', 'aria-label': transportMode ? 'Paired histogram of particle A and B speeds. A mean speed ' + speciesMotion.a.mean.toFixed(2) + ' and effective temperature ' + speciesMotion.a.temperature + ' kelvin. B mean speed ' + speciesMotion.b.mean.toFixed(2) + ' and effective temperature ' + speciesMotion.b.temperature + ' kelvin.' : 'Histogram of current particle speeds. Mean speed ' + distribution.mean.toFixed(2) + ', ninetieth percentile ' + distribution.p90.toFixed(2) + '.' },
                  h('defs', null, h('linearGradient', { id: 'particleSpeedGradient', x1: '0%', x2: '100%' }, h('stop', { offset: '0%', stopColor: '#22d3ee' }), h('stop', { offset: '55%', stopColor: '#818cf8' }), h('stop', { offset: '100%', stopColor: '#fb7185' }))),
                  transportMode ? speciesMotion.a.bins.map(function (value, i) { var allFractions = speciesMotion.a.bins.concat(speciesMotion.b.bins).concat([0.01]), peak = Math.max.apply(Math, allFractions), heightA = value / peak * 50, heightB = speciesMotion.b.bins[i] / peak * 50; return h('g', { key: i }, h('rect', { x: i * 20 + 3, y: 58 - heightA, width: 6, height: Math.max(1, heightA), rx: 2, fill: '#22d3ee', opacity: 0.9 }), h('rect', { x: i * 20 + 10, y: 58 - heightB, width: 6, height: Math.max(1, heightB), rx: 2, fill: '#f472b6', opacity: 0.86 })); }) : distribution.bins.map(function (value, i) { var peak = Math.max.apply(Math, distribution.bins.concat([1])), height = value / peak * 52; return h('rect', { key: i, x: i * 20 + 3, y: 58 - height, width: 14, height: Math.max(1, height), rx: 3, fill: 'url(#particleSpeedGradient)', opacity: 0.88 }); }),
                  h('line', { x1: 0, y1: 59, x2: 240, y2: 59, stroke: '#cbd5e1', strokeWidth: 1 }), h('text', { x: 2, y: 70, fontSize: 8, fill: '#64748b' }, 'slower'), h('text', { x: 215, y: 70, fontSize: 8, fill: '#64748b' }, 'faster')
                ),
                transportMode && h('div', { className: 'mt-2 grid grid-cols-2 gap-2', role: 'group', 'aria-label': 'Species kinetic temperature comparison' }, h('div', { className: 'rounded-lg border border-cyan-200 bg-cyan-50 p-2' }, h('div', { className: 'text-[8px] font-black uppercase tracking-wide text-cyan-800' }, 'A kinetic temperature'), h('div', { className: 'mt-0.5 font-mono text-sm font-black text-cyan-950' }, speciesMotion.a.temperature + ' K')), h('div', { className: 'rounded-lg border border-fuchsia-200 bg-fuchsia-50 p-2' }, h('div', { className: 'text-[8px] font-black uppercase tracking-wide text-fuchsia-800' }, 'B kinetic temperature'), h('div', { className: 'mt-0.5 font-mono text-sm font-black text-fuchsia-950' }, speciesMotion.b.temperature + ' K'))),
                transportMode && h('div', { className: 'mt-2 rounded-lg border border-slate-200 bg-white p-2' },
                  h('div', { className: 'flex flex-wrap items-center justify-between gap-2' }, h('div', null, h('div', { className: 'text-[8px] font-black uppercase tracking-wide text-slate-500' }, 'Thermalization experiment'), h('div', { className: 'font-mono text-[10px] font-black ' + (thermalGapPercent <= 10 ? 'text-emerald-700' : 'text-amber-700'), role: 'status', 'aria-live': 'polite' }, thermalGapPercent <= 10 ? 'Near equilibrium' : thermalGapPercent + '% temperature gap')), h('div', { className: 'flex gap-1' }, h('button', { type: 'button', onClick: function () { pulseSpeciesHeat(1, 1.8); }, className: 'rounded-md bg-fuchsia-600 px-2 py-1 text-[9px] font-black text-white hover:bg-fuchsia-500', 'aria-label': 'Apply a heat pulse that raises particle B kinetic temperature by eighty percent' }, 'Heat B +80%'), h('button', { type: 'button', onClick: function () { pulseSpeciesHeat(1, 0.55); }, className: 'rounded-md bg-cyan-700 px-2 py-1 text-[9px] font-black text-white hover:bg-cyan-600', 'aria-label': 'Apply a cooling pulse that lowers particle B kinetic temperature by forty-five percent' }, 'Cool B -45%'))),
                  h('svg', { viewBox: '0 0 240 64', className: 'mt-2 h-14 w-full', role: 'img', 'aria-label': 'Recent species temperature traces. Particle A is ' + speciesMotion.a.temperature + ' kelvin and particle B is ' + speciesMotion.b.temperature + ' kelvin. The temperature gap is ' + thermalGapPercent + ' percent.' },
                    h('line', { x1: 4, y1: 56, x2: 236, y2: 56, stroke: '#cbd5e1', strokeWidth: 1 }),
                    h('path', { d: sharedScalePath(thermalA, thermalMin, thermalMax), fill: 'none', stroke: '#0891b2', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' }),
                    h('path', { d: sharedScalePath(thermalB, thermalMin, thermalMax), fill: 'none', stroke: '#db2777', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' })
                  ),
                  h('div', { className: 'flex justify-between font-mono text-[9px] text-slate-500' }, h('span', null, 'cyan A'), h('span', null, thermalTimeline.length < 2 ? 'Apply a pulse to begin' : 'collisional energy exchange'), h('span', null, 'pink B'))
                ),
                h('div', { className: 'mt-2' }, h('div', { className: 'relative h-2 overflow-hidden rounded-full bg-gradient-to-r from-sky-400 via-violet-500 to-rose-500' }, h('span', { className: 'absolute top-1/2 h-4 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-slate-950 shadow', style: { left: clamp((stats.temperature - 40) / 860 * 100, 0, 100) + '%' } })), h('p', { className: 'mt-1 text-[9px] leading-relaxed text-slate-500' }, transportMode ? 'Equal temperature means equal average kinetic energy, not equal speed. Pulse one species, then watch collisions redistribute energy.' : kineticRegime().note))
              ),
              h('div', { className: 'mt-3 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 p-3 text-white shadow-[0_12px_30px_rgba(15,23,42,0.22)]' },
                h('div', { className: 'flex items-center justify-between gap-3' }, h('div', null, h('div', { className: 'text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300' }, 'Live telemetry array'), h('div', { className: 'mt-0.5 text-[9px] text-slate-400' }, 'Recent 14-second signal window')), h('div', { className: 'flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wide text-emerald-300' }, h('span', { className: 'relative flex h-2 w-2' }, h('span', { className: 'absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-50' }), h('span', { className: 'relative inline-flex h-2 w-2 rounded-full bg-emerald-300' })), running ? 'Streaming' : 'Paused')),
                h('div', { className: 'mt-3 grid grid-cols-2 gap-2' }, telemetrySeries.map(function (metric) {
                  var trendSymbol = metric.trend.direction === 'rising' ? '\u2197' : metric.trend.direction === 'falling' ? '\u2198' : '\u2192';
                  var path = graphPath(metric.values), lastX = metric.values.length > 1 ? 240 : 0;
                  var span = Math.max(1, metric.trend.max - metric.trend.min), lastY = 56 - (metric.current - metric.trend.min) / span * 48;
                  lastY = clamp(lastY, 8, 56);
                  return h('div', { key: metric.key, className: 'relative overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] p-2', style: { boxShadow: 'inset 0 0 24px ' + metric.glow } },
                    h('div', { className: 'flex items-start justify-between gap-1' }, h('div', null, h('div', { className: 'text-[8px] font-black uppercase tracking-[0.12em] text-slate-400' }, metric.short), h('div', { className: 'mt-0.5 font-mono text-sm font-black text-white' }, metric.current.toFixed(metric.decimals), h('span', { className: 'ml-1 text-[8px] font-bold text-slate-400' }, metric.unit))), h('span', { className: 'font-mono text-[9px] font-black', style: { color: metric.color }, 'aria-label': metric.trend.direction }, trendSymbol + ' ' + metric.trend.direction)),
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
              h('button', { type: 'button', onClick: recordTrial, className: 'mt-3 w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-black text-white hover:bg-slate-800' }, '\uD83D\uDCCC Record this trial'),
              trials.length > 0 && h('div', { className: 'mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1' }, trials.map(function (trial, i) { return h('button', { key: trial.id, type: 'button', onClick: function () { restoreTrial(trial); }, className: 'rounded-xl border border-slate-200 bg-white p-3 text-left text-[11px] transition hover:border-cyan-400 hover:shadow-sm', 'aria-label': 'Restore Trial ' + (i + 1) + ' conditions' }, h('div', { className: 'flex items-center justify-between' }, h('strong', { className: 'text-cyan-700' }, 'Trial ' + (i + 1)), h('span', { className: 'text-[9px] font-black uppercase tracking-wide text-slate-400' }, '\u21BA Restore')), h('div', { className: 'mt-1 font-mono text-slate-700' }, trial.temperature + ' K \u2022 P ' + trial.pressure + ' \u2022 N ' + trial.count), h('div', { className: 'mt-1 text-slate-500' }, 'Volume ' + Math.round(trial.boxSize * trial.boxSize * trial.boxSize) + ' u\u00B3 \u2022 attraction ' + Number(trial.attraction || 0).toFixed(2) + ' \u2022 gravity ' + Number(trial.gravity || 0).toFixed(1) + ' g*' + (isTransportPreset(trial.preset) ? ' \u2022 mB ' + Number(trial.massRatioB || 1).toFixed(1) + '\u00d7 \u2022 ' + (trial.membraneSelectivity || 'both') + ' membrane \u2022 ' + (trial.preset === 'osmosis' ? 'osm ' + (Number(trial.osmoticShift || 0) >= 0 ? '+' : '') + Math.round(Number(trial.osmoticShift || 0) * 100) + '%' : 'mix ' + Math.round(Number(trial.mixing || 0) * 100) + '%') : ''))); })),
              trialComparison && h('div', { className: 'mt-3 overflow-hidden rounded-xl border ' + (trialComparison.fair ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50') },
                h('div', { className: 'flex items-center justify-between gap-2 px-3 py-2 ' + (trialComparison.fair ? 'bg-emerald-100/70' : 'bg-amber-100/70') }, h('strong', { className: 'text-xs ' + (trialComparison.fair ? 'text-emerald-900' : 'text-amber-900') }, trialComparison.fair ? '\u2713 Fair one-variable test' : '\u26A0 Confounded comparison'), h('span', { className: 'text-[9px] font-black uppercase tracking-wide text-slate-600' }, trialComparison.fair ? 'Changed: ' + trialComparison.changedVariable : trialComparison.changed.length + ' variables changed')),
                h('div', { className: 'grid grid-cols-2 gap-px bg-white/70 p-px text-center' }, [['\u0394 Temp', trialComparison.temperatureDelta.toFixed(0) + ' K'], ['\u0394 Pressure', trialComparison.pressureDelta.toFixed(1)], ['\u0394 Count', (trialComparison.countDelta > 0 ? '+' : '') + trialComparison.countDelta], ['\u0394 Volume', (trialComparison.volumeDelta > 0 ? '+' : '') + trialComparison.volumeDelta + ' u\u00B3']].map(function (item) { return h('div', { key: item[0], className: 'bg-white/80 p-2' }, h('div', { className: 'text-[9px] font-bold uppercase text-slate-500' }, item[0]), h('div', { className: 'font-mono text-xs font-black text-slate-900' }, item[1])); })),
                !trialComparison.fair && h('p', { className: 'px-3 py-2 text-[10px] leading-relaxed text-amber-900' }, 'Changed variables: ' + trialComparison.changed.join(', ') + '. Change only one input to make a stronger causal claim.')
              )
            ),
            h('div', { className: 'rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-indigo-50 p-4 text-sm text-slate-700' },
              h('div', { className: 'flex items-center justify-between gap-2' }, h('h3', { className: 'font-black text-cyan-950' }, currentProtocol ? currentProtocol.icon + ' ' + currentProtocol.title : 'Investigation prompt'), currentProtocol && h('span', { className: 'rounded-full bg-white px-2 py-1 text-[9px] font-black uppercase tracking-wide text-indigo-700 shadow-sm' }, currentProtocol.law)),
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
            h('div', null, h('div', { className: 'text-xs text-slate-300' }, h('strong', { className: 'text-cyan-300' }, trials.length + ' trial' + (trials.length === 1 ? '' : 's') + ' recorded'), ' \u2022 ', conclusion.trim().length, ' conclusion characters'), h('div', { className: 'mt-1 text-[9px] text-slate-500' }, ctx.aiHintsEnabled ? 'Notebook text is sent to the coach only when you press Ask lab coach.' : 'AI hints are off; Ask lab coach uses built-in prompts and sends nothing.')),
            h('div', { className: 'flex flex-wrap gap-2' }, h('button', { type: 'button', onClick: requestLabCoach, disabled: isCoaching, className: 'rounded-xl border border-violet-400/40 bg-violet-500/20 px-4 py-2 text-xs font-black text-violet-100 hover:bg-violet-500/30 disabled:cursor-wait disabled:opacity-60' }, isCoaching ? '\u2728 Coach is thinking\u2026' : '\u2728 Ask lab coach'), h('button', { type: 'button', onClick: copyLabReport, className: 'rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-400 px-4 py-2 text-xs font-black text-slate-950 shadow-lg hover:from-cyan-300 hover:to-indigo-300' }, '\uD83D\uDCCB Copy complete lab report'))
          )
        )
      );
    }
  });
})();
