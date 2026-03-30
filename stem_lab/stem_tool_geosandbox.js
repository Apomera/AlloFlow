// ═══════════════════════════════════════════
// stem_tool_geosandbox.js — 3D Geometry Sandbox Plugin
// Interactive 3D shape explorer with volume/SA formulas,
// challenge mode, measurement tooltips, STL export,
// sound effects, badges, AI tutor & keyboard shortcuts.
// Extracted from stem_lab_module.js L33187-33677
// ═══════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

(function() {
  'use strict';

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
    scene.background = new THREE.Color('#0f172a');
    var camera = new THREE.PerspectiveCamera(50, cnv.clientWidth / cnv.clientHeight, 0.1, 1000);
    camera.position.set(6, 5, 8);
    camera.lookAt(0, 0, 0);
    var renderer = new THREE.WebGLRenderer({ canvas: cnv, antialias: true });
    renderer.setSize(cnv.clientWidth, cnv.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    var dir = new THREE.DirectionalLight(0xffffff, 0.8);
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
      animId = requestAnimationFrame(animate);
      if (controls) controls.update();
      renderer.render(scene, camera);
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
      shininess: 60,
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
      cancelAnimationFrame(window._geoScene.animId);
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

      return (function() {

      // ── State ──
      var gd = (labToolData && labToolData.geoSandbox) || {};
      var upd = function(key, val) { setLabToolData(function(prev) { return Object.assign({}, prev, { geoSandbox: Object.assign({}, prev.geoSandbox || {}, (function() { var o = {}; o[key] = val; return o; })()) }); }); };
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
      };

      var shape = gd.shape || 'box';
      var dims = gd.dims || { w: 3, h: 3, d: 3, r: 1.5, rTop: 1.5, rBot: 1.5, tube: 0.5, segs: 32 };
      var shapeColor = gd.color || '#60a5fa';
      var wireframe = gd.wireframe || false;
      var opacity = gd.opacity != null ? gd.opacity : 1;

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

      // ── Shape change with sound + badge tracking ──
      var selectShape = function(sid) {
        geoSound('shapeChange');
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

      // ── Keyboard shortcuts ──
      React.useEffect(function() {
        var handler = function(e) {
          if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
          var key = e.key;
          // 1-7: select shape
          if (key >= '1' && key <= '7') {
            var idx = parseInt(key) - 1;
            if (shapes[idx]) selectShape(shapes[idx].id);
            return;
          }
          switch (key.toLowerCase()) {
            case 'c': generateChallenge(); break;
            case 'w': toggleWireframe(); break;
            case 'e': doExportSTL(); break;
            case 'b': updExt({ showBadges: !showBadges }); break;
            case '/': e.preventDefault(); askAI(); break;
          }
        };
        window.addEventListener('keydown', handler);
        return function() { window.removeEventListener('keydown', handler); };
      });

      // ── Three.js scene update effect ──
      React.useEffect(function() {
        if (!window.THREE) return;
        var cnv = document.getElementById('geo-sandbox-canvas');
        if (!cnv) return;
        if (!window._geoScene) {
          window._geoScene = initScene(cnv);
        }
        updateMesh(window._geoScene, shape, dims, shapeColor, wireframe, opacity);
        // Resize handler
        var handleResize = function() {
          if (!cnv || !window._geoScene || !window._geoScene.renderer) return;
          window._geoScene.renderer.setSize(cnv.clientWidth, cnv.clientHeight);
          window._geoScene.camera.aspect = cnv.clientWidth / cnv.clientHeight;
          window._geoScene.camera.updateProjectionMatrix();
        };
        window.addEventListener('resize', handleResize);
        return function() { window.removeEventListener('resize', handleResize); };
      }, [shape, dims, shapeColor, wireframe, opacity]);

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
          h('div', { className: 'text-5xl' }, '\uD83D\uDD37'),
          h('div', { className: 'text-slate-400 text-lg' }, 'Loading 3D engine...')
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
          h('div', { className: 'flex gap-2 flex-wrap' },
            h('button', {
              onClick: generateChallenge,
              title: 'Challenge Mode [C]',
              className: 'px-3 py-1.5 text-xs font-bold transition-all rounded-full flex items-center gap-1 ' + (gd.challengeMode ? 'text-white bg-gradient-to-r from-amber-500 to-orange-600 shadow-md shadow-amber-500/20 hover:from-amber-600 hover:to-orange-700' : 'text-amber-300 bg-amber-500/20 border border-amber-500/30 hover:bg-amber-500/30')
            }, '\uD83C\uDFAF Challenge'),
            gd.challengeMode && h('button', {
              onClick: function() { setLabToolData(function(prev) { return Object.assign({}, prev, { geoSandbox: Object.assign({}, prev.geoSandbox||{}, { challengeMode:false, challenge:null, challengeAnswer:'', challengeResult:null }) }); }); },
              className: 'px-3 py-1.5 text-xs font-bold text-slate-400 bg-slate-700/60 rounded-full hover:bg-slate-600 transition-all'
            }, '\u2716 Exit'),
            h('button', {
              onClick: function() { updExt({ showBadges: !showBadges }); },
              title: 'Badges [B]',
              className: 'px-3 py-1.5 text-xs font-bold rounded-full flex items-center gap-1 transition-all ' + (showBadges ? 'text-white bg-gradient-to-r from-purple-500 to-fuchsia-600 shadow-md' : 'text-purple-300 bg-purple-500/20 border border-purple-500/30 hover:bg-purple-500/30')
            }, '\uD83C\uDFC5 ' + badgeCount + '/' + Object.keys(geoBadges).length),
            h('button', {
              onClick: askAI,
              title: 'AI Tutor [/]',
              className: 'px-3 py-1.5 text-xs font-bold rounded-full flex items-center gap-1 transition-all ' + (aiLoading ? 'text-white bg-gradient-to-r from-cyan-500 to-blue-600 animate-pulse' : showAI ? 'text-white bg-gradient-to-r from-cyan-500 to-blue-600 shadow-md' : 'text-cyan-300 bg-cyan-500/20 border border-cyan-500/30 hover:bg-cyan-500/30')
            }, aiLoading ? '\u23F3 Thinking...' : '\uD83E\uDD16 AI Tutor'),
            h('button', {
              onClick: doExportSTL,
              title: 'Export STL [E]',
              className: 'px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-green-600 rounded-full hover:from-emerald-600 hover:to-green-700 shadow-md hover:shadow-lg transition-all flex items-center gap-1'
            }, '\uD83D\uDCE6 STL'),
            h('button', {
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
                h('span', { className: 'text-[10px] font-bold ' + (earned ? 'text-purple-200' : 'text-slate-500') }, b.name),
                h('span', { className: 'text-[9px] ' + (earned ? 'text-purple-300/70' : 'text-slate-600') }, b.desc)
              );
            })
          )
        ),

        // ── AI Tutor panel ──
        showAI && h('div', { className: 'bg-gradient-to-br from-cyan-900/40 to-blue-900/30 backdrop-blur-md rounded-xl p-4 border border-cyan-500/30' },
          h('div', { className: 'flex items-center justify-between mb-2' },
            h('div', { className: 'text-sm font-bold text-cyan-200 flex items-center gap-2' }, '\uD83E\uDD16 AI Geometry Tutor'),
            h('button', { onClick: function() { updExt({ showAI: false }); }, className: 'text-xs text-slate-400 hover:text-slate-200' }, '\u2716')
          ),
          aiLoading
            ? h('div', { className: 'text-sm text-cyan-300 animate-pulse' }, 'Analyzing this ' + m.name + '...')
            : aiResponse
              ? h('div', { className: 'text-sm text-slate-200 leading-relaxed whitespace-pre-wrap' }, aiResponse)
              : h('div', { className: 'text-sm text-slate-400 italic' }, 'Click "AI Tutor" or press / to get insights about the current shape.')
        ),

        // Main layout: sidebar + viewport
        h('div', { className: 'flex gap-3', style: { minHeight: '480px', flexDirection: 'row' } },

          // === LEFT SIDEBAR ===
          h('div', { style: { width: '260px', maxHeight: '520px', overflowY: 'auto', flexShrink: 0 }, className: 'flex flex-col gap-3' },

            // Shape palette
            h('div', { className: 'bg-slate-800/60 backdrop-blur-md rounded-xl p-3 border border-slate-700/50' },
              h('div', { className: 'text-xs font-bold text-slate-300 uppercase tracking-wider mb-2' }, 'Shapes'),
              h('div', { className: 'grid grid-cols-4 gap-1.5' },
                shapes.map(function(s) {
                  return h('button', {
                    key: s.id,
                    onClick: function() { selectShape(s.id); },
                    title: s.label + ' [' + s.key + ']',
                    className: 'flex flex-col items-center gap-0.5 p-1.5 rounded-lg text-xs transition-all ' +
                      (shape === s.id ? 'bg-sky-500/30 border border-sky-400/50 text-sky-300 shadow-lg shadow-sky-500/10' : 'bg-slate-700/40 border border-slate-600/30 text-slate-400 hover:bg-slate-700/60 hover:text-slate-300')
                  },
                    h('span', { className: 'text-lg leading-none' }, s.icon),
                    h('span', { className: 'text-[10px] leading-tight' }, s.label)
                  );
                })
              )
            ),

            // Property sliders
            h('div', { className: 'bg-slate-800/60 backdrop-blur-md rounded-xl p-3 border border-slate-700/50' },
              h('div', { className: 'text-xs font-bold text-slate-300 uppercase tracking-wider mb-2' }, 'Properties'),
              currentSliders.map(function(sl) {
                return h('div', { key: sl.key, className: 'mb-2' },
                  h('div', { className: 'flex justify-between text-[10px] text-slate-300 mb-0.5' },
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
                    className: 'w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500'
                  })
                );
              }),
              // Color picker
              h('div', { className: 'mt-3' },
                h('div', { className: 'text-[10px] text-slate-300 mb-1' }, 'Color'),
                h('div', { className: 'flex gap-1.5 flex-wrap' },
                  colorPalette.map(function(c) {
                    return h('button', {
                      key: c,
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
                h('button', {
                  onClick: toggleWireframe,
                  title: 'Toggle wireframe [W]',
                  className: 'w-8 h-4 rounded-full transition-all relative ' + (wireframe ? 'bg-sky-500' : 'bg-slate-600')
                },
                  h('div', {
                    className: 'w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all ' + (wireframe ? 'left-4' : 'left-0.5')
                  })
                ),
                h('span', { className: 'text-[10px] text-slate-300' }, 'Wireframe')
              ),
              // Opacity slider
              h('div', { className: 'mt-2' },
                h('div', { className: 'flex justify-between text-[10px] text-slate-300 mb-0.5' },
                  h('span', null, 'Opacity'),
                  h('span', { className: 'text-sky-400 font-mono' }, Math.round(opacity * 100) + '%')
                ),
                h('input', {
                  type: 'range', min: 0.1, max: 1, step: 0.05,
                  value: opacity,
                  onChange: function(e) { upd('opacity', parseFloat(e.target.value)); },
                  className: 'w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500'
                })
              )
            ),

            // Measurements (hidden during challenge mode)
            !gd.challengeMode && h('div', { className: 'bg-slate-800/60 backdrop-blur-md rounded-xl p-3 border border-slate-700/50' },
              h('div', { className: 'text-xs font-bold text-slate-300 uppercase tracking-wider mb-2' }, '\uD83D\uDCCF Measurements'),
              h('div', { className: 'space-y-1.5' },
                // Volume with formula
                h('div', null,
                  h('div', { className: 'flex justify-between text-xs' },
                    h('span', { className: 'text-slate-300' }, 'Volume'),
                    h('span', { className: 'text-emerald-400 font-mono font-bold' }, m.vol.toFixed(2) + ' u\u00B3')
                  ),
                  h('div', { className: 'text-[10px] text-emerald-500/70 font-mono mt-0.5' }, fm.vol)
                ),
                // Surface Area with formula
                h('div', null,
                  h('div', { className: 'flex justify-between text-xs' },
                    h('span', { className: 'text-slate-300' }, 'Surface Area'),
                    h('span', { className: 'text-sky-400 font-mono font-bold' }, m.sa.toFixed(2) + ' u\u00B2')
                  ),
                  h('div', { className: 'text-[10px] text-sky-500/70 font-mono mt-0.5' }, fm.sa)
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
                m.note && h('div', { className: 'text-[10px] text-slate-400 italic mt-1' }, m.note)
              )
            ),

            // Streak indicator
            (ext.streak || 0) >= 2 && h('div', { className: 'bg-gradient-to-r from-orange-900/40 to-amber-900/30 rounded-xl p-2 border border-orange-500/30 text-center' },
              h('span', { className: 'text-xs font-bold text-orange-300' }, '\uD83D\uDD25 Streak: ' + ext.streak + ' in a row!')
            )
          ),

          // === THREE.JS VIEWPORT ===
          h('div', { className: 'flex-1 bg-slate-900/60 backdrop-blur-md rounded-xl border border-slate-700/50 overflow-hidden relative', style: { minHeight: '400px' } },
            h('canvas', {
              id: 'geo-sandbox-canvas',
              className: 'w-full h-full',
              style: { display: 'block', width: '100%', height: '100%', minHeight: '400px' }
            }),
            // Controls hint overlay
            h('div', { className: 'absolute bottom-2 right-2 text-[10px] text-slate-400 bg-slate-900/80 px-2 py-1 rounded-md' },
              '\uD83D\uDDB1\uFE0F Drag: rotate \u2022 Scroll: zoom \u2022 Right-click: pan'
            ),
            // Shape name overlay
            h('div', { className: 'absolute top-2 left-2 text-xs font-bold text-sky-300 bg-slate-900/80 px-2 py-1 rounded-md' },
              m.name
            ),
            // Keyboard shortcuts overlay
            h('div', { className: 'absolute top-2 right-2 text-[9px] text-slate-500 bg-slate-900/80 px-2 py-1 rounded-md leading-relaxed' },
              '1-7: shapes \u2022 C: challenge \u2022 W: wireframe \u2022 E: export \u2022 B: badges \u2022 /: AI'
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
              h('div', { className: 'text-[10px] text-slate-300 italic' }, '\uD83C\uDF0D ' + ct.example)
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
              h('span', { className: 'text-xs text-slate-400' }, '/'),
              h('span', { className: 'text-xs font-bold text-slate-300' }, challengeScore.total + ' attempted'),
              challengeScore.total > 0 && h('span', { className: 'text-[10px] font-bold px-2 py-0.5 rounded-full ' + (challengeScore.correct/challengeScore.total >= 0.8 ? 'bg-emerald-500/30 text-emerald-300' : challengeScore.correct/challengeScore.total >= 0.5 ? 'bg-amber-500/30 text-amber-300' : 'bg-red-500/30 text-red-300') }, Math.round(challengeScore.correct/challengeScore.total*100) + '%')
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
              className: 'flex-1 px-4 py-3 bg-slate-900 border-2 border-amber-500/40 rounded-xl text-base text-white font-bold placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30',
              step: 'any'
            }),
            h('button', {
              onClick: checkChallengeAnswer,
              disabled: !challengeAnswer.trim(),
              className: 'px-4 py-2 rounded-lg text-xs font-bold transition-all ' + (challengeAnswer.trim() ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md hover:from-amber-600 hover:to-orange-700' : 'bg-slate-700 text-slate-500 cursor-not-allowed')
            }, '\u2714 Check')
          ),
          // Result feedback
          challengeResult && h('div', { className: 'space-y-2' },
            h('div', { className: 'flex items-center gap-2 p-3 rounded-lg ' + (challengeResult === 'correct' ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-red-500/20 border border-red-500/30') },
              h('span', { className: 'text-lg' }, challengeResult === 'correct' ? '\u2705' : '\u274C'),
              h('div', null,
                h('div', { className: 'text-sm font-bold ' + (challengeResult === 'correct' ? 'text-emerald-300' : 'text-red-300') }, challengeResult === 'correct' ? 'Correct! +5 XP' : 'Not quite!'),
                challengeResult !== 'correct' && h('div', { className: 'text-xs text-slate-400 mt-0.5' }, 'The correct answer is: ',
                  h('span', { className: 'font-bold text-amber-300 font-mono' }, typeof challenge.answer === 'number' ? challenge.answer.toFixed(2) : challenge.answer),
                  challenge.unit ? ' ' + challenge.unit : ''
                )
              )
            ),
            h('button', {
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
        h('div', { className: 'text-[10px] text-slate-500 text-center' },
          '\uD83D\uDCA1 STL files are unit-less. Most 3D printer slicers (Cura, PrusaSlicer) default to millimeters. A shape with width=5 will print as 5mm wide.'
        )
      );
      })();
    }
  });
})();
