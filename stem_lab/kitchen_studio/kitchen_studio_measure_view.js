/* Jug inspection changes the viewpoint. The shared action gateway checks the reading. */
(function (root) {
  'use strict';

  function mount(host) {
    var doc = host.canvas.ownerDocument;
    var win = doc.defaultView || root;
    var camera = host.camera;
    var controls = host.controls;
    var origin = host.origin;
    var section = doc.getElementById('studioMeasureView');
    var panel = doc.getElementById('studioMeasurePanel');
    var openButton = doc.getElementById('studioMeasureOpen');
    var heightInput = doc.getElementById('studioMeasureHeight');
    var alignButton = doc.getElementById('studioMeasureAlign');
    var checkButton = doc.getElementById('studioMeasureCheck');
    var closeButton = doc.getElementById('studioMeasureClose');
    var readout = doc.getElementById('studioMeasureReadout');
    var angleOutput = doc.getElementById('studioMeasureAngle');
    var options = {active: false, visible: true, locked: false, historical: false};
    var savedView = null;
    var opened = false;
    var disposed = false;
    var height = 100;
    var previewMl = null;
    var listeners = [];

    function listen(target, name, callback) {
      target.addEventListener(name, callback);
      listeners.push(function () { target.removeEventListener(name, callback); });
    }

    function locked() {
      return options.locked || host.getLocked();
    }

    function amount() {
      var value = host.getAmount();
      return Number.isFinite(value) ? Math.max(0, Math.min(1000, value)) : 0;
    }

    function text(node, value) {
      if (node.textContent !== value) node.textContent = value;
    }

    function refresh() {
      var ml = amount();
      var shownMl = previewMl === null ? ml : previewMl;
      var surfaceY = 1.35 + .0006 * ml;
      var available = options.active && options.visible;
      var atLevel = height === 0;
      section.hidden = !available;
      panel.hidden = !opened;
      openButton.disabled = !available;
      openButton.setAttribute('aria-expanded', String(opened));
      checkButton.disabled = !opened || !available || locked() || !atLevel || previewMl !== null;
      heightInput.value = String(height);
      var angle = atLevel ? (ml ? 'At liquid level' : 'Level view of empty jug') : 'Above the liquid';
      if (!ml && !atLevel) angle = 'Above the zero mark';
      text(alignButton, ml ? 'Lower to liquid level' : 'View empty jug level');
      text(angleOutput, angle);
      heightInput.setAttribute('aria-valuetext', atLevel ? angle : angle + ', viewpoint height ' + height + ' of 100');
      var description = ml ? 'contains ' + ml + ' mL. ' : 'is empty. ';
      var instruction = atLevel ? 'Compare the level guide with the scale.' : 'Lower your viewpoint to line up with the scale.';
      if (!ml) instruction = 'Add stock to compare its liquid level with the scale.';
      var reading = (options.historical ? 'Recorded jug ' : 'Jug ') + description + instruction;
      if (previewMl !== null) reading = 'Preview ' + shownMl + ' mL. Release to apply the adjustment, or press Escape to keep ' + ml + ' mL.';
      text(readout, reading);

      host.canvas.dataset.measureInspection = String(opened);
      host.canvas.dataset.measureEyeHeight = String(height);
      host.canvas.dataset.measureEyeMl = String(ml);
      host.guide.visible = opened && shownMl > 0;
      host.guide.position.y = 1.35 + .0006 * shownMl;
      if (!opened) return;

      var eyeLevel = ml ? surfaceY : 1.65;
      controls.target.set(origin.x + .03, eyeLevel, origin.z + .277);
      camera.position.set(origin.x + .03, eyeLevel + .7 * height / 100, origin.z + 3.5);
      camera.zoom = 2.55;
      camera.updateProjectionMatrix();
      controls.update();
      host.draw();
    }

    function open() {
      if (disposed || !options.active || !options.visible) return;
      host.cancel();
      if (!opened) {
        savedView = {
          position: camera.position.clone(),
          quaternion: camera.quaternion.clone(),
          zoom: camera.zoom,
          target: controls.target.clone(),
          enableRotate: controls.enableRotate,
          enableZoom: controls.enableZoom,
          maxPolarAngle: controls.maxPolarAngle
        };
        opened = true;
        height = 100;
        controls.enableRotate = false;
        controls.enableZoom = false;
        controls.maxPolarAngle = Math.PI / 2;
        host.onViewChange(true);
      }
      refresh();
    }

    function close() {
      if (!opened) return;
      host.cancel();
      opened = false;
      previewMl = null;
      host.onViewChange(false);
      controls.enableRotate = savedView.enableRotate;
      controls.enableZoom = savedView.enableZoom;
      controls.maxPolarAngle = savedView.maxPolarAngle;
      controls.target.copy(savedView.target);
      camera.position.copy(savedView.position);
      camera.zoom = savedView.zoom;
      camera.updateProjectionMatrix();
      controls.update();
      camera.quaternion.copy(savedView.quaternion);
      savedView = null;
      refresh();
      host.draw();
    }

    function update(next) {
      if (disposed) return;
      Object.assign(options, next || {});
      if (!options.active || !options.visible) close();
      refresh();
    }

    listen(openButton, 'click', open);
    listen(closeButton, 'click', function () {
      close();
      openButton.focus({preventScroll: true});
    });
    listen(heightInput, 'input', function () {
      if (!opened) return;
      var requestedHeight = Number(heightInput.value) || 0;
      host.cancel();
      height = Math.max(0, Math.min(100, requestedHeight));
      refresh();
    });
    listen(alignButton, 'click', function () {
      if (!opened) return;
      host.cancel();
      height = 0;
      refresh();
    });
    listen(checkButton, 'click', function () {
      if (!opened || !options.active || !options.visible || locked() || height !== 0 || previewMl !== null) return;
      host.cancel();
      host.check();
    });
    listen(doc, 'keydown', function (event) {
      if (event.key === 'Escape' && !event.defaultPrevented && opened) {
        event.preventDefault();
        close();
        openButton.focus({preventScroll: true});
      }
    });
    listen(doc, 'visibilitychange', function () { if (doc.hidden) close(); });
    listen(win, 'pagehide', close);

    refresh();
    return {
      open: open,
      close: close,
      update: update,
      preview: function (ml) {
        if (!opened) return;
        previewMl = Number.isFinite(ml) ? Math.max(0, Math.min(1000, ml)) : null;
        refresh();
      },
      dispose: function () {
        if (disposed) return;
        close();
        disposed = true;
        listeners.forEach(function (remove) { remove(); });
      }
    };
  }

  root.KitchenStudioMeasureView = {mount: mount};
  if (typeof module !== 'undefined' && module.exports) module.exports = root.KitchenStudioMeasureView;
})(typeof window !== 'undefined' ? window : globalThis);
