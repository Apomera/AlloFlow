// ═══════════════════════════════════════════
// stem_tool_behaviorlab.js — Behavior Lab (standalone CDN module)
// Operant & classical conditioning simulator with animated Skinner box
// Extracted from stem_tool_science.js and enhanced
// ═══════════════════════════════════════════

// ═══ Defensive StemLab guard ═══
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

// Dedup: skip if already registered (hub may have loaded inline copy)
if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('behaviorLab'))) {

(function() {
  'use strict';
  // ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEAM Lab tools ──
  (function() {
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();

  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-behaviorlab')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-behaviorlab';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  // Scoped responsive workspace for Behavior Lab.
  if (!document.getElementById('behaviorlab-workspace-css')) {
    var behaviorLabStyle = document.createElement('style');
    behaviorLabStyle.id = 'behaviorlab-workspace-css';
    behaviorLabStyle.textContent = [
      // ── Palette ────────────────────────────────────────────────────────────
      // These were bound to var(--allo-stem-*), which follows the APP theme, while
      // every panel background in this tool is a hardcoded dark navy. In the light
      // theme that combination resolved to #0f172a text on rgba(30,41,59,.55) —
      // roughly 1.2:1, i.e. invisible — and the two panels that DID follow the app
      // (`--bl-canvas`) turned white underneath text that stayed slate-100.
      // Per STEM_LAB_THEME_AUDIT the immersive dark lab surface is deliberate, so
      // the fix is to make the tool internally consistent: pin the lab palette dark
      // and give high contrast its own explicit override below, rather than let two
      // halves of the same panel follow different themes.
      '.behaviorlab-tool-shell{--bl-amber:#f59e0b;--bl-amber-text:#fcd34d;--bl-indigo:#6366f1;--bl-text:#e2e8f0;--bl-muted:#9fb0c4;--bl-panel:#1e293b;--bl-canvas:#0f172a;--bl-border:#334155;max-width:1080px!important;margin:0 auto;color:var(--bl-text);padding:8px 2px!important;}',
      // High contrast is the one theme whose whole purpose is legibility, so it
      // overrides the lab palette outright instead of relying on the app-wide
      // attribute-selector sweep — that sweep matches inline-style SUBSTRINGS, and
      // React serialises inline colours as rgb(), so it never fires in this tool.
      '.theme-contrast .behaviorlab-tool-shell{--bl-amber:#ffff00;--bl-amber-text:#ffff00;--bl-indigo:#ffff00;--bl-text:#ffff00;--bl-muted:#ffff00;--bl-panel:#000;--bl-canvas:#000;--bl-border:#ffff00;}',
      '.behaviorlab-tool-shell *{box-sizing:border-box;}',
      '.behaviorlab-tool-shell button,.behaviorlab-tool-shell input,.behaviorlab-tool-shell select,.behaviorlab-tool-shell textarea{font:inherit;}',
      '.behaviorlab-tool-shell button:focus-visible,.behaviorlab-tool-shell input:focus-visible,.behaviorlab-tool-shell select:focus-visible,.behaviorlab-tool-shell textarea:focus-visible,.behaviorlab-tool-shell summary:focus-visible,.behaviorlab-tool-shell canvas:focus-visible{outline:3px solid #38bdf8;outline-offset:3px;}',
      '.behaviorlab-command{border-radius:18px!important;padding:18px!important;background:radial-gradient(circle at 88% 12%,rgba(251,191,36,.18),transparent 34%),linear-gradient(135deg,rgba(69,26,3,.88),rgba(15,23,42,.96))!important;box-shadow:0 18px 42px rgba(15,23,42,.2);}',
      '.behaviorlab-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:0 0 14px;}',
      '.behaviorlab-metric{min-width:0;border:1px solid var(--bl-border);border-radius:12px;padding:10px 12px;background:linear-gradient(180deg,var(--bl-canvas),var(--bl-panel));}',
      '.behaviorlab-metric-label{display:block;color:var(--bl-muted);font-size:10px;font-weight:900;letter-spacing:.07em;text-transform:uppercase;}',
      '.behaviorlab-metric-value{display:block;margin-top:3px;color:var(--bl-text);font-size:14px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.behaviorlab-level-section{border:1px solid var(--bl-border);border-radius:16px;padding:14px;background:linear-gradient(180deg,var(--bl-canvas),var(--bl-panel));}',
      '.behaviorlab-level-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:10px;}',
      '.behaviorlab-level-heading h3{margin:0;color:var(--bl-text);font-size:15px;}',
      '.behaviorlab-level-heading p{margin:3px 0 0;color:var(--bl-muted);font-size:11px;line-height:1.45;}',
      '.behaviorlab-level-progress{flex:0 0 auto;border-radius:999px;padding:5px 9px;background:rgba(245,158,11,.13);color:#fbbf24;font-size:10px;font-weight:900;}',
      '.behaviorlab-level-grid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px!important;margin:0!important;}',
      '.behaviorlab-level-card{display:flex;align-items:center;justify-content:flex-start;min-width:0;min-height:46px;padding:9px 10px!important;text-align:left;line-height:1.25;border:1px solid var(--bl-border)!important;}',
      '.behaviorlab-level-card[aria-current="step"]{border-color:#fbbf24!important;box-shadow:0 0 0 2px rgba(251,191,36,.2),0 8px 18px rgba(15,23,42,.2);}',
      '.behaviorlab-level-card:disabled{opacity:.55;}',
      '.behaviorlab-intro-card{border-radius:18px!important;padding:clamp(16px,3vw,24px)!important;}',
      '.behaviorlab-advanced{border:1px solid var(--bl-border);border-radius:14px;background:var(--bl-canvas);overflow:hidden;}',
      '.behaviorlab-advanced summary{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:46px;padding:11px 14px;cursor:pointer;color:var(--bl-text);font-size:12px;font-weight:900;}',
      '.behaviorlab-advanced summary::after{content:"Open";border-radius:999px;padding:3px 8px;background:rgba(99,102,241,.15);color:#a5b4fc;font-size:10px;}',
      '.behaviorlab-advanced[open] summary::after{content:"Close";}',
      '.behaviorlab-advanced-body{padding:0 12px 12px;}',
      '.behaviorlab-sim-shell{max-width:1080px!important;}',
      '.behaviorlab-sim-header{position:sticky;top:4px;z-index:4;box-shadow:0 10px 26px rgba(15,23,42,.2);}',
      '.behaviorlab-chamber-shell{border-radius:18px;overflow:hidden;border:2px solid rgba(99,102,241,.35);box-shadow:0 14px 36px rgba(15,23,42,.22);background:var(--bl-canvas);}',
      '.behaviorlab-chamber-header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 13px;border-bottom:1px solid var(--bl-border);background:linear-gradient(90deg,rgba(99,102,241,.16),rgba(245,158,11,.08));}',
      '.behaviorlab-chamber-header h3{margin:0;color:var(--bl-text);font-size:13px;font-weight:900;}',
      '.behaviorlab-chamber-status{border-radius:999px;padding:4px 8px;background:var(--bl-panel);color:#fbbf24;font-size:10px;font-weight:900;}',
      '.behaviorlab-chamber-canvas{width:100%!important;height:auto!important;min-height:260px;max-height:440px;}',
      // Section rules. A heading, a one-line orientation, and a hairline — enough
      // hierarchy to scan a very long column without turning the page into chrome.
      '.behaviorlab-section{display:flex;align-items:baseline;gap:10px;margin:22px 0 2px;padding-top:14px;border-top:1px solid var(--bl-border);}',
      '.behaviorlab-section h3{margin:0;flex:0 0 auto;color:var(--bl-amber-text);font-size:13px;font-weight:900;letter-spacing:.02em;}',
      '.behaviorlab-section p{margin:0;color:var(--bl-muted);font-size:11px;line-height:1.45;}',
      '@media (max-width:620px){.behaviorlab-section{flex-direction:column;gap:3px;}}',
      // 2D / 3D switch. Pill buttons, and the selected one is filled rather than
      // merely tinted — an aria-pressed state that is only a 1.2:1 background
      // difference is not a state anyone can see.
      // Tailwind's animate-pulse animates the ELEMENT's opacity 1 -> 0.5, so any
      // label inside spends half its cycle at half contrast: measured 3.28:1 on the
      // chain tracker and 2.98:1 on the Deliver Food button and the streak chip.
      // axe only caught the first, because it samples once and the sample has to
      // land in the trough. This pulses the glow and leaves the text alone.
      '.behaviorlab-glow-pulse{animation:bl-pulse 1.6s ease-in-out infinite;}',
      '@media (prefers-reduced-motion:reduce){.behaviorlab-glow-pulse{animation:none!important;}}',
      '.behaviorlab-viewswitch{display:inline-flex;gap:2px;padding:2px;border-radius:999px;background:rgba(2,6,23,.55);border:1px solid var(--bl-border);}',
      '.behaviorlab-viewswitch-btn{border:0;border-radius:999px;min-height:34px;padding:6px 12px;background:transparent;color:var(--bl-muted);font-size:10.5px;font-weight:800;cursor:pointer;line-height:1.2;}',
      // indigo-300, not indigo-500: dark ink on #6366f1 is 4.19:1, just under AA.
      '.behaviorlab-viewswitch-btn.is-on{background:#a5b4fc;color:#0b1220;}',
      '.theme-contrast .behaviorlab-viewswitch-btn.is-on{background:#ffff00;color:#000;}',
      '.behaviorlab-3d-btn{min-width:40px;min-height:40px;padding:6px 10px;border-radius:9px;border:1px solid var(--bl-border);background:rgba(15,23,42,.75);color:var(--bl-text);font-size:12px;font-weight:700;cursor:pointer;}',
      '.behaviorlab-3d-btn[disabled]{opacity:.55;cursor:default;}',
      '.behaviorlab-3d-part{min-height:40px;padding:8px 12px;border-radius:999px;border:1px solid var(--bl-border);background:rgba(15,23,42,.75);color:var(--bl-text);font-size:11px;font-weight:700;cursor:pointer;}',
      '.behaviorlab-3d-part.is-on{background:var(--bl-amber);color:#0b1220;border-color:var(--bl-amber);}',
      '.theme-contrast .behaviorlab-3d-part.is-on{background:#ffff00;color:#000;}',
      '@media (max-width:760px){.behaviorlab-metrics{grid-template-columns:repeat(2,minmax(0,1fr));}.behaviorlab-level-grid{grid-template-columns:repeat(2,minmax(0,1fr));}.behaviorlab-sim-header{position:static;}}',
      '@media (max-width:520px){.behaviorlab-tool-shell{padding:2px 0!important;}.behaviorlab-command{padding:13px!important;border-radius:14px!important;}.behaviorlab-level-section{padding:10px;}.behaviorlab-level-heading{align-items:flex-start;}.behaviorlab-level-progress{display:none;}.behaviorlab-level-grid{grid-template-columns:1fr;}.behaviorlab-level-card{min-height:44px;}.behaviorlab-metric{padding:8px 9px;}.behaviorlab-metric-value{font-size:12px;}.behaviorlab-chamber-header{align-items:flex-start;}.behaviorlab-chamber-canvas{min-height:220px;}}',
      '@media (prefers-reduced-motion:reduce){.behaviorlab-level-card{transition:none!important;}.behaviorlab-tool-shell *{scroll-behavior:auto!important;}}',
      '.theme-contrast .behaviorlab-command,.theme-contrast .behaviorlab-level-section,.theme-contrast .behaviorlab-chamber-shell{box-shadow:none;}'
    ].join('\n');
    document.head.appendChild(behaviorLabStyle);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3D observation chamber
  //
  // The 2D canvas stays the accessible floor and the default view; this is a
  // second RENDERING of the same simulation, never a second simulation. Every
  // position below is derived from the existing world coordinates the tick loop
  // already writes (blMouseX/blMouseY, BL_LEVER, BL_FOOD), so the two views can
  // never disagree about where anything is.
  //
  // Built on window.StemLab.makeBayViewer (host, beside ensureThree), which owns
  // attach/teardown, pause-when-unseen, context-loss recovery, drag + raycast
  // picking, keyboard camera and the label chips.
  // ═══════════════════════════════════════════════════════════════════════════

  // Simulation world → scene units. The sim roams x 35..365 and y 80..230; those
  // bounds are set by the movement code (`Math.max(40, Math.min(360, ...))` and
  // friends) and predate this view, so the mapping fits the box to them rather
  // than the other way round.
  function blWorldX(wx) { return (wx - 200) / 148; }   // → about -1.11 … 1.11
  function blWorldZ(wy) { return (wy - 155) / 108; }   // → about -0.69 … 0.69

  // Live prefers-reduced-motion. Held as a MediaQueryList rather than re-queried
  // per frame, but READ per frame so a student who flips the OS setting mid-session
  // is honoured without reloading the tool.
  var _blMotionMQ = null;
  function blReducedMotion() {
    try {
      if (_blMotionMQ === null) {
        _blMotionMQ = (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)')) || false;
      }
      return !!(_blMotionMQ && _blMotionMQ.matches);
    } catch (e) { return false; }
  }

  var BL_CHAMBER_PARTS = [
    { id: 'lever', label: 'Response lever' },
    { id: 'hopper', label: 'Food magazine' },
    { id: 'sdlight', label: 'Stimulus light' },
    { id: 'speaker', label: 'Tone generator' },
    { id: 'grid', label: 'Grid floor' },
    { id: 'house', label: 'House light' },
    { id: 'subject', label: 'Subject' }
  ];

  function buildChamberScene(THREE, api) {
    var meshes = {};
    var picks = [];
    var C = api.contrast;

    // Interior half-extents. Chosen so the mapped world bounds sit just inside
    // the walls instead of clipping through them.
    var HX = 1.25, HZ = 0.92, HY = 1.16;

    // The shell's trim() is tuned for painted metal — a pale blue specular at
    // shininess 30. That is right for the apparatus and wrong for fur, so the
    // organic surfaces get their own weak, dark specular.
    function metal(hex, shiny) {
      return new THREE.MeshPhongMaterial({
        color: C ? 0xffffff : hex,
        shininess: C ? 0 : (shiny == null ? 55 : shiny),
        // Restrained. The shell already lights this scene with a 0.92 key on a 0.44
        // ambient; a hot specular on top turned every steel surface into white
        // plastic and flattened the apparatus into one blown-out shape.
        specular: C ? 0x000000 : 0x8c9bb0
      });
    }
    function organic(hex, shiny) {
      return new THREE.MeshPhongMaterial({
        color: C ? 0xffffff : hex,
        shininess: C ? 0 : (shiny == null ? 5 : shiny),
        specular: C ? 0x000000 : 0x1a1620
      });
    }
    // Acrylic. depthWrite off so the panel in front of the camera blends over the
    // apparatus instead of z-fighting it out of existence, and DoubleSide so the
    // far walls still read once the camera swings behind the box.
    function acrylic() {
      var m = new THREE.MeshPhongMaterial({
        color: C ? 0x222222 : 0x8fb6d4,
        shininess: C ? 0 : 120,
        specular: C ? 0x000000 : 0xdfeaf7,
        transparent: true,
        // Four panes stack between the camera and the far wall, so per-pane alpha
        // compounds; 0.13 each washed the interior out to mid-grey.
        opacity: C ? 0.05 : 0.095,
        side: THREE.DoubleSide
      });
      m.depthWrite = false;
      return m;
    }
    // Emissive surfaces (lamp lenses) must survive the shell's per-frame emissive
    // pass, which otherwise resets every registered mesh to black. Opting into
    // _preserveBaseEmissive makes the shell ADD its selection glow on top of a
    // base this scene owns and mutates in frame().
    function lampMat(hex) {
      var m = new THREE.MeshPhongMaterial({
        color: C ? 0xffffff : hex, shininess: 60, specular: 0xffffff,
        emissive: new THREE.Color(0x000000)
      });
      m.userData._preserveBaseEmissive = true;
      m.userData._baseEmissive = { r: 0, g: 0, b: 0 };
      return m;
    }
    function box(w, h, dp, mat, x, y, z, parent) {
      var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, dp), mat);
      m.position.set(x || 0, y || 0, z || 0);
      (parent || api.scene).add(m);
      return m;
    }
    function blob(sx, sy, sz, mat, x, y, z, parent) {
      var m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), mat);
      m.scale.set(sx, sy, sz);
      m.position.set(x || 0, y || 0, z || 0);
      (parent || api.scene).add(m);
      return m;
    }
    function rod(len, r, mat, x, y, z, axis, parent) {
      var m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 12), mat);
      if (axis === 'x') m.rotation.z = Math.PI / 2;
      else if (axis === 'z') m.rotation.x = Math.PI / 2;
      m.position.set(x || 0, y || 0, z || 0);
      (parent || api.scene).add(m);
      return m;
    }
    // picks must hold MESHES — the shell raycasts non-recursively, so pushing a
    // Group builds fine and silently never picks.
    function reg(id, group) {
      group.traverse(function (o) {
        if (o.isMesh) { o.userData.partId = id; picks.push(o); }
      });
      meshes[id] = group;
      api.scene.add(group);
      return group;
    }

    // ── Enclosure ────────────────────────────────────────────────────────────
    // Deliberately NOT registered: the acrylic sits between the camera and every
    // part worth clicking, and a pickable pane would swallow every pick.
    var frameMat = metal(0x7d8a9d, 42);
    var acrylicMat = acrylic();
    var panels = [
      [2 * HX, HY, 0, HY / 2, -HZ, 0],            // back
      [2 * HX, HY, 0, HY / 2, HZ, 0],             // front
      [2 * HZ, HY, -HX, HY / 2, 0, Math.PI / 2],  // left
      [2 * HZ, HY, HX, HY / 2, 0, Math.PI / 2]    // right
    ];
    panels.forEach(function (p) {
      var pane = new THREE.Mesh(new THREE.PlaneGeometry(p[0], p[1]), acrylicMat);
      pane.position.set(p[2], p[3], p[4]);
      pane.rotation.y = p[5];
      api.scene.add(pane);
    });
    var lid = new THREE.Mesh(new THREE.PlaneGeometry(2 * HX, 2 * HZ), acrylicMat);
    lid.rotation.x = Math.PI / 2;
    lid.position.y = HY;
    api.scene.add(lid);

    // Corner posts and edge rails — the frame is what makes the box read as
    // apparatus rather than an empty rectangle floating in fog.
    [[-HX, -HZ], [HX, -HZ], [-HX, HZ], [HX, HZ]].forEach(function (c) {
      rod(HY, 0.036, frameMat, c[0], HY / 2, c[1]);
    });
    [0, HY].forEach(function (y) {
      rod(2 * HX, 0.028, frameMat, 0, y, -HZ, 'x');
      rod(2 * HX, 0.028, frameMat, 0, y, HZ, 'x');
      rod(2 * HZ, 0.028, frameMat, -HX, y, 0, 'z');
      rod(2 * HZ, 0.028, frameMat, HX, y, 0, 'z');
    });

    // Waste pan under the grid, and the plinth the whole box stands on.
    box(2 * HX + 0.10, 0.10, 2 * HZ + 0.10, metal(0x2d3a4d, 20), 0, -0.10, 0);
    box(2 * HX + 0.34, 0.07, 2 * HZ + 0.34, metal(0x1b2532, 12), 0, -0.19, 0);

    // ── Grid floor ───────────────────────────────────────────────────────────
    // Stainless rods, not a plane. The bars ARE the signature of an operant
    // chamber, and they give the shadows something to land between.
    var gridGroup = new THREE.Group();
    var rodMat = metal(0x8794a8, 34);
    var GRID_N = 15;
    for (var gi = 0; gi < GRID_N; gi++) {
      var gz = -HZ + 0.10 + (gi / (GRID_N - 1)) * (2 * HZ - 0.20);
      rod(2 * HX - 0.10, 0.017, rodMat, 0, 0.03, gz, 'x', gridGroup);
    }
    reg('grid', gridGroup);

    // ── Response lever ───────────────────────────────────────────────────────
    // Placed from BL_LEVER, the same constant the tick loop measures approach
    // against, so the thing the mouse walks toward is the thing that is drawn.
    var leverZ = blWorldZ(210);
    var leverGroup = new THREE.Group();
    box(0.10, 0.20, 0.16, metal(0x7d8a9c, 60), HX - 0.05, 0.34, leverZ, leverGroup);
    var leverPivot = new THREE.Group();
    leverPivot.position.set(HX - 0.10, 0.33, leverZ);
    leverGroup.add(leverPivot);
    var leverArm = box(0.30, 0.030, 0.050, metal(0xd7dfea, 150), -0.15, 0, 0, leverPivot);
    var leverPad = box(0.10, 0.028, 0.11, metal(0xe6ecf4, 150), -0.28, 0, 0, leverPivot);
    reg('lever', leverGroup);

    // ── Food magazine ────────────────────────────────────────────────────────
    var hopperZ = blWorldZ(238);
    var hopperGroup = new THREE.Group();
    box(0.09, 0.26, 0.30, metal(0x76839a, 55), -HX + 0.045, 0.20, hopperZ, hopperGroup);
    // Recessed aperture: a dark inset is what makes it read as an opening
    // rather than a bump on the wall.
    box(0.05, 0.15, 0.20, metal(0x0d1420, 8), -HX + 0.085, 0.17, hopperZ, hopperGroup);
    var trough = box(0.16, 0.035, 0.20, metal(0xb9c4d2, 110), -HX + 0.15, 0.10, hopperZ, hopperGroup);
    // Delivery tube up the wall — the pellet's route is visible, which is what
    // makes the drop legible as a mechanism rather than a pellet appearing.
    var tubeMat = acrylic();
    var tube = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.80, 16, 1, true), tubeMat);
    tube.position.set(-HX + 0.10, 0.60, hopperZ);
    hopperGroup.add(tube);
    reg('hopper', hopperGroup);

    var pelletMat = new THREE.MeshPhongMaterial({
      color: C ? 0xffffff : 0xd8a851, shininess: 24, specular: 0x6b5a34,
      emissive: new THREE.Color(0x000000)
    });
    // Outside `meshes` on purpose: the pellet's opacity and position are the
    // reinforcement animation, and the shell owns both for registered parts.
    var pellet = new THREE.Mesh(new THREE.SphereGeometry(0.042, 16, 12), pelletMat);
    pellet.position.set(-HX + 0.10, 0.12, hopperZ);
    pellet.visible = false;
    api.scene.add(pellet);

    // ── Stimulus light (SD / S-delta) ────────────────────────────────────────
    var sdGroup = new THREE.Group();
    box(0.08, 0.16, 0.16, metal(0x6f7b8d, 45), HX - 0.04, 0.80, leverZ, sdGroup);
    var sdLensMat = lampMat(0x94a3b8);
    var sdLens = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.035, 20), sdLensMat);
    sdLens.rotation.z = Math.PI / 2;
    sdLens.position.set(HX - 0.09, 0.80, leverZ);
    sdGroup.add(sdLens);
    reg('sdlight', sdGroup);
    var sdLamp = new THREE.PointLight(0xffffff, 0, 1.9);
    sdLamp.position.set(HX - 0.22, 0.80, leverZ);
    api.scene.add(sdLamp);

    // ── Tone generator ───────────────────────────────────────────────────────
    var spGroup = new THREE.Group();
    var grille = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.035, 24), metal(0x5f6b7d, 40));
    grille.rotation.x = Math.PI / 2;
    grille.position.set(0, 0.80, -HZ + 0.03);
    spGroup.add(grille);
    for (var si = 1; si <= 3; si++) {
      var ring = new THREE.Mesh(new THREE.TorusGeometry(0.026 * si, 0.006, 6, 22), metal(0x99a6b8, 90));
      ring.position.set(0, 0.80, -HZ + 0.052);
      spGroup.add(ring);
    }
    reg('speaker', spGroup);

    // Expanding wavefronts for the Pavlov tone. Outside `meshes`: their scale and
    // opacity ARE the animation.
    var toneRings = [];
    for (var ti = 0; ti < 3; ti++) {
      var tr = new THREE.Mesh(
        new THREE.TorusGeometry(0.13, 0.010, 6, 32),
        new THREE.MeshBasicMaterial({ color: C ? 0xffffff : 0x7dd3fc, transparent: true, opacity: 0 })
      );
      tr.position.set(0, 0.80, -HZ + 0.07);
      tr.visible = false;
      api.scene.add(tr);
      toneRings.push(tr);
    }

    // ── House light ──────────────────────────────────────────────────────────
    var houseGroup = new THREE.Group();
    box(0.20, 0.05, 0.20, metal(0x6f7b8d, 45), 0, HY - 0.03, 0, houseGroup);
    var houseLensMat = lampMat(0xfff3d4);
    var houseLens = new THREE.Mesh(new THREE.SphereGeometry(0.075, 18, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), houseLensMat);
    houseLens.position.set(0, HY - 0.06, 0);
    houseGroup.add(houseLens);
    reg('house', houseGroup);
    var houseLamp = new THREE.PointLight(0xffe6b8, C ? 0 : 0.55, 3.4);
    houseLamp.position.set(0, HY - 0.14, 0);
    api.scene.add(houseLamp);

    // ── Subject ──────────────────────────────────────────────────────────────
    var furMat = organic(0xd7d3dd, 4);
    var pinkMat = organic(0xefa8b4, 9);
    var eyeMat = new THREE.MeshPhongMaterial({
      color: C ? 0x000000 : 0x14121c, shininess: 180, specular: 0xffffff
    });
    var mouse = new THREE.Group();
    // The shell owns per-mesh scale for everything in `meshes` — that is how
    // selection and recede work — so the subject opts out and drives its own
    // motion through position, rotation and INNER-child scale instead.
    mouse.userData.noSelectionScale = true;
    mouse.userData.labelAnchor = new THREE.Vector3(0, 0.24, 0);

    var mouseBody = blob(0.105, 0.088, 0.155, furMat, 0, 0.088, 0, mouse);
    var headPivot = new THREE.Group();
    headPivot.position.set(0, 0.098, 0.125);
    mouse.add(headPivot);
    blob(0.072, 0.066, 0.080, furMat, 0, 0, 0.035, headPivot);
    var snout = new THREE.Mesh(new THREE.ConeGeometry(0.040, 0.085, 14), furMat);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, -0.012, 0.108);
    headPivot.add(snout);
    blob(0.016, 0.014, 0.014, pinkMat, 0, -0.014, 0.152, headPivot);   // nose
    var earL = blob(0.050, 0.050, 0.012, pinkMat, -0.055, 0.055, -0.005, headPivot);
    var earR = blob(0.050, 0.050, 0.012, pinkMat, 0.055, 0.055, -0.005, headPivot);
    earL.rotation.set(0, -0.5, -0.25);
    earR.rotation.set(0, 0.5, 0.25);
    blob(0.013, 0.013, 0.013, eyeMat, -0.042, 0.012, 0.088, headPivot);
    blob(0.013, 0.013, 0.013, eyeMat, 0.042, 0.012, 0.088, headPivot);
    // Whiskers, six thin rods. Small, but they are most of why the head reads as
    // a mouse and not a grey egg.
    var whiskerMat = organic(0xf0eef4, 3);
    for (var wsi = 0; wsi < 6; wsi++) {
      var side = wsi < 3 ? -1 : 1;
      var tier = (wsi % 3) - 1;
      var wsk = rod(0.115, 0.0035, whiskerMat, side * 0.070, -0.004 + tier * 0.014, 0.128, 'x', headPivot);
      wsk.rotation.z = side * (0.30 + tier * 0.22);
      wsk.rotation.y = side * -0.55;
    }

    var feet = [];
    [[-0.070, 0.105], [0.070, 0.105], [-0.075, -0.070], [0.075, -0.070]].forEach(function (f) {
      feet.push(blob(0.030, 0.017, 0.045, pinkMat, f[0], 0.018, f[1], mouse));
    });

    // Tail as a chain: each segment hangs off the previous one, so a single
    // travelling phase offset produces a real whip instead of a rigid arc.
    var tailSegs = [];
    var tailRoot = new THREE.Group();
    tailRoot.position.set(0, 0.090, -0.150);
    mouse.add(tailRoot);
    var attach = tailRoot;
    for (var tsi = 0; tsi < 7; tsi++) {
      var seg = new THREE.Group();
      seg.position.z = tsi === 0 ? 0 : -0.048;
      var segMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.011 - tsi * 0.0011, 0.010 - tsi * 0.0011, 0.050, 8), pinkMat);
      segMesh.rotation.x = Math.PI / 2;
      segMesh.position.z = -0.025;
      seg.add(segMesh);
      attach.add(seg);
      tailSegs.push(seg);
      attach = seg;
    }
    reg('subject', mouse);

    if (api.wantShadow) {
      [gridGroup, leverGroup, hopperGroup, sdGroup, spGroup, mouse].forEach(function (g) {
        g.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      });
    }

    // Smoothed heading, kept across frames so the subject turns rather than snaps.
    var heading = 0;
    var lastX = 0, lastZ = 0, haveLast = false;

    return {
      meshes: meshes,
      picks: picks,
      anchor: gridGroup,
      frame: function (now, sp, reduced) {
        var st = sp && sp.st ? sp.st : null;
        if (!st) return;
        var t = now / 1000;

        // ── Subject ──
        var tx = blWorldX(st.mouseX == null ? 200 : st.mouseX);
        var tz = blWorldZ(st.mouseY == null ? 155 : st.mouseY);
        var act = st.mouseAction || 'explore';
        var moving = act === 'explore' || act === 'approachLever' || act === 'turnLeft' ||
          act === 'turnRight' || act === 'halfTurn' || act === 'touchWall';

        if (haveLast) {
          var vx = tx - lastX, vz = tz - lastZ;
          if (vx * vx + vz * vz > 1e-6) {
            var want = Math.atan2(vx, vz);
            var diff = want - heading;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            heading += diff * (reduced ? 1 : 0.16);
          }
        }
        lastX = tx; lastZ = tz; haveLast = true;

        var bob = (reduced || !moving) ? 0 : Math.abs(Math.sin(t * 6.4)) * 0.014;
        var rear = act === 'rearUp' ? 1 : 0;
        mouse.position.set(tx, 0.045 + bob + rear * 0.075, tz);
        mouse.rotation.y = act === 'spin' && !reduced ? (t * 3.4) : heading;
        mouse.rotation.x = -rear * 0.62;

        // Breathing lives on the body MESH, never on the registered group.
        var breath = reduced ? 1 : 1 + Math.sin(t * 1.9) * 0.022;
        mouseBody.scale.set(0.105 * breath, 0.088 * breath, 0.155);

        // Head: nose-down for sniffing, tipped toward the lever while pressing,
        // bobbing while grooming. Frozen means frozen.
        var headPitch = 0;
        if (!reduced) {
          if (act === 'sniff') headPitch = 0.26 + Math.sin(t * 9) * 0.10;
          else if (act === 'groom') headPitch = 0.30 + Math.sin(t * 7) * 0.16;
          else if (act === 'pressLever') headPitch = 0.20;
          else if (act === 'freeze') headPitch = 0;
          else headPitch = Math.sin(t * 2.1) * 0.05;
        }
        headPivot.rotation.x = headPitch;
        earL.rotation.z = -0.25 + (reduced ? 0 : Math.sin(t * 3.1) * 0.13);
        earR.rotation.z = 0.25 + (reduced ? 0 : Math.sin(t * 2.6) * 0.11);

        for (var fi = 0; fi < feet.length; fi++) {
          var swing = (reduced || !moving) ? 0 : Math.sin(t * 6.4 + (fi % 2) * Math.PI) * 0.030;
          feet[fi].position.z = (fi < 2 ? 0.105 : -0.070) + swing;
        }

        // Tail wag speeds up after reinforcement — the same "recent food" tell the
        // 2D sprite uses, read from the same state.
        var fed = st.foodVisible || (st.foodTime && (now - st.foodTime) < 2000);
        var wagHz = fed ? 7.5 : (moving ? 3.6 : 2.1);
        var wagAmp = fed ? 0.30 : 0.17;
        for (var wsg = 0; wsg < tailSegs.length; wsg++) {
          tailSegs[wsg].rotation.y = reduced ? 0.05 : Math.sin(t * wagHz - wsg * 0.55) * wagAmp;
          tailSegs[wsg].rotation.x = wsg === 0 ? -0.30 : 0.055;
        }

        // ── Lever ──
        var pressed = act === 'pressLever';
        var wantRot = pressed ? -0.34 : 0;
        leverPivot.rotation.z += (wantRot - leverPivot.rotation.z) * (reduced ? 1 : 0.35);

        // ── Food magazine ──
        // One timeline: 0–0.45s the pellet travels the tube, then it sits in the
        // trough for as long as the 2D view shows it.
        var age = st.foodTime ? (now - st.foodTime) / 1000 : 1e9;
        if (st.foodVisible && age < 12) {
          pellet.visible = true;
          var drop = Math.min(1, age / 0.45);
          pellet.position.set(-HX + 0.10, 0.95 - drop * 0.83, hopperZ);
          if (drop >= 1) pellet.position.set(-HX + 0.13, 0.135, hopperZ);
          pelletMat.emissive.setRGB(0.30, 0.20, 0.03);
        } else {
          pellet.visible = false;
        }

        // ── Stimulus light ──
        // Only levels 5 and 6 run a discriminative stimulus; on every other level
        // the lens sits dark rather than implying a contingency that is not there.
        var sdOn = st.level === 5 || st.level === 6;
        var lit = sdOn ? (st.lightColor === 'green' ? 1 : (st.lightColor === 'red' ? 2 : 0)) : 0;
        var sdPulse = reduced ? 1 : 0.82 + 0.18 * Math.sin(t * 2.6);
        var be = sdLensMat.userData._baseEmissive;
        if (lit === 1) { be.r = 0.04; be.g = 0.62 * sdPulse; be.b = 0.22 * sdPulse; sdLamp.color.setHex(0x22c55e); sdLamp.intensity = C ? 0 : 0.9 * sdPulse; }
        else if (lit === 2) { be.r = 0.70 * sdPulse; be.g = 0.06; be.b = 0.10; sdLamp.color.setHex(0xef4444); sdLamp.intensity = C ? 0 : 0.9 * sdPulse; }
        else { be.r = 0; be.g = 0; be.b = 0; sdLamp.intensity = 0; }
        sdLensMat.color.setHex(C ? 0xffffff : (lit === 1 ? 0x22c55e : lit === 2 ? 0xef4444 : 0x94a3b8));

        // ── House light ──
        // Dimmed through extinction: reinforcement has stopped, and the room says so.
        var houseBase = st.extinctionPhase ? 0.16 : 0.34;
        var hb = houseLensMat.userData._baseEmissive;
        hb.r = houseBase; hb.g = houseBase * 0.92; hb.b = houseBase * 0.70;
        houseLamp.intensity = C ? 0 : (st.extinctionPhase ? 0.26 : 0.55);

        // ── Tone generator ──
        // Rings only while the CS is actually sounding, so the visual and the
        // bell state cannot drift apart.
        for (var ri = 0; ri < toneRings.length; ri++) {
          var r3 = toneRings[ri];
          if (!st.bellRinging || reduced) {
            r3.visible = !!st.bellRinging && reduced && ri === 0;
            if (r3.visible) { r3.scale.setScalar(1.4); r3.material.opacity = 0.55; }
            continue;
          }
          var ph = ((t * 1.5) + ri / toneRings.length) % 1;
          r3.visible = true;
          r3.scale.setScalar(0.6 + ph * 2.6);
          r3.material.opacity = 0.62 * (1 - ph);
        }
      }
    };
  }

  // A null viewer keeps the tool alive where the host shell is missing or WebGL
  // is blocked; the view reads status() directly, because a null viewer never
  // calls onStatus and a React-state-only check would spin on "loading" forever.
  var BL_NULL_VIEWER = {
    attach: function () {}, sync: function () {}, nudge: function () {},
    zoom: function () {}, reset: function () {}, status: function () { return 'failed'; }
  };
  var BL_CHAMBER3D = (function () {
    var mk = (typeof window !== 'undefined') && window.StemLab && window.StemLab.makeBayViewer;
    if (!mk) return BL_NULL_VIEWER;
    return mk({
      parts: BL_CHAMBER_PARTS,
      buildScene: buildChamberScene,
      // Close enough that the apparatus reads at a glance. The shell clamps
      // distance to 2.6-8.5, so there is room to pull back from here.
      home: { yaw: 0.62, pitch: 0.50, dist: 3.55 }
    });
  })();

  window.StemLab.registerTool('behaviorLab', {
    icon: "🐭",
    label: "Behavior Lab",
    // The old description covered only the Skinner box, and about half this tool by
    // volume is human/school ABA — an FBA trainer, twelve student vignettes, a BIP
    // outline builder, a classroom token economy, the ethics timeline and the
    // autism-community critique. A teacher picking tools from this list deserves
    // to know that before they open it in front of a class.
    desc: 'Operant conditioning through a virtual Skinner box, then the same science applied to school settings. 9 progressive levels (positive reinforcement, shaping, extinction, FR / VR / FI / VI schedules, discrimination, chaining, DRO, Pavlov) with a 2D and a 3D chamber view; Schedule Sleuth for reading cumulative-response curves. The second half is human behaviour: the four functions of behaviour, a Function Sleuth of classroom FBA vignettes, a token-economy builder, a BIP outline, ABA history and ethics, and a neurodiversity-affirming critique of the field. Teaches concepts, not clinical competence. Sister tool to PetsLab (pet training) and School Behavior Toolkit (school-wide practice).',
    color: 'slate',
    category: 'science',
    questHooks: [
      { id: 'reach_level_3', label: 'Advance to level 3 in behavior analysis', icon: '\uD83D\uDCCA', check: function(d) { return (d.blLevel || 1) >= 3; }, progress: function(d) { return 'Level ' + (d.blLevel || 1) + '/3'; } },
      { id: 'record_10_data', label: 'Record 10 data points on the cumulative record', icon: '\uD83D\uDCDD', check: function(d) { return (d.blCumRecord || []).length >= 10; }, progress: function(d) { return (d.blCumRecord || []).length + '/10 points'; } },
      { id: 'run_50_ticks', label: 'Run the simulation for 50+ ticks', icon: '\u25B6\uFE0F', check: function(d) { return (d.blTick || 0) >= 50; }, progress: function(d) { return (d.blTick || 0) + '/50 ticks'; } }
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
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === "function") ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      // __alloT with {named} slots. Interpolated messages used to be built by
      // gluing English fragments around a number, which hands a translator
      // "Level " and " Complete! " and no way to reorder them; a whole sentence
      // with slots is translatable, a pile of fragments is not.
      var blT = function (k, fb, vars) {
        var out = __alloT(k, fb);
        if (!vars) return out;
        for (var vk in vars) {
          if (Object.prototype.hasOwnProperty.call(vars, vk)) {
            out = out.split('{' + vk + '}').join(String(vars[vk]));
          }
        }
        return out;
      };
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

      // ── Tool body (behaviorLab) ──
      return (function() {
var d = labToolData || {};
// Live ref to `d` for the rAF chamber loop. The animation useEffect's
// deps are [blPhase, blPaused, d.blSpeed] but the loop body reads
// d.blWeights (line ~1125), d.blTotalTicks (~1385), d.blPosHistory
// (~1519), d.blSalivateTime (~1791), and d.blMouseX (~1922) — none
// listed in deps. Most damaging: blTotalTicks increments from the
// closure-captured baseline, so `upd('blTotalTicks', (d.blTotalTicks||0)+1)`
// would forever write 1 instead of advancing. Updating dataRef each
// render makes those reads live without tearing down the loop.
var dataRef = React.useRef(d);
dataRef.current = d;

          // ── Canvas narration: init ──
          if (typeof canvasNarrate === 'function') {
            canvasNarrate('behaviorLab', 'init', {
              first: 'Behavior Lab loaded. Track and analyze behavioral data with visual charts and evidence-based intervention tools.',
              repeat: 'Behavior Lab active.',
              terse: 'Behavior Lab.'
            }, { debounce: 800 });
          }

          var upd = function (k, v) { setLabToolData(function (p) { var n = Object.assign({}, p); n[k] = v; return n; }); };


          // ── Level definitions ──

          var LEVELS = [

            {

              id: 1, title: __alloT('stem.behaviorlab.first_food', 'First Food'), concept: 'Positive Reinforcement', target: 'pressLever', goal: 10,

              intro: __alloT('stem.behaviorlab.in_positive_reinforcement_a_consequenc', 'In positive reinforcement, a consequence is ADDED after a behavior to INCREASE the likelihood of that behavior occurring again. Your job: click "Deliver Food" immediately after the mouse presses the lever. Reinforce 10 lever presses!'),

              termDef: 'Positive Reinforcement (SR+): Adding a stimulus after a behavior that increases the future probability of that behavior.',

              funFact: '🧪 B.F. Skinner discovered that pigeons could be trained to guide missiles during WWII using operant conditioning — the project was called "Project Pigeon"!',

              vocab: ['SR+ (Positive Reinforcement)', 'Operant Behavior', 'Consequence'],

              contingency: { a: 'Chamber present', b: 'Presses lever', c: '🍕 Food delivered (+SR)' }

            },

            {

              id: 2, title: __alloT('stem.behaviorlab.shape_up', 'Shape Up!'), concept: 'Shaping', target: 'spin', goal: 5,

              intro: __alloT('stem.behaviorlab.shaping_uses_successive_approximations', 'Shaping uses successive approximations. The mouse won\'t spin on its own! Follow this 3-step sequence: (1) Reinforce "Turning Right" (↪️) to increase turning. (2) Once turns are frequent, wait for "Half-Turn" (↩️↪️) and reinforce those. (3) Finally, wait for full "Spinning" (🌀) and reinforce! Shape 5 complete spins through 3 stages of approximation!'),

              termDef: 'Shaping: Differentially reinforcing successive approximations toward a terminal (target) behavior.',

              funFact: '🐬 Dolphin trainers at SeaWorld use shaping to teach dolphins to do backflips — they start by reinforcing any upward movement!',

              vocab: ['Successive Approximations', 'Terminal Behavior', 'Differential Reinforcement'],

              contingency: { a: 'Trainer present', b: 'Closer to spin', c: '🍕 Food (reinforce!)' }

            },

            {

              id: 3, title: __alloT('stem.behaviorlab.the_burst', 'The Burst'), concept: 'Extinction', target: 'pressLever', goal: 0,

              intro: __alloT('stem.behaviorlab.when_reinforcement_is_suddenly_withhel', 'When reinforcement is suddenly withheld, the organism often shows an extinction burst — a temporary INCREASE in the behavior before it decreases. First, reinforce 5 lever presses, then STOP reinforcing and watch what happens!'),

              termDef: 'Extinction Burst: A temporary increase in frequency/intensity of a previously reinforced behavior when reinforcement is discontinued.',

              funFact: '🛗 Ever push an elevator button multiple times when it doesn\'t light up? That\'s YOUR extinction burst!',

              vocab: ['Extinction', 'Extinction Burst', 'Spontaneous Recovery'],

              contingency: { a: 'Chamber present', b: 'Presses lever', c: '❌ No food (extinction)' }

            },

            {

              id: 4, title: __alloT('stem.behaviorlab.on_schedule', 'On Schedule'), concept: 'Schedules of Reinforcement', target: 'pressLever', goal: 7,
              // 20 was already the outlier among goals of 3-10, and it was calibrated
              // against a level that reinforced every press. Now that the FR-3
              // requirement is real, each point costs three responses: 7 deliveries is
              // 21 presses, which sits with the rest of the ladder instead of turning
              // the schedule lesson into an endurance test.


              intro: __alloT('stem.behaviorlab.not_every_response_needs_reinforcement', 'Not every response needs reinforcement! A Fixed Ratio (FR) schedule reinforces after a set number of responses. Try FR-3: reinforce every 3rd lever press. Watch how the mouse responds differently than continuous reinforcement!'),

              termDef: 'Fixed Ratio (FR): A schedule where reinforcement is delivered after a fixed number of responses.',

              funFact: '🎰 Slot machines use Variable Ratio (VR) schedules — the most resistant to extinction — one reason they can be so habit-forming (along with other psychological, social, and neurological factors).',

              vocab: ['Fixed Ratio (FR)', 'Continuous Reinforcement (CRF)', 'Intermittent Reinforcement'],

              contingency: { a: 'Chamber present', b: 'Every 3rd press', c: '🍕 Food (FR-3)' }

            },

            {

              id: 5, title: __alloT('stem.behaviorlab.green_means_go', 'Green Means Go'), concept: 'Stimulus Discrimination', target: 'pressLever', goal: 10,

              intro: __alloT('stem.behaviorlab.a_discriminative_stimulus_sd_signals_t', 'A discriminative stimulus (SD) signals that reinforcement is available. The green light = SD (reinforce lever presses). Red light = S-delta (do NOT reinforce). Teach the mouse to press only when the green light is on!'),

              termDef: 'SD (Discriminative Stimulus): A stimulus that signals reinforcement is available for a specific behavior.',

              funFact: '🚦 Traffic lights work as discriminative stimuli for drivers — green (SD) signals "go" and red (S-delta) signals "stop"!',

              vocab: ['SD (Discriminative Stimulus)', 'S-delta (S∆)', 'Stimulus Control'],

              contingency: { a: '🟢 Green light (SD)', b: 'Presses lever', c: '🍕 Food delivered' }

            },

            {

              id: 6, title: __alloT('stem.behaviorlab.free_lab', 'Free Lab'), concept: 'Sandbox Mode', target: null, goal: 0,

              intro: __alloT('stem.behaviorlab.welcome_to_the_free_lab_all_tools_are_', 'Welcome to the Free Lab! All tools are unlocked. Design your own experiment. Try shaping a new behavior, testing different schedules, or building a behavior chain. Happy experimenting!'),

              termDef: 'Applied Behavior Analysis (ABA): The science of applying behavioral principles to improve socially significant behavior.',

              funFact: '🌍 ABA principles are used everywhere — from teaching children with autism to training service dogs, to designing better apps!',

              vocab: ['Behavior Chain', 'Generalization', 'Maintenance'],

              contingency: { a: 'Your choice!', b: 'Pick a behavior', c: 'Design the consequence' }

            },

            {

              id: 7, title: __alloT('stem.behaviorlab.chain_reaction', 'Chain Reaction'), concept: 'Behavior Chaining', target: 'pressLever', goal: 3,

              intro: __alloT('stem.behaviorlab.a_behavior_chain_links_multiple_behavi', 'A behavior chain links multiple behaviors in a specific sequence. The completion of one step becomes the signal (SD) for the next. Teach the mouse this chain: Sniff ➜ Rear Up ➜ Press Lever. Reinforce ONLY when the full 3-step chain is completed!'),

              termDef: 'Behavior Chain: A sequence of responses where each response produces the discriminative stimulus (SD) for the next response, and the last response is followed by a reinforcer.',

              funFact: '🐕 Service dogs learn behavior chains of 20+ steps — like opening the fridge, grabbing a drink, closing the fridge, and bringing it to their handler!',

              vocab: ['Behavior Chain', 'Forward Chaining', 'Task Analysis', 'Terminal Reinforcer'],

              contingency: { a: 'Chain cue', b: 'Sniff→Rear→Lever', c: '🍕 Food (chain complete!)' }

            },

            {

              id: 8, title: __alloT('stem.behaviorlab.not_that', 'Not That!'), concept: 'DRO — Differential Reinforcement', target: null, goal: 5,

              intro: __alloT('stem.behaviorlab.dro_differential_reinforcement_of_othe', 'DRO (Differential Reinforcement of Other behavior) means reinforcing the ABSENCE of a specific behavior for a set time interval. A countdown timer runs — if the mouse does NOT press the lever before the timer finishes, deliver food! If the mouse presses the lever, the timer resets. Deliver 5 successful DRO intervals!'),

              termDef: 'DRO (Differential Reinforcement of Other Behavior): Reinforcement is delivered when a specified behavior does NOT occur for a predetermined interval of time.',

              funFact: '🏫 Teachers use DRO all the time — "If no one calls out for 5 minutes, the class earns a point!" It reduces unwanted behavior without punishment.',

              vocab: ['DRO', 'Differential Reinforcement', 'Interval', 'Target Behavior'],

              contingency: { a: 'Timer running', b: 'Any behavior EXCEPT lever', c: '🍕 Food (DRO interval met!)' }

            },

            {

              id: 9, title: __alloT('stem.behaviorlab.pavlov_s_bell', 'Pavlov\'s Bell'), concept: 'Classical Conditioning', target: null, goal: 0,

              intro: __alloT('stem.behaviorlab.classical_conditioning_pairs_a_neutral', 'Classical conditioning pairs a neutral stimulus (bell) with an unconditioned stimulus (food) that naturally causes a response (salivation). After repeated pairings the bell ALONE triggers salivation! Phase 1: Ring the bell — nothing happens. Phase 2: Pair bell + food 5 times. Phase 3: Ring bell alone and watch for the conditioned response!'),

              termDef: 'Classical Conditioning: A learning process where a neutral stimulus (CS) is repeatedly paired with an unconditioned stimulus (US) until the CS alone elicits a conditioned response (CR).',

              funFact: '🐶 Ivan Pavlov discovered classical conditioning accidentally while studying dog digestion in the 1890s. The dogs began salivating at the sight of lab coats because they associated them with food!',

              vocab: ['US (Unconditioned Stimulus)', 'UR (Unconditioned Response)', 'CS (Conditioned Stimulus)', 'CR (Conditioned Response)', 'Acquisition', 'Extinction'],

              contingency: { a: '🔔 Bell (CS)', b: 'Paired with food (US)', c: '🤤 Salivation (CR)' }

            }

          ];


          // ── Knowledge Quiz Questions ──

          // The authored banks put 75% of correct answers in slot 2 (measured
          // 1/15/3/1 across quiz + scenarios), so position-savvy students
          // could pass without the behavior analysis. Rotate each question by
          // a deterministic per-question offset: questions are re-read from
          // the bank on every render (QUIZ_BANK[blLevel]), so a random
          // shuffle would deal new options mid-question, while a fixed
          // rotation is stable across renders. Grading is by option INDEX,
          // so `correct` moves with the options; explain/better strings are
          // not positional and stay put.
          var blRotateQuestion = function(q, seedIdx) {
            var opts = q.opts || q.options;
            if (!opts || opts.length < 2 || typeof q.correct !== 'number') return q;
            var n = opts.length;
            var shift = ((seedIdx * 7) + 3) % n;
            if (shift === 0) return q;
            var rotated = new Array(n);
            for (var i = 0; i < n; i++) rotated[(i + shift) % n] = opts[i];
            var next = Object.assign({}, q);
            if (q.opts) next.opts = rotated; else next.options = rotated;
            next.correct = (q.correct + shift) % n;
            return next;
          };
          var QUIZ_BANK = {

            1: { q: 'In positive reinforcement, what happens to the behavior?', opts: ['It decreases', 'It increases', 'It stays the same', 'It disappears'], correct: 1, explain: 'Positive reinforcement ADDS a stimulus that INCREASES the future probability of a behavior.' },

            2: { q: 'What is shaping?', opts: ['Punishing wrong behaviors', 'Reinforcing successive approximations', 'Ignoring all behaviors', 'Only reinforcing the final behavior'], correct: 1, explain: 'Shaping involves differentially reinforcing successive approximations toward the target behavior.' },

            3: { q: 'What is an extinction burst?', opts: ['A permanent increase in behavior', 'A temporary increase before behavior decreases', 'When a new behavior appears', 'When reinforcement increases'], correct: 1, explain: 'An extinction burst is a temporary INCREASE in the frequency or intensity of a behavior when reinforcement is suddenly discontinued.' },

            4: { q: 'In an FR-3 schedule, when is reinforcement delivered?', opts: ['After every response', 'After every 3rd response', 'After random responses', 'After 3 minutes'], correct: 1, explain: 'Fixed Ratio (FR-3) delivers reinforcement after every 3rd response — a fixed number of responses.' },

            5: { q: 'What does SD (discriminative stimulus) signal?', opts: ['Punishment is coming', 'Reinforcement is available', 'Extinction has started', 'The session is over'], correct: 1, explain: 'An SD signals that reinforcement is available for a specific behavior. It "sets the occasion" for that behavior.' },

            7: { q: 'In a behavior chain, what serves as the SD for the next step?', opts: ['The reinforcer', 'The completion of the previous step', 'A timer', 'The first behavior'], correct: 1, explain: 'In a behavior chain, completing each step produces the discriminative stimulus (SD) for the next step in the sequence.' },

            8: { q: 'What does DRO reinforce?', opts: ['The target behavior', 'The absence of a specific behavior', 'Only aggressive behaviors', 'Random behaviors'], correct: 1, explain: 'DRO (Differential Reinforcement of Other behavior) delivers reinforcement when a specified behavior does NOT occur for a set interval.' },

            9: { q: 'In classical conditioning, what is the conditioned stimulus (CS)?', opts: ['The food that causes salivation', 'The salivation response', 'A neutral stimulus paired with the US', 'The lab equipment'], correct: 2, explain: 'The CS starts as a neutral stimulus (like a bell) that gains the ability to elicit a response only after being repeatedly paired with the US (food).' }

          };


          Object.keys(QUIZ_BANK).forEach(function(level) {
            QUIZ_BANK[level] = blRotateQuestion(QUIZ_BANK[level], Number(level));
          });

          // ── Chain sequence for Level 7 ──

          var CHAIN_SEQ = ['sniff', 'rearUp', 'pressLever'];

          // === ENGAGEMENT: Level Badges ===
          var LEVEL_BADGES = {
            1: { icon: '\uD83C\uDF55', name: __alloT('stem.behaviorlab.first_feeder', 'First Feeder'), desc: __alloT('stem.behaviorlab.mastered_positive_reinforcement', 'Mastered positive reinforcement') },
            2: { icon: '\uD83C\uDFAF', name: __alloT('stem.behaviorlab.shape_shifter', 'Shape Shifter'), desc: __alloT('stem.behaviorlab.shaped_behavior_through_approximations', 'Shaped behavior through approximations') },
            3: { icon: '\uD83D\uDCA5', name: __alloT('stem.behaviorlab.burst_observer', 'Burst Observer'), desc: __alloT('stem.behaviorlab.witnessed_the_extinction_burst', 'Witnessed the extinction burst') },
            4: { icon: '\uD83D\uDCC5', name: __alloT('stem.behaviorlab.scheduler', 'Scheduler'), desc: __alloT('stem.behaviorlab.implemented_fr_3_schedule', 'Implemented FR-3 schedule') },
            5: { icon: '\uD83D\uDEA6', name: __alloT('stem.behaviorlab.signal_master', 'Signal Master'), desc: __alloT('stem.behaviorlab.taught_stimulus_discrimination', 'Taught stimulus discrimination') },
            6: { icon: '\uD83E\uDDEA', name: __alloT('stem.behaviorlab.free_thinker', 'Free Thinker'), desc: __alloT('stem.behaviorlab.explored_the_sandbox_lab', 'Explored the sandbox lab') },
            7: { icon: '\u26D3', name: __alloT('stem.behaviorlab.chain_builder', 'Chain Builder'), desc: __alloT('stem.behaviorlab.completed_a_behavior_chain', 'Completed a behavior chain') },
            8: { icon: '\u23F1', name: __alloT('stem.behaviorlab.dro_pro', 'DRO Pro'), desc: __alloT('stem.behaviorlab.mastered_differential_reinforcement', 'Mastered differential reinforcement') },
            9: { icon: '\uD83D\uDD14', name: __alloT('stem.behaviorlab.pavlovian', 'Pavlovian'), desc: __alloT('stem.behaviorlab.demonstrated_classical_conditioning', 'Demonstrated classical conditioning') }
          };

          // === Behavior Measurement Methods ===
          var MEASUREMENT_METHODS = [
            { name: 'Frequency/Rate', def: 'Count of behaviors per time period. Rate = count / time.', example: 'Student raised hand 12 times in a 30-minute class = 0.4 per minute', when: 'Behavior has a clear start and end. Each instance is roughly equal in duration.', icon: '\uD83D\uDD22' },
            { name: __alloT('stem.behaviorlab.duration', 'Duration'), def: 'Total time a behavior occurs. Can be total or per-occurrence.', example: 'Student was off-task for 14 of 30 minutes (47%)', when: 'The concern is HOW LONG the behavior lasts (tantrums, on-task behavior, engagement).', icon: '\u23F1' },
            { name: __alloT('stem.behaviorlab.latency', 'Latency'), def: 'Time between a stimulus (instruction) and behavior onset.', example: 'Teacher said "sit down" and student sat 45 seconds later', when: 'The concern is HOW LONG it takes to start responding after an instruction.', icon: '\u23F3' },
            { name: __alloT('stem.behaviorlab.inter_response_time_irt', 'Inter-Response Time (IRT)'), def: 'Time between two consecutive instances of the same behavior.', example: 'Time between each hand-raise: 2 min, 5 min, 1 min, 8 min', when: 'Evaluating whether behavior is clustering or spreading out over time.', icon: '\u2194' },
            { name: 'Magnitude/Intensity', def: 'The force or strength of a behavior.', example: 'Volume of voice (measured in decibels) during instruction', when: 'Two instances of the same behavior differ in intensity (soft vs. loud voice, gentle vs. forceful hitting).', icon: '\uD83D\uDCCA' },
            { name: __alloT('stem.behaviorlab.partial_interval_recording', 'Partial Interval Recording'), def: 'Mark interval as "occurred" if behavior happened at ANY point during the interval.', example: 'Divide 30 min into 1-min intervals. Mark if student talked out at any point in each interval.', when: 'Overestimates behavior. Good for behaviors you want to decrease.', icon: '\uD83D\uDFE5' },
            { name: __alloT('stem.behaviorlab.whole_interval_recording', 'Whole Interval Recording'), def: 'Mark as "occurred" only if behavior lasted the ENTIRE interval.', example: 'Mark 1-min interval only if student was on-task for all 60 seconds.', when: 'Underestimates behavior. Good for behaviors you want to increase.', icon: '\uD83D\uDFE9' },
            { name: __alloT('stem.behaviorlab.momentary_time_sampling', 'Momentary Time Sampling'), def: 'At the end of each interval, check if behavior is occurring at that exact moment.', example: 'Every 5 minutes, look at student. On-task? Check. Off-task? Check.', when: 'Easiest method for teachers. Good for estimating proportion of time.', icon: '\uD83D\uDFE6' }
          ];

          // === ABA Glossary ===
          var ABA_GLOSSARY = [
            { term: 'Positive Reinforcement (SR+)', def: 'Adding a stimulus after a behavior that increases future probability of that behavior.' },
            { term: 'Negative Reinforcement (SR-)', def: 'Removing an aversive stimulus after a behavior that increases future probability. NOT punishment!' },
            { term: 'Positive Punishment (SP+)', def: 'Adding an aversive stimulus after a behavior that decreases future probability.' },
            { term: 'Negative Punishment (SP-)', def: 'Removing a preferred stimulus after a behavior that decreases future probability (e.g., response cost).' },
            { term: 'Extinction', def: 'Withholding reinforcement for a previously reinforced behavior, resulting in a decrease.' },
            { term: 'Extinction Burst', def: 'Temporary increase in frequency/intensity of behavior when reinforcement is first withheld.' },
            { term: 'Shaping', def: 'Differentially reinforcing successive approximations toward a target behavior.' },
            { term: 'Chaining', def: 'Linking multiple behaviors in sequence where each step serves as the SD for the next.' },
            { term: 'SD (Discriminative Stimulus)', def: 'A stimulus that signals reinforcement is available for a specific behavior.' },
            { term: 'S-delta', def: 'A stimulus that signals reinforcement is NOT available.' },
            { term: 'MO (Motivating Operation)', def: 'An environmental variable that alters the value of a consequence and the probability of related behavior.' },
            { term: 'EO (Establishing Operation)', def: 'An MO that increases the value of a reinforcer and evokes behavior that has produced it.' },
            { term: 'AO (Abolishing Operation)', def: 'An MO that decreases the value of a reinforcer and abates related behavior.' },
            { term: 'DRA', def: 'Differential Reinforcement of Alternative behavior: reinforce a specific alternative to the problem behavior.' },
            { term: 'DRO', def: 'Differential Reinforcement of Other behavior: reinforce the absence of the target behavior for a set interval.' },
            { term: 'DRI', def: 'Differential Reinforcement of Incompatible behavior: reinforce a behavior physically incompatible with the problem behavior.' },
            { term: 'FCT', def: 'Functional Communication Training: teaching an appropriate communicative response as a replacement for problem behavior.' },
            { term: 'FBA', def: 'Functional Behavior Assessment: systematic process to identify the function (purpose) of a behavior.' },
            { term: 'ABC Data', def: 'Antecedent-Behavior-Consequence recording: documenting what happens before, during, and after a behavior.' },
            { term: 'Generalization', def: 'Behavior occurs across different settings, people, or stimuli without direct training.' },
            { term: 'Maintenance', def: 'Behavior continues over time after training/intervention has ended.' },
            { term: 'Prompt', def: 'An additional stimulus that increases the likelihood of a correct response (physical, verbal, gestural, model, visual).' },
            { term: 'Prompt Fading', def: 'Systematically reducing prompts to promote independent responding.' },
            { term: 'Token Economy', def: 'A system where tokens (conditioned reinforcers) are earned for target behaviors and exchanged for backup reinforcers.' },
            { term: 'Operant Behavior', def: 'Behavior that operates on the environment and is controlled by its consequences. Contrasted with respondent behavior, which is elicited by a stimulus.' },
            { term: 'Consequence', def: 'What follows a behavior. Whether it is a reinforcer or a punisher is decided by its effect on future frequency \u2014 never by what the adult intended it to be.' },
            { term: 'Successive Approximations', def: 'The intermediate steps between what the learner does now and the terminal behavior. Shaping reinforces each in turn, then stops reinforcing it once the next appears.' },
            { term: 'Terminal Behavior', def: 'The behavior a shaping program is aiming at \u2014 the last step in the sequence of successive approximations.' },
            { term: 'Differential Reinforcement', def: 'Reinforcing one class of behavior while withholding reinforcement for another. The family includes DRA (an alternative), DRO (the absence of the target), DRI (something incompatible) and DRL (a lower rate).' },
            { term: 'Spontaneous Recovery', def: 'An extinguished response reappearing after time away from the situation. Extinction suppresses a behavior; it does not erase what was learned.' },
            { term: 'Fixed Ratio (FR)', def: 'Reinforcement after a set number of responses. Produces break-and-run: a pause after each reinforcer, then a burst.' },
            { term: 'Continuous Reinforcement (CRF)', def: 'Every response reinforced. Fastest acquisition and fastest extinction \u2014 useful for teaching a new behavior, poor for maintaining one.' },
            { term: 'Intermittent Reinforcement', def: 'Only some responses reinforced. Slower to acquire and far more resistant to extinction, which is why an accidentally intermittent problem behavior is so hard to shift.' },
            { term: 'Stimulus Control', def: 'Behavior occurs reliably in the presence of a particular stimulus and not in its absence. The goal of discrimination training.' },
            { term: 'Behavior Chain', def: 'A sequence in which each response produces the discriminative stimulus for the next, and the last produces the terminal reinforcer.' },
            { term: 'Forward Chaining', def: 'Teaching the first step of a chain to criterion while prompting the rest, then adding the second step, and so on.' },
            { term: 'Task Analysis', def: 'Breaking a skill into its component steps in teaching order. The prerequisite for any chaining procedure.' },
            { term: 'Terminal Reinforcer', def: 'The reinforcer at the end of a behavior chain. It maintains the whole sequence, not just the final step.' },
            { term: 'Interval', def: 'The time that must pass before a response can be reinforced (FI, VI), or the time the target behavior must be absent (DRO).' },
            { term: 'Target Behavior', def: 'The behavior selected for change and measurement, defined so that two observers would count the same thing.' },
            { term: 'US (Unconditioned Stimulus)', def: 'A stimulus that produces a response without any prior learning \u2014 food producing salivation.' },
            { term: 'UR (Unconditioned Response)', def: 'The unlearned response to the unconditioned stimulus. Salivating at food.' },
            { term: 'CS (Conditioned Stimulus)', def: 'A previously neutral stimulus that comes to produce a response after being paired with the US. Pavlov\u2019s bell.' },
            { term: 'CR (Conditioned Response)', def: 'The learned response to the conditioned stimulus. Often similar to the UR but not identical to it.' },
            { term: 'Acquisition', def: 'The phase in which CS\u2013US pairings build the association. Negatively accelerated: the earliest pairings add the most.' }
          ];

          // === Beyond Pure ABA — neurodiversity-affirming + trauma-informed ===
          // The critical lens that's often missing from operant-conditioning
          // pedagogy. ABA is a powerful set of tools AND has been used in
          // ways the autistic community has documented as harmful. Modern
          // school-psych practice holds both truths at once. Sources:
          // Autism Self Advocacy Network position statements; Damian Milton
          // 'Double Empathy Problem'; Kupferstein 2018 ABA-PTSD survey;
          // updated BACB ethical guidance; NDBI research literature.
          var BEYOND_ABA = [
            {
              name: __alloT('stem.behaviorlab.the_autism_community_critique', 'The autism community critique'),
              icon: '🌟', color: '#a78bfa',
              desc: __alloT('stem.behaviorlab.adult_autistic_advocates_including_man', 'Adult autistic advocates — including many who experienced early ABA — have documented serious concerns about historical practice: 40-hour-week intensity, "indistinguishable from peers" as a goal (which trains masking), targeting stimming and eye-contact "deficits" without considering their function, and the use of contingencies that look like coercion when the client cannot meaningfully consent or refuse.'),
              source: 'Autism Self Advocacy Network position statements; Kupferstein 2018 ABA-PTSD survey'
            },
            {
              name: __alloT('stem.behaviorlab.the_aversives_in_the_history', 'The aversives in this history'),
              icon: '\u26A0\uFE0F', color: '#fb923c',
              desc: __alloT('stem.behaviorlab.the_aversives_in_the_history_desc', 'The timeline in this tool runs through the early intensive-intervention programs without saying what was in them. It should. Lovaas\u2019s UCLA work in the 1960s used contingent electric shock, and he published it; the 1987 study\u2019s treatment package included aversives such as a loud \u201cno\u201d and a slap on the thigh. Mainstream practice moved away from aversives and the BACB now restricts them sharply \u2014 but contingent shock has not ended everywhere, and its legal status in the United States has changed more than once. When autistic adults describe early ABA as harmful, this is a large part of what they are describing. A tool that teaches positive punishment as a quadrant on a chart owes students the version where it was a real thing done to real children.'),
              source: 'Lovaas, Schaeffer & Simmons 1965 (contingent shock, published by the researchers); Lovaas 1987 (treatment package); BACB ethics code on restrictive procedures'
            },
            {
              name: __alloT('stem.behaviorlab.neurodiversity_affirming_aba', 'Neurodiversity-affirming ABA'),
              icon: '🌱', color: '#22c55e',
              desc: __alloT('stem.behaviorlab.modern_ethical_practice_has_shifted_cl', 'Modern ethical practice has shifted: client assent (not just guardian consent) is required throughout sessions, "normalization" goals are increasingly declined, stimming is recognized as self-regulation rather than a target for reduction, and client-chosen goals replace clinician-imposed ones. The acronym stays; the values inside it have moved.'),
              source: 'Updated BACB ethical guidance (2022+); Schreibman et al. on naturalistic developmental behavioral interventions (NDBI)'
            },
            {
              name: __alloT('stem.behaviorlab.trauma_informed_behavior_practice', 'Trauma-informed behavior practice'),
              icon: '🤗', color: '#f472b6',
              desc: __alloT('stem.behaviorlab.some_non_compliance_is_a_trauma_respon', 'Some "non-compliance" is a trauma response, not a learning deficit. A child who freezes, flees, or fights at a familiar demand may be telling you the demand has become a threat cue. Regulation comes before reasoning; co-regulation comes before self-regulation. Contingency analysis still matters — it just is not the whole picture.'),
              source: 'Bruce Perry Neurosequential Model; Stuart Shanker self-regulation framework'
            },
            {
              name: __alloT('stem.behaviorlab.the_double_empathy_problem', 'The Double Empathy Problem'),
              icon: '⇄', color: '#22d3ee',
              desc: __alloT('stem.behaviorlab.research_by_autistic_scholar_damian_mi', 'Research by autistic scholar Damian Milton reframes "social skill deficits" as a two-way mismatch in mutual understanding between autistic and non-autistic people, not a one-sided deficit located in the autistic person. This changes what we measure as a "behavior problem" — and who needs to do the changing.'),
              source: 'Milton 2012; Crompton et al. 2020 (autistic-to-autistic communication research)'
            },
            {
              name: __alloT('stem.behaviorlab.what_aba_does_well', 'What ABA does well'),
              icon: '✅', color: '#fbbf24',
              desc: __alloT('stem.behaviorlab.honest_accounting_matters_functional_c', 'Honest accounting matters. Functional communication training for non-speaking learners has changed lives. Reduction of self-injurious or dangerous behavior is sometimes the difference between a kid going to school and a kid getting hospitalized. Self-help skills the client actively wants. Schedules of reinforcement explain real classroom outcomes. The science is real; the application has to be ethical.'),
              source: 'Carr et al. on FCT; CER literature on dangerous-behavior reduction'
            },
            {
              name: __alloT('stem.behaviorlab.what_aba_cannot_do_alone', 'What ABA cannot do alone'),
              // A literal hex, not var(): this card's colour is concatenated with an
              // alpha suffix (`b.color + '22'`) for the icon disc, and
              // "var(--x, #94a3b8)22" is not a colour — that disc silently lost its
              // background while the other five cards kept theirs.
              icon: '🧩', color: '#94a3b8',
              desc: __alloT('stem.behaviorlab.operant_conditioning_is_one_tool_it_do', 'Operant conditioning is one tool. It does not replace mental-health treatment for trauma or anxiety. It does not address the sensory environment a building creates. It does not substitute for autistic community and identity. Good practice integrates ABA with OT (sensory), SLP (communication), mental health (regulation), and — crucially — autistic adult mentorship that the child can grow into.'),
              source: 'Autism Self Advocacy Network "Real Communities" framework; OT/SLP integrative-care literature'
            }
          ];

          // ── Migrated content ────────────────────────────────────────────────
          // Everything applied-practice that used to live in this file now lives in
          // its own tool, so the Skinner-box frame is not adjacent to "how to handle
          // a kid in crisis" content:
          //
          //   School Behavior Toolkit  PBIS three tiers, replacement behaviours,
          //                            setting events, the acting-out cycle,
          //                            restraint & seclusion, the four functions,
          //                            the Function Sleuth drill, the token economy,
          //                            the BIP drafting exercise
          //   SEL Hub                  named autistic and disabled advocates
          //
          // The unrendered archive copies that tracked those moves are gone; git has
          // the history, and dead copies of live content are a trap — an earlier pass
          // nearly corrected a Lovaas claim in one of them while the string students
          // actually read went untouched.
          // === ABA Ethics Principles ===
          var ABA_ETHICS = [
            { name: __alloT('stem.behaviorlab.benefit_others', 'Benefit Others'), icon: '\u2764', desc: __alloT('stem.behaviorlab.aba_practitioners_have_a_responsibilit', 'ABA practitioners have a responsibility to promote the well-being of their clients above all other considerations.') },
            { name: __alloT('stem.behaviorlab.least_restrictive', 'Least Restrictive'), icon: '\uD83D\uDD13', desc: __alloT('stem.behaviorlab.always_use_the_least_restrictive_effec', 'Always use the least restrictive effective treatment. Try reinforcement-based procedures before considering punishment-based ones.') },
            { name: __alloT('stem.behaviorlab.informed_consent', 'Informed Consent'), icon: '\uD83D\uDCDD', desc: __alloT('stem.behaviorlab.clients_or_their_guardians_must_unders', 'Clients (or their guardians) must understand and agree to all intervention procedures before they are implemented.') },
            { name: __alloT('stem.behaviorlab.data_driven_decisions', 'Data-Driven Decisions'), icon: '\uD83D\uDCCA', desc: __alloT('stem.behaviorlab.all_treatment_decisions_must_be_based_', 'All treatment decisions must be based on objective data, not opinions or assumptions. If data shows the intervention isn\'t working, change it.') },
            { name: __alloT('stem.behaviorlab.social_validity', 'Social Validity'), icon: '\uD83E\uDDD1\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1', desc: __alloT('stem.behaviorlab.goals_procedures_and_outcomes_should_b', 'Goals, procedures, and outcomes should be acceptable and meaningful to the client and their community.') },
            { name: __alloT('stem.behaviorlab.competence', 'Competence'), icon: '\uD83C\uDF93', desc: __alloT('stem.behaviorlab.only_practice_within_your_area_of_trai', 'Only practice within your area of training and competence. Seek supervision and continuing education.') }
          ];

          // === Wave 2: SCHEDULE_TYPES for comparison canvas ===
          //
          // The response parameters are part of the science, not styling. `runRate`
          // is the per-tick probability of a response while the subject is running,
          // `pausePost`/`pauseVar` the post-reinforcement pause that DEFINES fixed
          // ratio, and `interval`/`ratio` the reinforcement requirement. They live
          // here so `blScheduleRecord` has one model to read and there is one place
          // to argue with if a value looks wrong.
          var SCHEDULE_TYPES = [
            { id: 'FR', name: __alloT('stem.behaviorlab.fixed_ratio', 'Fixed Ratio'), abbrev: 'FR-5', color: '#f59e0b', desc: __alloT('stem.behaviorlab.reinforce_every_nth_response_creates_p', 'Reinforce every Nth response. Creates post-reinforcement pause then rapid responding.'), example: 'Piecework pay: get paid per 5 items assembled', pattern: 'high-pause', ratio: 5, runRate: 0.92, pausePost: 6, pauseVar: 5 },
            { id: 'VR', name: __alloT('stem.behaviorlab.variable_ratio', 'Variable Ratio'), abbrev: 'VR-5', color: '#f87171', desc: __alloT('stem.behaviorlab.reinforce_after_variable_number_of_res', 'Reinforce after variable number of responses (avg N). Produces high, steady rate. Most resistant to extinction.'), example: 'Slot machines: win after random number of pulls', pattern: 'high-steady', ratio: 5, runRate: 0.46 },
            { id: 'FI', name: __alloT('stem.behaviorlab.fixed_interval', 'Fixed Interval'), abbrev: 'FI-30', color: '#60a5fa', desc: __alloT('stem.behaviorlab.reinforce_first_response_after_fixed_t', 'Reinforce first response after fixed time interval. Creates scallop pattern — slow after reinforcement, fast near end.'), example: 'Checking mail: arrives at same time daily', pattern: 'scallop', interval: 30 },
            { id: 'VI', name: __alloT('stem.behaviorlab.variable_interval', 'Variable Interval'), abbrev: 'VI-10', color: '#10b981', desc: __alloT('stem.behaviorlab.reinforce_first_response_after_variabl', 'Reinforce first response after variable time interval (avg N). Produces slow, steady rate.'), example: 'Fishing: fish bite at unpredictable times', pattern: 'low-steady', interval: 10, runRate: 0.30 }
          ];

          // ── Cumulative-record generator ──────────────────────────────────────
          //
          // ONE model, read by the Schedule Sleuth puzzle AND the Schedule
          // Comparison animation. They used to carry separate hand-written copies
          // and BOTH were wrong in ways that broke the lesson they exist to teach:
          //
          //   • FR deadlocked. The pause fired whenever `cumResp % ratio === 0`,
          //     but a paused tick does not advance cumResp, so the modulo never
          //     changed — every FR curve rose to exactly 5 responses and then went
          //     flat for the remaining 195 ticks. The answer feedback told the
          //     student to "look for the staircase shape", and the staircase was
          //     not on screen; what WAS on screen looked like extinction.
          //   • VR and VI ran off the top of the chart. The y axis was pinned at 60
          //     responses while VR generated ~160 and VI ~95, so 120 of 200 VR
          //     points and 66 VI points were drawn above the viewBox. The student
          //     saw a line leave the frame and never come back.
          //   • FI never showed a scallop. Its interval was short enough (10 ticks)
          //     and its rate flat enough that 200 ticks of it read as a straight
          //     line — the one feature the correct answer rewards was invisible.
          //
          // Every schedule now stays inside BL_SCHED_R by construction (clamped),
          // and the shape properties are pinned by tests/behaviorlab_schedules.test.js
          // rather than by eyeballing a screenshot.
          var BL_SCHED_T = 200;    // ticks on the x axis
          var BL_SCHED_R = 120;    // responses the y axis can show

          function blScheduleRecord(sch, seed, tMax) {
            var T = tMax || BL_SCHED_T;
            var s = ((seed | 0) * 31 + 13) % 2147483647;
            if (s <= 0) s += 2147483646;
            function rnd() { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }

            // A VARIABLE schedule draws a fresh requirement after every reinforcer;
            // a FIXED one uses the same number every time. That difference is the
            // whole distinction, so it is modelled rather than faked with a
            // different response rate.
            function nextRatio() {
              return sch.pattern === 'high-steady'
                ? Math.max(1, Math.round(sch.ratio * (0.4 + rnd() * 1.2)))
                : sch.ratio;
            }
            function nextInterval() {
              return sch.pattern === 'low-steady'
                ? Math.max(2, Math.round(sch.interval * (0.35 + rnd() * 1.3)))
                : sch.interval;
            }

            var cum = 0, pause = 0, sinceReinf = 0, respSince = 0;
            var resp = [], reinf = [];
            var ratioReq = sch.ratio ? nextRatio() : 0;
            var intervalReq = sch.interval ? nextInterval() : 0;

            for (var t = 0; t < T; t++) {
              var rate;
              if (pause > 0) { pause--; rate = 0; }
              else if (sch.pattern === 'scallop') {
                // Fixed interval: responding is near zero just after a reinforcer
                // and accelerates as the interval runs out. The concavity IS the
                // scallop, so it is generated, not asserted in the caption.
                var frac = Math.min(1.2, sinceReinf / intervalReq);
                rate = 0.012 + 1.15 * frac * frac * frac;
              } else {
                rate = sch.runRate;
              }
              if (rnd() < rate && cum < BL_SCHED_R) {
                cum++;
                respSince++;
                var earned = sch.ratio ? (respSince >= ratioReq) : (sinceReinf >= intervalReq);
                if (earned) {
                  reinf.push(t);
                  respSince = 0;
                  sinceReinf = -1;                 // the ++ below lands it on 0
                  ratioReq = sch.ratio ? nextRatio() : 0;
                  intervalReq = sch.interval ? nextInterval() : 0;
                  // Present for FIXED ratio, deliberately absent for variable —
                  // "no post-reinforcement pause" is why VR is the high-steady one.
                  if (sch.pausePost) pause = sch.pausePost + Math.floor(rnd() * sch.pauseVar);
                }
              }
              sinceReinf++;
              resp.push(cum);
            }
            return { resp: resp, reinf: reinf, total: cum };
          }

          // Responses per time block — the same shape a sighted student reads off
          // the curve, in a form a screen reader can read. Deliberately NOT a
          // description of the pattern: naming the shape would hand over the answer
          // the puzzle is asking for, which a curve does not do.
          function blScheduleBlocks(rec, nBlocks) {
            var n = nBlocks || 10;
            var size = Math.max(1, Math.floor(rec.resp.length / n));
            var out = [];
            for (var b = 0; b < n; b++) {
              var start = b * size;
              var end = Math.min(rec.resp.length - 1, (b + 1) * size - 1);
              var before = start === 0 ? 0 : rec.resp[start - 1];
              out.push({ from: start, to: end, count: rec.resp[end] - before });
            }
            return out;
          }

          // === Wave 2: REINFORCEMENT_MATRIX (2x2 operant conditioning) ===
          var REINFORCE_MATRIX = [
            { id: 'srPlus', row: 0, col: 0, name: __alloT('stem.behaviorlab.positive_reinforcement', 'Positive Reinforcement'), abbrev: 'SR+', action: 'ADD', effect: 'INCREASE', color: '#22c55e', icon: '\u2795\u2B06',
              desc: __alloT('stem.behaviorlab.adding_a_stimulus_to_increase_behavior', 'Adding a stimulus to increase behavior'), formal: 'The contingent presentation of a stimulus that increases the future probability of a behavior.',
              examples: ['Teacher gives sticker after completed work', 'Dog gets treat for sitting', 'Employee receives bonus for sales target', 'Child gets praise for sharing'] },
            // blue-400 / red-400 rather than -500: `color` is the quadrant's TEXT
            // colour as well as its border and tint, and at -500 the SR- and SP+
            // abbreviations sat at 4.13:1 and 4.04:1 on the cell fill \u2014 under the
            // 4.5 AA floor. The lighter step keeps the quadrant hues distinct.
            { id: 'srMinus', row: 0, col: 1, name: __alloT('stem.behaviorlab.negative_reinforcement', 'Negative Reinforcement'), abbrev: 'SR-', action: 'REMOVE', effect: 'INCREASE', color: '#60a5fa', icon: '\u2796\u2B06',
              desc: __alloT('stem.behaviorlab.removing_an_aversive_stimulus_to_incre', 'Removing an aversive stimulus to increase behavior'), formal: 'The contingent removal of an aversive stimulus that increases the future probability of a behavior.',
              examples: ['Seatbelt beeping stops when buckled', 'Headache goes away after taking medicine', 'Nagging stops when chores are done', 'Sunglasses remove glare'] },
            { id: 'spPlus', row: 1, col: 0, name: __alloT('stem.behaviorlab.positive_punishment', 'Positive Punishment'), abbrev: 'SP+', action: 'ADD', effect: 'DECREASE', color: '#f87171', icon: '\u2795\u2B07',
              desc: __alloT('stem.behaviorlab.adding_an_aversive_stimulus_to_decreas', 'Adding an aversive stimulus to decrease behavior'), formal: 'The contingent presentation of an aversive stimulus that decreases the future probability of a behavior.',
              examples: ['Touching hot stove causes burn', 'Speeding ticket after driving too fast', 'Extra push-ups for being late', 'Verbal reprimand for misbehavior'] },
            { id: 'spMinus', row: 1, col: 1, name: __alloT('stem.behaviorlab.negative_punishment', 'Negative Punishment'), abbrev: 'SP-', action: 'REMOVE', effect: 'DECREASE', color: '#f59e0b', icon: '\u2796\u2B07',
              desc: __alloT('stem.behaviorlab.removing_a_desired_stimulus_to_decreas', 'Removing a desired stimulus to decrease behavior'), formal: 'The contingent removal of a reinforcing stimulus that decreases the future probability of a behavior.',
              examples: ['Phone taken away for breaking rules', 'Loss of recess for fighting', 'Fine for parking violation', 'Time-out from preferred activity'] }
          ];

          // === Wave 2: CONDITIONING_COMPARE ===
          var CONDITIONING_COMPARE = [
            // Skinner did not discover that consequences shape behaviour; Thorndike
            // showed it in 1898 and Skinner named it, built its experimental analysis
            // and gave it the chamber. Saying "discoverer" also contradicted this
            // tool's own timeline.
            { aspect: 'Founding work', operant: 'Thorndike\u2019s law of effect (1898); Skinner names and formalises operant conditioning (1938)', classical: 'Pavlov (1890s)' },
            { aspect: 'Key Process', operant: 'Behavior \u2192 Consequence', classical: 'Stimulus \u2192 Stimulus pairing' },
            { aspect: 'Learner Role', operant: 'Active (voluntarily emits behavior)', classical: 'Passive (reflexive response)' },
            { aspect: 'Behavior Type', operant: 'Operant (voluntary)', classical: 'Respondent (involuntary/reflexive)' },
            // "Reinforcement" belongs on one side of this table only. Classical
            // conditioning pairs stimuli whatever the learner does; calling that
            // reinforcement blurs the exact distinction the table exists to draw.
            { aspect: 'The contingency', operant: 'A consequence FOLLOWS the behaviour \u2014 no behaviour, no consequence', classical: 'The US follows the CS whatever the learner does' },
            { aspect: 'Extinction', operant: 'Withhold reinforcement', classical: 'Present CS without US' },
            { aspect: 'Key Terms', operant: 'SD, SR+, SR-, SP+, SP-', classical: 'US, UR, CS, CR' },
            { aspect: 'Example', operant: 'Dog sits \u2192 gets treat \u2192 sits more', classical: 'Bell + food \u2192 bell alone \u2192 salivation' }
          ];

          // === Wave 3: SCENARIO_CHALLENGES ===
          var SCENARIO_CHALLENGES = [
            { id: 5, scenario: 'You are using FR-5 to reinforce a new behavior. The learner shows a post-reinforcement pause after each delivery.', question: __alloT('stem.behaviorlab.what_should_you_do', 'What should you do?'),
              options: ['Switch to VR-5', 'Increase to FR-10', 'Add punishment', 'Give up'], correct: 0,
              explain: 'Correct! Post-reinforcement pauses are characteristic of FR schedules. Switching to a VR schedule maintains the same average ratio but eliminates the predictable pause pattern.',
              better: 'VR schedules produce steady, high rates of responding because the learner cannot predict exactly when reinforcement will occur.' },
            { id: 6, scenario: 'A student has learned to raise their hand in the classroom but does not do it at home or in other settings.', question: __alloT('stem.behaviorlab.what_aba_concept_does_this_illustrate', 'What ABA concept does this illustrate?'),
              options: ['Extinction', 'Stimulus generalization failure', 'Shaping', 'Chaining'], correct: 1,
              explain: 'The behavior has not generalized across settings. The hand-raising is under tight stimulus control of the classroom environment only.',
              better: 'Program for generalization from the start: train in multiple settings, with multiple people, and reinforce the behavior in all environments.' },
            { id: 7, scenario: 'A therapist is teaching a child to brush their teeth using forward chaining. The child can do steps 1-3 independently.', question: __alloT('stem.behaviorlab.what_should_the_therapist_do_next', 'What should the therapist do next?'),
              options: ['Start over', 'Teach step 4 and prompt remaining steps', 'Skip to the last step', 'Remove all prompts'], correct: 1,
              explain: 'In forward chaining, you teach the chain from the beginning. Steps 1-3 are independent, so now teach step 4 while prompting/assisting remaining steps.',
              better: 'Forward chaining builds momentum because the learner always starts with mastered steps. Each new step is the SD for the next prompted step.' },
            { id: 8, scenario: 'A teacher wants to reduce a student calling out in class but does not want to use punishment.', question: __alloT('stem.behaviorlab.which_procedure_would_be_most_appropri', 'Which procedure would be MOST appropriate?'),
              options: ['Extinction only', 'DRA (reinforce hand-raising)', 'Time-out', 'Response cost'], correct: 1,
              explain: 'DRA (Differential Reinforcement of Alternative behavior) reinforces an appropriate alternative (hand-raising) that serves the same function. It reduces calling out without punishment.',
              better: 'DRA is preferred because it teaches what TO do (not just what NOT to do), aligns with the least restrictive principle, and builds new skills.' },
            { id: 9, scenario: 'During a Pavlovian conditioning experiment, you pair a tone (NS) with food (US) 10 times. On trial 11, you present the tone alone.', question: __alloT('stem.behaviorlab.what_do_you_expect', 'What do you expect?'),
              options: ['No response', 'Conditioned response (salivation)', 'Extinction', 'Spontaneous recovery'], correct: 1,
              explain: 'After repeated CS-US pairings, the tone (now a CS) should elicit a conditioned response (CR = salivation) even without the food (US). This is acquisition!',
              better: 'The strength of the CR depends on the number of pairings, the timing (best with forward delay), and the salience of the CS and US.' },
            { id: 10, scenario: 'A BCBAs client has been making great progress on a program. The insurance company is reviewing whether to continue funding.', question: __alloT('stem.behaviorlab.what_should_the_bcba_present', 'What should the BCBA present?'),
              options: ['Anecdotes from parents', 'Objective data and graphs', 'Other client success stories', 'Their credentials'], correct: 1,
              explain: 'Data-driven decision making is a core ethical principle of ABA. Objective data (graphs, trend lines, effect sizes) is the gold standard for justifying continued treatment.',
              better: 'Always let the data speak. Visual analysis of graphed data shows trends, level changes, and variability that support clinical decisions.' },
            { id: 11, scenario: 'You are implementing DRO with a 30-second interval. The target behavior occurs at the 28-second mark.', question: __alloT('stem.behaviorlab.what_happens', 'What happens?'),
              options: ['Deliver reinforcement anyway', 'Reset the timer', 'Extend the interval', 'End the session'], correct: 1,
              explain: 'In DRO, if the target behavior occurs at ANY point during the interval, the timer resets. No reinforcement is delivered. The learner must go the full interval without the behavior.',
              better: 'This is exactly what Level 8 in the simulator teaches! The mouse must refrain from pressing the lever for the full DRO interval.' },
            { id: 12, scenario: 'A parent reports that their child "had an extinction burst" when they stopped giving candy for tantrums. They want to give in.', question: __alloT('stem.behaviorlab.what_is_the_best_advice', 'What is the best advice?'),
              options: ['Give the candy to stop the tantrum', 'Stay the course \u2014 extinction burst is expected', 'Try punishment instead', 'Increase the candy amount'], correct: 1,
              explain: 'Extinction bursts are temporary increases BEFORE the behavior decreases. Giving in during a burst teaches the child that MORE INTENSE tantrums work! This is the worst time to reinforce.',
              better: 'Warn parents about extinction bursts BEFORE starting extinction. Staying consistent through the burst is critical for success.' }
          ];

          SCENARIO_CHALLENGES = SCENARIO_CHALLENGES.map(function(sc, si) {
            return blRotateQuestion(sc, si);
          });

          // === Wave 3: ABA_MILESTONES ===
          var ABA_MILESTONES = [
            { year: 1897, event: 'Pavlov publishes classical conditioning research with dogs', icon: '\uD83D\uDC36', era: 'foundations' },
            { year: 1898, event: 'Thorndike\u2019s puzzle-box experiments and the law of effect \u2014 consequences shape behaviour, and the direct ancestor of the operant chamber', icon: '\uD83D\uDD10', era: 'foundations' },
            { year: 1913, event: 'Watson publishes "Psychology as the Behaviorist Views It" \u2014 birth of behaviorism', icon: '\uD83D\uDCDC', era: 'foundations' },
            { year: 1920, event: 'Watson & Rayner: "Little Albert" experiment demonstrates conditioned fear', icon: '\uD83D\uDC76', era: 'foundations' },
            { year: 1938, event: 'Skinner publishes "The Behavior of Organisms" \u2014 operant conditioning defined', icon: '\uD83D\uDCDA', era: 'foundations' },
            { year: 1948, event: 'Skinner writes "Walden Two" imagining a behaviorally-designed utopia', icon: '\uD83C\uDFD8\uFE0F', era: 'foundations' },
            { year: 1953, event: 'Skinner publishes "Science and Human Behavior"', icon: '\uD83E\uDDE0', era: 'growth' },
            { year: 1957, event: 'Skinner publishes "Verbal Behavior" \u2014 behavioral analysis of language', icon: '\uD83D\uDDE3\uFE0F', era: 'growth' },
            { year: 1961, event: 'Bandura\u2019s Bobo doll study on observational learning/modeling', icon: '\uD83E\uDE86', era: 'growth' },
            { year: 1968, event: 'Baer, Wolf & Risley publish "Some Current Dimensions of ABA" \u2014 ABA formally defined', icon: '\u2B50', era: 'growth' },
            { year: 1970, event: 'Lovaas begins intensive ABA-based early intervention for autism', icon: '\uD83E\uDDE9', era: 'applied' },
            { year: 1987, event: 'Lovaas study reports 47% of children reached "normal functioning" with intensive ABA \u2014 an influential but contested result (non-random design, not replicated at that rate; "normalization"/"indistinguishable" goals are now widely critiqued for training masking)', icon: '\uD83D\uDCC8', era: 'applied' },
            { year: 1998, event: 'BACB (Behavior Analyst Certification Board) established', icon: '\uD83C\uDFC5', era: 'modern' },
            { year: 2005, event: 'BACB introduces BCBA certification exam', icon: '\uD83C\uDF93', era: 'modern' },
            { year: 2014, event: 'All 50 US states require insurance coverage for ABA autism treatment', icon: '\uD83C\uDFE5', era: 'modern' },
            { year: 2020, event: 'Telehealth ABA delivery expands dramatically during COVID-19', icon: '\uD83D\uDCBB', era: 'modern' }
          ];

          // === Wave 3: QUICK_REFERENCE ===
          var QUICK_REF_CARDS = [
            { title: __alloT('stem.behaviorlab.the_7_dimensions_of_aba', 'The 7 Dimensions of ABA'), content: __alloT('stem.behaviorlab.applied_behavioral_analytic_technologi', 'Applied \u2022 Behavioral \u2022 Analytic \u2022 Technological \u2022 Conceptually Systematic \u2022 Effective \u2022 Generality'), icon: '7\uFE0F\u20E3', color: '#f59e0b' },
            { title: __alloT('stem.behaviorlab.reinforcement_rule', 'Reinforcement Rule'), content: __alloT('stem.behaviorlab.if_a_consequence_increases_behavior_re', 'If a consequence INCREASES behavior = Reinforcement. + means ADD stimulus. - means REMOVE stimulus.'), icon: '\u2B06\uFE0F', color: '#22c55e' },
            { title: __alloT('stem.behaviorlab.punishment_rule', 'Punishment Rule'), content: __alloT('stem.behaviorlab.if_a_consequence_decreases_behavior_pu', 'If a consequence DECREASES behavior = Punishment. + means ADD stimulus. - means REMOVE stimulus.'), icon: '\u2B07\uFE0F', color: '#f87171' },
            { title: __alloT('stem.behaviorlab.three_term_contingency', 'Three-Term Contingency'), content: __alloT('stem.behaviorlab.a_antecedent_b_behavior_c_consequence_', 'A (Antecedent) \u2192 B (Behavior) \u2192 C (Consequence). Also called the "ABC" of behavior analysis.'), icon: '\uD83D\uDD17', color: '#a78bfa' },
            { title: __alloT('stem.behaviorlab.extinction', 'Extinction'), content: __alloT('stem.behaviorlab.withholding_reinforcement_for_a_previo', 'Withholding reinforcement for a previously reinforced behavior. Expect an initial extinction BURST (temporary increase) before decrease.'), icon: '\uD83D\uDCC9', color: '#818cf8' },
            { title: __alloT('stem.behaviorlab.schedules_of_reinforcement', 'Schedules of Reinforcement'), content: __alloT('stem.behaviorlab.fr_fixed_ratio_vr_variable_ratio_fi_fi', 'FR (Fixed Ratio) \u2022 VR (Variable Ratio) \u2022 FI (Fixed Interval) \u2022 VI (Variable Interval). Ratio = responses. Interval = time.'), icon: '\uD83D\uDCC5', color: '#60a5fa' },
            { title: __alloT('stem.behaviorlab.motivating_operations', 'Motivating Operations'), content: __alloT('stem.behaviorlab.eo_establishing_operation_increases_va', 'EO (Establishing Operation) = increases value of reinforcer. AO (Abolishing Operation) = decreases value of reinforcer.'), icon: '\uD83D\uDCA1', color: '#10b981' },
            { title: __alloT('stem.behaviorlab.ethics_first', 'Ethics First'), content: __alloT('stem.behaviorlab.least_restrictive_data_driven_informed', 'Least restrictive \u2022 Data-driven \u2022 Informed consent \u2022 Social validity \u2022 Competence \u2022 Client benefit above all.'), icon: '\u2764\uFE0F', color: '#f472b6' }
          ];


          // ── State initialization ──

          var blLevel = d.blLevel || 1;

          var blPhase = d.blPhase || 'intro';

          var blTick = d.blTick || 0;

          var blPaused = d.blPaused || false;

          var blHistory = d.blHistory || [];

          var blCumRecord = d.blCumRecord || [];

          var blReinforcements = d.blReinforcements || 0;

          var blTarget = d.blTarget || 'pressLever';

          var blLightOn = d.blLightOn === undefined ? true : d.blLightOn;

          var blLightColor = d.blLightColor || 'green';

          var blMouseAction = d.blMouseAction || 'explore';

          var blMouseX = d.blMouseX || 200;

          var blMouseY = d.blMouseY || 180;

          var blMouseDir = d.blMouseDir || 0;

          var blFoodVisible = d.blFoodVisible || false;

          var blLevelScore = d.blLevelScore || 0;

          var blCompletedLevels = d.blCompletedLevels || [];

          var blExtinctionPhase = d.blExtinctionPhase || false;

          var blExtinctionStart = d.blExtinctionStart || 0;

          var blScheduleCount = d.blScheduleCount || 0;

          var blAbcLog = d.blAbcLog || [];

          var blLastAction = d.blLastAction || null;

          var blActionAge = d.blActionAge || 0;

          var blMouseAngle = d.blMouseAngle || 0;

          var blSpeed = d.blSpeed || 1;

          var blShowHints = d.blShowHints === undefined ? true : d.blShowHints;

          // ── 3D chamber view state ──
          // The diagram stays the default: it is the surface that has been taught
          // against, it needs no GPU, and it is the one a screen reader and a
          // filtered school network can both reach.
          var bl3dOn = d.blChamberView === '3d';
          // Labels default OFF. Seven chips on a bay this letterboxed stack into a
          // column down the middle and stop being a map at all; the focused part
          // still labels itself, and "Show labels" turns the rest on deliberately.
          var bl3dLabels = !!d.bl3dLabels;
          var bl3dSel = d.bl3dSel || null;
          // Read status() directly rather than trusting React state alone: the null
          // viewer (no host shell, no WebGL) never calls onStatus, so a state-only
          // check would sit on "loading" forever.
          var bl3dStatus = (BL_CHAMBER3D.status() === 'failed') ? 'failed' : (d.bl3dStatus || 'idle');
          var blIsContrast = !!ctx.isContrast;
          // House default-OFF AI gate. Both halves matter: no switch, no traffic;
          // no callGemini, no button that pretends there could be.
          var blAiOn = !!(ctx.aiHintsEnabled && typeof callGemini === 'function');

          var blFoodTime = d.blFoodTime || 0;

          var blSoundOn = d.blSoundOn === undefined ? true : d.blSoundOn;

          var blSandboxTarget = d.blSandboxTarget || 'pressLever';

          var blParticles = d.blParticles || [];

          var blDustMotes = d.blDustMotes || [];

          var blTotalTicks = d.blTotalTicks || 0;

          var blCorrectReinforcements = d.blCorrectReinforcements || 0;

          var blBreathPhase = (Date.now() / 1000) % (Math.PI * 2);

          // Iteration 3 state

          var blQuizAnswered = d.blQuizAnswered || false;

          var blQuizCorrect = d.blQuizCorrect || false;

          var blQuizSelected = d.blQuizSelected === undefined ? -1 : d.blQuizSelected;

          var blLatencies = d.blLatencies || [];

          var blLastTargetTick = d.blLastTargetTick || 0;

          var blChainStep = d.blChainStep || 0;

          var blChainHistory = d.blChainHistory || [];

          var blMoodEmoji = d.blMoodEmoji || '😐';

          var blMoodTimer = d.blMoodTimer || 0;

          // Iteration 5 state

          var blDroTimer = d.blDroTimer || 0;

          var blDroInterval = d.blDroInterval || 6;

          var blDroSuccesses = d.blDroSuccesses || 0;

          var blEarTwitchSeed = d.blEarTwitchSeed || Math.random() * 1000;

          var blSpinAngle = d.blSpinAngle || 0;

          var blRecentActions = d.blRecentActions || [];

          var blTargetX = d.blTargetX || blMouseX;

          var blTargetY = d.blTargetY || blMouseY;

          var blActionDwell = d.blActionDwell || 0;

          // Delta-based proximity shaping

          var blPosHistory = d.blPosHistory || [];

          var blProxDelta = d.blProxDelta || 0;

          // Classical conditioning (Level 9)

          var blCcPhase = d.blCcPhase || 'baseline'; // baseline, pairing, test, extinction

          var blAssocStrength = d.blAssocStrength || 0; // 0-100

          var blPairCount = d.blPairCount || 0;

          var blBellRinging = d.blBellRinging || false;

          var blSalivating = d.blSalivating || false;

          var blCcExtTrials = d.blCcExtTrials || 0;

          var blBellTime = d.blBellTime || 0;

          // Wave 2 state
          var blSchedCanvas = d.blSchedCanvas || false;
          var blSchedPaused = d.blSchedPaused !== false;
          var blSchedTick = d.blSchedTick || 0;
          var blSchedData = d.blSchedData || { FR: [], VR: [], FI: [], VI: [] };
          var blMatrixIdx = d.blMatrixIdx === undefined ? null : d.blMatrixIdx;
          var blTokenBalance = d.blTokenBalance || 0;
          var blTokenLog = d.blTokenLog || [];
          var blTokenRewards = d.blTokenRewards || [];
          var blShowCondCompare = d.blShowCondCompare || false;
          var blShowBipPlanner = d.blShowBipPlanner || false;
          var blBipStep = d.blBipStep || 0;
          var blBipData = d.blBipData || { behavior: '', antecedent: '', consequence: '', func: '', replacement: '', strategy: '' };

          // Wave 3 state
          var blScenarioIdx = d.blScenarioIdx || 0;
          var blScenarioAnswer = d.blScenarioAnswer === undefined ? -1 : d.blScenarioAnswer;
          var blScenarioScore = d.blScenarioScore || 0;
          var blScenarioTotal = d.blScenarioTotal || 0;
          var blShowTimeline = d.blShowTimeline || false;
          var blShowQuickRef = d.blShowQuickRef || false;
          var blStreak = d.blStreak || 0;
          var blBestStreak = d.blBestStreak || 0;

          // ── rAF Animation System (hooks at top level, before returns) ──
          var _blCvRef = React.useRef(null);
          var _blAnimId = React.useRef(0);
          // Whether the chamber is actually on screen. Held in refs so the frame
          // loop can read it without a React round trip, and so the observer
          // survives the loop effect — which has no dependency array and therefore
          // tears down and rebuilds on every render.
          var _blSeenRef = React.useRef(true);
          var _blIoRef = React.useRef(null);
          var _blAnimState = React.useRef({
            mouseX: 200, mouseY: 150, targetX: 200, targetY: 150,
            mouseDir: 1, mouseAction: 'explore', mouseAngle: 0,
            foodVisible: false, foodTime: 0, moodEmoji: '', moodTimer: 0,
            leverPressed: false, lightColor: 'green', paused: false,
            tick: 0, levelScore: 0, proxDelta: 0, level: 1,
            extinctionPhase: false, extinctionStart: 0,
            chainStep: 0, chainSeqLen: 3,
            ccPhase: 'baseline', bellRinging: false, salivating: false, assocStrength: 0,
            droTimer: 0, droInterval: 6,
            trail: [], recentActions: [],
            speed: 1, soundOn: true, season: 0,
            varroaLevel: 0, habitat: 50
          });
          var _blTickTimer = React.useRef(null);

          // Sync React state -> mutable animation state every render
          var _as = _blAnimState.current;
          _as.targetX = blTargetX; _as.targetY = blTargetY;
          _as.mouseDir = blMouseDir; _as.mouseAction = blMouseAction;
          _as.mouseAngle = blMouseAngle;
          _as.foodVisible = blFoodVisible; _as.foodTime = blFoodTime;
          _as.moodEmoji = blMoodEmoji; _as.moodTimer = blMoodTimer;
          _as.leverPressed = blMouseAction === 'pressLever';
          _as.lightColor = blLightColor; _as.paused = blPaused;
          _as.tick = blTick; _as.levelScore = blLevelScore;
          _as.proxDelta = blProxDelta; _as.level = blLevel;
          _as.extinctionPhase = blExtinctionPhase; _as.extinctionStart = blExtinctionStart;
          _as.chainStep = blChainStep;
          _as.ccPhase = blCcPhase; _as.bellRinging = blBellRinging;
          _as.salivating = blSalivating; _as.assocStrength = blAssocStrength;
          _as.droTimer = blDroTimer; _as.droInterval = blDroInterval;
          _as.recentActions = blRecentActions;
          _as.speed = d.blSpeed || 1;
          _as.proxRelevant = blProxRelevant;

          // ── Feed the 3D chamber ──────────────────────────────────────────────
          // sync() only swaps a plain props object — no DOM, no GPU — so calling it
          // from the render body is safe, and it runs before the ref callback that
          // attaches the viewer.
          //
          // sceneProps carries the LIVE animation-state object, not a snapshot. The
          // 3D frame loop runs at 60fps against a tool that re-renders on ticks; a
          // per-frame React round trip to move a mouse would be absurd, and a
          // snapshot would freeze the scene between ticks the way the 2D loop used
          // to freeze before dataRef.
          BL_CHAMBER3D.sync({
            selected: bl3dSel,
            showAllLabels: bl3dLabels,
            dark: true,                 // the lab surface is pinned dark, see the CSS block
            contrast: blIsContrast,
            sceneProps: { st: _as },
            onPick: function (id) { upd('bl3dSel', id); },
            onStatus: function (s) { upd('bl3dStatus', s); }
          });

          // ── rAF loop: smooth interpolation + drawing at 60fps ──
          React.useEffect(function() {
            var cv = _blCvRef.current;
            if (!cv) { cv = document.getElementById('bl-chamber-canvas'); _blCvRef.current = cv; }
            if (!cv) return;

            // ── Do not rasterise a chamber nobody is looking at ──────────────
            // This tool is about 3800px tall. A student reading the glossary at the
            // bottom, or the ABA timeline, left a 60fps canvas redraw running for the
            // whole session — on the school Chromebooks this is piloted on that is
            // real battery for a picture nobody can see. Only the DRAW is skipped:
            // the interpolation above it keeps running because the 3D scene reads the
            // same animation state, and because the subject should not teleport when
            // the chamber scrolls back into view.
            //
            // Defaults to visible and stays visible if IntersectionObserver is
            // missing: a paused-by-mistake chamber is a blank canvas, which is much
            // worse than a redraw nobody needed.
            if (typeof IntersectionObserver === 'function' &&
                (!_blIoRef.current || _blIoRef.current.node !== cv)) {
              if (_blIoRef.current && _blIoRef.current.io) {
                try { _blIoRef.current.io.disconnect(); } catch (e) {}
              }
              try {
                var _io = new IntersectionObserver(function (entries) {
                  for (var ei = 0; ei < entries.length; ei++) _blSeenRef.current = entries[ei].isIntersecting;
                }, { threshold: 0 });
                _io.observe(cv);
                _blIoRef.current = { io: _io, node: cv };
              } catch (e) {
                _blIoRef.current = null;
                _blSeenRef.current = true;
              }
            }
            var s = _blAnimState.current;
            // Initialize visual position to current target
            if (s.mouseX === 200 && s.mouseY === 150 && s.targetX !== 200) {
              s.mouseX = s.targetX; s.mouseY = s.targetY;
            }

            function blFrame() {
              var cv2 = _blCvRef.current || document.getElementById('bl-chamber-canvas');
              if (!cv2) { _blAnimId.current = requestAnimationFrame(blFrame); return; }
              // Shadow closure-captured `d` with live ref so per-frame
              // reads of d.blTotalTicks, d.blPosHistory, d.blWeights,
              // d.blSalivateTime, d.blMouseX reflect actual React state
              // instead of mount-time values. Without this, the tick
              // counter and position history both got pinned to their
              // starting values.
              var d = dataRef.current;
              var st = _blAnimState.current;

              // Distance-adaptive lerp. Under prefers-reduced-motion the subject
              // TELEPORTS to each new position instead of gliding: the tick-by-tick
              // information — where it went and what it did — is fully preserved,
              // and only the travel between ticks is removed. The CSS media query
              // this tool injects reaches animations and transitions; it cannot
              // reach a canvas rAF loop, which is where nearly all of the motion in
              // this tool actually lives.
              var reduceMotion = blReducedMotion();
              st.reduced = reduceMotion;      // drawChamber and the 3D scene both read it
              var dx = st.targetX - st.mouseX;
              var dy = st.targetY - st.mouseY;
              var dist = Math.sqrt(dx * dx + dy * dy);
              var rate = reduceMotion ? 1 : (dist > 100 ? 0.06 : dist > 50 ? 0.10 : 0.14);
              st.mouseX += dx * rate;
              st.mouseY += dy * rate;
              // Snap when close
              if (Math.abs(dx) < 0.5) st.mouseX = st.targetX;
              if (Math.abs(dy) < 0.5) st.mouseY = st.targetY;

              // Trail (last 60 frames ~ 1 second at 60fps). Suppressed under reduced
              // motion — with no travel between ticks there is no path to trace, and
              // a trail of identical stacked dots is just visual noise.
              if (!reduceMotion) {
                st.trail.push({ x: st.mouseX, y: st.mouseY, t: Date.now() });
                if (st.trail.length > 90) st.trail.shift();
              } else if (st.trail.length) {
                st.trail.length = 0;
              }

              // Draw chamber. The interpolation above still runs while the 3D view is
              // open — that scene reads st.mouseX/st.mouseY — but there is no point
              // rasterising a canvas nobody can see.
              // document.hidden covers the backgrounded tab; the observer covers the
              // far more common case of the chamber being scrolled off a very long page.
              if (d.blChamberView !== '3d' && _blSeenRef.current && !document.hidden) {
                drawChamber(cv2, st);
              }
              _blAnimId.current = requestAnimationFrame(blFrame);
            }
            if (_blAnimId.current) cancelAnimationFrame(_blAnimId.current);
            blFrame();
            // The observer is deliberately NOT disconnected here: this effect has no
            // dependency array, so it re-runs on every render, and tearing the
            // observer down each time would mean it never settles. It is rebuilt only
            // when the canvas element itself changes, and the whole thing dies with
            // the tool.
            return function() { if (_blAnimId.current) cancelAnimationFrame(_blAnimId.current); };
          });

          // ── Sound effects (Web Audio API) ──

          var _blAudioCtx = null;

          function blBeep(freq, dur, vol) {

            if (!blSoundOn) return;

            try {

              if (!_blAudioCtx) _blAudioCtx = new (window.AudioContext || window.webkitAudioContext)();

              var osc = _blAudioCtx.createOscillator();

              var gain = _blAudioCtx.createGain();

              osc.connect(gain); gain.connect(_blAudioCtx.destination);

              osc.frequency.value = freq; osc.type = 'sine';

              gain.gain.value = vol || 0.15;

              gain.gain.exponentialRampToValueAtTime(0.001, _blAudioCtx.currentTime + (dur || 0.15));

              osc.start(); osc.stop(_blAudioCtx.currentTime + (dur || 0.15));

            } catch (e) { }

          }


          // Default probability weights

          var defaultWeights = { explore: 30, groom: 15, sniff: 15, approachLever: 10, pressLever: 3, turnLeft: 10, turnRight: 10, halfTurn: 3, rearUp: 5, freeze: 5, spin: 1, touchWall: 3 };

          var blWeights = d.blWeights || Object.assign({}, defaultWeights);


          // ── Contextual Hints ──

          var blHint = '';

          if (blShowHints && blPhase === 'running') {

            if (blLevel === 1 && blLevelScore === 0 && blTick > 3) blHint = '\uD83D\uDCA1 Start by reinforcing when the mouse approaches the lever area. Then wait for actual presses!';

            else if (blLevel === 1 && blLevelScore > 0 && blLevelScore < 3) blHint = '\uD83D\uDC4D Great! Keep reinforcing lever presses. Watch the probability bar grow!';

            else if (blLevel === 2 && blLevelScore === 0 && blTick > 5) blHint = '\uD83D\uDCA1 Shape in stages: reinforce Turn Right (↪️) first, then Half-Turns, then full Spins!';

            else if (blLevel === 3 && !blExtinctionPhase && blLevelScore >= 5) blHint = '\uD83D\uDCA1 You\'ve reinforced 5 times! Click "Start Extinction" to stop reinforcing.';

            else if (blLevel === 4 && blTick > 3) blHint = '\uD83D\uDCA1 FR-3: Only reinforce every 3rd lever press (count them!)';

            else if (blLevel === 5 && blTick > 3) blHint = '\uD83D\uDCA1 Only reinforce when the GREEN light (SD) is on!';

          }


          var currentLevel = LEVELS.find(function (l) { return l.id === blLevel; }) || LEVELS[0];

          // THE target behaviour for this level, honouring the Free Lab's own
          // selector. Level 6 has `target: null`, so every reader that fell back to
          // `currentLevel.target || 'pressLever'` was scoring, plotting and
          // announcing lever presses no matter what the student picked.
          var blTargetBehavior = (blLevel === 6 && blSandboxTarget)
            ? blSandboxTarget
            : (currentLevel.target || 'pressLever');

          // Whether "how close is the subject to the lever" is a meaningful measure
          // on this level. It was a hardcoded list of level numbers (1, 2, 6) which
          // put a lever-proximity meter on the SHAPING level, whose target is a spin,
          // and could never be right for the sandbox, whose target is chosen at
          // runtime. Derived from the target instead.
          var blProxRelevant = (blLevel === 1 || blLevel === 6)
            && (blTargetBehavior === 'pressLever' || blTargetBehavior === 'approachLever');


          // ── Action labels for display ──

          var ACTION_LABELS = {

            explore: '🔍 Exploring', groom: '🧹 Grooming', sniff: '👃 Sniffing',

            pressLever: '⚡ Pressing Lever!', turnLeft: '↩️ Turning Left', turnRight: '↪️ Turning Right',

            rearUp: '🐭 Rearing Up', freeze: '🧊 Frozen', spin: '🌀 Spinning!', touchWall: '🧱 Touching Wall',

            // Both are real emitted actions (they are in defaultWeights and the
            // shaping path reinforces approachLever directly), but neither had a
            // label or a colour — so the behaviour strip showed a raw identifier,
            // and the chip fell through to the slate fallback.
            approachLever: '🎯 Approaching Lever', halfTurn: '↕️ Half Turn'

          };


          var ACTION_COLORS = {

            explore: '#60a5fa', groom: '#a78bfa', sniff: '#34d399',

            pressLever: '#f59e0b', turnLeft: '#f472b6', turnRight: '#f472b6',

            rearUp: '#fb923c', freeze: '#94a3b8', spin: '#c084fc', touchWall: '#94a3b8',

            // Amber-adjacent: approaching the lever is the shaping step BEFORE the
            // press, so it reads as a paler cousin of pressLever rather than a
            // fourth unrelated hue.
            approachLever: '#fcd34d', halfTurn: '#f9a8d4'

          };

          // ── Where the apparatus IS, in simulation-world coordinates ───────────
          //
          // There used to be three answers to "where is the lever", and the lesson
          // rode on all three: the tick loop shaped approach against (340, 210), the
          // proximity meter under the chamber measured (350, 225), and the chamber
          // drew the lever at (canvasWidth - 66) — which, on a canvas roughly 1000px
          // wide against a 400-unit world, put the drawn lever about 550px to the
          // right of the one the mouse was walking toward. A student watching Level 1
          // saw the mouse get reinforced for approaching empty floor.
          //
          // One constant, read by the tick loop, the meter, the 2D chamber and the 3D
          // chamber. The world is 400 x 280; drawChamber scales x into the canvas.
          var BL_WORLD_W = 400;
          var BL_LEVER = { x: 340, y: 210 };
          var BL_FOOD = { x: 55, y: 244 };
          // Full-scale distance for the proximity readouts. 330 is the widest gap the
          // chamber allows (corner to lever), so the meter actually uses its range
          // instead of pinning near the top the way a 300 cap did.
          var BL_PROX_RANGE = 330;

          // ── Level 4's schedule ───────────────────────────────────────────────
          // Level 4 is titled "On Schedule", its contingency card says "Every 3rd
          // press", its hint says "count them!", and its quiz asks when an FR-3
          // delivers — but nothing in the level implemented FR-3. Reinforcement was
          // accepted on ANY press, the score was identical whether the student
          // followed the schedule or reinforced continuously, and the on-screen
          // "FR-3 count" was `reinforcementsDelivered % 3` — so it counted the wrong
          // events and a student reading "1 / 3" as "one press down, two to go" was
          // being told something untrue.
          //
          // Levels 5 and 7 already gate reinforcement on their own contingency (the
          // SD colour, the completed chain). Level 4 simply never got its gate.
          var BL_FR_RATIO = 3;

          // Associative learning rate for Level 9 (Pavlov). One constant for both
          // acquisition and extinction, because they are the same process running
          // toward different asymptotes.
          var BL_CS_RATE = 0.35;

          // ── 3D part labels and teaching text ─────────────────────────────────
          // makeBayViewer captures cfg.parts once at module load, so the floating
          // chips in the scene are English (same limitation as every other bay-viewer
          // consumer). These localized strings drive the buttons and the description
          // strip under the viewer, which is where the actual explanation lives.
          var BL_PART_TEXT = {
            lever: {
              label: __alloT('stem.behaviorlab.part_lever', 'Response lever'),
              desc: __alloT('stem.behaviorlab.part_lever_desc', 'The operandum — the one thing in the box the subject can operate. A press is the operant response the schedule is defined over; everything else the mouse does is measured, not reinforced.')
            },
            hopper: {
              label: __alloT('stem.behaviorlab.part_hopper', 'Food magazine'),
              desc: __alloT('stem.behaviorlab.part_hopper_desc', 'Delivers one pellet at a time into the trough. The delivery is the reinforcer only if it actually raises the future rate of the behaviour it followed — a consequence is not a reinforcer by intention.')
            },
            sdlight: {
              label: __alloT('stem.behaviorlab.part_sdlight', 'Stimulus light'),
              desc: __alloT('stem.behaviorlab.part_sdlight_desc', 'The discriminative stimulus. Green (SD) signals that responding is reinforced; red (S-delta) signals that it is not. It does not cause the press — it sets the occasion for it.')
            },
            speaker: {
              label: __alloT('stem.behaviorlab.part_speaker', 'Tone generator'),
              desc: __alloT('stem.behaviorlab.part_speaker_desc', 'Sounds the conditioned stimulus in the Pavlov level. Classical conditioning pairs the tone with food regardless of what the subject does — that independence from behaviour is exactly what separates it from operant conditioning.')
            },
            grid: {
              label: __alloT('stem.behaviorlab.part_grid', 'Grid floor'),
              desc: __alloT('stem.behaviorlab.part_grid_desc', 'Stainless bars. In this simulation the floor is only a floor: it delivers nothing. Historically, grid floors were also used to deliver shock, which is a large part of why the chamber carries the reputation it does.')
            },
            house: {
              label: __alloT('stem.behaviorlab.part_house', 'House light'),
              desc: __alloT('stem.behaviorlab.part_house_desc', 'General illumination for the chamber. It dims here while extinction is running, so the change in conditions is visible rather than only tabulated.')
            },
            subject: {
              label: __alloT('stem.behaviorlab.part_subject', 'Subject'),
              desc: __alloT('stem.behaviorlab.part_subject_desc', 'A simulated mouse. Its behaviour is drawn from a probability distribution that reinforcement reshapes — you are watching a model of operant learning, not a recording of a real animal.')
            }
          };


          // ── Level accent colors ──

          var LEVEL_COLORS = { 1: '#f59e0b', 2: '#a78bfa', 3: '#f87171', 4: '#60a5fa', 5: '#22c55e', 6: '#ec4899', 7: '#a855f7', 8: '#06b6d4', 9: '#e11d48' };

          var lvlAccent = LEVEL_COLORS[blLevel] || '#f59e0b';


          // ── Behavior Engine: Select next action based on weights ──

          // Stamp the newest point on the cumulative record as a delivery.
          //
          // The chart used to draw a green pip wherever `cum` INCREASED and label it
          // "Green = reinforcement delivery (FR-3 pattern)" — but `cum` counts target
          // RESPONSES, so on an FR-3 schedule it marked all three presses as
          // deliveries and flatly contradicted the level teaching that only every
          // third one pays. Same error the Sleuth primer made in words. Reinforcement
          // is now recorded where it happens instead of being inferred from the
          // response count.
          //
          // Uses the functional updater rather than `upd`: deliveries are
          // user-triggered while the tick timer is also writing blCumRecord, and a
          // captured-array write would drop whichever of the two lost the race.
          function markReinforcementOnRecord() {
            setLabToolData(function (prev) {
              var next = Object.assign({}, prev);
              var rec = (next.blCumRecord || []).slice();
              if (!rec.length) return prev;
              rec[rec.length - 1] = Object.assign({}, rec[rec.length - 1], { reinf: true });
              next.blCumRecord = rec;
              return next;
            });
          }

          function selectAction() {

            var total = 0;

            var keys = Object.keys(blWeights);

            for (var i = 0; i < keys.length; i++) total += blWeights[keys[i]];

            var roll = Math.random() * total;

            var cumulative = 0;

            for (var j = 0; j < keys.length; j++) {

              cumulative += blWeights[keys[j]];

              if (roll <= cumulative) return keys[j];

            }

            return 'explore';

          }


          // ── Reinforce: increase weight of the last action ──

          function reinforceAction() {

            if (!blLastAction) return;

            var actionToReinforce = blLastAction;

            var newWeights = Object.assign({}, blWeights);

            newWeights[actionToReinforce] = Math.min((newWeights[actionToReinforce] || 5) + 4, 70);


            // For level 5 (stimulus discrimination), only count if light is correct color

            if (blLevel === 5 && blLightColor !== 'green') {

              var newLog = blAbcLog.slice();

              // The consequence column used to read "Food (incorrect SD)", but no
              // food is delivered on this path and no weight changes: the ABC log was
              // recording a consequence the simulation did not produce, in the one
              // panel whose whole job is teaching students to record what actually
              // happened.
              newLog.unshift({ tick: blTick, a: blLightColor + ' light (S\u0394)', b: ACTION_LABELS[actionToReinforce] || actionToReinforce, c: '\u274C No food \u2014 wrong stimulus', t: Date.now() });

              upd('blAbcLog', newLog.slice(0, 50));

              if (addToast) addToast(__alloT('stem.behaviorlab.toast_sd_only', '\u274C Only reinforce when the GREEN light (SD) is on!'), 'error');

              return;

            }


            // Level 4: the FR-3 schedule itself. Only PRESSES are on the schedule —
            // reinforcing an approach stays allowed, because shaping the press up from
            // a 3-in-110 baseline is how a student gets presses to put on a schedule
            // at all.
            if (blLevel === 4 && actionToReinforce === 'pressLever') {
              var frPresses = d.blFrPresses || 0;
              if (frPresses < BL_FR_RATIO) {
                var newLogFr = blAbcLog.slice();
                newLogFr.unshift({ tick: blTick, a: 'FR-' + BL_FR_RATIO + ' schedule',
                  b: ACTION_LABELS[actionToReinforce] || actionToReinforce,
                  c: '\u274C No food \u2014 press ' + frPresses + ' of ' + BL_FR_RATIO, t: Date.now() });
                upd('blAbcLog', newLogFr.slice(0, 50));
                if (addToast) addToast(blT('stem.behaviorlab.toast_fr_too_early', '\u26A0\uFE0F FR-{ratio}: that was press {n} of {ratio}. Wait for the next one.', { ratio: BL_FR_RATIO, n: frPresses }), 'warning');
                return;
              }
            }

            // Level 7: behavior chain check — only allow reinforce on completed chain

            if (blLevel === 7) {

              if (blChainStep < CHAIN_SEQ.length || actionToReinforce !== 'pressLever') {

                if (addToast) addToast(__alloT('stem.behaviorlab.toast_wait_for_chain', '\u26A0\uFE0F Wait for the full chain: Sniff ➜ Rear Up ➜ Lever!'), 'warning');

                return;

              }

            }


            // Level 2 is shaping, and shaping means reinforcing an approximation
            // makes the NEXT one more likely. Without this the student reinforces a
            // turn, and then waits for a spin that starts at weight 1 in ~110 — on
            // the order of a hundred ticks of nothing. The student still does all the
            // reinforcing; this just stops the terminal behaviour being a lottery.
            if (blLevel === 2) {
              var SHAPE_STEPS = ['turnRight', 'halfTurn', 'spin'];
              var stepIdx = SHAPE_STEPS.indexOf(actionToReinforce);
              if (stepIdx >= 0 && stepIdx < SHAPE_STEPS.length - 1) {
                var nextStep = SHAPE_STEPS[stepIdx + 1];
                newWeights[nextStep] = Math.min(35, (newWeights[nextStep] || 1) + 2.5);
              }
            }
            upd('blWeights', newWeights);

            upd('blReinforcements', blReinforcements + 1);
            markReinforcementOnRecord();

            upd('blFoodVisible', true);

            upd('blFoodTime', Date.now());

            blBeep(880, 0.12, 0.2);

            setTimeout(function () { upd('blFoodVisible', false); }, 1200);


            // Mood update — happy!

            upd('blMoodEmoji', '😊');

            upd('blMoodTimer', Date.now());


            // Delay to reinforcement — the gap between the TARGET behaviour
            // occurring and the pellet arriving. It was logged on every delivery,
            // including ones that reinforced grooming or exploring, and those were
            // measured against the last lever press: an unrelated behaviour six
            // ticks after a press logged a six-tick "latency" for a press that had
            // already been dealt with. Only target deliveries belong in this metric,
            // because delay to reinforcement is the thing it exists to teach.

            if (blLastTargetTick > 0 && actionToReinforce === blTargetBehavior) {

              var latencyTicks = Math.max(0, blTick - blLastTargetTick);

              var newLatencies = blLatencies.concat([latencyTicks]);

              if (newLatencies.length > 50) newLatencies = newLatencies.slice(-50);

              upd('blLatencies', newLatencies);

            }


            // Update score

            var isTargetAction = actionToReinforce === blTargetBehavior;

            if (isTargetAction) {

              upd('blLevelScore', blLevelScore + 1);
              if (announceToSR) announceToSR(blT('stem.behaviorlab.sr_reinforced_score', 'Reinforced! Score: {n} of {goal}', { n: blLevelScore + 1, goal: currentLevel ? currentLevel.goal : '?' }));

            }


            // Level 7 chain: reset chain step after reinforcement

            if (blLevel === 7) {

              upd('blChainStep', 0);

              upd('blChainHistory', blChainHistory.concat([blTick]));

            }


            // ABC log

            var antecedent = blLevel === 5
              ? blT('stem.behaviorlab.abc_ante_light', '{colour} light', { colour: blLightColor })
              : (blLevel === 7 ? __alloT('stem.behaviorlab.abc_ante_chain', 'Chain complete') : __alloT('stem.behaviorlab.abc_ante_chamber', 'Chamber'));

            var newLog2 = blAbcLog.slice();

            newLog2.unshift({ tick: blTick, a: antecedent, b: ACTION_LABELS[actionToReinforce] || actionToReinforce, c: '\uD83C\uDF55 Food pellet (+SR)', t: Date.now() });

            upd('blAbcLog', newLog2.slice(0, 50));


            // XP

            if (typeof awardStemXP === 'function') awardStemXP('behaviorLab', 2, 'Reinforced ' + actionToReinforce);


            // Level 4: schedule tracking

            if (blLevel === 4) {

              upd('blScheduleCount', blScheduleCount + 1);
              upd('blFrPresses', 0);

            }

          }


          // ── Action dwell times (ticks an action persists) ──

          // Action dwell times (ticks an action persists) — increased for smoother observation
          var ACTION_DWELL = { explore: 5, groom: 6, sniff: 4, approachLever: 5, pressLever: 4, turnLeft: 4, turnRight: 4, halfTurn: 5, rearUp: 4, freeze: 6, spin: 5, touchWall: 4 };


          // ── Advance simulation by one tick ──

          function advanceTick() {

            if (blPaused || blPhase !== 'running') return;


            var newTick = blTick + 1;


            // Dwell: if current action still has dwell ticks, keep it

            if (blActionDwell > 1) {

              upd('blActionDwell', blActionDwell - 1);

              upd('blTick', newTick);

              upd('blTotalTicks', (d.blTotalTicks || 0) + 1);

              var targetAction2 = blTargetBehavior;

              var cumCount2 = blCumRecord.length > 0 ? blCumRecord[blCumRecord.length - 1].cum : 0;

              var newCumDwell = blCumRecord.concat([{ tick: newTick, cum: cumCount2, burst: false }]);

              if (newCumDwell.length > 200) newCumDwell = newCumDwell.slice(-200);

              upd('blCumRecord', newCumDwell);

              return;

            }


            var action = selectAction();

            var dwell = ACTION_DWELL[action] || 2;

            upd('blActionDwell', dwell);


            // Update mouse position based on action

            var newX = blMouseX;

            var newY = blMouseY;

            var newDir = blMouseDir;

            var newAngle = blMouseAngle;


            switch (action) {

              case 'explore':

                newX = Math.max(40, Math.min(360, blMouseX + (Math.random() - 0.5) * 50));

                newY = Math.max(80, Math.min(230, blMouseY + (Math.random() - 0.5) * 35));

                newDir = Math.random() > 0.5 ? 1 : -1;

                break;

              case 'approachLever':

                newX = 280 + Math.random() * 40;

                newY = 180 + Math.random() * 30;

                newDir = 1;

                break;

              case 'pressLever':

                newX = 340; newY = 210;

                break;

              case 'turnLeft':

                newDir = -1;

                newAngle = blMouseAngle - 90;

                break;

              case 'turnRight':

                newDir = 1;

                newAngle = blMouseAngle + 90;

                break;

              case 'halfTurn':

                newDir = -newDir;

                newAngle = blMouseAngle + 180;

                break;

              case 'spin':

                newAngle = blMouseAngle + 360;

                break;

              case 'rearUp':

                newY = Math.max(80, blMouseY - 20);

                break;

              case 'touchWall':

                newX = Math.random() > 0.5 ? 35 : 365;

                newY = blMouseY;

                break;

              case 'sniff':

                newX = blMouseX + (Math.random() - 0.5) * 20;

                newY = blMouseY + (Math.random() - 0.5) * 15;

                break;

              case 'groom':

              case 'freeze':

                // Stay in place

                break;

            }


            // ── Delta-based proximity shaping ──

            // Track rolling position history (last 5 positions)

            var newPosHist = (d.blPosHistory || []).concat([{ x: newX, y: newY }]);

            if (newPosHist.length > 5) newPosHist = newPosHist.slice(-5);

            upd('blPosHistory', newPosHist);


            // Compute proximity delta: how much closer is mouse to lever vs 3 ticks ago?

            var LEVER_X = BL_LEVER.x, LEVER_Y = BL_LEVER.y;

            if (newPosHist.length >= 3) {

              var oldPos = newPosHist[newPosHist.length - 3];

              var oldDist = Math.sqrt(Math.pow(oldPos.x - LEVER_X, 2) + Math.pow(oldPos.y - LEVER_Y, 2));

              var newDist = Math.sqrt(Math.pow(newX - LEVER_X, 2) + Math.pow(newY - LEVER_Y, 2));

              var proxDelta = oldDist - newDist; // positive = getting closer

              upd('blProxDelta', Math.round(proxDelta * 10) / 10);


              // Apply shaping on levels 1, 2, and 6 (sandbox) — any proximity gain counts

              if (blProxRelevant && proxDelta > 5) {

                var w2 = Object.assign({}, newWeights);

                // Proportional boost: bigger approach = bigger reinforcement

                var boost = proxDelta > 15 ? 0.6 : 0.3;

                w2.approachLever = Math.min(40, (w2.approachLever || 10) + boost);

                w2.pressLever = Math.min(12, (w2.pressLever || 3) + boost * 0.5);

                newWeights = w2;

              }

            }


            // Update cumulative record for target behavior

            var targetAction = blTargetBehavior;

            var cumCount = blCumRecord.length > 0 ? blCumRecord[blCumRecord.length - 1].cum : 0;

            if (action === targetAction) {

              cumCount++;

              upd('blLastTargetTick', newTick);

            }

            // FR-3 ratio counter: RESPONSES since the last delivery, which is what a
            // ratio schedule counts. The old counter incremented on reinforcement
            // instead, so it told the student how many pellets they had delivered
            // while labelled as their progress toward the next one.
            if (blLevel === 4 && action === 'pressLever') {
              upd('blFrPresses', (d.blFrPresses || 0) + 1);
            }

            // Mark extinction burst on cumulative record

            var isBurstTick = blLevel === 3 && blExtinctionPhase && (newTick - blExtinctionStart) < 12;

            var newCumRecord = blCumRecord.concat([{ tick: newTick, cum: cumCount, burst: isBurstTick }]);

            if (newCumRecord.length > 200) newCumRecord = newCumRecord.slice(-200);


            // Level 7: chain step tracking

            if (blLevel === 7) {

              var curChainStep = blChainStep;

              if (action === CHAIN_SEQ[curChainStep]) {

                curChainStep++;

                if (curChainStep <= CHAIN_SEQ.length) {

                  upd('blChainStep', curChainStep);

                  if (curChainStep < CHAIN_SEQ.length) {

                    blBeep(600 + curChainStep * 200, 0.08, 0.12);

                  } else {

                    blBeep(1400, 0.2, 0.2);

                  }

                }

              } else if (CHAIN_SEQ.indexOf(action) >= 0 && action !== CHAIN_SEQ[curChainStep]) {

                // Wrong order — reset chain

                upd('blChainStep', 0);

              }

            }


            // Mood decay

            if (blMoodTimer > 0 && (Date.now() - blMoodTimer) > 5000) {

              upd('blMoodEmoji', blReinforcements > 3 ? '🤔' : '😐');

              upd('blMoodTimer', 0);

            }


            // History

            var newHistory = blHistory.concat([{ tick: newTick, action: action }]);

            if (newHistory.length > 100) newHistory = newHistory.slice(-100);


            // Natural extinction drift (unreinforced actions slowly return to baseline)

            var newWeights = Object.assign({}, blWeights);

            var wKeys = Object.keys(newWeights);

            for (var wi = 0; wi < wKeys.length; wi++) {

              var wk = wKeys[wi];

              if (newWeights[wk] > defaultWeights[wk] + 2) {

                newWeights[wk] = Math.max(defaultWeights[wk], newWeights[wk] - 0.15);

              }

            }


            // Level 3: extinction burst simulation

            if (blLevel === 3 && blExtinctionPhase) {

              var ticksSinceExtinction = newTick - blExtinctionStart;

              if (ticksSinceExtinction < 12) {

                // Extinction burst: INCREASE lever pressing temporarily (dramatic spike)

                newWeights.pressLever = Math.min(65, (newWeights.pressLever || 5) + 8);

              } else if (ticksSinceExtinction < 30) {

                // Gradual decrease

                newWeights.pressLever = Math.max(2, (newWeights.pressLever || 5) - 2);

              }

            }


            // Level 5: cycle light colors + audio SD cues

            if (blLevel === 5 && newTick % 8 === 0) {

              var nextColor = blLightColor === 'green' ? 'red' : 'green';

              upd('blLightColor', nextColor);

              if (nextColor === 'green') blBeep(1200, 0.15, 0.18);

              else blBeep(200, 0.25, 0.12);

            }


            // Level 8: DRO timer mechanic

            if (blLevel === 8 && blPhase === 'running') {

              if (action === 'pressLever') {

                // Target behavior occurred — reset DRO timer

                upd('blDroTimer', 0);

                var droResetLog = blAbcLog.slice();

                droResetLog.unshift({ tick: newTick, a: 'DRO timer running', b: '⚡ Pressing Lever!', c: '🔄 Timer reset (target occurred)', t: Date.now() });

                upd('blAbcLog', droResetLog.slice(0, 50));

                blBeep(200, 0.15, 0.1);

              } else {

                var newDroTimer = blDroTimer + 1;

                if (newDroTimer >= blDroInterval) {

                  // DRO interval met! Auto-deliver food

                  upd('blDroTimer', 0);

                  upd('blDroSuccesses', blDroSuccesses + 1);

                  markReinforcementOnRecord();

                  upd('blFoodVisible', true);

                  upd('blFoodTime', Date.now());

                  upd('blReinforcements', blReinforcements + 1);

                  upd('blLevelScore', blLevelScore + 1);

                  upd('blMoodEmoji', '😊');

                  upd('blMoodTimer', Date.now());

                  blBeep(880, 0.12, 0.2);

                  setTimeout(function () { upd('blFoodVisible', false); }, 1200);

                  var droSuccessLog = blAbcLog.slice();

                  droSuccessLog.unshift({ tick: newTick, a: 'DRO interval complete', b: 'No lever press for ' + blDroInterval + ' ticks', c: '🍕 Food delivered (DRO success!)', t: Date.now() });

                  upd('blAbcLog', droSuccessLog.slice(0, 50));

                  if (typeof awardStemXP === 'function') awardStemXP('behaviorLab', 2, 'DRO interval success');

                  if (addToast) addToast(__alloT('stem.behaviorlab.toast_dro_met', '🍕 DRO interval met! Food delivered.'), 'success');

                } else {

                  upd('blDroTimer', newDroTimer);

                }

              }

            }


            // Level 9: Classical conditioning automatic salivation decay

            if (blLevel === 9 && blPhase === 'running') {

              // Auto-clear bell after 3 ticks

              if (blBellRinging && blBellTime > 0 && (Date.now() - blBellTime) > 2000) {

                upd('blBellRinging', false);

              }

              // Auto-clear salivation

              if (blSalivating && (Date.now() - (d.blSalivateTime || 0)) > 2500) {

                upd('blSalivating', false);

              }

              // In test/extinction phase: if bell is ringing and assocStrength > 30, auto-salivate (CR)

              if (blBellRinging && blAssocStrength > 30 && (blCcPhase === 'test' || blCcPhase === 'extinction')) {

                upd('blSalivating', true);

                upd('blSalivateTime', Date.now());

              }

            }


            // Check level completion

            var justCompleted = false;

            if (currentLevel.goal > 0 && blLevelScore >= currentLevel.goal && blPhase === 'running') {

              justCompleted = true;

              upd('blPhase', 'complete');

              if (typeof awardStemXP === 'function') awardStemXP('behaviorLab', 15, 'Completed Level ' + blLevel + ': ' + currentLevel.title);

              if (addToast) addToast(blT('stem.behaviorlab.toast_level_complete', '\uD83C\uDF89 Level {n} complete! {concept}.', { n: blLevel, concept: currentLevel.concept }), 'success');
              if (announceToSR) announceToSR(blT('stem.behaviorlab.sr_level_complete', 'Level {n} complete. {concept}.', { n: blLevel, concept: currentLevel.concept }));

              var newCompleted = blCompletedLevels.indexOf(blLevel) < 0 ? blCompletedLevels.concat([blLevel]) : blCompletedLevels;

              upd('blCompletedLevels', newCompleted);

            }


            // Level 3 special: completion is observing the burst

            if (blLevel === 3 && blExtinctionPhase) {

              var ticksSince = newTick - blExtinctionStart;

              if (ticksSince >= 25 && blPhase === 'running') {

                justCompleted = true;

                upd('blPhase', 'complete');

                if (typeof awardStemXP === 'function') awardStemXP('behaviorLab', 15, 'Completed Level 3: Observed extinction burst');

                if (addToast) addToast(__alloT('stem.behaviorlab.toast_l3_complete', '\uD83C\uDF89 Level 3 complete! You observed the extinction burst.'), 'success');
                if (announceToSR) announceToSR(__alloT('stem.behaviorlab.sr_l3_complete', 'Level 3 complete. You observed the extinction burst.'));

                var newCompleted3 = blCompletedLevels.indexOf(3) < 0 ? blCompletedLevels.concat([3]) : blCompletedLevels;

                upd('blCompletedLevels', newCompleted3);

              }

            }


            // Announce the TARGET behaviour, and only that.
            //
            // The chamber is a canvas, so a screen-reader user had no way to know the
            // moment they were being asked to act on: reinforcement was announced
            // AFTER they delivered it, which is the one event they already knew about.
            // Announcing every tick's action instead would be unusable — a tick lands
            // every 2 to 5 seconds all session. The target behaviour is rare by
            // construction (that is why it needs shaping), so it is the one worth
            // interrupting for, and the prompt names the key that acts on it.
            if (announceToSR && action === blTargetBehavior && blPhase === 'running'
                && blLevel !== 8 && blLevel !== 9) {
              announceToSR((ACTION_LABELS[action] || action)
                + '. ' + __alloT('stem.behaviorlab.press_space_to_reinforce', 'Press Space to reinforce.'));
            }

            // Batch update state

            upd('blTick', newTick);

            upd('blMouseAction', action);

            upd('blTargetX', newX);

            upd('blTargetY', newY);

            upd('blMouseDir', newDir);

            upd('blMouseAngle', newAngle);

            upd('blHistory', newHistory);

            upd('blCumRecord', newCumRecord);

            upd('blWeights', newWeights);

            upd('blLastAction', action);

            upd('blActionAge', 0);

            // Track recent actions for heatmap strip

            var newRecentActions = blRecentActions.concat([action]);

            if (newRecentActions.length > 20) newRecentActions = newRecentActions.slice(-20);

            upd('blRecentActions', newRecentActions);

          }


          // ── Canvas Drawing ──

          function drawChamber(canvas, _st) {

            if (!canvas) return;

            var ctx = canvas.getContext('2d');

            // HiDPI support
            var dpr = window.devicePixelRatio || 1;
            var targetW = canvas.offsetWidth || 420;
            var targetH = 280;
            if (canvas.width !== Math.round(targetW * dpr) || canvas.height !== Math.round(targetH * dpr)) {
              canvas.width = Math.round(targetW * dpr);
              canvas.height = Math.round(targetH * dpr);
              canvas.style.width = targetW + 'px';
              canvas.style.height = targetH + 'px';
            }
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            var W = targetW;
            var H = targetH;

            // World → screen. The simulation reasons in a fixed 400 x 280 space, but
            // the canvas is as wide as the panel it sits in (~1000px in the tool's
            // 1080px shell). Everything the mouse can interact with is therefore
            // placed through SX; the canvas-relative positions this used to draw at
            // were the reason the mouse never reached its own lever. Y needs no
            // scale — the canvas height IS the world height.
            var SX = W / BL_WORLD_W;
            function wx(x) { return x * SX; }

            // Read from animation state if provided (rAF path), else fall back to closure vars
            var blMouseX = _st ? _st.mouseX : (d.blMouseX || 200);
            var blMouseSX;   // screen x for blMouseX — assigned just below
            var blMouseY = _st ? _st.mouseY : (d.blMouseY || 150);
            var blMouseAction = _st ? _st.mouseAction : (d.blMouseAction || 'explore');
            var blMouseDir = _st ? _st.mouseDir : (d.blMouseDir || 1);
            var blMouseAngle = _st ? _st.mouseAngle : (d.blMouseAngle || 0);
            var blFoodVisible = _st ? _st.foodVisible : d.blFoodVisible;
            var blFoodTime = _st ? _st.foodTime : (d.blFoodTime || 0);
            var blMoodEmoji = _st ? _st.moodEmoji : (d.blMoodEmoji || '');
            var blMoodTimer = _st ? _st.moodTimer : (d.blMoodTimer || 0);
            var blLightColor = _st ? _st.lightColor : (d.blLightColor || 'green');
            var blTick = _st ? _st.tick : (d.blTick || 0);
            var blLevelScore = _st ? _st.levelScore : (d.blLevelScore || 0);
            var blLevel = _st ? _st.level : (d.blLevel || 1);
            var blExtinctionPhase = _st ? _st.extinctionPhase : d.blExtinctionPhase;
            var blExtinctionStart = _st ? _st.extinctionStart : (d.blExtinctionStart || 0);
            var blChainStep = _st ? _st.chainStep : (d.blChainStep || 0);
            var blCcPhase = _st ? _st.ccPhase : (d.blCcPhase || 'baseline');
            var blBellRinging = _st ? _st.bellRinging : d.blBellRinging;
            var blSalivating = _st ? _st.salivating : d.blSalivating;
            var blAssocStrength = _st ? _st.assocStrength : (d.blAssocStrength || 0);
            var blDroTimer = _st ? _st.droTimer : (d.blDroTimer || 0);
            var blDroInterval = _st ? _st.droInterval : (d.blDroInterval || 6);
            var blProxDelta = _st ? _st.proxDelta : (d.blProxDelta || 0);
            blMouseSX = wx(blMouseX);

            // Almost all of this tool's motion is drawn, not animated by CSS, so the
            // prefers-reduced-motion stylesheet it injects never reached any of it:
            // the breathing, the walk cycle, the tail wag, the ear twitch, the glow
            // pulses, the drifting dust and the spin all ran regardless. `oscT` is
            // the clock every oscillator reads, frozen at 0 when the preference is
            // set — which lands each of them on a neutral phase (breath scale 1, no
            // wag, no bounce) rather than on some arbitrary frame. Elapsed-time reads
            // like `Date.now() - blFoodTime` deliberately keep the real clock: those
            // are timing, not motion, and freezing them would stop the pellet from
            // ever clearing.
            var oscT = (_st && _st.reduced) ? 0 : Date.now();


            // Chamber background

            var chamberGrad = ctx.createLinearGradient(0, 0, 0, H);

            chamberGrad.addColorStop(0, '#1e1b2e');

            chamberGrad.addColorStop(1, '#2d2641');

            ctx.fillStyle = chamberGrad;

            ctx.fillRect(0, 0, W, H);


            // Chamber walls

            ctx.strokeStyle = '#6366f1';

            ctx.lineWidth = 3;

            ctx.strokeRect(20, 50, W - 40, H - 70);


            // Wall texture lines (subtle horizontal stripes)

            ctx.strokeStyle = 'rgba(99, 102, 241, 0.06)';

            ctx.lineWidth = 0.5;

            for (var wly = 65; wly < H - 30; wly += 15) {

              ctx.beginPath(); ctx.moveTo(22, wly); ctx.lineTo(W - 22, wly); ctx.stroke();

            }

            // Vertical wall texture accents

            ctx.strokeStyle = 'rgba(99, 102, 241, 0.04)';

            for (var wlx = 50; wlx < W - 30; wlx += 40) {

              ctx.beginPath(); ctx.moveTo(wlx, 52); ctx.lineTo(wlx, H - 22); ctx.stroke();

            }


            // Chamber floor

            ctx.fillStyle = '#3b3555';

            ctx.fillRect(20, H - 25, W - 40, 5);


            // Grid lines on floor

            ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)';

            ctx.lineWidth = 0.5;

            for (var gx = 40; gx < W - 20; gx += 20) {

              ctx.beginPath(); ctx.moveTo(gx, H - 25); ctx.lineTo(gx, H - 20); ctx.stroke();

            }


            // ─ Light indicator (top-left, enlarged + pulsing glow) ─

            if (blLevel === 5 || blLevel === 6) {
              var lightCol = blLightColor === 'green' ? '#22c55e' : (blLightColor === 'red' ? '#f87171' : '#94a3b8');
              var glowPulse = 0.3 + Math.sin(oscT / 400) * 0.15;
              // Pulsing outer glow ring
              ctx.save();
              ctx.beginPath(); ctx.arc(wx(BL_LEVER.x), 35, 22, 0, Math.PI * 2);
              ctx.fillStyle = (blLightColor === 'green' ? 'rgba(34,197,94,' : 'rgba(239,68,68,') + glowPulse.toFixed(2) + ')';
              ctx.fill();
              ctx.restore();
              // Main light circle
              // Directly above the lever, matching the 3D chamber - and clear of the food
              // chute, which the old fixed x=50 sat on top of.
              ctx.beginPath(); ctx.arc(wx(BL_LEVER.x), 35, 16, 0, Math.PI * 2);
              ctx.fillStyle = lightCol; ctx.fill();
              ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
              // Label. Black on the lit lens, not white: the green and red lenses are
              // both mid-tone, and white on them ran under 3:1.
              ctx.fillStyle = '#0b1220'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
              ctx.fillText(blLightColor === 'green' ? 'SD' : 'S\u0394', wx(BL_LEVER.x), 39);
            }


            // ─ Lever (right side) with depression animation ─

            // The sprite is drawn from its top-left, and the tick loop measures
            // approach to its centre — so back the draw origin out of BL_LEVER
            // rather than letting the two drift.
            var leverX = wx(BL_LEVER.x) - 4;

            var leverY = BL_LEVER.y - 15;

            var leverPressed = blMouseAction === 'pressLever';

            var leverDepth = leverPressed ? 5 : 0;

            // Lever shadow when pressed

            if (leverPressed) {

              ctx.fillStyle = 'rgba(0,0,0,0.2)';

              ctx.fillRect(leverX - 1, leverY + leverDepth + 2, 10, 28);

            }

            ctx.fillStyle = leverPressed ? '#f59e0b' : '#94a3b8';

            ctx.fillRect(leverX, leverY + leverDepth, 8, 30 - leverDepth);

            // Lever base

            ctx.fillStyle = '#94a3b8';

            ctx.fillRect(leverX - 4, leverY + 25, 16, 8);

            // Lever press glow

            if (leverPressed) {

              ctx.beginPath();

              ctx.arc(leverX + 4, leverY + leverDepth + 10, 18, 0, Math.PI * 2);

              ctx.fillStyle = 'rgba(245,158,11,0.25)';

              ctx.fill();

              // Lever spring coil

              ctx.strokeStyle = '#d97706';

              ctx.lineWidth = 1;

              for (var si = 0; si < 3; si++) {

                ctx.beginPath();

                ctx.moveTo(leverX + 1, leverY + leverDepth + 2 + si * 3);

                ctx.lineTo(leverX + 7, leverY + leverDepth + 2 + si * 3);

                ctx.stroke();

              }

            }

            // Lever label

            ctx.fillStyle = '#94a3b8';

            ctx.font = '8px sans-serif';

            ctx.textAlign = 'center';

            ctx.fillText(__alloT('stem.behaviorlab.canvas_lever', 'LEVER'), leverX + 4, leverY + 42);


            // ─ Food tray (bottom-left) ─

            var trayX = wx(BL_FOOD.x);

            var trayY = BL_FOOD.y - 4;

            ctx.fillStyle = '#475569';

            ctx.fillRect(trayX - 15, trayY, 30, 12);

            ctx.strokeStyle = '#94a3b8';

            ctx.lineWidth = 1;

            ctx.strokeRect(trayX - 15, trayY, 30, 12);

            // Food pellet

            if (blFoodVisible) {

              ctx.beginPath();

              ctx.arc(trayX, trayY + 4, 5, 0, Math.PI * 2);

              var foodGrad = ctx.createRadialGradient(trayX - 1, trayY + 2, 1, trayX, trayY + 4, 5);

              foodGrad.addColorStop(0, '#fbbf24');

              foodGrad.addColorStop(1, '#f59e0b');

              ctx.fillStyle = foodGrad;

              ctx.fill();

              // Food glow (enhanced)

              ctx.beginPath();

              ctx.arc(trayX, trayY + 4, 20, 0, Math.PI * 2);

              ctx.fillStyle = 'rgba(251,191,36,' + (0.12 + Math.sin(oscT / 200) * 0.08) + ')';

              ctx.fill();

              ctx.beginPath();

              ctx.arc(trayX, trayY + 4, 30, 0, Math.PI * 2);

              ctx.fillStyle = 'rgba(245,158,11,' + (0.04 + Math.sin(oscT / 400) * 0.03) + ')';

              ctx.fill();

              // Particle burst on food delivery

              var pAge = (Date.now() - (blFoodTime || Date.now())) / 1000;

              if (pAge < 1.2) {

                for (var pi = 0; pi < 8; pi++) {

                  var pAngle = (pi / 8) * Math.PI * 2;

                  var pDist = pAge * 40 + 5;

                  var pAlpha = Math.max(0, 1 - pAge / 1.2);

                  var ppx = trayX + Math.cos(pAngle) * pDist;

                  var ppy = trayY + 4 + Math.sin(pAngle) * pDist * 0.7;

                  ctx.beginPath();

                  ctx.arc(ppx, ppy, 2.5 * (1 - pAge / 1.5), 0, Math.PI * 2);

                  ctx.fillStyle = 'rgba(251,191,36,' + (pAlpha * 0.7) + ')';

                  ctx.fill();

                }

              }

            }

            // Food dispenser chute

            ctx.fillStyle = '#374151';

            ctx.fillRect(trayX - 8, 50, 16, trayY - 50);

            ctx.strokeStyle = '#4b5563';

            ctx.lineWidth = 0.5;

            ctx.strokeRect(trayX - 8, 50, 16, trayY - 50);

            // Inner chute detail lines

            ctx.strokeStyle = 'rgba(75,85,99,0.4)';

            ctx.lineWidth = 0.3;

            for (var chl = 60; chl < trayY - 10; chl += 12) {

              ctx.beginPath(); ctx.moveTo(trayX - 6, chl); ctx.lineTo(trayX + 6, chl); ctx.stroke();

            }

            ctx.fillStyle = '#94a3b8';

            ctx.font = '7px sans-serif';

            ctx.textAlign = 'center';

            ctx.fillText(__alloT('stem.behaviorlab.canvas_food', 'FOOD'), trayX, 45);

            // Food pellet dropping animation through chute

            if (blFoodVisible) {

              var dropAge = (Date.now() - (blFoodTime || Date.now())) / 1000;

              if (dropAge < 0.5) {

                var dropProgress = Math.min(1, dropAge / 0.4);

                var chuteLength = trayY - 55;

                var dropY = 55 + chuteLength * dropProgress;

                ctx.beginPath();

                ctx.arc(trayX, dropY, 3.5, 0, Math.PI * 2);

                var dropGrad = ctx.createRadialGradient(trayX - 0.5, dropY - 1, 0.5, trayX, dropY, 3.5);

                dropGrad.addColorStop(0, '#fde68a');

                dropGrad.addColorStop(1, '#f59e0b');

                ctx.fillStyle = dropGrad;

                ctx.fill();

                // Motion trail

                if (dropProgress < 0.8) {

                  ctx.beginPath();

                  ctx.moveTo(trayX, dropY - 4);

                  ctx.lineTo(trayX - 2, dropY - 12);

                  ctx.lineTo(trayX + 2, dropY - 12);

                  ctx.closePath();

                  ctx.fillStyle = 'rgba(251,191,36,' + (0.3 * (1 - dropProgress)) + ')';

                  ctx.fill();

                }

              }

            }


            // ─ Dust motes (ambient particles) ─

            for (var dm = 0; dm < 6; dm++) {

              var dmSeed = dm * 137.5;

              var dmX = 30 + ((dmSeed + oscT * 0.008) % (W - 60));

              var dmY = 60 + Math.sin(oscT / 2000 + dm) * 30 + (dm * 30);

              if (dmY < H - 30) {

                ctx.beginPath();

                ctx.arc(dmX, dmY, 0.8, 0, Math.PI * 2);

                ctx.fillStyle = 'rgba(148, 163, 184, ' + (0.15 + Math.sin(oscT / 1500 + dm * 2) * 0.1) + ')';

                ctx.fill();

              }

            }


            // ── Phase 2: Proximity-to-lever visualization ──
            // Distance is measured in WORLD units, drawn in screen units. The same
            // number the shaping rule uses is the number on screen.
            var LEVER_CX = wx(BL_LEVER.x), LEVER_CY = BL_LEVER.y;
            var distToLever = Math.sqrt(Math.pow(blMouseX - BL_LEVER.x, 2) + Math.pow(blMouseY - BL_LEVER.y, 2));
            var prox01 = Math.max(0, Math.min(1, 1 - distToLever / BL_PROX_RANGE));

            // Dashed line from mouse to lever (Levels 1,2,6 — where approach matters)
            if (_st && _st.proxRelevant) {
              ctx.save();
              ctx.setLineDash([4, 6]);
              // Both channels lifted off the floor: at prox01 = 0 this was
              // rgb(255,0,60) and at 1 it was rgb(0,200,60), but the mid-range
              // muddied out, and the alpha put the whole cue under 2:1 on the
              // chamber wall. Brighter, and never fully drops a channel.
              var pR = Math.round(90 + 165 * (1 - prox01)), pG = Math.round(90 + 145 * prox01);
              ctx.strokeStyle = 'rgba(' + pR + ',' + pG + ',80,0.75)';
              ctx.lineWidth = 1.5;
              ctx.beginPath(); ctx.moveTo(blMouseSX, blMouseY); ctx.lineTo(LEVER_CX, LEVER_CY); ctx.stroke();
              ctx.setLineDash([]);
              // Distance label
              var midPX = (blMouseSX + LEVER_CX) / 2, midPY = (blMouseY + LEVER_CY) / 2;
              ctx.fillStyle = 'rgba(' + pR + ',' + pG + ',80,1)';
              ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
              ctx.fillText(Math.round(distToLever) + ' u', midPX, midPY - 5);
              ctx.restore();
            }

            // Proximity delta HUD (top-left)
            if (blProxDelta !== 0 && _st && _st.proxRelevant) {
              var pdCol = blProxDelta > 0 ? '#22c55e' : '#f87171';
              var pdArr = blProxDelta > 0 ? '\u2191' : '\u2193';
              ctx.fillStyle = pdCol; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'left';
              ctx.fillText(pdArr + ' ' + Math.abs(blProxDelta).toFixed(1) + 'px', 25, 35);
              ctx.fillStyle = '#94a3b8'; ctx.font = '7px sans-serif';
              ctx.fillText(__alloT('stem.behaviorlab.canvas_distance_delta', 'distance \u0394'), 25, 44);
            }

            // Movement trail (fading dots)
            if (_st && _st.trail && _st.trail.length > 2) {
              var trNow = Date.now();
              for (var tri = 0; tri < _st.trail.length; tri++) {
                var trp = _st.trail[tri];
                var trAge = (trNow - trp.t) / 2000;
                if (trAge > 1) continue;
                var trAlpha = 0.25 * (1 - trAge);
                ctx.beginPath(); ctx.arc(wx(trp.x), trp.y, 1.5 + (1 - trAge), 0, Math.PI * 2);
                // Indigo at 0.25 alpha over the chamber floor was a barely-there
                // smudge; the trail is the record of where the subject has been, so
                // it is drawn to be seen.
                ctx.fillStyle = 'rgba(148,163,255,' + (trAlpha * 2.2).toFixed(2) + ')'; ctx.fill();
              }
            }

            // ── Phase 3B: Extinction burst effects (Level 3) ──
            if (blLevel === 3 && blExtinctionPhase) {
              var burstTick = blTick - blExtinctionStart;
              if (burstTick < 12) {
                // Pulsing red border
                ctx.save();
                ctx.strokeStyle = 'rgba(239,68,68,' + (0.3 + Math.sin(oscT / 200) * 0.25).toFixed(2) + ')';
                ctx.lineWidth = 4;
                ctx.strokeRect(18, 48, W - 36, H - 65);
                // Label
                ctx.fillStyle = '#f87171'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText(__alloT('stem.behaviorlab.canvas_extinction_burst', 'EXTINCTION BURST'), W / 2, 68);
                ctx.font = '9px sans-serif'; ctx.fillStyle = '#f87171';
                ctx.fillText(blT('stem.behaviorlab.canvas_rate_spiking', 'Response rate spiking ({n} of 12 ticks)', { n: burstTick }), W / 2, 82);
                ctx.restore();
              }
            }

            // ── Phase 3D: SD/S-delta chamber tint (Level 5) ──
            if (blLevel === 5) {
              var sdAlpha = 0.06 + Math.sin(oscT / 600) * 0.02;
              ctx.fillStyle = blLightColor === 'green' ? 'rgba(34,197,94,' + sdAlpha.toFixed(3) + ')' : 'rgba(239,68,68,' + sdAlpha.toFixed(3) + ')';
              ctx.fillRect(0, 0, W, H);
              // Reminder text
              ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
              // Was 0.5 alpha over the chamber floor - about 2.4:1 for the one line that
              // tells the student what the light means.
              ctx.fillStyle = blLightColor === 'green' ? '#4ade80' : '#fca5a5';
              ctx.fillText(blLightColor === 'green' ? __alloT('stem.behaviorlab.canvas_green_reinforce', '\u2705 GREEN = Reinforce!') : __alloT('stem.behaviorlab.canvas_red_no_reinforce', '\u274C RED = Do NOT reinforce!'), W / 2, H - 10);
            }

            // ── Phase 3E: Chain overlay (Level 7) ──
            if (blLevel === 7) {
              var chainLabels = ['1\uFE0F\u20E3 Sniff', '2\uFE0F\u20E3 Rear Up', '3\uFE0F\u20E3 Press'];
              var chainPositions = [{ x: wx(120), y: 150 }, { x: wx(220), y: 110 }, { x: LEVER_CX, y: LEVER_CY }];
              for (var ci = 0; ci < 3; ci++) {
                var cp = chainPositions[ci];
                var isDone = ci < blChainStep;
                var isCurrent = ci === blChainStep;
                ctx.save();
                ctx.globalAlpha = isDone ? 0.9 : isCurrent ? 0.7 : 0.25;
                ctx.fillStyle = isDone ? '#22c55e' : isCurrent ? '#fbbf24' : '#475569';
                ctx.beginPath(); ctx.arc(cp.x, cp.y, 12, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#fff'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText(chainLabels[ci], cp.x, cp.y + 3);
                ctx.globalAlpha = 1;
                // Connecting arrow to next step
                if (ci < 2) {
                  var np = chainPositions[ci + 1];
                  ctx.strokeStyle = isDone ? 'rgba(34,197,94,0.4)' : 'rgba(71,85,105,0.2)';
                  ctx.lineWidth = 1.5; ctx.setLineDash([3, 4]);
                  ctx.beginPath(); ctx.moveTo(cp.x + 12, cp.y); ctx.lineTo(np.x - 12, np.y); ctx.stroke();
                  ctx.setLineDash([]);
                }
                ctx.restore();
              }
            }

            // ── Phase 4: Mouse shadow ──
            ctx.save();
            ctx.globalAlpha = 0.15;
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.ellipse(blMouseSX, blMouseY + 13, 18, 6, 0, 0, Math.PI * 2); ctx.fill();
            ctx.restore();

            // ─ Mouse sprite ─
            // Drawn at the SCREEN position of its world coordinate. The sprite itself
            // is not scaled — a stretched mouse is worse than a small one.

            var mx = blMouseSX;

            var my = blMouseY;

            var dir = blMouseDir || 1;


            // Action-specific animation

            var actionBounce = 0;

            var actionGlow = null;

            var walkCycle = Math.sin(oscT / 120) * 3;

            var isMoving = blMouseAction === 'explore' || blMouseAction === 'turnLeft' || blMouseAction === 'turnRight' || blMouseAction === 'halfTurn' || blMouseAction === 'approachLever' || blMouseAction === 'touchWall';

            switch (blMouseAction) {

              case 'approachLever': actionGlow = '#fbbf24'; break;

              case 'pressLever': actionGlow = '#f59e0b'; break;

              case 'spin': actionGlow = '#c084fc'; actionBounce = -3; break;

              case 'rearUp': actionBounce = -12; break;

              case 'groom': actionBounce = Math.sin(oscT / 200) * 2; break;

              case 'freeze': actionGlow = '#94a3b8'; break;

              case 'sniff': actionBounce = Math.sin(oscT / 150) * 1.5; break;

              case 'explore': actionBounce = Math.abs(walkCycle) * 0.3; break;

              default: break;

            }


            // Breathing animation

            var breathScale = 1 + Math.sin(oscT / 800) * 0.02;


            ctx.save();

            ctx.translate(mx, my);

            // Spin rotation: rotate entire mouse during spin action

            if (blMouseAction === 'spin') {

              var _spinDelay = (d.blSpeed || 1) === 3 ? 1200 : (d.blSpeed || 1) === 2 ? 2200 : 3200;

              var spinProgress = ((oscT % _spinDelay) / _spinDelay);

              ctx.rotate(spinProgress * Math.PI * 2);

            }

            ctx.scale(breathScale, breathScale);


            // Action glow

            if (actionGlow) {

              ctx.beginPath();

              ctx.ellipse(0, actionBounce - 2, 28, 18, 0, 0, Math.PI * 2);

              ctx.fillStyle = actionGlow + '33';

              ctx.fill();

            }


            // Mouse body

            ctx.beginPath();

            ctx.ellipse(0, actionBounce, 20, 11, 0, 0, Math.PI * 2);

            var bodyGrad = ctx.createRadialGradient(0, actionBounce - 4, 2, 0, actionBounce, 20);

            var breathTint = Math.sin(oscT / 800) * 8;

            var bR = Math.min(255, Math.round(212 + breathTint));

            var bG = Math.min(255, Math.round(212 + breathTint));

            var bB = Math.min(255, Math.round(216 + breathTint));

            bodyGrad.addColorStop(0, 'rgb(' + bR + ',' + bG + ',' + bB + ')');

            bodyGrad.addColorStop(1, '#9ca3af');

            ctx.fillStyle = bodyGrad;

            ctx.fill();

            ctx.strokeStyle = '#94a3b8';

            ctx.lineWidth = 0.8;

            ctx.stroke();


            // Mouse head (tracks toward lever/food)

            var headTilt = dir * 0.2;

            var headOffX = dir * 18;

            var headOffY = actionBounce - 4;

            if (blMouseAction === 'pressLever') {

              // Tilt head toward lever (right side)

              headTilt = dir * 0.35;

              headOffX = dir * 20;

            } else if (blFoodVisible) {

              // Look toward food tray (left side)

              headTilt = -dir * 0.15;

              headOffX = dir * 15;

              headOffY = actionBounce - 2;

            } else if (blMouseAction === 'sniff') {

              // Nose-down sniffing tilt

              headTilt = dir * 0.1;

              headOffY = actionBounce - 1;

            }

            ctx.beginPath();

            ctx.ellipse(headOffX, headOffY, 10, 8, headTilt, 0, Math.PI * 2);

            ctx.fillStyle = '#d4d4d8';

            ctx.fill();

            ctx.strokeStyle = '#94a3b8';

            ctx.lineWidth = 0.6;

            ctx.stroke();


            // Ears (with subtle random twitch)

            var earTwitch1 = Math.sin(oscT / 700 + blEarTwitchSeed) * 0.15;

            var earTwitch2 = Math.sin(oscT / 1100 + blEarTwitchSeed * 2.3) * 0.12;

            var earScale1 = 1 + Math.sin(oscT / 900 + blEarTwitchSeed) * 0.08;

            var earScale2 = 1 + Math.sin(oscT / 1300 + blEarTwitchSeed * 1.7) * 0.06;

            ctx.beginPath();

            ctx.ellipse(dir * 14, actionBounce - 14, 6 * earScale1, 5 * earScale1, earTwitch1, 0, Math.PI * 2);

            ctx.fillStyle = '#fca5a5';

            ctx.fill();

            ctx.beginPath();

            ctx.ellipse(dir * 22, actionBounce - 12, 5 * earScale2, 4 * earScale2, earTwitch2, 0, Math.PI * 2);

            ctx.fillStyle = '#fca5a5';

            ctx.fill();


            // Eye

            ctx.beginPath();

            ctx.arc(dir * 24, actionBounce - 5, 2, 0, Math.PI * 2);

            ctx.fillStyle = '#1e1b2e';

            ctx.fill();

            // Eye shine

            ctx.beginPath();

            ctx.arc(dir * 24.5, actionBounce - 6, 0.7, 0, Math.PI * 2);

            ctx.fillStyle = '#fff';

            ctx.fill();


            // Nose

            ctx.beginPath();

            ctx.arc(dir * 27, actionBounce - 3, 1.5, 0, Math.PI * 2);

            ctx.fillStyle = '#f472b6';

            ctx.fill();


            // Tail (enhanced speed-reactive wobble, stronger after food)

            var tailSpeedMult = blSpeed === 3 ? 1.4 : blSpeed === 2 ? 1.15 : 1;

            var tailBaseFreq = 180 / tailSpeedMult;

            var tailWag = Math.sin(oscT / tailBaseFreq) * 6;

            var isHappy = blMoodEmoji === '😊';

            var recentFood = blFoodVisible || (blFoodTime && (Date.now() - blFoodTime) < 2000);

            if (isHappy || recentFood) {

              tailWag = Math.sin(oscT / (60 / tailSpeedMult)) * 14;

            }

            if (isMoving) tailWag *= 1.3;

            ctx.beginPath();

            ctx.moveTo(-dir * 18, actionBounce);

            ctx.bezierCurveTo(

              -dir * 26, actionBounce - 10 + tailWag * 0.7,

              -dir * 33, actionBounce - 18 + tailWag,

              -dir * 40, actionBounce - 10 - tailWag * 0.5

            );

            ctx.strokeStyle = '#fca5a5';

            ctx.lineWidth = recentFood ? 2 : 1.5;

            ctx.stroke();


            // Whiskers

            for (var wi = -1; wi <= 1; wi++) {

              ctx.beginPath();

              ctx.moveTo(dir * 25, actionBounce - 3 + wi * 3);

              ctx.lineTo(dir * 36, actionBounce - 5 + wi * 5);

              ctx.strokeStyle = '#9ca3af';

              ctx.lineWidth = 0.4;

              ctx.stroke();

            }


            // Feet (small ovals) with walking animation

            if (blMouseAction !== 'rearUp') {

              var footOffset = isMoving ? walkCycle : 0;

              ctx.beginPath();

              ctx.ellipse(-8 + footOffset * 0.5, actionBounce + 10, 4, 2, 0, 0, Math.PI * 2);

              ctx.fillStyle = '#fca5a5';

              ctx.fill();

              ctx.beginPath();

              ctx.ellipse(8 - footOffset * 0.5, actionBounce + 10, 4, 2, 0, 0, Math.PI * 2);

              ctx.fillStyle = '#fca5a5';

              ctx.fill();

              // Back feet (walking offset)

              if (isMoving) {

                ctx.beginPath();

                ctx.ellipse(-5 - footOffset * 0.4, actionBounce + 11, 3, 1.5, 0, 0, Math.PI * 2);

                ctx.fillStyle = '#f9a8a8';

                ctx.fill();

                ctx.beginPath();

                ctx.ellipse(5 + footOffset * 0.4, actionBounce + 11, 3, 1.5, 0, 0, Math.PI * 2);

                ctx.fillStyle = '#f9a8a8';

                ctx.fill();

              }

            }


            ctx.restore();


            // ─ Mood emoji indicator ─

            ctx.font = '16px sans-serif';

            ctx.textAlign = 'center';

            ctx.fillText(blMoodEmoji, mx, my - 30);


            // ─ Action label ─

            var actionLabel = ACTION_LABELS[blMouseAction] || blMouseAction;

            ctx.fillStyle = ACTION_COLORS[blMouseAction] || '#94a3b8';

            ctx.font = 'bold 11px sans-serif';

            ctx.textAlign = 'center';

            // Rides above the subject rather than sitting on a fixed y=48 band. That
            // band is where the stimulus lamp lives now, and the two collided every
            // time the mouse worked near the lever — which is most of the lesson.
            ctx.fillText(actionLabel, mx, Math.max(22, my - 46));


            // ─ Tick counter ─

            ctx.fillStyle = '#94a3b8';

            ctx.font = '10px monospace';

            ctx.textAlign = 'right';

            ctx.fillText(blT('stem.behaviorlab.canvas_tick', 'Tick: {n}', { n: blTick }), W - 25, 20);

            ctx.textAlign = 'left';

            ctx.fillText(currentLevel.goal > 0
              ? blT('stem.behaviorlab.canvas_score_of', 'Score: {n}/{goal}', { n: blLevelScore, goal: currentLevel.goal })
              : blT('stem.behaviorlab.canvas_score', 'Score: {n}', { n: blLevelScore }), 25, 20);


            // ─ PAUSED overlay ─

            if (blPaused) {

              ctx.fillStyle = 'rgba(0,0,0,0.5)';

              ctx.fillRect(0, 0, W, H);

              ctx.fillStyle = '#f59e0b';

              ctx.font = 'bold 28px sans-serif';

              ctx.textAlign = 'center';

              ctx.fillText(__alloT('stem.behaviorlab.canvas_paused', '\u23F8 PAUSED'), W / 2, H / 2);

            }

          }


          // ── Cumulative Record Drawing ──

          function drawCumRecord(canvas) {

            if (!canvas) return;

            var ctx = canvas.getContext('2d');

            var W = canvas.width = canvas.offsetWidth || 420;

            var H = canvas.height = 130;

            var data = blCumRecord;


            // Background

            ctx.fillStyle = '#0f172a';

            ctx.fillRect(0, 0, W, H);


            // Title

            ctx.fillStyle = '#94a3b8';

            ctx.font = 'bold 10px sans-serif';

            ctx.textAlign = 'left';

            ctx.fillText(__alloT('stem.behaviorlab.canvas_cumulative_record', 'CUMULATIVE RECORD'), 10, 14);


            // Axes

            ctx.strokeStyle = '#475569';

            ctx.lineWidth = 1;

            ctx.beginPath();

            ctx.moveTo(35, 5);

            ctx.lineTo(35, H - 20);

            ctx.lineTo(W - 10, H - 20);

            ctx.stroke();


            // Y-axis label

            ctx.save();

            ctx.translate(10, H / 2);

            ctx.rotate(-Math.PI / 2);

            ctx.fillStyle = '#94a3b8';

            ctx.font = '8px sans-serif';

            ctx.textAlign = 'center';

            ctx.fillText(__alloT('stem.behaviorlab.canvas_axis_responses', 'Responses'), 0, 0);

            ctx.restore();


            // X-axis label

            ctx.fillStyle = '#94a3b8';

            ctx.font = '8px sans-serif';

            ctx.textAlign = 'center';

            ctx.fillText(__alloT('stem.behaviorlab.canvas_axis_time_ticks', 'Time (ticks)'), W / 2, H - 4);


            if (data.length < 2) {

              ctx.fillStyle = '#475569';

              ctx.font = '11px sans-serif';

              ctx.textAlign = 'center';

              ctx.fillText(__alloT('stem.behaviorlab.canvas_waiting_for_data', 'Waiting for data\u2026'), W / 2, H / 2);

              return;

            }


            // Draw line

            var maxCum = Math.max(data[data.length - 1].cum, 5);

            var plotW = W - 50;

            var plotH = H - 35;

            var startTick = data[0].tick;

            var endTick = data[data.length - 1].tick;

            var tickRange = Math.max(endTick - startTick, 1);

            // Response-count gridlines + tick labels — a cumulative record is
            // read by its SLOPE (response rate); reference levels make the rate
            // legible. Cosmetic only; the plotted data is unchanged.
            ctx.font = '8px sans-serif'; ctx.textAlign = 'right';
            for (var _gl = 1; _gl <= 4; _gl++) {
              var _gc = maxCum * _gl / 4, _gy = (H - 25) - (_gc / maxCum) * plotH;
              ctx.strokeStyle = 'rgba(71,85,105,0.3)'; ctx.lineWidth = 0.75;
              ctx.beginPath(); ctx.moveTo(40, _gy); ctx.lineTo(W - 10, _gy); ctx.stroke();
              ctx.fillStyle = '#64748b'; ctx.fillText(Math.round(_gc), 36, _gy + 3);
            }


            ctx.beginPath();

            ctx.strokeStyle = '#f59e0b';

            ctx.lineWidth = 2;

            for (var i = 0; i < data.length; i++) {

              var px = 40 + ((data[i].tick - startTick) / tickRange) * plotW;

              var py = (H - 25) - (data[i].cum / maxCum) * plotH;

              if (i === 0) ctx.moveTo(px, py);

              else ctx.lineTo(px, py);

            }

            ctx.stroke();


            // Extinction burst markers (red zone on graph)

            if (blLevel === 3 && blExtinctionPhase) {

              for (var bi = 0; bi < data.length; bi++) {

                if (data[bi].burst) {

                  var bpx = 40 + ((data[bi].tick - startTick) / tickRange) * plotW;

                  ctx.beginPath();

                  ctx.moveTo(bpx, 20); ctx.lineTo(bpx, H - 20);

                  ctx.strokeStyle = 'rgba(239,68,68,0.15)';

                  ctx.lineWidth = 4;

                  ctx.stroke();

                }

              }

              // Burst label

              ctx.fillStyle = '#f87171';

              ctx.font = 'bold 8px sans-serif';

              ctx.textAlign = 'center';

              var burstLabelX = W * 0.7;

              ctx.fillText(__alloT('stem.behaviorlab.canvas_extinction_burst_up', 'EXTINCTION BURST ↑'), burstLabelX, 28);

            }


            // Reinforcement marks. Drawn from recorded DELIVERIES, so on FR-3 there
            // is one mark per three responses — which is the level's whole lesson,
            // and is what makes the schedule readable off this chart at all. Same
            // convention as the Schedule Sleuth chart: a tick under the line where
            // the reinforcer landed.
            var reinfMarks = 0;
            for (var ri = 0; ri < data.length; ri++) {
              if (!data[ri].reinf) continue;
              reinfMarks++;
              var rpx = 40 + ((data[ri].tick - startTick) / tickRange) * plotW;
              var rpy = (H - 25) - (data[ri].cum / maxCum) * plotH;
              ctx.strokeStyle = 'rgba(34,197,94,0.75)'; ctx.lineWidth = 1.5;
              ctx.beginPath(); ctx.moveTo(rpx, rpy - 8); ctx.lineTo(rpx, rpy + 8); ctx.stroke();
              ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.arc(rpx, rpy, 3, 0, Math.PI * 2); ctx.fill();
            }
            if (reinfMarks > 0) {
              ctx.fillStyle = '#4ade80'; ctx.font = '7px sans-serif'; ctx.textAlign = 'left';
              ctx.fillText(blLevel === 4
                ? 'Green = pellet delivered (one per ' + BL_FR_RATIO + ' presses on FR-' + BL_FR_RATIO + ')'
                : 'Green = pellet delivered', 42, H - 8);
            }

            // Data point dots

            ctx.fillStyle = '#fbbf24';

            for (var j = Math.max(0, data.length - 30); j < data.length; j++) {

              var dpx = 40 + ((data[j].tick - startTick) / tickRange) * plotW;

              var dpy = (H - 25) - (data[j].cum / maxCum) * plotH;

              ctx.beginPath();

              ctx.arc(dpx, dpy, 2, 0, Math.PI * 2);

              ctx.fill();

            }


            // Response rate

            if (data.length > 5) {

              var recentData = data.slice(-10);

              var recentResponses = recentData[recentData.length - 1].cum - recentData[0].cum;

              var recentTicks = recentData[recentData.length - 1].tick - recentData[0].tick;

              var rate = recentTicks > 0 ? (recentResponses / recentTicks * 60 / 1.5).toFixed(1) : '0.0';

              ctx.fillStyle = '#fbbf24';

              ctx.font = 'bold 9px sans-serif';

              ctx.textAlign = 'right';

              ctx.fillText(blT('stem.behaviorlab.canvas_rate_per_min', 'Rate: {n} resp/min', { n: rate }), W - 15, 14);

            }

          }


          // ── Keyboard shortcut: Spacebar to deliver food ──
          if (!window._blKeyHandler) {
            window._blKeyHandler = function (e) {
              var target = e.target || {};
              var tag = target.tagName || '';
              var interactive = ['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT', 'SUMMARY', 'A'].indexOf(tag) >= 0 || target.isContentEditable;
              if (e.code === 'Space' && !interactive) {
                if (typeof window._blReinforceFn !== 'function') return; // lab not running — never hijack Space app-wide
                if (!document.getElementById('bl-chamber-canvas')) return; // lab not on screen
                e.preventDefault();
                window._blReinforceFn();
              }
            };
            document.addEventListener('keydown', window._blKeyHandler);
          }
          window._blReinforceFn = (blLastAction && blPhase === 'running' && blLevel !== 8 && blLevel !== 9) ? reinforceAction : null;
          window._blAdvanceTickFn = advanceTick; // live rebind — the tick interval must never call a stale closure (same fix class as dataRef above)

          // ── Render cumulative record canvas (not rAF — only needs tick-rate updates) ──
          setTimeout(function () {
            var cumCv = document.getElementById('bl-cumrecord-canvas');
            drawCumRecord(cumCv);
          }, 0);

          // ── Tick timer (independent of canvas rendering) ──
          React.useEffect(function() {
            if (blPhase !== 'running' || blPaused) {
              if (_blTickTimer.current) { clearInterval(_blTickTimer.current); _blTickTimer.current = null; }
              return;
            }
            var tickDelay = (d.blSpeed || 1) === 3 ? 2000 : (d.blSpeed || 1) === 2 ? 3500 : 5000;
            if (_blTickTimer.current) clearInterval(_blTickTimer.current);
            _blTickTimer.current = setInterval(function() { (window._blAdvanceTickFn || advanceTick)(); }, tickDelay);
            return function() { if (_blTickTimer.current) { clearInterval(_blTickTimer.current); _blTickTimer.current = null; } };
          }, [blPhase, blPaused, d.blSpeed]);


          // ── Weight bar chart data ──

          var sortedWeights = Object.keys(blWeights).map(function (k) {

            return { action: k, weight: blWeights[k], isTarget: k === blTargetBehavior };

          }).sort(function (a, b) { return b.weight - a.weight; });


          var maxWeight = Math.max.apply(null, sortedWeights.map(function (w) { return w.weight; }));


          // ═══════════ RENDER ═══════════

          // Intro Phase

          if (blPhase === 'intro') {

            return React.createElement("div", { className: "behaviorlab-tool-shell behaviorlab-intro space-y-4", role: "main", "aria-label": __alloT('stem.behaviorlab.behavior_lab', "Behavior Lab"), "data-behaviorlab-tool": "intro" },

              // Skip navigation
              React.createElement("a", { href: "#behaviorlab-main", className: "sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg" }, __alloT('stem.behaviorlab.skip_to_main_content', "Skip to main content")),

              // Header
              React.createElement("h2", { id: "behaviorlab-main", className: "sr-only" }, blT('stem.behaviorlab.h_lab_level', 'Behaviour Lab — level {n}', { n: blLevel })),

              // Hero header \u2014 matches the design system shipped on
              // School Behavior Toolkit, Disability Voices, TypingPractice
              // drill-intro, PrintingPress hero. Amber accent to signal
              // "this is the science / Skinner-box space" \u2014 distinct from
              // the teal of School Behavior Toolkit and the pink of
              // Disability Voices. Three connected spaces, three accents.
              React.createElement("div", {
                className: "behaviorlab-command", "data-behaviorlab-command": "true",
                style: {
                  display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14, flexWrap: 'wrap',
                  padding: '14px 16px',
                  borderRadius: 14,
                  background: 'radial-gradient(ellipse 60% 100% at 0% 50%, rgba(251,191,36,0.10), transparent 70%), rgba(15,23,42,0.45)',
                  border: '1px solid rgba(251,191,36,0.25)',
                  borderLeft: '4px solid #fbbf24'
                }
              },
                React.createElement("button", {
                  onClick: function () { setStemLabTool(null); },
                  'aria-label': __alloT('stem.behaviorlab.back_to_stem_lab', 'Back to STEAM Lab'),
                  style: {
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid var(--bl-border)',
                    borderRadius: 8, padding: '6px 10px',
                    cursor: 'pointer', color: 'var(--bl-text)', fontSize: 14, flexShrink: 0
                  }
                }, '\u2190'),
                // Circular accent hero badge \u2014 56px hero size matches
                // School Behavior Toolkit + Disability Voices + TypingPractice
                React.createElement("div", { 'aria-hidden': 'true',
                  style: {
                    width: 56, height: 56, borderRadius: '50%',
                    background: 'rgba(251,191,36,0.18)',
                    border: '2px solid #fbbf24',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 28, lineHeight: 1, flexShrink: 0,
                    boxShadow: '0 4px 16px rgba(251,191,36,0.25)'
                  }
                }, '\uD83D\uDC2D'),
                React.createElement("div", { style: { flex: 1, minWidth: 240 } },
                  React.createElement("div", { style: { display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 4 } },
                    React.createElement("h2", { style: { margin: 0, color: '#fbbf24', fontSize: 22, fontWeight: 900, letterSpacing: '-0.01em' } }, __alloT('stem.behaviorlab.h_behavior_lab', 'Behavior Lab')),
                    // Level chip \u2014 replaces the old single-line subtitle with
                    // a tabular-nums chip that reads at a glance
                    React.createElement("span", { style: {
                      padding: '2px 8px', borderRadius: '999rem',
                      background: 'rgba(251,191,36,0.12)',
                      border: '1px solid rgba(251,191,36,0.40)',
                      color: 'var(--bl-amber-text)', fontSize: 10, fontWeight: 700,
                      fontFamily: 'ui-monospace, Menlo, monospace'
                    } }, blT('stem.behaviorlab.level_of_total', 'Level {n} / {total}', { n: blLevel, total: LEVELS.length }))
                  ),
                  React.createElement("div", { style: { height: 3, width: 48, borderRadius: '999rem', marginBottom: 6, background: 'linear-gradient(90deg, #fbbf24, #f59e0b)' } }),
                  React.createElement("div", { style: { fontSize: 12, color: 'var(--bl-text)', fontWeight: 600, lineHeight: 1.5 } },
                    currentLevel.title + ' \u2014 ', React.createElement("span", { style: { color: 'var(--bl-muted)', fontStyle: 'italic' } }, currentLevel.concept)
                  )
                )
              ),

              // Level select

              React.createElement("section", { className: "behaviorlab-metrics", "data-behaviorlab-mission": "true", "aria-label": __alloT('stem.behaviorlab.experiment_status', 'Experiment status') },
                [
                  { label: __alloT('stem.behaviorlab.current_concept', 'Current concept'), value: currentLevel.concept },
                  { label: __alloT('stem.behaviorlab.path_progress', 'Path progress'), value: blCompletedLevels.length + ' / ' + LEVELS.length + ' complete' },
                  { label: __alloT('stem.behaviorlab.data_points', 'Data points'), value: blCumRecord.length + ' recorded' },
                  { label: __alloT('stem.behaviorlab.lab_status', 'Lab status'), value: blPhase === 'intro' ? 'Ready to begin' : blPhase }
                ].map(function(metric) {
                  return React.createElement("div", { key: metric.label, className: "behaviorlab-metric" },
                    React.createElement("span", { className: "behaviorlab-metric-label" }, metric.label),
                    React.createElement("span", { className: "behaviorlab-metric-value", title: metric.value }, metric.value)
                  );
                })
              ),

              React.createElement("section", { className: "behaviorlab-level-section", "aria-labelledby": "behaviorlab-level-path" },
                React.createElement("div", { className: "behaviorlab-level-heading" },
                  React.createElement("div", null,
                    React.createElement("h3", { id: "behaviorlab-level-path" }, __alloT('stem.behaviorlab.choose_experiment', 'Choose an experiment')),
                    React.createElement("p", null, __alloT('stem.behaviorlab.experiment_path_help', 'Build from reinforcement fundamentals toward schedules, chaining, DRO, and classical conditioning.'))
                  ),
                  React.createElement("span", { className: "behaviorlab-level-progress" }, blT('stem.behaviorlab.level_of_total', 'Level {n} / {total}', { n: blLevel, total: LEVELS.length }))
                ),

              React.createElement("div", { className: "behaviorlab-level-grid", role: "group", "aria-label": __alloT('stem.behaviorlab.experiment_levels', 'Experiment levels') },

                LEVELS.map(function (lvl) {

                  var unlocked = lvl.id === 1 || blCompletedLevels.indexOf(lvl.id - 1) >= 0 || lvl.id === 6;

                  var isCurrent = lvl.id === blLevel;

                  var isComplete = blCompletedLevels.indexOf(lvl.id) >= 0;

                  return React.createElement("button", { "aria-label": __alloT('stem.behaviorlab.select_level_label', 'Select level ') + lvl.id + ": " + lvl.title,

                    "aria-current": isCurrent ? "step" : undefined, "aria-pressed": isCurrent,

                    key: lvl.id,

                    disabled: !unlocked,

                    onClick: function () {

                      upd('blLevel', lvl.id);

                      upd('blPhase', 'intro');

                      upd('blLevelScore', 0);

                      upd('blTick', 0);

                      upd('blHistory', []);

                      upd('blCumRecord', []);

                      upd('blAbcLog', []);

                      upd('blWeights', Object.assign({}, defaultWeights));

                      upd('blExtinctionPhase', false);

                      upd('blScheduleCount', 0);
                      upd('blFrPresses', 0);

                      upd('blLightColor', 'green');

                    },

                    className: 'behaviorlab-level-card rounded-lg text-xs font-bold transition-all ' +

                      (isCurrent ? 'bg-amber-700 text-white shadow-lg shadow-amber-500/30' :

                        isComplete ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50' :

                          unlocked ? 'transition-colors bg-slate-700 text-slate-100 hover:bg-slate-600 active:scale-[0.97]' :

                            'bg-slate-800 text-slate-200 cursor-not-allowed')

                  }, (isComplete ? '\u2705 ' : '') + lvl.id + '. ' + lvl.title);

                })

              )
              ),

              // Intro card

              React.createElement("div", { className: "behaviorlab-intro-card bg-gradient-to-br from-amber-900/40 to-orange-900/30 border border-amber-500/30 rounded-2xl p-6 space-y-3", "data-behaviorlab-workspace": "intro" },

                React.createElement("h3", { className: "text-base font-extrabold text-amber-300" }, "\uD83C\uDFAF " + currentLevel.concept),

                React.createElement("p", { className: "text-sm text-slate-100 leading-relaxed" }, currentLevel.intro),

                // \u2500\u2500 Scope \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
                // The tool had no statement of what it does and does not qualify
                // anyone to do, while offering an FBA trainer, a BIP builder and a
                // crisis-adjacent scenario bank, and telling a perfect scorer they
                // were "ready for real FBA case work". Its audience includes
                // trainees and general-education staff, and a confident untrained
                // user running an FBA drives real BIP, restraint and IEP decisions.
                // Stated once, on the way in, rather than buried in a panel nobody
                // opens. \u2605 AARON TO RED-PEN THE WORDING \u2014 no AI-authored clinical
                // framing should ship to a pilot unreviewed.
                React.createElement("p", {
                  className: "text-[11px] leading-relaxed",
                  style: { color: 'var(--bl-muted)', borderLeft: '3px solid var(--bl-amber)', paddingLeft: 10, margin: '2px 0 0' }
                }, __alloT('stem.behaviorlab.scope_note', 'This lab teaches the concepts of behaviour analysis. It does not qualify anyone to run a functional behaviour assessment or write a behaviour plan \u2014 that is supervised professional work, and the function of a real behaviour is a hypothesis you test with data, not a label you read off a description.')),

                React.createElement("div", { className: "bg-slate-800/60 rounded-xl p-3 border border-slate-600/40" },

                  React.createElement("p", { className: "text-xs text-amber-200 font-bold mb-1" }, __alloT('stem.behaviorlab.key_term', "\uD83D\uDCD6 Key Term:")),

                  React.createElement("p", { className: "text-xs text-slate-100 italic" }, currentLevel.termDef)

                ),

                currentLevel.goal > 0 && React.createElement("p", { className: "text-xs text-amber-400 font-bold" },

                  (blLevel === 3
                    ? __alloT('stem.behaviorlab.goal_l3', '\uD83C\uDFAF Goal: reinforce 5 lever presses, then stop and observe.')
                    : blT('stem.behaviorlab.goal_n_responses', '\uD83C\uDFAF Goal: get {n} {target} responses.', { n: currentLevel.goal, target: blTargetBehavior }))),


                // ── AI Tutor: classroom example at my reading level ──
                // Gated on the house AI switch. This panel is teacher-initiated, but
                // "a teacher has to click it" is not the guarantee "the school turned
                // AI off" is meant to give: with the switch off there was still a live
                // button here sending prompts, which is the one thing the switch
                // exists to prevent. Zero traffic and no affordance when it is off.
                blAiOn && (function () {

                  var aiLevel = d.aiLevel || 'grade5';

                  var aiText = d['aiExplain_' + blLevel] || '';

                  var aiLoading = !!d['aiLoading_' + blLevel];

                  var aiError = d['aiError_' + blLevel] || '';

                  var LEVELS = [

                    { id: 'plain', label: __alloT('stem.behaviorlab.plain', 'Plain'), hint: __alloT('stem.behaviorlab.using_simple_everyday_words_and_short_', 'using simple everyday words and short sentences, no jargon') },

                    { id: 'grade5', label: __alloT('stem.behaviorlab.grade_5', 'Grade 5'), hint: __alloT('stem.behaviorlab.for_a_5th_grade_student_with_a_concret', 'for a 5th grade student, with a concrete classroom or family example') },

                    { id: 'hs', label: __alloT('stem.behaviorlab.high_school', 'High School'), hint: __alloT('stem.behaviorlab.for_a_high_school_psychology_student', 'for a high school psychology student') },

                    { id: 'prof', label: 'Pro', hint: __alloT('stem.behaviorlab.for_a_new_school_psychologist_or_bcba_', 'for a new school psychologist or BCBA trainee, using accurate technical language') }

                  ];

                  function explain() {

                    if (typeof callGemini !== 'function') { upd('aiError_' + blLevel, 'AI tutor not available.'); return; }

                    upd('aiLoading_' + blLevel, true); upd('aiError_' + blLevel, ''); upd('aiExplain_' + blLevel, '');

                    var lv = LEVELS.find(function (L) { return L.id === aiLevel; }) || LEVELS[1];

                    var prompt = 'Explain the behavior analysis concept "' + currentLevel.concept + '" ' + lv.hint + '. '

                      + 'Context: ' + (currentLevel.intro || '') + ' Definition: ' + (currentLevel.termDef || '') + '. '

                      + 'In 3 short sentences: (1) What the concept means in everyday terms. (2) A concrete classroom or everyday example. (3) One common misconception to watch out for. '

                      + 'No markdown, no bullets, no headings. Plain prose only.';

                    callGemini(prompt, false, false, 0.5).then(function (resp) {

                      upd('aiExplain_' + blLevel, String(resp || '').trim());

                      upd('aiLoading_' + blLevel, false);

                      if (announceToSR) announceToSR(__alloT('stem.behaviorlab.sr_explanation_ready', 'Explanation ready.'));

                    }).catch(function () {

                      upd('aiLoading_' + blLevel, false);

                      upd('aiError_' + blLevel, 'Could not reach AI tutor. Try again in a moment.');

                    });

                  }

                  return React.createElement("div", { className: "bg-slate-800/60 rounded-xl p-3 border border-purple-500/40 mt-2", role: "region", "aria-label": __alloT('stem.behaviorlab.ai_behavior_analysis_tutor', "AI behavior-analysis tutor") },

                    React.createElement("div", { className: "flex items-center flex-wrap gap-2 mb-1.5" },

                      React.createElement("span", { className: "text-xs font-bold text-purple-300" }, __alloT('stem.behaviorlab.explain_at_my_level', "\u2728 Explain at my level")),

                      React.createElement("div", { className: "ml-auto flex gap-1", role: "group", "aria-label": __alloT('stem.behaviorlab.reading_level', "Reading level") },

                        LEVELS.map(function (L) {

                          var active = aiLevel === L.id;

                          return React.createElement("button", {

                            key: L.id,

                            onClick: function () { upd('aiLevel', L.id); },

                            "aria-label": __alloT('stem.behaviorlab.reading_level_label', 'Reading level: ') + L.label + (active ? __alloT('stem.behaviorlab.suffix_selected', ' (selected)') : ''),

                            "aria-pressed": active,

                            className: "px-2 py-0.5 rounded text-[10px] font-bold " + (active ? 'bg-purple-600 text-white' : 'transition-colors bg-slate-700 text-purple-200 hover:bg-slate-600 border border-purple-500/30 active:scale-[0.97]')

                          }, L.label);

                        })

                      ),

                      React.createElement("button", {

                        onClick: explain,

                        disabled: aiLoading,

                        "aria-label": __alloT('stem.behaviorlab.generate_ai_at', 'Generate AI explanation at ') + ((LEVELS.find(function (L) { return L.id === aiLevel; }) || {}).label || 'Grade 5') + " level",

                        className: "transition-colors px-2.5 py-1 rounded text-[11px] font-bold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 active:scale-[0.97]"

                      }, aiLoading ? '\u23F3 Thinking...' : (aiText ? __alloT('stem.behaviorlab.re_explain', '\uD83D\uDD04 Re-explain') : __alloT('stem.behaviorlab.explain_btn', '\uD83E\uDDE0 Explain')))

                    ),

                    aiError && React.createElement("p", { className: "text-[11px] text-rose-400", role: "alert" }, aiError),

                    aiText && React.createElement("p", { className: "text-xs text-slate-100 leading-relaxed bg-slate-900/50 rounded-lg p-2 border border-purple-500/20" }, aiText),

                    !aiText && !aiLoading && !aiError && React.createElement("p", { className: "text-[11px] italic text-slate-400" }, __alloT('stem.behaviorlab.click_explain_for_a_classroom_example_', "Click \u201CExplain\u201D for a classroom example of this concept at your chosen reading level."))

                  );

                })()

              ),

              // Start button

              React.createElement("button", { "aria-label": __alloT('stem.behaviorlab.start_experiment', "Start Experiment"),

                onClick: function () {

                  upd('blPhase', 'running');

                  upd('blTick', 0);

                  upd('blHistory', []);

                  upd('blCumRecord', []);

                  upd('blAbcLog', []);

                  upd('blLevelScore', 0);

                  upd('blWeights', Object.assign({}, defaultWeights));

                  upd('blFoodVisible', false);

                  upd('blMouseX', 200);

                  upd('blMouseY', 180);

                  upd('blExtinctionPhase', false);

                  upd('blScheduleCount', 0);
                  upd('blFrPresses', 0);

                  upd('blLightColor', 'green');

                  // Reset classical conditioning state (Level 9)

                  upd('blCcPhase', 'baseline');

                  upd('blAssocStrength', 0);

                  upd('blPairCount', 0);

                  upd('blBellRinging', false);

                  upd('blSalivating', false);

                  upd('blCcExtTrials', 0);

                  upd('blBellTime', 0);

                },

                className: "w-full py-3 rounded-xl bg-gradient-to-r from-amber-700 to-orange-700 text-white font-extrabold text-base shadow-lg shadow-amber-500/30 hover:from-amber-700 hover:to-orange-700 transition-all hover:scale-[1.02]"

              }, __alloT('stem.behaviorlab.start_experiment_2', "\uD83D\uDE80 Start Experiment")),

              // \u2550\u2550 REINFORCEMENT INQUIRY widget (H7b'') \u2550\u2550
              React.createElement("details", { className: "behaviorlab-advanced", open: !!d.blShowInquiry, onToggle: function(e) { if (!!d.blShowInquiry !== e.currentTarget.open) upd('blShowInquiry', e.currentTarget.open); } },
                React.createElement("summary", null, __alloT('stem.behaviorlab.advanced_reinforcement_inquiry', 'Advanced inquiry: predict persistence')),
                React.createElement("div", { className: "behaviorlab-advanced-body" },
              (function() {
                var iq = d.reinforceIQ || { schedule: 'FR3', reinforcerStrength: 5, alternativeReward: 3, extinctionTime: 5, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
                var setIQ = function(patch) { upd('reinforceIQ', Object.assign({}, iq, patch)); };
                var setKey = function(k, v) { var p = {}; p[k] = v; setIQ(p); };
                var persistence = (iq.schedule === 'CRF' ? 2 : iq.schedule === 'FR3' ? 5 : iq.schedule === 'VR5' ? 8 : iq.schedule === 'FI30' ? 4 : 7) + iq.reinforcerStrength * 0.5 - iq.alternativeReward * 0.5;
                var extinctionResistance = (iq.schedule === 'CRF' ? 1 : iq.schedule === 'FR3' ? 3 : iq.schedule === 'VR5' ? 9 : iq.schedule === 'FI30' ? 4 : 8);
                var state = persistence > 9 ? 'addictive' : persistence > 6 ? 'durable' : persistence > 4 ? 'moderate' : persistence > 2 ? 'fragile' : 'extinguishing'; // i18n-exempt: lookup key, not display text
                // ★ NOT translatable: `state` is the KEY into the `sm` lookup below,
                // not text anyone sees. A translated value makes that lookup undefined
                // and the next line throws. The visible labels live in `sm`.
                var sm = ({
                  addictive: { label: __alloT('stem.behaviorlab.addictive_pattern', 'Addictive pattern'), color: '#f87171', bg: '#2a0a0a', border: '#dc2626', desc: __alloT('stem.behaviorlab.vr_schedule_strong_reinforcer_no_alter', 'VR schedule + strong reinforcer + no alternative = gambling/scrolling pattern. Hardest to extinguish.') },
                  durable: { label: __alloT('stem.behaviorlab.durable_habit', 'Durable habit'), color: '#facc15', bg: '#2a2410', border: '#eab308', desc: __alloT('stem.behaviorlab.behavior_persists_through_occasional_n', 'Behavior persists through occasional non-reinforcement. Typical of well-trained skills.') },
                  moderate: { label: __alloT('stem.behaviorlab.moderate_persistence', 'Moderate persistence'), color: '#22d3ee', bg: '#0a1f2e', border: '#0891b2', desc: __alloT('stem.behaviorlab.standard_reinforcement_behavior_mainta', 'Standard reinforcement; behavior maintained while contingency holds.') },
                  fragile: { label: __alloT('stem.behaviorlab.fragile', 'Fragile'), color: '#fb923c', bg: '#2a1a0a', border: '#ea580c', desc: __alloT('stem.behaviorlab.crf_or_low_strength_alternatives_avail', 'CRF or low strength + alternatives available. Extinction begins quickly when reinforcement stops.') },
                  extinguishing: { label: __alloT('stem.behaviorlab.already_extinguishing', 'Already extinguishing'), color: '#94a3b8', bg: '#1e293b', border: '#475569', desc: __alloT('stem.behaviorlab.reinforcer_too_weak_vs_alternative_beh', 'Reinforcer too weak vs alternative \u2014 behavior dropping in frequency right now.') }
                })[state];
                return React.createElement("div", { style: { marginTop: 14, padding: 12, borderRadius: 12, background: sm.bg, border: '1px solid ' + sm.border, color: '#e8f0f5' } },
                  React.createElement("h4", { style: { margin: '0 0 4px', fontSize: 12, fontWeight: 800, color: sm.color, textTransform: 'uppercase', letterSpacing: 1 } }, __alloT('stem.behaviorlab.reinforcement_inquiry_predict_persiste', '\uD83D\uDD2C Reinforcement Inquiry \u2014 Predict Persistence')),
                  React.createElement("p", { style: { margin: '0 0 6px', fontSize: 10, opacity: 0.85, lineHeight: 1.4 } }, __alloT('stem.behaviorlab.set_schedule_reinforcer_strength_alter', 'Set schedule, reinforcer strength, alternatives, extinction time. Predict the persistence band. No score, no reveal.')),
                  React.createElement("div", { style: { display: 'inline-block', padding: '3px 8px', borderRadius: '999rem', background: sm.color, color: '#000', fontSize: 10, fontWeight: 800, marginBottom: 6 } }, sm.label + ' \u00B7 persist ' + persistence.toFixed(1) + ' \u00B7 ext-resist ' + extinctionResistance),
                  React.createElement("p", { style: { margin: '0 0 6px', fontSize: 10, opacity: 0.8 } }, sm.desc),
                  React.createElement("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 } },
                    ['CRF', 'FR3', 'VR5', 'FI30', 'VI30'].map(function(sch) {
                      var active = iq.schedule === sch;
                      return React.createElement("button", { key: sch, onClick: function() { setKey('schedule', sch); }, style: { padding: '3px 8px', fontSize: 10, fontWeight: 700, borderRadius: 4, border: '1px solid ' + (active ? sm.color : '#1e293b'), background: active ? sm.color : '#0a0a1a', color: active ? '#000' : '#94a3b8', cursor: 'pointer' } }, sch);
                    })
                  ),
                  React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 8 } },
                    React.createElement("label", { style: { fontSize: 10 } },
                      React.createElement("div", { style: { marginBottom: 2 } }, __alloT('stem.behaviorlab.strength', 'Strength '), React.createElement("span", { style: { color: sm.color, fontFamily: 'monospace' } }, iq.reinforcerStrength)),
                      React.createElement("input", { type: 'range', min: 1, max: 10, step: 1, value: iq.reinforcerStrength, onChange: function(e) { setKey('reinforcerStrength', parseInt(e.target.value, 10)); }, style: { width: '100%' } })
                    ),
                    React.createElement("label", { style: { fontSize: 10 } },
                      React.createElement("div", { style: { marginBottom: 2 } }, __alloT('stem.behaviorlab.alternative', 'Alternative '), React.createElement("span", { style: { color: sm.color, fontFamily: 'monospace' } }, iq.alternativeReward)),
                      React.createElement("input", { type: 'range', min: 0, max: 10, step: 1, value: iq.alternativeReward, onChange: function(e) { setKey('alternativeReward', parseInt(e.target.value, 10)); }, style: { width: '100%' } })
                    ),
                    React.createElement("label", { style: { fontSize: 10 } },
                      React.createElement("div", { style: { marginBottom: 2 } }, __alloT('stem.behaviorlab.ext_time', 'Ext time '), React.createElement("span", { style: { color: sm.color, fontFamily: 'monospace' } }, iq.extinctionTime)),
                      React.createElement("input", { type: 'range', min: 0, max: 30, step: 1, value: iq.extinctionTime, onChange: function(e) { setKey('extinctionTime', parseInt(e.target.value, 10)); }, style: { width: '100%' } })
                    )
                  ),
                  React.createElement("div", { style: { display: 'flex', gap: 6, marginBottom: 6 } },
                    React.createElement("button", { onClick: function() {
                      var t = new Date().toISOString().slice(11, 19);
                      setIQ({ log: iq.log.concat([{ t: t, s: iq.schedule, str: iq.reinforcerStrength, alt: iq.alternativeReward, ext: iq.extinctionTime, p: persistence.toFixed(1), state: sm.label }]) });
                    }, style: { flex: 1, padding: 4, fontSize: 10, fontWeight: 700, borderRadius: 4, border: '1px solid ' + sm.border, background: sm.bg, color: sm.color, cursor: 'pointer' } }, __alloT('stem.behaviorlab.log', '\uD83D\uDCCB Log')),
                    React.createElement("button", { onClick: function() { setIQ({ schedule: 'FR3', reinforcerStrength: 5, alternativeReward: 3, extinctionTime: 5 }); }, style: { padding: '4px 8px', fontSize: 10, borderRadius: 4, border: '1px solid #1e293b', background: '#0a0a1a', color: '#94a3b8', cursor: 'pointer' } }, __alloT('stem.behaviorlab.reset', 'Reset'))
                  ),
                  iq.log.length > 0 && React.createElement("div", { style: { maxHeight: 60, overflow: 'auto', padding: 4, borderRadius: 4, background: '#0a0a1a', border: '1px solid #1e293b', marginBottom: 6, fontSize: 9, fontFamily: 'monospace', lineHeight: 1.4 } },
                    iq.log.slice(-5).map(function(e, i) { return React.createElement("div", { key: i }, e.t + '  ' + e.state + ' \u00B7 ' + e.s + ' str' + e.str + ' alt' + e.alt + ' \u2192 ' + e.p); })
                  ),
                  React.createElement("label", { htmlFor: 'behaviorlab-hypothesis', style: { display: 'block', fontSize: 10, fontWeight: 700, opacity: 0.85, marginBottom: 3 } }, __alloT('stem.behaviorlab.your_hypothesis_why_does_vr_resist_ext', 'Your hypothesis (why does VR resist extinction so much?)')),
                  React.createElement("textarea", { id: 'behaviorlab-hypothesis', value: iq.hypothesis, onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, rows: 2, placeholder: __alloT('stem.behaviorlab.e_g_vr_makes_every_action_potentially_', 'e.g., VR makes every action potentially the rewarded one \u2014 extinction never feels conclusive...'), style: { width: '100%', padding: 4, borderRadius: 4, border: '1px solid ' + sm.border, background: '#0a0a1a', color: '#e8f0f5', fontSize: 10, marginBottom: 6, resize: 'vertical' } }),
                  !iq.stuckRevealed && React.createElement("button", { onClick: function() { setIQ({ stuckRevealed: true }); }, style: { padding: '4px 8px', fontSize: 10, fontWeight: 700, borderRadius: 4, border: '1px solid #1e293b', background: '#0a0a1a', color: sm.color, cursor: 'pointer', marginBottom: 6 } }, __alloT('stem.behaviorlab.i_m_stuck_show_open_questions', "\uD83E\uDD14 I'm stuck \u2014 show open questions")),
                  iq.stuckRevealed && React.createElement("div", { style: { padding: 6, borderRadius: 4, background: '#0a0a1a', border: '1px dashed ' + sm.border, fontSize: 10, marginBottom: 6, lineHeight: 1.5 } },
                    React.createElement("div", { style: { fontWeight: 700, color: sm.color, marginBottom: 3 } }, __alloT('stem.behaviorlab.open_questions_no_answer_key', 'Open questions (no answer key)')),
                    React.createElement("ul", { style: { margin: 0, paddingLeft: 14 } },
                      React.createElement("li", null, __alloT('stem.behaviorlab.why_is_vr_variable_ratio_the_schedule_', 'Why is VR (variable ratio) the schedule behind slot machines + scrolling apps?')),
                      React.createElement("li", null, __alloT('stem.behaviorlab.when_does_adding_an_alternative_reinfo', 'When does adding an alternative reinforcer FASTER extinguish a behavior than just removing the original?')),
                      React.createElement("li", null, __alloT('stem.behaviorlab.what_pattern_of_responding_shows_durin', 'What pattern of responding shows during an FI (fixed interval) schedule? Why "scalloping"?')),
                      React.createElement("li", null, __alloT('stem.behaviorlab.how_does_extinction_time_interact_with', 'How does extinction TIME interact with schedule type? (Hint: partial reinforcement extinction effect.)'))
                    )
                  ),
                  React.createElement("label", { style: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, cursor: 'pointer', marginBottom: 4 } },
                    React.createElement("input", { type: 'checkbox', checked: iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); } }),
                    React.createElement("span", null, __alloT('stem.behaviorlab.i_can_explain_why_this_schedule_streng', 'I can explain why this schedule + strength + alternative yields this persistence band.'))
                  ),
                  iq.understood && React.createElement("textarea", { id: 'behaviorlab-explanation', 'aria-label': __alloT('stem.behaviorlab.explanation_label', 'Explain your prediction'), value: iq.explanation, onChange: function(e) { setIQ({ explanation: e.target.value }); }, rows: 2, placeholder: __alloT('stem.behaviorlab.explain_in_your_own_words', 'Explain in your own words...'), style: { width: '100%', padding: 4, borderRadius: 4, border: '1px solid ' + sm.border, background: '#0a0a1a', color: '#e8f0f5', fontSize: 10, marginBottom: 4, resize: 'vertical' } }),
                  React.createElement("p", { style: { margin: 0, fontSize: 9, fontStyle: 'italic', opacity: 0.6 } }, __alloT('stem.behaviorlab.inquiry_widget_no_score_no_reveal_no_a', 'Inquiry widget \u2014 no score, no reveal, no answer dump. Skinner box terminology + matching-law extension. Persistence is multi-dimensional in real life; this is a teaching heuristic.'))
                );
              })()
                )
              )

            );

          }


          // ── Pulsing helper: is the current action the target? ──

          var isTargetActive = blPhase === 'running' && blLastAction === blTargetBehavior;

          var pulseStyle = isTargetActive ? { animation: 'bl-pulse 1s ease-in-out infinite', boxShadow: '0 0 18px rgba(245,158,11,0.55)' } : {};


          // ── FR counter for Level 4 ──

          // Presses since the last pellet, capped at the requirement so the readout
          // never reads "4 / 3" while the student waits for the next press.
          var frRatio = BL_FR_RATIO;

          var frCurrent = blLevel === 4 ? Math.min(d.blFrPresses || 0, frRatio) : 0;


          // ── Section rule ──────────────────────────────────────────────────
          // Named so the reader can see WHERE they are in a tool that runs from a
          // mouse in a chamber to a behaviour plan for a child, and back again.
          function blSection(key, title, blurb) {
            return React.createElement('div', { className: 'behaviorlab-section', key: 'sec-' + key },
              React.createElement('h3', null, title),
              React.createElement('p', null, blurb)
            );
          }

          // ── Glass style shorthand ──

          var glass = { backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' };


          // Running Phase & Complete Phase

          return React.createElement("div", { className: "behaviorlab-tool-shell behaviorlab-sim-shell space-y-3", role: "main", "aria-label": __alloT('stem.behaviorlab.behavior_lab_simulation', "Behavior Lab Simulation"), "data-behaviorlab-tool": "simulation", "data-behaviorlab-workspace": blPhase },

            // Skip navigation
            React.createElement("a", { href: "#behaviorlab-sim", className: "sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg" }, __alloT('stem.behaviorlab.skip_to_simulation', "Skip to simulation")),
            React.createElement("h2", { id: "behaviorlab-sim", className: "sr-only" }, blT('stem.behaviorlab.h_lab_level_sim', 'Behaviour Lab — level {n} simulation', { n: blLevel })),

            // ── Inject keyframe animation for pulse ──

            React.createElement("style", null,

              '@keyframes bl-pulse{0%,100%{box-shadow:0 0 6px rgba(245,158,11,0.3)}50%{box-shadow:0 0 22px rgba(245,158,11,0.7)}}' +

              '@keyframes bl-progress-glow{0%,100%{opacity:0.7}50%{opacity:1}}'

            ),


            // ── Header row ──

            React.createElement("div", {

              className: "behaviorlab-sim-header flex items-center gap-3 flex-wrap",

              style: Object.assign({ background: 'rgba(30,27,46,0.7)', borderRadius: 16, padding: '10px 14px', border: '1px solid rgba(99,102,241,0.2)' }, glass)

            },

              React.createElement("button", {

                onClick: function () { upd('blPhase', 'intro'); },

                className: "text-xl hover:scale-110 transition-transform", 'aria-label': __alloT('stem.behaviorlab.back_to_level_select', 'Back to level select')

              }, "\u2B05"),

              React.createElement("div", { className: "flex-1 min-w-0" },

                React.createElement("h2", { className: "text-sm font-extrabold text-white truncate" }, blT('stem.behaviorlab.level_titled', 'Level {n}: {title}', { n: blLevel, title: currentLevel.title })),

                React.createElement("p", { className: "text-xs text-amber-300" }, currentLevel.concept)

              ),

              // ── Speed segmented control ──

              React.createElement("div", { className: "flex rounded-lg overflow-hidden border border-slate-600/50", style: { fontSize: 11 } },

                [1, 2, 3].map(function (sp) {

                  return React.createElement("button", { "aria-label": __alloT('stem.behaviorlab.set_speed_to', 'Set speed to ') + (sp === 1 ? 'Slow' : sp === 2 ? __alloT('stem.behaviorlab.speed_medium', 'Medium') : __alloT('stem.behaviorlab.speed_fast', 'Fast')),

                    key: sp,

                    onClick: function () { upd('blSpeed', sp); },

                    className: "px-2.5 py-1 font-bold transition-all " +

                      (blSpeed === sp ? 'bg-amber-700 text-white' : 'transition-colors bg-slate-800 text-slate-200 hover:bg-slate-700 active:scale-[0.97]')

                  }, sp + '\u00D7');

                })

              ),

              // ── Sound toggle ──

              React.createElement("button", {

                onClick: function () { upd('blSoundOn', !blSoundOn); },

                className: "px-2 py-1 rounded-lg text-sm transition-all " +

                  (blSoundOn ? 'transition-colors bg-slate-700 text-white hover:bg-slate-600 active:scale-[0.97]' : 'transition-colors bg-slate-800 text-slate-200 hover:bg-slate-700 active:scale-[0.97]'),

                'aria-label': blSoundOn ? __alloT('stem.behaviorlab.mute', 'Mute') : __alloT('stem.behaviorlab.unmute', 'Unmute'), title: blSoundOn ? __alloT('stem.behaviorlab.sound_on', 'Sound On') : __alloT('stem.behaviorlab.sound_off', 'Sound Off')

              }, blSoundOn ? '\uD83D\uDD0A' : '\uD83D\uDD07'),

              // ── Pause button ──

              React.createElement("button", { "aria-label": blPaused ? __alloT('stem.behaviorlab.resume_simulation', 'Resume simulation') : __alloT('stem.behaviorlab.pause_simulation', 'Pause simulation'),

                onClick: function () { upd('blPaused', !blPaused); if (announceToSR) announceToSR(blPaused ? __alloT('stem.behaviorlab.sim_resumed', 'Simulation resumed') : __alloT('stem.behaviorlab.sim_paused', 'Simulation paused')); },

                className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (blPaused ? 'bg-emerald-700 text-white' : 'transition-colors bg-slate-700 text-slate-100 hover:bg-slate-600 active:scale-[0.97]')

              }, blPaused ? __alloT('stem.behaviorlab.resume_btn', '\u25B6 Resume') : __alloT('stem.behaviorlab.pause_btn', '\u23F8 Pause'))

            ),


            // ── Level progress bar ──

            currentLevel.goal > 0 && React.createElement("div", { className: "relative", role: "progressbar", "aria-valuenow": blLevelScore, "aria-valuemin": 0, "aria-valuemax": currentLevel.goal, "aria-label": __alloT('stem.behaviorlab.level_progress_label', 'Level progress: ') + blLevelScore + " of " + currentLevel.goal, style: { height: 10, borderRadius: 6, overflow: 'hidden', background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(99,102,241,0.15)' } },

              React.createElement("div", {

                style: {

                  width: Math.min(100, Math.round((blLevelScore / currentLevel.goal) * 100)) + '%',

                  height: '100%', borderRadius: 6,

                  background: 'linear-gradient(90deg, ' + lvlAccent + ', #fbbf24)',

                  transition: 'width 0.5s ease',

                  animation: 'bl-progress-glow 2s ease-in-out infinite'

                }

              }),

              React.createElement("span", {

                style: { position: 'absolute', right: 6, top: -1, fontSize: 8, fontWeight: 700, color: 'var(--bl-text)', lineHeight: '12px' }

              }, blLevelScore + '/' + currentLevel.goal)

            ),


            // ── Contextual hint banner ──

            blHint && React.createElement("div", {
              role: "status", "aria-live": "polite",
              style: Object.assign({ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 12, padding: '10px 14px' }, glass)

            },

              React.createElement("p", { className: "text-sm font-semibold", style: { margin: 0, color: '#c7d2fe', lineHeight: 1.5 } }, blHint)

            ),


            // ── Completion results card ──

            blPhase === 'complete' && React.createElement("div", {

              style: Object.assign({ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(20,184,166,0.15))', border: '1px solid rgba(52,211,153,0.35)', borderRadius: 18, padding: '20px 22px' }, glass)

            },

              // Star rating (efficiency-based)

              (function () {

                var efficiency = blTick > 0 ? blReinforcements / blTick : 0;

                var stars = efficiency > 0.6 ? 3 : efficiency > 0.3 ? 2 : 1;

                return React.createElement("p", { className: "text-2xl text-center mb-1", style: { letterSpacing: 4, textShadow: '0 0 12px rgba(251,191,36,0.5)' } },

                  '⭐'.repeat(stars) + '☆'.repeat(3 - stars)

                );

              })(),

              React.createElement("p", { className: "text-lg font-extrabold text-emerald-300 text-center mb-3 tracking-tight" }, blT('stem.behaviorlab.level_complete_heading', '\uD83C\uDF89 Level {n} complete!', { n: blLevel })),

              React.createElement("p", { className: "text-sm text-emerald-200 text-center mb-4" }, blT('stem.behaviorlab.you_demonstrated', 'You demonstrated {concept}.', { concept: currentLevel.concept })),

              // Results grid

              React.createElement("div", { className: "grid grid-cols-3 gap-3 mb-4" },

                React.createElement("div", { className: "bg-slate-900/50 rounded-xl p-3 text-center border border-slate-700/40" },

                  React.createElement("p", { className: "text-lg font-extrabold text-amber-400 tracking-tight" }, '' + blReinforcements),

                  React.createElement("p", { className: "text-[11px] text-slate-200" }, __alloT('stem.behaviorlab.reinforcements', "Reinforcements"))

                ),

                React.createElement("div", { className: "bg-slate-900/50 rounded-xl p-3 text-center border border-slate-700/40" },

                  React.createElement("p", { className: "text-lg font-extrabold text-indigo-400 tracking-tight" }, '' + blTick),

                  React.createElement("p", { className: "text-[11px] text-slate-200" }, __alloT('stem.behaviorlab.ticks_to_complete', "Ticks to Complete"))

                ),

                React.createElement("div", { className: "bg-slate-900/50 rounded-xl p-3 text-center border border-slate-700/40" },

                  React.createElement("p", { className: "text-lg font-extrabold text-emerald-400 tracking-tight" },

                    blTick > 0 ? (blLevelScore / blTick * 60).toFixed(1) : '0.0'),

                  React.createElement("p", { className: "text-[11px] text-slate-200" }, __alloT('stem.behaviorlab.resp_rate_min', "Resp Rate / min"))

                ),

                blLatencies.length > 0 && React.createElement("div", { className: "bg-slate-900/50 rounded-xl p-3 text-center border border-slate-700/40" },

                  React.createElement("p", { className: "text-lg font-extrabold text-purple-400 tracking-tight" },

                    (blLatencies.reduce(function (a, b) { return a + b; }, 0) / blLatencies.length).toFixed(1)),

                  React.createElement("p", { className: "text-[11px] text-slate-200" }, __alloT('stem.behaviorlab.avg_delay_to_reinforcement', "Avg delay to reinforcement (ticks)"))

                )

              ),

              // Vocab list

              React.createElement("div", { className: "bg-slate-900/40 rounded-xl p-3 border border-slate-700/30 mb-3" },

                React.createElement("p", { className: "text-xs font-bold text-amber-300 mb-1" }, __alloT('stem.behaviorlab.key_vocabulary', "\uD83D\uDCD6 Key Vocabulary:")),

                React.createElement("ul", { className: "space-y-0.5" },

                  (currentLevel.vocab || []).map(function (v, vi) {

                    return React.createElement("li", { key: vi, className: "text-xs text-slate-100" }, '\u2022 ' + v);

                  })

                )

              ),

              // ── Knowledge Quiz ──

              QUIZ_BANK[blLevel] && React.createElement("div", { className: "bg-gradient-to-br from-indigo-900/40 to-purple-900/30 rounded-xl p-4 border border-indigo-500/30" },

                React.createElement("p", { className: "text-xs font-bold text-indigo-300 mb-2" }, __alloT('stem.behaviorlab.knowledge_check', "🧠 Knowledge Check")),

                React.createElement("p", { className: "text-sm text-slate-200 font-semibold mb-3" }, QUIZ_BANK[blLevel].q),

                React.createElement("div", { className: "space-y-1.5" },

                  QUIZ_BANK[blLevel].opts.map(function (opt, oi) {

                    var isSelected = blQuizSelected === oi;

                    var isCorrect = oi === QUIZ_BANK[blLevel].correct;

                    var showResult = blQuizAnswered;

                    var btnClass = 'w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all border ';

                    if (showResult && isCorrect) btnClass += 'bg-emerald-600/40 text-emerald-200 border-emerald-500/50';

                    else if (showResult && isSelected && !isCorrect) btnClass += 'bg-red-600/40 text-red-200 border-red-500/50';

                    else if (isSelected) btnClass += 'bg-indigo-600/40 text-indigo-200 border-indigo-400/50';

                    else btnClass += 'transition-colors bg-slate-800/60 text-slate-100 border-slate-600/30 hover:bg-slate-700/60 active:scale-[0.97]';

                    return React.createElement("button", { "aria-label": __alloT('stem.behaviorlab.quiz_answer_label', 'Quiz answer: ') + opt,

                      key: oi,

                      disabled: blQuizAnswered,

                      onClick: function () {

                        upd('blQuizSelected', oi);

                        upd('blQuizAnswered', true);

                        var correct = oi === QUIZ_BANK[blLevel].correct;

                        upd('blQuizCorrect', correct);

                        if (correct) {

                          if (typeof awardStemXP === 'function') awardStemXP('behaviorLab', 5, 'Quiz correct: Level ' + blLevel);

                          if (addToast) addToast(__alloT('stem.behaviorlab.toast_quiz_correct', '✅ Correct! +5 XP bonus.'), 'success');

                        } else {

                          if (addToast) addToast(__alloT('stem.behaviorlab.toast_quiz_wrong', '❌ Not quite — read the explanation below.'), 'error');

                        }

                      },

                      className: btnClass

                    }, String.fromCharCode(65 + oi) + '. ' + opt + (showResult && isCorrect ? __alloT('stem.behaviorlab.mark_correct', ' \u2714 Correct') : '') + (showResult && isSelected && !isCorrect ? __alloT('stem.behaviorlab.mark_incorrect', ' \u2718 Incorrect') : ''));

                  })

                ),

                blQuizAnswered && React.createElement("div", {

                  className: "mt-3 p-3 rounded-lg text-xs " + (blQuizCorrect ? 'bg-emerald-900/30 text-emerald-200 border border-emerald-700/30' : 'bg-red-900/30 text-red-200 border border-red-700/30')

                },

                  React.createElement("p", { className: "font-bold mb-1" }, blQuizCorrect ? __alloT('stem.behaviorlab.quiz_result_correct', '✅ Correct!') : __alloT('stem.behaviorlab.quiz_result_incorrect', '❌ Incorrect')),

                  React.createElement("p", null, QUIZ_BANK[blLevel].explain)

                )

              ),

              // Fun fact

              React.createElement("div", { className: "bg-slate-900/40 rounded-xl p-3 border border-indigo-700/30" },

                React.createElement("p", { className: "text-xs text-indigo-200 italic" }, currentLevel.funFact)

              ),

              // Next level button

              React.createElement("button", { "aria-label": __alloT('stem.behaviorlab.next_level', "Next Level"),

                onClick: function () {

                  var nextLevel = Math.min(blLevel + 1, LEVELS.length);

                  upd('blLevel', nextLevel);

                  upd('blPhase', 'intro');

                  upd('blLevelScore', 0);

                  upd('blTick', 0);

                  upd('blHistory', []);

                  upd('blCumRecord', []);

                  upd('blAbcLog', []);

                  upd('blWeights', Object.assign({}, defaultWeights));

                  upd('blExtinctionPhase', false);

                  // Reset quiz state for next level

                  upd('blQuizAnswered', false);

                  upd('blQuizCorrect', false);

                  upd('blQuizSelected', -1);

                  // Reset chain state

                  upd('blChainStep', 0);

                  upd('blChainHistory', []);

                  // Reset latency

                  upd('blLatencies', []);

                  upd('blLastTargetTick', 0);

                },

                className: "w-full mt-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-700 text-white font-extrabold text-sm shadow-lg shadow-emerald-500/25 hover:from-emerald-700 hover:to-teal-700 transition-all hover:scale-[1.02]"

              }, __alloT('stem.behaviorlab.next_level_2', "\u27A1\uFE0F Next Level"))

            ),


            // ── Chamber Canvas ──

            React.createElement("div", {

              className: "behaviorlab-chamber-shell", "data-behaviorlab-chamber": "true",

              style: Object.assign({ borderRadius: 18, overflow: 'hidden', border: '2px solid rgba(99,102,241,0.25)', boxShadow: '0 8px 32px rgba(99,102,241,0.12)' }, glass)

            },

              React.createElement("div", { className: "behaviorlab-chamber-header" },
                React.createElement("h3", null, __alloT('stem.behaviorlab.observation_chamber', 'Observation chamber')),
                React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
                  React.createElement("div", { className: "behaviorlab-viewswitch", role: 'group', 'aria-label': __alloT('stem.behaviorlab.chamber_view', 'Chamber view') },
                    [['2d', '▦', __alloT('stem.behaviorlab.view_2d', 'Diagram')],
                     ['3d', '⬡', __alloT('stem.behaviorlab.view_3d', '3D')]].map(function (v) {
                      var on = bl3dOn === (v[0] === '3d');
                      return React.createElement('button', {
                        key: v[0], type: 'button', 'aria-pressed': on ? 'true' : 'false',
                        className: 'behaviorlab-viewswitch-btn' + (on ? ' is-on' : ''),
                        onClick: function () {
                          upd('blChamberView', v[0]);
                          if (announceToSR) announceToSR(v[0] === '3d'
                            ? __alloT('stem.behaviorlab.sr_view_3d', 'Three-D chamber view. Drag or use arrow keys to look around.')
                            : __alloT('stem.behaviorlab.sr_view_2d', 'Diagram chamber view.'));
                        }
                      }, React.createElement('span', { 'aria-hidden': 'true' }, v[1] + ' '), v[2]);
                    })
                  ),
                  React.createElement("span", { className: "behaviorlab-chamber-status", role: "status" },
                    (blPaused ? __alloT('stem.behaviorlab.status_paused', 'Paused') : __alloT('stem.behaviorlab.status_live', 'Live')) + ' — ' + (ACTION_LABELS[blMouseAction] || blMouseAction || 'exploring'))
                )
              ),

              // ── 3D chamber ───────────────────────────────────────────────────
              // Mounted only in 3D mode so no WebGL context is held while the
              // diagram is on screen. The 2D canvas below stays in the DOM either
              // way — the Space-to-reinforce shortcut gates on its presence, and
              // its rAF loop owns the position interpolation this scene reads.
              bl3dOn && React.createElement("div", { style: { padding: '10px 12px 12px' } },
                React.createElement("div", {
                  ref: BL_CHAMBER3D.attach, tabIndex: 0, role: 'group',
                  'data-behaviorlab-3d': 'true',
                  'aria-label': __alloT('stem.behaviorlab.chamber_3d_label', 'Operant chamber, 3D. Interactive: drag or use arrow keys to rotate, plus and minus to zoom, zero to reset. Every part is also a button below, and the diagram view carries the same information.'),
                  onKeyDown: function (e) {
                    var k = e.key, handled = true;
                    if (k === 'ArrowLeft') BL_CHAMBER3D.nudge(-0.17, 0);
                    else if (k === 'ArrowRight') BL_CHAMBER3D.nudge(0.17, 0);
                    else if (k === 'ArrowUp') BL_CHAMBER3D.nudge(0, 0.11);
                    else if (k === 'ArrowDown') BL_CHAMBER3D.nudge(0, -0.11);
                    else if (k === '+' || k === '=') BL_CHAMBER3D.zoom(-0.4);
                    else if (k === '-' || k === '_') BL_CHAMBER3D.zoom(0.4);
                    else if (k === '0') BL_CHAMBER3D.reset();
                    else handled = false;
                    if (handled) { e.preventDefault(); e.stopPropagation(); }
                  },
                  style: { position: 'relative', width: '100%', height: 420, borderRadius: 12, overflow: 'hidden', background: '#0b1220', border: '1px solid var(--bl-border)' }
                },
                  bl3dStatus !== 'ready' && React.createElement('div', {
                    style: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 20, fontSize: 12, color: 'var(--bl-text)', lineHeight: 1.6 }
                  }, bl3dStatus === 'failed'
                    ? __alloT('stem.behaviorlab.chamber_3d_failed', '3D is unavailable on this device or network. Switch back to Diagram — it carries the whole simulation.')
                    : __alloT('stem.behaviorlab.chamber_3d_loading', 'Loading the 3D chamber…'))
                ),
                React.createElement('div', { style: { display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' } },
                  [[__alloT('stem.behaviorlab.rotate_left', 'Rotate view left'), '⟲', function () { BL_CHAMBER3D.nudge(-0.30, 0); }],
                   [__alloT('stem.behaviorlab.rotate_right', 'Rotate view right'), '⟳', function () { BL_CHAMBER3D.nudge(0.30, 0); }],
                   [__alloT('stem.behaviorlab.tilt_up', 'Tilt view up'), '▲', function () { BL_CHAMBER3D.nudge(0, 0.16); }],
                   [__alloT('stem.behaviorlab.tilt_down', 'Tilt view down'), '▼', function () { BL_CHAMBER3D.nudge(0, -0.16); }],
                   [__alloT('stem.behaviorlab.zoom_in', 'Zoom in'), '＋', function () { BL_CHAMBER3D.zoom(-0.5); }],
                   [__alloT('stem.behaviorlab.zoom_out', 'Zoom out'), '－', function () { BL_CHAMBER3D.zoom(0.5); }],
                   [__alloT('stem.behaviorlab.reset_view', 'Reset the view'), '⌂', function () { BL_CHAMBER3D.reset(); }]].map(function (c) {
                    return React.createElement('button', {
                      key: c[0], type: 'button', 'aria-label': c[0], title: c[0],
                      disabled: bl3dStatus !== 'ready', onClick: c[2],
                      className: 'behaviorlab-3d-btn'
                    }, React.createElement('span', { 'aria-hidden': 'true' }, c[1]));
                  }),
                  React.createElement('button', {
                    type: 'button', className: 'behaviorlab-3d-btn',
                    'aria-pressed': bl3dLabels ? 'true' : 'false',
                    disabled: bl3dStatus !== 'ready',
                    onClick: function () { upd('bl3dLabels', !bl3dLabels); },
                    style: { width: 'auto', padding: '5px 10px' }
                  }, bl3dLabels
                    ? __alloT('stem.behaviorlab.hide_part_labels', 'Hide labels')
                    : __alloT('stem.behaviorlab.show_part_labels', 'Show labels'))
                ),
                // Keyboard and screen-reader parity with clicking a part in the
                // scene: picking is a mouse gesture, so every part is a button too.
                React.createElement('div', { style: { display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }, role: 'group', 'aria-label': __alloT('stem.behaviorlab.chamber_parts', 'Chamber parts') },
                  BL_CHAMBER_PARTS.map(function (p) {
                    var on = bl3dSel === p.id;
                    return React.createElement('button', {
                      key: p.id, type: 'button', 'aria-pressed': on ? 'true' : 'false',
                      className: 'behaviorlab-3d-part' + (on ? ' is-on' : ''),
                      onClick: function () { upd('bl3dSel', on ? null : p.id); }
                    }, BL_PART_TEXT[p.id] ? BL_PART_TEXT[p.id].label : p.label);
                  })
                ),
                bl3dSel && BL_PART_TEXT[bl3dSel] && React.createElement('div', {
                  role: 'status',
                  style: { marginTop: 8, padding: '9px 11px', borderRadius: 10, background: 'rgba(30,41,59,0.6)', border: '1px solid var(--bl-border)', fontSize: 11.5, lineHeight: 1.6, color: 'var(--bl-text)' }
                },
                  React.createElement('strong', { style: { color: 'var(--bl-amber-text)' } }, BL_PART_TEXT[bl3dSel].label + ' — '),
                  BL_PART_TEXT[bl3dSel].desc
                ),
                React.createElement('div', { style: { marginTop: 7, fontSize: 10.5, color: 'var(--bl-muted)', lineHeight: 1.5 } },
                  __alloT('stem.behaviorlab.chamber_3d_hint', 'A teaching model of a standard operant chamber, not a specific commercial apparatus. It renders the same simulation as the diagram — same positions, same tick.'))
              ),

              // The canvas is never unmounted: `bl-chamber-canvas` is what the
              // Space-to-reinforce handler checks to decide the lab is on screen.
              React.createElement("div", { style: { display: bl3dOn ? 'none' : 'block' } },
                React.createElement("canvas", {

                  id: "bl-chamber-canvas", ref: _blCvRef, className: "behaviorlab-chamber-canvas", "data-behaviorlab-canvas": "true", tabIndex: 0,
                  role: "img",
                  // Read blMouseAction, not blAction — nothing ever writes blAction, so
                  // this label was frozen at "exploring" for every screen-reader user
                  // for the whole run.
                  'aria-label': blT('stem.behaviorlab.chamber_canvas_label', 'Behaviour lab chamber showing a mouse. Current action: {action}. Tick: {tick}.', { action: ACTION_LABELS[d.blMouseAction] || d.blMouseAction || 'exploring', tick: d.blTick || 0 }),

                  width: 720, height: 360, style: { width: '100%', height: 'auto', display: 'block' }

                })
              )

            ),

            // ── Proximity heat meter (Levels 1, 2, 6) ──
            blProxRelevant && React.createElement("div", {
              style: { position: 'relative', height: 12, borderRadius: 6, overflow: 'hidden', background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(99,102,241,0.15)', margin: '4px 0' }
            },
              React.createElement("div", {
                style: {
                  // Was (350, 225) / 300 — a third answer to "where is the lever",
                  // disagreeing with both the shaping rule and the drawn chamber.
                  width: Math.max(5, Math.round((1 - Math.min(Math.sqrt(Math.pow((blMouseX || 200) - BL_LEVER.x, 2) + Math.pow((blMouseY || 180) - BL_LEVER.y, 2)) / BL_PROX_RANGE, 1)) * 100)) + '%',
                  height: '100%', borderRadius: 6,
                  background: 'linear-gradient(90deg, #f87171 0%, #f59e0b 50%, #22c55e 100%)',
                  transition: 'width 0.3s ease',
                  boxShadow: '0 0 8px rgba(34,197,94,0.3)'
                }
              }),
              React.createElement("span", {
                style: { position: 'absolute', right: 8, top: -1, fontSize: 9, color: 'var(--bl-muted)', lineHeight: '12px' }
              }, __alloT('stem.behaviorlab.lever_proximity', '\uD83D\uDC2D \u2192 Lever proximity'))
            ),

            // ── Behavior frequency heatmap strip ──

            blRecentActions.length > 0 && React.createElement("div", {

              style: Object.assign({ background: 'rgba(30,41,59,0.55)', borderRadius: 12, padding: '8px 12px', border: '1px solid rgba(71,85,105,0.25)' }, glass)

            },

              React.createElement("h4", { className: "text-[11px] text-slate-200 font-bold mb-1.5 uppercase tracking-wider" }, __alloT('stem.behaviorlab.recent_behaviors', "\uD83D\uDD25 Recent Behaviors")),

              React.createElement("div", { className: "flex gap-1 items-center flex-wrap" },

                blRecentActions.map(function (act, ai) {
                  var isLast = ai === blRecentActions.length - 1;
                  return React.createElement("div", {

                    key: ai,

                    // aria-label is prohibited on a bare div, so the whole strip was
                    // unnamed for a screen reader despite carrying labels.
                    role: 'img',
                    title: ACTION_LABELS[act] || act,
                    'aria-label': (ACTION_LABELS[act] || act) + (act === blTargetBehavior ? __alloT('stem.behaviorlab.suffix_target_behavior', ' (target behavior)') : ''),

                    style: {

                      width: isLast ? 'auto' : 14, height: isLast ? 'auto' : 14, borderRadius: isLast ? '8px' : '50%',
                      padding: isLast ? '2px 8px' : 0,
                      display: isLast ? 'flex' : 'block', alignItems: 'center', gap: '3px',
                      // Every ACTION_COLORS value is a 400-level tint, so white text on
                      // the labelled chip ran 2.0–2.2:1. Dark ink clears 6.7:1 on the
                      // weakest of them (pink) and 11:1 on the strongest.
                      //
                      // High contrast is handled by inverting the FILL rather than the
                      // ink: that theme forces text to yellow through a rule this chip
                      // cannot outrank from an inline style, so yellow-on-amber (1.99:1)
                      // was the only reachable outcome while the fill stayed coloured.
                      // Black fill keeps it at ~19:1 and the action colour moves to the
                      // border, so the colour coding survives.
                      fontSize: isLast ? '10px' : 0, fontWeight: 700, color: isLast ? '#0b1220' : '#fff',

                      backgroundColor: (blIsContrast && isLast) ? '#000000' : (ACTION_COLORS[act] || '#94a3b8'),

                      // The fade is a recency cue, but it must not dim the one chip
                      // that carries readable text.
                      opacity: isLast ? 1 : 0.5 + (ai / blRecentActions.length) * 0.5,

                      transition: 'all 0.3s ease',

                      cursor: 'pointer',

                      border: (blIsContrast && isLast)
                        ? '2px solid ' + (ACTION_COLORS[act] || '#94a3b8')
                        : (act === blTargetBehavior ? '2px solid #fbbf24' : '1px solid rgba(255,255,255,0.1)')

                    }

                  }, isLast ? (ACTION_LABELS[act] || act) : null);

                })

              )

            ),


            // ── Controls row ──

            React.createElement("div", { className: "flex gap-2 flex-wrap items-center" },

              // Deliver Food button (pulsing when target active)

              // Level 8: disable manual food (DRO is automatic)

              // Level 9: disable manual food (CC uses bell/food pairing)

              blLevel === 8 ? React.createElement("div", {

                className: "flex-1 py-2.5 rounded-xl text-center text-cyan-300 font-bold text-xs",

                style: { background: 'rgba(8,145,178,0.2)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 12 }

              }, __alloT('stem.behaviorlab.automatic_dro_food_delivered_when_time', "\u23F1 Automatic (DRO) \u2014 food delivered when timer completes")) :

              blLevel === 9 ? React.createElement("div", {

                className: "flex-1 py-2.5 rounded-xl text-center text-rose-300 font-bold text-xs",

                style: { background: 'rgba(225,29,72,0.15)', border: '1px solid rgba(225,29,72,0.3)', borderRadius: 12 }

              }, __alloT('stem.behaviorlab.use_the_classical_conditioning_panel_b', "\uD83D\uDD14 Use the Classical Conditioning panel below")) :

                React.createElement("button", { onClick: function () {

                    if (blLevel === 3 && blExtinctionPhase) {

                      if (addToast) addToast(__alloT('stem.behaviorlab.toast_extinction_no_reinforce', '\u26A0\uFE0F Extinction phase: do NOT reinforce.'), 'warning');

                      return;

                    }

                    reinforceAction();

                  },

                  disabled: !blLastAction || blPhase !== 'running',

                  className: "flex-1 py-2.5 rounded-xl font-bold text-sm transition-all " +

                    (blLastAction && blPhase === 'running'

                      ? "bg-gradient-to-r from-amber-700 to-yellow-700 text-white shadow-md hover:from-amber-700 hover:to-yellow-700 hover:scale-[1.02]"

                      : "bg-slate-700 text-slate-200 cursor-not-allowed"),

                  style: pulseStyle

                }, __alloT('stem.behaviorlab.deliver_food', '\uD83C\uDF55 Deliver Food')
                  + (blLevel === 4 ? '  (' + frCurrent + '/' + frRatio + ')' : '')
                  + '  [' + __alloT('stem.behaviorlab.key_space', 'Space') + ']'),

              // Level 3: extinction trigger

              blLevel === 3 && !blExtinctionPhase && blLevelScore >= 5 && React.createElement("button", { "aria-label": __alloT('stem.behaviorlab.start_extinction', "Start Extinction"),

                onClick: function () {

                  upd('blExtinctionPhase', true);

                  upd('blExtinctionStart', blTick);

                  if (addToast) addToast(__alloT('stem.behaviorlab.toast_extinction_started', '\uD83D\uDEAB Extinction phase started. Do NOT deliver food.'), 'info');

                },

                className: "flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-colors shadow-md active:scale-[0.97]"

              }, __alloT('stem.behaviorlab.start_extinction_2', "\uD83D\uDEAB Start Extinction")),

              blLevel === 3 && blExtinctionPhase && React.createElement("div", {

                className: "flex-1 py-2.5 rounded-xl text-center text-red-300 font-bold text-xs",

                style: { background: 'rgba(127,29,29,0.35)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12 }

              }, __alloT('stem.behaviorlab.extinction_in_progress_watch_the_burst', "\u23F3 Extinction in progress... watch the burst!")),

              // Level 6: sandbox target selector

              blLevel === 6 && React.createElement("select", {

                value: blSandboxTarget,

                onChange: function (e) { upd('blSandboxTarget', e.target.value); },

                'aria-label': __alloT('stem.behaviorlab.target_behavior_selector', 'Target behavior selector'),

                className: "transition-all px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 text-indigo-300 border border-indigo-500/30 cursor-pointer hover:shadow-md hover:-translate-y-0.5",

                style: Object.assign({}, glass)

              },

                Object.keys(ACTION_LABELS).map(function (ak) {

                  return React.createElement("option", { key: ak, value: ak }, ACTION_LABELS[ak]);

                })

              )

            ),


            // ── Level 7: Chain Progress Tracker ──

            blLevel === 7 && blPhase === 'running' && React.createElement("div", {

              style: Object.assign({ background: 'rgba(30,41,59,0.55)', borderRadius: 14, padding: '12px 14px', border: '1px solid rgba(139,92,246,0.3)' }, glass)

            },

              React.createElement("h4", { className: "text-[11px] text-purple-300 font-bold mb-2 uppercase tracking-wider" }, __alloT('stem.behaviorlab.chain_progress', "\uD83D\uDD17 Chain Progress")),

              React.createElement("div", { className: "flex items-center justify-center gap-2" },

                CHAIN_SEQ.map(function (step, si) {

                  var isDone = si < blChainStep;

                  var isCurrent = si === blChainStep;

                  var stepLabel = step === 'sniff' ? __alloT('stem.behaviorlab.chain_sniff', '👃 Sniff') : step === 'rearUp' ? __alloT('stem.behaviorlab.chain_rear_up', '🐭 Rear Up') : __alloT('stem.behaviorlab.chain_press_lever', '⚡ Press Lever');

                  return React.createElement(React.Fragment, { key: si },

                    si > 0 && React.createElement("span", {

                      className: "text-sm font-bold " + (isDone ? 'text-emerald-400' : 'text-slate-200')

                    }, "➜"),

                    React.createElement("div", {

                      className: "px-3 py-2 rounded-xl text-xs font-bold text-center transition-all " +

                        (isDone ? 'bg-emerald-600/40 text-emerald-200 border border-emerald-500/40 shadow-md shadow-emerald-500/10' :

                          isCurrent ? 'bg-amber-600/40 text-amber-200 border border-amber-500/40 ring-2 ring-amber-400/50' :

                            'bg-slate-800/60 text-slate-200 border border-slate-700/40')

                      ,
                      // Pulses the GLOW, not the element's opacity: animate-pulse
                      // dimmed this label to 3.28:1 for half of every cycle.
                      style: isCurrent ? { animation: 'bl-pulse 1.6s ease-in-out infinite' } : undefined
                    }, (isDone ? '✅ ' : isCurrent ? '⏳ ' : '') + stepLabel)

                  );

                }),

                blChainStep >= CHAIN_SEQ.length && React.createElement("span", {

                  className: "ml-2 px-3 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-700 to-yellow-700 text-white behaviorlab-glow-pulse shadow-lg shadow-amber-500/30"

                }, __alloT('stem.behaviorlab.reinforce_now', "🍕 REINFORCE NOW!"))

              ),

              React.createElement("p", { className: "text-[11px] text-slate-200 text-center mt-2" },

                (currentLevel.goal > 0
                  ? blT('stem.behaviorlab.completed_chains_of', 'Completed chains: {n}/{goal}', { n: blChainHistory.length, goal: currentLevel.goal })
                  : blT('stem.behaviorlab.completed_chains', 'Completed chains: {n}', { n: blChainHistory.length })))

            ),


            // ── Level 8: DRO Timer Panel ──

            blLevel === 8 && blPhase === 'running' && React.createElement("div", {

              style: Object.assign({ background: 'rgba(30,41,59,0.55)', borderRadius: 14, padding: '12px 14px', border: '1px solid rgba(6,182,212,0.3)' }, glass)

            },

              React.createElement("h4", { className: "text-[11px] text-cyan-300 font-bold mb-2 uppercase tracking-wider" }, __alloT('stem.behaviorlab.dro_timer', "\u23F1 DRO Timer")),

              // Timer bar

              React.createElement("div", {

                className: "relative mb-2",

                style: { height: 16, borderRadius: 8, overflow: 'hidden', background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(6,182,212,0.2)' }

              },

                React.createElement("div", {

                  style: {

                    width: Math.round((blDroTimer / blDroInterval) * 100) + '%',

                    height: '100%', borderRadius: 8,

                    background: 'linear-gradient(90deg, #06b6d4, #22d3ee)',

                    transition: 'width 0.4s ease'

                  }

                }),

                React.createElement("span", {

                  style: { position: 'absolute', left: '50%', top: 1, transform: 'translateX(-50%)', fontSize: 11, fontWeight: 700, color: 'var(--bl-text)' }

                }, blT('stem.behaviorlab.dro_ticks_of', '{n} / {total} ticks', { n: blDroTimer, total: blDroInterval }))

              ),

              React.createElement("div", { className: "flex items-center justify-between" },

                React.createElement("p", { className: "text-xs text-slate-200" },

                  (currentLevel.goal > 0
                    ? blT('stem.behaviorlab.dro_successes_of', '\u2705 DRO successes: {n}/{goal}', { n: blDroSuccesses, goal: currentLevel.goal })
                    : blT('stem.behaviorlab.dro_successes', '\u2705 DRO successes: {n}', { n: blDroSuccesses }))),

                React.createElement("p", { className: "text-[11px] text-cyan-300/60 italic" },

                  blDroTimer === 0 ? __alloT('stem.behaviorlab.dro_timer_started', 'Timer started — no lever presses needed.') : __alloT('stem.behaviorlab.dro_keep_waiting', 'Keep waiting…'))

              )

            ),


            // ── Level 9: Classical Conditioning Panel ──

            blLevel === 9 && blPhase === 'running' && React.createElement("div", {

              style: Object.assign({ background: 'rgba(30,41,59,0.55)', borderRadius: 14, padding: '14px 14px', border: '1px solid rgba(225,29,72,0.35)' }, glass)

            },

              React.createElement("h4", { className: "text-[11px] text-rose-300 font-bold mb-2 uppercase tracking-wider" }, __alloT('stem.behaviorlab.classical_conditioning', "\uD83D\uDD14 Classical Conditioning")),

              // Phase indicator

              React.createElement("div", { className: "flex items-center gap-1.5 mb-3 flex-wrap" },

                ['baseline', 'pairing', 'test', 'extinction'].map(function (ph) {

                  var isActive = blCcPhase === ph;

                  var phLabels = { baseline: '1\uFE0F\u20E3 Baseline', pairing: '2\uFE0F\u20E3 Pairing', test: '3\uFE0F\u20E3 Test', extinction: '4\uFE0F\u20E3 Extinction' };

                  return React.createElement("span", {

                    key: ph,

                    style: {

                      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 8,

                      background: isActive ? 'rgba(225,29,72,0.35)' : 'rgba(30,41,59,0.5)',

                      color: isActive ? '#fda4af' : '#94a3b8',

                      border: '1px solid ' + (isActive ? 'rgba(225,29,72,0.5)' : 'rgba(71,85,105,0.3)')

                    }

                  }, phLabels[ph] || ph);

                })

              ),

              // Association strength meter

              React.createElement("div", { className: "mb-3" },

                React.createElement("div", { className: "flex justify-between mb-1" },

                  React.createElement("span", { style: { fontSize: 11, color: 'var(--bl-muted)', fontWeight: 600 } }, __alloT('stem.behaviorlab.association_strength', 'Association Strength')),

                  React.createElement("span", { style: { fontSize: 11, color: blAssocStrength > 60 ? '#fda4af' : '#94a3b8', fontWeight: 700 } }, blAssocStrength + '%')

                ),

                React.createElement("div", {

                  style: { height: 12, borderRadius: 6, overflow: 'hidden', background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(225,29,72,0.2)' }

                },

                  React.createElement("div", {

                    style: {

                      width: blAssocStrength + '%', height: '100%', borderRadius: 6,

                      background: blAssocStrength > 60 ? 'linear-gradient(90deg, #e11d48, #fb7185)' : 'linear-gradient(90deg, #475569, #94a3b8)',

                      transition: 'width 0.5s ease, background 0.5s ease'

                    }

                  })

                )

              ),

              // Visual feedback row: bell + salivation

              React.createElement("div", { className: "flex items-center justify-center gap-4 mb-3" },

                React.createElement("span", {

                  style: {

                    fontSize: 28, transition: 'transform 0.3s ease',

                    transform: blBellRinging ? 'rotate(-15deg) scale(1.3)' : 'rotate(0) scale(1)',

                    filter: blBellRinging ? 'drop-shadow(0 0 8px rgba(225,29,72,0.6))' : 'none'

                  }

                }, "\uD83D\uDD14"),

                blBellRinging && React.createElement("span", {

                  style: { fontSize: 11, color: '#fda4af', fontWeight: 700, letterSpacing: 2 }

                }, __alloT('stem.behaviorlab.ring', 'RING!')),

                React.createElement("span", {

                  style: {

                    fontSize: 28, transition: 'transform 0.3s ease, opacity 0.3s ease',

                    transform: blSalivating ? 'scale(1.3)' : 'scale(1)',

                    opacity: blSalivating ? 1 : 0.3

                  }

                }, "\uD83E\uDD24"),

                blSalivating && React.createElement("span", {

                  style: { fontSize: 11, color: '#86efac', fontWeight: 700 }

                }, "CR!")

              ),

              // Action buttons

              React.createElement("div", { className: "flex gap-2" },

                // Ring Bell button

                React.createElement("button", { "aria-label": __alloT('stem.behaviorlab.ring_bell', "Ring Bell"),

                  onClick: function () {

                    upd('blBellRinging', true);

                    upd('blBellTime', Date.now());

                    blBeep(1200, 0.3, 0.25); // bell sound

                    var bellLog = blAbcLog.slice();

                    if (blCcPhase === 'baseline') {

                      bellLog.unshift({ tick: blTick, a: '\uD83D\uDD14 Bell (neutral)', b: 'Dog hears bell', c: 'No salivation (no association yet)', t: Date.now() });

                      upd('blAbcLog', bellLog.slice(0, 50));

                      if (addToast) addToast(__alloT('stem.behaviorlab.toast_bell_neutral', '\uD83D\uDD14 Bell rings… no response. It is still a neutral stimulus.'), 'info');

                      // After 2 baseline trials, auto-advance to pairing

                      if (blPairCount >= 1) {

                        upd('blCcPhase', 'pairing');

                        upd('blPairCount', 0);

                        if (addToast) addToast(__alloT('stem.behaviorlab.toast_phase_pairing', '\u27A1\uFE0F Pairing phase. Now pair the bell WITH food.'), 'info');

                      } else {

                        upd('blPairCount', blPairCount + 1);

                      }

                    } else if (blCcPhase === 'test') {

                      // Test phase: bell alone — if association > 30, CR occurs

                      if (blAssocStrength > 30) {

                        upd('blSalivating', true);

                        upd('blSalivateTime', Date.now());

                        bellLog.unshift({ tick: blTick, a: '\uD83D\uDD14 Bell (CS)', b: 'Dog hears bell alone', c: '\uD83E\uDD24 Salivation! (CR — conditioned response!)', t: Date.now() });

                        upd('blAbcLog', bellLog.slice(0, 50));

                        upd('blLevelScore', blLevelScore + 1);

                        blBeep(880, 0.15, 0.2);

                        if (addToast) addToast(__alloT('stem.behaviorlab.toast_cr_observed', '\uD83E\uDD24 The dog salivates to the bell alone. That is a conditioned response.'), 'success');

                        if (typeof awardStemXP === 'function') awardStemXP('behaviorLab', 3, 'Classical conditioning CR observed');

                        // After observing 2 CRs, offer extinction.
                        // blLevelScore is the value from BEFORE the increment above, so
                        // `>= 2` first became true on the THIRD conditioned response —
                        // the comment and the behaviour disagreed by one trial.

                        if (blLevelScore + 1 >= 2) {

                          upd('blCcPhase', 'extinction');

                          upd('blCcExtTrials', 0);

                          if (addToast) addToast(__alloT('stem.behaviorlab.toast_phase_extinction', '\u27A1\uFE0F Extinction phase. Ring the bell without food to weaken the association.'), 'info');

                        }

                      } else {

                        bellLog.unshift({ tick: blTick, a: '\uD83D\uDD14 Bell (CS)', b: 'Dog hears bell alone', c: 'Weak/no salivation (association too low)', t: Date.now() });

                        upd('blAbcLog', bellLog.slice(0, 50));

                        if (addToast) addToast(__alloT('stem.behaviorlab.toast_assoc_too_weak', '\uD83D\uDD14 Weak response — the association is not strong enough yet. Pair some more.'), 'warning');

                        upd('blCcPhase', 'pairing');

                      }

                    } else if (blCcPhase === 'extinction') {

                      // Extinction: bell alone weakens association

                      // Extinction is the same process with no US to support the
                      // association, so it decays proportionally rather than by a flat
                      // 20 points: fast at first, then slower — which is why the last
                      // traces of a conditioned response are the hardest to remove, and
                      // why spontaneous recovery is a thing at all.
                      var newAssoc = Math.max(0, Math.round(blAssocStrength * (1 - BL_CS_RATE)));

                      upd('blAssocStrength', newAssoc);

                      upd('blCcExtTrials', blCcExtTrials + 1);

                      if (newAssoc > 30) {

                        upd('blSalivating', true);

                        upd('blSalivateTime', Date.now());

                      }

                      bellLog.unshift({ tick: blTick, a: '\uD83D\uDD14 Bell alone (extinction)', b: 'No food follows', c: 'Association weakening (' + newAssoc + '%)', t: Date.now() });

                      upd('blAbcLog', bellLog.slice(0, 50));

                      if (newAssoc <= 10) {

                        if (addToast) addToast(__alloT('stem.behaviorlab.toast_extinguished', '\u2705 Association extinguished. The bell no longer produces salivation.'), 'success');

                        // Complete the level

                        upd('blPhase', 'complete');

                        if (typeof awardStemXP === 'function') awardStemXP('behaviorLab', 15, 'Completed Level 9: Classical Conditioning');

                        if (addToast) addToast(__alloT('stem.behaviorlab.toast_l9_complete', '\uD83C\uDF89 Level 9 complete! Classical conditioning.'), 'success');

                        var newCompleted9 = blCompletedLevels.indexOf(9) < 0 ? blCompletedLevels.concat([9]) : blCompletedLevels;

                        upd('blCompletedLevels', newCompleted9);

                      } else {

                        if (addToast) addToast(blT('stem.behaviorlab.toast_assoc_weakening', '\uD83D\uDD14 Bell without food — association weakening ({pct}%).', { pct: newAssoc }), 'info');

                      }

                    }

                  },

                  disabled: blCcPhase === 'pairing',

                  className: "flex-1 py-2 rounded-xl font-bold text-xs transition-all " +

                    (blCcPhase !== 'pairing' ? "bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md hover:from-rose-700 hover:to-pink-700 hover:scale-[1.02]" : "bg-slate-700 text-slate-200 cursor-not-allowed")

                }, __alloT('stem.behaviorlab.ring_bell', '\uD83D\uDD14 Ring Bell')
                  + (blCcPhase === 'baseline' ? ' (' + __alloT('stem.behaviorlab.phase_baseline', 'Baseline') + ')'
                    : blCcPhase === 'test' ? ' (' + __alloT('stem.behaviorlab.phase_test_cr', 'Test CR') + ')'
                    : blCcPhase === 'extinction' ? ' (' + __alloT('stem.behaviorlab.phase_extinction', 'Extinction') + ')' : '')),

                // Pair Bell + Food button (only in pairing phase)

                React.createElement("button", { "aria-label": __alloT('stem.behaviorlab.pair_bell_with_food', "Pair Bell with Food"),

                  onClick: function () {

                    if (blCcPhase !== 'pairing') {

                      if (addToast) addToast(__alloT('stem.behaviorlab.toast_pairing_phase_only', '\u26A0\uFE0F Pairing is only available during the pairing phase.'), 'warning');

                      return;

                    }

                    upd('blBellRinging', true);

                    upd('blBellTime', Date.now());

                    upd('blFoodVisible', true);

                    upd('blFoodTime', Date.now());

                    upd('blSalivating', true);

                    upd('blSalivateTime', Date.now());

                    var newPairCount = blPairCount + 1;

                    // Acquisition is NEGATIVELY ACCELERATED — each pairing adds less
                    // than the one before, because there is less left to learn. A flat
                    // +18 per trial drew a straight ramp and taught the standard
                    // misconception that every pairing is worth the same, in the one
                    // panel a student watches to find out what acquisition looks like.
                    // Rescorla-Wagner in its simplest form: delta = rate * (asymptote - V).
                    // Five pairings still land near 90%, so the phase structure and the
                    // 30% CR threshold below are unchanged — only the SHAPE is fixed.
                    var newAssocP = Math.min(100, Math.round(blAssocStrength + BL_CS_RATE * (100 - blAssocStrength)));

                    upd('blPairCount', newPairCount);

                    upd('blAssocStrength', newAssocP);

                    blBeep(1200, 0.3, 0.25); // bell

                    setTimeout(function () { blBeep(500, 0.2, 0.15); }, 300); // food

                    setTimeout(function () { upd('blFoodVisible', false); }, 1500);

                    var pairLog = blAbcLog.slice();

                    pairLog.unshift({ tick: blTick, a: '\uD83D\uDD14 Bell + \uD83C\uDF55 Food (US)', b: 'Dog eats food', c: '\uD83E\uDD24 Salivation (UR) — Pair ' + newPairCount + '/5', t: Date.now() });

                    upd('blAbcLog', pairLog.slice(0, 50));

                    if (addToast) addToast(blT('stem.behaviorlab.toast_pair_trial', '\uD83D\uDD14 + \uD83C\uDF55 Pair {n} of 5 — association building ({pct}%).', { n: newPairCount, pct: newAssocP }), 'success');

                    if (typeof awardStemXP === 'function') awardStemXP('behaviorLab', 1, 'CS-US pairing trial');

                    // After 5 pairings, advance to test phase

                    if (newPairCount >= 5) {

                      upd('blCcPhase', 'test');

                      upd('blLevelScore', 0);

                      if (addToast) addToast(__alloT('stem.behaviorlab.toast_phase_test', '\u27A1\uFE0F Test phase. Ring the bell ALONE to test for the conditioned response.'), 'info');

                    }

                  },

                  disabled: blCcPhase !== 'pairing',

                  className: "flex-1 py-2 rounded-xl font-bold text-xs transition-all " +

                    (blCcPhase === 'pairing' ? "bg-gradient-to-r from-amber-700 to-yellow-700 text-white shadow-md hover:from-amber-700 hover:to-yellow-700 hover:scale-[1.02]" : "bg-slate-700 text-slate-200 cursor-not-allowed")

                }, blT('stem.behaviorlab.pair_button', '\uD83D\uDD14+\uD83C\uDF55 Pair ({n}/5)', { n: blPairCount }))

              ),

              // Phase instructions

              React.createElement("p", { className: "text-[11px] text-slate-200 text-center mt-2 italic" },

                blCcPhase === 'baseline' ? 'Ring the bell to observe: no response yet (neutral stimulus)' :

                blCcPhase === 'pairing' ? 'Pair the bell with food 5 times to build the association!' :

                blCcPhase === 'test' ? 'Ring the bell ALONE — does the dog salivate? (Conditioned Response)' :

                blCcPhase === 'extinction' ? __alloT('stem.behaviorlab.cc_ring_without_food', 'Ring the bell WITHOUT food to weaken the association') : '')

            ),


            blSection('data', __alloT('stem.behaviorlab.sec_data', 'Reading the data'),
              __alloT('stem.behaviorlab.sec_data_sub', 'The same session, four ways behaviour analysts actually record it.')),

            // ── Current action + stats ──

            React.createElement("div", { className: "grid grid-cols-2 gap-3" },

              // Last action

              React.createElement("div", {

                style: Object.assign({ background: 'rgba(30,41,59,0.55)', borderRadius: 14, padding: '12px 14px', border: '1px solid rgba(71,85,105,0.3)' }, glass)

              },

                React.createElement("h4", { className: "text-[11px] text-slate-200 font-bold mb-0.5 uppercase tracking-wider" }, __alloT('stem.behaviorlab.last_behavior', "Last Behavior")),

                React.createElement("p", { className: "text-sm font-extrabold", style: { color: ACTION_COLORS[blMouseAction] || '#94a3b8' } },

                  ACTION_LABELS[blMouseAction] || 'Waiting...')

              ),

              // Stats

              React.createElement("div", {

                style: Object.assign({ background: 'rgba(30,41,59,0.55)', borderRadius: 14, padding: '12px 14px', border: '1px solid rgba(71,85,105,0.3)' }, glass)

              },

                React.createElement("h4", { className: "text-[11px] text-slate-200 font-bold mb-0.5 uppercase tracking-wider" }, __alloT('stem.behaviorlab.session_stats', "Session Stats")),

                React.createElement("p", { className: "text-xs text-amber-300" }, blT('stem.behaviorlab.stat_reinforcements', '\uD83C\uDF55 Reinforcements: {n}', { n: blReinforcements })),

                React.createElement("p", { className: "text-xs text-emerald-300" }, (currentLevel.goal > 0
                  ? blT('stem.behaviorlab.stat_target_hits_of', '\uD83C\uDFAF Target hits: {n}/{goal}', { n: blLevelScore, goal: currentLevel.goal })
                  : blT('stem.behaviorlab.stat_target_hits', '\uD83C\uDFAF Target hits: {n}', { n: blLevelScore }))),

                blLatencies.length > 0 && React.createElement("p", { className: "text-xs text-purple-300" }, "\u23F1 " + __alloT('stem.behaviorlab.avg_delay_short', 'Avg delay to reinforcement') + ": " + (blLatencies.reduce(function (a, b) { return a + b; }, 0) / blLatencies.length).toFixed(1) + " ticks"),

                blLevel === 4 && React.createElement("p", { className: "text-xs text-blue-300 mt-0.5" },
                  "\uD83D\uDD22 " + __alloT('stem.behaviorlab.fr_presses_since_food', 'Presses since the last pellet') + ": " + frCurrent + " / " + frRatio
                  + (frCurrent >= frRatio ? ' \u2014 ' + __alloT('stem.behaviorlab.fr_ready', 'reinforce the next press') : ''))

              )

            ),


            // ── Probability Weights bar chart ──

            React.createElement("div", {

              style: Object.assign({ background: 'rgba(30,41,59,0.55)', borderRadius: 14, padding: '14px', border: '1px solid rgba(71,85,105,0.3)' }, glass)

            },

              React.createElement("h4", { className: "text-[11px] text-slate-200 font-bold mb-2 uppercase tracking-wider" }, __alloT('stem.behaviorlab.behavior_probability_weights', "\uD83D\uDCCA Behavior Probability Weights")),

              React.createElement("div", { className: "space-y-1" },

                sortedWeights.map(function (w) {

                  var pct = maxWeight > 0 ? Math.round((w.weight / maxWeight) * 100) : 0;

                  var isSandboxTarget = blLevel === 6 && w.action === blSandboxTarget;

                  var highlight = w.isTarget || isSandboxTarget;

                  return React.createElement("div", { key: w.action, className: "flex items-center gap-2" },

                    React.createElement("span", { className: "text-[11px] w-20 truncate " + (highlight ? 'text-amber-300 font-bold' : 'text-slate-200') },

                      (highlight ? '\uD83C\uDFAF ' : '') + w.action),

                    React.createElement("div", { className: "flex-1 h-3.5 rounded-full overflow-hidden", style: { background: 'rgba(30,41,59,0.6)' } },

                      React.createElement("div", {

                        className: "h-full rounded-full transition-all duration-500",

                        style: {

                          width: pct + '%',

                          background: highlight ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : (ACTION_COLORS[w.action] || '#475569')

                        }

                      })

                    ),

                    React.createElement("span", { className: "text-[11px] text-slate-200 w-8 text-right font-mono" }, Math.round(w.weight))

                  );

                })

              )

            ),


            // ── Cumulative Record ──

            React.createElement("div", {

              style: Object.assign({ borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(245,158,11,0.2)' }, glass)

            },

              React.createElement("canvas", {

                id: "bl-cumrecord-canvas",
                role: "img",
                'aria-label': blT('stem.behaviorlab.cumrecord_label', 'Cumulative response record chart. Score: {n} of {goal}.', { n: d.blLevelScore || 0, goal: currentLevel ? currentLevel.goal : 0 }),

                style: { width: '100%', height: 130, display: 'block' }

              })

            ),


            // ── ABC Log with CSV export ──

            blAbcLog.length > 0 && React.createElement("div", {

              style: Object.assign({ background: 'rgba(30,41,59,0.55)', borderRadius: 14, padding: '14px', border: '1px solid rgba(71,85,105,0.3)' }, glass)

            },

              React.createElement("div", { className: "flex items-center justify-between mb-2" },

                React.createElement("h4", { className: "text-[11px] text-slate-200 font-bold uppercase tracking-wider" }, __alloT('stem.behaviorlab.abc_data_log', "\uD83D\uDCCB ABC Data Log")),

                // CSV Export button

                React.createElement("button", { "aria-label": __alloT('stem.behaviorlab.export_abc_data_as_csv', "Export ABC Data as CSV"),

                  onClick: function () {

                    // ── CSV export ──────────────────────────────────────────
                    // This is the tool's one data pipeline out, and its destination is
                    // a school psychologist's spreadsheet, so it has to survive Excel:
                    //
                    //  * A quote inside a value must be DOUBLED. The old writer wrapped
                    //    values in quotes and escaped nothing, so a single " anywhere in
                    //    the log would tear the row apart from that column onward.
                    //  * A UTF-8 BOM, or Excel on Windows reads the file as the ANSI
                    //    codepage — and every consequence in this log carries an emoji,
                    //    so every row would arrive mojibaked.
                    //  * CRLF, which is what the CSV spec actually says.
                    //  * A leading ' on anything starting = + - @ tab or CR. Spreadsheets
                    //    execute those as formulas. Nothing in the log starts that way
                    //    today; a data export should not depend on that staying true.
                    //  * A readable timestamp. The column was labelled "Timestamp" and
                    //    contained a 13-digit epoch integer, which is not a timestamp to
                    //    anyone opening the file.
                    function csvCell(v) {
                      var out = (v === null || v === undefined) ? '' : String(v);
                      if (/^[=+\-@\t\r]/.test(out)) out = "'" + out;
                      return '"' + out.split('"').join('""') + '"';
                    }
                    function csvTime(ms) {
                      if (!ms) return '';
                      try {
                        var dt = new Date(ms);
                        var pad = function (n) { return (n < 10 ? '0' : '') + n; };
                        return dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate())
                          + ' ' + pad(dt.getHours()) + ':' + pad(dt.getMinutes()) + ':' + pad(dt.getSeconds());
                      } catch (err) { return ''; }
                    }
                    var csvRows = [['Tick', 'Antecedent', 'Behavior', 'Consequence', 'Time'].map(csvCell).join(',')];
                    blAbcLog.slice().reverse().forEach(function (e) {
                      csvRows.push([csvCell(e.tick), csvCell(e.a), csvCell(e.b), csvCell(e.c), csvCell(csvTime(e.t))].join(','));
                    });
                    // The log is newest-first on screen because that is what a live
                    // observer wants; a data file is read oldest-first, which is why the
                    // rows above are reversed.
                    var blob = new Blob(['\uFEFF' + csvRows.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8;' });

                    var url = URL.createObjectURL(blob);

                    var a = document.createElement('a');

                    a.href = url; a.download = 'abc_log_level' + blLevel + '.csv';

                    document.body.appendChild(a); a.click(); document.body.removeChild(a);

                    URL.revokeObjectURL(url);

                    if (addToast) addToast(__alloT('stem.behaviorlab.toast_abc_exported', '\uD83D\uDCE5 ABC log exported as CSV.'), 'success');

                  },

                  className: "px-3 py-1 rounded-lg text-[11px] font-bold bg-slate-700 text-slate-100 hover:bg-slate-600 transition-all border border-slate-600/40 active:scale-[0.97]"

                }, __alloT('stem.behaviorlab.export_csv', "\uD83D\uDCE5 Export CSV"))

              ),

              React.createElement("div", { className: "space-y-0.5 max-h-40 overflow-y-auto" },

                blAbcLog.slice(0, 15).map(function (entry, idx) {

                  return React.createElement("div", { key: idx, className: "flex gap-2 text-xs py-1 border-b border-slate-700/30" },

                    React.createElement("span", { className: "text-slate-200 w-8 font-mono" }, '#' + entry.tick),

                    React.createElement("span", { className: "text-blue-300 w-24 truncate", title: blT('stem.behaviorlab.abc_antecedent_tip', 'Antecedent: {v}', { v: entry.a }) }, "A: " + entry.a),

                    React.createElement("span", { className: "text-amber-300 flex-1 truncate", title: blT('stem.behaviorlab.abc_behavior_tip', 'Behaviour: {v}', { v: entry.b }) }, "B: " + entry.b),

                    React.createElement("span", { className: "text-emerald-300 w-36 truncate", title: blT('stem.behaviorlab.abc_consequence_tip', 'Consequence: {v}', { v: entry.c }) }, "C: " + entry.c)

                  );

                })

              )

            ),


            // === LEVEL BADGES (Progress Tracker) ===
            React.createElement("div", {
              style: Object.assign({ background: 'rgba(30,41,59,0.55)', borderRadius: 14, padding: '14px', border: '1px solid rgba(139,92,246,0.2)' }, glass)
            },
              React.createElement("h3", { className: "text-[11px] text-slate-200 font-bold mb-2 uppercase tracking-wider" }, __alloT('stem.behaviorlab.progress_badges', "\uD83C\uDFC6 Progress Badges")),
              React.createElement("div", { className: "flex flex-wrap gap-2 justify-center" },
                LEVELS.filter(function(l) { return l.id <= 9; }).map(function(l) {
                  var badge = LEVEL_BADGES[l.id];
                  var earned = blCompletedLevels.indexOf(l.id) >= 0;
                  var isCurrent = blLevel === l.id;
                  return React.createElement("div", { role: "button", tabIndex: 0, onKeyDown: function(e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.target.click(); } },  key: l.id,
                    // opacity-50 dropped the locked badges' label to 4.33:1 against
                    // the panel. Greyscale plus the 🔒 glyph already say "locked"
                    // without leaning on the alpha, so the dimming is gentler now.
                    className: "text-center cursor-pointer transition-all " + (isCurrent ? 'scale-110' : '') + (earned ? '' : ' opacity-80 grayscale'),
                    "aria-label": badge.name + ': ' + badge.desc + (earned ? __alloT('stem.behaviorlab.badge_earned', ' — Earned') : __alloT('stem.behaviorlab.badge_locked', ' — Locked')),
                    title: badge.name + ': ' + badge.desc + (earned ? __alloT('stem.behaviorlab.badge_earned_paren', ' (Earned)') : __alloT('stem.behaviorlab.badge_locked_paren', ' (locked)')),
                    onClick: function() { if (earned || isCurrent) { upd('blLevel', l.id); upd('blPhase', 'intro'); upd('blLevelScore', 0); upd('blTick', 0); } }
                  },
                    React.createElement("div", { className: "text-2xl " + (isCurrent ? 'animate-bounce motion-reduce:animate-none' : '') }, badge.icon),
                    React.createElement("div", { className: "text-[11px] font-bold " + (earned ? 'text-amber-400' : 'text-slate-200') }, 'L' + l.id),
                    earned ? React.createElement("div", { className: "text-[11px] text-green-400" }, __alloT('stem.behaviorlab.earned', '\u2713 Earned')) : React.createElement("div", { className: "text-[11px] text-slate-200" }, '\uD83D\uDD12')
                  );
                })
              ),
              React.createElement("div", { className: "text-center mt-2 text-[11px] text-slate-200" },
                blCompletedLevels.length + "/9 levels mastered \u2022 " + (blCompletedLevels.length >= 9 ? '\uD83C\uDF1F ABA Master!' : blCompletedLevels.length >= 5 ? __alloT('stem.behaviorlab.rank_in_training', '\u2B50 Behaviour Analyst in Training') : __alloT('stem.behaviorlab.rank_keep_going', '\uD83D\uDC2D Keep experimenting'))
              )
            ),

            blSection('classroom', __alloT('stem.behaviorlab.sec_classroom', 'Where this goes next'),
              __alloT('stem.behaviorlab.sec_classroom_sub', 'Everything above is a simulated mouse. The applied K-12 practice built on this science lives in two sibling tools; what stays here is the argument about the science itself.')),

            // === MIGRATED PANELS NOW LIVE IN SCHOOL BEHAVIOR TOOLKIT ===
            // PBIS Three Tiers, Replacement Behaviors, Setting Events,
            // Acting-Out Cycle, Restraint & Seclusion, the Four Functions
            // reference, the Function Sleuth drill, the token economy and the BIP
            // drafting exercise all previously sat here. The split is finished:
            // what stays in BehaviorLab is the science and the argument about it;
            // what a school psych DOES with that science is one tool over. They've been moved out of BehaviorLab so the Skinner-
            // box visual frame is not adjacent to applied K-12 practice
            // content. The new home is stem_tool_schoolbehaviortoolkit.js.
            // This callout is the bridge — students who land in BehaviorLab
            // can find the applied content one click away.
            React.createElement("div", {
              style: Object.assign({
                background: 'linear-gradient(135deg, rgba(20,184,166,0.10), rgba(34,211,238,0.06))',
                borderRadius: 14,
                padding: '14px 16px',
                border: '1px solid rgba(20,184,166,0.30)',
                borderLeft: '4px solid #14b8a6'
              }, glass)
            },
              React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 } },
                React.createElement("div", {
                  'aria-hidden': 'true',
                  style: {
                    width: 44, height: 44, borderRadius: '50%',
                    background: 'rgba(20,184,166,0.20)',
                    border: '1.5px solid #14b8a6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, lineHeight: 1, flexShrink: 0
                  }
                }, '🏫'),
                React.createElement("div", null,
                  React.createElement("div", { style: { fontSize: 13, fontWeight: 800, color: '#5eead4', lineHeight: 1.2 } }, __alloT('stem.behaviorlab.continue_in_school_behavior_toolkit', "Continue in: School Behavior Toolkit")),
                  React.createElement("div", { style: { fontSize: 10, color: 'var(--bl-muted)', marginTop: 3, fontStyle: 'italic' } }, __alloT('stem.behaviorlab.applied_k_12_practice_what_school_psyc', "Applied K-12 practice — what school psychs and educators DO with the science"))
                )
              ),
              React.createElement("div", { style: { fontSize: 11, color: 'var(--bl-text)', lineHeight: 1.6, marginBottom: 10 } },
                __alloT('stem.behaviorlab.if_you_have_just_learned_operant_condi', "If you have just learned operant conditioning here in BehaviorLab, the next step is the K-12 practice that uses it. "),
                React.createElement("b", null, __alloT('stem.behaviorlab.we_deliberately_built_that_content_as_', "We deliberately built that content as a separate tool, not here.")),
                __alloT('stem.behaviorlab.the_skinner_box_visual_frame_should_no', " The Skinner-box visual frame should not be adjacent to \"how to handle a kid in crisis\" content \u2014 different tonal space, different ethical weight. The Toolkit covers the PBIS three-tier framework, the FBA process end to end, the four functions of behaviour and a twelve-vignette Function Sleuth for identifying them, the eight components of a BIP with a drafting exercise, a token-economy builder with its pitfalls, replacement behaviours mapped to functions, setting events (the slow triggers most plans miss), Geoff Colvin's seven-phase acting-out cycle, restraint and seclusion ethics anchored in Maine Chapter 33, CICO, and disproportionality data.")),
              React.createElement("div", { style: { fontSize: 11, color: 'var(--bl-muted)', lineHeight: 1.55, fontStyle: 'italic' } },
                __alloT('stem.behaviorlab.open_stem_lab_behavioral_science', "Open STEAM Lab → Behavioral Science → "),
                React.createElement("b", { style: { color: '#5eead4' } }, __alloT('stem.behaviorlab.school_behavior_toolkit', '"🏫 School Behavior Toolkit."')))
            ),

                        // === BEYOND PURE ABA — neurodiversity-affirming + trauma-informed ===
            // Critical-lens panel that other ABA tools rarely include. Holds
            // both 'ABA does real work' AND 'ABA has been used in ways
            // autistic adults document as harmful' as simultaneously true.
            // School-psych voice.
            React.createElement("div", {
              style: Object.assign({ background: 'rgba(30,41,59,0.55)', borderRadius: 14, padding: '14px', border: '1px solid rgba(167,139,250,0.25)' }, glass)
            },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("h4", { className: "text-[11px] text-slate-200 font-bold uppercase tracking-wider" }, __alloT('stem.behaviorlab.beyond_pure_aba_neurodiversity_affirmi', "🧭 Beyond Pure ABA — neurodiversity-affirming + trauma-informed")),
                React.createElement("button", { onClick: function() { upd('blShowBeyond', !d.blShowBeyond); },
                  className: "transition-colors text-[11px] text-purple-400 hover:text-purple-300"
                }, d.blShowBeyond ? __alloT('stem.behaviorlab.hide', 'Hide') : 'View →')
              ),
              d.blShowBeyond && React.createElement("div", null,
                React.createElement("div", { className: "text-[11px] text-slate-200 italic mb-3", style: { lineHeight: 1.55 } },
                  __alloT('stem.behaviorlab.operant_conditioning_is_a_powerful_set', "Operant conditioning is a powerful set of tools AND has been used in ways the autistic community has documented as harmful. Good modern practice holds both truths at once. School psychs and BCBAs working in K-12 settings need the critical lens to apply ABA ethically — not just the technical mechanics.")),
                React.createElement("div", { className: "space-y-2" },
                  BEYOND_ABA.map(function(b, bi) {
                    return React.createElement("div", {
                      key: 'beyond-' + bi,
                      style: {
                        background: 'rgba(15,23,42,0.6)',
                        borderRadius: 10,
                        padding: '10px 12px',
                        border: '1px solid rgba(100,116,139,0.25)',
                        borderLeft: '3px solid ' + b.color
                      }
                    },
                      React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 } },
                        React.createElement("div", {
                          'aria-hidden': 'true',
                          style: {
                            width: 32, height: 32, borderRadius: '50%',
                            background: b.color + '22',
                            border: '1.5px solid ' + b.color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 16, lineHeight: 1, flexShrink: 0
                          }
                        }, b.icon),
                        React.createElement("div", { style: { fontSize: 12, fontWeight: 800, color: b.color } }, b.name)
                      ),
                      React.createElement("div", { style: { fontSize: 11, color: 'var(--bl-text)', lineHeight: 1.55, marginBottom: 6 } }, b.desc),
                      React.createElement("div", { style: { fontSize: 9, color: 'var(--bl-muted)', fontStyle: 'italic', letterSpacing: '0.02em' } },
                        '📚 ', b.source)
                    );
                  })
                ),
                React.createElement("div", {
                  style: {
                    marginTop: 10, padding: 10, borderRadius: 8,
                    background: 'rgba(96,165,250,0.06)',
                    border: '1px solid rgba(96,165,250,0.18)',
                    color: 'var(--bl-text)', fontSize: 10, lineHeight: 1.6, fontStyle: 'italic'
                  }
                },
                  __alloT('stem.behaviorlab.identity_first_language_follows_commun', "💡 Identity-first language follows community-consensus norms (Kenny et al. 2016; Bury et al. 2020; Taboas et al. 2023). The Behavior Lab teaches the science of behavior; this panel teaches the ethics of applying it to humans who can tell us what they want."))
              )
            ),

            // === Backlink to Disability Voices (SEL Hub) ===
            // Named autistic + disabled voices belong in SEL Hub, NOT
            // alongside Skinner-box imagery. This is the bridge — a
            // clearly-marked callout that points students who have just
            // read the critical-frame panels above to the dedicated
            // tool where the people the field has been done TO are
            // centered, not relegated to a sidebar in a behavior-
            // science tool. Tonal/ethical boundary, deliberate.
            React.createElement("div", {
              style: Object.assign({
                background: 'linear-gradient(135deg, rgba(244,114,182,0.10), rgba(167,139,250,0.06))',
                borderRadius: 14,
                padding: '14px 16px',
                border: '1px solid rgba(244,114,182,0.30)',
                borderLeft: '4px solid #f472b6'
              }, glass)
            },
              React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 } },
                React.createElement("div", {
                  'aria-hidden': 'true',
                  style: {
                    width: 44, height: 44, borderRadius: '50%',
                    background: 'rgba(244,114,182,0.20)',
                    border: '1.5px solid #f472b6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, lineHeight: 1, flexShrink: 0
                  }
                }, '🎙️'),
                React.createElement("div", null,
                  React.createElement("div", { style: { fontSize: 13, fontWeight: 800, color: '#f9a8d4', lineHeight: 1.2 } }, __alloT('stem.behaviorlab.continue_in_disability_voices_sel_hub', "Continue in: Disability Voices (SEL Hub)")),
                  React.createElement("div", { style: { fontSize: 10, color: 'var(--bl-muted)', marginTop: 3, fontStyle: 'italic' } }, __alloT('stem.behaviorlab.named_autistic_and_disabled_advocates_', "Named autistic and disabled advocates, not behavioral subjects"))
                )
              ),
              React.createElement("div", { style: { fontSize: 11, color: 'var(--bl-text)', lineHeight: 1.6, marginBottom: 10 } },
                __alloT('stem.behaviorlab.if_you_have_just_read_the_critical_fra', "If you have just read the critical-frame panels above, the next step is to hear from the people whose work shaped — and critiqued — applied behavior analysis. "),
                React.createElement("b", null, __alloT('stem.behaviorlab.we_deliberately_built_that_content_in_', "We deliberately built that content in the SEL Hub, not here.")),
                __alloT('stem.behaviorlab.putting_named_real_autistic_adults_ins', " Putting named real autistic adults inside a tool whose central image is a Skinner box would be exactly what the disability community has documented as harmful. The tool you want includes Ari Ne'eman, Temple Grandin, Damian Milton, Henny Kupferstein, Kassiane Asasumasu, Mel Baggs, Lydia X. Z. Brown, and Patty Berne — with documented quotes, context, and a curated reading list.")),
              React.createElement("div", { style: { fontSize: 11, color: 'var(--bl-muted)', lineHeight: 1.55, fontStyle: 'italic' } },
                __alloT('stem.behaviorlab.open_sel_hub_identity_care', "Open SEL Hub → Identity & Care → "),
                React.createElement("b", { style: { color: '#f9a8d4' } }, __alloT('stem.behaviorlab.disability_voices', '"🎤 Disability Voices."')))
            ),

            blSection('schedules', __alloT('stem.behaviorlab.sec_schedules', 'Schedules of reinforcement'),
              __alloT('stem.behaviorlab.sec_schedules_sub', 'Back to the chamber: how the timing of reinforcement shapes the pattern of responding.')),

            // === SCHEDULE COMPARISON CANVAS ===
            React.createElement("div", {
              style: Object.assign({ background: 'rgba(30,41,59,0.55)', borderRadius: 14, padding: '14px', border: '1px solid rgba(245,158,11,0.2)' }, glass)
            },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("h4", { className: "text-[11px] text-slate-200 font-bold uppercase tracking-wider" }, __alloT('stem.behaviorlab.schedule_comparison', "\uD83D\uDCC8 Schedule Comparison")),
                React.createElement("button", { onClick: function() { upd('blSchedCanvas', !blSchedCanvas); },
                  className: "transition-colors text-[11px] text-amber-400 hover:text-amber-300"
                }, blSchedCanvas ? __alloT('stem.behaviorlab.hide', 'Hide') : __alloT('stem.behaviorlab.compare_schedules_arrow', 'Compare Schedules \u2192'))
              ),
              blSchedCanvas && React.createElement("div", null,
                React.createElement("div", { className: "text-[11px] text-slate-200 italic mb-2" }, __alloT('stem.behaviorlab.watch_how_different_reinforcement_sche', "Four schedules, one session each, drawn on the same scales so the slopes are comparable. Tick marks under a line are reinforcer deliveries. The pattern each one produces is named under its own plot — the skill is seeing it before you read it.")),
                // Canvas for animated cumulative records
                React.createElement("canvas", {
                  id: "bl-sched-compare-canvas",
                  role: 'img',
                  'aria-label': __alloT('stem.behaviorlab.schedule_comparison_chart', 'Animated cumulative response records comparing fixed ratio, variable ratio, fixed interval, and variable interval schedules.'),
                  style: { width: '100%', height: 286, display: 'block', borderRadius: 10, border: '1px solid rgba(100,116,139,0.3)' },
                  ref: function(cvs) {
                    if (!cvs) return;
                    var w = cvs.parentElement.offsetWidth || 400;
                    if (cvs.width !== w) cvs.width = w;
                    if (cvs.height !== 286) cvs.height = 286;
                    var ctx = cvs.getContext('2d');
                    ctx.fillStyle = '#0f172a';
                    ctx.fillRect(0, 0, w, 286);

                    // ── Small multiples, 2x2 ────────────────────────────────
                    // Cells are capped in width and near-square on purpose. A
                    // cumulative record says what it has to say through CHANGES IN
                    // SLOPE, and slope is unreadable on a plot twenty times wider
                    // than it is tall — which is what a full-width strip gives you.
                    // Scales are shared across all four: "VR climbs faster than VI"
                    // is the comparison, so per-cell autoscaling would erase it.
                    var schedTypes = SCHEDULE_TYPES;
                    var maxT = 100;                     // a window on the record
                    var tick = blSchedTick || 0;
                    var animLen = Math.min(tick, maxT);

                    var records = schedTypes.map(function(sc, k) { return blScheduleRecord(sc, k * 7 + 3, maxT); });
                    var maxR = 10;
                    records.forEach(function(r) { if (r.total > maxR) maxR = r.total; });
                    maxR = Math.ceil(maxR / 10) * 10;

                    var LOOK_FOR = {
                      FR: __alloT('stem.behaviorlab.cmp_fr', 'Break and run: a pause after every pellet, then a burst.'),
                      VR: __alloT('stem.behaviorlab.cmp_vr', 'High and steady. No pauses \u2014 the next pellet could be any press.'),
                      FI: __alloT('stem.behaviorlab.cmp_fi', 'Scallop: almost nothing early, accelerating as the interval runs out.'),
                      VI: __alloT('stem.behaviorlab.cmp_vi', 'Low and steady. Responding does not make the pellet come sooner.')
                    };

                    var cellW = Math.min(Math.floor((w - 36) / 2), 330);
                    var gridW = cellW * 2 + 12;
                    var gx0 = Math.max(8, Math.floor((w - gridW) / 2));
                    var plotH = 84;
                    var cellH = 130;

                    ctx.font = '9px monospace';
                    ctx.fillStyle = '#94a3b8';
                    ctx.textAlign = 'left';
                    ctx.fillText(__alloT('stem.behaviorlab.canvas_cumulative_responses', 'Cumulative responses'), 6, 10);

                    schedTypes.forEach(function(sch, si) {
                      var rec = records[si];
                      var col = si % 2, row = Math.floor(si / 2);
                      var x0 = gx0 + col * (cellW + 12);
                      var y0 = 18 + row * cellH;
                      var cx = function(t) { return x0 + (t / maxT) * cellW; };
                      var cy = function(c) { return y0 + plotH - (Math.min(c, maxR) / maxR) * plotH; };

                      ctx.fillStyle = 'rgba(148,163,184,0.04)';
                      ctx.fillRect(x0, y0, cellW, plotH);
                      ctx.strokeStyle = 'rgba(100,116,139,0.28)';
                      ctx.lineWidth = 0.5;
                      ctx.strokeRect(x0 + 0.5, y0 + 0.5, cellW - 1, plotH - 1);

                      ctx.fillStyle = sch.color;
                      ctx.font = 'bold 10px monospace';
                      ctx.textAlign = 'left';
                      ctx.fillText(sch.abbrev, x0 + 4, y0 - 4);

                      ctx.beginPath();
                      ctx.strokeStyle = sch.color;
                      ctx.lineWidth = 1.75;
                      for (var t = 0; t < animLen; t++) {
                        if (t === 0) ctx.moveTo(cx(t), cy(rec.resp[t]));
                        else ctx.lineTo(cx(t), cy(rec.resp[t]));
                      }
                      ctx.stroke();

                      ctx.lineWidth = 1;
                      for (var ri = 0; ri < rec.reinf.length; ri++) {
                        var rt = rec.reinf[ri];
                        if (rt >= animLen) break;
                        ctx.beginPath();
                        ctx.moveTo(cx(rt), cy(rec.resp[rt]) + 1);
                        ctx.lineTo(cx(rt), cy(rec.resp[rt]) + 6);
                        ctx.stroke();
                      }

                      // What to look for, under its own curve rather than in a
                      // paragraph above the canvas listing all four at once.
                      ctx.fillStyle = '#9fb0c4';
                      ctx.font = '9px sans-serif';
                      var words = (LOOK_FOR[sch.id] || '').split(' ');
                      var line = '', ly = y0 + plotH + 12;
                      for (var wi = 0; wi < words.length; wi++) {
                        var test = line ? line + ' ' + words[wi] : words[wi];
                        if (ctx.measureText(test).width > cellW - 6 && line) {
                          ctx.fillText(line, x0 + 2, ly);
                          line = words[wi];
                          ly += 11;
                        } else {
                          line = test;
                        }
                      }
                      if (line) ctx.fillText(line, x0 + 2, ly);
                    });
                    ctx.textAlign = 'left';

                    // Animate
                    if (tick < maxT && !blSchedPaused) {
                      setTimeout(function() { upd('blSchedTick', tick + 2); }, 50);
                    }
                  }
                }),
                // Controls
                React.createElement("div", { className: "flex gap-2 mt-2 justify-center" },
                  React.createElement("button", { "aria-label": __alloT('stem.behaviorlab.toggle_schedule_animation', "Toggle schedule animation"),
                    onClick: function() { upd('blSchedPaused', !blSchedPaused); },
                    className: "px-3 py-1 rounded-lg text-[11px] font-bold transition-all " + (blSchedPaused ? 'bg-amber-700 text-white' : 'bg-slate-700 text-slate-100')
                  }, blSchedPaused ? __alloT('stem.behaviorlab.play_btn', '\u25B6 Play') : __alloT('stem.behaviorlab.pause_btn2', '\u23F8 Pause')),
                  React.createElement("button", { "aria-label": __alloT('stem.behaviorlab.reset_schedule_animation', "Reset schedule animation"),
                    onClick: function() { upd('blSchedTick', 0); upd('blSchedPaused', false); },
                    className: "transition-colors px-3 py-1 rounded-lg text-[11px] font-bold bg-slate-700 text-slate-100 hover:bg-slate-600 focus:ring-2 focus:ring-cyan-400 focus:outline-none active:scale-[0.97]"
                  }, __alloT('stem.behaviorlab.reset_2', '\u21BB Reset'))
                ),
                // Schedule details
                React.createElement("div", { className: "grid grid-cols-2 gap-2 mt-3" },
                  SCHEDULE_TYPES.map(function(sch, si) {
                    return React.createElement("div", { key: si,
                      className: "rounded-lg p-2 border transition-all hover:scale-[1.02]",
                      style: { borderColor: sch.color + '60', background: sch.color + '10' }
                    },
                      React.createElement("div", { className: "flex items-center gap-1 mb-1" },
                        React.createElement("div", { className: "w-3 h-3 rounded-full", style: { background: sch.color } }),
                        React.createElement("span", { className: "text-[11px] font-black text-white" }, sch.name),
                        React.createElement("span", { className: "text-[11px] font-mono", style: { color: sch.color } }, '(' + sch.abbrev + ')')
                      ),
                      React.createElement("div", { className: "text-[11px] text-slate-200" }, sch.desc),
                      React.createElement("div", { className: "text-[11px] text-amber-400 mt-1 italic" }, '\uD83D\uDCA1 ' + sch.example)
                    );
                  })
                )
              )
            ),

            // === SCHEDULE SLEUTH (net-new mini-game) ===
            // Show ONE unlabeled cumulative-response curve. Player picks which schedule
            // produced it. Tests the same pedagogy as the Comparison canvas above, but
            // requires reasoning *about* the curve shape rather than passively viewing it.
            React.createElement("div", {
              style: Object.assign({ background: 'rgba(30,41,59,0.55)', borderRadius: 14, padding: '14px', border: '1px solid rgba(245,158,11,0.25)' }, glass)
            },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("h4", { className: "text-[11px] text-slate-200 font-bold uppercase tracking-wider" }, __alloT('stem.behaviorlab.schedule_sleuth_identify_the_schedule_', "\uD83D\uDD75\uFE0F Schedule Sleuth \u2014 identify the schedule from its curve")),
                React.createElement("button", {
                  onClick: function() { upd('blShowSleuth', !d.blShowSleuth); },
                  className: "transition-colors text-[11px] text-amber-400 hover:text-amber-300"
                }, d.blShowSleuth ? __alloT('stem.behaviorlab.hide', 'Hide') : __alloT('stem.behaviorlab.play_arrow', 'Play \u2192'))
              ),
              d.blShowSleuth && (function() {
                var sleuthIdx = (d.blSleuthIdx == null) ? -1 : d.blSleuthIdx;
                var sleuthSeed = d.blSleuthSeed || 0;
                var sleuthAnswered = !!d.blSleuthAnswered;
                var sleuthPick = d.blSleuthPick;
                var sleuthScore = d.blSleuthScore || 0;
                var sleuthRounds = d.blSleuthRounds || 0;
                var sleuthBestStreak = d.blSleuthBest || 0;
                var sleuthStreak = d.blSleuthStreak || 0;
                // Start a new round if not initialized
                function startRound() {
                  var nextSeed = ((sleuthSeed * 16807 + 11) % 2147483647) || 7;
                  var nextIdx = nextSeed % SCHEDULE_TYPES.length;
                  upd('blSleuthIdx', nextIdx);
                  upd('blSleuthSeed', nextSeed);
                  upd('blSleuthAnswered', false);
                  upd('blSleuthPick', null);
                }
                if (sleuthIdx < 0) {
                  return React.createElement("div", { className: "text-center py-4" },
                    React.createElement("p", { className: "text-[11px] text-slate-300 mb-3 italic" }, __alloT('stem.behaviorlab.you_will_see_one_unlabeled_cumulative_', "You will see one unlabeled cumulative-response curve. Pick which schedule produced it. The curve shape is the only clue.")),
                    React.createElement("button", {
                      onClick: startRound,
                      "aria-label": __alloT('stem.behaviorlab.start_schedule_sleuth', "Start Schedule Sleuth"),
                      className: "transition-colors px-4 py-2 rounded-lg bg-amber-700 text-white font-bold text-[11px] hover:bg-amber-800 focus:outline-none focus:ring-2 ring-amber-300 active:scale-[0.97]"
                    }, __alloT('stem.behaviorlab.start_the_game', "\uD83D\uDD75\uFE0F Start the game"))
                  );
                }
                var sch = SCHEDULE_TYPES[sleuthIdx];
                // One generator, shared with the Schedule Comparison animation.
                var sleuthRec = blScheduleRecord(sch, sleuthSeed);
                var sleuthBlocks = blScheduleBlocks(sleuthRec, 10);
                // Wider and taller than the old 320x110, and stretched to the panel
                // rather than letterboxed in the middle of it: at 200 ticks across
                // 320px an FI scallop was three pixels wide and could not be read,
                // which made the puzzle unanswerable for the reason the puzzle
                // exists. Strokes opt out of the stretch via non-scaling-stroke.
                var WIDTH = 640, HEIGHT = 200, MARGIN_X = 26, MARGIN_Y = 12;
                var T_MAX = BL_SCHED_T, R_MAX = BL_SCHED_R;
                function sx(i) { return MARGIN_X + (i / (T_MAX - 1)) * (WIDTH - 2 * MARGIN_X); }
                function sy(c) { return HEIGHT - MARGIN_Y - (Math.min(c, R_MAX) / R_MAX) * (HEIGHT - 2 * MARGIN_Y); }
                var points = sleuthRec.resp;
                var pointsScaled = points.map(function(c, i) {
                  return sx(i).toFixed(1) + ',' + sy(c).toFixed(1);
                }).join(' ');
                // Choices: when answered, color the picked + correct buttons. Otherwise neutral.
                function pick(idx) {
                  if (sleuthAnswered) return;
                  var correct = idx === sleuthIdx;
                  var newScore = sleuthScore + (correct ? 1 : 0);
                  var newStreak = correct ? (sleuthStreak + 1) : 0;
                  var newBest = Math.max(sleuthBestStreak, newStreak);
                  upd('blSleuthAnswered', true);
                  upd('blSleuthPick', idx);
                  upd('blSleuthScore', newScore);
                  upd('blSleuthRounds', sleuthRounds + 1);
                  upd('blSleuthStreak', newStreak);
                  upd('blSleuthBest', newBest);
                  if (addToast) addToast(correct ? '\u2705 Correct \u2014 ' + sch.name : '\u274C Not quite \u2014 it was ' + sch.name, correct ? 'success' : 'info');
                }
                var pct = sleuthRounds > 0 ? Math.round((sleuthScore / sleuthRounds) * 100) : 0;
                return React.createElement("div", null,
                  // Score header
                  React.createElement("div", { className: "flex items-center justify-between mb-2 text-[11px] flex-wrap gap-2" },
                    React.createElement("div", { className: "flex gap-3 items-center" },
                      React.createElement("span", { className: "text-slate-300" }, __alloT('stem.behaviorlab.round', "Round "), React.createElement("strong", { className: "text-white" }, sleuthRounds + (sleuthAnswered ? '' : '+1'))),
                      React.createElement("span", { className: "text-slate-300" }, __alloT('stem.behaviorlab.streak', "Streak "), React.createElement("strong", { className: "text-amber-400" }, sleuthStreak)),
                      React.createElement("span", { className: "text-slate-300" }, __alloT('stem.behaviorlab.best', "Best "), React.createElement("strong", { className: "text-emerald-400" }, sleuthBestStreak)),
                      sleuthRounds > 0 && React.createElement("span", { className: "text-slate-300" }, __alloT('stem.behaviorlab.accuracy', "Accuracy "), React.createElement("strong", { className: "text-cyan-400" }, pct + '%'))
                    )
                  ),
                  // ── Primer: how to read a cumulative-response curve ──
                  // Auto-opens on round 0; collapses once the student has
                  // played at least one round. Re-openable via the summary.
                  React.createElement("details", {
                    open: sleuthRounds === 0,
                    style: { background: 'rgba(15,23,42,0.5)', borderRadius: 10, border: '1px solid rgba(100,116,139,0.3)', marginBottom: 10 }
                  },
                    React.createElement("summary", { className: "cursor-pointer text-[11px] font-bold px-3 py-2 select-none text-cyan-300 select-none" }, __alloT('stem.behaviorlab.how_to_read_this_curve_click_to_toggle', '📜 How to read this curve (click to toggle)')),
                    React.createElement("div", { className: "px-3 pb-3 space-y-2 text-[11px] text-slate-300" },
                      React.createElement("p", { className: "leading-relaxed" },
                        // "each REINFORCED response" was wrong, and wrong in a way that
                        // breaks the reading skill this panel teaches: EVERY response
                        // steps the line up, which is precisely why a flat stretch means
                        // the subject stopped responding rather than stopped being paid.
                        // Reinforcers are the tick marks, not the steps.
                        React.createElement("strong", null, __alloT('stem.behaviorlab.cumulative_response_curve', "Cumulative-response curve")), __alloT('stem.behaviorlab.every_response_adds_one_to_the_y_axis', ': every response — reinforced or not — adds one to the y-axis, so the line can only rise. Flat segments = no responding. Steep segments = rapid responding. The tick marks under the line show where a reinforcer was delivered.')
                      ),
                      React.createElement("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-1.5" },
                        [
                          { abbrev: 'FR', name: __alloT('stem.behaviorlab.fixed_ratio_2', 'Fixed Ratio'),     pattern: 'High rate with predictable pause after each reinforcer.', color: '#f59e0b' },
                          { abbrev: 'VR', name: __alloT('stem.behaviorlab.variable_ratio_2', 'Variable Ratio'),  pattern: 'High and steady. No pauses. Resistant to extinction.',    color: '#f87171' },
                          { abbrev: 'FI', name: __alloT('stem.behaviorlab.fixed_interval_2', 'Fixed Interval'),  pattern: 'Scallop shape: slow after reinforcer, fast near the end.', color: '#60a5fa' },
                          { abbrev: 'VI', name: __alloT('stem.behaviorlab.variable_interval_2', 'Variable Interval'), pattern: 'Low and steady. Predictable but slow.',                color: '#10b981' }
                        ].map(function(s, i) {
                          return React.createElement('div', { key: i, style: { background: 'rgba(30,41,59,0.6)', border: '1px solid ' + s.color + '55', borderRadius: 6, padding: '6px 8px' } },
                            React.createElement('div', { style: { color: s.color, fontWeight: 800, fontSize: 10 } }, s.abbrev + ' · ' + s.name),
                            React.createElement('div', { className: 'text-[10px] text-slate-300 leading-tight' }, s.pattern)
                          );
                        })
                      ),
                      React.createElement('p', { className: 'text-[10px] italic text-slate-400 pt-1 border-t border-slate-700' },
                        __alloT('stem.behaviorlab.tip_focus_on_shape_not_absolute_height', 'Tip: focus on shape, not absolute height. The curve below is unlabeled until you guess.')
                      )
                    )
                  ),
                  // SVG curve (the puzzle)
                  React.createElement("div", { style: { background: 'var(--bl-canvas)', borderRadius: 10, padding: 8, border: '1px solid rgba(100,116,139,0.3)' } },
                    React.createElement("svg", {
                      viewBox: '0 0 ' + WIDTH + ' ' + HEIGHT,
                      width: '100%', height: HEIGHT,
                      // Stretch to the panel instead of letterboxing a 640-wide
                      // drawing in the middle of a 1000-wide card.
                      preserveAspectRatio: 'none',
                      role: 'img',
                      'aria-label': sleuthAnswered ? 'Cumulative-response curve for ' + sch.name : 'Unlabeled cumulative-response curve. Identify the schedule from its shape. The same record is given as numbers below.',
                      style: { display: 'block' }
                    },
                      // Grid
                      [0.25, 0.5, 0.75].map(function(g) {
                        var gy = MARGIN_Y + g * (HEIGHT - 2 * MARGIN_Y);
                        return React.createElement('line', { key: 'gy' + g, x1: MARGIN_X, x2: WIDTH - MARGIN_X, y1: gy, y2: gy, stroke: 'rgba(100,116,139,0.22)', strokeWidth: 1, vectorEffect: 'non-scaling-stroke' });
                      }),
                      [0.25, 0.5, 0.75].map(function(g) {
                        var gx = MARGIN_X + g * (WIDTH - 2 * MARGIN_X);
                        return React.createElement('line', { key: 'gx' + g, x1: gx, x2: gx, y1: MARGIN_Y, y2: HEIGHT - MARGIN_Y, stroke: 'rgba(100,116,139,0.22)', strokeWidth: 1, vectorEffect: 'non-scaling-stroke' });
                      }),
                      // Axes labels
                      React.createElement('text', { x: MARGIN_X, y: 10, fontSize: 9, fill: '#94a3b8', fontFamily: 'monospace' }, __alloT('stem.behaviorlab.cumulative_responses', 'Cumulative responses')),
                      React.createElement('text', { x: WIDTH - 46, y: HEIGHT - 2, fontSize: 9, fill: '#94a3b8', fontFamily: 'monospace' }, __alloT('stem.behaviorlab.time', 'Time \u2192')),
                      // The curve \u2014 color reveals only after answered
                      React.createElement('polyline', {
                        points: pointsScaled, fill: 'none',
                        stroke: sleuthAnswered ? sch.color: 'var(--bl-text)',
                        strokeWidth: 2, strokeLinejoin: 'round', strokeLinecap: 'round',
                        vectorEffect: 'non-scaling-stroke'
                      }),
                      // Reinforcement marks. A real cumulative recorder deflects the
                      // pen at each reinforcer, and it is the single most useful cue
                      // on the chart: the pause you are asked to spot is the one that
                      // follows a mark. Showing WHEN reinforcement happened does not
                      // give away WHICH schedule produced it.
                      sleuthRec.reinf.map(function(t, i) {
                        return React.createElement('line', {
                          key: 'r' + i,
                          x1: sx(t), x2: sx(t),
                          y1: sy(points[t]) - 1, y2: sy(points[t]) + 7,
                          stroke: sleuthAnswered ? sch.color : '#94a3b8',
                          strokeWidth: 1.5, vectorEffect: 'non-scaling-stroke'
                        });
                      })
                    ),
                    React.createElement('div', { style: { marginTop: 4, fontSize: 9.5, color: 'var(--bl-muted)', textAlign: 'right' } },
                      __alloT('stem.behaviorlab.tick_marks_are_reinforcers', 'Tick marks below the line = reinforcer delivered'))
                  ),
                  // \u2500\u2500 The same record, as numbers \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
                  // A curve is a picture, and this activity was unattemptable with a
                  // screen reader: "cumulative-response curve" was the whole of the
                  // alt text. This table carries exactly the information a sighted
                  // student reads off the shape \u2014 responses per block of time, and
                  // where the reinforcers fell \u2014 and deliberately no more. Naming the
                  // pattern would answer the question the puzzle is asking.
                  React.createElement("details", {
                    style: { background: 'rgba(15,23,42,0.5)', borderRadius: 10, border: '1px solid rgba(100,116,139,0.3)', marginTop: 8 }
                  },
                    React.createElement("summary", { className: "cursor-pointer text-[11px] font-bold px-3 py-2 select-none text-cyan-300" },
                      __alloT('stem.behaviorlab.show_the_record_as_numbers', '\ud83d\udd22 The same record, as numbers')),
                    React.createElement("div", { className: "px-3 pb-3", style: { overflowX: 'auto' } },
                      React.createElement("table", { style: { width: '100%', borderCollapse: 'collapse', fontSize: 10.5, color: 'var(--bl-text)' } },
                        React.createElement("caption", { style: { captionSide: 'top', textAlign: 'left', fontSize: 10, color: 'var(--bl-muted)', paddingBottom: 6 } },
                          __alloT('stem.behaviorlab.responses_in_each_block', 'Responses made in each block of 20 time units, and the running total at the end of the block.')),
                        React.createElement("thead", null,
                          React.createElement("tr", null,
                            React.createElement("th", { scope: 'col', style: { textAlign: 'left', padding: '3px 6px', borderBottom: '1px solid var(--bl-border)' } }, __alloT('stem.behaviorlab.time_block', 'Time block')),
                            React.createElement("th", { scope: 'col', style: { textAlign: 'right', padding: '3px 6px', borderBottom: '1px solid var(--bl-border)' } }, __alloT('stem.behaviorlab.responses_in_block', 'Responses')),
                            React.createElement("th", { scope: 'col', style: { textAlign: 'right', padding: '3px 6px', borderBottom: '1px solid var(--bl-border)' } }, __alloT('stem.behaviorlab.running_total', 'Running total')),
                            React.createElement("th", { scope: 'col', style: { textAlign: 'right', padding: '3px 6px', borderBottom: '1px solid var(--bl-border)' } }, __alloT('stem.behaviorlab.reinforcers_in_block', 'Reinforcers'))
                          )
                        ),
                        React.createElement("tbody", null,
                          sleuthBlocks.map(function(b, bi) {
                            var marks = sleuthRec.reinf.filter(function(t) { return t >= b.from && t <= b.to; }).length;
                            return React.createElement("tr", { key: bi },
                              React.createElement("th", { scope: 'row', style: { textAlign: 'left', padding: '3px 6px', fontWeight: 600 } }, b.from + '\u2013' + b.to),
                              React.createElement("td", { style: { textAlign: 'right', padding: '3px 6px', fontVariantNumeric: 'tabular-nums' } }, b.count),
                              React.createElement("td", { style: { textAlign: 'right', padding: '3px 6px', fontVariantNumeric: 'tabular-nums' } }, points[b.to]),
                              React.createElement("td", { style: { textAlign: 'right', padding: '3px 6px', fontVariantNumeric: 'tabular-nums' } }, marks)
                            );
                          })
                        )
                      )
                    )
                  ),
                  // Picker buttons
                  React.createElement("div", { className: "grid grid-cols-2 gap-2 mt-3", role: 'radiogroup', 'aria-label': __alloT('stem.behaviorlab.pick_the_schedule', 'Pick the schedule') },
                    SCHEDULE_TYPES.map(function(opt, oi) {
                      var isPicked = sleuthAnswered && sleuthPick === oi;
                      var isCorrect = sleuthAnswered && oi === sleuthIdx;
                      var bg, border, color;
                      if (sleuthAnswered) {
                        if (isCorrect) { bg = '#064e3b'; border = '#22c55e'; color = '#bbf7d0'; }
                        else if (isPicked) { bg = '#7f1d1d'; border = '#f87171'; color = '#fecaca'; }
                        else { bg = 'rgba(30,41,59,0.5)'; border = 'rgba(100,116,139,0.4)'; color = '#94a3b8'; }
                      } else {
                        bg = 'rgba(30,41,59,0.7)'; border = opt.color + '60'; color = '#e2e8f0';
                      }
                      return React.createElement('button', {
                        key: oi, role: 'radio',
                        'aria-checked': isPicked ? 'true' : 'false',
                        'aria-label': opt.name + ' (' + opt.abbrev + ')',
                        disabled: sleuthAnswered,
                        onClick: function() { pick(oi); },
                        style: { padding: '8px 10px', borderRadius: 8, background: bg, color: color, border: '2px solid ' + border, cursor: sleuthAnswered ? 'default' : 'pointer', fontSize: 11, fontWeight: 700, textAlign: 'left', transition: 'all 0.15s' }
                      },
                        React.createElement('div', { style: { fontFamily: 'monospace', fontSize: 11, color: opt.color, marginBottom: 2, fontWeight: 800 } }, opt.abbrev),
                        React.createElement('div', { style: { fontSize: 11, fontWeight: 800 } }, opt.name)
                      );
                    })
                  ),
                  // Feedback
                  sleuthAnswered && React.createElement("div", {
                    className: "mt-3 rounded-lg p-3",
                    style: {
                      background: sleuthPick === sleuthIdx ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)',
                      border: '1px solid ' + (sleuthPick === sleuthIdx ? 'rgba(34,197,94,0.45)' : 'rgba(239,68,68,0.45)')
                    }
                  },
                    React.createElement("div", { className: "text-[11px] font-bold mb-1", style: { color: sleuthPick === sleuthIdx ? '#86efac' : '#fca5a5' } },
                      sleuthPick === sleuthIdx ? '\u2705 Correct \u2014 ' + sch.name : '\u274C Not quite \u2014 it was ' + sch.name + (sleuthPick != null ? ' (you picked ' + SCHEDULE_TYPES[sleuthPick].abbrev + ')' : '')
                    ),
                    React.createElement("div", { className: "text-[11px] text-slate-200 leading-relaxed mb-2" },
                      sch.pattern === 'high-pause' ? __alloT('stem.behaviorlab.sleuth_why_fr', 'Fixed Ratio creates a *post-reinforcement pause* after each delivery, then a rapid burst of responses to reach the next reinforcer. Look for the staircase shape with brief flat plateaus.')
                      : sch.pattern === 'high-steady' ? __alloT('stem.behaviorlab.sleuth_why_vr', 'Variable Ratio produces the *steepest, smoothest* climb because the next reinforcer could come at any moment. This is the slot-machine pattern \u2014 most resistant to extinction.')
                      : sch.pattern === 'scallop' ? __alloT('stem.behaviorlab.sleuth_why_fi', 'Fixed Interval produces a *scallop*: slow responding right after reinforcement, then accelerating as the interval ends and the next reinforcer becomes available. Look for repeating concave curves.')
                      : __alloT('stem.behaviorlab.sleuth_why_vi', 'Variable Interval produces a *low, steady* rate. The next reinforcer arrives at unpredictable times, so a moderate steady rate maximizes the chance of catching it. Look for the lowest, smoothest line.')
                    ),
                    React.createElement("button", {
                      onClick: startRound,
                      "aria-label": __alloT('stem.behaviorlab.next_round', "Next round"),
                      className: "transition-colors px-4 py-1.5 rounded-lg bg-amber-700 text-white font-bold text-[11px] hover:bg-amber-800 focus:outline-none focus:ring-2 ring-amber-300 active:scale-[0.97]"
                    }, __alloT('stem.behaviorlab.next_round_2', "\u27A1\uFE0F Next round"))
                  )
                );
              })()
            ),

            blSection('analysis', __alloT('stem.behaviorlab.sec_analysis', 'Analysing the contingency'),
              __alloT('stem.behaviorlab.sec_analysis_sub', 'Naming what a consequence actually did \u2014 and telling the two kinds of conditioning apart.')),

            // === REINFORCEMENT / PUNISHMENT 2x2 MATRIX ===
            React.createElement("div", {
              style: Object.assign({ background: 'rgba(30,41,59,0.55)', borderRadius: 14, padding: '14px', border: '1px solid rgba(139,92,246,0.2)' }, glass)
            },
              React.createElement("h4", { className: "text-[11px] text-slate-200 font-bold mb-2 uppercase tracking-wider" }, __alloT('stem.behaviorlab.reinforcement_punishment_matrix', "\u2696\uFE0F Reinforcement \u0026 Punishment Matrix")),
              React.createElement("div", { className: "text-[11px] text-slate-200 italic mb-2" }, __alloT('stem.behaviorlab.the_4_quadrants_of_operant_conditionin', "The 4 quadrants of operant conditioning. Click each cell to learn more:")),
              // Column headers
              React.createElement("div", { className: "grid grid-cols-3 gap-1 mb-1" },
                React.createElement("div", null),
                React.createElement("div", { className: "text-center text-[11px] font-bold text-emerald-400 uppercase" }, __alloT('stem.behaviorlab.add_stimulus', "\u2795 Add Stimulus")),
                React.createElement("div", { className: "text-center text-[11px] font-bold text-blue-400 uppercase" }, __alloT('stem.behaviorlab.remove_stimulus', "\u2796 Remove Stimulus"))
              ),
              // Row 1: Reinforcement
              React.createElement("div", { className: "grid grid-cols-3 gap-1 mb-1" },
                React.createElement("div", { className: "flex items-center text-[11px] font-bold text-green-400 uppercase pr-1" }, __alloT('stem.behaviorlab.increase_behavior', "\u2B06 Increase Behavior")),
                REINFORCE_MATRIX.filter(function(m) { return m.row === 0; }).map(function(m, mi) {
                  var isActive = blMatrixIdx === m.id;
                  return React.createElement("div", { role: "button", tabIndex: 0, onKeyDown: function(e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.target.click(); } },  key: m.id,
                    onClick: function() { upd('blMatrixIdx', isActive ? null : m.id); },
                    className: "cursor-pointer rounded-xl p-2 border-2 text-center transition-all  hover:shadow-md hover:-translate-y-0.5" + (isActive ? 'scale-105 shadow-lg' : 'hover:scale-[1.02]'),
                    style: { borderColor: isActive ? m.color : m.color + '40', background: isActive ? m.color + '20' : 'rgba(30,41,59,0.6)' }
                  },
                    React.createElement("div", { className: "text-xl mb-0.5" }, m.icon),
                    React.createElement("div", { className: "text-[11px] font-black", style: { color: m.color } }, m.abbrev),
                    React.createElement("div", { className: "text-[11px] text-slate-200" }, m.name)
                  );
                })
              ),
              // Row 2: Punishment
              React.createElement("div", { className: "grid grid-cols-3 gap-1" },
                React.createElement("div", { className: "flex items-center text-[11px] font-bold text-red-400 uppercase pr-1" }, __alloT('stem.behaviorlab.decrease_behavior', "\u2B07 Decrease Behavior")),
                REINFORCE_MATRIX.filter(function(m) { return m.row === 1; }).map(function(m, mi) {
                  var isActive = blMatrixIdx === m.id;
                  return React.createElement("div", { role: "button", tabIndex: 0, onKeyDown: function(e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.target.click(); } },  key: m.id,
                    onClick: function() { upd('blMatrixIdx', isActive ? null : m.id); },
                    className: "cursor-pointer rounded-xl p-2 border-2 text-center transition-all  hover:shadow-md hover:-translate-y-0.5" + (isActive ? 'scale-105 shadow-lg' : 'hover:scale-[1.02]'),
                    style: { borderColor: isActive ? m.color : m.color + '40', background: isActive ? m.color + '20' : 'rgba(30,41,59,0.6)' }
                  },
                    React.createElement("div", { className: "text-xl mb-0.5" }, m.icon),
                    React.createElement("div", { className: "text-[11px] font-black", style: { color: m.color } }, m.abbrev),
                    React.createElement("div", { className: "text-[11px] text-slate-200" }, m.name)
                  );
                })
              ),
              // Detail panel for selected quadrant
              blMatrixIdx && (function() {
                var sel = REINFORCE_MATRIX.filter(function(m) { return m.id === blMatrixIdx; })[0];
                if (!sel) return null;
                return React.createElement("div", {
                  className: "mt-3 rounded-xl p-3 border",
                  style: { borderColor: sel.color + '60', background: sel.color + '08' }
                },
                  React.createElement("div", { className: "text-[11px] font-black mb-1", style: { color: sel.color } }, sel.icon + ' ' + sel.name + ' (' + sel.abbrev + ')'),
                  React.createElement("div", { className: "text-[11px] text-slate-100 mb-1" }, sel.formal),
                  React.createElement("div", { className: "text-[11px] text-slate-200 mb-2" },
                    React.createElement("span", { className: "font-bold text-emerald-400" }, sel.action),
                    __alloT('stem.behaviorlab.a_stimulus_to', ' a stimulus to '),
                    React.createElement("span", { className: "font-bold text-blue-400" }, sel.effect),
                    ' behavior'
                  ),
                  React.createElement("div", { className: "text-[11px] text-amber-400 font-medium mb-1" }, __alloT('stem.behaviorlab.real_world_examples', '\uD83D\uDCA1 Real-world examples:')),
                  React.createElement("ul", { className: "space-y-0.5 ml-2" },
                    sel.examples.map(function(ex, exi) {
                      return React.createElement("li", { key: exi, className: "text-[11px] text-slate-200 list-disc" }, ex);
                    })
                  )
                );
              })()
            ),

            // === OPERANT vs CLASSICAL CONDITIONING COMPARISON ===
            React.createElement("div", {
              style: Object.assign({ background: 'rgba(30,41,59,0.55)', borderRadius: 14, padding: '14px', border: '1px solid rgba(139,92,246,0.2)' }, glass)
            },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("h4", { className: "text-[11px] text-slate-200 font-bold uppercase tracking-wider" }, __alloT('stem.behaviorlab.operant_vs_classical_conditioning', "\uD83D\uDD2C Operant vs Classical Conditioning")),
                React.createElement("button", { "aria-label": __alloT('stem.behaviorlab.aspect', "Aspect"),
                  onClick: function() { upd('blShowCondCompare', !blShowCondCompare); },
                  className: "transition-colors text-[11px] text-violet-400 hover:text-violet-300"
                }, blShowCondCompare ? __alloT('stem.behaviorlab.hide', 'Hide') : __alloT('stem.behaviorlab.compare_arrow', 'Compare \u2192'))
              ),
              blShowCondCompare && React.createElement("div", null,
                React.createElement("div", { className: "rounded-xl overflow-hidden border border-slate-700/30" },
                  // Header row
                  React.createElement("div", { className: "grid grid-cols-3 bg-slate-800/60" },
                    React.createElement("div", { className: "p-1.5 text-[11px] font-bold text-slate-200 uppercase" }, __alloT('stem.behaviorlab.aspect_2', 'Aspect')),
                    React.createElement("div", { className: "p-1.5 text-[11px] font-bold text-amber-400 uppercase text-center border-l border-slate-700/30" }, __alloT('stem.behaviorlab.operant', '\uD83D\uDC2D Operant')),
                    React.createElement("div", { className: "p-1.5 text-[11px] font-bold text-violet-400 uppercase text-center border-l border-slate-700/30" }, __alloT('stem.behaviorlab.classical', '\uD83D\uDC36 Classical'))
                  ),
                  // Data rows
                  CONDITIONING_COMPARE.map(function(row, ri) {
                    return React.createElement("div", { key: ri, className: "grid grid-cols-3 " + (ri % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-800/20') },
                      React.createElement("div", { className: "p-1.5 text-[11px] font-medium text-slate-100 border-t border-slate-700/20" }, row.aspect),
                      React.createElement("div", { className: "p-1.5 text-[11px] text-amber-300/80 border-t border-l border-slate-700/20" }, row.operant),
                      React.createElement("div", { className: "p-1.5 text-[11px] text-violet-300/80 border-t border-l border-slate-700/20" }, row.classical)
                    );
                  })
                )
              )
            ),

            // === SCENARIO CHALLENGES ===
            React.createElement("div", {
              style: Object.assign({ background: 'rgba(30,41,59,0.55)', borderRadius: 14, padding: '14px', border: '1px solid rgba(239,68,68,0.2)' }, glass)
            },
              // "Clinical Scenarios" reads as case practice. They are written
              // scenarios with one defensible answer each \u2014 practice at applying the
              // concepts, which is a different and smaller claim.
              React.createElement("h4", { className: "text-[11px] text-slate-200 font-bold mb-2 uppercase tracking-wider" }, "\uD83C\uDFAF " + __alloT('stem.behaviorlab.practice_scenarios', 'Practice Scenarios') + " (" + (blScenarioIdx + 1) + "/" + SCENARIO_CHALLENGES.length + ")"),
              // Streak indicator
              blStreak > 0 && React.createElement("div", { className: "text-center mb-2" },
                React.createElement("span", { className: "inline-block px-3 py-0.5 rounded-full text-[11px] font-bold " + (blStreak >= 5 ? 'bg-amber-700 text-white behaviorlab-glow-pulse' : blStreak >= 3 ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-700 text-slate-100') },
                  '\uD83D\uDD25 ' + blStreak + ' streak!' + (blStreak >= 5 ? ' AMAZING!' : blStreak >= 3 ? __alloT('stem.behaviorlab.streak_on_fire', ' On fire!') : ''))
              ),
              // Score
              React.createElement("div", { className: "flex justify-between items-center mb-2" },
                React.createElement("span", { className: "text-[11px] text-slate-200" }, blT('stem.behaviorlab.stat_score_of', 'Score: {n}/{total}', { n: blScenarioScore, total: blScenarioTotal })),
                React.createElement("span", { className: "text-[11px] text-amber-500" }, blT('stem.behaviorlab.stat_best_streak', 'Best streak: {n}', { n: blBestStreak }))
              ),
              (function() {
                var sc = SCENARIO_CHALLENGES[blScenarioIdx];
                if (!sc) return null;
                var answered = blScenarioAnswer >= 0;
                var isCorrect = blScenarioAnswer === sc.correct;
                return React.createElement("div", null,
                  // Scenario description
                  React.createElement("div", { className: "bg-slate-800/60 rounded-xl p-3 mb-2 border border-slate-700/30" },
                    React.createElement("div", { className: "text-[11px] text-slate-100 leading-relaxed" }, sc.scenario)
                  ),
                  React.createElement("div", { className: "text-[11px] font-bold text-white mb-2" }, sc.question),
                  // Options
                  React.createElement("div", { className: "space-y-1.5 mb-2" },
                    sc.options.map(function(opt, oi) {
                      var isSelected = blScenarioAnswer === oi;
                      var isRight = oi === sc.correct;
                      var bgClass = !answered ? 'transition-colors bg-slate-800/40 border-slate-600 hover:border-slate-400 cursor-pointer' :
                        isRight ? 'bg-emerald-900/30 border-emerald-500' :
                        isSelected && !isRight ? 'bg-red-900/30 border-red-500' : 'bg-slate-800/20 border-slate-700 opacity-40';
                      return React.createElement("button", { key: oi,
                        onClick: function() {
                          if (answered) return;
                          upd('blScenarioAnswer', oi);
                          var newTotal = blScenarioTotal + 1;
                          upd('blScenarioTotal', newTotal);
                          if (oi === sc.correct) {
                            var newScore = blScenarioScore + 1;
                            upd('blScenarioScore', newScore);
                            var newStreak = blStreak + 1;
                            upd('blStreak', newStreak);
                            if (newStreak > blBestStreak) upd('blBestStreak', newStreak);
                            if (addToast) addToast(blT('stem.behaviorlab.toast_scenario_correct', '\u2705 Correct. Streak: {n}.', { n: newStreak }), 'success');
                          } else {
                            upd('blStreak', 0);
                            if (addToast) addToast(__alloT('stem.behaviorlab.toast_scenario_wrong', '\u274C Not quite \u2014 read the explanation.'), 'info');
                          }
                        },
                        className: "w-full text-left p-2 rounded-lg border text-[11px] transition-all " + bgClass,
                        disabled: answered
                      },
                        React.createElement("span", { className: "font-bold mr-1 " + (answered && isRight ? 'text-emerald-400' : answered && isSelected ? 'text-red-400' : 'text-slate-200') },
                          String.fromCharCode(65 + oi) + '.'),
                        React.createElement("span", { className: answered && isRight ? 'text-emerald-300' : answered && isSelected && !isRight ? 'text-red-300' : 'text-slate-100' }, ' ' + opt)
                      );
                    })
                  ),
                  // Feedback
                  answered && React.createElement("div", { className: "space-y-2" },
                    React.createElement("div", { className: "rounded-xl p-2.5 text-[11px] " + (isCorrect ? 'bg-emerald-900/20 border border-emerald-700/30 text-emerald-300' : 'bg-red-900/20 border border-red-700/30 text-red-300') },
                      React.createElement("span", { className: "font-bold" }, isCorrect ? '\u2705 ' : '\u274C '),
                      sc.explain
                    ),
                    React.createElement("div", { className: "rounded-xl p-2.5 text-[11px] bg-blue-900/20 border border-blue-700/30 text-blue-300" },
                      React.createElement("span", { className: "font-bold" }, __alloT('stem.behaviorlab.better_approach', '\uD83D\uDCA1 Better approach: ')),
                      sc.better
                    ),
                    React.createElement("button", { "aria-label": __alloT('stem.behaviorlab.next_scenario', "Next Scenario ("),
                      onClick: function() {
                        var nextIdx = (blScenarioIdx + 1) % SCENARIO_CHALLENGES.length;
                        upd('blScenarioIdx', nextIdx);
                        upd('blScenarioAnswer', -1);
                      },
                      className: "w-full py-1.5 rounded-lg text-[11px] font-bold bg-gradient-to-r from-red-600 to-amber-700 text-white hover:from-red-600 hover:to-amber-700 transition-all"
                    }, blT('stem.behaviorlab.next_scenario', 'Next scenario \u2192 ({n}/{total})', { n: (blScenarioIdx + 1) % SCENARIO_CHALLENGES.length + 1, total: SCENARIO_CHALLENGES.length }))
                  )
                );
              })()
            ),

            blSection('reference', __alloT('stem.behaviorlab.sec_reference', 'Reference'),
              __alloT('stem.behaviorlab.sec_reference_sub', 'History, terminology and quick cards \u2014 including the parts of this history the field is still arguing about.')),

            // === ABA TIMELINE ===
            React.createElement("div", {
              style: Object.assign({ background: 'rgba(30,41,59,0.55)', borderRadius: 14, padding: '14px', border: '1px solid rgba(59,130,246,0.2)' }, glass)
            },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("h4", { className: "text-[11px] text-slate-200 font-bold uppercase tracking-wider" }, __alloT('stem.behaviorlab.aba_history_timeline', "\uD83D\uDCC5 ABA History Timeline")),
                React.createElement("button", { onClick: function() { upd('blShowTimeline', !blShowTimeline); },
                  className: "transition-colors text-[11px] text-blue-400 hover:text-blue-300"
                }, blShowTimeline ? __alloT('stem.behaviorlab.hide', 'Hide') : __alloT('stem.behaviorlab.explore_arrow', 'Explore \u2192'))
              ),
              blShowTimeline && React.createElement("div", { className: "relative ml-4" },
                // Vertical line
                React.createElement("div", { className: "absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-amber-500 to-emerald-500" }),
                React.createElement("div", { className: "space-y-2 pl-6 max-h-72 overflow-y-auto" },
                  ABA_MILESTONES.map(function(ms, mi) {
                    var eraColor = ms.era === 'foundations' ? 'border-blue-500 bg-blue-900/20' :
                                   ms.era === 'growth' ? 'border-amber-500 bg-amber-900/20' :
                                   ms.era === 'applied' ? 'border-emerald-500 bg-emerald-900/20' : 'border-violet-500 bg-violet-900/20';
                    var dotColor = ms.era === 'foundations' ? 'bg-blue-500' :
                                   ms.era === 'growth' ? 'bg-amber-500' :
                                   ms.era === 'applied' ? 'bg-emerald-500' : 'bg-violet-500';
                    return React.createElement("div", { key: mi, className: "relative" },
                      // Dot on timeline
                      React.createElement("div", { className: "absolute -left-[27px] top-1 w-3 h-3 rounded-full border-2 border-slate-900 " + dotColor }),
                      // Card
                      React.createElement("div", { className: "rounded-lg p-2 border " + eraColor },
                        React.createElement("div", { className: "flex items-center gap-1.5" },
                          React.createElement("span", { className: "text-lg" }, ms.icon),
                          React.createElement("span", { className: "text-[11px] font-black text-amber-400 font-mono" }, ms.year),
                          React.createElement("span", { className: "text-[11px] text-slate-100 leading-tight" }, ms.event)
                        )
                      )
                    );
                  })
                ),
                // Era legend
                React.createElement("div", { className: "flex gap-3 mt-2 justify-center" },
                  [{ name: __alloT('stem.behaviorlab.foundations', 'Foundations'), color: 'bg-blue-500' }, { name: __alloT('stem.behaviorlab.growth', 'Growth'), color: 'bg-amber-500' }, { name: __alloT('stem.behaviorlab.applied', 'Applied'), color: 'bg-emerald-500' }, { name: __alloT('stem.behaviorlab.modern', 'Modern'), color: 'bg-violet-500' }].map(function(era) {
                    return React.createElement("div", { key: era.name, className: "flex items-center gap-1" },
                      React.createElement("div", { className: "w-2 h-2 rounded-full " + era.color }),
                      React.createElement("span", { className: "text-[11px] text-slate-200" }, era.name)
                    );
                  })
                )
              )
            ),

            // === QUICK REFERENCE CARDS ===
            React.createElement("div", {
              style: Object.assign({ background: 'rgba(30,41,59,0.55)', borderRadius: 14, padding: '14px', border: '1px solid rgba(16,185,129,0.2)' }, glass)
            },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("h4", { className: "text-[11px] text-slate-200 font-bold uppercase tracking-wider" }, __alloT('stem.behaviorlab.quick_reference_cards', "\uD83D\uDCCB Quick Reference Cards")),
                React.createElement("button", { onClick: function() { upd('blShowQuickRef', !blShowQuickRef); },
                  className: "transition-colors text-[11px] text-emerald-400 hover:text-emerald-300"
                }, blShowQuickRef ? __alloT('stem.behaviorlab.hide', 'Hide') : __alloT('stem.behaviorlab.view_arrow', 'View \u2192'))
              ),
              blShowQuickRef && React.createElement("div", { className: "grid grid-cols-2 gap-2" },
                QUICK_REF_CARDS.map(function(card, ci) {
                  return React.createElement("div", { key: ci,
                    className: "rounded-xl p-2.5 border transition-all hover:scale-[1.02]",
                    style: { borderColor: card.color + '40', background: card.color + '08' }
                  },
                    React.createElement("div", { className: "flex items-center gap-1 mb-1" },
                      React.createElement("span", { className: "text-lg" }, card.icon),
                      React.createElement("span", { className: "text-[11px] font-black", style: { color: card.color } }, card.title)
                    ),
                    React.createElement("div", { className: "text-[11px] text-slate-200 leading-relaxed" }, card.content)
                  );
                })
              )
            ),


            // === ABA GLOSSARY ===
            React.createElement("div", {
              style: Object.assign({ background: 'rgba(30,41,59,0.55)', borderRadius: 14, padding: '14px', border: '1px solid rgba(148,163,184,0.2)' }, glass)
            },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("h4", { className: "text-[11px] text-slate-200 font-bold uppercase tracking-wider" }, blT('stem.behaviorlab.aba_glossary_n', '\uD83D\uDCD6 ABA glossary ({n} terms)', { n: ABA_GLOSSARY.length })),
                React.createElement("button", { onClick: function() { upd('blShowGlossary', !d.blShowGlossary); },
                  className: "transition-colors text-[11px] text-slate-200 hover:text-slate-100"
                }, d.blShowGlossary ? __alloT('stem.behaviorlab.hide', 'Hide') : __alloT('stem.behaviorlab.browse_arrow', 'Browse \u2192'))
              ),
              d.blShowGlossary && React.createElement("div", null,
                React.createElement("div", { className: "space-y-0.5 max-h-64 overflow-y-auto" },
                  ABA_GLOSSARY.map(function(gl, gli) {
                    var isActive = d.blGlossaryIdx === gli;
                    return React.createElement("div", { role: "button", tabIndex: 0, onKeyDown: function(e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.target.click(); } },  key: gli,
                      onClick: function() { upd('blGlossaryIdx', isActive ? null : gli); },
                      className: "cursor-pointer rounded-lg p-1.5 border transition-all " + (isActive ? 'bg-slate-700 border-amber-500/50' : 'transition-colors bg-slate-700/20 border-slate-700 hover:border-slate-500')
                    },
                      React.createElement("div", { className: "text-[11px] font-bold " + (isActive ? 'text-amber-300' : 'text-slate-100') }, gl.term),
                      isActive && React.createElement("div", { className: "text-[11px] text-slate-200 mt-0.5" }, gl.def)
                    );
                  })
                )
              )
            ),

            // \u2500\u2500 Contingency diagram \u2500\u2500


            React.createElement("div", {

              style: Object.assign({ background: 'rgba(30,41,59,0.55)', borderRadius: 14, padding: '14px', border: '1px solid rgba(139,92,246,0.2)' }, glass)

            },

              React.createElement("h4", { className: "text-[11px] text-slate-200 font-bold mb-2 uppercase tracking-wider" }, __alloT('stem.behaviorlab.three_term_contingency_2', "\uD83D\uDD17 Three-Term Contingency")),

              React.createElement("div", { className: "flex items-center gap-2 justify-center flex-wrap" },

                React.createElement("div", { className: "bg-blue-900/40 rounded-lg px-3 py-2 text-center border border-blue-700/30 min-w-[80px]" },

                  React.createElement("p", { className: "text-[11px] text-blue-400 font-bold" }, __alloT('stem.behaviorlab.abc_antecedent', 'ANTECEDENT')),

                  React.createElement("p", { className: "text-xs text-blue-200 font-medium" }, currentLevel.contingency.a)

                ),

                React.createElement("span", { className: "text-indigo-400 text-lg font-bold tracking-tight" }, "\u2192"),

                React.createElement("div", { className: "bg-amber-900/40 rounded-lg px-3 py-2 text-center border border-amber-700/30 min-w-[80px]" },

                  React.createElement("p", { className: "text-[11px] text-amber-400 font-bold" }, __alloT('stem.behaviorlab.abc_behavior', 'BEHAVIOR')),

                  React.createElement("p", { className: "text-xs text-amber-200 font-medium" }, currentLevel.contingency.b)

                ),

                React.createElement("span", { className: "text-indigo-400 text-lg font-bold tracking-tight" }, "\u2192"),

                React.createElement("div", { className: "bg-emerald-900/40 rounded-lg px-3 py-2 text-center border border-emerald-700/30 min-w-[80px]" },

                  React.createElement("p", { className: "text-[11px] text-emerald-400 font-bold" }, __alloT('stem.behaviorlab.abc_consequence', 'CONSEQUENCE')),

                  React.createElement("p", { className: "text-xs text-emerald-200 font-medium" }, currentLevel.contingency.c)

                )

              )

            )

          );
      })();
    }
  });


})();

} // end dedup guard