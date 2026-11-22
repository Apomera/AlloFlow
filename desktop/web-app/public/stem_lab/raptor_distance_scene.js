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
    var wideDecorGroup = null, sceneTimeUniform = { value: 2.6 }, sceneHcUniform = { value: 0.0 };
    var catalogVegetation = { mode: 'fallback', fallback: true, reason: 'unavailable', assets: [],
      placement: { sceneUnits: 'metres', animated: false, protectsDetailFov: .75, throughDistanceM: 300 } };

    function prefersReducedMotion() {
      try {
        return typeof window !== 'undefined' && typeof window.matchMedia === 'function' &&
          !!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      } catch (e) { return false; }
    }
    function isHighContrast(el) {
      try {
        if (el && el.closest && (el.closest('.theme-contrast') || el.closest('[data-theme="contrast"]') || el.closest('[data-theme="high-contrast"]'))) return true;
        var root = typeof document !== 'undefined' && document.documentElement;
        if (root && (root.classList.contains('theme-contrast') || root.getAttribute('data-theme') === 'contrast' || root.getAttribute('data-theme') === 'high-contrast')) return true;
        if (typeof document !== 'undefined' && document.body && document.body.classList.contains('theme-contrast')) return true;
        if (typeof window !== 'undefined' && typeof window.matchMedia === 'function' &&
            (window.matchMedia('(forced-colors: active)').matches || window.matchMedia('(prefers-contrast: more)').matches)) return true;
      } catch (e) {}
      return false;
    }

    function own(resource) { resources.push(resource); allocations++; return resource; }
    function material(color, extra) {
      var opts = { color: color };
      if (extra) { Object.keys(extra).forEach(function (k) { opts[k] = extra[k]; }); }
      return own(new THREE.MeshLambertMaterial(opts));
    }
    function makeCanvasTexture(size, draw, rx, ry) {
      if (typeof THREE.CanvasTexture !== 'function' || typeof document === 'undefined' || typeof document.createElement !== 'function') return null;
      try {
        var c = document.createElement('canvas'); c.width = c.height = size;
        var ctx = c.getContext && c.getContext('2d');
        if (!ctx) return null;
        draw(ctx, size);
        var tex = own(new THREE.CanvasTexture(c));
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        if (rx || ry) tex.repeat.set(rx || 1, ry || 1);
        tex.needsUpdate = true;
        return tex;
      } catch (e) { return null; }
    }
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
      wideDecorGroup = null;
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
      var sunlight = new THREE.DirectionalLight(0xfff5df, .72); sunlight.position.set(-3, 6, 4); scene.add(sunlight);
      // Cool sky-rim bounce from the opposite quadrant sculpts the dove, perch and trees
      // without touching the MeshBasicMaterial stripe plaque.
      var skyRim = new THREE.DirectionalLight(0xdcebf8, .24); skyRim.position.set(5, 4, -5); scene.add(skyRim);

      wideDecorGroup = new THREE.Group();
      wideDecorGroup.name = 'distance-wide-atmosphere';
      scene.add(wideDecorGroup);

      // Fixed-output atmospheric sky dome with golden-hour Rayleigh horizon scattering and layered FBM savanna clouds.
      // Directly behind the 0.75° target plaque (alt near 0), luminance stays calm and uniform for acuity integrity.
      if (typeof THREE.ShaderMaterial === 'function' && typeof THREE.SphereGeometry === 'function') {
        var skyMat = own(new THREE.ShaderMaterial({
          side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false,
          uniforms: {
            uTime: sceneTimeUniform,
            uHighContrast: sceneHcUniform,
            zenith: { value: new THREE.Color(0x74a2ce) },
            horizon: { value: new THREE.Color(0xcfdcd1) },
            goldenScatter: { value: new THREE.Color(0xf6dfb8) },
            sunGlow: { value: new THREE.Color(0xfff4d8) },
            sunDir: { value: new THREE.Vector3(-3, 6, 4).normalize() }
          },
          vertexShader: 'varying vec3 vSkyDir; void main(){ vSkyDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
          fragmentShader: [
            'uniform float uTime; uniform float uHighContrast;',
            'uniform vec3 zenith; uniform vec3 horizon; uniform vec3 goldenScatter; uniform vec3 sunGlow; uniform vec3 sunDir;',
            'varying vec3 vSkyDir;',
            'float skyHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }',
            'float skyNoise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);',
            '  return mix(mix(skyHash(i), skyHash(i + vec2(1.0, 0.0)), f.x), mix(skyHash(i + vec2(0.0, 1.0)), skyHash(i + vec2(1.0, 1.0)), f.x), f.y); }',
            'float skyFbm(vec2 p){ float v = 0.0; float a = 0.54; for(int i = 0; i < 3; i++){ v += a * skyNoise(p); p = p * 2.12 + vec2(4.1, 1.7); a *= 0.48; } return v; }',
            'void main(){',
            '  vec3 d = normalize(vSkyDir); float alt = max(0.0, d.y);',
            '  float rayleigh = smoothstep(0.02, 0.58, alt);',
            '  vec3 col = mix(horizon, zenith, rayleigh);',
            '  if (uHighContrast < 0.5) {',
            '    float horizonBand = exp(-alt * 7.5) * smoothstep(0.015, 0.09, alt);',
            '    col = mix(col, goldenScatter, horizonBand * 0.28);',
            '    float sunward = max(0.0, dot(d, sunDir));',
            '    col = mix(col, sunGlow, (pow(sunward, 9.0) * 0.16 + pow(sunward, 56.0) * 0.18) * smoothstep(0.01, 0.24, alt));',
            '    vec2 cuv = d.xz / max(0.14, alt + 0.05) * 0.62 + vec2(uTime * 0.008, uTime * 0.003);',
            '    float cloud = skyFbm(cuv);',
            '    float puff = smoothstep(0.50, 0.78, cloud) * smoothstep(0.06, 0.22, alt) * (1.0 - smoothstep(0.56, 0.92, alt));',
            '    vec3 cloudCol = mix(vec3(0.95, 0.96, 0.94), sunGlow, 0.22 * pow(sunward, 2.0));',
            '    col = mix(col, cloudCol, puff * 0.44);',
            '  }',
            '  gl_FragColor = vec4(col, 1.0);',
            '}'
          ].join('\n')
        }));
        var skyDome = mesh(own(new THREE.SphereGeometry(1100, 24, 14)), skyMat);
        skyDome.name = 'distance-sky-dome';
      }

      // Distant layered valley hills & horizon ridge silhouette with atmospheric distance depth (kept far beyond 300 m target corridor).
      if (typeof THREE.BufferGeometry === 'function') {
        var rPos = [], rCol = [], rDepth = [], rIdx = [];
        var ridgeLayers = [
          { radius: 580, baseH: -2, amp: 24, freq: 5, phase: 0.7, depth: 0.45, top: [0.56, 0.65, 0.57], bot: [0.68, 0.75, 0.68] },
          { radius: 860, baseH: -4, amp: 52, freq: 4, phase: 2.1, depth: 0.85, top: [0.64, 0.72, 0.73], bot: [0.76, 0.82, 0.79] }
        ];
        ridgeLayers.forEach(function (layer) {
          var segs = 48, baseVertex = rPos.length / 3;
          for (var s = 0; s <= segs; s++) {
            var ang = (s / segs) * Math.PI * 2;
            var rx = Math.cos(ang) * layer.radius, rz = Math.sin(ang) * layer.radius;
            // Dip gently along the central sightline (-Z) so the far horizon stays clean behind the target.
            var sightDamp = 0.55 + 0.45 * (1 - Math.exp(-Math.pow((ang - Math.PI * 1.5), 2) * 8));
            var h = layer.amp * (0.45 + 0.32 * Math.sin(ang * layer.freq + layer.phase) + 0.23 * Math.cos(ang * (layer.freq * 2 + 1) - layer.phase)) * sightDamp;
            rPos.push(rx, layer.baseH, rz, rx, Math.max(2, h), rz);
            rCol.push(layer.bot[0], layer.bot[1], layer.bot[2], layer.top[0], layer.top[1], layer.top[2]);
            rDepth.push(layer.depth, 0.0, layer.depth, 1.0);
            if (s < segs) {
              var i0 = baseVertex + s * 2;
              rIdx.push(i0, i0 + 2, i0 + 1, i0 + 1, i0 + 2, i0 + 3);
            }
          }
        });
        var ridgeGeo = own(new THREE.BufferGeometry());
        ridgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(rPos, 3));
        ridgeGeo.setAttribute('color', new THREE.Float32BufferAttribute(rCol, 3));
        ridgeGeo.setAttribute('aColor', new THREE.Float32BufferAttribute(rCol, 3));
        ridgeGeo.setAttribute('aLayer', new THREE.Float32BufferAttribute(rDepth, 2));
        ridgeGeo.setIndex(rIdx);
        var ridgeMat = null;
        if (typeof THREE.ShaderMaterial === 'function') {
          ridgeMat = own(new THREE.ShaderMaterial({
            side: THREE.DoubleSide, fog: false, toneMapped: false,
            uniforms: {
              uHighContrast: sceneHcUniform,
              uHazeColor: { value: new THREE.Color(0xdbe3d8) },
              uWarmRim: { value: new THREE.Color(0xf6e4be) }
            },
            vertexShader: [
              'attribute vec3 aColor; attribute vec2 aLayer;',
              'varying vec3 vCol; varying vec2 vLayer;',
              'void main(){ vCol = aColor; vLayer = aLayer; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }'
            ].join('\n'),
            fragmentShader: [
              'uniform float uHighContrast; uniform vec3 uHazeColor; uniform vec3 uWarmRim;',
              'varying vec3 vCol; varying vec2 vLayer;',
              'void main(){',
              '  vec3 col = vCol;',
              '  if (uHighContrast < 0.5) {',
              '    float baseMist = (1.0 - smoothstep(0.0, 0.55, vLayer.y)) * (0.20 + 0.34 * vLayer.x);',
              '    col = mix(col, uHazeColor, baseMist);',
              '    float crestRim = smoothstep(0.76, 1.0, vLayer.y) * (1.0 - vLayer.x * 0.45);',
              '    col = mix(col, uWarmRim, crestRim * 0.24);',
              '  }',
              '  gl_FragColor = vec4(col, 1.0);',
              '}'
            ].join('\n')
          }));
        } else {
          ridgeMat = own(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, fog: false, toneMapped: false }));
        }
        var ridges = mesh(ridgeGeo, ridgeMat);
        ridges.name = 'distance-horizon-ridges';
      }

      // GLSL Savanna Horizon Heat-Haze ribbon (strictly in wideDecorGroup so 0.75° detail FOV acuity is 100% untouched).
      if (typeof THREE.ShaderMaterial === 'function' && typeof THREE.CylinderGeometry === 'function') {
        var hazeGeo = own(new THREE.CylinderGeometry(490, 490, 26, 48, 1, true));
        var hazeMat = own(new THREE.ShaderMaterial({
          transparent: true, depthWrite: false, side: THREE.BackSide, fog: false, toneMapped: false,
          blending: THREE.AdditiveBlending || THREE.NormalBlending,
          uniforms: {
            uTime: sceneTimeUniform,
            uColor: { value: new THREE.Color(0xfaeccd) }
          },
          vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
          fragmentShader: [
            'uniform float uTime; uniform vec3 uColor; varying vec2 vUv;',
            'void main(){',
            '  float vMask = smoothstep(0.0, 0.28, vUv.y) * smoothstep(1.0, 0.18, vUv.y);',
            '  float waveA = sin(vUv.x * 62.8318 + vUv.y * 14.0 - uTime * 1.15);',
            '  float waveB = sin(vUv.x * 113.097 - vUv.y * 22.0 + uTime * 0.85);',
            '  float shimmer = 0.55 + 0.45 * (waveA * 0.58 + waveB * 0.42);',
            '  float alpha = vMask * shimmer * 0.14;',
            '  if (alpha < 0.002) discard;',
            '  gl_FragColor = vec4(uColor, alpha);',
            '}'
          ].join('\n')
        }));
        var hazeBand = mesh(hazeGeo, hazeMat, wideDecorGroup);
        hazeBand.position.set(0, 10, 0);
        hazeBand.renderOrder = 2;
        hazeBand.name = 'distance-savanna-heat-haze';
      }

      // Subtle high-altitude thermal updraft shimmer arcs in the wide 20° valley sky (well above the 0.75° detail FOV).
      if (typeof THREE.TorusGeometry === 'function') {
        var thermalMat = null;
        if (typeof THREE.ShaderMaterial === 'function') {
          thermalMat = own(new THREE.ShaderMaterial({
            transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false,
            blending: THREE.AdditiveBlending || THREE.NormalBlending,
            uniforms: {
              uTime: sceneTimeUniform,
              uColor: { value: new THREE.Color(0xfff6e2) }
            },
            vertexShader: [
              'varying vec2 vUv; varying vec3 vViewNormal; varying vec3 vViewDir;',
              'void main(){',
              '  vUv = uv;',
              '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
              '  vViewNormal = normalize(normalMatrix * normal);',
              '  vViewDir = normalize(-mv.xyz);',
              '  gl_Position = projectionMatrix * mv;',
              '}'
            ].join('\n'),
            fragmentShader: [
              'uniform float uTime; uniform vec3 uColor;',
              'varying vec2 vUv; varying vec3 vViewNormal; varying vec3 vViewDir;',
              'void main(){',
              '  float taper = sin(vUv.x * 3.14159265);',
              '  float flow = 0.52 + 0.48 * sin(vUv.x * 15.7079 - uTime * 1.35);',
              '  float rim = 0.45 + 0.55 * abs(dot(normalize(vViewNormal), normalize(vViewDir)));',
              '  float alpha = taper * flow * rim * 0.28;',
              '  if (alpha < 0.002) discard;',
              '  gl_FragColor = vec4(uColor, alpha);',
              '}'
            ].join('\n')
          }));
        } else if (typeof THREE.MeshBasicMaterial === 'function') {
          thermalMat = own(new THREE.MeshBasicMaterial({ color: 0xf4f8f5, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false }));
        }
        if (thermalMat) {
          var thermalGeo = own(new THREE.TorusGeometry(4.2, 0.16, 6, 28, Math.PI * 1.15));
          [[-16, 17, -140, 0.4], [-14.5, 21.5, -142, 2.2], [19, 19, -165, 1.3], [17.5, 24, -168, 3.1]].forEach(function (t, ti) {
            var arc = mesh(thermalGeo, thermalMat, wideDecorGroup);
            arc.position.set(t[0], t[1], t[2]);
            arc.rotation.set(Math.PI * 0.44, t[3], 0.12 * (ti % 2 ? 1 : -1));
            arc.name = 'distance-thermal-wisp-' + ti;
          });
        }
      }

      // Sunlit meadow seeds & thermal-updraft dust motes (wide 20° view only, strictly outside the 0.75° detail corridor).
      if (typeof THREE.Points === 'function' && typeof THREE.BufferGeometry === 'function' && typeof THREE.ShaderMaterial === 'function') {
        var moteCount = 120;
        var mPos = new Float32Array(moteCount * 3);
        var mSeeds = new Float32Array(moteCount);
        var mSizes = new Float32Array(moteCount);
        for (var mi = 0; mi < moteCount; mi++) {
          var mSide = mi % 2 ? 1 : -1;
          var h1 = Math.sin(mi * 12.9898 + 3.17) * 43758.5453; h1 -= Math.floor(h1);
          var h2 = Math.sin(mi * 78.233 + 7.41) * 43758.5453; h2 -= Math.floor(h2);
          var h3 = Math.sin(mi * 39.425 + 1.93) * 43758.5453; h3 -= Math.floor(h3);
          mPos[mi * 3] = mSide * (4.5 + h1 * 28.0);
          mPos[mi * 3 + 1] = 1.2 + h2 * 14.0;
          mPos[mi * 3 + 2] = -6.0 - h3 * 135.0;
          mSeeds[mi] = h1 * 6.28318 + h2 * 3.14159;
          mSizes[mi] = 0.8 + h3 * 1.1;
        }
        var moteGeo = own(new THREE.BufferGeometry());
        moteGeo.setAttribute('position', new THREE.Float32BufferAttribute(mPos, 3));
        moteGeo.setAttribute('aSeed', new THREE.Float32BufferAttribute(mSeeds, 1));
        moteGeo.setAttribute('aSize', new THREE.Float32BufferAttribute(mSizes, 1));
        var moteMat = own(new THREE.ShaderMaterial({
          transparent: true, depthWrite: false, fog: false, toneMapped: false,
          blending: THREE.AdditiveBlending || THREE.NormalBlending,
          uniforms: {
            uTime: sceneTimeUniform,
            uColor: { value: new THREE.Color(0xfff4d4) }
          },
          vertexShader: [
            'attribute float aSeed; attribute float aSize;',
            'uniform float uTime;',
            'varying float vSparkle;',
            'void main(){',
            '  vec3 p = position;',
            '  float t = uTime * 0.65;',
            '  p.x += sin(t + aSeed) * 0.55;',
            '  p.y += sin(t * 0.8 + aSeed * 1.3) * 0.65;',
            '  p.z += cos(t * 0.7 + aSeed * 0.9) * 0.45;',
            '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
            '  float dist = max(5.0, -mv.z);',
            '  gl_PointSize = clamp(aSize * (220.0 / dist), 1.8, 7.5);',
            '  vSparkle = (0.55 + 0.45 * sin(uTime * 1.4 + aSeed * 2.1)) * smoothstep(260.0, 28.0, dist);',
            '  gl_Position = projectionMatrix * mv;',
            '}'
          ].join('\n'),
          fragmentShader: [
            'uniform vec3 uColor; varying float vSparkle;',
            'void main(){',
            '  vec2 c = gl_PointCoord - vec2(0.5);',
            '  float r2 = dot(c, c);',
            '  if (r2 > 0.25) discard;',
            '  float soft = exp(-r2 * 13.0);',
            '  gl_FragColor = vec4(uColor, soft * vSparkle * 0.55);',
            '}'
          ].join('\n')
        }));
        var motePoints = new THREE.Points(moteGeo, moteMat);
        motePoints.renderOrder = 3;
        motePoints.name = 'distance-thermal-motes';
        wideDecorGroup.add(motePoints);
      }

      // Lightweight procedural textures for sunlit meadow turf, gravel field path, and cedar observation woodwork.
      function h2(x, y) { var n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); }
      var meadowTex = makeCanvasTexture(128, function (ctx, s) {
        ctx.fillStyle = '#85966c'; ctx.fillRect(0, 0, s, s);
        for (var i = 0; i < 650; i++) {
          var px = h2(i, 3) * s, py = h2(i, 11) * s, r = 2 + h2(i, 19) * 8;
          ctx.fillStyle = h2(i, 29) > 0.5 ? 'rgba(155,172,114,0.16)' : 'rgba(94,114,72,0.16)';
          ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
        }
        for (var b = 0; b < 420; b++) {
          var bx = h2(b, 41) * s, by = h2(b, 53) * s;
          ctx.strokeStyle = b % 2 ? 'rgba(176,188,128,0.22)' : 'rgba(78,96,60,0.20)';
          ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + (h2(b, 61) - 0.5) * 4, by - 4 - h2(b, 71) * 4); ctx.stroke();
        }
      }, 95, 95);
      var pathTex = makeCanvasTexture(128, function (ctx, s) {
        ctx.fillStyle = '#b7ac86'; ctx.fillRect(0, 0, s, s);
        // Soft grass-fringed verges on both edges of the field track.
        var leftEdge = ctx.createLinearGradient(0, 0, 22, 0);
        leftEdge.addColorStop(0, 'rgba(116,136,88,0.85)'); leftEdge.addColorStop(1, 'rgba(183,172,134,0)');
        ctx.fillStyle = leftEdge; ctx.fillRect(0, 0, 22, s);
        var rightEdge = ctx.createLinearGradient(s - 22, 0, s, 0);
        rightEdge.addColorStop(0, 'rgba(183,172,134,0)'); rightEdge.addColorStop(1, 'rgba(116,136,88,0.85)');
        ctx.fillStyle = rightEdge; ctx.fillRect(s - 22, 0, 22, s);
        for (var i = 0; i < 480; i++) {
          var px = h2(i, 83) * s, py = h2(i, 97) * s, r = 0.8 + h2(i, 107) * 2.2;
          ctx.fillStyle = h2(i, 113) > 0.5 ? 'rgba(218,208,176,0.28)' : 'rgba(134,120,90,0.24)';
          ctx.fillRect(px, py, r, r);
        }
      }, 1, 44);
      var woodTex = makeCanvasTexture(128, function (ctx, s) {
        ctx.fillStyle = '#846a49'; ctx.fillRect(0, 0, s, s);
        for (var g = 0; g < 36; g++) {
          var gx = (g / 36) * s + (h2(g, 131) - 0.5) * 2;
          ctx.strokeStyle = g % 3 ? 'rgba(92,68,42,0.25)' : 'rgba(166,138,100,0.20)';
          ctx.lineWidth = 1 + h2(g, 137) * 1.6;
          ctx.beginPath(); ctx.moveTo(gx, 0);
          ctx.bezierCurveTo(gx + (h2(g, 149) - 0.5) * 4, s * 0.33, gx + (h2(g, 157) - 0.5) * 4, s * 0.66, gx, s);
          ctx.stroke();
        }
      }, 1, 1);

      var ground = mesh(own(new THREE.PlaneGeometry(2000, 2000)), material(meadowTex ? 0xf2f4ec : 0x83936a, meadowTex ? { map: meadowTex } : null)); ground.rotation.x = -Math.PI / 2;
      var path = mesh(own(new THREE.PlaneGeometry(1.45, 160)), material(pathTex ? 0xf4f0e4 : 0xb5aa83, pathTex ? { map: pathTex } : null)); path.rotation.x = -Math.PI / 2; path.position.set(0, .001, -78);
      var bark = material(0x65533c, woodTex ? { map: woodTex } : null), leaves = material(0x6b8056), leafShade = material(0x58704d), leafSun = material(0x7c9261);
      var trunkGeometry = own(new THREE.CylinderGeometry(.17, .27, 4, 7));
      var crownGeometry = own(new THREE.SphereGeometry(1.9, 9, 7));
      for (var tree = 0; tree < 14; tree++) {
        var sign = tree % 2 ? 1 : -1, depth = -12 - Math.floor(tree / 2) * 15;
        var x = sign * (5.4 + tree % 3 * 4.2);
        var trunk = mesh(trunkGeometry, bark); trunk.position.set(x, 2, depth);
        // Multi-lobed organic woodland canopy using the single shared crown geometry.
        var baseY = 4.5 + tree % 2 * .4;
        var crown = mesh(crownGeometry, tree % 3 ? leaves : leafShade); crown.position.set(x, baseY, depth); crown.scale.set(1.02, 1.24, .88);
        var crownSide = mesh(crownGeometry, tree % 2 ? leafSun : leaves); crownSide.position.set(x - sign * 0.95, baseY - 0.45, depth + 0.35); crownSide.scale.set(.74, .82, .72);
        var crownTop = mesh(crownGeometry, leafSun); crownTop.position.set(x + sign * 0.55, baseY + 0.65, depth - 0.25); crownTop.scale.set(.68, .76, .66);
      }
      var vegetation = vegetationData();
      if (vegetation) makeCatalogVegetation(vegetation); else makeFallbackVegetation();
      var wood = material(woodTex ? 0xe8d9c4 : 0x806746, woodTex ? { map: woodTex } : null);
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
      var hc = isHighContrast(options.wideCanvas);
      sceneHcUniform.value = hc ? 1.0 : 0.0;
      sceneTimeUniform.value = prefersReducedMotion() ? 2.6 : (2.6 + (currentSettings.distance || 80) * 0.015 + drawCount * 0.12);
      if (wideDecorGroup) wideDecorGroup.visible = !hc;
      var wide = setCamera(20, currentSettings.distance);
      renderer.render(scene, camera); drawCount++; copy(canvasContexts[0], 0);
      // Hide wide-only savanna haze & motes before the 0.75° detail render so angular resolution and contrast stay untouched.
      if (wideDecorGroup) wideDecorGroup.visible = false;
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
      // The first visible ground in the widest view is 5.67 m ahead; all
      // targets are at least 40 m away. A 5 m near plane preserves that view
      // while resolving the 2 mm gap between the stripe surface and backing.
      // The former 1 cm plane quantized both surfaces to the same depth.
      camera = new THREE.PerspectiveCamera(1, WIDTH / HEIGHT, 5, 2500);
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
