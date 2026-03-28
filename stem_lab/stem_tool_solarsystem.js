// stem_tool_solarsystem.js — Solar System Explorer v2.0
// Standalone enhanced module extracted from monolith (ES5)
// Features: 3D Three.js solar system, planet info cards, surface view,
// rover/probe first-person exploration, quiz mode, planet comparison,
// sound effects, grade-band intro, AI tutor, TTS read-aloud, badges

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

if (window.StemLab.isRegistered && window.StemLab.isRegistered('solarSystem')) {
  // already registered — skip
} else {

(function() {
'use strict';

// ═══ SOUND EFFECTS ═══
var _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx) {
    try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
  }
  return _audioCtx;
}

function playTone(freq, dur, type, vol) {
  var ac = getAudioCtx(); if (!ac) return;
  try {
    var osc = ac.createOscillator();
    var gain = ac.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol || 0.12, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (dur || 0.15));
    osc.connect(gain); gain.connect(ac.destination);
    osc.start(); osc.stop(ac.currentTime + (dur || 0.15));
  } catch(e) {}
}

function playSound(type) {
  switch(type) {
    case 'planetSelect':
      playTone(440, 0.08, 'sine', 0.1);
      setTimeout(function() { playTone(660, 0.1, 'sine', 0.12); }, 70);
      break;
    case 'quizCorrect':
      playTone(523, 0.1, 'sine', 0.12);
      setTimeout(function() { playTone(659, 0.1, 'sine', 0.12); }, 80);
      setTimeout(function() { playTone(784, 0.15, 'sine', 0.14); }, 160);
      break;
    case 'quizWrong':
      playTone(220, 0.25, 'sawtooth', 0.08);
      break;
    case 'discovery':
      playTone(587, 0.08, 'sine', 0.1);
      setTimeout(function() { playTone(740, 0.08, 'sine', 0.1); }, 70);
      setTimeout(function() { playTone(880, 0.15, 'sine', 0.14); }, 140);
      break;
    case 'badge':
      playTone(523, 0.08, 'sine', 0.1);
      setTimeout(function() { playTone(659, 0.08, 'sine', 0.1); }, 70);
      setTimeout(function() { playTone(784, 0.08, 'sine', 0.1); }, 140);
      setTimeout(function() { playTone(1047, 0.2, 'sine', 0.14); }, 210);
      break;
    case 'navComplete':
      playTone(440, 0.06, 'sine', 0.1);
      setTimeout(function() { playTone(554, 0.06, 'sine', 0.1); }, 50);
      setTimeout(function() { playTone(659, 0.08, 'sine', 0.1); }, 100);
      setTimeout(function() { playTone(880, 0.15, 'sine', 0.12); }, 150);
      break;
    case 'launch':
      playTone(220, 0.3, 'sawtooth', 0.06);
      setTimeout(function() { playTone(330, 0.2, 'triangle', 0.08); }, 200);
      setTimeout(function() { playTone(440, 0.15, 'sine', 0.1); }, 350);
      break;
    case 'hazard':
      playTone(330, 0.15, 'square', 0.06);
      setTimeout(function() { playTone(220, 0.15, 'square', 0.06); }, 150);
      break;
  }
}

// ═══ GRADE BAND ═══
function getGradeBand(ctx) {
  var gl = ctx.gradeLevel;
  if (!gl && gl !== 0) return 'g35';
  if (gl <= 2) return 'k2';
  if (gl <= 5) return 'g35';
  if (gl <= 8) return 'g68';
  return 'g912';
}

function gradeText(band, k2, g35, g68, g912) {
  if (band === 'k2') return k2;
  if (band === 'g35') return g35;
  if (band === 'g68') return g68;
  return g912;
}

