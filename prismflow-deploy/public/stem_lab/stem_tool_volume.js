// ═══════════════════════════════════════════
// stem_tool_volume.js — 3D Volume Explorer Plugin
// Self-contained: all state stored in labToolData
// ═══════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

(function() {
  'use strict';

  window.StemLab.registerTool('volume', {
    icon: '\uD83D\uDCE6', label: '3D Volume Explorer',
    desc: '3D cube building with volume and surface area calculations.',
    color: 'emerald', category: 'math',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var setStemLabTool = ctx.setStemLabTool;
      var addToast = ctx.addToast;
      var awardStemXP = ctx.awardXP;
      var announceToSR = ctx.announceToSR;
      var t = ctx.t;
      var StemAIHintButton = ctx.StemAIHintButton || function() { return null; };

      // ── State via labToolData ──
      var ld = ctx.toolData || {};
      var _v = ld._volume || {};
      var upd = function(obj) {
        ctx.update('_volume', '_volume', 'SKIP');
        // Use updateMulti pattern to merge into _volume 
        if (typeof ctx.setToolData === 'function') {
          ctx.setToolData(function(prev) {
            var vol = Object.assign({}, (prev && prev._volume) || {}, obj);
            return Object.assign({}, prev, { _volume: vol });
          });
        }
      };

      var dims = _v.dims || { l: 3, w: 2, h: 2 };
      var mode = _v.mode || 'slider'; // 'slider' or 'freeform'
      var rotation = _v.rotation || { x: -25, y: -35 };
      var scale = _v.scale || 1.0;
      var showLayers = _v.showLayers != null ? _v.showLayers : null;
      var challenge = _v.challenge || null;
      var answer = _v.answer || '';
      var feedback = _v.feedback || null;
      var positions = _v.positions || []; // Array of "x-y-z" strings for freeform
      var posSet = new Set(positions);
      var builderChallenge = _v.builderChallenge || null;
      var builderFeedback = _v.builderFeedback || null;
      var score = _v.score || { correct: 0, total: 0 };
      var paintSurfaceArea = _v.paintSurfaceArea || false;

      // ── Helper functions ──
      var getVolume = function(ps) { return ps.size || ps.length || 0; };
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
        var actHue = isPaint ? 25 : hue; // Orange paint
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
        
        return h('div', {
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
                cubes.push(h('div', {
                  key: 'g-'+fx+'-'+fy,
                  onClick: function(e) { e.stopPropagation(); upd({ positions: positions.concat([fx+'-'+fy+'-0']) }); },
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
              cubes.push(h('div', {
                key: 'stack-'+above,
                onClick: function(e) { e.stopPropagation(); upd({ positions: positions.concat([ax+'-'+ay+'-'+az]) }); },
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
          for (var gx = 0; gx < tgt.l; gx++) {
            for (var gy = 0; gy < tgt.w; gy++) {
              for (var gz = 0; gz < tgt.h; gz++) {
                if (!posSet.has(gx+'-'+gy+'-'+gz)) {
                  cubes.push(renderCube(gx, gy, gz, 210, 80, cubeUnit, false, null, true));
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
        for (var x = 0; x < bw; x++) for (var y = 0; y < bd; y++) pos.push(x+'-'+y+'-0');
        var th = 1 + Math.floor(Math.random() * 2);
        for (var x2 = 0; x2 < Math.min(2, bw); x2++)
          for (var y2 = 0; y2 < Math.min(2, bd); y2++)
            for (var z = 1; z <= th; z++) pos.push(x2+'-'+y2+'-'+z);
        return { positions: pos, volume: new Set(pos).size };
      };

      // ── Check challenge ──
      var checkChallenge = function() {
        if (isSlider && challenge) {
          var ans = parseInt(answer);
          var ok = ans === challenge.answer;
          announceToSR(ok ? 'Correct!' : 'Incorrect, try again');
          upd({
            feedback: ok
              ? { correct: true, msg: '\u2705 Correct! '+challenge.l+'\u00d7'+challenge.w+'\u00d7'+challenge.h+' = '+challenge.answer }
              : { correct: false, msg: '\u274c Try V = L \u00d7 W \u00d7 H' },
            score: { correct: score.correct + (ok ? 1 : 0), total: score.total + 1 }
          });
          if (ok) awardStemXP('volume', 5, 'cube volume');
        }
        if (!isSlider && builderChallenge) {
          var vol = posSet.size;
          if (builderChallenge.type === 'prism') {
            var tgt = builderChallenge.target;
            var tgtVol = tgt.l * tgt.w * tgt.h;
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
              var tgtd = [tgt.l, tgt.w, tgt.h].sort(function(a,b){return a-b;});
              isRect = d[0]===tgtd[0] && d[1]===tgtd[1] && d[2]===tgtd[2] && vol===ddx*ddy*ddz;
            }
            upd({
              builderFeedback: isRect
                ? { correct: true, msg: '\u2705 Correct! '+tgt.l+'\u00d7'+tgt.w+'\u00d7'+tgt.h+' = '+tgtVol+' cubes' }
                : { correct: false, msg: '\u274c Build a solid '+tgt.l+'\u00d7'+tgt.w+'\u00d7'+tgt.h+' prism ('+tgtVol+' cubes). You have '+vol+'.' },
              score: { correct: score.correct + (isRect ? 1 : 0), total: score.total + 1 }
            });
            if (isRect) awardStemXP('volume', 5, 'prism build');
          } else {
            var ok2 = vol === builderChallenge.answer;
            upd({
              builderFeedback: ok2
                ? { correct: true, msg: '\u2705 Correct! Volume = '+builderChallenge.answer+' cubic units' }
                : { correct: false, msg: '\u274c You placed '+vol+' cubes. Correct: '+builderChallenge.answer+'.' },
              score: { correct: score.correct + (ok2 ? 1 : 0), total: score.total + 1 }
            });
            if (ok2) awardStemXP('volume', 5, 'volume quiz');
          }
        }
      };

      // ══════════ RENDER ══════════
      return h('div', { className: 'space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200' },
        // Header
        h('div', { className: 'flex items-center gap-3 mb-2' },
          h('button', { onClick: function() { setStemLabTool(null); }, className: 'p-1.5 hover:bg-slate-100 rounded-lg', 'aria-label': 'Back' },
            h(ArrowLeft, { size: 18, className: 'text-slate-500' })),
          h('h3', { className: 'text-lg font-bold text-emerald-800' }, '\uD83D\uDCE6 3D Volume Explorer'),
          h('div', { className: 'flex items-center gap-2 ml-2' },
            h('div', { className: 'text-xs font-bold text-emerald-600' }, score.correct + '/' + score.total)),
          h('div', { className: 'flex-1' }),
          // Mode toggle
          h('div', { className: 'flex items-center gap-1 bg-emerald-50 rounded-lg p-1 border border-emerald-200' },
            h('button', {
              onClick: function() { upd({ mode: 'slider', builderChallenge: null, builderFeedback: null }); },
              className: 'px-3 py-1 rounded-md text-xs font-bold transition-all ' + (isSlider ? 'bg-white text-emerald-700 shadow-sm' : 'text-emerald-500 hover:text-emerald-700')
            }, '\uD83C\uDF9A\uFE0F Slider'),
            h('button', {
              onClick: function() { upd({ mode: 'freeform', challenge: null, feedback: null }); },
              className: 'px-3 py-1 rounded-md text-xs font-bold transition-all ' + (!isSlider ? 'bg-white text-indigo-700 shadow-sm' : 'text-emerald-500 hover:text-emerald-700')
            }, '\uD83E\uDDF1 Freeform')),
          // Paint toggle
          h('button', {
            onClick: function() { upd({ paintSurfaceArea: !paintSurfaceArea }); },
            className: 'px-3 py-1 ml-2 rounded-lg text-xs font-bold transition-all border ' + (paintSurfaceArea ? 'bg-orange-100 text-orange-700 border-orange-300 shadow-inner' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50')
          }, paintSurfaceArea ? '🧼 Wash Paint' : '🎨 Paint Surface'),
          // Zoom
          h('div', { className: 'flex items-center gap-1' },
            h('button', { onClick: function() { upd({ scale: Math.max(0.4, scale - 0.15) }); }, className: 'w-7 h-7 rounded-full bg-white border border-emerald-300 text-emerald-700 font-bold text-sm hover:bg-emerald-100 flex items-center justify-center' }, '\u2212'),
            h('span', { className: 'text-[10px] text-emerald-600 font-mono w-10 text-center' }, Math.round(scale*100)+'%'),
            h('button', { onClick: function() { upd({ scale: Math.min(2.5, scale + 0.15) }); }, className: 'w-7 h-7 rounded-full bg-white border border-emerald-300 text-emerald-700 font-bold text-sm hover:bg-emerald-100 flex items-center justify-center' }, '+'),
            h('button', { onClick: function() { upd({ rotation: { x: -25, y: -35 }, scale: 1.0 }); }, className: 'ml-1 px-2 py-1 rounded-md bg-white border border-emerald-300 text-emerald-700 font-bold text-[10px] hover:bg-emerald-100' }, '\u21BA'))
        ),

        // Sliders (slider mode)
        isSlider && h('div', { className: 'grid grid-cols-3 gap-3' },
          ['l','w','h'].map(function(dim) {
            return h('div', { key: dim, className: 'bg-emerald-50 rounded-lg p-3 border border-emerald-100' },
              h('label', { className: 'block text-xs text-emerald-700 mb-1 font-bold uppercase' },
                dim === 'l' ? 'Length' : dim === 'w' ? 'Width' : 'Height'),
              h('input', {
                type: 'range', min: '1', max: '10', value: dims[dim],
                onChange: function(e) {
                  var nd = Object.assign({}, dims);
                  nd[dim] = parseInt(e.target.value);
                  upd({ dims: nd, challenge: null, feedback: null, showLayers: null });
                },
                className: 'w-full h-2 bg-emerald-200 rounded-lg appearance-none cursor-pointer accent-emerald-600'
              }),
              h('div', { className: 'text-center text-lg font-bold text-emerald-700 mt-1' }, dims[dim])
            );
          })
        ),

        // Freeform instructions
        !isSlider && h('div', { className: 'flex items-center gap-2 bg-indigo-50 rounded-lg p-2 border border-indigo-100' },
          h('p', { className: 'text-xs text-indigo-600 flex-1' }, '\uD83D\uDC49 Click grid to place cubes \u2022 Click cube to remove \u2022 Click above to stack'),
          h('button', {
            onClick: function() { upd({ positions: [], builderChallenge: null, builderFeedback: null }); },
            className: 'px-3 py-1.5 text-xs font-bold bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300'
          }, '\u21BA Clear All')
        ),

        // 3D viewport
        h('div', {
          className: 'bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl border-2 border-emerald-300/30 flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing select-none',
          style: { minHeight: '350px', perspective: '900px' },
          onMouseDown: handleMouseDown,
          onWheel: function(e) { e.preventDefault(); upd({ scale: Math.max(0.4, Math.min(2.5, scale + (e.deltaY > 0 ? -0.08 : 0.08))) }); }
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
            type: 'range', min: '1', max: dims.h,
            value: showLayers != null ? showLayers : dims.h,
            onChange: function(e) { upd({ showLayers: parseInt(e.target.value) }); },
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
            h('div', { className: 'text-xs text-slate-400' }, volume + ' unit cube' + (volume !== 1 ? 's' : ''))
          ),
          h('div', { className: 'bg-white rounded-xl p-3 border border-teal-100 text-center' },
            h('div', { className: 'text-xs font-bold text-teal-600 uppercase mb-1' }, 'Surface Area'),
            h('div', { className: 'text-xl font-bold text-teal-800' },
              'SA = ', h('span', { className: 'text-2xl text-teal-600' },
                (isSlider && challenge && !feedback) ? '?' :
                (!isSlider && builderChallenge && builderChallenge.type === 'volume') ? '?' : surfaceArea)),
            isSlider && !challenge && h('div', { className: 'text-xs text-slate-400' },
              '2('+dims.l+'\u00d7'+dims.w+' + '+dims.l+'\u00d7'+dims.h+' + '+dims.w+'\u00d7'+dims.h+')')
          )
        ),

        // Challenge buttons
        h('div', { className: 'flex gap-2 flex-wrap' },
          isSlider ? h(React.Fragment, null,
            h('button', {
              onClick: function() {
                var l = Math.floor(Math.random()*8)+1, w = Math.floor(Math.random()*6)+1, hh = Math.floor(Math.random()*6)+1;
                upd({ dims: {l:l,w:w,h:hh}, challenge: {l:l,w:w,h:hh,answer:l*w*hh}, answer: '', feedback: null, showLayers: null });
              },
              className: 'flex-1 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-lg text-sm hover:from-emerald-600 hover:to-teal-600 transition-all shadow-md'
            }, '\uD83C\uDFB2 Random Challenge'),
            h('button', {
              onClick: function() { upd({ dims: {l:3,w:2,h:2}, challenge: null, feedback: null, showLayers: null, rotation: {x:-25,y:-35}, scale: 1.0 }); },
              className: 'px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300'
            }, '\u21BA Reset')
          ) : h(React.Fragment, null,
            h('button', {
              onClick: function() {
                var l=2+Math.floor(Math.random()*4), w=2+Math.floor(Math.random()*3), hh=1+Math.floor(Math.random()*3);
                upd({ mode: 'freeform', positions: [], builderChallenge: {type:'prism',target:{l:l,w:w,h:hh},answer:l*w*hh}, builderFeedback: null, challenge: null, feedback: null });
              },
              className: 'flex-1 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold rounded-lg text-sm hover:from-blue-600 hover:to-indigo-600 transition-all shadow-md'
            }, '\uD83C\uDFD7\uFE0F Build Prism'),
            h('button', {
              onClick: function() {
                var lb = generateLBlock();
                upd({ mode: 'freeform', positions: lb.positions, builderChallenge: {type:'volume',answer:lb.volume,shape:'L-Block'}, builderFeedback: null, challenge: null, feedback: null });
              },
              className: 'flex-1 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white font-bold rounded-lg text-sm hover:from-violet-600 hover:to-purple-600 transition-all shadow-md'
            }, '\uD83D\uDCD0 L-Block Vol'),
            h('button', {
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
              placeholder: 'V = ?', className: 'flex-1 px-3 py-2 border border-amber-300 rounded-lg text-sm font-mono'
            }),
            h('button', {
              onClick: checkChallenge, disabled: !answer,
              className: 'px-4 py-2 bg-amber-500 text-white font-bold rounded-lg text-sm disabled:opacity-40'
            }, 'Check')
          ),
          feedback && h('p', { className: 'text-sm font-bold mt-2 ' + (feedback.correct ? 'text-green-600' : 'text-red-600') }, feedback.msg)
        ),

        // Builder challenge (freeform mode)
        !isSlider && builderChallenge && h('div', { className: 'bg-indigo-50 rounded-lg p-3 border border-indigo-200' },
          h('p', { className: 'text-sm font-bold text-indigo-800 mb-2' },
            builderChallenge.type === 'prism'
              ? '\uD83C\uDFD7\uFE0F Build a '+builderChallenge.target.l+'\u00d7'+builderChallenge.target.w+'\u00d7'+builderChallenge.target.h+' rectangular prism'
              : builderChallenge.shape === 'L-Block'
                ? '\uD83D\uDCD0 What is the volume of this L-shaped block?'
                : '\uD83C\uDFB2 Build a shape with volume = '+builderChallenge.answer
          ),
          h('div', { className: 'flex gap-2 items-center' },
            h('span', { className: 'text-xs text-indigo-600' }, 'Cubes placed: ', h('span', { className: 'font-bold' }, posSet.size)),
            h('button', { onClick: checkChallenge, className: 'ml-auto px-4 py-1.5 bg-indigo-500 text-white font-bold rounded-lg text-sm hover:bg-indigo-600' }, '\u2714 Check')
          ),
          builderFeedback && h('p', { className: 'text-sm font-bold mt-2 ' + (builderFeedback.correct ? 'text-green-600' : 'text-red-600') }, builderFeedback.msg)
        )
      );
    }
  });
})();
