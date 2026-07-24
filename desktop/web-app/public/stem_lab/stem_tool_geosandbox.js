// ═══════════════════════════════════════════
// stem_tool_geosandbox.js — 3D Geometry Sandbox Plugin (v2)
//
// ARCHITECTURE NOTES (for contributors)
// ─────────────────────────────────────
// Rendering: Three.js r128 + OrbitControls (loaded from CDN on first init).
//   Real WebGL pipeline. Touch + mouse drag for camera control are built into
//   OrbitControls. Falls back to a "WebGL unavailable" error panel if init fails.
//
// Two modes share the scene:
//   • SINGLE SHAPE (original) — pick one of 7 primitives, adjust dimensions,
//     measure volume/SA, take challenges, export STL.
//   • DIMENSIONAL STRETCH (v2, HandWaver-inspired) — build geometry by
//     stretching lower-dimensional objects into higher dimensions:
//        point → segment (1D stretch)
//        segment → rectangle (2D stretch)
//        rectangle → prism (3D stretch / extrusion)
//     Pedagogically connects the concept of dimension to a physical-feeling
//     operation. Inspired by Dimmel & Bock's HandWaver (UMaine IMRE Lab),
//     where this paradigm runs in VR with hand-tracking. In the browser we
//     use sliders + click+stretch, but the conceptual move is the same.
//
// State (in ctx.toolData.geoSandbox):
//   shape: 'box' | 'sphere' | 'cylinder' | 'cone' | 'pyramid' | 'torus' | 'prism'
//   dims: { w, h, d, r, rTop, rBot, tube, segs }
//   mode: 'single' | 'stretch'      ← v2 addition
//   construction: { objects: [...], selection: index }  ← v2 addition
//   history: [...snapshots]         ← v2 addition for undo
//   savedConstructions: { name → snapshot }  ← v2 addition
//   unitId: 'unit' | 'cm' | 'in' | 'ft' | 'm'   ← v2 addition
//   _geoExt: { badges, streak, shapesExplored, ... }
//
// Construction objects (stretch mode) are stored as:
//   { type: 'point' | 'segment' | 'rect' | 'prism', position, vector, ... }
// Each object renders as a Three.js mesh in the scene. Selection adds a
// highlight outline. "Stretch" operations create new objects from selected ones.
//
// Accessibility:
//   aria-live region #allo-live-geosandbox for SR announcements (mode switches,
//   shape changes, dimension changes — debounced). Canvas has tabIndex=0 and
//   keyboard alternatives for the OrbitControls (arrow keys to orbit, +/- zoom).
//   Reduced-motion respected.
//
// Future direction: a research collaboration with UMaine IMRE Lab could bridge
// AlloFlow's browser-based dimensional-stretch mode with HandWaver's VR
// implementation — a student would construct in the browser, then enter the
// same construction in VR for spatial exploration. See ORIENTATION.md.
//
// Contributors: run `node --check` after edits. E2E test at
// tests/e2e/geosandbox-tool.spec.ts.
// ═══════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

(function() {
  'use strict';
  // ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEM Lab tools ──
  (function() {
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();

  // ── Accessibility live region (WCAG 4.1.3) ──
  (function() {
    if (document.getElementById('allo-live-geosandbox')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-geosandbox';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.setAttribute('role', 'status');
    lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();

  // Scoped contrast lift for the Geometry Sandbox UI. The tool uses many compact
  // utility-class panels, so keep the override local to this root.
  (function() {
    if (document.getElementById('allo-geosandbox-contrast-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-geosandbox-contrast-css';
    st.textContent = [
      '#allo-geo-sandbox { color: #f8fafc; }',
      '#allo-geo-sandbox button:focus-visible, #allo-geo-sandbox input:focus-visible, #allo-geo-sandbox select:focus-visible, #allo-geo-sandbox textarea:focus-visible, #allo-geo-sandbox canvas:focus-visible { outline: 3px solid #facc15 !important; outline-offset: 2px !important; box-shadow: 0 0 0 5px rgba(250,204,21,0.28) !important; }',
      '#allo-geo-sandbox [class~="text-slate-600"], #allo-geo-sandbox [class~="text-slate-500"], #allo-geo-sandbox [class~="text-slate-400"] { color: #cbd5e1 !important; }',
      '#allo-geo-sandbox [class*="text-"][class*="/50"], #allo-geo-sandbox [class*="text-"][class*="/60"], #allo-geo-sandbox [class*="text-"][class*="/70"], #allo-geo-sandbox [class*="text-"][class*="/80"] { color: #e2e8f0 !important; }',
      '#allo-geo-sandbox input::placeholder, #allo-geo-sandbox textarea::placeholder { color: #cbd5e1 !important; opacity: 1 !important; }',
      '#allo-geo-sandbox [class*="border-slate-700"], #allo-geo-sandbox [class*="border-slate-600"], #allo-geo-sandbox [class*="border-"][class*="/20"], #allo-geo-sandbox [class*="border-"][class*="/30"], #allo-geo-sandbox [class*="border-"][class*="/40"] { border-color: #94a3b8 !important; }',
      '#allo-geo-sandbox .opacity-50 { opacity: 0.92 !important; }',
      '#allo-geo-sandbox input[type="range"] { min-height: 24px; touch-action: pan-y; }',
      '#allo-geo-sandbox .geo-hint-touch { display: none; }',
      '#geo-fullscreen-container, #geo-viewport-shell { min-width: 0; }',
      '@media (hover: none), (pointer: coarse) { #allo-geo-sandbox .geo-hint-desktop { display: none; } #allo-geo-sandbox .geo-hint-touch { display: inline; } }',
      '@media (max-width: 760px) { #geo-fullscreen-container { flex-direction: column !important; min-height: 0 !important; } #geo-control-sidebar { width: 100% !important; max-height: none !important; } #geo-viewport-shell { width: 100% !important; min-height: 360px !important; } #geo-sandbox-canvas { min-height: 360px !important; } }',
      '@media (forced-colors: active) { #allo-geo-sandbox button, #allo-geo-sandbox input, #allo-geo-sandbox select, #allo-geo-sandbox textarea, #allo-geo-sandbox canvas { forced-color-adjust: auto; border: 1px solid CanvasText !important; } #allo-geo-sandbox button:focus-visible, #allo-geo-sandbox input:focus-visible, #allo-geo-sandbox select:focus-visible, #allo-geo-sandbox textarea:focus-visible, #allo-geo-sandbox canvas:focus-visible { outline: 3px solid Highlight !important; box-shadow: none !important; } }'
    ].join('\n');
    document.head.appendChild(st);
  })();


  // ── Three.js loader (shared with archStudio in monolith, self-contained here) ──
  function ensureThreeJS(onReady, onError) {
    // Shared resilient loader: multi-CDN fallback + timeout; OrbitControls
    // stays non-fatal exactly like the old inline chain.
    window.StemLab.ensureThree({ orbit: true }).then(function () { onReady(); }).catch(function () { console.error('[GeoSandbox] Three.js failed to load'); if (onError) onError(); });
  }

  // Lazy-load the shared Prim3D sculpting primitive (window.AlloModules.Prim3D) —
  // it's a CDN sidecar, not globally present. buildObject(THREE, …) takes THREE as
  // an argument so it works with this tool's r128. cb(true/false).
  function ensurePrim3d(cb) {
    if (window.AlloModules && window.AlloModules.Prim3D) { cb(true); return; }
    var base = 'https://alloflow-cdn.pages.dev/', q = '';
    try {
      var scr = document.querySelectorAll('script[src]');
      for (var i = 0; i < scr.length; i++) {
        var src = scr[i].getAttribute('src') || '';
        var m = src.match(/^(.*\/)(?:stem_lab\/stem_tool_geosandbox|memory_palace_module|concept_graph_3d_module|prim3d_module)\.js(\?.*)?$/);
        if (m) { base = m[1]; q = m[2] || ''; break; }
      }
    } catch (e) {}
    try {
      var el = document.createElement('script'); el.src = base + 'prim3d_module.js' + q; el.async = true;
      el.onload = function() { cb(!!(window.AlloModules && window.AlloModules.Prim3D)); };
      el.onerror = function() { cb(false); };
      document.head.appendChild(el);
    } catch (e) { cb(false); }
  }

  // ── Scene management ──
  function initScene(cnv) {
    var THREE = window.THREE;
    var scene = new THREE.Scene();
    var themeBg = '#0f172a';
    try {
      themeBg = window.getComputedStyle(document.body).getPropertyValue('--allo-stem-canvas').trim() || '#0f172a';
    } catch(e) {}
    var bgLuma = 0.1;
    try {
      var bgHex = new THREE.Color(themeBg);
      bgLuma = 0.299 * bgHex.r + 0.587 * bgHex.g + 0.114 * bgHex.b;
    } catch(e) {}
    var isDarkBg = bgLuma < 0.45;
    scene.background = new THREE.Color(themeBg);
    var camera = new THREE.PerspectiveCamera(50, cnv.clientWidth / cnv.clientHeight, 0.1, 1000);
    camera.position.set(6, 5, 8);
    camera.lookAt(0, 0, 0);
    var renderer = new THREE.WebGLRenderer({ canvas: cnv, antialias: true });
    // WebXR: harmless in 2D (only affects rendering while a headset session is
    // presenting); powers an optional "Enter VR" button so a student can stand next
    // to their solid / AI sculpture at life size and walk around it.
    try { renderer.xr.enabled = true; } catch (e) {}
    renderer.setSize(cnv.clientWidth, cnv.clientHeight);
    // Geometry needs crisp edges, so bloom is opt-in for this tool.
    renderer._alloComposer = null;
    (function(){
      if (window.AlloGeoSandboxPostFXEnabled !== true) return;
      if (window.AlloPostFXEnabled === false) return;
      var _ens = function(cb){
        if (window.THREE && window.THREE.EffectComposer && window.THREE.UnrealBloomPass) { cb(); return; }
        var u = ['https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/CopyShader.js','https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/LuminosityHighPassShader.js','https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/EffectComposer.js','https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/RenderPass.js','https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/ShaderPass.js','https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/UnrealBloomPass.js'];
        var i=0; (function n(){ if(i>=u.length){cb();return;} var s=document.createElement("script"); s.src=u[i]; s.onload=function(){i++;n();}; s.onerror=function(){i++;n();}; document.head.appendChild(s); })();
      };
      _ens(function(){
        try {
          var T=window.THREE; if(!T||!T.EffectComposer||!T.RenderPass||!T.UnrealBloomPass) return;
          var rm=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
          var lp=rm||(!!navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=4); var rs=lp?0.5:1;
          var cc=new T.EffectComposer(renderer);
          cc.addPass(new T.RenderPass(scene, camera));
          cc.addPass(new T.UnrealBloomPass(new T.Vector2(Math.max(1,Math.round((cnv.clientWidth)*rs)),Math.max(1,Math.round((cnv.clientHeight)*rs))), lp?0.63:0.9, 0.35, 0.82));
          renderer._alloComposer=cc;
        } catch(e){ try{ renderer._alloComposer=null; }catch(_){} }
      });
    })();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    var prefersRM = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    // ── Soft real shadow — grounds the solid on the grid ──
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    var dir = new THREE.DirectionalLight(0xfff1dd, 1.0); // warm key vs the existing cool fill — solids read 3D
    dir.position.set(5, 10, 7.5);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    dir.shadow.camera.left = -12; dir.shadow.camera.right = 12;
    dir.shadow.camera.top = 12; dir.shadow.camera.bottom = -12;
    dir.shadow.camera.near = 0.5; dir.shadow.camera.far = 40;
    dir.shadow.radius = 4;
    scene.add(dir);
    var fill = new THREE.DirectionalLight(0xc7d2fe, 0.3);
    fill.position.set(-5, 3, -5);
    scene.add(fill);
    // Violet rim light from behind — a jewel-case sheen along top edges
    var rim = new THREE.DirectionalLight(0x8b5cf6, 0.3);
    rim.position.set(0, 6, -10);
    scene.add(rim);
    // Ground
    scene.add(new THREE.GridHelper(20, 20, isDarkBg ? 0x64748b : 0x475569, isDarkBg ? 0x334155 : 0xcbd5e1));
    // Shadow catcher — invisible plane that only shows the soft shadow
    var shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.ShadowMaterial({ opacity: isDarkBg ? 0.32 : 0.22 })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.001;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);
    // WebXR rig: while presenting, the headset drives the camera's LOCAL pose, so
    // the camera lives in a rig we seat in front of the model. At identity (the 2D
    // default) this is transform-neutral — OrbitControls keeps writing world-space
    // camera pose exactly as before.
    var xrRig = new THREE.Group(); scene.add(xrRig); xrRig.add(camera);
    // Controls
    var controls = null;
    if (THREE.OrbitControls) {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = 2;
      controls.maxDistance = 30;
      // Showroom idle spin — stops for good the moment the student takes the wheel
      if (!prefersRM) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.9;
        renderer.domElement.addEventListener('pointerdown', function() { controls.autoRotate = false; }, { once: true });
      }
    }
    // ── On-screen click-to-select (full parity with VR point-and-select) — so a
    //    student WITHOUT a headset can do everything on screen: a clean tap (not
    //    an orbit drag) on a construction object selects it, via the React bridge
    //    window._geoSelectObj. A tap is distinguished from a rotate by movement,
    //    so it coexists with OrbitControls. ──
    var _pick = { x: 0, y: 0, moved: false, down: false };
    var _pickRay = new THREE.Raycaster();
    try { if (_pickRay.params && _pickRay.params.Line) _pickRay.params.Line.threshold = 0.25; } catch (e) {}
    var _pickV2 = new THREE.Vector2();
    // Ground plane (y=0) for click-to-place: when placement is armed, a tap on empty
    // space drops a point where the ray meets the floor — no headset needed.
    var _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    var _gpHit = new THREE.Vector3();
    function _geoPickDown(e) { _pick.down = true; _pick.moved = false; _pick.x = e.clientX; _pick.y = e.clientY; }
    function _geoPickMove(e) { if (_pick.down && (Math.abs(e.clientX - _pick.x) + Math.abs(e.clientY - _pick.y)) > 6) _pick.moved = true; }
    function _geoPickUp(e) {
      var wasDown = _pick.down; _pick.down = false;
      if (!wasDown || _pick.moved) return;                       // it was an orbit drag, not a tap
      var rect = renderer.domElement.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      _pickV2.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _pickV2.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      _pickRay.setFromCamera(_pickV2, camera);
      // 1) Tap an existing construction object → select it (parity with VR point-select).
      try {
        var gs = window._geoScene; var grp = gs && gs.constructionGroup;
        if (grp && grp.children && grp.children.length) {
          var hits = _pickRay.intersectObjects(grp.children, true);
          if (hits.length) {
            var node = hits[0].object, id = null;
            while (node) { if (node.userData && node.userData.objId != null) { id = node.userData.objId; break; } node = node.parent; }
            if (id != null && window._geoSelectObj) { window._geoSelectObj(id); return; }
          }
        }
      } catch (err) {}
      // 2) Otherwise, if click-to-place is armed, drop a point on the ground plane.
      try {
        if (window._geoPlaceArmed && window._geoPlacePoint) {
          var hit = _pickRay.ray.intersectPlane(_groundPlane, _gpHit);
          if (hit) window._geoPlacePoint(_gpHit.x, _gpHit.z);   // placePoint() applies snap
        }
      } catch (err) {}
    }
    renderer.domElement.addEventListener('pointerdown', _geoPickDown);
    renderer.domElement.addEventListener('pointermove', _geoPickMove);
    renderer.domElement.addEventListener('pointerup', _geoPickUp);
    // Animate
    var animId;
    var animate = function() {
      // While an immersive session drives frames, the HEADSET owns the camera —
      // skip OrbitControls + the bloom composer (mono) and just render stereo. The
      // XR compositor schedules the frames, so no window rAF is queued here.
      var presenting = false; try { presenting = renderer.xr && renderer.xr.isPresenting; } catch (e) {}
      if (presenting) { _xrGrabFrame(); _xrSticks(); renderer.render(scene, camera); return; }
      if (!renderer.domElement.isConnected) { cancelAnimationFrame(animId); return; }
      animId = requestAnimationFrame(animate);
      renderer._geoAnimId = animId; // live handle — cleanupScene must cancel the CURRENT frame, not the stale first-frame id captured in the returned object
      if (controls) controls.update();
      var _ac=renderer._alloComposer; if(_ac){ try{ _ac.render(); }catch(e){ renderer._alloComposer=null; renderer.render(scene, camera); } } else { renderer.render(scene, camera); }
    };
    animate();
    // ── WebXR Tier 2: controllers — grip-GRAB the model (one hand = 6DOF move +
    //    rotate; two hands = scale by the distance between them). Guarded +
    //    presenting-only; never touches the 2D path. ──
    var _xrCtrlsGeo = null, _grab = null;   // _grab = {ctrl, obj, two:{ctrlB,startDist,startScale}|null}
    function _geoTarget() { var gs = window._geoScene; return (gs && (gs.sculptGroup || gs.mesh)) || null; }
    function _ctrlDist(a, b) {
      try { var pa = new THREE.Vector3().setFromMatrixPosition(a.matrixWorld), pb = new THREE.Vector3().setFromMatrixPosition(b.matrixWorld); return pa.distanceTo(pb); } catch (e) { return 1; }
    }
    function _geoHaptic(i, ms) {
      try { var sess = renderer.xr.getSession && renderer.xr.getSession(); if (!sess) return; var srcs = sess.inputSources || []; for (var k = 0; k < srcs.length; k++) { var g = srcs[k].gamepad; if (g && g.hapticActuators && g.hapticActuators[0]) { try { g.hapticActuators[0].pulse(i, ms); } catch (e) {} } } } catch (e) {}
    }
    function _grabStart(ctrl) {
      try {
        var obj = _geoTarget(); if (!obj) return;
        if (_grab && _grab.obj === obj && _grab.ctrl !== ctrl) {
          _grab.two = { ctrlB: ctrl, startDist: _ctrlDist(_grab.ctrl, ctrl) || 1, startScale: obj.scale.x || 1 };   // second hand → scale
        } else {
          ctrl.attach(obj);                          // 6DOF follow (three preserves world transform)
          _grab = { ctrl: ctrl, obj: obj, two: null };
        }
        _geoHaptic(0.5, 30);
      } catch (e) {}
    }
    function _grabEnd(ctrl) {
      try {
        if (!_grab) return;
        if (_grab.two && _grab.two.ctrlB === ctrl) { _grab.two = null; return; }   // release 2nd hand, keep holding
        if (_grab.ctrl === ctrl) {
          var obj = _grab.obj;
          if (_grab.two) { var b = _grab.two.ctrlB; try { b.attach(obj); } catch (e) {} _grab = { ctrl: b, obj: obj, two: null }; }   // hand off to the other hand
          else { try { scene.attach(obj); } catch (e) {} _grab = null; }
        }
      } catch (e) {}
    }
    function _xrGrabFrame() {
      try {
        if (_grab && _grab.two && _grab.obj) {
          var d = _ctrlDist(_grab.ctrl, _grab.two.ctrlB);
          var s = Math.max(0.2, Math.min(8, (_grab.two.startScale || 1) * (d / (_grab.two.startDist || d))));
          _grab.obj.scale.setScalar(s);
        }
      } catch (e) {}
    }
    function _xrReleaseGrab() { try { if (_grab && _grab.obj) { scene.attach(_grab.obj); } _grab = null; } catch (e) {} }
    // ── Thumbstick tuning in VR (armed edge-trigger so one flick = one step):
    //    RIGHT stick X cycles the stretch axis, Y adjusts the stretch length —
    //    routed to the React handlers so 2D + VR share one source of truth. ──
    var _stickAxArmed = false, _stickLenArmed = false;
    function _xrSticks() {
      try {
        var sess = renderer.xr.getSession && renderer.xr.getSession(); if (!sess) return;
        var srcs = sess.inputSources || [];
        for (var i = 0; i < srcs.length; i++) {
          var src = srcs[i]; if (!src || src.handedness !== 'right') continue;
          var g = src.gamepad; if (!g || !g.axes) continue;
          var ax = g.axes.length >= 4 ? g.axes[2] : (g.axes[0] || 0);
          var ay = g.axes.length >= 4 ? g.axes[3] : (g.axes[1] || 0);
          if (Math.abs(ax) > 0.7) { if (!_stickAxArmed) { _stickAxArmed = true; _geoHaptic(0.3, 20); try { if (window._geoXrAxis) window._geoXrAxis(ax > 0 ? 1 : -1); } catch (e) {} } }
          else if (Math.abs(ax) < 0.3) _stickAxArmed = false;
          if (Math.abs(ay) > 0.7) { if (!_stickLenArmed) { _stickLenArmed = true; _geoHaptic(0.3, 20); try { if (window._geoXrLen) window._geoXrLen(ay < 0 ? 0.5 : -0.5); } catch (e) {} } }   // stick up = longer
          else if (Math.abs(ay) < 0.3) _stickLenArmed = false;
        }
      } catch (e) {}
    }
    // ── In-VR caption: a text panel pinned in front of the headset so a student
    //    sees what the mic heard while immersed (visual confirmation matters most
    //    in VR, where the 2D UI is out of view). Updated by the React voice flow
    //    through window._geoScene.setVrCaption. ──
    var _vrCapCanvas = null, _vrCapTex = null, _vrCapSprite = null;
    function _geoSetVrCaption(text) {
      try {
        if (!_vrCapSprite) {
          _vrCapCanvas = document.createElement('canvas'); _vrCapCanvas.width = 512; _vrCapCanvas.height = 128;
          _vrCapTex = new THREE.CanvasTexture(_vrCapCanvas);
          _vrCapSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: _vrCapTex, transparent: true, depthTest: false, depthWrite: false }));
          _vrCapSprite.scale.set(0.95, 0.24, 1); _vrCapSprite.position.set(0, -0.5, -1.4); _vrCapSprite.renderOrder = 9998;
          camera.add(_vrCapSprite);
        }
        var t = String(text || '');
        _vrCapSprite.visible = !!t;
        if (t) {
          var cxx = _vrCapCanvas.getContext('2d');
          cxx.clearRect(0, 0, 512, 128);
          cxx.fillStyle = 'rgba(2,6,23,0.82)'; cxx.fillRect(0, 0, 512, 128);
          cxx.fillStyle = '#e0e7ff'; cxx.font = 'bold 34px sans-serif'; cxx.textAlign = 'center'; cxx.textBaseline = 'middle';
          cxx.fillText(t.length > 36 ? t.slice(0, 35) + '…' : t, 256, 64);
          _vrCapTex.needsUpdate = true;
        }
      } catch (e) {}
    }
    function _xrSetupControllersGeo() {
      if (_xrCtrlsGeo) return;
      _xrCtrlsGeo = [];
      try {
        for (var ci = 0; ci < 2; ci++) {
          var c = renderer.xr.getController(ci);
          var rg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
          var rl = new THREE.Line(rg, new THREE.LineBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.85 }));
          rl.scale.z = 5;
          c.add(rl);
          (function (ctrl) {
            ctrl.addEventListener('squeezestart', function () { _grabStart(ctrl); });
            ctrl.addEventListener('squeezeend', function () { _grabEnd(ctrl); });
            // Trigger = the primary BUILD action (reliable, not speech-dependent):
            // in stretch mode the right hand stretches the selected object and the
            // left hand adds/cycles; other modes fall back to voice. Handedness
            // comes off the XR input source on the event.
            ctrl.addEventListener('selectstart', function (ev) {
              _geoHaptic(0.5, 40);
              var hand = (ev && ev.data && ev.data.handedness) || 'right';
              try {
                if (window._geoXrPrimary) window._geoXrPrimary(hand);
                else if (window._geoVoiceTrigger) window._geoVoiceTrigger();
              } catch (e) {}
            });
          })(c);
          xrRig.add(c); _xrCtrlsGeo.push(c);
          // grip mesh — a small controller-ish box so the student sees their hands
          var gp = renderer.xr.getControllerGrip(ci);
          gp.add(new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.03, 0.09), new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.6, metalness: 0.2 })));
          xrRig.add(gp);
        }
      } catch (e) {}
    }
    // ── WebXR "Enter VR" — seats the user a few metres in front of the model and
    //    hands the view to the headset; OrbitControls resumes on exit. VR_VIEW_DIST
    //    is on-device tunable. Rejects if the session can't start (caller toasts). ──
    var VR_VIEW_DIST = 5;   // metres the user stands back from the model
    function enterVR() {
      if (!navigator.xr) return Promise.reject(new Error('no-xr'));
      return navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor'] })
        .then(function (session) {
          if (controls) controls.enabled = false;
          xrRig.position.set(0, 0, VR_VIEW_DIST); xrRig.rotation.set(0, 0, 0); xrRig.scale.setScalar(1);
          try { renderer.xr.setReferenceSpaceType('local-floor'); } catch (e) {}
          try { if (animId) cancelAnimationFrame(animId); } catch (e) {}
          _xrSetupControllersGeo();                  // Tier 2: grip-grab move/rotate/scale
          Promise.resolve(renderer.xr.setSession(session)).then(function () { renderer.setAnimationLoop(animate); });
          session.addEventListener('end', function () {
            try { renderer.setAnimationLoop(null); } catch (e) {}
            _xrReleaseGrab();                         // reparent any grabbed object back to the scene
            try { _geoSetVrCaption(''); if (window._geoVoiceCtl) window._geoVoiceCtl.stop(); } catch (e) {}
            xrRig.position.set(0, 0, 0); xrRig.rotation.set(0, 0, 0); xrRig.scale.setScalar(1);
            if (controls) controls.enabled = true;
            try { if (renderer.domElement.isConnected) animate(); } catch (e) {}   // resume 2D rAF
          });
          return session;
        });
    }
    return { scene: scene, camera: camera, renderer: renderer, controls: controls, animId: animId, mesh: null, xrRig: xrRig, enterVR: enterVR, setVrCaption: _geoSetVrCaption };
  }

  function updateMesh(gs, shapeType, dims, shapeColor, wireframe, opacity) {
    var THREE = window.THREE;
    // Remove old (traverse: the solid carries an edge-overlay child that must dispose too)
    if (gs.mesh) { gs.scene.remove(gs.mesh); gs.mesh.traverse(function(o) { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); gs.mesh = null; }
    // Create geometry
    var geometry;
    switch (shapeType) {
      case 'sphere': geometry = new THREE.SphereGeometry(dims.r || 1.5, dims.segs || 32, dims.segs || 32); break;
      case 'cylinder': geometry = new THREE.CylinderGeometry(dims.rTop || 1.5, dims.rBot || 1.5, dims.h || 3, dims.segs || 32); break;
      case 'cone': geometry = new THREE.ConeGeometry(dims.r || 1.5, dims.h || 3, dims.segs || 32); break;
      case 'pyramid':
        geometry = new THREE.ConeGeometry(geoPyramidGeometryRadius(dims.r || 1.5), dims.h || 3, 4);
        geometry.rotateY(Math.PI / 4);
        break;
      case 'torus': geometry = new THREE.TorusGeometry(dims.r || 1.5, dims.tube || 0.5, 16, dims.segs || 32); break;
      case 'prism': {
        var triShape = new THREE.Shape();
        var bw = dims.w || 3;
        triShape.moveTo(-bw / 2, 0);
        triShape.lineTo(bw / 2, 0);
        triShape.lineTo(0, dims.h || 3);
        triShape.closePath();
        geometry = new THREE.ExtrudeGeometry(triShape, { depth: dims.d || 3, bevelEnabled: false });
        geometry.center();
        break;
      }
      default: geometry = new THREE.BoxGeometry(dims.w || 3, dims.h || 3, dims.d || 3); break;
    }
    var material = new THREE.MeshPhongMaterial({
      color: new THREE.Color(shapeColor),
      wireframe: wireframe,
      transparent: opacity < 1,
      opacity: opacity,
      shininess: 80,
      flatShading: false
    });
    var mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    // Subtle edge overlay — makes faces, edges and vertices legible at a glance
    // (this is a geometry tool: the edge skeleton IS the content). Skipped in
    // wireframe mode, where the whole mesh already renders as lines.
    if (!wireframe) {
      var bgColor = gs.scene && gs.scene.background && gs.scene.background.isColor ? gs.scene.background : null;
      var edgeLuma = bgColor ? (0.299 * bgColor.r + 0.587 * bgColor.g + 0.114 * bgColor.b) : 0.1;
      var edgeColor = edgeLuma < 0.45 ? 0xffffff : 0x0f172a;
      var edgeOpacity = edgeLuma < 0.45 ? 0.36 : 0.42;
      var edgeLines = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry, 25),
        new THREE.LineBasicMaterial({ color: edgeColor, transparent: true, opacity: edgeOpacity, depthWrite: false })
      );
      mesh.add(edgeLines);
    }
    var bbox = new THREE.Box3().setFromObject(mesh);
    mesh.position.y = -bbox.min.y;
    gs.scene.add(mesh);
    gs.mesh = mesh;
  }

  function cleanupScene() {
    if (window._geoSrTimer) { clearTimeout(window._geoSrTimer); window._geoSrTimer = null; }
    if (window._geoScene) {
      cancelAnimationFrame((window._geoScene.renderer && window._geoScene.renderer._geoAnimId) || window._geoScene.animId);
      // End any live VR session and stop the XR frame loop before disposing the GL.
      try { var _r = window._geoScene.renderer; if (_r && _r.xr) { var _s = _r.xr.getSession && _r.xr.getSession(); if (_s) _s.end(); _r.setAnimationLoop(null); } } catch(e){}
      try{ if(window._geoScene.renderer && window._geoScene.renderer._alloComposer){ var _comp = window._geoScene.renderer._alloComposer; (_comp.passes||[]).forEach(function(p){if(p&&p.dispose)p.dispose();}); if (_comp.dispose) _comp.dispose(); window._geoScene.renderer._alloComposer=null; } }catch(e){}
      // Dispose the entire scene graph, not only the current mode's group. The
      // primitive mesh, grid, shadow plane, XR controllers, and caption texture
      // also own GPU resources and otherwise accumulate across tool remounts.
      try { if (window._geoScene.scene) disposeGeoObject3D(window._geoScene.scene); } catch(e){}
      if (window._geoScene.renderer) {
        window._geoScene.renderer.dispose();
        try { if (window._geoScene.renderer.forceContextLoss) window._geoScene.renderer.forceContextLoss(); } catch(e){}
      }
      if (window._geoScene.controls) window._geoScene.controls.dispose();
      window._geoScene = null;
    }
    if (_geoAudioCtx) {
      try { if (typeof _geoAudioCtx.close === 'function' && _geoAudioCtx.state !== 'closed') _geoAudioCtx.close(); } catch (e) {}
      _geoAudioCtx = null;
    }
  }

  // ── Web Audio sound effects ──
  var _geoAudioCtx = null;
  function geoSound(type) {
    try {
      if (!_geoAudioCtx) _geoAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var ac = _geoAudioCtx;
      var o = ac.createOscillator();
      var g = ac.createGain();
      o.connect(g); g.connect(ac.destination);
      switch (type) {
        case 'shapeChange':
          o.type = 'sine'; o.frequency.setValueAtTime(520, ac.currentTime);
          o.frequency.exponentialRampToValueAtTime(780, ac.currentTime + 0.08);
          g.gain.setValueAtTime(0.12, ac.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.15);
          o.start(ac.currentTime); o.stop(ac.currentTime + 0.15); break;
        case 'correct':
          o.type = 'sine'; o.frequency.setValueAtTime(523, ac.currentTime);
          o.frequency.setValueAtTime(659, ac.currentTime + 0.1);
          o.frequency.setValueAtTime(784, ac.currentTime + 0.2);
          g.gain.setValueAtTime(0.15, ac.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.35);
          o.start(ac.currentTime); o.stop(ac.currentTime + 0.35); break;
        case 'wrong':
          o.type = 'sawtooth'; o.frequency.setValueAtTime(200, ac.currentTime);
          o.frequency.exponentialRampToValueAtTime(140, ac.currentTime + 0.25);
          g.gain.setValueAtTime(0.1, ac.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.3);
          o.start(ac.currentTime); o.stop(ac.currentTime + 0.3); break;
        case 'streak':
          o.type = 'sine'; o.frequency.setValueAtTime(600, ac.currentTime);
          o.frequency.setValueAtTime(800, ac.currentTime + 0.08);
          o.frequency.setValueAtTime(1000, ac.currentTime + 0.16);
          o.frequency.setValueAtTime(1200, ac.currentTime + 0.24);
          g.gain.setValueAtTime(0.13, ac.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.4);
          o.start(ac.currentTime); o.stop(ac.currentTime + 0.4); break;
        case 'badge':
          o.type = 'sine'; o.frequency.setValueAtTime(880, ac.currentTime);
          o.frequency.setValueAtTime(1108, ac.currentTime + 0.1);
          o.frequency.setValueAtTime(1320, ac.currentTime + 0.2);
          o.frequency.setValueAtTime(1760, ac.currentTime + 0.3);
          g.gain.setValueAtTime(0.14, ac.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.5);
          o.start(ac.currentTime); o.stop(ac.currentTime + 0.5); break;
        default:
          o.type = 'sine'; o.frequency.setValueAtTime(440, ac.currentTime);
          g.gain.setValueAtTime(0.1, ac.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.12);
          o.start(ac.currentTime); o.stop(ac.currentTime + 0.12);
      }
    } catch (e) { /* audio not available */ }
  }

  // ── Badge definitions ──
  var geoBadges = {
    firstShape:      { icon: '\uD83D\uDD37', name: 'Shape Shifter',        desc: 'Explore your first 3D shape' },
    allShapes:       { icon: '\uD83C\uDF08', name: 'Shape Collector',      desc: 'Explore all 7 shape types' },
    firstChallenge:  { icon: '\uD83C\uDFAF', name: 'Challenge Accepted',   desc: 'Answer your first challenge correctly' },
    streak3:         { icon: '\uD83D\uDD25', name: 'Hat Trick',            desc: '3 challenges correct in a row' },
    streak5:         { icon: '\u26A1',        name: 'On Fire',              desc: '5 challenges correct in a row' },
    challenger10:    { icon: '\uD83C\uDFC6', name: 'Geometry Veteran',     desc: 'Complete 10 challenges' },
    wireframeToggle: { icon: '\uD83D\uDD73\uFE0F', name: 'X-Ray Vision',  desc: 'Toggle wireframe mode' },
    stlExport:       { icon: '\uD83D\uDCE6', name: '3D Printer',          desc: 'Export your first STL file' },
    dimTweaker:      { icon: '\uD83D\uDD27', name: 'Dimension Tweaker',   desc: 'Adjust dimensions 20 times' },
    geoMaster:       { icon: '\uD83C\uDF1F', name: 'Geo Master',          desc: 'Score 80%+ on 10+ challenges' },
    // \u2500\u2500 Dimensional-stretch (immersive builder) badges \u2500\u2500
    firstSeg:        { icon: '\u2500',        name: 'Into the 1st Dimension', desc: 'Stretch a point into a segment' },
    firstPlane:      { icon: '\u25AD',        name: 'Flatlander',           desc: 'Stretch a segment into a rectangle' },
    firstSolid:      { icon: '\uD83E\uDDCA',  name: 'Solid Ground',         desc: 'Build your first solid by stretching' },
    cavalieriTwin:   { icon: '\u2696\uFE0F',  name: 'Cavalieri Twin',       desc: 'A straight and a slanted prism with equal volume' },
    squareCubeBadge: { icon: '\uD83D\uDD22',  name: 'Square\u2013Cube',      desc: 'Place a scaled copy and watch volume jump' },
    taperMaker:      { icon: '\uD83D\uDD3A',  name: 'Point of It All',      desc: 'Taper a shape to a pyramid or cone' },
    revolver:        { icon: '\uD83C\uDF00',  name: 'Solid of Revolution',  desc: 'Spin a shape into a round solid' }
  };

  function checkGeoBadges(ext, updates, awardXP, addToast) {
    var newBadges = ext.badges || {};
    var changed = false;
    var checks = {
      firstShape:      function() { return (ext.shapesExplored || []).length >= 1; },
      allShapes:       function() { return (ext.shapesExplored || []).length >= 7; },
      firstChallenge:  function() { return (ext.totalCorrect || 0) >= 1; },
      streak3:         function() { return (ext.streak || 0) >= 3; },
      streak5:         function() { return (ext.streak || 0) >= 5; },
      challenger10:    function() { return (ext.totalAttempted || 0) >= 10; },
      wireframeToggle: function() { return ext.usedWireframe; },
      stlExport:       function() { return ext.usedExport; },
      dimTweaker:      function() { return (ext.dimAdjusts || 0) >= 20; },
      geoMaster:       function() { return (ext.totalAttempted || 0) >= 10 && (ext.totalCorrect || 0) / (ext.totalAttempted || 1) >= 0.8; }
    };
    Object.keys(checks).forEach(function(id) {
      if (!newBadges[id] && checks[id]()) {
        newBadges[id] = true;
        changed = true;
        var b = geoBadges[id];
        geoSound('badge');
        if (typeof awardXP === 'function') awardXP('geoSandbox', 10, b.name);
        if (typeof addToast === 'function') addToast(b.icon + ' Badge: ' + b.name + ' — ' + b.desc, 'success');
      }
    });
    if (changed) updates.badges = newBadges;
    return updates;
  }

  // ── Stretch-mode reward loop — awards badges for the dimensional builder (the
  //    original badges only covered single-shape mode) and tracks the highest
  //    dimension ever reached so the "dimension journey" spine can fill in. Reads
  //    the live construction; writes badges + maxDim into `updates`. ──
  function checkGeoStretchBadges(ext, construction, updates, awardXP, addToast) {
    var objs = (construction && construction.objects) || [];
    var newBadges = Object.assign({}, ext.badges || {});
    var maxDim = ext.maxDim || 0;
    objs.forEach(function (o) { var m = geoStretchMeasure(o); if (m && m.dim > maxDim) maxDim = m.dim; });
    var hasType = function (t) { return objs.some(function (o) { return o.type === t; }); };
    var checks = {
      firstSeg:        function () { return maxDim >= 1; },
      firstPlane:      function () { return maxDim >= 2; },
      firstSolid:      function () { return maxDim >= 3; },
      cavalieriTwin:   function () { return geoEvalMission({ test: { type: 'cavalieri' } }, objs).solved; },
      squareCubeBadge: function () { return geoEvalMission({ test: { type: 'scaled', ratio: 2 } }, objs).solved; },
      taperMaker:      function () { return hasType('pyramid'); },
      revolver:        function () { return hasType('revolution'); }
    };
    var changed = false;
    Object.keys(checks).forEach(function (id) {
      if (!newBadges[id] && checks[id]()) {
        newBadges[id] = true; changed = true;
        var b = geoBadges[id]; geoSound('badge');
        if (typeof awardXP === 'function') awardXP('geoSandbox', 10, b.name);
        if (typeof addToast === 'function') addToast(b.icon + ' Badge: ' + b.name + ' — ' + b.desc, 'success');
      }
    });
    if (maxDim !== (ext.maxDim || 0)) { updates.maxDim = maxDim; changed = true; }
    if (changed) updates.badges = newBadges;
    return changed;
  }

  // ── Volume / SA formulas by shape ──
  var formulaMap = {
    box:      { vol: 'V = l \u00D7 w \u00D7 h',           sa: 'SA = 2(lw + lh + wh)' },
    sphere:   { vol: 'V = \u2074\u2044\u2083\u03C0r\u00B3',              sa: 'SA = 4\u03C0r\u00B2' },
    cylinder: { vol: 'V = \u03C0r\u00B2h',                 sa: 'SA = 2\u03C0r(r + h)' },
    cone:     { vol: 'V = \u2153\u03C0r\u00B2h',               sa: 'SA = \u03C0r(r + l)' },
    pyramid:  { vol: 'V = \u2153Bh',                  sa: 'SA = B + \u00BDpl' },
    torus:    { vol: 'V = 2\u03C0\u00B2Rr\u00B2',               sa: 'SA = 4\u03C0\u00B2Rr' },
    prism:    { vol: 'V = \u00BDbh \u00D7 d',              sa: 'SA = bh + (b+2s)d' }
  };

  // ── Measurement tooltip descriptions ──
  var dimTooltips = {
    w:    'Horizontal distance left-to-right (x-axis)',
    h:    'Vertical distance bottom-to-top (y-axis)',
    d:    'Distance front-to-back (z-axis)',
    r:    'Distance from center to edge of shape',
    rTop: 'Radius of the circular top face',
    rBot: 'Radius of the circular bottom face',
    tube: 'Radius of the tube cross-section',
    segs: 'Number of polygon segments (more = rounder)'
  };
  // Override tooltips for specific shapes
  var shapeDimTooltips = {
    torus: { r: 'Distance from torus center to tube center' },
    prism: { w: 'Width of the triangular cross-section' },
    pyramid: { r: 'Half the side length of the square base' }
  };

  function getDimTooltip(shape, key) {
    if (shapeDimTooltips[shape] && shapeDimTooltips[shape][key]) return shapeDimTooltips[shape][key];
    return dimTooltips[key] || '';
  }

  // Three.js defines a 4-segment cone by its square's circumradius. The UI's
  // pyramid control uses half the side length, so convert before building the mesh.
  function geoPyramidGeometryRadius(halfSide) {
    var n = Number(halfSide);
    return (isFinite(n) && n > 0 ? n : 1.5) * Math.sqrt(2);
  }

  // ── Measurement calculations ──
  function calcMeasurements(shape, dims) {
    var PI = Math.PI;
    switch (shape) {
      case 'box': {
        var w = dims.w || 3, hh = dims.h || 3, d = dims.d || 3;
        return { vol: w * hh * d, sa: 2 * (w * hh + w * d + hh * d), faces: 6, edges: 12, vertices: 8, name: 'Rectangular Prism' };
      }
      case 'sphere': {
        var r = dims.r || 1.5;
        return { vol: (4 / 3) * PI * r * r * r, sa: 4 * PI * r * r, faces: 0, edges: 0, vertices: 0, name: 'Sphere', note: 'Curved surface \u2014 no flat faces' };
      }
      case 'cylinder': {
        var rT = dims.rTop || 1.5, rB = dims.rBot || 1.5, hc = dims.h || 3;
        var sl = Math.sqrt(Math.pow(rT - rB, 2) + hc * hc);
        return { vol: (PI * hc / 3) * (rT * rT + rB * rT + rB * rB), sa: PI * (rT * rT + rB * rB + (rT + rB) * sl), faces: 3, edges: 2, vertices: 0, name: rT === rB ? 'Cylinder' : 'Frustum' };
      }
      case 'cone': {
        var rc = dims.r || 1.5, hco = dims.h || 3;
        var slc = Math.sqrt(rc * rc + hco * hco);
        return { vol: (PI * rc * rc * hco) / 3, sa: PI * rc * (rc + slc), faces: 2, edges: 1, vertices: 1, name: 'Cone' };
      }
      case 'pyramid': {
        var rp = dims.r || 1.5, hp = dims.h || 3;
        var base = 2 * rp, baseA = base * base;
        var slp = Math.sqrt(rp * rp + hp * hp);
        return { vol: baseA * hp / 3, sa: baseA + 4 * (0.5 * base * slp), faces: 5, edges: 8, vertices: 5, name: 'Square Pyramid' };
      }
      case 'torus': {
        var R = dims.r || 1.5, rt = dims.tube || 0.5;
        return { vol: 2 * PI * PI * R * rt * rt, sa: 4 * PI * PI * R * rt, faces: 0, edges: 0, vertices: 0, name: 'Torus', note: 'Donut shape \u2014 curved surface' };
      }
      case 'prism': {
        var wp = dims.w || 3, hpp = dims.h || 3, dp = dims.d || 3;
        var triA = 0.5 * wp * hpp;
        var hyp = Math.sqrt((wp / 2) * (wp / 2) + hpp * hpp);
        return { vol: triA * dp, sa: 2 * triA + wp * dp + 2 * hyp * dp, faces: 5, edges: 9, vertices: 6, name: 'Triangular Prism' };
      }
      default: return { vol: 0, sa: 0, faces: 0, edges: 0, vertices: 0, name: 'Shape' };
    }
  }

  // ── "Show the math" (PURE) — the volume/SA formula with the CURRENT dimensions
  //    substituted in, so a student sees πr²h become π·(2)²·(5) = 62.83, not just
  //    a number. Returns symbolic + substituted + value for V and SA. Aligned with
  //    calcMeasurements so the revealed number always matches the readout. ──
  function geoFormulaSteps(shape, dims) {
    var PI = Math.PI, n = function(x) { return Math.round((x || 0) * 100) / 100; };
    var m = calcMeasurements(shape, dims), pv = 'π';
    var mk = function(formula, sub, value) { return { formula: formula, sub: sub, value: value }; };
    var vol, sa;
    switch (shape) {
      case 'box': { var w = dims.w || 3, h = dims.h || 3, d = dims.d || 3;
        vol = mk('V = w·h·d', '(' + n(w) + ')·(' + n(h) + ')·(' + n(d) + ')', m.vol);
        sa = mk('SA = 2(wh + wd + hd)', '2((' + n(w) + '·' + n(h) + ') + (' + n(w) + '·' + n(d) + ') + (' + n(h) + '·' + n(d) + '))', m.sa); break; }
      case 'sphere': { var r = dims.r || 1.5;
        vol = mk('V = ⁴⁄₃' + pv + 'r³', '⁴⁄₃·' + pv + '·(' + n(r) + ')³', m.vol);
        sa = mk('SA = 4' + pv + 'r²', '4·' + pv + '·(' + n(r) + ')²', m.sa); break; }
      case 'cylinder': { var rT = dims.rTop || 1.5, rB = dims.rBot || 1.5, hc = dims.h || 3;
        if (Math.abs(rT - rB) < 1e-6) {
          vol = mk('V = ' + pv + 'r²h', pv + '·(' + n(rT) + ')²·(' + n(hc) + ')', m.vol);
          sa = mk('SA = 2' + pv + 'r(r + h)', '2·' + pv + '·' + n(rT) + '·(' + n(rT) + ' + ' + n(hc) + ')', m.sa);
        } else {
          var slf = Math.sqrt((rT - rB) * (rT - rB) + hc * hc);
          vol = mk('V = ⅓' + pv + 'h(r₁² + r₁r₂ + r₂²)', '⅓·' + pv + '·(' + n(hc) + ')·((' + n(rT) + ')² + (' + n(rT) + ')·(' + n(rB) + ') + (' + n(rB) + ')²)', m.vol);
          sa = mk('SA = ' + pv + '(r₁² + r₂² + (r₁+r₂)l)', pv + '·((' + n(rT) + ')² + (' + n(rB) + ')² + (' + n(rT) + '+' + n(rB) + ')·(' + n(slf) + '))  [l=√((r₁-r₂)²+h²)]', m.sa);
        } break; }
      case 'cone': { var rc = dims.r || 1.5, hco = dims.h || 3, slc = Math.sqrt(rc * rc + hco * hco);
        vol = mk('V = ⅓' + pv + 'r²h', '⅓·' + pv + '·(' + n(rc) + ')²·(' + n(hco) + ')', m.vol);
        sa = mk('SA = ' + pv + 'r(r + l)', pv + '·' + n(rc) + '·(' + n(rc) + ' + ' + n(slc) + ')  [l=√(r²+h²)]', m.sa); break; }
      case 'pyramid': { var rp = dims.r || 1.5, hp = dims.h || 3, base = 2 * rp, slp = Math.sqrt(rp * rp + hp * hp);
        vol = mk('V = ⅓·B·h', '⅓·(' + n(base) + '²)·(' + n(hp) + ')', m.vol);
        sa = mk('SA = B + 4·(½·base·l)', '(' + n(base) + '²) + 4·(½·' + n(base) + '·' + n(slp) + ')', m.sa); break; }
      case 'torus': { var R = dims.r || 1.5, rt = dims.tube || 0.5;
        vol = mk('V = 2' + pv + '²Rr²', '2·' + pv + '²·(' + n(R) + ')·(' + n(rt) + ')²', m.vol);
        sa = mk('SA = 4' + pv + '²Rr', '4·' + pv + '²·(' + n(R) + ')·(' + n(rt) + ')', m.sa); break; }
      case 'prism': { var wp = dims.w || 3, hpp = dims.h || 3, dp = dims.d || 3, hyp = Math.sqrt((wp / 2) * (wp / 2) + hpp * hpp);
        vol = mk('V = (½·b·h)·d', '(½·' + n(wp) + '·' + n(hpp) + ')·(' + n(dp) + ')', m.vol);
        sa = mk('SA = 2(½·b·h) + b·d + 2·l·d', '(' + n(wp) + '·' + n(hpp) + ') + ' + n(wp) + '·' + n(dp) + ' + 2·' + n(hyp) + '·' + n(dp), m.sa); break; }
      default: vol = mk('—', '—', 0); sa = mk('—', '—', 0);
    }
    return { name: m.name, vol: vol, sa: sa };
  }

  // ── Cross-sections (PURE) — a horizontal cut at height fraction t (0 = bottom,
  //    1 = top) through a single-mode shape: the 2D shape it exposes + that area.
  //    A solid IS a stack of these — slicing makes "volume = area × height" and the
  //    shrinking cone/pyramid visible. Returns {name, area, r|w|h... , t}. ──
  function geoCrossSection(shape, dims, t) {
    var PI = Math.PI, tt = Math.max(0, Math.min(1, t == null ? 0.5 : t));
    switch (shape) {
      case 'box':      { var w = dims.w || 3, d = dims.d || 3; return { name: 'Rectangle', area: w * d, w: w, d: d }; }
      case 'prism':    { var wp = dims.w || 3, dp = dims.d || 3, width = wp * (1 - tt); return { name: 'Rectangle', area: width * dp, w: width, d: dp }; }
      case 'cylinder': { var rB = dims.rBot || 1.5, rT = dims.rTop || 1.5, rr = rB + (rT - rB) * tt; return { name: 'Circle', area: PI * rr * rr, r: rr }; }
      case 'cone':     { var rc = (dims.r || 1.5) * (1 - tt); return { name: 'Circle', area: PI * rc * rc, r: rc }; }
      case 'pyramid':  { var side = 2 * (dims.r || 1.5) * (1 - tt); return { name: 'Square', area: side * side, w: side, d: side }; }
      case 'sphere':   { var r = dims.r || 1.5, y = (tt - 0.5) * 2 * r, rad = Math.sqrt(Math.max(0, r * r - y * y)); return { name: 'Circle', area: PI * rad * rad, r: rad }; }
      case 'torus':    { var R = dims.r || 1.5, rt = dims.tube || 0.5, yy = (tt - 0.5) * 2 * rt, a = Math.sqrt(Math.max(0, rt * rt - yy * yy)); return { name: 'Ring (annulus)', area: 4 * PI * R * a, rOuter: R + a, rInner: Math.max(0, R - a) }; }
      default: return { name: '—', area: 0 };
    }
  }
  // ── Conic sections (PURE) — tilt a plane through a cone and Dandelin says which
  //    conic you get. σ = the side's angle from horizontal (atan h/r): tilt below
  //    σ → ellipse (0 → circle), equal → parabola, above → hyperbola. ──
  function geoConicSection(dims, tiltDeg) {
    var r = dims.r || 1.5, h = dims.h || 3;
    var sigma = Math.atan2(h, r) * 180 / Math.PI;
    var beta = Math.max(0, Math.min(89, tiltDeg == null ? 0 : tiltDeg));
    var name, note;
    if (beta < 0.5) { name = 'Circle'; note = 'A horizontal cut gives a circle.'; }
    else if (beta < sigma - 1.5) { name = 'Ellipse'; note = 'Tilted less than the side (' + Math.round(sigma) + '°) → a closed ellipse.'; }
    else if (beta <= sigma + 1.5) { name = 'Parabola'; note = 'Tilted parallel to the side (' + Math.round(sigma) + '°) → a parabola.'; }
    else { name = 'Hyperbola'; note = 'Tilted steeper than the side (' + Math.round(sigma) + '°) → a hyperbola.'; }
    return { name: name, note: note, sigma: sigma, beta: beta };
  }

  // ── Nets (PURE) — the flat pieces a shape's surface unfolds into. Each piece is
  //    a drawable primitive (rect / circle / triangle / sector) with its area, so
  //    the UI can show that surface area = the sum of the flat pieces. Sphere and
  //    torus can't be unrolled flat (returned unfoldable:false). ──
  function geoShapeNet(shape, dims) {
    var PI = Math.PI;
    var rectP = function(w, h, label) { return { kind: 'rect', w: w, h: h, area: w * h, label: label }; };
    var circP = function(r, label) { return { kind: 'circle', r: r, area: PI * r * r, label: label }; };
    var triP = function(b, h, label) { return { kind: 'tri', b: b, h: h, area: 0.5 * b * h, label: label }; };
    switch (shape) {
      case 'box': { var w = dims.w || 3, h = dims.h || 3, d = dims.d || 3;
        return { unfoldable: true, pieces: [rectP(w, h, 'front'), rectP(w, h, 'back'), rectP(d, h, 'left'), rectP(d, h, 'right'), rectP(w, d, 'top'), rectP(w, d, 'bottom')], note: 'Six rectangles — their areas sum to the surface area.' }; }
      case 'cylinder': {
        var rTop = dims.rTop || 1.5, rBot = dims.rBot || 1.5, hc = dims.h || 3;
        if (Math.abs(rTop - rBot) < 1e-6) return { unfoldable: true, pieces: [circP(rTop, 'top'), circP(rBot, 'bottom'), rectP(2 * PI * rTop, hc, 'wrap (2πr × h)')], note: 'A rectangle 2πr wide rolls into the tube; two circles cap the ends.' };
        var outer = Math.max(rTop, rBot), inner = Math.min(rTop, rBot);
        var slant = Math.sqrt((outer - inner) * (outer - inner) + hc * hc);
        var outerDev = slant * outer / (outer - inner), innerDev = slant * inner / (outer - inner);
        var angle = 2 * PI * (outer - inner) / slant;
        return { unfoldable: true, pieces: [circP(rTop, 'top'), circP(rBot, 'bottom'), { kind: 'annularSector', rOuter: outerDev, rInner: innerDev, angle: angle, area: PI * (rTop + rBot) * slant, label: 'side (annular sector)' }], note: 'A frustum opens into two different circular caps and an annular sector whose arc lengths match both rims.' };
      }
      case 'cone': { var rc = dims.r || 1.5, hco = dims.h || 3, sl = Math.sqrt(rc * rc + hco * hco);
        return { unfoldable: true, pieces: [circP(rc, 'base'), { kind: 'sector', r: sl, angle: 2 * PI * rc / sl, area: PI * rc * sl, label: 'side (sector, radius l)' }], note: 'The side unrolls into a sector of radius l = √(r²+h²); a circle is the base.' }; }
      case 'pyramid': { var rp = dims.r || 1.5, base = 2 * rp, hp = dims.h || 3, slp = Math.sqrt(rp * rp + hp * hp);
        return { unfoldable: true, pieces: [rectP(base, base, 'base'), triP(base, slp, 'face'), triP(base, slp, 'face'), triP(base, slp, 'face'), triP(base, slp, 'face')], note: 'A square base plus four identical triangles (slant height l = √(r²+h²)).' }; }
      case 'prism': { var wp = dims.w || 3, hpp = dims.h || 3, dp = dims.d || 3, hyp = Math.sqrt((wp / 2) * (wp / 2) + hpp * hpp);
        return { unfoldable: true, pieces: [triP(wp, hpp, 'end'), triP(wp, hpp, 'end'), rectP(wp, dp, 'bottom'), rectP(hyp, dp, 'slope'), rectP(hyp, dp, 'slope')], note: 'Two triangular ends plus three rectangles.' }; }
      default: return { unfoldable: false, pieces: [], note: shape === 'sphere' ? 'A sphere can’t be unrolled flat without distortion — that’s why world maps stretch the poles.' : 'This shape has no simple flat net.' };
    }
  }
  // ── Real-world scale (PURE) — anchor an abstract volume in something familiar.
  //    Convention: 1 unit = 10 cm, so 1 u³ = 1 litre. Gives litres + a comparison. ──
  function geoRealWorldScale(volU3) {
    var litres = volU3;   // 1 u³ = (10cm)³ = 1000 cm³ = 1 L
    var phrase = litres < 0.35 ? 'about a soda can' : litres < 1.3 ? 'about a big water bottle'
      : litres < 4 ? 'about a milk jug' : litres < 12 ? 'about a bucket'
      : litres < 60 ? 'about a small aquarium' : litres < 200 ? 'about a bathtub' : 'bigger than a bathtub';
    return { litres: litres, cups: litres * 4.2268, phrase: phrase };
  }

  // ── Sculpt math (PURE) — a sculpt is a set of primitive PARTS ({shape, size}).
  //    Measure each part with the same primitive formulas as single mode, apply
  //    the recipe's global scale (volume ×scale³, area ×scale²), and sum. NOTE:
  //    parts may overlap, so the total is the SUM OF PARTS (an upper bound), which
  //    is the honest thing to show — and a good talking point. size semantics:
  //    box=[w,h,d] · sphere=[r] · cylinder/cone=[r,h] · torus=[R,tube]. ──
  function geoPrimitiveMeasure(shape, size) {
    size = size || [];
    var nn = function(x) { return Math.round((x || 0) * 100) / 100; };
    var dimsMap = {
      box: { w: size[0], h: size[1], d: size[2] },
      sphere: { r: size[0] },
      cylinder: { rTop: size[0], rBot: size[0], h: size[1] },
      cone: { r: size[0], h: size[1] },
      torus: { r: size[0], tube: size[1] }
    };
    var dims = dimsMap[shape];
    if (!dims) return { name: shape, dims: '', vol: 0, sa: 0, volFormula: '', saFormula: '' };
    var m = calcMeasurements(shape, dims), fm = formulaMap[shape] || { vol: '', sa: '' };
    var dimStr = shape === 'box' ? (nn(size[0]) + '×' + nn(size[1]) + '×' + nn(size[2]))
      : shape === 'sphere' ? ('r=' + nn(size[0]))
      : shape === 'torus' ? ('R=' + nn(size[0]) + ', tube=' + nn(size[1]))
      : ('r=' + nn(size[0]) + ', h=' + nn(size[1]));
    return { name: m.name, dims: dimStr, vol: m.vol, sa: m.sa, volFormula: fm.vol, saFormula: fm.sa };
  }
  function geoSculptMeasure(recipe) {
    if (!recipe || !recipe.parts || !recipe.parts.length) return { parts: [], totalVol: 0, totalSA: 0, scale: 1 };
    var scale = recipe.scale || 1, s3 = scale * scale * scale, s2 = scale * scale;
    var parts = recipe.parts.map(function(p) {
      var pm = geoPrimitiveMeasure(p.shape, p.size || []);
      return { shape: p.shape, name: pm.name, dims: pm.dims, volFormula: pm.volFormula, saFormula: pm.saFormula, vol: pm.vol * s3, sa: pm.sa * s2 };
    });
    return {
      parts: parts, scale: scale,
      totalVol: parts.reduce(function(a, b) { return a + b.vol; }, 0),
      totalSA: parts.reduce(function(a, b) { return a + b.sa; }, 0)
    };
  }

  // ── Challenge calculations (includes lateral area for challenge) ──
  function challengeCalc(sid, rd) {
    var PI = Math.PI;
    switch (sid) {
      case 'box': { var w=rd.w,h=rd.h,d=rd.d; return { vol:w*h*d, sa:2*(w*h+w*d+h*d), lat:2*h*(w+d), f:6, e:12, v:8, name:'Rectangular Prism' }; }
      case 'sphere': { var r=rd.r; return { vol:(4/3)*PI*r*r*r, sa:4*PI*r*r, lat:0, f:0, e:0, v:0, name:'Sphere' }; }
      case 'cylinder': { var rT=rd.rTop||rd.r,rB=rd.rBot||rd.r,h=rd.h; var sl=Math.sqrt(Math.pow(rT-rB,2)+h*h); return { vol:(PI*h/3)*(rT*rT+rB*rT+rB*rB), sa:PI*(rT*rT+rB*rB+(rT+rB)*sl), lat:PI*(rT+rB)*sl, f:3, e:2, v:0, name:rT===rB?'Cylinder':'Frustum' }; }
      case 'cone': { var r=rd.r,h=rd.h; var sl=Math.sqrt(r*r+h*h); return { vol:(PI*r*r*h)/3, sa:PI*r*(r+sl), lat:PI*r*sl, f:2, e:1, v:1, name:'Cone' }; }
      case 'pyramid': { var r=rd.r,h=rd.h,base=2*r,bA=base*base; var sl=Math.sqrt(r*r+h*h); return { vol:bA*h/3, sa:bA+4*(0.5*base*sl), lat:4*(0.5*base*sl), f:5, e:8, v:5, name:'Square Pyramid' }; }
      case 'torus': { var R=rd.r,r=rd.tube; return { vol:2*PI*PI*R*r*r, sa:4*PI*PI*R*r, lat:0, f:0, e:0, v:0, name:'Torus' }; }
      case 'prism': { var w=rd.w,h=rd.h,d=rd.d; var tA=0.5*w*h,hyp=Math.sqrt((w/2)*(w/2)+h*h); return { vol:tA*d, sa:2*tA+w*d+2*hyp*d, lat:w*d+2*hyp*d, f:5, e:9, v:6, name:'Triangular Prism' }; }
      default: return { vol:0, sa:0, lat:0, f:0, e:0, v:0, name:'Shape' };
    }
  }

  // Validate challenge input without accepting numeric junk or arbitrary name fragments.
  function geoChallengeAnswerCorrect(challenge, rawAnswer) {
    if (!challenge || rawAnswer == null) return false;
    var raw = String(rawAnswer).trim();
    if (!raw) return false;
    if (challenge.type === 'identify') {
      var norm = function(value) { return String(value).toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim(); };
      var expected = norm(challenge.answer);
      var aliases = {
        'rectangular prism': ['rectangular prism', 'box', 'cuboid'],
        'square pyramid': ['square pyramid', 'pyramid'],
        'triangular prism': ['triangular prism'],
        'frustum': ['frustum', 'conical frustum'],
        'sphere': ['sphere'], 'cylinder': ['cylinder'], 'cone': ['cone'], 'torus': ['torus', 'donut', 'doughnut']
      };
      return (aliases[expected] || [expected]).indexOf(norm(raw)) >= 0;
    }
    var num = Number(raw.replace(/,/g, ''));
    if (!isFinite(num)) return false;
    if (['faces','edges','vertices','eulerCheck'].indexOf(challenge.type) >= 0) return Number.isInteger(num) && num === challenge.answer;
    if (challenge.answer === 0) return num === 0;
    return Math.abs(num - challenge.answer) / Math.abs(challenge.answer) <= 0.05;
  }

  function geoFormatChallengeAnswer(challenge) {
    if (!challenge) return '';
    if (typeof challenge.answer !== 'number') return String(challenge.answer == null ? '' : challenge.answer);
    if (['faces','edges','vertices','eulerCheck'].indexOf(challenge.type) >= 0) return String(challenge.answer);
    return challenge.answer.toFixed(2);
  }

  // ── STL Export ──
  function exportSTL(shape, addToast) {
    if (!window._geoScene || !window._geoScene.mesh || !window.THREE) return false;
    var THREE = window.THREE;
    var mesh = window._geoScene.mesh;
    if (typeof mesh.updateMatrixWorld === 'function') mesh.updateMatrixWorld(true);
    var geo = mesh.geometry.clone();
    geo.applyMatrix4(mesh.matrixWorld);
    var pos = geo.attributes.position;
    if (!pos || pos.count < 3) { geo.dispose(); return false; }
    var idx = geo.index;
    var triCount = Math.floor((idx ? idx.count : pos.count) / 3);
    if (!triCount) { geo.dispose(); return false; }
    var bufLen = 80 + 4 + triCount * 50;
    var buf = new ArrayBuffer(bufLen);
    var dv = new DataView(buf);
    var headerStr = 'AlloFlow Geometry Sandbox - ' + shape;
    for (var hi = 0; hi < 80; hi++) dv.setUint8(hi, hi < headerStr.length ? headerStr.charCodeAt(hi) : 0);
    dv.setUint32(80, triCount, true);
    var offset = 84;
    var _v = function(i) {
      if (idx) return new THREE.Vector3(pos.getX(idx.getX(i)), pos.getY(idx.getX(i)), pos.getZ(idx.getX(i)));
      return new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
    };
    for (var t = 0; t < triCount; t++) {
      var i0 = idx ? t * 3 : t * 3, i1 = i0 + 1, i2 = i0 + 2;
      var v0 = _v(i0), v1 = _v(i1), v2 = _v(i2);
      var edge1 = new THREE.Vector3().subVectors(v1, v0);
      var edge2 = new THREE.Vector3().subVectors(v2, v0);
      var normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();
      dv.setFloat32(offset, normal.x, true); offset += 4;
      dv.setFloat32(offset, normal.y, true); offset += 4;
      dv.setFloat32(offset, normal.z, true); offset += 4;
      [v0, v1, v2].forEach(function(v) {
        dv.setFloat32(offset, v.x, true); offset += 4;
        dv.setFloat32(offset, v.y, true); offset += 4;
        dv.setFloat32(offset, v.z, true); offset += 4;
      });
      dv.setUint16(offset, 0, true); offset += 2;
    }
    geo.dispose();
    var blob = new Blob([buf], { type: 'application/sla' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'geometry_sandbox_' + shape + '_' + Date.now() + '.stl';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(function() { URL.revokeObjectURL(url); }, 0);
    if (typeof addToast === 'function') addToast('\uD83D\uDCE6 STL exported \u2014 ready for 3D printing!', 'success');
    return true;
  }

  // ── Shape palette config ──
  var shapes = [
    { id: 'box', icon: '\u{1F7E6}', label: 'Rectangular Prism', key: '1' },
    { id: 'sphere', icon: '\u{26AA}', label: 'Sphere', key: '2' },
    { id: 'cylinder', icon: '\u{1F6E2}\uFE0F', label: 'Cylinder', key: '3' },
    { id: 'cone', icon: '\u{1F4D0}', label: 'Cone', key: '4' },
    { id: 'pyramid', icon: '\u{1F53A}', label: 'Pyramid', key: '5' },
    { id: 'torus', icon: '\u{1F369}', label: 'Torus', key: '6' },
    { id: 'prism', icon: '\u{1F4D0}', label: 'Prism', key: '7' }
  ];

  // ── Slider configs ──
  var sliderConfigs = {
    box: [
      { key: 'w', label: 'Width', min: 0.5, max: 10, step: 0.1 },
      { key: 'h', label: 'Height', min: 0.5, max: 10, step: 0.1 },
      { key: 'd', label: 'Depth', min: 0.5, max: 10, step: 0.1 }
    ],
    sphere: [
      { key: 'r', label: 'Radius', min: 0.5, max: 5, step: 0.1 },
      { key: 'segs', label: 'Smoothness', min: 8, max: 64, step: 4 }
    ],
    cylinder: [
      { key: 'rTop', label: 'Top Radius', min: 0.1, max: 5, step: 0.1 },
      { key: 'rBot', label: 'Bottom Radius', min: 0.1, max: 5, step: 0.1 },
      { key: 'h', label: 'Height', min: 0.5, max: 10, step: 0.1 }
    ],
    cone: [
      { key: 'r', label: 'Base Radius', min: 0.5, max: 5, step: 0.1 },
      { key: 'h', label: 'Height', min: 0.5, max: 10, step: 0.1 }
    ],
    pyramid: [
      { key: 'r', label: 'Base Half-Side', min: 0.5, max: 5, step: 0.1 },
      { key: 'h', label: 'Height', min: 0.5, max: 10, step: 0.1 }
    ],
    torus: [
      { key: 'r', label: 'Major Radius', min: 0.5, max: 5, step: 0.1 },
      { key: 'tube', label: 'Tube Radius', min: 0.1, max: 2, step: 0.05 }
    ],
    prism: [
      { key: 'w', label: 'Base Width', min: 0.5, max: 10, step: 0.1 },
      { key: 'h', label: 'Height', min: 0.5, max: 10, step: 0.1 },
      { key: 'd', label: 'Depth', min: 0.5, max: 10, step: 0.1 }
    ]
  };

  // Clamp active dimensions from restored/programmatic state to the same ranges
  // as the visible controls. Ring-torus formulas require the tube to miss the axis.
  function geoNormalizeShapeDims(shape, dims) {
    var defaults = { w: 3, h: 3, d: 3, r: 1.5, rTop: 1.5, rBot: 1.5, tube: 0.5, segs: 32 };
    var out = Object.assign({}, defaults, dims || {});
    var config = sliderConfigs[shape] || sliderConfigs.box;
    config.forEach(function(sl) {
      var value = Number(out[sl.key]);
      if (!isFinite(value)) value = defaults[sl.key] != null ? defaults[sl.key] : sl.min;
      value = Math.max(sl.min, Math.min(sl.max, value));
      if (sl.step >= 1) value = Math.round(value / sl.step) * sl.step;
      out[sl.key] = value;
    });
    if (shape === 'torus') out.tube = Math.min(out.tube, Math.max(0.1, out.r - 0.1));
    return out;
  }

  // ── Coach tips (with formulas) ──
  var coachTips = {
    box: { title: 'Rectangular Prism', tip: 'A prism with 6 rectangular faces. Every corner is a right angle. V = l \u00D7 w \u00D7 h', example: 'Shipping boxes, buildings, books \u2014 most structures start as rectangular prisms.' },
    sphere: { title: 'Sphere', tip: 'Every point on the surface is the same distance from the center. V = \u2074\u2044\u2083\u03C0r\u00B3', example: 'Planets, basketballs, soap bubbles \u2014 nature prefers spheres because they minimize surface area.' },
    cylinder: { title: 'Cylinder', tip: 'Two circular bases connected by a curved surface. V = \u03C0r\u00B2h', example: 'Cans, pipes, pillars \u2014 cylinders are strong under compression.' },
    cone: { title: 'Cone', tip: 'A circular base that narrows to a point. V = \u2153\u03C0r\u00B2h', example: 'Ice cream cones, traffic cones, volcanoes \u2014 one-third the volume of a cylinder!' },
    pyramid: { title: 'Square Pyramid', tip: '4 triangular faces meeting at an apex over a square base. V = \u2153Bh', example: 'The Great Pyramid of Giza has a 230m base and 146m height \u2014 over 2.3 million blocks.' },
    torus: { title: 'Torus', tip: 'A donut shape \u2014 a circle rotated around an axis. V = 2\u03C0\u00B2Rr\u00B2', example: 'Donuts, bagels, tire inner tubes, and tokamak fusion reactors are all tori!' },
    prism: { title: 'Triangular Prism', tip: '2 triangular faces + 3 rectangular faces. V = \u00BDbh \u00D7 depth', example: 'Roof trusses, Toblerone boxes, and optical prisms that split light into rainbows.' }
  };

  // ── Color palette ──
  var colorPalette = ['#60a5fa', '#f472b6', '#34d399', '#fbbf24', '#a78bfa', '#fb923c', '#f87171', '#e2e8f0'];
  var colorNames = { '#60a5fa': 'blue', '#f472b6': 'pink', '#34d399': 'green', '#fbbf24': 'yellow', '#a78bfa': 'purple', '#fb923c': 'orange', '#f87171': 'red', '#e2e8f0': 'white' };

  // ══════════════════════════════════════════════════════════════
  // DIMENSIONAL STRETCH MODE (v2, HandWaver-inspired)
  // ──────────────────────────────────────────────────────────────
  // Construction objects live in toolData.geoSandbox.construction.objects.
  // Each object is one of:
  //   { id, type: 'point',   position: [x,y,z] }
  //   { id, type: 'segment', position: [x,y,z], vector: [dx,dy,dz] }
  //   { id, type: 'rect',    position: [x,y,z], u: [ux,uy,uz], v: [vx,vy,vz] }
  //   { id, type: 'prism',   position: [x,y,z], u, v, w: [wx,wy,wz] }
  // u, v, w are orthogonal extrusion vectors that define the shape.
  //
  // Stretch operations:
  //   stretchPoint(point, axis, length)  → new segment with vector along axis
  //   stretchSegment(seg, axis, length)  → new rect with seg.vector as u, perp as v
  //   stretchRect(rect, axis, length)    → new prism with rect's u,v + perp as w
  // ══════════════════════════════════════════════════════════════
  var STRETCH_AXES = [
    { id: 'x', label: 'X axis (right)',  vec: [1, 0, 0], color: '#ef4444' },
    { id: 'y', label: 'Y axis (up)',     vec: [0, 1, 0], color: '#22c55e' },
    { id: 'z', label: 'Z axis (toward you)', vec: [0, 0, 1], color: '#3b82f6' }
  ];
  function nextObjId(objs) {
    return (objs && objs.length ? Math.max.apply(null, objs.map(function(o) { return o.id || 0; })) + 1 : 1);
  }
  function vec3Scale(v, s) { return [v[0] * s, v[1] * s, v[2] * s]; }
  function vec3Add(a, b)  { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function vec3Mag(a) { return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]); }
  function vec3Cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function vec3Norm(a) { var m = vec3Mag(a); return m > 1e-9 ? vec3Scale(a, 1 / m) : [1, 0, 0]; }
  function vec3Sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  // Area of a triangle / planar quad from world corners (used for tapered-solid SA).
  function _triArea(a, b, c) { return 0.5 * vec3Mag(vec3Cross(vec3Sub(b, a), vec3Sub(c, a))); }
  function _quadArea(a, b, c, d) { return _triArea(a, b, c) + _triArea(a, c, d); }
  function vec3Perp(v) {
    // Pick a perpendicular axis: if v is along x or close, perp is y; else perp is x.
    var ax = Math.abs(v[0]), ay = Math.abs(v[1]), az = Math.abs(v[2]);
    if (ay <= ax && ay <= az) return [0, 1, 0];
    if (ax <= ay && ax <= az) return [1, 0, 0];
    return [0, 0, 1];
  }
  function stretchPoint(point, axis, length) {
    var ax = STRETCH_AXES.find(function(a) { return a.id === axis; }) || STRETCH_AXES[0];
    return { type: 'segment', position: point.position.slice(), vector: vec3Scale(ax.vec, length) };
  }
  // Cavalieri slant (optional): a SHEAR added to the extrusion, IN the base plane
  // and PERPENDICULAR to the base direction — it slants the shape without changing
  // its base or its perpendicular height, so the area/volume is provably unchanged
  // (Cavalieri's principle). slant = 0 → the original straight (right) stretch.
  function stretchSegment(seg, axis, length, slant) {
    var ax = STRETCH_AXES.find(function(a) { return a.id === axis; }) || STRETCH_AXES[1];
    // Don't allow stretching along the segment's own axis (would degenerate)
    var segLen = Math.sqrt(seg.vector[0]*seg.vector[0] + seg.vector[1]*seg.vector[1] + seg.vector[2]*seg.vector[2]);
    var normSeg = segLen > 0 ? vec3Scale(seg.vector, 1/segLen) : [1,0,0];
    var perp;
    // If chosen axis is roughly parallel to segment, fall back to the perpendicular axis
    if (Math.abs(normSeg[0] * ax.vec[0] + normSeg[1] * ax.vec[1] + normSeg[2] * ax.vec[2]) > 0.95) {
      perp = vec3Perp(seg.vector);
    } else {
      perp = ax.vec;
    }
    var v = vec3Scale(perp, length);
    // Shear along the segment's own direction keeps base(|u|) × height(length) fixed.
    if (slant) v = vec3Add(v, vec3Scale(normSeg, slant * length));
    return { type: 'rect', position: seg.position.slice(), u: seg.vector.slice(), v: v };
  }
  function stretchRect(rect, axis, length, slant) {
    // For a rect, w is the perpendicular of the plane defined by u, v.
    var u = rect.u, v = rect.v;
    var normal = vec3Norm(vec3Cross(u, v));
    if (vec3Mag(vec3Cross(u, v)) < 1e-9) normal = [0, 0, 1];
    var w = vec3Scale(normal, length);
    // Shear in the base plane (along û) keeps base area × perpendicular height fixed
    // → an oblique prism with IDENTICAL volume (Cavalieri).
    if (slant) w = vec3Add(w, vec3Scale(vec3Norm(u), slant * length));
    return { type: 'prism', position: rect.position.slice(), u: u.slice(), v: v.slice(), w: w };
  }
  // ── Taper (PURE) — extrude a rectangle up by `length` but SHRINK the top face
  //    toward the base centre by topScale s (1 = prism, 0 = apex/pyramid, between =
  //    frustum). This is where the ⅓ comes from: as the top collapses, the cross-
  //    section shrinks linearly, so the volume is a third of the box at s=0. ──
  function taperRect(rect, axis, length, topScale, slant) {
    var u = rect.u, v = rect.v;
    var normal = vec3Norm(vec3Cross(u, v));
    if (vec3Mag(vec3Cross(u, v)) < 1e-9) normal = [0, 0, 1];
    var w = vec3Scale(normal, length);
    if (slant) w = vec3Add(w, vec3Scale(vec3Norm(u), slant * length));
    var s = Math.max(0, Math.min(1, topScale == null ? 0 : topScale));
    return { type: 'pyramid', position: rect.position.slice(), u: u.slice(), v: v.slice(), w: w, topScale: s };
  }
  // The 8 world corners of a tapered solid: base parallelogram + top parallelogram
  // scaled by topScale about the base centre and offset by w. (Top collapses to the
  // apex point when topScale = 0.) Shared by the SA math and the GL renderer.
  function taperCorners(o) {
    var p0 = o.position, u = o.u, v = o.v, w = o.w, s = o.topScale == null ? 0 : o.topScale;
    var base = [p0.slice(), vec3Add(p0, u), vec3Add(vec3Add(p0, u), v), vec3Add(p0, v)];
    var centre = vec3Add(p0, vec3Scale(vec3Add(u, v), 0.5));
    var top = base.map(function(c) { return vec3Add(vec3Add(centre, vec3Scale(vec3Sub(c, centre), s)), w); });
    return { base: base, top: top };
  }
  // Surface area of a tapered solid = base + top + 4 side trapezoids (from corners).
  function geoPyramidSurfaceArea(o) {
    if (!o || o.type !== 'pyramid') return 0;
    var C = taperCorners(o), b = C.base, t = C.top;
    var sa = _quadArea(b[0], b[1], b[2], b[3]) + _quadArea(t[0], t[1], t[2], t[3]);
    for (var i = 0; i < 4; i++) { var j = (i + 1) % 4; sa += _quadArea(b[i], b[j], t[j], t[i]); }
    return sa;
  }
  // ── Revolve (PURE) — spin a rectangle profile around a world axis (through the
  //    rect's origin) by `angleDeg`, making a solid of revolution: a cylinder when
  //    an edge lies on the axis, a ring/washer when the profile is offset. Volume
  //    comes from PAPPUS'S THEOREM: V = θ · R̄ · A (sweep angle × centroid travel
  //    radius × profile area) — exact, no meshing needed, as long as the profile
  //    doesn't cross the axis. ──
  function revolveRect(rect, axis, angleDeg, segments, profile) {
    var axId = (axis === 'x' || axis === 'y' || axis === 'z') ? axis : 'y';
    return { type: 'revolution', position: rect.position.slice(), u: rect.u.slice(), v: rect.v.slice(),
      axis: axId, angleDeg: Math.max(1, Math.min(360, angleDeg == null ? 360 : angleDeg)),
      segments: Math.max(6, Math.min(96, segments || 48)),
      profile: profile === 'triangle' ? 'triangle' : 'rect' };   // rect → cylinder/ring, triangle → cone
  }
  // Profile geometry: a rect profile = 4 corners (area |u×v|, centroid at (u+v)/2);
  //   a triangle profile = corners position, +u, +v (area ½|u×v|, centroid at (u+v)/3)
  //   → revolving it makes a cone, and Pappus gives exactly ⅓πr²h.
  function _revProfile(o) {
    var p = o.position;
    if (o.profile === 'triangle') {
      return { corners: [p.slice(), vec3Add(p, o.u), vec3Add(p, o.v)],
        area: 0.5 * vec3Mag(vec3Cross(o.u, o.v)),
        centroid: vec3Add(p, vec3Scale(vec3Add(o.u, o.v), 1 / 3)) };
    }
    return { corners: [p.slice(), vec3Add(p, o.u), vec3Add(vec3Add(p, o.u), o.v), vec3Add(p, o.v)],
      area: vec3Mag(vec3Cross(o.u, o.v)),
      centroid: vec3Add(p, vec3Scale(vec3Add(o.u, o.v), 0.5)) };
  }
  // Rotate a point about the line through aPoint along unit aDir by phi (Rodrigues).
  function _rotAxis(p, aPoint, aDir, phi) {
    var v = vec3Sub(p, aPoint), c = Math.cos(phi), s = Math.sin(phi);
    var dotv = aDir[0] * v[0] + aDir[1] * v[1] + aDir[2] * v[2];
    var cr = vec3Cross(aDir, v);
    return vec3Add(aPoint, [
      v[0] * c + cr[0] * s + aDir[0] * dotv * (1 - c),
      v[1] * c + cr[1] * s + aDir[1] * dotv * (1 - c),
      v[2] * c + cr[2] * s + aDir[2] * dotv * (1 - c)
    ]);
  }
  function _revAxisVec(o) { var a = STRETCH_AXES.find(function(x) { return x.id === (o.axis || 'y'); }); return a ? a.vec : [0, 1, 0]; }
  // Distance from the profile centroid to the revolution axis — the world axis
  //   line through the ORIGIN (so placing a rect away from the axis makes a ring).
  //   This is the R̄ in Pappus.
  function _revRadius(o) {
    var av = _revAxisVec(o), cen = _revProfile(o).centroid;
    var proj = cen[0] * av[0] + cen[1] * av[1] + cen[2] * av[2];
    return vec3Mag(vec3Sub(cen, vec3Scale(av, proj)));
  }
  function revolutionVolume(o) {
    if (!o || o.type !== 'revolution') return 0;
    return (o.angleDeg || 360) * Math.PI / 180 * _revRadius(o) * _revProfile(o).area;   // Pappus: θ·R̄·A
  }
  // Triangle-soup for the swept surface: sweep each profile-boundary edge around
  //   the axis + end-caps for partial turns. Works for a rect (4 edges → cylinder/
  //   ring) or a triangle (3 edges → cone). Used by the GL renderer.
  function revolutionTriangles(o) {
    var av = _revAxisVec(o), aPoint = [0, 0, 0];   // spin about the world axis through the origin
    var corners = _revProfile(o).corners, nc = corners.length;
    var N = o.segments || 48, theta = (o.angleDeg || 360) * Math.PI / 180, rings = [];
    for (var k = 0; k <= N; k++) { var phi = theta * k / N; rings.push(corners.map(function(c) { return _rotAxis(c, aPoint, av, phi); })); }
    var tris = [];
    var pushQuad = function(a, b, c, d) { tris.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], a[0], a[1], a[2], c[0], c[1], c[2], d[0], d[1], d[2]); };
    var pushTri = function(a, b, c) { tris.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); };
    for (var m = 0; m < N; m++) { var R0 = rings[m], R1 = rings[m + 1]; for (var e = 0; e < nc; e++) { var e2 = (e + 1) % nc; pushQuad(R0[e], R0[e2], R1[e2], R1[e]); } }
    if (theta < 2 * Math.PI - 1e-3) {   // end-caps for a partial sweep
      var f = rings[0], g = rings[N];
      if (nc === 4) { pushQuad(f[0], f[1], f[2], f[3]); pushQuad(g[3], g[2], g[1], g[0]); }
      else { pushTri(f[0], f[1], f[2]); pushTri(g[2], g[1], g[0]); }
    }
    return tris;
  }
  // ── Resize a placed object (PURE) — set one defining edge to a new length while
  //    PRESERVING its direction (and any Cavalieri slant baked into that vector).
  //    dimIndex: segment→0 (vector); rect→0(u)/1(v); prism→0(u)/1(v)/2(w). This is
  //    what makes objects editable after creation: change a side, watch area/volume
  //    update live. Points have no size (returned unchanged). ──
  function resizeObject(o, dimIndex, newLen) {
    if (!o) return o;
    var c = JSON.parse(JSON.stringify(o));
    var L = (newLen > 0) ? newLen : 0.0001;
    var setLen = function(vec) { var m = vec3Mag(vec); return m > 1e-9 ? vec3Scale(vec, L / m) : vec; };
    if (o.type === 'segment' && dimIndex === 0) c.vector = setLen(o.vector);
    else if (o.type === 'rect') { if (dimIndex === 1) c.v = setLen(o.v); else c.u = setLen(o.u); }
    else if (o.type === 'prism' || o.type === 'pyramid') { if (dimIndex === 1) c.v = setLen(o.v); else if (dimIndex === 2) c.w = setLen(o.w); else c.u = setLen(o.u); }
    return c;
  }
  // Surface area of a parallelepiped prism = 2(|u×v| + |v×w| + |w×u|).
  function geoPrismSurfaceArea(o) {
    if (!o || o.type !== 'prism') return 0;
    return 2 * (vec3Mag(vec3Cross(o.u, o.v)) + vec3Mag(vec3Cross(o.v, o.w)) + vec3Mag(vec3Cross(o.w, o.u)));
  }
  function objectVolume(o) {
    if (o.type === 'point') return 0;
    if (o.type === 'segment') {
      var v = o.vector; return Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);  // returns length, not volume
    }
    if (o.type === 'rect') {
      var u = o.u, vv = o.v;
      // Cross magnitude = parallelogram area
      var cx = u[1] * vv[2] - u[2] * vv[1];
      var cy = u[2] * vv[0] - u[0] * vv[2];
      var cz = u[0] * vv[1] - u[1] * vv[0];
      return Math.sqrt(cx*cx + cy*cy + cz*cz);
    }
    if (o.type === 'prism') {
      // Volume = |u · (v × w)|
      var u = o.u, vv = o.v, ww = o.w;
      var cx = vv[1] * ww[2] - vv[2] * ww[1];
      var cy = vv[2] * ww[0] - vv[0] * ww[2];
      var cz = vv[0] * ww[1] - vv[1] * ww[0];
      return Math.abs(u[0] * cx + u[1] * cy + u[2] * cz);
    }
    if (o.type === 'pyramid') {
      // Prismatoid with a linearly-scaled cross-section: V = B · h · (1 + s + s²)/3.
      // s=1 → box (B·h); s=0 → pyramid (⅓·B·h). h = perpendicular height (w · n̂).
      var base = vec3Mag(vec3Cross(o.u, o.v));
      var n = vec3Norm(vec3Cross(o.u, o.v));
      var h = Math.abs(o.w[0] * n[0] + o.w[1] * n[1] + o.w[2] * n[2]);
      var s = o.topScale == null ? 0 : o.topScale;
      return base * h * (1 + s + s * s) / 3;
    }
    if (o.type === 'revolution') return revolutionVolume(o);
    return 0;
  }

  // ── Measurement of a construction object (PURE) — the dimension it lives in
  //    plus the size that "counts" there (length / area / volume) and the vector
  //    formula that produced it. This is the math the stretch mechanic teaches. ──
  function geoStretchMeasure(o) {
    if (!o) return null;
    if (o.type === 'point')   return { dim: 0, kind: 'point',  value: 0, unitExp: 0, formula: '—', label: 'Point' };
    if (o.type === 'segment') return { dim: 1, kind: 'length', value: objectVolume(o), unitExp: 1, formula: '|v|', label: 'Length' };
    if (o.type === 'rect')    return { dim: 2, kind: 'area',   value: objectVolume(o), unitExp: 2, formula: '|u × v|', label: 'Area', perimeter: 2 * (vec3Mag(o.u) + vec3Mag(o.v)) };
    if (o.type === 'prism') {
      // A slanted (oblique) prism has extra edge length in w beyond its height,
      // so surfaceArea grows while volume is unchanged — the Cavalieri contrast.
      var oblique = Math.abs(o.u && o.v && o.w ? (function() { var n = vec3Norm(vec3Cross(o.u, o.v)); return (o.w[0] * n[0] + o.w[1] * n[1] + o.w[2] * n[2]) / (vec3Mag(o.w) || 1); })() : 1) < 0.999;
      return { dim: 3, kind: 'volume', value: objectVolume(o), unitExp: 3, formula: '|u · (v × w)|', label: 'Volume', surfaceArea: geoPrismSurfaceArea(o), oblique: oblique };
    }
    if (o.type === 'pyramid') {
      var s = o.topScale == null ? 0 : o.topScale;
      var apex = s <= 0.001;
      var obliqueP = Math.abs((function() { var n = vec3Norm(vec3Cross(o.u, o.v)); return (o.w[0] * n[0] + o.w[1] * n[1] + o.w[2] * n[2]) / (vec3Mag(o.w) || 1); })()) < 0.999;
      return { dim: 3, kind: 'volume', value: objectVolume(o), unitExp: 3,
        formula: apex ? 'V = ⅓ · B · h' : 'V = ⅓h(B₁ + B₂ + √(B₁B₂))',
        label: 'Volume', surfaceArea: geoPyramidSurfaceArea(o), oblique: obliqueP, taper: s, apex: apex };
    }
    if (o.type === 'revolution') {
      return { dim: 3, kind: 'volume', value: revolutionVolume(o), unitExp: 3,
        formula: o.profile === 'triangle' ? 'V = ⅓πr²h  (Pappus: θ·R̄·A)' : 'V = θ · R̄ · A  (Pappus)', label: 'Volume',
        radius: _revRadius(o), angleDeg: o.angleDeg || 360, profileArea: _revProfile(o).area, cone: o.profile === 'triangle' };
    }
    return null;
  }

  // ── Similarity scaling (PURE) — multiply every defining vector by k so the
  //    shape stays SIMILAR (same proportions). This is the engine behind the
  //    square–cube law: length scales ×k, area ×k², volume ×k³. ──
  function geoScaleObject(o, k) {
    if (!o || !(k > 0) || !isFinite(k)) return null;
    var c = { type: o.type, id: o.id, position: (o.position || [0, 0, 0]).slice() };
    if (o.type === 'segment') c.vector = vec3Scale(o.vector, k);
    else if (o.type === 'rect') { c.u = vec3Scale(o.u, k); c.v = vec3Scale(o.v, k); }
    else if (o.type === 'prism') { c.u = vec3Scale(o.u, k); c.v = vec3Scale(o.v, k); c.w = vec3Scale(o.w, k); }
    else if (o.type === 'pyramid') { c.u = vec3Scale(o.u, k); c.v = vec3Scale(o.v, k); c.w = vec3Scale(o.w, k); c.topScale = o.topScale; }
    else return null;
    return c;
  }
  // Before/after measurements + the exponent ratios for a scale factor k. The
  // whole point: ratios are k^1 (length), k^2 (area/surface), k^3 (volume).
  function geoScaleReport(o, k) {
    var m = geoStretchMeasure(o);
    if (!m || m.dim === 0) return null;
    var scaled = geoScaleObject(o, k);
    if (!scaled) return null;
    var s = geoStretchMeasure(scaled);
    if (!s) return null;
    var out = { k: k, dim: m.dim, rows: [] };
    if (o.type === 'segment') {
      out.rows.push({ label: 'Length', exp: 1, ratio: k, before: m.value, after: s.value });
    } else if (o.type === 'rect') {
      out.rows.push({ label: 'Perimeter', exp: 1, ratio: k, before: m.perimeter, after: s.perimeter });
      out.rows.push({ label: 'Area', exp: 2, ratio: k * k, before: m.value, after: s.value });
    } else if (o.type === 'prism' || o.type === 'pyramid') {
      out.rows.push({ label: 'Edge', exp: 1, ratio: k, before: vec3Mag(o.u), after: vec3Mag(o.u) * k });
      out.rows.push({ label: 'Surface', exp: 2, ratio: k * k, before: m.surfaceArea, after: s.surfaceArea });
      out.rows.push({ label: 'Volume', exp: 3, ratio: k * k * k, before: m.value, after: s.value });
    }
    return out;
  }

  // ── Cross-sections (PURE) — a solid is a STACK of cross-sections, so
  //    volume = cross-section area × height. Slicing a prism horizontally gives a
  //    parallelogram congruent to its base at EVERY height (right or oblique) —
  //    the area never changes, which is exactly Cavalieri's principle. ──
  function geoCrossSectionArea(o, t) {
    if (!o || o.type !== 'prism') return 0;
    if (t < 0 || t > 1) return 0;
    return vec3Mag(vec3Cross(o.u, o.v));   // base parallelogram area, constant up the stack
  }
  function geoCrossSectionInfo(o) {
    if (!o || o.type !== 'prism') return null;
    var baseArea = vec3Mag(vec3Cross(o.u, o.v));
    var volume = objectVolume(o);
    var height = baseArea > 1e-9 ? volume / baseArea : 0;   // perpendicular height
    return { baseArea: baseArea, height: height, volume: volume, constant: true };
  }
  // Riemann/Cavalieri stack: n equal slices, Σ area × Δh — recovers the volume
  // (exactly for a prism, since every slice has the same area).
  function geoStackVolume(o, n) {
    var info = geoCrossSectionInfo(o);
    if (!info || !(n > 0)) return 0;
    var dh = info.height / n, sum = 0;
    for (var i = 0; i < n; i++) sum += geoCrossSectionArea(o, (i + 0.5) / n) * dh;
    return sum;
  }

  // ── Build challenges (PURE, seeded) — turn stretching into problem-solving:
  //    hit a target length / area / volume by choosing axes and lengths. Level
  //    1=length (1D), 2=area (2D), 3=volume (3D). Deterministic given a seed so
  //    the logic is unit-testable; targets factor into whole-number side lengths
  //    so there is always a clean stretch path to the answer. ──
  var GEO_BUILD_KINDS = ['length', 'area', 'volume'];
  function _geoSeededRand(seed) {
    var s = (seed >>> 0) || 1;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  function geoMakeBuildChallenge(level, seed) {
    var lv = Math.max(1, Math.min(3, level || 1));
    var rnd = _geoSeededRand(isFinite(seed) ? (seed | 0) : 1);
    var kind = GEO_BUILD_KINDS[lv - 1];
    var target, prompt, hint;
    if (kind === 'length') {
      target = 1 + Math.floor(rnd() * 8);                          // 1..8
      prompt = 'Stretch a point into a segment ' + target + ' units long.';
      hint = 'Place a point, pick an axis, set the length to ' + target + ', then Stretch.';
    } else if (kind === 'area') {
      var a = 2 + Math.floor(rnd() * 5), b = 2 + Math.floor(rnd() * 5);   // 2..6
      target = a * b;
      prompt = 'Build a rectangle with area ' + target + ' square units.';
      hint = 'Try ' + a + ' × ' + b + ': stretch a point to length ' + a + ', then stretch that segment ' + b + ' on a different axis.';
    } else {
      var w = 2 + Math.floor(rnd() * 4), d = 2 + Math.floor(rnd() * 4), hgt = 2 + Math.floor(rnd() * 4);   // 2..5
      target = w * d * hgt;
      prompt = 'Build a prism (solid) with volume ' + target + ' cubic units.';
      hint = w + ' × ' + d + ' × ' + hgt + ' = ' + target + ': point→segment (' + w + '), →rectangle (' + d + '), →prism (' + hgt + ').';
    }
    return { id: 'bld-' + lv + '-' + (isFinite(seed) ? (seed | 0) : 1), level: lv, goalDim: lv, kind: kind, target: target, prompt: prompt, hint: hint, tolerance: 0.05 };
  }
  // Evaluate a build challenge against the current construction (PURE): solved
  // when ANY object of the target kind lands within tolerance; also reports the
  // closest attempt so the UI can coach ("closest volume so far: 22").
  function geoEvalBuildChallenge(ch, objects) {
    if (!ch) return { solved: false, closest: null, deltaPct: null, message: '' };
    var tol = ch.tolerance || 0.05;
    var best = null, bestDelta = Infinity;
    (objects || []).forEach(function (o) {
      var mm = geoStretchMeasure(o);
      if (!mm || mm.kind !== ch.kind) return;
      var delta = ch.target === 0 ? Math.abs(mm.value) : Math.abs(mm.value - ch.target) / Math.abs(ch.target);
      if (delta < bestDelta) { bestDelta = delta; best = mm.value; }
    });
    var solved = best != null && bestDelta <= tol;
    var shapeWord = ch.kind === 'length' ? 'segment' : ch.kind === 'area' ? 'rectangle' : 'prism';
    var round2 = function (n) { return Math.round(n * 100) / 100; };
    var message = best == null
      ? ('Build a ' + shapeWord + ' to set its ' + ch.kind + '.')
      : solved ? ('Solved! ' + ch.kind + ' = ' + round2(best))
        : ('Closest ' + ch.kind + ': ' + round2(best) + ' — target ' + ch.target);
    return { solved: solved, closest: best, deltaPct: best == null ? null : bestDelta, message: message };
  }

  // ── Missions ladder (PURE) — a structured progression from a segment up to a
  //    Cavalieri twin, checked against the construction. Declarative tests so the
  //    checker is one small dispatch and fully unit-testable. ──
  var GEO_MISSIONS = [
    { id: 'seg', icon: '⎯', title: 'First length', desc: 'Build a segment 5 units long.', test: { type: 'measure', kind: 'length', target: 5 } },
    { id: 'rect', icon: '▭', title: 'A rectangle', desc: 'Build a rectangle with area 12 (e.g. 3 × 4).', test: { type: 'measure', kind: 'area', target: 12 } },
    { id: 'cube', icon: '⬛', title: 'A perfect cube', desc: 'Build a cube — all three edges equal (e.g. 3 × 3 × 3).', test: { type: 'cube' } },
    { id: 'vol', icon: '📦', title: 'Target volume', desc: 'Build a prism with volume 24.', test: { type: 'measure', kind: 'volume', target: 24 } },
    { id: 'oblique', icon: '◣', title: 'Lean it over', desc: 'Build an oblique (slanted) prism — turn on Oblique first.', test: { type: 'oblique' } },
    { id: 'cavalieri', icon: '⚖', title: 'Cavalieri twins', desc: 'Build a straight prism and a slanted prism with the SAME volume.', test: { type: 'cavalieri' } },
    { id: 'squarecube', icon: '🔢', title: 'Square–cube law', desc: 'Build a prism, then place a ×2 scaled copy — watch the volume jump ×8.', test: { type: 'scaled', ratio: 2 } }
  ];
  function _geoIsCube(o, tol) {
    if (!o || o.type !== 'prism') return false;
    var a = vec3Mag(o.u), b = vec3Mag(o.v), c = vec3Mag(o.w);
    var mm = geoStretchMeasure(o);
    if (mm && mm.oblique) return false;   // a cube is a right prism
    var t = tol || 0.02;
    return Math.abs(a - b) / a <= t && Math.abs(b - c) / b <= t && a > 0.01;
  }
  function geoEvalMission(mission, objects) {
    if (!mission || !mission.test) return { solved: false };
    var objs = objects || [], test = mission.test;
    if (test.type === 'measure') {
      var tol = test.tolerance || 0.05;
      return { solved: objs.some(function (o) {
        var mm = geoStretchMeasure(o);
        return mm && mm.kind === test.kind && Math.abs(mm.value - test.target) / (test.target || 1) <= tol;
      }) };
    }
    if (test.type === 'cube')    return { solved: objs.some(function (o) { return _geoIsCube(o); }) };
    if (test.type === 'oblique') return { solved: objs.some(function (o) { var mm = geoStretchMeasure(o); return mm && mm.oblique; }) };
    if (test.type === 'cavalieri') {
      var prisms = objs.filter(function (o) { return o.type === 'prism'; }).map(function (o) { return geoStretchMeasure(o); });
      var straights = prisms.filter(function (m) { return m && !m.oblique; });
      var obliques = prisms.filter(function (m) { return m && m.oblique; });
      var solved = straights.some(function (s) { return obliques.some(function (ob) { return Math.abs(s.value - ob.value) / (s.value || 1) <= 0.05; }); });
      return { solved: solved };
    }
    if (test.type === 'scaled') {
      // Two SIMILAR prisms whose edge lengths all differ by ~the ratio (a scaled copy).
      var pr = objs.filter(function (o) { return o.type === 'prism'; });
      var r = test.ratio || 2, tol = 0.08, ok = false;
      var edges = function (o) { return [vec3Mag(o.u), vec3Mag(o.v), vec3Mag(o.w)].sort(function (x, y) { return x - y; }); };
      for (var i = 0; i < pr.length && !ok; i++) for (var j = 0; j < pr.length; j++) {
        if (i === j) continue;
        var ea = edges(pr[i]), eb = edges(pr[j]);   // eb should be ~r× ea on all three edges
        if (ea[0] > 0.05 && Math.abs(eb[0] / ea[0] - r) / r <= tol && Math.abs(eb[1] / ea[1] - r) / r <= tol && Math.abs(eb[2] / ea[2] - r) / r <= tol) { ok = true; break; }
      }
      return { solved: ok };
    }
    return { solved: false };
  }

  // ── Real-world "build this" challenges (PURE) — anchor volume/SA in objects
  //    students recognise, and give the new verbs a reason to exist (you can't
  //    build a can without Revolve, or a pyramid without Taper). Matched by
  //    target volume within tolerance, restricted to the right shape family. ──
  var GEO_REAL_OBJECTS = [
    { id: 'die',     icon: '🎲', name: 'A game die',    desc: 'Build a cube 2 units on a side.', target: 8,               types: ['prism', 'pyramid'], requireCube: true, hint: 'Stretch: 2 → 2 → 2. All three edges equal.' },
    { id: 'box',     icon: '📦', name: 'A cereal box',  desc: 'Build a box with volume 24 (e.g. 2×3×4).', target: 24,     types: ['prism'], hint: 'Stretch a point 2, that segment 3, that rectangle 4.' },
    { id: 'can',     icon: '🥫', name: 'A soup can',    desc: 'Revolve a rectangle into a cylinder, volume ≈ 25.', target: Math.PI * 4 * 2, types: ['revolution'], hint: 'Revolve mode: rectangle radius 2 (an edge on the axis) × height 2, full turn. πr²h.' },
    { id: 'pyramid', icon: '🔺', name: 'A pyramid',     desc: 'Taper a 3×3 base to a point, height 4 (volume 12).', target: 12, types: ['pyramid'], requireApex: true, hint: 'Taper mode, Top size 0. Base 3×3, height 4 → ⅓·9·4 = 12.' }
  ];
  function geoEvalRealChallenge(ch, objects) {
    if (!ch) return { solved: false, closest: null, deltaPct: null };
    var tol = ch.tolerance || 0.08, best = null, bestDelta = Infinity;
    (objects || []).forEach(function (o) {
      if (ch.types && ch.types.indexOf(o.type) < 0) return;
      if (ch.requireCube && !_geoIsCube(o)) return;
      var m = geoStretchMeasure(o);
      if (!m || m.kind !== 'volume') return;
      if (ch.requireApex && !m.apex) return;
      var delta = ch.target === 0 ? Math.abs(m.value) : Math.abs(m.value - ch.target) / Math.abs(ch.target);
      if (delta < bestDelta) { bestDelta = delta; best = m.value; }
    });
    return { solved: best != null && bestDelta <= tol, closest: best, deltaPct: best == null ? null : bestDelta };
  }
  // Optimization puzzle (PURE): the FATTEST solid — biggest volume whose surface
  //   area is within a cap. The cube is optimal (isoperimetric), so the record to
  //   beat is a cube at the cap: 6s² = cap → V = s³. Reports the student's current
  //   best-under-cap and how close it is to that theoretical max.
  function geoEvalMaxVolPuzzle(cap, objects) {
    var best = 0, bestObj = null;
    (objects || []).forEach(function (o) {
      var m = geoStretchMeasure(o);
      if (!m || m.dim !== 3 || m.surfaceArea == null) return;
      if (m.surfaceArea <= cap * 1.001 && m.value > best) { best = m.value; bestObj = o; }
    });
    var s = Math.sqrt(cap / 6), cubeMax = s * s * s;   // optimal cube volume at the cap
    return { best: best, cubeMax: cubeMax, cap: cap, fraction: cubeMax > 0 ? best / cubeMax : 0, atOptimum: best >= cubeMax * 0.97 };
  }

  // ── Prism net (PURE) — unfold a RIGHT rectangular prism into a 2D cross net of
  //    6 face rectangles (x,y,w,h,label in net units). Returns null for oblique
  //    prisms (their true net has non-rectangular flaps) so the UI can prompt the
  //    student to un-slant. Face areas sum to the surface area. ──
  function geoPrismNet(o) {
    if (!o || o.type !== 'prism') return null;
    var mm = geoStretchMeasure(o);
    if (mm && mm.oblique) return null;
    var a = vec3Mag(o.u), b = vec3Mag(o.v), c = vec3Mag(o.w);
    if (!(a > 0.001 && b > 0.001 && c > 0.001)) return null;
    // A printable six-rectangle net is valid only when every adjacent edge is
    // perpendicular. mm.oblique checks w against the base plane, but a
    // sheared/parallelogram base also needs to be rejected.
    var cosUV = Math.abs((o.u[0] * o.v[0] + o.u[1] * o.v[1] + o.u[2] * o.v[2]) / (a * b));
    var cosVW = Math.abs((o.v[0] * o.w[0] + o.v[1] * o.w[1] + o.v[2] * o.w[2]) / (b * c));
    var cosWU = Math.abs((o.w[0] * o.u[0] + o.w[1] * o.u[1] + o.w[2] * o.u[2]) / (c * a));
    if (cosUV > 0.001 || cosVW > 0.001 || cosWU > 0.001) return null;
    var faces = [
      { label: 'back',   x: c,     y: 0,       w: a, h: c },
      { label: 'left',   x: 0,     y: c,       w: c, h: b },
      { label: 'bottom', x: c,     y: c,       w: a, h: b },
      { label: 'right',  x: c + a, y: c,       w: c, h: b },
      { label: 'front',  x: c,     y: c + b,   w: a, h: c },
      { label: 'top',    x: c,     y: c + b + c, w: a, h: b }
    ];
    return { faces: faces, width: a + 2 * c, height: 2 * b + 2 * c, dims: { a: a, b: b, c: c } };
  }

  function disposeGeoObject3D(obj) {
    if (!obj) return;
    obj.traverse(function(o) {
      if (o.geometry && o.geometry.dispose) o.geometry.dispose();
      if (o.material) {
        var mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach(function(m) {
          if (m.map && m.map.dispose) m.map.dispose();
          if (m.dispose) m.dispose();
        });
      }
    });
  }

  function geoLabelAnchor(o) {
    var p = o && o.position ? o.position : [0, 0, 0];
    var a = [p[0], p[1] + 0.55, p[2]];
    if (!o) return a;
    if (o.type === 'segment' && o.vector) {
      a = [p[0] + o.vector[0] / 2, p[1] + o.vector[1] / 2 + 0.45, p[2] + o.vector[2] / 2];
    } else if (o.type === 'rect' && o.u && o.v) {
      a = [p[0] + (o.u[0] + o.v[0]) / 2, p[1] + (o.u[1] + o.v[1]) / 2 + 0.55, p[2] + (o.u[2] + o.v[2]) / 2];
    } else if (o.type === 'prism' && o.u && o.v && o.w) {
      a = [p[0] + (o.u[0] + o.v[0] + o.w[0]) / 2, p[1] + (o.u[1] + o.v[1] + o.w[1]) / 2 + 0.65, p[2] + (o.u[2] + o.v[2] + o.w[2]) / 2];
    }
    return a;
  }

  function geoObjectLabelText(o, unitShort) {
    var m = geoStretchMeasure(o);
    var names = { point: 'Point', segment: 'Segment', rect: 'Rectangle', prism: 'Prism', pyramid: 'Pyramid', revolution: 'Revolution' };
    var name = names[o && o.type] || 'Object';
    var id = o && o.id != null ? ' #' + o.id : '';
    if (!m) return name + id;
    if (m.kind === 'point') return name + id + '\n0D point';
    var units = unitShort || 'u';
    var suffix = units + (m.unitExp > 1 ? '^' + m.unitExp : '');
    var value = Math.round(m.value * 100) / 100;
    return name + id + '\n' + m.label + ': ' + value + ' ' + suffix + '\n' + m.dim + 'D';
  }

  function geoDescribeScene(mode, shape, dims, construction, unitShort) {
    var units = unitShort || 'u';
    if (mode === 'stretch') {
      var objs = (construction && construction.objects) || [];
      if (!objs.length) return 'Empty dimensional-stretch scene. Add a point to begin.';
      var counts = {};
      objs.forEach(function(o) { counts[o.type] = (counts[o.type] || 0) + 1; });
      var parts = Object.keys(counts).sort().map(function(type) { return counts[type] + ' ' + type + (counts[type] === 1 ? '' : 's'); });
      var selected = objs.find(function(o) { return o.id === construction.selection; });
      return 'Dimensional-stretch scene with ' + objs.length + ' objects: ' + parts.join(', ') + '. ' +
        (selected ? 'Selected ' + geoObjectLabelText(selected, units).replace(/\n/g, ', ') + '.' : 'No object selected.');
    }
    if (mode === 'sculpt') return 'AI sculpture scene. Use the sculpture controls to create or edit primitive parts.';
    var names = { box: 'box', sphere: 'sphere', cylinder: 'cylinder', cone: 'cone', pyramid: 'square pyramid', torus: 'torus', prism: 'triangular prism' };
    var mm = calcMeasurements(shape, dims || {});
    return 'Single ' + (names[shape] || shape || 'shape') + '. Volume ' + (Math.round(mm.vol * 100) / 100) + ' ' + units + ' cubed. Surface area ' + (Math.round(mm.sa * 100) / 100) + ' ' + units + ' squared.';
  }

  function geoBuildTutorPrompt(mode, shape, dims, construction, sculptRecipe, unitShort) {
    var units = unitShort || 'u';
    var intro = 'You are a friendly geometry tutor for a middle-school student. Keep the response under 120 words. ';
    if (mode === 'stretch') {
      return intro + geoDescribeScene('stretch', shape, dims, construction, units) +
        ' Explain the selected object or the dimensional progression from point to line to plane to solid. Ask one short guiding question and do not invent measurements.';
    }
    if (mode === 'sculpt') {
      var sm = geoSculptMeasure(sculptRecipe);
      if (!sm.parts.length) return intro + 'The AI sculpture scene is empty. Suggest one simple object to build from two or three geometric primitives and ask which primitive the student would start with.';
      var partText = sm.parts.slice(0, 12).map(function(p) { return p.name + ' (' + p.dims + ')'; }).join(', ');
      return intro + 'The student is editing a sculpture named ' + ((sculptRecipe && sculptRecipe.name) || 'untitled') + '. Parts: ' + partText +
        '. Sum-of-parts volume ' + sm.totalVol.toFixed(2) + ' ' + units + ' cubed; sum-of-parts surface area ' + sm.totalSA.toFixed(2) + ' ' + units +
        ' squared. These totals are upper bounds because overlapping parts are counted separately. Explain one useful geometric relationship and ask one short guiding question.';
    }
    var meas = calcMeasurements(shape, dims || {});
    return intro + 'The student is looking at a ' + meas.name + '. Volume = ' + meas.vol.toFixed(2) + ' ' + units +
      ' cubed; surface area = ' + meas.sa.toFixed(2) + ' ' + units + ' squared. ' +
      (meas.faces > 0 ? 'It has ' + meas.faces + ' faces, ' + meas.edges + ' edges, and ' + meas.vertices + ' vertices. ' : '') +
      'Briefly explain what makes the shape unique, give one real-world example, and share one useful math fact.';
  }

  function geoUniqueSaveName(rawName, saved) {
    var base = String(rawName || '').trim().slice(0, 40);
    if (!base) return '';
    var name = base, n = 2, existing = saved || {};
    while (Object.prototype.hasOwnProperty.call(existing, name)) {
      var suffix = ' ' + n++;
      name = base.slice(0, Math.max(1, 40 - suffix.length)) + suffix;
    }
    return name;
  }

  function geoNormalizeConstruction(snapshot) {
    var source = snapshot && Array.isArray(snapshot.objects) ? snapshot.objects : [];
    var objects;
    try { objects = JSON.parse(JSON.stringify(source)); } catch (e) { objects = []; }
    var requested = snapshot ? snapshot.selection : null;
    var selection = objects.some(function(o) { return o && o.id === requested; })
      ? requested
      : (objects.length && objects[0] && objects[0].id != null ? objects[0].id : null);
    return { objects: objects, selection: selection };
  }
  function buildGeoLabelSprite(THREE, text, anchor) {
    if (typeof document === 'undefined' || !text) return null;
    var canvas = document.createElement('canvas');
    var lines = String(text).split('\n').slice(0, 4);
    canvas.width = 512;
    canvas.height = 34 + lines.length * 42;
    var ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(2,6,23,0.94)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 5;
    ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    lines.forEach(function(line, i) {
      ctx.font = (i === 0 ? 'bold 30px' : 'bold 28px') + ' system-ui, -apple-system, Segoe UI, sans-serif';
      ctx.fillStyle = i === 0 ? '#facc15' : '#f8fafc';
      ctx.fillText(line, canvas.width / 2, 28 + i * 42);
    });
    var texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    var sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false }));
    sprite.position.set(anchor[0], anchor[1], anchor[2]);
    sprite.scale.set(2.4, 2.4 * (canvas.height / canvas.width), 1);
    sprite.renderOrder = 9999;
    sprite.userData.isGeoLabel = true;
    return sprite;
  }

  function geoShapeTitle(shape) {
    shape = String(shape || 'part');
    return shape.charAt(0).toUpperCase() + shape.slice(1);
  }

  function sculptPartLabelText(part, index, recipeScale, unitShort) {
    var pm = geoPrimitiveMeasure((part && part.shape) || 'box', (part && part.size) || []);
    var scale = recipeScale || 1;
    var units = unitShort || 'u';
    var vol = Math.round(pm.vol * scale * scale * scale * 100) / 100;
    var sa = Math.round(pm.sa * scale * scale * 100) / 100;
    return geoShapeTitle(part && part.shape) + ' #' + (index + 1) +
      '\nV: ' + vol + ' ' + units + '^3' +
      '\nSA: ' + sa + ' ' + units + '^2';
  }

  function sculptPartLabelAnchor(part) {
    var pos = (part && part.position) || [0, 0.5, 0];
    var size = (part && part.size) || [];
    var shape = part && part.shape;
    var rise = 0.65;
    if (shape === 'box') rise = (size[1] || 0.4) / 2 + 0.55;
    else if (shape === 'sphere') rise = (size[0] || 0.35) + 0.55;
    else if (shape === 'cylinder' || shape === 'cone') rise = (size[1] || 0.4) / 2 + 0.55;
    else if (shape === 'torus') rise = (size[0] || 0.3) + (size[1] || 0.08) + 0.55;
    return [pos[0] || 0, (pos[1] || 0) + rise, pos[2] || 0];
  }

  function sculptRecipeLabelText(recipe, unitShort) {
    var sm = geoSculptMeasure(recipe);
    var units = unitShort || 'u';
    return 'Sculpt total' +
      '\nV sum: ' + (Math.round(sm.totalVol * 100) / 100) + ' ' + units + '^3' +
      '\nSA sum: ' + (Math.round(sm.totalSA * 100) / 100) + ' ' + units + '^2';
  }

  function sculptRecipeLabelAnchor(recipe) {
    var parts = (recipe && recipe.parts) || [];
    if (!parts.length) return [0, 1.4, 0];
    var cx = 0, cy = 0, cz = 0, top = 0;
    parts.forEach(function(part) {
      var pos = (part && part.position) || [0, 0.5, 0];
      var anchor = sculptPartLabelAnchor(part);
      cx += pos[0] || 0; cy += pos[1] || 0; cz += pos[2] || 0;
      top = Math.max(top, anchor[1] || 0);
    });
    return [cx / parts.length, Math.max(top + 0.15, (cy / parts.length) + 0.75), cz / parts.length];
  }

  function addSculptSceneLabel(THREE, group, recipe, selectedPart, unitShort) {
    if (!THREE || !group || !recipe) return;
    var parts = recipe.parts || [];
    var hasSelectedPart = selectedPart != null && parts[selectedPart];
    var text = hasSelectedPart
      ? sculptPartLabelText(parts[selectedPart], selectedPart, recipe.scale, unitShort)
      : sculptRecipeLabelText(recipe, unitShort);
    var anchor = hasSelectedPart ? sculptPartLabelAnchor(parts[selectedPart]) : sculptRecipeLabelAnchor(recipe);
    var label = buildGeoLabelSprite(THREE, text, anchor);
    if (!label) return;
    var scale = group.scale && group.scale.x ? group.scale.x : 1;
    if (scale) label.scale.multiplyScalar(1 / scale);
    group.add(label);
  }

  // Render construction objects into a Three.js scene group, returns the group.
  function buildConstructionGroup(THREE, objects, selectedId, showLabels, unitShort) {
    var group = new THREE.Group();
    if (!objects) return group;
    objects.forEach(function(o) {
      var isSel = (o.id === selectedId);
      var color = isSel ? 0xfbbf24 : (o.type === 'point' ? 0xef4444 : o.type === 'segment' ? 0x22c55e : o.type === 'rect' ? 0x3b82f6 : o.type === 'pyramid' ? 0xf472b6 : o.type === 'revolution' ? 0x2dd4bf : 0xa78bfa);
      var mesh;
      if (o.type === 'point') {
        var pg = new THREE.SphereGeometry(0.12, 16, 16);
        mesh = new THREE.Mesh(pg, new THREE.MeshStandardMaterial({ color: color, emissive: isSel ? 0x444400 : 0x000000 }));
        mesh.position.set(o.position[0], o.position[1], o.position[2]);
      } else if (o.type === 'segment') {
        var p0 = new THREE.Vector3(o.position[0], o.position[1], o.position[2]);
        var p1 = new THREE.Vector3(o.position[0] + o.vector[0], o.position[1] + o.vector[1], o.position[2] + o.vector[2]);
        var lineGeo = new THREE.BufferGeometry().setFromPoints([p0, p1]);
        mesh = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: color, linewidth: 4 }));
        // Add endpoints
        var s1 = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), new THREE.MeshBasicMaterial({ color: color }));
        s1.position.copy(p0);
        var s2 = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), new THREE.MeshBasicMaterial({ color: color }));
        s2.position.copy(p1);
        var sgGroup = new THREE.Group();
        sgGroup.add(mesh); sgGroup.add(s1); sgGroup.add(s2);
        mesh = sgGroup;
      } else if (o.type === 'rect') {
        var p0 = [o.position[0], o.position[1], o.position[2]];
        var p1 = vec3Add(p0, o.u);
        var p2 = vec3Add(p1, o.v);
        var p3 = vec3Add(p0, o.v);
        var corners = [p0, p1, p2, p3].map(function(p) { return new THREE.Vector3(p[0], p[1], p[2]); });
        var rectGeo = new THREE.BufferGeometry();
        var verts = new Float32Array([
          corners[0].x, corners[0].y, corners[0].z,
          corners[1].x, corners[1].y, corners[1].z,
          corners[2].x, corners[2].y, corners[2].z,
          corners[0].x, corners[0].y, corners[0].z,
          corners[2].x, corners[2].y, corners[2].z,
          corners[3].x, corners[3].y, corners[3].z
        ]);
        rectGeo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
        rectGeo.computeVertexNormals();
        mesh = new THREE.Mesh(rectGeo, new THREE.MeshStandardMaterial({ color: color, side: THREE.DoubleSide, transparent: true, opacity: 0.75 }));
        // Border
        var edgesGeo = new THREE.EdgesGeometry(rectGeo);
        var edges = new THREE.LineSegments(edgesGeo, new THREE.LineBasicMaterial({ color: 0x0f172a }));
        var rectGroup = new THREE.Group();
        rectGroup.add(mesh); rectGroup.add(edges);
        mesh = rectGroup;
      } else if (o.type === 'prism') {
        // Build a parallelepiped via 8 corners
        var p0 = [o.position[0], o.position[1], o.position[2]];
        var p1 = vec3Add(p0, o.u);
        var p2 = vec3Add(p1, o.v);
        var p3 = vec3Add(p0, o.v);
        var p4 = vec3Add(p0, o.w);
        var p5 = vec3Add(p1, o.w);
        var p6 = vec3Add(p2, o.w);
        var p7 = vec3Add(p3, o.w);
        var pts = [p0, p1, p2, p3, p4, p5, p6, p7];
        var faces = [
          [0, 1, 2, 3], // bottom
          [4, 5, 6, 7], // top
          [0, 1, 5, 4], // front
          [1, 2, 6, 5], // right
          [2, 3, 7, 6], // back
          [3, 0, 4, 7]  // left
        ];
        var verts2 = [];
        faces.forEach(function(f) {
          var v0 = pts[f[0]], v1 = pts[f[1]], v2 = pts[f[2]], v3 = pts[f[3]];
          verts2.push(v0[0], v0[1], v0[2], v1[0], v1[1], v1[2], v2[0], v2[1], v2[2]);
          verts2.push(v0[0], v0[1], v0[2], v2[0], v2[1], v2[2], v3[0], v3[1], v3[2]);
        });
        var prismGeo = new THREE.BufferGeometry();
        prismGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts2), 3));
        prismGeo.computeVertexNormals();
        mesh = new THREE.Mesh(prismGeo, new THREE.MeshStandardMaterial({ color: color, transparent: true, opacity: 0.7 }));
        var prismEdges = new THREE.EdgesGeometry(prismGeo);
        var prismEdgeLines = new THREE.LineSegments(prismEdges, new THREE.LineBasicMaterial({ color: 0x0f172a }));
        var prismGroup = new THREE.Group();
        prismGroup.add(mesh); prismGroup.add(prismEdgeLines);
        mesh = prismGroup;
      } else if (o.type === 'pyramid') {
        // Tapered solid (pyramid / frustum): base + scaled top via taperCorners.
        var C = taperCorners(o);
        var ptsPy = C.base.concat(C.top);   // [b0,b1,b2,b3, t0,t1,t2,t3]
        var facesPy = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
        var vertsPy = [];
        facesPy.forEach(function(f) {
          var v0 = ptsPy[f[0]], v1 = ptsPy[f[1]], v2 = ptsPy[f[2]], v3 = ptsPy[f[3]];
          vertsPy.push(v0[0], v0[1], v0[2], v1[0], v1[1], v1[2], v2[0], v2[1], v2[2]);
          vertsPy.push(v0[0], v0[1], v0[2], v2[0], v2[1], v2[2], v3[0], v3[1], v3[2]);
        });
        var pyGeo = new THREE.BufferGeometry();
        pyGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertsPy), 3));
        pyGeo.computeVertexNormals();
        mesh = new THREE.Mesh(pyGeo, new THREE.MeshStandardMaterial({ color: color, transparent: true, opacity: 0.72, side: THREE.DoubleSide }));
        var pyEdges = new THREE.EdgesGeometry(pyGeo);
        var pyEdgeLines = new THREE.LineSegments(pyEdges, new THREE.LineBasicMaterial({ color: 0x0f172a }));
        var pyGroup = new THREE.Group();
        pyGroup.add(mesh); pyGroup.add(pyEdgeLines);
        mesh = pyGroup;
      } else if (o.type === 'revolution') {
        // Solid of revolution: sweep the rect profile around the axis (lathe mesh).
        var rvTris = revolutionTriangles(o);
        var rvGeo = new THREE.BufferGeometry();
        rvGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(rvTris), 3));
        rvGeo.computeVertexNormals();
        mesh = new THREE.Mesh(rvGeo, new THREE.MeshStandardMaterial({ color: color, transparent: true, opacity: 0.72, side: THREE.DoubleSide, flatShading: false }));
        var rvGroup = new THREE.Group();
        rvGroup.add(mesh);
        mesh = rvGroup;
      }
      if (mesh) {
        mesh.userData.objId = o.id;
        mesh.userData.objType = o.type;
        group.add(mesh);
        if (showLabels && isSel) {
          var label = buildGeoLabelSprite(THREE, geoObjectLabelText(o, unitShort), geoLabelAnchor(o));
          if (label) {
            label.userData.objId = o.id;
            group.add(label);
          }
        }
      }
    });
    return group;
  }

  // Cross-section slice overlay for a prism at height fraction t (0..1): a bright
  // translucent parallelogram (congruent to the base) placed at that level, with
  // an outline. The whole point of the visual is that this quad is the SAME size
  // at every t — a solid is a stack of these. Returns a disposable group.
  function buildSliceGroup(THREE, prism, t) {
    var group = new THREE.Group();
    if (!prism || prism.type !== 'prism') return group;
    var p = prism.position, u = prism.u, v = prism.v, w = prism.w;
    var tt = Math.max(0, Math.min(1, t));
    var base = vec3Add(p, vec3Scale(w, tt));                     // slice origin at this level
    var c0 = base, c1 = vec3Add(base, u), c2 = vec3Add(vec3Add(base, u), v), c3 = vec3Add(base, v);
    var V = function(a) { return new THREE.Vector3(a[0], a[1], a[2]); };
    // filled quad (two triangles)
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      c0[0], c0[1], c0[2], c1[0], c1[1], c1[2], c2[0], c2[1], c2[2],
      c0[0], c0[1], c0[2], c2[0], c2[1], c2[2], c3[0], c3[1], c3[2]
    ]), 3));
    geo.computeVertexNormals();
    group.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false })));
    // bright outline loop
    var loop = new THREE.BufferGeometry().setFromPoints([V(c0), V(c1), V(c2), V(c3), V(c0)]);
    group.add(new THREE.Line(loop, new THREE.LineBasicMaterial({ color: 0xfde047 })));
    return group;
  }

  // Real-world unit conversion (shared with Volume Explorer)
  var GEO_UNITS = [
    { id: 'unit', short: 'u',   long: 'unit',        toL: 1 },
    { id: 'cm',   short: 'cm',  long: 'centimeter',  toL: 0.001 },
    { id: 'in',   short: 'in',  long: 'inch',        toL: 0.01639 },
    { id: 'ft',   short: 'ft',  long: 'foot',        toL: 28.3168 },
    { id: 'm',    short: 'm',   long: 'meter',       toL: 1000 }
  ];

  // ══════════════════════════════════════
  // ═══ REGISTER TOOL ═══
  // Expose the pure stretch-math + challenge seams for unit tests (no DOM/GL).
  try {
    window.StemLab.geoPure = {
      objectVolume: objectVolume,
      geoPrismSurfaceArea: geoPrismSurfaceArea,
      stretchPoint: stretchPoint, stretchSegment: stretchSegment, stretchRect: stretchRect,
      taperRect: taperRect, taperCorners: taperCorners, geoPyramidSurfaceArea: geoPyramidSurfaceArea,
      revolveRect: revolveRect, revolutionVolume: revolutionVolume,
      resizeObject: resizeObject,
      geoStretchMeasure: geoStretchMeasure,
      geoDescribeScene: geoDescribeScene,
      geoBuildTutorPrompt: geoBuildTutorPrompt,
      geoUniqueSaveName: geoUniqueSaveName,
      geoNormalizeConstruction: geoNormalizeConstruction,
      geoScaleObject: geoScaleObject,
      geoScaleReport: geoScaleReport,
      geoCrossSectionArea: geoCrossSectionArea,
      geoCrossSectionInfo: geoCrossSectionInfo,
      geoStackVolume: geoStackVolume,
      geoMakeBuildChallenge: geoMakeBuildChallenge,
      geoEvalBuildChallenge: geoEvalBuildChallenge,
      GEO_MISSIONS: GEO_MISSIONS,
      geoEvalMission: geoEvalMission,
      GEO_REAL_OBJECTS: GEO_REAL_OBJECTS,
      geoEvalRealChallenge: geoEvalRealChallenge,
      geoEvalMaxVolPuzzle: geoEvalMaxVolPuzzle,
      geoFormulaSteps: geoFormulaSteps,
      geoPyramidGeometryRadius: geoPyramidGeometryRadius,
      geoNormalizeShapeDims: geoNormalizeShapeDims,
      geoChallengeAnswerCorrect: geoChallengeAnswerCorrect,
      geoFormatChallengeAnswer: geoFormatChallengeAnswer,
      geoCrossSection: geoCrossSection, geoConicSection: geoConicSection,
      geoShapeNet: geoShapeNet, geoRealWorldScale: geoRealWorldScale,
      geoPrimitiveMeasure: geoPrimitiveMeasure, geoSculptMeasure: geoSculptMeasure,
      geoPrismNet: geoPrismNet
    };
  } catch (e) {}

  // ══════════════════════════════════════
  window.StemLab.registerTool('geoSandbox', {
    icon: '\uD83D\uDD37', label: 'Geometry Sandbox',
    desc: 'Explore 3D shapes with interactive controls. Volume, surface area, challenge mode, and STL export.',
    color: 'sky', category: 'math',

    // ── Three.js lifecycle: called once before first render ──
    init: function(ctx) {
      ensureThreeJS(
        function() {
          if (ctx.addToast) ctx.addToast('\uD83D\uDD37 3D engine loaded', 'info');
          ctx.setToolData(function(p) { return Object.assign({}, p, { _threeLoaded: true }); });
        },
        function() {
          if (ctx.addToast) ctx.addToast('\u274C 3D engine failed to load', 'error');
        }
      );
    },

    cleanup: function() { cleanupScene(); },

    render: function(ctx) {
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === "function") ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var addToast = ctx.addToast;
      var awardXP = ctx.awardXP;
      // honor the 2nd-arg English fallback (ctx.t is single-arg & ignores it; see dev-tools/check_i18n_fallback.cjs)
      var t = function (k, fb) { var v; try { v = (typeof ctx.t === 'function') ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      var announceToSR = ctx.announceToSR;
      var a11yClick = ctx.a11yClick;
      var canvasNarrate = ctx.canvasNarrate;

      return (function() {

      // ── State ──
      var gd = (labToolData && labToolData.geoSandbox) || {};
      var upd = function(key, val) { setLabToolData(function(prev) { return Object.assign({}, prev, { geoSandbox: Object.assign({}, prev.geoSandbox || {}, (function() { var o = {}; o[key] = val; return o; })()) }); }); };
      var webglErrState = React.useState(false);
      var webglError = webglErrState[0];
      var setWebglError = webglErrState[1];
      // WebXR: show an "Enter VR" button only when the browser reports immersive-vr
      // support (a headset + granted permission). No-op everywhere else.
      var _xrSup = React.useState(false); var xrSupported = _xrSup[0], setXrSupported = _xrSup[1];
      React.useEffect(function() {
        var alive = true;
        try {
          if (navigator.xr && navigator.xr.isSessionSupported) {
            navigator.xr.isSessionSupported('immersive-vr').then(function(ok) { if (alive) setXrSupported(!!ok); }).catch(function() {});
          }
        } catch (e) {}
        return function() { alive = false; };
      }, []);
      var themeCtx = React.useContext(window.AlloThemeContext || React.createContext(null));
      var theme = themeCtx ? themeCtx.theme : 'dark';

          // Canvas narration removed — was firing on every render causing repeated TTS
      var updDim = function(key, val) {
        setLabToolData(function(prev) {
          var g = prev.geoSandbox || {};
          var nd = Object.assign({}, g.dims || { w: 3, h: 3, d: 3, r: 1.5, rTop: 1.5, rBot: 1.5, tube: 0.5, segs: 32 });
          nd[key] = Number(val);
          nd = geoNormalizeShapeDims(shape, nd);
          // Track dimension adjustments for badge
          var ext = Object.assign({}, g._geoExt || {});
          ext.dimAdjusts = (ext.dimAdjusts || 0) + 1;
          return Object.assign({}, prev, { geoSandbox: Object.assign({}, g, { dims: nd, _geoExt: ext }) });
        });
        // Debounced SR announcement so we do not spam during rapid drags
        if (announceToSR) {
          if (window._geoSrTimer) clearTimeout(window._geoSrTimer);
          window._geoSrTimer = setTimeout(function() {
            window._geoSrTimer = null;
            var nextDims = geoNormalizeShapeDims(shape, Object.assign({}, dims, (function() { var o = {}; o[key] = Number(val); return o; })()));
            var newMeas = calcMeasurements(shape, nextDims);
            announceToSR(key + ' set to ' + nextDims[key].toFixed(1) + '. Volume ' + newMeas.vol.toFixed(2) + ', surface area ' + newMeas.sa.toFixed(2) + '.');
          }, 350);
        }
      };

      var shape = gd.shape || 'box';
      var dims = geoNormalizeShapeDims(shape, gd.dims);
      var shapeColor = gd.color || '#60a5fa';
      var wireframe = gd.wireframe || false;
      var opacity = gd.opacity != null ? gd.opacity : 1;

      // v2 additions ─────────────────────────────────────────────
      var mode = gd.mode || 'single'; // 'single' | 'stretch' | 'sculpt'
      var construction = gd.construction || { objects: [], selection: null };
      // Free-placement + resize state (Foundation wave): where new points land, the
      // snap grid, and whether a canvas tap drops a point.
      var placeArmed = !!gd.placeArmed;
      var snap = gd.snap != null ? gd.snap : 1;            // 0 = off, else grid size
      var placeX = gd.placeX != null ? gd.placeX : 0;
      var placeZ = gd.placeZ != null ? gd.placeZ : 0;
      var resizeSnapRef = React.useRef(false);              // one undo snapshot per slider drag
      // ── AI Sculpt (v3, reuses window.AlloModules.Prim3D) ──
      var sculptRecipe = gd.sculptRecipe || null;
      var _scP = React.useState(''); var sculptPrompt = _scP[0], setSculptPrompt = _scP[1];
      var _scR = React.useState(''); var sculptRefine = _scR[0], setSculptRefine = _scR[1];
      var _scB = React.useState(false); var sculptBusy = _scB[0], setSculptBusy = _scB[1];
      var _scRdy = React.useState(!!(window.AlloModules && window.AlloModules.Prim3D)); var prim3dReady = _scRdy[0], setPrim3dReady = _scRdy[1];
      var _scEd = React.useState(false); var sculptEdit = _scEd[0], setSculptEdit = _scEd[1];       // hand-editing a recipe?
      var _scSel = React.useState(null); var selPart = _scSel[0], setSelPart = _scSel[1];             // selected part index
      var _scUndo = React.useState([]); var sculptUndo = _scUndo[0], setSculptUndo = _scUndo[1];      // edit undo stack (session)
      // ── Voice sculpting (hands-free making). Feature-detected on Web Speech;
      //    the mic only shows where dictation is available — no clutter otherwise. ──
      var _vSup = React.useState(false); var voiceSupported = _vSup[0], setVoiceSupported = _vSup[1];
      var _vLis = React.useState(false); var voiceListening = _vLis[0], setVoiceListening = _vLis[1];
      var _vHrd = React.useState(''); var voiceHeard = _vHrd[0], setVoiceHeard = _vHrd[1];
      React.useEffect(function() {
        try { if (window.SpeechRecognition || window.webkitSpeechRecognition) setVoiceSupported(true); } catch (e) {}
        return function() { try { if (window._geoVoiceCtl) { window._geoVoiceCtl.stop(); window._geoVoiceCtl = null; } } catch (e) {} };
      }, []);
      var ensureVoice = function(cb) {
        var V = window.AlloFlowVoice || (window.AlloModules && window.AlloModules.Voice);
        if (V) { cb(V); return; }
        var base = 'https://alloflow-cdn.pages.dev/', q = '';
        try {
          var scr = document.querySelectorAll('script[src]');
          for (var i = 0; i < scr.length; i++) {
            var m = (scr[i].getAttribute('src') || '').match(/^(.*\/)(?:voice_module|prim3d_module|allo_vr_module|stem_lab\/stem_tool_[a-z0-9]+)\.js(\?.*)?$/);
            if (m) { base = m[1]; q = m[2] || ''; break; }
          }
        } catch (e) {}
        try {
          var s = document.createElement('script'); s.src = base + 'voice_module.js' + q; s.async = true;
          s.onload = function() { cb(window.AlloFlowVoice || (window.AlloModules && window.AlloModules.Voice)); };
          s.onerror = function() { cb(null); };
          document.head.appendChild(s);
        } catch (e) { cb(null); }
      };
      var history = gd.history || [];
      var savedConstructions = gd.savedConstructions || {};
      var savedSculpts = gd.savedSculpts || {};
      var showSaved = gd.showSaved || false;
      var _saveOpen = React.useState(false); var saveOpen = _saveOpen[0], setSaveOpen = _saveOpen[1];
      var _saveName = React.useState(''); var saveName = _saveName[0], setSaveName = _saveName[1];
      var saveNameRef = React.useRef(null);
      var _deletePending = React.useState(null); var deletePending = _deletePending[0], setDeletePending = _deletePending[1];
      var deleteCancelRef = React.useRef(null);
      React.useEffect(function() { if (deletePending && deleteCancelRef.current) deleteCancelRef.current.focus(); }, [deletePending]);
      React.useEffect(function() { if (saveOpen && saveNameRef.current) saveNameRef.current.focus(); }, [saveOpen]);
      var showSceneLabels = gd.showSceneLabels !== false;
      var unitId = gd.unitId || 'unit';
      var unitDef = GEO_UNITS.find(function(u) { return u.id === unitId; }) || GEO_UNITS[0];
      var stretchAxis = gd.stretchAxis || 'x';
      var stretchLength = gd.stretchLength != null ? gd.stretchLength : 2;
      var stretchSlant = gd.stretchSlant != null ? gd.stretchSlant : 0;   // Cavalieri shear (0 = right/straight)
      // Predict-then-reveal (reward loop): when on, a stretch pauses to ask for a
      // guess before it resolves. pendingPredict holds the paused move.
      var predictMode = !!gd.predictMode;
      var pendingPredict = gd.pendingPredict || null;
      var _pg = React.useState(''); var predictGuess = _pg[0], setPredictGuess = _pg[1];
      // Build verb: how a stretch resolves. 'stretch' = right prism; 'taper' =
      // pyramid/frustum (rect only); 'revolve' = solid of revolution (Wave 4).
      var buildVerb = gd.buildVerb || 'stretch';
      var topScale = gd.topScale != null ? gd.topScale : 0;   // taper top size (0 = apex)
      var revolveAngle = gd.revolveAngle != null ? gd.revolveAngle : 360;   // revolve sweep (degrees)
      var revolveProfile = gd.revolveProfile === 'triangle' ? 'triangle' : 'rect';   // rect→cylinder, triangle→cone
      // Wave 5 content: active real-world build + the fattest-solid puzzle.
      var realChallengeId = gd.realChallenge || null;
      var realChallenge = realChallengeId ? GEO_REAL_OBJECTS.find(function(r) { return r.id === realChallengeId; }) : null;
      var realEval = (mode === 'stretch' && realChallenge) ? geoEvalRealChallenge(realChallenge, construction.objects) : null;
      var puzzleOn = !!gd.puzzleOn;
      var PUZZLE_SA_CAP = 54;   // 6·3² → optimal cube is 3×3×3, volume 27
      var puzzleEval = (mode === 'stretch' && puzzleOn) ? geoEvalMaxVolPuzzle(PUZZLE_SA_CAP, construction.objects) : null;
      // ── Build Challenge (stretch-mode problem solving) ──
      var buildChallenge = gd.buildChallenge || null;
      var buildScore = gd.buildScore || { solved: 0 };
      var buildEval = (mode === 'stretch' && buildChallenge)
        ? geoEvalBuildChallenge(buildChallenge, construction.objects)
        : null;

      function pushHistory() {
        setLabToolData(function(prev) {
          var g = prev.geoSandbox || {};
          var snap = JSON.parse(JSON.stringify(g.construction || construction));
          var next = (g.history || []).concat([snap]);
          if (next.length > 30) next = next.slice(next.length - 30);
          return Object.assign({}, prev, { geoSandbox: Object.assign({}, g, { history: next }) });
        });
      }
      function doStretchUndo() {
        if (!history.length) return;
        var prev = history[history.length - 1];
        var next = history.slice(0, -1);
        setLabToolData(function(p) {
          var g = p.geoSandbox || {};
          return Object.assign({}, p, { geoSandbox: Object.assign({}, g, { construction: prev, history: next }) });
        });
        if (announceToSR) announceToSR('Undo. ' + prev.objects.length + ' objects in scene.');
      }

      function addPoint(pos) {
        pushHistory();
        var newObjs = construction.objects.concat([{ id: nextObjId(construction.objects), type: 'point', position: pos || [0, 0, 0] }]);
        var newId = newObjs[newObjs.length - 1].id;
        setLabToolData(function(p) {
          var g = p.geoSandbox || {};
          return Object.assign({}, p, { geoSandbox: Object.assign({}, g, { construction: { objects: newObjs, selection: newId } }) });
        });
        geoSound('shapeChange');
        if (announceToSR) announceToSR('Point added. Select an axis and stretch to create a segment.');
      }
      // Build the stretched object WITHOUT committing (so predict-mode can measure
      // the result before revealing it). Returns null if the source can't stretch.
      function buildStretchObj(sel, ax, len, slant, verb, top, angle) {
        if (!sel) return null;
        verb = verb || 'stretch';
        // Taper / Revolve only apply to a rectangle.
        if (verb === 'taper' && sel.type === 'rect') return taperRect(sel, ax, len, top, slant);
        if (verb === 'revolve' && sel.type === 'rect') return revolveRect(sel, ax, angle, 48, revolveProfile);
        if (sel.type === 'point')   return stretchPoint(sel, ax, len);
        if (sel.type === 'segment') return stretchSegment(sel, ax, len, slant);
        if (sel.type === 'rect')    return stretchRect(sel, ax, len, slant);
        return null;
      }
      function commitNewObject(newObj, verb) {
        pushHistory();
        newObj.id = nextObjId(construction.objects);
        var newObjs = construction.objects.concat([newObj]);
        setLabToolData(function(p) {
          var g = p.geoSandbox || {};
          return Object.assign({}, p, { geoSandbox: Object.assign({}, g, { construction: { objects: newObjs, selection: newObj.id }, pendingPredict: null }) });
        });
        geoSound('shapeChange');
        var lbl = newObj.type === 'segment' ? 'segment (line)' : newObj.type === 'rect' ? 'rectangle (plane)' : newObj.type === 'prism' ? 'prism (solid)' : newObj.type === 'pyramid' ? 'tapered solid' : newObj.type === 'revolution' ? 'solid of revolution' : newObj.type;
        if (announceToSR) announceToSR((verb || 'Stretched') + ' to ' + lbl + '. Now ' + newObjs.length + ' objects in construction.');
      }
      function performStretch(axisOverride) {
        var ax = (axisOverride === 'x' || axisOverride === 'y' || axisOverride === 'z') ? axisOverride : stretchAxis;
        var sel = construction.objects.find(function(o) { return o.id === construction.selection; });
        if (!sel) { addToast('Select an object first', 'error'); return; }
        var newObj = buildStretchObj(sel, ax, stretchLength, stretchSlant, buildVerb, topScale, revolveAngle);
        if (!newObj) { addToast('Cannot stretch this further in this dimension', 'info'); return; }
        // Predict-then-reveal: pause and ask for a guess before committing.
        if (predictMode) {
          var mm = geoStretchMeasure(newObj);
          setPredictGuess('');
          setLabToolData(function(p) {
            var g = p.geoSandbox || {};
            return Object.assign({}, p, { geoSandbox: Object.assign({}, g, { pendingPredict: { srcId: sel.id, ax: ax, len: stretchLength, slant: stretchSlant, verb: buildVerb, top: topScale, angle: revolveAngle, kind: mm.kind, label: mm.label, unitExp: mm.unitExp, actual: mm.value } }) });
          });
          if (announceToSR) announceToSR('Predict the ' + mm.label.toLowerCase() + ' of the result, then reveal.');
          return;
        }
        commitNewObject(newObj, 'Stretched');
      }
      // Reveal a paused prediction: build the stored move, score the guess.
      function revealPrediction() {
        var pp = gd.pendingPredict; if (!pp) return;
        var sel = construction.objects.find(function(o) { return o.id === pp.srcId; });
        var newObj = sel && buildStretchObj(sel, pp.ax, pp.len, pp.slant, pp.verb, pp.top, pp.angle);
        if (!newObj) { setLabToolData(function(p) { var g = p.geoSandbox || {}; return Object.assign({}, p, { geoSandbox: Object.assign({}, g, { pendingPredict: null }) }); }); return; }
        commitNewObject(newObj, 'Revealed —');
        var guess = parseFloat(predictGuess);
        if (isFinite(guess) && pp.actual) {
          var err = Math.abs(guess - pp.actual) / Math.abs(pp.actual);
          var pct = Math.round(err * 100);
          if (err <= 0.05) { if (awardXP) awardXP('geoSandbox', 15, 'Spot-on prediction'); if (addToast) addToast('🎯 Spot on! ' + pp.label + ' = ' + (Math.round(pp.actual * 100) / 100) + ' (you said ' + guess + ')', 'success'); }
          else if (err <= 0.15) { if (awardXP) awardXP('geoSandbox', 8, 'Close prediction'); if (addToast) addToast('👍 Within ' + pct + '% — ' + pp.label + ' = ' + (Math.round(pp.actual * 100) / 100), 'success'); }
          else if (addToast) addToast('Actual ' + pp.label.toLowerCase() + ' = ' + (Math.round(pp.actual * 100) / 100) + ' (you said ' + guess + ', off by ' + pct + '%)', 'info');
        }
        setPredictGuess('');
      }
      function cancelPrediction() {
        setLabToolData(function(p) { var g = p.geoSandbox || {}; return Object.assign({}, p, { geoSandbox: Object.assign({}, g, { pendingPredict: null }) }); });
        setPredictGuess('');
      }
      function clearConstruction() {
        pushHistory();
        setLabToolData(function(p) {
          var g = p.geoSandbox || {};
          return Object.assign({}, p, { geoSandbox: Object.assign({}, g, { construction: { objects: [], selection: null } }) });
        });
        if (announceToSR) announceToSR('Construction cleared');
      }
      function selectObject(id) {
        setLabToolData(function(p) {
          var g = p.geoSandbox || {};
          return Object.assign({}, p, { geoSandbox: Object.assign({}, g, { construction: Object.assign({}, g.construction || construction, { selection: id }) }) });
        });
      }
      // Cycle the selection through the construction (dir +1/-1). Used by the VR
      // controller (no mouse) and handy for keyboard-only 2D use.
      function cycleSelection(dir) {
        var objs = construction.objects;
        if (!objs.length) return;
        var idx = objs.findIndex(function(o) { return o.id === construction.selection; });
        var nextIdx = ((idx < 0 ? 0 : idx + (dir < 0 ? -1 : 1)) + objs.length) % objs.length;
        selectObject(objs[nextIdx].id);
        var mm = geoStretchMeasure(objs[nextIdx]);
        if (announceToSR && mm) announceToSR('Selected ' + mm.label.toLowerCase() + (mm.dim > 0 ? ' ' + (Math.round(mm.value * 100) / 100) : ''));
      }
      // ── Free placement (Foundation wave) — drop a point at a snapped x/z on the
      //    ground plane. Called by the numeric "Place" button and by the canvas
      //    raycaster (window._geoPlacePoint) when click-to-place is armed. ──
      function placePoint(x, z) {
        var sx = snap ? Math.round(x / snap) * snap : Math.round(x * 100) / 100;
        var sz = snap ? Math.round(z / snap) * snap : Math.round(z * 100) / 100;
        addPoint([sx, 0, sz]);
      }
      // Delete a single object (stretch mode had only Undo / Clear-all before).
      function deleteObject(id) {
        if (!construction.objects.some(function(o) { return o.id === id; })) return;
        pushHistory();
        var objs = construction.objects.filter(function(o) { return o.id !== id; });
        var newSel = construction.selection === id ? (objs.length ? objs[objs.length - 1].id : null) : construction.selection;
        setLabToolData(function(p) {
          var g = p.geoSandbox || {};
          return Object.assign({}, p, { geoSandbox: Object.assign({}, g, { construction: { objects: objs, selection: newSel } }) });
        });
        geoSound('shapeChange');
        if (announceToSR) announceToSR('Deleted. ' + objs.length + ' object' + (objs.length === 1 ? '' : 's') + ' remain.');
      }
      // Resize one edge of the SELECTED object to a new length, live. commitHistory
      // is false during a slider drag (we snapshot once on pointer-down via
      // beginResizeDrag) and true for a discrete number-box commit — so undo steps
      // back one drag, not one pixel.
      function resizeSelectedDim(dimIndex, newLen, commitHistory) {
        var sel = construction.objects.find(function(o) { return o.id === construction.selection; });
        if (!sel) return;
        var v = parseFloat(newLen); if (isNaN(v)) return;
        v = Math.max(0.1, Math.min(20, v));
        if (commitHistory) pushHistory();
        var updated = resizeObject(sel, dimIndex, v);
        var objs = construction.objects.map(function(o) { return o.id === sel.id ? updated : o; });
        setLabToolData(function(p) {
          var g = p.geoSandbox || {};
          return Object.assign({}, p, { geoSandbox: Object.assign({}, g, { construction: { objects: objs, selection: sel.id } }) });
        });
      }
      function beginResizeDrag() { if (!resizeSnapRef.current) { pushHistory(); resizeSnapRef.current = true; } }
      function endResizeDrag() { resizeSnapRef.current = false; }
      // Start / advance a build challenge. Level auto-advances 1→2→3 with each
      // solve so the problem-solving scaffolds from length to area to volume.
      function startBuildChallenge(level) {
        var lv = level || (buildChallenge ? Math.min(3, (buildChallenge.level || 1) + (buildEval && buildEval.solved ? 1 : 0)) : 1);
        var seed = ((Date.now() % 100000) ^ (construction.objects.length * 131)) | 0;
        var ch = geoMakeBuildChallenge(lv, seed);
        setLabToolData(function(p) {
          var g = p.geoSandbox || {};
          return Object.assign({}, p, { geoSandbox: Object.assign({}, g, { buildChallenge: ch }) });
        });
        if (addToast) addToast('🎯 ' + ch.prompt, 'info');
        if (announceToSR) announceToSR('New build challenge. ' + ch.prompt);
      }
      function clearBuildChallenge() {
        setLabToolData(function(p) {
          var g = p.geoSandbox || {};
          var ng = Object.assign({}, g); delete ng.buildChallenge;
          return Object.assign({}, p, { geoSandbox: ng });
        });
      }
      // Place a similar (scaled) copy of the selected object beside it, so the
      // student SEES small-vs-big and the square–cube jump in the readouts.
      function placeScaledCopy(k) {
        var sel = construction.objects.find(function(o) { return o.id === construction.selection; });
        if (!sel || sel.type === 'point') { if (addToast) addToast('Select a segment, rectangle, prism, or tapered solid to scale', 'info'); return; }
        var copy = geoScaleObject(sel, k);
        if (!copy) { if (addToast) addToast('This solid cannot be scaled as a similar copy yet', 'info'); return; }
        // offset so the copy sits clear of the original (span of the bigger one + gap)
        var span = (vec3Mag(sel.u || sel.vector || [1,0,0]) || 1) * (k + 1) + 1;
        copy.position = [ (sel.position[0] || 0) + span, sel.position[1] || 0, sel.position[2] || 0 ];
        copy.id = nextObjId(construction.objects);   // fresh id (geoScaleObject carried the source's)
        pushHistory();
        var newObjs = construction.objects.concat([copy]);
        setLabToolData(function(p) {
          var g = p.geoSandbox || {};
          return Object.assign({}, p, { geoSandbox: Object.assign({}, g, { construction: { objects: newObjs, selection: copy.id } }) });
        });
        geoSound('shapeChange');
        if (announceToSR) { var rep = geoScaleReport(sel, k); if (rep && rep.rows.length) announceToSR('Placed a ' + k + '× copy. ' + rep.rows[rep.rows.length - 1].label + ' is now ' + rep.rows[rep.rows.length - 1].ratio.toFixed(0) + ' times bigger.'); }
      }
      function saveConstruction(name) {
        if (!name) return;
        var trimmed = geoUniqueSaveName(name, savedConstructions);
        if (!trimmed) return;
        var snap = JSON.parse(JSON.stringify(construction));
        snap.savedAt = Date.now();
        var next = Object.assign({}, savedConstructions);
        next[trimmed] = snap;
        setLabToolData(function(p) {
          var g = p.geoSandbox || {};
          return Object.assign({}, p, { geoSandbox: Object.assign({}, g, { savedConstructions: next }) });
        });
        if (addToast) addToast('💾 Saved "' + trimmed + '"', 'success');
      }
      function loadConstruction(name) {
        var snap = savedConstructions[name];
        if (!snap) return;
        pushHistory();
        var restored = geoNormalizeConstruction(snap);
        setLabToolData(function(p) {
          var g = p.geoSandbox || {};
          return Object.assign({}, p, { geoSandbox: Object.assign({}, g, { construction: restored }) });
        });
        if (announceToSR) announceToSR('Loaded ' + name);
      }
      function deleteConstruction(name) {
        var next = Object.assign({}, savedConstructions);
        delete next[name];
        setLabToolData(function(p) {
          var g = p.geoSandbox || {};
          return Object.assign({}, p, { geoSandbox: Object.assign({}, g, { savedConstructions: next }) });
        });
        if (announceToSR) announceToSR('Deleted saved construction ' + name);
      }

      // ── Extended state (badges, streaks, AI) ──
      var ext = gd._geoExt || {};
      var showBadges = ext.showBadges || false;
      var aiResponse = ext.aiResponse || '';
      var aiLoading = ext.aiLoading || false;
      var showAI = ext.showAI || false;
      var aiRequestRef = React.useRef(false);

      var updExt = function(obj) {
        setLabToolData(function(prev) {
          var g = prev.geoSandbox || {};
          return Object.assign({}, prev, { geoSandbox: Object.assign({}, g, { _geoExt: Object.assign({}, g._geoExt || {}, obj) }) });
        });
      };

      // ── Measurements ──
      var m = calcMeasurements(shape, dims);
      var canvasDescription = geoDescribeScene(mode, shape, dims, construction, unitDef.short);
      var showMath = !!gd.showMath;                       // "show the math" substituted steps
      var steps = geoFormulaSteps(shape, dims);
      // Cross-section explorer (single mode)
      var xsOn = !!gd.xsOn;
      var xsT = gd.xsT != null ? gd.xsT : 0.5;
      var conicTilt = gd.conicTilt != null ? gd.conicTilt : 0;
      var xs = geoCrossSection(shape, dims, xsT);
      var conic = shape === 'cone' ? geoConicSection(dims, conicTilt) : null;
      // Net unfold + real-world scale (single mode)
      var netOpen = !!gd.singleNetOpen;
      var shapeNet = geoShapeNet(shape, dims);
      var realScale = geoRealWorldScale(m.vol);

      // ── Challenge state ──
      var challenge = gd.challenge || null;
      var challengeAnswer = gd.challengeAnswer || '';
      var challengeResult = gd.challengeResult || null;
      var challengeScore = gd.challengeScore || { correct: 0, total: 0 };

      // ── Shape change with sound + badge tracking + SR announcement ──
      var selectShape = function(sid) {
        geoSound('shapeChange');
        // SR announcement for shape switch
        var shapeMeta = shapes.find(function(s) { return s.id === sid; });
        if (announceToSR && shapeMeta) {
          var newMeas = calcMeasurements(sid, dims);
          announceToSR(shapeMeta.label + ' selected. Volume ' + newMeas.vol.toFixed(2) + ' cubic units, surface area ' + newMeas.sa.toFixed(2) + ' square units.');
        }
        setLabToolData(function(prev) {
          var g = prev.geoSandbox || {};
          var exObj = Object.assign({}, g._geoExt || {});
          var explored = (exObj.shapesExplored || []).slice();
          if (explored.indexOf(sid) === -1) explored.push(sid);
          exObj.shapesExplored = explored;
          var updates = checkGeoBadges(exObj, {}, awardXP, addToast);
          return Object.assign({}, prev, { geoSandbox: Object.assign({}, g, { shape: sid, _geoExt: Object.assign(exObj, updates) }) });
        });
      };

      var generateChallenge = function() {
        var sids = ['box','sphere','cylinder','cone','pyramid','torus','prism'];
        var tmpls = [
          { type:'volume', q:'Calculate the volume of this shape', unit:'u\u00B3' },
          { type:'surfaceArea', q:'Calculate the total surface area', unit:'u\u00B2' },
          { type:'faces', q:'How many faces does this shape have?', unit:'' },
          { type:'edges', q:'How many edges does this shape have?', unit:'' },
          { type:'vertices', q:'How many vertices does this shape have?', unit:'' },
          { type:'identify', q:'What type of 3D shape is this?', unit:'' },
          { type:'lateralArea', q:'Calculate the lateral (side) surface area only', unit:'u\u00B2' },
          { type:'eulerCheck', q:'Calculate V \u2212 E + F (Euler\u2019s formula)', unit:'' }
        ];
        var sid = sids[Math.floor(Math.random()*sids.length)];
        var valid = tmpls.filter(function(tp) {
          if (['faces','edges','vertices','eulerCheck'].indexOf(tp.type)>=0 && (sid==='sphere'||sid==='torus')) return false;
          // Euler's V−E+F=2 holds only for convex POLYHEDRA — cone & cylinder have curved
          // surfaces, so their face/edge/vertex counts are a teaching convention, not Euler's
          // theorem. Don't quiz eulerCheck on them (it would reward a convention-dependent answer).
          if (tp.type==='eulerCheck' && (sid==='cone'||sid==='cylinder')) return false;
          if (tp.type==='lateralArea' && (sid==='sphere'||sid==='torus')) return false;
          return true;
        });
        var tmpl = valid[Math.floor(Math.random()*valid.length)];
        var rd = { w:+(1+Math.random()*7).toFixed(1), h:+(1+Math.random()*7).toFixed(1), d:+(1+Math.random()*7).toFixed(1), r:+(0.5+Math.random()*3.5).toFixed(1), rTop:+(0.5+Math.random()*2.5).toFixed(1), rBot:+(0.5+Math.random()*2.5).toFixed(1), tube:+(0.2+Math.random()*1.3).toFixed(1), segs:32 };
        rd = geoNormalizeShapeDims(sid, rd);
        var cm = challengeCalc(sid, rd);
        var answer;
        switch(tmpl.type) { case 'volume': answer=cm.vol; break; case 'surfaceArea': answer=cm.sa; break; case 'faces': answer=cm.f; break; case 'edges': answer=cm.e; break; case 'vertices': answer=cm.v; break; case 'identify': answer=cm.name; break; case 'lateralArea': answer=cm.lat; break; case 'eulerCheck': answer=cm.v-cm.e+cm.f; break; }
        var dd;
        switch(sid) {
          case 'box': dd='W='+rd.w+', H='+rd.h+', D='+rd.d; break;
          case 'sphere': dd='r='+rd.r; break;
          case 'cylinder': dd='rTop='+rd.rTop+', rBot='+rd.rBot+', H='+rd.h; break;
          case 'cone': dd='r='+rd.r+', H='+rd.h; break;
          case 'pyramid': dd='Base='+(2*rd.r).toFixed(1)+', H='+rd.h; break;
          case 'torus': dd='R='+rd.r+', tube='+rd.tube; break;
          case 'prism': dd='W='+rd.w+', H='+rd.h+', D='+rd.d; break;
          default: dd=''; break;
        }
        setLabToolData(function(prev) { return Object.assign({}, prev, { geoSandbox: Object.assign({}, prev.geoSandbox||{}, { shape:sid, dims:rd, challengeMode:true, challenge:{ type:tmpl.type, shapeId:sid, dims:rd, answer:answer, question:tmpl.q, unit:tmpl.unit, dimDesc:dd, shapeName:cm.name }, challengeAnswer:'', challengeResult:null }) }); });
        window.setTimeout(function() { var input = document.getElementById('geo-challenge-answer'); if (input) input.focus(); }, 0);
      };

      var checkChallengeAnswer = function() {
        if (!challenge || !challengeAnswer.trim()) return;
        var correct = geoChallengeAnswerCorrect(challenge, challengeAnswer);
        // Sound effect
        geoSound(correct ? 'correct' : 'wrong');
        var ns = { correct:challengeScore.correct+(correct?1:0), total:challengeScore.total+1 };
        // Update ext for badge tracking
        setLabToolData(function(prev) {
          var g = prev.geoSandbox || {};
          var exObj = Object.assign({}, g._geoExt || {});
          exObj.totalCorrect = (exObj.totalCorrect || 0) + (correct ? 1 : 0);
          exObj.totalAttempted = (exObj.totalAttempted || 0) + 1;
          exObj.streak = correct ? (exObj.streak || 0) + 1 : 0;
          // Streak sound
          if (correct && exObj.streak >= 3 && exObj.streak % 1 === 0) geoSound('streak');
          var updates = checkGeoBadges(exObj, {}, awardXP, addToast);
          return Object.assign({}, prev, { geoSandbox: Object.assign({}, g, { challengeResult:correct?'correct':'wrong', challengeScore:ns, _geoExt: Object.assign(exObj, updates) }) });
        });
        if (correct && typeof awardXP === 'function') awardXP('geoSandbox', 5, 'Geometry challenge correct!');
        if (announceToSR) announceToSR(correct ? 'Correct. Five experience points awarded.' : 'Not quite. The correct answer is ' + geoFormatChallengeAnswer(challenge) + (challenge.unit ? ' ' + challenge.unit : '') + '.');
      };

      // ── AI Tutor ──
      var askAI = function() {
        if (aiLoading || aiRequestRef.current) return;
        aiRequestRef.current = true;
        updExt({ aiLoading: true, aiResponse: '', showAI: true });
        var prompt = geoBuildTutorPrompt(mode, shape, dims, construction, sculptRecipe, unitDef.short);
        if (typeof ctx.callGemini === 'function') {
          ctx.callGemini(prompt, false, false, 0.7).then(function(resp) {
            aiRequestRef.current = false;
            updExt({ aiResponse: resp || 'No response received.', aiLoading: false });
            if (announceToSR) announceToSR('AI Tutor response ready.');
          }).catch(function() {
            aiRequestRef.current = false;
            updExt({ aiResponse: 'AI tutor is unavailable right now.', aiLoading: false });
            if (announceToSR) announceToSR('AI Tutor is unavailable right now.');
          });
        } else {
          aiRequestRef.current = false;
          updExt({ aiResponse: 'AI tutor requires Gemini API.', aiLoading: false });
          if (announceToSR) announceToSR('AI Tutor requires an AI provider connection.');
        }
      };

      // ── AI Sculpt handlers (reuse window.AlloModules.Prim3D) ──
      var _updSculpt = function(recipe) { upd('sculptRecipe', recipe); };
      var doGenerateSculpt = function(subjOverride) {
        var P3D = window.AlloModules && window.AlloModules.Prim3D;
        if (!P3D || sculptBusy || typeof ctx.callGemini !== 'function') return;
        var subj = (typeof subjOverride === 'string' && subjOverride.trim()) ? subjOverride.trim() : ((sculptPrompt || '').trim() || 'a friendly mascot');
        setSculptBusy(true);
        ctx.callGemini(P3D.buildRecipePrompt(subj), false, false, 0.85).then(function(resp) {
          var recipe = P3D.parseRecipe(typeof resp === 'string' ? resp : (resp && (resp.text || resp.output || resp.response)) || '');
          if (recipe) { recipe.name = subj.slice(0, 80); _updSculpt(recipe); if (announceToSR) announceToSR('Sculpture created'); }
          setSculptBusy(false);
        }).catch(function() { setSculptBusy(false); });
      };
      var doManualTweak = function(kind) {
        if (!sculptRecipe) return;
        var TINTS = ['#f87171', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa', '#f472b6', null];
        var next = Object.assign({}, sculptRecipe);
        if (kind === 'bigger') next.scale = Math.min(5, (sculptRecipe.scale || 1) * 1.25);
        else if (kind === 'smaller') next.scale = Math.max(0.25, (sculptRecipe.scale || 1) * 0.8);
        else if (kind === 'rotate') next.rotY = (((sculptRecipe.rotY || 0) + 45) % 360);
        else if (kind === 'recolor') { var i = TINTS.indexOf(sculptRecipe.tint || null); next.tint = TINTS[(i + 1) % TINTS.length]; }
        _updSculpt(next);
      };
      var doRefineSculpt = function(instrOverride) {
        var P3D = window.AlloModules && window.AlloModules.Prim3D;
        if (!P3D || !sculptRecipe || sculptBusy || typeof ctx.callGemini !== 'function') return;
        var instr = (typeof instrOverride === 'string' && instrOverride.trim()) ? instrOverride.trim() : (sculptRefine || '').trim(); if (!instr) return;
        setSculptBusy(true);
        ctx.callGemini(P3D.buildRefinePrompt(sculptRecipe, instr), false, false, 0.7).then(function(resp) {
          var nr = P3D.parseRecipe(typeof resp === 'string' ? resp : (resp && (resp.text || resp.output || resp.response)) || '');
          if (nr) { _updSculpt(Object.assign({}, nr, { scale: sculptRecipe.scale, rotY: sculptRecipe.rotY, tint: sculptRecipe.tint })); setSculptRefine(''); if (announceToSR) announceToSR('Sculpture refined'); }
          setSculptBusy(false);
        }).catch(function() { setSculptBusy(false); });
      };

      // ── Manual sculpting: build from scratch OR hand-edit an AI sculpt ────────
      // A recipe is { name, parts:[{shape,size,position,rotation,color}], scale,rotY,tint }.
      // These edit recipe.parts directly; the render effect re-runs on the recipe
      // (its deps include JSON.stringify(sculptRecipe)), so the 3D object updates live.
      var SCULPT_SHAPES = ['box', 'sphere', 'cylinder', 'cone', 'torus'];
      var SCULPT_PART_COLORS = ['#f87171', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa', '#f472b6', '#ffffff', '#94a3b8'];
      function _pushSculptUndo() {
        var snap = sculptRecipe ? JSON.parse(JSON.stringify(sculptRecipe)) : null;
        setSculptUndo(function(st) { var n = st.concat([snap]); return n.length > 20 ? n.slice(n.length - 20) : n; });
      }
      function undoSculptEdit() {
        if (!sculptUndo.length) return;
        var prev = sculptUndo[sculptUndo.length - 1];
        _updSculpt(prev);
        setSculptUndo(sculptUndo.slice(0, -1));
        if (prev && prev.parts) { if (selPart != null && selPart >= prev.parts.length) setSelPart(prev.parts.length ? prev.parts.length - 1 : null); }
        else setSelPart(null);
        if (announceToSR) announceToSR('Undo');
      }
      function _setParts(newParts, msg) {
        var base = sculptRecipe || { name: 'my sculpt' };
        _updSculpt(Object.assign({}, base, { parts: newParts }));
        if (msg && announceToSR) announceToSR(msg);
      }
      function startFromScratch() {
        _pushSculptUndo();
        _updSculpt({ name: 'my sculpt', parts: [{ shape: 'box', size: [1, 1, 1], position: [0, 0.5, 0], rotation: [0, 0, 0], color: '#60a5fa' }] });
        setSelPart(0); setSculptEdit(true);
        if (announceToSR) announceToSR('New sculpt started with one box. Add parts and shape them by hand.');
      }
      function addPart(shape) {
        var parts = (sculptRecipe && sculptRecipe.parts) ? sculptRecipe.parts.slice() : [];
        if (parts.length >= 14) { if (addToast) addToast('Reached the maximum number of parts', 'info'); return; }
        _pushSculptUndo();
        parts.push({ shape: SCULPT_SHAPES.indexOf(shape) >= 0 ? shape : 'box', size: [0.8, 0.8, 0.8], position: [0, 0.5 + parts.length * 0.05, 0], rotation: [0, 0, 0], color: SCULPT_PART_COLORS[parts.length % SCULPT_PART_COLORS.length] });
        setSelPart(parts.length - 1);
        _setParts(parts, 'Added a ' + (shape || 'box'));
      }
      function _editSel(fn, msg) {
        if (!sculptRecipe || !sculptRecipe.parts || selPart == null || !sculptRecipe.parts[selPart]) return;
        _pushSculptUndo();
        var parts = sculptRecipe.parts.map(function(p, i) { return i === selPart ? fn(JSON.parse(JSON.stringify(p))) : p; });
        _setParts(parts, msg);
      }
      function nudgePart(axis, dir) { _editSel(function(p) { var i = { x: 0, y: 1, z: 2 }[axis]; var pos = (p.position || [0, 0, 0]).slice(); pos[i] = Math.round((pos[i] + dir * 0.2) * 100) / 100; p.position = pos; return p; }); }
      function scaleSelPart(f) { _editSel(function(p) { p.size = (p.size || [1, 1, 1]).map(function(s) { return Math.max(0.1, Math.min(4, Math.round(s * f * 100) / 100)); }); return p; }, f > 1 ? 'Bigger' : 'Smaller'); }
      function rotateSelPart() { _editSel(function(p) { var r = (p.rotation || [0, 0, 0]).slice(); r[1] = (r[1] + 15) % 360; p.rotation = r; return p; }, 'Rotated'); }
      function recolorSelPart() { _editSel(function(p) { var i = SCULPT_PART_COLORS.indexOf(p.color); p.color = SCULPT_PART_COLORS[(i + 1) % SCULPT_PART_COLORS.length]; return p; }, 'Recolored'); }
      function reshapeSelPart() { _editSel(function(p) { var i = SCULPT_SHAPES.indexOf(p.shape); p.shape = SCULPT_SHAPES[(i + 1) % SCULPT_SHAPES.length]; return p; }, 'Changed shape'); }
      function deleteSelPart() {
        if (!sculptRecipe || !sculptRecipe.parts || selPart == null) return;
        _pushSculptUndo();
        var parts = sculptRecipe.parts.filter(function(_p, i) { return i !== selPart; });
        if (parts.length) { _setParts(parts, 'Part deleted'); setSelPart(Math.max(0, selPart - 1)); }
        else { _updSculpt(null); setSelPart(null); setSculptEdit(false); if (announceToSR) announceToSR('All parts deleted'); }
      }

      // ── Saved-sculpts gallery (mirrors saveConstruction/load/delete) ──
      function saveSculpt(rawName) {
        if (!sculptRecipe) return;
        var base = String(rawName || (sculptRecipe && sculptRecipe.name) || 'sculpt').trim().slice(0, 40) || 'sculpt';
        var name = base, n = 2;
        while (savedSculpts[name]) { name = base + ' ' + n; n++; }
        var snap = JSON.parse(JSON.stringify(sculptRecipe)); snap.savedAt = Date.now();
        var next = Object.assign({}, savedSculpts); next[name] = snap;
        setLabToolData(function(p) { var g = p.geoSandbox || {}; return Object.assign({}, p, { geoSandbox: Object.assign({}, g, { savedSculpts: next }) }); });
        if (addToast) addToast('💾 Saved "' + name + '"', 'success');
        if (announceToSR) announceToSR('Saved sculpt ' + name);
      }
      function loadSculpt(name) {
        var snap = savedSculpts[name]; if (!snap) return;
        _pushSculptUndo();
        _updSculpt(JSON.parse(JSON.stringify(snap)));
        setSelPart(null);
        if (announceToSR) announceToSR('Loaded sculpt ' + name);
      }
      function deleteSculpt(name) {
        var next = Object.assign({}, savedSculpts); delete next[name];
        setLabToolData(function(p) { var g = p.geoSandbox || {}; return Object.assign({}, p, { geoSandbox: Object.assign({}, g, { savedSculpts: next }) }); });
        if (announceToSR) announceToSR('Deleted ' + name);
      }
      // ── Voice-directed sculpting (hands-free / accessible making) ──
      // Speak → an LLM routes the intent (create / refine / bigger / smaller /
      // rotate / recolor / remove) → dispatch to the same handlers a mouse uses.
      // The "distributed embodiment" idea made concrete: create + shape a 3D form
      // with zero hands. Speech via the shared AlloFlowVoice module (lazy-loaded).
      var handleVoiceCommand = function(transcript) {
        var P3D = window.AlloModules && window.AlloModules.Prim3D;
        var text = (transcript || '').trim();
        if (!P3D || !text || typeof ctx.callGemini !== 'function') return;
        setVoiceHeard(text);
        ctx.callGemini(P3D.buildSculptCommandPrompt(text, !!sculptRecipe), false, false, 0.2).then(function(resp) {
          var cmd = P3D.parseSculptCommand(typeof resp === 'string' ? resp : (resp && (resp.text || resp.output || resp.response)) || '');
          if (!cmd || cmd.action === 'none') { if (announceToSR) announceToSR('Did not catch a sculpting command. Try “make a rocket” or “bigger”.'); return; }
          if (cmd.action === 'create') { doGenerateSculpt(cmd.subject || text); }
          else if (cmd.action === 'refine') { if (sculptRecipe) doRefineSculpt(cmd.instruction || text); else doGenerateSculpt(cmd.subject || text); }
          else if (cmd.action === 'remove') { _updSculpt(null); if (announceToSR) announceToSR('Sculpture removed'); }
          else if (cmd.action === 'bigger' || cmd.action === 'smaller' || cmd.action === 'rotate' || cmd.action === 'recolor') { doManualTweak(cmd.action); if (announceToSR) announceToSR(cmd.action); }
        }).catch(function() {});
      };
      // Mirror voice status into the in-VR caption (a no-op outside a session).
      var _vrCap = function(txt) { try { if (window._geoScene && window._geoScene.setVrCaption) window._geoScene.setVrCaption(txt); } catch (e) {} };
      var toggleVoice = function(handler, hint) {
        if (voiceListening) { try { if (window._geoVoiceCtl) window._geoVoiceCtl.stop(); } catch (e) {} setVoiceListening(false); _vrCap(''); return; }
        ensureVoice(function(V) {
          if (!V || !V.initWebSpeechCapture) { if (announceToSR) announceToSR('Voice input is unavailable in this browser.'); _vrCap('🎤 unavailable'); setTimeout(function() { _vrCap(''); }, 1800); return; }
          try {
            window._geoVoiceCtl = V.initWebSpeechCapture({
              lang: (ctx.lang || 'en') + (String(ctx.lang || 'en').indexOf('-') < 0 ? '-US' : ''),
              interimResults: true, continuous: false,
              onTranscript: function(txt, isFinal) { setVoiceHeard(txt); _vrCap(txt); if (isFinal) { setVoiceListening(false); handler(txt); setTimeout(function() { _vrCap(''); }, 2600); } },
              onEnd: function() { setVoiceListening(false); }
            });
            if (window._geoVoiceCtl && window._geoVoiceCtl.start() !== false) { setVoiceListening(true); setVoiceHeard(''); _vrCap('🎤 ' + (hint || 'Listening…')); if (announceToSR) announceToSR(hint || 'Listening.'); }
          } catch (e) { if (announceToSR) announceToSR('Voice input could not start.'); _vrCap(''); }
        });
      };
      // Voice for the HandWaver-style dimensional stretch: speak the moves
      // ("add a point", "stretch it up", "sweep it across", "pull it out") and
      // the agent enacts point→segment→rect→prism. The accessible route to the
      // hands-on "making" of geometry.
      var handleStretchVoiceCommand = function(transcript) {
        var P3D = window.AlloModules && window.AlloModules.Prim3D;
        var text = (transcript || '').trim();
        if (!P3D || !text || typeof ctx.callGemini !== 'function') return;
        setVoiceHeard(text);
        var sel = construction.objects.find(function(o) { return o.id === construction.selection; });
        ctx.callGemini(P3D.buildStretchCommandPrompt(text, sel ? sel.type : ''), false, false, 0.2).then(function(resp) {
          var cmd = P3D.parseStretchCommand(typeof resp === 'string' ? resp : (resp && (resp.text || resp.output || resp.response)) || '');
          if (!cmd || cmd.action === 'none') { if (announceToSR) announceToSR('Try “add a point”, “stretch it up”, or “pull it out”.'); return; }
          if (cmd.action === 'point') addPoint([0, 0, 0]);
          else if (cmd.action === 'stretch') { if (construction.selection) performStretch(cmd.axis); else addPoint([0, 0, 0]); }
          else if (cmd.action === 'undo') doStretchUndo();
          else if (cmd.action === 'reset') { pushHistory(); setLabToolData(function(p) { var g = p.geoSandbox || {}; return Object.assign({}, p, { geoSandbox: Object.assign({}, g, { construction: { objects: [], selection: null } }) }); }); if (announceToSR) announceToSR('Construction cleared'); }
        }).catch(function() {});
      };
      // Bridge the in-VR controller trigger to voice: while immersed there is no
      // 2D mic to tap, so the headset's trigger starts a voice capture that routes
      // to the sculpt or stretch handler for the current mode. Re-registered when
      // the routing-relevant state changes so the handler stays fresh.
      React.useEffect(function() {
        window._geoVoiceTrigger = function() {
          var handler = (mode === 'stretch') ? handleStretchVoiceCommand : handleVoiceCommand;
          toggleVoice(handler, mode === 'stretch' ? 'Say a build move' : 'Say what to make');
        };
        return function() { try { window._geoVoiceTrigger = null; } catch (e) {} };
      }, [mode, voiceListening, sculptRecipe, construction.selection]);

      // ── Build-challenge solved transition: celebrate once when the current
      //    construction first satisfies the target (and re-arm if it's undone). ──
      var _bldSolvedRef = React.useRef(null);
      React.useEffect(function() {
        if (mode !== 'stretch' || !buildChallenge || !buildEval) return;
        var key = buildChallenge.id;
        if (buildEval.solved && _bldSolvedRef.current !== key) {
          _bldSolvedRef.current = key;
          geoSound('correct');
          if (addToast) addToast('✅ ' + buildEval.message, 'success');
          if (announceToSR) announceToSR('Challenge solved! ' + buildEval.message);
          setLabToolData(function(p) {
            var g = p.geoSandbox || {};
            var sc = g.buildScore || { solved: 0 };
            return Object.assign({}, p, { geoSandbox: Object.assign({}, g, { buildScore: { solved: (sc.solved || 0) + 1 } }) });
          });
        } else if (!buildEval.solved && _bldSolvedRef.current === key) {
          _bldSolvedRef.current = null;   // taken apart → a fresh solve can celebrate again
        }
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [construction, buildChallenge, mode]);

      // ── Missions: persist a mission's star the first time the construction
      //    satisfies it (stays earned even after the shape is cleared). ──
      React.useEffect(function() {
        if (mode !== 'stretch') return;
        var solvedSet = gd.missionsSolved || [];
        var newly = GEO_MISSIONS.filter(function(mn) {
          return solvedSet.indexOf(mn.id) < 0 && geoEvalMission(mn, construction.objects).solved;
        });
        if (!newly.length) return;
        geoSound('correct');
        newly.forEach(function(mn) { if (addToast) addToast('🗺 ' + t('stem.geosandbox.mission_done', 'Mission complete: ') + mn.title, 'success'); });
        setLabToolData(function(p) {
          var g = p.geoSandbox || {};
          var cur = g.missionsSolved || [];
          var merged = cur.slice();
          newly.forEach(function(mn) { if (merged.indexOf(mn.id) < 0) merged.push(mn.id); });
          return Object.assign({}, p, { geoSandbox: Object.assign({}, g, { missionsSolved: merged }) });
        });
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [construction, mode]);

      // ── Stretch-mode badges + dimension-journey progress: award on construction
      //    change (the reward loop that single-shape mode already had). ──
      React.useEffect(function() {
        if (mode !== 'stretch') return;
        var updates = {};
        var changed = checkGeoStretchBadges(gd._geoExt || {}, construction, updates, awardXP, addToast);
        if (!changed) return;
        setLabToolData(function(p) {
          var g = p.geoSandbox || {};
          return Object.assign({}, p, { geoSandbox: Object.assign({}, g, { _geoExt: Object.assign({}, g._geoExt || {}, updates) }) });
        });
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [construction, mode]);

      // ── VR controller bridges (reliable, NOT speech-dependent) — this is what
      //    makes immersive mode a hands-on builder: the trigger stretches, the
      //    off-hand adds/cycles, and the thumbstick dials axis + length. Set only
      //    while mounted; the scene calls them if present, else falls back to voice. ──
      React.useEffect(function() {
        window._geoXrPrimary = function(hand) {
          if (mode === 'stretch') {
            if (hand === 'left') {
              if (!construction.objects.length) addPoint([0, 0, 0]);
              else cycleSelection(1);
            } else {
              if (!construction.selection) addPoint([0, 0, 0]); else performStretch();
            }
          } else {
            var handler = (mode === 'stretch') ? handleStretchVoiceCommand : handleVoiceCommand;
            toggleVoice(handler, mode === 'stretch' ? 'Say a build move' : 'Say what to make');
          }
        };
        window._geoXrAxis = function(dir) {
          if (mode !== 'stretch') return;
          var order = ['x', 'y', 'z']; var i = order.indexOf(stretchAxis); if (i < 0) i = 0;
          upd('stretchAxis', order[(i + (dir < 0 ? -1 : 1) + 3) % 3]);
        };
        window._geoXrLen = function(delta) {
          if (mode !== 'stretch') return;
          upd('stretchLength', Math.max(0.5, Math.min(12, Math.round((stretchLength + delta) * 2) / 2)));
        };
        // On-screen click-to-select: the canvas raycaster (initScene) calls this
        // when a construction object is tapped — same selectObject as the list.
        window._geoSelectObj = function(id) { selectObject(id); };
        // Click-to-place: armed only in stretch mode; the raycaster drops a point
        // on the ground plane where the student taps (placePoint applies the snap).
        window._geoPlacePoint = function(x, z) { placePoint(x, z); };
        window._geoPlaceArmed = (mode === 'stretch') && placeArmed;
        return function() { try { window._geoXrPrimary = null; window._geoXrAxis = null; window._geoXrLen = null; window._geoSelectObj = null; window._geoPlacePoint = null; window._geoPlaceArmed = false; } catch (e) {} };
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [mode, construction, stretchAxis, stretchLength, placeArmed, snap]);

      // ── VR math HUD: while a headset session is presenting, pin a compact line
      //    (axis · length · current measurement · challenge target) in view so the
      //    math is legible without the 2D panel. No-op in 2D (nothing rendered). ──
      React.useEffect(function() {
        try {
          var gs = window._geoScene;
          if (!(gs && gs.renderer && gs.renderer.xr && gs.renderer.xr.isPresenting && gs.setVrCaption)) return;
          if (mode !== 'stretch') return;
          var sel = construction.objects.find(function(o) { return o.id === construction.selection; });
          var mm = sel ? geoStretchMeasure(sel) : null;
          var seg = String(stretchAxis).toUpperCase() + '·' + stretchLength.toFixed(1);
          if (mm && mm.dim > 0) seg += '  ' + mm.label[0] + '=' + (Math.round(mm.value * 100) / 100);
          if (buildChallenge && buildEval) seg += buildEval.solved ? '  🎯✓' : ('  🎯' + buildChallenge.target);
          gs.setVrCaption(seg);
        } catch (e) {}
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [construction, stretchAxis, stretchLength, buildChallenge, mode]);

      // ── Wireframe toggle with badge ──
      var toggleWireframe = function() {
        var newWf = !wireframe;
        setLabToolData(function(prev) {
          var g = prev.geoSandbox || {};
          var exObj = Object.assign({}, g._geoExt || {});
          if (newWf) exObj.usedWireframe = true;
          var updates = checkGeoBadges(exObj, {}, awardXP, addToast);
          return Object.assign({}, prev, { geoSandbox: Object.assign({}, g, { wireframe: newWf, _geoExt: Object.assign(exObj, updates) }) });
        });
      };

      // ── STL export with badge ──
      var doExportSTL = function() {
        if (mode !== 'single') {
          if (typeof addToast === 'function') addToast('STL export is available in Single shape mode.', 'info');
          if (announceToSR) announceToSR('STL export is available in Single shape mode.');
          return false;
        }
        if (!exportSTL(shape, addToast)) {
          if (typeof addToast === 'function') addToast('The 3D model is not ready to export yet.', 'warning');
          if (announceToSR) announceToSR('The 3D model is not ready to export yet.');
          return false;
        }
        setLabToolData(function(prev) {
          var g = prev.geoSandbox || {};
          var exObj = Object.assign({}, g._geoExt || {});
          exObj.usedExport = true;
          var updates = checkGeoBadges(exObj, {}, awardXP, addToast);
          return Object.assign({}, prev, { geoSandbox: Object.assign({}, g, { _geoExt: Object.assign(exObj, updates) }) });
        });
        if (announceToSR) announceToSR('STL file exported for the current ' + shape + '.');
        return true;
      };

      // ── Keyboard shortcuts ─────────────────────────────────────
      // Managed via useEffect for proper add/remove lifecycle. The previous
      // pattern stored the handler on window and re-attached each render,
      // which leaked listeners across remounts. This version cleanly removes
      // the handler when the tool unmounts.
      React.useEffect(function() {
        var handler = function(e) {
          if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
          var key = e.key;
          if (mode === 'stretch' && (key === '[' || key === ']')) {
            e.preventDefault(); cycleSelection(key === '[' ? -1 : 1); return;
          }
          if (mode === 'stretch' && (key === 'Delete' || key === 'Backspace') && construction.selection != null) {
            e.preventDefault(); deleteObject(construction.selection); return;
          }
          if (mode === 'single' && key >= '1' && key <= '7') {
            var idx = parseInt(key) - 1;
            if (shapes[idx]) selectShape(shapes[idx].id);
            return;
          }
          switch (key.toLowerCase()) {
            case 'c': generateChallenge(); break;
            case 'w': toggleWireframe(); break;
            case 'e': doExportSTL(); break;
            case 'b': updExt({ showBadges: !showBadges }); break;
            case 'u': if (mode === 'stretch') doStretchUndo(); break;
            case 'm':
              upd('mode', mode === 'single' ? 'stretch' : 'single');
              if (announceToSR) announceToSR((mode === 'single' ? 'Stretch' : 'Single shape') + ' mode');
              break;
            case '/': e.preventDefault(); askAI(); break;
          }
        };
        window.addEventListener('keydown', handler);
        return function() { window.removeEventListener('keydown', handler); };
      }, [mode, shape, dims, shapeColor, wireframe, showBadges, construction, history.length]);

      // ── Three.js scene update effect ──
      React.useEffect(function() {
        if (!window.THREE) return;
        var cnv = document.getElementById('geo-sandbox-canvas');
        if (!cnv) return;
        try {
          if (!window._geoScene) {
            window._geoScene = initScene(cnv);
          }
          setWebglError(false);
        } catch (err) {
          console.error('[GeoSandbox] WebGL initialization failed', err);
          setWebglError(true);
          return;
        }

        var themeBg = '#0f172a';
        try {
          themeBg = window.getComputedStyle(document.body).getPropertyValue('--allo-stem-canvas').trim() || '#0f172a';
        } catch(e) {}
        if (window._geoScene && window._geoScene.scene) {
          if (window._geoScene.scene.background && window._geoScene.scene.background.isColor) {
            window._geoScene.scene.background.setStyle(themeBg);
          } else {
            window._geoScene.scene.background = new window.THREE.Color(themeBg);
          }
        }

        // Single-shape mode: render the primitive.
        // Stretch mode: hide primitive and render the construction group instead.
        // Clear the two groups the active mode won't use, so only one is ever shown.
        var _clearSculpt = function() { if (window._geoScene.sculptGroup) { window._geoScene.scene.remove(window._geoScene.sculptGroup); disposeGeoObject3D(window._geoScene.sculptGroup); window._geoScene.sculptGroup = null; } };
        var _clearConstruction = function() { if (window._geoScene.constructionGroup) { window._geoScene.scene.remove(window._geoScene.constructionGroup); disposeGeoObject3D(window._geoScene.constructionGroup); window._geoScene.constructionGroup = null; } };
        var _clearSlice = function() { if (window._geoScene.sliceGroup) { window._geoScene.scene.remove(window._geoScene.sliceGroup); try { window._geoScene.sliceGroup.traverse(function(o){ if(o.geometry&&o.geometry.dispose)o.geometry.dispose(); if(o.material&&o.material.dispose)o.material.dispose(); }); } catch(e){} window._geoScene.sliceGroup = null; } };
        var _clearMesh = function() { if (window._geoScene.mesh) { window._geoScene.scene.remove(window._geoScene.mesh); window._geoScene.mesh.traverse(function(o) { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); window._geoScene.mesh = null; } };
        if (mode === 'single') {
          _clearConstruction(); _clearSculpt(); _clearSlice();
          updateMesh(window._geoScene, shape, dims, shapeColor, wireframe, opacity);
        } else if (mode === 'sculpt') {
          _clearMesh(); _clearConstruction(); _clearSculpt(); _clearSlice();
          var P3D = window.AlloModules && window.AlloModules.Prim3D;
          if (!P3D) { ensurePrim3d(function(ok) { if (ok) setPrim3dReady(true); }); }
          else if (sculptRecipe) {
            try {
              var sg = P3D.buildObject(window.THREE, sculptRecipe, { unit: 2.6 });   // ~2.5 units tall on the grid
              if (sg) {
                sg.position.y = 0;
                sg.traverse(function(o){ if(o.isMesh){ o.castShadow = true; } });
                if (showSceneLabels) addSculptSceneLabel(window.THREE, sg, sculptRecipe, selPart, unitDef.short);
                window._geoScene.sculptGroup = sg;
                window._geoScene.scene.add(sg);
              }
            } catch (e) {}
          }
        } else {
          // Stretch mode
          _clearMesh(); _clearSculpt();
          _clearConstruction();
          window._geoScene.constructionGroup = buildConstructionGroup(window.THREE, construction.objects, construction.selection, showSceneLabels, unitDef.short);
          window._geoScene.scene.add(window._geoScene.constructionGroup);
          // Cross-section slice overlay (rebuilt each render so it tracks the slider)
          _clearSlice();
          if (gd.sliceOn) {
            var _sliceSel = construction.objects.find(function(o) { return o.id === construction.selection; });
            if (_sliceSel && _sliceSel.type === 'prism') {
              window._geoScene.sliceGroup = buildSliceGroup(window.THREE, _sliceSel, gd.sliceT != null ? gd.sliceT : 0.5);
              window._geoScene.scene.add(window._geoScene.sliceGroup);
            }
          }
        }
        // Resize handler
        var handleResize = function() {
          if (!cnv || !window._geoScene || !window._geoScene.renderer) return;
          window._geoScene.renderer.setSize(cnv.clientWidth, cnv.clientHeight);
          try{ if(window._geoScene.renderer && window._geoScene.renderer._alloComposer){ var _s=new window.THREE.Vector2(); window._geoScene.renderer.getSize(_s); window._geoScene.renderer._alloComposer.setSize(_s.x,_s.y); } }catch(e){}
          window._geoScene.camera.aspect = cnv.clientWidth / cnv.clientHeight;
          window._geoScene.camera.updateProjectionMatrix();
        };
        window.addEventListener('resize', handleResize);
        return function() { window.removeEventListener('resize', handleResize); };
      }, [shape, dims, shapeColor, wireframe, opacity, theme, mode, JSON.stringify(construction), JSON.stringify(sculptRecipe), prim3dReady, gd.sliceOn, gd.sliceT, showSceneLabels, unitId, selPart]);

      // Cleanup on unmount
      React.useEffect(function() {
        return function() { cleanupScene(); };
      }, []);

      // ── Badge check on dimension adjustments ──
      React.useEffect(function() {
        if ((ext.dimAdjusts || 0) > 0) {
          setLabToolData(function(prev) {
            var g = prev.geoSandbox || {};
            var exObj = Object.assign({}, g._geoExt || {});
            var updates = checkGeoBadges(exObj, {}, awardXP, addToast);
            if (Object.keys(updates).length > 0) {
              return Object.assign({}, prev, { geoSandbox: Object.assign({}, g, { _geoExt: Object.assign(exObj, updates) }) });
            }
            return prev;
          });
        }
      }, [ext.dimAdjusts]);

      var currentSliders = sliderConfigs[shape] || sliderConfigs.box;
      var ct = shape === 'cylinder' && Math.abs((dims.rTop || 1.5) - (dims.rBot || 1.5)) >= 1e-6
        ? { title: 'Frustum', tip: 'Two unequal circular bases joined by a tapered curved surface. V = ⅓πh(r₁² + r₁r₂ + r₂²)', example: 'Buckets, lampshades, and tapered cups are everyday frustums.' }
        : (coachTips[shape] || coachTips.box);
      var badgeCount = Object.keys(ext.badges || {}).length;

      // ── Loading state ──
      if (!labToolData._threeLoaded) {
        return h('div', { id: 'allo-geo-sandbox', className: 'flex flex-col items-center justify-center gap-4 p-12 opacity-90' },
          h('div', { 'aria-live': 'polite', 'aria-atomic': 'true', style: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' } }, gd._srMsg || ''),
          h('div', { className: 'text-5xl' }, '\uD83D\uDD37'),
          h('div', { className: 'text-slate-200 text-lg' }, t('stem.geosandbox.loading_3d_engine', 'Loading 3D engine...'))
        );
      }

      // ══════════════════════════
      // ═══ RENDER ═══
      // ══════════════════════════
      return h('div', { id: 'allo-geo-sandbox', className: 'flex flex-col gap-3 animate-in fade-in duration-300' },

        // Header row
        h('div', { className: 'flex items-center justify-between gap-3 flex-wrap' },
          h('h2', { className: 'text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500 flex items-center gap-2' },
            t('stem.geosandbox.geometry_sandbox', '\uD83D\uDD37 Geometry Sandbox')
          ),
          // \u2500\u2500 v2: Mode toggle (Single shape \u2194 Dimensional stretch) \u2500\u2500
          h('div', { className: 'flex items-center gap-1 bg-slate-800/60 rounded-full p-1 border border-slate-700', role: 'tablist', 'aria-label': t('stem.geosandbox.geometry_mode', 'Geometry mode'),
            onKeyDown: function(e) {
              if (['ArrowLeft','ArrowRight','Home','End'].indexOf(e.key) < 0) return;
              e.preventDefault();
              var modes = ['single','stretch','sculpt'];
              var index = modes.indexOf(mode);
              var next = e.key === 'Home' ? modes[0] : e.key === 'End' ? modes[2] : modes[(index + (e.key === 'ArrowRight' ? 1 : -1) + modes.length) % modes.length];
              if (next === 'sculpt' && !(window.AlloModules && window.AlloModules.Prim3D)) ensurePrim3d(function(ok) { if (ok) setPrim3dReady(true); });
              upd('mode', next);
              if (announceToSR) announceToSR((next === 'single' ? 'Single shape' : next === 'stretch' ? 'Dimensional stretch' : 'AI sculpt') + ' mode');
              window.setTimeout(function() { var tab = document.getElementById('geo-mode-tab-' + next); if (tab) tab.focus(); }, 0);
            }
          },
            h('button', {
              id: 'geo-mode-tab-single',
              role: 'tab',
              'aria-selected': mode === 'single',
              'aria-controls': 'geo-fullscreen-container',
              tabIndex: mode === 'single' ? 0 : -1,
              onClick: function() {
                upd('mode', 'single');
                if (announceToSR) announceToSR('Single shape mode');
              },
              className: 'px-3 py-1 rounded-full text-[11px] font-bold transition-all ' +
                (mode === 'single' ? 'bg-sky-700 text-white shadow' : 'text-slate-300 hover:text-slate-100')
            }, t('stem.geosandbox.single_shape', '\uD83D\uDCE6 Single shape')),
            h('button', {
              id: 'geo-mode-tab-stretch',
              role: 'tab',
              'aria-selected': mode === 'stretch',
              'aria-controls': 'geo-fullscreen-container',
              tabIndex: mode === 'stretch' ? 0 : -1,
              onClick: function() {
                upd('mode', 'stretch');
                if (announceToSR) announceToSR('Dimensional stretch mode. Place a point and stretch it into higher dimensions.');
              },
              title: t('stem.geosandbox.handwaver_inspired_build_by_stretching', 'HandWaver-inspired: build by stretching point \u2192 line \u2192 plane \u2192 solid'),
              className: 'px-3 py-1 rounded-full text-[11px] font-bold transition-all ' +
                (mode === 'stretch' ? 'bg-purple-700 text-white shadow' : 'text-slate-300 hover:text-slate-100')
            }, t('stem.geosandbox.stretch_mode', '\uD83D\uDCD0 Stretch mode')),
            h('button', {
              id: 'geo-mode-tab-sculpt',
              role: 'tab',
              'aria-selected': mode === 'sculpt',
              'aria-controls': 'geo-fullscreen-container',
              tabIndex: mode === 'sculpt' ? 0 : -1,
              onClick: function() {
                if (!(window.AlloModules && window.AlloModules.Prim3D)) ensurePrim3d(function(ok) { if (ok) setPrim3dReady(true); });
                upd('mode', 'sculpt');
                if (announceToSR) announceToSR('AI sculpt mode. Describe an object and the AI builds it from primitive shapes.');
              },
              title: t('stem.geosandbox.sculpt_mode_title', 'AI Sculpt: describe an object, the AI builds it from primitives \u2014 then refine it'),
              className: 'px-3 py-1 rounded-full text-[11px] font-bold transition-all ' +
                (mode === 'sculpt' ? 'bg-fuchsia-700 text-white shadow' : 'text-slate-300 hover:text-slate-100')
            }, t('stem.geosandbox.sculpt_mode', '\uD83E\uDDCA AI Sculpt'))
          ),
          h('div', { className: 'flex gap-2 flex-wrap' },
            xrSupported && h('button', {
              'aria-label': t('stem.geosandbox.enter_vr_title', 'Enter VR — stand next to your model (needs a headset)'),
              onClick: function() {
                var gs = window._geoScene;
                if (gs && typeof gs.enterVR === 'function') {
                  gs.enterVR().then(function() { if (announceToSR) announceToSR('Entered VR. Look around your model.'); }).catch(function() { if (announceToSR) announceToSR('Could not start VR.'); });
                }
              },
              title: t('stem.geosandbox.enter_vr_title', 'Enter VR — stand next to your model (needs a headset)'),
              className: 'px-3 py-1.5 text-xs font-bold transition-all rounded-full flex items-center gap-1 text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20'
            }, t('stem.geosandbox.enter_vr', '🥽 VR')),
            h('button', {
              'aria-label': t('stem.geosandbox.open_immersive_title', 'Open the Immersive Geometry Lab in a new window — stretch a point into a line, a line into a plane, a plane into a solid, on a desktop or in VR'),
              onClick: function() {
                // Top-level window (Video-Studio / Access-Lens escape-hatch), so WebXR
                // works even when the AlloFlow app is inside Gemini Canvas's sandboxed iframe.
                var url = 'https://alloflow-cdn.pages.dev/immersive_geometry/immersive_geometry.html?v=1';
                var w = null;
                try { w = window.open(url, 'alloflow-immersive-geometry', 'width=1180,height=820'); } catch (_) { w = null; }
                if (!w) { if (announceToSR) announceToSR(t('stem.geosandbox.open_immersive_blocked', 'The immersive window was blocked. Allow pop-ups for this page, then try again.')); return; }
                if (announceToSR) announceToSR(t('stem.geosandbox.open_immersive_sr', 'Opened the Immersive Geometry Lab in a new window.'));
              },
              title: t('stem.geosandbox.open_immersive_title', 'Open the Immersive Geometry Lab in a new window — stretch a point into a line, a line into a plane, a plane into a solid, on a desktop or in VR'),
              className: 'px-3 py-1.5 text-xs font-bold transition-all rounded-full flex items-center gap-1 text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-md shadow-violet-600/20'
            }, t('stem.geosandbox.open_immersive', '🌐 VR Lab ↗')),
            h('button', { 'aria-label': t('stem.geosandbox.challenge', 'Challenge'),
              onClick: generateChallenge,
              title: t('stem.geosandbox.challenge_mode_c', 'Challenge Mode [C]'),
              className: 'px-3 py-1.5 text-xs font-bold transition-all rounded-full flex items-center gap-1 ' + (gd.challengeMode ? 'text-white bg-gradient-to-r from-amber-700 to-orange-800 shadow-md shadow-amber-700/20 hover:from-amber-800 hover:to-orange-900' : 'text-amber-100 bg-amber-700/30 border border-amber-300/70 hover:bg-amber-700/40')
            }, t('stem.geosandbox.challenge_2', '\uD83C\uDFAF Challenge')),
            gd.challengeMode && h('button', { 'aria-label': t('stem.geosandbox.exit', 'Exit'),
              onClick: function() { setLabToolData(function(prev) { return Object.assign({}, prev, { geoSandbox: Object.assign({}, prev.geoSandbox||{}, { challengeMode:false, challenge:null, challengeAnswer:'', challengeResult:null }) }); }); },
              className: 'px-3 py-1.5 text-xs font-bold text-slate-200 bg-slate-700/60 rounded-full hover:bg-slate-600 transition-all'
            }, t('stem.geosandbox.exit_2', '\u2716 Exit')),
            h('button', { 'aria-label': t('stem.geosandbox.badges_b', 'Badges [B]'),
              onClick: function() { updExt({ showBadges: !showBadges }); },
              title: t('stem.geosandbox.badges_b_2', 'Badges [B]'),
              className: 'px-3 py-1.5 text-xs font-bold rounded-full flex items-center gap-1 transition-all ' + (showBadges ? 'text-white bg-gradient-to-r from-purple-700 to-fuchsia-800 shadow-md' : 'text-purple-200 bg-purple-700/30 border border-purple-300/70 hover:bg-purple-700/40')
            }, '\uD83C\uDFC5 ' + badgeCount + '/' + Object.keys(geoBadges).length),
            h('button', { id: 'geo-ai-tutor-button', 'aria-label': t('stem.geosandbox.ai_tutor', 'AI Tutor'),
              'aria-controls': 'geo-ai-tutor-panel', 'aria-expanded': showAI, disabled: aiLoading,
              onClick: askAI,
              title: t('stem.geosandbox.ai_tutor', 'AI Tutor [/]'),
              className: 'px-3 py-1.5 text-xs font-bold rounded-full flex items-center gap-1 transition-all ' + (aiLoading ? 'text-white bg-gradient-to-r from-cyan-700 to-blue-700 opacity-90' : showAI ? 'text-white bg-gradient-to-r from-cyan-700 to-blue-700 shadow-md' : 'text-cyan-300 bg-cyan-500/20 border border-cyan-500/30 hover:bg-cyan-500/30')
            }, aiLoading ? '\u23F3 Thinking...' : '\uD83E\uDD16 AI Tutor'),
            mode === 'single' && h('button', { 'aria-label': t('stem.geosandbox.export_stl', 'Export current shape as STL'),
              onClick: doExportSTL,
              title: t('stem.geosandbox.export_stl_e', 'Export STL [E]'),
              className: 'px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-700 to-green-700 rounded-full hover:from-emerald-800 hover:to-green-800 shadow-md hover:shadow-lg transition-all flex items-center gap-1'
            }, t('stem.geosandbox.stl', '\uD83D\uDCE6 STL')),
            h('button', { 'aria-label': t('stem.geosandbox.back', 'Back'),
              onClick: function() { cleanupScene(); setStemLabTool(null); },
              className: 'px-3 py-1.5 text-xs font-bold text-slate-300 bg-slate-700/60 rounded-full hover:bg-slate-600 transition-all'
            }, t('stem.geosandbox.back_2', '\u2190 Back'))
          )
        ),

        // ── Badge panel ──
        showBadges && h('div', { className: 'bg-gradient-to-br from-purple-900/40 to-fuchsia-900/30 backdrop-blur-md rounded-xl p-4 border border-purple-500/30' },
          h('div', { className: 'text-sm font-bold text-purple-200 mb-3' }, '\uD83C\uDFC5 Badges — ' + badgeCount + ' of ' + Object.keys(geoBadges).length + ' earned'),
          h('div', { className: 'grid grid-cols-2 sm:grid-cols-5 gap-2' },
            Object.keys(geoBadges).map(function(id) {
              var b = geoBadges[id];
              var earned = !!(ext.badges && ext.badges[id]);
              return h('div', { key: id, className: 'flex flex-col items-center text-center p-2 rounded-lg transition-all ' + (earned ? 'bg-purple-500/20 border border-purple-400/40' : 'bg-slate-800/40 border border-slate-500/70 opacity-90') },
                h('span', { className: 'text-xl mb-1' }, earned ? b.icon : '\uD83D\uDD12'),
                h('span', { className: 'text-[11px] font-bold ' + (earned ? 'text-purple-200' : 'text-slate-200') }, b.name),
                h('span', { className: 'text-[11px] ' + (earned ? 'text-purple-200' : 'text-slate-300') }, __alloT('stem.geosandbox.' + (id) + '_desc', b.desc))
              );
            })
          )
        ),

        // ── AI Tutor panel ──
        showAI && h('div', { id: 'geo-ai-tutor-panel', role: 'region', 'aria-labelledby': 'geo-ai-tutor-title', 'aria-busy': aiLoading, className: 'bg-gradient-to-br from-cyan-900/40 to-blue-900/30 backdrop-blur-md rounded-xl p-4 border border-cyan-500/30' },
          h('div', { className: 'flex items-center justify-between mb-2' },
            h('div', { id: 'geo-ai-tutor-title', className: 'text-sm font-bold text-cyan-200 flex items-center gap-2' }, t('stem.geosandbox.ai_geometry_tutor', '\uD83E\uDD16 AI Geometry Tutor')),
            h('button', { onClick: function() { updExt({ showAI: false }); window.setTimeout(function() { var btn = document.getElementById('geo-ai-tutor-button'); if (btn) btn.focus(); }, 0); }, 'aria-label': t('stem.geosandbox.close_ai_geometry_tutor', 'Close AI Geometry Tutor'), className: 'text-xs text-slate-200 hover:text-slate-200' }, '\u2716')
          ),
          aiLoading
            ? h('div', { role: 'status', className: 'text-sm text-cyan-300 opacity-90' }, t('stem.geosandbox.ai_analyzing_scene', 'Analyzing the current geometry scene...'))
            : aiResponse
              ? h('div', { className: 'text-sm text-slate-200 leading-relaxed whitespace-pre-wrap' }, aiResponse)
              : h('div', { className: 'text-sm text-slate-200 italic' }, t('stem.geosandbox.click_ai_tutor_or_press_to_get_insight', 'Click "AI Tutor" or press / to get insights about the current scene.'))
        ),

        // Main layout: sidebar + viewport
        // Fullscreen wrapper: passing this container (controls + 3D viewport)
        // to __alloStemFS keeps the UI visible in fullscreen, not just the bare
        // canvas — the shared STEM pattern (cf. solarsystem/geometryworld). The
        // canvas re-measures via the window 'resize' event __alloStemFS fires.
        h('div', { id: 'geo-fullscreen-container', role: 'tabpanel', 'aria-labelledby': 'geo-mode-tab-' + mode, className: 'flex gap-3', style: { minHeight: '480px', flexDirection: 'row' } },

          // === LEFT SIDEBAR ===
          h('div', { id: 'geo-control-sidebar', style: { width: '260px', maxHeight: '520px', overflowY: 'auto', flexShrink: 0 }, className: 'flex flex-col gap-3' },

            // Shape palette (single-shape mode only)
            mode === 'single' && h('div', { className: 'bg-slate-800/60 backdrop-blur-md rounded-xl p-3 border border-slate-700/50' },
              h('div', { className: 'text-xs font-bold text-slate-300 uppercase tracking-wider mb-2' }, t('stem.geosandbox.shapes', 'Shapes')),
              h('div', { className: 'grid grid-cols-4 gap-1.5' },
                shapes.map(function(s) {
                  return h('button', { 'aria-label': t('stem.geosandbox.select_shape', 'Select Shape'),
                    key: s.id,
                    onClick: function() { selectShape(s.id); },
                    title: s.label + ' [' + s.key + ']',
                    className: 'flex flex-col items-center gap-0.5 p-1.5 rounded-lg text-xs transition-all ' +
                      (shape === s.id ? 'bg-sky-500/30 border border-sky-400/50 text-sky-300 shadow-lg shadow-sky-500/10' : 'bg-slate-700/40 border border-slate-600/30 text-slate-200 hover:bg-slate-700/60 hover:text-slate-300')
                  },
                    h('span', { className: 'text-lg leading-none' }, s.icon),
                    h('span', { className: 'text-[11px] leading-tight' }, s.label)
                  );
                })
              )
            ),

            // ── v3: AI SCULPT PANEL — reuses window.AlloModules.Prim3D ──
            mode === 'sculpt' && h('div', { className: 'bg-gradient-to-br from-fuchsia-900/40 to-pink-900/30 rounded-xl p-3 border border-fuchsia-500/40 space-y-3' },
              h('div', { className: 'text-xs font-bold text-fuchsia-200 uppercase tracking-wider' }, t('stem.geosandbox.ai_sculpt', '🧊 AI Sculpt')),
              h('p', { className: 'text-[11px] text-fuchsia-200/80 leading-relaxed' }, t('stem.geosandbox.ai_sculpt_help', 'Describe an object — the AI designs it from primitive shapes (box, sphere, cylinder, cone, torus). Then refine it by hand or by asking.')),
              (typeof ctx.callGemini !== 'function')
                ? h('p', { className: 'text-[11px] text-amber-300' }, t('stem.geosandbox.ai_sculpt_no_ai', 'AI Sculpt needs the Gemini API.'))
                : h(React.Fragment, null,
                    h('input', {
                      type: 'text', value: sculptPrompt,
                      onChange: function(e) { setSculptPrompt(e.target.value); },
                      onKeyDown: function(e) { if (e.key === 'Enter') doGenerateSculpt(); },
                      placeholder: t('stem.geosandbox.sculpt_placeholder', 'e.g. a rocket ship, a friendly robot…'),
                      'aria-label': t('stem.geosandbox.sculpt_placeholder', 'Describe an object to sculpt'),
                      className: 'w-full text-sm p-2 rounded-lg bg-slate-900/60 border border-fuchsia-500/40 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-fuchsia-400 outline-none'
                    }),
                    h('button', {
                      onClick: doGenerateSculpt,
                      disabled: sculptBusy,
                      className: 'w-full px-3 py-2 rounded-lg text-xs font-bold bg-fuchsia-600 text-white hover:bg-fuchsia-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all'
                    }, sculptBusy ? t('stem.geosandbox.sculpt_working', '… Creating') : ('✨ ' + (sculptRecipe ? t('stem.geosandbox.sculpt_regenerate', 'Regenerate') : t('stem.geosandbox.sculpt_create', 'Create sculpture')))),
                    voiceSupported && h('button', {
                      onClick: function() { toggleVoice(handleVoiceCommand, 'Listening. Say what to make or how to change it.'); },
                      disabled: sculptBusy,
                      'aria-pressed': voiceListening ? 'true' : 'false',
                      'aria-label': t('stem.geosandbox.voice_sculpt_title', 'Voice sculpt — speak to create and shape it, hands-free'),
                      title: t('stem.geosandbox.voice_sculpt_title', 'Voice sculpt — speak to create and shape it, hands-free'),
                      className: 'w-full px-3 py-2 rounded-lg text-xs font-bold transition-all ' + (voiceListening ? 'bg-rose-600 text-white opacity-90' : 'bg-slate-900/50 text-fuchsia-200 border border-fuchsia-500/40 hover:bg-slate-900/80')
                    }, voiceListening ? ('🔴 ' + t('stem.geosandbox.voice_listening', 'Listening… tap to stop')) : ('🎤 ' + t('stem.geosandbox.voice_sculpt', 'Voice sculpt'))),
                    voiceHeard && h('p', { className: 'text-[11px] text-fuchsia-200/70 italic', 'aria-live': 'polite' }, '“' + voiceHeard + '”'),
                    sculptRecipe && h('div', { className: 'pt-2 mt-1 border-t border-fuchsia-500/30 space-y-2' },
                      h('div', { className: 'text-[11px] font-bold text-fuchsia-200' }, t('stem.geosandbox.sculpt_refine', 'Refine')),
                      h('div', { className: 'flex flex-wrap gap-1' },
                        [['bigger', '🔍+ ' + t('stem.geosandbox.sculpt_bigger', 'Bigger')], ['smaller', '🔍− ' + t('stem.geosandbox.sculpt_smaller', 'Smaller')], ['rotate', '⟳ ' + t('stem.geosandbox.sculpt_rotate', 'Rotate')], ['recolor', '🎨 ' + t('stem.geosandbox.sculpt_recolor', 'Recolor')]].map(function(bt) {
                          return h('button', { key: bt[0], onClick: function() { doManualTweak(bt[0]); }, className: 'px-2 py-1 rounded-full text-[11px] font-bold bg-slate-900/50 text-fuchsia-200 border border-fuchsia-500/40 hover:bg-slate-900/80' }, bt[1]);
                        })
                      ),
                      h('div', { className: 'flex gap-1' },
                        h('input', {
                          type: 'text', value: sculptRefine,
                          onChange: function(e) { setSculptRefine(e.target.value); },
                          onKeyDown: function(e) { if (e.key === 'Enter') doRefineSculpt(); },
                          placeholder: t('stem.geosandbox.sculpt_refine_placeholder', 'Tell the AI what to change…'),
                          'aria-label': t('stem.geosandbox.sculpt_refine_placeholder', 'Tell the AI what to change'),
                          className: 'flex-1 min-w-0 text-xs p-1.5 rounded-lg bg-slate-900/60 border border-fuchsia-500/40 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-fuchsia-400 outline-none'
                        }),
                        h('button', { onClick: doRefineSculpt, disabled: sculptBusy, 'aria-label': t('stem.geosandbox.apply_sculpt_refinement', 'Apply sculpture refinement'), className: 'px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-fuchsia-600 text-white hover:bg-fuchsia-700 disabled:opacity-50' }, '✨')
                      )
                    )
                  ),

              // ── Manual primitive editor: build from scratch OR hand-edit an AI sculpt ──
              h('div', { className: 'pt-2 mt-1 border-t border-fuchsia-500/30 space-y-2' },
                h('div', { className: 'flex items-center gap-2 flex-wrap' },
                  h('button', {
                    onClick: function() { if (!sculptRecipe) startFromScratch(); else setSculptEdit(!sculptEdit); },
                    'aria-pressed': (sculptRecipe && sculptEdit) ? 'true' : 'false',
                    className: 'px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ' + ((sculptRecipe && sculptEdit) ? 'bg-fuchsia-600 text-white' : 'bg-slate-900/50 text-fuchsia-200 border border-fuchsia-500/40 hover:bg-slate-900/80')
                  }, sculptRecipe ? ('✋ ' + (sculptEdit ? t('stem.geosandbox.sculpt_editing', 'Editing by hand') : t('stem.geosandbox.sculpt_edit', 'Edit by hand'))) : ('🆕 ' + t('stem.geosandbox.sculpt_scratch', 'Build from scratch'))),
                  (sculptRecipe && sculptEdit && sculptUndo.length > 0) && h('button', {
                    onClick: undoSculptEdit,
                    className: 'px-2 py-1 rounded-full text-[11px] font-bold bg-slate-900/50 text-fuchsia-200 border border-fuchsia-500/40 hover:bg-slate-900/80'
                  }, '↶ ' + t('stem.geosandbox.sculpt_undo', 'Undo'))
                ),
                (sculptEdit && sculptRecipe && sculptRecipe.parts) && h('div', { className: 'space-y-2 bg-slate-900/40 rounded-lg p-2' },
                  h('div', { className: 'text-[11px] font-bold text-fuchsia-200' }, t('stem.geosandbox.sculpt_parts', 'Parts — tap one to select, then shape it')),
                  h('div', { className: 'flex flex-wrap gap-1' },
                    sculptRecipe.parts.map(function(pp, i) {
                      return h('button', {
                        key: i,
                        onClick: function() { setSelPart(i); },
                        className: 'flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold border transition-all ' + (selPart === i ? 'bg-fuchsia-600/40 border-fuchsia-400 text-white' : 'bg-slate-800/60 border-slate-600/40 text-slate-200 hover:bg-slate-800')
                      },
                        h('span', { className: 'w-2.5 h-2.5 rounded-full inline-block', style: { backgroundColor: pp.color || '#ffffff' } }),
                        (i + 1) + ' ' + (pp.shape || 'box')
                      );
                    })
                  ),
                  h('div', { className: 'flex flex-wrap items-center gap-1' },
                    h('span', { className: 'text-[11px] text-fuchsia-200/70' }, t('stem.geosandbox.sculpt_add', 'Add:')),
                    SCULPT_SHAPES.map(function(s) {
                      return h('button', { key: s, onClick: function() { addPart(s); }, className: 'px-2 py-1 rounded-full text-[11px] font-bold bg-slate-800/60 text-fuchsia-100 border border-fuchsia-500/30 hover:bg-slate-800' }, '＋ ' + s);
                    })
                  ),
                  (selPart != null && sculptRecipe.parts[selPart]) && h('div', { className: 'space-y-1.5 pt-1.5 border-t border-fuchsia-500/20' },
                    h('div', { className: 'text-[11px] font-bold text-fuchsia-200' }, t('stem.geosandbox.sculpt_selected', 'Selected part') + ' ' + (selPart + 1)),
                    h('div', { className: 'flex flex-wrap gap-1' },
                      [['x', -1, '◀ X'], ['x', 1, 'X ▶'], ['y', 1, '▲ Y'], ['y', -1, 'Y ▼'], ['z', -1, 'Z −'], ['z', 1, 'Z ＋']].map(function(m, k) {
                        return h('button', { key: k, onClick: function() { nudgePart(m[0], m[1]); }, 'aria-label': 'Move ' + m[0] + (m[1] > 0 ? ' positive' : ' negative'), className: 'px-2 py-1 rounded text-[11px] font-bold bg-slate-800/60 text-slate-100 border border-slate-600/40 hover:bg-slate-800' }, m[2]);
                      })
                    ),
                    h('div', { className: 'flex flex-wrap gap-1' },
                      h('button', { onClick: function() { scaleSelPart(1.15); }, 'aria-label': t('stem.geosandbox.sculpt_part_bigger', 'Make part bigger'), className: 'px-2 py-1 rounded text-[11px] font-bold bg-slate-800/60 text-slate-100 border border-slate-600/40 hover:bg-slate-800' }, '🔍＋'),
                      h('button', { onClick: function() { scaleSelPart(0.87); }, 'aria-label': t('stem.geosandbox.sculpt_part_smaller', 'Make part smaller'), className: 'px-2 py-1 rounded text-[11px] font-bold bg-slate-800/60 text-slate-100 border border-slate-600/40 hover:bg-slate-800' }, '🔍−'),
                      h('button', { onClick: rotateSelPart, 'aria-label': t('stem.geosandbox.sculpt_part_rotate', 'Rotate part'), className: 'px-2 py-1 rounded text-[11px] font-bold bg-slate-800/60 text-slate-100 border border-slate-600/40 hover:bg-slate-800' }, '⟳'),
                      h('button', { onClick: recolorSelPart, 'aria-label': t('stem.geosandbox.sculpt_part_recolor', 'Recolor part'), className: 'px-2 py-1 rounded text-[11px] font-bold bg-slate-800/60 text-slate-100 border border-slate-600/40 hover:bg-slate-800' }, '🎨'),
                      h('button', { onClick: reshapeSelPart, 'aria-label': t('stem.geosandbox.sculpt_part_reshape', 'Change part shape'), className: 'px-2 py-1 rounded text-[11px] font-bold bg-slate-800/60 text-slate-100 border border-slate-600/40 hover:bg-slate-800' }, '◆ ' + t('stem.geosandbox.sculpt_shape', 'shape')),
                      h('button', { onClick: deleteSelPart, 'aria-label': t('stem.geosandbox.sculpt_part_delete', 'Delete selected part'), className: 'px-2 py-1 rounded text-[11px] font-bold bg-rose-900/40 text-rose-200 border border-rose-500/40 hover:bg-rose-900/60' }, '🗑')
                    )
                  )
                )
              ),

              // ── Saved-sculpts gallery ──
              h('div', { className: 'pt-2 mt-1 border-t border-fuchsia-500/30 space-y-2' },
                h('div', { className: 'flex items-center justify-between gap-2' },
                  h('div', { className: 'text-[11px] font-bold text-fuchsia-200' }, '🖼 ' + t('stem.geosandbox.sculpt_gallery', 'Saved sculpts') + ' (' + Object.keys(savedSculpts).length + ')'),
                  sculptRecipe && h('button', {
                    onClick: function() { saveSculpt(sculptRecipe.name); },
                    'aria-label': t('stem.geosandbox.sculpt_save', 'Save this sculpt'),
                    className: 'px-2.5 py-1 rounded-full text-[11px] font-bold bg-fuchsia-600 text-white hover:bg-fuchsia-700'
                  }, '💾 ' + t('stem.geosandbox.sculpt_save_2', 'Save'))
                ),
                (Object.keys(savedSculpts).length === 0)
                  ? h('p', { className: 'text-[11px] text-fuchsia-200/60' }, t('stem.geosandbox.sculpt_gallery_empty', 'No saved sculpts yet — make one, then press Save.'))
                  : h('div', { className: 'flex flex-wrap gap-1' },
                      Object.keys(savedSculpts).map(function(nm) {
                        return h('div', { key: nm, className: 'flex items-center rounded-lg overflow-hidden border border-fuchsia-500/30 bg-slate-800/60' },
                          h('button', { onClick: function() { loadSculpt(nm); }, title: t('stem.geosandbox.sculpt_load', 'Load') + ' ' + nm, className: 'px-2 py-1 text-[11px] font-bold text-fuchsia-100 hover:bg-slate-800 max-w-[120px] truncate' }, nm),
                          h('button', { onClick: function() { deleteSculpt(nm); }, 'aria-label': t('stem.geosandbox.sculpt_delete', 'Delete') + ' ' + nm, className: 'px-1.5 py-1 text-[11px] text-rose-300 hover:bg-rose-900/40 border-l border-fuchsia-500/30' }, '×')
                        );
                      })
                    )
              )
            ),

            // ═══ SCULPT MATH — per-part formulas for the primitives in a sculpt ═══
            mode === 'sculpt' && sculptRecipe && sculptRecipe.parts && sculptRecipe.parts.length > 0 && (function() {
              var sm = geoSculptMeasure(sculptRecipe);
              return h('div', { className: 'bg-gradient-to-br from-emerald-900/30 to-slate-900/40 rounded-xl p-3 border border-emerald-500/40 space-y-2' },
                h('div', { className: 'text-xs font-bold text-emerald-200 uppercase tracking-wider' }, t('stem.geosandbox.sculpt_math', '🧮 Sculpt math')),
                h('p', { className: 'text-[10.5px] text-emerald-200/70' },
                  t('stem.geosandbox.sculpt_math_intro', 'Every sculpt is built from primitives. Here is each part’s formula and size') +
                  (sm.scale !== 1 ? ' (' + t('stem.geosandbox.at_scale', 'at scale') + ' ×' + sm.scale + ')' : '') + ':'),
                h('div', { className: 'space-y-1 max-h-48 overflow-y-auto' },
                  sm.parts.map(function(pt, i) {
                    return h('div', { key: 'sm-' + i, className: 'text-[11px] bg-slate-900/40 rounded px-2 py-1' },
                      h('div', { className: 'flex justify-between font-bold text-emerald-100' },
                        h('span', null, (i + 1) + '. ' + pt.name + ' (' + pt.dims + ')'),
                        h('span', { className: 'font-mono text-emerald-300' }, 'V ' + pt.vol.toFixed(2))
                      ),
                      h('div', { className: 'font-mono text-[10px] text-emerald-400/70' }, pt.volFormula + ' · ' + pt.saFormula + ' → SA ' + pt.sa.toFixed(1))
                    );
                  })
                ),
                h('div', { className: 'flex justify-between text-[11px] font-bold pt-1.5 border-t border-emerald-500/30' },
                  h('span', { className: 'text-emerald-200' }, t('stem.geosandbox.sculpt_total', 'Sum of parts')),
                  h('span', { className: 'font-mono text-emerald-300' }, 'V ' + sm.totalVol.toFixed(2) + ' u³ · SA ' + sm.totalSA.toFixed(1) + ' u²')
                ),
                h('div', { className: 'text-[10px] text-emerald-200/60 italic' },
                  t('stem.geosandbox.sculpt_overlap_note', 'This is the sum of the parts — where pieces overlap, the real solid’s volume is a little less. Good to notice!'))
              );
            })(),

            // ── v2: STRETCH MODE PANEL — the HandWaver-inspired workflow ──
            mode === 'stretch' && h('div', { className: 'bg-gradient-to-br from-purple-900/40 to-fuchsia-900/30 rounded-xl p-3 border border-purple-500/40 space-y-3' },
              h('div', { className: 'text-xs font-bold text-purple-200 uppercase tracking-wider' }, t('stem.geosandbox.dimensional_stretch_builder', '📐 Dimensional Stretch Builder')),
              h('p', { className: 'text-[11px] text-purple-200/80 leading-relaxed' },
                t('stem.geosandbox.build_geometry_by_stretching_a_point_i', 'Build geometry by stretching a point into a line, a line into a plane, and a plane into a solid. Each stretch adds a new object to the scene.')
              ),
              // ── Dimension journey: 0D→3D spine that fills as the student first
              //    reaches each dimension (persisted in _geoExt.maxDim). ──
              (function() {
                var liveMax = 0;
                construction.objects.forEach(function(o) { var m = geoStretchMeasure(o); if (m && m.dim > liveMax) liveMax = m.dim; });
                var reached = Math.max(liveMax, (gd._geoExt && gd._geoExt.maxDim) || 0);
                var rungs = [
                  { d: 0, glyph: '•', name: t('stem.geosandbox.dim0', 'Point'), color: '#ef4444' },
                  { d: 1, glyph: '—', name: t('stem.geosandbox.dim1', 'Line'), color: '#22c55e' },
                  { d: 2, glyph: '▭', name: t('stem.geosandbox.dim2', 'Plane'), color: '#3b82f6' },
                  { d: 3, glyph: '🧊', name: t('stem.geosandbox.dim3', 'Solid'), color: '#a78bfa' }
                ];
                return h('div', { className: 'flex items-stretch gap-1', role: 'img', 'aria-label': t('stem.geosandbox.dimension_journey', 'Dimension journey') + ': ' + reached + 'D ' + t('stem.geosandbox.reached', 'reached') },
                  rungs.map(function(r) {
                    var on = reached >= r.d;
                    return h('div', {
                      key: 'jr-' + r.d,
                      className: 'flex-1 rounded-md px-1 py-1 text-center transition-all border',
                      style: { background: on ? (r.color + '26') : 'rgba(15,23,42,0.86)', borderColor: on ? r.color : '#94a3b8', opacity: on ? 1 : 0.92 }
                    },
                      h('div', { className: 'text-sm leading-none', style: { color: on ? '#f8fafc' : '#cbd5e1' } }, r.glyph),
                      h('div', { className: 'text-[9px] font-bold mt-0.5', style: { color: on ? '#f8fafc' : '#cbd5e1' } }, r.d + 'D'),
                      h('div', { className: 'text-[8px] text-slate-400 leading-tight' }, r.name)
                    );
                  })
                );
              })(),
              // ── Predict-then-reveal toggle: pause each stretch to guess the result. ──
              h('label', { className: 'flex items-center gap-1.5 text-[11px] font-bold text-purple-200 cursor-pointer' },
                h('input', {
                  type: 'checkbox', checked: predictMode,
                  onChange: function(e) { upd('predictMode', e.target.checked); if (!e.target.checked && pendingPredict) cancelPrediction(); },
                  'aria-label': t('stem.geosandbox.predict_mode', 'Predict mode: guess the result before each stretch')
                }),
                t('stem.geosandbox.predict_before_reveal', '🔮 Predict before reveal')
              ),
              // ── Build Challenge: math problem-solving woven into the mechanic ──
              (function() {
                if (!buildChallenge) {
                  return h('div', { className: 'rounded-lg p-2.5 bg-slate-900/50 border border-emerald-500/40 space-y-1.5' },
                    h('div', { className: 'text-[11px] font-bold text-emerald-200' }, '🎯 ' + t('stem.geosandbox.build_challenge', 'Build Challenge')),
                    h('p', { className: 'text-[10.5px] text-emerald-200/70' }, t('stem.geosandbox.build_challenge_intro', 'Get a target and build a shape that hits it — stretch to the right length, area, or volume.')),
                    h('div', { className: 'flex gap-1' },
                      [[1, t('stem.geosandbox.level_length', 'Length')], [2, t('stem.geosandbox.level_area', 'Area')], [3, t('stem.geosandbox.level_volume', 'Volume')]].map(function(lvl) {
                        return h('button', {
                          key: 'lvl-' + lvl[0],
                          onClick: function() { startBuildChallenge(lvl[0]); },
                          className: 'flex-1 px-2 py-1.5 rounded text-[11px] font-bold bg-emerald-700/70 text-white hover:bg-emerald-800 transition-all'
                        }, lvl[1]);
                      })
                    ),
                    (buildScore.solved > 0) && h('div', { className: 'text-[10px] text-emerald-300/80' }, '⭐ ' + (t('stem.geosandbox.build_solved_count', '{n} solved').replace('{n}', String(buildScore.solved))))
                  );
                }
                var solved = buildEval && buildEval.solved;
                return h('div', { className: 'rounded-lg p-2.5 border space-y-1.5 ' + (solved ? 'bg-emerald-900/40 border-emerald-400/60' : 'bg-slate-900/50 border-emerald-500/40') },
                  h('div', { className: 'flex items-center justify-between' },
                    h('div', { className: 'text-[11px] font-bold text-emerald-200' }, (solved ? '✅ ' : '🎯 ') + t('stem.geosandbox.build_challenge', 'Build Challenge')),
                    (buildScore.solved > 0) && h('div', { className: 'text-[10px] text-emerald-300/80' }, '⭐ ' + buildScore.solved)
                  ),
                  h('p', { className: 'text-[11px] text-emerald-100 font-medium' }, buildChallenge.prompt),
                  buildEval && h('p', { className: 'text-[10.5px] font-mono ' + (solved ? 'text-emerald-300' : 'text-amber-300/90'), 'aria-live': 'polite' }, buildEval.message),
                  h('div', { className: 'flex gap-1' },
                    h('button', {
                      onClick: function() { updExt({ _bldHint: !(gd._geoExt && gd._geoExt._bldHint) }); },
                      className: 'px-2 py-1 rounded text-[10.5px] font-bold bg-slate-800/70 text-slate-200 hover:bg-slate-700'
                    }, '💡 ' + t('stem.geosandbox.hint', 'Hint')),
                    h('button', {
                      onClick: function() { startBuildChallenge(solved ? undefined : buildChallenge.level); },
                      className: 'px-2 py-1 rounded text-[10.5px] font-bold bg-emerald-700/70 text-white hover:bg-emerald-800'
                    }, solved ? ('➡ ' + t('stem.geosandbox.next_challenge', 'Next')) : ('🔄 ' + t('stem.geosandbox.new_challenge', 'New'))),
                    h('button', {
                      onClick: clearBuildChallenge,
                      className: 'px-2 py-1 rounded text-[10.5px] font-bold bg-slate-800/70 text-slate-400 hover:bg-slate-700'
                    }, '✕')
                  ),
                  (gd._geoExt && gd._geoExt._bldHint) && h('p', { className: 'text-[10px] text-emerald-200/70 italic' }, buildChallenge.hint)
                );
              })(),
              // Voice build (hands-free HandWaver stretch): speak the dimensional moves
              (voiceSupported && typeof ctx.callGemini === 'function') && h('div', { className: 'space-y-1' },
                h('button', {
                  onClick: function() { toggleVoice(handleStretchVoiceCommand, 'Listening. Say “add a point”, then “stretch it up”, “sweep across”, or “pull it out”.'); },
                  'aria-pressed': voiceListening ? 'true' : 'false',
                  'aria-label': t('stem.geosandbox.voice_build_title', 'Voice build — speak the stretches to build point to line to plane to solid, hands-free'),
                  title: t('stem.geosandbox.voice_build_title', 'Voice build — speak the stretches to build point to line to plane to solid, hands-free'),
                  className: 'w-full px-3 py-2 rounded-lg text-xs font-bold transition-all ' + (voiceListening ? 'bg-rose-600 text-white opacity-90' : 'bg-slate-900/50 text-purple-200 border border-purple-500/40 hover:bg-slate-900/80')
                }, voiceListening ? ('🔴 ' + t('stem.geosandbox.voice_listening', 'Listening… tap to stop')) : ('🎤 ' + t('stem.geosandbox.voice_build', 'Voice build'))),
                voiceHeard && h('p', { className: 'text-[11px] text-purple-200/70 italic', 'aria-live': 'polite' }, '“' + voiceHeard + '”')
              ),
              // Step 1: Place a point — at the origin, by tapping the 3D view, or at exact x/z.
              h('div', { className: 'space-y-1.5' },
                h('div', { className: 'flex gap-1.5' },
                  h('button', {
                    onClick: function() { addPoint([0, 0, 0]); },
                    'aria-label': t('stem.geosandbox.add_a_point_at_origin', 'Add a point at origin'),
                    className: 'flex-1 px-3 py-2 rounded-lg text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 transition-all shadow-md'
                  }, t('stem.geosandbox.place_point_at_origin', '⊙ Point at origin')),
                  h('button', {
                    onClick: function() { upd('placeArmed', !placeArmed); },
                    'aria-pressed': placeArmed,
                    'aria-label': t('stem.geosandbox.click_to_place_toggle', 'Click in the 3D view to place a point'),
                    className: 'px-3 py-2 rounded-lg text-xs font-bold transition-all border-2 ' +
                      (placeArmed ? 'bg-emerald-700 text-white border-emerald-300 shadow-md' : 'bg-slate-800/60 text-slate-300 border-slate-300/70 hover:bg-slate-700')
                  }, placeArmed ? t('stem.geosandbox.placing_active', '🎯 Placing…') : t('stem.geosandbox.click_place', '🎯 Click-place'))
                ),
                placeArmed && h('p', { className: 'text-[10px] text-emerald-300/80' },
                  t('stem.geosandbox.click_place_hint', 'Click empty space in the 3D view to drop a point (snaps to the grid).')),
                // Exact placement + snap grid (keyboard-friendly path)
                h('div', { className: 'flex items-end gap-1.5' },
                  h('label', { className: 'flex-1' },
                    h('span', { className: 'block text-[10px] font-bold text-purple-200 mb-0.5' }, t('stem.geosandbox.place_x', 'X')),
                    h('input', {
                      type: 'number', step: (snap || 0.5), value: placeX,
                      onChange: function(e) { var v = parseFloat(e.target.value); if (!isNaN(v)) upd('placeX', v); },
                      'aria-label': t('stem.geosandbox.place_x_aria', 'Point X position'),
                      className: 'w-full px-1.5 py-1 rounded bg-slate-900/70 border border-purple-500/40 text-purple-100 text-[11px] font-mono text-right'
                    })),
                  h('label', { className: 'flex-1' },
                    h('span', { className: 'block text-[10px] font-bold text-purple-200 mb-0.5' }, t('stem.geosandbox.place_z', 'Z')),
                    h('input', {
                      type: 'number', step: (snap || 0.5), value: placeZ,
                      onChange: function(e) { var v = parseFloat(e.target.value); if (!isNaN(v)) upd('placeZ', v); },
                      'aria-label': t('stem.geosandbox.place_z_aria', 'Point Z position'),
                      className: 'w-full px-1.5 py-1 rounded bg-slate-900/70 border border-purple-500/40 text-purple-100 text-[11px] font-mono text-right'
                    })),
                  h('button', {
                    onClick: function() { placePoint(placeX, placeZ); },
                    'aria-label': t('stem.geosandbox.place_at_xz', 'Place a point at the entered X and Z'),
                    className: 'px-3 py-1.5 rounded-lg text-[11px] font-bold bg-purple-600 text-white hover:bg-purple-700 transition-all'
                  }, t('stem.geosandbox.place', 'Place'))
                ),
                h('div', { className: 'flex items-center gap-1.5' },
                  h('span', { className: 'text-[10px] font-bold text-purple-200' }, t('stem.geosandbox.snap', 'Snap:')),
                  [{ v: 0.5, l: '½' }, { v: 1, l: '1' }, { v: 0, l: t('stem.geosandbox.snap_off', 'off') }].map(function(s) {
                    var on = snap === s.v;
                    return h('button', {
                      key: 'snap-' + s.v,
                      onClick: function() { upd('snap', s.v); },
                      'aria-pressed': on,
                      'aria-label': t('stem.geosandbox.snap_grid', 'Snap grid') + ' ' + s.l,
                      className: 'px-2 py-0.5 rounded text-[11px] font-bold font-mono transition-all ' +
                        (on ? 'bg-purple-600 text-white' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700')
                    }, s.l);
                  })
                )
              ),
              // Build action (verb) — how the next stretch resolves.
              h('div', null,
                h('div', { className: 'text-[11px] font-bold text-purple-200 mb-1' }, t('stem.geosandbox.build_action', 'Build action:')),
                h('div', { className: 'flex gap-1', role: 'radiogroup', 'aria-label': t('stem.geosandbox.build_action_2', 'Build action') },
                  [{ id: 'stretch', label: t('stem.geosandbox.verb_stretch', '⤴ Stretch') }, { id: 'taper', label: t('stem.geosandbox.verb_taper', '🔺 Taper') }, { id: 'revolve', label: t('stem.geosandbox.verb_revolve', '🌀 Revolve') }].map(function(vb) {
                    var active = buildVerb === vb.id;
                    return h('button', {
                      key: 'vb-' + vb.id, role: 'radio', 'aria-checked': active,
                      onClick: function() { upd('buildVerb', vb.id); },
                      className: 'flex-1 px-2 py-1 rounded text-[11px] font-bold border-2 ' +
                        (active ? 'bg-fuchsia-700 text-white border-fuchsia-400' : 'bg-slate-800/60 text-slate-300 border-slate-300/70 hover:bg-slate-700')
                    }, vb.label);
                  })
                ),
                buildVerb === 'taper' && h('p', { className: 'text-[10px] text-fuchsia-200/70 mt-0.5' },
                  t('stem.geosandbox.taper_hint', 'Taper a rectangle → shrinks the top toward a point. Top 0 = pyramid (⅓ the box!), 1 = box.')),
                buildVerb === 'revolve' && h('p', { className: 'text-[10px] text-teal-200/70 mt-0.5' },
                  t('stem.geosandbox.revolve_hint', 'Revolve a rectangle around a world axis (through the origin) → a cylinder when an edge sits on the axis, a ring when you place it further out. Volume by Pappus: V = θ·R̄·A.'))
              ),
              // Taper top-size slider (taper verb only).
              buildVerb === 'taper' && h('div', null,
                h('div', { className: 'flex justify-between text-[11px] font-bold text-purple-200 mb-1' },
                  h('span', null, t('stem.geosandbox.top_size', 'Top size')),
                  h('span', { className: 'text-fuchsia-300 font-mono' }, topScale.toFixed(2) + (topScale <= 0.001 ? ' ▲ ' + t('stem.geosandbox.pyramid', 'pyramid') : topScale >= 0.999 ? ' ▮ ' + t('stem.geosandbox.box', 'box') : ' ◭ ' + t('stem.geosandbox.frustum', 'frustum')))
                ),
                h('input', {
                  type: 'range', min: '0', max: '1', step: '0.05', value: topScale,
                  onChange: function(e) { upd('topScale', parseFloat(e.target.value)); },
                  'aria-label': t('stem.geosandbox.top_size_aria', 'Taper top size'),
                  className: 'w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-fuchsia-500'
                })
              ),
              // Revolve sweep-angle slider (revolve verb only).
              buildVerb === 'revolve' && h('div', null,
                h('div', { className: 'flex justify-between text-[11px] font-bold text-purple-200 mb-1' },
                  h('span', null, t('stem.geosandbox.sweep_angle', 'Sweep angle')),
                  h('span', { className: 'text-teal-300 font-mono' }, Math.round(revolveAngle) + '°' + (revolveAngle >= 360 ? ' ' + t('stem.geosandbox.full_turn', 'full turn') : ''))
                ),
                h('input', {
                  type: 'range', min: '30', max: '360', step: '15', value: revolveAngle,
                  onChange: function(e) { upd('revolveAngle', parseFloat(e.target.value)); },
                  'aria-label': t('stem.geosandbox.sweep_angle_aria', 'Revolution sweep angle in degrees'),
                  className: 'w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500'
                }),
                h('p', { className: 'text-[10px] text-teal-200/70 mt-0.5' },
                  t('stem.geosandbox.revolve_axis_note', 'Uses the axis picker below as the spin axis (through the origin). Edge on the axis → solid cylinder; placed further out → a ring.')),
                // Profile: rectangle → cylinder/ring, triangle → cone
                h('div', { className: 'flex gap-1 mt-1', role: 'radiogroup', 'aria-label': t('stem.geosandbox.revolve_profile', 'Profile to spin') },
                  [{ id: 'rect', label: t('stem.geosandbox.profile_rect', '▭ Rectangle → cylinder') }, { id: 'triangle', label: t('stem.geosandbox.profile_tri', '◺ Triangle → cone') }].map(function(pf) {
                    var active = revolveProfile === pf.id;
                    return h('button', {
                      key: 'pf-' + pf.id, role: 'radio', 'aria-checked': active,
                      onClick: function() { upd('revolveProfile', pf.id); },
                      className: 'flex-1 px-2 py-1 rounded text-[10px] font-bold border ' +
                        (active ? 'bg-teal-700 text-white border-teal-300' : 'bg-slate-800/60 text-slate-300 border-slate-300/70 hover:bg-slate-700')
                    }, pf.label);
                  })
                ),
                revolveProfile === 'triangle' && h('p', { className: 'text-[10px] text-teal-200/70 mt-0.5' },
                  t('stem.geosandbox.cone_note', 'Spinning a right triangle gives a cone — and Pappus lands exactly on V = ⅓πr²h.'))
              ),
              // Stretch axis selector
              h('div', null,
                h('div', { className: 'text-[11px] font-bold text-purple-200 mb-1' }, t('stem.geosandbox.stretch_axis', 'Stretch axis:')),
                h('div', { className: 'flex gap-1', role: 'radiogroup', 'aria-label': t('stem.geosandbox.stretch_axis_2', 'Stretch axis') },
                  STRETCH_AXES.map(function(ax) {
                    var active = stretchAxis === ax.id;
                    return h('button', {
                      key: 'ax-' + ax.id,
                      role: 'radio',
                      'aria-checked': active,
                      onClick: function() { upd('stretchAxis', ax.id); },
                      style: { borderColor: active ? ax.color : 'transparent' },
                      className: 'flex-1 px-2 py-1 rounded text-[11px] font-bold border-2 ' +
                        (active ? 'bg-slate-700 text-white' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700')
                    }, ax.id.toUpperCase());
                  })
                )
              ),
              // Stretch length — slider for quick feel + a precise number box so a
              // student can dial in an exact value (needed to hit a challenge target).
              h('div', null,
                h('div', { className: 'flex justify-between text-[11px] font-bold text-purple-200 mb-1' },
                  h('span', null, t('stem.geosandbox.length', 'Length')),
                  h('span', { className: 'text-purple-300 font-mono' }, stretchLength.toFixed(1) + ' ' + unitDef.short)
                ),
                h('div', { className: 'flex items-center gap-2' },
                  h('input', {
                    type: 'range', min: '0.5', max: '12', step: '0.5',
                    value: stretchLength,
                    onChange: function(e) { upd('stretchLength', parseFloat(e.target.value)); },
                    'aria-label': t('stem.geosandbox.stretch_length', 'Stretch length'),
                    className: 'flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500'
                  }),
                  h('input', {
                    type: 'number', min: '0.1', max: '20', step: '0.1',
                    value: stretchLength,
                    onChange: function(e) { var v = parseFloat(e.target.value); if (!isNaN(v)) upd('stretchLength', Math.max(0.1, Math.min(20, v))); },
                    'aria-label': t('stem.geosandbox.stretch_length_exact', 'Exact stretch length'),
                    className: 'w-16 px-1.5 py-1 rounded bg-slate-900/70 border border-purple-500/40 text-purple-100 text-[11px] font-mono text-right'
                  })
                )
              ),
              // ── Oblique (Cavalieri) slant: slant the stretch without changing the
              //    base or height, so area/volume stay identical — a hands-on proof
              //    of Cavalieri's principle. ──
              h('div', null,
                h('div', { className: 'flex justify-between items-center mb-1' },
                  h('label', { className: 'flex items-center gap-1.5 text-[11px] font-bold text-purple-200 cursor-pointer' },
                    h('input', {
                      type: 'checkbox', checked: stretchSlant !== 0,
                      onChange: function(e) { upd('stretchSlant', e.target.checked ? 0.6 : 0); },
                      'aria-label': t('stem.geosandbox.oblique_toggle', 'Oblique (slanted) stretch')
                    }),
                    t('stem.geosandbox.oblique', '◣ Oblique (slant)')
                  ),
                  stretchSlant !== 0 && h('span', { className: 'text-purple-300 font-mono text-[11px]' }, '×' + stretchSlant.toFixed(1))
                ),
                stretchSlant !== 0 && h('input', {
                  type: 'range', min: '0', max: '1.5', step: '0.1',
                  value: stretchSlant,
                  onChange: function(e) { upd('stretchSlant', parseFloat(e.target.value)); },
                  'aria-label': t('stem.geosandbox.slant_amount', 'Slant amount'),
                  className: 'w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500'
                }),
                stretchSlant !== 0 && h('p', { className: 'text-[10px] text-emerald-300/80 mt-0.5' },
                  t('stem.geosandbox.cavalieri_note', "Cavalieri: slanting keeps the base and height — so area/volume don't change, only the surface does.")
                )
              ),
              // Predict card — when a stretch is paused for a guess (predict mode).
              pendingPredict && h('div', { className: 'rounded-lg p-2.5 bg-indigo-900/50 border border-indigo-400/50 space-y-2' },
                h('div', { className: 'text-[11px] font-bold text-indigo-100' },
                  '🔮 ' + t('stem.geosandbox.predict_the', 'Predict the') + ' ' + pendingPredict.label.toLowerCase() +
                  ' ' + t('stem.geosandbox.of_the_result', 'of the result') +
                  (pendingPredict.unitExp ? ' (' + unitDef.short + (pendingPredict.unitExp === 2 ? '²' : pendingPredict.unitExp === 3 ? '³' : '') + ')' : '')),
                h('div', { className: 'flex items-center gap-1.5' },
                  h('input', {
                    type: 'number', step: '0.1', value: predictGuess, autoFocus: true,
                    onChange: function(e) { setPredictGuess(e.target.value); },
                    onKeyDown: function(e) { if (e.key === 'Enter') revealPrediction(); },
                    'aria-label': t('stem.geosandbox.your_prediction', 'Your prediction'),
                    className: 'flex-1 px-2 py-1 rounded bg-slate-900/70 border border-indigo-400/50 text-indigo-100 text-xs font-mono text-right'
                  }),
                  h('button', {
                    onClick: revealPrediction,
                    className: 'px-3 py-1 rounded-lg text-[11px] font-bold bg-indigo-500 text-white hover:bg-indigo-600 transition-all'
                  }, t('stem.geosandbox.reveal_build', 'Reveal & build')),
                  h('button', {
                    onClick: cancelPrediction,
                    'aria-label': t('stem.geosandbox.cancel_prediction', 'Cancel prediction'),
                    className: 'px-2 py-1 rounded-lg text-[11px] text-indigo-200 hover:bg-indigo-800/50 transition-all'
                  }, '✕')
                )
              ),
              // Stretch button (context label changes based on selection)
              (function() {
                var sel = construction.objects.find(function(o) { return o.id === construction.selection; });
                var label = 'Select an object first';
                var enabled = false;
                if (sel) {
                  if (buildVerb === 'taper' && sel.type === 'rect') {
                    label = topScale <= 0.001 ? 'Taper rectangle → pyramid (3D)' : topScale >= 0.999 ? 'Taper rectangle → prism (3D)' : 'Taper rectangle → frustum (3D)';
                    enabled = true;
                  }
                  else if (buildVerb === 'revolve' && sel.type === 'rect') {
                    label = revolveProfile === 'triangle' ? (revolveAngle >= 360 ? 'Revolve triangle → cone (3D)' : 'Revolve triangle → cone wedge (3D)')
                      : (revolveAngle >= 360 ? 'Revolve rectangle → cylinder/ring (3D)' : 'Revolve rectangle → wedge (3D)');
                    enabled = true;
                  }
                  else if ((buildVerb === 'taper' || buildVerb === 'revolve') && sel.type !== 'rect') {
                    label = (buildVerb === 'taper' ? 'Taper' : 'Revolve') + ' needs a rectangle — select or build one';
                    enabled = false;
                  }
                  else if (sel.type === 'point')    { label = 'Stretch point → segment (1D)'; enabled = true; }
                  else if (sel.type === 'segment')  { label = 'Stretch segment → rectangle (2D)'; enabled = true; }
                  else if (sel.type === 'rect')     { label = 'Stretch rectangle → prism (3D)'; enabled = true; }
                  else                              { label = '✓ Already a solid (3D)'; enabled = false; }
                }
                return h('button', {
                  onClick: performStretch,
                  disabled: !enabled || !!pendingPredict,
                  'aria-label': label,
                  className: 'w-full px-3 py-2 rounded-lg text-xs font-bold transition-all ' +
                    (enabled && !pendingPredict ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white hover:from-fuchsia-700 hover:to-purple-700 shadow-md' : 'bg-slate-700 text-slate-500 cursor-not-allowed')
                }, (predictMode ? '🔮 ' : '⤴ ') + label);
              })(),
              // Construction object list
              construction.objects.length > 0 && h('div', { className: 'border-t border-purple-500/30 pt-2' },
                h('div', { className: 'text-[11px] font-bold text-purple-200 mb-1' }, 'Construction (' + construction.objects.length + ' objects):'),
                h('div', { className: 'text-[10px] text-purple-300/70 mb-1' }, t('stem.geosandbox.click_to_select_hint', '💡 Tip: click a shape in the 3D view — or the list — to select it, then stretch.')),
                h('div', { className: 'space-y-1 max-h-40 overflow-y-auto' },
                  construction.objects.map(function(o) {
                    var isSel = o.id === construction.selection;
                    var icon = o.type === 'point' ? '⊙' : o.type === 'segment' ? '⎯' : o.type === 'rect' ? '▭' : o.type === 'pyramid' ? '🔺' : o.type === 'revolution' ? '🌀' : '⬛';
                    var mmO = geoStretchMeasure(o);
                    var label = o.type === 'point' ? 'Point #' + o.id :
                                o.type === 'segment' ? 'Segment #' + o.id + ' (L = ' + objectVolume(o).toFixed(2) + ' ' + unitDef.short + ')' :
                                o.type === 'rect' ? 'Rectangle #' + o.id + ' (A = ' + objectVolume(o).toFixed(2) + ' ' + unitDef.short + '²)' :
                                o.type === 'pyramid' ? ((mmO.apex ? 'Pyramid #' : 'Frustum #') + o.id + ' (V = ' + mmO.value.toFixed(2) + ' ' + unitDef.short + '³, SA = ' + mmO.surfaceArea.toFixed(1) + ' ' + unitDef.short + '²)' + (mmO.oblique ? ' ◣' : '')) :
                                o.type === 'revolution' ? ('Revolution #' + o.id + ' (V = ' + mmO.value.toFixed(2) + ' ' + unitDef.short + '³)') :
                                'Prism #' + o.id + ' (V = ' + objectVolume(o).toFixed(2) + ' ' + unitDef.short + '³, SA = ' + geoPrismSurfaceArea(o).toFixed(1) + ' ' + unitDef.short + '²)' + (mmO.oblique ? ' ◣' : '');
                    return h('div', { key: 'obj-' + o.id, className: 'flex items-center gap-1' },
                      h('button', {
                        onClick: function() { selectObject(o.id); },
                        'aria-pressed': isSel,
                        className: 'flex-1 text-left px-2 py-1 rounded text-[11px] transition-all flex items-center gap-2 ' +
                          (isSel ? 'bg-fuchsia-600 text-white' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700')
                      }, h('span', { className: 'text-base' }, icon), label),
                      h('button', {
                        onClick: function() { deleteObject(o.id); },
                        'aria-label': t('stem.geosandbox.delete_object', 'Delete') + ' ' + o.type + ' #' + o.id,
                        title: t('stem.geosandbox.delete_object', 'Delete this object'),
                        className: 'px-1.5 py-1 rounded text-[11px] text-rose-300 hover:bg-rose-700/40 transition-all'
                      }, '🗑')
                    );
                  })
                )
              ),
              // ── Edit selected size (Foundation wave) — resize any edge of the
              //    selected object live and watch its measure update. Points have no
              //    size, so this shows only for segment/rect/prism. ──
              (function() {
                var sel = construction.objects.find(function(o) { return o.id === construction.selection; });
                if (!sel || ['segment', 'rect', 'prism', 'pyramid'].indexOf(sel.type) < 0) return null;
                var dims = sel.type === 'segment'
                  ? [{ label: t('stem.geosandbox.dim_length', 'Length'), i: 0, len: vec3Mag(sel.vector) }]
                  : sel.type === 'rect'
                    ? [{ label: t('stem.geosandbox.dim_side_u', 'Side u'), i: 0, len: vec3Mag(sel.u) }, { label: t('stem.geosandbox.dim_side_v', 'Side v'), i: 1, len: vec3Mag(sel.v) }]
                    : [{ label: t('stem.geosandbox.dim_side_u', 'Side u'), i: 0, len: vec3Mag(sel.u) }, { label: t('stem.geosandbox.dim_side_v', 'Side v'), i: 1, len: vec3Mag(sel.v) }, { label: t('stem.geosandbox.dim_height_w', 'Height w'), i: 2, len: vec3Mag(sel.w) }];
                return h('div', { className: 'border-t border-purple-500/30 pt-2 space-y-1.5' },
                  h('div', { className: 'text-[11px] font-bold text-purple-200' },
                    t('stem.geosandbox.edit_selected', '✎ Edit selected size') + ' (#' + sel.id + ')'),
                  dims.map(function(d) {
                    return h('div', { key: 'rsz-' + d.i, className: 'flex items-center gap-2' },
                      h('span', { className: 'w-16 text-[11px] font-bold text-purple-200' }, d.label),
                      h('input', {
                        type: 'range', min: '0.5', max: '12', step: '0.5', value: Math.min(12, d.len),
                        onPointerDown: beginResizeDrag, onPointerUp: endResizeDrag, onBlur: endResizeDrag,
                        onChange: function(e) { resizeSelectedDim(d.i, parseFloat(e.target.value), false); },
                        'aria-label': d.label + ' ' + t('stem.geosandbox.resize', 'resize'),
                        className: 'flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-fuchsia-500'
                      }),
                      h('input', {
                        type: 'number', min: '0.1', max: '20', step: '0.1', value: +d.len.toFixed(2),
                        onChange: function(e) { resizeSelectedDim(d.i, e.target.value, true); },
                        'aria-label': d.label + ' ' + t('stem.geosandbox.exact_value', 'exact value'),
                        className: 'w-16 px-1.5 py-1 rounded bg-slate-900/70 border border-fuchsia-500/40 text-fuchsia-100 text-[11px] font-mono text-right'
                      })
                    );
                  })
                );
              })(),
              // Undo + Clear
              h('div', { className: 'flex gap-2' },
                h('button', {
                  onClick: doStretchUndo,
                  disabled: !history.length,
                  'aria-label': t('stem.geosandbox.undo_last_stretch', 'Undo last stretch'),
                  className: 'flex-1 px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all ' +
                    (history.length ? 'bg-amber-700 text-white hover:bg-amber-800' : 'bg-slate-700 text-slate-500 cursor-not-allowed')
                }, '↶ Undo (' + history.length + ')'),
                h('button', {
                  onClick: clearConstruction,
                  disabled: !construction.objects.length,
                  'aria-label': t('stem.geosandbox.clear_all_construction_objects', 'Clear all construction objects'),
                  className: 'flex-1 px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all ' +
                    (construction.objects.length ? 'bg-rose-700 text-white hover:bg-rose-800' : 'bg-slate-700 text-slate-500 cursor-not-allowed')
                }, t('stem.geosandbox.clear_all', '× Clear all'))
              )
            ),

            // ═══ MISSIONS LADDER — structured progression with persistent stars ═══
            mode === 'stretch' && h('div', { className: 'bg-gradient-to-br from-indigo-900/40 to-slate-900/30 rounded-xl p-3 border border-indigo-500/40 space-y-2' },
              (function() {
                var solvedSet = gd.missionsSolved || [];
                var doneCount = GEO_MISSIONS.filter(function(mn) { return solvedSet.indexOf(mn.id) >= 0; }).length;
                return h('div', { className: 'flex items-center justify-between' },
                  h('div', { className: 'text-xs font-bold text-indigo-200 uppercase tracking-wider' }, t('stem.geosandbox.missions', '🗺 Missions')),
                  h('div', { className: 'text-[10px] text-indigo-300/80 font-mono' }, doneCount + '/' + GEO_MISSIONS.length + ' ★')
                );
              })(),
              h('div', { className: 'space-y-1' },
                GEO_MISSIONS.map(function(mn) {
                  var everSolved = (gd.missionsSolved || []).indexOf(mn.id) >= 0;
                  var liveSolved = geoEvalMission(mn, construction.objects).solved;
                  var done = everSolved || liveSolved;
                  return h('div', {
                    key: 'mn-' + mn.id,
                    className: 'flex items-start gap-2 px-2 py-1.5 rounded-lg ' + (liveSolved ? 'bg-emerald-800/40 border border-emerald-500/40' : done ? 'bg-slate-800/40' : 'bg-slate-900/40')
                  },
                    h('span', { className: 'text-base leading-none pt-0.5', 'aria-hidden': 'true' }, done ? '✅' : mn.icon),
                    h('div', { className: 'flex-1 min-w-0' },
                      h('div', { className: 'text-[11px] font-bold ' + (done ? 'text-emerald-200' : 'text-slate-200') }, mn.title),
                      h('div', { className: 'text-[10px] text-slate-400 leading-snug' }, mn.desc)
                    ),
                    liveSolved && !everSolved && h('span', { className: 'text-[9px] text-emerald-300 font-bold self-center' }, t('stem.geosandbox.mission_now', 'now!'))
                  );
                })
              )
            ),

            // ═══ REAL-WORLD BUILDS — recognisable objects that need the new verbs ═══
            mode === 'stretch' && h('div', { className: 'bg-gradient-to-br from-teal-900/40 to-slate-900/30 rounded-xl p-3 border border-teal-500/40 space-y-2' },
              h('div', { className: 'text-xs font-bold text-teal-200 uppercase tracking-wider' }, t('stem.geosandbox.real_world_builds', '🌍 Real-world builds')),
              h('p', { className: 'text-[10.5px] text-teal-200/70' }, t('stem.geosandbox.real_world_intro', 'Recreate a real object. Match its volume with the right shape — a can needs Revolve, a pyramid needs Taper.')),
              h('div', { className: 'grid grid-cols-2 gap-1' },
                GEO_REAL_OBJECTS.map(function(ro) {
                  var active = realChallengeId === ro.id;
                  return h('button', {
                    key: 'real-' + ro.id,
                    onClick: function() { upd('realChallenge', active ? null : ro.id); },
                    'aria-pressed': active,
                    className: 'text-left px-2 py-1.5 rounded text-[11px] font-bold transition-all border ' +
                      (active ? 'bg-teal-700 text-white border-teal-300' : 'bg-slate-800/60 text-slate-300 border-slate-300/70 hover:bg-slate-700')
                  }, ro.icon + ' ' + ro.name);
                })
              ),
              realChallenge && h('div', { className: 'rounded-lg p-2 bg-slate-900/50 border border-teal-500/30 space-y-1' },
                h('div', { className: 'text-[11px] text-teal-100' }, (realEval && realEval.solved ? '✅ ' : '🎯 ') + realChallenge.desc),
                realEval && realEval.closest != null && !realEval.solved && h('div', { className: 'text-[10px] text-teal-300/80 font-mono' },
                  t('stem.geosandbox.closest_volume', 'Closest volume so far:') + ' ' + (Math.round(realEval.closest * 100) / 100) + ' / ' + (Math.round(realChallenge.target * 100) / 100)),
                realEval && realEval.solved && h('div', { className: 'text-[11px] text-emerald-300 font-bold' }, t('stem.geosandbox.real_solved', 'Solved! You built a') + ' ' + realChallenge.name.toLowerCase() + '.'),
                h('div', { className: 'text-[10px] text-teal-200/60' }, '💡 ' + realChallenge.hint)
              )
            ),

            // ═══ PUZZLE — fattest solid (max volume under a surface-area cap) ═══
            mode === 'stretch' && h('div', { className: 'bg-gradient-to-br from-amber-900/30 to-slate-900/30 rounded-xl p-3 border border-amber-500/40 space-y-2' },
              h('label', { className: 'flex items-center justify-between cursor-pointer' },
                h('span', { className: 'text-xs font-bold text-amber-200 uppercase tracking-wider' }, t('stem.geosandbox.puzzle_fattest', '🏆 Puzzle: the fattest solid')),
                h('input', { type: 'checkbox', checked: puzzleOn, onChange: function(e) { upd('puzzleOn', e.target.checked); }, 'aria-label': t('stem.geosandbox.puzzle_toggle', 'Turn on the fattest-solid puzzle') })
              ),
              puzzleOn && h('div', { className: 'space-y-1' },
                h('p', { className: 'text-[10.5px] text-amber-200/80' }, t('stem.geosandbox.puzzle_desc', 'Build the solid with the BIGGEST volume whose surface area is ≤ 54 square units. What shape wins?')),
                puzzleEval && h('div', { className: 'text-[11px] font-mono text-amber-100' },
                  t('stem.geosandbox.your_best', 'Your best:') + ' V = ' + (Math.round(puzzleEval.best * 100) / 100) + '  (' + Math.round(puzzleEval.fraction * 100) + '% ' + t('stem.geosandbox.of_optimum', 'of the max') + ')'),
                puzzleEval && puzzleEval.atOptimum
                  ? h('div', { className: 'text-[11px] text-emerald-300 font-bold' }, t('stem.geosandbox.puzzle_win', '🏆 Optimal! A cube is the fattest solid for a given surface area.'))
                  : h('div', { className: 'text-[10px] text-amber-200/60' }, t('stem.geosandbox.puzzle_hint', 'Try a cube: surface 6s² ≤ 54 means s ≤ 3, so a 3×3×3 cube (volume 27) is unbeatable.'))
              )
            ),

            // ═══ NET UNFOLD — flatten a right prism into its printable 2D net ═══
            mode === 'stretch' && (function() {
              var sel = construction.objects.find(function(o) { return o.id === construction.selection; });
              if (!sel || sel.type !== 'prism') return null;
              var net = geoPrismNet(sel);
              var netOpen = !!(gd._geoExt && gd._geoExt._netOpen);
              return h('div', { className: 'bg-slate-900/40 rounded-xl p-3 border border-sky-500/40 space-y-2' },
                h('div', { className: 'flex items-center justify-between' },
                  h('div', { className: 'text-xs font-bold text-sky-200 uppercase tracking-wider' }, t('stem.geosandbox.net_unfold', '📦 Unfold net')),
                  h('button', {
                    onClick: function() { updExt({ _netOpen: !netOpen }); },
                    'aria-expanded': netOpen,
                    'aria-controls': 'geo-stretch-net-panel',
                    disabled: !net,
                    className: 'px-2 py-1 rounded text-[10.5px] font-bold bg-sky-700/70 text-white hover:bg-sky-800 disabled:opacity-60 disabled:cursor-not-allowed'
                  }, netOpen ? t('stem.geosandbox.hide', 'Hide') : t('stem.geosandbox.show', 'Show'))
                ),
                !net && h('p', { className: 'text-[10.5px] text-amber-300/90' }, t('stem.geosandbox.net_oblique', 'Turn off Oblique to unfold this prism — a slanted prism has non-rectangular flaps.')),
                netOpen && net && (function() {
                  var pad = 6, scale = Math.min(240 / net.width, 150 / net.height);
                  var W = net.width * scale + pad * 2, H = net.height * scale + pad * 2;
                  var faceColors = { top: '#38bdf8', bottom: '#0ea5e9', front: '#22d3ee', back: '#06b6d4', left: '#818cf8', right: '#6366f1' };
                  var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W.toFixed(0) + '" height="' + H.toFixed(0) + '" viewBox="0 0 ' + W.toFixed(0) + ' ' + H.toFixed(0) + '">' +
                    net.faces.map(function(f) {
                      var x = (f.x * scale + pad).toFixed(1), y = (f.y * scale + pad).toFixed(1), w = (f.w * scale).toFixed(1), h2 = (f.h * scale).toFixed(1);
                      return '<g><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h2 + '" fill="' + (faceColors[f.label] || '#38bdf8') + '" fill-opacity="0.5" stroke="#0f172a" stroke-width="1.5"/>' +
                        '<text x="' + (f.x * scale + pad + f.w * scale / 2).toFixed(1) + '" y="' + (f.y * scale + pad + f.h * scale / 2).toFixed(1) + '" font-size="9" fill="#0f172a" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif">' + f.label + '</text></g>';
                    }).join('') + '</svg>';
                  return h('div', { id: 'geo-stretch-net-panel', role: 'region', 'aria-label': t('stem.geosandbox.printable_prism_net', 'Printable prism net'), className: 'space-y-2' },
                    h('div', { className: 'bg-white rounded-lg p-2 flex justify-center', dangerouslySetInnerHTML: { __html: svg } }),
                    h('div', { className: 'text-[10px] text-sky-200/80' }, t('stem.geosandbox.net_faces', '6 faces · edges {a}×{b}×{c}')
                      .replace('{a}', net.dims.a.toFixed(1)).replace('{b}', net.dims.b.toFixed(1)).replace('{c}', net.dims.c.toFixed(1))),
                    h('button', {
                      onClick: function() {
                        try {
                          var win = window.open('', '_blank');
                          if (!win) { addToast(t('stem.geosandbox.net_popup', 'Allow pop-ups to print the net.'), 'info'); return; }
                          win.document.write('<!doctype html><title>' + t('stem.geosandbox.net_title', 'Prism net') + '</title><style>body{margin:24px;font-family:sans-serif}svg{width:100%;max-width:640px;height:auto}button{margin-bottom:16px;padding:8px 16px;font-weight:bold}@media print{button{display:none}}</style>' +
                            '<button onclick="window.print()">' + t('common.print', 'Print') + '</button><h3>' + t('stem.geosandbox.net_title', 'Prism net') + '</h3>' + svg.replace('width="' + W.toFixed(0) + '" height="' + H.toFixed(0) + '"', 'width="640"'));
                          win.document.close();
                        } catch (e) {}
                      },
                      className: 'w-full px-2 py-1.5 rounded-lg text-[11px] font-bold bg-sky-700/70 text-white hover:bg-sky-800'
                    }, '🖨 ' + t('stem.geosandbox.net_print', 'Print / cut-out net'))
                  );
                })()
              );
            })(),

            // ═══ SCALE EXPLORER — the square–cube law, live ═══
            mode === 'stretch' && (function() {
              var sel = construction.objects.find(function(o) { return o.id === construction.selection; });
              if (!sel || sel.type === 'point') return null;
              var k = gd.scaleK != null ? gd.scaleK : 2;
              var rep = geoScaleReport(sel, k);
              if (!rep) return null;
              var expText = { 1: '¹', 2: '²', 3: '³' };
              return h('div', { className: 'bg-gradient-to-br from-amber-900/30 to-slate-900/30 rounded-xl p-3 border border-amber-500/40 space-y-2' },
                h('div', { className: 'text-xs font-bold text-amber-200 uppercase tracking-wider' }, t('stem.geosandbox.scale_explorer', '🔎 Scale explorer — square–cube law')),
                h('div', { className: 'flex justify-between items-center' },
                  h('span', { className: 'text-[11px] font-bold text-amber-200' }, t('stem.geosandbox.scale_factor', 'Scale factor k')),
                  h('span', { className: 'text-amber-300 font-mono text-[11px]' }, '×' + k.toFixed(2))
                ),
                h('input', {
                  type: 'range', min: '0.5', max: '3', step: '0.25', value: k,
                  onChange: function(e) { upd('scaleK', parseFloat(e.target.value)); },
                  'aria-label': t('stem.geosandbox.scale_factor', 'Scale factor k'),
                  className: 'w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500'
                }),
                h('div', { className: 'space-y-1' },
                  rep.rows.map(function(row) {
                    return h('div', { key: row.label, className: 'flex items-center justify-between text-[11px] bg-slate-900/40 rounded px-2 py-1' },
                      h('span', { className: 'text-slate-200 font-medium' }, row.label),
                      h('span', { className: 'font-mono text-amber-200' },
                        row.before.toFixed(2) + ' → ' + row.after.toFixed(2) + '  (×k' + (expText[row.exp] || ('^' + row.exp)) + ' = ×' + row.ratio.toFixed(2) + ')')
                    );
                  })
                ),
                sel.type === 'prism' && h('p', { className: 'text-[10px] text-amber-300/80' },
                  t('stem.geosandbox.square_cube_note', 'Double the sides and the volume grows 8×, not 2× — why big animals need thick legs and small ones do not.')
                ),
                h('button', {
                  onClick: function() { placeScaledCopy(k); },
                  'aria-label': t('stem.geosandbox.place_scaled_copy', 'Place a scaled copy beside the original'),
                  className: 'w-full px-2 py-1.5 rounded-lg text-[11px] font-bold bg-amber-700/70 text-white hover:bg-amber-800'
                }, '⧉ ' + t('stem.geosandbox.place_scaled', 'Place ×{k} copy').replace('{k}', k.toFixed(2)))
              );
            })(),

            // ═══ CROSS-SECTION SLICER — a solid is a stack of cross-sections ═══
            mode === 'stretch' && (function() {
              var sel = construction.objects.find(function(o) { return o.id === construction.selection; });
              if (!sel || sel.type !== 'prism') return null;
              var info = geoCrossSectionInfo(sel);
              if (!info) return null;
              var sliceOn = !!gd.sliceOn, sliceT = gd.sliceT != null ? gd.sliceT : 0.5;
              var nSlices = gd.sliceN || 8;
              return h('div', { className: 'bg-gradient-to-br from-yellow-900/30 to-slate-900/30 rounded-xl p-3 border border-yellow-500/40 space-y-2' },
                h('div', { className: 'flex items-center justify-between' },
                  h('div', { className: 'text-xs font-bold text-yellow-200 uppercase tracking-wider' }, t('stem.geosandbox.cross_section', '🍰 Cross-section slicer')),
                  h('button', {
                    onClick: function() { upd('sliceOn', !sliceOn); },
                    'aria-pressed': sliceOn,
                    className: 'px-2 py-1 rounded text-[10.5px] font-bold ' + (sliceOn ? 'bg-yellow-700 text-white' : 'bg-slate-800/70 text-yellow-200 hover:bg-slate-700')
                  }, sliceOn ? t('stem.geosandbox.slicing_on', 'Slicing ✓') : t('stem.geosandbox.slice_show', 'Show slice'))
                ),
                sliceOn && h('div', null,
                  h('div', { className: 'flex justify-between text-[11px] font-bold text-yellow-200 mb-1' },
                    h('span', null, t('stem.geosandbox.slice_height', 'Slice height')),
                    h('span', { className: 'font-mono text-yellow-300' }, Math.round(sliceT * 100) + '%')
                  ),
                  h('input', {
                    type: 'range', min: '0', max: '1', step: '0.02', value: sliceT,
                    onChange: function(e) { upd('sliceT', parseFloat(e.target.value)); },
                    'aria-label': t('stem.geosandbox.slice_height', 'Slice height'),
                    className: 'w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500'
                  })
                ),
                h('div', { className: 'text-[11px] bg-slate-900/40 rounded px-2 py-1.5 space-y-0.5' },
                  h('div', { className: 'flex justify-between' },
                    h('span', { className: 'text-slate-300' }, t('stem.geosandbox.cross_area', 'Cross-section area')),
                    h('span', { className: 'font-mono text-yellow-200' }, info.baseArea.toFixed(2) + ' ' + unitDef.short + '²')
                  ),
                  h('div', { className: 'text-[10px] text-emerald-300/80' }, t('stem.geosandbox.cross_constant', 'Same at every height — that is why volume = area × height (Cavalieri).')),
                  h('div', { className: 'flex justify-between pt-0.5 border-t border-slate-700/60' },
                    h('span', { className: 'text-slate-300 font-mono text-[10px]' }, info.baseArea.toFixed(1) + ' × ' + info.height.toFixed(1) + ' (height)'),
                    h('span', { className: 'font-mono text-yellow-200' }, '= ' + info.volume.toFixed(2) + ' ' + unitDef.short + '³')
                  )
                ),
                sliceOn && h('div', null,
                  h('div', { className: 'flex justify-between text-[10px] text-yellow-200/80 mb-0.5' },
                    h('span', null, t('stem.geosandbox.stack_slices', 'Stack of {n} slices').replace('{n}', String(nSlices))),
                    h('span', { className: 'font-mono' }, '≈ ' + geoStackVolume(sel, nSlices).toFixed(2))
                  ),
                  h('input', {
                    type: 'range', min: '2', max: '40', step: '1', value: nSlices,
                    onChange: function(e) { upd('sliceN', parseInt(e.target.value, 10)); },
                    'aria-label': t('stem.geosandbox.slice_count', 'Number of slices in the stack'),
                    className: 'w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500'
                  }),
                  h('p', { className: 'text-[10px] text-yellow-200/70' }, t('stem.geosandbox.stack_note', 'More slices → the stack of areas adds up to the true volume.'))
                )
              );
            })(),

            // ═══ STRETCH ANALYZER inquiry widget (H7b'') ═══
            mode === 'stretch' && construction.objects.length > 0 && (function() {
              var iq = gd.analyzerIQ || { focus: 'all', viewAngle: 30, edgeStyle: 'colored', detail: 1, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
              function setIQ(patch) { upd('analyzerIQ', Object.assign({}, iq, patch)); }
              function setKey(k, v) { var p = {}; p[k] = v; setIQ(p); }
              var dimOf = { point: 0, segment: 1, rect: 2, prism: 3 };
              var objs = construction.objects;
              var byDim = [0, 0, 0, 0];
              var totalLen = 0, totalArea = 0, totalVol = 0;
              var cx = 0, cy = 0, cz = 0;
              objs.forEach(function(o) {
                var d = dimOf[o.type] != null ? dimOf[o.type] : 0;
                byDim[d]++;
                cx += (o.position && o.position[0]) || 0;
                cy += (o.position && o.position[1]) || 0;
                cz += (o.position && o.position[2]) || 0;
                if (o.type === 'segment' && o.vector) {
                  totalLen += Math.sqrt(o.vector[0]*o.vector[0] + o.vector[1]*o.vector[1] + o.vector[2]*o.vector[2]);
                } else if (o.type === 'rect' && o.u && o.v) {
                  var uLen = Math.sqrt(o.u[0]*o.u[0] + o.u[1]*o.u[1] + o.u[2]*o.u[2]);
                  var vLen = Math.sqrt(o.v[0]*o.v[0] + o.v[1]*o.v[1] + o.v[2]*o.v[2]);
                  totalArea += uLen * vLen;
                } else if (o.type === 'prism' && o.u && o.v && o.w) {
                  var pu = Math.sqrt(o.u[0]*o.u[0] + o.u[1]*o.u[1] + o.u[2]*o.u[2]);
                  var pv = Math.sqrt(o.v[0]*o.v[0] + o.v[1]*o.v[1] + o.v[2]*o.v[2]);
                  var pw = Math.sqrt(o.w[0]*o.w[0] + o.w[1]*o.w[1] + o.w[2]*o.w[2]);
                  totalVol += pu * pv * pw;
                }
              });
              var n = Math.max(1, objs.length);
              var avgDim = (byDim[0]*0 + byDim[1]*1 + byDim[2]*2 + byDim[3]*3) / n;
              cx /= n; cy /= n; cz /= n;
              var state = avgDim < 0.5 ? 'pointcloud' : avgDim < 1.5 ? 'linear' : avgDim < 2.5 ? 'planar' : 'volumetric';
              var sm = ({
                pointcloud: { label: t('stem.geosandbox.point_cloud_0d', 'Point cloud (0D)'), color: '#a78bfa', bg: '#1a0a2e', border: '#7c3aed', desc: t('stem.geosandbox.mostly_points_stretch_any_to_begin_bui', 'Mostly points — stretch any to begin building line segments.') },
                linear: { label: t('stem.geosandbox.linear_1d', 'Linear (1D)'), color: '#22d3ee', bg: '#0a1f2e', border: '#0891b2', desc: t('stem.geosandbox.line_segments_dominate_stretching_them', 'Line segments dominate. Stretching them perpendicular yields planes.') },
                planar: { label: t('stem.geosandbox.planar_2d', 'Planar (2D)'), color: '#facc15', bg: '#2a2410', border: '#eab308', desc: t('stem.geosandbox.rectangles_dominate_stretch_perpendicu', 'Rectangles dominate. Stretch perpendicular to a plane to extrude prisms.') },
                volumetric: { label: t('stem.geosandbox.volumetric_3d', 'Volumetric (3D)'), color: '#4ade80', bg: '#0a2e1a', border: '#16a34a', desc: t('stem.geosandbox.solids_dominate_each_prism_has_interio', 'Solids dominate. Each prism has interior volume and surface boundary.') }
              })[state];
              // SVG isometric projection
              var ang = iq.viewAngle * Math.PI / 180;
              function project(p) {
                var x = p[0], y = p[1], z = p[2];
                var sx = (x - z) * Math.cos(ang) * 22;
                var sy = (y + (x + z) * Math.sin(ang) * 0.5) * -22;
                return [120 + sx, 90 + sy];
              }
              var dimColors = ['#a78bfa', '#22d3ee', '#facc15', '#4ade80'];
              var svgEls = [];
              objs.forEach(function(o, i) {
                var d = dimOf[o.type] != null ? dimOf[o.type] : 0;
                var col = iq.edgeStyle === 'colored' ? dimColors[d] : '#e2e8f0';
                if (iq.focus !== 'all' && iq.focus !== o.type) return;
                if (o.type === 'point') {
                  var p = project(o.position);
                  svgEls.push(h('circle', { key: 'o' + i, cx: p[0], cy: p[1], r: 3, fill: col }));
                } else if (o.type === 'segment') {
                  var a = project(o.position);
                  var b = project([o.position[0] + (o.vector ? o.vector[0] : 0), o.position[1] + (o.vector ? o.vector[1] : 0), o.position[2] + (o.vector ? o.vector[2] : 0)]);
                  svgEls.push(h('line', { key: 'o' + i, x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: col, strokeWidth: 2 }));
                } else if (o.type === 'rect' && o.u && o.v) {
                  var p0 = o.position;
                  var p1 = [p0[0] + o.u[0], p0[1] + o.u[1], p0[2] + o.u[2]];
                  var p2 = [p1[0] + o.v[0], p1[1] + o.v[1], p1[2] + o.v[2]];
                  var p3 = [p0[0] + o.v[0], p0[1] + o.v[1], p0[2] + o.v[2]];
                  var pts = [p0, p1, p2, p3].map(project).map(function(q) { return q[0] + ',' + q[1]; }).join(' ');
                  svgEls.push(h('polygon', { key: 'o' + i, points: pts, fill: col + '33', stroke: col, strokeWidth: 1.5 }));
                } else if (o.type === 'prism' && o.u && o.v && o.w) {
                  var pp = o.position;
                  var corners = [
                    pp,
                    [pp[0]+o.u[0], pp[1]+o.u[1], pp[2]+o.u[2]],
                    [pp[0]+o.u[0]+o.v[0], pp[1]+o.u[1]+o.v[1], pp[2]+o.u[2]+o.v[2]],
                    [pp[0]+o.v[0], pp[1]+o.v[1], pp[2]+o.v[2]],
                    [pp[0]+o.w[0], pp[1]+o.w[1], pp[2]+o.w[2]],
                    [pp[0]+o.u[0]+o.w[0], pp[1]+o.u[1]+o.w[1], pp[2]+o.u[2]+o.w[2]],
                    [pp[0]+o.u[0]+o.v[0]+o.w[0], pp[1]+o.u[1]+o.v[1]+o.w[1], pp[2]+o.u[2]+o.v[2]+o.w[2]],
                    [pp[0]+o.v[0]+o.w[0], pp[1]+o.v[1]+o.w[1], pp[2]+o.v[2]+o.w[2]]
                  ].map(project);
                  var edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
                  edges.forEach(function(e, j) {
                    svgEls.push(h('line', { key: 'o' + i + '-e' + j, x1: corners[e[0]][0], y1: corners[e[0]][1], x2: corners[e[1]][0], y2: corners[e[1]][1], stroke: col, strokeWidth: 1.2, opacity: 0.85 }));
                  });
                }
              });
              var dp = Math.max(1, Math.min(3, iq.detail || 1));   // Detail slider = decimal places
              var metrics = [
                { k: 'count', label: t('stem.geosandbox.objects', 'Objects'), val: objs.length },
                { k: 'dim', label: t('stem.geosandbox.avg_dim', 'Avg dim'), val: avgDim.toFixed(dp) },
                { k: 'len', label: t('stem.geosandbox.length_2', 'Σ length'), val: totalLen.toFixed(dp) },
                { k: 'area', label: t('stem.geosandbox.area', 'Σ area'), val: totalArea.toFixed(dp) },
                { k: 'vol', label: t('stem.geosandbox.volume', 'Σ volume'), val: totalVol.toFixed(dp) }
              ];
              return h('div', { className: 'bg-slate-800/60 backdrop-blur-md rounded-xl p-3 border border-purple-700/40', style: { color: '#e8f0f5' } },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider mb-1', style: { color: sm.color } }, t('stem.geosandbox.stretch_analyzer_inquiry_widget', '📐 Stretch Analyzer — Inquiry Widget')),
                h('div', { className: 'text-[10px] opacity-80 mb-2' }, t('stem.geosandbox.predict_geometry_properties_as_you_str', 'Predict geometry properties as you stretch. No answer key — you mark your own understanding.')),
                h('div', { className: 'inline-block px-2 py-1 rounded-full text-[10px] font-bold mb-2', style: { background: sm.color, color: '#000' } }, sm.label),
                h('div', { className: 'text-[10px] opacity-80 mb-2' }, sm.desc),
                h('div', { className: 'grid grid-cols-5 gap-1 mb-2' },
                  metrics.map(function(m) {
                    return h('div', { key: m.k, className: 'text-center p-1 rounded', style: { background: '#0a0a1a', border: '1px solid ' + sm.border } },
                      h('div', { className: 'text-[8px] uppercase tracking-wide opacity-70' }, m.label),
                      h('div', { className: 'text-[11px] font-bold', style: { color: sm.color } }, m.val)
                    );
                  })
                ),
                h('div', { className: 'grid grid-cols-4 gap-1 mb-2' },
                  ['point', 'segment', 'rect', 'prism'].map(function(t, di) {
                    return h('div', { key: t, className: 'text-center p-1 rounded text-[9px]', style: { background: byDim[di] ? '#0a0a1a' : '#0f172a', border: '1px solid ' + (byDim[di] ? dimColors[di] : '#94a3b8'), color: byDim[di] ? dimColors[di] : '#cbd5e1' } },
                      di + 'D · ' + byDim[di]
                    );
                  })
                ),
                h('svg', { width: '100%', height: 180, viewBox: '0 0 240 180', role: 'img', 'aria-label': t('stem.geosandbox.analyzer_plot_aria', 'Top-down plot of construction objects around their centroid'), style: { background: '#0a0a1a', borderRadius: 6, marginBottom: 8 } },
                  h('line', { x1: 0, y1: 90, x2: 240, y2: 90, stroke: '#1e293b', strokeDasharray: '2 4' }),
                  h('line', { x1: 120, y1: 0, x2: 120, y2: 180, stroke: '#1e293b', strokeDasharray: '2 4' }),
                  svgEls,
                  h('text', { x: 8, y: 14, fill: '#64748b', fontSize: 9 }, 'centroid (' + cx.toFixed(1) + ', ' + cy.toFixed(1) + ', ' + cz.toFixed(1) + ')'),
                  h('text', { x: 8, y: 172, fill: '#64748b', fontSize: 9 }, 'view ' + iq.viewAngle + '°  · focus ' + iq.focus)
                ),
                h('div', { className: 'grid grid-cols-2 gap-2 mb-2' },
                  h('label', { className: 'text-[10px]' },
                    h('div', { className: 'flex justify-between mb-0.5' }, h('span', null, t('stem.geosandbox.view_angle', 'View angle')), h('span', { style: { color: sm.color, fontFamily: 'monospace', fontWeight: 700 } }, iq.viewAngle + '°')),
                    h('input', { type: 'range', min: 0, max: 60, step: 5, value: iq.viewAngle, onChange: function(e) { setKey('viewAngle', parseInt(e.target.value, 10)); }, 'aria-label': t('stem.geosandbox.view_angle_aria', 'Analyzer view angle'), className: 'w-full' })
                  ),
                  h('label', { className: 'text-[10px]' },
                    h('div', { className: 'flex justify-between mb-0.5' }, h('span', null, t('stem.geosandbox.detail_level', 'Detail (decimals)')), h('span', { style: { color: sm.color, fontFamily: 'monospace', fontWeight: 700 } }, iq.detail)),
                    h('input', { type: 'range', min: 1, max: 3, step: 1, value: iq.detail, onChange: function(e) { setKey('detail', parseInt(e.target.value, 10)); }, 'aria-label': t('stem.geosandbox.detail_decimals_aria', 'Decimal places shown in the analyzer metrics'), className: 'w-full' })
                  ),
                  h('label', { className: 'text-[10px]' },
                    h('div', { className: 'mb-0.5' }, t('stem.geosandbox.focus_on_type', 'Focus on type')),
                    h('select', { value: iq.focus, onChange: function(e) { setKey('focus', e.target.value); }, className: 'w-full p-1 rounded bg-slate-900 border border-purple-700/40 text-[10px]', style: { color: '#e8f0f5' } },
                      ['all', 'point', 'segment', 'rect', 'prism'].map(function(t) { return h('option', { key: t, value: t }, t); })
                    )
                  ),
                  h('label', { className: 'text-[10px]' },
                    h('div', { className: 'mb-0.5' }, t('stem.geosandbox.edge_style', 'Edge style')),
                    h('select', { value: iq.edgeStyle, onChange: function(e) { setKey('edgeStyle', e.target.value); }, className: 'w-full p-1 rounded bg-slate-900 border border-purple-700/40 text-[10px]', style: { color: '#e8f0f5' } },
                      [['colored', 'colored by dimension'], ['plain', 'plain white']].map(function(o) { return h('option', { key: o[0], value: o[0] }, o[1]); })
                    )
                  )
                ),
                h('div', { className: 'flex gap-2 mb-2' },
                  h('button', { onClick: function() {
                    var t = new Date().toISOString().slice(11, 19);
                    setIQ({ log: iq.log.concat([{ t: t, n: objs.length, dim: avgDim.toFixed(2), len: totalLen.toFixed(2), area: totalArea.toFixed(2), vol: totalVol.toFixed(2) }]) });
                  }, className: 'flex-1 px-2 py-1 rounded text-[10px] font-bold', style: { background: sm.bg, color: sm.color, border: '1px solid ' + sm.border, cursor: 'pointer' } }, t('stem.geosandbox.log_snapshot', '📋 Log snapshot')),
                  h('button', { onClick: function() { setIQ({ log: [] }); }, className: 'px-2 py-1 rounded text-[10px]', style: { background: '#0a0a1a', color: '#94a3b8', border: '1px solid #1e293b', cursor: 'pointer' } }, t('stem.geosandbox.clear_log', 'Clear log'))
                ),
                iq.log.length > 0 && h('div', { className: 'mb-2 p-1.5 rounded text-[9px] font-mono', style: { background: '#0a0a1a', maxHeight: 70, overflow: 'auto', border: '1px solid #1e293b' } },
                  iq.log.slice(-5).map(function(e, i) { return h('div', { key: i }, e.t + '  n=' + e.n + ' d=' + e.dim + ' L=' + e.len + ' A=' + e.area + ' V=' + e.vol); })
                ),
                h('label', { className: 'block text-[10px] font-bold opacity-85 mb-1' }, t('stem.geosandbox.your_hypothesis_what_stretches_grow_le', 'Your hypothesis (what stretches grow length faster — area faster — volume faster?)')),
                h('textarea', { value: iq.hypothesis, onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, rows: 2, 'aria-label': t('stem.geosandbox.your_hypothesis', 'Your geometry scaling hypothesis'), placeholder: t('stem.geosandbox.e_g_stretching_a_segment_perpendicular', 'e.g., stretching a segment perpendicular doubles area but volume needs a second stretch...'), className: 'w-full p-1.5 rounded text-[10px] mb-2', style: { background: '#0a0a1a', border: '1px solid ' + sm.border, color: '#e8f0f5', resize: 'vertical' } }),
                !iq.stuckRevealed && h('button', { onClick: function() { setIQ({ stuckRevealed: true }); }, className: 'px-2 py-1 rounded text-[10px] font-bold mb-2', style: { background: '#0a0a1a', color: sm.color, border: '1px solid #1e293b', cursor: 'pointer' } }, t('stem.geosandbox.i_m_stuck_show_open_questions', "🤔 I'm stuck — show open questions")),
                iq.stuckRevealed && h('div', { className: 'p-2 rounded text-[10px] mb-2', style: { background: '#0a0a1a', border: '1px dashed ' + sm.border, lineHeight: 1.5 } },
                  h('div', { className: 'font-bold mb-1', style: { color: sm.color } }, t('stem.geosandbox.open_questions_no_answer_key', 'Open questions (no answer key)')),
                  h('ul', { className: 'pl-4 m-0' },
                    h('li', null, t('stem.geosandbox.when_you_stretch_a_segment_perpendicul', 'When you stretch a segment perpendicular to itself, what happens to its dimension count?')),
                    h('li', null, t('stem.geosandbox.if_centroid_shifts_after_a_stretch_wha', 'If centroid shifts after a stretch, what direction did you stretch most?')),
                    h('li', null, t('stem.geosandbox.how_does_total_volume_change_vs_total_', 'How does total volume change vs total area as you stretch the same axis twice?')),
                    h('li', null, t('stem.geosandbox.what_would_make_this_construction_symm', 'What would make this construction symmetric about its centroid?'))
                  )
                ),
                h('label', { className: 'flex items-center gap-2 text-[10px] font-bold cursor-pointer mb-1' },
                  h('input', { type: 'checkbox', checked: iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); } }),
                  h('span', null, t('stem.geosandbox.i_can_explain_why_these_metrics_scale_', 'I can explain why these metrics scale the way they do as I stretch.'))
                ),
                iq.understood && h('textarea', { value: iq.explanation, onChange: function(e) { setIQ({ explanation: e.target.value }); }, rows: 2, 'aria-label': t('stem.geosandbox.scaling_explanation', 'Explain geometry scaling in your own words'), placeholder: t('stem.geosandbox.explain_in_your_own_words', 'Explain in your own words...'), className: 'w-full p-1.5 rounded text-[10px] mb-1', style: { background: '#0a0a1a', border: '1px solid ' + sm.border, color: '#e8f0f5', resize: 'vertical' } }),
                h('p', { className: 'm-0 text-[9px] italic opacity-60' }, t('stem.geosandbox.inquiry_widget_no_score_no_reveal_no_a', 'Inquiry widget — no score, no reveal, no answer dump.'))
              );
            })(),

            // Property sliders (single-shape mode only)
            mode === 'single' && h('div', { className: 'bg-slate-800/60 backdrop-blur-md rounded-xl p-3 border border-slate-700/50' },
              h('div', { className: 'text-xs font-bold text-slate-300 uppercase tracking-wider mb-2' }, t('stem.geosandbox.properties', 'Properties')),
              currentSliders.map(function(sl) {
                var sliderMax = shape === 'torus' && sl.key === 'tube' ? Math.min(sl.max, Math.max(sl.min, dims.r - 0.1)) : sl.max;
                return h('div', { key: sl.key, className: 'mb-2' },
                  h('div', { className: 'flex justify-between text-[11px] text-slate-300 mb-0.5' },
                    h('span', { title: getDimTooltip(shape, sl.key), style: { cursor: getDimTooltip(shape, sl.key) ? 'help' : 'default', borderBottom: getDimTooltip(shape, sl.key) ? '1px dotted #64748b' : 'none' } }, sl.label),
                    h('span', { className: 'text-sky-400 font-mono' }, (dims[sl.key] || sl.min).toFixed(sl.step < 1 ? 1 : 0))
                  ),
                  h('input', {
                    type: 'range',
                    min: sl.min,
                    max: sliderMax,
                    step: sl.step,
                    value: dims[sl.key] || sl.min,
                    onChange: function(e) { updDim(sl.key, e.target.value); },
                    'aria-label': sl.label + ' slider',
                    className: 'w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500'
                  })
                );
              }),
              shape === 'torus' && h('p', { className: 'text-[10px] text-sky-300/70 -mt-1 mb-2' }, t('stem.geosandbox.torus_radius_constraint', 'Tube radius stays smaller than the major radius so the torus does not self-intersect.')),
              // Color picker
              h('div', { className: 'mt-3' },
                h('div', { className: 'text-[11px] text-slate-300 mb-1' }, t('stem.geosandbox.color', 'Color')),
                h('div', { className: 'flex gap-1.5 flex-wrap' },
                  colorPalette.map(function(c) {
                    return h('button', { key: c,
                      onClick: function() { upd('color', c); },
                      'aria-label': t('stem.geosandbox.choose_shape_color', 'Choose shape color') + ': ' + colorNames[c],
                      'aria-pressed': shapeColor === c,
                      style: { backgroundColor: c },
                      className: 'w-7 h-7 rounded-full transition-all border-2 ' +
                        (shapeColor === c ? 'border-white scale-110 shadow-lg' : 'border-slate-200/80 hover:scale-105 opacity-100')
                    });
                  })
                )
              ),
              // Wireframe toggle
              h('div', { className: 'flex items-center gap-2 mt-3' },
                h('button', { role: 'switch', 'aria-checked': wireframe, 'aria-label': t('stem.geosandbox.wireframe', 'Wireframe'),
                  onClick: toggleWireframe,
                  title: t('stem.geosandbox.toggle_wireframe_w', 'Toggle wireframe [W]'),
                  className: 'w-10 h-6 rounded-full transition-all relative ' + (wireframe ? 'bg-sky-500' : 'bg-slate-600')
                },
                  h('div', {
                    'aria-hidden': 'true',
                    className: 'w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all',
                    style: { left: wireframe ? 18 : 2 }
                  })
                ),
                h('span', { className: 'text-[11px] text-slate-300' }, t('stem.geosandbox.wireframe_2', 'Wireframe'))
              ),
              // Opacity slider
              h('div', { className: 'mt-2' },
                h('div', { className: 'flex justify-between text-[11px] text-slate-300 mb-0.5' },
                  h('span', null, t('stem.geosandbox.opacity', 'Opacity')),
                  h('span', { className: 'text-sky-400 font-mono' }, Math.round(opacity * 100) + '%')
                ),
                h('input', {
                  type: 'range', min: 0.1, max: 1, step: 0.05,
                  value: opacity,
                  onChange: function(e) { upd('opacity', parseFloat(e.target.value)); },
                  'aria-label': t('stem.geosandbox.shape_opacity', 'Shape opacity'),
                  className: 'w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500'
                })
              )
            ),

            // ── v2: Real-world unit + save/load shared between modes ──
            h('div', { className: 'bg-slate-800/60 backdrop-blur-md rounded-xl p-3 border border-slate-700/50 space-y-2' },
              h('div', { className: 'text-xs font-bold text-slate-300 uppercase tracking-wider' }, t('stem.geosandbox.tools', '🛠 Tools')),
              h('div', { className: 'flex items-center gap-1' },
                h('label', { className: 'text-[11px] text-slate-300 font-bold mr-1' }, 'Units:'),
                h('select', {
                  value: unitId,
                  onChange: function(e) { upd('unitId', e.target.value); if (announceToSR) announceToSR('Unit changed to ' + e.target.options[e.target.selectedIndex].text); },
                  'aria-label': t('stem.geosandbox.real_world_unit', 'Real-world unit'),
                  className: 'flex-1 text-[11px] bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono'
                }, GEO_UNITS.map(function(u) {
                  return h('option', { key: u.id, value: u.id }, u.short + ' — ' + u.long);
                }))
              ),
              (mode === 'stretch' || mode === 'sculpt') && h('label', { className: 'flex items-center gap-2 text-[11px] font-bold text-slate-200 cursor-pointer' },
                h('input', {
                  type: 'checkbox',
                  checked: showSceneLabels,
                  onChange: function(e) {
                    upd('showSceneLabels', e.target.checked);
                    if (announceToSR) announceToSR(e.target.checked ? 'Scene labels on' : 'Scene labels off');
                  },
                  'aria-label': t('stem.geosandbox.scene_labels', 'Scene labels')
                }),
                h('span', null, t('stem.geosandbox.scene_labels', 'Scene labels'))
              ),
              mode === 'stretch' && h('div', { className: 'flex gap-1' },
                h('button', {
                  onClick: function() {
                    setSaveName('Build ' + new Date().toLocaleDateString());
                    setSaveOpen(true);
                  },
                  disabled: !construction.objects.length,
                  className: 'flex-1 px-2 py-1 rounded text-[11px] font-bold ' +
                    (construction.objects.length ? 'bg-blue-700 text-white hover:bg-blue-800' : 'bg-slate-700 text-slate-500 cursor-not-allowed')
                }, t('stem.geosandbox.save', '💾 Save')),
                h('button', {
                  onClick: function() { upd('showSaved', !showSaved); },
                  className: 'flex-1 px-2 py-1 rounded text-[11px] font-bold bg-indigo-700 text-white hover:bg-indigo-800'
                }, '📂 Load (' + Object.keys(savedConstructions).length + ')')
              ),
              mode === 'stretch' && saveOpen && h('form', {
                onSubmit: function(e) { e.preventDefault(); if (!String(saveName || '').trim()) return; saveConstruction(saveName); setSaveOpen(false); setSaveName(''); },
                onKeyDown: function(e) { if (e.key === 'Escape') { e.preventDefault(); setSaveOpen(false); setSaveName(''); } },
                className: 'border border-blue-500/50 bg-blue-950/50 rounded p-2 space-y-1.5'
              },
                h('label', { htmlFor: 'geo-save-name', className: 'block text-[11px] font-bold text-blue-100' }, t('stem.geosandbox.construction_name', 'Construction name')),
                h('input', { ref: saveNameRef, id: 'geo-save-name', type: 'text', maxLength: 40, value: saveName, onChange: function(e) { setSaveName(e.target.value); }, className: 'w-full px-2 py-1 rounded bg-slate-950 border border-blue-400/60 text-[11px] text-white' }),
                h('div', { className: 'flex gap-1' },
                  h('button', { type: 'submit', disabled: !String(saveName || '').trim(), className: 'px-2 py-1 rounded bg-blue-700 text-white text-[10px] font-bold disabled:opacity-50' }, t('stem.geosandbox.save_named_construction', 'Save construction')),
                  h('button', { type: 'button', onClick: function() { setSaveOpen(false); setSaveName(''); }, className: 'px-2 py-1 rounded bg-slate-700 text-white text-[10px] font-bold' }, t('common.cancel', 'Cancel'))
                )
              ),
              mode === 'stretch' && showSaved && h('div', { className: 'border-t border-slate-700 pt-2 space-y-1 max-h-40 overflow-y-auto' },
                Object.keys(savedConstructions).length === 0
                  ? h('p', { className: 'text-[11px] text-slate-500 italic' }, t('stem.geosandbox.no_saved_constructions_yet', 'No saved constructions yet.'))
                  : Object.keys(savedConstructions).map(function(name) {
                      var snap = savedConstructions[name];
                      return h('div', { key: 'sv-' + name, className: 'flex flex-wrap items-center gap-1 bg-slate-900/60 rounded p-1' },
                        h('span', { className: 'text-[11px] text-slate-200 flex-1 truncate', title: name }, name),
                        h('span', { className: 'text-[10px] text-slate-400 font-mono' }, (snap.objects || []).length + ' objs'),
                        h('button', {
                          onClick: function() { loadConstruction(name); },
                          className: 'px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-700 text-white hover:bg-indigo-800'
                        }, t('stem.geosandbox.load', 'Load')),
                        h('button', {
                          onClick: function() { setDeletePending(name); },
                          'aria-label': t('stem.geosandbox.delete_saved_construction', 'Delete saved construction') + ' ' + name,
                          className: 'px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-700 text-white hover:bg-rose-800'
                        }, '×'),
                        deletePending === name && h('div', {
                          role: 'alertdialog', 'aria-modal': 'false',
                          'aria-label': t('stem.geosandbox.confirm_delete', 'Confirm deletion'),
                          onKeyDown: function(e) { if (e.key === 'Escape') { e.preventDefault(); setDeletePending(null); } },
                          className: 'basis-full mt-1 p-2 rounded border border-rose-400/70 bg-rose-950 text-[10px] text-rose-100'
                        },
                          h('p', { className: 'mb-1.5' }, t('stem.geosandbox.delete_saved_prompt', 'Delete this saved construction?') + ' "' + name + '"'),
                          h('div', { className: 'flex gap-1' },
                            h('button', { onClick: function() { deleteConstruction(name); setDeletePending(null); }, className: 'px-2 py-1 rounded bg-rose-700 text-white font-bold' }, t('common.delete', 'Delete')),
                            h('button', { ref: deleteCancelRef, onClick: function() { setDeletePending(null); }, className: 'px-2 py-1 rounded bg-slate-700 text-white font-bold' }, t('common.cancel', 'Cancel'))
                          )
                        )
                      );
                    })
              )
            ),

            // Measurements (hidden during challenge mode AND stretch mode — stretch has its own readouts in the object list)
            !gd.challengeMode && mode === 'single' && h('div', { className: 'bg-slate-800/60 backdrop-blur-md rounded-xl p-3 border border-slate-700/50' },
              h('div', { className: 'flex justify-between items-center mb-2' },
                h('div', { className: 'text-xs font-bold text-slate-300 uppercase tracking-wider' }, t('stem.geosandbox.measurements', '\uD83D\uDCCF Measurements')),
                h('button', {
                  onClick: function() { upd('showMath', !showMath); },
                  'aria-pressed': showMath,
                  className: 'text-[10px] font-bold px-2 py-0.5 rounded transition-all ' + (showMath ? 'bg-emerald-700 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600')
                }, showMath ? t('stem.geosandbox.hide_math', '\uD83E\uDDEE Hide the math') : t('stem.geosandbox.show_math', '\uD83E\uDDEE Show the math'))
              ),
              h('div', { className: 'space-y-1.5' },
                // Volume with formula (+ substituted steps when "show the math" is on)
                h('div', null,
                  h('div', { className: 'flex justify-between text-xs' },
                    h('span', { className: 'text-slate-300' }, t('stem.geosandbox.volume_2', 'Volume')),
                    h('span', { className: 'text-emerald-400 font-mono font-bold' }, m.vol.toFixed(2) + ' u\u00B3')
                  ),
                  h('div', { className: 'text-[11px] text-emerald-500/70 font-mono mt-0.5' }, steps.vol.formula),
                  showMath && h('div', { className: 'text-[11px] text-emerald-300 font-mono mt-0.5 pl-2 border-l-2 border-emerald-500/40' },
                    steps.vol.sub + ' = ' + m.vol.toFixed(2))
                ),
                // Surface Area with formula
                h('div', null,
                  h('div', { className: 'flex justify-between text-xs' },
                    h('span', { className: 'text-slate-300' }, t('stem.geosandbox.surface_area', 'Surface Area')),
                    h('span', { className: 'text-sky-400 font-mono font-bold' }, m.sa.toFixed(2) + ' u\u00B2')
                  ),
                  h('div', { className: 'text-[11px] text-sky-500/70 font-mono mt-0.5' }, steps.sa.formula),
                  showMath && h('div', { className: 'text-[11px] text-sky-300 font-mono mt-0.5 pl-2 border-l-2 border-sky-500/40' },
                    steps.sa.sub + ' = ' + m.sa.toFixed(2))
                ),
                h('div', { className: 'flex justify-between text-xs' },
                  h('span', { className: 'text-slate-300' }, t('stem.geosandbox.faces', 'Faces')),
                  h('span', { className: 'text-amber-400 font-mono font-bold' }, m.faces)
                ),
                h('div', { className: 'flex justify-between text-xs' },
                  h('span', { className: 'text-slate-300' }, t('stem.geosandbox.edges', 'Edges')),
                  h('span', { className: 'text-purple-400 font-mono font-bold' }, m.edges)
                ),
                h('div', { className: 'flex justify-between text-xs' },
                  h('span', { className: 'text-slate-300' }, t('stem.geosandbox.vertices', 'Vertices')),
                  h('span', { className: 'text-rose-400 font-mono font-bold' }, m.vertices)
                ),
                // Euler's formula (for shapes with faces)
                ['box','pyramid','prism'].indexOf(shape) >= 0 && h('div', { className: 'flex justify-between text-xs mt-1.5 pt-1.5 border-t border-slate-700/50' },
                  h('span', { className: 'text-slate-300', title: t('stem.geosandbox.euler_s_polyhedron_formula_for_any_con', 'Euler\'s polyhedron formula: for any convex polyhedron, V \u2212 E + F = 2') }, t('stem.geosandbox.euler_s_formula', "Euler's Formula")),
                  h('span', { className: 'text-cyan-400 font-mono font-bold' },
                    m.vertices + ' \u2212 ' + m.edges + ' + ' + m.faces + ' = ' + (m.vertices - m.edges + m.faces),
                    (m.vertices - m.edges + m.faces) === 2 ? ' \u2713' : ''
                  )
                ),
                m.note && h('div', { className: 'text-[11px] text-slate-200 italic mt-1' }, m.note)
              )
            ),

            // ═══ CROSS-SECTION EXPLORER (single mode) — slice the shape, see the 2D
            //     face + its area; a cone reveals the conic sections. ═══
            !gd.challengeMode && mode === 'single' && h('div', { className: 'bg-gradient-to-br from-yellow-900/30 to-slate-900/40 rounded-xl p-3 border border-yellow-500/40' },
              h('div', { className: 'flex justify-between items-center' },
                h('div', { className: 'text-xs font-bold text-yellow-200 uppercase tracking-wider' }, t('stem.geosandbox.cross_section', '🔪 Cross-section')),
                h('button', {
                  onClick: function() { upd('xsOn', !xsOn); },
                  'aria-pressed': xsOn,
                  className: 'text-[10px] font-bold px-2 py-0.5 rounded transition-all ' + (xsOn ? 'bg-yellow-700 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600')
                }, xsOn ? t('stem.geosandbox.hide', 'Hide') : t('stem.geosandbox.show', 'Show'))
              ),
              xsOn && h('div', { className: 'space-y-2 mt-2' },
                h('p', { className: 'text-[10.5px] text-yellow-200/70' }, t('stem.geosandbox.xs_intro', 'Slide the cut up and down. A solid is a stack of these slices — that is why volume = cross-section area × height.')),
                h('div', { className: 'flex justify-between text-[11px] font-bold text-yellow-200' },
                  h('span', null, t('stem.geosandbox.cut_height', 'Cut height')),
                  h('span', { className: 'font-mono text-yellow-300' }, Math.round(xsT * 100) + '%')
                ),
                h('input', {
                  type: 'range', min: '0', max: '1', step: '0.02', value: xsT,
                  onChange: function(e) { upd('xsT', parseFloat(e.target.value)); },
                  'aria-label': t('stem.geosandbox.cut_height_aria', 'Cross-section cut height'),
                  className: 'w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500'
                }),
                // 2D cross-section drawing + readout
                (function() {
                  var svgSize = 96, cx = svgSize / 2, cy = svgSize / 2, pad = 10;
                  var maxDim = Math.max(dims.w || 3, dims.d || 3, (dims.r || 1.5) * 2, (dims.rTop || 1.5) * 2, (dims.rBot || 1.5) * 2, ((dims.r || 1.5) + (dims.tube || 0.5)) * 2, 1);
                  var sc = (svgSize - 2 * pad) / maxDim;
                  var kids = [];
                  if (xs.name === 'Circle') kids.push(h('circle', { key: 'c', cx: cx, cy: cy, r: Math.max(0.5, (xs.r || 0) * sc), fill: '#facc1533', stroke: '#facc15', strokeWidth: 1.5 }));
                  else if (xs.name === 'Ring (annulus)') { kids.push(h('circle', { key: 'o', cx: cx, cy: cy, r: Math.max(0.5, (xs.rOuter || 0) * sc), fill: '#facc1533', stroke: '#facc15', strokeWidth: 1.5 })); kids.push(h('circle', { key: 'i', cx: cx, cy: cy, r: Math.max(0, (xs.rInner || 0) * sc), fill: '#0f172a', stroke: '#facc15', strokeWidth: 1 })); }
                  else { var ww = (xs.w || 1) * sc, dd = (xs.d || 1) * sc; kids.push(h('rect', { key: 'r', x: cx - ww / 2, y: cy - dd / 2, width: Math.max(1, ww), height: Math.max(1, dd), fill: '#facc1533', stroke: '#facc15', strokeWidth: 1.5 })); }
                  return h('div', { className: 'flex items-center gap-3' },
                    h('svg', { width: svgSize, height: svgSize, viewBox: '0 0 ' + svgSize + ' ' + svgSize, role: 'img', 'aria-label': xs.name + ' cross-section with area ' + xs.area.toFixed(2) + ' square units', className: 'bg-slate-950/50 rounded border border-slate-700 flex-none' }, kids),
                    h('div', { className: 'text-[11px] text-yellow-100 space-y-0.5' },
                      h('div', { className: 'font-bold' }, xs.name),
                      xs.r != null && h('div', { className: 'font-mono text-[10.5px]' }, 'r = ' + xs.r.toFixed(2)),
                      xs.rOuter != null && h('div', { className: 'font-mono text-[10.5px]' }, 'R±: ' + xs.rInner.toFixed(2) + '–' + xs.rOuter.toFixed(2)),
                      (xs.w != null && xs.name !== 'Circle') && h('div', { className: 'font-mono text-[10.5px]' }, xs.w.toFixed(2) + ' × ' + (xs.d || 0).toFixed(2)),
                      h('div', { className: 'font-mono text-emerald-300' }, t('stem.geosandbox.xs_area', 'area') + ' = ' + xs.area.toFixed(2) + ' u²')
                    )
                  );
                })(),
                // Conic sections — cone only
                conic && h('div', { className: 'border-t border-yellow-500/30 pt-2 space-y-1' },
                  h('div', { className: 'text-[11px] font-bold text-orange-200' }, t('stem.geosandbox.conic_sections', '🍦 Conic sections (tilt the cut)')),
                  h('div', { className: 'flex justify-between text-[11px] text-orange-200' },
                    h('span', null, t('stem.geosandbox.tilt', 'Tilt')),
                    h('span', { className: 'font-mono text-orange-300' }, Math.round(conic.beta) + '°')
                  ),
                  h('input', {
                    type: 'range', min: '0', max: '85', step: '1', value: conicTilt,
                    onChange: function(e) { upd('conicTilt', parseFloat(e.target.value)); },
                    'aria-label': t('stem.geosandbox.conic_tilt_aria', 'Conic section cutting-plane tilt'),
                    className: 'w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500'
                  }),
                  h('div', { className: 'text-[12px] font-bold text-orange-100' }, conic.name),
                  h('div', { className: 'text-[10px] text-orange-200/70' }, conic.note)
                )
              )
            ),

            // \u2550\u2550\u2550 NET UNFOLD + REAL-WORLD SIZE (single mode) \u2550\u2550\u2550
            !gd.challengeMode && mode === 'single' && h('div', { className: 'bg-gradient-to-br from-sky-900/30 to-slate-900/40 rounded-xl p-3 border border-sky-500/40 space-y-2' },
              h('div', { className: 'flex justify-between items-center' },
                h('div', { className: 'text-xs font-bold text-sky-200 uppercase tracking-wider' }, t('stem.geosandbox.unfold_net_single', '\uD83D\uDCE6 Unfold net')),
                shapeNet.unfoldable && h('button', {
                  onClick: function() { upd('singleNetOpen', !netOpen); },
                  'aria-expanded': netOpen,
                  'aria-controls': 'geo-single-net-panel',
                  className: 'text-[10px] font-bold px-2 py-0.5 rounded transition-all ' + (netOpen ? 'bg-sky-700 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600')
                }, netOpen ? t('stem.geosandbox.hide', 'Hide') : t('stem.geosandbox.show', 'Show'))
              ),
              !shapeNet.unfoldable && h('p', { className: 'text-[11px] text-sky-200/70 italic' }, shapeNet.note),
              shapeNet.unfoldable && netOpen && h('div', { id: 'geo-single-net-panel', role: 'region', 'aria-label': t('stem.geosandbox.shape_net_details', 'Shape net details'), className: 'space-y-1.5' },
                h('p', { className: 'text-[10.5px] text-sky-200/70' }, shapeNet.note),
                h('div', { className: 'flex flex-wrap gap-1.5' },
                  shapeNet.pieces.map(function(pc, i) {
                    // Scaled swatch for each flat piece + its label/area.
                    var box = 42, pad = 5, mx = 6;   // draw within a 42px box
                    for (var j = 0; j < shapeNet.pieces.length; j++) { var q = shapeNet.pieces[j]; mx = Math.max(mx, q.w || 0, q.h || 0, (q.r || 0) * 2, q.rOuter || 0, q.b || 0); }
                    var sc = (box - 2 * pad) / mx, kid;
                    if (pc.kind === 'circle') kid = h('circle', { cx: box / 2, cy: box / 2, r: Math.max(1, pc.r * sc), fill: '#38bdf833', stroke: '#38bdf8', strokeWidth: 1 });
                    else if (pc.kind === 'tri') { var b = pc.b * sc, hh = pc.h * sc, x0 = box / 2 - b / 2, yb = box / 2 + hh / 2; kid = h('polygon', { points: x0 + ',' + yb + ' ' + (x0 + b) + ',' + yb + ' ' + (box / 2) + ',' + (yb - hh), fill: '#38bdf833', stroke: '#38bdf8', strokeWidth: 1 }); }
                    else if (pc.kind === 'sector') { kid = h('path', { d: (function() { var R = Math.min(box / 2 - pad, pc.r * sc), a = Math.min(pc.angle, 2 * Math.PI - 0.001), x1 = box / 2 + R, y1 = box / 2, x2 = box / 2 + R * Math.cos(a), y2 = box / 2 + R * Math.sin(a), large = a > Math.PI ? 1 : 0; return 'M' + (box / 2) + ',' + (box / 2) + ' L' + x1 + ',' + y1 + ' A' + R + ',' + R + ' 0 ' + large + ' 1 ' + x2 + ',' + y2 + ' Z'; })(), fill: '#38bdf833', stroke: '#38bdf8', strokeWidth: 1 }); }
                    else if (pc.kind === 'annularSector') { kid = h('path', { d: (function() { var R = Math.min(box / 2 - pad, pc.rOuter * sc), rr = Math.max(0, Math.min(R - 1, pc.rInner * sc)), a = Math.min(pc.angle, 2 * Math.PI - 0.001), cx0 = box / 2, cy0 = box / 2, x1 = cx0 + R, y1 = cy0, x2 = cx0 + R * Math.cos(a), y2 = cy0 + R * Math.sin(a), ix2 = cx0 + rr * Math.cos(a), iy2 = cy0 + rr * Math.sin(a), ix1 = cx0 + rr, iy1 = cy0, large = a > Math.PI ? 1 : 0; return 'M' + x1 + ',' + y1 + ' A' + R + ',' + R + ' 0 ' + large + ' 1 ' + x2 + ',' + y2 + ' L' + ix2 + ',' + iy2 + ' A' + rr + ',' + rr + ' 0 ' + large + ' 0 ' + ix1 + ',' + iy1 + ' Z'; })(), fill: '#38bdf833', stroke: '#38bdf8', strokeWidth: 1 }); }
                    else { var pw = Math.min(box - 2 * pad, (pc.w || 1) * sc), ph = Math.min(box - 2 * pad, (pc.h || 1) * sc); kid = h('rect', { x: box / 2 - pw / 2, y: box / 2 - ph / 2, width: Math.max(1, pw), height: Math.max(1, ph), fill: '#38bdf833', stroke: '#38bdf8', strokeWidth: 1 }); }
                    return h('div', { key: 'net-' + i, className: 'text-center' },
                      h('svg', { width: box, height: box, viewBox: '0 0 ' + box + ' ' + box, role: 'img', 'aria-label': pc.label + ', area ' + pc.area.toFixed(1) + ' square units', className: 'bg-slate-950/50 rounded border border-slate-700' }, kid),
                      h('div', { className: 'text-[8.5px] text-sky-300/80 leading-tight mt-0.5' }, pc.label),
                      h('div', { className: 'text-[8px] text-slate-400 font-mono' }, pc.area.toFixed(1) + ' u\u00B2')
                    );
                  })
                ),
                h('div', { className: 'text-[10px] text-sky-300/70 font-mono' }, t('stem.geosandbox.faces_sum', '\u03A3 pieces') + ' = ' + shapeNet.pieces.reduce(function(s, p) { return s + p.area; }, 0).toFixed(1) + ' u\u00B2 \u2248 ' + t('stem.geosandbox.surface_area', 'Surface Area'))
              ),
              // Real-world size anchor
              h('div', { className: 'border-t border-sky-500/30 pt-2' },
                h('div', { className: 'text-[11px] text-sky-100' }, '\uD83C\uDF0D ' + t('stem.geosandbox.real_world_size', 'Real-world size') + ' (' + t('stem.geosandbox.if_one_unit', '1 unit = 10 cm') + ')'),
                h('div', { className: 'text-[11px] text-sky-200 font-mono' }, '\u2248 ' + realScale.litres.toFixed(1) + ' L  \u00B7  ' + Math.round(realScale.cups) + ' ' + t('stem.geosandbox.cups', 'cups')),
                h('div', { className: 'text-[10px] text-sky-300/70' }, '\u2014 ' + realScale.phrase)
              )
            ),

            // Streak indicator
            (ext.streak || 0) >= 2 && h('div', { className: 'bg-gradient-to-r from-orange-900/40 to-amber-900/30 rounded-xl p-2 border border-orange-500/30 text-center' },
              h('span', { className: 'text-xs font-bold text-orange-300' }, '\uD83D\uDD25 Streak: ' + ext.streak + ' in a row!')
            )
          ),

          // === THREE.JS VIEWPORT ===
          h('div', { id: 'geo-viewport-shell', className: 'flex-1 bg-slate-900/60 backdrop-blur-md rounded-xl border border-slate-700/50 overflow-hidden relative', style: { minHeight: '400px' } },
            webglError
              ? h('div', { className: 'flex flex-col items-center justify-center p-6 text-center gap-4 w-full h-full absolute inset-0 bg-slate-950/90 text-slate-200' },
                  h('span', { className: 'text-4xl' }, '⚠️'),
                  h('span', { className: 'text-base font-bold text-red-400' }, t('stem.geosandbox.webgl_is_disabled_or_unsupported', 'WebGL is disabled or unsupported')),
                  h('span', { className: 'text-sm text-slate-400 max-w-md' }, t('stem.geosandbox.alloflow_requires_hardware_acceleratio', 'AlloFlow requires hardware acceleration to display 3D graphics. Please enable WebGL in your browser settings to interact with this lab.')),
                  h('button', {
                    onClick: function() { selectShape(shape); },
                    className: 'px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all'
                  }, t('stem.geosandbox.retry', 'Retry'))
                )
              : h('canvas', {
                  id: 'geo-sandbox-canvas',
                  role: 'application',
                  'aria-label': t('stem.geosandbox.interactive_geometry_sandbox_3d_visual', 'Interactive geometry sandbox 3D visualization'),
                  'aria-describedby': 'geo-sandbox-canvas-description',
                  'aria-keyshortcuts': 'ArrowUp ArrowDown ArrowLeft ArrowRight + - [ ] Delete', tabIndex: 0,
                  onKeyDown: function(e) {
                    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','+','=','-','_'].indexOf(e.key) < 0) return;
                    var gs = window._geoScene; if (!gs || !gs.camera || !window.THREE) return;
                    e.preventDefault(); e.stopPropagation();
                    var target = gs.controls && gs.controls.target ? gs.controls.target : new window.THREE.Vector3(0, 0, 0);
                    var offset = gs.camera.position.clone().sub(target);
                    var spherical = new window.THREE.Spherical().setFromVector3(offset);
                    if (e.key === 'ArrowLeft') spherical.theta -= 0.12;
                    else if (e.key === 'ArrowRight') spherical.theta += 0.12;
                    else if (e.key === 'ArrowUp') spherical.phi -= 0.12;
                    else if (e.key === 'ArrowDown') spherical.phi += 0.12;
                    else if (e.key === '+' || e.key === '=') spherical.radius = Math.max(2, spherical.radius * 0.9);
                    else spherical.radius = Math.min(30, spherical.radius * 1.1);
                    spherical.makeSafe(); offset.setFromSpherical(spherical);
                    gs.camera.position.copy(target).add(offset); gs.camera.lookAt(target);
                    if (gs.controls) gs.controls.update();
                  },
                  className: 'w-full h-full',
                  style: { display: 'block', width: '100%', height: '100%', minHeight: '400px' }
                }),
            h('div', { id: 'geo-sandbox-canvas-description', className: 'sr-only' }, canvasDescription + ' Keyboard: arrow keys orbit the camera; plus and minus zoom. In stretch mode, left and right brackets change selection and Delete removes the selected object.'),
            // Fullscreen toggle (top-right) — fills the frame with controls +
            // canvas via the shared __alloStemFS helper (real OS fullscreen
            // where the host iframe allows it, else a CSS fill-frame fallback
            // that also works inside sandboxed iframes like Gemini Canvas).
            h('button', {
              'aria-label': t('stem.geosandbox.toggle_fullscreen', 'Toggle fullscreen'),
              title: t('stem.geosandbox.fullscreen', 'Fullscreen'),
              onClick: function(ev) {
                ev.stopPropagation();
                var fsEl = document.getElementById('geo-fullscreen-container');
                if (!fsEl) return;
                var inReal = document.fullscreenElement === fsEl || document.webkitFullscreenElement === fsEl || document.mozFullScreenElement === fsEl;
                if (inReal) { var ex = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen; if (ex) { try { ex.call(document); } catch (e) {} } }
                else if (window.__alloStemFS) window.__alloStemFS(fsEl);
              },
              className: 'absolute top-2 right-2 z-20',
              style: { width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(167,139,250,0.55)', color: '#c4b5fd', fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }
            }, '⛶'),
            // Controls hint overlay
            h('div', { className: 'absolute bottom-2 right-2 text-[11px] text-slate-300 bg-slate-900/80 px-2 py-1 rounded-md' },
              h('span', { className: 'geo-hint-desktop' }, t('stem.geosandbox.drag_rotate_scroll_zoom_right_click_pa', '\uD83D\uDDB1\uFE0F Drag: rotate \u2022 Scroll: zoom \u2022 Right-click: pan')),
              h('span', { className: 'geo-hint-touch' }, t('stem.geosandbox.touch_controls_hint', 'Drag: rotate \u2022 Pinch: zoom \u2022 Two fingers: pan'))
            ),
            // Shape name overlay (single mode) \u2014 or construction summary (stretch mode)
            h('div', { className: 'absolute top-2 left-2 text-xs font-bold text-sky-300 bg-slate-900/80 px-2 py-1 rounded-md' },
              mode === 'stretch'
                ? '\uD83D\uDCD0 ' + construction.objects.length + ' object' + (construction.objects.length === 1 ? '' : 's') + ' in scene'
                : m.name
            ),
            // \u2500\u2500 v2: Floating measurement label for the selected stretch object \u2500\u2500
            // Acts as the "label on the geometry" \u2014 when you select a point/segment/rect/prism
            // its dimensions appear here in a glowing pill. Replaces a true 3D-projected
            // label (which would require additional Three.js setup) with a viewport-anchored
            // panel that shows the same information accessibly.
            mode === 'stretch' && construction.selection && (function() {
              var sel = construction.objects.find(function(o) { return o.id === construction.selection; });
              if (!sel) return null;
              var lines = [];
              if (sel.type === 'point') {
                lines.push('\u2299 Point #' + sel.id);
                lines.push('Position: (' + sel.position.map(function(c) { return c.toFixed(1); }).join(', ') + ')');
                lines.push('Dimension: 0D');
              } else if (sel.type === 'segment') {
                lines.push('\u23AF Segment #' + sel.id);
                lines.push('Length: ' + objectVolume(sel).toFixed(2) + ' ' + unitDef.short);
                lines.push('Dimension: 1D');
              } else if (sel.type === 'rect') {
                lines.push('\u25AD Rectangle #' + sel.id);
                var uLen = Math.sqrt(sel.u[0]*sel.u[0] + sel.u[1]*sel.u[1] + sel.u[2]*sel.u[2]);
                var vLen = Math.sqrt(sel.v[0]*sel.v[0] + sel.v[1]*sel.v[1] + sel.v[2]*sel.v[2]);
                lines.push('Sides: ' + uLen.toFixed(2) + ' \u00D7 ' + vLen.toFixed(2) + ' ' + unitDef.short);
                lines.push('Area: ' + objectVolume(sel).toFixed(2) + ' ' + unitDef.short + '\u00B2');
                lines.push('Dimension: 2D');
              } else if (sel.type === 'prism') {
                lines.push('\u2B1B Prism #' + sel.id);
                var uLen2 = Math.sqrt(sel.u[0]*sel.u[0] + sel.u[1]*sel.u[1] + sel.u[2]*sel.u[2]);
                var vLen2 = Math.sqrt(sel.v[0]*sel.v[0] + sel.v[1]*sel.v[1] + sel.v[2]*sel.v[2]);
                var wLen = Math.sqrt(sel.w[0]*sel.w[0] + sel.w[1]*sel.w[1] + sel.w[2]*sel.w[2]);
                lines.push('Edges: ' + uLen2.toFixed(2) + ' \u00D7 ' + vLen2.toFixed(2) + ' \u00D7 ' + wLen.toFixed(2) + ' ' + unitDef.short);
                lines.push('Volume: ' + objectVolume(sel).toFixed(2) + ' ' + unitDef.short + '\u00B3');
                lines.push('Dimension: 3D');
              }
              return h('div', {
                className: 'absolute top-12 left-2 text-[11px] text-fuchsia-100 bg-purple-900/90 backdrop-blur-md px-3 py-2 rounded-lg border border-fuchsia-400/40 shadow-lg shadow-fuchsia-600/20',
                style: { maxWidth: '240px' },
                role: 'status',
                'aria-live': 'polite'
              },
                lines.map(function(line, i) {
                  return h('div', { key: i, className: i === 0 ? 'font-bold text-fuchsia-200 mb-1' : 'font-mono text-fuchsia-100/90' }, line);
                })
              );
            })(),
            // Keyboard shortcuts overlay
            h('div', { className: 'absolute top-2 right-2 text-[11px] text-slate-300 bg-slate-900/80 px-2 py-1 rounded-md leading-relaxed' },
              mode === 'single'
                ? '1-7: shapes \u2022 C: challenge \u2022 W: wireframe \u2022 E: export \u2022 B: badges \u2022 M: mode \u2022 /: AI'
                : 'M: mode \u2022 U: undo \u2022 B: badges \u2022 /: AI'
            )
          )
        ),

        // Coach panel
        h('div', { className: 'bg-gradient-to-r from-sky-900/30 to-blue-900/30 backdrop-blur-md rounded-xl p-3 border border-sky-700/30' },
          h('div', { className: 'flex items-start gap-3' },
            h('div', { className: 'text-2xl flex-shrink-0' }, '\uD83D\uDCD0'),
            h('div', null,
              h('div', { className: 'text-sm font-bold text-sky-200 mb-1' }, ct.title),
              h('div', { className: 'text-xs text-slate-200 mb-1' }, ct.tip),
              h('div', { className: 'text-[11px] text-slate-300 italic' }, '\uD83C\uDF0D ' + ct.example)
            )
          )
        ),

        // === CHALLENGE MODE PANEL ===
        gd.challengeMode && challenge && h('div', { 'aria-labelledby': 'geo-challenge-title', className: 'bg-gradient-to-br from-amber-900/80 to-orange-900/60 backdrop-blur-md rounded-xl border-2 border-amber-500/60 p-4 space-y-3 shadow-lg shadow-amber-900/30' },
          // Challenge header with score
          h('div', { className: 'flex items-center justify-between' },
            h('h3', { id: 'geo-challenge-title', className: 'text-base font-black text-amber-200 flex items-center gap-2' }, t('stem.geosandbox.geometry_challenge', '\uD83C\uDFAF Geometry Challenge')),
            h('div', { className: 'flex items-center gap-3' },
              h('span', { className: 'text-xs font-bold text-emerald-400' }, '\u2705 ' + challengeScore.correct),
              h('span', { className: 'text-xs text-slate-300' }, '/'),
              h('span', { className: 'text-xs font-bold text-slate-300' }, challengeScore.total + ' attempted'),
              challengeScore.total > 0 && h('span', { className: 'text-[11px] font-bold px-2 py-0.5 rounded-full ' + (challengeScore.correct/challengeScore.total >= 0.8 ? 'bg-emerald-500/30 text-emerald-300' : challengeScore.correct/challengeScore.total >= 0.5 ? 'bg-amber-500/30 text-amber-300' : 'bg-red-500/30 text-red-300') }, Math.round(challengeScore.correct/challengeScore.total*100) + '%')
            )
          ),
          // Shape info + question
          h('div', { className: 'bg-slate-800/80 rounded-lg p-3 space-y-2 border border-slate-600/50' },
            h('div', { className: 'flex items-center gap-2' },
              h('span', { className: 'text-xs font-bold text-sky-400 bg-sky-500/20 px-2 py-0.5 rounded-full' }, challenge.shapeName),
              h('span', { className: 'text-xs text-slate-300 font-mono' }, challenge.dimDesc)
            ),
            h('p', { className: 'text-base font-black text-white' }, challenge.question + (challenge.unit ? ' (' + challenge.unit + ')' : ''))
          ),
          // Answer input + check button
          !challengeResult && h('div', { className: 'flex gap-2' },
            h('input', {
              id: 'geo-challenge-answer',
              type: challenge.type === 'identify' ? 'text' : 'number',
              value: challengeAnswer,
              onChange: function(e) { upd('challengeAnswer', e.target.value); },
              onKeyDown: function(e) { if (e.key === 'Enter') checkChallengeAnswer(); },
              placeholder: challenge.type === 'identify' ? 'Type the shape name...' : 'Enter your answer...',
              'aria-label': t('stem.geosandbox.challenge_answer', 'Challenge answer'),
              className: 'flex-1 px-4 py-3 bg-slate-900 border-2 border-amber-500/40 rounded-xl text-base text-white font-bold placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30',
              step: 'any'
            }),
            h('button', { 'aria-label': t('stem.geosandbox.check', 'Check'),
              onClick: checkChallengeAnswer,
              disabled: !challengeAnswer.trim(),
              className: 'px-4 py-2 rounded-lg text-xs font-bold transition-all ' + (challengeAnswer.trim() ? 'bg-gradient-to-r from-amber-700 to-orange-800 text-white shadow-md hover:from-amber-800 hover:to-orange-900' : 'bg-slate-700 text-slate-300 cursor-not-allowed')
            }, t('stem.geosandbox.check_2', '\u2714 Check'))
          ),
          // Result feedback
          challengeResult && h('div', { role: 'group', 'aria-label': t('stem.geosandbox.challenge_result', 'Challenge result'), className: 'space-y-2' },
            h('div', { className: 'flex items-center gap-2 p-3 rounded-lg ' + (challengeResult === 'correct' ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-red-500/20 border border-red-500/30') },
              h('span', { className: 'text-lg' }, challengeResult === 'correct' ? '\u2705' : '\u274C'),
              h('div', null,
                h('div', { className: 'text-sm font-bold ' + (challengeResult === 'correct' ? 'text-emerald-300' : 'text-red-300') }, challengeResult === 'correct' ? 'Correct! +5 XP' : 'Not quite!'),
                challengeResult !== 'correct' && h('div', { className: 'text-xs text-slate-200 mt-0.5' }, t('stem.geosandbox.the_correct_answer_is', 'The correct answer is: '),
                  h('span', { className: 'font-bold text-amber-300 font-mono' }, geoFormatChallengeAnswer(challenge)),
                  challenge.unit ? ' ' + challenge.unit : ''
                )
              )
            ),
            h('button', { 'aria-label': t('stem.geosandbox.next_challenge', 'Next Challenge'),
              onClick: generateChallenge,
              className: 'w-full px-4 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-700 to-orange-800 text-white shadow-md hover:from-amber-800 hover:to-orange-900 transition-all'
            }, t('stem.geosandbox.next_challenge_2', '\u27A1 Next Challenge'))
          ),
          // Hint for numeric challenges
          !challengeResult && ['volume','surfaceArea','lateralArea'].indexOf(challenge.type) >= 0 && h('div', { className: 'text-xs text-amber-200/70 italic bg-amber-900/20 rounded-lg p-2' },
            t('stem.geosandbox.tip_your_answer_must_be_within_5_of_th', '\uD83D\uDCA1 Tip: Your answer must be within 5% of the exact value. Use \u03C0 \u2248 3.14159')
          )
        ),

        // STL note
        h('div', { className: 'text-[11px] text-slate-300 text-center' },
          t('stem.geosandbox.stl_files_are_unit_less_most_3d_printe', '\uD83D\uDCA1 STL files are unit-less. Most 3D printer slicers (Cura, PrusaSlicer) default to millimeters. A shape with width=5 will print as 5mm wide.')
        )
      );
      })();
    }
  });
})();
