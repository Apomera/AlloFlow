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
    // Cloud shadows drift on the shared clock; held still under reduced motion.
    var cloudMotion = { value: options.reducedMotion ? 0 : 1 };
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
    function residentForagingLane(x, z) {
      // Keep tall ground cover out of the two short resident courses. This
      // consumes no placement randomness, preserving the rest of the forest.
      return (x> -1.08 && x<1.75 && z> -2.25 && z< -1.15) ||
        (x>-.10 && x<2.60 && z>.95 && z<2.90);
    }
    function groundHeight(x, z) {
      // A quiet, level observation clearing opens into gently folded woodland.
      var shelter = smooth((Math.hypot(x, z) - 3.5) / 14);
      return shelter * (Math.sin(x * 0.055) * Math.cos(z * 0.068) * 2.9 +
        Math.sin(x * 0.137 + 1.1) * Math.sin(z * 0.096) * 0.72 + (noise(x * 0.11, z * 0.11) - 0.5) * 0.48);
    }

    // Microrelief and leaf litter are continuous ground texture, not floating decals.
    var soilCanvas = canvas(512), soil = soilCanvas.getContext('2d');
    var reliefCanvas = canvas(512), soilRelief = reliefCanvas.getContext('2d');
    soil.fillStyle = '#aaa392'; soil.fillRect(0, 0, 512, 512);
    soilRelief.fillStyle = '#808080'; soilRelief.fillRect(0, 0, 512, 512);
    for (var hummock = 0; hummock < 170; hummock++) {
      var hx = random() * 512, hy = random() * 512, hr = 7 + random() * 43;
      var humus = soil.createRadialGradient(hx, hy, 0, hx, hy, hr);
      humus.addColorStop(0, hummock % 3 ? 'rgba(79,68,49,.20)' : 'rgba(187,191,145,.22)');
      humus.addColorStop(1, 'rgba(121,108,75,0)'); soil.fillStyle = humus;
      soil.fillRect(hx - hr, hy - hr, hr * 2, hr * 2);
      var moundTone = Math.floor(120 + hash(hummock + 29, 317) * 20);
      var mound = soilRelief.createRadialGradient(hx, hy, 0, hx, hy, hr);
      mound.addColorStop(0, 'rgba(' + moundTone + ',' + moundTone + ',' + moundTone + ',.65)');
      mound.addColorStop(1, 'rgba(128,128,128,0)'); soilRelief.fillStyle = mound;
      soilRelief.fillRect(hx - hr, hy - hr, hr * 2, hr * 2);
    }
    for (var speck = 0; speck < 15000; speck++) {
      var grey = Math.floor(103 + random() * 90);
      var speckX = random() * 512, speckY = random() * 512, speckW = 1 + random() * 3, speckH = 1 + random() * 2;
      soil.fillStyle = 'rgba(' + grey + ',' + grey + ',' + grey + ',.21)';
      soil.fillRect(speckX, speckY, speckW, speckH);
      var granule = Math.floor(132 + hash(speck + 113, 541) * 14);
      soilRelief.fillStyle = 'rgba(' + granule + ',' + granule + ',' + granule + ',.38)';
      soilRelief.fillRect(speckX, speckY, speckW, speckH);
    }
    for (var litter = 0; litter < 1850; litter++) {
      var lx = random() * 512, ly = random() * 512, turn = random() * Math.PI;
      soil.save(); soil.translate(lx, ly); soil.rotate(turn);
      soilRelief.save(); soilRelief.translate(lx, ly); soilRelief.rotate(turn);
      var leafLength = 2.5 + random() * 8.5, leafWidth = leafLength * (0.26 + random() * 0.22);
      soil.fillStyle = ['rgba(71,63,47,.37)', 'rgba(135,110,74,.32)', 'rgba(179,156,115,.31)', 'rgba(73,78,49,.30)'][litter % 4];
      soil.beginPath(); soil.moveTo(-leafLength, 0);
      soil.bezierCurveTo(-leafLength * 0.2, -leafWidth, leafLength * 0.8, -leafWidth * 0.75, leafLength, 0);
      soil.bezierCurveTo(leafLength * 0.3, leafWidth, -leafLength * 0.6, leafWidth, -leafLength, 0); soil.fill();
      // A dark fallen leaf still stands above the soil. Raised edges and the
      // central fold are authored independently of its pigment and shadows.
      var leafRelief = soilRelief.createLinearGradient(0, -leafWidth, 0, leafWidth);
      leafRelief.addColorStop(0, '#a7a7a7'); leafRelief.addColorStop(0.23, '#939393');
      leafRelief.addColorStop(0.52, '#adadad'); leafRelief.addColorStop(0.81, '#959595'); leafRelief.addColorStop(1, '#b0b0b0');
      soilRelief.fillStyle = leafRelief;
      soilRelief.beginPath(); soilRelief.moveTo(-leafLength, 0);
      soilRelief.bezierCurveTo(-leafLength * 0.2, -leafWidth, leafLength * 0.8, -leafWidth * 0.75, leafLength, 0);
      soilRelief.bezierCurveTo(leafLength * 0.3, leafWidth, -leafLength * 0.6, leafWidth, -leafLength, 0); soilRelief.fill();
      soil.strokeStyle = 'rgba(59,51,37,.25)'; soil.lineWidth = 0.45;
      soil.beginPath(); soil.moveTo(-leafLength, 0); soil.lineTo(leafLength * 0.8, 0.35); soil.stroke();
      soilRelief.strokeStyle = 'rgba(188,188,188,.48)'; soilRelief.lineWidth = 0.45;
      soilRelief.beginPath(); soilRelief.moveTo(-leafLength, 0); soilRelief.lineTo(leafLength * 0.8, 0.35); soilRelief.stroke();
      // Fine lateral veins and a lifted dry edge keep nearby litter legible.
      // Texture-only marks use the coordinate hash, never the placement stream.
      soil.strokeStyle = 'rgba(61,52,37,.17)'; soil.lineWidth = 0.3;
      for (var vein = 1; vein < 4; vein++) {
        var veinX = -leafLength * 0.6 + vein * leafLength * 0.34;
        var veinReach = leafWidth * (0.65 + hash(litter, vein) * 0.20);
        soil.beginPath(); soil.moveTo(veinX - leafLength * 0.17, 0);
        soil.lineTo(veinX, -veinReach); soil.moveTo(veinX - leafLength * 0.12, 0);
        soil.lineTo(veinX + leafLength * 0.06, veinReach); soil.stroke();
        soilRelief.strokeStyle = 'rgba(191,191,191,.18)'; soilRelief.lineWidth = 0.3;
        soilRelief.beginPath(); soilRelief.moveTo(veinX - leafLength * 0.17, 0);
        soilRelief.lineTo(veinX, -veinReach); soilRelief.moveTo(veinX - leafLength * 0.12, 0);
        soilRelief.lineTo(veinX + leafLength * 0.06, veinReach); soilRelief.stroke();
      }
      soil.strokeStyle = 'rgba(196,174,136,.14)'; soil.lineWidth = 0.45;
      soil.beginPath(); soil.moveTo(-leafLength * 0.65, leafWidth * 0.34);
      soil.quadraticCurveTo(leafLength * 0.22, leafWidth * 0.77, leafLength * 0.85, leafWidth * 0.1); soil.stroke();
      soilRelief.strokeStyle = 'rgba(198,198,198,.54)'; soilRelief.lineWidth = 0.45;
      soilRelief.beginPath(); soilRelief.moveTo(-leafLength * 0.65, leafWidth * 0.34);
      soilRelief.quadraticCurveTo(leafLength * 0.22, leafWidth * 0.77, leafLength * 0.85, leafWidth * 0.1); soilRelief.stroke();
      soil.restore(); soilRelief.restore();
    }
    for (var twig = 0; twig < 145; twig++) {
      soil.strokeStyle = 'rgba(55,48,36,.40)'; soil.lineWidth = 0.6 + random() * 0.8;
      var twigX = random() * 512, twigY = random() * 512;
      var twigEndX = twigX + random() * 22 - 11, twigEndY = twigY + random() * 30 - 15;
      soil.beginPath(); soil.moveTo(twigX, twigY); soil.lineTo(twigEndX, twigEndY); soil.stroke();
      soilRelief.strokeStyle = '#b5b5b5'; soilRelief.lineWidth = soil.lineWidth;
      soilRelief.beginPath(); soilRelief.moveTo(twigX, twigY); soilRelief.lineTo(twigEndX, twigEndY); soilRelief.stroke();
    }
    var soilMap = texture(soilCanvas, 30);
    // A separate small-scale moss surface lets colonies cover the dry litter,
    // rather than merely turning the same uniformly leaf-strewn soil green.
    var mossCanvas = canvas(256), mossCtx = mossCanvas.getContext('2d');
    var mossPixels = mossCtx.createImageData(256, 256);
    var mossRelief = new Uint8Array(256 * 256);
    function tileNoise(x, y, frequency, offset) {
      // Match both sides of the repeating field in value and slope. A height
      // discontinuity would cast a straight crease through an organic colony.
      var u = smooth(x / 256), v = smooth(y / 256);
      function sample(px, py) { return noise(px * frequency + offset, py * frequency - offset * 0.43); }
      return (sample(x, y) * (1 - u) + sample(x - 256, y) * u) * (1 - v) +
        (sample(x, y - 256) * (1 - u) + sample(x - 256, y - 256) * u) * v;
    }
    for (var mossY = 0; mossY < 256; mossY++) {
      for (var mossX = 0; mossX < 256; mossX++) {
        var mossCushion = noise(mossX * 0.045, mossY * 0.045) * 31 + noise(mossX * 0.21, mossY * 0.21) * 26;
        var mossGrain = hash(mossX, mossY) * 30, mossPixel = (mossY * 256 + mossX) * 4;
        mossPixels.data[mossPixel] = 105 + mossCushion + mossGrain;
        mossPixels.data[mossPixel + 1] = 121 + mossCushion + mossGrain;
        mossPixels.data[mossPixel + 2] = 81 + mossCushion + mossGrain * 0.8;
        mossPixels.data[mossPixel + 3] = 255;
        mossRelief[mossY * 256 + mossX] = 120 + tileNoise(mossX, mossY, 0.072, 0) * 36 +
          Math.pow(tileNoise(mossX, mossY, 0.31, 7), 2) * 34 + hash(mossX + 491, mossY + 193) * 8;
      }
    }
    mossCtx.putImageData(mossPixels, 0, 0);
    var mossMap = texture(mossCanvas, 1);
    mossMap.wrapS = mossMap.wrapT = THREE.RepeatWrapping;
    // Pack independent soil and moss heights into R/G of a single linear map.
    // Bilinear enlargement keeps the 256px moss field at its authored scale;
    // neither green pigment nor dark litter is interpreted as a depression.
    var reliefPixels = soilRelief.getImageData(0, 0, 512, 512);
    for (var reliefY = 0; reliefY < 512; reliefY++) {
      for (var reliefX = 0; reliefX < 512; reliefX++) {
        var sampleX = (reliefX + 0.5) * 0.5 - 0.5, sampleY = (reliefY + 0.5) * 0.5 - 0.5;
        var cellX = Math.floor(sampleX), cellY = Math.floor(sampleY), ux = sampleX - cellX, uy = sampleY - cellY;
        var mossH00 = mossRelief[((cellY + 256) % 256) * 256 + (cellX + 256) % 256];
        var mossH10 = mossRelief[((cellY + 256) % 256) * 256 + (cellX + 257) % 256];
        var mossH01 = mossRelief[((cellY + 257) % 256) * 256 + (cellX + 256) % 256];
        var mossH11 = mossRelief[((cellY + 257) % 256) * 256 + (cellX + 257) % 256];
        var reliefPixel = (reliefY * 512 + reliefX) * 4;
        reliefPixels.data[reliefPixel + 1] = (mossH00 * (1 - ux) + mossH10 * ux) * (1 - uy) + (mossH01 * (1 - ux) + mossH11 * ux) * uy;
        reliefPixels.data[reliefPixel + 2] = 128;
      }
    }
    soilRelief.putImageData(reliefPixels, 0, 0);
    var groundReliefMap = texture(reliefCanvas, 30); groundReliefMap.encoding = THREE.LinearEncoding;
    groundReliefMap.name = 'birdlab-ground-soil-moss-height';
    // Close-range litter: the 5 m soil tile paints ~1 px per cm, which smears
    // under a songbird's feet. A 0.8 m tile of crisp leaf fragments, needles,
    // seed husks and crumbs fades in only where the screen resolves it. It has
    // its own seed so no tree, stone or plant in the clearing moves.
    var litterSize = detailed ? 1024 : 512, litterScale = litterSize / 512, litterSeed = 77291;
    function litterRandom() { litterSeed = (Math.imul(litterSeed, 1664525) + 1013904223) >>> 0; return litterSeed / 4294967296; }
    var litterCanvas = canvas(litterSize), litterCtx = litterCanvas.getContext('2d');
    var litterHeightCanvas = canvas(litterSize), litterHeightCtx = litterHeightCanvas.getContext('2d');
    litterHeightCtx.fillStyle = '#404040'; litterHeightCtx.fillRect(0, 0, litterSize, litterSize);
    litterCtx.scale(litterScale, litterScale); litterHeightCtx.scale(litterScale, litterScale);
    function wrapped(x, y, reach, draw) {
      // Repeat an item across the tile edge so the 0.8 m repeat stays seamless.
      for (var ox = -1; ox <= 1; ox++) for (var oy = -1; oy <= 1; oy++) {
        var px = x + ox * 512, py = y + oy * 512;
        if (px + reach < 0 || px - reach > 512 || py + reach < 0 || py - reach > 512) continue;
        draw(px, py);
      }
    }
    function litterLeaf(surface, length, width, curl) {
      surface.beginPath(); surface.moveTo(-length, 0);
      surface.bezierCurveTo(-length * 0.25, -width * (1.1 + curl), length * 0.55, -width * 0.9, length, 0);
      surface.bezierCurveTo(length * 0.45, width * (0.95 - curl), -length * 0.4, width * 1.05, -length, 0);
    }
    // Soil crumbs and grit carry the finest relief between the larger pieces.
    for (var crumb = 0; crumb < 5200; crumb++) {
      var cx = litterRandom() * 512, cy = litterRandom() * 512, cr = 0.35 + Math.pow(litterRandom(), 3) * 1.6;
      var dark = litterRandom() < 0.55, crumbTone = dark ? 46 + litterRandom() * 30 : 120 + litterRandom() * 60;
      litterCtx.fillStyle = 'rgba(' + Math.round(crumbTone * 1.05) + ',' + Math.round(crumbTone * 0.93) + ',' + Math.round(crumbTone * 0.74) + ',' + (dark ? .55 : .45) + ')';
      litterCtx.beginPath(); litterCtx.arc(cx, cy, cr, 0, Math.PI * 2); litterCtx.fill();
      litterHeightCtx.fillStyle = dark ? 'rgba(40,40,40,.5)' : 'rgba(110,110,110,.7)';
      litterHeightCtx.beginPath(); litterHeightCtx.arc(cx, cy, cr, 0, Math.PI * 2); litterHeightCtx.fill();
    }
    // Small pebbles: a lit crown, a darker skirt and a raised dome.
    for (var pebble = 0; pebble < 70; pebble++) {
      (function (px0, py0, pr, tone, squash, turn) {
        wrapped(px0, py0, pr * 2, function (px, py) {
          litterCtx.save(); litterCtx.translate(px, py); litterCtx.rotate(turn); litterCtx.scale(1, squash);
          var pebbleFill = litterCtx.createRadialGradient(-pr * 0.3, -pr * 0.35, pr * 0.1, 0, 0, pr);
          pebbleFill.addColorStop(0, 'rgba(' + (tone + 50) + ',' + (tone + 46) + ',' + (tone + 36) + ',.95)');
          pebbleFill.addColorStop(1, 'rgba(' + (tone - 20) + ',' + (tone - 24) + ',' + (tone - 30) + ',.95)');
          litterCtx.fillStyle = pebbleFill; litterCtx.beginPath(); litterCtx.arc(0, 0, pr, 0, Math.PI * 2); litterCtx.fill();
          litterCtx.restore();
          litterHeightCtx.save(); litterHeightCtx.translate(px, py); litterHeightCtx.rotate(turn); litterHeightCtx.scale(1, squash);
          var dome = litterHeightCtx.createRadialGradient(0, 0, 0, 0, 0, pr);
          dome.addColorStop(0, '#f0f0f0'); dome.addColorStop(0.7, '#b0b0b0'); dome.addColorStop(1, 'rgba(64,64,64,0)');
          litterHeightCtx.fillStyle = dome; litterHeightCtx.beginPath(); litterHeightCtx.arc(0, 0, pr, 0, Math.PI * 2); litterHeightCtx.fill();
          litterHeightCtx.restore();
        });
      })(litterRandom() * 512, litterRandom() * 512, 1.6 + litterRandom() * 3.4, Math.round(100 + litterRandom() * 60), 0.6 + litterRandom() * 0.35, litterRandom() * Math.PI);
    }
    // Pine needles and fine twigs: thin dark lines that cross the leaves.
    function needlesAndTwigs(count, twigs) {
      for (var item = 0; item < count; item++) {
        (function (nx, ny, turn, length, bend, tone, width) {
          wrapped(nx, ny, length + 2, function (px, py) {
            var ex = px + Math.cos(turn) * length, ey = py + Math.sin(turn) * length;
            var mx = (px + ex) / 2 - Math.sin(turn) * bend, my = (py + ey) / 2 + Math.cos(turn) * bend;
            litterCtx.strokeStyle = 'rgba(' + tone + ',' + Math.round(tone * 0.8) + ',' + Math.round(tone * 0.55) + ',.92)'; litterCtx.lineWidth = width; litterCtx.lineCap = 'round';
            litterCtx.beginPath(); litterCtx.moveTo(px, py); litterCtx.quadraticCurveTo(mx, my, ex, ey); litterCtx.stroke();
            if (twigs) {
              // A pale upper edge reads as a round stem in raking light.
              litterCtx.strokeStyle = 'rgba(178,152,118,.42)'; litterCtx.lineWidth = width * 0.35;
              litterCtx.beginPath(); litterCtx.moveTo(px, py - width * 0.25); litterCtx.quadraticCurveTo(mx, my - width * 0.25, ex, ey - width * 0.25); litterCtx.stroke();
            }
            litterHeightCtx.strokeStyle = twigs ? '#d8d8d8' : '#a8a8a8'; litterHeightCtx.lineWidth = width; litterHeightCtx.lineCap = 'round';
            litterHeightCtx.beginPath(); litterHeightCtx.moveTo(px, py); litterHeightCtx.quadraticCurveTo(mx, my, ex, ey); litterHeightCtx.stroke();
          });
        })(litterRandom() * 512, litterRandom() * 512, litterRandom() * Math.PI * 2,
          twigs ? 18 + litterRandom() * 60 : 14 + litterRandom() * 26, (litterRandom() - 0.5) * (twigs ? 10 : 4),
          Math.round(twigs ? 70 + litterRandom() * 40 : 112 + litterRandom() * 60), twigs ? 1.6 + litterRandom() * 2.2 : 0.7 + litterRandom() * 0.5);
      }
    }
    // Fallen leaves in three generations: dark decaying, russet, and fresh tan.
    var leafTones = [[88, 70, 52], [118, 88, 60], [142, 110, 76], [164, 138, 102], [118, 100, 70], [94, 86, 62]];
    for (var fallen = 0; fallen < 230; fallen++) {
      (function (fx, fy, turn, length, ratio, curl, toneIndex, broken) {
        var width = length * ratio, leafTone = leafTones[toneIndex], vein = 'rgba(' + Math.round(leafTone[0] * 0.62) + ',' + Math.round(leafTone[1] * 0.6) + ',' + Math.round(leafTone[2] * 0.58) + ',.75)';
        wrapped(fx, fy, length + 2, function (px, py) {
          litterCtx.save(); litterCtx.translate(px, py); litterCtx.rotate(turn);
          // Soft contact shadow sits under the leaf's lifted downwind edge.
          litterCtx.fillStyle = 'rgba(28,20,12,.30)'; litterCtx.save(); litterCtx.translate(1.2, 1.6); litterLeaf(litterCtx, length, width, curl); litterCtx.fill(); litterCtx.restore();
          var blade = litterCtx.createLinearGradient(0, -width, 0, width);
          blade.addColorStop(0, 'rgba(' + Math.round(leafTone[0] * 1.14) + ',' + Math.round(leafTone[1] * 1.12) + ',' + Math.round(leafTone[2] * 1.1) + ',.97)');
          blade.addColorStop(1, 'rgba(' + Math.round(leafTone[0] * 0.82) + ',' + Math.round(leafTone[1] * 0.8) + ',' + Math.round(leafTone[2] * 0.8) + ',.97)');
          litterCtx.fillStyle = blade; litterLeaf(litterCtx, length, width, curl); litterCtx.fill();
          if (broken) { litterCtx.globalCompositeOperation = 'destination-out'; litterCtx.beginPath(); litterCtx.arc(length * 0.55, width * 0.4, width * 0.75, 0, Math.PI * 2); litterCtx.fill(); litterCtx.globalCompositeOperation = 'source-over'; }
          litterCtx.strokeStyle = vein; litterCtx.lineWidth = 0.7;
          litterCtx.beginPath(); litterCtx.moveTo(-length * 1.12, 0.3); litterCtx.lineTo(length * 0.9, 0); litterCtx.stroke();
          litterCtx.lineWidth = 0.4;
          for (var rib = 1; rib < 6; rib++) {
            var ribX = -length * 0.75 + rib * length * 0.3;
            litterCtx.beginPath(); litterCtx.moveTo(ribX - length * 0.12, 0); litterCtx.lineTo(ribX + length * 0.05, -width * 0.75);
            litterCtx.moveTo(ribX - length * 0.12, 0); litterCtx.lineTo(ribX + length * 0.05, width * 0.72); litterCtx.stroke();
          }
          litterCtx.restore();
          litterHeightCtx.save(); litterHeightCtx.translate(px, py); litterHeightCtx.rotate(turn);
          var lift = litterHeightCtx.createLinearGradient(0, -width, 0, width);
          lift.addColorStop(0, '#c4c4c4'); lift.addColorStop(0.5, '#a2a2a2'); lift.addColorStop(1, '#d0d0d0');
          litterHeightCtx.fillStyle = lift; litterLeaf(litterHeightCtx, length, width, curl); litterHeightCtx.fill();
          if (broken) { litterHeightCtx.fillStyle = '#404040'; litterHeightCtx.beginPath(); litterHeightCtx.arc(length * 0.55, width * 0.4, width * 0.75, 0, Math.PI * 2); litterHeightCtx.fill(); }
          litterHeightCtx.strokeStyle = '#8c8c8c'; litterHeightCtx.lineWidth = 0.8;
          litterHeightCtx.beginPath(); litterHeightCtx.moveTo(-length, 0); litterHeightCtx.lineTo(length * 0.9, 0); litterHeightCtx.stroke();
          litterHeightCtx.restore();
        });
      })(litterRandom() * 512, litterRandom() * 512, litterRandom() * Math.PI * 2, 9 + litterRandom() * 18,
        0.34 + litterRandom() * 0.24, (litterRandom() - 0.5) * 0.5, Math.floor(litterRandom() * leafTones.length), litterRandom() < 0.3);
    }
    needlesAndTwigs(260, false);
    needlesAndTwigs(26, true);
    // Seed husks and acorn caps: small, dark, cupped shapes.
    for (var husk = 0; husk < 90; husk++) {
      (function (hx0, hy0, hr0, turn) {
        wrapped(hx0, hy0, hr0 * 2, function (px, py) {
          litterCtx.save(); litterCtx.translate(px, py); litterCtx.rotate(turn); litterCtx.scale(1, 0.62);
          litterCtx.fillStyle = 'rgba(64,44,28,.95)'; litterCtx.beginPath(); litterCtx.arc(0, 0, hr0, 0, Math.PI * 2); litterCtx.fill();
          litterCtx.fillStyle = 'rgba(142,108,70,.8)'; litterCtx.beginPath(); litterCtx.arc(-hr0 * 0.25, -hr0 * 0.25, hr0 * 0.45, 0, Math.PI * 2); litterCtx.fill();
          litterCtx.restore();
          litterHeightCtx.fillStyle = '#c8c8c8'; litterHeightCtx.beginPath(); litterHeightCtx.arc(px, py, hr0 * 0.8, 0, Math.PI * 2); litterHeightCtx.fill();
        });
      })(litterRandom() * 512, litterRandom() * 512, 1.4 + litterRandom() * 2.2, litterRandom() * Math.PI);
    }
    var litterMap = texture(litterCanvas, 1); litterMap.name = 'birdlab-ground-close-litter';
    var litterHeightMap = texture(litterHeightCanvas, 1); litterHeightMap.encoding = THREE.LinearEncoding;
    litterHeightMap.name = 'birdlab-ground-close-litter-height';
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
    var groundMat = material({ color: 0xffffff, map: soilMap, bumpMap: groundReliefMap, bumpScale: 0.020, vertexColors: true, roughness: 1 });
    groundMat.onBeforeCompile = function (shader) {
      shader.uniforms.blMossMap = { value: mossMap };
      shader.uniforms.blLitterMap = { value: litterMap }; shader.uniforms.blLitterHeight = { value: litterHeightMap };
      shader.vertexShader = 'attribute float blMossCoverage; varying float blMossCover;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nblMossCover = blMossCoverage;');
      shader.fragmentShader = 'uniform sampler2D blMossMap; uniform sampler2D blLitterMap; uniform sampler2D blLitterHeight; varying float blMossCover;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', [
        '#ifdef USE_MAP',
        'vec4 blSoilAlbedo = mapTexelToLinear(texture2D(map, vUv));',
        'vec4 blMossAlbedo = mapTexelToLinear(texture2D(blMossMap, vUv * 2.13));',
        'float blColony = smoothstep(.16, .83, blMossCover + (blMossAlbedo.g - .35) * .16);',
        'diffuseColor *= mix(blSoilAlbedo, blMossAlbedo, blColony);',
        'float blSoilHeight = texture2D(bumpMap, vUv).r;',
        'float blMossHeight = texture2D(bumpMap, vUv * 2.13).g;',
        'float blSurfaceHeight = mix(blSoilHeight, blMossHeight, blColony);',
        // vUv already carries the soil's 30x repeat. Two rotated samples of the
        // 0.8 m litter tile hide its repeat. The fade
        // follows screen footprint, so a zoomed lens keeps detail a wide view drops.
        'vec2 blLitterUvA = vUv * 6.25;',
        'vec2 blLitterUvB = mat2(.81, -.59, .59, .81) * vUv * 4.37 + vec2(.37, .71);',
        'float blLitterFade = (1. - smoothstep(.008, .055, sqrt(length(dFdx(blLitterUvA)) * length(dFdy(blLitterUvA))))) * (1. - blColony * .78);',
        'vec4 blLitterA = mapTexelToLinear(texture2D(blLitterMap, blLitterUvA));',
        'vec4 blLitterB = mapTexelToLinear(texture2D(blLitterMap, blLitterUvB));',
        'vec3 blLitterRel = mix(blLitterB.rgb, blLitterA.rgb, blLitterA.a) / vec3(.402, .366, .288);',
        'float blLitterCover = max(blLitterA.a, blLitterB.a * .6) * blLitterFade;',
        'diffuseColor.rgb = mix(diffuseColor.rgb, blLitterRel, blLitterCover);',
        'blSurfaceHeight += (max(texture2D(blLitterHeight, blLitterUvA).r, texture2D(blLitterHeight, blLitterUvB).r * .8) - .25) * .16 * blLitterFade;',
        '#endif'
      ].join('\n'));
      shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', [
        // Differentiating the blended surface includes the colony edge itself.
        // Blending two already-perturbed normals would leave that edge behind.
        'vec2 blSurfaceSlope = vec2(dFdx(blSurfaceHeight),dFdy(blSurfaceHeight))*bumpScale;',
        THREE.ShaderChunk.normal_fragment_maps.replace('dHdxy_fwd()', 'blSurfaceSlope')
      ].join('\n'));
      // Cloud shadows: broad soft patches, tens of metres across, drifting
      // with the breeze. They block only direct sun, so shade stays as lit.
      shader.uniforms.blCloudClock = clock; shader.uniforms.blCloudMotion = cloudMotion;
      shader.fragmentShader = shader.fragmentShader.replace('uniform sampler2D blMossMap;', 'uniform float blCloudClock;\nuniform float blCloudMotion;\nfloat blCloudHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\nfloat blCloudNoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(blCloudHash(i), blCloudHash(i + vec2(1., 0.)), f.x), mix(blCloudHash(i + vec2(0., 1.)), blCloudHash(i + vec2(1., 1.)), f.x), f.y); }\nuniform sampler2D blMossMap;');
      shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_end>', [
        '#include <lights_fragment_end>',
        '#ifdef USE_MAP',
        'vec2 blCloudPos = vUv * 5. * .028 + vec2(.011, .004) * blCloudClock * blCloudMotion;',
        'float blCloud = blCloudNoise(blCloudPos) * .65 + blCloudNoise(blCloudPos * 2.3 + 7.1) * .35;',
        'float blCloudShade = smoothstep(.5, .68, blCloud) * .55;',
        'reflectedLight.directDiffuse *= 1. - blCloudShade; reflectedLight.directSpecular *= 1. - blCloudShade;',
        '#endif'
      ].join('\n'));
    };
    groundMat.customProgramCacheKey = function () { return 'birdlab-moss-litter-surface-v4'; };
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
      barkHeight.save(); barkHeight.translate(lichenX, lichenY); barkHeight.rotate(lichenTurn);
      for (var fleck = 0; fleck < 7; fleck++) {
        var fleckX = (hash(lichen, fleck) - 0.5) * lichenW;
        var fleckY = (hash(fleck + 31, lichen) - 0.5) * lichenH;
        var fleckWidth = 1.1 + hash(lichen + 7, fleck) * 2.5;
        var fleckHeight = 1.3 + hash(fleck, lichen + 19) * 3.1;
        // Lobed, overlapping thalli have pale living margins and a quieter
        // centre. Their shallow relief stays separate from the wood grain.
        [bark, barkHeight].forEach(function (surface, relief) {
          surface.beginPath();
          for (var lobe = 0; lobe < 18; lobe++) {
            var lobeAngle = lobe / 18 * Math.PI * 2;
            var lobeRadius = 0.70 + hash(lichen * 17 + fleck, lobe + 73) * 0.30;
            if (lobe % 2) lobeRadius *= 0.71;
            var lobeX = fleckX + Math.cos(lobeAngle) * fleckWidth * lobeRadius;
            var lobeY = fleckY + Math.sin(lobeAngle) * fleckHeight * lobeRadius;
            if (!lobe) surface.moveTo(lobeX, lobeY); else surface.lineTo(lobeX, lobeY);
          }
          surface.closePath();
          surface.fillStyle = relief ? 'rgba(147,147,147,.30)' : lichen % 4 ? 'rgba(186,199,175,.47)' : 'rgba(191,185,146,.36)';
          surface.fill();
          surface.strokeStyle = relief ? 'rgba(154,154,154,.19)' : 'rgba(219,225,200,.30)';
          surface.lineWidth = 0.38; surface.stroke();
        });
        bark.fillStyle = lichen % 4 ? 'rgba(96,117,87,.16)' : 'rgba(130,118,77,.16)';
        bark.beginPath(); bark.ellipse(fleckX, fleckY, fleckWidth * 0.40, fleckHeight * 0.35, fleck * 0.9, 0, Math.PI * 2); bark.fill();
        if (hash(lichen + 43, fleck + 67) < 0.26) {
          bark.fillStyle = 'rgba(67,71,49,.44)';
          bark.beginPath(); bark.ellipse(fleckX + fleckWidth * 0.20, fleckY, 0.24, 0.32, fleck, 0, Math.PI * 2); bark.fill();
        }
      }
      bark.restore(); barkHeight.restore();
    }
    var barkMap = texture(barkCanvas, 1);
    var barkBump = texture(barkHeightCanvas, 1); barkBump.encoding = THREE.LinearEncoding;
    var barkMat = material({ color: linear(0x7d7160), map: barkMap, bumpMap: barkBump, bumpScale: 0.014, roughness: 0.98 });
    // One square bark tile spans a branch's circumference, repeating along its
    // length (both read from the instance scale), so long trunks keep crisp
    // cracks instead of stretching one tile end to end.
    var barkTiling = ['#include <uv_vertex>', '#ifdef USE_INSTANCING',
      'vUv.y*=max(1.,length(instanceMatrix[1].xyz)/(6.2832*max(length(instanceMatrix[0].xyz),.001)));', '#endif'].join('\n');
    barkMat.onBeforeCompile = function (shader) { shader.vertexShader = shader.vertexShader.replace('#include <uv_vertex>', barkTiling); };
    barkMat.customProgramCacheKey = function () { return 'birdlab-bark-tiled-v1'; };
    // The old perch has shed strips of bark. Exposed fibres are paler and
    // shallower than the remaining bark; hash-only marks keep placement fixed.
    var dryCanvas = canvas(512), dryCtx = dryCanvas.getContext('2d');
    var dryHeightCanvas = canvas(512), dryHeightCtx = dryHeightCanvas.getContext('2d');
    dryCtx.drawImage(barkCanvas, 0, 0); dryHeightCtx.drawImage(barkHeightCanvas, 0, 0);
    for (var peel = 0; peel < 3; peel++) {
      var peelX = 78 + peel * 167, peelY = 28 + hash(peel, 57) * 84;
      var peelLength = 264 + hash(peel, 81) * 128, peelWidth = 13 + hash(peel, 39) * 19;
      [dryCtx, dryHeightCtx].forEach(function (surface, relief) {
        surface.save(); surface.beginPath();
        for (var edge = 0; edge <= 18; edge++) {
          var along = edge / 18, width = Math.pow(Math.sin(along * Math.PI), 0.44) * peelWidth;
          var split = (noise(peel * 17, along * 12) - 0.5) * 10;
          var sideX = peelX + split - width * (0.72 + hash(edge, peel + 4) * 0.28);
          if (!edge) surface.moveTo(sideX, peelY); else surface.lineTo(sideX, peelY + along * peelLength);
        }
        for (var back = 18; back >= 0; back--) {
          var backAlong = back / 18, backWidth = Math.pow(Math.sin(backAlong * Math.PI), 0.44) * peelWidth;
          surface.lineTo(peelX + (noise(peel * 17, backAlong * 12) - 0.5) * 10 + backWidth * (0.64 + hash(back, peel + 9) * 0.36), peelY + backAlong * peelLength);
        }
        surface.closePath();
        surface.fillStyle = relief ? '#818181' : '#b4ab94'; surface.fill();
        surface.strokeStyle = relief ? '#707070' : 'rgba(61,53,41,.60)';
        surface.lineWidth = relief ? 1.4 : 1.8; surface.stroke(); surface.clip();
        for (var fibre = 0; fibre < 65; fibre++) {
          var fibreX = peelX + (hash(fibre, peel + 51) - 0.5) * peelWidth * 2.2;
          var fibreY = peelY + hash(fibre, peel + 103) * peelLength;
          var fibreLength = 12 + hash(fibre, peel + 167) * 105;
          surface.strokeStyle = relief ? 'rgba(104,104,104,.24)' : fibre % 3 ? 'rgba(91,80,62,.22)' : 'rgba(225,215,189,.42)';
          surface.lineWidth = fibre % 7 ? 0.55 : 1.2; surface.beginPath();
          surface.moveTo(fibreX, fibreY);
          surface.bezierCurveTo(fibreX - 1.5, fibreY + fibreLength * 0.3, fibreX + 1.5, fibreY + fibreLength * 0.7, fibreX - 0.7, fibreY + fibreLength);
          surface.stroke();
        }
        surface.restore();
      });
    }
    var dryBarkMap = texture(dryCanvas, 1), dryBarkBump = texture(dryHeightCanvas, 1);
    dryBarkBump.encoding = THREE.LinearEncoding;
    var dryBarkMat = material({ color: linear(0xa29a89), map: dryBarkMap, bumpMap: dryBarkBump, bumpScale: 0.007, roughness: 0.98 });
    // The low deadwood sits in the near-level clearing. Damp surface growth
    // fades above its base; the high landing limb keeps its exposed dry grain.
    // Reuse the ground moss texture, so this adds neither a map nor a draw.
    dryBarkMat.onBeforeCompile = function (shader) {
      shader.uniforms.blDeadwoodMoss = { value: mossMap };
      shader.vertexShader = shader.vertexShader.replace('#include <uv_vertex>', barkTiling);
      shader.vertexShader = 'varying vec3 blWoodWorld;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <worldpos_vertex>', [
        '#include <worldpos_vertex>',
        '#ifdef USE_INSTANCING',
        'blWoodWorld=(modelMatrix*instanceMatrix*vec4(transformed,1.)).xyz;',
        '#else',
        'blWoodWorld=(modelMatrix*vec4(transformed,1.)).xyz;',
        '#endif'
      ].join('\n'));
      shader.fragmentShader = 'varying vec3 blWoodWorld; uniform sampler2D blDeadwoodMoss;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', [
        '#include <map_fragment>',
        'vec2 blMossUv=blWoodWorld.xz*.61+vec2(blWoodWorld.y*.19,blWoodWorld.y*.43);',
        'vec3 blMossGrowth=texture2D(blDeadwoodMoss,blMossUv).rgb;',
        'float blDampBase=1.-smoothstep(.08,.85,blWoodWorld.y);',
        'float blMossCover=smoothstep(.53,.68,blMossGrowth.r)*blDampBase*.84;',
        'vec3 blMossPigment=vec3(.083,.108,.043)*(.66+blMossGrowth.g*.64);',
        'diffuseColor.rgb=mix(diffuseColor.rgb,blMossPigment,blMossCover);'
      ].join('\n'));
    };
    dryBarkMat.customProgramCacheKey = function () { return 'birdlab-damp-deadwood-v2'; };
    // The shared wood surface carries a slight lengthwise swell and bend. Its
    // end rings stay fixed so connected boughs, roots and exposed end grain
    // still meet. Only the high-quality mesh gains an intermediate ring.
    var woodSides = detailed ? 12 : 6, woodSpans = detailed ? 2 : 1;
    var branchGeo = geometry(new THREE.CylinderGeometry(0.66, 1, 1, woodSides, woodSpans));
    var branchPos = branchGeo.attributes.position;
    for (var barkPoint = 0; barkPoint < branchPos.count; barkPoint++) {
      var barkX = branchPos.getX(barkPoint), barkY = branchPos.getY(barkPoint), barkZ = branchPos.getZ(barkPoint);
      var fluting = 1 + Math.sin(Math.atan2(barkZ, barkX) * 5 + barkY * 2) * 0.045;
      var woodBend = detailed ? Math.max(0, 1 - 4 * barkY * barkY) : 0;
      var woodSwell = 1 + woodBend * 0.028;
      branchPos.setXYZ(barkPoint, barkX * fluting * woodSwell + woodBend * 0.045,
        barkY, barkZ * fluting * woodSwell - woodBend * 0.028);
    }
    branchGeo.computeVertexNormals();
    if (detailed) {
      // Cylinder UVs duplicate the longitude seam. Join its lighting normals
      // after sculpting, without smoothing across the exposed flat end caps.
      var woodNormals = branchGeo.attributes.normal, joinedWoodNormal = new THREE.Vector3();
      for (var woodRing = 0; woodRing <= woodSpans; woodRing++) {
        var seamStart = woodRing * (woodSides + 1), seamEnd = seamStart + woodSides;
        joinedWoodNormal.set(woodNormals.getX(seamStart) + woodNormals.getX(seamEnd),
          woodNormals.getY(seamStart) + woodNormals.getY(seamEnd),
          woodNormals.getZ(seamStart) + woodNormals.getZ(seamEnd)).normalize();
        woodNormals.setXYZ(seamStart, joinedWoodNormal.x, joinedWoodNormal.y, joinedWoodNormal.z);
        woodNormals.setXYZ(seamEnd, joinedWoodNormal.x, joinedWoodNormal.y, joinedWoodNormal.z);
      }
    }
    var branches = [], leaves = [[], []], treeLocations = [], walkObstacles = [];
    var observationPerches = [new THREE.Vector3(0, 3.2, 0)];
    function branch(start, end, radius, dry) { branches.push({ a: start, b: end, r: radius, dry: !!dry }); }
    // Later shape refinements are hash-shaded, not drawn from random(), so
    // adding a segment never moves a plant or stone in the seeded clearing.
    function extraBranch(start, end, radius) { branches.push({ a: start, b: end, r: radius, dry: true, hashed: true }); }
    function leafCard(x, y, z, sx, sy, sz, angle, lean, type) {
      leaves[type].push({ x: x, y: y, z: z, sx: sx, sy: sy, sz: sz, angle: angle, lean: lean, shade: 0.8 + random() * 0.38 });
    }
    function tree(x, z, height, pine) {
      var y = groundHeight(x, z), bend = (random() - 0.5) * height * 0.13;
      var radius = height * (pine ? 0.022 : 0.025);
      treeLocations.push({ x: x, z: z, radius: height * 0.32, pine: !!pine });
      walkObstacles.push({ ax:x, az:z, bx:x, bz:z, radius:radius + .22 });
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
          if (detailed) {
            // A living leader is enclosed by progressively smaller whorls.
            // Reuse the existing thirty sprays; the upper ones used to stop
            // well below the stem tip and leave a conspicuous bare pole.
            fraction = tier / 5;
            reach = height * 0.22 * (1 - fraction * 0.83);
            level = y + height * (0.40 + fraction * 0.55);
          }
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
            if (detailed) {
              // Foliage follows the outer two thirds of a bough and turns up
              // around its shoot. Hash-only variation keeps later trees fixed.
              var needleSpray = leaves[1][leaves[1].length - 1];
              var shootAlong = 0.60 + hash(tier + 41, spoke + 73) * 0.10;
              needleSpray.x = boughBase[0] + (px - boughBase[0]) * shootAlong;
              needleSpray.z = boughBase[2] + (pz - boughBase[2]) * shootAlong;
              needleSpray.y += height * (0.016 + fraction * 0.006);
              needleSpray.sx *= 1.16;
              needleSpray.sz *= 1.10;
              needleSpray.sy *= 1.16 - fraction * 0.12;
              needleSpray.lean += (hash(tier + 11, spoke + 19) - 0.5) * 0.25;
            }
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
    branch([-1.03, 2.89, -0.20], [-1.11, 3.91, -0.48], 0.105, true);
    branch([-1.11, 3.91, -0.48], [-1.01, 4.09, -0.51], 0.069, true);
    branch([-1.01, 4.09, -0.51], [-0.95, 4.18, -0.52], 0.045, true);
    branch([-0.95, 4.18, -0.52], [-0.935, 4.235, -0.535], 0.026, true);
    branch([-1.075, 3.98, -0.495], [-1.20, 4.07, -0.56], 0.010, true);
    // Buttress roots dive into the soil close to the trunk; long ones lying
    // on the surface read as planks crossing the clearing.
    branch([-1.45, 0.20, -0.62], [-1.86, -0.05, -0.83], 0.11, true);
    branch([-1.42, 0.20, -0.59], [-1.24, -0.05, -0.99], 0.10, true);
    branch([-1.47, 0.17, -0.60], [-1.10, -0.04, -0.45], 0.075, true);
    // Fallen weathered branches make the foreground legible at close range.
    branch([-5.3, groundHeight(-5.3, -3) + 0.2, -3], [-2.8, groundHeight(-2.8, -3.8) + 0.09, -3.8], 0.19, true);
    branch([-4.6, groundHeight(-4.6, -3.2) + 0.21, -3.2], [-4.8, groundHeight(-4.8, -4.4) + 0.08, -4.4], 0.072, true);
    // Additional lookout limbs give free-ranging birds real landing surfaces.
    [[-5.8,-4.4,2.7,1],[6.2,-5.8,3.0,-1]].forEach(function(site) {
      var x=site[0], z=site[1], y=groundHeight(x,z), top=y+site[2], s=site[3];
      // The trunk bows once, and the landing limb sweeps up about 11 degrees
      // instead of leaving at a right angle. Its axis still crosses the perch
      // at top-.1; the lit upper surface rises by the slope of the limb.
      var bow=[x-.45,y-.1+(top-y)*.55,z+.07*s], rise=.16, armA=[x-.35,top-.1-.542*rise,z], armB=[x+.48,top-.1+.458*rise,z];
      branch([x-.5,y-.1,z],bow,.18,true);
      extraBranch(bow,[x-.35,top-.1,z],.125);
      branch(armA,armB,.10,true);
      observationPerches.push(new THREE.Vector3(x+.1,top-.1+.0816*Math.hypot(.83,rise)/.83,z));
      // A snag, not a signpost: the trunk continues to a broken crown, the
      // limb tapers out instead of ending in a sawn face, and a stub and two
      // root flares break the straight post. The landing span is unchanged.
      branch([x-.35,top-.1,z],[x-.29,top+.62,z+.06*s],.12,true);
      branch([x-.29,top+.62,z+.06*s],[x-.255,top+.88,z+.04*s],.079,true);
      branch(armB,[x+.78,armB[1]+.11,z-.05*s],.066,true);
      branch([x+.78,armB[1]+.11,z-.05*s],[x+.93,armB[1]+.27,z-.07*s],.036,true);
      // Broken side stubs on the far side of the trunk, clear of the approach.
      extraBranch([x-.47,y+.95,z],[x-.80,y+1.12,z-.20*s],.036);
      extraBranch([x-.42,top-.38,z],[x-.58,top-.14,z-.27*s],.030);
      extraBranch([x-.33,top+.34,z+.04*s],[x-.53,top+.52,z-.13*s],.026);
      branch([x-.40,top-.72,z],[x-.72,top-.44,z+.24*s],.05,true);
      branch([x-.49,y+.14,z],[x-.93,y-.03,z+.22*s],.088,true);
      branch([x-.47,y+.14,z],[x-.22,y-.04,z-.36*s],.078,true);
    });
    branches.forEach(function(entry) {
      var floor=groundHeight((entry.a[0]+entry.b[0])*.5,(entry.a[2]+entry.b[2])*.5);
      if(Math.min(entry.a[1],entry.b[1])>floor+2.0)return;
      walkObstacles.push({ax:entry.a[0],az:entry.a[2],bx:entry.b[0],bz:entry.b[2],radius:entry.r+.08});
    });

    function makeBranches(dry) {
      var batch = branches.filter(function (entry) { return entry.dry === dry; });
      var mesh = new THREE.InstancedMesh(branchGeo, dry ? dryBarkMat : barkMat, batch.length);
      mesh.name = dry ? 'weathered-landing-limb' : 'branching-woodland-trunks';
      batch.forEach(function (entry, index) {
        a.fromArray(entry.a); b.fromArray(entry.b); direction.subVectors(b, a);
        dummy.position.copy(a).add(b).multiplyScalar(0.5);
        dummy.quaternion.setFromUnitVectors(up, direction.clone().normalize());
        dummy.scale.set(entry.r, direction.length(), entry.r); dummy.updateMatrix(); mesh.setMatrixAt(index, dummy.matrix);
        var barkShade = entry.hashed ? 0.84 + hash(entry.a[0] * 13.1, entry.a[2] * 7.7 + entry.a[1]) * 0.20 : dry ? 0.84 + random() * 0.20 : 0.73 + random() * 0.32;
        var barkWarmth = entry.hashed ? 0.96 + hash(entry.b[0] * 5.3, entry.b[2] * 3.1) * 0.06 : 0.96 + random() * 0.06;
        tint.setRGB(barkShade, barkShade * barkWarmth, barkShade * 0.91); mesh.setColorAt(index, tint);
      });
      mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true; mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.frustumCulled = false; root.add(mesh);
    }
    makeBranches(false); makeBranches(true);

    // Only disconnected, visible dry tips expose end grain. Continuous joints
    // keep their bark, and a single tiny instance batch adds no per-frame work.
    var dryBranches = branches.filter(function (entry) { return entry.dry; });
    var brokenTips = dryBranches.filter(function (entry) {
      if (entry.b[1] < groundHeight(entry.b[0], entry.b[2]) + 0.06) return false;
      return !dryBranches.some(function (next) {
        return next !== entry && Math.hypot(next.a[0] - entry.b[0], next.a[1] - entry.b[1], next.a[2] - entry.b[2]) < 0.025;
      });
    });
    var endCanvas = canvas(256), endCtx = endCanvas.getContext('2d');
    var endPixels = endCtx.createImageData(256, 256);
    for (var endY = 0; endY < 256; endY++) {
      for (var endX = 0; endX < 256; endX++) {
        var radialX = (endX - 115) / 128, radialY = (endY - 136) / 128;
        var ringRadius = Math.hypot(radialX * 0.92, radialY), ringAngle = Math.atan2(radialY, radialX);
        var ringWarp = Math.sin(ringAngle * 3 + ringRadius * 2) * 0.010 + noise(endX * 0.045, endY * 0.045) * 0.022;
        var growthRing = Math.pow(0.5 + 0.5 * Math.sin((ringRadius + ringWarp) * 126), 11);
        var rays = Math.pow(0.5 + 0.5 * Math.sin(ringAngle * 46 + ringRadius * 3), 19) * 4;
        var endTone = noise(endX * 0.052, endY * 0.052) * 10 + hash(endX, endY) * 9 - growthRing * 18 - rays;
        var rim = smooth((Math.hypot((endX - 128) / 128, (endY - 128) / 128) - 0.83) / 0.14) * 29;
        var endPixel = (endY * 256 + endX) * 4;
        endPixels.data[endPixel] = 164 + endTone - rim;
        endPixels.data[endPixel + 1] = 151 + endTone - rim;
        endPixels.data[endPixel + 2] = 123 + endTone - rim;
        endPixels.data[endPixel + 3] = 255;
      }
    }
    endCtx.putImageData(endPixels, 0, 0);
    for (var split = 0; split < 4; split++) {
      var splitAngle = split * 1.77 + 0.48, splitLength = 31 + hash(split, 327) * 44;
      endCtx.save(); endCtx.translate(128, 128); endCtx.rotate(splitAngle);
      endCtx.strokeStyle = 'rgba(56,46,32,.67)'; endCtx.lineWidth = 0.7 + hash(split, 59) * 0.85;
      endCtx.beginPath(); endCtx.moveTo(125, 0); endCtx.lineTo(103, 1.8);
      endCtx.lineTo(125 - splitLength * 0.65, -1.5); endCtx.lineTo(125 - splitLength, 0.6); endCtx.stroke(); endCtx.restore();
    }
    var endMap = texture(endCanvas), endMat = material({ color: linear(0xbfb59d), map: endMap, roughness: 1 });
    var endSegments = woodSides;
    var endGeo = geometry(new THREE.CircleGeometry(1, endSegments, -Math.PI / 2));
    var endPos = endGeo.attributes.position;
    for (var endVertex = 1; endVertex < endPos.count; endVertex++) {
      var capX = endPos.getX(endVertex), capY = endPos.getY(endVertex);
      var capFlute = 1 + Math.sin(Math.atan2(-capY, capX) * 5 + 1) * 0.045;
      endPos.setXYZ(endVertex, capX * capFlute, capY * capFlute, (hash((endVertex - 1) % endSegments, 721) - 0.5) * 0.09);
    }
    endGeo.computeVertexNormals();
    var endGrain = new THREE.InstancedMesh(endGeo, endMat, brokenTips.length);
    endGrain.name = 'weathered-wood-broken-end-grain';
    brokenTips.forEach(function (entry, index) {
      a.fromArray(entry.a); b.fromArray(entry.b); direction.subVectors(b, a).normalize();
      dummy.position.copy(b).addScaledVector(direction, entry.r * 0.035 + 0.0005);
      dummy.quaternion.setFromUnitVectors(up, direction);
      // Match the cylindrical side's original angular frame before turning
      // the disc normal from +Z to +Y, so its irregular rim stays attached.
      dummy.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2));
      dummy.scale.setScalar(entry.r * 0.66); dummy.updateMatrix(); endGrain.setMatrixAt(index, dummy.matrix);
    });
    endGrain.instanceMatrix.needsUpdate = true; endGrain.frustumCulled = false;
    endGrain.castShadow = true; endGrain.receiveShadow = true; root.add(endGrain);

    function canopyCanvas(pine, variant) {
      var cv = canvas(512), ctx = cv.getContext('2d');
      // Each leaf has its own folded surface, independently of the brightness
      // painted into the albedo. Keep relief in linear tangent space.
      var normalCanvas = pine ? null : canvas(512), normalCtx = normalCanvas && normalCanvas.getContext('2d');
      if (normalCtx) { normalCtx.fillStyle = 'rgb(128,128,255)'; normalCtx.fillRect(0, 0, 512, 512); }
      var textureSample = 0;
      // The original spray consumes exactly the established placement stream.
      // Additional variants draw from a separate hash, leaving the scene fixed.
      function leafRandom() { return variant ? hash(++textureSample + variant * 7919, variant * 103) : random(); }
      function stroke(x1, y1, x2, y2, width, shade) {
        ctx.strokeStyle = shade; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      }
      function leafOutline(surface, size, shape) {
        surface.beginPath(); surface.moveTo(0, -size);
        if (shape === 3) {
          // A finely scalloped margin adds a distinct, smaller leaf form.
          for (var edge = 1; edge < 13; edge++) {
            var t = edge / 13;
            surface.lineTo(Math.sin(t * Math.PI) * size * (edge % 2 ? 0.62 : 0.49), (t * 2 - 1) * size);
          }
          surface.lineTo(0, size);
          for (var back = 12; back > 0; back--) {
            var bt = back / 13;
            surface.lineTo(-Math.sin(bt * Math.PI) * size * (back % 2 ? 0.57 : 0.47), (bt * 2 - 1) * size);
          }
          surface.closePath();
        } else {
          surface.bezierCurveTo(size * 0.84, -size * 0.3, size * 0.56, size * 0.5, 0, size);
          surface.bezierCurveTo(-size * 0.7, size * 0.4, -size * 0.67, -size * 0.55, 0, -size);
        }
      }
      function leafFrame(surface, x, y, turn, shape) {
        surface.save(); surface.translate(x, y); surface.rotate(turn);
        if (shape === 1) surface.scale(0.66, 1.13);
        if (shape === 2) surface.scale(1.18, 0.83);
        if (shape === 3) surface.scale(0.91, 1.02);
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
        var shootBend = pine && detailed ? 12 + hash(limb + 217, 43) * 31 : 0;
        if (shootBend) {
          ctx.strokeStyle = '#898976'; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.moveTo(256, cy + 30);
          ctx.quadraticCurveTo(256 + side * span * 0.54, (cy + 30 + endY) * 0.5 + shootBend, endX, endY); ctx.stroke();
        } else stroke(256, cy + 30, endX, endY, pine ? 2.2 : 1.8, '#aaa38a');
        for (var leaf = 0; leaf < (pine ? 76 : leafShape === 3 ? 31 : 25); leaf++) {
          var fraction = leafRandom(), px = 256 + side * span * fraction, py = cy + 30 + (endY - cy - 30) * fraction;
          var shade = Math.floor(144 + leafRandom() * 104);
          if (pine) {
            // Retain five seed samples per needle, including in low quality.
            // Paired needles radiate around a curved shoot instead of forming
            // the equally slanted teeth of a flat fern/comb silhouette.
            var needleSpread = leafRandom(), needleLength = leafRandom(), needleWidth = leafRandom();
            var needleColor = 'rgb(' + shade + ',' + shade + ',' + Math.floor(shade * 0.91) + ')';
            if (detailed) {
              px += side * span * 0.08 * fraction * (1 - fraction);
              py += 2 * shootBend * fraction * (1 - fraction);
              var tangentX = side * span * (1.08 - fraction * 0.16);
              var tangentY = endY - cy - 30 + 2 * shootBend * (1 - 2 * fraction);
              var tangentLength = Math.hypot(tangentX, tangentY);
              tangentX /= tangentLength; tangentY /= tangentLength;
              var needleSide = leaf % 2 ? 1 : -1;
              var needleFan = 0.58 + needleSpread * 0.72;
              var needleReach = (10 + needleLength * 20) * (0.81 + fraction * 0.19);
              var needleX = (tangentX * Math.cos(needleFan) - tangentY * needleSide * Math.sin(needleFan)) * needleReach;
              var needleY = (tangentY * Math.cos(needleFan) + tangentX * needleSide * Math.sin(needleFan)) * needleReach;
              ctx.strokeStyle = needleColor; ctx.lineWidth = 1.35 + needleWidth * 0.95;
              ctx.beginPath(); ctx.moveTo(px, py);
              ctx.quadraticCurveTo(px + needleX * 0.44 - tangentY * needleSide * 1.6,
                py + needleY * 0.44 + tangentX * needleSide * 1.6, px + needleX, py + needleY); ctx.stroke();
              if (leaf % 2) {
                // A second needle shares the same basal fascicle, with a small
                // natural split rather than a second row detached from the twig.
                stroke(px, py, px + needleX * 0.87 + tangentX * 3.5,
                  py + needleY * 0.87 + tangentY * 3.5, 1.1, '#a8ad95');
              }
            } else {
              stroke(px, py, px + side * (4 + needleSpread * 10), py - 7 - needleLength * 18, 1.6 + needleWidth, needleColor);
              if (leaf % 2) stroke(px, py, px + side * 6, py + 11, 1.3, '#abae98');
            }
          } else {
            var smallSide = leaf % 2 ? 1 : -1, size = 7 + leafRandom() * 8;
            if (leafShape === 1) size *= 1.06;
            if (leafShape === 3) size *= 0.84;
            var ex = px + (leafRandom() - 0.5) * 15, ey = py + smallSide * (7 + leafRandom() * 18);
            stroke(px, py, ex, ey, 0.7, '#a29c7a');
            var leafTurn = side * 0.7 + (leafRandom() - 0.5);
            leafFrame(ctx, ex, ey, leafTurn, leafShape);
            var grad = ctx.createLinearGradient(-size, 0, size, 0);
            grad.addColorStop(0, 'rgb(' + Math.floor(shade * 0.67) + ',' + Math.floor(shade * 0.72) + ',' + Math.floor(shade * 0.60) + ')');
            grad.addColorStop(0.52, 'rgb(' + shade + ',' + shade + ',' + Math.floor(shade * 0.88) + ')');
            grad.addColorStop(1, '#c4c5a0'); ctx.fillStyle = grad;
            leafOutline(ctx, size, leafShape);
            ctx.fill();
            // Both the position and the normal rotate with the leaf. Otherwise
            // all of the apparent midribs would catch light in one direction.
            leafFrame(normalCtx, ex, ey, leafTurn, leafShape);
            leafOutline(normalCtx, size, leafShape);
            var leafRelief = normalCtx.createLinearGradient(-size * 0.62, 0, size * 0.62, 0);
            var localTilt = (hash(limb + 23, leaf + variant * 29) - 0.5) * 0.24;
            function leafNormal(across) {
              var nx = across * Math.cos(leafTurn) - localTilt * Math.sin(leafTurn);
              // Canvas Y points down; tangent-space green points up.
              var ny = -across * Math.sin(leafTurn) - localTilt * Math.cos(leafTurn);
              var nz = Math.sqrt(Math.max(0.01, 1 - nx * nx - ny * ny));
              return 'rgb(' + Math.round(127.5 + nx * 127.5) + ',' + Math.round(127.5 + ny * 127.5) + ',' + Math.round(127.5 + nz * 127.5) + ')';
            }
            leafRelief.addColorStop(0, leafNormal(-0.39));
            leafRelief.addColorStop(0.44, leafNormal(-0.18));
            leafRelief.addColorStop(0.50, leafNormal(0));
            leafRelief.addColorStop(0.56, leafNormal(0.18));
            leafRelief.addColorStop(1, leafNormal(0.39));
            normalCtx.fillStyle = leafRelief; normalCtx.fill(); normalCtx.restore();
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
      return { color: cv, normal: normalCanvas };
    }
    function canopyTexture(pine) {
      var original = canopyCanvas(pine, 0);
      if (pine) return { color: texture(original.color), normal: null };
      // Four alpha sprites in one texture retain one foliage draw and one
      // shadow draw. Low quality uses a 512px atlas; high uses 1024px.
      var atlas = canvas(detailed ? 1024 : 512), atlasCtx = atlas.getContext('2d'), tile = atlas.width / 2;
      var normalAtlas = canvas(atlas.width), normalAtlasCtx = normalAtlas.getContext('2d');
      normalAtlasCtx.fillStyle = 'rgb(128,128,255)'; normalAtlasCtx.fillRect(0, 0, atlas.width, atlas.width);
      for (var variant = 0; variant < 4; variant++) {
        var sprayCanvas = variant ? canopyCanvas(false, variant) : original;
        atlasCtx.drawImage(sprayCanvas.color, (variant % 2) * tile + 4, Math.floor(variant / 2) * tile + 4, tile - 8, tile - 8);
        normalAtlasCtx.drawImage(sprayCanvas.normal, (variant % 2) * tile + 4, Math.floor(variant / 2) * tile + 4, tile - 8, tile - 8);
      }
      var normals = texture(normalAtlas); normals.encoding = THREE.LinearEncoding;
      return { color: texture(atlas), normal: normals };
    }
    function cardGeometry(cupped) {
      var positions = [], uvs = [], normals = [], indices = [];
      function panel(points, normal) {
        var offset = positions.length / 3;
        if (cupped && detailed) {
          // A leafy twig carries a shallow, uneven bowl of leaves. Retain the
          // same four sprite outlines, but bend their interiors so nearby
          // crowns have depth instead of four intersecting sheets of paper.
          var facing = new THREE.Vector3(normal[0], normal[1], normal[2]).normalize();
          var along = new THREE.Vector3(), across = new THREE.Vector3(), surface = new THREE.Vector3();
          var samples = [[0, 0], [1, 0], [1, 1], [0, 1], [0.5, 0.5]];
          for (var sample = 0; sample < samples.length; sample++) {
            var u = samples[sample][0], v = samples[sample][1];
            var sinU = Math.sin(u * Math.PI), sinV = Math.sin(v * Math.PI);
            var cup = 0.21 * sinU * sinV + 0.10 * (u - 0.5) * sinV;
            var cupU = (0.21 * Math.PI * Math.cos(u * Math.PI) + 0.10) * sinV;
            var cupV = (0.21 * sinU + 0.10 * (u - 0.5)) * Math.PI * Math.cos(v * Math.PI);
            var point = [];
            for (var axis = 0; axis < 3; axis++) {
              var lower = points[0][axis] * (1 - u) + points[1][axis] * u;
              var upper = points[3][axis] * (1 - u) + points[2][axis] * u;
              var component = facing.getComponent(axis);
              point[axis] = lower * (1 - v) + upper * v + component * cup;
              along.setComponent(axis, (points[1][axis] - points[0][axis]) * (1 - v) +
                (points[2][axis] - points[3][axis]) * v + component * cupU);
              across.setComponent(axis, upper - lower + component * cupV);
            }
            surface.crossVectors(along, across).normalize();
            // A little envelope shading joins the folded leaf normal map to
            // the twig volume; most of the normal follows the curved surface.
            surface.multiplyScalar(0.84).addScaledVector(facing, 0.16);
            surface.x += point[0] * 0.10; surface.y += point[1] * 0.07 + 0.035; surface.z += point[2] * 0.10;
            surface.normalize();
            positions.push(point[0], point[1], point[2]); normals.push(surface.x, surface.y, surface.z); uvs.push(u, v);
          }
          for (var corner = 0; corner < 4; corner++) indices.push(offset + corner, offset + (corner + 1) % 4, offset + 4);
          return;
        }
        points.forEach(function (point) {
          positions.push(point[0], point[1], point[2]);
          // A rounded spray envelope blends lighting across intersecting cards
          // with the same vertex count and the original leaf silhouettes.
          var nx = normal[0] + (cupped ? point[0] * 0.26 : 0);
          var ny = normal[1] + (cupped ? point[1] * 0.17 + 0.10 : 0);
          var nz = normal[2] + (cupped ? point[2] * 0.26 : 0);
          var magnitude = Math.hypot(nx, ny, nz);
          normals.push(nx / magnitude, ny / magnitude, nz / magnitude);
        });
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
      var bough = kind !== 'grass', flutter = kind === 'bough' ? '.10' : kind === 'needles' ? '.035' : '.045';
      var torsion = kind === 'bough' ? '.32' : kind === 'needles' ? '.065' : '.04';
      // A spray bends from its stem and twists slightly as its outer leaves
      // lag the passing breeze. Analytic derivatives carry the surface normals
      // with it; the exact same deformation also draws the moving shadows.
      var deformation = [
        'uniform float blHabitatPhase; uniform vec3 blHabitatWind;',
        'void blWoodlandWind(vec3 point,vec3 surfaceNormal,out vec3 moved,out vec3 movedNormal){',
        'moved=point; movedNormal=surfaceNormal;',
        '#ifdef USE_INSTANCING',
        'vec3 origin=(modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.)).xyz;',
        'vec3 basisX=instanceMatrix[0].xyz,basisY=instanceMatrix[1].xyz,basisZ=instanceMatrix[2].xyz;',
        'vec3 wind=vec3(dot(blHabitatWind,basisX)/max(dot(basisX,basisX),.0001),dot(blHabitatWind,basisY)/max(dot(basisY,basisY),.0001),dot(blHabitatWind,basisZ)/max(dot(basisZ,basisZ),.0001));',
        // Short tilted stems must not fold through themselves in a strong gust.
        'wind/=max(1.,abs(wind.y)*2.);',
        'float height=clamp(point.y' + (bough ? '+.5' : '') + ',0.,1.);',
        'float dh=(height>0. && height<1.)?1.:0.;',
        'float weight=height*height*height*(10.+height*(-15.+height*6.));',
        'float dw=30.*height*height*(1.-height)*(1.-height)*dh;',
        'float gust=.64+.24*sin(blHabitatPhase*6.+origin.x*.17+origin.z*.13)+.12*sin(blHabitatPhase*11.+origin.z*.43);',
        'float waveA=blHabitatPhase*23.+origin.x*.61+origin.z*.47-weight*.9;',
        'float waveB=blHabitatPhase*37.-origin.x*.43+origin.z*.69-weight*1.3;',
        'float flutter=.6*sin(waveA)+.4*sin(waveB);',
        'float df=(-.54*cos(waveA)-.52*cos(waveB))*dw;',
        'float flex=' + (bough ? '.52' : '.65') + ';',
        'float bend=flex*weight*(gust+' + flutter + '*flutter);',
        'float db=flex*(dw*(gust+' + flutter + '*flutter)+weight*' + flutter + '*df);',
        'float twist=min(length(blHabitatWind),.5)*' + torsion + ';',
        'float angle=twist*weight*flutter, da=twist*(dw*flutter+weight*df);',
        'float c=cos(angle),s=sin(angle);',
        'vec3 turned=vec3(c*point.x+s*point.z,point.y,-s*point.x+c*point.z);',
        'moved=turned+wind*bend;',
        'vec3 derivative=vec3(turned.z,0.,-turned.x)*da+wind*db;',
        'movedNormal=vec3(c*surfaceNormal.x+s*surfaceNormal.z,surfaceNormal.y,-s*surfaceNormal.x+c*surfaceNormal.z);',
        // Inverse transpose of rotation plus a height-dependent shear. Using
        // only the rotation would leave the bent stem's lighting behind.
        'movedNormal.y-=dot(derivative,movedNormal)/(1.+derivative.y);',
        'movedNormal=normalize(movedNormal);',
        '#endif',
        '}'
      ].join('\n');
      mat.onBeforeCompile = function (shader) {
        shader.uniforms.blHabitatPhase = cyclePhase; shader.uniforms.blHabitatWind = breeze;
        shader.vertexShader = deformation + '\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('void main() {', [
          'void main() {',
          'vec3 blBentPosition,blBentNormal;',
          'blWoodlandWind(position,normal,blBentPosition,blBentNormal);'
        ].join('\n'));
        shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>',
          '#include <beginnormal_vertex>\nobjectNormal=blBentNormal;');
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
          'transformed=blBentPosition;'
        ].join('\n'));
      };
      mat.customProgramCacheKey = function () { return 'birdlab-woodland-wind-v4-' + kind + (atlas ? '-spray-atlas' : ''); };
    }
    function applyLeafTransmission(mat) {
      if (!detailed) return;
      // A thin living lamina passes some filtered sunlight through its back.
      // Use Three's shadowed incident light, so shaded leaves cannot glow and
      // front-lit surfaces retain their existing diffuse/specular response.
      var previous = mat.onBeforeCompile, previousKey = mat.customProgramCacheKey.call(mat);
      mat.onBeforeCompile = function (shader, renderer) {
        previous.call(this, shader, renderer);
        shader.fragmentShader = shader.fragmentShader.replace('#include <lights_physical_pars_fragment>', [
          '#include <lights_physical_pars_fragment>',
          'void blLeafDirect(const in IncidentLight directLight,const in GeometricContext geometry,const in PhysicalMaterial material,inout ReflectedLight reflectedLight){',
          'RE_Direct_Physical(directLight,geometry,material,reflectedLight);',
          'float through=max(0.,-dot(geometry.normal,directLight.direction));',
          'vec3 irradiance=through*directLight.color;',
          '#ifndef PHYSICALLY_CORRECT_LIGHTS',
          'irradiance*=PI;',
          '#endif',
          'reflectedLight.directDiffuse+=irradiance*BRDF_Diffuse_Lambert(material.diffuseColor*vec3(.36,.48,.23));',
          '}',
          '#undef RE_Direct',
          '#define RE_Direct blLeafDirect'
        ].join('\n'));
      };
      mat.customProgramCacheKey = function () { return previousKey + '|birdlab-thin-leaf-v1'; };
    }
    leaves.forEach(function (batch, kind) {
      if (!batch.length) return;
      var cards = cardGeometry(kind === 0), leafTextures = canopyTexture(kind === 1), leafMap = leafTextures.color;
      var mat = material({ color: linear(kind ? 0x698060 : 0x83925a), map: leafMap,
        normalMap: leafTextures.normal, normalScale: new THREE.Vector2(0.72, 0.72),
        alphaTest: 0.37, side: THREE.DoubleSide, roughness: 0.96 });
      applyWind(mat, kind ? 'needles' : 'bough', kind === 0);
      if (kind === 0) applyLeafTransmission(mat);
      var sprayVariants = kind === 0 ? new Float32Array(batch.length) : null;
      if (sprayVariants) cards.setAttribute('blSprayVariant', new THREE.InstancedBufferAttribute(sprayVariants, 1));
      var instances = new THREE.InstancedMesh(cards, mat, batch.length);
      instances.name = kind ? 'airy-needle-boughs' : 'individual-leaf-sprays';
      var depth = keep(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: leafMap, alphaTest: 0.37, side: THREE.DoubleSide }));
      applyWind(depth, kind ? 'needles' : 'bough', kind === 0); instances.customDepthMaterial = depth;
      batch.forEach(function (leaf, index) {
        dummy.position.set(leaf.x, leaf.y, leaf.z); dummy.rotation.set(leaf.lean, leaf.angle, leaf.lean * 0.6);
        if (kind === 0 && detailed) {
          // Independent twig roll avoids repeated parallel crowns without
          // consuming the placement seed or adding a shader/instance buffer.
          dummy.rotation.x += (hash(index + 73, 311) - 0.5) * 0.24;
          dummy.rotation.z += (hash(index + 197, 509) - 0.5) * 0.42;
        }
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

    // Lobed pinnae and fine veins share one atlas. Close fronds get irregular
    // botanical margins without adding geometry or consuming placement seeds.
    var fernCanvas = canvas(256), fernCtx = fernCanvas.getContext('2d');
    var fernPixels = fernCtx.createImageData(256, 256);
    for (var fernY = 0; fernY < 256; fernY++) {
      var fernT = fernY / 255;
      var fernHalfWidth = Math.pow(Math.sin(fernT * Math.PI), 0.62) * 0.47;
      for (var fernX = 0; fernX < 256; fernX++) {
        var fernAcross = fernX / 255 - 0.5;
        var teeth = Math.sin(fernT * Math.PI * 32 + Math.sign(fernAcross) * 0.8) * 0.018;
        var fernEdge = fernHalfWidth * (0.96 + teeth);
        if (detailed) {
          var fernSide = fernAcross < 0 ? -1 : 1;
          var lobePhase = fernT * Math.PI * 28 + fernSide * 0.92 + Math.sin(fernT * 11) * 0.44;
          var lobe = Math.pow(0.5 + Math.sin(lobePhase) * 0.5, 1.7);
          var lobeDepth = (0.11 + noise(fernT * 9, fernSide + 4) * 0.08) * Math.sin(fernT * Math.PI);
          fernEdge = fernHalfWidth * (0.94 - lobe * lobeDepth + fernSide * (0.018 + fernT * 0.022));
          // Keep the midrib connected to the rachis at the narrow leaf base.
          fernEdge = Math.max(fernEdge, 0.004 * (1 - smooth((fernT - 0.90) / 0.10)));
        }
        var fernAlpha = smooth((fernEdge - Math.abs(fernAcross)) * 256);
        var fernGrain = hash(fernX, fernY) * 6;
        var sideShade = fernAcross < 0 ? 0 : 8;
        var fernTone = 189 + Math.sin(fernT * Math.PI) * 18 + sideShade + fernGrain;
        if (detailed) {
          var fernMargin = smooth((Math.abs(fernAcross) / Math.max(fernEdge, 0.004) - 0.66) / 0.34);
          var fernMottle = noise(fernX * 0.055, fernY * 0.045) - 0.5;
          fernTone += fernMottle * 17 + fernMargin * 8 - Math.exp(-Math.abs(fernAcross) * 34) * 6;
        }
        var fernPixel = (fernY * 256 + fernX) * 4;
        fernPixels.data[fernPixel] = fernTone * 0.91;
        fernPixels.data[fernPixel + 1] = fernTone;
        fernPixels.data[fernPixel + 2] = fernTone * 0.81;
        fernPixels.data[fernPixel + 3] = fernAlpha * 255;
      }
    }
    fernCtx.putImageData(fernPixels, 0, 0);
    // Veins inherit the alpha silhouette: exposed vein strokes at a lobe's
    // notch would otherwise look like wiry needles around the fern margins.
    if (detailed) fernCtx.globalCompositeOperation = 'source-atop';
    fernCtx.strokeStyle = detailed ? 'rgba(224,228,184,.38)' : 'rgba(224,228,184,.52)'; fernCtx.lineWidth = 1.1;
    fernCtx.beginPath(); fernCtx.moveTo(128, 5); fernCtx.lineTo(128, 251); fernCtx.stroke();
    for (var fernVein = 1; fernVein < 13; fernVein++) {
      var fy = fernVein * 19, fw = Math.sin(fy / 256 * Math.PI) * 101;
      fernCtx.strokeStyle = 'rgba(104,127,74,.24)'; fernCtx.lineWidth = 0.65;
      fernCtx.beginPath(); fernCtx.moveTo(128, fy + 15); fernCtx.quadraticCurveTo(128 - fw * 0.53, fy + 6, 128 - fw, fy - 8);
      fernCtx.moveTo(128, fy + 12); fernCtx.quadraticCurveTo(128 + fw * 0.54, fy + 1, 128 + fw, fy - 9); fernCtx.stroke();
    }
    if (detailed) fernCtx.globalCompositeOperation = 'source-over';
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
            // Narrow the twist with the detailed fern's rachis. Keeping a
            // full vertical offset at its thin tip made a broad flat ribbon.
            var twist = bladeTwist * along * along * edge * (fern && detailed ? widthAlong / width : 1);
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
            if (detailed) {
              // Attach to the rendered rachis, including its straight segment
              // interpolation, so arching the pinnae cannot expose a gap.
              var stemAlong = t * bladeSegments, stemStep = Math.floor(stemAlong), stemMix = stemAlong - stemStep;
              var stemLower = (stripStart + stemStep * 2) * 3, stemUpper = stemLower + 6;
              xx = (positions[stemLower] + positions[stemLower + 3]) * 0.5 * (1 - stemMix) + (positions[stemUpper] + positions[stemUpper + 3]) * 0.5 * stemMix;
              yy = (positions[stemLower + 1] + positions[stemLower + 4]) * 0.5 * (1 - stemMix) + (positions[stemUpper + 1] + positions[stemUpper + 4]) * 0.5 * stemMix;
              zz = (positions[stemLower + 2] + positions[stemLower + 5]) * 0.5 * (1 - stemMix) + (positions[stemUpper + 2] + positions[stemUpper + 5]) * 0.5 * stemMix;
            }
            var fernColor = linear(0x6c8b4d).multiplyScalar(0.80 + t * 0.17 + hash(blade, pinna) * 0.04);
            [-1, 1].forEach(function (side) {
              var tipX = xx - s * length * side + c * length * 0.33, tipZ = zz + c * length * side + s * length * 0.33;
              var tipY = yy + length * (0.045 + hash(blade + side, pinna) * 0.1);
              var halfWidth = (0.021 + Math.sin(t * Math.PI) * 0.011) * (side > 0 ? 1 : 0.94);
              var leafletStart = positions.length / 3;
              if (detailed) {
                var arch = length * (0.065 + hash(blade + side * 17, pinna + 41) * 0.055);
                var droop = length * (0.10 + hash(blade + side, pinna + 73) * 0.025);
                for (var leafStation = 0; leafStation < 3; leafStation++) {
                  var leafAlong = leafStation / 2;
                  var leafX = xx + (tipX - xx) * leafAlong, leafZ = zz + (tipZ - zz) * leafAlong;
                  var leafY = yy + (tipY - yy - droop) * leafAlong + Math.sin(leafAlong * Math.PI) * arch;
                  for (var leafEdge = 0; leafEdge < 2; leafEdge++) {
                    var edgeSide = leafEdge ? 1 : -1, edgeTone = leafEdge ? 1.02 : 0.95;
                    positions.push(leafX + c * halfWidth * edgeSide, leafY + edgeSide * (0.006 - leafAlong * 0.002), leafZ + s * halfWidth * edgeSide);
                    colors.push(fernColor.r * edgeTone, fernColor.g * edgeTone, fernColor.b * edgeTone);
                    uvs.push(leafEdge, leafAlong);
                  }
                  if (leafStation < 2) {
                    var leafIndex = leafletStart + leafStation * 2;
                    indices.push(leafIndex, leafIndex + 2, leafIndex + 1, leafIndex + 1, leafIndex + 2, leafIndex + 3);
                  }
                }
              } else {
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
              }
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
      if (fern) applyLeafTransmission(mat);
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
        if (!fern && residentForagingLane(x,z)) size *= .025;
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
        // Preserve one placement-stream draw per texel. The larger mineral
        // field wraps smoothly; quiet pole rows avoid a pinched bright crown.
        var mineral = tileNoise(px, py, 0.032, 0) * 54 + tileNoise(px, py, 0.18, 0) * 33 + random() * 19;
        var poleFade = smooth(py / 8) * smooth((255 - py) / 8);
        mineral = 53 + (mineral - 53) * poleFade;
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
    // Sphere UVs duplicate the longitude seam and poles. Reconcile their
    // area-weighted normals without welding UVs or moving a sculpted vertex.
    var stoneNormals = stoneGeo.attributes.normal, stoneGroups = Object.create(null), stoneKeys = [];
    for (var stoneVertex = 0; stoneVertex < stonePos.count; stoneVertex++) {
      var stoneKey = Math.round(stonePos.getX(stoneVertex) * 1e6) + ',' + Math.round(stonePos.getY(stoneVertex) * 1e6) + ',' + Math.round(stonePos.getZ(stoneVertex) * 1e6);
      stoneKeys.push(stoneKey);
      if (!stoneGroups[stoneKey]) stoneGroups[stoneKey] = { vertices: [], x: 0, y: 0, z: 0 };
      stoneGroups[stoneKey].vertices.push(stoneVertex);
    }
    for (var stoneFace = 0; stoneFace < stoneGeo.index.count; stoneFace += 3) {
      var stoneA = stoneGeo.index.getX(stoneFace), stoneB = stoneGeo.index.getX(stoneFace + 1), stoneC = stoneGeo.index.getX(stoneFace + 2);
      var edgeAX = stonePos.getX(stoneB) - stonePos.getX(stoneA), edgeAY = stonePos.getY(stoneB) - stonePos.getY(stoneA), edgeAZ = stonePos.getZ(stoneB) - stonePos.getZ(stoneA);
      var edgeBX = stonePos.getX(stoneC) - stonePos.getX(stoneA), edgeBY = stonePos.getY(stoneC) - stonePos.getY(stoneA), edgeBZ = stonePos.getZ(stoneC) - stonePos.getZ(stoneA);
      var faceNX = edgeAY * edgeBZ - edgeAZ * edgeBY, faceNY = edgeAZ * edgeBX - edgeAX * edgeBZ, faceNZ = edgeAX * edgeBY - edgeAY * edgeBX;
      for (var faceCorner = 0; faceCorner < 3; faceCorner++) {
        var stoneGroup = stoneGroups[stoneKeys[stoneGeo.index.getX(stoneFace + faceCorner)]];
        if (stoneGroup.vertices.length < 2) continue;
        stoneGroup.x += faceNX; stoneGroup.y += faceNY; stoneGroup.z += faceNZ;
      }
    }
    Object.keys(stoneGroups).forEach(function (key) {
      var group = stoneGroups[key], magnitude = Math.hypot(group.x, group.y, group.z);
      if (group.vertices.length < 2 || magnitude < 1e-10) return;
      group.vertices.forEach(function (vertex) { stoneNormals.setXYZ(vertex, group.x / magnitude, group.y / magnitude, group.z / magnitude); });
    });
    var stoneMat = material({ color: linear(0x8b897c), map: stoneMap, bumpMap: stoneMap, bumpScale: 0.025, roughness: 0.99 });
    var stones = new THREE.InstancedMesh(stoneGeo, stoneMat, detailed ? 92 : 48);
    stones.name = 'weathered-clearing-stones';
    for (var rock = 0; rock < stones.count; rock++) {
      var ra = random() * Math.PI * 2, rr = 2.2 + Math.sqrt(random()) * 32;
      var rx = Math.cos(ra) * rr, rz = Math.sin(ra) * rr, scale = 0.12 + Math.pow(random(), 3) * 1.15;
      dummy.position.set(rx, groundHeight(rx, rz) + scale * 0.18, rz); dummy.rotation.set(random() * 0.3, random() * Math.PI * 2, random() * 0.25);
      dummy.scale.set(scale * (0.8 + random() * 0.7), scale * (0.42 + random() * 0.26), scale); dummy.updateMatrix(); stones.setMatrixAt(rock, dummy.matrix);
      if(scale>.24)walkObstacles.push({ax:rx,az:rz,bx:rx,bz:rz,radius:Math.max(dummy.scale.x,dummy.scale.z)*1.15});
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

    function livingGroundLeafMaps() {
      var size = detailed ? 256 : 128, pigmentCanvas = canvas(size), reliefCanvas = canvas(size);
      var pigmentContext = pigmentCanvas.getContext('2d'), reliefContext = reliefCanvas.getContext('2d');
      var pigment = pigmentContext.createImageData(size, size), relief = reliefContext.createImageData(size, size);
      // Veins fan from the midrib toward the tip. Their height is independent
      // of pigment, so a darker vein never becomes an engraved crease.
      for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) {
        var along = y / (size - 1), across = x / (size - 1) - .5;
        var envelope = Math.pow(Math.max(0, Math.sin(along * Math.PI)), .45);
        var center = Math.exp(-across * across * 5200) * envelope;
        var veinPhase = along * 8.2 - Math.abs(across) * 2.1 + across * .16;
        var veinDistance = Math.abs(veinPhase - Math.round(veinPhase));
        var veins = Math.exp(-veinDistance * veinDistance * 1150) * envelope * (1 - Math.abs(across) * .8);
        var grain = (hash(x + 733, y + 227) - .5) * 2;
        var mottling = noise(x * .045 + 18, y * .035 + 41) - .5;
        // Pale veins, soft mottling, a darker rim and a little tip yellowing;
        // a few hash-placed spots read as ordinary leaf wear up close.
        var spot = 0;
        for (var lesion = 0; lesion < 3; lesion++) {
          var spotDx = x / (size - 1) - (.3 + hash(lesion, 401) * .4), spotDy = along - (.25 + hash(lesion, 409) * .55);
          spot = Math.max(spot, 1 - smooth(Math.hypot(spotDx, spotDy) / (.025 + hash(lesion, 419) * .03)));
        }
        var tissue = 220 + mottling * 24 + grain * 2.5 - Math.pow(Math.abs(across) * 2, 3) * 22 - spot * 46;
        var veinColor = center * 24 + veins * 13, yellowing = Math.pow(along, 3) * 12, offset = (y * size + x) * 4;
        pigment.data[offset] = tissue + veinColor + yellowing + spot * 14;
        pigment.data[offset + 1] = tissue + veinColor * .8 + yellowing * .7;
        pigment.data[offset + 2] = tissue - 3 + veinColor * .35 - yellowing;
        pigment.data[offset + 3] = 255;
        var height = 118 + center * 68 + veins * 31 + grain * 1.4;
        relief.data[offset] = relief.data[offset + 1] = relief.data[offset + 2] = height;
        relief.data[offset + 3] = 255;
      }
      pigmentContext.putImageData(pigment, 0, 0); reliefContext.putImageData(relief, 0, 0);
      var colorMap = texture(pigmentCanvas), bumpMap = texture(reliefCanvas);
      bumpMap.encoding = THREE.LinearEncoding;
      return { color: colorMap, bump: bumpMap };
    }
    var livingLeafMaps = livingGroundLeafMaps();

    function smallLeafGeometry(herb) {
      var positions = [], uvs = [], indices = [], colors = [];
      function strip(points, texcoords) {
        var offset = positions.length / 3;
        points.forEach(function (point) { positions.push(point[0], point[1], point[2]); });
        texcoords.forEach(function (uv) { uvs.push(uv[0], uv[1]); });
        indices.push(offset, offset + 2, offset + 1, offset + 1, offset + 2, offset + 3);
      }
      if (herb) {
        // A lamina has a continuous, gently cupped surface rather than two
        // triangular panels meeting at a high fold. Single-point ends keep
        // the taper clean; all intermediate stations share their normals.
        var stations = detailed ? 12 : 8, columns = detailed ? 7 : 5;
        for (var blade = 0; blade < 5; blade++) {
          var angle = blade * 2.39996, ca = Math.cos(angle), sa = Math.sin(angle);
          var reach = 0.48 + hash(blade, 8) * 0.32, rise = 0.19 + hash(19, blade) * 0.23;
          var bladeStart = positions.length / 3, leafTone = .92 + hash(blade + 91, 333) * .12;
          for (var station = 0; station <= stations; station++) {
            var along = station / stations, arch = Math.sin(along * Math.PI);
            var width = Math.pow(arch, .88) * (.115 + hash(blade, 31) * .025) * (1 - along * .18);
            var radial = .045 + along * reach;
            var centerLateral = Math.sin(along * Math.PI + blade * .71) * arch * .022;
            var bladeY = .035 + rise * Math.sin(along * Math.PI * .98) + .012 * along;
            var crossCount = station === 0 || station === stations ? 1 : columns;
            for (var column = 0; column < crossCount; column++) {
              var across = crossCount === 1 ? 0 : column * 2 / (columns - 1) - 1;
              var edge = Math.abs(across), lateral = centerLateral + across * width;
              var cup = (1 - across * across) * arch * .013;
              var midrib = Math.exp(-across * across * 24) * arch * .003;
              var twist = across * Math.sin(along * Math.PI * 1.4 + blade * .7) * arch * .009;
              var margin = Math.pow(edge, 3) * Math.sin(along * Math.PI * 7 + blade * .8) * arch * .0025;
              positions.push(ca * radial - sa * lateral, bladeY + cup + midrib + twist + margin, sa * radial + ca * lateral);
              uvs.push((across + 1) * .5, along);
              var freshness = leafTone + .025 * arch - .020 * edge;
              colors.push(freshness * (.97 + hash(blade, 87) * .04), freshness, freshness * (.94 + hash(blade, 67) * .05));
            }
          }
          for (var baseColumn = 0; baseColumn < columns - 1; baseColumn++) {
            indices.push(bladeStart, bladeStart + baseColumn + 2, bladeStart + baseColumn + 1);
          }
          for (var row = 0; row < stations - 2; row++) {
            for (var surfaceColumn = 0; surfaceColumn < columns - 1; surfaceColumn++) {
              var leftIndex = bladeStart + 1 + row * columns + surfaceColumn;
              indices.push(leftIndex, leftIndex + 1, leftIndex + columns, leftIndex + 1, leftIndex + columns + 1, leftIndex + columns);
            }
          }
          var tip = positions.length / 3 - 1;
          for (var tipColumn = 0; tipColumn < columns - 1; tipColumn++) indices.push(tip - columns + tipColumn, tip - columns + tipColumn + 1, tip);
        }
      } else if (detailed) {
        // Dry blades curve between their raised veins. Shared stations give
        // continuous lighting; both curled margins return to a single tip
        // rather than leaving an upright split edge at the end of the leaf.
        positions.push(0, 0.012, -0.5); uvs.push(0.5, 0);
        for (var litterRow = 1; litterRow < 8; litterRow++) {
          var litterT = litterRow / 8, litterArch = Math.sin(litterT * Math.PI);
          var litterBreadth = Math.pow(litterArch, 0.72) * (0.26 + Math.sin(litterT * Math.PI * 6) * 0.025);
          var litterHeight = 0.012 + litterArch * 0.037 + Math.pow(litterT, 4) * 0.078;
          for (var litterSide = -1; litterSide <= 1; litterSide++) {
            var litterCurl = Math.abs(litterSide) * Math.sin(litterT * Math.PI * 1.7) * litterArch * 0.034 * (litterSide < 0 ? 0.75 : 1.25);
            positions.push(litterSide * litterBreadth, litterHeight + litterCurl, litterT - 0.5);
            uvs.push((litterSide + 1) * 0.5, litterT);
          }
        }
        var litterTip = positions.length / 3;
        positions.push(0, 0.090, 0.5); uvs.push(0.5, 1);
        indices.push(0, 1, 2, 0, 2, 3);
        for (var litterStrip = 0; litterStrip < 6; litterStrip++) {
          for (var litterHalf = 0; litterHalf < 2; litterHalf++) {
            var litterIndex = 1 + litterStrip * 3 + litterHalf;
            indices.push(litterIndex, litterIndex + 3, litterIndex + 1, litterIndex + 1, litterIndex + 3, litterIndex + 4);
          }
        }
        indices.push(litterTip - 3, litterTip, litterTip - 2, litterTip - 2, litterTip, litterTip - 1);
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
      if (herb) shape.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
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
      var mat = material({ color: linear(herb ? 0x627a43 : 0x887049), map: herb ? livingLeafMaps.color : detailMap,
        bumpMap: herb && detailed ? livingLeafMaps.bump : null, bumpScale: .00014,
        vertexColors: herb, side: THREE.DoubleSide, roughness: herb ? .89 : 1 });
      if (herb) { applyWind(mat, 'grass'); applyLeafTransmission(mat); }
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
        if (herb && residentForagingLane(x,z)) size *= .025;
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

    // A few leaves tumble down from the canopy on the shared clock: the vertex
    // shader places each one from its seed, so seeking replays the same fall
    // and no frame-time work is added. Omitted under reduced motion.
    if (!options.reducedMotion) {
      var fallCanvas = canvas(64), fallCtx = fallCanvas.getContext('2d');
      var fallFill = fallCtx.createLinearGradient(0, 0, 64, 64);
      fallFill.addColorStop(0, '#c98a3c'); fallFill.addColorStop(0.55, '#a8642c'); fallFill.addColorStop(1, '#7e4a22');
      fallCtx.fillStyle = fallFill; fallCtx.beginPath(); fallCtx.moveTo(32, 2);
      fallCtx.bezierCurveTo(56, 14, 58, 40, 32, 62); fallCtx.bezierCurveTo(6, 40, 8, 14, 32, 2); fallCtx.fill();
      fallCtx.strokeStyle = 'rgba(92,52,22,.75)'; fallCtx.lineWidth = 1.4;
      fallCtx.beginPath(); fallCtx.moveTo(32, 4); fallCtx.lineTo(32, 62); fallCtx.stroke();
      fallCtx.lineWidth = 0.8;
      for (var fallVein = 0; fallVein < 4; fallVein++) {
        var veinY = 16 + fallVein * 11;
        fallCtx.beginPath(); fallCtx.moveTo(32, veinY + 6); fallCtx.lineTo(18, veinY - 2); fallCtx.moveTo(32, veinY + 6); fallCtx.lineTo(46, veinY - 2); fallCtx.stroke();
      }
      var fallCount = detailed ? 16 : 7, fallGeo = geometry(new THREE.PlaneGeometry(0.075, 0.075));
      var fallSeeds = new Float32Array(fallCount);
      var fallMat = material({ map: texture(fallCanvas), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.92 });
      fallMat.onBeforeCompile = function (shader) {
        shader.uniforms.blFallClock = clock;
        shader.vertexShader = 'uniform float blFallClock;\nattribute float blFallSeed;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', [
          '#include <begin_vertex>',
          // One fall per ~11 s, staggered by seed; tumbling about two axes.
          'float blFall = fract(blFallClock / (9.0 + blFallSeed * 4.0) + blFallSeed * 7.31);',
          'float blSpin = blFall * (14.0 + blFallSeed * 9.0), blRock = sin(blFall * 23.0 + blFallSeed * 40.0) * 1.1;',
          'transformed.yz = mat2(cos(blSpin), sin(blSpin), -sin(blSpin), cos(blSpin)) * transformed.yz;',
          'transformed.xy = mat2(cos(blRock), sin(blRock), -sin(blRock), cos(blRock)) * transformed.xy;',
          'transformed *= smoothstep(0.0, 0.05, blFall) * (1.0 - smoothstep(0.9, 1.0, blFall));',
          'transformed += vec3(sin(blFall * 9.0 + blFallSeed * 21.0) * 0.45, (1.0 - blFall) * (3.6 + blFallSeed * 2.4) + 0.03, cos(blFall * 7.0 + blFallSeed * 13.0) * 0.35);'
        ].join('\n'));
      };
      fallMat.customProgramCacheKey = function () { return 'birdlab-falling-leaves-v1'; };
      var falling = new THREE.InstancedMesh(fallGeo, fallMat, fallCount);
      falling.name = 'falling-woodland-leaves';
      for (var fallIndex = 0; fallIndex < fallCount; fallIndex++) {
        var fallAngle = hash(fallIndex, 881) * Math.PI * 2, fallRange = 2.2 + hash(fallIndex + 5, 883) * 9;
        var fallX = Math.cos(fallAngle) * fallRange, fallZ = Math.sin(fallAngle) * fallRange;
        dummy.position.set(fallX, groundHeight(fallX, fallZ), fallZ); dummy.rotation.set(0, hash(fallIndex, 887) * Math.PI, 0); dummy.scale.set(1, 1, 1);
        dummy.updateMatrix(); falling.setMatrixAt(fallIndex, dummy.matrix); fallSeeds[fallIndex] = hash(fallIndex + 11, 889);
      }
      fallGeo.setAttribute('blFallSeed', new THREE.InstancedBufferAttribute(fallSeeds, 1));
      falling.instanceMatrix.needsUpdate = true; falling.frustumCulled = false; root.add(falling);
    }

    // Pollen and dust drift slowly through the clearing and glint as they
    // turn. Placed by the vertex shader from the shared clock; omitted under
    // reduced motion, like the falling leaves.
    if (!options.reducedMotion) {
      var moteCount = detailed ? 140 : 60, motePositions = new Float32Array(moteCount * 3), moteSeeds = new Float32Array(moteCount);
      for (var mote = 0; mote < moteCount; mote++) {
        var moteAngle = hash(mote, 911) * Math.PI * 2, moteRange = Math.sqrt(hash(mote + 3, 913)) * 7.5;
        var moteX = Math.cos(moteAngle) * moteRange, moteZ = Math.sin(moteAngle) * moteRange;
        motePositions[mote * 3] = moteX; motePositions[mote * 3 + 1] = groundHeight(moteX, moteZ) + .25 + hash(mote + 7, 917) * 2.6; motePositions[mote * 3 + 2] = moteZ;
        moteSeeds[mote] = hash(mote + 13, 919);
      }
      var moteGeo = geometry(new THREE.BufferGeometry());
      moteGeo.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
      moteGeo.setAttribute('blMoteSeed', new THREE.BufferAttribute(moteSeeds, 1));
      var moteMat = keep(new THREE.PointsMaterial({ color: 0xffe9b0, size: .03, sizeAttenuation: true, transparent: true, opacity: .8, depthWrite: false, blending: THREE.AdditiveBlending }));
      moteMat.onBeforeCompile = function (shader) {
        shader.uniforms.blMoteClock = clock;
        shader.vertexShader = 'uniform float blMoteClock;\nattribute float blMoteSeed;\nvarying float blMoteGlint;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', [
          '#include <begin_vertex>',
          'float blMoteT = blMoteClock + blMoteSeed * 97.;',
          'transformed += vec3(sin(blMoteT * .21 + blMoteSeed * 6.3) * .35 + breezeSway(blMoteT), sin(blMoteT * .13 + blMoteSeed * 11.) * .22, cos(blMoteT * .17 + blMoteSeed * 4.1) * .35);',
          'blMoteGlint = .4 + .6 * pow(max(0., sin(blMoteT * 1.7 + blMoteSeed * 30.)), 6.);'
        ].join('\n')).replace('void main() {', 'float breezeSway(float t) { return sin(t * .05) * .4; }\nvoid main() {');
        shader.fragmentShader = 'varying float blMoteGlint;\n' + shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.a *= blMoteGlint;');
      };
      moteMat.customProgramCacheKey = function () { return 'birdlab-clearing-motes-v1'; };
      var motes = new THREE.Points(moteGeo, moteMat);
      motes.name = 'drifting-clearing-motes'; motes.frustumCulled = false; root.add(motes);
    }

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
    function isBlocked(x,z,radius) {
      radius=Number.isFinite(radius)?Math.max(0,radius):.28;
      if(!Number.isFinite(x)||!Number.isFinite(z)||Math.hypot(x,z)+radius>18)return true;
      for(var i=0;i<walkObstacles.length;i++) {
        var obstacle=walkObstacles[i],dx=obstacle.bx-obstacle.ax,dz=obstacle.bz-obstacle.az;
        var u=Math.max(0,Math.min(1,((x-obstacle.ax)*dx+(z-obstacle.az)*dz)/Math.max(1e-10,dx*dx+dz*dz)));
        if(Math.hypot(x-obstacle.ax-u*dx,z-obstacle.az-u*dz)<obstacle.radius+radius)return true;
      }
      if(feederPost&&feederPost.on&&Math.hypot(x-feederPost.x,z-feederPost.z)<.05+radius)return true;
      return false;
    }

    // ── Feeding study (opt-in). Sites and props are built on first use, so the
    // default woodland keeps its exact scene. Foods sit clear of trunks, wood
    // and the perch snags; acorns lie under the nearest broadleaf tree.
    var food = null, feederPost = null;
    function foodSite(candidates, clearance) {
      for (var i = 0; i < candidates.length; i++) if (!isBlocked(candidates[i][0], candidates[i][1], clearance)) return candidates[i];
      return candidates[0];
    }
    function acornSite() {
      var best = null;
      treeLocations.forEach(function (tree) {
        var range = Math.hypot(tree.x, tree.z);
        if (tree.pine || range < 3.6 || range > 6.2) return;
        var x = tree.x * (1 - .95 / range), z = tree.z * (1 - .95 / range);
        if (isBlocked(x, z, .34) || (best && range >= best.range)) return;
        best = { x: x, z: z, range: range };
      });
      return best ? [best.x, best.z] : foodSite([[.6, -4.1], [-.8, 4], [4, .6]], .62);
    }
    function getFoodSources() {
      if (food) return food.sources;
      var seed = foodSite([[2.9, -1.9], [3.2, -1.1], [2.5, -2.7], [3.5, -.3]], .62);
      var berry = foodSite([[-3.2, -1.8], [-3.5, -.9], [-2.7, -2.6], [-3.7, .3]], .7);
      var litter = foodSite([[-2.6, 2.6], [-3, 1.7], [-1.9, 3.3]], .64);
      var lawn = foodSite([[2.4, 2.9], [3.1, 2], [1.5, 3.4]], .74);
      var acorn = acornSite();
      food = { props: null, guided: null, levels: {}, sources: [
        { id: 'feeder', kind: 'seed', label: 'Sunflower and millet seed', place: 'the feeder', eat: 'Eating seed spilled under the feeder', x: seed[0], z: seed[1], radius: .55, regrow: .03 },
        { id: 'winterberry', kind: 'berry', label: 'Winterberries', place: 'the winterberry shrub', eat: 'Eating winterberries', x: berry[0], z: berry[1], radius: .5, regrow: .012 },
        { id: 'leaf-litter', kind: 'insect', label: 'Insects in leaf litter', place: 'the leaf litter', eat: 'Scratching leaf litter for insects', x: litter[0], z: litter[1], radius: .6, regrow: .02 },
        { id: 'lawn', kind: 'worm', label: 'Earthworms', place: 'the lawn', eat: 'Pulling earthworms from the lawn', x: lawn[0], z: lawn[1], radius: .7, regrow: .015 },
        { id: 'oak', kind: 'acorn', label: 'Acorns', place: 'the oak', eat: 'Taking acorns under the oak', x: acorn[0], z: acorn[1], radius: .6, regrow: .008 }
      ] };
      return food.sources;
    }
    function foodParts() {
      if (food.parts) return food.parts;
      var seedGeo = geometry(new THREE.SphereGeometry(.0055, 6, 4)); seedGeo.scale(1.3, .62, .78);
      var berryGeo = geometry(new THREE.SphereGeometry(.0068, 8, 6));
      var nutGeo = geometry(new THREE.SphereGeometry(.0085, 9, 7)); nutGeo.scale(1, 1.35, 1);
      var capGeo = geometry(new THREE.SphereGeometry(.0092, 9, 4, 0, Math.PI * 2, 0, Math.PI * .5)); capGeo.translate(0, .0055, 0);
      var bugGeo = geometry(new THREE.SphereGeometry(.0045, 6, 4)); bugGeo.scale(.8, .55, 1.5);
      var worm = new THREE.CatmullRomCurve3([new THREE.Vector3(0, -.006, 0), new THREE.Vector3(.006, .007, .004), new THREE.Vector3(.018, .009, .01), new THREE.Vector3(.028, .002, .014)]);
      var wormGeo = geometry(new THREE.TubeGeometry(worm, 12, .0028, 6, false));
      // Reuse the woodland's own leaves and grass so the props match the floor.
      var herbGeo = geometry(smallLeafGeometry(true)); herbGeo.scale(.1, .1, .1);
      var leafGeo = geometry(smallLeafGeometry(false)); leafGeo.scale(.07, .07, .07);
      var grassGeo = geometry(grassGeometry(false)); grassGeo.scale(.08, .08, .08);
      function fadeCanvas(radial) {
        var c = canvas(64), g = c.getContext('2d'), grad = radial ? g.createRadialGradient(32, 32, 0, 32, 32, 32) : g.createLinearGradient(0, 0, 0, 64);
        grad.addColorStop(0, '#fff'); grad.addColorStop(radial ? .55 : .72, '#fff'); grad.addColorStop(1, '#000');
        g.fillStyle = grad; g.fillRect(0, 0, 64, 64); return texture(c);
      }
      var tinted = material({ color: 0xffffff, roughness: .82 });
      food.parts = { seedGeo: seedGeo, berryGeo: berryGeo, nutGeo: nutGeo, capGeo: capGeo, bugGeo: bugGeo, wormGeo: wormGeo, leafGeo: leafGeo, tinted: tinted,
        berryMat: material({ color: linear(0xc4202d), roughness: .35 }), nutMat: material({ color: linear(0x8a5a2b), roughness: .55 }),
        capMat: material({ color: linear(0x5b4a32), roughness: .95 }), bugMat: material({ color: linear(0x26201a), roughness: .4 }),
        wormMat: material({ color: linear(0xc08479), roughness: .5 }), leafMat: material({ color: 0xffffff, map: detailMap, roughness: 1, side: THREE.DoubleSide }),
        herbGeo: herbGeo, grassGeo: grassGeo, softDisc: fadeCanvas(true), softDome: fadeCanvas(false),
        shrubLeafMat: material({ color: linear(0x6f8f4e), map: livingLeafMaps.color, vertexColors: true, roughness: .85, side: THREE.DoubleSide }),
        grassMat: material({ color: linear(0x7f9a58), vertexColors: true, roughness: .95, side: THREE.DoubleSide }) };
      return food.parts;
    }
    // Deterministic placements, each on the rendered ground under its source.
    function foodScatter(group, name, geo, mat, count, cx, cz, spread, lift, colorOf, salt, place) {
      var mesh = new THREE.InstancedMesh(geo, mat, count), color = new THREE.Color();
      mesh.name = name; mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
      for (var i = 0; i < count; i++) {
        var a = hash(i, salt) * Math.PI * 2, r = Math.sqrt(hash(i + 3, salt + 7)) * spread;
        var x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
        dummy.position.set(x, groundSurfaceAt(x, z).height + lift, z);
        dummy.rotation.set((hash(i, salt + 11) - .5) * .5, hash(i, salt + 13) * Math.PI * 2, (hash(i, salt + 17) - .5) * .5);
        dummy.scale.setScalar(.82 + hash(i, salt + 19) * .4);
        if (place) place(i, dummy, r / Math.max(spread, 1e-6));
        dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
        if (colorOf) { color.copy(colorOf(i)); mesh.setColorAt(i, color); }
      }
      mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.userData.full = count; group.add(mesh); return mesh;
    }
    function buildFoodProps() {
      var parts = foodParts(), sources = food.sources, group = new THREE.Group();
      group.name = 'feeding-study-props'; group.visible = false; root.add(group);
      var levels = food.levels, sunflower = linear(0x2e2b28), millet = linear(0xd8cba6), striped = linear(0x6c665c);
      function solid(geo, mat, x, y, z, name) { var m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.name = name; m.castShadow = true; m.receiveShadow = true; group.add(m); return m; }
      // Seed feeder: pole, clear tube with seed inside, roof, tray and perch.
      var feeder = sources[0], fy = groundSurfaceAt(feeder.x, feeder.z).height;
      var metal = material({ color: linear(0x3e4f47), roughness: .42, metalness: .35 });
      solid(geometry(new THREE.CylinderGeometry(.018, .024, 1.48, 10)), metal, feeder.x, fy + .74, feeder.z, 'feeder-pole');
      solid(geometry(new THREE.CylinderGeometry(.05, .05, .3, 16)), material({ color: linear(0x6d6252), roughness: 1 }), feeder.x, fy + 1.27, feeder.z, 'feeder-seed-column');
      var tube = solid(geometry(new THREE.CylinderGeometry(.056, .056, .34, 18, 1, true)), material({ color: linear(0xd8e8e4), roughness: .12, transparent: true, opacity: .32, side: THREE.DoubleSide, depthWrite: false }), feeder.x, fy + 1.28, feeder.z, 'feeder-tube');
      tube.castShadow = false;
      solid(geometry(new THREE.ConeGeometry(.095, .07, 18)), metal, feeder.x, fy + 1.485, feeder.z, 'feeder-roof');
      solid(geometry(new THREE.CylinderGeometry(.12, .12, .012, 22)), metal, feeder.x, fy + 1.1, feeder.z, 'feeder-tray');
      var perch = solid(geometry(new THREE.CylinderGeometry(.0035, .0035, .26, 6)), metal, feeder.x, fy + 1.16, feeder.z, 'feeder-perch'); perch.rotation.z = Math.PI / 2;
      feederPost = { x: feeder.x, z: feeder.z, on: false };
      levels.feeder = [foodScatter(group, 'feeder-spilled-seed', parts.seedGeo, parts.tinted, 110, feeder.x, feeder.z, feeder.radius * .92, .002,
        function (i) { return i % 3 === 0 ? millet : i % 3 === 1 ? sunflower : striped; }, 601)];
      // Winterberry: veined leaves massed over a dark inner shrub, with fruit
      // held just outside the leaves and a few fallen berries below.
      var shrub = sources[1], sy = groundSurfaceAt(shrub.x, shrub.z).height, blobGeo = geometry(new THREE.IcosahedronGeometry(1, 2));
      var foliage = material({ color: linear(0x1d2c16), roughness: .95 }), blobs = [], dir = new THREE.Vector3(), leafTint = new THREE.Color();
      for (var b = 0; b < 6; b++) {
        var ba = b * 1.047 + .4, br = b ? .17 : 0, bs = .2 + hash(b, 641) * .09;
        var blob = solid(blobGeo, foliage, shrub.x + Math.cos(ba) * br, sy + .24 + (b ? hash(b, 643) * .14 : .2), shrub.z + Math.sin(ba) * br, 'winterberry-shrub');
        blob.scale.set(bs * 1.05, bs * .82, bs * 1.05); blobs.push(blob);
      }
      function onShrub(k, saltA, saltB, out) {
        var host = blobs[k % blobs.length], theta = hash(k, saltA) * Math.PI * 2, rise = Math.max(-.35, Math.min(1, -.3 + hash(k, saltB) * 1.3));
        dir.set(Math.cos(theta) * Math.sqrt(1 - rise * rise), rise, Math.sin(theta) * Math.sqrt(1 - rise * rise));
        dummy.position.set(host.position.x + dir.x * host.scale.x * out, host.position.y + dir.y * host.scale.y * out, host.position.z + dir.z * host.scale.z * out);
      }
      var shrubLeaves = new THREE.InstancedMesh(parts.herbGeo, parts.shrubLeafMat, 260);
      shrubLeaves.name = 'winterberry-leaves'; shrubLeaves.castShadow = true; shrubLeaves.receiveShadow = true;
      for (var leaf = 0; leaf < 260; leaf++) {
        onShrub(leaf, 733, 739, .9);
        dummy.quaternion.setFromUnitVectors(up, dir); dummy.rotateY(hash(leaf, 743) * Math.PI * 2);
        dummy.scale.setScalar(1 + hash(leaf, 751) * .5); dummy.updateMatrix(); shrubLeaves.setMatrixAt(leaf, dummy.matrix);
        shrubLeaves.setColorAt(leaf, leafTint.setRGB(1, 1, 1).multiplyScalar(.7 + hash(leaf, 757) * .45));
      }
      shrubLeaves.instanceMatrix.needsUpdate = true; shrubLeaves.instanceColor.needsUpdate = true; group.add(shrubLeaves);
      var berries = new THREE.InstancedMesh(parts.berryGeo, parts.berryMat, 96);
      berries.name = 'winterberry-fruit'; berries.castShadow = true;
      for (var k = 0; k < 96; k++) {
        onShrub(k, 647, 653, 1.12);
        dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(.85 + hash(k, 659) * .35); dummy.updateMatrix(); berries.setMatrixAt(k, dummy.matrix);
      }
      berries.instanceMatrix.needsUpdate = true; berries.userData.full = 96; group.add(berries);
      levels.winterberry = [berries, foodScatter(group, 'fallen-winterberries', parts.berryGeo, parts.berryMat, 18, shrub.x, shrub.z, shrub.radius, .005, null, 661)];
      // Leaf litter: a damp, raked mound of curled leaves whose edge fades into
      // the soil, with beetles and larvae among them.
      var litter = sources[2], ly = groundSurfaceAt(litter.x, litter.z).height;
      var mound = solid(geometry(new THREE.SphereGeometry(1, 24, 10, 0, Math.PI * 2, 0, Math.PI * .5)),
        material({ color: linear(0x2c2117), roughness: 1, alphaMap: parts.softDome, transparent: true, depthWrite: false }), litter.x, ly - .004, litter.z, 'leaf-litter-mound');
      mound.scale.set(litter.radius * 1.1, .05, litter.radius * .95); mound.castShadow = false;
      function onMound(i, item, r) { item.position.y += .05 * Math.sqrt(Math.max(0, 1 - r * r)); }
      foodScatter(group, 'leaf-litter-leaves', parts.leafGeo, parts.leafMat, 95, litter.x, litter.z, litter.radius, .002,
        function (i) { return linear([0x6b4a2e, 0x8a6236, 0x4e3a28, 0x977238, 0x5d4a33][i % 5]); }, 671, onMound);
      levels['leaf-litter'] = [foodScatter(group, 'leaf-litter-insects', parts.bugGeo, parts.bugMat, 22, litter.x, litter.z, litter.radius * .8, .006, null, 677, onMound)];
      // Lawn: short turf whose edge fades into the bare soil, grass tufts,
      // worm castings and emerging earthworms.
      var lawn = sources[3], wy = groundSurfaceAt(lawn.x, lawn.z).height;
      var turfGeo = geometry(new THREE.CircleGeometry(lawn.radius * 1.15, 48)), turfPos = turfGeo.attributes.position, turfColors = [], turfTint = new THREE.Color();
      for (var tv = 0; tv < turfPos.count; tv++) {
        var tx = turfPos.getX(tv), ty = turfPos.getY(tv), wobble = 1 + .14 * Math.sin(Math.atan2(ty, tx) * 5 + 1.3) + .07 * Math.sin(Math.atan2(ty, tx) * 11);
        turfPos.setXY(tv, tx * wobble, ty * wobble);
        turfTint.setRGB(1, 1, 1).multiplyScalar(.85 + hash(tv, 727) * .25); turfColors.push(turfTint.r, turfTint.g, turfTint.b);
      }
      turfGeo.setAttribute('color', new THREE.Float32BufferAttribute(turfColors, 3));
      var turf = solid(turfGeo, material({ color: linear(0x34492a), vertexColors: true, roughness: .97, alphaMap: parts.softDisc, transparent: true, depthWrite: false,
        polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), lawn.x, wy + .004, lawn.z, 'lawn-turf');
      turf.rotation.x = -Math.PI / 2; turf.castShadow = false;
      foodScatter(group, 'lawn-grass', parts.grassGeo, parts.grassMat, 80, lawn.x, lawn.z, lawn.radius * .85, -.002, null, 697);
      foodScatter(group, 'lawn-worm-castings', parts.seedGeo, parts.tinted, 40, lawn.x, lawn.z, lawn.radius * .85, .004, function () { return linear(0x4a3a28); }, 683,
        function (i, item) { item.scale.multiplyScalar(1.8); });
      levels.lawn = [foodScatter(group, 'lawn-earthworms', parts.wormGeo, parts.wormMat, 9, lawn.x, lawn.z, lawn.radius * .75, .004, null, 691)];
      // Acorns with their caps, under the oak.
      var oak = sources[4];
      levels.oak = [foodScatter(group, 'oak-acorns', parts.nutGeo, parts.nutMat, 54, oak.x, oak.z, oak.radius, .008, null, 701),
        foodScatter(group, 'oak-acorn-caps', parts.capGeo, parts.capMat, 54, oak.x, oak.z, oak.radius, .008, null, 701)];
      food.props = group;
    }
    function setFoodVisible(value) {
      getFoodSources();
      if (value && !food.props) buildFoodProps();
      if (food.props) food.props.visible = !!value;
      if (feederPost) feederPost.on = !!value;
    }
    // amount 0..1 per source: fewer seeds, fruit, insects or acorns remain.
    function setFoodLevels(levels) {
      if (!food || !food.props || !levels) return;
      levels.forEach(function (level) {
        (food.levels[level.id] || []).forEach(function (mesh) { mesh.count = Math.round(mesh.userData.full * Math.max(0, Math.min(1, level.amount))); });
      });
    }
    // Guided mode: a little of each bird's main food where it already feeds.
    function setGuidedFood(spots, visible) {
      if (!food) getFoodSources();
      if (spots && !food.guided) {
        var parts = foodParts(), group = new THREE.Group(); group.name = 'guided-food-props'; root.add(group);
        var looks = { seed: [parts.seedGeo, parts.tinted, 12, function (i) { return linear(i % 2 ? 0xd8cba6 : 0x2e2b28); }],
          berry: [parts.berryGeo, parts.berryMat, 6], acorn: [parts.nutGeo, parts.nutMat, 4], insect: [parts.bugGeo, parts.bugMat, 4], worm: [parts.wormGeo, parts.wormMat, 2] };
        spots.forEach(function (spot, index) {
          var look = looks[spot.kind]; if (!look) return;
          foodScatter(group, 'guided-' + spot.kind + '-' + spot.id, look[0], look[1], look[2], spot.x, spot.z, .07, look[0] === parts.nutGeo ? .008 : .004, look[3] || null, 811 + index * 17);
        });
        food.guided = group;
      }
      if (food.guided) food.guided.visible = !!visible;
    }
    // Dawn ground mist: soft sheets that hang low over the clearing, drift on
    // the shared clock and thin out near or below the camera. Built on first use;
    // still under reduced motion.
    var mist = null;
    function setMist(value) {
      if (value && !mist) {
        var sheet = canvas(128), g = sheet.getContext('2d');
        for (var puff = 0; puff < 20; puff++) {
          var px = 30 + hash(puff, 941) * 68, py = 72 + (hash(puff + 3, 943) - .5) * 22, pr = 14 + hash(puff + 5, 947) * 18;
          var grad = g.createRadialGradient(px, py, 0, px, py, pr);
          grad.addColorStop(0, 'rgba(255,255,255,.30)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
        }
        // An elliptical mask clears every edge, so no sheet shows a border
        // or a hard line where it meets sloping ground.
        g.globalCompositeOperation = 'destination-in'; g.save(); g.translate(64, 72); g.scale(1, .5);
        var edge = g.createRadialGradient(0, 0, 0, 0, 0, 64);
        edge.addColorStop(0, 'rgba(0,0,0,1)'); edge.addColorStop(.45, 'rgba(0,0,0,.85)'); edge.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = edge; g.fillRect(-64, -150, 128, 300); g.restore(); g.globalCompositeOperation = 'source-over';
        var map = texture(sheet), motion = { value: options.reducedMotion ? 0 : 1 };
        // r128 uploads neither viewMatrix nor cameraPosition for sprites, so
        // the drift is applied in each sheet's local space and the camera
        // height arrives through a per-draw uniform.
        var eye = { value: 0 }, setEye = function (renderer, scene, camera) { eye.value = camera.matrixWorld.elements[13]; };
        var head = 'uniform float blMistClock;\nuniform float blMistSeed;\nuniform float blMistMotion;\nuniform float blMistEye;\nvarying float blMistNear;\n';
        mist = new THREE.Group(); mist.name = 'dawn-ground-mist'; mist.userData.motion = motion; root.add(mist);
        for (var i = 0, count = detailed ? 16 : 9; i < count; i++) {
          var angle = hash(i, 931) * Math.PI * 2, range = 2.5 + hash(i + 7, 933) * 11, mx = Math.cos(angle) * range, mz = Math.sin(angle) * range;
          var mat = keep(new THREE.SpriteMaterial({ map: map, color: 0xf4e6e3, transparent: true, opacity: .5, depthWrite: false }));
          mat.onBeforeCompile = (function (seed) {
            return function (shader) {
              shader.uniforms.blMistClock = clock; shader.uniforms.blMistSeed = seed; shader.uniforms.blMistMotion = motion; shader.uniforms.blMistEye = eye;
              shader.vertexShader = head + shader.vertexShader.replace('vec4 mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );', [
                'vec3 blMistDrift = vec3(sin(blMistClock * .035 + blMistSeed * 6.3) * .9, 0., cos(blMistClock * .028 + blMistSeed * 4.1) * .7) * blMistMotion;',
                'vec4 mvPosition = modelViewMatrix * vec4(blMistDrift / vec3(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz), length(modelMatrix[2].xyz)), 1.0);',
                'blMistNear = smoothstep(2.5, 7., -mvPosition.z) * (1. - .9 * smoothstep(.8, 2.6, blMistEye - modelMatrix[3].y));'
              ].join('\n'));
              shader.fragmentShader = head + shader.fragmentShader.replace('#include <alphatest_fragment>',
                'diffuseColor.a *= blMistNear * (1. - .2 * blMistMotion * (.5 + .5 * sin(blMistClock * .11 + blMistSeed * 9.)));\n#include <alphatest_fragment>');
            };
          }({ value: hash(i + 11, 937) }));
          mat.customProgramCacheKey = function () { return 'birdlab-dawn-mist-v1'; };
          var sprite = new THREE.Sprite(mat); sprite.name = 'dawn-mist-sheet'; sprite.onBeforeRender = setEye;
          var tall = 1.6 + hash(i + 19, 953) * .7;
          sprite.scale.set(5 + hash(i + 17, 951) * 4, tall, 1);
          sprite.position.set(mx, groundHeight(mx, mz) + .31 * tall - .05 + hash(i + 13, 939) * .2, mz);
          mist.add(sprite);
        }
      }
      if (mist) mist.visible = !!value;
    }
    // Light rain: streaks falling through a box over the clearing on the
    // shared clock, and rings spreading where drops land. Built on first use;
    // under reduced motion the streaks hold still and the rings stay hidden.
    var rain = null;
    function setRain(value) {
      if (value && !rain) {
        var count = detailed ? 2400 : 1000, streaks = new Float32Array(count * 6), info = new Float32Array(count * 4);
        for (var i = 0; i < count; i++) {
          var rx = (hash(i, 961) - .5) * 36, rz = (hash(i + 3, 963) - .5) * 36, ry = hash(i + 5, 967) * 14, seed = hash(i + 7, 971);
          streaks.set([rx, ry, rz, rx, ry, rz], i * 6); info.set([seed, 0, seed, 1], i * 4);
        }
        var motion = { value: options.reducedMotion ? 0 : 1 };
        var streakGeo = geometry(new THREE.BufferGeometry());
        streakGeo.setAttribute('position', new THREE.BufferAttribute(streaks, 3));
        streakGeo.setAttribute('blRain', new THREE.BufferAttribute(info, 2));
        var streakMat = keep(new THREE.LineBasicMaterial({ color: 0xc4d0d8, transparent: true, opacity: .42, depthWrite: false }));
        streakMat.onBeforeCompile = function (shader) {
          shader.uniforms.blRainClock = clock; shader.uniforms.blRainMotion = motion;
          shader.vertexShader = 'uniform float blRainClock;\nuniform float blRainMotion;\nattribute vec2 blRain;\n' + shader.vertexShader.replace('#include <begin_vertex>', [
            '#include <begin_vertex>',
            'float blFall = blRainMotion * blRainClock * (7.0 + blRain.x * 2.0);',
            'transformed.y = mod(position.y - blFall, 14.0) - 1.5 + blRain.y * (.28 + blRain.x * .12);',
            'transformed.x += blRain.y * .05;'
          ].join('\n'));
        };
        streakMat.customProgramCacheKey = function () { return 'birdlab-rain-streaks-v1'; };
        var lines = new THREE.LineSegments(streakGeo, streakMat); lines.name = 'rain-streaks'; lines.frustumCulled = false;
        var ringCount = detailed ? 70 : 35, ringGeo = geometry(new THREE.RingGeometry(.84, 1, 28)), ringSeeds = new Float32Array(ringCount);
        ringGeo.rotateX(-Math.PI / 2);
        var ringMat = keep(new THREE.MeshBasicMaterial({ color: 0xe6edf0, transparent: true, opacity: .32, depthWrite: false }));
        ringMat.onBeforeCompile = function (shader) {
          shader.uniforms.blRainClock = clock;
          shader.vertexShader = 'uniform float blRainClock;\nattribute float blRipple;\nvarying float blRipplePhase;\n' + shader.vertexShader.replace('#include <begin_vertex>',
            '#include <begin_vertex>\nblRipplePhase = fract(blRainClock * .9 + blRipple);\ntransformed.xz *= .25 + blRipplePhase;');
          shader.fragmentShader = 'varying float blRipplePhase;\n' + shader.fragmentShader.replace('#include <alphatest_fragment>', 'diffuseColor.a *= 1. - blRipplePhase;\n#include <alphatest_fragment>');
        };
        ringMat.customProgramCacheKey = function () { return 'birdlab-rain-ripples-v1'; };
        var rings = new THREE.InstancedMesh(ringGeo, ringMat, ringCount); rings.name = 'rain-ripples'; rings.frustumCulled = false;
        for (var r = 0; r < ringCount; r++) {
          var angle = hash(r, 973) * Math.PI * 2, range = Math.sqrt(hash(r + 3, 977)) * 9, px = Math.cos(angle) * range, pz = Math.sin(angle) * range;
          dummy.position.set(px, groundHeight(px, pz) + .015, pz); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(.1 + hash(r + 5, 979) * .06);
          dummy.updateMatrix(); rings.setMatrixAt(r, dummy.matrix); ringSeeds[r] = hash(r + 9, 983);
        }
        ringGeo.setAttribute('blRipple', new THREE.InstancedBufferAttribute(ringSeeds, 1));
        rings.instanceMatrix.needsUpdate = true; rings.visible = !options.reducedMotion;
        rain = new THREE.Group(); rain.name = 'rain-shower'; rain.userData.motion = motion; rain.add(lines, rings); root.add(rain);
      }
      if (rain) rain.visible = !!value;
    }
    return { root: root, perch: new THREE.Vector3(0, 3.2, 0), perches:observationPerches, isBlocked:isBlocked, groundHeight: groundHeight,
      groundSurfaceHeight: function(x,z) { return groundSurfaceAt(x,z).height; }, update: update, dispose: dispose,
      getFoodSources: getFoodSources, setFoodVisible: setFoodVisible, setFoodLevels: setFoodLevels, setGuidedFood: setGuidedFood, setMist: setMist, setRain: setRain };
  }
  global.BirdLab3DHabitat = { create: create };
})(typeof window !== 'undefined' ? window : globalThis);