// ═══ REGISTER TOOL ═══
window.StemLab.registerTool('solarSystem', {
  icon: '\uD83C\uDF0D',
  label: 'Solar System Explorer',
  desc: 'Explore the solar system in 3D, land on planets, and discover their secrets',
  color: '#6366f1',
  category: 'science',
  render: function(ctx) {
    var React = ctx.React;
    var h = React.createElement;
    var labToolData = ctx.toolData;
    var setLabToolData = ctx.setToolData;
    var setStemLabTool = ctx.setStemLabTool;
    var toolSnapshots = ctx.toolSnapshots;
    var setToolSnapshots = ctx.setToolSnapshots;
    var addToast = ctx.addToast;
    var ArrowLeft = ctx.icons.ArrowLeft;
    var announceToSR = ctx.announceToSR;
    var awardStemXP = ctx.awardXP;
    var callGemini = ctx.callGemini;
    var callTTS = ctx.callTTS;

    if (!this._SolarSystemComponent) {
      this._SolarSystemComponent = function(props) {
        var ctx = props.ctx;
        var React = ctx.React;
        var h = React.createElement;
        var ArrowLeft = ctx.icons.ArrowLeft;
        var setStemLabTool = ctx.setStemLabTool;
        var addToast = ctx.addToast;
        var awardStemXP = ctx.awardXP;
        var announceToSR = ctx.announceToSR;
        var callGemini = ctx.callGemini;
        var callTTS = ctx.callTTS;
        var setToolSnapshots = ctx.setToolSnapshots;

        // ── State via labToolData ──
        var ld = ctx.toolData || {};
        var d = ld.solarSystem || {};
        var upd = function(key, val) {
          if (typeof ctx.setToolData === 'function') {
            ctx.setToolData(function(prev) {
              var ss = Object.assign({}, (prev && prev.solarSystem) || {});
              ss[key] = val;
              return Object.assign({}, prev, { solarSystem: ss });
            });
          }
        };

        // ── Grade band intro ──
        var band = getGradeBand(ctx);
        var introText = gradeText(band,
          'Explore the planets in our solar system! Click on any planet to learn fun facts.',
          'Our solar system has 8 planets orbiting the Sun. Explore them all and discover their unique features!',
          'The solar system formed ~4.6 billion years ago. Explore planetary science, orbital mechanics, and surface conditions.',
          'Investigate planetary physics, comparative planetology, atmospheric chemistry, and gravitational dynamics.'
        );

        // ── Visited planets tracker ──
        var visitedPlanets = d.visitedPlanets || {};

        var simSpeed = d.simSpeed || 1;
        var paused = d.paused || false;

        // ═══ PLANETS DATA ═══
        var PLANETS = [
          { name: 'Mercury', emoji: '\u2638', color: '#94a3b8', rgb: [0.58, 0.64, 0.72], size: 0.2, dist: 8, speed: 4.15, tilt: 0.03, moons: 0, diameter: '4,879 km', dayLen: '59 Earth days', yearLen: '88 days', temp: '\u2212180 to 430\u00B0C', fact: 'Smallest planet; no atmosphere to retain heat.', gravity: '0.38g', atmosphere: 'Virtually none \u2014 exosphere of O\u2082, Na, H\u2082, He', surface: 'Cratered surface similar to the Moon', notableFeatures: ['Caloris Basin (1,550 km impact crater)', 'Water ice in permanently shadowed polar craters', 'Most cratered planet in the solar system'], skyColor: '#000000', terrainColor: '#8a8278', terrainType: 'cratered', surfaceDesc: 'Dark airless surface pocked with ancient craters beneath a pitch-black sky. The Sun blazes 3\u00D7 larger than on Earth.' },

          { name: 'Venus', emoji: '\u2640', color: '#fbbf24', rgb: [0.98, 0.75, 0.14], size: 0.55, dist: 11, speed: 1.62, tilt: 2.64, moons: 0, diameter: '12,104 km', dayLen: '243 Earth days', yearLen: '225 days', temp: '462\u00B0C avg.', fact: 'Hottest planet due to runaway greenhouse effect. Rotates backwards!', gravity: '0.91g', atmosphere: '96.5% CO\u2082 \u2014 crushingly thick (90x Earth pressure)', surface: 'Volcanic plains with lava flows and pancake domes', notableFeatures: ['Maxwell Montes (11 km high)', 'Thousand+ volcanoes', 'Surface hot enough to melt lead'], skyColor: '#c9803a', terrainColor: '#d4723a', terrainType: 'volcanic', surfaceDesc: 'Orange volcanic hellscape with dense sulfuric acid clouds. Surface pressure would crush a submarine.' },

          { name: 'Earth', emoji: '\uD83C\uDF0D', color: '#3b82f6', rgb: [0.23, 0.51, 0.96], size: 0.6, dist: 14, speed: 1.0, tilt: 0.41, moons: 1, diameter: '12,742 km', dayLen: '24 hours', yearLen: '365.25 days', temp: '15\u00B0C avg.', fact: 'Only known planet with liquid water and life.', gravity: '1.0g', atmosphere: '78% N\u2082, 21% O\u2082 \u2014 the only breathable atmosphere', surface: 'Oceans, continents, ice caps, forests', notableFeatures: ['71% covered in water', 'Magnetic field protecting from solar wind', 'Only known planet with plate tectonics'], skyColor: '#5ba3d9', terrainColor: '#3a8c3a', terrainType: 'earthlike', surfaceDesc: 'Blue skies, green hills, flowing water. The only known world with life.' },

          { name: 'Mars', emoji: '\uD83D\uDD34', color: '#ef4444', rgb: [0.94, 0.27, 0.27], size: 0.35, dist: 18, speed: 0.53, tilt: 0.44, moons: 2, diameter: '6,779 km', dayLen: '24h 37m', yearLen: '687 days', temp: '\u221265\u00B0C avg.', fact: 'Has the tallest volcano in the solar system: Olympus Mons (21.9 km high).', gravity: '0.38g', atmosphere: '95% CO\u2082 \u2014 thin (0.6% of Earth pressure)', surface: 'Red iron-oxide desert with deep canyons', notableFeatures: ['Olympus Mons (21.9 km \u2014 tallest volcano)', 'Valles Marineris (4,000 km canyon)', 'Polar ice caps of CO\u2082 and water'], skyColor: '#c4856b', terrainColor: '#b5452a', terrainType: 'desert', surfaceDesc: 'Rust-red desert beneath a butterscotch sky. Dust devils dance across the barren plains.' },

          { name: 'Jupiter', emoji: '\uD83E\uDE90', color: '#f97316', rgb: [0.98, 0.45, 0.09], size: 3.2, dist: 28, speed: 0.084, tilt: 0.05, moons: 95, diameter: '139,820 km', dayLen: '10 hours', yearLen: '12 years', temp: '\u2212110\u00B0C', fact: 'Largest planet. The Great Red Spot is a storm larger than Earth!', gravity: '2.34g', atmosphere: '90% H\u2082, 10% He \u2014 no solid surface', surface: 'Gas giant \u2014 layered cloud bands of ammonia and water', notableFeatures: ['Great Red Spot (storm > Earth-sized)', 'Strongest magnetic field', 'Europa may harbor an ocean under ice'], skyColor: '#d4924f', terrainColor: '#c4713a', terrainType: 'gasgiant', surfaceDesc: 'Endless stratified cloud layers in bands of amber, cream, and rust. Lightning flashes illuminate ammonia storms.' },

          { name: 'Saturn', emoji: '\uD83E\uDE90', color: '#eab308', rgb: [0.92, 0.70, 0.03], size: 2.7, dist: 36, speed: 0.034, tilt: 0.47, moons: 146, diameter: '116,460 km', dayLen: '10.7 hours', yearLen: '29 years', temp: '\u2212140\u00B0C', fact: 'Its rings are made of ice and rock. Could float in a giant bathtub!', hasRings: true, gravity: '1.06g', atmosphere: '96% H\u2082, 3% He \u2014 second gas giant', surface: 'Gas giant \u2014 golden cloud bands, no solid surface', notableFeatures: ['Ring system 282,000 km wide', 'Hexagonal storm at north pole', 'Titan has lakes of liquid methane'], skyColor: '#d4b16a', terrainColor: '#c9a04a', terrainType: 'gasgiant', surfaceDesc: 'Golden cloud decks with ring arcs slicing across the amber sky. A hexagonal polar vortex churns above.' },

          { name: 'Uranus', emoji: '\u26AA', color: '#67e8f9', rgb: [0.40, 0.91, 0.98], size: 1.5, dist: 44, speed: 0.012, tilt: 1.71, moons: 28, diameter: '50,724 km', dayLen: '17 hours', yearLen: '84 years', temp: '\u2212195\u00B0C', fact: 'Rotates on its side! An ice giant with methane atmosphere.', gravity: '0.92g', atmosphere: '83% H\u2082, 15% He, 2% CH\u2084 \u2014 ice giant', surface: 'Ice giant \u2014 methane gives blue-green color', notableFeatures: ['Rotates on its side (97.8\u00B0 tilt)', 'Faint ring system', 'Diamond rain in the interior'], skyColor: '#5aafa5', terrainColor: '#4a9a9a', terrainType: 'icegiant', surfaceDesc: 'Blue-green ice clouds under a teal sky. Deep below, extreme pressures crush carbon into diamonds that rain down.' },

          { name: 'Neptune', emoji: '\uD83D\uDD35', color: '#6366f1', rgb: [0.39, 0.40, 0.95], size: 1.4, dist: 52, speed: 0.006, tilt: 0.49, moons: 16, diameter: '49,244 km', dayLen: '16 hours', yearLen: '165 years', temp: '\u2212200\u00B0C', fact: 'Windiest planet: winds up to 2,100 km/h. Deep blue from methane.', gravity: '1.19g', atmosphere: '80% H\u2082, 19% He, 1% CH\u2084 \u2014 deep blue', surface: 'Ice giant \u2014 vivid blue from methane absorption', notableFeatures: ['Fastest winds: 2,100 km/h', 'Great Dark Spot (storm)', 'Triton orbits backwards'], skyColor: '#2a4a8a', terrainColor: '#1a3a6a', terrainType: 'icegiant', surfaceDesc: 'Deep indigo cloud layers whipped by supersonic winds. Dark storms rage across the methane-blue atmosphere.' },

          { name: 'Pluto', emoji: '\u2B50', color: '#a78bfa', rgb: [0.66, 0.55, 0.98], size: 0.14, dist: 60, speed: 0.004, tilt: 2.04, moons: 5, diameter: '2,377 km', dayLen: '6.4 Earth days', yearLen: '248 years', temp: '\u2212230\u00B0C', fact: 'Dwarf planet since 2006. Has a heart-shaped glacier named Tombaugh Regio.', gravity: '0.06g', atmosphere: 'Thin N\u2082 \u2014 freezes and falls as snow', surface: 'Nitrogen ice plains and water-ice mountains', notableFeatures: ['Tombaugh Regio (heart-shaped glacier)', 'Mountains of water ice', 'Charon is half its size'], skyColor: '#1a1a2a', terrainColor: '#8a7a6a', terrainType: 'iceworld', surfaceDesc: 'Pale nitrogen ice plains under a near-black sky. The Sun is just a bright star. The heart-shaped Tombaugh Regio gleams.' }
        ];

        var sel = d.selectedPlanet ? PLANETS.find(function(p) { return p.name === d.selectedPlanet; }) : null;

        // Track visited planets
        function markVisited(pName) {
          if (!visitedPlanets[pName]) {
            var newVisited = Object.assign({}, visitedPlanets);
            newVisited[pName] = true;
            upd('visitedPlanets', newVisited);
          }
        }

        // ── Three.js 3D Canvas ──
        var canvasRef = function(canvas) {
          if (!canvas) {
            var prev = document.querySelector('.solar3d-canvas');
            if (prev && prev._solarInit) return;
            if (prev && prev._solarCleanup) { prev._solarCleanup(); prev._solarInit = false; }
            return;
          }
          if (canvas._solarInit) return;
          canvas._solarInit = true;

          function initScene(THREE) {
            var W = canvas.clientWidth || 600;
            var H = canvas.clientHeight || 340;
            var scene = new THREE.Scene();
            var camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 1000);
            camera.position.set(0, 28, 50);
            camera.lookAt(0, 0, 0);
            var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.setSize(W, H);

            // ── Starfield ──
            var starGeo = new THREE.BufferGeometry();
            var starPos = new Float32Array(3000);
            for (var si = 0; si < 3000; si++) { starPos[si] = (Math.random() - 0.5) * 400; }
            starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
            scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, transparent: true, opacity: 0.8 })));

            // ── Ambient light ──
            scene.add(new THREE.AmbientLight(0x222244, 0.3));

            // ── Sun ──
            var sunGeo = new THREE.SphereGeometry(5.5, 32, 32);
            var sunMat = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
            var sun = new THREE.Mesh(sunGeo, sunMat);
            scene.add(sun);
            var sunLight = new THREE.PointLight(0xffffff, 1.5, 200);
            scene.add(sunLight);

            // Sun glow sprite
            var glowCanvas = document.createElement('canvas'); glowCanvas.width = 128; glowCanvas.height = 128;
            var gctx = glowCanvas.getContext('2d');
            var grad = gctx.createRadialGradient(64, 64, 0, 64, 64, 64);
            grad.addColorStop(0, 'rgba(255,220,80,0.6)'); grad.addColorStop(0.4, 'rgba(255,180,40,0.2)'); grad.addColorStop(1, 'rgba(255,160,0,0)');
            gctx.fillStyle = grad; gctx.fillRect(0, 0, 128, 128);
            var glowTex = new THREE.CanvasTexture(glowCanvas);
            var glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending }));
            glowSprite.scale.set(18, 18, 1);
            scene.add(glowSprite);

            // ── Procedural planet texture ──
            function makePlanetTex(rgb, variation) {
              var c = document.createElement('canvas'); c.width = 128; c.height = 64;
              var txCtx = c.getContext('2d');
              var base = rgb;
              for (var y = 0; y < 64; y++) {
                for (var x = 0; x < 128; x++) {
                  var n = (Math.sin(x * 0.3 + y * 0.1) * 0.5 + Math.sin(y * 0.5) * 0.3 + Math.random() * 0.2) * variation;
                  var r = Math.min(255, Math.max(0, Math.round((base[0] + n * 0.15) * 255)));
                  var g = Math.min(255, Math.max(0, Math.round((base[1] + n * 0.1) * 255)));
                  var b = Math.min(255, Math.max(0, Math.round((base[2] - n * 0.05) * 255)));
                  txCtx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
                  txCtx.fillRect(x, y, 1, 1);
                }
              }
              var tex = new THREE.CanvasTexture(c); tex.needsUpdate = true; return tex;
            }

            // ── Create planets ──
            var planetMeshes = [];
            var orbitLines = [];
            PLANETS.forEach(function(p, idx) {
              // Orbit ring
              var orbitGeo = new THREE.RingGeometry(p.dist - 0.02, p.dist + 0.02, 128);
              var orbitMat = new THREE.MeshBasicMaterial({ color: 0x334466, side: THREE.DoubleSide, transparent: true, opacity: 0.3 });
              var orbitMesh = new THREE.Mesh(orbitGeo, orbitMat);
              orbitMesh.rotation.x = -Math.PI / 2;
              scene.add(orbitMesh);
              orbitLines.push(orbitMesh);

              // Planet sphere
              var geo = new THREE.SphereGeometry(p.size, 24, 24);
              var tex = makePlanetTex(p.rgb, 1.0 + idx * 0.3);
              var mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, metalness: 0.1 });
              var mesh = new THREE.Mesh(geo, mat);
              mesh.userData = { name: p.name, idx: idx };
              mesh._orbitAngle = (idx / PLANETS.length) * Math.PI * 2;
              mesh._orbitDist = p.dist;
              mesh._orbitSpeed = p.speed;
              mesh.position.set(Math.cos(mesh._orbitAngle) * p.dist, 0, Math.sin(mesh._orbitAngle) * p.dist);
              scene.add(mesh);
              planetMeshes.push(mesh);

              // Earth's moon
              if (p.name === 'Earth') {
                var moonGeo = new THREE.SphereGeometry(0.12, 8, 8);
                var moonMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.9 });
                var moonMesh = new THREE.Mesh(moonGeo, moonMat);
                moonMesh._orbitAngle = 0; moonMesh._dist = p.size + 0.6;
                mesh.add(moonMesh); mesh._moonObj = moonMesh;
              }
              // Mars's 2 moons
              if (p.name === 'Mars') {
                mesh._moons = [];
                for (var m = 0; m < 2; m++) {
                  var jm = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), new THREE.MeshBasicMaterial({color: 0x888888}));
                  jm._dist = p.size + 0.3 + m * 0.2; jm._orbitAngle = Math.random() * Math.PI * 2; jm._speed = 4 - m;
                  mesh.add(jm); mesh._moons.push(jm);
                }
              }
              // Jupiter's 4 moons
              if (p.name === 'Jupiter') {
                mesh._moons = [];
                for (var m2 = 0; m2 < 4; m2++) {
                  var jm2 = new THREE.Mesh(new THREE.SphereGeometry(0.08 + Math.random() * 0.05, 8, 8), new THREE.MeshStandardMaterial({color: 0xddccaa}));
                  jm2._dist = p.size + 0.6 + m2 * 0.4; jm2._orbitAngle = Math.random() * Math.PI * 2; jm2._speed = 3 - m2 * 0.4;
                  mesh.add(jm2); mesh._moons.push(jm2);
                }
              }
              // Saturn's 3 moons
              if (p.name === 'Saturn') {
                mesh._moons = [];
                for (var m3 = 0; m3 < 3; m3++) {
                  var jm3 = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), new THREE.MeshStandardMaterial({color: 0xddddcc}));
                  jm3._dist = p.size * 2.4 + m3 * 0.5; jm3._orbitAngle = Math.random() * Math.PI * 2; jm3._speed = 2 - m3 * 0.3;
                  mesh.add(jm3); mesh._moons.push(jm3);
                }
              }

              // Saturn's rings
              if (p.hasRings) {
                var ringGeo = new THREE.RingGeometry(p.size * 1.4, p.size * 2.2, 64);
                var ringCanvas = document.createElement('canvas'); ringCanvas.width = 256; ringCanvas.height = 1;
                var rctx = ringCanvas.getContext('2d');
                var rGrad = rctx.createLinearGradient(0, 0, 256, 0);
                rGrad.addColorStop(0, 'rgba(210,180,120,0.0)'); rGrad.addColorStop(0.15, 'rgba(210,180,120,0.7)');
                rGrad.addColorStop(0.4, 'rgba(180,160,100,0.5)'); rGrad.addColorStop(0.5, 'rgba(140,130,80,0.1)');
                rGrad.addColorStop(0.6, 'rgba(200,170,110,0.6)'); rGrad.addColorStop(0.85, 'rgba(180,150,90,0.4)');
                rGrad.addColorStop(1, 'rgba(160,140,80,0.0)');
                rctx.fillStyle = rGrad; rctx.fillRect(0, 0, 256, 1);
                var ringTex = new THREE.CanvasTexture(ringCanvas);
                var ringMat = new THREE.MeshBasicMaterial({ map: ringTex, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
                var ringMesh = new THREE.Mesh(ringGeo, ringMat);
                ringMesh.rotation.x = -Math.PI / 2 + p.tilt;
                mesh.add(ringMesh);
              }
            });

            // ── Asteroid belt ──
            var asteroidCount = 300;
            var asteroidGeo = new THREE.BufferGeometry();
            var aPos = new Float32Array(asteroidCount * 3);
            for (var ai = 0; ai < asteroidCount; ai++) {
              var ang = Math.random() * Math.PI * 2;
              var rr = 22 + Math.random() * 4;
              aPos[ai * 3] = Math.cos(ang) * rr;
              aPos[ai * 3 + 1] = (Math.random() - 0.5) * 0.5;
              aPos[ai * 3 + 2] = Math.sin(ang) * rr;
            }
            asteroidGeo.setAttribute('position', new THREE.BufferAttribute(aPos, 3));
            scene.add(new THREE.Points(asteroidGeo, new THREE.PointsMaterial({ color: 0x888888, size: 0.08 })));

            // ── Halley's Comet ──
            var cometGeo = new THREE.SphereGeometry(0.15, 8, 8);
            var cometMat = new THREE.MeshBasicMaterial({ color: 0xaaffff });
            var cometMesh = new THREE.Mesh(cometGeo, cometMat);
            cometMesh.userData = { name: 'Halley\'s Comet', idx: planetMeshes.length, isComet: true };
            cometMesh._orbitAngle = 0;
            cometMesh._a = 35;
            cometMesh._e = 0.94;
            cometMesh._speedScale = 0.8;

            var tailGeo = new THREE.BufferGeometry();
            var tailPos = new Float32Array(50 * 3);
            tailGeo.setAttribute('position', new THREE.BufferAttribute(tailPos, 3));
            var tailPoints = new THREE.Points(tailGeo, new THREE.PointsMaterial({ color: 0x88ffff, size: 0.1, transparent: true, opacity: 0.4 }));
            scene.add(tailPoints);
            cometMesh._tail = tailPoints;
            scene.add(cometMesh);
            planetMeshes.push(cometMesh);

            // ── Camera orbit controls ──
            var camTheta = 0.5, camPhi = 1.0, camDist = 55;
            var isDragging = false, lastX = 0, lastY = 0;
            var targetLookAt = new THREE.Vector3(0, 0, 0);
            var currentLookAt = new THREE.Vector3(0, 0, 0);
            var currentDist = 55;
            var targetDist = 55;
            var focusedPlanetIdx = -1;
            var cameraLerp = 0.06;

            function updateCamera() {
              camera.position.x = currentLookAt.x + currentDist * Math.sin(camPhi) * Math.cos(camTheta);
              camera.position.y = currentLookAt.y + currentDist * Math.cos(camPhi);
              camera.position.z = currentLookAt.z + currentDist * Math.sin(camPhi) * Math.sin(camTheta);
              camera.lookAt(currentLookAt);
            }
            updateCamera();

            function onSolarDown(e) {
              isDragging = true; lastX = e.clientX; lastY = e.clientY;
              canvas._clickStartX = e.clientX; canvas._clickStartY = e.clientY;
              canvas.setPointerCapture(e.pointerId);
            }
            function onSolarMove(e) {
              if (!isDragging) return;
              var dx = e.clientX - lastX; var dy = e.clientY - lastY;
              camTheta -= dx * 0.008;
              camPhi = Math.max(0.15, Math.min(Math.PI - 0.15, camPhi - dy * 0.008));
              lastX = e.clientX; lastY = e.clientY;
              updateCamera();
            }
            function onSolarUp(e) {
              isDragging = false;
              canvas.releasePointerCapture(e.pointerId);
            }
            function onSolarWheel(e) {
              e.preventDefault();
              targetDist = Math.max(3, Math.min(120, targetDist + e.deltaY * 0.05));
            }

            // ── Raycasting for planet clicks ──
            var raycaster = new THREE.Raycaster();
            var mouse = new THREE.Vector2();
            function onSolarClick(e) {
              if (Math.abs(e.clientX - (canvas._clickStartX || 0)) > 5 || Math.abs(e.clientY - (canvas._clickStartY || 0)) > 5) return;
              var rect = canvas.getBoundingClientRect();
              mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
              mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
              raycaster.setFromCamera(mouse, camera);
              var hits = raycaster.intersectObjects(planetMeshes);
              if (hits.length > 0) {
                var hitObj = hits[0].object;
                var name = hitObj.userData.name;
                upd('selectedPlanet', name);
                playSound('planetSelect');
                focusedPlanetIdx = hitObj.userData.idx;
                var radius = hitObj.geometry.parameters.radius;
                targetDist = Math.max(3, Math.min(18, radius * 5));
                targetLookAt.copy(hitObj.position);
                camPhi = 0.8;
              } else {
                upd('selectedPlanet', null);
                focusedPlanetIdx = -1;
                targetLookAt.set(0, 0, 0);
                targetDist = 55;
              }
            }
            function onSolarDblClick(e) {
              upd('selectedPlanet', null);
              focusedPlanetIdx = -1;
              targetLookAt.set(0, 0, 0);
              targetDist = 55;
              camPhi = 1.0;
            }

            canvas.addEventListener('pointerdown', onSolarDown);
            canvas.addEventListener('pointermove', onSolarMove);
            canvas.addEventListener('pointerup', onSolarUp);
            canvas.addEventListener('wheel', onSolarWheel, { passive: false });
            canvas.addEventListener('click', onSolarClick);
            canvas.addEventListener('dblclick', onSolarDblClick);

            // ── Planet label overlay ──
            var labelContainer = canvas.parentElement.querySelector('.solar-labels');

            // ── Animation loop ──
            var animId;
            var time = 0;
            function animate() {
              animId = requestAnimationFrame(animate);
              var speed = parseFloat(canvas.dataset.speed || '1');
              var isPaused = canvas.dataset.paused === 'true';
              if (!isPaused) {
                time += 0.008 * speed;
              }

              var timeScale = 0.008 * speed * (isPaused ? 0 : 1);
              planetMeshes.forEach(function(mesh, i) {
                if (mesh.userData.isComet) {
                  var angularSpeed = mesh._speedScale * (1 / (1 - mesh._e * Math.cos(mesh._orbitAngle)));
                  mesh._orbitAngle += timeScale * angularSpeed;
                  var rComet = mesh._a * (1 - mesh._e * mesh._e) / (1 + mesh._e * Math.cos(mesh._orbitAngle));
                  mesh.position.x = Math.cos(mesh._orbitAngle) * rComet - (mesh._a * mesh._e);
                  mesh.position.z = Math.sin(mesh._orbitAngle) * rComet;
                  mesh.rotation.y += 0.1;

                  if (mesh._tail) {
                    var tArr = mesh._tail.geometry.attributes.position.array;
                    for (var tt = 49; tt > 0; tt--) {
                      tArr[tt * 3] = tArr[(tt - 1) * 3]; tArr[tt * 3 + 1] = tArr[(tt - 1) * 3 + 1]; tArr[tt * 3 + 2] = tArr[(tt - 1) * 3 + 2];
                    }
                    var dirX = mesh.position.x; var dirZ = mesh.position.z;
                    var distC = Math.sqrt(dirX * dirX + dirZ * dirZ);
                    tArr[0] = mesh.position.x + (dirX / distC) * 0.5 + (Math.random() - 0.5) * 0.2;
                    tArr[1] = (Math.random() - 0.5) * 0.2;
                    tArr[2] = mesh.position.z + (dirZ / distC) * 0.5 + (Math.random() - 0.5) * 0.2;
                    mesh._tail.geometry.attributes.position.needsUpdate = true;
                  }
                  return;
                }

                mesh._orbitAngle += timeScale * mesh._orbitSpeed;
                mesh.position.x = Math.cos(mesh._orbitAngle) * mesh._orbitDist;
                mesh.position.z = Math.sin(mesh._orbitAngle) * mesh._orbitDist;
                mesh.rotation.y += 0.02 * speed * (isPaused ? 0 : 1);

                if (mesh._moonObj && !isPaused) {
                  mesh._moonObj._orbitAngle += 0.05 * speed;
                  mesh._moonObj.position.x = Math.cos(mesh._moonObj._orbitAngle) * mesh._moonObj._dist;
                  mesh._moonObj.position.z = Math.sin(mesh._moonObj._orbitAngle) * mesh._moonObj._dist;
                }
                if (mesh._moons && !isPaused) {
                  mesh._moons.forEach(function(jm) {
                    jm._orbitAngle += 0.03 * jm._speed * speed;
                    jm.position.x = Math.cos(jm._orbitAngle) * jm._dist;
                    jm.position.z = Math.sin(jm._orbitAngle) * jm._dist;
                  });
                }
              });

              // Camera reset signal
              if (canvas.dataset.resetCamera === 'true') {
                canvas.dataset.resetCamera = '';
                focusedPlanetIdx = -1;
                targetLookAt.set(0, 0, 0);
                targetDist = 55;
                camPhi = 1.0;
                camTheta = 0.5;
              }

              // Smooth camera tracking
              if (focusedPlanetIdx >= 0 && focusedPlanetIdx < planetMeshes.length) {
                var fp = planetMeshes[focusedPlanetIdx];
                targetLookAt.copy(fp.position);
              }
              currentLookAt.lerp(targetLookAt, cameraLerp);
              currentDist += (targetDist - currentDist) * cameraLerp;
              updateCamera();

              // Rotate asteroids
              var aArr = asteroidGeo.attributes.position.array;
              if (!isPaused) {
                for (var ai2 = 0; ai2 < asteroidCount; ai2++) {
                  var x = aArr[ai2 * 3]; var z = aArr[ai2 * 3 + 2];
                  var a = Math.atan2(z, x) + 0.0003 * speed;
                  var rDist = Math.sqrt(x * x + z * z);
                  aArr[ai2 * 3] = Math.cos(a) * rDist;
                  aArr[ai2 * 3 + 2] = Math.sin(a) * rDist;
                }
                asteroidGeo.attributes.position.needsUpdate = true;
              }

              // Sun pulse
              var pulse = 1.0 + Math.sin(time * 2) * 0.03;
              sun.scale.set(pulse, pulse, pulse);
              glowSprite.scale.set(12 * pulse, 12 * pulse, 1);

              // Update labels
              if (labelContainer) {
                labelContainer.innerHTML = '';
                planetMeshes.forEach(function(mesh) {
                  var pos = mesh.position.clone();
                  pos.y += mesh.geometry.parameters.radius + 0.4;
                  pos.project(camera);
                  if (pos.z < 1 && pos.z > -1) {
                    var lx = (pos.x * 0.5 + 0.5) * W;
                    var ly = (-pos.y * 0.5 + 0.5) * H;
                    var isSelected = canvas.dataset.selected === mesh.userData.name;
                    var label = document.createElement('div');
                    label.style.cssText = 'position:absolute;left:' + lx + 'px;top:' + ly + 'px;transform:translate(-50%,-100%);font-size:9px;font-weight:700;pointer-events:none;text-shadow:0 1px 3px rgba(0,0,0,0.8);color:' + (isSelected ? '#fbbf24' : '#94a3b8') + ';white-space:nowrap;transition:color 0.2s;';
                    label.textContent = mesh.userData.name;
                    labelContainer.appendChild(label);
                  }
                });
              }

              // HUD telemetry update
              var telemetryEl = canvas.parentElement.querySelector('.solar-telemetry');
              if (telemetryEl) {
                var days = (time / (Math.PI * 2)) * 365.25;
                var html = '<b>Time Elapsed:</b> ' + Math.floor(days) + ' Earth days<br/>';
                if (focusedPlanetIdx >= 0 && planetMeshes[focusedPlanetIdx]) {
                  var fd = planetMeshes[focusedPlanetIdx].position.length();
                  var au = (fd / 14).toFixed(2);
                  html += '<b>Dist from Sun:</b> ' + au + ' AU<br/>';
                }
                telemetryEl.innerHTML = html;
              }

              renderer.render(scene, camera);
            }
            animate();

            // ── Resize handler ──
            var resizeObserver = new ResizeObserver(function() {
              var w = canvas.clientWidth; var hh = canvas.clientHeight;
              if (w && hh) { camera.aspect = w / hh; camera.updateProjectionMatrix(); renderer.setSize(w, hh); W = w; H = hh; }
            });
            resizeObserver.observe(canvas);

            // ── Cleanup ──
            canvas._solarCleanup = function() {
              cancelAnimationFrame(animId);
              canvas.removeEventListener('pointerdown', onSolarDown);
              canvas.removeEventListener('pointermove', onSolarMove);
              canvas.removeEventListener('pointerup', onSolarUp);
              canvas.removeEventListener('wheel', onSolarWheel);
              canvas.removeEventListener('click', onSolarClick);
              canvas.removeEventListener('dblclick', onSolarDblClick);
              resizeObserver.disconnect();
              renderer.dispose();
              scene.traverse(function(o) { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });
            };
          }

          // Load Three.js or use existing
          if (window.THREE) {
            initScene(window.THREE);
          } else {
            var s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
            s.onload = function() { initScene(window.THREE); };
            document.head.appendChild(s);
          }
        };

        // ═══ BUILD UI ═══
        return h("div", { className: "max-w-4xl mx-auto animate-in fade-in duration-200" },

          // Header
          h("div", { className: "flex items-center gap-3 mb-3" },
            h("button", { onClick: function() { setStemLabTool(null); }, className: "p-1.5 hover:bg-slate-100 rounded-lg", 'aria-label': 'Back to tools' }, h(ArrowLeft, { size: 18, className: "text-slate-500" })),
            h("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83C\uDF0D Solar System Explorer"),
            h("span", { className: "px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full ml-1" }, "3D")
          ),

          // Grade-band intro
          h("div", { className: "mb-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-3 border border-indigo-200 text-sm text-indigo-700" }, introText),

          // 3D Canvas container
          h("div", { className: "relative rounded-xl overflow-hidden border-2 border-indigo-800/50 shadow-lg", style: { background: '#0a0e27' } },
            h("canvas", {
              ref: canvasRef,
              className: "solar3d-canvas w-full",
              style: { height: '520px', display: 'block', cursor: 'grab' },
              'data-speed': String(simSpeed),
              'data-paused': String(paused),
              'data-selected': d.selectedPlanet || ''
            }),
            // Floating planet labels
            h("div", { className: "solar-labels", style: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'hidden' } }),
            h("div", { className: "solar-telemetry", style: { position: 'absolute', top: '10px', left: '10px', color: '#60a5fa', background: 'rgba(0,0,0,0.6)', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontFamily: 'monospace', pointerEvents: 'none', border: '1px solid #1e3a8a', zIndex: 10 } }),

            // Controls overlay
            h("div", { className: "absolute bottom-3 left-3 right-3 flex items-center gap-2 pointer-events-auto" },
              h("button", {
                onClick: function() { upd('paused', !paused); },
                className: "px-2.5 py-1 rounded-lg text-xs font-bold " + (paused ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/80 hover:bg-white/20') + " backdrop-blur-sm border border-white/10 transition-all"
              }, paused ? "\u25B6 Play" : "\u23F8 Pause"),
              h("div", { className: "flex items-center gap-1.5 flex-1 max-w-[180px] bg-white/10 backdrop-blur-sm rounded-lg px-2 py-1 border border-white/10" },
                h("span", { className: "text-[9px] text-white/60 font-bold whitespace-nowrap" }, "Speed"),
                h("input", { type: "range", min: "0.1", max: "10", step: "0.1", value: simSpeed, onChange: function(e) { upd('simSpeed', parseFloat(e.target.value)); }, className: "flex-1 accent-indigo-400", style: { height: '12px' } }),
                h("span", { className: "text-[10px] text-indigo-300 font-bold min-w-[28px] text-right" }, simSpeed.toFixed(1) + "x")
              ),
              h("button", {
                onClick: function() { upd('selectedPlanet', null); var c = document.querySelector('.solar3d-canvas'); if (c) { c.dataset.resetCamera = 'true'; } },
                className: "px-2 py-1 rounded-lg text-[10px] font-bold bg-white/10 text-white/70 hover:bg-white/20 border border-white/10 backdrop-blur-sm transition-all"
              }, "\uD83C\uDFE0 Reset View"),
              h("span", { className: "text-[9px] text-white/40 ml-auto hidden sm:inline" }, "Drag to orbit \u2022 Scroll to zoom \u2022 Click a planet")
            )
          ),

          // Planet buttons row
          h("div", { className: "flex gap-1 mt-2 flex-wrap justify-center" },
            PLANETS.map(function(p) {
              return h("button", {
                key: p.name,
                onClick: function() {
                  upd('selectedPlanet', p.name);
                  markVisited(p.name);
                  playSound('planetSelect');
                },
                className: "px-2 py-1 rounded-lg text-[10px] font-bold transition-all " + (d.selectedPlanet === p.name ? 'text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'),
                style: d.selectedPlanet === p.name ? { backgroundColor: p.color } : {}
              }, p.emoji + " " + p.name);
            })
          ),

          // ── Scale Explanation Collapsible ──
          h("details", { className: "mt-2 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 overflow-hidden" },
            h("summary", { className: "px-3 py-1.5 text-[11px] font-bold text-amber-700 cursor-pointer select-none hover:bg-amber-100/50 transition-colors" }, "\uD83D\uDD2D Why aren't the sizes truly to scale?"),
            h("div", { className: "px-3 pb-3 text-[10px] text-amber-800 leading-relaxed" },
              h("p", { className: "mb-2" }, "If this model were truly to scale, the Sun would be a beach ball and Earth would be a grain of sand 30 meters away! Jupiter would be a marble 155 meters away, and Pluto would be invisible 1.2 km from the Sun."),
              h("div", { className: "grid grid-cols-3 gap-1.5 mb-2" },
                [
                  { body: '\u2600\uFE0F Sun', real: '1,391,000 km', scale: '109\u00D7 Earth' },
                  { body: '\uD83E\uDE90 Jupiter', real: '139,820 km', scale: '11.2\u00D7 Earth' },
                  { body: '\uD83C\uDF0D Earth', real: '12,742 km', scale: '1\u00D7 (baseline)' },
                  { body: '\uD83D\uDD35 Neptune', real: '49,244 km', scale: '3.9\u00D7 Earth' },
                  { body: '\uD83D\uDD34 Mars', real: '6,779 km', scale: '0.53\u00D7 Earth' },
                  { body: '\u2B50 Pluto', real: '2,377 km', scale: '0.19\u00D7 Earth' }
                ].map(function(item) {
                  return h("div", { key: item.body, className: "bg-white/60 rounded-lg p-1.5 text-center border border-amber-100" },
                    h("div", { className: "font-bold" }, item.body),
                    h("div", { className: "text-amber-600" }, item.real),
                    h("div", { className: "text-amber-500 italic" }, item.scale)
                  );
                })
              ),
              h("p", { className: "italic text-amber-600" }, "\uD83D\uDCA1 The solar system is 99.86% empty space! Our model compresses distances so you can explore everything in one view.")
            )
          ),

          // ── Planet Info Card ──
          sel && h("div", { className: "mt-3 bg-slate-50 rounded-xl border border-slate-200 p-4 animate-in slide-in-from-bottom duration-300" },
            // Planet header
            h("div", { className: "flex items-center gap-3 mb-3" },
              h("div", { className: "w-12 h-12 rounded-xl flex items-center justify-center text-2xl", style: { backgroundColor: sel.color + '20', border: '2px solid ' + sel.color } }, sel.emoji),
              h("div", { className: "flex-1" },
                h("h4", { className: "text-lg font-black text-slate-800" }, sel.name),
                h("p", { className: "text-xs text-slate-500" }, sel.diameter + " \u2022 " + sel.moons + " moon" + (sel.moons !== 1 ? 's' : '') + " \u2022 " + (sel.gravity || '?'))
              ),
              // Mode tabs
              h("div", { className: "flex gap-1" },
                ['overview', 'surface', 'drone'].map(function(tab) {
                  var isGas = sel.terrainType === 'gasgiant' || sel.terrainType === 'icegiant';
                  return h("button", {
                    key: tab, onClick: function() { upd('viewTab', tab); if (tab === 'drone') playSound('launch'); },
                    className: "px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize transition-all " +
                      ((d.viewTab || 'overview') === tab ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-200 text-slate-500 hover:bg-slate-300')
                  }, tab === 'overview' ? '\uD83D\uDCCA Overview' : tab === 'surface' ? '\u26C5 Surface' : (isGas ? '\uD83D\uDEF8 Probe' : '\uD83D\uDE97 Rover'));
                })
              )
            ),

            // ── OVERVIEW TAB ──
            (d.viewTab || 'overview') === 'overview' && h("div", null,
              h("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-2 mb-3" },
                [['\uD83C\uDF21', 'Temp', sel.temp], ['\u2600', 'Day', sel.dayLen], ['\uD83C\uDF0D', 'Year', sel.yearLen], ['\uD83D\uDCCF', 'Size', sel.diameter],
                ['\u2696\uFE0F', 'Gravity', sel.gravity || 'Unknown'], ['\uD83C\uDF11', 'Moons', String(sel.moons)], ['\uD83C\uDF2C', 'Atmosphere', (sel.atmosphere || 'Unknown').substring(0, 30)], ['\uD83D\uDCA0', 'Type', sel.terrainType === 'gasgiant' ? 'Gas Giant' : sel.terrainType === 'icegiant' ? 'Ice Giant' : 'Rocky']
                ].map(function(item) {
                  return h("div", { key: item[1], className: "bg-white rounded-lg p-2 text-center border" },
                    h("p", { className: "text-[10px] text-slate-500 font-bold" }, item[0] + ' ' + item[1]),
                    h("p", { className: "text-xs font-bold text-slate-700" }, item[2])
                  );
                })
              ),
              h("p", { className: "text-sm text-slate-600 italic bg-indigo-50 rounded-lg p-2 border border-indigo-100 mb-2" }, "\uD83D\uDCA1 " + sel.fact),
              sel.surfaceDesc && h("div", { className: "bg-gradient-to-r from-sky-50 to-blue-50 rounded-lg p-2 border border-sky-200 mb-2" },
                h("p", { className: "text-[11px] font-bold text-sky-700 mb-0.5" }, "\uD83C\uDF0D Surface Description"),
                h("p", { className: "text-[10px] text-sky-600 leading-relaxed" }, sel.surfaceDesc)
              ),
              sel.notableFeatures && sel.notableFeatures.length > 0 && h("div", { className: "bg-gradient-to-r from-violet-50 to-purple-50 rounded-lg p-2 border border-violet-200 mb-2" },
                h("p", { className: "text-[11px] font-bold text-violet-700 mb-1" }, "\uD83C\uDFAF Notable Features"),
                h("div", { className: "grid grid-cols-1 gap-1" },
                  sel.notableFeatures.map(function(feat, fi) {
                    return h("div", { key: fi, className: "flex items-center gap-1.5 text-[10px] text-violet-600" },
                      h("span", { className: "w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" }),
                      h("span", null, feat)
                    );
                  })
                )
              ),
              sel.notableFeatures && h("div", { className: "bg-white rounded-lg p-3 border" },
                h("p", { className: "text-xs font-bold text-slate-500 mb-1.5" }, "\u2B50 Notable Features"),
                h("div", { className: "flex flex-wrap gap-1.5" },
                  sel.notableFeatures.map(function(feat, i) {
                    return h("span", { key: i, className: "px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-bold border border-indigo-100" }, feat);
                  })
                )
              ),

              // ── AI Tutor Button ──
              h("div", { className: "flex gap-2 mt-2" },
                h("button", {
                  onClick: function() {
                    if (!callGemini) { addToast('AI tutor unavailable', 'error'); return; }
                    upd('aiLoading', true);
                    var prompt = 'You are an expert astronomy tutor. The student is exploring ' + sel.name + ' in a solar system tool. Tell them 3 interesting facts about ' + sel.name + ' at a ' + band + ' grade level. Keep it concise and engaging.';
                    callGemini(prompt, false, false, 0.7).then(function(resp) {
                      upd('aiResponse', resp);
                      upd('aiLoading', false);
                    }).catch(function() {
                      upd('aiLoading', false);
                      addToast('AI tutor error', 'error');
                    });
                  },
                  className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 transition-all",
                  disabled: d.aiLoading
                }, d.aiLoading ? '\u23F3 Thinking...' : '\uD83E\uDD16 Ask AI Tutor about ' + sel.name),
                // TTS read-aloud button
                h("button", {
                  onClick: function() {
                    if (!callTTS) { addToast('TTS unavailable', 'error'); return; }
                    var text = sel.name + '. ' + sel.fact + ' ' + (sel.surfaceDesc || '');
                    callTTS(text);
                  },
                  className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-600 text-white hover:bg-sky-700 transition-all"
                }, '\uD83D\uDD0A Read Aloud')
              ),
              d.aiResponse && h("div", { className: "mt-2 bg-purple-50 rounded-lg p-3 border border-purple-200 text-xs text-purple-800 whitespace-pre-wrap" },
                h("p", { className: "font-bold text-purple-700 mb-1" }, "\uD83E\uDD16 AI Tutor:"),
                h("p", null, d.aiResponse)
              )
            ),

            // ── SURFACE TAB ──
            (d.viewTab) === 'surface' && h("div", { className: "space-y-3" },
              h("div", { className: "bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-4 text-white" },
                h("div", { className: "flex items-center gap-2 mb-2" },
                  h("span", { className: "text-lg" }, "\uD83C\uDF0D"),
                  h("h5", { className: "font-bold text-sm" }, sel.name + " Surface Conditions")
                ),
                h("p", { className: "text-xs text-slate-300 leading-relaxed mb-3" }, sel.surfaceDesc || 'Surface data unavailable.'),
                h("div", { className: "grid grid-cols-3 gap-2" },
                  [
                    ['\u2696\uFE0F Gravity', sel.gravity || '?'],
                    ['\uD83C\uDF21 Temperature', sel.temp],
                    ['\uD83C\uDF2C\uFE0F Atmosphere', (sel.atmosphere || 'None').split(' \u2014')[0]]
                  ].map(function(item) {
                    return h("div", { key: item[0], className: "bg-white/10 rounded-lg p-2 text-center backdrop-blur-sm" },
                      h("p", { className: "text-[9px] text-slate-400" }, item[0]),
                      h("p", { className: "text-xs font-bold" }, item[1])
                    );
                  })
                )
              ),
              // ── 2D Planet Surface Canvas ──
              h("div", { className: "relative rounded-2xl overflow-hidden border-2 shadow-xl", style: { height: '350px', borderColor: sel.color + '60' } },
                h("canvas", {
                  "data-surface-canvas": "true",
                  style: { width: '100%', height: '100%', display: 'block' },
                  ref: function(cvEl) {
                    if (!cvEl || cvEl._surfInit === sel.name) return;
                    cvEl._surfInit = sel.name;
                    var cvCtx = cvEl.getContext('2d');
                    var W = cvEl.offsetWidth || 600, H = cvEl.offsetHeight || 350;
                    cvEl.width = W * 2; cvEl.height = H * 2; cvCtx.scale(2, 2);
                    var isGas = sel.terrainType === 'gasgiant' || sel.terrainType === 'icegiant';
                    var tick = 0;

                    function drawPlanet() {
                      tick++;
                      cvCtx.clearRect(0, 0, W, H);
                      // Space background
                      var bgGrad = cvCtx.createLinearGradient(0, 0, 0, H);
                      bgGrad.addColorStop(0, '#020210');
                      bgGrad.addColorStop(1, '#0a0a2e');
                      cvCtx.fillStyle = bgGrad;
                      cvCtx.fillRect(0, 0, W, H);
                      // Stars
                      for (var si = 0; si < 120; si++) {
                        var sx = ((si * 137 + 29) % W);
                        var sy = ((si * 211 + 17) % H);
                        var sb = 0.15 + 0.25 * Math.sin(tick * 0.015 + si * 0.7);
                        cvCtx.globalAlpha = sb;
                        cvCtx.fillStyle = '#fff';
                        cvCtx.beginPath();
                        cvCtx.arc(sx, sy, si % 3 === 0 ? 1.5 : 0.8, 0, Math.PI * 2);
                        cvCtx.fill();
                      }
                      cvCtx.globalAlpha = 1;
                      // Planet
                      var cx = W * 0.5, cy = H * 0.5;
                      var planetR = Math.min(W, H) * 0.38;
                      // Atmosphere glow
                      var glowGrad2 = cvCtx.createRadialGradient(cx, cy, planetR * 0.9, cx, cy, planetR * 1.4);
                      glowGrad2.addColorStop(0, sel.color + '40');
                      glowGrad2.addColorStop(1, 'transparent');
                      cvCtx.fillStyle = glowGrad2;
                      cvCtx.fillRect(0, 0, W, H);
                      // Planet body
                      cvCtx.save();
                      cvCtx.beginPath();
                      cvCtx.arc(cx, cy, planetR, 0, Math.PI * 2);
                      cvCtx.clip();
                      // Base gradient
                      var bodyGrad = cvCtx.createLinearGradient(cx - planetR, cy - planetR, cx + planetR, cy + planetR);
                      bodyGrad.addColorStop(0, sel.color);
                      var darkerColor = sel.color.length >= 7 ? '#' + Math.max(0, parseInt(sel.color.slice(1, 3), 16) - 60).toString(16).padStart(2, '0') + Math.max(0, parseInt(sel.color.slice(3, 5), 16) - 60).toString(16).padStart(2, '0') + Math.max(0, parseInt(sel.color.slice(5, 7), 16) - 60).toString(16).padStart(2, '0') : sel.color;
                      bodyGrad.addColorStop(1, darkerColor);
                      cvCtx.fillStyle = bodyGrad;
                      cvCtx.fillRect(cx - planetR, cy - planetR, planetR * 2, planetR * 2);
                      // Surface features
                      if (isGas) {
                        for (var bi = 0; bi < 8; bi++) {
                          var by = cy - planetR + (bi + 0.5) * (planetR * 2 / 8);
                          var wave = Math.sin(tick * 0.01 + bi * 1.5) * 4;
                          cvCtx.fillStyle = 'rgba(255,255,255,' + (0.04 + 0.03 * Math.sin(bi * 2.1)) + ')';
                          cvCtx.fillRect(cx - planetR, by + wave - 6, planetR * 2, 12);
                        }
                        // Storm spot
                        cvCtx.fillStyle = 'rgba(200,100,50,0.25)';
                        var spotX = cx + Math.cos(tick * 0.005) * planetR * 0.3;
                        var spotY = cy + planetR * 0.15;
                        cvCtx.beginPath();
                        cvCtx.ellipse(spotX, spotY, planetR * 0.18, planetR * 0.09, 0.1, 0, Math.PI * 2);
                        cvCtx.fill();
                      } else {
                        for (var ci = 0; ci < 15; ci++) {
                          var crx = cx + ((ci * 97 + 31) % Math.floor(planetR * 1.6)) - planetR * 0.8;
                          var cry = cy + ((ci * 73 + 17) % Math.floor(planetR * 1.4)) - planetR * 0.7;
                          var crr = 3 + (ci % 5) * 4;
                          if (Math.sqrt((crx - cx) * (crx - cx) + (cry - cy) * (cry - cy)) + crr < planetR) {
                            cvCtx.fillStyle = 'rgba(0,0,0,0.08)';
                            cvCtx.beginPath();
                            cvCtx.arc(crx, cry, crr, 0, Math.PI * 2);
                            cvCtx.fill();
                            cvCtx.strokeStyle = 'rgba(255,255,255,0.06)';
                            cvCtx.lineWidth = 0.5;
                            cvCtx.beginPath();
                            cvCtx.arc(crx - 1, cry - 1, crr, 0, Math.PI * 2);
                            cvCtx.stroke();
                          }
                        }
                      }
                      // Lighting shadow
                      var shadowGrad = cvCtx.createLinearGradient(cx - planetR, cy, cx + planetR, cy);
                      shadowGrad.addColorStop(0, 'rgba(0,0,0,0)');
                      shadowGrad.addColorStop(0.6, 'rgba(0,0,0,0)');
                      shadowGrad.addColorStop(1, 'rgba(0,0,0,0.5)');
                      cvCtx.fillStyle = shadowGrad;
                      cvCtx.fillRect(cx - planetR, cy - planetR, planetR * 2, planetR * 2);
                      // Specular highlight
                      var specGrad = cvCtx.createRadialGradient(cx - planetR * 0.3, cy - planetR * 0.3, 0, cx - planetR * 0.3, cy - planetR * 0.3, planetR * 0.8);
                      specGrad.addColorStop(0, 'rgba(255,255,255,0.15)');
                      specGrad.addColorStop(1, 'rgba(255,255,255,0)');
                      cvCtx.fillStyle = specGrad;
                      cvCtx.fillRect(cx - planetR, cy - planetR, planetR * 2, planetR * 2);
                      cvCtx.restore();
                      // Planet name label
                      cvCtx.fillStyle = '#fff';
                      cvCtx.font = 'bold 14px system-ui, sans-serif';
                      cvCtx.textAlign = 'center';
                      cvCtx.fillText(sel.emoji + ' ' + sel.name, cx, H - 20);
                      cvCtx.font = '10px system-ui, sans-serif';
                      cvCtx.fillStyle = '#94a3b8';
                      cvCtx.fillText(sel.diameter + ' \u2022 ' + (sel.gravity || '?'), cx, H - 6);
                      requestAnimationFrame(drawPlanet);
                    }
                    drawPlanet();
                    var ro = new ResizeObserver(function() {
                      W = cvEl.offsetWidth || 600; H = cvEl.offsetHeight || 350;
                      cvEl.width = W * 2; cvEl.height = H * 2; cvCtx.scale(2, 2);
                    });
                    ro.observe(cvEl);
                  }
                })
              ),
              h("button", {
                onClick: function() { upd('viewTab', 'drone'); playSound('launch'); },
                className: "w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg transition-all hover:scale-[1.01]"
              }, (sel.terrainType === 'gasgiant' || sel.terrainType === 'icegiant' ? "\uD83D\uDEF8 Launch Atmospheric Probe on " : "\uD83D\uDE97 Deploy Rover on ") + sel.name)
            ),

            // ── ROVER / PROBE TAB ──
            (d.viewTab) === 'drone' && h("div", { id: "drone-fullscreen-container" },
              h("div", { className: "relative rounded-xl overflow-hidden border-2 border-purple-300 shadow-lg", style: { height: '450px' } },
                h("canvas", {
                  "data-drone-canvas": "true",
                  style: { width: '100%', height: '100%', display: 'block', cursor: 'crosshair' },
                  ref: function(canvasEl) {
                    if (!canvasEl || canvasEl._droneInit === sel.name) return;
                    canvasEl._droneInit = sel.name;

                    function doInit(THREE) {
                      var W = canvasEl.clientWidth || canvasEl.offsetWidth, H = canvasEl.clientHeight || canvasEl.offsetHeight;
                      var scene = new THREE.Scene();
                      var isGas = sel.terrainType === 'gasgiant' || sel.terrainType === 'icegiant';
                      var camera = new THREE.PerspectiveCamera(70, W / H, 0.1, 500);
                      camera.position.set(0, isGas ? 5 : 1.6, 0);
                      var renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true });
                      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.setSize(W, H);
                      renderer.setClearColor(new THREE.Color(sel.skyColor || '#000000'));

                      // ── Sky dome ──
                      var skyGeo = new THREE.SphereGeometry(200, 32, 16);
                      var skyCv = document.createElement('canvas'); skyCv.width = 512; skyCv.height = 256;
                      var sCtx = skyCv.getContext('2d');
                      var sGrad = sCtx.createLinearGradient(0, 0, 0, 256);
                      sGrad.addColorStop(0, sel.skyColor || '#000');
                      sGrad.addColorStop(0.5, sel.terrainType === 'earthlike' ? '#87ceeb' : sel.terrainType === 'volcanic' ? '#d4923a' : sel.skyColor || '#111');
                      sGrad.addColorStop(1, sel.terrainColor || '#333');
                      sCtx.fillStyle = sGrad; sCtx.fillRect(0, 0, 512, 256);
                      if (sel.terrainType === 'cratered' || sel.terrainType === 'iceworld' || sel.terrainType === 'desert') {
                        for (var si2 = 0; si2 < 200; si2++) {
                          sCtx.fillStyle = 'rgba(255,255,255,' + (0.3 + Math.random() * 0.5) + ')';
                          sCtx.beginPath(); sCtx.arc(Math.random() * 512, Math.random() * 128, Math.random() * 1.5, 0, Math.PI * 2); sCtx.fill();
                        }
                      }
                      var skyTex = new THREE.CanvasTexture(skyCv);
                      var skyMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide });
                      scene.add(new THREE.Mesh(skyGeo, skyMat));

                      // ── Terrain or Cloud layers ──
                      if (!isGas) {
                        var terrainGeo = new THREE.PlaneGeometry(200, 200, 100, 100);
                        var posArr = terrainGeo.attributes.position.array;
                        for (var vi = 0; vi < posArr.length; vi += 3) {
                          var px = posArr[vi], py = posArr[vi + 1];
                          var hVal = Math.sin(px * 0.05) * 3 + Math.sin(py * 0.08) * 2 + Math.sin(px * 0.15 + py * 0.1) * 1;
                          if (sel.terrainType === 'volcanic') hVal = Math.abs(Math.sin(px * 0.04) * 5) + Math.random() * 0.5;
                          if (sel.terrainType === 'earthlike') hVal = Math.sin(px * 0.03) * 2 + Math.sin(py * 0.05) * 1.5 + Math.random() * 0.3;
                          if (sel.terrainType === 'desert') hVal = Math.sin(px * 0.06) * 1.5 + Math.random() * 0.2;
                          if (sel.terrainType === 'iceworld') hVal = Math.sin(px * 0.04 + py * 0.03) * 1 + Math.random() * 0.15;
                          posArr[vi + 2] = hVal;
                        }
                        terrainGeo.computeVertexNormals();
                        var tCv = document.createElement('canvas'); tCv.width = 256; tCv.height = 256;
                        var tCx = tCv.getContext('2d');
                        var baseC = new THREE.Color(sel.terrainColor || '#886644');
                        for (var ty = 0; ty < 256; ty++) {
                          for (var tx = 0; tx < 256; tx++) {
                            var n = (Math.sin(tx * 0.3 + ty * 0.2) * 0.5 + Math.random() * 0.3) * 0.15;
                            var r = Math.min(255, Math.max(0, Math.round((baseC.r + n) * 255)));
                            var g = Math.min(255, Math.max(0, Math.round((baseC.g + n * 0.8) * 255)));
                            var b = Math.min(255, Math.max(0, Math.round((baseC.b - n * 0.3) * 255)));
                            tCx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
                            tCx.fillRect(tx, ty, 1, 1);
                          }
                        }
                        var terrainTex = new THREE.CanvasTexture(tCv);
                        terrainTex.wrapS = terrainTex.wrapT = THREE.RepeatWrapping; terrainTex.repeat.set(10, 10);
                        var terrainMat = new THREE.MeshStandardMaterial({ map: terrainTex, roughness: 0.9, metalness: 0.1, flatShading: true });
                        var terrain = new THREE.Mesh(terrainGeo, terrainMat);
                        terrain.rotation.x = -Math.PI / 2; scene.add(terrain);
                      } else {
                        for (var cl = 0; cl < 5; cl++) {
                          var clGeo = new THREE.PlaneGeometry(300, 300, 1, 1);
                          var clCv = document.createElement('canvas'); clCv.width = 256; clCv.height = 64;
                          var clCx = clCv.getContext('2d');
                          for (var cly = 0; cly < 64; cly++) {
                            var bandVal = Math.sin(cly * 0.3 + cl * 2) * 0.5 + 0.5;
                            var r2 = Math.round(new THREE.Color(sel.terrainColor).r * 255 * (0.7 + bandVal * 0.3));
                            var g2 = Math.round(new THREE.Color(sel.terrainColor).g * 255 * (0.7 + bandVal * 0.3));
                            var b2 = Math.round(new THREE.Color(sel.terrainColor).b * 255 * (0.8 + bandVal * 0.2));
                            for (var cx2 = 0; cx2 < 256; cx2++) {
                              var turb = Math.sin(cx2 * 0.05 + cly * 0.1 + cl) * 20;
                              clCx.fillStyle = 'rgb(' + Math.max(0, r2 + turb) + ',' + Math.max(0, g2 + turb * 0.7) + ',' + Math.max(0, b2 + turb * 0.3) + ')';
                              clCx.fillRect(cx2, cly, 1, 1);
                            }
                          }
                          var clTex = new THREE.CanvasTexture(clCv); clTex.wrapS = THREE.RepeatWrapping; clTex.repeat.set(3, 1);
                          var clMat = new THREE.MeshBasicMaterial({ map: clTex, transparent: true, opacity: 0.6 - cl * 0.1, side: THREE.DoubleSide });
                          var clMesh = new THREE.Mesh(clGeo, clMat);
                          clMesh.rotation.x = -Math.PI / 2; clMesh.position.y = -2 - cl * 4;
                          clMesh._cloudSpeed = 0.01 + cl * 0.005;
                          scene.add(clMesh);
                        }
                      }

                      // ── Lighting ──
                      scene.add(new THREE.AmbientLight(0x444466, 0.6));
                      var sunDir = new THREE.DirectionalLight(0xffeedd, sel.terrainType === 'iceworld' ? 0.3 : 1.0);
                      sunDir.position.set(50, 30, 20); scene.add(sunDir);

                      // ── 3D Rover / Probe Model ──
                      var roverGroup = new THREE.Group();
                      var redLight, greenLight;
                      if (!isGas) {
                        var bodyGeo = new THREE.BoxGeometry(0.8, 0.35, 1.2);
                        var bodyMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.6, roughness: 0.3 });
                        var bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
                        bodyMesh.position.y = 0.35;
                        roverGroup.add(bodyMesh);
                        var mastGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.5);
                        var mastMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.7 });
                        var mast = new THREE.Mesh(mastGeo, mastMat);
                        mast.position.set(0, 0.77, -0.3);
                        roverGroup.add(mast);
                        var headGeo = new THREE.BoxGeometry(0.2, 0.12, 0.15);
                        var headMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5 });
                        var head = new THREE.Mesh(headGeo, headMat);
                        head.position.set(0, 1.05, -0.32);
                        roverGroup.add(head);
                        var lensGeo = new THREE.SphereGeometry(0.04, 8, 8);
                        var lensMat = new THREE.MeshStandardMaterial({ color: 0x00aaff, emissive: 0x0066ff, emissiveIntensity: 0.8 });
                        var lens = new THREE.Mesh(lensGeo, lensMat);
                        lens.position.set(0, 1.05, -0.41);
                        roverGroup.add(lens);
                        var panelGeo = new THREE.BoxGeometry(1.0, 0.03, 0.6);
                        var panelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a5e, metalness: 0.3, roughness: 0.5 });
                        var panel = new THREE.Mesh(panelGeo, panelMat);
                        panel.position.set(0, 0.56, 0.15);
                        roverGroup.add(panel);
                        var wheelGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.08, 12);
                        var wheelMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.4, roughness: 0.8 });
                        var wheelPositions = [
                          [-0.45, 0.15, -0.4], [-0.45, 0.15, 0], [-0.45, 0.15, 0.4],
                          [0.45, 0.15, -0.4], [0.45, 0.15, 0], [0.45, 0.15, 0.4]
                        ];
                        wheelPositions.forEach(function(wp) {
                          var wheel = new THREE.Mesh(wheelGeo, wheelMat);
                          wheel.position.set(wp[0], wp[1], wp[2]);
                          wheel.rotation.z = Math.PI / 2;
                          roverGroup.add(wheel);
                        });
                        var antGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.8);
                        var antMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8 });
                        var ant = new THREE.Mesh(antGeo, antMat);
                        ant.position.set(0.25, 0.92, 0.3);
                        roverGroup.add(ant);
                        var dishGeo = new THREE.CircleGeometry(0.1, 12);
                        var dishMat = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, metalness: 0.3 });
                        var dish = new THREE.Mesh(dishGeo, dishMat);
                        dish.position.set(0.25, 1.35, 0.3);
                        dish.rotation.x = -0.5;
                        roverGroup.add(dish);
                      } else {
                        var probeGeo = new THREE.SphereGeometry(0.4, 16, 12);
                        var probeMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.7, roughness: 0.2 });
                        var probe = new THREE.Mesh(probeGeo, probeMat);
                        probe.position.y = 0;
                        roverGroup.add(probe);
                        var shieldGeo = new THREE.SphereGeometry(0.42, 16, 8, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5);
                        var shieldMat = new THREE.MeshStandardMaterial({ color: 0xcc6600, metalness: 0.2, roughness: 0.8 });
                        var shield = new THREE.Mesh(shieldGeo, shieldMat);
                        shield.rotation.x = Math.PI;
                        roverGroup.add(shield);
                        var boomGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.0);
                        var boomMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.6 });
                        var boom = new THREE.Mesh(boomGeo, boomMat);
                        boom.position.set(0, 0.5, 0);
                        roverGroup.add(boom);
                        var pAntGeo = new THREE.ConeGeometry(0.08, 0.2, 8);
                        var pAntMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.5 });
                        var pAnt = new THREE.Mesh(pAntGeo, pAntMat);
                        pAnt.position.set(0, 1.1, 0);
                        roverGroup.add(pAnt);
                        var lightGeo = new THREE.SphereGeometry(0.05, 8, 8);
                        var lightMat1 = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1.0 });
                        var lightMat2 = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 1.0 });
                        redLight = new THREE.Mesh(lightGeo, lightMat1);
                        redLight.position.set(0.3, 0.1, 0.3);
                        roverGroup.add(redLight);
                        greenLight = new THREE.Mesh(lightGeo, lightMat2);
                        greenLight.position.set(-0.3, 0.1, 0.3);
                        roverGroup.add(greenLight);
                      }
                      roverGroup.position.set(0, isGas ? 5 : 0, 0);
                      scene.add(roverGroup);

                      // ── Scattered rocks/boulders ──
                      var envObjects = [];
                      if (!isGas) {
                        var rockColor = new THREE.Color(sel.terrainColor || '#886644');
                        for (var ri = 0; ri < 80; ri++) {
                          var rSize = 0.1 + Math.random() * 0.6;
                          var rGeo = new THREE.DodecahedronGeometry(rSize, 0);
                          var rPositions = rGeo.attributes.position.array;
                          for (var rv = 0; rv < rPositions.length; rv += 3) {
                            rPositions[rv] *= 0.7 + Math.random() * 0.6;
                            rPositions[rv + 1] *= 0.5 + Math.random() * 0.5;
                            rPositions[rv + 2] *= 0.7 + Math.random() * 0.6;
                          }
                          rGeo.computeVertexNormals();
                          var rMat = new THREE.MeshStandardMaterial({
                            color: rockColor.clone().offsetHSL(Math.random() * 0.05 - 0.025, Math.random() * 0.1 - 0.05, Math.random() * 0.1 - 0.05),
                            roughness: 0.9, metalness: 0.1, flatShading: true
                          });
                          var rock = new THREE.Mesh(rGeo, rMat);
                          rock.position.set((Math.random() - 0.5) * 80, rSize * 0.3, (Math.random() - 0.5) * 80);
                          rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
                          scene.add(rock);
                          envObjects.push(rock);
                        }
                        for (var bi2 = 0; bi2 < 6; bi2++) {
                          var bSize = 1.5 + Math.random() * 2;
                          var bGeo = new THREE.DodecahedronGeometry(bSize, 1);
                          var bPositions = bGeo.attributes.position.array;
                          for (var bv = 0; bv < bPositions.length; bv += 3) {
                            bPositions[bv] *= 0.6 + Math.random() * 0.8;
                            bPositions[bv + 1] *= 0.4 + Math.random() * 0.6;
                            bPositions[bv + 2] *= 0.6 + Math.random() * 0.8;
                          }
                          bGeo.computeVertexNormals();
                          var bMat = new THREE.MeshStandardMaterial({
                            color: rockColor.clone().offsetHSL(0, -0.05, -0.1),
                            roughness: 0.95, metalness: 0.05, flatShading: true
                          });
                          var boulder = new THREE.Mesh(bGeo, bMat);
                          boulder.position.set((Math.random() - 0.5) * 60, bSize * 0.25, (Math.random() - 0.5) * 60);
                          boulder.rotation.y = Math.random() * Math.PI * 2;
                          scene.add(boulder);
                          envObjects.push(boulder);
                        }
                      }

                      // ── Particle effects ──
                      if (sel.terrainType === 'desert' || sel.terrainType === 'volcanic') {
                        var partCount = 200;
                        var partGeo = new THREE.BufferGeometry();
                        var partPos = new Float32Array(partCount * 3);
                        for (var pi = 0; pi < partCount; pi++) {
                          partPos[pi * 3] = (Math.random() - 0.5) * 60;
                          partPos[pi * 3 + 1] = Math.random() * 8;
                          partPos[pi * 3 + 2] = (Math.random() - 0.5) * 60;
                        }
                        partGeo.setAttribute('position', new THREE.BufferAttribute(partPos, 3));
                        var partColor = sel.terrainType === 'volcanic' ? 0xff6600 : 0xc9a06a;
                        scene.add(new THREE.Points(partGeo, new THREE.PointsMaterial({ color: partColor, size: 0.05, transparent: true, opacity: 0.4 })));
                      }
                      var diamonds = null;
                      if (sel.terrainType === 'icegiant' || sel.name === 'Uranus') {
                        var drCount = 100;
                        var drGeo = new THREE.BufferGeometry();
                        var drPos = new Float32Array(drCount * 3);
                        for (var di = 0; di < drCount; di++) {
                          drPos[di * 3] = (Math.random() - 0.5) * 40;
                          drPos[di * 3 + 1] = Math.random() * 20;
                          drPos[di * 3 + 2] = (Math.random() - 0.5) * 40;
                        }
                        drGeo.setAttribute('position', new THREE.BufferAttribute(drPos, 3));
                        diamonds = new THREE.Points(drGeo, new THREE.PointsMaterial({ color: 0xccddff, size: 0.08, transparent: true, opacity: 0.6 }));
                        scene.add(diamonds);
                      }

                      // ── Movement state ──
                      var moveState = { forward: false, back: false, left: false, right: false, up: false, down: false };
                      var yaw = 0, pitch = 0, playerPos = new THREE.Vector3(0, isGas ? 5 : 1.6, 0);
                      var speed3d = isGas ? 0.15 : 0.08;

                      function onKey(e, pressed) {
                        switch (e.key.toLowerCase()) {
                          case 'w': case 'arrowup': moveState.forward = pressed; break;
                          case 's': case 'arrowdown': moveState.back = pressed; break;
                          case 'a': case 'arrowleft': moveState.left = pressed; break;
                          case 'd': case 'arrowright': moveState.right = pressed; break;
                          case 'q': case ' ': moveState.up = pressed; break;
                          case 'e': case 'shift': moveState.down = pressed; break;
                        }
                        e.preventDefault();
                      }
                      canvasEl.tabIndex = 0;
                      canvasEl.addEventListener('keydown', function(e) { onKey(e, true); });
                      canvasEl.addEventListener('keyup', function(e) { onKey(e, false); });

                      // Mouse look
                      var isLooking = false;
                      canvasEl.addEventListener('mousedown', function(e) { isLooking = true; if (canvasEl.requestPointerLock) canvasEl.requestPointerLock(); });
                      canvasEl.addEventListener('mouseup', function() { isLooking = false; });
                      function onMouseMove(e) {
                        if (!isLooking && !document.pointerLockElement) return;
                        yaw -= e.movementX * 0.003;
                        pitch = Math.max(-1.2, Math.min(1.2, pitch - e.movementY * 0.003));
                      }
                      document.addEventListener('mousemove', onMouseMove);
                      canvasEl.focus();

                      var tick3d = 0;
                      var animId3d;
                      var hudMode = 'full';

                      // ── Rich Educational HUD ──
                      var hud = document.createElement('div');
                      hud.className = 'rover-hud';
                      hud.style.cssText = 'position:absolute;top:8px;left:8px;background:rgba(0,0,0,0.75);backdrop-filter:blur(8px);border-radius:12px;padding:10px 14px;color:#38bdf8;font-family:monospace;font-size:10px;pointer-events:none;z-index:10;border:1px solid rgba(56,189,248,0.3);max-width:290px;transition:opacity 0.3s';
                      var modeLabel = isGas ? '\uD83D\uDEF8 ATMOSPHERIC PROBE' : '\uD83D\uDE97 SURFACE ROVER';
                      var atmosLabel = sel.atmosphere || 'No data';
                      var gravLabel = sel.gravity || '?';
                      var featList = (sel.notableFeatures || []).slice(0, 3).map(function(f) { return '<div style="color:#94a3b8;font-size:9px;padding-left:8px">\u2022 ' + f + '</div>'; }).join('');

                      // ── Fullscreen Toggle ──
                      var fsToggle = document.createElement('button');
                      fsToggle.style.cssText = 'position:absolute;top:8px;right:64px;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);border-radius:8px;width:48px;height:48px;display:flex;align-items:center;justify-content:center;color:#38bdf8;font-size:24px;border:1px solid rgba(56,189,248,0.3);cursor:pointer;z-index:15;transition:background 0.2s';
                      fsToggle.innerHTML = '\u26F6';
                      fsToggle.title = "Toggle Fullscreen";
                      fsToggle.onmouseover = function() { this.style.background = 'rgba(56,189,248,0.3)'; };
                      fsToggle.onmouseout = function() { this.style.background = 'rgba(0,0,0,0.6)'; };
                      fsToggle.onclick = function() {
                        var container = document.getElementById('drone-fullscreen-container') || canvasEl.parentElement;
                        if (!document.fullscreenElement) {
                          if (container.requestFullscreen) { container.requestFullscreen(); }
                          else if (container.mozRequestFullScreen) { container.mozRequestFullScreen(); }
                          else if (container.webkitRequestFullscreen) { container.webkitRequestFullscreen(); }
                          else if (container.msRequestFullscreen) { container.msRequestFullscreen(); }
                          fsToggle.innerHTML = '\xDF';
                        } else {
                          if (document.exitFullscreen) { document.exitFullscreen(); }
                          else if (document.mozCancelFullScreen) { document.mozCancelFullScreen(); }
                          else if (document.webkitExitFullscreen) { document.webkitExitFullscreen(); }
                          else if (document.msExitFullscreen) { document.msExitFullscreen(); }
                          fsToggle.innerHTML = '\u26F6';
                        }
                      };
                      canvasEl.parentElement.appendChild(fsToggle);

                      document.addEventListener('fullscreenchange', function() {
                        if (!renderer || !camera) return;
                        var isFS = !!document.fullscreenElement;
                        var w = isFS ? window.innerWidth : (canvasEl.clientWidth || 900);
                        var hh = isFS ? window.innerHeight : (canvasEl.clientHeight || 600);
                        camera.aspect = w / hh;
                        camera.updateProjectionMatrix();
                        renderer.setSize(w, hh);
                      });

                      var hudStaticHTML =
                        '<div style="font-weight:bold;font-size:12px;margin-bottom:6px;color:#7dd3fc;letter-spacing:1px" id="hud-mode">' + modeLabel + '</div>' +
                        '<div style="display:grid;grid-template-columns:auto 1fr;gap:2px 8px;margin-bottom:4px">' +
                        '<span style="color:#64748b">Planet</span><span style="color:#e2e8f0;font-weight:bold">' + sel.name + ' ' + sel.emoji + '</span>' +
                        '<span style="color:#64748b">Gravity</span><span>' + gravLabel + '</span>' +
                        '<span style="color:#64748b">Temp</span><span>' + sel.temp + '</span>' +
                        '<span style="color:#64748b">Atmos</span><span style="font-size:9px">' + atmosLabel + '</span>' +
                        '</div>' +
                        '<div id="hud-simple-row" style="border-top:1px solid rgba(56,189,248,0.12);padding-top:4px;margin-bottom:4px;display:grid;grid-template-columns:auto 1fr;gap:2px 8px">' +
                        '<span style="color:#64748b" title="Points of interest found">\uD83D\uDD2D Disc</span><span id="hud-disc" style="color:#fbbf24">0 / 0</span>' +
                        '</div>' +
                        '<div id="hud-standard-rows" style="border-top:1px solid rgba(56,189,248,0.12);padding-top:4px;margin-bottom:4px;display:grid;grid-template-columns:auto 1fr;gap:2px 8px">' +
                        '<span style="color:#64748b" title="Compass heading: 0=N, 90=E, 180=S, 270=W">\uD83E\uDDED Hdg</span><span id="hud-hdg" style="color:#67e8f9">N 0\u00B0</span>' +
                        '<span style="color:#64748b" title="Cartesian grid position (X, Y)">\uD83D\uDCCD Pos</span><span id="hud-pos" style="color:#67e8f9;font-size:9px">0.0, 0.0</span>' +
                        '<span style="color:#64748b" title="Current speed in m/s">\uD83D\uDCA8 Spd</span><span id="hud-spd" style="color:#67e8f9">0 m/s</span>' +
                        '</div>' +
                        '<div id="hud-full-rows" style="border-top:1px solid rgba(56,189,248,0.12);padding-top:4px;margin-bottom:4px;display:grid;grid-template-columns:auto 1fr;gap:2px 8px">' +
                        '<span style="color:#64748b" title="Height above surface (radar altimeter)">\uD83D\uDCCF Alt</span><span id="hud-alt" style="color:#67e8f9">0 m</span>' +
                        '<span style="color:#64748b" title="Total distance traveled">\uD83D\uDEB6 Dist</span><span id="hud-odo" style="color:#67e8f9">0 m</span>' +
                        '<span style="color:#64748b" title="Navigation target distance">\uD83C\uDFAF Tgt</span><span id="hud-tgt" style="color:#a78bfa">-- m</span>' +
                        '</div>' +
                        (featList ? '<div style="border-top:1px solid rgba(56,189,248,0.12);padding-top:3px;margin-bottom:3px"><span style="color:#7dd3fc;font-weight:bold;font-size:9px">\uD83D\uDD2D NOTABLE</span>' + featList + '</div>' : '') +
                        '<div style="border-top:1px solid rgba(56,189,248,0.12);padding-top:3px;color:#94a3b8;font-size:9px">WASD move \u2022 Mouse look \u2022 V view \u2022 M mission \u2022 <span style="color:#38bdf8">H</span> hud \u2022 <span style="color:#a78bfa">N</span> nav \u2022 <span style="color:#8b5cf6">P</span> plot</div>';
                      hud.innerHTML = hudStaticHTML;
                      canvasEl.parentElement.appendChild(hud);

                      // ── Hazard Warning Strip ──
                      var hazardEl = document.createElement('div');
                      hazardEl.style.cssText = 'position:absolute;top:8px;left:50%;transform:translateX(-50%);background:rgba(220,38,38,0.85);backdrop-filter:blur(4px);border-radius:8px;padding:5px 16px;color:#fff;font-family:monospace;font-size:10px;font-weight:bold;pointer-events:none;z-index:11;border:1px solid rgba(255,100,100,0.4);text-align:center;opacity:0;transition:opacity 0.5s;letter-spacing:0.5px';
                      var hazardMsgs = {};
                      hazardMsgs['Venus'] = ['\u26A0 SURFACE TEMP 462\u00B0C \u2014 exceeds hull tolerance', '\u26A0 ATMOSPHERIC PRESSURE: 90x Earth \u2014 structural warning', '\u26A0 SULFURIC ACID CLOUDS DETECTED overhead'];
                      hazardMsgs['Jupiter'] = ['\u26A0 RADIATION: 20 Sv/day \u2014 lethal exposure zone', '\u26A0 WIND SHEAR: 360 km/h crosswind detected', '\u26A0 AMMONIA ICE CRYSTALS impacting sensors'];
                      hazardMsgs['Saturn'] = ['\u26A0 RING DEBRIS: micro-meteoroid risk elevated', '\u26A0 WIND SPEED: 1,800 km/h at equatorial band'];
                      hazardMsgs['Mars'] = ['\u26A0 DUST STORM APPROACHING \u2014 visibility dropping', '\u26A0 UV RADIATION: no magnetic shield \u2014 high exposure', '\u26A0 THIN ATMOSPHERE: suit pressure critical'];
                      hazardMsgs['Mercury'] = ['\u26A0 SOLAR RADIATION ALERT \u2014 no magnetic shielding', '\u26A0 SURFACE TEMP SWING: -180\u00B0C to 430\u00B0C across terminator'];
                      hazardMsgs['Pluto'] = ['\u26A0 COMMS DELAY: 5h 28m one-way to Earth', '\u26A0 SURFACE TEMP: -230\u00B0C \u2014 nitrogen ice sublimating'];
                      hazardMsgs['Uranus'] = ['\u26A0 DIAMOND RAIN: high-pressure carbon crystallization', '\u26A0 97.8\u00B0 AXIAL TILT: extreme seasonal variations'];
                      hazardMsgs['Neptune'] = ['\u26A0 WIND SPEED: 2,100 km/h \u2014 fastest in solar system', '\u26A0 GREAT DARK SPOT: storm system ahead'];
                      hazardMsgs['Earth'] = ['\u2139 All systems nominal \u2014 home sweet home'];
                      var planetHazards = hazardMsgs[sel.name] || ['\u26A0 Environmental data unavailable'];
                      var hazardIdx = 0;
                      canvasEl.parentElement.appendChild(hazardEl);

                      var hazardTimer = setInterval(function() {
                        hazardEl.style.opacity = '0';
                        playSound('hazard');
                        setTimeout(function() {
                          hazardEl.textContent = planetHazards[hazardIdx % planetHazards.length];
                          hazardEl.style.background = sel.name === 'Earth' ? 'rgba(34,197,94,0.8)' : 'rgba(220,38,38,0.85)';
                          hazardEl.style.opacity = '1';
                          hazardIdx++;
                        }, 500);
                        setTimeout(function() { hazardEl.style.opacity = '0'; }, 4500);
                      }, 8000);

                      setTimeout(function() {
                        hazardEl.textContent = planetHazards[0];
                        hazardEl.style.background = sel.name === 'Earth' ? 'rgba(34,197,94,0.8)' : 'rgba(220,38,38,0.85)';
                        hazardEl.style.opacity = '1';
                        hazardIdx = 1;
                        setTimeout(function() { hazardEl.style.opacity = '0'; }, 4500);
                      }, 2000);

                      // ── Discovery System (POI landmarks) ──
                      var POI_DATA = {};
                      POI_DATA['Mercury'] = [
                        { x: 15, z: -10, name: 'Caloris Basin', desc: 'One of the largest impact craters in the solar system (1,550 km wide).', fact: 'The impact was so powerful it created chaotic terrain on the opposite side of Mercury.' },
                        { x: -20, z: 8, name: 'Polar Ice Deposits', desc: 'Permanently shadowed craters at the poles contain water ice.', fact: 'Despite being closest to the Sun, Mercury has ice because some craters never see sunlight.' },
                        { x: 30, z: 25, name: 'Lobate Scarps (Cliffs)', desc: 'Mercury shrank as its iron core cooled, creating massive cliff-like wrinkles.', fact: 'These scarps can be hundreds of km long and over 1 km tall.' }
                      ];
                      POI_DATA['Venus'] = [
                        { x: 12, z: -15, name: 'Maxwell Montes', desc: 'Highest mountain on Venus at 11 km \u2014 taller than Everest.', fact: 'The summit is coated with a metallic "snow" made from lead sulfide and bismuth sulfide.' },
                        { x: -18, z: 20, name: 'Pancake Dome', desc: 'Flat-topped volcanic domes unique to Venus, up to 65 km across.', fact: 'Extremely viscous lava oozed out and spread like thick pancake batter.' },
                        { x: 25, z: 5, name: 'Venera 13 Landing Site', desc: 'Soviet lander that survived 127 minutes on the surface in 1982.', fact: 'Venera 13 took the first color photos of Venus\u2019s surface before being crushed by pressure.' }
                      ];
                      POI_DATA['Earth'] = [
                        { x: 10, z: -12, name: 'Mariana Trench', desc: 'Deepest point on Earth at nearly 11,000 meters below sea level.', fact: 'More people have walked on the Moon than have been to the bottom of the Mariana Trench.' },
                        { x: -22, z: 15, name: 'Mid-Atlantic Ridge', desc: 'Underwater mountain range where tectonic plates diverge.', fact: 'The Atlantic Ocean grows about 2.5 cm wider every year.' },
                        { x: 28, z: -8, name: 'Great Barrier Reef', desc: 'Largest living structure on Earth, visible from space.', fact: 'The reef is made of 2,900 individual reef systems and supports 1,500+ species of fish.' }
                      ];
                      POI_DATA['Mars'] = [
                        { x: 20, z: -18, name: 'Olympus Mons Base', desc: 'Base of the tallest volcano in the solar system at 21.9 km.', fact: 'Olympus Mons is so wide (624 km) that standing on its edge, you couldn\u2019t see the summit \u2014 it curves beyond the horizon.' },
                        { x: -25, z: 12, name: 'Valles Marineris Rim', desc: 'A canyon system 4,000 km long and up to 7 km deep.', fact: 'It would stretch from New York to Los Angeles and is 5x deeper than the Grand Canyon.' },
                        { x: 8, z: 30, name: 'Polar Ice Cap', desc: 'Layered ice deposits of frozen CO2 and water ice.', fact: 'If all of Mars\u2019s polar ice melted, it could cover the entire planet in 11 meters of water.' },
                        { x: -15, z: -25, name: 'Perseverance Rover Site', desc: 'Jezero Crater \u2014 where NASA\u2019s rover searches for signs of ancient life.', fact: 'Perseverance arrived Feb 2021 and has driven 28+ km, collecting rock samples for future return to Earth.' }
                      ];
                      POI_DATA['Jupiter'] = [
                        { x: 18, z: -20, name: 'Great Red Spot Eye', desc: 'An anticyclonic storm raging for 350+ years, larger than Earth.', fact: 'Wind speeds at the edge reach 680 km/h \u2014 twice the speed of the strongest Earth hurricane.' },
                        { x: -15, z: 15, name: 'Ammonia Crystal Layer', desc: 'Upper cloud layer made of frozen ammonia crystals at -145\u00B0C.', fact: 'Below this layer are ammonium hydrosulfide clouds, and below those, water clouds. Jupiter has weather 3 layers deep.' },
                        { x: 25, z: 8, name: 'Lightning Alley', desc: 'Zones between cloud bands where convection drives massive lightning storms.', fact: 'Jupiter\u2019s lightning is 10x more powerful than Earth\u2019s and occurs mostly at the poles and deep clouds.' },
                        { x: -8, z: -28, name: 'Metallic Hydrogen Zone', desc: 'Deep below the clouds, pressure turns hydrogen into liquid metal.', fact: 'This metallic hydrogen ocean generates Jupiter\u2019s magnetic field \u2014 20,000x stronger than Earth\u2019s.' }
                      ];
                      POI_DATA['Saturn'] = [
                        { x: 20, z: -15, name: 'Hexagonal Polar Vortex', desc: 'A persistent hexagonal cloud pattern at Saturn\u2019s north pole.', fact: 'Each side of the hexagon is about 14,500 km long \u2014 wider than Earth\u2019s diameter.' },
                        { x: -18, z: 22, name: 'Ring Shadow Zone', desc: 'Area where Saturn\u2019s rings cast shadows on the cloud tops.', fact: 'Saturn\u2019s rings are only about 10 m thick despite being 282,000 km wide \u2014 thinner than a razor blade proportionally.' },
                        { x: 12, z: 10, name: 'Titan Flyby Path', desc: 'The orbital zone of Titan, Saturn\'s largest moon with a thick atmosphere.', fact: 'Titan has lakes of liquid methane and a thicker atmosphere than Earth \u2014 the only moon with a substantial atmosphere.' }
                      ];
                      POI_DATA['Uranus'] = [
                        { x: 15, z: -18, name: 'Diamond Rain Zone', desc: 'At 8,000 km depth, extreme pressure crushes carbon into diamonds.', fact: 'These diamonds may be as large as millions of carats and rain down to form a diamond layer around the core.' },
                        { x: -20, z: 14, name: 'Magnetic Pole Shift', desc: 'Uranus\u2019s magnetic field is tilted 59\u00B0 from its rotation axis.', fact: 'Combined with the 98\u00B0 axial tilt, Uranus\u2019s magnetosphere tumbles chaotically through space.' },
                        { x: 25, z: -5, name: 'Cloud Band Transition', desc: 'Faint methane cloud bands where wind patterns change direction.', fact: 'Uranus appears featureless but Hubble revealed complex cloud systems moving at 900 km/h.' }
                      ];
                      POI_DATA['Neptune'] = [
                        { x: 18, z: -22, name: 'Great Dark Spot Region', desc: 'A massive storm system similar to Jupiter\u2019s Great Red Spot.', fact: 'Unlike Jupiter\u2019s spot, Neptune\u2019s dark spots appear and disappear within years \u2014 the planet is surprisingly dynamic.' },
                        { x: -14, z: 16, name: 'Supersonic Wind Belt', desc: 'Equatorial winds reaching 2,100 km/h \u2014 faster than the speed of sound.', fact: 'Neptune generates more heat than it receives from the Sun, driving these extreme winds from internal energy.' },
                        { x: 22, z: 10, name: 'Triton Orbital Cross', desc: 'The path of Triton \u2014 the only large moon that orbits backwards.', fact: 'Triton is likely a captured Kuiper Belt object. Its nitrogen geysers shoot plumes 8 km high.' }
                      ];
                      POI_DATA['Pluto'] = [
                        { x: 12, z: -14, name: 'Tombaugh Regio', desc: 'The famous heart-shaped glacier made of nitrogen and carbon monoxide ice.', fact: 'The left lobe (Sputnik Planitia) is a vast ice plain with convection cells that slowly churn the ice.' },
                        { x: -16, z: 18, name: 'Ice Mountains', desc: 'Mountains of water ice rising 2\u20133 km above the nitrogen plains.', fact: 'Because water ice is less dense than nitrogen ice at Pluto\u2019s temperatures, these mountains literally float.' },
                        { x: 20, z: 5, name: 'Cthulhu Macula', desc: 'A dark equatorial region about 2,990 km long, covered in tholins.', fact: 'Tholins are complex organic molecules created when methane is irradiated \u2014 they give Pluto its reddish-brown color.' }
                      ];

                      var pois = POI_DATA[sel.name] || [];
                      var discoveredPOIs = {};
                      var totalPOIs = pois.length;

                      // Place POI markers in scene
                      var poiMeshes = [];
                      pois.forEach(function(poi, idx) {
                        var poiGeo = new THREE.SphereGeometry(0.3, 8, 8);
                        var poiMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.7 });
                        var poiMesh = new THREE.Mesh(poiGeo, poiMat);
                        poiMesh.position.set(poi.x, isGas ? 3 : 1.5, poi.z);
                        poiMesh._poiIdx = idx;
                        scene.add(poiMesh);
                        poiMeshes.push(poiMesh);
                        var ringGeo2 = new THREE.RingGeometry(0.5, 0.8, 16);
                        var ringMat2 = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
                        var ringMesh2 = new THREE.Mesh(ringGeo2, ringMat2);
                        ringMesh2.rotation.x = -Math.PI / 2;
                        ringMesh2.position.set(poi.x, isGas ? 2.5 : 1.0, poi.z);
                        ringMesh2._pulsePhase = idx;
                        scene.add(ringMesh2);
                        poiMeshes.push(ringMesh2);
                      });

                      // Discovery card overlay
                      var discCard = document.createElement('div');
                      discCard.style.cssText = 'position:absolute;bottom:56px;right:8px;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);border-radius:12px;padding:12px 16px;color:#fff;font-family:sans-serif;font-size:11px;pointer-events:none;z-index:11;border:1px solid rgba(251,191,36,0.4);max-width:280px;opacity:0;transition:opacity 0.5s,transform 0.5s;transform:translateY(10px)';
                      canvasEl.parentElement.appendChild(discCard);
                      var discTimeout = null;

                      function showDiscovery(poi, idx) {
                        if (discoveredPOIs[idx]) return;
                        discoveredPOIs[idx] = true;
                        playSound('discovery');
                        var discCount = Object.keys(discoveredPOIs).length;
                        discCard.innerHTML =
                          '<div style="font-weight:bold;font-size:13px;color:#fbbf24;margin-bottom:4px">\uD83D\uDD0D DISCOVERY: ' + poi.name + '</div>' +
                          '<div style="color:#e2e8f0;margin-bottom:4px;line-height:1.4">' + poi.desc + '</div>' +
                          '<div style="color:#67e8f9;font-size:10px;font-style:italic;border-top:1px solid rgba(251,191,36,0.2);padding-top:4px">\uD83D\uDCA1 ' + poi.fact + '</div>' +
                          '<div style="color:#34d399;font-size:10px;font-weight:bold;margin-top:4px">\u2B50 +10 XP \u2022 ' + discCount + '/' + totalPOIs + ' discovered</div>';
                        discCard.style.opacity = '1';
                        discCard.style.transform = 'translateY(0)';
                        if (typeof awardStemXP === 'function') awardStemXP('solarSystem', 10);
                        if (discTimeout) clearTimeout(discTimeout);
                        discTimeout = setTimeout(function() {
                          discCard.style.opacity = '0';
                          discCard.style.transform = 'translateY(10px)';
                        }, 7000);
                      }

                      // ── Mission Card Overlay (M key toggle) ──
                      var missionCard = document.createElement('div');
                      missionCard.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.9);backdrop-filter:blur(12px);border-radius:16px;padding:24px;color:#fff;font-family:sans-serif;font-size:12px;pointer-events:auto;z-index:15;border:1px solid rgba(56,189,248,0.3);max-width:380px;width:90%;opacity:0;transition:opacity 0.3s;display:none';
                      var missionIcon = isGas ? '\uD83D\uDEF8' : '\uD83D\uDE97';
                      var missionType = isGas ? 'Atmospheric Survey' : 'Surface Exploration';
                      missionCard.innerHTML =
                        '<div style="text-align:center;margin-bottom:12px">' +
                        '<div style="font-size:32px;margin-bottom:4px">' + missionIcon + '</div>' +
                        '<div style="font-weight:bold;font-size:16px;color:#7dd3fc;letter-spacing:1px">MISSION BRIEFING</div>' +
                        '<div style="color:#94a3b8;font-size:11px">' + missionType + ' \u2014 ' + sel.name + '</div>' +
                        '</div>' +
                        '<div style="background:rgba(56,189,248,0.1);border-radius:10px;padding:10px 12px;margin-bottom:10px;border:1px solid rgba(56,189,248,0.15)">' +
                        '<div style="font-weight:bold;color:#38bdf8;margin-bottom:4px">\uD83C\uDFAF Objectives</div>' +
                        '<div id="mission-objectives" style="color:#e2e8f0;line-height:1.8">' +
                        pois.map(function(p, i) { return '<div id="obj-' + i + '" style="font-size:11px">\u2610 Discover ' + p.name + '</div>'; }).join('') +
                        '</div>' +
                        '</div>' +
                        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">' +
                        '<div style="background:rgba(251,191,36,0.1);border-radius:8px;padding:6px 8px;text-align:center;border:1px solid rgba(251,191,36,0.15)">' +
                        '<div style="color:#fbbf24;font-weight:bold;font-size:14px" id="mission-disc-count">0/' + totalPOIs + '</div>' +
                        '<div style="color:#94a3b8;font-size:9px">Discoveries</div></div>' +
                        '<div style="background:rgba(52,211,153,0.1);border-radius:8px;padding:6px 8px;text-align:center;border:1px solid rgba(52,211,153,0.15)">' +
                        '<div style="color:#34d399;font-weight:bold;font-size:14px" id="mission-xp-count">0</div>' +
                        '<div style="color:#94a3b8;font-size:9px">XP Earned</div></div>' +
                        '</div>' +
                        '<div style="text-align:center;color:#64748b;font-size:10px">Press <span style="color:#38bdf8;font-weight:bold">M</span> to close \u2022 <span style="color:#38bdf8;font-weight:bold">WASD</span> to move \u2022 <span style="color:#38bdf8;font-weight:bold">V</span> to toggle view</div>';
                      canvasEl.parentElement.appendChild(missionCard);
                      var missionVisible = false;

                      // Telemetry tracking state
                      var prevPos = new THREE.Vector3().copy(playerPos);
                      var odometer = 0;
                      var lastSpeed = 0;
                      var scaleFactor = isGas ? 100 : 50;

                      // ── Science Fact Ticker ──
                      var ticker = document.createElement('div');
                      ticker.style.cssText = 'position:absolute;bottom:8px;left:8px;right:8px;background:rgba(0,0,0,0.65);backdrop-filter:blur(4px);border-radius:8px;padding:6px 12px;color:#fbbf24;font-family:sans-serif;font-size:10px;pointer-events:none;z-index:10;border:1px solid rgba(251,191,36,0.2);text-align:center;transition:opacity 0.5s';
                      var scienceFacts = [
                        '\uD83E\uDEA8 ' + (sel.surfaceDesc || sel.fact),
                        '\uD83E\uDEA8 ' + sel.fact,
                        '\uD83C\uDF21 A day on ' + sel.name + ' lasts ' + (sel.dayLen || '?') + '. A year lasts ' + (sel.yearLen || '?') + '.',
                        '\uD83C\uDF21 Gravity on ' + sel.name + ' is ' + gravLabel + ' compared to Earth\u2019s 1.0g.',
                        '\uD83C\uDF0D ' + sel.name + '\u2019s diameter is ' + (sel.diameter || '?') + (sel.name !== 'Earth' ? ' (Earth: 12,742 km).' : '.'),
                        isGas ? '\uD83E\uDEA8 Gas giants have no solid surface \u2014 you would fall forever through ever-denser gas layers.' : '\uD83E\uDEA8 The terrain is generated from real-world elevation science for ' + sel.terrainType + ' surfaces.',
                        isGas ? '\uD83C\uDF21 If you parachuted into ' + sel.name + ', you would never touch ground \u2014 just endless clouds.' : '\uD83E\uDEA8 The surface of ' + sel.name + ' is made of ' + (sel.surface || 'rock and dust') + '.',
                        sel.name === 'Mercury' ? '\uD83D\uDE80 MESSENGER orbited Mercury 2011\u20132015, mapping the entire surface and discovering ice in polar craters.' : sel.name === 'Venus' ? '\uD83D\uDE80 Soviet Venera 13 survived 127 minutes on Venus\u2019s surface in 1982 \u2014 still a record.' : sel.name === 'Earth' ? '\uD83D\uDE80 The ISS orbits Earth every 90 minutes at 27,600 km/h, 408 km above us.' : sel.name === 'Mars' ? '\uD83D\uDE80 Perseverance landed Feb 2021 in Jezero Crater, searching for signs of ancient microbial life.' : sel.name === 'Jupiter' ? '\uD83D\uDE80 Juno has been orbiting Jupiter since 2016, peering beneath the cloud tops with microwave sensors.' : sel.name === 'Saturn' ? '\uD83D\uDE80 Cassini orbited Saturn for 13 years (2004\u20132017) before its grand finale plunge into the atmosphere.' : sel.name === 'Uranus' ? '\uD83D\uDE80 Only Voyager 2 has visited Uranus, flying by in January 1986 and discovering 10 new moons.' : sel.name === 'Neptune' ? '\uD83D\uDE80 Voyager 2 is the only spacecraft to visit Neptune, flying by in August 1989.' : '\uD83D\uDE80 NASA\u2019s New Horizons flew past Pluto in July 2015, revealing a geologically active world.',
                        sel.name === 'Mars' ? '\uD83C\uDF21 Mars has the largest dust storms in the solar system \u2014 they can engulf the entire planet for months.' : sel.name === 'Venus' ? '\uD83C\uDF21 Venus rotates backwards (retrograde) so slowly that its day is longer than its year.' : sel.name === 'Jupiter' ? '\uD83E\uDEA8 Jupiter\u2019s core may be a fuzzy mix of metallic hydrogen and dissolved rocky material.' : sel.name === 'Saturn' ? '\uD83C\uDF0D Saturn\u2019s density is 0.687 g/cm\u00B3 \u2014 it would float in a bathtub big enough to hold it.' : sel.name === 'Uranus' ? '\uD83C\uDF21 Uranus was knocked on its side by an ancient collision with an Earth-sized object.' : sel.name === 'Neptune' ? '\uD83E\uDEA8 Neptune radiates 2.6x more energy than it receives from the Sun \u2014 its own internal heat drives supersonic winds.' : sel.name === 'Pluto' ? '\uD83C\uDF0D Pluto and its moon Charon are tidally locked \u2014 they always show the same face to each other.' : sel.name === 'Mercury' ? '\uD83C\uDF0D Mercury has virtually no atmosphere \u2014 just a thin exosphere of atoms blasted off the surface by solar wind.' : '\uD83E\uDDE0 Every atom in your body was forged inside a star.',
                        '\uD83E\uDDEA Atmosphere: ' + atmosLabel,
                        sel.name === 'Mars' ? '\uD83E\uDDEA Mars\u2019s red color comes from iron oxide (rust) in its soil \u2014 the entire planet is literally rusty.' : sel.name === 'Venus' ? '\uD83E\uDDEA Venus\u2019s clouds contain sulfuric acid droplets \u2014 rain evaporates before reaching the surface.' : sel.name === 'Jupiter' ? '\uD83E\uDDEA Jupiter\u2019s interior contains metallic hydrogen \u2014 hydrogen so compressed it conducts electricity like a metal.' : sel.name === 'Saturn' ? '\uD83E\uDDEA Titan\u2019s thick atmosphere is mostly nitrogen, like Earth\u2019s, but with methane playing the role of water.' : sel.name === 'Uranus' ? '\uD83E\uDDEA Methane in Uranus\u2019s upper atmosphere absorbs red light, giving it that distinctive blue-green color.' : sel.name === 'Neptune' ? '\uD83E\uDDEA Neptune\u2019s vivid blue is from methane \u2014 but a still-unknown compound makes it bluer than Uranus.' : sel.name === 'Pluto' ? '\uD83E\uDDEA Tholins on Pluto\u2019s surface are complex organic molecules \u2014 building blocks for prebiotic chemistry.' : sel.name === 'Earth' ? '\uD83E\uDDEA Earth\u2019s ozone layer (O\u2083) absorbs 97\u201399% of the Sun\u2019s UV radiation, making life on land possible.' : '\uD83E\uDDEA Mercury\u2019s exosphere contains sodium, pumped off the surface by solar photons.'
                      ].filter(Boolean);
                      var factIdx = 0;
                      ticker.innerHTML = '\uD83D\uDCA1 ' + scienceFacts[0];
                      canvasEl.parentElement.appendChild(ticker);
                      var factTimer = setInterval(function() {
                        factIdx = (factIdx + 1) % scienceFacts.length;
                        ticker.style.opacity = '0';
                        setTimeout(function() { ticker.innerHTML = '\uD83D\uDCA1 ' + scienceFacts[factIdx]; ticker.style.opacity = '1'; }, 400);
                      }, 6000);

                      // ── Compass ──
                      var compass = document.createElement('div');
                      compass.style.cssText = 'position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);border-radius:50%;width:48px;height:48px;display:flex;align-items:center;justify-content:center;color:#38bdf8;font-size:18px;font-weight:bold;pointer-events:none;z-index:10;border:1px solid rgba(56,189,248,0.3)';
                      compass.innerHTML = '\uD83E\uDDED';
                      canvasEl.parentElement.appendChild(compass);

                      // ── 3rd-person toggle (V), Mission (M), HUD mode (H), Nav (N), Plotter (P) ──
                      var thirdPerson = false;
                      var tpOffset = new THREE.Vector3(0, 3, 6);
                      canvasEl.addEventListener('keydown', function(e) {
                        if (e.key === 'v' || e.key === 'V') {
                          thirdPerson = !thirdPerson;
                          var label = document.getElementById('hud-mode');
                          if (label) {
                            var viewLabel = thirdPerson ? ' [3RD PERSON]' : ' [1ST PERSON]';
                            label.textContent = modeLabel + viewLabel;
                          }
                        }
                        if (e.key === 'm' || e.key === 'M') {
                          missionVisible = !missionVisible;
                          missionCard.style.display = missionVisible ? 'block' : 'none';
                          setTimeout(function() { missionCard.style.opacity = missionVisible ? '1' : '0'; }, 10);
                        }
                        if (e.key === 'h' || e.key === 'H') {
                          var modes = ['simple', 'standard', 'full'];
                          hudMode = modes[(modes.indexOf(hudMode) + 1) % modes.length];
                          var stdRows = document.getElementById('hud-standard-rows');
                          var fullRows = document.getElementById('hud-full-rows');
                          if (stdRows) stdRows.style.display = (hudMode === 'standard' || hudMode === 'full') ? 'grid' : 'none';
                          if (fullRows) fullRows.style.display = hudMode === 'full' ? 'grid' : 'none';
                          var modeEl = document.getElementById('hud-mode');
                          if (modeEl) { var icons = { simple: '\uD83D\uDFE2', standard: '\uD83D\uDFE1', full: '\uD83D\uDD34' }; modeEl.textContent = modeLabel + ' [' + icons[hudMode] + ' ' + hudMode.toUpperCase() + ']'; }
                        }
                        if (e.key === 'n' || e.key === 'N') {
                          if (!navChallengeActive) { startNavChallenge(); } else { cancelNavChallenge(); }
                        }
                        if (e.key === 'p' || e.key === 'P') {
                          plotterVisible = !plotterVisible;
                          if (plotterPanel) { plotterPanel.style.display = plotterVisible ? 'block' : 'none'; setTimeout(function() { plotterPanel.style.opacity = plotterVisible ? '1' : '0'; }, 10); }
                        }
                      });

                      // ── Trail Line (disabled) ──
                      var trailPositions = []; var trailLine = null; var trailMaxPoints = 500;
                      function updateTrail() {
                        // Removed: User found the breadcrumb trail confusing as a "goal line".
                      }

                      // ── Navigation Challenge System (N key) ──
                      var navChallengeActive = false, navTargetX = 0, navTargetZ = 0, navTargetMesh = null;
                      var navCard = document.createElement('div');
                      navCard.style.cssText = 'position:absolute;bottom:56px;left:8px;background:rgba(0,0,0,0.88);backdrop-filter:blur(10px);border-radius:12px;padding:14px 18px;color:#fff;font-family:sans-serif;font-size:11px;pointer-events:none;z-index:12;border:1px solid rgba(167,139,250,0.4);max-width:280px;opacity:0;transition:opacity 0.4s;display:none';
                      canvasEl.parentElement.appendChild(navCard);
                      var NAV_CHALLENGES = [
                        { type: 'math_coord', cx: 120, cz: -160, mX: '60 \u00D7 2', mZ: '-80 \u00D7 2', prompt: 'Navigate to target coordinates. X = 60 \u00D7 2, Z = -80 \u00D7 2. (Grid is /10)', skill: 'Cartesian Math', badge: '\uD83D\uDCCD' },
                        { type: 'math_coord', cx: -150, cz: 200, mX: '-300 \u00F7 2', mZ: '100 \u00D7 2', prompt: 'Navigate to target coordinates. X = -300 \u00F7 2, Z = 100 \u00D7 2. (Grid is /10)', skill: 'Cartesian Math', badge: '\uD83D\uDCCD' },
                        { type: 'math_coord', cx: 250, cz: 80, mX: '125 + 125', mZ: '160 \u00F7 2', prompt: 'Navigate to target coordinates. X = 125 + 125, Z = 160 \u00F7 2. (Grid is /10)', skill: 'Cartesian Math', badge: '\uD83D\uDCCD' },
                        { type: 'math_coord', cx: 0, cz: -300, mX: '150 - 150', mZ: '-150 \u00D7 2', prompt: 'Navigate to target coordinates. X = 150 - 150, Z = -150 \u00D7 2. (Grid is /10)', skill: 'Cartesian Math', badge: '\uD83D\uDCCD' },
                        { type: 'math_coord', cx: -220, cz: -180, mX: '-110 \u00D7 2', mZ: '-90 \u00D7 2', prompt: 'Navigate to target coordinates. X = -110 \u00D7 2, Z = -90 \u00D7 2. (Grid is /10)', skill: 'Cartesian Math', badge: '\uD83D\uDCCD' },
                        { type: 'distance', prompt: 'A relay beacon is 35m away at heading 045\u00B0 (NE). Calculate and navigate to its position.', bearing: 45, dist: 3.5, skill: 'Trigonometry & Bearing', badge: '\uD83D\uDCE1' },
                        { type: 'distance', prompt: 'Mission control reports a sample site 50m away at heading 270\u00B0 (W). Navigate there.', bearing: 270, dist: 5, skill: 'Vector Navigation', badge: '\uD83D\uDCE1' }
                      ];
                      var navChallengeIdx = 0, navCompletedCount = 0;
                      var navGoalLine = null;

                      function startNavChallenge() {
                        var ch = NAV_CHALLENGES[navChallengeIdx % NAV_CHALLENGES.length];
                        navChallengeActive = true;
                        if (ch.type === 'cardinal') { navTargetX = playerPos.x + ch.dx; navTargetZ = playerPos.z + ch.dz; }
                        else if (ch.type === 'coord') { navTargetX = ch.tx; navTargetZ = ch.tz; }
                        else if (ch.type === 'math_coord') { navTargetX = ch.cx / 10; navTargetZ = ch.cz / 10; }
                        else if (ch.type === 'distance') { var rad = ch.bearing * Math.PI / 180; navTargetX = playerPos.x + Math.sin(rad) * ch.dist; navTargetZ = playerPos.z - Math.cos(rad) * ch.dist; }
                        if (navTargetMesh) scene.remove(navTargetMesh);
                        var beamGeo = new THREE.CylinderGeometry(0.15, 0.15, 8, 8);
                        var beamMat = new THREE.MeshBasicMaterial({ color: 0xa78bfa, transparent: true, opacity: 0.4 });
                        navTargetMesh = new THREE.Mesh(beamGeo, beamMat);
                        navTargetMesh.position.set(navTargetX, isGas ? 4 : 4, navTargetZ);
                        scene.add(navTargetMesh);

                        if (navGoalLine) scene.remove(navGoalLine);
                        var pts = [new THREE.Vector3(playerPos.x, isGas ? playerPos.y - 0.5 : 0.5, playerPos.z), new THREE.Vector3(navTargetX, isGas ? 4 : 0.5, navTargetZ)];
                        var lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
                        navGoalLine = new THREE.Line(lineGeo, new THREE.LineDashedMaterial({ color: 0xa78bfa, dashSize: 0.5, gapSize: 0.5, transparent: true, opacity: 0.8 }));
                        navGoalLine.computeLineDistances();
                        scene.add(navGoalLine);

                        navCard.innerHTML = '<div style="font-weight:bold;font-size:13px;color:#a78bfa;margin-bottom:6px">\uD83E\uDDED NAVIGATION CHALLENGE</div>' +
                          '<div style="color:#e2e8f0;margin-bottom:6px;line-height:1.5">' + ch.prompt + '</div>' +
                          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">' +
                          '<div style="background:rgba(167,139,250,0.15);border-radius:6px;padding:4px 6px;text-align:center"><div style="color:#a78bfa;font-weight:bold;font-size:12px" id="nav-dist">-- m</div><div style="color:#94a3b8;font-size:8px">DIST TO TARGET</div></div>' +
                          '<div style="background:rgba(167,139,250,0.15);border-radius:6px;padding:4px 6px;text-align:center"><div style="color:#a78bfa;font-weight:bold;font-size:12px" id="nav-bearing">--\u00B0</div><div style="color:#94a3b8;font-size:8px">BEARING</div></div>' +
                          '</div>' +
                          '<div style="margin-top:6px;color:#64748b;font-size:9px">\uD83C\uDF93 Skill: ' + ch.skill + ' \u2022 Press N to cancel</div>';
                        navCard.style.display = 'block';
                        setTimeout(function() { navCard.style.opacity = '1'; }, 10);
                      }

                      function cancelNavChallenge() {
                        navChallengeActive = false;
                        if (navTargetMesh) { scene.remove(navTargetMesh); navTargetMesh = null; }
                        if (navGoalLine) { scene.remove(navGoalLine); navGoalLine = null; }
                        navCard.style.opacity = '0'; setTimeout(function() { navCard.style.display = 'none'; }, 400);
                      }

                      function checkNavCompletion() {
                        if (!navChallengeActive) return;
                        var ndx = playerPos.x - navTargetX, ndz = playerPos.z - navTargetZ;
                        var nDist = Math.sqrt(ndx * ndx + ndz * ndz) * scaleFactor;
                        var nBearing = ((Math.atan2(navTargetX - playerPos.x, -(navTargetZ - playerPos.z)) * 180 / Math.PI) % 360 + 360) % 360;
                        var nDistEl = document.getElementById('nav-dist'); if (nDistEl) nDistEl.textContent = nDist.toFixed(0) + ' m';
                        var nBearEl = document.getElementById('nav-bearing'); if (nBearEl) nBearEl.textContent = Math.round(nBearing) + '\u00B0';
                        var tgtEl = document.getElementById('hud-tgt'); if (tgtEl) tgtEl.textContent = nDist.toFixed(0) + ' m';
                        if (nDist < 150) {
                          navCompletedCount++; navChallengeIdx++;
                          playSound('navComplete');
                          var ch = NAV_CHALLENGES[(navChallengeIdx - 1) % NAV_CHALLENGES.length];
                          navCard.innerHTML = '<div style="font-weight:bold;font-size:13px;color:#34d399;margin-bottom:4px">\u2705 TARGET REACHED!</div>' +
                            '<div style="color:#e2e8f0;margin-bottom:4px">Skill demonstrated: <span style="color:#a78bfa;font-weight:bold">' + ch.skill + '</span></div>' +
                            '<div style="color:#34d399;font-size:10px;font-weight:bold">\u2B50 +15 XP \u2022 ' + navCompletedCount + ' challenges completed</div>' +
                            '<div style="margin-top:4px;color:#64748b;font-size:9px">Press N for next challenge</div>';
                          if (typeof awardStemXP === 'function') awardStemXP('solarSystem', 15);
                          navChallengeActive = false;
                          if (navTargetMesh) { navTargetMesh.material.color.setHex(0x34d399); navTargetMesh.material.opacity = 0.7; }
                          if (navGoalLine) { navGoalLine.material.color.setHex(0x34d399); }
                          setTimeout(function() {
                            if (navTargetMesh) { scene.remove(navTargetMesh); navTargetMesh = null; }
                            if (navGoalLine) { scene.remove(navGoalLine); navGoalLine = null; }
                          }, 3000);
                        }
                      }

                      // ── Course Plotter System (P key) ──
                      var plotterVisible = false, plotterWaypoints = [], plotterRouteLine = null, plotterActiveWP = 0;
                      var plotterPanel = document.createElement('div');
                      plotterPanel.style.cssText = 'position:absolute;top:50%;right:8px;transform:translateY(-50%);background:rgba(0,0,0,0.92);backdrop-filter:blur(12px);border-radius:14px;padding:16px;color:#fff;font-family:sans-serif;font-size:11px;pointer-events:auto;z-index:14;border:1px solid rgba(56,189,248,0.3);width:260px;opacity:0;transition:opacity 0.3s;display:none';
                      plotterPanel.innerHTML = '<div style="font-weight:bold;font-size:14px;color:#38bdf8;margin-bottom:8px;letter-spacing:1px">\uD83D\uDDFA\uFE0F COURSE PLOTTER</div>' +
                        '<div style="color:#94a3b8;font-size:10px;margin-bottom:10px">Plan your traverse route like a NASA flight director. Enter waypoint coordinates (X, Z) to create a flight plan.</div>' +
                        '<div id="plotter-waypoints"></div>' +
                        '<div style="display:flex;gap:6px;margin-top:8px">' +
                        '<input id="wp-x" type="number" placeholder="X" style="width:60px;padding:4px 6px;border-radius:6px;border:1px solid rgba(56,189,248,0.3);background:rgba(56,189,248,0.1);color:#fff;font-size:11px;font-family:monospace" />' +
                        '<input id="wp-z" type="number" placeholder="Z" style="width:60px;padding:4px 6px;border-radius:6px;border:1px solid rgba(56,189,248,0.3);background:rgba(56,189,248,0.1);color:#fff;font-size:11px;font-family:monospace" />' +
                        '<button id="wp-add" style="padding:4px 10px;border-radius:6px;background:#38bdf8;color:#000;font-weight:bold;font-size:10px;border:none;cursor:pointer">+ Add</button>' +
                        '</div>' +
                        '<div style="display:flex;gap:6px;margin-top:8px">' +
                        '<button id="wp-launch" style="flex:1;padding:5px;border-radius:6px;background:linear-gradient(135deg,#8b5cf6,#6366f1);color:#fff;font-weight:bold;font-size:10px;border:none;cursor:pointer">\uD83D\uDE80 Launch Route</button>' +
                        '<button id="wp-clear" style="padding:5px 10px;border-radius:6px;background:rgba(239,68,68,0.2);color:#f87171;font-weight:bold;font-size:10px;border:1px solid rgba(239,68,68,0.3);cursor:pointer">Clear</button>' +
                        '</div>' +
                        '<div id="plotter-stats" style="margin-top:8px;padding-top:6px;border-top:1px solid rgba(56,189,248,0.12);color:#94a3b8;font-size:9px"></div>';
                      canvasEl.parentElement.appendChild(plotterPanel);

                      var plotterWPMeshes = [];
                      plotterPanel.querySelector('#wp-add').addEventListener('click', function() {
                        var xIn = plotterPanel.querySelector('#wp-x'), zIn = plotterPanel.querySelector('#wp-z');
                        var ppx = parseFloat(xIn.value), ppz = parseFloat(zIn.value);
                        if (isNaN(ppx) || isNaN(ppz)) return;
                        if (plotterWaypoints.length >= 5) return;
                        plotterWaypoints.push({ x: ppx / 10, z: ppz / 10 });
                        xIn.value = ''; zIn.value = '';
                        refreshPlotterUI();
                      });
                      plotterPanel.querySelector('#wp-clear').addEventListener('click', function() {
                        plotterWaypoints = []; plotterActiveWP = 0;
                        if (plotterRouteLine) { scene.remove(plotterRouteLine); plotterRouteLine = null; }
                        plotterWPMeshes.forEach(function(m) { scene.remove(m); }); plotterWPMeshes = [];
                        refreshPlotterUI();
                      });
                      plotterPanel.querySelector('#wp-launch').addEventListener('click', function() {
                        if (plotterWaypoints.length < 2) return;
                        plotterActiveWP = 0;
                        drawPlotterRoute();
                        trailPositions = [];
                      });

                      function refreshPlotterUI() {
                        var wpDiv = plotterPanel.querySelector('#plotter-waypoints');
                        if (!wpDiv) return;
                        wpDiv.innerHTML = plotterWaypoints.map(function(wp, i) {
                          var wpLabel = i === 0 ? '\uD83D\uDFE2 START' : i === plotterWaypoints.length - 1 ? '\uD83D\uDD34 END' : '\uD83D\uDD35 WP' + i;
                          return '<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid rgba(56,189,248,0.08)"><span style="color:#7dd3fc">' + wpLabel + '</span><span style="color:#e2e8f0;font-family:monospace">(' + (wp.x * 10).toFixed(0) + ', ' + (wp.z * 10).toFixed(0) + ')</span></div>';
                        }).join('');
                        var total = 0;
                        for (var wi = 1; wi < plotterWaypoints.length; wi++) {
                          var ddx = plotterWaypoints[wi].x - plotterWaypoints[wi - 1].x, ddz = plotterWaypoints[wi].z - plotterWaypoints[wi - 1].z;
                          total += Math.sqrt(ddx * ddx + ddz * ddz) * scaleFactor;
                        }
                        var statsDiv = plotterPanel.querySelector('#plotter-stats');
                        if (statsDiv) statsDiv.innerHTML = '\uD83D\uDCCF Total distance: <span style="color:#38bdf8">' + total.toFixed(0) + ' m</span> \u2022 Waypoints: ' + plotterWaypoints.length + '/5';
                      }

                      function drawPlotterRoute() {
                        if (plotterRouteLine) scene.remove(plotterRouteLine);
                        plotterWPMeshes.forEach(function(m) { scene.remove(m); }); plotterWPMeshes = [];
                        var pts = plotterWaypoints.map(function(wp) { return new THREE.Vector3(wp.x, isGas ? 3 : 0.2, wp.z); });
                        if (pts.length > 1) {
                          var geo = new THREE.BufferGeometry().setFromPoints(pts);
                          plotterRouteLine = new THREE.Line(geo, new THREE.LineDashedMaterial({ color: 0x8b5cf6, dashSize: 0.5, gapSize: 0.3, transparent: true, opacity: 0.7 }));
                          plotterRouteLine.computeLineDistances();
                          scene.add(plotterRouteLine);
                        }
                        plotterWaypoints.forEach(function(wp, i) {
                          var mpColor = i === 0 ? 0x34d399 : i === plotterWaypoints.length - 1 ? 0xef4444 : 0x60a5fa;
                          var mpGeo = new THREE.SphereGeometry(0.25, 8, 8);
                          var mp = new THREE.Mesh(mpGeo, new THREE.MeshBasicMaterial({ color: mpColor, transparent: true, opacity: 0.8 }));
                          mp.position.set(wp.x, isGas ? 3 : 0.5, wp.z);
                          scene.add(mp); plotterWPMeshes.push(mp);
                        });
                      }

                      // ── Signal Triangulation System ──
                      var beacons = [
                        { x: 20, z: -15, name: 'Beacon Alpha', color: 0xff6b6b },
                        { x: -18, z: 20, name: 'Beacon Beta', color: 0x4ecdc4 },
                        { x: -15, z: -20, name: 'Beacon Gamma', color: 0xffd93d }
                      ];
                      var beaconMeshes = [];
                      beacons.forEach(function(bc) {
                        var tower = new THREE.Group();
                        var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4, 6), new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.6 }));
                        pole.position.y = 2; tower.add(pole);
                        var light = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshBasicMaterial({ color: bc.color }));
                        light.position.y = 4.2; tower.add(light);
                        var ring = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.6, 16), new THREE.MeshBasicMaterial({ color: bc.color, transparent: true, opacity: 0.3, side: THREE.DoubleSide }));
                        ring.rotation.x = -Math.PI / 2; ring.position.y = 0.1; tower.add(ring);
                        tower.position.set(bc.x, 0, bc.z);
                        scene.add(tower); beaconMeshes.push({ group: tower, light: light, data: bc });
                      });

                      // ── Skills Badge System (expanded) ──
                      var badges = {
                        navigator: { name: '\uD83E\uDDED Navigator', desc: 'Complete 3 navigation challenges', req: function() { return navCompletedCount >= 3; }, earned: false },
                        flightDirector: { name: '\uD83D\uDCCB Flight Director', desc: 'Complete a course with 3+ waypoints', req: function() { return plotterWaypoints.length >= 3 && plotterActiveWP >= plotterWaypoints.length; }, earned: false },
                        fieldScientist: { name: '\uD83D\uDD2C Field Scientist', desc: 'Discover all points of interest', req: function() { return Object.keys(discoveredPOIs).length >= totalPOIs && totalPOIs > 0; }, earned: false },
                        planetologist: { name: '\uD83E\uDE90 Planetologist', desc: 'Score 5+ on planet quiz', req: function() { return (d.quiz && d.quiz.score >= 5); }, earned: false },
                        pilot: { name: '\u2708\uFE0F Pilot', desc: 'Travel 500+ meters total', req: function() { return odometer >= 500; }, earned: false },
                        safetyOfficer: { name: '\u26A0\uFE0F Safety Officer', desc: 'Read 5+ hazard warnings', req: function() { return hazardIdx >= 5; }, earned: false },
                        quizMaster: { name: '\uD83C\uDFC6 Quiz Master', desc: 'Score 8+ on planet quiz', req: function() { return (d.quiz && d.quiz.score >= 8); }, earned: false },
                        explorer: { name: '\uD83C\uDF0D Explorer', desc: 'Visit all 9 planets', req: function() { var vp = d.visitedPlanets || {}; return Object.keys(vp).length >= 9; }, earned: false }
                      };
                      function checkBadges() {
                        Object.keys(badges).forEach(function(key) {
                          var b = badges[key];
                          if (!b.earned && b.req()) {
                            b.earned = true;
                            playSound('badge');
                            if (typeof addToast === 'function') addToast('\uD83C\uDFC5 Badge Earned: ' + b.name + ' \u2014 ' + b.desc, 'success');
                            if (typeof awardStemXP === 'function') awardStemXP('solarSystem', 25);
                          }
                        });
                      }

                      // ── Animation loop ──
                      function animate3dV2() {
                        animId3d = requestAnimationFrame(animate3dV2);
                        tick3d++;
                        // Movement
                        var dir = new THREE.Vector3();
                        if (moveState.forward) dir.z -= 1;
                        if (moveState.back) dir.z += 1;
                        if (moveState.left) dir.x -= 1;
                        if (moveState.right) dir.x += 1;
                        dir.normalize().multiplyScalar(speed3d);
                        dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
                        playerPos.add(dir);
                        if (moveState.up) playerPos.y += speed3d;
                        if (moveState.down) playerPos.y = Math.max(isGas ? 1 : 1.0, playerPos.y - speed3d);
                        if (!isGas) playerPos.y = Math.max(1.6, playerPos.y);

                        if (thirdPerson) {
                          var behind = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).multiplyScalar(6);
                          camera.position.set(playerPos.x + behind.x, playerPos.y + 3, playerPos.z + behind.z);
                          camera.lookAt(playerPos.x, playerPos.y, playerPos.z);
                        } else {
                          camera.position.copy(playerPos);
                          camera.rotation.order = 'YXZ';
                          camera.rotation.y = yaw;
                          camera.rotation.x = pitch;
                        }

                        // Animate clouds
                        scene.children.forEach(function(c) {
                          if (c._cloudSpeed) {
                            c.position.x = Math.sin(tick3d * c._cloudSpeed) * 2;
                            c.position.z = Math.cos(tick3d * c._cloudSpeed * 0.7) * 1.5;
                          }
                        });

                        // Diamond rain
                        if (diamonds) {
                          var dArr = diamonds.geometry.attributes.position.array;
                          for (var dri = 0; dri < dArr.length; dri += 3) {
                            dArr[dri + 1] -= 0.05;
                            if (dArr[dri + 1] < -5) dArr[dri + 1] = 20;
                          }
                          diamonds.geometry.attributes.position.needsUpdate = true;
                        }

                        // Update compass bearing
                        var deg = ((yaw * 180 / Math.PI) % 360 + 360) % 360;
                        var dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
                        var dirLabel = dirs[Math.round(deg / 45) % 8];
                        compass.textContent = dirLabel;

                        // ── Live telemetry updates ──
                        if (tick3d % 3 === 0) {
                          var dx = playerPos.x - prevPos.x, dz = playerPos.z - prevPos.z, dy = playerPos.y - prevPos.y;
                          var frameDist = Math.sqrt(dx * dx + dy * dy + dz * dz) * scaleFactor;
                          odometer += frameDist;
                          lastSpeed = frameDist * 20;
                          prevPos.copy(playerPos);

                          var altEl = document.getElementById('hud-alt');
                          var spdEl = document.getElementById('hud-spd');
                          var hdgEl = document.getElementById('hud-hdg');
                          var posEl = document.getElementById('hud-pos');
                          var odoEl = document.getElementById('hud-odo');
                          var dscEl = document.getElementById('hud-disc');
                          var altitude = ((playerPos.y - (isGas ? 0 : 1.6)) * scaleFactor).toFixed(0);
                          if (altEl) altEl.textContent = altitude + ' m';
                          if (spdEl) spdEl.textContent = lastSpeed.toFixed(1) + ' m/s';
                          if (hdgEl) hdgEl.textContent = dirLabel + ' ' + Math.round(deg) + '\u00B0';
                          if (posEl) posEl.textContent = (playerPos.x * 10).toFixed(1) + ', ' + (playerPos.z * 10).toFixed(1);
                          if (odoEl) odoEl.textContent = odometer > 1000 ? (odometer / 1000).toFixed(1) + ' km' : Math.round(odometer) + ' m';
                          if (dscEl) dscEl.textContent = Object.keys(discoveredPOIs).length + ' / ' + totalPOIs;
                        }

                        // Update Goal Line
                        if (navChallengeActive && navGoalLine) {
                          var pts2 = [new THREE.Vector3(playerPos.x, isGas ? playerPos.y - 0.5 : 0.5, playerPos.z), new THREE.Vector3(navTargetX, isGas ? 4 : 0.5, navTargetZ)];
                          navGoalLine.geometry.setFromPoints(pts2);
                          navGoalLine.computeLineDistances();
                        }

                        // POI proximity detection
                        if (tick3d % 10 === 0) {
                          for (var pi2 = 0; pi2 < pois.length; pi2++) {
                            var poi = pois[pi2];
                            var pdx = playerPos.x - poi.x, pdz = playerPos.z - poi.z;
                            var poiDist = Math.sqrt(pdx * pdx + pdz * pdz);
                            if (poiDist < 4 && !discoveredPOIs[pi2]) {
                              showDiscovery(poi, pi2);
                              var objEl = document.getElementById('obj-' + pi2);
                              if (objEl) { objEl.innerHTML = '\u2611 <span style="color:#34d399;text-decoration:line-through">' + poi.name + '</span> \u2714'; }
                              var dcEl = document.getElementById('mission-disc-count');
                              if (dcEl) dcEl.textContent = Object.keys(discoveredPOIs).length + '/' + totalPOIs;
                              var xpEl = document.getElementById('mission-xp-count');
                              if (xpEl) xpEl.textContent = (Object.keys(discoveredPOIs).length * 10) + '';
                            }
                          }
                        }

                        // Feature updates
                        if (tick3d % 5 === 0) updateTrail();
                        if (tick3d % 10 === 0) { checkNavCompletion(); checkBadges(); }
                        beaconMeshes.forEach(function(bm) { bm.light.material.opacity = 0.5 + Math.abs(Math.sin(tick3d * 0.05)) * 0.5; });
                        if (navTargetMesh) { navTargetMesh.material.opacity = 0.2 + Math.abs(Math.sin(tick3d * 0.08)) * 0.5; navTargetMesh.rotation.y = tick3d * 0.02; }

                        // Pulse POI markers
                        poiMeshes.forEach(function(m) {
                          if (m._pulsePhase !== undefined) {
                            m.material.opacity = 0.2 + Math.abs(Math.sin(tick3d * 0.03 + m._pulsePhase)) * 0.3;
                          } else if (m._poiIdx !== undefined && discoveredPOIs[m._poiIdx]) {
                            m.material.color.setHex(0x34d399);
                            m.material.opacity = 0.4;
                          } else if (m._poiIdx !== undefined) {
                            m.material.opacity = 0.5 + Math.abs(Math.sin(tick3d * 0.05)) * 0.3;
                          }
                        });

                        // Update rover/probe model
                        roverGroup.position.x = playerPos.x;
                        roverGroup.position.z = playerPos.z;
                        if (!isGas) {
                          roverGroup.position.y = 0;
                          roverGroup.rotation.y = yaw + Math.PI;
                        } else {
                          roverGroup.position.y = playerPos.y - 0.5;
                          roverGroup.rotation.y = yaw + Math.PI;
                          if (redLight && greenLight) {
                            redLight.material.emissiveIntensity = Math.sin(tick3d * 0.1) > 0 ? 1.0 : 0.1;
                            greenLight.material.emissiveIntensity = Math.sin(tick3d * 0.1) > 0 ? 0.1 : 1.0;
                          }
                        }
                        roverGroup.visible = thirdPerson;
                        renderer.render(scene, camera);
                      }
                      animId3d = requestAnimationFrame(animate3dV2);

                      // Resize handler
                      var ro3d = new ResizeObserver(function() {
                        W = canvasEl.clientWidth; H = canvasEl.clientHeight;
                        if (W && H) { camera.aspect = W / H; camera.updateProjectionMatrix(); renderer.setSize(W, H); }
                      });
                      ro3d.observe(canvasEl);

                      canvasEl._droneCleanup = function() {
                        cancelAnimationFrame(animId3d);
                        clearInterval(factTimer);
                        clearInterval(hazardTimer);
                        document.removeEventListener('mousemove', onMouseMove);
                        if (document.pointerLockElement === canvasEl) document.exitPointerLock();
                        ro3d.disconnect();
                        renderer.dispose();
                        if (hud.parentElement) hud.parentElement.removeChild(hud);
                        if (ticker.parentElement) ticker.parentElement.removeChild(ticker);
                        if (compass.parentElement) compass.parentElement.removeChild(compass);
                        if (hazardEl.parentElement) hazardEl.parentElement.removeChild(hazardEl);
                        if (discCard.parentElement) discCard.parentElement.removeChild(discCard);
                        if (missionCard.parentElement) missionCard.parentElement.removeChild(missionCard);
                        if (discTimeout) clearTimeout(discTimeout);
                        if (navCard.parentElement) navCard.parentElement.removeChild(navCard);
                        if (plotterPanel.parentElement) plotterPanel.parentElement.removeChild(plotterPanel);
                        if (trailLine) scene.remove(trailLine);
                        if (navTargetMesh) scene.remove(navTargetMesh);
                        if (plotterRouteLine) scene.remove(plotterRouteLine);
                        plotterWPMeshes.forEach(function(m) { scene.remove(m); });
                        beaconMeshes.forEach(function(bm) { scene.remove(bm.group); });
                        if (fsToggle.parentElement) fsToggle.parentElement.removeChild(fsToggle);
                      };
                      canvasEl._droneRO = ro3d;
                    }

                    // Load Three.js and init
                    if (window.THREE) { doInit(window.THREE); }
                    else {
                      var s = document.createElement('script');
                      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
                      s.onload = function() { doInit(window.THREE); };
                      document.head.appendChild(s);
                    }
                  }
                }),

                // ── Quiz Mode ──
                h("div", { className: "mt-4 border-t border-slate-200 pt-3" },
                  h("div", { className: "flex items-center gap-2 mb-2" },
                    h("button", {
                      onClick: function() {
                        var QUIZ_QS = [
                          { q: 'Which planet is the hottest?', a: 'Venus', opts: ['Mercury', 'Venus', 'Mars', 'Jupiter'], tip: 'Venus has a runaway greenhouse effect reaching 462\u00B0C!' },
                          { q: 'Which planet has the most moons?', a: 'Saturn', opts: ['Jupiter', 'Saturn', 'Uranus', 'Neptune'], tip: 'Saturn has 146 known moons as of 2024!' },
                          { q: 'Which planet rotates on its side?', a: 'Uranus', opts: ['Neptune', 'Uranus', 'Saturn', 'Pluto'], tip: 'Uranus has an axial tilt of 97.77\u00B0!' },
                          { q: 'Which is the smallest planet?', a: 'Mercury', opts: ['Mercury', 'Mars', 'Pluto', 'Venus'], tip: 'Mercury is only 4,879 km in diameter.' },
                          { q: 'Which planet has the longest year?', a: 'Pluto', opts: ['Neptune', 'Pluto', 'Uranus', 'Saturn'], tip: 'Pluto takes 248 Earth years to orbit the Sun!' },
                          { q: 'Which planet has the shortest day?', a: 'Jupiter', opts: ['Jupiter', 'Saturn', 'Earth', 'Mars'], tip: 'Jupiter rotates in just 10 hours!' },
                          { q: 'Which planet is known as the Red Planet?', a: 'Mars', opts: ['Venus', 'Mars', 'Mercury', 'Jupiter'], tip: 'Iron oxide (rust) gives Mars its red color.' },
                          { q: 'Which planet could float in water?', a: 'Saturn', opts: ['Jupiter', 'Saturn', 'Neptune', 'Uranus'], tip: 'Saturn\u2019s density is less than water (0.687 g/cm\u00B3)!' },
                          { q: 'Where is the tallest volcano in the solar system?', a: 'Mars', opts: ['Earth', 'Venus', 'Mars', 'Jupiter'], tip: 'Olympus Mons on Mars is 21.9 km high \u2014 nearly 3x Everest!' },
                          { q: 'Which planet has the strongest winds?', a: 'Neptune', opts: ['Jupiter', 'Saturn', 'Neptune', 'Uranus'], tip: 'Neptune\u2019s winds reach 2,100 km/h!' },
                          // 5 new questions
                          { q: 'Which planet has the Great Red Spot?', a: 'Jupiter', opts: ['Saturn', 'Jupiter', 'Neptune', 'Mars'], tip: 'The Great Red Spot is a storm larger than Earth that has raged for over 350 years!' },
                          { q: 'What is the only planet with liquid water on its surface?', a: 'Earth', opts: ['Mars', 'Earth', 'Venus', 'Neptune'], tip: 'Earth is the only known planet with stable liquid water oceans on its surface.' },
                          { q: 'Which dwarf planet has a heart-shaped glacier?', a: 'Pluto', opts: ['Ceres', 'Pluto', 'Eris', 'Mercury'], tip: 'Tombaugh Regio is a heart-shaped nitrogen ice glacier on Pluto, discovered by New Horizons in 2015.' },
                          { q: 'Which planet is closest to the Sun?', a: 'Mercury', opts: ['Venus', 'Mercury', 'Mars', 'Earth'], tip: 'Mercury orbits just 57.9 million km from the Sun \u2014 less than 40% of Earth\u2019s distance.' },
                          { q: 'Which planet has diamond rain in its interior?', a: 'Uranus', opts: ['Neptune', 'Jupiter', 'Uranus', 'Saturn'], tip: 'At extreme depths, methane is crushed into diamond crystals that rain down through the atmosphere.' }
                        ];
                        var q = QUIZ_QS[Math.floor(Math.random() * QUIZ_QS.length)];
                        upd('quiz', Object.assign({}, q, { answered: false, correct: null, score: (d.quiz && d.quiz.score) || 0, streak: (d.quiz && d.quiz.streak) || 0 }));
                      }, className: "px-3 py-1.5 rounded-lg text-xs font-bold " + (d.quiz ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-600 text-white') + " hover:opacity-90 transition-all"
                    }, d.quiz ? "\uD83D\uDD04 Next Question" : "\uD83E\uDDE0 Quiz Mode"),
                    d.quiz && d.quiz.score > 0 && h("span", { className: "text-xs font-bold text-emerald-600" }, "\u2B50 " + d.quiz.score + " correct | \uD83D\uDD25 " + d.quiz.streak + " streak")
                  ),
                  d.quiz && h("div", { className: "bg-indigo-50 rounded-xl p-4 border border-indigo-200 animate-in slide-in-from-bottom" },
                    h("p", { className: "text-sm font-bold text-indigo-800 mb-3" }, d.quiz.q),
                    h("div", { className: "grid grid-cols-2 gap-2" },
                      d.quiz.opts.map(function(opt) {
                        var isCorrect = opt === d.quiz.a;
                        var wasChosen = d.quiz.chosen === opt;
                        var cls = !d.quiz.answered ? 'bg-white text-slate-700 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50' : isCorrect ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : wasChosen && !isCorrect ? 'bg-red-100 text-red-800 border-red-300' : 'bg-slate-50 text-slate-400 border-slate-200';
                        return h("button", {
                          key: opt, disabled: d.quiz.answered, onClick: function() {
                            var correct = opt === d.quiz.a;
                            if (correct) playSound('quizCorrect'); else playSound('quizWrong');
                            upd('quiz', Object.assign({}, d.quiz, { answered: true, correct: correct, chosen: opt, score: d.quiz.score + (correct ? 1 : 0), streak: correct ? d.quiz.streak + 1 : 0 }));
                            if (correct) addToast('Correct! ' + d.quiz.tip, 'success');
                            else addToast('The answer is ' + d.quiz.a + '. ' + d.quiz.tip, 'error');
                          }, className: "px-3 py-2 rounded-lg text-sm font-bold border-2 transition-all " + cls
                        }, opt);
                      })
                    ),
                    d.quiz.answered && h("p", { className: "mt-2 text-xs text-indigo-600 italic" }, "\uD83D\uDCA1 " + d.quiz.tip)
                  ),

                  // ── Planet Comparison ──
                  h("div", { className: "mt-3" },
                    h("p", { className: "text-xs font-bold text-slate-500 mb-1" }, "\uD83D\uDD0D Compare Planets"),
                    h("div", { className: "flex gap-2 mb-2" },
                      h("select", { 'aria-label': 'First planet to compare', value: d.compare1 || '', onChange: function(e) { upd('compare1', e.target.value); }, className: "flex-1 px-2 py-1 border rounded text-sm" },
                        h("option", { value: "" }, "Select..."),
                        PLANETS.map(function(p) { return h("option", { key: p.name, value: p.name }, p.name); })
                      ),
                      h("span", { className: "text-slate-400 font-bold self-center" }, "vs"),
                      h("select", { 'aria-label': 'Second planet to compare', value: d.compare2 || '', onChange: function(e) { upd('compare2', e.target.value); }, className: "flex-1 px-2 py-1 border rounded text-sm" },
                        h("option", { value: "" }, "Select..."),
                        PLANETS.map(function(p) { return h("option", { key: p.name, value: p.name }, p.name); })
                      )
                    ),
                    d.compare1 && d.compare2 && (function() {
                      var p1 = PLANETS.find(function(p) { return p.name === d.compare1; });
                      var p2 = PLANETS.find(function(p) { return p.name === d.compare2; });
                      if (!p1 || !p2) return null;
                      var GRAVITY = { Mercury: 0.38, Venus: 0.91, Earth: 1.0, Mars: 0.38, Jupiter: 2.34, Saturn: 1.06, Uranus: 0.92, Neptune: 1.19, Pluto: 0.06 };
                      return h("div", { className: "grid grid-cols-3 gap-1 text-center text-xs" },
                        [['', p1.name, p2.name], ['\uD83C\uDF21 Temp', p1.temp, p2.temp], ['\u2600 Day', p1.dayLen, p2.dayLen], ['\uD83C\uDF0D Year', p1.yearLen, p2.yearLen], ['\uD83D\uDCCF Size', p1.diameter, p2.diameter], ['\uD83C\uDF11 Moons', p1.moons, p2.moons], ['\u2696 Gravity', (GRAVITY[p1.name] || 1).toFixed(2) + 'g', (GRAVITY[p2.name] || 1).toFixed(2) + 'g'], ['\uD83E\uDDD1 70kg on', Math.round(70 * (GRAVITY[p1.name] || 1)) + 'kg', Math.round(70 * (GRAVITY[p2.name] || 1)) + 'kg']].map(function(row, ri) {
                          return h(React.Fragment, { key: ri },
                            row.map(function(cell, ci) {
                              return h("div", { key: ci, className: "py-1 " + (ri === 0 ? 'font-black text-slate-700' : ci === 0 ? 'font-bold text-slate-500' : 'font-bold text-slate-700') + (ri > 0 && ri % 2 === 0 ? ' bg-slate-50' : '') }, cell);
                            })
                          );
                        })
                      );
                    })()
                  )
                ),

              ),
            ),

            // Snapshot button
            h("button", { onClick: function() { setToolSnapshots(function(prev) { return prev.concat([{ id: 'ss-' + Date.now(), tool: 'solarSystem', label: sel ? sel.name : 'Solar System', data: Object.assign({}, d), timestamp: Date.now() }]); }); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); }, className: "mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "\uD83D\uDCF8 Snapshot")
          )
        );
      };
    }

    return h(this._SolarSystemComponent, { ctx: ctx });
  }
});

})();

}
