(function () {
  'use strict';

  var Lab = window.StemLab = window.StemLab || {};
  var EYE_Y = 1.65, REFERENCE_Z = 9, INTERACTION_RANGE = 7, PANEL_RANGE = 10, INSPECTION_RANGE = 20;
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

  function createViewer() {
    if (typeof Lab.makeOrbitViewer !== 'function') return null;
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
      publishLayout(['ring', 'scale', 'occlusion', 'parallax', 'contour', 'context'].map(function (id, index) {
        var anchor = new THREE.Vector3((index - 1) * 12, 4.9, 0);
        var distance = anchor.distanceTo(S.camera.position);
        var point = anchor.project(S.camera);
        return { id: id, x: (point.x + 1) / 2, y: (1 - point.y) / 2, distance: distance,
          visible: distance > 1.5 && point.x >= -1 && point.x <= 1 &&
            point.y >= -1 && point.y <= 1 && point.z >= -1 && point.z <= 1 };
      }));
    }

    function build(THREE, S, data) {
      var materials = {}, flatMaterials = {}, solids = [], parallaxLabels = [], panelLabels = [];
      var collected = Array.isArray(data.collected) ? data.collected : [];
      var activity = ['ring', 'scale', 'occlusion', 'parallax', 'contour', 'context'].indexOf(data.activity) >= 0 ? data.activity : 'ring';

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
        box(18, -0.15, 3, 76.4, 0.3, 22.4, COLORS.floor);
        box(18, 2.8, -8.2, 76.4, 5.6, 0.4, COLORS.wall);
        box(18, 2.8, 14.2, 76.4, 5.6, 0.4, COLORS.wall);
        box(-20.2, 2.8, 3, 0.4, 5.6, 22.4, 0xe1e8e4);
        box(56.2, 2.8, 3, 0.4, 5.6, 22.4, 0xe1e8e4);
        box(18, 5.65, 3, 76.4, 0.2, 22.4, 0xf8faf7);
        box(18, 0.12, -7.96, 76, 0.24, 0.06, 0xcbd7d0);
        box(18, 0.12, 13.96, 76, 0.24, 0.06, 0xcbd7d0);
        for (var gx = -20; gx <= 56; gx += 2) box(gx, 0.003, 3, 0.012, 0.006, 22, 0xcbd6cf);
        for (var gz = -8; gz <= 14; gz += 2) box(18, 0.004, gz, 76, 0.006, 0.012, 0xcbd6cf);
        [-18, -6, 6, 18, 30, 42, 54].forEach(function (x) {
          box(x, 2.75, -7.76, 0.24, 5.5, 0.25, 0xd2ded6);
          box(x, 5.35, 2.8, 0.19, 0.25, 21.4, 0xd6e0da);
        });
        [-12, 0, 12, 24, 36, 48].forEach(function (x, index) {
          var color = [COLORS.gold, COLORS.teal, COLORS.coral, COLORS.ink, COLORS.teal, COLORS.gold][index];
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
        [-12, 0, 12, 24, 36, 48].forEach(function (x, index) {
          var color = [COLORS.gold, COLORS.teal, COLORS.coral, COLORS.ink, COLORS.teal, COLORS.gold][index];
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

      architecture();
      var parts = ringExhibit(), objects = scaleExhibit(), tokens = occlusionExhibit(), parallax = parallaxExhibit();
      var contour = contourExhibit(), context = contextExhibit();
      S.walk = { ring: parts, blocks: objects, tokens: tokens, parallax: parallax, contour: contour,
        context: context.objects, contextSwitch: context.toggle, labels: parallaxLabels, panelLabels: panelLabels, solids: solids };
      S.target.set(0, EYE_Y, 0);
      S.fitPts = [];
    }

    function camera(THREE, S, data) {
      var player = data.player || {}, direction = cameraDirection(player);
      var x = clamp(number(player.x, -12), -20, 56), z = clamp(number(player.z, 9), -8, 14);
      S.camera.position.set(x, EYE_Y, z);
      S.camera.lookAt(new THREE.Vector3(x + direction.x, EYE_Y + direction.y, z + direction.z));
      S.camera.fov = ['parallax', 'contour', 'context'].indexOf(data.activity) >= 0
        ? Math.max(62, 2 * Math.atan(Math.tan(40 * Math.PI / 180) / S.camera.aspect) * 180 / Math.PI)
        : 62;
      S.camera.near = 0.04;
      S.camera.far = 100;
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
          solidCount: S.walk.solids.length, interactionRange: INTERACTION_RANGE, panelRange: PANEL_RANGE, inspectionRange: INSPECTION_RANGE,
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
      var range = /^parallax-[ABC]$/.test(id) ? INSPECTION_RANGE
        : /^(contour-[0-3]|context-[ABCD]|context-switch)$/.test(id) ? PANEL_RANGE : INTERACTION_RANGE;
      return id && hits[0].distance <= range ? { id: id, distance: hits[0].distance } : null;
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
    contourObjects: contourObjects, contextObjects: contextObjects, cameraDirection: cameraDirection };
}());
