/* A tactile view of recorded sauce checks. Dragging and replaying never cook
   either dish; the investigation owns the shared observation clock. */
(function (root) {
  'use strict';
  function mount(host, hooks) {
    hooks = hooks || {};
    var T = root.THREE, S = root.KitchenSauceCheck;
    if (!host || !T || !S) return null;
    var doc = host.ownerDocument, win = doc.defaultView || root;
    var canvas = doc.createElement('canvas'), renderer;
    try {
      renderer = new T.WebGLRenderer({canvas:canvas, antialias:true, alpha:false});
    } catch (error) {
      host.dataset.sceneActive = 'false'; host.hidden = true;
      if (hooks.onAvailability) hooks.onAvailability(false);
      return null;
    }
    var scene = new T.Scene(), camera = new T.PerspectiveCamera(34, 430 / 270, .1, 15);
    var ray = new T.Raycaster(), pointer = new T.Vector2(), plane = new T.Plane(new T.Vector3(0, 1, 0), -.111);
    var hit = new T.Vector3(), listeners = [], drag = null, disposed = false, active = true;
    var reading = null, view = {elapsed:0, drawing:false, progress:1, inspection:'trail'}, resizeObserver = null;
    function color(hex) { return new T.Color(hex).convertSRGBToLinear(); }
    scene.background = color('#f5efdf');
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = .85;
    renderer.setPixelRatio(Math.min(win.devicePixelRatio || 1, 1.75));
    camera.zoom = 1.2;
    camera.position.set(0, 2.8, 2.6); camera.lookAt(.08, .02, 0);
    scene.add(new T.HemisphereLight(0xffffff, 0x756b52, .8));
    var light = new T.DirectionalLight(0xffffff, 1.0); light.position.set(-2, 4, 3); scene.add(light);
    var fill = new T.DirectionalLight(0xffffff, .35); fill.position.set(2, 2, -2); scene.add(fill);
    var pan = new T.Group(); scene.add(pan);
    function mesh(geometry, hex, x, y, z, parent, options) {
      var material = new T.MeshStandardMaterial(Object.assign({color:color(hex), roughness:.62}, options || {}));
      var object = new T.Mesh(geometry, material); object.position.set(x, y, z); (parent || pan).add(object); return object;
    }
    function disk(radius, hex, x, y, z, parent, options) {
      var object = mesh(new T.CircleGeometry(radius, 64), hex, x, y, z, parent, options);
      object.rotation.x = -Math.PI / 2; return object;
    }
    // Depth comes from the open pan wall and lip. No solid top hides the sauce.
    var shadow = disk(.82, '#d7ccb4', .02, -.075, .05); shadow.scale.set(1.05, .94, 1);
    shadow.material.dispose(); shadow.material = new T.MeshBasicMaterial({color:color('#d7ccb4'),toneMapped:false});
    mesh(new T.CylinderGeometry(.73, .65, .13, 64, 1, true), '#81928c', 0, .025, 0, null, {metalness:.65, roughness:.28, side:T.DoubleSide});
    disk(.67, '#354b43', 0, -.039, 0);
    var lip = mesh(new T.TorusGeometry(.725, .027, 12, 64), '#bcc9c2', 0, .094, 0, null, {metalness:.72, roughness:.2}); lip.rotation.x = -Math.PI / 2;
    var sauce = disk(.686, '#bf8f51', 0, .101, 0, null, {roughness:.45});
    var innerLip = mesh(new T.TorusGeometry(.69, .009, 8, 64), '#e0b979', 0, .104, 0); innerLip.rotation.x = -Math.PI / 2;
    mesh(new T.BoxGeometry(.24, .04, .16), '#94a59b', .78, .04, 0, null, {metalness:.5, roughness:.3});
    var handle = mesh(new T.BoxGeometry(.45, .075, .145), '#40574b', 1.005, .045, 0); handle.rotation.z = -.035;
    var gripInset = mesh(new T.BoxGeometry(.29, .01, .08), '#526c5b', 1.02, .087, 0); gripInset.rotation.z = -.035;
    var rivet = mesh(new T.SphereGeometry(.019, 12, 8), '#c9d5cd', .76, .069, 0, null, {metalness:.7, roughness:.2}); rivet.scale.y = .3;
    var pool = disk(.2, '#efd5a1', .26, .106, -.25, null, {roughness:.25, transparent:true, opacity:.9}); pool.scale.set(1.2, .7, 1);
    var patches = [], drops = [], specks = [];
    for (var i = 0; i < 10; i++) {
      var a = i * 2.399, radius = .22 + (i % 3) * .12;
      var patch = mesh(new T.SphereGeometry(.068, 14, 8), '#a8783e', Math.cos(a) * radius, .104, Math.sin(a) * radius, null, {roughness:.8});
      patch.scale.set(1.35, .1, .7); patch.rotation.y = a; patches.push(patch);
    }
    for (var j = 0; j < 7; j++) {
      var angle = .8 + j * 2.399, r = .25 + (j % 3) * .1;
      var drop = mesh(new T.SphereGeometry(.025 + (j % 2) * .009, 14, 8), '#e8be43', Math.cos(angle) * r, .115, Math.sin(angle) * r, null, {roughness:.15}); drop.scale.y = .24; drops.push(drop);
      var shine = mesh(new T.SphereGeometry(.006, 8, 6), '#fff3c4', -.007, .023, -.007, drop); shine.scale.y = .3;
    }
    for (var k = 0; k < 9; k++) {
      var mark = mesh(new T.SphereGeometry(.015, 8, 6), '#453023', Math.cos(k * 2.399) * (.26 + (k % 3) * .13), .109, Math.sin(k * 2.399) * (.26 + (k % 3) * .13)); mark.scale.set(1.8, .15, .8); specks.push(mark);
    }
    var trail = mesh(new T.PlaneGeometry(1, 1), '#3d5144', 0, .118, 0, null, {side:T.DoubleSide, roughness:1}); trail.rotation.x = -Math.PI / 2;
    var spoon = new T.Group(); scene.add(spoon);
    var stem = mesh(new T.BoxGeometry(.042, .025, .43), '#a87543', 0, .01, .27, spoon); stem.rotation.x = -.035;
    var stemEnd = mesh(new T.SphereGeometry(.022, 12, 8), '#a87543', 0, .018, .485, spoon); stemEnd.scale.set(1, .6, 1);
    var bowl = mesh(new T.SphereGeometry(.102, 24, 12), '#b98c55', 0, 0, 0, spoon); bowl.scale.set(.8, .2, 1.17);
    var spoonRim = mesh(new T.TorusGeometry(.076, .005, 8, 32), '#d1aa73', 0, .013, 0, spoon); spoonRim.rotation.x = -Math.PI / 2; spoonRim.scale.set(1, 1.4, 1);
    var coating = mesh(new T.SphereGeometry(.087, 20, 10), '#ba8847', 0, .016, 0, spoon, {roughness:.35}); coating.scale.set(.8, .11, 1.17);
    var spoonPatches = [];
    for (var p = 0; p < 4; p++) {
      var lump = mesh(new T.SphereGeometry(.023, 12, 8), '#a7783f', Math.cos(p * 2.4) * .035, .028, Math.sin(p * 2.4) * .048, spoon); lump.scale.y = .25; spoonPatches.push(lump);
    }
    var drip = mesh(new T.SphereGeometry(.017, 12, 8), '#c3985c', 0, -.027, -.102, spoon); drip.scale.set(.65, 1.5, .65);
    var spoonOil = mesh(new T.SphereGeometry(.018, 12, 8), '#ecc04b', -.025, .031, -.025, spoon, {roughness:.15}); spoonOil.scale.y = .22;
    var spoonPool = mesh(new T.SphereGeometry(.031, 16, 10), '#efd5a1', .022, .031, -.047, spoon, {roughness:.2}); spoonPool.scale.set(.75, .12, 1.35);
    var spoonSpecks = [];
    for (var s = 0; s < 5; s++) {
      var crumb = mesh(new T.SphereGeometry(.008, 8, 6), '#453023', Math.cos(s * 2.399) * .043, .035, Math.sin(s * 2.399) * .06, spoon); crumb.scale.set(1.5, .2, .8); spoonSpecks.push(crumb);
    }
    var startRing = mesh(new T.RingGeometry(.055, .066, 32), '#fff8e2', -.45, .124, 0, null, {side:T.DoubleSide, roughness:1}); startRing.rotation.x = -Math.PI / 2;
    var guides = [];
    for (var d = 0; d < 5; d++) {
      var dash = mesh(new T.PlaneGeometry(.055, .01), '#fff2d3', -.28 + d * .14, .123, 0, null, {side:T.DoubleSide}); dash.rotation.x = -Math.PI / 2; guides.push(dash);
    }
    var arrowShape = new T.Shape(); arrowShape.moveTo(.4, -.035); arrowShape.lineTo(.46, 0); arrowShape.lineTo(.4, .035); arrowShape.lineTo(.412, 0); arrowShape.closePath();
    var arrow = mesh(new T.ShapeGeometry(arrowShape), '#fff2d3', 0, .124, 0, null, {side:T.DoubleSide}); arrow.rotation.x = -Math.PI / 2; guides.push(arrow);
    canvas.className = 'bench-sauce-canvas'; canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:pan-y;cursor:grab;border-radius:10px';
    host.classList.add('bench-scene'); host.style.aspectRatio = '430 / 270'; host.style.width = '100%'; host.style.maxWidth = '430px'; host.style.margin = '.5rem auto';
    host.append(canvas); host.hidden = false; host.dataset.sceneActive = 'true';
    function listen(target, name, handler, options) { target.addEventListener(name, handler, options); listeners.push([target, name, handler, options]); }
    function notify(name, value) { if (typeof hooks[name] === 'function') hooks[name](value); }
    function render() { if (active && !disposed) renderer.render(scene, camera); }
    function projected(x, y, z) {
      var v = new T.Vector3(x, y, z).project(camera);
      return {x:(v.x + 1) / 2, y:(1 - v.y) / 2};
    }
    function targets() {
      camera.updateMatrixWorld(); scene.updateMatrixWorld(true);
      canvas.dataset.sauceStart = JSON.stringify(projected(-.45, .111, 0)); canvas.dataset.sauceEnd = JSON.stringify(projected(.43, .111, 0));
      var bowlPoint = new T.Vector3(0, .025, 0).applyMatrix4(spoon.matrixWorld);
      canvas.dataset.sauceSpoon = JSON.stringify(projected(bowlPoint.x, bowlPoint.y, bowlPoint.z));
    }
    function resize() {
      if (!active || disposed) return;
      var width = host.clientWidth || 430, height = host.clientHeight || width * 270 / 430;
      camera.aspect = width / Math.max(1, height); camera.updateProjectionMatrix(); renderer.setSize(width, height, false);
      targets(); render();
    }
    function eventRay(event) {
      var bounds = canvas.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return false;
      pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, 1 - (event.clientY - bounds.top) / bounds.height * 2);
      ray.setFromCamera(pointer, camera); return true;
    }
    function local(event) {
      if (!eventRay(event)) return null;
      return ray.ray.intersectPlane(plane, hit) ? {x:hit.x, z:hit.z} : null;
    }
    function hitsSpoon(event) {
      if (!spoon.visible || !eventRay(event)) return false;
      return ray.intersectObject(spoon, true).some(function(hit) { return hit.object.visible; });
    }
    function release(pointerId) {
      try { if (canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId); } catch (error) { /* Capture may already be released by the browser. */ }
      canvas.style.cursor = view.inspection === 'trail' ? 'grab' : 'default';
    }
    function cancel(silent) {
      if (!drag) return;
      var pointerId = drag.id, kind = drag.kind; drag = null; release(pointerId);
      if (!silent && kind === 'trail') notify('onCancel');
    }
    function setView(next) {
      if (!active || disposed) return;
      var inspection = next.inspection === 'spoon' || next.inspection === 'oil' ? next.inspection : 'trail';
      if (next.reading !== reading || inspection !== view.inspection) cancel(false);
      reading = next.reading || null;
      view = {elapsed:Number.isFinite(next.elapsed) ? Math.max(0, next.elapsed) : 0, drawing:!!next.drawing && inspection === 'trail', progress:Number.isFinite(next.progress) ? Math.max(0, Math.min(1, next.progress)) : 1, inspection:inspection};
      var c = S.cues(reading), seconds = reading && reading.closureSeconds;
      var fraction = view.drawing ? 1 : seconds === 0 ? 1 : Number.isFinite(seconds) && seconds > 0 ? Math.max(0, 1 - view.elapsed / seconds) : 0;
      var end = -.45 + .87 * view.progress, width = .064 * fraction;
      trail.visible = inspection === 'trail' && !!reading && view.progress > .001 && width > .0001; trail.position.x = (-.45 + end) / 2; trail.scale.set(Math.max(.001, .87 * view.progress), width, 1);
      spoon.position.set(view.drawing ? end : view.progress > .99 ? .46 : -.45, view.drawing ? .14 : .245, view.drawing ? 0 : .06);
      spoon.rotation.set(view.drawing ? 0 : -.16, 0, view.drawing ? 0 : -.08);
      spoon.visible = !!reading && inspection !== 'oil'; coating.visible = !!c && !c.patches; coating.material.opacity = c && c.thin ? .55 : 1; coating.material.transparent = !!c && c.thin;
      spoonPatches.forEach(function(object) { object.visible = !!c && c.patches; }); drip.visible = !!c && c.thin && !view.drawing; spoonOil.visible = !!c && c.oilDroplets;
      spoonPool.visible = !!c && c.pooling === true && Number.isFinite(c.poolFraction);
      if (spoonPool.visible) { var spoonPoolSize = .35 + .65 * Math.sqrt(c.poolFraction); spoonPool.scale.set(.75 * spoonPoolSize, .12, 1.35 * spoonPoolSize); }
      spoonSpecks.forEach(function(object) { object.visible = !!c && c.scorched; });
      patches.forEach(function(object) { object.visible = !!c && c.patches; }); drops.forEach(function(object) { object.visible = !!c && c.oilDroplets; }); specks.forEach(function(object) { object.visible = !!c && c.scorched; });
      pool.visible = !!c && c.pooling === true && Number.isFinite(c.poolFraction);
      if (pool.visible) { var size = .35 + .65 * Math.sqrt(c.poolFraction); pool.scale.set(size * 1.2, size * .7, 1); }
      startRing.visible = inspection === 'trail' && !!reading; guides.forEach(function(object) { object.visible = inspection === 'trail' && !!reading && !view.drawing; });
      pan.visible = inspection !== 'spoon'; spoon.scale.setScalar(inspection === 'spoon' ? 3 : 1);
      if (inspection === 'spoon') {
        spoon.position.set(0, .6, -.25); spoon.rotation.set(-.16, -.2, -.08);
        camera.position.set(.1, 2.35, 2.65); camera.lookAt(0, .59, .35); camera.zoom = 1.3;
      } else if (inspection === 'oil') {
        camera.position.set(0, 2.6, .8); camera.lookAt(0, .11, 0); camera.zoom = .96;
      } else {
        camera.position.set(0, 2.8, 2.6); camera.lookAt(.08, .02, 0); camera.zoom = 1.2;
      }
      camera.updateProjectionMatrix(); targets(); if (!drag) canvas.style.cursor = inspection === 'trail' ? 'grab' : 'default';
      host.dataset.inspection = inspection; canvas.dataset.inspection = inspection;
      canvas.dataset.sauceProgress = String(view.progress); canvas.dataset.sauceTrailFraction = String(fraction); canvas.dataset.sauceDrawing = String(view.drawing);
      canvas.dataset.sauceBody = c && c.bodyType || reading && reading.type || 'unavailable'; canvas.dataset.sauceOil = c && c.oilDroplets ? 'separated' : 'dispersed'; canvas.dataset.saucePooling = String(!!c && c.pooling === true);
      canvas.dataset.sauceSpoonPool = String(spoonPool.visible); canvas.dataset.sauceSpoonPatches = String(!!c && c.patches);
      render();
    }
    function start(event) {
      if (!active || disposed || drag || !reading || view.inspection !== 'trail' || event.isPrimary === false || event.button !== 0) return;
      if (hitsSpoon(event)) {
        drag = {id:event.pointerId, kind:'inspect', x:event.clientX, y:event.clientY};
        try { canvas.setPointerCapture(event.pointerId); } catch (error) { drag = null; return; }
        event.preventDefault(); canvas.style.cursor = 'pointer'; return;
      }
      var gesture = S.start(local(event)); if (!gesture) return;
      drag = {id:event.pointerId, kind:'trail', gesture:gesture};
      try { canvas.setPointerCapture(event.pointerId); } catch (error) { drag = null; return; }
      event.preventDefault(); canvas.style.cursor = 'grabbing'; notify('onPreview', 0);
    }
    function move(event) {
      if (!drag || drag.id !== event.pointerId) return;
      if (drag.kind === 'inspect') { if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 10) cancel(true); return; }
      event.preventDefault(); drag.gesture = S.move(drag.gesture, local(event));
      if (drag.gesture.invalid) { cancel(false); return; }
      notify('onPreview', drag.gesture.progress);
    }
    function end(event) {
      if (!drag || drag.id !== event.pointerId) return;
      if (drag.kind === 'inspect') {
        var inspectId = drag.id, inspect = Math.hypot(event.clientX - drag.x, event.clientY - drag.y) <= 10 && hitsSpoon(event);
        drag = null; release(inspectId); event.preventDefault(); if (inspect) notify('onInspect', 'spoon'); return;
      }
      event.preventDefault(); var gesture = S.move(drag.gesture, local(event)), pointerId = drag.id;
      drag = null; release(pointerId);
      if (S.complete(gesture)) notify('onComplete'); else notify('onCancel');
    }
    function unavailable(event) {
      if (event) event.preventDefault(); if (!active) return;
      cancel(false); active = false; host.dataset.sceneActive = 'false'; host.hidden = true; notify('onAvailability', false);
      if (resizeObserver) resizeObserver.disconnect();
    }
    listen(canvas, 'pointerdown', start); listen(canvas, 'pointermove', move); listen(canvas, 'pointerup', end);
    listen(canvas, 'pointercancel', function(event) { if (drag && event.pointerId === drag.id) cancel(false); });
    listen(canvas, 'lostpointercapture', function(event) { if (drag && event.pointerId === drag.id) cancel(false); });
    listen(win, 'keydown', function(event) { if (event.key === 'Escape' && drag) { event.preventDefault(); cancel(false); } });
    listen(win, 'blur', function() { cancel(false); }); listen(doc, 'visibilitychange', function() { if (doc.hidden) cancel(false); });
    listen(canvas, 'webglcontextlost', unavailable);
    if (win.ResizeObserver) { resizeObserver = new win.ResizeObserver(resize); resizeObserver.observe(host); }
    else listen(win, 'resize', resize);
    resize(); setView({reading:null, elapsed:0, drawing:false, progress:0}); notify('onAvailability', true);
    return {
      update:setView,
      cancel:function() { cancel(false); },
      dispose:function() {
        if (disposed) return; cancel(true); disposed = true; active = false;
        if (resizeObserver) resizeObserver.disconnect();
        listeners.forEach(function(item) { item[0].removeEventListener(item[1], item[2], item[3]); });
        scene.traverse(function(object) { if (object.geometry) object.geometry.dispose(); if (object.material) object.material.dispose(); });
        renderer.dispose(); if (renderer.forceContextLoss) renderer.forceContextLoss(); canvas.remove(); host.dataset.sceneActive = 'false'; host.hidden = true;
      }
    };
  }
  root.KitchenSauceBenchScene = {mount:mount};
})(typeof window !== 'undefined' ? window : globalThis);
