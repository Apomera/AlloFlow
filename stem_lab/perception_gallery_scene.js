(function () {
  'use strict';

  var Lab = window.StemLab = window.StemLab || {};
  var EYE_Y = 3.2, EYE_Z = 12;
  var CENTERS = { room: -11, triangle: 0, shape: 11 };
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
    var scale = EYE_Z / (EYE_Z - point.z);
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
      var station = CENTERS[m.station] == null ? 'room' : m.station;
      var center = CENTERS[station];
      var overview = m.view === 'gallery';
      var open = m.view === 'inspect';
      var materials = {}, pickables = [], exhibit = null;

      function tagExhibit(mesh) {
        if (exhibit) {
          mesh.userData.perceptionStation = exhibit;
          pickables.push(mesh);
        }
        return mesh;
      }

      function material(color, opacity) {
        var key = color + ':' + (opacity == null ? 1 : opacity);
        if (!materials[key]) {
          materials[key] = new THREE.MeshStandardMaterial({
            color: color, roughness: 0.73, metalness: 0.04, side: THREE.DoubleSide,
            transparent: opacity != null && opacity < 1, opacity: opacity == null ? 1 : opacity,
            depthWrite: opacity == null || opacity >= 1
          });
          // r128 expects linear material colors when the renderer outputs sRGB.
          materials[key].color.convertSRGBToLinear();
        }
        return materials[key];
      }

      function box(x, y, z, w, h, d, color, parent) {
        var mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material(color));
        mesh.position.set(x, y, z);
        (parent || S.model).add(mesh);
        return tagExhibit(mesh);
      }

      function sphere(x, y, z, radius, color, parent) {
        var mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 14), material(color));
        mesh.position.set(x, y, z);
        (parent || S.model).add(mesh);
        return tagExhibit(mesh);
      }

      function rod(from, to, radius, color, parent) {
        var a = new THREE.Vector3(from.x, from.y, from.z), b = new THREE.Vector3(to.x, to.y, to.z);
        var direction = new THREE.Vector3().subVectors(b, a);
        var mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 10), material(color));
        mesh.position.copy(a).add(b).multiplyScalar(0.5);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
        (parent || S.model).add(mesh);
        return tagExhibit(mesh);
      }

      function polygon(points, color, opacity, parent) {
        var positions = [], indices = [];
        points.forEach(function (p) { positions.push(p.x, p.y, p.z); });
        for (var i = 1; i < points.length - 1; i++) indices.push(0, i, i + 1);
        var geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        var mesh = new THREE.Mesh(geometry, material(color, opacity));
        (parent || S.model).add(mesh);
        return tagExhibit(mesh);
      }

      function prism(points, color, thickness, parent) {
        polygon(points, color, null, parent);
        var backs = points.map(function (p) { return { x: p.x, y: p.y, z: p.z - thickness }; });
        polygon(backs.slice().reverse(), color, null, parent);
        for (var i = 0; i < points.length; i++) {
          var next = (i + 1) % points.length;
          polygon([points[i], backs[i], backs[next], points[next]], color, null, parent);
        }
      }

      function outline(points, color, radius, parent) {
        for (var i = 0; i < points.length; i++) rod(points[i], points[(i + 1) % points.length], radius, color, parent);
      }

      function ring(x, y, z, radius, color) {
        var mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.045, 8, 48), material(color));
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(x, y, z);
        S.model.add(mesh);
      }

      function architecture() {
        box(0, -0.2, 0, 36, 0.4, 23, COLORS.floor);
        box(0, 4.2, -7.3, 36, 8.4, 0.25, 0xf5f7f6);
        box(-17.8, 3.5, 0, 0.25, 7, 14.5, 0xe2e8e6);
        box(17.8, 3.5, 0, 0.25, 7, 14.5, 0xe2e8e6);
        box(0, 0.025, 6.5, 33, 0.03, 0.1, COLORS.teal);
        for (var gridX = -17; gridX <= 17; gridX += 2) box(gridX, 0.007, 0, 0.016, 0.008, 22, 0xcbd5d3);
        for (var gridZ = -7; gridZ <= 11; gridZ += 2) box(0, 0.009, gridZ, 35, 0.008, 0.016, 0xcbd5d3);
        ['room', 'triangle', 'shape'].forEach(function (key, index) {
          var cx = CENTERS[key], color = [COLORS.teal, COLORS.coral, COLORS.gold][index];
          box(cx, 6.9, -7.08, 8.9, 0.32, 0.18, color);
          box(cx, 0.14, -0.4, 8.5, 0.25, 11.3, 0xd9e2e0);
          box(cx, 0.285, 4.7, 8.5, 0.035, 0.18, color);
          ring(cx, 0.045, 7.3, 0.64, color);
          for (var dot = 0; dot <= index; dot++) sphere(cx + (dot - index / 2) * 0.35, 6.35, -7.02, 0.095, color);
        });
        [-5.5, 5.5].forEach(function (x) {
          box(x, 3.5, -6.7, 0.22, 7, 0.25, 0xc6d3cf);
          box(x, 7.08, -0.6, 0.25, 0.2, 12.6, 0xc6d3cf);
        });
      }

      function mannequin(object, color) {
        var group = new THREE.Group(), p = object.position;
        group.position.set(p.x, p.y, p.z);
        S.model.add(group);
        box(0, 0.055, 0, 0.64, 0.11, 0.46, COLORS.ink, group);
        box(-0.135, 0.39, 0, 0.17, 0.58, 0.21, color, group);
        box(0.135, 0.39, 0, 0.17, 0.58, 0.21, color, group);
        box(0, 0.915, 0, 0.53, 0.52, 0.28, color, group);
        box(-0.278, 0.925, 0, 0.075, 0.45, 0.21, color, group);
        box(0.278, 0.925, 0, 0.075, 0.45, 0.21, color, group);
        sphere(0, 1.425, 0, 0.225, color, group);
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
        box(cx, 0.37, -0.3, 5.9, 0.22, 7, 0xc9d6d0);
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
      S.target.set(overview ? 0 : center, overview ? 2.5 : EYE_Y, overview ? -1 : 0);
      S.fitPts = [];
      var bounds = overview ? [-16, 16, 0, 7, -7, 6] : station === 'room' ? [-4.3, 3, 0, 6.5, -5.5, 5] : [-4, 4, 0.2, 6.2, -3.2, 3];
      for (var xi = 0; xi < 2; xi++) for (var yi = 0; yi < 2; yi++) for (var zi = 0; zi < 2; zi++) {
        S.fitPts.push(new THREE.Vector3((overview ? 0 : center) + bounds[xi], bounds[2 + yi], bounds[4 + zi]));
      }
    }

    function camera(THREE, S, m) {
      var center = CENTERS[m.station] == null ? CENTERS.room : CENTERS[m.station];
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
      S.fitPts.forEach(function (point) {
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
        S.renderer.toneMappingExposure = 0.92;
        scene.add(new THREE.HemisphereLight(0xffffff, 0xb4c5bd, 0.65));
        var key = new THREE.DirectionalLight(0xfff7e7, 0.6);
        key.position.set(4, 14, 10); scene.add(key);
        var fill = new THREE.DirectionalLight(0xe0f5ff, 0.24);
        fill.position.set(-12, 8, -2); scene.add(fill);
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
          !S.data || S.data.view !== 'gallery' || !isFinite(clientX) || !isFinite(clientY) || viewer.status() !== 'ready') return null;
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
      subscribeStatus(statusChanged);
      attach(host);
      if (!host) Promise.resolve().then(function () {
        if (!attachedHost && attachment === generation) { layoutNotify = null; statusNotify = null; }
      });
    };
    viewer.dispose = function () {
      attachment++;
      sceneState = null;
      attachedHost = null;
      publishLayout([]);
      layoutNotify = null;
      statusNotify = null;
      dispose();
    };
    return viewer;
  }

  Lab.PerceptionGalleryScene = { createViewer: createViewer, liftPoint: liftPoint, projectPoint: projectPoint,
    roomObjects: roomObjects, triangleParts: triangleParts, starParts: starParts, measurements: measurements };
}());
