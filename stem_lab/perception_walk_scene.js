(function () {
  'use strict';

  var Lab = window.StemLab = window.StemLab || {};
  var EYE_Y = 1.65, REFERENCE_Z = 9, INTERACTION_RANGE = 7, PANEL_RANGE = 10, CONTINUITY_RANGE = 12, CHANGE_RANGE = 14, ROTATION_RANGE = 14, RELIEF_RANGE = 14, SHAPE_RANGE = 14, MOTION_RANGE = 14, FRAME_RANGE = 14, WEAVE_RANGE = 16, LANDING_RANGE = 16, APERTURE_RANGE = 18, LENGTH_RANGE = 18, INSPECTION_RANGE = 20;
  var COLORS = { teal: 0x208e87, coral: 0xe87967, gold: 0xe9b342, ink: 0x324d50,
    floor: 0xe8ece9, wall: 0xf6f8f5, metal: 0xadbdb6 };

  function number(value, fallback) {
    return typeof value === 'number' && isFinite(value) ? value : fallback;
  }

  function clamp(value, low, high) { return Math.max(low, Math.min(high, value)); }

  function cameraDirection(player) {
    player = player || {};
    var yaw = number(player.yaw, 0) * Math.PI / 180;
    var pitch = clamp(number(player.pitch, 0), -45, 45) * Math.PI / 180;
    return { x: Math.sin(yaw) * Math.cos(pitch), y: Math.sin(pitch), z: -Math.cos(yaw) * Math.cos(pitch) };
  }

  // Lift an image-space circle along reference-eye rays. Its disconnected
  // pieces line up at that eye, but their different depths produce parallax.
  function ringParts() {
    var parts = [];
    for (var index = 0; index < 12; index++) {
      var depth = [-3, 0, 3][index % 3], scale = (REFERENCE_Z - depth) / REFERENCE_Z;
      var points = [];
      for (var step = 0; step <= 16; step++) {
        var theta = Math.PI / 6 + (index + step / 16) * Math.PI / 6;
        points.push({ x: -12 + 1.35 * Math.cos(theta) * scale,
          y: EYE_Y + 1.35 * Math.sin(theta) * scale, z: depth });
      }
      parts.push({ index: index, depth: depth, radius: 0.065 * scale, points: points });
    }
    return parts;
  }

  function scaleObjects(blockZ) {
    return [
      { id: 'reference-block', x: -0.95, y: EYE_Y, z: -3, width: 1, height: 2.4, depth: 0.12 },
      { id: 'scale-block', x: 0.95, y: EYE_Y, z: clamp(number(blockZ, -1), -1, 6), width: 0.5, height: 1.2, depth: 0.12 }
    ];
  }

  function tokenObjects() {
    return [10.5, 12, 13.5].map(function (x, index) {
      return { id: 'token-' + index, index: index, x: x, y: 1.25, z: -1.5 };
    });
  }

  function parallaxObjects() {
    return [
      { id: 'parallax-A', choice: 'A', x: 22.4, y: EYE_Y, z: 1, radius: 0.56 },
      { id: 'parallax-B', choice: 'B', x: 24, y: EYE_Y, z: -3, radius: 0.84 },
      { id: 'parallax-C', choice: 'C', x: 25.8, y: EYE_Y, z: 4, radius: 0.35 }
    ];
  }

  function contourObjects() {
    return [
      { id: 'contour-0', index: 0, choice: 'A', x: 34.8, y: 3.15, z: 0.15, radius: 0.65, depth: 0.14, angle: 90, desiredAngle: 315 },
      { id: 'contour-1', index: 1, choice: 'B', x: 37.2, y: 3.15, z: 0.15, radius: 0.65, depth: 0.14, angle: 0, desiredAngle: 225 },
      { id: 'contour-2', index: 2, choice: 'C', x: 37.2, y: 0.75, z: 0.15, radius: 0.65, depth: 0.14, angle: 270, desiredAngle: 135 },
      { id: 'contour-3', index: 3, choice: 'D', x: 34.8, y: 0.75, z: 0.15, radius: 0.65, depth: 0.14, angle: 180, desiredAngle: 45 }
    ];
  }

  function contextObjects() {
    return [
      { id: 'context-A', choice: 'A', x: 46.75, y: 3.25, z: 0, width: 2.2, height: 1.9, tileSize: 0.75, tileColor: 0x888888, backgroundColor: 0xededed },
      { id: 'context-B', choice: 'B', x: 49.25, y: 3.25, z: 0, width: 2.2, height: 1.9, tileSize: 0.75, tileColor: 0xa0a0a0, backgroundColor: 0xededed },
      { id: 'context-C', choice: 'C', x: 46.75, y: 1.05, z: 0, width: 2.2, height: 1.9, tileSize: 0.75, tileColor: 0x888888, backgroundColor: 0x202020 },
      { id: 'context-D', choice: 'D', x: 49.25, y: 1.05, z: 0, width: 2.2, height: 1.9, tileSize: 0.75, tileColor: 0x707070, backgroundColor: 0x292929 }
    ];
  }

  function continuationObjects(offset) {
    offset = clamp(number(offset, 0.8), -1.2, 1.2);
    function point(x, shift) { return { x: x, y: 2.4 + 0.35 * (x - 60) + shift, z: 0 }; }
    return [
      { id: 'continuity-fixed', from: point(57.2, 0), to: point(59.4, 0) },
      { id: 'continuity-rod', from: point(60.6, offset), to: point(62.8, offset) }
    ];
  }

  function createViewer() {
    if (typeof Lab.makeOrbitViewer !== 'function') return null;
    if (!Lab.PerceptionWalk || ['shadowGeometry', 'shadowProfile', 'shadowOutline', 'changeObjects', 'changeTarget', 'rotationObjects', 'rotationMatch', 'reliefObjects', 'reliefSurface', 'reliefLight', 'reliefShade', 'shapeObjects', 'shapePoint', 'shapeTarget', 'motionObjects', 'motionTargets', 'frameObjects', 'frameDefaults', 'weaveObjects', 'weaveOrder', 'landingObjects', 'landingLight', 'apertureObjects', 'lengthObjects'].some(function (key) { return typeof Lab.PerceptionWalk[key] !== 'function'; })) return null;
    var sceneState = null, attachedHost = null, attachment = 0;
    var layout = [], layoutSignature = '', layoutNotify = null, statusNotify = null;

    function layoutSnapshot() {
      return layout.map(function (marker) { return Object.assign({}, marker); });
    }

    function publishLayout(next) {
      var signature = JSON.stringify(next);
      if (signature === layoutSignature) return;
      layout = next;
      layoutSignature = signature;
      if (layoutNotify) { try { layoutNotify(layoutSnapshot()); } catch (e) {} }
    }

    function projectLayout(THREE, S) {
      publishLayout(['ring', 'scale', 'occlusion', 'parallax', 'contour', 'context', 'continuity', 'shadow', 'change', 'rotation', 'relief', 'shape', 'motion', 'frame', 'weave', 'landing', 'aperture', 'length'].map(function (id, index) {
        var anchor = new THREE.Vector3((index - 1) * 12, 4.9, 0);
        var distance = anchor.distanceTo(S.camera.position);
        var point = anchor.project(S.camera);
        return { id: id, x: (point.x + 1) / 2, y: (1 - point.y) / 2, distance: distance,
          visible: distance > 1.5 && point.x >= -1 && point.x <= 1 &&
            point.y >= -1 && point.y <= 1 && point.z >= -1 && point.z <= 1 };
      }));
    }

    function build(THREE, S, data) {
      var materials = {}, flatMaterials = {}, solids = [], parallaxLabels = [], panelLabels = [], changeLabels = [], rotationLabels = [], reliefLabels = [], shapeLabels = [], motionLabels = [], weaveLabels = [], landingLabels = [];
      var collected = Array.isArray(data.collected) ? data.collected : [];
      var activity = ['ring', 'scale', 'occlusion', 'parallax', 'contour', 'context', 'continuity', 'shadow', 'change', 'rotation', 'relief', 'shape', 'motion', 'frame', 'weave', 'landing', 'aperture', 'length'].indexOf(data.activity) >= 0 ? data.activity : 'ring';

      function material(color) {
        if (!materials[color]) {
          materials[color] = new THREE.MeshStandardMaterial({ color: color, roughness: 0.72,
            metalness: 0.06, side: THREE.DoubleSide });
          materials[color].color.convertSRGBToLinear();
        }
        return materials[color];
      }

      function flatMaterial(color) {
        if (!flatMaterials[color]) {
          flatMaterials[color] = new THREE.MeshBasicMaterial({ color: color, toneMapped: false, side: THREE.DoubleSide });
          flatMaterials[color].color.convertSRGBToLinear();
        }
        return flatMaterials[color];
      }

      function add(geometry, color, position, id, rotation) {
        var mesh = new THREE.Mesh(geometry, material(color));
        if (position) mesh.position.set(position.x, position.y, position.z);
        if (rotation) mesh.rotation.set(rotation.x || 0, rotation.y || 0, rotation.z || 0);
        if (id) mesh.userData.perceptionInteraction = id;
        S.model.add(mesh);
        solids.push(mesh);
        return mesh;
      }

      function box(x, y, z, width, height, depth, color, id) {
        return add(new THREE.BoxGeometry(width, height, depth), color, { x: x, y: y, z: z }, id);
      }

      function flatBox(x, y, z, width, height, depth, color, id) {
        var mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), flatMaterial(color));
        mesh.position.set(x, y, z);
        if (id) mesh.userData.perceptionInteraction = id;
        S.model.add(mesh);
        solids.push(mesh);
        return mesh;
      }

      function rod(from, to, radius, color, id) {
        var a = new THREE.Vector3(from.x, from.y, from.z), b = new THREE.Vector3(to.x, to.y, to.z);
        var direction = new THREE.Vector3().subVectors(b, a);
        var mesh = add(new THREE.CylinderGeometry(radius, radius, direction.length(), 10), color, null, id);
        mesh.position.copy(a).add(b).multiplyScalar(0.5);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
        return mesh;
      }

      function floorRing(x, z, radius, color, width) {
        return add(new THREE.TorusGeometry(radius, width || 0.027, 8, 64), color,
          { x: x, y: 0.027, z: z }, null, { x: -Math.PI / 2 });
      }

      function measure(object, color) {
        var x = object.x + object.width / 2 + 0.25;
        var low = object.y - object.height / 2, high = object.y + object.height / 2;
        rod({ x: x, y: low, z: object.z }, { x: x, y: high, z: object.z }, 0.016, color);
        for (var i = 0; i <= 4; i++) {
          var y = low + object.height * i / 4;
          rod({ x: x - 0.075, y: y, z: object.z }, { x: x + 0.075, y: y, z: object.z }, 0.011, color);
        }
      }

      function label(text, x, y, z, width, height) {
        var canvas = document.createElement('canvas');
        canvas.width = Math.round(128 * width / height);
        canvas.height = 128;
        var context = canvas.getContext('2d');
        if (!context) return;
        context.fillStyle = '#f6f8f5';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.strokeStyle = '#324d50';
        context.lineWidth = 5;
        context.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
        context.fillStyle = '#203032';
        context.font = 'bold 82px sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2 + 5);
        var texture = new THREE.CanvasTexture(canvas);
        texture.encoding = THREE.sRGBEncoding;
        var sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, toneMapped: false }));
        sprite.position.set(x, y, z);
        sprite.scale.set(width, height, 1);
        // The shared viewer disposes scene objects and materials, but not maps.
        sprite.dispose = function () { texture.dispose(); };
        S.model.add(sprite);
        return sprite;
      }

      function architecture() {
        box(90, -0.15, 3, 220.4, 0.3, 22.4, COLORS.floor);
        box(90, 2.8, -8.2, 220.4, 5.6, 0.4, COLORS.wall);
        box(90, 2.8, 14.2, 220.4, 5.6, 0.4, COLORS.wall);
        box(-20.2, 2.8, 3, 0.4, 5.6, 22.4, 0xe1e8e4);
        box(200.2, 2.8, 3, 0.4, 5.6, 22.4, 0xe1e8e4);
        box(90, 5.65, 3, 220.4, 0.2, 22.4, 0xf8faf7);
        box(90, 0.12, -7.96, 220, 0.24, 0.06, 0xcbd7d0);
        box(90, 0.12, 13.96, 220, 0.24, 0.06, 0xcbd7d0);
        for (var gx = -20; gx <= 200; gx += 2) box(gx, 0.003, 3, 0.012, 0.006, 22, 0xcbd6cf);
        for (var gz = -8; gz <= 14; gz += 2) box(90, 0.004, gz, 220, 0.006, 0.012, 0xcbd6cf);
        [-18, -6, 6, 18, 30, 42, 54, 66, 78, 90, 102, 114, 126, 138, 150, 162, 174, 186, 198].forEach(function (x) {
          box(x, 2.75, -7.76, 0.24, 5.5, 0.25, 0xd2ded6);
          box(x, 5.35, 2.8, 0.19, 0.25, 21.4, 0xd6e0da);
        });
        [-12, 0, 12, 24, 36, 48, 60, 72, 84, 96, 108, 120, 132, 144, 156, 168, 180, 192].forEach(function (x, index) {
          var color = [COLORS.gold, COLORS.teal, COLORS.coral, COLORS.ink, COLORS.teal, COLORS.gold, COLORS.coral, COLORS.teal, COLORS.gold, COLORS.teal, COLORS.coral, COLORS.teal, COLORS.gold, COLORS.coral, COLORS.teal, COLORS.gold, COLORS.coral, COLORS.gold][index];
          box(x, 3.35, -7.95, 9, 3.1, 0.045, 0xeaf0eb);
          box(x, 4.92, -7.88, 9, 0.13, 0.11, color);
          box(x, 0.017, 5.75, 8.6, 0.018, 0.075, color);
          box(x - 4.3, 0.013, -0.9, 0.05, 0.012, 13.2, color);
          box(x + 4.3, 0.013, -0.9, 0.05, 0.012, 13.2, color);
          for (var dot = 0; dot <= index; dot++) {
            add(new THREE.CylinderGeometry(0.075, 0.075, 0.025, 20), color,
              { x: x + (dot - index / 2) * 0.25, y: 0.025, z: 6.25 });
          }
          box(x, 5.48, -2.5, 6.5, 0.06, 0.55, 0xffffff);
          box(x, 5.48, 8.5, 6.5, 0.06, 0.55, 0xffffff);
        });
        // Shallow wall reliefs keep the exhibits legible while turning around.
        [-12, 0, 12, 24, 36, 48, 60, 72, 84, 96, 108, 120, 132, 144, 156, 168, 180, 192].forEach(function (x, index) {
          var color = [COLORS.gold, COLORS.teal, COLORS.coral, COLORS.ink, COLORS.teal, COLORS.gold, COLORS.coral, COLORS.teal, COLORS.gold, COLORS.teal, COLORS.coral, COLORS.teal, COLORS.gold, COLORS.coral, COLORS.teal, COLORS.gold, COLORS.coral, COLORS.gold][index];
          for (var bar = 0; bar < 7; bar++) {
            box(x - 2.4 + bar * 0.8, 2.5, 13.96, 0.09, 1.1 + (bar % 3) * 0.48, 0.05, color);
          }
        });
      }

      function ringExhibit() {
        var parts = ringParts();
        parts.forEach(function (part) {
          var path = new THREE.Curve();
          path.getPoint = function (t, target) {
            target = target || new THREE.Vector3();
            var theta = Math.PI / 6 + (part.index + t) * Math.PI / 6;
            var scale = (REFERENCE_Z - part.depth) / REFERENCE_Z;
            return target.set(-12 + 1.35 * Math.cos(theta) * scale,
              EYE_Y + 1.35 * Math.sin(theta) * scale, part.depth);
          };
          add(new THREE.TubeGeometry(path, 20, part.radius, 12, false), COLORS.gold);
          var top = part.points.reduce(function (highest, point) { return point.y > highest.y ? point : highest; });
          rod(top, { x: top.x, y: 4.25, z: top.z }, 0.007, 0xc2ccc4);
        });
        [-3, 0, 3].forEach(function (z) { box(-12, 4.27, z, 4.7, 0.07, 0.08, COLORS.metal); });
        if (activity === 'ring' && data.reveal) {
          floorRing(-12, REFERENCE_Z, 0.38, COLORS.gold, 0.04);
          box(-12, 0.027, REFERENCE_Z - 0.48, 0.07, 0.018, 0.24, COLORS.gold);
          parts.forEach(function (part) {
            var p = part.points[8];
            rod({ x: -12, y: EYE_Y, z: REFERENCE_Z }, p, 0.005, 0xc7ac69);
          });
        }
        return parts;
      }

      function scaleExhibit() {
        var objects = scaleObjects(data.blockZ);
        box(0.95, 0.018, 2.5, 0.15, 0.025, 7.2, 0xa4b9af);
        for (var z = -1; z <= 6; z++) box(0.95, 0.034, z, 0.36, 0.025, 0.035, COLORS.ink);
        objects.forEach(function (object, index) {
          var color = index ? COLORS.teal : COLORS.coral;
          var id = index ? object.id : null;
          var block = box(object.x, object.y, object.z, object.width, object.height, object.depth, color, id);
          if (index && activity === 'scale' && data.selected) {
            var outlineMaterial = new THREE.LineBasicMaterial({ color: COLORS.ink });
            outlineMaterial.color.convertSRGBToLinear();
            var outline = new THREE.LineSegments(new THREE.EdgesGeometry(block.geometry), outlineMaterial);
            outline.position.copy(block.position);
            outline.scale.setScalar(1.018);
            S.model.add(outline);
          }
          var base = object.y - object.height / 2;
          rod({ x: object.x, y: 0.07, z: object.z - 0.02 },
            { x: object.x, y: base, z: object.z - 0.02 }, 0.038, COLORS.metal, id);
          box(object.x, 0.065, object.z, object.width + 0.18, 0.13, 0.43, 0xb9c9c0, id);
          if (activity === 'scale' && data.reveal) measure(object, COLORS.ink);
        });
        if (activity === 'scale' && data.reveal) {
          floorRing(0, REFERENCE_Z, 0.38, COLORS.teal, 0.04);
          objects.forEach(function (object) {
            rod({ x: 0, y: EYE_Y, z: REFERENCE_Z },
              { x: object.x, y: object.y + object.height / 2, z: object.z }, 0.005, 0xa7bfb2);
          });
        }
        return objects;
      }

      function occlusionExhibit() {
        box(12, 1.4, 2, 4, 2.8, 0.4, 0xd9e5de);
        box(12, 2.81, 2, 4.05, 0.035, 0.45, COLORS.coral);
        box(12, 0.08, 2.23, 3.95, 0.16, 0.045, 0xbaccc0);
        for (var slot = 0; slot < 8; slot++) box(10.25 + slot * 0.5, 1.35, 2.208, 0.012, 2.3, 0.014, 0xc2d4c6);
        var tokens = tokenObjects();
        tokens.forEach(function (token, index) {
          var found = collected.indexOf(index) >= 0;
          var color = found ? 0xb9c7bf : [COLORS.gold, COLORS.teal, COLORS.coral][index];
          var id = found ? null : token.id;
          var position = { x: token.x, y: token.y, z: token.z };
          box(token.x, 0.055, token.z, 0.63, 0.11, 0.63, 0xc4d2c8);
          rod({ x: token.x, y: 0.1, z: token.z }, { x: token.x, y: 0.83, z: token.z }, 0.035, COLORS.metal);
          if (index === 0) {
            add(new THREE.TorusGeometry(0.31, 0.1, 14, 40), color, position, id);
          } else if (index === 1) {
            add(new THREE.OctahedronGeometry(0.45, 0), color, position, id);
          } else {
            box(token.x, token.y, token.z, 0.68, 0.22, 0.22, color, id);
            box(token.x, token.y, token.z, 0.22, 0.68, 0.22, color, id);
          }
          if (found) floorRing(token.x, token.z, 0.4, COLORS.teal, 0.022);
        });
        if (activity === 'occlusion' && data.reveal) {
          [-1, 1].forEach(function (side) {
            var x = 12 + side * 3.2;
            box(x, 0.024, 2.3, 0.09, 0.022, 5.7, COLORS.coral);
            floorRing(x, -0.55, 0.25, COLORS.coral);
          });
        }
        return tokens;
      }

      function parallaxExhibit() {
        var objects = parallaxObjects();
        objects.forEach(function (object, index) {
          var color = [COLORS.coral, COLORS.gold, COLORS.teal][index];
          var sphere = add(new THREE.SphereGeometry(object.radius, 32, 24), color, object, object.id);
          if (activity === 'parallax' && data.parallaxChoice === object.choice) {
            var outlineMaterial = new THREE.MeshBasicMaterial({ color: COLORS.ink, side: THREE.BackSide });
            outlineMaterial.color.convertSRGBToLinear();
            var outline = new THREE.Mesh(sphere.geometry, outlineMaterial);
            outline.position.copy(sphere.position);
            outline.scale.setScalar(1.08);
            S.model.add(outline);
          }
          // Proportional labels preserve the matched apparent sizes at the start.
          var marker = label(object.choice, object.x, object.y + object.radius * 1.75, object.z,
            object.radius * 0.8, object.radius * 0.8);
          if (marker) parallaxLabels.push({ sprite: marker, object: object });
          if (activity === 'parallax' && data.reveal) {
            var distance = REFERENCE_Z - object.z;
            floorRing(object.x, object.z, object.radius + 0.1, color, 0.035);
            box(object.x, 0.035, (REFERENCE_Z + object.z) / 2, 0.055, 0.028, distance, color);
            for (var tick = object.z; tick <= REFERENCE_Z; tick++) {
              box(object.x, 0.055, tick, 0.25, 0.02, 0.035, color);
            }
            rod({ x: object.x, y: 0.07, z: object.z },
              { x: object.x, y: object.y - object.radius, z: object.z }, 0.015, color);
            label(String(distance), object.x + 0.35, 0.32, (REFERENCE_Z + object.z) / 2, 0.7, 0.25);
          }
        });
        [22.8, 25.4].forEach(function (x) { box(x, 0.027, 9.75, 0.045, 0.02, 2.5, 0x91a99e); });
        [8.5, 11].forEach(function (z) { box(24.1, 0.027, z, 2.6, 0.02, 0.045, 0x91a99e); });
        if (activity === 'parallax' && data.reveal) {
          box(24, 0.025, REFERENCE_Z, 7.5, 0.02, 0.045, COLORS.ink);
          floorRing(24, REFERENCE_Z, 0.38, COLORS.ink, 0.04);
        }
        return objects;
      }

      function panelLabel(object, halfWidth, centerX) {
        var side = object.x < centerX ? -1 : 1;
        var sprite = label(object.choice, object.x + side * (halfWidth + 0.45), object.y,
          object.z + 0.24, 0.42, 0.42);
        if (sprite) panelLabels.push({ sprite: sprite, object: object, side: side, halfWidth: halfWidth });
      }

      function contourExhibit() {
        var objects = contourObjects();
        flatBox(36, 2.2, -0.15, 5.8, 4.4, 0.12, 0xf6f8f5);
        objects.forEach(function (object) {
          var angle = Array.isArray(data.contourAngles) ? number(data.contourAngles[object.index], object.angle) : object.angle;
          object.angle = (angle % 360 + 360) % 360;
          var theta = object.angle * Math.PI / 180;
          var shape = new THREE.Shape();
          shape.moveTo(0, 0);
          shape.lineTo(object.radius * Math.cos(theta + Math.PI / 4), object.radius * Math.sin(theta + Math.PI / 4));
          shape.absarc(0, 0, object.radius, theta + Math.PI / 4, theta + 7 * Math.PI / 4, false);
          shape.lineTo(0, 0);
          var geometry = new THREE.ExtrudeGeometry(shape, { depth: object.depth, bevelEnabled: false, curveSegments: 32 });
          var mesh = new THREE.Mesh(geometry, [flatMaterial(0x203032), material(COLORS.ink)]);
          mesh.position.set(object.x, object.y, object.z);
          mesh.userData.perceptionInteraction = object.id;
          S.model.add(mesh);
          solids.push(mesh);
          if (activity === 'contour' && data.contourSelected === object.index) {
            var outlineMaterial = new THREE.LineBasicMaterial({ color: COLORS.teal, toneMapped: false });
            outlineMaterial.color.convertSRGBToLinear();
            var outline = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), outlineMaterial);
            outline.position.copy(mesh.position);
            outline.scale.setScalar(1.025);
            S.model.add(outline);
          }
          panelLabel(object, object.radius, 36);
        });
        if (activity === 'contour' && data.reveal) {
          objects.forEach(function (object, index) {
            var next = objects[(index + 1) % objects.length];
            rod({ x: object.x, y: object.y, z: 0.32 }, { x: next.x, y: next.y, z: 0.32 }, 0.012, COLORS.teal);
          });
        }
        return objects;
      }

      function contextExhibit() {
        var objects = contextObjects();
        objects.forEach(function (object) {
          var background = data.contextNeutral ? 0xb8b8b8 : object.backgroundColor;
          flatBox(object.x, object.y, object.z, object.width, object.height, 0.12, background);
          flatBox(object.x, object.y, object.z + 0.095, object.tileSize, object.tileSize, 0.045, object.tileColor, object.id);
          if (activity === 'context' && Array.isArray(data.contextSelected) && data.contextSelected.indexOf(object.choice) >= 0) {
            var borderSource = new THREE.BoxGeometry(object.width + 0.06, object.height + 0.06, 0.015);
            var borderGeometry = new THREE.EdgesGeometry(borderSource);
            borderSource.dispose();
            var border = new THREE.LineSegments(borderGeometry,
              new THREE.LineBasicMaterial({ color: COLORS.teal, toneMapped: false }));
            border.material.color.convertSRGBToLinear();
            border.position.set(object.x, object.y, 0.15);
            S.model.add(border);
          }
          panelLabel(object, object.width / 2, 48);
          if (activity === 'context' && data.reveal) {
            label(object.tileColor.toString(16).slice(0, 2).toUpperCase(), object.x, object.y - 0.68, 0.2, 0.6, 0.28);
          }
        });
        var toggle = { id: 'context-switch', x: 46.5, y: 1.05, z: 4 };
        rod({ x: toggle.x, y: 0.05, z: toggle.z }, { x: toggle.x, y: 0.81, z: toggle.z }, 0.045, COLORS.metal);
        box(toggle.x, 0.055, toggle.z, 0.45, 0.11, 0.45, COLORS.metal);
        flatBox(toggle.x, toggle.y, toggle.z, 0.72, 0.42, 0.15, 0xeaf0eb, toggle.id);
        var track = add(new THREE.TorusGeometry(0.13, 0.026, 8, 32), COLORS.ink,
          { x: toggle.x, y: toggle.y, z: toggle.z + 0.1 }, toggle.id);
        track.scale.x = 1.8;
        add(new THREE.CylinderGeometry(0.11, 0.11, 0.04, 32), data.contextNeutral ? COLORS.teal : COLORS.ink,
          { x: toggle.x + (data.contextNeutral ? 0.11 : -0.11), y: toggle.y, z: toggle.z + 0.13 }, toggle.id, { x: Math.PI / 2 });
        return { objects: objects, toggle: toggle };
      }

      function continuityExhibit() {
        var objects = continuationObjects(data.continuityOffset);
        box(60, 0.09, 0, 5.8, 0.18, 0.3, COLORS.metal);
        objects.forEach(function (object, index) {
          rod(object.from, object.to, index && activity === 'continuity' && data.selected ? 0.065 : 0.045,
            index ? COLORS.teal : COLORS.ink, index ? object.id : null);
          var end = index ? object.to : object.from;
          rod({ x: end.x, y: 0.18, z: -0.15 }, { x: end.x, y: end.y, z: -0.15 }, 0.017, COLORS.metal);
          rod({ x: end.x, y: end.y, z: -0.15 }, end, 0.017, COLORS.metal);
        });
        if (activity !== 'continuity' || !data.reveal) {
          box(60, 2.5, 0.24, 1.6, 4.8, 0.16, COLORS.gold);
        } else {
          // Keep the learner's offset unchanged while exposing the fixed rod's continuation.
          for (var x = 59.4; x < 62.8; x += 0.26) {
            var endX = Math.min(62.8, x + 0.13);
            rod({ x: x, y: 2.4 + 0.35 * (x - 60), z: 0.08 },
              { x: endX, y: 2.4 + 0.35 * (endX - 60), z: 0.08 }, 0.012, COLORS.coral);
          }
        }
        [59.4, 60.6].forEach(function (x) { box(x, 0.028, 9, 0.035, 0.02, 4, COLORS.coral); });
        [7, 11].forEach(function (z) { box(60, 0.028, z, 1.2, 0.02, 0.035, COLORS.coral); });
        floorRing(60, 9, 0.3, COLORS.coral, 0.03);
        return objects;
      }

      function shadowExhibit() {
        var model = Lab.PerceptionWalk, objects = model.shadowGeometry(data.shadowAngle);
        var profile = model.shadowProfile(data.shadowAngle), target = model.shadowProfile(90);
        flatBox(72.5, 2.5, -4.1, 9, 5, 0.12, 0xf6f8f5);
        profile.forEach(function (row) { flatBox((row.left + row.right) / 2, row.y, -4.015, row.right - row.left, 0.7, 0.015, COLORS.ink); });
        var outline = model.shadowOutline(target);
        outline.forEach(function (point, index) {
          var next = outline[(index + 1) % outline.length];
          if (Math.hypot(point.x - next.x, point.y - next.y) > 0.00001) rod({ x: point.x, y: point.y, z: -3.98 }, { x: next.x, y: next.y, z: -3.98 }, 0.027, 0xb84632);
        });
        add(new THREE.CylinderGeometry(1.95, 1.95, 0.2, 64), COLORS.metal, { x: 70, y: 0.27, z: 1 });
        floorRing(70, 1, 2.1, COLORS.teal, 0.035);
        function edges(object, color) {
          var source = new THREE.BoxGeometry(object.size, object.size, object.size), geometry = new THREE.EdgesGeometry(source);
          source.dispose();
          var line = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: color, toneMapped: false }));
          line.material.color.convertSRGBToLinear(); line.position.set(object.x, object.y, object.z); line.rotation.y = object.angle * Math.PI / 180;
          S.model.add(line);
        }
        objects.forEach(function (object) {
          add(new THREE.BoxGeometry(object.size, object.size, object.size), COLORS.teal, object, object.id, { y: object.angle * Math.PI / 180 });
          edges(object, activity === 'shadow' && data.selected ? 0xe9b342 : 0x174f4c);
        });
        var turn = number(data.shadowAngle, 0) * Math.PI / 180;
        rod({ x: 70, y: 0.383, z: 1 }, { x: 70 + 1.8 * Math.cos(turn), y: 0.383, z: 1 - 1.8 * Math.sin(turn) }, 0.025, COLORS.ink);
        [70.8, 73.2].forEach(function (x) { box(x, 0.028, 9, 0.035, 0.02, 4, COLORS.teal); });
        [7, 11].forEach(function (z) { box(72, 0.028, z, 2.4, 0.02, 0.035, COLORS.teal); });
        if (activity === 'shadow' && data.reveal) {
          model.shadowGeometry(90).forEach(function (object) { edges(object, 0xb84632); });
          objects.filter(function (object, index) { return index === 2 || index === 7 || index === 11; }).forEach(function (object) {
            rod(object, { x: object.projectedX, y: object.y, z: -4 }, 0.012, COLORS.gold);
          });
        }
        return { objects: objects, profile: profile, target: target };
      }

      function changeExhibit() {
        var model = Lab.PerceptionWalk, round = clamp(Math.round(number(data.changeRound, 0)), 0, 2);
        var variant = data.changeVariant === 1 ? 1 : 0;
        var objects = model.changeObjects(round, variant), counterpart = model.changeObjects(round, 1 - variant);
        var target = model.changeTarget(round);
        flatBox(84, 2.65, -4.5, 10, 5.1, 0.16, 0xf6f8f5);
        box(84, 0.45, 0.6, 8.4, 0.9, 4, 0xc5d3cb);
        box(84, 0.918, 2.58, 8.4, 0.035, 0.04, COLORS.ink);

        function geometry(object) {
          if (object.shape === 'sphere') return new THREE.SphereGeometry(0.5, 32, 24);
          if (object.shape === 'cylinder') return new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
          return new THREE.BoxGeometry(1, 1, 1);
        }
        function place(mesh, object) {
          mesh.position.set(object.x, object.y, object.z);
          mesh.scale.set(object.width, object.height, object.depth);
          mesh.rotation.y = number(object.rotation, 0) * Math.PI / 180;
        }
        function outline(object, color, scale) {
          var source = geometry(object), edges = new THREE.EdgesGeometry(source);
          source.dispose();
          var line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: color, toneMapped: false }));
          line.material.color.convertSRGBToLinear();
          place(line, object);
          if (scale) line.scale.multiplyScalar(scale);
          S.model.add(line);
        }
        objects.forEach(function (object) {
          var mesh = add(geometry(object), object.color, object, object.id);
          place(mesh, object);
          if (activity === 'change' && data.changeSelected === object.choice) outline(Object.assign({}, object, { shape: 'box' }), COLORS.ink, 1.04);
          var sprite = label(object.choice, object.x, object.y + object.height / 2 + 0.4, object.z, 0.42, 0.42);
          if (sprite) changeLabels.push({ sprite: sprite, object: object });
        });
        floorRing(84, REFERENCE_Z, 0.34, COLORS.gold, 0.035);
        if (activity === 'change' && data.reveal) {
          var current = objects.filter(function (object) { return object.choice === target; })[0];
          var alternate = counterpart.filter(function (object) { return object.choice === target; })[0];
          outline(alternate, COLORS.ink, 1.03);
          var marker = floorRing(current.x, current.z, Math.max(current.width, current.depth) * 0.65, COLORS.gold, 0.035);
          marker.position.y = 0.938;
          if (Math.hypot(current.x - alternate.x, current.z - alternate.z) > 0.01) {
            var side = current.x + Math.max(current.width, alternate.width) / 2 + 0.3;
            rod({ x: side, y: 1.04, z: current.z }, { x: side, y: 1.04, z: alternate.z }, 0.018, COLORS.gold);
            [current, alternate].forEach(function (object) {
              rod({ x: object.x, y: 1.04, z: object.z }, { x: side + 0.12, y: 1.04, z: object.z }, 0.012, COLORS.gold);
            });
          }
          if (Math.abs(current.height - alternate.height) > 0.01) {
            measure(current, COLORS.ink);
            measure(Object.assign({}, alternate, { x: alternate.x + 0.3 }), COLORS.gold);
          }
          if (Math.abs(number(current.rotation, 0) - number(alternate.rotation, 0)) > 0.01) {
            [current, alternate].forEach(function (object, index) {
              var angle = number(object.rotation, 0) * Math.PI / 180;
              rod({ x: object.x, y: 0.93, z: object.z },
                { x: object.x + 0.95 * Math.cos(angle), y: 0.93, z: object.z - 0.95 * Math.sin(angle) },
                0.02, index ? COLORS.gold : COLORS.ink);
            });
          }
        }
        return { objects: objects, counterpart: counterpart, round: round, variant: variant };
      }

      function rotationExhibit() {
        var model = Lab.PerceptionWalk, round = clamp(Math.round(number(data.rotationRound, 0)), 0, 1);
        var objects = model.rotationObjects(round, data.rotationAngles, data.rotationTilts), projectedObjects = [];
        flatBox(96, 2.65, -4.5, 10.5, 5.1, 0.16, 0xf6f8f5);

        function sculpture(object, wireframe) {
          var orientation = new THREE.Euler(object.pitch * Math.PI / 180, object.yaw * Math.PI / 180, 0, 'YXZ');
          var centers = [], corners = [], selected = activity === 'rotation' && data.rotationSelected === ['A', 'B'].indexOf(object.choice);
          object.cells.forEach(function (cell) {
            var center = new THREE.Vector3(cell.x, cell.y, cell.z).applyEuler(orientation).add(new THREE.Vector3(object.x, object.y, object.z));
            var geometry = new THREE.BoxGeometry(cell.size, cell.size, cell.size);
            if (!wireframe) {
              var mesh = add(geometry, object.choice === 'R' ? COLORS.coral : COLORS.teal, center, object.choice === 'R' ? null : object.id);
              mesh.rotation.copy(orientation);
            }
            var edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), new THREE.LineBasicMaterial({
              color: wireframe || selected ? COLORS.gold : COLORS.ink, toneMapped: false }));
            edges.material.color.convertSRGBToLinear();
            edges.position.copy(center);
            edges.rotation.copy(orientation);
            S.model.add(edges);
            if (wireframe) geometry.dispose();
            centers.push({ x: center.x, y: center.y, z: center.z });
            [-1, 1].forEach(function (x) { [-1, 1].forEach(function (y) { [-1, 1].forEach(function (z) {
              var corner = new THREE.Vector3(cell.x + x * cell.size / 2, cell.y + y * cell.size / 2, cell.z + z * cell.size / 2)
                .applyEuler(orientation).add(new THREE.Vector3(object.x, object.y, object.z));
              corners.push({ x: corner.x, y: corner.y, z: corner.z });
            }); }); });
          });
          return { object: object, centers: centers, corners: corners };
        }

        objects.forEach(function (object) {
          add(new THREE.CylinderGeometry(1.42, 1.42, 0.35, 48), 0xc5d3cb, { x: object.x, y: 0.175, z: object.z });
          var shape = sculpture(object, false);
          projectedObjects.push(shape);
          var bottom = Math.min.apply(null, shape.corners.map(function (point) { return point.y; }));
          if (bottom > 0.35) rod({ x: object.x, y: 0.35, z: object.z }, { x: object.x, y: bottom, z: object.z }, 0.035, COLORS.metal);
          var sprite = label(object.choice, object.x, 3.85, object.z, 0.42, 0.42);
          if (sprite) rotationLabels.push({ sprite: sprite, object: object, top: Math.max.apply(null, shape.corners.map(function (point) { return point.y; })) });
          if (activity === 'rotation' && data.rotationChoice === object.choice) floorRing(object.x, object.z, 1.52, COLORS.ink, 0.035);
        });
        floorRing(96, REFERENCE_Z, 0.34, COLORS.gold, 0.035);
        if (activity === 'rotation' && data.reveal) {
          var match = objects.filter(function (object) { return object.choice === model.rotationMatch(round); })[0];
          floorRing(match.x, match.z, 1.61, COLORS.gold, 0.045);
          sculpture(Object.assign({}, objects[0], { x: match.x, y: match.y, z: match.z }), true);
        }
        return { objects: objects, projectedObjects: projectedObjects, round: round };
      }

      function reliefExhibit() {
        var model = Lab.PerceptionWalk, round = clamp(Math.round(number(data.reliefRound, 0)), 0, 1);
        var angle = number(data.reliefAngle, 0), objects = model.reliefObjects(round), surfaces = [];
        flatBox(108, 2.65, -4.5, 10.5, 5.1, 0.16, 0xf6f8f5);

        objects.forEach(function (object) {
          var geometry = new THREE.PlaneGeometry(object.width, object.height, 48, 48);
          var positions = geometry.getAttribute('position'), normals = geometry.getAttribute('normal'), colors = new Float32Array(positions.count * 3);
          // Use the same analytic surface and Lambert model as the accessible plan.
          // Vertex colors isolate this exhibit from the hall's decorative lighting.
          for (var vertex = 0; vertex < positions.count; vertex++) {
            var x = positions.getX(vertex), y = positions.getY(vertex), surface = model.reliefSurface(object, x, y);
            var shade = model.reliefShade(object, x, y, angle);
            positions.setZ(vertex, surface.z);
            normals.setXYZ(vertex, surface.normal.x, surface.normal.y, surface.normal.z);
            colors[vertex * 3] = colors[vertex * 3 + 1] = colors[vertex * 3 + 2] = shade;
          }
          geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
          geometry.computeBoundingBox();
          geometry.computeBoundingSphere();
          var mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, side: THREE.DoubleSide }));
          mesh.position.set(object.x, object.y, object.z);
          mesh.userData.perceptionInteraction = object.id;
          S.model.add(mesh);
          solids.push(mesh);
          surfaces.push(mesh);

          box(object.x, object.y, object.z - 1, object.width + 0.12, object.height + 0.12, 0.1, COLORS.metal);
          [-1, 1].forEach(function (side) {
            box(object.x + side * (object.width / 2 + 0.04), object.y, object.z - 0.46, 0.08, object.height + 0.16, 1.02, COLORS.metal);
            box(object.x, object.y + side * (object.height / 2 + 0.04), object.z - 0.46, object.width, 0.08, 1.02, COLORS.metal);
          });
          box(object.x, 0.07, object.z - 0.5, 1.25, 0.14, 1.3, 0xc5d3cb);
          rod({ x: object.x, y: 0.14, z: object.z - 0.5 }, { x: object.x, y: object.y - object.height / 2, z: object.z - 0.5 }, 0.045, COLORS.metal);
          if (activity === 'relief' && data.reliefChoice === object.choice) {
            var halfWidth = object.width / 2 + 0.085, halfHeight = object.height / 2 + 0.085;
            var borderPoints = [[-halfWidth, -halfHeight], [halfWidth, -halfHeight], [halfWidth, halfHeight], [-halfWidth, halfHeight]];
            borderPoints.forEach(function (point, index) {
              var next = borderPoints[(index + 1) % borderPoints.length];
              rod({ x: object.x + point[0], y: object.y + point[1], z: object.z + 0.06 },
                { x: object.x + next[0], y: object.y + next[1], z: object.z + 0.06 }, 0.025, COLORS.teal);
            });
          }
          var sprite = label(object.choice, object.x, object.y + object.height / 2 + 0.4, object.z, 0.42, 0.42);
          if (sprite) reliefLabels.push({ sprite: sprite, object: object });
          if (activity === 'relief' && data.reveal) {
            [false, true].forEach(function (vertical) {
              var path = new THREE.Curve();
              path.getPoint = function (t, target) {
                target = target || new THREE.Vector3();
                var local = (t * 2 - 1) * object.radius, x = vertical ? 0 : local, y = vertical ? local : 0;
                return target.set(object.x + x, object.y + y, object.z + model.reliefSurface(object, x, y).z + 0.025);
              };
              add(new THREE.TubeGeometry(path, 64, 0.018, 8, false), COLORS.gold);
              var points = [-1, 1].map(function (side) {
                return new THREE.Vector3(object.x + (vertical ? 0 : side * object.radius),
                  object.y + (vertical ? side * object.radius : 0), object.z + 0.028);
              });
              var lineMaterial = new THREE.LineDashedMaterial({ color: COLORS.gold, dashSize: 0.12, gapSize: 0.08, toneMapped: false });
              lineMaterial.color.convertSRGBToLinear();
              var rim = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMaterial);
              rim.computeLineDistances();
              S.model.add(rim);
            });
          }
        });
        var radians = angle * Math.PI / 180;
        var light = { id: 'relief-light', x: 108 + 1.5 * Math.sin(radians), y: 2.3 + 1.5 * Math.cos(radians), z: 2.2 };
        add(new THREE.TorusGeometry(1.5, 0.014, 6, 80), COLORS.metal, { x: 108, y: 2.3, z: 2.18 });
        var marker = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), flatMaterial(COLORS.gold));
        marker.position.set(light.x, light.y, light.z);
        marker.userData.perceptionInteraction = light.id;
        S.model.add(marker);
        solids.push(marker);
        floorRing(108, REFERENCE_Z, 0.34, COLORS.coral, 0.035);
        return { objects: objects, round: round, angle: angle, light: light, marker: marker, surfaces: surfaces };
      }

      function shapeExhibit() {
        var model = Lab.PerceptionWalk, round = clamp(Math.round(number(data.shapeRound, 0)), 0, 1);
        var objects = model.shapeObjects(round, data.shapeAngles, data.shapeTilts), sculptures = [];
        flatBox(120, 2.65, -4.5, 10.5, 5.1, 0.16, 0xf6f8f5);
        objects.forEach(function (object, index) {
          var group = new THREE.Group(), path = new THREE.Curve();
          path.getPoint = function (t, target) {
            target = target || new THREE.Vector3();
            var angle = t * Math.PI * 2;
            return target.set(object.rx * Math.cos(angle), object.ry * Math.sin(angle), 0);
          };
          var mesh = add(new THREE.TubeGeometry(path, 96, object.tube, 12, true),
            activity === 'shape' && data.shapeSelected === index ? COLORS.gold : COLORS.teal, null, object.id);
          group.add(mesh);
          S.model.add(group);
          add(new THREE.CylinderGeometry(1.42, 1.42, 0.35, 48), 0xc5d3cb, { x: object.x, y: 0.175, z: object.z });
          var stand = add(new THREE.CylinderGeometry(0.035, 0.035, 1, 12), COLORS.metal);
          var sculpture = { group: group, mesh: mesh, stand: stand, object: object };
          placeShape(sculpture, object);
          sculptures.push(sculpture);
          var sprite = label(object.choice, object.x, 3.95, object.z, 0.42, 0.42);
          if (sprite) shapeLabels.push({ sprite: sprite, sculpture: sculpture });
          if (activity === 'shape' && data.shapeChoice === object.choice) floorRing(object.x, object.z, 1.52, COLORS.ink, 0.035);
          if (activity === 'shape' && data.reveal) {
            // Diameter guides turn with the solid, preserving the physical lengths.
            group.add(rod({ x: -object.rx, y: 0, z: 0 }, { x: object.rx, y: 0, z: 0 }, 0.022, COLORS.gold, object.id));
            group.add(rod({ x: 0, y: -object.ry, z: 0 }, { x: 0, y: object.ry, z: 0 }, 0.022, COLORS.coral, object.id));
            if (object.choice === model.shapeTarget(round)) floorRing(object.x, object.z, 1.61, COLORS.gold, 0.045);
          }
        });
        floorRing(120, REFERENCE_Z, 0.34, COLORS.teal, 0.035);
        return { objects: objects, sculptures: sculptures, round: round };
      }

      function motionExhibit() {
        var model = Lab.PerceptionWalk, round = clamp(Math.round(number(data.motionRound, 0)), 0, 1);
        var phase = clamp(number(data.motionPhase, 0), 0, 359.9), objects = model.motionObjects(round, phase);
        var selected = Array.isArray(data.motionSelected) ? data.motionSelected : [], spheres = [], guides = [];
        flatBox(132, 2.65, -2, 10.5, 5, 0.16, 0xf6f8f5);
        box(132, 0.25, 0, 9, 0.5, 2, 0xc5d3cb);
        objects.forEach(function (object) {
          var mesh = add(new THREE.SphereGeometry(object.radius, 32, 24),
            activity === 'motion' && selected.indexOf(object.choice) >= 0 ? COLORS.gold : COLORS.teal, object, object.id);
          var sphere = { mesh: mesh, object: object };
          spheres.push(sphere);
          var sprite = label(object.choice, object.x, object.y + 0.65, object.z, 0.42, 0.42);
          if (sprite) motionLabels.push({ sprite: sprite, sphere: sphere });
        });
        rod({ x: 129.5, y: 0.6, z: 3 }, { x: 134.5, y: 0.6, z: 3 }, 0.035, COLORS.ink, 'motion-dial');
        [129.5, 134.5].forEach(function (x) {
          rod({ x: x, y: 0.06, z: 3 }, { x: x, y: 0.6, z: 3 }, 0.04, COLORS.metal);
          box(x, 0.055, 3, 0.35, 0.11, 0.35, 0xc5d3cb);
        });
        var dial = { x: 129.5 + phase / 360 * 5, y: 0.6, z: 3 };
        var knob = add(new THREE.SphereGeometry(0.16, 24, 18), COLORS.gold, dial, 'motion-dial');
        if (activity === 'motion' && data.reveal) {
          function guide(count, color, choices) {
            var geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3));
            var lineMaterial = new THREE.LineBasicMaterial({ color: color, toneMapped: false });
            lineMaterial.color.convertSRGBToLinear();
            var line = new THREE.Line(geometry, lineMaterial);
            S.model.add(line);
            guides.push({ line: line, choices: choices });
          }
          var targets = model.motionTargets(round);
          guide(4, COLORS.coral, targets.concat(targets[0]));
          objects.forEach(function (object) { guide(2, COLORS.gold, [object.choice]); });
        }
        floorRing(132, REFERENCE_Z, 0.34, COLORS.gold, 0.035);
        var exhibit = { objects: objects, spheres: spheres, round: round, phase: phase, dial: dial, knob: knob, guides: guides };
        placeMotion(exhibit, objects, phase);
        return exhibit;
      }

      function frameExhibit() {
        var model = Lab.PerceptionWalk, round = clamp(Math.round(number(data.frameRound, 0)), 0, 1);
        var defaults = model.frameDefaults(round), adjustment = clamp(number(data.frameAdjustment, defaults.adjustment), -45, 45);
        var surround = clamp(number(data.frameSurround, defaults.surround), -30, 30);
        var objects = model.frameObjects(round, adjustment, surround), edges = [], center = objects.center;
        var plate = new THREE.Mesh(new THREE.CircleGeometry(2.58, 96), flatMaterial(0xdce2de));
        plate.position.set(center.x, center.y, -0.25);
        S.model.add(plate); solids.push(plate);
        var shaft = rod(objects.rod.from, objects.rod.to, 0.08, COLORS.teal, 'frame-rod');
        var handle = add(new THREE.SphereGeometry(0.15, 24, 18), COLORS.gold, objects.rod.to, 'frame-rod');
        if (data.frameVisible !== false) objects.corners.forEach(function (point, index) {
          edges.push(rod(point, objects.corners[(index + 1) % objects.corners.length], 0.09, COLORS.coral, 'frame-surround'));
        });
        if (activity === 'frame' && data.reveal) {
          var geometry = new THREE.BufferGeometry(), points = [];
          for (var tick = -12; tick < 12; tick++) {
            var low = tick * 0.2, high = low + 0.12;
            points.push(center.x, center.y + low, 0.31, center.x, center.y + high, 0.31);
            points.push(center.x + low, center.y, 0.31, center.x + high, center.y, 0.31);
          }
          geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
          var guideMaterial = new THREE.LineBasicMaterial({ color: COLORS.ink, toneMapped: false });
          guideMaterial.color.convertSRGBToLinear();
          S.model.add(new THREE.LineSegments(geometry, guideMaterial));
        }
        floorRing(144, REFERENCE_Z, 0.34, COLORS.coral, 0.035);
        return { objects: objects, round: round, adjustment: adjustment, surround: surround,
          visible: data.frameVisible !== false, shaft: shaft, handle: handle, edges: edges };
      }

      function weaveExhibit() {
        var objects = Lab.PerceptionWalk.weaveObjects(data.weaveDepths), beams = [], rails = [];
        var colors = [COLORS.teal, COLORS.coral, COLORS.gold];
        flatBox(156, 2.65, -2.6, 10.5, 5, 0.16, 0xf6f8f5);
        objects.forEach(function (object, index) {
          var color = colors[index], beam = { object: object,
            mesh: rod(object.from, object.to, 0.11, color, object.id), guide: null };
          beams.push(beam);
          var end = index === 1 ? object.to : object.from;
          var sprite = label(object.choice, end.x, end.y + 0.35, end.z, 0.42, 0.42);
          if (sprite) weaveLabels.push({ sprite: sprite, beam: beam, end: index === 1 ? 'to' : 'from' });
          var rail = { index: index, x: 153.5 + index * 2.5, y: 0.55, z: object.depth };
          rod({ x: rail.x, y: rail.y, z: -1.5 }, { x: rail.x, y: rail.y, z: 1.5 }, 0.035, color, 'weave-rail-' + index);
          [-1.5, 1.5].forEach(function (z) {
            rod({ x: rail.x, y: 0.06, z: z }, { x: rail.x, y: rail.y, z: z }, 0.035, COLORS.metal);
            box(rail.x, 0.055, z, 0.3, 0.11, 0.3, 0xc5d3cb);
          });
          for (var tick = -3; tick <= 3; tick++) {
            rod({ x: rail.x - 0.08, y: rail.y, z: tick * 0.5 }, { x: rail.x + 0.08, y: rail.y, z: tick * 0.5 }, 0.018, COLORS.ink);
          }
          rail.knob = add(new THREE.SphereGeometry(data.weaveSelected === index ? 0.21 : 0.17, 24, 18), color, rail, 'weave-rail-' + index);
          rails.push(rail);
          if (activity === 'weave' && data.reveal) {
            var points = [], geometry = new THREE.BufferGeometry();
            for (var dash = 0; dash < 16; dash++) {
              var y = 0.06 + (end.y - 0.06) * dash / 16;
              points.push(end.x, y, 0, end.x, y + (end.y - 0.06) * 0.6 / 16, 0);
            }
            for (var mark = 0; mark < 24; mark++) {
              var x = 152.5 + mark * 7 / 24;
              points.push(x, 0.04, 0, x + 0.18, 0.04, 0);
            }
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
            var guideMaterial = new THREE.LineBasicMaterial({ color: color, toneMapped: false });
            guideMaterial.color.convertSRGBToLinear();
            beam.guide = new THREE.LineSegments(geometry, guideMaterial);
            beam.guide.position.z = object.depth;
            S.model.add(beam.guide);
          }
        });
        floorRing(156, REFERENCE_Z, 0.34, COLORS.teal, 0.035);
        return { objects: objects, beams: beams, rails: rails, round: clamp(Math.round(number(data.weaveRound, 0)), 0, 1) };
      }

      function landingExhibit() {
        var round = clamp(Math.round(number(data.landingRound, 0)), 0, 1);
        var lightAngle = clamp(number(data.landingLightAngle, 0), -25, 25);
        var objects = Lab.PerceptionWalk.landingObjects(round, data.landingHeights, lightAngle), spheres = [];
        var light = Lab.PerceptionWalk.landingLight(round, lightAngle);
        var colors = [COLORS.teal, COLORS.coral, COLORS.gold];
        flatBox(168, 0.011, 1.8, 13, 0.015, 7.8, 0xf6f8f5);
        objects.forEach(function (object, index) {
          var color = colors[index], geometry = new THREE.SphereGeometry(object.radius, 32, 24);
          var base = new THREE.Color(color).convertSRGBToLinear();
          geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(geometry.getAttribute('normal').count * 3), 3));
          var mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }));
          mesh.position.set(object.x, object.y, object.z);
          mesh.userData.perceptionInteraction = object.id;
          S.model.add(mesh); solids.push(mesh);
          rod({ x: object.x, y: 0.04, z: object.z - 0.09 }, { x: object.x, y: 3.45, z: object.z - 0.09 }, 0.023, COLORS.metal);
          box(object.x, 0.075, object.z, 0.35, 0.11, 0.35, data.landingSelected === index ? color : COLORS.metal);
          var shadowGeometry = new THREE.CircleGeometry(1, 72);
          shadowGeometry.scale(object.shadow.major, object.shadow.minor, 1);
          shadowGeometry.rotateX(-Math.PI / 2);
          var shadow = new THREE.Mesh(shadowGeometry, flatMaterial(0x3c4948));
          shadow.position.set(object.shadow.x, 0.025, object.shadow.z);
          S.model.add(shadow); solids.push(shadow);
          var ellipse = new THREE.Curve(), target = object.target;
          ellipse.getPoint = function (t, point) {
            point = point || new THREE.Vector3();
            var a = t * Math.PI * 2;
            return point.set(target.major * Math.cos(a), 0, target.minor * Math.sin(a));
          };
          var outline = new THREE.Mesh(new THREE.TubeGeometry(ellipse, 72, 0.025, 8, true), flatMaterial(color));
          S.model.add(outline);
          var targetLabel = label(object.choice, target.x, 0.32, target.z - 0.65, 0.46, 0.46);
          var sphere = { object: object, mesh: mesh, baseColor: base, shadow: shadow, outline: outline, targetLabel: targetLabel || null, guide: null };
          var sprite = label(object.choice, object.x, object.y + 0.72, object.z, 0.42, 0.42);
          if (sprite) landingLabels.push({ sprite: sprite, sphere: sphere });
          if (activity === 'landing' && data.reveal) {
            var guideGeometry = new THREE.BufferGeometry();
            guideGeometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array((12 * 6 + 2) * 3), 3));
            var guideMaterial = new THREE.LineBasicMaterial({ color: color, toneMapped: false });
            guideMaterial.color.convertSRGBToLinear();
            sphere.guide = new THREE.LineSegments(guideGeometry, guideMaterial);
            S.model.add(sphere.guide);
          }
          spheres.push(sphere);
        });
        floorRing(168, 12, 0.34, COLORS.gold, 0.035);
        var landing = { objects: objects, spheres: spheres, round: round, light: light, lightAngle: lightAngle };
        shadeLanding(landing, light);
        placeLanding(landing, objects);
        return landing;
      }

      function apertureExhibit() {
        var round = clamp(Math.round(number(data.apertureRound, 0)), 0, 1), phase = ((number(data.aperturePhase, 0) % 360) + 360) % 360;
        var objects = Lab.PerceptionWalk.apertureObjects(round, phase), screen = objects.screen, masked = data.apertureMasked !== false;
        var panels = [], caps = [], width = screen.width, height = screen.height;
        var openingWidth = screen.openingWidth, openingHeight = screen.openingHeight;
        flatBox(screen.x, screen.y, -0.75, 9.4, 4.9, 0.12, 0xf6f8f5);
        var beam = rod(objects.from, objects.to, 0.075, COLORS.teal, 'aperture-rod');
        beam.material = flatMaterial(COLORS.teal);
        [objects.from, objects.to].forEach(function (point) {
          var cap = add(new THREE.SphereGeometry(0.075, 20, 14), COLORS.teal, point, 'aperture-rod');
          cap.material = flatMaterial(COLORS.teal);
          caps.push(cap);
        });
        // Four solid panels hide the finite endpoints without painting over the opening.
        if (masked) {
          [-1, 1].forEach(function (side) {
            panels.push(flatBox(screen.x + side * (width + openingWidth) / 4, screen.y, screen.z,
              (width - openingWidth) / 2, height, 0.12, 0x324d50, 'aperture-screen'));
            panels.push(flatBox(screen.x, screen.y + side * (height + openingHeight) / 4, screen.z,
              openingWidth, (height - openingHeight) / 2, 0.12, 0x324d50, 'aperture-screen'));
          });
        }
        [-1, 1].forEach(function (side) {
          box(screen.x + side * (width / 2 + 0.055), screen.y, screen.z, 0.11, height, 0.2, COLORS.metal);
          box(screen.x, screen.y + side * (height / 2 + 0.055), screen.z, width + 0.22, 0.11, 0.2, COLORS.metal);
        });
        var toggle = { x: 183.5, y: 1.1, z: 2.2 };
        rod({ x: toggle.x, y: 0.08, z: 2 }, { x: toggle.x, y: 0.96, z: 2 }, 0.07, COLORS.metal);
        box(toggle.x, 0.07, 2, 0.6, 0.14, 0.6, COLORS.metal);
        box(toggle.x, toggle.y, 2, 0.65, 0.6, 0.35, COLORS.coral, 'aperture-screen');
        flatBox(toggle.x, toggle.y, toggle.z, 0.43, 0.35, 0.045, 0xf6f8f5, 'aperture-screen');
        [-1, 1].forEach(function (side) {
          flatBox(toggle.x + side * (masked ? 0.085 : 0.165), toggle.y, toggle.z + 0.03,
            0.13, 0.28, 0.025, COLORS.ink, 'aperture-screen');
        });
        var dial = { x: 176.5, y: 1.1, z: 2.2, radius: 0.58, arm: 0.34 };
        rod({ x: dial.x, y: 0.08, z: 2 }, { x: dial.x, y: 1.1, z: 2 }, 0.07, COLORS.metal, 'aperture-dial');
        box(dial.x, 0.07, 2, 0.65, 0.14, 0.6, COLORS.metal, 'aperture-dial');
        var face = add(new THREE.CircleGeometry(0.54, 64), 0xf6f8f5, dial, 'aperture-dial');
        face.material = flatMaterial(0xf6f8f5);
        var rim = add(new THREE.TorusGeometry(0.54, 0.04, 10, 64), COLORS.teal, dial, 'aperture-dial');
        rim.material = flatMaterial(COLORS.teal);
        for (var tick = 0; tick < 4; tick++) {
          var angle = tick * Math.PI / 2;
          var mark = flatBox(dial.x + Math.sin(angle) * 0.445, dial.y + Math.cos(angle) * 0.445,
            dial.z + 0.025, 0.035, 0.13, 0.025, COLORS.ink, 'aperture-dial');
          mark.rotation.z = -angle;
        }
        var radians = phase * Math.PI / 180;
        var handlePoint = { x: dial.x + Math.sin(radians) * dial.arm, y: dial.y + Math.cos(radians) * dial.arm, z: dial.z + 0.08 };
        dial.pointer = rod({ x: dial.x, y: dial.y, z: handlePoint.z }, handlePoint, 0.045, COLORS.teal, 'aperture-dial');
        dial.pointer.material = flatMaterial(COLORS.teal);
        dial.handle = add(new THREE.SphereGeometry(0.085, 20, 14), COLORS.gold, handlePoint, 'aperture-dial');
        dial.handle.material = flatMaterial(COLORS.gold);
        var hub = add(new THREE.SphereGeometry(0.07, 20, 14), COLORS.teal,
          { x: dial.x, y: dial.y, z: dial.z + 0.08 }, 'aperture-dial');
        hub.material = flatMaterial(COLORS.teal);
        var guide = null;
        if (activity === 'aperture' && data.reveal) {
          var points = [], extent = objects.axis === 'horizontal' ? 0.65 : 0.364;
          var horizontal = objects.axis === 'horizontal';
          [objects.from, objects.to].forEach(function (point) {
            var x = point.x - objects.offset.x, y = point.y - objects.offset.y;
            points.push(x - (horizontal ? extent : 0), y - (horizontal ? 0 : extent), 0.14,
              x + (horizontal ? extent : 0), y + (horizontal ? 0 : extent), 0.14);
            [-1, 1].forEach(function (side) {
              var endX = x + (horizontal ? side * extent : 0), endY = y + (horizontal ? 0 : side * extent);
              points.push(endX - (horizontal ? 0 : 0.12), endY - (horizontal ? 0.12 : 0), 0.14,
                endX + (horizontal ? 0 : 0.12), endY + (horizontal ? 0.12 : 0), 0.14);
            });
          });
          var geometry = new THREE.BufferGeometry();
          geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
          var guideMaterial = new THREE.LineBasicMaterial({ color: COLORS.coral, toneMapped: false });
          guideMaterial.color.convertSRGBToLinear();
          guide = new THREE.LineSegments(geometry, guideMaterial);
          S.model.add(guide);
        }
        floorRing(180, 11, 0.34, COLORS.coral, 0.035);
        return { objects: objects, round: round, phase: phase, masked: masked, panels: panels,
          beam: beam, caps: caps, toggle: toggle, dial: dial, guide: guide };
      }

      function lengthExhibit() {
        var round = clamp(Math.round(number(data.lengthRound, 0)), 0, 1), value = clamp(number(data.lengthValue, round ? 3.8 : 2.2), 1.8, 4.2);
        var objects = Lab.PerceptionWalk.lengthObjects(round, value), visible = data.lengthVisible !== false;
        var board = flatBox(192, 2.35, 0, 8, 4.7, 0.12, 0xf6f8f5);
        function shaft(object, color, id) {
          var beam = rod(object.from, object.to, 0.055, color, id);
          beam.material = flatMaterial(color);
          var caps = [object.from, object.to].map(function (point) {
            var cap = add(new THREE.SphereGeometry(0.055, 16, 12), color, point, id);
            cap.material = flatMaterial(color);
            return cap;
          });
          var fins = visible ? object.fins.map(function (fin) {
            var mesh = rod(fin.from, fin.to, 0.035, COLORS.ink, id);
            mesh.material = flatMaterial(COLORS.ink);
            return mesh;
          }) : [];
          return { beam: beam, caps: caps, fins: fins };
        }
        var reference = shaft(objects.reference, COLORS.coral), adjustable = shaft(objects.adjustable, COLORS.teal, 'length-rod');
        var handle = add(new THREE.SphereGeometry(0.12, 24, 16), COLORS.gold, objects.adjustable.to, 'length-handle');
        handle.material = flatMaterial(COLORS.gold);
        var toggle = objects.toggle;
        rod({ x: toggle.x, y: 0.08, z: 2 }, { x: toggle.x, y: 0.96, z: 2 }, 0.07, COLORS.metal);
        box(toggle.x, 0.07, 2, 0.6, 0.14, 0.6, COLORS.metal);
        box(toggle.x, toggle.y, 2, 0.65, 0.6, 0.35, COLORS.gold, 'length-fins');
        flatBox(toggle.x, toggle.y, toggle.z, 0.43, 0.35, 0.045, 0xf6f8f5, 'length-fins');
        [-1, 1].forEach(function (side) {
          [-1, 1].forEach(function (wing) {
            var mark = rod({ x: toggle.x + side * 0.14, y: toggle.y, z: toggle.z + 0.04 },
              { x: toggle.x + side * (visible ? 0.02 : 0.2), y: toggle.y + wing * 0.1, z: toggle.z + 0.04 },
              0.02, COLORS.ink, 'length-fins');
            mark.material = flatMaterial(COLORS.ink);
          });
        });
        var guide = null;
        if (activity === 'length' && data.reveal) {
          var points = [];
          [objects.reference.from, objects.reference.to].forEach(function (point) {
            points.push(point.x, 0.7, 0.12, point.x, 3.9, 0.12);
          });
          var geometry = new THREE.BufferGeometry();
          geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
          var guideMaterial = new THREE.LineBasicMaterial({ color: COLORS.gold, toneMapped: false });
          guideMaterial.color.convertSRGBToLinear();
          guide = new THREE.LineSegments(geometry, guideMaterial);
          S.model.add(guide);
        }
        floorRing(192, 10, 0.34, COLORS.gold, 0.035);
        return { round: round, value: value, visible: visible, objects: objects, board: board,
          reference: reference, adjustable: adjustable, handle: handle, toggle: toggle, guide: guide };
      }

      architecture();
      var parts = ringExhibit(), objects = scaleExhibit(), tokens = occlusionExhibit(), parallax = parallaxExhibit();
      var contour = contourExhibit(), context = contextExhibit(), continuity = continuityExhibit(), shadow = shadowExhibit(), change = changeExhibit(), rotation = rotationExhibit(), relief = reliefExhibit(), shape = shapeExhibit(), motion = motionExhibit(), frame = frameExhibit(), weave = weaveExhibit(), landing = landingExhibit(), aperture = apertureExhibit(), length = lengthExhibit();
      S.walk = { ring: parts, blocks: objects, tokens: tokens, parallax: parallax, contour: contour,
        context: context.objects, contextSwitch: context.toggle, continuity: continuity, shadow: shadow, change: change, rotation: rotation, relief: relief, shape: shape, motion: motion, frame: frame, weave: weave, landing: landing, aperture: aperture, length: length,
        labels: parallaxLabels, panelLabels: panelLabels, changeLabels: changeLabels, rotationLabels: rotationLabels, reliefLabels: reliefLabels, shapeLabels: shapeLabels, motionLabels: motionLabels, weaveLabels: weaveLabels, landingLabels: landingLabels, solids: solids };
      S.target.set(0, EYE_Y, 0);
      S.fitPts = [];
    }

    function updateLength(S, data) {
      var length = S.walk && S.walk.length;
      if (!length) return;
      var value = clamp(number(data.lengthValue, length.round ? 3.8 : 2.2), 1.8, 4.2);
      if (value === length.value) return;
      var objects = Lab.PerceptionWalk.lengthObjects(length.round, value), object = objects.adjustable;
      function place(mesh, from, to) {
        var a = new S.THREE.Vector3(from.x, from.y, from.z), b = new S.THREE.Vector3(to.x, to.y, to.z);
        var direction = new S.THREE.Vector3().subVectors(b, a);
        mesh.position.copy(a).add(b).multiplyScalar(0.5);
        mesh.scale.y = direction.length() / mesh.geometry.parameters.height;
        mesh.quaternion.setFromUnitVectors(new S.THREE.Vector3(0, 1, 0), direction.normalize());
      }
      place(length.adjustable.beam, object.from, object.to);
      length.adjustable.caps[0].position.set(object.from.x, object.from.y, object.from.z);
      length.adjustable.caps[1].position.set(object.to.x, object.to.y, object.to.z);
      length.adjustable.fins.forEach(function (mesh, index) { place(mesh, object.fins[index].from, object.fins[index].to); });
      length.handle.position.set(object.to.x, object.to.y, object.to.z);
      length.objects = objects;
      length.value = value;
    }

    function updateAperture(S, data) {
      var aperture = S.walk && S.walk.aperture, phase = ((number(data.aperturePhase, 0) % 360) + 360) % 360;
      if (!aperture || phase === aperture.phase) return;
      var objects = Lab.PerceptionWalk.apertureObjects(aperture.round, phase);
      aperture.beam.position.set(objects.center.x, objects.center.y, objects.center.z);
      aperture.caps[0].position.set(objects.from.x, objects.from.y, objects.from.z);
      aperture.caps[1].position.set(objects.to.x, objects.to.y, objects.to.z);
      var dial = aperture.dial, radians = phase * Math.PI / 180;
      var dx = Math.sin(radians) * dial.arm, dy = Math.cos(radians) * dial.arm;
      dial.pointer.position.set(dial.x + dx / 2, dial.y + dy / 2, dial.z + 0.08);
      dial.pointer.rotation.set(0, 0, -radians);
      dial.handle.position.set(dial.x + dx, dial.y + dy, dial.z + 0.08);
      aperture.objects = objects;
      aperture.phase = phase;
    }

    function shadeLanding(landing, light) {
      var length = Math.sqrt(light.x * light.x + 1 + light.z * light.z);
      var x = -light.x / length, y = 1 / length, z = -light.z / length;
      // Local Lambert shading uses the same ray direction as the projected shadow.
      landing.spheres.forEach(function (sphere) {
        var normals = sphere.mesh.geometry.getAttribute('normal'), colors = sphere.mesh.geometry.getAttribute('color');
        for (var vertex = 0; vertex < normals.count; vertex++) {
          var shade = 0.32 + 0.16 * Math.max(0, normals.getY(vertex)) + 0.52 * Math.max(0, normals.getX(vertex) * x + normals.getY(vertex) * y + normals.getZ(vertex) * z);
          colors.setXYZ(vertex, sphere.baseColor.r * shade, sphere.baseColor.g * shade, sphere.baseColor.b * shade);
        }
        colors.needsUpdate = true;
      });
    }

    function placeLanding(landing, objects) {
      objects.forEach(function (object, index) {
        var sphere = landing.spheres[index];
        sphere.mesh.position.y = object.y;
        sphere.shadow.position.set(object.shadow.x, 0.025, object.shadow.z);
        sphere.shadow.rotation.y = -object.shadow.angle;
        sphere.outline.position.set(object.target.x, 0.048, object.target.z);
        sphere.outline.rotation.y = -object.target.angle;
        if (sphere.targetLabel) {
          sphere.targetLabel.position.x = object.target.x;
          sphere.targetLabel.position.z = object.target.z - 0.65;
        }
        sphere.object = object;
        if (sphere.guide) {
          var positions = sphere.guide.geometry.getAttribute('position');
          for (var dash = 0; dash < 12; dash++) {
            var from = dash / 12, to = (dash + 0.6) / 12;
            positions.setXYZ(dash * 6, object.x, 0.06 + (object.y - 0.06) * from, object.z);
            positions.setXYZ(dash * 6 + 1, object.x, 0.06 + (object.y - 0.06) * to, object.z);
            positions.setXYZ(dash * 6 + 2, object.x + (object.shadow.x - object.x) * from, 0.058, object.z + (object.shadow.z - object.z) * from);
            positions.setXYZ(dash * 6 + 3, object.x + (object.shadow.x - object.x) * to, 0.058, object.z + (object.shadow.z - object.z) * to);
            positions.setXYZ(dash * 6 + 4, object.x + (object.shadow.x - object.x) * from, object.y * (1 - from) + 0.025 * from, object.z + (object.shadow.z - object.z) * from);
            positions.setXYZ(dash * 6 + 5, object.x + (object.shadow.x - object.x) * to, object.y * (1 - to) + 0.025 * to, object.z + (object.shadow.z - object.z) * to);
          }
          positions.setXYZ(72, object.x - 0.45, object.targetHeight, object.z);
          positions.setXYZ(73, object.x + 0.45, object.targetHeight, object.z);
          positions.needsUpdate = true;
          sphere.guide.geometry.computeBoundingSphere();
        }
      });
      landing.objects = objects;
    }

    function updateLanding(S, data) {
      var landing = S.walk && S.walk.landing;
      if (!landing) return;
      var lightAngle = clamp(number(data.landingLightAngle, 0), -25, 25);
      if (landing.lightAngle !== lightAngle) {
        landing.light = Lab.PerceptionWalk.landingLight(landing.round, lightAngle);
        landing.lightAngle = lightAngle;
        shadeLanding(landing, landing.light);
      }
      placeLanding(landing, Lab.PerceptionWalk.landingObjects(landing.round, data.landingHeights, lightAngle));
    }

    function separateLandingLabels(THREE, S) {
      var width = S.renderer.domElement.clientWidth, height = S.renderer.domElement.clientHeight;
      if (!width || !height || !S.walk || !S.walk.landing) return;
      var tangent = Math.tan(S.camera.fov * Math.PI / 360), right = new THREE.Vector3().setFromMatrixColumn(S.camera.matrixWorld, 0);
      var labels = [];
      S.walk.landing.spheres.forEach(function (sphere, index) {
        sphere.targetLabelBounds = null;
        var sprite = sphere.targetLabel;
        if (!sprite) return;
        var point = sprite.position.clone().applyMatrix4(S.camera.matrixWorldInverse), projected = sprite.position.clone().project(S.camera);
        if (point.z >= -S.camera.near || Math.abs(projected.x) > 1.1 || Math.abs(projected.y) > 1.1) return;
        var perPixel = -2 * point.z * tangent / height;
        labels.push({ sphere: sphere, index: index, sprite: sprite, perPixel: perPixel,
          x: (projected.x + 1) * width / 2, y: (1 - projected.y) * height / 2,
          halfWidth: sprite.scale.x / perPixel / 2, halfHeight: sprite.scale.y / perPixel / 2 });
      });
      labels.sort(function (a, b) { return a.x - b.x || a.index - b.index; });
      labels.forEach(function (label) { label.anchor = label.x; });
      // Separate only overlapping floor letters; the targets and shadows stay at their geometric positions.
      for (var pass = 0; pass < 8; pass++) {
        for (var i = 0; i < labels.length; i++) for (var j = i + 1; j < labels.length; j++) {
          var a = labels[i], b = labels[j];
          if (Math.abs(a.y - b.y) >= a.halfHeight + b.halfHeight + 2) continue;
          var overlap = a.halfWidth + b.halfWidth + 3 - (b.x - a.x);
          if (overlap <= 0) continue;
          var leftRoom = Math.max(0, a.x - a.halfWidth - 3), rightRoom = Math.max(0, width - 3 - b.halfWidth - b.x);
          var left = Math.min(overlap / 2, leftRoom), rightShift = Math.min(overlap - left, rightRoom);
          left = Math.min(overlap - rightShift, leftRoom);
          a.x -= left; b.x += rightShift;
        }
      }
      labels.forEach(function (label) {
        var offset = label.x - label.anchor;
        label.sprite.position.addScaledVector(right, offset * label.perPixel);
        label.sphere.targetLabelBounds = { left: label.x - label.halfWidth, right: label.x + label.halfWidth,
          top: label.y - label.halfHeight, bottom: label.y + label.halfHeight, offsetX: offset };
      });
    }

    function updateWeave(S, data) {
      var weave = S.walk && S.walk.weave;
      if (!weave) return;
      var objects = Lab.PerceptionWalk.weaveObjects(data.weaveDepths);
      objects.forEach(function (object, index) {
        var beam = weave.beams[index], rail = weave.rails[index];
        beam.mesh.position.z = object.depth;
        if (beam.guide) beam.guide.position.z = object.depth;
        rail.z = object.depth;
        rail.knob.position.z = object.depth;
        beam.object = object;
      });
      weave.objects = objects;
    }

    function updateFrame(THREE, S, data) {
      var frame = S.walk && S.walk.frame;
      if (!frame) return;
      var defaults = Lab.PerceptionWalk.frameDefaults(frame.round);
      var adjustment = clamp(number(data.frameAdjustment, defaults.adjustment), -45, 45);
      var surround = clamp(number(data.frameSurround, defaults.surround), -30, 30);
      if (adjustment === frame.adjustment && surround === frame.surround) return;
      var objects = Lab.PerceptionWalk.frameObjects(frame.round, adjustment, surround);
      var a = new THREE.Vector3(), b = new THREE.Vector3(), direction = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
      function positionRod(mesh, from, to) {
        a.set(from.x, from.y, from.z); b.set(to.x, to.y, to.z);
        mesh.position.copy(a).add(b).multiplyScalar(0.5);
        direction.subVectors(b, a).normalize();
        mesh.quaternion.setFromUnitVectors(up, direction);
      }
      positionRod(frame.shaft, objects.rod.from, objects.rod.to);
      frame.handle.position.set(objects.rod.to.x, objects.rod.to.y, objects.rod.to.z);
      frame.edges.forEach(function (edge, index) { positionRod(edge, objects.corners[index], objects.corners[(index + 1) % objects.corners.length]); });
      frame.objects = objects; frame.adjustment = adjustment; frame.surround = surround;
    }

    function placeMotion(motion, objects, phase) {
      objects.forEach(function (object, index) {
        var sphere = motion.spheres[index];
        sphere.mesh.position.set(object.x, object.y, object.z);
        sphere.object = object;
      });
      motion.guides.forEach(function (guide) {
        var points;
        if (guide.choices.length === 1) {
          var object = objects.filter(function (item) { return item.choice === guide.choices[0]; })[0];
          points = [object.base, object];
        } else {
          points = guide.choices.map(function (choice) { return objects.filter(function (item) { return item.choice === choice; })[0]; });
        }
        var positions = guide.line.geometry.getAttribute('position');
        points.forEach(function (point, index) { positions.setXYZ(index, point.x, point.y, point.z); });
        positions.needsUpdate = true;
        guide.line.geometry.computeBoundingSphere();
      });
      motion.dial.x = 129.5 + phase / 360 * 5;
      motion.knob.position.set(motion.dial.x, motion.dial.y, motion.dial.z);
      motion.objects = objects;
      motion.phase = phase;
    }

    function updateMotion(S, data) {
      var motion = S.walk && S.walk.motion, phase = clamp(number(data.motionPhase, 0), 0, 359.9);
      if (!motion || phase === motion.phase) return;
      placeMotion(motion, Lab.PerceptionWalk.motionObjects(motion.round, phase), phase);
    }

    function placeShape(sculpture, object) {
      sculpture.group.position.set(object.x, object.y, object.z);
      sculpture.group.rotation.set(object.pitch * Math.PI / 180, object.yaw * Math.PI / 180, 0, 'YXZ');
      var bottom = Lab.PerceptionWalk.shapePoint(object, { x: 0, y: -object.ry, z: 0 });
      bottom.y -= object.tube;
      sculpture.stand.position.set(bottom.x, (bottom.y + 0.35) / 2, bottom.z);
      sculpture.stand.scale.y = Math.max(0.01, bottom.y - 0.35);
      sculpture.object = object;
      sculpture.top = object.y + object.ry * Math.abs(Math.cos(object.pitch * Math.PI / 180)) + object.tube;
    }

    function updateShapeOrientations(S, data) {
      var shape = S.walk && S.walk.shape;
      if (!shape) return;
      var objects = Lab.PerceptionWalk.shapeObjects(shape.round, data.shapeAngles, data.shapeTilts);
      objects.forEach(function (object, index) {
        var sculpture = shape.sculptures[index], previous = sculpture.object;
        if (previous.yaw !== object.yaw || previous.pitch !== object.pitch) placeShape(sculpture, object);
      });
      shape.objects = objects;
    }

    function updateReliefLighting(S, data) {
      var relief = S.walk && S.walk.relief, angle = number(data.reliefAngle, 0);
      if (!relief || angle === relief.angle) return;
      var light = Lab.PerceptionWalk.reliefLight(angle);
      relief.surfaces.forEach(function (mesh) {
        var normals = mesh.geometry.getAttribute('normal'), colors = mesh.geometry.getAttribute('color');
        for (var vertex = 0; vertex < normals.count; vertex++) {
          var shade = 0.18 + 0.82 * Math.max(0, normals.getX(vertex) * light.x + normals.getY(vertex) * light.y + normals.getZ(vertex) * light.z);
          colors.array[vertex * 3] = colors.array[vertex * 3 + 1] = colors.array[vertex * 3 + 2] = shade;
        }
        colors.needsUpdate = true;
      });
      var radians = angle * Math.PI / 180;
      relief.light.x = 108 + 1.5 * Math.sin(radians);
      relief.light.y = 2.3 + 1.5 * Math.cos(radians);
      relief.marker.position.set(relief.light.x, relief.light.y, relief.light.z);
      relief.angle = angle;
    }

    function camera(THREE, S, data) {
      updateReliefLighting(S, data);
      updateShapeOrientations(S, data);
      updateMotion(S, data);
      updateFrame(THREE, S, data);
      updateWeave(S, data);
      updateLanding(S, data);
      updateAperture(S, data);
      updateLength(S, data);
      var player = data.player || {}, direction = cameraDirection(player);
      var x = clamp(number(player.x, -12), -20, 200), z = clamp(number(player.z, 9), -8, 14);
      S.camera.position.set(x, EYE_Y, z);
      S.camera.lookAt(new THREE.Vector3(x + direction.x, EYE_Y + direction.y, z + direction.z));
      S.camera.fov = data.activity === 'aperture' || data.activity === 'length' ? Math.max(52, 2 * Math.atan(Math.tan(34 * Math.PI / 180) / S.camera.aspect) * 180 / Math.PI)
        : data.activity === 'landing' ? Math.max(52, 2 * Math.atan(Math.tan(36 * Math.PI / 180) / S.camera.aspect) * 180 / Math.PI)
        : data.activity === 'weave' ? Math.max(76, 2 * Math.atan(Math.tan(36 * Math.PI / 180) / S.camera.aspect) * 180 / Math.PI)
        : ['parallax', 'contour', 'context', 'continuity', 'shadow', 'change', 'rotation', 'relief', 'shape', 'motion', 'frame'].indexOf(data.activity) >= 0
        ? Math.max(62, 2 * Math.atan(Math.tan((data.activity === 'shadow' || data.activity === 'change' ? 30 : data.activity === 'rotation' || data.activity === 'relief' || data.activity === 'shape' || data.activity === 'motion' || data.activity === 'frame' ? 32 : 40) * Math.PI / 180) / S.camera.aspect) * 180 / Math.PI)
        : 62;
      S.camera.near = 0.04;
      S.camera.far = 240;
      S.camera.updateProjectionMatrix();
      S.camera.updateMatrixWorld(true);
      // Keep identification letters readable in narrow views without enlarging the spheres.
      if (S.walk) S.walk.labels.forEach(function (marker) {
        var object = marker.object, point = new THREE.Vector3(object.x, object.y, object.z).applyMatrix4(S.camera.matrixWorldInverse);
        var height = S.renderer.domElement.clientHeight || 360;
        var perPixel = 2 * Math.max(0.2, -point.z) * Math.tan(S.camera.fov * Math.PI / 360) / height;
        var size = Math.max(object.radius * 0.8, 20 * perPixel);
        marker.sprite.scale.set(size, size, 1);
        marker.sprite.position.y = object.y + object.radius + size / 2 + Math.max(object.radius * 0.35, 3 * perPixel);
      });
      if (S.walk) S.walk.panelLabels.forEach(function (marker) {
        var object = marker.object, point = new THREE.Vector3(object.x, object.y, object.z).applyMatrix4(S.camera.matrixWorldInverse);
        var height = S.renderer.domElement.clientHeight || 360;
        var perPixel = 2 * Math.max(0.2, -point.z) * Math.tan(S.camera.fov * Math.PI / 360) / height;
        var size = Math.max(0.42, 20 * perPixel);
        marker.sprite.scale.set(size, size, 1);
        marker.sprite.position.x = object.x + marker.side * (marker.halfWidth + 0.16 + size / 2);
      });
      if (S.walk) S.walk.changeLabels.forEach(function (marker) {
        var object = marker.object, point = new THREE.Vector3(object.x, object.y, object.z).applyMatrix4(S.camera.matrixWorldInverse);
        var height = S.renderer.domElement.clientHeight || 360;
        var perPixel = 2 * Math.max(0.2, -point.z) * Math.tan(S.camera.fov * Math.PI / 360) / height;
        var size = Math.max(0.42, 20 * perPixel);
        marker.sprite.scale.set(size, size, 1);
        marker.sprite.position.y = object.y + object.height / 2 + size / 2 + Math.max(0.15, 3 * perPixel);
      });
      if (S.walk) S.walk.rotationLabels.forEach(function (marker) {
        var object = marker.object, point = new THREE.Vector3(object.x, object.y, object.z).applyMatrix4(S.camera.matrixWorldInverse);
        var height = S.renderer.domElement.clientHeight || 360;
        var perPixel = 2 * Math.max(0.2, -point.z) * Math.tan(S.camera.fov * Math.PI / 360) / height;
        var size = Math.max(0.42, 20 * perPixel);
        marker.sprite.scale.set(size, size, 1);
        marker.sprite.position.y = Math.max(3.85, marker.top + size / 2 + Math.max(0.15, 3 * perPixel));
      });
      if (S.walk) S.walk.reliefLabels.forEach(function (marker) {
        var object = marker.object, point = new THREE.Vector3(object.x, object.y, object.z).applyMatrix4(S.camera.matrixWorldInverse);
        var height = S.renderer.domElement.clientHeight || 360;
        var perPixel = 2 * Math.max(0.2, -point.z) * Math.tan(S.camera.fov * Math.PI / 360) / height;
        var size = Math.max(0.42, 20 * perPixel);
        marker.sprite.scale.set(size, size, 1);
        marker.sprite.position.y = object.y + object.height / 2 + size / 2 + Math.max(0.15, 3 * perPixel);
      });
      if (S.walk) S.walk.shapeLabels.forEach(function (marker) {
        var object = marker.sculpture.object, point = new THREE.Vector3(object.x, object.y, object.z).applyMatrix4(S.camera.matrixWorldInverse);
        var height = S.renderer.domElement.clientHeight || 360;
        var perPixel = 2 * Math.max(0.2, -point.z) * Math.tan(S.camera.fov * Math.PI / 360) / height;
        var size = Math.max(0.42, 20 * perPixel);
        marker.sprite.scale.set(size, size, 1);
        marker.sprite.position.y = Math.max(3.95, marker.sculpture.top + size / 2 + Math.max(0.15, 3 * perPixel));
      });
      if (S.walk) S.walk.motionLabels.forEach(function (marker) {
        var object = marker.sphere.object, point = new THREE.Vector3(object.x, object.y, object.z).applyMatrix4(S.camera.matrixWorldInverse);
        var height = S.renderer.domElement.clientHeight || 360;
        var perPixel = 2 * Math.max(0.2, -point.z) * Math.tan(S.camera.fov * Math.PI / 360) / height;
        var size = Math.max(0.42, 20 * perPixel);
        marker.sprite.scale.set(size, size, 1);
        marker.sprite.position.set(object.x, object.y + object.radius + size / 2 + Math.max(0.15, 3 * perPixel), object.z);
      });
      if (S.walk) S.walk.weaveLabels.forEach(function (marker) {
        var end = marker.beam.object[marker.end], point = new THREE.Vector3(end.x, end.y, end.z).applyMatrix4(S.camera.matrixWorldInverse);
        var height = S.renderer.domElement.clientHeight || 360;
        var perPixel = 2 * Math.max(0.2, -point.z) * Math.tan(S.camera.fov * Math.PI / 360) / height;
        var size = Math.max(0.42, 20 * perPixel);
        marker.sprite.scale.set(size, size, 1);
        marker.sprite.position.set(end.x, end.y + 0.14 + size / 2, end.z);
      });
      if (S.walk) S.walk.landingLabels.forEach(function (marker) {
        var object = marker.sphere.object, point = new THREE.Vector3(object.x, object.y, object.z).applyMatrix4(S.camera.matrixWorldInverse);
        var height = S.renderer.domElement.clientHeight || 360;
        var perPixel = 2 * Math.max(0.2, -point.z) * Math.tan(S.camera.fov * Math.PI / 360) / height;
        var size = Math.max(0.42, 20 * perPixel);
        marker.sprite.scale.set(size, size, 1);
        marker.sprite.position.set(object.x, object.y + object.radius + 0.12 + size / 2, object.z);
        var targetLabel = marker.sphere.targetLabel;
        if (targetLabel) {
          var floorPoint = new THREE.Vector3(object.target.x, 0.2, object.target.z - 0.65).applyMatrix4(S.camera.matrixWorldInverse);
          var targetSize = Math.max(0.42, 20 * 2 * Math.max(0.2, -floorPoint.z) * Math.tan(S.camera.fov * Math.PI / 360) / height);
          targetLabel.scale.set(targetSize, targetSize, 1);
          targetLabel.position.y = 0.09 + targetSize / 2;
        }
      });
      separateLandingLabels(THREE, S);
      S.scene.updateMatrixWorld(true);
      sceneState = S;
      projectLayout(THREE, S);
    }

    var viewer = Lab.makeOrbitViewer({
      attr: 'data-perception-walk-gl', clearColor: COLORS.wall, radius: '0px', fov: 62,
      build: build, camera: camera,
      lights: function (THREE, scene, S) {
        S.renderer.outputEncoding = THREE.sRGBEncoding;
        S.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        S.renderer.toneMappingExposure = 0.98;
        scene.add(new THREE.HemisphereLight(0xffffff, 0xb7c6bc, 0.83));
        var key = new THREE.DirectionalLight(0xfff8ed, 0.62);
        key.position.set(3, 12, 8); scene.add(key);
        var fill = new THREE.DirectionalLight(0xe6f3ff, 0.27);
        fill.position.set(-10, 7, -5); scene.add(fill);
      },
      debug: function (S) {
        if (!S.walk) return {};
        function projected(point) {
          var v = new S.THREE.Vector3(point.x, point.y, point.z).project(S.camera);
          return { x: v.x, y: v.y, z: v.z };
        }
        function pointData(point) { return { x: point.x, y: point.y, z: point.z }; }
        function lengthShaftData(shaft) {
          return { from: pointData(shaft.caps[0].position), to: pointData(shaft.caps[1].position),
            center: pointData(shaft.beam.position), length: shaft.beam.geometry.parameters.height * shaft.beam.scale.y,
            fins: shaft.fins.map(function (mesh) {
              mesh.updateWorldMatrix(true, false);
              var half = mesh.geometry.parameters.height / 2;
              return { from: pointData(mesh.localToWorld(new S.THREE.Vector3(0, -half, 0))),
                to: pointData(mesh.localToWorld(new S.THREE.Vector3(0, half, 0))) };
            }) };
        }
        var lengthBoardBounds = new S.THREE.Box3().setFromObject(S.walk.length.board);
        return { activity: S.data && S.data.activity, blockZ: S.data && S.data.blockZ,
          selected: !!(S.data && S.data.selected),
          parallaxChoice: S.data && /^[ABC]$/.test(S.data.parallaxChoice) ? S.data.parallaxChoice : null,
          contourAngles: S.walk.contour.map(function (object) { return object.angle; }),
          contourSelected: S.data && S.data.contourSelected,
          contextNeutral: !!(S.data && S.data.contextNeutral),
          contextSelected: S.data && Array.isArray(S.data.contextSelected) ? S.data.contextSelected.slice() : [],
          collected: S.data && S.data.collected ? S.data.collected.slice() : [], static: !!(S.data && S.data.static),
          camera: { x: S.camera.position.x, y: S.camera.position.y, z: S.camera.position.z, fov: S.camera.fov,
            yaw: S.data && S.data.player && S.data.player.yaw, pitch: S.data && S.data.player && S.data.player.pitch },
          ringProjected: S.walk.ring.map(function (part) { return part.points.map(projected); }),
          ringDepths: S.walk.ring.map(function (part) { return part.depth; }),
          scaleObjects: S.walk.blocks.map(function (object) { return Object.assign({}, object); }),
          scaleProjected: S.walk.blocks.map(function (object) {
            return { id: object.id, center: projected(object),
              top: projected({ x: object.x, y: object.y + object.height / 2, z: object.z }),
              bottom: projected({ x: object.x, y: object.y - object.height / 2, z: object.z }) };
          }),
          tokenProjected: S.walk.tokens.map(function (token) {
            return { id: token.id, index: token.index, center: projected(token),
              collected: !!(S.data && S.data.collected && S.data.collected.indexOf(token.index) >= 0) };
          }),
          parallaxObjects: S.walk.parallax.map(function (object) { return Object.assign({}, object); }),
          parallaxProjected: S.walk.parallax.map(function (object) {
            return { id: object.id, choice: object.choice, center: projected(object),
              top: projected({ x: object.x, y: object.y + object.radius, z: object.z }),
              bottom: projected({ x: object.x, y: object.y - object.radius, z: object.z }) };
          }),
          contourObjects: S.walk.contour.map(function (object) { return Object.assign({}, object); }),
          contourProjected: S.walk.contour.map(function (object) {
            var theta = object.angle * Math.PI / 180 + Math.PI;
            return { id: object.id, index: object.index, choice: object.choice, center: projected(object),
              pickPoint: projected({ x: object.x + object.radius * 0.5 * Math.cos(theta),
                y: object.y + object.radius * 0.5 * Math.sin(theta), z: object.z + object.depth }) };
          }),
          contextObjects: S.walk.context.map(function (object) { return Object.assign({}, object); }),
          contextProjected: S.walk.context.map(function (object) {
            return { id: object.id, choice: object.choice, center: projected({ x: object.x, y: object.y, z: object.z + 0.118 }) };
          }),
          contextSwitchProjected: projected(S.walk.contextSwitch),
          continuityOffset: S.data && S.data.continuityOffset,
          continuityScreenVisible: !(S.data && S.data.activity === 'continuity' && S.data.reveal),
          continuationObjects: S.walk.continuity.map(function (object) { return { id: object.id, from: Object.assign({}, object.from), to: Object.assign({}, object.to) }; }),
          continuationProjected: S.walk.continuity.map(function (object) {
            return { id: object.id, center: projected({ x: (object.from.x + object.to.x) / 2, y: (object.from.y + object.to.y) / 2, z: 0 }), from: projected(object.from), to: projected(object.to) };
          }),
          shadowAngle: S.data && S.data.shadowAngle,
          shadowRevealed: !!(S.data && S.data.activity === 'shadow' && S.data.reveal),
          shadowObjects: S.walk.shadow.objects.map(function (object) { return Object.assign({}, object); }),
          shadowProfile: S.walk.shadow.profile.map(function (row) { return Object.assign({}, row); }),
          shadowTargetProfile: S.walk.shadow.target.map(function (row) { return Object.assign({}, row); }),
          shadowProjected: S.walk.shadow.objects.map(function (object) { return { id: object.id, center: projected(object) }; }),
          shadowWallProjected: Lab.PerceptionWalk.shadowOutline(S.walk.shadow.target).map(function (point) { return projected({ x: point.x, y: point.y, z: -4 }); }),
          changeRound: S.walk.change.round,
          changeVariant: S.walk.change.variant,
          changeSelected: S.data && /^[ABCDE]$/.test(S.data.changeSelected) ? S.data.changeSelected : null,
          changeRevealed: !!(S.data && S.data.activity === 'change' && S.data.reveal),
          changeObjects: S.walk.change.objects.map(function (object) { return Object.assign({}, object); }),
          changeCounterpart: S.walk.change.counterpart.map(function (object) { return Object.assign({}, object); }),
          changeProjected: S.walk.change.objects.map(function (object) {
            return { id: object.id, choice: object.choice, center: projected(object),
              top: projected({ x: object.x, y: object.y + object.height / 2, z: object.z }),
              bottom: projected({ x: object.x, y: object.y - object.height / 2, z: object.z }) };
          }),
          rotationRound: S.walk.rotation.round,
          rotationAngles: S.walk.rotation.objects.slice(1).map(function (object) { return object.yaw; }),
          rotationTilts: S.walk.rotation.objects.slice(1).map(function (object) { return object.pitch; }),
          rotationSelected: S.data && S.data.rotationSelected,
          rotationChoice: S.data && /^[AB]$/.test(S.data.rotationChoice) ? S.data.rotationChoice : null,
          rotationRevealed: !!(S.data && S.data.activity === 'rotation' && S.data.reveal),
          rotationObjects: S.walk.rotation.objects.map(function (object) {
            return Object.assign({}, object, { cells: object.cells.map(function (cell) { return Object.assign({}, cell); }) });
          }),
          rotationProjected: S.walk.rotation.projectedObjects.map(function (shape) {
            var object = shape.object;
            var top = shape.corners.reduce(function (highest, point) { return point.y > highest.y ? point : highest; });
            var bottom = shape.corners.reduce(function (lowest, point) { return point.y < lowest.y ? point : lowest; });
            return { id: object.id, choice: object.choice, center: projected(object), top: projected(top), bottom: projected(bottom),
              voxelCenters: shape.centers.map(projected), corners: shape.corners.map(projected) };
          }),
          reliefRound: S.walk.relief.round,
          reliefAngle: S.walk.relief.angle,
          reliefChoice: S.data && /^[AB]$/.test(S.data.reliefChoice) ? S.data.reliefChoice : null,
          reliefRevealed: !!(S.data && S.data.activity === 'relief' && S.data.reveal),
          reliefObjects: S.walk.relief.objects.map(function (object) { return Object.assign({}, object); }),
          reliefProjected: S.walk.relief.objects.map(function (object) {
            var corners = [];
            [-1, 1].forEach(function (x) { [-1, 1].forEach(function (y) {
              corners.push(projected({ x: object.x + x * object.width / 2, y: object.y + y * object.height / 2, z: object.z }));
            }); });
            return { id: object.id, choice: object.choice, center: projected({ x: object.x, y: object.y, z: object.z + object.depth }),
              top: projected({ x: object.x, y: object.y + object.height / 2, z: object.z }),
              bottom: projected({ x: object.x, y: object.y - object.height / 2, z: object.z }), corners: corners };
          }),
          reliefLight: Object.assign({}, S.walk.relief.light, { projected: projected(S.walk.relief.light) }),
          reliefLightProjected: projected(S.walk.relief.light),
          reliefLightDirection: Lab.PerceptionWalk.reliefLight(S.walk.relief.angle),
          shapeRound: S.walk.shape.round,
          shapeAngles: S.walk.shape.objects.map(function (object) { return object.yaw; }),
          shapeTilts: S.walk.shape.objects.map(function (object) { return object.pitch; }),
          shapeSelected: S.data && S.data.shapeSelected,
          shapeChoice: S.data && /^[AB]$/.test(S.data.shapeChoice) ? S.data.shapeChoice : null,
          shapeRevealed: !!(S.data && S.data.activity === 'shape' && S.data.reveal),
          shapeObjects: S.walk.shape.objects.map(function (object) { return Object.assign({}, object); }),
          shapeProjected: S.walk.shape.objects.map(function (object) {
            var points = [], corners = [];
            for (var index = 0; index < 96; index++) {
              var angle = index * Math.PI / 48;
              points.push(Lab.PerceptionWalk.shapePoint(object, { x: object.rx * Math.cos(angle), y: object.ry * Math.sin(angle), z: 0 }));
            }
            [-1, 1].forEach(function (x) { [-1, 1].forEach(function (y) { [-1, 1].forEach(function (z) {
              corners.push(Lab.PerceptionWalk.shapePoint(object, { x: x * (object.rx + object.tube), y: y * (object.ry + object.tube), z: z * object.tube }));
            }); }); });
            var top = points.reduce(function (highest, point) { return point.y > highest.y ? point : highest; });
            var bottom = points.reduce(function (lowest, point) { return point.y < lowest.y ? point : lowest; });
            return { id: object.id, choice: object.choice, center: projected(object),
              top: projected({ x: top.x, y: top.y + object.tube, z: top.z }),
              bottom: projected({ x: bottom.x, y: bottom.y - object.tube, z: bottom.z }),
              points: points.map(projected), corners: corners.map(projected) };
          }),
          motionRound: S.walk.motion.round,
          motionPhase: S.walk.motion.phase,
          motionSelected: S.data && Array.isArray(S.data.motionSelected) ? S.data.motionSelected.slice() : [],
          motionRevealed: !!(S.data && S.data.activity === 'motion' && S.data.reveal),
          motionObjects: S.walk.motion.objects.map(function (object) {
            return Object.assign({}, object, { base: Object.assign({}, object.base), offset: Object.assign({}, object.offset) });
          }),
          motionProjected: S.walk.motion.objects.map(function (object) {
            return { id: object.id, choice: object.choice, center: projected(object),
              top: projected({ x: object.x, y: object.y + object.radius, z: object.z }),
              bottom: projected({ x: object.x, y: object.y - object.radius, z: object.z }) };
          }),
          motionDial: Object.assign({}, S.walk.motion.dial, { projected: projected(S.walk.motion.dial) }),
          motionDialProjected: projected(S.walk.motion.dial),
          frameRound: S.walk.frame.round,
          frameAdjustment: S.walk.frame.adjustment,
          frameSurround: S.walk.frame.surround,
          frameAngle: S.walk.frame.objects.angle,
          frameVisible: S.walk.frame.visible,
          frameRevealed: !!(S.data && S.data.activity === 'frame' && S.data.reveal),
          frameObjects: { center: Object.assign({}, S.walk.frame.objects.center),
            rod: { from: Object.assign({}, S.walk.frame.objects.rod.from), to: Object.assign({}, S.walk.frame.objects.rod.to) },
            corners: S.walk.frame.objects.corners.map(function (point) { return Object.assign({}, point); }), angle: S.walk.frame.objects.angle },
          frameProjected: { center: projected(S.walk.frame.objects.center),
            from: projected(S.walk.frame.objects.rod.from), to: projected(S.walk.frame.objects.rod.to),
            rod: { from: projected(S.walk.frame.objects.rod.from), to: projected(S.walk.frame.objects.rod.to) },
            corners: S.walk.frame.objects.corners.map(projected) },
          weaveRound: S.walk.weave.round,
          weaveDepths: S.walk.weave.objects.map(function (object) { return object.depth; }),
          weaveSelected: S.data && S.data.weaveSelected,
          weaveRevealed: !!(S.data && S.data.activity === 'weave' && S.data.reveal),
          weaveObjects: S.walk.weave.objects.map(function (object) {
            return Object.assign({}, object, { from: Object.assign({}, object.from), to: Object.assign({}, object.to) });
          }),
          weaveProjected: S.walk.weave.objects.map(function (object, index) {
            var sprite = S.walk.weaveLabels[index] && S.walk.weaveLabels[index].sprite;
            return { id: object.id, choice: object.choice, from: projected(object.from), to: projected(object.to),
              center: projected({ x: (object.from.x + object.to.x) / 2, y: (object.from.y + object.to.y) / 2, z: object.depth }),
              label: sprite ? projected(sprite.position) : null };
          }),
          weaveRails: S.walk.weave.rails.map(function (rail) {
            return { index: rail.index, x: rail.x, y: rail.y, z: rail.z, projected: projected(rail),
              from: projected({ x: rail.x, y: rail.y, z: -1.5 }), to: projected({ x: rail.x, y: rail.y, z: 1.5 }) };
          }),
          landingRound: S.walk.landing.round,
          landingHeights: S.walk.landing.objects.map(function (object) { return object.y; }),
          landingSelected: S.data && S.data.landingSelected,
          landingRevealed: !!(S.data && S.data.activity === 'landing' && S.data.reveal),
          landingLightAngle: S.walk.landing.lightAngle,
          landingLight: Object.assign({}, S.walk.landing.light),
          landingTargetLabelBounds: S.walk.landing.spheres.map(function (sphere) { return sphere.targetLabelBounds ? Object.assign({}, sphere.targetLabelBounds) : null; }),
          landingObjects: S.walk.landing.objects.map(function (object) {
            return Object.assign({}, object, { shadow: Object.assign({}, object.shadow), target: Object.assign({}, object.target) });
          }),
          landingProjected: S.walk.landing.objects.map(function (object, index) {
            var sprite = S.walk.landingLabels[index] && S.walk.landingLabels[index].sprite;
            var targetLabel = S.walk.landing.spheres[index].targetLabel;
            return { id: object.id, choice: object.choice, center: projected(object),
              shadow: projected({ x: object.shadow.x, y: 0.025, z: object.shadow.z }),
              target: projected({ x: object.target.x, y: 0.048, z: object.target.z }),
              label: sprite ? projected(sprite.position) : null,
              targetLabelBounds: S.walk.landing.spheres[index].targetLabelBounds ? Object.assign({}, S.walk.landing.spheres[index].targetLabelBounds) : null,
              targetLabel: targetLabel ? projected(targetLabel.position) : null };
          }),
          apertureRound: S.walk.aperture.round,
          aperturePhase: S.walk.aperture.phase,
          apertureMasked: S.walk.aperture.masked,
          apertureChoice: S.data && S.data.apertureChoice,
          apertureRevealed: !!(S.data && S.data.activity === 'aperture' && S.data.reveal),
          apertureDial: { x: S.walk.aperture.dial.x, y: S.walk.aperture.dial.y, z: S.walk.aperture.dial.z,
            radius: S.walk.aperture.dial.radius, phase: S.walk.aperture.phase,
            handle: { x: S.walk.aperture.dial.handle.position.x, y: S.walk.aperture.dial.handle.position.y, z: S.walk.aperture.dial.handle.position.z } },
          apertureObjects: { from: Object.assign({}, S.walk.aperture.objects.from), to: Object.assign({}, S.walk.aperture.objects.to),
            center: Object.assign({}, S.walk.aperture.objects.center), axis: S.walk.aperture.objects.axis,
            offset: Object.assign({}, S.walk.aperture.objects.offset), screen: Object.assign({}, S.walk.aperture.objects.screen) },
          apertureRod: { from: { x: S.walk.aperture.caps[0].position.x, y: S.walk.aperture.caps[0].position.y, z: S.walk.aperture.caps[0].position.z },
            to: { x: S.walk.aperture.caps[1].position.x, y: S.walk.aperture.caps[1].position.y, z: S.walk.aperture.caps[1].position.z },
            center: { x: S.walk.aperture.beam.position.x, y: S.walk.aperture.beam.position.y, z: S.walk.aperture.beam.position.z },
            length: S.walk.aperture.beam.geometry.parameters.height, radius: S.walk.aperture.beam.geometry.parameters.radiusTop },
          aperturePanelCount: S.walk.aperture.panels.filter(function (panel) { return panel.visible; }).length,
          aperturePanels: S.walk.aperture.panels.map(function (panel) {
            var bounds = new S.THREE.Box3().setFromObject(panel);
            return { min: { x: bounds.min.x, y: bounds.min.y, z: bounds.min.z },
              max: { x: bounds.max.x, y: bounds.max.y, z: bounds.max.z }, visible: panel.visible,
              opacity: panel.material.opacity, transparent: panel.material.transparent };
          }),
          apertureGuide: S.walk.aperture.guide ? Array.prototype.slice.call(S.walk.aperture.guide.geometry.getAttribute('position').array) : [],
          apertureProjected: { from: projected(S.walk.aperture.caps[0].position), to: projected(S.walk.aperture.caps[1].position),
            center: projected(S.walk.aperture.beam.position), switch: projected(S.walk.aperture.toggle),
            dial: projected(S.walk.aperture.dial), handle: projected(S.walk.aperture.dial.handle.position),
            dialEdges: [0, 1, 2, 3].map(function (tick) {
              var dial = S.walk.aperture.dial, angle = tick * Math.PI / 2;
              return projected({ x: dial.x + Math.sin(angle) * dial.radius, y: dial.y + Math.cos(angle) * dial.radius, z: dial.z });
            }) },
          lengthRound: S.walk.length.round,
          lengthValue: S.walk.length.value,
          lengthVisible: S.walk.length.visible,
          lengthRevealed: !!(S.data && S.data.activity === 'length' && S.data.reveal),
          lengthObjects: { reference: lengthShaftData(S.walk.length.reference), adjustable: lengthShaftData(S.walk.length.adjustable), toggle: pointData(S.walk.length.toggle) },
          lengthHandle: pointData(S.walk.length.handle.position),
          lengthFins: S.walk.length.reference.fins.length + S.walk.length.adjustable.fins.length,
          lengthGuide: S.walk.length.guide ? Array.prototype.slice.call(S.walk.length.guide.geometry.getAttribute('position').array) : [],
          lengthBoard: { min: pointData(lengthBoardBounds.min), max: pointData(lengthBoardBounds.max) },
          lengthProjected: { referenceFrom: projected(S.walk.length.reference.caps[0].position), referenceTo: projected(S.walk.length.reference.caps[1].position),
            from: projected(S.walk.length.adjustable.caps[0].position), to: projected(S.walk.length.adjustable.caps[1].position),
            center: projected(S.walk.length.adjustable.beam.position), handle: projected(S.walk.length.handle.position), switch: projected(S.walk.length.toggle) },
          solidCount: S.walk.solids.length, interactionRange: INTERACTION_RANGE, panelRange: PANEL_RANGE, continuityRange: CONTINUITY_RANGE, changeRange: CHANGE_RANGE, rotationRange: ROTATION_RANGE, reliefRange: RELIEF_RANGE, shapeRange: SHAPE_RANGE, motionRange: MOTION_RANGE, frameRange: FRAME_RANGE, weaveRange: WEAVE_RANGE, landingRange: LANDING_RANGE, apertureRange: APERTURE_RANGE, lengthRange: LENGTH_RANGE, inspectionRange: INSPECTION_RANGE,
          waypoints: layoutSnapshot() };
      },
      failMessage: 'The first-person perception space could not start its 3D view.'
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

    function pointerRay(clientX, clientY) {
      var S = sceneState;
      if (!S || S.disposing || S.failed || S.contextLost || !S.walk || !S.renderer ||
          !isFinite(clientX) || !isFinite(clientY) || viewer.status() !== 'ready') return null;
      var rect = S.renderer.domElement.getBoundingClientRect();
      if (!rect.width || !rect.height || clientX < rect.left || clientY < rect.top ||
          clientX > rect.left + rect.width || clientY > rect.top + rect.height) return null;
      var ray = new S.THREE.Raycaster();
      var pointer = new S.THREE.Vector2((clientX - rect.left) / rect.width * 2 - 1,
        1 - (clientY - rect.top) / rect.height * 2);
      S.camera.updateProjectionMatrix();
      S.camera.updateMatrixWorld(true);
      S.model.updateMatrixWorld(true);
      ray.setFromCamera(pointer, S.camera);
      return ray;
    }

    viewer.blockCoordinate = function (clientX, clientY) {
      var ray = pointerRay(clientX, clientY), S = sceneState;
      if (!ray) return null;
      var direction = ray.ray.direction;
      // Looking along the track makes its depth ambiguous and dragging unstable.
      if (Math.sqrt(direction.x * direction.x + direction.y * direction.y) < 0.06) return null;
      var start = new S.THREE.Vector3(0.95, EYE_Y, -1);
      var end = new S.THREE.Vector3(0.95, EYE_Y, 6);
      var point = new S.THREE.Vector3();
      ray.ray.distanceSqToSegment(start, end, undefined, point);
      return isFinite(point.z) ? clamp(point.z, -1, 6) : null;
    };

    viewer.pick = function (clientX, clientY) {
      var ray = pointerRay(clientX, clientY), S = sceneState;
      if (!ray) return null;
      ray.far = INSPECTION_RANGE;
      // The nearest opaque surface decides interaction. Testing only tagged
      // targets would allow collecting objects through the occlusion wall.
      var hits = ray.intersectObjects(S.walk.solids, false);
      if (!hits.length) return null;
      var id = hits[0].object.userData.perceptionInteraction;
      if (/^relief-(A|B|light)$/.test(id) && (!S.data || S.data.activity !== 'relief')) return null;
      if (/^shape-[AB]$/.test(id) && (!S.data || S.data.activity !== 'shape')) return null;
      if (/^motion-([A-F]|dial)$/.test(id) && (!S.data || S.data.activity !== 'motion')) return null;
      if (/^frame-(rod|surround)$/.test(id) && (!S.data || S.data.activity !== 'frame')) return null;
      if (/^weave-([ABC]|rail-[0-2])$/.test(id) && (!S.data || S.data.activity !== 'weave')) return null;
      if (/^landing-[ABC]$/.test(id) && (!S.data || S.data.activity !== 'landing')) return null;
      if (/^aperture-(rod|screen|dial)$/.test(id) && (!S.data || S.data.activity !== 'aperture')) return null;
      if (/^length-(rod|handle|fins)$/.test(id) && (!S.data || S.data.activity !== 'length')) return null;
      var range = /^parallax-[ABC]$/.test(id) ? INSPECTION_RANGE : /^length-(rod|handle|fins)$/.test(id) ? LENGTH_RANGE : /^aperture-(rod|screen|dial)$/.test(id) ? APERTURE_RANGE : /^landing-[ABC]$/.test(id) ? LANDING_RANGE : /^weave-([ABC]|rail-[0-2])$/.test(id) ? WEAVE_RANGE : /^frame-(rod|surround)$/.test(id) ? FRAME_RANGE : /^motion-([A-F]|dial)$/.test(id) ? MOTION_RANGE : /^shape-[AB]$/.test(id) ? SHAPE_RANGE : /^relief-(A|B|light)$/.test(id) ? RELIEF_RANGE : /^rotation-[AB]$/.test(id) ? ROTATION_RANGE : /^change-[ABCDE]$/.test(id) ? CHANGE_RANGE : id === 'continuity-rod' || /^shadow-block-\d+$/.test(id) ? CONTINUITY_RANGE
        : /^(contour-[0-3]|context-[ABCD]|context-switch)$/.test(id) ? PANEL_RANGE : INTERACTION_RANGE;
      return id && hits[0].distance <= range ? { id: id, distance: hits[0].distance } : null;
    };
    viewer.continuationCoordinate = function (clientX, clientY) {
      var ray = pointerRay(clientX, clientY), S = sceneState;
      if (!ray || Math.abs(ray.ray.direction.z) < 0.08) return null;
      var point = ray.ray.intersectPlane(new S.THREE.Plane(new S.THREE.Vector3(0, 0, 1), 0), new S.THREE.Vector3());
      return point && isFinite(point.y) ? point.y - 0.35 * (point.x - 61.7) : null;
    };
    viewer.reliefLightAngle = function (clientX, clientY) {
      var ray = pointerRay(clientX, clientY), S = sceneState;
      if (!ray || !S.data || S.data.activity !== 'relief' || Math.abs(ray.ray.direction.z) < 0.08) return null;
      var point = ray.ray.intersectPlane(new S.THREE.Plane(new S.THREE.Vector3(0, 0, 1), -2.2), new S.THREE.Vector3());
      if (!point || !isFinite(point.x) || !isFinite(point.y) || Math.hypot(point.x - 108, point.y - 2.3) < 0.2) return null;
      return (Math.atan2(point.x - 108, point.y - 2.3) * 180 / Math.PI + 360) % 360;
    };
    viewer.motionCoordinate = function (clientX, clientY) {
      var ray = pointerRay(clientX, clientY), S = sceneState;
      if (!ray || !S.data || S.data.activity !== 'motion' || Math.abs(ray.ray.direction.z) < 0.08) return null;
      var point = ray.ray.intersectPlane(new S.THREE.Plane(new S.THREE.Vector3(0, 0, 1), -3), new S.THREE.Vector3());
      return point && isFinite(point.x) ? clamp((point.x - 129.5) / 5 * 360, 0, 359.9) : null;
    };
    viewer.lengthCoordinate = function (clientX, clientY) {
      var ray = pointerRay(clientX, clientY), S = sceneState;
      if (!ray || !S.data || S.data.activity !== 'length' || Math.abs(ray.ray.direction.z) < 0.08) return null;
      var point = ray.ray.intersectPlane(new S.THREE.Plane(new S.THREE.Vector3(0, 0, 1), -0.2), new S.THREE.Vector3());
      return point && isFinite(point.x) && point.distanceTo(ray.ray.origin) <= LENGTH_RANGE ? point.x : null;
    };
    viewer.apertureCoordinate = function (clientX, clientY) {
      var ray = pointerRay(clientX, clientY), S = sceneState;
      if (!ray || !S.data || S.data.activity !== 'aperture' || Math.abs(ray.ray.direction.z) < 0.08) return null;
      var dial = S.walk.aperture.dial;
      var point = ray.ray.intersectPlane(new S.THREE.Plane(new S.THREE.Vector3(0, 0, 1), -dial.z), new S.THREE.Vector3());
      if (!point || !isFinite(point.x) || !isFinite(point.y) || point.distanceTo(ray.ray.origin) > APERTURE_RANGE ||
          Math.hypot(point.x - dial.x, point.y - dial.y) < 0.1) return null;
      return (Math.atan2(point.x - dial.x, point.y - dial.y) * 180 / Math.PI + 360) % 360;
    };
    viewer.weaveCoordinate = function (clientX, clientY, index) {
      var ray = pointerRay(clientX, clientY), S = sceneState;
      if (!ray || !S.data || S.data.activity !== 'weave' || [0, 1, 2].indexOf(index) < 0 || Math.abs(ray.ray.direction.y) < 0.04) return null;
      var point = ray.ray.intersectPlane(new S.THREE.Plane(new S.THREE.Vector3(0, 1, 0), -0.55), new S.THREE.Vector3());
      return point && isFinite(point.z) ? clamp(point.z, -1.5, 1.5) : null;
    };
    viewer.landingCoordinate = function (clientX, clientY, index) {
      var ray = pointerRay(clientX, clientY), S = sceneState;
      if (!ray || !S.data || S.data.activity !== 'landing' || [0, 1, 2].indexOf(index) < 0 || Math.abs(ray.ray.direction.z) < 0.08) return null;
      var object = S.walk.landing.objects[index];
      var point = ray.ray.intersectPlane(new S.THREE.Plane(new S.THREE.Vector3(0, 0, 1), -object.z), new S.THREE.Vector3());
      return point && isFinite(point.y) ? clamp(point.y, 0.55, 3.2) : null;
    };
    viewer.frameCoordinate = function (clientX, clientY) {
      var ray = pointerRay(clientX, clientY), S = sceneState;
      if (!ray || !S.data || S.data.activity !== 'frame' || Math.abs(ray.ray.direction.z) < 0.08) return null;
      var point = ray.ray.intersectPlane(new S.THREE.Plane(new S.THREE.Vector3(0, 0, 1), -0.15), new S.THREE.Vector3());
      var center = S.walk.frame.objects.center;
      if (!point || !isFinite(point.x) || !isFinite(point.y) || Math.hypot(point.x - center.x, point.y - center.y) < 0.2) return null;
      return Math.atan2(point.x - center.x, point.y - center.y) * 180 / Math.PI;
    };
    viewer.attach = function (host) {
      if (host && host === attachedHost) return;
      var generation = ++attachment;
      sceneState = null;
      attachedHost = host || null;
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

  Lab.PerceptionWalkScene = { createViewer: createViewer, ringParts: ringParts,
    scaleObjects: scaleObjects, tokenObjects: tokenObjects, parallaxObjects: parallaxObjects,
    contourObjects: contourObjects, contextObjects: contextObjects, continuationObjects: continuationObjects, cameraDirection: cameraDirection };
}());
