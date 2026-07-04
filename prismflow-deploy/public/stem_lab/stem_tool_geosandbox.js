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


  // ── Three.js loader (shared with archStudio in monolith, self-contained here) ──
  function ensureThreeJS(onReady, onError) {
    if (window.THREE) { onReady(); return; }
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    s.async = true;
    s.onload = function() {
      var s2 = document.createElement('script');
      s2.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
      s2.async = true;
      s2.onload = function() { onReady(); };
      s2.onerror = function() { console.warn('[GeoSandbox] OrbitControls failed, proceeding without'); onReady(); };
      document.head.appendChild(s2);
    };
    s.onerror = function() { console.error('[GeoSandbox] Three.js failed to load'); if (onError) onError(); };
    document.head.appendChild(s);
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
    // Animate
    var animId;
    var animate = function() {
      // While an immersive session drives frames, the HEADSET owns the camera —
      // skip OrbitControls + the bloom composer (mono) and just render stereo. The
      // XR compositor schedules the frames, so no window rAF is queued here.
      var presenting = false; try { presenting = renderer.xr && renderer.xr.isPresenting; } catch (e) {}
      if (presenting) { _xrGrabFrame(); renderer.render(scene, camera); return; }
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
            // Trigger = talk to the model: start voice capture (routes to the
            // sculpt/stretch voice handler for the current mode). Speech mid-session
            // is device-dependent; if it never fires this is simply inert.
            ctrl.addEventListener('selectstart', function () { _geoHaptic(0.5, 40); try { if (window._geoVoiceTrigger) window._geoVoiceTrigger(); } catch (e) {} });
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
      case 'pyramid': geometry = new THREE.ConeGeometry(dims.r || 1.5, dims.h || 3, 4); break;
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
    if (window._geoScene) {
      cancelAnimationFrame((window._geoScene.renderer && window._geoScene.renderer._geoAnimId) || window._geoScene.animId);
      // End any live VR session and stop the XR frame loop before disposing the GL.
      try { var _r = window._geoScene.renderer; if (_r && _r.xr) { var _s = _r.xr.getSession && _r.xr.getSession(); if (_s) _s.end(); _r.setAnimationLoop(null); } } catch(e){}
      try{ if(window._geoScene.renderer && window._geoScene.renderer._alloComposer){ (window._geoScene.renderer._alloComposer.passes||[]).forEach(function(p){if(p&&p.dispose)p.dispose();}); window._geoScene.renderer._alloComposer=null; } }catch(e){}
      try { if (window._geoScene.sculptGroup) { window._geoScene.sculptGroup.traverse(function(o){ if(o.geometry&&o.geometry.dispose)o.geometry.dispose(); if(o.material&&o.material.dispose)o.material.dispose(); }); } } catch(e){}
      if (window._geoScene.renderer) window._geoScene.renderer.dispose();
      if (window._geoScene.controls) window._geoScene.controls.dispose();
      window._geoScene = null;
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
    geoMaster:       { icon: '\uD83C\uDF1F', name: 'Geo Master',          desc: 'Score 80%+ on 10+ challenges' }
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

  // ── STL Export ──
  function exportSTL(shape, addToast) {
    if (!window._geoScene || !window._geoScene.mesh || !window.THREE) return;
    var THREE = window.THREE;
    var mesh = window._geoScene.mesh;
    var geo = mesh.geometry.clone();
    geo.applyMatrix4(mesh.matrixWorld);
    var pos = geo.attributes.position;
    var idx = geo.index;
    var triCount = idx ? idx.count / 3 : pos.count / 3;
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
    a.click();
    URL.revokeObjectURL(url);
    if (typeof addToast === 'function') addToast('\uD83D\uDCE6 STL exported \u2014 ready for 3D printing!', 'success');
  }

  // ── Shape palette config ──
  var shapes = [
    { id: 'box', icon: '\u{1F7E6}', label: 'Cube', key: '1' },
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
      { key: 'r', label: 'Base Size', min: 0.5, max: 5, step: 0.1 },
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
  function stretchSegment(seg, axis, length) {
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
    return { type: 'rect', position: seg.position.slice(), u: seg.vector.slice(), v: vec3Scale(perp, length) };
  }
  function stretchRect(rect, axis, length) {
    // For a rect, w is the perpendicular of the plane defined by u, v.
    var u = rect.u, v = rect.v;
    // Cross product u × v gives a normal
    var nx = u[1] * v[2] - u[2] * v[1];
    var ny = u[2] * v[0] - u[0] * v[2];
    var nz = u[0] * v[1] - u[1] * v[0];
    var nLen = Math.sqrt(nx*nx + ny*ny + nz*nz);
    var normal = nLen > 0 ? [nx/nLen, ny/nLen, nz/nLen] : [0, 0, 1];
    return { type: 'prism', position: rect.position.slice(), u: u.slice(), v: v.slice(), w: vec3Scale(normal, length) };
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
    return 0;
  }

  // Render construction objects into a Three.js scene group, returns the group.
  function buildConstructionGroup(THREE, objects, selectedId) {
    var group = new THREE.Group();
    if (!objects) return group;
    objects.forEach(function(o) {
      var isSel = (o.id === selectedId);
      var color = isSel ? 0xfbbf24 : (o.type === 'point' ? 0xef4444 : o.type === 'segment' ? 0x22c55e : o.type === 'rect' ? 0x3b82f6 : 0xa78bfa);
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
      }
      if (mesh) {
        mesh.userData.objId = o.id;
        mesh.userData.objType = o.type;
        group.add(mesh);
      }
    });
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
      var __alloT = ctx.t || function (k, fb) { return fb != null ? fb : k; };
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var addToast = ctx.addToast;
      var awardXP = ctx.awardXP;
      var t = ctx.t;
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
          nd[key] = parseFloat(val);
          // Track dimension adjustments for badge
          var ext = Object.assign({}, g._geoExt || {});
          ext.dimAdjusts = (ext.dimAdjusts || 0) + 1;
          return Object.assign({}, prev, { geoSandbox: Object.assign({}, g, { dims: nd, _geoExt: ext }) });
        });
        // Debounced SR announcement so we do not spam during rapid drags
        if (announceToSR) {
          if (window._geoSrTimer) clearTimeout(window._geoSrTimer);
          window._geoSrTimer = setTimeout(function() {
            var newMeas = calcMeasurements(shape, Object.assign({}, dims, (function() { var o = {}; o[key] = parseFloat(val); return o; })()));
            announceToSR(key + ' set to ' + parseFloat(val).toFixed(1) + '. Volume ' + newMeas.vol.toFixed(2) + ', surface area ' + newMeas.sa.toFixed(2) + '.');
          }, 350);
        }
      };

      var shape = gd.shape || 'box';
      var dims = gd.dims || { w: 3, h: 3, d: 3, r: 1.5, rTop: 1.5, rBot: 1.5, tube: 0.5, segs: 32 };
      var shapeColor = gd.color || '#60a5fa';
      var wireframe = gd.wireframe || false;
      var opacity = gd.opacity != null ? gd.opacity : 1;

      // v2 additions ─────────────────────────────────────────────
      var mode = gd.mode || 'single'; // 'single' | 'stretch' | 'sculpt'
      var construction = gd.construction || { objects: [], selection: null };
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
      var unitId = gd.unitId || 'unit';
      var unitDef = GEO_UNITS.find(function(u) { return u.id === unitId; }) || GEO_UNITS[0];
      var stretchAxis = gd.stretchAxis || 'x';
      var stretchLength = gd.stretchLength != null ? gd.stretchLength : 2;

      function pushHistory() {
        var snap = JSON.parse(JSON.stringify(construction));
        var next = history.concat([snap]);
        if (next.length > 30) next = next.slice(next.length - 30);
        setLabToolData(function(prev) {
          var g = prev.geoSandbox || {};
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
      function performStretch(axisOverride) {
        var ax = (axisOverride === 'x' || axisOverride === 'y' || axisOverride === 'z') ? axisOverride : stretchAxis;
        var sel = construction.objects.find(function(o) { return o.id === construction.selection; });
        if (!sel) { addToast('Select an object first', 'error'); return; }
        var newObj;
        if (sel.type === 'point')        newObj = stretchPoint(sel, ax, stretchLength);
        else if (sel.type === 'segment') newObj = stretchSegment(sel, ax, stretchLength);
        else if (sel.type === 'rect')    newObj = stretchRect(sel, ax, stretchLength);
        else { addToast('Cannot stretch a solid further in this dimension', 'info'); return; }
        pushHistory();
        newObj.id = nextObjId(construction.objects);
        var newObjs = construction.objects.concat([newObj]);
        setLabToolData(function(p) {
          var g = p.geoSandbox || {};
          return Object.assign({}, p, { geoSandbox: Object.assign({}, g, { construction: { objects: newObjs, selection: newObj.id } }) });
        });
        geoSound('shapeChange');
        var nextLabel = newObj.type === 'segment' ? 'segment (line)' : newObj.type === 'rect' ? 'rectangle (plane)' : 'prism (solid)';
        if (announceToSR) announceToSR('Stretched to ' + nextLabel + '. Now ' + newObjs.length + ' objects in construction.');
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
      function saveConstruction(name) {
        if (!name) return;
        var trimmed = String(name).trim().slice(0, 40);
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
        setLabToolData(function(p) {
          var g = p.geoSandbox || {};
          return Object.assign({}, p, { geoSandbox: Object.assign({}, g, { construction: { objects: snap.objects || [], selection: snap.selection || null } }) });
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
      }

      // ── Extended state (badges, streaks, AI) ──
      var ext = gd._geoExt || {};
      var showBadges = ext.showBadges || false;
      var aiResponse = ext.aiResponse || '';
      var aiLoading = ext.aiLoading || false;
      var showAI = ext.showAI || false;

      var updExt = function(obj) {
        setLabToolData(function(prev) {
          var g = prev.geoSandbox || {};
          return Object.assign({}, prev, { geoSandbox: Object.assign({}, g, { _geoExt: Object.assign({}, g._geoExt || {}, obj) }) });
        });
      };

      // ── Measurements ──
      var m = calcMeasurements(shape, dims);
      var fm = formulaMap[shape] || formulaMap.box;

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
      };

      var checkChallengeAnswer = function() {
        if (!challenge || !challengeAnswer.trim()) return;
        var ua = challengeAnswer.trim();
        var correct = false;
        if (challenge.type === 'identify') {
          var la = ua.toLowerCase(), ca = challenge.answer.toLowerCase();
          correct = la===ca || ca.indexOf(la)>=0 || la.indexOf(ca.split(' ')[0])>=0;
        } else if (['faces','edges','vertices','eulerCheck'].indexOf(challenge.type)>=0) {
          correct = parseInt(ua) === challenge.answer;
        } else {
          var num = parseFloat(ua);
          if (!isNaN(num) && challenge.answer!==0) correct = Math.abs(num-challenge.answer)/Math.abs(challenge.answer)<=0.05;
          else if (challenge.answer===0) correct = num===0;
        }
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
      };

      // ── AI Tutor ──
      var askAI = function() {
        if (aiLoading) return;
        updExt({ aiLoading: true, aiResponse: '', showAI: true });
        var meas = calcMeasurements(shape, dims);
        var prompt = 'You are a friendly geometry tutor for a student exploring 3D shapes. ' +
          'The student is looking at a ' + meas.name + ' with these measurements: ' +
          'Volume = ' + meas.vol.toFixed(2) + ' cubic units, Surface Area = ' + meas.sa.toFixed(2) + ' square units. ' +
          (meas.faces > 0 ? 'It has ' + meas.faces + ' faces, ' + meas.edges + ' edges, and ' + meas.vertices + ' vertices. ' : '') +
          'Give a brief, engaging explanation of this shape: what makes it unique, a real-world application, ' +
          'and one fun math fact. Keep it under 120 words. Use simple language for a middle-school student.';
        if (typeof ctx.callGemini === 'function') {
          ctx.callGemini(prompt, false, false, 0.7).then(function(resp) {
            updExt({ aiResponse: resp || 'No response received.', aiLoading: false });
          }).catch(function() {
            updExt({ aiResponse: 'AI tutor is unavailable right now.', aiLoading: false });
          });
        } else {
          updExt({ aiResponse: 'AI tutor requires Gemini API.', aiLoading: false });
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
        exportSTL(shape, addToast);
        setLabToolData(function(prev) {
          var g = prev.geoSandbox || {};
          var exObj = Object.assign({}, g._geoExt || {});
          exObj.usedExport = true;
          var updates = checkGeoBadges(exObj, {}, awardXP, addToast);
          return Object.assign({}, prev, { geoSandbox: Object.assign({}, g, { _geoExt: Object.assign(exObj, updates) }) });
        });
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
      }, [mode, shape, dims, shapeColor, wireframe, showBadges, construction.selection, history.length]);

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
        var _clearSculpt = function() { if (window._geoScene.sculptGroup) { window._geoScene.scene.remove(window._geoScene.sculptGroup); try { window._geoScene.sculptGroup.traverse(function(o){ if(o.geometry&&o.geometry.dispose)o.geometry.dispose(); if(o.material&&o.material.dispose)o.material.dispose(); }); } catch(e){} window._geoScene.sculptGroup = null; } };
        var _clearConstruction = function() { if (window._geoScene.constructionGroup) { window._geoScene.scene.remove(window._geoScene.constructionGroup); window._geoScene.constructionGroup = null; } };
        var _clearMesh = function() { if (window._geoScene.mesh) { window._geoScene.scene.remove(window._geoScene.mesh); window._geoScene.mesh.traverse(function(o) { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); window._geoScene.mesh = null; } };
        if (mode === 'single') {
          _clearConstruction(); _clearSculpt();
          updateMesh(window._geoScene, shape, dims, shapeColor, wireframe, opacity);
        } else if (mode === 'sculpt') {
          _clearMesh(); _clearConstruction(); _clearSculpt();
          var P3D = window.AlloModules && window.AlloModules.Prim3D;
          if (!P3D) { ensurePrim3d(function(ok) { if (ok) setPrim3dReady(true); }); }
          else if (sculptRecipe) {
            try {
              var sg = P3D.buildObject(window.THREE, sculptRecipe, { unit: 2.6 });   // ~2.5 units tall on the grid
              if (sg) { sg.position.y = 0; sg.traverse(function(o){ if(o.isMesh){ o.castShadow = true; } }); window._geoScene.sculptGroup = sg; window._geoScene.scene.add(sg); }
            } catch (e) {}
          }
        } else {
          // Stretch mode
          _clearMesh(); _clearSculpt();
          if (window._geoScene.constructionGroup) { window._geoScene.scene.remove(window._geoScene.constructionGroup); }
          window._geoScene.constructionGroup = buildConstructionGroup(window.THREE, construction.objects, construction.selection);
          window._geoScene.scene.add(window._geoScene.constructionGroup);
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
      }, [shape, dims, shapeColor, wireframe, opacity, theme, mode, JSON.stringify(construction), JSON.stringify(sculptRecipe), prim3dReady]);

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
      var ct = coachTips[shape] || coachTips.box;
      var badgeCount = Object.keys(ext.badges || {}).length;

      // ── Loading state ──
      if (!labToolData._threeLoaded) {
        return h('div', { className: 'flex flex-col items-center justify-center gap-4 p-12 animate-pulse' },
          h('div', { 'aria-live': 'polite', 'aria-atomic': 'true', style: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' } }, gd._srMsg || ''),
          h('div', { className: 'text-5xl' }, '\uD83D\uDD37'),
          h('div', { className: 'text-slate-200 text-lg' }, t('stem.geosandbox.loading_3d_engine', 'Loading 3D engine...'))
        );
      }

      // ══════════════════════════
      // ═══ RENDER ═══
      // ══════════════════════════
      return h('div', { className: 'flex flex-col gap-3 animate-in fade-in duration-300' },

        // Header row
        h('div', { className: 'flex items-center justify-between gap-3 flex-wrap' },
          h('h2', { className: 'text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500 flex items-center gap-2' },
            t('stem.geosandbox.geometry_sandbox', '\uD83D\uDD37 Geometry Sandbox')
          ),
          // \u2500\u2500 v2: Mode toggle (Single shape \u2194 Dimensional stretch) \u2500\u2500
          h('div', { className: 'flex items-center gap-1 bg-slate-800/60 rounded-full p-1 border border-slate-700', role: 'tablist', 'aria-label': t('stem.geosandbox.geometry_mode', 'Geometry mode') },
            h('button', {
              role: 'tab',
              'aria-selected': mode === 'single',
              onClick: function() {
                upd('mode', 'single');
                if (announceToSR) announceToSR('Single shape mode');
              },
              className: 'px-3 py-1 rounded-full text-[11px] font-bold transition-all ' +
                (mode === 'single' ? 'bg-sky-600 text-white shadow' : 'text-slate-300 hover:text-slate-100')
            }, t('stem.geosandbox.single_shape', '\uD83D\uDCE6 Single shape')),
            h('button', {
              role: 'tab',
              'aria-selected': mode === 'stretch',
              onClick: function() {
                upd('mode', 'stretch');
                if (announceToSR) announceToSR('Dimensional stretch mode. Place a point and stretch it into higher dimensions.');
              },
              title: t('stem.geosandbox.handwaver_inspired_build_by_stretching', 'HandWaver-inspired: build by stretching point \u2192 line \u2192 plane \u2192 solid'),
              className: 'px-3 py-1 rounded-full text-[11px] font-bold transition-all ' +
                (mode === 'stretch' ? 'bg-purple-600 text-white shadow' : 'text-slate-300 hover:text-slate-100')
            }, t('stem.geosandbox.stretch_mode', '\uD83D\uDCD0 Stretch mode')),
            h('button', {
              role: 'tab',
              'aria-selected': mode === 'sculpt',
              onClick: function() {
                if (!(window.AlloModules && window.AlloModules.Prim3D)) ensurePrim3d(function(ok) { if (ok) setPrim3dReady(true); });
                upd('mode', 'sculpt');
                if (announceToSR) announceToSR('AI sculpt mode. Describe an object and the AI builds it from primitive shapes.');
              },
              title: t('stem.geosandbox.sculpt_mode_title', 'AI Sculpt: describe an object, the AI builds it from primitives \u2014 then refine it'),
              className: 'px-3 py-1 rounded-full text-[11px] font-bold transition-all ' +
                (mode === 'sculpt' ? 'bg-fuchsia-600 text-white shadow' : 'text-slate-300 hover:text-slate-100')
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
            }, t('stem.geosandbox.open_immersive', '🌐 Immersive Lab')),
            h('button', { 'aria-label': t('stem.geosandbox.challenge', 'Challenge'),
              onClick: generateChallenge,
              title: t('stem.geosandbox.challenge_mode_c', 'Challenge Mode [C]'),
              className: 'px-3 py-1.5 text-xs font-bold transition-all rounded-full flex items-center gap-1 ' + (gd.challengeMode ? 'text-white bg-gradient-to-r from-amber-600 to-orange-700 shadow-md shadow-amber-600/20 hover:from-amber-700 hover:to-orange-800' : 'text-amber-900 bg-amber-500/20 border border-amber-500/30 hover:bg-amber-500/30')
            }, t('stem.geosandbox.challenge_2', '\uD83C\uDFAF Challenge')),
            gd.challengeMode && h('button', { 'aria-label': t('stem.geosandbox.exit', 'Exit'),
              onClick: function() { setLabToolData(function(prev) { return Object.assign({}, prev, { geoSandbox: Object.assign({}, prev.geoSandbox||{}, { challengeMode:false, challenge:null, challengeAnswer:'', challengeResult:null }) }); }); },
              className: 'px-3 py-1.5 text-xs font-bold text-slate-200 bg-slate-700/60 rounded-full hover:bg-slate-600 transition-all'
            }, t('stem.geosandbox.exit_2', '\u2716 Exit')),
            h('button', { 'aria-label': t('stem.geosandbox.badges_b', 'Badges [B]'),
              onClick: function() { updExt({ showBadges: !showBadges }); },
              title: t('stem.geosandbox.badges_b_2', 'Badges [B]'),
              className: 'px-3 py-1.5 text-xs font-bold rounded-full flex items-center gap-1 transition-all ' + (showBadges ? 'text-white bg-gradient-to-r from-purple-500 to-fuchsia-600 shadow-md' : 'text-purple-300 bg-purple-500/20 border border-purple-500/30 hover:bg-purple-500/30')
            }, '\uD83C\uDFC5 ' + badgeCount + '/' + Object.keys(geoBadges).length),
            h('button', { 'aria-label': 'STL',
              onClick: askAI,
              title: t('stem.geosandbox.ai_tutor', 'AI Tutor [/]'),
              className: 'px-3 py-1.5 text-xs font-bold rounded-full flex items-center gap-1 transition-all ' + (aiLoading ? 'text-white bg-gradient-to-r from-cyan-700 to-blue-700 animate-pulse' : showAI ? 'text-white bg-gradient-to-r from-cyan-700 to-blue-700 shadow-md' : 'text-cyan-300 bg-cyan-500/20 border border-cyan-500/30 hover:bg-cyan-500/30')
            }, aiLoading ? '\u23F3 Thinking...' : '\uD83E\uDD16 AI Tutor'),
            h('button', { 'aria-label': 'STL',
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
              return h('div', { key: id, className: 'flex flex-col items-center text-center p-2 rounded-lg transition-all ' + (earned ? 'bg-purple-500/20 border border-purple-400/40' : 'bg-slate-800/40 border border-slate-700/30 opacity-50') },
                h('span', { className: 'text-xl mb-1' }, earned ? b.icon : '\uD83D\uDD12'),
                h('span', { className: 'text-[11px] font-bold ' + (earned ? 'text-purple-200' : 'text-slate-200') }, b.name),
                h('span', { className: 'text-[11px] ' + (earned ? 'text-purple-300/70' : 'text-slate-600') }, __alloT('stem.geosandbox.' + (id) + '_desc', b.desc))
              );
            })
          )
        ),

        // ── AI Tutor panel ──
        showAI && h('div', { className: 'bg-gradient-to-br from-cyan-900/40 to-blue-900/30 backdrop-blur-md rounded-xl p-4 border border-cyan-500/30' },
          h('div', { className: 'flex items-center justify-between mb-2' },
            h('div', { className: 'text-sm font-bold text-cyan-200 flex items-center gap-2' }, t('stem.geosandbox.ai_geometry_tutor', '\uD83E\uDD16 AI Geometry Tutor')),
            h('button', { onClick: function() { updExt({ showAI: false }); }, 'aria-label': t('stem.geosandbox.close_ai_geometry_tutor', 'Close AI Geometry Tutor'), className: 'text-xs text-slate-200 hover:text-slate-200' }, '\u2716')
          ),
          aiLoading
            ? h('div', { className: 'text-sm text-cyan-300 animate-pulse' }, 'Analyzing this ' + m.name + '...')
            : aiResponse
              ? h('div', { className: 'text-sm text-slate-200 leading-relaxed whitespace-pre-wrap' }, aiResponse)
              : h('div', { className: 'text-sm text-slate-200 italic' }, t('stem.geosandbox.click_ai_tutor_or_press_to_get_insight', 'Click "AI Tutor" or press / to get insights about the current shape.'))
        ),

        // Main layout: sidebar + viewport
        h('div', { className: 'flex gap-3', style: { minHeight: '480px', flexDirection: 'row' } },

          // === LEFT SIDEBAR ===
          h('div', { style: { width: '260px', maxHeight: '520px', overflowY: 'auto', flexShrink: 0 }, className: 'flex flex-col gap-3' },

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
                      className: 'w-full px-3 py-2 rounded-lg text-xs font-bold transition-all ' + (voiceListening ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-900/50 text-fuchsia-200 border border-fuchsia-500/40 hover:bg-slate-900/80')
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
                        h('button', { onClick: doRefineSculpt, disabled: sculptBusy, className: 'px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-fuchsia-600 text-white hover:bg-fuchsia-700 disabled:opacity-50' }, '✨')
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

            // ── v2: STRETCH MODE PANEL — the HandWaver-inspired workflow ──
            mode === 'stretch' && h('div', { className: 'bg-gradient-to-br from-purple-900/40 to-fuchsia-900/30 rounded-xl p-3 border border-purple-500/40 space-y-3' },
              h('div', { className: 'text-xs font-bold text-purple-200 uppercase tracking-wider' }, t('stem.geosandbox.dimensional_stretch_builder', '📐 Dimensional Stretch Builder')),
              h('p', { className: 'text-[11px] text-purple-200/80 leading-relaxed' },
                t('stem.geosandbox.build_geometry_by_stretching_a_point_i', 'Build geometry by stretching a point into a line, a line into a plane, and a plane into a solid. Each stretch adds a new object to the scene.')
              ),
              // Voice build (hands-free HandWaver stretch): speak the dimensional moves
              (voiceSupported && typeof ctx.callGemini === 'function') && h('div', { className: 'space-y-1' },
                h('button', {
                  onClick: function() { toggleVoice(handleStretchVoiceCommand, 'Listening. Say “add a point”, then “stretch it up”, “sweep across”, or “pull it out”.'); },
                  'aria-pressed': voiceListening ? 'true' : 'false',
                  'aria-label': t('stem.geosandbox.voice_build_title', 'Voice build — speak the stretches to build point to line to plane to solid, hands-free'),
                  title: t('stem.geosandbox.voice_build_title', 'Voice build — speak the stretches to build point to line to plane to solid, hands-free'),
                  className: 'w-full px-3 py-2 rounded-lg text-xs font-bold transition-all ' + (voiceListening ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-900/50 text-purple-200 border border-purple-500/40 hover:bg-slate-900/80')
                }, voiceListening ? ('🔴 ' + t('stem.geosandbox.voice_listening', 'Listening… tap to stop')) : ('🎤 ' + t('stem.geosandbox.voice_build', 'Voice build'))),
                voiceHeard && h('p', { className: 'text-[11px] text-purple-200/70 italic', 'aria-live': 'polite' }, '“' + voiceHeard + '”')
              ),
              // Step 1: Place point
              h('button', {
                onClick: function() { addPoint([0, 0, 0]); },
                'aria-label': t('stem.geosandbox.add_a_point_at_origin', 'Add a point at origin'),
                className: 'w-full px-3 py-2 rounded-lg text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 transition-all shadow-md'
              }, t('stem.geosandbox.place_point_at_origin', '⊙ Place point at origin')),
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
              // Stretch length
              h('div', null,
                h('div', { className: 'flex justify-between text-[11px] font-bold text-purple-200 mb-1' },
                  h('span', null, t('stem.geosandbox.length', 'Length')),
                  h('span', { className: 'text-purple-300 font-mono' }, stretchLength.toFixed(1) + ' ' + unitDef.short)
                ),
                h('input', {
                  type: 'range', min: '0.5', max: '8', step: '0.5',
                  value: stretchLength,
                  onChange: function(e) { upd('stretchLength', parseFloat(e.target.value)); },
                  'aria-label': t('stem.geosandbox.stretch_length', 'Stretch length'),
                  className: 'w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500'
                })
              ),
              // Stretch button (context label changes based on selection)
              (function() {
                var sel = construction.objects.find(function(o) { return o.id === construction.selection; });
                var label = 'Select an object first';
                var enabled = false;
                if (sel) {
                  if (sel.type === 'point')         { label = 'Stretch point → segment (1D)'; enabled = true; }
                  else if (sel.type === 'segment')  { label = 'Stretch segment → rectangle (2D)'; enabled = true; }
                  else if (sel.type === 'rect')     { label = 'Stretch rectangle → prism (3D)'; enabled = true; }
                  else                              { label = '✓ Already a solid (3D)'; enabled = false; }
                }
                return h('button', {
                  onClick: performStretch,
                  disabled: !enabled,
                  'aria-label': label,
                  className: 'w-full px-3 py-2 rounded-lg text-xs font-bold transition-all ' +
                    (enabled ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white hover:from-fuchsia-700 hover:to-purple-700 shadow-md' : 'bg-slate-700 text-slate-500 cursor-not-allowed')
                }, '⤴ ' + label);
              })(),
              // Construction object list
              construction.objects.length > 0 && h('div', { className: 'border-t border-purple-500/30 pt-2' },
                h('div', { className: 'text-[11px] font-bold text-purple-200 mb-1' }, 'Construction (' + construction.objects.length + ' objects):'),
                h('div', { className: 'space-y-1 max-h-40 overflow-y-auto' },
                  construction.objects.map(function(o) {
                    var isSel = o.id === construction.selection;
                    var icon = o.type === 'point' ? '⊙' : o.type === 'segment' ? '⎯' : o.type === 'rect' ? '▭' : '⬛';
                    var label = o.type === 'point' ? 'Point #' + o.id :
                                o.type === 'segment' ? 'Segment #' + o.id + ' (L = ' + objectVolume(o).toFixed(2) + ' ' + unitDef.short + ')' :
                                o.type === 'rect' ? 'Rectangle #' + o.id + ' (A = ' + objectVolume(o).toFixed(2) + ' ' + unitDef.short + '²)' :
                                'Prism #' + o.id + ' (V = ' + objectVolume(o).toFixed(2) + ' ' + unitDef.short + '³)';
                    return h('button', {
                      key: 'obj-' + o.id,
                      onClick: function() { selectObject(o.id); },
                      'aria-pressed': isSel,
                      className: 'w-full text-left px-2 py-1 rounded text-[11px] transition-all flex items-center gap-2 ' +
                        (isSel ? 'bg-fuchsia-600 text-white' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700')
                    }, h('span', { className: 'text-base' }, icon), label);
                  })
                )
              ),
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
              var metrics = [
                { k: 'count', label: t('stem.geosandbox.objects', 'Objects'), val: objs.length },
                { k: 'dim', label: t('stem.geosandbox.avg_dim', 'Avg dim'), val: avgDim.toFixed(2) },
                { k: 'len', label: t('stem.geosandbox.length_2', 'Σ length'), val: totalLen.toFixed(2) },
                { k: 'area', label: t('stem.geosandbox.area', 'Σ area'), val: totalArea.toFixed(2) },
                { k: 'vol', label: t('stem.geosandbox.volume', 'Σ volume'), val: totalVol.toFixed(2) }
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
                    return h('div', { key: t, className: 'text-center p-1 rounded text-[9px]', style: { background: byDim[di] ? '#0a0a1a' : '#050510', border: '1px solid ' + (byDim[di] ? dimColors[di] : '#1a1a2a'), color: byDim[di] ? dimColors[di] : '#475569' } },
                      di + 'D · ' + byDim[di]
                    );
                  })
                ),
                h('svg', { width: '100%', height: 180, viewBox: '0 0 240 180', style: { background: '#0a0a1a', borderRadius: 6, marginBottom: 8 } },
                  h('line', { x1: 0, y1: 90, x2: 240, y2: 90, stroke: '#1e293b', strokeDasharray: '2 4' }),
                  h('line', { x1: 120, y1: 0, x2: 120, y2: 180, stroke: '#1e293b', strokeDasharray: '2 4' }),
                  svgEls,
                  h('text', { x: 8, y: 14, fill: '#64748b', fontSize: 9 }, 'centroid (' + cx.toFixed(1) + ', ' + cy.toFixed(1) + ', ' + cz.toFixed(1) + ')'),
                  h('text', { x: 8, y: 172, fill: '#64748b', fontSize: 9 }, 'view ' + iq.viewAngle + '°  · focus ' + iq.focus)
                ),
                h('div', { className: 'grid grid-cols-2 gap-2 mb-2' },
                  h('label', { className: 'text-[10px]' },
                    h('div', { className: 'flex justify-between mb-0.5' }, h('span', null, t('stem.geosandbox.view_angle', 'View angle')), h('span', { style: { color: sm.color, fontFamily: 'monospace', fontWeight: 700 } }, iq.viewAngle + '°')),
                    h('input', { type: 'range', min: 0, max: 60, step: 5, value: iq.viewAngle, onChange: function(e) { setKey('viewAngle', parseInt(e.target.value, 10)); }, className: 'w-full' })
                  ),
                  h('label', { className: 'text-[10px]' },
                    h('div', { className: 'flex justify-between mb-0.5' }, h('span', null, t('stem.geosandbox.detail_level', 'Detail level')), h('span', { style: { color: sm.color, fontFamily: 'monospace', fontWeight: 700 } }, iq.detail)),
                    h('input', { type: 'range', min: 1, max: 3, step: 1, value: iq.detail, onChange: function(e) { setKey('detail', parseInt(e.target.value, 10)); }, className: 'w-full' })
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
                h('textarea', { value: iq.hypothesis, onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, rows: 2, placeholder: t('stem.geosandbox.e_g_stretching_a_segment_perpendicular', 'e.g., stretching a segment perpendicular doubles area but volume needs a second stretch...'), className: 'w-full p-1.5 rounded text-[10px] mb-2', style: { background: '#0a0a1a', border: '1px solid ' + sm.border, color: '#e8f0f5', resize: 'vertical' } }),
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
                iq.understood && h('textarea', { value: iq.explanation, onChange: function(e) { setIQ({ explanation: e.target.value }); }, rows: 2, placeholder: t('stem.geosandbox.explain_in_your_own_words', 'Explain in your own words...'), className: 'w-full p-1.5 rounded text-[10px] mb-1', style: { background: '#0a0a1a', border: '1px solid ' + sm.border, color: '#e8f0f5', resize: 'vertical' } }),
                h('p', { className: 'm-0 text-[9px] italic opacity-60' }, t('stem.geosandbox.inquiry_widget_no_score_no_reveal_no_a', 'Inquiry widget — no score, no reveal, no answer dump.'))
              );
            })(),

            // Property sliders (single-shape mode only)
            mode === 'single' && h('div', { className: 'bg-slate-800/60 backdrop-blur-md rounded-xl p-3 border border-slate-700/50' },
              h('div', { className: 'text-xs font-bold text-slate-300 uppercase tracking-wider mb-2' }, t('stem.geosandbox.properties', 'Properties')),
              currentSliders.map(function(sl) {
                return h('div', { key: sl.key, className: 'mb-2' },
                  h('div', { className: 'flex justify-between text-[11px] text-slate-300 mb-0.5' },
                    h('span', { title: getDimTooltip(shape, sl.key), style: { cursor: getDimTooltip(shape, sl.key) ? 'help' : 'default', borderBottom: getDimTooltip(shape, sl.key) ? '1px dotted #64748b' : 'none' } }, sl.label),
                    h('span', { className: 'text-sky-400 font-mono' }, (dims[sl.key] || sl.min).toFixed(sl.step < 1 ? 1 : 0))
                  ),
                  h('input', {
                    type: 'range',
                    min: sl.min,
                    max: sl.max,
                    step: sl.step,
                    value: dims[sl.key] || sl.min,
                    onChange: function(e) { updDim(sl.key, e.target.value); },
                    'aria-label': sl.label + ' slider',
                    className: 'w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500'
                  })
                );
              }),
              // Color picker
              h('div', { className: 'mt-3' },
                h('div', { className: 'text-[11px] text-slate-300 mb-1' }, t('stem.geosandbox.color', 'Color')),
                h('div', { className: 'flex gap-1.5 flex-wrap' },
                  colorPalette.map(function(c) {
                    return h('button', { key: c,
                      onClick: function() { upd('color', c); },
                      style: { backgroundColor: c },
                      className: 'w-5 h-5 rounded-full transition-all border-2 ' +
                        (shapeColor === c ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105 opacity-70 hover:opacity-100')
                    });
                  })
                )
              ),
              // Wireframe toggle
              h('div', { className: 'flex items-center gap-2 mt-3' },
                h('button', { 'aria-label': t('stem.geosandbox.wireframe', 'Wireframe'),
                  onClick: toggleWireframe,
                  title: t('stem.geosandbox.toggle_wireframe_w', 'Toggle wireframe [W]'),
                  className: 'w-8 h-4 rounded-full transition-all relative ' + (wireframe ? 'bg-sky-500' : 'bg-slate-600')
                },
                  h('div', {
                    className: 'w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all ' + (wireframe ? 'left-4' : 'left-0.5')
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
              mode === 'stretch' && h('div', { className: 'flex gap-1' },
                h('button', {
                  onClick: function() {
                    if (typeof window !== 'undefined' && window.prompt) {
                      var name = window.prompt('Name this construction:', 'Build ' + new Date().toLocaleDateString());
                      if (name) saveConstruction(name);
                    }
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
              mode === 'stretch' && showSaved && h('div', { className: 'border-t border-slate-700 pt-2 space-y-1 max-h-40 overflow-y-auto' },
                Object.keys(savedConstructions).length === 0
                  ? h('p', { className: 'text-[11px] text-slate-500 italic' }, t('stem.geosandbox.no_saved_constructions_yet', 'No saved constructions yet.'))
                  : Object.keys(savedConstructions).map(function(name) {
                      var snap = savedConstructions[name];
                      return h('div', { key: 'sv-' + name, className: 'flex items-center gap-1 bg-slate-900/60 rounded p-1' },
                        h('span', { className: 'text-[11px] text-slate-200 flex-1 truncate', title: name }, name),
                        h('span', { className: 'text-[10px] text-slate-400 font-mono' }, (snap.objects || []).length + ' objs'),
                        h('button', {
                          onClick: function() { loadConstruction(name); },
                          className: 'px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-700 text-white hover:bg-indigo-800'
                        }, t('stem.geosandbox.load', 'Load')),
                        h('button', {
                          onClick: function() { if (window.confirm && window.confirm('Delete "' + name + '"?')) deleteConstruction(name); },
                          className: 'px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-700 text-white hover:bg-rose-800'
                        }, '×')
                      );
                    })
              )
            ),

            // Measurements (hidden during challenge mode AND stretch mode — stretch has its own readouts in the object list)
            !gd.challengeMode && mode === 'single' && h('div', { className: 'bg-slate-800/60 backdrop-blur-md rounded-xl p-3 border border-slate-700/50' },
              h('div', { className: 'text-xs font-bold text-slate-300 uppercase tracking-wider mb-2' }, t('stem.geosandbox.measurements', '\uD83D\uDCCF Measurements')),
              h('div', { className: 'space-y-1.5' },
                // Volume with formula
                h('div', null,
                  h('div', { className: 'flex justify-between text-xs' },
                    h('span', { className: 'text-slate-300' }, t('stem.geosandbox.volume_2', 'Volume')),
                    h('span', { className: 'text-emerald-400 font-mono font-bold' }, m.vol.toFixed(2) + ' u\u00B3')
                  ),
                  h('div', { className: 'text-[11px] text-emerald-500/70 font-mono mt-0.5' }, fm.vol)
                ),
                // Surface Area with formula
                h('div', null,
                  h('div', { className: 'flex justify-between text-xs' },
                    h('span', { className: 'text-slate-300' }, t('stem.geosandbox.surface_area', 'Surface Area')),
                    h('span', { className: 'text-sky-400 font-mono font-bold' }, m.sa.toFixed(2) + ' u\u00B2')
                  ),
                  h('div', { className: 'text-[11px] text-sky-500/70 font-mono mt-0.5' }, fm.sa)
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
                m.faces > 0 && h('div', { className: 'flex justify-between text-xs mt-1.5 pt-1.5 border-t border-slate-700/50' },
                  h('span', { className: 'text-slate-300', title: t('stem.geosandbox.euler_s_polyhedron_formula_for_any_con', 'Euler\'s polyhedron formula: for any convex polyhedron, V \u2212 E + F = 2') }, t('stem.geosandbox.euler_s_formula', "Euler's Formula")),
                  h('span', { className: 'text-cyan-400 font-mono font-bold' },
                    m.vertices + ' \u2212 ' + m.edges + ' + ' + m.faces + ' = ' + (m.vertices - m.edges + m.faces),
                    (m.vertices - m.edges + m.faces) === 2 ? ' \u2713' : ''
                  )
                ),
                m.note && h('div', { className: 'text-[11px] text-slate-200 italic mt-1' }, m.note)
              )
            ),

            // Streak indicator
            (ext.streak || 0) >= 2 && h('div', { className: 'bg-gradient-to-r from-orange-900/40 to-amber-900/30 rounded-xl p-2 border border-orange-500/30 text-center' },
              h('span', { className: 'text-xs font-bold text-orange-300' }, '\uD83D\uDD25 Streak: ' + ext.streak + ' in a row!')
            )
          ),

          // === THREE.JS VIEWPORT ===
          h('div', { className: 'flex-1 bg-slate-900/60 backdrop-blur-md rounded-xl border border-slate-700/50 overflow-hidden relative', style: { minHeight: '400px' } },
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
                  'aria-label': t('stem.geosandbox.interactive_geometry_sandbox_3d_visual', 'Interactive geometry sandbox 3D visualization'), tabIndex: 0,
                  className: 'w-full h-full',
                  style: { display: 'block', width: '100%', height: '100%', minHeight: '400px' }
                }),
            // Controls hint overlay
            h('div', { className: 'absolute bottom-2 right-2 text-[11px] text-slate-300 bg-slate-900/80 px-2 py-1 rounded-md' },
              t('stem.geosandbox.drag_rotate_scroll_zoom_right_click_pa', '\uD83D\uDDB1\uFE0F Drag: rotate \u2022 Scroll: zoom \u2022 Right-click: pan')
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
        gd.challengeMode && challenge && h('div', { className: 'bg-gradient-to-br from-amber-900/80 to-orange-900/60 backdrop-blur-md rounded-xl border-2 border-amber-500/60 p-4 space-y-3 shadow-lg shadow-amber-900/30' },
          // Challenge header with score
          h('div', { className: 'flex items-center justify-between' },
            h('h3', { className: 'text-base font-black text-amber-200 flex items-center gap-2' }, t('stem.geosandbox.geometry_challenge', '\uD83C\uDFAF Geometry Challenge')),
            h('div', { className: 'flex items-center gap-3' },
              h('span', { className: 'text-xs font-bold text-emerald-400' }, '\u2705 ' + challengeScore.correct),
              h('span', { className: 'text-xs text-slate-600' }, '/'),
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
              className: 'px-4 py-2 rounded-lg text-xs font-bold transition-all ' + (challengeAnswer.trim() ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md hover:from-amber-600 hover:to-orange-700' : 'bg-slate-700 text-slate-600 cursor-not-allowed')
            }, t('stem.geosandbox.check_2', '\u2714 Check'))
          ),
          // Result feedback
          challengeResult && h('div', { className: 'space-y-2' },
            h('div', { className: 'flex items-center gap-2 p-3 rounded-lg ' + (challengeResult === 'correct' ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-red-500/20 border border-red-500/30') },
              h('span', { className: 'text-lg' }, challengeResult === 'correct' ? '\u2705' : '\u274C'),
              h('div', null,
                h('div', { className: 'text-sm font-bold ' + (challengeResult === 'correct' ? 'text-emerald-300' : 'text-red-300') }, challengeResult === 'correct' ? 'Correct! +5 XP' : 'Not quite!'),
                challengeResult !== 'correct' && h('div', { className: 'text-xs text-slate-200 mt-0.5' }, t('stem.geosandbox.the_correct_answer_is', 'The correct answer is: '),
                  h('span', { className: 'font-bold text-amber-300 font-mono' }, typeof challenge.answer === 'number' ? challenge.answer.toFixed(2) : challenge.answer),
                  challenge.unit ? ' ' + challenge.unit : ''
                )
              )
            ),
            h('button', { 'aria-label': t('stem.geosandbox.next_challenge', 'Next Challenge'),
              onClick: generateChallenge,
              className: 'w-full px-4 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md hover:from-amber-600 hover:to-orange-700 transition-all'
            }, t('stem.geosandbox.next_challenge_2', '\u27A1 Next Challenge'))
          ),
          // Hint for numeric challenges
          !challengeResult && ['volume','surfaceArea','lateralArea'].indexOf(challenge.type) >= 0 && h('div', { className: 'text-xs text-amber-200/70 italic bg-amber-900/20 rounded-lg p-2' },
            t('stem.geosandbox.tip_your_answer_must_be_within_5_of_th', '\uD83D\uDCA1 Tip: Your answer must be within 5% of the exact value. Use \u03C0 \u2248 3.14159')
          )
        ),

        // STL note
        h('div', { className: 'text-[11px] text-slate-600 text-center' },
          t('stem.geosandbox.stl_files_are_unit_less_most_3d_printe', '\uD83D\uDCA1 STL files are unit-less. Most 3D printer slicers (Cura, PrusaSlicer) default to millimeters. A shape with width=5 will print as 5mm wide.')
        )
      );
      })();
    }
  });
})();
