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

  function makeParticles(count, preset, temperature, seed) {
    var random = seeded(seed || 2048);
    var particles = [];
    var speed = Math.sqrt(Math.max(1, temperature) / 120) * 1.5;
    var side = Math.ceil(Math.pow(count, 1 / 3));
    for (var i = 0; i < count; i += 1) {
      var typeB = preset === 'diffusion' && i >= count / 2;
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
      }
      var theta = random() * Math.PI * 2;
      var phi = Math.acos(2 * random() - 1);
      var localSpeed = speed * (0.55 + random() * 0.9);
      particles.push({
        x: x, y: y, z: z,
        vx: localSpeed * Math.sin(phi) * Math.cos(theta),
        vy: localSpeed * Math.cos(phi),
        vz: localSpeed * Math.sin(phi) * Math.sin(theta),
        type: typeB ? 1 : 0,
        homeX: x, homeY: y, homeZ: z
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
    var attraction = settings.attraction;
    var solid = settings.preset === 'solid';
    var i, j;

    for (i = 0; i < particles.length; i += 1) {
      var p = particles[i];
      if (solid) {
        p.vx += (p.homeX - p.x) * 8 * dt;
        p.vy += (p.homeY - p.y) * 8 * dt;
        p.vz += (p.homeZ - p.z) * 8 * dt;
        p.vx *= 0.985; p.vy *= 0.985; p.vz *= 0.985;
      }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      ['x', 'y', 'z'].forEach(function (axis) {
        var vel = 'v' + axis;
        if (p[axis] > half - radius) { impulse += Math.abs(p[vel]) * 2; p[axis] = half - radius; p[vel] = -Math.abs(p[vel]); collisions += 1; if (events.length < 8) events.push({ x: p.x, y: p.y, z: p.z, power: Math.abs(p[vel]) }); }
        if (p[axis] < -half + radius) { impulse += Math.abs(p[vel]) * 2; p[axis] = -half + radius; p[vel] = Math.abs(p[vel]); collisions += 1; if (events.length < 8) events.push({ x: p.x, y: p.y, z: p.z, power: Math.abs(p[vel]) }); }
      });
    }

    for (i = 0; i < particles.length; i += 1) {
      for (j = i + 1; j < particles.length; j += 1) {
        var a = particles[i], b = particles[j];
        var dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
        var d2 = dx * dx + dy * dy + dz * dz;
        if (d2 > 0.0001 && attraction > 0 && d2 < 6.25) {
          var distA = Math.sqrt(d2);
          var force = attraction * 0.42 * (1 - distA / 2.5) * dt;
          a.vx += dx / distA * force; a.vy += dy / distA * force; a.vz += dz / distA * force;
          b.vx -= dx / distA * force; b.vy -= dy / distA * force; b.vz -= dz / distA * force;
        }
        var minD = radius * 2;
        if (d2 > 0.0001 && d2 < minD * minD) {
          var dist = Math.sqrt(d2);
          var nx = dx / dist, ny = dy / dist, nz = dz / dist;
          var overlap = (minD - dist) / 2;
          a.x -= nx * overlap; a.y -= ny * overlap; a.z -= nz * overlap;
          b.x += nx * overlap; b.y += ny * overlap; b.z += nz * overlap;
          var rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny + (b.vz - a.vz) * nz;
          if (rel < 0) {
            a.vx += rel * nx; a.vy += rel * ny; a.vz += rel * nz;
            b.vx -= rel * nx; b.vy -= rel * ny; b.vz -= rel * nz;
            collisions += 1;
            if (events.length < 8) events.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2, power: Math.abs(rel) });
          }
        }
      }
    }
    return { collisions: collisions, impulse: impulse, events: events };
  }

  function metrics(particles, impulse, boxSize, elapsed) {
    var sum = 0;
    particles.forEach(function (p) { sum += p.vx * p.vx + p.vy * p.vy + p.vz * p.vz; });
    var meanV2 = particles.length ? sum / particles.length : 0;
    return {
      temperature: Math.round(meanV2 * 40),
      energy: Math.round(sum * 5) / 10,
      pressure: Math.round((impulse / Math.max(0.001, elapsed)) / (6 * boxSize * boxSize) * 100) / 10
    };
  }

  window.__alloParticleLabPure = { seeded: seeded, makeParticles: makeParticles, advanceParticles: advanceParticles, metrics: metrics };

  window.StemLab.registerTool('particleLab3d', {
    icon: '\u2728',
    label: 'Particle Lab 3D',
    desc: 'Run fully 3D particle experiments with states of matter, gas laws, diffusion, collisions, attraction, live measurements, and particle tracing.',
    color: 'cyan',
    category: 'science',
    questHooks: [
      { id: 'particle_run', label: 'Run a particle experiment', icon: '\u25B6\uFE0F', check: function (d) { return (d.runs || 0) >= 1; }, progress: function (d) { return (d.runs || 0) + '/1'; } },
      { id: 'particle_presets', label: 'Explore all four particle presets', icon: '\uD83E\uDDEA', check: function (d) { return Object.keys(d.presetsSeen || {}).length >= 4; }, progress: function (d) { return Object.keys(d.presetsSeen || {}).length + '/4'; } },
      { id: 'particle_trace', label: 'Trace one particle', icon: '\uD83D\uDCCD', check: function (d) { return !!d.traced; }, progress: function (d) { return d.traced ? 'Done!' : 'Not yet'; } }
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
      var [running, setRunning] = useState(false);
      var [trace, setTrace] = useState(!!bucket.trace);
      var [selectedParticle, setSelectedParticle] = useState(Number.isInteger(bucket.selectedParticle) ? bucket.selectedParticle : 0);
      var [selectedInfo, setSelectedInfo] = useState({ speed: 0, x: 0, y: 0, z: 0 });
      var [vectors, setVectors] = useState(!!bucket.vectors);
      var [flowTrails, setFlowTrails] = useState(!!bucket.flowTrails);
      var [timeScale, setTimeScale] = useState(bucket.timeScale || 1);
      var [isFullscreen, setIsFullscreen] = useState(false);
      var [trials, setTrials] = useState(Array.isArray(bucket.trials) ? bucket.trials.slice(-2) : []);
      var [ready, setReady] = useState(!!(window.THREE && window.THREE.OrbitControls));
      var [stats, setStats] = useState({ temperature: temperature, pressure: 0, energy: 0, collisions: 0 });
      var [history, setHistory] = useState([]);
      var [resetKey, setResetKey] = useState(0);
      var runRef = useRef(false), stepRef = useRef(false), lastUiRef = useRef(0);
      settingsRef.current = { preset: preset, temperature: temperature, count: count, attraction: attraction, boxSize: boxSize, trace: trace, vectors: vectors, flowTrails: flowTrails, timeScale: timeScale, selectedParticle: Math.min(selectedParticle, count - 1) };
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
        var reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setClearColor(0x030712, 1);
        renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.22;
        if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
        var scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0x030712, 0.022);
        var camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100); camera.position.set(11, 8, 13);
        var controls = new THREE.OrbitControls(camera, canvas); controls.enableDamping = true; controls.dampingFactor = 0.08;
        controls.minDistance = 8; controls.maxDistance = 28;
        scene.add(new THREE.HemisphereLight(0xcffafe, 0x172554, 1.15));
        var light = new THREE.DirectionalLight(0xffffff, 1.35); light.position.set(5, 9, 7); scene.add(light);
        var cyanLight = new THREE.PointLight(0x22d3ee, 1.7, 28); cyanLight.position.set(-7, 3, 7); scene.add(cyanLight);
        var pinkLight = new THREE.PointLight(0xf472b6, 1.25, 24); pinkLight.position.set(7, -2, -5); scene.add(pinkLight);
        var starGeo = new THREE.BufferGeometry(), starPositions = [], starRandom = seeded(731);
        for (var si = 0; si < 180; si += 1) { var sr = 13 + starRandom() * 14, st = starRandom() * Math.PI * 2, sp = Math.acos(2 * starRandom() - 1); starPositions.push(sr * Math.sin(sp) * Math.cos(st), sr * Math.cos(sp), sr * Math.sin(sp) * Math.sin(st)); }
        starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
        var starMat = new THREE.PointsMaterial({ color: 0x67e8f9, size: 0.055, transparent: true, opacity: 0.42, depthWrite: false });
        var stars = new THREE.Points(starGeo, starMat); scene.add(stars);
        var boxGeo = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
        var edgeGeo = new THREE.EdgesGeometry(boxGeo), edgeMat = new THREE.LineBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.82 });
        var edges = new THREE.LineSegments(edgeGeo, edgeMat); scene.add(edges);
        var chamberMat = new THREE.MeshPhysicalMaterial({ color: 0x0e7490, transparent: true, opacity: 0.055, roughness: 0.08, metalness: 0.18, side: THREE.BackSide, depthWrite: false });
        var chamber = new THREE.Mesh(boxGeo, chamberMat); scene.add(chamber);
        var grid = new THREE.GridHelper(boxSize, Math.max(8, boxSize * 2), 0x22d3ee, 0x164e63); grid.position.y = -boxSize / 2 - 0.02; grid.material.transparent = true; grid.material.opacity = 0.3; scene.add(grid);
        var baseGeo = new THREE.CylinderGeometry(boxSize * 0.48, boxSize * 0.56, 0.24, 48, 1, true);
        var baseMat = new THREE.MeshStandardMaterial({ color: 0x082f49, emissive: 0x0e7490, emissiveIntensity: 0.55, metalness: 0.72, roughness: 0.24, side: THREE.DoubleSide });
        var base = new THREE.Mesh(baseGeo, baseMat); base.position.y = -boxSize / 2 - 0.17; scene.add(base);
        var sphereGeo = new THREE.SphereGeometry(0.29, 18, 14);
        var mats = [new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x0891b2, emissiveIntensity: 0.42, roughness: 0.2, metalness: 0.14 }), new THREE.MeshStandardMaterial({ color: 0xf472b6, emissive: 0xbe185d, emissiveIntensity: 0.42, roughness: 0.2, metalness: 0.14 })];
        var particles = makeParticles(count, preset, temperature, 2048 + resetKey);
        function makeGlowTexture() {
          var c = document.createElement('canvas'); c.width = c.height = 64; var g = c.getContext('2d');
          var grad = g.createRadialGradient(32, 32, 1, 32, 32, 31); grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.18, 'rgba(255,255,255,.72)'); grad.addColorStop(0.5, 'rgba(80,220,255,.2)'); grad.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = grad; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
        }
        var glowTexture = makeGlowTexture();
        var meshes = [], glows = [];
        particles.forEach(function (p) {
          var m = new THREE.Mesh(sphereGeo, mats[p.type]); m.userData.particleIndex = meshes.length;
          var glowMat = new THREE.SpriteMaterial({ map: glowTexture, color: p.type ? 0xf472b6 : 0x22d3ee, transparent: true, opacity: 0.38, blending: THREE.AdditiveBlending, depthWrite: false });
          var glow = new THREE.Sprite(glowMat); glow.scale.set(1.55, 1.55, 1.55); m.add(glow); scene.add(m); meshes.push(m); glows.push(glow);
        });
        var focusGeo = new THREE.TorusGeometry(0.53, 0.035, 10, 48), focusMat = new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.95 });
        var focusRing = new THREE.Mesh(focusGeo, focusMat); focusRing.visible = false; scene.add(focusRing);
        var attractionGeo = new THREE.BufferGeometry(), attractionMat = new THREE.LineBasicMaterial({ color: 0x818cf8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
        var attractionLines = new THREE.LineSegments(attractionGeo, attractionMat); scene.add(attractionLines);
        var energyRingGeo = new THREE.RingGeometry(boxSize * 0.31, boxSize * 0.315, 64), energyRingMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.32, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
        var energyRing = new THREE.Mesh(energyRingGeo, energyRingMat); energyRing.rotation.x = -Math.PI / 2; energyRing.position.y = -boxSize / 2 + 0.02; scene.add(energyRing);
        var flashPool = [];
        for (var fi = 0; fi < 14; fi += 1) { var fm = new THREE.SpriteMaterial({ map: glowTexture, color: 0xfef08a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }); var fs = new THREE.Sprite(fm); fs.visible = false; scene.add(fs); flashPool.push({ sprite: fs, life: 0 }); }
        var arrows = particles.slice(0, 20).map(function () {
          var arrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1, 0xa5f3fc, 0.24, 0.13);
          arrow.visible = false; scene.add(arrow); return arrow;
        });
        var trailGeo = new THREE.BufferGeometry(); var trailMat = new THREE.LineBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.9 });
        var trail = new THREE.Line(trailGeo, trailMat); scene.add(trail); var trailPoints = [];
        var flowLines = [], flowHistories = [];
        for (var ti = 0; ti < Math.min(10, particles.length); ti += 1) {
          var fg = new THREE.BufferGeometry(), fc = new THREE.Color().setHSL(0.52 + ti * 0.025, 0.9, 0.63);
          var fmLine = new THREE.LineBasicMaterial({ color: fc, transparent: true, opacity: 0.48, blending: THREE.AdditiveBlending, depthWrite: false });
          var fl = new THREE.Line(fg, fmLine); fl.visible = false; scene.add(fl); flowLines.push(fl); flowHistories.push([]);
        }
        var clock = performance.now(), accumulator = 0, collisionTotal = 0, impulseTotal = 0, metricElapsed = 0, pendingFlashEvents = [];
        var raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2(), pointerStart = null;
        function onPointerDown(ev) { pointerStart = { x: ev.clientX, y: ev.clientY }; }
        function onPointerUp(ev) {
          if (!pointerStart || Math.hypot(ev.clientX - pointerStart.x, ev.clientY - pointerStart.y) > 6) return;
          var rect = canvas.getBoundingClientRect(); pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1; pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(pointer, camera); var hits = raycaster.intersectObjects(meshes, false);
          if (hits.length) { var index = hits[0].object.userData.particleIndex || 0; setSelectedParticle(index); setTrace(true); persist({ selectedParticle: index, trace: true, traced: true }); if (ctx.announceToSR) ctx.announceToSR('Selected particle ' + (index + 1) + ' for tracing.'); trailPoints.length = 0; }
        }
        canvas.addEventListener('pointerdown', onPointerDown); canvas.addEventListener('pointerup', onPointerUp);

        function resize() {
          var w = Math.max(1, canvas.clientWidth), hh = Math.max(1, canvas.clientHeight);
          if (canvas.width !== w || canvas.height !== hh) { renderer.setSize(w, hh, false); camera.aspect = w / hh; camera.updateProjectionMatrix(); }
        }
        function animate(now) {
          frameRef.current = requestAnimationFrame(animate); resize(); controls.update();
          var elapsed = Math.min(0.05, (now - clock) / 1000); clock = now;
          if (runRef.current || stepRef.current) {
            accumulator += stepRef.current ? 1 / 60 : elapsed * settingsRef.current.timeScale; stepRef.current = false;
            while (accumulator >= 1 / 120) {
              var result = advanceParticles(particles, settingsRef.current, 1 / 120);
              collisionTotal += result.collisions; impulseTotal += result.impulse; metricElapsed += 1 / 120; accumulator -= 1 / 120;
              if (!reducedMotion && result.events && result.events.length) pendingFlashEvents = pendingFlashEvents.concat(result.events).slice(-14);
            }
          }
          particles.forEach(function (p, i) {
            var speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy + p.vz * p.vz);
            meshes[i].position.set(p.x, p.y, p.z);
            var pulse = 1 + Math.sin(now * 0.003 + i * 0.7) * 0.045;
            meshes[i].scale.setScalar(pulse + clamp(speed * 0.012, 0, 0.12));
            glows[i].material.opacity = clamp(0.2 + speed * 0.055, 0.22, 0.72);
            var gs = clamp(1.25 + speed * 0.16, 1.35, 2.5); glows[i].scale.set(gs, gs, gs);
          });
          stars.rotation.y += elapsed * 0.018; stars.rotation.x = Math.sin(now * 0.00008) * 0.08;
          var thermal = clamp((settingsRef.current.temperature - 40) / 860, 0, 1);
          cyanLight.color.setHSL(0.52 - thermal * 0.48, 0.92, 0.58); pinkLight.color.setHSL(0.91 + thermal * 0.07, 0.9, 0.62);
          cyanLight.intensity = 1.45 + thermal * 0.85 + (reducedMotion ? 0 : Math.sin(now * 0.0014) * 0.16);
          mats[0].emissiveIntensity = 0.32 + thermal * 0.62; mats[1].emissiveIntensity = 0.32 + thermal * 0.62;
          if (!reducedMotion) { energyRing.rotation.z += elapsed * (0.18 + thermal * 0.5); energyRing.material.opacity = 0.2 + thermal * 0.28 + Math.sin(now * 0.002) * 0.06; }
          while (pendingFlashEvents.length) { var ev = pendingFlashEvents.shift(), slot = flashPool.find(function (f) { return f.life <= 0; }) || flashPool[0]; slot.life = 1; slot.sprite.visible = true; slot.sprite.position.set(ev.x, ev.y, ev.z); var es = clamp(0.28 + ev.power * 0.13, 0.32, 1.25); slot.sprite.scale.set(es, es, es); }
          flashPool.forEach(function (f) { if (f.life <= 0) return; f.life -= elapsed * 4.5; f.sprite.material.opacity = Math.max(0, f.life) * 0.88; var sc = f.sprite.scale.x + elapsed * 1.8; f.sprite.scale.set(sc, sc, sc); if (f.life <= 0) f.sprite.visible = false; });
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
          var selected = particles[settingsRef.current.selectedParticle] || particles[0];
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
            lastUiRef.current = now; var m = metrics(particles, impulseTotal, settingsRef.current.boxSize, metricElapsed);
            var next = { temperature: m.temperature, pressure: m.pressure, energy: m.energy, collisions: collisionTotal };
            setStats(next); setHistory(function (old) { return old.concat([m.temperature]).slice(-36); });
            if (selected) setSelectedInfo({ speed: Math.sqrt(selected.vx * selected.vx + selected.vy * selected.vy + selected.vz * selected.vz), x: selected.x, y: selected.y, z: selected.z });
            collisionTotal = 0; impulseTotal = 0; metricElapsed = 0;
          }
          renderer.render(scene, camera);
        }
        runtimeRef.current = { renderer: renderer, scene: scene, particles: particles, camera: camera, controls: controls };
        frameRef.current = requestAnimationFrame(animate);
        return function () {
          cancelAnimationFrame(frameRef.current); canvas.removeEventListener('pointerdown', onPointerDown); canvas.removeEventListener('pointerup', onPointerUp); controls.dispose(); boxGeo.dispose(); edgeGeo.dispose(); baseGeo.dispose(); sphereGeo.dispose(); focusGeo.dispose(); attractionGeo.dispose(); energyRingGeo.dispose(); starGeo.dispose(); trailGeo.dispose(); trailMat.dispose(); flowLines.forEach(function (line) { line.geometry.dispose(); line.material.dispose(); }); edgeMat.dispose(); chamberMat.dispose(); baseMat.dispose(); focusMat.dispose(); attractionMat.dispose(); energyRingMat.dispose(); starMat.dispose(); glowTexture.dispose(); flashPool.forEach(function (f) { f.sprite.material.dispose(); }); glows.forEach(function (g) { g.material.dispose(); }); arrows.forEach(function (a) { scene.remove(a); }); mats.forEach(function (m) { m.dispose(); }); renderer.dispose(); runtimeRef.current = null;
        };
      }, [ready, preset, count, boxSize, resetKey]);

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
      function choosePreset(next) {
        setPreset(next); setRunning(false); setHistory([]); setResetKey(function (k) { return k + 1; });
        var seen = Object.assign({}, bucket.presetsSeen || {}); seen[next] = true;
        persist({ preset: next, presetsSeen: seen });
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
          var current = metrics(rt.particles, 0, boxSize, 1).temperature || 1;
          var scale = Math.sqrt(value / current);
          rt.particles.forEach(function (p) { p.vx *= scale; p.vy *= scale; p.vz *= scale; });
        }
      }
      function setCameraShot(shot) {
        var rt = runtimeRef.current; if (!rt || !rt.camera || !rt.controls) return;
        var positions = { hero: [boxSize * 1.05, boxSize * 0.74, boxSize * 1.18], top: [0.01, boxSize * 1.65, 0.01], close: [boxSize * 0.72, boxSize * 0.35, boxSize * 0.78] };
        var pos = positions[shot] || positions.hero; rt.camera.position.set(pos[0], pos[1], pos[2]); rt.controls.target.set(0, 0, 0); rt.controls.update();
        if (ctx.announceToSR) ctx.announceToSR('Camera changed to ' + shot + ' view.');
      }
      function recordTrial() {
        var trial = { id: Date.now(), preset: preset, temperature: stats.temperature, pressure: stats.pressure, count: count, boxSize: boxSize, attraction: attraction };
        var next = trials.concat([trial]).slice(-2); setTrials(next); persist({ trials: next, trialsRecorded: (bucket.trialsRecorded || 0) + 1 });
        if (ctx.announceToSR) ctx.announceToSR('Recorded trial at ' + trial.temperature + ' kelvin and pressure ' + trial.pressure + ' model units.');
      }
      function modelSummary() {
        if (!running) return 'The model is paused. Change one variable, record a trial, then run again.';
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

      var presets = [
        { id: 'solid', icon: '\u2744\uFE0F', label: 'Solid', note: 'Particles vibrate near fixed positions.' },
        { id: 'liquid', icon: '\uD83D\uDCA7', label: 'Liquid', note: 'Particles stay close but flow past one another.' },
        { id: 'gas', icon: '\uD83C\uDF2C\uFE0F', label: 'Gas', note: 'Particles spread out and collide with the walls.' },
        { id: 'diffusion', icon: '\uD83D\uDFE3', label: 'Diffusion', note: 'Two particle populations begin on opposite sides.' }
      ];

      return h('div', { className: 'max-w-7xl mx-auto space-y-4 animate-in fade-in duration-300' },
        h('div', { className: 'rounded-2xl border border-cyan-200 bg-gradient-to-r from-slate-950 via-cyan-950 to-slate-900 p-5 text-white shadow-xl' },
          h('div', { className: 'flex flex-wrap items-start justify-between gap-3' },
            h('div', null, h('p', { className: 'text-xs font-black uppercase tracking-[0.2em] text-cyan-300' }, 'Interactive physics sandbox'), h('h2', { className: 'mt-1 text-2xl font-black' }, '\u2728 Particle Lab 3D'), h('p', { className: 'mt-2 max-w-3xl text-sm leading-relaxed text-cyan-50' }, 'Change the conditions, run the model, and use measurements to explain what the particles do. Drag to rotate, scroll to zoom, and pause to inspect any moment.')),
            h('div', { className: 'rounded-xl border border-cyan-700/60 bg-slate-950/60 px-3 py-2 text-xs text-cyan-100' }, 'Simplified model \u2022 equal-mass particles \u2022 fixed timestep')
          )
        ),
        h('div', { className: 'grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]' },
          h('section', { ref: stageRef, className: 'overflow-hidden border border-cyan-500/30 bg-slate-950 shadow-2xl shadow-cyan-950/40 ring-1 ring-white/5 ' + (isFullscreen ? 'h-screen rounded-none flex flex-col' : 'rounded-[24px]'), 'aria-label': 'Three-dimensional particle simulation' },
            h('div', { className: 'flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 px-4 py-3' },
              h('div', { className: 'flex flex-wrap gap-2' }, presets.map(function (p) { return h('button', { key: p.id, type: 'button', onClick: function () { choosePreset(p.id); }, 'aria-pressed': preset === p.id, className: 'rounded-xl border px-3 py-2 text-xs font-bold transition-all ' + (preset === p.id ? 'border-cyan-200 bg-cyan-300 text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.35)]' : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-500/50 hover:bg-slate-800') }, p.icon + ' ' + p.label); })),
              h('span', { className: 'text-xs text-slate-400' }, ready ? presets.filter(function (p) { return p.id === preset; })[0].note : 'Loading the 3D engine\u2026')
            ),
            h('div', { className: 'relative min-h-[380px] overflow-hidden bg-slate-950 ' + (isFullscreen ? 'flex-1' : 'h-[520px]') },
              h('canvas', { ref: canvasRef, className: 'h-full w-full saturate-[1.15] contrast-[1.04]', role: 'img', 'aria-label': preset + ' particle simulation in a transparent cubic container. Current measured temperature ' + stats.temperature + ' kelvin and pressure ' + stats.pressure + ' model units.' }),
              h('div', { className: 'pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(2,6,23,0.7)_100%)]' }),
              h('div', { className: 'pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent shadow-[0_0_18px_4px_rgba(34,211,238,0.35)]' }),
              h('div', { className: 'pointer-events-none absolute right-3 top-3 min-w-[150px] rounded-xl border border-cyan-300/20 bg-slate-950/65 p-3 text-right shadow-lg backdrop-blur-md' },
                h('div', { className: 'text-[9px] font-black uppercase tracking-[0.22em] text-cyan-300' }, preset + ' chamber'),
                h('div', { className: 'mt-1 font-mono text-xl font-black text-white' }, stats.temperature + ' K'),
                h('div', { className: 'mt-1 flex justify-end gap-3 font-mono text-[10px] text-slate-300' }, h('span', null, 'P ' + stats.pressure), h('span', null, 'N ' + count), h('span', null, 'V ' + Math.round(boxSize * boxSize * boxSize)))
              ),
              running && h('div', { className: 'pointer-events-none absolute bottom-3 right-3 flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-950/60 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-300 backdrop-blur' }, h('span', { className: 'h-2 w-2 animate-pulse rounded-full bg-emerald-300 shadow-[0_0_10px_2px_rgba(110,231,183,0.7)]' }), 'Live simulation'),
              !ready && h('div', { className: 'absolute inset-0 flex items-center justify-center bg-slate-950 text-sm font-bold text-cyan-200' }, 'Loading Three.js\u2026'),
              h('div', { className: 'pointer-events-none absolute left-3 top-3 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-[11px] text-slate-300 shadow-lg backdrop-blur' }, h('div', { className: 'font-black uppercase tracking-wider text-cyan-300' }, 'Chamber controls'), h('div', { className: 'mt-1' }, 'Click: select \u2022 Drag: orbit \u2022 Wheel: zoom')),
              trace && h('div', { className: 'pointer-events-none absolute bottom-3 left-3 min-w-[190px] rounded-xl border border-yellow-200/50 bg-yellow-300/90 px-3 py-2 text-slate-950 shadow-[0_0_24px_rgba(253,224,71,0.28)] backdrop-blur' }, h('div', { className: 'text-[9px] font-black uppercase tracking-[0.18em]' }, 'Tracked particle ' + (selectedParticle + 1)), h('div', { className: 'mt-1 font-mono text-xs font-black' }, 'speed ' + selectedInfo.speed.toFixed(2) + ' u/s'), h('div', { className: 'mt-0.5 font-mono text-[9px]' }, 'x ' + selectedInfo.x.toFixed(1) + '  y ' + selectedInfo.y.toFixed(1) + '  z ' + selectedInfo.z.toFixed(1)))
            ),
            h('div', { className: 'flex flex-wrap items-center gap-2 border-t border-slate-700 p-3' },
              h('button', { type: 'button', onClick: toggleRun, className: 'rounded-lg bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-400' }, running ? '\u23F8 Pause' : '\u25B6 Run'),
              h('button', { type: 'button', onClick: function () { setRunning(false); stepRef.current = true; }, className: 'rounded-lg bg-slate-800 px-3 py-2 text-sm font-bold text-white hover:bg-slate-700' }, '\u23ED Step'),
              h('button', { type: 'button', onClick: function () { setRunning(false); setHistory([]); setResetKey(function (k) { return k + 1; }); }, className: 'rounded-lg bg-slate-800 px-3 py-2 text-sm font-bold text-white hover:bg-slate-700' }, '\u21BB Reset'),
              h('button', { type: 'button', onClick: function () { var next = !trace; setTrace(next); persist({ trace: next, traced: next || bucket.traced }); }, 'aria-pressed': trace, className: 'rounded-lg px-3 py-2 text-sm font-bold ' + (trace ? 'bg-yellow-300 text-slate-950' : 'bg-slate-800 text-white hover:bg-slate-700') }, '\uD83D\uDCCD Trace'),
              h('button', { type: 'button', onClick: function () { var next = !vectors; setVectors(next); persist({ vectors: next }); }, 'aria-pressed': vectors, className: 'rounded-lg px-3 py-2 text-sm font-bold ' + (vectors ? 'bg-cyan-200 text-slate-950' : 'bg-slate-800 text-white hover:bg-slate-700') }, '\u2197 Velocity'),
              h('button', { type: 'button', onClick: function () { var next = !flowTrails; setFlowTrails(next); persist({ flowTrails: next }); }, 'aria-pressed': flowTrails, className: 'rounded-lg px-3 py-2 text-sm font-bold ' + (flowTrails ? 'bg-violet-300 text-slate-950' : 'bg-slate-800 text-white hover:bg-slate-700') }, '\u223F Flow trails'),
              h('div', { className: 'flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 p-1', role: 'group', 'aria-label': 'Simulation speed' }, [0.25, 1, 2].map(function (speed) { return h('button', { key: speed, type: 'button', onClick: function () { setTimeScale(speed); persist({ timeScale: speed }); }, 'aria-pressed': timeScale === speed, className: 'rounded px-2 py-1 text-[10px] font-black ' + (timeScale === speed ? 'bg-cyan-300 text-slate-950' : 'text-slate-300 hover:bg-slate-700') }, speed === 0.25 ? 'SLOW' : speed + '\u00D7'); })),
              h('button', { type: 'button', onClick: toggleFullscreen, className: 'rounded-lg bg-slate-800 px-3 py-2 text-sm font-bold text-white hover:bg-slate-700', 'aria-label': isFullscreen ? 'Exit fullscreen particle chamber' : 'Open fullscreen particle chamber' }, isFullscreen ? '\u2922 Exit' : '\u26F6 Fullscreen'),
              h('div', { className: 'ml-auto flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 p-1', role: 'group', 'aria-label': 'Camera views' },
                h('button', { type: 'button', onClick: function () { setCameraShot('hero'); }, className: 'rounded px-2 py-1 text-[10px] font-black uppercase tracking-wide text-cyan-200 hover:bg-slate-700' }, 'Hero'),
                h('button', { type: 'button', onClick: function () { setCameraShot('top'); }, className: 'rounded px-2 py-1 text-[10px] font-black uppercase tracking-wide text-cyan-200 hover:bg-slate-700' }, 'Top'),
                h('button', { type: 'button', onClick: function () { setCameraShot('close'); }, className: 'rounded px-2 py-1 text-[10px] font-black uppercase tracking-wide text-cyan-200 hover:bg-slate-700' }, 'Close')
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
              h('input', { type: 'range', min: 0, max: 1.5, step: 0.05, value: attraction, onChange: function (e) { var value = Number(e.target.value); setAttraction(value); persist({ attraction: value }); }, className: 'mt-1 w-full accent-cyan-600', 'aria-label': 'Interparticle attraction strength' })
            ),
            h('div', { className: 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm' },
              h('h3', { className: 'font-black text-slate-900' }, 'Live measurements'),
              h('div', { className: 'mt-3 grid grid-cols-2 gap-2' },
                [['Temperature', stats.temperature + ' K'], ['Pressure', stats.pressure + ' u'], ['Kinetic energy', stats.energy + ' u'], ['Collisions', stats.collisions + ' / sample']].map(function (m) { return h('div', { key: m[0], className: 'rounded-xl bg-slate-100 p-3' }, h('div', { className: 'text-[10px] font-bold uppercase tracking-wide text-slate-500' }, m[0]), h('div', { className: 'mt-1 text-lg font-black text-slate-900' }, m[1])); })
              ),
              h('div', { className: 'mt-3' }, h('div', { className: 'text-[10px] font-bold uppercase tracking-wide text-slate-500' }, 'Temperature over time'), h('svg', { viewBox: '0 0 240 64', className: 'mt-1 h-16 w-full rounded-lg bg-slate-950', role: 'img', 'aria-label': 'Recent temperature trend graph' }, h('path', { d: graphPath(history), fill: 'none', stroke: '#22d3ee', strokeWidth: 2.5, vectorEffect: 'non-scaling-stroke' }))),
              h('p', { role: 'status', 'aria-live': 'polite', className: 'mt-3 rounded-lg bg-cyan-50 p-2 text-xs leading-relaxed text-cyan-950' }, modelSummary()),
              h('button', { type: 'button', onClick: recordTrial, className: 'mt-3 w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-black text-white hover:bg-slate-800' }, '\uD83D\uDCCC Record this trial'),
              trials.length > 0 && h('div', { className: 'mt-3 space-y-2' }, trials.map(function (trial, i) { return h('div', { key: trial.id, className: 'grid grid-cols-[auto_1fr] gap-x-2 rounded-lg border border-slate-200 p-2 text-[11px]' }, h('strong', { className: 'text-cyan-700' }, 'Trial ' + (i + 1)), h('span', null, trial.temperature + ' K \u2022 P ' + trial.pressure + ' \u2022 N ' + trial.count + ' \u2022 V ' + Math.round(trial.boxSize * trial.boxSize * trial.boxSize))); })),
              trials.length === 2 && h('p', { className: 'mt-2 text-xs font-bold text-slate-700' }, 'Pressure changed by ' + (trials[1].pressure - trials[0].pressure).toFixed(1) + ' model units from Trial 1 to Trial 2.')
            ),
            h('div', { className: 'rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-slate-700' }, h('h3', { className: 'font-black text-cyan-950' }, 'Investigation prompt'), h('p', { className: 'mt-2 leading-relaxed' }, preset === 'diffusion' ? 'Predict: Will raising temperature make the two colors mix faster? What measurement or visual evidence would support your answer?' : 'Predict: If temperature rises while the box stays the same size, what will happen to wall collisions and pressure? Run two trials and compare.')),
            h('button', { type: 'button', onClick: openMoleculeLab, className: 'w-full rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-left text-sm font-black text-indigo-900 hover:bg-indigo-100' }, '\u269B\uFE0F Inspect atoms and molecules in Molecule Lab \u2192')
          )
        )
      );
    }
  });
})();
