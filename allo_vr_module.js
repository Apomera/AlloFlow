/**
 * AlloFlow AlloVR — one reusable WebXR layer for every three.js STEM scene.
 *
 * Extracts the enter/exit + rig + controller + locomotion + comfort-vignette +
 * grab boilerplate that Memory Palace and Geometry Sandbox each hand-rolled, so
 * any 3D tool opts into VR in ~10 lines instead of ~200. PROGRESSIVE ENHANCEMENT:
 * everything is feature-detected and presenting-only, so a tool that calls
 * enable() is byte-for-byte unchanged on the 99% of devices without a headset.
 *
 * The button is shown ONLY when navigator.xr reports immersive-vr support, and
 * onSupportChange re-checks on `devicechange` — so it appears/disappears the
 * instant a headset is connected or unplugged, and never clutters a flat UI.
 *
 * VERSION-AGNOSTIC: the caller passes its own THREE instance (tools ship r128,
 * the palace/cg3d ship 0.137). Only stable three.js APIs are used.
 *
 * RUNTIME: plain JS, no imports; registers window.AlloModules.AlloVR.
 */
(function () {
  'use strict';
  if (window.AlloModules && window.AlloModules.AlloVR) {
    console.log('[AlloVR] Already loaded, skipping');
    return;
  }

  function _clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // ── isSupported(cb) — cb(true) only when an immersive-vr session can start ──
  function isSupported(cb) {
    try {
      if (navigator.xr && navigator.xr.isSessionSupported) {
        navigator.xr.isSessionSupported('immersive-vr').then(function (ok) { cb(!!ok); }).catch(function () { cb(false); });
      } else cb(false);
    } catch (e) { cb(false); }
  }

  // ── onSupportChange(cb) — cb(bool) now AND whenever a headset connects/unplugs.
  //    Returns an unsubscribe fn. This is what keeps the VR affordance out of the
  //    UI until a device is actually present, and brings it back live on connect.
  function onSupportChange(cb) {
    isSupported(cb);
    var handler = function () { isSupported(cb); };
    try { if (navigator.xr && navigator.xr.addEventListener) navigator.xr.addEventListener('devicechange', handler); } catch (e) {}
    return function () { try { if (navigator.xr && navigator.xr.removeEventListener) navigator.xr.removeEventListener('devicechange', handler); } catch (e) {} };
  }

  // ── enable(opts) → { enterVR, destroy, isPresenting, rig } ──
  // opts:
  //   THREE, renderer, scene, camera   (required)
  //   seat: { position:[x,y,z], scale, faceYaw, moveSpeed }  — where/how the user stands
  //   bounds: { minX,maxX,minZ,maxZ }  — world-unit box; PRESENT ⇒ smooth locomotion +
  //                                      teleport + comfort vignette (else look-only)
  //   grab: () => THREE.Object3D | null — PRESENT ⇒ grip-grab (1 hand = 6DOF move/rotate,
  //                                       2 hands = scale). Called at grab time.
  //   render: () => void               — render ONE frame (renderer.render / composer). If the
  //                                      tool's 2D loop calls controls.update(), keep it OUT of
  //                                      this fn so the headset owns the camera in VR.
  //   pauseLoop / resumeLoop: () => void — stop / restart the tool's own rAF loop
  //   onFrame: () => void              — optional per-XR-frame hook (before render)
  //   onEnter / onExit / onError: () => void — optional lifecycle hooks
  function enable(opts) {
    opts = opts || {};
    var THREE = opts.THREE, renderer = opts.renderer, scene = opts.scene, camera = opts.camera;
    if (!THREE || !renderer || !scene || !camera) { return { enterVR: function () {}, destroy: function () {}, isPresenting: function () { return false; } }; }
    try { renderer.xr.enabled = true; } catch (e) {}

    // Rig: while presenting, the headset drives the camera's LOCAL pose, so the
    // camera lives in a rig we seat/scale. At identity it's transform-neutral, so
    // the tool's existing camera/controls code is untouched in 2D.
    var rig = new THREE.Group(); scene.add(rig); rig.add(camera);
    var seat = opts.seat || {};
    var seatScale = (typeof seat.scale === 'number' && seat.scale > 0) ? seat.scale : 1;
    var seatPos = seat.position || [0, 0, 0];
    var seatYaw = seat.faceYaw || 0;
    function seatUser() { rig.scale.setScalar(seatScale); rig.position.set(seatPos[0], seatPos[1], seatPos[2]); rig.rotation.set(0, seatYaw, 0); }
    function unseat() { rig.scale.setScalar(1); rig.position.set(0, 0, 0); rig.rotation.set(0, 0, 0); }

    var bounds = opts.bounds || null;
    var MOVE_SPEED = (typeof seat.moveSpeed === 'number') ? seat.moveSpeed : 2.4;   // perceived m/s
    var SNAP_DEG = 30, VIGNETTE_MAX = 0.6, PAD = 0;
    var grabFn = (typeof opts.grab === 'function') ? opts.grab : null;

    var ctrls = null, grips = null, snapArmed = true, ray = null, tmpM = null, q = null, eul = null;
    var floorPlane = null, teleMarker = null, vignette = null, teleFlash = 0, teleTmp = null, grab = null, presenting = false;

    function buildAids() {
      try {
        if (bounds && !teleMarker) {
          var span = Math.max(4, (bounds.maxX - bounds.minX)) * 0.02;   // marker scales with the world
          var mg = new THREE.RingGeometry(span * 0.6, span, 28); mg.rotateX(-Math.PI / 2);
          teleMarker = new THREE.Mesh(mg, new THREE.MeshBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.9, depthWrite: false }));
          teleMarker.visible = false; scene.add(teleMarker);
        }
        if (bounds && !vignette) {
          var vg = new THREE.RingGeometry(0.35, 2.4, 40);
          vignette = new THREE.Mesh(vg, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, side: THREE.DoubleSide, depthTest: false, depthWrite: false }));
          vignette.position.set(0, 0, -0.5); vignette.renderOrder = 9999; camera.add(vignette);
        }
      } catch (e) {}
    }

    function haptic(intensity, ms) {
      try {
        var sess = renderer.xr.getSession && renderer.xr.getSession(); if (!sess) return;
        var srcs = sess.inputSources || [];
        for (var i = 0; i < srcs.length; i++) {
          var g = srcs[i].gamepad;
          if (g && g.hapticActuators && g.hapticActuators[0]) { try { g.hapticActuators[0].pulse(intensity, ms); } catch (e) {} }
        }
      } catch (e) {}
    }

    function setupControllers() {
      if (ctrls) return;
      ctrls = []; grips = []; buildAids();
      try {
        for (var ci = 0; ci < 2; ci++) {
          var c = renderer.xr.getController(ci);
          var rg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
          var rl = new THREE.Line(rg, new THREE.LineBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.85 }));
          rl.scale.z = 6;
          c.add(rl);
          (function (ctrl) {
            if (bounds) ctrl.addEventListener('selectstart', function () { onTrigger(ctrl); });
            if (grabFn) { ctrl.addEventListener('squeezestart', function () { grabStart(ctrl); }); ctrl.addEventListener('squeezeend', function () { grabEnd(ctrl); }); }
          })(c);
          rig.add(c); ctrls.push(c);
          var gp = renderer.xr.getControllerGrip(ci);
          gp.add(new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.03, 0.09), new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.6, metalness: 0.2 })));
          rig.add(gp); grips.push(gp);
        }
      } catch (e) {}
    }

    function ctrlRay(ctrl) {
      if (!ray) ray = new THREE.Raycaster();
      if (!tmpM) tmpM = new THREE.Matrix4();
      tmpM.identity().extractRotation(ctrl.matrixWorld);
      ray.ray.origin.setFromMatrixPosition(ctrl.matrixWorld);
      ray.ray.direction.set(0, 0, -1).applyMatrix4(tmpM);
      return ray;
    }
    function floorHit(ctrl, out) {
      try {
        if (!floorPlane) floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        var r = ctrlRay(ctrl);
        if (r.ray.direction.y > -0.12) return false;   // only while pointing DOWN
        return !!r.ray.intersectPlane(floorPlane, out);
      } catch (e) { return false; }
    }
    function onTrigger(ctrl) {   // teleport to the floor point under the ray
      try {
        if (!teleTmp) teleTmp = new THREE.Vector3();
        if (floorHit(ctrl, teleTmp)) {
          rig.position.x = _clamp(teleTmp.x, bounds.minX + PAD, bounds.maxX - PAD);
          rig.position.z = _clamp(teleTmp.z, bounds.minZ + PAD, bounds.maxZ - PAD);
          teleFlash = 1; haptic(0.6, 30);
        }
      } catch (e) {}
    }

    // ── grip-grab: one hand = 6DOF follow; two hands = scale by distance ratio ──
    function ctrlDist(a, b) {
      try { var pa = new THREE.Vector3().setFromMatrixPosition(a.matrixWorld), pb = new THREE.Vector3().setFromMatrixPosition(b.matrixWorld); return pa.distanceTo(pb); } catch (e) { return 1; }
    }
    function grabStart(ctrl) {
      try {
        var obj = grabFn && grabFn(); if (!obj) return;
        if (grab && grab.obj === obj && grab.ctrl !== ctrl) {
          grab.two = { ctrlB: ctrl, startDist: ctrlDist(grab.ctrl, ctrl) || 1, startScale: obj.scale.x || 1 };
        } else { ctrl.attach(obj); grab = { ctrl: ctrl, obj: obj, two: null }; }
        haptic(0.5, 30);
      } catch (e) {}
    }
    function grabEnd(ctrl) {
      try {
        if (!grab) return;
        if (grab.two && grab.two.ctrlB === ctrl) { grab.two = null; return; }
        if (grab.ctrl === ctrl) {
          var obj = grab.obj;
          if (grab.two) { var b = grab.two.ctrlB; try { b.attach(obj); } catch (e) {} grab = { ctrl: b, obj: obj, two: null }; }
          else { try { scene.attach(obj); } catch (e) {} grab = null; }
        }
      } catch (e) {}
    }
    function releaseGrab() { try { if (grab && grab.obj) scene.attach(grab.obj); grab = null; } catch (e) {} }
    function grabFrame() {
      try {
        if (grab && grab.two && grab.obj) {
          var d = ctrlDist(grab.ctrl, grab.two.ctrlB);
          grab.obj.scale.setScalar(_clamp((grab.two.startScale || 1) * (d / (grab.two.startDist || d)), 0.2, 8));
        }
      } catch (e) {}
    }

    function locomotion() {
      try {
        var sess = renderer.xr.getSession && renderer.xr.getSession(); if (!sess) return;
        var srcs = sess.inputSources || [];
        var mvX = 0, mvY = 0, snap = 0;
        for (var i = 0; i < srcs.length; i++) {
          var g = srcs[i].gamepad; if (!g || !g.axes) continue;
          var ax = g.axes;
          var sx = ax.length >= 4 ? ax[2] : (ax[0] || 0);
          var sy = ax.length >= 4 ? ax[3] : (ax[1] || 0);
          if (srcs[i].handedness === 'right') { snap = sx; } else { mvX += sx; mvY += sy; }
        }
        if (Math.abs(mvX) < 0.2) mvX = 0;
        if (Math.abs(mvY) < 0.2) mvY = 0;
        if (mvX || mvY) {
          if (!q) { q = new THREE.Quaternion(); eul = new THREE.Euler(0, 0, 0, 'YXZ'); }
          camera.getWorldQuaternion(q); eul.setFromQuaternion(q, 'YXZ');
          var yaw = eul.y, sinY = Math.sin(yaw), cosY = Math.cos(yaw);
          var fwd = -mvY, str = mvX;
          var stepW = MOVE_SPEED * (rig.scale.x || 1) / 60;
          rig.position.x += (fwd * -sinY + str * cosY) * stepW;
          rig.position.z += (fwd * -cosY + str * -sinY) * stepW;
          rig.position.x = _clamp(rig.position.x, bounds.minX + PAD, bounds.maxX - PAD);
          rig.position.z = _clamp(rig.position.z, bounds.minZ + PAD, bounds.maxZ - PAD);
        }
        if (Math.abs(snap) > 0.7) { if (snapArmed) { rig.rotation.y -= (snap > 0 ? 1 : -1) * SNAP_DEG * Math.PI / 180; snapArmed = false; } }
        else if (Math.abs(snap) < 0.3) { snapArmed = true; }
        if (teleMarker) {
          if (!teleTmp) teleTmp = new THREE.Vector3();
          var shown = false;
          for (var k = 0; k < ctrls.length; k++) {
            if (floorHit(ctrls[k], teleTmp)) {
              teleMarker.position.set(_clamp(teleTmp.x, bounds.minX + PAD, bounds.maxX - PAD), 0.2, _clamp(teleTmp.z, bounds.minZ + PAD, bounds.maxZ - PAD));
              teleMarker.visible = true; shown = true; break;
            }
          }
          if (!shown) teleMarker.visible = false;
        }
        if (vignette) {
          var target = Math.min(1, Math.sqrt(mvX * mvX + mvY * mvY)) * VIGNETTE_MAX;
          if (teleFlash > 0) { target = Math.max(target, 0.9); teleFlash = Math.max(0, teleFlash - 0.08); }
          vignette.material.opacity += (target - vignette.material.opacity) * 0.25;
        }
      } catch (e) {}
    }

    function vrFrame() {
      if (bounds) locomotion();
      if (grabFn) grabFrame();
      if (typeof opts.onFrame === 'function') { try { opts.onFrame(); } catch (e) {} }
      if (typeof opts.render === 'function') { try { opts.render(); return; } catch (e) {} }
      try { renderer.render(scene, camera); } catch (e) {}
    }

    function enterVR(btn) {
      if (!navigator.xr) return;
      if (btn) btn.disabled = true;
      navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor'] })
        .then(function (session) {
          seatUser();
          try { renderer.xr.setReferenceSpaceType('local-floor'); } catch (e) {}
          setupControllers();
          if (typeof opts.pauseLoop === 'function') { try { opts.pauseLoop(); } catch (e) {} }
          presenting = true;
          Promise.resolve(renderer.xr.setSession(session)).then(function () { renderer.setAnimationLoop(vrFrame); });
          if (typeof opts.onEnter === 'function') { try { opts.onEnter(); } catch (e) {} }
          session.addEventListener('end', function () {
            presenting = false;
            try { renderer.setAnimationLoop(null); } catch (e) {}
            releaseGrab(); unseat();
            if (btn) btn.disabled = false;
            if (typeof opts.onExit === 'function') { try { opts.onExit(); } catch (e) {} }
            if (typeof opts.resumeLoop === 'function') { try { opts.resumeLoop(); } catch (e) {} }
          });
        })
        .catch(function () { if (btn) btn.disabled = false; if (typeof opts.onError === 'function') { try { opts.onError(); } catch (e) {} } });
    }

    function destroy() {
      try { var s = renderer.xr && renderer.xr.getSession && renderer.xr.getSession(); if (s) s.end(); } catch (e) {}
      try { renderer.setAnimationLoop(null); } catch (e) {}
      try { if (teleMarker) { scene.remove(teleMarker); if (teleMarker.geometry) teleMarker.geometry.dispose(); if (teleMarker.material) teleMarker.material.dispose(); } } catch (e) {}
      try { if (vignette) { if (vignette.parent) vignette.parent.remove(vignette); if (vignette.geometry) vignette.geometry.dispose(); if (vignette.material) vignette.material.dispose(); } } catch (e) {}
    }

    return { enterVR: enterVR, destroy: destroy, isPresenting: function () { return presenting; }, rig: rig };
  }

  // ── mountButton(container, handle, t, opts) → cleanup fn ──
  // Inserts a styled "🥽 VR" button into a DOM container, shown ONLY while a headset
  // is present (reactive). For React tools, use onSupportChange for a state flag and
  // render your own button that calls handle.enterVR instead.
  function mountButton(container, handle, t, opts) {
    opts = opts || {};
    t = t || function (k, f) { return f || k; };
    var btn = null;
    function make() {
      if (btn || !container) return;
      btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = '🥽 ' + t('vr.enter', 'VR');
      btn.setAttribute('aria-label', t('vr.enter_title', 'Enter VR (needs a headset)'));
      btn.title = t('vr.enter_title', 'Enter VR (needs a headset)');
      btn.style.cssText = opts.style || 'border:none;background:#4f46e5;color:#fff;border-radius:999px;padding:6px 13px;font-size:13px;font-weight:800;cursor:pointer;';
      btn.onclick = function () { handle.enterVR(btn); };
      container.appendChild(btn);
    }
    function remove() { if (btn) { try { if (btn.parentNode) btn.parentNode.removeChild(btn); } catch (e) {} btn = null; } }
    var off = onSupportChange(function (ok) { if (ok) make(); else remove(); });
    return function () { off(); remove(); };
  }

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.AlloVR = {
    version: 'allovr/1',
    isSupported: isSupported,
    onSupportChange: onSupportChange,
    enable: enable,
    mountButton: mountButton
  };
  console.log('[AlloVR] Registered (allovr/1 — reusable WebXR layer for three.js STEM scenes)');
})();
