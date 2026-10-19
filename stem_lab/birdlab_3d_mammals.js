/* Ground-dwelling woodland mammals for the local Three.js r128 birding walk.
 * Eastern gray squirrel fieldmarks and behavior: National Park Service,
 * nps.gov/bith/learn/nature/eastern-gray-squirrel.htm.
 * This is an illustrative animal controller, not a population ecology model.
 */
(function (global) {
  'use strict';
  var TAU = Math.PI * 2, TICK = 1 / 120;
  function clamp(value, lo, hi) { return Math.max(lo, Math.min(hi, value)); }
  function smooth(value) { value = clamp(value, 0, 1); return value * value * value * (10 + value * (-15 + 6 * value)); }
  function angle(value) { return Math.atan2(Math.sin(value), Math.cos(value)); }

  function create(THREE, scene, options) {
    options = options || {};
    var high = options.quality !== 'low', resources = [], disposed = false, mode = 'guided';
    var height = typeof options.groundHeight === 'function' ? options.groundHeight : function () { return 0; };
    var blocked = typeof options.isBlocked === 'function' ? options.isBlocked : function () { return false; };
    var root = new THREE.Group(); root.name = 'birdlab-woodland-mammals'; root.visible = false; scene.add(root);
    var animal = new THREE.Group(); animal.name = 'woodland-gray-squirrel'; root.add(animal);
    function keep(value) { resources.push(value); return value; }
    function color(value) { return new THREE.Color(value).convertSRGBToLinear(); }
    // Mid-gray with a brownish wash; the scene's filmic lighting lifted the
    // lighter original palette to near white.
    var gray = color('#66655d'), warmGray = color('#7a6550'), pale = color('#c8c5b4'), dark = color('#3b3b35');
    var fur = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .96, side: THREE.DoubleSide }));
    fur.extensions = { derivatives: true };
    fur.onBeforeCompile = function (shader) {
      shader.vertexShader = 'varying vec2 blSquirrelUV;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nblSquirrelUV = uv;');
      shader.fragmentShader = 'varying vec2 blSquirrelUV;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', [
        '#include <color_fragment>',
        // Derivative filtering prevents guard hairs from sparkling at walking distance.
        'float blFurPhase = blSquirrelUV.x * 314.1593 + sin(blSquirrelUV.y * 63.0) * .32;',
        'float blFurDetail = 1.0 - smoothstep(.55, 2.8, fwidth(blFurPhase));',
        'float blFurHair = sin(blFurPhase) * blFurDetail;',
        'float blFurGrizzle = sin(blSquirrelUV.y * 181.0 + sin(blSquirrelUV.x * 96.0) * 5.0);',
        'float blGrizzleDetail = 1.0 - smoothstep(.6, 3.0, fwidth(blSquirrelUV.y * 181.0));',
        'vec2 blFurGrid = vec2(blSquirrelUV.x * 72.0 + sin(blSquirrelUV.y * 67.0) * .06, blSquirrelUV.y * 58.0);',
        'vec2 blFurCell = floor(blFurGrid);',
        'float blFurHash = fract(sin(dot(blFurCell, vec2(127.1, 311.7))) * 43758.5453);',
        'float blFurStroke = (1.0 - smoothstep(.08, .30, abs(fract(blFurGrid.x) - .5))) * sin(fract(blFurGrid.y) * 3.141593);',
        'float blStrokeDetail = 1.0 - smoothstep(.35, 1.3, max(fwidth(blFurGrid.x), fwidth(blFurGrid.y)));',
        'diffuseColor.rgb *= .94 + blFurHair * .055 + blFurGrizzle * blGrizzleDetail * .055 + (blFurHash - .52) * blFurStroke * blStrokeDetail * .36;',
        'float blFurRelief = blFurHair * .000020 + blFurStroke * blStrokeDetail * .000016;'
      ].join('\n'));
      shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', [
        '#include <normal_fragment_maps>',
        'vec3 blFurX = dFdx(-vViewPosition), blFurY = dFdy(-vViewPosition);',
        'vec3 blFurR1 = cross(blFurY, normal), blFurR2 = cross(normal, blFurX);',
        'float blFurDet = dot(blFurX, blFurR1);',
        'if (abs(blFurDet) > 1e-12) normal = normalize(abs(blFurDet) * normal - sign(blFurDet) * (dFdx(blFurRelief) * blFurR1 + dFdy(blFurRelief) * blFurR2));'
      ].join('\n'));
    };
    fur.customProgramCacheKey = function () { return 'birdlab-squirrel-directional-fur-v2'; };
    var eyeMaterial = keep(new THREE.MeshStandardMaterial({ color: color('#181a17'), roughness: .26 }));
    function data() { return { positions: [], colors: [], uvs: [], indices: [] }; }
    function vertex(builder, x, y, z, tint, u, v) {
      builder.positions.push(x, y, z); builder.colors.push(tint.r, tint.g, tint.b); builder.uvs.push(u, v);
    }
    function ellipsoid(builder, center, scale, tint, underside) {
      var rows = high ? 12 : 8, columns = high ? 18 : 12, first = builder.positions.length / 3;
      for (var row = 0; row <= rows; row++) {
        var v = row / rows, phi = Math.PI * v;
        for (var column = 0; column <= columns; column++) {
          var u = column / columns, theta = TAU * u, ny = Math.cos(phi);
          var nx = Math.sin(phi) * Math.cos(theta), nz = Math.sin(phi) * Math.sin(theta);
          var blend = underside ? smooth((-ny - .12) / .64) : 0;
          var grain = 1 + .045 * Math.sin(column * 12.9898 + row * 78.233);
          var tintAt = { r: (tint.r + (pale.r - tint.r) * blend) * grain,
            g: (tint.g + (pale.g - tint.g) * blend) * grain, b: (tint.b + (pale.b - tint.b) * blend) * grain };
          vertex(builder, center[0] + nx * scale[0], center[1] + ny * scale[1], center[2] + nz * scale[2], tintAt, u, v);
        }
      }
      for (var r = 0; r < rows; r++) for (var c = 0; c < columns; c++) {
        var a = first + r * (columns + 1) + c, b = a + columns + 1;
        if (r > 0) builder.indices.push(a, a + 1, b);
        if (r < rows - 1) builder.indices.push(a + 1, b + 1, b);
      }
    }
    function contour(builder, sections, tint, underside) {
      // A continuous longitudinal surface joins rump, waist, shoulders and
      // neck. The same construction tapers the skull into its muzzle, without
      // separate spherical parts or dark intersection seams.
      var sides = high ? 20 : 14, subdivisions = high ? 4 : 3;
      var rows = (sections.length - 1) * subdivisions, first = builder.positions.length / 3;
      function interpolate(section, part, column) {
        var p0 = sections[Math.max(0, section - 1)][column], p1 = sections[section][column];
        var p2 = sections[section + 1][column], p3 = sections[Math.min(sections.length - 1, section + 2)][column];
        var t2 = part * part, t3 = t2 * part;
        return .5 * ((2 * p1) + (-p0 + p2) * part + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
      }
      for (var row = 0; row <= rows; row++) {
        var section = Math.min(sections.length - 2, Math.floor(row / subdivisions)), part = row / subdivisions - section;
        var zAt = interpolate(section, part, 0), yAt = interpolate(section, part, 1);
        var width = Math.max(0, interpolate(section, part, 2)), depth = Math.max(0, interpolate(section, part, 3));
        for (var side = 0; side <= sides; side++) {
          var u = side / sides, theta = u * TAU, ny = Math.sin(theta);
          var belly = underside ? smooth((-ny - .18) / .65) : 0;
          var fleck = 1 + .018 * Math.sin(side * 12.9898 + row * 78.233);
          var tintAt = { r: (tint.r + (pale.r - tint.r) * belly) * fleck,
            g: (tint.g + (pale.g - tint.g) * belly) * fleck, b: (tint.b + (pale.b - tint.b) * belly) * fleck };
          vertex(builder, Math.cos(theta) * width, yAt + ny * depth, zAt, tintAt, u, row / rows);
        }
      }
      for (var ring = 0; ring < rows; ring++) for (var edge = 0; edge < sides; edge++) {
        var a = first + ring * (sides + 1) + edge, b = a + sides + 1;
        if (ring > 0) builder.indices.push(a, a + 1, b);
        if (ring < rows - 1) builder.indices.push(a + 1, b + 1, b);
      }
    }
    function mesh(builder, name, parent, material) {
      var geometry = keep(new THREE.BufferGeometry());
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(builder.positions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(builder.colors, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(builder.uvs, 2));
      geometry.setIndex(builder.indices); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
      // UV seams and sphere poles have duplicate positions. Share their normals
      // without merging UVs; otherwise close views show false dark creases.
      var duplicates = Object.create(null), position = geometry.attributes.position;
      for (var vi = 0; vi < position.count; vi++) {
        var key = Math.round(position.getX(vi) * 1e6) + ',' + Math.round(position.getY(vi) * 1e6) + ',' + Math.round(position.getZ(vi) * 1e6);
        if (!duplicates[key]) duplicates[key] = []; duplicates[key].push(vi);
      }
      geometry.userData.normalGroups = Object.keys(duplicates).map(function (key) { return duplicates[key]; }).filter(function (group) { return group.length > 1; });
      smoothNormals(geometry);
      var result = new THREE.Mesh(geometry, material || fur); result.name = name;
      result.castShadow = true; result.receiveShadow = true; parent.add(result); return result;
    }
    function smoothNormals(geometry) {
      var normals = geometry.attributes.normal.array, groups = geometry.userData.normalGroups;
      for (var i = 0; i < groups.length; i++) {
        var group = groups[i], nx = 0, ny = 0, nz = 0;
        for (var j = 0; j < group.length; j++) { var index = group[j] * 3; nx += normals[index]; ny += normals[index + 1]; nz += normals[index + 2]; }
        var length = Math.hypot(nx, ny, nz) || 1; nx /= length; ny /= length; nz /= length;
        for (var k = 0; k < group.length; k++) { var at = group[k] * 3; normals[at] = nx; normals[at + 1] = ny; normals[at + 2] = nz; }
      }
      geometry.attributes.normal.needsUpdate = true;
    }
    var torso = new THREE.Group(); torso.name = 'squirrel-torso'; torso.position.set(0, .085, -.065); animal.add(torso);
    var bodyData = data();
    contour(bodyData, [
      [-.049, .010, 0, 0], [-.033, .011, .036, .035], [-.010, .009, .052, .047],
      [.018, .007, .052, .049], [.050, .005, .042, .043], [.080, .007, .037, .039],
      [.108, .013, .039, .042], [.130, .024, .031, .035], [.148, .030, .024, .027], [.168, .031, 0, 0]
    ], gray, true);
    mesh(bodyData, 'squirrel-body-fur', torso);
    var head = new THREE.Group(); head.name = 'squirrel-head'; torso.add(head);
    var headData = data();
    contour(headData, [
      [-.038, -.001, 0, 0], [-.024, .001, .022, .025], [-.006, .002, .029, .030],
      [.012, -.001, .026, .027], [.029, -.007, .019, .021], [.043, -.012, .0118, .014],
      [.055, -.013, .0067, .009], [.061, -.013, 0, 0]
    ], gray, true);
    // Fine curved whiskers sweep back from the tapered muzzle; they stay in
    // this retained head draw call rather than a fan of straight white rods.
    for (var side = -1; side <= 1; side += 2) for (var whisker = 0; whisker < 5; whisker++) {
      var startX = side * .010, startY = -.016 + whisker * .002, startZ = .043;
      for (var whiskerPart = 0; whiskerPart < 3; whiskerPart++) {
        var a = whiskerPart / 3, b = (whiskerPart + 1) / 3, first = headData.positions.length / 3;
        var length = .031 + whisker * .003;
        var ax = startX + side * length * a, bx = startX + side * length * b;
        var ay = startY + (whisker - 2) * .002 * a * a, by = startY + (whisker - 2) * .002 * b * b;
        var az = startZ - (.016 + whisker * .003) * a * a, bz = startZ - (.016 + whisker * .003) * b * b;
        var aw = .00013 * (1 - a), bw = .00013 * (1 - b);
        vertex(headData, ax, ay - aw, az, pale, 0, 0); vertex(headData, ax, ay + aw, az, pale, 1, 0);
        vertex(headData, bx, by - bw, bz, pale, 0, 1); vertex(headData, bx, by + bw, bz, pale, 1, 1);
        if (side < 0) headData.indices.push(first, first + 1, first + 2, first + 1, first + 3, first + 2);
        else headData.indices.push(first, first + 2, first + 1, first + 1, first + 2, first + 3);
      }
    }
    mesh(headData, 'squirrel-head-fur', head);
    var eyesData = data();
    ellipsoid(eyesData, [-.0248, .005, .013], [.0033, .0041, .0042], dark);
    ellipsoid(eyesData, [.0248, .005, .013], [.0033, .0041, .0042], dark);
    ellipsoid(eyesData, [0, -.012, .057], [.0048, .0031, .0032], dark);
    mesh(eyesData, 'squirrel-two-eyes-and-nose', head, eyeMaterial);
    var earData = data();
    for (var earSide = -1; earSide <= 1; earSide += 2) {
      ellipsoid(earData, [earSide * .020, .026, -.017], [.0107, .013, .0065], gray);
      ellipsoid(earData, [earSide * .020, .027, -.0116], [.0063, .0081, .0015], warmGray);
    }
    mesh(earData, 'squirrel-rounded-ears', head);

    // A single tapered, curved tail surface with small guard hairs along its edge.
    // Its retained positions flex gently; no geometry is replaced during animation.
    var tailData = data(), tailRows = high ? 28 : 20, tailSides = high ? 18 : 12;
    for (var tr = 0; tr <= tailRows; tr++) {
      var t = tr / tailRows, cy = .245 * t + .024 * Math.sin(Math.PI * t), cz = -.137 * Math.sin(Math.PI * t * .93);
      var dy = .245 + .024 * Math.PI * Math.cos(Math.PI * t), dz = -.137 * Math.PI * .93 * Math.cos(Math.PI * t * .93), length = Math.hypot(dy, dz);
      var width = tr === tailRows ? 0 : .004 * (1 - t) + .039 * Math.pow(Math.sin(Math.PI * t), .70);
      for (var ts = 0; ts <= tailSides; ts++) {
        var theta = ts / tailSides * TAU, fuzz = 1 + .035 * Math.sin(tr * 12.7 + ts * 6.3);
        var radial = width * fuzz, ny = -dz / length, nz = dy / length;
        var shade = .83 + .20 * Math.abs(Math.cos(theta)) + .08 * Math.sin(tr * 5 + ts * 3.2);
        var tailColor = { r: gray.r * shade, g: gray.g * shade, b: gray.b * shade };
        // The plume is flattened side to side, wider than it is deep.
        vertex(tailData, Math.cos(theta) * radial * 1.22, cy + Math.sin(theta) * radial * .82 * ny,
          cz + Math.sin(theta) * radial * .82 * nz, tailColor, ts / tailSides, t);
      }
    }
    for (var ring = 0; ring < tailRows; ring++) for (var sector = 0; sector < tailSides; sector++) {
      var lower = ring * (tailSides + 1) + sector, upper = lower + tailSides + 1;
      tailData.indices.push(lower, upper, lower + 1, lower + 1, upper, upper + 1);
    }
    // Banded guard hairs end in white tips, giving the plume its silvery
    // fringe. Longest along the flattened edges and mid-tail; the double-sided
    // fur shows each single blade from both sides without extra vertices.
    for (var hairRing = 3; hairRing < tailRows; hairRing += high ? 1 : 2) for (var hairSide = 0; hairSide < tailSides; hairSide++) {
      var sourceIndex = (hairRing * (tailSides + 1) + hairSide) * 3;
      var hx = tailData.positions[sourceIndex], hy = tailData.positions[sourceIndex + 1], hz = tailData.positions[sourceIndex + 2];
      var hairT = hairRing / tailRows, hairAngle = hairSide / tailSides * TAU;
      var hairDy = .245 + .024 * Math.PI * Math.cos(Math.PI * hairT), hairDz = -.137 * Math.PI * .93 * Math.cos(Math.PI * hairT * .93);
      var hairSpan = Math.hypot(hairDy, hairDz), tyAxis = hairDy / hairSpan, tzAxis = hairDz / hairSpan;
      var ox = Math.cos(hairAngle), oy = Math.sin(hairAngle) * -tzAxis, oz = Math.sin(hairAngle) * tyAxis;
      var lateral = Math.pow(Math.abs(ox), 1.4), vary = .5 + .5 * Math.sin(hairRing * 7.5 + hairSide * 12.3);
      var hairLength = (.006 + .013 * lateral + .004 * vary) * (.55 + .45 * Math.sin(Math.PI * Math.min(1, hairT * 1.08)));
      var tipX = hx + ox * hairLength, tipY = hy + (oy + tyAxis * .45) * hairLength, tipZ = hz + (oz + tzAxis * .45) * hairLength;
      var banded = { r: gray.r * .78, g: gray.g * .78, b: gray.b * .76 };
      var hairFirst = tailData.positions.length / 3;
      vertex(tailData, hx, hy - tyAxis * .0013, hz - tzAxis * .0013, banded, 0, hairT);
      vertex(tailData, hx, hy + tyAxis * .0013, hz + tzAxis * .0013, banded, 1, hairT);
      vertex(tailData, tipX, tipY, tipZ, pale, .5, (hairRing + 1) / tailRows);
      tailData.indices.push(hairFirst, hairFirst + 1, hairFirst + 2);
    }
    var tail = mesh(tailData, 'squirrel-tail', animal); tail.position.set(0, .092, -.103);
    tail.geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
    tail.geometry.attributes.normal.setUsage(THREE.DynamicDrawUsage);
    var tailSource = new Float32Array(tail.geometry.attributes.position.array);
    tail.geometry.boundingSphere.radius += .055;

    var limbData = data();
    contour(limbData, [[-1, 0, 0, 0], [-.83, 0, .83, .83], [-.48, 0, 1, 1],
      [0, 0, .86, .86], [.58, 0, .62, .62], [.88, 0, .42, .42], [1, 0, 0, 0]], gray);
    // Rods orient their local Y axis from shoulder/hip to elbow/knee. Rotate
    // the continuous sleeve once so its broad end covers the proximal joint.
    for (var limbVertex = 0; limbVertex < limbData.positions.length; limbVertex += 3) {
      var crossY = limbData.positions[limbVertex + 1];
      limbData.positions[limbVertex + 1] = limbData.positions[limbVertex + 2];
      limbData.positions[limbVertex + 2] = -crossY;
    }
    var limbGeometry = mesh(limbData, 'squirrel-limb-template', animal).geometry;
    animal.remove(animal.getObjectByName('squirrel-limb-template'));
    var axis = new THREE.Vector3(0, 1, 0), direction = new THREE.Vector3(), knee = new THREE.Vector3();
    var hips = new THREE.Vector3(), target = new THREE.Vector3(), focus = new THREE.Vector3();
    var desiredFoot = new THREE.Vector3(), mouth = new THREE.Vector3(), grip = new THREE.Vector3();
    var legs = [];
    for (var pair = 0; pair < 2; pair++) for (var legSide = -1; legSide <= 1; legSide += 2) {
      var front = pair === 0, legName = (front ? 'front-' : 'hind-') + (legSide < 0 ? 'left' : 'right');
      var upperLeg = new THREE.Mesh(limbGeometry, fur), lowerLeg = new THREE.Mesh(limbGeometry, fur);
      upperLeg.name = 'squirrel-upper-' + legName; lowerLeg.name = 'squirrel-lower-' + legName;
      upperLeg.castShadow = lowerLeg.castShadow = true; animal.add(upperLeg); animal.add(lowerLeg);
      var pawData = data(), pawColor = color('#6d6559');
      ellipsoid(pawData, [0, .001, front ? .005 : .009], [front ? .009 : .010, .0045, front ? .013 : .021], pawColor);
      var toes = front ? 4 : 5;
      for (var toe = 0; toe < toes; toe++) {
        var tx = (toe - (toes - 1) / 2) * .0037, tz = (front ? .015 : .025) - Math.abs(tx) * .25;
        ellipsoid(pawData, [tx, -.0004, tz], [.0018, .0022, .007], pawColor);
        ellipsoid(pawData, [tx, -.001, tz + .0068], [.0008, .0011, .0036], dark);
      }
      var paw = mesh(pawData, 'squirrel-paw-' + legName, animal);
      legs.push({ front: front, side: legSide, upper: upperLeg, lower: lowerLeg, paw: paw,
        hip: new THREE.Vector3(legSide * (front ? .029 : .037), front ? -.008 : .079, front ? .112 : -.067),
        anchor: new THREE.Vector3(), liftOff: new THREE.Vector3(), swingTo: new THREE.Vector3(), world: new THREE.Vector3(), worldYaw: 0,
        stepFrom: new THREE.Vector3(), stepTo: new THREE.Vector3(), stepAge: 0, stepDuration: 0, stepYaw: 0, stepTurn: 0,
        state: 'rest', planted: false, cycle: -1, releasePhase: .5, liftYaw: 0, swingYaw: 0,
        phase: front ? .43 + (legSide > 0 ? .09 : 0) : (legSide > 0 ? .10 : 0) });
    }
    var kernelData = data();
    ellipsoid(kernelData, [0, 0, 0], [.006, .008, .006], color('#77583b'));
    ellipsoid(kernelData, [0, .005, 0], [.0065, .0033, .0065], color('#554c3b'));
    var kernel = mesh(kernelData, 'squirrel-foraged-seed', animal); kernel.visible = false;

    var seed = (Number(options.seed) >>> 0) || 5171, randomState = seed, clock = 0, accumulator = 0;
    var x = -2.4, z = -.4, heading = .8, initialX = x, initialZ = z, safe = false;
    var action = null, elapsed = 0, gaitDistance = 0, speed = 0, upright = 0, sniff = 0, headYaw = 0, handling = 0, seedConsumed = true;
    var alertness = 0, cooldown = 0, observerRange = null, observerYaw = 0, previousObserverRange = null;
    // Detail choices have their own stream so an extra sniff or tail flick
    // never changes the established route, footfall, or food-choice sequence.
    var detailState = 0, attentionMode = '', attentionDeadline = 0, inspecting = false, inspectionDepth = 0;
    var gazeYaw = 0, gazeRoll = 0, headRoll = 0, headYawVelocity = 0, eatingPose = .5, watchingObserver = true;
    var posture = { value: 0, velocity: 0 }, inspection = { value: 0, velocity: 0 };
    var inspectionShoulders = { value: 0, velocity: 0 }, gazeTilt = { value: 0, velocity: 0 };
    var nextFlick = 0, flickStart = -1, flickDuration = 0, flickAmplitude = 0, lastTailFlex = NaN, lastTailSweep = NaN;
    var tailPitch = { value: 0, velocity: 0 }, tailSway = { value: 0, velocity: 0 };
    var tailTipPitch = { value: 0, velocity: 0 }, tailTipSway = { value: 0, velocity: 0 }, tailBound = { value: 0, velocity: 0 };
    var tailPreviousHeading = heading, tailPreviousSpeed = 0;
    function settleTail(state, target, frequency, dt) {
      // Exact critically damped integration retains velocity when a route or
      // vigilance target changes, without inventing a continuous tail wag.
      var offset = state.value - target, decay = Math.exp(-frequency * dt);
      var advance = (state.velocity + frequency * offset) * dt;
      state.value = target + (offset + advance) * decay;
      state.velocity = (state.velocity - frequency * advance) * decay;
    }
    function random() { randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0; return randomState / 4294967296; }
    function detailRandom() { detailState = (Math.imul(detailState, 1664525) + 1013904223) >>> 0; return detailState / 4294967296; }
    function ground(xAt, zAt) { var result = height(xAt, zAt); return Number.isFinite(result) ? result : 0; }
    function available(xAt, zAt) { return Math.hypot(xAt, zAt) < 6.8 && !blocked(xAt, zAt, .11); }
    for (var attempt = 0; attempt < 80; attempt++) {
      var candidateX = attempt === 0 ? initialX : -2.4 + Math.cos(attempt * 2.39996) * (.35 + Math.sqrt(attempt) * .35);
      var candidateZ = attempt === 0 ? initialZ : -.4 + Math.sin(attempt * 2.39996) * (.35 + Math.sqrt(attempt) * .35);
      if (available(candidateX, candidateZ)) { initialX = candidateX; initialZ = candidateZ; safe = true; break; }
    }
    function route(toX, toZ) {
      if (!available(toX, toZ)) return false;
      var steps = Math.max(2, Math.ceil(Math.hypot(toX - x, toZ - z) / .065));
      for (var i = 1; i <= steps; i++) if (!available(x + (toX - x) * i / steps, z + (toZ - z) * i / steps)) return false;
      return true;
    }
    function avoidsObserver(toX, toZ, observer) {
      if (!observer || !observer.position) return true;
      var dx = toX - x, dz = toZ - z, lengthSq = dx * dx + dz * dz;
      var projection = clamp(((observer.position.x - x) * dx + (observer.position.z - z) * dz) / Math.max(lengthSq, 1e-9), 0, 1);
      var closest = Math.hypot(x + dx * projection - observer.position.x, z + dz * projection - observer.position.z);
      // If already close, permit only a route that never reduces the range.
      var clearance = Math.min(observer.crouching ? .65 : .8, Math.hypot(x - observer.position.x, z - observer.position.z));
      return closest >= clearance - 1e-8;
    }
    function begin(kind, duration) {
      action = { kind: kind, duration: duration }; elapsed = 0;
      if (kind === 'handle') seedConsumed = false;
    }
    function chooseRoute(escape, observer) {
      var awayX = observer ? x - observer.position.x : Math.sin(heading), awayZ = observer ? z - observer.position.z : Math.cos(heading);
      var desired = escape ? Math.atan2(awayX, awayZ) : heading + (random() - .5) * 2.5;
      for (var i = 0; i < 12; i++) {
        var routeHeading = desired + (random() - .5) * (escape ? 2.4 : 3.6);
        var distance = escape ? 1.5 + random() * 1.3 : .45 + random() * 1.0;
        var toX = x + Math.sin(routeHeading) * distance, toZ = z + Math.cos(routeHeading) * distance;
        if (escape && (toX - x) * awayX + (toZ - z) * awayZ < 0) continue;
        if (!escape && !avoidsObserver(toX, toZ, observer)) continue;
        if (!route(toX, toZ)) continue;
        // Put forepaws down before turning. The short turn finishes with time
        // for the last placement step to land before forward acceleration.
        var turn = angle(routeHeading - heading), lower = upright > .006 ? Math.log(upright / .006) / 8 + .06 : 0;
        for (var foot = 0; foot < legs.length; foot++) if (legs[foot].stepDuration > 0 || Math.abs(legs[foot].world.y - ground(legs[foot].world.x, legs[foot].world.z) - .0045) > .0003) lower = Math.max(lower, .23);
        var turnTime = .28 + Math.abs(turn) / 2.2, prepare = lower + turnTime + .24;
        action = { kind: escape ? 'escape' : 'scurry', fromX: x, fromZ: z, toX: toX, toZ: toZ,
          fromHeading: heading, turn: turn, lower: lower, turnTime: turnTime, prepare: prepare,
          travel: Math.max(.80, distance / (escape ? .95 : .55)), distance: distance };
        action.duration = action.prepare + action.travel; elapsed = 0; gaitDistance = 0; return true;
      }
      begin('watch', 1.0 + random()); return false;
    }
    function select(observer) {
      if (cooldown > 0) { begin('recover', Math.min(2.5, cooldown)); return; }
      if (alertness > .72 && observer) { chooseRoute(true, observer); return; }
      if (alertness > .30) { begin('watch', 1.2 + random() * 1.2); return; }
      var choice = random();
      if (choice < .37) chooseRoute(false, observer);
      else begin(choice < .69 ? 'search' : 'handle', 1.5 + random() * 2.9);
    }
    function reset() {
      randomState = seed; clock = 0; accumulator = 0; x = initialX; z = initialZ; heading = .8;
      elapsed = 0; gaitDistance = 0; speed = 0; upright = 0; sniff = 0; headYaw = 0; handling = 0; seedConsumed = true;
      alertness = 0; cooldown = 0; observerRange = previousObserverRange = null; observerYaw = 0;
      detailState = (seed ^ 0x72b13f49) >>> 0; attentionMode = ''; attentionDeadline = 0; inspecting = false; inspectionDepth = 0;
      gazeYaw = gazeRoll = headRoll = headYawVelocity = 0; eatingPose = .5; watchingObserver = true;
      nextFlick = .4; flickStart = -1; flickDuration = flickAmplitude = 0; lastTailFlex = lastTailSweep = NaN;
      [tailPitch, tailSway, tailTipPitch, tailTipSway, tailBound].forEach(function (state) { state.value = state.velocity = 0; });
      [posture, inspection, inspectionShoulders, gazeTilt].forEach(function (state) { state.value = state.velocity = 0; });
      tailPreviousHeading = heading; tailPreviousSpeed = 0;
      legs.forEach(function (leg) {
        leg.planted = false; leg.cycle = -1; leg.state = 'rest'; leg.stepDuration = 0;
        footToWorld(leg.side * (leg.front ? .029 : .039), leg.front ? .087 : -.065, leg.world);
        leg.anchor.copy(leg.world); leg.worldYaw = heading;
      });
      begin('search', 2.4); pose(0);
    }
    function alert(observer, dt) {
      var targetAlert = 0; observerRange = null;
      if (observer && observer.position) {
        var dx = observer.position.x - x, dz = observer.position.z - z;
        observerRange = Math.hypot(dx, dz); observerYaw = Math.atan2(dx, dz);
        var comfort = observer.crouching ? 1.35 : 1.9;
        var proximity = clamp(1 - observerRange / comfort, 0, 1), approach = 0;
        if (previousObserverRange !== null) approach = clamp((previousObserverRange - observerRange) / dt - speed, 0, 1.7);
        targetAlert = proximity * .83 + proximity * approach * .32 + (observerRange < .38 ? .45 : 0);
        targetAlert = clamp(targetAlert, 0, 1); previousObserverRange = observerRange;
      } else previousObserverRange = null;
      alertness += (targetAlert - alertness) * (1 - Math.exp(-dt * (targetAlert > alertness ? 2.5 : .45)));
    }
    function step(dt, observer) {
      clock += dt; cooldown = Math.max(0, cooldown - dt); alert(observer, dt);
      // Finish moving and settle both paws before selecting another destination.
      // A resting animal first raises its head instead of teleporting into flight.
      if (action.kind !== 'scurry' && action.kind !== 'escape' && cooldown === 0 && alertness > .72 && observer) {
        if (upright > .22 || action.kind === 'watch') chooseRoute(true, observer);
        else if (action.kind !== 'watch') begin('watch', .48);
      } else if ((action.kind === 'search' || action.kind === 'handle') && alertness > .33 && cooldown === 0) begin('watch', 1.3);
      elapsed = Math.min(action.duration, elapsed + dt);
      var oldX = x, oldZ = z;
      if (action.kind === 'scurry' || action.kind === 'escape') {
        heading = action.fromHeading + action.turn * smooth((elapsed - action.lower) / action.turnTime);
        var fraction = smooth((elapsed - action.prepare) / action.travel);
        x = action.fromX + (action.toX - action.fromX) * fraction; z = action.fromZ + (action.toZ - action.fromZ) * fraction;
      }
      var moved = Math.hypot(x - oldX, z - oldZ); speed = moved / dt; gaitDistance += moved;
      pose(dt);
      if (elapsed >= action.duration - 1e-9) {
        if (action.kind === 'escape') { cooldown = 5 + random() * 2; begin('recover', cooldown); }
        else select(observer);
      }
    }
    function rod(mesh, a, b, radius) {
      mesh.position.copy(a).add(b).multiplyScalar(.5); direction.copy(b).sub(a);
      // Slight overlap hides the pinched sphere tips at elbows and ankles.
      mesh.scale.set(radius, direction.length() * .5 + .004, radius * .9);
      if (direction.lengthSq() > 1e-12) mesh.quaternion.setFromUnitVectors(axis, direction.normalize());
    }
    function footToLocal(world, out) {
      var dx = world.x - x, dz = world.z - z, sine = Math.sin(heading), cosine = Math.cos(heading);
      out.set(dx * cosine - dz * sine, world.y - animal.position.y, dx * sine + dz * cosine); return out;
    }
    function footToWorld(localX, localZ, out, facing) {
      facing = facing === undefined ? heading : facing;
      var sine = Math.sin(facing), cosine = Math.cos(facing);
      out.set(x + localX * cosine + localZ * sine, 0, z - localX * sine + localZ * cosine);
      out.y = ground(out.x, out.z) + .0045; return out;
    }
    function localToWorld(local, out) {
      var sine = Math.sin(heading), cosine = Math.cos(heading), lx = local.x, ly = local.y, lz = local.z;
      out.set(x + lx * cosine + lz * sine, animal.position.y + ly, z - lx * sine + lz * cosine); return out;
    }
    function startPlacement(leg, destination, duration) {
      leg.stepFrom.copy(leg.world); leg.stepTo.copy(destination); leg.stepAge = 0;
      // A long placement across a tight turn needs more time than a small
      // correction. Bound the increase to the existing preparation interval.
      leg.stepDuration = Math.max(duration, Math.min(.24, leg.stepFrom.distanceTo(leg.stepTo) * 1.875 / 1.32));
      leg.stepYaw = leg.worldYaw; leg.stepTurn = angle(heading - leg.worldYaw); leg.planted = false;
    }
    function placePaw(leg, dt) {
      leg.stepAge = Math.min(leg.stepDuration, leg.stepAge + dt);
      var fraction = leg.stepAge / leg.stepDuration, blend = smooth(fraction);
      leg.world.lerpVectors(leg.stepFrom, leg.stepTo, blend);
      leg.world.y += .014 * Math.pow(Math.sin(Math.PI * fraction), 2);
      leg.worldYaw = leg.stepYaw + leg.stepTurn * blend;
      if (fraction >= 1) { leg.anchor.copy(leg.world); leg.stepDuration = 0; leg.planted = true; }
    }
    function attend(dt, moving) {
      if (dt <= 0) return;
      var nextMode = action.kind === 'search' && alertness < .30 ? 'search' : moving ? 'moving' : action.kind === 'handle' ? 'feeding' : action.kind === 'recover' ? 'recovering' : 'watching';
      if (nextMode !== attentionMode) {
        attentionMode = nextMode; inspecting = false; watchingObserver = true;
        attentionDeadline = clock + (nextMode === 'recovering' ? .8 : .18) + detailRandom() * .35;
      }
      if (clock >= attentionDeadline) {
        if (nextMode === 'search') {
          inspecting = !inspecting;
          if (inspecting) {
            // The nose returns to a retained patch through the inspection,
            // then lifts and pauses before selecting a different patch.
            gazeYaw = (detailRandom() - .5) * .64;
            gazeRoll = (detailRandom() - .5) * .034;
            inspectionDepth = .50 + detailRandom() * .45;
            attentionDeadline = clock + .40 + detailRandom() * .70;
          } else attentionDeadline = clock + .45 + detailRandom() * .95;
        } else if (nextMode === 'recovering') {
          // After reaching cover, alternate retained checks of the observer
          // with quieter looks around the new patch. Neither is a sine scan.
          watchingObserver = !watchingObserver;
          if (!watchingObserver) {
            gazeYaw = (detailRandom() - .5) * .68;
            gazeRoll = (detailRandom() - .5) * .028;
          }
          attentionDeadline = clock + (watchingObserver ? .8 : .55) + detailRandom() * .65;
        } else {
          gazeYaw = nextMode === 'watching' ? (detailRandom() - .5) * .78 : 0;
          gazeRoll = nextMode === 'watching' ? (detailRandom() - .5) * .035 : 0;
          attentionDeadline = clock + 1.1 + detailRandom() * 2.2;
        }
      }
      if (flickStart >= 0 && clock - flickStart >= flickDuration) flickStart = -1;
      if (!moving && alertness > .35 && flickStart < 0 && clock >= nextFlick) {
        flickStart = clock; flickDuration = .44 + detailRandom() * .24;
        flickAmplitude = (.12 + alertness * .12 + detailRandom() * .035) * (detailRandom() < .5 ? -1 : 1);
        nextFlick = clock + flickDuration + 1.8 + detailRandom() * 2.7;
      }
    }
    function pose(dt) {
      var moving = action && (action.kind === 'scurry' || action.kind === 'escape');
      attend(dt, moving);
      var moveWeight = clamp(speed / .55, 0, 1), targetUpright = action && (action.kind === 'watch' || action.kind === 'handle' || action.kind === 'recover') ? 1 : 0;
      upright += (targetUpright - upright) * (dt ? 1 - Math.exp(-dt * (moving && targetUpright === 0 ? 8 : 5)) : 0);
      handling += ((action.kind === 'handle' ? 1 : 0) - handling) * (dt ? 1 - Math.exp(-dt * 6) : 0);
      var eat = .5 + .5 * Math.sin(clock * 2.7);
      if (action.kind === 'handle') eat = Math.max(eat, smooth((elapsed - action.duration + .5) / .30));
      // Hold the last feeding direction as handling fades out, rather than
      // jumping from the final mouth contact to a different oscillation phase.
      if (action.kind === 'handle' && dt > 0) eatingPose += (eat - eatingPose) * (1 - Math.exp(-dt * 12));
      eat = eatingPose;
      var targetSniff = attentionMode === 'search' && inspecting ? inspectionDepth : 0;
      if (dt > 0) {
        // Route readiness still uses the established upright clock. The
        // visible spine retains velocity when vigilance, food or departure
        // changes its target, rather than snapping into the fastest part of
        // a rise or fall on the first frame. The nose leads a ground check;
        // the shoulders follow and both settle at the retained patch.
        settleTail(posture, targetUpright, moving && targetUpright === 0 ? 14 : 10, dt);
        settleTail(inspection, targetSniff, 15, dt);
        settleTail(inspectionShoulders, inspection.value, 18, dt);
      }
      sniff = inspection.value;
      var visualUpright = posture.value, shoulderSniff = inspectionShoulders.value;
      var escaping = action && action.kind === 'escape', stride = escaping ? .25 : .20, cycle = gaitDistance / stride;
      var bodyWeight = smooth(moveWeight), duty = escaping ? .44 : .50;
      // Fore and hind pairs load in sequence. Keep the shoulder motion small
      // and tie it to those actual footfall phases, rather than bouncing the
      // whole animal and its gaze through a single rigid sine wave.
      var foreLoad = .5 + .5 * Math.cos((cycle + .475 - duty * .5) * TAU);
      var hindLoad = .5 + .5 * Math.cos((cycle + .05 - duty * .5) * TAU);
      var loadPitch = .028 * (foreLoad - hindLoad) * bodyWeight;
      // Move the shoulder girdle over the receiving forepaws, then back over
      // the hind pair. The lowered running posture prevents the fixed contact
      // anchors from stretching the forelimbs at the start of stance.
      var loadShift = .014 * Math.cos((cycle + .475) * TAU) * bodyWeight;
      var bob = bodyWeight * ((escaping ? -.016 : -.013) + .0022 * (1 - foreLoad) * (.35 + .65 * (1 - hindLoad)));
      var turnRate = dt > 0 ? angle(heading - tailPreviousHeading) / dt : 0;
      var turnLean = moving ? -.030 * Math.tanh(turnRate / 2) * (1 - upright) * (1 - handling) : 0;
      // Lower the shoulders slightly during a pivot so the supporting foreleg
      // can bend while the opposite pair repositions around the body.
      bob -= Math.abs(turnLean) / .030 * .016;
      var bodyRoll = turnLean + .012 * bodyWeight * Math.sin((cycle + .30) * TAU);
      var lateralShift = -bodyRoll * .035;
      animal.position.set(x, ground(x, z), z); animal.rotation.y = heading;
      torso.position.set(lateralShift, .085 + bob, -.065 + loadShift);
      torso.rotation.set(-.88 * visualUpright + .16 * shoulderSniff + loadPitch, 0, bodyRoll);
      torso.scale.y = 1 + .006 * Math.sin(clock * 5.0);
      // Counter the small shoulder bounce through the neck. Normal scanning,
      // sniffing and food-to-mouth motion retain their existing local targets.
      head.position.set(-lateralShift * .75, .032 - .025 * sniff + Math.sin(loadPitch) * .145 * .80 - bob * .75, .145 - loadShift * .60);
      // Check the selected route before the body turns, then keep the nose
      // toward travel. Looking back continuously during an escape twisted the
      // head away from the path; observer checks resume once the paws settle.
      var desiredYaw = moving ? clamp(angle(action.fromHeading + action.turn - heading), -.65, .65)
        : observerRange !== null && alertness > .14 && watchingObserver ? clamp(angle(observerYaw - heading), -.65, .65) : gazeYaw;
      desiredYaw *= 1 - handling * .95;
      if (dt > 0) {
        // Exact critically damped integration retains angular velocity when a
        // new gaze target is selected, avoiding a hard start to each glance.
        var gazeOffset = headYaw - desiredYaw, gazeDecay = Math.exp(-dt * 14);
        var gazeStep = (headYawVelocity + 14 * gazeOffset) * dt;
        headYaw = desiredYaw + (gazeOffset + gazeStep) * gazeDecay;
        headYawVelocity = (headYawVelocity - 14 * gazeStep) * gazeDecay;
      }
      var desiredRoll = moving || handling > .1 || alertness > .3 ? 0 : gazeRoll;
      if (dt > 0) settleTail(gazeTilt, desiredRoll, 14, dt);
      headRoll = gazeTilt.value;
      head.rotation.set(.65 * visualUpright + .30 * sniff + handling * eat * (.11 + .018 * Math.sin(clock * 22)) - loadPitch * .85, headYaw, headRoll - bodyRoll * .85);
      torso.updateMatrix(); head.updateMatrix();
      mouth.set(0, -.023, .052).applyMatrix4(head.matrix).applyMatrix4(torso.matrix);
      grip.set(0, .158, .095).lerp(mouth, handling * eat * .94);
      var pawPitch = -.5 * upright - .3 * handling, gripY = Math.cos(pawPitch) * .002 - Math.sin(pawPitch) * .010;
      var gripZ = Math.sin(pawPitch) * .002 + Math.cos(pawPitch) * .010;
      // Finish the current diagonal placement before choosing another pair.
      // Without this shared decision, the first leg in the loop could begin
      // another step while its partner finished, starving the other supports
      // through a large turn. The most displaced pair receives the next step.
      var placementActive = false, placementPair = -1, placementNeed = 1;
      for (var placing = 0; placing < legs.length; placing++) if (legs[placing].stepDuration > 0) placementActive = true;
      if (!placementActive && !(moving && moveWeight > .03 && upright < .01)) for (var candidate = 0; candidate < legs.length; candidate++) {
        var candidateLeg = legs[candidate];
        if (candidateLeg.front && upright > .006) continue;
        footToWorld(candidateLeg.side * (candidateLeg.front ? .029 : .039), candidateLeg.front ? .087 : -.065, desiredFoot);
        var need = Math.max(candidateLeg.world.distanceTo(desiredFoot) / .026, Math.abs(angle(heading - candidateLeg.worldYaw)) / .34);
        if (need > placementNeed) { placementNeed = need; placementPair = candidate === 0 || candidate === 3 ? 0 : 1; }
      }
      for (var i = 0; i < legs.length; i++) {
        var leg = legs[i], localX = leg.side * (leg.front ? .029 : .039), localZ = leg.front ? .087 : -.065;
        var phase = cycle + leg.phase, phaseId = Math.floor(phase), phasePart = phase - phaseId;
        var swingFlex = 0;
        var grounded = moving && moveWeight > .03 && upright < .01 && leg.stepDuration === 0;
        var beginningStride = grounded && leg.state !== 'stride';
        if (beginningStride) {
          leg.cycle = -1; leg.planted = false; leg.liftOff.copy(leg.world); leg.anchor.copy(leg.world); leg.state = 'stride';
          // A placement step may finish after the nominal swing has begun.
          // Start its first free recovery at this real contact, not halfway
          // along a swing that the paw has never performed.
          leg.releasePhase = phasePart >= duty ? phasePart : duty;
        }
        if (grounded && !beginningStride && leg.cycle !== phaseId) leg.releasePhase = duty;
        // An initial hind stance begins under a resting paw, not at a forward
        // touchdown. Release that support before it is left beyond the limb's
        // reach; the planted anchor itself never slides to solve the problem.
        if (grounded && leg.planted && phasePart < leg.releasePhase) {
          footToLocal(leg.world, target);
          var rearReach = (leg.front ? .047 : -.067) - target.z;
          if (rearReach > (leg.front ? .047 : .061)) leg.releasePhase = phasePart;
        }
        if (grounded && phasePart < leg.releasePhase) {
          if (!leg.planted || leg.cycle !== phaseId) {
            // First contact begins under the current paw; later cycles reach
            // forward during the swing, so starting a run does not snap a foot.
            if (leg.cycle < 0) { leg.anchor.copy(leg.world); leg.anchor.y = ground(leg.anchor.x, leg.anchor.z) + .0045; }
            else { leg.anchor.copy(leg.swingTo); leg.worldYaw = leg.swingYaw; }
            leg.planted = true; leg.cycle = phaseId;
          }
          leg.world.copy(leg.anchor);
        } else if (grounded) {
          if (leg.planted || leg.cycle < 0) {
            leg.liftOff.copy(leg.world); leg.planted = false; leg.cycle = phaseId;
            leg.liftYaw = leg.worldYaw; leg.swingYaw = heading;
            // Retain a world touchdown rather than chasing a target that moves
            // with the body. Forepaws land beneath the receiving shoulder; the
            // longer hind feet can reach farther without straightening a leg.
            var remainingStride = Math.min((1 - phasePart) * stride, Math.max(0, action.distance - gaitDistance));
            footToWorld(localX, localZ + stride * duty * (leg.front ? .12 : .48) + remainingStride, leg.swingTo);
          }
          var swing = clamp((phasePart - leg.releasePhase) / (1 - leg.releasePhase), 0, 1);
          var recovery = swing;
          // The fourth-power arch leaves the ground and arrives with zero
          // vertical velocity and acceleration. A restrained toe release uses
          // the same arch, so rotated claws remain clear of the ground.
          var swingArch = Math.pow(Math.sin(Math.PI * recovery), 4);
          leg.world.lerpVectors(leg.liftOff, leg.swingTo, smooth(recovery)); leg.world.y += swingArch * .024;
          swingFlex = swingArch * (1 - 2 * recovery) * (leg.front ? .40 : .28);
          leg.worldYaw = leg.liftYaw + angle(leg.swingYaw - leg.liftYaw) * smooth(recovery);
        } else {
          footToWorld(localX, localZ, desiredFoot);
          if (leg.front && upright > .006) {
            if (leg.state !== 'air') { leg.anchor.copy(leg.world); leg.state = 'air'; leg.stepDuration = 0; }
            // Hands rise from their real last ground contact. Lowering reverses
            // that blend while the body waits before its next turning steps.
            target.set(grip.x + leg.side * (.020 - handling * .009), grip.y - gripY, grip.z - gripZ);
            localToWorld(target, target);
            target.lerpVectors(leg.anchor, target, smooth(upright));
            leg.world.lerp(target, dt ? 1 - Math.exp(-dt * 20) : 1); leg.worldYaw = heading;
            leg.planted = false;
          } else {
            if (leg.state !== 'rest') {
              leg.anchor.copy(leg.world); leg.state = 'rest'; leg.cycle = -1;
              if (Math.abs(leg.world.y - ground(leg.world.x, leg.world.z) - .0045) > .0003) startPlacement(leg, desiredFoot, .18);
            }
            if (leg.stepDuration > 0) placePaw(leg, dt);
            else {
              // Turning uses small lifted placements, with a diagonal pair at
              // most airborne together. Supporting paws retain world contacts.
              var needsStep = leg.world.distanceTo(desiredFoot) > .026 || Math.abs(angle(heading - leg.worldYaw)) > .34;
              var canStep = !placementActive && placementPair === (i === 0 || i === 3 ? 0 : 1), airborne = 0, supporting = 0;
              for (var other = 0; other < legs.length; other++) if (other !== i && legs[other].stepDuration > 0) {
                airborne++; if (other !== 3 - i) canStep = false;
              }
              for (var support = 0; support < legs.length; support++) if (support !== i && legs[support].stepDuration === 0 && Math.abs(legs[support].world.y - ground(legs[support].world.x, legs[support].world.z) - .0045) < .0003) supporting++;
              if (supporting < 2) canStep = false;
              // During a turn the selected diagonal exchanges together. If
              // its less-displaced partner waited for its own threshold, two
              // serial half-pair steps could delay the other supports again.
              var pairedTurn = moving && elapsed < action.prepare;
              if ((needsStep || pairedTurn) && canStep && airborne < 2 && dt > 0) {
                if (moving && elapsed < action.prepare) {
                  // Plant toward the approaching body direction, allowing
                  // time for this step and half the opposite pair's support
                  // exchange. A landing chosen at the old heading is already
                  // behind the shoulder during a quick turn.
                  var landingHeading = action.fromHeading + action.turn * smooth((elapsed + .24 - action.lower) / action.turnTime);
                  footToWorld(localX, localZ, desiredFoot, landingHeading);
                }
                startPlacement(leg, desiredFoot, .16);
                if (moving && elapsed < action.prepare) leg.stepTurn = angle(landingHeading - leg.stepYaw);
                placePaw(leg, dt);
              }
              else { leg.world.copy(leg.anchor); leg.planted = true; }
            }
          }
        }
        footToLocal(leg.world, target);
        // Two-bone legs connect the actual grounded paw to the moving shoulder/hip.
        if (leg.front) hips.copy(leg.hip).applyMatrix4(torso.matrix);
        else {
          // Hind attachments follow the same small locomotor load shift as
          // the pelvis while the paws retain their independent world anchors.
          var hipY = leg.hip.y - .085, hipZ = leg.hip.z + .065;
          var shiftedY = hipY * Math.cos(loadPitch) - hipZ * Math.sin(loadPitch);
          hips.set(leg.hip.x * Math.cos(bodyRoll) - shiftedY * Math.sin(bodyRoll) + lateralShift,
            .085 + bob + leg.hip.x * Math.sin(bodyRoll) + shiftedY * Math.cos(bodyRoll),
            -.065 + loadShift + hipY * Math.sin(loadPitch) + hipZ * Math.cos(loadPitch));
        }
        var lengthA = leg.front ? .047 : .055, lengthB = leg.front ? .047 : .061;
        if (grounded && !leg.planted) {
          // A retained future landing is a destination, not permission for an
          // airborne wrist to run ahead of its shoulder. Ease only the free
          // paw inside the limb's reach, without changing a planted anchor or
          // its final touchdown. The smooth shoulder-space envelope avoids
          // replacing a stretched bone with a hard-clamped moving foot.
          var reachY = target.y - hips.y, reachX = target.x - hips.x, reachZ = target.z - hips.z;
          var reachLimit = (lengthA + lengthB) * .985;
          var planarLimit = Math.sqrt(Math.max(.0001, reachLimit * reachLimit - reachY * reachY));
          var planarReach = Math.hypot(reachX, reachZ), softStart = planarLimit * .85;
          if (planarReach > softStart) {
            var reachBlend = clamp((planarReach - softStart) / (planarLimit * .30), 0, 1);
            var reachB2 = reachBlend * reachBlend, reachB3 = reachB2 * reachBlend;
            var boundedReach = softStart + planarLimit * .30 * (reachBlend - 2.5 * reachB3 * reachBlend + 3 * reachB3 * reachB2 - reachB3 * reachB3);
            var releaseBlend = smooth(Math.sin(Math.PI * recovery) * 4);
            var reachScale = 1 - (1 - boundedReach / planarReach) * releaseBlend;
            var previousPawGround = ground(leg.world.x, leg.world.z);
            target.x = hips.x + reachX * reachScale; target.z = hips.z + reachZ * reachScale;
            localToWorld(target, leg.world);
            leg.world.y += ground(leg.world.x, leg.world.z) - previousPawGround;
            footToLocal(leg.world, target);
          }
        }
        direction.copy(target).sub(hips); var distance = Math.max(.00001, direction.length());
        var reach = Math.min(distance, lengthA + lengthB - .0001);
        var along = (lengthA * lengthA - lengthB * lengthB + reach * reach) / (2 * reach);
        var bend = Math.sqrt(Math.max(0, lengthA * lengthA - along * along));
        knee.copy(hips).addScaledVector(direction, along / distance);
        var yz = Math.max(.00001, Math.hypot(direction.y, direction.z)), bendSide = leg.front ? 1 : -1;
        knee.y += -direction.z / yz * bend * bendSide; knee.z += direction.y / yz * bend * bendSide;
        rod(leg.upper, hips, knee, leg.front ? .014 : .021); rod(leg.lower, knee, target, leg.front ? .0070 : .0085);
        leg.paw.position.copy(target); leg.paw.rotation.set((leg.front ? pawPitch : 0) + swingFlex, angle(leg.worldYaw - heading), 0);
      }
      if (action.kind === 'handle' && elapsed > action.duration - .10) seedConsumed = true;
      kernel.visible = !seedConsumed && handling > .70 && upright > .65 && legs[0].paw.position.distanceTo(legs[1].paw.position) < .027;
      // The retained seed follows the actual palms, including their transition
      // lag, rather than a separate oscillating point between moving hands.
      kernel.position.copy(legs[0].paw.position).add(legs[1].paw.position).multiplyScalar(.5);
      kernel.position.y += gripY; kernel.position.z += gripZ;
      kernel.rotation.set(.15 * Math.sin(clock * 4), 0, handling * .12 * Math.sin(clock * 5));
      var flickAge = flickStart >= 0 ? clock - flickStart : -1;
      var flick = flickAge < 0 ? 0 : flickAmplitude * (smooth(flickAge / .14) - smooth((flickAge - .14) / (flickDuration - .14)));
      var tipFlick = flickAge < 0 ? 0 : flickAmplitude * (smooth((flickAge - .045) / .14) - smooth((flickAge - .185) / (flickDuration - .185)));
      if (dt > 0) {
        var turnRate = angle(heading - tailPreviousHeading) / dt, acceleration = (speed - tailPreviousSpeed) / dt;
        // The tail leans outside a turning body and trails acceleration. Its
        // lighter tip follows the base later, then settles while the paws rest.
        settleTail(tailPitch, -.80 * moveWeight + .035 * upright - .045 * Math.tanh(acceleration / 1.3), 8, dt);
        settleTail(tailSway, clamp(turnRate * .055, -.18, .18), 11, dt);
        settleTail(tailTipPitch, tailPitch.value, 6, dt);
        settleTail(tailTipSway, tailSway.value, 7, dt);
        settleTail(tailBound, .0035 * moveWeight * Math.sin(cycle * TAU - .6), 14, dt);
        tailPreviousHeading = heading; tailPreviousSpeed = speed;
      }
      tail.rotation.x = tailPitch.value; tail.rotation.z = tailSway.value + flick;
      var tailPositions = tail.geometry.attributes.position.array;
      var flex = (tailSway.value - tailTipSway.value) * .16 + (flick - tipFlick) * .14;
      // Tip pitch follows travel; the nearly upright resting posture needs no
      // extra bending. This also lets a held alert tail become completely still.
      var sweep = (tailTipPitch.value - tailPitch.value) * .08 * moveWeight + tailBound.value;
      if (flex !== lastTailFlex || sweep !== lastTailSweep) {
        for (var vi = 0; vi < tailPositions.length; vi += 3) {
          var weight = clamp(tailSource[vi + 1] / .25, 0, 1);
          tailPositions[vi] = tailSource[vi] + flex * weight * weight;
          tailPositions[vi + 2] = tailSource[vi + 2] + sweep * weight * weight;
        }
        lastTailFlex = flex; lastTailSweep = sweep;
        tail.geometry.attributes.position.needsUpdate = true; tail.geometry.computeVertexNormals(); smoothNormals(tail.geometry);
      }
    }
    function setMode(value) {
      if (disposed) return;
      var next = value === 'free' ? 'free' : 'guided';
      if (next === mode) return;
      mode = next; root.visible = mode === 'free' && safe;
      if (mode === 'free') reset();
    }
    function update(time, dt, observer) {
      if (disposed || mode !== 'free' || !safe || !Number.isFinite(dt) || dt <= 0) return;
      accumulator += Math.min(.10, dt);
      while (accumulator >= TICK - 1e-10) { step(TICK, observer); accumulator = Math.max(0, accumulator - TICK); }
    }
    function behavior() {
      if (action.kind === 'escape') return elapsed < action.prepare ? 'Alert — preparing to move away' : 'Scurrying to cover';
      if (action.kind === 'scurry') return elapsed < action.prepare ? 'Choosing a route' : 'Scurrying';
      if (action.kind === 'recover') return 'Watching after escape';
      if (action.kind === 'watch') return observerRange !== null && alertness > .3 ? 'Watching the observer' : 'Upright vigilance';
      return action.kind === 'handle' ? 'Handling a seed' : 'Sniffing and searching';
    }
    function snapshot() {
      return [{ id: 'graySquirrel', name: 'Eastern gray squirrel', scientificName: 'Sciurus carolinensis', category: 'mammal',
        behavior: behavior(), position: [x, animal.position.y, z], altitude: 0, heading: heading, alertness: alertness,
        recovering: cooldown > 0, visible: root.visible && !disposed }];
    }
    function getFocus(id, out) {
      if (id !== 'graySquirrel' || disposed || !root.visible) return null;
      animal.updateMatrixWorld(true); head.getWorldPosition(focus);
      return out ? out.copy(focus) : focus.clone();
    }
    function dispose() {
      if (disposed) return; disposed = true; scene.remove(root);
      resources.forEach(function (resource) { resource.dispose(); }); resources.length = 0;
    }
    reset();
    return { root: root, setMode: setMode, update: update, snapshot: snapshot, getFocus: getFocus, dispose: dispose };
  }
  global.BirdLab3DMammals = { create: create };
})(window);
