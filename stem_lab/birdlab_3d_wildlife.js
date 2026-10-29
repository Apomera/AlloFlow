/* Small woodland residents, built locally for Three.js r128.
 * Fieldmarks/proportions: Cornell Lab, allaboutbirds.org/guide/american_robin/id
 * and allaboutbirds.org/guide/black-capped_chickadee/overview. Shared residents
 * cite their own fieldmarks in avian_woodland_birds.js.
 * Guided observations are seekable; free mode chooses short actions at runtime.
 * Both are illustrative rather than a validated ecological model.
 */
(function (global) {
  'use strict';
  var TAU = Math.PI * 2, PERIOD = 44;
  function clamp(x) { return Math.max(0, Math.min(1, x)); }
  function smooth(x) { x = clamp(x); return x * x * x * (10 + x * (-15 + 6 * x)); }
  function pulse(t, start, duration) {
    var u = (t - start) / duration;
    return u > 0 && u < 1 ? Math.pow(Math.sin(Math.PI * u), 4) : 0;
  }

  function create(THREE, scene, options) {
    options = options || {};
    var detailed = options.quality !== 'low', disposed = false, resources = [], mode = 'guided', freeTime = 0;
    var height = typeof options.groundHeight === 'function' ? options.groundHeight : function () { return 0; };
    var blocked = typeof options.isBlocked === 'function' ? options.isBlocked : function () { return false; };
    var root = new THREE.Group(); root.name = 'birdlab-woodland-residents'; scene.add(root);
    function keep(value) { resources.push(value); return value; }
    function color(hex) { return new THREE.Color(hex).convertSRGBToLinear(); }
    function material(hex, extra) {
      return keep(new THREE.MeshStandardMaterial(Object.assign({ color: color(hex), roughness: .91 }, extra || {})));
    }
    function featherGrain(mat, individualVanes) {
      mat.extensions = Object.assign({}, mat.extensions, { derivatives: true });
      mat.onBeforeCompile = function (shader) {
        shader.vertexShader = 'varying vec2 blResidentUV;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nblResidentUV = uv;');
        shader.fragmentShader = 'varying vec2 blResidentUV;\n' + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', [
          '#include <color_fragment>',
          individualVanes ? 'vec2 blCell = vec2(blResidentUV.x - .5, blResidentUV.y);' :
            'float blRow = floor(blResidentUV.y * 32.0);\nvec2 blCell = vec2(fract(blResidentUV.x * 28.0 + mod(blRow, 2.0) * .5) - .5, fract(blResidentUV.y * 32.0));',
          individualVanes ? 'float blBarbPhase = blCell.y * 389.5575 - abs(blCell.x) * 30.0;' :
            'float blBarbPhase = blCell.y * 37.6991 + abs(blCell.x) * 10.0;',
          // Derivative filtering lets the tiny vane strokes fade at a distance.
          'float blDetail = 1.0 - smoothstep(.7, 2.8, fwidth(blBarbPhase));',
          'float blBarbs = cos(blBarbPhase) * blDetail;',
          individualVanes ? 'float blOverlap = (1.0 - smoothstep(0.0, .13, blCell.y)) * .35;' :
            'float blOverlap = smoothstep(.66, 1.0, blCell.y) * (1.0 - smoothstep(.27, .5, abs(blCell.x)));',
          'diffuseColor.rgb *= 1.0 + blBarbs * .023 - blOverlap * .035;',
          individualVanes ? 'float blRelief = blBarbs * .000012;' : 'float blRelief = blBarbs * .000025;'
        ].join('\n'));
        shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', [
          '#include <normal_fragment_maps>',
          'vec3 blSigmaX = dFdx(-vViewPosition), blSigmaY = dFdy(-vViewPosition);',
          'vec3 blR1 = cross(blSigmaY, normal), blR2 = cross(normal, blSigmaX);',
          'float blDet = dot(blSigmaX, blR1);',
          'if (abs(blDet) > 1e-12) normal = normalize(abs(blDet) * normal - sign(blDet) * (dFdx(blRelief) * blR1 + dFdy(blRelief) * blR2));'
        ].join('\n'));
      };
      mat.customProgramCacheKey = function () { return individualVanes ? 'birdlab-resident-vane-grain-v2' : 'birdlab-resident-contour-grain-v2'; };
      return mat;
    }
    var plumage = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .93, side: THREE.DoubleSide }));
    var contourMaterial = featherGrain(keep(plumage.clone()));
    var vaneMaterial = featherGrain(keep(plumage.clone()), true);
    var eye = material('#171714', { roughness: .29 });
    var legMaterial = material('#645346'), dark = material('#242725'), pale = material('#d8d7cb');
    var sphere = keep(new THREE.SphereGeometry(1, detailed ? 20 : 12, detailed ? 14 : 9));
    var stem = keep(new THREE.CylinderGeometry(1, 1, 1, 5, 1));
    var axis = new THREE.Vector3(0, 1, 0), delta = new THREE.Vector3();
    function ellipsoid(parent, name, mat, position, scale) {
      var mesh = new THREE.Mesh(sphere, mat); mesh.name = name;
      mesh.position.fromArray(position); mesh.scale.fromArray(scale); mesh.castShadow = true; parent.add(mesh); return mesh;
    }
    function rod(parent, name, mat, a, b, radius) {
      var mesh = new THREE.Mesh(stem, mat); mesh.name = name;
      mesh.position.set((a[0] + b[0]) * .5, (a[1] + b[1]) * .5, (a[2] + b[2]) * .5);
      delta.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      mesh.scale.set(radius, delta.length(), radius); mesh.quaternion.setFromUnitVectors(axis, delta.normalize());
      parent.add(mesh); return mesh;
    }
    function surfaceBuilder() { return { p: [], c: [], uv: [], indices: [], folds: [] }; }
    function vertex(data, x, y, z, c, u, v) {
      data.p.push(x, y, z); data.c.push(c.r, c.g, c.b);
      data.uv.push(u === undefined ? .5 : u, v === undefined ? 0 : v);
    }
    function finish(data, name, parent, materialOverride) {
      var geometry = keep(new THREE.BufferGeometry());
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.p, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(data.c, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(data.uv, 2));
      geometry.setIndex(data.indices); geometry.computeVertexNormals();
      if (data.folds.length) {
        geometry.attributes.position.setUsage(THREE.DynamicDrawUsage); geometry.attributes.normal.setUsage(THREE.DynamicDrawUsage);
        geometry.userData.nesting = { feathers: data.folds, source: new Float32Array(geometry.attributes.position.array),
          normals: new Float32Array(geometry.attributes.normal.array), fold: -1 };
        var radius = 0;
        data.folds.forEach(function (feather) {
          var rootRadius = Math.max(Math.hypot.apply(Math, feather.root), Math.hypot.apply(Math, feather.closed.root));
          for (var i = feather.first; i < feather.first + feather.count; i++) {
            radius = Math.max(radius, rootRadius + Math.hypot(data.p[i * 3] - feather.root[0], data.p[i * 3 + 1] - feather.root[1], data.p[i * 3 + 2] - feather.root[2]));
          }
        });
        // Every rotated vertex stays within root distance + shaft distance,
        // including all intermediate poses, so culling never uses a stale fan.
        geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), radius + .001);
      }
      var mesh = new THREE.Mesh(geometry, materialOverride || vaneMaterial); mesh.name = name; mesh.castShadow = true; mesh.receiveShadow = true;
      parent.add(mesh); return mesh;
    }
    function nestFeathers(mesh, fold) {
      var g = mesh.geometry, nesting = g.userData.nesting;
      if (!nesting || nesting.fold === fold) return;
      var p = g.attributes.position.array, n = g.attributes.normal.array, source = nesting.source, normals = nesting.normals;
      if (fold === 0) { p.set(source); n.set(normals); }
      else nesting.feathers.forEach(function (feather) {
        var angle = feather.closed.turn * fold, cs = Math.cos(angle), sn = Math.sin(angle), tilt = feather.closed.tilt * fold;
        var ct = Math.cos(tilt), st = Math.sin(tilt), a = feather.root, b = feather.closed.root;
        var rootX = a[0] + (b[0] - a[0]) * fold, rootY = a[1] + (b[1] - a[1]) * fold, rootZ = a[2] + (b[2] - a[2]) * fold;
        for (var vertexIndex = feather.first; vertexIndex < feather.first + feather.count; vertexIndex++) {
          var i = vertexIndex * 3, x = source[i] - a[0], y = source[i + 1] - a[1], z = source[i + 2] - a[2];
          var turnedX = cs * x - sn * z, normalX = cs * normals[i] - sn * normals[i + 2];
          p[i] = rootX + ct * turnedX - st * y; p[i + 1] = rootY + st * turnedX + ct * y; p[i + 2] = rootZ + sn * x + cs * z;
          n[i] = ct * normalX - st * normals[i + 1]; n[i + 1] = st * normalX + ct * normals[i + 1]; n[i + 2] = sn * normals[i] + cs * normals[i + 2];
        }
      });
      nesting.fold = fold; g.attributes.position.needsUpdate = true; g.attributes.normal.needsUpdate = true;
    }
    function smoothSurfaceNormals(geometry) {
      // Sphere UVs duplicate the longitude seam and poles. Reconcile lighting
      // by physical position while keeping those UV seams and all shape intact.
      geometry.computeVertexNormals();
      var p = geometry.attributes.position, n = geometry.attributes.normal, index = geometry.index;
      var groups = Object.create(null), keys = [], a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
      for (var i = 0; i < p.count; i++) {
        var key = Math.round(p.getX(i) * 1e7) + ',' + Math.round(p.getY(i) * 1e7) + ',' + Math.round(p.getZ(i) * 1e7);
        keys.push(key); if (!groups[key]) groups[key] = new THREE.Vector3();
      }
      for (var face = 0; face < index.count; face += 3) {
        var ia = index.getX(face), ib = index.getX(face + 1), ic = index.getX(face + 2);
        a.fromBufferAttribute(p, ia); b.fromBufferAttribute(p, ib); c.fromBufferAttribute(p, ic);
        b.sub(a).cross(c.sub(a)); groups[keys[ia]].add(b); groups[keys[ib]].add(b); groups[keys[ic]].add(b);
      }
      Object.keys(groups).forEach(function (key) { groups[key].normalize(); });
      for (var i = 0; i < p.count; i++) { var normal = groups[keys[i]]; n.setXYZ(i, normal.x, normal.y, normal.z); }
    }
    // Cambered, tapered vanes share one retained mesh per tract; the narrow
    // central color strip is the rachis. Only folding rewrites these buffers.
    function feather(data, a, b, width, base, edging, closed) {
      var index = data.p.length / 3, dx = b[0] - a[0], dz = b[2] - a[2];
      var length = Math.hypot(dx, dz), nx = -dz / length, nz = dx / length, sections = detailed ? 7 : 4;
      for (var row = 0; row <= sections; row++) {
        var t = row / sections, breadth = width * (.28 + .72 * Math.sin(Math.PI * Math.pow(t, .76))) * (1 - .94 * Math.pow(t, 7));
        for (var col = 0; col < 5; col++) {
          var across = (col - 2) / 2, c = base.clone();
          c.lerp(edging, Math.abs(across) > .9 ? .21 : t > .85 ? .09 : .025);
          if (col === 2) c.multiplyScalar(.94);
          vertex(data, a[0] + dx * t + nx * breadth * across,
            a[1] + (b[1] - a[1]) * t + breadth * (1 - across * across) * .15,
            a[2] + dz * t + nz * breadth * across, c, (across + 1) * .5, t);
        }
        if (row < sections) for (var colIndex = 0; colIndex < 4; colIndex++) {
          var k = index + row * 5 + colIndex; data.indices.push(k, k + 5, k + 1, k + 1, k + 5, k + 6);
        }
      }
      if (closed) data.folds.push({ first: index, count: (sections + 1) * 5, root: a,
        closed: { root: closed.root, turn: closed.angle - Math.atan2(dz, dx), tilt: closed.tilt || 0 } });
    }
    function bodySurface(parent, chickadee) {
      var geometry = keep(new THREE.SphereGeometry(1, detailed ? 40 : 24, detailed ? 26 : 16));
      var p = geometry.attributes.position, colors = [], back = color(chickadee ? '#767c7b' : '#626460');
      var breast = color(chickadee ? '#d2c5a6' : '#a55932'), belly = color(chickadee ? '#dedac9' : '#d7ceba');
      function bodyPoint(x, y, z) {
        var taper = 1 - .12 * Math.max(0, z) - .08 * Math.max(0, -z);
        return new THREE.Vector3(x * .033 * taper, y * .041 * (1 - .10 * Math.max(0, y)), z * .064);
      }
      function bodyColor(y, z) {
        var c = back.clone().lerp(breast, smooth((-y + .4 - z * .44) * 1.45));
        return c.lerp(belly, smooth((-y - .35 + z * .48) * 1.7));
      }
      for (var i = 0; i < p.count; i++) {
        var x = p.getX(i), y = p.getY(i), z = p.getZ(i), point = bodyPoint(x, y, z), c = bodyColor(y, z);
        p.setXYZ(i, point.x, point.y, point.z);
        colors.push(c.r, c.g, c.b);
      }
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); smoothSurfaceNormals(geometry);
      var mesh = new THREE.Mesh(geometry, contourMaterial); mesh.name = 'contour-body'; mesh.castShadow = true; parent.add(mesh);
      // Short overlapping contour feathers break the ellipsoid outline without
      // adding hundreds of draws or a canvas-texture dependency.
      var tract = surfaceBuilder(), rows = detailed ? 14 : 8, columns = detailed ? 26 : 16;
      for (var row = 1; row < rows; row++) for (var col = 0; col < columns; col++) {
        var theta = Math.PI * row / rows, angle = TAU * (col + (row % 2) * .5) / columns;
        var index = tract.p.length / 3, sections = detailed ? 5 : 3;
        for (var section = 0; section <= sections; section++) {
          var along = section / sections, next = Math.min(Math.PI - .012, theta + along * .22);
          var breadth = (.60 + .40 * Math.sin(Math.PI * along)) * (1 - .97 * Math.pow(along, 3));
          for (var side = -1; side <= 1; side++) {
            var phi = angle + side * .115 * breadth, x = Math.sin(next) * Math.cos(phi), y = Math.sin(next) * Math.sin(phi), z = -Math.cos(next);
            var point = bodyPoint(x, y, z), normal = new THREE.Vector3(x / .033, y / .041, z / .064).normalize();
            var lift = .00016 + .00023 * Math.sin(Math.PI * along) * (1 - side * side);
            var c = bodyColor(y, z).multiplyScalar(.99 + .018 * Math.sin(row * 4.13 + col * 2.17));
            vertex(tract, point.x + normal.x * lift, point.y + normal.y * lift, point.z + normal.z * lift, c, (side + 1) * .5, along);
          }
          if (section < sections) for (var half = 0; half < 2; half++) {
            var k = index + section * 3 + half;
            tract.indices.push(k, k + 1, k + 3, k + 1, k + 4, k + 3);
          }
        }
      }
      finish(tract, 'overlapping-contour-feathers', parent);
    }
    // The cheek and bib are colors within the same feathered surface, avoiding
    // the separate raised white ovals that made the small residents look toy-like.
    function headSurface(parent, chickadee) {
      var charcoal = color(chickadee ? '#242825' : '#454942'), cheek = color('#dddacc'), throat = color('#bbb5a0');
      function headPoint(x, y, z) {
        var front = Math.max(0, -z), crown = Math.max(0, y);
        return new THREE.Vector3(x * .025 * (1 - .10 * front), y * .027 * (1 - .12 * crown), z * .029);
      }
      function headColor(x, y, z) {
        var c = charcoal.clone();
        if (chickadee) {
          var cheekMask = smooth((Math.abs(x) - .18) / .42) * smooth((.20 - y) / .13) * smooth((y + .77) / .20) * smooth((.72 - z) / .25);
          c.lerp(cheek, cheekMask);
        } else {
          var throatMask = smooth((-y - .36) / .32) * smooth((-z + .25) / .45);
          var streak = .62 + .23 * Math.cos(x * 37 + z * 7);
          c.lerp(throat, throatMask * streak);
        }
        return c;
      }
      var geometry = keep(new THREE.SphereGeometry(1, detailed ? 40 : 24, detailed ? 26 : 16));
      var p = geometry.attributes.position, colors = [];
      for (var i = 0; i < p.count; i++) {
        var x = p.getX(i), y = p.getY(i), z = p.getZ(i), point = headPoint(x, y, z), c = headColor(x, y, z);
        p.setXYZ(i, point.x, point.y, point.z); colors.push(c.r, c.g, c.b);
      }
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); smoothSurfaceNormals(geometry);
      var mesh = new THREE.Mesh(geometry, contourMaterial); mesh.name = 'head-plumage'; mesh.castShadow = true;
      mesh.userData.fieldmarks = chickadee ? ['black-cap', 'white-cheek', 'black-bib'] : ['dark-crown', 'streaked-throat']; parent.add(mesh);
      // Short recumbent crown and throat feathers follow the shaped surface.
      // One retained batch supplies tiny soft edges, rather than a spiky halo.
      var tract = surfaceBuilder(), rows = detailed ? 15 : 9, columns = detailed ? 24 : 16;
      for (var row = 1; row < rows; row++) for (var col = 0; col < columns; col++) {
        var theta = Math.PI * row / rows, angle = TAU * (col + .5 * (row % 2)) / columns;
        var s = Math.sin(theta), cy = Math.cos(theta), nx = s * Math.cos(angle), nz = s * Math.sin(angle);
        var point = headPoint(nx, cy, nz), normal = new THREE.Vector3(nx / .025, cy / .027, nz / .029).normalize();
        var endTheta = Math.min(Math.PI - .01, theta + .14), es = Math.sin(endTheta);
        var end = headPoint(es * Math.cos(angle), Math.cos(endTheta), es * Math.sin(angle));
        var side = new THREE.Vector3().crossVectors(new THREE.Vector3().subVectors(end, point), normal).normalize();
        var width = .0018 * Math.pow(s, .55), c = headColor(nx, cy, nz), first = tract.p.length / 3;
        var lift = .00010, crest = .00020;
        vertex(tract, point.x - side.x * width + normal.x * lift, point.y - side.y * width + normal.y * lift, point.z - side.z * width + normal.z * lift, c, 0, 0);
        vertex(tract, point.x + normal.x * crest, point.y + normal.y * crest, point.z + normal.z * crest, c.clone().multiplyScalar(1.018), .5, 0);
        vertex(tract, point.x + side.x * width + normal.x * lift, point.y + side.y * width + normal.y * lift, point.z + side.z * width + normal.z * lift, c, 1, 0);
        vertex(tract, end.x + normal.x * .00013, end.y + normal.y * .00013, end.z + normal.z * .00013, c.clone().multiplyScalar(.98), .5, 1);
        tract.indices.push(first, first + 1, first + 3, first + 1, first + 2, first + 3);
      }
      finish(tract, 'crown-and-throat-feathers', parent);
    }
    function makeBird(id, name, scientificName, x, z, phase, scale) {
      var chickadee = id === 'chickadee', bird = new THREE.Group(), body = new THREE.Group(), head = new THREE.Group();
      bird.name = 'woodland-' + id; bird.scale.setScalar(scale); root.add(bird); bird.add(body);
      body.position.y = .098; body.name = id + '-body'; body.add(head); head.position.set(0, .039, -.052); head.name = id + '-head';
      bodySurface(body, chickadee);
      var headMat = featherGrain(material(chickadee ? '#212624' : '#383c3b'));
      ellipsoid(head, 'nape-plumage', headMat, [0, -.020, .014], [.020, .021, .021]);
      headSurface(head, chickadee);
      if (!chickadee) {
        for (var side = -1; side <= 1; side += 2) {
          for (var arc = 0; arc < 2; arc++) {
            var eyeArc = new THREE.Mesh(keep(new THREE.TorusGeometry(.0043, .0006, 4, 10, 1.12)), pale);
            eyeArc.name = 'broken-eye-ring'; eyeArc.position.set(side * .0219, .006, -.0128);
            eyeArc.rotation.set(0, side * Math.PI / 2, .50 + arc * Math.PI); head.add(eyeArc);
          }
        }
      }
      for (var side = -1; side <= 1; side += 2) ellipsoid(head, 'eye', eye, [side * .0216, .006, -.013], [.0017, .0032, .0032]);
      var bill = keep(new THREE.ConeGeometry(1, 1, detailed ? 10 : 7)), beak = new THREE.Mesh(bill, chickadee ? dark : material('#bda257'));
      beak.name = 'tapered-bill'; beak.rotation.x = -Math.PI / 2;
      beak.scale.set(.0062, chickadee ? .019 : .029, .0046); beak.position.set(0, -.003, chickadee ? -.034 : -.039); head.add(beak);
      var wings = [], featherColor = color(chickadee ? '#555f63' : '#535856'), edgeColor = color(chickadee ? '#b4b6ac' : '#9b9b87');
      for (var side = -1; side <= 1; side += 2) {
        var wing = new THREE.Group(); wing.name = id + '-wing-' + side; wing.position.set(side * .027, .013, -.018); body.add(wing);
        var featherGroup = new THREE.Group(); featherGroup.scale.x = side; wing.add(featherGroup);
        var inner = surfaceBuilder();
        for (var i = 0; i < 9; i++) feather(inner, [.005 + i * .0062, .001, i * .001], [.012 + i * .006, -.003, .062 - i * .0027], .0085, featherColor, edgeColor,
          { root: [.003 + i * .0037, .001 + i * .00012, -.009 - i * .0014], angle: -.25 - i * .018, tilt: -.12 });
        for (var i = 0; i < 8; i++) feather(inner, [.004 + i * .007, .004, -.008], [.016 + i * .006, .004, .022], .009, featherColor.clone().multiplyScalar(1.05), edgeColor,
          { root: [.002 + i * .0045, .004 + i * .00014, -.003 - i * .001], angle: -.35 - i * .009, tilt: -.12 });
        var innerMesh = finish(inner, 'layered-secondaries', featherGroup);
        var wrist = new THREE.Group(); wrist.position.set(.058, 0, .002); featherGroup.add(wrist); wrist.name = 'wrist';
        var hand = surfaceBuilder();
        for (var i = 0; i < 9; i++) feather(hand, [.001 + i * .002, .001, i * .002], [.080 - i * .0045, -.001 - i * .0008, .010 + i * .006], .007, featherColor, edgeColor,
          { root: [.001 + i * .0014, .001 + i * .00012, -.004 - i * .0007], angle: -.10 - i * .007, tilt: -.22 });
        for (var i = 0; i < 5; i++) feather(hand, [i * .006, .004, -.002], [.032 + i * .005, .004, .019 + i * .003], .0065, featherColor, edgeColor,
          { root: [i * .0035, .004 + i * .00014, -.001 - i * .0007], angle: -.12 - i * .012, tilt: -.22 });
        var handMesh = finish(hand, 'layered-primaries', wrist);
        wings.push({ root: wing, wrist: wrist, side: side, meshes: [innerMesh, handMesh] });
      }
      var tail = new THREE.Group(); tail.position.set(0, .003, .052); body.add(tail); tail.name = id + '-tail';
      var rectrices = surfaceBuilder();
      for (var i = 0; i < 12; i++) feather(rectrices, [(i - 5.5) * .0014, 0, 0], [(i - 5.5) * .004, -.001, .075 - Math.abs(i - 5.5) * .0008], .0051, featherColor, edgeColor);
      finish(rectrices, 'individual-tail-feathers', tail);
      var feet = [], legs = [];
      for (var side = -1; side <= 1; side += 2) {
        var foot = new THREE.Group(); foot.position.set(side * .015, 0, -.002); foot.name = id + '-foot-' + side; bird.add(foot); feet.push(foot);
        rod(foot, 'tarsus', legMaterial, [0, .003, 0], [0, .039, .008], .0016);
        legs.push(rod(foot, 'feathered-thigh', headMat, [0, .039, .008], [0, .069, .010], .0042));
        for (var toe = -1; toe <= 1; toe++) rod(foot, 'forward-toe', legMaterial, [0, .003, 0], [toe * .007, .002, -.018 + Math.abs(toe) * .004], .0009);
        rod(foot, 'hind-toe', legMaterial, [0, .003, 0], [0, .002, .012], .0009);
      }
      return { id: id, name: name, scientificName: scientificName, root: bird, body: body, head: head, wings: wings, tail: tail, feet: feet,
        originX: x, originZ: z, phase: phase, scale: scale, baseYaw: chickadee ? -.82 : .46, behavior: 'Scanning', altitude: 0 };
    }
    // With the shared factory the robin and chickadee use its feathered anatomy;
    // the local builder remains for hosts that load an older factory.
    var factory = global.AvianWoodlandBirds;
    var sharedRobinChickadee = !!(factory && factory.supports('mourningDove') && factory.supports('grouse') &&
      factory.supports('americanRobin') && factory.supports('blackCappedChickadee'));
    var birds = sharedRobinChickadee ? [] : [makeBird('robin', 'American robin', 'Turdus migratorius', 1.65, -.75, 0, 1),
      makeBird('chickadee', 'Black-capped chickadee', 'Poecile atricapillus', -1.45, 1.3, 7.3, .57)];
    // Both labs instantiate this same species factory. Only the observation
    // course belongs here; threat response belongs to Raptor Lab's controller.
    var sharedBirds = [];
    // Guided flight height, wingbeat rate and feeding times for the hopping
    // songbirds; they also take the cardinal's paired-hop ground course.
    var RESIDENT_TUNING = {
      robin: {lift: .47, beat: 6.4, forage: [7.1, 9.1]},
      chickadee: {lift: .36, beat: 8.0, forage: [5.4, 7.2], hop: true},
      darkEyedJunco: {lift: .40, beat: 7.2, forage: [10.6, 12.1], hop: true},
      tuftedTitmouse: {lift: .42, beat: 7.0, forage: [9.2, 10.9], hop: true},
      easternTowhee: {lift: .34, beat: 6.2, forage: [6.4, 8.0], hop: true},
      americanGoldfinch: {lift: .52, beat: 7.6, forage: [8.2, 10.0], hop: true},
      easternBluebird: {lift: .58, beat: 6.8, forage: [10.5, 12.3], hop: true},
      whiteThroatedSparrow: {lift: .32, beat: 7.0, forage: [5.6, 7.2], hop: true}
    };
    function addSharedBird(id, name, scientific, x, z, yaw, course, factoryId) {
      var catalog = global.StemSimAssets, nativeId = factoryId || id;
      var model = nativeId === 'mourningDove' && catalog && catalog.version === '1.0.0' && typeof catalog.available === 'function' && typeof catalog.create === 'function' && catalog.available('animal.mourning-dove', '1.0.0')
        ? catalog.create(THREE, 'animal.mourning-dove', '1.0.0', {quality: detailed ? 'high' : 'low'})
        : global.AvianWoodlandBirds.create(THREE, nativeId, {quality: detailed ? 'high' : 'low'});
      model.root.name = 'woodland-' + id; root.add(model.root);
      var resident = {id:id, name:name, scientificName:scientific, root:model.root, body:model.body,
        model:model, originX:x, originZ:z, baseYaw:yaw, course:course, behavior:'Scanning', altitude:0,
        footRest:model.feet.map(function(foot){return [foot.position.x,foot.position.y,foot.position.z];}),
        footModel:model.feet.map(function(foot){return [foot.position.x,foot.position.y,foot.position.z,foot.rotation.x,foot.rotation.y,foot.rotation.z];}),
        footTargets:[{x:0,y:0,z:0,swing:-1},{x:0,y:0,z:0,swing:-1}],
        hopSample:{},
        pose:{flight:0, phase:0, effort:0, bank:0, lookYaw:0, lookPitch:0, peck:0, stride:0, walking:0, tailSpread:0, landing:0, footTargets:null}};
      sharedBirds.push(resident);
    }
    if (global.AvianWoodlandBirds && global.AvianWoodlandBirds.supports('mourningDove') && global.AvianWoodlandBirds.supports('grouse')) {
      // Robin and chickadee lead the resident list, so every free-roam seed holds.
      // The robin keeps its former running course; local models faced -Z, hence +PI.
      if (sharedRobinChickadee) {
        addSharedBird('robin', 'American robin', 'Turdus migratorius', 1.65, -.75, .46 + Math.PI, [
          {start:2.7,end:3.35,x:.10,z:-.09,kind:'ground'},
          {start:4.2,end:4.8,x:.18,z:-.16,kind:'ground'},
          {start:13.7,end:14.9,x:.44,z:.08,kind:'flight'},
          {start:22.1,end:22.7,x:.32,z:.14,kind:'ground'},
          {start:24.2,end:24.8,x:.21,z:.12,kind:'ground'},
          {start:32,end:33.15,x:0,z:0,kind:'flight'}
        ], 'americanRobin');
        addSharedBird('chickadee', 'Black-capped chickadee', 'Poecile atricapillus', -1.45, 1.3, -.82 + Math.PI, [
          {start:3.0,end:3.8,x:.08,z:.04,kind:'ground',hops:2},
          {start:11.0,end:11.9,x:.40,z:.30,kind:'flight'},
          {start:19.0,end:19.8,x:.34,z:.26,kind:'ground',hops:2},
          {start:30.5,end:31.4,x:0,z:0,kind:'flight'}
        ], 'blackCappedChickadee');
      }
      addSharedBird('mourningDove', 'Mourning dove', 'Zenaida macroura', -.7, -1.6, -.65, [
        {start:3.8,end:6.2,x:.18,z:.04,kind:'ground'},
        {start:12,end:13.4,x:2.05,z:-.28,kind:'flight'},
        {start:21,end:23.5,x:1.88,z:-.18,kind:'ground'},
        {start:29.5,end:31.1,x:0,z:0,kind:'flight'}
      ]);
      addSharedBird('grouse', 'Ruffed grouse', 'Bonasa umbellus', 2.0, 1.55, -1.1, [
        {start:5,end:8.2,x:-.24,z:.02,kind:'ground'},
        {start:18,end:19.1,x:-1.55,z:.22,kind:'flight'},
        {start:25,end:28,x:-1.37,z:.12,kind:'ground'},
        {start:34,end:35.2,x:0,z:0,kind:'flight'}
      ]);
      if (global.AvianWoodlandBirds.supports('blueJay')) addSharedBird('blueJay', 'Blue jay', 'Cyanocitta cristata', -1.8, 1.2, .7, [
        {start:7,end:9.4,x:.18,z:.08,kind:'ground'},
        {start:15,end:16.8,x:1.55,z:.40,kind:'flight'},
        {start:23,end:25.5,x:1.36,z:.36,kind:'ground'},
        {start:32,end:34,x:0,z:0,kind:'flight'}
      ]);
      // Append residents so existing species retain their deterministic seeds.
      if (global.AvianWoodlandBirds.supports('northernCardinal')) addSharedBird('northernCardinal', 'Northern cardinal', 'Cardinalis cardinalis', -.35, 2.45, .35, [
        {start:4.4,end:5.8,x:.17,z:.08,kind:'ground',hops:2},
        {start:13,end:14.2,x:1.18,z:-.30,kind:'flight'},
        {start:22,end:23.4,x:1.34,z:-.30,kind:'ground',hops:2},
        {start:31,end:32.3,x:0,z:0,kind:'flight'}
      ]);
      if (global.AvianWoodlandBirds.supports('darkEyedJunco')) addSharedBird('darkEyedJunco', 'Dark-eyed junco', 'Junco hyemalis', .85, -1.35, -.5, [
        {start:3.2,end:4.5,x:.16,z:.06,kind:'ground',hops:2},
        {start:16.5,end:17.6,x:.30,z:1.0,kind:'flight'},
        {start:26,end:27.3,x:.26,z:.93,kind:'ground',hops:2},
        {start:37,end:38.1,x:0,z:0,kind:'flight'}
      ]);
      if (global.AvianWoodlandBirds.supports('tuftedTitmouse')) addSharedBird('tuftedTitmouse', 'Tufted titmouse', 'Baeolophus bicolor', 1.15, .95, 2.4, [
        {start:6,end:7.2,x:-.14,z:.07,kind:'ground',hops:2},
        {start:20.2,end:21.4,x:-.95,z:.45,kind:'flight'},
        {start:28.6,end:29.8,x:-.81,z:.39,kind:'ground',hops:2},
        {start:34.5,end:35.7,x:0,z:0,kind:'flight'}
      ]);
      // The towhee rakes the litter with backward double-scratch hops.
      if (global.AvianWoodlandBirds.supports('easternTowhee')) addSharedBird('easternTowhee', 'Eastern towhee', 'Pipilo erythrophthalmus', -2.0, .35, 1.2, [
        {start:2.6,end:3.9,x:.10,z:.05,kind:'ground',hops:2},
        {start:14.6,end:15.6,x:1.15,z:-.30,kind:'flight'},
        {start:24.5,end:25.8,x:1.01,z:-.25,kind:'ground',hops:2},
        {start:33.5,end:34.5,x:0,z:0,kind:'flight'}
      ]);
      // Append newcomers to preserve the existing residents' deterministic seeds.
      // These seekable clearing visits illustrate movement, not habitat or cadence data.
      if (global.AvianWoodlandBirds.supports('americanGoldfinch')) addSharedBird('americanGoldfinch', 'American goldfinch', 'Spinus tristis', .45, 1.55, -1.15, [
        {start:4.8,end:6.1,x:.13,z:.06,kind:'ground',hops:2},
        {start:17.4,end:18.65,x:-.62,z:.60,kind:'flight'},
        {start:27.2,end:28.5,x:-.49,z:.54,kind:'ground',hops:2},
        {start:36,end:37.25,x:0,z:0,kind:'flight'}
      ]);
      if (global.AvianWoodlandBirds.supports('easternBluebird')) addSharedBird('easternBluebird', 'Eastern bluebird', 'Sialia sialis', 1.25, 2.05, -.7, [
        {start:6.6,end:7.8,x:-.14,z:.06,kind:'ground',hops:2},
        {start:21.6,end:23.0,x:-.80,z:.42,kind:'flight'},
        {start:29.6,end:30.8,x:-.66,z:.36,kind:'ground',hops:2},
        {start:38.2,end:39.6,x:0,z:0,kind:'flight'}
      ]);
      if (global.AvianWoodlandBirds.supports('whiteThroatedSparrow')) addSharedBird('whiteThroatedSparrow', 'White-throated sparrow', 'Zonotrichia albicollis', -1.15, -.15, 1.9, [
        {start:2.0,end:3.4,x:.14,z:-.04,kind:'ground',hops:2},
        {start:12.4,end:13.55,x:.75,z:-.45,kind:'flight'},
        {start:23.6,end:25.0,x:.61,z:-.41,kind:'ground',hops:2},
        {start:32.4,end:33.6,x:0,z:0,kind:'flight'}
      ]);
    }
    // Soft contact shadows. A songbird is far below the shadow map's texel, so
    // without these the residents float. One batched mesh keeps a single draw
    // call; each footprint follows its bird and fades as the bird takes off.
    var shadowBirds = birds.concat(sharedBirds), shadowSizes = [];
    root.updateMatrixWorld(true);
    shadowBirds.forEach(function (bird) {
      var box = new THREE.Box3().setFromObject(bird.root), size = box.getSize(new THREE.Vector3());
      shadowSizes.push({ halfWidth: Math.max(.012, size.x * .58), halfLength: Math.max(.02, size.z * .40) });
    });
    // One spare footprint lets the host ground another animal (the squirrel).
    var shadowCount = shadowBirds.length + 1, extraShadow = shadowBirds.length, shadowPositions = new Float32Array(shadowCount * 12);
    var shadowAlpha = new Float32Array(shadowCount * 4), shadowUv = new Float32Array(shadowCount * 8), shadowIndex = [];
    for (var shadowQuad = 0; shadowQuad < shadowCount; shadowQuad++) {
      shadowUv.set([-1, -1, 1, -1, 1, 1, -1, 1], shadowQuad * 8);
      var corner = shadowQuad * 4; shadowIndex.push(corner, corner + 2, corner + 1, corner, corner + 3, corner + 2);
    }
    var shadowGeometry = keep(new THREE.BufferGeometry());
    shadowGeometry.setAttribute('position', new THREE.BufferAttribute(shadowPositions, 3).setUsage(THREE.DynamicDrawUsage));
    shadowGeometry.setAttribute('uv', new THREE.BufferAttribute(shadowUv, 2));
    shadowGeometry.setAttribute('blShadowAlpha', new THREE.BufferAttribute(shadowAlpha, 1).setUsage(THREE.DynamicDrawUsage));
    shadowGeometry.setIndex(shadowIndex);
    var shadowMaterial = keep(new THREE.MeshBasicMaterial({ color: 0x1b130c, transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    shadowMaterial.onBeforeCompile = function (shader) {
      shader.vertexShader = 'attribute float blShadowAlpha; varying float vBlShadowAlpha; varying vec2 vBlShadowUv;\n' +
        shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvBlShadowAlpha = blShadowAlpha; vBlShadowUv = uv;');
      shader.fragmentShader = 'varying float vBlShadowAlpha; varying vec2 vBlShadowUv;\n' +
        shader.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\nfloat blShadowFall = 1. - smoothstep(.0, 1., length(vBlShadowUv));\ndiffuseColor.a *= pow(blShadowFall, 1.25) * vBlShadowAlpha;');
    };
    shadowMaterial.customProgramCacheKey = function () { return 'birdlab-resident-contact-shadow-v1'; };
    var contactShadows = new THREE.Mesh(shadowGeometry, shadowMaterial);
    contactShadows.name = 'resident-contact-shadows'; contactShadows.frustumCulled = false; contactShadows.renderOrder = 1;
    root.add(contactShadows);
    function writeShadow(index, x, z, yaw, halfWidth, halfLength, altitude, strength) {
      var y = height(x, z) + .003, spread = 1 + altitude * 2.2, w = halfWidth * spread, l = halfLength * spread;
      var c = Math.cos(yaw), sn = Math.sin(yaw), corners = [[-w, -l], [w, -l], [w, l], [-w, l]];
      for (var k = 0; k < 4; k++) {
        var cx = corners[k][0], cz = corners[k][1], at = index * 12 + k * 3;
        shadowPositions[at] = x + cx * c + cz * sn; shadowPositions[at + 1] = y; shadowPositions[at + 2] = z - cx * sn + cz * c;
        shadowAlpha[index * 4 + k] = strength * Math.exp(-altitude / .16);
      }
    }
    function updateContactShadows() {
      shadowBirds.forEach(function (bird, index) {
        var size = shadowSizes[index];
        writeShadow(index, bird.root.position.x, bird.root.position.z, bird.root.rotation.y, size.halfWidth, size.halfLength, Math.max(0, bird.altitude || 0), .78);
      });
      shadowGeometry.attributes.position.needsUpdate = true; shadowGeometry.attributes.blShadowAlpha.needsUpdate = true;
    }
    // Pass null to hide the spare footprint.
    function setExtraContactShadow(spec) {
      if (disposed) return;
      if (spec && [spec.x, spec.z, spec.heading, spec.halfWidth, spec.halfLength].every(Number.isFinite)) writeShadow(extraShadow, spec.x, spec.z, spec.heading, spec.halfWidth, spec.halfLength, 0, .7);
      else shadowAlpha.fill(0, extraShadow * 4, extraShadow * 4 + 4);
      shadowGeometry.attributes.position.needsUpdate = true; shadowGeometry.attributes.blShadowAlpha.needsUpdate = true;
    }
    function sampleCardinalHop(bird,move,u,startX,startZ) {
      var out=bird.hopSample,hops=move.hops||2,index=Math.min(hops-1,Math.floor(u*hops));
      var local=clamp(u*hops-index),air=clamp((local-.18)/.47);
      // A paired-foot hop has a planted preparation and landing hold. Travel
      // happens only in the air; every join has zero velocity/acceleration.
      var progress=(index+smooth(air))/hops,arc=smooth(air/.45)*smooth((1-air)/.55);
      var crouch=local<.18?.0045*pulse(local,0,.18):.0035*pulse(local,.65,.35);
      out.x=startX+(move.x-startX)*progress;out.z=startZ+(move.z-startZ)*progress;
      // Recovery ends before the landing arc does. The feet can unfold and
      // aim at their next contact while there is still room below the body.
      var recovery=arc*(1-smooth((air-.48)/.32));
      out.lift=.047*arc-crouch;out.tuck=.0055*recovery;out.crouch=crouch;out.gait=arc;
      out.swing=local>.18&&local<.65?air:-1;out.phase=local;
      return out;
    }
    // Calls cued by the sound layer, on a clock that stops with the scene.
    // The posture rises just before the first syllable; the bill opens with
    // each one, wider for higher notes. Uncued birds keep their poses.
    var songClock=0;
    function cueSong(id,notes,delay){
      var bird=sharedBirds.filter(function(entry){return entry.id===id;})[0];
      if(disposed||!bird||id==='mourningDove'||!Array.isArray(notes))return false;
      var start=songClock+(Number.isFinite(delay)?Math.max(0,delay):0),list=[],end=start;
      notes.forEach(function(note){
        var on=Number(note&&note.on),dur=Number(note&&note.dur);
        if(!Number.isFinite(on)||!Number.isFinite(dur)||dur<=0)return;
        list.push({on:start+on,dur:dur,freq:Number(note.freq)||2500,trill:Number(note.trill)||0});end=Math.max(end,start+on+dur);
      });
      if(!list.length)return false;
      bird.song={start:start,end:end,notes:list};
      return true;
    }
    function songPose(bird){
      var song=bird.song,now=songClock;
      if(now>song.end+.45){bird.song=null;return {song:0,gape:0};}
      var open=0;
      song.notes.forEach(function(note){
        if(now<note.on||now>note.on+note.dur+.06)return;
        var amount=smooth((now-note.on)/.035)*smooth((note.on+note.dur+.06-now)/.06)*(.45+.45*clamp((note.freq-1200)/3800));
        if(note.trill)amount*=.78+.22*Math.sin(TAU*note.trill*(now-note.on));
        open=Math.max(open,amount);
      });
      return {song:smooth((now-song.start+.22)/.22)*(1-smooth((now-song.end-.05)/.4)),gape:open};
    }
    function updateSharedBird(bird, time) {
      var autonomous = mode === 'free', t = autonomous ? bird.free.elapsed : ((time % PERIOD) + PERIOD) % PERIOD;
      var grouse = bird.id === 'grouse', jay = bird.id === 'blueJay', cardinal = bird.id === 'northernCardinal';
      var extra = RESIDENT_TUNING[bird.id] || null, hopper = cardinal || !!(extra && extra.hop);
      var course = autonomous ? bird.free.course : bird.course;
      var x=0,z=0,lift=0,opening=0,walking=0,stride=0,bank=0,pitch=0,yaw=bird.baseYaw,behavior='Scanning';
      var effort=grouse?.86:.72,tailFan=0,landing=0,scanReady=1,groundMove=null,groundU=0,startX=0,startZ=0,freeFlight=null;
      var hop=null,cardinalFlightMove=null;
      for (var i=0;i<course.length;i++) {
        var move=course[i], previousX=i?course[i-1].x:0,previousZ=i?course[i-1].z:0;
        var preparation=autonomous?move.start:.42;
        if(cardinal&&move.kind==='flight'&&t>=move.start-.16&&t<move.end+.52)cardinalFlightMove=move;
        if(t>=move.end){x=move.x;z=move.z;}
        if(t>move.start-preparation && t<move.end+.42) {
          var turn=smooth((t-move.start+preparation)/preparation)*smooth((move.end+.42-t)/.42);
          var heading=Math.atan2(move.x-previousX,move.z-previousZ);
          yaw += Math.atan2(Math.sin(heading-yaw),Math.cos(heading-yaw))*turn;
          var u=clamp((t-move.start)/(move.end-move.start));
          var approach=move.kind==='flight'?smooth((u-.55)/.30):0;
          if(move.kind==='flight') {
            if(cardinal)cardinalFlightMove=move;
            effort=(grouse?.91:.84)-(grouse?.12:.24)*smooth(u/.42)+.12*approach;
            tailFan=(grouse?.20:.10)+(grouse?.52:.29)*approach;
            // Extend the feet before contact while the wings still flare.
            // Keep the feet planted until the independent wing fold finishes.
            landing=smooth((u-.65)/.23)*(1-smooth((t-move.end-.12)/.20));
            // Keep the sightline quiet through contact and wing closure, then
            // resume scanning before this existing settling interval ends.
            var approachHold=smooth((u-.55)/.25);
            scanReady=1-approachHold*(1-smooth((t-move.end-.12)/.30));
          }
          if(t>=move.start && t<=move.end) {
            var progress=smooth(u);x=previousX+(move.x-previousX)*progress;z=previousZ+(move.z-previousZ)*progress;
            if(move.kind==='flight') {
              // A quick, rounded climb leads into a longer approach. Unlike a
              // sine arc, both the lift and its acceleration join the floor.
              var crest=grouse?.40:.43,arc=smooth(u/crest)*smooth((1-u)/(1-crest));
              var climb=1-smooth(u/.45);
              lift=arc*(extra?extra.lift:grouse?.48:cardinal?.46:.68);z+=arc*(grouse?.035:.055);
              bank=-(grouse?.095:.14)*Math.sin(TAU*u)*arc;
              pitch=arc*(-.13*climb+.055*(1-climb)-.18*approach);
              behavior=u<.18?'Taking flight':u>.78?'Alighting':grouse?'Short woodland flight':'Flying across the clearing';
            } else if(hopper) {
              hop=sampleCardinalHop(bird,move,u,previousX,previousZ);
              x=hop.x;z=hop.z;lift=hop.lift;walking=hop.gait;
              scanReady=1-smooth(u/.10)*smooth((1-u)/.10);
              behavior=hop.swing>=0?'Hopping and searching':'Checking the ground';
            } else {
              walking=smooth(u/.12)*smooth((1-u)/.12);stride=autonomous?Math.PI*move.steps*u:TAU*3*u;
              groundMove=move;groundU=u;startX=previousX;startZ=previousZ;
              behavior='Walking and searching';
            }
          }
          if(move.kind==='flight') opening=smooth((t-move.start+.08)/.24)*smooth((move.end+.12-t)/.26);
        }
        if(autonomous && t>=move.end) yaw=Math.atan2(move.x-previousX,move.z-previousZ);
      }
      if(autonomous&&course.length&&course[0].kind==='flight') {
        if(cardinal)cardinalFlightMove=course[0];
        freeFlight=sampleFreeFlight(bird,course[0],t);
        x=freeFlight.x;z=freeFlight.z;lift=freeFlight.lift;yaw=freeFlight.yaw;
        opening=freeFlight.opening;pitch=freeFlight.pitch;bank=freeFlight.bank;
        effort=freeFlight.effort;tailFan=freeFlight.tailFan;landing=freeFlight.landing;
        scanReady=freeFlight.scanReady;
        behavior=freeFlight.airborne?(freeFlight.u<.18?'Taking flight':freeFlight.u>.78?'Alighting':grouse?'Short woodland flight':'Flying across the clearing'):'Scanning';
      }
      var pivot=autonomous&&course.length&&course[0].turnSteps&&t<course[0].turnDuration?course[0]:null;
      if(pivot) {
        // Reorient with short alternating steps. The supporting ankle and
        // toes retain their world contact instead of skating with the torso.
        yaw=bird.baseYaw+pivot.turnAngle*smooth(t/pivot.turnDuration);
        walking=smooth(t/.10)*smooth((pivot.turnDuration-t)/.10);
        stride=Math.PI*pivot.turnSteps*t/pivot.turnDuration;
        behavior='Turning to move';
      } else if(autonomous&&course.length&&t<course[0].start&&course[0].turnSteps)yaw=bird.free.heading;
      var forage=autonomous ? (bird.free.kind==='forage'?(bird.free.food?Math.max(pulse(t,.55,.7),pulse(t,1.5,.65),pulse(t,2.5,.7),pulse(t,3.45,.65),pulse(t,4.5,.7)):Math.max(pulse(t,.65,.8),pulse(t,1.85,.75))):0) :
        Math.max(pulse(t,extra?extra.forage[0]:grouse?10.1:jay?10.4:8.1,.86),pulse(t,extra?extra.forage[1]:grouse?12.2:jay?11.8:9.5,.72),pulse(t,38.2,.9),pulse(t,40.2,.8));
      var peck=(hop?0:1)*(1-walking)*(1-opening)*forage;
      var pose=bird.pose;
      pose.flight=opening;pose.phase=autonomous?TAU*((extra?extra.beat:grouse?8.5:jay?5.8:cardinal?6.4:6.8)*freeTime+bird.free.beatOffset+(freeFlight?freeFlight.beat:0)):TAU*(extra?extra.beat:grouse?8.5:jay?5.8:cardinal?6.4:6.8)*t;pose.effort=effort;pose.bank=bank;
      pose.lookYaw=scanReady*(1-opening)*(1-peck)*(1-walking)*residentGaze(bird,scanYaw(autonomous?freeTime%PERIOD:t));
      pose.lookPitch=-pitch*.82;pose.peck=peck;pose.stride=stride;pose.walking=walking;
      pose.tailSpread=opening*tailFan;pose.landing=landing;
      // The shared cardinal rig coordinates the chest, stable head, tail and
      // paired feet inside the existing route without altering its timing.
      if(hopper)pose.hopPhase=hop?hop.phase:-1;
      if(cardinal) {
        // Wings prepare before departure, but the toes still support the
        // bird. Separate that opening from actual airborne leg gathering.
        // These analytic loads compress the rig over fixed soles, leaving
        // the seeded route, takeoff time and continuous wingbeat untouched.
        pose.launchLoad=cardinalFlightMove?pulse(t,cardinalFlightMove.start-.16,.30):0;
        pose.landingLoad=cardinalFlightMove?pulse(t,cardinalFlightMove.end,.32):0;
        pose.flightTuck=cardinalFlightMove?smooth((t-cardinalFlightMove.start)/.20)*(1-landing)*smooth((cardinalFlightMove.end-t)/.12):0;
        pose.landingReach=cardinalFlightMove?pulse(t,cardinalFlightMove.start+(cardinalFlightMove.end-cardinalFlightMove.start)*.64,
          (cardinalFlightMove.end-cardinalFlightMove.start)*.36):0;
        // A brief settling hold lets the crest and tail relax after the wings
        // close. Both ends have zero velocity/acceleration, within the existing
        // action's recovery time, with the toes and route left untouched.
        var afterContact=cardinalFlightMove?t-cardinalFlightMove.end:-1;
        pose.landingSettle=smooth(afterContact/.10)*(1-smooth((afterContact-.10)/.42));
        // Once the feet take the load, release the last active stroke into
        // a quiet fold. Retain the running phase so the next flight never
        // restarts a beat; the quintic envelope also preserves both joins.
        pose.effort*=1-smooth(afterContact/.08);
      }
      var grooming=autonomous?preenAmount(bird.free):0;
      if(autonomous&&(bird.free.kind==='freeze'||bird.free.kind==='mob')) {
        var still=smooth(t/.25);
        pose.lookYaw*=1-still;pose.lookPitch+=(-.24-pose.lookPitch)*still;
      }
      pose.preen=grooming;pose.preenSide=autonomous?bird.free.preenSide:1;
      var singing=0;
      if(bird.song) {
        var sung=songPose(bird);pose.song=sung.song;pose.gape=grouse?0:sung.gape;pose.drum=grouse?sung.gape:0;
        if(grouse)pose.tailSpread=Math.max(pose.tailSpread,sung.song*.8);
        singing=opening>0||walking>0||peck>0||landing>0||grooming>0?0:sung.song;
      }
      if(cardinal&&autonomous) {
        var attention=cardinalAttention(bird,freeTime);
        // Let the gaze settle before a hop, takeoff or bill stroke. Observer
        // vigilance retains its established bearing as this quiet scan fades.
        var quietLook=scanReady*(1-opening)*(1-peck)*(1-walking)*(1-grooming)*(1-smooth(bird.free.alertness/.30));
        if(hop)quietLook*=1-smooth(hop.phase/.18)*(1-smooth((hop.phase-.65)/.35));
        if(cardinalFlightMove)quietLook*=1-smooth((t-cardinalFlightMove.start+.16)/.16)+smooth((t-cardinalFlightMove.end)/.38);
        if(quietLook>0) {
          pose.lookYaw+=quietLook*(1-smooth(bird.free.alertness/.6)*.88)*(attention.yaw-scanYaw(freeTime%PERIOD));
          pose.lookPitch+=quietLook*attention.pitch;
        }
      }
      // Short separated bill strokes leave quiet holds between feather checks.
      // The action envelope returns the neck before another step or takeoff.
      pose.preenStroke=grooming?pulse((t-.72)% .76,0,.44):0;
      pose.footTargets=groundMove||pivot||hop?bird.footTargets:null;
      if(hop) {
        var hopCos=Math.cos(yaw),hopSin=Math.sin(yaw);
        for(var hopFoot=0;hopFoot<2;hopFoot++) {
          var hopTarget=bird.footTargets[hopFoot],hopRest=bird.footRest[hopFoot];
          var hopX=bird.originX+x+hopCos*hopRest[0]+hopSin*hopRest[2];
          var hopZ=bird.originZ+z-hopSin*hopRest[0]+hopCos*hopRest[2];
          hopTarget.x=hopRest[0];hopTarget.z=hopRest[2];hopTarget.yaw=0;hopTarget.swing=hop.swing;
          // The torso compresses over planted soles, then both feet travel
          // with the root and tuck together during the airborne interval.
          hopTarget.y=hopRest[1]+height(hopX,hopZ)-height(bird.originX+x,bird.originZ+z)+hop.crouch+hop.tuck;
        }
      }
      if(pivot) {
        var turnU=clamp(t/pivot.turnDuration),turnCos=Math.cos(yaw),turnSin=Math.sin(yaw),ankleZ=bird.model.profile.ankleZ;
        for(var pivotFoot=0;pivotFoot<2;pivotFoot++) {
          var pivotTarget=bird.footTargets[pivotFoot],pivotRest=bird.footRest[pivotFoot],footTurn=0,pivotLift=0;
          pivotTarget.swing=-1;
          for(var pivotStep=pivotFoot;pivotStep<pivot.turnSteps;pivotStep+=2) {
            var pivotStart=pivotStep/pivot.turnSteps,pivotEnd=(pivotStep+1)/pivot.turnSteps;
            var turnLanding=pivotStep>=pivot.turnSteps-2?1:smooth((pivotStep+1.5)/pivot.turnSteps);
            if(turnU<pivotStart)break;
            if(turnU>=pivotEnd){footTurn=turnLanding;continue;}
            var pivotSwing=(turnU-pivotStart)*pivot.turnSteps;
            footTurn+=(turnLanding-footTurn)*smooth(pivotSwing);pivotTarget.swing=pivotSwing;
            pivotLift=Math.pow(Math.sin(Math.PI*pivotSwing),2)*bird.model.profile.stepLift*.65;break;
          }
          var soleYaw=bird.baseYaw+pivot.turnAngle*footTurn,soleCos=Math.cos(soleYaw),soleSin=Math.sin(soleYaw);
          var ankleX=soleCos*pivotRest[0]+soleSin*(pivotRest[2]+ankleZ);
          var ankleForward=-soleSin*pivotRest[0]+soleCos*(pivotRest[2]+ankleZ);
          pivotTarget.x=turnCos*ankleX-turnSin*ankleForward;
          pivotTarget.z=turnSin*ankleX+turnCos*ankleForward-ankleZ;
          pivotTarget.y=pivotRest[1]+height(bird.originX+ankleX-soleSin*ankleZ,bird.originZ+ankleForward-soleCos*ankleZ)-height(bird.originX,bird.originZ)+pivotLift;
          pivotTarget.yaw=soleYaw-yaw;
        }
      }
      if(groundMove) {
        // Course footholds keep the support sole still while the body moves.
        // Supply the targets before shared anatomy articulates the lifted toes
        // and keeps each upper leg attached beneath the advancing body.
        var steps=autonomous?groundMove.steps:6,cosYaw=Math.cos(yaw),sinYaw=Math.sin(yaw);
        for(var footIndex=0;footIndex<2;footIndex++) {
          var target=bird.footTargets[footIndex],rest=bird.footRest[footIndex],footProgress=0,footLift=0;
          target.swing=-1;target.yaw=0;
          for(var step=footIndex;step<steps;step+=2) {
            var stepStart=step/steps,stepEnd=(step+1)/steps;
            var footLanding=step>=steps-2?1:smooth((step+1.5)/steps);
            if(groundU<stepStart)break;
            if(groundU>=stepEnd){footProgress=footLanding;continue;}
            var swing=(groundU-stepStart)*steps;
            footProgress+=(footLanding-footProgress)*smooth(swing);
            target.swing=swing;
            footLift=Math.pow(Math.sin(Math.PI*swing),2)*(grouse?.016:jay?.012:.011);break;
          }
          var dx=startX+(groundMove.x-startX)*footProgress-x,dz=startZ+(groundMove.z-startZ)*footProgress-z;
          target.x=rest[0]+cosYaw*dx-sinYaw*dz;
          target.z=rest[2]+sinYaw*dx+cosYaw*dz;
          var worldX=bird.originX+x+cosYaw*target.x+sinYaw*target.z;
          var worldZ=bird.originZ+z-sinYaw*target.x+cosYaw*target.z;
          target.y=rest[1]+height(worldX,worldZ)-height(bird.originX+x,bird.originZ+z)+footLift;
        }
      }
      // Restore the factory output before its pose cache runs. Terrain/stance
      // offsets must not accumulate when an identical time is sampled twice.
      for(var restoreIndex=0;restoreIndex<2;restoreIndex++) {
        var restored=bird.model.feet[restoreIndex],saved=bird.footModel[restoreIndex];
        restored.position.set(saved[0],saved[1],saved[2]);restored.rotation.set(saved[3],saved[4],saved[5]);
      }
      bird.model.update(pose);
      for(var saveIndex=0;saveIndex<2;saveIndex++) {
        var modelFoot=bird.model.feet[saveIndex],modelState=bird.footModel[saveIndex];
        modelState[0]=modelFoot.position.x;modelState[1]=modelFoot.position.y;modelState[2]=modelFoot.position.z;
        modelState[3]=modelFoot.rotation.x;modelState[4]=modelFoot.rotation.y;modelState[5]=modelFoot.rotation.z;
      }
      bird.root.position.set(bird.originX+x,height(bird.originX+x,bird.originZ+z)+lift,bird.originZ+z);
      bird.root.rotation.set(pitch,yaw,bank,'YXZ');bird.altitude=hopper?Math.max(0,lift):lift;
      if(!groundMove&&!pivot&&!hop) {
        for(var restingIndex=0;restingIndex<2;restingIndex++) {
          var restingFoot=bird.model.feet[restingIndex];
          var restingX=bird.originX+x+Math.cos(yaw)*restingFoot.position.x+Math.sin(yaw)*restingFoot.position.z;
          var restingZ=bird.originZ+z-Math.sin(yaw)*restingFoot.position.x+Math.cos(yaw)*restingFoot.position.z;
          restingFoot.position.y+=(height(restingX,restingZ)-height(bird.originX+x,bird.originZ+z))*(cardinal?1-pose.flightTuck:1-opening+opening*landing);
        }
      }
      bird.behavior=grooming>.02?'Preening shoulder feathers':peck>.08?'Foraging':opening>.05 && lift===0?'Settling wings':singing>.3?(grouse?'Drumming':'Calling'):behavior;
    }
    var moves = [
      { start: 2.7, end: 3.35, x: .10, z: -.09, kind: 'ground' },
      { start: 4.2, end: 4.8, x: .18, z: -.16, kind: 'ground' },
      { start: 13.7, end: 14.9, x: .44, z: .08, kind: 'flight' },
      { start: 22.1, end: 22.7, x: .32, z: .14, kind: 'ground' },
      { start: 24.2, end: 24.8, x: .21, z: .12, kind: 'ground' },
      { start: 32.0, end: 33.15, x: 0, z: 0, kind: 'flight' }
    ];
    // Deliberate looks with quiet visual holds. The final hold matches the first
    // across the 44-second seam; quintic shifts keep gaze acceleration bounded.
    var scanShifts = [
      [1.1, 1.34, -.34], [3.9, 4.12, .19], [5.5, 5.78, .42], [8.2, 8.40, -.21],
      [10.3, 10.61, .12], [12.1, 12.32, -.30], [17.2, 17.49, .35], [19.7, 19.92, -.14],
      [21.0, 21.24, .03], [23.7, 23.94, .32], [26.0, 26.26, -.28], [28.0, 28.21, .19],
      [30.1, 30.37, -.38], [35.1, 35.4, .23], [38.0, 38.26, -.24], [40.7, 40.99, .08]
    ];
    function scanYaw(t) {
      var angle = .08;
      for (var i = 0; i < scanShifts.length; i++) {
        var shift = scanShifts[i];
        if (t < shift[0]) break;
        if (t < shift[1]) return angle + (shift[2] - angle) * smooth((t - shift[0]) / (shift[1] - shift[0]));
        angle = shift[2];
      }
      return angle;
    }
    function attentionHash(seed,index,channel) {
      var value=(seed^Math.imul(index+1,374761393)^Math.imul(channel+1,668265263))>>>0;
      value=Math.imul(value^(value>>>13),1274126177);
      return ((value^(value>>>16))>>>0)/4294967296;
    }
    function attentionPitch(seed,index) {
      var kind=attentionHash(seed,index,2),amount=attentionHash(seed,index,3);
      return kind<.36?.08+amount*.08:kind>.76?-.055-amount*.055:(amount-.5)*.045;
    }
    function cardinalAttention(bird,time) {
      var out=bird.free.attention,slot=Math.floor(time/4.6);
      if(out.slot!==slot) {
        out.slot=slot;
        out.fromYaw=slot?(.88*attentionHash(out.seed,slot-1,1)-.44):.08;
        out.fromPitch=slot?attentionPitch(out.seed,slot-1):0;
        out.toYaw=.88*attentionHash(out.seed,slot,1)-.44;
        out.toPitch=attentionPitch(out.seed,slot);
        out.start=slot*4.6+.75+1.45*attentionHash(out.seed,slot,4);
        out.duration=.30+.18*attentionHash(out.seed,slot,5);
      }
      // A separate hash channel leaves action selection and routes unchanged.
      // Most of each interval is a visual hold; shifts join it at zero speed
      // and acceleration, with no repeated 44-second observation timeline.
      var shift=smooth((time-out.start)/out.duration);
      out.yaw=out.fromYaw+(out.toYaw-out.fromYaw)*shift;
      out.pitch=out.fromPitch+(out.toPitch-out.fromPitch)*shift;
      return out;
    }
    // The action rig supplies smooth, anatomically bounded movements. This
    // separate controller chooses their timing and destinations from the current
    // scene, rather than looping a course or drawing random positions per frame.
    var residents = birds.concat(sharedBirds);
    residents.forEach(function(bird,index) {
      bird.guided = {x:bird.originX,z:bird.originZ,yaw:bird.baseYaw};
      bird.free = {seed:0,elapsed:0,duration:0,kind:'rest',course:[],cooldown:0,
        actionCount:0,alarmed:false,heading:0,index:index,alertness:0,watchYaw:0,
        observerX:0,observerZ:0,hasObserver:false,escapeArmed:true,quietTime:0,beatOffset:0,flightSample:{},
        preenAfter:0,preenSide:1,preenExit:-1,preenExitWeight:0,freezeAfter:0,alarm:null};
      if(bird.id==='northernCardinal')bird.free.attention={seed:0,slot:-1,yaw:.08,pitch:0};
    });
    // Feeding study (opt-in). Relative preferences over this clearing's foods,
    // simplified from Cornell Lab diet accounts. With no study, nothing below
    // runs and no seeded draw changes.
    var DIETS={
      robin:{worm:.55,berry:.35,insect:.10},chickadee:{seed:.55,insect:.45},mourningDove:{seed:1},
      grouse:{berry:.45,acorn:.35,insect:.20},blueJay:{acorn:.60,seed:.30,insect:.10},
      northernCardinal:{seed:.75,berry:.20,insect:.05},darkEyedJunco:{seed:.85,insect:.15},
      tuftedTitmouse:{seed:.50,insect:.40,acorn:.10},easternTowhee:{insect:.55,seed:.35,berry:.10},
      americanGoldfinch:{seed:1},easternBluebird:{insect:.60,berry:.40},whiteThroatedSparrow:{seed:.60,insect:.25,berry:.15}
    };
    // Blue jays displace smaller birds; the grouse is too large to be moved off.
    function displacedByJay(bird){return bird.id!=='blueJay'&&bird.id!=='grouse';}
    var feeding=null,wet=false,predator=null,perchedHawk=null;
    // Birds that gang up on a perched hawk; the others keep their distance.
    var MOBBERS=['blueJay','chickadee','tuftedTitmouse','robin'];
    function setWeather(value){wet=value==='rain';}
    // The engine reports the hawk while it is airborne in free roam, else null.
    // A perched report ({flying:false}) only counts once the hawk has just
    // landed, so the hawk already sitting there on arrival is not mobbed.
    function setPredator(value){
      if(!(value&&Number.isFinite(value.x)&&Number.isFinite(value.y)&&Number.isFinite(value.z))){predator=null;perchedHawk=null;return;}
      if(value.flying!==false){predator={x:value.x,y:value.y,z:value.z};perchedHawk=null;return;}
      if(predator)perchedHawk={x:value.x,y:value.y,z:value.z,since:freeTime};
      predator=null;
    }
    function mobbers(){return residents.filter(function(bird){return mode==='free'&&bird.free&&bird.free.kind==='mob';}).length;}
    function planMobbing(bird,state,observer){
      if(!perchedHawk||MOBBERS.indexOf(bird.id)<0||freeTime-perchedHawk.since>12||state.mobbedAt===perchedHawk.since)return false;
      var toX=perchedHawk.x-bird.originX,toZ=perchedHawk.z-bird.originZ,range=Math.hypot(toX,toZ);
      if(range>7)return false;
      if(range<2.2){state.mobbedAt=perchedHawk.since;beginMob(state);return true;}
      // Fly in when it is worth it, else walk; a blocked route is retried at the next decision.
      var stop=(range-1.8)/range,dx=toX*stop,dz=toZ*stop,kinds=range-1.8>.6?['flight','ground']:['ground'];
      for(var k=0;k<kinds.length;k++) {
        if(!isSafeRoute(bird,bird.originX+dx,bird.originZ+dz,kinds[k]==='flight',0,observer?observer.position:null,false))continue;
        state.mobbedAt=perchedHawk.since;state.kind=kinds[k];state.mobApproach=true;commitMove(bird,state,dx,dz,kinds[k],false,observer);return true;
      }
      return false;
    }
    // Scold from close range: loud, broadband calls that are easy to locate.
    function beginMob(state){state.mobApproach=false;state.kind='mob';state.elapsed=0;state.duration=4.5;state.alarm={at:freeTime,danger:.15,mob:true};if(feeding){state.food=null;state.target=null;}}
    function jayFeedingAt(source){
      return residents.some(function(other){return other.id==='blueJay'&&other.free.kind==='forage'&&other.free.food===source;});
    }
    function planFeeding(bird,state,observer){
      var diet=DIETS[bird.id];if(!diet)return false;
      var here=null,best=null,bestScore=0;
      feeding.sources.forEach(function(source){
        // Earthworms come up on wet ground, so rain draws worm-eaters to the lawn.
        var weight=(diet[source.kind]||0)*(wet&&source.kind==='worm'?2.2:1);if(!weight||source.amount<.12)return;
        if(state.avoid&&state.avoid.id===source.id&&freeTime<state.avoid.until)return;
        if(displacedByJay(bird)&&jayFeedingAt(source))return;
        var distance=Math.hypot(bird.originX-source.x,bird.originZ-source.z);
        if(distance<source.radius&&(!here||weight>(diet[here.kind]||0)))here=source;
        var score=weight*source.amount/(1+distance*.35)*(.75+.5*randomChoice(state));
        if(score>bestScore){bestScore=score;best=source;}
      });
      // A bird already at a suitable food usually keeps feeding there.
      if(here&&(here===best||randomChoice(state)<.7)){
        state.kind='forage';state.food=here;state.duration=3.6+randomChoice(state)*2.4;
        here.amount=Math.max(0,here.amount-.08);return true;
      }
      if(!best)return false;
      for(var attempt=0;attempt<10;attempt++){
        var angle=randomChoice(state)*TAU,reach=Math.sqrt(randomChoice(state))*best.radius*.85;
        var dx=best.x+Math.cos(angle)*reach-bird.originX,dz=best.z+Math.sin(angle)*reach-bird.originZ,travel=Math.hypot(dx,dz);
        if(travel<.05)continue;
        var kind=travel>.45?'flight':'ground';
        if(isSafeRoute(bird,bird.originX+dx,bird.originZ+dz,kind==='flight',0,observer?observer.position:null,false)){
          state.kind=kind;state.target=best;commitMove(bird,state,dx,dz,kind,false,observer);return true;
        }
      }
      return false;
    }
    function setFeedingStudy(sources){
      if(disposed)return;
      feeding=sources&&sources.length?{sources:sources.map(function(source){return {id:source.id,kind:source.kind,label:source.label,place:source.place,eat:source.eat,
        x:source.x,z:source.z,radius:source.radius,regrow:source.regrow,amount:1};})}:null;
      residents.forEach(function(bird){bird.free.food=null;bird.free.target=null;bird.free.avoid=null;bird.free.displaced=-1;});
    }
    function foodLevels(){
      return feeding?feeding.sources.map(function(source){return {id:source.id,kind:source.kind,label:source.label,amount:source.amount};}):[];
    }
    function randomChoice(state) {
      state.seed=(Math.imul(state.seed,1664525)+1013904223)>>>0;
      return state.seed/4294967296;
    }
    function preenAmount(state) {
      if(state.kind!=='preen')return 0;
      var weight=smooth(state.elapsed/.62)*(1-smooth((state.elapsed-state.duration+.66)/.66));
      if(state.preenExit>=0)weight=Math.min(weight,state.preenExitWeight*(1-smooth((state.elapsed-state.preenExit)/.48)));
      return weight;
    }
    function residentGaze(bird,scanning) {
      if(mode!=='free')return scanning;
      var weight=smooth(bird.free.alertness/.6)*.88;
      return scanning+(bird.free.watchYaw-scanning)*weight;
    }
    function observerResponse(bird,observer,dt) {
      var state=bird.free,position=observer&&observer.position,target=0,look=0,urgent=false;
      if(position&&Number.isFinite(position.x)&&Number.isFinite(position.z)) {
        var dx=bird.root.position.x-position.x,dz=bird.root.position.z-position.z,distance=Math.hypot(dx,dz);
        var speed=Math.min(2,Math.max(0,Number(observer.speed)||0)),approach=0;
        // Measure the observer's approach, not the bird's own movement. Walking
        // past or away is less disturbing than closing directly on a resident.
        if(state.hasObserver&&distance>.001) {
          approach=Math.max(0,Math.min(speed,((position.x-state.observerX)*dx+(position.z-state.observerZ)*dz)/(distance*dt)));
        }
        state.observerX=position.x;state.observerZ=position.z;state.hasObserver=true;
        var comfort=(bird.id==='grouse'?2.2:bird.id==='chickadee'?1.1:1.65)*(observer.crouching?.72:1);
        var notice=comfort*1.8+speed*.22,proximity=clamp((notice-distance)/(notice-comfort*.4));
        var intrusion=smooth((comfort*.65-distance)/(comfort*.65));
        target=clamp(proximity*(.45+.16*clamp(speed/1.65)+.42*clamp(approach/.9))+.65*intrusion);
        urgent=distance<comfort*.30;
        var bearing=Math.atan2(-dx,-dz)+(bird.model?0:Math.PI)-bird.root.rotation.y;
        look=Math.max(-.8,Math.min(.8,Math.atan2(Math.sin(bearing),Math.cos(bearing))));
      } else state.hasObserver=false;
      // Vigilance rises promptly but fades over several seconds. A stationary
      // observer at a respectful distance can watch the bird settle again.
      state.alertness+=(target-state.alertness)*(1-Math.exp(-dt/(target>state.alertness?.42:3.2)));
      state.watchYaw+=(look-state.watchYaw)*(1-Math.exp(-dt/.28));
      state.quietTime=state.alertness<.25?state.quietTime+dt:0;
      if(state.quietTime>1.5)state.escapeArmed=true;
      return state.cooldown===0&&state.alertness>.72&&(state.escapeArmed||urgent);
    }
    // A short free flight is still mostly direct. Any shallow correction is
    // checked with the same clearance as the straight route, and both its
    // heading and bank follow the actual tangent rather than an unrelated sway.
    function isSafeRoute(bird,x,z,flying,bend,observer,escaping) {
      if(Math.hypot(x,z)>6.8||blocked(x,z,flying?.32:.15))return false;
      var dx=x-bird.originX,dz=z-bird.originZ,length=Math.hypot(dx,dz),steps=Math.max(2,Math.ceil(length/.12));
      if(length<1e-6)return false;
      var rightX=dz/length,rightZ=-dx/length,previousRange=-1;
      // Even a calm bird should not plan a low flight or a feeding step
      // through the observer. If already crowded, permit only outward travel.
      var observerClearance=bird.id==='grouse'?.74:.60,startedInside=false;
      if(observer)previousRange=Math.hypot(bird.originX-observer.x,bird.originZ-observer.z);
      startedInside=observer&&previousRange<observerClearance;
      for(var i=1;i<=steps;i++) {
        var p=i/steps,correction=(bend||0)*Math.pow(Math.sin(Math.PI*p),2);
        var routeX=bird.originX+dx*p+rightX*correction,routeZ=bird.originZ+dz*p+rightZ*correction;
        if(Math.hypot(routeX,routeZ)>6.8||blocked(routeX,routeZ,flying?.32:.15))return false;
        if(observer) {
          var range=Math.hypot(routeX-observer.x,routeZ-observer.z);
          if((escaping||startedInside)&&range+1e-8<previousRange)return false;
          if(!escaping&&!startedInside&&range<observerClearance+.08)return false;
          previousRange=range;
        }
      }
      for(var other=0;other<residents.length;other++)if(residents[other]!==bird) {
        var position=residents[other].root.position;
        if(Math.hypot(x-position.x,z-position.z)<.32)return false;
      }
      return true;
    }
    function smoothIntegral(t,width) {
      if(t<=0)return 0;
      if(t>=width)return t-width*.5;
      var u=t/width;
      return width*(2.5*Math.pow(u,4)-3*Math.pow(u,5)+Math.pow(u,6));
    }
    function extraWingbeats(move,t) {
      var span=move.end-move.start+.12,elapsed=t-move.start+.12;
      // Integrate the burst rate analytically. It joins the cruise frequency
      // smoothly and leaves a retained phase offset instead of restarting a
      // wingbeat at takeoff, touchdown, or the next behavioral decision.
      return move.beatBoost*(smoothIntegral(elapsed,.20)-smoothIntegral(elapsed-(span-.30),.30));
    }
    function sampleFreeFlight(bird,move,t) {
      var out=bird.free.flightSample,u=clamp((t-move.start)/(move.end-move.start)),p=smooth(u);
      var length=Math.hypot(move.x,move.z),rightX=move.z/length,rightZ=-move.x/length;
      var bend=move.bend||0,correction=bend*Math.pow(Math.sin(Math.PI*p),2);
      var tangent=bend*Math.PI*Math.sin(TAU*p),curvature=bend*2*Math.PI*Math.PI*Math.cos(TAU*p);
      var tangentX=move.x+rightX*tangent,tangentZ=move.z+rightZ*tangent;
      var heading=Math.atan2(tangentX,tangentZ)+(bird.model?0:Math.PI);
      var turn=Math.atan2(Math.sin(heading-bird.baseYaw),Math.cos(heading-bird.baseYaw));
      var crest=bird.id==='grouse'?.38:bird.id==='chickadee'?.44:.42;
      var arc=smooth(u/crest)*smooth((1-u)/(1-crest));
      var progressRate=30*u*u*(1-u)*(1-u)/(move.end-move.start);
      var speed=Math.hypot(tangentX,tangentZ)*progressRate;
      var turnRate=length*curvature/(length*length+tangent*tangent)*progressRate;
      var approach=smooth((u-.58)/.27),settle=smooth((t-move.end)/.38);
      var launch=1-smooth(u/.36),grouse=bird.id==='grouse';
      out.x=move.x*p+rightX*correction;out.z=move.z*p+rightZ*correction;
      out.yaw=bird.baseYaw+turn*smooth(t/(move.turnDuration||move.start));
      out.lift=arc*move.height;out.u=u;out.airborne=t>=move.start&&t<move.end;
      out.bank=Math.max(-.16,Math.min(.16,-Math.atan2(speed*turnRate,9.81)))*arc;
      out.pitch=-arc*(.13*launch+.14*approach);
      out.opening=smooth((t-move.start+.16)/.30)*(1-smooth((t-move.end-.045)/.32));
      // Full supporting wings at contact, then a separate fold. Keep the toes
      // extended throughout that fold so they cannot curl back off the ground.
      out.landing=smooth((u-.57)/.26)*(1-smooth((t-move.end-.37)/.12));
      var flightEffort=(grouse?.76:.61)+move.effortBoost*launch+.08*approach;
      // The last power strokes give way to an outstretched braking wing.
      // Sustained downstrokes after the feet extend would clip the ground.
      var powerWindow=smooth((t-move.start+.02)/.14)*(1-smooth((u-.65)/.32));
      out.effort=.12+(flightEffort-.12)*powerWindow;
      out.tailFan=(grouse?.20:.10)+(grouse?.50:.30)*approach*(1-settle);
      out.scanReady=1-smooth((u-.55)/.25)*(1-smooth((t-move.end-.28)/.25));
      out.beat=extraWingbeats(move,t);
      return out;
    }
    // Shared by ordinary moves and feeding-study trips; draws from the same
    // seeded stream in the same order as the original inline planner.
    function commitMove(bird,state,dx,dz,kind,escape,observer) {
      var flying=kind==='flight',chickadee=bird.id==='chickadee',cardinal=bird.id==='northernCardinal',hopper=cardinal||!!(RESIDENT_TUNING[bird.id]&&RESIDENT_TUNING[bird.id].hop);
      var localChickadee=chickadee&&!bird.model;
      var travel=Math.hypot(dx,dz),pace=bird.id==='grouse'?4:bird.id==='mourningDove'?3.5:3;
      var duration=flying?Math.max(.9,travel/pace):localChickadee?.36:hopper?1.3+randomChoice(state)*.35:bird.model?1.8+randomChoice(state)*.6:1.1+randomChoice(state)*.4;
      state.heading=Math.atan2(dx,dz)+(bird.model?0:Math.PI);
      var turning=Math.abs(Math.atan2(Math.sin(state.heading-bird.baseYaw),Math.cos(state.heading-bird.baseYaw)));
      var preparation=Math.max(.45,turning/2.8);
      var move={start:preparation,end:preparation+duration,x:dx,z:dz,kind:kind};
      if(hopper&&!flying)move.hops=2;
      if(bird.model) {
        // Use the shared anatomy's reach: a longer foraging route earns
        // another pair of steps rather than stretching a fixed stride.
        move.steps=Math.max(4,Math.min(8,2*Math.ceil(travel/(bird.model.profile.walkReach*3))));
        if(turning>.015) {
          move.turnAngle=Math.atan2(Math.sin(state.heading-bird.baseYaw),Math.cos(state.heading-bird.baseYaw));
          move.turnSteps=2*Math.ceil(turning/.90);
          move.turnDuration=Math.max(.42,move.turnSteps*.22);
          preparation=Math.max(preparation,move.turnDuration+(flying?.18:.06));
          move.start=preparation;move.end=preparation+duration;
        }
      }
      if(flying) {
        // Flight variation uses the decision's retained seed, not random
        // numbers drawn during rendering. Doves keep particularly direct
        // routes, and a threatened bird minimizes sideways correction.
        var variation=(state.seed>>>8)%1024/1023;
        var bend=(variation-.5)*Math.min(.28,travel*.10)*(bird.id==='mourningDove'?.45:1)*(escape?.45:1);
        if(!isSafeRoute(bird,bird.originX+dx,bird.originZ+dz,true,bend,observer?observer.position:null,escape))bend=0;
        move.bend=bend;
        move.height=(bird.id==='grouse'?.48:bird.id==='mourningDove'?.68:bird.id==='blueJay'?.59:chickadee?.36:.47)*
          Math.max(.84,Math.min(1.12,travel/2.2))*(escape?1.08:1);
        move.effortBoost=(bird.id==='grouse'?.16:.20)*(escape?1.12:1);
        move.beatBoost=(bird.id==='grouse'?.8:chickadee?1.1:hopper?1.4:bird.id==='blueJay'?.55:.65)*(escape?1.15:1);
      }
      state.course.push(move);
      state.duration=duration+preparation+.63;
      if(escape){state.cooldown=8+randomChoice(state)*4;state.escapeArmed=false;state.quietTime=0;}
    }
    function beginFreeAction(bird,observer,escape) {
      var state=bird.free,prior=state.kind;
      if(state.course.length) {
        var completed=state.course[0];
        if(completed.kind==='flight')state.beatOffset+=extraWingbeats(completed,completed.end);
        bird.originX+=completed.x;bird.originZ+=completed.z;
        bird.baseYaw=state.heading;
      }
      state.course.length=0;state.elapsed=0;state.actionCount++;
      if(state.mobApproach&&!escape){beginMob(state);return;}
      state.mobApproach=false;
      var choice=randomChoice(state),flyChance=bird.id==='grouse'?.12:bird.id==='blueJay'?.32:.25;
      // In steady rain birds sit tight: fewer flights, more rest and preening,
      // while robins keep working the ground. The same draws are reweighted,
      // so a dry woodland follows exactly its usual sequence.
      var robinWet=wet&&bird.id==='robin';
      var kind=escape?'flight':(prior==='ground'||prior==='flight')?(choice<(robinWet?.75:wet?.5:.65)?'forage':'rest'):
        choice<flyChance*(wet?.4:1)?'flight':choice<(robinWet?.35:wet?.45:.70)?'ground':choice<(robinWet?.85:wet?.72:.89)?'forage':'rest';
      // Hold and assess after a disturbance before resuming feeding; this also
      // avoids an automatic flight/forage/flight cycle beside a quiet observer.
      if(!escape&&(state.alertness>.42||state.cooldown>0))kind='rest';
      // Groom only when settled, with a refractory interval so it stays an
      // occasional maintenance behavior rather than a repeated idle loop.
      if(kind==='rest'&&bird.model&&state.alertness<.18&&state.cooldown===0&&freeTime>=state.preenAfter&&
          (choice>(wet?.8:.94)||((prior==='ground'||prior==='flight')&&choice>(wet?.6:.78))))kind='preen';
      state.kind=kind;state.alarmed=!!escape;
      state.preenExit=-1;state.preenExitWeight=0;
      if(feeding){state.food=null;state.target=null;}
      if(perchedHawk&&!escape&&kind!=='preen'&&planMobbing(bird,state,observer))return;
      if(feeding&&!escape&&kind!=='preen'&&kind!=='rest'&&planFeeding(bird,state,observer))return;
      if(kind==='preen') {
        state.preenSide=randomChoice(state)<.5?-1:1;
        state.duration=3.4+randomChoice(state)*1.3;
        state.preenAfter=freeTime+(18+randomChoice(state)*12)*(wet?.5:1);
        return;
      }
      if(escape)state.cooldown=2.2;
      if(kind==='ground'||kind==='flight') {
        var flying=kind==='flight',chickadee=bird.id==='chickadee',cardinal=bird.id==='northernCardinal',hopper=cardinal||!!(RESIDENT_TUNING[bird.id]&&RESIDENT_TUNING[bird.id].hop);
        var localChickadee=chickadee&&!bird.model;
        var angle=bird.baseYaw+(bird.model?0:Math.PI),found=false,dx=0,dz=0;
        if(escape&&observer&&observer.position)angle=Math.atan2(bird.originX-observer.position.x,bird.originZ-observer.position.z);
        for(var attempt=0;attempt<24;attempt++) {
          var bearing=angle+(randomChoice(state)-.5)*(attempt<8?(escape?.75:flying?3.2:1.3):TAU);
          var distance=flying?(escape?2.4:hopper?.95:1.3)+randomChoice(state)*(hopper&&!escape?.85:1.5):
            localChickadee?.055+randomChoice(state)*.045:hopper?.14+randomChoice(state)*.12:.13+randomChoice(state)*.10;
          dx=Math.sin(bearing)*distance;dz=Math.cos(bearing)*distance;
          if(escape&&observer&&observer.position) {
            var awayX=bird.originX-observer.position.x,awayZ=bird.originZ-observer.position.z;
            // If cover blocks the direct escape, permit a tangential route but
            // never choose a fallback that crosses or approaches the observer.
            if(dx*awayX+dz*awayZ<0)continue;
          }
          if(isSafeRoute(bird,bird.originX+dx,bird.originZ+dz,flying,0,observer?observer.position:null,escape)){found=true;break;}
        }
        if(found){commitMove(bird,state,dx,dz,kind,escape,observer);return;}
        state.kind='rest';state.alarmed=false;
      }
      state.duration=state.kind==='forage'?3.1+randomChoice(state)*1.8:1.8+randomChoice(state)*3.4;
    }
    function setMode(value) {
      if(disposed||(value!=='guided'&&value!=='free')||value===mode)return;
      mode=value;freeTime=0;
      residents.forEach(function(bird,index) {
        bird.originX=bird.guided.x;bird.originZ=bird.guided.z;bird.baseYaw=bird.guided.yaw;
        var state=bird.free;state.seed=((Number(options.seed)||17391)+Math.imul(index+1,2654435761))>>>0;
        if(state.attention){state.attention.seed=(state.seed^2246822507)>>>0;state.attention.slot=-1;}
        state.elapsed=0;state.kind=index%2?'forage':'rest';state.duration=3.1+randomChoice(state)*2;
        state.course.length=0;state.cooldown=0;state.actionCount=0;state.alarmed=false;
        state.alertness=0;state.watchYaw=0;state.hasObserver=false;state.escapeArmed=true;state.quietTime=0;state.beatOffset=0;
        state.preenAfter=5+index*1.1;state.preenSide=1;state.preenExit=-1;state.preenExitWeight=0;state.freezeAfter=0;state.alarm=null;
        state.food=null;state.target=null;state.avoid=null;state.displaced=-1;
      });
      if(feeding)feeding.sources.forEach(function(source){source.amount=1;});
      update(0,0);
    }
    function advanceFree(dt,observer) {
      freeTime+=dt;
      if(feeding) {
        // Wet ground brings earthworms up, so the lawn restocks faster in rain.
        feeding.sources.forEach(function(source){source.amount=Math.min(1,source.amount+source.regrow*(wet&&source.kind==='worm'?3:1)*dt);});
        residents.forEach(function(jay){
          if(jay.id!=='blueJay'||jay.free.kind!=='forage'||!jay.free.food)return;
          residents.forEach(function(other){
            var state=other.free;
            if(other===jay||!displacedByJay(other)||state.kind!=='forage'||state.food!==jay.free.food||state.course.length)return;
            state.avoid={id:state.food.id,until:freeTime+8};state.displaced=freeTime;state.elapsed=Math.max(state.elapsed,state.duration);
          });
        });
      }
      residents.forEach(function(bird) {
        var state=bird.free;state.cooldown=Math.max(0,state.cooldown-dt);
        var near=observerResponse(bird,observer,dt);
        // A hawk crossing low over the clearing: small birds freeze where they
        // stand and watch the sky rather than flush. Closer passes hold them
        // longer and raise a stronger alarm. No random draw is spent here.
        if(predator&&state.kind!=='freeze'&&state.kind!=='preen'&&!state.course.length&&freeTime>=state.freezeAfter) {
          var hawkRange=Math.hypot(bird.originX-predator.x,bird.originZ-predator.z),hawkHeight=predator.y-height(bird.originX,bird.originZ);
          if(hawkRange<9&&hawkHeight<10) {
            var danger=clamp(1-hawkRange/9);
            state.kind='freeze';state.elapsed=0;state.duration=2.6+danger*2;state.freezeAfter=freeTime+state.duration+5;
            state.alarm={at:freeTime,danger:danger};
            if(feeding){state.food=null;state.target=null;}
          }
        }
        if(state.kind==='preen'&&state.preenExit<0&&state.alertness>.30) {
          state.preenExitWeight=preenAmount(state);state.preenExit=state.elapsed;
        }
        // Finish a planted step or an airborne arc before making a new route;
        // react immediately from a quiet pose without teleporting mid-stride.
        var pecking=state.kind==='forage'?Math.max(pulse(state.elapsed,.65,.8),pulse(state.elapsed,1.85,.75)):0;
        if(near&&!state.course.length&&state.elapsed>.15&&pecking<.001&&preenAmount(state)<.001)beginFreeAction(bird,observer,true);
        state.elapsed+=dt;
        if(state.kind==='preen'&&state.preenExit>=0&&state.elapsed-state.preenExit>=.48) {
          // Finish raising the head before choosing the outward departure.
          if(near)beginFreeAction(bird,observer,true);
          else {state.kind='rest';state.elapsed=0;state.duration=.75;}
        }
        if(state.elapsed>=state.duration) {
          var remaining=state.elapsed-state.duration;
          beginFreeAction(bird,observer,near);state.elapsed=remaining;
        }
      });
    }
    function update(time,dt,observer) {
      if (disposed) return;
      if (!Number.isFinite(time)) time = 0;
      if(mode==='free'&&Number.isFinite(dt)&&dt>0)advanceFree(Math.min(dt,.1),observer);
      if(Number.isFinite(dt)&&dt>0)songClock+=Math.min(dt,.1);
      birds.forEach(function (bird) {
        var autonomous=mode==='free',t=autonomous?bird.free.elapsed:((time + bird.phase) % PERIOD + PERIOD) % PERIOD, chickadee = bird.id === 'chickadee';
        var course=autonomous?bird.free.course:moves;
        var x = 0, z = 0, lift = 0, wingOpen = 0, active = null, yaw = bird.baseYaw, movePhase = 0, bank = 0;
        var activeStartX = 0, activeStartZ = 0, freeFlight = null;
        for (var i = 0; i < course.length; i++) {
          var move = course[i], startX = i ? course[i - 1].x : 0, startZ = i ? course[i - 1].z : 0;
          var preparation=autonomous?move.start:.45;
          if (t >= move.end) { x = move.x; z = move.z; }
          if (t > move.start - preparation && t < move.end + .45) {
            var u = clamp((t - move.start) / (move.end - move.start)), traveling = t >= move.start && t <= move.end;
            var envelope = smooth((t - move.start + preparation) / preparation) * smooth((move.end + .45 - t) / .45);
            var heading = Math.atan2(-(move.x - startX), -(move.z - startZ));
            yaw += Math.atan2(Math.sin(heading - yaw), Math.cos(heading - yaw)) * envelope;
            if (traveling) {
              var progress = smooth(u); x = startX + (move.x - startX) * progress; z = startZ + (move.z - startZ) * progress;
              active = move; movePhase = u; activeStartX = startX; activeStartZ = startZ;
              if (move.kind === 'flight') {
                lift = Math.pow(Math.sin(Math.PI * u), 2) * (chickadee ? .36 : .47);
                var curve = Math.pow(Math.sin(Math.PI * u), 2) * .055;
                x += curve; bank = -.12 * Math.sin(TAU * u) * Math.pow(Math.sin(Math.PI * u), 2);
              } else if (chickadee) lift = Math.pow(Math.sin(Math.PI * u), 2) * .036;
            }
            if (move.kind === 'flight') wingOpen = smooth((t - move.start + .16) / .34) * smooth((move.end + .22 - t) / .40);
          }
          if(autonomous&&t>=move.end)yaw=bird.free.heading;
        }
        if(autonomous&&course.length&&course[0].kind==='flight') {
          freeFlight=sampleFreeFlight(bird,course[0],t);
          x=freeFlight.x;z=freeFlight.z;lift=freeFlight.lift;yaw=freeFlight.yaw;
          wingOpen=freeFlight.opening;bank=freeFlight.bank;movePhase=freeFlight.u;
        }
        var peck = autonomous?(bird.free.kind==='forage'?Math.max(pulse(t,.65,.8),pulse(t,1.85,.75)):0):
          Math.max(pulse(t, 7.1, .8), pulse(t, 9.1, .65), pulse(t, 26.7, .7), pulse(t, 28.9, .75));
        var flight = active && active.kind === 'flight', groundMove = active && active.kind === 'ground';
        bird.altitude = lift; bird.root.position.set(bird.originX + x, height(bird.originX + x, bird.originZ + z) + lift, bird.originZ + z);
        bird.root.rotation.y = yaw; bird.body.position.y = .098 - peck * .024;
        bird.body.rotation.set(-peck * .91 + wingOpen * .17 - (freeFlight?freeFlight.pitch:0), 0, bank);
        var groundAttention = groundMove ? smooth(movePhase / .17) * smooth((1 - movePhase) / .17) : 0;
        bird.head.rotation.set(-peck * .37 - wingOpen * .12 + (freeFlight?freeFlight.pitch*.8:0), (1 - peck) * (1 - wingOpen) *
          (1 - groundAttention) * residentGaze(bird,scanYaw(autonomous?(freeTime+bird.phase)%PERIOD:t)) * (chickadee ? 1.08 : 1), -bank * .6);
        bird.tail.rotation.set(peck * .24 - wingOpen * .12 + .025 * Math.sin(TAU * (autonomous?freeTime:t) / 11) - (freeFlight?freeFlight.landing*wingOpen*.10:0), 0, 0);
        var beat = autonomous?TAU*((chickadee?11:7)*(freeTime+bird.phase)+bird.free.beatOffset+(freeFlight?freeFlight.beat:0)):TAU*(chickadee?11:7)*t;
        // Fast supporting downstroke; recovery flexes the hand with a small lag.
        var stroke = (Math.sin(beat) + .18 * Math.sin(beat * 2)) * (freeFlight?freeFlight.effort/.75:1);
        bird.wings.forEach(function (wing) {
          var fold = 1 - wingOpen;
          // Nested shafts turn aft as the shoulder rolls their upper surfaces
          // out against the flank. Feather lengths stay rigid during folding.
          wing.root.position.x = wing.side * (.027 + fold * .002);
          wing.root.rotation.set(0, -wing.side * fold * 1.48,
            wing.side * (-fold * 1.42 + wingOpen * (.13 + stroke * .79)), 'ZYX');
          wing.wrist.position.x = .058 - fold * .018;
          wing.wrist.position.z = .002 - fold * .014;
          wing.wrist.rotation.set(0, -(1 - wingOpen) * .15, wingOpen * (.14 + Math.sin(beat - .38) * .28));
          wing.meshes.forEach(function (mesh) { nestFeathers(mesh, fold); });
        });
        var footTuck = flight ? smooth(movePhase / .16) * smooth((1 - movePhase) / .24) : 0;
        bird.feet.forEach(function (foot, index) {
          var stepLift = 0;
          foot.position.x = (index ? 1 : -1) * .015;
          foot.position.z = -.002 + footTuck * .010;
          if (groundMove && !chickadee) {
            // Six alternating swings. A completed swing fixes its world-space
            // foothold until the next lift; only the body advances in stance.
            // Interior footholds sit at mid-stance, keeping the hips over the
            // support foot. The last pair closes exactly at the resting stance.
            var footProgress = 0;
            for (var stepIndex = index; stepIndex < 6; stepIndex += 2) {
              var stepStart = stepIndex / 6, stepEnd = (stepIndex + 1) / 6;
              var targetProgress = stepIndex >= 4 ? 1 : smooth((stepIndex + 1.5) / 6);
              if (movePhase < stepStart) break;
              if (movePhase >= stepEnd) { footProgress = targetProgress; continue; }
              var swing = (movePhase - stepStart) * 6;
              footProgress += (targetProgress - footProgress) * smooth(swing);
              stepLift = Math.pow(Math.sin(Math.PI * swing), 2) * .020;
              break;
            }
            var stanceX = activeStartX + (active.x - activeStartX) * footProgress - x;
            var stanceZ = activeStartZ + (active.z - activeStartZ) * footProgress - z;
            foot.position.x += (Math.cos(yaw) * stanceX - Math.sin(yaw) * stanceZ) / bird.scale;
            foot.position.z += (Math.sin(yaw) * stanceX + Math.cos(yaw) * stanceZ) / bird.scale;
          }
          var footX = bird.root.position.x + bird.scale * (Math.cos(yaw) * foot.position.x + Math.sin(yaw) * foot.position.z);
          var footZ = bird.root.position.z + bird.scale * (-Math.sin(yaw) * foot.position.x + Math.cos(yaw) * foot.position.z);
          var slopeOffset = (height(footX, footZ) - height(bird.root.position.x, bird.root.position.z)) / bird.scale;
          foot.position.y = slopeOffset + stepLift + footTuck * .027;
          foot.rotation.x = footTuck * .65;
        });
        if (groundMove && !chickadee) bird.body.position.y += Math.sin(movePhase * TAU * 6) * Math.sin(Math.PI * movePhase) * .002;
        bird.behavior = flight ? (movePhase < .18 ? 'Taking flight' : movePhase > .78 ? 'Alighting' : 'Short flight') :
          groundMove ? (chickadee ? 'Hopping' : 'Scurrying') : peck > .05 ? 'Foraging' : freeFlight&&wingOpen>.05?'Settling wings':'Scanning';
      });
      sharedBirds.forEach(function(bird) { updateSharedBird(bird,time); });
      if(mode==='free')residents.forEach(function(bird) {
        var state=bird.free,course=state.course[0];
        if(state.alarmed&&course&&state.elapsed<course.start)bird.behavior='Alert — preparing to move away';
        else if(!course&&bird.behavior==='Scanning') {
          if(state.alertness>.30)bird.behavior='Watching the observer';
          else if(state.cooldown>0)bird.behavior='Settling after disturbance';
          else if(state.kind==='forage')bird.behavior='Searching for food';
          else if(wet&&state.kind==='rest')bird.behavior='Sitting tight in the rain';
          else if(state.kind==='freeze')bird.behavior='Freezing as the hawk passes';
          else if(state.kind==='mob')bird.behavior='Mobbing the perched hawk';
        }
        if(state.mobApproach&&course)bird.behavior='Moving in to mob the hawk';
        if(feeding&&!state.alarmed) {
          if(state.displaced>=0&&freeTime-state.displaced<2.5)bird.behavior='Displaced by a blue jay';
          else if(course&&state.target)bird.behavior=(course.kind==='flight'?'Flying to ':'Moving to ')+state.target.place;
          else if(!course&&state.food&&state.kind==='forage'&&state.alertness<=.30)bird.behavior=state.food.eat;
        }
      });
      updateContactShadows();
    }
    function snapshot() {
      return birds.concat(sharedBirds).map(function (bird) { return { id: bird.id, name: bird.name, scientificName: bird.scientificName,
        behavior: bird.behavior, position: bird.root.position.toArray(), altitude: bird.altitude, heading:bird.root.rotation.y,
        alertness:mode==='free'?bird.free.alertness:0,recovering:mode==='free'&&bird.free.cooldown>0,
        food:mode==='free'&&feeding&&bird.free.food&&bird.free.kind==='forage'&&!bird.free.course.length?{kind:bird.free.food.kind,source:bird.free.food.id,label:bird.free.food.eat}:undefined,
        alarm:mode==='free'&&(bird.free.kind==='freeze'||bird.free.kind==='mob')&&bird.free.alarm?{at:bird.free.alarm.at,danger:bird.free.alarm.danger,mob:!!bird.free.alarm.mob}:undefined }; });
    }
    function getFocus(id, out) {
      for (var i = 0; i < birds.length; i++) if (birds[i].id === id) {
        root.updateMatrixWorld(true); return birds[i].body.getWorldPosition(out);
      }
      for (var j = 0; j < sharedBirds.length; j++) if (sharedBirds[j].id === id) {
        root.updateMatrixWorld(true); return sharedBirds[j].body.getWorldPosition(out);
      }
      return null;
    }
    function dispose() {
      if (disposed) return; disposed = true; scene.remove(root);
      resources.forEach(function (resource) { resource.dispose(); });
      sharedBirds.forEach(function(bird) { bird.model.dispose(); });
    }
    update(0);
    // True when the resident uses the shared model (it faces +Z, unlike the local fallback).
    function isShared(id) { return sharedBirds.some(function(bird) { return bird.id === id; }); }
    // Samples the deterministic guided course at each bird's feeding times,
    // then restores the caller's time. Guided updates hold no history.
    function guidedForageSpots(restoreTime) {
      if(disposed||mode!=='guided')return [];
      var spots=[],times={};
      sharedBirds.forEach(function(bird){
        var extra=RESIDENT_TUNING[bird.id];
        times[bird.id]=[extra?extra.forage[0]:bird.id==='grouse'?10.1:bird.id==='blueJay'?10.4:8.1,38.2];
      });
      [0,1].forEach(function(slot){
        sharedBirds.forEach(function(bird){
          update(times[bird.id][slot]);
          var diet=DIETS[bird.id];if(!diet)return;
          var kind=Object.keys(diet).sort(function(a,b){return diet[b]-diet[a];})[0];
          var x=bird.root.position.x+Math.sin(bird.root.rotation.y)*.05,z=bird.root.position.z+Math.cos(bird.root.rotation.y)*.05;
          if(!spots.some(function(spot){return Math.hypot(spot.x-x,spot.z-z)<.12;}))spots.push({id:bird.id,kind:kind,x:x,z:z});
        });
      });
      update(Number.isFinite(restoreTime)?restoreTime:0);
      return spots;
    }
    return { root: root, update: update, setMode: setMode, snapshot: snapshot, getFocus: getFocus, isShared: isShared, setExtraContactShadow: setExtraContactShadow,
      setFeedingStudy: setFeedingStudy, foodLevels: foodLevels, cueSong: cueSong, setWeather: setWeather, setPredator: setPredator, mobbers: mobbers, guidedForageSpots: guidedForageSpots, dispose: dispose };
  }
  global.BirdLab3DWildlife = { create: create };
}(window));
