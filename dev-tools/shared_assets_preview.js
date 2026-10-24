/* Isolated, deterministic developer preview. No animation loop or student state. */
(function () {
  'use strict';
  var catalog = window.StemSimAssets, THREE = window.THREE;
  var main = document.getElementById('shared-assets-preview');
  var entrySelect = document.getElementById('asset-entry'), qualitySelect = document.getElementById('asset-quality');
  var poseSelect = document.getElementById('asset-pose'), openButton = document.getElementById('open-preview');
  var closeButton = document.getElementById('close-preview'), status = document.getElementById('preview-status');
  var metadata = document.getElementById('asset-metadata'), views = [], active = false, observer = null;
  var opened = 0, disposedModels = 0, disposedRenderers = 0;
  var POSES = {
    ground: { flight: 0, walking: 0, peck: 0, phase: 0, lookYaw: 0 },
    walk: { flight: 0, walking: .85, stride: 1.7, peck: 0, lookYaw: .12 },
    flight: { flight: 1, phase: 1.25, effort: .7, bank: 0, tailSpread: .5 }
  };

  function selected() { return catalog.get(entrySelect.value, '1.0.0'); }
  function describe() {
    var entry = selected();
    if (!entry) return;
    var isBird = entry.representation === 'three-object';
    qualitySelect.disabled = !isBird; poseSelect.disabled = !isBird;
    main.dataset.assetId = entry.id; main.dataset.assetVersion = entry.version; main.dataset.units = entry.units;
    metadata.replaceChildren();
    var rows = [
      ['Identity', entry.name + ' · ' + entry.id + ' @ ' + entry.version],
      ['Representation', entry.representation + ' · ' + entry.style],
      ['Units', entry.units + '. ' + entry.dimensions],
      ['Coordinates', entry.up + ' up; ' + (entry.forward ? entry.forward + ' forward; ' : 'no forward direction; ') + entry.origin],
      ['Native contract', entry.contract + ' · ' + entry.handle.join(', ')],
      ['Source', entry.source + ' · ' + entry.providerKey],
      ['Ownership', entry.ownership],
      ['Limits', entry.limits.join(' ')]
    ];
    rows.forEach(function (row) {
      var term = document.createElement('dt'), detail = document.createElement('dd');
      term.textContent = row[0]; detail.textContent = row[1]; metadata.append(term, detail);
    });
  }
  function plantHandle(data) {
    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(data.colors, 3));
    geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    var material = new THREE.MeshStandardMaterial({ color: 0x728454, vertexColors: true, roughness: .9, side: THREE.DoubleSide });
    var root = new THREE.Group(), mesh = new THREE.Mesh(geometry, material); root.add(mesh);
    return { root: root, dispose: function () { if (root.parent) root.parent.remove(root); geometry.dispose(); material.dispose(); } };
  }
  function makeHandle(entry, viaCatalog) {
    if (entry.representation === 'three-object') {
      var options = { quality: qualitySelect.value };
      var handle = viaCatalog ? catalog.create(THREE, entry.id, entry.version, options) : window.AvianWoodlandBirds.create(THREE, entry.providerKey, options);
      handle.update(POSES[poseSelect.value]); return handle;
    }
    return plantHandle(viaCatalog ? catalog.createData(entry.id, entry.version) : window.StemMeadow.vegetation(entry.providerKey));
  }
  function counters() {
    main.dataset.previewLive = String(active); main.dataset.openCount = String(opened);
    main.dataset.disposedModels = String(disposedModels); main.dataset.disposedRenderers = String(disposedRenderers);
    openButton.disabled = active; closeButton.disabled = !active;
  }
  function disposeViews() {
    if (observer) { observer.disconnect(); observer = null; }
    views.forEach(function (view) {
      if (view.handle) { view.handle.dispose(); disposedModels++; }
      if (view.renderer) { view.renderer.dispose(); view.renderer.forceContextLoss(); disposedRenderers++; }
      view.pane.dataset.live = 'false';
      view.viewport.replaceChildren();
    });
    views = []; active = false; counters();
  }
  function closedPlaceholder() {
    ['native', 'catalog'].forEach(function (name) {
      var placeholder = document.createElement('div'); placeholder.className = 'placeholder';
      placeholder.textContent = '3D preview is closed. No rendering resources are allocated.';
      document.getElementById(name + '-viewport').replaceChildren(placeholder);
      document.getElementById(name + '-bounds').textContent = 'Bounds will appear when opened.';
      var pane = document.getElementById(name + '-pane');
      ['modelBounds', 'modelMeshes', 'geometryVertices', 'drawCalls', 'modelScale', 'cameraPosition', 'cameraTarget', 'cameraFov', 'geometries', 'textures'].forEach(function (key) { delete pane.dataset[key]; });
    });
  }
  function draw() {
    if (!active || views.length !== 2) return;
    var bounds = views[0].bounds.clone().union(views[1].bounds);
    var center = bounds.getCenter(new THREE.Vector3()), size = bounds.getSize(new THREE.Vector3());
    var radius = Math.max(size.length() * .5, .001), aspect = Math.min.apply(null, views.map(function (view) { return view.viewport.clientWidth / Math.max(1, view.viewport.clientHeight); }));
    var fov = 36, fitAngle = Math.min(fov * Math.PI / 360, Math.atan(Math.tan(fov * Math.PI / 360) * aspect));
    var distance = radius / Math.sin(fitAngle) * 1.15;
    var direction = new THREE.Vector3(1.6, .65, 2.5).normalize();
    views.forEach(function (view) {
      var width = Math.max(1, view.viewport.clientWidth), height = Math.max(1, view.viewport.clientHeight);
      view.renderer.setSize(width, height, false);
      view.camera.aspect = width / height; view.camera.near = Math.max(.0001, distance / 100); view.camera.far = distance * 100;
      view.camera.position.copy(center).addScaledVector(direction, distance); view.camera.lookAt(center); view.camera.updateProjectionMatrix();
      view.renderer.render(view.scene, view.camera);
      view.pane.dataset.drawCalls = String(view.renderer.info.render.calls);
      view.pane.dataset.geometries = String(view.renderer.info.memory.geometries); view.pane.dataset.textures = String(view.renderer.info.memory.textures);
      view.pane.dataset.cameraPosition = JSON.stringify(view.camera.position.toArray()); view.pane.dataset.cameraTarget = JSON.stringify(center.toArray());
      view.pane.dataset.cameraFov = String(fov);
    });
  }
  function openPreview() {
    disposeViews(); describe();
    var entry = selected();
    try {
      if (!THREE || !entry || !catalog.available(entry.id, entry.version)) throw new Error('The selected local provider is unavailable.');
      ['native', 'catalog'].forEach(function (name) {
        var view = { pane: document.getElementById(name + '-pane'), viewport: document.getElementById(name + '-viewport') };
        views.push(view);
        view.handle = makeHandle(entry, name === 'catalog');
        view.scene = new THREE.Scene(); view.scene.background = new THREE.Color(0xe7ecdf);
        view.scene.add(new THREE.HemisphereLight(0xfffbed, 0x77866d, .85));
        var light = new THREE.DirectionalLight(0xfff3db, 2.1); light.position.set(3, 5, 4); view.scene.add(light);
        var fill = new THREE.DirectionalLight(0xe1ecff, .6); fill.position.set(-3, 2, -2); view.scene.add(fill);
        view.scene.add(view.handle.root); view.handle.root.updateMatrixWorld(true);
        view.bounds = new THREE.Box3().setFromObject(view.handle.root);
        view.camera = new THREE.PerspectiveCamera(36, 1, .001, 100);
        view.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
        view.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        view.renderer.outputEncoding = THREE.sRGBEncoding; view.renderer.toneMapping = THREE.ACESFilmicToneMapping; view.renderer.toneMappingExposure = 1;
        view.renderer.domElement.setAttribute('role', 'img');
        view.renderer.domElement.setAttribute('aria-label', entry.name + ', ' + (name === 'catalog' ? 'shared catalog' : 'native provider') + ', fixed ' + (entry.kind === 'animal' ? poseSelect.options[poseSelect.selectedIndex].text.toLowerCase() + ' pose' : 'geometry'));
        view.viewport.replaceChildren(view.renderer.domElement);
        var meshes = 0, vertices = 0;
        view.handle.root.traverse(function (object) { if (object.isMesh) { meshes++; vertices += object.geometry.attributes.position.count; } });
        var dimensions = view.bounds.getSize(new THREE.Vector3());
        view.pane.dataset.modelBounds = JSON.stringify({ min: view.bounds.min.toArray(), max: view.bounds.max.toArray() });
        view.pane.dataset.modelMeshes = String(meshes); view.pane.dataset.geometryVertices = String(vertices);
        view.pane.dataset.modelScale = JSON.stringify(view.handle.root.scale.toArray()); view.pane.dataset.live = 'true';
        document.getElementById(name + '-bounds').textContent = 'x ' + dimensions.x.toFixed(4) + ' · y ' + dimensions.y.toFixed(4) + ' · z ' + dimensions.z.toFixed(4) + ' ' + entry.units;
      });
      active = true; opened++; counters(); draw();
      if (window.ResizeObserver) { observer = new ResizeObserver(draw); views.forEach(function (view) { observer.observe(view.viewport); }); }
      status.textContent = entry.name + ': both views use the same native units, fixed pose, lighting, and camera. No automatic animation.';
    } catch (error) {
      disposeViews(); closedPlaceholder(); status.textContent = 'Preview could not open: ' + error.message;
    }
  }
  if (!catalog) { status.textContent = 'The local asset catalog is unavailable.'; openButton.disabled = true; return; }
  catalog.list().forEach(function (entry) { var option = document.createElement('option'); option.value = entry.id; option.textContent = entry.name; entrySelect.append(option); });
  [entrySelect, qualitySelect, poseSelect].forEach(function (control) {
    control.addEventListener('change', function () { describe(); if (active) openPreview(); else status.textContent = 'Metadata updated. Open preview to create the two 3D views.'; });
  });
  openButton.addEventListener('click', openPreview);
  closeButton.addEventListener('click', function () { disposeViews(); closedPlaceholder(); status.textContent = 'Preview closed. Both models and renderers have been disposed.'; openButton.focus(); });
  window.addEventListener('pagehide', disposeViews);
  window.addEventListener('resize', draw);
  describe(); counters();
})();
