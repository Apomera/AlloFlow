(function (global) {
  'use strict';
  if (!global) return;

  var Lab = global.StemLab = global.StemLab || {};
  var EYE_Y = 3.2, EYE_Z = 12;
  var CENTERS = Object.freeze(Object.assign(Object.create(null), { room: -11, triangle: 0, shape: 11 }));
  var COLORS = { teal: 0x178e89, coral: 0xe57668, gold: 0xf4be43, ink: 0x364d52, floor: 0xe6ebeb };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || 0));
  }

  // All exhibit fragments are lifted along rays from the same reference eye.
  // Changing depth preserves the image there, but exposes the construction elsewhere.
  function liftPoint(x, y, z, center) {
    var scale = (EYE_Z - z) / EYE_Z;
    return { x: (center || 0) + x * scale, y: EYE_Y + y * scale, z: z };
  }

  function projectPoint(point, center) {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y) || !Number.isFinite(point.z)) return { x: 0, y: 0 };
    var denom = EYE_Z - point.z;
    if (Math.abs(denom) < 1e-9) return { x: 0, y: 0 };
    var scale = EYE_Z / denom;
    return { x: (point.x - (center || 0)) * scale, y: (point.y - EYE_Y) * scale };
  }

  function roomObjects(center) {
    return [-3.6, 2].map(function (depth, index) {
      return { position: liftPoint(index ? 2.35 : -2.35, -2.15, depth, center),
        width: 0.64, height: 1.65, depth: 0.46 };
    });
  }

  function triangleParts(center) {
    var outer = [[0, 2.05], [-2.45, -1.95], [2.45, -1.95]];
    var inner = [[0, 0.96], [-1.42, -1.37], [1.42, -1.37]];
    return [-2.6, -2.35, -2.1].map(function (farDepth, index) {
      var next = (index + 1) % 3;
      var dx = outer[next][0] - outer[index][0], dy = outer[next][1] - outer[index][1];
      var nearDepth = 1.8 + index * 0.2;
      return [outer[index], outer[next], inner[next], inner[index]].map(function (p) {
        // Reciprocal distance is affine across an image of a plane. Each solid
        // beam therefore stays planar while its ends alternate behind/in front
        // at the apparent joins, producing the impossible cyclic depth order.
        var t = ((p[0] - outer[index][0]) * dx + (p[1] - outer[index][1]) * dy) / (dx * dx + dy * dy);
        var depth = EYE_Z - 1 / ((1 - t) / (EYE_Z - farDepth) + t / (EYE_Z - nearDepth));
        return liftPoint(p[0], p[1], depth, center);
      });
    });
  }

  function starParts(center, shift) {
    var vertices = [], depths = [-2.8, 1.7, -0.7, 2.4, -1.9, 0.9, -2.2, 2, -0.3, 1.1];
    for (var i = 0; i < 10; i++) {
      var theta = Math.PI / 2 + i * Math.PI / 5;
      var radius = i % 2 ? 0.88 : 2.25;
      vertices.push([Math.cos(theta) * radius, Math.sin(theta) * radius]);
    }
    return depths.map(function (depth, index) {
      var direction = index * Math.PI * 0.6;
      var amount = clamp(shift, -100, 100) / 100;
      var dx = Math.cos(direction) * amount * 1.45;
      var dy = Math.sin(direction) * amount * 0.95;
      return [[0, 0], vertices[index], vertices[(index + 1) % 10]].map(function (p) {
        return liftPoint(p[0] + dx, p[1] + dy, depth, center);
      });
    });
  }

  function measurements(station, model) {
    if (station === 'room') {
      var objects = roomObjects(0);
      var left = EYE_Z - objects[0].position.z, right = EYE_Z - objects[1].position.z;
      return { objectHeight: objects[0].height, leftDepthDistance: left, rightDepthDistance: right,
        apparentHeightRatio: (objects[1].height / right) / (objects[0].height / left) };
    }
    if (station === 'triangle') {
      var beams = triangleParts(0);
      return { beamCount: beams.length, joinGaps: beams.map(function (beam, index) {
        var end = beam[1], start = beams[(index + 1) % beams.length][0];
        return Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2) + Math.pow(end.z - start.z, 2));
      }) };
    }
    if (station === 'shape') {
      var fragments = starParts(0, model && model.shift);
      var depths = fragments.map(function (part) { return part[0].z; });
      return { fragmentCount: fragments.length,
        depthSpan: Number((Math.max.apply(null, depths) - Math.min.apply(null, depths)).toFixed(12)),
        distinctDepths: depths.filter(function (depth, index) { return depths.indexOf(depth) === index; }).length };
    }
    return null;
  }

  function createViewer() {
    if (typeof Lab.makeOrbitViewer !== 'function') return null;
    var sceneState = null, layout = [], layoutSignature = '[]', layoutNotify = null, statusNotify = null;
    var attachedHost = null, attachment = 0;
    var galleryTextures = null;

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

    function disposeGalleryTextures() {
      if (!galleryTextures) return;
      Object.keys(galleryTextures).forEach(function (key) {
        var tex = galleryTextures[key];
        if (tex && typeof tex.dispose === 'function') { try { tex.dispose(); } catch (e) {} }
      });
      galleryTextures = null;
    }

    function makeCanvasTexture(THREE, width, height, draw, repeatX, repeatY, isColor) {
      if (!THREE || typeof THREE.CanvasTexture !== 'function' || typeof document === 'undefined' ||
          typeof document.createElement !== 'function') return null;
      try {
        var c = document.createElement('canvas');
        c.width = width; c.height = height;
        var ctx = c.getContext && c.getContext('2d');
        if (!ctx) return null;
        draw(ctx, width, height);
        var tex = new THREE.CanvasTexture(c);
        if (repeatX || repeatY) {
          tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
          tex.repeat.set(repeatX || 1, repeatY || 1);
        }
        if (isColor && THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
        tex.needsUpdate = true;
        return tex;
      } catch (e) { return null; }
    }

    function ensureGalleryTextures(THREE) {
      if (galleryTextures) return galleryTextures;
      // Deterministic hash for procedural architectural grain (zero external assets).
      function h2(x, y) { var n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); }
      var floorMap = makeCanvasTexture(THREE, 256, 256, function (ctx, w, h) {
        ctx.fillStyle = '#e7e4dc'; ctx.fillRect(0, 0, w, h);
        var rows = 8, cols = 4, pw = w / cols, ph = h / rows;
        for (var r = 0; r < rows; r++) {
          var shift = (r % 2) * (pw * 0.5);
          for (var c = -1; c <= cols; c++) {
            var x = c * pw + shift, y = r * ph;
            var v = h2(c + 13, r + 29);
            var lum = Math.round(224 + (v - 0.5) * 16);
            ctx.fillStyle = 'rgb(' + (lum + 4) + ',' + (lum + 1) + ',' + (lum - 7) + ')';
            ctx.fillRect(x + 1, y + 1, pw - 2, ph - 2);
            // Subtle pale architectural oak grain lines along each plank.
            ctx.strokeStyle = 'rgba(136,122,102,0.11)'; ctx.lineWidth = 1;
            for (var g = 0; g < 4; g++) {
              var gy = y + 3 + (g + h2(c * 7 + g, r)) * (ph - 6) / 4;
              ctx.beginPath(); ctx.moveTo(x + 1, gy);
              ctx.quadraticCurveTo(x + pw * 0.5, gy + (h2(g, r + c) - 0.5) * 3, x + pw - 1, gy);
              ctx.stroke();
            }
            ctx.strokeStyle = 'rgba(110,104,96,0.18)'; ctx.strokeRect(x + 0.5, y + 0.5, pw - 1, ph - 1);
          }
        }
      }, 10, 7, true);
      var floorBump = makeCanvasTexture(THREE, 256, 256, function (ctx, w, h) {
        ctx.fillStyle = '#888888'; ctx.fillRect(0, 0, w, h);
        var rows = 8, cols = 4, pw = w / cols, ph = h / rows;
        for (var r = 0; r < rows; r++) {
          var shift = (r % 2) * (pw * 0.5);
          for (var c = -1; c <= cols; c++) {
            var x = c * pw + shift, y = r * ph;
            ctx.strokeStyle = '#505050'; ctx.lineWidth = 1.5;
            ctx.strokeRect(x + 0.5, y + 0.5, pw - 1, ph - 1);
          }
        }
      }, 10, 7, false);
      var wallMap = makeCanvasTexture(THREE, 128, 128, function (ctx, w, h) {
        ctx.fillStyle = '#f3f5f4'; ctx.fillRect(0, 0, w, h);
        for (var i = 0; i < 420; i++) {
          var px = h2(i, 3) * w, py = h2(i, 11) * h, r = 4 + h2(i, 19) * 14;
          var shade = Math.round(234 + (h2(i, 23) - 0.5) * 18);
          ctx.fillStyle = 'rgba(' + shade + ',' + (shade + 2) + ',' + (shade + 1) + ',0.16)';
          ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
        }
        // Fine gallery wall acoustic seam lines.
        ctx.strokeStyle = 'rgba(176,188,185,0.22)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(64, 0); ctx.lineTo(64, h); ctx.stroke();
      }, 6, 2, true);
      var plinthMap = makeCanvasTexture(THREE, 128, 128, function (ctx, w, h) {
        ctx.fillStyle = '#dce3e0'; ctx.fillRect(0, 0, w, h);
        for (var i = 0; i < 520; i++) {
          var px = h2(i, 37) * w, py = h2(i, 53) * h, s = 1 + h2(i, 71) * 2.2;
          var dark = h2(i, 89) > 0.55;
          ctx.fillStyle = dark ? 'rgba(130,144,140,0.16)' : 'rgba(255,255,255,0.24)';
          ctx.fillRect(px, py, s, s);
        }
      }, 2, 2, true);
      var beamMap = makeCanvasTexture(THREE, 64, 128, function (ctx, w, h) {
        var grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, 'rgba(255,248,228,0.68)');
        grad.addColorStop(0.28, 'rgba(255,246,222,0.34)');
        grad.addColorStop(0.72, 'rgba(255,244,218,0.10)');
        grad.addColorStop(1, 'rgba(255,244,218,0.0)');
        ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
      }, 1, 1, false);
      var dustMap = makeCanvasTexture(THREE, 32, 32, function (ctx, w, h) {
        var grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        grad.addColorStop(0, 'rgba(255,250,235,0.95)');
        grad.addColorStop(0.4, 'rgba(255,244,214,0.45)');
        grad.addColorStop(1, 'rgba(255,240,200,0.0)');
        ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
      }, 1, 1, false);
      galleryTextures = { floorMap: floorMap, floorBump: floorBump, wallMap: wallMap, plinthMap: plinthMap, beamMap: beamMap, dustMap: dustMap };
      return galleryTextures;
    }

    function layoutSnapshot() {
      return layout.map(function (point) { return { id: point.id, x: point.x, y: point.y, visible: point.visible }; });
    }

    function publishLayout(next) {
      var signature = JSON.stringify(next);
      if (signature === layoutSignature) return;
      layout = next;
      layoutSignature = signature;
      if (layoutNotify) { try { layoutNotify(layoutSnapshot()); } catch (e) {} }
    }

    function projectLayout(THREE, S, m) {
      sceneState = S;
      // The shared viewer finishes these updates after its camera hook. Hotspots
      // need the same final matrices now, including on the first static frame.
      S.camera.updateProjectionMatrix();
      S.camera.updateMatrixWorld(true);
      S.scene.updateMatrixWorld(true);
      if (m.view !== 'gallery') { publishLayout([]); return; }
      publishLayout(['room', 'triangle', 'shape'].map(function (id) {
        var point = new THREE.Vector3(CENTERS[id], 0.14, 7.3).project(S.camera);
        var visible = isFinite(point.x) && isFinite(point.y) && isFinite(point.z) &&
          point.x >= -1 && point.x <= 1 && point.y >= -1 && point.y <= 1 && point.z >= -1 && point.z <= 1;
        return { id: id, x: clamp((point.x + 1) / 2, 0, 1), y: clamp((1 - point.y) / 2, 0, 1), visible: visible };
      }));
    }

    function build(THREE, S, m) {
      m = m || {};
      var station = Object.prototype.hasOwnProperty.call(CENTERS, m.station) ? m.station : 'room';
      var center = CENTERS[station];
      var overview = m.view === 'gallery';
      var open = m.view === 'inspect';
      var materials = {}, pickables = [], exhibit = null;
      var tex = ensureGalleryTextures(THREE);
      var dustPoints = null;
      var galleryTimeUniforms = [], galleryDecorMeshes = [], gallerySheenUniforms = [];
      var STATIC_BEAUTY_TIME = 3.2;
      var hcInitial = isHighContrast(S.renderer && S.renderer.domElement);

      function applyFloorSheen(mat, baseStrength, tintHex, cacheId) {
        if (!mat || typeof mat.onBeforeCompile !== 'function' || mat.userData.gallerySheenApplied) return mat;
        mat.userData.gallerySheenApplied = true;
        var strengthUniform = { value: hcInitial ? 0.0 : baseStrength };
        var tintColor = new THREE.Color(tintHex);
        if (typeof tintColor.convertSRGBToLinear === 'function') tintColor.convertSRGBToLinear();
        var tintUniform = { value: tintColor };
        gallerySheenUniforms.push({ uniform: strengthUniform, base: baseStrength });
        var prevCompile = mat.onBeforeCompile;
        var prevKey = mat.customProgramCacheKey;
        mat.onBeforeCompile = function (shader, rCtx) {
          if (typeof prevCompile === 'function') prevCompile.call(this, shader, rCtx);
          shader.uniforms.uGallerySheenStrength = strengthUniform;
          shader.uniforms.uGallerySheenColor = tintUniform;
          shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', '#include <common>\nuniform float uGallerySheenStrength;\nuniform vec3 uGallerySheenColor;')
            .replace('#include <dithering_fragment>', [
              'if (uGallerySheenStrength > 0.001) {',
              '  vec3 pgN = normalize(normal);',
              '  vec3 pgV = normalize(vViewPosition);',
              '  float pgFres = pow(1.0 - clamp(dot(pgN, pgV), 0.0, 1.0), 3.2);',
              '  float pgSky = 0.50 + 0.50 * clamp(pgN.y * 0.5 + 0.5, 0.0, 1.0);',
              '  gl_FragColor.rgb += uGallerySheenColor * pgFres * pgSky * uGallerySheenStrength;',
              '}',
              '#include <dithering_fragment>'
            ].join('\n'));
        };
        mat.customProgramCacheKey = function () {
          var base = typeof prevKey === 'function' ? prevKey.call(this) : '';
          return (base ? base + '|' : '') + 'gallery-sheen-' + cacheId;
        };
        return mat;
      }

      function tagExhibit(mesh) {
        if (exhibit) {
          mesh.userData.perceptionStation = exhibit;
          pickables.push(mesh);
        }
        return mesh;
      }

      function material(color, opacity, extra) {
        var tag = extra && extra.tag ? ':' + extra.tag : '';
        var key = color + ':' + (opacity == null ? 1 : opacity) + tag;
        if (!materials[key]) {
          var cfg = {
            color: color, roughness: 0.68, metalness: 0.05, side: THREE.DoubleSide,
            transparent: opacity != null && opacity < 1, opacity: opacity == null ? 1 : opacity,
            depthWrite: opacity == null || opacity >= 1
          };
          if (extra) {
            if (extra.roughness != null) cfg.roughness = extra.roughness;
            if (extra.metalness != null) cfg.metalness = extra.metalness;
            if (extra.map) cfg.map = extra.map;
            if (extra.bumpMap) { cfg.bumpMap = extra.bumpMap; cfg.bumpScale = extra.bumpScale || 0.015; }
            if (extra.emissive != null) { cfg.emissive = extra.emissive; cfg.emissiveIntensity = extra.emissiveIntensity || 0.6; }
          }
          materials[key] = new THREE.MeshStandardMaterial(cfg);
          // r128 expects linear material colors when the renderer outputs sRGB.
          materials[key].color.convertSRGBToLinear();
          if (extra && extra.emissive != null && materials[key].emissive) materials[key].emissive.convertSRGBToLinear();
          if (extra && extra.sheen) {
            applyFloorSheen(materials[key], extra.sheen.strength, extra.sheen.color, extra.sheen.id || tag || 'std');
          }
        }
        return materials[key];
      }

      function box(x, y, z, w, h, d, color, parent, matExtra) {
        var mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material(color, null, matExtra));
        mesh.position.set(x, y, z);
        if (matExtra && matExtra.receiveShadow) mesh.receiveShadow = true;
        if (matExtra && matExtra.castShadow) mesh.castShadow = true;
        (parent || S.model).add(mesh);
        return tagExhibit(mesh);
      }

      function sphere(x, y, z, radius, color, parent, matExtra) {
        var mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 14), material(color, null, matExtra));
        mesh.position.set(x, y, z);
        if (matExtra && matExtra.castShadow) mesh.castShadow = true;
        (parent || S.model).add(mesh);
        return tagExhibit(mesh);
      }

      function rod(from, to, radius, color, parent) {
        var a = new THREE.Vector3(from.x, from.y, from.z), b = new THREE.Vector3(to.x, to.y, to.z);
        var direction = new THREE.Vector3().subVectors(b, a);
        var len = direction.length();
        if (len < 1e-9) return null;
        var mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 10), material(color));
        mesh.position.copy(a).add(b).multiplyScalar(0.5);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
        (parent || S.model).add(mesh);
        return tagExhibit(mesh);
      }

      function polygon(points, color, opacity, parent, castShadow) {
        var positions = [], indices = [];
        points.forEach(function (p) { positions.push(p.x, p.y, p.z); });
        for (var i = 1; i < points.length - 1; i++) indices.push(0, i, i + 1);
        var geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        var mesh = new THREE.Mesh(geometry, material(color, opacity));
        if (castShadow) mesh.castShadow = true;
        (parent || S.model).add(mesh);
        return tagExhibit(mesh);
      }

      function prism(points, color, thickness, parent) {
        polygon(points, color, null, parent, true);
        var backs = points.map(function (p) { return { x: p.x, y: p.y, z: p.z - thickness }; });
        polygon(backs.slice().reverse(), color, null, parent, true);
        for (var i = 0; i < points.length; i++) {
          var next = (i + 1) % points.length;
          polygon([points[i], backs[i], backs[next], points[next]], color, null, parent, true);
        }
      }

      function outline(points, color, radius, parent) {
        for (var i = 0; i < points.length; i++) rod(points[i], points[(i + 1) % points.length], radius, color, parent);
      }

      function ring(x, y, z, radius, color) {
        var mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.045, 10, 48), material(color, null, { tag: 'medallion', roughness: 0.35, metalness: 0.25 }));
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(x, y, z);
        S.model.add(mesh);
        // Subtle recessed inner brass-halo ring for gallery floor viewing spot.
        var inner = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.72, 0.018, 8, 40), material(0xf6f8f7, null, { tag: 'medallion-inner', roughness: 0.4, metalness: 0.12 }));
        inner.rotation.x = -Math.PI / 2;
        inner.position.set(x, y + 0.004, z);
        S.model.add(inner);
      }

      function architecture() {
        var floorMat = { tag: 'oak-floor', map: tex.floorMap, bumpMap: tex.floorBump, bumpScale: 0.014, roughness: 0.44, metalness: 0.08, receiveShadow: true, sheen: { strength: 0.20, color: 0xfff7e4, id: 'oak-floor' } };
        var wallMat = { tag: 'gallery-wall', map: tex.wallMap, roughness: 0.86, metalness: 0.02, receiveShadow: true };
        var plinthMat = { tag: 'plinth-stone', map: tex.plinthMap, roughness: 0.56, metalness: 0.05, receiveShadow: true, sheen: { strength: 0.09, color: 0xf7fbf9, id: 'plinth' } };
        var trackMat = { tag: 'track-metal', roughness: 0.32, metalness: 0.68 };
        var lensMat = { tag: 'spot-lens', roughness: 0.15, metalness: 0.1, emissive: 0xfff2cf, emissiveIntensity: 1.1 };

        // Architectural oak parquet gallery floor and plaster walls.
        box(0, -0.2, 0, 36, 0.4, 23, tex.floorMap ? 0xf2eee6 : COLORS.floor, null, floorMat);
        box(0, 4.2, -7.3, 36, 8.4, 0.25, 0xf5f7f6, null, wallMat);
        box(-17.8, 3.5, 0, 0.25, 7, 14.5, 0xe6ecea, null, wallMat);
        box(17.8, 3.5, 0, 0.25, 7, 14.5, 0xe6ecea, null, wallMat);

        // Dark architectural baseboards and upper gallery cornice trim.
        box(0, 0.12, -7.12, 35.6, 0.24, 0.08, 0x3b4d52, null, { tag: 'trim', roughness: 0.55, metalness: 0.15 });
        box(-17.64, 0.12, 0, 0.08, 0.24, 14.4, 0x3b4d52, null, { tag: 'trim', roughness: 0.55, metalness: 0.15 });
        box(17.64, 0.12, 0, 0.08, 0.24, 14.4, 0x3b4d52, null, { tag: 'trim', roughness: 0.55, metalness: 0.15 });
        box(0, 8.22, -7.1, 36, 0.28, 0.24, 0xdbe3e0, null, { tag: 'cornice', roughness: 0.68, metalness: 0.06 });

        // Gallery sightline guide strip & crisp floor reference grid.
        box(0, 0.025, 6.5, 33, 0.03, 0.1, COLORS.teal, null, { tag: 'accent-rail', roughness: 0.38, metalness: 0.22 });
        for (var gridX = -17; gridX <= 17; gridX += 2) box(gridX, 0.007, 0, 0.016, 0.008, 22, 0xcbd5d3);
        for (var gridZ = -7; gridZ <= 11; gridZ += 2) box(0, 0.009, gridZ, 35, 0.008, 0.016, 0xcbd5d3);

        // Overhead museum track lighting bar spanning all three bays.
        box(0, 7.62, 1.55, 31.5, 0.11, 0.14, 0x2c3a3e, null, trackMat);
        [-11, -5.5, 0, 5.5, 11].forEach(function (sx) {
          box(sx, 8.0, 1.55, 0.055, 0.72, 0.055, 0x2c3a3e, null, trackMat);
        });

        var coneOpacity = (overview || open) ? 0.14 : 0.028;
        var beamMat = null;
        if (typeof THREE.ShaderMaterial === 'function' && typeof THREE.ConeGeometry === 'function') {
          var coneTime = { value: STATIC_BEAUTY_TIME };
          galleryTimeUniforms.push(coneTime);
          beamMat = new THREE.ShaderMaterial({
            transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false,
            blending: THREE.AdditiveBlending || THREE.NormalBlending,
            uniforms: {
              uTime: coneTime,
              uColor: { value: new THREE.Color(0xfff4d8) },
              uOpacity: { value: coneOpacity }
            },
            vertexShader: [
              'varying vec2 vUv; varying vec3 vViewNormal; varying vec3 vViewDir; varying float vWorldX;',
              'void main(){',
              '  vUv = uv;',
              '  vec4 wp = modelMatrix * vec4(position, 1.0);',
              '  vWorldX = wp.x;',
              '  vec4 mv = viewMatrix * wp;',
              '  vViewNormal = normalize(normalMatrix * normal);',
              '  vViewDir = normalize(-mv.xyz);',
              '  gl_Position = projectionMatrix * mv;',
              '}'
            ].join('\n'),
            fragmentShader: [
              'uniform float uTime; uniform vec3 uColor; uniform float uOpacity;',
              'varying vec2 vUv; varying vec3 vViewNormal; varying vec3 vViewDir; varying float vWorldX;',
              'void main(){',
              '  float fres = pow(abs(dot(normalize(vViewNormal), normalize(vViewDir))), 1.55);',
              '  float vFade = smoothstep(0.0, 0.36, vUv.y) * smoothstep(1.0, 0.65, vUv.y);',
              '  float shimmer = 0.84 + 0.16 * sin(vUv.x * 12.56637 + uTime * 0.42 + vWorldX * 0.25);',
              '  float alpha = fres * vFade * shimmer * uOpacity;',
              '  if (alpha < 0.001) discard;',
              '  gl_FragColor = vec4(uColor, alpha);',
              '}'
            ].join('\n')
          });
        } else if (typeof THREE.ConeGeometry === 'function' && typeof THREE.MeshBasicMaterial === 'function') {
          beamMat = new THREE.MeshBasicMaterial({
            color: 0xfff5dc,
            map: tex.beamMap || null,
            transparent: true,
            opacity: coneOpacity,
            depthWrite: false,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending || THREE.NormalBlending
          });
        }

        // GLSL ES 1.00 angled sunlit gallery skylight volumetric god-ray curtains (overview/inspect only; bypassed in High-Contrast).
        var godRayMat = null;
        if ((overview || open) && typeof THREE.ShaderMaterial === 'function' && typeof THREE.PlaneGeometry === 'function') {
          var rayTime = { value: STATIC_BEAUTY_TIME };
          galleryTimeUniforms.push(rayTime);
          godRayMat = new THREE.ShaderMaterial({
            transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false,
            blending: THREE.AdditiveBlending || THREE.NormalBlending,
            uniforms: {
              uTime: rayTime,
              uColor: { value: new THREE.Color(0xfff6dd) },
              uOpacity: { value: overview ? 0.115 : 0.085 }
            },
            vertexShader: [
              'varying vec2 vUv; varying float vWorldX;',
              'void main(){',
              '  vUv = uv;',
              '  vec4 wp = modelMatrix * vec4(position, 1.0);',
              '  vWorldX = wp.x;',
              '  gl_Position = projectionMatrix * viewMatrix * wp;',
              '}'
            ].join('\n'),
            fragmentShader: [
              'uniform float uTime; uniform vec3 uColor; uniform float uOpacity;',
              'varying vec2 vUv; varying float vWorldX;',
              'void main(){',
              '  float shear = vUv.x + (1.0 - vUv.y) * 0.28;',
              '  float s1 = 0.5 + 0.5 * sin(shear * 22.0 + uTime * 0.28 + vWorldX * 0.19);',
              '  float s2 = 0.5 + 0.5 * sin(shear * 37.0 - uTime * 0.19 + vWorldX * 0.31);',
              '  float rays = pow(s1 * 0.62 + s2 * 0.38, 2.2);',
              '  float hMask = smoothstep(0.0, 0.24, vUv.x) * smoothstep(1.0, 0.76, vUv.x);',
              '  float vMask = smoothstep(0.0, 0.55, vUv.y) * smoothstep(1.0, 0.86, vUv.y);',
              '  float alpha = (0.28 + 0.72 * rays) * hMask * vMask * uOpacity;',
              '  if (alpha < 0.001) discard;',
              '  gl_FragColor = vec4(uColor, alpha);',
              '}'
            ].join('\n')
          });
        }

        ['room', 'triangle', 'shape'].forEach(function (key, index) {
          var cx = CENTERS[key], color = [COLORS.teal, COLORS.coral, COLORS.gold][index];
          // Wall header bar with subtle metallic sheen & numbered station pips.
          box(cx, 6.9, -7.08, 8.9, 0.32, 0.18, color, null, { tag: 'bay-header-' + index, roughness: 0.42, metalness: 0.14 });
          // Recessed shadow-gap kickplate under each honed limestone plinth.
          box(cx, 0.035, -0.4, 8.15, 0.07, 10.95, 0x3b4d52, null, { tag: 'trim', roughness: 0.55, metalness: 0.15 });
          box(cx, 0.16, -0.4, 8.5, 0.22, 11.3, 0xdce4e1, null, plinthMat);
          box(cx, 0.285, 4.7, 8.5, 0.035, 0.18, color, null, { tag: 'plinth-edge-' + index, roughness: 0.36, metalness: 0.24 });
          ring(cx, 0.045, 7.3, 0.64, color);
          for (var dot = 0; dot <= index; dot++) sphere(cx + (dot - index / 2) * 0.35, 6.35, -7.02, 0.095, color, null, { tag: 'pip-' + index, roughness: 0.34, metalness: 0.2 });

          // Architectural track spotlight canister aimed at each exhibit center.
          if (typeof THREE.CylinderGeometry === 'function') {
            var lampGroup = new THREE.Group();
            lampGroup.position.set(cx, 7.42, 1.55);
            lampGroup.rotation.x = 0.24;
            var canister = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.21, 0.46, 14), material(0x28363a, null, trackMat));
            lampGroup.add(canister);
            var lens = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.03, 14), material(0xfff7e2, null, lensMat));
            lens.position.y = -0.23;
            lampGroup.add(lens);
            S.model.add(lampGroup);
          }

          // Volumetric translucent museum spotlight cone descending onto plinth.
          if (beamMat && typeof THREE.ConeGeometry === 'function') {
            var coneHeight = 6.9;
            var coneGeo = new THREE.ConeGeometry(3.45, coneHeight, 24, 1, true);
            var cone = new THREE.Mesh(coneGeo, beamMat);
            cone.position.set(cx, 7.22 - coneHeight * 0.5, 0.65);
            cone.rotation.x = 0.20;
            cone.renderOrder = 3;
            cone.visible = !hcInitial;
            galleryDecorMeshes.push(cone);
            S.model.add(cone);
          }

          // Angled skylight volumetric god-ray curtain behind upper bay (crystal-clear exhibit foreground).
          if (godRayMat && typeof THREE.PlaneGeometry === 'function') {
            var curtain = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 6.6), godRayMat);
            curtain.position.set(cx + 0.4, 4.95, -5.65);
            curtain.rotation.set(0.14, 0, -0.18);
            curtain.renderOrder = 2;
            curtain.visible = !hcInitial;
            galleryDecorMeshes.push(curtain);
            S.model.add(curtain);
          }
        });

        // Subtle sunlit museum air dust motes drifting inside the spotlight cones (GPU ShaderMaterial; bypassed in High-Contrast).
        if (typeof THREE.Points === 'function' && typeof THREE.BufferGeometry === 'function' && (typeof THREE.ShaderMaterial === 'function' || typeof THREE.PointsMaterial === 'function') && (overview || open)) {
          var moteCount = 110;
          var pos = new Float32Array(moteCount * 3);
          var seeds = new Float32Array(moteCount);
          var sizes = new Float32Array(moteCount);
          for (var di = 0; di < moteCount; di++) {
            var bayCx = CENTERS[['room', 'triangle', 'shape'][di % 3]];
            var hA = Math.sin(di * 12.9898 + 4.14) * 43758.5453; hA -= Math.floor(hA);
            var hB = Math.sin(di * 78.233 + 1.73) * 43758.5453; hB -= Math.floor(hB);
            var hC = Math.sin(di * 39.425 + 9.21) * 43758.5453; hC -= Math.floor(hC);
            var r = Math.sqrt(hA) * 2.85, ang = hB * Math.PI * 2;
            pos[di * 3] = bayCx + Math.cos(ang) * r;
            pos[di * 3 + 1] = 1.0 + hC * 5.7;
            pos[di * 3 + 2] = 0.25 + Math.sin(ang) * r * 0.85;
            seeds[di] = hA * 6.28318 + hB * 3.14159;
            sizes[di] = 0.75 + hC * 1.05;
          }
          var dustGeo = new THREE.BufferGeometry();
          dustGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
          dustGeo.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 1));
          dustGeo.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));
          var dustMat = null;
          if (typeof THREE.ShaderMaterial === 'function') {
            var dustTime = { value: STATIC_BEAUTY_TIME };
            galleryTimeUniforms.push(dustTime);
            var dpr = (S.renderer && typeof S.renderer.getPixelRatio === 'function') ? Math.min(2, S.renderer.getPixelRatio() || 1) : 1;
            dustMat = new THREE.ShaderMaterial({
              transparent: true, depthWrite: false, fog: false, toneMapped: false,
              blending: THREE.AdditiveBlending || THREE.NormalBlending,
              uniforms: {
                uTime: dustTime,
                uPixelRatio: { value: dpr },
                uColor: { value: new THREE.Color(0xfff5d8) }
              },
              vertexShader: [
                'attribute float aSeed; attribute float aSize;',
                'uniform float uTime; uniform float uPixelRatio;',
                'varying float vTwinkle;',
                'void main(){',
                '  vec3 p = position;',
                '  float t = uTime * 0.45;',
                '  p.x += sin(t + aSeed) * 0.16;',
                '  p.y += sin(t * 0.70 + aSeed * 1.3) * 0.12;',
                '  p.z += cos(t * 0.85 + aSeed * 0.8) * 0.14;',
                '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
                '  float dist = max(1.0, -mv.z);',
                '  gl_PointSize = clamp(aSize * uPixelRatio * (64.0 / dist), 1.6, 12.0);',
                '  vTwinkle = 0.55 + 0.45 * sin(uTime * 1.2 + aSeed * 2.4);',
                '  gl_Position = projectionMatrix * mv;',
                '}'
              ].join('\n'),
              fragmentShader: [
                'uniform vec3 uColor; varying float vTwinkle;',
                'void main(){',
                '  vec2 c = gl_PointCoord - vec2(0.5);',
                '  float r2 = dot(c, c);',
                '  if (r2 > 0.25) discard;',
                '  float glow = exp(-r2 * 13.5);',
                '  gl_FragColor = vec4(uColor, glow * vTwinkle * 0.44);',
                '}'
              ].join('\n')
            });
          } else if (typeof THREE.PointsMaterial === 'function') {
            dustMat = new THREE.PointsMaterial({
              color: 0xfff5d8,
              map: tex.dustMap || null,
              size: 0.085,
              sizeAttenuation: true,
              transparent: true,
              opacity: 0.42,
              depthWrite: false,
              blending: THREE.AdditiveBlending || THREE.NormalBlending
            });
          }
          if (dustMat) {
            dustPoints = new THREE.Points(dustGeo, dustMat);
            dustPoints.renderOrder = 4;
            dustPoints.visible = !hcInitial;
            galleryDecorMeshes.push(dustPoints);
            S.model.add(dustPoints);
          }
        }

        // Architectural bay divider pilasters and ceiling beams.
        [-5.5, 5.5].forEach(function (x) {
          box(x, 3.5, -6.7, 0.22, 7, 0.25, 0xc6d3cf, null, { tag: 'pilaster', roughness: 0.62, metalness: 0.08, receiveShadow: true });
          box(x, 7.08, -0.6, 0.25, 0.2, 12.6, 0xc6d3cf, null, { tag: 'pilaster', roughness: 0.62, metalness: 0.08 });
        });
      }

      function mannequin(object, color) {
        var group = new THREE.Group(), p = object.position;
        group.position.set(p.x, p.y, p.z);
        S.model.add(group);
        var shadowOpt = { tag: 'mannequin-part', roughness: 0.56, metalness: 0.06, castShadow: true };
        box(0, 0.055, 0, 0.64, 0.11, 0.46, COLORS.ink, group, shadowOpt);
        box(-0.135, 0.39, 0, 0.17, 0.58, 0.21, color, group, shadowOpt);
        box(0.135, 0.39, 0, 0.17, 0.58, 0.21, color, group, shadowOpt);
        box(0, 0.915, 0, 0.53, 0.52, 0.28, color, group, shadowOpt);
        box(-0.278, 0.925, 0, 0.075, 0.45, 0.21, color, group, shadowOpt);
        box(0.278, 0.925, 0, 0.075, 0.45, 0.21, color, group, shadowOpt);
        sphere(0, 1.425, 0, 0.225, color, group, shadowOpt);
        sphere(-0.07, 1.455, 0.203, 0.027, COLORS.ink, group);
        sphere(0.07, 1.455, 0.203, 0.027, COLORS.ink, group);
      }

      function room() {
        var cx = CENTERS.room;
        var bl = liftPoint(-2.85, -2.15, -5, cx), br = liftPoint(2.85, -2.15, 2, cx);
        var tl = liftPoint(-2.85, 2.15, -5, cx), tr = liftPoint(2.85, 2.15, 2, cx);
        var fl = liftPoint(-2.85, -2.15, 4.8, cx), fr = liftPoint(2.85, -2.15, 4.8, cx);
        var ftl = liftPoint(-2.85, 2.15, 4.8, cx), ftr = liftPoint(2.85, 2.15, 4.8, cx);
        var inspectRoom = station === 'room' && open;
        polygon([bl, br, tr, tl], 0xdaeae3, inspectRoom ? 0.16 : 1);
        polygon([bl, fl, ftl, tl], 0xaacdc5, inspectRoom ? 0.12 : 1);
        polygon([br, tr, ftr, fr], 0xc2ddd6, inspectRoom ? 0.12 : 1);
        polygon([bl, br, fr, fl], 0xf6f7ef);
        outline([bl, br, tr, tl], COLORS.teal, 0.032);
        outline([fl, fr, ftr, ftl], COLORS.teal, 0.037);
        rod(fl, bl, 0.024, COLORS.teal); rod(fr, br, 0.024, COLORS.teal);
        rod(ftl, tl, 0.024, COLORS.teal); rod(ftr, tr, 0.024, COLORS.teal);

        // The rear wall is a plane. Ray/plane intersections make its grid look
        // rectangular from the peephole despite its skewed physical dimensions.
        var slope = (br.z - bl.z) / (br.x - bl.x);
        var intercept = bl.z - slope * (bl.x - cx);
        function wallPoint(x, y) {
          var z = (slope * x + intercept) / (1 + slope * x / EYE_Z);
          var result = liftPoint(x, y, z, cx);
          result.z += 0.015;
          return result;
        }
        for (var gx = -2; gx <= 2; gx++) rod(wallPoint(gx, -2.15), wallPoint(gx, 2.15), 0.015, 0x98bdb3);
        for (var gy = -1; gy <= 1; gy++) rod(wallPoint(-2.85, gy), wallPoint(2.85, gy), 0.015, 0x98bdb3);
        for (var stripe = 0; stripe < 7; stripe++) {
          var z0 = -5 + stripe * 1.4, z1 = Math.min(4.8, z0 + 0.7);
          var p0 = liftPoint(-2.85, -2.15, z0, cx), p1 = liftPoint(2.85, -2.15, z0, cx);
          var p2 = liftPoint(2.85, -2.15, z1, cx), p3 = liftPoint(-2.85, -2.15, z1, cx);
          [p0, p1, p2, p3].forEach(function (p) { p.y += 0.012; });
          // Clip the skewed floor with the back-wall plane.
          var input = [p0, p1, p2, p3], clipped = [];
          for (var ci = 0; ci < input.length; ci++) {
            var a = input[ci], b = input[(ci + 1) % input.length];
            var da = a.z - slope * (a.x - cx) - intercept;
            var db = b.z - slope * (b.x - cx) - intercept;
            if (da >= 0) clipped.push(a);
            if ((da >= 0) !== (db >= 0)) {
              var t = da / (da - db);
              clipped.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t });
            }
          }
          if (clipped.length > 2) polygon(clipped, 0xe0e9df);
        }
        var objects = roomObjects(cx);
        objects.forEach(function (object, index) { mannequin(object, index ? COLORS.teal : COLORS.coral); });
        if (inspectRoom) objects.forEach(function (object) {
          var p = object.position;
          rod({ x: p.x + 0.48, y: p.y, z: p.z }, { x: p.x + 0.48, y: p.y + object.height, z: p.z }, 0.018, COLORS.ink);
          for (var tick = 0; tick <= 5; tick++) {
            var y = p.y + object.height * tick / 5;
            rod({ x: p.x + 0.4, y: y, z: p.z }, { x: p.x + 0.56, y: y, z: p.z }, 0.014, COLORS.ink);
          }
          var end = { x: cx, y: EYE_Y, z: EYE_Z };
          rod(p, end, 0.011, 0xd4a329);
        });
        return objects;
      }

      function triangle() {
        var cx = CENTERS.triangle, parts = triangleParts(cx);
        var colors = [0xd76659, 0xf29c8d, 0xec8070];
        parts.forEach(function (points, index) {
          prism(points, colors[index], 0.42);
          // Slender rear supports make the disconnected depth layers legible in inspection.
          var anchor = points.reduce(function (lowest, point) { return point.y < lowest.y ? point : lowest; }, points[0]);
          rod({ x: anchor.x, y: 0.3, z: anchor.z - 0.22 }, { x: anchor.x, y: anchor.y, z: anchor.z - 0.22 }, 0.035, 0x9faeaa);
          box(anchor.x, 0.33, anchor.z - 0.22, 0.55, 0.12, 0.55, 0xc1cfca);
          if (station === 'triangle' && open) outline(points, COLORS.ink, 0.014);
        });
        return parts;
      }

      function shape() {
        var cx = CENTERS.shape, parts = starParts(cx, overview && m.galleryShift != null ? m.galleryShift : m.shift);
        var colors = [0xf5c249, 0xeab13b, 0xf7ca58, 0xf0b83f, 0xe9ad34];
        parts.forEach(function (points, index) {
          prism(points, colors[index % colors.length], 0.16);
          if (station === 'shape' && open) outline(points, 0x977524, 0.012);
        });
        box(cx, 0.37, -0.3, 5.9, 0.22, 7, 0xc9d6d0, null, { tag: 'shape-pad', map: tex.plinthMap, roughness: 0.6, metalness: 0.04, receiveShadow: true });
        return parts;
      }

      architecture();
      exhibit = 'room';
      var objects = room();
      exhibit = 'triangle';
      var beams = triangle();
      exhibit = 'shape';
      var fragments = shape();
      exhibit = null;
      S.galleryPickables = pickables;
      S.gallery = { station: station, view: m.view || 'illusion', objects: objects, beams: beams, fragments: fragments,
        referenceEye: { x: center, y: EYE_Y, z: EYE_Z }, center: center };
      S.tick = (galleryTimeUniforms.length || galleryDecorMeshes.length || gallerySheenUniforms.length) ? function (now) {
        var hc = isHighContrast(S.renderer && S.renderer.domElement);
        for (var di = 0; di < galleryDecorMeshes.length; di++) galleryDecorMeshes[di].visible = !hc;
        for (var si = 0; si < gallerySheenUniforms.length; si++) {
          gallerySheenUniforms[si].uniform.value = hc ? 0.0 : gallerySheenUniforms[si].base;
        }
        var frozen = (S.data && S.data.static) || prefersReducedMotion();
        var t = frozen ? STATIC_BEAUTY_TIME : (now || 0) * 0.001;
        for (var ui = 0; ui < galleryTimeUniforms.length; ui++) galleryTimeUniforms[ui].value = t;
      } : null;
      S.target.set(overview ? 0 : center, overview ? 2.5 : EYE_Y, overview ? -1 : 0);
      S.fitPts = [];
      var bounds = overview ? [-16, 16, 0, 7, -7, 6] : station === 'room' ? [-4.3, 3, 0, 6.5, -5.5, 5] : [-4, 4, 0.2, 6.2, -3.2, 3];
      for (var xi = 0; xi < 2; xi++) for (var yi = 0; yi < 2; yi++) for (var zi = 0; zi < 2; zi++) {
        S.fitPts.push(new THREE.Vector3((overview ? 0 : center) + bounds[xi], bounds[2 + yi], bounds[4 + zi]));
      }
    }

    function camera(THREE, S, m) {
      m = m || {};
      var center = Object.prototype.hasOwnProperty.call(CENTERS, m.station) ? CENTERS[m.station] : CENTERS.room;
      if (m.view !== 'inspect' && m.view !== 'gallery') {
        var angle = (m.station === 'triangle' ? clamp(m.angle, -60, 60) : 0) * Math.PI / 180;
        S.camera.position.set(center + EYE_Z * Math.sin(angle), EYE_Y, EYE_Z * Math.cos(angle));
        S.camera.lookAt(new THREE.Vector3(center, EYE_Y, 0));
        var halfHeight = Math.max(2.85, 3.55 / Math.max(0.3, S.camera.aspect));
        S.camera.fov = 2 * Math.atan(halfHeight / EYE_Z) * 180 / Math.PI;
        S.camera.near = 0.06;
        S.camera.far = 150;
        projectLayout(THREE, S, m);
        return;
      }
      var gallery = m.view === 'gallery';
      var yaw = ((gallery ? 17 : 30) + clamp(m.rotY, -180, 180)) * Math.PI / 180;
      var pitch = clamp((gallery ? 19 : 22) + (Number(m.rotX) || 0), 8, 78) * Math.PI / 180;
      var direction = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
      var right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize();
      var up = new THREE.Vector3().crossVectors(direction, right).normalize();
      var tanV = Math.tan(42 * Math.PI / 360), tanH = tanV * Math.max(0.2, S.camera.aspect), fit = 1;
      if (Array.isArray(S.fitPts)) S.fitPts.forEach(function (point) {
        var offset = point.clone().sub(S.target), along = offset.dot(direction);
        fit = Math.max(fit, Math.abs(offset.dot(right)) / tanH + along, Math.abs(offset.dot(up)) / tanV + along);
      });
      S.camera.position.copy(S.target).addScaledVector(direction, fit * 1.04 / Math.max(0.8, Math.min(1.3, Number(m.zoom) || 1)));
      S.camera.lookAt(S.target);
      S.camera.near = 0.06;
      S.camera.far = 200;
      projectLayout(THREE, S, m);
    }

    var viewer = Lab.makeOrbitViewer({
      attr: 'data-perception-gallery-gl', clearColor: 0xeff3f1, radius: '0px', fov: 42,
      build: build, camera: camera,
      lights: function (THREE, scene, S) {
        S.renderer.outputEncoding = THREE.sRGBEncoding;
        S.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        S.renderer.toneMappingExposure = 0.96;
        if (S.renderer.shadowMap) {
          S.renderer.shadowMap.enabled = true;
          if (THREE.PCFSoftShadowMap != null) S.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        }
        if (typeof THREE.FogExp2 === 'function') scene.fog = new THREE.FogExp2(0xeff3f1, 0.0065);
        // Warm museum skylight + oak floor bounce hemisphere.
        scene.add(new THREE.HemisphereLight(0xfefcf8, 0xbab4a8, 0.62));
        // Primary warm gallery key light with soft architectural shadows.
        var key = new THREE.DirectionalLight(0xfff5e2, 0.76);
        key.position.set(5, 14, 11);
        key.castShadow = true;
        if (key.shadow) {
          if (key.shadow.mapSize && key.shadow.mapSize.set) key.shadow.mapSize.set(1024, 1024);
          if (key.shadow.camera) {
            key.shadow.camera.left = -20; key.shadow.camera.right = 20;
            key.shadow.camera.top = 12; key.shadow.camera.bottom = -12;
            key.shadow.camera.near = 2; key.shadow.camera.far = 36;
          }
          key.shadow.bias = -0.0006;
          key.shadow.radius = 3;
        }
        scene.add(key);
        // Cool clerestory fill light from the upper left for crisp form separation.
        var fill = new THREE.DirectionalLight(0xd9efff, 0.28);
        fill.position.set(-13, 9, 2); scene.add(fill);
        // Subtle architectural rear-right rim light to outline suspended exhibit edges.
        var rim = new THREE.DirectionalLight(0xfff1dc, 0.20);
        rim.position.set(14, 7, -10); scene.add(rim);
      },
      debug: function (S) {
        if (!S.gallery) return {};
        var data = S.gallery;
        function projected(points) {
          return points.map(function (p) {
            var v = new S.THREE.Vector3(p.x, p.y, p.z).project(S.camera);
            return { x: v.x, y: v.y, z: v.z };
          });
        }
        return {
          station: data.station, view: S.data && S.data.view, static: !!(S.data && S.data.static),
          referenceEye: data.referenceEye,
          camera: { x: S.camera.position.x, y: S.camera.position.y, z: S.camera.position.z, fov: S.camera.fov },
          roomObjects: data.objects.map(function (o) { return { position: o.position, width: o.width, height: o.height, depth: o.depth }; }),
          triangleProjected: data.beams.map(projected), shapeProjected: data.fragments.map(projected),
          triangleDepths: data.beams.map(function (part) { return part[0].z; }),
          triangleEndDepths: data.beams.map(function (part) { return [part[0].z, part[1].z]; }),
          shapeDepths: data.fragments.map(function (part) { return part[0].z; }),
          galleryHotspots: layoutSnapshot(), pickableCount: (S.galleryPickables || []).length
        };
      },
      failMessage: 'The illusion gallery could not start its 3D view.'
    });
    var attach = viewer.attach, dispose = viewer.dispose, subscribeStatus = viewer.onStatusChange;

    function statusChanged(next) {
      if (next !== 'ready') publishLayout([]);
      if (next === 'failed') disposeGalleryTextures();
      if (statusNotify) { try { statusNotify(next); } catch (e) {} }
    }

    subscribeStatus(statusChanged);
    viewer.onStatusChange = function (fn) { statusNotify = typeof fn === 'function' ? fn : null; };
    viewer.onLayout = function (fn) {
      layoutNotify = typeof fn === 'function' ? fn : null;
      if (layoutNotify) { try { layoutNotify(layoutSnapshot()); } catch (e) {} }
      return function () { if (layoutNotify === fn) layoutNotify = null; };
    };
    viewer.pickStation = function (clientX, clientY) {
      var S = sceneState;
      if (!S || S.disposing || S.failed || S.contextLost || !S.renderer ||
          !S.data || S.data.view !== 'gallery' || typeof clientX !== 'number' || !Number.isFinite(clientX) || typeof clientY !== 'number' || !Number.isFinite(clientY) || viewer.status() !== 'ready') return null;
      var canvas = S.renderer.domElement, rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height || clientX < rect.left || clientY < rect.top ||
          clientX > rect.left + rect.width || clientY > rect.top + rect.height) return null;
      var ray = new S.THREE.Raycaster();
      var pointer = new S.THREE.Vector2((clientX - rect.left) / rect.width * 2 - 1, 1 - (clientY - rect.top) / rect.height * 2);
      S.camera.updateMatrixWorld(true);
      S.model.updateMatrixWorld(true);
      ray.setFromCamera(pointer, S.camera);
      var hits = ray.intersectObjects(S.galleryPickables || [], false);
      return hits.length ? hits[0].object.userData.perceptionStation || null : null;
    };
    viewer.attach = function (host) {
      if (host && attachedHost === host) return;
      var generation = ++attachment;
      attachedHost = host || null;
      sceneState = null;
      publishLayout([]);
      disposeGalleryTextures();
      subscribeStatus(statusChanged);
      attach(host);
      if (!host) Promise.resolve().then(function () {
        if (!attachedHost && attachment === generation) { layoutNotify = null; statusNotify = null; disposeGalleryTextures(); }
      });
    };
    viewer.dispose = function () {
      attachment++;
      sceneState = null;
      attachedHost = null;
      publishLayout([]);
      layoutNotify = null;
      statusNotify = null;
      disposeGalleryTextures();
      dispose();
    };
    return viewer;
  }

  Lab.PerceptionGalleryScene = { createViewer: createViewer, liftPoint: liftPoint, projectPoint: projectPoint,
    roomObjects: roomObjects, triangleParts: triangleParts, starParts: starParts, measurements: measurements };
}(typeof window !== 'undefined' && window ? window : (typeof globalThis !== 'undefined' ? globalThis : this)));
