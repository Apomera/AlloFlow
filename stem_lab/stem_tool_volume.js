// ═══════════════════════════════════════════
// stem_tool_volume.js — 3D Volume Explorer Plugin
// Self-contained: all state stored in labToolData
// Sound effects, badges, AI tutor & keyboard shortcuts
// ═══════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

(function() {
  'use strict';
  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-volume')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-volume';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();


  // ── Sound effects ──
  var _audioCtx = null;
  function getAudioCtx() {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return _audioCtx;
  }
  function playSound(type) {
    try {
      var ac = getAudioCtx();
      var o = ac.createOscillator();
      var g = ac.createGain();
      o.connect(g); g.connect(ac.destination);
      g.gain.value = 0.12;
      switch (type) {
        case 'correct':
          o.frequency.value = 523; o.type = 'sine';
          g.gain.setValueAtTime(0.12, ac.currentTime);
          g.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.25);
          o.start(); o.stop(ac.currentTime + 0.25);
          var o2 = ac.createOscillator(); var g2 = ac.createGain();
          o2.connect(g2); g2.connect(ac.destination);
          o2.frequency.value = 659; o2.type = 'sine';
          g2.gain.setValueAtTime(0.1, ac.currentTime + 0.1);
          g2.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.35);
          o2.start(ac.currentTime + 0.1); o2.stop(ac.currentTime + 0.35);
          break;
        case 'wrong':
          o.frequency.value = 200; o.type = 'sawtooth';
          g.gain.setValueAtTime(0.08, ac.currentTime);
          g.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.3);
          o.start(); o.stop(ac.currentTime + 0.3);
          break;
        case 'place':
          o.frequency.value = 440; o.type = 'sine';
          g.gain.setValueAtTime(0.06, ac.currentTime);
          g.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.08);
          o.start(); o.stop(ac.currentTime + 0.08);
          break;
        case 'remove':
          o.frequency.value = 330; o.type = 'triangle';
          g.gain.setValueAtTime(0.06, ac.currentTime);
          g.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.1);
          o.start(); o.stop(ac.currentTime + 0.1);
          break;
        case 'badge':
          o.frequency.value = 440; o.type = 'sine';
          g.gain.setValueAtTime(0.12, ac.currentTime);
          g.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.12);
          o.start(); o.stop(ac.currentTime + 0.12);
          [554, 659, 880].forEach(function(f, i) {
            var ox = ac.createOscillator(); var gx = ac.createGain();
            ox.connect(gx); gx.connect(ac.destination);
            ox.frequency.value = f; ox.type = 'sine';
            var t0 = ac.currentTime + 0.1 * (i + 1);
            gx.gain.setValueAtTime(0.1, t0);
            gx.gain.exponentialRampToValueAtTime(0.01, t0 + 0.15);
            ox.start(t0); ox.stop(t0 + 0.15);
          });
          break;
        case 'streak':
          o.frequency.value = 587; o.type = 'triangle';
          g.gain.setValueAtTime(0.1, ac.currentTime);
          g.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.15);
          o.start(); o.stop(ac.currentTime + 0.15);
          var o3 = ac.createOscillator(); var g3 = ac.createGain();
          o3.connect(g3); g3.connect(ac.destination);
          o3.frequency.value = 784; o3.type = 'triangle';
          g3.gain.setValueAtTime(0.1, ac.currentTime + 0.12);
          g3.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.35);
          o3.start(ac.currentTime + 0.12); o3.stop(ac.currentTime + 0.35);
          break;
        default:
          o.frequency.value = 440; o.type = 'sine';
          g.gain.setValueAtTime(0.08, ac.currentTime);
          g.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.12);
          o.start(); o.stop(ac.currentTime + 0.12);
      }
    } catch (e) { /* audio not available */ }
  }

  // ── Badge definitions ──
  var BADGES = [
    { id: 'firstVolume',     icon: '\u2B50',       label: 'First Volume',      desc: 'Calculate your first volume correctly' },
    { id: 'prismBuilder',    icon: '\uD83C\uDFD7\uFE0F', label: 'Prism Builder', desc: 'Build a prism correctly in freeform' },
    { id: 'lBlockSolver',    icon: '\uD83D\uDCD0', label: 'L-Block Solver',    desc: 'Solve an L-block volume problem' },
    { id: 'streak5',         icon: '\uD83D\uDD25', label: 'On Fire',           desc: '5 correct in a row' },
    { id: 'streak10',        icon: '\u26A1',       label: 'Unstoppable',       desc: '10 correct in a row' },
    { id: 'bigBuilder',      icon: '\uD83C\uDFE0', label: 'Big Builder',      desc: 'Build a shape with 20+ cubes' },
    { id: 'surfaceExplorer', icon: '\uD83C\uDFA8', label: 'Surface Explorer',  desc: 'Use paint surface area mode' },
    { id: 'layerMaster',     icon: '\uD83C\uDF82', label: 'Layer Master',      desc: 'Explore layers with the slider' },
    { id: 'dimensionKing',   icon: '\uD83D\uDC51', label: 'Dimension King',    desc: 'Set all sliders to maximum (10)' },
    { id: 'centurion',       icon: '\uD83C\uDFC5', label: 'Centurion',         desc: '100 total cubes placed in freeform' }
  ];

  window.StemLab.registerTool('volume', {
    icon: '\uD83D\uDCE6', label: '3D Volume Explorer',
    desc: '3D cube building with volume, surface area, badges & AI tutor.',
    color: 'emerald', category: 'math',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var setStemLabTool = ctx.setStemLabTool;
      var addToast = ctx.addToast;
      var awardStemXP = ctx.awardXP;
      var announceToSR = ctx.announceToSR;
      var a11yClick = ctx.a11yClick;
      var t = ctx.t;
      var callGemini = ctx.callGemini;

      // ── State via toolData ──
      var ld = ctx.toolData || {};
      var _v = ld._volume || {};
      var upd = function(obj) {
        if (typeof ctx.setToolData === 'function') {
          ctx.setToolData(function(prev) {
            var vol = Object.assign({}, (prev && prev._volume) || {}, obj);
            return Object.assign({}, prev, { _volume: vol });
          });
        }
      };

      var dims = _v.dims || { l: 3, w: 2, h: 2 };
      var mode = _v.mode || 'slider';
      var rotation = _v.rotation || { x: -25, y: -35 };
      var scale = _v.scale || 1.0;
      var showLayers = _v.showLayers != null ? _v.showLayers : null;
      var challenge = _v.challenge || null;
      var answer = _v.answer || '';
      var feedback = _v.feedback || null;
      var positions = _v.positions || [];
      var posSet = new Set(positions);
      var builderChallenge = _v.builderChallenge || null;
      var builderFeedback = _v.builderFeedback || null;
      var score = _v.score || { correct: 0, total: 0 };
      var paintSurfaceArea = _v.paintSurfaceArea || false;

      // Extended state for badges & AI
      var badges = _v.badges || {};
      var streak = _v.streak || 0;
      var totalPlaced = _v.totalPlaced || 0;
      var showBadges = _v.showBadges || false;
      var showAI = _v.showAI || false;
      var aiResponse = _v.aiResponse || '';
      var aiLoading = _v.aiLoading || false;
      var layerUsed = _v.layerUsed || false;

      // ── Badge checker ──
      function checkBadges(updates) {
        var changed = {};
        var newBadges = Object.assign({}, badges);
        Object.keys(updates).forEach(function(key) {
          if (updates[key] && !newBadges[key]) {
            changed[key] = true;
            newBadges[key] = true;
          }
        });
        if (Object.keys(changed).length > 0) {
          upd({ badges: newBadges });
          Object.keys(changed).forEach(function(bid) {
            var badge = BADGES.find(function(b) { return b.id === bid; });
            if (badge) {
              playSound('badge');
              addToast(badge.icon + ' Badge: ' + badge.label + '!', 'success');
              if (typeof awardStemXP === 'function') awardStemXP('volume', 15, 'badge');
            }
          });
        }
      }

      // ── Helper functions ──
      var getSA = function(ps) {
        var area = 0;
        var dirs = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
        var s = ps instanceof Set ? ps : new Set(ps);
        s.forEach(function(pos) {
          var p = pos.split('-').map(Number);
          dirs.forEach(function(d) {
            if (!s.has((p[0]+d[0])+'-'+(p[1]+d[1])+'-'+(p[2]+d[2]))) area++;
          });
        });
        return area;
      };

      var isSlider = mode === 'slider';
      var volume = isSlider ? dims.l * dims.w * dims.h : posSet.size;
      var surfaceArea = isSlider
        ? 2 * (dims.l * dims.w + dims.l * dims.h + dims.w * dims.h)
        : getSA(posSet);
      var cubeUnit = isSlider
        ? Math.max(18, Math.min(36, 240 / Math.max(dims.l, dims.w, dims.h)))
        : 30;

      // ── 3D Cube rendering ──
      var renderCube = function(x, y, z, hue, lt, unit, clickable, onClick, isGhost) {
        var isPaint = paintSurfaceArea && !isGhost;
        var actHue = isPaint ? 25 : hue;
        var sat = isPaint ? 90 : 70;
        var op1 = isPaint ? 0.95 : 0.85;
        var op2 = isPaint ? 0.90 : 0.70;
        var op3 = isPaint ? 0.92 : 0.80;

        var faces = [
          { transform: 'translateZ(' + unit/2 + 'px)', bg: isGhost ? 'hsla(210,100%,70%,0.1)' : 'hsla('+actHue+','+sat+'%,'+lt+'%,'+op1+')' },
          { transform: 'rotateY(180deg) translateZ(' + unit/2 + 'px)', bg: isGhost ? 'hsla(210,100%,70%,0.1)' : 'hsla('+actHue+','+(sat-5)+'%,'+(lt+5)+'%,'+op2+')' },
          { transform: 'rotateY(-90deg) translateZ(' + unit/2 + 'px)', bg: isGhost ? 'hsla(210,100%,70%,0.1)' : 'hsla('+(actHue+10)+','+(sat-10)+'%,'+(lt-5)+'%,'+op3+')' },
          { transform: 'rotateY(90deg) translateZ(' + unit/2 + 'px)', bg: isGhost ? 'hsla(210,100%,70%,0.1)' : 'hsla('+(actHue+10)+','+(sat-10)+'%,'+(lt+3)+'%,'+op3+')' },
          { transform: 'rotateX(90deg) translateZ(' + unit/2 + 'px)', bg: isGhost ? 'hsla(210,100%,70%,0.1)' : 'hsla('+(actHue-5)+','+(sat+5)+'%,'+(lt+8)+'%,'+Math.min(1, op1+0.05)+')' },
          { transform: 'rotateX(-90deg) translateZ(' + unit/2 + 'px)', bg: isGhost ? 'hsla(210,100%,70%,0.1)' : 'hsla('+(actHue+5)+','+(sat-15)+'%,'+(lt-8)+'%,'+(isPaint?0.8:0.6)+')' }
        ];
        var borderStyle = isGhost ? '1px dashed hsla(210,100%,50%,0.6)' : (isPaint ? '1px solid hsla(25,100%,20%,0.5)' : '1px solid hsla('+actHue+',80%,30%,0.4)');

        return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },
          key: isGhost ? ('ghost-'+x+'-'+y+'-'+z) : (x+'-'+y+'-'+z),
          onClick: clickable ? function(e) { e.stopPropagation(); onClick && onClick(); } : undefined,
          style: {
            position: 'absolute', width: unit+'px', height: unit+'px',
            transform: 'translate3d('+x*unit+'px,'+-z*unit+'px,'+y*unit+'px)',
            transformStyle: 'preserve-3d',
            cursor: clickable ? 'pointer' : 'default',
            pointerEvents: isGhost ? 'none' : 'auto'
          }
        }, faces.map(function(f, i) {
          return h('div', { key: i, style: {
            position: 'absolute', width: '100%', height: i >= 4 ? unit+'px' : '100%',
            transform: f.transform, background: f.bg,
            border: borderStyle, boxSizing: 'border-box'
          }});
        }));
      };

      // Build cube grid
      var cubes = [];
      if (isSlider) {
        var maxLayer = showLayers != null ? Math.min(showLayers, dims.h) : dims.h;
        for (var z = 0; z < maxLayer; z++)
          for (var y = 0; y < dims.w; y++)
            for (var x = 0; x < dims.l; x++)
              cubes.push(renderCube(x, y, z, 140 + z*12, 55 + z*4, cubeUnit, false));
      } else {
        positions.forEach(function(pos) {
          var p = pos.split('-').map(Number);
          cubes.push(renderCube(p[0], p[1], p[2], 200 + p[2]*15, 50 + p[2]*5, cubeUnit, true, function() {
            playSound('remove');
            var next = positions.filter(function(pp) { return pp !== pos; });
            upd({ positions: next });
          }));
        });
        // Ground grid for placement
        for (var gx = 0; gx < 8; gx++) {
          for (var gy = 0; gy < 8; gy++) {
            var gKey = gx+'-'+gy+'-0';
            if (!posSet.has(gKey)) {
              (function(fx, fy) {
                cubes.push(h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },
                  key: 'g-'+fx+'-'+fy,
                  onClick: function(e) {
                    e.stopPropagation();
                    playSound('place');
                    var newPos = positions.concat([fx+'-'+fy+'-0']);
                    var newTotal = totalPlaced + 1;
                    upd({ positions: newPos, totalPlaced: newTotal });
                    checkBadges({ bigBuilder: newPos.length >= 20, centurion: newTotal >= 100 });
                  },
                  style: {
                    position: 'absolute', width: cubeUnit+'px', height: cubeUnit+'px',
                    transform: 'translate3d('+fx*cubeUnit+'px,0px,'+fy*cubeUnit+'px) rotateX(90deg)',
                    background: 'hsla(220,15%,60%,0.12)', border: '1px dashed hsla(220,20%,60%,0.25)',
                    boxSizing: 'border-box', cursor: 'pointer'
                  }
                }));
              })(gx, gy);
            }
          }
        }
        // Stack targets above existing cubes
        positions.forEach(function(pos) {
          var p = pos.split('-').map(Number);
          var above = p[0]+'-'+p[1]+'-'+(p[2]+1);
          if (!posSet.has(above) && p[2] < 9) {
            (function(ax, ay, az) {
              cubes.push(h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },
                key: 'stack-'+above,
                onClick: function(e) {
                  e.stopPropagation();
                  playSound('place');
                  var newPos = positions.concat([ax+'-'+ay+'-'+az]);
                  var newTotal = totalPlaced + 1;
                  upd({ positions: newPos, totalPlaced: newTotal });
                  checkBadges({ bigBuilder: newPos.length >= 20, centurion: newTotal >= 100 });
                },
                style: {
                  position: 'absolute', width: cubeUnit+'px', height: cubeUnit+'px',
                  transform: 'translate3d('+ax*cubeUnit+'px,'+-az*cubeUnit+'px,'+ay*cubeUnit+'px)',
                  transformStyle: 'preserve-3d', cursor: 'pointer', zIndex: 10
                }
              }, h('div', { style: {
                position: 'absolute', width: '100%', height: cubeUnit+'px',
                transform: 'rotateX(90deg) translateZ('+cubeUnit/2+'px)',
                background: 'transparent', border: 'none', boxSizing: 'border-box'
              }})));
            })(p[0], p[1], p[2]+1);
          }
        });

        // Render ghost target for prism challenge
        if (builderChallenge && builderChallenge.type === 'prism') {
          var tgt = builderChallenge.target;
          for (var gx2 = 0; gx2 < tgt.l; gx2++) {
            for (var gy2 = 0; gy2 < tgt.w; gy2++) {
              for (var gz2 = 0; gz2 < tgt.h; gz2++) {
                if (!posSet.has(gx2+'-'+gy2+'-'+gz2)) {
                  cubes.push(renderCube(gx2, gy2, gz2, 210, 80, cubeUnit, false, null, true));
                }
              }
            }
          }
        }
      }

      var fw = isSlider ? dims.l * cubeUnit : 8 * cubeUnit;
      var fh = isSlider ? dims.h * cubeUnit : 5 * cubeUnit;

      // ── Drag rotation handler ──
      var dragStartRef = { current: null };
      var handleMouseDown = function(e) {
        dragStartRef.current = { x: e.clientX, y: e.clientY, rx: rotation.x, ry: rotation.y };
        var move = function(me) {
          if (!dragStartRef.current) return;
          var dx = me.clientX - dragStartRef.current.x;
          var dy = me.clientY - dragStartRef.current.y;
          upd({ rotation: {
            x: Math.max(-80, Math.min(10, dragStartRef.current.rx + dy * 0.5)),
            y: dragStartRef.current.ry + dx * 0.5
          }});
        };
        var up = function() {
          dragStartRef.current = null;
          window.removeEventListener('mousemove', move);
          window.removeEventListener('mouseup', up);
        };
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
      };

      // ── Generate L-block ──
      var generateLBlock = function() {
        var pos = [];
        var bw = 2 + Math.floor(Math.random() * 3);
        var bd = 2 + Math.floor(Math.random() * 2);
        for (var lx = 0; lx < bw; lx++) for (var ly = 0; ly < bd; ly++) pos.push(lx+'-'+ly+'-0');
        var th = 1 + Math.floor(Math.random() * 2);
        for (var lx2 = 0; lx2 < Math.min(2, bw); lx2++)
          for (var ly2 = 0; ly2 < Math.min(2, bd); ly2++)
            for (var lz = 1; lz <= th; lz++) pos.push(lx2+'-'+ly2+'-'+lz);
        return { positions: pos, volume: new Set(pos).size };
      };

      // ── Check challenge ──
      var checkChallenge = function() {
        if (isSlider && challenge) {
          var ans = parseInt(answer);
          var ok = ans === challenge.answer;
          announceToSR(ok ? 'Correct!' : 'Incorrect, try again');
          playSound(ok ? 'correct' : 'wrong');
          var newStreak = ok ? streak + 1 : 0;
          if (ok && newStreak >= 3 && newStreak % 5 === 0) playSound('streak');
          upd({
            feedback: ok
              ? { correct: true, msg: '\u2705 Correct! '+challenge.l+'\u00d7'+challenge.w+'\u00d7'+challenge.h+' = '+challenge.answer + (newStreak >= 3 ? '  \uD83D\uDD25 ' + newStreak + ' streak!' : '') }
              : { correct: false, msg: '\u274c Try V = L \u00d7 W \u00d7 H = '+challenge.l+' \u00d7 '+challenge.w+' \u00d7 '+challenge.h+' = '+challenge.answer },
            score: { correct: score.correct + (ok ? 1 : 0), total: score.total + 1 },
            streak: newStreak
          });
          if (ok) {
            awardStemXP('volume', 5, 'cube volume');
            checkBadges({ firstVolume: true, streak5: newStreak >= 5, streak10: newStreak >= 10 });
          }
        }
        if (!isSlider && builderChallenge) {
          var vol = posSet.size;
          if (builderChallenge.type === 'prism') {
            var tgtP = builderChallenge.target;
            var tgtVol = tgtP.l * tgtP.w * tgtP.h;
            var isRect = false;
            if (vol === tgtVol) {
              var coords = positions.map(function(p) { return p.split('-').map(Number); });
              var xs = coords.map(function(c) { return c[0]; });
              var ys = coords.map(function(c) { return c[1]; });
              var zs = coords.map(function(c) { return c[2]; });
              var ddx = Math.max.apply(null, xs) - Math.min.apply(null, xs) + 1;
              var ddy = Math.max.apply(null, ys) - Math.min.apply(null, ys) + 1;
              var ddz = Math.max.apply(null, zs) - Math.min.apply(null, zs) + 1;
              var d = [ddx, ddy, ddz].sort(function(a,b){return a-b;});
              var tgtd = [tgtP.l, tgtP.w, tgtP.h].sort(function(a,b){return a-b;});
              isRect = d[0]===tgtd[0] && d[1]===tgtd[1] && d[2]===tgtd[2] && vol===ddx*ddy*ddz;
            }
            playSound(isRect ? 'correct' : 'wrong');
            var newStreak2 = isRect ? streak + 1 : 0;
            upd({
              builderFeedback: isRect
                ? { correct: true, msg: '\u2705 Correct! '+tgtP.l+'\u00d7'+tgtP.w+'\u00d7'+tgtP.h+' = '+tgtVol+' cubes' + (newStreak2 >= 3 ? '  \uD83D\uDD25 ' + newStreak2 + ' streak!' : '') }
                : { correct: false, msg: '\u274c Build a solid '+tgtP.l+'\u00d7'+tgtP.w+'\u00d7'+tgtP.h+' prism ('+tgtVol+' cubes). You have '+vol+'.' },
              score: { correct: score.correct + (isRect ? 1 : 0), total: score.total + 1 },
              streak: newStreak2
            });
            if (isRect) {
              awardStemXP('volume', 5, 'prism build');
              checkBadges({ firstVolume: true, prismBuilder: true, streak5: newStreak2 >= 5, streak10: newStreak2 >= 10 });
            }
          } else {
            var ok2 = vol === builderChallenge.answer;
            playSound(ok2 ? 'correct' : 'wrong');
            var newStreak3 = ok2 ? streak + 1 : 0;
            var isLBlock = builderChallenge.shape === 'L-Block';
            upd({
              builderFeedback: ok2
                ? { correct: true, msg: '\u2705 Correct! Volume = '+builderChallenge.answer+' cubic units' + (newStreak3 >= 3 ? '  \uD83D\uDD25 ' + newStreak3 + ' streak!' : '') }
                : { correct: false, msg: '\u274c You placed '+vol+' cubes. Correct: '+builderChallenge.answer+'.' },
              score: { correct: score.correct + (ok2 ? 1 : 0), total: score.total + 1 },
              streak: newStreak3
            });
            if (ok2) {
              awardStemXP('volume', 5, 'volume quiz');
              checkBadges({ firstVolume: true, lBlockSolver: isLBlock, streak5: newStreak3 >= 5, streak10: newStreak3 >= 10 });
            }
          }
        }
      };

      // ── AI Tutor ──
      function askAI() {
        if (aiLoading) return;
        upd({ showAI: true, aiLoading: true, aiResponse: '' });
        var prompt = 'You are a friendly math tutor helping a student explore 3D volume and surface area. ';
        if (isSlider) {
          prompt += 'They are looking at a ' + dims.l + '\u00d7' + dims.w + '\u00d7' + dims.h + ' rectangular prism. ';
          prompt += 'Volume = ' + volume + ', Surface Area = ' + surfaceArea + '. ';
          if (challenge && feedback && !feedback.correct) {
            prompt += 'They got the volume challenge wrong. Explain the formula V = L \u00d7 W \u00d7 H with this example. ';
          } else {
            prompt += 'Share a fun fact about 3D shapes or a real-world example of this volume. ';
          }
        } else {
          prompt += 'They are building 3D shapes in freeform mode with ' + posSet.size + ' cubes placed. ';
          if (builderChallenge) {
            if (builderChallenge.type === 'prism') {
              prompt += 'Challenge: build a ' + builderChallenge.target.l + '\u00d7' + builderChallenge.target.w + '\u00d7' + builderChallenge.target.h + ' prism. ';
            } else {
              prompt += 'Challenge: build a shape with volume = ' + builderChallenge.answer + '. ';
            }
            if (builderFeedback && !builderFeedback.correct) {
              prompt += 'They got it wrong. Give a helpful strategy tip. ';
            }
          } else {
            prompt += 'Give a tip about building 3D shapes or an interesting volume fact. ';
          }
        }
        prompt += 'Keep it to 2-3 sentences, encouraging and educational.';
        callGemini(prompt, false, false, 0.7).then(function(resp) {
          upd({ aiResponse: resp || 'No response received.', aiLoading: false });
        }).catch(function() {
          upd({ aiResponse: 'AI tutor is unavailable right now. Try again later!', aiLoading: false });
        });
      }

      // ── Keyboard shortcuts (managed without useEffect) ──
      if (window._volumeKeyHandler) {
        window.removeEventListener('keydown', window._volumeKeyHandler);
      }
      window._volumeKeyHandler = function(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        var key = e.key.toLowerCase();
        if (key === 's' && !isSlider) { e.preventDefault(); upd({ mode: 'slider', builderChallenge: null, builderFeedback: null }); }
        if (key === 'f' && isSlider) { e.preventDefault(); upd({ mode: 'freeform', challenge: null, feedback: null }); }
        if (key === 'n') {
          e.preventDefault();
          if (isSlider) {
            var rl = Math.floor(Math.random()*8)+1, rw = Math.floor(Math.random()*6)+1, rh = Math.floor(Math.random()*6)+1;
            upd({ dims: {l:rl,w:rw,h:rh}, challenge: {l:rl,w:rw,h:rh,answer:rl*rw*rh}, answer: '', feedback: null, showLayers: null });
          }
        }
        if (key === 'p') { e.preventDefault(); upd({ paintSurfaceArea: !paintSurfaceArea }); if (!badges.surfaceExplorer) checkBadges({ surfaceExplorer: true }); }
        if (key === 'b') { e.preventDefault(); upd({ showBadges: !showBadges }); }
        if (key === '?' || (e.shiftKey && key === '/')) { e.preventDefault(); askAI(); }
        if (key === '=' || key === '+') { e.preventDefault(); upd({ scale: Math.min(2.5, scale + 0.15) }); }
        if (key === '-') { e.preventDefault(); upd({ scale: Math.max(0.4, scale - 0.15) }); }
      };
      window.addEventListener('keydown', window._volumeKeyHandler);

      // ── Earned badges count ──
      var earnedBadges = BADGES.filter(function(b) { return badges[b.id]; });
      var earnedCount = earnedBadges.length;

      // ══════════ RENDER ══════════
      return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200' },
        // Header
        h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex items-center gap-3 mb-2' },
          h('button', { onClick: function() { setStemLabTool(null); }, className: 'p-1.5 hover:bg-slate-100 rounded-lg', 'aria-label': 'Back' },
            h(ArrowLeft, { size: 18, className: 'text-slate-600' })),
          h('h3', { className: 'text-lg font-bold text-emerald-800' }, '\uD83D\uDCE6 3D Volume Explorer'),
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex items-center gap-2 ml-2' },
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-xs font-bold text-emerald-600' }, score.correct + '/' + score.total),
            streak >= 2 && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },
              className: 'text-xs font-bold text-orange-800 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full animate-pulse'
            }, '\uD83D\uDD25 ' + streak + ' streak!'),
            earnedCount > 0 && h('button', { 'aria-label': 'AI',
              onClick: function() { upd({ showBadges: !showBadges }); },
              className: 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-all',
              title: 'View badges (B)'
            }, '\uD83C\uDFC5 ' + earnedCount + '/' + BADGES.length),
            h('button', { 'aria-label': 'AI',
              onClick: askAI,
              className: 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-600 hover:bg-purple-100 transition-all',
              title: 'AI Tutor (?)'
            }, '\uD83E\uDDE0 AI')
          ),
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex-1' }),
          // Mode toggle
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex items-center gap-1 bg-emerald-50 rounded-lg p-1 border border-emerald-200' },
            h('button', { 'aria-label': 'Slider',
              onClick: function() { upd({ mode: 'slider', builderChallenge: null, builderFeedback: null }); },
              className: 'px-3 py-1 rounded-md text-xs font-bold transition-all ' + (isSlider ? 'bg-white text-emerald-700 shadow-sm' : 'text-emerald-500 hover:text-emerald-700'),
              title: 'Slider mode (S)'
            }, '\uD83C\uDF9A\uFE0F Slider'),
            h('button', { 'aria-label': 'Freeform',
              onClick: function() { upd({ mode: 'freeform', challenge: null, feedback: null }); },
              className: 'px-3 py-1 rounded-md text-xs font-bold transition-all ' + (!isSlider ? 'bg-white text-indigo-700 shadow-sm' : 'text-emerald-500 hover:text-emerald-700'),
              title: 'Freeform mode (F)'
            }, '\uD83E\uDDF1 Freeform')),
          // Paint toggle
          h('button', { 'aria-label': 'Toggle paint (P)',
            onClick: function() {
              upd({ paintSurfaceArea: !paintSurfaceArea });
              if (!badges.surfaceExplorer) checkBadges({ surfaceExplorer: true });
            },
            className: 'px-3 py-1 ml-2 rounded-lg text-xs font-bold transition-all border ' + (paintSurfaceArea ? 'bg-orange-100 text-orange-700 border-orange-300 shadow-inner' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'),
            title: 'Toggle paint (P)'
          }, paintSurfaceArea ? '\uD83E\uDDFC Wash Paint' : '\uD83C\uDFA8 Paint Surface'),
          // Zoom
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex items-center gap-1' },
            h('button', { 'aria-label': 'Add', onClick: function() { upd({ scale: Math.max(0.4, scale - 0.15) }); }, className: 'w-7 h-7 rounded-full bg-white border border-emerald-300 text-emerald-700 font-bold text-sm hover:bg-emerald-100 flex items-center justify-center' }, '\u2212'),
            h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-[10px] text-emerald-600 font-mono w-10 text-center' }, Math.round(scale*100)+'%'),
            h('button', { 'aria-label': 'Add', onClick: function() { upd({ scale: Math.min(2.5, scale + 0.15) }); }, className: 'w-7 h-7 rounded-full bg-white border border-emerald-300 text-emerald-700 font-bold text-sm hover:bg-emerald-100 flex items-center justify-center' }, '+'),
            h('button', { 'aria-label': 'Reset 3D view rotation and zoom', onClick: function() { upd({ rotation: { x: -25, y: -35 }, scale: 1.0 }); }, className: 'ml-1 px-2 py-1 rounded-md bg-white border border-emerald-300 text-emerald-700 font-bold text-[10px] hover:bg-emerald-100' }, '\u21BA'))
        ),

        // ── Badge panel ──
        showBadges && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-3 border-2 border-amber-200' },
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex items-center justify-between mb-2' },
            h('p', { className: 'text-sm font-bold text-amber-800' }, '\uD83C\uDFC5 Badges (' + earnedCount + '/' + BADGES.length + ')'),
            h('button', { 'aria-label': 'Close badges panel', onClick: function() { upd({ showBadges: false }); }, className: 'text-xs text-slate-600 hover:text-slate-600' }, '\u2715')
          ),
          h('div', { className: 'grid grid-cols-3 sm:grid-cols-5 gap-2' },
            BADGES.map(function(badge) {
              var earned = !!badges[badge.id];
              return h('div', {
                key: badge.id,
                className: 'text-center p-2 rounded-lg border transition-all ' +
                  (earned ? 'bg-white border-amber-300 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-50'),
                title: badge.desc
              },
                h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-xl' }, earned ? badge.icon : '\uD83D\uDD12'),
                h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-[11px] font-bold mt-0.5 ' + (earned ? 'text-amber-800' : 'text-slate-500') }, badge.label)
              );
            })
          )
        ),

        // ── AI Tutor panel ──
        showAI && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-3 border-2 border-purple-200' },
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex items-center justify-between mb-2' },
            h('p', { className: 'text-sm font-bold text-purple-800' }, '\uD83E\uDDE0 AI Volume Tutor'),
            h('button', { 'aria-label': 'Ask A I', onClick: function() { upd({ showAI: false }); }, className: 'text-xs text-slate-600 hover:text-slate-600' }, '\u2715')
          ),
          aiLoading
            ? h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex items-center gap-2' },
                h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin' }),
                h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-xs text-purple-600' }, 'Thinking...')
              )
            : h('p', { className: 'text-sm text-purple-700 whitespace-pre-wrap leading-relaxed' }, aiResponse),
          !aiLoading && h('button', { 'aria-label': 'Ask Again',
            onClick: askAI,
            className: 'mt-2 text-[10px] font-bold px-3 py-1 rounded-full bg-purple-100 text-purple-600 hover:bg-purple-200 border border-purple-200 transition-all'
          }, '\uD83D\uDD04 Ask Again')
        ),

        // Sliders (slider mode)
        isSlider && h('div', { className: 'grid grid-cols-3 gap-3' },
          ['l','w','h'].map(function(dim) {
            return h('div', { key: dim, className: 'bg-emerald-50 rounded-lg p-3 border border-emerald-100' },
              h('label', { className: 'block text-xs text-emerald-700 mb-1 font-bold uppercase' },
                dim === 'l' ? 'Length' : dim === 'w' ? 'Width' : 'Height'),
              h('input', {
                type: 'range', 'aria-label': 'Length', min: '1', max: '10', value: dims[dim],
                onChange: function(e) {
                  var nd = Object.assign({}, dims);
                  nd[dim] = parseInt(e.target.value);
                  upd({ dims: nd, challenge: null, feedback: null, showLayers: null });
                  // Check dimension king
                  if (nd.l === 10 && nd.w === 10 && nd.h === 10) checkBadges({ dimensionKing: true });
                },
                'aria-label': (dim === 'l' ? 'Length' : dim === 'w' ? 'Width' : 'Height') + ' slider',
                className: 'w-full h-2 bg-emerald-200 rounded-lg appearance-none cursor-pointer accent-emerald-600'
              }),
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-center text-lg font-bold text-emerald-700 mt-1' }, dims[dim])
            );
          })
        ),

        // Freeform instructions
        !isSlider && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex items-center gap-2 bg-indigo-50 rounded-lg p-2 border border-indigo-100' },
          h('p', { className: 'text-xs text-indigo-600 flex-1' }, '\uD83D\uDC49 Click grid to place cubes \u2022 Click cube to remove \u2022 Click above to stack'),
          h('button', { 'aria-label': 'Clear All',
            onClick: function() { upd({ positions: [], builderChallenge: null, builderFeedback: null }); },
            className: 'px-3 py-1.5 text-xs font-bold bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300'
          }, '\u21BA Clear All')
        ),

        // 3D viewport
        h('div', {
          className: 'bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl border-2 border-emerald-300/30 flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing select-none',
          style: { minHeight: '350px', perspective: '900px' },
          onMouseDown: handleMouseDown,
          onWheel: function(e) { upd({ scale: Math.max(0.4, Math.min(2.5, scale + (e.deltaY > 0 ? -0.08 : 0.08))) }); }
        }, h('div', {
          style: {
            transformStyle: 'preserve-3d',
            transform: 'rotateX('+rotation.x+'deg) rotateY('+rotation.y+'deg) scale3d('+scale+','+scale+','+scale+')',
            transition: 'transform 0.15s ease-out',
            position: 'relative', width: fw+'px', height: fh+'px'
          }
        }, cubes)),

        // Layer slider (slider mode)
        isSlider && h('div', { className: 'flex items-center gap-2 bg-emerald-50 rounded-lg p-2 border border-emerald-100' },
          h('span', { className: 'text-xs font-bold text-emerald-700' }, 'Layers:'),
          h('input', {
            type: 'range', 'aria-label': 'Volume slider', min: '1', max: dims.h,
            value: showLayers != null ? showLayers : dims.h,
            onChange: function(e) {
              var lv = parseInt(e.target.value);
              upd({ showLayers: lv, layerUsed: true });
              if (!badges.layerMaster) checkBadges({ layerMaster: true });
            },
            'aria-label': 'Visible layers',
            className: 'flex-1 h-1.5 bg-emerald-200 rounded-lg appearance-none cursor-pointer accent-emerald-600'
          }),
          h('span', { className: 'text-xs font-mono text-emerald-600' },
            (showLayers != null ? showLayers : dims.h) + ' / ' + dims.h)
        ),

        // Stats
        h('div', { className: 'grid grid-cols-2 gap-3' },
          h('div', { className: 'bg-white rounded-xl p-3 border border-emerald-100 text-center flex flex-col items-center justify-center' },
            h('div', { className: 'text-xs font-bold text-emerald-600 uppercase mb-1' }, 'Volume'),
            h('div', { className: 'text-xl font-bold text-emerald-800' },
              isSlider && !challenge ? h('div', { className: 'flex flex-col items-center gap-1' },
                h('div', { className: 'text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200' },
                  'Area of Base ('+dims.l+'\u00d7'+dims.w+') = ' + (dims.l * dims.w)),
                h('div', { className: 'whitespace-nowrap' },
                  (dims.l * dims.w) + ' \u00d7 Height ('+dims.h+') = ',
                  h('span', { className: 'text-2xl text-emerald-600' }, volume))
              ) : h('span', null,
                h('span', { className: 'text-2xl text-emerald-600' },
                  (isSlider && challenge && !feedback) ? '?' :
                  (!isSlider && builderChallenge && builderChallenge.type === 'volume') ? '?' : volume))
            ),
            (isSlider && challenge && !feedback) ? null :
            (!isSlider && builderChallenge && builderChallenge.type === 'volume') ? null :
            h('div', { className: 'text-xs text-slate-600' }, volume + ' unit cube' + (volume !== 1 ? 's' : ''))
          ),
          h('div', { className: 'bg-white rounded-xl p-3 border border-teal-100 text-center' },
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-xs font-bold text-teal-600 uppercase mb-1' }, 'Surface Area'),
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-xl font-bold text-teal-800' },
              'SA = ', h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-2xl text-teal-600' },
                (isSlider && challenge && !feedback) ? '?' :
                (!isSlider && builderChallenge && builderChallenge.type === 'volume') ? '?' : surfaceArea)),
            isSlider && !challenge && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-xs text-slate-600' },
              '2('+dims.l+'\u00d7'+dims.w+' + '+dims.l+'\u00d7'+dims.h+' + '+dims.w+'\u00d7'+dims.h+')')
          )
        ),

        // Challenge buttons
        h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-2 flex-wrap' },
          isSlider ? h(React.Fragment, null,
            h('button', { 'aria-label': 'Random Challenge',
              onClick: function() {
                var l = Math.floor(Math.random()*8)+1, w = Math.floor(Math.random()*6)+1, hh = Math.floor(Math.random()*6)+1;
                upd({ dims: {l:l,w:w,h:hh}, challenge: {l:l,w:w,h:hh,answer:l*w*hh}, answer: '', feedback: null, showLayers: null });
              },
              className: 'flex-1 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-lg text-sm hover:from-emerald-600 hover:to-teal-600 transition-all shadow-md',
              title: 'New challenge (N)'
            }, '\uD83C\uDFB2 Random Challenge'),
            h('button', { 'aria-label': 'Reset',
              onClick: function() { upd({ dims: {l:3,w:2,h:2}, challenge: null, feedback: null, showLayers: null, rotation: {x:-25,y:-35}, scale: 1.0 }); },
              className: 'px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300'
            }, '\u21BA Reset')
          ) : h(React.Fragment, null,
            h('button', { 'aria-label': 'Build Prism',
              onClick: function() {
                var pl=2+Math.floor(Math.random()*4), pw=2+Math.floor(Math.random()*3), ph=1+Math.floor(Math.random()*3);
                upd({ mode: 'freeform', positions: [], builderChallenge: {type:'prism',target:{l:pl,w:pw,h:ph},answer:pl*pw*ph}, builderFeedback: null, challenge: null, feedback: null });
              },
              className: 'flex-1 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold rounded-lg text-sm hover:from-blue-600 hover:to-indigo-600 transition-all shadow-md'
            }, '\uD83C\uDFD7\uFE0F Build Prism'),
            h('button', { 'aria-label': 'L-Block Vol',
              onClick: function() {
                var lb = generateLBlock();
                upd({ mode: 'freeform', positions: lb.positions, builderChallenge: {type:'volume',answer:lb.volume,shape:'L-Block'}, builderFeedback: null, challenge: null, feedback: null });
              },
              className: 'flex-1 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white font-bold rounded-lg text-sm hover:from-violet-600 hover:to-purple-600 transition-all shadow-md'
            }, '\uD83D\uDCD0 L-Block Vol'),
            h('button', { 'aria-label': 'Random Vol',
              onClick: function() {
                var tv = 5+Math.floor(Math.random()*16);
                upd({ mode: 'freeform', positions: [], builderChallenge: {type:'volume',answer:tv,shape:'any'}, builderFeedback: null, challenge: null, feedback: null });
              },
              className: 'flex-1 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-lg text-sm hover:from-amber-600 hover:to-orange-600 transition-all shadow-md'
            }, '\uD83C\uDFB2 Random Vol')
          )
        ),

        // Challenge input (slider mode)
        isSlider && challenge && h('div', { className: 'bg-amber-50 rounded-lg p-3 border border-amber-200' },
          h('p', { className: 'text-sm font-bold text-amber-800 mb-2' }, '\uD83E\uDD14 What is the volume?'),
          h('div', { className: 'flex gap-2 items-center' },
            h('input', {
              type: 'number', value: answer,
              onChange: function(e) { upd({ answer: e.target.value }); },
              onKeyDown: function(e) { if (e.key === 'Enter' && answer) checkChallenge(); },
              placeholder: 'V = ?', 'aria-label': 'Volume answer', className: 'flex-1 px-3 py-2 border border-amber-300 rounded-lg text-sm font-mono'
            }),
            h('button', { 'aria-label': 'Check',
              onClick: checkChallenge, disabled: !answer,
              className: 'px-4 py-2 bg-amber-700 text-white font-bold rounded-lg text-sm disabled:opacity-40'
            }, 'Check'),
            h('button', { 'aria-label': 'Ask A I',
              onClick: askAI,
              className: 'px-3 py-2 bg-purple-100 text-purple-600 font-bold rounded-lg hover:bg-purple-200 transition-all text-sm',
              title: 'Get a hint from AI'
            }, '\uD83E\uDDE0')
          ),
          feedback && h('p', { className: 'text-sm font-bold mt-2 ' + (feedback.correct ? 'text-green-600' : 'text-red-600') }, feedback.msg)
        ),

        // Builder challenge (freeform mode)
        !isSlider && builderChallenge && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'bg-indigo-50 rounded-lg p-3 border border-indigo-200' },
          h('p', { className: 'text-sm font-bold text-indigo-800 mb-2' },
            builderChallenge.type === 'prism'
              ? '\uD83C\uDFD7\uFE0F Build a '+builderChallenge.target.l+'\u00d7'+builderChallenge.target.w+'\u00d7'+builderChallenge.target.h+' rectangular prism'
              : builderChallenge.shape === 'L-Block'
                ? '\uD83D\uDCD0 What is the volume of this L-shaped block?'
                : '\uD83C\uDFB2 Build a shape with volume = '+builderChallenge.answer
          ),
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-2 items-center' },
            h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-xs text-indigo-600' }, 'Cubes placed: ', h('span', { className: 'font-bold' }, posSet.size)),
            h('button', { 'aria-label': 'Hint',
              onClick: askAI,
              className: 'px-3 py-1.5 bg-purple-100 text-purple-600 font-bold rounded-lg hover:bg-purple-200 transition-all text-xs',
              title: 'Get a hint from AI'
            }, '\uD83E\uDDE0 Hint'),
            h('button', { 'aria-label': 'Check', onClick: checkChallenge, className: 'ml-auto px-4 py-1.5 bg-indigo-500 text-white font-bold rounded-lg text-sm hover:bg-indigo-600' }, '\u2714 Check')
          ),
          builderFeedback && h('p', { className: 'text-sm font-bold mt-2 ' + (builderFeedback.correct ? 'text-green-600' : 'text-red-600') }, builderFeedback.msg)
        ),

        // ── Keyboard shortcuts legend ──
        h('div', { className: 'text-[10px] text-slate-600 text-center space-x-3' },
          h('span', null, 'S Slider'),
          h('span', null, 'F Freeform'),
          h('span', null, 'N Challenge'),
          h('span', null, 'P Paint'),
          h('span', null, 'B Badges'),
          h('span', null, '+/- Zoom'),
          h('span', null, '? AI')
        )
      );
    }
  });
})();
