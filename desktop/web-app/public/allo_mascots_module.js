/* allo_mascots_module.js — shared AlloFlow mascots (Pip, Cogsworth, Vex, Mochi, Inko).
 * Copied from stem_lab/stem_tool_typingpractice.js (renderers 1036-1801 and its mascot CSS) on 2026-11-07
 * by tmp make_allo_mascots_module.cjs, so tools such as Word Sounds can show a mascot without loading
 * the Typing Lab. Same window.AlloMascots API; whichever file loads first owns it (__locked).
 * Additions: opts.idSuffix keeps gradient ids unique when one mascot is on screen twice, and the
 * mascot CSS is injected here on its own (no app-wide rules). */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  if (window.AlloModules && window.AlloModules.AlloMascotsModule) return;
  window.AlloModules = window.AlloModules || {};

  function _renderPip(opts) {
    var React = window.React;
    var h = React.createElement;
    var st = opts.state || 'idle';
    var sz = opts.size || 64;
    var bodyColor = opts.bodyColor || '#fde047';     // soft yellow
    var beakColor = opts.beakColor || '#fb923c';     // warm orange
    var legColor = opts.legColor || '#f97316';
    var eyeColor = '#0f172a';
    var cls = 'tp-mascot tp-mascot-pip tp-mascot-' + st;
    return h('svg', {
      width: sz, height: sz, viewBox: '0 0 100 100', className: cls,
      role: 'img', 'aria-label': opts.label || 'Pip the typing chick',
      style: { display: 'block', overflow: 'visible' }
    },
      h('defs', null,
        // Gradient for Pip's body - 3D volume radial highlight
        h('radialGradient', { id: 'tp-grad-pip-body', cx: '35%', cy: '35%', r: '65%' },
          h('stop', { offset: '0%', stopColor: '#fffbeb' }),
          h('stop', { offset: '45%', stopColor: bodyColor }),
          h('stop', { offset: '100%', stopColor: '#d97706' })
        ),
        // Gradient for Pip's wings
        h('linearGradient', { id: 'tp-grad-pip-wing', x1: '0%', y1: '0%', x2: '100%', y2: '100%' },
          h('stop', { offset: '0%', stopColor: '#fef08a' }),
          h('stop', { offset: '100%', stopColor: '#eab308' })
        ),
        // Soft pink blush gradient for cheeks
        h('radialGradient', { id: 'tp-grad-pip-cheek', cx: '50%', cy: '50%', r: '50%' },
          h('stop', { offset: '0%', stopColor: '#fda4af', stopOpacity: 0.95 }),
          h('stop', { offset: '100%', stopColor: '#fda4af', stopOpacity: 0 })
        )
      ),
      // Floating Z's — only visible in sleep state via CSS
      h('text', { x: 70, y: 30, fill: '#94a3b8', fontSize: 8, fontWeight: 700, opacity: 0, className: 'tp-mascot-z' }, 'z'),
      h('text', { x: 76, y: 22, fill: '#94a3b8', fontSize: 6, fontWeight: 700, opacity: 0, className: 'tp-mascot-z tp-mascot-z-2' }, 'z'),
      // Legs
      h('g', { className: 'tp-pip-legs' },
        h('g', { className: 'tp-pip-leg-l', style: { transformOrigin: '42px 80px', transformBox: 'fill-box' } },
          h('line', { x1: 42, y1: 80, x2: 42, y2: 92, stroke: legColor, strokeWidth: 3, strokeLinecap: 'round' }),
          h('path', { d: 'M 38 92 L 42 92 L 46 92', stroke: legColor, strokeWidth: 2.5, strokeLinecap: 'round', fill: 'none' })
        ),
        h('g', { className: 'tp-pip-leg-r', style: { transformOrigin: '58px 80px', transformBox: 'fill-box' } },
          h('line', { x1: 58, y1: 80, x2: 58, y2: 92, stroke: legColor, strokeWidth: 3, strokeLinecap: 'round' }),
          h('path', { d: 'M 54 92 L 58 92 L 62 92', stroke: legColor, strokeWidth: 2.5, strokeLinecap: 'round', fill: 'none' })
        )
      ),
      // Tiny ribbon bowtie around the neck
      h('g', { className: 'tp-pip-bowtie', style: { transformOrigin: '50px 72px', transformBox: 'fill-box' } },
        h('polygon', { points: '42,69 48,72 42,75', fill: '#ef4444', stroke: '#b91c1c', strokeWidth: 0.5 }),
        h('polygon', { points: '58,69 52,72 58,75', fill: '#ef4444', stroke: '#b91c1c', strokeWidth: 0.5 }),
        h('circle', { cx: 50, cy: 72, r: 2.5, fill: '#ef4444', stroke: '#b91c1c', strokeWidth: 0.5 })
      ),
      // Body — round yellow blob. Class lets danger state add a subtle puff.
      h('ellipse', { cx: 50, cy: 56, rx: 30, ry: 28, fill: 'url(#tp-grad-pip-body)', stroke: '#ca8a04', strokeWidth: 1.5, className: 'tp-pip-body', style: { transformOrigin: '50px 56px', transformBox: 'fill-box' } }),
      // Head Sprout - cute leaves that sway gently on top of the head
      h('g', { className: 'tp-pip-sprout', style: { transformOrigin: '50px 28px', transformBox: 'fill-box' } },
        h('path', { d: 'M 50 28 Q 48 20 44 18 Q 48 16 50 24', fill: '#4ade80', stroke: '#15803d', strokeWidth: 1, strokeLinecap: 'round' }),
        h('path', { d: 'M 50 28 Q 52 18 56 16 Q 54 14 50 24', fill: '#4ade80', stroke: '#15803d', strokeWidth: 1, strokeLinecap: 'round' })
      ),
      // Left wing — flaps in combo via CSS rotate around shoulder pivot
      h('path', { d: 'M 26 56 Q 22 64 30 70 L 36 64 Z', fill: 'url(#tp-grad-pip-wing)', stroke: '#ca8a04', strokeWidth: 0.8, opacity: 0.95, className: 'tp-pip-wing tp-pip-wing-l', style: { transformOrigin: '32px 60px', transformBox: 'fill-box' } }),
      // Right wing — symmetrical, opposite phase so the flap reads as bilateral
      h('path', { d: 'M 74 56 Q 78 64 70 70 L 64 64 Z', fill: 'url(#tp-grad-pip-wing)', stroke: '#ca8a04', strokeWidth: 0.8, opacity: 0.95, className: 'tp-pip-wing tp-pip-wing-r', style: { transformOrigin: '68px 60px', transformBox: 'fill-box' } }),
      // Eye whites + pupils
      h('g', { className: 'tp-pip-eyes' },
        h('circle', { cx: 42, cy: 50, r: 5.5, fill: '#fff' }),
        h('circle', { cx: 58, cy: 50, r: 5.5, fill: '#fff' }),
        // Pupils with glassy reflections
        h('g', { className: 'tp-pip-pupils' },
          h('circle', { cx: 43, cy: 51, r: 2.8, fill: eyeColor, className: 'tp-pip-pupil-l' }),
          h('circle', { cx: 59, cy: 51, r: 2.8, fill: eyeColor, className: 'tp-pip-pupil-r' }),
          // Specular highlights
          h('circle', { cx: 41.8, cy: 49.8, r: 1, fill: '#fff' }),
          h('circle', { cx: 57.8, cy: 49.8, r: 1, fill: '#fff' }),
          h('circle', { cx: 44.2, cy: 52.2, r: 0.5, fill: '#fff' }),
          h('circle', { cx: 60.2, cy: 52.2, r: 0.5, fill: '#fff' })
        )
      ),
      // Beak — diamond pointing down. Class lets it open slightly during
      // attack-out (the chirp / peck moment) via CSS scaleY.
      h('polygon', { points: '50,58 45,62 55,62', fill: beakColor, stroke: '#c2410c', strokeWidth: 1, className: 'tp-pip-beak', style: { transformOrigin: '50px 60px', transformBox: 'fill-box' } }),
      // Cheek-tuft feathers — class lets them puff in danger state, colored with radial pink blush
      h('circle', { cx: 30, cy: 62, r: 5, fill: 'url(#tp-grad-pip-cheek)', className: 'tp-pip-cheek tp-pip-cheek-l' }),
      h('circle', { cx: 70, cy: 62, r: 5, fill: 'url(#tp-grad-pip-cheek)', className: 'tp-pip-cheek tp-pip-cheek-r' })
    );
  }

  function _renderCogsworth(opts) {
    var React = window.React;
    var h = React.createElement;
    var st = opts.state || 'idle';
    var sz = opts.size || 64;
    var bodyColor = opts.bodyColor || '#a16207';     // warm brass
    var brassLight = '#ca8a04';
    var brassDark = '#713f12';
    var goggleRim = '#854d0e';
    var lensColor = opts.eyeColor || '#fef3c7';      // pale lamp glow
    var cls = 'tp-mascot tp-mascot-cogsworth tp-mascot-' + st;
    return h('svg', {
      width: sz, height: sz, viewBox: '0 0 100 100', className: cls,
      role: 'img', 'aria-label': opts.label || 'Cogsworth the clockwork owl',
      style: { display: 'block', overflow: 'visible' }
    },
      h('defs', null,
        // Metallic brass gradient (3D cylinder effect)
        h('linearGradient', { id: 'tp-grad-brass', x1: '0%', y1: '0%', x2: '100%', y2: '100%' },
          h('stop', { offset: '0%', stopColor: '#fef08a' }),
          h('stop', { offset: '40%', stopColor: '#eab308' }),
          h('stop', { offset: '80%', stopColor: '#a16207' }),
          h('stop', { offset: '100%', stopColor: '#713f12' })
        ),
        // Metallic copper gradient
        h('linearGradient', { id: 'tp-grad-copper', x1: '0%', y1: '100%', x2: '100%', y2: '0%' },
          h('stop', { offset: '0%', stopColor: '#7c2d12' }),
          h('stop', { offset: '50%', stopColor: '#ea580c' }),
          h('stop', { offset: '100%', stopColor: '#ffedd5' })
        ),
        // Glowing cyan lamp lens gradient
        h('radialGradient', { id: 'tp-grad-lens', cx: '45%', cy: '45%', r: '55%' },
          h('stop', { offset: '0%', stopColor: '#ffffff' }),
          h('stop', { offset: '30%', stopColor: '#e0f2fe' }),
          h('stop', { offset: '70%', stopColor: '#38bdf8' }),
          h('stop', { offset: '100%', stopColor: '#0369a1' })
        ),
        // Dial gradient for gauge
        h('radialGradient', { id: 'tp-grad-dial', cx: '50%', cy: '50%', r: '50%' },
          h('stop', { offset: '75%', stopColor: '#ffffff' }),
          h('stop', { offset: '90%', stopColor: '#e2e8f0' }),
          h('stop', { offset: '100%', stopColor: '#94a3b8' })
        )
      ),
      // Steam puff (decorative — animated when in combo state)
      h('g', { className: 'tp-cog-steam', style: { transformOrigin: '50px 12px' } },
        h('circle', { cx: 44, cy: 14, r: 3.5, fill: '#f1f5f9', opacity: 0 }),
        h('circle', { cx: 50, cy: 8, r: 4, fill: '#f1f5f9', opacity: 0 }),
        h('circle', { cx: 58, cy: 14, r: 3, fill: '#f1f5f9', opacity: 0 })
      ),
      // Chimney pipe on the head
      h('g', { className: 'tp-cog-chimney' },
        h('rect', { x: 47, y: 18, width: 6, height: 7, fill: 'url(#tp-grad-brass)', stroke: brassDark, strokeWidth: 0.8 }),
        h('ellipse', { cx: 50, cy: 18, rx: 4, ry: 1.5, fill: 'url(#tp-grad-copper)', stroke: brassDark, strokeWidth: 0.6 })
      ),
      // Left rotating gear (ear)
      h('g', { className: 'tp-cog-gear-l', style: { transformOrigin: '24px 30px' } },
        h('circle', { cx: 24, cy: 30, r: 8, fill: 'url(#tp-grad-brass)', stroke: brassDark, strokeWidth: 1.5 }),
        h('circle', { cx: 24, cy: 30, r: 3, fill: brassDark }),
        // Six teeth
        [0, 60, 120, 180, 240, 300].map(function(deg, i) {
          var rad = deg * Math.PI / 180;
          var x = 24 + Math.cos(rad) * 10;
          var y = 30 + Math.sin(rad) * 10;
          return h('rect', { key: 'tl' + i, x: x - 1.8, y: y - 1.8, width: 3.6, height: 3.6, fill: 'url(#tp-grad-brass)', stroke: brassDark, strokeWidth: 0.8, transform: 'rotate(' + deg + ' ' + x + ' ' + y + ')' });
        })
      ),
      // Right rotating gear (ear)
      h('g', { className: 'tp-cog-gear-r', style: { transformOrigin: '76px 30px' } },
        h('circle', { cx: 76, cy: 30, r: 8, fill: 'url(#tp-grad-brass)', stroke: brassDark, strokeWidth: 1.5 }),
        h('circle', { cx: 76, cy: 30, r: 3, fill: brassDark }),
        [30, 90, 150, 210, 270, 330].map(function(deg, i) {
          var rad = deg * Math.PI / 180;
          var x = 76 + Math.cos(rad) * 10;
          var y = 30 + Math.sin(rad) * 10;
          return h('rect', { key: 'tr' + i, x: x - 1.8, y: y - 1.8, width: 3.6, height: 3.6, fill: 'url(#tp-grad-brass)', stroke: brassDark, strokeWidth: 0.8, transform: 'rotate(' + deg + ' ' + x + ' ' + y + ')' });
        })
      ),
      // Mechanical Segmented Wings (Left & Right)
      h('g', { className: 'tp-cog-wings' },
        // Left Wing (with transformOrigin at shoulder hinge)
        h('g', { className: 'tp-cog-wing-l', style: { transformOrigin: '24px 55px', transformBox: 'fill-box' } },
          h('path', { d: 'M 24 55 Q 12 52 14 62 L 24 64 Z', fill: 'url(#tp-grad-copper)', stroke: brassDark, strokeWidth: 0.8 }),
          h('path', { d: 'M 24 60 Q 14 62 18 72 L 25 70 Z', fill: 'url(#tp-grad-brass)', stroke: brassDark, strokeWidth: 0.8 })
        ),
        // Right Wing (with transformOrigin at shoulder hinge)
        h('g', { className: 'tp-cog-wing-r', style: { transformOrigin: '76px 55px', transformBox: 'fill-box' } },
          h('path', { d: 'M 76 55 Q 88 52 86 62 L 76 64 Z', fill: 'url(#tp-grad-copper)', stroke: brassDark, strokeWidth: 0.8 }),
          h('path', { d: 'M 76 60 Q 86 62 82 72 L 75 70 Z', fill: 'url(#tp-grad-brass)', stroke: brassDark, strokeWidth: 0.8 })
        )
      ),
      // Owl body
      h('ellipse', { cx: 50, cy: 60, rx: 26, ry: 28, fill: 'url(#tp-grad-brass)', stroke: brassDark, strokeWidth: 2, className: 'tp-cog-body' }),
      // Riveted brass plate chest panels (Left/Right)
      h('path', { d: 'M 50 32 A 26 28 0 0 0 24 60 A 26 28 0 0 0 50 88 Z', fill: 'none', stroke: brassDark, strokeWidth: 1, strokeDasharray: '2,4', opacity: 0.85 }),
      h('path', { d: 'M 50 32 A 26 28 0 0 1 76 60 A 26 28 0 0 1 50 88 Z', fill: 'none', stroke: brassDark, strokeWidth: 1, strokeDasharray: '2,4', opacity: 0.85 }),
      // Brass plate chest seam
      h('line', { x1: 50, y1: 32, x2: 50, y2: 88, stroke: brassDark, strokeWidth: 1.5, opacity: 0.6 }),
      // Pendulum — small brass weight visible behind chest seam
      h('g', { className: 'tp-cog-pendulum', style: { transformOrigin: '50px 50px', transformBox: 'fill-box' } },
        h('line', { x1: 50, y1: 50, x2: 50, y2: 78, stroke: brassDark, strokeWidth: 0.8, opacity: 0.7 }),
        h('circle', { cx: 50, cy: 78, r: 2.2, fill: 'url(#tp-grad-copper)', stroke: brassDark, strokeWidth: 0.8 })
      ),
      // Pressure Gauge on chest (replace simple rivets with interactive steam dial)
      h('g', { className: 'tp-cog-gauge-panel' },
        h('circle', { cx: 50, cy: 66, r: 7, fill: 'url(#tp-grad-dial)', stroke: brassDark, strokeWidth: 1 }),
        // Ticks
        h('line', { x1: 45, y1: 66, x2: 46.5, y2: 66, stroke: brassDark, strokeWidth: 0.6 }),
        h('line', { x1: 55, y1: 66, x2: 53.5, y2: 66, stroke: brassDark, strokeWidth: 0.6 }),
        h('line', { x1: 50, y1: 61, x2: 50, y2: 62.5, stroke: brassDark, strokeWidth: 0.6 }),
        h('line', { x1: 50, y1: 71, x2: 50, y2: 69.5, stroke: brassDark, strokeWidth: 0.6 }),
        // Shaking needle
        h('line', { x1: 50, y1: 66, x2: 52, y2: 61.5, stroke: '#ef4444', strokeWidth: 1, strokeLinecap: 'round', className: 'tp-cog-needle' }),
        h('circle', { cx: 50, cy: 66, r: 1.2, fill: brassDark })
      ),
      // Goggles — round brass-rim circles with lamp-glow lenses
      h('g', { className: 'tp-cog-eyes' },
        h('circle', { cx: 40, cy: 52, r: 9, fill: 'url(#tp-grad-lens)', stroke: goggleRim, strokeWidth: 2.5 }),
        h('circle', { cx: 60, cy: 52, r: 9, fill: 'url(#tp-grad-lens)', stroke: goggleRim, strokeWidth: 2.5 }),
        h('circle', { cx: 40, cy: 52, r: 3, fill: '#0f172a' }),
        h('circle', { cx: 60, cy: 52, r: 3, fill: '#0f172a' }),
        // Goggle highlight
        h('circle', { cx: 38, cy: 50, r: 1.5, fill: '#fff', opacity: 0.8 }),
        h('circle', { cx: 58, cy: 50, r: 1.5, fill: '#fff', opacity: 0.8 })
      ),
      // Beak
      h('polygon', { points: '50,62 46,68 54,68', fill: brassDark, stroke: '#451a03', strokeWidth: 1 })
    );
  }

  function _renderVex(opts) {
    var React = window.React;
    var h = React.createElement;
    var st = opts.state || 'idle';
    var sz = opts.size || 64;
    var bodyColor = opts.bodyColor || '#06b6d4';     // neon cyan
    var glowColor = '#67e8f9';
    var bgColor = opts.bgColor || '#020617';         // near-black panel
    var alertColor = '#ef4444';
    var cls = 'tp-mascot tp-mascot-vex tp-mascot-' + st;
    return h('svg', {
      width: sz, height: sz, viewBox: '0 0 100 100', className: cls,
      role: 'img', 'aria-label': opts.label || 'Vex the cyberpunk grid-face',
      style: { display: 'block', overflow: 'visible' }
    },
      h('defs', null,
        // Neon grid pattern for Vex background face plate
        h('pattern', { id: 'tp-vex-grid', width: 8, height: 8, patternUnits: 'userSpaceOnUse' },
          h('path', { d: 'M 8 0 L 0 0 0 8', fill: 'none', stroke: '#083344', strokeWidth: 0.5 })
        ),
        // Neon Linear Gradient
        h('linearGradient', { id: 'tp-grad-vex-neon', x1: '0%', y1: '0%', x2: '100%', y2: '100%' },
          h('stop', { offset: '0%', stopColor: '#06b6d4' }),
          h('stop', { offset: '50%', stopColor: '#a855f7' }),
          h('stop', { offset: '100%', stopColor: '#ec4899' })
        ),
        // Visor glass gradient
        h('linearGradient', { id: 'tp-grad-vex-visor', x1: '0%', y1: '0%', x2: '0%', y2: '100%' },
          h('stop', { offset: '0%', stopColor: '#0f172a' }),
          h('stop', { offset: '100%', stopColor: '#1e1b4b' })
        )
      ),
      // Floating Cyber Sparks / Particles (cyan & magenta)
      h('g', { className: 'tp-vex-sparks' },
        h('rect', { x: 18, y: 15, width: 2, height: 2, fill: '#ec4899', className: 'tp-vex-spark', style: { '--dx': '-12px', '--dy': '-10px', animationDelay: '0.2s' } }),
        h('rect', { x: 82, y: 22, width: 1.5, height: 1.5, fill: '#06b6d4', className: 'tp-vex-spark', style: { '--dx': '15px', '--dy': '-12px', animationDelay: '0.8s' } }),
        h('polygon', { points: '84,55 86,57 84,59 82,57', fill: '#ec4899', className: 'tp-vex-spark', style: { '--dx': '12px', '--dy': '14px', animationDelay: '1.4s' } }),
        h('rect', { x: 12, y: 62, width: 2, height: 2, fill: '#06b6d4', className: 'tp-vex-spark', style: { '--dx': '-14px', '--dy': '10px', animationDelay: '2s' } })
      ),
      // Hex/diamond face panel — gets hue-shift / clip distortion on attack
      h('polygon', {
        points: '50,8 86,30 86,70 50,92 14,70 14,30',
        fill: bgColor, stroke: 'url(#tp-grad-vex-neon)', strokeWidth: 2,
        className: 'tp-vex-panel',
        style: { transformOrigin: '50px 50px', transformBox: 'fill-box' }
      }),
      // Neon grid fill on the face panel
      h('polygon', {
        points: '50,10 84,31 84,69 50,90 16,69 16,31',
        fill: 'url(#tp-vex-grid)', opacity: 0.8, pointerEvents: 'none'
      }),
      // Outer rim glow ring — duplicate hex outline that pulses brighter on combo
      h('polygon', {
        points: '50,4 90,28 90,72 50,96 10,72 10,28',
        fill: 'none', stroke: bodyColor, strokeWidth: 0.8, opacity: 0,
        className: 'tp-vex-rim'
      }),
      // Inner face panel (slightly smaller, neon outlined)
      h('polygon', {
        points: '50,16 78,34 78,66 50,84 22,66 22,34',
        fill: 'none', stroke: 'url(#tp-grad-vex-neon)', strokeWidth: 0.8, opacity: 0.4
      }),
      // PCB Circuit Tracks on face plate
      h('g', { className: 'tp-vex-circuits', opacity: 0.35 },
        h('path', { d: 'M 20 32 L 32 32 L 38 38', stroke: glowColor, strokeWidth: 0.8, fill: 'none' }),
        h('circle', { cx: 38, cy: 38, r: 1.2, fill: glowColor }),
        h('path', { d: 'M 80 32 L 68 32 L 62 38', stroke: glowColor, strokeWidth: 0.8, fill: 'none' }),
        h('circle', { cx: 62, cy: 38, r: 1.2, fill: glowColor }),
        h('path', { d: 'M 20 68 L 32 68 L 35 62', stroke: glowColor, strokeWidth: 0.8, fill: 'none' }),
        h('circle', { cx: 35, cy: 62, r: 1.2, fill: glowColor }),
        h('path', { d: 'M 80 68 L 68 68 L 65 62', stroke: glowColor, strokeWidth: 0.8, fill: 'none' }),
        h('circle', { cx: 65, cy: 62, r: 1.2, fill: glowColor })
      ),
      // Boot-strip dots
      h('g', { className: 'tp-vex-boot' },
        h('rect', { x: 38, y: 88, width: 4, height: 2, fill: bodyColor, opacity: 0, className: 'tp-vex-boot-dot tp-vex-boot-1' }),
        h('rect', { x: 48, y: 88, width: 4, height: 2, fill: bodyColor, opacity: 0, className: 'tp-vex-boot-dot tp-vex-boot-2' }),
        h('rect', { x: 58, y: 88, width: 4, height: 2, fill: bodyColor, opacity: 0, className: 'tp-vex-boot-dot tp-vex-boot-3' })
      ),
      // Scanline (animated — single horizontal bar that drifts vertically)
      h('rect', {
        x: 22, y: 32, width: 56, height: 1.5, fill: glowColor, opacity: 0.5,
        className: 'tp-vex-scanline'
      }),
      // Visor Eye Frame
      h('g', { className: 'tp-vex-eyes' },
        h('rect', { x: 28, y: 44, width: 44, height: 12, rx: 3, fill: 'url(#tp-grad-vex-visor)', stroke: 'url(#tp-grad-vex-neon)', strokeWidth: 1.5 }),
        // Equalizer Visor Bars (Replacing simple static lines)
        h('g', { className: 'tp-vex-eq' },
          h('rect', { x: 34, y: 46, width: 4, height: 8, rx: 1, fill: bodyColor, className: 'tp-vex-eq-1', style: { transformOrigin: '36px 54px' } }),
          h('rect', { x: 42, y: 46, width: 4, height: 8, rx: 1, fill: '#ec4899', className: 'tp-vex-eq-2', style: { transformOrigin: '44px 54px' } }),
          h('rect', { x: 50, y: 46, width: 4, height: 8, rx: 1, fill: glowColor, className: 'tp-vex-eq-3', style: { transformOrigin: '52px 54px' } }),
          h('rect', { x: 58, y: 46, width: 4, height: 8, rx: 1, fill: '#ec4899', className: 'tp-vex-eq-4', style: { transformOrigin: '60px 54px' } }),
          h('rect', { x: 66, y: 46, width: 4, height: 8, rx: 1, fill: bodyColor, className: 'tp-vex-eq-5', style: { transformOrigin: '68px 54px' } })
        )
      ),
      // Mouth grid (3x3 dot pattern)
      h('g', { className: 'tp-vex-mouth' },
        [0, 1, 2].map(function(row) {
          return [0, 1, 2].map(function(col) {
            return h('circle', {
              key: 'd-' + row + '-' + col,
              cx: 42 + col * 8, cy: 65 + row * 5, r: 1.5,
              fill: bodyColor, opacity: 0.6 + (row * 0.15)
            });
          });
        })
      ),
      // Corner glow chevrons
      h('polyline', { points: '20,28 14,30 14,36', fill: 'none', stroke: bodyColor, strokeWidth: 1.5, opacity: 0.6 }),
      h('polyline', { points: '80,28 86,30 86,36', fill: 'none', stroke: bodyColor, strokeWidth: 1.5, opacity: 0.6 }),
      h('polyline', { points: '14,64 14,70 20,72', fill: 'none', stroke: bodyColor, strokeWidth: 1.5, opacity: 0.6 }),
      h('polyline', { points: '86,64 86,70 80,72', fill: 'none', stroke: bodyColor, strokeWidth: 1.5, opacity: 0.6 }),
      // Alert overlay (red — only shows in incoming state via CSS opacity)
      h('polygon', {
        points: '50,8 86,30 86,70 50,92 14,70 14,30',
        fill: alertColor, opacity: 0,
        className: 'tp-vex-alert'
      })
    );
  }

  function _renderMochi(opts) {
    var React = window.React;
    var h = React.createElement;
    var st = opts.state || 'idle';
    var sz = opts.size || 64;
    var bodyColor = opts.bodyColor || '#fce7f3';     // pastel pink-cream
    var trimColor = '#f9a8d4';
    var bowColor = '#ec4899';
    var eyeColor = '#0f172a';
    var cheekColor = '#fbcfe8';
    var cls = 'tp-mascot tp-mascot-mochi tp-mascot-' + st;
    return h('svg', {
      width: sz, height: sz, viewBox: '0 0 100 100', className: cls,
      role: 'img', 'aria-label': opts.label || 'Mochi the kawaii kitten',
      style: { display: 'block', overflow: 'visible' }
    },
      h('defs', null,
        // Head creamy pink radial gradient
        h('radialGradient', { id: 'tp-grad-mochi-body', cx: '45%', cy: '40%', r: '60%' },
          h('stop', { offset: '0%', stopColor: '#fff1f2' }),
          h('stop', { offset: '70%', stopColor: bodyColor }),
          h('stop', { offset: '100%', stopColor: '#f472b6' })
        ),
        // Inner ear linear gradient
        h('linearGradient', { id: 'tp-grad-mochi-ear', x1: '0%', y1: '100%', x2: '100%', y2: '0%' },
          h('stop', { offset: '0%', stopColor: '#fbcfe8' }),
          h('stop', { offset: '100%', stopColor: '#fda4af' })
        ),
        // Gold bell radial gradient
        h('radialGradient', { id: 'tp-grad-mochi-bell', cx: '35%', cy: '35%', r: '65%' },
          h('stop', { offset: '0%', stopColor: '#fef08a' }),
          h('stop', { offset: '50%', stopColor: '#facc15' }),
          h('stop', { offset: '100%', stopColor: '#b45309' })
        ),
        // Cheek radial gradient
        h('radialGradient', { id: 'tp-grad-mochi-cheek', cx: '50%', cy: '50%', r: '50%' },
          h('stop', { offset: '0%', stopColor: '#fbcfe8', stopOpacity: 0.95 }),
          h('stop', { offset: '100%', stopColor: '#fbcfe8', stopOpacity: 0 })
        )
      ),
      // Floating sparkles (animated only on combo) + heart particles for combo
      h('g', { className: 'tp-mochi-sparkles' },
        h('text', { x: 18, y: 22, fill: bowColor, fontSize: 8, opacity: 0 }, '✦'),
        h('text', { x: 78, y: 28, fill: bowColor, fontSize: 6, opacity: 0 }, '✦'),
        h('text', { x: 14, y: 70, fill: bowColor, fontSize: 7, opacity: 0 }, '✧'),
        h('text', { x: 82, y: 76, fill: bowColor, fontSize: 8, opacity: 0 }, '♡')
      ),
      h('g', { className: 'tp-mochi-hearts' },
        h('text', { x: 12, y: 40, fill: bowColor, fontSize: 9, opacity: 0 }, '♡'),
        h('text', { x: 86, y: 44, fill: bowColor, fontSize: 8, opacity: 0 }, '♡'),
        h('text', { x: 50, y: 14, fill: bowColor, fontSize: 7, opacity: 0 }, '♡')
      ),
      // Tail — curls behind the head, sways in idle.
      h('path', {
        d: 'M 78 78 Q 88 76 92 64 Q 88 70 84 74',
        fill: 'none', stroke: trimColor, strokeWidth: 3, strokeLinecap: 'round',
        opacity: 0.85, className: 'tp-mochi-tail',
        style: { transformOrigin: '78px 78px', transformBox: 'fill-box' }
      }),
      // Left ear (triangle with pink inner)
      h('g', { className: 'tp-mochi-ear-l', style: { transformOrigin: '24px 40px', transformBox: 'fill-box' } },
        h('polygon', { points: '24,40 28,16 42,32', fill: 'url(#tp-grad-mochi-body)', stroke: trimColor, strokeWidth: 1.5 }),
        h('polygon', { points: '28,32 30,22 38,30', fill: 'url(#tp-grad-mochi-ear)' })
      ),
      // Right ear
      h('g', { className: 'tp-mochi-ear-r', style: { transformOrigin: '76px 40px', transformBox: 'fill-box' } },
        h('polygon', { points: '76,40 72,16 58,32', fill: 'url(#tp-grad-mochi-body)', stroke: trimColor, strokeWidth: 1.5 }),
        h('polygon', { points: '72,32 70,22 62,30', fill: 'url(#tp-grad-mochi-ear)' })
      ),
      // Head — round
      h('circle', { cx: 50, cy: 56, r: 30, fill: 'url(#tp-grad-mochi-body)', stroke: trimColor, strokeWidth: 1.8, className: 'tp-mochi-head' }),
      // Cheeks
      h('circle', { cx: 32, cy: 64, r: 5, fill: 'url(#tp-grad-mochi-cheek)' }),
      h('circle', { cx: 68, cy: 64, r: 5, fill: 'url(#tp-grad-mochi-cheek)' }),
      // Eyes — big sparkly with refined specular highlights
      h('g', { className: 'tp-mochi-eyes' },
        h('ellipse', { cx: 40, cy: 54, rx: 4.5, ry: 6, fill: eyeColor, className: 'tp-mochi-eye-l', style: { transformOrigin: '40px 54px', transformBox: 'fill-box' } }),
        h('ellipse', { cx: 60, cy: 54, rx: 4.5, ry: 6, fill: eyeColor, className: 'tp-mochi-eye-r', style: { transformOrigin: '60px 54px', transformBox: 'fill-box' } }),
        // Shiny anime-style reflections
        h('circle', { cx: 41.5, cy: 51, r: 1.5, fill: '#fff' }),
        h('circle', { cx: 61.5, cy: 51, r: 1.5, fill: '#fff' }),
        h('circle', { cx: 38.5, cy: 56.5, r: 0.8, fill: '#fff' }),
        h('circle', { cx: 58.5, cy: 56.5, r: 0.8, fill: '#fff' }),
        h('circle', { cx: 42, cy: 55, r: 0.5, fill: '#fff', opacity: 0.7 }),
        h('circle', { cx: 62, cy: 55, r: 0.5, fill: '#fff', opacity: 0.7 })
      ),
      // Whiskers — curved paths for a organic soft kawaii look
      h('g', { className: 'tp-mochi-whiskers', stroke: '#475569', strokeWidth: 0.7, strokeLinecap: 'round', fill: 'none', opacity: 0.75 },
        h('path', { d: 'M 22 59 Q 28 61 32 62' }),
        h('path', { d: 'M 21 63 Q 28 64 32 64' }),
        h('path', { d: 'M 22 67 Q 28 66 31 66' }),
        h('path', { d: 'M 78 59 Q 72 61 68 62' }),
        h('path', { d: 'M 79 63 Q 72 64 68 64' }),
        h('path', { d: 'M 78 67 Q 72 66 69 66' })
      ),
      // Tiny mouth — happy curve
      h('path', { d: 'M 47 66 Q 50 69 53 66', stroke: eyeColor, strokeWidth: 1.5, fill: 'none', strokeLinecap: 'round', className: 'tp-mochi-mouth' }),
      // Tiny nose
      h('path', { d: 'M 49 62 L 51 62 L 50 64 Z', fill: bowColor }),
      // Bow on left ear — wiggles on combo + win via CSS
      h('g', { transform: 'translate(28 14) scale(0.6)', className: 'tp-mochi-bow', style: { transformOrigin: '28px 14px' } },
        h('circle', { cx: 0, cy: 0, r: 4, fill: bowColor }),
        h('polygon', { points: '-7,-4 -2,0 -7,4', fill: bowColor }),
        h('polygon', { points: '7,-4 2,0 7,4', fill: bowColor })
      ),
      // Collar with golden bell
      h('g', { className: 'tp-mochi-collar-group' },
        // Collar ribbon
        h('rect', { x: 38, y: 73, width: 24, height: 3, fill: '#ef4444', rx: 1.5 }),
        // Shiny golden bell
        h('g', { className: 'tp-mochi-bell', style: { transformOrigin: '50px 74.5px', transformBox: 'fill-box' } },
          h('circle', { cx: 50, cy: 74.5, r: 4, fill: 'url(#tp-grad-mochi-bell)', stroke: '#b45309', strokeWidth: 0.6 }),
          h('circle', { cx: 50, cy: 76, r: 1, fill: '#78350f' })
        )
      ),
      // Tiny cute paws peeking up at the bottom
      h('g', { className: 'tp-mochi-paws' },
        h('ellipse', { cx: 40, cy: 82, rx: 4.5, ry: 3.5, fill: '#fff', stroke: trimColor, strokeWidth: 1 }),
        h('ellipse', { cx: 60, cy: 82, rx: 4.5, ry: 3.5, fill: '#fff', stroke: trimColor, strokeWidth: 1 }),
        // Claw details
        h('circle', { cx: 38, cy: 80, r: 0.6, fill: trimColor }),
        h('circle', { cx: 40, cy: 79.5, r: 0.6, fill: trimColor }),
        h('circle', { cx: 42, cy: 80, r: 0.6, fill: trimColor }),
        h('circle', { cx: 58, cy: 80, r: 0.6, fill: trimColor }),
        h('circle', { cx: 60, cy: 79.5, r: 0.6, fill: trimColor }),
        h('circle', { cx: 62, cy: 80, r: 0.6, fill: trimColor })
      ),
      // Tear (only visible in loss state via CSS)
      h('ellipse', { cx: 60, cy: 64, rx: 1.5, ry: 3, fill: '#7dd3fc', opacity: 0, className: 'tp-mochi-tear' })
    );
  }

  // Inko — the oceanic theme cuttlefish. Real cuttlefish are colorblind
  // but change the color of their skin in milliseconds via chromatophores
  // (specialized pigment cells). The mascot honors that: scattered dots
  // across the mantle pulse different hues per game state. W-shaped pupils
  // are the cuttlefish signature — accurate to real anatomy. Eight short
  // arms + two longer feeding tentacles complete the silhouette.
  function _renderInko(opts) {
    var React = window.React;
    var h = React.createElement;
    var st = opts.state || 'idle';
    var sz = opts.size || 64;
    var bodyColor = opts.bodyColor || '#67e8f9';   // pale cyan body base
    var bodyDeep  = '#0e7490';                      // shadow / underbelly
    var mantleEdge = '#22d3ee';                     // mantle outline
    var finColor  = '#a5f3fc';                      // translucent fin
    var eyeWhite  = '#f0fdfa';
    var eyeRing   = '#0c4a6e';
    var inkColor  = '#020617';                      // pupil + ink cloud
    var cls = 'tp-mascot tp-mascot-inko tp-mascot-' + st;

    // Twelve chromatophore dots scattered across the mantle, in two layers.
    // Large dots (r ~2.4) dominate the wave; small "satellite" dots (r ~1.2)
    // sit between them and pulse half-beat off, giving the skin a richer
    // dappled texture. Each dot carries its own animation-delay so the
    // color travels left→right→down across the body rather than blinking in
    // unison. Coordinates avoid eyes + arms and stay inside the mantle path.
    var chromatophores = [
      // Top row — large dots
      { cx: 38, cy: 32, r: 2.2, d: '0s',     small: false },
      { cx: 50, cy: 26, r: 2.6, d: '0.12s',  small: false },
      { cx: 62, cy: 32, r: 2.2, d: '0.24s',  small: false },
      // Top satellite dots
      { cx: 44, cy: 28, r: 1.2, d: '0.06s',  small: true },
      { cx: 56, cy: 28, r: 1.2, d: '0.18s',  small: true },
      // Middle row — large dots
      { cx: 32, cy: 44, r: 2.0, d: '0.36s',  small: false },
      { cx: 50, cy: 42, r: 2.4, d: '0.48s',  small: false },
      { cx: 68, cy: 44, r: 2.0, d: '0.6s',   small: false },
      // Middle satellites
      { cx: 41, cy: 48, r: 1.1, d: '0.42s',  small: true },
      { cx: 59, cy: 48, r: 1.1, d: '0.54s',  small: true },
      // Lower row
      { cx: 40, cy: 56, r: 2.0, d: '0.72s',  small: false },
      { cx: 60, cy: 56, r: 2.0, d: '0.84s',  small: false }
    ];

    // Tentacle classes (1..10) so each arm can sway with its own phase
    // offset — the bottom row of arms then reads as a slow underwater wave
    // instead of a frozen fan. Phase offsets baked into CSS keyframe delays.
    var armClass = function(i) { return 'tp-inko-arm tp-inko-arm-' + i; };

    return h('svg', {
      width: sz, height: sz, viewBox: '0 0 100 100', className: cls,
      role: 'img', 'aria-label': opts.label || 'Inko the color-changing cuttlefish',
      style: { display: 'block', overflow: 'visible' }
    },
      h('defs', null,
        // Linear gradient for mantle bioluminescence
        h('linearGradient', { id: 'tp-grad-inko-mantle', x1: '0%', y1: '0%', x2: '0%', y2: '100%' },
          h('stop', { offset: '0%', stopColor: '#22d3ee' }),
          h('stop', { offset: '50%', stopColor: bodyColor }),
          h('stop', { offset: '100%', stopColor: '#4f46e5' })
        ),
        // Translucent iridescent fin gradient
        h('linearGradient', { id: 'tp-grad-inko-fin', x1: '0%', y1: '0%', x2: '100%', y2: '0%' },
          h('stop', { offset: '0%', stopColor: '#22d3ee', stopOpacity: 0.7 }),
          h('stop', { offset: '50%', stopColor: '#a5f3fc', stopOpacity: 0.4 }),
          h('stop', { offset: '100%', stopColor: '#818cf8', stopOpacity: 0.6 })
        ),
        // Chromatophore pulse radial gradient
        h('radialGradient', { id: 'tp-grad-inko-chrom', cx: '45%', cy: '45%', r: '55%' },
          h('stop', { offset: '0%', stopColor: '#a5f3fc' }),
          h('stop', { offset: '55%', stopColor: '#22d3ee' }),
          h('stop', { offset: '100%', stopColor: '#0891b2' })
        ),
        // Glow shadow filter for W-shaped pupil bioluminescence
        h('filter', { id: 'tp-glow-inko-pupil' },
          h('feGaussianBlur', { stdDeviation: '0.8', result: 'blur' }),
          h('feComposite', { in: 'SourceGraphic', in2: 'blur', operator: 'over' })
        )
      ),
      // Ink cloud — only visible during attack-out / loss states via CSS
      h('g', { className: 'tp-inko-ink' },
        h('circle', { cx: 78, cy: 50, r: 12, fill: inkColor, opacity: 0 }),
        h('circle', { cx: 86, cy: 44, r: 7, fill: inkColor, opacity: 0 }),
        h('circle', { cx: 88, cy: 56, r: 5, fill: inkColor, opacity: 0 })
      ),
      // Bubble particles — visible during combo state via CSS
      h('g', { className: 'tp-inko-bubbles' },
        h('circle', { cx: 22, cy: 30, r: 1.8, fill: '#f0fdfa', opacity: 0, stroke: '#67e8f9', strokeWidth: 0.4 }),
        h('circle', { cx: 16, cy: 22, r: 1.2, fill: '#f0fdfa', opacity: 0, stroke: '#67e8f9', strokeWidth: 0.4 }),
        h('circle', { cx: 12, cy: 14, r: 0.9, fill: '#f0fdfa', opacity: 0, stroke: '#67e8f9', strokeWidth: 0.4 })
      ),
      // Side fins — undulating membranes that run along the mantle edges
      h('g', { className: 'tp-inko-fins' },
        h('path', {
          d: 'M 22 28 Q 14 36 16 50 Q 18 64 22 72 Q 24 60 26 50 Q 24 38 22 28 Z',
          fill: 'url(#tp-grad-inko-fin)', stroke: mantleEdge, strokeWidth: 0.6
        }),
        h('path', {
          d: 'M 78 28 Q 86 36 84 50 Q 82 64 78 72 Q 76 60 74 50 Q 76 38 78 28 Z',
          fill: 'url(#tp-grad-inko-fin)', stroke: mantleEdge, strokeWidth: 0.6
        })
      ),
      // Mantle (main body) — torpedo / shield shape
      h('path', {
        d: 'M 28 30 Q 50 14 72 30 Q 76 50 70 68 L 30 68 Q 24 50 28 30 Z',
        fill: 'url(#tp-grad-inko-mantle)', stroke: mantleEdge, strokeWidth: 1.5, className: 'tp-inko-mantle'
      }),
      // Underbelly shadow stripe (subtle depth)
      h('path', {
        d: 'M 32 60 Q 50 66 68 60 L 68 68 L 32 68 Z',
        fill: bodyDeep, opacity: 0.25
      }),
      // Bioluminescent glowing wave outlines along the mantle edges
      h('path', {
        d: 'M 32 32 Q 50 24 68 32 M 32 46 Q 50 38 68 46 M 34 60 Q 50 52 66 60',
        fill: 'none', stroke: '#22d3ee', strokeWidth: 0.8, opacity: 0.5,
        className: 'tp-inko-bio-wave', strokeDasharray: '3,3'
      }),
      // Zebra display
      h('g', { className: 'tp-inko-zebra', opacity: 0 },
        h('path', { d: 'M 36 22 L 36 60', stroke: bodyDeep, strokeWidth: 1.4, opacity: 0.5 }),
        h('path', { d: 'M 44 18 L 44 62', stroke: bodyDeep, strokeWidth: 1.6, opacity: 0.55 }),
        h('path', { d: 'M 50 16 L 50 64', stroke: bodyDeep, strokeWidth: 1.8, opacity: 0.6 }),
        h('path', { d: 'M 56 18 L 56 62', stroke: bodyDeep, strokeWidth: 1.6, opacity: 0.55 }),
        h('path', { d: 'M 64 22 L 64 60', stroke: bodyDeep, strokeWidth: 1.4, opacity: 0.5 })
      ),
      // Bioluminescent rim glow
      h('path', {
        d: 'M 28 30 Q 50 14 72 30 Q 76 50 70 68 L 30 68 Q 24 50 28 30 Z',
        fill: 'none', stroke: '#67e8f9', strokeWidth: 0.8, opacity: 0,
        className: 'tp-inko-rim'
      }),
      // Chromatophore dots — color-cycling pigment cells.
      h('g', { className: 'tp-inko-chromatophores' },
        chromatophores.map(function(c, i) {
          return h('circle', {
            key: 'chrom-' + i,
            cx: c.cx, cy: c.cy, r: c.r,
            fill: 'url(#tp-grad-inko-chrom)',
            opacity: c.small ? 0.6 : 0.8,
            className: 'tp-inko-chrom' + (c.small ? ' tp-inko-chrom-sat' : ''),
            style: { animationDelay: c.d }
          });
        })
      ),
      // Eyes — outer ring + W-shaped pupil
      h('g', { className: 'tp-inko-eyes' },
        // Left eye sclera
        h('ellipse', { cx: 40, cy: 40, rx: 5.5, ry: 4.5, fill: eyeWhite, stroke: eyeRing, strokeWidth: 1 }),
        // Left W-pupil
        h('g', { className: 'tp-inko-pupil tp-inko-pupil-l', style: { transformOrigin: '40px 40px', transformBox: 'fill-box' } },
          h('path', {
            d: 'M 36 40 L 38 42.5 L 40 39.5 L 42 42.5 L 44 40',
            fill: 'none', stroke: inkColor, strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round',
            filter: 'url(#tp-glow-inko-pupil)'
          })
        ),
        // Eye highlight
        h('circle', { cx: 38, cy: 38, r: 0.8, fill: '#fff', opacity: 0.85 }),
        // Right eye sclera
        h('ellipse', { cx: 60, cy: 40, rx: 5.5, ry: 4.5, fill: eyeWhite, stroke: eyeRing, strokeWidth: 1 }),
        // Right W-pupil
        h('g', { className: 'tp-inko-pupil tp-inko-pupil-r', style: { transformOrigin: '60px 40px', transformBox: 'fill-box' } },
          h('path', {
            d: 'M 56 40 L 58 42.5 L 60 39.5 L 62 42.5 L 64 40',
            fill: 'none', stroke: inkColor, strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round',
            filter: 'url(#tp-glow-inko-pupil)'
          })
        ),
        h('circle', { cx: 58, cy: 38, r: 0.8, fill: '#fff', opacity: 0.85 })
      ),
      // Eight short arms + two long feeding tentacles
      h('g', { className: 'tp-inko-arms' },
        // Long feeding tentacles (center pair)
        h('path', { d: 'M 46 68 Q 44 80 42 92', fill: 'none', stroke: 'url(#tp-grad-inko-mantle)', strokeWidth: 3.2, strokeLinecap: 'round', className: armClass(0), style: { transformOrigin: '46px 68px', transformBox: 'fill-box' } }),
        h('path', { d: 'M 54 68 Q 56 80 58 92', fill: 'none', stroke: 'url(#tp-grad-inko-mantle)', strokeWidth: 3.2, strokeLinecap: 'round', className: armClass(1), style: { transformOrigin: '54px 68px', transformBox: 'fill-box' } }),
        // Sucker dots (Suction Cups on long feeding tentacles)
        h('circle', { cx: 45, cy: 76, r: 1, fill: '#e0f2fe', stroke: bodyDeep, strokeWidth: 0.4, opacity: 0.85 }),
        h('circle', { cx: 44, cy: 82, r: 1, fill: '#e0f2fe', stroke: bodyDeep, strokeWidth: 0.4, opacity: 0.85 }),
        h('circle', { cx: 43, cy: 88, r: 1, fill: '#e0f2fe', stroke: bodyDeep, strokeWidth: 0.4, opacity: 0.85 }),
        h('circle', { cx: 55, cy: 76, r: 1, fill: '#e0f2fe', stroke: bodyDeep, strokeWidth: 0.4, opacity: 0.85 }),
        h('circle', { cx: 56, cy: 82, r: 1, fill: '#e0f2fe', stroke: bodyDeep, strokeWidth: 0.4, opacity: 0.85 }),
        h('circle', { cx: 57, cy: 88, r: 1, fill: '#e0f2fe', stroke: bodyDeep, strokeWidth: 0.4, opacity: 0.85 }),
        // Short arms — 4 per side, fanning outward, with tiny suction cup details
        h('path', { d: 'M 38 68 Q 34 76 30 84', fill: 'none', stroke: 'url(#tp-grad-inko-mantle)', strokeWidth: 2.6, strokeLinecap: 'round', className: armClass(2), style: { transformOrigin: '38px 68px', transformBox: 'fill-box' } }),
        h('path', { d: 'M 34 68 Q 28 74 22 80', fill: 'none', stroke: 'url(#tp-grad-inko-mantle)', strokeWidth: 2.4, strokeLinecap: 'round', className: armClass(3), style: { transformOrigin: '34px 68px', transformBox: 'fill-box' } }),
        h('path', { d: 'M 32 66 Q 24 70 18 74', fill: 'none', stroke: 'url(#tp-grad-inko-mantle)', strokeWidth: 2.2, strokeLinecap: 'round', className: armClass(4), style: { transformOrigin: '32px 66px', transformBox: 'fill-box' } }),
        h('path', { d: 'M 30 64 Q 22 64 14 64', fill: 'none', stroke: 'url(#tp-grad-inko-mantle)', strokeWidth: 2.0, strokeLinecap: 'round', className: armClass(5), style: { transformOrigin: '30px 64px', transformBox: 'fill-box' } }),
        h('path', { d: 'M 62 68 Q 66 76 70 84', fill: 'none', stroke: 'url(#tp-grad-inko-mantle)', strokeWidth: 2.6, strokeLinecap: 'round', className: armClass(6), style: { transformOrigin: '62px 68px', transformBox: 'fill-box' } }),
        h('path', { d: 'M 66 68 Q 72 74 78 80', fill: 'none', stroke: 'url(#tp-grad-inko-mantle)', strokeWidth: 2.4, strokeLinecap: 'round', className: armClass(7), style: { transformOrigin: '66px 68px', transformBox: 'fill-box' } }),
        h('path', { d: 'M 68 66 Q 76 70 82 74', fill: 'none', stroke: 'url(#tp-grad-inko-mantle)', strokeWidth: 2.2, strokeLinecap: 'round', className: armClass(8), style: { transformOrigin: '68px 66px', transformBox: 'fill-box' } }),
        h('path', { d: 'M 70 64 Q 78 64 86 64', fill: 'none', stroke: 'url(#tp-grad-inko-mantle)', strokeWidth: 2.0, strokeLinecap: 'round', className: armClass(9), style: { transformOrigin: '70px 64px', transformBox: 'fill-box' } })
      ),
      // Tiny mantle highlight
      h('path', {
        d: 'M 36 22 Q 50 16 64 22',
        fill: 'none', stroke: '#f0fdfa', strokeWidth: 1.4, strokeLinecap: 'round', opacity: 0.6
      })
    );
  }

  // Mascot bios — grow the SVG icons into a character family. Each
  // entry has the canonical name, theme it belongs to, one-sentence
  // personality, and a couple lines of lore that show up on the
  // "Meet the cast" roster on the Battle Menu. Same role AlloBot's
  // canonical bio plays for that character — once students know the
  // name and the personality, the mascot becomes someone they relate
  // to rather than just an icon.
  var MASCOT_BIOS = [
    {
      theme: 'default', themeLabel: 'Default',
      name: 'Pip', tagline: 'The chick who never gives up.',
      bio: 'Hatched from a typewriter ribbon. Round, fluffy, and surprisingly fast on tiny legs. Pecks letters with rhythmic precision; cheers loudest for personal bests, not perfect scores.',
      accent: '#fde047'
    },
    {
      theme: 'steampunk', themeLabel: 'Steampunk',
      name: 'Cogsworth', tagline: 'Wound at dawn. Runs all day.',
      bio: 'A brass clockwork owl built in a Victorian printer\'s shop. Eyes are lamp-glow lenses behind goggles. Two counter-rotating gears keep the mechanism balanced. Ticks calmly while everything around them burns.',
      accent: '#a16207'
    },
    {
      theme: 'cyberpunk', themeLabel: 'Cyberpunk',
      name: 'Vex', tagline: 'A face made of light.',
      bio: 'A neon hex-panel rendered by a forgotten arcade cabinet. Speaks in scanlines. Glitches when excited, alerts red when threatened. Surprisingly thoughtful for a face made of grids.',
      accent: '#06b6d4'
    },
    {
      theme: 'kawaii', themeLabel: 'Kawaii',
      name: 'Mochi', tagline: 'Soft outside. Steel inside.',
      bio: 'A pastel-pink kitten who looks delicate and is anything but. Sparkles on combos, frowns at danger, sheds exactly one tear when defeated, and gets back up immediately. Wears a tiny bow on the left ear.',
      accent: '#f9a8d4'
    },
    {
      theme: 'oceanic', themeLabel: 'Oceanic',
      name: 'Inko', tagline: 'Speaks in color, not in words.',
      bio: 'A young cuttlefish from a deep saltwater shelf. Communicates through chromatophores — the pigment cells across the mantle pulse cyan when calm, gold-and-orange on a streak, deep red when threatened, and rainbow on a clear win. W-shaped pupils, eight short arms plus two long feeding tentacles, and an ink reserve held back for when it actually matters.',
      accent: '#22d3ee'
    }
  ];

  // Mascot dispatcher — picks the right render fn for the active theme.
  // Theme 'neutral' returns null per the design rule (neutral = quiet,
  // no decorative characters). Returns a React element ready to mount.
  function renderBattleMascot(themeName, state, opts) {
    opts = Object.assign({ state: state }, opts || {});
    var mascotEl;
    if (themeName === 'steampunk')      mascotEl = _renderCogsworth(opts);
    else if (themeName === 'cyberpunk') mascotEl = _renderVex(opts);
    else if (themeName === 'kawaii')    mascotEl = _renderMochi(opts);
    else if (themeName === 'oceanic')   mascotEl = _renderInko(opts);
    else if (themeName === 'neutral')   return null;
    else                                mascotEl = _renderPip(opts);

    // Bot wrapper — when the mascot represents the opponent, wrap it in a
    // <div class="tp-mascot-as-bot"> so CSS can add a subtle hue-shift +
    // small "BOT" corner badge. Distinguishes opponent from player at a
    // glance without changing the character itself (Inko vs Inko-the-bot
    // is still recognizably Inko, just visibly the rival).
    if (opts.isBot) {
      var React = window.React;
      var h = React.createElement;
      return h('div', {
        className: 'tp-mascot-as-bot',
        style: { position: 'relative', display: 'inline-block', lineHeight: 0 }
      },
        mascotEl,
        h('span', {
          className: 'tp-mascot-bot-badge',
          'aria-hidden': 'true',
          style: {
            position: 'absolute', bottom: -2, right: -2,
            background: '#a78bfa', color: '#1e1b4b',
            fontSize: 7, fontWeight: 800, letterSpacing: '0.06em',
            padding: '1px 4px', borderRadius: 999,
            border: '1px solid #1e1b4b', lineHeight: 1.2,
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
          }
        }, 'BOT')
      );
    }
    return mascotEl;
  }

  // ─────────────────────────────────────────────────────────
  // Mascot gallery — dev-surface preview grid
  // ─────────────────────────────────────────────────────────
  // Triggered by `#mascot-gallery` URL hash. Renders all 5 mascots in
  // every supported state (10 states × 5 themes = 50 cells). Useful for
  // visual QA without grinding through Battle Mode. No persistent state,
  // no event handlers — pure render. Each cell labels the state so design
  // regressions are obvious at a glance.

  // Gradient ids are fixed in the drawings; a suffix keeps two copies of one mascot from sharing them.
  function withIdSuffix(element, suffix) {
    var React = window.React;
    if (!suffix || !element || typeof element !== 'object' || !element.props) return element;
    var props = {};
    var changed = false;
    Object.keys(element.props).forEach(function (name) {
      if (name === 'children') return;
      var value = element.props[name];
      if (name === 'id' && typeof value === 'string' && value.indexOf('tp-') === 0) { props.id = value + suffix; changed = true; }
      else if (typeof value === 'string' && value.indexOf('url(#tp-') >= 0) { props[name] = value.replace(/url\(#(tp-[^)]+)\)/g, function (_, id) { return 'url(#' + id + suffix + ')'; }); changed = true; }
      else if (name === 'style' && value && typeof value === 'object') {
        var style = null;
        Object.keys(value).forEach(function (key) {
          if (typeof value[key] === 'string' && value[key].indexOf('url(#tp-') >= 0) {
            style = style || Object.assign({}, value);
            style[key] = value[key].replace(/url\(#(tp-[^)]+)\)/g, function (_, id) { return 'url(#' + id + suffix + ')'; });
          }
        });
        if (style) { props.style = style; changed = true; }
      }
    });
    var children = element.props.children;
    var mapped = children == null ? children : React.Children.map(children, function (child) { return withIdSuffix(child, suffix); });
    if (!changed && mapped === children) return element;
    return React.cloneElement.apply(null, [element, props].concat(children == null ? [] : Array.isArray(children) ? mapped : [mapped && mapped.length === 1 ? mapped[0] : mapped]));
  }

  (function injectMascotStyles() {
    if (typeof document === 'undefined' || document.getElementById('allo-mascot-styles') || document.getElementById('tp-focus-styles')) return;
    var style = document.createElement('style');
    style.id = 'allo-mascot-styles';
    style.textContent = "@keyframes tp-mascot-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }\n@keyframes tp-mascot-shake-h { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-1.5px); } 75% { transform: translateX(1.5px); } }\n@keyframes tp-mascot-pop { 0% { transform: scale(1); } 40% { transform: scale(1.12); } 100% { transform: scale(1); } }\n@keyframes tp-mascot-throw { 0% { transform: translateX(0) rotate(0); } 30% { transform: translateX(-3px) rotate(-8deg); } 60% { transform: translateX(8px) rotate(10deg); } 100% { transform: translateX(0) rotate(0); } }\n@keyframes tp-mascot-flinch { 0% { transform: translateX(0) scale(1); } 25% { transform: translateX(2px) scale(0.94); } 60% { transform: translateX(-2px) scale(0.94); } 100% { transform: translateX(0) scale(1); } }\n@keyframes tp-mascot-celebrate { 0% { transform: translateY(0) rotate(0); } 30% { transform: translateY(-6px) rotate(-6deg); } 60% { transform: translateY(-6px) rotate(6deg); } 100% { transform: translateY(0) rotate(0); } }\n@keyframes tp-mascot-droop { 0%,100% { transform: rotate(-3deg) translateY(2px); filter: saturate(0.5) brightness(0.85); } }\n@keyframes tp-mascot-tremble { 0%,100% { transform: translate(0,0); } 25% { transform: translate(-1px,1px); } 50% { transform: translate(1px,-1px); } 75% { transform: translate(-1px,-1px); } }\n@keyframes tp-mascot-arch { 0% { transform: translateY(0) scale(1); } 30% { transform: translateY(-3px) scale(1.06); } 60% { transform: translateY(-1px) scale(1.04); } 100% { transform: translateY(0) scale(1); } }\n@keyframes tp-mascot-drift { 0%,100% { transform: translateY(0) rotate(0); opacity: 0.85; } 50% { transform: translateY(-3px) rotate(2deg); opacity: 1; } }\n@keyframes tp-mascot-zfloat { 0% { transform: translate(0,0); opacity: 0; } 30% { opacity: 0.9; } 100% { transform: translate(8px,-14px); opacity: 0; } }\n@keyframes tp-mascot-think { 0%, 100% { transform: rotate(-2deg) translateY(0); } 50% { transform: rotate(2deg) translateY(-1px); } }\n@keyframes tp-pip-blink { 0%, 92%, 100% { transform: scaleY(1); } 95% { transform: scaleY(0.1); } }\n@keyframes tp-cog-rotate { from { transform: rotate(0); } to { transform: rotate(360deg); } }\n@keyframes tp-cog-rotate-rev { from { transform: rotate(0); } to { transform: rotate(-360deg); } }\n@keyframes tp-cog-steam { 0%, 100% { opacity: 0; transform: translateY(0); } 50% { opacity: 0.85; transform: translateY(-6px); } }\n@keyframes tp-vex-scan { 0% { transform: translateY(0); opacity: 0.5; } 50% { opacity: 0.7; } 100% { transform: translateY(48px); opacity: 0.4; } }\n@keyframes tp-vex-eye-blink { 0%, 90%, 100% { transform: scaleY(1); opacity: 0.95; } 95% { transform: scaleY(0.15); opacity: 1; } }\n@keyframes tp-vex-alert { 0%, 100% { opacity: 0; } 50% { opacity: 0.55; } }\n@keyframes tp-vex-glitch { 0%, 100% { transform: translateX(0); filter: hue-rotate(0deg); } 25% { transform: translateX(-2px); filter: hue-rotate(30deg); } 50% { transform: translateX(2px); filter: hue-rotate(-30deg); } 75% { transform: translateX(-1px); filter: hue-rotate(15deg); } }\n@keyframes tp-mochi-sparkle { 0%, 100% { opacity: 0; transform: scale(0.6); } 50% { opacity: 1; transform: scale(1.1); } }\n@keyframes tp-pip-wing-flap { 0%, 100% { transform: rotate(-4deg); } 50% { transform: rotate(8deg); } }\n@keyframes tp-pip-wing-flap-r { 0%, 100% { transform: rotate(4deg); } 50% { transform: rotate(-8deg); } }\n@keyframes tp-pip-wing-sway { 0%, 100% { transform: rotate(-1deg); } 50% { transform: rotate(2deg); } }\n@keyframes tp-pip-wing-sway-r { 0%, 100% { transform: rotate(1deg); } 50% { transform: rotate(-2deg); } }\n@keyframes tp-pip-leg-walk-l { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-2px) rotate(-15deg); } }\n@keyframes tp-pip-leg-walk-r { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-2px) rotate(15deg); } }\n@keyframes tp-pip-legs-jump { 0%, 100% { transform: translateY(0) scaleY(1); } 50% { transform: translateY(-5px) scaleY(0.7); } }\n@keyframes tp-pip-sprout-shiver { 0%, 100% { transform: rotate(0deg) scale(0.95); } 25% { transform: rotate(-8deg) scale(0.9); } 75% { transform: rotate(8deg) scale(0.9); } }\n@keyframes tp-cog-wing-flap-l { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-22deg); } }\n@keyframes tp-cog-wing-flap-r { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(22deg); } }\n@keyframes tp-cog-needle-violent { 0%, 100% { transform: rotate(15deg); } 50% { transform: rotate(65deg); } }\n@keyframes tp-cog-steam-violent { 0% { opacity: 0; transform: translateY(0) scale(0.5); } 50% { opacity: 0.9; } 100% { opacity: 0; transform: translateY(-12px) scale(1.6); } }\n@keyframes tp-vex-eq-idle { 0%, 100% { transform: scaleY(0.3); } 50% { transform: scaleY(1.3); } }\n@keyframes tp-vex-eq-combo { 0%, 100% { transform: scaleY(0.2); } 50% { transform: scaleY(1.8); } }\n@keyframes tp-vex-eq-danger { 0%, 100% { transform: scaleY(0.3); } 20% { transform: scaleY(1.4); } 40% { transform: scaleY(0.1); } 60% { transform: scaleY(1.5); } 80% { transform: scaleY(0.2); } }\n@keyframes tp-mochi-paws-raise { 0% { transform: translateY(0) scale(1); } 100% { transform: translateY(-5px) scale(1.1); } }\n@keyframes tp-mochi-ear-twitch-l { 0%, 90%, 100% { transform: rotate(0deg); } 93% { transform: rotate(-10deg); } 96% { transform: rotate(5deg); } }\n@keyframes tp-mochi-ear-twitch-r { 0%, 92%, 100% { transform: rotate(0deg); } 95% { transform: rotate(10deg); } 98% { transform: rotate(-5deg); } }\n@keyframes tp-inko-bio-pulse-danger { 0%, 100% { stroke: #fb7185; opacity: 0.4; } 50% { stroke: #dc2626; opacity: 1; } }\n@keyframes tp-pip-cheek-puff { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.6); } }\n@keyframes tp-pip-beak-chirp { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(1.4); } }\n@keyframes tp-pip-body-pulse { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(0.96); } }\n@keyframes tp-cog-pendulum { 0%, 100% { transform: rotate(-12deg); } 50% { transform: rotate(12deg); } }\n@keyframes tp-vex-hex-distort { 0%, 100% { transform: skewX(0deg); filter: hue-rotate(0deg); } 33% { transform: skewX(-1.5deg); filter: hue-rotate(20deg); } 66% { transform: skewX(1.5deg); filter: hue-rotate(-20deg); } }\n@keyframes tp-vex-rim-pulse { 0%, 100% { opacity: 0; } 50% { opacity: 0.7; } }\n@keyframes tp-vex-boot-on { 0% { opacity: 0; } 50%, 100% { opacity: 1; } }\n@keyframes tp-vex-boot-off { 0% { opacity: 1; } 50%, 100% { opacity: 0.15; } }\n@keyframes tp-mochi-tail-sway { 0%, 100% { transform: rotate(-4deg); } 50% { transform: rotate(6deg); } }\n@keyframes tp-mochi-tail-wag { 0%, 100% { transform: rotate(-12deg); } 50% { transform: rotate(14deg); } }\n@keyframes tp-mochi-heart-pop { 0% { opacity: 0; transform: translateY(0) scale(0.4); } 30% { opacity: 1; transform: translateY(-3px) scale(1.1); } 100% { opacity: 0; transform: translateY(-10px) scale(1); } }\n@keyframes tp-mochi-bow-wiggle { 0%, 100% { transform: rotate(-8deg); } 50% { transform: rotate(8deg); } }\n@keyframes tp-vex-eye-pulse { 0%, 100% { opacity: 0.85; } 50% { opacity: 1; } }\n@keyframes tp-cog-rivet-glow { 0%, 100% { fill: #713f12; } 50% { fill: #d4884c; } }\n@keyframes tp-inko-fidget-l { 0%, 88%, 100% { transform: rotate(-2deg); } 92% { transform: rotate(8deg); } 96% { transform: rotate(2deg); } }\n@keyframes tp-inko-fidget-r { 0%, 88%, 100% { transform: rotate(2deg); } 92% { transform: rotate(-8deg); } 96% { transform: rotate(-2deg); } }\n@keyframes tp-mochi-blink { 0%, 92%, 100% { transform: scaleY(1); } 95% { transform: scaleY(0.1); } }\n.tp-mascot-mochi .tp-mochi-eye-l, .tp-mascot-mochi .tp-mochi-eye-r { animation: tp-mochi-blink 5.5s ease-in-out infinite; }\n@keyframes tp-mochi-whiskers-twitch { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-2deg); } 75% { transform: rotate(2deg); } }\n.tp-mascot-mochi.tp-mascot-combo .tp-mochi-whiskers { animation: tp-mochi-whiskers-twitch 0.4s ease-in-out infinite; transform-origin: 50px 64px; }\n@keyframes tp-pip-sprout-sway { 0%, 100% { transform: rotate(-6deg); } 50% { transform: rotate(6deg); } }\n.tp-mascot-pip .tp-pip-sprout { animation: tp-pip-sprout-sway 3s ease-in-out infinite; }\n@keyframes tp-pip-bowtie-wiggle { 0%, 100% { transform: rotate(-8deg) scale(1); } 50% { transform: rotate(8deg) scale(1.1); } }\n.tp-mascot-pip.tp-mascot-combo .tp-pip-bowtie { animation: tp-pip-bowtie-wiggle 0.4s ease-in-out infinite; }\n@keyframes tp-cog-needle-shake { 0%, 100% { transform: rotate(0deg); } 20% { transform: rotate(-10deg); } 40% { transform: rotate(15deg); } 60% { transform: rotate(-15deg); } 80% { transform: rotate(10deg); } }\n.tp-mascot-cogsworth .tp-cog-needle { animation: tp-cog-needle-shake 0.8s ease-in-out infinite; transform-origin: 50px 66px; transform-box: fill-box; }\n@keyframes tp-vex-spark-drift { 0% { transform: translate(0, 0) scale(0.8); opacity: 0; } 20% { opacity: 0.8; } 80% { opacity: 0.8; } 100% { transform: translate(var(--dx, 6px), var(--dy, -8px)) scale(1.2); opacity: 0; } }\n.tp-mascot-vex .tp-vex-spark { animation: tp-vex-spark-drift 2.5s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }\n@keyframes tp-mochi-bell-swing { 0%, 100% { transform: rotate(-15deg); } 50% { transform: rotate(15deg); } }\n.tp-mascot-mochi .tp-mochi-bell { animation: tp-mochi-bell-swing 2s ease-in-out infinite; transform-origin: 50px 74.5px; transform-box: fill-box; }\n.tp-mascot-mochi.tp-mascot-combo .tp-mochi-bell { animation: tp-mochi-bell-swing 0.6s ease-in-out infinite; transform-origin: 50px 74.5px; transform-box: fill-box; }\n@keyframes tp-mochi-paws-pat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }\n.tp-mascot-mochi.tp-mascot-combo .tp-mochi-paws { animation: tp-mochi-paws-pat 0.4s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }\n@keyframes tp-inko-bio-pulse { from { stroke-dashoffset: 20; } to { stroke-dashoffset: 0; } }\n.tp-mascot-inko .tp-inko-bio-wave { animation: tp-inko-bio-pulse 3s linear infinite; }\n@keyframes tp-pip-signature { 0%, 88%, 100% { transform: translateY(0) scale(1,1); } 90% { transform: translateY(-5px) scale(0.95,1.05); } 92% { transform: translateY(0) scale(1.05,0.95); } 94% { transform: translateY(-3px) scale(1,1); } 96% { transform: translateY(0) scale(1,1); } }\n.tp-mascot-pip.tp-mascot-idle { animation: tp-mascot-bob 3.2s ease-in-out infinite, tp-pip-twitch 9s ease-in-out infinite, tp-pip-signature 14s ease-in-out infinite; }\n@keyframes tp-cog-signature-steam { 0%, 84%, 100% { opacity: 0; transform: translateY(0); } 86%, 92% { opacity: 0.85; } 96% { opacity: 0; transform: translateY(-8px); } }\n.tp-mascot-cogsworth.tp-mascot-idle .tp-cog-steam circle:nth-child(1) { animation: tp-cog-signature-steam 16s ease-in-out infinite; }\n.tp-mascot-cogsworth.tp-mascot-idle .tp-cog-steam circle:nth-child(3) { animation: tp-cog-signature-steam 16s ease-in-out infinite 0.15s; }\n.tp-mascot-vex.tp-mascot-idle .tp-vex-boot-1 { animation: tp-vex-boot-on 3s ease-in-out infinite alternate, tp-vex-boot-off 18s linear infinite; }\n.tp-mascot-vex.tp-mascot-idle .tp-vex-boot-2 { animation: tp-vex-boot-on 3s ease-in-out infinite alternate 1s, tp-vex-boot-off 18s linear infinite 0.2s; }\n.tp-mascot-vex.tp-mascot-idle .tp-vex-boot-3 { animation: tp-vex-boot-on 3s ease-in-out infinite alternate 2s, tp-vex-boot-off 18s linear infinite 0.4s; }\n@keyframes tp-mochi-signature { 0%, 92%, 100% { transform: rotate(0deg) translateY(0); } 94% { transform: rotate(-3deg) translateY(-2px); } 96% { transform: rotate(2deg) translateY(0); } }\n.tp-mascot-mochi.tp-mascot-idle { animation: tp-mascot-bob 3.2s ease-in-out infinite, tp-mochi-signature 17s ease-in-out infinite; }\n@keyframes tp-inko-signature-rainbow { 0%, 86%, 100% { fill: #22d3ee; } 88% { fill: #fb7185; } 90% { fill: #fbbf24; } 92% { fill: #5eead4; } 94% { fill: #a78bfa; } 96% { fill: #fb7185; } }\n.tp-mascot-inko.tp-mascot-idle .tp-inko-chrom { animation: tp-inko-chrom-idle 2.4s ease-in-out infinite, tp-inko-signature-rainbow 18s linear infinite; }\n@keyframes tp-inko-zebra-flash { 0%, 90%, 100% { opacity: 0; } 92%, 96% { opacity: 0.6; } }\n.tp-mascot-inko.tp-mascot-idle .tp-inko-zebra { animation: tp-inko-zebra-flash 22s ease-in-out infinite; }\n@keyframes tp-vex-mouth-ripple { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }\n.tp-mascot-vex .tp-vex-mouth circle:nth-child(1n+1) { animation: tp-vex-mouth-ripple 3s ease-in-out infinite; }\n.tp-mascot-vex .tp-vex-mouth circle:nth-child(2n+1) { animation-delay: 0.4s; }\n.tp-mascot-vex .tp-vex-mouth circle:nth-child(3n+1) { animation-delay: 0.8s; }\n@keyframes tp-pip-beak-breath { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.04); } }\n.tp-mascot-pip .tp-pip-beak { animation: tp-pip-beak-breath 3.2s ease-in-out infinite; }\n@keyframes tp-cog-gear-glint { 0%, 88%, 100% { opacity: 0.7; } 92% { opacity: 1; filter: brightness(1.3); } }\n.tp-mascot-cogsworth .tp-cog-gear-l circle:nth-child(2), .tp-mascot-cogsworth .tp-cog-gear-r circle:nth-child(2) { animation: tp-cog-gear-glint 6s ease-in-out infinite; }\n.tp-mascot-as-bot .tp-mascot { filter: hue-rotate(40deg) saturate(0.85); }\n.tp-mascot-as-bot::before { content: \"\"; position: absolute; inset: 0; pointer-events: none; background: repeating-linear-gradient(0deg, transparent 0, transparent 3px, rgba(167,139,250,0.10) 3px, rgba(167,139,250,0.10) 4px); border-radius: 4px; mix-blend-mode: screen; }\n.tp-mascot-bot-badge { animation: tp-bot-badge-pulse 2.4s ease-in-out infinite; }\n.tp-mascot-as-bot .tp-mascot-pip { filter: saturate(0.9) drop-shadow(0 0 6px rgba(239,68,68,0.4)); }\n.tp-mascot-as-bot .tp-pip-pupil-l, .tp-mascot-as-bot .tp-pip-pupil-r { fill: #ef4444; }\n.tp-mascot-as-bot .tp-cog-gear-l { animation: tp-cog-rotate-rev 6s linear infinite; }\n.tp-mascot-as-bot .tp-cog-gear-r { animation: tp-cog-rotate 7s linear infinite; }\n.tp-mascot-as-bot .tp-cog-pendulum { animation-direction: reverse; }\n.tp-mascot-as-bot .tp-vex-scanline { animation-duration: 1.1s; opacity: 0.8; }\n.tp-mascot-as-bot .tp-vex-alert { opacity: 0.18; }\n.tp-mascot-as-bot .tp-mascot-mochi { filter: grayscale(0.85) brightness(0.85) drop-shadow(0 2px 6px rgba(100,100,100,0.30)); }\n.tp-mascot-as-bot .tp-mascot-inko { filter: hue-rotate(280deg) saturate(0.95) drop-shadow(0 0 10px rgba(220,80,80,0.35)); }\n.tp-mascot-as-bot .tp-inko-chrom { animation: tp-inko-chrom-danger 0.8s ease-in-out infinite !important; }\n.tp-mascot-as-bot .tp-inko-chrom-sat { animation: tp-inko-chrom-danger 0.8s ease-in-out infinite 0.4s !important; }\n.tp-mascot-as-bot .tp-inko-pupil { animation: tp-inko-pupil-dart 0.6s ease-in-out infinite; }\n@keyframes tp-inko-bubble-drift { 0%, 80%, 100% { opacity: 0; transform: translateY(0); } 85%, 95% { opacity: 0.6; } 100% { opacity: 0; transform: translateY(-18px); } }\n@keyframes tp-cog-steam-drift   { 0%, 85%, 100% { opacity: 0; transform: translateY(0); } 90% { opacity: 0.5; } 100% { opacity: 0; transform: translateY(-6px); } }\n@keyframes tp-mochi-sparkle-drift { 0%, 88%, 100% { opacity: 0; transform: scale(0.6); } 92% { opacity: 0.7; transform: scale(1); } 100% { opacity: 0; transform: scale(1.1); } }\n@keyframes tp-pip-twitch        { 0%, 92%, 100% { transform: rotate(0deg); } 94% { transform: rotate(-3deg); } 96% { transform: rotate(3deg); } 98% { transform: rotate(0deg); } }\n@keyframes tp-inko-chrom-idle { 0%, 100% { fill: #22d3ee; opacity: 0.55; transform: scale(1); } 50% { fill: #5eead4; opacity: 0.85; transform: scale(1.15); } }\n@keyframes tp-inko-chrom-combo { 0%, 100% { fill: #fbbf24; opacity: 0.7; transform: scale(1); } 50% { fill: #f97316; opacity: 1; transform: scale(1.4); } }\n@keyframes tp-inko-chrom-danger { 0%, 100% { fill: #fb7185; opacity: 0.7; } 50% { fill: #dc2626; opacity: 1; } }\n@keyframes tp-inko-chrom-wow { 0% { fill: #fb7185; } 25% { fill: #fbbf24; } 50% { fill: #5eead4; } 75% { fill: #a78bfa; } 100% { fill: #fb7185; } }\n@keyframes tp-inko-chrom-incoming { 0%, 100% { fill: #1e4a6f; opacity: 0.4; transform: scale(0.9); } 50% { fill: #0f3a5c; opacity: 0.7; transform: scale(1); } }\n@keyframes tp-inko-ink-spurt { 0% { opacity: 0; transform: translateX(0) scale(0.6); } 30% { opacity: 0.85; transform: translateX(8px) scale(1.2); } 100% { opacity: 0; transform: translateX(20px) scale(1.6); } }\n@keyframes tp-inko-bubble-rise { 0% { opacity: 0; transform: translateY(0); } 30% { opacity: 0.85; } 100% { opacity: 0; transform: translateY(-22px); } }\n@keyframes tp-inko-fin-undulate { 0%, 100% { transform: translateX(0) scaleY(1); } 50% { transform: translateX(-1px) scaleY(1.04); } }\n@keyframes tp-inko-arm-long  { 0%, 100% { transform: rotate(-2deg); } 50% { transform: rotate(2deg); } }\n@keyframes tp-inko-arm-short { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }\n@keyframes tp-inko-arm-flick { 0%, 100% { transform: rotate(-6deg); } 50% { transform: rotate(6deg); } }\n@keyframes tp-inko-chrom-sat-idle { 0%, 100% { fill: #5eead4; opacity: 0.35; transform: scale(0.85); } 50% { fill: #22d3ee; opacity: 0.7; transform: scale(1.1); } }\n@keyframes tp-inko-rim-glow { 0%, 100% { opacity: 0; stroke-width: 0.8; } 50% { opacity: 0.8; stroke-width: 2.2; } }\n@keyframes tp-inko-pupil-dart { 0%, 100% { transform: translate(0, 0); } 25% { transform: translate(-0.6px, -0.3px); } 75% { transform: translate(0.6px, 0.3px); } }\n@keyframes tp-inko-mantle-breathe { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(1.02); } }\n.tp-mascot { animation: tp-mascot-bob 3.2s ease-in-out infinite; transform-origin: center; }\n.tp-mascot-pip { filter: drop-shadow(0 2px 6px rgba(253,224,71,0.25)); transition: filter 240ms ease, transform 240ms ease; }\n.tp-mascot-cogsworth { filter: drop-shadow(0 2px 6px rgba(212,136,76,0.25)); transition: filter 240ms ease, transform 240ms ease; }\n.tp-mascot-vex { filter: drop-shadow(0 0 8px rgba(6,182,212,0.30)); transition: filter 240ms ease, transform 240ms ease; }\n.tp-mascot-mochi { filter: drop-shadow(0 3px 8px rgba(232,90,138,0.20)); transition: filter 240ms ease, transform 240ms ease; }\n.tp-mascot-inko { filter: drop-shadow(0 0 10px rgba(34,211,238,0.30)); transition: filter 240ms ease, transform 240ms ease; }\n.tp-mascot-pip.tp-mascot-combo,    .tp-mascot-pip.tp-mascot-win    { filter: drop-shadow(0 2px 10px rgba(253,224,71,0.55)); }\n.tp-mascot-cogsworth.tp-mascot-combo, .tp-mascot-cogsworth.tp-mascot-win { filter: drop-shadow(0 2px 12px rgba(212,136,76,0.55)); }\n.tp-mascot-vex.tp-mascot-combo,    .tp-mascot-vex.tp-mascot-win    { filter: drop-shadow(0 0 14px rgba(6,182,212,0.60)); }\n.tp-mascot-mochi.tp-mascot-combo,  .tp-mascot-mochi.tp-mascot-win  { filter: drop-shadow(0 3px 12px rgba(232,90,138,0.50)); }\n.tp-mascot-inko.tp-mascot-combo,   .tp-mascot-inko.tp-mascot-win   { filter: drop-shadow(0 0 16px rgba(34,211,238,0.60)); }\n.tp-mascot.tp-mascot-loss { filter: saturate(0.4) brightness(0.85) drop-shadow(0 1px 4px rgba(0,0,0,0.3)) !important; }\n.tp-mascot-pip .tp-pip-pupil-l, .tp-mascot-pip .tp-pip-pupil-r { transform-origin: center; transform-box: fill-box; animation: tp-pip-blink 5s ease-in-out infinite; }\n.tp-mascot-pip .tp-pip-wing-l { animation: tp-pip-wing-sway 3.6s ease-in-out infinite; }\n.tp-mascot-pip .tp-pip-wing-r { animation: tp-pip-wing-sway-r 3.6s ease-in-out infinite; }\n.tp-mascot-cogsworth .tp-cog-gear-l { animation: tp-cog-rotate 6s linear infinite; }\n.tp-mascot-cogsworth .tp-cog-gear-r { animation: tp-cog-rotate-rev 7s linear infinite; }\n.tp-mascot-cogsworth .tp-cog-pendulum { animation: tp-cog-pendulum 2.4s ease-in-out infinite; }\n.tp-mascot-mochi .tp-mochi-tail { animation: tp-mochi-tail-sway 2.8s ease-in-out infinite; }\n.tp-mascot-mochi.tp-mascot-idle .tp-mochi-ear-l { animation: tp-mochi-ear-twitch-l 15s ease-in-out infinite; }\n.tp-mascot-mochi.tp-mascot-idle .tp-mochi-ear-r { animation: tp-mochi-ear-twitch-r 15s ease-in-out infinite; }\n.tp-mascot-vex .tp-vex-eq-1 { animation: tp-vex-eq-idle 1.2s ease-in-out infinite; }\n.tp-mascot-vex .tp-vex-eq-2 { animation: tp-vex-eq-idle 0.9s ease-in-out infinite 0.2s; }\n.tp-mascot-vex .tp-vex-eq-3 { animation: tp-vex-eq-idle 1.4s ease-in-out infinite 0.1s; }\n.tp-mascot-vex .tp-vex-eq-4 { animation: tp-vex-eq-idle 1.0s ease-in-out infinite 0.3s; }\n.tp-mascot-vex .tp-vex-eq-5 { animation: tp-vex-eq-idle 1.3s ease-in-out infinite 0.15s; }\n.tp-mascot-cogsworth .tp-cog-body ~ circle:nth-of-type(1) { animation: tp-cog-rivet-glow 3s ease-in-out infinite; }\n.tp-mascot-inko.tp-mascot-idle .tp-inko-arm-0 { animation: tp-inko-arm-long 3.8s ease-in-out infinite, tp-inko-fidget-l 10s ease-in-out infinite; }\n.tp-mascot-inko.tp-mascot-idle .tp-inko-arm-1 { animation: tp-inko-arm-long 3.8s ease-in-out infinite 0.5s, tp-inko-fidget-r 10s ease-in-out infinite; }\n.tp-mascot-inko.tp-mascot-idle .tp-inko-bubbles circle:first-child { animation: tp-inko-bubble-drift 6s ease-out infinite; }\n.tp-mascot-cogsworth.tp-mascot-idle .tp-cog-steam circle:nth-child(2) { animation: tp-cog-steam-drift 7s ease-out infinite; }\n.tp-mascot-mochi.tp-mascot-idle .tp-mochi-sparkles text:first-child { animation: tp-mochi-sparkle-drift 8s ease-out infinite; }\n.tp-mascot-pip.tp-mascot-idle { animation: tp-mascot-bob 3.2s ease-in-out infinite, tp-pip-twitch 9s ease-in-out infinite; }\n.tp-mascot-vex .tp-vex-scanline { animation: tp-vex-scan 2.4s linear infinite; }\n.tp-mascot-inko .tp-inko-chrom { transform-origin: center; transform-box: fill-box; animation: tp-inko-chrom-idle 2.4s ease-in-out infinite; }\n.tp-mascot-inko .tp-inko-chrom-sat { animation: tp-inko-chrom-sat-idle 2.4s ease-in-out infinite; }\n.tp-mascot-inko .tp-inko-fins path { transform-origin: center; transform-box: fill-box; animation: tp-inko-fin-undulate 2.6s ease-in-out infinite; }\n.tp-mascot-inko .tp-inko-mantle { animation: tp-inko-mantle-breathe 3.4s ease-in-out infinite; transform-origin: 50px 40px; transform-box: fill-box; }\n.tp-mascot-inko .tp-inko-arm-0 { animation: tp-inko-arm-long 3.8s ease-in-out infinite; }\n.tp-mascot-inko .tp-inko-arm-1 { animation: tp-inko-arm-long 3.8s ease-in-out infinite 0.5s; }\n.tp-mascot-inko .tp-inko-arm-2 { animation: tp-inko-arm-short 3.2s ease-in-out infinite 0s; }\n.tp-mascot-inko .tp-inko-arm-3 { animation: tp-inko-arm-short 3.2s ease-in-out infinite 0.2s; }\n.tp-mascot-inko .tp-inko-arm-4 { animation: tp-inko-arm-short 3.2s ease-in-out infinite 0.4s; }\n.tp-mascot-inko .tp-inko-arm-5 { animation: tp-inko-arm-short 3.2s ease-in-out infinite 0.6s; }\n.tp-mascot-inko .tp-inko-arm-6 { animation: tp-inko-arm-short 3.2s ease-in-out infinite 0.1s; }\n.tp-mascot-inko .tp-inko-arm-7 { animation: tp-inko-arm-short 3.2s ease-in-out infinite 0.3s; }\n.tp-mascot-inko .tp-inko-arm-8 { animation: tp-inko-arm-short 3.2s ease-in-out infinite 0.5s; }\n.tp-mascot-inko .tp-inko-arm-9 { animation: tp-inko-arm-short 3.2s ease-in-out infinite 0.7s; }\n.tp-mascot-combo { animation: tp-mascot-pop 0.6s ease-out 1, tp-mascot-bob 3.2s ease-in-out infinite 0.6s; }\n.tp-mascot-mochi.tp-mascot-combo .tp-mochi-sparkles text { animation: tp-mochi-sparkle 0.8s ease-out forwards; }\n.tp-mascot-cogsworth.tp-mascot-combo .tp-cog-steam circle { animation: tp-cog-steam 0.9s ease-out forwards; }\n.tp-mascot-pip.tp-mascot-combo .tp-pip-wing-l { animation: tp-pip-wing-flap 0.32s ease-in-out infinite; }\n.tp-mascot-pip.tp-mascot-combo .tp-pip-wing-r { animation: tp-pip-wing-flap-r 0.32s ease-in-out infinite; }\n.tp-mascot-pip.tp-mascot-combo .tp-pip-body { animation: tp-pip-body-pulse 0.32s ease-in-out infinite; }\n.tp-mascot-pip.tp-mascot-combo .tp-pip-leg-l { animation: tp-pip-leg-walk-l 0.28s linear infinite; }\n.tp-mascot-pip.tp-mascot-combo .tp-pip-leg-r { animation: tp-pip-leg-walk-r 0.28s linear infinite 0.14s; }\n.tp-mascot-cogsworth.tp-mascot-combo .tp-cog-pendulum { animation-duration: 0.8s; }\n.tp-mascot-cogsworth.tp-mascot-combo .tp-cog-gear-l { animation-duration: 2s; }\n.tp-mascot-cogsworth.tp-mascot-combo .tp-cog-gear-r { animation-duration: 2.4s; }\n.tp-mascot-cogsworth.tp-mascot-combo .tp-cog-wing-l { animation: tp-cog-wing-flap-l 0.5s ease-in-out infinite; }\n.tp-mascot-cogsworth.tp-mascot-combo .tp-cog-wing-r { animation: tp-cog-wing-flap-r 0.5s ease-in-out infinite; }\n.tp-mascot-vex.tp-mascot-combo .tp-vex-rim { animation: tp-vex-rim-pulse 0.8s ease-in-out infinite; }\n.tp-mascot-vex.tp-mascot-combo .tp-vex-eq-1 { animation: tp-vex-eq-combo 0.3s ease-in-out infinite; }\n.tp-mascot-vex.tp-mascot-combo .tp-vex-eq-2 { animation: tp-vex-eq-combo 0.25s ease-in-out infinite 0.05s; }\n.tp-mascot-vex.tp-mascot-combo .tp-vex-eq-3 { animation: tp-vex-eq-combo 0.28s ease-in-out infinite 0.1s; }\n.tp-mascot-vex.tp-mascot-combo .tp-vex-eq-4 { animation: tp-vex-eq-combo 0.22s ease-in-out infinite 0.08s; }\n.tp-mascot-vex.tp-mascot-combo .tp-vex-eq-5 { animation: tp-vex-eq-combo 0.27s ease-in-out infinite 0.12s; }\n.tp-mascot-mochi.tp-mascot-combo .tp-mochi-hearts text { animation: tp-mochi-heart-pop 1.1s ease-out infinite; }\n.tp-mascot-mochi.tp-mascot-combo .tp-mochi-hearts text:nth-child(2) { animation-delay: 0.35s; }\n.tp-mascot-mochi.tp-mascot-combo .tp-mochi-hearts text:nth-child(3) { animation-delay: 0.7s; }\n.tp-mascot-mochi.tp-mascot-combo .tp-mochi-tail { animation: tp-mochi-tail-wag 0.5s ease-in-out infinite; }\n.tp-mascot-mochi.tp-mascot-combo .tp-mochi-bow { animation: tp-mochi-bow-wiggle 0.4s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }\n.tp-mascot-mochi.tp-mascot-win .tp-mochi-bow { animation: tp-mochi-bow-wiggle 0.5s ease-in-out 4; transform-origin: center; transform-box: fill-box; }\n.tp-mascot-inko.tp-mascot-combo .tp-inko-chrom { animation: tp-inko-chrom-combo 0.6s ease-in-out infinite; }\n.tp-mascot-inko.tp-mascot-combo .tp-inko-chrom-sat { animation: tp-inko-chrom-combo 0.6s ease-in-out infinite 0.3s; }\n.tp-mascot-inko.tp-mascot-combo .tp-inko-bubbles circle { animation: tp-inko-bubble-rise 1.1s ease-out infinite; }\n.tp-mascot-inko.tp-mascot-combo .tp-inko-bubbles circle:nth-child(2) { animation-delay: 0.25s; }\n.tp-mascot-inko.tp-mascot-combo .tp-inko-bubbles circle:nth-child(3) { animation-delay: 0.5s; }\n.tp-mascot-inko.tp-mascot-combo .tp-inko-pupil { animation: tp-inko-pupil-dart 0.8s ease-in-out infinite; }\n.tp-mascot-inko.tp-mascot-combo .tp-inko-arm-2, .tp-mascot-inko.tp-mascot-combo .tp-inko-arm-3, .tp-mascot-inko.tp-mascot-combo .tp-inko-arm-4, .tp-mascot-inko.tp-mascot-combo .tp-inko-arm-5, .tp-mascot-inko.tp-mascot-combo .tp-inko-arm-6, .tp-mascot-inko.tp-mascot-combo .tp-inko-arm-7, .tp-mascot-inko.tp-mascot-combo .tp-inko-arm-8, .tp-mascot-inko.tp-mascot-combo .tp-inko-arm-9 { animation: tp-inko-arm-flick 0.7s ease-in-out infinite; }\n.tp-mascot-inko.tp-mascot-combo .tp-inko-fins path { animation-duration: 0.8s; }\n.tp-mascot-inko.tp-mascot-combo .tp-inko-bio-wave { animation-duration: 1.0s; }\n.tp-mascot-attack-out { animation: tp-mascot-throw 0.7s ease-out 1; }\n.tp-mascot-vex.tp-mascot-attack-out { animation: tp-mascot-throw 0.7s ease-out 1, tp-vex-glitch 0.7s ease-out 1; }\n.tp-mascot-vex.tp-mascot-attack-out .tp-vex-panel { animation: tp-vex-hex-distort 0.7s ease-out 1; }\n.tp-mascot-pip.tp-mascot-attack-out .tp-pip-beak { animation: tp-pip-beak-chirp 0.5s ease-out 1; }\n.tp-mascot-inko.tp-mascot-attack-out .tp-inko-ink circle { animation: tp-inko-ink-spurt 0.8s ease-out 1; }\n.tp-mascot-incoming { animation: tp-mascot-flinch 0.6s ease-out 1; }\n.tp-mascot-vex.tp-mascot-incoming .tp-vex-alert { animation: tp-vex-alert 0.6s ease-out 1; }\n.tp-mascot-inko.tp-mascot-incoming .tp-inko-chrom { animation: tp-inko-chrom-incoming 0.6s ease-out 1; }\n.tp-mascot-win { animation: tp-mascot-celebrate 0.9s ease-in-out 1; }\n.tp-mascot-loss { animation: tp-mascot-droop 1s ease-out forwards; }\n.tp-mascot-mochi.tp-mascot-loss .tp-mochi-tear { opacity: 0.85; transition: opacity 600ms ease-in; }\n.tp-mascot-mochi.tp-mascot-loss .tp-mochi-tail { animation: none; transform: rotate(-15deg); }\n.tp-mascot-mochi.tp-mascot-loss .tp-mochi-ear-l { transform: rotate(-18deg); }\n.tp-mascot-mochi.tp-mascot-loss .tp-mochi-ear-r { transform: rotate(18deg); }\n.tp-mascot-vex.tp-mascot-win .tp-vex-boot-1 { animation: tp-vex-boot-on 0.4s ease-out 1 forwards; }\n.tp-mascot-vex.tp-mascot-win .tp-vex-boot-2 { animation: tp-vex-boot-on 0.4s ease-out 1 forwards 0.15s; }\n.tp-mascot-vex.tp-mascot-win .tp-vex-boot-3 { animation: tp-vex-boot-on 0.4s ease-out 1 forwards 0.30s; }\n.tp-mascot-vex.tp-mascot-win .tp-vex-eq-1 { animation: tp-vex-eq-combo 0.3s ease-in-out infinite; }\n.tp-mascot-vex.tp-mascot-win .tp-vex-eq-2 { animation: tp-vex-eq-combo 0.25s ease-in-out infinite 0.05s; }\n.tp-mascot-vex.tp-mascot-win .tp-vex-eq-3 { animation: tp-vex-eq-combo 0.28s ease-in-out infinite 0.1s; }\n.tp-mascot-vex.tp-mascot-win .tp-vex-eq-4 { animation: tp-vex-eq-combo 0.22s ease-in-out infinite 0.08s; }\n.tp-mascot-vex.tp-mascot-win .tp-vex-eq-5 { animation: tp-vex-eq-combo 0.27s ease-in-out infinite 0.12s; }\n.tp-mascot-vex.tp-mascot-loss .tp-vex-boot-1 { animation: tp-vex-boot-off 0.4s ease-out 1 forwards 0.30s; }\n.tp-mascot-vex.tp-mascot-loss .tp-vex-boot-2 { animation: tp-vex-boot-off 0.4s ease-out 1 forwards 0.15s; }\n.tp-mascot-vex.tp-mascot-loss .tp-vex-boot-3 { animation: tp-vex-boot-off 0.4s ease-out 1 forwards; }\n.tp-mascot-vex.tp-mascot-loss .tp-vex-eq-1, .tp-mascot-vex.tp-mascot-loss .tp-vex-eq-2, .tp-mascot-vex.tp-mascot-loss .tp-vex-eq-3, .tp-mascot-vex.tp-mascot-loss .tp-vex-eq-4, .tp-mascot-vex.tp-mascot-loss .tp-vex-eq-5 { animation: none !important; transform: scaleY(0.1); opacity: 0.15; }\n.tp-mascot-pip.tp-mascot-win .tp-pip-wing-l { animation: tp-pip-wing-flap 0.5s ease-out 2; }\n.tp-mascot-pip.tp-mascot-win .tp-pip-wing-r { animation: tp-pip-wing-flap-r 0.5s ease-out 2; }\n.tp-mascot-pip.tp-mascot-win .tp-pip-legs { animation: tp-pip-legs-jump 0.5s ease-out infinite; }\n.tp-mascot-pip.tp-mascot-loss .tp-pip-leg-l { transform: rotate(-25deg) translateY(-1px); }\n.tp-mascot-pip.tp-mascot-loss .tp-pip-leg-r { transform: rotate(25deg) translateY(-1px); }\n.tp-mascot-pip.tp-mascot-loss .tp-pip-sprout { transform: rotate(140deg) translate(-2px, 4px) scaleY(0.7); }\n.tp-mascot-cogsworth.tp-mascot-win .tp-cog-pendulum { animation-duration: 0.6s; }\n.tp-mascot-cogsworth.tp-mascot-win .tp-cog-wing-l { animation: tp-cog-wing-flap-l 0.3s ease-in-out infinite; }\n.tp-mascot-cogsworth.tp-mascot-win .tp-cog-wing-r { animation: tp-cog-wing-flap-r 0.3s ease-in-out infinite; }\n.tp-mascot-cogsworth.tp-mascot-loss .tp-cog-wing-l { transform: rotate(18deg); }\n.tp-mascot-cogsworth.tp-mascot-loss .tp-cog-wing-r { transform: rotate(-18deg); }\n.tp-mascot-mochi.tp-mascot-win .tp-mochi-bell { animation: tp-mochi-bell-swing 0.3s ease-in-out infinite; }\n.tp-mascot-mochi.tp-mascot-win .tp-mochi-paws { animation: tp-mochi-paws-raise 0.4s ease-out 1 forwards; }\n.tp-mascot-inko.tp-mascot-loss .tp-inko-chrom { animation: none; fill: #475569; opacity: 0.4; }\n.tp-mascot-inko.tp-mascot-loss .tp-inko-ink circle { opacity: 0.55; transition: opacity 800ms ease-in; }\n.tp-mascot-inko.tp-mascot-loss .tp-inko-fins path { animation: none; }\n.tp-mascot-inko.tp-mascot-loss .tp-inko-bio-wave { animation: none; opacity: 0.2; }\n.tp-mascot-inko.tp-mascot-win .tp-inko-chrom { animation: tp-inko-chrom-wow 0.9s linear infinite; }\n.tp-mascot-inko.tp-mascot-win .tp-inko-chrom-sat { animation: tp-inko-chrom-wow 0.9s linear infinite 0.45s; }\n.tp-mascot-inko.tp-mascot-win .tp-inko-rim { animation: tp-inko-rim-glow 1.2s ease-in-out infinite; }\n.tp-mascot-inko.tp-mascot-win .tp-inko-bubbles circle { animation: tp-inko-bubble-rise 1.4s ease-out infinite; }\n.tp-mascot-danger { animation: tp-mascot-tremble 0.45s ease-in-out infinite, tp-mascot-bob 3.2s ease-in-out infinite; filter: drop-shadow(0 0 6px rgba(239,68,68,0.55)); }\n.tp-mascot-wow { animation: tp-mascot-arch 0.7s ease-out 1; filter: drop-shadow(0 0 8px rgba(251,191,36,0.6)); }\n.tp-mascot-sleep { animation: tp-mascot-drift 4s ease-in-out infinite; }\n.tp-mascot-sleep .tp-mascot-z { animation: tp-mascot-zfloat 2.5s ease-out infinite; }\n.tp-mascot-sleep .tp-mascot-z-2 { animation-delay: 1.25s; }\n.tp-mascot-thinking { animation: tp-mascot-think 2.4s ease-in-out infinite; }\n.tp-mascot-pip.tp-mascot-sleep .tp-pip-pupil-l, .tp-mascot-pip.tp-mascot-sleep .tp-pip-pupil-r { transform: scaleY(0.1); animation: none; }\n.tp-mascot-mochi.tp-mascot-sleep .tp-mochi-eyes ellipse { transform: scaleY(0.15); transform-origin: center; transform-box: fill-box; }\n.tp-mascot-vex.tp-mascot-sleep .tp-vex-scanline { animation: none; opacity: 0.2; }\n.tp-mascot-vex.tp-mascot-sleep .tp-vex-eq-1, .tp-mascot-vex.tp-mascot-sleep .tp-vex-eq-2, .tp-mascot-vex.tp-mascot-sleep .tp-vex-eq-3, .tp-mascot-vex.tp-mascot-sleep .tp-vex-eq-4, .tp-mascot-vex.tp-mascot-sleep .tp-vex-eq-5 { animation: none !important; transform: scaleY(0.15); opacity: 0.35; }\n.tp-mascot-cogsworth.tp-mascot-sleep .tp-cog-gear-l, .tp-mascot-cogsworth.tp-mascot-sleep .tp-cog-gear-r { animation-duration: 18s; }\n.tp-mascot-pip.tp-mascot-danger .tp-pip-eyes circle:not(.tp-pip-pupil-l):not(.tp-pip-pupil-r) { transform: scale(1.15); transform-origin: center; transform-box: fill-box; }\n.tp-mascot-pip.tp-mascot-danger .tp-pip-cheek { animation: tp-pip-cheek-puff 0.6s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }\n.tp-mascot-pip.tp-mascot-danger .tp-pip-sprout { animation: tp-pip-sprout-shiver 0.15s linear infinite; }\n.tp-mascot-cogsworth.tp-mascot-danger .tp-cog-needle { animation: tp-cog-needle-violent 0.12s linear infinite; stroke: #ef4444 !important; }\n.tp-mascot-cogsworth.tp-mascot-danger .tp-cog-steam circle { animation: tp-cog-steam-violent 0.35s linear infinite; }\n.tp-mascot-cogsworth.tp-mascot-danger .tp-cog-steam circle:nth-child(2) { animation-delay: 0.12s; }\n.tp-mascot-cogsworth.tp-mascot-danger .tp-cog-steam circle:nth-child(3) { animation-delay: 0.24s; }\n.tp-mascot-vex.tp-mascot-danger .tp-vex-eq-1 { animation: tp-vex-eq-danger 0.5s ease-in-out infinite; }\n.tp-mascot-vex.tp-mascot-danger .tp-vex-eq-2 { animation: tp-vex-eq-danger 0.4s ease-in-out infinite 0.1s; }\n.tp-mascot-vex.tp-mascot-danger .tp-vex-eq-3 { animation: tp-vex-eq-danger 0.6s ease-in-out infinite 0.05s; }\n.tp-mascot-vex.tp-mascot-danger .tp-vex-eq-4 { animation: tp-vex-eq-danger 0.45s ease-in-out infinite 0.15s; }\n.tp-mascot-vex.tp-mascot-danger .tp-vex-eq-5 { animation: tp-vex-eq-danger 0.55s ease-in-out infinite 0.08s; }\n.tp-mascot-mochi.tp-mascot-danger .tp-mochi-mouth { transform: translateY(2px) scaleY(-1); transform-origin: 50px 67px; }\n.tp-mascot-mochi.tp-mascot-danger .tp-mochi-ear-l { transform: rotate(-12deg); }\n.tp-mascot-mochi.tp-mascot-danger .tp-mochi-ear-r { transform: rotate(12deg); }\n.tp-mascot-mochi.tp-mascot-danger .tp-mochi-tail { animation: none; transform: rotate(0deg); }\n.tp-mascot-inko.tp-mascot-danger .tp-inko-chrom { animation: tp-inko-chrom-danger 0.5s ease-in-out infinite; }\n.tp-mascot-inko.tp-mascot-danger .tp-inko-chrom-sat { animation: tp-inko-chrom-danger 0.5s ease-in-out infinite 0.25s; }\n.tp-mascot-inko.tp-mascot-danger .tp-inko-pupil { animation: tp-inko-pupil-dart 0.4s ease-in-out infinite; }\n.tp-mascot-inko.tp-mascot-danger .tp-inko-bio-wave { animation: tp-inko-bio-pulse-danger 0.5s ease-in-out infinite !important; }\n.tp-mascot-inko.tp-mascot-wow .tp-inko-chrom { animation: tp-inko-chrom-wow 0.7s linear 1; }\n.tp-mascot-inko.tp-mascot-wow .tp-inko-chrom-sat { animation: tp-inko-chrom-wow 0.7s linear 1 0.35s; }\n.tp-mascot-inko.tp-mascot-wow .tp-inko-rim { animation: tp-inko-rim-glow 0.7s ease-out 1; }\n.tp-mascot-inko.tp-mascot-sleep .tp-inko-chrom { animation: none; opacity: 0.3; }\n.tp-mascot-inko.tp-mascot-sleep .tp-inko-fins path { animation: none; }\n.tp-mascot-inko.tp-mascot-sleep .tp-inko-eyes ellipse { transform: scaleY(0.15); transform-origin: center; transform-box: fill-box; }\n.tp-mascot-inko.tp-mascot-sleep .tp-inko-bio-wave { animation: none; opacity: 0.15; }\n@media (prefers-reduced-motion: reduce) { .tp-mascot, .tp-mascot *, .tp-mascot.tp-mascot-combo, .tp-mascot.tp-mascot-attack-out, .tp-mascot.tp-mascot-incoming, .tp-mascot.tp-mascot-win, .tp-mascot.tp-mascot-loss { animation: none !important; } }";
    (document.head || document.documentElement).appendChild(style);
  })();

  var THEME_TO_ID = { 'default': 'pip', 'steampunk': 'cogsworth', 'cyberpunk': 'vex', 'kawaii': 'mochi', 'oceanic': 'inko' };
  var ID_TO_THEME = {};
  Object.keys(THEME_TO_ID).forEach(function (t) { ID_TO_THEME[THEME_TO_ID[t]] = t; });
  var publicBios = MASCOT_BIOS.map(function (b) { return Object.assign({}, b, { id: THEME_TO_ID[b.theme] || b.theme }); });
  var byId = {};
  publicBios.forEach(function (b) { byId[b.id] = b; });
  var api = {
    __locked: true,
    __shared: true,
    ids: ['pip', 'cogsworth', 'vex', 'mochi', 'inko'],
    bios: publicBios,
    getBio: function (id) { return byId[id] || null; },
    render: function (id, opts) {
      opts = Object.assign({}, opts || {});
      var theme = ID_TO_THEME[id] || 'default';
      if (opts.sleeping && !opts.state) opts.state = 'sleep';
      return withIdSuffix(renderBattleMascot(theme, opts.state || 'idle', opts), opts.idSuffix);
    }
  };
  if (!(window.AlloMascots && window.AlloMascots.__locked)) window.AlloMascots = api;
  window.AlloModules.AlloMascotsModule = api;
})();
