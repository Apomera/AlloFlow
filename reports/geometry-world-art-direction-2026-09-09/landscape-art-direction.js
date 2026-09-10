// Replace the existing initLandscape IIFE inside initEngine with this snippet.
// THREE r128, engine and geometryWorldSrgbColor are supplied by that scope.
// Six merged, lit/fogged decorative meshes. No animation, textures or picking.
(function initLandscape() {
  var landscapeKey = '';
  function finite(value, fallback) { var n = Number(value); return isFinite(n) ? n : fallback; }
  function smooth(value) { var v = Math.max(0, Math.min(1, value)); return v * v * (3 - 2 * v); }
  function color(hex) { return geometryWorldSrgbColor(THREE, hex); }
  function buffer() { return { positions: [], colors: [] }; }
  function triangle(out, a, b, c, tint) {
    var points = [a, b, c];
    for (var i = 0; i < 3; i++) {
      var p = points[i];
      out.positions.push(p[0], p[1], p[2]);
      out.colors.push(p.length > 3 ? p[3] : tint.r, p.length > 3 ? p[4] : tint.g, p.length > 3 ? p[5] : tint.b);
    }
  }
  function meshFrom(out, name, terrain, doubleSide) {
    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(out.positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(out.colors, 3));
    geometry.computeVertexNormals();
    if (terrain) {
      // Preserve a trace of the facets without making a patchwork of the slopes.
      var p = geometry.attributes.position.array, n = geometry.attributes.normal.array, sums = {};
      function keyAt(k) { return Math.round(p[k] * 10000) + ',' + Math.round(p[k + 1] * 10000) + ',' + Math.round(p[k + 2] * 10000); }
      for (var k = 0; k < p.length; k += 3) {
        var key = keyAt(k), sum = sums[key] || (sums[key] = [0, 0, 0]);
        sum[0] += n[k]; sum[1] += n[k + 1]; sum[2] += n[k + 2];
      }
      for (var j = 0; j < p.length; j += 3) {
        var avg = sums[keyAt(j)], length = Math.hypot(avg[0], avg[1], avg[2]) || 1;
        var nx = avg[0] / length * 0.97 + n[j] * 0.03;
        var ny = avg[1] / length * 0.97 + n[j + 1] * 0.03;
        var nz = avg[2] / length * 0.97 + n[j + 2] * 0.03;
        var norm = Math.hypot(nx, ny, nz) || 1;
        n[j] = nx / norm; n[j + 1] = ny / norm; n[j + 2] = nz / norm;
      }
    }
    geometry.computeBoundingSphere();
    var material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, flatShading: !terrain, side: doubleSide ? THREE.DoubleSide : THREE.FrontSide });
    var mesh = new THREE.Mesh(geometry, material);
    mesh.name = name; mesh.userData.gwLandscape = true;
    mesh.castShadow = false; mesh.receiveShadow = false;
    mesh.raycast = function() {};
    return mesh;
  }
  function disposeLandscape() {
    var group = engine._landscape;
    if (group) {
      if (group.parent) group.parent.remove(group);
      group.children.forEach(function(mesh) { mesh.geometry.dispose(); mesh.material.dispose(); });
    }
    engine._landscape = null; landscapeKey = '';
  }
  function noise(x, z) {
    return 0.5 + (Math.sin(x * 0.043 + z * 0.029 + 0.4) + Math.sin(x * 0.024 - z * 0.057 + 1.1) * 0.53 + Math.sin(x * 0.107 + z * 0.081 + 2.8) * 0.24) / 3.54;
  }
  function peak(t, center, width) {
    var d = Math.atan2(Math.sin(t - center), Math.cos(t - center));
    return Math.exp(-Math.pow(Math.abs(d) / width, 1.5));
  }
  function crown(out, x, y, z, radius, height, tint, twist, seed) {
    for (var k = 0; k < 6; k++) {
      var a = twist + k * Math.PI / 3, b = twist + (k + 1) * Math.PI / 3;
      var ra = radius * (1 + Math.sin(k * 2.7 + seed) * 0.07), rb = radius * (1 + Math.sin((k + 1) % 6 * 2.7 + seed) * 0.07);
      var va = [x + Math.cos(a) * ra, y + Math.sin(k * 1.7 + seed) * height * 0.025, z + Math.sin(a) * ra];
      var vb = [x + Math.cos(b) * rb, y + Math.sin((k + 1) % 6 * 1.7 + seed) * height * 0.025, z + Math.sin(b) * rb];
      triangle(out, va, [x + Math.sin(seed) * height * 0.035, y + height, z], vb, tint);
      triangle(out, [x, y, z], va, vb, tint);
    }
  }
  function trunk(out, x, y, z, radius, height, tint, twist) {
    for (var k = 0; k < 5; k++) {
      var a = twist + k * Math.PI * 2 / 5, b = twist + (k + 1) * Math.PI * 2 / 5;
      var p = [x + Math.cos(a) * radius, y, z + Math.sin(a) * radius], q = [x + Math.cos(b) * radius, y, z + Math.sin(b) * radius];
      var r = [x + Math.cos(a) * radius * 0.55, y + height, z + Math.sin(a) * radius * 0.55], s = [x + Math.cos(b) * radius * 0.55, y + height, z + Math.sin(b) * radius * 0.55];
      triangle(out, p, r, q, tint); triangle(out, q, r, s, tint);
    }
  }
  engine.disposeLandscape = disposeLandscape;
  engine.refreshLandscape = function(ground) {
    if (engine._destroyed || !engine.scene) return;
    ground = ground || {};
    var x0 = finite(ground.xMin, -8), x1 = finite(ground.xMax, 24), z0 = finite(ground.zMin, -8), z1 = finite(ground.zMax, 24);
    if (x0 > x1) { var sx = x0; x0 = x1; x1 = sx; }
    if (z0 > z1) { var sz = z0; z0 = z1; z1 = sz; }
    var baseY = finite(ground.y, 0) - 0.12, saver = engine._renderProfile && engine._renderProfile.tier === 'saver';
    var nextKey = [x0, x1, z0, z1, baseY, saver ? 'saver' : 'detail'].join(':');
    if (landscapeKey === nextKey && engine._landscape) return;
    disposeLandscape(); landscapeKey = nextKey;
    var centerX = (x0 + x1) / 2, centerZ = (z0 + z1) / 2;
    var halfX = (x1 - x0) / 2 + 0.5, halfZ = (z1 - z0) / 2 + 0.5, outline = [], segments = saver ? 8 : 12;
    // Offset the full lesson rectangle, not a fixed-radius circle. The first
    // contour is at 32 units: even its corner chords stay over 31 units clear.
    for (var side = 0; side < 4; side++) {
      for (var s = 0; s < segments; s++) {
        var f = s / segments;
        if (side === 0) outline.push({ x: halfX, z: -halfZ + 2 * halfZ * f, nx: 1, nz: 0 });
        if (side === 1) outline.push({ x: halfX - 2 * halfX * f, z: halfZ, nx: 0, nz: 1 });
        if (side === 2) outline.push({ x: -halfX, z: halfZ - 2 * halfZ * f, nx: -1, nz: 0 });
        if (side === 3) outline.push({ x: -halfX + 2 * halfX * f, z: -halfZ, nx: 0, nz: -1 });
      }
      for (var arc = 0; arc < segments; arc++) {
        var angle = side * Math.PI / 2 + arc / segments * Math.PI / 2;
        outline.push({ x: side === 0 || side === 3 ? halfX : -halfX, z: side < 2 ? halfZ : -halfZ, nx: Math.cos(angle), nz: Math.sin(angle) });
      }
    }
    var low = engine._horizon && engine._horizon.material && engine._horizon.material.color ? engine._horizon.material.color.clone() : color(0x496d46);
    var moss = color(0x738255), ridgeGreen = color(0x607c6d), ridgeStone = color(0x89988d), farBlue = color(0x869da3), farCrest = color(0xacb8b9);
    var layers = [
      { name: 'gw-rolling-hills', bands: [32, 37, 44, 52, 61, 71, 82, 94, 107], kind: 0 },
      { name: 'gw-mountain-ridges', bands: [61, 70, 80, 91, 103, 117, 132], kind: 1 },
      { name: 'gw-distant-ridges', bands: [82, 91, 101, 113, 126, 142, 158], kind: 2 }
    ];
    function point(i, ring, layer) {
      var d = outline[i], bands = layer.bands, kind = layer.kind, t = i / outline.length * Math.PI * 2;
      var interior = ring > 0 && ring < bands.length - 1;
      var distance = bands[ring] + (interior ? Math.sin(t * 5 + ring * 1.93 + kind) * 1.5 + Math.sin(t * 9 - ring * 0.71) * 0.7 : 0);
      var lx = d.x + d.nx * distance, lz = d.z + d.nz * distance, n = noise(lx + kind * 29, lz - kind * 17);
      var crest, elevation, width;
      if (!kind) {
        crest = 57 + Math.sin(t * 3 + 0.3) * 8 + Math.sin(t * 7 + 1.2) * 3;
        elevation = 2.1 + peak(t, 0.55, 0.5) * 7 + peak(t, 2.65, 0.55) * 8 + peak(t, 4.75, 0.65) * 6 + n * 1.4;
        width = 18;
      } else if (kind === 1) {
        crest = 91 + Math.sin(t * 3 + 2.1) * 9 + Math.sin(t * 7) * 3;
        elevation = 7 + peak(t, 0.16, 0.35) * 23 + peak(t, 1.85, 0.39) * 28 + peak(t, 3.55, 0.3) * 22 + peak(t, 5.1, 0.38) * 31 + n * 3;
        width = 19;
      } else {
        crest = 113 + Math.sin(t * 3 + 0.7) * 7 + Math.sin(t * 5 + 2) * 4;
        elevation = 20 + peak(t, 0.9, 0.32) * 29 + peak(t, 2.35, 0.27) * 25 + peak(t, 4.15, 0.33) * 32 + peak(t, 5.65, 0.28) * 23;
        width = 24;
      }
      var fade = smooth((distance - bands[0]) / 11) * smooth((bands[bands.length - 1] - distance) / 14);
      var profile = Math.exp(-Math.pow(Math.abs(distance - crest) / width, kind ? 1.55 : 2));
      var y = elevation * profile * fade;
      var tint;
      if (!kind) tint = low.clone().lerp(moss, smooth((y - 0.12) / 10) * (0.74 + n * 0.12));
      else if (kind === 1) tint = low.clone().lerp(ridgeGreen, smooth(y / 5)).lerp(ridgeStone, smooth((y - 14) / 20) * (0.72 + n * 0.12));
      else tint = low.clone().lerp(farBlue, smooth(y / 6)).lerp(farCrest, smooth((y - 26) / 25) * 0.56);
      return [centerX + lx, baseY + y, centerZ + lz, tint.r, tint.g, tint.b];
    }
    var group = new THREE.Group(); group.name = 'gw-landscape'; group.userData.gwLandscape = true;
    var nearGrid;
    layers.forEach(function(layer) {
      var terrain = buffer(), grid = layer.bands.map(function(_, ring) { return outline.map(function(_, i) { return point(i, ring, layer); }); });
      if (!layer.kind) nearGrid = grid;
      for (var r = 0; r < grid.length - 1; r++) {
        for (var i = 0; i < outline.length; i++) {
          var next = (i + 1) % outline.length, a = grid[r][i], b = grid[r][next], c = grid[r + 1][i], d = grid[r + 1][next];
          if ((r + i) % 2) { triangle(terrain, a, b, d); triangle(terrain, a, d, c); }
          else { triangle(terrain, a, b, c); triangle(terrain, b, d, c); }
        }
      }
      group.add(meshFrom(terrain, layer.name, true, false));
    });
    var trunks = buffer(), foliage = buffer(), accents = buffer();
    var bark = color(0x685744), leaves = [color(0x365d4b), color(0x456b52), color(0x52765c)], tips = color(0x6c8768);
    var groves = [{ u: 0.04, count: 4 }, { u: 0.22, count: 5 }, { u: 0.37, count: 3 }, { u: 0.58, count: 5 }, { u: 0.73, count: 4 }, { u: 0.90, count: 5 }], treeCount = 0;
    groves.forEach(function(grove, cluster) {
      var count = saver ? 2 : grove.count;
      for (var t = 0; t < count; t++) {
        var seed = cluster * 13 + t * 7, u = grove.u + (t - (count - 1) / 2) * 0.012;
        var index = Math.floor((u + 1) % 1 * outline.length), ring = 2 + (t + cluster) % 3, p = nearGrid[ring][index];
        var h = 4.4 + (Math.sin(seed * 1.13 + 0.6) * 0.5 + 0.5) * 3.7, radius = h * (0.24 + (t % 3) * 0.02), twist = seed * 0.73;
        var leaf = leaves[(cluster + t) % 3];
        trunk(trunks, p[0], p[1] - 0.25, p[2], h * 0.035, h * 0.77, bark, twist);
        crown(foliage, p[0], p[1] + h * 0.14, p[2], radius, h * 0.55, leaf, twist, seed);
        crown(foliage, p[0], p[1] + h * 0.40, p[2], radius * 0.74, h * 0.47, leaf.clone().lerp(tips, 0.09), twist + 0.24, seed + 2);
        crown(foliage, p[0], p[1] + h * 0.65, p[2], radius * 0.45, h * 0.39, leaf.clone().lerp(tips, 0.2), twist - 0.13, seed + 4);
        treeCount++;
      }
    });
    var rockLow = color(0x677060), rockTop = color(0x929586), rockCount = saver ? 6 : 12;
    for (var rock = 0; rock < rockCount; rock++) {
      var ri = Math.floor(((0.115 + rock * 0.173) % 1) * outline.length), rp = nearGrid[2 + rock % 2][ri];
      var size = 0.85 + (rock * 7 % 9) * 0.15, twist = rock * 0.71, bottom = [], shoulder = [];
      for (var corner = 0; corner < 6; corner++) {
        var a = twist + corner * Math.PI / 3, rad = size * (1 + Math.sin(corner * 2.1 + rock) * 0.18);
        bottom.push([rp[0] + Math.cos(a) * rad, rp[1] - size * 0.35, rp[2] + Math.sin(a) * rad * 0.72]);
        shoulder.push([rp[0] + Math.cos(a) * rad * 0.78, rp[1] + size * (0.36 + Math.sin(corner + rock) * 0.1), rp[2] + Math.sin(a) * rad * 0.62]);
      }
      var top = [rp[0] + size * 0.15, rp[1] + size * 0.72, rp[2] - size * 0.1];
      for (var edge = 0; edge < 6; edge++) {
        var next = (edge + 1) % 6;
        triangle(accents, bottom[edge], shoulder[edge], bottom[next], rockLow);
        triangle(accents, bottom[next], shoulder[edge], shoulder[next], rockLow);
        triangle(accents, shoulder[edge], top, shoulder[next], rockTop);
      }
    }
    var grassCount = saver ? 12 : 36, grassLow = color(0x576e46), grassTip = color(0x8b9560);
    for (var tuft = 0; tuft < grassCount; tuft++) {
      var gi = Math.floor(((0.067 + tuft * 0.137) % 1) * outline.length), gp = nearGrid[1 + tuft % 3][gi];
      for (var blade = 0; blade < 3; blade++) {
        var a = tuft * 1.7 + blade * Math.PI / 3, h = 0.7 + (tuft * 3 + blade * 5) % 7 * 0.12, w = 0.11 + blade * 0.025;
        var dx = Math.cos(a), dz = Math.sin(a);
        var p = [gp[0] - dx * w, gp[1] - 0.1, gp[2] - dz * w], q = [gp[0] + dx * w, gp[1] - 0.1, gp[2] + dz * w];
        var bend = [gp[0] + dx * h * 0.13, gp[1] + h * 0.54, gp[2] + dz * h * 0.13], tip = [gp[0] + dx * h * 0.38, gp[1] + h, gp[2] + dz * h * 0.38];
        triangle(accents, p, bend, q, grassLow); triangle(accents, q, bend, tip, grassTip);
      }
    }
    group.add(meshFrom(trunks, 'gw-distant-tree-trunks', false, false));
    group.add(meshFrom(foliage, 'gw-distant-tree-canopies', false, false));
    group.add(meshFrom(accents, 'gw-natural-accents', false, true));
    group.userData.gwLandscapeDetail = { tier: saver ? 'saver' : 'detail', trees: treeCount, rocks: rockCount, grassTufts: grassCount };
    engine._landscape = group; engine.scene.add(group);
  };
})();
