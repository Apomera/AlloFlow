// Frozen pre-refinement coat generator; deliberately independent of candidate source.
// Captured from source SHA-256 294ca526e5800f6acd5f748af1affce48a020ebd30415a872bebbda9f6ca5c11.
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

export function baselineCoatGeometry(THREE, surface, options) {
    var source = surface.attributes.position, normals = surface.attributes.normal;
    var index = surface.index, uv = surface.attributes.uv;
    var random = mulberry32(options.seed >>> 0), triangles = [], totalArea = 0;
    var a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    var ab = new THREE.Vector3(), ac = new THREE.Vector3();
    for (var i = 0; i < (index ? index.count : source.count); i += 3) {
      var ia = index ? index.getX(i) : i, ib = index ? index.getX(i + 1) : i + 1, ic = index ? index.getX(i + 2) : i + 2;
      a.fromBufferAttribute(source, ia); b.fromBufferAttribute(source, ib); c.fromBufferAttribute(source, ic);
      var normal = new THREE.Vector3().fromBufferAttribute(normals, ia).add(new THREE.Vector3().fromBufferAttribute(normals, ib)).add(new THREE.Vector3().fromBufferAttribute(normals, ic)).normalize();
      if (options.dorsalOnly && normal.y < 0.52) continue;
      if (options.maxU != null && uv && Math.max(uv.getX(ia), uv.getX(ib), uv.getX(ic)) > options.maxU) continue;
      if (options.minX != null && Math.min(a.x, b.x, c.x) < options.minX) continue;
      var area = ab.subVectors(b, a).cross(ac.subVectors(c, a)).length() * 0.5;
      if (area < 1e-12) continue;
      totalArea += area; triangles.push({ ids: [ia, ib, ic], end: totalArea });
    }
    if (!triangles.length || !(options.length > 0) || !(options.count > 0)) return null;
    var positions = [], normalData = [], rootPositions = [], rootNormals = [], colors = [], uvs = [], vanes = [], indices = [];
    var count = Math.min(1600, Math.round(options.count));
    for (var rootIndex = 0; rootIndex < count; rootIndex++) {
      var areaPick = (rootIndex + random()) / count * totalArea, low = 0, high = triangles.length - 1;
      while (low < high) { var middle = (low + high) >> 1; if (triangles[middle].end < areaPick) low = middle + 1; else high = middle; }
      var ids = triangles[low].ids, u = Math.sqrt(random()), v = random(), weights = [1 - u, u * (1 - v), u * v];
      var root = new THREE.Vector3(), n = new THREE.Vector3(), rootU = 0;
      for (var k = 0; k < 3; k++) {
        root.addScaledVector(a.fromBufferAttribute(source, ids[k]), weights[k]);
        n.addScaledVector(a.fromBufferAttribute(normals, ids[k]), weights[k]);
        if (uv) rootU += uv.getX(ids[k]) * weights[k];
      }
      n.normalize();
      var along = new THREE.Vector3(1, -0.12, 0).addScaledVector(n, -new THREE.Vector3(1, -0.12, 0).dot(n));
      if (along.lengthSq() < 0.001) along.set(0, 0, 1).addScaledVector(n, -n.z);
      along.normalize();
      var across = new THREE.Vector3().crossVectors(along, n).normalize();
      var length = options.length * (0.72 + random() * 0.52), pennaceous = !!options.pennaceous;
      // Short feathers soften anatomical boundaries without changing their roots or pigment samples.
      var taper = options.taper;
      if (taper && taper.x) {
        var xBlend = Math.max(0, Math.min(1, (root.x - taper.x[0]) / Math.max(1e-8, taper.x[1] - taper.x[0])));
        length *= taper.x[2] + (1 - taper.x[2]) * xBlend * xBlend * (3 - 2 * xBlend);
      }
      if (taper && taper.u && uv) {
        var uBlend = Math.max(0, Math.min(1, (rootU - taper.u[0]) / Math.max(1e-8, 1 - taper.u[0])));
        length *= 1 - (1 - taper.u[1]) * uBlend * uBlend * (3 - 2 * uBlend);
      }
      var shade = 0.90 + random() * 0.12, blades = pennaceous ? 1 : 3;
      for (var blade = 0; blade < blades; blade++) {
        var start = positions.length / 3, fan = pennaceous ? 0 : (blade - 1) * 0.22;
        var breadth = length * (pennaceous ? 0.18 : 0.055), rows = pennaceous ? 8 : 5, columns = pennaceous ? 2 : 1;
        // A narrow, cambered vane lays along the skin instead of reading as a flat scale.
        for (var row = 0; row <= rows; row++) {
          var t = row / rows, envelope = Math.sin(Math.PI * t);
          var width = breadth * Math.pow(envelope, pennaceous ? 0.85 : 0.9) * (pennaceous ? 1 - t * 0.24 : 1);
          var lift = length * (pennaceous ? 0.015 + 0.18 * t - 0.10 * t * t + 0.065 * envelope : 0.015 + 0.64 * t - 0.08 * t * t);
          var point = root.clone().addScaledVector(along, length * t).addScaledVector(n, lift).addScaledVector(across, fan * length * t * t);
          for (var column = 0; column <= columns; column++) {
            var side = column / columns * 2 - 1;
            var p = point.clone().addScaledVector(across, width * side)
              .addScaledVector(n, pennaceous ? length * 0.028 * envelope * (1 - side * side) : 0);
            positions.push(p.x, p.y, p.z); normalData.push(n.x, n.y, n.z);
            rootPositions.push(root.x, root.y, root.z); rootNormals.push(n.x, n.y, n.z);
            var tone = shade * (pennaceous ? 0.96 + 0.04 * t : 0.92 + 0.08 * t); colors.push(tone, tone, tone); uvs.push(rootU, (side + 1) / 2);
            vanes.push(side, t, pennaceous ? 1 : 0);
            if (row < rows && column < columns) {
              var base = start + row * (columns + 1) + column;
              indices.push(base, base + 1, base + columns + 1, base + 1, base + columns + 2, base + columns + 1);
            }
          }
        }
      }
    }
    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normalData, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute('dinoCoatRoot', new THREE.Float32BufferAttribute(rootPositions, 3));
    geometry.setAttribute('dinoCoatNormal', new THREE.Float32BufferAttribute(rootNormals, 3));
    geometry.setAttribute('dinoCoatVane', new THREE.Float32BufferAttribute(vanes, 3));
    geometry.setIndex(indices);
    if (options.pennaceous) {
      geometry.computeVertexNormals();
      // Coincident root/tip vertices have no triangle area; retain a valid skin normal there.
      var coatNormals = geometry.attributes.normal;
      for (var vertex = 0; vertex < coatNormals.count; vertex++) {
        if (a.fromBufferAttribute(coatNormals, vertex).lengthSq() < 0.5) {
          coatNormals.setXYZ(vertex, rootNormals[vertex * 3], rootNormals[vertex * 3 + 1], rootNormals[vertex * 3 + 2]);
        }
      }
    }
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    geometry.parameters = { roots: count, pennaceous: !!options.pennaceous, length: options.length, dorsalOnly: !!options.dorsalOnly, taper: options.taper || null };
    return geometry;
  }

