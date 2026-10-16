// Frozen pre-refinement helpers, extracted from the pinned baseline, not from the candidate.
// Baseline SHA-256: a052f2760de639c5d7e51d2359eaa9ddfad9f36a96512e65abd8284c0291b1bf
  function dinoLoftRadius(radii, station, axis) {
    function value(i) { var r = radii[Math.max(0, Math.min(radii.length - 1, i))]; return Array.isArray(r) ? r[axis] : r; }
    var i = Math.min(radii.length - 2, Math.floor(station)), t = station - i;
    var a = value(i), b = value(i + 1), delta = b - a;
    function slope(left, right) { return left * right > 0 ? 2 * left * right / (left + right) : 0; }
    var m0 = i === 0 ? delta : slope(a - value(i - 1), delta);
    var m1 = i === radii.length - 2 ? delta : slope(delta, value(i + 2) - b);
    var t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * a + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * b + (t3 - t2) * m1;
  }

  function dinoSurfaceGeometry(THREE, points, radii, options) {
    var curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
    options = options || {};
    var rings = options.rings || 48, sides = options.sides || 24, vertices = [], uv = [], indices = [];
    var previousTangent = null, previousNormal = null;
    var chestEnd = options.compactChest === true && points.length === 7 ? 1 / 6 : 0;
    var chestSpan = chestEnd ? points[1].x - points[0].x : 0;
    var dorsalWaist = options.dorsalWaist === true && options.smoothProfile === true && points.length === 7 && radii.length === 7;
    function surfaceCenter(t) {
      var center = curve.getPoint(t);
      // Shorten the anterior closure without changing the shoulder or the rest of the trunk.
      // The monotonic mapping retains the original tangent at the shoulder.
      if (chestEnd && chestSpan > 0 && t < chestEnd) {
        var distance = points[1].x - center.x;
        if (distance > 0) center.x = points[1].x - distance / (1 + 1.5 * distance / chestSpan);
      }
      return center;
    }
    for (var i = 0; i <= rings; i++) {
      var t = i / rings, center = surfaceCenter(t), tangent = curve.getTangent(t).normalize();
      var normal;
      if (previousNormal) {
        // Carry the section through bends without switching reference axes.
        normal = previousNormal.clone().applyQuaternion(new THREE.Quaternion().setFromUnitVectors(previousTangent, tangent));
        normal.addScaledVector(tangent, -normal.dot(tangent)).normalize();
      } else {
        normal = new THREE.Vector3().crossVectors(Math.abs(tangent.z) < 0.9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0), tangent).normalize();
      }
      var binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();
      previousTangent = tangent.clone(); previousNormal = normal.clone();
      var rt = t * (radii.length - 1), ri = Math.min(radii.length - 2, Math.floor(rt)), mix = rt - ri;
      mix = mix * mix * (3 - 2 * mix);
      var a = Array.isArray(radii[ri]) ? radii[ri] : [radii[ri], radii[ri]];
      var b = Array.isArray(radii[ri + 1]) ? radii[ri + 1] : [radii[ri + 1], radii[ri + 1]];
      var ry = Math.max(0.001, options.smoothProfile ? dinoLoftRadius(radii, rt, 0) : a[0] + (b[0] - a[0]) * mix);
      var rz = Math.max(0.001, options.smoothProfile ? dinoLoftRadius(radii, rt, 1) : a[1] + (b[1] - a[1]) * mix);
      // Contract only the proximal collar; keep its path, tip and distal profile exact.
      // This seats the sauropod neck closure within the chest without adding a new loft station.
      if (options.taperRoot === true && t < 0.10) {
        var rootT = t / 0.10;
        var rootScale = 0.75 + 0.25 * rootT * rootT * (3 - 2 * rootT);
        ry *= rootScale; rz *= rootScale;
      }
      // A ventral waist need not make an equal saddle in the upper skin contour.
      // Bridge the existing thorax/pelvis heights with matching flat radius slopes;
      // native torso stations run forward along +X, with normal.y pointing upward.
      // This contour is interpretive; the belly, breadth, and centerline stay fixed.
      var dorsalLift = 0;
      if (dorsalWaist && t > 2 / 6 && t < 4 / 6) {
        var bridgeT = (t - 2 / 6) * 3;
        bridgeT = bridgeT * bridgeT * (3 - 2 * bridgeT);
        var chestHeight = Array.isArray(radii[2]) ? radii[2][0] : radii[2];
        var pelvisHeight = Array.isArray(radii[4]) ? radii[4][0] : radii[4];
        dorsalLift = Math.max(0, chestHeight + (pelvisHeight - chestHeight) * bridgeT - ry);
      }
      for (var j = 0; j <= sides; j++) {
        var angle = j / sides * Math.PI * 2;
        var vertex = center.clone().addScaledVector(normal, Math.cos(angle) * ry).addScaledVector(binormal, Math.sin(angle) * rz);
        if (dorsalLift > 0) {
          var dorsalWeight = Math.max(0, Math.cos(angle));
          vertex.y += normal.y * dorsalLift * dorsalWeight * dorsalWeight;
        }
        if (options.sculpt) options.sculpt(vertex);
        vertices.push(vertex.x, vertex.y, vertex.z); uv.push(t, j / sides);
        if (i < rings && j < sides) {
          var n = i * (sides + 1) + j;
          indices.push(n, n + 1, n + sides + 1, n + 1, n + sides + 2, n + sides + 1);
        }
      }
    }
    [0, rings].forEach(function (ring) {
      var center = surfaceCenter(ring / rings), ci = vertices.length / 3;
      vertices.push(center.x, center.y, center.z); uv.push(ring / rings, 0.5);
      for (var side = 0; side < sides; side++) {
        var start = ring * (sides + 1) + side;
        if (ring === 0) indices.push(ci, start + 1, start); else indices.push(ci, start, start + 1);
      }
    });
    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    // Match normals at the UV seam, so light does not reveal a longitudinal join.
    var normals = geometry.attributes.normal;
    for (var ring = 0; ring <= rings; ring++) {
      var first = ring * (sides + 1), last = first + sides;
      var blend = new THREE.Vector3(normals.getX(first) + normals.getX(last), normals.getY(first) + normals.getY(last), normals.getZ(first) + normals.getZ(last)).normalize();
      normals.setXYZ(first, blend.x, blend.y, blend.z); normals.setXYZ(last, blend.x, blend.y, blend.z);
    }
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    geometry.userData.dinoSmoothProfile = !!options.smoothProfile;
    geometry.userData.dinoTransportedFrame = true;
    if (dorsalWaist) geometry.userData.dinoDorsalWaist = { start: 2 / 6, end: 4 / 6, inferred: true };
    return geometry;
  }

  function dinoCranialGeometry(THREE, points, radii, shape) {
    var geometry = dinoSurfaceGeometry(THREE, points, radii, {
      rings: 72, sides: 40, smoothProfile: true,
      sculpt: function (vertex) {
        var x = (vertex.x - shape.center.x) / (shape.length * 0.85);
        var y = (vertex.y - shape.center.y) / (shape.height * 0.62);
        var falloff = Math.max(0, 1 - x * x - y * y);
        var z = vertex.z - shape.center.z;
        var sideWeight = Math.min(1, Math.abs(z) / (shape.depth * 0.6));
        sideWeight = sideWeight * sideWeight * (3 - 2 * sideWeight);
        vertex.z += Math.sign(z) * shape.depth * 0.15 * shape.cheek * falloff * falloff * falloff * sideWeight;
      }
    });
    geometry.userData.dinoCranialSurface = { rings: 72, sides: 40, cheekRelief: shape.cheek };
    return geometry;
  }

  function cranialSurfaceProfileFor(dn) {
    var clade = String((dn && dn.clade) || '');
    var group = String((dn && dn.group) || '');
    var speciesId = String((dn && dn.id) || '');
    var descriptor = [dn && dn.name, dn && dn.common, dn && dn.blurb, ((dn && dn.traits) || []).join(' ')].join(' ');
    var keys = 'headLengthScale headHeightScale headDepthScale muzzleLengthScale muzzleBaseScale muzzleTipScale muzzleHeightScale muzzleDepthScale jawHeightScale jawDepthScale cheekScale browScale eyeScale eyeForwardScale eyeHeightScale nostrilPosition nostrilHeightScale nostrilScale'.split(' ');
    var profile = {
      id: 'generalized', shortLabel: 'Balanced head', label: 'Balanced clade-level cranial silhouette',
      frillScale: 0, browHornScale: 0, noseHornScale: 0, domeScale: 0, crestMode: 'none',
      note: 'This visible head envelope follows clade-level skull proportions; lips, cheeks, brow thickness, beak margins, and external nostril shape remain inferred.'
    };
    keys.forEach(function (key) { profile[key] = 1; });
    profile.nostrilPosition = 0.88;
    var profiles = [
      [/Pterosaur/i, 'pterosaur-rostrum', 'Long tapered beak', 'Long, narrow pterosaur rostrum', [0.88,0.84,0.72,1.58,0.66,0.44,0.74,0.68,0.70,0.68,0.62,0.70,1.28,0.90,1.05,0.74,1,0.76]],
      [/Mosasaur/i, 'marine-reptile', 'Long marine jaw', 'Long, low marine-reptile skull', [1.08,0.94,1.02,1.28,0.94,0.84,0.86,0.96,1.10,1.02,0.92,0.86,0.94,1.02,0.96,0.76,1,1]],
      [/Spinosaur/i, 'spinosaur-rostrum', 'Long narrow snout', 'Long, low spinosaurid rostrum', [1.02,0.92,0.84,1.42,0.80,0.68,0.82,0.82,0.88,0.84,0.74,0.72,0.92,1.16,1,0.64,1.12,0.84]],
      [/Tyrannosaur/i, 'tyrannosaur-deep', 'Deep power skull', 'Deep, broad tyrannosaur cranial silhouette', [1.04,1.16,1.14,1.08,1.12,1.02,1.06,1.08,1.22,1.14,1.18,1.28,0.88,0.92,1.04,0.82,1,1.08]],
      [/Abelisaur/i, 'abelisaur-short-deep', 'Short deep skull', 'Short, deep abelisaurid cranial silhouette', [0.94,1.18,1.12,0.90,1.05,0.94,1.04,1.04,1.15,1.10,1.08,1.36,0.90,0.92,1.02,0.82,1,1]],
      [/Allosaur|Carcharodont|Megalosaur|Metriacanthosaur|Ceratosaur|Megaraptor/i, 'blade-jawed-theropod', 'Tapered predator skull', 'Tapered, moderately deep theropod skull', [1.04,1.05,1,1.08,0.96,0.84,0.92,0.90,1.04,0.98,1,1.12,0.96,1.02,1.02,0.82,1,1]],
      [/Coelophy|Compsognath|early Theropod/i, 'slender-theropod', 'Slender skull', 'Slender early-theropod cranial silhouette', [0.92,0.82,0.78,1.18,0.72,0.60,0.72,0.72,0.76,0.74,0.70,0.72,1.12,1.08,1.04,0.80,1,0.82]],
      [/Oviraptor|Caenagnath/i, 'oviraptor-beak', 'Deep beaked head', 'Short, deep oviraptorosaur beaked head', [0.84,1.16,1,0.82,1.08,0.92,1.08,1,1.08,1.04,1.06,1.10,1.05,1,1.04,0.76,1,1]],
      [/Ornithomim/i, 'ornithomimid-beak', 'Slender beaked head', 'Slender ornithomimid beaked head', [0.88,0.88,0.80,1.32,0.70,0.56,0.68,0.70,0.72,0.74,0.68,0.70,1.18,1.10,1.04,0.78,1,0.78]],
      [/Dromaeosaur|Troodont|Avialae|Paraves|Scansoriopteryg/i, 'paravian-light', 'Large-orbit head', 'Light paravian skull with a large orbit', [0.86,0.92,0.82,1.05,0.72,0.58,0.72,0.74,0.74,0.76,0.74,0.76,1.22,1.08,1.04,0.80,1,0.82]],
      [/Therizinosaur/i, 'therizinosaur-small', 'Small light head', 'Small, lightly built therizinosaur head', [0.75,0.80,0.74,1.10,0.64,0.54,0.68,0.68,0.70,0.72,0.68,0.70,1.12,1.06,1.02,0.78,1,1]],
      [/Diplodoc|Dicraeosaur|Rebbachisaur/i, 'diplodocoid-low', 'Low narrow head', 'Low, narrow diplodocoid head', [0.82,0.74,0.74,1.28,0.62,0.54,0.62,0.68,0.64,0.68,0.66,0.65,1.08,1.04,1.02,0.74,1,0.78]],
      [/Brachiosaur|Camarasaur|Titanosauriform/i, 'macronarian-deep', 'Short deep head', 'Shorter, deeper macronarian head', [0.90,1.10,1,0.94,0.90,0.78,0.92,0.88,0.82,0.86,0.86,0.84,1.02,0.96,1.04,0.72,1.16,1]],
      [/Ceratops/i, 'ceratopsian-beak', 'Deep beaked face', 'Deep, broad ceratopsian beaked head', [0.90,1.12,1.24,0.86,1.04,0.84,0.90,1.12,1.26,1.22,1.34,1.18,0.88,1,1,0.78,1,1.04]],
      [/Hadrosaur|Lambeosaur/i, 'hadrosaur-bill', 'Broad duck-bill', 'Broad, low hadrosaurid duck-bill', [1,1.02,1.14,1.20,0.92,1.18,0.72,1.24,1.12,1.18,1.28,0.92,0.95,0.96,1.02,0.76,1,1.08]],
      [/Iguanodont|Rhabdodont|Ornithopod|Dryosaur|Thescelosaur/i, 'ornithopod-cheek', 'Broad-cheeked head', 'Broad-cheeked ornithopod head', [0.94,0.94,1.08,1.10,0.86,0.92,0.78,1.04,1.04,1.10,1.24,0.90,1,1,1.02,0.78,1,1]],
      [/Pachycephalosaur/i, 'pachycephalosaur-dome', 'Domed skull roof', 'Domed pachycephalosaur cranial silhouette', [0.84,1.06,0.98,0.88,0.84,0.72,0.82,0.88,0.90,0.92,0.90,1.06,0.92,1.06,0.92,0.80,1,1]],
      [/Ankylosaur|Nodosaur/i, 'armored-low-broad', 'Low broad skull', 'Low, broad armored-dinosaur skull', [0.90,0.78,1.28,0.92,0.90,0.72,0.72,1.20,0.94,1.16,1.24,1.14,0.82,0.96,0.98,0.76,1,0.92]],
      [/Stegosaur/i, 'stegosaur-small', 'Very small head', 'Very small, narrow stegosaur head', [0.68,0.68,0.70,1.02,0.62,0.55,0.65,0.70,0.70,0.72,0.72,0.68,1.05,1.04,1.02,0.78,1,0.78]]
    ];
    if (group === 'sauropod' && !profiles.some(function (entry) { return entry[0].test(clade); })) profiles.push([/.*/, 'sauropod-light', 'Small cropping head', 'Small, lightly built sauropod head', [0.86,0.88,0.84,1.10,0.74,0.64,0.74,0.76,0.72,0.76,0.74,0.72,1.06,1,1.02,0.74,1,1]]);
    for (var profileIndex = 0; profileIndex < profiles.length; profileIndex++) {
      var entry = profiles[profileIndex];
      if (!entry[0].test(clade)) continue;
      profile.id = entry[1]; profile.shortLabel = entry[2]; profile.label = entry[3];
      keys.forEach(function (key, index) { profile[key] = entry[4][index]; });
      break;
    }
    if (/Ceratops/i.test(clade)) {
      var hornless = /hornless|no (?:big )?horns/i.test(descriptor);
      var noFrill = /^aquilops$/i.test(speciesId) || /no horns or frill/i.test(descriptor);
      profile.frillScale = noFrill ? 0.05 : (/^Ceratopsidae$/i.test(clade) ? 1 : (/Protoceratops/i.test(clade) ? 0.62 : 0.36));
      profile.browHornScale = hornless ? 0 : (/brow horn|two long|eye horn/i.test(descriptor) ? 1 : (/Ceratopsidae/i.test(clade) && /horn/i.test(descriptor) ? 0.52 : 0));
      profile.noseHornScale = hornless ? 0 : (/nose horn|nasal horn/i.test(descriptor) ? 0.68 : 0);
    }
    if (speciesId === 'protoceratops') {
      // Skull form varies between specimens; these proportions are interpretive.
      // https://www.amnh.org/explore/ology/paleontology/face-to-fossil2/do-you-have-any-secrets-to-share
      profile.shortLabel = 'Compact frilled head';
      profile.label = 'Protoceratops beaked head with a compact, gently undulating frill';
      profile.note = 'Protoceratops lacked large facial horns. Its skull proportions and frill inclination vary between specimens; this compact frill is one representative reconstruction. Exact size, marginal contour, thickness, skin, and colors remain inferred.';
    }
    if (speciesId === 'styracosaurus') {
      // Species-level ornaments follow NHM; geometry remains an interpretive reconstruction.
      // https://www.nhm.ac.uk/discover/dino-directory/styracosaurus.html
      profile.browHornScale = 0; profile.noseHornScale = 1; profile.frillSpikes = 6;
      profile.shortLabel = 'Nasal horn and spiked frill';
      profile.label = 'Styracosaurus nasal horn with six representative frill spikes';
      profile.note = 'A long nasal horn and six representative frill spikes distinguish this Styracosaurus reconstruction; individual spike count and shape vary. Ornament lengths, angles, coverings, and colors remain inferred.';
    }
    if (/Hadrosaur|Lambeosaur/i.test(clade)) {
      var crestless = /crestless|no (?:hollow |head )?crest|without (?:a )?crest/i.test(descriptor);
      if (!crestless && /parasaurolophus|long (?:curved |tubular |hollow )?crest|trumpet|tubular crest/i.test(descriptor)) profile.crestMode = 'tube';
      else if (!crestless && /hollow (?:head )?crest|rounded (?:hollow )?crest|helmet|sail-like crest/i.test(descriptor)) profile.crestMode = 'helmet';
      else if (!crestless && /crest|nasal bump|bump-nosed/i.test(descriptor)) profile.crestMode = 'solid';
    }
    if (/Pachycephalosaur/i.test(clade)) {
      var flatSkull = /flat.*(?:head|skull)/i.test(descriptor);
      profile.domeScale = flatSkull ? 0.14 : 1;
      if (flatSkull) { profile.shortLabel = 'Low skull roof'; profile.label = 'Low pachycephalosaur skull roof'; }
    }
    return profile;
  }

  function dinoTheropodCranialRadii(height, depth, junctionRadius, profile) {
    profile = profile || {};
    function factor(key) { var value = Number(profile[key]); return isFinite(value) && value > 0 ? value : 1; }
    return [
      [junctionRadius, junctionRadius], [height * 0.40, depth * 0.40], [height * 0.86, depth],
      [height * 0.70 * factor('muzzleHeightScale'), depth * 0.72 * factor('muzzleDepthScale') * factor('muzzleBaseScale')],
      [height * 0.48 * factor('muzzleHeightScale') * factor('muzzleTipScale'), depth * 0.60 * factor('muzzleDepthScale') * factor('muzzleTipScale')],
      [height * 0.025, depth * 0.04]
    ];
  }
export { dinoSurfaceGeometry as baselineSurfaceGeometry, dinoCranialGeometry as baselineCranialGeometry, cranialSurfaceProfileFor as baselineCranialProfile, dinoTheropodCranialRadii as baselineCranialRadii };
