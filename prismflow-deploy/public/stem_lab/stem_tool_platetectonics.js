// ── Plate Tectonics Plugin (extracted from stem_tool_science.js) ──
  // Audio system
  var _tectAC = null;
  function getTectAC() { if (!_tectAC) { try { _tectAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } if (_tectAC && _tectAC.state === 'suspended') { try { _tectAC.resume(); } catch(e) {} } return _tectAC; }
  function tectTone(f,d,tp,v) { var ac = getTectAC(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = tp||'sine'; o.frequency.value = f; g.gain.setValueAtTime(v||0.07, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function sfxTectQuake() { tectTone(80, 0.3, 'sawtooth', 0.08); setTimeout(function() { tectTone(100, 0.2, 'sawtooth', 0.06); }, 100); if (window._alloHaptic) window._alloHaptic('bump'); }
  function sfxTectShift() { tectTone(200, 0.15, 'sine', 0.05); }
  function sfxTectErupt() { tectTone(60, 0.4, 'sawtooth', 0.09); setTimeout(function() { tectTone(100, 0.3, 'sawtooth', 0.07); }, 150); if (window._alloHaptic) window._alloHaptic('launch'); }
  function sfxTectClick() { tectTone(600, 0.03, 'sine', 0.04); }
  function sfxTectCorrect() { tectTone(523, 0.08, 'sine', 0.07); setTimeout(function() { tectTone(659, 0.08, 'sine', 0.07); }, 70); setTimeout(function() { tectTone(784, 0.1, 'sine', 0.08); }, 140); }
  if (!document.getElementById('tect-a11y')) { var _s = document.createElement('style'); _s.id = 'tect-a11y'; _s.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } } .text-slate-400 { color: #64748b !important; }'; document.head.appendChild(_s); }
  // â•â•â• ðŸ”¬ plateTectonics (plateTectonics) â•â•â•
  window.StemLab.registerTool('plateTectonics', {
    icon: '\uD83C\uDF0B',
    label: 'Plate Tectonics',
    desc: 'Explore tectonic plates, earthquakes, volcanoes, and continental drift.',
    color: 'orange',
    category: 'science',
    questHooks: [
      { id: 'explore_3_tabs', label: 'Explore 3 tectonics topics', icon: '🌋', check: function(d) { return Object.keys(d.tabsViewed || {}).length >= 3; }, progress: function(d) { return Object.keys(d.tabsViewed || {}).length + '/3'; } },
      { id: 'select_plate', label: 'Study a tectonic plate', icon: '🌍', check: function(d) { return !!d.selectedPlate; }, progress: function(d) { return d.selectedPlate ? 'Selected!' : 'Pick a plate'; } }
    ],
    render: function(ctx) {
      // Aliases â€” maps ctx properties to original variable names
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var setStemLabTab = ctx.setStemLabTab;
      var stemLabTab = ctx.stemLabTab || 'explore';
      var stemLabTool = ctx.stemLabTool;
      var toolSnapshots = ctx.toolSnapshots;
      var setToolSnapshots = ctx.setToolSnapshots;
      var addToast = ctx.addToast;
      var t = ctx.t;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var Calculator = ctx.icons.Calculator;
      var Sparkles = ctx.icons.Sparkles;
      var X = ctx.icons.X;
      var GripVertical = ctx.icons.GripVertical;
      var announceToSR = ctx.announceToSR;
      var awardStemXP = ctx.awardXP;
      var getStemXP = ctx.getXP;
      var stemCelebrate = ctx.celebrate;
      var stemBeep = ctx.beep;
      var callGemini = ctx.callGemini;
      var callTTS = ctx.callTTS;
      var callImagen = ctx.callImagen;
      var callGeminiVision = ctx.callGeminiVision;
      var gradeLevel = ctx.gradeLevel;
      var srOnly = ctx.srOnly;
      var a11yClick = ctx.a11yClick;
      var canvasA11yDesc = ctx.canvasA11yDesc;
      var props = ctx.props;
      var canvasNarrate = ctx.canvasNarrate;

      // â”€â”€ Tool body (plateTectonics) â”€â”€
      return (function() {
var d = labToolData.plateTectonics || {};

          // ── Canvas narration: init ──
          if (typeof canvasNarrate === 'function') {
            canvasNarrate('plateTectonics', 'init', {
              first: 'Plate Tectonics Simulator loaded. Drag tectonic plates to explore convergent, divergent, and transform boundaries. Watch earthquakes and eruptions in real time.',
              repeat: 'Plate Tectonics active.',
              terse: 'Plate Tectonics.'
            }, { debounce: 800 });
          }

          var simTab = d.simTab || 'sim';

          var speed = d.speed != null ? d.speed : 1;

          var showLabels = d.showLabels !== false;

          var showConvection = d.showConvection !== false;

          var selectedPlate = d.selectedPlate || null;

          var eqMagnitude = d.eqMagnitude || 5;

          var timelineEra = d.timelineEra || 0;

          var showEdu = d.showEdu || false;

          var quizIdx = d.quizIdx || 0;

          var quizAnswer = d.quizAnswer || null;

          // Eruption state
          var volcanoActive = d.volcanoActive || false;
          var volcanoPhase = d.volcanoPhase || 0;
          var eruptionTick = d.eruptionTick || 0;

          // Time-lapse state
          var timelapsePlaying = d.timelapsePlaying || false;
          var timelapseSpeed = d.timelapseSpeed || 1;
          var timelapseProgress = d.timelapseProgress || 0;



          var upd = function(patch) {

            setLabToolData(function(prev) {

              return Object.assign({}, prev, { plateTectonics: Object.assign({}, prev.plateTectonics || {}, patch) });

            });

          };



          // â”€â”€ Plate data â”€â”€

          var PLATES = [

            { id: 'pacific',    name: 'Pacific',       type: 'oceanic',      x: 0.0,  w: 0.18, color: '#1e3a5f', thick: 25 },

            { id: 'nazca',      name: 'Nazca',         type: 'oceanic',      x: 0.18, w: 0.14, color: '#2a4a6f', thick: 25 },

            { id: 'samerican',  name: 'S. American',   type: 'continental',  x: 0.32, w: 0.15, color: '#8b6914', thick: 50 },

            { id: 'african',    name: 'African',       type: 'continental',  x: 0.47, w: 0.16, color: '#a0522d', thick: 50 },

            { id: 'eurasian',   name: 'Eurasian',      type: 'continental',  x: 0.63, w: 0.17, color: '#6b8e23', thick: 50 },

            { id: 'indian',     name: 'Indian',        type: 'oceanic',      x: 0.80, w: 0.08, color: '#cd853f', thick: 30 },

            { id: 'namerican',  name: 'N. American',   type: 'continental',  x: 0.88, w: 0.12, color: '#556b2f', thick: 50 }

          ];



          // —— Timeline eras (8 geological periods) ——

          var ERAS = [
            { name: 'Hadean', mya: '4,600 Ma', icon: '\uD83D\uDD25', keyEvent: 'Earth is a molten ball of magma — no solid crust exists yet.',
              desc: 'The Hadean Eon (4.6–4.0 Ga). Earth formed from solar nebula accretion. The surface was a magma ocean bombarded by meteorites. The Moon formed from a giant impact. No tectonic plates existed.',
              offsets: [0,0,0,0,0,0,0] },
            { name: 'Archean', mya: '3,500 Ma', icon: '\uD83E\uDEA8', keyEvent: 'First rocks and proto-continents (cratons) emerge from cooling crust.',
              desc: 'The Archean Eon (4.0–2.5 Ga). Earth\'s crust solidified. Small protocontinents called cratons formed the first stable landmasses. Plate tectonics may have begun. Oceans covered most of the surface.',
              offsets: [0,0,0.02,0.01,0,-0.01,0] },
            { name: 'Rodinia', mya: '1,100 Ma', icon: '\uD83C\uDF0D', keyEvent: 'First known supercontinent assembles — all cratons merge into Rodinia.',
              desc: 'The Mesoproterozoic Era. Rodinia was Earth\'s first supercontinent, assembling ~1.1 Ga. All major cratons were joined. Its breakup (~750 Ma) triggered Snowball Earth glaciations and eventually led to the Cambrian explosion of life.',
              offsets: [0,0.05,0.14,0.14,0.10,0.04,0.02] },
            { name: 'Pangaea', mya: '335 Ma', icon: '\uD83C\uDFDE\uFE0F', keyEvent: 'All continents unite into the supercontinent Pangaea — one giant landmass.',
              desc: 'The late Paleozoic (Carboniferous–Permian). Pangaea ("All Earth") was the most recent supercontinent. It stretched from pole to pole. The Tethys Sea separated its eastern margins. Coal swamps covered equatorial regions.',
              offsets: [0,0.10,0.22,0.18,0.08,-0.04,-0.08] },
            { name: 'Breakup', mya: '200 Ma', icon: '\uD83D\uDD00', keyEvent: 'Pangaea splits into Laurasia (north) and Gondwana (south).',
              desc: 'The Triassic–Jurassic boundary. Pangaea began rifting ~200 Ma. The central Atlantic opened as North America separated from Africa. Dinosaurs dominated both halves. Laurasia = N. America + Eurasia. Gondwana = S. America + Africa + India + Antarctica + Australia.',
              offsets: [0,0.06,0.12,0.10,0.04,-0.01,-0.04] },
            { name: 'Cretaceous', mya: '100 Ma', icon: '\uD83E\uDD95', keyEvent: 'Atlantic Ocean widens; India breaks free and races north toward Asia.',
              desc: 'The Cretaceous Period. South America separated from Africa. India detached from Antarctica and began its northward journey at ~15 cm/year. The Atlantic Ocean widened significantly. Sea levels were 200m higher than today. Dinosaurs still ruled.',
              offsets: [0,0.03,0.06,0.05,0.02,0.06,-0.02] },
            { name: 'Cenozoic', mya: '50 Ma', icon: '\u26F0\uFE0F', keyEvent: 'India collides with Eurasia, thrusting up the Himalayas.',
              desc: 'The early Cenozoic (Eocene). India\'s collision with Eurasia created the Himalayas and Tibetan Plateau. Australia separated from Antarctica. The Alps formed as Africa pushed into Europe. Mammals diversified after the dinosaur extinction.',
              offsets: [0,0.01,0.02,0.02,0.01,0.02,-0.01] },
            { name: 'Modern', mya: 'Present', icon: '\uD83C\uDF0E', keyEvent: 'Seven major plates in their current configuration.',
              desc: 'The present day. Seven major tectonic plates move at 2–10 cm/year. The Atlantic continues to widen. The Pacific Ring of Fire hosts 75% of the world\'s volcanoes. The Himalayas still rise ~5mm/year as India pushes into Eurasia.',
              offsets: [0,0,0,0,0,0,0] }
          ];

          var ERAS_COUNT = ERAS.length;



          // â”€â”€ Quiz data â”€â”€

          var QUIZZES = [

            { q: 'What type of boundary creates the Himalayas?', opts: ['Divergent','Convergent','Transform','Subduction'], ans: 1, explain: 'The Indian plate collides with the Eurasian plate, pushing up the Himalayas.' },

            { q: 'Which seismic wave arrives first at a station?', opts: ['S-wave','Surface wave','P-wave','Love wave'], ans: 2, explain: 'P-waves (primary) are compression waves that travel fastest through rock.' },

            { q: 'What forms at a divergent boundary?', opts: ['Mountains','Trenches','Mid-ocean ridges','Volcanoes only'], ans: 2, explain: 'Plates pull apart, magma rises, and new oceanic crust forms a ridge.' },

            { q: 'The Ring of Fire encircles which ocean?', opts: ['Atlantic','Indian','Arctic','Pacific'], ans: 3, explain: 'The Ring of Fire borders the Pacific Ocean with ~75% of the world\'s volcanoes.' },

            { q: 'What drives tectonic plate movement?', opts: ['Gravity alone','Convection currents','Wind erosion','Solar energy'], ans: 1, explain: 'Convection currents in the mantle create drag that moves plates.' },

            { q: 'What is subduction?', opts: ['Plates sliding past','One plate diving under another','Plates pulling apart','Plates rotating'], ans: 1, explain: 'An oceanic plate dives beneath a continental plate, forming trenches and volcanoes.' },

            { q: 'What scale measures earthquake magnitude?', opts: ['Beaufort','Mohs','Richter/Moment','Kelvin'], ans: 2, explain: 'The Richter (or Moment Magnitude) scale measures earthquake energy release.' },

            { q: 'Pangaea means...', opts: ['All land','All water','All fire','All air'], ans: 0, explain: 'Pangaea comes from Greek: "pan" (all) + "gaia" (earth/land).' }

          ];



          var _gRed = 'linear-gradient(135deg, #dc2626, #ef4444, #f87171)';

          var _gCard = 'linear-gradient(135deg, #fef2f2, #fee2e2, #fef2f2)';



          // â”€â”€ Canvas ref callback â”€â”€

          var canvasRef = function(canvasEl) {

            if (!canvasEl) {

              if (canvasRef._last && canvasRef._last._ptAnim) {

                cancelAnimationFrame(canvasRef._last._ptAnim);

                canvasRef._last._ptInit = false;

                canvasRef._last = null;

              }

              return;

            }

            if (canvasEl._ptInit) return;

            canvasEl._ptInit = true;

            canvasRef._last = canvasEl;



            var cW = canvasEl.width = canvasEl.offsetWidth * 2;

            var cH = canvasEl.height = canvasEl.offsetHeight * 2;

            var ctx = canvasEl.getContext('2d');

            var tick = 0;



            // plate positions (copy from PLATES, offset by timeline)

            var plates = PLATES.map(function(p, i) {

              var era = ERAS[timelineEra] || ERAS[5];

              return { id: p.id, name: p.name, type: p.type, x: (p.x + (era.offsets[i] || 0)) * cW, w: p.w * cW, color: p.color, thick: p.thick, vx: 0 };

            });



            // particles

            var quakeParticles = [];

            var volcanoParticles = [];

            var convectionDots = [];

            for (var ci = 0; ci < 40; ci++) {

              convectionDots.push({ x: Math.random() * cW, y: cH * 0.45 + Math.random() * cH * 0.3, angle: Math.random() * Math.PI * 2, speed: 0.3 + Math.random() * 0.4, cell: Math.floor(Math.random() * 4) });

            }

            // Eruption state (canvas-local)
            var eruptState = { active: false, phase: 0, tick: 0, coneX: cW * 0.5, coneBaseY: cH * 0.30, coneW: 60, coneH: 45, lavaFlows: [], ashParticles: [] };

            // Helper: trigger eruption at x
            function triggerEruption(atX) {
              eruptState.active = true;
              eruptState.phase = 0;
              eruptState.tick = 0;
              eruptState.coneX = atX;
              eruptState.coneBaseY = cH * 0.30;
              eruptState.lavaFlows = [];
              eruptState.ashParticles = [];
              // Spawn rumble quake particles
              for (var rq = 0; rq < 4; rq++) {
                quakeParticles.push({ x: atX + (Math.random()-0.5)*30, y: cH * 0.30, radius: 1, maxRadius: 20 + Math.random() * 20, alpha: 1 });
              }
            }



            // drag state

            var dragIdx = -1, dragStartX = 0, dragPlateStartX = 0;



            canvasEl.addEventListener('mousedown', function(e) {

              var rect = canvasEl.getBoundingClientRect();

              var mx = (e.clientX - rect.left) * (cW / rect.width);

              var my = (e.clientY - rect.top) * (cH / rect.height);

              var crustY = cH * 0.30;

              for (var i = plates.length - 1; i >= 0; i--) {

                var p = plates[i];

                if (mx >= p.x && mx <= p.x + p.w && my >= crustY - p.thick && my <= crustY + 20) {

                  dragIdx = i; dragStartX = mx; dragPlateStartX = p.x;

                  break;

                }

              }

            });

            canvasEl.addEventListener('mousemove', function(e) {

              if (dragIdx < 0) return;

              var rect = canvasEl.getBoundingClientRect();

              var mx = (e.clientX - rect.left) * (cW / rect.width);

              var dx = mx - dragStartX;

              plates[dragIdx].x = Math.max(0, Math.min(cW - plates[dragIdx].w, dragPlateStartX + dx));

              plates[dragIdx].vx = dx > 0 ? 1 : dx < 0 ? -1 : 0;

            });

            var mouseUp = function() {

              if (dragIdx >= 0) {

                // Check boundary interactions

                var dp = plates[dragIdx];

                for (var j = 0; j < plates.length; j++) {

                  if (j === dragIdx) continue;

                  var op = plates[j];

                  var gap = Math.abs((dp.x + dp.w / 2) - (op.x + op.w / 2)) - (dp.w + op.w) / 2;

                  if (gap < 15) {

                    // Collision — spawn earthquake + trigger eruption

                    var bx = (dp.x + dp.w / 2 + op.x + op.w / 2) / 2;

                    var by = cH * 0.30;

                    for (var eq = 0; eq < 8; eq++) {

                      quakeParticles.push({ x: bx, y: by, radius: 2, maxRadius: 40 + Math.random() * 60, alpha: 1 });

                    }

                    // Trigger full eruption at collision point
                    if ((dp.type !== op.type || Math.random() > 0.4) && !eruptState.active) {
                      triggerEruption(bx);
                    }

                    if (typeof awardStemXP === 'function') awardStemXP('plateTectonics', 3, 'Boundary interaction');

                  }

                }

              }

              dragIdx = -1;

            };

            canvasEl.addEventListener('mouseup', mouseUp);

            canvasEl.addEventListener('mouseleave', mouseUp);



            // Touch support

            canvasEl.addEventListener('touchstart', function(e) {

              e.preventDefault();

              var t = e.touches[0]; var rect = canvasEl.getBoundingClientRect();

              var mx = (t.clientX - rect.left) * (cW / rect.width);

              var my = (t.clientY - rect.top) * (cH / rect.height);

              var crustY = cH * 0.30;

              for (var i = plates.length - 1; i >= 0; i--) {

                var p = plates[i];

                if (mx >= p.x && mx <= p.x + p.w && my >= crustY - p.thick && my <= crustY + 20) {

                  dragIdx = i; dragStartX = mx; dragPlateStartX = p.x; break;

                }

              }

            }, { passive: false });

            canvasEl.addEventListener('touchmove', function(e) {

              if (dragIdx < 0) return; e.preventDefault();

              var t = e.touches[0]; var rect = canvasEl.getBoundingClientRect();

              var mx = (t.clientX - rect.left) * (cW / rect.width);

              plates[dragIdx].x = Math.max(0, Math.min(cW - plates[dragIdx].w, dragPlateStartX + (mx - dragStartX)));

              plates[dragIdx].vx = mx > dragStartX ? 1 : -1;

            }, { passive: false });

            canvasEl.addEventListener('touchend', mouseUp);



            function draw() {

              tick++;

              ctx.clearRect(0, 0, cW, cH);

              var crustY = cH * 0.30;



              // â”€â”€ Sky / Atmosphere â”€â”€

              var skyGrad = ctx.createLinearGradient(0, 0, 0, crustY - 60);

              skyGrad.addColorStop(0, '#87CEEB');

              skyGrad.addColorStop(0.4, '#b0d4f1');

              skyGrad.addColorStop(1, '#d4edfc');

              ctx.fillStyle = skyGrad;

              ctx.fillRect(0, 0, cW, crustY - 60);



              // clouds

              ctx.fillStyle = 'rgba(255,255,255,0.6)';

              for (var cl = 0; cl < 5; cl++) {

                var cx = ((cl * cW / 4) + tick * 0.2 * speed) % (cW + 100) - 50;

                var cy = 15 + cl * 12;

                ctx.beginPath();

                ctx.ellipse(cx, cy, 30 + cl * 5, 8 + cl * 2, 0, 0, Math.PI * 2);

                ctx.fill();

              }



              // â”€â”€ Ocean surface â”€â”€

              ctx.fillStyle = 'rgba(30,90,160,0.4)';

              ctx.fillRect(0, crustY - 60, cW, 60);

              // Animated waves

              ctx.strokeStyle = 'rgba(255,255,255,0.3)';

              ctx.lineWidth = 1.5;

              for (var wv = 0; wv < 3; wv++) {

                ctx.beginPath();

                for (var wx = 0; wx < cW; wx += 4) {

                  var wy = crustY - 40 + wv * 12 + Math.sin(wx * 0.015 + tick * 0.03 * speed + wv) * 4;

                  if (wx === 0) ctx.moveTo(wx, wy); else ctx.lineTo(wx, wy);

                }

                ctx.stroke();

              }



              // —— Earth layers (bottom up) ——

              // Inner core
              var icGrad = ctx.createRadialGradient(cW / 2, cH + cH * 0.1, 0, cW / 2, cH + cH * 0.1, cH * 0.35);
              icGrad.addColorStop(0, '#ffdd33');
              icGrad.addColorStop(0.4, '#ffaa00');
              icGrad.addColorStop(0.8, '#ff7700');
              icGrad.addColorStop(1, '#cc4400');
              ctx.fillStyle = icGrad;
              ctx.fillRect(0, cH * 0.82, cW, cH * 0.18);

              // Outer core
              var ocGrad = ctx.createLinearGradient(0, cH * 0.68, 0, cH * 0.82);
              ocGrad.addColorStop(0, '#a54508');
              ocGrad.addColorStop(0.5, '#c4580b');
              ocGrad.addColorStop(1, '#d4650d');
              ctx.fillStyle = ocGrad;
              ctx.fillRect(0, cH * 0.68, cW, cH * 0.14);

              // Lower mantle
              var lmGrad = ctx.createLinearGradient(0, cH * 0.50, 0, cH * 0.68);
              lmGrad.addColorStop(0, '#7a2000');
              lmGrad.addColorStop(0.5, '#8B2500');
              lmGrad.addColorStop(1, '#a03000');
              ctx.fillStyle = lmGrad;
              ctx.fillRect(0, cH * 0.50, cW, cH * 0.18);

              // Upper mantle
              var umGrad = ctx.createLinearGradient(0, crustY, 0, cH * 0.50);
              umGrad.addColorStop(0, '#5a3018');
              umGrad.addColorStop(0.5, '#6b3a1f');
              umGrad.addColorStop(1, '#7a3520');
              ctx.fillStyle = umGrad;
              ctx.fillRect(0, crustY, cW, cH * 0.20);

              // —— Stipple texture on mantle layers ——
              if (tick % 3 === 0 || !canvasEl._stippleCache) {
                canvasEl._stippleCache = [];
                for (var stI = 0; stI < 80; stI++) {
                  canvasEl._stippleCache.push({ x: Math.random() * cW, y: crustY + Math.random() * (cH * 0.70 - crustY + cH * 0.18), a: 0.04 + Math.random() * 0.08, r: 1 + Math.random() * 2 });
                }
              }
              for (var stJ = 0; stJ < canvasEl._stippleCache.length; stJ++) {
                var st = canvasEl._stippleCache[stJ];
                ctx.fillStyle = 'rgba(255,180,80,' + st.a + ')';
                ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2); ctx.fill();
              }

              // —— Heat shimmer effect in upper mantle ——
              for (var shI = 0; shI < 12; shI++) {
                var shX = (shI / 12) * cW + Math.sin(tick * 0.02 + shI * 0.8) * 8;
                var shY = crustY + cH * 0.04 + Math.cos(tick * 0.015 + shI * 1.2) * 6;
                ctx.fillStyle = 'rgba(255,120,40,' + (0.06 + 0.04 * Math.sin(tick * 0.04 + shI)) + ')';
                ctx.beginPath(); ctx.arc(shX, shY, 4 + Math.sin(tick * 0.03 + shI) * 2, 0, Math.PI * 2); ctx.fill();
              }

              // —— Lithosphere demarcation line ——
              ctx.strokeStyle = 'rgba(255,200,130,0.3)';
              ctx.lineWidth = 1.5;
              ctx.setLineDash([6, 4]);
              ctx.beginPath(); ctx.moveTo(0, crustY + 2); ctx.lineTo(cW, crustY + 2); ctx.stroke();
              ctx.setLineDash([]);

              // Layer labels
              if (showLabels) {
                ctx.fillStyle = 'rgba(255,255,255,0.7)';
                ctx.font = 'bold ' + (cW > 600 ? '14' : '10') + 'px system-ui';
                ctx.textAlign = 'center';
                ctx.fillText('Lithosphere', cW * 0.15, crustY + 12);
                ctx.fillText('Upper Mantle', cW / 2, crustY + cH * 0.10);
                ctx.fillText('Lower Mantle', cW / 2, cH * 0.60);
                ctx.fillText('Outer Core (liquid)', cW / 2, cH * 0.76);
                ctx.fillText('Inner Core (solid)', cW / 2, cH * 0.92);
              }



              // â”€â”€ Convection currents â”€â”€

              if (showConvection) {

                for (var di = 0; di < convectionDots.length; di++) {

                  var dot = convectionDots[di];

                  var cellW = cW / 4;

                  var cellCx = (dot.cell + 0.5) * cellW;

                  var cellCy = cH * 0.55;

                  var rx = cellW * 0.35;

                  var ry = cH * 0.12;

                  dot.angle += 0.008 * speed * (dot.cell % 2 === 0 ? 1 : -1);

                  dot.x = cellCx + Math.cos(dot.angle) * rx;

                  dot.y = cellCy + Math.sin(dot.angle) * ry;

                  var alpha = 0.4 + 0.3 * Math.sin(dot.angle);

                  ctx.fillStyle = 'rgba(255,140,0,' + alpha + ')';

                  ctx.beginPath();

                  ctx.arc(dot.x, dot.y, 3, 0, Math.PI * 2);

                  ctx.fill();

                  // Arrow head at top of rotation

                  if (Math.abs(Math.sin(dot.angle)) < 0.15 && Math.cos(dot.angle) * (dot.cell % 2 === 0 ? 1 : -1) > 0) {

                    ctx.fillStyle = 'rgba(255,200,50,0.7)';

                    ctx.beginPath();

                    var aDir = dot.cell % 2 === 0 ? 1 : -1;

                    ctx.moveTo(dot.x + 6 * aDir, dot.y);

                    ctx.lineTo(dot.x - 2 * aDir, dot.y - 4);

                    ctx.lineTo(dot.x - 2 * aDir, dot.y + 4);

                    ctx.fill();

                  }

                }

              }



              // â”€â”€ Tectonic plates â”€â”€

              for (var pi = 0; pi < plates.length; pi++) {

                var pl = plates[pi];

                var pGrad = ctx.createLinearGradient(pl.x, crustY - pl.thick, pl.x, crustY);

                pGrad.addColorStop(0, pl.color);

                pGrad.addColorStop(1, '#333');

                ctx.fillStyle = pGrad;



                // Plate body

                ctx.fillRect(pl.x + 2, crustY - pl.thick, pl.w - 4, pl.thick);



                // Surface features

                if (pl.type === 'continental') {

                  // Rough terrain contour along top edge
                  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
                  ctx.lineWidth = 1;
                  ctx.beginPath();
                  for (var tc = 0; tc < pl.w - 4; tc += 3) {
                    var tcY = crustY - pl.thick - Math.random() * 2;
                    if (tc === 0) ctx.moveTo(pl.x + 2 + tc, tcY);
                    else ctx.lineTo(pl.x + 2 + tc, tcY);
                  }
                  ctx.stroke();

                  // Mountains (larger, proper ridgeline)
                  var mtCount = Math.max(3, Math.floor(pl.w / 35));
                  for (var mt = 0; mt < mtCount; mt++) {
                    var mx2 = pl.x + pl.w * 0.15 + mt * pl.w * (0.7 / mtCount);
                    var mh = 16 + Math.sin(mt * 1.7 + pi) * 8;
                    var mw = 12 + Math.sin(mt * 2.3 + pi * 0.5) * 4;

                    // Mountain shadow
                    ctx.fillStyle = 'rgba(0,0,0,0.12)';
                    ctx.beginPath();
                    ctx.moveTo(mx2 - mw - 2, crustY - pl.thick);
                    ctx.lineTo(mx2 + 2, crustY - pl.thick - mh + 1);
                    ctx.lineTo(mx2 + mw + 4, crustY - pl.thick);
                    ctx.fill();

                    // Mountain body
                    var mtGrad = ctx.createLinearGradient(mx2, crustY - pl.thick - mh, mx2, crustY - pl.thick);
                    mtGrad.addColorStop(0, '#7a6b52');
                    mtGrad.addColorStop(0.4, pl.color);
                    mtGrad.addColorStop(1, '#4a3a28');
                    ctx.fillStyle = mtGrad;
                    ctx.beginPath();
                    ctx.moveTo(mx2 - mw, crustY - pl.thick);
                    ctx.lineTo(mx2 - mw * 0.3, crustY - pl.thick - mh * 0.7);
                    ctx.lineTo(mx2, crustY - pl.thick - mh);
                    ctx.lineTo(mx2 + mw * 0.3, crustY - pl.thick - mh * 0.75);
                    ctx.lineTo(mx2 + mw, crustY - pl.thick);
                    ctx.fill();

                    // Snow cap (proportional)
                    ctx.fillStyle = 'rgba(255,255,255,0.9)';
                    ctx.beginPath();
                    ctx.moveTo(mx2 - mw * 0.2, crustY - pl.thick - mh + mh * 0.2);
                    ctx.lineTo(mx2, crustY - pl.thick - mh);
                    ctx.lineTo(mx2 + mw * 0.2, crustY - pl.thick - mh + mh * 0.22);
                    ctx.fill();
                  }

                  // Vegetation dots on continental surface
                  ctx.fillStyle = 'rgba(60,140,50,0.35)';
                  for (var vg = 0; vg < Math.floor(pl.w / 8); vg++) {
                    var vgX = pl.x + 6 + Math.random() * (pl.w - 12);
                    var vgY = crustY - pl.thick + 2 + Math.random() * (pl.thick * 0.2);
                    ctx.beginPath(); ctx.arc(vgX, vgY, 1 + Math.random(), 0, Math.PI * 2); ctx.fill();
                  }

                } else {

                  // Ocean water on top of oceanic plates
                  ctx.fillStyle = 'rgba(30,90,180,0.35)';
                  ctx.fillRect(pl.x + 2, crustY - pl.thick - 10, pl.w - 4, 10);

                  // Subtle ridge lines on oceanic plate surface
                  ctx.strokeStyle = 'rgba(100,160,220,0.15)';
                  ctx.lineWidth = 0.8;
                  for (var rl = 0; rl < 3; rl++) {
                    ctx.beginPath();
                    var rlY = crustY - pl.thick + pl.thick * (0.25 + rl * 0.25);
                    ctx.moveTo(pl.x + 6, rlY);
                    ctx.lineTo(pl.x + pl.w - 6, rlY + (Math.sin(rl + pi) * 2));
                    ctx.stroke();
                  }
                }



                // Plate label

                if (showLabels) {

                  ctx.fillStyle = '#fff';

                  ctx.font = 'bold ' + (cW > 600 ? '11' : '8') + 'px system-ui';

                  ctx.textAlign = 'center';

                  ctx.fillText(pl.name, pl.x + pl.w / 2, crustY - pl.thick / 2 + 4);

                }



                // Boundary glow between plates

                if (pi < plates.length - 1) {

                  var next = plates[pi + 1];

                  var gapX = pl.x + pl.w;

                  var gapW = next.x - gapX;

                  if (Math.abs(gapW) < 30) {

                    // Magma glow at boundary

                    var mgGrad = ctx.createRadialGradient(gapX + gapW / 2, crustY - 10, 0, gapX + gapW / 2, crustY - 10, 25);

                    mgGrad.addColorStop(0, 'rgba(255,100,0,0.8)');

                    mgGrad.addColorStop(0.5, 'rgba(255,50,0,0.4)');

                    mgGrad.addColorStop(1, 'rgba(255,0,0,0)');

                    ctx.fillStyle = mgGrad;

                    ctx.fillRect(gapX - 15, crustY - 30, gapW + 30, 40);

                    // Boundary type indicator

                    if (showLabels) {

                      ctx.fillStyle = '#ff6600';

                      ctx.font = 'bold 9px system-ui';

                      ctx.textAlign = 'center';

                      var btype = (pl.type !== next.type) ? 'Subduction' : (gapW < 0 ? 'Convergent' : 'Divergent');

                      ctx.fillText(btype, gapX + gapW / 2, crustY - 35);

                    }

                  }

                }

              }



              // â”€â”€ Earthquake particles â”€â”€

              for (var ei = quakeParticles.length - 1; ei >= 0; ei--) {

                var ep = quakeParticles[ei];

                ep.radius += 1.5 * speed;

                ep.alpha = 1 - ep.radius / ep.maxRadius;

                if (ep.alpha <= 0) { quakeParticles.splice(ei, 1); continue; }

                ctx.strokeStyle = 'rgba(255,255,0,' + ep.alpha + ')';

                ctx.lineWidth = 2;

                ctx.beginPath();

                ctx.arc(ep.x, ep.y, ep.radius, 0, Math.PI * 2);

                ctx.stroke();

              }



              // â”€â”€ Volcano particles â”€â”€

              for (var vi = volcanoParticles.length - 1; vi >= 0; vi--) {

                var vp2 = volcanoParticles[vi];

                vp2.x += vp2.vx * speed;

                vp2.y += vp2.vy * speed;

                vp2.vy += 0.05;

                vp2.life -= speed;

                if (vp2.life <= 0) { volcanoParticles.splice(vi, 1); continue; }

                var vAlpha = vp2.life / vp2.maxLife;

                if (vp2.type === 'lava') {
                  ctx.fillStyle = 'rgba(255,' + Math.floor(80 + vp2.life) + ',0,' + vAlpha + ')';
                  ctx.beginPath(); ctx.arc(vp2.x, vp2.y, 3, 0, Math.PI * 2); ctx.fill();
                } else if (vp2.type === 'lava_fountain') {
                  ctx.fillStyle = 'rgba(255,' + Math.floor(180 + vp2.life * 0.5) + ',0,' + vAlpha + ')';
                  ctx.beginPath(); ctx.arc(vp2.x, vp2.y, 2.5, 0, Math.PI * 2); ctx.fill();
                } else if (vp2.type === 'lava_bomb') {
                  ctx.fillStyle = 'rgba(255,' + Math.floor(100 + vp2.life * 0.3) + ',20,' + vAlpha + ')';
                  ctx.beginPath(); ctx.arc(vp2.x, vp2.y, 4 + Math.random(), 0, Math.PI * 2); ctx.fill();
                  ctx.fillStyle = 'rgba(255,200,50,' + (vAlpha * 0.4) + ')';
                  ctx.beginPath(); ctx.arc(vp2.x - vp2.vx * 1.5, vp2.y - vp2.vy * 1.5, 1.5, 0, Math.PI * 2); ctx.fill();
                } else if (vp2.type === 'pyroclastic') {
                  var pSize = 6 + (1 - vAlpha) * 14;
                  var pGray = Math.floor(60 + (1 - vAlpha) * 40);
                  ctx.fillStyle = 'rgba(' + pGray + ',' + pGray + ',' + Math.floor(pGray * 0.8) + ',' + (vAlpha * 0.45) + ')';
                  ctx.beginPath(); ctx.arc(vp2.x, vp2.y, pSize, 0, Math.PI * 2); ctx.fill();
                } else if (vp2.type === 'ember') {
                  ctx.fillStyle = 'rgba(255,' + Math.floor(200 + Math.random() * 55) + ',50,' + vAlpha + ')';
                  ctx.beginPath(); ctx.arc(vp2.x, vp2.y, 1 + Math.random(), 0, Math.PI * 2); ctx.fill();
                } else {
                  ctx.fillStyle = 'rgba(100,100,100,' + (vAlpha * 0.5) + ')';
                  ctx.beginPath(); ctx.arc(vp2.x, vp2.y, 4 + (1 - vAlpha) * 6, 0, Math.PI * 2); ctx.fill();
                }
              }

              // ══════════════════════════════════════
              // ██ VOLCANIC ERUPTION SYSTEM ██
              // ══════════════════════════════════════
              if (eruptState.active) {
                eruptState.tick += speed;
                var eT = eruptState.tick;
                var eCX = eruptState.coneX;
                var eCY = eruptState.coneBaseY;
                var eCW2 = eruptState.coneW;
                var eCH2 = eruptState.coneH;

                // Draw volcano cone (trapezoid with crater)
                var coneGrad = ctx.createLinearGradient(eCX, eCY - eCH2, eCX, eCY);
                coneGrad.addColorStop(0, '#4a3528');
                coneGrad.addColorStop(0.5, '#5c4233');
                coneGrad.addColorStop(1, '#3a2a1e');
                ctx.fillStyle = coneGrad;
                ctx.beginPath();
                ctx.moveTo(eCX - eCW2 * 0.7, eCY);
                ctx.lineTo(eCX - eCW2 * 0.15, eCY - eCH2);
                ctx.lineTo(eCX + eCW2 * 0.15, eCY - eCH2);
                ctx.lineTo(eCX + eCW2 * 0.7, eCY);
                ctx.closePath();
                ctx.fill();

                // Crater depression
                ctx.fillStyle = '#2a1a10';
                ctx.beginPath();
                ctx.ellipse(eCX, eCY - eCH2 + 2, eCW2 * 0.14, 4, 0, 0, Math.PI * 2);
                ctx.fill();

                // Magma glow inside crater
                var mgAlpha2 = 0.4 + 0.3 * Math.sin(eT * 0.08);
                var craterGlow = ctx.createRadialGradient(eCX, eCY - eCH2 + 2, 0, eCX, eCY - eCH2 + 2, eCW2 * 0.2);
                craterGlow.addColorStop(0, 'rgba(255,140,0,' + mgAlpha2 + ')');
                craterGlow.addColorStop(0.5, 'rgba(255,60,0,' + (mgAlpha2 * 0.5) + ')');
                craterGlow.addColorStop(1, 'rgba(200,30,0,0)');
                ctx.fillStyle = craterGlow;
                ctx.beginPath(); ctx.arc(eCX, eCY - eCH2 + 2, eCW2 * 0.2, 0, Math.PI * 2); ctx.fill();

                // Magma chamber glow below cone
                var chamberGlow = ctx.createRadialGradient(eCX, eCY + 15, 0, eCX, eCY + 15, 40);
                chamberGlow.addColorStop(0, 'rgba(255,80,0,' + (0.3 + 0.15 * Math.sin(eT * 0.05)) + ')');
                chamberGlow.addColorStop(1, 'rgba(255,40,0,0)');
                ctx.fillStyle = chamberGlow;
                ctx.beginPath(); ctx.arc(eCX, eCY + 15, 40, 0, Math.PI * 2); ctx.fill();

                // Phase 0: Rumble (0-60 ticks)
                if (eT < 60) {
                  if (eT % 6 < 2) {
                    volcanoParticles.push({ x: eCX + (Math.random()-0.5)*8, y: eCY - eCH2 - 5, vx: (Math.random()-0.5)*0.5, vy: -0.8 - Math.random()*1.2, life: 50+Math.random()*30, maxLife: 80, type: 'smoke' });
                  }
                }

                // Phase 1: Main blast (60-180 ticks)
                if (eT >= 60 && eT < 180) {
                  if (eT % 2 < 1) {
                    for (var lf = 0; lf < 3; lf++) {
                      volcanoParticles.push({ x: eCX + (Math.random()-0.5)*10, y: eCY - eCH2 - 3, vx: (Math.random()-0.5)*2.5, vy: -4 - Math.random()*5, life: 40+Math.random()*30, maxLife: 70, type: 'lava_fountain' });
                    }
                  }
                  if (eT % 12 < 2) {
                    volcanoParticles.push({ x: eCX + (Math.random()-0.5)*6, y: eCY - eCH2 - 5, vx: (Math.random()-0.5)*6, vy: -6 - Math.random()*3, life: 70+Math.random()*30, maxLife: 100, type: 'lava_bomb' });
                  }
                  if (eT % 8 < 2) {
                    var pDir2 = Math.random() > 0.5 ? 1 : -1;
                    volcanoParticles.push({ x: eCX + pDir2 * 10, y: eCY - eCH2 * 0.5, vx: pDir2 * (1 + Math.random()*2), vy: -0.3 - Math.random()*0.5, life: 80+Math.random()*40, maxLife: 120, type: 'pyroclastic' });
                  }
                  if (eT % 3 < 1) {
                    volcanoParticles.push({ x: eCX + (Math.random()-0.5)*20, y: eCY - eCH2 - 10, vx: (Math.random()-0.5)*1.5, vy: -1.5 - Math.random()*2, life: 35+Math.random()*25, maxLife: 60, type: 'ember' });
                  }
                }

                // Phase 2: Lava flow (120-350 ticks)
                if (eT >= 120 && eT < 350) {
                  if (eT % 4 < 1 && eruptState.lavaFlows.length < 30) {
                    var lfDir2 = Math.random() > 0.5 ? 1 : -1;
                    eruptState.lavaFlows.push({ x: eCX + (Math.random()-0.5)*6, y: eCY - eCH2 + 4, vx: lfDir2 * (0.3 + Math.random()*0.6), vy: 0.4 + Math.random()*0.3, life: 120, maxLife: 120 });
                  }
                }
                for (var lfi = eruptState.lavaFlows.length - 1; lfi >= 0; lfi--) {
                  var lf2 = eruptState.lavaFlows[lfi];
                  lf2.x += lf2.vx * speed * 0.5;
                  lf2.y += lf2.vy * speed * 0.5;
                  lf2.life -= speed * 0.5;
                  if (lf2.life <= 0 || lf2.y > eCY + 5) { eruptState.lavaFlows.splice(lfi, 1); continue; }
                  var lfAlpha = lf2.life / lf2.maxLife;
                  ctx.fillStyle = 'rgba(255,' + Math.floor(60 + lfAlpha * 120) + ',0,' + (lfAlpha * 0.8) + ')';
                  ctx.beginPath(); ctx.arc(lf2.x, lf2.y, 2 + (1 - lfAlpha) * 1.5, 0, Math.PI * 2); ctx.fill();
                  if (lfAlpha < 0.3) {
                    ctx.fillStyle = 'rgba(80,70,65,' + (0.4 - lfAlpha) + ')';
                    ctx.beginPath(); ctx.arc(lf2.x, lf2.y, 3.5, 0, Math.PI * 2); ctx.fill();
                  }
                }

                // Phase 3: Ash cloud (200-500 ticks)
                if (eT >= 200 && eT < 500) {
                  if (eT % 5 < 2) {
                    var ashDir2 = (Math.random() - 0.3) * 2;
                    eruptState.ashParticles.push({ x: eCX + (Math.random()-0.5)*30, y: eCY - eCH2 - 20 - Math.random()*30, vx: ashDir2, vy: -0.2 - Math.random()*0.3, life: 100+Math.random()*60, maxLife: 160 });
                  }
                }
                for (var ai2 = eruptState.ashParticles.length - 1; ai2 >= 0; ai2--) {
                  var ap2 = eruptState.ashParticles[ai2];
                  ap2.x += ap2.vx * speed * 0.4;
                  ap2.y += ap2.vy * speed * 0.3;
                  ap2.life -= speed * 0.5;
                  if (ap2.life <= 0) { eruptState.ashParticles.splice(ai2, 1); continue; }
                  var aAlpha2 = ap2.life / ap2.maxLife;
                  var ashG2 = Math.floor(100 + (1 - aAlpha2) * 50);
                  ctx.fillStyle = 'rgba(' + ashG2 + ',' + Math.floor(ashG2 * 0.9) + ',' + Math.floor(ashG2 * 0.8) + ',' + (aAlpha2 * 0.25) + ')';
                  ctx.beginPath(); ctx.arc(ap2.x, ap2.y, 5 + (1 - aAlpha2) * 10, 0, Math.PI * 2); ctx.fill();
                }

                // End eruption after ~520 ticks
                if (eT > 520 && volcanoParticles.length === 0 && eruptState.lavaFlows.length === 0 && eruptState.ashParticles.length === 0) {
                  eruptState.active = false;
                  eruptState.tick = 0;
                }
              }



              // â”€â”€ Drag hint â”€â”€

              if (tick < 120) {

                var hAlpha = 0.5 + 0.3 * Math.sin(tick * 0.08);

                ctx.fillStyle = 'rgba(255,255,255,' + hAlpha + ')';

                ctx.font = 'bold 14px system-ui';

                ctx.textAlign = 'center';

                ctx.fillText('\u2B05 Drag plates to see interactions \u27A1', cW / 2, crustY - 70);

              }



              canvasEl._ptAnim = requestAnimationFrame(draw);

            }


            // Listen for eruption trigger from button
            canvasEl.addEventListener('triggerEruption', function() {
              if (!eruptState.active) {
                triggerEruption(cW * 0.5);
              }
            });

            draw();

          };



          // â”€â”€ Seismograph canvas â”€â”€

          var seismoRef = function(canvasEl) {

            if (!canvasEl) {

              if (seismoRef._last && seismoRef._last._seisAnim) { cancelAnimationFrame(seismoRef._last._seisAnim); seismoRef._last._seisInit = false; }

              return;

            }

            if (canvasEl._seisInit) return;

            canvasEl._seisInit = true;

            seismoRef._last = canvasEl;

            var sW = canvasEl.width = canvasEl.offsetWidth * 2;

            var sH = canvasEl.height = canvasEl.offsetHeight * 2;

            var sCtx = canvasEl.getContext('2d');

            var sTick = 0;

            function drawSeis() {

              sTick++;

              sCtx.fillStyle = '#fefce8';

              sCtx.fillRect(0, 0, sW, sH);

              // Grid lines

              sCtx.strokeStyle = 'rgba(0,0,0,0.08)';

              sCtx.lineWidth = 1;

              for (var gy = 0; gy < sH; gy += sH / 8) { sCtx.beginPath(); sCtx.moveTo(0, gy); sCtx.lineTo(sW, gy); sCtx.stroke(); }

              // Seismograph trace

              var mag = eqMagnitude;

              var amp = (mag / 9) * sH * 0.4;

              var freq = 0.02 + (mag / 9) * 0.06;

              sCtx.strokeStyle = '#dc2626';

              sCtx.lineWidth = 2;

              sCtx.beginPath();

              for (var sx = 0; sx < sW; sx += 2) {

                var decay = Math.max(0, 1 - Math.abs(sx - sW * 0.5) / (sW * 0.35));

                var sy = sH / 2 + Math.sin((sx + sTick * 2) * freq) * amp * decay * (1 + 0.3 * Math.sin(sx * 0.1));

                if (sx === 0) sCtx.moveTo(sx, sy); else sCtx.lineTo(sx, sy);

              }

              sCtx.stroke();

              // Labels

              sCtx.fillStyle = '#991b1b';

              sCtx.font = 'bold 12px system-ui';

              sCtx.textAlign = 'left';

              sCtx.fillText('M ' + mag.toFixed(1), 10, 20);

              sCtx.textAlign = 'right';

              sCtx.fillText('Seismograph', sW - 10, 20);

              canvasEl._seisAnim = requestAnimationFrame(drawSeis);

            }

            drawSeis();

          };



          // â”€â”€ render â”€â”€

          return React.createElement("div", { className: "max-w-4xl mx-auto" },

            // Header

            React.createElement("div", { className: "mb-6 text-center" },

              React.createElement("div", { className: "inline-flex items-center gap-3 px-6 py-3 rounded-2xl mb-3", style: { background: _gRed, boxShadow: '0 8px 32px rgba(220,38,38,0.3)' } },

                React.createElement("span", { style: { fontSize: '32px' } }, "\uD83C\uDF0B"),

                React.createElement("h2", { className: "text-2xl font-black text-white tracking-tight" }, "Plate Tectonics"),

                React.createElement("span", { className: "text-red-200 text-sm font-bold ml-2" }, "Interactive Earth")

              ),

              // Tabs

              React.createElement("div", { className: "flex justify-center gap-2 mt-4" },

                [['sim', '\uD83C\uDF0D', 'Simulation'], ['earthquake', '\uD83D\uDCC8', 'Earthquake Lab'], ['timeline', '\u23F3', 'Timeline'], ['quiz', '\u2753', 'Quiz']].map(function(tab) {

                  var active = simTab === tab[0];

                  return React.createElement("button", { "aria-label": "Switch to " + tab[2] + " tab",

                    key: tab[0],

                    onClick: function() { upd({ simTab: tab[0] }); if (typeof canvasNarrate === 'function') { canvasNarrate('plateTectonics', 'tab_switch', { first: 'Switched to ' + tab[2] + ' view. ' + (tab[0] === 'sim' ? 'Drag plates to explore boundaries.' : tab[0] === 'earthquake' ? 'Set magnitude and trigger earthquakes.' : tab[0] === 'timeline' ? 'Explore geological time periods.' : 'Test your knowledge.'), repeat: tab[2] + ' tab active.', terse: tab[2] + '.' }, { debounce: 500 }); } },

                    className: "px-4 py-2 rounded-xl text-sm font-bold transition-all " + (active ? "text-white shadow-lg scale-105" : "text-red-800 bg-red-50 hover:bg-red-100"),

                    style: active ? { background: _gRed, boxShadow: '0 4px 14px rgba(220,38,38,0.3)' } : {}

                  }, tab[1] + " " + tab[2]);

                })

              )

            ),



            // â•â•â• TAB 1: SIMULATION â•â•â•

            simTab === 'sim' && React.createElement("div", { className: "space-y-4" },

              React.createElement("div", { className: "rounded-2xl overflow-hidden border-2 border-red-200 shadow-lg" },

                React.createElement("canvas", {

                  ref: canvasRef,

                  'aria-label': 'Interactive plate tectonics cross-section visualization', tabIndex: 0,

                  className: "w-full cursor-grab active:cursor-grabbing",

                  style: { height: '400px', display: 'block', background: '#1a1a2e' }

                })

              ),

              // Controls

              React.createElement("div", { className: "flex flex-wrap gap-3 items-center justify-center p-3 rounded-xl border border-red-200 bg-red-50" },

                React.createElement("label", { className: "text-xs font-bold text-red-700" }, "\u23F1 Speed:"),

                React.createElement("input", { type: "range", min: "0.5", max: "4", step: "0.5", value: speed, onChange: function(e) { upd({ speed: parseFloat(e.target.value) }); }, className: "w-24 accent-red-500" }),

                React.createElement("span", { className: "text-xs font-bold text-red-500" }, speed + "\u00D7"),

                React.createElement("button", { "aria-label": "Labels",

                  onClick: function() { upd({ showLabels: !showLabels }); },

                  className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (showLabels ? "bg-red-600 text-white" : "bg-white text-red-600 border border-red-200")

                }, "\uD83C\uDFF7 Labels"),

                React.createElement("button", { "aria-label": "Currents",

                  onClick: function() { upd({ showConvection: !showConvection }); },

                  className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (showConvection ? "bg-red-600 text-white" : "bg-white text-red-600 border border-red-200")

                }, "\uD83C\uDF00 Currents"),

                // 🌋 Erupt! button
                React.createElement("button", { "aria-label": "Erupt!",
                  onClick: function() {
                    if (canvasRef._last && canvasRef._last._ptInit) {
                      // Dispatch eruption event
                      canvasRef._last.dispatchEvent(new CustomEvent('triggerEruption'));
                    }
                  },
                  className: "px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md bg-gradient-to-r from-orange-500 to-red-600 text-white hover:from-orange-600 hover:to-red-700",
                  style: { animation: 'pulse 2s infinite', boxShadow: '0 0 12px rgba(255,100,0,0.4)' }
                }, "\uD83C\uDF0B Erupt!")

              )

            ),



            // â•â•â• TAB 2: EARTHQUAKE LAB â•â•â•

            simTab === 'earthquake' && React.createElement("div", { className: "space-y-4" },

              React.createElement("div", { className: "p-5 rounded-2xl border-2 border-red-200", style: { background: _gCard } },

                React.createElement("div", { className: "flex items-center gap-2 mb-4" },

                  React.createElement("span", { style: { fontSize: '24px' } }, "\uD83D\uDCC8"),

                  React.createElement("h3", { className: "font-black text-red-900" }, "Earthquake Magnitude Simulator")

                ),

                // Magnitude slider

                React.createElement("div", { className: "flex items-center gap-3 mb-4" },

                  React.createElement("span", { className: "text-xs font-bold text-red-600 w-20" }, "Magnitude:"),

                  React.createElement("input", { type: "range", min: "1", max: "9", step: "0.1", value: eqMagnitude, onChange: function(e) { upd({ eqMagnitude: parseFloat(e.target.value) }); }, className: "flex-1 accent-red-500" }),

                  React.createElement("span", { className: "text-lg font-black px-3 py-1 rounded-lg", style: { background: eqMagnitude >= 7 ? '#dc2626' : eqMagnitude >= 5 ? '#f59e0b' : '#22c55e', color: 'white' } }, eqMagnitude.toFixed(1))

                ),

                // Damage scale

                React.createElement("div", { className: "grid grid-cols-3 gap-2 mb-4" },

                  [

                    { range: '1-3', label: 'Minor', desc: 'Barely felt', color: '#22c55e', icon: '\u2705' },

                    { range: '4-5', label: 'Light', desc: 'Rattling, minor damage', color: '#f59e0b', icon: '\u26A0\uFE0F' },

                    { range: '6-7', label: 'Strong', desc: 'Structural damage', color: '#ef4444', icon: '\uD83C\uDFDA\uFE0F' },

                  ].map(function(d2) {

                    var isActive = (d2.range === '1-3' && eqMagnitude < 4) || (d2.range === '4-5' && eqMagnitude >= 4 && eqMagnitude < 6) || (d2.range === '6-7' && eqMagnitude >= 6);

                    return React.createElement("div", { key: d2.range, className: "p-3 rounded-xl border-2 text-center transition-all " + (isActive ? "shadow-lg scale-105" : "opacity-60"), style: { borderColor: d2.color, background: isActive ? d2.color + '15' : 'white' } },

                      React.createElement("div", { className: "text-lg" }, d2.icon),

                      React.createElement("div", { className: "text-xs font-black", style: { color: d2.color } }, d2.label + " (" + d2.range + ")"),

                      React.createElement("div", { className: "text-[10px] text-slate-500" }, d2.desc)

                    );

                  })

                ),

                // Wave types

                React.createElement("div", { className: "grid grid-cols-3 gap-2 mb-4" },

                  [

                    { name: 'P-wave', desc: 'Compression (fastest)', icon: '\u2192\u2190', color: '#3b82f6' },

                    { name: 'S-wave', desc: 'Shear (medium)', icon: '\u2195', color: '#8b5cf6' },

                    { name: 'Surface', desc: 'Rolling (slowest, most damage)', icon: '\u223F', color: '#ef4444' }

                  ].map(function(w2) {

                    return React.createElement("div", { key: w2.name, className: "p-3 rounded-xl border text-center", style: { borderColor: w2.color + '44', background: w2.color + '08' } },

                      React.createElement("div", { className: "text-lg font-mono" }, w2.icon),

                      React.createElement("div", { className: "text-xs font-black", style: { color: w2.color } }, w2.name),

                      React.createElement("div", { className: "text-[10px] text-slate-500" }, w2.desc)

                    );

                  })

                ),

                // Seismograph

                React.createElement("div", { className: "rounded-xl overflow-hidden border-2 border-red-200" },

                  React.createElement("canvas", { ref: seismoRef, 'aria-label': 'Interactive plate tectonics seismograph visualization', role: 'img', className: "w-full", style: { height: '120px', display: 'block' } })

                )

              )

            ),



            // ═══ TAB 3: TIMELINE ═══

            simTab === 'timeline' && React.createElement('div', { className: 'space-y-4' },

              React.createElement('div', { className: 'p-5 rounded-2xl border-2 border-red-200', style: { background: _gCard } },

                // Header
                React.createElement('div', { className: 'flex items-center gap-2 mb-4' },
                  React.createElement('span', { style: { fontSize: '24px' } }, '\u23F3'),
                  React.createElement('h3', { className: 'font-black text-red-900' }, 'Continental Drift Timeline'),

                  // Time-lapse controls
                  React.createElement('div', { className: 'ml-auto flex items-center gap-2' },
                    React.createElement('button', {
                      onClick: function() {
                        if (!timelapsePlaying) {
                          upd({ timelapsePlaying: true, timelapseProgress: timelineEra });
                        } else {
                          upd({ timelapsePlaying: false });
                        }
                      },
                      className: 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md ' +
                        (timelapsePlaying ? 'bg-red-600 text-white' : 'bg-gradient-to-r from-orange-500 to-red-600 text-white'),
                      style: timelapsePlaying ? {} : { animation: 'pulse 2s infinite' }
                    }, timelapsePlaying ? '\u23F8 Pause' : '\u25B6 Time-Lapse'),

                    // Speed selector
                    React.createElement('select', {
                      value: timelapseSpeed,
                      onChange: function(e) { upd({ timelapseSpeed: parseFloat(e.target.value) }); },
                      className: 'text-[10px] font-bold px-2 py-1 rounded-lg border border-red-200 bg-white text-red-700'
                    },
                      React.createElement('option', { value: '0.5' }, '0.5\u00D7'),
                      React.createElement('option', { value: '1' }, '1\u00D7'),
                      React.createElement('option', { value: '2' }, '2\u00D7')
                    )
                  )
                ),

                // Timeline slider
                React.createElement('input', { type: 'range', 'aria-label': 'timeline era', min: '0', max: String(ERAS.length - 1), step: '1', value: timelineEra, onChange: function(e) { upd({ timelineEra: parseInt(e.target.value), timelapsePlaying: false }); }, className: 'w-full accent-red-500 mb-2' }),

                // Geological timescale bar
                React.createElement('div', { className: 'flex rounded-full overflow-hidden h-2 mb-4 shadow-inner' },
                  ERAS.map(function(era, ei) {
                    var colors = [
                      '#8b0000', '#5c3317', '#2e8b57', '#228b22',
                      '#4682b4', '#daa520', '#cd853f', '#1e90ff'
                    ];
                    return React.createElement('div', {
                      key: ei,
                      style: {
                        flex: 1,
                        background: colors[ei] || colors[0],
                        opacity: ei <= timelineEra ? 1 : 0.3,
                        transition: 'opacity 0.3s'
                      }
                    });
                  })
                ),

                // Era cards with icons
                React.createElement('div', { className: 'grid grid-cols-4 md:grid-cols-8 gap-1.5 mb-4' },
                  ERAS.map(function(era, ei) {
                    var isActive = ei === timelineEra;
                    return React.createElement('button', {
                      key: ei,
                      onClick: function() { upd({ timelineEra: ei, timelapsePlaying: false }); if (typeof awardStemXP === 'function') awardStemXP('plateTectonics', 2, 'Timeline explored'); if (typeof canvasNarrate === 'function') { canvasNarrate('plateTectonics', 'era_select', { first: era.name + ' era, ' + era.mya + '. ' + era.keyEvent, repeat: era.name + ', ' + era.mya + '.', terse: era.name + '.' }, { debounce: 500 }); } },
                      className: 'p-2 rounded-xl text-center transition-all ' + (isActive ? 'ring-2 ring-red-500 shadow-lg scale-105' : 'hover:shadow-md hover:scale-102'),
                      style: { background: isActive ? 'linear-gradient(135deg, #fecaca, #fca5a5)' : 'white', border: '2px solid ' + (isActive ? '#ef4444' : '#fecaca') }
                    },
                      React.createElement('div', { className: 'text-lg' }, era.icon || '\uD83C\uDF0D'),
                      React.createElement('div', { className: 'text-[11px] font-black ' + (isActive ? 'text-red-700' : 'text-slate-500') }, era.name),
                      React.createElement('div', { className: 'text-[8px] text-slate-500' }, era.mya)
                    );
                  })
                ),

                // "What Happened" education callout
                React.createElement('div', { className: 'p-4 bg-white rounded-xl border border-red-200 space-y-2' },
                  React.createElement('div', { className: 'flex items-center gap-2' },
                    React.createElement('span', { className: 'text-lg' }, ERAS[timelineEra].icon || '\uD83C\uDF0D'),
                    React.createElement('span', { className: 'text-lg font-black text-red-700' }, ERAS[timelineEra].name),
                    React.createElement('span', { className: 'text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full' }, ERAS[timelineEra].mya)
                  ),

                  // Key event banner
                  React.createElement('div', { className: 'flex items-start gap-2 p-3 rounded-lg', style: { background: 'linear-gradient(135deg, #fff7ed, #ffedd5)' } },
                    React.createElement('span', { className: 'text-sm mt-0.5' }, '\u26A1'),
                    React.createElement('p', { className: 'text-sm font-bold text-orange-800' }, ERAS[timelineEra].keyEvent || '')
                  ),

                  // Detailed description
                  React.createElement('p', { className: 'text-xs text-slate-600 leading-relaxed' }, ERAS[timelineEra].desc || ''),

                  React.createElement('p', { className: 'text-[10px] text-slate-500 mt-1 italic' }, '\uD83D\uDCA1 Switch to Simulation tab to see plate positions, or use Time-Lapse to animate through all eras.')
                )

              )

            ),

            // â•â•â• EARTH TIMELAPSE CANVAS â•â•â•

            React.createElement("div", { className: "rounded-2xl border-2 border-red-200 overflow-hidden mt-4", style: { background: 'linear-gradient(135deg, #0c0a2a, #1e1b4b)' } },

              React.createElement("div", { className: "p-4" },

                React.createElement("div", { className: "flex items-center gap-2 mb-3" },

                  React.createElement("span", { style: { fontSize: 22 } }, "\u{1F30D}"),

                  React.createElement("h4", { className: "font-black text-white text-sm" }, "Earth Through Time"),

                  React.createElement("span", { className: "text-[10px] text-indigo-300 font-bold bg-indigo-900/50 px-2 py-0.5 rounded-full" }, ERAS[timelineEra].name)

                ),

                React.createElement('div', { 'data-tl-playing': String(timelapsePlaying), 'data-tl-speed': String(timelapseSpeed), style: { display: 'none' } }),

                React.createElement("canvas", {

                  id: "geology-earth-canvas",

                  'aria-label': 'Interactive plate tectonics Earth cross-section visualization', role: 'img',

                  width: 520, height: 320,

                  className: "w-full rounded-xl",

                  style: { background: '#050520' }

                }),

                React.createElement("p", { className: "text-[10px] text-indigo-300/60 mt-2 italic text-center" }, "\u{1F4A1} Drag the timeline slider to see how Earth's continents have shifted over billions of years")

              )

            ),

            // â”€â”€â”€ Earth canvas renderer (async) â”€â”€â”€

            (function () {
  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-platetectonics')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-platetectonics';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();


              setTimeout(function () {

                var canvas = document.getElementById('geology-earth-canvas');

                if (!canvas) return;

                if (canvas._geoAnim) cancelAnimationFrame(canvas._geoAnim);

                var ctx = canvas.getContext('2d');

                var W = canvas.width, H = canvas.height;

                var cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 30;

                var tick = 0;

                var ERA_CONTINENTS = [
                  // 0: Hadean — no continents, just magma ocean
                  { name: 'Hadean', ocean: '#1a0505', land: '#cc3300', continents: [],
                    magma: true, desc: 'Molten magma ocean' },

                  // 1: Archean — small cratons
                  { name: 'Archean', ocean: '#0a1e4a', land: '#6b7c3f', continents: [
                    { cx: -0.05, cy: 0.05, r: 0.18, shape: 'blob', label: 'Vaalbara', color: '#7a8a40' },
                    { cx: 0.2,  cy: -0.15, r: 0.12, shape: 'blob', label: 'Ur', color: '#8a9050' },
                    { cx: -0.25, cy: -0.1, r: 0.10, shape: 'blob', label: 'Kenorland', color: '#6a7a35' }
                  ] },

                  // 2: Rodinia — first supercontinent
                  { name: 'Rodinia', ocean: '#082854', land: '#5a7a30', continents: [
                    { cx: 0, cy: 0.05, r: 0.42, shape: 'pangaea', label: 'Rodinia', color: '#5a7a30' }
                  ] },

                  // 3: Pangaea — all land united
                  { name: 'Pangaea', ocean: '#0e4080', land: '#3d8b37', continents: [
                    { cx: 0.05, cy: 0, r: 0.52, shape: 'pangaea', label: 'Pangaea', color: '#3d8b37' }
                  ] },

                  // 4: Breakup — Laurasia + Gondwana
                  { name: 'Breakup', ocean: '#125ea0', land: '#4a9e44', continents: [
                    { cx: -0.08, cy: -0.18, r: 0.30, shape: 'blob', label: 'Laurasia', color: '#5aad50' },
                    { cx: 0.05, cy: 0.18, r: 0.32, shape: 'blob', label: 'Gondwana', color: '#3d8b37' }
                  ], riftLine: { y: 0.02, width: 0.6, color: 'rgba(255,100,0,0.4)' } },

                  // 5: Cretaceous — continents separating
                  { name: 'Cretaceous', ocean: '#1a70b8', land: '#50b848', continents: [
                    { cx: -0.32, cy: -0.15, r: 0.16, shape: 'blob', label: 'N. America', color: '#4a8040' },
                    { cx: 0.12,  cy: -0.20, r: 0.20, shape: 'blob', label: 'Eurasia', color: '#5a9050' },
                    { cx: -0.18, cy: 0.18,  r: 0.13, shape: 'blob', label: 'S. America', color: '#3d8030' },
                    { cx: 0.08,  cy: 0.12,  r: 0.15, shape: 'blob', label: 'Africa', color: '#6a9a55' },
                    { cx: 0.28,  cy: 0.10,  r: 0.07, shape: 'blob', label: 'India', color: '#80a060' },
                    { cx: 0.15,  cy: 0.38,  r: 0.14, shape: 'blob', label: 'Antarctica+Aus', color: '#90b070' }
                  ], riftLine: { y: 0.0, width: 0.8, color: 'rgba(255,80,0,0.25)' } },

                  // 6: Cenozoic — near-modern arrangement
                  { name: 'Cenozoic', ocean: '#1e82cc', land: '#4caf50', continents: [
                    { cx: -0.35, cy: -0.12, r: 0.14, shape: 'blob', label: 'N. America', color: '#558040' },
                    { cx: -0.20, cy: 0.22,  r: 0.11, shape: 'blob', label: 'S. America', color: '#3d7530' },
                    { cx: 0.05,  cy: 0.0,   r: 0.13, shape: 'blob', label: 'Africa', color: '#7a9a55' },
                    { cx: 0.18,  cy: -0.22, r: 0.19, shape: 'blob', label: 'Eurasia', color: '#5a8e48' },
                    { cx: 0.22,  cy: -0.05, r: 0.05, shape: 'blob', label: 'India', color: '#80a560' },
                    { cx: 0.35,  cy: 0.30,  r: 0.09, shape: 'blob', label: 'Australia', color: '#90b570' },
                    { cx: 0.0,   cy: 0.42,  r: 0.10, shape: 'blob', label: 'Antarctica', color: '#c0d8c0' }
                  ] },

                  // 7: Modern — current configuration
                  { name: 'Modern', ocean: '#2196f3', land: '#4caf50', continents: [
                    { cx: -0.35, cy: -0.15, r: 0.14, shape: 'blob', label: 'N. America', color: '#558b40' },
                    { cx: -0.22, cy: 0.22,  r: 0.11, shape: 'blob', label: 'S. America', color: '#3d7a30' },
                    { cx: 0.05,  cy: -0.02, r: 0.13, shape: 'blob', label: 'Africa', color: '#7a9a55' },
                    { cx: 0.18,  cy: -0.25, r: 0.20, shape: 'blob', label: 'Eurasia', color: '#5a8e48' },
                    { cx: 0.25,  cy: 0.02,  r: 0.05, shape: 'blob', label: 'India', color: '#80a560' },
                    { cx: 0.38,  cy: 0.30,  r: 0.09, shape: 'blob', label: 'Australia', color: '#90b570' },
                    { cx: 0.0,   cy: 0.45,  r: 0.10, shape: 'blob', label: 'Antarctica', color: '#c0d8c0' }
                  ] }
                ];

                // Map timeline era index to continent config

                var eraMap = [0, 1, 2, 3, 4, 5, 6, 7];

                function drawEarth() {

                  canvas._geoAnim = requestAnimationFrame(drawEarth);

                  tick += 0.5;

                  ctx.clearRect(0, 0, W, H);

                  // Read the active era and handle time-lapse auto-advance
                  var eraIdx = 0;
                  var slider = canvas.parentElement ? canvas.parentElement.parentElement.parentElement.querySelector('input[type="range"]') : null;
                  if (slider) eraIdx = parseInt(slider.value) || 0;

                  // Time-lapse auto-advance
                  var tlPlayBtn = canvas.parentElement ? canvas.parentElement.parentElement.parentElement.querySelector('[data-timelapse]') : null;
                  if (!canvas._tlState) canvas._tlState = { playing: false, progress: 0, pauseTicks: 0, speed: 1 };
                  var tls = canvas._tlState;

                  // Sync with React state via data attributes
                  var tlDataEl = canvas.parentElement ? canvas.parentElement.parentElement.querySelector('[data-tl-playing]') : null;
                  if (tlDataEl) {
                    tls.playing = tlDataEl.getAttribute('data-tl-playing') === 'true';
                    tls.speed = parseFloat(tlDataEl.getAttribute('data-tl-speed')) || 1;
                  }

                  if (tls.playing) {
                    tls.progress += 0.008 * tls.speed;
                    var totalEras = Math.min(ERAS_COUNT, eraMap.length);
                    if (tls.progress >= totalEras - 1) {
                      tls.progress = 0; // loop back
                    }
                    eraIdx = Math.floor(tls.progress);
                    // Update the slider to match
                    if (slider) slider.value = eraIdx;
                  }

                  var configIdx = Math.min(eraIdx, eraMap.length - 1);
                  var era = ERA_CONTINENTS[eraMap[configIdx]];

                  // Interpolation for smooth transitions during time-lapse
                  var eraFrac = tls.playing ? (tls.progress - Math.floor(tls.progress)) : 0;
                  var nextConfigIdx = Math.min(configIdx + 1, eraMap.length - 1);
                  var nextEra = ERA_CONTINENTS[eraMap[nextConfigIdx]];

                  // Stars

                  if (!canvas._stars) {

                    canvas._stars = [];

                    for (var si = 0; si < 80; si++) canvas._stars.push({ x: Math.random() * W, y: Math.random() * H, s: Math.random() * 1.5 + 0.5, b: Math.random() });

                  }

                  ctx.fillStyle = 'rgba(255,255,255,0.4)';

                  canvas._stars.forEach(function (star) {

                    var twinkle = 0.5 + 0.5 * Math.sin(tick * 0.03 + star.b * 10);

                    ctx.globalAlpha = twinkle * 0.7;

                    ctx.beginPath();

                    ctx.arc(star.x, star.y, star.s, 0, Math.PI * 2);

                    ctx.fill();

                  });

                  ctx.globalAlpha = 1;

                  // Atmosphere glow

                  var glow = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.3);

                  glow.addColorStop(0, era.ocean + 'aa');

                  glow.addColorStop(0.5, era.ocean + '44');

                  glow.addColorStop(1, 'transparent');

                  ctx.fillStyle = glow;

                  ctx.fillRect(0, 0, W, H);

                  // Earth sphere

                  ctx.save();

                  ctx.beginPath();

                  ctx.arc(cx, cy, R, 0, Math.PI * 2);

                  ctx.clip();

                  // Ocean gradient

                  var oceanGrad = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, 0, cx, cy, R);

                  oceanGrad.addColorStop(0, era.ocean);

                  var darkerOcean = era.ocean.replace(/[0-9a-f]{2}$/i, function (h) { return Math.max(0, parseInt(h, 16) - 40).toString(16).padStart(2, '0'); });

                  oceanGrad.addColorStop(1, darkerOcean || era.ocean);

                  ctx.fillStyle = oceanGrad;

                  ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

                  // Magma effect for Hadean era
                  if (era.magma) {
                    for (var mi = 0; mi < 20; mi++) {
                      var mx = cx + (Math.sin(tick * 0.01 + mi * 1.3) * R * 0.6);
                      var my = cy + (Math.cos(tick * 0.008 + mi * 1.7) * R * 0.5);
                      var mrad = R * (0.08 + 0.04 * Math.sin(tick * 0.02 + mi));
                      var mglow = ctx.createRadialGradient(mx, my, 0, mx, my, mrad);
                      mglow.addColorStop(0, 'rgba(255,100,0,' + (0.3 + 0.15 * Math.sin(tick * 0.03 + mi)) + ')');
                      mglow.addColorStop(1, 'rgba(200,30,0,0)');
                      ctx.fillStyle = mglow;
                      ctx.beginPath(); ctx.arc(mx, my, mrad, 0, Math.PI * 2); ctx.fill();
                    }
                  }

                  // Rift line between separating continents
                  if (era.riftLine) {
                    var rl = era.riftLine;
                    ctx.strokeStyle = rl.color;
                    ctx.lineWidth = 2;
                    ctx.setLineDash([4, 6]);
                    ctx.beginPath();
                    var rlY = cy + rl.y * R;
                    ctx.moveTo(cx - rl.width * R, rlY + Math.sin(tick * 0.015) * 3);
                    for (var rx = -rl.width; rx <= rl.width; rx += 0.05) {
                      ctx.lineTo(cx + rx * R, rlY + Math.sin(rx * 8 + tick * 0.02) * 4);
                    }
                    ctx.stroke();
                    ctx.setLineDash([]);
                  }

                  // Continents
                  era.continents.forEach(function (c) {
                    var contX = cx + c.cx * R;
                    var contY = cy + c.cy * R;
                    var contR = c.r * R;

                    // Slight rotation drift
                    var drift = Math.sin(tick * 0.005) * 5;
                    contX += drift;

                    ctx.save();
                    ctx.translate(contX, contY);

                    // Draw continent blob with per-continent color
                    ctx.fillStyle = c.color || era.land;
                    ctx.shadowColor = 'rgba(0,0,0,0.3)';
                    ctx.shadowBlur = 8;
                    ctx.beginPath();

                    if (c.shape === 'circle') {
                      ctx.arc(0, 0, contR, 0, Math.PI * 2);
                    } else if (c.shape === 'pangaea') {
                      for (var a = 0; a < Math.PI * 2; a += 0.12) {
                        var rr = contR * (0.7 + 0.3 * Math.sin(a * 3 + 1) + 0.12 * Math.cos(a * 5 + 2) + 0.05 * Math.sin(a * 8 + 0.5));
                        var px = Math.cos(a) * rr;
                        var py = Math.sin(a) * rr;
                        if (a === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                      }
                      ctx.closePath();
                    } else {
                      // Blob shape with more detail
                      for (var a = 0; a < Math.PI * 2; a += 0.15) {
                        var rr = contR * (0.75 + 0.25 * Math.sin(a * 3 + c.cx * 5) + 0.1 * Math.cos(a * 5 + c.cy * 3) + 0.05 * Math.sin(a * 7));
                        var px = Math.cos(a) * rr;
                        var py = Math.sin(a) * rr;
                        if (a === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                      }
                      ctx.closePath();
                    }
                    ctx.fill();
                    ctx.shadowBlur = 0;

                    // Coastline stipple effect
                    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
                    ctx.lineWidth = 1;
                    ctx.stroke();

                    // Terrain highlights
                    ctx.fillStyle = 'rgba(255,255,255,0.08)';
                    ctx.beginPath();
                    ctx.arc(-contR * 0.2, -contR * 0.2, contR * 0.35, 0, Math.PI * 2);
                    ctx.fill();

                    // Mountain stipple dots (for larger continents)
                    if (contR > 20) {
                      ctx.fillStyle = 'rgba(255,255,255,0.06)';
                      for (var md = 0; md < Math.min(8, contR / 5); md++) {
                        var mdx = (Math.sin(md * 2.3 + c.cx * 10) * contR * 0.5);
                        var mdy = (Math.cos(md * 1.7 + c.cy * 8) * contR * 0.4);
                        ctx.beginPath(); ctx.arc(mdx, mdy, 2 + Math.random(), 0, Math.PI * 2); ctx.fill();
                      }
                    }

                    // Label
                    if (c.label) {
                      ctx.fillStyle = 'rgba(255,255,255,0.9)';
                      ctx.font = 'bold ' + Math.max(7, Math.min(11, contR * 0.28)) + 'px Inter, system-ui';
                      ctx.textAlign = 'center';
                      ctx.fillText(c.label, 0, contR * 0.12);
                    }
                    ctx.restore();
                  });

                  // Sphere shading (3D effect)

                  var shading = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, 0, cx, cy, R);

                  shading.addColorStop(0, 'rgba(255,255,255,0.12)');

                  shading.addColorStop(0.5, 'transparent');

                  shading.addColorStop(0.8, 'rgba(0,0,0,0.2)');

                  shading.addColorStop(1, 'rgba(0,0,0,0.5)');

                  ctx.fillStyle = shading;

                  ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

                  ctx.restore();

                  // Ring border

                  ctx.strokeStyle = 'rgba(255,255,255,0.15)';

                  ctx.lineWidth = 2;

                  ctx.beginPath();

                  ctx.arc(cx, cy, R, 0, Math.PI * 2);

                  ctx.stroke();

                  // Era label with timeline indicator
                  ctx.fillStyle = 'rgba(255,255,255,0.85)';
                  ctx.font = 'bold 14px Inter, system-ui';
                  ctx.textAlign = 'left';
                  ctx.fillText(era.name, 15, H - 25);

                  // Mya subtitle
                  ctx.fillStyle = 'rgba(255,255,255,0.5)';
                  ctx.font = '10px Inter, system-ui';
                  var myaText = ERAS[eraIdx] ? ERAS[eraIdx].mya : '';
                  ctx.fillText(myaText, 15, H - 12);

                  // Time-lapse progress bar at bottom
                  if (tls.playing) {
                    var barW = W - 30;
                    var barH = 3;
                    var barX = 15;
                    var barY = H - 5;
                    ctx.fillStyle = 'rgba(255,255,255,0.2)';
                    ctx.fillRect(barX, barY, barW, barH);
                    var totalE = eraMap.length;
                    ctx.fillStyle = 'rgba(255,150,50,0.8)';
                    ctx.fillRect(barX, barY, barW * (tls.progress / (totalE - 1)), barH);
                  }

                }

                drawEarth();

              }, 50);

              return null;

            })(),

            // â•â•â• TAB 4: QUIZ â•â•â•

            simTab === 'quiz' && (function() {

              var qz = QUIZZES[quizIdx % QUIZZES.length];

              return React.createElement("div", { className: "p-6 rounded-2xl border-2 border-red-200", style: { background: _gCard } },

                React.createElement("div", { className: "flex items-center gap-2 mb-4" },

                  React.createElement("span", { className: "text-2xl" }, "\u2753"),

                  React.createElement("h3", { className: "font-black text-red-900" }, "Plate Tectonics Quiz"),

                  React.createElement("span", { className: "ml-auto text-xs font-bold text-red-400" }, (quizIdx % QUIZZES.length + 1) + " / " + QUIZZES.length)

                ),

                React.createElement("div", { className: "p-4 bg-white rounded-xl border border-red-200 mb-4 text-sm font-bold text-slate-700" }, qz.q),

                quizAnswer === null && React.createElement("div", { className: "grid grid-cols-2 gap-2" },

                  qz.opts.map(function(opt, oi) {

                    return React.createElement("button", { "aria-label": "Platetectonics action",

                      key: oi,

                      onClick: function() {

                        var correct = oi === qz.ans;

                        upd({ quizAnswer: correct ? 'correct' : 'wrong_' + oi });

                        if (correct && typeof awardStemXP === 'function') awardStemXP('plateTectonics', 3, 'Quiz correct');

                      },

                      className: "p-3 rounded-xl text-sm font-bold border-2 border-red-200 bg-white hover:bg-red-50 hover:border-red-400 transition-all text-left text-slate-700"

                    }, String.fromCharCode(65 + oi) + ". " + opt);

                  })

                ),

                quizAnswer && React.createElement("div", { className: "space-y-2" },

                  React.createElement("div", { className: "grid grid-cols-2 gap-2" },

                    qz.opts.map(function(opt, oi) {

                      var isCorrect = oi === qz.ans;

                      var wasSelected = quizAnswer === 'correct' ? isCorrect : quizAnswer === 'wrong_' + oi;

                      return React.createElement("div", {

                        key: oi,

                        className: "p-3 rounded-xl text-sm font-bold border-2 transition-all text-left " + (isCorrect ? "border-emerald-400 bg-emerald-50 text-emerald-700" : wasSelected ? "border-red-400 bg-red-50 text-red-600" : "border-slate-200 bg-white text-slate-400")

                      }, (isCorrect ? "\u2705 " : wasSelected ? "\u274C " : "") + String.fromCharCode(65 + oi) + ". " + opt);

                    })

                  ),

                  React.createElement("div", { className: "p-3 rounded-xl border " + (quizAnswer === 'correct' ? "bg-emerald-50 border-emerald-300" : "bg-amber-50 border-amber-300") },

                    React.createElement("div", { className: "text-xs font-bold " + (quizAnswer === 'correct' ? "text-emerald-700" : "text-amber-700") }, quizAnswer === 'correct' ? "\uD83C\uDF89 Correct!" : "\uD83E\uDD14 Not quite!"),

                    React.createElement("div", { className: "text-xs text-slate-600 mt-1" }, qz.explain)

                  ),

                  React.createElement("div", { className: "text-center" },

                    React.createElement("button", { "aria-label": "Next Question",

                      onClick: function() { upd({ quizIdx: quizIdx + 1, quizAnswer: null }); },

                      className: "px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-all"

                    }, "Next Question \u2192")

                  )

                )

              );

            })(),



            // â•â•â• EDUCATIONAL PANEL â•â•â•

            React.createElement("div", { className: "mt-6" },

              React.createElement("button", { "aria-label": "Toggle educational panel: Earth Layers and Plate Boundaries",

                onClick: function() { upd({ showEdu: !showEdu }); if (!showEdu && typeof awardStemXP === 'function') awardStemXP('plateTectonics', 5, 'Learned about tectonics'); },

                className: "w-full p-4 rounded-2xl border-2 border-red-200 text-left transition-all hover:shadow-md flex items-center gap-3",

                style: { background: showEdu ? 'linear-gradient(135deg, #fef2f2, #fee2e2)' : 'white' }

              },

                React.createElement("span", { className: "text-xl" }, "\uD83D\uDCD6"),

                React.createElement("span", { className: "font-black text-red-900 text-sm flex-1" }, "Learn: Earth's Layers & Plate Boundaries"),

                React.createElement("span", { className: "text-red-400 font-bold text-xs" }, showEdu ? "\u25B2 Hide" : "\u25BC Show")

              ),

              showEdu && React.createElement("div", { className: "mt-2 p-5 rounded-2xl border border-red-200 space-y-4 text-sm text-slate-700 leading-relaxed", style: { background: _gCard } },

                React.createElement("div", null,

                  React.createElement("h4", { className: "font-black text-red-800 mb-1" }, "Earth's Layers"),

                  React.createElement("p", null, "Earth has four main layers: the ", React.createElement("strong", null, "inner core"), " (solid iron, 5,200\u00B0C), ", React.createElement("strong", null, "outer core"), " (liquid iron), ", React.createElement("strong", null, "mantle"), " (hot rock that flows slowly), and the thin ", React.createElement("strong", null, "crust"), " we live on.")

                ),

                React.createElement("div", null,

                  React.createElement("h4", { className: "font-black text-red-800 mb-1" }, "Plate Boundaries"),

                  React.createElement("table", { className: "w-full text-xs" },

                    React.createElement("caption", { className: "sr-only" }, "Plate Boundaries"), React.createElement("tbody", null,

                      [['Convergent (\u2192\u2190)','Plates collide','Mountains, earthquakes, volcanoes'],['Divergent (\u2190\u2192)','Plates separate','Mid-ocean ridges, rift valleys'],['Transform (\u2191\u2193)','Plates slide past','Earthquakes (San Andreas Fault)'],['Subduction','Oceanic dives under continental','Deep trenches, volcanic arcs']].map(function(r) {

                        return React.createElement("tr", { key: r[0], className: "border-b border-red-100" },

                          React.createElement("td", { className: "py-1.5 font-bold text-red-700 w-36" }, r[0]),

                          React.createElement("td", { className: "py-1.5 text-slate-600 w-32" }, r[1]),

                          React.createElement("td", { className: "py-1.5 text-slate-500" }, r[2])

                        );

                      })

                    )

                  )

                ),

                React.createElement("div", null,

                  React.createElement("h4", { className: "font-black text-red-800 mb-1" }, "Key Facts"),

                  React.createElement("p", null, "\uD83C\uDF0B The Ring of Fire circles the Pacific Ocean with 75% of Earth's volcanoes. The Himalayas grow ~1cm/year as India pushes into Eurasia. The Mid-Atlantic Ridge is pulling Europe and N. America apart at ~2.5cm/year.")

                )

              )

            ),



            // â•â•â• BACK BUTTON â•â•â•

            React.createElement("div", { className: "mt-6 text-center" },

              React.createElement("button", { "aria-label": "Back to Tools",

                onClick: function() { setStemLabTool(null); },

                className: "px-6 py-2.5 text-sm font-bold text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-all"

              }, "\u2190 Back to Tools")

            )

          );
      })();
    }
  });