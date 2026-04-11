// ═══════════════════════════════════════════
// stem_tool_physics.js — Physics Simulator Plugin
// Standalone plugin extracted from stem_tool_science.js
// Enhanced: vector decomposition, energy bar, learn panel, XP
// ═══════════════════════════════════════════

// ═══════════════════════════════════════════
// stem_tool_science.js — STEM Lab Science Tools
// 29 registered tools
// Auto-extracted (Phase 2 modularization)
// ═══════════════════════════════════════════

// ═══ Defensive StemLab guard ═══
// Ensure window.StemLab is available before registering tools.
// If stem_lab_module.js hasn't loaded yet, create the registry stub.
window.StemLab = window.StemLab || {
  _registry: {},
  _order: [],
  registerTool: function(id, config) {
    config.id = id;
    config.ready = config.ready !== false;
    this._registry[id] = config;
    if (this._order.indexOf(id) === -1) this._order.push(id);
    console.log('[StemLab] Registered tool: ' + id);
  },
  getRegisteredTools: function() {
    var self = this;
    return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean);
  },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) {
    var tool = this._registry[id];
    if (!tool || !tool.render) return null;
    try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; }
  }
};
// ═══ End Guard ═══

(function() {
  'use strict';

  // ── Audio System (auto-injected) ──
  var _phyAC = null;
  function getPhyAC() { if (!_phyAC) { try { _phyAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } if (_phyAC && _phyAC.state === "suspended") { try { _phyAC.resume(); } catch(e) {} } return _phyAC; }
  function phyTone(f,d,tp,v) { var ac = getPhyAC(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = tp||"sine"; o.frequency.value = f; g.gain.setValueAtTime(v||0.07, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function sfxPhyLaunch() { phyTone(200,0.15,"sine",0.07); }
  function sfxPhyCollide() { phyTone(150,0.1,"sawtooth",0.08); }
  function sfxPhyTick() { phyTone(600,0.03,"sine",0.04); }

  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-physics')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-physics';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();


  // ═══ 🔬 physics (physics) ═══
  window.StemLab.registerTool('physics', {
    icon: '\uD83D\uDE80',
    label: 'Physics Simulator',
    desc: 'Launch projectiles, explore kinematics, and learn Newtons laws',
    color: 'sky',
    category: 'science',
    questHooks: [
      { id: 'hit_3_targets', label: 'Hit 3 targets in target practice', icon: '\uD83C\uDFAF', check: function(d) { return (d.targetScore || 0) >= 3; }, progress: function(d) { return (d.targetScore || 0) + '/3 targets'; } },
      { id: 'complete_target_round', label: 'Complete a full target round', icon: '\uD83C\uDFC6', check: function(d) { return (d.targetRound || 1) >= 2; }, progress: function(d) { return (d.targetRound || 1) >= 2 ? 'Done!' : 'Round ' + (d.targetRound || 1); } },
      { id: 'launch_10_projectiles', label: 'Launch 10 projectiles', icon: '\uD83D\uDE80', check: function(d) { return (d.launchCount || 0) >= 10; }, progress: function(d) { return (d.launchCount || 0) + '/10'; } }
    ],
    render: function(ctx) {
      // Aliases — maps ctx properties to original variable names
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
      var canvasNarrate = ctx.canvasNarrate;
      var props = ctx.props;

      // ── Tool body (physics) ──
      return (function() {
          // State initialization guard
          if (!labToolData || !labToolData.physics) {
            setLabToolData(function(prev) {
              return Object.assign({}, prev, { physics: {
                angle: 45, velocity: 25, gravity: 9.8, airResist: false,
                showLearn: false, showFlightData: false, showEnergy: false, showVectors: false,
                challengeTier: 0, challengeActive: false, launchCount: 0, targetsHit: 0,
                // Target Destruction Mode
                targetMode: false, targetRound: 0, targetScore: 0, targetAttempts: 0,
                targetList: null, targetConstraint: null, targetFeedback: null, targetShowScaffold: false,
                // Battle Mode
                battleMode: false, battleType: null, battleRound: 0,
                playerHP: 3, enemyHP: 3, enemyDist: 0, aiDifficulty: 'medium',
                isPlayerTurn: true, battleConstraint: null, battleFeedback: null, battleLog: []
              }});
            });
            return React.createElement('div', { className: 'p-8 text-center text-slate-400' }, 'Loading...');
          }
const d = labToolData.physics;

          const upd = (key, val) => setLabToolData(prev => ({ ...prev, physics: { ...prev.physics, [key]: val } }));
          // ═══ TARGET DESTRUCTION MODE — Constraint Engine ═══
          var TARGET_LEVELS = [
            { round: 1,  targets: [{x:80, y:0}],   constraint: {type:'fixedAngle', value:45},  gravity: 9.8, drag: false, label: 'Cadet 1', desc: 'Angle locked at 45°. Calculate velocity to hit 80m.', xp: 15, tol: 10 },
            { round: 2,  targets: [{x:120, y:0}],  constraint: {type:'fixedVelocity', value:35}, gravity: 9.8, drag: false, label: 'Cadet 2', desc: 'Velocity locked at 35 m/s. Calculate angle to hit 120m.', xp: 15, tol: 10 },
            { round: 3,  targets: [{x:60, y:0}],   constraint: {type:'fixedAngle', value:30},  gravity: 9.8, drag: false, label: 'Cadet 3', desc: 'Angle locked at 30°. Hit the 60m crate.', xp: 15, tol: 8 },
            { round: 4,  targets: [{x:150, y:0}],  constraint: {type:'fixedVelocity', value:40}, gravity: 9.8, drag: false, label: 'Gunner 1', desc: 'Velocity locked at 40 m/s. Hit 150m.', xp: 25, tol: 12 },
            { round: 5,  targets: [{x:100, y:0}],  constraint: {type:'fixedAngle', value:55},  gravity: 1.6, drag: false, label: 'Gunner 2', desc: 'On the Moon! Angle locked at 55°. Hit 100m.', xp: 25, tol: 12 },
            { round: 6,  targets: [{x:80, y:0}, {x:160, y:0}], constraint: {type:'fixedAngle', value:40}, gravity: 9.8, drag: false, label: 'Gunner 3', desc: 'Two targets! Angle locked at 40°. Hit both.', xp: 30, tol: 10 },
            { round: 7,  targets: [{x:90, y:0}],   constraint: {type:'fixedAngle', value:35},  gravity: 9.8, drag: true, label: 'Sniper 1', desc: 'Air drag ON! Angle locked at 35°. Compensate!', xp: 40, tol: 15 },
            { round: 8,  targets: [{x:200, y:0}],  constraint: {type:'fixedVelocity', value:45}, gravity: 3.7, drag: false, label: 'Sniper 2', desc: 'Mars gravity. Velocity locked at 45 m/s. Hit 200m.', xp: 40, tol: 15 },
            { round: 9,  targets: [{x:70, y:0}, {x:140, y:0}, {x:220, y:0}], constraint: {type:'fixedAngle', value:42}, gravity: 9.8, drag: false, label: 'Sniper 3', desc: 'Triple targets! Same angle, adjust velocity each shot.', xp: 50, tol: 10 },
            { round: 10, targets: [{x:130, y:0}],  constraint: {type:'fixedVelocity', value:38}, gravity: 9.8, drag: true, label: 'Ace', desc: 'Final challenge: drag ON, velocity locked at 38 m/s. Prove your mastery.', xp: 60, tol: 12 },
          ];

          function startTargetRound(roundNum) {
            var level = TARGET_LEVELS[Math.min(roundNum - 1, TARGET_LEVELS.length - 1)];
            var tgts = level.targets.map(function(t, i) {
              return { x: t.x, y: t.y || 0, radius: level.tol, destroyed: false, id: i };
            });
            upd('targetRound', roundNum);
            upd('targetList', tgts);
            upd('targetConstraint', level.constraint);
            upd('targetFeedback', null);
            upd('targetAttempts', 0);
            upd('targetShowScaffold', false);
            // Apply level conditions
            upd('gravity', level.gravity);
            upd('airResist', level.drag);
            // Apply constraint
            if (level.constraint.type === 'fixedAngle') {
              upd('angle', level.constraint.value);
            } else if (level.constraint.type === 'fixedVelocity') {
              upd('velocity', level.constraint.value);
            }
            if (addToast) addToast('\u{1F3AF} ' + level.label + ': ' + level.desc, 'info');
          }

          function checkTargetHit(landingX) {
            if (!d.targetMode || !d.targetList) return;
            var tgts = d.targetList.slice();
            var hitAny = false;
            var closestDist = Infinity;
            for (var ti = 0; ti < tgts.length; ti++) {
              if (tgts[ti].destroyed) continue;
              var dist = Math.abs(landingX - tgts[ti].x);
              if (dist < closestDist) closestDist = dist;
              if (dist <= tgts[ti].radius) {
                tgts[ti].destroyed = true;
                hitAny = true;
              }
            }
            upd('targetList', tgts);
            upd('targetAttempts', (d.targetAttempts || 0) + 1);
            var allDestroyed = tgts.every(function(t) { return t.destroyed; });
            if (hitAny && allDestroyed) {
              // Round complete!
              var levelData = TARGET_LEVELS[Math.min((d.targetRound || 1) - 1, TARGET_LEVELS.length - 1)];
              upd('targetScore', (d.targetScore || 0) + levelData.xp);
              upd('targetFeedback', { type: 'success', msg: '\u2705 All targets destroyed! +' + levelData.xp + ' XP' });
              if (awardStemXP) awardStemXP('targetMode', levelData.xp, 'Target Mode Round ' + d.targetRound);
              if (stemCelebrate) stemCelebrate();
              if (addToast) addToast('\u{1F4A5} Round ' + d.targetRound + ' complete! +' + levelData.xp + ' XP', 'success');
            } else if (hitAny) {
              upd('targetFeedback', { type: 'partial', msg: '\u{1F4A5} Hit! ' + tgts.filter(function(t){return !t.destroyed;}).length + ' target(s) remaining.' });
              if (addToast) addToast('\u{1F4A5} Target hit! Keep going!', 'success');
            } else {
              var missMsg = '\u274C Missed by ' + closestDist.toFixed(1) + 'm';
              upd('targetFeedback', { type: 'miss', msg: missMsg });
              if ((d.targetAttempts || 0) >= 2 && !d.targetShowScaffold) {
                upd('targetShowScaffold', true);
              }
              phyTone(200, 0.12, 'sawtooth', 0.05); if (addToast) addToast(missMsg + ' — try again!', 'warning');
            }
          }

          // Calculate correct answer for scaffold display
          function getTargetAnswer() {
            if (!d.targetConstraint || !d.targetList) return null;
            var tgt = d.targetList.find(function(t) { return !t.destroyed; });
            if (!tgt) return null;
            var R = tgt.x;
            var g = d.gravity;
            if (d.targetConstraint.type === 'fixedAngle') {
              var theta = d.targetConstraint.value * Math.PI / 180;
              var v = Math.sqrt(R * g / Math.sin(2 * theta));
              return { param: 'velocity', value: v, equation: 'v = \u221A(R\u00B7g / sin(2\u03B8))', steps: 'v = \u221A(' + R + ' \u00D7 ' + g + ' / sin(2\u00D7' + d.targetConstraint.value + '\u00B0)) = ' + v.toFixed(1) + ' m/s' };
            } else if (d.targetConstraint.type === 'fixedVelocity') {
              var v2 = d.targetConstraint.value;
              var sinVal = R * g / (v2 * v2);
              if (sinVal > 1) return { param: 'angle', value: null, equation: 'Target unreachable at this velocity', steps: '' };
              var theta2 = Math.asin(sinVal) / 2 * 180 / Math.PI;
              return { param: 'angle', value: theta2, equation: '\u03B8 = \u00BD arcsin(R\u00B7g / v\u00B2)', steps: '\u03B8 = \u00BD arcsin(' + R + ' \u00D7 ' + g + ' / ' + v2 + '\u00B2) = ' + theta2.toFixed(1) + '\u00B0' };
            }
            return null;
          }



          // Canvas animated projectile

          const canvasRef = function (canvasEl) {

            if (!canvasEl) return;

            if (canvasEl._physInit) {

              if (!canvasEl._physAnimActive && canvasEl._drawFunc) {

                canvasEl._physAnimActive = true;

                canvasEl._physAnim = requestAnimationFrame(canvasEl._drawFunc);

              }

              return;

            }

            canvasEl._physInit = true;
            if (typeof canvasA11yDesc === 'function') canvasA11yDesc(canvasEl, 'Physics projectile simulator canvas. Cannon on left fires projectiles across a landscape with target flags at 50m, 100m, 200m, 300m. Shows trajectory trail, velocity vectors, and impact particles.');
            // Canvas Narration: tool init
            if (typeof canvasNarrate === 'function') canvasNarrate('physics', 'init', {
              first: 'Physics Simulator loaded. Cannon on the left fires projectiles. Adjust angle and velocity with sliders, then press Launch. Target flags at 50, 100, 200 and 300 meters.',
              repeat: 'Physics Simulator ready. Adjust angle and velocity, then launch.',
              terse: 'Physics Simulator ready.'
            });

            canvasEl._physAnimActive = true;

            canvasRef._lastCanvas = canvasEl;

            var cW = canvasEl.width = canvasEl.offsetWidth * 2;

            var cH = canvasEl.height = canvasEl.offsetHeight * 2;

            var ctx = canvasEl.getContext('2d');

            var dpr = 2;

            // Store animation state ON the canvas element so it persists across React re-renders

            var tick = canvasEl._tick || 0;

            var trails = canvasEl._trails || [];

            var ball = canvasEl._ball || null;

            var launched = canvasEl._launched || false;

            var impactParticles = canvasEl._impactParticles || [];

            var landingMarkers = canvasEl._landingMarkers || [];

            // Target flags

            var targets = [

              { dist: 50, color: '#22c55e', label: '50m', hit: false },

              { dist: 100, color: '#eab308', label: '100m', hit: false },

              { dist: 200, color: '#ef4444', label: '200m', hit: false },

              { dist: 300, color: '#8b5cf6', label: '300m', hit: false }

            ];

            var baseScale = (cW / dpr - 80) / 350; // px per meter (default fits 350m)

            var scale = canvasEl._dynScale || baseScale;

            // ── Coordinate helpers: convert meters to screen-space CSS pixels ──

            var launcherX = 40; // CSS-px offset from left for cannon

            var groundYCSS = cH / dpr - 40; // CSS-px y of ground line

            function mToScreenX(mX) { return launcherX + mX * scale; }

            function mToScreenY(mY) { return groundYCSS - mY * scale; } // mY: height in meters (0 = ground)

            function launch() {

              var angle = parseFloat(canvasEl.dataset.angle || '45');

              var vel = parseFloat(canvasEl.dataset.velocity || '25');

              var grav = parseFloat(canvasEl.dataset.gravity || '9.8');

              var drag = canvasEl.dataset.airResist === 'true' ? 0.002 : 0;

              var rad = angle * Math.PI / 180;

              // Pre-compute theoretical trajectory bounds (no-drag ideal)

              var theoreticalRange = (vel * vel * Math.sin(2 * rad)) / grav;

              var theoreticalMaxH = (vel * vel * Math.pow(Math.sin(rad), 2)) / (2 * grav);

              // Add 20% padding so trajectory doesn't hug edges

              var neededRangeM = theoreticalRange * 1.2;

              var neededHeightM = theoreticalMaxH * 1.2;

              // Scale needed to fit range horizontally (canvas width minus launcher offset and right padding)

              var availableW = cW / dpr - 80; // px available for range

              var availableH = cH / dpr - 80; // px available for height (ground + top margin)

              var scaleForRange = neededRangeM > 0 ? availableW / neededRangeM : baseScale;

              var scaleForHeight = neededHeightM > 0 ? availableH / neededHeightM : baseScale;

              // Use the more restrictive (smaller) scale, but never zoom in beyond baseline

              var dynScale = Math.min(baseScale, scaleForRange, scaleForHeight);

              scale = dynScale;

              canvasEl._dynScale = dynScale;

              // Ball state in METERS: mX = horizontal distance from launcher, mY = height above ground

              ball = {

                mX: 0, mY: 0,

                mVx: vel * Math.cos(rad), mVy: vel * Math.sin(rad),

                grav: grav, drag: drag, speed: vel

              };

              trails.push([]);

              launched = true;

              impactParticles = [];

              targets.forEach(function (t) { t.hit = false; });

              // Canvas Narration: launch event
              if (typeof canvasNarrate === 'function') canvasNarrate('physics', 'launch', {
                first: 'Projectile launched at ' + angle + ' degrees with a velocity of ' + vel + ' meters per second. Gravity is ' + grav + ' meters per second squared.' + (drag > 0 ? ' Air resistance is on.' : ''),
                repeat: 'Launched. Angle: ' + angle + ' degrees, velocity: ' + vel + ' meters per second.',
                terse: 'Launched: ' + angle + '°, ' + vel + ' m/s'
              }, { debounce: 500 });

            }

            canvasEl._launch = launch;
            // Target Mode hit callback (deferred to avoid state update during draw loop)
            canvasEl._onTargetLand = function(landingMX) {
              setTimeout(function() {
                if (typeof checkTargetHit === 'function') checkTargetHit(landingMX);
              }, 0);
            };

            // Simulation timestep (seconds per frame tick)

            var dt = 0.035;

            function draw() {
              if (!canvasEl.isConnected) {
                canvasEl._physAnimActive = false;
                return;
              }
              tick++;

              ctx.clearRect(0, 0, cW, cH);

              // ── Sky gradient ──

              var skyGrad = ctx.createLinearGradient(0, 0, 0, cH);

              skyGrad.addColorStop(0, '#0c1445');

              skyGrad.addColorStop(0.3, '#1e3a5f');

              skyGrad.addColorStop(0.65, '#87ceeb');

              skyGrad.addColorStop(0.85, '#a7d8de');

              skyGrad.addColorStop(1, '#228B22');

              ctx.fillStyle = skyGrad;

              ctx.fillRect(0, 0, cW, cH);

              // ── Twinkling stars ──

              if (!canvasEl._stars) {

                canvasEl._stars = [];

                for (var si = 0; si < 60; si++) {

                  canvasEl._stars.push({

                    x: Math.random() * cW, y: Math.random() * cH * 0.35,

                    r: 0.4 + Math.random() * 1.2, phase: Math.random() * Math.PI * 2

                  });

                }

              }

              canvasEl._stars.forEach(function (s) {

                var twinkle = 0.3 + 0.7 * Math.abs(Math.sin(tick * 0.02 + s.phase));

                ctx.globalAlpha = twinkle * (1 - s.y / (cH * 0.35));

                ctx.fillStyle = '#fff';

                ctx.beginPath(); ctx.arc(s.x, s.y, s.r * dpr, 0, Math.PI * 2); ctx.fill();

              });

              ctx.globalAlpha = 1;

              // ── Sun glow ──

              var sunX = cW * 0.82, sunY = cH * 0.28;

              var sunG = ctx.createRadialGradient(sunX, sunY, 6 * dpr, sunX, sunY, 60 * dpr);

              sunG.addColorStop(0, 'rgba(255,250,200,0.9)');

              sunG.addColorStop(0.3, 'rgba(255,220,100,0.4)');

              sunG.addColorStop(0.7, 'rgba(255,180,60,0.1)');

              sunG.addColorStop(1, 'rgba(255,140,0,0)');

              ctx.fillStyle = sunG;

              ctx.beginPath(); ctx.arc(sunX, sunY, 60 * dpr, 0, Math.PI * 2); ctx.fill();

              // Sun core

              ctx.fillStyle = '#fffbe6';

              ctx.beginPath(); ctx.arc(sunX, sunY, 8 * dpr, 0, Math.PI * 2); ctx.fill();

              // ── Drifting clouds ──

              var cloudDrift = tick * 0.15;

              function drawCloud(cx, cy, sz) {

                ctx.save(); ctx.globalAlpha = 0.35;

                ctx.fillStyle = '#fff';

                [[0, 0, sz], [-sz * 0.7, sz * 0.15, sz * 0.7], [sz * 0.6, sz * 0.1, sz * 0.65], [-sz * 0.3, -sz * 0.3, sz * 0.5], [sz * 0.25, -sz * 0.25, sz * 0.55]].forEach(function (b) {

                  ctx.beginPath(); ctx.arc(cx + b[0], cy + b[1], b[2], 0, Math.PI * 2); ctx.fill();

                });

                ctx.restore();

              }

              drawCloud(((cloudDrift + cW * 0.25) % (cW + 100)) - 50, cH * 0.38, 18 * dpr);

              drawCloud(((cloudDrift * 0.7 + cW * 0.6) % (cW + 120)) - 60, cH * 0.42, 14 * dpr);

              drawCloud(((cloudDrift * 0.5 + cW * 0.1) % (cW + 80)) - 40, cH * 0.33, 12 * dpr);

              // Distant mountains silhouette

              ctx.fillStyle = 'rgba(30,58,95,0.3)';

              ctx.beginPath(); ctx.moveTo(0, cH * 0.72);

              for (var mx = 0; mx <= cW; mx += 20) {

                var mh = Math.sin(mx * 0.005) * cH * 0.08 + Math.sin(mx * 0.002 + 2) * cH * 0.05;

                ctx.lineTo(mx, cH * 0.72 - mh);

              }

              ctx.lineTo(cW, cH * 0.82); ctx.lineTo(0, cH * 0.82); ctx.closePath(); ctx.fill();

              // ── Ground ──

              var groundY = cH - 40 * dpr;

              var grdGrad = ctx.createLinearGradient(0, groundY, 0, cH);

              grdGrad.addColorStop(0, '#3a8a2e');

              grdGrad.addColorStop(0.1, '#2d6a1e');

              grdGrad.addColorStop(1, '#1a4a12');

              ctx.fillStyle = grdGrad;

              ctx.fillRect(0, groundY, cW, 40 * dpr);

              // Grass edge

              ctx.fillStyle = '#4ade80';

              for (var gi = 0; gi < cW; gi += 6 * dpr) {

                var gh = 3 + Math.sin(gi * 0.1 + tick * 0.02) * 2;

                ctx.fillRect(gi, groundY - gh * dpr, 2 * dpr, gh * dpr);

              }

              // ── Grid ──

              ctx.strokeStyle = 'rgba(255,255,255,0.05)';

              ctx.lineWidth = 1;

              for (var gx = 0; gx < cW; gx += 40 * dpr) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, groundY); ctx.stroke(); }

              for (var gy = 0; gy < groundY; gy += 40 * dpr) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(cW, gy); ctx.stroke(); }

              // ── Distance markers ──

              ctx.font = 'bold ' + (6 * dpr) + 'px sans-serif';

              ctx.textAlign = 'center';

              // Dynamic max range for distance markers based on current scale

              var maxMarkerDist = Math.ceil((cW / dpr - 80) / scale / 50) * 50;

              var markerStep = maxMarkerDist > 600 ? 200 : maxMarkerDist > 300 ? 100 : 50;

              for (var dm = markerStep; dm <= maxMarkerDist; dm += markerStep) {

                var dmx = mToScreenX(dm) * dpr;

                if (dmx > cW - 20) continue;

                ctx.strokeStyle = 'rgba(255,255,255,0.15)';

                ctx.setLineDash([3, 5]);

                ctx.beginPath(); ctx.moveTo(dmx, groundY); ctx.lineTo(dmx, groundY - 12 * dpr); ctx.stroke();

                ctx.setLineDash([]);

                ctx.fillStyle = 'rgba(255,255,255,0.3)';

                ctx.fillText(dm + 'm', dmx, groundY + 12 * dpr);

              }

              // ── Target flags ──

              targets.forEach(function (tgt) {

                var tx = mToScreenX(tgt.dist) * dpr;

                if (tx > cW - 10) return;

                // Flag pole

                ctx.strokeStyle = tgt.hit ? tgt.color : 'rgba(255,255,255,0.4)';

                ctx.lineWidth = 2 * dpr;

                ctx.beginPath(); ctx.moveTo(tx, groundY); ctx.lineTo(tx, groundY - 28 * dpr); ctx.stroke();

                // Flag

                ctx.fillStyle = tgt.hit ? tgt.color : tgt.color + '60';

                ctx.beginPath();

                ctx.moveTo(tx, groundY - 28 * dpr);

                ctx.lineTo(tx + 16 * dpr, groundY - 22 * dpr);

                ctx.lineTo(tx, groundY - 16 * dpr);

                ctx.closePath(); ctx.fill();

                // Label

                ctx.font = 'bold ' + (5 * dpr) + 'px sans-serif';

                ctx.fillStyle = tgt.hit ? '#ffffff' : 'rgba(255,255,255,0.5)';

                ctx.textAlign = 'center';

                ctx.fillText(tgt.label, tx, groundY - 30 * dpr);

              });

              // ── Trails with glow & speed-based color (stored in meters, convert at draw time) ──

              trails.forEach(function (trail, idx) {

                if (trail.length < 2) return;

                var isActive = idx === trails.length - 1;

                var alpha = isActive ? 1 : 0.18;

                // Glow layer for active trail

                if (isActive) {

                  ctx.save();

                  ctx.lineWidth = 6 * dpr;

                  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

                  ctx.globalAlpha = 0.25;

                  ctx.strokeStyle = '#fbbf24';

                  ctx.beginPath(); ctx.moveTo(mToScreenX(trail[0].mX) * dpr, mToScreenY(trail[0].mY) * dpr);

                  for (var tg = 1; tg < trail.length; tg++) {

                    ctx.lineTo(mToScreenX(trail[tg].mX) * dpr, mToScreenY(trail[tg].mY) * dpr);

                  }

                  ctx.stroke(); ctx.restore();

                }

                // Main speed-colored segments

                ctx.lineWidth = (isActive ? 2.5 : 1.5) * dpr;

                ctx.lineCap = 'round';

                ctx.setLineDash(isActive ? [] : [4, 3]);

                for (var ti = 1; ti < trail.length; ti++) {

                  var p0 = trail[ti - 1], p1 = trail[ti];

                  var speed = Math.sqrt(Math.pow(p1.mVx || 0, 2) + Math.pow(p1.mVy || 0, 2));

                  var speedNorm = Math.min(1, speed / 60);

                  var r, g, b;

                  if (speedNorm > 0.5) { r = 239; g = Math.round(68 + (1 - speedNorm) * 2 * 187); b = 68; }

                  else { r = Math.round(34 + speedNorm * 2 * 205); g = Math.round(197 - speedNorm * 2 * 129); b = Math.round(94 - speedNorm * 2 * 26); }

                  ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';

                  var sx0 = mToScreenX(p0.mX) * dpr, sy0 = mToScreenY(p0.mY) * dpr;

                  var sx1 = mToScreenX(p1.mX) * dpr, sy1 = mToScreenY(p1.mY) * dpr;

                  ctx.beginPath(); ctx.moveTo(sx0, sy0); ctx.lineTo(sx1, sy1); ctx.stroke();

                }

                ctx.setLineDash([]);

                // Draw dotted apex marker for completed trails

                if (!isActive && trail.length > 2) {

                  var apexPt = trail[0];

                  trail.forEach(function (pt) { if (pt.mY > apexPt.mY) { apexPt = pt; } });

                  var apexSX = mToScreenX(apexPt.mX) * dpr;

                  var apexSY = mToScreenY(apexPt.mY) * dpr;

                  ctx.save(); ctx.globalAlpha = 0.35;

                  ctx.setLineDash([2, 4]);

                  ctx.strokeStyle = 'rgba(255,255,255,0.3)';

                  ctx.lineWidth = 1;

                  ctx.beginPath(); ctx.moveTo(apexSX, apexSY); ctx.lineTo(apexSX, groundY); ctx.stroke();

                  ctx.setLineDash([]);

                  ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = (4 * dpr) + 'px sans-serif'; ctx.textAlign = 'center';

                  ctx.fillText('apex', apexSX, apexSY - 6 * dpr);

                  ctx.restore();

                }

              });

              // ── Animate ball (physics in meters) ──

              if (ball && launched) {

                // Air resistance (applied in m/s)

                if (ball.drag > 0) {

                  var spd = Math.sqrt(ball.mVx * ball.mVx + ball.mVy * ball.mVy);

                  ball.mVx -= ball.drag * ball.mVx * spd * 50;

                  ball.mVy -= ball.drag * ball.mVy * spd * 50;

                }

                ball.mVy -= ball.grav * dt;

                ball.mX += ball.mVx * dt;

                ball.mY += ball.mVy * dt;

                ball.speed = Math.sqrt(ball.mVx * ball.mVx + ball.mVy * ball.mVy);

                if (trails.length > 0) trails[trails.length - 1].push({ mX: ball.mX, mY: ball.mY, mVx: ball.mVx, mVy: ball.mVy });

                // Convert to screen CSS-px for rendering

                var ballScreenX = mToScreenX(ball.mX);

                var ballScreenY = mToScreenY(ball.mY);

                // ── Adaptive auto-zoom: smoothly adjust scale if ball exceeds viewport ──

                var viewW = cW / dpr;

                var viewH = cH / dpr;

                var needZoom = false;

                if (ballScreenX > viewW - 20) {

                  var neededScale = (viewW - 80) / (ball.mX * 1.15);

                  if (neededScale < scale) { scale = scale * 0.92 + neededScale * 0.08; needZoom = true; }

                }

                if (ballScreenY < 20) {

                  var neededScaleH = (groundYCSS - 40) / (ball.mY * 1.15);

                  if (neededScaleH < scale) { scale = scale * 0.92 + neededScaleH * 0.08; needZoom = true; }

                }

                if (needZoom) {

                  canvasEl._dynScale = scale;

                  // Recompute screen position with updated scale

                  ballScreenX = mToScreenX(ball.mX);

                  ballScreenY = mToScreenY(ball.mY);

                }

                // ── Metallic cannonball ──

                ctx.save();

                var bx = ballScreenX * dpr, by = ballScreenY * dpr, br = 7 * dpr;

                // Outer glow

                ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 18 * dpr;

                ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2);

                var ballGrad = ctx.createRadialGradient(bx - br * 0.3, by - br * 0.3, br * 0.1, bx, by, br);

                ballGrad.addColorStop(0, '#e2e8f0');

                ballGrad.addColorStop(0.35, '#94a3b8');

                ballGrad.addColorStop(0.7, '#475569');

                ballGrad.addColorStop(1, '#1e293b');

                ctx.fillStyle = ballGrad; ctx.fill();

                ctx.shadowBlur = 0;

                // Specular highlight

                ctx.beginPath(); ctx.arc(bx - br * 0.25, by - br * 0.25, br * 0.35, 0, Math.PI * 2);

                ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fill();

                // Rim stroke

                ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2);

                ctx.strokeStyle = 'rgba(30,41,59,0.6)'; ctx.lineWidth = 1.2 * dpr; ctx.stroke();

                ctx.restore();

                // Velocity vector arrow (scaled for visual, in screen space)

                var arrowLen = Math.min(ball.speed * 0.6, 30); // cap arrow length in CSS px

                var velAngle = Math.atan2(-ball.mVy, ball.mVx);

                var arrowEndX = ballScreenX + Math.cos(velAngle) * arrowLen;

                var arrowEndY = ballScreenY + Math.sin(velAngle) * arrowLen;

                ctx.strokeStyle = '#60a5fa';

                ctx.lineWidth = 2 * dpr;

                ctx.beginPath(); ctx.moveTo(bx, by);

                ctx.lineTo(arrowEndX * dpr, arrowEndY * dpr); ctx.stroke();

                // Arrow head

                var aAngle = velAngle;

                ctx.beginPath();

                ctx.moveTo(arrowEndX * dpr, arrowEndY * dpr);

                ctx.lineTo((arrowEndX - Math.cos(aAngle - 0.4) * 6) * dpr, (arrowEndY - Math.sin(aAngle - 0.4) * 6) * dpr);

                ctx.moveTo(arrowEndX * dpr, arrowEndY * dpr);

                ctx.lineTo((arrowEndX - Math.cos(aAngle + 0.4) * 6) * dpr, (arrowEndY - Math.sin(aAngle + 0.4) * 6) * dpr);

                ctx.stroke();

                // ── Vx / Vy component vectors (dashed) ──
                if (canvasEl.dataset.showVectors === 'true') {
                  var compLen = 0.6; // same scale as main arrow
                  // Vx horizontal component (green)
                  var vxLen = Math.min(Math.abs(ball.mVx) * compLen, 30);
                  var vxEndX = ballScreenX + Math.sign(ball.mVx) * vxLen;
                  ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 1.5 * dpr;
                  ctx.setLineDash([4, 3]);
                  ctx.beginPath(); ctx.moveTo(bx, by);
                  ctx.lineTo(vxEndX * dpr, by); ctx.stroke();
                  ctx.setLineDash([]);
                  ctx.font = (4.5 * dpr) + 'px sans-serif'; ctx.fillStyle = '#22c55e'; ctx.textAlign = 'center';
                  ctx.fillText('Vx=' + Math.abs(ball.mVx).toFixed(1), (ballScreenX + vxLen/2) * dpr, by + 10 * dpr);

                  // Vy vertical component (violet)
                  var vyLen = Math.min(Math.abs(ball.mVy) * compLen, 30);
                  var vyEndY = ballScreenY + (ball.mVy > 0 ? -vyLen : vyLen);
                  ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 1.5 * dpr;
                  ctx.setLineDash([4, 3]);
                  ctx.beginPath(); ctx.moveTo(bx, by);
                  ctx.lineTo(bx, vyEndY * dpr); ctx.stroke();
                  ctx.setLineDash([]);
                  ctx.fillStyle = '#a855f7';
                  ctx.fillText('Vy=' + Math.abs(ball.mVy).toFixed(1), bx + 16 * dpr, ((ballScreenY + vyEndY * (1/dpr)) / 2) * dpr);

                  // Acceleration vector (gravity arrow, red, pointing down)
                  var gArrowLen = Math.min(ball.grav * 1.5, 25);
                  ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1.5 * dpr;
                  ctx.setLineDash([2, 3]);
                  ctx.beginPath(); ctx.moveTo(bx, by);
                  ctx.lineTo(bx, (ballScreenY + gArrowLen) * dpr); ctx.stroke();
                  ctx.setLineDash([]);
                  // arrowhead
                  ctx.beginPath();
                  ctx.moveTo(bx, (ballScreenY + gArrowLen) * dpr);
                  ctx.lineTo(bx - 3 * dpr, (ballScreenY + gArrowLen - 4) * dpr);
                  ctx.moveTo(bx, (ballScreenY + gArrowLen) * dpr);
                  ctx.lineTo(bx + 3 * dpr, (ballScreenY + gArrowLen - 4) * dpr);
                  ctx.stroke();
                  ctx.fillStyle = '#ef4444'; ctx.font = (4 * dpr) + 'px sans-serif';
                  ctx.fillText('g=' + ball.grav.toFixed(1), bx + 12 * dpr, (ballScreenY + gArrowLen) * dpr);
                }

                // Speed label on ball

                ctx.font = 'bold ' + (5 * dpr) + 'px sans-serif';

                ctx.fillStyle = '#fef3c7';

                ctx.textAlign = 'center';

                ctx.fillText(ball.speed.toFixed(0) + ' m/s', bx, (ballScreenY - 12) * dpr);

                // Check target hits

                targets.forEach(function (tgt) {

                  if (!tgt.hit && Math.abs(ball.mX - tgt.dist) < 8) tgt.hit = true;

                });

                // ── Ground collision → explosion particles ──

                if (ball.mY <= 0) {

                  // Interpolate exact ground intersection for precise hit detection
                  var prevMY = ball.mY - ball.mVy * dt + ball.grav * dt; // reconstruct prev mY
                  var frac = (prevMY > 0 && prevMY !== ball.mY) ? prevMY / (prevMY - ball.mY) : 1;
                  if (frac < 0) frac = 0; if (frac > 1) frac = 1;
                  var exactLandX = ball.mX - ball.mVx * dt * (1 - frac);
                  ball.mX = exactLandX;
                  ball.mY = 0;

                  launched = false;

                  canvasEl.dataset.lastRange = exactLandX.toFixed(1);

                  canvasEl.dataset.lastMaxH = '0';

                  var _landMaxH = 0;
                  if (trails.length > 0) {

                    _landMaxH = Math.max.apply(null, trails[trails.length - 1].map(function (p) { return p.mY; }));

                    canvasEl.dataset.lastMaxH = _landMaxH.toFixed(1);

                  }

                  // Canvas Narration: landing event
                  if (typeof canvasNarrate === 'function') canvasNarrate('physics', 'landing', {
                    first: 'Projectile landed at ' + exactLandX.toFixed(1) + ' meters. Maximum height was ' + _landMaxH.toFixed(1) + ' meters. Try changing the angle or velocity to see how the trajectory changes.',
                    repeat: 'Landed at ' + exactLandX.toFixed(1) + ' meters. Max height: ' + _landMaxH.toFixed(1) + ' meters.',
                    terse: exactLandX.toFixed(0) + ' meters, height ' + _landMaxH.toFixed(0) + ' meters'
                  }, { debounce: 500 });

                  // ── Target Mode: check hit ──
                  if (canvasEl.dataset.targetMode === 'true') {
                    // Dispatch target hit check (deferred to avoid re-render during draw)
                    if (canvasEl._onTargetLand) canvasEl._onTargetLand(exactLandX);
                  }

                  // Spawn enhanced explosion particles (in screen-px space)

                  var impactSX = mToScreenX(ball.mX);

                  var impactSY = groundYCSS;

                  for (var ep = 0; ep < 35; ep++) {

                    var epAngle = Math.random() * Math.PI;

                    var epSpeed = 1 + Math.random() * 5;

                    var pType = Math.random();

                    impactParticles.push({

                      x: impactSX, y: impactSY,

                      vx: Math.cos(epAngle) * epSpeed * (Math.random() > 0.5 ? 1 : -1),

                      vy: -Math.sin(epAngle) * epSpeed,

                      life: 0.7 + Math.random() * 0.6,

                      size: pType < 0.3 ? 0.5 + Math.random() * 1 : 1 + Math.random() * 2.5,

                      type: pType < 0.3 ? 'spark' : pType < 0.65 ? 'debris' : 'smoke'

                    });

                  }

                  // Landing marker with distance (store in meters for label)

                  landingMarkers.push({ mX: ball.mX, alpha: 1, ring: 1, dist: ball.mX.toFixed(1) });

                }

              }

              // ── Impact particles (multi-type) ──

              for (var ipi = impactParticles.length - 1; ipi >= 0; ipi--) {

                var ip = impactParticles[ipi];

                ip.x += ip.vx; ip.y += ip.vy;

                ip.vy += (ip.type === 'smoke' ? 0.02 : 0.15);

                if (ip.type === 'smoke') { ip.vy -= 0.08; ip.vx *= 0.97; }

                ip.life -= (ip.type === 'smoke' ? 0.012 : 0.02);

                if (ip.life <= 0) { impactParticles.splice(ipi, 1); continue; }

                ctx.save();

                if (ip.type === 'spark') {

                  // Bright spark with tail

                  ctx.globalAlpha = ip.life;

                  ctx.strokeStyle = 'hsla(' + Math.round(30 + ip.life * 30) + ',100%,70%,' + ip.life + ')';

                  ctx.lineWidth = ip.size * dpr;

                  ctx.lineCap = 'round';

                  ctx.beginPath();

                  ctx.moveTo((ip.x - ip.vx * 1.5) * dpr, (ip.y - ip.vy * 1.5) * dpr);

                  ctx.lineTo(ip.x * dpr, ip.y * dpr);

                  ctx.stroke();

                } else if (ip.type === 'debris') {

                  ctx.globalAlpha = ip.life;

                  ctx.beginPath(); ctx.arc(ip.x * dpr, ip.y * dpr, ip.size * dpr, 0, Math.PI * 2);

                  var debrisGrad = ctx.createRadialGradient(ip.x * dpr, ip.y * dpr, 0, ip.x * dpr, ip.y * dpr, ip.size * dpr);

                  debrisGrad.addColorStop(0, 'rgba(180,100,30,' + ip.life + ')');

                  debrisGrad.addColorStop(1, 'rgba(80,40,10,' + (ip.life * 0.5) + ')');

                  ctx.fillStyle = debrisGrad; ctx.fill();

                } else {

                  // Smoke puff

                  ctx.globalAlpha = ip.life * 0.4;

                  ctx.beginPath(); ctx.arc(ip.x * dpr, ip.y * dpr, (ip.size + (1 - ip.life) * 4) * dpr, 0, Math.PI * 2);

                  ctx.fillStyle = 'rgba(120,120,120,' + (ip.life * 0.35) + ')'; ctx.fill();

                }

                ctx.restore();

              }

              // ── Landing markers (crater + label) ──

              landingMarkers.forEach(function (lm) {

                lm.alpha *= 0.995;

                if (lm.ring > 0) lm.ring = Math.max(0, lm.ring - 0.015);

                if (lm.alpha < 0.03) return;

                var lmx = mToScreenX(lm.mX) * dpr, lmy = groundY;

                // Shockwave ring

                if (lm.ring > 0.2) {

                  ctx.save(); ctx.globalAlpha = lm.ring * 0.5;

                  ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.5 * dpr;

                  var ringR = (1 - lm.ring) * 30 * dpr;

                  ctx.beginPath(); ctx.ellipse(lmx, lmy, ringR, ringR * 0.25, 0, 0, Math.PI * 2); ctx.stroke();

                  ctx.restore();

                }

                // Crater scorch mark

                ctx.save(); ctx.globalAlpha = lm.alpha * 0.7;

                var crGrad = ctx.createRadialGradient(lmx, lmy, 0, lmx, lmy, 6 * dpr);

                crGrad.addColorStop(0, 'rgba(40,20,5,0.6)');

                crGrad.addColorStop(0.5, 'rgba(80,50,20,0.3)');

                crGrad.addColorStop(1, 'rgba(0,0,0,0)');

                ctx.fillStyle = crGrad;

                ctx.beginPath(); ctx.ellipse(lmx, lmy, 6 * dpr, 2.5 * dpr, 0, 0, Math.PI * 2); ctx.fill();

                ctx.restore();

                // Distance label

                if (lm.dist) {

                  ctx.save(); ctx.globalAlpha = Math.min(lm.alpha, 0.7);

                  ctx.font = 'bold ' + (4.5 * dpr) + 'px sans-serif';

                  ctx.fillStyle = '#fbbf24'; ctx.textAlign = 'center';

                  ctx.fillText(lm.dist + 'm', lmx, lmy + 10 * dpr);

                  ctx.restore();

                }

              });

              // ── Enhanced Launcher Cannon ──

              var angle = parseFloat(canvasEl.dataset.angle || '45');

              var rad = angle * Math.PI / 180;

              var cxC = 40, cyC = cH / dpr - 40;

              // Wheel / carriage

              ctx.save();

              ctx.strokeStyle = '#78350f'; ctx.lineWidth = 3 * dpr;

              ctx.beginPath(); ctx.arc(cxC * dpr, cyC * dpr, 10 * dpr, 0, Math.PI * 2); ctx.stroke();

              // Wheel spokes

              for (var ws = 0; ws < 6; ws++) {

                var wa = ws * Math.PI / 3 + tick * 0.005;

                ctx.strokeStyle = '#92400e'; ctx.lineWidth = 1.5 * dpr;

                ctx.beginPath();

                ctx.moveTo(cxC * dpr, cyC * dpr);

                ctx.lineTo((cxC + Math.cos(wa) * 9) * dpr, (cyC + Math.sin(wa) * 9) * dpr);

                ctx.stroke();

              }

              // Wheel hub

              ctx.fillStyle = '#475569';

              ctx.beginPath(); ctx.arc(cxC * dpr, cyC * dpr, 3 * dpr, 0, Math.PI * 2); ctx.fill();

              // Barrel with metallic gradient

              ctx.save();

              ctx.translate(cxC * dpr, cyC * dpr);

              ctx.rotate(-rad);

              var barrelLen = 38 * dpr;

              var barrelW = 5 * dpr;

              var mbGrad = ctx.createLinearGradient(0, -barrelW, 0, barrelW);

              mbGrad.addColorStop(0, '#94a3b8');

              mbGrad.addColorStop(0.3, '#cbd5e1');

              mbGrad.addColorStop(0.5, '#f1f5f9');

              mbGrad.addColorStop(0.7, '#cbd5e1');

              mbGrad.addColorStop(1, '#64748b');

              ctx.fillStyle = mbGrad;

              ctx.beginPath();

              ctx.moveTo(4 * dpr, -barrelW);

              ctx.lineTo(barrelLen, -barrelW * 0.8);

              ctx.lineTo(barrelLen, barrelW * 0.8);

              ctx.lineTo(4 * dpr, barrelW);

              ctx.closePath(); ctx.fill();

              // Muzzle ring

              ctx.strokeStyle = '#475569'; ctx.lineWidth = 2 * dpr;

              ctx.beginPath(); ctx.moveTo(barrelLen, -barrelW * 0.9); ctx.lineTo(barrelLen, barrelW * 0.9); ctx.stroke();

              // Barrel bands (decorative)

              ctx.strokeStyle = 'rgba(71,85,105,0.5)'; ctx.lineWidth = 1 * dpr;

              ctx.beginPath(); ctx.moveTo(barrelLen * 0.35, -barrelW * 0.9); ctx.lineTo(barrelLen * 0.35, barrelW * 0.9); ctx.stroke();

              ctx.beginPath(); ctx.moveTo(barrelLen * 0.65, -barrelW * 0.85); ctx.lineTo(barrelLen * 0.65, barrelW * 0.85); ctx.stroke();

              ctx.restore();

              // Cannon base / housing

              ctx.fillStyle = '#334155';

              ctx.beginPath();

              ctx.moveTo((cxC - 14) * dpr, cyC * dpr);

              ctx.quadraticCurveTo(cxC * dpr, (cyC - 16) * dpr, (cxC + 14) * dpr, cyC * dpr);

              ctx.closePath(); ctx.fill();

              ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1.5 * dpr; ctx.stroke();

              // Rivet dots

              ctx.fillStyle = '#94a3b8';

              [[-8, -3], [8, -3], [0, -10]].forEach(function (rv) {

                ctx.beginPath(); ctx.arc((cxC + rv[0]) * dpr, (cyC + rv[1]) * dpr, 1.5 * dpr, 0, Math.PI * 2); ctx.fill();

              });

              // Fuse spark

              var sparkX = (cxC - 6) * dpr, sparkY = (cyC - 14) * dpr;

              ctx.fillStyle = 'rgba(251,191,36,' + (0.5 + 0.5 * Math.sin(tick * 0.3)) + ')';

              ctx.beginPath(); ctx.arc(sparkX, sparkY, (2 + Math.sin(tick * 0.4)) * dpr, 0, Math.PI * 2); ctx.fill();

              ctx.restore();

              // Angle arc

              ctx.strokeStyle = 'rgba(251,191,36,0.4)';

              ctx.lineWidth = 1.5 * dpr;

              ctx.beginPath(); ctx.arc(cxC * dpr, cyC * dpr, 20 * dpr, -rad, 0); ctx.stroke();

              ctx.font = (5 * dpr) + 'px sans-serif';

              ctx.fillStyle = '#fbbf24';

              ctx.textAlign = 'left';

              ctx.fillText(angle + '\u00B0', (cxC + 22) * dpr, (cyC - 5) * dpr);

              // ── Glassmorphic HUD ──

              ctx.save();

              var hudX = 4 * dpr, hudY = 4 * dpr, hudW = 150 * dpr, hudH = 50 * dpr, hudR = 8 * dpr;

              ctx.fillStyle = 'rgba(15,23,42,0.7)';

              ctx.beginPath();

              ctx.moveTo(hudX + hudR, hudY); ctx.lineTo(hudX + hudW - hudR, hudY);

              ctx.arcTo(hudX + hudW, hudY, hudX + hudW, hudY + hudR, hudR);

              ctx.lineTo(hudX + hudW, hudY + hudH - hudR);

              ctx.arcTo(hudX + hudW, hudY + hudH, hudX + hudW - hudR, hudY + hudH, hudR);

              ctx.lineTo(hudX + hudR, hudY + hudH);

              ctx.arcTo(hudX, hudY + hudH, hudX, hudY + hudH - hudR, hudR);

              ctx.lineTo(hudX, hudY + hudR);

              ctx.arcTo(hudX, hudY, hudX + hudR, hudY, hudR);

              ctx.closePath(); ctx.fill();

              // Border glow

              ctx.strokeStyle = 'rgba(251,191,36,0.3)'; ctx.lineWidth = 1; ctx.stroke();

              ctx.font = 'bold ' + (7 * dpr) + 'px sans-serif';

              ctx.textAlign = 'left';

              ctx.fillStyle = '#fbbf24';

              ctx.fillText('\u26A1 ' + angle + '\u00B0  v=' + (canvasEl.dataset.velocity || '25') + 'm/s', 10 * dpr, 18 * dpr);

              ctx.fillStyle = '#94a3b8'; ctx.font = (6 * dpr) + 'px sans-serif';

              ctx.fillText('g=' + (canvasEl.dataset.gravity || '9.8') + 'm/s\u00B2', 10 * dpr, 30 * dpr);

              if (canvasEl.dataset.airResist === 'true') {

                ctx.fillStyle = '#f97316'; ctx.font = 'bold ' + (5.5 * dpr) + 'px sans-serif';

                ctx.fillText('\uD83C\uDF2C\uFE0F Drag ON', 10 * dpr, 42 * dpr);
                // Wind direction indicator arrow
                var windArrowX = 120 * dpr, windArrowY = 38 * dpr;
                ctx.strokeStyle = '#f97316'; ctx.lineWidth = 1.5 * dpr;
                ctx.beginPath(); ctx.moveTo(windArrowX, windArrowY);
                ctx.lineTo(windArrowX - 18 * dpr, windArrowY); ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(windArrowX - 18 * dpr, windArrowY);
                ctx.lineTo(windArrowX - 14 * dpr, windArrowY - 3 * dpr);
                ctx.moveTo(windArrowX - 18 * dpr, windArrowY);
                ctx.lineTo(windArrowX - 14 * dpr, windArrowY + 3 * dpr);
                ctx.stroke();

              }

              // Shot counter

              ctx.fillStyle = 'rgba(148,163,184,0.6)'; ctx.font = (5 * dpr) + 'px sans-serif'; ctx.textAlign = 'right';

              ctx.fillText('Shots: ' + trails.length, (hudX + hudW - 6 * dpr) / dpr * dpr, 42 * dpr);

              ctx.restore();

              // ── Energy bar (KE vs PE vs Drag Loss) ──
              if (ball && canvasEl.dataset.showEnergy === 'true') {
                var mass = 1; // normalized
                var KE = 0.5 * mass * ball.speed * ball.speed;
                var PE = mass * ball.grav * Math.max(0, ball.mY);
                var totalE = 0.5 * mass * (parseFloat(canvasEl.dataset.velocity || 25)) * (parseFloat(canvasEl.dataset.velocity || 25));
                var dragLoss = Math.max(0, totalE - KE - PE);
                var ebX = (cW / dpr - 160) * dpr, ebY = (cH / dpr - 65) * dpr;
                var ebW = 140 * dpr, ebH = 14 * dpr;
                // Background
                ctx.fillStyle = 'rgba(15,23,42,0.7)';
                ctx.fillRect(ebX - 4 * dpr, ebY - 14 * dpr, ebW + 8 * dpr, ebH + 28 * dpr);
                ctx.font = 'bold ' + (5 * dpr) + 'px sans-serif'; ctx.textAlign = 'left';
                ctx.fillStyle = '#94a3b8'; ctx.fillText('Energy', ebX, ebY - 4 * dpr);
                // Stacked bar
                var keW = totalE > 0 ? (KE / totalE) * ebW : 0;
                var peW = totalE > 0 ? (PE / totalE) * ebW : 0;
                var dlW = totalE > 0 ? (dragLoss / totalE) * ebW : 0;
                ctx.fillStyle = '#3b82f6'; ctx.fillRect(ebX, ebY, keW, ebH); // KE blue
                ctx.fillStyle = '#22c55e'; ctx.fillRect(ebX + keW, ebY, peW, ebH); // PE green
                ctx.fillStyle = '#ef4444'; ctx.fillRect(ebX + keW + peW, ebY, dlW, ebH); // Drag red
                // Labels
                ctx.font = (4 * dpr) + 'px sans-serif'; ctx.textAlign = 'left';
                ctx.fillStyle = '#93c5fd'; ctx.fillText('KE ' + KE.toFixed(0) + 'J', ebX, ebY + ebH + 10 * dpr);
                ctx.fillStyle = '#86efac'; ctx.fillText('PE ' + PE.toFixed(0) + 'J', ebX + 46 * dpr, ebY + ebH + 10 * dpr);
                if (dragLoss > 1) { ctx.fillStyle = '#fca5a5'; ctx.fillText('Drag ' + dragLoss.toFixed(0) + 'J', ebX + 92 * dpr, ebY + ebH + 10 * dpr); }
              }

              // ── Trail color legend (glassmorphic) ──

              ctx.save();

              var legX = (cW / dpr - 94) * dpr, legY = 4 * dpr, legW = 90 * dpr, legH = 20 * dpr;

              ctx.fillStyle = 'rgba(15,23,42,0.6)';

              ctx.beginPath();

              ctx.moveTo(legX + 6 * dpr, legY); ctx.lineTo(legX + legW - 6 * dpr, legY);

              ctx.arcTo(legX + legW, legY, legX + legW, legY + 6 * dpr, 6 * dpr);

              ctx.lineTo(legX + legW, legY + legH - 6 * dpr);

              ctx.arcTo(legX + legW, legY + legH, legX + legW - 6 * dpr, legY + legH, 6 * dpr);

              ctx.lineTo(legX + 6 * dpr, legY + legH);

              ctx.arcTo(legX, legY + legH, legX, legY + legH - 6 * dpr, 6 * dpr);

              ctx.lineTo(legX, legY + 6 * dpr);

              ctx.arcTo(legX, legY, legX + 6 * dpr, legY, 6 * dpr);

              ctx.closePath(); ctx.fill();

              ctx.font = (5 * dpr) + 'px sans-serif';

              ctx.fillStyle = '#22c55e'; ctx.textAlign = 'left'; ctx.fillText('SLOW', legX + 4 * dpr, legY + 14 * dpr);

              var lgw = 36 * dpr;

              var lgx = legX + 28 * dpr;

              var lg = ctx.createLinearGradient(lgx, 0, lgx + lgw, 0);

              lg.addColorStop(0, '#22c55e'); lg.addColorStop(0.5, '#eab308'); lg.addColorStop(1, '#ef4444');

              ctx.fillStyle = lg;

              ctx.fillRect(lgx, legY + 9 * dpr, lgw, 4 * dpr);

              ctx.fillStyle = '#ef4444'; ctx.textAlign = 'right'; ctx.fillText('FAST', legX + legW - 4 * dpr, legY + 14 * dpr);

              ctx.restore();


              // ── Target Mode: Draw destructible crates ──
              if (canvasEl.dataset.targetMode === 'true') {
                var tgtDataStr = canvasEl.dataset.targetList;
                if (tgtDataStr) {
                  try {
                    var tgtData = JSON.parse(tgtDataStr);
                    tgtData.forEach(function(tgt) {
                      var tx = mToScreenX(tgt.x) * dpr;
                      var ty = mToScreenY(tgt.y || 0) * dpr;
                      if (tgt.destroyed) {
                        // Destroyed crate: faded wreckage
                        ctx.save(); ctx.globalAlpha = 0.25;
                        ctx.fillStyle = '#92400e';
                        ctx.fillRect(tx - 8 * dpr, ty - 12 * dpr, 16 * dpr, 12 * dpr);
                        ctx.restore();
                      } else {
                        // Wooden crate body
                        var crW = 16 * dpr, crH = 14 * dpr;
                        ctx.fillStyle = '#b45309';
                        ctx.fillRect(tx - crW/2, ty - crH, crW, crH);
                        // Wood grain
                        ctx.strokeStyle = '#92400e'; ctx.lineWidth = 1 * dpr;
                        ctx.beginPath(); ctx.moveTo(tx - crW/2, ty - crH * 0.5); ctx.lineTo(tx + crW/2, ty - crH * 0.5); ctx.stroke();
                        ctx.beginPath(); ctx.moveTo(tx, ty - crH); ctx.lineTo(tx, ty); ctx.stroke();
                        // Bullseye
                        ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1.5 * dpr;
                        ctx.beginPath(); ctx.arc(tx, ty - crH/2, 5 * dpr, 0, Math.PI * 2); ctx.stroke();
                        ctx.beginPath(); ctx.arc(tx, ty - crH/2, 2.5 * dpr, 0, Math.PI * 2); ctx.stroke();
                        ctx.fillStyle = '#ef4444';
                        ctx.beginPath(); ctx.arc(tx, ty - crH/2, 1 * dpr, 0, Math.PI * 2); ctx.fill();
                        // Distance label
                        ctx.font = 'bold ' + (5 * dpr) + 'px sans-serif';
                        ctx.fillStyle = '#fbbf24'; ctx.textAlign = 'center';
                        ctx.fillText(tgt.x + 'm', tx, ty - crH - 4 * dpr);
                        // Hit zone indicator (faint circle)
                        ctx.save();
                        ctx.globalAlpha = 0.12;
                        ctx.fillStyle = '#22c55e';
                        var zoneW = (tgt.radius || 10) * scale * dpr;
                        ctx.beginPath(); ctx.ellipse(tx, ty, zoneW, 3 * dpr, 0, 0, Math.PI * 2); ctx.fill();
                        ctx.restore();
                      }
                    });
                  } catch(e) {}
                }

                // Constraint badge near cannon
                var conStr = canvasEl.dataset.constraintType;
                var conVal = canvasEl.dataset.constraintValue;
                if (conStr) {
                  ctx.save();
                  var bx = 10 * dpr, by2 = 54 * dpr;
                  ctx.fillStyle = 'rgba(239,68,68,0.85)';
                  ctx.beginPath();
                  var bw = 110 * dpr, bh = 16 * dpr, br2 = 4 * dpr;
                  ctx.moveTo(bx + br2, by2); ctx.lineTo(bx + bw - br2, by2);
                  ctx.arcTo(bx + bw, by2, bx + bw, by2 + br2, br2);
                  ctx.lineTo(bx + bw, by2 + bh - br2);
                  ctx.arcTo(bx + bw, by2 + bh, bx + bw - br2, by2 + bh, br2);
                  ctx.lineTo(bx + br2, by2 + bh);
                  ctx.arcTo(bx, by2 + bh, bx, by2 + bh - br2, br2);
                  ctx.lineTo(bx, by2 + br2);
                  ctx.arcTo(bx, by2, bx + br2, by2, br2);
                  ctx.closePath(); ctx.fill();
                  ctx.font = 'bold ' + (5.5 * dpr) + 'px sans-serif';
                  ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left';
                  var lockLabel = conStr === 'fixedAngle' ? '\u{1F512} \u03B8 = ' + conVal + '\u00B0' : '\u{1F512} v = ' + conVal + ' m/s';
                  ctx.fillText(lockLabel, bx + 4 * dpr, by2 + 12 * dpr);
                  ctx.restore();
                }
              }

              // Sync state back to canvas element for persistence

              canvasEl._tick = tick; canvasEl._trails = trails; canvasEl._ball = ball;

              canvasEl._launched = launched; canvasEl._impactParticles = impactParticles; canvasEl._landingMarkers = landingMarkers;

              canvasEl._physAnim = requestAnimationFrame(draw);

            }

            canvasEl._drawFunc = draw;

            canvasEl._physAnim = requestAnimationFrame(draw);

          };

          var PRESETS = [

            { label: '\uD83C\uDF0D Earth', gravity: 9.8 },

            { label: '\uD83C\uDF11 Moon', gravity: 1.6 },

            { label: '\u2642\uFE0F Mars', gravity: 3.7 },

            { label: '\u2643 Jupiter', gravity: 24.8 },

          ];

          var CHALLENGES = [

            { target: 50, label: '\uD83C\uDFAF Land at 50m', tolerance: 8 },

            { target: 100, label: '\uD83C\uDFAF Hit the 100m flag', tolerance: 10 },

            { target: 200, label: '\uD83C\uDFAF Reach 200m range', tolerance: 12 },

          ];

          return React.createElement("div", { className: "max-w-5xl mx-auto animate-in fade-in duration-200", style: { position: 'relative' } },


            React.createElement("div", { className: "flex items-center gap-3 mb-3" },

              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg", 'aria-label': 'Back to tools' }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),

              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\u26A1 Physics Simulator"),

              React.createElement("span", { className: "px-2 py-0.5 bg-sky-100 text-sky-700 text-[10px] font-bold rounded-full" }, "ANIMATED")

            ),

            React.createElement("div", { className: "relative rounded-xl overflow-hidden border-2 border-sky-300 shadow-lg mb-3", style: { height: "420px" } },

              React.createElement("canvas", {

                ref: canvasRef,

                id: "physicsCanvas",

                tabIndex: 0,

                role: "application",

                "aria-label": "Physics projectile simulator — use arrow keys to adjust angle and velocity, Space to launch",

                "data-angle": d.angle, "data-velocity": d.velocity, "data-gravity": d.gravity,

                "data-air-resist": d.airResist ? 'true' : 'false',
                "data-show-vectors": d.showVectors ? 'true' : 'false',
                "data-show-energy": d.showEnergy ? 'true' : 'false',
                "data-target-mode": d.targetMode ? 'true' : 'false',
                "data-target-list": d.targetList ? JSON.stringify(d.targetList) : '',
                "data-constraint-type": d.targetConstraint ? d.targetConstraint.type : '',
                "data-constraint-value": d.targetConstraint ? String(d.targetConstraint.value) : '',

                onKeyDown: function (e) {

                  if (e.key === 'ArrowUp') { e.preventDefault(); upd('angle', Math.min(90, (d.angle || 45) + 5)); }

                  else if (e.key === 'ArrowDown') { e.preventDefault(); upd('angle', Math.max(0, (d.angle || 45) - 5)); }

                  else if (e.key === 'ArrowRight') { e.preventDefault(); upd('velocity', Math.min(100, (d.velocity || 50) + 5)); }

                  else if (e.key === 'ArrowLeft') { e.preventDefault(); upd('velocity', Math.max(5, (d.velocity || 50) - 5)); }

                  else if (e.key === ' ') {

                    e.preventDefault();

                    var cv = document.getElementById('physicsCanvas');

                    if (cv && cv._launch) cv._launch();

                  }

                },

                style: { width: "100%", height: "100%", display: "block", outline: "none" }

              })

            ),

            React.createElement("div", { className: "flex flex-wrap gap-1.5 mb-2" },

              React.createElement("button", { "aria-label": "Launch!",

                onClick: function () {

                  var cv = document.getElementById('physicsCanvas');

                  if (cv && cv._launch) cv._launch();

                }, className: "px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl text-sm hover:from-amber-600 hover:to-orange-600 shadow-md transition-all"

              }, "\uD83D\uDE80 Launch!"),

              React.createElement("button", { "aria-label": "Air Drag",

                onClick: function () { upd('airResist', !d.airResist); },

                className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.airResist ? 'bg-orange-700 text-white shadow-md' : 'bg-orange-50 text-orange-700 border border-orange-200')

              }, "\uD83C\uDF2C\uFE0F Air Drag " + (d.airResist ? 'ON' : 'OFF')),

              React.createElement("button", { "aria-label": "Vectors",
                onClick: function () { upd('showVectors', !d.showVectors); },
                className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.showVectors ? 'bg-purple-700 text-white shadow-md' : 'bg-purple-50 text-purple-700 border border-purple-200')
              }, "\u2197\uFE0F Vectors " + (d.showVectors ? 'ON' : 'OFF')),

              React.createElement("button", { "aria-label": "Learn",
                onClick: function () { upd('showEnergy', !d.showEnergy); },
                className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.showEnergy ? 'bg-blue-700 text-white shadow-md' : 'bg-blue-50 text-blue-700 border border-blue-200')
              }, "\u26A1 Energy " + (d.showEnergy ? 'ON' : 'OFF')),

              React.createElement("button", { "aria-label": "Learn",
                onClick: function () { upd('showLearn', !d.showLearn); },
                className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.showLearn ? 'bg-emerald-700 text-white shadow-md' : 'bg-emerald-50 text-emerald-700 border border-emerald-200')
              }, "\uD83D\uDCD6 Learn"),

              React.createElement("button", { "aria-label": "Data",
                onClick: function () { upd('showFlightData', !d.showFlightData); },
                className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.showFlightData ? 'bg-cyan-700 text-white shadow-md' : 'bg-cyan-50 text-cyan-700 border border-cyan-200')
              }, "\uD83D\uDCCA Data " + (d.showFlightData ? 'ON' : 'OFF')),

              PRESETS.map(function (p) {

                return React.createElement("button", { "aria-label": "Change gravity",

                  key: p.label, onClick: function () { upd('gravity', p.gravity); },

                  className: "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.gravity === p.gravity ? 'bg-sky-600 text-white' : 'bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100')

                }, p.label);

              })

            ),

            React.createElement("div", { className: "grid grid-cols-3 gap-3 mb-3" },

              [{ k: 'angle', label: 'Angle (\u00B0)', min: 5, max: 85, step: 1 }, { k: 'velocity', label: 'Velocity (m/s)', min: 5, max: 50, step: 1 }, { k: 'gravity', label: 'Gravity (m/s\u00B2)', min: 1, max: 25, step: 0.1 }].map(function (s) {
                var isLocked = d.targetMode && d.targetConstraint && (
                  (d.targetConstraint.type === 'fixedAngle' && s.k === 'angle') ||
                  (d.targetConstraint.type === 'fixedVelocity' && s.k === 'velocity')
                );
                return React.createElement("div", { key: s.k, className: "text-center rounded-lg p-2 border " + (isLocked ? 'bg-red-50 border-red-300' : 'bg-slate-50') },

                  React.createElement("label", { className: "text-[10px] font-bold block " + (isLocked ? 'text-red-500' : 'text-slate-500') }, isLocked ? '\u{1F512} ' + s.label : s.label),

                  React.createElement("span", { className: "text-sm font-bold block " + (isLocked ? 'text-red-700' : 'text-slate-700') }, d[s.k]),

                  React.createElement("input", { type: "range", min: s.min, max: s.max, step: s.step, value: d[s.k], disabled: isLocked, onChange: function (e) {
                    if (!isLocked) {
                      var newVal = parseFloat(e.target.value);
                      upd(s.k, newVal);
                      // Canvas Narration: parameter change (high debounce to avoid spam during drag)
                      if (typeof canvasNarrate === 'function') canvasNarrate('physics', 'param_' + s.k, s.label.split(' ')[0] + ': ' + newVal, { debounce: 800 });
                    }
                  }, className: "w-full " + (isLocked ? 'accent-red-400 opacity-50 cursor-not-allowed' : 'accent-sky-600') })

                );

              })

            ),

            // ── XP & Stats Bar ──
            React.createElement("div", { className: "flex items-center gap-3 mb-2 px-1" },
              React.createElement("span", { className: "text-[10px] font-bold text-slate-500" }, "\uD83D\uDE80 Launches: " + (d.launchCount || 0)),
              React.createElement("span", { className: "text-[10px] font-bold text-amber-500" }, "\uD83C\uDFAF Targets: " + (d.targetsHit || 0)),
              d.quizStreak > 0 && React.createElement("span", { className: "text-[10px] font-bold text-orange-500" }, "\uD83D\uDD25 Streak: " + d.quizStreak)
            ),

            // ── Learn Panel (Newton's Laws & Projectile Motion) ──
            d.showLearn && React.createElement("div", { className: "bg-emerald-50 rounded-xl border border-emerald-200 p-4 mb-3 animate-in fade-in duration-200" },
              React.createElement("h4", { className: "text-sm font-bold text-emerald-800 mb-2" }, "\uD83D\uDCD6 Physics Concepts"),
              React.createElement("div", { className: "grid grid-cols-1 gap-2 text-xs text-emerald-900" },
                React.createElement("div", { className: "bg-white rounded-lg p-2 border border-emerald-100" },
                  React.createElement("span", { className: "font-bold text-blue-600" }, "\uD83D\uDE80 Projectile Motion: "),
                  "An object launched into the air follows a parabolic path. Horizontal velocity (Vx) stays constant while vertical velocity (Vy) changes due to gravity. Enable Vectors to see!"
                ),
                React.createElement("div", { className: "bg-white rounded-lg p-2 border border-emerald-100" },
                  React.createElement("span", { className: "font-bold text-red-600" }, "\uD83C\uDF0D Newton's 2nd Law: "),
                  "F = ma. The only force on a projectile (ignoring drag) is gravity: a = g downward. This creates the curved trajectory."
                ),
                React.createElement("div", { className: "bg-white rounded-lg p-2 border border-emerald-100" },
                  React.createElement("span", { className: "font-bold text-amber-600" }, "\uD83C\uDFAF Optimal Angle: "),
                  "Without air resistance, 45\u00B0 gives maximum range. With drag, the optimal angle shifts lower (~38-42\u00B0). Try it!"
                ),
                React.createElement("div", { className: "bg-white rounded-lg p-2 border border-emerald-100" },
                  React.createElement("span", { className: "font-bold text-purple-600" }, "\u26A1 Energy Conservation: "),
                  "Kinetic Energy (KE = \u00BDmv\u00B2) converts to Potential Energy (PE = mgh) and back. Enable the Energy bar to watch this live!"
                ),
                React.createElement("div", { className: "bg-white rounded-lg p-2 border border-emerald-100" },
                  React.createElement("span", { className: "font-bold text-orange-600" }, "\uD83C\uDF2C\uFE0F Air Resistance: "),
                  "Drag force opposes motion and increases with speed (F_drag \u221D v\u00B2). It shortens range, lowers max height, and makes the trajectory asymmetric."
                ),
                React.createElement("div", { className: "bg-white rounded-lg p-2 border border-emerald-100" },
                  React.createElement("span", { className: "font-bold text-sky-600" }, "\uD83C\uDF11 Gravity Varies: "),
                  "Different planets have different gravitational pull. Moon (1.6 m/s\u00B2) lets projectiles fly 6x farther than Earth (9.8 m/s\u00B2)! Try Jupiter for a challenge."
                )
              )
            ),

            // ── Real-Time Flight Data Table ──
            d.showFlightData && React.createElement("div", { className: "bg-cyan-50 rounded-xl border border-cyan-200 p-3 mb-3 overflow-x-auto animate-in fade-in duration-200" },
              React.createElement("p", { className: "text-[10px] font-bold text-cyan-700 uppercase tracking-wider mb-2" }, "\uD83D\uDCCA Flight Data"),
              (function() {
                var cv = typeof document !== 'undefined' ? document.getElementById('physicsCanvas') : null;
                var trails = cv && cv._trails ? cv._trails : [];
                var lastTrail = trails.length > 0 ? trails[trails.length - 1] : [];
                if (lastTrail.length === 0) return React.createElement("p", { className: "text-xs text-cyan-400 italic" }, "Launch a projectile to see flight data");
                // Sample ~10 evenly spaced points
                var step = Math.max(1, Math.floor(lastTrail.length / 10));
                var rows = [];
                for (var ri = 0; ri < lastTrail.length; ri += step) {
                  var pt = lastTrail[ri];
                  var t_sec = ri * 0.035;
                  rows.push(React.createElement("tr", { key: ri, className: "border-b border-cyan-100 hover:bg-cyan-100 transition-colors" },
                    React.createElement("td", { className: "px-2 py-0.5 font-mono text-cyan-800" }, t_sec.toFixed(2)),
                    React.createElement("td", { className: "px-2 py-0.5 font-mono text-slate-700" }, pt.mX.toFixed(1)),
                    React.createElement("td", { className: "px-2 py-0.5 font-mono text-slate-700" }, pt.mY.toFixed(1)),
                    React.createElement("td", { className: "px-2 py-0.5 font-mono text-green-700" }, (pt.mVx || 0).toFixed(1)),
                    React.createElement("td", { className: "px-2 py-0.5 font-mono text-purple-700" }, (pt.mVy || 0).toFixed(1)),
                    React.createElement("td", { className: "px-2 py-0.5 font-mono text-blue-700" }, Math.sqrt((pt.mVx||0)*(pt.mVx||0) + (pt.mVy||0)*(pt.mVy||0)).toFixed(1))
                  ));
                }
                return React.createElement("table", { className: "w-full text-xs" },
                  React.createElement("caption", { className: "sr-only" }, "physics data table"), React.createElement("thead", null,
                    React.createElement("tr", { className: "border-b-2 border-cyan-300" },
                      React.createElement("th", { scope: "col", className: "px-2 py-1 text-left font-bold text-cyan-800" }, "t (s)"),
                      React.createElement("th", { scope: "col", className: "px-2 py-1 text-left font-bold text-slate-600" }, "x (m)"),
                      React.createElement("th", { scope: "col", className: "px-2 py-1 text-left font-bold text-slate-600" }, "y (m)"),
                      React.createElement("th", { scope: "col", className: "px-2 py-1 text-left font-bold text-green-700" }, "Vx"),
                      React.createElement("th", { scope: "col", className: "px-2 py-1 text-left font-bold text-purple-700" }, "Vy"),
                      React.createElement("th", { scope: "col", className: "px-2 py-1 text-left font-bold text-blue-700" }, "|v|")
                    )
                  ),
                  React.createElement("tbody", null, rows)
                );
              })()
            ),


            // ═══ TARGET DESTRUCTION MODE UI ═══
            React.createElement("div", { className: "bg-gradient-to-r from-red-50 to-amber-50 rounded-xl border border-red-200 p-3 mb-3" },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("p", { className: "text-[10px] font-bold text-red-700 uppercase tracking-wider" }, "\u{1F3AF} Target Destruction Mode"),
                !d.targetMode
                  ? React.createElement("button", { "aria-label": "Start Mission",
                      onClick: function() { upd('targetMode', true); startTargetRound(1); },
                      className: "px-3 py-1 bg-red-600 text-white text-[10px] font-bold rounded-lg hover:bg-red-700 transition-all"
                    }, "\u25B6 Start Mission")
                  : React.createElement("div", { className: "flex gap-1.5" },
                      React.createElement("button", { "aria-label": "Next Round",
                        onClick: function() {
                          var allDone = d.targetList && d.targetList.every(function(t){return t.destroyed;});
                          if (allDone && d.targetRound < TARGET_LEVELS.length) {
                            startTargetRound(d.targetRound + 1);
                          }
                        },
                        disabled: !(d.targetList && d.targetList.every(function(t){return t.destroyed;})),
                        className: "px-3 py-1 text-[10px] font-bold rounded-lg transition-all " +
                          (d.targetList && d.targetList.every(function(t){return t.destroyed;}) ? 'bg-emerald-700 text-white hover:bg-emerald-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed')
                      }, "\u27A1 Next Round"),
                      React.createElement("button", { "aria-label": "Retry",
                        onClick: function() { startTargetRound(d.targetRound || 1); },
                        className: "px-3 py-1 bg-amber-700 text-white text-[10px] font-bold rounded-lg hover:bg-amber-600 transition-all"
                      }, "\u{1F504} Retry"),
                      React.createElement("button", { "aria-label": "End",
                        onClick: function() { upd('targetMode', false); upd('targetList', null); upd('targetConstraint', null); upd('targetFeedback', null); upd('targetShowScaffold', false); },
                        className: "px-3 py-1 bg-slate-600 text-white text-[10px] font-bold rounded-lg hover:bg-slate-500 transition-all"
                      }, "\u2716 End")
                    )
              ),

              // Active round info
              d.targetMode && React.createElement("div", { className: "space-y-2" },
                // Round header
                React.createElement("div", { className: "bg-white rounded-lg p-2 border border-red-100" },
                  React.createElement("div", { className: "flex items-center justify-between" },
                    React.createElement("span", { className: "text-xs font-bold text-red-800" },
                      "Round " + (d.targetRound || 1) + "/" + TARGET_LEVELS.length + " — " +
                      (TARGET_LEVELS[Math.min((d.targetRound || 1) - 1, TARGET_LEVELS.length - 1)] || {}).label
                    ),
                    React.createElement("span", { className: "text-[10px] font-bold text-amber-500" }, "Score: " + (d.targetScore || 0) + " XP")
                  ),
                  React.createElement("p", { className: "text-[10px] text-slate-600 mt-1" },
                    (TARGET_LEVELS[Math.min((d.targetRound || 1) - 1, TARGET_LEVELS.length - 1)] || {}).desc
                  )
                ),

                // Constraint indicator
                d.targetConstraint && React.createElement("div", { className: "flex items-center gap-2 bg-red-100 rounded-lg px-3 py-1.5" },
                  React.createElement("span", { className: "text-xs font-bold text-red-700" },
                    d.targetConstraint.type === 'fixedAngle'
                      ? "\u{1F512} Angle LOCKED at " + d.targetConstraint.value + "\u00B0 \u2014 adjust velocity or gravity to hit the target"
                      : "\u{1F512} Velocity LOCKED at " + d.targetConstraint.value + " m/s \u2014 adjust angle or gravity to hit the target"
                  )
                ),

                // Target status chips
                d.targetList && React.createElement("div", { className: "flex gap-1.5 flex-wrap" },
                  d.targetList.map(function(tgt, i) {
                    return React.createElement("span", {
                      key: i,
                      className: "px-2 py-0.5 rounded-full text-[10px] font-bold " +
                        (tgt.destroyed ? 'bg-emerald-100 text-emerald-700 line-through' : 'bg-amber-100 text-amber-700')
                    }, (tgt.destroyed ? "\u2705 " : "\u{1F4E6} ") + tgt.x + "m");
                  })
                ),

                // Feedback
                d.targetFeedback && React.createElement("div", {
                  className: "px-3 py-2 rounded-lg text-xs font-bold " + (
                    d.targetFeedback.type === 'success' ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' :
                    d.targetFeedback.type === 'partial' ? 'bg-blue-100 text-blue-700 border border-blue-300' :
                    'bg-red-100 text-red-700 border border-red-300'
                  )
                }, d.targetFeedback.msg),

                // Calculation Scaffold (appears after 2 misses)
                d.targetShowScaffold && React.createElement("div", { className: "bg-amber-50 rounded-lg border border-amber-200 p-3 animate-in fade-in duration-300" },
                  React.createElement("p", { className: "text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1" }, "\u{1F4DD} Calculation Helper"),
                  (function() {
                    var ans = getTargetAnswer();
                    if (!ans) return React.createElement("p", { className: "text-xs text-slate-500" }, "No active target");
                    return React.createElement("div", { className: "space-y-1" },
                      React.createElement("p", { className: "text-xs text-slate-600" }, "Equation: ", React.createElement("b", { className: "font-mono text-blue-700" }, ans.equation)),
                      React.createElement("p", { className: "text-xs text-slate-600" }, "Substitution: ", React.createElement("span", { className: "font-mono text-emerald-700" }, ans.steps)),
                      React.createElement("p", { className: "text-[10px] text-amber-500 italic mt-1" }, "\u{1F4A1} Try setting " + ans.param + " to approximately " + (ans.value ? ans.value.toFixed(1) : '?'))
                    );
                  })()
                ),

                // Attempt counter
                React.createElement("p", { className: "text-[10px] text-slate-500 text-right" }, "Attempts: " + (d.targetAttempts || 0))
              )
            ),

            // ── Multi-Tier Challenges ──
            React.createElement("div", { className: "bg-gradient-to-r from-violet-50 to-pink-50 rounded-xl border border-violet-200 p-3 mb-3" },
              React.createElement("p", { className: "text-[10px] font-bold text-violet-700 uppercase tracking-wider mb-2" }, "\uD83C\uDFC6 Challenges"),
              React.createElement("div", { className: "grid grid-cols-3 gap-2" },
                [
                  { tier: 1, label: '\uD83E\uDD47 Tier 1', desc: 'Hit the 50m flag', target: 50, tol: 10, reward: 10, req: '' },
                  { tier: 2, label: '\uD83E\uDD48 Tier 2', desc: 'Hit 100m with Air Drag ON', target: 100, tol: 12, reward: 20, req: 'airResist' },
                  { tier: 3, label: '\uD83E\uDD49 Tier 3', desc: 'Hit 200m on Mars', target: 200, tol: 15, reward: 35, req: 'mars' }
                ].map(function(ch) {
                  var active = d.challengeTier === ch.tier;
                  var completed = d['challenge' + ch.tier + 'Done'];
                  return React.createElement("button", { "aria-label": "Change challenge tier",
                    key: ch.tier,
                    onClick: function() {
                      upd('challengeTier', ch.tier);
                      upd('challengeActive', true);
                      if (ch.req === 'airResist') upd('airResist', true);
                      if (ch.req === 'mars') upd('gravity', 3.7);
                      addToast('\uD83C\uDFC6 ' + ch.desc + ' — fire away!', 'info');
                    },
                    className: "p-2 rounded-lg text-center transition-all border-2 " +
                      (completed ? 'bg-emerald-100 border-emerald-400' : active ? 'bg-violet-100 border-violet-400 shadow-md' : 'bg-white border-slate-200 hover:border-violet-300')
                  },
                    React.createElement("p", { className: "text-xs font-bold " + (completed ? 'text-emerald-700' : 'text-violet-700') }, completed ? '\u2705 ' + ch.label : ch.label),
                    React.createElement("p", { className: "text-[10px] text-slate-500 mt-1" }, ch.desc),
                    React.createElement("p", { className: "text-[11px] font-bold text-amber-500 mt-1" }, '+' + ch.reward + ' XP')
                  );
                })
              )
            ),

            // ── Kinematic Equations ──

            React.createElement("div", { className: "bg-gradient-to-r from-sky-50 to-indigo-50 rounded-xl border border-sky-200 p-3 mb-3" },

              React.createElement("p", { className: "text-[10px] font-bold text-sky-600 uppercase tracking-wider mb-2" }, "\uD83D\uDCDD Kinematic Equations"),

              React.createElement("div", { className: "grid grid-cols-2 gap-2" },

                React.createElement("div", { className: "bg-white rounded-lg p-2 border text-center" },

                  React.createElement("p", { className: "text-[10px] text-sky-400 font-bold" }, "Range"),

                  React.createElement("p", { className: "text-xs font-mono font-bold text-sky-800" }, "R = v\u00B2sin(2\u03B8)/g")

                ),

                React.createElement("div", { className: "bg-white rounded-lg p-2 border text-center" },

                  React.createElement("p", { className: "text-[10px] text-sky-400 font-bold" }, "Max Height"),

                  React.createElement("p", { className: "text-xs font-mono font-bold text-sky-800" }, "H = v\u00B2sin\u00B2(\u03B8)/2g")

                ),

                React.createElement("div", { className: "bg-white rounded-lg p-2 border text-center" },

                  React.createElement("p", { className: "text-[10px] text-sky-400 font-bold" }, "Flight Time"),

                  React.createElement("p", { className: "text-xs font-mono font-bold text-sky-800" }, "T = 2v\u00B7sin(\u03B8)/g")

                ),

                React.createElement("div", { className: "bg-white rounded-lg p-2 border text-center" },

                  React.createElement("p", { className: "text-[10px] text-sky-400 font-bold" }, "Position"),

                  React.createElement("p", { className: "text-xs font-mono font-bold text-sky-800" }, "y = v\u2080t - \u00BDgt\u00B2")

                )

              ),

              d.airResist && React.createElement("p", { className: "mt-2 text-[10px] text-orange-500 italic" }, "\u26A0\uFE0F Air drag modifies these equations — real range will be shorter than the idealized calculation below.")

            ),

            React.createElement("div", { className: "grid grid-cols-3 gap-2 mb-3 text-center" },

              React.createElement("div", { className: "p-2 bg-sky-50 rounded-lg border border-sky-200" },

                React.createElement("p", { className: "text-[11px] font-bold text-sky-600 uppercase" }, "Range"),

                React.createElement("p", { className: "text-sm font-bold text-sky-800" }, (function () { var r = d.angle * Math.PI / 180; return ((d.velocity * d.velocity * Math.sin(2 * r)) / d.gravity).toFixed(1); })() + " m")

              ),

              React.createElement("div", { className: "p-2 bg-sky-50 rounded-lg border border-sky-200" },

                React.createElement("p", { className: "text-[11px] font-bold text-sky-600 uppercase" }, "Max Height"),

                React.createElement("p", { className: "text-sm font-bold text-sky-800" }, (function () { var vy = d.velocity * Math.sin(d.angle * Math.PI / 180); return (vy * vy / (2 * d.gravity)).toFixed(1); })() + " m")

              ),

              React.createElement("div", { className: "p-2 bg-sky-50 rounded-lg border border-sky-200" },

                React.createElement("p", { className: "text-[11px] font-bold text-sky-600 uppercase" }, "Flight Time"),

                React.createElement("p", { className: "text-sm font-bold text-sky-800" }, (function () { var vy = d.velocity * Math.sin(d.angle * Math.PI / 180); return (2 * vy / d.gravity).toFixed(2); })() + " s")

              )

            ),

            // ── Predict the Landing Quiz ──

            React.createElement("div", { className: "mt-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-3" },

              React.createElement("div", { className: "flex items-center justify-between mb-2" },

                React.createElement("p", { className: "text-[10px] font-bold text-amber-700 uppercase tracking-wider" }, "\uD83C\uDFAF Predict the Landing"),

                React.createElement("button", { "aria-label": "Generate landing prediction quiz",

                  onClick: function () {

                    var qAngles = [20, 30, 35, 40, 45, 50, 55, 60, 70];

                    var qVels = [15, 20, 25, 30, 35, 40];

                    var qGravs = [9.8, 1.6, 3.7, 24.8];

                    var qa = qAngles[Math.floor(Math.random() * qAngles.length)];

                    var qv = qVels[Math.floor(Math.random() * qVels.length)];

                    var qg = qGravs[Math.floor(Math.random() * qGravs.length)];

                    var qrad = qa * Math.PI / 180;

                    var qRange = (qv * qv * Math.sin(2 * qrad)) / qg;

                    var opts = [qRange];

                    while (opts.length < 4) {

                      var fake = qRange * (0.3 + Math.random() * 1.8);

                      if (Math.abs(fake - qRange) > qRange * 0.15) opts.push(fake);

                    }

                    opts.sort(function () { return Math.random() - 0.5; });

                    upd('quizActive', true); upd('quizAngle', qa); upd('quizVel', qv); upd('quizGrav', qg);

                    upd('quizAnswer', qRange); upd('quizOptions', opts); upd('quizPicked', null); upd('quizFeedback', null);

                  }, className: "px-3 py-1 bg-amber-700 text-white text-[10px] font-bold rounded-lg hover:bg-amber-700 transition-all"

                }, d.quizActive ? "\uD83D\uDD04 New Question" : "\u25B6 Start Quiz")

              ),

              d.quizActive && React.createElement("div", { className: "space-y-2" },

                React.createElement("p", { className: "text-xs text-slate-600" }, "A projectile is launched at ", React.createElement("b", null, d.quizAngle + "\u00B0"), " with velocity ", React.createElement("b", null, d.quizVel + " m/s"), " and gravity ", React.createElement("b", null, d.quizGrav + " m/s\u00B2"), ". How far does it land?"),

                React.createElement("div", { className: "grid grid-cols-2 gap-2" },

                  (d.quizOptions || []).map(function (opt, oi) {

                    var picked = d.quizPicked === oi;

                    var correct = d.quizPicked !== null && Math.abs(opt - d.quizAnswer) < 0.5;

                    var wrong = picked && !correct;

                    return React.createElement("button", { "aria-label": "Change quiz picked",

                      key: oi, disabled: d.quizPicked !== null,

                      onClick: function () {

                        upd('quizPicked', oi);

                        var isCorrect = Math.abs(opt - d.quizAnswer) < 0.5;

                        upd('quizFeedback', isCorrect ? 'correct' : 'wrong');

                        if (isCorrect) { upd('quizStreak', (d.quizStreak || 0) + 1); awardStemXP('physicsQuiz', 10, 'Predicted the landing!'); }

                        else { upd('quizStreak', 0); }

                      },

                      className: "px-3 py-2 rounded-lg text-xs font-bold border-2 transition-all " +

                        (correct ? 'bg-emerald-100 border-emerald-400 text-emerald-700' : wrong ? 'bg-red-100 border-red-400 text-red-600' : d.quizPicked !== null ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-white border-amber-200 text-slate-700 hover:border-amber-400')

                    }, opt.toFixed(1) + " m");

                  })

                ),

                d.quizFeedback && React.createElement("p", { className: "text-xs font-bold " + (d.quizFeedback === 'correct' ? 'text-emerald-600' : 'text-red-600') },

                  d.quizFeedback === 'correct' ? '\u2705 Correct! R = v\u00B2sin(2\u03B8)/g = ' + d.quizAnswer.toFixed(1) + 'm' : '\u274C Not quite. The answer is ' + d.quizAnswer.toFixed(1) + 'm'),

                d.quizStreak > 1 && React.createElement("p", { className: "text-xs font-bold text-amber-600" }, "\uD83D\uDD25 Streak: " + d.quizStreak + "!")

              )

            ),

            React.createElement("button", { "aria-label": "Snapshot", onClick: () => { setToolSnapshots(prev => [...prev, { id: 'ph-' + Date.now(), tool: 'physics', label: d.angle + '\u00B0 ' + d.velocity + 'm/s', data: { ...d }, timestamp: Date.now() }]); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); }, className: "mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "\uD83D\uDCF8 Snapshot")

          )
      })();
    }
  });


})();
