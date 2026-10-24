/* Controlled distance-detail companion. Owns one demand-rendered WebGL context;
 * the two detail conditions are filtered copies of the same rendered image.
 * No hunting state, animation clock, automatic camera fitting, or listeners.
 */
(function (global) {
  'use strict';
  if (global.RaptorDistanceScene) return;
  var WIDTH = 1024, HEIGHT = 512, PANEL_WIDTH = .30, PANEL_HEIGHT = .15;

  function freeze(value) {
    if (value && typeof value === 'object') {
      Object.keys(value).forEach(function (key) { freeze(value[key]); });
      Object.freeze(value);
    }
    return value;
  }
  function create(options) {
    options = options || {};
    var THREE = options.THREE, catalog = options.catalog, model = options.model;
    var renderer = null, bird = null, scene = null, camera = null, placement = null, texture = null;
    var resources = [], disposed = false, birdDisposed = false, rendererDisposed = false;
    var allocations = 0, drawCount = 0, textureUpdates = 0, previousPattern = '', diagnostics = null;
    var nativeBounds = null, nativeMeshes = 0, nativeVertices = 0, textureBytes = null;
    var canvasContexts = [], outputCanvases = [options.wideCanvas, options.referenceCanvas, options.eagleCanvas];
    var center = null, currentSettings = null;
    var catalogVegetation = { mode: 'fallback', fallback: true, reason: 'unavailable', assets: [],
      placement: { sceneUnits: 'metres', animated: false, protectsDetailFov: .75, throughDistanceM: 300 } };

    function own(resource) { resources.push(resource); allocations++; return resource; }
    function material(color) { return own(new THREE.MeshLambertMaterial({ color: color })); }
    function mesh(geometry, surface, parent) {
      var object = new THREE.Mesh(geometry, surface); (parent || scene).add(object); return object;
    }
    function clearOutputs() {
      canvasContexts.forEach(function (context) {
        context.save(); context.filter = 'none'; context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, WIDTH, HEIGHT); context.restore();
      });
    }
    function dispose() {
      if (disposed) return;
      disposed = true;
      if (bird && !birdDisposed) { birdDisposed = true; bird.dispose(); }
      resources.forEach(function (resource) { resource.dispose(); }); resources.length = 0;
      if (renderer && !rendererDisposed) {
        rendererDisposed = true; renderer.dispose(); renderer.forceContextLoss();
      }
      clearOutputs();
      bird = null; placement = null; scene = null; camera = null; texture = null; textureBytes = null;
      renderer = null;
    }
    function vegetationData() {
      var ids = ['plant.meadow-grass', 'plant.meadow-shrub'], result = [];
      // Optional decoration is atomic: a missing or incompatible provider keeps
      // the original scenery intact, without affecting the observation activity.
      if (typeof catalog.createData !== 'function' || typeof catalog.get !== 'function') return null;
      try {
        for (var i = 0; i < ids.length; i++) {
          var entry = catalog.get(ids[i], '1.0.0');
          if (!entry || !catalog.available(ids[i], '1.0.0')) return null;
          if (entry.units !== 'authored-relative' || entry.representation !== 'triangle-data') {
            catalogVegetation.reason = 'incompatible-contract'; return null;
          }
          var data = catalog.createData(ids[i], '1.0.0');
          if (!data || !Array.isArray(data.positions) || !Array.isArray(data.colors) || !data.positions.length ||
              data.positions.length % 9 !== 0 || data.colors.length !== data.positions.length ||
              !data.positions.every(Number.isFinite) || !data.colors.every(Number.isFinite) ||
              !Number.isInteger(data.smoothVertices) || data.smoothVertices < 0 || data.smoothVertices > data.positions.length / 3) {
            catalogVegetation.reason = 'invalid-data'; return null;
          }
          result.push({ entry: entry, data: data });
        }
      } catch (error) { catalogVegetation.reason = 'provider-error'; return null; }
      return result;
    }
    function makeCatalogVegetation(items) {
      var transform = new THREE.Object3D(), tint = new THREE.Color();
      items.forEach(function (item, kind) {
        var data = item.data, geometry = own(new THREE.BufferGeometry());
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(data.colors, 3));
        geometry.computeVertexNormals();
        // The native contract marks the spherical canopy core for smooth
        // normals. Its separate leaf folds keep their own face normals.
        for (var vertex = 0; vertex < data.smoothVertices; vertex++) {
          var at = vertex * 3, x = data.positions[at], y = data.positions[at + 1], z = data.positions[at + 2];
          var length = Math.hypot(x, y, z);
          if (length > 0) geometry.attributes.normal.setXYZ(vertex, x / length, y / length, z / length);
        }
        geometry.computeBoundingBox(); geometry.computeBoundingSphere();
        var bounds = geometry.boundingBox, shrub = kind === 1, count = shrub ? 24 : 288;
        var surface = own(new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true, side: THREE.DoubleSide }));
        var patch = own(new THREE.InstancedMesh(geometry, surface, count));
        patch.name = shrub ? 'distance-catalog-meadow-shrubs' : 'distance-catalog-meadow-grass';
        var palette = shrub ? [0x5e784e, 0x71834f, 0x667d50, 0x7a8959] : [0x73884d, 0x819453, 0x667d48, 0x8a985d];
        var minimum = [Infinity, Infinity, Infinity], maximum = [-Infinity, -Infinity, -Infinity];
        var depthBounds = [Infinity, -Infinity], smallestClearance = Infinity;
        var nativeRadius = Math.hypot(Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x)), Math.max(Math.abs(bounds.min.z), Math.abs(bounds.max.z)));
        for (var i = 0; i < count; i++) {
          var pair = Math.floor(i / 2), side = i % 2 ? 1 : -1;
          var row = shrub ? pair : Math.floor(pair / 12), lane = shrub ? 0 : pair % 12;
          var depth = shrub ? -7 - row * 6.2 : -4 - row * 6 - (lane % 3) * .9 - .15 * Math.sin(pair * .9);
          // These scales belong to this host. The catalog remains in relative
          // authored units; no botanical dimensions or species are inferred.
          var sx = shrub ? .55 + row % 4 * .11 : .30 + pair % 5 * .055;
          var sy = shrub ? .30 + row % 5 * .06 : .32 + pair % 7 * .047;
          var sz = shrub ? .52 + row % 3 * .13 : .31 + pair % 4 * .062;
          var radius = nativeRadius * Math.max(sx, sz);
          // Even the farthest allowed observer's crop misses the full rotated
          // bounds. A margin keeps its filtered edges clear of new vegetation.
          var cropEdge = (300 - depth + radius) * Math.tan(.75 * Math.PI / 360);
          var spread = shrub ? 2.3 + row % 3 * 1.15 : .35 + (lane * 7 % 12) * .31 + .45 * Math.pow(Math.sin(row * .7), 2);
          var across = cropEdge + radius + .30 + spread;
          transform.position.set(side * across, -bounds.min.y * sy, depth);
          transform.rotation.set(0, i * 2.399963 + (shrub ? .4 : 0), 0);
          transform.scale.set(sx, sy, sz); transform.updateMatrix(); patch.setMatrixAt(i, transform.matrix);
          tint.setHex(palette[(pair + row) % palette.length]); patch.setColorAt(i, tint);
          [sx, sy, sz].forEach(function (scale, axis) { minimum[axis] = Math.min(minimum[axis], scale); maximum[axis] = Math.max(maximum[axis], scale); });
          depthBounds[0] = Math.min(depthBounds[0], depth - radius); depthBounds[1] = Math.max(depthBounds[1], depth + radius);
          smallestClearance = Math.min(smallestClearance, across - radius - cropEdge);
        }
        patch.instanceMatrix.needsUpdate = true; patch.instanceColor.needsUpdate = true;
        scene.add(patch);
        catalogVegetation.assets.push({
          id: item.entry.id, version: item.entry.version, nativeUnits: item.entry.units,
          nativeBounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
          nativeVertices: data.positions.length / 3, smoothVertices: data.smoothVertices, instances: count,
          hostScale: { units: 'scene-metres per authored-relative unit', min: minimum, max: maximum },
          depthBoundsM: depthBounds, detailClearanceM: smallestClearance
        });
      });
      catalogVegetation.mode = 'catalog'; catalogVegetation.fallback = false; catalogVegetation.reason = null;
    }
    function makeFallbackVegetation() {
      // Preserve the existing shape, placement, materials and resource count
      // when optional meadow assets are absent (including older bundles).
      var bladeGeometry = own(new THREE.ConeGeometry(.065, .38, 3));
      var blades = own(new THREE.InstancedMesh(bladeGeometry, material(0x637a49), 80));
      var transform = new THREE.Object3D();
      for (var i = 0; i < 80; i++) {
        var side = i % 2 ? 1 : -1;
        transform.position.set(side * (.95 + (i * 17 % 31) * .31), .15, -2 - (i * 11 % 67));
        transform.rotation.set(.08 * Math.sin(i), i * 2.399963, .1 * Math.cos(i));
        transform.scale.setScalar(.8 + (i % 5) * .11); transform.updateMatrix(); blades.setMatrixAt(i, transform.matrix);
      }
      scene.add(blades);
    }
    function makeEnvironment() {
      // Fixed surroundings provide visual context, not a distance-dependent
      // atmosphere or camouflage manipulation. All measurements are scene metres.
      scene.background = new THREE.Color(0xcbd9ce);
      scene.add(new THREE.HemisphereLight(0xfff5df, 0x61734b, .85));
      var sunlight = new THREE.DirectionalLight(0xfff5df, .7); sunlight.position.set(-3, 6, 4); scene.add(sunlight);
      var ground = mesh(own(new THREE.PlaneGeometry(2000, 2000)), material(0x83936a)); ground.rotation.x = -Math.PI / 2;
      var path = mesh(own(new THREE.PlaneGeometry(1.45, 160)), material(0xb5aa83)); path.rotation.x = -Math.PI / 2; path.position.set(0, .001, -78);
      var bark = material(0x65533c), leaves = material(0x6b8056), leafShade = material(0x58704d);
      var trunkGeometry = own(new THREE.CylinderGeometry(.18, .25, 4, 6));
      var crownGeometry = own(new THREE.SphereGeometry(1.9, 8, 6));
      for (var tree = 0; tree < 14; tree++) {
        var sign = tree % 2 ? 1 : -1, depth = -12 - Math.floor(tree / 2) * 15;
        var x = sign * (5.4 + tree % 3 * 4.2);
        var trunk = mesh(trunkGeometry, bark); trunk.position.set(x, 2, depth);
        var crown = mesh(crownGeometry, tree % 3 ? leaves : leafShade); crown.position.set(x, 4.6 + tree % 2 * .4, depth); crown.scale.set(1, 1.25, .85);
      }
      var vegetation = vegetationData();
      if (vegetation) makeCatalogVegetation(vegetation); else makeFallbackVegetation();
      var wood = material(0x806746);
      var postGeometry = own(new THREE.CylinderGeometry(.009, .011, .43, 7));
      [-.13, .13].forEach(function (x) { var post = mesh(postGeometry, wood); post.position.set(x, .215, -.012); });
      var board = mesh(own(new THREE.BoxGeometry(PANEL_WIDTH + .012, PANEL_HEIGHT + .012, .012)), wood); board.position.set(0, .5, -.008);
      var perch = mesh(own(new THREE.CylinderGeometry(.014, .022, .342, 9)), wood); perch.position.set(.36, .171, 0);
      var cap = mesh(own(new THREE.BoxGeometry(.35, .016, .10)), wood); cap.position.set(.36, .342, 0);
    }
    function makePlaque() {
      textureBytes = new Uint8Array(1024 * 64 * 3);
      texture = own(new THREE.DataTexture(textureBytes, 1024, 64, THREE.RGBFormat));
      texture.encoding = THREE.LinearEncoding; texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.generateMipmaps = true; texture.unpackAlignment = 1;
      var surface = own(new THREE.MeshBasicMaterial({ map: texture, color: 0xffffff, toneMapped: false }));
      var plaque = mesh(own(new THREE.PlaneGeometry(PANEL_WIDTH, PANEL_HEIGHT)), surface); plaque.position.set(0, .5, 0);
    }
    function pattern(settings) {
      var key = settings.cycles + '/' + settings.contrast;
      if (key === previousPattern) return;
      previousPattern = key;
      // The slider controls code-value contrast around a constant midpoint.
      // An uncalibrated display does not establish physical luminance contrast.
      var amplitude = .5 * settings.contrast / 100;
      for (var x = 0; x < 1024; x++) {
        var value = Math.round(255 * (.5 + amplitude * Math.cos((x + .5) / 1024 * settings.cycles * Math.PI * 2)));
        for (var y = 0; y < 64; y++) {
          var offset = (y * 1024 + x) * 3; textureBytes[offset] = value; textureBytes[offset + 1] = value; textureBytes[offset + 2] = value;
        }
      }
      texture.needsUpdate = true; textureUpdates++;
    }
    function setCamera(horizontalFov, distance) {
      camera.fov = 2 * Math.atan(Math.tan(horizontalFov * Math.PI / 360) * HEIGHT / WIDTH) * 180 / Math.PI;
      camera.aspect = WIDTH / HEIGHT; camera.position.set(0, .5, distance); camera.lookAt(center); camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
      return {
        horizontalFov: horizontalFov, verticalFov: camera.fov, position: camera.position.toArray(),
        target: center.toArray(), projectionMatrix: camera.projectionMatrix.toArray(), matrixWorld: camera.matrixWorld.toArray()
      };
    }
    function copy(context, sigma) {
      context.save(); context.setTransform(1, 0, 0, 1, 0, 0);
      context.filter = 'none'; context.clearRect(0, 0, WIDTH, HEIGHT);
      context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high';
      context.filter = sigma > 0 ? 'blur(' + sigma + 'px)' : 'none';
      context.drawImage(renderer.domElement, 0, 0, WIDTH, HEIGHT); context.restore();
    }
    function snapshot() {
      var result = diagnostics ? JSON.parse(JSON.stringify(diagnostics)) : {};
      result.lifecycle = {
        disposed: disposed, liveContexts: renderer && !rendererDisposed ? 1 : 0,
        rendererCreated: !!renderer || rendererDisposed, rendererDisposed: rendererDisposed,
        birdDisposed: birdDisposed, ownedResourceCount: resources.length, allocationCount: allocations,
        renderCount: drawCount, textureUpdates: textureUpdates
      };
      return freeze(result);
    }
    function update(settings) {
      if (disposed) throw new Error('The distance-detail scene is closed.');
      currentSettings = model.normalize(settings);
      var referenceSigma = model.gaussianSigmaPixels(60, WIDTH), eagleSigma = model.gaussianSigmaPixels(140, WIDTH);
      if (!Number.isFinite(referenceSigma) || referenceSigma < 0 || !Number.isFinite(eagleSigma) || eagleSigma < 0) throw new Error('The detail filter is unavailable.');
      pattern(currentSettings);
      var wide = setCamera(20, currentSettings.distance);
      renderer.render(scene, camera); drawCount++; copy(canvasContexts[0], 0);
      var detail = setCamera(.75, currentSettings.distance);
      renderer.render(scene, camera); drawCount++;
      // Both conditions copy this exact last rendering. Neither camera, object
      // size, source contrast, nor lighting changes between these two copies.
      copy(canvasContexts[1], referenceSigma); copy(canvasContexts[2], eagleSigma);
      var frameWidth = 2 * currentSettings.distance * Math.tan(.75 * Math.PI / 360);
      diagnostics = {
        assetId: 'animal.mourning-dove', assetVersion: '1.0.0', quality: 'low', units: 'metres',
        rootScale: bird.root.scale.toArray(), rootPosition: bird.root.position.toArray(), nativeBounds: nativeBounds,
        nativeMeshes: nativeMeshes, nativeVertices: nativeVertices, placementPosition: placement.position.toArray(),
        fixedPose: { flight: 0, phase: 0, walking: 0, peck: 0, lookYaw: 0 },
        catalogVegetation: catalogVegetation,
        settings: currentSettings, metrics: model.metrics(currentSettings),
        sourceSize: { width: WIDTH, height: HEIGHT }, wideCamera: wide, detailCamera: detail,
        sharedDetailSource: true, pixelSigmas: { reference: referenceSigma, eagle: eagleSigma },
        cutoffCyclesPerDegree: { reference: 60, eagle: 140 },
        plaque: { widthM: PANEL_WIDTH, heightM: PANEL_HEIGHT, center: [0, .5, 0], cycles: currentSettings.cycles,
          codeValueContrastPercent: currentSettings.contrast, codeValueMidpoint: .5,
          physicalLuminanceCalibrated: false, detailWidthPixels: PANEL_WIDTH / frameWidth * WIDTH,
          fitsDetailFrame: PANEL_WIDTH <= frameWidth && PANEL_HEIGHT <= frameWidth * HEIGHT / WIDTH },
        lighting: 'fixed linear output, no fog or distance attenuation', automaticCameraFit: false,
        renderer: { calls: renderer.info.render.calls, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures }
      };
      return snapshot();
    }

    try {
      if (!THREE || String(THREE.REVISION) !== '128') throw new Error('The local Three.js r128 engine is required.');
      if (!catalog || typeof catalog.available !== 'function' || !catalog.available('animal.mourning-dove', '1.0.0')) throw new Error('The mourning-dove catalog asset is unavailable.');
      if (!model || typeof model.normalize !== 'function' || typeof model.metrics !== 'function' || typeof model.gaussianSigmaPixels !== 'function') throw new Error('The distance-detail model is unavailable.');
      outputCanvases.forEach(function (canvas) {
        if (!canvas || typeof canvas.getContext !== 'function') throw new Error('Three output canvases are required.');
        canvas.width = WIDTH; canvas.height = HEIGHT;
        var context = canvas.getContext('2d');
        if (!context || !('filter' in context)) throw new Error('This browser does not support the distance-detail image filter.');
        canvasContexts.push(context);
      });
      scene = new THREE.Scene(); center = new THREE.Vector3(0, .5, 0);
      camera = new THREE.PerspectiveCamera(1, WIDTH / HEIGHT, .01, 2500);
      bird = catalog.create(THREE, 'animal.mourning-dove', '1.0.0', { quality: 'low' });
      bird.update({ flight: 0, phase: 0, walking: 0, peck: 0, lookYaw: 0 }); bird.root.updateMatrixWorld(true);
      var bounds = new THREE.Box3().setFromObject(bird.root);
      nativeBounds = { min: bounds.min.toArray(), max: bounds.max.toArray(), size: bounds.getSize(new THREE.Vector3()).toArray() };
      bird.root.traverse(function (object) { if (object.isMesh) { nativeMeshes++; nativeVertices += object.geometry.attributes.position.count; } });
      placement = new THREE.Group(); placement.position.set(.36, .35, 0); placement.rotation.y = -Math.PI / 2;
      placement.add(bird.root); scene.add(placement);
      makeEnvironment(); makePlaque();
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true }); allocations++;
      renderer.setPixelRatio(1); renderer.setSize(WIDTH, HEIGHT, false);
      renderer.outputEncoding = THREE.LinearEncoding; renderer.toneMapping = THREE.NoToneMapping;
      return Object.freeze({ update: update, getDiagnostics: snapshot, dispose: dispose });
    } catch (error) { dispose(); throw error; }
  }
  global.RaptorDistanceScene = Object.freeze({ version: '1.0.0', create: create });
})(typeof window !== 'undefined' ? window : globalThis);
