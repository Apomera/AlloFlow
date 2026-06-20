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

  // ── Scene management ──
  function initScene(cnv) {
    var THREE = window.THREE;
    var scene = new THREE.Scene();
    var themeBg = '#0f172a';
    try {
      themeBg = window.getComputedStyle(document.body).getPropertyValue('--allo-stem-canvas').trim() || '#0f172a';
    } catch(e) {}
    scene.background = new THREE.Color(themeBg);
    var camera = new THREE.PerspectiveCamera(50, cnv.clientWidth / cnv.clientHeight, 0.1, 1000);
    camera.position.set(6, 5, 8);
    camera.lookAt(0, 0, 0);
    var renderer = new THREE.WebGLRenderer({ canvas: cnv, antialias: true });
    renderer.setSize(cnv.clientWidth, cnv.clientHeight);
    // ── Bloom post-processing (guarded, auto-fallback) — AlloFlow FX rollout ──
    renderer._alloComposer = null;
    (function(){
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
    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    var dir = new THREE.DirectionalLight(0xfff1dd, 0.85); // warm key vs the existing cool fill — solids read 3D
    dir.position.set(5, 10, 7.5);
    scene.add(dir);
    var fill = new THREE.DirectionalLight(0xc7d2fe, 0.3);
    fill.position.set(-5, 3, -5);
    scene.add(fill);
    // Ground
    scene.add(new THREE.GridHelper(20, 20, 0x334155, 0x1e293b));
    // Controls
    var controls = null;
    if (THREE.OrbitControls) {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = 2;
      controls.maxDistance = 30;
    }
    // Animate
    var animId;
    var animate = function() {
      if (!renderer.domElement.isConnected) { cancelAnimationFrame(animId); return; }
      animId = requestAnimationFrame(animate);
      renderer._geoAnimId = animId; // live handle — cleanupScene must cancel the CURRENT frame, not the stale first-frame id captured in the returned object
      if (controls) controls.update();
      var _ac=renderer._alloComposer; if(_ac){ try{ _ac.render(); }catch(e){ renderer._alloComposer=null; renderer.render(scene, camera); } } else { renderer.render(scene, camera); }
    };
    animate();
    return { scene: scene, camera: camera, renderer: renderer, controls: controls, animId: animId, mesh: null };
  }

  function updateMesh(gs, shapeType, dims, shapeColor, wireframe, opacity) {
    var THREE = window.THREE;
    // Remove old
    if (gs.mesh) { gs.scene.remove(gs.mesh); gs.mesh.geometry.dispose(); if (gs.mesh.material) gs.mesh.material.dispose(); gs.mesh = null; }
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
      shininess: 90,
      flatShading: false
    });
    var mesh = new THREE.Mesh(geometry, material);
    var bbox = new THREE.Box3().setFromObject(mesh);
    mesh.position.y = -bbox.min.y;
    gs.scene.add(mesh);
    gs.mesh = mesh;
  }

  function cleanupScene() {
    if (window._geoScene) {
      cancelAnimationFrame((window._geoScene.renderer && window._geoScene.renderer._geoAnimId) || window._geoScene.animId);
      try{ if(window._geoScene.renderer && window._geoScene.renderer._alloComposer){ (window._geoScene.renderer._alloComposer.passes||[]).forEach(function(p){if(p&&p.dispose)p.dispose();}); window._geoScene.renderer._alloComposer=null; } }catch(e){}
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
      var mode = gd.mode || 'single'; // 'single' | 'stretch'
      var construction = gd.construction || { objects: [], selection: null };
      var history = gd.history || [];
      var savedConstructions = gd.savedConstructions || {};
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
      function performStretch() {
        var sel = construction.objects.find(function(o) { return o.id === construction.selection; });
        if (!sel) { addToast('Select an object first', 'error'); return; }
        var newObj;
        if (sel.type === 'point')        newObj = stretchPoint(sel, stretchAxis, stretchLength);
        else if (sel.type === 'segment') newObj = stretchSegment(sel, stretchAxis, stretchLength);
        else if (sel.type === 'rect')    newObj = stretchRect(sel, stretchAxis, stretchLength);
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
        if (mode === 'single') {
          // Remove construction group if present
          if (window._geoScene.constructionGroup) {
            window._geoScene.scene.remove(window._geoScene.constructionGroup);
            window._geoScene.constructionGroup = null;
          }
          updateMesh(window._geoScene, shape, dims, shapeColor, wireframe, opacity);
        } else {
          // Stretch mode: clear the primitive mesh
          if (window._geoScene.mesh) {
            window._geoScene.scene.remove(window._geoScene.mesh);
            if (window._geoScene.mesh.geometry) window._geoScene.mesh.geometry.dispose();
            if (window._geoScene.mesh.material) window._geoScene.mesh.material.dispose();
            window._geoScene.mesh = null;
          }
          // Rebuild construction group
          if (window._geoScene.constructionGroup) {
            window._geoScene.scene.remove(window._geoScene.constructionGroup);
          }
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
      }, [shape, dims, shapeColor, wireframe, opacity, theme, mode, JSON.stringify(construction)]);

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
          h('div', { className: 'text-slate-200 text-lg' }, 'Loading 3D engine...')
        );
      }

      // ══════════════════════════
      // ═══ RENDER ═══
      // ══════════════════════════
      return h('div', { className: 'flex flex-col gap-3 animate-in fade-in duration-300' },

        // Header row
        h('div', { className: 'flex items-center justify-between gap-3 flex-wrap' },
          h('h2', { className: 'text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500 flex items-center gap-2' },
            '\uD83D\uDD37 Geometry Sandbox'
          ),
          // \u2500\u2500 v2: Mode toggle (Single shape \u2194 Dimensional stretch) \u2500\u2500
          h('div', { className: 'flex items-center gap-1 bg-slate-800/60 rounded-full p-1 border border-slate-700', role: 'tablist', 'aria-label': 'Geometry mode' },
            h('button', {
              role: 'tab',
              'aria-selected': mode === 'single',
              onClick: function() {
                upd('mode', 'single');
                if (announceToSR) announceToSR('Single shape mode');
              },
              className: 'px-3 py-1 rounded-full text-[11px] font-bold transition-all ' +
                (mode === 'single' ? 'bg-sky-600 text-white shadow' : 'text-slate-300 hover:text-slate-100')
            }, '\uD83D\uDCE6 Single shape'),
            h('button', {
              role: 'tab',
              'aria-selected': mode === 'stretch',
              onClick: function() {
                upd('mode', 'stretch');
                if (announceToSR) announceToSR('Dimensional stretch mode. Place a point and stretch it into higher dimensions.');
              },
              title: 'HandWaver-inspired: build by stretching point \u2192 line \u2192 plane \u2192 solid',
              className: 'px-3 py-1 rounded-full text-[11px] font-bold transition-all ' +
                (mode === 'stretch' ? 'bg-purple-600 text-white shadow' : 'text-slate-300 hover:text-slate-100')
            }, '\uD83D\uDCD0 Stretch mode')
          ),
          h('div', { className: 'flex gap-2 flex-wrap' },
            h('button', { 'aria-label': 'Challenge',
              onClick: generateChallenge,
              title: 'Challenge Mode [C]',
              className: 'px-3 py-1.5 text-xs font-bold transition-all rounded-full flex items-center gap-1 ' + (gd.challengeMode ? 'text-white bg-gradient-to-r from-amber-600 to-orange-700 shadow-md shadow-amber-600/20 hover:from-amber-700 hover:to-orange-800' : 'text-amber-900 bg-amber-500/20 border border-amber-500/30 hover:bg-amber-500/30')
            }, '\uD83C\uDFAF Challenge'),
            gd.challengeMode && h('button', { 'aria-label': 'Exit',
              onClick: function() { setLabToolData(function(prev) { return Object.assign({}, prev, { geoSandbox: Object.assign({}, prev.geoSandbox||{}, { challengeMode:false, challenge:null, challengeAnswer:'', challengeResult:null }) }); }); },
              className: 'px-3 py-1.5 text-xs font-bold text-slate-200 bg-slate-700/60 rounded-full hover:bg-slate-600 transition-all'
            }, '\u2716 Exit'),
            h('button', { 'aria-label': 'Badges [B]',
              onClick: function() { updExt({ showBadges: !showBadges }); },
              title: 'Badges [B]',
              className: 'px-3 py-1.5 text-xs font-bold rounded-full flex items-center gap-1 transition-all ' + (showBadges ? 'text-white bg-gradient-to-r from-purple-500 to-fuchsia-600 shadow-md' : 'text-purple-300 bg-purple-500/20 border border-purple-500/30 hover:bg-purple-500/30')
            }, '\uD83C\uDFC5 ' + badgeCount + '/' + Object.keys(geoBadges).length),
            h('button', { 'aria-label': 'STL',
              onClick: askAI,
              title: 'AI Tutor [/]',
              className: 'px-3 py-1.5 text-xs font-bold rounded-full flex items-center gap-1 transition-all ' + (aiLoading ? 'text-white bg-gradient-to-r from-cyan-700 to-blue-700 animate-pulse' : showAI ? 'text-white bg-gradient-to-r from-cyan-700 to-blue-700 shadow-md' : 'text-cyan-300 bg-cyan-500/20 border border-cyan-500/30 hover:bg-cyan-500/30')
            }, aiLoading ? '\u23F3 Thinking...' : '\uD83E\uDD16 AI Tutor'),
            h('button', { 'aria-label': 'STL',
              onClick: doExportSTL,
              title: 'Export STL [E]',
              className: 'px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-700 to-green-700 rounded-full hover:from-emerald-800 hover:to-green-800 shadow-md hover:shadow-lg transition-all flex items-center gap-1'
            }, '\uD83D\uDCE6 STL'),
            h('button', { 'aria-label': 'Back',
              onClick: function() { cleanupScene(); setStemLabTool(null); },
              className: 'px-3 py-1.5 text-xs font-bold text-slate-300 bg-slate-700/60 rounded-full hover:bg-slate-600 transition-all'
            }, '\u2190 Back')
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
                h('span', { className: 'text-[11px] ' + (earned ? 'text-purple-300/70' : 'text-slate-600') }, b.desc)
              );
            })
          )
        ),

        // ── AI Tutor panel ──
        showAI && h('div', { className: 'bg-gradient-to-br from-cyan-900/40 to-blue-900/30 backdrop-blur-md rounded-xl p-4 border border-cyan-500/30' },
          h('div', { className: 'flex items-center justify-between mb-2' },
            h('div', { className: 'text-sm font-bold text-cyan-200 flex items-center gap-2' }, '\uD83E\uDD16 AI Geometry Tutor'),
            h('button', { onClick: function() { updExt({ showAI: false }); }, 'aria-label': 'Close AI Geometry Tutor', className: 'text-xs text-slate-200 hover:text-slate-200' }, '\u2716')
          ),
          aiLoading
            ? h('div', { className: 'text-sm text-cyan-300 animate-pulse' }, 'Analyzing this ' + m.name + '...')
            : aiResponse
              ? h('div', { className: 'text-sm text-slate-200 leading-relaxed whitespace-pre-wrap' }, aiResponse)
              : h('div', { className: 'text-sm text-slate-200 italic' }, 'Click "AI Tutor" or press / to get insights about the current shape.')
        ),

        // Main layout: sidebar + viewport
        h('div', { className: 'flex gap-3', style: { minHeight: '480px', flexDirection: 'row' } },

          // === LEFT SIDEBAR ===
          h('div', { style: { width: '260px', maxHeight: '520px', overflowY: 'auto', flexShrink: 0 }, className: 'flex flex-col gap-3' },

            // Shape palette (single-shape mode only)
            mode === 'single' && h('div', { className: 'bg-slate-800/60 backdrop-blur-md rounded-xl p-3 border border-slate-700/50' },
              h('div', { className: 'text-xs font-bold text-slate-300 uppercase tracking-wider mb-2' }, 'Shapes'),
              h('div', { className: 'grid grid-cols-4 gap-1.5' },
                shapes.map(function(s) {
                  return h('button', { 'aria-label': 'Select Shape',
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

            // ── v2: STRETCH MODE PANEL — the HandWaver-inspired workflow ──
            mode === 'stretch' && h('div', { className: 'bg-gradient-to-br from-purple-900/40 to-fuchsia-900/30 rounded-xl p-3 border border-purple-500/40 space-y-3' },
              h('div', { className: 'text-xs font-bold text-purple-200 uppercase tracking-wider' }, '📐 Dimensional Stretch Builder'),
              h('p', { className: 'text-[11px] text-purple-200/80 leading-relaxed' },
                'Build geometry by stretching a point into a line, a line into a plane, and a plane into a solid. Each stretch adds a new object to the scene.'
              ),
              // Step 1: Place point
              h('button', {
                onClick: function() { addPoint([0, 0, 0]); },
                'aria-label': 'Add a point at origin',
                className: 'w-full px-3 py-2 rounded-lg text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 transition-all shadow-md'
              }, '⊙ Place point at origin'),
              // Stretch axis selector
              h('div', null,
                h('div', { className: 'text-[11px] font-bold text-purple-200 mb-1' }, 'Stretch axis:'),
                h('div', { className: 'flex gap-1', role: 'radiogroup', 'aria-label': 'Stretch axis' },
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
                  h('span', null, 'Length'),
                  h('span', { className: 'text-purple-300 font-mono' }, stretchLength.toFixed(1) + ' ' + unitDef.short)
                ),
                h('input', {
                  type: 'range', min: '0.5', max: '8', step: '0.5',
                  value: stretchLength,
                  onChange: function(e) { upd('stretchLength', parseFloat(e.target.value)); },
                  'aria-label': 'Stretch length',
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
                  'aria-label': 'Undo last stretch',
                  className: 'flex-1 px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all ' +
                    (history.length ? 'bg-amber-700 text-white hover:bg-amber-800' : 'bg-slate-700 text-slate-500 cursor-not-allowed')
                }, '↶ Undo (' + history.length + ')'),
                h('button', {
                  onClick: clearConstruction,
                  disabled: !construction.objects.length,
                  'aria-label': 'Clear all construction objects',
                  className: 'flex-1 px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all ' +
                    (construction.objects.length ? 'bg-rose-700 text-white hover:bg-rose-800' : 'bg-slate-700 text-slate-500 cursor-not-allowed')
                }, '× Clear all')
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
                pointcloud: { label: 'Point cloud (0D)', color: '#a78bfa', bg: '#1a0a2e', border: '#7c3aed', desc: 'Mostly points — stretch any to begin building line segments.' },
                linear: { label: 'Linear (1D)', color: '#22d3ee', bg: '#0a1f2e', border: '#0891b2', desc: 'Line segments dominate. Stretching them perpendicular yields planes.' },
                planar: { label: 'Planar (2D)', color: '#facc15', bg: '#2a2410', border: '#eab308', desc: 'Rectangles dominate. Stretch perpendicular to a plane to extrude prisms.' },
                volumetric: { label: 'Volumetric (3D)', color: '#4ade80', bg: '#0a2e1a', border: '#16a34a', desc: 'Solids dominate. Each prism has interior volume and surface boundary.' }
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
                { k: 'count', label: 'Objects', val: objs.length },
                { k: 'dim', label: 'Avg dim', val: avgDim.toFixed(2) },
                { k: 'len', label: 'Σ length', val: totalLen.toFixed(2) },
                { k: 'area', label: 'Σ area', val: totalArea.toFixed(2) },
                { k: 'vol', label: 'Σ volume', val: totalVol.toFixed(2) }
              ];
              return h('div', { className: 'bg-slate-800/60 backdrop-blur-md rounded-xl p-3 border border-purple-700/40', style: { color: '#e8f0f5' } },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider mb-1', style: { color: sm.color } }, '📐 Stretch Analyzer — Inquiry Widget'),
                h('div', { className: 'text-[10px] opacity-80 mb-2' }, 'Predict geometry properties as you stretch. No answer key — you mark your own understanding.'),
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
                    h('div', { className: 'flex justify-between mb-0.5' }, h('span', null, 'View angle'), h('span', { style: { color: sm.color, fontFamily: 'monospace', fontWeight: 700 } }, iq.viewAngle + '°')),
                    h('input', { type: 'range', min: 0, max: 60, step: 5, value: iq.viewAngle, onChange: function(e) { setKey('viewAngle', parseInt(e.target.value, 10)); }, className: 'w-full' })
                  ),
                  h('label', { className: 'text-[10px]' },
                    h('div', { className: 'flex justify-between mb-0.5' }, h('span', null, 'Detail level'), h('span', { style: { color: sm.color, fontFamily: 'monospace', fontWeight: 700 } }, iq.detail)),
                    h('input', { type: 'range', min: 1, max: 3, step: 1, value: iq.detail, onChange: function(e) { setKey('detail', parseInt(e.target.value, 10)); }, className: 'w-full' })
                  ),
                  h('label', { className: 'text-[10px]' },
                    h('div', { className: 'mb-0.5' }, 'Focus on type'),
                    h('select', { value: iq.focus, onChange: function(e) { setKey('focus', e.target.value); }, className: 'w-full p-1 rounded bg-slate-900 border border-purple-700/40 text-[10px]', style: { color: '#e8f0f5' } },
                      ['all', 'point', 'segment', 'rect', 'prism'].map(function(t) { return h('option', { key: t, value: t }, t); })
                    )
                  ),
                  h('label', { className: 'text-[10px]' },
                    h('div', { className: 'mb-0.5' }, 'Edge style'),
                    h('select', { value: iq.edgeStyle, onChange: function(e) { setKey('edgeStyle', e.target.value); }, className: 'w-full p-1 rounded bg-slate-900 border border-purple-700/40 text-[10px]', style: { color: '#e8f0f5' } },
                      [['colored', 'colored by dimension'], ['plain', 'plain white']].map(function(o) { return h('option', { key: o[0], value: o[0] }, o[1]); })
                    )
                  )
                ),
                h('div', { className: 'flex gap-2 mb-2' },
                  h('button', { onClick: function() {
                    var t = new Date().toISOString().slice(11, 19);
                    setIQ({ log: iq.log.concat([{ t: t, n: objs.length, dim: avgDim.toFixed(2), len: totalLen.toFixed(2), area: totalArea.toFixed(2), vol: totalVol.toFixed(2) }]) });
                  }, className: 'flex-1 px-2 py-1 rounded text-[10px] font-bold', style: { background: sm.bg, color: sm.color, border: '1px solid ' + sm.border, cursor: 'pointer' } }, '📋 Log snapshot'),
                  h('button', { onClick: function() { setIQ({ log: [] }); }, className: 'px-2 py-1 rounded text-[10px]', style: { background: '#0a0a1a', color: '#94a3b8', border: '1px solid #1e293b', cursor: 'pointer' } }, 'Clear log')
                ),
                iq.log.length > 0 && h('div', { className: 'mb-2 p-1.5 rounded text-[9px] font-mono', style: { background: '#0a0a1a', maxHeight: 70, overflow: 'auto', border: '1px solid #1e293b' } },
                  iq.log.slice(-5).map(function(e, i) { return h('div', { key: i }, e.t + '  n=' + e.n + ' d=' + e.dim + ' L=' + e.len + ' A=' + e.area + ' V=' + e.vol); })
                ),
                h('label', { className: 'block text-[10px] font-bold opacity-85 mb-1' }, 'Your hypothesis (what stretches grow length faster — area faster — volume faster?)'),
                h('textarea', { value: iq.hypothesis, onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, rows: 2, placeholder: 'e.g., stretching a segment perpendicular doubles area but volume needs a second stretch...', className: 'w-full p-1.5 rounded text-[10px] mb-2', style: { background: '#0a0a1a', border: '1px solid ' + sm.border, color: '#e8f0f5', resize: 'vertical' } }),
                !iq.stuckRevealed && h('button', { onClick: function() { setIQ({ stuckRevealed: true }); }, className: 'px-2 py-1 rounded text-[10px] font-bold mb-2', style: { background: '#0a0a1a', color: sm.color, border: '1px solid #1e293b', cursor: 'pointer' } }, "🤔 I'm stuck — show open questions"),
                iq.stuckRevealed && h('div', { className: 'p-2 rounded text-[10px] mb-2', style: { background: '#0a0a1a', border: '1px dashed ' + sm.border, lineHeight: 1.5 } },
                  h('div', { className: 'font-bold mb-1', style: { color: sm.color } }, 'Open questions (no answer key)'),
                  h('ul', { className: 'pl-4 m-0' },
                    h('li', null, 'When you stretch a segment perpendicular to itself, what happens to its dimension count?'),
                    h('li', null, 'If centroid shifts after a stretch, what direction did you stretch most?'),
                    h('li', null, 'How does total volume change vs total area as you stretch the same axis twice?'),
                    h('li', null, 'What would make this construction symmetric about its centroid?')
                  )
                ),
                h('label', { className: 'flex items-center gap-2 text-[10px] font-bold cursor-pointer mb-1' },
                  h('input', { type: 'checkbox', checked: iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); } }),
                  h('span', null, 'I can explain why these metrics scale the way they do as I stretch.')
                ),
                iq.understood && h('textarea', { value: iq.explanation, onChange: function(e) { setIQ({ explanation: e.target.value }); }, rows: 2, placeholder: 'Explain in your own words...', className: 'w-full p-1.5 rounded text-[10px] mb-1', style: { background: '#0a0a1a', border: '1px solid ' + sm.border, color: '#e8f0f5', resize: 'vertical' } }),
                h('p', { className: 'm-0 text-[9px] italic opacity-60' }, 'Inquiry widget — no score, no reveal, no answer dump.')
              );
            })(),

            // Property sliders (single-shape mode only)
            mode === 'single' && h('div', { className: 'bg-slate-800/60 backdrop-blur-md rounded-xl p-3 border border-slate-700/50' },
              h('div', { className: 'text-xs font-bold text-slate-300 uppercase tracking-wider mb-2' }, 'Properties'),
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
                h('div', { className: 'text-[11px] text-slate-300 mb-1' }, 'Color'),
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
                h('button', { 'aria-label': 'Wireframe',
                  onClick: toggleWireframe,
                  title: 'Toggle wireframe [W]',
                  className: 'w-8 h-4 rounded-full transition-all relative ' + (wireframe ? 'bg-sky-500' : 'bg-slate-600')
                },
                  h('div', {
                    className: 'w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all ' + (wireframe ? 'left-4' : 'left-0.5')
                  })
                ),
                h('span', { className: 'text-[11px] text-slate-300' }, 'Wireframe')
              ),
              // Opacity slider
              h('div', { className: 'mt-2' },
                h('div', { className: 'flex justify-between text-[11px] text-slate-300 mb-0.5' },
                  h('span', null, 'Opacity'),
                  h('span', { className: 'text-sky-400 font-mono' }, Math.round(opacity * 100) + '%')
                ),
                h('input', {
                  type: 'range', min: 0.1, max: 1, step: 0.05,
                  value: opacity,
                  onChange: function(e) { upd('opacity', parseFloat(e.target.value)); },
                  'aria-label': 'Shape opacity',
                  className: 'w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500'
                })
              )
            ),

            // ── v2: Real-world unit + save/load shared between modes ──
            h('div', { className: 'bg-slate-800/60 backdrop-blur-md rounded-xl p-3 border border-slate-700/50 space-y-2' },
              h('div', { className: 'text-xs font-bold text-slate-300 uppercase tracking-wider' }, '🛠 Tools'),
              h('div', { className: 'flex items-center gap-1' },
                h('label', { className: 'text-[11px] text-slate-300 font-bold mr-1' }, 'Units:'),
                h('select', {
                  value: unitId,
                  onChange: function(e) { upd('unitId', e.target.value); if (announceToSR) announceToSR('Unit changed to ' + e.target.options[e.target.selectedIndex].text); },
                  'aria-label': 'Real-world unit',
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
                }, '💾 Save'),
                h('button', {
                  onClick: function() { upd('showSaved', !showSaved); },
                  className: 'flex-1 px-2 py-1 rounded text-[11px] font-bold bg-indigo-700 text-white hover:bg-indigo-800'
                }, '📂 Load (' + Object.keys(savedConstructions).length + ')')
              ),
              mode === 'stretch' && showSaved && h('div', { className: 'border-t border-slate-700 pt-2 space-y-1 max-h-40 overflow-y-auto' },
                Object.keys(savedConstructions).length === 0
                  ? h('p', { className: 'text-[11px] text-slate-500 italic' }, 'No saved constructions yet.')
                  : Object.keys(savedConstructions).map(function(name) {
                      var snap = savedConstructions[name];
                      return h('div', { key: 'sv-' + name, className: 'flex items-center gap-1 bg-slate-900/60 rounded p-1' },
                        h('span', { className: 'text-[11px] text-slate-200 flex-1 truncate', title: name }, name),
                        h('span', { className: 'text-[10px] text-slate-400 font-mono' }, (snap.objects || []).length + ' objs'),
                        h('button', {
                          onClick: function() { loadConstruction(name); },
                          className: 'px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-700 text-white hover:bg-indigo-800'
                        }, 'Load'),
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
              h('div', { className: 'text-xs font-bold text-slate-300 uppercase tracking-wider mb-2' }, '\uD83D\uDCCF Measurements'),
              h('div', { className: 'space-y-1.5' },
                // Volume with formula
                h('div', null,
                  h('div', { className: 'flex justify-between text-xs' },
                    h('span', { className: 'text-slate-300' }, 'Volume'),
                    h('span', { className: 'text-emerald-400 font-mono font-bold' }, m.vol.toFixed(2) + ' u\u00B3')
                  ),
                  h('div', { className: 'text-[11px] text-emerald-500/70 font-mono mt-0.5' }, fm.vol)
                ),
                // Surface Area with formula
                h('div', null,
                  h('div', { className: 'flex justify-between text-xs' },
                    h('span', { className: 'text-slate-300' }, 'Surface Area'),
                    h('span', { className: 'text-sky-400 font-mono font-bold' }, m.sa.toFixed(2) + ' u\u00B2')
                  ),
                  h('div', { className: 'text-[11px] text-sky-500/70 font-mono mt-0.5' }, fm.sa)
                ),
                h('div', { className: 'flex justify-between text-xs' },
                  h('span', { className: 'text-slate-300' }, 'Faces'),
                  h('span', { className: 'text-amber-400 font-mono font-bold' }, m.faces)
                ),
                h('div', { className: 'flex justify-between text-xs' },
                  h('span', { className: 'text-slate-300' }, 'Edges'),
                  h('span', { className: 'text-purple-400 font-mono font-bold' }, m.edges)
                ),
                h('div', { className: 'flex justify-between text-xs' },
                  h('span', { className: 'text-slate-300' }, 'Vertices'),
                  h('span', { className: 'text-rose-400 font-mono font-bold' }, m.vertices)
                ),
                // Euler's formula (for shapes with faces)
                m.faces > 0 && h('div', { className: 'flex justify-between text-xs mt-1.5 pt-1.5 border-t border-slate-700/50' },
                  h('span', { className: 'text-slate-300', title: 'Euler\'s polyhedron formula: for any convex polyhedron, V \u2212 E + F = 2' }, "Euler's Formula"),
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
                  h('span', { className: 'text-base font-bold text-red-400' }, 'WebGL is disabled or unsupported'),
                  h('span', { className: 'text-sm text-slate-400 max-w-md' }, 'AlloFlow requires hardware acceleration to display 3D graphics. Please enable WebGL in your browser settings to interact with this lab.'),
                  h('button', {
                    onClick: function() { selectShape(shape); },
                    className: 'px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all'
                  }, 'Retry')
                )
              : h('canvas', { 
                  id: 'geo-sandbox-canvas',
                  'aria-label': 'Interactive geometry sandbox 3D visualization', tabIndex: 0,
                  className: 'w-full h-full',
                  style: { display: 'block', width: '100%', height: '100%', minHeight: '400px' }
                }),
            // Controls hint overlay
            h('div', { className: 'absolute bottom-2 right-2 text-[11px] text-slate-300 bg-slate-900/80 px-2 py-1 rounded-md' },
              '\uD83D\uDDB1\uFE0F Drag: rotate \u2022 Scroll: zoom \u2022 Right-click: pan'
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
            h('h3', { className: 'text-base font-black text-amber-200 flex items-center gap-2' }, '\uD83C\uDFAF Geometry Challenge'),
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
              'aria-label': 'Challenge answer',
              className: 'flex-1 px-4 py-3 bg-slate-900 border-2 border-amber-500/40 rounded-xl text-base text-white font-bold placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30',
              step: 'any'
            }),
            h('button', { 'aria-label': 'Check',
              onClick: checkChallengeAnswer,
              disabled: !challengeAnswer.trim(),
              className: 'px-4 py-2 rounded-lg text-xs font-bold transition-all ' + (challengeAnswer.trim() ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md hover:from-amber-600 hover:to-orange-700' : 'bg-slate-700 text-slate-600 cursor-not-allowed')
            }, '\u2714 Check')
          ),
          // Result feedback
          challengeResult && h('div', { className: 'space-y-2' },
            h('div', { className: 'flex items-center gap-2 p-3 rounded-lg ' + (challengeResult === 'correct' ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-red-500/20 border border-red-500/30') },
              h('span', { className: 'text-lg' }, challengeResult === 'correct' ? '\u2705' : '\u274C'),
              h('div', null,
                h('div', { className: 'text-sm font-bold ' + (challengeResult === 'correct' ? 'text-emerald-300' : 'text-red-300') }, challengeResult === 'correct' ? 'Correct! +5 XP' : 'Not quite!'),
                challengeResult !== 'correct' && h('div', { className: 'text-xs text-slate-200 mt-0.5' }, 'The correct answer is: ',
                  h('span', { className: 'font-bold text-amber-300 font-mono' }, typeof challenge.answer === 'number' ? challenge.answer.toFixed(2) : challenge.answer),
                  challenge.unit ? ' ' + challenge.unit : ''
                )
              )
            ),
            h('button', { 'aria-label': 'Next Challenge',
              onClick: generateChallenge,
              className: 'w-full px-4 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md hover:from-amber-600 hover:to-orange-700 transition-all'
            }, '\u27A1 Next Challenge')
          ),
          // Hint for numeric challenges
          !challengeResult && ['volume','surfaceArea','lateralArea'].indexOf(challenge.type) >= 0 && h('div', { className: 'text-xs text-amber-200/70 italic bg-amber-900/20 rounded-lg p-2' },
            '\uD83D\uDCA1 Tip: Your answer must be within 5% of the exact value. Use \u03C0 \u2248 3.14159'
          )
        ),

        // STL note
        h('div', { className: 'text-[11px] text-slate-600 text-center' },
          '\uD83D\uDCA1 STL files are unit-less. Most 3D printer slicers (Cura, PrusaSlicer) default to millimeters. A shape with width=5 will print as 5mm wide.'
        )
      );
      })();
    }
  });
})();