/* BirdLab woodland observation habitat. Three.js r128; no network assets.
 * Terrain sampling, alpha-cut instanced boughs, matching depth materials and
 * world-aligned vegetation wind adapt the Raptor Lab landscape approach.
 * All geometry, texture marks and placement below use a local deterministic seed.
 */
(function (global) {
  'use strict';

  function create(THREE, scene, options) {
    options = options || {};
    var detailed = options.quality !== 'low';
    var root = new THREE.Group();
    root.name = 'birdlab-woodland-habitat';
    scene.add(root);
    var seed = 972031, resources = [], disposed = false;
    var clock = { value: 0 }, cyclePhase = { value: 0 }, breeze = { value: new THREE.Vector3(0.12, 0, 0.05) };
    var dummy = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0);
    var direction = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3();
    function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
    function keep(value) { resources.push(value); return value; }
    function linear(hex) { return new THREE.Color(hex).convertSRGBToLinear(); }
    function material(parameters) { return keep(new THREE.MeshStandardMaterial(parameters)); }
    function geometry(value) { return keep(value); }
    function canvas(size) { var value = document.createElement('canvas'); value.width = value.height = size; return value; }
    function texture(value, repeat) {
      var result = keep(new THREE.CanvasTexture(value));
      result.encoding = THREE.sRGBEncoding;
      result.anisotropy = detailed ? 4 : 2;
      if (repeat) { result.wrapS = result.wrapT = THREE.RepeatWrapping; result.repeat.set(repeat, repeat); }
      return result;
    }
    function smooth(value) { value = Math.max(0, Math.min(1, value)); return value * value * (3 - 2 * value); }
    function hash(x, z) { var value = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return value - Math.floor(value); }
    function noise(x, z) {
      var ix = Math.floor(x), iz = Math.floor(z), u = smooth(x - ix), v = smooth(z - iz);
      return (hash(ix, iz) * (1 - u) + hash(ix + 1, iz) * u) * (1 - v) +
        (hash(ix, iz + 1) * (1 - u) + hash(ix + 1, iz + 1) * u) * v;
    }
    function groundHeight(x, z) {
      // A quiet, level observation clearing opens into gently folded woodland.
      var shelter = smooth((Math.hypot(x, z) - 3.5) / 14);
      return shelter * (Math.sin(x * 0.055) * Math.cos(z * 0.068) * 2.9 +
        Math.sin(x * 0.137 + 1.1) * Math.sin(z * 0.096) * 0.72 + (noise(x * 0.11, z * 0.11) - 0.5) * 0.48);
    }

    // Microrelief and leaf litter are continuous ground texture, not floating decals.
    var soilCanvas = canvas(512), soil = soilCanvas.getContext('2d');
    soil.fillStyle = '#aaa392'; soil.fillRect(0, 0, 512, 512);
    for (var hummock = 0; hummock < 170; hummock++) {
      var hx = random() * 512, hy = random() * 512, hr = 7 + random() * 43;
      var humus = soil.createRadialGradient(hx, hy, 0, hx, hy, hr);
      humus.addColorStop(0, hummock % 3 ? 'rgba(79,68,49,.20)' : 'rgba(187,191,145,.22)');
      humus.addColorStop(1, 'rgba(121,108,75,0)'); soil.fillStyle = humus;
      soil.fillRect(hx - hr, hy - hr, hr * 2, hr * 2);
    }
    for (var speck = 0; speck < 15000; speck++) {
      var grey = Math.floor(103 + random() * 90);
      soil.fillStyle = 'rgba(' + grey + ',' + grey + ',' + grey + ',.21)';
      soil.fillRect(random() * 512, random() * 512, 1 + random() * 3, 1 + random() * 2);
    }
    for (var litter = 0; litter < 1850; litter++) {
      var lx = random() * 512, ly = random() * 512, turn = random() * Math.PI;
      soil.save(); soil.translate(lx, ly); soil.rotate(turn);
      var leafLength = 2.5 + random() * 8.5, leafWidth = leafLength * (0.26 + random() * 0.22);
      soil.fillStyle = ['rgba(71,63,47,.37)', 'rgba(135,110,74,.32)', 'rgba(179,156,115,.31)', 'rgba(73,78,49,.30)'][litter % 4];
      soil.beginPath(); soil.moveTo(-leafLength, 0);
      soil.bezierCurveTo(-leafLength * 0.2, -leafWidth, leafLength * 0.8, -leafWidth * 0.75, leafLength, 0);
      soil.bezierCurveTo(leafLength * 0.3, leafWidth, -leafLength * 0.6, leafWidth, -leafLength, 0); soil.fill();
      soil.strokeStyle = 'rgba(59,51,37,.25)'; soil.lineWidth = 0.45;
      soil.beginPath(); soil.moveTo(-leafLength, 0); soil.lineTo(leafLength * 0.8, 0.35); soil.stroke();
      // Fine lateral veins and a lifted dry edge keep nearby litter legible.
      // Texture-only marks use the coordinate hash, never the placement stream.
      soil.strokeStyle = 'rgba(61,52,37,.17)'; soil.lineWidth = 0.3;
      for (var vein = 1; vein < 4; vein++) {
        var veinX = -leafLength * 0.6 + vein * leafLength * 0.34;
        var veinReach = leafWidth * (0.65 + hash(litter, vein) * 0.20);
        soil.beginPath(); soil.moveTo(veinX - leafLength * 0.17, 0);
        soil.lineTo(veinX, -veinReach); soil.moveTo(veinX - leafLength * 0.12, 0);
        soil.lineTo(veinX + leafLength * 0.06, veinReach); soil.stroke();
      }
      soil.strokeStyle = 'rgba(196,174,136,.14)'; soil.lineWidth = 0.45;
      soil.beginPath(); soil.moveTo(-leafLength * 0.65, leafWidth * 0.34);
      soil.quadraticCurveTo(leafLength * 0.22, leafWidth * 0.77, leafLength * 0.85, leafWidth * 0.1); soil.stroke();
      soil.restore();
    }
    for (var twig = 0; twig < 145; twig++) {
      soil.strokeStyle = 'rgba(55,48,36,.40)'; soil.lineWidth = 0.6 + random() * 0.8;
      var twigX = random() * 512, twigY = random() * 512;
      soil.beginPath(); soil.moveTo(twigX, twigY); soil.lineTo(twigX + random() * 22 - 11, twigY + random() * 30 - 15); soil.stroke();
    }
    var soilMap = texture(soilCanvas, 30);
    // A separate small-scale moss surface lets colonies cover the dry litter,
    // rather than merely turning the same uniformly leaf-strewn soil green.
    var mossCanvas = canvas(256), mossCtx = mossCanvas.getContext('2d');
    var mossPixels = mossCtx.createImageData(256, 256);
    for (var mossY = 0; mossY < 256; mossY++) {
      for (var mossX = 0; mossX < 256; mossX++) {
        var mossCushion = noise(mossX * 0.045, mossY * 0.045) * 31 + noise(mossX * 0.21, mossY * 0.21) * 26;
        var mossGrain = hash(mossX, mossY) * 30, mossPixel = (mossY * 256 + mossX) * 4;
        mossPixels.data[mossPixel] = 105 + mossCushion + mossGrain;
        mossPixels.data[mossPixel + 1] = 121 + mossCushion + mossGrain;
        mossPixels.data[mossPixel + 2] = 81 + mossCushion + mossGrain * 0.8;
        mossPixels.data[mossPixel + 3] = 255;
      }
    }
    mossCtx.putImageData(mossPixels, 0, 0);
    var mossMap = texture(mossCanvas, 1);
    mossMap.wrapS = mossMap.wrapT = THREE.RepeatWrapping;
    var groundGeo = geometry(new THREE.PlaneGeometry(150, 150, detailed ? 128 : 80, detailed ? 128 : 80));
    groundGeo.rotateX(-Math.PI / 2);
    var groundPos = groundGeo.attributes.position;
    var groundColors = new Float32Array(groundPos.count * 3), groundMoss = new Float32Array(groundPos.count);
    var earth = linear(0x796a54), moss = linear(0x64714a), shaded = linear(0x5b5342), tint = new THREE.Color();
    function mossColony(x, z) {
      var dampness = noise(x * 0.12 + noise(x * 0.038, z * 0.038) * 3, z * 0.12);
      var brokenEdge = noise(x * 0.42 + 13, z * 0.42 - 4) * 0.20;
      var trailDistance = Math.abs(x - 3.5 - Math.sin(z * 0.09) * 3);
      return smooth((dampness + brokenEdge - 0.31) / 0.43) * smooth(trailDistance / 2.5);
    }
    for (var vertex = 0; vertex < groundPos.count; vertex++) {
      var gx = groundPos.getX(vertex), gz = groundPos.getZ(vertex);
      groundPos.setY(vertex, groundHeight(gx, gz));
      var trail = Math.exp(-Math.pow((gx - 3.5 - Math.sin(gz * 0.09) * 3) / 2.4, 2));
      var mossPatch = mossColony(gx, gz);
      tint.copy(shaded).lerp(moss, mossPatch * 0.84).lerp(earth, trail * 0.54 + noise(gx * 0.37, gz * 0.37) * 0.14);
      groundMoss[vertex] = mossPatch;
      groundColors[vertex * 3] = tint.r;
      groundColors[vertex * 3 + 1] = tint.g;
      groundColors[vertex * 3 + 2] = tint.b;
    }
    groundGeo.setAttribute('color', new THREE.BufferAttribute(groundColors, 3));
    groundGeo.setAttribute('blMossCoverage', new THREE.BufferAttribute(groundMoss, 1));
    groundGeo.computeVertexNormals();
    var groundMat = material({ color: 0xffffff, map: soilMap, bumpMap: soilMap, bumpScale: 0.013, vertexColors: true, roughness: 1 });
    groundMat.onBeforeCompile = function (shader) {
      shader.uniforms.blMossMap = { value: mossMap };
      shader.vertexShader = 'attribute float blMossCoverage; varying float blMossCover;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nblMossCover = blMossCoverage;');
      shader.fragmentShader = 'uniform sampler2D blMossMap; varying float blMossCover;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', [
        '#ifdef USE_MAP',
        'vec4 blSoilAlbedo = mapTexelToLinear(texture2D(map, vUv));',
        'vec4 blMossAlbedo = mapTexelToLinear(texture2D(blMossMap, vUv * 2.13));',
        'float blColony = smoothstep(.16, .83, blMossCover + (blMossAlbedo.g - .35) * .16);',
        'diffuseColor *= mix(blSoilAlbedo, blMossAlbedo, blColony);',
        '#endif'
      ].join('\n'));
    };
    groundMat.customProgramCacheKey = function () { return 'birdlab-moss-litter-surface-v1'; };
    var ground = new THREE.Mesh(groundGeo, groundMat);
    ground.name = 'continuous-woodland-ground'; ground.receiveShadow = true; root.add(ground);

    // A connected far ridge closes the view between trunks without a wall of trees.
    var ridgePositions = [], ridgeColors = [], ridgeIndices = [];
    var ridgeSegments = 80, ridgeRings = 7, ridgeColor = linear(0x687662);
    for (var ring = 0; ring < ridgeRings; ring++) {
      var distance = 62 + ring * 15;
      for (var sector = 0; sector <= ridgeSegments; sector++) {
        var bearing = sector / ridgeSegments * Math.PI * 2;
        var hx = Math.cos(bearing) * distance, hz = Math.sin(bearing) * distance;
        var horizonLift = smooth(ring / (ridgeRings - 1)) * (8 + Math.sin(bearing * 3.2 + 0.6) * 4 + Math.sin(bearing * 7.3) * 1.5);
        ridgePositions.push(hx, groundHeight(hx, hz) - 0.24 + horizonLift, hz);
        var ridgeShade = 0.78 + noise(hx * 0.048, hz * 0.048) * 0.32;
        ridgeColors.push(ridgeColor.r * ridgeShade, ridgeColor.g * ridgeShade, ridgeColor.b * ridgeShade);
        if (ring > 0 && sector < ridgeSegments) {
          var outer = ring * (ridgeSegments + 1) + sector, inner = outer - ridgeSegments - 1;
          ridgeIndices.push(inner, outer + 1, outer, inner, inner + 1, outer + 1);
        }
      }
    }
    var ridgeGeo = geometry(new THREE.BufferGeometry());
    ridgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(ridgePositions, 3));
    ridgeGeo.setAttribute('color', new THREE.Float32BufferAttribute(ridgeColors, 3));
    ridgeGeo.setIndex(ridgeIndices); ridgeGeo.computeVertexNormals();
    var ridge = new THREE.Mesh(ridgeGeo, material({ color: 0xffffff, vertexColors: true, roughness: 1 }));
    ridge.name = 'distant-connected-woodland-ridge'; root.add(ridge);

    // Continuous, gently warped grain carries shallow cracks and scattered
    // lichen. Height is independent of albedo: a pale lichen fleck is not a ridge.
    // Keep the existing random draws below so material refinements never move
    // any tree, plant, stone or branch in the seeded observation clearing.
    var barkCanvas = canvas(512), bark = barkCanvas.getContext('2d');
    var barkHeightCanvas = canvas(512), barkHeight = barkHeightCanvas.getContext('2d');
    var barkPixels = bark.createImageData(512, 512), barkHeightPixels = barkHeight.createImageData(512, 512);
    for (var grainY = 0; grainY < 512; grainY++) {
      for (var grainX = 0; grainX < 512; grainX++) {
        var warp = (noise(grainX * 0.021, grainY * 0.035) - 0.5) * 4;
        var growth = noise((grainX + warp) * 0.17, grainY * 0.045) - 0.5;
        var fibre = noise((grainX + warp) * 0.74, grainY * 0.10) - 0.5;
        var grain = hash(grainX, grainY) - 0.5;
        var weathering = (noise(grainX * 0.024, grainY * 0.011) - 0.5) * 14;
        var barkTone = weathering + growth * 20 + fibre * 13 + grain * 10;
        var barkRelief = 128 + growth * 24 + fibre * 20 + grain * 5, grainPixel = (grainY * 512 + grainX) * 4;
        barkPixels.data[grainPixel] = 157 + barkTone;
        barkPixels.data[grainPixel + 1] = 151 + barkTone * 0.95;
        barkPixels.data[grainPixel + 2] = 136 + barkTone * 0.90;
        barkPixels.data[grainPixel + 3] = 255;
        barkHeightPixels.data[grainPixel] = barkHeightPixels.data[grainPixel + 1] = barkHeightPixels.data[grainPixel + 2] = barkRelief;
        barkHeightPixels.data[grainPixel + 3] = 255;
      }
    }
    bark.putImageData(barkPixels, 0, 0); barkHeight.putImageData(barkHeightPixels, 0, 0);
    for (var plate = 0; plate < 960; plate++) {
      var plateX = random() * 512, plateY = random() * 512, plateW = 3 + random() * 15, plateH = 5 + random() * 29;
      bark.strokeStyle = plate % 3 ? 'rgba(65,57,46,.15)' : 'rgba(220,212,192,.18)';
      bark.lineWidth = 0.38 + plateW * 0.035;
      bark.beginPath(); bark.moveTo(plateX, plateY);
      bark.bezierCurveTo(plateX + plateW * 0.09, plateY + plateH * 0.32,
        plateX - plateW * 0.06, plateY + plateH * 0.74, plateX + plateW * 0.04, plateY + plateH); bark.stroke();
    }
    for (var fissure = 0; fissure < 195; fissure++) {
      var bx = random() * 512, by = random() * 512, length = 5 + random() * 43;
      var crackWidth = 0.5 + random() * 2.0;
      var crackA = bx - 3 + random() * 6, crackB = bx - 6 + random() * 12, crackEnd = bx - 4 + random() * 8;
      [bark, barkHeight].forEach(function (surface, surfaceIndex) {
        surface.strokeStyle = surfaceIndex ? 'rgba(61,61,61,.25)' : 'rgba(53,47,38,.25)';
        surface.lineWidth = crackWidth * (surfaceIndex ? 0.63 : 0.47);
        surface.beginPath(); surface.moveTo(bx, by);
        surface.bezierCurveTo(crackA, by + length * 0.3, crackB, by + length * 0.72, crackEnd, by + length); surface.stroke();
      });
    }
    for (var knot = 0; knot < 9; knot++) {
      var knotX = random() * 512, knotY = random() * 512;
      for (var knotRing = 1; knotRing < 5; knotRing++) {
        bark.strokeStyle = 'rgba(58,51,42,' + (0.19 - knotRing * 0.029) + ')'; bark.lineWidth = 0.55;
        bark.beginPath(); bark.ellipse(knotX, knotY, knotRing * 2.1, knotRing * 4.4, 0.1, 0, Math.PI * 2); bark.stroke();
      }
    }
    for (var lichen = 0; lichen < 235; lichen++) {
      var lichenX = random() * 512, lichenY = random() * 512;
      var lichenW = 2 + random() * 10, lichenH = 3 + random() * 17, lichenTurn = random() * 6;
      bark.save(); bark.translate(lichenX, lichenY); bark.rotate(lichenTurn);
      for (var fleck = 0; fleck < 7; fleck++) {
        var fleckX = (hash(lichen, fleck) - 0.5) * lichenW;
        var fleckY = (hash(fleck + 31, lichen) - 0.5) * lichenH;
        bark.fillStyle = lichen % 3 ? 'rgba(193,198,165,.16)' : 'rgba(82,97,70,.13)';
        bark.beginPath(); bark.ellipse(fleckX, fleckY, 0.55 + hash(lichen + 7, fleck) * 1.8,
          0.7 + hash(fleck, lichen + 19) * 2.4, fleck * 0.9, 0, Math.PI * 2); bark.fill();
      }
      bark.restore();
    }
    var barkMap = texture(barkCanvas, 1);
    var barkBump = texture(barkHeightCanvas, 1); barkBump.encoding = THREE.LinearEncoding;
    var barkMat = material({ color: linear(0x7d7160), map: barkMap, bumpMap: barkBump, bumpScale: 0.014, roughness: 0.98 });
    var dryBarkMat = material({ color: linear(0xa29a89), map: barkMap, bumpMap: barkBump, bumpScale: 0.007, roughness: 0.98 });
    var branchGeo = geometry(new THREE.CylinderGeometry(0.66, 1, 1, detailed ? 9 : 6, 1));
    var branchPos = branchGeo.attributes.position;
    for (var barkPoint = 0; barkPoint < branchPos.count; barkPoint++) {
      var barkX = branchPos.getX(barkPoint), barkY = branchPos.getY(barkPoint), barkZ = branchPos.getZ(barkPoint);
      var fluting = 1 + Math.sin(Math.atan2(barkZ, barkX) * 5 + barkY * 2) * 0.045;
      branchPos.setXYZ(barkPoint, barkX * fluting, barkY, barkZ * fluting);
    }
    branchGeo.computeVertexNormals();
    var branches = [], leaves = [[], []], treeLocations = [];
    function branch(start, end, radius, dry) { branches.push({ a: start, b: end, r: radius, dry: !!dry }); }
    function leafCard(x, y, z, sx, sy, sz, angle, lean, type) {
      leaves[type].push({ x: x, y: y, z: z, sx: sx, sy: sy, sz: sz, angle: angle, lean: lean, shade: 0.8 + random() * 0.38 });
    }
    function tree(x, z, height, pine) {
      var y = groundHeight(x, z), bend = (random() - 0.5) * height * 0.13;
      var radius = height * (pine ? 0.022 : 0.025);
      treeLocations.push({ x: x, z: z, radius: height * 0.32 });
      var sway = (random() - 0.5) * height * 0.052;
      function trunkAt(fraction) {
        return [x + bend * fraction + Math.sin(fraction * Math.PI) * sway,
          y + height * fraction, z - bend * fraction * 0.38 + Math.sin(fraction * 4) * sway * 0.42];
      }
      // Successive sections meet at the preceding tapered radius. Smaller
      // changes in direction give the stem an organic sweep through the crown.
      var stemFractions = [0, 0.25, 0.52, 0.77, 0.99];
      for (var stemSection = 0; stemSection < 4; stemSection++) {
        var stemStart = trunkAt(stemFractions[stemSection]), stemEnd = trunkAt(stemFractions[stemSection + 1]);
        if (!stemSection) stemStart[1] -= 0.13;
        branch(stemStart, stemEnd, radius * Math.pow(0.66, stemSection));
      }
      if (pine) {
        for (var tier = 0; tier < 6; tier++) {
          var fraction = tier / 6, reach = height * 0.22 * (1 - fraction * 0.76);
          var level = y + height * (0.39 + fraction * 0.55);
          for (var spoke = 0; spoke < 5; spoke++) {
            var bearing = spoke * Math.PI * 0.4 + tier * 1.7 + random() * 0.35;
            var reachHere = reach * (0.72 + random() * 0.5);
            var boughLevel = level + (random() - 0.5) * height * 0.072;
            var px = x + Math.cos(bearing) * reachHere, pz = z + Math.sin(bearing) * reachHere;
            var sag = height * (0.015 + random() * 0.035), boughBase = trunkAt((boughLevel - y) / height);
            branch(boughBase, [px, boughLevel - sag, pz], radius * 0.16 * (1 - fraction * 0.7));
            leafCard((boughBase[0] + px) * 0.5, boughLevel - sag * 0.28, (boughBase[2] + pz) * 0.5,
              reachHere * (0.47 + random() * 0.13), height * (0.050 + random() * 0.024), reachHere * 0.49,
              bearing + (random() - 0.5) * 0.7, -0.13 - random() * 0.32, 1);
          }
        }
      } else {
        var sectors = detailed ? 6 : 4;
        for (var fork = 0; fork < sectors; fork++) {
          var angle = fork * 2.39996 + random() * 0.6;
          var extent = height * (0.14 + random() * 0.095);
          var crownLevel = 0.57 + fork / sectors * 0.23 + random() * 0.10;
          var ey = y + height * crownLevel;
          var ex = x + Math.cos(angle) * extent, ez = z + Math.sin(angle) * extent;
          var from = trunkAt(crownLevel - 0.22 - random() * 0.05);
          var bendSide = (random() - 0.5) * extent * 0.24, boughRadius = radius * (0.36 - fork / sectors * 0.09);
          var boughPoints = [from,
            [from[0] + (ex - from[0]) * 0.30 - Math.sin(angle) * bendSide, from[1] + (ey - from[1]) * 0.43, from[2] + (ez - from[2]) * 0.30 + Math.cos(angle) * bendSide],
            [from[0] + (ex - from[0]) * 0.68 - Math.sin(angle) * bendSide * 0.6, from[1] + (ey - from[1]) * 0.77, from[2] + (ez - from[2]) * 0.68 + Math.cos(angle) * bendSide * 0.6],
            [ex, ey, ez]];
          for (var segment = 0; segment < 3; segment++) branch(boughPoints[segment], boughPoints[segment + 1], boughRadius * Math.pow(0.66, segment));
          for (var spray = 0; spray < (detailed ? 9 : 6); spray++) {
            // Distribute sprays through an ellipsoid, not one ring at the end
            // of a fork. Different crown heights leave gaps and rounded lobes.
            var spin = spray * 2.39996 + angle, vertical = 1 - (spray + 0.5) / (detailed ? 9 : 6) * 2;
            var spread = Math.sqrt(Math.max(0, 1 - vertical * vertical)) * height * (0.058 + random() * 0.028);
            var sx = ex + Math.cos(spin) * spread, sz = ez + Math.sin(spin) * spread;
            var sy = ey + vertical * height * 0.12 + (random() - 0.5) * height * 0.035;
            if (spray < 2) branch([ex, ey, ez], [sx, sy, sz], radius * 0.065);
            var breadth = height * (0.052 + random() * 0.029);
            leafCard(sx, sy, sz, breadth * 0.94, breadth * (1.12 + random() * 0.35), breadth * 0.88,
              spin, (random() - 0.5) * 0.85, 0);
          }
        }
        var apex = trunkAt(0.89);
        leafCard(apex[0], apex[1], apex[2], height * 0.074, height * 0.116, height * 0.070, random() * 6, 0.16, 0);
      }
      // Small buttress roots sit in the soil and break up the straight trunk foot.
      for (var rootIndex = 0; rootIndex < 3; rootIndex++) {
        var rootAngle = rootIndex * 2.1 + random();
        var rootReach = radius * (2.6 + random() * 1.3);
        var rx = x + Math.cos(rootAngle) * rootReach, rz = z + Math.sin(rootAngle) * rootReach;
        branch([rx, groundHeight(rx, rz) - radius * 0.16, rz], [x, y + radius * 1.35, z], radius * 0.39);
      }
    }
    // Reserve a corridor around the actual continuous flight course, including the
    // follow/orbit camera and the full crown radius. Trunk-only clearance lets
    // wide boughs intrude into the bird and camera at the far end of a bank.
    var courseSamples = [];
    if (global.BirdLab3D && typeof global.BirdLab3D.sampleFlight === 'function') {
      for (var courseTime = 0; courseTime < (global.BirdLab3D.courseDuration || 44); courseTime += 0.125) {
        var flightPosition = global.BirdLab3D.sampleFlight(courseTime).position;
        courseSamples.push([flightPosition[0], flightPosition[2]]);
      }
    } else {
      // Standalone landscape previews have no engine. This conservative route
      // follows its knots; the live scene always uses the sampled Hermite path.
      var routeKnots = [[0, 0], [0, -3.1], [-4.7, -16], [-17, -20], [-12, 1], [10, 7], [17, -13], [12, 6], [1, 8], [0, 3], [0, 0]];
      for (var knot = 1; knot < routeKnots.length; knot++) {
        for (var substep = 0; substep <= 20; substep++) {
          var blend = substep / 20;
          courseSamples.push([routeKnots[knot - 1][0] * (1 - blend) + routeKnots[knot][0] * blend,
            routeKnots[knot - 1][1] * (1 - blend) + routeKnots[knot][1] * blend]);
        }
      }
    }
    function clearsFlightCourse(x, z, height, pine) {
      var crownRadius = height * (pine ? 0.37 : 0.55);
      var clearance = crownRadius + 4.6; // 3 m camera, wing tips, gust and sample margin.
      if (!global.BirdLab3D) clearance += 3; // Hermite overshoot in standalone previews.
      var clearanceSquared = clearance * clearance;
      for (var sample = 0; sample < courseSamples.length; sample++) {
        var dx = x - courseSamples[sample][0], dz = z - courseSamples[sample][1];
        if (dx * dx + dz * dz < clearanceSquared) return false;
      }
      return true;
    }
    // Keep the open center and camera approach, with irregular wooded margins.
    var wantedTrees = detailed ? 110 : 68;
    for (var candidate = 0, planted = 0; candidate < 1000 && planted < wantedTrees; candidate++) {
      var tx = (random() - 0.5) * 118, tz = (random() - 0.5) * 118;
      if (Math.pow(tx / 18, 2) + Math.pow(tz / 16, 2) < 1) continue;
      if (tz > 0 && Math.abs(tx) < 13 && tz < 37) continue;
      if (noise(tx * 0.05, tz * 0.05) < 0.23) continue;
      var th = 10 + random() * 11, isPine = random() < 0.22;
      if (!clearsFlightCourse(tx, tz, th, isPine)) continue;
      tree(tx, tz, th, isPine);
      planted++;
    }

    // Several ages of growth gather at the wooded edge. Low bushes and saplings
    // share the trunk/canopy batches, so a fuller understory adds no draw calls.
    for (var sapling = 0; sapling < (detailed ? 29 : 17); sapling++) {
      var saplingAngle = random() * Math.PI * 2, saplingRadius = 21 + random() * 38;
      var saplingX = Math.cos(saplingAngle) * saplingRadius, saplingZ = Math.sin(saplingAngle) * saplingRadius;
      var saplingHeight = 2.6 + random() * 4.7;
      if (clearsFlightCourse(saplingX, saplingZ, saplingHeight, false)) tree(saplingX, saplingZ, saplingHeight, false);
    }
    for (var shrub = 0; shrub < (detailed ? 190 : 95); shrub++) {
      var hostTree = treeLocations[Math.floor(random() * treeLocations.length)];
      if (!hostTree) break;
      var shrubAngle = random() * Math.PI * 2, shrubDistance = 1 + random() * hostTree.radius;
      var shrubX = hostTree.x + Math.cos(shrubAngle) * shrubDistance;
      var shrubZ = hostTree.z + Math.sin(shrubAngle) * shrubDistance;
      var shrubHeight = 0.35 + random() * 1.20;
      if (!clearsFlightCourse(shrubX, shrubZ, shrubHeight, false)) continue;
      var shrubY = groundHeight(shrubX, shrubZ);
      for (var shoot = 0; shoot < 3; shoot++) {
        var shootAngle = shoot * 2.4 + shrubAngle, shootSpread = shrubHeight * (0.2 + random() * 0.28);
        var shootX = shrubX + Math.cos(shootAngle) * shootSpread, shootZ = shrubZ + Math.sin(shootAngle) * shootSpread;
        var shootY = shrubY + shrubHeight * (0.66 + random() * 0.3);
        branch([shrubX, shrubY - 0.04, shrubZ], [shootX, shootY, shootZ], 0.012 + shrubHeight * 0.009);
        leafCard(shootX, shootY, shootZ, shrubHeight * 0.46, shrubHeight * 0.64, shrubHeight * 0.46, shootAngle, 0.24, 0);
      }
    }

    // A brown, humus-rich bed beneath each crown ties roots to the terrain.
    // Vertex tint is baked once; there are no extra floating shadow planes.
    var humusTint = linear(0x5d4c37);
    for (var soilVertex = 0; soilVertex < groundPos.count; soilVertex++) {
      var soilX = groundPos.getX(soilVertex), soilZ = groundPos.getZ(soilVertex), cover = 0;
      treeLocations.forEach(function (location) {
        var soilDx = soilX - location.x, soilDz = soilZ - location.z;
        var canopyCover = Math.max(0, 1 - (soilDx * soilDx + soilDz * soilDz) / (location.radius * location.radius));
        cover = Math.max(cover, canopyCover);
      });
      tint.fromArray(groundColors, soilVertex * 3).lerp(humusTint, cover * 0.44);
      tint.toArray(groundColors, soilVertex * 3);
    }
    groundGeo.attributes.color.needsUpdate = true;

    // Canopy occlusion is a single terrain texture, keeping the forest floor grounded.
    var aoCanvas = canvas(512), ao = aoCanvas.getContext('2d');
    ao.fillStyle = '#ffffff'; ao.fillRect(0, 0, 512, 512);
    treeLocations.forEach(function (location) {
      var x = (location.x / 150 + 0.5) * 512, y = (0.5 - location.z / 150) * 512;
      var radius = location.radius / 150 * 512;
      var shade = ao.createRadialGradient(x, y, 0, x, y, radius);
      shade.addColorStop(0, 'rgba(0,0,0,.62)'); shade.addColorStop(0.4, 'rgba(0,0,0,.33)'); shade.addColorStop(1, 'rgba(0,0,0,0)');
      ao.fillStyle = shade; ao.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    });
    groundGeo.setAttribute('uv2', groundGeo.attributes.uv);
    groundMat.aoMap = texture(aoCanvas); groundMat.aoMapIntensity = 0.74;

    // Dead oak limb: the top of the landing segment is exactly the public perch.
    branch([-1.45, -0.12, -0.62], [-1.30, 1.50, -0.49], 0.23, true);
    branch([-1.30, 1.50, -0.49], [-1.03, 2.89, -0.20], 0.17, true);
    branch([-1.03, 2.89, -0.20], [-0.44, 3.115, -0.025], 0.11, true);
    branch([-0.44, 3.115, -0.025], [0.58, 3.14, 0.015], 0.083, true);
    branch([-1.18, 2.30, -0.35], [-1.94, 2.88, -0.73], 0.078, true);
    branch([-1.94, 2.88, -0.73], [-2.37, 3.04, -0.69], 0.036, true);
    branch([-1.03, 2.89, -0.20], [-1.11, 3.91, -0.48], 0.052, true);
    branch([-1.11, 3.91, -0.48], [-1.01, 4.09, -0.51], 0.032, true);
    branch([-1.01, 4.09, -0.51], [-0.95, 4.18, -0.52], 0.021, true);
    branch([-0.95, 4.18, -0.52], [-0.935, 4.235, -0.535], 0.0085, true);
    branch([-1.075, 3.98, -0.495], [-1.20, 4.07, -0.56], 0.010, true);
    branch([-1.45, 0.18, -0.62], [-2.03, 0.025, -0.91], 0.11, true);
    branch([-1.42, 0.18, -0.59], [-1.13, 0.015, -1.18], 0.10, true);
    // Fallen weathered branches make the foreground legible at close range.
    branch([-5.3, groundHeight(-5.3, -3) + 0.2, -3], [-2.8, groundHeight(-2.8, -3.8) + 0.09, -3.8], 0.19, true);
    branch([-4.6, groundHeight(-4.6, -3.2) + 0.21, -3.2], [-4.8, groundHeight(-4.8, -4.4) + 0.08, -4.4], 0.072, true);

    function makeBranches(dry) {
      var batch = branches.filter(function (entry) { return entry.dry === dry; });
      var mesh = new THREE.InstancedMesh(branchGeo, dry ? dryBarkMat : barkMat, batch.length);
      mesh.name = dry ? 'weathered-landing-limb' : 'branching-woodland-trunks';
      batch.forEach(function (entry, index) {
        a.fromArray(entry.a); b.fromArray(entry.b); direction.subVectors(b, a);
        dummy.position.copy(a).add(b).multiplyScalar(0.5);
        dummy.quaternion.setFromUnitVectors(up, direction.clone().normalize());
        dummy.scale.set(entry.r, direction.length(), entry.r); dummy.updateMatrix(); mesh.setMatrixAt(index, dummy.matrix);
        var barkShade = dry ? 0.84 + random() * 0.20 : 0.73 + random() * 0.32;
        tint.setRGB(barkShade, barkShade * (0.96 + random() * 0.06), barkShade * 0.91); mesh.setColorAt(index, tint);
      });
      mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true; mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.frustumCulled = false; root.add(mesh);
    }
    makeBranches(false); makeBranches(true);

    function canopyCanvas(pine, variant) {
      var cv = canvas(512), ctx = cv.getContext('2d');
      var textureSample = 0;
      // The original spray consumes exactly the established placement stream.
      // Additional variants draw from a separate hash, leaving the scene fixed.
      function leafRandom() { return variant ? hash(++textureSample + variant * 7919, variant * 103) : random(); }
      function stroke(x1, y1, x2, y2, width, shade) {
        ctx.strokeStyle = shade; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      }
      var leafShape = variant || 0;
      var limbCount = pine ? 15 : (leafShape === 1 ? 9 : leafShape === 2 ? 11 : leafShape === 3 ? 8 : 10);
      stroke(244, 467, 267, 76, 3.7, '#716c5a');
      for (var limb = 0; limb < limbCount; limb++) {
        var cy = 100 + limb * (pine ? 24 : leafShape ? 310 / (limbCount - 1) : 31), side = limb % 2 ? 1 : -1;
        var span = (pine ? 156 : 181) * Math.pow(Math.sin((limb + 1) / (limbCount + 1) * Math.PI), 0.5);
        if (leafShape) span *= 0.70 + hash(limb + 17, leafShape) * 0.28;
        var endX = 256 + side * span, endY = cy - 28 - leafRandom() * 28;
        if (leafShape) endY += (hash(limb + 39, leafShape) - 0.5) * 54;
        stroke(256, cy + 30, endX, endY, pine ? 2.2 : 1.8, '#aaa38a');
        for (var leaf = 0; leaf < (pine ? 76 : leafShape === 3 ? 31 : 25); leaf++) {
          var fraction = leafRandom(), px = 256 + side * span * fraction, py = cy + 30 + (endY - cy - 30) * fraction;
          var shade = Math.floor(144 + leafRandom() * 104);
          if (pine) {
            stroke(px, py, px + side * (4 + leafRandom() * 10), py - 7 - leafRandom() * 18, 1.6 + leafRandom(), 'rgb(' + shade + ',' + shade + ',' + Math.floor(shade * 0.91) + ')');
            if (leaf % 2) stroke(px, py, px + side * 6, py + 11, 1.3, '#abae98');
          } else {
            var smallSide = leaf % 2 ? 1 : -1, size = 7 + leafRandom() * 8;
            if (leafShape === 1) size *= 1.06;
            if (leafShape === 3) size *= 0.84;
            var ex = px + (leafRandom() - 0.5) * 15, ey = py + smallSide * (7 + leafRandom() * 18);
            stroke(px, py, ex, ey, 0.7, '#a29c7a');
            ctx.save(); ctx.translate(ex, ey); ctx.rotate(side * 0.7 + (leafRandom() - 0.5));
            if (leafShape === 1) ctx.scale(0.66, 1.13);
            if (leafShape === 2) ctx.scale(1.18, 0.83);
            if (leafShape === 3) ctx.scale(0.91, 1.02);
            var grad = ctx.createLinearGradient(-size, 0, size, 0);
            grad.addColorStop(0, 'rgb(' + Math.floor(shade * 0.67) + ',' + Math.floor(shade * 0.72) + ',' + Math.floor(shade * 0.60) + ')');
            grad.addColorStop(0.52, 'rgb(' + shade + ',' + shade + ',' + Math.floor(shade * 0.88) + ')');
            grad.addColorStop(1, '#c4c5a0'); ctx.fillStyle = grad;
            ctx.beginPath(); ctx.moveTo(0, -size);
            if (leafShape === 3) {
              // A finely scalloped margin adds a distinct, smaller leaf form.
              for (var edge = 1; edge < 13; edge++) {
                var edgeT = edge / 13, edgeWidth = Math.sin(edgeT * Math.PI) * size * (edge % 2 ? 0.62 : 0.49);
                ctx.lineTo(edgeWidth, (edgeT * 2 - 1) * size);
              }
              ctx.lineTo(0, size);
              for (var edgeBack = 12; edgeBack > 0; edgeBack--) {
                var backT = edgeBack / 13, backWidth = Math.sin(backT * Math.PI) * size * (edgeBack % 2 ? 0.57 : 0.47);
                ctx.lineTo(-backWidth, (backT * 2 - 1) * size);
              }
              ctx.closePath();
            } else {
              ctx.bezierCurveTo(size * 0.84, -size * 0.3, size * 0.56, size * 0.5, 0, size);
              ctx.bezierCurveTo(-size * 0.7, size * 0.4, -size * 0.67, -size * 0.55, 0, -size);
            }
            ctx.fill();
            stroke(0, -size * 0.72, 0, size * 0.8, 0.50, 'rgba(222,224,179,.47)');
            for (var leafVein = 0; leafVein < 4; leafVein++) {
              var veinLevel = -size * 0.52 + leafVein * size * 0.30;
              var veinSpan = size * (0.31 + Math.sin((leafVein + 1) / 5 * Math.PI) * 0.14);
              stroke(0, veinLevel + size * 0.17, veinSpan, veinLevel - size * 0.12, 0.33, 'rgba(221,221,177,.28)');
              stroke(0, veinLevel + size * 0.14, -veinSpan * 0.91, veinLevel - size * 0.09, 0.30, 'rgba(73,83,53,.20)');
            }
            // Occasional minute blemishes break up identical clean leaf faces.
            if (hash(limb + 1, leaf + 3) < 0.16) {
              ctx.fillStyle = 'rgba(79,72,44,.24)'; ctx.beginPath();
              ctx.ellipse(size * 0.25, -size * 0.17, size * 0.10, size * 0.16, 0.4, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
          }
        }
      }
      return cv;
    }
    function canopyTexture(pine) {
      var original = canopyCanvas(pine, 0);
      if (pine) return texture(original);
      // Four alpha sprites in one texture retain one foliage draw and one
      // shadow draw. Low quality uses a 512px atlas; high uses 1024px.
      var atlas = canvas(detailed ? 1024 : 512), atlasCtx = atlas.getContext('2d'), tile = atlas.width / 2;
      for (var variant = 0; variant < 4; variant++) {
        var sprayCanvas = variant ? canopyCanvas(false, variant) : original;
        atlasCtx.drawImage(sprayCanvas, (variant % 2) * tile + 4, Math.floor(variant / 2) * tile + 4, tile - 8, tile - 8);
      }
      return texture(atlas);
    }
    function cardGeometry() {
      var positions = [], uvs = [], normals = [], indices = [];
      function panel(points, normal) {
        var offset = positions.length / 3;
        points.forEach(function (point) { positions.push(point[0], point[1], point[2]); normals.push(normal[0], normal[1], normal[2]); });
        uvs.push(0, 0, 1, 0, 1, 1, 0, 1); indices.push(offset, offset + 1, offset + 2, offset, offset + 2, offset + 3);
      }
      for (var face = 0; face < 3; face++) {
        var turn = face * Math.PI / 3, c = Math.cos(turn), s = Math.sin(turn);
        var offset = (face - 1) * 0.18;
        panel([[-c * 0.88 - s * offset, -0.72, -s * 0.88 + c * offset],
          [c - s * offset, -0.62, s + c * offset],
          [c * 0.68 + s * 0.16, 0.88 - face * 0.07, s * 0.68 - c * 0.16],
          [-c * 0.79 + s * 0.16, 0.69 + face * 0.06, -s * 0.79 - c * 0.16]], [-s * 0.84, 0.52, c * 0.84]);
      }
      panel([[-0.71, -0.54, -0.74], [-0.67, 0.57, 0.72], [0.73, 0.77, 0.69], [0.80, -0.43, -0.65]], [0, 0.74, -0.67]);
      var result = geometry(new THREE.BufferGeometry());
      result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      result.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      result.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); result.setIndex(indices); return result;
    }
    function applyWind(mat, kind, atlas) {
      mat.onBeforeCompile = function (shader) {
        shader.uniforms.blHabitatTime = clock; shader.uniforms.blHabitatPhase = cyclePhase; shader.uniforms.blHabitatWind = breeze;
        shader.vertexShader = 'uniform float blHabitatTime; uniform float blHabitatPhase; uniform vec3 blHabitatWind;\n' + shader.vertexShader;
        if (atlas) {
          shader.vertexShader = 'attribute float blSprayVariant;\n' + shader.vertexShader;
          shader.vertexShader = shader.vertexShader.replace('#include <uv_vertex>', [
            '#include <uv_vertex>',
            '#if defined(USE_UV) && defined(USE_INSTANCING)',
            'vUv = (vUv + vec2(mod(blSprayVariant, 2.), floor(blSprayVariant / 2.))) * .5;',
            '#endif'
          ].join('\n'));
        }
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', [
          '#include <begin_vertex>',
          '#ifdef USE_INSTANCING',
          'vec3 blOrigin=(modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.)).xyz;',
          'vec3 blX=instanceMatrix[0].xyz,blY=instanceMatrix[1].xyz,blZ=instanceMatrix[2].xyz;',
          'vec3 blWind=vec3(dot(blHabitatWind,blX)/max(dot(blX,blX),.0001),dot(blHabitatWind,blY)/max(dot(blY,blY),.0001),dot(blHabitatWind,blZ)/max(dot(blZ,blZ),.0001));',
          'float blGust=.64+.24*sin(blHabitatPhase*6.+blOrigin.x*.17+blOrigin.z*.13)+.12*sin(blHabitatPhase*11.+blOrigin.z*.43);',
          kind === 'bough' ? 'float blFlex=pow(clamp(position.y+.5,0.,1.),1.6)*.52;' : 'float blFlex=position.y*position.y*.65;',
          'transformed+=blWind*blFlex*blGust;',
          '#endif'
        ].join('\n'));
      };
      mat.customProgramCacheKey = function () { return 'birdlab-woodland-wind-v3-' + kind + (atlas ? '-spray-atlas' : ''); };
    }
    var cards = cardGeometry();
    leaves.forEach(function (batch, kind) {
      if (!batch.length) return;
      var leafMap = canopyTexture(kind === 1);
      var mat = material({ color: linear(kind ? 0x698060 : 0x83925a), map: leafMap, alphaTest: 0.37, side: THREE.DoubleSide, roughness: 0.96 });
      applyWind(mat, 'bough', kind === 0);
      var sprayVariants = kind === 0 ? new Float32Array(batch.length) : null;
      if (sprayVariants) cards.setAttribute('blSprayVariant', new THREE.InstancedBufferAttribute(sprayVariants, 1));
      var instances = new THREE.InstancedMesh(cards, mat, batch.length);
      instances.name = kind ? 'airy-needle-boughs' : 'individual-leaf-sprays';
      var depth = keep(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: leafMap, alphaTest: 0.37, side: THREE.DoubleSide }));
      applyWind(depth, 'bough', kind === 0); instances.customDepthMaterial = depth;
      batch.forEach(function (leaf, index) {
        dummy.position.set(leaf.x, leaf.y, leaf.z); dummy.rotation.set(leaf.lean, leaf.angle, leaf.lean * 0.6);
        dummy.scale.set(leaf.sx, leaf.sy, leaf.sz); dummy.updateMatrix(); instances.setMatrixAt(index, dummy.matrix);
        var leafWarmth = random();
        tint.setRGB(leaf.shade * (0.84 + leafWarmth * 0.20), leaf.shade * (0.93 + leafWarmth * 0.07), leaf.shade * (0.73 + random() * 0.20)); instances.setColorAt(index, tint);
        if (sprayVariants) {
          var sprayVariant = Math.floor(hash(index + 139, 927) * 4);
          sprayVariants[index] = sprayVariant;
          // Pigment follows the spray form, with only modest shade variation.
          tint.r *= sprayVariant === 1 ? 0.94 : sprayVariant === 2 ? 1.045 : 1;
          tint.b *= sprayVariant === 3 ? 0.93 : sprayVariant === 1 ? 1.04 : 1;
          instances.setColorAt(index, tint);
        }
      });
      instances.instanceMatrix.needsUpdate = true; instances.instanceColor.needsUpdate = true;
      instances.frustumCulled = false; instances.castShadow = true; instances.receiveShadow = true; root.add(instances);
    });

    // Fine veins and softly serrated margins break the hard triangular outline
    // of fern leaflets without multiplying the number of foliage draw calls.
    var fernCanvas = canvas(256), fernCtx = fernCanvas.getContext('2d');
    var fernPixels = fernCtx.createImageData(256, 256);
    for (var fernY = 0; fernY < 256; fernY++) {
      var fernT = fernY / 255;
      var fernHalfWidth = Math.pow(Math.sin(fernT * Math.PI), 0.62) * 0.47;
      for (var fernX = 0; fernX < 256; fernX++) {
        var fernAcross = fernX / 255 - 0.5;
        var teeth = Math.sin(fernT * Math.PI * 32 + Math.sign(fernAcross) * 0.8) * 0.018;
        var fernEdge = fernHalfWidth * (0.96 + teeth);
        var fernAlpha = smooth((fernEdge - Math.abs(fernAcross)) * 256);
        var fernGrain = hash(fernX, fernY) * 6;
        var sideShade = fernAcross < 0 ? 0 : 8;
        var fernTone = 189 + Math.sin(fernT * Math.PI) * 18 + sideShade + fernGrain;
        var fernPixel = (fernY * 256 + fernX) * 4;
        fernPixels.data[fernPixel] = fernTone * 0.91;
        fernPixels.data[fernPixel + 1] = fernTone;
        fernPixels.data[fernPixel + 2] = fernTone * 0.81;
        fernPixels.data[fernPixel + 3] = fernAlpha * 255;
      }
    }
    fernCtx.putImageData(fernPixels, 0, 0);
    fernCtx.strokeStyle = 'rgba(224,228,184,.52)'; fernCtx.lineWidth = 1.1;
    fernCtx.beginPath(); fernCtx.moveTo(128, 5); fernCtx.lineTo(128, 251); fernCtx.stroke();
    for (var fernVein = 1; fernVein < 13; fernVein++) {
      var fy = fernVein * 19, fw = Math.sin(fy / 256 * Math.PI) * 101;
      fernCtx.strokeStyle = 'rgba(104,127,74,.24)'; fernCtx.lineWidth = 0.65;
      fernCtx.beginPath(); fernCtx.moveTo(128, fy + 15); fernCtx.quadraticCurveTo(128 - fw * 0.53, fy + 6, 128 - fw, fy - 8);
      fernCtx.moveTo(128, fy + 12); fernCtx.quadraticCurveTo(128 + fw * 0.54, fy + 1, 128 + fw, fy - 9); fernCtx.stroke();
    }
    var fernMap = texture(fernCanvas);

    // Shared strip vertices keep grass lighting continuous along every blade.
    function grassGeometry(fern) {
      var positions = [], colors = [], indices = [], uvs = [];
      var bladeCount = 7, bladeSegments = fern ? 4 : 3;
      for (var blade = 0; blade < bladeCount; blade++) {
        var angle = blade * 2.39996, c = Math.cos(angle), s = Math.sin(angle);
        var height = fern ? 0.6 + random() * 0.38 : 0.5 + random() * 0.5;
        var bend = fern ? 0.76 : 0.23 + random() * 0.42;
        var width = fern ? 0.013 : 0.016 + random() * 0.024;
        var stripStart = positions.length / 3;
        var bladeTwist = (hash(blade + 97, fern ? 1 : 0) - 0.5) * 0.075;
        for (var step = 0; step <= bladeSegments; step++) {
          var along = step / bladeSegments, reachAlong = along * along * bend;
          var heightAlong = Math.sin(along * 1.55) * height;
          var widthAlong = width * Math.max(0.012, Math.pow(1 - along, 0.86));
          var col = linear(fern ? 0x5b7544 : 0x687f46).multiplyScalar(0.52 + along * 0.43);
          [-1, 1].forEach(function (edge) {
            var twist = bladeTwist * along * along * edge;
            positions.push(c * reachAlong + s * widthAlong * edge, heightAlong + twist, s * reachAlong - c * widthAlong * edge);
            var bladeShade = edge < 0 ? 0.93 : 1.03;
            colors.push(col.r * bladeShade, col.g * bladeShade, col.b * bladeShade);
            // The fern's rachis samples the opaque midrib, not an alpha edge.
            uvs.push(fern ? 0.5 : (edge + 1) * 0.5, fern ? 0.5 : along);
          });
          if (step < bladeSegments) {
            var stripIndex = stripStart + step * 2;
            indices.push(stripIndex, stripIndex + 1, stripIndex + 3, stripIndex, stripIndex + 3, stripIndex + 2);
          }
        }
        if (fern) {
          var pinnaCount = detailed ? 9 : 7;
          for (var pinna = 1; pinna <= pinnaCount; pinna++) {
            var t = pinna / (pinnaCount + 2), reach = t * t * bend, yy = Math.sin(t * 1.55) * height;
            var length = Math.sin(t * Math.PI) * (0.22 + hash(blade, pinna) * 0.05), xx = c * reach, zz = s * reach;
            var fernColor = linear(0x6c8b4d).multiplyScalar(0.80 + t * 0.17 + hash(blade, pinna) * 0.04);
            [-1, 1].forEach(function (side) {
              var tipX = xx - s * length * side + c * length * 0.33, tipZ = zz + c * length * side + s * length * 0.33;
              var tipY = yy + length * (0.045 + hash(blade + side, pinna) * 0.1);
              var halfWidth = (0.021 + Math.sin(t * Math.PI) * 0.011) * (side > 0 ? 1 : 0.94);
              var leafletStart = positions.length / 3;
              [[xx - c * halfWidth, yy - 0.006, zz - s * halfWidth],
                [xx + c * halfWidth, yy + 0.007, zz + s * halfWidth],
                [tipX - c * halfWidth, tipY - 0.004, tipZ - s * halfWidth],
                [tipX + c * halfWidth, tipY + 0.005, tipZ + s * halfWidth]].forEach(function (point, pointIndex) {
                positions.push(point[0], point[1], point[2]);
                var tone = pointIndex % 2 ? 1.02 : 0.95;
                colors.push(fernColor.r * tone, fernColor.g * tone, fernColor.b * tone);
              });
              uvs.push(0, 0, 1, 0, 0, 1, 1, 1);
              indices.push(leafletStart, leafletStart + 2, leafletStart + 1, leafletStart + 1, leafletStart + 2, leafletStart + 3);
            });
          }
        }
      }
      var result = geometry(new THREE.BufferGeometry()); result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      result.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      result.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); result.setIndex(indices); result.computeVertexNormals(); return result;
    }
    function groundPlants(fern) {
      // Fewer segments on very small grass blades fund more colonies and ferns
      // while reducing the total triangle count of the understory.
      var count = fern ? (detailed ? 205 : 95) : (detailed ? 3200 : 1300);
      var mat = material({ color: 0xffffff, vertexColors: true, roughness: 1, side: THREE.DoubleSide,
        map: fern ? fernMap : null, alphaTest: fern ? 0.35 : 0 });
      applyWind(mat, 'grass');
      var plants = new THREE.InstancedMesh(grassGeometry(fern), mat, count);
      plants.name = fern ? 'woodland-fern-fronds' : 'fine-meadow-grasses';
      var index = 0;
      while (index < count) {
        var angle = random() * Math.PI * 2;
        var radius = Math.sqrt(random()) * (fern ? 31 : (random() < 0.78 ? 24 : 40));
        var x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
        // Fern colonies and shorter grasses colonize roots, fallen litter and
        // damp hollows instead of forming an evenly planted radial lawn.
        if (random() < (fern ? 0.27 : 0.13) && treeLocations.length) {
          var plantHost = treeLocations[Math.floor(random() * treeLocations.length)];
          var colonyRadius = 0.6 + random() * plantHost.radius * 0.95;
          x = plantHost.x + Math.cos(angle) * colonyRadius; z = plantHost.z + Math.sin(angle) * colonyRadius;
          radius = Math.hypot(x, z);
        }
        if (fern && radius < 3.2) continue;
        var path = Math.abs(x - 3.5 - Math.sin(z * 0.09) * 3);
        if (!fern && path < 1.4 && random() < 0.85) continue;
        var colony = mossColony(x, z);
        if (random() > 0.16 + colony * 0.84) continue;
        var size = fern ? 0.46 + random() * 0.52 : 0.15 + random() * 0.30;
        if (!fern) size *= 0.73 + colony * 0.80;
        dummy.position.set(x, groundHeight(x, z) - 0.015, z); dummy.rotation.set(0, random() * Math.PI * 2, 0);
        dummy.scale.set(size * (fern ? 1 : 1.6), size, size * (fern ? 1 : 1.6)); dummy.updateMatrix(); plants.setMatrixAt(index, dummy.matrix);
        var shade = 0.72 + random() * 0.34;
        var dryTip = random() < 0.15 ? 1.16 : 0.92;
        tint.setRGB(shade * dryTip, shade, shade * (0.84 + random() * 0.12)); plants.setColorAt(index, tint); index++;
      }
      plants.instanceMatrix.needsUpdate = true; plants.instanceColor.needsUpdate = true;
      plants.frustumCulled = false; plants.receiveShadow = true; root.add(plants);
    }
    groundPlants(false); groundPlants(true);

    // Rounded fractured stones: shared sculpted geometry and mineral/moss texture.
    var stoneCanvas = canvas(256), stoneCtx = stoneCanvas.getContext('2d');
    var stonePixels = stoneCtx.createImageData(256, 256);
    for (var py = 0; py < 256; py++) {
      for (var px = 0; px < 256; px++) {
        var mineral = noise(px * 0.032, py * 0.032) * 54 + noise(px * 0.18, py * 0.18) * 33 + random() * 19;
        var pi = (py * 256 + px) * 4;
        stonePixels.data[pi] = 113 + mineral; stonePixels.data[pi + 1] = 116 + mineral; stonePixels.data[pi + 2] = 108 + mineral; stonePixels.data[pi + 3] = 255;
      }
    }
    stoneCtx.putImageData(stonePixels, 0, 0);
    var stoneMap = texture(stoneCanvas, 1);
    var stoneGeo = geometry(new THREE.SphereGeometry(1, detailed ? 14 : 10, detailed ? 10 : 7));
    var stonePos = stoneGeo.attributes.position;
    for (var point = 0; point < stonePos.count; point++) {
      var xx = stonePos.getX(point), yy = stonePos.getY(point), zz = stonePos.getZ(point);
      var irregular = 0.88 + noise(xx * 4.8 + yy, zz * 4.8) * 0.23;
      stonePos.setXYZ(point, xx * irregular, yy * (0.85 + noise(xx * 3, zz * 3) * 0.2), zz * irregular);
    }
    stoneGeo.computeVertexNormals();
    var stoneMat = material({ color: linear(0x8b897c), map: stoneMap, bumpMap: stoneMap, bumpScale: 0.10, roughness: 0.99 });
    var stones = new THREE.InstancedMesh(stoneGeo, stoneMat, detailed ? 92 : 48);
    stones.name = 'weathered-clearing-stones';
    for (var rock = 0; rock < stones.count; rock++) {
      var ra = random() * Math.PI * 2, rr = 2.2 + Math.sqrt(random()) * 32;
      var rx = Math.cos(ra) * rr, rz = Math.sin(ra) * rr, scale = 0.12 + Math.pow(random(), 3) * 1.15;
      dummy.position.set(rx, groundHeight(rx, rz) + scale * 0.18, rz); dummy.rotation.set(random() * 0.3, random() * Math.PI * 2, random() * 0.25);
      dummy.scale.set(scale * (0.8 + random() * 0.7), scale * (0.42 + random() * 0.26), scale); dummy.updateMatrix(); stones.setMatrixAt(rock, dummy.matrix);
    }
    stones.instanceMatrix.needsUpdate = true; stones.frustumCulled = false; stones.castShadow = true; stones.receiveShadow = true; root.add(stones);

    // Near-ground detail has a separate, stateless distribution. It cannot
    // consume the placement stream or move any established habitat landmark.
    var detailCanvas = canvas(128), detailCtx = detailCanvas.getContext('2d');
    var leafWash = detailCtx.createLinearGradient(0, 0, 128, 0);
    leafWash.addColorStop(0, '#b4b4b4'); leafWash.addColorStop(0.45, '#eeeeee');
    leafWash.addColorStop(0.51, '#bcbcbc'); leafWash.addColorStop(1, '#dedede');
    detailCtx.fillStyle = leafWash; detailCtx.fillRect(0, 0, 128, 128);
    detailCtx.strokeStyle = 'rgba(80,80,80,.27)'; detailCtx.lineWidth = 1.1;
    detailCtx.beginPath(); detailCtx.moveTo(64, 0); detailCtx.lineTo(64, 128); detailCtx.stroke();
    for (var rib = 0; rib < 7; rib++) {
      var ribY = 11 + rib * 17;
      detailCtx.strokeStyle = 'rgba(91,91,91,.20)'; detailCtx.lineWidth = 0.65;
      detailCtx.beginPath(); detailCtx.moveTo(64, ribY + 14); detailCtx.quadraticCurveTo(36, ribY + 3, 2, ribY - 6);
      detailCtx.moveTo(64, ribY + 10); detailCtx.quadraticCurveTo(91, ribY - 2, 127, ribY - 8); detailCtx.stroke();
    }
    var detailMap = texture(detailCanvas);

    function smallLeafGeometry(herb) {
      var positions = [], uvs = [], indices = [];
      function strip(points, texcoords) {
        var offset = positions.length / 3;
        points.forEach(function (point) { positions.push(point[0], point[1], point[2]); });
        texcoords.forEach(function (uv) { uvs.push(uv[0], uv[1]); });
        indices.push(offset, offset + 2, offset + 1, offset + 1, offset + 2, offset + 3);
      }
      if (herb) {
        // Shared vertices across each curved blade keep normals continuous;
        // the shallow midrib and drooping tip replace flat triangular lobes.
        for (var blade = 0; blade < 5; blade++) {
          var angle = blade * 2.39996, ca = Math.cos(angle), sa = Math.sin(angle);
          var reach = 0.48 + hash(blade, 8) * 0.32, rise = 0.19 + hash(19, blade) * 0.23;
          var bladeStart = positions.length / 3;
          for (var station = 0; station < 5; station++) {
            var along = station / 4, arch = Math.sin(along * Math.PI);
            var width = 0.004 + Math.pow(arch, 0.72) * (0.135 + hash(blade, 31) * 0.025);
            var radial = 0.045 + along * reach, bladeY = 0.035 + rise * Math.sin(along * Math.PI * 0.82);
            for (var cross = -1; cross <= 1; cross++) {
              var lateral = cross * width;
              var ridge = (1 - Math.abs(cross)) * arch * 0.027;
              var twist = cross * Math.sin(along * Math.PI * 2) * 0.009;
              positions.push(ca * radial - sa * lateral, bladeY + ridge + twist, sa * radial + ca * lateral);
              uvs.push((cross + 1) * 0.5, along);
            }
          }
          for (var row = 0; row < 4; row++) {
            for (var column = 0; column < 2; column++) {
              var leftIndex = bladeStart + row * 3 + column;
              indices.push(leftIndex, leftIndex + 1, leftIndex + 3, leftIndex + 1, leftIndex + 4, leftIndex + 3);
            }
          }
        }
      } else {
        // A ridged midrib and curled margins lift only millimeters above soil.
        for (var leafSection = 0; leafSection < 4; leafSection++) {
          var t0 = leafSection / 4, t1 = (leafSection + 1) / 4;
          [-1, 1].forEach(function (side) {
            function leafPoint(t, edge) {
              var breadth = Math.pow(Math.sin(t * Math.PI), 0.72) * (0.26 + Math.sin(t * Math.PI * 6) * 0.025);
              var curl = edge ? Math.sin(t * Math.PI * 1.7) * 0.034 * (side < 0 ? 0.75 : 1.25) : 0;
              return [edge ? side * breadth : 0, 0.012 + Math.sin(t * Math.PI) * 0.037 + t * t * t * t * 0.078 + curl, t - 0.5];
            }
            strip([leafPoint(t0, false), leafPoint(t0, true), leafPoint(t1, false), leafPoint(t1, true)],
              [[0.5, t0], [side < 0 ? 0 : 1, t0], [0.5, t1], [side < 0 ? 0 : 1, t1]]);
          });
        }
      }
      var shape = geometry(new THREE.BufferGeometry());
      shape.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      shape.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); shape.setIndex(indices); shape.computeVertexNormals();
      return shape;
    }
    function groundSurfaceAt(x, z) {
      // Match the rendered terrain triangles, not just the smooth sampler, so
      // tiny leaves do not hover above or disappear inside a sloped triangle.
      var divisions = detailed ? 128 : 80, step = 150 / divisions;
      var cellX = Math.max(0, Math.min(divisions - 1, Math.floor((x + 75) / step)));
      var cellZ = Math.max(0, Math.min(divisions - 1, Math.floor((z + 75) / step)));
      var u = (x + 75) / step - cellX, v = (z + 75) / step - cellZ, row = divisions + 1;
      var baseIndex = cellZ * row + cellX;
      var ha = groundPos.getY(baseIndex), hb = groundPos.getY(baseIndex + row);
      var hc = groundPos.getY(baseIndex + row + 1), hd = groundPos.getY(baseIndex + 1);
      var slopeX = (u + v <= 1 ? hd - ha : hc - hb) / step;
      var slopeZ = (u + v <= 1 ? hb - ha : hc - hd) / step;
      return { height: u + v <= 1 ? ha + (hd - ha) * u + (hb - ha) * v : hc + (hb - hc) * (1 - u) + (hd - hc) * (1 - v),
        normal: new THREE.Vector3(-slopeX, 1, -slopeZ).normalize() };
    }
    function groundDetail(herb) {
      var count = herb ? (detailed ? 40 : 15) : (detailed ? 280 : 105);
      var mat = material({ color: linear(herb ? 0x627a43 : 0x887049), map: detailMap, side: THREE.DoubleSide, roughness: 1 });
      if (herb) applyWind(mat, 'grass');
      var details = new THREE.InstancedMesh(smallLeafGeometry(herb), mat, count);
      details.name = herb ? 'clustered-woodland-ground-leaves' : 'curled-fallen-leaf-drifts';
      for (var item = 0; item < count; item++) {
        var colony = Math.floor(item / (herb ? 4 : 10)), salt = herb ? 247 : 619;
        var bearing = hash(colony, salt) * Math.PI * 2, distance = 2.7 + hash(colony + 9, salt) * 13;
        var centerX = Math.cos(bearing) * distance - 1.2, centerZ = Math.sin(bearing) * distance - 0.5;
        var scatterAngle = hash(item, salt + 1) * Math.PI * 2;
        var scatter = Math.sqrt(hash(item + 13, salt + 2)) * (herb ? 1.15 : 1.7);
        var x = centerX + Math.cos(scatterAngle) * scatter, z = centerZ + Math.sin(scatterAngle) * scatter;
        var surface = groundSurfaceAt(x, z), age = hash(item + 5, salt + 3);
        var size = herb ? 0.16 + age * 0.28 : 0.12 + age * 0.13;
        dummy.position.set(x, surface.height + (herb ? -0.008 : 0.002), z);
        dummy.quaternion.setFromUnitVectors(up, surface.normal); dummy.rotateY(hash(item + 41, salt) * Math.PI * 2);
        dummy.scale.set(size * (0.77 + hash(item + 7, salt) * 0.43), size, size); dummy.updateMatrix(); details.setMatrixAt(item, dummy.matrix);
        var shade = 0.62 + hash(item + 21, salt) * 0.37;
        tint.setRGB(shade * (herb ? 0.86 : 1), shade * (herb ? 1 : 0.88 + age * 0.07), shade * (herb ? 0.82 : 0.68 + age * 0.17));
        details.setColorAt(item, tint);
      }
      details.instanceMatrix.needsUpdate = true; details.instanceColor.needsUpdate = true;
      details.frustumCulled = false; details.receiveShadow = true; root.add(details);
    }
    groundDetail(false); groundDetail(true);

    root.userData = { habitat: 'woodland-edge', deterministicSeed: 972031, sharedTerrainSampler: true, perch: [0, 3.2, 0] };
    function update(time, wind) {
      if (disposed) return;
      clock.value = Number.isFinite(time) ? time : 0;
      var period = global.BirdLab3D && global.BirdLab3D.courseDuration || 44;
      cyclePhase.value = ((clock.value % period) + period) % period / period * Math.PI * 2;
      if (typeof wind === 'number') {
        var strength = Math.max(0, Math.min(2, wind)); breeze.value.set(strength * 0.22, 0, strength * 0.085);
      } else if (wind && Number.isFinite(wind.x) && Number.isFinite(wind.z)) {
        breeze.value.set(wind.x, 0, wind.z).clampLength(0, 1.2);
      }
    }
    function dispose() {
      if (disposed) return;
      disposed = true;
      if (root.parent) root.parent.remove(root);
      root.traverse(function (object) { if (object.isInstancedMesh && object.dispose) object.dispose(); });
      resources.forEach(function (resource) { if (resource && resource.dispose) resource.dispose(); });
      resources.length = 0;
      root.clear();
    }
    return { root: root, perch: new THREE.Vector3(0, 3.2, 0), groundHeight: groundHeight, update: update, dispose: dispose };
  }
  global.BirdLab3DHabitat = { create: create };
})(typeof window !== 'undefined' ? window : globalThis);
